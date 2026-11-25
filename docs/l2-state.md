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
- `research-on-stuck` has `evidence: ['no-round-yet']`: the kind is in the menu
  before it has a campaign behind it. Its prediction is a prior, and the card
  says so.
- The whole leg is skipped, and the round proceeds, when the host has no web
  service. A campaign with no research is still a campaign; that is deliberate,
  and it also means a silent web outage looks like a thorough loop.
