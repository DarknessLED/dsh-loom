// Boot-time accounting for a campaign whose host died. Recovery is only honest if
// it repairs every claim the ledger could not prove:
//
//   1. a lease still marked `running` belongs to a host that no longer exists;
//   2. a round still marked `running` will never finish;
//   3. a landing (`autopilot.applied`) whose patch was never committed is not
//      progress — the task must be retried, not counted as solved;
//   4. the workspace may still carry a half-applied patch. That dirt is only
//      ours when (3) proves a patch was applied, so a clean-looking tree is
//      never touched and a user's own work is never discarded.
//
// Everything here is expressed as new events; history is never rewritten.
import { readFileSync, rmSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { reconcileLeases, sweepLeases } from './lease.js'
import { hasChanges, isGitRepo, restoreTrackedFiles } from '../exec/worktree.js'
import { isNoWorkClaim } from '../knowledge/impact.js'

/**
 * Paths a patch creates from scratch. These are the only untracked files recovery
 * may delete: anything else in the tree belongs to the person using it.
 */
export function patchCreatedPaths(text = '') {
  const out = []
  let pending = false
  for (const line of String(text).split('\n')) {
    if (line.startsWith('diff --git ')) pending = false
    else if (line.startsWith('new file mode')) pending = true
    else if (pending && line.startsWith('+++ b/')) {
      out.push(line.slice(6).trim())
      pending = false
    }
  }
  return out
}

/**
 * Landings the ledger claims but cannot prove: an `autopilot.applied` that is
 * neither a no-op nor backed by a commit, and that has not already been
 * withdrawn by an earlier recovery.
 */
/**
 * Lessons that only announce "nothing was done" and are still active.
 *
 * The producer refuses these now (`deriveLesson` asks `isNoWorkClaim`), but every
 * install that ran before that guard keeps carrying them, and an active lesson is
 * injected into a brief. Retiring them on boot is the repair: it is recorded as
 * an event like any other evidence, it happens once (a retired lesson is no
 * longer `active`), and it does not require the operator to edit a JSON file.
 */
export function noWorkLessons(state) {
  const lessons = Array.isArray(state?.lessons) ? state.lessons : []
  return lessons.filter((l) => l && l.status === 'active' && isNoWorkClaim(l.claim)).map((l) => l.id)
}

export function unprovenLandings(events = []) {
  const withdrawn = new Set()
  for (const ev of events) {
    if (ev?.type === 'round.unlanded') withdrawn.add(ev.data?.round)
  }
  const proven = new Set()
  const pending = new Map()
  for (const ev of events) {
    if (ev?.type !== 'autopilot.applied') continue
    const round = ev.data?.round
    if (ev.data?.noop === true) {
      proven.add(round)
      continue
    }
    const committed = ev.data?.committed === true || (typeof ev.data?.commit === 'string' && ev.data.commit.length > 0)
    if (committed) proven.add(round)
    else pending.set(round, { round, patch: ev.data?.patch ?? null, reason: 'uncommitted' })
  }
  const out = []
  for (const [round, entry] of pending) {
    if (proven.has(round) || withdrawn.has(round)) continue
    out.push(entry)
  }
  return out
}

/** The pure part of recovery: what has to be written, computed without side effects. */
export function planRecovery({ dir, events = [], state, now = Date.now() }) {
  let staleLeases = []
  try {
    staleLeases = reconcileLeases(dir, { now })
  } catch {
    staleLeases = []
  }
  return {
    staleLeases,
    runningRounds: (state?.rounds ?? []).filter((r) => r.status === 'running'),
    unproven: unprovenLandings(events),
  }
}

/**
 * Repair a workspace that an interrupted apply left dirty. The repair is derived
 * from the patches the ledger says were applied: tracked files go back to HEAD and
 * the files those patches created are removed. Nothing else is touched — a dirty
 * tree alone is not proof that the dirt is ours.
 */
export async function repairWorkspace({ workspace, patches = [], append, rounds = [], log = () => {} }) {
  try {
    if (!(await isGitRepo(workspace))) return null
    if (!(await hasChanges({ dir: workspace }))) return null
    const root = resolve(workspace)
    let removed = 0
    for (const patch of patches) {
      if (!patch) continue
      let text = ''
      try {
        text = readFileSync(patch, 'utf8')
      } catch {
        // The patch file is gone: we know a landing happened but not what it
        // created, so only tracked files may be restored.
        continue
      }
      for (const rel of patchCreatedPaths(text)) {
        const abs = resolve(root, rel)
        if (abs !== root && !abs.startsWith(root + sep)) continue
        try {
          rmSync(abs, { force: true })
          removed += 1
        } catch {
          /* best effort */
        }
      }
    }
    await restoreTrackedFiles(workspace)
    append('workspace.recovered', { action: 'restored', rounds, removedFiles: removed })
    return 'restored'
  } catch (err) {
    log(`recover: workspace repair failed: ${err?.message ?? err}`)
    return null
  }
}

/**
 * @param {object} input
 * @param {string} input.dir campaign directory (holds `leases/` and `events.jsonl`)
 * @param {object[]} [input.events] the campaign's normalised ledger
 * @param {{rounds?: object[], workspace?: string}} [input.state] state folded from those events
 * @param {string|null} [input.workspace] the repository the campaign writes to
 * @param {(type: string, data: object) => unknown} input.append ledger writer
 * @param {(msg: string, ...rest: unknown[]) => void} [input.log]
 * @param {number} [input.now]
 */
export async function recoverCampaign({
  dir,
  events = [],
  state,
  workspace = null,
  append,
  log = () => {},
  now = Date.now(),
}) {
  const report = { abandonedAttempts: [], interruptedRounds: [], unlanded: [], workspace: null }
  const plan = planRecovery({ dir, events, state, now })

  for (const lease of plan.staleLeases) {
    try {
      append('attempt.abandoned', { id: lease.attemptId, round: lease.round, reason: 'host-restart' })
      report.abandonedAttempts.push(lease.attemptId)
    } catch (err) {
      log(`recover: cannot record abandoned attempt ${lease.attemptId}: ${err?.message ?? err}`)
    }
  }

  for (const round of plan.runningRounds) {
    try {
      append('round.finished', {
        n: round.n,
        status: 'interrupted',
        score: round.score ?? null,
        reason: 'host-restart',
        promoted: false,
      })
      report.interruptedRounds.push(round.n)
    } catch (err) {
      log(`recover: cannot close round ${round.n}: ${err?.message ?? err}`)
    }
  }

  // Withdraw the claim first: if the process dies again right here, the next boot
  // sees a `round.unlanded` and the task is still retryable. The workspace repair
  // below is derived from the same evidence, so it can be repeated safely.
  for (const entry of plan.unproven) {
    try {
      append('round.unlanded', { round: entry.round, reason: entry.reason })
      report.unlanded.push(entry.round)
    } catch (err) {
      log(`recover: cannot withdraw landing for round ${entry.round}: ${err?.message ?? err}`)
    }
  }

  if (workspace && plan.unproven.length) {
    report.workspace = await repairWorkspace({
      workspace,
      patches: plan.unproven.map((u) => u.patch).filter(Boolean),
      append,
      rounds: plan.unproven.map((u) => u.round),
      log,
    })
  }

  try {
    sweepLeases(dir)
  } catch {
    /* best effort */
  }
  return report
}
