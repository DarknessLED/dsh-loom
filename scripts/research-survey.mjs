#!/usr/bin/env node
// A direction survey that follows citations instead of only search ranks.
//
// Usage:
//   node scripts/research-survey.mjs directions/r1-verifier.json [--out research/out] [--keep 200] [--trace 60]
//
// Why this exists. The eight passes in `docs/research-2026-11-22.md` were built
// from search results: five queries, twelve sources, four read. A reviewer names
// the hole at once — the works a subfield is *built on* are rarely what a search
// engine ranks first, the methods a SOTA paper keeps citing are the methods
// everyone else compares against, and ten papers per direction is a brief rather
// than a survey.
//
// So this driver does what a graduate student does, at scale:
//
//   1. breadth    — many queries against arXiv's own search, paged deep (up to
//                   `--pages` pages of 50 per query), deduped, scored by how many
//                   independent queries returned a paper, plus seed matches,
//                   cluster keywords and recency;
//   2. backtrace  — for the strongest papers, read the HTML rendering and parse
//                   the bibliography; every in-text citation anchor is counted,
//                   so each paper states which works it leans on;
//   3. foundations — a work cited by *many distinct papers inside this corpus* is
//                   load-bearing for the direction, not one author's taste;
//   4. baselines  — a work cited several times *within one paper* is a thing that
//                   paper keeps comparing against;
//   5. openings   — the earliest paper per cluster, so a subfield has a date;
//   6. gaps       — works cited repeatedly but absent from the corpus are exactly
//                   what the search missed; they become the next round of queries.
//
// Data source, and why it is arXiv's HTML rather than its API. The arXiv API
// answered 429 for minutes at a time while this was written (and 503 after a
// cooldown), and OpenAlex — the fallback — shares a $0.10 per-IP daily budget
// that ran out mid-survey. `arxiv.org/search/` and `arxiv.org/html/<id>` both
// answer reliably and cost nothing, so they are the spine. The cost: no global
// citation counts and no forward citations. Every "cited by" number below is
// **inside this corpus**, which is the honest question anyway — what does this
// direction keep citing?
//
// Everything is cached under <out>/.cache so a rerun costs nothing and a reviewer
// can see which bytes produced a map.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { publicationYear } from '../src/research/citegraph.js'

const SEARCH = 'https://arxiv.org/search/'
const HTML_BASE = 'https://arxiv.org/html'
const UA = 'dsh-loom-survey/1.0 (+https://github.com/DarknessLED/dsh-loom)'
const SEARCH_SPACING_MS = 3000
const HTML_SPACING_MS = 600

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function argsOf(argv) {
  const out = { direction: null, outDir: 'research/out', keep: 200, trace: 60, pages: 3, resume: true, secondPass: 0 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--out') out.outDir = argv[++i]
    else if (arg === '--keep') out.keep = Number(argv[++i])
    else if (arg === '--trace') out.trace = Number(argv[++i])
    else if (arg === '--pages') out.pages = Number(argv[++i])
    else if (arg === '--gaps') out.secondPass = Number(argv[++i]) || 8
    else if (arg === '--refresh') out.resume = false
    else if (!arg.startsWith('--')) out.direction = arg
  }
  return out
}

// --- cache ---------------------------------------------------------------

function cachePath(outDir, kind, key, ext = 'txt') {
  const digest = createHash('sha1').update(key).digest('hex').slice(0, 16)
  return join(outDir, '.cache', kind, `${digest}.${ext}`)
}

function readCache(outDir, kind, key) {
  const file = cachePath(outDir, kind, key)
  return existsSync(file) ? readFileSync(file, 'utf8') : null
}

function writeCache(outDir, kind, key, body) {
  const file = cachePath(outDir, kind, key)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}

async function getText(url, { tries = 3, spacing = 0, timeoutMs = 60_000 } = {}) {
  if (spacing) await sleep(spacing)
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      // A fetch with no deadline can hang forever: the first version of this
      // driver sat on one request for six minutes and wrote nothing.
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.status === 429 || res.status === 503) {
        await sleep(10_000 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt === tries - 1) throw err
      await sleep(4000 * (attempt + 1))
    }
  }
  return null
}

