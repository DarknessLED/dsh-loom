# L2 decision ledger

Every entry was decided by `research/ab/decide.mjs` against the five rules
pre-registered in `README.md` before the arms ran. The decision names the
measurement that failed, not the rule number, so a reader can re-run the
measurement instead of re-reading the rules.

Reproduce either entry with:

```bash
node research/ab/chain-ab.mjs --base=<arm> --cand=<arm> --minTasks=4
node research/ab/decide.mjs --base=<arm> --cand=<arm>
node research/ab/planner-cost.mjs <arm> [<arm>...]
```

## 2026-11-14 — adopt: drop the planner leg (`ab-cand1b` → `ab-cand2b`)

**What was replaced.** The `recon` node: an agent that inspects the repository
and writes a plan before the `map` over candidates. The candidate chain is
otherwise identical (two parallel candidates, mechanical verifier, human gate).

**Measured on** four mutation tasks × four rounds, same HEAD (`68d2a41`), same
20-mutant sample per task, patches not applied:

| task | base (v1) | candidate (no planner) |
|---|---|---|
| `mut-runtime-triangle` | 0.95 | 0.95 |
| `mut-runtime-cost` | 0.85 | 0.85 |
| `mut-runtime-candidates` | 0.75 | 0.75 |
| `mut-dispatch-brief` | 0.85 | 0.85 |

- **rule 1 (no regression the sample can see)** pass — worst dip 0.000.
- **rule 2 (graded endpoint better)** FAIL — the endpoint did not move at all,
  which is a statement about the endpoint, not evidence the arms are equal.
- **rule 3 (budget)** pass — tokens 14,486 → 15,428 (1.07×), round ms
  572,217 → 494,632 (**0.86×**).
- **rule 4 (non-statistical saving)** pass — planner **4 runs / 580 s = 25.3%**
  of 2,289 s round clock, 145 s per round, candidate arm 0 runs / 0 s.
- **rule 5 (not a distinguishable regression)** pass.

**Why it is adoptable despite rule 2 failing.** Rule 4 exists for exactly this
shape: the score cannot rank the arms, and one arm is cheaper by a quantity that
needs no statistics — a clock reading of 9.66 minutes across four rounds. The
adoption claim is therefore *narrow*: "removing the planner does not cost score
on these four tasks, and saves a quarter of the round clock." It is not "the
planner is useless". The ledger's own planner record says otherwise: of the 249
rounds, `planUsable` was recorded on 42 and true on 24 (57%).

**Known defect in the rule set.** With n=4 the paired half-interval is 0.049, so
a single 0.05 dip on one task flips rule 1 from pass to fail. The verdict moves
with sample size, not with the effect. The honest scale is per-task uncertainty
(a task measured once has none), so rule 1 should not be able to fire on a
one-round-per-task design at all. Left as written for this pair because it did
not fire; the next pair must fix it before it can reject anything.

## 2026-11-14 — hold: one candidate instead of two (`ab-cand2b` → `ab-cand3b`)

> **This entry was first written as `reject:regression`. It is a hold.** The dip
> that decided it reproduces on the baseline arm with no change at all — see
> "Why the first verdict was wrong" below. The text of the original decision is
> kept, then corrected, because the correction is the more useful record.

**What would be replaced.** The second parallel candidate: the candidate chain
buys one attempt per round instead of two.

| task | base | candidate |
|---|---|---|
| `mut-runtime-triangle` | 0.95 | 0.95 |
| `mut-runtime-cost` | 0.85 | **0.75** |
| `mut-runtime-candidates` | 0.75 | 0.75 |
| `mut-dispatch-brief` | 0.85 | 0.85 |

- **rule 1** pass *after* the repeat spread is known — worst dip **0.100** on
  `mut-runtime-cost`, and the same configuration moves that task by **0.100** on
  its own (four runs: `0.85 / 0.85 / 0.75 / 0.75`). A dip at the spread is not
  attributable to the change.
- **rule 2** FAIL — mean −0.025, interval [−0.074, 0.024], MDE 0.070.
- **rule 3** pass — tokens 15,428 → 7,933 (**0.51×**), round ms 494,632 →
  330,320 (**0.67×**).
- **rule 4** FAIL — planner 0 → 0, no non-statistical saving to weigh.
- **rule 5** pass — not a distinguishable regression.

