// loom-ab ran with `planMode:'off'` recorded in its own log, and the dashboard still
// printed `policy: default` for it. A knob you cannot see is a knob you will forget
// you turned: the panel and the dashboard must show the *loop policy actually in
// force for that campaign*, and where each value came from.
import assert from 'node:assert/strict'

import { registerPanel } from '../../src/panel/api.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const config = {
  loopPolicy: { planMode: 'full', candidateMode: 'parallel', secondCandidate: 'auto', halving: true },
}

const campaign = {
  id: 'loom-vis',
  status: 'running',
  objective: 'show the knob',
  policy: { planMode: 'off', minGain: 0.2 },
  budget: { usd: 5, rounds: 10, spentUsd: 0, roundsUsed: 1, minutes: 60 },
  rounds: [],
  evalset: { tasks: [{ id: 't1' }], holdout: [] },
  lessons: [],
}

const runtime = {
  listCampaigns: () => [campaign.id],
  get: () => ({ id: campaign.id, state: campaign }),
  liveAttempts: () => [],
  ownership: () => ({ mine: true }),
  leanProbe: () => ({ available: true }),
  switchState: () => ({ enabled: true, by: 'config', at: null }),
  enabled: () => true,
  briefForPrompt: () => '',
  config,
}

const routes = new Map()
const webServer = {
  register(route) {
    routes.set(route.path, route)
  },
}

const ctx = {
  get: (name) => (name === 'webServer' ? webServer : undefined),
  effect: (fn) => {
    fn()
  },
  on: () => {},
  logger: () => ({ debug() {}, info() {}, warn() {} }),
}

registerPanel(ctx, { runtime, config })
const route = [...routes.values()].find((r) => String(r.path).includes('/dsh-loom/state'))
assert.ok(route, 'the panel route is registered')

let out = ''
const res = {
  writeHead() {},
  setHeader() {},
  end(chunk) {
    out += chunk ? String(chunk) : ''
  },
}
await route.handler({ method: 'GET' }, res)
const body = JSON.parse(out)
const row = (body.campaigns || []).find((c) => c.id === campaign.id)
assert.ok(row, 'the campaign is in the payload')
assert.ok(!row.error, `the row did not degrade: ${row.error}`)

// The loop policy in force, merged from config and the campaign's own overrides.
assert.ok(row.loop, 'the row reports the loop policy in force')
assert.equal(row.loop.planMode, 'off', 'the campaign override is what runs')
assert.equal(row.loop.candidateMode, 'parallel', 'unset keys fall back to config')
assert.equal(row.loop.minGain, 0.2, 'the override is visible too')
assert.equal(row.loop.sources.planMode, 'campaign', 'and the row says where planMode came from')
assert.equal(row.loop.sources.candidateMode, 'config', 'and where the rest came from')
ok('the panel shows the loop policy in force and its source')
console.log(`\n${pass}/${pass} passed`)
