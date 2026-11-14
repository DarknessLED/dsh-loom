/**
 * The closing sentence for a campaign: why it ended, what it reached, and what
 * a later session should do next.
 *
 * Twenty-six campaigns sat in `stopped` with nothing recording why the loop
 * stopped or what a resume would build on; nine of them had never promoted
 * anything and the record did not say that either. The ledger knew (`ended`,
 * `incumbent`, `rounds`) but every reader inferred the verdict differently.
 * This module is the one place that inference is made: pure state in, verdict
 * out, so the digest, the panel and the tools cannot disagree.
 *
 * Contract (`describeEnd(state)`):
 *   status     the status that ended the campaign, or the current one
 *   cause      why it ended; `null` when the campaign has not ended
 *   headline   one line: status, cause, and whether anything was reached
 *   resumeHint one line: the exact starting point for a later session
 *
 * It never throws: the panel and the digest both call it on whatever the
 * reducer happened to produce, including a half-written ledger.
 */

/** The statuses that end a campaign, mirroring runtime.js. */
const TERMINAL_STATUSES = new Set(['converged', 'plateaued', 'done', 'stopped'])

/** Why an ended campaign has no cause on record. */
const UNRECORDED = 'unrecorded'

function asObject(value) {
  return value && typeof value === 'object' ? value : null
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Read one campaign's end as four strings.
 *
 * @param {object} state materialized campaign state (`status`, `ended`, `incumbent`, `rounds`)
 * @returns {{status: string, cause: string|null, headline: string, resumeHint: string}}
 */
export function describeEnd(state) {
  const s = asObject(state) || {}
  const ended = asObject(s.ended)
  const status = asText(ended?.status) || asText(s.status) || 'unknown'
  // An end is recorded by `campaign.finished`; a terminal status without that
  // record is still an ended campaign (older ledgers), just one whose cause is
  // missing. A running campaign is the only case that has not ended at all.
  const hasEnded = ended !== null || TERMINAL_STATUSES.has(status)
  const cause = hasEnded ? asText(ended?.cause) || UNRECORDED : null

  const incumbent = asObject(s.incumbent)
  const round = asNumber(incumbent?.round)
  const score = asNumber(incumbent?.score)
  const hasIncumbent = incumbent !== null && (round !== null || score !== null)
  const roundText = round === null ? '?' : String(round)
  const scoreText = score === null ? '?' : String(score)

  const parts = [status]
  if (hasEnded) {
    // A cause that merely repeats the status ("converged · converged") says
    // nothing a reader did not already see; the status already carries it.
    if (cause !== status) parts.push(cause)
    // Reaching nothing is a finding, not an absence: the old record left a
    // campaign with no incumbent looking exactly like one nobody had read.
    parts.push(hasIncumbent ? `best round ${roundText} at ${scoreText}` : 'no incumbent promoted')
  } else {
    parts.push('not ended yet')
  }
  const headline = parts.join(' · ')

  let resumeHint
  if (!hasEnded) {
    resumeHint = `nothing to resume while ${status}: the campaign has not ended, so continue it instead`
  } else if (hasIncumbent) {
    resumeHint = `a resume builds on round ${roundText} at ${scoreText}: beat ${scoreText} from there instead of starting a fresh baseline`
  } else {
    resumeHint = 'no baseline exists: a resume needs a fresh baseline measured before any gain can be judged'
  }

  return { status, cause, headline, resumeHint }
}
