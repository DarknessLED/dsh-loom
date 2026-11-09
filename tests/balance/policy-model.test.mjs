// The loop kept dying for a reason nobody could act on: every child came back
// with "no diagnostic", so there was no way to see that the provider was gluing
// two tool-call JSON objects together (fixed in tests/lifecycle/silent-diagnosis).
// With the diagnosis in hand the next question is the obvious one — can this
// campaign run on a different model? — and today the answer is no: the model
// chain comes from `config.models`, which the host reads once at load, so trying
// another provider means editing the profile and restarting the app.
//
// That is exactly the constraint `campaign.policy` was built to remove for
// planMode. The same should hold for the model chain.
//
// Required:
//   - `policyFor({config, campaign})` also resolves `models`:
//       * `campaign.policy.models` overrides `config.models` for that campaign;
//       * the resolved shape is `{ worker, fallback }`, where `fallback` is an
//         ordered array of non-empty strings (possibly empty);
//       * `sources.models` says 'campaign' / 'config' / 'default';
//       * a non-string worker, or a fallback that is not an array of strings, is
//         rejected by name and falls back to the config, never applied partially.
//   - `runRound` passes the resolved chain to the dispatcher as `models`, so the
//     attempt actually runs on the campaign's models (an explicit single-element
//     array when the campaign named only a worker).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { policyFor, runRound } from '../../src/runtime/round.js'
import { baseConfig, baseState, campaignDir, fakeRuntime, repo } from '../chaos/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// ---------------------------------------------------------------------------
// 1. A campaign may name its own model chain
// ---------------------------------------------------------------------------
{
  const config = baseConfig({ models: { worker: 'w-cfg', fallback: ['f-cfg'] } })
  const campaign = { policy: { models: { worker: 'w-camp', fallback: ['f-1', 'f-2'] } } }
  const p = policyFor({ config, campaign })
  assert.ok(p.models, 'the resolved policy reports a model chain')
  assert.equal(p.models.worker, 'w-camp', 'the campaign worker wins over the config worker')
  assert.deepEqual(p.models.fallback, ['f-1', 'f-2'], 'and the campaign fallback is kept in order')
  assert.equal(p.sources.models, 'campaign', 'the source says where the chain came from')
  assert.deepEqual(p.rejected, [], 'a well-formed chain is not rejected')
}
ok('a campaign can name the model chain it runs on')

{
  const config = baseConfig({ models: { worker: 'w-cfg', fallback: ['f-cfg'] } })
  const p = policyFor({ config, campaign: {} })
  assert.equal(p.models.worker, 'w-cfg', 'without an override the config worker stands')
  assert.deepEqual(p.models.fallback, ['f-cfg'], 'and so does the config fallback')
  assert.equal(p.sources.models, 'config', 'and the source says so')
}
ok('without an override the config chain stands')

{
  const p = policyFor({ config: baseConfig({}), campaign: {} })
  assert.equal(p.models.worker, null, 'a config with no worker yields null, not a guess')
  assert.deepEqual(p.models.fallback, [], 'and an empty fallback list is an empty list, not undefined')
  assert.equal(p.sources.models, 'default', 'which is the default')
}
ok('a config with no models is reported as unfilled')

// ---------------------------------------------------------------------------
// 2. A half-broken chain is rejected whole, by name
// ---------------------------------------------------------------------------
{
  const config = baseConfig({ models: { worker: 'w-cfg', fallback: ['f-cfg'] } })
  const p = policyFor({ config, campaign: { policy: { models: { worker: 42, fallback: ['f-1'] } } } })
  assert.equal(p.models.worker, 'w-cfg', 'a non-string worker is not applied')
  assert.ok(p.rejected.includes('models.worker'), `the rejection names the field (${p.rejected.join(', ')})`)
}
ok('a non-string worker is rejected by name')

{
  const config = baseConfig({ models: { worker: 'w-cfg', fallback: ['f-cfg'] } })
  const p = policyFor({ config, campaign: { policy: { models: { worker: 'w-camp', fallback: 'f-1' } } } })
  assert.notEqual(p.models.worker, 'w-camp', 'a malformed chain is not applied partially')
  assert.ok(p.rejected.includes('models.fallback'), `the rejection names the field (${p.rejected.join(', ')})`)
}
ok('a malformed fallback rejects the whole chain instead of applying half of it')

// ---------------------------------------------------------------------------
// 3. The round actually runs on the campaign's chain
// ---------------------------------------------------------------------------
{
  const dir = repo('loom-model-chain-')
  const camp = campaignDir(dir)
  mkdirSync(camp, { recursive: true })
  const rt = fakeRuntime(camp, dir)
  const view = {
    dir: camp,
    state: baseState({
      workspace: dir,
      rounds: [],
      policy: { models: { worker: 'w-camp', fallback: ['f-1'] } },
      autopilot: { enabled: false, guard: null },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'work', verify: { cmd: 'exit 0' } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [
          {
            version: 1,
            spec: {
              name: 't',
              version: 1,
              params: { candidates: 1, minGain: 0 },
              nodes: [{ id: 'work', type: 'map' }, { id: 'worker', type: 'agent', role: 'worker', prompt: 'work' }],
            },
          },
        ],
      },
    }),
  }
  const seen = []
  const dispatcher = {
    run: async (_prompt, opts = {}) => {
      seen.push({ model: opts.model ?? null, models: opts.models ?? null })
      writeFileSync(join(dir, 'solved.txt'), 'x')
      return { sessionId: 'w', text: '', stopReason: 'completed', timedOut: false, error: null }
    },
  }
  const config = baseConfig({ models: { worker: 'w-cfg', fallback: ['f-cfg'] } })
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {} })
  assert.equal(seen.length, 1, 'exactly one candidate ran')
  assert.deepEqual(
    seen[0].models,
    ['w-camp', 'f-1'],
    'the dispatcher received the campaign chain, not the config one',
  )
  rmSync(dir, { recursive: true, force: true })
}
ok('the round hands the campaign chain to the dispatcher')

console.log(`\n${pass}/${pass} passed`)
