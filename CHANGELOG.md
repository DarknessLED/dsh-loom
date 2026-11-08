# Changelog

All notable changes to `dsh-loom`. The loop wrote most of these itself: each
entry below started as a spec that failed, went through an RSI campaign, and
was promoted only after the guard suite passed.

## [0.2.0] — 2026-11-09

### Measured, not guessed

- `round.finished` now carries `durationMs, planMs, attemptMs, attemptWindowMs,
  verifierRuns, verifierMs, holdoutMs, holdoutRuns, tokens, costUsd,
  priceSource, planMode, candidateMode, candidateModeSource, candidatesPlanned,
  skippedCandidates, abortedCandidates, secondCandidate`.
- `verifier.finished` exists (it never did), and now records `reused: true` with
  `durationMs: 0` when a verdict was inherited instead of recomputed.
- `campaignTriangle(rounds)` answers efficiency / quality / cost from the log
  alone, and returns **null** for a leg nobody measured — "no data" and "free"
  are different claims. The panel, the report and `scripts/loom-metrics.mjs`
  all read the same numbers.

### Cheaper rounds — found by the loop

- **Verifier reuse**: an identical patch on the same base command reuses the
  verdict (`93–145 s → 0 ms`), and the key includes the base commit, so a
  different base never inherits an old pass.
- **Plan reuse by delta**: a round whose plan-named files did not move reuses
  the previous plan (`plan 276 s → 0 ms`).
- **`planTimeoutMs`** (default 240 s) bounds the planner separately from
  attempts, and a timed-out plan no longer kills the round.
- **`planMode: 'off' | 'full' | 'auto'`**: `auto` stops buying a planner only
  when two rounds in a row both timed out **and won** — a timeout on a losing
  round proves nothing.
- **`candidateMode: 'parallel' | 'cascade'`** plus adaptive cascade from the
  loop's own history, and early abort: the first candidate to score 1.0 stops
  its sibling mid-flight (`abortedCandidates` counts it).
- **`admitSecondCandidate`**: the second opinion is only bought when
  `p(1−p)·roundMs` beats the tail it costs; the triangle reports how often it
  was refused (`hedge.refusedShare`).

### Honest money

- `DEFAULT_PRICING` prices tokens, so `costUsd` is a number instead of a
  constant 0 (still an estimate: child-session events carry no usage).
- `budget.tokens` works like `budget.usd`, with a preflight that refuses to
  dispatch when the projected cost crosses the cap, and a `budget` checkpoint
  when it happens.

### Evidence that cannot be faked

- Verdicts are bound to the base commit; a stale pass cannot be inherited.
- Holdout rounds are **rotated** (one per round) and partitioned by pool hash,
  so "we swapped the examiner" is an auditable fact, not a silent one.
- Node identity: `node.started` / `node.finished` are folded into
  `state.nodes`; nodes still running when a round ends fold as `lost`.
- A landing that was recorded but never committed is rolled back honestly on
  restart (`round.unlanded`), and user dirt that the loop did not create is
  left alone.
- A round whose child session died is `interrupted` (retryable), never
  `no-gain`.

### Operations

- **Campaign-carried policy**: `rsi_control {action:"policy"}` records one
  `campaign.policy` event; the next round obeys it and a reopen reads it back
  off the log. A/B-ing loop policy no longer needs a restart.
- **`rsi_run`**: run exactly one round by hand, switch on or off.
- **Master switch**: `rsi_control {action:"enable"|"disable"}` writes
  `switch.json` + an audit line and touches **no** campaign history.
- **Provider death recovery**: a child session that ends in error with no
  diagnostic, instantly, rebuilds the parent agent and retries once.
- Snooze (`hold`) really holds; quiet hours defer and flush; setup questions
  are raised once, not once per tick; checkpoint ids are unique per millisecond.
- **`rsi_start` can take the whole set-up**: pass `tasks` (and `holdout`) and
  `auto:true`, and one call registers the eval set, activates the template
  chain, arms autopilot and starts. Without `auto` it deliberately stops at
  `planning` so a human can read the chain first; a task without a verifier is
  refused by name before anything is written.
- **`doctor({workspace, home, runtime, config})`** answers "is this machine set
  up?": git repo, clean worktree, node version, writable home, loop ownership.
  A check that throws becomes a failed check with the error text — the report is
  most useful exactly when things are broken.

### Panel

- All Chinese copy, a real campaign **tree** (rounds → candidates, checkpoints,
  knowledge), failure-first branches, metric priority, a node time band, the
  loop policy actually in force, cost honesty (`未定价`), error and empty
  states that say what to do, keyboard access with visible focus, collapsed
  rows with a two-column grid that uses the width it has.
- `scripts/panel-preview.mjs` renders the real component to `docs/panel-preview.html`;
  `scripts/panel-audit.mjs` measures it in headless Chrome (contrast against the
  composited canvas, overflow, **clipping**, column counts) and fails on
  anything it can prove.

### Meta

- 99 suites, 131 spec files, 130+ commits since 0.1.0 — and four incidents where
  **the spec was wrong, not the code**. They are documented, and
  `scripts/spec-reachability.mjs` now checks a spec three ways: it must fail on
  HEAD, pass with a reference patch, and fail again once that patch is removed.

## [0.1.0] — 2026-11-07

First public release: campaigns as event-sourced logs, gates with holdout
checks, knowledge lessons with exposure control, Lean 4 gate, chain specs,
panel, tools.
