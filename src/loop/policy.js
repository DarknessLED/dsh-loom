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
