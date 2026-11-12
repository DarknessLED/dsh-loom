// Before wiring "a patch may not edit its own verifier" into the gate, measure the
// blast radius on the ledger: how many landed promotions would that rule have
// refused, and were any of them legitimate work on the verifier itself?
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { oracleScripts, patchPaths, touchesOracle } from '../../src/gate/oracle.js'

const LOOM = 'C:/Users/Darkness/.dsh/loom/campaigns'
const REPO = 'C:/Projects/RSI'

const rows = []
for (const name of readdirSync(LOOM)) {
  const p = join(LOOM, name, 'views', 'state.json')
  if (!existsSync(p)) continue
  let doc
  try { doc = JSON.parse(readFileSync(p, 'utf8')) } catch { continue }
  const tasks = new Map((doc?.evalset?.tasks ?? []).map((t) => [String(t.id), t]))
  for (const r of doc.rounds ?? []) {
    if (r?.status !== 'promoted') continue
    const task = tasks.get(String(r.taskId)) ?? null
    const cmd = task?.verify?.cmd ?? null
    if (!cmd) continue
    // The oracle set has to be derived from a tree where the command's file
    // exists; every campaign shares this repo except the fixtures.
    const ws = doc.workspace ?? REPO
    const oracle = oracleScripts(task.verify, { cwd: ws })
    // The landed change set is the round's patch, if it survived.
    const patch = r?.patch ?? r?.best?.patch ?? null
    let changed = patch && existsSync(patch) ? patchPaths(patch) : null
    if (changed === null) {
      // Fall back to the commit, when the round recorded one.
      const sha = r?.commit ?? r?.landed?.commit ?? null
      if (sha && ws === REPO) {
        try {
          const out = execFileSync('git', ['show', '--name-only', '--format=', sha], { cwd: REPO, encoding: 'utf8' })
          changed = out.split('\n').map((s) => s.trim()).filter(Boolean)
        } catch { changed = [] }
      } else changed = []
    }
    rows.push({
      campaign: name,
      round: r.n ?? r.round ?? null,
      task: r.taskId,
      cmd: cmd.slice(0, 90),
      oracle,
      changed,
      wouldRefuse: touchesOracle(changed, oracle),
    })
  }
}

const total = rows.length
const refusals = rows.filter((r) => r.wouldRefuse)
console.log(`landed promotions with a derived oracle: ${total}`)
console.log(`would be refused by "a patch may not edit its own verifier": ${refusals.length}`)
for (const r of refusals) console.log(`  ${r.campaign} r${r.round} task=${r.task} oracle=${JSON.stringify(r.oracle)} changed=${JSON.stringify(r.changed)}`)
const noOracle = rows.filter((r) => r.oracle.length === 0).length
console.log(`promotions whose verify command runs no file (inline): ${noOracle}`)
