#!/usr/bin/env node
// Runs the regression suite (unit tests + host-verify) and exits non-zero on the
// first failure. Used as the dsh-loom autopilot guard: a promotion that breaks
// any of these is rolled back instead of being left in the workspace.
//
// Deliberately excludes tests/self*/ — those are the specs a campaign is still
// trying to satisfy, so they are expected to fail while the loop works.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const testsDir = join(root, 'tests')
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
  .map((f) => join(testsDir, f))
// Specs that pin behaviour the loop already has: they are not tasks, but they
// must keep passing, so a promotion cannot quietly remove the guard.
// Adversarial specs live in their own directory: they model failures (dead
// children, drifting ledgers, restarts) rather than features.
const chaosDir = join(testsDir, 'chaos')
for (const f of readdirSync(chaosDir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  files.push(join(chaosDir, f))
}
const standing = [
  'tests/self10/panel-decide.test.mjs',
  // once a self-improvement campaign lands, its spec becomes a regression pin:
  // the loop must not be able to un-solve a task it already solved.
  'tests/self11/spend-estimate.test.mjs',
  'tests/self11/docs-coverage.test.mjs',
  // the chain got cheaper and the loop has to stay that way: no second candidate
  // once the first one solves the task, and planning counted as its own leg.
  'tests/tri3/cascade.test.mjs',
  'tests/tri3/plan-share.test.mjs',
  // the adversarial specs the loop solved are pins too: an unreachable gate or a
  // panel that 500s must not come back.
  'tests/chaos2/panel-degrade.test.mjs',
  'tests/chaos2/exhausted-round.test.mjs',
  'tests/chaos3/stuck-gate.test.mjs',
  // recovery is idempotent: running it twice must repair once and then do nothing
  'tests/chaos2/recover-idempotent.test.mjs',
  // the master switch must never move campaign history
  'tests/switch/switch.test.mjs',
  // the loop control is a switch, and the money is labelled truthfully
  'tests/ui/a11y.test.mjs',
  'tests/ui/cost-honest.test.mjs',
  // the triangle's first two solved specs: a second candidate with a
  // byte-identical patch must not re-spawn the verifier, and a round the budget
  // cannot afford must not be dispatched.
  'tests/tri/verifier-reuse.test.mjs',
  'tests/tri2/recon-reuse.test.mjs',
  'tests/tri2/guard-reuse.test.mjs',
  'tests/tri/budget-preflight.test.mjs',
  // evidence has to be scoped to what it measured: a verdict belongs to the
  // commit it ran on, tokens are priced or said to be unpriced, and a plan that
  // no longer covers a changed file is not reused.
  'tests/tri4/verifier-key.test.mjs',
  'tests/tri4/cost-truth.test.mjs',
  'tests/tri4/plan-delta.test.mjs',
  // a standing problem is one question, not one per tick
  'tests/setup/no-workspace-spam.test.mjs',
  // the queue tells you how long it has waited, and a hit is reachable by keyboard
  'tests/ui/pending-queue.test.mjs',
  'tests/ui/keyboard-hit.test.mjs',
  // a checkpoint row says what happened and what ignoring it costs, in its
  // own line and in the row's title, not only on hover
  'tests/ui/checkpoint-help.test.mjs',
  // 暂缓 must postpone in both doors, and a token budget must be a cap
  'tests/ui/snooze.test.mjs',
  'tests/tri8/token-cap.test.mjs',
  // a one-shot winner must stop the siblings it made redundant
  'tests/tri9/early-abort.test.mjs',
  // the queue says how many are waiting and where each risk came from, and a
  // sparkline tells an unscored round apart from one that scored zero
  'tests/ui/queue-total.test.mjs',
  'tests/ui/spark-baseline.test.mjs',
  // colours come from one palette, and parallelism is measured against the
  // window candidates actually had
  'tests/ui/tones.test.mjs',
  'tests/tri5/plan-aware.test.mjs',
  // the holdout gate is timed instead of being charged to the candidates
  'tests/tri6/attempt-window.test.mjs',
  'tests/tri6/holdout-split.test.mjs',
  // the campaign reads its own record to decide whether a second opinion pays,
  // and every checkpoint explains itself
  'tests/tri7/adaptive-cascade.test.mjs',
  'tests/ui/checkpoint-help.test.mjs',
  // a failed read explains itself instead of printing a raw error, a live
  // campaign is never called "empty", and the status is compact by default:
  // once solved these are pins, so a promotion cannot delete the guard.
  'tests/ui/error-state.test.mjs',
  'tests/tri10/status-compact.test.mjs',
  'tests/tri11/plan-timeout.test.mjs',
  'tests/tri11/holdout-rotation.test.mjs',
  'tests/tri13/plan-model.test.mjs',
  // knowledge is read the same way in every place that shows it, and an approval
  // names the round it lands - a checkpoint that knows only its artifact path (an
  // anomaly raised while applying a promotion) must not strand the round as open:
  'tests/ui/knowledge-single-source.test.mjs',
  'tests/landing-target.test.mjs',
  // a plan node has an identity, and a node whose round ends unfinished is lost -
  // once a promotion lands this it must not be able to delete the guard:
  'tests/dag1/node-identity.test.mjs',
  // which holdout a round tests is a function of ids, and the ledger says which
  // partition ran from which pool:
  'tests/dag4/holdout-partition.test.mjs',
  // a child that dies in a second saying nothing is a broken parent, not a failed
  // task: rebuild once, retry, and never record a null reason:
  'tests/lifecycle/dispatch-recovery.test.mjs',
  // the panel shows node attribution: newest round first, capped, Chinese labels:
  'tests/ui/node-attribution.test.mjs',
  // a round whose attempts all died to a plugin re-apply is interrupted, not a
  // measured zero:
  'tests/lifecycle/dispose-recovery.test.mjs',
  // the second candidate is an option priced by its tail, and the panel draws the
  // round as one band instead of five chips:
  'tests/balance/second-candidate.test.mjs',
  'tests/balance/second-candidate.test.mjs', "tests/balance/second-candidate-gate.test.mjs",
  'tests/ui/node-band.test.mjs',
  'tests/ui/node-band.test.mjs', "tests/ui/node-band-render.test.mjs",
  // the planner can be switched off per policy and says which mode it ran in, and
  // a narrow sidebar keeps only the three cells that carry the answer:
  'tests/balance/plan-mode.test.mjs', "tests/balance/plan-mode-evidence.test.mjs",
  'tests/ui/metrics-priority.test.mjs',
  // a campaign can carry its own policy, and a stuck round explains itself first:
  'tests/balance/policy-override.test.mjs',
  'tests/ui/tree-fail-first.test.mjs',
  // a policy override needs a writer, not just a reader:
  'tests/balance/policy-set.test.mjs',
]
for (const rel of standing) files.push(join(root, rel))
files.push(join(root, 'scripts', 'verify.mjs'))

let failed = 0
for (const file of files) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  const ms = Date.now() - started
  if (run.status === 0) {
    console.log(`ok   ${file.slice(root.length + 1)} (${ms}ms)`)
  } else {
    failed += 1
    const tail = `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-12).join('\n')
    console.log(`FAIL ${file.slice(root.length + 1)} (${ms}ms)\n${tail}\n`)
  }
}
console.log(`\n${files.length - failed}/${files.length} suites passed`)
if (failed) process.exitCode = 1
