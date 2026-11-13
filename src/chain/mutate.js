/**
 * L1 — mutation operators for chain specs.
 *
 * A mutation is a *small, inspectable* change to how a round works, paired with
 * the sentence that explains why it might help. We deliberately do not let a
 * model hand us a rewritten pipeline: at this level a chain is a hypothesis
 * under test, and a hypothesis you cannot state in one line cannot be evaluated
 * later.
 */

const clone = (x) => JSON.parse(JSON.stringify(x))

const GUIDANCE = {
  'minimal-change':
    'Before editing anything, name the one-line root cause you believe in. Then make the smallest change that fixes it. Do not refactor adjacent code.',
  'no-test-edits':
    'Never modify the tests, the verifier command, or the golden files. If they look wrong, say so in your report instead of changing them.',
  'state-your-uncertainty':
    'If you are not sure the fix is right, say exactly which fact you did not verify. A wrong confident fix is worse than a flagged guess.',
}

function mapNodes(spec) {
  return (spec.nodes || []).filter((n) => n.type === 'map' && n.of)
}

function appendGuidance(spec, text) {
  const targets = mapNodes(spec)
  if (!targets.length) return false
  for (const node of targets) {
    const prompt = String(node.of.prompt || '').trim()
    node.of.prompt = prompt ? `${prompt}\n\n${text}` : text
  }
  return true
}

/**
 * @returns {{spec: object, kind: string, rationale: string} | null} null when the
 * mutation does not apply to this chain (so callers can offer the others).
 */
export function mutateChain(base, { kind, version, rationale } = {}) {
  if (!base || typeof base !== 'object') return null
  const spec = clone(base)
  spec.version = Number(version) || (Number(base.version) || 1) + 1
  spec.meta = { ...(spec.meta || {}), parent: Number(base.version) || null, kind, rationale: rationale ?? null }

  if (kind === 'candidates+1') {
    const cur = Number(spec.params?.candidates) || 1
    if (cur >= 4) return null
    spec.params = { ...(spec.params || {}), candidates: cur + 1 }
    return {
      spec,
      kind,
      rationale: rationale ?? `one more candidate per round (${cur} → ${cur + 1}): more shots at a passing patch per unit of human attention`,
    }
  }
  if (kind && GUIDANCE[kind]) {
    if (!appendGuidance(spec, GUIDANCE[kind])) return null
    return { spec, kind, rationale: rationale ?? `${kind}: ${GUIDANCE[kind].slice(0, 120)}` }
  }
  return null
}

export const MUTATION_KINDS = ['candidates+1', 'minimal-change', 'no-test-edits', 'state-your-uncertainty']

/**
 * Why a proposal is not worth a version.
 *
 * 2026-11-14: `rsi_chain(action:"auto")` proposed `candidates+1` two days after the
 * paired A/B had rejected exactly that change (tokens 2.09x, round clock 1.45x), and
 * it proposed `no-test-edits` on a campaign whose tasks deliver test coverage — an
 * instruction that makes those tasks impossible. The menu was fixed and read nothing
 * about what had already been decided or what the tasks asked for.
 *
 * A blocked proposal is *reported*, not dropped: the caller still sees the hypothesis
 * and the reason it is not being offered again.
 */
function statusOf(kind, { decided = [], scopeEditable = false } = {}) {
  if (kind === 'no-test-edits' && scopeEditable) {
    return { status: 'conflicts-with-scope', note: 'the task list contains tasks whose deliverable is a test edit: this instruction would make them impossible' }
  }
  const prior = (decided || []).find((d) => (typeof d === 'string' ? d : d?.kind) === kind)
  if (prior) {
    const decision = typeof prior === 'string' ? 'decided' : prior.decision || 'decided'
    return { status: 'already-decided', note: `already measured: ${decision}` }
  }
  return { status: 'fresh', note: null }
}

/**
 * All applicable mutations, each with a distinct version number and a status.
 *
 * Versions are assigned to every applicable mutation so the numbering does not
 * shift when a kind becomes blocked; `status` says whether the caller should offer
 * it again.
 */
export function proposeMutations(base, { fromVersion, max = 3, decided = [], scopeEditable = false } = {}) {
  const out = []
  let version = Number(fromVersion) || (Number(base?.version) || 1) + 1
  for (const kind of MUTATION_KINDS) {
    const m = mutateChain(base, { kind, version })
    if (!m) continue
    const s = statusOf(kind, { decided, scopeEditable })
    out.push({ ...m, ...s })
    version += 1
    if (out.filter((x) => x.status === 'fresh').length >= max) break
  }
  return out
}
