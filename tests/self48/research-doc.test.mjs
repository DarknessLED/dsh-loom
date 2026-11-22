// The document generator is where a machine table becomes a page a person
// reads. Two things must stay true for that to be honest:
//
//   * the counts come from the survey file, not from the prose writer's memory;
//   * a direction with no hand-written reading says so, instead of looking
//     exactly like one that was actually read.
//
// It runs as a CLI, so the spec drives it the way a person would: a fixture
// directory in, files on disk out.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(fileURLToPath(new URL('../../', import.meta.url)), 'scripts/research-doc.mjs')

function survey(overrides = {}) {
  return {
    direction: { slug: 'fixture', name: 'Fixture direction', clusters: { alpha: ['alpha'] } },
    pages: 2,
    b: { candidates: 120, papers: [{ id: '1' }, { id: '2' }], runs: [{ status: 'ok', returned: 40 }], warning: null },
    agg: {
      works: [
        { title: 'A foundational work.', year: 2023, citedByPapers: 9, totalCites: 20, inCorpus: true, arxivId: '2301.00001' },
        { title: 'A thing everyone cites but nobody found.', year: 2019, citedByPapers: 6, totalCites: 9, inCorpus: false },
        { title: 'Cited once, not a foundation.', year: 2024, citedByPapers: 1, totalCites: 1, inCorpus: true },
      ],
    },
    cls: {
      foundations: [{ title: 'A foundational work.', year: 2023, citedByPapers: 9, totalCites: 20, arxivId: '2301.00001' }],
      compared: [{ title: 'A foundational work.', year: 2023, citedByPapers: 9, totalCites: 20, arxivId: '2301.00001' }],
      openings: [{ cluster: 'alpha', count: 7, paper: { title: 'First in alpha', date: '2023-01-02', id: '2301.00002' } }],
      sota: [{ paper: { title: 'Newest', date: '2026-11-01', id: '2611.00003' } }],
    },
    referenceCount: 20,
    traces: [{ entries: [] }],
    failures: [],
    ...overrides,
  }
}

function fixtureDir(payload, reading) {
  const root = mkdtempSync(join(tmpdir(), 'rsdoc-'))
  mkdirSync(join(root, 'research/out'), { recursive: true })
  mkdirSync(join(root, 'directions'), { recursive: true })
  writeFileSync(join(root, 'research/out/fixture.survey.json'), JSON.stringify(payload), 'utf8')
  if (reading !== undefined) writeFileSync(join(root, 'directions/fixture.reading.md'), reading, 'utf8')
  return root
}

test('the generated page carries the survey counts and the link to the arXiv record', () => {
  const root = fixtureDir(survey(), '## my reading\n\nThis is what I think.\n')
  const out = join(root, 'docs/research')
  execFileSync(process.execPath, [SCRIPT, 'fixture', '--root', root, '--out', out], { stdio: 'pipe' })
  const page = readFileSync(join(out, `fixture-survey-${new Date().toISOString().slice(0, 10)}.md`), 'utf8')
  assert.match(page, /120/, 'candidate count is copied from the survey')
  assert.match(page, /9/, 'the foundation table keeps the citation count')
  assert.match(page, /arxiv\.org\/abs\/2301\.00001/, 'a work with an id links to it')
  assert.match(page, /This is what I think/, 'the hand-written reading is carried verbatim')
  assert.match(page, /本语料内/, 'the caveat that these are in-corpus counts survives generation')
})

test('a missing reading is printed as a missing reading, not as a thin conclusion', () => {
  const root = fixtureDir(survey())
  const out = join(root, 'docs/research')
  execFileSync(process.execPath, [SCRIPT, 'fixture', '--root', root, '--out', out], { stdio: 'pipe' })
  const page = readFileSync(join(out, `fixture-survey-${new Date().toISOString().slice(0, 10)}.md`), 'utf8')
  assert.match(page, /还没有人写的结论段/)
  assert.match(page, /不要把它当结论用/)
})

test('the gap list is "cited repeatedly and never found", not "not read"', () => {
  const root = fixtureDir(survey(), 'x\n')
  const out = join(root, 'docs/research')
  execFileSync(process.execPath, [SCRIPT, 'fixture', '--root', root, '--out', out], { stdio: 'pipe' })
  const page = readFileSync(join(out, `fixture-survey-${new Date().toISOString().slice(0, 10)}.md`), 'utf8')
  assert.match(page, /nobody found/, 'the uncited-in-corpus work appears')
  assert.doesNotMatch(page, /Cited once, not a foundation/, 'a single-citation work is not a gap')
})

test('no survey file is a named failure, not an empty page', () => {
  const root = mkdtempSync(join(tmpdir(), 'rsdoc-'))
  mkdirSync(join(root, 'research/out'), { recursive: true })
  let failed = null
  try {
    execFileSync(process.execPath, [SCRIPT, 'absent', '--root', root, '--out', join(root, 'docs')], { stdio: 'pipe' })
  } catch (err) {
    failed = err
  }
  assert.ok(failed, 'the generator exits non-zero when there is nothing to write')
  assert.ok(!existsSync(join(root, 'docs/absent-survey-' + new Date().toISOString().slice(0, 10) + '.md')))
})

test('without the direction file the split is not invented, only omitted', () => {
  // A survey outlives the direction config that produced it. If the file is
  // gone, "18 hand-written + 8 backfilled" becomes a guess - every run would
  // look like a backfill. Say the split is unavailable instead of guessing.
  const root = fixtureDir(survey(), 'x\n')
  rmSync(join(root, 'directions'), { recursive: true, force: true })
  const out = join(root, 'docs/research')
  execFileSync(process.execPath, [SCRIPT, 'fixture', '--root', root, '--out', out], { stdio: 'pipe' })
  const page = readFileSync(join(out, `fixture-survey-${new Date().toISOString().slice(0, 10)}.md`), 'utf8')
  assert.match(page, /分不出手写与回填/)
  assert.doesNotMatch(page, /条回填；/)
})
