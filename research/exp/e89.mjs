// e88 settled it: attemptMs is the SUM of per-attempt durations (169/169 exact),
// while round durationMs is wall clock. Two candidates run in parallel, so the sum
// exceeds the round by construction -- 106 of 169 rounds have attemptMs > durationMs.
// e87's subtraction therefore produced a meaningless "machinery" figure.
//
// The honest version needs concurrency-awareness. Two defensible bounds:
//   lower bound on agent wall clock  = max(single attempt duration)   (fully serial agents)
//   upper bound                      = sum of attempt durations       (fully parallel agents)
// The true agent wall clock is between them, and machinery = duration - agent - verifier - holdout
// is therefore bracketed too. Report the bracket, not a point estimate.
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
  const perRound = new Map()
  for (const e of evs) {
    if (e.type !== 'attempt.finished') continue
    const d = e.data || {}
    const k = d.round
    if (!perRound.has(k)) perRound.set(k, [])
    perRound.get(k).push(Number(d.durationMs) || 0)
  }
  for (const e of evs) {
    if (e.type !== 'round.finished') continue
    const d = e.data || {}
    const ds = perRound.get(d.n)
    if (!ds || !ds.length) continue
    const dur = Number(d.durationMs) || 0
    if (dur <= 0) continue
    const ver = Number(d.verifierMs) || 0
    const hold = Number(d.holdoutMs) || 0
    const maxA = Math.max(...ds)
    const sumA = ds.reduce((a, b) => a + b, 0)
    rows.push({
      campaign: c, round: d.n, status: d.status, dur, ver, hold,
      maxA, sumA, n: ds.length,
      machUpper: dur - maxA - ver - hold,   // agents serial => most machinery is visible
      machLower: dur - sumA - ver - hold,   // agents parallel => least machinery visible
    })
  }
}

if (!rows.length) throw new Error('no usable rounds -- refusing to report a zero that means "I parsed nothing"')

const H = 3600000
const sum = (f) => rows.reduce((a, r) => a + r[f], 0)
const totDur = sum('dur')
const totVer = sum('ver'), totHold = sum('hold')
const machU = rows.reduce((a, r) => a + Math.max(0, r.machUpper), 0)
const machL = rows.reduce((a, r) => a + Math.max(0, r.machLower), 0)
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

console.log(`rounds: ${rows.length}, total wall clock ${(totDur / H).toFixed(2)} h`)
console.log('')
console.log('agent wall clock is bracketed, because candidates in a round run in parallel:')
console.log(`  serial (use slowest attempt): ${(sum('maxA') / H).toFixed(2)} h  ${((100 * sum('maxA')) / totDur).toFixed(1)}% of round time`)
console.log(`  parallel (sum all attempts):  ${(sum('sumA') / H).toFixed(2)} h  ${((100 * sum('sumA')) / totDur).toFixed(1)}%`)
console.log('')
console.log(`verifiers: ${(totVer / H).toFixed(2)} h  ${((100 * totVer) / totDur).toFixed(1)}%`)
console.log(`holdouts:  ${(totHold / H).toFixed(2)} h  ${((100 * totHold) / totDur).toFixed(1)}%`)
console.log('')
console.log('machinery (scheduler, gate, patch, commit, persistence) therefore lies in:')
console.log(`  ${(machL / H).toFixed(2)} h .. ${(machU / H).toFixed(2)} h  =  ${((100 * machL) / totDur).toFixed(1)}% .. ${((100 * machU) / totDur).toFixed(1)}% of round time`)

// The decision this answers: where should a speedup be aimed?
console.log('')
console.log('reading: the agent is the clock. Even the most generous machinery bound leaves')
console.log(`  ${((100 * (totDur - machU)) / totDur).toFixed(1)}% of round time in the candidate agents and verifiers.`)
console.log(`  Plumbing work -- whose unit cost is measured at ${(totVer / 259 / 1000).toFixed(1)} s per verifier run -- cannot`)
console.log('  move the total. Any speedup that does not reduce attempts or their duration is noise.')

// By outcome, using the upper machinery bound (most favourable to "machinery matters")
const byStatus = new Map()
for (const r of rows) {
  const k = r.status || '(absent)'
  const cur = byStatus.get(k) || { n: 0, dur: 0, mach: 0, attMax: 0 }
  cur.n += 1; cur.dur += r.dur; cur.mach += Math.max(0, r.machUpper); cur.attMax += r.maxA
  byStatus.set(k, cur)
}
console.log('')
console.log('by outcome (machinery = upper bound):')
for (const [k, v] of [...byStatus].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${k.padEnd(14)} n=${String(v.n).padStart(3)}  ${(v.dur / H).toFixed(2)} h  agent ${((100 * v.attMax) / v.dur).toFixed(0)}%  machinery ${((100 * v.mach) / v.dur).toFixed(1)}%`)
}

const out = {
  measuredAt: new Date().toISOString(),
  rounds: rows.length,
  totalRoundHours: +(totDur / H).toFixed(3),
  agentSerialHours: +(sum('maxA') / H).toFixed(3),
  agentParallelHours: +(sum('sumA') / H).toFixed(3),
  verifierHours: +(totVer / H).toFixed(3),
  holdoutHours: +(totHold / H).toFixed(3),
  machineryLowerHours: +(machL / H).toFixed(3),
  machineryUpperHours: +(machU / H).toFixed(3),
  machineryLowerShare: +(machL / totDur).toFixed(4),
  machineryUpperShare: +(machU / totDur).toFixed(4),
  byStatus: Object.fromEntries([...byStatus].map(([k, v]) => [k, { n: v.n, hours: +(v.dur / H).toFixed(3), agentShare: +(v.attMax / v.dur).toFixed(4), machineryUpperShare: +(v.mach / v.dur).toFixed(4) }])),
}
fs.writeFileSync('research/exp/e89.json', JSON.stringify(out, null, 2) + '\n')
console.log('\nwrote research/exp/e89.json')
