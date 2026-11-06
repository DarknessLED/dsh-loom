// Spec: promoting a loop policy must record what actually changed.
//
// `policy.promoted` today stores the new policy blob, so a reader has to diff
// it by hand against whatever was in force before to learn anything. The one
// question a human asks at this checkpoint — "what am I agreeing to change?" —
// has no answer in the ledger.
//
// Required: approving a `policy` checkpoint appends `policy.promoted` carrying
// `diff` (field -> {from, to}, only the fields that change) computed against
// the policy that was in force.
import { registerTools } from '../../src/tools/index.js'

let pass = 0
let fail = 0
function ok(cond, name, extra) {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
  } else {
    fail += 1
    console.log(`not ok ${pass + fail} - ${name}`)
    if (extra !== undefined) console.log('   ', extra)
  }
}

const state = {
  id: 'c1',
  status: 'running',
  objective: 'sharpen the gate',
  workspace: 'C:/w',
  rounds: [],
  budget: { usd: 5, rounds: 10, spentUsd: 0 },
  chain: { activeVersion: 1 },
  constraints: [],
  lessons: [],
  incumbent: null,
  policy: { status: 'active', version: 1, policy: { minGain: 0.05, candidates: 2, knowledge: true } },
  checkpoints: [
    {
      id: 'cp-policy',
      kind: 'policy',
      status: 'open',
      payload: { policyVersion: 2, policy: { minGain: 0.2, candidates: 2, knowledge: false } },
    },
  ],
}
const appended = []
const view = {
  state,
  dir: '.',
  ledger: { all: () => [], append: (type, data) => appended.push({ type, data }) },
}

const tools = new Map()
const ctx = {
  effect(fn) {
    fn()
    return () => {}
  },
  tools: { register(def) { tools.set(def.name, def); return () => {} } },
  get: () => undefined,
}

const runtime = {
  get: () => view,
  listCampaigns: () => ['c1'],
  status: () => state,
  ensureOwner: () => true,
  append: (v, type, data) => {
    appended.push({ type, data })
    return v.state
  },
}
registerTools(ctx, { runtime, config: {} })

await tools.get('rsi_decide').execute({ id: 'c1', checkpoint: 'cp-policy', decision: 'approve', note: 'tighter gate' })

const promoted = appended.find((e) => e.type === 'policy.promoted')
ok(Boolean(promoted), 'approving a policy checkpoint appends policy.promoted', JSON.stringify(appended.map((e) => e.type)))
ok(Boolean(promoted?.data?.diff), 'policy.promoted carries a diff', JSON.stringify(promoted?.data))

const diff = promoted?.data?.diff ?? {}
ok(diff.minGain?.to === 0.2, 'diff records the new minGain', JSON.stringify(diff.minGain))
ok(diff.minGain?.from === 0.05, 'diff records the previous minGain', JSON.stringify(diff.minGain))
ok(diff.knowledge?.to === false, 'diff records a disabled feature flag', JSON.stringify(diff.knowledge))
ok(!('candidates' in diff), 'unchanged fields stay out of the diff', JSON.stringify(diff))

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
