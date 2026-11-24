// The run pipeline, judged by what it does when the web is not perfect.
//
// In this environment that is the normal case: a payment wall, a captcha page, a
// PDF that arrives as `%PDF-1.7` binary, a host that times out. A pipeline that
// reports "12 sources" while five of those fetches were error pages is the exact
// failure the manual research pass hit earlier: the report read as complete and
// two of its three claims were unverifiable.
//
// So the rules encoded here are all about not over-reporting:
//
//   * a failed search is a named gap, and the remaining queries still run;
//   * a failed fetch is recorded with its reason and its URL never becomes
//     evidence;
//   * a binary body is `skipped`, not passed through as prose;
//   * a page that was read but matched nothing is `ok` with `passages: []` and
//     `contentChars > 0` — "read, contributed nothing" is different from silence;
//   * `authority` counts what was actually read, so a report cannot claim
//     evidence it does not have;
//   * no web service at all is a named state with the plan still returned, so a
//     headless host can still use the planning half.
//
// Search and fetch are injected. That is what makes every rule above testable
// without a network, and it keeps this module free of tool-context plumbing.

import {
  buildFollowupQueries,
  extractPassages,
  extractTerms,
  htmlToText,
  mergeSearchResults,
  selectFetchTargets,
} from './fetch.js'
import { collapseWhitespace, planQueries, resolveLimits } from './plan.js'

const MAX_REPORT_CHARS = 60_000
const MAX_SOURCE_TEXT_CHARS = 1_500_000
const MAX_REPORT_EVIDENCE = 12
// How many reads one success may cost before the run stops trying.
const FETCH_ATTEMPTS_FACTOR = 3
// A small budget cannot afford a pure factor: with fetchTop 1 a factor of three
// rounds down to three tries, which a cluster of dead links eats. The additive
// floor keeps one success reachable below four failures.
const FETCH_ATTEMPTS_FLOOR = 4

function readAttemptsFor(fetchTop) {
  const want = Math.max(0, Number.isFinite(fetchTop) ? Math.floor(fetchTop) : 0)
  if (want === 0) return 0
  return Math.max(want * FETCH_ATTEMPTS_FACTOR, want + FETCH_ATTEMPTS_FLOOR)
}
const MAX_GAP_CHARS = 240
const MAX_ERROR_CHARS = 240

const BINARY_RE = /^(?:\s*%PDF|PK\u0003\u0004|\u0000)/

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function clip(text, max) {
  const body = String(text ?? '')
  return body.length <= max ? body : `${body.slice(0, max - 1)}…`
}

function messageOf(err) {
  const raw = err && typeof err === 'object' ? err.message ?? String(err) : String(err ?? 'unknown failure')
  return clip(collapseWhitespace(raw), MAX_ERROR_CHARS)
}

function looksBinary(kind, content) {
  if (kind === 'binary') return true
  return BINARY_RE.test(String(content ?? '').slice(0, 16))
}

/**
 * Run one research pass.
 *
 * @param {object} input  {question, subquestions?, depth?, maxQueries?, fetchTop?, maxSources?}
 * @param {object} deps   {search?, fetchPage?} — both async
 * @returns a plain result object; never throws for an expected condition.
 */
