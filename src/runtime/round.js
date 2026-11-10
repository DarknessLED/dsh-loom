import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { delimiter, dirname, join, resolve } from 'node:path'
import { runVerifier } from '../exec/verifier.js'
import {
  createWorktree,
  removeWorktree,
  diffStat,
  headCommit,
  rollbackWorkspace,
  commitWorkspace,
  changedFiles,
  trackedFiles,
} from '../exec/worktree.js'
import { makePatch, applyPatch } from '../exec/patch.js'
import { scoreAttempt, rankAttempts } from '../gate/gate.js'
import { campaignUsage, fallbackSpend, hasTokens, resolvePricing, usageOfSession } from './cost.js'
import { writeLease, updateLease } from './lease.js'
import { classifyResult } from '../dispatch/session.js'
import { buildWorkerBrief, parseAttemptReport } from '../dispatch/brief.js'
import { boardPath, appendNote, readNotes, pruneNotes } from '../collab/board.js'
import { selectLessons } from '../knowledge/select.js'
import { pairedImpacts, applyImpacts, shouldQuarantine, deriveLesson } from '../knowledge/impact.js'
import { pickSurvivors, screenEnabled } from './halving.js'
import { adaptiveCandidateMode, secondCandidateGate } from './candidates.js'
import { exposeIndexes } from './exposure.js'
import { runTaskLeanGate, leanSpecOf } from '../lean/task.js'
import { effectivePolicy } from '../loop/policy.js'
import { pickTask } from './selector.js'
import { oncePlateau } from './plateau.js'
import { proposeMutations } from '../chain/mutate.js'
import { nextCheckpointId } from './ids.js'
import { verifyOnce } from './verifier-reuse.js'
import { baseVerdict } from './baseline.js'
import { planCacheKey, cachedPlanEntry, rememberPlan, planFiles } from './recon-reuse.js'
import { guardIsPartOf, stripGuardClause } from './guard-reuse.js'
import { estimatedRoundCost, estimatedRoundTokens, recordedRoundTokens } from './triangle.js'
import { planBudgetMs } from './plan-budget.js'
import { demoteChain } from './model-health.js'

/**
 * A verify command is written by the task, not by the harness, so it may say
 * `node` and trust PATH. The harness itself can be started from an absolute
 * path with nothing on PATH that answers `node` (the DSH runtime does exactly
 * that on Windows), and then a sound candidate fails for the wrong reason.
 * Append the interpreter's own directory: `node` resolves whenever the task
 * assumes it, and a project that provides its own earlier on PATH keeps it.
 */
const verifierEnv = {
  PATH: [process.env.PATH, dirname(process.execPath)].filter(Boolean).join(delimiter),
}

/**
 * Why a candidate was stopped before it finished: a sibling already satisfied
 * the task outright (verifier passed, score 1.0), so its own result could not
 * change the round. One constant because the attempt record, the round ledger
 * and the lease must all agree on the spelling.
 */
const SOLVED_BY_SIBLING = 'solved-by-sibling'

/**
 * Did this attempt never run because the plugin was re-applied underneath it?
 *
 * Applying the bundle again disposes the dispatcher, and every `run()` still in
 * flight then answers with `dispatcher disposed`. The child never reached its
 * worktree, so the result measures a host restart, not a patch. Kept narrow on
 * purpose: a child that really died (`failureKind: 'died'`, any other error) is
 * still a failed attempt and must keep closing its round as `no-gain`.
 */
function lostToDisposal(attempt) {
  if (!attempt || attempt.screenedOut || attempt.abandoned) return false
  if (attempt.failureKind !== 'crash') return false
  return /dispatcher\s+disposed/i.test(String(attempt.error ?? ''))
}

/**
 * True when an attempt never got a chance to try: the child died of the model
 * layer, not of the patch.
 *
 * The dispatcher marks these `infra` (a silent error with no diagnostic, however
 * long it took — seen live as two tool-call JSON objects glued together and as a
 * context-length 400). A child that dies *with* a diagnosis is a real failure and
 * must keep closing its round as `no-gain`, or every broken patch could be
 * laundered as "retryable".
 */
function lostToInfrastructure(attempt) {
  if (!attempt || attempt.screenedOut || attempt.abandoned) return false
  if (attempt.infra === true) return true
  return lostToDisposal(attempt)
}

/**
 * Best score this campaign has already seen on one task, or null.
 *
 * Scores are only comparable inside a single task: a multi-task campaign runs
 * a different task each round, so an attempt on task B must not be measured
 * against a promoted attempt that was scored on task A. Without this, the
 * first task to reach 1.0 freezes the gate and every later improvement is
 * rejected for "not beating" a number that measured something else.
 */
export function bestPriorScore(rounds, taskId, beforeRound) {
  let best = null
  for (const r of rounds || []) {
    if (!r || r.taskId !== taskId || Number(r.n) >= Number(beforeRound)) continue
    // A round interrupted before its attempts ran was never measured. Its
    // absent score must not enter the gate as a zero the task has to beat.
    if (r.status === 'interrupted') continue
    // Only work that actually reached the workspace counts. An attempt can score
    // 1.0 inside its own worktree and still be thrown away (empty patch, guard
    // rollback); treating that as "task solved" would freeze the campaign on a
    // task the workspace still fails.
    if (r.landed !== true) continue
    // A summary entry may carry the attempt *count* where the ledger carries the
    // attempts; reading it as a list would throw and take the whole round down.
    for (const a of Array.isArray(r.attempts) ? r.attempts : []) {
      if (!a || a.screenedOut || a.abandoned) continue
      if (r.promotedAttemptId && a.id !== r.promotedAttemptId) continue
      const s = Number(a.score)
      if (Number.isFinite(s) && (best === null || s > best)) best = s
    }
  }
  return best
}

export function activeChain(state) {
  const found = state.chain.versions.find((v) => v.version === state.chain.activeVersion)
  if (!found) throw new Error('no active chain — call rsi_chain(action:"activate") first')
  return found.spec
}

/**
 * The chain's own acceptance command, if it declares one.
 *
 * A chain may contain more than one verifier node (the `refactor` template has
 * a `baseline` before the map). The node that gates per-candidate work is the
 * first verifier after the map; a chain with no map, or with only a baseline,
 * still yields a usable command from its first verifier node.
 */
export function chainVerifierNode(chain) {
  const nodes = Array.isArray(chain?.nodes) ? chain.nodes : []
  const usable = (n) => n?.type === 'verifier' && typeof n.cmd === 'string' && n.cmd.trim() !== ''
  const mapAt = nodes.findIndex((n) => n?.type === 'map')
  const afterMap = mapAt >= 0 ? nodes.slice(mapAt + 1) : []
  return afterMap.find(usable) || nodes.find(usable) || null
}

/**
 * Resolve the acceptance command for one task.
 *
 * The task's own verifier always wins: a chain may supply a gate where the task
 * states none, but it must never weaken or replace the criteria a task does
 * state. With neither there is nothing to run, and the caller fails closed
 * rather than mistaking the absence of a proof for a proof.
 */
/**
 * A command, compared the way a shell would read it.
 *
 * Two verifiers are the same test when their commands differ only in the
 * whitespace nobody types on purpose. The holdout gate uses this to tell a real
 * second opinion from a second copy of the first one; a byte comparison would
 * call `a &&  b` and `a && b` different tests and buy the same verdict twice.
 *
 * @param {unknown} cmd
 * @returns {string}
 */
export function normalizeCommand(cmd) {
  return String(cmd ?? '').replace(/\s+/g, ' ').trim()
}
export function acceptanceVerifier({ task, chain }) {
  if (task?.verify && typeof task.verify.cmd === 'string' && task.verify.cmd.trim() !== '') {
    return { spec: task.verify, source: 'task', cwd: null }
  }
  const node = chainVerifierNode(chain)
  if (!node) return { spec: null, source: 'none', cwd: null }
  const timeoutMs = Number(node.timeoutMs)
  return {
    spec: {
      cmd: node.cmd,
      ...(node.metrics && typeof node.metrics === 'object' ? { metrics: node.metrics } : {}),
      ...(Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {}),
    },
    source: 'chain',
    cwd: typeof node.cwd === 'string' && node.cwd.trim() ? node.cwd : null,
  }
}

/**
 * The chain's human node, if it declares one.
 *
 * `when` states when a person must look: `always` outranks autopilot, `never`
 * keeps an unattended campaign unattended, and anything else (the templates'
 * `on_gain`) keeps the established rule — autopilot applies, a normal campaign
 * waits for review.
 */
export function humanGate(chain) {
  const nodes = Array.isArray(chain?.nodes) ? chain.nodes : []
  return nodes.find((n) => n?.type === 'human') || null
}

function tailOf(text, max = 200) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `…${s.slice(-max)}`
}

/** A planner reports a plan in prose; the attempt-report schema would be noise. */
const RECON_GUIDE =
  'Reply with the plan as short plain text, not a JSON report: this pass is not scored and its text is handed to the implementing agents as-is. State the gap or failure, the files involved, and how success is verified.'

/**
 * The agent nodes that run before the chain's `map` node.
 *
 * These are the reconnaissance step: one fresh session inspects the task, and
 * every parallel worker gets its findings in the brief. A chain without one
 * (or one whose first node is the map) must behave exactly as it did before
 * chains had executable nodes, so an empty list here means "no extra work".
 */
export function preMapAgentNodes(chain) {
  const out = []
  for (const node of Array.isArray(chain?.nodes) ? chain.nodes : []) {
    if (!node || typeof node !== 'object') continue
    // Everything from the map onward is per-candidate work; only what comes
    // before it is shared setup.
    if (node.type === 'map') break
    if (node.type !== 'agent') continue
    if (typeof node.prompt !== 'string' || !node.prompt.trim()) continue
    out.push(node)
  }
  return out
}

/**
 * The chain node a candidate implements: the map node's inner node when the
 * chain declares one, otherwise the last agent node (a chain may list its
 * worker directly and skip the map). Dispatch labels use it so a reader can
 * tell a planner from a worker without opening the brief.
 */
function workerNodeId(chain) {
  const nodes = Array.isArray(chain?.nodes) ? chain.nodes : []
  for (const node of nodes) {
    if (node?.type === 'map' && node.of && typeof node.of === 'object' && node.of.id) return String(node.of.id)
  }
  const agents = nodes.filter((node) => node?.type === 'agent' && node?.id)
  return agents.length ? String(agents[agents.length - 1].id) : 'work'
}

/**
 * The policy a round actually runs under: the campaign's own override, over the
 * loader config, over the built-in default.
 *
 * A campaign is the experiment, so it must be able to state its own terms
 * ("this one runs without the planner") in its own log instead of editing the
 * profile config and restarting the host — that would make every A/B
 * comparison a different build. `campaign.policy` therefore wins, but only
 * when the value is one this loop understands: a typo (`planMode: 'sometimes'`)
 * is a *rejected* override, reported by name, not silently ignored. Silently
 * accepting it would let a broken experiment pass as a successful one.
 *
 * Each value records where it came from (`campaign` / `config` / `default`) so
 * a reader can tell a deliberate override from an inherited setting.
 */
export function policyFor({ config, campaign } = {}) {
  const loop = config?.loopPolicy && typeof config.loopPolicy === 'object' ? config.loopPolicy : {}
  const raw = campaign?.policy
  // A campaign's policy is usually the promoted record (`{status, version,
  // policy:{...}}`); a bare override (`{planMode:'off'}`) is the same thing
  // without the bookkeeping, so accept both instead of demanding one shape.
  const over = raw && typeof raw === 'object' ? (raw.policy && typeof raw.policy === 'object' ? raw.policy : raw) : {}
  const rejected = []
  const sources = {}
  // Unknown values are rejected by name; the field then falls back to the
  // config (and, when the config has nothing usable either, to the default).
  const decide = (key, fromCampaign, fromConfig, valid, fallback) => {
    if (fromCampaign !== undefined && fromCampaign !== null) {
      if (valid(fromCampaign)) {
        sources[key] = 'campaign'
        return fromCampaign
      }
      rejected.push(key)
    }
    if (fromConfig !== undefined && fromConfig !== null && valid(fromConfig)) {
      sources[key] = 'config'
      return fromConfig
    }
    sources[key] = 'default'
    return fallback
  }
  const isPlanMode = (v) => v === 'off' || v === 'full' || v === 'auto'
  const isCandidateMode = (v) => v === 'cascade' || v === 'parallel'
  const isRatio = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1
  const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1
  const planMode = decide('planMode', over.planMode, loop.planMode, isPlanMode, 'full')
  const candidateMode = decide('candidateMode', over.candidateMode, loop.candidateMode, isCandidateMode, 'parallel')
  // `minGain` is a fraction, so a negative or >1 override cannot be a policy.
  const minGain = Number(decide('minGain', over.minGain, config?.gate?.minGain, isRatio, 0.05))
  // How many rounds in a row may die of infrastructure before the loop stops
  // itself. A provider outage is not a hard task, and burning a budget on it
  // teaches nobody anything.
  const infraPauseAfter = Number(
    decide('infraPauseAfter', over.infraPauseAfter, loop.infraPauseAfter, isPositiveInt, 3),
  )
  // Which models an attempt may use. The host reads `config.models` once at load,
  // so changing providers used to mean editing the profile and restarting the
  // app — the same constraint `campaign.policy` was built to remove for planMode.
  // A chain is all-or-nothing: applying the worker but dropping a malformed
  // fallback would look like an experiment while silently not being one.
  const isModelName = (v) => typeof v === 'string' && v.trim().length > 0
  const isModelList = (v) => Array.isArray(v) && v.every(isModelName)
  const configModels = config?.models && typeof config.models === 'object' ? config.models : {}
  const chainFrom = (source) => ({
    worker: isModelName(source?.worker) ? source.worker : null,
    fallback: isModelList(source?.fallback) ? source.fallback.slice() : [],
  })
  const configChain = chainFrom(configModels)
  const configIsSet = configChain.worker !== null || configChain.fallback.length > 0
  const fromConfig = () => {
    sources.models = configIsSet ? 'config' : 'default'
    return configChain
  }
  const overModels = over.models
  let models = fromConfig()
  if (overModels !== undefined && overModels !== null) {
    if (typeof overModels !== 'object' || Array.isArray(overModels)) {
      rejected.push('models')
    } else {
      const workerOk = overModels.worker === undefined || overModels.worker === null || isModelName(overModels.worker)
      const fallbackOk =
        overModels.fallback === undefined || overModels.fallback === null || isModelList(overModels.fallback)
      const namesSomething = isModelName(overModels.worker) || isModelList(overModels.fallback)
      if (!workerOk) rejected.push('models.worker')
      if (!fallbackOk) rejected.push('models.fallback')
      if (workerOk && fallbackOk && namesSomething) {
        models = chainFrom({ ...configModels, ...overModels })
        sources.models = 'campaign'
      }
    }
  }
  return { planMode, candidateMode, minGain, infraPauseAfter, models, sources, rejected }
}

