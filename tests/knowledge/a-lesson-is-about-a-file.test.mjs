// Spec: the knowledge tree must be readable, not just present.
//
// What it looked like before this spec: the section grouped ninety-nine claims
// by kind, and every claim the loop writes is a `fact`, so the reader got one
// undifferentiated bucket of 240-character paragraphs, each cut mid-word by
// the claim clip, each scored 0. "Scattered" was the accurate word for it.
//
// The fix is a statement-shaped claim plus a file to hang it on:
//   1. a claim is its first sentence, bounded, and never clipped mid-token;
//   2. a lesson records the files it is about;
//   3. the tree groups by those files, with a named residual bucket for claims
//      that name none, and keeps every claim in its group.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// --- 1. claimHeadline: a statement, not the head of a paragraph -------------
const { claimHeadline, lessonFiles, lessonConfidence, deriveLesson, CLAIM_MAX } = await import(
  '../../src/knowledge/impact.js'
)

const prose =
  'triangleChips keeps its five fixed chips and only adds the planning chip when that lever was used. The gate is num(c.triangle.planning.rounds) > 0, so a campaign that never planned shows nothing.'
const head = claimHeadline(prose)
assert.ok(head.length <= CLAIM_MAX, `a headline fits the card (got ${head.length})`)
assert.ok(head.endsWith('used.'), `it ends at the first sentence break, got ${JSON.stringify(head)}`)
assert.ok(!head.includes('The gate is'), 'the second sentence is not part of the claim')
ok('a claim is its first sentence, not the head of a paragraph')

// A first sentence longer than the card is clipped -- at a word boundary, and
// with the cut marked. The alternative (keeping the sentence and letting the
// card grow) is what made the old tree unreadable.
const longFirst = `${'alpha beta gamma delta '.repeat(12)}end of that sentence. Second one.`
const clippedLong = claimHeadline(longFirst)
assert.ok(clippedLong.length <= CLAIM_MAX, 'a long first sentence is still bounded')
assert.ok(clippedLong.endsWith('…'), 'and it says so')
ok('a first sentence longer than the card is clipped and marked')

// A truncated ledger claim loses its ellipsis, so the clip is not content.
const clipped = 'The per-round loop already gated planning on planMs, incrementing planMs and planned. I reused exact…'
assert.ok(!claimHeadline(clipped).endsWith('…'), 'the stored ellipsis is stripped, not kept as punctuation')
ok('an already-clipped claim does not keep the cut')

// No sentence break inside the budget: clip at a word boundary, never mid-word.
const runOn = 'word '.repeat(60)
const bound = claimHeadline(runOn)
assert.ok(bound.length <= CLAIM_MAX, 'a run-on claim is still bounded')
assert.ok(bound.endsWith('…'), 'and it says that it was cut')
assert.ok(!/\bwor…$/.test(bound), `it cuts between words, got ${JSON.stringify(bound.slice(-12))}`)
assert.equal(claimHeadline(''), '', 'empty input is empty output')
assert.equal(claimHeadline(null), '', 'null input is empty output')
ok('a claim with no sentence break is clipped between words')

// A short sentence after an abbreviation must not become the whole claim.
const abbrev = 'e.g. this is not the claim. The real statement is here and it is longer than that.'
assert.ok(claimHeadline(abbrev).length > 20, 'a leading abbreviation does not truncate the claim')
ok('an abbreviation near the start does not swallow the claim')

// --- 2. the producer records files and stated confidence --------------------
const attempt = {
  id: 'r1a1',
  score: 1,
  report: {
    changed: ['src\\panel\\api.js', './src/panel/api.js', 'tests/x.test.mjs'],
    why: 'panelState now bounds each row so a broken campaign cannot take the route down.',
    confidence: 0.9,
  },
}
assert.deepEqual(lessonFiles(attempt), ['src/panel/api.js', 'tests/x.test.mjs'], 'paths are normalised and deduped')
assert.equal(lessonConfidence(attempt), 0.9, 'the stated confidence is kept')
assert.equal(lessonConfidence({ report: { confidence: 9 } }), 1, 'confidence is clamped, not trusted blindly')
assert.equal(lessonConfidence({}), 0.5, 'a silent worker gets the neutral default')
ok('a lesson records the files it is about and the confidence its worker stated')

