#!/usr/bin/env node
/**
 * Turn eight separate surveys into one document about all of them.
 *
 * Each direction answers "what does this literature rest on". None of them
 * answers "do these literatures rest on the same things", and that second
 * question is the one that changes what we build. This reads the survey files
 * and the research ledger, and writes the machine half of
 * `docs/research/synthesis-*.md`; the prose after the rule is handed in.
 *
 * Which papers have been read is decided by the ledger's evidence, not by a
 * list kept in a file: an evidence snapshot whose origin is
 * `https://arxiv.org/html/<id>` *is* a body we have read, and that survives
 * every cleanup of `.tmp/`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bridges, crossDirection, pairMatrix, readingCoverage, renderSynthesis } from '../src/research/synthesis.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const DIRECTIONS = [
  'r1-verifier',
  'r2-score-noise',
  'r3-budget-stop',
  'r4-knowledge',
  'r5-human',
  'r6-containment',
  'r7-selfmod',
  'r8-research-method',
  'r10-eval-budget',
]

export function parseArgs(argv) {
  const out = { outDir: join(ROOT, 'research', 'out'), doc: null, reading: null, home: null, top: 20 }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === '--out-dir') { out.outDir = next; i += 1 }
    else if (flag === '--doc') { out.doc = next; i += 1 }
    else if (flag === '--reading') { out.reading = next; i += 1 }
    else if (flag === '--home') { out.home = next; i += 1 }
    else if (flag === '--top') { out.top = Number(next); i += 1 }
    else if (flag === '--help' || flag === '-h') out.help = true
  }
  return out
}

/** Read every survey that exists; a missing one is reported, not invented. */
export function loadSurveys(dir, directions = DIRECTIONS) {
  const surveys = {}
  const missing = []
  for (const direction of directions) {
    const file = join(dir, `${direction}.survey.json`)
    if (!existsSync(file)) {
      missing.push(direction)
      continue
    }
    surveys[direction] = JSON.parse(readFileSync(file, 'utf8'))
  }
  return { surveys, missing }
}

/**
 * The arXiv ids whose body is in the ledger.
 *
 * Read from the evidence index rather than from a list: the index records where
 * each snapshot came from, and a snapshot of `arxiv.org/html/<id>` cannot exist
 * unless somebody fetched and stored that body.
 */
export function readIdsFromLedger(home) {
  const file = join(home, 'research', 'ledger', 'index.jsonl')
  if (!existsSync(file)) return new Set()
  const ids = new Set()
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue
    }
    const match = /arxiv\.org\/(?:abs|html)\/([0-9]{4}\.[0-9]{4,5})/i.exec(String(record?.origin ?? ''))
    if (match) ids.add(match[1])
  }
  return ids
}

function localStamp(date = new Date()) {
  // A document dated by UTC is dated wrong for most of the day in this time
  // zone; the file name is read by people, so it uses local time.
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function buildSynthesis({ surveys, readIds, top = 20, generated, reading = '' }) {
  const cross = crossDirection(surveys)
  const matrix = pairMatrix(cross, { top })
  const bridgeRows = bridges(cross, { minDirections: 4, readIds })
  const coverage = readingCoverage(cross, readIds, { top: 40 })
  const text = renderSynthesis({ cross, matrix, bridgeRows, coverage, generated, reading })
  return { cross, matrix, bridgeRows, coverage, text }
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    console.log('usage: node scripts/research-synthesis.mjs [--out-dir research/out] [--doc docs/research/synthesis-YYYY-MM-DD.md] [--reading directions/synthesis.reading.md] [--home <loom home>]')
    return
  }
  const home = args.home || join(homedir(), '.dsh', 'loom')
  const { surveys, missing } = loadSurveys(args.outDir)
  if (!Object.keys(surveys).length) {
    console.error(`no survey files in ${args.outDir}`)
    process.exitCode = 2
    return
  }
  if (missing.length) console.error(`missing survey(s): ${missing.join(', ')}`)

  const readIds = readIdsFromLedger(home)
  const generated = localStamp()
  const reading = args.reading && existsSync(args.reading) ? readFileSync(args.reading, 'utf8') : ''
  const built = buildSynthesis({ surveys, readIds, top: args.top, generated, reading })

  if (args.doc) {
    mkdirSync(dirname(resolve(args.doc)), { recursive: true })
    writeFileSync(resolve(args.doc), `${built.text}\n`, 'utf8')
    console.log(`wrote ${args.doc}`)
  }
  const { totals } = built.cross
  console.log(`${totals.directions} direction(s), ${totals.union} distinct works cited`)
  const shared = Object.entries(totals.shared)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([n, c]) => `≥${n}: ${c}`)
    .join(', ')
  console.log(`shared: ${shared}`)
  if (built.matrix.lonely.length) console.log(`shares nothing: ${built.matrix.lonely.map((l) => l.direction).join(', ')}`)
  console.log(`bridges (cited by ≥4, unread): ${built.bridgeRows.length}`)
  for (const [direction, row] of Object.entries(built.coverage)) {
    console.log(`  ${direction}: read ${row.read}/${row.top} of its most-cited works`)
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('research-synthesis.mjs')
if (invokedDirectly) main(process.argv.slice(2))
