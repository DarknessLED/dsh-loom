// The year a work was published, when the paper never says it.
//
// Three doors lead into the library and two of them carry no date: a reading file
// is hand-written prose keyed by arXiv id, and a survey row for a foundation
// carries a title but not its year. `Number(null)` is 0, so those records used to
// claim to be 2,026 years old and sorted to the top of every table.
//
// The body is not a reliable substitute either -- several arXiv HTML exports carry
// no document date at all -- so the abs page is asked, once per id, and its answer
// is cached next to the body cache. Three rules keep that from becoming a way to
// invent metadata:
//
//   * only unknown fields are written; a year the body stated is never replaced;
//   * a date without a leading year is not a year (arXiv writes `2016/05/23`);
//   * a title borrowed from the abs page is only used when the record had nothing
//     but the id, and it says so in `titleBasis`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  applyMetadata,
  buildLibrary,
  metaFile,
  readCachedMeta,
  yearOfDate,
} from '../../scripts/research-work.mjs'

const ROOT = mkdtempSync(join(tmpdir(), 'loom-meta-'))
const CACHE = join(ROOT, 'deep')
const META = join(ROOT, 'meta')
mkdirSync(CACHE, { recursive: true })

const BODY = `<html><head><title>Paper</title></head><body>
<section id="S1" class="ltx_section"><h2><span class="ltx_tag">1</span> Methods</h2>
<p id="S1.p1.1" class="ltx_p">${'We optimise the adapter against a held-out verifier. '.repeat(8)}</p></section>
</body></html>`

const blank = () => ({
  id: '1234.5678',
  title: '',
  titleBasis: 'id',
  year: null,
  abstract: '',
  origin: 'https://arxiv.org/html/1234.5678',
})

test('a date is read as its year, and nothing else is a year', () => {
  assert.equal(yearOfDate('2016/05/23'), 2016)
  assert.equal(yearOfDate('1998/12/01'), 1998)
  assert.equal(yearOfDate('May 2016'), null, 'a month-first date is not what arXiv writes')
  assert.equal(yearOfDate(''), null)
  assert.equal(yearOfDate('v2'), null)
})

test('only unknown fields are filled, and each fill says it happened', () => {
  const record = blank()
  const { borrowed } = applyMetadata(record, { title: 'Fast Bayesian Optimization', date: '2016/05/23', abstract: 'An abstract.' })
  assert.equal(record.year, 2016)
  assert.equal(record.yearBasis, 'arxiv-abs')
  assert.equal(record.title, 'Fast Bayesian Optimization')
  assert.equal(record.titleBasis, 'arxiv-abs')
  assert.equal(record.abstract, 'An abstract.')
  assert.deepEqual(borrowed, ['year', 'title', 'abstract'])
})

test('a year the body stated is never replaced by a cached page', () => {
  const record = { ...blank(), title: 'Named by the body', titleBasis: 'body', year: 2018 }
  const { borrowed } = applyMetadata(record, { title: 'A Different Title', date: '2016/05/23' })
  assert.equal(record.year, 2018, 'the body wins over the abs page')
  assert.equal(record.title, 'Named by the body')
  assert.deepEqual(borrowed, [])
})

test('a cached page with no year leaves the year unknown rather than zero', () => {
  const record = blank()
  applyMetadata(record, { title: 'Still Nameless', date: '', abstract: '' })
  assert.equal(record.year, null, 'unknown stays unknown; 0 would be a claim')
})

test('the cache answers the second build without the network', async () => {
  writeFileSync(join(CACHE, '1234.5678.html'), BODY, 'utf8')
  let asked = 0
  const first = await buildLibrary({
    ids: ['1234.5678'],
    cache: CACHE,
    metaDir: META,
    fetchImpl: async () => ({ html: BODY }),
    metaImpl: async () => {
      asked += 1
      return { meta: { title: 'A Paper', date: '2019/03/04', abstract: 'An abstract.' } }
    },
  })
  assert.equal(asked, 1)
  assert.equal(first.records[0].year, 2019)
  assert.equal(first.metadata.length, 1)
  assert.equal(readCachedMeta(META, '1234.5678')?.title, 'A Paper')
  assert.equal(JSON.parse(readFileSync(metaFile(META, '1234.5678'), 'utf8')).date, '2019/03/04')

  const second = await buildLibrary({
    ids: ['1234.5678'],
    cache: CACHE,
    metaDir: META,
    fetchImpl: async () => ({ html: BODY }),
    metaImpl: async () => {
      asked += 1
      return { meta: { title: 'A Paper', date: '2019/03/04', abstract: 'An abstract.' } }
    },
  })
  assert.equal(asked, 1, 'the second build reads the cache')
  assert.equal(second.records[0].year, 2019)
})

test('a failed lookup is remembered as a failure, not retried forever', async () => {
  writeFileSync(join(CACHE, '1234.5678.html'), BODY, 'utf8')
  const dir = join(ROOT, 'meta-fail')
  let asked = 0
  const run = () =>
    buildLibrary({
      ids: ['1234.5678'],
      cache: CACHE,
      metaDir: dir,
      fetchImpl: async () => ({ html: BODY }),
      metaImpl: async () => {
        asked += 1
        return { error: 'HTTP 404' }
      },
    })
  const first = await run()
  const second = await run()
  assert.equal(asked, 1)
  assert.equal(first.records[0].year, null)
  assert.equal(second.records[0].year, null)
  assert.equal(readCachedMeta(dir, '1234.5678')?.error, 'HTTP 404')
})

test('no metadata directory means no network call at all', async () => {
  writeFileSync(join(CACHE, '1234.5678.html'), BODY, 'utf8')
  let asked = 0
  const result = await buildLibrary({
    ids: ['1234.5678'],
    cache: CACHE,
    fetchImpl: async () => ({ html: BODY }),
    metaImpl: async () => {
      asked += 1
      return { meta: { date: '2019/03/04' } }
    },
  })
  assert.equal(asked, 0)
  assert.equal(result.records[0].year, null)
})
