// The task fallback asked the search engine to search the instructions.
//
// When no ledger question shares a topic with the round's task, the leg builds
// its own question from the task. It did that by prefixing the whole prompt:
//
//   what is known about this problem: Write design-note-8.md about how much of a
//   research report should be a quotation. Read README.md for the twelve rules
//   and the command. Do not modify check.mjs or README.md.
//
// Three rounds of `trial-prose2` were assigned the reading arm on that string
// and came back with a writing-toolkit spec, a Scratch course page, and three
// PDF 404s. The search engine did what it was asked: it found pages about
// writing design notes and reading rules.
//
// A question for a search engine is the subject, not the brief. The subject is
// the subordinate clause after "about"; everything else in a task prompt is
// housekeeping (which file to write, what not to touch, which command to read).
//
//   node tests/self57/the-question-is-the-subject-not-the-brief.test.mjs
import assert from 'node:assert/strict'

import { topicOf } from '../../src/runtime/research-leg.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

ok('the subject after "about" is the question, the rest is housekeeping', () => {
  const prompt =
    'Write design-note-0.md about how a loop should decide whether to read a paper before it edits code. ' +
    'README.md states the twelve rules check.mjs scores and the command it runs; read it first. ' +
    'Do not run node scripts/test-all.mjs and do not modify check.mjs or README.md.'
  assert.equal(topicOf(prompt), 'how a loop should decide whether to read a paper before it edits code')
})

ok('no file names survive into the query', () => {
  const prompt =
    'Write design-note-7.md about what makes a task set unlearnable and why that matters. ' +
    'Read README.md for the twelve rules and the command. Do not modify check.mjs or README.md.'
  const q = topicOf(prompt)
  assert.equal(q, 'what makes a task set unlearnable and why that matters')
  assert.doesNotMatch(q, /\.md\b/)
  assert.doesNotMatch(q, /check\.mjs/)
})

ok('an instruction with no "about" clause still loses its housekeeping', () => {
  const prompt =
    'Fix the retry loop so a killed run is retried instead of counted as a failure. ' +
    'Do not run node scripts/test-all.mjs. Keep the diff small.'
  const q = topicOf(prompt)
  assert.match(q, /retry loop/)
  assert.doesNotMatch(q, /scripts\/test-all/)
  assert.doesNotMatch(q, /^fix\b/i)
})

ok('a prompt that is only housekeeping yields nothing rather than noise', () => {
  assert.equal(topicOf('Do not modify check.mjs or README.md.'), null)
  assert.equal(topicOf(''), null)
  assert.equal(topicOf(null), null)
})

ok('the question is capped so it stays a query', () => {
  const long = `Write x.md about ${'a very long subject '.repeat(40)}`
  const q = topicOf(long)
  assert.ok(q.length <= 180, `question was ${q.length} characters`)
})

ok('the leg uses the subject when it falls back to the task', () => {
  const prompt =
    'Write design-note-3.md about how to tell a re-run apart from a replication. ' +
    'Do not modify check.mjs or README.md.'
  const q = topicOf(prompt)
  assert.equal(q, 'how to tell a re-run apart from a replication')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
