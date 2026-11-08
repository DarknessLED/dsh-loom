import { svc } from '../core/services.js'
import { campaignQuality } from '../runtime/quality.js'
import { campaignTriangle } from '../runtime/triangle.js'
import { reviewQueue } from '../runtime/review.js'
import { holdUntil } from '../runtime/hold.js'
import { activeChain, policyFor } from '../runtime/round.js'

/**
 * The browser half's only data source: one JSON route.
 *
 * The panel never touches campaign files and never dispatches rounds itself —
 * it reads the same materialized state the tools read, and every mutating
 * button goes through the same event appends the tools use.
 */

const MAX_BODY = 64 * 1024

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function openCheckpointsOf(state) {
  if (Array.isArray(state?.checkpoints)) {
    return state.checkpoints.filter((c) => c && c.status === 'open')
  }
  if (Array.isArray(state?.openCheckpoints)) return state.openCheckpoints.filter(Boolean)
  return []
}

/**
 * The node rows one campaign's ledger recorded, newest round first.
 *
 * A round's wall clock says what was paid; only its nodes say who was paid.
 * The rows travel to the panel through this one projection so the browser and
 * any host-side reader attribute time the same way: `{id, role, round, status,
 * durationMs}`, capped so the panel stays a panel rather than a log viewer.
 * A ledger written before node identity has no rows, and that is `[]`, not an
 * invented attribution.
 */
export function nodesFor(state, opts = {}) {
  const rows = Array.isArray(state?.nodes) ? state.nodes : []
  const asked = Number(opts?.limit)
  const limit = Number.isFinite(asked) && asked >= 0 ? Math.floor(asked) : 6
  return rows
    .filter((n) => n && typeof n === 'object')
    .map((n) => ({
      id: n.id ?? null,
      role: n.role ?? null,
      round: Number.isFinite(Number(n.round)) ? Number(n.round) : null,
      status: n.status ?? null,
      durationMs: Number.isFinite(Number(n.durationMs)) ? Number(n.durationMs) : null,
    }))
    .sort((a, b) => (b.round ?? -Infinity) - (a.round ?? -Infinity))
    .slice(0, limit)
}

