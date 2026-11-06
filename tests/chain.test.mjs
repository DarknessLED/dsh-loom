import { mutateChain, proposeMutations, MUTATION_KINDS } from '../src/chain/mutate.js'
import { chainEvidence, compareChains, coverage, byTask } from '../src/chain/evidence.js'
import { reduce } from '../src/core/reduce.js'
import { validateChainSpec } from '../src/chain/spec.js'

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

const BASE = {
  name: 'code-fix',
  version: 1,
  params: { candidates: 1 },
  nodes: [
    { id: 'attempts', type: 'map', of: { id: 'attempt', type: 'agent', prompt: 'fix it' } },
    { id: 'verify', type: 'verifier', cmd: 'node test.mjs' },
  ],
}

// ------------------------------------------------------------------ mutate
{
  const m = mutateChain(BASE, { kind: 'candidates+1', version: 2 })
  eq(m.spec.version, 2, 'mutate: version assigned')
  eq(m.spec.params.candidates, 2, 'mutate: one more candidate')
  eq(m.spec.meta.parent, 1, 'mutate: parent recorded')
  eq(BASE.params.candidates, 1, 'mutate: base spec untouched')
  eq(validateChainSpec(m.spec).length, 0, 'mutate: result is a valid chain')

  eq(mutateChain({ ...BASE, params: { candidates: 4 } }, { kind: 'candidates+1' }), null, 'mutate: no mutation past 4 candidates')
  eq(mutateChain(BASE, { kind: 'nope' }), null, 'mutate: unknown kind returns null')
  eq(mutateChain(null, { kind: 'candidates+1' }), null, 'mutate: no base returns null')

  const g = mutateChain(BASE, { kind: 'minimal-change', version: 3 })
  ok(g.spec.nodes[0].of.prompt.includes('root cause'), 'mutate: guidance appended to the map prompt')
  eq(BASE.nodes[0].of.prompt, 'fix it', 'mutate: guidance does not leak into the base')

  const all = proposeMutations(BASE, { fromVersion: 10, max: 3 })
  eq(all.length, 3, 'proposeMutations: respects the cap')
  eq(new Set(all.map((m) => m.spec.version)).size, 3, 'proposeMutations: distinct versions')
  eq(all[0].spec.version, 10, 'proposeMutations: numbering starts where told')
  ok(MUTATION_KINDS.length >= 4, 'proposeMutations: operator list is non-trivial')

  const noMap = { name: 'v', version: 1, nodes: [{ id: 'v', type: 'verifier', cmd: 'x' }] }
  eq(mutateChain(noMap, { kind: 'minimal-change' }), null, 'mutate: prompt guidance needs a map node')
}

// ---------------------------------------------------------------- evidence
{
  const rounds = [
    { n: 1, taskId: 't1', chainVersion: 1, attempts: [{ id: 'r1a1', score: 0.4, verifierOk: true }] },
    { n: 2, taskId: 't2', chainVersion: 1, attempts: [{ id: 'r2a1', score: 0.6, verifierOk: false }] },
    { n: 3, taskId: 't1', chainVersion: 2, attempts: [{ id: 'r3a1', score: 0.5, verifierOk: true }] },
    { n: 4, taskId: 't2', chainVersion: 2, attempts: [{ id: 'r4a1', score: 0.7, verifierOk: true }] },
    { n: 5, taskId: 't3', chainVersion: 2, attempts: [{ id: 'r5a1', score: 0.9, verifierOk: true, screenedOut: true }] },
  ]
  const rows = chainEvidence({ rounds })
  eq(rows.length, 4, 'evidence: one row per (version, task)')
  eq(byTask(rows, 1).get('t2').score, 0.6, 'evidence: unverified attempts still carry their score for pairing')
  eq(byTask(rows, 2).has('t3'), false, 'evidence: screened-out attempts never count')
  eq(coverage(rounds).find((c) => c.version === 2).tasks, 2, 'coverage: distinct tasks per version')

  const cmp = compareChains({ rounds, baseVersion: 1, candidateVersion: 2, minTasks: 2, minGain: 0.05, holdoutSlack: 0.02 })
  eq(cmp.pairedTasks, 2, 'compare: pairs on the same tasks only')
  near(cmp.delta, 0.1, 'compare: mean paired delta')
  eq(cmp.reason, 'promote', 'compare: enough paired tasks and enough gain')
  eq(cmp.ok, true, 'compare: ok when all three checks pass')

  eq(
    compareChains({ rounds, baseVersion: 1, candidateVersion: 2, minTasks: 6 }).reason,
    'not-enough-tasks',
    'compare: refuses on thin evidence',
  )

  const regression = [
    { n: 1, taskId: 't1', chainVersion: 1, attempts: [{ id: 'a', score: 0.9, verifierOk: true }] },
    { n: 2, taskId: 't1', chainVersion: 2, attempts: [{ id: 'b', score: 0.5, verifierOk: true }] },
  ]
  eq(
    // gain is checked before regression, so use a bar that the average clears
    compareChains({ rounds: regression, baseVersion: 1, candidateVersion: 2, minTasks: 1, minGain: -0.5, holdoutSlack: 0.02 }).reason,
    'regressed-a-task',
    'compare: a single big regression blocks the promotion',
  )

  eq(compareChains({ rounds: [], baseVersion: 1, candidateVersion: 2 }).reason, 'not-enough-tasks', 'compare: empty history is not a win')
}

// ----------------------------------------------------------------- reducer
{
  const s = reduce([
    { seq: 1, t: 'T', type: 'chain.proposed', actor: 'system', data: { version: 2, spec: { name: 'x', version: 2, nodes: [] } } },
    { seq: 2, t: 'T', type: 'round.started', actor: 'system', data: { n: 1, taskId: 't1', chainVersion: 2 } },
    { seq: 3, t: 'T', type: 'attempt.finished', actor: 'system', data: { id: 'r1a1', round: 1, score: 0.5, verifierOk: true } },
    { seq: 4, t: 'T', type: 'artifact.promoted', actor: 'system', data: { kind: 'attempt', round: 1, score: 0.5 } },
    { seq: 5, t: 'T', type: 'artifact.promoted', actor: 'system', data: { kind: 'chain', version: 2, score: 0.55 } },
  ])
  eq(s.rounds[0].chainVersion, 2, 'reduce: rounds remember which chain produced them')
  eq(s.rounds[0].taskId, 't1', 'reduce: rounds remember the task')
  eq(s.chain.incumbentVersion, 2, 'reduce: chain incumbent recorded separately')
  near(s.incumbent.score, 0.5, 'reduce: chain promotion does not erase the attempt incumbent')
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
