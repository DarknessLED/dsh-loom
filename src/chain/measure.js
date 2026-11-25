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
  // A settlement needs a forecast to settle. Without one there is nothing to be
  // met or missed, and grading it anyway wrote `verdict: 'met'` for 59 of the
  // 62 settlements in this ledger: the campaign opened by activating its chain,
  // that activation carried no prediction, and every first round was recorded as
  // a forecast that came true. The reducer no longer creates such a pending
  // record; this is the second door, because a record can also be hand-written.
  if (!Number.isFinite(Number(pending.prediction?.point))) return null
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

/**
 * The same question for a *patch* a person refused at the gate.
 *
 * This one carries no forecast: the card showed a score, not a prediction. So
 * the honest reading is a comparison, not a delta against a predicted point —
 * the card's score is what the refused patch had already reached, and the next
 * round on that task says whether the task got there anyway.
 *
 * The verdicts are named for what a refusal costs rather than reusing the
 * forecast's `met`/`missed`: `cost-nothing` means the task reached the card's
 * score without the patch, and `left-on-table` means it did not. Reusing the
 * forecast vocabulary here would quietly equate "no prediction" with "a
 * prediction that was graded", which is the confusion this record exists to end.
 *
 * A task that never came back gets `null`. "Never measured" and "cost nothing"
 * are different facts, and the ledger keeps the first as `measured: false`
 * rather than letting both collapse into a zero.
 *
 * @param {{
 *   declined: {taskId:string|null, cardScore:number|null},
 *   round: {n:number, taskId:string, score:number}
 * }} input
 * @returns {null | {kind:string, applied:false, taskId:string, round:number, cardScore:number, actual:number, realized:number, verdict:'cost-nothing'|'left-on-table'}}
 */
export function measureDeclinedGate({ declined, round } = {}) {
  if (!declined || !round) return null
  if (declined.taskId == null || round.taskId == null) return null
  if (String(round.taskId) !== String(declined.taskId)) return null
  if (!Number.isFinite(Number(round.score))) return null
  // No card score means the card did not record what the patch achieved, and
  // substituting 0 would credit the refusal with a gain it never demonstrated.
  // `Number(null)` is 0, so the null check has to come before the numeric one.
  if (declined.cardScore == null || !Number.isFinite(Number(declined.cardScore))) return null
  const cardScore = Number(declined.cardScore)
  const actual = Number(round.score)
  const realized = round6(actual - cardScore)
  return {
    kind: 'gate',
    applied: false,
    taskId: String(declined.taskId),
    round: round.n ?? null,
    cardScore,
    actual,
    realized,
    verdict: actual >= cardScore ? 'cost-nothing' : 'left-on-table',
  }
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