/**
 * The model chain an attempt should be dispatched with: the campaign's own chain
 * when it named one, otherwise `undefined` so the dispatcher falls back to the
 * config exactly as before.
 */
export function modelsFor(policy) {
  const chain = policy?.models
  if (!chain) return undefined
  const fallback = Array.isArray(chain.fallback)
    ? chain.fallback.filter((name) => typeof name === 'string' && name)
    : []
  const worker = typeof chain.worker === 'string' && chain.worker ? chain.worker : null
  if (worker === null && fallback.length === 0) return undefined
  // `null` in the head position means "inherit the host's model". It must stay a
  // null rather than being dropped: a chain of nothing but fallbacks would send the
  // very first child to the fallback provider, which is the silent redirect the
  // inherited-model wiring exists to prevent.
  return worker === null ? [null, ...fallback] : [worker, ...fallback]
}

/**
 * How many of the most recent rounds were interrupted by infrastructure.
 *
 * A `dispatcher is disposed` round is a different problem - the host re-applied the
 * plugin - so it does not count: it says nothing about the provider, and pausing for
 * it would punish a normal event.
 */
export function consecutiveInfraRounds(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  let n = 0
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const r = list[i]
    if (!r || r.status !== 'interrupted' || r.reason !== 'infrastructure') break
    n += 1
  }
  return n
}

/**
 * Whether a round buys the chain's pre-map planning stage.
 *
 * `'off'` and `'full'` are decided by the policy itself; only `'auto'` reads
 * history. A timeout alone is not evidence against planning — the round may
 * have lost *because* nobody finished the plan, and blaming the plan for a loss
 * it never got the chance to prevent is exactly how a useful step gets defunded
 * for the wrong reason. The only rounds that prove planning is not
 * load-bearing are the ones that won while the planner never finished, so
 * `'auto'` requires `planTimedOut === true` **and** `promoted === true` in each
 * of the previous two rounds. One such win is a bad day; two in a row is a
 * pattern worth defunding.
 *
 * A finished plan is not evidence however the round ended, a mixed record
 * (one win, one loss) is not a pattern, and missing or short history is not
 * evidence at all: all of those keep planning on. An explicit `'off'`/`'full'`
 * always wins over the record.
 *
 * Rounds recorded before `promoted` existed carry only `status`; without the
 * field they cannot be judged on wins, so they keep the earlier timeout-only
 * rule instead of being read as losses. Every round written by `runRound` now
 * carries `promoted`, so current ledgers always take the win-aware path.
 */
export function planModeFor(rounds, policy) {
  const mode = policy?.planMode
  if (mode === 'off' || mode === 'full') return mode
  if (mode !== 'auto') return 'full'
  const history = Array.isArray(rounds) ? rounds : []
  if (history.length < 2) return 'full'
  const [prev, last] = history.slice(-2)
  // A plan was not worth its price when it ran out of time, or when it came back
  // having named nothing. The second case is the expensive one: the ledger says 85
  // of 132 planned rounds got no text back while still spending ~24% of the wall
  // clock, and `planUsable` was written for every one of them and read by nobody.
  // It is three-state -- only an explicit false means "named nothing"; a record
  // written before the field existed cannot answer, and reading absence as failure
  // would defund planning on every old ledger.
  const wasted = (r) => r?.planTimedOut === true || r?.planUsable === false
  const won = (r) => r?.promoted === true
  // A ledger that predates `promoted` cannot say whether a wasted round won;
  // fall back to the win-blind rule those records were judged by, rather than
  // treating "unrecorded" as "lost".
  if ([prev, last].some((r) => typeof r?.promoted !== 'boolean')) {
    return wasted(prev) && wasted(last) ? 'off' : 'full'
  }
  return wasted(prev) && won(prev) && wasted(last) && won(last) ? 'off' : 'full'
}

/**
 * The deadline this round's planner may take: the configured ceiling, reduced by
 * whatever the campaign's own record says the planner has been buying (see
 * `plan-budget.js`). Kept as one function so the planner dispatch and the record
 * it writes cannot disagree about the number.
 */
function plannerBudget(state, config) {
  const ceiling = Number(config?.session?.planTimeoutMs)
  return planBudgetMs(state?.rounds, Number.isFinite(ceiling) ? { ceiling } : {})
}

/**
 * Run the pre-map agent nodes, one fresh session each, and return their text.
 *
 * A node is a planning step, not an attempt: it never produces a patch, never
 * touches the campaign workspace (it gets a throwaway worktree of the base
 * commit) and can never fail the round. Every outcome — including a throw, a
 * timeout, an empty or error reply — is recorded as `node.finished` and the
 * round continues with whatever findings were usable.
 *
 * A plan is not evidence: no attempt, promotion or score depends on it, so a
 * plan whose inputs (chain version, task, node prompt, prior findings) are
 * unchanged is reused instead of re-derived. The base commit is *not* an input:
 * a plan describes the files it names, and a commit that touches none of them
 * moves the base without moving the subject. Such a reuse is recorded with
 * `reused: true`, `planBasis: 'delta'` and `durationMs: 0`; an identical base is
 * `planBasis: 'same'`. Any overlap with a named file, an empty file list, or a
 * delta that cannot be computed falls back to a real planning call, because a
 * stale plan is worse than an expensive one.
 */
async function runPreMapNodes({ runtime, view, state, config, dispatcher, task, chain, round, planTimeoutMs, log }) {
  const findings = []
  // A timed-out planner is not a plan. The round still runs, but it records
  // that it did so without reconnaissance instead of pretending the empty
  // findings were a considered answer.
  let planTimedOut = false
  // Planning is the one call every round makes before anything can succeed, so
  // it may run on its own model: `models.meta` when set, otherwise the worker
  // model exactly as before. Candidates below never consult `meta`.
  const planModel = config.models.meta || config.models.worker || null
  // The deadline is decided once per round by the caller (`plannerBudget`), so
  // every planning node in this round runs under the same window and the record
  // it writes cannot disagree with the dispatch it made.
  const nodes = preMapAgentNodes(chain)
  // One tree, one base commit: every node in this round is planned against the
  // same worktree branch point, so read it once for all of them.
  const base = nodes.length ? await headCommit(state.workspace).catch(() => null) : null
  for (const node of nodes) {
    const id = String(node.id)
    const startedAt = Date.now()
    const record = {
      id,
      type: 'agent',
      role: node.role ?? null,
      round,
      attempt: 1,
      ok: false,
      reused: false,
      planBasis: null,
      base,
      durationMs: 0,
      sessionId: null,
      stopReason: null,
      // The model this node actually planned with. Null until a dispatch
      // happens: a reused plan was not planned by anyone in this round.
      model: null,
      timedOut: false,
      error: null,
      summary: '',
    }
    const key = planCacheKey({ base, chain, task, node, objective: state.objective, prior: findings })
    const entry = key ? cachedPlanEntry(view.dir, key) : null
    // A plan stays valid while the files it names have not moved. The same base
    // is the same tree by construction; otherwise measure the delta from the
    // tree the plan saw and reuse only on a known, thoroughly disjoint answer.
    // No diff, no named files, or any overlap: plan for real.
    let planBasis = null
    if (entry) {
      if (entry.base === base) planBasis = 'same'
      else {
        const changed = await changedFiles(state.workspace, entry.base, base).catch(() => null)
        const named = entry.files
        if (changed !== null && named.length > 0 && !named.some((file) => changed.includes(file))) {
          planBasis = 'delta'
        }
      }
    }
    if (planBasis) {
      record.ok = true
      record.reused = true
      record.planBasis = planBasis
      record.stopReason = 'reused'
      record.durationMs = 0
      record.summary = tailOf(entry.plan, 400)
      // The plan is the point of the node: workers must still receive it.
      findings.push({ id, role: node.role ?? null, text: entry.plan })
      runtime.append(view, 'node.finished', record, 'system')
      log(`round ${round}: chain node ${id} reused the plan (${planBasis}) for ${String(base).slice(0, 12)}`)
      continue
    }
    const wtPath = join(runtime.home, 'worktrees', state.id, `recon-${id}`)
    const branch = `loom/${state.id}/recon-${id}`
    let planText = ''
    try {
      // Name the node before the work starts. Without this a node that takes the
      // host down leaves nothing but a missing finish; with it the folded state
      // can mark the instance lost and say which one it was.
      runtime.append(
        view,
        'node.started',
        { id, type: 'agent', role: node.role ?? null, round, attempt: 1, at: startedAt, base, deadlineMs: planTimeoutMs },
        'system',
      )
      // Inspect the base commit in isolation: an agent that ignores "do not
      // edit" must not dirty the workspace the next promotion lands in.
      await createWorktree({ repo: state.workspace, dir: wtPath, branch })
      const brief = buildWorkerBrief({
        objective: state.objective,
        task: { id: `${task.id}:${id}`, prompt: node.prompt },
        chain: { name: chain.name, version: chain.version },
        constraints: [
          `You are the "${node.role || id}" node of this chain, running before the implementation attempts.`,
          `Work ONLY inside ${wtPath}. Do not read or write outside it.`,
          'This is a reconnaissance pass: inspect the repository and report. Do not change any file.',
        ],
        plan: findings,
        reportGuide: RECON_GUIDE,
        // The node is stopped by a clock; telling it nothing about that clock
        // is how 85 of 132 planners spent the whole window and returned
        // nothing at all.
        budgetMs: planTimeoutMs,
        workspace: { branch, cwd: wtPath },
      })
      const res = await dispatcher.run(brief, {
        cwd: wtPath,
        timeoutMs: planTimeoutMs,
        // The node id alone does not say what kind of dispatch this was; the
        // "plan" marker does, and it is what a label is for.
        label: `loom:${state.id}:r${round}:plan:${id}`,
        model: planModel,
      })
      const text = String(res?.text ?? '').trim()
      planText = text
      record.sessionId = res?.sessionId ?? null
      record.stopReason = res?.stopReason ?? null
      // Record the model that actually planned. A dispatcher that reports the
      // model it used is authoritative; otherwise the one we asked for is the
      // only honest answer.
      record.model = res?.model ?? planModel
      // The dispatcher reports a real timeout as `timedOut: true` (with
      // stopReason 'aborted'); a fake or a future dispatcher may say
      // 'timedOut' directly. Either spelling means the same thing here.
      record.timedOut = res?.timedOut === true || res?.stopReason === 'timedOut'
      record.error = res?.error ?? null
      record.ok = !record.timedOut && res?.stopReason !== 'error' && !res?.error && text.length > 0
      if (record.timedOut) planTimedOut = true
      record.summary = tailOf(text, 400)
      if (record.ok) findings.push({ id, role: node.role ?? null, text })
      else {
        log(
          `round ${round}: chain node ${id} produced no usable plan (${record.stopReason || record.error || 'empty reply'}); continuing without it`,
        )
      }
    } catch (err) {
      record.error = String(err?.message ?? err)
      log(`round ${round}: chain node ${id} failed:`, record.error)
    }
    record.durationMs = Date.now() - startedAt
    // Only a usable plan is worth remembering: caching a failure would make the
    // next round reuse the failure instead of trying again. The tree it saw is
    // part of the entry so a later round can tell whether it still applies.
    if (record.ok && planText) {
      const files = planFiles(planText, await trackedFiles(state.workspace))
      rememberPlan(view.dir, key, planText, { base, files })
    }
    runtime.append(view, 'node.finished', record, 'system')
    await removeWorktree({ repo: state.workspace, dir: wtPath }).catch(() => {})
  }
  return { findings, planTimedOut }
}

function lastFailure(state) {
  const prev = state.rounds[state.rounds.length - 1]
  if (!prev) return null
  // A summary entry may carry the attempt count rather than the attempts, so
  // read it only when it is the list it claims to be.
  const failed = (Array.isArray(prev.attempts) ? prev.attempts : []).filter((a) => !a.verifierOk)
  if (!failed.length) return null
  const worst = failed[failed.length - 1]
  const detail = worst.reportError || worst.error || worst.stdoutTail || worst.agentTail || ''
  return {
    reason: worst.abandoned ? `attempt was written off (${worst.reason ?? worst.abandoned})` : 'verifier failed in the previous round',
    detail: tailOf(detail, 300),
  }
}

