// A promotion that cannot be committed is not a promotion — and the three
// fin-strategy campaigns lost exactly that way, silently.
//
// `Fin_strategy_camp1/2/3` are plain repositories with no `user.name`/`user.email`
// configured. Every round therefore recorded:
//
//   gate.evaluated  checks.verifierOk=true hasPatch=true testsClean=true
//   artifact.promoted  attemptId=r1a2
//   autopilot.applied  { commit: null, committed: false }
//   round.finished     { status: 'promoted', promoted: true }
//
// …and on the next boot recovery did the only honest thing it could: it withdrew
// the landing (`round.unlanded { reason: 'uncommitted' }`), so the task looked
// unsolved again and the campaign could not build on its own work. Nobody was
// told. The campaign was billed $0.224888 / $0.172415 / $0.158059 for rounds whose
// result was thrown away by `git commit` failing on a missing identity.
//
// Two things follow, both mechanical:
//   1. A commit the loop makes on its own account must not depend on the host
//      repository having been configured with a person's identity. loom states
//      its own authorship for its own commit, and it does so per invocation
//      (`git -c`) so it never rewrites the repository's config.
//   2. When a commit fails anyway, the failure has to be visible in the record.
//      `committed:false` plus a withdrawn landing is unreadable; the reason must
//      reach the ledger so the next reader knows the promotion was not lost to
//      a bad patch but to the environment.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { commitWorkspace } from '../../src/exec/worktree.js'
import { doctor } from '../../src/runtime/doctor.js'
import { unprovenLandings } from '../../src/runtime/recovery.js'
import { runRound } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true }).trim()

// A repository that refuses to auto-detect an identity, which is what a fresh
// `git init` on this machine behaves like once `user.useConfigOnly` is on — the
// strictest honest stand-in for "no identity configured".
function anonymousRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-ident-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.useConfigOnly', 'true')
  writeFileSync(join(dir, 'a.txt'), 'base\n')
  git(dir, 'add', '-A')
  return dir
}

