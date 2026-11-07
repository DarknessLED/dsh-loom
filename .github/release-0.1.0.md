First public release. dsh-loom runs an auditable self-improvement loop for DeepSeek Harness: one objective plus a budget becomes a work chain that iterates in child sessions, while the main agent stays idle and only wakes for real decisions.

## What is in it

- **Campaigns, chains, rounds.** `rsi_start` → `rsi_evalset` → `rsi_chain` → `rsi_control`. Each round dispatches several candidates, verifies them mechanically, scores them, and promotes at most one patch onto the worktree.
- **Evidence, not vibes.** A patch lands only when the verifier, the tests-untouched check, the per-task gain bar and (where reserved) the holdout all agree. Attempts that never landed are never counted as solved.
- **Honest recovery.** A restart withdraws landings it cannot prove (`autopilot.applied{committed:false}`), repairs only the files the patch created, and rebuilds state from the append-only log instead of a cached view.
- **Failure taxonomy.** `died` / `timeout` / `token` / `context` / `exhausted` / `crash`, with model fallback on quota-class failures and one smaller-brief retry when compaction blew the context window.
- **Adversarial suite.** 11 chaos specs (dead child sessions, drifting ledgers, stale views, panel degradation, unreachable gates) run in CI alongside 38 suites.
- **Master switch.** `rsi_control {action:"enable"|"disable"}` stops dispatching without touching campaign history; `rsi_run` spends exactly one round on demand.
- **Sidebar panel.** Chinese copy, a per-campaign tree (round → candidates, checkpoints, live attempt, lessons), and two mechanically verifiable gates: `npm run panel:preview` and `npm run panel:audit` (headless Chrome: overflow, hairline count, WCAG contrast).

## Install

```
dsh plugin --profile desktop add DarknessLED/dsh-loom
```

Or as a bundle: add `dsh-loom` to the profile's `dsh.profile.bundles`.

Requires DSH `>=0.2.0-rc.2 <0.3.0-0` and Node `^22.19 || >=24`.

## Verified

`node scripts/test-all.mjs` → 38/38 suites · `node scripts/e2e.mjs` → all M1–M3 checks · `node scripts/verify.mjs` → 110 assertions. CI runs the same three gates on Windows.
