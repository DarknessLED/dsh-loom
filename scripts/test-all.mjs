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
import { retryPlan } from './guard-retry.mjs'

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
  // a worktree is a checkout of tracked files, and node_modules is never tracked:
  // three rounds of loom-ui7 died on a holdout failure that was really a verifier
  // measuring a tree with no dependencies.
  'tests/exec/worktree-deps.test.mjs',
  // a task that says `node` must reach a node, even under an Electron host
  'tests/exec/node-is-on-path.test.mjs',
  // a fact the runner knows must be in the brief, not discovered by the worker
  'tests/shell-is-stated.test.mjs',
  // and the link it makes must never end up inside a patch: a repo that does not
  // ignore node_modules would otherwise promote its own dependency tree.
  'tests/exec/patch-skips-deps.test.mjs',
  // the planner was stopped by a clock it was never told about: 85 of 132 planned
  // rounds came back empty while burning 24% of the wall clock.
  'tests/dispatch/brief-states-budget.test.mjs',
  'tests/balance/brief-states-deadline.test.mjs',
  // once a self-improvement campaign lands, its spec becomes a regression pin:
  // the loop must not be able to un-solve a task it already solved.
  'tests/self11/spend-estimate.test.mjs',
  'tests/self11/docs-coverage.test.mjs',
  // self15: the six things the loop could not do. Each one was red in the tree
  // when the campaign bought it, so keeping them here is what stops a later
  // round from quietly removing the guard it took fourteen rounds to earn.
  'tests/self15/billing.test.mjs',
  'tests/self15/billing-from-ledger.test.mjs',
  'tests/self15/checkpoints.test.mjs',
  'tests/self15/decisions.test.mjs',
  'tests/self15/verdict.test.mjs',
  'tests/self15/chain-dag.test.mjs',
  'tests/self15/promotion-noise.test.mjs',
  // the panel owes the reader the same answer the ledger holds: one decision
  // at a time, and a verdict on a campaign that stopped.
  'tests/self15/panel-one-row.test.mjs',
  'tests/self15/panel-end.test.mjs',
  // self20: a DAG that runs by dependency, rounds that file their own outcome,
  // cost broken down per node, the checkpoint backlog migration, the measured
  // noise bar, guard routing, the promotion lock and the rollback sweep.
  'tests/self20/dag-parallel.test.mjs',
  'tests/self20/round-honesty.test.mjs',
  'tests/self20/round-cost.test.mjs',
  'tests/self20/ledger-migrate.test.mjs',
  'tests/self20/gate-noise.test.mjs',
  'tests/self20/guard-routing.test.mjs',
  'tests/self20/promotion-lock.test.mjs',
  'tests/self20/rollback-clean.test.mjs',
  // a guard that fails on a flake costs a round: p5-wire round 3 was rolled back
  // for tests/tri9/early-abort.test.mjs passing alone seconds later.
  'tests/self20/guard-retry.test.mjs',
  // p6-route: the panel route finally answered a real request (GET 200 from the
  // host port, not a proxy 404), the budget now says what it can afford, and the
  // gate reads a graded score when the verifier prints one.
  'tests/self20/panel-route.test.mjs',
  'tests/self20/budget-funding.test.mjs',
  'tests/self20/killrate-score.test.mjs',
  'tests/self20/guard-env.test.mjs',
  // self20/p5: the three decisions p4 wrote are now called by the planner, the
  // dispatcher and the verifier -- a library function nobody calls is a comment.
  'tests/self20/hedge-wiring.test.mjs',
  'tests/self20/model-wiring.test.mjs',
  'tests/self20/killrate-metrics.test.mjs',
  // the guard runs with the app's PATH, which has no Git on it: twelve suites
  // died with `spawnSync git ENOENT` and two p6 promotions were rolled back.
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
  // a graded task's verdict is its metric, not its exit code: loom-graded's
  // verifier prints QUALITY=<n> and exits 0 in every state, so an exit-code
  // oracle read a 0.500 -> 1.000 climb as three rounds of no work.
  'tests/self6/graded-earned.test.mjs',
  // and a cache entry that predates the metric must be re-measured, or the same
  // blind spot returns on exactly the machines that already ran the campaign.
  'tests/self6/baseline-cache-version.test.mjs',
  // and the oracle that metric comes from must not be inside the candidate's write
  // scope: loom-graded2's instrument is check.mjs at the repo root, outside tests/,
  // so a candidate that rewrote it to print QUALITY=1.000 promoted (exp e51).
  'tests/oracle-scope.test.mjs',
  // and the rule holds where it matters -- driven through a real round, one
  // candidate rewriting the instrument and one fixing the code it measures.
  'tests/oracle-gate.test.mjs',
  // and the instrument can be *created* rather than edited: the existence filter in
  // oracleScripts makes the pre-patch set empty, so the base run failed because the
  // script was missing -- a red base that looks like a bug fixed (e70 found this on
  // 75 landings, all by habit rather than check).
  // a verified attempt that changed nothing is not a patch: 14 rounds promoted an
  // empty diff and the apply step then failed with 'No valid patches in input'.
  'tests/noop-landing.test.mjs',
  // a task that delivers test coverage needs the gate to allow exactly the
  // declared file and nothing else: the rule was about self-measurement, not
  // about the tests directory.
  'tests/balance/scope-round.test.mjs',
  // and when a decision does reach a person, it arrives with the four facts:
  // which task, what the diff does, what the verifier said, what could break.
  'tests/balance/card-evidence.test.mjs',
  'tests/oracle-creation.test.mjs',
  // and the hedge is priced by its actual tail: with two candidates the old
  // reference was the slowest attempt, so 53 of 53 priceable campaigns read
  // tailMs = 0 and the gate could only say yes (e73).
  'tests/balance/second-candidate-tail.test.mjs',
  // a promotion commits the paths its patch touched and nothing else: the old
  // `git add -A` swept a mutant left behind by a killed sweep into a commit, and
  // would have swept a human's in-progress edit the same way.
  'tests/commit-paths.test.mjs',
  'tests/l2-requires-human.test.mjs',
  // and a graded task's evidence is the number, not the exit code: a red base that
  // never produced a number is unmeasured, and 2026-11-13 promoted a round on it.
  'tests/graded-requires-metric.test.mjs',
  // and the policy a campaign is told to use must be the policy it runs: a bare
  // {candidates:1} override was written to the event log and never read, so arm C
  // bought two attempts while its own state said one.
  'tests/policy-bare-override.test.mjs',
  // and the proposer reads what the loop already knows: on 2026-11-14 it offered
  // `candidates+1` two days after the A/B had rejected it, and `no-test-edits` to
  // tasks whose deliverable is a test edit.
  'tests/chain-propose-guard.test.mjs',
  // and planning is off until asked for: the workbench toggle and rsi_control plan
  // write one value, and the planner node stays in the template so it can come back.
  'tests/plan-default.test.mjs',

  // a contradiction that can only be listed is a museum: it is decided, the
  // decision is kept as evidence, and it survives a pack/unpack and a merge.
  'tests/kg-resolve.test.mjs',
  'tests/kg-merge-resolution.test.mjs',

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
  // a lesson learned before lessons carried `files` still lands under the file
  // its attempt changed: one residual bucket holding 84% of the corpus is not
  // a tree, and the ledger already knew the answer.
  'tests/panel-lesson-subject.test.mjs',
  // and the corpus is filed, not just readable: a claim is its first sentence,
  // grouped under the file it is about, with a named bucket for the few that
  // name nothing.
  'tests/knowledge/a-lesson-is-about-a-file.test.mjs',
  // the claim the tree keeps is written by the worker, not carved out of its why
  'tests/knowledge/the-worker-states-the-claim.test.mjs',
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
  // the campaign reads its own record to decide whether a second opinion pays
  // (the checkpoint help it landed with is pinned above, next to its own comment)
  'tests/tri7/adaptive-cascade.test.mjs',
  // a failed read explains itself instead of printing a raw error, a live
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
  'tests/balance/second-candidate-gate.test.mjs',
  'tests/ui/node-band.test.mjs',
  'tests/ui/node-band-render.test.mjs',
  // the planner can be switched off per policy and says which mode it ran in, and
  // a narrow sidebar keeps only the three cells that carry the answer:
  'tests/balance/plan-mode.test.mjs',
  'tests/setup/one-call-start.test.mjs',
  'tests/preflight/doctor.test.mjs',
  'tests/balance/holdout-noop.test.mjs',
  'tests/defaults/opinionated.test.mjs',
  'tests/dag2/deadline.test.mjs',
  'tests/balance/late-success.test.mjs',
  'tests/balance/hedge-stats.test.mjs',
  'tests/ui/policy-visible.test.mjs',
  'tests/balance/plan-mode-evidence.test.mjs',
  'tests/ui/metrics-priority.test.mjs',
  // a campaign can carry its own policy, and a stuck round explains itself first:
  'tests/balance/policy-override.test.mjs',
  'tests/balance/policy-model.test.mjs',
  'tests/balance/policy-models-set.test.mjs',
  'tests/ui/tree-fail-first.test.mjs',
  // a policy override needs a writer, not just a reader:
  'tests/balance/policy-set.test.mjs',
  // the preflight the plugin already had is now reachable as a tool, and the
  // planner's own numbers are reported before anyone argues about it:
  'tests/tools/doctor-tool.test.mjs',
  // the guard's own arithmetic: one spec, one run, one line
  'tests/tools/standing-list.test.mjs',
  // the planner is a leg of the triangle, not a footnote: its wall time, its
  // timeouts and its win rate are reported before anyone argues about it
  'tests/balance/planning-accounting.test.mjs',
  // and its deadline is learned from what its own record says it bought
  'tests/balance/plan-budget.test.mjs',
  // silence is silence at any duration: a turn that ended with no reason is not a
  // verdict on the task, and the attempt it destroys costs ten minutes of wall clock
  'tests/lifecycle/silent-slow-error.test.mjs',
  // the retry budget belongs to the attempt, not to the dispatcher
  'tests/lifecycle/retry-budget.test.mjs',
  'tests/lifecycle/silent-diagnosis.test.mjs',
  'tests/lifecycle/model-provider.test.mjs',
  // a model that spent its whole slice without answering is unusable, not a
  // verdict: loom-acc6 lost twelve 600 s attempts, five of which had a patch
  'tests/lifecycle/timeout-fallover.test.mjs',
  // a child runs on the session that spawned it: loom-acc6 reported one model in
  // the attempt record and billed another provider entirely
  'tests/lifecycle/model-inherit.test.mjs',
  // the parent rebuild fired 32 times and converted silence zero times: with a
  // chain to fall over to, a silent death goes there instead of re-asking
  'tests/lifecycle/no-blind-retry.test.mjs',
  // a provider outage is not a verdict on the task
  'tests/lifecycle/infra-round.test.mjs',
  // a broken provider falls over to the next model
  'tests/lifecycle/infra-model-fallback.test.mjs',
  // a run of infrastructure rounds pauses the loop instead of eating the budget
  'tests/lifecycle/infra-pause.test.mjs',
  // a stopped attempt whose tree already verifies is salvaged and says so, while a
  // late claim is still just a timeout
  'tests/balance/salvage-timeout.test.mjs',
  // a patch that cannot name its base cannot be re-verified: 420 attempt
  // records carried a patch path and not one carried the commit
  'tests/balance/base-in-record.test.mjs',
  // a holdout running the command the work verifier just ran is not a second
  // opinion: 17 campaigns registered exactly that and the gate fired once
  'tests/balance/holdout-really-held-out.test.mjs',
  // knowledge is made of proven work: 19 "nothing to do" claims entered the tree
  'tests/balance/lesson-needs-work.test.mjs',
  // a deadline that starts after setup is not a deadline, and the caps are set
  // above the tail of the work they judge
  'tests/lifecycle/deadline-covers-setup.test.mjs',
  'tests/balance/deadline-shape.test.mjs',
  // a verdict about a dead child is worth nothing without the observation
  // behind it: whether the session ever advanced, and how long it was quiet
  'tests/balance/heartbeat-in-record.test.mjs',
  // the rebuild-and-retry was a coin flip: 32 attempts, zero conversions, and
  // the deaths it retried lasted about a second. It now asks only when the child
  // survived long enough to have wedged rather than been refused.
  'tests/lifecycle/died-retry-when-earned.test.mjs',
  // a verdict on a spec that was already green is not evidence of work: 22 of
  // 103 landed rounds carried a passing candidate whose diff was empty
  'tests/balance/spec-must-fail-on-base.test.mjs',
  // a fallback chain is a bet nobody kept the score on: per-model outcomes and
  // the p90 that a deadline has to clear
  'tests/balance/per-model-health.test.mjs',
  'tests/balance/demote-dead-ref.test.mjs',
  'tests/balance/planner-follows-the-chain.test.mjs',
  'tests/balance/stop-paying-for-nothing.test.mjs',
  'tests/balance/light-model-optional.test.mjs',
  'tests/balance/record-the-model-that-ran.test.mjs',
  'tests/balance/abandoned-work-still-counts.test.mjs',
  'tests/balance/fallback-is-a-second-provider.test.mjs',
  // the plugin shipped a config surface it never declared: `status: absent` in the
  // host's own Config directory, so every knob had to be hand-edited
  'tests/config/schema.test.mjs',
  'tests/config/loader-shape.test.mjs',
  'tests/panel-status-vocab.test.mjs',
  'tests/knowledge/no-work-is-not-knowledge.test.mjs',
  // the tree names a losing round once, not twice
  'tests/ui-eff/tree-merge.test.mjs',
  // the audit may only certify the preview it can regenerate, with the
  // attributes the panel actually sets
  'tests/tools/preview-fresh.test.mjs',
  'tests/tools/portable-fixtures.test.mjs',
  // candidates of one round create their worktrees at the same time, so cleanup
  // may only delete a registration it can prove is stale — git's own `worktree
  // prune` cannot tell a stale one from a sibling's half-written one
  'tests/exec/worktree-prune-safe.test.mjs',
  'tests/exec/worktree-race.test.mjs',
  // a queue row says how long it has waited, in the host's clock, in words
  'tests/ui-eff/queue-wait.test.mjs',
  // the sidebar's own verbs and its head dot: a card has to say what it is
  // asking of the reader, and a `stop` button has to ask twice
  'tests/ui-eff/head-dot.test.mjs',
  'tests/ui-eff/card-actions.test.mjs',
  // a score nobody prints is a private opinion: the digest names the model
  // that actually did the work, and keeps "not measured" distinct from zero
  'tests/balance/models-are-visible.test.mjs',
  // an attempt we stopped on purpose is not evidence about the model
  'tests/balance/sibling-kill-is-not-a-provider-failure.test.mjs',
  // the card shows which ref finishes work, not just what the chain claims
  'tests/ui-eff/model-rows.test.mjs',
  // a round the host killed and the loop then ran again keeps both facts: the
  // interruption is the reason the retry exists, and four campaigns had it
  // overwritten by the second finish
  'tests/balance/interrupted-round-keeps-its-story.test.mjs',
  // and a campaign that stopped buying plans must not buy them again just
  // because the round it skipped planning in went fine
  'tests/balance/a-skipped-plan-is-a-decision.test.mjs',
  'tests/balance/mean-round-is-measured.test.mjs',
  'tests/balance/a-killed-round-is-not-a-stall.test.mjs',
  'tests/balance/a-node-remembers-its-model.test.mjs',
]
// Each spec runs once. The standing list grew by append, and the same pin was
// added twice on three occasions — which quietly inflated the reported total and
// paid for those suites twice. Dedupe by absolute path, keeping first position so
// the order still reads as the story of what got pinned when.
const seen = new Set(files)
for (const rel of standing) {
  const abs = join(root, rel)
  if (seen.has(abs)) continue
  seen.add(abs)
  files.push(abs)
}
files.push(join(root, 'scripts', 'verify.mjs'))