let passed = 0
let failed = 0
function ok(name, cond, detail) {
  try {
    assert.ok(cond, detail)
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name} :: ${err?.message ?? err}`)
  }
}

// 1. A promotion commit lands even though the host repo has no identity, and the
//    commit says who made it.
{
  const dir = anonymousRepo()
  const committed = await commitWorkspace(dir, 'loom c1 round 1: promote r1a1', { paths: ['a.txt'] })
  ok('a promotion lands in a repository with no configured identity', committed.committed === true, JSON.stringify(committed))
  ok('and it carries a sha', typeof committed.sha === 'string' && committed.sha.length >= 7, String(committed.sha))
  if (committed.committed) {
    const author = git(dir, 'log', '-1', '--pretty=%an <%ae>')
    ok('the commit is attributed to loom, not to a person', /loom/i.test(author), author)
  }
  ok('the workspace is clean after the commit', git(dir, 'status', '--porcelain') === '', git(dir, 'status', '--porcelain'))
}

// 2. The loop does not rewrite the repository's own configuration to do it: a
//    repo that deliberately sets `user.useConfigOnly` keeps that setting.
{
  const dir = anonymousRepo()
  await commitWorkspace(dir, 'loom c1 round 1: promote r1a1', { paths: ['a.txt'] })
  const localName = (() => {
    try {
      return git(dir, 'config', '--local', 'user.name')
    } catch {
      return ''
    }
  })()
  ok('loom does not write its identity into the repository config', localName === '', localName)
}

// 3. `doctor` names the missing identity instead of letting a campaign discover it
//    one paid round at a time.
{
  const ws = anonymousRepo()
  git(ws, 'config', 'user.email', '')
  const home = mkdtempSync(join(tmpdir(), 'loom-ident-home-'))
  const report = doctor({
    workspace: ws,
    home,
    runtime: { ownership: () => ({ mine: true, owner: 'self', at: Date.now() }) },
    config: {},
    now: Date.now(),
  })
  const identity = (report.checks ?? []).find((c) => /identit|author|commit/i.test(`${c.id ?? ''} ${c.name ?? ''}`))
  ok('doctor has a check that mentions the commit identity', identity != null, JSON.stringify((report.checks ?? []).map((c) => c.id ?? c.name)))
  // The pair of cases that matter: a repo with no identity is healthy now that
  // loom signs its own commits, and a repo where even that fails is not.
  ok('a repository with no configured identity passes the check', identity?.ok === true, JSON.stringify(identity))
}

// 4. A commit that fails for a reason the override cannot fix still reports
//    `ok:false` with the reason, and leaves the change in the tree — recovery
//    needs the tree to repair, and the reader needs the sentence.
{
  const dir = anonymousRepo()
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'user.email', 'loom@local')
  mkdirSync(join(dir, 'hooks'), { recursive: true })
  writeFileSync(join(dir, 'hooks', 'pre-commit'), '#!/bin/sh\necho "REJECTED: identity policy" >&2\nexit 1\n')
  git(dir, 'config', 'core.hooksPath', 'hooks')
  const failedCommit = await commitWorkspace(dir, 'loom c1 round 1: promote r1a1', { paths: ['a.txt'] })
  ok('a rejected commit is a failure, not a silent no-op', failedCommit.ok === false, JSON.stringify(failedCommit))
  ok('and it carries the reason', /REJECTED/.test(String(failedCommit.detail ?? '')), String(failedCommit.detail))
  ok('the change stays in the tree for recovery to repair', git(dir, 'status', '--porcelain') !== '', 'clean')
}

// 5. The reason reaches the ledger: the round that failed to commit records it on
//    `autopilot.applied`, so nobody has to guess from `{commit:null}` again.
{
  const root = mkdtempSync(join(tmpdir(), 'loom-ident-round-'))
  const dir = join(root, 'repo')
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'core.autocrlf', 'false')
  mkdirSync(join(dir, 'hooks'), { recursive: true })
  writeFileSync(join(dir, 'hooks', 'pre-commit'), '#!/bin/sh\necho "REJECTED: commit refused" >&2\nexit 1\n')
  git(dir, 'config', 'core.hooksPath', 'hooks')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '--no-verify', '-qm', 'base')

  const events = []
  const runtime = {
    home: join(root, 'home'),
    append(_view, type, data) {
      events.push({ type, data })
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
  }
  const view = {
    dir: join(root, 'campaign'),
    state: {
      id: 'ident',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: true, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: {
        tasks: [{ id: 't1', family: 'f', prompt: 'write it', verify: { cmd: `"${process.execPath}" -e "process.exit(require('fs').existsSync('out.txt') ? 0 : 1)"` } }],
        holdout: [],
      },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'c', version: 1, params: { candidates: 1 }, nodes: [{ id: 'w', type: 'map', role: 'worker', prompt: 'do it' }] } }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: { halving: false },
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  const dispatcher = {
    run: async (_brief, { cwd } = {}) => {
      writeFileSync(join(cwd, 'out.txt'), 'produced\n')
      return {
        sessionId: 's1',
        text: '{"changed":["out.txt"],"why":"wrote it","evidence":["x"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
        stopReason: 'completed',
      }
    },
  }
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  const applied = events.filter((e) => e.type === 'autopilot.applied').map((e) => e.data)
  ok('the promotion was applied and the commit refused', applied.length === 1 && applied[0].committed === false, JSON.stringify(applied))
  ok('the ledger carries the commit failure text', /REJECTED/.test(String(applied[0]?.detail ?? '')), JSON.stringify(applied[0]))
}

// 6. The withdrawal carries the reason forward. A ledger that only says
//    "uncommitted" forces the next reader to re-derive the cause from an empty
//    repository; the commit's own sentence is what makes it actionable.
{
  const events = [
    { seq: 1, type: 'autopilot.applied', data: { round: 1, patch: 'p.patch', commit: null, committed: false, detail: 'REJECTED: commit refused' } },
  ]
  const unproven = unprovenLandings(events)
  ok('an uncommitted landing stays unproven', unproven.length === 1, JSON.stringify(unproven))
  ok('and the withdrawal carries the commit failure text', /REJECTED/.test(String(unproven[0]?.detail ?? '')), JSON.stringify(unproven[0]))

  const withCommit = unprovenLandings([{ seq: 1, type: 'autopilot.applied', data: { round: 1, commit: 'abc1234', committed: true } }])
  ok('a committed landing is not withdrawn', withCommit.length === 0, JSON.stringify(withCommit))
}

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
