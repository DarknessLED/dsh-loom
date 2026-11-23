// The synthesis document is generated, not remembered: every number in it comes
// from `scripts/research-synthesis.mjs` reading files on disk. These pin the
// wiring, including the flag that decides which directory is read — a flag that
// is parsed and then ignored produces a document that looks right and is about
// the wrong corpus.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { buildSynthesis, loadSurveys, parseArgs, readIdsFromLedger } from '../../scripts/research-synthesis.mjs'

function work(arxivId, title, cites, extra = {}) {
  return { arxivId, title, citedByPapers: cites, year: 2024, inCorpus: false, ...extra }
}

function surveyFile(dir, name, works) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.survey.json`), JSON.stringify({ agg: { corpus: [], works } }), 'utf8')
}

test('--out-dir decides which surveys are read, not just where output goes', () => {
  // Parsing the flag and then reading the default directory makes the document
  // silently about the wrong corpus, which no assertion downstream can catch.
  const parsed = parseArgs(['--out-dir', 'some/other/place', '--doc', 'x.md'])
  assert.equal(parsed.outDir, 'some/other/place')
  assert.equal(parsed.dir, undefined, 'the flag does not land on a second, unused key')
  assert.equal(parsed.doc, 'x.md')
})

test('a flag with no value does not swallow the next flag', () => {
  const parsed = parseArgs(['--doc'])
  assert.equal(parsed.doc, undefined)
  assert.equal(parsed.outDir.endsWith(join('research', 'out')), true)
})

test('loadSurveys reads what exists and names what does not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synth-load-'))
  surveyFile(dir, 'r1-verifier', [work('1111.11111', 'Shared.', 3)])
  const { surveys, missing } = loadSurveys(dir, ['r1-verifier', 'r2-score-noise'])
  assert.deepEqual(Object.keys(surveys), ['r1-verifier'])
  assert.deepEqual(missing, ['r2-score-noise'])
})

test('an unreadable survey is not silently treated as an empty one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synth-bad-'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'r1-verifier.survey.json'), '{ not json', 'utf8')
  assert.throws(() => loadSurveys(dir, ['r1-verifier']), /JSON|Unexpected/i)
})

test('a direction we have read is one whose body is in the ledger', () => {
  const home = mkdtempSync(join(tmpdir(), 'synth-home-'))
  mkdirSync(join(home, 'research', 'ledger'), { recursive: true })
  const lines = [
    { id: 'ev-1', origin: 'https://arxiv.org/html/2402.03300' },
    { id: 'ev-2', origin: 'https://arxiv.org/abs/2107.03374v2' },
    { id: 'ev-3', origin: 'https://arxiv.org/search/?query=x' },
    { id: 'ev-4', origin: 'C:/somewhere/local.md' },
  ]
  writeFileSync(join(home, 'research', 'ledger', 'index.jsonl'), `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`, 'utf8')
  const ids = readIdsFromLedger(home)
  assert.deepEqual([...ids].sort(), ['2107.03374', '2402.03300'])
})

test('an empty or missing ledger means nothing is read, not that everything is', () => {
  const home = mkdtempSync(join(tmpdir(), 'synth-noleg-'))
  assert.equal(readIdsFromLedger(home).size, 0)
})

test('buildSynthesis feeds the reader count from the ledger into coverage', () => {
  const cross = buildSynthesis({
    surveys: { a: { agg: { works: [work('1111.11111', 'Shared.', 5), work('2222.22222', 'Unread.', 4)] } } },
    readIds: new Set(['1111.11111']),
    top: 2,
    generated: '2026-11-23',
  })
  assert.equal(cross.coverage.a.read, 1)
  assert.equal(cross.coverage.a.top, 2)
  assert.deepEqual(cross.coverage.a.missing, ['2222.22222'])
})

test('the generated document says which day it was generated', () => {
  const built = buildSynthesis({
    surveys: { a: { agg: { works: [work('1111.11111', 'Shared.', 5)] } } },
    readIds: new Set(),
    generated: '2026-11-23',
  })
  assert.match(built.text, /Generated 2026-11-23/)
})

test('the document never claims a work is shared without saying how many directions', () => {
  // Three directions, because the ideas table only lists works three or more
  // directions share; a two-direction work is counted in Scale and nowhere else.
  const built = buildSynthesis({
    surveys: {
      a: { agg: { works: [work('1111.11111', 'Both.', 5)] } },
      b: { agg: { works: [work('1111.11111', 'Both.', 3)] } },
      c: { agg: { works: [work('1111.11111', 'Both.', 2)] } },
    },
    readIds: new Set(),
    generated: '2026-11-23',
  })
  const row = built.text.split('\n').find((line) => line.includes('1111.11111') && line.startsWith('| '))
  assert.ok(row, 'the shared work is in a table row')
  assert.match(row, /\| 3 \|/, 'the row says how many directions cited it')
})

test('reading a survey and writing the doc twice gives the same bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synth-stable-'))
  surveyFile(dir, 'r1-verifier', [work('1111.11111', 'Shared.', 4), work('2222.22222', 'Other.', 2)])
  const { surveys } = loadSurveys(dir, ['r1-verifier'])
  const once = buildSynthesis({ surveys, readIds: new Set(), generated: '2026-11-23' }).text
  const { surveys: again } = loadSurveys(dir, ['r1-verifier'])
  const twice = buildSynthesis({ surveys: again, readIds: new Set(), generated: '2026-11-23' }).text
  assert.equal(once, twice)
})

test('the committed document is what the script produces from the committed inputs', () => {
  // Not "does it look right": does regenerating from the files on disk reproduce
  // the file in the repo. A stale document is a document about an older corpus.
  const root = join(import.meta.dirname, '..', '..')
  const docPath = join(root, 'docs', 'research', 'synthesis-2026-11-23.md')
  const readingPath = join(root, 'directions', 'synthesis.reading.md')
  let doc
  try {
    doc = readFileSync(docPath, 'utf8')
  } catch {
    return // the document is generated work; absent is not a failure of this suite
  }
  const { surveys } = loadSurveys(join(root, 'research', 'out'))
  if (!Object.keys(surveys).length) return
  const reading = readFileSync(readingPath, 'utf8')
  // The stamp is the day the document was generated, not a constant: taking it
  // from the document itself keeps this suite about "the machine half is
  // reproduced" instead of failing every time the file is regenerated.
  const stamp = /Generated (\d{4}-\d{2}-\d{2}) by/.exec(doc)
  assert.ok(stamp, 'the committed document says which day it was generated')
  const built = buildSynthesis({ surveys, readIds: new Set(), generated: stamp[1], reading })
  const machineHalf = doc.split('\n---\n')[0]
  // The ledger lives outside the repo, and two sections depend on it: which
  // works are bridges and how much of each direction has been read. Compare the
  // part that is a pure function of the committed survey files.
  const strip = (text) => text.split('## Cited by many, read by none')[0]
  assert.equal(strip(built.text), strip(machineHalf))
})
