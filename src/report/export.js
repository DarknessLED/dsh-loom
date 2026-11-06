// A campaign is only auditable if the evidence can leave ~/.dsh/loom.
//
// exportBundle() folds the materialized state into one versioned, JSON-only
// document: the campaign identity, the active chain spec, the effective policy,
// the eval set, and one artifact per attempt that actually landed. Everything
// is cloned through JSON so nothing undefined (or a function) can ride along and
// break a round trip on the other side.

const SCHEMA = 'loom.bundle/1'

/** JSON-safe copy: undefined and non-JSON values become null. */
function json(value, fallback = null) {
  if (value === undefined) return fallback
  try {
    const text = JSON.stringify(value)
    return text === undefined ? fallback : JSON.parse(text)
  } catch {
    return fallback
  }
}

function activeChain(state) {
  const chain = state?.chain
  if (!chain) return null
  // Fixtures use `active`; the real reducer keeps `activeVersion`.
  const activeVersion = chain.activeVersion ?? chain.active ?? null
  const versions = Array.isArray(chain.versions) ? chain.versions : []
  const active = versions.find((v) => v && v.version === activeVersion)
  if (!active || active.spec === undefined) return null
  return json(active.spec)
}

function effectivePolicy(state) {
  const policy = state?.policy
  if (!policy) return null
  // The reducer stores {version, status, policy}; a bare policy object is also
  // accepted so callers can export an unpersisted config.
  return json(policy.policy !== undefined ? policy.policy : policy)
}

function artifacts(state) {
  const rounds = Array.isArray(state?.rounds) ? state.rounds : []
  const out = []
  for (const round of rounds) {
    // Only attempts the gate chose AND the workspace accepted are evidence.
    if (round?.landed !== true) continue
    const attempts = Array.isArray(round.attempts) ? round.attempts : []
    const attempt =
      attempts.find((a) => a && a.id === round.promotedAttemptId) ?? attempts[attempts.length - 1] ?? null
    out.push({
      round: round.n ?? null,
      attemptId: attempt?.id ?? round.promotedAttemptId ?? null,
      score: attempt?.score ?? round.score ?? null,
      patch: attempt?.patch ?? null,
      landed: true,
    })
  }
  return out
}

/**
 * Build the self-contained bundle for one campaign.
 * @param {{ state?: object, view?: object, config?: object }} input
 */
export function exportBundle({ state, view, config } = {}) {
  const s = state || {}
  const evalSet = s.evalset || {}
  return {
    schema: SCHEMA,
    created: Date.now(),
    campaign: {
      id: s.id ?? null,
      objective: s.objective ?? null,
      workspace: s.workspace ?? null,
    },
    chain: activeChain(s),
    policy: effectivePolicy(s),
    evalset: {
      tasks: json(evalSet.tasks, []),
      holdout: json(evalSet.holdout, []),
    },
    artifacts: artifacts(s),
    rounds: Array.isArray(s.rounds) ? s.rounds.length : 0,
  }
}
