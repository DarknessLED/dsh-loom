import { join } from 'node:path'
import { output } from './output.js'
import { svc } from '../core/services.js'
import { writeJsonAtomic } from '../core/atomic.js'
import { exportBundle } from '../report/export.js'
import { campaignDigest } from '../report/digest.js'
import { validateChainSpec } from '../chain/spec.js'
import { templateFor, TEMPLATES } from '../chain/templates.js'
import { compareChains, coverage } from '../chain/evidence.js'
import { proposeMutations } from '../chain/mutate.js'
import { applyPatch, reversePatch } from '../exec/patch.js'
import { commitWorkspace } from '../exec/worktree.js'
import { runVerifier } from '../exec/verifier.js'
import { checkLemma } from '../lean/gate.js'
import { probeLean } from '../lean/probe.js'
import { buildImaginePrompt, extractClaims, screenClaims } from '../lean/imagine.js'
import { diffPolicy, effectivePolicy, normalizePolicy } from '../loop/policy.js'
import { comparePolicies } from '../loop/replay.js'
import { campaignUsage } from '../runtime/cost.js'
import { holdUntil } from '../runtime/hold.js'
import { nextCheckpointId } from '../runtime/ids.js'
import { landingTarget } from '../runtime/round.js'
import { campaignQuality, qualityLine } from '../runtime/quality.js'
import { reviewQueue } from '../runtime/review.js'

const ID = { type: 'string', description: 'Campaign id (omit when only one campaign exists).' }

function viewOf(runtime, id) {
  // Runtimes expose `get` (cached) in production; lightweight embedders and
  // tests may only implement `open`. Both return the same { state, dir } view.
  if (typeof runtime.get === 'function') return runtime.get(String(id))
  return runtime.open(String(id))
}

function resolve(runtime, id) {
  if (id) return viewOf(runtime, id)
  const all = runtime.listCampaigns()
  if (all.length === 1) return viewOf(runtime, all[0])
  if (all.length === 0) throw new Error('no campaigns yet — call rsi_start first')
  throw new Error(`multiple campaigns (${all.join(', ')}); pass id`)
}

function brief(s) {
  return {
    id: s.id,
    status: s.status,
    objective: s.objective?.slice(0, 160) ?? '',
    rounds: s.rounds.length,
    budget: s.budget,
    chainVersion: s.chain.activeVersion ?? null,
    openCheckpoints: s.checkpoints.filter((c) => c.status === 'open').length,
  }
}

// The readable half of an attempt. `report`, `stdoutTail` and `agentTail` are
// what make a real `rsi_status` tens of kilobytes, and an agent reading the
// status cannot use a raw transcript; `detail:'full'` is the opt-in for the
// caller who genuinely needs the whole record.
const ATTEMPT_FIELDS = ['id', 'score', 'verifierOk', 'failureKind', 'abandoned', 'durationMs']
const ATTEMPT_FAT = ['report', 'stdoutTail', 'agentTail']

function compactAttempt(attempt) {
  if (!attempt || typeof attempt !== 'object') return attempt
  const out = {}
  for (const key of ATTEMPT_FIELDS) {
    if (key in attempt) out[key] = attempt[key]
  }
  return out
}

function compactNode(value) {
  if (Array.isArray(value)) return value.map(compactNode)
  if (!value || typeof value !== 'object') return value
  const out = {}
  for (const key of Object.keys(value)) {
    if (ATTEMPT_FAT.includes(key)) continue
    // Rounds carry their attempts under this name at whatever depth the status
    // reaches, so reduce them where they are rather than shipping transcripts.
    if (key === 'attempts' && Array.isArray(value[key])) out[key] = value[key].map(compactAttempt)
    else out[key] = compactNode(value[key])
  }
  return out
}

/**
 * Reduce a status to what a reader can act on, without losing the round shape.
 *
 * The default is the compact view — `rsi_status` is documented as cheap, and a
 * last round with three attempts' reports is not. `detail:'full'` returns the
 * input untouched: the reduction is never the only copy of the data.
 */
export function compactStatus(status, { detail } = {}) {
  if (detail === 'full') return status
  return compactNode(status)
}

