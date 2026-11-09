/**
 * L2 — the loop's own policy, as data.
 *
 * The chain (L1) says *what* a round does; the policy says *how the loop
 * behaves over rounds*: how much gain is worth a promotion, how many candidates
 * to run, whether knowledge is injected, whether screening is on. Keeping it
 * as a plain object is what makes it replayable: the same rounds can be
 * re-decided under a different policy without calling a model.
 */

export const POLICY_FIELDS = ['minGain', 'candidates', 'knowledge', 'halving', 'holdoutSlack', 'planMode']

/** The only modes a planner can run in; anything else is not a mode. */
const PLAN_MODES = ['off', 'full', 'auto']

export const POLICY_DEFAULTS = {
  minGain: 0.05,
  /** null = use the active chain's own candidate count. */
  candidates: null,
  knowledge: true,
  halving: true,
  holdoutSlack: 0.02,
  /** 'off' | 'full' | 'auto' — see `planModeFor` in runtime/round.js. */
  planMode: 'full',
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
  candidateMode: { valid: (v) => v === 'cascade' || v === 'parallel', why: 'cascade | parallel' },
  minGain: { valid: (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1, why: 'number in [0, 1]' },
  holdoutSlack: { valid: (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1, why: 'number in [0, 1]' },
  candidates: { valid: (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 4, why: 'integer in [1, 4]' },
  knowledge: { valid: (v) => typeof v === 'boolean', why: 'boolean' },
  halving: { valid: (v) => typeof v === 'boolean', why: 'boolean' },
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
    },
    POLICY_DEFAULTS,
  )
  const promoted = state?.policy?.policy
  return promoted ? normalizePolicy(promoted, fromConfig) : fromConfig
}

/** Differences between two policies, for the audit trail. */
export function diffPolicy(a, b) {
  const out = {}
  for (const k of POLICY_FIELDS) {
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) out[k] = { from: a?.[k] ?? null, to: b?.[k] ?? null }
  }
  return out
}
