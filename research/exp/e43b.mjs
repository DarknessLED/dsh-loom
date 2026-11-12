// verifier.finished records the shell result; attempt.finished records the gate's
// view. If the shell said ok and the attempt says not-ok, the gate overrode a
// green verifier. Count that gap and attribute it.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

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

const rows = []
for (const a of attempts) {
  const v = verifier.get(`${a.campaign}|${a.id}`)
  if (!v) continue
  if (v.ok === true && a.verifierOk !== true) rows.push({ campaign: a.campaign, id: a.id, stop: a.stopReason, score: a.score, error: String(a.error || '').slice(0, 100), files: Number(a.diff?.files ?? 0) })
}
const byErr = {}
for (const r of rows) {
  const key = r.error.includes('no diagnostic') ? 'no-diagnostic' : (r.error.split(/\s+/).slice(0, 4).join(' ') || `stop:${r.stop}`)
  byErr[key] = (byErr[key] || 0) + 1
}

console.log(JSON.stringify({
  attemptsWithVerifierEvent: attempts.filter((a) => verifier.has(`${a.campaign}|${a.id}`)).length,
  shellGreenGateNot: rows.length,
  ofWhichLeftFiles: rows.filter((r) => r.files > 0).length,
  byError: byErr,
  examples: rows.slice(0, 6),
}, null, 2))