/**
 * What an attempt records when it was stopped before it could be judged. The
 * verifier never ran, so the ledger gets a failing verdict that says so rather
 * than a pass or a silence that would read as evidence.
 */
export function abandonedVerdict(reason, cwd) {
  // `skipped` and `measured` are the part that matters. A stopped attempt keeps
  // the patch it made, and 29 of them in this ledger held one -- but a verdict
  // that only says `ok: false` reads downstream as "this work failed", so the
  // triangle counts an unmeasured diff as a bad one. It was never looked at.
  const why = typeof reason === 'string' && reason ? reason : 'unknown'
  return {
    ok: false,
    exitCode: null,
    signal: null,
    timedOut: false,
    durationMs: 0,
    stdout: '',
    stderr: `not verified: attempt was abandoned (${why})`,
    metrics: {},
    command: null,
    cwd,
    skipped: true,
    measured: false,
    reason: why,
  }
}

/**
 * Everything the worker needs, and nothing it does not: no transcript, no
 * sibling history beyond a handful of notes, no knowledge the round has not
 * earned yet.
 */
function attemptBrief({ chain, state, task, verifyCmd, worktree, attemptId, index, total, notes, lessons, plan = [], maxChars, budgetMs }) {
  const mapNode = (chain.nodes || []).find((n) => n.type === 'map')
  const rolePrompt = mapNode?.of?.prompt || 'Do the task in your worktree, then run the verification command.'
  const constraints = state.constraints.filter((c) => c.active).map((c) => c.text)
  constraints.push(
    rolePrompt,
    `Work ONLY inside ${worktree}. Do not read or write outside it.`,
    `The verifier will run: \`${verifyCmd}\` in that directory. Make it pass.`,
    'Do not edit the verifier command or tests to make them pass; fix the actual problem.',
    'If the task is impossible, say so explicitly and explain why; a clean failure is useful.',
  )
  return buildWorkerBrief({
    objective: state.objective,
    task: { id: task.id, prompt: task.prompt, verify: task.verify },
    chain: { name: chain.name, version: chain.version },
    attemptIndex: index,
    totalAttempts: total,
    constraints,
    notes,
    lessons,
    plan,
    previousFailure: lastFailure(state),
    workspace: { branch: `loom/${state.id}/${attemptId}`, cwd: worktree },
    ...(maxChars ? { maxChars } : {}),
    ...(budgetMs ? { budgetMs } : {}),
  })
}

/**
 * Screening pass: cheap check, short deadline, no promotion. Its only job is to
 * tell us which candidates deserve the expensive attempt. Whatever the worker
 * learned in the screen stays in its worktree, so a survivor starts ahead.
 */
async function screenCandidate({ runtime, view, state, config, dispatcher, task, attemptId, workerId = 'work', models, log }) {
  const startedAt = Date.now()
  const wtPath = join(runtime.home, 'worktrees', state.id, attemptId)
  const branch = `loom/${state.id}/${attemptId}`
  const out = { ok: false, exitCode: null, durationMs: 0, sessionId: null, stopReason: null, error: null }
  try {
    await createWorktree({ repo: state.workspace, dir: wtPath, branch })
    const prompt =
      task.screen.prompt ||
      'Screening pass, cheap on purpose: read the code and the failing check, identify the likely cause, and write a short plan. Do not rewrite the codebase yet.'
    const brief = buildWorkerBrief({
      objective: state.objective,
      task: { id: `${task.id}:screen`, prompt, verify: task.screen.cmd },
      chain: { name: 'screen', version: 0 },
      constraints: [
        `Work ONLY inside ${wtPath}. Do not read or write outside it.`,
        `The screening check runs: \`${task.screen.cmd}\``,
        'This is a screening step — cheap and fast — and it is not promoted on its own.',
      ],
      workspace: { branch, cwd: wtPath },
    })
    const timeoutMs = Math.max(30_000, Math.min(config.halving?.screenTimeoutMs ?? 180_000, config.session.attemptTimeoutMs))
    const run = await dispatcher.run(brief, {
      cwd: wtPath,
      timeoutMs,
      label: `loom:${workerId}:${attemptId}:screen`,
      model: config.models.worker || null,
      models,
    })
    const ver = await runVerifier(task.screen, { cwd: wtPath, timeoutMs: config.verify.timeoutMs, env: verifierEnv })
    Object.assign(out, {
      ok: Boolean(ver.ok),
      exitCode: ver.exitCode ?? null,
      sessionId: run.sessionId ?? null,
      stopReason: run.stopReason ?? null,
      error: run.error ?? null,
    })
  } catch (err) {
    out.error = String(err?.message ?? err)
    log(`round screening for ${attemptId} failed:`, out.error)
  }
  out.durationMs = Date.now() - startedAt
  return out
}

/**
 * How many candidates may be in flight at once.
 *
 * `session.maxConcurrent` already caps how many rounds the campaign ticker
 * runs, so it must mean the same thing inside a round: the number of attempts
 * in flight. A missing or nonsensical value means "no cap": defaulting it to 1
 * would silently restore the serial walk, and treating 0 as a hard limit would
 * stall dispatch forever.
 */
function dispatchLimit(config, total) {
  const cap = Number(config?.session?.maxConcurrent)
  if (!Number.isFinite(cap) || cap < 1) return Math.max(1, total)
  return Math.max(1, Math.min(Math.floor(cap), Math.max(1, total)))
}

/**
 * Tokens for one attempt: the meter/log figure when the session actually
 * reported usage, otherwise a character-count estimate. The estimate is the
 * point — without it the cost leg of the triangle reads zero on every real
 * ledger, because child sessions publish no `usage` block.
 */
export function tokensOf(spend, brief, text) {
  const u = spend?.usage
  const measured = (Number(u?.inputTokens) || 0) + (Number(u?.outputTokens) || 0)
  if (measured > 0) return measured
  return Math.ceil(((brief?.length || 0) + (text?.length || 0)) / 4)
}

/**
 * The round's triangle, measured rather than inferred: wall time, how much of it
 * the candidates used, how much the verifiers used, and what the models cost.
 * `attemptMs` above `durationMs` means the round ran in parallel; `verifierMs`
 * that rivals it means the gate, not the agent, is the bottleneck.
 *
 * `planMs` is the wall time spent in the nodes that run before the candidates.
 * It is passed in because only the caller sees those nodes: without it, planning
 * hides inside `durationMs` and a reader cannot tell a slow agent from a slow
 * reconnaissance step. Defaulting to 0 keeps a round with no planned nodes a
 * measurement ("this round planned nothing") rather than an unknown.
 *
 * `holdoutMs`/`holdoutRuns` are the same split for the gate that runs after the
 * candidates: `durationMs` contains that proof, so without them a round reads as
 * pure candidate work and the loop looks slower than it was.
 */
export function roundStats(attempts, startedAt, verifierRuns, verifierMs, planMs = 0, priceSource = null, holdoutMs = 0, holdoutRuns = 0) {
  let attemptMs = 0
  let tokens = 0
  let costUsd = 0
  for (const a of Array.isArray(attempts) ? attempts : []) {
    attemptMs += Number(a?.durationMs) || 0
    tokens += Number(a?.tokens) || 0
    costUsd += Number(a?.costUsd) || 0
  }
  return {
    durationMs: Math.max(0, Date.now() - startedAt),
    planMs: Math.max(0, Number(planMs) || 0),
    attemptCount: Array.isArray(attempts) ? attempts.length : 0,
    attemptMs,
    verifierRuns,
    verifierMs,
    holdoutMs: Math.max(0, Number(holdoutMs) || 0),
    holdoutRuns: Math.max(0, Number(holdoutRuns) || 0),
    tokens,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
    // Which table priced the tokens above: 'default' means the documented
    // fallback rates, 'configured' means the campaign supplied its own.
    priceSource,
  }
}

/**
 * One round: pick a task, run `candidates` attempts in isolated worktrees, verify
 * mechanically, promote the best one. Never throws: every failure becomes an
 * event + (when it needs a human) a checkpoint.
 */
