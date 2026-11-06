/**
 * Checkpoint ids must be unique even when several are raised inside the same
 * millisecond: one round can raise a gate checkpoint and then, immediately
 * after `round.finished`, a plateau checkpoint. `Date.now()` alone collides
 * there, so append a monotonic per-process counter. The timestamp has a fixed
 * base-36 width in practice, so the concatenation stays unique across
 * milliseconds while the documented `cp-<alnum>` shape is preserved.
 */
let checkpointSeq = 0

export function nextCheckpointId(now = Date.now()) {
  checkpointSeq += 1
  return `cp-${now.toString(36)}${checkpointSeq.toString(36)}`
}
