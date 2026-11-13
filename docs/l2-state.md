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

## What this does not claim

- Kill rate is a property of a test suite and a mutation operator, not of the code
  being correct. A high number means the suite notices one-token changes; it says
  nothing about behaviour nobody wrote a mutant for.
- The four tasks in the A/B are the ones with headroom, chosen before the run. They
  are not a random sample of the corpus, and one of them is the least stable.
- A hold is not evidence of equality. It is the statement that this sample cannot
  tell, with the number it cannot resolve.
