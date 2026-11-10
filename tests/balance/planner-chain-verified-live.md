# Live proof: the planner dispatches on the round's own chain

Recorded 2026-11-11 06:33–06:35 against commit `03a7214`.

`03a7214` changed which model the planner node runs on: it used to resolve
straight out of `config.models.worker`, so a campaign that had just demoted a
dying provider kept buying its plan from that provider. The unit spec
(`tests/balance/planner-follows-the-chain.test.mjs`, 4/4) wires a fake
dispatcher, which proves the round *asks* for the chain — it does not prove the
chain reaches a real child. Every other live campaign here ran before the commit,
so this was unverified code with a passing test, which is the exact thing this
project has already been burned by twice.

`loom-plan-chain-live` closes that gap: one trivial task in a throwaway repo
(`C:/tmp/demote-live`), two rounds, no holdout, autopilot off, and a campaign
policy naming a **different** model than the host default:

```
rsi_control {action:"policy", policy:{models:{
  worker:   "open-design/claude-haiku-5.5",
  fallback: ["open-design/deepseek-v4.1-flash"],
}}}
```

The host default at the time was `open-design/deepseek-v4.1-flash`. So if the
planner still read `config.models.worker` (unset), it would report the inherited
default; if it reads the round's chain, it must report `claude-haiku-5.5`.

## What the ledger says

| Round | node | model | ms | ok |
| --- | --- | --- | --- | --- |
| 1 | `recon` (planner) | **`open-design/claude-haiku-5.5`** | 13,459 | true |
| 1 | `r1a1` / `r1a2` | `open-design/claude-haiku-5.5` | 17,036 / 17,479 | — |
| 2 | `recon` (planner) | `null` (reused, 0 ms) | 0 | true |
| 2 | `r2a1` / `r2a2` | `open-design/claude-haiku-5.5` | 17,297 / 16,761 | — |

The planner names exactly the ref the workers name. Round 2's `null` is the
reused-plan path (no dispatch happened), which is why it names nobody — the same
convention `node.finished` already uses for a reused plan.

Rounds: both `promoted`, `planMode: "full"`, `planBudgetMs: 180000`,
`planMs` 13,783 / 67, wall 31,415 / 17,390 ms.

## What this proves and what it does not

Proves: a campaign policy naming a model changes the model the **planner** node
actually spawns on, in a real host, with a real child session — not just the
chain the round computes.

Does not prove: that demotion (rather than a policy override) reorders the
planner, because no live campaign in this ledger has yet had a ref die its last
`demoteAfter` attempts. That path is covered only by
`tests/balance/demote-dead-ref.test.mjs` (the reordering itself) and the unit
spec above (the planner reading the reordered chain). Manufacturing a live
provider outage to see it would cost an unattended run and prove what the two
specs already pin; recorded here as the one gap rather than claimed as closed.

## Housekeeping

* Campaign stopped after its two rounds; `switch.json` untouched.
* The throwaway workspace is outside the repo, so no promotion could dirty the
  tree this change was committed from.
