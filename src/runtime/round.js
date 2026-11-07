import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { runVerifier } from '../exec/verifier.js'
import { createWorktree, removeWorktree, diffStat, headCommit, rollbackWorkspace, commitWorkspace } from '../exec/worktree.js'
import { makePatch, applyPatch } from '../exec/patch.js'
import { scoreAttempt, rankAttempts } from '../gate/gate.js'
import { campaignUsage, usageOfSession } from './cost.js'
import { writeLease, updateLease } from './lease.js'
import { classifyResult } from '../dispatch/session.js'
import { buildWorkerBrief, parseAttemptReport } from '../dispatch/brief.js'
import { boardPath, appendNote, readNotes, pruneNotes } from '../collab/board.js'
import { selectLessons } from '../knowledge/select.js'
import { pairedImpacts, applyImpacts, shouldQuarantine, deriveLesson } from '../knowledge/impact.js'
import { pickSurvivors, screenEnabled } from './halving.js'
import { exposeIndexes } from './exposure.js'
import { runTaskLeanGate, leanSpecOf } from '../lean/task.js'
import { effectivePolicy } from '../loop/policy.js'
import { pickTask } from './selector.js'
import { oncePlateau } from './plateau.js'
import { proposeMutations } from '../chain/mutate.js'
import { nextCheckpointId } from './ids.js'
import { verifyOnce } from './verifier-reuse.js'
import { estimatedRoundCost } from './triangle.js'

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
    // Only work that actually reached the workspace counts. An attempt can score
    // 1.0 inside its own worktree and still be thrown away (empty patch, guard
    // rollback); treating that as "task solved" would freeze the campaign on a
    // task the workspace still fails.
    if (r.landed !== true) continue
    for (const a of r.attempts || []) {
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
 * Run the pre-map agent nodes, one fresh session each, and return their text.
 *
 * A node is a planning step, not an attempt: it never produces a patch, never
 * touches the campaign workspace (it gets a throwaway worktree of the base
 * commit) and can never fail the round. Every outcome — including a throw, a
 * timeout, an empty or error reply — is recorded as `node.finished` and the
 * round continues with whatever findings were usable.
 */
async function runPreMapNodes({ runtime, view, state, config, dispatcher, task, chain, round, log }) {
  const findings = []
  const nodes = preMapAgentNodes(chain)
  for (const node of nodes) {
    const id = String(node.id)
    const startedAt = Date.now()
    const record = {
      id,
      type: 'agent',
      role: node.role ?? null,
      round,
      ok: false,
      durationMs: 0,
      sessionId: null,
      stopReason: null,
      error: null,
      summary: '',
    }
    const wtPath = join(runtime.home, 'worktrees', state.id, `recon-${id}`)
    const branch = `loom/${state.id}/recon-${id}`
    try {
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
        workspace: { branch, cwd: wtPath },
      })
      const res = await dispatcher.run(brief, {
        cwd: wtPath,
        timeoutMs: config.session.attemptTimeoutMs,
        label: `loom:${state.id}:r${round}:${id}`,
        model: config.models.worker || null,
      })
      const text = String(res?.text ?? '').trim()
      record.sessionId = res?.sessionId ?? null
      record.stopReason = res?.stopReason ?? null
      record.error = res?.error ?? null
      record.ok = res?.stopReason !== 'error' && !res?.timedOut && !res?.error && text.length > 0
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
    runtime.append(view, 'node.finished', record, 'system')
    await removeWorktree({ repo: state.workspace, dir: wtPath }).catch(() => {})
  }
  return findings
}

function lastFailure(state) {
  const prev = state.rounds[state.rounds.length - 1]
  if (!prev) return null
  const failed = (prev.attempts || []).filter((a) => !a.verifierOk)
  if (!failed.length) return null
  const worst = failed[failed.length - 1]
  const detail = worst.reportError || worst.error || worst.stdoutTail || worst.agentTail || ''
  return {
    reason: worst.abandoned ? `attempt was written off (${worst.abandoned})` : 'verifier failed in the previous round',
    detail: tailOf(detail, 300),
  }
}

/**
 * Everything the worker needs, and nothing it does not: no transcript, no
 * sibling history beyond a handful of notes, no knowledge the round has not
 * earned yet.
 */
function attemptBrief({ chain, state, task, verifyCmd, worktree, attemptId, index, total, notes, lessons, plan = [], maxChars }) {
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
  })
}

