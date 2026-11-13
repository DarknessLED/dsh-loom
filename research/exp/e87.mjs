// gap-w1-003: "No study attributes wall clock inside an RSI loop's own machinery
// (planner, candidate, verifier, promotion, commit)." Published cost numbers for
// self-improvement loops are quoted per attempt or per run, never split by which
// part of the loop spent the time.
//
// Our rounds carry enough to do exactly that split:
//   round.finished.durationMs  -- the whole round, wall clock
//   round.finished.attemptMs   -- time inside candidate agents
//   round.finished.verifierMs  -- time inside spec runs
//   round.finished.holdoutMs   -- time inside holdout runs
// so machinery = durationMs - attemptMs - verifierMs - holdoutMs.
//
// The question this answers: if you wanted to make the loop faster, are you
// optimising the agent (expensive, model-bound) or the plumbing (cheap, ours)?
import fs from 'node:fs'
import path from 'node:path'

const HOME = process.env.USERPROFILE || process.env.HOME
const LOOM = path.join(HOME, '.dsh', 'loom')
const CAMPAIGNS = path.join(LOOM, 'campaigns')

function events(campaign) {
  const f = path.join(CAMPAIGNS, campaign, 'events.jsonl')
  if (!fs.existsSync(f)) return []
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t) continue
    let e
    try { e = JSON.parse(t) } catch { continue }
    out.push(e)
  }
  return out
}

const list = fs.existsSync(CAMPAIGNS) ? fs.readdirSync(CAMPAIGNS) : []
const rows = []
let malformed = 0
for (const c of list) {
  for (const e of events(c)) {
    if (e.type !== 'round.finished') continue
    const d = e.data || {}
    const dur = Number(d.durationMs)
    if (!Number.isFinite(dur) || dur <= 0) { malformed += 1; continue }
    const att = Number(d.attemptMs) || 0
    const ver = Number(d.verifierMs) || 0
    const hold = Number(d.holdoutMs) || 0
    const known = att + ver + hold
    // machinery can go negative on clock skew; keep it out of the sums and count it
    const mach = dur - known
    rows.push({
      campaign: c, round: d.n, status: d.status,
      dur, att, ver, hold, known, mach,
      attRuns: Number(d.attemptCount) || 0,
      verRuns: Number(d.verifierRuns) || 0,
    })
  }
}

if (rows.length === 0) throw new Error('no usable round.finished rows -- refusing to report a zero that means "I parsed nothing"')

const sum = (f) => rows.reduce((a, r) => a + r[f], 0)
const totDur = sum('dur')
const totAtt = sum('att'), totVer = sum('ver'), totHold = sum('hold')
const mach = rows.filter((r) => r.mach > 0)
const totMach = mach.reduce((a, r) => a + r.mach, 0)
const negMach = rows.filter((r) => r.mach < 0).length

const pct = (x) => `${((100 * x) / totDur).toFixed(1)}%`
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN }

console.log(`rounds with a usable duration: ${rows.length} (skipped ${malformed} malformed)`)
console.log(`total round wall clock: ${(totDur / 3600000).toFixed(2)} h`)
console.log('')
console.log('where the wall clock went:')
console.log(`  candidate agents  ${(totAtt / 3600000).toFixed(2)} h  ${pct(totAtt)}  (${sum('attRuns')} attempt runs)`)
console.log(`  verifiers         ${(totVer / 3600000).toFixed(2)} h  ${pct(totVer)}  (${sum('verRuns')} runs)`)
console.log(`  holdouts          ${(totHold / 3600000).toFixed(2)} h  ${pct(totHold)}`)
console.log(`  machinery         ${(totMach / 3600000).toFixed(2)} h  ${pct(totMach)}  (${mach.length} rounds with a positive figure)`)
if (negMach) console.log(`  (${negMach} rounds had machinery <= 0 -- clock skew or overlap, excluded from the machinery sum, still in the total)`)

// Per-component unit cost: what does one of each thing cost?
const attRuns = sum('attRuns'), verRuns = sum('verRuns')
console.log('')
console.log('unit costs:')
console.log(`  per attempt run:  ${(totAtt / attRuns / 1000).toFixed(1)} s  (n=${attRuns})`)
console.log(`  per verifier run: ${(totVer / verRuns / 1000).toFixed(1)} s  (n=${verRuns})`)
console.log(`  per round total:  ${(totDur / rows.length / 1000).toFixed(0)} s  (median ${(med(rows.map((r) => r.dur)) / 1000).toFixed(0)} s)`)
console.log(`  machinery per round: ${(totMach / mach.length / 1000).toFixed(1)} s  (median ${(med(mach.map((r) => r.mach)) / 1000).toFixed(1)} s, n=${mach.length})`)

// The actionable cut: machinery share by outcome. A round that promotes is the
// only one that bought anything, so machinery waste is largest where status != promoted.
const byStatus = new Map()
for (const r of rows) {
  const k = r.status || '(absent)'
  const cur = byStatus.get(k) || { n: 0, dur: 0, att: 0, mach: 0 }
  cur.n += 1; cur.dur += r.dur; cur.att += r.att; cur.mach += Math.max(0, r.mach)
  byStatus.set(k, cur)
}
console.log('')
console.log('by round outcome:')
for (const [k, v] of [...byStatus].sort((a, b) => b[1].n - a[1].n)) {
  const share = v.dur ? ((100 * v.mach) / v.dur).toFixed(1) : '?'
  console.log(`  ${k.padEnd(14)} n=${String(v.n).padStart(3)}  ${(v.dur / 3600000).toFixed(2)} h  machinery ${share}%  (${(v.mach / 3600000).toFixed(2)} h)`)
}

// How much of the machinery figure is rounds that produced nothing?
const noPromo = rows.filter((r) => r.status !== 'promoted')
const noPromoMach = noPromo.reduce((a, r) => a + Math.max(0, r.mach), 0)
console.log('')
console.log(`machinery in non-promoting rounds: ${(noPromoMach / 3600000).toFixed(2)} h of ${(totMach / 3600000).toFixed(2)} h (${((100 * noPromoMach) / totMach).toFixed(1)}%)`)

const out = {
  measuredAt: new Date().toISOString(),
  rounds: rows.length,
  malformed,
  totalRoundMs: totDur,
  totalRoundHours: +(totDur / 3600000).toFixed(3),
  candidateMs: totAtt, verifierMs: totVer, holdoutMs: totHold, machineryMs: totMach,
  shares: {
    candidate: +(totAtt / totDur).toFixed(4),
    verifier: +(totVer / totDur).toFixed(4),
    holdout: +(totHold / totDur).toFixed(4),
    machinery: +(totMach / totDur).toFixed(4),
  },
  unitCosts: {
    perAttemptSec: +(totAtt / attRuns / 1000).toFixed(1),
    perVerifierRunSec: +(totVer / verRuns / 1000).toFixed(1),
    perRoundSec: +(totDur / rows.length / 1000).toFixed(0),
    machineryPerRoundSec: +(totMach / mach.length / 1000).toFixed(1),
  },
  negativeMachineryRounds: negMach,
  byStatus: Object.fromEntries([...byStatus].map(([k, v]) => [k, { n: v.n, durHours: +(v.dur / 3600000).toFixed(3), machHours: +(v.mach / 3600000).toFixed(3) }])),
  machineryInNonPromotingHours: +(noPromoMach / 3600000).toFixed(3),
}
fs.writeFileSync('research/exp/e87.json', JSON.stringify(out, null, 2) + '\n')
console.log('\nwrote research/exp/e87.json')
