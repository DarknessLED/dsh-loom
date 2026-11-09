# dsh-loom 0.2.1 — provider failures, honestly handled

_2026-11-10_

## What this release is

0.2.0 was about measuring the loop. 0.2.1 is about the thing that was actually
stopping it: when the model layer broke mid-turn, the loop could not tell the
difference between "the task is hard" and "the provider is not there", and it
spent the budget as if it were the former.

Live evidence, from this release's own campaigns:

- `loom-acc3`: 13 rounds, 11 of them dead in ~1.1 s with
  `child session ended in error with no diagnostic`. Cause, read out of the
  child's own session log: `MALFORMED_RESPONSE — Tool call "read": Unexpected
  non-whitespace character after JSON at position 121` (two tool-call JSON
  objects glued together by the provider).
- `loom-acc2`: rounds 11–18 dead for the same reason — and invisible to plateau
  detection, to `bestPriorScore`, and to the triangle.
- `loom-acc5`: six interrupted rounds in a row, and the "pause after three"
  rule never fired because the running instance was older than the fix.
- Planning: `46 of 117 rounds (39%)` paid for a planner and got nothing back.
  The triangle had only been counting timeouts, so the silent failures never
  appeared in any number.

## Install

```bash
dsh plugin --profile desktop add dsh-loom
# or, from a checkout:
dsh plugin --profile desktop add C:/path/to/dsh-loom
```

Then restart the app once (the loader assembles bundles at startup). The panel
appears in the sidebar as `RSI`; the twelve `rsi_*` tools appear in the tool
list. `rsi_doctor` answers "is this machine set up?".

## What changed

### The loop can now tell a broken provider from a hard task

| Behaviour | Before | Now |
| --- | --- | --- |
| Child dies with no diagnostic, 15–30 s in | retried only if it died in <3 s | retried once, at any duration |
| Second attempt of the same campaign | no retry left (budget was per dispatcher) | every attempt gets its own retry |
| Why it died | `no diagnostic (parent or provider unavailable)` | the child's own `turn/end` message, e.g. `MALFORMED_RESPONSE …` |
| Round where nothing ran | `no-gain`, counted as evidence, fed plateau | `interrupted` + `retryable`, excluded from evidence and plateau |
| Fallback to another model | same provider, silently | `provider/model` entries are dispatched to the provider that hosts them |
| Three broken rounds in a row | keep spending | campaign pauses with one `infrastructure` checkpoint |
| Changing provider | edit the profile, restart the app | `campaign.policy.models = {worker, fallback}` |

### Work that was already finished is no longer thrown away

Two live rounds had candidates stopped by the deadline whose worktrees already
passed the verifier; the loop discarded **1,203 s** of correct work. A stopped
attempt that left a passing tree is now promoted and labelled `salvaged`.
Separately, `git worktree prune` was deleting a sibling candidate's
registration while it was being written (`failed to read
.git/worktrees/r1a1/commondir`), killing the second candidate in 228 ms; cleanup
now deletes only registrations it can prove stale.

### The planner stops being an unexamined expense

`planning.usable / failed / failedRate` on the triangle, `round.finished.planUsable`
on every round, a learned `planBudgetMs`, and a panel chip that says "规划 32% ·
超时 4 · 空手 9". Measured on our own log: 39% of planner rounds returned nothing.

### Panel and tools

- One dot can no longer mean running / waiting / finished / not-started at once;
  a folded row always says something.
- The preview generator keeps `aria-*`/`role`/`tabindex`, so `panel-audit` can
  finally fail on the keyboard contract (the artifact used to ship with
  `aria=0, role=0, tabindex=0`), and it now fails on **clipping** as well as
  overflow — 320px had three buttons outside the visible area.
- `rsi_doctor` exposes the preflight the plugin already had, per failing check
  plus the command that clears it.
- The standing suite list had three duplicate entries and two packed lines: the
  headline count was inflated and those suites ran twice.

### The suite now means the same thing on a clean checkout

CI was red for four runs at 110/114, for three reasons that had nothing to do
with the loop: eleven fixtures used `cmd: 'true'` (a POSIX builtin `cmd.exe`
does not have — it *passed* on runners because Git's `usr/bin` is on `PATH`
there, and failed here), the committed-preview pin compared raw bytes so a CRLF
checkout looked stale, and the worktree check compared path substrings while a
runner hands out the 8.3 name (`C:\Users\RUNNER~1\…`) and git writes the long
one. All three are fixed, and `tests/tools/portable-fixtures.test.mjs` fails the
build if a fixture ever names a POSIX builtin as its whole verifier command
again.

## Numbers

| | 0.2.0 | 0.2.1 |
| --- | --- | --- |
| Suites in `scripts/test-all.mjs` | 99 | **115** |
| Spec files | 131 | **153** |
| `scripts/verify.mjs` | 110/110 | **115/115** |
| CI (windows-latest) | green at 0.2.0 | green again — see above |
| Panel audit | OK (ARIA invisible) | OK (ARIA + clipping checked) |

## What this still does not do

- **Wall clock per promotion is still 533–1880 s**, against roughly 220 s for a
  public reference on a different task mix. Planning is 17–44% of a round and
  has never been shown to pay for itself on hard tasks.
- **The dollar axis is degenerate** ($0.0006–0.0032 per round): the provider
  does not report token usage, so prices come from a default table. Treat every
  dollar figure as an estimate, not a bill.
- **Cost is not measured, it is estimated.** `priceSource: 'default'` is the
  honest label; a campaign with `pricing` configured says `config`.
- **A provider that returns malformed tool-call JSON is not something the loop
  can fix** — it can only notice, name it, retry once, fall over to another
  provider, and stop before the budget is gone.

## Upgrading

```bash
dsh plugin --profile desktop add dsh-loom        # pulls 0.2.1
# restart the app
```

Campaign logs are forward-compatible: 0.2.1 adds event fields
(`planUsable`, `infra`, `salvaged`, `salvagedCandidates`, `planBudgetMs`) and
reads older logs without them (an absent field is "unknown", never zero).
