#!/usr/bin/env node
/**
 * Fill the body cache for a list of arXiv ids, several at a time.
 *
 * The deep-read pass needs one HTML body per paper. Fetching them one after
 * another is the whole cost of a survey: 250 KB per page at ~2 s each, so 274
 * papers is ten minutes of nothing. This pulls a few at once, backs off when
 * arXiv pushes back, and never re-fetches a body that is already on disk.
 *
 * The scoring/parsing is not here. This only decides what to fetch and in what
 * order; `research-deepread.mjs` is what reads a body and writes a note.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CACHE = join(ROOT, 'research', 'out', '.cache', 'deep')

const UA =
  'Mozilla/5.0 (compatible; dsh-loom research/1.0; +https://github.com/DarknessLED/dsh-loom)'
const TIMEOUT_MS = 90_000

/** arXiv ids, de-duplicated, in the order given. */
export function uniqueIds(ids) {
  const seen = new Set()
  const out = []
  for (const raw of ids ?? []) {
    const id = String(raw ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * Split ids into the ones that still need a body and the ones that do not.
 *
 * A cached file only counts when it looks like a rendered body: arXiv answers
 * some ids with a one-line pointer to the PDF, and that answer must not be
 * remembered as a hit, or the paper reads as "no paragraphs" for ever.
 */
export function planFetch(ids, { cache = CACHE, read = readFileSync, exists = existsSync } = {}) {
  const staged = []
  const have = []
  for (const id of uniqueIds(ids)) {
    const file = join(cache, `${id.replace(/[^0-9a-zA-Z._-]/g, '_')}.html`)
    if (exists(file)) {
      let cached = ''
      try {
        cached = read(file, 'utf8')
      } catch {
        cached = ''
      }
      if (/ltx_section|ltx_p/.test(cached)) {
        have.push(id)
        continue
      }
    }
    staged.push({ id, file })
  }
  return { staged, have }
}

/** Round-robin over `size` buckets: the unit of work handed to each worker. */
export function chunk(list, size) {
  const buckets = Array.from({ length: Math.max(1, size | 0) }, () => [])
  list.forEach((item, index) => buckets[index % buckets.length].push(item))
  return buckets.filter((bucket) => bucket.length > 0)
}

async function fetchOne(id, file, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  let response
  try {
    response = await fetchImpl(`https://arxiv.org/html/${id}`, {
      headers: { 'user-agent': UA, accept: 'text/html' },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    return { id, ok: false, error: `request failed: ${err?.message ?? err}` }
  }
  if (!response.ok) return { id, ok: false, error: `HTTP ${response.status}` }
  const html = await response.text()
  if (!/ltx_section|ltx_p/.test(html)) {
    return { id, ok: false, error: 'no rendered body (arXiv has no HTML for this paper yet)' }
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html, 'utf8')
  return { id, ok: true, bytes: html.length }
}

/**
 * Fetch a batch with a few workers, retrying only what a transient answer lost.
 *
 * 429 and 503 are the two answers that mean "later", not "never", so those come
 * back for another go; a 404 or a PDF-pointer page is final and is reported as
 * unread rather than retried into the ground.
 */
export async function prefetchAll(
  ids,
  { cache = CACHE, concurrency = 4, retries = 2, fetchImpl = fetch, log = () => {} } = {},
) {
  const { staged, have } = planFetch(ids, { cache })
  let pending = staged
  const results = []
  for (let attempt = 0; attempt <= retries && pending.length > 0; attempt += 1) {
    if (attempt > 0) log(`retry ${attempt}: ${pending.length} id(s) left`)
    const buckets = chunk(pending, concurrency)
    const failed = []
    await Promise.all(
      buckets.map(async (bucket) => {
        for (const { id, file } of bucket) {
          const result = await fetchOne(id, file, { fetchImpl })
          if (result.ok) {
            results.push(result)
            log(`ok ${id} ${Math.round((result.bytes ?? 0) / 1024)} KB`)
          } else if (/HTTP (429|503)/.test(result.error ?? '')) {
            failed.push({ id, file })
            log(`again ${id} ${result.error}`)
          } else {
            results.push(result)
            log(`skip ${id} ${result.error}`)
          }
        }
      }),
    )
    pending = failed
  }
  for (const { id, file } of pending) results.push({ id, file, ok: false, error: 'still failing' })
  const ok = results.filter((r) => r.ok).length
  return { ok, unread: results.filter((r) => !r.ok), already: have.length, results }
}

function parseArgs(argv) {
  const out = { idsFile: null, cache: CACHE, concurrency: 4, retries: 2 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--ids') out.idsFile = argv[++i]
    else if (arg === '--cache') out.cache = argv[++i]
    else if (arg === '--concurrency') out.concurrency = Number(argv[++i])
    else if (arg === '--retries') out.retries = Number(argv[++i])
  }
  return out
}

/** Accepts either a bare array or the per-direction map the survey writes. */
export function idsFromList(value) {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : v?.id))
  const ids = []
  for (const entry of Object.values(value ?? {})) {
    for (const paper of entry?.papers ?? []) ids.push(paper?.id)
  }
  return ids
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('research-prefetch.mjs')
if (invokedDirectly) {
  const options = parseArgs(process.argv.slice(2))
  if (!options.idsFile) {
    console.error('usage: node scripts/research-prefetch.mjs --ids .tmp/list30.json [--concurrency 4]')
    process.exit(2)
  }
  const ids = idsFromList(JSON.parse(readFileSync(options.idsFile, 'utf8')))
  console.log(`${ids.length} id(s) requested, cache ${options.cache}`)
  const summary = await prefetchAll(ids, {
    cache: options.cache,
    concurrency: options.concurrency,
    retries: options.retries,
    log: (line) => console.log(line),
  })
  console.log(`\n${summary.ok} fetched, ${summary.already} already cached, ${summary.unread.length} unread`)
  for (const miss of summary.unread) console.log(`  unread ${miss.id}: ${miss.error}`)
}
