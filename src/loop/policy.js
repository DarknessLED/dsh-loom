/**
 * L2 — the loop's own policy, as data.
 *
 * The chain (L1) says *what* a round does; the policy says *how the loop
 * behaves over rounds*: how much gain is worth a promotion, how many candidates
 * to run, whether knowledge is injected, whether screening is on. Keeping it
 * as a plain object is what makes it replayable: the same rounds can be
 * re-decided under a different policy without calling a model.
 */

export const POLICY_FIELDS = [
  'minGain',
  'candidates',
  'knowledge',
  'halving',
  'holdoutSlack',
  'planMode',
  'researchMode',
  'secondCandidate',
]

/** The only modes a planner can run in; anything else is not a mode. */
const PLAN_MODES = ['off', 'full', 'auto']

/**
 * The only modes reading can run in. Same three words as `planMode` on purpose:
 * reading and planning answer the same question one level apart -- whether this
 * round should spend money on finding out what to do before doing it -- and
 * giving them different vocabularies would make the two knobs look unrelated.
 */
const RESEARCH_MODES = ['off', 'full', 'auto']

export const POLICY_DEFAULTS = {
  minGain: 0.05,
  /** null = use the active chain's own candidate count. */
  candidates: null,
  knowledge: true,
  halving: true,
  holdoutSlack: 0.02,
  /** 'off' | 'full' | 'auto' — see `planModeFor` in runtime/round.js. */
  planMode: 'full',
  /**
   * 'off' | 'full' | 'auto' — see `researchModeFor` in runtime/round.js.
   * Defaults to 'auto', not 'off': measured 2026-11-26, not one line of
   * `src/runtime/*.js` called the research system, so the loop has only ever
   * learned by paying a round to fail. 'auto' buys a read when the last round
   * lost and skips it when the loop is already moving.
   */
  researchMode: 'auto',
  /** null = price the second candidate; 'always' = an instruction not to. */
  secondCandidate: null,
}

function num(x, fallback) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

/**
 * The keys an operator may set on one campaign, and what counts as a value.
 *
 * This is deliberately a whitelist: a campaign's log is the evidence that "this
 * campaign ran under different terms", so a key the loop cannot honour is a
 * refused experiment, not a note beside one. `planModeFor`/`policyFor` in
 * runtime/round.js are the readers; this table must stay in step with them.
 */
