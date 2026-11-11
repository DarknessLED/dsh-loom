// Of the 5 failures that the loop could act on (a patch that passed verification
// but was rejected by the gate), what did the gate reject them for? This is the
// only class of failure where "improve the loop" has something to bite on.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const gates = []
const taskOf = new Map()
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'gate.evaluated') gates.push({ campaign: c, ...d })
  }
}

const rejected = gates.filter((g) => {
  const c = g.checks || {}
  return c.verifierOk === true && g.promoted === false
})
const byReason = {}
for (const g of rejected) {
  const c = g.checks || {}
  const reasons = []
  if (c.testsClean === false) reasons.push('tests-edited')
  if (c.hasPatch === false && c.noop !== true) reasons.push('no-patch')
  if (c.noop === true) reasons.push('noop')
  if (c.beatsIncumbent === false) reasons.push('no-gain')
  if (c.holdout === false) reasons.push('holdout-failed')
  const key = reasons.length ? reasons.join('+') : 'unknown'
  byReason[key] = (byReason[key] || 0) + 1
}

// The interesting subgroup: 0 < score < 1, i.e. graded, and rejected for gain.
const graded = gates.filter((g) => typeof g.score === 'number' && g.score > 0 && g.score < 1)
const gradedRejected = graded.filter((g) => g.promoted === false)

console.log(JSON.stringify({
  gates: gates.length,
  rejectedAfterVerify: rejected.length,
  byReason,
  gradedGates: graded.length,
  gradedRejected: gradedRejected.length,
  rejectedDetail: rejected.slice(0, 12).map((g) => ({
    campaign: g.campaign, round: g.round, score: g.score, checks: g.checks, reason: g.reason,
  })),
}, null, 2))
