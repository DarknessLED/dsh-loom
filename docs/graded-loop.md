# The graded loop

Until 2026-11-13 this loop scored itself in one bit: a task's verifier exited 0
or it did not. Two consequences followed, and both were measured rather than
argued:

- **Resolution.** 94 tasks at pass/fail gives ±10.1 points. A 5-point effect
  needs 262 pairs (`exp-ver-001`, `w8-measure`). Every claim of the form "this
  change improved the loop" was therefore unfalsifiable, including the ones this
  document makes.
- **Saturation.** 93 of 104 tasks were already green on the tree they were
  registered against (`e91`). A binary score cannot separate "nothing was needed"
  from "the work was done", so the corpus had no headroom to spend.

This file describes the replacement: a task may carry a **continuous metric**, and
the gate reads it.

## What a graded task is

```js
{ id, prompt, verify: {
    cmd,                     // prints KILLRATE=0.45 and SURVIVORS={...}
    timeoutMs,
    metrics: { quality: { pattern: 'KILLRATE=([0-9.]+)' } },  // one number, 0..1
    scope:   { editable: ['tests/a.test.mjs'] },              // what the patch may touch
} }
```

`src/exec/verifier.js#parseMetrics` reads the number off stdout. `src/gate/gate.js`
scores it as `0.7 * quality + 0.3 * passRate`, and `src/gate/earned.js` decides
whether the movement counts as a gain:

- a metric that moves up is earned, `earnedByMetric: true`;
- a verifier that was red on the base tree and is green now is still earned
  (`red-to-green`), but only when the base failure was actually measured;
- a metric that did not move is not a gain, however green the run was.

The graded KILLRATE tasks in this repo ask the worker to raise the fraction of
one-token mutants a module's own specs would catch. The instrument is
`research/mutants/`:

- `gen.mjs` plants 12 kinds of byte-level mutation (`<` → `<=`, `+ 1` → `+ 2`,
  `true` → `false`, ...). Byte-level so the line endings never move.
- The sample is chosen by `sha256("<normalised slug>:<index>")`, so it is
  reproducible and independent of file position, and `--sample=20` takes the same
  20 mutants every run.
- `task.mjs` prints `KILLRATE=` and always exits 0. It holds a repo-wide single-
  flight lock, because a guard spec imports half the tree and a mutation in one
  process is visible to another.

Twenty mutants put the resolution at 5 percentage points of kill rate, i.e. 3.5
points of score, against the 10.1 of the binary corpus.

## Why the specs may be edited, and only the declared ones

`testsClean` used to mean "the patch touches no test file", which made a task
whose deliverable *is* a test impossible to land. The rule that mattered was
never "do not touch tests" — it is "a candidate may not edit the thing that
measures it". `src/gate/scope.js` encodes that:

- `parseScope(verify.scope)` reads `{editable: [...]}`;
- `inScope` accepts exact paths, directory prefixes, and a `*` suffix — not a
  glob engine, so `tests/gate*` matches `tests/gate.test.mjs` and not
  `tests/gatekeeper.test.mjs`;
- `diffPaths` reads both sides of every `diff --git`, including quoted paths,
  renames and deletions;
- `scopeVerdict` takes the union of the patch and the diff-stat, and treats an
  unreadable patch as a violation.

A task with no scope keeps the old rule exactly; `checks.scope` only appears when
a scope was declared. `oracleClean` is unchanged: no task may edit its own
verifier script.

## The corpus

`research/mutants/tasks.json` holds 22 tasks built this way, one per module, each
with the guard specs that import it. Baselines are re-measured, never reused:
`research/mutants/baseline.mjs` writes `tasks-base.json`.

`research/mutants/dose.mjs` measures the same task against several repair levels
by applying each historical patch to a detached worktree of HEAD, one at a time,
and re-reading the kill rate:

| module | bare | one repair | another repair |
|---|---|---|---|
| `src/runtime/triangle.js` | 0.00 | 0.85 | 0.95 |
| `src/runtime/round.js` | 0.00 | 0.10 | 0.05 |
| `src/runtime/cost.js` | 0.20 | 0.85 | 0.85 |
| `src/loop/policy.js` | 0.70 | 1.00 | — |

That is the property the metric has to have before it may be used: the same task
gives different numbers for different repairs. A quantity that cannot move is a
label.

## The A/B protocol

`src/loop/ab.js` and `research/ab/`:

- `compareChains` pairs two arms task by task (same task, same rotation).
- `compareMeans` reports the paired difference, a Wilson-free normal interval and
  a **declared MDE**; `comparePolicies`/`mcnemarExact` do the same for binary
  outcomes. Both refuse to call a difference real below their floor, and both say
  so in words: *this sample cannot distinguish a difference below X points; not
  "no effect"*.
- `research/ab/decide.mjs` applies five rules written before the data
  (`research/ab/README.md`), and names the measurement that failed rather than
  the rule number.

Two facts about this protocol are worth stating plainly, because they are
limitations rather than features:

1. **Paired beats independent only when the arms disagree sometimes.** If
   discordance exceeds `2p(1-p)`, pairing is worse than two independent samples
   (`tests/ab.test.mjs` asserts both directions). With one run per task per arm,
   a single task's dip is not distinguishable from that task's own run-to-run
   variation — an arm pair at n=4 or n=6 mostly lands on "cannot distinguish plus
   a cost saving", which is a weak but honest result.
2. **"Cannot distinguish" is never a reason to adopt.** Only a saving that can be
   counted without statistics — planner seconds, attempts not bought — is.

## What has been measured so far

- A pilot of three arms (`ab-cand1/2/3`) established that the machinery works and
  that a round costs ~9 minutes. Its verdicts do not count: the mutant sample
  depended on how the module path was spelled (`exp-mut-003`), and
  `rsi_control policy {candidates:1}` was a no-op because `effectivePolicy` read
  only the promoted record's nested shape. Both are fixed and pinned
  (`tests/mutants-determinism.test.mjs`, `tests/policy-bare-override.test.mjs`).
- The planner leg costs 12.3% of round clock (372 s over 2 runs in 6 rounds, both
  aborted) and produced a usable plan in 24 of the 42 rounds that recorded
  `planUsable`.
- A second candidate never beat the first when the first passed (0 of 120 rounds)
  and rescued it 28 times in 239 — so the second attempt buys a rescue, not a
  better score, and only when the first fails.

## What this does not establish

The metric says the specs pin more bugs. It does not say the module is more
correct, because a kill rate is a property of a test suite and a mutation
operator, not of the code. A suite can also be improved by writing assertions
that encode the current behaviour, bugs included — the differential oracle
(`src/gate/oracle.js`) is what guards against reading that as progress, and it is
why `oracleClean` is the one scope rule that never relaxes.
