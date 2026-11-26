// The 153-work library, as a search source the loop can use without the web.
//
// Why this exists: `research-leg.js` reads `ctx.web` and nothing else, so every
// reading round pays for a public search. Asked "when a measurement is too
// noisy to justify a decision", the public web returned a conference PDF, a
// Korean book site and three 404s (`trial-prose3`, rounds 2 and 4). Meanwhile
// the repository holds 153 records with abstracts, verbatim mechanism
// quotations carrying §-locators, and readers' caveats — the exact material a
// design note needs, free and re-derivable from committed bytes.
//
// This module is deliberately shaped like the thing it replaces: `search` and
// `fetchPage` with the same call signatures `runResearch` takes, so the leg can
// try the library first and fall back to the web without knowing the
// difference. `work:<slug>/<arxiv id>` is the URL scheme, which keeps the
// existing `${result.title} (${url})` rendering honest — a note that came from
// the library says so.
//
//   node tests/self57/the-loop-reads-its-own-library.test.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const HANDLE = 'work:'

function readdirSafe(dir) {
  try {
    return readdirSync(dir).filter((n) => n.startsWith('work-') && n.endsWith('.json'))
  } catch {
    return []
  }
}

function readWork(file, slug) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
  if (!parsed || !Array.isArray(parsed.works)) return null
  return parsed.works
    .filter((w) => w && typeof w.id === 'string')
    .map((w) => ({
      id: w.id,
      slug,
      title: typeof w.title === 'string' ? w.title : w.id,
      year: Number.isFinite(w.year) ? w.year : null,
      abstract: typeof w.abstract === 'string' ? w.abstract : '',
      mechanisms: Array.isArray(w.mechanisms) ? w.mechanisms : [],
    }))
}

/**
 * Load every work record under `<root>/research/out/work-*.json`.
 *
 * A missing directory is an empty library and an unreadable record is skipped:
 * the leg must be able to run in a workspace that has no library at all, and one
 * corrupt file must not take the reading leg down with it.
 *
 * @param {string|null} root
 * @returns {Array<{id: string, slug: string, title: string, year: number|null, abstract: string, mechanisms: object[]}>}
 */
export function localLibrary(root) {
  if (typeof root !== 'string' || root.trim() === '') return []
  const dir = join(root, 'research', 'out')
  try {
    if (!statSync(dir).isDirectory()) return []
  } catch {
    return []
  }
  const out = []
  for (const name of readdirSafe(dir)) {
    const slug = name.slice('work-'.length, -'.json'.length)
    const works = readWork(join(dir, name), slug)
    if (works) out.push(...works)
  }
  return out
}

const TERM_SPLIT = /[^a-z0-9§.]+/i

function termsOf(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .split(TERM_SPLIT)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4),
  )
}

function textOf(work) {
  const mech = (work.mechanisms ?? []).map((m) => `${m?.title ?? ''} ${m?.text ?? ''}`).join(' ')
  return `${work.title} ${work.abstract} ${mech}`
}

function snippetAround(work, terms) {
  const source = textOf(work)
  const lower = source.toLowerCase()
  let at = -1
  for (const t of terms) {
    const i = lower.indexOf(t)
    if (i >= 0 && (at < 0 || i < at)) at = i
  }
  if (at < 0) return source.slice(0, 200)
  const start = Math.max(0, at - 80)
  return source.slice(start, start + 200).trim()
}

/**
 * Search the library. Ranked by how many distinct query terms the work uses,
 * tie-broken by title so the order is stable across runs.
 *
 * @param {object[]} library
 * @param {string} question
 * @param {{maxResults?: number}} [options]
 * @returns {Array<{url: string, title: string, snippet: string, score: number}>}
 */
