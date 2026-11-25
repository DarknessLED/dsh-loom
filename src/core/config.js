/** A "hold" postpones a checkpoint this long before it resurfaces. */
export const DEFAULT_HOLD_MS = 6 * 60 * 60_000

export const DEFAULT_CONFIG = {
  /** Ticker period. The engine is cheap when idle; this bounds reaction latency. */
  tickMs: 20_000,
  /** State root; null = ~/.dsh/loom */
  home: null,
  /**
   * The price of one round, so the cap can answer "how many rounds does this
   * buy?" instead of only "how much may I spend?". A measured round cost
   * $0.0508-$0.19 (0.0508 / 0.0597 / 0.0676 observed), so 0.12 is the middle of
   * that band: the $5 / 12-round default is funded with room (12 * 0.12 = 1.44),
   * and even the top of the measured band keeps it funded (12 * 0.19 = 2.28).
   */
  budget: { usd: 5, rounds: 12, minutes: 240, usdPerRound: 0.12 },
  gate: {
    minGain: 0.05,
    minTasks: 6,
    holdoutSlack: 0.02,
    /** How many times the same holdout may be reused before retirement. */
    holdoutReuse: 3,
    /**
     * The paired e-process that the promotion gate is moving to (PACE, arXiv
     * 2606.08106). `alpha` is the per-candidate false-commit budget and
     * `efoldLambda` is the betting fraction: a won discordant pair multiplies
     * the running evidence by (1 + lambda) and a lost one by (1 - lambda).
     *
     * PACE tuned 0.05 / 0.5 on GSM8K-scale scores; ours are not those scores,
     * so these are settings rather than constants. They start at PACE's values
     * because no measurement of ours has produced better ones yet, and the gate
     * runs them in shadow until a shadow table says switching is safe.
     */
    alpha: 0.05,
    efoldLambda: 0.5,
    /**
     * Whether the paired e-process decides instead of merely being recorded.
     * Default `false` on purpose: the sequential rule has never driven a
     * promotion (483 recorded rounds carry a decision nobody acted on), so
     * turning it on changes what the loop can do — it can promote a round the
     * noise bar refused when the e-value crossed 1/alpha, and refuse one the
     * noise bar allowed when the e-value fell to alpha. A failed holdout still
     * vetoes either way. Off means the old rule, byte for byte, including the
     * absence of `decidedBy` on `gate.evaluated`.
     */
    sequentialDecides: false,
  },
  checkpoint: {
    on: ['gate', 'budget_50', 'anomaly', 'plateau', 'holdout', 'stuck', 'exhausted'],
    /**
     * How many consecutive no-promotion rounds the plateau detector looks at
     * before it raises. It was read as `config.checkpoint?.window ?? 3` in
     * src/runtime/round.js and defaulted there, so it worked but never appeared in
     * this table -- i.e. it was an undocumented knob that looked like a constant
     * (measured: all 10 recorded plateau checkpoints used 3). Declaring it here
     * costs nothing and makes the cadence adjustable on purpose.
     */
    window: 3,
    /**
     * Window spend (USD) at which a stall is reported as "burning budget"
     * rather than merely flat. 0.12 is roughly two full attempts at the
     * mid-size worker pricing; without a default the trigger existed but could
     * never fire, so every expensive stall read as an ordinary one.
     */
    burnUsd: 0.12,
    /** "HH:MM-HH:MM" local quiet window; checkpoints are batched until it ends. */
    quietHours: null,
    batch: true,
    /** How long a human "hold" postpones a checkpoint before it resurfaces. */
    holdMs: DEFAULT_HOLD_MS,
  },
  /**
   * Master switch for the background loop. `enabled` is only the *initial*
   * answer: once the operator flips it (rsi_control enable|disable, or the
   * panel), the flip is stored next to the ledgers and wins on the next start.
   * Switching it never writes to a campaign log, so history keeps its seq.
   */
  rsi: { enabled: true },
  models: {
    worker: null,
    meta: null,
    judge: null,
    /**
     * Models to fall back to, in order, when a child cannot be used: it hit a
     * *model* limit (context window, token budget, quota), or it died with no
     * diagnostic at all - a provider that breaks mid-turn is the same problem from
     * the loop's side, and a rebuilt parent cannot fix it. A child that dies *with*
     * a diagnosis is a real failure and is never retried on another model: that
     * only double-bills the same answer.
     *
     * The default names a *different provider on purpose*. A fallback that stays
     * on the provider that just broke cannot escape it -- that is the failure that
     * cost loom-acc2 eight consecutive rounds. The slash form is the only way to
     * move a child off the host's provider, so the entry is written that way. Note
     * the ledger: `modelsTried.length > 1` appears 0 times in 420 attempts, because
     * this list was empty for every campaign that ever ran.
     */
    fallback: ['command-code/deepseek/deepseek-v4.1-flash'],
    /**
     * A cheaper model for steps whose output is a paragraph of text -- planning,
     * screening a candidate, judging a report -- and nothing else.
     *
     * null by default, deliberately. Whether a smaller model changes a planning
     * decision is an empirical question this loop cannot yet answer: it reads
     * whether a plan arrived, not whether the plan named the right files. Turning
     * this on without measuring that trades a token saving for a wrong-file plan
     * nobody will trace back to here. Per-role, so buying a cheap planner never
     * quietly downgrades the worker that writes the code.
     */
    light: null,
    /**
     * How many failed attempts in a row move a ref to the back of the chain.
     *
     * 0 keeps the configured order always. The ledger answers this question and
     * nothing used to ask it: `modelsTried.length > 1` appears 0 times in 420
     * attempts, because a provider that died its last three tries kept getting the
     * first slice every round. The correction is deliberately small -- the streak
     * has to be current (a ref that recovered is not punished) and the demoted refs
     * keep their own order -- because reordering a working chain on one bad patch
     * of provider weather is worse than the disease.
     */
    demoteAfter: 0,
    /**
     * USD per million tokens; override to match the account's real prices.
     * Left unset by default: `DEFAULT_PRICING` in src/runtime/cost.js supplies
     * the documented rates, and only an explicitly configured table counts as
     * configured (which is what `round.finished.priceSource` reports).
     */
    pricing: null,
  },
  session: {
    /** Force this agent preset for worker sessions (null = inherit). */
    preset: null,
    /**
     * Per-attempt wall clock cap. 13 minutes, not 10.
     *
     * Ten minutes was a checkpoint in the code rather than a percentile of the
     * work: of 420 attempts, 24 were killed in the 600-605 s band -- pinned
     * against the cap -- while the 570-600 s band held one. Successful attempts
     * have p95 = 659 s, so a cap below that manufactures its own failures. 780 s
     * clears the tail and still fits a round the budget can afford.
     */
    attemptTimeoutMs: 13 * 60_000,
    /**
     * Held back from the first model of a chain so that a timeout still leaves the
     * next model something to answer with. 0 = no reserve: the attempt's clock
     * belongs to the first model, which is what the measured rounds want (a healthy
     * attempt needs p50 ~400 s of the 600 s budget). Set it for a campaign whose
     * provider is known to stop answering: the fallback then runs inside the same
     * wall clock instead of charging the round twice.
     */
    fallbackReserveMs: 0,
    /**
     * Which children get to run commands: `allow` (default), `declared`, `deny`.
     *
     * The host offers no per-child tool permission -- `AgentOptions` carries
     * provider/model/effort/tokens and `SubagentStartRequest` has no capability
     * list -- so the loop enforces this on the tool pipeline instead: under
     * `declared`, a child whose task does not say `exec: true` is refused shell
     * tools by a guard in `src/index.js`. `allow` is today's behaviour exactly;
     * `deny` refuses every worker child. The point of `declared` is not secrecy
     * (a child can still read files) but that a task which never asked for a
     * shell cannot quietly acquire one, and the refusal is recorded on the
     * attempt as evidence.
     */
    workerShell: 'allow',
    /**
     * The least slice worth handing to a fallback model. Below this the child
     * would be cancelled before its first token, so the attempt reports its
     * timeout rather than buying a second child that cannot finish. It is a
     * property of provider latency, not of the loop: 30 s suits a model that
     * needs ~400 s of real work, and is far too generous for a fast one.
     */
    minFalloverMs: 30_000,
    /**
     * How long a silent death must have survived before it is worth re-asking.
     *
     * A child that dies in a second was refused before it did any work: the
     * provider will refuse the identical request just as fast, which is what the
     * ledger shows -- 32 rebuild-and-retry attempts across 22 campaigns, zero of
     * them converted into a working child. A child that ran for minutes and then
     * went quiet is a wedged turn, and that is worth one more ask. 0 disables the
     * gate and restores the unconditional retry.
     */
    diedRetryMs: 60_000,
    /**
     * The reasoning effort every child is spawned with. Empty means inherit the
     * effort of the session that asked for the campaign -- a child running one
     * effort lower than its supervisor is a different model wearing the same name,
     * and the loop has no way to notice the difference afterwards.
     */
    reasoningEffort: "",
    /**
     * Wall clock cap for the planning dispatch. Three minutes.
     *
     * Planning is reconnaissance: a planner that has not named its files in three
     * minutes is wandering, and healthy plans finish well inside it. The old
     * four-minute ceiling was in fact never enforced -- the child's clock only
     * started after setup, so a 161-node sample holds 48 planning runs past it and
     * one at 8.5 minutes (see tests/lifecycle/deadline-covers-setup.test.mjs). Now
     * that it binds, it should be a number a round can spend on looking around.
     */
    planTimeoutMs: 3 * 60_000,
    /** Rounds running at the same time across all campaigns. */
    maxConcurrent: 2,
    /** No new session events for this long => the attempt is written off. */
    stallMs: 5 * 60_000,
    /** Window before a freshly spawned session must show its first event. */
    graceMs: 90_000,
    /** Hard per-attempt token cap (0 = unlimited). The only real cost gate on Windows. */
    maxTokens: 0,
  },
  verify: { timeoutMs: 10 * 60_000 },
  /** Knowledge tree: what may be shown to a worker, and when. */
  knowledge: {
    enabled: true,
    /** Hard cap on lessons in one brief. Three is already a lot of prior. */
    maxShown: 3,
    /** Harms needed before a non-paying lesson is quarantined. */
    quarantineHarm: 2,
    ttlRounds: 12,
  },
  /**
   * Successive halving: screening stage over cheap tasks before the real run.
   * Disabled automatically when a task declares no `screen` verifier.
   */
  halving: {
    enabled: true,
    keepRatio: 0.5,
    /**
     * Hand the money a dropped candidate was holding to the survivors instead of
     * keeping it. Off by default, and off is byte-identical to the prefilter the
     * loop has always run: `returnedUsd` is 0, `reallocUsd` is 0 and the plan is
     * named `prefilter`. On, a round that screens N candidates down to K reports
     * `returnedUsd = (N - K) * ceiling / N` and each survivor's attempt budget
     * rises by `returnedUsd / K`; the plan is then named `halving`.
     */
    returnToSurvivors: false,
    screenTimeoutMs: 3 * 60_000,
    /** Bracket ratio of the priced schedule; 2 is the 4 -> 2 -> 1 ladder. */
    eta: 2,
    /**
     * How many screening rounds the proxy is judged on before it may be vetoed,
     * and how often the screen's kept set has to contain the promoted candidate.
     * A short record is not a pattern: below the window the check keeps halving
     * on and says it has not seen enough. The two commands are not the same
     * command, so this is a switch with a veto rather than a constant.
     */
    fidelityWindow: 5,
    fidelityAgreement: 0.6,
  },
  /**
   * Lean 4 gate. `enabled` only controls whether campaigns advertise it; the
   * gate itself is always callable through the rsi_lean tool.
   */
  lean: {
    enabled: true,
    /** Strictly whitelisted: an import outside this list fails the claim. */
    allowedImports: [],
    /** Extra axioms beyond propext / Classical.choice / Quot.sound. */
    allowAxioms: [],
    compiler: 'lake',
    timeoutMs: 120_000,
  },
  /**
   * L2 policy evaluation defaults. `autoCandidateMode` is opt-in: when true,
   * a round may infer `cascade` from the campaign's own history instead of
   * sampling in parallel. The default stays false, so a campaign that does not
   * ask for it keeps the historical parallel behaviour. An explicit
   * `candidateMode` always outranks the inference.
   *
   * `planMode` decides whether a round buys the chain's pre-map planning stage:
   * `'off'` (the default) never does, `'full'` always does, and `'auto'` plans
   * unless the record says otherwise.
   *
   * The default is off because the planner's product is "where to look", and the
   * measured tasks already hand that to the worker in `verify.scope.editable`: on
   * four mutation tasks the endpoint did not move at all while the planner spent
   * 580 s of 2,289 s of round clock (25.3%), and 36 of 195 planner runs across the
   * corpus aborted having returned nothing. Planning is a real tool for tasks whose
   * failure is not localised, so it is not removed — it is off until asked for.
   *
   * Asked for three ways, weakest first: `loopPolicy.planMode` in config, the
   * workbench toggle (`<home>/settings.json`, the install default), and the
   * campaign's own policy (`rsi_control(action:"plan", id)` — what "add planning"
   * in a conversation writes, and what outranks the other two).
   */
  /**
   * `autoApply` is what L1 does with a promotion that passed every gate: apply
   * it, or stop and ask a person. It defaults to true because the gate is where
   * the judgement lives (no patch, out-of-scope paths, test tampering, oracle
   * edits, no gain), and a card that arrives every round is a card nobody reads
   * -- 60 out of 60 checkpoints were answered, with a median of 22 minutes and a
   * tail of 76 hours. A chain that really needs a person per round sets its
   * human node to `when: 'always'`, which outranks this default; `when: 'never'`
   * keeps a campaign unattended even with autopilot off.
   */
  loopPolicy: {
    replayOnly: true,
    humanGate: true,
    autoApply: true,
    autoCandidateMode: false,
    planMode: 'off',
    // Repetition noise as an error bar: the pooled spread the loop measured on
    // repeated runs of the same tree. An install that has not measured its own
    // repeatability inherits this figure instead of promoting at minGain alone.
    noiseSpread: 0.1,
  },
  /**
   * The research leg: whether a round may spend money on reading before it writes.
   *
   * `researchMode` in the loop policy decides per round (`off | full | auto`);
   * this block is the install-level floor and the budget the leg runs inside.
   * `depth: 'quick'` with `fetchTop: 2` is deliberate for the first version: a
   * deep run reads five pages of body text and costs about as much as a worker,
   * and the leg's whole claim is that a cheap read beats an expensive failed
   * round. `quick` alone fetches nothing, which would leave the brief quoting
   * search snippets rather than the pages they came from.
   */
  research: {
    enabled: true,
    depth: 'quick',
    /** Pages the leg may read. `quick`'s own preset is 0; this is the override. */
    fetchTop: 2,
    /** The leg's own deadline. It is not allowed to eat the attempt's cap. */
    timeoutMs: 90_000,
    /** Passages quoted into the brief. Four lines, each clipped; see research-leg.js. */
    maxFindings: 4,
    /** How many rounds of the same campaign may buy a read before the mode stops it. */
    maxRounds: 3,
  },
  /** L1: what evidence a chain version needs before it may replace the active one. */
  chain: {
    minTasks: 6,
    /**
     * Whether the six-task bar may fall to what the pool can actually supply.
     *
     * Six paired tasks is the right bar for a wide pool, but 135 of 138
     * campaigns carry fewer than six tasks, so a flat six demanded evidence
     * those campaigns could not produce and `compareChains` refused every
     * chain ever evolved. With this on, the bar is `minTasksFor(pool)` — 60%
     * of the pool, never below two, never above `minTasks`. Turn it off to
     * demand the literal number regardless of the pool.
     */
    minTasksFromPool: true,
    minGain: 0.05,
    holdoutSlack: 0.02,
    maxMutations: 3,
  },
}

