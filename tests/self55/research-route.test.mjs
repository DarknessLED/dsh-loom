// The library has no door.
//
// `src/research/workrecord.js` and `workview.js` build one record per work and
// two views of it, but nothing in the product imports either: the importers are
// `scripts/research-work.mjs` and specs. The panel's only route serves campaigns,
// so a reader who wants the library has to run a script and open a file — which
// is the same as not shipping it.
//
// This spec pins the read-only route that closes that: one prefix path, three
// answers (index, one direction, one work), GET only, and a missing directory
// that returns an empty index instead of a 500 because "not built yet" is a
// state a reader will meet before any other.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  RESEARCH_PATH,
  researchRoute,
  routeResearch,
} from '../../src/panel/research.js'

const ROOT = mkdtempSync(join(tmpdir(), 'loom-research-route-'))

function lib(slug, names, options = {}) {
  const dir = join(ROOT, 'research', 'out')
  mkdirSync(dir, { recursive: true })
  const works = names.map((name, index) => ({
    id: `2601.0000${index}`,
    title: `Work ${name}`,
    year: 2026,
    origin: `https://arxiv.org/html/2601.0000${index}`,
    abstract: 'An abstract.',
    motivation: { text: 'Because the old way was wrong.', locator: '§1', anchor: 'S1.p1.1' },
    pipeline: {
      mermaid: 'flowchart LR\n  N0["§2 Method"]',
      figure: { id: 'S2.F1', src: `2601.0000${index}v1/p.png`, url: 'https://example/p.png', caption: 'A pipeline.', locator: '§2', inMethod: true, kind: 'img' },
      stages: [{ locator: '§2 Method', title: 'Method' }],
      note: '',
    },
    mechanisms: [
      { locator: '§2.1', title: 'First step', text: 'x'.repeat(220), chars: 220, sections: [{ locator: '§2.1', title: 'First step' }], merged: 1 },
    ],
    limitations: { text: 'The authors admit it is small.', locator: '§6', anchor: 'S6.p1.1' },
    references: [],
    counts: { sections: 2, paragraphs: 3, mechanisms: 1, references: 0 },
    vector: new Array(256).fill(0).map((_, i) => (i === 0 ? 1 : 0)),
    similar: [],
  }))
  writeFileSync(
    join(dir, `work-${slug}.json`),
    JSON.stringify({
      slug,
      built: '2026-11-25',
      works,
      missing: [],
      edges: names.length > 1 ? [{ from: `2601.00000`, to: `2601.00001`, kind: 'cites' }] : [],
      agent: [],
    }),
  )
  const dd = join(ROOT, 'directions')
  mkdirSync(dd, { recursive: true })
  writeFileSync(
    join(dd, `${slug}.json`),
    JSON.stringify({
      slug,
      name: options.name ?? 'R1 a direction',
      queries: [],
      seeds: [],
      clusters: { 'first cluster': ['wrong', 'old way'], 'second cluster': ['pipeline'] },
    }),
  )
}

lib('r1-a', ['a', 'b'], { name: 'R1 判决与验证器' })
lib('r2-b', ['c'], { name: 'Evaluation budget meets evaluation reliability' })

test('the route names one prefix path', () => {
  const route = researchRoute({ root: ROOT })
  assert.equal(route.path, RESEARCH_PATH)
  assert.equal(RESEARCH_PATH, '/dsh-loom/research')
  assert.equal(route.kind, 'prefix', 'one prefix route serves both the index and one work')
  assert.equal(typeof route.handler, 'function')
})

test('GET the root is the index, with counts a reader can trust', () => {
  const out = routeResearch({ root: ROOT }, { method: 'GET', url: '/dsh-loom/research' })
  assert.equal(out.status, 200)
  const body = JSON.parse(out.body)
  assert.equal(body.directions.length, 2)
  const first = body.directions.find((d) => d.slug === 'r1-a')
  assert.equal(first.name, 'R1 判决与验证器')
  assert.equal(first.works, 2)
  assert.equal(first.figures, 2)
  assert.equal(first.edges, 1)
  assert.equal(first.summaries, 0, 'no reading file means zero summaries, not a missing field')
  assert.equal(body.total.directions, 2)
  assert.equal(body.total.works, 3)
})

test('GET one direction lists its works with the fields a list row needs', () => {
  const out = routeResearch({ root: ROOT }, { method: 'GET', url: '/dsh-loom/research/r1-a' })
  assert.equal(out.status, 200)
  const body = JSON.parse(out.body)
  assert.equal(body.slug, 'r1-a')
  assert.equal(body.works.length, 2)
  const row = body.works[0]
  assert.equal(row.id, '2601.00000')
  assert.equal(typeof row.title, 'string')
  assert.equal(row.mechanisms, 1)
  assert.equal(row.hasFigure, true)
  assert.equal(row.hasSummary, false)
  assert.ok(body.clusters.length >= 1, 'the list is classified, not a flat dump')
  assert.ok(body.clusters.every((c) => typeof c.label === 'string' && Number.isFinite(c.count)))
  assert.ok(row.cluster, 'every row names one cluster so the list can be grouped')
})

test('GET one work returns the page a person reads, five sections and all', () => {
  const out = routeResearch({ root: ROOT }, { method: 'GET', url: '/dsh-loom/research/r1-a/2601.00000' })
  assert.equal(out.status, 200)
  const body = JSON.parse(out.body)
  assert.equal(body.record.id, '2601.00000')
  assert.equal(typeof body.markdown, 'string')
  for (const heading of ['出发点', 'Pipeline', '机制', '总结与展望', '不足之处']) {
    assert.ok(body.markdown.includes(`## ${heading}`), `the page keeps the ${heading} section`)
  }
  assert.ok(body.markdown.includes('```mermaid'), 'the diagram reaches the page as a block the panel can render')
  assert.equal(body.record.pipeline.figure.url, 'https://example/p.png', 'the figure keeps its URL for the panel to show')
})

test('a path this route does not serve is a 404, and a write is a 405', () => {
  const root = { root: ROOT }
  assert.equal(routeResearch(root, { method: 'GET', url: '/dsh-loom/research/nope/nope' }).status, 404)
  assert.equal(routeResearch(root, { method: 'GET', url: '/dsh-loom/research/r1-a/9999.99999' }).status, 404)
  const post = routeResearch(root, { method: 'POST', url: '/dsh-loom/research' })
  assert.equal(post.status, 405, 'a read-only route refuses writes before reading anything')
  assert.equal(post.headers.allow, 'GET')
})

test('a directory that was never built is an empty index, not a 500', () => {
  const empty = mkdtempSync(join(tmpdir(), 'loom-research-empty-'))
  try {
    const out = routeResearch({ root: empty }, { method: 'GET', url: '/dsh-loom/research' })
    assert.equal(out.status, 200, '"not built yet" is a state, not an error')
    const body = JSON.parse(out.body)
    assert.deepEqual(body.directions, [])
    assert.equal(body.total.works, 0)
  } finally {
    rmSync(empty, { recursive: true, force: true })
  }
})

test.after(() => rmSync(ROOT, { recursive: true, force: true }))
