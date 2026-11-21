// Where a research finding is allowed to touch the loop.
//
// A sealed report is still a document. The loop only changes when a finding
// reaches one of three places: the lesson store (read by the next round's
// brief), a chain proposal (the L2 card), or the status line a person reads.
// This module is the one-way path, with the honesty rules already used
// elsewhere in the plugin:
//
//   * only a `verified` claim may become a lesson. A lesson laundered out of an
//     unverified claim is precisely the "the agent read something once" failure
//     the gate exists to prevent;
//   * a lesson carries its evidence id *and* the locator, so a later reader can
//     reopen the page instead of trusting the paraphrase;
//   * a `fact` lesson must carry `notWhen` — a rule with no boundary is an
//     over-general claim, and `src/knowledge/store.js` already treats those as
//     harmful;
//   * a finding that contradicts an active lesson is never applied. It becomes a
//     proposal with both sides quoted, and a human decides.
//
// Nothing here writes. It returns what it would write, so the tool decides and
// a spec can check.

import { createHash } from 'node:crypto'

const MAX_CONFIDENCE = 0.9
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'done',
  'for', 'from', 'with', 'without', 'into', 'onto', 'over', 'under', 'about', 'after', 'before',
  'when', 'where', 'while', 'because', 'so', 'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up',
  'it', 'its', 'their', 'there', 'they', 'them', 'we', 'our', 'you', 'your',
  'also', 'very', 'much', 'many', 'some', 'any', 'all', 'did', 'does', 'can', 'could', 'would',
  'should', 'may',
])
// Polarity words are deliberately *not* stopwords: "more candidates help" and
// "additional candidates did not help" share almost no other vocabulary, so if
// these were filtered the contradiction would be invisible.

