// The leg searches the open web while the repository holds a 153-work library
// it never opens.
//
// The user's complaint was exact: "你有好久没有调研了。我们内部的调研系统不是做好
// 了吗。" The leg reads `ctx.web` and nothing else, so every round pays for a
// search of the public internet — and the public internet, asked "when a
// measurement is too noisy to justify a decision", returns a conference PDF, a
// Korean book site, and three 404s.
//
// The library already holds the answer-shaped material: 153 records, each with
// an abstract, verbatim mechanism quotations with locators, and the readers'
// caveats. Searching it is free, deterministic, and re-derivable from bytes in
// the repository — everything the web is not.
//
// This spec pins the index, the search, and the page shape. The wiring into the
// round is pinned separately (`the-round-can-read-the-library`), because a
// module that works and a round that never calls it is the failure mode this
// repository keeps producing.
//
//   node tests/self57/the-loop-reads-its-own-library.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { localLibrary, searchLocal, fetchLocal } from '../../src/research/local-index.js'

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

const WORK = {
  slug: 'r10-eval-budget',
  built: '2026-11-26',
  works: [
    {
      id: '2606.08106',
      title: 'PACE: A Promotion Gate with a Budget of Evidence',
      year: 2026,
      abstract:
        'Keeping a change whenever the verifier score goes up is uncontrolled adaptive multiple testing; the agent p-hacks itself. We replace the rule with a paired e-process.',
      mechanisms: [
        {
          locator: '§3 Testing by betting',
          title: 'Testing by betting',
          text: 'The e-value multiplies one plus lambda times twice the win indicator minus one, and the process is a martingale under the null, so the Ville bound gives false-commit control under optional stopping.',
        },
      ],
    },
    {
      id: '2107.03374',
      title: 'Evaluating Large Language Models Trained on Code',
      year: 2021,
      abstract: 'Computing pass at k by sampling has high variance; we give an unbiased estimator.',
      mechanisms: [],
    },
  ],
}

function libraryDir(works = [WORK]) {
  const dir = mkdtempSync(join(tmpdir(), 'loom-lib-'))
  const out = join(dir, 'research', 'out')
  mkdirSync(out, { recursive: true })
  for (const w of works) writeFileSync(join(out, `work-${w.slug}.json`), JSON.stringify(w, null, 1))
  return dir
}

ok('the library is every record in every direction file', () => {
  const lib = localLibrary(libraryDir())
  assert.equal(lib.length, 2)
  const pace = lib.find((w) => w.id === '2606.08106')
  assert.equal(pace.slug, 'r10-eval-budget')
  assert.match(pace.title, /PACE/)
  assert.equal(pace.mechanisms.length, 1, 'mechanism quotes travel with the record')
})

ok('a missing directory is an empty library, not a throw', () => {
  assert.deepEqual(localLibrary(join(tmpdir(), 'loom-lib-does-not-exist-xyz')), [])
  assert.deepEqual(localLibrary(null), [])
})

ok('a broken record file is skipped rather than fatal', () => {
  const dir = libraryDir()
  writeFileSync(join(dir, 'research', 'out', 'work-broken.json'), '{ not json')
  assert.equal(localLibrary(dir).length, 2, 'the two good records survive')
})

ok('search ranks by how much of the question the work covers', () => {
  const lib = localLibrary(libraryDir())
  // A question that shares words with both records: the pass@k abstract says
  // "variance" and "sampling", PACE says "change", "score" and "rule".
  const hits = searchLocal(lib, 'a rule that keeps a change whenever the score goes up is noisy sampling', { maxResults: 5 })
  assert.equal(hits.length, 2, 'both records use at least one of these words')
  assert.equal(hits[0].url.startsWith('work:'), true, `url is a library handle, got ${hits[0].url}`)
  assert.ok(hits[0].title)
  assert.ok(hits[0].score >= hits[1].score, 'ranked by overlap, best first')
})

ok('search matches on a word the record actually uses', () => {
  const lib = localLibrary(libraryDir())
  const hits = searchLocal(lib, 'uncontrolled adaptive multiple testing', { maxResults: 3 })
  assert.equal(hits[0].url, 'work:r10-eval-budget/2606.08106')
  assert.match(hits[0].snippet, /p-hacks itself/)
})

ok('search over an empty library returns nothing, not a crash', () => {
  assert.deepEqual(searchLocal([], 'anything', { maxResults: 3 }), [])
  assert.deepEqual(searchLocal(localLibrary(libraryDir()), '', { maxResults: 3 }), [])
})

ok('a page carries the abstract and the mechanism quotes as text', () => {
  const lib = localLibrary(libraryDir())
  const page = fetchLocal(lib, 'work:r10-eval-budget/2606.08106')
  assert.ok(page, 'the handle resolves')
  assert.equal(page.title, lib[0].title)
  assert.match(page.text, /uncontrolled adaptive multiple testing/)
  assert.match(page.text, /lambda times twice the win indicator/, 'the mechanism quote is the page body')
  assert.match(page.text, /§3 Testing by betting/, 'the locator travels with the quote')
})

ok('an unknown handle resolves to null so the caller can fall through', () => {
  const lib = localLibrary(libraryDir())
  assert.equal(fetchLocal(lib, 'work:r10-eval-budget/9999.99999'), null)
  assert.equal(fetchLocal(lib, 'https://example.org/x'), null)
  assert.equal(fetchLocal([], 'work:r10-eval-budget/2606.08106'), null)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
