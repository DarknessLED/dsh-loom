/**
 * The library's door: a read-only route over the structured research shelf.
 *
 * `src/research/workrecord.js` builds one record per work and `workview.js`
 * renders two views of it, but nothing in the product imported either — the
 * only importers were the build script and specs. A shelf nobody can open is
 * not a shelf, so this module serves it: one prefix path, three answers.
 *
 *   GET /dsh-loom/research                the index: one row per direction
 *   GET /dsh-loom/research/<slug>         one direction: clusters and rows
 *   GET /dsh-loom/research/<slug>/<id>    one work: the record, the page, the reading
 *
 * Design rules, each one forced by a way a shelf lies:
 *
 *   * `summaries` counts entries that carry prose. Nine of the ten libraries
 *     have no hand-written reading yet; an index that printed "12" because the
 *     file exists would claim work nobody did.
 *   * A direction without a library file is not in the index. Listing it as an
 *     empty shelf claims coverage the repository does not have.
 *   * A missing `research/out` directory is an empty index with status 200,
 *     because "not built yet" is the first state a reader meets, not an error.
 *   * Classification is recomputed from the direction's own cluster keywords;
 *     the survey's `byCluster` is a serialised Map and comes back empty, so
 *     trusting it would put every work in one bucket.
 *   * The page a person reads is produced by `renderWorkMarkdown` — the same
 *     function that writes the Markdown file — so the panel cannot drift from
 *     the file it claims to show.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderWorkMarkdown } from '../research/workview.js'

/** The one path this route owns; everything below it is the same shelf. */
export const RESEARCH_PATH = '/dsh-loom/research'

/** The plugin's own directory: `research/out` and `directions` are beside it. */
const HERE = dirname(fileURLToPath(import.meta.url))

