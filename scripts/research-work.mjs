// Build the work library: one record per work, two renderings of it.
//
// Usage:
//   node scripts/research-work.mjs --slug r1-verifier \
//     --survey research/out/r1-verifier.survey.json --top 12 \
//     --out research/out/work-r1-verifier.json \
//     --doc docs/research/work-r1-verifier-2026-11-24.md \
//     --reading directions/r1-verifier.work.md
//
//   node scripts/research-work.mjs --slug r4 --ids 2310.08560,2502.12110 ...
//
// Bodies come from the deep-read cache (`research/out/.cache/deep/<id>.html`)
// so a rebuild costs nothing; a missing body is fetched once and cached. The
// reading file is hand-written JSON keyed by arXiv id:
//
//   { "2606.08106": { "summary": "...", "connects": [{"id": "...", "why": "..."}], "caveats": ["..."] } }
//
// Nothing in this script writes a summary. A work whose id is absent from the
// reading file renders with an explicit "no one has written this yet".

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildWorkRecord, indexOfWorks, similarTo } from '../src/research/workrecord.js'
import { agentDigest, renderLibraryMarkdown } from '../src/research/workview.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CACHE = join(ROOT, 'research', 'out', '.cache', 'deep')
const UA = 'dsh-loom-research/0.1 (+https://github.com/darkness/dsh-loom)'

export function usage() {
  return [
    'node scripts/research-work.mjs --slug <name> [options]',
    '',
    '  --slug <name>      library name (required)',
    '  --survey <file>    take ids from this survey json (with --top)',
    '  --top <n>          how many works from the survey (default 10)',
    '  --ids <list>       explicit comma-separated ids (instead of --survey)',
    '  --out <file>       write the agent-side library json here',
    '  --doc <file>       write the human-side markdown here',
    '  --reading <file>   hand-written readings json (id -> {summary, connects, caveats})',
    '  --cache <dir>      body cache (default research/out/.cache/deep)',
    '  --figures <dir>    also save each pipeline figure under this directory',
    '  --no-fetch         never touch the network; report missing bodies instead',
    '  --date <ymd>       date stamp for the document (default: today, locale-free)',
  ].join('\n')
}

export function parseArgs(argv) {
  const out = { ids: [], fetch: true }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === '--slug') { out.slug = next; i += 1 }
    else if (flag === '--survey') { out.survey = next; i += 1 }
    else if (flag === '--top') { out.top = Number(next); i += 1 }
    else if (flag === '--ids') { out.ids = String(next || '').split(',').map((s) => s.trim()).filter(Boolean); i += 1 }
    else if (flag === '--out') { out.out = next; i += 1 }
    else if (flag === '--doc') { out.doc = next; i += 1 }
    else if (flag === '--reading') { out.reading = next; i += 1 }
    else if (flag === '--cache') { out.cache = next; i += 1 }
    else if (flag === '--figures') { out.figures = next; i += 1 }
    else if (flag === '--date') { out.date = next; i += 1 }
    else if (flag === '--no-fetch') out.fetch = false
    else if (flag === '--help' || flag === '-h') out.help = true
  }
  return out
}

/**
 * The ids a survey says are worth reading, in the survey's own order.
 *
 * Foundations first (they are what the field keeps citing), then the most
 * recent work, then whatever else the survey kept -- a library of only the most
 * cited papers is a library of the past, and a library of only the newest is a
 * library of press releases.
 */
export function selectIds(survey, { top = 10 } = {}) {
  const size = Math.max(0, Number(top) || 0)
  if (!size) return []
  const cls = survey?.cls ?? {}
  const picked = []
  const seen = new Set()
  const push = (paper) => {
    const id = paper && typeof paper.id === 'string' ? paper.id.trim() : ''
    if (!id || seen.has(id)) return
    seen.add(id)
    picked.push({ id, title: paper.title ?? '', year: paper.year ?? null })
  }
  for (const work of Array.isArray(cls.foundations) ? cls.foundations : []) {
    if (picked.length >= size) break
    push(work.arxivId ? { id: work.arxivId, title: work.title, year: work.year } : work)
  }
  for (const paper of Array.isArray(cls.sota) ? cls.sota : []) {
    if (picked.length >= size) break
    push(paper)
  }
  for (const paper of Array.isArray(survey?.b?.papers) ? survey.b.papers : []) {
    if (picked.length >= size) break
    push(paper)
  }
  return picked
}

function cacheFile(cache, id) {
  return join(cache, `${String(id).replace(/[^0-9a-zA-Z._-]/g, '_')}.html`)
}

export function readCachedBody(cache, id) {
  const file = cacheFile(cache, id)
  if (!existsSync(file)) return null
  const html = readFileSync(file, 'utf8')
  return /ltx_section|ltx_p/.test(html) ? html : null
}

async function fetchBody(id) {
  const response = await fetch(`https://arxiv.org/html/${id}`, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) return { html: '', error: `HTTP ${response.status}` }
  const html = await response.text()
  if (!/ltx_section|ltx_p/.test(html)) return { html: '', error: 'no rendered body' }
  return { html }
}

/**
 * Build every record, reporting rather than failing for each paper.
 *
 * The return value separates the three outcomes a caller has to tell apart:
 * `records` (read), `missing` (no body was available) and `figures` (downloaded
 * locally, when asked). A paper missing from `records` is never a silent
 * omission -- it is in `missing` with the reason.
 */
