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
  const taskId = round.taskId ?? null
  if (taskId == null) return null
  const before = pending.baseline?.[taskId]
  const baseline = Number.isFinite(Number(before)) ? Number(before) : null
  const actual = Number(round.score)
  const realized = round6(actual - (baseline ?? 0))
  const predicted = pending.prediction ?? null
  const point = Number(predicted?.point)
  const high = Number(predicted?.high)
  let verdict = 'missed'
  if (Number.isFinite(point) && realized < point * 0.5) verdict = 'missed'
  else if (Number.isFinite(high) && high > 0 && realized >= high) verdict = 'exceeded'
  else verdict = 'met'
  return {
    version: Number(pending.version),
    taskId,
    round: round.n ?? null,
    baseline,
    actual,
    realized,
    predicted,
    verdict,
  }
}
