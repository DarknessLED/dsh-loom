// e87 printed candidate agents = 111.4% of round wall clock, which is impossible
// for a wall clock. Two possibilities:
//   (a) attemptMs is a SUM of per-attempt durations while durationMs is wall clock,
//       so a round that ran two candidates in parallel can spend 2x its wall clock
//       in agent time;
//   (b) attemptMs is buggy.
// Only (a) is checkable: if it holds, attemptMs/durationMs should track attemptCount.
//
// This matters because machinery = duration - attempt - verifier - holdout is only a
// real quantity if all four are the same unit. If one is a sum, the subtraction is
// meaningless and the 4.1% machinery figure from e87 is an artefact.
import fs from 'node:fs'
import path from 'node:path'

const HOME = process.env.USERPROFILE || process.env.HOME
const CAMPAIGNS = path.join(HOME, '.dsh', 'loom', 'campaigns')

function events(campaign) {
  const f = path.join(CAMPAIGNS, campaign, 'events.jsonl')
  if (!fs.existsSync(f)) return []
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const t = line.trim(); if (!t) continue
    try { out.push(JSON.parse(t)) } catch {}
  }
  return out
}

const rows = []
for (const c of fs.readdirSync(CAMPAIGNS)) {
  const evs = events(c)
  const byRound = new Map()
  for (const e of evs) {
    if (e.type === 'attempt.finished') {
      const d = e.data || {}
      const k = d.round
      if (!byRound.has(k)) byRound.set(k, [])
      byRound.get(k).push(Number(d.durationMs) || 0)
    }
  }
  for (const e of evs) {
    if (e.type !== 'round.finished') continue
    const d = e.data || {}
    const n = d.n
    const durations = byRound.get(n)
    if (!durations || !durations.length) continue
    rows.push({
      campaign: c, round: n,
      roundMs: Number(d.durationMs) || 0,
      attemptMs: Number(d.attemptMs) || 0,
      attemptCount: Number(d.attemptCount) || 0,
      sumAttemptMs: durations.reduce((a, b) => a + b, 0),
      attemptsSeen: durations.length,
    })
  }
}

if (!rows.length) throw new Error('parsed no rounds with attempts -- refusing to report a zero that means "I parsed nothing"')

// 1. Is attemptMs equal to the sum of its attempts' durations?
const both = rows.filter((r) => r.attemptMs > 0 && r.sumAttemptMs > 0)
const exact = both.filter((r) => Math.abs(r.attemptMs - r.sumAttemptMs) < 1)
console.log(`rounds with both figures: ${both.length}`)
console.log(`attemptMs === sum of attempt durations: ${exact.length}/${both.length} (${(100 * exact.length / both.length).toFixed(1)}%)`)

// 2. Ratio attemptMs / roundMs by attemptCount. A wall clock would never exceed 1.
const byCount = new Map()
for (const r of rows) {
  if (!r.roundMs) continue
  const k = r.attemptCount
  const cur = byCount.get(k) || { n: 0, ratios: [] }
  cur.n += 1; cur.ratios.push(r.attemptMs / r.roundMs)
  byCount.set(k, cur)
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
console.log('')
console.log('agent time as a multiple of round wall clock, by candidates per round:')
for (const [k, v] of [...byCount].sort((a, b) => a[0] - b[0])) {
  console.log(`  attemptCount=${String(k).padStart(2)}  n=${String(v.n).padStart(3)}  median ratio ${med(v.ratios).toFixed(2)}  (>=1: ${v.ratios.filter((x) => x >= 1).length}/${v.n})`)
}

// 3. The direct test: does machinery = duration - attempt - verifier - holdout go
//    negative exactly when there was more than one candidate?
const mach = rows.map((r) => ({ ...r, mach: r.roundMs - r.attemptMs })).filter((r) => r.roundMs > 0)
const neg = mach.filter((r) => r.mach < 0)
console.log('')
console.log(`rounds where attemptMs alone exceeds the round wall clock: ${neg.length}/${mach.length}`)
const negCounts = new Map()
for (const r of neg) negCounts.set(r.attemptCount, (negCounts.get(r.attemptCount) || 0) + 1)
console.log(`  their attemptCount distribution: ${JSON.stringify(Object.fromEntries([...negCounts].sort((a, b) => a[0] - b[0])))}`)
const posCounts = new Map()
for (const r of mach.filter((x) => x.mach >= 0)) posCounts.set(r.attemptCount, (posCounts.get(r.attemptCount) || 0) + 1)
console.log(`  vs non-negative rounds:          ${JSON.stringify(Object.fromEntries([...posCounts].sort((a, b) => a[0] - b[0])))}`)

// 4. So what IS the honest machinery figure? Use only single-candidate rounds, where
//    a sum equals a wall clock by construction.
const single = mach.filter((r) => r.attemptCount === 1)
const sMach = single.filter((r) => r.mach > 0)
console.log('')
console.log(`single-candidate rounds: ${single.length}; machinery positive in ${sMach.length}`)
if (single.length) {
  const totDur = single.reduce((a, r) => a + r.roundMs, 0)
  const totAtt = single.reduce((a, r) => a + r.attemptMs, 0)
  console.log(`  their wall clock ${(totDur / 3600000).toFixed(2)} h, agent ${(totAtt / 3600000).toFixed(2)} h (${(100 * totAtt / totDur).toFixed(1)}%)`)
  console.log(`  machinery ${(sMach.reduce((a, r) => a + r.mach, 0) / 3600000).toFixed(2)} h, median ${med(sMach.map((r) => r.mach)).toFixed(0)} ms per round`)
}

const out = {
  measuredAt: new Date().toISOString(),
  roundsCompared: both.length,
  attemptMsEqualsSumOfAttemptDurations: exact.length,
  attemptMsEqualsSumShare: +(exact.length / both.length).toFixed(4),
  ratioByAttemptCount: Object.fromEntries([...byCount].map(([k, v]) => [k, { n: v.n, medianRatio: +med(v.ratios).toFixed(3), atOrAbove1: v.ratios.filter((x) => x >= 1).length }])),
  negativeMachineryRounds: neg.length,
  negativeByAttemptCount: Object.fromEntries(negCounts),
  singleCandidate: {
    rounds: single.length,
    wallClockMs: single.reduce((a, r) => a + r.roundMs, 0),
    agentMs: single.reduce((a, r) => a + r.attemptMs, 0),
    machineryMedianMs: sMach.length ? Math.round(med(sMach.map((r) => r.mach))) : null,
  },
}
fs.writeFileSync('research/exp/e88.json', JSON.stringify(out, null, 2) + '\n')
console.log('\nwrote research/exp/e88.json')