export function normalizeConfig(raw) {
  const c = raw || {}
  return {
    ...DEFAULT_CONFIG,
    ...c,
    budget: { ...DEFAULT_CONFIG.budget, ...(c.budget || {}) },
    gate: { ...DEFAULT_CONFIG.gate, ...(c.gate || {}) },
    checkpoint: { ...DEFAULT_CONFIG.checkpoint, ...(c.checkpoint || {}) },
    rsi: { ...DEFAULT_CONFIG.rsi, ...(c.rsi || {}) },
    models: {
      ...DEFAULT_CONFIG.models,
      ...(c.models || {}),
    },
    session: { ...DEFAULT_CONFIG.session, ...(c.session || {}) },
    verify: { ...DEFAULT_CONFIG.verify, ...(c.verify || {}) },
    knowledge: { ...DEFAULT_CONFIG.knowledge, ...(c.knowledge || {}) },
    halving: { ...DEFAULT_CONFIG.halving, ...(c.halving || {}) },
    lean: { ...DEFAULT_CONFIG.lean, ...(c.lean || {}) },
    loopPolicy: { ...DEFAULT_CONFIG.loopPolicy, ...(c.loopPolicy || {}) },
    chain: { ...DEFAULT_CONFIG.chain, ...(c.chain || {}) },
    research: { ...DEFAULT_CONFIG.research, ...(c.research || {}) },
  }
}
