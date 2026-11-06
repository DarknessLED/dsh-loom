// Commit policy for the night shift.
//
// The night committer is blind: every twenty seconds it sees "dirty and green"
// and commits. A round whose patch is waiting for a person is also "dirty and
// green" from where the committer stands — the workspace is untouched, the
// suite passes, and the only trace is a checkpoint asking for a human review.
// Committing then would land exactly the change a person was asked to approve.
//
// Keep the decision in one pure function so it can be tested without spawning
// git, and make the committer ask this module before every commit.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

// A checkpoint with one of these kinds is holding a promotion back until a
// human answers: a `gate` is an explicit review, a `holdout` is a regression
// report the round refused to promote. Either one means "do not commit".
const REVIEW_GATE_KINDS = new Set(['gate', 'holdout'])

/**
 * The single commit decision.
 *
 * @param {{ dirty?: boolean, openGates?: number, suiteGreen?: boolean }} input
 * @returns {boolean} true only when there is something to commit, the
 *   regression suite passes, and no checkpoint is waiting on a human.
 */
export function shouldCommit({ dirty, openGates, suiteGreen } = {}) {
  const gates = Number(openGates) || 0
  return dirty === true && suiteGreen === true && gates === 0
}

/**
 * Count the open checkpoints that withhold a promotion for the workspace.
 * The campaign view is the committed snapshot; fall back to the append-only
 * ledger when a view has not been materialized yet (a crash mid-round must not
 * make an open gate invisible to the committer).
 */
export function countOpenGates({ home = join(homedir(), '.dsh', 'loom'), workspace } = {}) {
  const campaigns = join(home, 'campaigns')
  if (!existsSync(campaigns)) return 0
  let gates = 0
  for (const name of readdirSync(campaigns)) {
    const state = readState(join(campaigns, name))
    if (!state) continue
    if (workspace && !samePath(state.workspace, workspace)) continue
    for (const cp of Array.isArray(state.checkpoints) ? state.checkpoints : []) {
      if (cp?.status === 'open' && REVIEW_GATE_KINDS.has(cp.kind)) gates += 1
    }
  }
  return gates
}

function readState(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'views', 'state.json'), 'utf8'))
  } catch {
    // fall through to the ledger
  }
  return foldLedger(join(dir, 'events.jsonl'))
}

function foldLedger(file) {
  if (!existsSync(file)) return null
  try {
    const checkpoints = []
    let workspace = null
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue
      let ev
      try {
        ev = JSON.parse(line)
      } catch {
        continue
      }
      if (ev.type === 'campaign.created') workspace = ev.data?.workspace ?? workspace
      if (ev.type === 'checkpoint.raised') checkpoints.push({ id: ev.data?.id, kind: ev.data?.kind, status: 'open' })
      if (ev.type === 'checkpoint.answered') {
        const cp = checkpoints.find((c) => c.id === (ev.data?.id ?? ev.data?.checkpoint))
        if (cp) cp.status = 'answered'
      }
    }
    return { workspace, checkpoints }
  } catch {
    return null
  }
}

function samePath(a, b) {
  if (!a || !b) return false
  try {
    const x = resolve(String(a))
    const y = resolve(String(b))
    return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
  } catch {
    return false
  }
}
