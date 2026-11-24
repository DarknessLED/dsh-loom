// From a list of links to verbatim spans that can be quoted.
//
// The whole file is a port of the pure half of `dsh-deep-research/lib/research.js`
// (MIT, houdinicc — see THIRD_PARTY_NOTICES.md). It is kept because each piece
// encodes a decision that is easy to get subtly wrong:
//
//   * a URL's identity is scheme + host + a query with tracking junk removed —
//     otherwise the same page is fetched, stored and cited three times;
//   * merging rotates between queries instead of concatenating them, so a
//     second query cannot bury the first query's best hit;
//   * fetching spreads across hosts, because two pages of one site are usually
//     one opinion counted twice;
//   * a passage is a verbatim span picked by the question's own terms, so a
//     citation can be re-found by searching for it.
//
// No network here: the caller hands in already-fetched documents. That is what
// makes the behaviour testable and what keeps `ctx.web` in one place.

import { collapseWhitespace, normalizeQuery } from './plan.js'

const MAX_PASSAGES_PER_SOURCE = 2
const MAX_PASSAGE_CHARS = 600
const MAX_PER_HOST = 2

const TRACKING_PARAM_RE = /^(?:utm_[^=&]*|fbclid|gclid)$/i

const STOPWORDS = new Set(
  (
    'a an the and or but if then than so as at by for from in into of on onto to with ' +
    'without about above after again against all also am any are be because been before ' +
    'being below between both could did do does doing done down during each few further ' +
    'had has have having he her here hers herself him himself his how i its itself just ' +
    'me more most my myself no nor not now off once only other our ours ourselves out ' +
    'over own same she should some such that their theirs them themselves there these ' +
    'they this those through too under until up very was we were what when where which ' +
    'while who whom why will would you your yours yourself yourselves can cannot may ' +
    'might must shall get got make made use used using via per etc http https www html ' +
    'com org net markdown'
  ).split(/\s+/),
)

const CJK_STOP_BIGRAMS = new Set(
  (
    '我们 你们 他们 她们 它们 这个 那个 这些 那些 一个 一种 以及 因为 所以 但是 如果 ' +
    '然后 而且 并且 或者 其中 已经 还是 就是 不是 没有 可以 可能 应该 需要 进行 通过 ' +
    '对于 关于 由于 因此 然而 不过 这是 那是 什么 如何 怎么 为什么 具有 使用 用于 ' +
    '能够 同时 此外 以便 从而 及其 之一 主要 相关 情况 方面 问题 方法 结果 研究 分析'
  ).split(/\s+/),
)

function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

/** The identity of a URL: no fragment, no tracking parameters, lower host. */
export function normalizeUrl(url) {
  const raw = typeof url === 'string' ? url.trim() : ''
  if (!raw) return ''

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return normalizeUrlFallback(raw)
  }

  parsed.hash = ''
  if (parsed.protocol) parsed.protocol = parsed.protocol.toLowerCase()
  if (parsed.hostname) parsed.hostname = parsed.hostname.toLowerCase()

  const kept = []
  for (const [key, value] of parsed.searchParams) {
    if (!TRACKING_PARAM_RE.test(key)) kept.push([key, value])
  }
  parsed.search = kept.length ? `?${new URLSearchParams(kept).toString()}` : ''
  return parsed.href
}

function normalizeUrlFallback(raw) {
  let rest = raw.split('#')[0].trim()
  const queryIndex = rest.indexOf('?')
  let query = ''
  if (queryIndex >= 0) {
    query = rest.slice(queryIndex + 1)
    rest = rest.slice(0, queryIndex)
  }

  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/]*)/.exec(rest)
  if (match) {
    rest = `${match[1].toLowerCase()}://${match[2].toLowerCase()}${rest.slice(match[0].length)}`
  }
  if (!rest) return ''

  if (query) {
    const kept = query
      .split('&')
      .filter(Boolean)
      .filter((pair) => {
        const rawKey = pair.split('=')[0]
        let key = rawKey
        try {
          key = decodeURIComponent(rawKey)
        } catch {
          /* keep the unencoded value */
        }
        return !TRACKING_PARAM_RE.test(key)
      })
    if (kept.length) rest += `?${kept.join('&')}`
  }
  return rest
}

