// Spec: the human report must be an audit surface for the knowledge tree.
//
// A lesson that is shown but never pays off is invisible today: the report only
// prints rounds. Anyone deciding whether to keep a campaign running needs the
// per-lesson record — how often it was shown, what it gained, what it cost.
//
// Required output: rsi_report includes a "lessons" section where every lesson
// listed carries its claim (truncated is fine), status, useCount, gainSum and
// harmCount.
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
  objective: 'raise coverage',
  workspace: 'C:/w',
  rounds: [{ n: 1, status: 'rejected', score: 0.2, attempts: [] }],
  budget: { usd: 5, rounds: 10, spentUsd: 0.5 },
  chain: { activeVersion: 1 },
  constraints: [],
  checkpoints: [],
  incumbent: null,
  lessons: [
    {
      id: 'lsn-a',
      claim: 'the coverage script must run with --runInBand or it flakes',
      status: 'active',
      kind: 'hazard',
      useCount: 3,
      gainSum: 0.12,
      harmCount: 0,
    },
    {
      id: 'lsn-b',
      claim: 'renaming a fixture breaks three importers',
      status: 'quarantined',
      kind: 'fact',
      useCount: 5,
      gainSum: -0.2,
      harmCount: 2,
    },
  ],
}
const view = { state, dir: '.', ledger: { all: () => [], append() {} } }

const tools = new Map()
const ctx = {
  effect(fn) {
    fn()
    return () => {}
  },
  tools: { register(def) { tools.set(def.name, def); return () => {} } },
  get: () => undefined,
}
registerTools(ctx, {
  runtime: { get: () => view, listCampaigns: () => ['c1'], status: () => state },
  config: {},
})

const report = await tools.get('rsi_report').execute({ id: 'c1' })
const text = typeof report === 'string' ? report : JSON.stringify(report)

ok(/lesson/i.test(text), 'report mentions lessons')
ok(text.includes('lsn-a'), 'report lists the active lesson id')
ok(/3/.test(text), 'report carries useCount for the shown lesson')
ok(/0\.12/.test(text), 'report carries gainSum')
ok(/harm/i.test(text), 'report carries a harm column or label')
ok(text.includes('quarantined'), 'report exposes lesson status')

const headerIdx = text.search(/lesson/i)
ok(headerIdx >= 0 && text.slice(headerIdx).includes('lsn-b'), 'the quarantined lesson appears in the lessons section')

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
