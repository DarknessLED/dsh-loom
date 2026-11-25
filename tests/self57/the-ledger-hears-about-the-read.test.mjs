// The ledger has to hear about the read, or the queue is only a sort order.
//
// `questionFor` prefers the least-read question, but "least read" is only true
// if every read is written down. The leg spends a round's allowance and the
// round is the only thing that knows which campaign paid: if it does not record
// that, `reads` stays zero for every question and the leg goes back to serving
// the oldest entry to each new campaign — which is the bug this closes.
//
// Two events, deliberately separate, because they happen at different times:
//
//   * the spend, right after the leg returns (even if the round later dies), and
//   * the outcome, once the round knows whether the notes were used, which is
//     after the worker has written and the gate has read.
//
// The second must not bump the count: a read counts once, no matter how many
// things are later learned about it.
//
//   node tests/self57/the-ledger-hears-about-the-read.test.mjs
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { runRound } from '../../src/runtime/round.js'
import { addQuestion, researchQuestions } from '../../src/research/questions.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec, REPORT } from '../self22/fixture.mjs'

let pass = 0
let fail = 0
async function ok(name, fn) {
  try {
    await fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const QUESTION = 'does the cheap stage rank like the verifier on this corpus?'

function fixture({ promote = false } = {}) {
  const built = makeRuntime({
    repo: makeRepo(),
    tasks: [
      {
        id: 't1',
        prompt: 'write the fixed string into impl.txt',
        verify: { cmd: `"__NODE__" -e "process.exit(${promote ? 0 : 1})"` },
      },
    ],
    spec: chainSpec({ candidates: 1 }),
  })
  addQuestion(built.runtime.home, { question: QUESTION, closedBy: 'a measured ranking agreement', scope: 'T' })
  const config = baseConfig({
    loopPolicy: { planMode: 'off' },
    research: { enabled: true, depth: 'quick', timeoutMs: 5000, maxRounds: 9, maxQuestionAsks: 9 },
  })
  built.runtime.ctx = {
    web: {
      async search() {
        return { sources: [{ url: 'https://example.org/a', title: 'A', snippet: 'the verifier ranks like the cheap stage' }] }
      },
      async fetch() {
        return {
          statusCode: 200,
          body: { kind: 'text', content: 'On this corpus the cheap stage ranks like the verifier, so the screen is a discount and not a proxy.' },
        }
      },
    },
  }
  return { ...built, config }
}

await ok('the read is written against the question the leg asked', async () => {
  const { runtime, view, config } = fixture()
  const before = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(before.reads ?? 0, 0)
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher([], () => REPORT), log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(after.reads, 1, 'the leg bought a read and the ledger never heard of it')
  assert.equal(after.readBy?.length, 1, 'the campaign that paid should be named')
  assert.equal(after.status, 'open', 'a read is not a verdict')
})

await ok('a round that skipped the leg records nothing', async () => {
  const { runtime, view, config } = fixture()
  const off = { ...config, loopPolicy: { planMode: 'off', researchMode: 'off' } }
  await runRound({ runtime, view, config: off, dispatcher: fakeDispatcher([], () => REPORT), log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(after.reads ?? 0, 0, 'a round that did not read must not charge the question')
})

await ok('the outcome arrives later and does not count as a second read', async () => {
  const { runtime, view, config } = fixture({ promote: true })
  await runRound({ runtime, view, config, dispatcher: fakeDispatcher([], () => REPORT), log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(after.reads, 1, 'the outcome was recorded as another read')
  const outcome = (runtime.events || []).filter((e) => e.type === 'question.read')
  assert.equal(outcome.length, 1, 'the campaign should carry at most one read event per round')
  assert.equal(outcome[0].data.used !== undefined, true, 'the read event should say whether the notes were used')
})

await ok('the second campaign reads a different question', async () => {
  // The whole point: two campaigns, two questions, because the first read is on
  // the books by the time the second one looks.
  const dir = mkHome()
  addQuestion(dir, { question: QUESTION, closedBy: 'x', scope: 'T' })
  addQuestion(dir, { question: 'how do you tell a measured zero from an unmeasured round', closedBy: 'y', scope: 'T' })
  const first = researchQuestions(dir).filter((q) => q.status === 'open')
  assert.equal(first.length, 2)
  const { questionFor } = await import('../../src/runtime/research-leg.js')
  const { recordQuestionRead } = await import('../../src/research/questions.js')
  recordQuestionRead(dir, { id: first[0].id, campaign: 'c1', round: 1 })
  const asked = questionFor({
    task: { id: 't1', prompt: 'x' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [],
  })
  assert.equal(asked.id, first[1].id)
})

await ok('the spec is pinned in the standing list', () => {
  const list = readFileSync(new URL('../../scripts/test-all.mjs', import.meta.url), 'utf8')
  assert.match(list, /tests\/self57\/the-ledger-hears-about-the-read\.test\.mjs/)
})

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
function mkHome() {
  return mkdtempSync(join(tmpdir(), 'loom-ql-'))
}

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
