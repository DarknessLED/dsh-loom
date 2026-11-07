// A human "hold" (暂缓) postpones a checkpoint instead of answering it.
//
// The checkpoint stays open in the ledger; all this module computes is the
// instant it becomes worth reading again. The delay is policy, so it is read
// from config with a bounded fallback: a malformed or non-positive value must
// still produce a *future* instant, otherwise "hold" would silently mean
// "answer it now" — the exact bug this exists to prevent.

import { DEFAULT_HOLD_MS } from '../core/config.js'

/**
 * @param {object | undefined} config normalized config (may be omitted)
 * @param {number} now epoch ms
 * @returns {number} epoch ms at which the checkpoint is worth reading again
 */
export function holdUntil(config, now = Date.now()) {
  const raw = Number(config?.checkpoint?.holdMs)
  const ms = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_HOLD_MS
  return now + ms
}