/**
 * Screening pass: cheap check, short deadline, no promotion. Its only job is to
 * tell us which candidates deserve the expensive attempt. Whatever the worker
 * learned in the screen stays in its worktree, so a survivor starts ahead.
 */
async function screenCandidate({ runtime, view, state, config, dispatcher, task, attemptId, log }) {
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
      label: `loom:${state.id}:${attemptId}:screen`,
      model: config.models.worker || null,
    })
    const ver = await runVerifier(task.screen, { cwd: wtPath, timeoutMs: config.verify.timeoutMs })
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
 */
export function roundStats(attempts, startedAt, verifierRuns, verifierMs) {
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
    attemptCount: Array.isArray(attempts) ? attempts.length : 0,
    attemptMs,
    verifierRuns,
    verifierMs,
    tokens,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
  }
}

/**
 * One round: pick a task, run `candidates` attempts in isolated worktrees, verify
 * mechanically, promote the best one. Never throws: every failure becomes an
 * event + (when it needs a human) a checkpoint.
 */
export async function runRound({ runtime, view, config, dispatcher, log, notify = null }) {
  const state = view.state
  const n = state.rounds.length + 1
  // L2: the promoted loop policy overrides the plugin defaults for this campaign.
  const policy = effectivePolicy({ state, config })
  const chain = activeChain(state)
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
  if (exhausted || unaffordable) {
    // Close the round out explicitly before stopping the campaign: a round that
    // silently vanishes leaves the ledger ambiguous about why no work started.
    runtime.append(
      view,
      'round.finished',
      { n, status: 'budget', score: null, promoted: false, spentUsd, estimatedUsd, projectedUsd },
      'system',
    )
    runtime.append(view, 'campaign.status', { status: 'converged', reason: 'cost budget exhausted' }, 'system')
    raise('budget', {
      message: exhausted
        ? `spend $${spentUsd.toFixed(4)} reached cap $${state.budget.usd}`
        : `spend $${spentUsd.toFixed(4)} + estimated round $${estimatedUsd.toFixed(4)} would cross cap $${state.budget.usd}`,
      spentUsd,
      estimatedUsd,
      projectedUsd,
    })
    return
  }
  const tasks = state.evalset.tasks.filter((t) => !state.evalset.holdout.includes(t.id))
  if (!tasks.length) {
    raise('setup', { message: 'no evaluation tasks registered' })
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
    raise('setup', { message: 'no task available for this round' })
    return
  }
  const acceptance = acceptanceVerifier({ task, chain })
  const verifyCmd = acceptance.spec?.cmd || 'echo no-verifier && exit 1'
  const candidates = Math.max(1, Math.min(4, Number(policy.candidates ?? chain.params?.candidates) || 1))
  // Which attempt gets the lessons rotates with the round, so the control is
  // not always a1 (see src/runtime/exposure.js).
  const exposed = exposeIndexes(candidates, n)
  const workspace = state.workspace
  if (!workspace) {
    raise('setup', { message: 'campaign has no workspace' })
    return
  }

  if (leanSpecOf(task) && config.lean?.enabled !== false) {
    const probe = runtime.leanProbe?.() || { available: false, install: null }
    if (!probe.available) {
      raise('setup', {
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

  const attempts = []
  const board = boardPath(view.dir, n)
  const plan = []
  for (let i = 1; i <= candidates; i += 1) plan.push({ i, attemptId: `r${n}a${i}` })
  const holdoutFamilies = (state.evalset.holdout || []).slice(0, 50)
  const screening = screenEnabled({ task, config: { ...config, halving: { ...config.halving, enabled: policy.halving } }, candidates })
  const screenInfo = new Map()
  let survivors = plan.map((p) => p.attemptId)
  let best = null
  try {
    // Shared reconnaissance first: these nodes are the work that makes the
    // parallel attempts smart, and their findings reach every worker brief.
    // A chain without one dispatches exactly as it always did.
    const planFindings = await runPreMapNodes({
      runtime,
      view,
      state,
      config,
      dispatcher,
      task,
      chain,
      round: n,
      log,
    })
    if (screening) {
      const results = []
      for (const p of plan) {
        const res = await screenCandidate({ runtime, view, state, config, dispatcher, task, attemptId: p.attemptId, log })
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
    const limit = dispatchLimit(config, dispatchPlan.length)
    const records = new Map()
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
        })
        let retried = null
        const timeoutMs = config.session.attemptTimeoutMs
        writeLease(view.dir, { attemptId, round: n, deadline: Date.now() + timeoutMs })
        let runRes = await dispatcher.run(brief, {
          cwd: wtPath,
          timeoutMs,
          label: `loom:${state.id}:r${n}a${i}`,
          model: config.models.worker || null,
          onStart: ({ sessionId, abort, deadline }) => {
            updateLease(view.dir, attemptId, { sessionId, deadline })
            runtime.watchAttempt({ attemptId, sessionId, abort, deadline, campaign: state.id })
          },
        })
        // A context overflow is a packaging problem, not a code problem: the
        // child never got to work. Retry once with a brief that carries less
        // (no notes, no lessons, no plan) before writing the attempt off.
        let outcomeKind = runRes.failureKind ?? classifyResult(runRes)
        if (outcomeKind === 'context') {
          retried = 'smaller-brief'
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
          })
          log(`attempt ${attemptId}: context overflow, retrying with a ${smaller.length}-char brief`)
          brief = smaller
          writeLease(view.dir, { attemptId, round: n, deadline: Date.now() + timeoutMs })
          runRes = await dispatcher.run(brief, {
            cwd: wtPath,
            timeoutMs,
            label: `loom:${state.id}:r${n}a${i}:retry`,
            model: config.models.worker || null,
            onStart: ({ sessionId, abort, deadline }) => {
              updateLease(view.dir, attemptId, { sessionId, deadline })
              runtime.watchAttempt({ attemptId, sessionId, abort, deadline, campaign: state.id })
            },
          })
        }
        if (retried) outcomeKind = runRes.failureKind ?? classifyResult(runRes)
        runtime.unwatchAttempt(attemptId)
        const stall = runtime.stallReason(attemptId)
        const abandoned = runRes.stopReason === 'aborted' && !runRes.timedOut ? stall || 'interrupted' : null

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
        const verified = acceptance.spec
          ? await verifyOnce({
              dir: view.dir,
              patchFile: patch?.path ?? null,
              keySuffix: `${acceptance.spec.cmd}\n${acceptance.spec.cwd ?? ''}\n${config.verify.timeoutMs ?? ''}`,
              cwd: verifierCwd,
              run: () => runVerifier(acceptance.spec, { cwd: verifierCwd, timeoutMs: config.verify.timeoutMs }),
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
        // Only a real spawn is a verifier run; a reused verdict costs nothing.
        if (!verified.reused) {
          verifierRuns += 1
          verifierMs += Math.max(0, Number(ver.durationMs) || 0)
        }
        let lean = null
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
        // A child that never finished its turn cannot have produced verified
        // work, even if the verifier happens to pass on an untouched tree. Only a
        // completed turn counts as evidence; everything else is a failed attempt.
        const gateOk = ver.ok && (lean ? lean.ok : true) && outcomeKind === 'ok'
        // A verifier run is a cost centre of its own: it is the part of the round
        // the agent cannot speed up. Record it so the efficiency leg has a number.
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
        const diff = await diffStat({ dir: wtPath }).catch(() => ({ files: 0, insertions: 0, deletions: 0, filesChanged: [] }))
        const score = scoreAttempt({
          attemptId,
          taskScores: { [task.id]: gateOk ? 1 : 0 },
          verifierOk: gateOk,
          metrics: ver.metrics,
        })
        const spend = usageOfSession(runtime.ctx, runRes.sessionId, config.models?.pricing)
        const parsed = parseAttemptReport(runRes.text || '')
        const report = parsed.ok ? parsed.report : null
        record = {
          ...record,
          verifierOk: gateOk,
          exitCode: ver.exitCode,
          verifySignature: verifierSignature(ver),
          lean,
          timedOut: ver.timedOut || runRes.timedOut,
          abandoned,
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
          usage: spend.usage,
          usageEstimated: spend.estimated === true,
          costUsd: spend.usd,
          tokens: tokensOf(spend, brief, runRes.text),
          textChars: (runRes.text || '').length,
          error: runRes.error,
          failureKind: outcomeKind,
          model: runRes.model ?? null,
          modelsTried: runRes.modelsTried ?? null,
          modelSwitch: runRes.modelSwitch ?? null,
          retried,
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
        record = { ...record, durationMs: Date.now() - startedAt, failureKind: 'crash', error: String(err?.message ?? err) }
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
    const workerCount = Math.min(limit, dispatchPlan.length)
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        for (;;) {
          const at = cursor
          cursor += 1
          if (at >= dispatchPlan.length) return
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
    // Emit in plan order, not completion order: the round ledger keeps the
    // same shape it has always had regardless of which candidate finished first.
    for (const { attemptId } of plan) {
      if (!survivors.includes(attemptId)) continue
      const record = records.get(attemptId)
      if (!record) continue
      attempts.push(record)
      runtime.append(view, 'attempt.finished', record, 'system')
      if (record.abandoned) {
        runtime.append(
          view,
          'attempt.abandoned',
          { id: attemptId, round: n, reason: record.abandoned },
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
        { n, status: 'exhausted', score: 0, promoted: false, models, ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs) },
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
      const impacts = pairedImpacts({ attempts, round: n })
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
    const heldOut = holdoutTasks(state)
    if (heldOut.length) {
      checks.holdout = true
      if (!best?.worktree || best.screenedOut) {
        checks.holdout = false
        holdoutFailures.push({
          task: heldOut[0]?.id ?? null,
          detail: 'the winning candidate had no worktree in which to run the holdout',
        })
      } else {
        for (const h of heldOut) {
          let result
          try {
            result = await runVerifier(h.verify, { cwd: best.worktree, timeoutMs: config.verify?.timeoutMs })
          } catch (err) {
            result = { ok: false, stderr: String(err?.message ?? err) }
          }
          if (result.ok !== true) {
            checks.holdout = false
            const output = String(result.stderr || result.stdout || '')
            holdoutFailures.push({ task: String(h.id), detail: output.slice(-400) })
            log(`holdout task ${h.id} failed in ${best.worktree}: ${output.slice(-400)}`)
          }
        }
      }
    }
    // A verified attempt that changed nothing is not evidence of new work, but it IS
    // evidence the task is satisfied (an earlier landing already covered it). Applying
    // an empty patch fails in git apply, so record it as a no-op landing instead.
    checks.noop = checks.verifierOk && !checks.hasPatch && score > 0 && checks.beatsIncumbent
    const basePass = checks.verifierOk && checks.testsClean && checks.beatsIncumbent && (checks.hasPatch || checks.noop)
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
      try {
        const derived = deriveLesson({ attempt: best, task, round: n })
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
          const checked = guard
            ? await runVerifier({ cmd: guard }, { cwd: workspace }).catch((err) => ({ ok: false, stderr: String(err?.message ?? err) }))
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
            runtime.append(view, 'autopilot.applied', { round: n, patch: best.patch, guard, commit: landed.sha, committed: landed.committed === true, at: Date.now() }, 'system')
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
      { n, status: promote ? 'promoted' : rejectedByHoldout ? 'holdout-failed' : 'no-gain', score, promoted: promote === true, ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs) },
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
      { n, status: 'error', score: null, error: String(err?.message ?? err), promoted: false, ...roundStats(attempts, roundStartedAt, verifierRuns, verifierMs) },
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
 * Resolve the campaign's holdout ids to the tasks that actually define a
 * verifier. Holdouts are ids into the same task list (an object entry is
 * tolerated for forward compatibility), and a task without `verify.cmd` cannot
 * prove anything, so it is skipped rather than silently counted as a pass.
 */
function holdoutTasks(state) {
  const all = Array.isArray(state.evalset?.tasks) ? state.evalset.tasks : []
  const holdout = Array.isArray(state.evalset?.holdout) ? state.evalset.holdout : []
  const out = []
  const seen = new Set()
  for (const entry of holdout) {
    const id = typeof entry === 'string' ? entry : entry?.id != null ? String(entry.id) : null
    if (!id || seen.has(id)) continue
    const task = all.find((t) => t && String(t.id) === id) || (typeof entry === 'object' && entry?.verify?.cmd ? entry : null)
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
  })
  if (!Array.isArray(r.attempts)) r.attempts = []
  const seen = new Set(r.attempts.map((a) => a?.id))
  for (const a of round.attempts || []) {
    if (!seen.has(a.id)) r.attempts.push(a)
  }
}

export function raiseCheckpoint(runtime, view, kind, payload) {
  const id = nextCheckpointId()
  runtime.append(view, 'checkpoint.raised', { id, kind, payload }, 'system')
  return id
}
