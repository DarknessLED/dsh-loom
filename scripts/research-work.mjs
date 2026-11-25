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

import { buildWorkRecord, cosine, indexOfWorks, similarTo, workVector } from '../src/research/workrecord.js'
import { agentDigest, renderLibraryMarkdown } from '../src/research/workview.js'
import { bodyIsUnrendered } from '../src/research/deepread.js'
import { parseAbsPage } from './research-cites.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CACHE = join(ROOT, 'research', 'out', '.cache', 'deep')
const META = join(ROOT, 'research', 'out', '.cache', 'meta')
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
    '  --no-meta          never ask arXiv for the abs page (year/title backfill)',
  ].join('\n')
}

export function parseArgs(argv) {
  const out = { ids: [], fetch: true, meta: true }
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
    else if (flag === '--no-meta') out.meta = false
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
  // Foundations and citations carry an id and a title but no abstract, so a
  // record built only from them has nothing for the vector or the cluster
  // classifier to read. The abstracts live on the candidate list; join on id.
  const prose = new Map()
  for (const paper of Array.isArray(survey?.b?.papers) ? survey.b.papers : []) {
    if (paper?.id && typeof paper.abstract === 'string' && paper.abstract) prose.set(paper.id, paper.abstract)
  }
  const push = (paper) => {
    const id = paper && typeof paper.id === 'string' ? paper.id.trim() : ''
    if (!id || seen.has(id)) return
    seen.add(id)
    // The abstract rides along: the record's vector and the panel's cluster
    // classification both read `title + abstract`, and a work whose abstract is
    // dropped at this step becomes unclassifiable for no visible reason.
    const abstract = paper.abstract || prose.get(id) || ''
    picked.push({ id, title: paper.title ?? '', year: paper.year ?? null, abstract })
  }
  for (const work of Array.isArray(cls.foundations) ? cls.foundations : []) {
    if (picked.length >= size) break
    push(work.arxivId ? { id: work.arxivId, title: work.title, year: work.year, abstract: work.abstract } : work)
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

/**
 * Everything a survey already knows about one id.
 *
 * A reading file names works the survey may have stopped returning in its top
 * slice -- the reading is the expensive half, so it still goes into the library.
 * But the survey usually still knows that work's title and year somewhere in its
 * lists, and passing `null` for both threw that away: the table printed `?` for
 * the year of a paper the survey had dated all along.
 */
export function lookupInSurvey(survey, id) {
  const want = String(id ?? '').trim()
  if (!want) return null
  const lists = []
  const cls = survey?.cls ?? {}
  for (const name of ['foundations', 'sota', 'compared']) {
    if (Array.isArray(cls[name])) lists.push(...cls[name])
  }
  if (Array.isArray(survey?.b?.papers)) lists.push(...survey.b.papers)
  for (const entry of lists) {
    if (!entry) continue
    const entryId = entry.arxivId ?? entry.id
    if (String(entryId ?? '').trim() !== want) continue
    const title = typeof entry.title === 'string' ? entry.title.replace(/^[\u2018\u2019\u201c\u201d",\s]+|[\u2018\u2019\u201c\u201d",\s]+$/g, '') : ''
    const year = Number.isFinite(Number(entry.year)) && Number(entry.year) > 1000 ? Number(entry.year) : null
    const abstract = typeof entry.abstract === 'string' ? entry.abstract : ''
    if (title || year || abstract) return { title, year, abstract }
  }
  return null
}

/**
 * The abs page, as a metadata source.
 *
 * A work enters the library through one of three doors, and two of them carry
 * no year: a reading file is hand-written prose keyed by id, and a survey row of
 * a foundation carries a title but not its date. `Number(null)` is 0, so before
 * this the record claimed to be 2,026 years old. The body does not always help
 * either -- some arXiv HTML has no document date at all -- so the abs page is
 * asked once per id and its answer is cached next to the body cache.
 */
export function metaFile(dir, id) {
  return join(dir, `${String(id).replace(/[^0-9a-zA-Z._-]/g, '_')}.json`)
}

export function readCachedMeta(dir, id) {
  const file = metaFile(dir, id)
  if (!existsSync(file)) return null
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/** `2016/05/23` -> 2016. A date without a leading year is not a year. */
export function yearOfDate(date) {
  const match = /^((?:19|20)\d{2})/.exec(String(date || '').trim())
  return match ? Number(match[1]) : null
}

/**
 * Fill the fields the record could not fill itself.
 *
 * Only unknown fields are written: a year the body stated is not overwritten by
 * a cached abs page, and a title the body carried stays the title. Returns the
 * record plus what was borrowed, so the caller can say where a number came from.
 */
export function applyMetadata(record, meta, { basis = 'arxiv-abs' } = {}) {
  if (!record || !meta) return { record, borrowed: [] }
  const borrowed = []
  if (record.year === null || record.year === undefined) {
    const year = yearOfDate(meta.date) ?? (Number(meta.year) > 1000 ? Number(meta.year) : null)
    if (year) {
      record.year = year
      record.yearBasis = basis
      borrowed.push('year')
    }
  }
  if (record.titleBasis === 'id' && typeof meta.title === 'string' && meta.title.trim()) {
    record.title = meta.title.trim()
    record.titleBasis = basis
    borrowed.push('title')
  }
  if (!record.abstract && typeof meta.abstract === 'string' && meta.abstract.trim()) {
    record.abstract = meta.abstract.trim()
    record.vector = workVector({ ...record, abstract: record.abstract })
    borrowed.push('abstract')
  }
  return { record, borrowed }
}

async function fetchMeta(id) {
  const response = await fetch(`https://arxiv.org/abs/${id}`, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) return { error: `HTTP ${response.status}` }
  const parsed = parseAbsPage(await response.text())
  if (!parsed) return { error: 'no citation metadata' }
  return { meta: { title: parsed.title, date: parsed.date, abstract: parsed.abstract } }
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
export async function buildLibrary({ ids = [], cache = CACHE, fetch: allowFetch = true, figuresDir = null, metaDir = null, meta: allowMeta = true, fetchImpl = fetchBody, metaImpl = fetchMeta } = {}) {
  const records = []
  const missing = []
  const figures = []
  const metadata = []
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
    // arXiv answers some papers with a page that only points at the PDF. It is
    // HTML, it has a title, and it has no sections -- which would quietly become
    // a record claiming the paper has no method and no abstract. That is a
    // fetching failure wearing a record's clothes, so it is reported as missing.
    if (bodyIsUnrendered(html)) {
      missing.push({ id, reason: 'arXiv serves only a pointer to the PDF, so there is no body to read' })
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
    // Three doors into the library, and two carry no date. Ask the abs page for
    // the fields the body could not supply -- once, cached next to the body, so
    // a rebuild is offline and reproducible.
    if (metaDir && allowMeta && (record.year === null || record.titleBasis === 'id' || !record.abstract)) {
      let meta = readCachedMeta(metaDir, id)
      if (!meta) {
        try {
          const result = await metaImpl(id)
          if (result?.meta) {
            meta = result.meta
            mkdirSync(metaDir, { recursive: true })
            writeFileSync(metaFile(metaDir, id), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
          } else if (result?.error) {
            meta = { error: result.error }
            mkdirSync(metaDir, { recursive: true })
            writeFileSync(metaFile(metaDir, id), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
          }
        } catch (err) {
          meta = { error: `${err?.message ?? err}` }
        }
      }
      if (meta && !meta.error) {
        const filled = applyMetadata(record, meta)
        if (filled.borrowed.length) metadata.push({ id, from: 'arxiv-abs', fields: filled.borrowed })
      }
    }
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
  return { records, missing, figures, metadata, index }
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
  // A reading is the expensive half of the library -- someone read the paper
  // and signed it. A survey rerun can drop a work it used to keep, or a
  // foundation can carry no prose at all; either way the reading must not be
  // stranded, and a library that silently shrinks under its own readings would
  // make them look like they were never written. So the reading file is part of
  // the selection, not a decoration on top of it.
  const readings = readReadings(args.reading ? resolve(ROOT, args.reading) : null)
  let ids = args.ids
  if (!ids.length) {
    const survey = readSurvey(args.survey)
    if (!survey) {
      console.error(`no ids and no readable survey at ${args.survey ?? '(none)'}`)
      process.exit(2)
    }
    ids = selectIds(survey, { top: args.top ?? 10 })
    const chosen = new Set(ids.map((entry) => (typeof entry === 'string' ? entry : entry.id)))
    for (const id of Object.keys(readings)) {
      if (chosen.has(id)) continue
      chosen.add(id)
      // The reading file carries no metadata of its own (that is the point: the
      // human half is prose), so ask the survey before passing blanks. Without
      // this, a work kept only because someone read it printed `?` for its year
      // and the id in place of a title.
      const known = lookupInSurvey(survey, id) ?? {}
      ids.push({ id, title: known.title ?? '', year: known.year ?? null, abstract: known.abstract ?? '' })
    }
  }
  const cache = args.cache ? resolve(ROOT, args.cache) : CACHE
  const result = await buildLibrary({
    ids,
    cache,
    fetch: args.fetch,
    figuresDir: args.figures ? resolve(ROOT, args.figures) : null,
    meta: args.meta !== false,
    metaDir: META,
  })
  const date = args.date || localDate()

  const outFile = args.out ? resolve(ROOT, args.out) : join(ROOT, 'research', 'out', `work-${args.slug}.json`)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify({
    slug: args.slug,
    built: date,
    works: result.records,
    missing: result.missing,
    metadata: result.metadata ?? [],
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
