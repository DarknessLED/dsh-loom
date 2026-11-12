// Of the 22 attempts whose shell verifier went green and whose gate verdict did
// not, 7 left files in the tree. Would any of them have been promoted? That needs
// a real verifier run against the recorded patch - do it for the ones whose patch
// file still exists, in a scratch worktree.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const NODE = process.execPath
const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const verifier = new Map()
const attempts = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'verifier.finished') verifier.set(`${c}|${d.attemptId}`, d)
    if (e.type === 'attempt.finished') attempts.push({ campaign: c, ...d })
  }
}

const suspects = attempts.filter((a) => {
  const v = verifier.get(`${a.campaign}|${a.id}`)
  return v?.ok === true && a.verifierOk !== true && a.patch && fs.existsSync(a.patch)
})

const scratch = path.join(os.tmpdir(), 'loom-salvage')
fs.rmSync(scratch, { recursive: true, force: true })
execFileSync('git', ['clone', '--quiet', '--no-hardlinks', 'C:/Projects/RSI', scratch], { stdio: 'ignore' })

const results = []
for (const a of suspects) {
  const patchText = fs.readFileSync(a.patch, 'utf8')
  if (!patchText.includes('diff --git')) { results.push({ id: a.id, campaign: a.campaign, patch: 'empty' }); continue }
  try {
    execFileSync('git', ['apply', '--check', a.patch], { cwd: scratch, stdio: 'pipe' })
    execFileSync('git', ['apply', a.patch], { cwd: scratch, stdio: 'pipe' })
  } catch (err) {
    results.push({ id: a.id, campaign: a.campaign, patch: 'does-not-apply', detail: String(err.stderr || err.message).slice(0, 120) })
    continue
  }
  // Run the campaign's own task verifier against the patched tree.
  const sp = path.join(base, a.campaign, 'views', 'state.json')
  let spec = null
  try {
    const s = JSON.parse(fs.readFileSync(sp, 'utf8'))
    const list = (s.evalset && Array.isArray(s.evalset.tasks) ? s.evalset.tasks : s.tasks) || []
    spec = list.find((t) => t.id === a.roundTask) || list[0] || null
  } catch { /* no state */ }
  let ok = null
  if (spec?.verify?.cmd) {
    try {
      execFileSync('cmd', ['/c', spec.verify.cmd], { cwd: scratch, stdio: 'pipe', timeout: 180000, env: { ...process.env, PATH: `${path.dirname(NODE)};${process.env.PATH}` } })
      ok = true
    } catch (err) { ok = false }
  }
  results.push({ id: a.id, campaign: a.campaign, patch: 'applied', verifyOk: ok, files: Number(a.diff?.files ?? 0) })
  execFileSync('git', ['checkout', '--quiet', '--', '.'], { cwd: scratch })
  execFileSync('git', ['clean', '-fdq'], { cwd: scratch })
}

console.log(JSON.stringify({ suspects: suspects.length, results }, null, 2))
