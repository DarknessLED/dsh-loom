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
    /** Per-attempt wall clock cap. Ten minutes: measured attempts land in 250-700s. */
    attemptTimeoutMs: 10 * 60_000,
    /**
     * Wall clock cap for the planning dispatch. Planning reads a few files and
     * names what will change; inheriting the attempt deadline let a wandering
     * planner burn twenty minutes in the round's most expensive call.
     */
    planTimeoutMs: 4 * 60_000,
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