/** The host of a URL, without a port; '' when there is nothing to parse. */
export function domainOf(url) {
  const raw = typeof url === 'string' ? url.trim() : ''
  if (!raw) return ''
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    const match = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]+)/.exec(raw)
    if (!match) return ''
    return match[1].toLowerCase().replace(/:\d+$/, '')
  }
}

/**
 * Merge search batches into one ranked source list.
 *
 * Rotation, not concatenation: rank 0 of every query first, then rank 1, and so
 * on. A source hit by more queries scores higher, and a source seen twice keeps
 * the fields its first sighting lacked.
 */
export function mergeSearchResults(batches, options = {}) {
  const limit =
    Number.isFinite(options?.maxSources) && options.maxSources > 0 ? Math.floor(options.maxSources) : Infinity
  const list = Array.isArray(batches) ? batches : []

  const byUrl = new Map()
  const ordered = []
  const maxRank = list.reduce((max, batch) => {
    const count = Array.isArray(batch?.sources) ? batch.sources.length : 0
    return Math.max(max, count)
  }, 0)

  for (let rank = 0; rank < maxRank; rank += 1) {
    for (const batch of list) {
      const batchSources = Array.isArray(batch?.sources) ? batch.sources : []
      const source = batchSources[rank]
      if (!source || typeof source !== 'object') continue

      const url = normalizeUrl(source.url)
      if (!url) continue

      let entry = byUrl.get(url)
      if (!entry) {
        entry = {
          url,
          title: cleanText(source.title) || undefined,
          publishedAt: cleanText(source.publishedAt) || undefined,
          snippet: cleanText(source.snippet) || undefined,
          queries: [],
          bestRank: rank,
          order: ordered.length,
          domain: domainOf(url),
        }
        byUrl.set(url, entry)
        ordered.push(entry)
      } else {
        if (entry.title === undefined && cleanText(source.title)) entry.title = cleanText(source.title)
        if (entry.publishedAt === undefined && cleanText(source.publishedAt)) entry.publishedAt = cleanText(source.publishedAt)
        if (entry.snippet === undefined && cleanText(source.snippet)) entry.snippet = cleanText(source.snippet)
        if (rank < entry.bestRank) entry.bestRank = rank
      }

      const query = typeof batch?.query === 'string' ? batch.query : ''
      if (query && !entry.queries.includes(query)) entry.queries.push(query)
    }
  }

  const merged = ordered.map((entry) => ({ ...entry, score: 10 * entry.queries.length - entry.bestRank }))
  merged.sort((a, b) => b.score - a.score || a.order - b.order)
  return merged.slice(0, limit)
}

/** The pages worth fetching: best-scored first, at most `maxPerHost` per host. */
export function selectFetchTargets(sources, options = {}) {
  const fetchTop = Math.max(0, Number.isFinite(options?.fetchTop) ? Math.floor(options.fetchTop) : 0)
  const maxPerHost = Math.max(1, Number.isFinite(options?.maxPerHost) ? Math.floor(options.maxPerHost) : MAX_PER_HOST)
  const targets = []
  if (fetchTop === 0) return targets

  const hostCounts = new Map()
  for (const source of Array.isArray(sources) ? sources : []) {
    if (targets.length >= fetchTop) break
    const host = cleanText(source?.domain) || domainOf(source?.url)
    if ((hostCounts.get(host) ?? 0) >= maxPerHost) continue
    hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1)
    targets.push(source)
  }
  return targets
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, '&')
}

/**
 * Degrade a page to text good enough to quote.
 *
 * Not an HTML-to-Markdown converter: script, style, comments and svg go away;
 * block boundaries become newlines so paragraphs survive as paragraphs; entities
 * are decoded once. Anything more elaborate would be a parser we cannot test.
 */
