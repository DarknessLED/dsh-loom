// The reflection has to reach the ledger, and the round has to say it did.
//
// `reflectOnQuestions` is the decision; this pins the wiring, because every
// "we built it" claim in this repository that skipped this step turned out to be
// a function nothing called — `verify.owns` for a day, `halvingPlan` for a
// release, `research.used` until a live round proved it.
//
// Two facts a reader of the campaign must be able to check afterwards:
//
//   * the question ledger moved (a `parked` record for the question the round
//     read), and
//   * the campaign recorded it (`question.parked`), naming the question id and
//     the reason, rather than only mutating a file outside the campaign.
//
//   node tests/self57/the-round-parks-a-question-it-cannot-use.test.mjs
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'

import { runRound } from '../../src/runtime/round.js'
import { researchQuestions, addQuestion } from '../../src/research/questions.js'
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

function fixture() {
  const repo = makeRepo()
  const built = makeRuntime({ repo, tasks: [{ id: 't1', prompt: 'make the cheap stage rank like the verifier, then write fixed into impl.txt', verify: { cmd: '"__NODE__" -e "process.exit(1)"' } }], spec: chainSpec({ candidates: 1 }) })
  // A home with one open question on it: the round will read it, fail, and the
  // bar for parking is one read.
  addQuestion(built.runtime.home, { question: QUESTION, closedBy: 'a measured ranking agreement', scope: 'T' })
  const config = baseConfig({ loopPolicy: { planMode: 'off' }, research: { enabled: true, depth: 'quick', timeoutMs: 5000, maxRounds: 5, maxQuestionAsks: 1 } })
  const web = { asked: [], async search({ query }) { this.asked.push(query); return { sources: [] } }, async fetch() { return { statusCode: 404, body: { kind: 'text', content: '' } } } }
  built.runtime.ctx = { web }
  const record = []
  const dispatcher = fakeDispatcher(record, () => REPORT)
  return { ...built, config, dispatcher, web }
}

await ok('a question the round could not use is parked in the ledger', async () => {
  const { runtime, view, config, dispatcher } = fixture()
  const before = researchQuestions(runtime.home).filter((q) => q.status === 'open').length
  assert.equal(before, 1, 'the fixture needs one open question to read')
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home)
  const parked = after.filter((q) => q.status === 'parked')
  assert.equal(parked.length, 1, 'the round read the question and it stayed open forever')
  assert.match(parked[0].parkReason ?? '', /no promotion|not been able to act/)
})

await ok('the campaign records the parking, not just the file', async () => {
  const { runtime, view, config, dispatcher } = fixture()
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const event = (runtime.events || []).find((e) => e.type === 'question.parked')
  assert.ok(event, 'the ledger on disk moved and the campaign said nothing')
  assert.ok(event.data.id, 'the event must name the question id')
  assert.match(String(event.data.reason ?? ''), /no promotion|not been able to act/)
  assert.equal(event.data.round !== undefined, true, 'the event should say which round parked it')
})

await ok('the bar comes from config, not from the wiring', async () => {
  // The same single read that parks under `maxQuestionAsks: 1` must be left
  // alone under a higher bar. Without this the wiring could park on the first
  // read and the spec above would still pass -- a policy that ignores its own
  // number is worse than no policy, because it looks configurable.
  const { runtime, view, config, dispatcher } = fixture()
  const patient = { ...config, research: { ...config.research, maxQuestionAsks: 9 } }
  await runRound({ runtime, view, config: patient, dispatcher, log: () => {}, notify: () => {} })
  const parked = researchQuestions(runtime.home).filter((q) => q.status === 'parked')
  assert.equal(parked.length, 0, 'one read under a bar of nine parked the question')
  assert.equal((runtime.events || []).filter((e) => e.type === 'question.parked').length, 0)
})

await ok('the spec is pinned in the standing list', () => {
  const list = readFileSync(new URL('../../scripts/test-all.mjs', import.meta.url), 'utf8')
  assert.match(list, /tests\/self57\/the-round-parks-a-question-it-cannot-use\.test\.mjs/)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