export function searchLocal(library, question, options = {}) {
  const list = Array.isArray(library) ? library : []
  const max = Number.isFinite(Number(options?.maxResults)) ? Math.max(1, Number(options.maxResults)) : 5
  const terms = termsOf(question)
  if (!list.length || !terms.size) return []
  const scored = []
  for (const work of list) {
    const hay = termsOf(textOf(work))
    let overlap = 0
    for (const t of terms) if (hay.has(t)) overlap += 1
    if (overlap === 0) continue
    scored.push({
      url: `${HANDLE}${work.slug}/${work.id}`,
      title: work.title,
      snippet: snippetAround(work, terms),
      score: overlap,
      year: work.year,
    })
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return scored.slice(0, max)
}

/**
 * Resolve a `work:<slug>/<id>` handle to a page `runResearch` can read.
 *
 * `text` carries the abstract and every mechanism quotation with its locator:
 * the passages the extraction step wants are already verbatim quotations from
 * the paper, which is the one property the web path can never guarantee.
 *
 * @param {object[]} library
 * @param {string} url
 * @returns {{url: string, title: string, text: string}|null}
 */
export function fetchLocal(library, url) {
  const list = Array.isArray(library) ? library : []
  if (typeof url !== 'string' || !url.startsWith(HANDLE)) return null
  const want = url.slice(HANDLE.length)
  const work = list.find((w) => `${w.slug}/${w.id}` === want)
  if (!work) return null
  const parts = []
  if (work.year) parts.push(`Year: ${work.year}`)
  if (work.abstract) parts.push(work.abstract)
  for (const m of work.mechanisms ?? []) {
    const locator = typeof m?.locator === 'string' ? m.locator : ''
    const body = typeof m?.text === 'string' ? m.text : ''
    if (!body) continue
    parts.push(`${locator ? `${locator}: ` : ''}${body}`)
  }
  const text = parts.join('\n\n')
  return {
    url,
    title: work.title,
    // `runResearch` reads `page.body.content` and `page.statusCode`, so the page
    // is shaped like a provider's answer. `text` stays for callers that just
    // want the prose (and for the specs that pin it).
    text,
    body: { kind: 'text', content: text },
    statusCode: 200,
  }
}

/**
 * A `{search, fetchPage}` pair bound to one library, so the leg can pass it to
 * `runResearch` as its dependency injection and never touch the network.
 *
 * The signatures match what `runResearch` actually calls: `search(query, opts)`
 * positionally and reading `res.sources`, `fetchPage(url)` reading the page
 * straight back. `localSource` returns `{results}` because that is the shape a
 * search provider answers with; `preferredSource` adapts to `sources` because
 * that is the shape the pipeline reads.
 *
 * @param {object[]} library
 */
export function localSource(library) {
  const list = Array.isArray(library) ? library : []
  return {
    search: async ({ query, maxResults }) => ({ results: searchLocal(list, query, { maxResults }) }),
    fetchPage: async ({ url }) => fetchLocal(list, url),
  }
}

/**
 * The library first, the web second.
 *
 * Order matters and is the whole point: the library is free, deterministic and
 * re-derivable from committed bytes; the web costs a network round trip, a
 * timeout, and a 404 rate high enough that four of nine gap rounds in the
 * 2026-11-26 audit read nothing at all. So a question the library can answer is
 * never sent to the web, and a question it cannot answer still gets a search.
 *
 * `source()` reports which one answered the last call, so the round can record
 * it: "read two pages" means something different when those pages were already
 * in the tree.
 *
 * @param {{library?: object[], web?: object|null}} options
 */
export function preferredSource({ library = [], web = null } = {}) {
  const list = Array.isArray(library) ? library : []
  const remote = web && typeof web.search === 'function' ? web : null
  let answered = list.length ? 'library' : 'none'
  return {
    /**
     * `runResearch` calls this as `search(query, {maxResults})` and reads
     * `res.sources`; a provider would answer `{results}`, so both are emitted.
     */
    async search(query, opts = {}) {
      const maxResults = Math.max(1, Number(opts?.maxResults) || 8)
      if (list.length) {
        const hits = searchLocal(list, query, { maxResults })
        if (hits.length) {
          answered = 'library'
          return { results: hits, sources: hits }
        }
      }
      if (!remote) {
        answered = 'none'
        return { results: [], sources: [] }
      }
      answered = 'web'
      const res = await remote.search({ query, maxResults })
      const sources = Array.isArray(res?.sources) ? res.sources : Array.isArray(res?.results) ? res.results : []
      return { ...res, results: sources, sources }
    },
    /**
     * `runResearch` calls this as `fetchPage(url)`; provider-style callers pass
     * `{url}`. Both are accepted because the two call sites already exist and a
     * page fetch that silently returns null reads in the ledger as "read
     * nothing", which is the failure this whole module is meant to fix.
     */
    async fetchPage(arg) {
      const url = typeof arg === 'string' ? arg : arg?.url
      if (typeof url === 'string' && url.startsWith(HANDLE)) return fetchLocal(list, url)
      if (!remote || typeof remote.fetch !== 'function') return null
      return remote.fetch({ url })
    },
    source() {
      return answered
    },
  }
}
