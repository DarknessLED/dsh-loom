// What a chain change is expected to buy, from what this campaign measured.
//
// A card that asks a human to adopt a new loop must not answer "trust me". It
// can only be honest about the record it has: the size of the wins this campaign
// has already landed, the share of rounds that landed one, and — for an extra
// candidate — the gap between the best and second-best attempt of a round,
// which is the measured upper bound on what one more draw can add.
//
// Everything here is a forecast with a stated basis. `prior` is a valid answer:
// on a campaign that has promoted nothing there is no measured win to discount,
// so the interval is the remaining headroom and the point is a quarter of it.
// The re-measurement after adoption is what turns that prior into evidence.

const UNMEASURED = new Set(['interrupted', 'error', 'budget'])

function clamp01(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function round4(n) {
  return Math.round(Number(n) * 1e4) / 1e4 + 0
}

function finiteScore(round) {
  return Number.isFinite(Number(round?.score))
}

/** Rounds that actually produced a score: a crash or an interruption measured nothing. */
export function measuredRounds(rounds) {
  return (Array.isArray(rounds) ? rounds : [])
    .filter((r) => r && typeof r === 'object' && finiteScore(r) && !UNMEASURED.has(r.status))
    .slice()
    .sort((a, b) => Number(a.n) - Number(b.n))
}

function percentile(xs, p) {
  const s = [...xs].sort((a, b) => a - b)
  if (!s.length) return null
  const idx = (s.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

const median = (xs) => percentile(xs, 0.5)

/** Wilson score interval for a proportion; wide when n is small, as it should be. */
function wilson(k, n, z = 1.96) {
  if (!n) return [0, 1]
  const p = k / n
  const denom = 1 + (z * z) / n
  const center = (p + (z * z) / (2 * n)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom
  return [Math.max(0, center - half), Math.min(1, center + half)]
}

/**
 * Size of the improvements this campaign has actually landed.
 *
 * A promotion that raises a task's best score from 0.4 to 0.7 is a 0.3 win. The
 * first score for a task is not an improvement over anything, so it is measured
 * from zero — the campaign did move that task from nothing to something.
 */
function winSizes(rounds) {
  const best = new Map()
  const out = []
  for (const r of rounds) {
    const task = r.taskId ?? '_'
    const score = Number(r.score)
    const prev = best.get(task)
    if (r.promoted === true && score > (prev ?? -Infinity)) {
      const gain = prev == null ? score : score - prev
      if (gain > 0) out.push(gain)
    }
    if (prev == null || score > prev) best.set(task, score)
  }
  return out
}

/**
 * What a round's two attempts say about buying a third.
 *
 * Two numbers matter and they are not the same. The gap between the best and
 * the second-best attempt is the most the next draw could add, but the next
 * draw does not reliably beat the incumbent: it only pays when it lands above
 * the best of the two already bought. So the estimator keeps the per-round gap
 * and also counts how often the later draw actually beat the earlier one; the
 * forecast is the beat rate times the size of the wins it produced.
 */
function topTwoEvidence(rounds) {
  const gaps = []
  const positiveGaps = []
  let beats = 0
  let pairs = 0
  for (const r of rounds) {
    const attempts = (Array.isArray(r.attempts) ? r.attempts : [])
      .filter((a) => a && a.screenedOut !== true && a.verifierOk === true && Number.isFinite(Number(a.score)))
      .map((a) => Number(a.score))
    if (attempts.length < 2) continue
    const [first, second] = attempts
    if (second > first) {
      beats += 1
      positiveGaps.push(second - first)
    }
    pairs += 1
    attempts.sort((a, b) => b - a)
    const gap = attempts[0] - attempts[1]
    if (gap > 0) gaps.push(gap)
  }
  return { gaps, positiveGaps, beats, pairs }
}

/**
 * Grade forecasted gains against what adoption actually measured.
 *
 * `coverage` is the share of outcomes inside the stated interval; `mae` is the
 * average distance to the point forecast. Both are reported because a narrow
 * interval can win on error and still be wrong about how often it covers.
 */
export function summarizeCalibration(measurements = []) {
  const list = (Array.isArray(measurements) ? measurements : []).filter(
    (m) => m && Number.isFinite(Number(m.realized)) && Number.isFinite(Number(m.predicted?.point)),
  )
  const tally = (rows) => {
    let met = 0
    let missed = 0
    let exceeded = 0
    let inside = 0
    let absError = 0
    for (const m of rows) {
      if (m.verdict === 'missed') missed += 1
      else if (m.verdict === 'exceeded') exceeded += 1
      else met += 1
      const low = Number(m.predicted?.low)
      const high = Number(m.predicted?.high)
      const realized = Number(m.realized)
      const covered = Number.isFinite(low) && Number.isFinite(high)
        ? realized >= low && realized <= high
        : m.verdict !== 'missed'
      if (covered) inside += 1
      absError += Math.abs(realized - Number(m.predicted.point))
    }
    const n = rows.length
    return { n, met, missed, exceeded, coverage: n ? inside / n : 0, mae: n ? absError / n : 0 }
  }
  const groups = {}
  for (const m of list) {
    const key = typeof m.predicted?.basis === 'string' && m.predicted.basis ? m.predicted.basis : 'unknown'
    ;(groups[key] ||= []).push(m)
  }
  // Coverage is only meaningful per basis: a prior `[0, 1]` covers almost
  // anything, so pooling it with measured intervals would flatter the number
  // that is supposed to say whether forecasts hold.
  const byBasis = {}
  for (const [key, rows] of Object.entries(groups)) byBasis[key] = tally(rows)
  // A counterfactual is graded the same way but is not the same claim: "the
  // chain I adopted moved the score this much" and "the chain I refused would
  // have moved it this much" answer different questions, and pooling them would
  // let declined forecasts quietly improve the calibration of adopted ones.
  const appliedRows = list.filter((m) => m.applied !== false)
  const declinedRows = list.filter((m) => m.applied === false)
  return {
    ...tally(list),
    byBasis,
    applied: tally(appliedRows),
    declined: tally(declinedRows),
  }
}

/**
 * Forecast the score gain of one chain mutation.
 *
 * @param {{kind:string, rounds?:Array<object>, config?:object, candidates?:number}} input
 * @returns {{point:number, low:number, high:number, samples:number, basis:'rounds'|'prior', method:string}}
 */
export function predictGain({ kind, rounds = [], config = {}, candidates = null } = {}) {
  const list = measuredRounds(rounds)
  if (kind === 'candidates+1') {
    const { gaps, positiveGaps, beats, pairs } = topTwoEvidence(list)
    if (beats > 0) {
      const rate = beats / pairs
      const [pLo, pHi] = wilson(beats, pairs)
      const point = clamp01(rate * median(positiveGaps))
      const low = clamp01(pLo * percentile(positiveGaps, 0.25))
      const high = clamp01(pHi * percentile(positiveGaps, 0.9))
      return {
        point: round4(point),
        low: round4(Math.min(low, point)),
        high: round4(Math.max(high, point)),
        samples: pairs,
        basis: 'rounds',
        method: `P(second attempt beats first) ${rate.toFixed(2)} × median winning gap ${round4(median(positiveGaps))} (${beats} beat(s) in ${pairs} pair(s)), Wilson interval`,
      }
    }
    if (gaps.length) {
      const point = clamp01(median(gaps))
      const low = clamp01(percentile(gaps, 0.25))
      const high = clamp01(percentile(gaps, 0.9))
      return {
        point: round4(point),
        low: round4(Math.min(low, point)),
        high: round4(Math.max(high, point)),
        samples: gaps.length,
        basis: 'rounds',
        method: `median gap between the best and the second-best attempt (${gaps.length} round(s)); an upper bound on one more draw, since no second draw beat the first here`,
      }
    }
  } else {
    const wins = winSizes(list)
    const n = list.length
    const promotions = list.filter((r) => r.promoted === true).length
    if (wins.length && n >= 2) {
      const rate = promotions / n
      const [pLo, pHi] = wilson(promotions, n)
      const point = clamp01(rate * median(wins))
      const low = clamp01(pLo * percentile(wins, 0.25))
      const high = clamp01(Math.min(1, pHi * percentile(wins, 0.9)))
      return {
        point: round4(point),
        low: round4(Math.min(low, point)),
        high: round4(Math.max(high, point)),
        samples: wins.length,
        basis: 'rounds',
        method: `win rate ${rate.toFixed(2)} × median win ${round4(median(wins))} (${wins.length} win(s) in ${n} round(s)), Wilson interval`,
      }
    }
  }

  // No measured win to discount: state the headroom and take a conservative
  // quarter of it. The interval is the whole headroom on purpose — this is a
  // prior, and the card says so.
  const best = new Map()
  for (const r of list) {
    const task = r.taskId ?? '_'
    const score = Number(r.score)
    if (!best.has(task) || score > best.get(task)) best.set(task, score)
  }
  const meanBest = best.size ? [...best.values()].reduce((s, x) => s + x, 0) / best.size : 0
  const headroom = clamp01(1 - meanBest)
  const n = list.length
  const promotions = list.filter((r) => r.promoted === true).length
  return {
    point: round4(headroom * 0.25),
    low: 0,
    high: round4(headroom),
    samples: 0,
    basis: 'prior',
    method: `headroom prior: ${n} round(s) measured, ${promotions} promoted; 25% of the remaining ${round4(headroom)}`,
  }
}

/**
 * What goes wrong if the change is wrong.
 *
 * The probability is the campaign's own no-win rate over the last window: this
 * is the state the proposal is trying to escape, so it is also the risk of
 * paying for another flat round. Cost is named when the mutation buys more work.
 *
 * @param {{rounds?:Array<object>, window?:number, kind?:string, candidates?:number}} input
 * @returns {{level:'low'|'medium'|'high', probability:number, reasons:string[]}}
 */
export function regressionRisk({ rounds = [], window = 3, kind = null, candidates = null } = {}) {
  const list = measuredRounds(rounds)
  const size = Math.max(1, Number(window) || 3)
  const last = list.slice(-size)
  const flat = last.filter((r) => r.promoted !== true).length
  const probability = last.length ? flat / last.length : 1
  const level = probability >= 0.67 ? 'high' : probability >= 0.34 ? 'medium' : 'low'
  const reasons = []
  if (!last.length) {
    reasons.push('no measured rounds: the interval is a prior, not a measurement')
  } else if (flat === last.length) {
    reasons.push(`all ${last.length} of the last rounds promoted nothing`)
  } else if (flat > 0) {
    reasons.push(`${flat} of the last ${last.length} rounds promoted nothing`)
  }
  if (kind === 'candidates+1' && Number(candidates) >= 1) {
    reasons.push(`round cost rises about ${Math.round(100 / Number(candidates))}% (${candidates} → ${Number(candidates) + 1} candidates)`)
  }
  if (last.length && last.length < size) {
    reasons.push(`only ${last.length} measured round(s) in a ${size}-round window`)
  }
  return { level, probability: round4(probability), reasons }
}
