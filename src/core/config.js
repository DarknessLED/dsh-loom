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
    on: ['gate', 'budget_50', 'anomaly', 'plateau', 'holdout'],
    /** "HH:MM-HH:MM" local quiet window; checkpoints are batched until it ends. */
    quietHours: null,
    batch: true,
  },
  models: {
    worker: null,
    meta: null,
    judge: null,
    /**
     * Models to fall back to, in order, when the child dies on a *model* limit
     * (context window, token budget, quota). A dead child is never retried on
     * another model — that only doubles the bill without changing the outcome.
     */
    fallback: [],
    /** USD per million tokens; override to match the account's real prices. */
    pricing: { inputPerMTok: 0.28, outputPerMTok: 0.42, cacheReadPerMTok: 0.028 },
  },
  session: {
    /** Force this agent preset for worker sessions (null = inherit). */
    preset: null,
    /** Per-attempt wall clock cap. */
    attemptTimeoutMs: 20 * 60_000,
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
  /** L2 policy evaluation defaults. */
  loopPolicy: { replayOnly: true, humanGate: true },
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
    models: {
      ...DEFAULT_CONFIG.models,
      ...(c.models || {}),
      pricing: { ...DEFAULT_CONFIG.models.pricing, ...((c.models || {}).pricing || {}) },
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