export async function runRound({ runtime, view, config, dispatcher, log, notify = null }) {
  const state = view.state
  // The round number is ledger identity, and the holdout rotation is a function
  // of it: derive the next one from the highest number already projected, not
  // from the array length. An embedder that re-projects a round (or folds one
  // twice) would otherwise make the length overcount and skip a number, which
  // would silently re-point every later holdout pick.
  const n = state.rounds.reduce((max, r) => Math.max(max, Number(r?.n) || 0), 0) + 1
  // L2: the promoted loop policy overrides the plugin defaults for this campaign.
  const policy = effectivePolicy({ state, config })
  const chain = activeChain(state)
  // The campaign's own override wins for the decisions it names: a campaign
  // that says "no planner" in its log must not depend on the loader config.
  const campaignPolicy = policyFor({ config, campaign: state })
  if (campaignPolicy.rejected.length) {
    log(`campaign policy rejected unknown value(s) for ${campaignPolicy.rejected.join(', ')}; the config applies instead`)
  }
  // Per campaign, per policy: whether this round pays for planning at all.
  const planMode = planModeFor(state.rounds, campaignPolicy)
  // Which models the workers in this round may use — the campaign's chain when it
  // named one, otherwise the config's. Without an override `modelsFor` returns the
  // config chain itself, which is what the dispatcher would have resolved anyway.
  // A chain that keeps handing the first slice to a ref that keeps dying is a
  // queue with an optimist at the front. The ledger already says which refs have
  // not delivered; this is the one place that reads it before dispatching. The
  // rule is off unless a campaign asks for it (`models.demoteAfter`), because
  // reordering a working chain is a change nobody requested.
  const configuredModels = modelsFor(campaignPolicy)
  const demoteAfter = Number(config?.models?.demoteAfter ?? 0)
  const demotion = demoteAfter > 0
    ? demoteChain(configuredModels ?? [], state.rounds, { after: demoteAfter })
    : { chain: configuredModels ?? [], demoted: [] }
  const models = configuredModels === undefined ? undefined : demotion.chain
  if (demotion.demoted.length) {
    log(`models demoted to the back of the chain: ${demotion.demoted.join(", ")}`)
  }
  // Planning is bounded work and gets its own, shorter deadline; attempts keep
  // the per-attempt cap. The ceiling comes from config, but the deadline the
  // planner actually gets is learned from what its last few runs bought: a
  // planner that keeps hitting the ceiling gets half of it next time, and one
  // finished plan earns the whole budget back. Decided here, once per round, so
  // the dispatch and the record it writes cannot disagree.
  const planTimeoutMs = plannerBudget(state, config)
  const workerId = workerNodeId(chain)
  // Resolve the price table once: every attempt in this round is billed at the
  // same rates, and the finished record must name the table its dollars came
  // from ('default' rates when the campaign configured none).
  const pricing = resolvePricing(config.models?.pricing)
  const raise = (kind, payload) => {
    const id = raiseCheckpoint(runtime, view, kind, payload)
    if (notify) {
      try {
        Promise.resolve(notify(kind, { id, ...payload })).catch((err) => log('notify failed:', err?.message ?? err))
      } catch (err) {
        log('notify threw:', err?.message ?? err)
      }
    }
    return id
  }
  // A setup problem is a standing condition, not a per-tick event. While the
  // same message is still unanswered, repeating it every tick buries the
  // checkpoints a human can actually act on (a workspace-less campaign once
  // raised eight identical ones in four minutes). Answering it re-arms it.
  const raiseSetup = (payload) => {
    if (setupAlreadyRaised(view.state, payload?.message)) return null
    return raise('setup', payload)
  }

  if (state.budget.roundsUsed >= state.budget.rounds) {
    runtime.append(view, 'campaign.status', { status: 'converged', reason: 'round budget exhausted' }, 'system')
    return
  }
  // The folded counter (`spentUsd`) is only as good as the `budget.spent`
  // events a campaign happened to write: a ledger from before that event
  // existed, or one whose fold never landed before a crash, reports zero while
  // the attempt records already prove money was spent. Take the larger of the
  // two rather than adding them — they are two views of the same spend, so
  // summing would double-count a healthy ledger.
  const recordedSpend = campaignUsage(state.rounds).usd
  const spentUsd = Math.max(Number(state.budget.spentUsd) || 0, recordedSpend)
  // Preflight: money already spent is not the whole question. A campaign at 90%
  // of its cap used to dispatch another round and blow straight through it. The
  // best available predictor of the next round is this campaign's own measured
  // mean (0 when it has never measured one — an empty ledger must not invent a
  // cost and block the first round).
  const capUsd = Number(state.budget.usd)
  const estimatedUsd = estimatedRoundCost(state.rounds)
  const projectedUsd = Math.round((spentUsd + estimatedUsd) * 1e6) / 1e6
  const exhausted = spentUsd >= capUsd
  const unaffordable = estimatedUsd > 0 && Number.isFinite(capUsd) && projectedUsd > capUsd + 1e-9
  // Money is only half of what a round consumes: the provider meters tokens
  // even when the dollars still fit, so a campaign can sit inside its USD cap
  // and be out of the allowance its account actually sells. The token cap has
  // the same shape as the dollar one: spend comes from the round ledger's
  // measured `tokens`, the estimate is their mean, and a campaign that has
  // measured nothing projects nothing — 0 means unknown, never free and never
  // empty, so the first round is never blocked by a cap it cannot reason about.
  const rawTokenCap = state.budget.tokens
  const capTokens = rawTokenCap == null ? NaN : Number(rawTokenCap)
  const hasTokenCap = Number.isFinite(capTokens)
  const spentTokens = recordedRoundTokens(state.rounds)
  const estimatedTokens = estimatedRoundTokens(state.rounds)
  const projectedTokens = spentTokens + estimatedTokens
  const tokensMeasured = spentTokens > 0 || estimatedTokens > 0
  const tokensExhausted = hasTokenCap && tokensMeasured && spentTokens >= capTokens
  const tokensUnaffordable = hasTokenCap && tokensMeasured && projectedTokens > capTokens
  const hitTokens = tokensExhausted || tokensUnaffordable
  if (exhausted || unaffordable || tokensExhausted || tokensUnaffordable) {
    // Close the round out explicitly before stopping the campaign: a round that
    // silently vanishes leaves the ledger ambiguous about why no work started.
    // Both projections travel on the record whichever cap fired, so a reader
    // can see the whole affordability picture without replaying the preflight.
    runtime.append(
      view,
      'round.finished',
      {
        n,
        status: 'budget',
        score: null,
        promoted: false,
        // Planning never began: nothing was skipped, so the flag is a real false.
        planTimedOut: false,
        planMode,
        reason: hitTokens ? 'tokens' : 'usd',
        spentUsd,
        estimatedUsd,
        projectedUsd,
        spentTokens,
        estimatedTokens,
        projectedTokens,
      },
      'system',
    )
    runtime.append(
      view,
      'campaign.status',
      { status: 'converged', reason: hitTokens ? 'token budget exhausted' : 'cost budget exhausted' },
      'system',
    )
    const usdMessage = exhausted
      ? `spend $${spentUsd.toFixed(4)} reached cap $${state.budget.usd}`
      : `spend $${spentUsd.toFixed(4)} + estimated round $${estimatedUsd.toFixed(4)} would cross cap $${state.budget.usd}`
    const tokenMessage = tokensExhausted
      ? `tokens ${spentTokens} reached cap ${capTokens}`
      : `tokens ${spentTokens} + estimated round ${estimatedTokens} would cross cap ${capTokens}`
    raise('budget', {
      message: hitTokens ? tokenMessage : usdMessage,
      spentUsd,
      estimatedUsd,
      projectedUsd,
      spentTokens,
      estimatedTokens,
      projectedTokens,
      ...(hasTokenCap ? { capTokens } : {}),
    })
    return
  }
  const tasks = state.evalset.tasks.filter((t) => !state.evalset.holdout.includes(t.id))
  if (!tasks.length) {
    raiseSetup({ message: 'no evaluation tasks registered' })
    return
  }
  const picked = pickTask(tasks, state.rounds, { round: n })
  let task = picked.task
  if (!task && picked.allSolved) {
    // A direct call to runRound is an explicit request for one round. The
    // campaign loop avoids this case (tickCampaign finishes a solved campaign
    // first), so honour the request: rotate over the full pool and let the gate
    // report the no-gain instead of returning before the round exists.
    task = pickTask(tasks, [], { round: n }).task
  }
  if (!task) {
    raiseSetup({ message: 'no task available for this round' })
    return
  }
  const acceptance = acceptanceVerifier({ task, chain })
  // A campaign may make the autopilot guard the tail of its own verify command.
  // The verifier then produces exactly the verdict the guard would reproduce, so
  // the guard clause is not spawned a second time after the patch lands. The
  // clause is also removed from the command the verifier is handed — that is
  // what makes the reuse real rather than a second run under a different name.
  const verifyGuard = state.autopilot?.enabled === true && state.autopilot.guard ? String(state.autopilot.guard) : null
  const guardReusedByVerifier = Boolean(verifyGuard && acceptance.spec && guardIsPartOf(acceptance.spec.cmd, verifyGuard))
  const acceptanceSpec = guardReusedByVerifier
    ? { ...acceptance.spec, cmd: stripGuardClause(acceptance.spec.cmd, verifyGuard) }
    : acceptance.spec
  // The brief still names the whole acceptance command: the guard is part of the
  // criteria the worker must satisfy, even when the loop does not spawn it twice.
  const verifyCmd = acceptance.spec?.cmd || 'echo no-verifier && exit 1'
  let candidates = Math.max(1, Math.min(4, Number(policy.candidates ?? chain.params?.candidates) || 1))
  // Sampling a second candidate cannot beat a first one that already scores
  // 1.0, so `cascade` buys the next opinion only while the result leaves room
  // to improve. Read from the config directly, not from `effectivePolicy`:
  // policy normalization is a whitelist and would silently drop the mode. The
  // default stays `parallel`, so every existing campaign is unchanged.
  //
  // Three sources, in order: an explicit setting always wins; otherwise a
  // campaign may opt into reading its own record (`autoCandidateMode`), which
  // only infers `cascade` when its recent rounds show a second opinion never
  // mattered; otherwise `parallel`. The source travels on `round.finished` so an
  // inferred mode is never passed off as something the operator configured.
  const configuredMode = config.loopPolicy?.candidateMode
  let candidateModeSource =
    configuredMode === 'cascade' || configuredMode === 'parallel'
      ? 'config'
      : config.loopPolicy?.autoCandidateMode === true
        ? 'auto'
        : 'default'
  const candidateMode =
    candidateModeSource === 'config'
      ? configuredMode
      : candidateModeSource === 'auto'
        ? adaptiveCandidateMode(state.rounds)
        : 'parallel'
  // A priced hedge, not a habit: when the campaign's own record says a second
  // opinion is not worth its tail, plan one candidate and name the evidence that
  // decided it. `secondCandidate: 'always'` is an instruction and is never
  // overruled by statistics; a record that cannot price the hedge leaves the
  // configured count untouched. `cascade` already buys the next opinion only
  // when the first leaves room, so pricing it again would double-charge.
  const secondCandidatePreference = config.loopPolicy?.secondCandidate
  let secondCandidate = null
  if (candidateMode === 'parallel' && secondCandidatePreference !== 'always') {
    const priced = secondCandidateGate(state.rounds)
    if (priced) {
      secondCandidate = priced
      if (!priced.admit) {
        candidates = 1
        candidateModeSource = 'evidence'
      }
    }
  }
  // Which attempt gets the lessons rotates with the round, so the control is
  // not always a1 (see src/runtime/exposure.js).
  const exposed = exposeIndexes(candidates, n)
  const workspace = state.workspace
  if (!workspace) {
    raiseSetup({ message: 'campaign has no workspace' })
    return
  }

  if (leanSpecOf(task) && config.lean?.enabled !== false) {
    const probe = runtime.leanProbe?.() || { available: false, install: null }
    if (!probe.available) {
      raiseSetup({
        message: `task ${task.id} declares a Lean claim but no Lean toolchain was found; install it or drop the claim`,
        install: probe.install ?? null,
      })
      return
    }
  }

  runtime.append(view, 'round.started', { n, taskId: task.id, chainVersion: state.chain.activeVersion }, 'system')
  log(`round ${n} starting on task ${task.id}, ${candidates} candidate(s)`)
  const roundStartedAt = Date.now()
  let verifierRuns = 0
  let verifierMs = 0
  // Wall time spent in the pre-map nodes (planning). Kept separate from the
  // round clock so `planMs` + candidate time + verifier time is legible.
  let planMs = 0
  // True only when this round's planner hit its own deadline. It travels on
  // `round.finished` so "planned nothing" is distinguishable from "planned well".
  let planTimedOut = false
  // Whether the round's planner actually handed the workers something to work
  // with. Null when the chain has no planner (nothing was bought), false when it
  // was bought and came back empty, true when at least one finding reached the
  // briefs. Without this the ledger cannot tell a planner that helped from one
  // that burned a deadline and returned nothing — measured over 117 instrumented
  // rounds here, that silent bucket is 46 rounds (39%), larger than the timed-out
  // one everyone was watching.
  let planUsable = null

  const attempts = []
  const board = boardPath(view.dir, n)
  const plan = []
  for (let i = 1; i <= candidates; i += 1) plan.push({ i, attemptId: `r${n}a${i}` })
  const holdoutFamilies = (state.evalset.holdout || []).slice(0, 50)
  const screening = screenEnabled({ task, config: { ...config, halving: { ...config.halving, enabled: policy.halving } }, candidates })
  const screenInfo = new Map()
  let survivors = plan.map((p) => p.attemptId)
  let best = null
  // Recorded on `round.finished` so a cheaper round says what it did not buy.
  let skippedCandidates = 0
  // Candidates whose session was stopped because a sibling had already solved
  // the task. Counted separately from skippedCandidates: they were dispatched,
  // and their records carry the evidence they had produced up to the stop.
  let abortedCandidates = 0
  const modeRecord = () => ({
    candidateMode,
    candidateModeSource,
    candidatesPlanned: candidates,
    skippedCandidates,
    abortedCandidates,
    planMode,
    // The deadline the planner actually ran under, so a reader can tell "it ran
    // out of the time it was given" from "it was given a shorter leash today".
    planBudgetMs: planTimeoutMs,
    ...(secondCandidate ? { secondCandidate } : {}),
  })
  try {
    // Shared reconnaissance first: these nodes are the work that makes the
    // parallel attempts smart, and their findings reach every worker brief.
    // A chain without one dispatches exactly as it always did.
    // Planning is bought per policy. When the mode is 'off' the whole pre-map
    // stage is skipped — no dispatch, no throwaway worktree, no cache lookup —
    // and the round records a real 0 ms instead of clock noise.
    const planNodes = planMode === 'off' ? [] : preMapAgentNodes(chain)
    let planFindings = []
    if (planNodes.length) {
      const planStartedAt = Date.now()
      const planResult = await runPreMapNodes({
        runtime,
        view,
        state,
        config,
        dispatcher,
        task,
        chain,
        round: n,
        planTimeoutMs,
        log,
      })
      planFindings = planResult.findings
      planTimedOut = planResult.planTimedOut
      planMs = Math.max(0, Date.now() - planStartedAt)
      planUsable = Array.isArray(planFindings) && planFindings.length > 0
    }
    if (screening) {
      const results = []
      for (const p of plan) {
        const res = await screenCandidate({ runtime, view, state, config, dispatcher, task, attemptId: p.attemptId, workerId, models, log })
        screenInfo.set(p.attemptId, res)
        results.push({ id: p.attemptId, ok: res.ok, score: res.ok ? 1 : 0 })
      }
      const picked = pickSurvivors(results, { keepRatio: config.halving.keepRatio })
      survivors = picked.survivors.length ? picked.survivors : [plan[0].attemptId]
      for (const id of picked.dropped) {
        const rec = {
          id,
          round: n,
          chainVersion: state.chain.activeVersion,
          branch: `loom/${state.id}/${id}`,
          worktree: join(runtime.home, 'worktrees', state.id, id),
          verifierOk: false,
          score: 0,
          screenedOut: true,
          screen: screenInfo.get(id),
          error: 'screened out before the real attempt',
          durationMs: 0,
        }
        attempts.push(rec)
        runtime.append(view, 'attempt.finished', rec, 'system')
        log(`round ${n}: ${id} screened out (${picked.keep} kept)`)
      }
    }
    // Candidates are independent — own worktree, own session, own verifier — so
    // the only thing that ever made a round cost the sum of their runs was this
    // loop awaiting each one. Dispatch them through a pool capped at
    // session.maxConcurrent; a cap of 1 keeps the old sequential behaviour, and
    // no configured cap means "run them all" rather than "never dispatch".
    const dispatchPlan = plan.filter((p) => survivors.includes(p.attemptId))
    // Cascade is serial by definition: the whole saving comes from deciding
    // after one candidate rather than buying both at once. Parallel keeps the
    // configured pool exactly as before.
    const limit = candidateMode === 'cascade' ? 1 : dispatchLimit(config, dispatchPlan.length)
    const records = new Map()
    // The abort hooks the dispatcher hands each running attempt in `onStart`.
    // A candidate that satisfies the task outright uses them to stop its
    // siblings instead of paying for sessions whose result the gate cannot use.
    const aborts = new Map()
    const stoppedBySibling = new Set()
    let solvedBy = null
    const stopForSibling = (id, abort) => {
      // A dispatcher that never registers a hook (a plain embedder) simply
      // keeps its candidates: stopping is an optimisation, not a requirement.
      if (typeof abort !== 'function') return
      stoppedBySibling.add(id)
      try {
        abort()
      } catch {
        /* the child may have finished between the check and the call */
      }
    }
    const runCandidate = async ({ i, attemptId }) => {
      const wtPath = join(runtime.home, 'worktrees', state.id, attemptId)
      const branch = `loom/${state.id}/${attemptId}`
      const startedAt = Date.now()
      // The exposed candidate sees the lessons; every other candidate is the
      // control. Rotating the exposed index is what turns the paired delta into
      // evidence about the lesson instead of about the a1/a2 slot.
      const treated = exposed.includes(i - 1)
      const phase = treated ? 'exploit' : 'explore'
      let record = {
        id: attemptId,
        round: n,
        chainVersion: state.chain.activeVersion,
        branch,
        worktree: wtPath,
        verifierOk: false,
        score: 0,
        error: null,
        phase,
        screened: screening ? screenInfo.get(attemptId) ?? null : null,
      }
      try {
        const base = await headCommit(workspace).catch(() => null)
        await createWorktree({ repo: workspace, dir: wtPath, branch })
        const notes = readNotes(board, { kinds: ['obstacle', 'finding'], limit: 5, excludeAttempt: attemptId })
        const lessons = treated && policy.knowledge && config.knowledge?.enabled
          ? selectLessons(state.lessons || [], {
              round: n,
              task,
              phase,
              limit: config.knowledge.maxShown,
              excludeFamilies: holdoutFamilies,
            })
          : []
        // The deadline is decided before the brief so the brief can state it.
        // It is written on the lease and the `attempt.deadline` event below, so
        // an interrupted attempt leaves behind the minute it was owed to end by
        // instead of a window reconstructed later.
        const timeoutMs = config.session.attemptTimeoutMs
        let brief = attemptBrief({
          chain,
          state,
          task,
          verifyCmd,
          worktree: wtPath,
          attemptId,
          index: i,
          total: candidates,
          notes,
          lessons,
          plan: planFindings,
          budgetMs: timeoutMs,
        })
        let retried = null
        const deadlineAt = Date.now() + timeoutMs
        record = { ...record, timeoutMs, deadlineAt }
        runtime.append(view, 'attempt.deadline', { round: n, attemptId, timeoutMs, deadlineAt }, 'system')
        writeLease(view.dir, { attemptId, round: n, deadline: deadlineAt })
        // Every session this attempt starts is registered here, because the
        // abort hook is the only lever a sibling has on a running candidate.
        const startedHook = ({ sessionId, abort, deadline }) => {
          updateLease(view.dir, attemptId, { sessionId, deadline })
          aborts.set(attemptId, abort)
          runtime.watchAttempt({ attemptId, sessionId, abort, deadline, campaign: state.id })
          // The winner may have crossed the line while this session was still
          // starting; stop it now rather than pay for a run it cannot affect.
          if (solvedBy && solvedBy !== attemptId) stopForSibling(attemptId, abort)
        }
        let runRes = await dispatcher.run(brief, {
          cwd: wtPath,
          timeoutMs,
          // The label names the chain node the attempt implements; the
          // campaign already owns this parent, so repeating its id would only
          // crowd out the part a reader cannot recover from the brief — which
          // node of the chain produced this dispatch.
          label: `loom:${workerId}:r${n}a${i}`,
          model: config.models.worker || null,
          models,
          onStart: startedHook,
        })
        // A context overflow is a packaging problem, not a code problem: the
        // child never got to work. Retry once with a brief that carries less
        // (no notes, no lessons, no plan) before writing the attempt off.
        let outcomeKind = runRes.failureKind ?? classifyResult(runRes)
        if (outcomeKind === 'context') {
          retried = 'smaller-brief'
          const remainingMs = Math.max(1000, deadlineAt - Date.now())
          const smaller = attemptBrief({
            chain,
            state,
            task,
            verifyCmd,
            worktree: wtPath,
            attemptId,
            index: i,
            total: candidates,
            notes: [],
            lessons: [],
            plan: [],
            maxChars: Math.max(1200, Math.floor(brief.length * 0.5)),
            // The retry runs under what is left of the same clock.
            budgetMs: remainingMs,
          })
          log(`attempt ${attemptId}: context overflow, retrying with a ${smaller.length}-char brief`)
          brief = smaller
          writeLease(view.dir, { attemptId, round: n, deadline: Date.now() + timeoutMs })
          runRes = await dispatcher.run(brief, {
            cwd: wtPath,
            timeoutMs,
            label: `loom:${workerId}:r${n}a${i}:retry`,
            model: config.models.worker || null,
            models,
            onStart: startedHook,
          })
        }
        if (retried) outcomeKind = runRes.failureKind ?? classifyResult(runRes)
        // Did the dispatcher stop this child on the clock, or did the child come
        // back on its own and only then get written off? The distinction decides
        // whether work already in the worktree may be salvaged below: a stopped
        // child left its tree behind at the deadline, while a late claim is an
        // attempt that ignored the budget and must not be rewarded for it.
        const stoppedByDeadline = runRes.timedOut === true
        // The round decides what counts as finished, not the dispatcher. A child
        // that wakes up after `deadlineAt` and reports a completed turn has still
        // missed its budget: promoting it would make the deadline advisory, and a
        // stuck attempt could come back later and claim the round. Record a late
        // "ok" as a timeout so the verifier's verdict cannot outrank the clock.
        // Failures keep their own kind (exhaustion, a crash) instead of being
        // relabelled after the fact.
        if (Date.now() > deadlineAt && runRes.timedOut !== true && outcomeKind === 'ok') {
          outcomeKind = 'timeout'
          runRes = {
            ...runRes,
            timedOut: true,
            stopReason: 'timedOut',
            failureKind: 'timeout',
            error: runRes.error ?? `attempt answered after its ${timeoutMs}ms deadline`,
          }
        }
        runtime.unwatchAttempt(attemptId)
        aborts.delete(attemptId)
        // What the watchdog observed when it gave up: whether the session ever
        // advanced, and how long it had been quiet. 145 of 420 attempts died
        // without a diagnostic, and the decision about what to do next (rebuild,
        // retry, change provider) turns on this evidence -- which used to exist
        // only in memory for the seconds the round was finishing.
        //
        // Read the observation before the verdict: `stallReason` consumes the
        // watchdog bookkeeping, `stallEvidence` only looks at it.
        const heartbeat = typeof runtime.stallEvidence === 'function' ? runtime.stallEvidence(attemptId) : null
        const stall = heartbeat?.reason ?? runtime.stallReason(attemptId)
        // Two ways an attempt can be written off: the host stopped it, or this
        // round stopped it because a sibling already satisfied the task. The
        // second is not a failure, so it carries its own reason and the record
        // and the event agree on it. A sibling that finished its turn before the
        // abort landed completed normally, so it keeps its own evidence.
        const cancelledBySibling = stoppedBySibling.has(attemptId) && runRes.stopReason !== 'completed' && runRes.timedOut !== true
        const abandoned = cancelledBySibling
          ? SOLVED_BY_SIBLING
          : runRes.stopReason === 'aborted' && !runRes.timedOut
            ? stall || 'interrupted'
            : null

        // The patch is the candidate's evidence; hash it before the verifier so
        // a byte-identical candidate can inherit a verdict this campaign has
        // already paid for instead of spawning the command again.
        const patch = await makePatch({
          dir: wtPath,
          outFile: join(view.dir, 'artifacts', `r${n}a${i}.patch`),
          base: base ?? 'HEAD',
        }).catch(() => null)
        // The task's own verifier wins; a chain-level verifier is a fallback for
        // tasks that state no acceptance command. With neither, the attempt has
        // no proof and must fail closed instead of throwing.
        const verifierCwd = acceptance.source === 'chain' && acceptance.cwd ? resolve(wtPath, acceptance.cwd) : wtPath
        // An abandoned attempt's tree is unfinished work: verifying it would buy
        // a verdict the round cannot use, and could even score work the winner
        // already replaced. It keeps the patch and diff it had and stops there.
        const verified = abandoned
          ? { reused: false, skipped: true, verdict: abandonedVerdict(abandoned, verifierCwd) }
          : acceptanceSpec
            ? await verifyOnce({
                dir: view.dir,
                patchFile: patch?.path ?? null,
                keySuffix: `${acceptanceSpec.cmd}\n${acceptanceSpec.cwd ?? ''}\n${config.verify.timeoutMs ?? ''}`,
                cwd: verifierCwd,
                base,
                run: () => runVerifier(acceptanceSpec, { cwd: verifierCwd, timeoutMs: config.verify.timeoutMs, env: verifierEnv }),
              })
            : {
                reused: false,
                verdict: {
                  ok: false,
                  exitCode: null,
                  signal: null,
                  timedOut: false,
                  durationMs: 0,
                  stdout: '',
                  stderr: 'no verifier: the task has no verify.cmd and the chain defines no verifier node',
                  metrics: {},
                  command: null,
                  cwd: wtPath,
                },
              }
        const ver = verified.verdict
        // Only a real spawn is a verifier run; a reused (or skipped) verdict costs nothing.
        if (!verified.reused && !verified.skipped) {
          verifierRuns += 1
          verifierMs += Math.max(0, Number(ver.durationMs) || 0)
        }
        let lean = null
        if (!verified.skipped) {
          try {
            lean = await runTaskLeanGate({ task, config, worktree: wtPath })
          } catch (err) {
            lean = {
              ok: false,
              violations: [{ code: 'internal', detail: String(err?.message ?? err) }],
              axioms: null,
              durationMs: 0,
            }
          }
        }
        // A child that never finished its turn cannot have produced verified
        // work, even if the verifier happens to pass on an untouched tree. Only a
        // completed turn counts as evidence; everything else is a failed attempt.
        //
        // One exception, measured rather than assumed: when the dispatcher stopped
        // the child at its deadline (`stoppedByDeadline`), whatever is in the tree
        // is the work the budget already bought. Two live rounds threw away 1,203 s
        // that way — both stopped attempts had left patches that satisfy their own
        // spec. Refusing them does not enforce the budget (it is spent); it only
        // guarantees the round pays twice. So a stopped attempt whose tree verifies
        // is salvaged, and says so, so nothing downstream mistakes it for a clean win.
        const salvaged = stoppedByDeadline && outcomeKind === 'timeout' && ver.ok === true && (lean ? lean.ok : true)
        const gateOk = (ver.ok && (lean ? lean.ok : true) && outcomeKind === 'ok') || salvaged
        // A verifier run is a cost centre of its own: it is the part of the round
        // the agent cannot speed up. Record it so the efficiency leg has a number.
        // An abandoned attempt did not run the verifier, so it has no event.
        if (!verified.skipped) {
          runtime.append(
            view,
            'verifier.finished',
            {
              round: n,
              attemptId,
              ok: ver.ok === true,
              exitCode: ver.exitCode ?? null,
              timedOut: ver.timedOut === true,
              durationMs: verified.reused ? 0 : Math.max(0, Number(ver.durationMs) || 0),
              lean: lean ? lean.ok === true : null,
              command: ver.command ?? null,
              ...(verified.reused ? { reused: true } : {}),
            },
            'system',
          )
        }
        const diff = await diffStat({ dir: wtPath }).catch(() => ({ files: 0, insertions: 0, deletions: 0, filesChanged: [] }))
        const score = scoreAttempt({
          attemptId,
          taskScores: { [task.id]: gateOk ? 1 : 0 },
          verifierOk: gateOk,
          metrics: ver.metrics,
        })
        const spend = usageOfSession(runtime.ctx, runRes.sessionId, pricing.table)
        const parsed = parseAttemptReport(runRes.text || '')
        const report = parsed.ok ? parsed.report : null
        // A session that reported tokens already priced them. When it published
        // no usage at all, `tokensOf` still counts the brief and the answer —
        // bill that same fallback, or the record shows tokens with $0.00.
        const billed = hasTokens(spend.usage) ? spend : fallbackSpend(brief, runRes.text, pricing.table)
        record = {
          ...record,
          // The tree this attempt was cut against: salvage re-verifies against it.
          base: base ?? null,
          verifierOk: gateOk,
          exitCode: ver.exitCode,
          verifySignature: verifierSignature(ver),
          lean,
          timedOut: ver.timedOut || runRes.timedOut,
          abandoned: cancelledBySibling ? true : abandoned,
          ...(cancelledBySibling ? { reason: SOLVED_BY_SIBLING } : {}),
          durationMs: Date.now() - startedAt,
          score,
          metrics: ver.metrics,
          sessionId: runRes.sessionId,
          stopReason: runRes.stopReason,
          diff,
          patch: patch?.path ?? null,
          patchBytes: patch?.bytes ?? 0,
          report,
          reportError: parsed.ok ? null : parsed.error,
          notesShown: notes.length,
          lessons: lessons.map((l) => l.id),
          stdoutTail: (ver.stdout || '').split('\n').slice(-15).join('\n'),
          agentTail: (runRes.text || '').split('\n').slice(-12).join('\n'),
          usage: billed.usage,
          usageEstimated: billed.estimated === true,
          costUsd: billed.usd,
          priceSource: pricing.source,
          tokens: tokensOf(billed, brief, runRes.text),
          textChars: (runRes.text || '').length,
          error: runRes.error,
          failureKind: outcomeKind,
          ...(salvaged ? { salvaged: true } : {}),
          // Did this child ever get to try? The round is scored on attempts that
          // ran, so the answer has to travel with the attempt instead of being
          // re-derived from error text later.
          ...(runRes.infra === true ? { infra: true, infraRetry: runRes.infraRetry === true } : {}),
          model: runRes.model ?? null,
          modelsTried: runRes.modelsTried ?? null,
          modelSwitch: runRes.modelSwitch ?? null,
          retried,
          // The liveness evidence the watchdog had, when it had any. Absent means
          // nothing wrote this attempt off (it finished or failed on its own).
          ...(heartbeat ? { heartbeat } : {}),
        }
        // One-shot success: every sibling still running cannot change the
        // outcome, so stop them through the dispatcher's own abort hook rather
        // than waiting out sessions whose result the gate will never read. The
        // hooks are walked after `solvedBy` is set, so a sibling that starts
        // its session later still sees the win instead of running to the end.
        if (record.verifierOk === true && Number(record.score) === 1) {
          solvedBy = attemptId
          for (const [id, stop] of aborts) {
            if (id === attemptId) continue
            stopForSibling(id, stop)
          }
        }
        try {
          updateLease(view.dir, attemptId, {
            state: abandoned ? 'abandoned' : 'done',
            reason: abandoned,
            endedAt: Date.now(),
          })
          if (abandoned) {
            appendNote(board, {
              attempt: attemptId,
              kind: 'obstacle',
              text: `attempt was written off (${abandoned}) before it finished; treat anything it left as unverified`,
            })
          } else if (!gateOk) {
            const why =
              lean && !lean.ok
                ? `lean gate failed: ${tailOf((lean.violations || []).map((v) => `${v.code}: ${v.detail}`).join('; '), 180)}`
                : `verifier failed: ${tailOf(ver.stderr || ver.stdout, 180)}`
            appendNote(board, { attempt: attemptId, kind: 'obstacle', text: why })
          } else {
            const hint = report?.nextHint || (report?.why ? tailOf(report.why, 180) : '')
            if (hint) appendNote(board, { attempt: attemptId, kind: 'finding', text: hint })
          }
        } catch (err) {
          log(`attempt ${attemptId}: board or lease update failed:`, err?.message ?? err)
        }
      } catch (err) {
        aborts.delete(attemptId)
        // A sibling that was stopped mid-flight may surface as a thrown run;
        // record it the same way as a resolved abort instead of a crash.
        const cancelled = stoppedBySibling.has(attemptId)
        record = {
          ...record,
          ...(cancelled ? { abandoned: true, reason: SOLVED_BY_SIBLING } : {}),
          durationMs: Date.now() - startedAt,
          failureKind: 'crash',
          error: String(err?.message ?? err),
        }
        log(`attempt ${attemptId} failed:`, record.error)
        try {
          updateLease(view.dir, attemptId, { state: 'failed', reason: record.error, endedAt: Date.now() })
        } catch {
          /* best effort */
        }
      }
      return record
    }
    let cursor = 0
    let dispatched = 0
    // "Solved outright" is the round's own criterion, not a metaphor: the
    // verifier passed AND the score is already the maximum. A second candidate
    // cannot beat 1.0, so in cascade mode its run would be bought for nothing.
    const solvedOutright = (rec) => Boolean(rec) && rec.verifierOk === true && Number(rec.score) === 1
    const cascadeSatisfied = () =>
      candidateMode === 'cascade' && [...records.values()].some(solvedOutright)
    const workerCount = Math.min(limit, dispatchPlan.length)
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        for (;;) {
          // The pool is serial in cascade mode, so every record here is final:
          // one perfect candidate ends the round instead of buying a second opinion.
          if (cascadeSatisfied()) return
          const at = cursor
          cursor += 1
          if (at >= dispatchPlan.length) return
          dispatched += 1
          const item = dispatchPlan[at]
          // runCandidate catches its own failures; this guard only protects the
          // pool itself from an unexpected throw in its bookkeeping.
          try {
            records.set(item.attemptId, await runCandidate(item))
          } catch (err) {
            records.set(item.attemptId, {
              id: item.attemptId,
              round: n,
              chainVersion: state.chain.activeVersion,
              branch: `loom/${state.id}/${item.attemptId}`,
              worktree: join(runtime.home, 'worktrees', state.id, item.attemptId),
              verifierOk: false,
              score: 0,
              error: String(err?.message ?? err),
              durationMs: 0,
            })
          }
        }
      }),
    )
    // Planned minus dispatched is the whole saving; parallel never skips.
    skippedCandidates = candidateMode === 'cascade' ? Math.max(0, dispatchPlan.length - dispatched) : 0
    // Emit in plan order, not completion order: the round ledger keeps the
    // same shape it has always had regardless of which candidate finished first.
    for (const { attemptId } of plan) {
      if (!survivors.includes(attemptId)) continue
      const record = records.get(attemptId)
      if (!record) continue
      attempts.push(record)
      // Counted from the record, not from the signal: an attempt that stopped
      // by itself before the abort landed was not aborted, however late it was.
      if (record.reason === SOLVED_BY_SIBLING) abortedCandidates += 1
      runtime.append(view, 'attempt.finished', record, 'system')
      if (record.abandoned) {
        runtime.append(
          view,
          'attempt.abandoned',
          { id: attemptId, round: n, reason: record.reason ?? record.abandoned },
          'system',
        )
      }
    }
    // Every model in the chain burned its budget. No gate can pass on work that
    // never ran, so closing this as `no-gain` would let plateau detection keep
    // paying for the same wall round after round. Exhaustion is an operator
    // problem: name it, ask once, and stop spending on this round.
    if (attempts.length > 0 && attempts.every((a) => a.failureKind === 'exhausted')) {
      const models = [...new Set(attempts.flatMap((a) => a.modelsTried || []))]
      const exhaustedSpend = attempts.reduce((sum, a) => sum + (Number(a.costUsd) || 0), 0)
      if (exhaustedSpend > 0) {
        runtime.append(view, 'budget.spent', { usd: exhaustedSpend, attempts: attempts.length }, 'system')
      }
      runtime.append(
        view,
        'round.finished',
        { n, status: 'exhausted', score: 0, promoted: false, planTimedOut, planUsable, models, ...modeRecord(), ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs, planMs, pricing.source) },
        'system',
      )
      // A folding runtime already materialized the round above; one that only
      // records events leaves it missing from the caller's view. Project it so
      // both see why the round stopped.
      projectRound(view.state, {
        n,
        taskId: task.id,
        status: 'exhausted',
        score: 0,
        promoted: false,
        attempts,
      })
      raise('exhausted', {
        message: `every model in the chain is out of budget; round ${n} could not run`,
        round: n,
        taskId: task.id,
        models,
        attempts: attempts.map((a) => ({ id: a.id, model: a.model ?? null, modelsTried: a.modelsTried ?? [] })),
      })
      return { status: 'exhausted', round: n, score: 0, promoted: false, taskId: task.id, models }
    }
    // The host re-applied the plugin while the candidates were in flight, which
    // disposed the dispatcher, or the model layer broke mid-turn (two tool-call
    // JSON objects glued together, a context-length 400): every attempt came back
    // without ever reaching its worktree. Nothing was tried, so a score here would
    // be a 0 measured on a patch that never ran, and `no-gain` would turn that
    // non-measurement into standing evidence against the task - in loom-acc3 that
    // produced eleven rounds of false "unsolvable" verdicts from a provider
    // outage. Close the round as interrupted and say it is worth repeating. A
    // round with at least one attempt that actually ran (a diagnosed child death,
    // a verified failure) is never interrupted this way.
    const dispatchedAttempts = attempts.filter((a) => !a.screenedOut)
    if (dispatchedAttempts.length > 0 && dispatchedAttempts.every(lostToInfrastructure)) {
      const lostSpend = attempts.reduce((sum, a) => sum + (Number(a.costUsd) || 0), 0)
      if (lostSpend > 0) {
        runtime.append(view, 'budget.spent', { usd: lostSpend, attempts: attempts.length }, 'system')
      }
      const byDisposal = dispatchedAttempts.every(lostToDisposal)
      runtime.append(
        view,
        'round.finished',
        {
          n,
          status: 'interrupted',
          // The caller must know the round is worth trying again: it measured
          // nothing about the task, and nothing about it may be written off.
          retryable: true,
          // No score at all: 0 is the measurement of a patch that ran and failed.
          score: null,
          promoted: false,
          reason: byDisposal ? 'dispatcher-disposed' : 'infrastructure',
          planTimedOut,
          planUsable,
          ...modeRecord(),
          ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs, planMs, pricing.source),
        },
        'system',
      )
      // A folding runtime already materialized the round above; a bare embedder
      // only records events. Project it so both see why the round stopped.
      projectRound(view.state, {
        n,
        taskId: task.id,
        status: 'interrupted',
        score: null,
        promoted: false,
        // The streak counter reads this: a round interrupted by a re-apply and one
        // interrupted by a broken provider are different problems.
        reason: byDisposal ? 'dispatcher-disposed' : 'infrastructure',
        attempts,
      })
      log(`round ${n}: every attempt was lost to a plugin re-apply (dispatcher disposed); round interrupted, not scored`)
      // Three outages in a row is a broken machine, not a hard task. Stop spending
      // the operator's budget on it and say the true reason once, so nobody is
      // invited to "adjust the objective" when the fix is to wait or switch models.
      // Count from the log minus this round, plus this one: a folding runtime has
      // already materialized it and a bare embedder has not, and both must agree.
      const priorRounds = (view.state?.rounds || []).filter((r) => r && r.n !== n)
      const streak = byDisposal ? 0 : consecutiveInfraRounds(priorRounds) + 1
      if (streak >= campaignPolicy.infraPauseAfter) {
        runtime.append(
          view,
          'campaign.status',
          { status: 'paused', reason: 'infrastructure', rounds: streak },
          'system',
        )
        raise('infrastructure', {
          message: `${streak} rounds in a row died before any child got to work (the model layer ended the turn with no diagnostic); the loop is paused rather than spending more budget on a broken provider`,
          rounds: streak,
          roundsList: (view.state?.rounds || []).slice(-streak).map((r) => r.n),
          hint: 'rsi_control {action:"resume"} once the provider is healthy, or set models.fallback to another model',
        })
        log(`round ${n}: ${streak} infrastructure rounds in a row; campaign paused`)
        return { status: 'interrupted', round: n, retryable: true, score: null, promoted: false, taskId: task.id, paused: true }
      }
      return { status: 'interrupted', round: n, retryable: true, score: null, promoted: false, taskId: task.id }
    }
    try {
      pruneNotes(board, { max: 20 })
    } catch {
      /* board pruning is never fatal */
    }

    // Paired evidence: the exposed attempt (which saw lessons) against an
    // unexposed control of the same round. Which attempt is which rotates by
    // round, so `pairedImpacts` finds the control by "saw no lessons" instead of
    // by position. Nothing is learned from a single unevaluated success; the
    // control is what makes the comparison mean something.
    try {
      // An abandoned attempt was stopped, not evaluated: counting its zero
      // against a lesson would read as harm the lesson never caused.
      const impacts = pairedImpacts({ attempts: attempts.filter((a) => !a.abandoned), round: n })
      if (impacts.length) {
        for (const imp of impacts) {
          runtime.append(
            view,
            'lesson.impact',
            {
              id: imp.lessonId,
              delta: imp.delta,
              harm: imp.outcome === 'harm',
              round: n,
              attempt: imp.treatedId,
              control: imp.controlId,
            },
            'system',
          )
        }
        const next = applyImpacts(state.lessons || [], impacts, { round: n })
        const activeIds = new Set((state.lessons || []).filter((l) => l.status === 'active').map((l) => l.id))
        for (const l of next) {
          if (!activeIds.has(l.id)) continue
          if (shouldQuarantine(l, { minHarm: config.knowledge?.quarantineHarm ?? 2 })) {
            runtime.append(
              view,
              'lesson.quarantined',
              {
                id: l.id,
                reason: `paired evidence: gain ${l.gainSum} over ${l.useCount} use(s), ${l.harmCount} harm(s)`,
              },
              'system',
            )
          }
        }
      }
    } catch (err) {
      log('lesson impact evaluation failed:', err?.message ?? err)
    }

    const ranked = rankAttempts(attempts.map((a) => ({ ...a, score: a.score || 0 })))
    best = ranked.best
    const score = best?.score ?? 0
    const roundCost = attempts.reduce((sum, a) => sum + (Number(a.costUsd) || 0), 0)
    if (roundCost > 0) {
      runtime.append(view, 'budget.spent', { usd: roundCost, attempts: attempts.length }, 'system')
    }
    runtime.append(view, 'candidate.proposed', { id: best?.id ?? `r${n}a0`, kind: 'attempt', version: n }, 'system')

    const taskBest = bestPriorScore(state.rounds, task.id, n)
    const checks = {
      verifierOk: Boolean(best?.verifierOk),
      hasPatch: Boolean(best?.patch) && (best?.patchBytes ?? 0) > 0,
      testsClean: !patchTouchesTests(best?.patch) && !(best?.diff?.filesChanged ?? []).some(touchesTests),
      beatsIncumbent: taskBest === null || score - taskBest >= policy.minGain - 1e-9,
    }
    // A win salvaged from a stopped attempt is still a win, but it is not the
    // same claim as one the child reported: the gate says which it was, so a
    // reader (and the efficiency leg) can tell "the loop solved this" from "the
    // loop ran out of clock on work that was already correct".
    const salvagedCandidates = attempts.filter((a) => a?.salvaged === true).length
    if (salvagedCandidates > 0) checks.salvaged = best?.salvaged === true
    // A verified attempt that changed nothing is not evidence of new work, but it IS
    // evidence the task is satisfied (an earlier landing already covered it). Applying
    // an empty patch fails in git apply, so record it as a no-op landing instead.
    // Decided before the holdout gate: a tree that has not changed since the
    // verifier passed has nothing new for a second opinion to check.
    checks.noop = checks.verifierOk && !checks.hasPatch && score > 0 && checks.beatsIncumbent
    // A verdict on a spec that was already green is not evidence of work. The
    // candidate was verified inside a worktree cut from this very tree, so the
    // question "did this command fail before the patch?" is answerable with one
    // run against the base -- and in the ledger it was never asked: 22 of the 103
    // landed rounds carried a passing candidate whose diff was empty.
    //
    // Only asked when there is a patch to justify: a no-op landing is the one case
    // where the empty diff *is* the finding.
    checks.baseFailed = 'skipped'
    if (checks.hasPatch && checks.verifierOk) {
      try {
        const spec = task.verify?.cmd ?? null
        const baseRes = await baseVerdict({
          dir: view.dir,
          cwd: state.workspace,
          taskId: task.id,
          base: best?.base ?? null,
          command: spec,
          run: () => runVerifier(task.verify, { cwd: state.workspace, timeoutMs: config.verify?.timeoutMs, env: verifierEnv }),
        })
        checks.baseFailed = baseRes.ok === false
      } catch (err) {
        // A base we could not measure is not a base that failed: leave the check
        // as 'skipped' so a broken verifier cannot quietly block every promotion.
        log('baseline check failed:', err?.message ?? err)
      }
    }
    // Holdout tasks are excluded from selection, so passing the visible verifier
    // proves less than it looks: a patch can special-case that task and break the
    // one held back. Run the holdout here, inside the winning candidate's
    // worktree, and let promotion wait for it. No holdout tasks means the check
    // is not applicable, which is recorded as 'skipped' rather than a pass.
    checks.holdout = 'skipped'
    // A failing holdout is the one rejection a worker could not see coming, so
    // keep the task id and the output it produced: the round status alone would
    // say `holdout-failed` without saying which task or what it printed.
    const holdoutFailures = []
    // The gate is paid after the candidates, so time it on its own clock: left
    // inside `durationMs` a round that spent its seconds proving a patch reads
    // as pure candidate work, and the loop looks slower than it is.
    let holdoutMs = 0
    let holdoutRuns = 0
    // One holdout per round, round-robin over stable ids (see `holdoutPick`).
    // Running the whole pool every round turns the holdout into a second spec
    // the loop can quietly learn: today's promotion was gated on exactly the
    // tests it was measured against, round after round. The pick is a function
    // of the sorted pool and the round number, not of declaration order or of
    // how many prior rounds this projection happens to hold: reordering the
    // holdouts cannot silently change which partition a given round tests.
    const heldOut = holdoutTasks(state)
    const holdout = holdoutPick(heldOut.map((t) => String(t.id)), n)
    const holdoutTask = holdout ? heldOut.find((t) => String(t.id) === holdout.id) ?? null : null
    // A candidate that verified with no captured diff but reports changed files
    // is a capture problem, not a completed no-op: the bytes it meant to change
    // are unproven, so the holdout still applies. Only a candidate that reports
    // no work at all has nothing left for a second opinion to check.
    const claimedWork = Array.isArray(best?.report?.changed) && best.report.changed.length > 0
    const skipHoldout = checks.noop && !claimedWork
    // `round.finished` names the task that actually ran: the status alone would
    // say `holdout-failed` without saying which pool entry caught the patch.
    // A skipped no-op names nothing because nothing ran.
    const holdoutId = skipHoldout ? null : holdout?.id ?? null
    // A holdout that runs the same command this tree has already passed is not
    // a second opinion: it cannot fail while the work verdict stands, so paying
    // for it buys a second identical answer and calls it independent evidence.
    // Measured over 210 rounds, 17 campaigns registered exactly this - a
    // `suite` holdout whose command is the work verifier's own tail - and the
    // gate fired once. Name the situation instead of re-running the command.
    const sameCommandHoldout = Boolean(
      acceptanceSpec &&
        holdoutTask &&
        normalizeCommand(holdoutTask.verify?.cmd) !== '' &&
        normalizeCommand(holdoutTask.verify?.cmd) === normalizeCommand(acceptanceSpec.cmd),
    )
    if (sameCommandHoldout && !skipHoldout) {
      checks.holdout = 'skipped-same-command'
    } else if (skipHoldout) {
      // The candidate verified without moving the tree, so the holdout would run
      // the same command against the same bytes the verifier just approved: a
      // second identical verdict at full gate cost. Say it was unnecessary
      // instead of paying for it; the no-op still lands through the normal path.
      // With no holdout task at all there was nothing to skip: keep 'skipped'.
      checks.holdout = holdoutTask ? 'skipped-noop' : 'skipped'
    } else if (holdoutTask) {
      const holdoutStartedAt = Date.now()
      checks.holdout = true
      if (!best?.worktree || best.screenedOut) {
        checks.holdout = false
        holdoutFailures.push({
          task: holdoutId,
          detail: 'the winning candidate had no worktree in which to run the holdout',
        })
      } else {
        // Write the choice down before the verifier runs: this is the event the
        // folded state needs to answer which partition a past round tested and
        // from which pool. Emitted only when the gate actually runs, so the
        // recorded `covered` set is what ran, not what was merely selected.
        runtime.append(
          view,
          'holdout.selected',
          { round: n, id: holdoutId, pool: holdout.pool, poolSha: holdoutPoolSha(holdout.pool) },
          'system',
        )
        let result
        // Counted before the attempt so a verifier that throws is still a run.
        holdoutRuns += 1
        try {
          result = await runVerifier(holdoutTask.verify, { cwd: best.worktree, timeoutMs: config.verify?.timeoutMs, env: verifierEnv })
        } catch (err) {
          result = { ok: false, stderr: String(err?.message ?? err) }
        }
        if (result.ok !== true) {
          checks.holdout = false
          const output = String(result.stderr || result.stdout || '')
          holdoutFailures.push({ task: holdoutId, detail: output.slice(-400) })
          log(`holdout task ${holdoutId} failed in ${best.worktree}: ${output.slice(-400)}`)
        }
      }
      holdoutMs = Math.max(0, Date.now() - holdoutStartedAt)
    }
    // A patch that did not have to fix anything did not earn the verdict. The
    // no-op branch is the opposite claim (the tree already satisfied the task, and
    // the empty diff is the evidence), so it is left alone.
    const earned = checks.baseFailed !== false
    const basePass = checks.verifierOk && checks.testsClean && earned && checks.beatsIncumbent && (checks.hasPatch || checks.noop)
    const promote = basePass && checks.holdout !== false
    const rejectedByHoldout = basePass && checks.holdout === false

    runtime.append(
      view,
      'gate.evaluated',
      { candidateId: best?.id ?? `r${n}a0`, round: n, promoted: promote, score, incumbentScore: taskBest, checks },
      'system',
    )

    if (promote) {
      runtime.append(
        view,
        'artifact.promoted',
        { kind: 'attempt', round: n, attemptId: best.id, score, patch: best.patch, branch: best.branch, ...(checks.noop ? { noop: true } : {}) },
        'system',
      )
      // Only verified work becomes knowledge, and only the mechanism (`why`),
      // never the plan or the excuse.
      //
      // A no-op landing is a landing, not a finding: the tree already satisfied
      // the verifier, so there is no work whose mechanism could be learned.
      // Accepting one anyway is how 19 "there was nothing to do" claims reached
      // the tree and started being injected into the next worker's brief as if
      // they were research.
      try {
        const derived = checks.noop ? null : deriveLesson({ attempt: best, task, round: n })
        if (derived && !(state.lessons || []).some((l) => l.id === derived.id)) {
          runtime.append(view, 'lesson.added', { lesson: derived }, 'system')
        }
      } catch (err) {
        log('lesson derivation failed:', err?.message ?? err)
      }
      // A chain's human node decides whether a person must look. `when: always`
      // outranks autopilot; `when: never` lets an unattended campaign stay
      // unattended; anything else keeps the existing autopilot rule.
      const human = humanGate(chain)
      const autoByConfig = config.loopPolicy.autoApply || state.autopilot?.enabled === true
      const auto = human?.when === 'always' ? false : human?.when === 'never' ? true : autoByConfig
      if (auto && checks.noop) {
        // Nothing to apply: the tree already satisfies the verifier. Marking the round
        // landed is what stops the selector spending more rounds on this task.
        runtime.append(view, 'autopilot.applied', { round: n, patch: null, guard: null, noop: true, committed: false, at: Date.now() }, 'system')
      } else if (auto) {
        const applied = await applyPatch({ repo: workspace, patchFile: best.patch })
        if (!applied.ok) {
          raise('anomaly', {
            message: `promotion could not be applied to the workspace: ${applied.reason}`,
            detail: applied.detail,
            patch: best.patch,
          })
        } else {
          const guard = state.autopilot?.guard && state.autopilot.enabled ? state.autopilot.guard : null
          // The accepted verify command already carried this exact command, so
          // the verdict that promoted the patch is also the guard's verdict.
          const reusedGuard = Boolean(guard && acceptance.spec && guardIsPartOf(acceptance.spec.cmd, guard))
          const checked = guard && !reusedGuard
            ? await runVerifier({ cmd: guard }, { cwd: workspace, env: verifierEnv }).catch((err) => ({ ok: false, stderr: String(err?.message ?? err) }))
            : { ok: true }
          if (!checked.ok) {
            await rollbackWorkspace(workspace)
            raise('anomaly', {
              message: `autopilot applied round ${n} and then the guard failed; the workspace was rolled back`,
              guard,
              detail: String(checked.stderr || checked.stdout || '').slice(-400),
              patch: best.patch,
            })
          } else {
            // Commit the promotion immediately: the next round branches off HEAD,
            // and leaving it dirty is what makes the following apply conflict.
            const landed = await commitWorkspace(workspace, `loom ${state.id} round ${n}: promote ${best.id} (score ${score})`)
            runtime.append(view, 'autopilot.applied', { round: n, patch: best.patch, guard: reusedGuard ? 'reused-verifier' : guard, commit: landed.sha, committed: landed.committed === true, at: Date.now() }, 'system')
          }
        }
      } else {
        // A chain with a human node has asked a person to review this change.
        // The workspace stays untouched until that person decides: staging the
        // diff there would leave the tree dirty, and anything dirty is fair game
        // for the night committer — which would land an unreviewed patch. The
        // reviewer gets the patch file and reads it with `git apply --stat`.
        raise('gate', {
          message: human?.prompt || `round ${n} produced a passing patch (score ${score}); review and apply`,
          prompt: human?.prompt ?? null,
          node: human?.id ?? null,
          patch: best.patch,
          attempt: best.id,
          score,
          review: `git -C ${workspace} apply --stat ${best.patch}`,
        })
      }
    }

    // `promoted` is what plateau detection reads: status can be 'promoted'
    // for a patch that still needed a human, but only a gate promotion is
    // progress. Recording it explicitly keeps the rounds array self-describing.
    const finished = runtime.append(
      view,
      'round.finished',
      { n, status: promote ? 'promoted' : rejectedByHoldout ? 'holdout-failed' : 'no-gain', score, promoted: promote === true, planTimedOut, planUsable, ...modeRecord(), ...(holdoutId ? { holdoutId } : {}), ...(checks.holdout === 'skipped-noop' ? { holdout: 'skipped-noop' } : {}), salvagedCandidates, ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs, planMs, pricing.source, holdoutMs, holdoutRuns) },
      'system',
    )

    // A runtime that only records events (a bare embedder) leaves `state.rounds`
    // empty, which would make every round compute n = 1 and the ledger read like
    // one round repeated. Project the round on the normal path too — a folding
    // append makes this a merge-by-n no-op.
    projectRound(view.state, {
      n,
      taskId: task.id,
      status: promote ? 'promoted' : rejectedByHoldout ? 'holdout-failed' : 'no-gain',
      score,
      promoted: promote === true,
      attempts,
    })

    // Three rounds in a row whose patches changed while the verifier said exactly
    // the same thing is the signature of an unreachable gate, not of a hard task:
    // the agent keeps producing diffs and the gate never learns anything. Ask a
    // human once and keep the campaign running — this is a report, not a stop.
    const stuckOn = !Array.isArray(config.checkpoint?.on) || config.checkpoint.on.includes('stuck')
    const stuck = stuckOn ? repeatedStuckSignature(view.state?.rounds, task.id) : null
    if (stuck && !stuckAlreadyRaised(view.state, task.id, stuck.signature)) {
      raise('stuck', {
        message: `task ${task.id} produced a patch in each of its last ${stuck.rounds.length} rounds and the verifier failed identically every time; the gate looks unreachable`,
        taskId: task.id,
        signature: stuck.signature,
        rounds: stuck.rounds,
      })
      // Remember it on the round as well: a non-folding runtime never materializes
      // `state.checkpoints`, and the next identical round must stay quiet too.
      const current = (view.state?.rounds || []).find((r) => Number(r?.n) === Number(n))
      if (current) current.stuckSignature = stuck.signature
    }

    // A holdout rejection is the most valuable failure of a round: the patch
    // passed everything the worker could see and broke the task it could not.
    // Written only as a round status it vanishes, so surface it on the same
    // channel a human watches — naming the task and quoting what it printed —
    // while the promotion path stays untouched (nothing was applied above).
    const holdoutOn = !Array.isArray(config.checkpoint?.on) || config.checkpoint.on.includes('holdout')
    if (rejectedByHoldout && holdoutOn) {
      const first = holdoutFailures[0] || { task: null, detail: '' }
      raise('holdout', {
        message: `round ${n} was rejected by holdout task ${first.task ?? '(unknown)'}; nothing was applied`,
        task: first.task,
        detail: first.detail,
        failures: holdoutFailures,
        round: n,
        score,
      })
    }

    // Ask the plateau predicate AFTER the round is recorded, and ask through the
    // same checkpoint channel a human watches. `oncePlateau` looks at any plateau
    // checkpoint, not just open ones, so a fourth flat round stays quiet.
    const plateauOn = !Array.isArray(config.checkpoint?.on) || config.checkpoint.on.includes('plateau')
    if (plateauOn && oncePlateau(finished, { window: config.checkpoint?.window ?? 3 })) {
      raise('plateau', {
        message: `the last ${config.checkpoint?.window ?? 3} rounds promoted nothing; the loop is not making progress`,
        window: config.checkpoint?.window ?? 3,
        rounds: (finished.rounds || []).slice(-(config.checkpoint?.window ?? 3)).map((r) => r.n),
      })
      // A plateau is the loop's own stall signal, so do not let it stop at the
      // human page: propose the mutations `rsi_chain auto` would have offered.
      // Proposals are inert until an activation promotes one, so this cannot
      // change behaviour on its own; it just makes the lever reachable.
      const maxMutations = Number(config.chain?.maxMutations) || 3
      const nextVersion =
        state.chain.versions.reduce((max, v) => Math.max(max, Number(v.version) || 0), 0) + 1
      for (const m of proposeMutations(chain, { fromVersion: nextVersion, max: maxMutations })) {
        runtime.append(view, 'chain.proposed', { version: m.spec.version, spec: m.spec }, 'system')
      }
    }
  } catch (err) {
    runtime.append(
      view,
      'round.finished',
      { n, status: 'error', score: null, error: String(err?.message ?? err), promoted: false, planTimedOut, planUsable, ...modeRecord(), ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs, planMs, pricing.source) },
      'system',
    )
    raise('anomaly', { message: 'round crashed', detail: String(err?.stack ?? err) })
    log('round crashed:', err?.stack ?? err)
  } finally {
    if (!config.loopPolicy.keepWorktrees) {
      for (const a of attempts) {
        await removeWorktree({ repo: workspace, dir: a.worktree }).catch(() => {})
      }
    }
  }
}

