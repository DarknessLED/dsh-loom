import { svc } from '../core/services.js'
import { toMs } from '../core/clock.js'
import { campaignQuality } from '../runtime/quality.js'
import { campaignTriangle } from '../runtime/triangle.js'
import { reviewQueue } from '../runtime/review.js'
import { holdUntil } from '../runtime/hold.js'
import { activeChain, policyFor } from '../runtime/round.js'
import { applyApprovalEffects, applyRejectionEffects } from '../runtime/decision-effects.js'
import { claimHeadline, filesInClaim } from '../knowledge/impact.js'
import { describeEnd } from '../report/end.js'
import { compareResearchArms, compareResearchFleet } from '../loop/research-trial.js'
import { panelRoute } from './route.js'

/**
 * The browser half's only data source: one JSON route.
 *
 * The panel never touches campaign files and never dispatches rounds itself —
 * it reads the same materialized state the tools read, and every mutating
 * button goes through the same event appends the tools use.
 */

const MAX_BODY = 64 * 1024

// The corpus the panel groups by file. A campaign rarely earns more than a few
// dozen claims, but the panel is one payload for every campaign, so the total
// is bounded rather than unbounded. The bound is set above the corpus a
// campaign actually accumulates: a cap below it does not shorten the payload,
// it hides rows from the only view that can group them.
const MAX_LESSON_ROWS = 200

/**
 * The files each attempt actually changed, keyed by attempt id.
 *
 * A lesson records where it came from (`evidence: 'round 4 attempt r4a1
 * verified'`) but the ninety-nine written before lessons carried `files` say
 * nothing about *what* they are about. The attempt they name does: its report
 * lists the files it touched. Joining on that id puts eighty-two of those
 * ninety-nine under a real file instead of one bucket holding most of the
 * corpus, and it reads the ledger the panel already ships rather than
 * guessing from sentence fragments.
 */
function attemptFileIndex(state) {
  const index = new Map()
  const rounds = Array.isArray(state?.rounds) ? state.rounds : []
  for (const round of rounds) {
    const attempts = Array.isArray(round?.attempts) ? round.attempts : []
    for (const attempt of attempts) {
      const changed = Array.isArray(attempt?.report?.changed)
        ? attempt.report.changed.filter((f) => typeof f === 'string' && f)
        : []
      if (attempt?.id && changed.length) index.set(String(attempt.id), changed.slice(0, 6))
    }
  }
  return index
}

function tidyPath(file) {
  return String(file).replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * Where a lesson applies. New lessons carry `files`; older ones name an
 * attempt, and that attempt's report says which files it changed; a claim that
 * mentions a path directly is the last resort. Only a claim that names nothing
 * at all falls into the residual bucket.
 */
function lessonWhere(lesson, index) {
  const listed = Array.isArray(lesson?.files) ? lesson.files.filter((f) => typeof f === 'string' && f) : []
  if (listed.length) return listed.map(tidyPath)
  const named = String(lesson?.evidence ?? '').match(/attempt\s+(\S+)/)
  const fromAttempt = named && index ? index.get(named[1]) : null
  if (fromAttempt && fromAttempt.length) return fromAttempt.map(tidyPath)
  const claim = typeof lesson?.claim === 'string' ? lesson.claim : ''
  return filesInClaim(claim).map(tidyPath)
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
      model: n.model ?? null,
    }))
    .sort((a, b) => (b.round ?? -Infinity) - (a.round ?? -Infinity))
    .slice(0, limit)
}

/**
 * What the research legs bought, across a campaign's rounds.
 *
 * The leg records three numbers per round and nothing displayed any of them, so
 * a reader could see a campaign pay for reading without seeing whether it read,
 * how much came back, or whether the worker ever used it. `read` counts the
 * rounds that were *allowed* to read (`mode !== 'off'`); a round with no
 * `research` field at all is not a reading round and contributes to none of
 * `read`/`pages`/`used`/`unused` (it still counts toward `rounds`).
 *
 * `used` is three-valued on purpose -- `null` means "not measured" -- so only
 * an explicit `true`/`false` is counted; treating null as either would turn a
 * missing measurement into a verdict.
 */
export function readSummary(rounds) {
  const list = Array.isArray(rounds) ? rounds : []
  const summary = { rounds: list.length, read: 0, pages: 0, used: 0, unused: 0 }
  for (const round of list) {
    const research = round && typeof round === 'object' ? round.research : null
    if (!research || typeof research !== 'object') continue
    if (research.mode !== 'off') summary.read += 1
    const pages = Number(research.read)
    if (Number.isFinite(pages) && pages > 0) summary.pages += pages
    if (research.used === true) summary.used += 1
    if (research.used === false) summary.unused += 1
  }
  return summary
}

