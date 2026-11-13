# The chain A/B: what is being compared, and what would count as an answer

Condition ③ of the current goal asks for one chain proposal that is adopted and one
that is rejected — each with numbers, a reason, and a statement of *which strategy*
was replaced. This file is written **before** the arms finish, so the decision rule
cannot be chosen after seeing the results. Two revisions happened before any arm
produced a verdict (the first MDE figures were wrong; the arithmetically correct ones
are below), and both revisions are noted where they occur.

## The instrument is the six-task mutation corpus

`research/ab/tasks6.json` — six tasks, each asking a worker to raise the kill rate of
one module by adding assertions to exactly the specs in `verify.scope`. The verifier is
`research/mutants/task.mjs --sample=20`, which prints `KILLRATE=<0..1>` and always
exits 0; `verify.metrics.quality` reads that number out of stdout, so the endpoint is
continuous instead of binary. Baseline kill rates: triangle 0.05, cost 0.20,
candidates 0.50, brief 0.55, gate 0.60, oracle 0.55.

Twenty mutants per task means the readable resolution is 0.05 of kill rate =
0.035 of score (`scoreAttempt` = 0.7·quality + 0.3·passRate).

## Three arms, one tree

All arms run against **the same HEAD commit**, with **no patch applied** and **no
commit made while they run**. A promoted-but-unapplied patch still counts as a
promotion; it does not move the tree. This is the only way the pairing means anything:
a patch applied in arm A would change the base arm B is measured on, and
`mut-runtime-notify` already showed what that costs — the ledger recorded 0.650 for a
spec the clean tree measures at 0.500.

| arm | campaign | what differs from arm 1 | kind of change |
|---|---|---|---|
| A | `ab-cand1` | nothing — shipped `code-fix`, `planMode: full`, `candidates: 2`, `parallel` | baseline |
| B | `ab-cand2` | policy `planMode: 'off'` | policy — the planning leg |
| C | `ab-cand3` | policy `planMode: 'off'` and `candidates: 1` | policy — the second candidate |

Same six tasks, six rounds, round-robin order, so each task is attempted once per arm
and pairs one-to-one by task id.

## Why these two candidates

**B is the adopt candidate.** The planner leg costs a third of the wall clock:
across every recorded campaign, **195 planner runs, 23,944 s, mean 123 s**, and in
`loom-mut` **943 s of 2,833 s of round time = 33.3%** with 3 of 6 runs aborted. In
`ab-cand1` round 1 specifically the `recon` node ran **190,097 ms**, finished
`ok:false, stopReason:'aborted', error:"attempt exceeded 179747ms"`, 28.7% of that
round.

The first draft of this file claimed the planner *never* produced a usable plan. That
was wrong, and the correction is recorded here because it changes what the arm means:
`planUsable` is recorded in 42 of 249 finished rounds and is **true in 24 of them
(57%)**. So B is not obviously free — it removes a leg that sometimes helps, to save a
third of the clock. That makes A-vs-B a real experiment rather than a formality: if
quality does not move, removing 33% of round time is the adoption; if quality drops,
the planner earns its minutes and B is rejected.

**C is the reject candidate.** Dropping the second candidate removes exactly the
promotions it produced: **24 of 119** recorded promotions came from an `a2` attempt (a1
95, a2 24). If C loses those, the arm is rejected and the number that justifies keeping
the second candidate is 20% of all promotions, not a feeling. C runs with `planMode:
'off'` too, so its comparison against B is on the same planning regime.

**C is the reject candidate.** Dropping the second candidate removes exactly the
promotions it produced: **24 of 119** recorded promotions came from an `a2` attempt (a1
95, a2 24). If C loses those, the arm is rejected and the number that justifies keeping
the second candidate is 20% of all promotions, not a feeling. C runs with `planMode:
'off'` too, so its comparison against B is on the same planning regime.

## Budget matching

The goal forbids comparing groups at different budgets. All three arms run the same
rounds, the same tasks, and — since all three dispatch two candidates per round —
**arm C is the only one that spends less**, and that is the treatment, not a confound.
Attempts and tokens are reported next to the score for every arm.

## The decision rule (pre-registered)

For candidate C against baseline A (here: B against A, and C against B):

