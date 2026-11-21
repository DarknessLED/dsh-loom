// Turning one sentence into a search plan.
//
// The pipeline is a port of the pure planning half of `dsh-deep-research`
// (MIT, houdinicc — see THIRD_PARTY_NOTICES.md), kept honest in three places a
// hurried loop gets wrong:
//
//   * depth is a preset, not a mood: `quick` cannot fetch, so "I am being
//     thorough" cannot quietly buy six page reads;
//   * a human's sub-questions outrank the automatic expansion, because someone
//     who decomposed the question knows more than a suffix glued on the end;
//   * the expansion language follows the question language. Appending
//     " latest analysis" to a Chinese question returns English pages about
//     something else, which is worse than not expanding at all.
//
// Everything here is a pure function: no ctx, no network, no files.

export const DEPTH_PRESETS = Object.freeze({
  quick: Object.freeze({ rounds: 1, maxQueries: 3, maxSources: 8, fetchTop: 0, fetchCharBudget: 0 }),
  standard: Object.freeze({ rounds: 2, maxQueries: 5, maxSources: 12, fetchTop: 4, fetchCharBudget: 60_000 }),
  deep: Object.freeze({ rounds: 2, maxQueries: 8, maxSources: 20, fetchTop: 6, fetchCharBudget: 120_000 }),
})

export const DEFAULT_DEPTH = 'standard'

/** Search providers cap a query at 128 characters; longer is silently cut. */
export const MAX_QUERY_CHARS = 128

/** A question past this length is a paragraph, and should be split instead. */
export const MAX_QUESTION_CHARS = 300

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u

/** Does this text contain CJK at all? Decides the expansion language. */
export function hasCJK(text) {
  return CJK_RE.test(String(text ?? ''))
}

/** Trim and collapse interior whitespace; junk in, empty string out. */
export function collapseWhitespace(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/\s+/g, ' ').trim()
}

/** Collapse, then cut to the provider's query limit without leaving a space. */
export function normalizeQuery(raw) {
  const text = collapseWhitespace(raw)
  if (!text) return ''
  if (text.length <= MAX_QUERY_CHARS) return text
  return text.slice(0, MAX_QUERY_CHARS).trim()
}

/**
 * Effective limits: the preset, with explicit overrides on top.
 *
 * `rounds` is deliberately not overridable — a caller that could raise it
 * would also be able to turn a one-round plan into two without saying so.
 */
export function resolveLimits(options = {}) {
  const opts = options && typeof options === 'object' ? options : {}
  const depth = typeof opts.depth === 'string' && DEPTH_PRESETS[opts.depth] ? opts.depth : DEFAULT_DEPTH
  const preset = DEPTH_PRESETS[depth]
  const pick = (key) => (opts[key] === undefined || opts[key] === null ? preset[key] : opts[key])
  return {
    depth,
    rounds: preset.rounds,
    maxQueries: pick('maxQueries'),
    maxSources: pick('maxSources'),
    fetchTop: pick('fetchTop'),
    fetchCharBudget: pick('fetchCharBudget'),
  }
}

/**
 * Build the query list.
 *
 * Order is the contract: the question itself, then the caller's sub-questions,
 * then at most two automatic expansions — and only when there is room left.
 *
 * @param {string} question
 * @param {{depth?: string, subquestions?: string[], maxQueries?: number, maxSources?: number, fetchTop?: number, fetchCharBudget?: number}} [options]
 */
export function planQueries(question, options = {}) {
  const limits = resolveLimits(options)
  const core = collapseWhitespace(question)
  const candidates = []

  const push = (raw) => {
    const query = normalizeQuery(raw)
    if (!query) return
    if (candidates.includes(query)) return
    candidates.push(query)
  }

  push(core)

  const subquestions = Array.isArray(options?.subquestions) ? options.subquestions : []
  for (const subquestion of subquestions) push(subquestion)

  // Expansion only when the question said something. A blank core would
  // otherwise generate " latest analysis" as a query of its own.
  if (core && (limits.rounds > 1 || limits.depth !== 'quick')) {
    const suffixes = hasCJK(core) ? [' 最新进展', ' 数据 引用'] : [' latest analysis', ' data evidence']
    for (const suffix of suffixes) push(core + suffix)
  }

  const maxQueries = Math.max(0, Math.floor(limits.maxQueries))
  return { core, queries: candidates.slice(0, maxQueries), limits }
}