export function registerTools(ctx, { runtime, config }) {
  const defs = []

  /**
   * Mutating tools take the loop over on demand: after a restart the previous
   * window may still hold the claim, and the visible window must not be stuck.
   */
  const own = () => {
    if (runtime.ensureOwner()) return
    throw new Error('another dsh-loom window is driving the loop and ownership could not be taken over; close it and retry')
  }

  defs.push({
    name: 'rsi_start',
    description:
      'Create or inspect an RSI campaign: an objective plus a budget plus a policy chain. ' +
      'Creating a campaign makes it "planning"; propose a chain with rsi_chain and an eval set with rsi_evalset, ' +
      'then arm it with rsi_control(action:"start") and this plugin runs rounds in the background. ' +
      'The human-in-the-loop main agent stays idle between checkpoints.',
    parameters: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'What "excellent" means for this campaign, in one paragraph.' },
        workspace: { type: 'string', description: 'Absolute path of the repo / directory the campaign operates on.' },
        id: { type: 'string', description: 'Optional slug id, /^[a-z0-9][a-z0-9-]{2,63}$/.' },
        budgetUsd: { type: 'number', description: 'API spend cap in USD (default 5).' },
        budgetTokens: { type: 'number', description: 'Token cap — what the provider actually meters. Optional; unset means no token cap.' },
        budgetRounds: { type: 'integer', description: 'Round cap (default 12).' },
        budgetMinutes: { type: 'integer', description: 'Wall-clock cap in minutes (default 240).' },
        template: {
          type: 'string',
          enum: Object.keys(TEMPLATES),
          description: 'Optional seed chain template to propose immediately.',
        },
        action: { type: 'string', enum: ['create', 'list', 'show'], description: 'Default: create when objective is given, else list.' },
      },
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 15_000,
    async execute(args = {}) {
      own()
      const action = args.action || (args.objective ? 'create' : 'list')
      if (action === 'list') return { campaigns: runtime.listCampaigns().map((id) => brief(runtime.get(id).state)) }
      if (action === 'show') return brief(resolve(runtime, args.id).state)
      if (!args.objective) throw new Error('objective is required')
      const budget = {}
      if (args.budgetUsd != null) budget.usd = Number(args.budgetUsd)
      if (args.budgetTokens != null) budget.tokens = Number(args.budgetTokens)
      if (args.budgetRounds != null) budget.rounds = Number(args.budgetRounds)
      if (args.budgetMinutes != null) budget.minutes = Number(args.budgetMinutes)
      const view = runtime.create({
        id: args.id,
        objective: String(args.objective),
        workspace: args.workspace ? String(args.workspace) : null,
        budget,
        actor: 'human',
        initiator: currentSessionId(ctx),
      })
      let chain = null
      if (args.template) {
        const tpl = templateFor(String(args.template))
        if (!tpl) throw new Error(`unknown template: ${args.template}`)
        const spec = { ...JSON.parse(JSON.stringify(tpl)), version: 1 }
        runtime.append(view, 'chain.proposed', { version: 1, spec }, 'agent')
        chain = { version: 1, name: spec.name }
      }
      return {
        campaign: view.id,
        status: view.state.status,
        chain,
        next: [
          'rsi_evalset(action:"register", tasks:[...], holdout:[...])',
          'rsi_chain(action:"activate", version:1)',
          'rsi_control(action:"start")',
        ],
      }
    },
  })

  defs.push({
    name: 'rsi_status',
    description:
      'Read campaign state: status, round count, budget, active chain, incumbent, last round, open checkpoints. ' +
      'Cheap; safe to call often.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        detail: {
          type: 'string',
          enum: ['compact', 'full'],
          description:
            "Default 'compact': each attempt is reduced to id, score, verifierOk, failureKind, abandoned, durationMs. " +
            "'full' returns the untouched record (reports and tails included) when the transcript itself is the question.",
        },
      },
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 10_000,
    async execute(args = {}) {
      const all = runtime.listCampaigns()
      if (!args.id && all.length !== 1) {
        if (!all.length) throw new Error('no campaigns yet — call rsi_start first')
        // Same reduction as the single-campaign view: a status is cheap
        // whichever door it is read through.
        return compactStatus(
          {
            campaigns: all.map((id) => brief(runtime.get(id).state)),
            live: runtime.liveAttempts(),
          },
          { detail: args.detail },
        )
      }
      const id = args.id ? String(args.id) : all[0]
      // Rank the open decisions so the most dangerous one is read first; the
      // status view already carries the checkpoints, so no extra ledger read.
      const pending = reviewQueue(runtime.status(id))
      return compactStatus(
        {
          ...runtime.status(id),
          live: runtime.liveAttempts(),
          pendingReviews: pending,
          reviewLines: pending.map(
            (r) => `[${r.risk}] ${r.id} (${r.kind}) — ${r.summary} → ${r.recommendation}`,
          ),
        },
        { detail: args.detail },
      )
    },
  })

  defs.push({
    name: 'rsi_control',
    description:
      'Control a campaign or the loop itself: enable/disable the RSI loop (global master switch, survives restarts, ' +
      'never rewrites campaign history), pause, resume, stop a campaign, change budget, add a constraint or a note. ' +
      'Constraints are binding instructions for every future round (they are injected into worker prompts).',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        action: {
          type: 'string',
          enum: ['enable', 'disable', 'pause', 'resume', 'start', 'stop', 'budget', 'constraint', 'note', 'autopilot'],
          description: 'enable/disable: the global loop switch (no campaign required).',
        },
        usd: { type: 'number', description: 'action=budget: new USD cap' },
        tokens: { type: 'number', description: 'action=budget: new token cap (what the provider actually meters)' },
        rounds: { type: 'integer', description: 'action=budget: new round cap' },
        text: { type: 'string', description: 'action=constraint|note: the text' },
        reason: { type: 'string', description: 'action=stop|enable|disable: why' },
        enabled: { type: 'boolean', description: 'action=autopilot: apply verified patches without waiting for a human.' },
        guard: {
          type: 'string',
          description: 'action=autopilot: command run in the workspace after each applied patch; a non-zero exit rolls the patch back.',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 15_000,
    async execute(args = {}) {
      const action = String(args.action)
      // The switch is checked before ownership on purpose: an operator must be
      // able to stop a runaway loop from a window that does not drive it.
      if (action === 'enable' || action === 'disable') {
        const record = runtime.setEnabled(action === 'enable', { by: 'human', reason: args.reason ?? null })
        return {
          rsi: { enabled: record.enabled, at: record.at, by: record.by, reason: record.reason },
          note: record.enabled
            ? 'loop enabled — the next tick dispatches again; campaign history was not touched'
            : 'loop disabled — nothing will be dispatched; every tool keeps working and history is untouched',
        }
      }
      own()
      const view = resolve(runtime, args.id)
      let state
      if (action === 'start') {
        if (view.state.status !== 'planning') throw new Error(`cannot start from ${view.state.status}`)
        state = runtime.append(view, 'campaign.status', { status: 'running' }, 'human')
      } else if (action === 'stop') {
        state = runtime.control(view.id, 'stop', { reason: args.reason }, 'human')
        // "Stopped" should mean the child is stopped too. Abort is best-effort:
        // the attempt still finishes through its own path and records whether it
        // was interrupted, so nothing is silently rewritten.
        const aborted = runtime.abortCampaign ? runtime.abortCampaign(view.id) : 0
        if (aborted) runtime.append(view, 'campaign.aborted', { attempts: aborted }, 'human')
      } else {
        state = runtime.control(view.id, action, {
          usd: args.usd,
          tokens: args.tokens,
          rounds: args.rounds,
          text: args.text,
          enabled: args.enabled,
          guard: args.guard,
        }, 'human')
      }
      return brief(state)
    },
  })

  defs.push({
    name: 'rsi_run',
    description:
      'Run exactly one round of a campaign right now, even when the loop switch is off. ' +
      'Use it to spend one round on a specific campaign without restarting the background loop; ' +
      'the round still goes through the same worktree, verifier, gate and checkpoint path.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
      },
      required: ['id'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 1_200_000,
    async execute(args = {}) {
      own()
      const view = resolve(runtime, args.id)
      if (view.state.status === 'draft' || view.state.status === 'planning') {
        throw new Error(`campaign ${view.id} is ${view.state.status}: register an evalset and activate a chain first`)
      }
      const result = await runtime.runOnce(view.id)
      return { ...result, switch: runtime.enabled(), next: 'rsi_status for the round; rsi_dashboard for the board' }
    },
  })

  defs.push({
    name: 'rsi_chain',
    description:
      'Inspect, propose, or activate a policy chain (the work pipeline). ' +
      'A chain is JSON: {name, version, params, nodes[]}, node types agent|verifier|human|map. ' +
      'Start from rsi_start(template:...) or rsi_chain(action:"templates"). ' +
      'Proposing does not run anything; activation makes the next round execute it.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        action: { type: 'string', enum: ['show', 'templates', 'propose', 'activate', 'auto', 'compare', 'promote'] },
        version: { type: 'integer', description: 'action=activate: which version to make active' },
        spec: { type: 'object', description: 'action=propose: the chain spec (JSON object)' },
        template: { type: 'string', description: 'action=propose: seed from this template name instead of spec' },
        confirm: { type: 'boolean', description: 'action=promote: skip the human checkpoint and activate now.' },
        candidate: { type: 'integer', description: 'action=compare/promote: the chain version to evaluate (default: newest candidate).' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 20_000,
    async execute(args = {}) {
      own()
      const action = String(args.action)
      if (action === 'templates') {
        return Object.values(TEMPLATES).map((t) => ({ name: t.name, description: t.description, nodes: t.nodes.length }))
      }
      const view = resolve(runtime, args.id)
      if (action === 'show') {
        return { active: view.state.chain.activeVersion, versions: view.state.chain.versions.map((v) => ({ version: v.version, status: v.status, name: v.spec?.name })) }
      }
      if (action === 'propose') {
        let spec = args.spec
        if (!spec && args.template) spec = templateFor(String(args.template))
        if (!spec) throw new Error('propose needs spec or template')
        const errs = validateChainSpec(spec)
        if (errs.length) throw new Error(`invalid chain spec: ${errs.join('; ')}`)
        const version = Number(spec.version)
        runtime.append(view, 'chain.proposed', { version, spec }, 'agent')
        return { proposed: version, name: spec.name, nodes: spec.nodes.length }
      }
      if (action === 'activate') {
        const version = Number(args.version)
        const found = view.state.chain.versions.find((v) => v.version === version)
        if (!found) throw new Error(`no chain version ${version}`)
        runtime.append(view, 'chain.activated', { version }, 'agent')
        return { active: version, name: found.spec?.name }
      }
      if (action === 'auto') {
        const active = view.state.chain.versions.find((v) => v.version === view.state.chain.activeVersion)
        if (!active) throw new Error('no active chain to mutate')
        const maxMutations = Number(config.chain?.maxMutations) || 3
        let nextVersion = view.state.chain.versions.reduce((m, v) => Math.max(m, Number(v.version) || 0), 0) + 1
        const produced = proposeMutations(active.spec, { fromVersion: nextVersion, max: maxMutations })
        for (const m of produced) {
          runtime.append(view, 'chain.proposed', { version: m.spec.version, spec: m.spec }, 'system')
        }
        return {
          parent: active.version,
          proposed: produced.map((m) => ({ version: m.spec.version, kind: m.kind, rationale: m.rationale })),
          note: 'each candidate needs paired rounds on the same tasks before promote will accept it',
        }
      }
      if (action === 'compare' || action === 'promote') {
        const rounds = view.state.rounds.map((r) => ({ n: r.n, taskId: r.taskId, chainVersion: r.chainVersion, attempts: r.attempts || [] }))
        const baseVersion = view.state.chain.activeVersion
        const candVersion =
          args.candidate != null
            ? Number(args.candidate)
            : (view.state.chain.versions.filter((v) => v.version !== baseVersion).map((v) => Number(v.version)).sort((a, b) => b - a)[0] ?? null)
        if (candVersion == null) throw new Error('no chain candidate to compare; run rsi_chain(action:"auto") first')
        const cmp = compareChains({
          rounds,
          baseVersion,
          candidateVersion: candVersion,
          minTasks: Number(config.chain?.minTasks) || 6,
          minGain: Number(config.chain?.minGain) || 0.05,
          holdoutSlack: Number(config.chain?.holdoutSlack) || 0.02,
        })
        const summary = { ...cmp, coverage: coverage(rounds) }
        if (action === 'compare') return summary
        if (!cmp.ok) {
          throw new Error(`chain v${candVersion} not promoted: ${cmp.reason} (paired tasks ${cmp.pairedTasks}, delta ${cmp.delta})`)
        }
        runtime.append(view, 'artifact.promoted', { kind: 'chain', version: candVersion, score: cmp.candidateScore, delta: cmp.delta }, 'system')
        if (config.loopPolicy?.humanGate !== false && args.confirm !== true) {
          const cpId = nextCheckpointId()
          runtime.append(
            view,
            'checkpoint.raised',
            {
              id: cpId,
              kind: 'chain',
              payload: { checkpoint: cpId, chainVersion: candVersion, delta: cmp.delta, pairedTasks: cmp.pairedTasks },
            },
            'system',
          )
          return { ...summary, promoted: false, checkpoint: cpId, note: 'evidence accepted; activate after rsi_decide(decision:"approve")' }
        }
        runtime.append(view, 'chain.activated', { version: candVersion }, 'human')
        return { ...summary, promoted: true, activated: candVersion }
      }
      throw new Error(`unknown action: ${action}`)
    },
  })

  defs.push({
    name: 'rsi_evalset',
    description:
      'Register the evaluation tasks for a campaign: each task is a prompt plus a mechanical verifier ' +
      '(command + exit code, optional JSON metrics). Holdout tasks are never shown to worker agents ' +
      'and are used only by the promotion gate.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        action: { type: 'string', enum: ['show', 'register'] },
        tasks: {
          type: 'array',
          description: 'action=register: [{id, prompt, verify:{cmd, cwd?, timeoutMs?, metrics?}}]',
          items: { type: 'object', additionalProperties: true },
        },
        holdout: { type: 'array', description: 'action=register: task ids reserved for the gate', items: { type: 'string' } },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 15_000,
    async execute(args = {}) {
      own()
      const view = resolve(runtime, args.id)
      if (String(args.action) === 'show') {
        return { tasks: view.state.evalset.tasks, holdout: view.state.evalset.holdout }
      }
      const tasks = Array.isArray(args.tasks) ? args.tasks : []
      if (!tasks.length) throw new Error('register needs a non-empty tasks array')
      const ids = new Set()
      for (const t of tasks) {
        if (!t?.id || typeof t.prompt !== 'string' || !t.verify?.cmd) {
          throw new Error('each task needs id, prompt, verify.cmd')
        }
        if (ids.has(t.id)) throw new Error(`duplicate task id: ${t.id}`)
        ids.add(t.id)
      }
      const holdout = Array.isArray(args.holdout) ? args.holdout.map(String) : []
      for (const h of holdout) if (!ids.has(h)) throw new Error(`holdout task not in tasks: ${h}`)
      runtime.append(view, 'evalset.registered', { tasks, holdout }, 'human')
      return { registered: tasks.length, holdout: holdout.length }
    },
  })

  defs.push({
    name: 'rsi_decide',
    description:
      'Answer an open checkpoint raised by the loop (promotion approval, budget warning, anomaly, plateau). ' +
      'Optional: the loop keeps running on its own, so silence is not a stop unless the checkpoint says so.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        checkpoint: { type: 'string', description: 'Checkpoint id' },
        decision: { type: 'string', enum: ['approve', 'reject', 'hold', 'stop', 'continue'] },
        note: { type: 'string' },
      },
      required: ['decision'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 15_000,
    async execute(args = {}) {
      own()
      const view = resolve(runtime, args.id)
      const open = view.state.checkpoints.filter((c) => c.status === 'open')
      const target = args.checkpoint ? open.find((c) => c.id === args.checkpoint) : open[open.length - 1]
      if (!target) throw new Error('no open checkpoint to answer')

      if (args.decision === 'hold') {
        // Holding postpones the question; it is not an answer. The checkpoint
        // stays open and the ledger records when it is worth reading again, so
        // the queue can show it as deferred instead of destructuring it.
        const until = holdUntil(config)
        runtime.append(view, 'checkpoint.held', { checkpoint: target.id, until }, 'human')
        return {
          deferred: true,
          answered: target.id,
          until,
          decision: 'hold',
          applied: false,
          landed: null,
          reverted: null,
          status: view.state.status,
        }
      }

      if (args.decision === 'approve' && target.kind === 'chain' && target.payload?.chainVersion != null) {
        runtime.append(view, 'chain.activated', { version: Number(target.payload.chainVersion) }, 'human')
      }
      if (args.decision === 'approve' && target.kind === 'policy' && target.payload?.policy) {
        // The checkpoint asks a human to agree to a change, so the event must
        // say what the change is. Diff the effective policy in force against
        // the effective policy the promotion would put in force — unset fields
        // fall back to config, so comparing raw blobs would both invent changes
        // and hide them.
        const before = effectivePolicy({ state: view.state, config })
        const after = effectivePolicy({
          state: { ...view.state, policy: { ...(view.state.policy || {}), policy: target.payload.policy } },
          config,
        })
        runtime.append(
          view,
          'policy.promoted',
          { version: target.payload.policyVersion ?? null, policy: target.payload.policy, diff: diffPolicy(before, after) },
          'human',
        )
      }

      let applied = null
      let landed = null
      if (args.decision === 'approve' && target.payload?.patch) {
        if (!view.state.workspace) throw new Error('campaign has no workspace to apply into')
        applied = await applyPatch({ repo: view.state.workspace, patchFile: target.payload.patch })
        if (!applied.ok) {
          throw new Error(`cannot apply patch: ${applied.reason} ${typeof applied.detail === 'string' ? applied.detail : ''}`.trim())
        }
        // Approval is not the same thing as landing. Until the applied change is
        // committed and the round is told it landed, two things stay broken: the
        // selector keeps offering a task the campaign already solved, and the next
        // round diffs against a base commit that no longer matches the workspace.
        const guard = view.state.autopilot?.guard || null
        let checked = null
        if (guard) {
          checked = await runVerifier({ cmd: guard }, { cwd: view.state.workspace, timeoutMs: config?.verify?.timeoutMs }).catch(
            (err) => ({ ok: false, stderr: String(err?.message ?? err) }),
          )
          if (checked.ok !== true) {
            const undone = await reversePatch({ repo: view.state.workspace, patchFile: target.payload.patch })
            throw new Error(
              `guard failed after applying the patch (${guard}); reverted: ${undone.ok === true}`,
            )
          }
        }
        // The checkpoint may not carry a round: an anomaly raised while applying a
        // promotion knows the artifact path, not the round number. Resolve it from
        // state (landingTarget) so the reducer can mark this round landed - else the
        // selector keeps offering a task the campaign already solved.
        const landing = landingTarget(view.state, target.payload)
        const round = landing.round
        const attemptId = landing.attemptId
        const commit = await commitWorkspace(
          view.state.workspace,
          `loom ${view.state.id}: apply approved promotion${round ? ` (round ${round})` : ''}`,
        )
        landed = { round, attemptId, guard, checked, commit }
        runtime.append(
          view,
          'autopilot.applied',
          {
            round,
            attemptId,
            patch: target.payload.patch,
            guard,
            guardOk: checked ? checked.ok === true : null,
            committed: commit.committed === true,
            commit: commit.sha ?? null,
            by: 'human',
          },
          'human',
        )
      }

      let reverted = null
      if (args.decision === 'reject' && target.payload?.staged && target.payload?.patch) {
        // A human gate stages the candidate diff in the workspace so the
        // reviewer can see it. Rejecting must undo that stage, or the change
        // the person refused would linger as an unexplained dirty tree.
        reverted = await reversePatch({ repo: view.state.workspace, patchFile: target.payload.patch })
      }

      const state = runtime.append(
        view,
        'checkpoint.answered',
        { id: target.id, answer: { decision: args.decision, note: args.note || null, applied: applied?.ok ?? false } },
        'human',
      )
      if (args.decision === 'stop') {
        runtime.append(view, 'campaign.status', { status: 'stopped', reason: 'human stop' }, 'human')
      }
      return {
        answered: target.id,
        decision: args.decision,
        applied: applied?.ok ?? false,
        landed: landed ? { round: landed.round, committed: landed.commit?.committed === true, commit: landed.commit?.sha ?? null } : null,
        reverted: reverted?.ok ?? null,
        status: view.state.status,
      }
    },
  })

  defs.push({
    name: 'rsi_report',
    description: 'Human-readable round report: what happened, why the winner won, what is blocked, cost so far.',
    parameters: {
      type: 'object',
      properties: { id: ID, limit: { type: 'integer', description: 'How many recent rounds to include (default 5).' } },
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 10_000,
    async execute(args = {}) {
      const v = resolve(runtime, args.id)
      const s = v.state
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 5))
      const rounds = Array.isArray(s.rounds) ? s.rounds : []
      const constraints = Array.isArray(s.constraints) ? s.constraints : []
      const checkpoints = Array.isArray(s.checkpoints) ? s.checkpoints : []
      const lessons = Array.isArray(s.lessons) ? s.lessons : []
      const budget = s.budget ?? {}
      const spend = campaignUsage(rounds)
      // Lead with the bounded catch-up, so the first screen of a report says
      // what changed and what needs a human before the ledger table starts.
      const lines = [
        campaignDigest(s, { rounds: limit }),
        '',
        `# RSI campaign ${s.id}`,
        `status: ${s.status} · rounds ${rounds.length}/${budget.rounds ?? '-'} · spend $${spend.usd.toFixed(3)}/$${budget.usd ?? '-'} (computed from ${spend.inputTokens} in / ${spend.outputTokens} out tokens${spend.estimated ? ', estimated from transcripts' : ''})`,
        `objective: ${s.objective ?? ''}`,
        `chain: v${s.chain?.activeVersion ?? '-'} · incumbent: ${s.incumbent ? `round ${s.incumbent.round ?? s.incumbent.chainVersion ?? '?'} score ${s.incumbent.score}` : 'none'}`,
      ]
      if (constraints.filter((c) => c.active).length) {
        lines.push('', 'constraints:', ...constraints.filter((c) => c.active).map((c) => `- ${c.text}`))
      }
      const open = checkpoints.filter((c) => c.status === 'open')
      if (open.length) lines.push('', 'open checkpoints:', ...open.map((c) => `- [${c.id}] ${c.kind}`))
      // One line per round, as a table: a settled campaign is only auditable if
      // the human can see which round ran which task, what it scored and
      // whether the gate promoted it. A one-line summary hides wasted rounds.
      lines.push('', 'round history:')
      lines.push('| round | task | score | verdict | attempts |')
      lines.push('| --- | --- | --- | --- | --- |')
      for (const r of rounds.slice(-limit)) {
        lines.push(
          `| ${r.n} | ${r.taskId ?? '-'} | ${r.score == null ? '-' : r.score} | ${r.status} | ${r.attempts?.length ?? 0} |`,
        )
      }
      if (!rounds.length) lines.push('| - | - | - | (none yet) | - |')
      // The table shows what each round did; this line says whether the loop is
      // still working or spinning, so a human does not have to infer it from
      // the verdicts. Same helper the panel uses, so the two surfaces cannot
      // disagree about the same campaign.
      lines.push('', qualityLine(campaignQuality(s)))
      lines.push('', 'lessons:')
      for (const l of lessons) {
        const claim = String(l.claim || '').replace(/\s+/g, ' ').trim()
        const short = claim.length > 120 ? `${claim.slice(0, 119)}…` : claim
        lines.push(
          `- ${l.id} [${l.status}] claim: ${short} · uses ${l.useCount ?? 0} · gain ${l.gainSum ?? 0} · harm ${l.harmCount ?? 0}`,
        )
      }
      if (!lessons.length) lines.push('- (none)')
      return lines.join('\n')
    },
  })

  defs.push({
    name: 'rsi_lean',
    description:
      'Mechanically check a Lean 4 claim, or see whether a toolchain exists. ' +
      'action:"probe" reports lean/lake versions and the install command when missing. ' +
      'action:"check" compiles the claim in a scratch project and rejects it for any of: sorry/admit, ' +
      'a new axiom/constant/opaque, native_decide, @[implemented_by], unsafe, an import outside the ' +
      'allow-list, a compile error, or an axiom report outside {propext, Classical.choice, Quot.sound} ' +
      'plus the configured extras. This is the gate a mathematical claim has to pass before it may ' +
      'steer an algorithmic campaign; it never asks a model whether a proof is valid.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['probe', 'check', 'imagine'], description: 'probe = environment check; imagine = cheap claim screening; check = verify a claim.' },
        source: { type: 'string', description: 'Lean source (theorem/lemma with its proof). Required for action:"check".' },
        theorem: { type: 'string', description: 'Theorem name to run #print axioms on. Omit to skip the axiom check.' },
        task: { type: 'object', description: 'action=imagine: the task the claims are about ({id, prompt}).' },
        maxClaims: { type: 'integer', description: 'action=imagine: how many claims to keep (default 3).' },
        imports: { type: 'array', items: { type: 'string' }, description: 'Imports to place at the top of the check file.' },
        allowedImports: {
          type: 'array',
          items: { type: 'string' },
          description: 'Allow-list for imports (overrides the campaign config). An import outside it fails the claim.',
        },
        allowAxioms: { type: 'array', items: { type: 'string' }, description: 'Extra axiom names to tolerate.' },
        compiler: { type: 'string', enum: ['lake', 'lean'], description: 'Which binary compiles the claim (default: config).' },
        dir: { type: 'string', description: 'Existing Lake project directory to compile in (default: a scratch dir).' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => false,
    timeoutMs: 300_000,
    async execute(args = {}) {
      const leanCfg = config.lean || {}
      if (args.action === 'probe') {
        return probeLean()
      }
      if (args.action === 'imagine') {
        const raw = String(args.source || '')
        // Two modes: with statements, screen them; without, hand back the brief
        // that asks an agent for statements. Both are free.
        if (!raw.trim()) {
          return { prompt: buildImaginePrompt({ task: args.task || null, maxClaims: Number(args.maxClaims) || 3 }) }
        }
        const claims = extractClaims(raw)
        const screened = screenClaims(claims, { task: args.task || null, max: Number(args.maxClaims) || 3 })
        return { extracted: claims.length, ...screened, next: screened.accepted.length ? 'run rsi_lean(action:"check", source:<claim + proof>) on the survivors' : 'no claim worth proving; stay with tests alone' }
      }
      if (!args.source || !String(args.source).trim()) throw new Error('source is required for action:"check"')
      return checkLemma({
        source: args.source,
        theorem: args.theorem ?? null,
        imports: Array.isArray(args.imports) ? args.imports : [],
        allowedImports: Array.isArray(args.allowedImports) ? args.allowedImports : leanCfg.allowedImports || [],
        allowAxioms: Array.isArray(args.allowAxioms) ? args.allowAxioms : leanCfg.allowAxioms || [],
        dir: args.dir ?? null,
        compiler: args.compiler || leanCfg.compiler || 'lake',
        timeoutMs: leanCfg.timeoutMs ?? 120_000,
      })
    },
  })


  defs.push({
    name: 'rsi_replay',
    description:
      'L2: replay the rounds already recorded under a candidate loop policy, without calling a single model. ' +
      'It answers "would a stricter gain bar / fewer candidates have promoted less and ended lower?" from numbers ' +
      'alone — it cannot simulate different tasks or prompts, so a tie is not evidence of improvement. ' +
      'commit:true freezes the comparison as a policy proposal and raises a human checkpoint; the policy only ' +
      'takes effect after rsi_decide(decision:"approve").',

    parameters: {
      type: 'object',
      properties: {
        id: ID,
        minGain: { type: 'number', description: 'Candidate promotion gain threshold (0..1).' },
        candidates: { type: 'integer', description: 'Candidate attempts per round (1..4).' },
        knowledge: { type: 'boolean', description: 'Inject statement-form lessons at all.' },
        halving: { type: 'boolean', description: 'Screen candidates before the expensive attempt.' },
        commit: { type: 'boolean', description: 'Record the comparison and raise a policy checkpoint.' },
        note: { type: 'string', description: 'Why this policy is worth trying (kept in the audit trail).' },
      },
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 20_000,
    async execute(args = {}) {
      own()
      const v = resolve(runtime, args.id)
      const state = v.state
      const rounds = state.rounds.map((r) => ({ n: r.n, attempts: r.attempts || [] }))
      const base = effectivePolicy({ state, config })
      const candidate = normalizePolicy(
        { minGain: args.minGain, candidates: args.candidates, knowledge: args.knowledge, halving: args.halving },
        base,
      )
      const cmp = comparePolicies({ rounds, base, candidate })
      const summary = {
        verdict: cmp.verdict,
        roundsReplayed: rounds.length,
        base: cmp.base.metrics,
        candidate: cmp.candidate.metrics,
        delta: cmp.delta,
        basePolicy: cmp.base.policy,
        candidatePolicy: cmp.candidate.policy,
        committed: false,
      }
      if (!rounds.length) {
        return { ...summary, message: 'no rounds recorded yet — replay needs history to re-decide' }
      }
      // A replay cannot invent evidence, and a policy change that looks better on
      // four rounds is a guess. Both facts belong in the checkpoint the human sees.
      if (args.commit) {
        const version = Number(state.policy?.version || 0) + 1
        const cpId = nextCheckpointId()
        runtime.append(
          v,
          'policy.proposed',
          {
            version,
            policy: cmp.candidate.policy,
            evidence: { verdict: cmp.verdict, rounds: rounds.length, delta: cmp.delta, base: cmp.base.metrics, candidate: cmp.candidate.metrics },
            note: args.note || null,
          },
          'system',
        )
        runtime.append(
          v,
          'checkpoint.raised',
          {
            id: cpId,
            kind: 'policy',
            payload: { checkpoint: cpId, policyVersion: version, policy: cmp.candidate.policy, verdict: cmp.verdict, delta: cmp.delta },
          },
          'system',
        )
        summary.committed = true
        summary.checkpoint = cpId
        summary.policyVersion = version
      }
      return summary
    },
  })

  defs.push({
    name: 'rsi_dashboard',
    description:
      'One board for every campaign: status, rounds and spend against the caps, best score, open checkpoints, ' +
      'live child attempts, and how much knowledge has accumulated. Cheap enough to call on every interaction; ' +
      'this is the "what is my loop doing right now" view.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 10_000,
    async execute() {
      const sw = runtime.switchState()
      const ids = runtime.listCampaigns()
      if (!ids.length) {
        return { campaigns: [], rsi: { enabled: sw.enabled, at: sw.at, by: sw.by }, text: 'No RSI campaigns yet. rsi_start(objective, workspace) to begin.' }
      }
      const live = runtime.liveAttempts()
      const rows = []
      for (const id of ids) {
        const v = runtime.get(id)
        const s = v.state
        const lessons = s.lessons || []
        rows.push({
          id: s.id,
          status: s.status,
          rounds: `${s.rounds.length}/${s.budget.rounds}`,
          spend: `${s.budget.spentUsd.toFixed(2)}/${s.budget.usd}`,
          best: s.incumbent?.score ?? null,
          open: s.checkpoints.filter((c) => c.status === 'open').length,
          lessons: lessons.filter((l) => l.status === 'active').length,
          quarantined: lessons.filter((l) => l.status === 'quarantined').length,
          policy: s.policy?.status === 'promoted' ? `v${s.policy.version}` : 'default',
          objective: (s.objective || '').slice(0, 80),
        })
      }
      const lines = ['| campaign | status | rounds | spend | best | open | lessons | policy | objective |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
      for (const r of rows) {
        lines.push(
          `| ${r.id} | ${r.status} | ${r.rounds} | $${r.spend} | ${r.best ?? '-'} | ${r.open} | ${r.lessons}${r.quarantined ? ` (+${r.quarantined}q)` : ''} | ${r.policy} | ${r.objective} |`,
        )
      }
      if (live.length) lines.push('', `live attempts: ${live.map((a) => `${a.attemptId} (idle ${Math.round(a.idleMs / 1000)}s)`).join(', ')}`)
      // The switch is the first thing a reader needs: "nothing is moving" has two
      // very different causes (no running campaign, or the loop is off by hand).
      const head = sw.enabled ? 'loop: on' : `loop: OFF (by ${sw.by}${sw.at ? ` at ${new Date(sw.at).toISOString().slice(0, 16).replace('T', ' ')}` : ''}) — nothing is dispatched`
      return { campaigns: rows, live, rsi: { enabled: sw.enabled, at: sw.at, by: sw.by }, text: [head, ...lines].join(String.fromCharCode(10)) }
    },
  })

  // Export needs to re-open a campaign from its append-only ledger to snapshot a
  // settled campaign, so advertise it only where the runtime exposes `open`.
  // A view-only host cannot produce a trustworthy bundle and says so by omission.
  if (typeof runtime.open === 'function') defs.push({
    name: 'rsi_export',
    description:
      'Export one campaign as a single self-contained, JSON round-trippable bundle: campaign identity, active chain spec, ' +
      'effective policy, eval set, and one artifact per attempt that actually landed. Writes <campaign>/export/bundle.json ' +
      'so the evidence can be archived or attached to a report instead of living only under the loom home directory.',
    parameters: {
      type: 'object',
      properties: {
        id: ID,
        outDir: {
          type: 'string',
          description: 'Optional campaign directory to write under (default: the campaign directory itself).',
        },
      },
      additionalProperties: false,
    },
    output: output(),
    isConcurrencySafe: () => true,
    timeoutMs: 10_000,
    async execute(args = {}) {
      // Registration is gated on `runtime.open`, so re-reading the ledger here is safe.
      const view = args.id ? runtime.open(String(args.id)) : resolve(runtime)
      const bundle = exportBundle({ state: view.state, view, config })
      const root = args.outDir ? String(args.outDir) : view.dir
      const path = join(root, 'export', 'bundle.json')
      writeJsonAtomic(path, bundle)
      return { written: true, path }
    },
  })

  const tools = svc(ctx, 'tools')
  return defs.map((def) => ctx.effect(() => tools.register(def), `dsh-loom: tool(${def.name})`))
}

/** The session that is talking to us, when a tool callback is running. */
function currentSessionId(ctx) {
  try {
    const agent = svc(ctx, 'agents')?.currentInitiator?.()
    return agent?.id ?? null
  } catch {
    return null
  }
}