/**
 * One line for the read/do trial, in the panel's own voice.
 *
 * `researchTrial` has been shipped by `panelState` since `b6258b9` and drawn by
 * nothing: the numbers reached the JSON and stopped. A comparison nobody sees is
 * the same failure as a read nobody records, one level up.
 *
 * The wording follows the trial's own discipline. Overlap is not equality, so an
 * undecided trial says "不能区分" and never "没有差别"; a missing cost is left out
 * rather than printed as zero, because the leg's own spend is not in the pricing
 * table and a zero there would read as "reading is free".
 *
 * @returns {{line: string, verdict: string, n: number}|null}
 */
export function trialSummary(trial) {
  if (!trial || typeof trial !== 'object') return null
  const n = Number(trial.n)
  if (!Number.isFinite(n) || n <= 0) return null
  const arms = trial.arms ?? {}
  const full = arms.full ?? {}
  const off = arms.off ?? {}
  const pct = (v) => `${(Number(v) * 100).toFixed(1)}%`
  const bits = [`读 ${Number(full.n) || 0} 轮 (${pct(full.rate)})`, `不读 ${Number(off.n) || 0} 轮 (${pct(off.rate)})`]
  const verdict = typeof trial.verdict === 'string' ? trial.verdict : 'cannot-distinguish'
  const word = verdict === 'full-better' ? '读更强' : verdict === 'off-better' ? '不读更强' : '不能区分'
  bits.push(word)
  const costFull = Number(trial.cost?.arms?.full?.mean)
  const costOff = Number(trial.cost?.arms?.off?.mean)
  if (Number.isFinite(costFull) && Number.isFinite(costOff)) {
    bits.push(`钱 ${(costFull * 100).toFixed(2)}c / ${(costOff * 100).toFixed(2)}c`)
  }
  const msFull = Number(trial.time?.arms?.full?.mean)
  if (Number.isFinite(msFull) && msFull > 0) bits.push(`读耗时 ${(msFull / 1000).toFixed(1)}s`)
  return { line: bits.join(' · '), verdict, n }
}

/**
 * How long ago a moment was, in milliseconds, or `null`.
 *
 * `updatedAt` is `ev.t`: a number. `Date.parse` of a number is NaN, and a NaN
 * age renders as a nonsense string in the panel instead of an age -- the same
 * family of bug as the round's budget clock.
 */
