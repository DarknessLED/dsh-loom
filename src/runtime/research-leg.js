// The research leg: what a round asks before it writes, and what it quotes back.
//
// The loop has a research system on disk (ten directions, 352 evidence
// snapshots, 1,987 claims, an open-question ledger) and, measured 2026-11-26,
// `grep -rn "research" src/runtime/*.js` was comments only. Every gap the loop
// ever found, it found by paying a round to fail: 17 minutes and $0.10–0.20 a
// try. Reading is the cheaper instrument, and this module is the part of it
// that is pure enough to test without a network.
//
// Three decisions live here, and each is a place the leg could go wrong:
//
//   1. **What to ask.** A question invented at dispatch time cannot be audited
//      or closed, so it has to come from something already on the record: the
//      stuck signature of the last round, an open question in the ledger, or —
//      failing both — the task itself. `from` names which, because "we asked
//      the ledger" and "we asked ourselves" are different claims about coverage.
//   2. **What comes back.** Only verbatim spans. A paraphrase is the one thing
//      the loop cannot check later, and this repository has already learned that
//      lesson once (`renderWorkMarkdown`: quotes are quotes, not commentary).
//   3. **How it reaches the worker.** As data, labelled as data. A fetched page
//      is untrusted text; a worker that obeys it is a worker someone else is
//      steering. The brief says "not instructions" in the same breath, and this
//      module never rewrites a span into an imperative to make it "actionable".

/** How long a quoted span may be, in characters. Four of these is a third of a screen. */
export const FINDING_MAX_CHARS = 240

/** How many findings a round may carry into the brief. */
export const FINDING_MAX = 4

/** The most gaps a sketch records: enough to see the shape, not a transcript. */
const SKETCH_MAX_GAPS = 3

/**
 * How much shared text counts as a quotation.
 *
 * Below this, two documents about the same problem match by accident — "a rule
 * that keeps" is eleven characters that any two sentences about adaptive
 * testing share — and a measurement that calls that a use would report every
 * round as having read, which is the same as reporting nothing.
 */
const QUOTE_MIN_CHARS = 24

