import { normalizePolicy, effectivePolicy, diffPolicy, POLICY_DEFAULTS } from '../src/loop/policy.js'
import { replayRounds, comparePolicies } from '../src/loop/replay.js'
import { reduce } from '../src/core/reduce.js'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
const eq = (a, b, name) => ok(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${name} (got ${JSON.stringify(a)})`)
const near = (a, b, name) => ok(Math.abs(a - b) < 1e-9, `${name} (got ${a} want ${b})`)

// ------------------------------------------------------------------ policy
{
  const p = normalizePolicy({})
  eq(p.minGain, POLICY_DEFAULTS.minGain, 'normalizePolicy: defaults minGain')
  eq(p.candidates, null, 'normalizePolicy: candidates defaults to the chain')
  eq(p.knowledge, true, 'normalizePolicy: knowledge on by default')

  eq(normalizePolicy({ minGain: 5 }).minGain, 1, 'normalizePolicy: clamps minGain above 1')
  eq(normalizePolicy({ minGain: -2 }).minGain, 0, 'normalizePolicy: clamps minGain below 0')
  eq(normalizePolicy({ minGain: 'nope' }).minGain, POLICY_DEFAULTS.minGain, 'normalizePolicy: NaN falls back')
  eq(normalizePolicy({ candidates: 9 }).candidates, 4, 'normalizePolicy: candidates capped at 4')
  eq(normalizePolicy({ candidates: 0 }).candidates, 1, 'normalizePolicy: candidates floored at 1')
  eq(normalizePolicy({ candidates: 2.6 }).candidates, 3, 'normalizePolicy: candidates rounded')
  eq(normalizePolicy({ candidates: null }).candidates, null, 'normalizePolicy: explicit null keeps the chain value')
}

{
  const config = { gate: { minGain: 0.2, holdoutSlack: 0.1 }, knowledge: { enabled: false }, halving: { enabled: false } }
  const fromConfig = effectivePolicy({ state: {}, config })
  near(fromConfig.minGain, 0.2, 'effectivePolicy: reads config.gate.minGain')
  eq(fromConfig.knowledge, false, 'effectivePolicy: reads config.knowledge.enabled')
  eq(fromConfig.halving, false, 'effectivePolicy: reads config.halving.enabled')

  const promoted = effectivePolicy({ state: { policy: { status: 'promoted', policy: { minGain: 0.01 } } }, config })
  near(promoted.minGain, 0.01, 'effectivePolicy: promoted policy wins over config')
  eq(promoted.knowledge, false, 'effectivePolicy: unset promoted fields fall back to config')

  const d = diffPolicy({ minGain: 0.2, candidates: null }, { minGain: 0.01, candidates: 2 })
  eq(Object.keys(d).sort().join(','), 'candidates,minGain', 'diffPolicy: reports changed fields only')
  eq(d.minGain.to, 0.01, 'diffPolicy: records the new value')
}

// ------------------------------------------------------------------ replay
const round = (n, attempts) => ({ n, attempts })

{
  const rounds = [
    round(1, [{ id: 'r1a1', score: 0.4, verifierOk: true }]),
    round(2, [{ id: 'r2a1', score: 0.42, verifierOk: true }]),
    round(3, [{ id: 'r3a1', score: 0.6, verifierOk: true }]),
  ]
  const r = replayRounds({ rounds, policy: { minGain: 0.05 } })
  eq(r.decisions.length, 3, 'replay: one decision per round')
  eq(r.decisions[0].promote, true, 'replay: the first verified attempt sets the baseline')
  near(r.decisions[0].delta, 0.4, 'replay: the first delta is the score itself')
  eq(r.decisions[1].promote, false, 'replay: a 0.02 gain misses a 0.05 bar')
  eq(r.decisions[1].reason, 'gain-too-small', 'replay: rejection reason recorded')
  eq(r.decisions[2].promote, true, 'replay: a 0.18 gain clears the bar')
  eq(r.metrics.promotions, 2, 'replay: counts promotions')
  near(r.metrics.finalScore, 0.6, 'replay: final score is the last promoted score')
}

{
  // Same rounds, looser bar: the middle round now counts too.
  const rounds = [
    round(1, [{ id: 'a', score: 0.4, verifierOk: true }]),
    round(2, [{ id: 'b', score: 0.42, verifierOk: true }]),
  ]
  const tight = replayRounds({ rounds, policy: { minGain: 0.05 } })
  const loose = replayRounds({ rounds, policy: { minGain: 0.01 } })
  eq(tight.metrics.promotions, 1, 'replay: strict policy promotes once')
  eq(loose.metrics.promotions, 2, 'replay: loose policy promotes twice')

  const cmp = comparePolicies({ rounds, base: { minGain: 0.05 }, candidate: { minGain: 0.01 } })
  eq(cmp.verdict, 'candidate-better', 'comparePolicies: higher final score wins')
  eq(cmp.delta.promotions, 1, 'comparePolicies: promotion delta reported')
}

{
  const rounds = [round(1, [{ id: 'a', score: 0.9, verifierOk: false }])]
  const r = replayRounds({ rounds, policy: {} })
  eq(r.decisions[0].promote, false, 'replay: an unverified attempt never promotes')
  eq(r.decisions[0].reason, 'verifier-failed', 'replay: verifier failure reason')
  near(r.metrics.finalScore, 0, 'replay: no incumbent means zero final score')
}

{
  // With candidate budget 1 only the first attempt exists, so the best recorded
  // attempt cannot be used — this is the honest meaning of "fewer candidates".
  const rounds = [
    round(1, [
      { id: 'a1', score: 0.5, verifierOk: true },
      { id: 'a2', score: 0.9, verifierOk: true },
    ]),
  ]
  eq(replayRounds({ rounds, policy: { candidates: 1 } }).metrics.finalScore, 0.5, 'replay: candidate budget hides later attempts')
  eq(replayRounds({ rounds, policy: { candidates: 4 } }).metrics.finalScore, 0.9, 'replay: enough budget sees the best attempt')
}

{
  const r = replayRounds({ rounds: [], policy: {} })
  eq(r.metrics.rounds, 0, 'replay: empty history is not an error')
  eq(r.metrics.finalScore, 0, 'replay: empty history has no score')
  eq(comparePolicies({ rounds: [], base: {}, candidate: { minGain: 0.1 } }).verdict, 'no-evidence', 'comparePolicies: no evidence without rounds')
  eq(comparePolicies({ rounds: [round(1, [{ id: 'a', score: 0.3, verifierOk: true }])], base: {}, candidate: {} }).verdict, 'no-difference', 'comparePolicies: identical policies tie')
}

{
  const rounds = [
    round(1, [{ id: 'a', score: 0.8, verifierOk: true }]),
    round(2, [{ id: 'b', score: 0.85, verifierOk: true }]),
  ]
  // base promotes the +0.05 round, the stricter 0.1 bar would not, so the
  // stricter policy ends lower on the same history.
  const cmp = comparePolicies({ rounds, base: { minGain: 0.05 }, candidate: { minGain: 0.1 } })
  eq(cmp.verdict, 'candidate-worse', 'comparePolicies: a regression is called out')
}

// --------------------------------------------------------------- reducer
{
  const s = reduce([
    { seq: 1, t: 'T', type: 'policy.proposed', actor: 'system', data: { version: 2, policy: { minGain: 0.01 }, evidence: { verdict: 'candidate-better' } } },
  ])
  eq(s.policy.status, 'proposed', 'reduce: policy proposal recorded')
  eq(s.policy.version, 2, 'reduce: policy version kept')
  eq(s.policy.policy.minGain, 0.01, 'reduce: proposed policy body kept')

  const s2 = reduce([
    { seq: 1, t: 'T', type: 'policy.proposed', actor: 'system', data: { version: 2, policy: { minGain: 0.01 } } },
    { seq: 2, t: 'T2', type: 'policy.promoted', actor: 'human', data: { version: 2 } },
  ])
  eq(s2.policy.status, 'promoted', 'reduce: promotion flips the status')
  eq(s2.policy.policy.minGain, 0.01, 'reduce: promotion keeps the proposed body')
  eq(s2.policy.by, 'human', 'reduce: promotion records who approved it')
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
