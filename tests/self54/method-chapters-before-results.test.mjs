// Which chapter of a paper is its method.
//
// The library's "mechanisms" are the paragraphs of the method chapter. Choosing
// that chapter by keyword alone works for a paper whose heading says "Method"
// and fails for the two shapes that dominate the corpus:
//
//   * a paper that *names* its method ("GEPA: Reflective Prompt Evolution") and
//     then measures it in the next chapter -- the keyword list matches nothing,
//     so the largest chapter wins, and the largest chapter is often "Evaluation"
//     with 334 paragraphs of tables against the method's 69. That is how a
//     library produced a mechanism list of experiment setup paragraphs;
//   * a technical report whose method is split across three chapters, where the
//     results chapter is larger than any of them.
//
// Papers are written in one order almost universally: introduction, the thing,
// then the measurements. So the chapters before the first results chapter are
// the built thing, whatever they are called. These tests pin that rule, its two
// fallbacks, and the cap that keeps a thirty-subsection report from turning the
// list into a table of contents.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { methodSections, MECHANISM_MAX_POINTS, mergeToAtMost } from '../../src/research/workrecord.js'

const S = (id, locator) => ({ id, locator, title: locator.replace(/^§[0-9.]+\s*/, ''), level: 2 })

/**
 * A region whose paragraph counts are chosen: `weights` maps a section id to how
 * many `<p id="<id>.pN">` it holds, and an ancestor's weight counts its children
 * because `methodSections` sums the subtree.
 */
function region(sections, weights) {
  const lines = []
  for (const section of sections) {
    const own = weights[section.id] ?? 0
    for (let i = 1; i <= own; i += 1) lines.push(`<p id="${section.id}.p${i}.1" class="ltx_p">text ${i}</p>`)
  }
  return lines.join('\n')
}

const NAMED_METHOD = [
  S('S1', '§1 Introduction'),
  S('S2', '§2 Problem Statement'),
  S('S3', '§3 GEPA: Reflective Prompt Evolution'),
  S('S3.SS1', '§3.1 Pareto-based candidate selection'),
  S('S4', '§4 Evaluation'),
  S('S5', '§5 Extended Applications'),
  S('S7', '§7 Conclusion'),
]

test('a named method chapter beats a larger evaluation chapter', () => {
  // The measured shape: method 69 paragraphs, evaluation 334. Before the
  // document-order rule, the keyword list matched nothing and evaluation won.
  const text = region(NAMED_METHOD, { S1: 181, S2: 62, S3: 69, S3: 69, 'S3.SS1': 30, S4: 334, S5: 83, S7: 2 })
  const chosen = methodSections(NAMED_METHOD, text).map((section) => section.id)
  assert.ok(!chosen.includes('S4'), `evaluation must not be a method chapter, got ${chosen.join(',')}`)
  assert.ok(chosen.includes('S3'), `the chapter before evaluation is the method, got ${chosen.join(',')}`)
})

test('a chapter whose name only appears after the results chapter is not method', () => {
  // "Extended Applications of GEPA" sits after §4 Evaluation and carries the
  // word nothing; whichever way it is read, it must not become a mechanism list.
  const text = region(NAMED_METHOD, { S1: 181, S3: 69, S4: 334, S5: 400 })
  const chosen = methodSections(NAMED_METHOD, text).map((section) => section.id)
  assert.ok(!chosen.includes('S5'), `work discussed after the results is not the method, got ${chosen.join(',')}`)
})

test('a technical report keeps all of its method chapters and drops the results chapter', () => {
  const report = [
    S('S1', '§1 Introduction'),
    S('S3', '§3 Pre-Training'),
    S('S4', '§4 Post-Training'),
    S('S5', '§5 Results'),
    S('S10', '§10 Conclusion'),
  ]
  const text = region(report, { S1: 515, S3: 921, S4: 928, S5: 3821, S10: 10 })
  const chosen = methodSections(report, text).map((section) => section.id)
  assert.deepEqual(chosen, ['S3', 'S4'], `expected the two build chapters, got ${chosen.join(',')}`)
})

test('a paper that opens with its evaluation framework still finds the method after it', () => {
  // Some papers put the measurement first. There is nothing before it, so the
  // rule falls back to the chapters after it that are not themselves results.
  const measured = [
    S('S1', '§1 Introduction'),
    S('S2', '§2 Evaluation Framework'),
    S('S3', '§3 Code Fine-Tuning'),
    S('S4', '§4 Supervised Fine-Tuning'),
    S('S6', '§6 Limitations'),
  ]
  const text = region(measured, { S1: 120, S2: 200, S3: 150, S4: 90, S6: 20 })
  const chosen = methodSections(measured, text).map((section) => section.id)
  assert.ok(chosen.length > 0, 'a paper whose first chapter is an evaluation must still get mechanisms')
  assert.deepEqual(chosen, ['S3', 'S4'], `expected the fine-tuning chapters, got ${chosen.join(',')}`)
})

test('a problem statement is framing, not a method', () => {
  const withProblem = [
    S('S1', '§1 Introduction'),
    S('S2', '§2 Problem Statement'),
    S('S3', '§3 GEPA: Reflective Prompt Evolution'),
    S('S4', '§4 Evaluation'),
  ]
  const text = region(withProblem, { S1: 100, S2: 300, S3: 69, S4: 400 })
  const chosen = methodSections(withProblem, text).map((section) => section.id)
  assert.ok(!chosen.includes('S2'), `a longer problem statement is still not the method, got ${chosen.join(',')}`)
})

test('a thirty-subsection report folds down to a readable number of points', () => {
  const points = []
  for (let i = 0; i < 30; i += 1) {
    points.push({ locator: `§3.${i}`, title: `Part ${i}`, text: 'x'.repeat(400 + i), sections: [{ locator: `§3.${i}`, title: `Part ${i}` }], merged: 1 })
  }
  const folded = mergeToAtMost(points, MECHANISM_MAX_POINTS)
  assert.equal(folded.length, MECHANISM_MAX_POINTS)
  // Nothing disappears: the fold is between neighbours and it says so.
  const covered = folded.reduce((n, point) => n + point.merged, 0)
  assert.equal(covered, points.length, 'every floored subsection is still counted')
  for (const point of folded) assert.ok(point.text.length > 0)
  // Order is preserved: folding never reorders the paper.
  const firsts = folded.map((point) => point.locator)
  assert.deepEqual(firsts, [...firsts].sort((a, b) => Number(a.split('.').pop()) - Number(b.split('.').pop())))
})

test('nothing is folded when there is nothing to fold', () => {
  const three = [
    { locator: '§3.1', title: 'a', text: 'a'.repeat(300), merged: 1 },
    { locator: '§3.2', title: 'b', text: 'b'.repeat(300), merged: 1 },
    { locator: '§3.3', title: 'c', text: 'c'.repeat(300), merged: 1 },
  ]
  assert.deepEqual(mergeToAtMost(three, 5).map((point) => point.locator), ['§3.1', '§3.2', '§3.3'])
  assert.deepEqual(mergeToAtMost([], 5), [])
})
