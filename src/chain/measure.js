// Did the forecast materialise?
//
// A prediction that nobody checks is decoration. When a campaign adopts a chain
// on a forecast, the first round measured under that chain compares what the
// task scored to what it scored before adoption. The bar is stated rather than
// implied: the forecast counts as *met* when at least half of it shows up,
// *exceeded* at the top of the interval, and *missed* below half. Half is a
// deliberately forgiving line — a forecast is a direction, not a promise — but
// it is a line, and the re-measurement writes down which side of it the change
// landed on.

const round6 = (x) => Math.round(Number(x) * 1e6) / 1e6 + 0

/**
 * @param {{
 *   pending: {version:number, prediction:{point:number,low:number,high:number}, baseline:object},
 *   round: {n:number, taskId:string, chainVersion:number, score:number}
 * }} input
 * @returns {null | {version:number, taskId:string, round:number, baseline:number|null, actual:number, realized:number, predicted:object, verdict:'met'|'exceeded'|'missed'}}
 */
export function measurePrediction({ pending, round } = {}) {
  if (!pending || !round) return null
  if (Number(round.chainVersion) !== Number(pending.version)) return null
  if (!Number.isFinite(Number(round.score))) return null
  return grade({ version: pending.version, prediction: pending.prediction, baseline: pending.baseline, round })
}

/**
 * The same grade, for a proposal that was *refused*.
 *
 * The counterfactual is cheap and exact: the next round ran on the chain that
 * stayed in force, so its delta against the pre-decline baseline is what
 * happened without the change. `missed` means the decline kept money; `met`
 * means the decline left the predicted gain on the table. Neither is a
 * correction to the person's decision — it is the record of what the decision
 * cost, which is the only thing that makes a forecast worth writing down.
 *
 * @param {{
 *   declined: {version:number, prediction:object, baseline:object},
 *   round: {n:number, taskId:string, chainVersion:number, score:number}
 * }} input
 * @returns {null | {version:number, applied:false, taskId:string, round:number, baseline:number|null, actual:number, realized:number, predicted:object, verdict:'met'|'exceeded'|'missed'}}
 */
export function measureDeclined({ declined, round } = {}) {
  if (!declined || !round) return null
  // Guard the counterfactual: if somebody activated that very version in the
  // meantime, the round no longer ran without it and the delta is not a
  // counterfactual. Silence is correct here; the activation has its own pending.
  if (Number(round.chainVersion) === Number(declined.version)) return null
  if (!Number.isFinite(Number(round.score))) return null
  const graded = grade({ version: declined.version, prediction: declined.prediction, baseline: declined.baseline, round })
  return graded ? { ...graded, applied: false } : null
}

function grade({ version, prediction, baseline: table, round }) {
  const taskId = round.taskId ?? null
  if (taskId == null) return null
  const before = table?.[taskId]
  const baseline = Number.isFinite(Number(before)) ? Number(before) : null
  const actual = Number(round.score)
  const realized = round6(actual - (baseline ?? 0))
  const predicted = prediction ?? null
  const point = Number(predicted?.point)
  const high = Number(predicted?.high)
  let verdict = 'missed'
  if (Number.isFinite(point) && realized < point * 0.5) verdict = 'missed'
  else if (Number.isFinite(high) && high > 0 && realized >= high) verdict = 'exceeded'
  else verdict = 'met'
  return {
    version: Number(version),
    taskId,
    round: round.n ?? null,
    baseline,
    actual,
    realized,
    predicted,
    verdict,
  }
}