// --- page text helpers ---------------------------------------------------

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#039;': "'",
  '&#x27;': "'",
  '&hellip;': '…',
  '&ndash;': '-',
  '&mdash;': '-',
  '&#9661;': '',
  '&#9651;': '',
}

function plain(html) {
  if (typeof html !== 'string' || !html) return ''
  let text = html.replace(/<[^>]+>/g, ' ')
  for (const [entity, value] of Object.entries(ENTITIES)) text = text.split(entity).join(value)
  // Named entities above are the common ones; arXiv also emits numeric
  // references, and `&#34;` used to reach the tables verbatim as `&#34;`.
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  text = text.replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  return text.replace(/\s+/g, ' ').trim()
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function isoFromArxivDate(text) {
  const match = /([0-9]{1,2}) ([A-Z][a-z]+),? ([0-9]{4})/.exec(String(text ?? ''))
  if (!match) return null
  const month = MONTHS.indexOf(match[2])
  if (month === -1) return null
  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`
}

// --- phase 1: breadth ----------------------------------------------------

/**
 * Parse one arXiv search-results page into paper records.
 *
 * The page is a list of `<li class="arxiv-result">` blocks. Each carries the
 * arXiv id, title, authors, a highlighted abstract, categories, and a
 * "Submitted …; originally announced …" line.
 */
export function parseSearchPage(html) {
  if (typeof html !== 'string' || !html) return []
  const results = []
  for (const block of html.split('class="arxiv-result"').slice(1)) {
    const idMatch = /arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/.exec(block)
    if (!idMatch) continue
    const title = plain((/<p class="title is-5[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(block) || [])[1] || '')
    const authorsRaw = (/<p class="authors"[^>]*>([\s\S]*?)<\/p>/.exec(block) || [])[1] || ''
    const authors = [...authorsRaw.matchAll(/>([^<>]+)<\/a>/g)].map((m) => plain(m[1])).filter(Boolean)
    // `abstract-full` ends with the collapse control ("▽ Less"); it is chrome,
    // not text, and it used to end up quoted in the survey tables.
    const abstract = plain((/<span class="abstract-full[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(block) || [])[1] || '')
      .replace(/\s*(?:[▽△▲]\s*)?(?:Less|More)\s*$/, '')
    const categories = [...block.matchAll(/data-tooltip="([^"]+)"/g)].map((m) => m[1])
    const submitted = /Submitted<\/span>\s*([^;<]+)/.exec(block)
    const announced = /originally announced<\/span>\s*([^.<]+)\./.exec(block)
    results.push({
      id: idMatch[1],
      title: title.replace(/\s*\.$/, ''),
      authors: authors.slice(0, 8),
      abstract: abstract.slice(0, 2000),
      categories,
      submitted: submitted ? submitted[1].trim() : null,
      date: isoFromArxivDate(submitted ? submitted[1] : announced ? `1 ${announced[1]}` : ''),
      year: submitted && /([0-9]{4})/.test(submitted[1]) ? Number(/([0-9]{4})/.exec(submitted[1])[1]) : null,
    })
  }
  return results
}

function searchUrl(query, { start = 0, order = '-announced_date_first', size = 50 } = {}) {
  const params = new URLSearchParams({
    query,
    searchtype: 'all',
    abstracts: 'show',
    size: String(size),
    start: String(start),
  })
  // `order=relevance` is not a value arXiv accepts — it answers 400. Relevance
  // is the default, so asking for it means leaving the parameter out.
  if (order) params.set('order', order)
  return `${SEARCH}?${params.toString()}`
}

async function searchPage(query, page, options) {
  const { outDir, resume, pages } = options
  // No `order` means arXiv's own relevance ranking; '-announced_date_first' is
  // the only other value its search page accepts.
  const url = searchUrl(query.q, { start: page * 50, order: query.sort === 'recent' ? '-announced_date_first' : null })
  if (resume) {
    const cached = readCache(outDir, 'search', url)
    if (cached) return parseSearchPage(cached)
  }
  if (page >= pages) return []
  const html = await getText(url, { spacing: SEARCH_SPACING_MS, tries: 3 })
  if (!html) return []
  writeCache(outDir, 'search', url, html)
  return parseSearchPage(html)
}

/**
 * A query that returns nothing is a finding, not a step.
 *
 * The seven configs written for arXiv's API dialect (`abs:"..."`) returned zero
 * results for every query and the run still "succeeded" with 2 candidates —
 * which reads like "this direction is empty" when the truth is "I asked wrong".
 * So a run where most queries came back empty is reported as a failed direction.
 */
function emptyQueryWarning(runs) {
  const empty = runs.filter((r) => r.status === 'ok' && r.returned === 0).length
  if (!runs.length || empty < Math.ceil(runs.length * 0.8)) return null
  return `${empty} of ${runs.length} queries returned nothing — check the query syntax (arXiv's HTML search rejects the API's abs:/ti: prefixes)`
}

async function breadth(direction, options) {
  const { outDir, keep, pages } = options
  const byId = new Map()
  const hits = new Map()
  const runs = []
  for (const query of direction.queries ?? []) {
    const wanted = Math.min(pages, Math.max(1, Math.ceil((query.per ?? 50) / 50)))
    let total = 0
    let failed = null
    for (let page = 0; page < wanted; page++) {
      let results
      try {
        results = await searchPage(query, page, options)
      } catch (err) {
        failed = err.message
        break
      }
      if (!results.length) break
      total += results.length
      for (const paper of results) {
        hits.set(paper.id, (hits.get(paper.id) ?? 0) + 1)
        if (!byId.has(paper.id)) byId.set(paper.id, paper)
        else {
          const prior = byId.get(paper.id)
          if (!prior.abstract && paper.abstract) prior.abstract = paper.abstract
          if (!prior.date && paper.date) prior.date = paper.date
        }
      }
    }
    runs.push({ query: query.q, status: failed ? 'failed' : 'ok', returned: total, error: failed ?? null })
  }
  const ranked = [...byId.values()]
    .map((paper) => ({ ...paper, hits: hits.get(paper.id) ?? 1, score: scorePaper(paper, direction, hits.get(paper.id) ?? 1) }))
    .sort((a, b) => b.score - a.score || String(b.date ?? '').localeCompare(String(a.date ?? '')))
  return { candidates: ranked.length, runs, papers: ranked.slice(0, keep), warning: emptyQueryWarning(runs) }
}

function scorePaper(paper, direction, hits) {
  const haystack = `${paper.title} ${paper.abstract}`.toLowerCase()
  let score = Math.min(hits, 12) * 1.4
  for (const seed of direction.seeds ?? []) {
    if (haystack.includes(String(seed).toLowerCase())) score += 8
  }
  for (const keywords of Object.values(direction.clusters ?? {})) {
    for (const keyword of keywords) {
      if (haystack.includes(String(keyword).toLowerCase())) score += 1.1
    }
  }
  const year = Number(paper.year) || 0
  const now = new Date().getFullYear()
  if (year >= now - 1) score += 2.2
  else if (year >= now - 3) score += 1.4
  else if (year >= now - 6) score += 0.7
  // A survey is a map of a field; worth keeping, not worth ranking first.
  if (/survey|review|overview|tutorial/i.test(paper.title)) score += 0.4
  return score
}

/**
 * Search for the works the corpus kept citing but never returned.
 *
 * This is the loop a reviewer asked for: a SOTA paper's related work names the
 * methods everyone compares against, and those names are better queries than
 * anything I would invent. Whatever the first round missed gets asked for
 * directly, by title.
 */
async function gapBackfill(gaps, options) {
  const papers = []
  const runs = []
  const seen = new Set()
  for (const work of gaps) {
    const title = String(work.title ?? '').replace(/[“”"]/g, '').replace(/[.,;:]$/, '').trim()
    if (!title || title.length < 8) continue
    const query = work.year ? `${title}` : title
    let results = []
    try {
      results = await searchPage({ q: query }, 0, options)
    } catch (err) {
      runs.push({ query, status: 'failed', returned: 0, error: err.message })
      continue
    }
    runs.push({ query, status: 'ok', returned: results.length, error: null })
    for (const paper of results) {
      if (seen.has(paper.id)) continue
      seen.add(paper.id)
      // Found by a direct title query, so `hits` is 1 — but it still needs a
      // score, or the table that sorts candidates by score throws.
      papers.push({ ...paper, hits: 1, score: scorePaper(paper, options.direction ?? {}, 1) })
    }
  }
  return { papers, runs, found: papers.length, warning: null }
}

/** Keep one record per arXiv id, first occurrence winning. */
function dedupe(papers) {
  const seen = new Set()
  const out = []
  for (const paper of papers) {
    if (seen.has(paper.id)) continue
    seen.add(paper.id)
    out.push(paper)
  }
  return out
}

// --- phase 2: backtrace --------------------------------------------------

function cleanTitle(text) {
  // A bibliography title often ends with the year it was published: "DAPO: ...,
  // 2025." The year has its own column, so drop the trailing copy. Removing it
  // leaves "Title ." because the period belonged to the sentence, so the
  // dangling space before punctuation goes too.
  return String(text ?? '')
    .replace(/[,\s]+(?:19|20)[0-9]{2}\.?$/, '')
    .replace(/\s+([.,;:])$/, '$1')
    .replace(/[,\s]+$/, '')
    .trim()
}

const BIB_ITEM_RE = /<li[^>]*\bid="(bib\.[\w.-]+)"[^>]*class="[^"]*ltx_bibitem[^"]*"[^>]*>([\s\S]*?)<\/li>/g
const BIB_ITEM_RE_ALT = /<li[^>]*class="[^"]*ltx_bibitem[^"]*"[^>]*\bid="(bib\.[\w.-]+)"[^>]*>([\s\S]*?)<\/li>/g
const ANCHOR_RE = /<a[^>]*\bhref="#(bib\.[\w.-]+)"[^>]*>/g
const SPAN_BLOCK_RE = /<span[^>]*class="[^"]*ltx_bibblock[^"]*"[^>]*>([\s\S]*?)<\/span>/g
const ARXIV_ID_RE = /\barxiv[:\s]*([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?/i

/** Parse a bibliography and count in-text citation anchors (kept in step with src/research/citegraph.js). */
export function parseBibliography(html) {
  if (typeof html !== 'string' || !html) return { entries: [], counts: new Map() }
  const marker = html.search(/ltx_bibliography|ltx_biblist/)
  const body = marker === -1 ? html : html.slice(0, marker)
  const region = marker === -1 ? '' : html.slice(marker)

  const counts = new Map()
  ANCHOR_RE.lastIndex = 0
  let anchor
  while ((anchor = ANCHOR_RE.exec(body))) counts.set(anchor[1], (counts.get(anchor[1]) ?? 0) + 1)

  const entries = []
  for (const re of [BIB_ITEM_RE, BIB_ITEM_RE_ALT]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(region))) {
      const [, key, block] = match
      const blocks = []
      SPAN_BLOCK_RE.lastIndex = 0
      let inner
      while ((inner = SPAN_BLOCK_RE.exec(block))) {
        const text = plain(inner[1])
        if (text) blocks.push(text)
      }
      const raw = plain(block)
      if (!raw) continue
      // An arXiv id looks exactly like a year ("2505.22954"), and it sits in the
      // text, so the year is read after the ids are removed. Found on the DGM
      // bibliography: "AI-GAs" was dated 1905 from arXiv 1905.10985. Page
      // ranges, ISSNs and access dates fail the same way, so the rule lives in
      // one place (`publicationYear`) and both readers use it.
      entries.push({
        key,
        cited: counts.get(key) ?? 0,
        authors: blocks[0] ?? '',
        title: cleanTitle(blocks[1] ?? ''),
        venue: plain((/<em[^>]*>([\s\S]*?)<\/em>/.exec(block) || [])[1] || '') || null,
        year: publicationYear(raw),
        arxivId: ARXIV_ID_RE.test(raw) ? ARXIV_ID_RE.exec(raw)[1] : null,
        url: (/\bhref="(https?:\/\/[^"]+)"/.exec(block) || [])[1] ?? null,
        raw,
      })
    }
    if (entries.length) break
  }
  return { entries, counts }
}

async function backtrace(papers, options) {
  const { outDir, resume } = options
  const traces = []
  const failures = []
  for (const paper of papers) {
    let html = resume ? readCache(outDir, 'html', paper.id) : null
    if (!html || !/ltx_bibitem/.test(html)) {
      try {
        html = await getText(`${HTML_BASE}/${paper.id}`, { spacing: HTML_SPACING_MS, tries: 2 })
      } catch (err) {
        failures.push({ id: paper.id, error: err.message })
        continue
      }
      if (html && /ltx_bibitem/.test(html)) writeCache(outDir, 'html', paper.id, html)
    }
    if (!html || !/ltx_bibitem/.test(html)) {
      failures.push({ id: paper.id, error: 'no HTML rendering (pre-2023 paper, or LaTeX that did not convert)' })
      continue
    }
    const parsed = parseBibliography(html)
    if (!parsed.entries.length) {
      failures.push({ id: paper.id, error: 'HTML has no parseable bibliography' })
      continue
    }
    traces.push({ paper, ...parsed })
  }
  return { traces, failures }
}

// --- phases 3-5: aggregation -------------------------------------------

function normTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Merge every traced bibliography into one list of works.
 *
 * Exported because the merge rules are the part that was wrong: keying by arXiv
 * id split one work into two rows whenever a citing paper omitted the id.
 */
export function aggregateCitations(traces, candidates = []) {
  return aggregate(traces, candidates)
}

function aggregate(traces, candidates = []) {
  // `corpus` is everything search actually returned, not only what was traced:
  // a work sitting in the kept candidates was *found*, it just was not read, and
  // calling that a gap would send the next round looking for something we have.
  const all = [...traces.map((t) => t.paper), ...candidates]
  const corpus = new Map(all.map((p) => [p.id, p]))
  const corpusTitles = new Map(all.map((p) => [normTitle(p.title), p.id]))
  const works = new Map()
  for (const trace of traces) {
    const seenHere = new Set()
    for (const entry of trace.entries) {
      // Key by title, not by arXiv id: the same work is cited with an id in one
      // paper and without one in the next, and keying on the id turned those
      // into two "different" foundations (DeepSeekMath appeared twice, 18 and 9).
      const key = `title:${normTitle(entry.title)}`
      if (!key || key === 'title:' || seenHere.has(key)) continue
      seenHere.add(key)
      const record = works.get(key) ?? {
        key,
        title: entry.title,
        year: entry.year,
        venue: entry.venue,
        arxivId: entry.arxivId,
        url: entry.url,
        citedByPapers: 0,
        citationsWithinPapers: 0,
        citingPapers: [],
        totalCites: 0,
      }
      record.citedByPapers += 1
      record.citationsWithinPapers += entry.cited
      record.totalCites += entry.cited
      record.citingPapers.push({ id: trace.paper.id, hits: entry.cited })
      if (!record.title || record.title.length < entry.title.length) record.title = entry.title
      if (!record.year && entry.year) record.year = entry.year
      if (!record.arxivId && entry.arxivId) record.arxivId = entry.arxivId
      works.set(key, record)
    }
  }
  const ranked = [...works.values()].sort(
    (a, b) => b.citedByPapers - a.citedByPapers || b.citationsWithinPapers - a.citationsWithinPapers,
  )
  for (const work of ranked) {
    work.inCorpus = corpus.has(work.arxivId) ? work.arxivId : corpusTitles.get(normTitle(work.title)) ?? null
  }
  return { corpus, works: ranked }
}

function classify(papers, works, direction) {
  const clusters = direction.clusters ?? {}
  const labelOf = (paper) => {
    const text = `${paper.title} ${paper.abstract}`.toLowerCase()
    let best = 'unclustered'
    let bestHits = -1
    for (const [label, keywords] of Object.entries(clusters)) {
      let hits = 0
      for (const keyword of keywords) if (text.includes(String(keyword).toLowerCase())) hits++
      // A paper matching nothing gets "unclustered" honestly instead of being
      // pushed into whichever label happened to be checked second.
      if (hits > bestHits && hits > 0) {
        best = label
        bestHits = hits
      }
    }
    return best
  }
  const byCluster = new Map()
  for (const paper of papers) {
    const label = labelOf(paper)
    if (!byCluster.has(label)) byCluster.set(label, [])
    byCluster.get(label).push(paper)
  }
  const openings = []
  for (const [label, list] of byCluster) {
    const sorted = [...list].sort((a, b) => String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')))
    if (sorted[0] && label !== 'unclustered') openings.push({ cluster: label, paper: sorted[0], count: list.length })
  }
  const foundations = works.filter((w) => w.citedByPapers >= 2)
  const compared = works.filter((w) => w.citationsWithinPapers >= 3)
  const now = new Date().getFullYear()
  const sota = papers.filter((p) => Number(p.year) >= now - 1)
  return { byCluster, openings, foundations, compared, sota }
}

// --- output --------------------------------------------------------------

function renderMarkdown(state) {
  const { direction, b, agg, cls, traces, failures } = state
  const traced = traces.length
  const references = (state.referenceCount ?? 0) || traces.reduce((n, t) => n + (t.entries?.length ?? 0), 0)
  const works = agg.works
  // A second pass appends runs that did not come from the direction file, so
  // counting `direction.queries` would report the first pass as if it were the
  // whole search. Name both, because "10 titles found 123 papers" is the point.
  const asked = new Set((direction.queries ?? []).map((q) => (typeof q === 'string' ? q : q.q)))
  const backfilled = (b.runs ?? []).filter((r) => !asked.has(r.query)).length
  const lines = [`# ${direction.name}`, '']
  lines.push(
    `- 检索：${asked.size} 条查询${backfilled ? ` + ${backfilled} 条回填查询（取自 gap 的标题）` : ''}（每条最多 ${state.pages} 页 × 50）→ ${b.candidates} 个不同候选，保留 ${b.papers.length}`,
    `- 回溯：读通 ${traced} 篇全文的参考文献，共 ${references} 条引用（${failures.length} 篇无可用 HTML）`,
    `- 语料内被引：${works.filter((w) => w.citedByPapers >= 2).length} 个工作被本语料至少两篇论文引用；被引最多的是 ${works[0]?.citedByPapers ?? 0} 篇`,
    `- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。`,
    '',
  )

  lines.push('## 基石：本方向多篇论文都在引', '')
  lines.push('| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const work of cls.foundations.slice(0, 30)) {
    const title = (work.title || work.key).replace(/\|/g, '/').slice(0, 108)
    lines.push(`| ${work.citedByPapers} | ${work.citationsWithinPapers} | ${work.year ?? '?'} | ${title} | ${work.arxivId ?? '—'} |`)
  }
  lines.push('')

  lines.push('## 反复被对比的基线（单篇内被多次引用）', '')
  lines.push('| 篇内引用 | 被几篇引 | 年 | 工作 |')
  lines.push('| --- | --- | --- | --- |')
  for (const work of cls.compared.slice(0, 30)) {
    lines.push(`| ${work.citationsWithinPapers} | ${work.citedByPapers} | ${work.year ?? '?'} | ${(work.title || work.key).replace(/\|/g, '/').slice(0, 100)} |`)
  }
  lines.push('')

  lines.push('## 各细分方向的开篇（按语料内最早一篇）', '')
  for (const { cluster, paper, count } of cls.openings.sort((a, b) => b.count - a.count)) {
    lines.push(`- **${cluster}**（${count} 篇，最早 ${paper.date ?? paper.year ?? '?'}）${paper.title.slice(0, 110)} · arXiv:${paper.id}`)
  }
  lines.push('')

  lines.push('## 最近的 SOTA（近两年）', '')
  for (const paper of cls.sota.slice(0, 30)) {
    lines.push(`- ${paper.date ?? paper.year} · ${paper.title.slice(0, 130)} · arXiv:${paper.id}`)
  }
  lines.push('')

  const gaps = works.filter((w) => w.citedByPapers >= 3 && !w.inCorpus).slice(0, 40)
  lines.push('## 被常引但不在语料里（下一轮的查询）', '')
  if (!gaps.length) lines.push('- 无。')
  for (const work of gaps) {
    lines.push(`- (${work.citedByPapers} 篇引) ${(work.title || work.key).slice(0, 110)} · ${work.year ?? '?'}${work.arxivId ? ` · arXiv:${work.arxivId}` : ''}`)
  }
  lines.push('')

  lines.push('## 全部候选（按综合分）', '')
  lines.push('| 分 | 年 | 命中 | 工作 | arXiv |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const paper of b.papers.slice(0, 80)) {
    lines.push(`| ${paper.score.toFixed(1)} | ${paper.year ?? '?'} | ${paper.hits} | ${paper.title.replace(/\|/g, '/').slice(0, 100)} | ${paper.id} |`)
  }
  lines.push('')

  if (failures.length) {
    lines.push('## 读不到全文的（诚实记录）', '')
    for (const failure of failures.slice(0, 40)) lines.push(`- arXiv:${failure.id} — ${failure.error}`)
    lines.push('')
  }

  const failedQueries = b.runs.filter((r) => r.status === 'failed')
  if (failedQueries.length) {
    lines.push('## 失败的查询', '')
    for (const run of failedQueries) lines.push(`- ${run.query} — ${run.error}`)
    lines.push('')
  }
  lines.push(`_生成于 ${new Date().toISOString()}；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_`)
  return lines.join('\n')
}

// --- main ----------------------------------------------------------------

async function main() {
  const options = argsOf(process.argv.slice(2))
  if (!options.direction) {
    console.error('usage: node scripts/research-survey.mjs <direction.json> [--out research/out] [--keep 200] [--trace 60] [--pages 3] [--refresh]')
    process.exit(2)
  }
  const direction = JSON.parse(readFileSync(options.direction, 'utf8'))
  const slug = direction.slug ?? direction.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const outDir = options.outDir
  mkdirSync(outDir, { recursive: true })

  console.error(`[${slug}] breadth: ${(direction.queries ?? []).length} queries × ≤${options.pages} page(s)`)
  const b = await breadth(direction, options)
  console.error(`[${slug}] ${b.candidates} distinct candidates, keeping ${b.papers.length}`)
  if (b.warning) console.error(`[${slug}] WARNING: ${b.warning}`)

  const toTrace = b.papers.slice(0, options.trace)
  console.error(`[${slug}] backtracing ${toTrace.length} bibliographies`)
  const { traces, failures } = await backtrace(toTrace, options)
  console.error(`[${slug}] traced ${traces.length}, ${failures.length} unreadable`)

  let agg = aggregate(traces, b.papers)
  if (options.secondPass) {
    const gaps = agg.works.filter((w) => !w.inCorpus && w.citedByPapers >= 3).slice(0, options.secondPass)
    if (gaps.length) {
      console.error(`[${slug}] second pass: ${gaps.length} work(s) cited but never returned by search`)
      const extra = await gapBackfill(gaps, { ...options, direction })
      if (extra.papers.length) {
        // Newly found papers join the candidate list; the map is re-rendered
        // with them, so a foundation that search missed is no longer a gap.
        // Backfilled papers are *additional*: cutting at `keep` again would drop
        // as many of the originals as it added (240 kept + 123 found = 240).
        b.papers = dedupe([...extra.papers, ...b.papers]).slice(0, options.keep + extra.papers.length)
        b.candidates += extra.found
        b.runs.push(...extra.runs)
        b.warning = b.warning ?? extra.warning
        const more = await backtrace(b.papers.slice(0, Math.max(0, options.trace - traces.length)), options)
        traces.push(...more.traces)
        failures.push(...more.failures)
        agg = aggregate(traces, b.papers)
        console.error(`[${slug}] second pass found ${extra.found} new paper(s); traced ${more.traces.length} more`)
      }
    }
  }
  const cls = classify(b.papers, agg.works, direction)
  const state = {
    direction,
    slug,
    pages: options.pages,
    b,
    agg,
    cls,
    referenceCount: traces.reduce((n, t) => n + t.entries.length, 0),
    traces: traces.map((t) => ({ id: t.paper.id, title: t.paper.title, entries: t.entries.length })),
    failures,
  }
  writeFileSync(join(outDir, `${slug}.survey.json`), JSON.stringify(state, null, 2))
  writeFileSync(join(outDir, `${slug}.survey.md`), renderMarkdown(state))
  console.log(
    `[${slug}] papers ${b.papers.length} · traced ${traces.length} · foundations ${cls.foundations.length} · baselines ${cls.compared.length} · gaps ${agg.works.filter((w) => w.citedByPapers >= 3 && !w.inCorpus).length}`,
  )
}

const invokedDirectly = process.argv[1] && /research-survey\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.stack ?? err.message)
    process.exit(1)
  })
}
