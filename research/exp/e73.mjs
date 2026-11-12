// How many second-candidate decisions does the tail fix flip?
//
// exp-cand-001 found that every two-candidate round in the ledger priced its hedge
// at tailMs = 0, because `sorted[floor(n/2)]` with n = 2 is the slowest attempt,
// so `slowest - reference` is always 0. EV = p(1-p)*roundMs - 0 > 0 for any p in
// (0,1), so the gate could only ever admit.
//
// The fix uses the lower median, which for n = 2 is the faster attempt, so the tail
// is the second candidate's own cost. This measures the difference on the record.
import fs from 'node:fs'
import path from 'node:path'
import { secondCandidateGate, admitSecondCandidate } from '../../src/runtime/candidates.js'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')

// The previous price, kept here so the comparison is a replay and not a memory.
function oldGate(rounds, { window = 10 } = {}) {
  const history = Array.isArray(rounds) ? rounds : []
  const size = Math.max(1, Math.floor(Number(window) || 10))
  const measured = history.slice(-size).filter((r) => {
    const a = Array.isArray(r?.attempts) ? r.attempts : []
    return a.length >= 2 && Number.isFinite(r?.durationMs) && r.durationMs > 0
  })
  if (!measured.length) return null
  const promoted = measured.filter((r) => r?.promoted === true || r?.landed === true || r?.status === 'promoted').length
  const p = (promoted + 1) / (measured.length + 2)
  const roundMs = measured.reduce((s, r) => s + r.durationMs, 0) / measured.length
  const tails = measured.map((r) => {
    const a = Array.isArray(r.attempts) ? r.attempts : []
    const d = a.map((x) => x?.durationMs).filter((x) => Number.isFinite(x) && x >= 0)
    if (d.length >= 2) {
      const s = [...d].sort((x, y) => x - y)
      return Math.max(0, s[s.length - 1] - s[Math.floor(s.length / 2)])
    }
    return Math.max(0, (r.durationMs ?? 0) - (r.planMs ?? 0)) / Math.max(1, a.length)
  })
  const tailMs = tails.reduce((s, t) => s + t, 0) / tails.length
  return { ...admitSecondCandidate({ p, roundMs, tailMs }), p, roundMs, tailMs, rounds: measured.length }
}

const campaigns = fs.readdirSync(DIR).filter((c) => fs.existsSync(path.join(DIR, c, 'views', 'state.json')))
const priced = []
for (const c of campaigns) {
  let state
  try { state = JSON.parse(fs.readFileSync(path.join(DIR, c, 'views', 'state.json'), 'utf8')) } catch { continue }
  const rounds = Array.isArray(state.rounds) ? state.rounds : []
  const before = oldGate(rounds)
  const after = secondCandidateGate(rounds)
  if (!before && !after) continue
  priced.push({
    campaign: c,
    rounds: rounds.length,
    beforeAdmit: before?.admit ?? null,
    afterAdmit: after?.admit ?? null,
    beforeTail: before?.tailMs ?? null,
    afterTail: after?.tailMs ?? null,
    p: after?.p ?? before?.p ?? null,
    roundMs: after?.roundMs ?? before?.roundMs ?? null,
    flipped: before && after ? before.admit !== after.admit : null,
  })
}

const withBoth = priced.filter((x) => x.beforeAdmit !== null && x.afterAdmit !== null)
const flipped = withBoth.filter((x) => x.flipped)
const zeroTail = priced.filter((x) => x.beforeTail === 0)

console.log(`campaigns the record can price: ${priced.length} (of ${campaigns.length})`)
console.log(`  before: admitted ${priced.filter((x) => x.beforeAdmit).length}, refused ${priced.filter((x) => x.beforeAdmit === false).length}`)
console.log(`  after:  admitted ${priced.filter((x) => x.afterAdmit).length}, refused ${priced.filter((x) => x.afterAdmit === false).length}`)
console.log(`  campaigns priced at exactly tailMs = 0 before the fix: ${zeroTail.length} of ${priced.length}`)
console.log(`  decisions that flip (admit -> refuse): ${flipped.filter((x) => x.beforeAdmit && !x.afterAdmit).length}`)
console.log(`  decisions that flip (refuse -> admit): ${flipped.filter((x) => !x.beforeAdmit && x.afterAdmit).length}`)
console.log(`  decisions unchanged: ${withBoth.length - flipped.length}`)
const tails = priced.map((x) => x.afterTail).filter((x) => x !== null).sort((a, b) => a - b)
if (tails.length) {
  console.log(`  tail after fix: min ${Math.round(tails[0])} p50 ${Math.round(tails[Math.floor(tails.length / 2)])} max ${Math.round(tails[tails.length - 1])} ms`)
}
console.log('\nflipped campaigns:')
for (const x of flipped) {
  console.log(`  ${x.campaign}: p=${x.p?.toFixed(3)} roundMs=${Math.round(x.roundMs)} tail ${Math.round(x.beforeTail)} -> ${Math.round(x.afterTail)} (${x.beforeAdmit ? 'admit' : 'refuse'} -> ${x.afterAdmit ? 'admit' : 'refuse'})`)
}

fs.writeFileSync(path.join('research', 'exp', 'e73.json'), JSON.stringify({
  priceable: priced.length,
  campaigns: campaigns.length,
  zeroTailBefore: zeroTail.length,
  flippedToRefuse: flipped.filter((x) => x.beforeAdmit && !x.afterAdmit).length,
  flippedToAdmit: flipped.filter((x) => !x.beforeAdmit && x.afterAdmit).length,
  unchanged: withBoth.length - flipped.length,
  tailAfter: tails.length ? { min: tails[0], p50: tails[Math.floor(tails.length / 2)], max: tails[tails.length - 1] } : null,
  detail: priced,
}, null, 2))