function rootOf(options) {
  return resolve(options?.root ?? process.env.LOOM_RESEARCH_ROOT ?? join(HERE, '..', '..'))
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function listLibraries(root) {
  const out = join(root, 'research', 'out')
  if (!existsSync(out)) return []
  try {
    return readdirSync(out)
      .filter((name) => /^work-[^.]+\.json$/.test(name))
      .map((name) => ({ slug: name.slice(5, -5), file: join(out, name) }))
      .sort((a, b) => a.slug.localeCompare(b.slug))
  } catch {
    return []
  }
}

function directionOf(root, slug) {
  return readJson(join(root, 'directions', `${slug}.json`))
}

function readingsOf(root, slug) {
  const file = join(root, 'directions', `${slug}.works.reading.json`)
  const parsed = readJson(file)
  if (!parsed || typeof parsed !== 'object') return {}
  const { _by: by, ...entries } = parsed
  const out = {}
  for (const [id, reading] of Object.entries(entries)) {
    if (!reading || typeof reading !== 'object') continue
    // A reading file may sign itself once at the top; every entry inherits the
    // signature, because a page that credits "a person" for an agent's reading
    // is the same failure as a page with no reading at all.
    out[id] = reading.by ? reading : by ? { ...reading, by } : reading
  }
  return out
}

/**
 * How many readings carry prose. A links-only entry is not a summary.
 *
 * `ids` narrows the count to the works the library actually has. A reading file
 * outlives the survey that produced it: r2's named fourteen works, the library
 * holds eleven, and an un-narrowed count printed `14/11` -- a summary count
 * larger than the shelf it summarises, which is the same lie as counting a
 * missing file as full.
 */
export function readingCount(readings, ids = null) {
  if (!readings || typeof readings !== 'object') return 0
  const only = ids ? new Set(ids) : null
  let count = 0
  for (const [id, reading] of Object.entries(readings)) {
    if (id === '_by') continue
    if (only && !only.has(id)) continue
    if (typeof reading?.summary === 'string' && reading.summary.trim()) count += 1
  }
  return count
}

/**
 * Which of the direction's sub-questions one work answers.
 *
 * The published `cls.byCluster` is a serialised Map and reads back as `{}`, so
 * this is recomputed from the keywords the direction file declares. Ties go to
 * the earlier declaration, which keeps one corpus classifying the same way on
 * every rebuild; a work no keyword reaches is `unclustered`, printed rather than
 * dropped.
 */
export function classifyWork(work, clusters) {
  const text = `${work?.title ?? ''} ${work?.abstract ?? ''}`.toLowerCase()
  if (!text.trim() || !clusters || typeof clusters !== 'object') return 'unclustered'
  let best = null
  let bestHits = 0
  for (const [label, keywords] of Object.entries(clusters)) {
    const list = Array.isArray(keywords) ? keywords : []
    let hits = 0
    for (const keyword of list) {
      const needle = String(keyword ?? '').toLowerCase().trim()
      if (needle && text.includes(needle)) hits += 1
    }
    // Strictly greater: the first label that reaches the top count wins.
    if (hits > bestHits) {
      best = label
      bestHits = hits
    }
  }
  return bestHits > 0 && best ? best : 'unclustered'
}

function citedByCounts(edges) {
  const counts = new Map()
  for (const edge of Array.isArray(edges) ? edges : []) {
    const to = edge?.to
    if (typeof to !== 'string') continue
    counts.set(to, (counts.get(to) ?? 0) + 1)
  }
  return counts
}

/**
 * The index: one row per direction that actually has a library.
 *
 * Only the header fields of each library are read, so the index stays cheap
 * even when every record is a few hundred kilobytes.
 */
export function loadIndex(options = {}) {
  const root = rootOf(options)
  const directions = []
  let works = 0
  let figures = 0
  let missing = 0
  for (const { slug, file } of listLibraries(root)) {
    const lib = readJson(file)
    if (!lib) continue
    const rows = Array.isArray(lib.works) ? lib.works : []
    const figureCount = rows.filter((work) => work?.pipeline?.figure?.url).length
    const direction = directionOf(root, slug)
    const summaries = readingCount(readingsOf(root, slug), rows.map((work) => work?.id).filter(Boolean))
    directions.push({
      slug,
      name: typeof direction?.name === 'string' && direction.name.trim() ? direction.name.trim() : slug,
      works: rows.length,
      figures: figureCount,
      missing: Array.isArray(lib.missing) ? lib.missing.length : 0,
      edges: Array.isArray(lib.edges) ? lib.edges.length : 0,
      summaries,
      built: typeof lib.built === 'string' ? lib.built : null,
    })
    works += rows.length
    figures += figureCount
    missing += Array.isArray(lib.missing) ? lib.missing.length : 0
  }
  return {
    directions,
    total: { directions: directions.length, works, figures, missing },
  }
}

/**
 * One direction: its clusters and one row per work.
 *
 * Returns null when the library file does not exist, so the route can answer
 * 404 instead of an empty shelf that looks like a built-but-empty direction.
 */
export function loadDirection(options = {}) {
  const root = rootOf(options)
  const slug = String(options.slug ?? '')
  if (!slug) return null
  const found = listLibraries(root).find((entry) => entry.slug === slug)
  if (!found) return null
  const lib = readJson(found.file)
  if (!lib) return null
  const direction = directionOf(root, slug)
  const clusters = direction?.clusters && typeof direction.clusters === 'object' ? direction.clusters : {}
  const readings = readingsOf(root, slug)
  const cited = citedByCounts(lib.edges)
  const counts = new Map()
  const works = (Array.isArray(lib.works) ? lib.works : []).map((work) => {
    const cluster = classifyWork(work, clusters)
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1)
    return {
      id: work?.id ?? '',
      title: typeof work?.title === 'string' ? work.title : '',
      year: Number.isFinite(work?.year) ? work.year : null,
      mechanisms: Array.isArray(work?.mechanisms) ? work.mechanisms.length : 0,
      hasFigure: Boolean(work?.pipeline?.figure?.url),
      figure: work?.pipeline?.figure?.url ?? null,
      citedBy: cited.get(work?.id) ?? 0,
      hasSummary: Boolean(readings[work?.id]?.summary?.trim?.()),
      cluster,
    }
  })
  // Declaration order for the clusters the direction names, then the leftover
  // bucket, so the list groups the way the direction was written.
  const ordered = []
  for (const label of Object.keys(clusters)) {
    if (counts.get(label)) ordered.push({ label, count: counts.get(label) })
  }
  if (counts.get('unclustered')) ordered.push({ label: 'unclustered', count: counts.get('unclustered') })
  return {
    slug,
    name: typeof direction?.name === 'string' && direction.name.trim() ? direction.name.trim() : slug,
    built: typeof lib.built === 'string' ? lib.built : null,
    clusters: ordered,
    works,
  }
}

