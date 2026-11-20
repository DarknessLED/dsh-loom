// The brief had nothing to say about a command that runs longer than the tick.
//
// fin-oneyear1's five attempts each spent their final minutes inside one
// blocking sweep (`Scan futures gates`, `Run ETF parameter grid search`, …).
// The watchdog fix stops the runner from killing them for it, but the wall
// clock was never paused: an attempt that starts a fourteen-minute sweep at
// minute nine still ends with no report. The rule below is the part the agent
// can act on, and it has to appear only when a budget exists — a brief without
// a wall clock should not invent one.
import assert from 'node:assert/strict'

import { buildWorkerBrief } from '../../src/dispatch/brief.js'

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  try {
    assert.ok(cond, detail)
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name} :: ${err?.message ?? err}`)
  }
}

const base = {
  objective: 'Find a parameter set that clears the gate.',
  task: { id: 't1', prompt: 'Change params.json.', verify: { cmd: 'python score.py' } },
  workspace: { cwd: 'C:/tmp/ws', branch: 'loom/c/r1a1' },
}

const withBudget = buildWorkerBrief({ ...base, budgetMs: 13 * 60_000 })
const withoutBudget = buildWorkerBrief(base)

ok('a budgeted brief says to run long commands in the background', /background job/i.test(withBudget), withBudget.slice(0, 400))
ok('and it says why the foreground is dangerous', /wall clock keeps burning|goes quiet/i.test(withBudget))
ok('the advice keeps the existing budget rule', /wall clock, enforced by the runner/i.test(withBudget))
ok('a brief with no budget does not invent one', !/background job/i.test(withoutBudget), withoutBudget.slice(0, 400))
ok('the rules section still exists', withBudget.includes('## Rules'))

// The rule must not push a normal brief out of its byte budget: the assembler
// drops sections in priority order and would silently cut the task prompt.
const tight = buildWorkerBrief({ ...base, budgetMs: 13 * 60_000, maxChars: 2600 })
ok('a tight brief still fits its cap', tight.length <= 2600, `${tight.length} chars`)
ok('and still carries its task prompt', /Change params\.json/.test(tight) || /## Task/.test(tight))

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
