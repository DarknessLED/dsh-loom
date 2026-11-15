// Approval is one word with one meaning. The tool and the panel button both
// answer the same checkpoint, but they used to implement different effects: the
// button learned to adopt a chain and still ignored a policy card, so a person
// who clicked approve on a policy got an answer with no promotion.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyApprovalEffects } from '../../src/runtime/decision-effects.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function fake() {
  const events = []
  const runtime = { append(_view, type, data) { events.push({ type, data }) } }
  const view = {
    state: {
      id: 'p',
      status: 'running',
      policy: { policy: { minGain: 0.05 } },
      chain: { activeVersion: 1, versions: [{ version: 1, status: 'active' }] },
    },
  }
  return { runtime, view, events }
}

// A chain card names the version to activate; adopting it is the approval.
{
  const { runtime, view, events } = fake()
  const target = { id: 'cp1', kind: 'chain', payload: { chainVersion: 2, prediction: { point: 0.2 } } }
  const out = applyApprovalEffects({ runtime, view, target, config: {} })
  assert.equal(out.chain, 2, 'the chain version is reported')
  const activated = events.find((e) => e.type === 'chain.activated')
  assert.equal(activated?.data?.version, 2, 'the chain is activated')
  assert.equal(activated?.data?.prediction?.point, 0.2, 'the forecast travels with it')
  assert.equal(out.policy, false, 'a chain card promotes no policy')
  ok('approving a chain card activates it')
}

// A policy card carries a policy, not a version: the promotion must be recorded
// with the diff, exactly as the tool door records it.
{
  const { runtime, view, events } = fake()
  const target = { id: 'cp2', kind: 'policy', payload: { policyVersion: 3, policy: { minGain: 0.2 } } }
  const out = applyApprovalEffects({ runtime, view, target, config: {} })
  assert.equal(out.policy, true, 'the policy is promoted')
  const promoted = events.find((e) => e.type === 'policy.promoted')
  assert.equal(promoted?.data?.version, 3)
  assert.equal(promoted?.data?.policy?.minGain, 0.2)
  assert.ok(promoted?.data?.diff && typeof promoted.data.diff === 'object', 'the change is described')
  ok('approving a policy card promotes it with a diff')
}

// A revert card is the same decision in the other direction.
{
  const { runtime, view, events } = fake()
  const target = { id: 'cp3', kind: 'chain-revert', payload: { chainVersion: 1 } }
  const out = applyApprovalEffects({ runtime, view, target, config: {} })
  assert.equal(out.chain, 1, 'the revert activates the earlier version')
  assert.ok(events.some((e) => e.type === 'chain.activated' && e.data.version === 1))
  ok('approving a revert card restores the earlier chain')
}

// Both doors must route through the table, not re-implement it.
{
  const panel = readFileSync(join(process.cwd(), 'src', 'panel', 'api.js'), 'utf8')
  const tools = readFileSync(join(process.cwd(), 'src', 'tools', 'index.js'), 'utf8')
  assert.match(panel, /applyApprovalEffects/, 'the panel uses the shared table')
  assert.match(tools, /applyApprovalEffects/, 'the tool uses the shared table')
  assert.doesNotMatch(panel, /adoptFromCheckpoint/, 'the panel no longer keeps its own chain path')
  ok('the panel and the tool answer through one implementation')
}

console.log(`\n${pass}/${pass} passed`)
