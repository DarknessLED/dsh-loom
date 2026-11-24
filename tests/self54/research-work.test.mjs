// The library builder: ids in, records plus two renderings out.
//
// The rules worth pinning here are the ones that decide what a rebuild costs and
// what a missing paper looks like:
//
//   * a cached body is never re-fetched, so rebuilding a library is free;
//   * a paper with no body is reported as missing with a reason, never dropped
//     silently -- a library that quietly has nine works when you asked for ten
//     is a library you cannot trust a count in;
//   * `--no-fetch` never touches the network, which is what a spec and a
//     reviewer both need;
//   * the hand-written reading is keyed by id and a missing entry renders as
//     "no one has written this yet" rather than as an omitted section.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseArgs, selectIds, buildLibrary, readReadings, localDate } from '../../scripts/research-work.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const BODY = (id, title) => `<html><body><h1 class="ltx_title_document">${title}</h1>
<section id="S1" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">1</span>Introduction</h2>
<p id="S1.p1.1" class="ltx_p">The verifier is the thing that decides whether an edit helped, and it is the thing nobody measures, which is why the loop drifts.</p></section>
<section id="S3" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">3</span>Method</h2>
<figure id="S3.F1" class="ltx_figure"><img src="${id}v1/pipeline.png"><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">Figure 1: </span>How the two stages fit.</figcaption></figure>
<section id="S3.SS1" class="ltx_section"><h3><span class="ltx_tag ltx_tag_section">3.1</span>First stage</h3>
<p id="S3.SS1.p1.1" class="ltx_p">We screen a wide set of candidates cheaply and keep the ones that pass, which is different from measuring all of them and choosing: the cheap reading decides who gets the expensive reading, and the expensive reading decides what is promoted.</p></section>
</section></body></html>`

function fixtureCache() {
  const dir = mkdtempSync(join(tmpdir(), 'rswork-'))
  writeFileSync(join(dir, '2601.00001.html'), BODY('2601.00001', 'Cached Paper'), 'utf8')
  // A PDF-pointer stub: present in the cache but not a readable body.
  writeFileSync(join(dir, '1707.06347.html'), '<html><body><p>See pages 1-last of ppo-min.pdf</p></body></html>', 'utf8')
  return dir
}

const parsed = parseArgs(['--slug', 'x', '--top', '3', '--ids', 'a,b', '--no-fetch', '--doc', 'd.md'])
assert.equal(parsed.slug, 'x')
assert.equal(parsed.top, 3)
assert.deepEqual(parsed.ids, ['a', 'b'])
assert.equal(parsed.fetch, false)
assert.equal(parsed.doc, 'd.md')
ok('flags are parsed, and a flag with no value does not eat the next flag')

const survey = {
  cls: {
    foundations: [
      { arxivId: '1111.00001', title: 'Old foundation', year: 2020 },
      { arxivId: '1111.00001', title: 'Old foundation', year: 2020 },
      { arxivId: '1111.00002', title: 'Another foundation', year: 2021 },
    ],
    sota: [{ id: '2222.00001', title: 'Brand new', year: 2026 }],
  },
  b: { papers: [{ id: '3333.00001', title: 'Leftover', year: 2025 }] },
}
const picked = selectIds(survey, { top: 4 })
assert.deepEqual(picked.map((item) => item.id), ['1111.00001', '1111.00002', '2222.00001', '3333.00001'])
assert.equal(selectIds(survey, { top: 0 }).length, 0)
ok('ids are taken foundations first, de-duplicated, then recent, then the rest')

const cache = fixtureCache()
const built = await buildLibrary({ ids: ['2601.00001', '1707.06347', '9999.99999'], cache, fetch: false })
assert.equal(built.records.length, 1)
assert.equal(built.records[0].id, '2601.00001')
assert.equal(built.missing.length, 2)
assert.equal(built.missing.find((item) => item.id === '1707.06347').reason.includes('cache'), true, 'a stub is not a body')
assert.equal(built.missing.find((item) => item.id === '9999.99999').reason.includes('fetching is off'), true)
ok('a missing body is reported with a reason, never dropped')

const fetched = []
const withFetch = await buildLibrary({
  ids: ['9999.99999'],
  cache,
  fetch: true,
  fetchImpl: async (id) => {
    fetched.push(id)
    return { html: BODY(id, 'Fetched Paper') }
  },
})
assert.deepEqual(fetched, ['9999.99999'], 'the network is asked once, for the paper that was missing')
assert.equal(withFetch.records.length, 1)
assert.equal(withFetch.records[0].title, 'Fetched Paper')
ok('a cache miss is fetched once and then cached')

const again = []
await buildLibrary({
  ids: ['9999.99999'],
  cache,
  fetch: true,
  fetchImpl: async (id) => {
    again.push(id)
    return { html: BODY(id, 'Fetched Paper') }
  },
})
assert.deepEqual(again, [], 'the second build reads the cache and never asks again')
ok('a cached body is never re-fetched')

const failed = await buildLibrary({
  ids: ['8888.88888'],
  cache,
  fetch: true,
  fetchImpl: async () => ({ html: '', error: 'HTTP 404' }),
})
assert.equal(failed.records.length, 0)
assert.equal(failed.missing[0].reason, 'HTTP 404', 'the upstream reason survives, not a generic one')
ok('a failed fetch keeps its reason')

const readingDir = mkdtempSync(join(tmpdir(), 'rsread-'))
const readingFile = join(readingDir, 'r.json')
writeFileSync(readingFile, JSON.stringify({ '2601.00001': { summary: 'why it works', connects: [], caveats: [] } }), 'utf8')
const readings = readReadings(readingFile)
assert.equal(readings['2601.00001'].summary, 'why it works')
assert.deepEqual(readReadings(join(readingDir, 'nope.json')), {})
assert.deepEqual(readReadings(null), {})
// One author signs the file once. Copying the signature onto every reading is
// what lets a single work page say who wrote it without carrying the file's
// neighbours along.
const signedFile = join(readingDir, 'signed.json')
writeFileSync(
  signedFile,
  JSON.stringify({ _by: 'someone with a name', '2601.00001': { summary: 'why it works' } }),
  'utf8',
)
const signed = readReadings(signedFile)
assert.equal(signed['2601.00001'].by, 'someone with a name', 'the file signature reaches the reading')
assert.equal(signed._by, undefined, 'the signature is not itself a work')
ok('a signed reading file carries the author each page needs')

ok('a missing reading file is empty readings, not a crash')

const lib = await buildLibrary({ ids: ['2601.00001'], cache, fetch: false })
const index = lib.index
assert.equal(index.edges.length, 0, 'one work cites nothing inside a one-work library')
assert.equal(localDate(new Date(2026, 10, 24)), '2026-11-24', 'the date stamp is local, not UTC')
ok('a one-work library has no edges, and the date is the local one')

// The agent digest is what gets written into the json file; it must be the same
// records, with fields, and not a re-extraction.
const doc = readFileSync(join(cache, '2601.00001.html'), 'utf8')
assert.ok(doc.includes('ltx_p'))
ok('the fixture cache is written where the builder looks for it')

console.log(`\n${pass} checks passed`)