export async function buildLibrary({ ids = [], cache = CACHE, fetch: allowFetch = true, figuresDir = null, fetchImpl = fetchBody } = {}) {
  const records = []
  const missing = []
  const figures = []
  for (const entry of ids) {
    const id = typeof entry === 'string' ? entry : entry?.id
    if (!id) continue
    let html = readCachedBody(cache, id)
    if (!html && allowFetch) {
      try {
        const result = await fetchImpl(id)
        if (result?.html) {
          mkdirSync(cache, { recursive: true })
          writeFileSync(cacheFile(cache, id), result.html, 'utf8')
          html = result.html
        } else {
          missing.push({ id, reason: result?.error ?? 'no body' })
          continue
        }
      } catch (err) {
        missing.push({ id, reason: `fetch failed: ${err?.message ?? err}` })
        continue
      }
    }
    if (!html) {
      missing.push({ id, reason: 'not in the cache and fetching is off' })
      continue
    }
    const record = buildWorkRecord({
      id,
      html,
      origin: `https://arxiv.org/html/${id}`,
      abstract: typeof entry === 'object' ? entry.abstract ?? '' : '',
      year: typeof entry === 'object' ? entry.year ?? null : null,
      title: typeof entry === 'object' ? entry.title ?? '' : '',
    })
    records.push(record)
    if (figuresDir && record.pipeline?.figure?.url) {
      const saved = await saveFigure(figuresDir, record, fetchImpl)
      if (saved) figures.push(saved)
    }
  }
  const index = indexOfWorks(records)
  for (const record of records) {
    record.similar = similarTo(index, record.id, { k: 5 })
  }
  return { records, missing, figures, index }
}

/** Download one pipeline figure so the page works offline. */
async function saveFigure(dir, record, fetchImpl) {
  const url = record.pipeline?.figure?.url
  if (!url) return null
  const name = (record.pipeline.figure.src || 'figure.png').split('/').pop().replace(/[^0-9a-zA-Z._-]/g, '_')
  const target = join(dir, record.id, name)
  try {
    mkdirSync(dirname(target), { recursive: true })
    if (!existsSync(target)) {
      const response = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) })
      if (!response.ok) return { id: record.id, url, saved: false, reason: `HTTP ${response.status}` }
      const bytes = Buffer.from(await response.arrayBuffer())
      writeFileSync(target, bytes)
      record.pipeline.figure.local = target
      return { id: record.id, url, saved: true, bytes: bytes.length, path: target }
    }
    record.pipeline.figure.local = target
    return { id: record.id, url, saved: true, cached: true, path: target }
  } catch (err) {
    return { id: record.id, url, saved: false, reason: `${err?.message ?? err}` }
  }
}

export function readReadings(file) {
  if (!file || !existsSync(file)) return {}
  const parsed = JSON.parse(readFileSync(file, 'utf8'))
  if (!parsed || typeof parsed !== 'object') return {}
  // One author signs a whole file: `_by` at the top, repeated on every reading
  // so a single work page can say who wrote it without carrying its neighbours.
  const { _by: by, ...entries } = parsed
  const out = {}
  for (const [id, reading] of Object.entries(entries)) {
    if (!reading || typeof reading !== 'object') continue
    out[id] = reading.by ? reading : by ? { ...reading, by } : reading
  }
  return out
}

export function localDate(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readSurvey(file) {
  if (!file || !existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.slug) {
    console.log(usage())
    process.exit(args.help ? 0 : 2)
  }
  let ids = args.ids
  if (!ids.length) {
    const survey = readSurvey(args.survey)
    if (!survey) {
      console.error(`no ids and no readable survey at ${args.survey ?? '(none)'}`)
      process.exit(2)
    }
    ids = selectIds(survey, { top: args.top ?? 10 })
  }
  const cache = args.cache ? resolve(ROOT, args.cache) : CACHE
  const result = await buildLibrary({
    ids,
    cache,
    fetch: args.fetch,
    figuresDir: args.figures ? resolve(ROOT, args.figures) : null,
  })
  const readings = readReadings(args.reading ? resolve(ROOT, args.reading) : null)
  const date = args.date || localDate()

  const outFile = args.out ? resolve(ROOT, args.out) : join(ROOT, 'research', 'out', `work-${args.slug}.json`)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify({
    slug: args.slug,
    built: date,
    works: result.records,
    missing: result.missing,
    edges: result.index.edges,
    agent: agentDigest(result.records, { index: result.index }),
  }, null, 2)}\n`, 'utf8')

  const doc = renderLibraryMarkdown(result.records, { slug: args.slug, index: result.index, readings, date })
  if (args.doc) {
    const docFile = resolve(ROOT, args.doc)
    mkdirSync(dirname(docFile), { recursive: true })
    writeFileSync(docFile, doc, 'utf8')
  }

  console.log(`${args.slug}: ${result.records.length} work(s) read, ${result.missing.length} missing`)
  for (const record of result.records) {
    const points = record.mechanisms.length
    const figure = record.pipeline?.figure?.url ? 'figure' : 'no figure'
    const summary = readings[record.id]?.summary ? 'summary' : 'no summary'
    console.log(`  ${record.id}  ${points} mechanism(s)  ${figure}  ${summary}`)
  }
  for (const item of result.missing) console.log(`  missing ${item.id}: ${item.reason}`)
  if (result.figures.length) {
    const saved = result.figures.filter((figure) => figure.saved).length
    console.log(`  figures: ${saved}/${result.figures.length} saved`)
  }
  console.log(`  wrote ${outFile.slice(ROOT.length + 1)}${args.doc ? ` and ${args.doc}` : ''}`)
}

const invokedDirectly = process.argv[1] && /research-work\.mjs$/.test(process.argv[1])
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err?.stack ?? err)
    process.exit(1)
  })
}