function ageOf(moment, now) {
  const then = toMs(moment)
  if (then === null) return null
  return Math.max(0, now - then)
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
  // A claim travels as its headline, not as the 240-character narration the
  // ledger holds. Older lessons were stored clipped mid-sentence; normalising
  // here means the tree reads as statements without rewriting history.
  const lessonsActive = lessons.filter((l) => l.status === 'active')
  const fileIndex = attemptFileIndex(s)
  const lessonsTop = lessonsActive
    .map((l) => ({
      id: l.id,
      claim: claimHeadline(l.claim ?? ''),
      kind: l.kind ?? 'fact',
      score: Number(l.gainSum) || 0,
      confidence: Number.isFinite(Number(l.confidence)) ? Number(l.confidence) : 0.5,
      // A claim nobody has reused yet is not worthless, but the score column
      // printing `0` for eighty-six rows in a row reads as broken. What the
      // reader needs is how often the loop actually leaned on it.
      uses: Number(l.useCount) || 0,
      harm: Number(l.harmCount) || 0,
      files: lessonWhere(l, fileIndex),
      campaign: campaignId ?? s.id,
      createdRound: Number(l.createdRound) || null,
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, 3)
  // The whole corpus, not just the top three: a tree needs every leaf to be
  // able to say which file it is about, and capping at three per campaign hid
  // most of the corpus from the only view that can group it.
  const lessonsAll = lessonsActive
    .map((l) => ({
      id: l.id,
      claim: claimHeadline(l.claim ?? ''),
      kind: l.kind ?? 'fact',
      score: Number(l.gainSum) || 0,
      confidence: Number.isFinite(Number(l.confidence)) ? Number(l.confidence) : 0.5,
      uses: Number(l.useCount) || 0,
      harm: Number(l.harmCount) || 0,
      files: lessonWhere(l, fileIndex),
      createdRound: Number(l.createdRound) || null,
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAX_LESSON_ROWS)
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
    // The verdict a stopped campaign owes: why it ended, what it reached and
    // what a resume should do next. The client renders it instead of inferring
    // a story from `status` plus a round count.
    end: describeEnd(s),
    policy: s.policy?.status ? { status: s.policy.status, version: s.policy.version } : null,
    // What runs, not just what was written down: `policy` above is the record,
    // `loop` is the merged knobs with the source of each value.
    loop,
    tasks: Array.isArray(s.evalset?.tasks) ? s.evalset.tasks.length : 0,
    holdout: Array.isArray(s.evalset?.holdout) ? s.evalset.holdout.length : 0,
    // `lessons` is the whole corpus; the sidebar's "active" figure is the rest of
    // it. Sending only the total made the label lie by the quarantined count.
    lessons: lessons.length,
    lessonsActive: lessons.filter((l) => l.status !== 'quarantined').length,
    quarantined: lessons.filter((l) => l.status === 'quarantined').length,
    lessonsTop,
    lessonsAll,
    // The report prints the same reading; computing it here (rather than in the
    // browser) keeps the sidebar and the report on one definition of health.
    quality: campaignQuality(s),
    // Efficiency / quality / cost, computed on the host so the sidebar, the
    // report and scripts/loom-metrics.mjs cannot disagree about the numbers.
    triangle: campaignTriangle(rounds),
    // What the reads cost and returned: the leg records these three numbers per
    // round and this is the one place the panel can show them without the
    // browser having to know the leg's field names.
    reads: readSummary(rounds),
    // The read/do trial, when one is running: the same comparison `rsi_status`
    // reports, because a person and the loop should not be reading different numbers.
    researchTrial: compareResearchArms({ rounds }),
    // And the line the panel actually draws: the comparison above was shipped to
    // the JSON on `b6258b9` and rendered by nothing until now.
    trial: trialSummary(compareResearchArms({ rounds })),
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
    // Same trap as the round's budget clock: `updatedAt` is a number, so
    // `Date.parse` gave NaN and the panel could not say how long a campaign had
    // been idle.
    ageMs: ageOf(s.updatedAt, now),
  }
}

export function panelState({ runtime, config } = {}) {
  const now = Date.now()
  const ids = runtime.listCampaigns()
  const rows = []
  // The trial is assigned per campaign, so no single campaign can answer it:
  // six correct "cannot distinguish" verdicts add up to 52 assigned rounds and
  // no reading. Keep the rounds aside so the fleet comparison can add them.
  const fleetRounds = []
  for (const id of ids) {
    try {
      const view = typeof runtime.get === 'function' ? runtime.get(id) : runtime.open(id)
      rows.push(campaignRow(view, now, id, config))
      fleetRounds.push({ id, rounds: view?.state?.rounds ?? [] })
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
  // Planning is an install-level default with a workbench toggle, so the panel
  // reports the value in force and where it came from: `settings` when the
  // operator flipped it, `config` when the file has never been written.
  let settings = { plan: null, at: null, by: 'config', reason: 'default' }
  try {
    if (typeof runtime.settingsState === 'function') settings = runtime.settingsState()
  } catch {
    /* an unreadable file keeps the configured default rather than taking the panel down */
  }
  const planOn = settings.plan === null ? config?.loopPolicy?.planMode === 'full' : settings.plan === true
  return {
    campaigns: rows,
    // The read/do trial across campaigns. Its `caveat` travels with the number:
    // pooling buys sample size and not one experiment.
    fleet: compareResearchFleet(fleetRounds),
    live,
    planning: { on: planOn, at: settings.at ?? null, by: settings.plan === null ? 'config' : settings.by ?? 'human', reason: settings.reason ?? null },
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
  // Planning is the one default the workbench owns. It is install-level, so it is
  // decided before a campaign is resolved: a panel with zero campaigns must still
  // be able to say whether the next campaign plans.
  if (action === 'plan') {
    const on = body.enabled === true || body.on === true
    runtime.setSettings({ plan: on }, { by: 'human:panel', reason: body.reason ?? null })
    return { ok: true, planning: panelState({ runtime, config }).planning }
  }
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
    // The button and the tool share one effect table, so approving a chain card
    // adopts it and approving a policy card promotes it here too.
    if (decision === 'approve') {
      applyApprovalEffects({ runtime, view, target, config, actor: 'human:panel' })
    }
    // A reject from the panel means the same thing it means from the tool: the
    // forecast is refused, and the next round grades what refusing it cost.
    if (decision === 'reject') {
      applyRejectionEffects({ runtime, view, target, actor: 'human:panel' })
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
  // The handler itself lives in `./route.js`, which is the module the panel
  // route spec exercises; registering the same object keeps the spec and the
  // host from drifting into two different implementations of one contract.
  const webServer = svc(ctx, 'webServer')
  const route = panelRoute(panelSource(deps), { write: actionHandler(deps) })
  ctx.effect(() => webServer.register(route), 'dsh-loom: panel route')
}

/**
 * The read half of the route as the state route expects it: one `panelState()`
 * call, with the runtime and config already bound. The real `Runtime` has no
 * method of that name, so the net is converted here rather than duplicated in
 * every caller.
 */
export function panelSource(deps) {
  return { panelState: () => panelState(deps) }
}

/**
 * The write half: one POST body through `panelAction`, answered as a decision
 * the route can write. A bad body is a 409 with the reason (the shape the
 * panel's existing contract documents), not a 500 and never a throw out of the
 * handler.
 */
export function actionHandler(deps) {
  const headers = { 'content-type': 'application/json; charset=utf-8' }
  return async (req) => {
    try {
      const body = await readBody(req)
      return { status: 200, headers, body: JSON.stringify(panelAction(deps, body)) }
    } catch (err) {
      return { status: 409, headers, body: JSON.stringify({ error: String(err?.message ?? err) }) }
    }
  }
}
