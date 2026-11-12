// Was the hedge gate ever consulted? The answer is in an absence.
//
// round.js sets candidateModeSource = 'evidence' only when secondCandidateGate
// refuses. Across 241 recorded rounds that value never appears -- 130 are
// 'default' with 2 candidates planned. That is not proof the code never ran; it is
// the fingerprint of a gate whose refusal is unreachable (exp-cand-003: tailMs was
// identically 0, so admit was always true).
//
// This replays the corrected gate round by round to say what would have changed:
// how many rounds would have bought one candidate instead of two, and how much
// candidate time that is.
import fs from 'node:fs'
import path from 'node:path'
import { secondCandidateGate, admitSecondCandidate } from '../../src/runtime/candidates.js'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')

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
let roundsSeen = 0
let oldRefusals = 0
let newRefusals = 0
let savedMs = 0
const byCampaign = []

for (const c of campaigns) {
  let state
  try { state = JSON.parse(fs.readFileSync(path.join(DIR, c, 'views', 'state.json'), 'utf8')) } catch { continue }
  const rounds = Array.isArray(state.rounds) ? state.rounds : []
  let oldRef = 0
  let newRef = 0
  let saved = 0
  for (let n = 1; n <= rounds.length; n += 1) {
    const prior = rounds.slice(0, n - 1)
    const before = oldGate(prior)
    const after = secondCandidateGate(prior)
    if (!before && !after) continue
    roundsSeen += 1
    if (before && before.admit === false) oldRef += 1
    if (after && after.admit === false) {
      newRef += 1
      // What the second candidate actually cost, when the round recorded both.
      const attempts = Array.isArray(rounds[n - 1]?.attempts) ? rounds[n - 1].attempts : []
      const d = attempts.map((a) => a?.durationMs).filter((x) => Number.isFinite(x) && x >= 0).sort((x, y) => x - y)
      if (d.length >= 2) saved += d[d.length - 1]
    }
  }
  oldRefusals += oldRef
  newRefusals += newRef
  savedMs += saved
  if (newRef > 0) byCampaign.push({ campaign: c, rounds: rounds.length, oldRefusals: oldRef, newRefusals: newRef, savedMs: saved })
}

console.log(`rounds the record can price (a prior round with 2 candidates): ${roundsSeen}`)
console.log(`  refusals under the old tail:  ${oldRefusals}`)
console.log(`  refusals under the fixed tail: ${newRefusals}`)
console.log(`  candidate-seconds this would not have bought: ${Math.round(savedMs / 1000)} s (${(savedMs / 3600000).toFixed(2)} h)`)
console.log(`  campaigns affected: ${byCampaign.length}`)
for (const x of byCampaign.sort((a, b) => b.newRefusals - a.newRefusals).slice(0, 15)) {
  console.log(`    ${x.campaign}: ${x.newRefusals}/${x.rounds} rounds, ${Math.round(x.savedMs / 1000)} s`)
}

fs.writeFileSync(path.join('research', 'exp', 'e74.json'), JSON.stringify({
  roundsPriceable: roundsSeen,
  oldRefusals,
  newRefusals,
  savedMs,
  campaignsAffected: byCampaign.length,
  detail: byCampaign,
}, null, 2))
