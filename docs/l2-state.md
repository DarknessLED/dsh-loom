# Where L2 stands (2026-11-14)

The loop can now change its own chain and say what the change did. This page is the
handover: what is adopted, what is held, what is waiting for a person, and how to
reproduce any of it.

## What was measured

| question | answer | evidence |
|---|---|---|
| Does a graded score exist at all? | yes: a mutant-kill-rate verifier over 22 modules, mean 0.3114, 5pp resolution per 20-mutant sample (≈3.5pp of score) | `research/mutants/tasks-base.json` |
| Does the same task give different numbers at different repair levels? | yes, on four modules: triangle 0.00 → 0.85 → 0.95, round 0.00 → 0.10 → 0.05, cost 0.20 → 0.85 → 0.85, policy 0.70 → 1.00 | `research/mutants/dose-*.json` |
| How much does a number move with nothing changed? | 0.100 on one of four tasks, 0.000 on the other three (pooled sd 0.029) | `research/ab/noise.json` |
| Can two chains be compared at matched budget? | yes: paired by task, same rounds, tokens and round clock recorded, MDE printed, "cannot distinguish" reported as such | `src/loop/ab.js`, `research/ab/chain-ab.mjs`, `research/ab/decide.mjs` |

## What L2 decided

1. **Adopted (`adopt:saving`): remove the planner leg.** `code-fix` v2 drops the
   `recon` node. On four mutation tasks the endpoint did not move at all, the planner
   cost 580 s of 2,289 s round clock (25.3%), and it ran four times in four rounds.
   Replaces: the planner before the map.
2. **Held (`hold:not-distinguishable`): one candidate instead of two.** Half the
   tokens (0.51×) and a third less round clock (0.67×), but one of four tasks moved
   by 0.100 — the arm's own repeat spread — so the sample cannot exclude a loss.
   Under the rules a hold is the honest label: adoption would be a bet, rejection a
   claim of harm the data never showed. Replaces: the second parallel candidate.
3. **Rejected (`reject:budget-mismatch`): three candidates instead of two.** Tokens
   14,486 → 30,254 (**2.09×**), round clock 1.45×, endpoint −0.025 with an interval
   that includes zero. The cost is read off the ledger, not off a test. Replaces:
   nothing — the two-candidate map stays.

Both are recorded in `research/ab/decisions.md` with the five rule readings, the
number that decided each one, and what would change the verdict. The protocol and its
three amendments are in `research/ab/README.md`.

## Who decides, now

Three things changed so that a person stands at the L2 decision and nowhere else:

- **The per-round gate no longer asks.** `loopPolicy.autoApply` defaults to true, so a
  round that clears the gate lands without a checkpoint. `chain` nodes that say
  `when: "always"` still stop, and `when: "never"` keeps an unattended campaign
  unattended (`tests/l1-unattended.test.mjs`).
- **A card that does reach a person carries the four facts**: which task, what the diff
  does, what the verifier said, what could break — plus a `missing:` line naming
  whatever could not be produced (`src/runtime/review-card.js`,
  `tests/balance/card-evidence.test.mjs`).
- **A chain change waits for a person.** `rsi_chain(action:"activate")` on a different
  version above 1 raises a `chain` checkpoint and leaves the active version alone;
  approving it activates, `confirm:true` is the explicit shortcut, and the first
  version needs no permission (`tests/l2-requires-human.test.mjs`). Verified in the
  live host on 2026-11-14: activating v2 returned `pending: cp-mwfg81uq000013` with
  `active: 1`, and rejecting it left `activeVersion` at 1 with the checkpoint answered.

## What the loop can propose, and what it may not re-propose

`rsi_chain(action:"auto")` is the only place the loop invents a change to itself. Until
2026-11-14 it was a fixed menu of four kinds and read nothing: it offered
`candidates+1` two days after the paired A/B had rejected exactly that change, and it
offered `no-test-edits` to a campaign whose tasks deliver test edits — an instruction
that makes those tasks impossible.

It now reads two things it already had: the verdicts recorded in
`<home>/decisions.json` (written by `research/ab/decide.mjs --kind=<mutation>`) and each
task's `verify.scope.editable`. A measured kind comes back `already-decided` with the
verdict in the note; a kind the tasks cannot obey comes back `conflicts-with-scope`.
Blocked kinds are reported in the tool result and are not written as new versions, so a
refuted hypothesis costs nothing to re-ask and nothing is silently hidden
(`tests/chain-propose-guard.test.mjs`). Live check: the same call now returns
`proposed: [minimal-change, state-your-uncertainty]` and
`blocked: [candidates+1 already-decided, no-test-edits conflicts-with-scope]`.

The other two kinds remain untested hypotheses. Measuring either needs a paired A/B on
the same tasks (about 25 minutes per arm at four tasks), and at n=4 the floor is a
0.070 quality difference — a prompt-level change is unlikely to clear it.

## Planning is optional, and off by default

The planner leg (`recon`) is the one part of the chain that a person turns on and off
while the loop runs. It is off by default because its product is "where to look", and
the measured tasks already hand that to the worker: on four mutation tasks it moved no
endpoint and spent 580 s of 2,289 s of round clock (25.3%), and 36 of 195 planner runs
across the corpus aborted having returned nothing.

Three ways to ask for it, weakest first:

| where | what it writes | scope |
|---|---|---|
| `loopPolicy.planMode` in the config file | `'full'` / `'off'` / `'auto'` | the install, overridden below |
| workbench toggle (panel header) or `rsi_control(action:"plan")` without an id | `<home>/settings.json` (`plan: true/false`) + an audit line in `settings.jsonl` | every campaign that did not name its own |
| `rsi_control(action:"plan", id:"<campaign>")` — what "add planning" in a conversation writes | one `campaign.policy` event with `planMode` | that campaign |

The planner node stays in `code-fix`. A node that was deleted cannot be switched back
on by a setting, and the toggle is the point. `'auto'` is still supported for an install
that would rather let the ledger decide (`planModeFor`: stop planning after two
promoted-but-wasted rounds, resume after one unplanned loss).

Turning planning on is a policy, not a chain change: no checkpoint, no version, and it
takes effect on the next round (`tests/plan-default.test.mjs`).
## What is waiting for a person

**The adoption is not global.** `loom-v2check` ran chain v2 and converged 3/3 with no
regression on the tasks it ran, but the *default* template is still v1 and every new
campaign still plans first. Making v2 the default is an L2 decision, so it is left
open:

- to accept: `rsi_chain(action:"propose", spec:<v2>)` on the template campaigns, or
  edit `src/chain/templates.js` (or wherever `code-fix` is seeded) to drop `recon`;
- to refuse: nothing to do — v1 stays.

The second candidate is not adopted, so nothing changes for it.

## Reproducing

```
node research/ab/noise.mjs --campaigns=ab-cand1b,ab-cand2b,ab-cand3b,loom-v2check
node research/ab/chain-ab.mjs --base=ab-cand1b --cand=ab-cand2b
node research/ab/decide.mjs --base=ab-cand1b --cand=ab-cand2b --noise-spread=0.100
node research/mutants/dose.mjs --module=src/runtime/triangle.js --patch=<file>
```

Each script reads the campaign ledger under `~/.dsh/loom/campaigns/` and writes JSON
next to itself. `decide.mjs` exits with the decision on stdout; it never edits a
campaign.

## 2026-11-15: the proposal now carries a forecast, and a live round settled it

The card that reached a person on 2026-11-14 named what each proposal would
replace, but not what it was expected to buy. Three modules close that gap
(`f9fcd7e`):

- `src/chain/predict.js` — `predictGain` gives a point estimate and an
  interval from the rounds that actually ran on the chain (`candidates+1` reads
  the measured gap between verified attempts; the prompt kinds read the win
  rate × median win, Wilson-bounded). With no measured history it falls back to
  a `prior` built from the headroom left over the per-task best, and says
  `basis: "prior"` in the card. `regressionRisk` names the reasons (flat
  window, cost of the extra candidate, too little history).
- `src/chain/spec-diff.js` — the exact JSON-path diff between the active chain
  and the proposal, including prompt appends, so the card shows what changes
  rather than describing it.
- `src/chain/evidence-card.js` — rounds on the chain, spend, promotions, then
  per proposal: predicted gain with interval, risk with reasons, diff lines, and
  a `missing:` list for what could not be produced.

Adoption is one click on either door (`src/chain/adopt.js`, called from
`rsi_decide` and the panel): approving a `chain` or `plateau` checkpoint appends
`chain.activated` with the prediction, and `reduce.js` remembers a
`chain.pending`. The next round finished on the new version appends
`chain.measured` with `realized = actual − baseline` and `met | exceeded |
missed`.

### The live measurement

Campaign `l2live` (workspace `C:/Projects/RSI-live/l2`, one task whose verifier
prints `KILLRATE=0.000`). Three flat rounds raised the plateau checkpoint
`cp-mwhsj21m00000q` on its own: it proposed v3 `minimal-change`, v4
`no-test-edits`, v5 `state-your-uncertainty`, with v2 `candidates+1` blocked as
`already-decided`. The card carried `$0.0862` spent, 3 rounds measured, 0
promoted, prediction `0.25 (0 .. 1)`, basis `prior`, risk `high` with the reason
"all 3 of the last rounds promoted nothing", and each spec diff. Approving it
appended `chain.activated` v3; round 4 ran on v3 and
`chain.measured` recorded `realized 0`, `predicted 0.25`, verdict `missed`.

That is the honest result. The forecast was a prior because the chain had never
measured a change of that kind; the card said so in its `missing:` line. A
proposal whose `basis` is `rounds` is the case the interval is actually worth
something — none exists in the corpus yet, and that is what the next campaign
has to produce.

## 2026-11-15: what halving saved, measured on both sides

`loopPolicy.halving` was already wired; it is now billed correctly and
measured. `6ee13d4` charges a survivor for the screen that bought it
(`attemptCostUsd` + `screenCostUsd` = `costUsd`), because before that fix a
halving round looked cheaper than it was: the screen was kept on the record but
never added to the round. `tests/self22/halving-round.test.mjs` pins the split
and pins that `halving:false` runs zero screens and all four candidates —
the off path is unchanged.

Two regimes, same instrument family (real failing suite, verifier prints
`KILLRATE`), four candidates, one round per arm:

| regime | halving on | halving off | score |
|---|---|---|---|
| solvable suite, sibling early stop (`halving-on5` / `off5`) | **$0.035567** | **$0.029309** | 1.0 vs 1.0 |
| no candidate can win, so all four run (`halving-nw-on` / `off`) | **$0.040280** | **$0.064829** | 0 vs 0 |

In the second regime halving saved **37.9%** with the same score: four screens
plus two full attempts cost less than four full attempts. That is the regime it
was designed for — a round where the suite stays red.

In the first regime it cost **21% more**, and the reason is mechanical: a
sibling that solves the task already stops the other attempts after ~30 s
(`solved-by-sibling`), so the control arm pays for one and a bit attempts, not
four; and one screen ignored "do not read files" and burned 42k tokens, roughly
a full attempt by itself. An earlier constant-verifier pair
(`halving-on3` / `off3`) showed the same sign: $0.051336 vs $0.046454.

So the honest summary is not "halving saves money". It is: halving saves money
when the round would otherwise search without a winner; it loses when a sibling
wins early and when screens cost as much as attempts. Both numbers are in the
campaign ledgers under `~/.dsh/loom/campaigns/halving-{on5,off5,nw-on,nw-off}`.

### Correction (2026-11-23, after reading the halving literature in the body)

The two numbers above stand as measurements, but the sentence "it cost 21% more"
does not survive as a conclusion, for two reasons that only became visible after
reading the primary sources rather than their abstracts:

1. **n = 1 per arm.** Each row is one round. The difference is $0.006258, and one
   screen in the losing arm burned 42k tokens — a single screen's prompt can move
   a round's cost by more than the gap being attributed to halving. A cost claim
   needs repeats, the same way a score claim needs repeats.
