/** A "hold" postpones a checkpoint this long before it resurfaces. */
export const DEFAULT_HOLD_MS = 6 * 60 * 60_000

export const DEFAULT_CONFIG = {
  /** Ticker period. The engine is cheap when idle; this bounds reaction latency. */
  tickMs: 20_000,
  /** State root; null = ~/.dsh/loom */
  home: null,
  budget: { usd: 5, rounds: 12, minutes: 240 },
  gate: {
    minGain: 0.05,
    minTasks: 6,
    holdoutSlack: 0.02,
    /** How many times the same holdout may be reused before retirement. */
    holdoutReuse: 3,
  },
  checkpoint: {
    on: ['gate', 'budget_50', 'anomaly', 'plateau', 'holdout', 'stuck', 'exhausted'],
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
     */
    fallback: [],
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
    screenTimeoutMs: 3 * 60_000,
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
   * `'auto'` (the default) plans unless the record says otherwise, `'full'`
   * always plans, `'off'` never does. `'auto'` stops planning only after the
   * planner timed out on the previous two rounds *and* both of those rounds
   * were promoted — a timed-out plan in a loss proves nothing about planning.
   */
  loopPolicy: { replayOnly: true, humanGate: true, autoCandidateMode: false, planMode: 'auto' },
  /** L1: what evidence a chain version needs before it may replace the active one. */
  chain: { minTasks: 6, minGain: 0.05, holdoutSlack: 0.02, maxMutations: 3 },
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
  }
}