/** One work: the record, the reading, and the page a person reads. */
export function loadWork(options = {}) {
  const root = rootOf(options)
  const slug = String(options.slug ?? '')
  const id = String(options.id ?? '')
  if (!slug || !id) return null
  const found = listLibraries(root).find((entry) => entry.slug === slug)
  if (!found) return null
  const lib = readJson(found.file)
  const record = (Array.isArray(lib?.works) ? lib.works : []).find((work) => work?.id === id)
  if (!record) return null
  const reading = readingsOf(root, slug)[id] ?? null
  const similar = Array.isArray(record.similar) ? record.similar : []
  return {
    slug,
    id,
    record,
    reading,
    similar,
    // The person's view is the same function that writes the Markdown file, so
    // the panel and the file cannot disagree about what the page says.
    markdown: renderWorkMarkdown(record, { similar, reading }),
  }
}

// --- the route -----------------------------------------------------------

function reply(status, body, headers = {}) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(body),
  }
}

function requestPath(req) {
  const raw = typeof req?.url === 'string' ? req.url : ''
  const cut = raw.indexOf('?')
  const path = cut === -1 ? raw : raw.slice(0, cut)
  // A bare trailing slash means the same shelf, not an unknown path.
  return path.replace(/\/+$/, '') || RESEARCH_PATH
}

/** Split `/dsh-loom/research/a/b` into `['a','b']`, or null when off-route. */
function segments(path) {
  if (path !== RESEARCH_PATH && !path.startsWith(`${RESEARCH_PATH}/`)) return null
  const rest = path.slice(RESEARCH_PATH.length).replace(/^\/+/, '')
  if (!rest) return []
  return rest
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part)
      } catch {
        return part
      }
    })
}

/**
 * Decide the response to one request without writing to it.
 *
 * `routeState`'s shape: a non-GET method is refused before any read, an unknown
 * path is a 404, and a directory that was never built is an empty index rather
 * than an error — the reader's first sight of this shelf is "nothing here yet".
 */
export function routeResearch(options, req) {
  if (String(req?.method ?? '').toUpperCase() !== 'GET') {
    return reply(405, { error: 'method not allowed' }, { allow: 'GET' })
  }
  const parts = segments(requestPath(req))
  if (!parts) return reply(404, { error: 'not found' })
  if (parts.length === 0) return reply(200, loadIndex(options))
  if (parts.length === 1) {
    const direction = loadDirection({ ...options, slug: parts[0] })
    return direction ? reply(200, direction) : reply(404, { error: 'not found' })
  }
  if (parts.length === 2) {
    const work = loadWork({ ...options, slug: parts[0], id: parts[1] })
    return work ? reply(200, work) : reply(404, { error: 'not found' })
  }
  return reply(404, { error: 'not found' })
}

function sendDecision(res, decision) {
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(decision.status, decision.headers)
    if (typeof res.end === 'function') res.end(decision.body)
  }
  return decision
}

/**
 * The registered route.
 *
 * `kind: 'prefix'` is what makes one path serve three answers: the host matches
 * `/dsh-loom/research` and everything under it, and this handler splits the rest.
 */
export function researchRoute(options = {}) {
  return {
    name: 'dsh-loom-research',
    kind: 'prefix',
    path: RESEARCH_PATH,
    handler: async (req, res) => sendDecision(res, routeResearch(options, req)),
  }
}
