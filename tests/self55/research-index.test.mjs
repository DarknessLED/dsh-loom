// The index must not flatter the library.
//
// Two numbers decide whether a reader trusts the shelf: how many works have a
// summary somebody actually wrote, and whether the works are grouped by the
// direction's own sub-questions. Both are easy to fake — a count of twelve when
// zero readings exist, or a single "other" bucket that technically classifies
// everything — so both are pinned here against a fixture where the answer is
// known and uneven.
//
// A third rule matters for honesty rather than tidiness: a direction whose
// library was never built is not in the index. Nine of the ten directions have
// one; the summary direction does not, and listing it as an empty shelf would
// claim a coverage the repository does not have.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { classifyWork, loadIndex, loadDirection, readingCount } from '../../src/panel/research.js'

const ROOT = mkdtempSync(join(tmpdir(), 'loom-research-index-'))
const OUT = join(ROOT, 'research', 'out')
const DIRS = join(ROOT, 'directions')
mkdirSync(OUT, { recursive: true })
mkdirSync(DIRS, { recursive: true })

const work = (id, title, abstract = '') => ({
  id,
  title,
  year: 2026,
  origin: `https://arxiv.org/html/${id}`,
  abstract,
  motivation: null,
  pipeline: { mermaid: '', figure: null, stages: [], note: '' },
  mechanisms: [],
  limitations: null,
  references: [],
  counts: {},
  vector: [],
  similar: [],
})

writeFileSync(
  join(OUT, 'work-r1-a.json'),
  JSON.stringify({
    slug: 'r1-a',
    built: '2026-11-25',
    works: [
      work('1111.11111', 'Reward hacking in the wild'),
      work('2222.22222', 'A judge that agrees with itself'),
      work('3333.33333', 'Something nobody classified'),
    ],
    missing: [],
    edges: [],
    agent: [],
  }),
)
writeFileSync(
  join(OUT, 'work-r10-b.json'),
  JSON.stringify({
    slug: 'r10-b',
    built: '2026-11-25',
    works: [work('4444.44444', 'A sequential test for promotions')],
    missing: [],
    edges: [],
    agent: [],
  }),
)
writeFileSync(
  join(DIRS, 'r1-a.json'),
  JSON.stringify({
    slug: 'r1-a',
    name: 'R1 判决与验证器',
    queries: [],
    seeds: [],
    clusters: {
      'reward hacking': ['reward hacking', 'specification gaming'],
      'judge reliability': ['judge', 'agrees with itself'],
    },
  }),
)
writeFileSync(
  join(DIRS, 'r10-b.json'),
  JSON.stringify({
    slug: 'r10-b',
    name: 'Evaluation budget meets evaluation reliability',
    queries: [],
    seeds: [],
    clusters: { 'sequential testing': ['sequential test', 'promotions'] },
  }),
)
// A direction that exists but has no library: the index must leave it out.
writeFileSync(join(DIRS, 'r9-c.json'), JSON.stringify({ slug: 'r9-c', name: 'R9 综述', queries: [], seeds: [], clusters: {} }))
// A reading file with one real summary and one entry that is only a link.
writeFileSync(
  join(DIRS, 'r1-a.works.reading.json'),
  JSON.stringify({
    _by: 'an agent that read the body (DeepSeek Harness, 2026-11-24)',
    '1111.11111': { summary: 'It names the mechanism.', connects: [{ id: '2222.22222', why: 'Same bias.' }], caveats: ['Only two tasks.'] },
    '2222.22222': { connects: [{ id: '1111.11111', why: 'Same bias.' }], caveats: [] },
  }),
)

test('only a written summary counts as a summary', () => {
  const index = loadIndex({ root: ROOT })
  const r1 = index.directions.find((d) => d.slug === 'r1-a')
  assert.equal(r1.summaries, 1, 'an entry with links but no summary is not a summary')
  assert.equal(r1.works, 3)
  assert.equal(index.directions.find((d) => d.slug === 'r10-b').summaries, 0)
})

test('readingCount is the number of entries that carry prose', () => {
  const readings = { _by: 'x', a: { summary: 'one' }, b: { caveats: [] }, c: { summary: '   ' } }
  assert.equal(readingCount(readings), 1, 'whitespace is not prose')
  assert.equal(readingCount(null), 0)
  assert.equal(readingCount({}), 0)
})

test('a direction without a library is not in the index', () => {
  const index = loadIndex({ root: ROOT })
  assert.equal(index.directions.some((d) => d.slug === 'r9-c'), false)
  assert.equal(index.directions.length, 2)
  assert.equal(index.total.directions, 2)
  assert.equal(index.total.works, 4)
})

test('classification uses the direction s own clusters, one label per work', () => {
  const clusters = {
    'reward hacking': ['reward hacking', 'specification gaming'],
    'judge reliability': ['judge', 'agrees with itself'],
  }
  assert.equal(classifyWork(work('1', 'Reward hacking in the wild'), clusters), 'reward hacking')
  assert.equal(classifyWork(work('2', 'A judge that agrees with itself'), clusters), 'judge reliability')
  assert.equal(classifyWork(work('3', 'Something nobody classified'), clusters), 'unclustered')
  // A tie is broken by the direction's own declaration order, not by chance or
  // by whichever cluster sorts first: the same corpus must classify the same
  // way on every rebuild.
  assert.equal(classifyWork(work('4', 'Judge and reward hacking together'), clusters), 'reward hacking')
  assert.equal(
    classifyWork(work('4', 'Judge and reward hacking together'), { 'judge reliability': ['judge'], 'reward hacking': ['reward hacking'] }),
    'judge reliability',
  )
})

test('the English direction name is not translated for the panel', () => {
  const index = loadIndex({ root: ROOT })
  const r10 = index.directions.find((d) => d.slug === 'r10-b')
  assert.equal(r10.name, 'Evaluation budget meets evaluation reliability')
  const detail = loadDirection({ root: ROOT, slug: 'r10-b' })
  assert.equal(detail.name, 'Evaluation budget meets evaluation reliability')
})

test('a direction list reports how many rows fell outside every cluster', () => {
  const detail = loadDirection({ root: ROOT, slug: 'r1-a' })
  assert.equal(detail.works.length, 3)
  const labels = detail.clusters.map((c) => c.label)
  assert.ok(labels.includes('unclustered'), 'the leftover bucket is named, not dropped')
  const sum = detail.clusters.reduce((total, c) => total + c.count, 0)
  assert.equal(sum, 3, 'every row is in exactly one bucket')
})

test.after(() => rmSync(ROOT, { recursive: true, force: true }))