1. `compareChains` (the loop's own L1 instrument, which pairs the best score per task)
   must not find the candidate worse — no task lost, no task regressed by more than
   `holdoutSlack`.
2. The paired interval on the continuous endpoint must exclude zero at α = 0.05.
   Otherwise the verdict is **`cannot-distinguish`** and the sentence must state how
   many points that sample could have seen. Never "no effect".
3. Budget: `candTokens ≤ baseTokens × 1.25`, and `candRoundMs ≤ baseRoundMs × 1.05`.
   A candidate that wins by spending more is rejected with `budget-mismatch`.
4. **A candidate that is not distinguishable on score is adopted only if it is
   strictly cheaper on a quantity measured without statistics** — here, the planner
   minutes, which are read off `node.finished.durationMs` per round and need no
   inference. "Not distinguishable" alone is never sufficient.
5. A candidate that is distinguishable-worse is rejected regardless of cost.

## What the sample can see (corrected arithmetic)

`mdePaired({n, discordance})` on the binary promote/don't-promote endpoint at **n = 6**:
0.362 at discordance 0.1, 0.511 at 0.2, 0.626 at 0.3, **0.723 at 0.4**, 0.809 at 0.5.
So the binary endpoint cannot resolve anything at this sample size. (The first draft of
this file said "near 0.35" — that was the discordance-0.1 figure misread as the whole
range.)

The continuous endpoint is the one that can speak: `compareMeans` over 6 paired
differences has a floor of about `1.14·σ`, so σ = 0.2 of score gives a floor near 0.23
and σ = 0.1 gives 0.11. That is why the arms are scored by the continuous metric, and
why a `cannot-distinguish` verdict must quote its own floor instead of a verdict.

The planner claim does not go through this statistics at all: 190 s × 6 rounds versus
0 s is a difference of ~19 minutes that is either in the log or not.

## Amendment 1 (2026-11-14 00:25, written before any arm finished)

Rule 1 asks `compareChains` whether the candidate regressed a task beyond
`holdoutSlack` (0.02). That check compares the best score per task from **one run per
arm** — the same single-observation quantity the rest of these rules refuse to read as
an effect. With four of six pairs in, the tool reports `noRegression=false` for arm B on
a single task at −0.05, while the paired interval on the same endpoint is ±0.099 wide.
Those two statements cannot both be evidence: a dip inside the interval is inside the
noise of the instrument that produced it.

So rule 1 is amended before the data is complete, and the amendment is recorded because
it was written while the outcome was still open:

- `noRegression=false` **with every observed dip inside the pair interval** is recorded
  as `screen-failed-not-distinguishable`. It does not by itself reject; the decision
  falls through to rules 2 and 4, where the same data is judged against its own
  resolution.
- `noRegression=false` **with a dip outside the interval** is a distinguishable
  regression and rejects under rule 5.
- A task the candidate lost entirely (no finished round) always rejects, because that
  is missing data rather than a small difference.

The reason this matters: otherwise the strictest rule in the protocol is decided by the
noisiest measurement in it, and "did it get worse" would mean "did one run land low".

## How the arms' scores differ from the corpus baseline

Arm readings were taken with the module path spelled with backslashes, which before
2026-11-14 selected a different 20-mutant sample than the one `tasks-base.json` recorded
(see `exp-mut-003`: the same tree and patch read 0.65 and 0.95 depending on the
spelling). Within one arm every round used the same spelling, so the arms are comparable
to each other, task for task; they are not comparable to the old baseline column. The
instrument is fixed now (`slug()` normalises separators) and the baseline is re-measured
rather than reused.

## Amendment 2 — the first three arms are a pilot, not the experiment

Written 2026-11-14 01:05, after the data was complete. Two defects were found **while the
arms were running**, and either one alone disqualifies their verdicts from being the
adoption decision:

1. **The instrument was not deterministic.** `src/mutants/gen.mjs` derived the mutant
   sample from a slug built without normalising path separators, so
   `--module=src/runtime/triangle.js` and `--module=src\runtime\triangle.js` selected
   twenty *different* mutants: the same tree with the same patch read `0.9500` on one
   spelling and `0.6500` on the other (`exp-mut-003`). Campaigns register their verify
   command with backslashes. Fixed by `slug()` normalising separators and by
   `rankedSample()` being the single source of the ordering, pinned by
   `tests/mutants-determinism.test.mjs`.
2. **`rsi_control policy` was a no-op for `candidates`.** The command appends bare keys
   (`{candidates: 1}`) to `campaign.policy`, while `effectivePolicy()` read only the
   nested promoted record (`state.policy.policy`). Arm C therefore ran with two
   candidates in round 1 (`candidatesPlanned: 2`, source `default`) and one in rounds
   2–4 only because the *evidence gate* refused to buy the second — not because the
   policy said so. Fixed in `src/loop/policy.js` (bare override folded in, precedence
   documented) and pinned by `tests/policy-bare-override.test.mjs`, including the
   round-level case that failed live.

What the pilot does establish, and is worth keeping:

- The corpus works end to end: graded metrics flow from a mutant sweep through
  `verifier.finished` into `earnedMetric`, the gate, and a promotion.
- The scope gate works in a live round (`checks.scope = {editable, checked, violations}`).
- A round costs ~9 minutes and one campaign advances per tick, so a three-arm
  comparison is an overnight object, not a coffee break.
- `A vs B` under the rules as written: **`reject:regression`** — paired quality
  difference 0.000, interval ±0.044, worst dip 0.050 on `mut-runtime-triangle`. Note
  what that dip is: at n=6 it is one task's difference between two arms, and the same
  0.05 is the scale on which two runs disagree. The reject is what the protocol says,
  not evidence that the planner earns its twelve percent.
- The non-statistical saving is real and independent of the statistics: the planner leg
  ran 2 times in 6 rounds, 372 s, both aborted, 12.3% of round clock.

The arms are therefore re-run on the fixed instrument (`ab-cand1b/2b/3b`, same six
tasks, same rotation, same HEAD) and the adoption decision is taken from those. The
pilot's decision file stays as written; it is not edited after the fact.

## Amendment 3 — rule 1 compares the dip against the endpoint's own repeat spread

Written 2026-11-14 03:05, after the second round of arms and one repeat campaign.

Rule 1 as first written compared the worst dip against the resolution of the *sample* —
the MDE, or half the paired interval. That number is a property of how many tasks were
paired and how they disagreed, not of how much the endpoint moves when nothing changes.
The two are different, and the difference decided a verdict:

- The pair `ab-cand2b → ab-cand3b` recorded a **0.100** dip on `mut-runtime-cost`
  against a resolution of 0.070 and was rejected as a regression.
- `loom-v2check` — the v2 chain, no candidate change, the same task — then measured
  **0.75** where the A/B base arm had measured **0.85**. The dip reproduced with nothing
  changed, so it is a property of the worker draw.
- `research/ab/noise.mjs` over the four recorded runs of that task: `0.85 / 0.85 /
  0.75 / 0.75`, spread **0.100**; the other three tasks read identical numbers in every
  run (spread 0.000). Pooled sd 0.029.

So rule 1 is now three-state:

- dip ≤ 0 → **pass**.
- dip > 0 and no repeat spread measured → **HOLD** (`hold:noise-unmeasured`). Not a pass,
  because nothing says the dip is noise; not a fail, because nothing says it is not.
- dip > measured spread → **fail**, and only then is it compared against the sample's
  resolution. A dip at or below the spread is not attributable to the change.

A dedicated repeat campaign cannot supply that spread, which is why `loom-noise` was
stopped after four rounds: an earlier campaign's promotions move HEAD, so each new
round finds the base already at the candidate's number and reports `no-gain`. The
honest source is runs that already exist on a shared tree. Recorded rather than
remembered: `research/ab/noise.json`.

Two consequences worth stating plainly:

1. **A paired design's real resolution is set by its least stable task**, not by the MDE
   formula. One task in four moved by 0.10; the formula said 0.07. Any future pair
   should measure the spread first — it costs nothing but a query over recorded rounds.
2. **A hold is a verdict, not a failure to decide.** `ab-cand2b → ab-cand3b` is now
   `hold:not-distinguishable`: the candidate is half the tokens and a third less round
   clock, and the sample cannot exclude a 0.10 loss on one of four tasks. Adoption would
   be a bet; rejection would claim harm the data never showed. `decisions.md` carries
   the corrected entry and says what would change it.
