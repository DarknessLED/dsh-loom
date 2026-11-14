/**
 * Which suites earn a retry, and which are actually broken.
 *
 * The guard runs every spec once. A failure used to end the round's promotion on
 * the spot, and a flake under load — `tests/tri9/early-abort.test.mjs` failed in
 * the full run and passed alone — cost a promotion and several minutes of guard
 * time. One retry separates "this suite is load-sensitive" from "this change is
 * wrong", which is the difference between a guard and a coin flip.
 *
 * Pure on purpose: the runner owns the processes, this owns the rule.
 *
 * @param {Array<{file: string, firstStatus: number|null, retryStatus?: number|null}>} results
 * @returns {{retry: string[], flaky: string[], failed: string[]}}
 */
export function retryPlan(results = []) {
  const retry = []
  const flaky = []
  const failed = []
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || typeof r.file !== 'string') continue
    if (r.firstStatus === 0) continue
    if (r.retryStatus === null || r.retryStatus === undefined) {
      retry.push(r.file)
      continue
    }
    if (r.retryStatus === 0) flaky.push(r.file)
    else failed.push(r.file)
  }
  return { retry, flaky, failed }
}
