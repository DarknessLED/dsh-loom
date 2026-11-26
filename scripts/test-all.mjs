#!/usr/bin/env node
// Runs the regression suite (unit tests + host-verify) and exits non-zero on the
// first failure. Used as the dsh-loom autopilot guard: a promotion that breaks
// any of these is rolled back instead of being left in the workspace.
//
// Deliberately excludes tests/self*/ — those are the specs a campaign is still
// trying to satisfy, so they are expected to fail while the loop works.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { guardReport, retryPlan } from './guard-retry.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const testsDir = join(root, 'tests')
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
  .map((f) => join(testsDir, f))
// Specs that pin behaviour the loop already has: they are not tasks, but they
// must keep passing, so a promotion cannot quietly remove the guard.
// Adversarial specs live in their own directory: they model failures (dead
// children, drifting ledgers, restarts) rather than features.
const chaosDir = join(testsDir, 'chaos')
for (const f of readdirSync(chaosDir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  files.push(join(chaosDir, f))
}
const standing = [
  'tests/self10/panel-decide.test.mjs',
  // a worktree is a checkout of tracked files, and node_modules is never tracked:
  // three rounds of loom-ui7 died on a holdout failure that was really a verifier
  // measuring a tree with no dependencies.
  'tests/exec/worktree-deps.test.mjs',
  // a task that says `node` must reach a node, even under an Electron host
  'tests/exec/node-is-on-path.test.mjs',
  // a fact the runner knows must be in the brief, not discovered by the worker
  'tests/shell-is-stated.test.mjs',
  // and the link it makes must never end up inside a patch: a repo that does not
  // ignore node_modules would otherwise promote its own dependency tree.
  'tests/exec/patch-skips-deps.test.mjs',
  // the planner was stopped by a clock it was never told about: 85 of 132 planned
  // rounds came back empty while burning 24% of the wall clock.
  'tests/dispatch/brief-states-budget.test.mjs',
  'tests/balance/brief-states-deadline.test.mjs',
  // once a self-improvement campaign lands, its spec becomes a regression pin:
  // the loop must not be able to un-solve a task it already solved.
  'tests/self11/spend-estimate.test.mjs',
  'tests/self11/docs-coverage.test.mjs',
  // self15: the six things the loop could not do. Each one was red in the tree
  // when the campaign bought it, so keeping them here is what stops a later
  // round from quietly removing the guard it took fourteen rounds to earn.
  'tests/self15/billing.test.mjs',
  'tests/self15/billing-from-ledger.test.mjs',
  'tests/self15/checkpoints.test.mjs',
  'tests/self15/decisions.test.mjs',
  'tests/self15/verdict.test.mjs',
  'tests/self15/chain-dag.test.mjs',
  'tests/self15/promotion-noise.test.mjs',
  // the panel owes the reader the same answer the ledger holds: one decision
  // at a time, and a verdict on a campaign that stopped.
  'tests/self15/panel-one-row.test.mjs',
  'tests/self15/panel-end.test.mjs',
  // self20: a DAG that runs by dependency, rounds that file their own outcome,
  // cost broken down per node, the checkpoint backlog migration, the measured
  // noise bar, guard routing, the promotion lock and the rollback sweep.
  'tests/self20/dag-parallel.test.mjs',
  'tests/self20/round-honesty.test.mjs',
  'tests/self20/round-cost.test.mjs',
  'tests/self20/ledger-migrate.test.mjs',
  'tests/self20/gate-noise.test.mjs',
  'tests/self20/guard-routing.test.mjs',
  'tests/self20/promotion-lock.test.mjs',
  'tests/self20/rollback-clean.test.mjs',
  // a guard that fails on a flake costs a round: p5-wire round 3 was rolled back
  // for tests/tri9/early-abort.test.mjs passing alone seconds later.
  'tests/self20/guard-retry.test.mjs',
  // p6-route: the panel route finally answered a real request (GET 200 from the
  // host port, not a proxy 404), the budget now says what it can afford, and the
  // gate reads a graded score when the verifier prints one.
  'tests/self20/panel-route.test.mjs',
  'tests/self20/budget-funding.test.mjs',
  'tests/self20/killrate-score.test.mjs',
  'tests/self20/guard-env.test.mjs',
  // L2 proposes with evidence now; the halving schedule that spends the money
  // is pinned too, so a cheaper screen cannot quietly become a smaller sample.
  'tests/self20/chain-evidence.test.mjs',
  'tests/self20/halving.test.mjs',
  // the plugin must never be the reason a request cannot be sent: an unbounded
  // stdout tail once turned a session into an 18 MB payload no upstream accepts.
  'tests/self21/payload-budget.test.mjs',
  // self22: L2 autonomy closed the loop. A plateau now arrives as a proposal
  // card with a forecast, a risk and the exact diff; one approve adopts it and
  // the next round measures whether the forecast materialised. A kill rate the
  // verifier printed is the score of a live round, not just of a library call.
  'tests/self22/predict.test.mjs',
  'tests/self22/l2-card.test.mjs',
  'tests/self22/l2-plateau.test.mjs',
  'tests/self22/l2-adopt-measure.test.mjs',
  'tests/self22/killrate-attempt.test.mjs',
  'tests/self22/halving-round.test.mjs',
  // self23: the money and the arithmetic. A screen has a model budget and must
  // answer with a verdict; only the best-ranked survivor is bought, serially, so
  // an early win actually saves money. A failed verifier keeps its kill rate as
  // progress without pretending to be promotable, every forecast is graded into
  // the decisions ledger, the extra-candidate forecast is probability-weighted,
  // and a stall checkpoint says which of burn / near-miss / flat caused it.
  'tests/self23/screen-budget.test.mjs',
  'tests/self23/sequential-screened.test.mjs',
  'tests/self23/progress-split.test.mjs',
  'tests/self23/calibration.test.mjs',
  'tests/self23/estimator.test.mjs',
  'tests/self23/stall-signals.test.mjs',
  // self23/card-calibration: a prior-based forecast must carry the record of
  // the priors before it, or the interval reads as knowledge it has not earned.
  'tests/self23/card-calibration.test.mjs',
  // self23/burn-default: the burn trigger must be reachable without hand-tuning,
  // or every expensive stall reads as an ordinary one.
  'tests/self23/burn-default.test.mjs',
  // self2/plateau: the predicate the stall card is built on. It lived outside the
  // standing list (tests/self* is skipped by the directory scan) and drifted red;
  // pinned now so "ask once per window" cannot rot unnoticed again.
  'tests/self2/plateau.test.mjs',
  // self24/cross-domain: advice only when the scope matches; a shared difficulty
  // shape across domains is inspiration, not an instruction; offline dream merges
  // duplicates and turns a contradiction into a question.
  'tests/self24/cross-domain.test.mjs',
  // self25/procedure-transfer: a lesson with a `notWhen` stays out of the brief
  // it warns about; a procedure that crossed domains is shown as a hypothesis
  // and logged; twenty showings decide keep or drop by paired wins, not opinion.
  'tests/self25/procedure-transfer.test.mjs',
  // self26/procedure-induction: two verified promotions on one subject earn a
  // procedure; one is an anecdote; a failure on that subject becomes a notWhen.
  'tests/self26/procedure-induction.test.mjs',
  // self27/knowledge-integration: real rounds, not just units — round 2's
  // promotion becomes round 3's procedure, once, in the store and the brief.
  'tests/self27/knowledge-integration.test.mjs',
  // self28/procedure-tightening: after the T2 replay cut 57 -> 2, the rule is
  // pinned where it got stricter: independent tasks, at least two steps.
  'tests/self28/procedure-tightening.test.mjs',
  // self28/family-fallback: the eval set never names a family, so an id-
  // addressed task still routes the lesson its global record calls family=tiny.
  'tests/self28/family-fallback.test.mjs',
  // self29/second-candidate-policy: T3 needed to buy a control candidate on
  // purpose; the preference is now a validated campaign policy, not config-only.
  'tests/self29/second-candidate-policy.test.mjs',
  // self30/noop-needs-full-pass: T3 promoted an empty diff that exited 0 but
  // only half-passed; 'already satisfied' now needs the whole verifier.
  'tests/self30/noop-needs-full-pass.test.mjs',
  // self31/verify-hidden: a task may hide its verifier command, so the brief
  // stops naming the file a candidate could probe or edit.
  'tests/self31/verify-hidden.test.mjs',
  // self32/prune-trial: T3 lost its lesson at showing 5 because the old
  // "never useful" rule fired mid-trial; an open trial is retired by its
  // verdict, not by a rule written before trials existed.
  'tests/self32/prune-trial.test.mjs',
  // self33/trial-persist: the trial counter must outlive the campaign that
  // earned it, or every new campaign borrows a fresh 0/20 and the measurement
  // never concludes. T3 spent two budgets discovering that.
  'tests/self33/trial-persist.test.mjs',
  // The hardening pass: verifier closure, one approval path for both doors, a
  // gate matrix, an atomic store, a named cap crossing, measured funding, and
  // the three specs that keep unrun self specs from rotting unnoticed.
  'tests/self34/verifier-closure.test.mjs',
  'tests/self34/decision-parity.test.mjs',
  'tests/self34/gate-matrix.test.mjs',
  'tests/self35/ledger-money.test.mjs',
  'tests/self36/calibration-basis.test.mjs',
  'tests/self36/shape-stats.test.mjs',
  'tests/self37/spec-index.test.mjs',
  'tests/self37/portable-paths.test.mjs',
  'tests/self37/reduce-perf.test.mjs',
  // self38/trial-summary: T3's 5 showings were 4 ties, but the status view
  // counted only wins and losses. One shared summary now names the verdict.
  'tests/self38/trial-summary.test.mjs',
  // A patch that rewrites a file without changing it is a review fact, and a
  // 300-char tail is not wide enough to carry the node ids a grader prints.
  'tests/self39/churn-digest.test.mjs',
  // The channel from a failed round to the next brief, pinned end to end:
  // a digest that keeps the wrong lines fails silently and costs a round.
  'tests/self40/failure-channel.test.mjs',
    // The checker the protocol points at: a session that reports without running it is guessing.
    'tests/self41/live-report.test.mjs',
  // A promotion that swapped the subject for a better-scoring one passed every
  // threshold and the checker said "ok": the landing is judged against the scope
  // the task declared, and an undeclared scope is said out loud instead of
  // hidden behind protocol: ok.
  'tests/self42/subject-scope.test.mjs',
  // A promotion the loop cannot commit is not a promotion: three fin-strategy
  // campaigns lost every landing to a missing git identity and the ledger said
  // only `{commit:null}`. loom now signs its own commits and says why when one fails.
  'tests/self43/commit-identity.test.mjs',
  // fin-oneyear1 lost five attempts and $0.16 because a session waiting on
  // its own six-minute command looks exactly like a wedged one: same frozen
  // event watermark. Liveness now reads the tool call too, and the brief says
  // to run a long command in the background while the wall clock still runs.
  'tests/self44/watchdog-waiting.test.mjs',
  'tests/self44/brief-long-command.test.mjs',
  // A research note is evidence only if it says how deeply it was read and
  // where every claim sits: the 3DGS paper-reader's five rules, made checkable.
  'tests/self45/research-note.test.mjs',
  // The ledger's timestamps are numbers; a Date.parse() of a number is NaN, which
  // silently disabled the candidate pricer, the panel's age field and the
  // duration fallback. These two pin the clock and the pricer that now reads it.
  'tests/self46/clock-units.test.mjs',
  'tests/self46/hedge-clock.test.mjs',
  // Research moved inside the plugin: plan, read, snapshot, check, seal, and
  // the question ledger that outlives the conversation. The tool is the door,
  // so it has its own spec as well as the modules behind it.
  'tests/self47/research-plan.test.mjs',
  'tests/self47/research-fetch.test.mjs',
  'tests/self47/research-ledger.test.mjs',
  'tests/self47/research-questions.test.mjs',
  'tests/self47/research-sink.test.mjs',
  'tests/self47/research-run.test.mjs',
  'tests/self47/research-tool.test.mjs',
  'tests/self47/research-replay.test.mjs',
  // L2 surveys a direction by following citations, not only search ranks: the
  // bibliography parses, and the search page keeps its authors and dates.
  'tests/self48/citegraph.test.mjs',
  'tests/self48/survey-parse.test.mjs',
  // The survey driver reads arXiv's two HTML shapes; the doc generator is what
  // turns its counts into a page a person reads. Both are scrapers/generators,
  // so both need a spec that fails when the output stops matching the input.
  'tests/self48/research-doc.test.mjs',
  // Reading a paper's own bibliography is the mirror of following citations
  // outward, and it broke in six different ways while it was being written:
  // initials mistaken for entry starts, entries without ids eating their
  // neighbours, a month-and-year ending a proceedings entry, publisher
  // tailers heading the next entry, LaTeX-escaped titles, and two works
  // sharing a surname and year. Each one is asserted here.
  'tests/self49/cites.test.mjs',
  // Reading the body, not the abstract, is what the depth checker demands:
  // every claim gets a locator, a passage comes back verbatim, and a paper
  // with no body is reported as unread rather than as a paper that said
  // nothing. The script spec pins the judgements made around it.
  'tests/self50/deepread.test.mjs',
  'tests/self50/deepread-script.test.mjs',
  // A forecast that was refused is still a forecast: the decline is recorded
  // with its baseline, the next round grades it against the chain that stayed
  // in force, and adopted/refused forecasts are counted apart.
  'tests/self51/declined-forecast.test.mjs',
  'tests/self51/foundations.test.mjs',
  // A paper's HTML can be the wrong paper: arXiv serves a PDF pointer for
  // some ids, some front matter is swallowed into one <title>, and a
  // bibliography can cite the wrong id for a work it names. The reading
  // therefore carries the title it expected and refuses to file anything
  // that does not match it.
  'tests/self51/deep-identity.test.mjs',
  'tests/self51/deep-expect.test.mjs',
  // Reading forty-two papers a direction instead of eight is a fetch job: the
  // prefetcher must not re-download a body, must not remember a PDF pointer as
  // a body, must retry a 429 and must not retry a 404. The synthesis is the
  // other half -- a work several directions cite is a fact about agents, and a
  // work one direction cites is a fact about that direction.
  'tests/self52/prefetch.test.mjs',
  'tests/self52/synthesis.test.mjs',
  // The synthesis document is generated, so the flag that decides which
  // surveys it reads has to work: a parsed-and-ignored flag yields a
  // document that is about the wrong corpus and looks fine.
  'tests/self52/synthesis-script.test.mjs',
  // A bibliography entry's year is read off an entry, not off whatever
  // four-digit number appears last: a page range, an ISSN, a bracketed
  // arXiv id and an access date all won that race, and 1.3% of cited works
  // got an impossible year. The fix is one exported helper used everywhere.
  'tests/self53/bibliography-year.test.mjs',
  // A deposit that leaves its claims without a verdict cannot reach the loop:
  // forty-one of the tenth direction's claims sat that way and sink refused
  // every one of them. The bytes are in hand at deposit time, so that is when
  // they get checked -- and what came back is reported, not dropped.
  'tests/self53/deposit-verifies.test.mjs',
  'tests/self53/paired-e-process.test.mjs',
  'tests/self53/promotion-uses-paired-test.test.mjs',
  'tests/self53/gate-can-defer.test.mjs',
  'tests/self53/one-promotion-rule.test.mjs',
  // A pair needs both sides read by the same instrument; the base cache used to
  // store only task-declared metrics, so every pair had a blank side.
  'tests/self53/base-is-read-the-same-way.test.mjs',
  // The pair only counts if the round actually hands it over: real round, real
  // verifier, candidate above and below its base.
  'tests/self53/a-round-writes-down-its-pair.test.mjs',
  // A lesson the loop watched and a sentence a paper wrote are not the same
  // kind of evidence; the brief now says which is which, and the store's old
  // records get an origin from what they can prove.
  'tests/self53/lessons-say-where-they-came-from.test.mjs',
  'tests/self53/knowledge-origin-migration.test.mjs',
  // A screen that drops candidates and keeps their budget is a prefilter, not
  // successive halving; and a proxy whose ranking the verifier never confirms
  // turns itself off instead of being paid for.
  'tests/self53/halving-returns-what-it-saved.test.mjs',
  'tests/self53/fidelity-check-can-stop-halving.test.mjs',
  'tests/self53/a-round-records-its-halving.test.mjs',
  // A held-back task that cannot say how much it measured is a checkbox wearing
  // a second opinion's clothes.
  'tests/self53/holdout-is-a-second-reading.test.mjs',
  // A menu that keeps offering the same kind is not a search, and a version is
  // filed by what it did rather than by which fields it edited.
  'tests/self53/proposal-kinds-can-collapse.test.mjs',
  'tests/self53/versions-are-filed-by-behaviour.test.mjs',
  // A majority is not a verdict, and the retirement rules now actually run.
  'tests/self53/a-lesson-that-lost-its-trial-is-retired.test.mjs',
  // The six-task bar was a wall for every campaign with fewer than six tasks.
  'tests/self53/a-threshold-follows-the-pool.test.mjs',
  // A follow-up round is bought on measured marginal coverage, not a constant.
  'tests/self53/a-followup-round-can-be-the-third.test.mjs',
  // A reading that could quote almost nothing is not a structural reading.
  'tests/self53/a-thin-reading-is-marked.test.mjs',
  // A verifier that reads a fixture is only as honest as the fixture.
  'tests/self53/the-fixture-is-apparatus-too.test.mjs',
  // The gate card a person refuses is now a decision with a cost, and a sealed
  // report says which claims each paragraph rests on instead of keeping that
  // link in a table at the bottom. Both were 'measured' before as zero.
  'tests/self53/declined-gate-is-measured.test.mjs',
  'tests/self53/report-renders-its-claim-links.test.mjs',
  'tests/self53/seal-counts-unsupported-paragraphs.test.mjs',
  // The host has no per-child capability field, so the rule lives on the tool
  // pipeline: a task that never says `exec: true` gets no shell under the
  // `declared` policy, the refusal is on the attempt record, and `allow` (the
  // default) delegates everything exactly as before.
  'tests/self53/a-child-without-exec-has-no-shell.test.mjs',
  // A survey page is an index of what a field cites; it is not something an
  // agent can query for one work's starting point, its pipeline and its
  // mechanisms, and the mechanism quotes may not be shorter than 200 characters
  // or the page is a bullet list pretending to be a reading.
  'tests/self54/workrecord.test.mjs',
  'tests/self54/workview.test.mjs',
  'tests/self54/research-work.test.mjs',
  // Which chapter counts as the method, and how many of its points survive: a
  // named method before the results chapter, not the 334-paragraph evaluation.
  'tests/self54/method-chapters-before-results.test.mjs',
  // The year and the title when the body never states them: abs page, cached, and
  // only fields that were unknown -- an unknown year stays null, never 0.
  'tests/self54/a-year-the-body-never-said.test.mjs',
  // The library gets a door: a read-only prefix route, the panel section that
  // reads it, a figure URL that is not a 404, and the abstract walker that was
  // cutting every abstract at its first highlighted word.
  'tests/self55/research-route.test.mjs',
  'tests/self55/research-index.test.mjs',
  'tests/self55/figure-url.test.mjs',
  'tests/self55/panel-research-section.test.mjs',
  'tests/self55/abstract-not-cut-at-a-highlight.test.mjs',
  'tests/self55/a-record-has-its-abstract.test.mjs',
  'tests/self55/a-pdf-pointer-is-not-a-record.test.mjs',
  // A technical report or a benchmark is an instrument, not a missed cluster:
  // the leftover bucket says which of the two it is.
  'tests/self55/apparatus-is-not-unclustered.test.mjs',
  // An RSI round that screens candidates down and keeps the money is a prefilter;
  // `halving.returnToSurvivors` hands the freed share back, priced per survivor.
  'tests/self56/a-round-hands-back-what-it-saved.test.mjs',
  // A lesson the loop derived said nothing about where it stops, so the brief
  // printed it as if it held everywhere; the boundary now travels with it.
  'tests/self56/a-lesson-says-where-it-stops.test.mjs',
  // A round that measured nothing and a round that measured a tie used to land
  // as the same "no discordant pairs": 470 of 483 rounds had a silent base side.
  // The gate now names the pair it formed, the tie it measured, and the side it
  // was missing, and every gate.evaluated says how many pairs it contributed.
  'tests/self56/a-round-says-why-it-had-no-pair.test.mjs',
  // The sequential e-process may drive the promotion, but only when the install
  // asks for it: off is the shipped state, and the spec proves both directions.
  'tests/self56/the-sequential-rule-can-decide.test.mjs',
  // A task whose objective is changing the gate could never promote: the oracle
  // check refused the very edit the task asked for. `verify.owns` releases the
  // apparatus the task declares, and the gate records what it released.
  'tests/self56/an-owned-file-is-not-a-cheat.test.mjs',
  // A run the harness killed is not a verdict on the code: the guard names it
  // as killed, retries it out of the same budget, and when the retries are all
  // killed it says the code was never judged instead of reporting a failure.
  'tests/self56/a-killed-run-is-not-a-failing-one.test.mjs',
  // "470 of 483 rounds had no paired outcome" came from a throwaway script, so
  // nobody could re-derive it. scripts/pair-audit.mjs rebuilds the pairing from
  // the ledger with the gate's own `pairAgainstBase`/`commitDecision`, names a
  // ledger that predates the fields as unmeasured, and never writes to the home.
  'tests/self56/a-pair-audit-can-be-rerun.test.mjs',
  // A round whose owning process went away is not a round still running: the
  // ledger keeps saying `running` while `inflight` is rebuilt empty on boot, so
  // the campaign is stuck behind "already has a round in flight" forever. The
  // release must free that round, write `round.abandoned`, and refuse to touch a
  // round whose child is still being watched.
  'tests/self56/an-orphaned-round-can-be-released.test.mjs',
  'tests/self56/the-release-reaches-the-runtime.test.mjs',
  // The release lived after `tick`'s early return on the master switch, so an
  // operator who turned the loop off while a round was going stale parked the
  // campaign until a human asked for one round. Reconciliation now runs before
  // the switch is consulted; the switch still starts nothing.
  'tests/self56/recovery-runs-with-the-switch-off.test.mjs',
  // An activation is not a forecast: every campaign opens by activating the
  // chain it proposed, and grading that as a forecast made 59 of 62
  // `chain.measured` events read as a prediction that came true.
  'tests/self56/a-forecast-that-was-never-made-is-not-graded.test.mjs',
  // 26 of 267 promotions in the ledger were empty landings, and only the
  // artifact said so; the round now carries the flag it already computed.
  'tests/self56/a-noop-landing-says-so.test.mjs',
  // A task whose deliverable is a spec plus its pin must edit tests/ (scope)
  // and scripts/test-all.mjs (owns); judging one against the other refused
  // the round with violations naming the very path the oracle had released.
  'tests/self56/an-owned-path-is-inside-the-scope.test.mjs',
  'tests/self56/a-scope-plus-owns-lands.test.mjs',
  // A round a person stopped measured nothing about the task; nine rounds in
  // this ledger closed as `no-gain` with `score: 0` after the verifier had
  // been skipped, and plateau detection read them as flat.
  'tests/self56/a-stopped-round-is-not-a-flat-round.test.mjs',
  // The loop now reads before it writes: a research leg that asks one question,
  // quotes what it found, and is skipped when the last round already landed. The
  // balance (off | full | auto) is a policy field, and the menu can propose it.
  'tests/self57/research-mode-is-a-policy.test.mjs',
  'tests/self57/when-to-read-and-when-to-work.test.mjs',
  'tests/self57/what-the-leg-asks-and-quotes.test.mjs',
  'tests/self57/the-round-reads-before-it-writes.test.mjs',
  'tests/self57/the-balance-is-in-the-menu.test.mjs',
  'tests/self57/a-question-from-a-round-reaches-the-ledger.test.mjs',
  // The leg could say a round read and never say whether the worker used what
  // it read, so `researchModeFor`'s "a win that did not read is not evidence for
  // reading" branch was unreachable. The measurement is now written back.
  'tests/self57/what-the-worker-reached-for.test.mjs',
  'tests/self57/the-round-writes-back-whether-it-was-used.test.mjs',
  // The leg records rounds-read, pages-back and used/unused and nothing showed
  // them; the panel now ships `reads` and the card prints one line of it.
  'tests/self57/the-panel-can-see-the-reads.test.mjs',
  // Both live rounds asked the same oldest ledger question, and nothing
  // would have stopped a third; the leg now skips what it already asked.
  'tests/self57/the-question-rotates.test.mjs',
  // The reflection half of the ReAct step: a question this loop has read
  // repeatedly without ever acting on is parked, and the round says so.
  'tests/self57/the-round-parks-a-question-it-cannot-use.test.mjs',
  // A question that has been read several times and never acted on is a
  // statement about the reader, so it is parked with its count, not closed.
  'tests/self57/a-question-that-never-helps-is-parked.test.mjs',
  // The rule above needs three reads and could only see this campaign's one, and
  // it kept a question alive on a promotion while every quote was ignored. On the
  // real ledger it parked 15 of 16 at bar 1 and 6 at bar 2; nothing at bar 3.
  'tests/self57/a-question-is-parked-on-evidence-not-on-luck.test.mjs',
  // The ledger had seventeen open questions and one of them was read thirteen
  // times across seven campaigns: a read now counts against the question, and
  // the leg prefers the ones nobody has touched.
  'tests/self57/a-question-is-a-queue-not-a-loop.test.mjs',
  'tests/self57/the-ledger-hears-about-the-read.test.mjs',
  // The measure of `used` only works if the worker is told that citing a note is
  // part of the report: eighteen rounds carried a research record and `used`
  // never once came back true.
  'tests/self57/the-brief-asks-whether-the-notes-helped.test.mjs',
  // A PDF is a slot spent on something the text pipeline answers with 404:
  // nine rounds that bought a read ended on a fetch gap and four read nothing.
  'tests/self57/a-pdf-is-a-slot-that-reads-nothing.test.mjs',
  // The read/do balance as a measurement instead of a rule: a randomised arm
  // assigned before the round, and the comparison that reads the arms back.
  'tests/self57/the-balance-is-measured-not-ruled.test.mjs',
  'tests/self57/the-trial-reaches-the-round.test.mjs',
  // A comparison nobody can see is a comparison nobody corrects: the trial has
  // to survive the compact view and the single-campaign status path, or the
  // number only exists in the ledger.
  'tests/self57/the-status-shows-the-trial.test.mjs',
  // Two ways the trial was quietly not a trial: a floor computed from twice the
  // sample it had, and a cap that cancelled an assigned read.
  'tests/self57/the-mde-is-per-arm-not-per-campaign.test.mjs',
  'tests/self57/an-assigned-read-is-not-capped.test.mjs',
  // Counting promotions needs hundreds of rounds; where the verifier printed a
  // rate, every round carries a number. The finer reading must be reported, and
  // a 0/1 score must not be averaged as if it were one.
  'tests/self57/a-continuous-reading-beats-a-coin-flip.test.mjs',
  // `research.timeoutMs` and `research.maxRounds` were documented in the config
  // and read by nothing; the leg now has a clock and an allowance.
  'tests/self57/the-leg-has-a-clock.test.mjs',
  // The leg's record stopped at the event: `rsi_status` showed three rounds with
  // no `research` field while the events had it, so the mode rule saw "never read".
  'tests/self57/what-a-round-carries-back.test.mjs',
  // The real path is the fold, not `projectRound`: `views/state.json` had no
  // `research` on either round while both events carried it.
  'tests/self57/what-the-fold-keeps.test.mjs',
  'tests/self/lessons-preview.test.mjs',
  'tests/self/quiet-hours.test.mjs',
  'tests/self/report-lessons.test.mjs',
  // Legacy self specs: green but never listed, so no run would have told
  // anyone if they stopped passing. All are listed now; the five that were
  // red against today's gate semantics were rewritten to start from a base
  // that actually fails, which is what promotion now requires.
  'tests/self10/quality-dashboard.test.mjs',
  'tests/self10/quality-report.test.mjs',
  'tests/self12/export-bundle.test.mjs',
  'tests/self12/review-queue.test.mjs',
  'tests/self13/digest.test.mjs',
  'tests/self13/panel-reviews.test.mjs',
  'tests/self14/parallel-candidates.test.mjs',
  'tests/self2/deferred.test.mjs',
  'tests/self2/sampling.test.mjs',
  'tests/self20/model-fallback.test.mjs',
  'tests/self20/panel-models.test.mjs',
  'tests/self20/second-candidate.test.mjs',
  'tests/self3/exposure.test.mjs',
  'tests/self3/policydiff.test.mjs',
  'tests/self3/roundtable.test.mjs',
  'tests/self3/spend.test.mjs',
  'tests/self4/auto-finish.test.mjs',
  'tests/self4/deferred-delivery.test.mjs',
  'tests/self4/plateau-checkpoint.test.mjs',
  'tests/self5/checkpoint-ids.test.mjs',
  'tests/self5/holdout-gate.test.mjs',
  'tests/self5/no-test-edits.test.mjs',
  'tests/self6/attention-batch.test.mjs',
  'tests/self6/meter-usage.test.mjs',
  'tests/self6/usd-budget.test.mjs',
  'tests/self7/chain-nodes.test.mjs',
  'tests/self8/human-node.test.mjs',
  'tests/self8/verifier-node.test.mjs',
  'tests/self9/committer-guard.test.mjs',
  'tests/self9/holdout-report.test.mjs',
  'tests/self9/plateau-mutation.test.mjs',
  // self20/p5: the three decisions p4 wrote are now called by the planner, the
  // dispatcher and the verifier -- a library function nobody calls is a comment.
  'tests/self20/hedge-wiring.test.mjs',
  'tests/self20/model-wiring.test.mjs',
  'tests/self20/killrate-metrics.test.mjs',
  // the guard runs with the app's PATH, which has no Git on it: twelve suites
  // died with `spawnSync git ENOENT` and two p6 promotions were rolled back.
  // the chain got cheaper and the loop has to stay that way: no second candidate
  // once the first one solves the task, and planning counted as its own leg.
  'tests/tri3/cascade.test.mjs',
  'tests/tri3/plan-share.test.mjs',
  // the adversarial specs the loop solved are pins too: an unreachable gate or a
  // panel that 500s must not come back.
  'tests/chaos2/panel-degrade.test.mjs',
  'tests/chaos2/exhausted-round.test.mjs',
  'tests/chaos3/stuck-gate.test.mjs',
  // recovery is idempotent: running it twice must repair once and then do nothing
  'tests/chaos2/recover-idempotent.test.mjs',
  // the master switch must never move campaign history
  'tests/switch/switch.test.mjs',
  // a graded task's verdict is its metric, not its exit code: loom-graded's
  // verifier prints QUALITY=<n> and exits 0 in every state, so an exit-code
  // oracle read a 0.500 -> 1.000 climb as three rounds of no work.
  'tests/self6/graded-earned.test.mjs',
  // and a cache entry that predates the metric must be re-measured, or the same
  // blind spot returns on exactly the machines that already ran the campaign.
  'tests/self6/baseline-cache-version.test.mjs',
  // and the oracle that metric comes from must not be inside the candidate's write
  // scope: loom-graded2's instrument is check.mjs at the repo root, outside tests/,
  // so a candidate that rewrote it to print QUALITY=1.000 promoted (exp e51).
  'tests/oracle-scope.test.mjs',
  // and the rule holds where it matters -- driven through a real round, one
  // candidate rewriting the instrument and one fixing the code it measures.
  'tests/oracle-gate.test.mjs',
  // and the instrument can be *created* rather than edited: the existence filter in
  // oracleScripts makes the pre-patch set empty, so the base run failed because the
  // script was missing -- a red base that looks like a bug fixed (e70 found this on
  // 75 landings, all by habit rather than check).
  // a verified attempt that changed nothing is not a patch: 14 rounds promoted an
  // empty diff and the apply step then failed with 'No valid patches in input'.
  'tests/noop-landing.test.mjs',
  // a task that delivers test coverage needs the gate to allow exactly the
  // declared file and nothing else: the rule was about self-measurement, not
  // about the tests directory.
  'tests/balance/scope-round.test.mjs',
  // and when a decision does reach a person, it arrives with the four facts:
  // which task, what the diff does, what the verifier said, what could break.
  'tests/balance/card-evidence.test.mjs',
  'tests/oracle-creation.test.mjs',
  // and the hedge is priced by its actual tail: with two candidates the old
  // reference was the slowest attempt, so 53 of 53 priceable campaigns read
  // tailMs = 0 and the gate could only say yes (e73).
  'tests/balance/second-candidate-tail.test.mjs',
  // a promotion commits the paths its patch touched and nothing else: the old
  // `git add -A` swept a mutant left behind by a killed sweep into a commit, and
  // would have swept a human's in-progress edit the same way.
  'tests/commit-paths.test.mjs',
  'tests/l2-requires-human.test.mjs',
  // and a graded task's evidence is the number, not the exit code: a red base that
  // never produced a number is unmeasured, and 2026-11-13 promoted a round on it.
  'tests/graded-requires-metric.test.mjs',
  // and the policy a campaign is told to use must be the policy it runs: a bare
  // {candidates:1} override was written to the event log and never read, so arm C
  // bought two attempts while its own state said one.
  'tests/policy-bare-override.test.mjs',
  // and the proposer reads what the loop already knows: on 2026-11-14 it offered
  // `candidates+1` two days after the A/B had rejected it, and `no-test-edits` to
  // tasks whose deliverable is a test edit.
  'tests/chain-propose-guard.test.mjs',
  // and planning is off until asked for: the workbench toggle and rsi_control plan
  // write one value, and the planner node stays in the template so it can come back.
  'tests/plan-default.test.mjs',

  // a contradiction that can only be listed is a museum: it is decided, the
  // decision is kept as evidence, and it survives a pack/unpack and a merge.
  'tests/kg-resolve.test.mjs',
  'tests/kg-merge-resolution.test.mjs',

  // the loop control is a switch, and the money is labelled truthfully
  'tests/ui/a11y.test.mjs',
  'tests/ui/cost-honest.test.mjs',
  // the triangle's first two solved specs: a second candidate with a
  // byte-identical patch must not re-spawn the verifier, and a round the budget
  // cannot afford must not be dispatched.
  'tests/tri/verifier-reuse.test.mjs',
  'tests/tri2/recon-reuse.test.mjs',
  'tests/tri2/guard-reuse.test.mjs',
  'tests/tri/budget-preflight.test.mjs',
  // evidence has to be scoped to what it measured: a verdict belongs to the
  // commit it ran on, tokens are priced or said to be unpriced, and a plan that
  // no longer covers a changed file is not reused.
  'tests/tri4/verifier-key.test.mjs',
  'tests/tri4/cost-truth.test.mjs',
  'tests/tri4/plan-delta.test.mjs',
  // a standing problem is one question, not one per tick
  'tests/setup/no-workspace-spam.test.mjs',
  // the queue tells you how long it has waited, and a hit is reachable by keyboard
  'tests/ui/pending-queue.test.mjs',
  'tests/ui/keyboard-hit.test.mjs',
  // a checkpoint row says what happened and what ignoring it costs, in its
  // own line and in the row's title, not only on hover
  'tests/ui/checkpoint-help.test.mjs',
  // a lesson learned before lessons carried `files` still lands under the file
  // its attempt changed: one residual bucket holding 84% of the corpus is not
  // a tree, and the ledger already knew the answer.
  'tests/panel-lesson-subject.test.mjs',
  // and the corpus is filed, not just readable: a claim is its first sentence,
  // grouped under the file it is about, with a named bucket for the few that
  // name nothing.
  'tests/knowledge/a-lesson-is-about-a-file.test.mjs',
  // the claim the tree keeps is written by the worker, not carved out of its why
  'tests/knowledge/the-worker-states-the-claim.test.mjs',
  // 暂缓 must postpone in both doors, and a token budget must be a cap
  'tests/ui/snooze.test.mjs',
  'tests/tri8/token-cap.test.mjs',
  // a one-shot winner must stop the siblings it made redundant
  'tests/tri9/early-abort.test.mjs',
  // the queue says how many are waiting and where each risk came from, and a
  // sparkline tells an unscored round apart from one that scored zero
  'tests/ui/queue-total.test.mjs',
  'tests/ui/spark-baseline.test.mjs',
  // colours come from one palette, and parallelism is measured against the
  // window candidates actually had
  'tests/ui/tones.test.mjs',
  'tests/tri5/plan-aware.test.mjs',
  // the holdout gate is timed instead of being charged to the candidates
  'tests/tri6/attempt-window.test.mjs',
  'tests/tri6/holdout-split.test.mjs',
  // the campaign reads its own record to decide whether a second opinion pays
  // (the checkpoint help it landed with is pinned above, next to its own comment)
  'tests/tri7/adaptive-cascade.test.mjs',
  // a failed read explains itself instead of printing a raw error, a live
  'tests/ui/error-state.test.mjs',
  'tests/tri10/status-compact.test.mjs',
  'tests/tri11/plan-timeout.test.mjs',
  'tests/tri11/holdout-rotation.test.mjs',
  'tests/tri13/plan-model.test.mjs',
  // knowledge is read the same way in every place that shows it, and an approval
  // names the round it lands - a checkpoint that knows only its artifact path (an
  // anomaly raised while applying a promotion) must not strand the round as open:
  'tests/ui/knowledge-single-source.test.mjs',
  'tests/landing-target.test.mjs',
  // a plan node has an identity, and a node whose round ends unfinished is lost -
  // once a promotion lands this it must not be able to delete the guard:
  'tests/dag1/node-identity.test.mjs',
  // which holdout a round tests is a function of ids, and the ledger says which
  // partition ran from which pool:
  'tests/dag4/holdout-partition.test.mjs',
  // a child that dies in a second saying nothing is a broken parent, not a failed
  // task: rebuild once, retry, and never record a null reason:
  'tests/lifecycle/dispatch-recovery.test.mjs',
  // the panel shows node attribution: newest round first, capped, Chinese labels:
  'tests/ui/node-attribution.test.mjs',
  // a round whose attempts all died to a plugin re-apply is interrupted, not a
  // measured zero:
  'tests/lifecycle/dispose-recovery.test.mjs',
  // the second candidate is an option priced by its tail, and the panel draws the
  // round as one band instead of five chips:
  'tests/balance/second-candidate.test.mjs',
  'tests/balance/second-candidate-gate.test.mjs',
  'tests/ui/node-band.test.mjs',
  'tests/ui/node-band-render.test.mjs',
  // the planner can be switched off per policy and says which mode it ran in, and
  // a narrow sidebar keeps only the three cells that carry the answer:
  'tests/balance/plan-mode.test.mjs',
  'tests/setup/one-call-start.test.mjs',
  'tests/preflight/doctor.test.mjs',
  'tests/balance/holdout-noop.test.mjs',
  // the no-op holdout gate has a third case: a candidate that verified with no
  // captured diff but reports it changed files still gets the second opinion -
  // claiming work makes the gate stricter, and the direction was pinned after a
  // reading of mine had it backwards:
  'tests/balance/holdout-claim.test.mjs',
  // silence is not a statement: a worker that emits no parsable report must not
  // get the holdout gate skipped for it, and the legacy no-op fixture turns out to
  // have been exercising exactly that path (its report never validated):
  'tests/balance/holdout-silent.test.mjs',
  'tests/defaults/opinionated.test.mjs',
  'tests/dag2/deadline.test.mjs',
  'tests/balance/late-success.test.mjs',
  'tests/balance/hedge-stats.test.mjs',
  'tests/ui/policy-visible.test.mjs',
  'tests/balance/plan-mode-evidence.test.mjs',
  'tests/ui/metrics-priority.test.mjs',
  // a campaign can carry its own policy, and a stuck round explains itself first:
  'tests/balance/policy-override.test.mjs',
  'tests/balance/policy-model.test.mjs',
  'tests/balance/policy-models-set.test.mjs',
  'tests/ui/tree-fail-first.test.mjs',
  // a policy override needs a writer, not just a reader:
  'tests/balance/policy-set.test.mjs',
  // the preflight the plugin already had is now reachable as a tool, and the
  // planner's own numbers are reported before anyone argues about it:
  'tests/tools/doctor-tool.test.mjs',
  // the guard's own arithmetic: one spec, one run, one line
  'tests/tools/standing-list.test.mjs',
  // the planner is a leg of the triangle, not a footnote: its wall time, its
  // timeouts and its win rate are reported before anyone argues about it
  'tests/balance/planning-accounting.test.mjs',
  // and its deadline is learned from what its own record says it bought
  'tests/balance/plan-budget.test.mjs',
  // silence is silence at any duration: a turn that ended with no reason is not a
  // verdict on the task, and the attempt it destroys costs ten minutes of wall clock
  'tests/lifecycle/silent-slow-error.test.mjs',
  // the retry budget belongs to the attempt, not to the dispatcher
  'tests/lifecycle/retry-budget.test.mjs',
  'tests/lifecycle/silent-diagnosis.test.mjs',
  'tests/lifecycle/model-provider.test.mjs',
  // a model that spent its whole slice without answering is unusable, not a
  // verdict: loom-acc6 lost twelve 600 s attempts, five of which had a patch
  'tests/lifecycle/timeout-fallover.test.mjs',
  // a child runs on the session that spawned it: loom-acc6 reported one model in
  // the attempt record and billed another provider entirely
  'tests/lifecycle/model-inherit.test.mjs',
  // the parent rebuild fired 32 times and converted silence zero times: with a
  // chain to fall over to, a silent death goes there instead of re-asking
  'tests/lifecycle/no-blind-retry.test.mjs',
  // a provider outage is not a verdict on the task
  'tests/lifecycle/infra-round.test.mjs',
  // a broken provider falls over to the next model
  'tests/lifecycle/infra-model-fallback.test.mjs',
  // a run of infrastructure rounds pauses the loop instead of eating the budget
  'tests/lifecycle/infra-pause.test.mjs',
  // a stopped attempt whose tree already verifies is salvaged and says so, while a
  // late claim is still just a timeout
  'tests/balance/salvage-timeout.test.mjs',
  // a patch that cannot name its base cannot be re-verified: 420 attempt
  // records carried a patch path and not one carried the commit
  'tests/balance/base-in-record.test.mjs',
  // a holdout running the command the work verifier just ran is not a second
  // opinion: 17 campaigns registered exactly that and the gate fired once
  'tests/balance/holdout-really-held-out.test.mjs',
  // knowledge is made of proven work: 19 "nothing to do" claims entered the tree
  'tests/balance/lesson-needs-work.test.mjs',
  // a deadline that starts after setup is not a deadline, and the caps are set
  // above the tail of the work they judge
  'tests/lifecycle/deadline-covers-setup.test.mjs',
  'tests/balance/deadline-shape.test.mjs',
  // a verdict about a dead child is worth nothing without the observation
  // behind it: whether the session ever advanced, and how long it was quiet
  'tests/balance/heartbeat-in-record.test.mjs',
  // the rebuild-and-retry was a coin flip: 32 attempts, zero conversions, and
  // the deaths it retried lasted about a second. It now asks only when the child
  // survived long enough to have wedged rather than been refused.
  'tests/lifecycle/died-retry-when-earned.test.mjs',
  // a verdict on a spec that was already green is not evidence of work: 22 of
  // 103 landed rounds carried a passing candidate whose diff was empty
  'tests/balance/spec-must-fail-on-base.test.mjs',
  // a fallback chain is a bet nobody kept the score on: per-model outcomes and
  // the p90 that a deadline has to clear
  'tests/balance/per-model-health.test.mjs',
  'tests/balance/demote-dead-ref.test.mjs',
  'tests/balance/planner-follows-the-chain.test.mjs',
  'tests/balance/stop-paying-for-nothing.test.mjs',
  'tests/balance/light-model-optional.test.mjs',
  'tests/balance/record-the-model-that-ran.test.mjs',
  'tests/balance/abandoned-work-still-counts.test.mjs',
  'tests/balance/fallback-is-a-second-provider.test.mjs',
  // the plugin shipped a config surface it never declared: `status: absent` in the
  // host's own Config directory, so every knob had to be hand-edited
  'tests/config/schema.test.mjs',
  'tests/config/loader-shape.test.mjs',
  'tests/panel-status-vocab.test.mjs',
  'tests/knowledge/no-work-is-not-knowledge.test.mjs',
  // the tree names a losing round once, not twice
  'tests/ui-eff/tree-merge.test.mjs',
  // the audit may only certify the preview it can regenerate, with the
  // attributes the panel actually sets
  'tests/tools/preview-fresh.test.mjs',
  'tests/tools/portable-fixtures.test.mjs',
  // candidates of one round create their worktrees at the same time, so cleanup
  // may only delete a registration it can prove is stale — git's own `worktree
  // prune` cannot tell a stale one from a sibling's half-written one
  'tests/exec/worktree-prune-safe.test.mjs',
  'tests/exec/worktree-race.test.mjs',
  // a queue row says how long it has waited, in the host's clock, in words
  'tests/ui-eff/queue-wait.test.mjs',
  // the sidebar's own verbs and its head dot: a card has to say what it is
  // asking of the reader, and a `stop` button has to ask twice
  'tests/ui-eff/head-dot.test.mjs',
  'tests/ui-eff/card-actions.test.mjs',
  // a score nobody prints is a private opinion: the digest names the model
  // that actually did the work, and keeps "not measured" distinct from zero
  'tests/balance/models-are-visible.test.mjs',
  // an attempt we stopped on purpose is not evidence about the model
  'tests/balance/sibling-kill-is-not-a-provider-failure.test.mjs',
  // the card shows which ref finishes work, not just what the chain claims
  'tests/ui-eff/model-rows.test.mjs',
  // a round the host killed and the loop then ran again keeps both facts: the
  // interruption is the reason the retry exists, and four campaigns had it
  // overwritten by the second finish
  'tests/balance/interrupted-round-keeps-its-story.test.mjs',
  // and a campaign that stopped buying plans must not buy them again just
  // because the round it skipped planning in went fine
  'tests/balance/a-skipped-plan-is-a-decision.test.mjs',
  'tests/balance/mean-round-is-measured.test.mjs',
  'tests/balance/a-killed-round-is-not-a-stall.test.mjs',
  'tests/balance/a-node-remembers-its-model.test.mjs',
]
// Each spec runs once. The standing list grew by append, and the same pin was
// added twice on three occasions — which quietly inflated the reported total and
// paid for those suites twice. Dedupe by absolute path, keeping first position so
// the order still reads as the story of what got pinned when.
const seen = new Set(files)
for (const rel of standing) {
  const abs = join(root, rel)
  if (seen.has(abs)) continue
  seen.add(abs)
  files.push(abs)
}
files.push(join(root, 'scripts', 'verify.mjs'))

// A suite that fails once is a suspect, not a verdict. The research brief on
// test selection is blunt about which risk is larger: in Chromium's CI about 76%
// of "real" failures turned out to be flakes. Here the cost is concrete — round 3
// of p5-wire was rolled back because tests/tri9/early-abort.test.mjs failed under
// load and passed alone, which burned a promotion and the round's guard time.
// So a failure earns exactly one retry: a suite that passes alone is reported as
// flaky and does not fail the guard, and a genuine break fails twice in a row.
const results = []
for (const file of files) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  const ms = Date.now() - started
  if (run.status === 0) {
    console.log(`ok   ${file.slice(root.length + 1)} (${ms}ms)`)
  } else {
    // The full output is kept for the kill check: the runner's failing line is
    // not always in the last twelve lines the reader is shown.
    const output = `${run.stdout || ''}${run.stderr || ''}`
    results.push({
      file,
      ms,
      firstStatus: run.status,
      firstOutput: output,
      retryStatus: null,
      retryOutput: null,
      tail: output.trim().split('\n').slice(-12).join('\n'),
    })
  }
}

