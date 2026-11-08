# dsh-loom 0.2.0

A human-in-the-loop RSI harness for DeepSeek Harness: you hand it a task, it
builds the loop, and the loop improves itself — one spec at a time, with a
guard suite standing between it and the repository.

```bash
dsh plugin --profile desktop add dsh-loom
# or, in ~/.dsh/profiles/desktop/package.json:
#   "dependencies": { "dsh-loom": "file:C:/path/to/dsh-loom" }
```

## What changed since 0.1.0

**The loop can now say what it cost.** Every round reports wall clock split into
planning / attempts / verification / holdout, plus tokens and USD. The triangle
(`efficiency × quality × cost`) is computed from the log alone, and a leg nobody
measured is `null` — not `0`. `scripts/loom-metrics.mjs` prints the same numbers
the panel shows.

**The loop found and paid for its own waste.** Verifier verdicts are reused for
byte-identical patches on the same base (93–145 s → 0 ms); a plan is reused when
its named files did not move (276 s → 0 ms); the planner is bounded by
`planTimeoutMs` and can be switched off with `planMode: 'auto'` once two rounds
in a row timed out *and won*; the second candidate is only bought when its
expected value beats its tail; and the first candidate to score 1.0 aborts its
sibling mid-flight.

**Evidence is harder to fake.** Verdicts are bound to the base commit. Holdout
rounds are rotated and partitioned by pool hash. A landing recorded but never
committed is rolled back on restart, while dirt the loop did not create is left
alone. A round whose child session died is `interrupted`, never `no-gain`.

**You can change the loop without restarting it.** `rsi_control {action:"policy"}`
records a `campaign.policy` event and the next round obeys it. `rsi_run` runs one
round by hand, switch on or off. `rsi_control {action:"disable"}` stops dispatch
and leaves every campaign's history byte-identical.

**The panel is usable.** All Chinese copy, a campaign tree (rounds → candidates,
checkpoints, knowledge), failure-first branches, the loop policy actually in
force, honest `未定价` costs, keyboard access with visible focus, and a layout
that folds rows and uses the width it has. Two scripts make that claim testable
rather than aesthetic: `panel-preview` renders the real component,
`panel-audit` measures it (contrast against the composited canvas, overflow,
clipping, column counts) and exits non-zero on anything it can prove.

## Numbers

| | |
|---|---|
| suites | 97 (all green, plus e2e and verify) |
| spec files | 126 |
| src modules | 56 |
| commits since 0.1.0 | 118 |
| campaigns run by the loop itself | 50+ |
| wall clock per promoted change | 420–1 060 s before; 651 s with `planMode:'off'` (plan 0 %) |
| verifier share of a round | 5–14 % |
| cost per round | ~$0.0008–0.003 (estimated) |

## What it still cannot do

- **Cost is estimated, not metered.** DSH child-session events carry no token
  usage, so tokens are counted from brief+reply characters and priced with
  `DEFAULT_PRICING`. `$0` still means "unpriced", and the panel says so.
- **Planning still takes 17–44 % of a round** when it is on, and sometimes times
  out at 240 s — the round survives, but you paid for it.
- **Parallel factor is ~1.0.** Candidates are launched together but the loop is
  still dominated by one long model call.
- **The panel is a sidebar**, not a full workspace: no history graph, no
  cross-campaign comparison view yet.

## Upgrading

```
version 0.1.0 → 0.2.0 · engines.dsh >=0.2.0-rc.2 <0.3.0-0
```

No config changes are required. New optional keys: `loopPolicy.planMode`,
`loopPolicy.candidateMode`, `loopPolicy.secondCandidate`, `session.planTimeoutMs`,
`models.fallback`, `budget.tokens`.