2. **What this is not, is successive halving.** Successive halving is defined by
   two properties: the low-fidelity score has to rank configurations like the
   high-fidelity one (fidelity monotonicity), and the budget freed by the losers
   has to be spent on the survivors. Our screening has neither: `screen` and
   `verify` are different commands over different artifacts, and the money saved
   is simply not spent. Both properties are stated plainly in BOHB §4.1 and in
   the HPO survey §4.2.4 / §6.5 (`docs/research/deep-r3-budget-stop-2026-11-23.md`
   quotes them with section numbers).

So the honest summary is narrower than the one above: **screening pays when the
round has no winner anyway** (the second regime, 37.9%, a large enough gap to
survive the variance), and the first regime's 21% is a single observation of a
procedure that is not successive halving. What would change the verdict is a
repeat with the screen cost held under the round cost — recorded as an open
question (`q-0afdc68d3ea0`: is `screen` a monotone proxy for `verify`?) rather
than asserted here.

## What this does not claim

- Kill rate is a property of a test suite and a mutation operator, not of the code
  being correct. A high number means the suite notices one-token changes; it says
  nothing about behaviour nobody wrote a mutant for.
- The four tasks in the A/B are the ones with headroom, chosen before the run. They
  are not a random sample of the corpus, and one of them is the least stable.
- A hold is not evidence of equality. It is the statement that this sample cannot
  tell, with the number it cannot resolve.

## 2026-11-15 (second pass): propose, grade, revert — and what it costs

The first pass proved that L2 can propose a chain with a forecast and that a
round can carry a kill rate. This pass closed the six holes a market scan named
(DGM's reward-hacking failure, SICA/Live-SWE-agent per-task cost reporting,
SWE-bench Verified's held-out-test lesson, successive halving's evaluation-cost
caveat) plus two the code was hiding. Commit `1c56c97`.

| # | Hole | Change | Proof |
|---|---|---|---|
| 20 | A screen could burn 42k tokens reading the repo | `halving.screenModel`, a 60 s / 3-tool budget in the brief, and a one-line `VERDICT:` parsed into rank 2/1/0 | `tests/self23/screen-budget.test.mjs`; live: screens fell to ~4k tokens |
| 21 | Survivors were bought in parallel, so an early win did not stop the spend | screened candidates run serially, highest verdict first, and the loop stops at the first win | `tests/self23/sequential-screened.test.mjs`; bench-opt bought 1 full attempt instead of 2 |
| 22 | A failed verifier collapsed the round to score 0 and hid a 0.9 kill rate | attempt/round carry `progress` (kill rate) beside `score` and `promotable` | `tests/self23/progress-split.test.mjs` |
| 23 | Forecasts were never graded, so nobody knew the intervals held | every `chain.measured` also lands in `decisions.json` as `{kind:"prediction",predicted,realized,verdict}`; `summarizeCalibration` reports coverage and MAE | `tests/self23/calibration.test.mjs`; live `v7-r7` predicted 0.25, realized 0, missed |
| 24 | `candidates+1` read a single top-two gap as the value of one more draw | probability-weighted: P(second beats first) × median winning gap, Wilson interval | `tests/self23/estimator.test.mjs` |
| 25 | A stall asked once per campaign and never again; burn/near-miss looked identical | the card asks once per *window*, names its trigger (burn / near-miss / flat), and a missed negative forecast raises `chain-revert` | `tests/self23/stall-signals.test.mjs`; live second card `cp-mwhu7q2300000r` on rounds 4–6 |
| 26 | The revert card was inert: `adoptFromCheckpoint` accepted only chain/plateau | `chain-revert` is on the same one-click path | `tests/self22/l2-adopt-measure.test.mjs`; live approve activated v3 |
| 27 | The forecast ledger was displayed but never read by the next card | a prior with a miss record is stated as risk; the card prints graded / missed / coverage / MAE | `tests/self23/card-calibration.test.mjs`; `d48f08c` |
| 28 | The `burn` trigger shipped unreachable: `checkpoint.burnUsd` had no default | default 0.12 USD, `stallTrigger` extracted and tested; burn outranks near-miss, `0` disables it | `tests/self23/burn-default.test.mjs` |

### Live run (`l2live`, the instrument always prints `KILLRATE=0.000`)

1. Round 6 ended flat. The loop raised its **second** plateau card
   `cp-mwhu7q2300000r` for window 4–6 (`trigger:"flat"`, prediction 0.25 prior,
   $0.036528 spent in the window) and proposed v7 minimal-change, v8, v9, v6.
2. One approve → `chain.activated v7` with the prediction attached.
3. Round 7 ran under v7 and ended no-gain. `chain.measured` recorded
   `realized 0` against `predicted 0.25` → `missed`; `decisions.json` gained
   `v7-r7`.
4. The miss raised `chain-revert cp-mwhu8t6h00000s` proposing v3. One approve
   → `chain.activated v3` (the forecast the reverted-to chain had is carried on
   the record).

So the loop now proposes on a trigger it only fires once per window, grades its
own forecast, and offers the undo — all without a person writing a spec.

The ledger is not decoration: the next card reads it. When the proposal's
forecast is a `prior`, the card prints `past forecasts: N graded, M missed,
coverage C, MAE E`, and if more priors missed than held, the risk line says so
("treat this interval as weak"). A loop that has been wrong about its own
guesses says that on the card it is asking a person to trust.

### Benchmark: same score, 38% cheaper over three seeds

Three independent pairs of fresh clones of the same 7-failing-case repo
(seed `f1e1288`, `KILLRATE=0.364`), candidates 4, one round per arm, each pair
sequenced (base then opt). Every round in both arms promoted at score 1.0:

| seed | arm | policy | score | round cost | tokens | full attempts |
|---|---|---|---|---|---|---|
| 1 | `bench-base` | `halving:false` | 1.0 | $0.059771 | 105,694 | 2 |
| 1 | `bench-opt` | `halving:true` | 1.0 | **$0.025992** | 29,807 | 1 |
| 2 | `bench2-base` | `halving:false` | 1.0 | $0.046489 | 96,302 | 2 |
| 2 | `bench2-opt` | `halving:true` | 1.0 | **$0.034623** | 33,722 | 1 |
| 3 | `bench3-base` | `halving:false` | 1.0 | $0.021880 | 22,646 | 2 |
| 3 | `bench3-opt` | `halving:true` | 1.0 | **$0.018743** | 21,596 | 1 |
| — | **total base** | | 1.0 | **$0.128140** | 224,642 | 6 |
| — | **total opt** | | 1.0 | **$0.079358** | 85,125 | 3 |

Aggregate: **38.1% cheaper and 62.1% fewer tokens at identical scores**; the
per-pair saving is 56.5%, 25.5%, 14.3% — wide variance, because the base arm
often wins on its first attempt anyway and then pays for one or two more full
attempts, while the opt arm stops after the survivor it bought first. In seed
3 the base arm wasted $0.008588 on a second full attempt that scored 0; the
opt arm never bought it, because its screen ranked it below the winner.

The saving is not the screen itself (each screen ≈ $0.0022, two per opt round);
it is that the best-ranked survivor is bought first and its win stops the
remaining attempts. That is the mechanism the earlier 21%-more result exposed
as missing.

### What this still does not claim

- n = 3 rounds per arm, one round per campaign, one seed repo. It is a
  replicated demonstration, not a distribution; the halving-on/off pair on a
  *different* repo still showed halving costing more when a sibling wins early
  without screens.
- Screens cost ~4k tokens because they are told to answer in one line. A model
  that ignores the budget will move the number back up; the cap is a
  prompt-level instruction, not a hard API limit.
- "Better than most of the market" is a protocol claim, not a ranking: the
  plugin now reports resolved score, per-round and per-attempt spend, held-out
  checks and a graded forecast ledger — the things the published agents report.
  No cross-product benchmark was run, so no ranking is asserted.
- `tests/self2/plateau.test.mjs` had been red and outside the standing list
  (the scan skips `tests/self*`). Its malformed-round case disagreed with the
  predicate; the predicate now counts a missing record as flat, and the spec is
  pinned in `scripts/test-all.mjs`.

## 2026-11-24: the promotion gate gets a budget of evidence

