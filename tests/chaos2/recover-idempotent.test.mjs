// Adversarial: a host that crashes *twice* must not stack duplicate repair
// events. Recovery is a reconciliation, so running it again on an already
// reconciled campaign has to be a no-op — otherwise every restart doubles the
// ledger and the "unlanded" history drifts from the truth it describes.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repo, campaignDir, writeEvents, ok, done } from '../chaos/fixture.mjs'
import { recoverCampaign } from '../../src/runtime/recovery.js'
import { reduce } from '../../src/core/reduce.js'

const ws = repo('loom-chaos2-idem-')
const dir = campaignDir()
const patch = join(dir, 'artifacts', 'r1a1.patch')
mkdirSync(join(dir, 'artifacts'), { recursive: true })
writeFileSync(
  patch,
  [
    'diff --git a/half.txt b/half.txt',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/half.txt',
    '@@ -0,0 +1 @@',
    '+half',
    '',
  ].join('\n'),
)
writeFileSync(join(ws, 'half.txt'), 'half\n')

const seed = [
  { seq: 1, type: 'campaign.created', data: { id: 'chaos', workspace: ws, objective: 'x' } },
  { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1' } },
  { seq: 3, type: 'attempt.finished', data: { attemptId: 'r1a1', round: 1, taskId: 't1', score: 1, verifierOk: true } },
  { seq: 4, type: 'artifact.promoted', data: { kind: 'attempt', attemptId: 'r1a1', round: 1, patch } },
  { seq: 5, type: 'autopilot.applied', data: { round: 1, patch, committed: false, commit: null } },
  { seq: 6, type: 'round.finished', data: { n: 1, status: 'promoted', promoted: true } },
]
writeEvents(dir, seed)

const collected = []
const append = (type, data) => {
  const ev = { type, data }
  collected.push(ev)
  return ev
}

const first = await recoverCampaign({ dir, events: seed, state: reduce(seed), workspace: ws, append, log: () => {} })
assert.deepEqual(first.unlanded, [1], 'first recovery withdraws the unproven landing')
assert.equal(first.workspace, 'restored', 'first recovery repairs the workspace')
assert.equal(collected.length > 0, true, 'first recovery writes events')
ok('first recovery withdraws the unproven landing')

const afterFirst = [...seed, ...collected]
const before = collected.length
const second = await recoverCampaign({ dir, events: afterFirst, state: reduce(afterFirst), workspace: ws, append, log: () => {} })
assert.deepEqual(second.unlanded, [], 'second recovery finds nothing left to withdraw')
assert.deepEqual(second.interruptedRounds, [], 'second recovery closes no round it already closed')
assert.equal(second.workspace, null, 'second recovery does not repair a clean workspace again')
assert.equal(collected.length, before, 'second recovery appends nothing at all')
ok('second recovery is a no-op')

const state = reduce(afterFirst)
assert.equal(state.rounds.length, 1, 'the round is folded once, not once per recovery')
assert.equal(state.rounds[0].landed, false, 'the withdrawn landing stays withdrawn')
ok('folded state stays consistent after two recoveries')

done()