const OVERRIDE_RULES = {
  planMode: { valid: (v) => PLAN_MODES.includes(v), why: PLAN_MODES.join(' | ') },
  researchMode: { valid: (v) => RESEARCH_MODES.includes(v), why: RESEARCH_MODES.join(' | ') },
  candidateMode: { valid: (v) => v === 'cascade' || v === 'parallel', why: 'cascade | parallel' },
  minGain: { valid: (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1, why: 'number in [0, 1]' },
  holdoutSlack: { valid: (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1, why: 'number in [0, 1]' },
  candidates: { valid: (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 4, why: 'integer in [1, 4]' },
  knowledge: { valid: (v) => typeof v === 'boolean', why: 'boolean' },
  halving: { valid: (v) => typeof v === 'boolean', why: 'boolean' },
  secondCandidate: { valid: (v) => v === 'always' || v === 'auto', why: 'always | auto' },
  infraPauseAfter: {
    valid: (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 20,
    why: 'integer in [1, 20]',
  },
  // A campaign may name the model chain it runs on. Whether the chain is
  // *usable* is not decidable here — the host resolves providers at dispatch —
  // so this checks shape only, and `policyFor` rejects the same shapes by the
  // same field names. Accepting `{worker}` without `fallback` is deliberate:
  // pinning one model is a legitimate experiment.
  models: {
    valid: (v) =>
      Boolean(v) &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      (v.worker === undefined || v.worker === null || (typeof v.worker === 'string' && v.worker.trim().length > 0)) &&
      (v.fallback === undefined ||
        v.fallback === null ||
        (Array.isArray(v.fallback) && v.fallback.every((m) => typeof m === 'string' && m.trim().length > 0))) &&
      ((typeof v.worker === 'string' && v.worker.trim().length > 0) ||
        (Array.isArray(v.fallback) && v.fallback.length > 0)),
    why: '{worker?: string, fallback?: string[]} naming at least one model',
  },
}

const NUMERIC_OVERRIDES = new Set(['minGain', 'holdoutSlack'])

/**
 * Validate a campaign's own policy override, before anything is written.
 *
 * Returns the accepted object (numbers normalised) or throws an error that
 * names the offending key. Nothing is coerced silently: `planMode:'sometimes'`
 * must fail loudly, because an experiment that ran with the planner on when the
 * operator asked for it off is worse than no experiment at all.
 */
export function validatePolicyOverride(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('policy override requires an object, e.g. {planMode:"off"}')
  }
  const keys = Object.keys(raw)
  if (!keys.length) throw new Error('policy override requires at least one field')
  const out = {}
  for (const key of keys) {
    const rule = OVERRIDE_RULES[key]
    if (!rule) throw new Error(`unknown policy key: ${key}`)
    const value = raw[key]
    if (!rule.valid(value)) {
      throw new Error(`invalid policy.${key}: ${JSON.stringify(value)} (expected ${rule.why})`)
    }
    out[key] = NUMERIC_OVERRIDES.has(key) ? Number(value) : key === 'candidates' ? Number(value) : value
  }
  return out
}

/** Coerce whatever a tool/model passed into a safe policy object. */
export function normalizePolicy(raw, base = POLICY_DEFAULTS) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const out = {
    minGain: Math.max(0, Math.min(1, num(p.minGain, base.minGain))),
    candidates:
      p.candidates === null || p.candidates === undefined
        ? base.candidates
        : Math.max(1, Math.min(4, Math.round(num(p.candidates, base.candidates ?? 1)))),
    knowledge: typeof p.knowledge === 'boolean' ? p.knowledge : base.knowledge,
    halving: typeof p.halving === 'boolean' ? p.halving : base.halving,
    holdoutSlack: Math.max(0, Math.min(1, num(p.holdoutSlack, base.holdoutSlack))),
    planMode: PLAN_MODES.includes(p.planMode) ? p.planMode : base.planMode,
    researchMode: RESEARCH_MODES.includes(p.researchMode) ? p.researchMode : base.researchMode,
    secondCandidate:
      p.secondCandidate === 'always' || p.secondCandidate === 'auto' ? p.secondCandidate : base.secondCandidate ?? null,
  }
  return out
}

/**
 * The policy in force for a campaign: the promoted L2 policy wins over the
 * plugin defaults, and any field it does not set falls back to config.
 */
export function effectivePolicy({ state, config } = {}) {
  const fromConfig = normalizePolicy(
    {
      minGain: config?.gate?.minGain,
      candidates: null,
      knowledge: config?.knowledge?.enabled,
      halving: config?.halving?.enabled,
      holdoutSlack: config?.gate?.holdoutSlack,
      planMode: config?.loopPolicy?.planMode,
      researchMode: config?.research?.enabled === false ? 'off' : config?.loopPolicy?.researchMode,
      secondCandidate: config?.loopPolicy?.secondCandidate ?? null,
    },
    POLICY_DEFAULTS,
  )
  // Two shapes live in one field, and reading only one of them silently turns a
  // knob into decoration. `policy.proposed`/`policy.promoted` write the nested
  // record (`{status, version, policy:{...}}`); `campaign.policy` — what
  // `rsi_control policy` appends — writes bare keys beside it. Measured on
  // 2026-11-14: a campaign set `candidates: 1` and still launched two attempts in
  // its first round, because this function only looked at `state.policy.policy`.
  // Precedence, strongest first: the campaign's bare override (the operator's
  // latest word), then the promoted L2 record, then the install config, then the
  // defaults. `normalizePolicy` is a whitelist, so metadata keys (`status`,
  // `version`, `promotedAt`, `by`) fall through untouched.
  const promoted = state?.policy?.policy
  const base = promoted && typeof promoted === 'object' ? normalizePolicy(promoted, fromConfig) : fromConfig
  const bare = state?.policy && typeof state.policy === 'object' ? state.policy : null
  return bare ? normalizePolicy(bare, base) : base
}

/** Differences between two policies, for the audit trail. */
export function diffPolicy(a, b) {
  const out = {}
  for (const k of POLICY_FIELDS) {
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) out[k] = { from: a?.[k] ?? null, to: b?.[k] ?? null }
  }
  return out
}
