// A fallback that stays on the provider that just broke cannot escape it.
//
// The ledger says the chain has never once moved: `modelsTried.length > 1` appears
// 0 times in 420 attempts. Two reasons, and only one of them is fixed by having a
// chain at all. The first is that `models.fallback` defaulted to `[]`, so most
// campaigns had nowhere to go. The second is that equal-provider fallbacks are
// useless anyway when the provider is the thing that broke mid-turn -- the same
// failure that cost loom-acc2 eight consecutive rounds.
//
// So the default names a DIFFERENT provider, and the entry is written as
// `provider/model` because that slash is the only thing that moves the child off
// the host's provider. A campaign that names its own chain still replaces this
// entirely: the default is a floor, not an override.
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG, normalizeConfig } from '../../src/core/config.js'
import { modelChain, parseModelRef } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. The default chain has somewhere to go, and it is another provider.
{
  assert.deepEqual(DEFAULT_CONFIG.models.fallback, ['command-code/deepseek/deepseek-v4.1-flash'])
  const chain = modelChain(undefined, null, normalizeConfig({}))
  assert.equal(chain.length, 2, 'unset first entry plus one fallback')
  assert.equal(chain[0], null, 'the first entry stays null so the child inherits the host selection')
  const ref = parseModelRef(chain[1])
  assert.equal(ref.provider, 'command-code', 'the fallback names a provider, so it can actually move')
  assert.equal(ref.model, 'deepseek/deepseek-v4.1-flash', 'the model id keeps its own slash')
  ok('the default fallback lives on another provider')
}

// 2. An operator who wants no fallback can still have none.
{
  const chain = modelChain(undefined, null, normalizeConfig({ models: { fallback: [] } }))
  assert.deepEqual(chain, [null], 'an empty list is obeyed, not refilled from the default')
  ok('an explicit empty fallback is honoured')
}

// 3. A campaign's own chain replaces the default outright. Half-applying a
//    campaign chain and half the default would be an experiment that is not one.
{
  const campaign = ['open-design/deepseek-v4.1-flash', 'open-design/claude-haiku-5.5']
  const chain = modelChain(campaign, null, normalizeConfig({}))
  assert.deepEqual(chain, campaign, 'the campaign chain is what gets tried')
  ok('a campaign chain replaces the default')
}

// 4. A single-model campaign chain has no fallback invented for it either.
{
  const chain = modelChain(['open-design/deepseek-v4.1-flash'], null, normalizeConfig({}))
  assert.deepEqual(chain, ['open-design/deepseek-v4.1-flash'])
  ok('a one-entry chain stays one entry')
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
