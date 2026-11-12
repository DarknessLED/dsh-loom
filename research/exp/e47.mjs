// The digest's first recommendation is a differential oracle: run the verifier on
// the base tree as well as the candidate, and only count a green as earned when it
// went red->green. Before recommending it, replay it honestly: for every promotion
// that landed a commit, reconstruct its parent tree and run the task's own spec
// there. If the spec already passed at the parent, the promotion paid a coin for a
// verdict that was already true, and the differential oracle would have blocked it.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exec, execFileSync } from 'node:child_process'

const NODE = process.execPath
const REPO = 'C:/Projects/RSI'
const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const LIMIT = Number(process.env.LOOM_DIFF_LIMIT || 0)

// task definitions, newest wins
const tasks = new Map()
for (const c of fs.readdirSync(base)) {
  const sp = path.join(base, c, 'views', 'state.json')
  if (!fs.existsSync(sp)) continue
  let s; try { s = JSON.parse(fs.readFileSync(sp, 'utf8')) } catch { continue }
  for (const t of (s.evalset && s.evalset.tasks) || []) {
    const cmd = String(t.verify?.cmd || '')
    if (!cmd) continue
    tasks.set(t.id, { id: t.id, cmd: cmd.split(/\s*&&\s*/)[0].trim() })
  }
}

// promotion -> commit -> task
const rows = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  const sp = path.join(base, c, 'views', 'state.json')
  if (!fs.existsSync(ev)) continue
  const roundTask = new Map()
  try {
    const s = JSON.parse(fs.readFileSync(sp, 'utf8'))
    for (const r of s.rounds || []) if (r.taskId) roundTask.set(r.n, r.taskId)
  } catch {}
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'autopilot.applied' || !e.data?.commit) continue
    const taskId = roundTask.get(Number(e.data.round))
    if (!taskId) continue
    rows.push({ campaign: c, round: Number(e.data.round), taskId, commit: e.data.commit })
  }
}

function run(cmd, cwd) {
  const started = Date.now()
  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout: 180000, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, PATH: `${path.dirname(NODE)};${process.env.PATH}` } }, (err, stdout, stderr) => {
      const text = String(stdout || '') + String(stderr || '')
      const m = text.match(/(\d+)\/(\d+) passed/)
      resolve({ ok: !err, passed: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null, ms: Date.now() - started, tail: text.slice(-300) })
    })
  })
}

const results = []
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'loomdiff-'))
let i = 0
for (const row of rows) {
  if (LIMIT && i >= LIMIT) break
  i++
  const task = tasks.get(row.taskId)
  if (!task) { results.push({ ...row, skipped: 'no-task' }); continue }
  const parent = (() => { try { return execFileSync('git', ['rev-parse', `${row.commit}^`], { cwd: REPO, encoding: 'utf8' }).trim() } catch { return null } })()
  if (!parent) { results.push({ ...row, skipped: 'no-parent' }); continue }
  const dir = path.join(scratch, `w${i}`)
  try {
    execFileSync('git', ['worktree', 'add', '--detach', dir.replace(/\\/g, '/'), parent], { cwd: REPO, stdio: 'ignore' })
  } catch (err) {
    results.push({ ...row, skipped: 'worktree-failed', detail: String(err.message).slice(0, 120) })
    continue
  }
  // A worktree is tracked files only: without this the spec runs against a tree
  // with no dependencies and fails for a reason that has nothing to do with the
  // patch (src/exec/worktree.js:132). Link before measuring, or the whole replay
  // reads as "every promotion was earned".
  const deps = path.join(REPO, 'node_modules')
  if (fs.existsSync(deps)) {
    try { fs.symlinkSync(deps, path.join(dir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir') } catch {}
  }
  const specFile = (task.cmd.match(/tests[\\/][^\s"']+\.mjs/) || [null])[0]
  let specPresentAtBase = null
  if (specFile) specPresentAtBase = fs.existsSync(path.join(dir, specFile))
  const baseRun = specPresentAtBase === false ? null : await run(task.cmd, dir)
  // The verdict the loop actually saw: the same spec on the candidate commit.
  // Measuring only the base says whether the spec went red first; measuring both
  // says what the differential oracle would have decided, which is the question.
  const cdir = path.join(scratch, `c${i}`)
  let candRun = null
  try {
    execFileSync('git', ['worktree', 'add', '--detach', cdir.replace(/\\/g, '/'), row.commit], { cwd: REPO, stdio: 'ignore' })
    if (fs.existsSync(deps)) { try { fs.symlinkSync(deps, path.join(cdir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir') } catch {} }
    candRun = await run(task.cmd, cdir)
    execFileSync('git', ['worktree', 'remove', '--force', cdir.replace(/\\/g, '/')], { cwd: REPO, stdio: 'ignore' })
  } catch (err) {
    candRun = { ok: null, tail: String(err.message).slice(0, 120) }
  }
  try { execFileSync('git', ['worktree', 'remove', '--force', dir.replace(/\\/g, '/')], { cwd: REPO, stdio: 'ignore' }) } catch {}
  results.push({ ...row, parent, specFile, specPresentAtBase, baseOk: baseRun?.ok ?? null, basePassed: baseRun?.passed ?? null, baseTotal: baseRun?.total ?? null, baseMs: baseRun?.ms ?? null, baseTail: baseRun?.tail ?? null, candOk: candRun?.ok ?? null, candPassed: candRun?.passed ?? null, candTail: candRun?.tail ?? null })
}
try { execFileSync('git', ['worktree', 'prune'], { cwd: REPO, stdio: 'ignore' }) } catch {}

const usable = results.filter(r => r.baseOk !== null && r.baseOk !== undefined)
const bothMeasured = usable.filter(r => r.candOk !== null && r.candOk !== undefined)
const passedAtBase = usable.filter(r => r.baseOk === true)
// earned under the differential rule: red at the parent, green at the candidate
const earned = bothMeasured.filter(r => r.baseOk === false && r.candOk === true)
const wouldBlock = bothMeasured.filter(r => r.baseOk === true && r.candOk === true)
const out = {
  measuredAt: new Date().toISOString(),
  promotionsWithCommit: rows.length,
  attempted: results.length,
  usable: usable.length,
  specMissingAtBase: results.filter(r => r.specPresentAtBase === false).length,
  passedAtBase: passedAtBase.length,
  failedAtBase: usable.length - passedAtBase.length,
  wouldBeBlockedByDifferential: wouldBlock.length,
  earnedUnderDifferential: earned.length,
  bothMeasured: bothMeasured.length,
  // anomalies where the historical verifierOk=true cannot be reproduced here
  candRedButWasPromoted: bothMeasured.filter(r => r.candOk === false).length,
  byCampaign: {},
  rows: results,
}
for (const r of usable) {
  const k = r.campaign
  out.byCampaign[k] = out.byCampaign[k] || { base: 0, head: 0 }
  out.byCampaign[k][r.baseOk === true ? 'base' : 'head']++
}
fs.writeFileSync('research/exp/e47.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify({ ...out, rows: undefined, byCampaign: undefined }, null, 1))
