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

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

function mkHome() {
  return mkdtempSync(join(tmpdir(), 'loom-ql-'))
}

function fixture({ promote = false } = {}) {
  const repo = makeRepo()
  // The verifier names the file under test through a spec, never literally: a
  // verifier that says `keep.txt` puts that file in its own apparatus, and then
  // every honest patch to it is refused as oracle tampering — the trap that made
  // three probe workspaces report `oracleClean: false` for a whole afternoon.
  writeFileSync(join(repo, 'spec.json'), JSON.stringify({ target: 'keep.txt', want: 'fixed' }))
  writeFileSync(
    join(repo, 'check.mjs'),
    "import { readFileSync } from 'node:fs'\n" +
      "import { join } from 'node:path'\n" +
      "const spec = JSON.parse(readFileSync(join(process.cwd(), 'spec.json'), 'utf8'))\n" +
      "const text = readFileSync(join(process.cwd(), spec.target), 'utf8')\n" +
      "const ok = text.includes(spec.want)\n" +
      "console.log(`KILLRATE=${ok ? '1.0000' : '0.0000'}`)\n" +
      "process.exit(ok ? 0 : 1)\n",
  )
  execFileSync('git', ['-C', repo, 'add', '-A'])
  execFileSync('git', ['-C', repo, 'commit', '-qm', 'check'])
  const built = makeRuntime({
    repo,
    tasks: [
      {
        id: 't1',
        // Relevant on purpose: since 2026-11-26 a ledger question with no
        // vocabulary in common with the task is not this round's question.
        prompt: 'make the cheap stage rank like the verifier, then write the word fixed into keep.txt',
        verify: { cmd: `"${process.execPath}" check.mjs`, scope: { editable: ['keep.txt'] } },
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

// A dispatcher whose worker actually edits the file and says so in its report:
// without a patch there is nothing to promote and the outcome under test (a
// promotion that owes its win to a read) can never happen.
function writing(record) {
  return {
    async run(prompt, opts = {}) {
      const worktree = opts.cwd || opts.worktree
      writeFileSync(join(worktree, 'keep.txt'), 'fixed\n')
      record.push({ attemptId: opts.label || 'a', prompt, text: '' })
      return { ok: true, sessionId: 's1', text: '{\"changed\":[\"keep.txt\"],\"why\":\"wrote it\",\"evidence\":[\"ran it\"],\"openQuestions\":[],\"confidence\":0.8,\"nextHint\":\"\"}', stopReason: 'completed' }
    },
  }
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
  await runRound({ runtime, view, config, dispatcher: writing([]), log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(after.reads, 1, 'the outcome was recorded as another read')
  const spend = (runtime.events || []).filter((e) => e.type === 'question.read' && e.data.outcome !== true)
  const outcome = (runtime.events || []).filter((e) => e.type === 'question.read' && e.data.outcome === true)
  assert.equal(spend.length, 1, 'one read is one spend')
  assert.equal(outcome.length, 1, 'one read is one outcome')
  assert.equal(outcome[0].data.used !== undefined, true, 'the outcome should say whether the notes were used')
})

await ok('the outcome is on the ledger, not swallowed by a try/catch', async () => {
  // The first version of this block sat next to the `used` write-back, where
  // `promote` is not declared yet. The ReferenceError was caught by the block's
  // own try/catch and logged, so every live round spent a read and recorded only
  // the spend. A spec that checked the spend alone passed. This one checks the
  // outcome, which is the half that was being dropped.
  const { runtime, view, config } = fixture({ promote: true })
  await runRound({ runtime, view, config, dispatcher: writing([]), log: () => {}, notify: () => {} })
  const after = researchQuestions(runtime.home).find((q) => q.question === QUESTION)
  assert.equal(after.promotedAfterRead, true, 'the round promoted and the ledger does not know the read was followed by a win')
  const outcomes = (runtime.events || []).filter((e) => e.type === 'question.read' && e.data.outcome === true)
  assert.equal(outcomes.length, 1, 'the outcome event is missing: the write-back silently failed again')
  assert.equal(outcomes[0].data.promoted, true)
  assert.equal(outcomes[0].data.used === undefined, false, 'the outcome must carry what the worker did with the notes')
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
    // Must overlap both ledger entries: a question that shares nothing with
    // the task is no longer asked, so an off-topic prompt would leave one
    // candidate and the rotation under test would never be exercised.
    task: { id: 't1', prompt: 'x about the verifier and a measured zero' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [],
  })
  assert.equal(asked.id, first[1].id)
})

await ok('the spec is pinned in the standing list', () => {
  const list = readFileSync(new URL('../../scripts/test-all.mjs', import.meta.url), 'utf8')
  assert.match(list, /tests\/self57\/the-ledger-hears-about-the-read\.test\.mjs/)
})


console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