**Verdict: `hold:not-distinguishable`.** The candidate is not shown to be worse,
and its saving — half the tokens, a third less round clock — is real but is a
saving rule 4 does not price (it counts planner minutes, and there are none on
either side). Under the pre-registered rules a hold is the honest label: neither
"adopt" nor "reject" is supported. Adoption would be a bet on a saving whose
downside this sample cannot exclude; rejection would be a claim that the change
hurt, which the sample never established.

**Why the first verdict was wrong.** `decide.mjs` compared the 0.100 dip against
the *resolution of the sample* (MDE 0.070, half-interval 0.049) and fired. It
never asked whether the same configuration moves the endpoint by that much on
its own. It does: `loom-v2check` — the v2 chain, no candidate change, the same
task — measured **0.75** where the A/B base arm measured **0.85**. That is the
same number the candidate produced, so the "regression" is a property of the
worker draw, not of the chain.

**What measured it.** `research/ab/noise.mjs` reads runs already recorded rather
than launching a new campaign, because a fresh repeat campaign cannot answer
this: the earlier campaign's promotions moved HEAD, so each new round found the
base already at the candidate's number and reported `no-gain` (that is exactly
what `loom-noise` did for four rounds before it was stopped). The recorded runs
share a tree and a chain and differ only in the worker draw:

| task | runs | values | spread |
|---|---|---|---|
| `mut-runtime-cost` | 4 | 0.85 / 0.85 / 0.75 / 0.75 | **0.100** |
| `mut-runtime-triangle` | 4 | 0.95 × 4 | 0.000 |
| `mut-runtime-candidates` | 4 | 0.75 × 4 | 0.000 |
| `mut-dispatch-brief` | 3 | 0.85 × 3 | 0.000 |

Pooled sd **0.029**. One task in four is unstable, and it is the task that
decided the verdict — which is the general lesson: a four-task paired design has
a resolution set by the least stable task, not by the MDE formula.

**What would change the verdict.** A saving that rule 4 can price (planner
minutes, round clock spent outside attempts), or a larger sample in which
`mut-runtime-cost` stops moving. A cascade variant — second attempt only when the
first fails, `exp-slot-004` measured 2.52 arms per success against 3.36 for
always-two — is a different candidate and needs its own pair.

## 2026-11-14 — reject: three candidates instead of two (`ab-cand1b` → `ab-cand4`)

**What would be replaced.** The two-candidate map: the candidate chain buys three
attempts per round instead of two. This is the tempting variant — more draws,
same tasks — and it is the one the rules were written to refuse.

| task | base | candidate |
|---|---|---|
| `mut-runtime-triangle` | 0.95 | 0.95 |
| `mut-runtime-cost` | 0.85 | **0.75** |
| `mut-runtime-candidates` | 0.75 | 0.75 |
| `mut-dispatch-brief` | 0.85 | 0.85 |

- **rule 1** pass — worst dip 0.100 on `mut-runtime-cost`, equal to the arm's own
  repeat spread, so not attributable.
- **rule 2** FAIL — mean −0.025, interval [−0.074, 0.024]; the sample cannot
  distinguish a difference below **0.070**.
- **rule 3** FAIL — tokens 14,486 → **30,254 (2.09×)**, round clock 572,217 →
  **827,189 ms (1.45×)**.
- **rule 4** FAIL — planner 9.66 → 9.74 min, nothing disappeared.
- **rule 5** pass — not a distinguishable regression.

**Verdict: `reject:budget-mismatch`.** The third candidate doubles the tokens for
an endpoint that did not move, and the pre-registered rule refuses a candidate
that outspends its base whatever its endpoint. This is the one rejection where
the cost is not a matter of statistics: 2.09× tokens is read off the ledger.

**Why this base and not `ab-cand2b`.** `ab-cand2b` has `planMode:'off'` while
`ab-cand4` ran chain v1 with the planner, so `ab-cand2b → ab-cand4` changes two
things at once — it also reads `reject:budget-mismatch` (tokens 1.96×, round ms
1.67×, plus 9.74 min of planner that the base did not spend), and it is recorded
in `decision-ab-cand2b-vs-ab-cand4.json`, but it is not used as the decision
because it cannot say which change caused what. The clean pair is
`ab-cand1b → ab-cand4`: same chain, same planner, same tree, only the candidate
count differs.

**What this settles.** Buying a third draw per round is not a way to raise the
endpoint on this corpus; it is a 2× token tax. Combined with `a2-rescue-shape`
(a second candidate has never beaten a first candidate that already passed, and
rescued 28 of 239 rounds), the candidate count is a lever with a price and no
measured gain.
