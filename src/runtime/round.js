import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runVerifier } from '../exec/verifier.js'
import { createWorktree, removeWorktree, diffStat, headCommit, rollbackWorkspace, commitWorkspace } from '../exec/worktree.js'
import { makePatch, applyPatch } from '../exec/patch.js'
import { scoreAttempt, rankAttempts } from '../gate/gate.js'
import { campaignUsage, usageOfSession } from './cost.js'
import { writeLease, updateLease } from './lease.js'
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
import { nextCheckpointId } from './ids.js'

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

function tailOf(text, max = 200) {
  const s = String(text || '').trim()
  if (s.length <= max) return s
  return `…${s.slice(-max)}`
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
function attemptBrief({ chain, state, task, verifyCmd, worktree, attemptId, index, total, notes, lessons }) {
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
    previousFailure: lastFailure(state),
    workspace: { branch: `loom/${state.id}/${attemptId}`, cwd: worktree },
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
  if (spentUsd >= state.budget.usd) {
    // Close the round out explicitly before stopping the campaign: a round that
    // silently vanishes leaves the ledger ambiguous about why no work started.
    runtime.append(
      view,
      'round.finished',
      { n, status: 'budget', score: null, promoted: false, spentUsd },
      'system',
    )
    runtime.append(view, 'campaign.status', { status: 'converged', reason: 'cost budget exhausted' }, 'system')
    raise('budget', { message: `spend $${spentUsd.toFixed(4)} reached cap $${state.budget.usd}` })
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
  const verifyCmd = task.verify?.cmd || 'echo no-verifier && exit 1'
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
    for (const { i, attemptId } of plan) {
      if (!survivors.includes(attemptId)) continue
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
        const brief = attemptBrief({
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
        })
        const timeoutMs = config.session.attemptTimeoutMs
        writeLease(view.dir, { attemptId, round: n, deadline: Date.now() + timeoutMs })
        const runRes = await dispatcher.run(brief, {
          cwd: wtPath,
          timeoutMs,
          label: `loom:${state.id}:r${n}a${i}`,
          model: config.models.worker || null,
          onStart: ({ sessionId, abort, deadline }) => {
            updateLease(view.dir, attemptId, { sessionId, deadline })
            runtime.watchAttempt({ attemptId, sessionId, abort, deadline })
          },
        })
        runtime.unwatchAttempt(attemptId)
        const stall = runtime.stallReason(attemptId)
        const abandoned = runRes.stopReason === 'aborted' && !runRes.timedOut ? stall || 'interrupted' : null

        const ver = await runVerifier(task.verify, { cwd: wtPath, timeoutMs: config.verify.timeoutMs })
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
        const gateOk = ver.ok && (lean ? lean.ok : true)
        const diff = await diffStat({ dir: wtPath }).catch(() => ({ files: 0, insertions: 0, deletions: 0, filesChanged: [] }))
        const patch = await makePatch({ dir: wtPath, outFile: join(view.dir, 'artifacts', `r${n}a${i}.patch`), base: base ?? 'HEAD' }).catch(() => null)
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
          costUsd: spend.usd,
          error: runRes.error,
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
        record = { ...record, durationMs: Date.now() - startedAt, error: String(err?.message ?? err) }
        log(`attempt ${attemptId} failed:`, record.error)
        try {
          updateLease(view.dir, attemptId, { state: 'failed', reason: record.error, endedAt: Date.now() })
        } catch {
          /* best effort */
        }
      }
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
    const heldOut = holdoutTasks(state)
    if (heldOut.length) {
      checks.holdout = true
      if (!best?.worktree || best.screenedOut) {
        checks.holdout = false
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
            log(`holdout task ${h.id} failed in ${best.worktree}: ${String(result.stderr || result.stdout || '').slice(-400)}`)
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
      const auto = config.loopPolicy.autoApply || state.autopilot?.enabled === true
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
        raise('gate', {
          message: `round ${n} produced a passing patch (score ${score}); review and apply`,
          patch: best.patch,
          attempt: best.id,
          score,
        })
      }
    }

    // `promoted` is what plateau detection reads: status can be 'promoted'
    // for a patch that still needed a human, but only a gate promotion is
    // progress. Recording it explicitly keeps the rounds array self-describing.
    const finished = runtime.append(
      view,
      'round.finished',
      { n, status: promote ? 'promoted' : rejectedByHoldout ? 'holdout-failed' : 'no-gain', score, promoted: promote === true },
      'system',
    )

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
    }
  } catch (err) {
    runtime.append(
      view,
      'round.finished',
      { n, status: 'error', score: null, error: String(err?.message ?? err), promoted: false },
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

export function raiseCheckpoint(runtime, view, kind, payload) {
  const id = nextCheckpointId()
  runtime.append(view, 'checkpoint.raised', { id, kind, payload }, 'system')
  return id
}