function campaignRow(view, now, campaignId, config) {
  const s = view.state
  const open = openCheckpointsOf(s)
  // The panel ships the same ranked queue rsi_status prints, so the riskiest
  // pending decision is visible without opening the campaign. `open` stays a
  // numeric count for the badge.
  const reviews = reviewQueue(s)
    .slice(0, 3)
    .map(({ id, kind, risk, summary }) => ({ id, kind, risk, summary }))
  const lessons = Array.isArray(s.lessons) ? s.lessons : []
  const lessonsTop = lessons
    .filter((l) => l.status === 'active')
    .map((l) => ({
      id: l.id,
      claim: l.claim ?? '',
      kind: l.kind ?? 'fact',
      score: Number(l.gainSum) || 0,
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, 3)
  const rounds = Array.isArray(s.rounds) ? s.rounds : []
  const last = rounds[rounds.length - 1] || null
  // The active chain is the "how" of the campaign, and it is a tree a reader
  // can check at a glance. It is read defensively: a campaign whose chain was
  // never activated is still a campaign worth showing.
  let chain = null
  try {
    const spec = activeChain(s)
    const nodes = Array.isArray(spec?.nodes) ? spec.nodes : []
    chain = {
      version: s.chain?.activeVersion ?? null,
      name: spec?.name ?? null,
      nodes: nodes.map((n) => ({ type: n?.type ?? 'agent', name: n?.name ?? null })),
      count: nodes.length,
    }
  } catch {
    chain = null
  }
  const attempts = last
    ? (last.attempts || []).map((a) => ({
        id: a.id,
        score: a.score ?? null,
        verifierOk: a.verifierOk ?? null,
        screenedOut: a.screenedOut === true,
        abandoned: a.abandoned?.reason ?? null,
        chainVersion: a.chainVersion ?? null,
      }))
    : []
  // The knob a campaign actually turned is the one a reader must see, so this
  // is the resolved policy (campaign override over loader config over default)
  // and not the config the next round would inherit. A bad override is named in
  // `rejected` instead of being shown as if it were in force.
  let loop = null
  try {
    loop = policyFor({ config, campaign: s })
  } catch {
    loop = null
  }
  return {
    // The row is keyed by the id the runtime listed; in production that is the
    // state id, but the route must not rename a campaign it was asked about.
    id: campaignId ?? s.id,
    status: s.status,
    objective: s.objective ?? '',
    workspace: s.workspace ?? null,
    rounds: rounds.length,
    spendUsd: Math.round((s.budget?.spentUsd ?? 0) * 1e6) / 1e6,
    budget: s.budget ?? null,
    chainVersion: s.chain?.activeVersion ?? null,
    chain,
    incumbent: s.incumbent
      ? { round: s.incumbent.round ?? null, score: s.incumbent.score ?? null }
      : null,
    policy: s.policy?.status ? { status: s.policy.status, version: s.policy.version } : null,
    // What runs, not just what was written down: `policy` above is the record,
    // `loop` is the merged knobs with the source of each value.
    loop,
    tasks: Array.isArray(s.evalset?.tasks) ? s.evalset.tasks.length : 0,
    holdout: Array.isArray(s.evalset?.holdout) ? s.evalset.holdout.length : 0,
    lessons: lessons.length,
    quarantined: lessons.filter((l) => l.status === 'quarantined').length,
    lessonsTop,
    // The report prints the same reading; computing it here (rather than in the
    // browser) keeps the sidebar and the report on one definition of health.
    quality: campaignQuality(s),
    // Efficiency / quality / cost, computed on the host so the sidebar, the
    // report and scripts/loom-metrics.mjs cannot disagree about the numbers.
    triangle: campaignTriangle(rounds),
    open: open.length,
    reviews,
    openCheckpoints: open.map((c) => ({
      id: c.id,
      kind: c.kind,
      at: c.at ?? null,
      payload: c.payload ?? null,
      // A checkpoint a human postponed stays open; the client needs the instant
      // to show it as deferred instead of as work that is waiting right now.
      held: c.held ?? null,
    })),
    lastRound: last
      ? {
          n: last.n,
          status: last.status ?? null,
          taskId: last.taskId ?? null,
          promoted: last.promoted ?? null,
          attempts,
        }
      : null,
    // Who the last rounds paid: the panel can now say a round took 936 seconds
    // *and* that 160 of them were the planner, instead of only the first half.
    nodes: nodesFor(s),
    updatedAt: s.updatedAt ?? null,
    ageMs: s.updatedAt ? Math.max(0, now - Date.parse(s.updatedAt)) : null,
  }
}

export function panelState({ runtime, config } = {}) {
  const now = Date.now()
  const ids = runtime.listCampaigns()
  const rows = []
  for (const id of ids) {
    try {
      const view = typeof runtime.get === 'function' ? runtime.get(id) : runtime.open(id)
      rows.push(campaignRow(view, now, id, config))
    } catch (err) {
      rows.push({ id, error: String(err?.message ?? err) })
    }
  }
  let ownership = { owner: null, mine: true }
  try {
    ownership = runtime.ownership() ?? ownership
  } catch {
    /* ownership is advisory for the panel */
  }
  // A watchdog read is a probe, not a promise: a table the runtime can no
  // longer read must empty the live list, never take the whole panel down.
  let live = []
  try {
    const attempts = runtime.liveAttempts ? runtime.liveAttempts() : []
    if (Array.isArray(attempts)) live = attempts
  } catch {
    /* no live attempts is the safe answer */
  }
  let lean = null
  try {
    lean = runtime.leanProbe ? runtime.leanProbe() : null
  } catch {
    lean = null
  }
  // The switch is global, so it is read defensively: a panel that cannot tell
  // whether the loop is on must still render the campaigns it can see.
  let rsi = { enabled: true, at: null, by: 'config' }
  try {
    if (typeof runtime.switchState === 'function') rsi = runtime.switchState()
  } catch {
    /* keep the configured default rather than take the panel down */
  }
  return {
    campaigns: rows,
    live,
    rsi: { enabled: rsi.enabled !== false, at: rsi.at ?? null, by: rsi.by ?? 'config' },
    ownership: { owner: ownership.owner?.pid ?? null, mine: ownership.mine !== false },
    lean: lean ? { available: lean.available === true, versions: lean.versions ?? null } : null,
    now,
  }
}

async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY) throw new Error('payload too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

/** Apply one panel action through the same event appends the tools use. */
export function panelAction({ runtime, config }, body) {
  const action = String(body.action ?? '')

  // The master switch is not campaign state, so it is decided before any
  // campaign is resolved: a panel with zero campaigns must still be able to
  // turn the loop off.
  if (action === 'enable' || action === 'disable') {
    if (typeof runtime.setEnabled !== 'function') throw new Error('this runtime cannot switch the loop')
    const record = runtime.setEnabled(action === 'enable', { by: 'human:panel', reason: body.reason ?? null })
    return { ok: true, rsi: { enabled: record.enabled, at: record.at, by: record.by }, campaigns: panelState({ runtime, config }).campaigns }
  }

  const id = String(body.campaign ?? '')
  if (!id) throw new Error('campaign is required')
  const view = runtime.get(id)

  if (action === 'pause' || action === 'resume' || action === 'stop') {
    if (!runtime.ensureOwner()) throw new Error('another window is driving the loop')
    runtime.control(id, action, {}, 'human:panel')
    return { ok: true, campaigns: panelState({ runtime, config }).campaigns }
  }

  if (action === 'decide') {
    if (!runtime.ensureOwner()) throw new Error('another window is driving the loop')
    const decision = String(body.decision ?? '')
    const checkpoint = String(body.checkpoint ?? '')
    if (!['approve', 'reject', 'hold', 'stop'].includes(decision)) {
      throw new Error(`unknown decision: ${decision}`)
    }
    const open = view.state.checkpoints.filter((c) => c.status === 'open')
    const target = checkpoint ? open.find((c) => c.id === checkpoint) : open[open.length - 1]
    if (!target) throw new Error('no open checkpoint')
    if (decision === 'hold') {
      // 暂缓 postpones the question; it must not answer it. Same event as the
      // tool door, so both doors mean the same thing by the same word.
      const until = holdUntil(config)
      runtime.append(view, 'checkpoint.held', { checkpoint: target.id, until }, 'human:panel')
      return { ok: true, deferred: true, answered: target.id, until, campaigns: panelState({ runtime, config }).campaigns }
    }
    runtime.append(
      view,
      'checkpoint.answered',
      { checkpoint: target.id, answer: { decision, note: 'from panel', source: 'panel' } },
      'human:panel',
    )
    if (decision === 'stop') {
      runtime.append(view, 'campaign.status', { status: 'stopped' }, 'human:panel')
    }
    return { ok: true, campaigns: panelState({ runtime, config }).campaigns }
  }

  throw new Error(`unknown action: ${action}`)
}

export function registerPanel(ctx, deps) {
  const route = {
    name: 'dsh-loom-panel',
    kind: 'exact',
    path: '/dsh-loom/state',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET') {
          send(res, 200, panelState(deps))
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405).end()
          return
        }
        const body = await readBody(req)
        send(res, 200, panelAction(deps, body))
      } catch (err) {
        send(res, 409, { error: String(err?.message ?? err) })
      }
    },
  }
  const webServer = svc(ctx, 'webServer')
  ctx.effect(() => webServer.register(route), 'dsh-loom: panel route')
}
