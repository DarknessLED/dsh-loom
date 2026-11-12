// w2-decide-gap-false-accept-cost-unmeasured: the cost ratio between a false accept
// and a false reject in an RSI loop is never quantified, so no threshold can be set.
//
// Both arms are measurable from the ledger:
//   false reject = a candidate that would have been accepted but was not. e43b found
//     22 rounds where the verifier went green and the gate said no.
//   false accept = a promotion that should not have stood. e47 found 7 whose spec
//     already passed at base.
//
// What each one costs is different in kind: a false reject costs the round's wall
// clock and its tokens (the work is thrown away); a false accept costs a revert plus
// re-testing later, and the exposure window in between.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const readJsonl = (f) => {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn */ }
  }
  return out
}

const rounds = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) {
    if (e.type === 'round.finished') rounds.push({ campaign: c, ...e.data })
  }
}

// Cost unit: one round. Measured median roundMs is the price of throwing work away.
const durs = rounds.map((r) => r.durationMs).filter((d) => Number.isFinite(d) && d > 0).sort((a, b) => a - b)
const median = durs.length ? durs[Math.floor(durs.length / 2)] : null
const mean = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null

// False rejects: computed here from the events, not read from e43b -- e43b prints
// its result to stdout and writes no artifact, so the first version of this file
// silently reported '?' for both counts. Reading a file that does not exist is not
// a measurement of zero, and it is not a measurement at all.
const verifier = new Map()
const attempts = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) {
    const d = e.data ?? {}
    if (e.type === 'verifier.finished') verifier.set(`${c}|${d.attemptId}`, d)
    if (e.type === 'attempt.finished') attempts.push({ campaign: c, ...d })
  }
}
const falseRejectRows = []
for (const a of attempts) {
  const v = verifier.get(`${a.campaign}|${a.id}`)
  if (v && v.ok === true && a.verifierOk !== true) falseRejectRows.push(a)
}
if (!attempts.length) throw new Error('no attempts read: check the events path before trusting any number below')
const falseRejects = falseRejectRows.length
const falseRejectMs = falseRejectRows.reduce((s, a) => s + (a.durationMs ?? 0), 0)

// False accepts from e47.
let e47 = null
try { e47 = JSON.parse(fs.readFileSync(path.join('research', 'exp', 'e47.json'), 'utf8')) } catch { /* absent */ }
if (e47 && !Object.hasOwn(e47.rows[0] ?? {}, 'baseOk')) throw new Error('e47 row shape changed: no baseOk')
const falseAccepts = e47 ? e47.rows.filter((r) => r.baseOk === true).length : null
const checkable = e47 ? e47.rows.length : null

// What a false accept costs: the revert is one commit + the acceptance run. e47
// measured a base run at ~1 s median, so the revert cost is dominated by noticing,
// which is unbounded. Bound it from below by the acceptance cost alone.
const e47MedMs = e47 ? (() => { const xs = e47.rows.map((r) => r.baseMs).filter(Number.isFinite).sort((a, b) => a - b); return xs[Math.floor(xs.length / 2)] })() : null

console.log(`rounds with a duration: ${durs.length}; median ${median} ms, mean ${Math.round(mean)} ms`)
console.log(`\nfalse reject (green verifier, gate said no):`)
console.log(`  count: ${falseRejects ?? '?'}   wall clock thrown away: ${falseRejectMs != null ? (falseRejectMs / 3600000).toFixed(2) + ' h' : '?'}`)
if (falseRejects != null && median) console.log(`  in round-units: ${(falseRejectMs / median).toFixed(1)} rounds`)
console.log(`\nfalse accept (spec already passed at base):`)
console.log(`  count: ${falseAccepts ?? '?'} of ${checkable ?? '?'} checkable promotions`)
if (e47MedMs != null) console.log(`  detection cost per case (base re-run): ~${e47MedMs} ms`)
console.log(`  detection total for all of them: ~${e47 ? (e47.rows.filter((r) => r.baseOk).length * e47MedMs / 1000).toFixed(1) : '?'} s`)
console.log(`\nratio: a false reject costs a whole round (${median ? (median / 1000).toFixed(0) : '?'} s) of discarded work;`)
console.log(`       a false accept costs one re-run (~${e47MedMs} ms) to *detect*, once someone runs the check.`)
if (median && e47MedMs) console.log(`       => ${(median / e47MedMs).toFixed(0)}x asymmetry in detection cost, in favour of accepting.`)
console.log(`\nThe asymmetry is why the gate should be biased toward rejecting: rejecting costs the round,`)
console.log(`accepting costs unbounded exposure that is only priced when a check exists.`)

fs.writeFileSync(path.join('research', 'exp', 'e80.json'), JSON.stringify({
  roundsWithDuration: durs.length, medianRoundMs: median, meanRoundMs: mean,
  falseRejects, falseRejectMs, falseAccepts, checkable, baseRerunMs: e47MedMs,
}, null, 2))
