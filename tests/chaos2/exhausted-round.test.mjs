// Adversarial: when every model in the chain is out of budget, the loop must
// stop paying for the same wall. Burning round after round on an exhausted
// account looks like "the loop is working" in the UI while nothing can land, so
// exhaustion has to be named in the ledger and ask the operator for help.
import assert from 'node:assert/strict'
import { runRound } from '../../src/runtime/round.js'
import { repo, campaignDir, fakeRuntime, baseState, baseConfig, writeEvents, ok, done } from '../chaos/fixture.mjs'

const ws = repo('loom-chaos2-exhaust-')
const dir = campaignDir()
const task = { id: 't1', prompt: 'do the thing', verify: { cmd: 'exit 0' } }
writeEvents(dir, [{ seq: 1, type: 'campaign.created', data: { id: 'chaos', workspace: ws } }])

const view = {
  dir,
  state: baseState({
    workspace: ws,
    evalset: { tasks: [task], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
    },
  }),
}

const exhausted = async () => ({
  sessionId: 's1',
  text: '',
  structured: null,
  stopReason: 'max-tokens',
  timedOut: false,
  error: 'all models exhausted their token budget',
  failureKind: 'exhausted',
  model: 'model-b',
  modelsTried: ['model-a', 'model-b'],
})

const runtime = fakeRuntime(dir, ws)
const config = baseConfig()

let result = null
try {
  result = await runRound({
    runtime,
    view,
    config,
    dispatcher: { run: exhausted },
    log: () => {},
  })
} finally {
  /* nothing to clean up */
}

const appended = runtime.events.map((e) => e.type)
assert.equal(appended.includes('round.finished'), true, 'the round still closes')

const finished = runtime.events.find((e) => e.type === 'round.finished')
assert.equal(finished.data.status, 'exhausted', 'exhaustion is named, not disguised as no-gain')
assert.equal(finished.data.promoted, false, 'an exhausted round never promotes')

const attempt = view.state.rounds.at(-1)?.attempts?.[0] ?? null
assert.equal(attempt?.failureKind, 'exhausted', 'the attempt records why it could not run')
assert.deepEqual(attempt?.modelsTried, ['model-a', 'model-b'], 'the attempt records every model spent')
done(1, 'an exhausted round closes as exhausted and records the models spent')

const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised')
assert.equal(raised.length, 1, 'exhaustion raises exactly one checkpoint')
assert.equal(raised[0].data.kind, 'exhausted', 'the checkpoint names exhaustion as the reason')
done(2, 'exhaustion asks a human instead of looping silently')

assert.equal(result?.status, 'exhausted', 'the caller learns the round was exhausted')
done(3, 'the round result reports exhaustion')

done()