const derived = deriveLesson({ attempt, task: { id: 't1', family: 'fam' }, round: 4 })
assert.ok(derived, 'a verified attempt with a mechanism still yields a lesson')
assert.deepEqual(derived.files, ['src/panel/api.js', 'tests/x.test.mjs'], 'the lesson carries its files')
assert.equal(derived.confidence, 0.9, 'and its confidence')
assert.ok(derived.claim.length <= CLAIM_MAX, 'and a claim that fits a card')
assert.equal(derived.id, deriveLesson({ attempt, task: { id: 't1', family: 'fam' }, round: 9 }).id,
  'the id stays a function of family and claim, so the same finding is one lesson')
ok('deriveLesson emits a card-sized claim with its files and confidence')

// --- 3. the panel groups by file -------------------------------------------
const panel = await loadPanel()
const data = {
  campaigns: [
    {
      id: 'alpha',
      status: 'running',
      lessons: 4,
      quarantined: 0,
      lessonsAll: [
        { id: 'a1', claim: 'api takes the route down', kind: 'fact', score: 0, files: ['src/panel/api.js'] },
        { id: 'a2', claim: 'api bounds the body', kind: 'recipe', score: 0, files: ['src/panel/api.js'] },
        { id: 'a3', claim: 'round settles its deadline', kind: 'fact', score: 0, files: ['src/runtime/round.js'] },
        { id: 'a4', claim: 'no file named here', kind: 'fact', score: 0, files: [] },
      ],
    },
    {
      id: 'beta',
      status: 'paused',
      lessons: 1,
      quarantined: 0,
      // An older host sends only `lessonsTop`; the tree must still read.
      lessonsTop: [{ id: 'b1', claim: 'stale payload still works', kind: 'fact', score: 0.2, files: ['docs/contracts.md'] }],
    },
  ],
}

const tree = panel.knowledge(data)
assert.ok(Array.isArray(tree.files) && tree.files.length === 4, `one group per named file plus the residual, got ${tree.files.length}`)
const api = tree.files.find((g) => g.path === 'src/panel/api.js')
assert.ok(api, 'the api file has its own group')
assert.deepEqual(api.items.map((l) => l.id).sort(), ['a1', 'a2'], 'every claim about that file is in the group')
const residual = tree.files.find((g) => g.path === '(未指明文件)')
assert.ok(residual, 'claims that name no file land in one named bucket')
assert.deepEqual(residual.items.map((l) => l.id), ['a4'], 'and only those')
assert.equal(tree.files[tree.files.length - 1].path, '(未指明文件)', 'the residual bucket sorts last')
assert.ok(tree.files.find((g) => g.path === 'docs/contracts.md'), 'a lessonsTop-only payload still contributes its file')
ok('the tree groups by file, keeps every claim, and names its residual bucket')

assert.equal(tree.all.length, 5, 'the whole corpus is available, not just the capped top three per campaign')
ok('the whole corpus reaches the panel, not three rows per campaign')

// The section, the tree and the per-campaign branch all read one source.
assert.deepEqual(panel.knowledge(data), tree, 'knowledge() is a projection, not a second pass')
ok('every knowledge view is a projection of one function')

// --- 4. the render actually draws the file groups --------------------------
const source = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')
// The render is bounded on purpose -- 29 groups of 86 claims is a wall in a
// 320px column -- but a bound that silently drops rows is worse than the wall,
// so the holdback is counted out loud. Both halves are pinned here.
assert.match(source, /tree\.files\.slice\(0, KGROUPS_SHOWN\)\.map\(function \(g\)/, 'the section renders the file groups')
assert.match(source, /另有 ' \+ \(tree\.files\.length - KGROUPS_SHOWN\)/, 'groups held back are named, not dropped')
assert.ok(!/tree\.kinds\.map\(function \(g\) \{/.test(source), 'the kind grouping is gone from the render')
assert.match(source, /className: 'loom-kfile'/, 'each file is its own block')
assert.match(source, /-webkit-line-clamp:2/, 'a claim wraps to at most two lines instead of one ellipsised line')
assert.match(source, /tree\.files\.length \+ ' 处'/, 'the header counts the places, not just the claims')
ok('the section renders file groups, with wrapped claims and a place count')

console.log(`\n${pass}/${pass} passed`)
