// Spec: the report must show the round history, not just the last round.
//
// A campaign that ran 20 rounds and settled is impossible to audit from a
// one-line summary: the human needs to see which round ran which task, what it
// scored, and whether the gate promoted it. Without that, "best score 1" can
// hide nine wasted rounds.
//
// Required: rsi_report prints one line per finished round carrying the round
// number, the task id, the score and whether it was promoted.
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
  rounds: [
    { n: 1, taskId: 'alpha', status: 'promoted', score: 0.4, attempts: [] },
    { n: 2, taskId: 'beta', status: 'no-gain', score: 0.4, attempts: [] },
    { n: 3, taskId: 'alpha', status: 'promoted', score: 0.9, attempts: [] },
  ],
  budget: { usd: 5, rounds: 10, spentUsd: 0 },
  chain: { activeVersion: 1 },
  constraints: [],
  checkpoints: [],
  incumbent: null,
  lessons: [],
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

ok(/round/i.test(text), 'report mentions rounds', text.slice(0, 500))
ok(text.includes('alpha'), 'report shows the task id of a round')
ok(text.includes('beta'), 'report shows every task that ran, not just the last')
ok(/0\.9/.test(text), 'report carries the round score', text.slice(0, 500))
ok(/promoted/i.test(text), 'report distinguishes a promoted round')
ok(/no-gain/i.test(text), 'report distinguishes a round the gate refused')

// The history must be a table-like block of one line per round, not prose:
// three rounds in, there should be at least three lines mentioning a task id.
const lines = text.split('\n').filter((line) => /alpha|beta/.test(line))
ok(lines.length >= 3, 'one line per round in the history', `${lines.length} line(s)`)

if (fail > 0) process.exitCode = 1
console.log(`\n${pass}/${pass + fail} passed`)