export async function runResearch(input, deps = {}) {
  const question = clean(input?.question)
  if (!question) {
    return { ok: false, code: 'no-question', hint: 'a research run needs a question', gaps: [], warnings: [] }
  }

  const { search, fetchPage } = deps && typeof deps === 'object' ? deps : {}
  const limits = resolveLimits(input ?? {})
  const plan = planQueries(question, { ...input, limits })
  const gaps = []
  const warnings = []

  if (typeof search !== 'function') {
    return {
      ok: false,
      code: 'web-unavailable',
      hint: 'no web provider is configured on this host; the plan is still usable (run it where a provider exists)',
      plan,
      limits,
      queries: plan.queries.map((q) => ({ query: q, status: 'skipped' })),
      sources: [],
      evidence: [],
      authority: { fetched: 0, failed: 0, skipped: 0, passages: 0 },
      warnings: ['no search provider: nothing was read'],
      gaps: ['no web provider'],
    }
  }

  // --- round 1: the planned queries ---------------------------------------
  const queries = []
  const batches = []
  for (const query of plan.queries) {
    try {
      const res = await search(query, { maxResults: limits.maxSources })
      const sources = Array.isArray(res?.sources) ? res.sources : []
      if (res?.truncated === true) warnings.push(`the provider truncated the result for "${clip(query, 60)}"`)
      queries.push({ query, status: 'ok', sources: sources.length })
      batches.push({ query, sources })
    } catch (err) {
      const error = messageOf(err)
      queries.push({ query, status: 'failed', error })
      gaps.push(clip(`search failed for "${query}": ${error}`, MAX_GAP_CHARS))
    }
  }

  let sources = mergeSearchResults(batches, { maxSources: limits.maxSources })

  // --- follow-up rounds: terms two independent sources share --------------
  // A round is bought while the shared vocabulary still holds terms no earlier
  // query used (`buildFollowupQueries` owns that test). The old code asked
  // exactly once with `rounds !== 2` as its rule, which is a constant rather
  // than a stopping rule: a third round was unreachable and a second round that
  // had nothing new still spent a query. The preset still caps how many rounds a
  // depth buys, so nothing here overrides the tier a caller chose.
  const askedTerms = []
  for (let round = 2; round <= plan.rounds && sources.length >= 2; round += 1) {
    const followups = buildFollowupQueries(question, sources, {
      round,
      maxRounds: plan.rounds,
      maxQueries: limits.maxQueries,
      existingQueries: queries.map((q) => q.query),
      usedTerms: askedTerms,
    })
    if (!followups.length) break
    const core = collapseWhitespace(question)
    for (const query of followups) {
      if (query.startsWith(`${core} `)) askedTerms.push(query.slice(core.length + 1).toLowerCase())
      try {
        const res = await search(query, { maxResults: limits.maxSources })
        const found = Array.isArray(res?.sources) ? res.sources : []
        if (res?.truncated === true) warnings.push(`the provider truncated the result for "${clip(query, 60)}"`)
        queries.push({ query, status: 'ok', sources: found.length, followup: true, round })
        batches.push({ query, sources: found })
      } catch (err) {
        const error = messageOf(err)
        queries.push({ query, status: 'failed', error, followup: true, round })
        gaps.push(clip(`follow-up search failed for "${query}": ${error}`, MAX_GAP_CHARS))
      }
    }
    sources = mergeSearchResults(batches, { maxSources: limits.maxSources })
  }

  if (!sources.length) {
    return {
      ok: false,
      code: 'no-results',
      hint: 'the provider answered but returned no usable source; nothing to read',
      plan,
      limits,
      queries,
      sources: [],
      evidence: [],
      authority: { fetched: 0, failed: 0, skipped: 0, passages: 0 },
      warnings,
      gaps,
    }
  }

  // --- read what was selected ---------------------------------------------
  // A failed fetch releases its slot to the next candidate. Found live on R2: the
  // four best-scored sources were a paywalled PDF, two huggingface paper pages and
  // a dataset diff, all answered with HTTP 404; the run spent its whole budget on
  // them and reported "0 read, 4 failed" while a readable arxiv HTML page sat one
  // position below the cut. Searching is cheap, reading is the expensive step, so
  // the queue is longer than the budget and each failure promotes the next source.
  const attemptsBudget = readAttemptsFor(limits.fetchTop)
  const queue = selectFetchTargets(sources, { fetchTop: attemptsBudget, maxPerHost: 2 })
  const terms = extractTerms(question)
  const byUrl = new Map(sources.map((s) => [s.url, s]))
  const evidence = []
  let fetched = 0
  let failed = 0
  let skipped = 0
  let passageCount = 0

  if (queue.length && typeof fetchPage !== 'function') {
    warnings.push('sources were found but this host cannot fetch pages; nothing was read')
    gaps.push('no fetch capability: sources are listed but unread')
  }

  let attempts = 0
  for (const target of queue) {
    if (fetched >= limits.fetchTop) break
    if (attempts >= attemptsBudget) break
    const source = byUrl.get(target.url)
    if (!source) continue
    attempts++
    if (typeof fetchPage !== 'function') {
      source.fetchStatus = 'skipped'
      source.fetchError = 'no fetch capability'
      source.passages = []
      skipped++
      continue
    }
    try {
      const page = await fetchPage(target.url)
      const status = Number(page?.statusCode)
      if (Number.isFinite(status) && (status < 200 || status >= 300)) {
        source.fetchStatus = 'failed'
        source.fetchError = `HTTP ${status}`
        source.passages = []
        failed++
        gaps.push(clip(`fetch failed for ${target.url}: HTTP ${status}`, MAX_GAP_CHARS))
        continue
      }
      const kind = page?.body?.kind === 'html' ? 'html' : 'text'
      const content = typeof page?.body?.content === 'string' ? page.body.content : ''
      if (looksBinary(kind, content)) {
        source.fetchStatus = 'skipped'
        source.fetchError = 'binary body (not prose)'
        source.passages = []
        skipped++
        gaps.push(clip(`skipped ${target.url}: binary body`, MAX_GAP_CHARS))
        continue
      }
      if (page?.truncated === true) warnings.push(`the body of ${target.url} was truncated by the provider`)

      const text = kind === 'html' ? htmlToText(content) : content
      const passages = extractPassages(text, terms, { maxPassages: 2, maxChars: 600 })
      source.fetchStatus = 'ok'
      source.contentChars = text.length
      source.passages = passages
      // The readable text is kept (clipped) so the caller can snapshot exactly
      // what was read under a digest, instead of re-fetching a page that may
      // have changed between the read and the seal.
      source.text = clip(text, MAX_SOURCE_TEXT_CHARS)
      fetched++
      passageCount += passages.length
      if (!passages.length) {
        gaps.push(clip(`read ${target.url} (${text.length} chars) but found no span matching the question`, MAX_GAP_CHARS))
      }
      if (passages.length) {
        // The extractor returns {passage, matchedTerms, score}; evidence callers
        // (and the report renderer) read the span as `text`. One shape, here.
        evidence.push({
          url: target.url,
          title: source.title ?? null,
          passages: passages.map((p) => ({ text: p.passage, matchedTerms: p.matchedTerms, score: p.score })),
        })
      }
    } catch (err) {
      source.fetchStatus = 'failed'
      source.fetchError = messageOf(err)
      source.passages = []
      failed++
      gaps.push(clip(`fetch failed for ${target.url}: ${source.fetchError}`, MAX_GAP_CHARS))
    }
  }

  // Sources that were not selected are still listed, marked unread.
  for (const source of sources) {
    if (!source.fetchStatus) {
      source.fetchStatus = 'not-selected'
      source.passages = []
      source.contentChars = 0
    }
  }

  const authority = { fetched, failed, skipped, attempts, passages: passageCount }
  const report = renderReport({ question, plan, sources, evidence, gaps, authority, warnings })

  return {
    ok: true,
    code: 'ok',
    plan,
    limits,
    queries,
    sources,
    evidence: evidence.slice(0, MAX_REPORT_EVIDENCE),
    authority,
    warnings,
    gaps,
    report: clip(report, MAX_REPORT_CHARS),
  }
}

