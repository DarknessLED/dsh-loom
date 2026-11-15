// One activation path for both doors.
//
// The tool door (`rsi_decide`) and the panel door (`POST /decide`) answer the
// same checkpoints, so they must perform the same activation. Before this
// helper only the tool door did — a person clicking the panel's approve button
// got a checkpoint marked answered and no chain change, which is the worst kind
// of one-click adoption: it looks like it worked.
//
// The prediction travels with the activation on purpose. `reduce` turns it into
// a pending measurement, and the first round under the new chain closes it.

/**
 * @param {{runtime:object, view:object, checkpoint:object, actor?:string}} input
 * @returns {null | {activated:number}}
 */
export function adoptFromCheckpoint({ runtime, view, checkpoint, actor = 'human' } = {}) {
  if (!runtime || typeof runtime.append !== 'function' || !view) return null
  const kind = checkpoint?.kind
  // `chain-revert` is the same decision in the other direction: the loop's own
  // forecast missed, so the card offers the version that was active before it.
  // Leaving it inert would make the revert card a notification, not a choice.
  if (kind !== 'chain' && kind !== 'plateau' && kind !== 'chain-revert') return null
  const payload = checkpoint?.payload
  if (!payload || payload.chainVersion == null) return null
  const version = Number(payload.chainVersion)
  if (!Number.isFinite(version)) return null

  const record = (view?.state?.chain?.versions ?? []).find((v) => Number(v.version) === version)
  const prediction = record?.prediction ?? payload.prediction ?? null
  const data = prediction ? { version, prediction } : { version }
  runtime.append(view, 'chain.activated', data, actor)
  return { activated: version }
}
