// Sequential promotion gate (PACE, arXiv 2606.08106).
//
// The rule this replaces is "keep the candidate if its score went up". Reused
// on the same task set round after round, that is adaptive multiple testing:
// every look at the same instances spends some of the same noise budget, and
// the false-commit rate climbs with the number of rounds. PACE's answer is a
// testing-by-betting e-process over *discordant pairs* — tasks where the
// candidate and the incumbent disagree — whose guarantee holds at any stopping
// time, so the loop may look after every round without inflating anything.
//
// Under the null (the candidate is no better) each pair is a fair bet, so
// E_i = prod_j (1 + lambda * (2 w_j - 1)) is a non-negative martingale starting
// at 1. Ville's inequality then gives Pr[sup_t E_t >= 1/alpha] <= alpha for
// every alpha, and in particular it does not care how many times we looked.
//
// Three properties are load-bearing and each one has a spec:
//   - E starts at 1 and a tie is not a pair (a task where both agree carries no
//     information about which is better);
//   - crossing is decided by the running maximum, not the final value, so later
//     losses cannot un-decide a commit;
//   - "we have not decided" is its own answer. Collapsing it into "reject"
//     would make a conservative gate indistinguishable from a broken one.

export const DEFAULT_ALPHA = 0.05
export const DEFAULT_LAMBDA = 0.5

function finiteOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Product of the per-pair bet payoffs. `discordant` holds 1 for a pair the
 * candidate won and 0 for one it lost; anything else (a tie, undefined) is not
 * a pair and is dropped rather than counted as a loss.
 */
export function eValue(discordant, { lambda = DEFAULT_LAMBDA } = {}) {
  const l = finiteOr(lambda, DEFAULT_LAMBDA)
  let e = 1
  for (const w of Array.isArray(discordant) ? discordant : []) {
    if (w !== 1 && w !== 0) continue
    // A won pair multiplies by (1 + lambda), a lost one by (1 - lambda).
    e *= 1 + l * (2 * w - 1)
  }
  return e
}

/**
 * Decide, and say which of the three answers it is. `commit` is kept as a
 * boolean so existing readers of `gate.evaluated.promoted` keep working; the
 * `decision` word is what distinguishes "the evidence says yes" from "the
 * evidence is not in yet" from "the evidence says no".
 */
export function commitDecision({
  discordant = [],
  alpha = DEFAULT_ALPHA,
  lambda = DEFAULT_LAMBDA,
} = {}) {
  const a = finiteOr(alpha, DEFAULT_ALPHA)
  const l = finiteOr(lambda, DEFAULT_LAMBDA)
  const threshold = 1 / a
  const pairs = (Array.isArray(discordant) ? discordant : []).filter((w) => w === 1 || w === 0)
  const base = { alpha: a, lambda: l, threshold, pairs: pairs.length }

  if (!pairs.length) {
    return {
      ...base,
      commit: false,
      decision: 'defer',
      eValue: 1,
      firstCrossing: null,
      reason: 'no discordant pairs',
    }
  }

  // Walk the sequence and remember the *first* time the running value crossed.
  // Reading only the final E would let a later loss revoke an earned commit,
  // which is exactly the guarantee this module exists to provide.
  let running = 1
  let firstCrossing = null
  for (let i = 0; i < pairs.length; i++) {
    running *= 1 + l * (2 * pairs[i] - 1)
    if (firstCrossing === null && running >= threshold) firstCrossing = i + 1
  }

  if (firstCrossing !== null) {
    return {
      ...base,
      commit: true,
      decision: 'commit',
      eValue: running,
      firstCrossing,
      crossedEValue: eValue(pairs.slice(0, firstCrossing), { lambda: l }),
      reason: `e-process crossed 1/alpha at pair ${firstCrossing} of ${pairs.length}`,
    }
  }
  if (running <= a) {
    return {
      ...base,
      commit: false,
      decision: 'reject',
      eValue: running,
      firstCrossing: null,
      reason: `e-process fell to ${running.toFixed(4)} <= alpha ${a}`,
    }
  }
  return {
    ...base,
    commit: false,
    decision: 'defer',
    eValue: running,
    firstCrossing: null,
    reason: `e-process at ${running.toFixed(4)} is between alpha ${a} and 1/alpha ${threshold}`,
  }
}

/**
 * The discordant sequence a real campaign implies: for one task, each round is
 * compared with the best score that task had reached before it. A tie is not a
 * pair; the first observation has no incumbent to beat and is not one either.
 *
 * The pairing is only as good as the claim that the two numbers came from the
 * same instances. Ours come from separate worktrees and possibly reinstalled
 * dependencies, which is a real gap between this function and PACE's premise —
 * it is recorded in the open-question ledger rather than papered over here.
 */
export function pairedHistory(rounds, taskId) {
  if (!Array.isArray(rounds)) return []
  const out = []
  let best = null
  const sorted = rounds
    // A round that has started but not finished has `score: null`, and
    // `Number(null)` is 0 — finite, so a bare `Number.isFinite(Number(...))`
    // counts the current round as a zero and manufactures a loss out of a
    // measurement that has not happened yet. Only a real number counts.
    .filter((r) => r && String(r.taskId) === String(taskId) && r.score !== null && r.score !== undefined && Number.isFinite(Number(r.score)))
    .sort((a, b) => Number(a.n) - Number(b.n))
  for (const r of sorted) {
    const score = Number(r.score)
    if (best === null) {
      best = score
      continue
    }
    if (score > best) {
      out.push(1)
      best = score
    } else if (score < best) {
      out.push(0)
    }
    // Equal to the best so far: no information about which is better.
  }
  return out
}

/**
 * One round's discordant pair, taken against the base.
 *
 * The tempting pairing inside a round is "the winner against the losers", and it
 * is worthless: the winner *is* the highest score, so every pair it produces is a
 * win by construction. Eight rounds of that reach E = 1.5^8 no matter whether
 * anything improved, which is precisely the self-confirming gate this module was
 * written to replace. (It was written that way first, the shadow table came out
 * with 14 commits, and the tautology was the reason.)
 *
 * The honest pair is the candidate against the base tree, measured on the same
 * task with the same verifier: the base is read before any candidate exists, so
 * either side can be higher. `null` for either side means unmeasured, which is
 * not a pair — a skipped base is not evidence that the candidate failed.
 */
export function pairedAgainstBase({ candidate, base, epsilon = 0 } = {}) {
  const c = Number(candidate)
  const b = Number(base)
  if (candidate === null || candidate === undefined || !Number.isFinite(c)) return []
  if (base === null || base === undefined || !Number.isFinite(b)) return []
  const delta = c - b
  const eps = Number.isFinite(Number(epsilon)) ? Math.abs(Number(epsilon)) : 0
  if (delta > eps) return [1]
  if (delta < -eps) return [0]
  return []
}