const NEGATION_RE = /\b(?:not|never|no|none|nothing|cannot|can't|didn't|doesn't|without|fails? to)\b/i
const OPPOSITE_PAIRS = [
  ['more', 'fewer'], ['more', 'less'], ['always', 'never'], ['help', 'hurt'], ['help', 'harm'],
  ['increase', 'decrease'], ['raise', 'lower'], ['faster', 'slower'], ['cheaper', 'costlier'],
  ['better', 'worse'], ['cheap', 'expensive'], ['safe', 'unsafe'], ['honest', 'dishonest'],
]

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/** Content words only: lowercased, singularised, stopwords and short tokens out. */
function contentTerms(text) {
  const out = new Set()
  for (const raw of String(text ?? '').toLowerCase().match(/[a-z][a-z0-9]*/g) ?? []) {
    if (raw.length < 3) continue
    if (STOPWORDS.has(raw)) continue
    const stem = raw.endsWith('ies') ? `${raw.slice(0, -3)}y` : raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw
    if (stem.length < 3) continue
    out.add(stem)
  }
  return out
}

// Words whose presence on opposite sides is itself the disagreement
// (more/fewer, help/hurt...). A pair that shares only one of these is a
// dispute; a pair that shares only a common noun is not.
const POLARITY_WORDS = new Set(OPPOSITE_PAIRS.flat())

function lessonId(claimId, family) {
  return `lsn-${createHash('sha256').update(`${claimId ?? ''}\n${family ?? ''}`).digest('hex').slice(0, 12)}`
}

/**
 * Turn a verified claim into a lesson the loop can read.
 *
 * The claim text is carried verbatim (a paraphrase loses the number), the
 * evidence id and locator travel with it, and confidence stays below certainty
 * because one paper is one paper.
 */
export function lessonFromClaim(claim, { family, notWhen } = {}) {
  const c = claim && typeof claim === 'object' ? claim : {}
  const status = clean(c.verdict?.status)
  if (status !== 'verified') {
    throw new Error(`only a verified claim may become a lesson (this one is ${status || 'unverdict-ed'})`)
  }
  const text = clean(c.text)
  if (!text) throw new Error('a lesson needs the claim text')

  const boundaries = (Array.isArray(notWhen) ? notWhen : [notWhen]).map(clean).filter(Boolean)
  if (!boundaries.length) {
    throw new Error('a fact lesson needs a notWhen boundary; without one it is an over-general rule')
  }

  const evidenceIds = (Array.isArray(c.evidenceIds) ? c.evidenceIds : []).map(clean).filter(Boolean)
  // A locator like "p. 7, Table 3" is two ways back into the page, so both are
  // kept: a reader with the PDF looks up the page, one with the HTML looks up
  // the table.
  const locatorParts = clean(c.locator)
    .split(',')
    .map(clean)
    .filter(Boolean)
  const evidence = [...new Set([...evidenceIds, ...locatorParts])].filter(Boolean)

  return {
    id: lessonId(c.id, family),
    kind: 'fact',
    claim: text,
    family: clean(family) || null,
    evidence,
    notWhen: boundaries,
    source: 'research',
    confidence: evidenceIds.length > 1 ? MAX_CONFIDENCE : 0.6,
  }
}

/**
 * Active lessons this finding argues against.
 *
 * Deliberately conservative: a tension needs shared subject matter *and* a
 * polarity flip (more/fewer, always/never, or a negation on one side only).
 * Shared words alone are agreement, not contradiction, and flagging that would
 * make every report look like a dispute.
 */
export function tensionsWith(finding, activeLessons) {
  const text = clean(finding?.text ?? finding?.claim)
  if (!text) return []
  const findingTerms = contentTerms(text)
  if (!findingTerms.size) return []
  const findingNegated = NEGATION_RE.test(text)
  const findingLower = text.toLowerCase()

  const out = []
  for (const lesson of Array.isArray(activeLessons) ? activeLessons : []) {
    if (!lesson || typeof lesson !== 'object') continue
    if (lesson.status && lesson.status !== 'active') continue
    const lessonText = clean(lesson.claim)
    if (!lessonText) continue

    const lessonTerms = contentTerms(lessonText)
    // One shared subject term plus a polarity flip is enough: two texts about
    // "candidates" that disagree about whether more help are in tension even
    // when they share nothing else. Two terms were required before, which
    // silently missed exactly this pair.
    const shared = [...findingTerms].filter((t) => lessonTerms.has(t))
    if (shared.length < 1) continue
    // One shared noun is not shared subject matter. Found live: a note about
    // reward hacking "shared" the noun `task` with lessons about README edits,
    // editable installs and node on PATH, and because the note contained
    // "without", all seven were reported as contradictions. Two content words,
    // or one that is itself a polarity word, is the weakest pairing that can
    // mean the two texts are about the same claim.
    if (shared.length < 2 && !shared.some((t) => POLARITY_WORDS.has(t))) continue

    const lessonNegated = NEGATION_RE.test(lessonText)
    const lessonLower = lessonText.toLowerCase()

    let flipped = findingNegated !== lessonNegated
    if (!flipped) {
      for (const [a, b] of OPPOSITE_PAIRS) {
        const aInFinding = findingLower.includes(a)
        const bInFinding = findingLower.includes(b)
        const aInLesson = lessonLower.includes(a)
        const bInLesson = lessonLower.includes(b)
        if ((aInFinding && bInLesson) || (bInFinding && aInLesson)) {
          flipped = true
          break
        }
      }
    }
    if (!flipped) continue

    out.push({ ...lesson, sharedTerms: shared })
  }
  return out
}

/**
 * A contradiction becomes a card a person can decide, never an automatic edit.
 *
 * Both sides are quoted in full: a proposal that paraphrases the lesson it
 * contradicts hides exactly the thing the human needs to read.
 */
export function proposalFromFinding(finding, { against, chainVersion, rounds } = {}) {
  const f = finding && typeof finding === 'object' ? finding : {}
  const text = clean(f.text ?? f.claim)
  const other = against && typeof against === 'object' ? against : {}
  const lessonText = clean(other.claim)
  const version = Number.isFinite(chainVersion) ? Number(chainVersion) : null
  const roundCount = Number.isFinite(rounds) ? Number(rounds) : null

  const detail = [
    `The research says: "${text.slice(0, 400)}"`,
    lessonText ? `An active lesson says: "${lessonText.slice(0, 400)}"` : 'No active lesson is quoted.',
    roundCount !== null ? `Measured over ${roundCount} round(s)${version !== null ? ` on chain v${version}` : ''}.` : '',
    'Both cannot be true at once. Nothing was applied automatically; choose which one to keep.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    kind: 'knowledge',
    title: lessonText ? `Research contradicts: ${lessonText.slice(0, 80)}` : `Research finding: ${text.slice(0, 80)}`,
    detail,
    evidenceIds: (Array.isArray(f.evidenceIds) ? f.evidenceIds : []).map(clean).filter(Boolean),
    against: other.id ?? null,
    chainVersion: version,
    needsHuman: true,
  }
}

/**
 * Fold a set of claims into what the loop would write.
 *
 * Unverified claims are reported as `skipped` with their verdict — never dropped
 * silently, because "the report had five findings and only one was checkable" is
 * information a person needs.
 */
export function sinkFindings(home, { claims, activeLessons, family, notWhen } = {}) {
  const lessons = []
  const proposals = []
  const skipped = []

  for (const claim of Array.isArray(claims) ? claims : []) {
    if (!claim || typeof claim !== 'object') continue
    const status = clean(claim.verdict?.status)
    if (status !== 'verified') {
      skipped.push({ claimId: claim.id ?? null, reason: `${status || 'no verdict'}: not applied` })
      continue
    }
    let lesson
    try {
      lesson = lessonFromClaim(claim, { family, notWhen })
    } catch (err) {
      skipped.push({ claimId: claim.id ?? null, reason: String(err?.message ?? err) })
      continue
    }
    lessons.push(lesson)
    for (const tension of tensionsWith({ text: claim.text, evidenceIds: claim.evidenceIds }, activeLessons)) {
      proposals.push(proposalFromFinding({ text: claim.text, evidenceIds: claim.evidenceIds }, { against: tension }))
    }
  }

  return { lessons, proposals, skipped }
}

/** One line for the status panel. */
export function renderSinkLine({ lessons, proposals, questions } = {}) {
  const n = (x) => (Number.isFinite(x) ? Number(x) : 0)
  const parts = []
  if (n(lessons) > 0) parts.push(`${n(lessons)} lesson${n(lessons) === 1 ? '' : 's'}`)
  if (n(proposals) > 0) parts.push(`${n(proposals)} proposal${n(proposals) === 1 ? '' : 's'}`)
  if (n(questions) > 0) parts.push(`${n(questions)} open question${n(questions) === 1 ? '' : 's'}`)
  if (!parts.length) return 'research sink: nothing changed — no verified claim reached the loop'
  return `research sink: ${parts.join(', ')}`
}
