// What does the SECOND candidate actually buy, and why does it win?
// Distinguishes "a2 won because a1 errored" (insurance) from
// "a2 won because a1 produced a worse patch" (diversity).
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rows = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const attempts = new Map()
  const promoted = new Set()
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.finished') attempts.set(String(d.id), d)
    if (e.type === 'gate.evaluated' && d.promoted && d.candidateId) promoted.add(String(d.candidateId))
  }
  const rounds = new Map()
  for (const [id, a] of attempts) {
    const r = Number(a.round)
    if (!rounds.has(r)) rounds.set(r, [])
    rounds.get(r).push(id)
  }
  for (const [r, ids] of rounds) {
    const a1 = ids.find((i) => /a1$/.test(i))
    const a2 = ids.find((i) => /a2$/.test(i))
    if (!a1 || !a2) continue
    const A = attempts.get(a1), B = attempts.get(a2)
    const hasPatch = (x) => (x?.diff?.files ?? 0) > 0
    rows.push({
      campaign: c, round: r,
      a1Ok: Boolean(A?.verifierOk), a2Ok: Boolean(B?.verifierOk),
      a1Err: Boolean(A?.error), a2Err: Boolean(B?.error),
      a1Patch: hasPatch(A), a2Patch: hasPatch(B),
      a1Won: promoted.has(a1), a2Won: promoted.has(a2),
    })
  }
}

const both = rows
const a2Wins = both.filter((x) => x.a2Won && !x.a1Won)
const a2WinsBecauseA1Errored = a2Wins.filter((x) => x.a1Err)
const a2WinsBecauseA1TriedAndFailed = a2Wins.filter((x) => !x.a1Err && !x.a1Ok)
const a2WinsBecauseA1PassedButLost = a2Wins.filter((x) => x.a1Ok) // should be 0 given the tie-break
const a1Wins = both.filter((x) => x.a1Won && !x.a2Won)
const neither = both.filter((x) => !x.a1Won && !x.a2Won)

const count = (list, f) => list.filter(f).length
console.log(JSON.stringify({
  roundsWithTwoArms: both.length,
  a1Won: a1Wins.length,
  a2Won: a2Wins.length,
  neitherWon: neither.length,
  a2WinBreakdown: {
    a1Errored: a2WinsBecauseA1Errored.length,
    a1TriedAndFailed: a2WinsBecauseA1TriedAndFailed.length,
    a1PassedButLostTie: a2WinsBecauseA1PassedButLost.length,
  },
  roundsA1PassedAndA2Passed: count(both, (x) => x.a1Ok && x.a2Ok),
  disagreements: {
    a1OkA2Not: count(both, (x) => x.a1Ok && !x.a2Ok),
    a2OkA1Not: count(both, (x) => x.a2Ok && !x.a1Ok),
    bothFail: count(both, (x) => !x.a1Ok && !x.a2Ok),
  },
  a2PromotionsThatA1CouldNotHaveDelivered: a2WinsBecauseA1Errored.length + a2WinsBecauseA1TriedAndFailed.length,
  inferredIfSingleArm: {
    promotions: a1Wins.length + (neither.length ? 0 : 0),
    note: 'a1-only would lose exactly the rounds where a2 won and a1 did not',
  },
}, null, 2))