function renderReport({ question, plan, sources, evidence, gaps, authority, warnings }) {
  const lines = [`# Research: ${question}`, '']
  lines.push(
    `**Depth.** ${plan.limits?.depth ?? 'standard'} · ${plan.queries.length} query(ies) · ${sources.length} source(s) · ` +
      `${authority.fetched} read · ${authority.failed} failed · ${authority.skipped} skipped · ` +
      `${authority.passages} passage(s)` +
      (Number(authority.attempts) > Number(authority.fetched) ? ` · ${authority.attempts} read attempt(s)` : '') +
      '.',
    '',
  )

  lines.push('## What was found', '')
  if (!evidence.length) {
    lines.push('No source yielded a passage matching the question. This report is a list of where to look, not a finding.', '')
  }
  for (const item of evidence) {
    lines.push(`### ${item.title ? clean(item.title) : item.url}`, '', item.url, '')
    for (const passage of item.passages) {
      lines.push(`> ${passage.text.replace(/\s+/g, ' ').trim()}`, '')
    }
  }

  lines.push('## Sources', '')
  for (const source of sources) {
    const state =
      source.fetchStatus === 'ok'
        ? `${source.contentChars} chars, ${(source.passages ?? []).length} passage(s)`
        : source.fetchStatus === 'failed'
          ? `failed: ${source.fetchError}`
          : source.fetchStatus === 'skipped'
            ? `skipped: ${source.fetchError}`
            : 'not read'
    lines.push(`- ${source.url} — ${state}`)
  }
  lines.push('')

  if (gaps.length) {
    lines.push('## Gaps', '')
    for (const gap of gaps) lines.push(`- ${gap}`)
    lines.push('')
  }
  if (warnings.length) {
    lines.push('## Warnings', '')
    for (const warning of warnings) lines.push(`- ${warning}`)
    lines.push('')
  }
  lines.push('_Generated by dsh-loom research. Passages are verbatim spans; verify before relying on them._')
  return lines.join('\n')
}