const TEST_PATH_RE = /^tests(?:[/\\]|$)/

function normalizeRepoPath(p) {
  return String(p ?? '').replace(/\\/g, '/').replace(/^\.\//, '')
}

function touchesTests(p) {
  return TEST_PATH_RE.test(normalizeRepoPath(p))
}

/**
 * A patch that edits the tests can make any verifier pass, so promotion must
 * refuse it. `diffStat` only sees paths git already tracks, and only when it is
 * asked after `makePatch` staged intent-to-add entries; the patch file itself
 * is the authoritative change set (it also covers new and deleted test files).
 * Only `diff --git` section headers are parsed: content lines can begin with
 * `+++`/`---` too, so those prefixes are not reliable path markers.
 */
function patchTouchesTests(patchPath) {
  if (!patchPath) return false
  let text
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch {
    // An unreadable patch cannot be shown to leave the verifier alone. Fail
    // closed: refusing a genuine patch wastes one round, while promoting a
    // change set nobody could inspect defeats the point of the gate.
    return true
  }
  for (const line of text.split('\n')) {
    if (!line.startsWith('diff --git ')) continue
    const rest = line.slice('diff --git '.length)
    const quoted = [...rest.matchAll(/"([ab])\/((?:\\.|[^"\\])*)"/g)].map((m) => m[2])
    const paths = quoted.length ? quoted : (rest.match(/^a\/(.+?) b\/(.+)$/) || []).slice(1)
    if (paths.some(touchesTests)) return true
  }
  return false
}

