// A research run that starts from one sentence is a search, not a survey.
//
// The planning half of the ported pipeline answers a narrow question: given a
// question, how many queries, how deep, how much fetching. The parts that
// matter for quality are the ones a hurried loop gets wrong:
//
//   * depth is a declared preset, so "quick" cannot silently fetch six pages;
//   * sub-questions outrank auto-expansion, because a human's decomposition is
//     better than a suffix glued onto the original sentence;
//   * CJK questions get CJK expansions — appending " latest analysis" to a
//     Chinese question returns English pages about nothing.
//
// Ported from `dsh-deep-research/lib/plan.js` (MIT, houdinicc); see
// THIRD_PARTY_NOTICES.md. The port keeps the behaviour and drops the panel,
// i.e. the pure planning function and nothing else.
import assert from 'node:assert/strict'

import {
  DEPTH_PRESETS,
  DEFAULT_DEPTH,
  MAX_QUERY_CHARS,
  collapseWhitespace,
  hasCJK,
  normalizeQuery,
  planQueries,
  resolveLimits,
} from '../../src/research/plan.js'

let passed = 0
let failed = 0
// Each block ends here once its own assertions have run: reaching this line
// means they all held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

// --- the presets are the contract -----------------------------------------

{
  assert.ok(DEPTH_PRESETS.quick && DEPTH_PRESETS.standard && DEPTH_PRESETS.deep)
  assert.equal(DEPTH_PRESETS.quick.fetchTop, 0, 'quick does not fetch')
  assert.ok(DEPTH_PRESETS.standard.fetchTop > 0)
  assert.ok(DEPTH_PRESETS.deep.maxQueries > DEPTH_PRESETS.standard.maxQueries)
  assert.equal(DEFAULT_DEPTH, 'standard')
}
ok('three depth presets, and quick is the one that spends nothing')

// --- unknown depth falls back, explicit limits win -------------------------

{
  assert.equal(resolveLimits({ depth: 'nonsense' }).depth, 'standard')
  const wide = resolveLimits({ depth: 'quick', maxQueries: 9 })
  assert.equal(wide.maxQueries, 9, 'an explicit maxQueries overrides the preset')
  assert.equal(wide.rounds, 1, 'but it cannot buy a second round the preset did not have')
}
ok('an unknown depth is standard, and an explicit cap is honoured')

// --- a quick plan is one query; a standard plan expands --------------------

{
  const quick = planQueries('how do verifiers get hacked?', { depth: 'quick' })
  assert.equal(quick.core, 'how do verifiers get hacked?')
  assert.equal(quick.queries.length, 1, 'quick does not expand the question')

  const standard = planQueries('how do verifiers get hacked?', { depth: 'standard' })
  assert.ok(standard.queries[0] === standard.core, 'the question itself comes first')
  assert.ok(
    standard.queries.some((q) => /latest analysis/i.test(q)),
    `a standard plan adds a second angle, got ${JSON.stringify(standard.queries)}`,
  )
  assert.ok(standard.queries.length <= standard.limits.maxQueries)
}
ok('a quick plan asks once; a standard plan asks the question twice, differently')

// --- CJK questions expand in CJK ------------------------------------------

{
  const plan = planQueries('自我改进的验证器为什么会被骗过', { depth: 'standard' })
  assert.ok(hasCJK(plan.core))
  assert.ok(
    plan.queries.some((q) => q.includes('最新进展')),
    `a Chinese question needs a Chinese second angle, got ${JSON.stringify(plan.queries)}`,
  )
  assert.ok(!plan.queries.some((q) => /latest analysis/i.test(q)), 'and not an English suffix')
}
ok('the expansion language follows the question language')

// --- sub-questions outrank auto-expansion ---------------------------------

{
  const plan = planQueries('main question', {
    depth: 'quick',
    subquestions: ['first', 'second', 'third', 'fourth'],
  })
  assert.deepEqual(plan.queries, ['main question', 'first', 'second'], 'maxQueries caps the list, sub-questions first')
}
ok('a human decomposition is spent before the automatic one')

// --- dedupe, cap, and the empty question ----------------------------------

{
  const long = 'x'.repeat(400)
  const plan = planQueries(long, { depth: 'deep' })
  for (const q of plan.queries) {
    assert.ok(q.length <= MAX_QUERY_CHARS, `query over ${MAX_QUERY_CHARS} chars: ${q.length}`)
  }

  const dup = planQueries('same', { depth: 'quick', subquestions: ['same', 'other'] })
  assert.equal(dup.queries.filter((q) => q === 'same').length, 1, 'no query appears twice')

  const empty = planQueries('   ', { depth: 'deep' })
  assert.equal(empty.core, '', 'a blank question has no core')
  assert.deepEqual(empty.queries, [], 'and buys no queries')
}
ok('queries are deduped, capped at 128 chars, and a blank question plans nothing')

// --- small text helpers ---------------------------------------------------

{
  assert.equal(collapseWhitespace('  a \n\t b  '), 'a b')
  assert.equal(collapseWhitespace(null), '')
  assert.equal(normalizeQuery('  spaced  out  '), 'spaced out')
  assert.equal(normalizeQuery(''), '')
  assert.equal(hasCJK('abc'), false)
  assert.equal(hasCJK('abc 中文'), true)
}
ok('whitespace helpers never throw on junk')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
