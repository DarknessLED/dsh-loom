/**
 * One way to read a moment out of the ledger.
 *
 * The ledger writes time as a number of milliseconds (`ev.t`), and every reader
 * that assumed a string failed silently rather than loudly: `Date.parse(1794…)`
 * is `NaN`, `NaN` compared against a cap is `false`, and `false` reads as "the
 * ledger cannot say" — which is a legitimate answer, so nothing complained. The
 * price was the whole priced hedge: `budgetLeftMsOf` returned `null` forever and
 * `planCandidates` was never called, in any round of a 464-round record.
 *
 * `null` is the answer for anything that is not a moment. `NaN` is not: it
 * propagates through comparisons without a trace, and a caller cannot tell it
 * apart from a real reading.
 */

/**
 * A moment in milliseconds since the epoch, or `null`.
 *
 * Accepts a finite number (the ledger's own form), a numeric string (what a
 * hand-written fixture or an old export may carry) and an ISO-8601 string.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function toMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const text = value.trim()
    if (text === '') return null
    // A numeric string is milliseconds, not a year: `Date.parse('2026')` reads
    // 2026-01-01, and `Date.parse('1794843743415')` is NaN. Try the number first.
    const asNumber = Number(text)
    if (Number.isFinite(asNumber)) return asNumber
    const parsed = Date.parse(text)
    return Number.isFinite(parsed) ? parsed : null
  }
  // A Date is a moment. Anything else (objects, booleans, arrays) is not.
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

/**
 * Milliseconds from `from` to `to`, or `null` when either is not a moment.
 *
 * @param {unknown} from
 * @param {unknown} to
 * @returns {number|null}
 */
export function sinceMs(from, to = Date.now()) {
  const start = toMs(from)
  const end = toMs(to)
  if (start === null || end === null) return null
  return end - start
}