/**
 * Pick the holdout partition a round tests.
 *
 * The choice is a pure function of the stable ids in the pool and the round
 * number: sort first, so declaration order cannot change the answer, then rotate
 * with the round. `(round - 1) % size` means round 1 tests the first sorted id
 * and the pool wraps (round `size + 1` is the first again). An empty or missing
 * pool is a measured "no holdout", not an exception and not a pick.
 *
 * @param {Array<string|number|{id: unknown}>|null|undefined} pool
 * @param {number} round
 * @returns {{id: string, index: number, poolSize: number, pool: string[]}|null}
 */
export function holdoutPick(pool, round) {
  const ids = Array.isArray(pool)
    ? [
        ...new Set(
          pool
            .map((entry) => (entry && typeof entry === 'object' ? entry.id : entry))
            .filter((id) => id !== null && id !== undefined && String(id) !== '')
            .map(String),
        ),
      ].sort()
    : []
  if (ids.length === 0) return null
  const r = Number(round)
  const n = Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1
  const index = (n - 1) % ids.length
  return { id: ids[index], index, poolSize: ids.length, pool: ids }
}

/**
 * A short identity for a holdout pool, so a ledger written under one pool and
 * replayed under another cannot look unchanged. Sorted ids mean declaration
 * order does not move the hash either.
 */