Reading the eight directions' bodies turned one suspicion into a measurement:
the loop's promotion rule is a sequential test that never accounted for its own
repetition. Every round asks the same question of the same task ("is this
better than the incumbent?") on fresh noise, and the rule answers it every
time. That is textbook adaptive multiple testing, and the paper that names it
(PACE, `2606.08106`) reports the consequence for greedy rules like ours:
30–42% of commits are false and 10–33% of committed gains are harmful.

### What changed

- `src/gate/sequential.js` — `eValue` / `commitDecision` / `pairedHistory` /
  `pairedAgainstBase`. A promotion is now a three-way answer: `commit` when the
  running e-value first crosses `1/alpha` (and that crossing is never revised by
  later rounds), `reject` when it falls to `alpha`, `defer` otherwise. The
  default `alpha = 0.05`, `lambda = 0.5` live in `config.gate` because they were
  PACE's numbers on GSM8K, not measurements of this tree.
- `src/runtime/round.js` writes the pairing down every round: `pairedHistory`
  (this task against its own best round) plus `pairedAgainstBase` (this
  candidate against the killRate of the tree it replaces). `gate.evaluated` now
  carries `decision`, `eValue`, `firstCrossing`, `alpha`, `lambda`, `sequential`
  and a `shadow` of the documented promotion rule. `round.finished` and
  `projectRound` keep them.
- `src/runtime/baseline.js` had to be fixed first, and this is the finding that
  matters most: the cached base reading never carried a `killRate`, because it
  cached only the metrics the task *declared* while the candidate side read the
  universal `KILLRATE=` line. Of the 148 historical `gate.evaluated` events with
  a base metric, **0** had a killRate — so the paired test had nothing to pair
  against and could only defer. Cache version 3 merges the universal reading
  with the declared one (declared keys win) and keeps silence as `null`.
- `src/gate/` gate cards that a person refuses now leave a counterfactual
  (`gate.declined` in `decision-effects.js`, folded into `state.gate.declined`
  and settled by the next round on that task via `measureDeclinedGate`). The
  verdict vocabulary is `cost-nothing | left-on-table` on purpose: a refusal is
  not a forecast, and reusing `met | missed` would say a prediction was graded
  when none was made.

### The shadow table

`node scripts/pair-audit.mjs` (committed; `--home`, `--campaign`, `--json`)
re-derives this from `~/.dsh/loom/campaigns/*/events.jsonl` using the gate's own
`pairAgainstBase` / `commitDecision`, so the numbers below are reproducible
rather than remembered. Current run: **149 campaigns, 495 rounds, 16 with a
pair — 16 won, 0 lost.** The denominator is the part that matters: only **16 of
495** rounds had a base reading at all and 112 had a measurable candidate; no
pair was possible in 459 of them (363 had neither side measured, 96 had a
candidate but no base). 67 campaigns predate the paired fields entirely and are
reported as *unmeasured*, not as zero pairs.

An earlier revision of this page said "470 of 483 rounds, commit 0 / defer 470".
That was one throwaway script's answer and it was wrong in both numbers: the
true counts are 495 rounds and 16 pairable, and those 16 pairs all resolved (the
16 rounds are the `paired-gate3` ladder, whose whole design was to make each
candidate beat its own base). The cause of the near-total silence is unchanged
and is the finding worth keeping: no cached base reading carried a `killRate`
before cache version 3.

| | result |
| --- | --- |
| pairable rounds in the corpus | 16 of 495 (`pair-audit`) |
| of those, won / lost | 16 / 0 |
| documented rule (`decidePromotion`) shadow | 495 × `insufficient tasks` |
| disagreement with actual promotions | every actual promotion |

The 16 pairs are not evidence that the new gate is calibrated — they are one
carefully built ladder. They say the arithmetic runs on real ledger bytes; they
do not say it generalises. Only rounds run after cache version 3 can.

Both zeros are honest and both have the same cause: the history was not
collected in a form that could answer the question. The 0 commits exist because
no cached base reading ever contained a `killRate`, and the 0 shadow promotions
exist because every campaign in the corpus has one task while
`chain.minTasks` is 6. Neither number says the new gate is right; they say the
old ledger cannot settle it, and only rounds run after this change can.

### The live run that settled it (`paired-gate3`)

Workspace `C:/Projects/RSI-live/paired2`: one task, one file holding
`step: <value>`, one verifier printing `KILLRATE=<value>`. The task asks for one
step of at most +0.10 per round, so every round buys a candidate that should
beat the tree it replaces by a known amount — a case where a correct gate must
eventually commit, and where the number of rounds it takes is checkable
arithmetic.

| round | score | base read | e-value | pairs | decision |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.15 | 0.05 | 1.5 | 1 | defer |
| 2 | 0.25 | 0.15 | 1.5 | 1 | defer |
| 3 | 0.35 | 0.25 | 2.25 | 2 | defer |
| 4 | 0.45 | 0.35 | 3.375 | 3 | defer |
| 5 | 0.55 | 0.45 | 5.0625 | 4 | defer |
| 6 | 0.65 | 0.55 | 7.59375 | 5 | defer |
| 7 | 0.75 | 0.65 | 11.390625 | 6 | defer |
| 8 | 0.85 | 0.75 | 17.0859375 | 7 | defer |
| 9 | 0.95 | 0.85 | **25.62890625** | 8 | **commit**, first crossing 8 |
| 10 | 1.00 | 0.95 | 38.443359375 | 9 | commit (still) |

Two things are worth reading off this table. First, `1.5^8 = 25.63` is the
arithmetic the module promises, and it took exactly eight paired wins to cross
`1/alpha = 20` — the gate is counting, not estimating. Second, round 2 shows the
pair count stuck at 1: round 1's score (0.15) equalled the second reading of the
tree, so that pair carried no information and was dropped. A gate that counted
it as a win would have committed earlier for a reason that does not exist.

**This run also found a bug the tests had missed.** An unfinished round carries
`score: null`, and `Number(null)` is `0` — finite. So `pairedHistory` recorded
the current round as a loss before it had a score, and every round contributed
one win and one loss: the e-value oscillated instead of growing. The first live
campaign (`paired-gate2`) committed nothing in six rounds with e-values of
1.5 / 0.75 / 1.125 / 1.6875 — rising and falling, which is not what eight wins
should look like. The filter now requires `score !== null && score !== undefined`
before the finite check, and `tests/self53/paired-e-process.test.mjs` pins it.

**A first version of this measurement was wrong and is recorded here so it is
not repeated.** `pairedFromAttempts` paired the round's winner against each
loser. Since the winner is `argmax(score)` of the same attempts, every pair was
a win: eight rounds always reached `1.5^8 ≥ 20`, with or without any
improvement. It printed 14 commits across the corpus and all 14 were
tautological. The export was deleted; `pairedAgainstBase` replaced it because
the base tree is read before the candidate exists, so either side can win.

### Holdout is a second reading, not a hurdle

`checks.holdout` stays a gate for a *failed* held-back verifier, but the number
it prints is now recorded: `holdoutScore`, `holdoutReason` and `candidateScore`
on `gate.evaluated` and `round.finished`. When both sides print the same
instrument, `holdoutGain` is a real comparison; when the held-back verifier only
passes without printing a rate, the reading is `1` and `holdoutGain` is `null`,
because a pass and a number are not the same unit. A held-back score *below* the
candidate's does not block the promotion — the pool is one or two tasks, and a
single reading carries the 2.2–6.0 point run-to-run spread already measured in
`docs/research/r2-score-noise`. It is evidence, not a veto.

### Halving is now a schedule with an honest name

`src/runtime/halving.js` gained `halvingPlan` (rungs, `freedUsd`, and
`kind: 'prefilter'`) and `fidelityCheck` (does the cheap stage rank like the
verifier?). Rounds record `screened`, `kept`, `halving` and `fidelity`, and a
screened-out attempt records `freedUsd`, `reallocUsd: 0`, `halvingKind`. The
name is deliberately not `halving`: we drop candidates and keep the money, which
is a prefilter, not successive halving. `fidelityCheck` turns the switch off
when the cheap stage's ranking disagrees with the verifier in enough recent
screening rounds — a short record is not treated as a pattern.

### Versions are filed by behaviour

`src/chain/descriptor.js` gives each chain version an archive cell from what its
own rounds did (mean score bucket, solved share, cost magnitude), and
`chain.proposed` / `chain.versions` keep that cell plus the mutation kind. A
proposal record that keeps offering one kind is marked `collapsed` with the
count, and a version that never ran is `unmeasured` — it is not merged into the
versions it replaced.

### Lessons say where they came from

`knowledge.json` lessons now carry `origin` (`self-observed` | `research-claim`)
and `trust` (`observed` | `verified`), backfilled across all 98 existing records
by rule, never by upgrade: a record with no source stayed `observed`. The worker
brief prints local lessons first and external ones under a heading that says
they are data and were not observed in this tree — a reduction in the chance
that quoted text redirects work, not a boundary.

### What this does not claim

- The new gate has committed in one live campaign (`paired-gate3`, 8 discordant
  pairs) but it does not decide anything yet: `promote` is still the old
  comparison, and `commit` is written down beside it. A campaign where the
  sequential answer *replaces* the promotion rule has not run.
- `decidePromotion` remains a shadow. Merging it into the live rule would stop
  230 of the 248 historical promotions, because 135 of 138 campaigns carry fewer
  tasks than `minTasks`.
- `halvingPlan.kind` is `prefilter` in every case today; `returnedUsd` is 0 by
  construction, because no code path returns the freed budget to the survivors.
- P1-1 records a lower held-back reading without acting on it. That is a
  deliberate choice given pool size 1–2, not a finished design.

## 2026-11-25: five things the loop bought, and the one it could not

The loop ran live from `rsi_control enable`. Five rounds produced patches that
are now in origin/main; each was applied after reading it, each came with a spec
that failed first, and the full gate was run before every commit.

| commit | what it bought | why it matters |
| --- | --- | --- |
| `ab3f3d3` | `halvingPlan.returnToSurvivors` — a plan can hand the budget it saved to the candidates that survived | `returnedUsd` was 0 by construction; the money a dropped candidate freed had nowhere to go |
| `641c246` | every lesson carries `notWhen`, derived from the instrument and the task that produced it | 39 of 114 stored lessons had no boundary, so a worker could not tell when a rule stopped applying |
| `99d483a` | `pairAgainstBase` names *why* a round produced no pair (`candidate-not-measured`, `base-not-measured`, `tie`) | a round that measured nothing used to look exactly like a round that measured a tie |
| `591547b` | `verify.owns` — a task may declare the apparatus it was told to change | without it, any task whose work is the gate itself could never promote: the oracle refused its own patch |
| `099129a` | a run killed by the job runner is retried and reported as unjudged, not failed | a seven-direction run was once lost and recorded as a test failure it never was |

### What this does not claim

- `verify.owns` is committed and specified (10 checks), and it has since run in
  a live round — see the section below. When this was written it had not: the
  plugin instance executing these campaigns still held the code from before
  `591547b`, and the guard-flake campaign declared
  `verify.owns: ['scripts/guard-retry.mjs', 'scripts/test-all.mjs']` while its
  `gate.evaluated.checks` carried no `oracleOwns` key at all.
- The halving patch's `perSurvivorUsd` never executed in a live round either:
  `halving-return` ran with screening off (`{"kind":"none","returnedUsd":0}`),
  because its task declared no `screen.cmd`.
- Three campaigns were stopped by hand rather than by their own budget, because
  attempting to fix the oracle from inside a round the old oracle judges is a
  chicken-and-egg the loop cannot solve about itself.

## 2026-11-25: `verify.owns` ran in a live round, and the gap moved

The claim two sections up — "committed, specified, never run in a live round" —
is now false, and what replaced it is narrower and more interesting.

Campaign `owns-live` registered one task with
`verify: { owns: ['scripts/test-all.mjs'] }`. Its round 1 `gate.evaluated.checks`
carried:

```
oracleOwns:        ["scripts/test-all.mjs"]
oracleReleased:    []
oracleOwnedTouched: []
oracleFiles:       ["scripts/test-all.mjs", "scripts/guard-retry.mjs"]
oracleClean:       true
```

Three things follow, and only one of them is the thing I wanted to prove.

1. **The plugin reads the declaration now.** Those three keys did not exist in
   any `gate.evaluated` in this ledger before today. The host was restarted
   between the previous campaign and this one, so the running instance finally
   contains `591547b`.
2. **The exception did not fire, because it did not need to.** `oracleClean` was
   already `true`: the worker's patch touched `tests/self56/…` and nothing under
   `scripts/`, so no apparatus path was edited and there was nothing to release.
   An empty `oracleReleased` is the honest answer, not a failure of the feature.
3. **The round still could not land, for an older reason.** `testsClean: false`
   — the patch wrote a file under `tests/`, and the gate has refused test edits
   since the first landing. The task said "add a spec and pin it"; a spec is a
   test file. So `verify.owns` (which controls the scripts the verifier runs)
   and `verify.scope.editable` (which controls the tests a task may write) are
   two different permissions, and this task declared only the first.

That is why the next campaign, `owns-scope-live`, declares both:

```
verify: {
  cmd:   "<node> scripts/test-all.mjs",
  owns:  ["scripts/test-all.mjs"],
  scope: { editable: ["tests/"] }
}
```

The chicken-and-egg I wrote up before was real, but it had two locks, not one.
`591547b` turned the first. The second was already available
(`src/gate/scope.js`, `parseScope` → `scopeVerdict`) and simply was not being
declared by the campaigns whose work is a test file. Whether both locks open
together in one round is what `owns-scope-live` is for.

### What this still does not claim

- No round has yet **released** an apparatus edit. `owns-live` recorded the
  declaration and touched no owned path, so `oracleReleased: []` is evidence the
  key exists, not evidence the exception grants anything.
- A round that declares `scope.editable` is not restricted to its own new spec:
  the scope is a directory (`tests/`), and the gate checks the patch stays
  inside it, not that the patch is the file the task asked for.

### The second lock was not a missing declaration — it was a contradiction

`owns-scope-live` declared both permissions, and the round came back with:

```
verifierOk: true
oracleClean: true
oracleReleased: ["scripts/test-all.mjs"]
testsClean: false
scope: { editable: ["tests/"], checked: 2, violations: ["scripts/test-all.mjs"] }
```

The same path was excused by `verify.owns` and convicted by `verify.scope` in the
same evaluation. A correct patch — the spec, and the one-line pin that makes the
suite see it — could not land, and every further round reproduced it: three
rounds on `owns-live`, two on `owns-scope-live`, $0.34 together, zero landings.

The fix (`b3c072c`) reads the two declarations as one: `scopeVerdict` takes
`owns`, an owned path still counts in `checked` but is no longer a violation, an
undeclared apparatus path is still refused, and a task with `owns` but no scope
keeps the legacy answer. Four assertions in
`tests/self56/an-owned-path-is-inside-the-scope.test.mjs`, full gate 367/367.

**Now proven live.** Campaign `owns-discriminate` was built so it could not pass
for any other reason: `scope.editable: ['tests/']` and `owns:
['scripts/test-all.mjs']`, with a patch touching exactly one path of each. Its
round 1 came back

```
verifierOk:    true
testsClean:    true          <- the same patch shape was false before b3c072c
oracleClean:   true
oracleReleased: ["scripts/test-all.mjs"]
scope: { editable: ["tests/"], checked: 2, violations: [] }
```

which is the fix doing its job in a real round. The worker's patch (spec plus a
one-line pin, 74 lines) is in `794e2d0` unmodified; it did not *promote*, because
`earnedReason: base-already-green` — the handling had already been fixed by
hand, so there was nothing left for that round to earn. Landing it anyway keeps
the thing that proved the point.

The ordering is worth stating exactly, because it is the opposite of what the
word "committed" suggests:

| what | when (UTC) |
| --- | --- |
| `owns-scope-live` gate, `testsClean: false`, `violations: ["scripts/test-all.mjs"]` | 14:05:06 |
| plugin applied, new instance `101b1420` | 14:18:05 |
| `owns-scope-live` gate again, still `violations: ["scripts/test-all.mjs"]` | 14:18:08 |
| `b3c072c` committed | 14:22:11 |
| `owns-discriminate` gate, `violations: []` | 14:50:01 |