export function htmlToText(html) {
  let text = typeof html === 'string' ? html : ''
  text = text.replace(/<!DOCTYPE[^>]*>/gi, ' ')
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')
  text = text.replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  text = text.replace(
    /<\/?(?:p|div|br|li|ul|ol|tr|td|th|h[1-6]|section|article|header|footer|table|blockquote|pre)\b[^>]*>/gi,
    '\n',
  )
  text = text.replace(/<[^>]+>/g, ' ')
  text = decodeHtmlEntities(text)
  text = text.replace(/[ \t\f\v\u00a0]+/g, ' ')
  text = text.replace(/ *\n[ \t]*/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/**
 * Terms worth matching on: Latin words of 3+ letters minus stopwords, and CJK
 * bigrams minus the high-frequency ones. Deduped in first-seen order.
 */
export function extractTerms(input) {
  const text = Array.isArray(input)
    ? input.filter((item) => typeof item === 'string').join('\n')
    : typeof input === 'string'
      ? input
      : ''
  if (!text) return []

  const terms = []
  const seen = new Set()
  const push = (term) => {
    if (!term || seen.has(term)) return
    seen.add(term)
    terms.push(term)
  }

  for (const match of text.matchAll(/[A-Za-z][A-Za-z0-9]*/g)) {
    const word = match[0].toLowerCase()
    if (word.length < 3) continue
    if (STOPWORDS.has(word)) continue
    push(word)
  }

  for (const run of text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+/g) ?? []) {
    for (let index = 0; index + 2 <= run.length; index += 1) {
      const bigram = run.slice(index, index + 2)
      if (CJK_STOP_BIGRAMS.has(bigram)) continue
      push(bigram)
    }
  }

  return terms
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  return haystack.split(needle).length - 1
}

/**
 * Candidate passages: blank-line-separated blocks with headings, bare links and
 * code fences removed. A block under 40 chars is a fragment, not a passage.
 */
function splitPassageBlocks(markdown) {
  if (typeof markdown !== 'string' || !markdown) return []
  const normalized = markdown.replace(/\r\n?/g, '\n')
  const withoutFences = normalized.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, '\n\n')

  const blocks = []
  for (const rawBlock of withoutFences.split(/\n[ \t]*\n/)) {
    const lines = rawBlock
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(
        (line) =>
          !/^#{1,6}\s/.test(line) && !/^!?\[[^\]]*\]\([^)]*\)$/.test(line) && !/^\[[^\]]+\]:\s*\S+$/.test(line),
      )
    if (!lines.length) continue
    const text = lines.join('\n').trim()
    if (text.length < 40) continue
    blocks.push(text)
  }
  return blocks
}

/**
 * The verbatim spans of `markdown` that mention the question's terms.
 *
 * Ranked by how many term occurrences a block has, ties broken by position, so
 * the result is deterministic for the same input.
 */
export function extractPassages(markdown, terms, options = {}) {
  const maxPassages = Math.max(
    0,
    options?.maxPassages === undefined ? MAX_PASSAGES_PER_SOURCE : Math.floor(options.maxPassages),
  )
  const maxChars = Math.max(1, options?.maxChars === undefined ? MAX_PASSAGE_CHARS : Math.floor(options.maxChars))

  const termEntries = []
  const seenLower = new Set()
  for (const rawTerm of Array.isArray(terms) ? terms : []) {
    const term = cleanText(rawTerm)
    if (!term) continue
    const lower = term.toLowerCase()
    if (seenLower.has(lower)) continue
    seenLower.add(lower)
    termEntries.push({ term, lower })
  }
  if (!termEntries.length) return []

  const blocks = splitPassageBlocks(markdown)
  const scored = blocks.map((block, index) => {
    const lower = block.toLowerCase()
    let score = 0
    const matchedTerms = []
    for (const { term, lower: lowerTerm } of termEntries) {
      const count = countOccurrences(lower, lowerTerm)
      if (count > 0) {
        score += count
        matchedTerms.push(term)
      }
    }
    return { text: block, index, score, matchedTerms }
  })

  return scored
    .filter((block) => block.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxPassages)
    .map((block) => ({
      passage: block.text.length > maxChars ? block.text.slice(0, maxChars) : block.text,
      matchedTerms: block.matchedTerms,
      score: block.score,
    }))
}

