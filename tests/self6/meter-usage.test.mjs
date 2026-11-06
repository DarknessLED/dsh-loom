// Cost accounting is only real if it sees the tokens the child sessions burned.
// Child session logs carry no `usage` on assistant messages (checked against real
// archives), so the loop must ask the host's token meter when one is available,
// and must keep returning zeros when it is not.
import assert from 'node:assert/strict'
import { usageOfSession } from '../../src/runtime/cost.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const session = { snapshotEvents: () => [{ type: 'assistant/message', data: { message: { role: 'assistant' } } }] }

function ctxWith(services) {
  return {
    get(name) {
      return services[name] ?? undefined
    },
  }
}

const MEASURED = { inputTokens: 1200, outputTokens: 300, cacheReadTokens: 100, cacheWriteTokens: 0 }

// 1. when the session log has no usage but the host can measure, the measurement wins
{
  const ctx = ctxWith({ sessions: { get: () => session }, tokenMeter: { measure: () => MEASURED } })
  const res = usageOfSession(ctx, 's1', { inputPerMTok: 1, outputPerMTok: 2, cacheReadPerMTok: 0.5 })
  assert.equal(res.usage.inputTokens, 1200, 'input tokens come from the meter')
  assert.equal(res.usage.outputTokens, 300, 'output tokens come from the meter')
  assert.equal(res.usd > 0, true, 'a measured session costs something')
  ok('usageOfSession falls back to the host token meter')
}

// 2. a meter that throws must not break the round, and must not invent numbers
{
  const ctx = ctxWith({
    sessions: { get: () => session },
    tokenMeter: {
      measure() {
        throw new Error('meter exploded')
      },
    },
  })
  const res = usageOfSession(ctx, 's1', {})
  assert.equal(res.usage.inputTokens, 0)
  assert.equal(res.usd, 0)
  ok('a broken meter degrades to zero instead of failing the round')
}

// 3. no meter, no usage in the log -> zeros (the honest answer)
{
  const ctx = ctxWith({ sessions: { get: () => session } })
  const res = usageOfSession(ctx, 's1', { inputPerMTok: 1 })
  assert.equal(res.usage.inputTokens, 0)
  assert.equal(res.usd, 0)
  ok('without a meter the accounting stays zero rather than guessing')
}

console.log(`\n${pass}/${pass} passed`)