function holdoutPoolSha(ids) {
  return createHash('sha1').update(ids.join('\n')).digest('hex').slice(0, 12)
}

/**
 * Resolve the campaign's holdout ids to the tasks that actually define a
 * verifier. Holdouts are ids into the same task list (an object entry is
 * tolerated for forward compatibility), and a task without `verify.cmd` cannot
 * prove anything, so it is skipped rather than silently counted as a pass.
 */
function holdoutTasks(state) {
  const all = Array.isArray(state.evalset?.tasks) ? state.evalset.tasks : []
  const holdout = Array.isArray(state.evalset?.holdout) ? state.evalset.holdout : []
  // A campaign may register its whole-suite verifier once as `evalset.suite` and
  // name it in the holdout list ("suite = test-all") instead of duplicating it
  // into the task list. It is a fallback only: an id present in `tasks` wins.
  const suite = state.evalset?.suite
  const suiteId = suite?.id != null ? String(suite.id) : 'suite'
  const out = []
  const seen = new Set()
  for (const entry of holdout) {
    const id = typeof entry === 'string' ? entry : entry?.id != null ? String(entry.id) : null
    if (!id || seen.has(id)) continue
    const task =
      all.find((t) => t && String(t.id) === id) ||
      (typeof entry === 'object' && entry?.verify?.cmd ? entry : null) ||
      (id === suiteId && suite?.verify?.cmd ? suite : null)
    if (!task?.verify?.cmd) continue
    seen.add(id)
    out.push(task)
  }
  return out
}