/**
 * The queries one follow-up round should ask: terms that at least two
 * independent sources use and the original question did not.
 *
 * There is no fixed number of rounds here. A round is bought while it still has
 * something to ask about — the share of the shared vocabulary that has not been
 * asked in an earlier round has to clear `minMarginal`. The old behaviour (a
 * single second round, everything else refused) is the `maxRounds: 2` case of
 * this rule, which is why the previous `rounds !== 2` constant could be replaced
 * without changing what a two-round plan does: with nothing asked yet the fresh
 * share is 1, and one is above any sensible bar.
 *
 * Round 1 asks the planned queries, so a round number below two asks nothing.
 */
export function buildFollowupQueries(question, sources, options = {}) {
  const maxRounds = Number.isFinite(options?.maxRounds)
    ? Math.floor(options.maxRounds)
    : options?.rounds === undefined
      ? 2
      : Math.floor(Number(options.rounds))
  const round = Number.isFinite(options?.round) ? Math.floor(options.round) : 2
  if (round < 2 || round > maxRounds) return []
  const minMarginal = Number.isFinite(options?.minMarginal) ? Number(options.minMarginal) : 0.34
  const askedLower = new Set(
    (Array.isArray(options?.usedTerms) ? options.usedTerms : [])
      .filter((term) => typeof term === 'string' && term)
      .map((term) => term.toLowerCase()),
  )

  const core = collapseWhitespace(question)
  const existingQueries = (Array.isArray(options?.existingQueries) ? options.existingQueries : [])
    .map((query) => collapseWhitespace(query))
    .filter(Boolean)
  if (!core) return []

  const maxQueries = Math.max(0, Math.floor(Number.isFinite(options?.maxQueries) ? options.maxQueries : 5))
  const maxAdd = Math.max(0, Math.min(2, maxQueries - existingQueries.length))
  if (maxAdd === 0) return []

  const seenUrls = new Set()
  const perSourceTerms = []
  for (const source of Array.isArray(sources) ? sources : []) {
    const content =
      typeof source === 'string' ? source : typeof source?.content === 'string' ? source.content : ''
    const urlKey = typeof source?.url === 'string' ? source.url : ''
    if (urlKey) {
      if (seenUrls.has(urlKey)) continue
      seenUrls.add(urlKey)
    }
    const termSet = new Set(extractTerms(content))
    if (termSet.size) perSourceTerms.push(termSet)
  }
  if (perSourceTerms.length < 2) return []

  const coverage = new Map()
  for (const termSet of perSourceTerms) {
    for (const term of termSet) coverage.set(term, (coverage.get(term) ?? 0) + 1)
  }

  const originalText = [core, ...existingQueries].join('\n').toLowerCase()
  const shared = [...coverage.entries()]
    .filter(([term, count]) => count >= 2)
    .filter(([term]) => !originalText.includes(term.toLowerCase()))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  // The marginal test is a share of what the sources actually share, so a thin
  // record can still buy a round and a record whose vocabulary is exhausted
  // cannot. An empty record never buys one: there is nothing to correlate.
  const fresh = shared.filter(([term]) => !askedLower.has(term.toLowerCase()))
  if (!shared.length) return []
  if (fresh.length / shared.length < minMarginal) return []
  const candidates = fresh

  const followups = []
  for (const [term] of candidates) {
    if (followups.length >= maxAdd) break
    const query = normalizeQuery(`${core} ${term}`)
    if (!query) continue
    if (followups.includes(query) || existingQueries.includes(query)) continue
    followups.push(query)
  }
  return followups
}
