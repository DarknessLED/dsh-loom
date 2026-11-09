/**
 * Spec: approving a promotion must actually land it.
 *
 * `rsi_decide{decision:'approve'}` used to apply the patch and stop there — no
 * guard, no commit, and no `autopilot.applied`. Two things follow from that, both
 * observed in the wild:
 *
 *   1. the round is never marked `landed`, so the selector keeps offering a task
 *      the campaign already solved (loom-triangle round 3 re-ran `verifier-reuse`
 *      after round 1 had been approved and applied);
 *   2. the workspace keeps uncommitted changes, so the next round's patch is
 *      taken against a base commit the tree no longer matches ("patch does not
 *      apply" anomalies).
 *
 * Required: apply → run the configured guard → roll back if it fails → commit →
 * append `autopilot.applied` with `by:'human'`, so the ledger says the round
 * landed and where.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { registerTools } from '../src/tools/index.js'
import { reduce } from '../src/core/reduce.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function layout(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix))
  const dir = join(root, 'repo')
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return { root, dir }
}

// Produce a patch that adds one file, then leave the tree clean again so the
// approval has something to apply.
function makePatch(root, dir) {
  writeFileSync(join(dir, 'out.txt'), 'produced\n')
  git(dir, 'add', '-A', '-N')
  const patch = git(dir, 'diff', '--binary', 'HEAD')
  const patchFile = join(root, 'r1a1.patch')
  writeFileSync(patchFile, patch)
  git(dir, 'reset', '-q')
  git(dir, 'checkout', '--', '.')
  rmSync(join(dir, 'out.txt'), { force: true })
  return patchFile
}

function setup({ guard = null } = {}) {
  const { root, dir } = layout('loom-approve-')
  const patch = makePatch(root, dir)
  const events = []
  const state = {
    id: 'c1',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: true, guard },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` } }], holdout: [] },
    chain: { activeVersion: 1, versions: [] },
    checkpoints: [{ id: 'cp-1', kind: 'gate', status: 'open', at: 1, payload: { patch, attempt: 'r1a1', score: 1 } }],
  }
  const view = { state, dir: join(root, 'campaign') }
  mkdirSync(view.dir, { recursive: true })
  const runtime = {
    get: () => view,
    listCampaigns: () => ['c1'],
    ensureOwner: () => true,
    append: (v, type, data) => {
      events.push({ type, data })
      if (type === 'checkpoint.answered') {
        const cp = v.state.checkpoints.find((c) => c.id === data.id)
        if (cp) cp.status = 'answered'
      }
      return v.state
    },
  }
  const tools = new Map()
  const ctx = {
    effect(fn) {
      fn()
      return () => {}
    },
    tools: {
      register(def) {
        tools.set(def.name, def)
        return () => {}
      },
    },
    get: () => undefined,
  }
  registerTools(ctx, { runtime, config: { verify: { timeoutMs: 30_000 } } })
  return { root, dir, patch, events, tools, runtime, view }
}

// Case 1: no guard configured.
{
  const s = setup()
  const res = await s.tools.get('rsi_decide').execute({ id: 'c1', checkpoint: 'cp-1', decision: 'approve' })

  assert.equal(res.applied, true, 'the patch was applied')
  assert.equal(res.landed?.committed, true, 'the applied patch was committed')
  assert.ok(existsSync(join(s.dir, 'out.txt')), 'the change is in the workspace')
  assert.equal(git(s.dir, 'status', '--porcelain').trim(), '', 'the workspace is clean afterwards')
  assert.ok(readFileSync(join(s.dir, 'out.txt'), 'utf8').includes('produced'), 'the change survived the commit')

  const applied = s.events.filter((e) => e.type === 'autopilot.applied').map((e) => e.data)
  assert.equal(applied.length, 1, 'the ledger records that the promotion landed')
  assert.equal(applied[0].by, 'human', 'and that a human is the one who landed it')
  assert.equal(applied[0].committed, true, 'with the commit flag set')
  assert.equal(applied[0].round, 1, 'attributed to the round the attempt came from')
  assert.ok(applied[0].commit, 'and carrying the new commit id')

  ok('approving applies, guards, commits, and says so in the ledger')

  rmSync(s.root, { recursive: true, force: true })
}

// Case 2: a guard that fails must undo the apply and say so.
{
  const s = setup({ guard: `"${process.execPath}" -e "process.exit(1)"` })
  let threw = null
  try {
    await s.tools.get('rsi_decide').execute({ id: 'c1', checkpoint: 'cp-1', decision: 'approve' })
  } catch (err) {
    threw = err
  }
  assert.ok(threw, 'the approval fails loudly when the guard fails')
  assert.match(String(threw.message), /guard failed/i)
  assert.equal(existsSync(join(s.dir, 'out.txt')), false, 'the rejected change was rolled back')
  assert.equal(git(s.dir, 'status', '--porcelain').trim(), '', 'and the workspace is clean')
  assert.equal(s.events.filter((e) => e.type === 'autopilot.applied').length, 0, 'nothing landed')

  ok('a failing guard reverts the apply instead of leaving it half-landed')

  rmSync(s.root, { recursive: true, force: true })
}

// Case 3: the folded view must agree, or the selector still re-runs the task.
{
  const state = reduce(
    [
      { seq: 1, type: 'round.started', data: { n: 1, taskId: 't1', chainVersion: 1 }, at: 1 },
      { seq: 2, type: 'gate.evaluated', data: { round: 1, candidateId: 'r1a1', promoted: true, score: 1 }, at: 2 },
      { seq: 3, type: 'round.finished', data: { n: 1, status: 'promoted', score: 1, promoted: true }, at: 3 },
      { seq: 4, type: 'autopilot.applied', data: { round: 1, attemptId: 'r1a1', committed: true, commit: 'abc123', by: 'human' }, at: 4 },
    ],
    'c1',
  )
  assert.equal(state.rounds[0].landed, true, 'a human-landed round folds to landed')
  assert.equal(state.rounds[0].promotedAttemptId, 'r1a1', 'and remembers which attempt landed')

  ok('a human-landed round is landed in the folded view')

}

console.log(`\n${pass}/${pass} passed`)
