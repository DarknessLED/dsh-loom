# Live proof: the planner now reads its own clock

Recorded 2026-11-11 05:47-05:50 against commit `79211f7`.

The brief rule landed in `07474c0` but had **never run in a live round** — every
campaign before it started earlier, so the fix was unverified code with a
passing unit test. A campaign was built to close that gap (`loom-brief-live`,
one trivial task, no holdout, autopilot off), and the round was read back at
three levels.

## What the planner was told

From the planner child's own session log
(`~/.dsh/sessions/--C-Projects-RSI--/7dcf7eb2-a987-4fc3-a3ba-37d484b2f0b2/session.v4.jsonl.zstd`,
record `agent/inbox/spliced`):

```
... \\loom-brief-live\\recon-recon. Do not read or write outside it.
3. This is a reconnaissance pass: inspect the repository and report. Do not change any file.
You have 180 s (about 3 minutes) of wall clock, enforced by the runner: it stops
you the moment that runs out and nothing you found reaches the next agent. Work
outwards from what the task actually needs, and when the budget gets short, write
up what you already know instead of starting another investigation.
```

## What changed in the outcome

| Round | planner | planMs | planUsable | round wall | promoted |
| --- | --- | --- | --- | --- | --- |
| 1 | `ok:true`, 70,939 ms, `completed` | 71,237 | **true** | 115,753 | yes |
| 2 | `ok:true` (reused, 0 ms) | 75 | true | 27,381 | yes |

Before this, the same planner on this repo burned its full 180 s and returned an
empty summary on **85 of 132** planned rounds (64%), while still costing ~24% of
the wall clock. Here it finished in 71 s, `planUsable: true`, and round 2 reused
the plan outright for 75 ms.

## Two things this also proved end to end

* `attempt.deadline{timeoutMs: 780000}` is now recorded per attempt, so the
  worker budget in the brief and the number the runner enforces are the same
  number, written down.
* The plan-reuse path (`node.finished{reused:true, planBasis:...}`) fires on
  round 2 in a live campaign, not just in a fixture.

The campaign was rejected at its gate on purpose: the workspace was a throwaway
(`C:/tmp/brief-live`) built only to observe the brief. Nothing from it belongs in
the repo, and rejecting leaves the audit trail rather than deleting it.

# Live proof: the fallback chain actually moves

Recorded 2026-11-11 05:55-05:59 against commit `3ddc4b5`, campaign
`loom-fallover-live` (throwaway workspace `C:/tmp/brief-live`).

The chain had been configurable for a week and **had never once moved**: across
436 attempts in the ledger, `modelsTried.length > 1` appeared zero times. Every
test of the fallback injected the chain directly into `Dispatcher.run`, so
nothing proved the campaign-level policy reaches the dispatcher, that a broken
first ref is classified as unusable rather than as a failed task, or that the
second ref really runs on its own provider.

The campaign named a model that cannot exist as the worker and the real one as
its fallback:

```
rsi_control {action:"policy", id:"loom-fallover-live",
  policy:{models:{worker:"open-design/no-such-model-at-all",
                  fallback:["open-design/deepseek-v4.1-flash"]}}}
```

All four attempts behaved the same way:

| attempt | modelsTried | ran on | failureKind |
| --- | --- | --- | --- |
| r1a1 | `[no-such-model, deepseek-v4.1-flash]` | fallback | `died` (first ref) |
| r1a2 | same | fallback | `ok`, `verifierOk: true` |
| r2a1 | same | fallback | `ok`, `verifierOk: true` |
| r2a2 | same | fallback | `died` |

`modelSwitch: {from: "open-design/no-such-model-at-all",
to: "open-design/deepseek-v4.1-flash"}` is on every record, and both rounds were
promoted. After this run the ledger reads **4 of 440 attempts with more than one
model tried** — all four from this campaign, which is the point: the fact is now
observable rather than assumed.

Round 2's planner finished in **0 ms with `reused: true`**, the plan-delta path
working in a third live campaign.
