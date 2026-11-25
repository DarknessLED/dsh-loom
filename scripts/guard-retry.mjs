/**
 * Which suites earn a retry, and which are actually broken.
 *
 * The guard runs every spec once. A failure used to end the round's promotion on
 * the spot, and a flake under load — `tests/tri9/early-abort.test.mjs` failed in
 * the full run and passed alone — cost a promotion and several minutes of guard
 * time. One retry separates "this suite is load-sensitive" from "this change is
 * wrong", which is the difference between a guard and a coin flip.
 *
 * There is a third thing a non-zero status can mean, and it is not a verdict on
 * the code: the harness's Windows job runner sometimes kills a child outright.
 * Its stderr says `SUBPROCESS_RUNNER_FAILED: Windows Job runner exited with exit
 * code 1073807364` and the status is the runner's, not the program's. Reading
 * that as "the tests failed" threw away a seven-direction survey rerun. A killed
 * run is named as killed, spends the same one retry, and when the retries run
 * out the report says the code was never judged.
 *
 * Pure on purpose: the runner owns the processes, this owns the rule.
 */

/** The status the Windows job runner leaves behind when it kills a child. */
export const JOB_RUNNER_KILL_STATUS = 1073807364

const KILL_PATTERN = /SUBPROCESS_RUNNER_FAILED/

/**
 * Did the harness kill this run, rather than the program return this status?
 *
 * Both signals are accepted because neither is always present: the runner's
 * exit code is lost through some spawn paths, and a program that exits with the
 * runner's code by coincidence is far less likely than the stderr line. A pass
 * (`status === 0`) is never a kill.
 *
 * @param {{status?: number|null, output?: string|null}} [run]
 * @returns {boolean}
 */
export function isKilledRun(run = {}) {
  const status = run?.status
  if (status === 0) return false
  if (status === JOB_RUNNER_KILL_STATUS) return true
  return KILL_PATTERN.test(String(run?.output ?? ''))
}

const notRetried = (status) => status === null || status === undefined

/**
 * Classify every suite that did not pass on its first run.
 *
 * The lists mean exactly what they say:
 * - `retry`     — still owes its one retry (a genuine failure or a killed run);
 * - `recovered` — the first run was killed and the retry passed;
 * - `flaky`     — the first run failed and the retry passed;
 * - `failed`    — the code was judged and failed (a genuine failure that did
 *                 not pass on retry, including a retry that was itself killed);
 * - `killed`    — every run was killed: no retry is left and the code was never
 *                 judged, so it is neither a pass nor a failure.
 * - `killedFirst` — the first run was killed, whatever happened after.
 *
 * A killed first run is retried even though its status is non-zero; a genuine
 * failure keeps exactly the one retry it always had. A genuine failure whose
 * retry the runner killed stays a failure: the first run was a real verdict and
 * the budget is spent, so the kill does not buy the suite a third run.
 *
 * @param {Array<{file: string, firstStatus?: number|null, firstOutput?: string|null,
 *   retryStatus?: number|null, retryOutput?: string|null}>} results
 * @returns {{retry: string[], killedFirst: string[], recovered: string[],
 *   flaky: string[], killed: string[], failed: string[]}}
 */
export function guardReport(results = []) {
  const retry = []
  const killedFirst = []
  const recovered = []
  const flaky = []
  const killed = []
  const failed = []
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || typeof r.file !== 'string') continue
    if (r.firstStatus === 0) continue
    const firstKilled = isKilledRun({ status: r.firstStatus, output: r.firstOutput })
    if (firstKilled) killedFirst.push(r.file)
    if (notRetried(r.retryStatus)) {
      retry.push(r.file)
      continue
    }
    const retryKilled = isKilledRun({ status: r.retryStatus, output: r.retryOutput })
    if (retryKilled) {
      // A kill is never a verdict. If the first run was a genuine failure the
      // suite already had its retry, so it stays failed; if the first run was
      // killed too, the code was never judged at all.
      if (firstKilled) killed.push(r.file)
      else failed.push(r.file)
      continue
    }
    if (r.retryStatus === 0) {
      if (firstKilled) recovered.push(r.file)
      else flaky.push(r.file)
    } else failed.push(r.file)
  }
  return { retry, killedFirst, recovered, flaky, killed, failed }
}

/**
 * The three-list view the guard used before killed runs had a name.
 *
 * Kept so existing callers and specs keep their exact vocabulary; it is derived
 * from {@link guardReport} so there is one rule, not two.
 *
 * @param {Array<{file: string, firstStatus: number|null, retryStatus?: number|null}>} results
 * @returns {{retry: string[], flaky: string[], failed: string[]}}
 */
export function retryPlan(results = []) {
  const plan = guardReport(results)
  return { retry: plan.retry, flaky: plan.flaky, failed: plan.failed }
}