function clip(text, max) {
  const s = String(text ?? '')
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1))}…`
}

function finite(x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

/**
 * Do these two pieces of text talk about the same thing?
 *
 * Word overlap on content words only (four characters or more, lower case).
 * Stems are not applied: "verify" and "verifier" share seven characters but not
 * a token, and a stemmer would need to be tuned and explained. What this has to
 * catch is a question about harnesses in a round about integer sums, which is
 * total mismatch, not a near miss.
 */
export function sharesTopic(a, b) {
  const words = (text) =>
    new Set(
      String(text ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    )
  const left = words(a)
  if (!left.size) return false
  for (const w of words(b)) if (left.has(w)) return true
  return false
}

/**
 * The question this round should read about, with the source of the question.
 *
 * Order matters and is deliberate: the stuck signature is the most specific
 * thing the loop knows (it names what failed and how), the ledger is the most
 * deliberate (a person or a past analysis wrote it down), and the task text is
 * the fallback that is always available and almost never useful on its own.
 *
 * The ledger only keeps its priority while it has something to do with this
 * round's task. Over 37 live rounds measured on 2026-11-26, `from` was `ledger`
 * every single time and nobody ever asked whether the ledger question was about
 * the work in front of the worker: the probe campaigns asked "does a harness
 * change keep its gain on another model family" while their task was "sum 120
 * integers". Twenty-seven of those rounds then recorded `used: false` and nine
 * more recorded nothing, which reads as "the notes were not useful" when the
 * honest reading is "the notes were about something else".
 *
 * So a ledger question with no vocabulary in common with the task is not this
 * round's question. The threshold is one shared content word of four characters
 * or more: generous on purpose, because the failure this prevents is total
 * mismatch, not imperfect match.
 *
 * @returns {{question: string, from: 'stuck'|'ledger'|'task', id?: string|null}|null}
 */
export function questionFor({ task, lastRound, openQuestions, rounds } = {}) {
  const signature = typeof lastRound?.stuckSignature === 'string' ? lastRound.stuckSignature.trim() : ''
  if (signature) {
    return {
      question: `the task keeps failing the same way (${clip(signature, 160)}): what is known about fixing it`,
      from: 'stuck',
    }
  }
  // A question already asked is not a question worth asking again. A loop that
  // repeats the oldest open entry every round is reading the first page of one
  // book, and the leg's own budget is what pays for it. Rotation is by text, not
  // by position: anything that rewrites the ledger may reorder it.
  const alreadyAsked = new Set(
    (Array.isArray(rounds) ? rounds : [])
      .map((r) => (r && r.research && r.research.mode !== 'off' && typeof r.research.question === 'string' ? r.research.question.trim() : ''))
      .filter(Boolean),
  )
  // Prose only: a task id like `t-alpha` is an identifier, and matching the
  // ledger's "alpha" against it would make every probe task look related to a
  // statistics question that happens to use the same Greek letter.
  const taskText = [task?.prompt, task?.name].filter((v) => typeof v === 'string').join(' ')
  const candidates = (Array.isArray(openQuestions) ? openQuestions : []).filter(
    (q) =>
      q &&
      typeof q.question === 'string' &&
      q.question.trim() &&
      q.status !== 'closed' &&
      q.status !== 'parked' &&
      !alreadyAsked.has(q.question.trim()) &&
      // A question about a different problem is not this round's question. When
      // the task says nothing at all, every question passes: silence about the
      // task is not evidence that the question is irrelevant.
      (!taskText.trim() || sharesTopic(q.question, taskText)),
  )
  // Fewest reads first, and ledger order as the tie-break. Reading the oldest
  // open entry every time is what made thirteen reads across seven campaigns all
  // land on the same prompt: the ledger was a loop, not a queue. A question is
  // credited to the ledger (see `recordQuestionRead`) rather than to this
  // campaign's rounds, so a campaign that restarted does not re-read everything.
  const byReads = candidates
    .map((q, i) => ({ q, i, reads: Number(q.reads) || 0 }))
    .sort((a, b) => (a.reads - b.reads) || (a.i - b.i))
  const first = byReads.length ? byReads[0].q : null
  if (first) return { question: first.question.trim(), id: first.id ?? null, from: 'ledger' }
  const prompt = typeof task?.prompt === 'string' ? task.prompt.trim() : ''
  if (prompt) {
    return {
      question: `what is known about this problem: ${clip(prompt, 180)}`,
      from: 'task',
    }
  }
  return null
}

/**
 * Verbatim spans from a research run, in the order they were read.
 *
 * A source that was read but matched nothing contributes nothing, which is why
 * this walks `evidence` (the passages that matched) rather than `sources` (the
 * pages that were fetched). A missing title stays `null`; filling it in from
 * the URL would make the brief look better sourced than it is.
 */
export function findingsFrom(result, { max = FINDING_MAX, maxChars = FINDING_MAX_CHARS } = {}) {
  const out = []
  const limit = Math.max(0, Math.trunc(Number(max)) || 0)
  if (!limit) return out
  for (const item of Array.isArray(result?.evidence) ? result.evidence : []) {
    if (!item || typeof item !== 'object') continue
    for (const passage of Array.isArray(item.passages) ? item.passages : []) {
      const text = clip(passage?.text, maxChars)
      if (!text.trim()) continue
      out.push({
        text,
        url: typeof item.url === 'string' ? item.url : null,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : null,
      })
      if (out.length >= limit) return out
    }
  }
  return out
}

/**
 * Did the worker reach for what the round read?
 *
 * `null` when there is nothing to judge — no findings, or no report. That is the
 * whole point of the three-valued answer: a round that could not measure did not
 * measure "no", and `researchModeFor` defunds reading on `false`. Turning an
 * absent report into `false` would stop a campaign from reading because its
 * worker produced no JSON block.
 *
 * `true` when the report quotes a finding (any 24+ character, case-insensitive
 * substring of the quoted span) or names its source — the URL, or its arXiv id,
 * which workers cite in the `arXiv:2606.08106` form as often as the link.
 *
 * Findings travel with the record (`research.findings`) or arrive as
 * `opts.findings`, because the sketch counts passages and does not carry the
 * text: the round keeps the spans beside the sketch, not inside it.
 *
 * Pure: no filesystem, no clock, no mutation of the record it is asked about —
 * writing `used` back is the caller's job.
 *
 * @param {{findings?: Array<{text?: unknown, url?: unknown, title?: unknown}>}|null} research
 * @param {{report?: unknown, findings?: Array<object>}|null} opts
 * @returns {boolean|null}
 */
export function reachedFor(research, { report = null, findings = null } = {}) {
  const spans = Array.isArray(findings) ? findings : Array.isArray(research?.findings) ? research.findings : null
  if (!spans || !spans.length) return null
  if (!report || typeof report !== 'object') return null
  // Everything a worker might have written: the free-text fields, plus the
  // citations a report carries as evidence strings.
  const haystack = []
  for (const key of ['why', 'lesson', 'nextHint']) {
    if (typeof report[key] === 'string' && report[key].trim()) haystack.push(report[key])
  }
  for (const key of ['changed', 'evidence', 'openQuestions']) {
    for (const item of Array.isArray(report[key]) ? report[key] : []) {
      if (typeof item === 'string' && item.trim()) haystack.push(item)
    }
  }
  // A report whose text fields are all empty or non-strings is not a report that
  // quoted nothing: there was nothing to search. `null` says "not measured";
  // `false` would claim the worker wrote something and cited none of it.
  if (!haystack.length) return null
  const text = haystack.join('\n')
  const lower = text.toLowerCase()
  for (const finding of spans) {
    const span = typeof finding?.text === 'string' ? finding.text.trim() : ''
    if (span.length >= QUOTE_MIN_CHARS && lower.includes(span.slice(0, QUOTE_MIN_CHARS).toLowerCase())) return true
    // A span the brief clipped carries an ellipsis; the worker can only quote
    // the part that was shown, which is still the beginning of the text.
    if (span.length >= QUOTE_MIN_CHARS) {
      for (let start = 0; start + QUOTE_MIN_CHARS <= span.length; start += QUOTE_MIN_CHARS) {
        if (lower.includes(span.slice(start, start + QUOTE_MIN_CHARS).toLowerCase())) return true
      }
    }
    const url = typeof finding?.url === 'string' ? finding.url.trim() : ''
    if (url && text.includes(url)) return true
    const arxiv = url.match(/(\d{4}\.\d{4,5})(v\d+)?/)
    if (arxiv) {
      const bare = arxiv[1]
      // `arXiv:2606.08106` and a bare id both name the source the round read.
      if (new RegExp(`(^|[^\\d.])${bare.replace('.', '\\.')}(v\\d+)?([^\\d]|$)`).test(text)) return true
    }
  }
  return false
}

/**
 * What the round records about the leg. Counts, not conclusions.
 *
 * `skipped` is the field that keeps the record honest when the leg did not run:
 * a round that could not read says so, rather than reporting zero passages and
 * leaving the reader to guess whether that means "nothing matched" or "nothing
 * was asked".
 */
export function researchSketch(result, { question = null, from = null, mode = null, ms = 0, costUsd = 0 } = {}) {
  const ok = result?.ok === true
  const sources = Array.isArray(result?.sources) ? result.sources : []
  const evidence = Array.isArray(result?.evidence) ? result.evidence : []
  const passages = evidence.reduce((sum, item) => sum + (Array.isArray(item?.passages) ? item.passages.length : 0), 0)
  const gaps = (Array.isArray(result?.gaps) ? result.gaps : []).slice(0, SKETCH_MAX_GAPS).map((g) => clip(g, 200))
  const queries = Array.isArray(result?.plan?.queries) ? result.plan.queries.length : 0
  const sketch = {
    mode: mode ?? null,
    question: question ?? null,
    from: from ?? null,
    queries,
    sources: sources.length,
    read: sources.filter((s) => s?.fetchStatus === 'ok').length,
    passages,
    gaps,
    ms: Math.max(0, Math.trunc(finite(ms) ?? 0)),
    costUsd: finite(costUsd) ?? 0,
    // Filled in by the caller once the round knows whether the worker reached for
    // it; null means "not measured", which is different from false.
    used: null,
  }
  if (!ok) {
    sketch.skipped = typeof result?.code === 'string' && result.code ? result.code : 'failed'
  }
  return sketch
}

/**
 * Whether this round may buy a read, and why not.
 *
 * `config.research.maxRounds` was documented in `src/core/config.js` as "how many
 * rounds of the same campaign may buy a read before the mode stops it" and read
 * by nothing. A campaign that keeps buying a leg nobody uses is the exact failure
 * the mode was added to prevent, so the cap has to live somewhere. It counts
 * rounds that *bought* a read, not rounds that ran: a round whose leg was off has
 * not spent the allowance.
 *
 * A malformed cap does not forbid reading. Silently turning the leg off because a
 * knob is a string is indistinguishable, in the ledger, from "the loop decided
 * not to read" — the wrong lesson to teach it.
 */
export function legBudget({ mode = null, rounds = [], config = {}, assigned = false } = {}) {
  if (mode === 'off') return { buy: false, reason: 'mode is off' }
  // Under `trial` the arm is drawn by lot before the round runs, and by the time
  // this is called `mode` is already the *resolved* arm (`full` or `off`), not
  // the string `trial` -- so the flag has to travel separately.
  //
  // The cap is a brake on rules that read by default; applied to an assigned
  // read it does not save money, it withholds the treatment from a round that
  // will still be counted in the reading arm. `trial8-live` round 8 and
  // `trial-partial` rounds 7 and 9 recorded `skipped: 'budget-spent'` while
  // assigned to read, which quietly moves the comparison toward zero.
  if (assigned) return { buy: true, reason: null }
  const list = Array.isArray(rounds) ? rounds : []
  const bought = list.filter((r) => r && r.research && r.research.mode && r.research.mode !== 'off').length
  const cap = Number(config?.maxRounds)
  if (!Number.isFinite(cap) || cap <= 0) return { buy: true, reason: null }
  if (bought >= cap) return { buy: false, reason: `already bought ${bought} rounds of reading (maxRounds ${cap})` }
  return { buy: true, reason: null }
}

/**
 * Run `work` under a clock, and report rather than throw.
 *
 * The leg awaits `web.search` and `web.fetch`. On 2026-11-26 one live leg took
 * 17.8 s and recorded a fetch failure; nothing bounded how long a hung transport
 * could hold the round, and the round's own attempt deadline starts afterwards.
 * `config.research.timeoutMs` promised a deadline and had no reader.
 *
 * A timeout and a failure are different facts, so they are different fields:
 * reporting a hung page as `leg-failed` would tell the next round to look for a
 * bug in code that is fine. `timeoutMs <= 0` means no wrapper at all, so the
 * unbounded path is the plain await and a regression in the wrapper cannot reach
 * it.
 */
export async function withDeadline(work, timeoutMs = 0) {
  const limit = Number(timeoutMs)
  if (!Number.isFinite(limit) || limit <= 0) {
    try {
      return { ok: true, value: await work(), timedOut: false, reason: null }
    } catch (err) {
      return { ok: false, value: null, timedOut: false, reason: String(err?.message ?? err) }
    }
  }
  let timer = null
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, value: null, timedOut: true, reason: `exceeded its ${limit} ms deadline` }), limit)
    if (typeof timer?.unref === 'function') timer.unref()
  })
  const run = (async () => {
    try {
      return { ok: true, value: await work(), timedOut: false, reason: null }
    } catch (err) {
      return { ok: false, value: null, timedOut: false, reason: String(err?.message ?? err) }
    }
  })()
  try {
    return await Promise.race([run, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * The reflection half of the ReAct step: which open questions this loop has read
 * and still cannot act on.
 *
 * Two things were wrong with the first version, and both were only visible
 * against real data (2026-11-26: 17 open questions, 0 closed, 16 of them read at
 * least once across two campaigns, none ever parked by this rule).
 *
 * It counted this campaign's rounds only. The ledger already records every read
 * with its campaign name, so a rule that needs three asks could never see more
 * than one of them. A rule that needs three and can see one fires never.
 *
 * And it treated a promotion as "the reading helped". Every probe built this week
 * promotes on an easy task while ignoring all four quotes, so `promoted: true`
 * was true for all seventeen questions and nothing was parked. A promotion is a
 * fact about the patch; `research.used` is the fact about the reading, and it is
 * the only one this rule is entitled to act on.
 *
 * So: every read counts toward the bar, one `used: true` keeps the question alive
 * for good, and the reason carries both numbers -- how many reads, how many of
 * them had a recorded outcome. Reads from before the outcome was measurable are
 * counted, because a read whose result nobody wrote down cannot be shown to have
 * helped, and a ledger that treats "nobody recorded it" as "it helped" is the
 * ledger that never retired anything. The two numbers make that visible instead
 * of hiding it behind one figure.
 *
 * Parking is honest about what was measured ("this reader, these rounds, no use")
 * and is reversible, unlike closing, which asserts an answer nobody produced. A
 * round an operator interrupted was never judged and does not count, for the same
 * reason `plateauReached` skips it.
 *
 * A malformed bar parks nothing: retiring questions because a config value is a
 * string is the failure mode that looks like judgement.
 */
export function reflectOnQuestions({ rounds = [], openQuestions = [], maxAsks = 3, campaign = null } = {}) {
  const bar = Number(maxAsks)
  if (!Number.isFinite(bar) || bar <= 0) return { park: [], reads: {} }
  const self = typeof campaign === 'string' ? campaign.trim() : ''
  const reads = {}
  for (const round of Array.isArray(rounds) ? rounds : []) {
    if (!round || typeof round !== 'object') continue
    const research = round.research
    if (!research || research.mode === 'off' || typeof research.question !== 'string' || !research.question.trim()) continue
    if (round.status === 'interrupted') continue
    const measured = research.used === true || research.used === false
    const key = research.question.trim()
    const entry = reads[key] || (reads[key] = { asked: 0, measured: 0, used: false })
    entry.asked += 1
    if (measured) entry.measured += 1
    if (research.used === true) entry.used = true
  }
  const park = []
  for (const question of Array.isArray(openQuestions) ? openQuestions : []) {
    if (!question || question.status !== 'open' || typeof question.question !== 'string') continue
    const key = question.question.trim()
    const local = reads[key] || { asked: 0, measured: 0, used: false }
    // The ledger counts every campaign, this one included. Subtract the reads it
    // already recorded for us so this round's evidence is not counted twice.
    const ledgerReads = Number(question.reads) || 0
    const ledgerMeasured = Number(question.measuredReads) || 0
    const ownReads = self && question.measuredBy && typeof question.measuredBy === 'object' ? Number(question.measuredBy[self]) || 0 : 0
    const asked = Math.max(0, ledgerReads - ownReads) + local.asked
    const measured = Math.max(0, ledgerMeasured - ownReads) + local.measured
    if (question.usedAtLeastOnce === true || local.used) continue
    if (asked < bar) continue
    park.push({
      id: question.id ?? null,
      question: key,
      asked,
      measured,
      reason: `read in ${asked} round(s) (${measured} with a recorded outcome), and the notes were used in none of them: this loop has not been able to act on it`,
    })
  }
  return { park, reads }
}
