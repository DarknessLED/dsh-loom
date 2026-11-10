// A planner that does not know its budget spends all of it.
//
// The ledger says so: 132 planned rounds, 85 of them (64%) came back with no
// text at all, and they still burned 24% of the wall clock. The session log of
// one such planner (loom-ui8 round 1) shows it was not idle — it made 24 tool
// calls, reading specs, grepping the client, running the suite — and then the
// deadline killed it mid-investigation before it wrote a single finding. Nothing
// in the brief it received mentioned that a clock was running.
//
// Rule: a dispatched node's brief states the wall-clock budget it is working
// under, in the same number the dispatcher will enforce, and says what to do when
// time runs short (report what is known rather than keep digging).

import assert from 'node:assert/strict'
import { buildWorkerBrief } from '../../src/dispatch/brief.js'

let pass = 0
let fail = 0
function ok(name, cond = true, detail) {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

const base = {
  objective: 'make the sidebar card answer who is blocking',
  task: { id: 'head-dot:recon', prompt: 'inspect the repository and report' },
  chain: { name: 'code-fix', version: 1 },
  constraints: ['reconnaissance only'],
  plan: [],
  reportGuide: 'report',
  workspace: { branch: 'loom/x/recon', cwd: 'C:/tmp/wt' },
}

// 1. The budget reaches the brief, in seconds a model can reason about.
{
  const brief = buildWorkerBrief({ ...base, budgetMs: 180_000 })
  assert.match(brief, /180 s|3 minutes|180 seconds/, 'the brief names the budget')
  ok('the brief states the wall-clock budget')
}

// 2. A round budget is stated as a deadline instruction, not a bare number:
//    "you have 180 s" without "report what you know when it runs out" is exactly
//    the planner that spent all 180 s reading.
{
  const brief = buildWorkerBrief({ ...base, budgetMs: 180_000 })
  assert.match(brief, /report|summari[sz]e|findings/i, 'it says what to do with the time')
  assert.match(brief, /before|when|if .* (run|short)/i, 'and when to stop investigating')
  ok('the budget comes with an instruction about running out')
}

// 3. No budget stated, no line invented: a brief that fabricates "0 s" would be
//    worse than silence.
{
  const brief = buildWorkerBrief(base)
  assert.doesNotMatch(brief, /\b0 s\b|NaN|undefined/, 'no fabricated budget')
  ok('a brief without a budget stays silent about time')
}

// 4. Sub-minute budgets still read as time, not as "0 s".
{
  const brief = buildWorkerBrief({ ...base, budgetMs: 45_000 })
  assert.match(brief, /45 s|45 seconds/, 'a short budget is still named')
  ok('a sub-minute budget is named, not rounded to nothing')
}

// 5. A bogus budget is ignored, not rendered.
{
  for (const bad of [null, undefined, -1, 0, 'abc', Number.NaN, Infinity]) {
    const brief = buildWorkerBrief({ ...base, budgetMs: bad })
    assert.doesNotMatch(brief, /NaN|Infinity|undefined s/, `budget ${String(bad)} must not leak`)
  }
  ok('a bogus budget is ignored')
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
