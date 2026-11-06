/**
 * Checkpoint ids must be unique even when several are raised inside the same
 * millisecond: one round can raise a gate checkpoint and then, immediately
 * after `round.finished`, a plateau checkpoint. `Date.now()` alone collides
 * there, so append a monotonic per-process counter.
 *
 * The counter is padded to a fixed base-36 width, which makes the counter
 * block self-delimiting: the last SEQ_WIDTH characters are always the counter,
 * so two different counter values can never concatenate with the timestamp
 * into the same string, whatever width that timestamp happens to have. This
 * keeps the uniqueness guarantee independent of Date.now()'s digit count
 * (and therefore stable when the epoch crosses a base-36 boundary), while the
 * documented `cp-<alnum>` shape and the event payload stay unchanged.
 */
const SEQ_WIDTH = 6
const SEQ_LIMIT = 36 ** SEQ_WIDTH
let checkpointSeq = 0

export function nextCheckpointId(now = Date.now()) {
  if (checkpointSeq >= SEQ_LIMIT) {
    throw new Error('checkpoint id counter exhausted')
  }
  checkpointSeq += 1
  return `cp-${now.toString(36)}${checkpointSeq.toString(36).padStart(SEQ_WIDTH, '0')}`
}