// A killed run is retried like a failure (same one-retry budget), but it is
// never reported as a verdict on the code: the runner was what died.
const kills = guardReport(results)
for (const name of kills.killedFirst) {
  const entry = results.find((r) => r.file === name)
  console.log(`killed  ${name.slice(root.length + 1)} (${entry.ms}ms, harness killed the run — retrying)`)
}
const owed = retryPlan(results)
for (const name of owed.retry) {
  const entry = results.find((r) => r.file === name)
  const run = spawnSync(process.execPath, [entry.file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  entry.retryStatus = run.status
  entry.retryOutput = `${run.stdout || ''}${run.stderr || ''}`
}
const plan = retryPlan(results)
const judged = guardReport(results)
for (const name of judged.recovered) {
  const entry = results.find((r) => r.file === name)
  console.log(`killed-then-passed ${name.slice(root.length + 1)} (${entry.ms}ms, first run was killed) — not counted`)
}
for (const name of plan.flaky) {
  const entry = results.find((r) => r.file === name)
  console.log(`flaky ${name.slice(root.length + 1)} (${entry.ms}ms then passed alone) — not counted`)
}
for (const name of plan.failed) {
  const entry = results.find((r) => r.file === name)
  console.log(`FAIL ${name.slice(root.length + 1)} (${entry.ms}ms, failed twice)\n${entry.tail}\n`)
}
for (const name of judged.killed) {
  const entry = results.find((r) => r.file === name)
  console.log(
    `KILLED ${name.slice(root.length + 1)} (${entry.ms}ms, harness killed both runs — the code was never judged)\n${entry.tail}\n`,
  )
}
if (plan.flaky.length) console.log(`\nflaky on retry (${plan.flaky.length}): ${plan.flaky.map((f) => f.slice(root.length + 1)).join(', ')}`)
if (judged.recovered.length) {
  console.log(`killed then passed (${judged.recovered.length}): ${judged.recovered.map((f) => f.slice(root.length + 1)).join(', ')}`)
}
if (judged.killed.length) {
  console.log(
    `\nnever judged (${judged.killed.length}): ${judged.killed.map((f) => f.slice(root.length + 1)).join(', ')}` +
      ' — the harness killed these runs, so nothing here says the code is wrong',
  )
}
const failed = plan.failed.length
console.log(`\n${files.length - failed - judged.killed.length}/${files.length} suites passed`)
// Never judged is not a pass: a promotion must not land on a guard that did not
// read the code. It is reported apart from a failure so the reader can retry
// instead of chasing a break that does not exist.
if (failed || judged.killed.length) process.exitCode = 1
