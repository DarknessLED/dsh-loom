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
 * The question this round should read about, with the source of the question.
 *
 * Order matters and is deliberate: the stuck signature is the most specific
 * thing the loop knows (it names what failed and how), the ledger is the most
 * deliberate (a person or a past analysis wrote it down), and the task text is
 * the fallback that is always available and almost never useful on its own.
 *
 * @returns {{question: string, from: 'stuck'|'ledger'|'task'}|null}
 */
export function questionFor({ task, lastRound, openQuestions } = {}) {
  const signature = typeof lastRound?.stuckSignature === 'string' ? lastRound.stuckSignature.trim() : ''
  if (signature) {
    return {
      question: `the task keeps failing the same way (${clip(signature, 160)}): what is known about fixing it`,
      from: 'stuck',
    }
  }
  const first = (Array.isArray(openQuestions) ? openQuestions : []).find(
    (q) => q && typeof q.question === 'string' && q.question.trim() && q.status !== 'closed' && q.status !== 'parked',
  )
  if (first) return { question: first.question.trim(), from: 'ledger' }
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