// A suite that fails once is a suspect, not a verdict. The research brief on
// test selection is blunt about which risk is larger: in Chromium's CI about 76%
// of "real" failures turned out to be flakes. Here the cost is concrete — round 3
// of p5-wire was rolled back because tests/tri9/early-abort.test.mjs failed under
// load and passed alone, which burned a promotion and the round's guard time.
// So a failure earns exactly one retry: a suite that passes alone is reported as
// flaky and does not fail the guard, and a genuine break fails twice in a row.
const results = []
for (const file of files) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  const ms = Date.now() - started
  if (run.status === 0) {
    console.log(`ok   ${file.slice(root.length + 1)} (${ms}ms)`)
  } else {
    results.push({
      file,
      ms,
      firstStatus: run.status,
      retryStatus: null,
      tail: `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-12).join('\n'),
    })
  }
}

const owed = retryPlan(results.map((r) => ({ file: r.file, firstStatus: r.firstStatus, retryStatus: r.retryStatus })))
for (const name of owed.retry) {
  const entry = results.find((r) => r.file === name)
  const run = spawnSync(process.execPath, [entry.file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  entry.retryStatus = run.status
}
const plan = retryPlan(results.map((r) => ({ file: r.file, firstStatus: r.firstStatus, retryStatus: r.retryStatus })))
for (const name of plan.flaky) {
  const entry = results.find((r) => r.file === name)
  console.log(`flaky ${name.slice(root.length + 1)} (${entry.ms}ms then passed alone) — not counted`)
}
for (const name of plan.failed) {
  const entry = results.find((r) => r.file === name)
  console.log(`FAIL ${name.slice(root.length + 1)} (${entry.ms}ms, failed twice)\n${entry.tail}\n`)
}
if (plan.flaky.length) console.log(`\nflaky on retry (${plan.flaky.length}): ${plan.flaky.map((f) => f.slice(root.length + 1)).join(', ')}`)
const failed = plan.failed.length
console.log(`\n${files.length - failed}/${files.length} suites passed`)
if (failed) process.exitCode = 1
