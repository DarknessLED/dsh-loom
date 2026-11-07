// Adversarial: a campaign created without a workspace cannot run a single
// round, and the loop re-raised the same "campaign has no workspace" checkpoint
// on every tick. Eight identical open checkpoints in four minutes is not eight
// problems; it is one problem shouting, and it buries the ones a human can act
// on. The rule: while the same setup problem is still open, say it once.
//
// This spec folds the ledger the way the runtime does (append → reduce), because
// the rule being tested is a property of the *materialized* state: the next tick
// has to be able to see the checkpoint the last tick raised.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { runRound } from '../../src/runtime/round.js'
import { Ledger } from '../../src/core/ledger.js'
import { reduce } from '../../src/core/reduce.js'
import { repo, campaignDir, fakeRuntime, baseConfig, ok, done } from '../chaos/fixture.mjs'

const ws = repo('loom-setup-')
const dir = campaignDir()
const task = { id: 't1', prompt: 'do the thing', verify: { cmd: 'exit 0' } }

const ledger = new Ledger(join(dir, 'events.jsonl'))
ledger.append('campaign.created', { id: 'setup', workspace: null })
ledger.append('evalset.registered', { tasks: [task], holdout: [] })
ledger.append('chain.proposed', { version: 1, spec: { name: 't', version: 1, nodes: [], params: { candidates: 1 } } })
ledger.append('chain.activated', { version: 1 })

const view = { id: 'setup', dir, ledger, state: reduce(ledger.all(), 'setup') }
assert.equal(view.state.workspace, null, 'the fixture really is workspace-less')

const events = []
const runtime = Object.assign(fakeRuntime(dir, null), {
  append(v, type, data, actor = 'system') {
    v.ledger.append(type, data, actor)
    v.state = reduce(v.ledger.all(), v.id)
    events.push({ type, data })
    return v.state
  },
})

const config = baseConfig()
const dispatcher = {
  run: async () => {
    throw new Error('a campaign without a workspace must not dispatch anything')
  },
}
const tick = () => runRound({ runtime, view, config, dispatcher, log: () => {} })

// Three ticks: the operator has not answered yet. That is one problem, not three.
await tick()
await tick()
await tick()

const raised = () => events.filter((e) => e.type === 'checkpoint.raised')
assert.equal(raised().length, 1, 'the same setup problem is raised once, not once per tick')
assert.equal(raised()[0].data.kind, 'setup', 'it is a setup problem, not an anomaly')
assert.equal(view.state.checkpoints.filter((c) => c.status === 'open').length, 1, 'the ledger shows one open question')
ok('an unanswered setup problem is not repeated on every tick')

assert.equal(events.filter((e) => e.type === 'round.started').length, 0, 'a workspace-less campaign never starts a round')
ok('nothing is dispatched while the workspace is missing')

// Once a human answers it, the problem has changed — it is still unfixed, but it
// is no longer unheard — so a fresh tick may ask again, exactly once.
const open = view.state.checkpoints.find((c) => c.status === 'open')
ledger.append('checkpoint.answered', { id: open.id, answer: 'continue', note: 'no workspace yet' }, 'human')
view.state = reduce(ledger.all(), 'setup')
await tick()
await tick()
assert.equal(raised().length, 2, 'after the answer the loop may ask once more — and only once')
ok('answering a setup checkpoint re-arms it exactly once')

done()