So the fix was on disk before it had a commit (I wrote it, ran the suite, then
committed), the plugin was applied at 14:18 with that code, and the proof round
at 14:50 ran against it. Two consequences:

- The rule is **apply time, not commit time**: a round uses the module graph the
  running host loaded. Reloading mid-campaign does not change the round already
  in flight — the 14:18:08 gate, three seconds after `apply:done`, still
  convicted. It changes the *next* round.
- "Proven live" therefore never means "proven on `origin/main` as of that
  commit". It means "proven on the code the host was running", which may be a
  working-tree edit that lands seconds later. Every "not yet proven live" line in
  this file should be read the same way: not proven on the codepath the host had
  loaded.

## 2026-11-25: nine rounds were scored against a patch nobody ran

An operator stop (a `rsi_control {action:"stop"}`, a stall, a pause) comes back as
`stopReason: 'aborted'` with `abandoned: 'interrupted'`. The verifier is skipped on
that tree (`verified: { skipped: true }`), the attempt carries `patchBytes: 0`, and
the round then fell through to the ordinary path and closed as `no-gain` with
`score: 0`.

That zero is not "the patch failed". It is "nobody looked". `plateauReached` and
`bestPriorScore` both skip `status: 'interrupted'` for exactly this reason, and the
predicate that produces that status only recognised *infrastructure* loss. A stop
was neither infrastructure nor a real failure, so it landed in the one bucket that
has to mean "measured and did not improve".

Nine rounds in this ledger are that shape, and every one of them is a campaign I
stopped after landing its patch by hand:

| campaign | round | why it was stopped |
| --- | --- | --- |
| `pair-audit` | 2 | patch applied by hand in `da068f2` |
| `sequential-decides` | 2 | patch applied by hand in `930433f` |
| `owns-land-live` | 1 | the campaign was not discriminating (own `scope` also listed the path) |
| `oracle-honest` | 2 | patch applied by hand in `591547b` |
| `abandon-live` | 2 | patch applied by hand in `2d43f4f` |
| `loom-acc6` | 9 | stopped mid-run |
| `loom-mut` | 2 | stopped mid-run |
| `loom-noise` | 4 | stopped mid-run |
| `loom-tri5` | 3 | stopped mid-run |

Each of those is standing evidence, in the only file the loop reads back, that a
task did not improve. Three in a row is what raises a plateau card, and a plateau
card is what makes L2 propose a different chain — so a person stopping a campaign
three times could have been read as "this task is stuck".

The fix is a fourth closing branch in `src/runtime/round.js`, narrow on purpose:
the round is `interrupted` only when at least one attempt was dispatched, **every**
dispatched attempt carries an operator stop, and **no** attempt produced a patch. A
stopped child that left a patch is salvage business (there is something to
re-verify); a death with a diagnosis is a real failure and keeps closing as
`no-gain`. `tests/self56/a-stopped-round-is-not-a-flat-round.test.mjs` (8 checks)
is the discriminating spec: the stopped round, the projection, three stopped rounds
not being a plateau, and — the other direction — a diagnosed death still closing as
a zero.

What this does not claim: the nine historical rounds are not rewritten. They stay
as they were written, because the ledger is append-only and re-labelling history to
match a later rule is how a ledger stops being evidence. The number to carry
forward is "nine of the 212 `no-gain` rounds were stops, 4.2%", not "the loop was
never confused".

## 2026-11-25: the held-back reading exists now

P1-1 was written, specified and committed without ever producing a number: every
recorded `gate.evaluated` event in the corpus had `holdoutScore: null`, because
only three of 149 campaigns ever had a holdout pool and none of them ran after
the field was added. That is no longer true.

`holdout-live2` ran four rounds in `C:/Projects/RSI-live/holdout2` against a
task whose held-back verifier reads a *different* file (`held.txt`, rate 0.55)
and prints the same instrument the visible one does:

| round | candidate | holdout | gain | promoted |
| --- | --- | --- | --- | --- |
| 1 | 0.90 | 0.55 | false | yes |
| 2 | 0.92 | 0.55 | false | no |
| 3 | 0.95 | 0.55 | false | yes |
| 4 | 0.95 | 0.55 | false | no |

Four things this settles, and one it does not:

- The reading is **taken**, not skipped: `holdout.selected` appears every round
  with `pool: ["t-held"]`, and `checks.holdout` is `true` rather than `skipped`.
