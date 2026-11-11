// The one experiment the gate literature says nobody ran and we can run offline:
// does a live pass rate buy anything over a fixed K? Replay recorded attempts.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rounds = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const attempts = new Map()
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type !== 'attempt.finished') continue
    attempts.set(String(d.id), d)
  }
  const byRound = new Map()
  for (const [id, a] of attempts) {
    const r = Number(a.round)
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r).push({ id, ok: Boolean(a.verifierOk) })
  }
  for (const [r, rows] of byRound) rounds.push({ campaign: c, round: r, arms: rows })
}

// Policies, all evaluated on recorded outcomes so nothing needs re-running:
// fixed K (always run K arms) vs sequential (stop at first pass) vs
// "run the second only if the first failed".
const policyCost = { fixed1: 0, fixed2: 0, stopAtPass: 0 }
const policyYield = { fixed1: 0, fixed2: 0, stopAtPass: 0 }
let rounds2 = 0
for (const r of rounds) {
  const a1 = r.arms.find((x) => /a1$/.test(x.id))
  const a2 = r.arms.find((x) => /a2$/.test(x.id))
  if (!a1 || !a2) continue
  rounds2 += 1
  policyCost.fixed1 += 1
  policyYeld1: policyYield.fixed1 += a1.ok ? 1 : 0
  policyCost.fixed2 += 2
  policyYield.fixed2 += a1.ok || a2.ok ? 1 : 0
  // sequential: run a1; run a2 only if a1 failed
  const armsSeq = a1.ok ? 1 : 2
  policyCost.stopAtPass += armsSeq
  policyYield.stopAtPass += a1.ok || a2.ok ? 1 : 0
}

const per = (cost, yield_) => ({ arms: cost, successes: yield_, armsPerSuccess: yield_ ? +(cost / yield_).toFixed(3) : null })
const out = {
  rounds: rounds2,
  observed: {
    a1pass: rounds.filter((r) => r.arms.find((x) => /a1$/.test(x.id))?.ok).length,
    a2passGivenA1fail: null,
    a2passGivenA1pass: null,
    a2rescueOfA1fail: null,
  },
  policies: {
    fixed1: per(policyCost.fixed1, policyYield.fixed1),
    fixed2: per(policyCost.fixed2, policyYield.fixed2),
    stopAtPass: per(policyCost.stopAtPass, policyYield.stopAtPass),
  },
}
let a2WhenFail = 0, a1fail = 0, a2WhenPass = 0, a1pass = 0
for (const r of rounds) {
  const a1 = r.arms.find((x) => /a1$/.test(x.id))
  const a2 = r.arms.find((x) => /a2$/.test(x.id))
  if (!a1 || !a2) continue
  if (a1.ok) { a1pass += 1; if (a2.ok) a2WhenPass += 1 } else { a1fail += 1; if (a2.ok) a2WhenFail += 1 }
}
out.observed.a2passGivenA1fail = a1fail ? +(a2WhenFail / a1fail).toFixed(3) : null
out.observed.a2passGivenA1pass = a1pass ? +(a2WhenPass / a1pass).toFixed(3) : null
out.observed.a2rescueOfA1fail = a2WhenFail
console.log(JSON.stringify(out, null, 2))