/**
 * A short, stable fingerprint of what the verifier said.
 *
 * The gate is "unreachable" when the code keeps changing and the verdict does
 * not. Only the outcome contract is hashed — exit code plus the tail of stderr —
 * so timings, durations and other per-run noise cannot masquerade as progress.
 */
function verifierSignature(ver) {
  if (!ver) return null
  const exit = ver.exitCode === null || ver.exitCode === undefined ? 'none' : String(ver.exitCode)
  const stderr = String(ver.stderr || '').replace(/\r\n/g, '\n').trim()
  const tail = stderr.split('\n').slice(-20).join('\n')
  return createHash('sha1').update(`${exit}\n${tail}`).digest('hex').slice(0, 12)
}

/**
 * The one signature shared by a round's patched-but-failing attempts, or null.
 *
 * A round with no patch is not evidence of a trap (the agent may have done
 * nothing), and a round whose attempts failed in different ways is work in
 * progress: both are deliberately not a stuck candidate.
 */
function stuckSignature(round) {
  const attempts = Array.isArray(round?.attempts) ? round.attempts : []
  const signatures = new Set()
  let patchedFailure = false
  for (const a of attempts) {
    if (!a || a.screenedOut || a.abandoned) continue
    if (a.verifierOk === true) continue
    if (!(Number(a.patchBytes) > 0)) continue
    if (typeof a.verifySignature !== 'string' || !a.verifySignature) continue
    patchedFailure = true
    signatures.add(a.verifySignature)
  }
  return patchedFailure && signatures.size === 1 ? [...signatures][0] : null
}

/**
 * Detect the same failure repeated across the last `window` rounds of a task.
 *
 * "Consecutive" is counted over the task's own appearances: a campaign rotates
 * over several tasks, so two rounds on this task are consecutive even when
 * other tasks ran in between. Any round in the window that does not carry the
 * same signature breaks the streak.
 *
 * @returns {{signature: string, rounds: number[]} | null}
 */
function repeatedStuckSignature(rounds, taskId, window = 3) {
  const onTask = (Array.isArray(rounds) ? rounds : []).filter((r) => r && r.taskId === taskId)
  if (onTask.length < window) return null
  const tail = onTask.slice(-window)
  const signatures = tail.map((r) => stuckSignature(r))
  if (signatures.some((s) => !s)) return null
  if (new Set(signatures).size !== 1) return null
  return {
    signature: signatures[0],
    rounds: tail.map((r) => Number(r.n)).filter((n) => Number.isFinite(n)),
  }
}

/**
 * True while an unanswered checkpoint already says exactly this. Setup problems
 * are standing conditions: one problem is one question, however many ticks it
 * survives.
 */
function setupAlreadyRaised(state, message) {
  const checkpoints = Array.isArray(state?.checkpoints) ? state.checkpoints : []
  return checkpoints.some(
    (c) => c && c.kind === 'setup' && c.status === 'open' && c.payload?.message === message,
  )
}

/** True when this task + signature has already been reported to a human. */
function stuckAlreadyRaised(state, taskId, signature) {
  const checkpoints = Array.isArray(state?.checkpoints) ? state.checkpoints : []
  if (
    checkpoints.some(
      (c) => c && c.kind === 'stuck' && c.payload?.taskId === taskId && c.payload?.signature === signature,
    )
  ) {
    return true
  }
  const rounds = Array.isArray(state?.rounds) ? state.rounds : []
  return rounds.some((r) => r && r.taskId === taskId && r.stuckSignature === signature)
}

/**
 * Make a round visible in the caller's materialized state.
 *
 * `runtime.append` folds the ledger in production, but not every runtime does
 * (a bare embedder may only record events). Merge by round number and attempt
 * id rather than pushing blindly, so running this after a folding append is a
 * no-op instead of a duplicate.
 */
function projectRound(state, round) {
  if (!state || !Array.isArray(state.rounds)) return
  let r = state.rounds.find((x) => Number(x?.n) === Number(round.n))
  if (!r) {
    r = {
      n: round.n,
      at: Date.now(),
      attempts: [],
      status: round.status,
      score: round.score ?? null,
      taskId: round.taskId ?? null,
    }
    state.rounds.push(r)
  }
  Object.assign(r, {
    status: round.status,
    score: round.score ?? r.score ?? null,
    promoted: round.promoted === true,
    endedAt: Date.now(),
    ...(round.holdoutId != null ? { holdoutId: round.holdoutId } : {}),
  })
  if (!Array.isArray(r.attempts)) r.attempts = []
  const seen = new Set(r.attempts.map((a) => a?.id))
  for (const a of round.attempts || []) {
    if (!seen.has(a.id)) r.attempts.push(a)
  }
}

/**
 * Which round does an approved checkpoint belong to?
 *
 * A human approving a promotion must tell the reducer that the round landed, and
 * the reducer finds the round by `n`. The anomaly checkpoint raised when a patch
 * cannot be applied carries only the artifact path - the round number lives in
 * the gate that chose the candidate - so reading `payload.round` alone writes
 * `round: null`, the round never turns `landed`, and the selector keeps offering
 * the task it already solved. Resolve it from the state instead: the round the
 * gate marked as promoted, matched by artifact path when it is present.
 *
 * @param {{rounds?: Array<any>}} state
 * @param {{patch?: string, round?: number|string, attempt?: string, attemptId?: string}} payload
 * @returns {{round: number|null, attemptId: string|null}}
 */
export function landingTarget(state, payload = {}) {
  const rounds = Array.isArray(state?.rounds) ? state.rounds : []
  const attemptId = payload.attempt ?? payload.attemptId ?? null
  const explicit = Number(payload.round)
  if (Number.isFinite(explicit)) {
    const known = rounds.find((r) => Number(r?.n) === explicit)
    return { round: explicit, attemptId: attemptId ?? known?.promotedAttemptId ?? null }
  }
  const patch = typeof payload.patch === 'string' ? payload.patch : null
  // An attempt id carries the round it ran in (`r2a1` is round 2, attempt a1).
  // That is the cheapest and most reliable source when a human names the attempt.
  const fromId = /^r(\d+)a/.exec(String(attemptId ?? ''))
  if (fromId) {
    const n = Number(fromId[1])
    const known = rounds.find((r) => Number(r?.n) === n)
    return { round: n, attemptId: attemptId ?? known?.promotedAttemptId ?? null }
  }
  if (patch) {
    // The artifact path names the attempt; the gate named the round.
    for (let i = rounds.length - 1; i >= 0; i -= 1) {
      const r = rounds[i]
      const chosen = r?.promotedAttemptId ?? null
      if (chosen && patch.includes(`${chosen}.patch`)) return { round: Number(r.n), attemptId: chosen }
      const hit = (Array.isArray(r?.attempts) ? r.attempts : []).find((a) => a && a.patch && String(a.patch) === patch)
      if (hit) return { round: Number(r.n), attemptId: hit.id ?? chosen }
    }
  }
  // Fall back to the most recent round the gate promoted but that never landed.
  for (let i = rounds.length - 1; i >= 0; i -= 1) {
    const r = rounds[i]
    if (r?.promotedAttemptId && r.landed !== true) return { round: Number(r.n), attemptId: r.promotedAttemptId }
  }
  return { round: null, attemptId }
}

export function raiseCheckpoint(runtime, view, kind, payload) {
  const id = nextCheckpointId()
  runtime.append(view, 'checkpoint.raised', { id, kind, payload }, 'system')
  return id
}