- The value is **real**: `holdoutScore: 0.55` matches `held.txt` exactly, and
  `holdoutReason` says why the comparison is legitimate ("the held-back verifier
  printed the same instrument the candidate used").
- A held-back score **below** the candidate's is recorded as `holdoutGain: false`
  and does **not** veto: rounds 1 and 3 promoted at 0.90 and 0.95 while the
  held-back task sat at 0.55. That was the deliberate choice in the spec — the
  pool is one or two tasks and one reading carries the 2.2–6.0 point spread from
  `docs/research/r2-score-noise`, so it is evidence, not a hurdle. Rounds 2 and
  4 failed to promote for a different reason (the visible rate did not clear the
  incumbent by `minGain`), which is visible in `checks.beatsIncumbent`.
- Corpus totals after this run: **34** `gate.evaluated` events carry the field at
  all, **4** carry a number, and **97** rounds actually ran a holdout. So the
  field is still empty for 93 of the 97 rounds that had every right to fill it —
  they simply ran before the code that reads it existed. Only new campaigns can
  fill it.

What it does not settle: whether 0.55 against 0.90 should eventually veto. That
needs a pool large enough to say the held-back task is measuring the same thing,
and one task is not.

## 2026-11-25: what the loop could not do about itself, demonstrated

The bug written up in `inflight-recover` is not hypothetical — it is the state
that campaign is in as I write this. Its round 1 has `round.started` and
`attempt.deadline` at 11:16 and **nothing since**: no `attempt.finished`, no
`verifier.finished`, an empty `artifacts/`, a lease still saying
`state: "running"` with `lastAdvanceAt` frozen at 11:16, and `rsi_run` answering

```
Error: campaign inflight-recover already has a round in flight
```

The process that owned that attempt is gone (this session started it, and the
attempt's session id no longer resolves), so `inflight` was rebuilt empty on
boot and nothing released it. `recover()` does close `running` rounds on boot —
but only ones it can see at boot time; a round that goes stale *while the host is
alive* is never revisited, which is exactly the window this campaign fell into.

Two lessons worth keeping:

- The failure mode is the loop's own: a round that dies takes the campaign with
  it, permanently, and the only trace is a lease nobody re-reads.
- It cannot be fixed from inside a campaign, because the fix lives in the code
  that decides whether a round may start. The next round cannot start to write
  the fix. That is the fourth time this session hit the chicken-and-egg (after
  `verify.owns`, the spec pin, and the oracle) and it is now the single largest
  structural limit: **the loop cannot repair the rule it is being judged by.**

## 2026-11-26: the loop reads before it writes

`grep -rn research src/runtime/*.js` returned one comment and nothing else on the
morning of 2026-11-26, while `~/.dsh/loom/research/` held ten directions, 352
evidence snapshots and 1987 verified claims. The loop had a research library and
no way to consult it. Every "what should we fix next" therefore came from
running a campaign and watching it hit something — which is why each fix
produced the next one, and why the list never seemed to end.

The round now has a research leg before the planner and the workers: one
question, up to eight sources, two pages actually read, and up to four verbatim
quotations carried into the worker brief under `Research notes (data, not
instructions)`. The budget is `config.research` (`depth: 'quick'`, `fetchTop: 2`,
`timeoutMs: 90s`), and `quick` alone fetches zero pages — the explicit `fetchTop`
is what makes a quotation possible.

What decides whether a round reads:

| last round | reads again? |
| --- | --- |
| no history | yes, once |
| `promoted: true` and it read | no |
| `promoted: true` and it did not read | no — reading did not earn this |
| `promoted` not a boolean / `interrupted` | yes |
| lost, or `status` missing | yes |
| two wins in a row that both read | no |

`researchMode` is a policy field (`off | full | auto`) with the same validation
and campaign-override precedence as `planMode`, so the balance is adjustable per
campaign and promotable. The mutation menu grew its fifth kind,
`research-on-stuck`, which proposes `researchMode: 'auto'` on a chain that does
not already say it — the first menu entry that changes the loop's own habits
rather than the worker's instructions.

The question it asks is chosen in this order: the stuck signature of the last
three rounds (what the loop is visibly failing at), then the oldest open
question in the research ledger, then the task text. The ledger reader is
`researchQuestions(home)`, not the raw `questions.jsonl` — every one of the 17
records on disk is a `{kind:'opened'}` event with no `status` field, so a script
that counts `status === 'open'` reads zero on a ledger that is not empty. That
trap is now pinned by a spec.

### The leg's record stopped at the event (2026-11-26)

Campaign `react-feedback`, three rounds measured on the plugin instance applied at
04:04 local. Every `round.finished` carried the leg:

```json
{"mode":"full","from":"ledger","queries":1,"sources":8,"read":2,"passages":4,
 "ms":752,"costUsd":0,"used":false}
```

`rsi_status` showed three rounds with **no** `research` field. `projectRound`
copies a whitelist of keys and the leg was not on it, so two readers that work off
`state.rounds` were dead:

- `researchModeFor` treats a missing record as "won without reading" and answers
  `off` — switching the leg off for a reason that is not true, on the one campaign
  that had just measured `used: false`;
- `legBudget` counts rounds that bought a read, and projected rounds never bought
  one, so `maxRounds` never bit.

The projection was not the whole story: `runtime.append` folds the log through
`reduce`, and **that** copy (`src/core/reduce.js`, the `round.finished` whitelist)
is the one the live runtime uses. Campaign `balance3-live` (two rounds, both
promoted) confirmed it — the events carried `{"mode":"full","used":false}` and
`{"mode":"off"}` respectively, while `views/state.json` read
`[{"n":1},{"n":2}]`. The whitelist had also been dropping `noop`, `screened`,
`kept`, `halving`, `fidelity`, `holdoutScore`, `holdoutReason` and `promotedId`,
which is the same bug with eight older names: each was added to the event and to
`projectRound`, and never to the fold.

Both copies now carry the leg (`tests/self57/what-the-fold-keeps.test.mjs` pins
the fold and asserts it stays an explicit whitelist rather than merging the
whole event). `tests/self57/what-a-round-carries-back.test.mjs`
pins the projection *and* both readers; the control case asserts what the missing
field used to do, so a regression cannot look like a policy choice.

Two things this does not claim:

- **`used` is now decided by span matching, not by the worker's report.** The
  threshold is in `research-leg.js`; a worker that paraphrases a passage will be
  recorded as not having used it.
- **The allowance stops a campaign, it does not ration it.** `maxRounds: 3` means
  the fourth round reads nothing, not that it reads less.

### The balance, measured (2026-11-26)

Campaign `balance4-live` on the plugin instance applied at 05:11 local, two
one-edit tasks, `researchMode: auto`. Both rounds promoted; the point of the
campaign was what the second round did with its budget.

| round | projected `research` | cost |
| --- | --- | --- |
| 1 | `{"mode":"full","read":2,"passages":4,"used":false}` | $0.0085 |
| 2 | `{"mode":"off","read":0,"used":null,"skipped":"not-run"}` | $0.0069 |

Round one bought a leg it never used (4 passages in the brief, none of them
reached for), and `researchModeFor` answered `off` for round two: two searches
and two page fetches that were not bought, on a round that then solved its task
anyway. That is the first time the research/do balance moved because of a
measurement rather than because a person set the knob.

Three limits this does not claim away:

- **The leg records `costUsd: 0`.** Search and fetch go through `ctx.web`, which
  is not priced by `config.models.pricing`, so the reading is not in the
  campaign's budget. "The leg is cheap" is an assumption, not a measurement; an
  $0.008 round is the agent's tokens, not its pages.
- **`used: false` is span matching.** The worker may well have applied the idea
  in different words; the record says "no passage appears verbatim", not "the
  reading was useless".
- **One campaign.** `auto` now has a mechanism with a live measurement behind
  it, not a distribution: the next campaign that reads and loses will buy again,
  and nothing here says how often that should happen.

### `auto` defunds itself, twice, in one campaign (2026-11-26)

`balance4-live` was two rounds. `queue-live3` was four trivial one-edit tasks on
the instance applied at 22:42, with `researchMode: auto`, precisely so that a
read could not pay for itself: the tasks are "write the word fixed three times
into a file", and no page on the internet is about that.

| round | mode | read | used | status |
| --- | --- | --- | --- | --- |
| 1 | `full` | 2 | `false` | promoted |
| 2 | `off` | 0 | `null` (`not-run`) | promoted |
| 3 | `off` | 0 | `null` (`not-run`) | promoted |
| 4 | — | — | — | campaign finished, all tasks solved |

Round one bought a read it did not use and won anyway; `researchModeFor` read
that as "this campaign can hold its ground without reading" and answered `off`
for every round after, including the one that finished the campaign.

The costs did **not** fall, and the table above deliberately has no cost column
for that reason: $0.009961 / $0.008294 / $0.009905 / $0.011222. Skipping the leg
saves nothing visible because the leg's own cost is still recorded as 0 (see
above) — search and fetch are not priced — so the only thing four rounds of
"don't read" bought was four rounds that could not have used a note anyway. The
mechanism works; the saving is unmeasured.

This is the first time the knob moved on its own twice inside one campaign
rather than once at the end of one. It is still not a distribution: the two
later rounds had nothing left to learn from the first, which is a property of a
four-task probe, not evidence about how often reading pays on real work.

### The ledger rotates, live, and the last thing it needed was a question

`queue-live2` (three one-edit tasks, `researchMode: full`) asked three
different ledger questions in three rounds — the R2 variance question, then the
R9 task-set question, then the R9 injected-lesson question — and wrote each
read back against the question it was about:

```
question.read  q-a7ebd5decbd3  round 1  read 2  used null
question.read  q-753e482b7e1d  round 2  read 2  used null
question.read  q-599051419655  round 3  read 2  used null
```

Each was followed by an outcome event with `promoted: true` and `used: false`.
The queue works, and the thing it made visible is the earlier problem: every one
of those rounds won without quoting a note, which is what the brief now asks
about (see "the measure nobody was told about" below).

### The leg ran in a live round

Campaign `react-live`, round 1, 2026-11-26 (`candidates: 1`, `researchMode: full`):

```json
{"mode":"full","from":"ledger","queries":1,"sources":8,"read":2,"passages":4,
 "ms":5160,"costUsd":0,"question":"有没有可以直接接入的 patch 级 reward-hacking 检测器（而不是又一篇描述检测框架的论文）？"}
```

Every part of the claim is in that line: the question came from the open-question
ledger rather than the task text, eight sources were searched, two pages were
fetched, four verbatim passages were extracted, and the leg cost five seconds.
The round then failed on its own merits (`no-gain`, verifier `exit 1`, the
attempt hit the 13-minute deadline), which is exactly the condition the next
round is supposed to read again for.

### What this does not claim

- A finding is a quotation, not a conclusion. The leg quotes; nobody has graded
  whether the quotation answered the question.
- `research.used` is written from the winning attempt's report at the end of the
  same round, so it is now a measurement rather than a placeholder — but the
  measurement is textual: a report that quotes 24 characters of a finding, or
  names its URL or arXiv id, counts as having reached for it. A worker that used
  the notes without saying so is scored as not having used them, and that error
  runs one way.
- The live rounds above ran under the plugin instance applied at 02:29 local,
  which predates the write-back commit, so `used` is `null` there: that is the
  old code, not a failed measurement. The rule the field feeds (`a win that did
  not read is not evidence for reading`) is pinned by
  `tests/self57/the-round-writes-back-whether-it-was-used.test.mjs` and applies
  from the first round any instance loaded after that commit runs.
- Both live rounds asked the same R1 question, because the leg took the oldest
  open ledger entry and nothing rotated it: campaign two would have asked it
  again. `questionFor` now skips any question an earlier round recorded on
  `round.finished.research.question` (mode `off` does not consume one), pinned
  by `tests/self57/the-question-rotates.test.mjs`. Skipping is not answering:
  when every open entry has been asked once the leg falls back to the task, and
  the ledger entry stays open. A question that has been read
  `config.research.maxQuestionAsks` times (three by default) without ever being
  followed by a promotion is now **parked**, not closed: `reflectOnQuestions`
  counts only rounds that actually paid for a read, ignores `interrupted` rounds
  (nobody ran them), and `src/runtime/round.js` writes both the ledger entry and
  a `question.parked` event carrying the id, the count and the reason. Parking
  is a claim about this loop — "up to here it has not been able to use it" — and
  not an answer; closing still needs a verdict, and a quoted passage is not one.
  Before this, all seventeen ledger questions were open and none were ever
  closed, so every new campaign started at oldest and asked the same thing.
  One correction found while wiring it: the reflection has to read the rounds the
  fold of `round.finished` just produced, not `view.state`, because a runtime
  whose fold is partial shows rounds that read nothing and the leg parks nothing
  forever (`tests/self57/the-round-parks-a-question-it-cannot-use.test.mjs`).
- **The ledger is a queue now, and the reading says why it was not.** Every
  campaign that bought a read on 2026-11-26 asked the same question — the oldest
  open entry — because `questionFor` looked at position, and rotation only
  skipped what *this* campaign had asked. Thirteen rounds across seven campaigns
  (`balance-live`, `balance2-live`, `balance3-live`, `balance4-live`,
  `react-feedback`, `react-live`, `react-panel`) bought 26 page reads and 52
  passages on that one prompt, and `used: true` never appeared once. A read is
  now recorded against the question it was about (`recordQuestionRead`, two
  events: the spend right after the leg returns, the `used`/`promoted` outcome
  after the gate speaks, and the second one must not bump the count), and
  `questionFor` prefers the least-read question with ledger order as tie-break.
  The R1 question was parked by hand on the live ledger
  (`parkReason`: read in 13 rounds across 7 campaigns with no promotion), so the
  next campaign starts from the queue instead of reopening the same page.
  Pinned by `tests/self57/a-question-is-a-queue-not-a-loop.test.mjs` and
  `tests/self57/the-ledger-hears-about-the-read.test.mjs`.

  What this still does not claim: `used` is a verbatim-span match, so
  `used: false` means "the report never quoted a span or named its URL", not "the
  read did not help"; the leg's `costUsd` is still 0 because `ctx.web` is not in
  the pricing table, so "a read is cheap" is an assumption; and one campaign per
  mechanism is one measurement, not a distribution.

- **Two write-backs were silently dropped, and one spec could not have seen it.**
  The outcome half of `recordQuestionRead` was first placed beside the `used`
  write-back, where `promote` is not declared yet. The `ReferenceError` was
  caught by that block's own `try/catch`, logged as one line, and every live
  round recorded the spend and never the result — `grep -c read-outcome` on the
  live ledger was 0 while the rounds looked healthy. The spec that only checked
  the spend passed. The one that checks `promotedAfterRead` is what moved it
  after `promote` is computed
  (`tests/self57/the-ledger-hears-about-the-read.test.mjs`). The same shape
  appeared once before in this file: a write-back is only real when a spec asks
  for the half that is easy to drop.

  The second was in the fixture, not the product: the verify command named
  `keep.txt` literally, so `oraclePathsFor` put the file under test inside the
  verifier's own closure (`oracleClosure: ["check.mjs","keep.txt"]`) and the
  round could never pass no matter what the worker wrote. Three probe
  workspaces lost an afternoon to this. The shape that works passes the target
  through `spec.json` and reads it with `process.cwd()`; it is pinned in the same
  spec, and a worker's reply also has to say `stopReason: 'completed'` or
  `gateOk` is false for a reason that has nothing to do with the patch.

- **The measure nobody was told about.** Eighteen rounds across nine campaigns
  carried a `research` record and `used` came back `true` zero times. That looks
  like a verdict on reading and it was not one: the notes were in the brief, the
  span check ran on the report, and nothing ever asked the worker to say whether
  a note had shaped the change. A worker that reads a quotation and silently
  acts on it produces exactly the same record as a worker that ignored it, so
  the leg was measuring a behaviour nobody had requested. The brief now asks, in
  the same section as the notes and next to the `evidence` key that can carry
  the answer: quote a few words or name the source if one of them mattered, say
  nothing if none did. Pinned by
  `tests/self57/the-brief-asks-whether-the-notes-helped.test.mjs`; the
  distinction it preserves is that "used none" and "never read" are different
  facts, and only the first is something a round can be graded on.

  What this still does not claim: an instruction is not compliance. The next
  campaign that reads and lands can still come back `used: false`, and that will
  then be a measurement rather than an absence — which is the whole difference
  between the eighteen rounds above and the rounds after this commit.

  **It has now happened, once.** `queue-live5` round one (2026-11-26 07:07, the
  instance applied at 23:05 the night before) came back `used: true`. The
  worker's evidence carries the sentence that settles it:

      wrote NOTES.md with quoted span from this round's notes
      ('the file keeps history, recall does not')

  and the record reads `{"mode":"full","from":"ledger","read":2,"passages":4,
  "used":true}` with the round promoted. Round two — a different question from
  the queue — came back `used: false` on 3 passages. So across two rounds on the
  same instance the flag took both values, which is what makes it a measurement:
  a flag that could only ever be false would still be unfalsifiable.

  What this does not claim: one `true` is the existence proof, not a rate. The
  census after it is 21 rounds that really read, `used: true` 1, `false` 13,
  `null` 7 — and the 7 nulls are all rounds older than the write-back, so the
  honest statement is "14 rounds could have answered and 1 did". Whether a note
  *helped* is still not measured: a worker that quotes a span to satisfy the
  brief and a worker that changes its patch because of it leave the same record.

- **Four of the nine gap rounds read nothing at all, and a PDF was why.** The
  host fetches through a text pipeline that answers `/pdf/` with HTTP 404;
  measured on 2026-11-26 the recurring gap shape was `export.arxiv.org/pdf/...`,
  and on `fetchTop: 2` one PDF is half the round's reading. The queue now takes
  readable pages first and PDFs only in the slots that remain, with per-host
  spreading unchanged and search order preserved inside each pass — relevance is
  the only ranking signal there is, and readability is a different question.
  Pinned by `tests/self57/a-pdf-is-a-slot-that-reads-nothing.test.mjs`.

  What this still does not claim: the server-side 404 is the host's pipeline, not
  a property of PDFs, so a future fetcher that renders them would make this
  ordering unnecessary rather than wrong; and a round that sets PDFs aside can
  still read nothing, if the pages it picked were behind paywalls or stale links.

### 2026-11-26: the balance becomes a measurement, not a rule

`researchModeFor` answers "read or not" from the previous round's outcome. That
makes it useful and it makes every statistic computed over its rounds worthless:
`auto` turns reading **off after a win**, so the "skipped" bucket is populated by
campaigns that had already started landing and the "read" bucket by the ones that
had not. The two arms are selected on the outcome. Nineteen read rounds promoted
8 (42%), six skipped rounds promoted 6 (100%) — that number is the rule reading
itself back, not a fact about reading.

The design that can answer it assigns the arm **before** the round runs.
`src/loop/research-trial.js`:

- `assignArm({seed, campaign, round})` — FNV-1a over `seed|campaign|round`, so the
  assignment is re-derivable from the ledger. Storing it in memory would mean a
  restart silently re-randomises and no comparison could ever be reproduced.
- `compareResearchArms({rounds})` — counts the arms from `researchTrial.arm`
  rather than from `research.mode`, because a round assigned to the reading arm
  can still fail to read (no web, no question) and must stay in the arm it was
  assigned to. Reports Wilson intervals per arm, the MDE for the sample, and cost
  per arm; under three rounds in an arm it refuses to name a direction, and a gap
  below the MDE comes back `cannot-distinguish` with the words "Not "no effect"".

`trial` is a fourth value for `researchMode`, and it is never the default: it
genuinely costs money, because some rounds read when they did not need to. What
it buys is the only number in this document that would be allowed to say whether
reading helps.

The first campaign under it is `trial-live` (four tasks, `researchMode: trial`,
`budgetUsd 3`, eight rounds allowed). Four rounds ran before it stopped, and each
one took the arm `assignArm` says it should:

| round | arm | read | passages | used | skipped | s | cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | off | 0 | 0 | — | not-run | — | $0.008291 |
| 2 | full | 0 | 0 | — | leg-timeout | 90.4 | $0.008226 |
| 3 | off | 0 | 0 | — | not-run | — | $0.006747 |
| 4 | full | 2 | 4 | false | — | 17.3 | $0.009859 |

`compareResearchArms` over those four rounds: two per arm, both arms 2/2
promoted, `delta 0`, `mde 0.9905`, `verdict "cannot-distinguish"`, and the
sentence `4 assigned rounds (2 reading, 2 not): too few in an arm to read a
direction yet`. Cost per round $0.0090425 reading against $0.007519 not.

Three things that table says, none of which is "reading does not help":

- **The timeout is a reading cost.** Round 2 was assigned to read and spent 90.4
  seconds before `withDeadline` cut the leg off at the configured
  `research.timeoutMs`; it read zero pages. A paid read that returns nothing is
  the arm's worst case, and it happened on the first pair.
- **Two rounds an arm is not a sample.** The MDE at n=4 is 0.99 — the arms would
  have to differ by more than a full point of pass rate. Saying "cannot
  distinguish" here is the honest sentence, and it stays honest until the arms
  are big enough for the MDE to sit below the effect anyone cares about.
- **Cost did not fall.** $0.00904 against $0.00752 per round is consistent with
  reading costing about a cent and a half a round; the difference is inside the
  noise of four rounds. The leg's own `costUsd` is still 0 because `ctx.web` is
  not in the pricing table, so the arm cost above is *round* cost, not leg cost.

### 2026-11-26: eight rounds, and two ways it was not a trial

`trial8-live` ran the same design on an eight-task probe with ten rounds allowed
and stopped itself after eight (all solved). The arms came out perfectly
alternating, which is what a hash gives on eight consecutive rounds:

| round | arm | read | ms | skipped | promoted | cost |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | off | 0 | — | not-run | yes | $0.008128 |
| 2 | full | 2 | 36.2s | — | yes | $0.014442 |
| 3 | off | 0 | — | not-run | yes | $0.008937 |
| 4 | full | 2 | 1.8s | — | yes | $0.008480 |
| 5 | off | 0 | — | not-run | yes | $0.009839 |
| 6 | full | 2 | 8.8s | — | yes | $0.009790 |
| 7 | off | 0 | — | not-run | yes | $0.010255 |
| 8 | full | 0 | — | **budget-spent** | yes | $0.006671 |

Both arms 4/4. `compareResearchArms`: `ready: true`, `delta 0`, `verdict
cannot-distinguish`, sentence `8 assigned rounds: reading promoted 100.0 points
and not reading 100.0 points (delta 0.0 points); this design could resolve 99.1
points, so the difference is below what 8 rounds can see. Not "no effect".`

That sentence was wrong when it was first printed, in a way the spec suite had
pinned: `compareResearchArms` passed the **total** round count to
`mdeIndependent`, whose formula is for two arms of size n each. It reported
0.70 — a floor earned by a design with twice the data. The floor has to come
from the smaller arm (`2/(1/n1+1/n2)` reproduces `p(1-p)(1/n1+1/n2)` exactly),
which for two arms of four is 0.99. Both numbers say "cannot distinguish" here,
but only because this probe promoted everything: with a mixed result the
optimistic floor would have let eight rounds claim a difference they cannot see.

The second way it was not a trial is round 8: assigned to read, and it recorded
`skipped: "budget-spent"`. `legBudget` caps how many rounds may buy a read, which
is the right brake for `auto` and `full` -- they read because a rule said so.
Under `trial` the cap does not save money; it withholds the treatment from a round
that still counts in the reading arm, which moves the estimate toward zero
without leaving a record that a treatment was missing. `legBudget` now returns
`buy: true` for `trial` and the cap stays in force for the other modes.

### 2026-11-26: the trial was counting coin flips while the loop printed rates

Both probes promoted every round, so the trial's only reading was 4/4 against
4/4 and the honest answer was "cannot distinguish". That is not a property of
reading; it is a property of counting. A promotion is a 0/1 outcome, and a
proportion needs hundreds of rounds before it can resolve ten points — at eight
rounds the floor is 0.99, i.e. the trial would only see a difference if one arm
promoted everything and the other nothing.

The loop already records a number per round. `round.finished.score` carries the
kill rate whenever the verifier printed one, and `scoreSource` says where it came
from. Throwing that away to count coin flips is the mistake R2 names: a binary
verdict is a lossy readout of a number the verifier already produced.

`compareResearchArms` now reports both readings. The count stays — a campaign
where nothing was solved is not a campaign whose scores mean anything — and
alongside it `score` reports each arm's mean, the mean difference, its interval,
and the floor that difference had to clear. Three rules make it honest:

- A round with no finite score is left out, never read as zero.
- A score whose `scoreSource` is `binary` is left out too: it *is* a 0/1 verdict
  wearing a number, and averaging it invents precision the verifier never
  printed.
- Zero spread across an arm returns a zero-width interval with the floor set to
  the effect itself, rather than the infinite sensitivity a zero standard error
  would imply.

`trial8-live`'s eight rounds all scored 1.0, so the score reading returns null on
that campaign by its own third rule — the fix does not retroactively make four
rounds informative. What it changes is what the next campaign can answer: the
same eight rounds, if their scores had been 0.9/0.8/0.85 against 0.4/0.5/0.45,
would have come back `full-better` with an interval excluding zero, where the
count alone still says "cannot distinguish".

### 2026-11-26: a probe with partial credit, and the exemption that did not fire

`trial-partial` was built to give the score reading something to look at: ten
tasks, each printing the share of four required words that are present, so a
round can score 0.25 or 0.75 instead of only 0 or 1. Eight rounds ran (the ninth
was cut off), arms alternating `full`/`off` as the lot decided, and every round
scored 1.0 anyway — the tasks were easy enough that partial credit never
materialised. The score reading therefore returns null by its zero-spread rule,
which is the right answer to a probe that could not produce variance.

What the campaign did find is the third shape of the same bug. Rounds 7 and 9
were assigned to read and recorded `skipped: "budget-spent"`. The exemption added
earlier in the day checked `mode === 'trial'`, but `legBudget` is called after the
arm is resolved, so `mode` was `full` and the exemption never fired. The flag now
travels separately (`assigned`), and the spec pins both sides: with it the cap is
exempt, without it the same call still stops at the cap.

Two probes and three fixes later, the mechanism is what is proven: the arm is
drawn before the round, it survives the fold, the cap cannot quietly unassign a
read, and the comparison reports a count and a score with separate intervals. The
question the trial exists to answer is still unanswered, because a probe that
promotes everything and scores everything at 1.0 has no variance to divide.

What this does not claim: four rounds on a four-task probe say nothing about
whether reading pays on real work. What they do establish is that the arm is
assigned before the round runs, that the assignment survives the fold, and that
the comparison is recomputable from the ledger — which is what a trial needs
before its numbers can mean anything. A bigger campaign has to run before this
document is allowed to report a direction.

- **Reading rounds promote less often, and that sentence is not a finding.**
  Re-counted over every campaign on 2026-11-26: 19 rounds that were allowed to
  read promoted 8 (42%), 6 rounds that skipped the leg promoted 6 (100%). It
  would be easy to publish that as "reading hurts". It cannot be: `auto` turns
  the leg *off* after a win (`researchModeFor`), so the skip bucket is by
  construction populated with campaigns that had already started landing, and
  the read bucket with the ones that had not. The two arms are selected on the
  outcome. A real answer needs the same round decided both ways, which is what
  `src/loop/ab.js` does for policies and what the leg has no equivalent of yet.
  Recorded here so the number is not re-derived later and mistaken for evidence.

- `research-on-stuck` has `evidence: ['no-round-yet']`: the kind is in the menu
  before it has a campaign behind it. Its prediction is a prior, and the card
  says so.

- The whole leg is skipped, and the round proceeds, when the host has no web
  service. A campaign with no research is still a campaign; that is deliberate,
  and it also means a silent web outage looks like a thorough loop.

### 2026-11-26: the park rule could not fire, for two reasons

The rule that retires a question the loop cannot use had been in the code since
`333911d` and had parked exactly one entry — the one I parked by hand. Measured
against the real ledger, both reasons are arithmetic, not judgement:

- It counted this campaign's rounds only. Sixteen open questions, most read by
  two campaigns, and the rule saw at most one ask each. A bar of three that can
  see one fires never.
- It treated "the round promoted" as "the reading helped". Every probe built
  this week promotes on an easy task while ignoring all four quotes, so
  `promoted: true` was true for all seventeen and nothing qualified for parking.

The fix has two parts. `researchQuestions` now folds `measuredReads` and
`measuredBy` as well as `reads`, so a read whose outcome was recorded as a
boolean can be told apart from one that was merely spent. And the bar counts
every read, keeps a question alive on a single `used: true`, and reports both
numbers in the reason: *read in 5 round(s) (1 with a recorded outcome), and the
notes were used in none of them*. Reads whose outcome nobody wrote down count,
because "nobody recorded it" is not "it helped" — that reading is exactly what
retired nothing for two weeks — and the two figures keep the silence visible
instead of hidden behind one number.

Dry run against the live ledger (16 open): bar 1 parks 15, bar 2 parks 6, bar 3
parks 0. The shipped bar is 3, so nothing was parked on the strength of this
change; the rule now merely *can* fire, on evidence that will exist once probes
record `used` instead of leaving it null.

What this does not claim: parking is not a verdict on the question. It says the
reader has not been able to act on it, which is a fact about this loop and
reversible with a word. And the 15-at-bar-1 figure is not "we should park 15
questions" — it is how much of the ledger's read history has no recorded
outcome at all.

### 2026-11-26: the leg was reading about the wrong problem

Measured over every round that recorded a `research` block (78 rounds, 2026-11-26):

| `from` | `used` | rounds |
| --- | --- | --- |
| `ledger` | `false` | 30 |
| `ledger` | `null` | 10 |
| `ledger` | `true` | 1 |
| `null` (leg not bought) | `null` | 37 |

Forty-one rounds asked a ledger question and not one of them asked the task
anything: `from` was `ledger` 41 times, `task` zero, `stuck` zero. The ledger's
entries are gaps in *this loop* — "does a harness change that gains on one model
family keep its gain on another?", "how many pairs make a paired comparison
decisive?" — while the probe campaigns were asking them with a task that read
"sum 120 integers". So `used: false` was not a measurement of whether reading
helped. It was a measurement of whether the worker cited a quotation about an
unrelated subject, which it could not honestly do.

The fix is one precondition, not a rewrite: a ledger question with no vocabulary
in common with this round's task is not this round's question, and the leg falls
back to the task itself (`from: 'task'`). `sharesTopic` compares content words of
four characters or more and needs one shared word, which is deliberately
generous — the failure it prevents is total mismatch, not an imperfect match. The
ledger keeps priority whenever it does share vocabulary, which is the case in
this repository, where the tasks edit the loop the questions are about.

Two things this does not claim. First, it does not make `used: true` common: a
relevant question still has to be answerable by a page the round can actually
fetch. Second, the probe campaigns' `used: false` history stays as it is — the
ledger is append-only, and rewriting those rounds to say "we asked the wrong
question" would be the same mistake as grading a forecast that was never made.

The measurement that motivated this is on the same ledger: 41 rounds, one `used:
true`. That single `true` came from a round whose task and question shared
vocabulary by luck (`queue-live5`, reward hacking), which is the effect this
change makes deliberate instead of accidental.

### 2026-11-26: ten rounds, every one a win, and the trial learned nothing

`trial-agg` is the fifth probe for the read/do trial and the hardest endpoint so
far: twelve derived integers per task (count, sum, min, max, sum of the two
medians, distinct count, sum of positives, sum of negatives, above-mean count,
below-zero count, even count, weighted sum) computed from 120 data points, so a
single slipped digit costs 1/12 instead of failing the round.

| round | arm | read | used | score | cost |
| --- | --- | --- | --- | --- | --- |
| 1 | full | 2 | false | 1.0000 | $0.011197 |
| 2 | off | 0 | — | 1.0000 | $0.010475 |
| 3 | full | 2 | false | 1.0000 | $0.015214 |
| 4 | off | 0 | — | 1.0000 | $0.008842 |
| 5 | full | 0 (leg-timeout) | — | 1.0000 | $0.008661 |
| 6 | off | 0 | — | 1.0000 | $0.008814 |
| 7 | full | 2 | false | 1.0000 | $0.008891 |
| 8 | off | 0 | — | 1.0000 | $0.012017 |
| 9 | full | 2 | false | 1.0000 | $0.010759 |
| 10 | full | 2 | false | 1.0000 | $0.008862 |

Ten rounds, ten promotions, ten times 1.0000. Both readings of the trial agree
there is nothing to say: the count because both arms are at 100%, the mean score
because both arms have zero spread. The trial's own sentence: *every round in
both arms scored the same: the endpoint did not move, so there is no effect size
to estimate. This is a statement about the endpoint, not evidence the arms are
equal.* That sentence is correct and it took five probes to earn the right to
print it.

Two things are worth recording.

The first is that difficulty did not create variance. Four earlier probes were
scored 1.0 on every round and the obvious explanation was "the tasks are too
easy"; this probe was made harder and still scored 1.0 on every round. The
worker reads the twelve definitions, computes them, and writes them out. What
would create variance is a task where the *rule* is ambiguous or where the answer
depends on something the worker cannot see — not a longer arithmetic checklist.
That is a different probe, and it has not been built.

The second is what the trial can still say. Reading cost $0.0106 a round and not
reading $0.0100, over the same ten rounds, so the reading arm paid about six
tenths of a cent a round; the cost axis now reports this
(`compareArmCost`), which is the one actionable statement in the table. It is
inside the noise at ten rounds — delta $0.00056, interval [−$0.0019, $0.0031],
floor $0.0036 — so the honest sentence is "reading cost 1.06c a round and not
reading 1.00c; that difference is below what ten rounds can see", and the trial
now prints it rather than leaving the reader with a shrug.

What this does not claim: the trial is not shown to be useless, and it is not
shown to work. It is shown to be *unable to answer* on a saturated endpoint. And on
this endpoint the sample-size line is deliberately empty rather than large: a
saturated endpoint stays saturated however many rounds are bought, so
`roundsNeeded` returns `null` when the spread is zero instead of printing a
number that would invite running more of the same. Where there *is* spread, the
same code does print it — at a spread of 0.25 a ten-point difference needs 99
rounds per arm, which is the number a reader can act on. Five probes in, the honest summary of
the read/do trial is that the mechanism runs (assignment, recording, cost, the
refusal to call overlap a finding) and the question it was built to answer is
still unmeasured.

### 2026-11-26: the money axis can only understate reading

The cost axis shipped with a hole that is structural, not a bug in the arithmetic.
`research.costUsd` was 0 on all ten rounds of `trial-agg`, because `ctx.web` is not
in the pricing table `pricingFor` reads. So the money comparison was six rounds
that cost money *plus a free search* against four rounds that cost money. It can
only ever understate what reading costs, and it will understate it on every
campaign until the leg's own calls are priced.

The leg does report what it spent, in the one unit it can measure: wall clock.
On the same ten rounds `research.ms` was 4.8s, 13.5s, 17.3s and 31.1s on the four
rounds that read (round 5's leg timed out at 90.4s and read nothing), against
rounds that take 48–80 seconds in total. Twenty-seven seconds a round is a third
of a round, and the money axis could not see it.

So `compareArmMetric` is now the shared implementation and both axes use it: same
interval, same floor, same refusal to name a direction from overlap, same
refusal to treat an unmeasured round as zero. The arm that never reads records no
`ms`, which is not read time of zero — scoring it as zero would hand reading a
cost it did not earn, and the spec pins that (`a round that recorded no time at
all is missing, not zero`).

On the live campaign the time axis reads: reading 27.2s a round, not reading 0s,
delta 27.2s, interval [0.5s, 54.0s], floor 38.3s. So even the axis that can see
the cost cannot *decide* it at ten rounds — and that is now printed instead of
implied:

> 10 assigned rounds: reading promoted 100.0 points and not reading 100.0 points
> (delta 0.0 points); this design could resolve 90.4 points, so the difference is
> below what 10 rounds can see. Not "no effect". Reading cost 1.06c a round and
> not reading 1.00c. The leg itself spent 27.2s a round reading.

What this does not claim: 27.2s a round is not evidence that reading is
expensive, because the rounds that read also read *pages* and the rounds that did
not fetched nothing at all. The comparison is between "read then work" and "work
only", which is the treatment the trial assigns — but the ten rounds are not
enough to separate 27s from 54s, so what is established is the measurement, not
the price.

### 2026-11-26: the comparison existed and nobody could see it

`researchTrial` has been in `panelState`'s JSON since `b6258b9`, and
`rsi_status` since `ce02aa6`. `grep researchTrial client/index.js` returned
nothing. So the one comparison all of this work exists to produce — does reading
help, does it cost, is the question even answerable — was computed, shipped,
and never drawn. That is the same failure as a read nobody records, one level
up, and it survived four commits because each of them tested the JSON.

What changed:

- `trialSummary(trial)` in `src/panel/api.js` folds the comparison into one line
  of Chinese: both arms with their rates, the verdict word, the money per round
  on each arm, and the seconds the leg spent. `panelState` ships it as `trial`.
- `trialLine(c)` in `client/index.js` draws that line under the reads line, and
  draws nothing when there is no trial.

Three wordings are deliberate rather than incidental:

1. An undecided trial says 不能区分, never 没有差别. The trial's own sentence has
   said "not no effect" since `b6258b9`; a panel that shortens it to "no
   difference" would undo the distinction at the last step.
2. A missing cost is left out, not printed as `0.00c`. The leg's own spend is not
   in the pricing table, so a zero there would read as "reading is free" — which
   is the assumption this whole line exists to test.
3. An unstarted trial renders no line at all. An empty row reads as "we looked
   and found nothing", and no arms were assigned.

What this does not claim: that the line is legible on a 320px sidebar (the
preview fixture has no trial row yet), and nothing about the balance itself —
the four probes so far have produced ten, twelve, ten and ten rounds with no
spread, so the panel now shows a comparison that still says it cannot decide.

### 2026-11-26: six correct silences add up to nothing

The trial is assigned per campaign, which is the right unit for a loop that runs
campaigns — and the wrong unit for a question that needs sample size. Every
probe so far reported a correct "cannot distinguish" over four to six rounds an
arm:

| campaign | reading | not reading | verdict | floor it could resolve |
| --- | --- | --- | --- | --- |
| trial-live | 2 | 2 | cannot distinguish | 100 points |
| trial8-live | 4 | 4 | cannot distinguish | 99.1 points |
| trial-agg | 6 | 4 | cannot distinguish | 90.4 points |
| trial-fine | 4 | 6 | cannot distinguish | 90.4 points |
| trial-partial | 6 | 4 | cannot distinguish | 90.4 points |
| trial-var | 6 | 4 | cannot distinguish | 90.4 points |

Six correct silences, 52 assigned rounds, nothing learned — because no surface
ever added them up. `compareResearchFleet(campaigns)` now pools every campaign
that assigned an arm. On the ledger as it stands:

- 56 assigned rounds (30 reading, 26 not), reading promoted 93.3 points and not
  reading 92.3 points, delta 1.0 point.
- The pooled design resolves 37.5 points, so the difference is below what 56
  rounds can see. Not "no effect".
- Reading cost 0.92c a round and not reading 0.93c — the money axis is flat,
  because the leg's own spend is not in the pricing table.
- The leg spent 16.6s a round reading, which is the one price that *is* measured
  (`reading-costs-more`, 16.6s against 0s), and the only one a person can act on
  today.

What pooling buys and what it does not: it buys sample size, it does not buy one
experiment. The six campaigns ran different task sets, so a round in one is not
a replication of a round in another, and `compareResearchFleet` returns that
sentence as `caveat` rather than leaving it in a document. Both `rsi_dashboard`
and `panelState.fleet` print the caveat beside the number, because a pooled rate
quoted without it is a result the loop does not have.

What this does not claim: that 1.0 point is the effect (it is what 56 rounds
show, and the floor is 37.5), and nothing about whether the six task sets are
comparable at all — that question needs the same tasks under both arms in one
campaign, which is what `trial-prose` was started to do.

### 2026-11-26: a correct answer refused six times, for creating the file it was asked to create

`trial-prose` was built to answer the question six previous probes could not:
whether reading before writing changes a score. Its ten tasks ask for a design
note that satisfies twelve rules at once, so the answer is a judgement rather
than an arithmetic — and every round came back correct.

It ran fourteen rounds before it converged, and all fourteen were refused. `verifierOk: true`, `score: 1`, `beatsIncumbent: true`,
`promoted: false`, and one reason in every round:

```
oracleInBase: false
oracleCreated: ["design-note-0.md"]
earnedReason: "oracle-absent-at-base"
```

The rule that produced it is right in general: a round that creates the file
that judges it must not be promoted, because then the candidate wrote its own
verdict. The rule is asked as "did every file named by the command exist at the
base commit", and this verifier names its subject on the command line —
`node check.mjs design-note-0.md`. `check.mjs` was there at base; the note was
what the round was told to write. The gate could not tell the instrument from
the thing the instrument was pointed at, so it refused the task as posed, six
times, while reporting the round as a loss.

Two fixes, both small:

- `createdInstruments(created, oraclePaths)` keeps only created files whose
  extension is one this repository runs (`.js/.mjs/.cjs/.ts/.tsx/.jsx/.mts/.cts/.py/.sh/.bash/.ps1`).
  A `.md`, a `.txt`, a `.json`, or a bare name is the artefact, not the
  instrument. Guessing the other way — "an extensionless file might be a
  script" — would refuse every task whose verifier reads a file called `input`,
  which is the larger error.
- The base-existence question is now asked only about instruments. An artefact
  is absent at base by definition, so an unfiltered count could never be
  all-present, and `oracleInBase` read `null` on every such round even when the
  instrument had been there all along.

One of those fourteen rounds (`r7`, reading arm) also recorded `used: true` —
the second time in 66 assigned rounds that a worker named a span from the notes
as having shaped its work, and the first time it happened on a task whose
answer was not arithmetic. That number is in the ledger, not in this fix.

The spec that pins it (`a-round-that-creates-its-artefact-is-not-refused`) was
verified red without the fix — `the instrument existed at base`, `null !== true`
— and green with it, in the same run as a second case that keeps the original
protection: a round that really does create `check.mjs` is still refused.

What this does not claim: that `trial-prose` now promotes. The six refused
rounds are ledger history; the campaign was built on code that predates this
fix, and a probe that has been answered cannot be re-asked without starting a
new campaign with a new id.

### 2026-11-26: the same probe, re-asked on the fixed code

`trial-prose2` is `trial-prose` started again on `f22c985`, with the same ten
tasks, the same verifier and the same policy (`researchMode: 'trial'`). The
only thing that changed is the gate's ability to tell an instrument from an
artefact.

Ten rounds, ten promotions, every round `score: 1`, `oracleInBase: true`,
`earnedReason: red-to-green`. The fourteen refusals in `trial-prose` were
entirely the instrument/artefact confusion: same tasks, same worker, same
command shape, opposite outcome.

That also closes the last thing the trial was waiting for and leaves it where
it was: with every round at ceiling in both arms, `compareResearchArms` reports
`delta 0.0`, `mde 90.4`, `cannot-distinguish` over 6 reading and 4 not. The
endpoint is saturated, so the per-round score axis still has no spread to read
— which is a fact about the task distribution, not about reading.

What the ten rounds do measure, because both axes are computed from the same
rounds:

| axis | reading | not reading | verdict |
| --- | --- | --- | --- |
| promotions | 6/6 | 4/4 | cannot distinguish (floor 90.4 points) |
| round cost | 1.12c | 0.88c | cannot distinguish |
| leg time | 23.1s | 0s | reading costs more |

What this does not claim: that reading is useless. Three axes over ten rounds
cannot see an effect smaller than 90 points, and the only axis that separates
at this sample size is the clock — which was never in doubt.

### 2026-11-26: the leg asked the search engine to search the brief

`trial-prose2`'s ten rounds promoted, which is what the artefact fix was for.
Reading their `research` records shows a second defect that the promotions made
audible: two of the three reading rounds asked the task fallback, and the
question it built was the whole prompt.

```
"question": "what is known about this problem: Write design-note-8.md about how
much of a research report should be a quotation. Read README.md for the twelve
rules and the command. Do not modify check.mjs or README.md."
```

The engine answered exactly that: a writing-toolkit spec, a Scratch course page,
and three PDFs that 404. One round read nothing at all. The other reading round
picked up a ledger question about lesson transfer, which the task is not about
either.

`topicOf(prompt)` takes the subject instead: the clause after "about", with file
names, paths and instruction sentences removed, and a leading imperative verb
dropped. The same two prompts become

```
how much of a research report should be a quotation
```

What this does not claim: that the spans are now relevant. A subject clause is
a better query than a brief; whether the pages it returns help the note is what
`used` measures, and at two recorded uses in 76 assigned rounds it has not
measured enough of anything to say.

### 2026-11-26: the question is about the task now, and the endpoint is at the ceiling

`trial-prose3` is the prose probe a third time, on both fixes. Every reading
round now asks a question that names the task's subject instead of reciting the
brief:

```
r2 full task | "when a measurement is too noisy to justify a decision"        read 2 used false
r4 full task | "how to write a checkpoint card a person will not rubber-stamp" read 2 used false
```

That is what `topicOf` was for: no file names, no "do not modify check.mjs", no
housekeeping sentences. The engine's results got better in the sense that
matters least — the spans exist and are quotable.

Ten rounds, ten promotions, both arms at 100%. The per-round score axis is
`delta 0.0` with a floor of 90.4 points, which is to say the probe answers the
read/do question no better than `trial-prose2` did.

The fleet, now eight campaigns and 86 assigned rounds:

| axis | reading | not reading | verdict |
| --- | --- | --- | --- |
| promotions | 82.6% | 85.0% | cannot distinguish (floor 30.3) |
| round cost | 1.07c | 1.04c | cannot distinguish |
| leg time | 17.3s | 0s | reading costs more |

And the census this flushed out: of 103 rounds that recorded a `research`
record, 46 read at least one page, `used: true` appears twice, `used: false` 43
times, and 58 rounds never got an outcome at all — most of them because the
round predates the write-back, some because the leg was skipped.

What this does not claim: that reading does not help. Every probe so far has
been a task the worker can solve without help, so the arm that reads cannot
beat the arm that does not; the endpoint sits at the ceiling in both. What the
trial needs next is not more rounds of the same shape, but a task whose answer
is *not in the workspace*, so that reading has something to contribute — a
positive control for the mechanism itself.

### 2026-11-26: the loop had a library and searched the web

The complaint was exact — "你有好久没有调研了。我们内部的调研系统不是做好了吗" — and
the audit found it structural, not habitual: `src/runtime/round.js` called
`svc(runtime.ctx, 'web')` and nothing else. There was no code path by which the
reading leg could open the repository's own library.

The cost showed up in the ledger, not in an opinion. Asked "when a measurement
is too noisy to justify a decision", the public search answered with a
conference PDF, a Korean book site and three 404s (`trial-prose3` rounds 2 and
4). Four of the nine gap rounds in the 2026-11-26 audit read *nothing at all*.
And the loop had 153 structured records — abstract, verbatim mechanism quotes
with §-locators, readers' caveats — sitting in `research/out`.

`src/research/local-index.js` makes that library a search source with the shape
`runResearch` already takes, and `preferredSource` prefers it: a question the
library can answer never goes to the network, a question it cannot still does.
The round records `research.source` (`library` / `web` / `none`), so "read two
pages" and "read two pages of the repository's own library" stop being the same
sentence.

Measured in a real round (library present, no web service at all):

```
{"mode":"full","question":"how a promotion gate should use a budget of evidence",
 "from":"task","queries":1,"sources":1,"read":1,"passages":1,
 "ms":5,"costUsd":0,"used":false,"source":"library"}
```

Five milliseconds against the 17–27 seconds a web leg costs a round. The
`used: false` is honest and expected here: the probe task is solvable without
help, which is the ceiling problem the last three sections describe.

What this does not claim: that the library is a substitute for the web. It is
153 works of one research programme, searched by word overlap — a question
phrased differently from the record's own words will miss. The two are ranked,
not merged: library first, web second, and the record says which one answered.

The first version of this read `runtime.home` — `~/.dsh/loom`, which on this
install holds ledgers and leases and no `research/out` at all. A leg with no
library looks exactly like a leg that chose not to read, so the fix would have
shipped invisible. The round now looks in the campaign's workspace first and the
loom home second, and `the-round-can-read-the-library` pins the workspace case
separately from the pinned-copy case.

Plain word overlap ranked a technical report above the paper a question was
about, because the report says "model", "performance" and "evaluation" on every
page. Three rules fixed it, and all three are the kind of thing a search engine
does and a repository script has to be taught:

- **numbers are terms.** `363 machine translation systems`, `57 tasks`,
  `100 curated examples` were being split off by a four-character minimum, so
  the one token that made each question findable was dropped.
- **function words are not evidence.** "which paper reports that" matched every
  record; overlap measured abstract length rather than content.
- **a word in every record cannot outvote a word in one.** Inverse document
  frequency over the 153-record corpus, with plain overlap breaking ties first.

The identifier also moved into the page's first paragraph (`Title
(arXiv:2402.14992). abstract…`): a reader that quotes one block must get the id
with it, or the quotation cannot be checked. Six probe questions now return the
right work at rank 1, which they did not before.

### 2026-11-26: the task was asking a question and the leg answered another one

`trial-lib` is the first probe whose answers are not in the workspace: six tasks,
each one line, each asking *which paper* reports a specific number. The repository's
`research/out/work-*.json` holds the answers; nothing in the worktree does. That is
the positive control the read/do trial has been missing — for every earlier probe a
worker could finish without reading anything, so both arms sat at the ceiling.

Round 1 of `trial-lib` promoted at `score 0.1667` and the worker's own evidence says
why the mechanism works:

> The id was not available anywhere in the worktree, so I read the campaign's research
> library at `C:/Users/Darkness/.dsh/loom/research/out/`, where `work-r10-eval-budget.json`
> holds a work record with id 2402.14992 whose abstract explicitly says 100 curated
> examples suffice to estimate MMLU performance

And the leg's record for that same round:

```json
{"mode":"full","question":"Does a harness change that gains on one model family keep its gain on another?","from":"ledger","queries":1,"sources":8,"read":2,"passages":4,"gaps":[],"ms":173,"costUsd":0,"used":false,"source":"library"}
```

The worker found the answer in the library; the leg spent its budget on a different
question. Two things were true at once: the task's prompt *is* a question ("Which
paper reports that …"), and the ledger question shares the word "model" with it. The
leg's order is stuck → ledger → task, and `sharesTopic` accepted one shared word, so
the ledger kept priority on the strength of one common noun.

The fix is not a stricter `sharesTopic`. A task about summing integers and a question
about how to summarise integers share exactly one word and are about the same thing,
so raising the bar to two words would break a real case. The rule that separates them
is *who is asking*: `asksItsOwnQuestion(prompt)` looks only at the first sentence, and
when it is a question the task's own subject (`topicOf`) is the question, ahead of the
ledger. A question asked by the work in front of the worker cannot be answered by the
loop's own backlog.

What this does not claim:

- round 1's `used: false` is still not evidence that reading failed. The leg read two
  pages and quoted four passages; they were about another subject, so the worker had
  nothing to cite. The measurement of "does reading help" needs the notes to be about
  this round, and that is what this change is for — not a claim that it now is.
- the six answers are in the library already, so a round can pass without the leg
  (`score 1` on an `off` arm proves that). The trial is still comparing two ways to
  finish work a worker could also do by opening one JSON file itself.

### 2026-11-26: eight rounds on a task that needs the library, and a unit error

`trial-lib` finished: eight rounds, four per arm, every one promoted at `score 1`.
Both arms are at the ceiling again, so the trial still cannot tell reading from not
reading by score: mean score 79.2 against 100.0, delta −20.8 points, and the sample
could only resolve 58.4 points. At this spread, telling ten points apart would take
about 137 rounds per arm.

The one thing the design can still separate is the clock, and here it separates by
three orders of magnitude: the library leg reads in **157.5 ms** (173, 163, 145, 149),
the web leg took 4.8–31.1 seconds. Reading the repository's own records is not a
network round trip.

That reading also caught a unit bug in the sentence `rsi_status` prints. The time
axis was written on top of the money axis and kept money's formatter, so it printed
`reading costs 15750.00c more per round (15750.00c against 0.00c)`. The quantity is
157.5 milliseconds. It was wrong by a hundredfold in exactly the sentence
`docs/l2-state.md` cites as "the one measurable price of reading", and it would have
survived every test that checked the verdict instead of the text. The fix makes the
formatter a function of the basis (`c` for money, `s` for time, nothing for a metric
with no named unit) and a spec now asserts the sentence carries no `c` on the time
axis.

What this does not claim:

- round 1 is the only round where the read arm scored below the write arm, and it is
  also the only round whose question came from the ledger; rounds 3–8 ran on the
  plugin instance from 10:56, before `asksItsOwnQuestion` was committed at 19:41, so
  they also asked ledger questions. The fix has not been exercised by a live round yet.
- six tasks and eight rounds cannot see a ten-point difference. The campaign says
  that in its own sentence rather than pretending the arms tied.

### 2026-11-26: the leg asked the task's own question, and for the first time the note was used

`trial-lib2` re-ran the six library questions on a fresh repository after
`asksItsOwnQuestion` was committed and the plugin reloaded (12:06 instance). Every
read round now asks the task's question instead of the ledger's:

| round | arm | question source | read | used | promoted | cost |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | full | task | 2 | **true** | yes | $0.018688 |
| 2 | off | — | 0 | — | yes | $0.038090 |
| 3 | full | task | 2 | **true** | yes | $0.014038 |
| 4 | off | — | 0 | — | yes | $0.027608 |
| 5 | full | task | 2 | **true** | no | $0.048192 |
| 6 | off | — | 0 | — | no | $0.049485 |
| 7 | full | task | 2 | **true** | no | $0.022859 |
| 8 | off | — | 0 | — | no | $0.026633 |

Four read rounds, four `used: true`. Before this campaign the whole ledger held two
`true` across 63 rounds that read anything. The questions are the tasks' own
("Which paper reports that …"), and the leg found them with the library index in
145–173 ms.

The promotions are not an effect of reading. Rounds 5–8 all reported
`earnedReason: 'metric-did-not-improve'`: the campaign has six tasks, each solved
once, so after round 4 the incumbent already scored 1 and no later round could
promote in either arm. That is what produced the count axis's first non-zero delta —
"reading promoted 50 points, not reading 25" — and it is an artefact of the arm order,
not of reading. On the score axis both arms are at 100 and the campaign says so.

The count axis now drops a round whose `beatsIncumbent` is false and says how many it
dropped. Rounds written before today carry no such field; they are counted as before,
because dropping the history would not correct it.

What this does not claim:

- four `true` in one campaign is not a rate. It is the first time the measurement had
  a subject it could be about, and the six answers were already in the library, so a
  worker can also finish by opening one JSON file itself.
- the score axis still cannot separate the arms, and this campaign could not have:
  every task is solved by every round after the first pass.
- `used` is a verbatim-span match against the worker's report. A worker that cites a
  quotation to satisfy the brief and a worker that changed its answer because of one
  leave the same record.
