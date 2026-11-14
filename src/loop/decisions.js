// The decisions the loop has made about its own chain, each carrying the
// measurement that justified it.
//
// A verdict without numbers cannot be audited: a later campaign must be able to
// tell "we ran eight paired tasks, the difference was inside the MDE" from "we
// had a hunch". So an entry is refused unless its `evidence` holds at least one
// finite number, and a repeated decision is not appended twice.
//
// Kept beside the campaigns (`<home>/decisions.json`) rather than inside one
// campaign, because the whole point is that a refuted hypothesis stays refuted
// in the next campaign.
import { readFileSync } from 'node:fs'
import { writeJsonAtomic } from '../core/atomic.js'

/**
 * Read the decision ledger.
 *
 * A missing file is an empty list, and a malformed one is too: this must never
 * stop a proposal, only annotate one.
 *
 * @param {string} file
 * @returns {Array<object>}
 */
export function readDecisions(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * An evidence object is one that states at least one measured quantity.
 * An empty object is a claim, not evidence, and a string is a note.
 */
function hasMeasuredEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false
  return Object.values(evidence).some((v) => typeof v === 'number' && Number.isFinite(v))
}

/**
 * Append a decision to the ledger, unless that exact decision is already there.
 *
 * Idempotent on `kind` + `decision`: re-running the rule that produced a verdict
 * must not grow the ledger. A *different* verdict for the same kind is appended,
 * because that is the history of what was measured.
 *
 * @param {string} file
 * @param {{kind:string, decision:string, evidence:object}} entry
 * @returns {{added:boolean}}
 */
export function appendDecision(file, entry) {
  if (!hasMeasuredEvidence(entry?.evidence)) throw new Error('decision requires evidence')
  const list = readDecisions(file)
  const known = list.some((d) => d && d.kind === entry.kind && d.decision === entry.decision)
  if (known) return { added: false }
  list.push(entry)
  writeJsonAtomic(file, list)
  return { added: true }
}
