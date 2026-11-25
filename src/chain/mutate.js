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

/**
 * Where an instruction belongs. Normally the prompt inside a map's `of` (the
 * worker), but a chain may carry a single top-level agent instead of a map —
 * the instruction is just as applicable there. Without this fallback a chain
 * with one agent and no map has exactly one mutation in its menu, so guarding
 * that one hides every hypothesis the loop could have tested.
 */
function guidanceTargets(spec) {
  const maps = mapNodes(spec)
  if (maps.length) return maps.map((n) => n.of)
  return (spec.nodes || []).filter((n) => n.type === 'agent' && n.prompt != null)
}

function appendGuidance(spec, text) {
  const targets = guidanceTargets(spec)
  if (!targets.length) return false
  for (const node of targets) {
    const prompt = String(node.prompt || '').trim()
    node.prompt = prompt ? `${prompt}\n\n${text}` : text
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
  if (kind === 'research-on-stuck') {
    // The loop's own habit, not the worker's instructions: `auto` means "read
    // when the last round lost, skip when the campaign is already landing". The
    // policy default is the same word, so a chain without the field and a chain
    // with `auto` behave identically -- which is why this is a no-op proposal on
    // a chain that already says it.
    if (spec.params?.researchMode === 'auto') return null
    spec.params = { ...(spec.params || {}), researchMode: 'auto' }
    return {
      spec,
      kind,
      rationale:
        rationale ??
        'let each round decide whether to read before writing (researchMode: auto): a read costs minutes, a failed round costs seventeen',
    }
  }
  if (kind && GUIDANCE[kind]) {
    if (!appendGuidance(spec, GUIDANCE[kind])) return null
    return { spec, kind, rationale: rationale ?? `${kind}: ${GUIDANCE[kind].slice(0, 120)}` }
  }
  return null
}

/**
 * The kinds above are the menu, but "four kinds" is a claim that deserves a date
 * and a reason. Before this registry the array was the only record: a reader
 * could not tell a kind that had been measured into existence from one that was
 * guessed on the first day, and a proposal that repeated one kind six times
 * looked exactly like a healthy search.
 *
 * `MUTATION_KINDS` stays exported as the derived list so nothing that iterates
 * it has to change.
 */
export const MUTATION_REGISTRY = [
  {
    kind: 'candidates+1',
    since: '2026-11-09',
    evidence: ['ab-cand1b', 'ab-cand2b', 'ab-cand4'],
    note: 'measured in paired A/B campaigns; the only kind with a cost/benefit number behind it',
  },
  {
    kind: 'minimal-change',
    since: '2026-11-09',
    evidence: ['loom-mut'],
    note: 'the default when a campaign has no record of what went wrong',
  },
  {
    kind: 'no-test-edits',
    since: '2026-11-09',
    evidence: ['loom-mut'],
    note: 'blocked outright when the task list contains a test deliverable',
  },
  {
    kind: 'state-your-uncertainty',
    since: '2026-11-09',
    evidence: ['loom-mut'],
    note: 'addresses the overconfident-report failure the loop kept seeing',
  },
  {
    kind: 'research-on-stuck',
    since: '2026-11-26',
    evidence: ['no-round-yet'],
    note: 'lets the loop decide per round whether to read before it writes; the first kind that changes the loop rather than the worker',
  },
]

export const MUTATION_KINDS = MUTATION_REGISTRY.map((entry) => entry.kind)

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
function statusOf(kind, { decided = [], scopeEditable = false, history = [], collapseShare = 0.6, collapseMin = 3 } = {}) {
  // A search that keeps proposing the same kind is not searching. Measured on
  // the proposal record rather than the decision ledger: the ledger only knows
  // what was decided, and the collapse this guards against is the one where
  // nothing was decided because every card looked the same.
  const proposed = (Array.isArray(history) ? history : []).filter((h) => (typeof h === 'string' ? h : h?.kind))
  if (proposed.length >= collapseMin) {
    const mine = proposed.filter((h) => (typeof h === 'string' ? h : h.kind) === kind).length
    const share = mine / proposed.length
    if (share >= collapseShare) {
      return {
        status: 'collapsed',
        note: `${mine} of the last ${proposed.length} proposals were ${kind} (${Math.round(share * 100)}%): the menu has become one idea repeated`,
      }
    }
  }
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

/** Round statuses that mean "we looked and it did not work". */
const REJECTED_STATUS = new Set(['no-gain', 'rejected', 'reject', 'failed', 'exhausted', 'no-improvement'])
/** Round statuses that measured nothing: not a win, not a loss. */
const UNMEASURED_STATUS = new Set(['interrupted', 'budget'])

/**
 * The campaign's own record, compressed into the sentence a proposal card needs.
 *
 * A human asked to approve a chain change should not have to open the ledger to
 * find out whether the change was ever tried. `basis` says which record the
 * numbers came from — and 'none' is a valid, honest answer: a first proposal on a
 * fresh campaign is a guess, and the card must not dress it up as evidence.
 */
export function evidenceFor({ rounds = [], decided = [] } = {}) {
  const list = (Array.isArray(rounds) ? rounds : []).filter((r) => r && typeof r === 'object')
  const decisions = Array.isArray(decided) ? decided : []
  const won = (r) => r?.promoted === true || r?.status === 'promoted'
  const lost = (r) => !UNMEASURED_STATUS.has(r?.status) && (r?.promoted === false || REJECTED_STATUS.has(r?.status))
  const last = list[list.length - 1] || null
  const lastVerdict = last ? (last.status ?? (won(last) ? 'promoted' : lost(last) ? 'rejected' : null)) : null
  return {
    rounds: list.length,
    promotions: list.filter(won).length,
    rejections: list.filter((r) => !won(r) && lost(r)).length,
    lastVerdict,
    decided: decisions,
    basis: list.length ? 'rounds' : decisions.length ? 'decisions' : 'none',
  }
}

/**
 * All applicable mutations, each with a distinct version number and a status.
 *
 * Versions are assigned to every applicable mutation so the numbering does not
 * shift when a kind becomes blocked; `status` says whether the caller should offer
 * it again. Every returned mutation — fresh or blocked — carries the same
 * `evidence` snapshot, because the blocked ones are the card's "why not" line.
 */
export function proposeMutations(base, { fromVersion, max = 3, decided = [], scopeEditable = false, rounds = [], history = [], collapseShare = 0.6, collapseMin = 3 } = {}) {
  const out = []
  const evidence = evidenceFor({ rounds, decided })
  let version = Number(fromVersion) || (Number(base?.version) || 1) + 1
  for (const kind of MUTATION_KINDS) {
    const m = mutateChain(base, { kind, version })
    if (!m) continue
    const s = statusOf(kind, { decided, scopeEditable, history, collapseShare, collapseMin })
    out.push({ ...m, ...s, evidence })
    version += 1
    if (out.filter((x) => x.status === 'fresh').length >= max) break
  }
  return out
}
