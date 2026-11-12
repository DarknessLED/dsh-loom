// w7-attribution claims 22 failures exited 0 with "3/3 passed" and still scored 0,
// because gateOk conjoins the verifier with outcomeKind === 'ok'. Check that from
// the ledger directly: how many attempts verified green and were thrown away, and
// what killed them.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const attempts = []
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'attempt.finished') continue
    attempts.push({ campaign: c, ...e.data })
  }
}

const green = attempts.filter((a) => a.verifierOk === true)
const greenZero = green.filter((a) => Number(a.score) === 0)
const byStop = {}
for (const a of greenZero) {
  const key = `${a.stopReason ?? 'null'}${a.timedOut ? '+timeout' : ''}`
  byStop[key] = (byStop[key] || 0) + 1
}
// Which of them left a patch worth keeping?
const withPatch = greenZero.filter((a) => a.patch && (Number(a.diff?.files || 0) > 0 || (a.patchSize ?? 0) > 100))
const sizes = greenZero.map((a) => Number(a.diff?.files ?? 0))

console.log(JSON.stringify({
  attempts: attempts.length,
  verifierGreen: green.length,
  greenButScoreZero: greenZero.length,
  greenZeroShare: +(greenZero.length / green.length).toFixed(3),
  greenZeroByStopReason: byStop,
  greenZeroWithRealPatch: withPatch.length,
  greenZeroDiffFileCounts: sizes.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc }, {}),
  examples: greenZero.slice(0, 5).map((a) => ({ campaign: a.campaign, id: a.id, stop: a.stopReason, score: a.score, error: String(a.error || '').slice(0, 90) })),
}, null, 2))
