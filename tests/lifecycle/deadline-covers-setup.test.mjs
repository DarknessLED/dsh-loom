// A deadline that starts after the expensive part is not a deadline.
//
// Measured over the ledger: the planner has a three-minute ceiling, yet 48 of 161
// planning nodes ran past it and the longest took 510 s -- 8.5 minutes against a
// 4-minute cap. Nobody set it wrong. The clock in `#one()` started after the
// child existed, so everything spent building it (resolving the parent session,
// starting the activation, waking the provider) was free: the planner then got
// its whole ceiling on top.
//
// The child's deadline is the time the caller asked for, counted from when the
// caller asked. Setup comes out of that budget, not out of the next one.
import assert from 'node:assert/strict'
import { Dispatcher } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// The dispatcher's own deadline timer is unref'd, so a test awaiting only that
// promise would let the process exit mid-await.
const keepAlive = setInterval(() => {}, 1000)

/** A host whose activation takes `setupMs` to exist and whose child never answers. */
function slowHost(setupMs) {
  const ctx = {
    get(name) {
      if (name === 'subagents') {
        return {
          startActivation: async () => {
            await sleep(setupMs)
            return { childId: 'child-1', result: new Promise(() => {}), dispose() {} }
          },
          interrupt() {},
        }
      }
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'p', model: 'm' }) }
      if (name === 'sessionController') return { resolveAgent: async () => ({ agent: {} }) }
      return undefined
    },
  }
  return ctx
}

// 1. Setup time is inside the budget, not in front of it.
{
  const dispatcher = new Dispatcher({ ctx: slowHost(900), config: { session: {} }, log: () => {} })
  dispatcher.bindTo('parent')
  const startedAt = Date.now()
  const res = await dispatcher.run('do the thing', { cwd: process.cwd(), timeoutMs: 1500, label: 'test' })
  const elapsed = Date.now() - startedAt
  assert.equal(res.timedOut, true, 'the child that never answered was timed out')
  // 900 ms of setup + 1500 ms of child would be 2400 ms. The budget covers both,
  // with the same 1 s floor the timer already applies.
  assert.ok(elapsed < 2100, `the deadline covered setup too (took ${elapsed} ms)`)
  ok('a deadline counts from the call, not from when the child appeared')
}

// 2. A host that hands the child back immediately keeps the whole budget.
{
  const dispatcher = new Dispatcher({ ctx: slowHost(0), config: { session: {} }, log: () => {} })
  dispatcher.bindTo('parent')
  const startedAt = Date.now()
  const res = await dispatcher.run('do the thing', { cwd: process.cwd(), timeoutMs: 1200, label: 'test' })
  const elapsed = Date.now() - startedAt
  assert.equal(res.timedOut, true)
  assert.ok(elapsed >= 1100, `an instant setup still gets the full budget (took ${elapsed} ms)`)
  ok('a fast setup does not shorten the budget')
}

clearInterval(keepAlive)
console.log(`\n${pass}/2 passed`)
assert.equal(pass, 2)
