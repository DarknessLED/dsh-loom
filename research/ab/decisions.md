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

## 2026-11-14 — reject: one candidate instead of two (`ab-cand2b` → `ab-cand3b`)

**What was replaced.** The second parallel candidate: the candidate chain buys
one attempt per round instead of two.

| task | base | candidate |
|---|---|---|
| `mut-runtime-triangle` | 0.95 | 0.95 |
| `mut-runtime-cost` | 0.85 | **0.75** |
| `mut-runtime-candidates` | 0.75 | 0.75 |
| `mut-dispatch-brief` | 0.85 | 0.85 |

- **rule 1** FAIL — worst dip **0.100** on `mut-runtime-cost` vs half-interval
  0.049.
- **rule 2** FAIL — mean −0.025, interval [−0.074, 0.024], MDE 0.070.
- **rule 3** pass — tokens 15,428 → 7,933 (**0.51×**), round ms 494,632 →
  330,320 (**0.67×**).
- **rule 4** FAIL — planner 0 → 0, no non-statistical saving to weigh.
- **rule 5** pass — not a *distinguishable* regression.

**Why it is rejected anyway.** Rule 1 is the pre-registered screen for "one task
got worse by more than this sample can resolve", and it fired. The candidate is
much cheaper (half the tokens, a third less round clock) and that is exactly the
temptation rule 1 exists to resist: a saving measured against a dip you cannot
rule out is not a saving, it is a bet. The ledger supports the reading rather
than contradicting it — the second candidate has never won a score against a
first candidate that already passed (0/120 rounds) and has rescued 28/239 rounds
where the first failed. Removing it removes the rescues.

**What would change the verdict.** A larger sample where the cost dip does not
reproduce, or a variant that keeps a second attempt only when the first fails
(cascade), which `exp-slot-004` measured at 2.52 arms per success against 3.36
for always-two. That is a different candidate and needs its own pair.
