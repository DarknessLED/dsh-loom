// The most expensive failures tonight were not wrong code — they were wrong ideas
// about the environment: a plugin silently dropped for an engines range, a loop
// that looked idle because the running instance was still the old module, a
// campaign that could not apply its own promotion because the worktree was dirty.
// None of that is visible from the panel, and every one of them cost 10+ minutes.
//
// `doctor({workspace, home, runtime, config})` answers the plain question a person
// asking "is this thing set up?" has: it checks the few preconditions the loop
// actually depends on, says which one is broken, and what to do about it. It never
// throws — a check that itself blows up is reported as a failed check with the
// error text, because the point is to be readable when things are broken.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { doctor } from '../../src/runtime/doctor.js'

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

function scratch(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  execFileSync('git', ['init', '-q', dir])
  execFileSync('git', ['-C', dir, 'config', 'user.email', 'loom@local'])
  execFileSync('git', ['-C', dir, 'config', 'user.name', 'loom'])
  execFileSync('git', ['-C', dir, 'config', 'core.autocrlf', 'false'])
  return dir
}

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + pass + ' - ' + name)
}

// 1. A clean repo, a clean tree, a loop that owns this window: nothing to report.
{
  const ws = scratch('loom-doctor-')
  git(ws, 'commit', '-q', '--allow-empty', '-m', 'base')
  const home = scratch('loom-doctor-home-')
  const report = doctor({
    workspace: ws,
    home,
    runtime: { ownership: () => ({ mine: true, owner: 'self', at: Date.now() }) },
    config: {},
    now: Date.now(),
  })

  assert.equal(report.ok, true, 'a healthy setup reports ok')
  assert.ok(Array.isArray(report.checks) && report.checks.length >= 4, 'and lists what it looked at')
  for (const check of report.checks) {
    assert.ok(check.id, 'every check has an id')
    assert.notEqual(check.ok, false, 'nothing failed: ' + check.id + ' ' + check.detail)
  }
  ok('a healthy workspace reports ok with the checks it made')
}

// 2. Not a git repo: the loop cannot patch or roll back, and says so plainly.
{
  const notRepo = mkdtempSync(join(tmpdir(), 'loom-doctor-plain-'))
  const home = scratch('loom-doctor-home-')
  const report = doctor({ workspace: notRepo, home, runtime: { ownership: () => ({ mine: true }) }, config: {} })

  assert.equal(report.ok, false, 'a non-repo workspace is not ready')
  const check = report.checks.find((c) => c.id === 'git-repo')
  assert.ok(check, 'the failure is named')
  assert.equal(check.ok, false)
  assert.match(String(check.fix), /git init/, 'and the fix is the command that fixes it')
  ok('a workspace that is not a git repo says so, with the command that fixes it')
}

// 3. A dirty tree blocks promotion — the failure that cost the most rounds tonight.
{
  const ws = scratch('loom-doctor-dirty-')
  git(ws, 'commit', '-q', '--allow-empty', '-m', 'base')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(ws, 'half.txt'), 'uncommitted work\n')
  const home = scratch('loom-doctor-home-')
  const report = doctor({ workspace: ws, home, runtime: { ownership: () => ({ mine: true }) }, config: {} })

  assert.equal(report.ok, false, 'uncommitted work means a promotion cannot be applied')
  const check = report.checks.find((c) => c.id === 'workspace-clean')
  assert.equal(check.ok, false, 'and that is the check that fails')
  assert.match(String(check.fix), /commit|stash/, 'the fix is to commit or stash')
  assert.ok(report.checks.some((c) => c.id === 'git-repo' && c.ok !== false), 'the other checks still ran')
  ok('a dirty worktree is reported as the reason promotions will not land')
}

// 4. A check that throws is reported, not propagated: the doctor must work when
//    things are broken, which is exactly when it is needed.
{
  const home = scratch('loom-doctor-home-')
  const report = doctor({
    workspace: 'C:/definitely/not/here',
    home,
    runtime: {
      ownership() {
        throw new Error('ownership unavailable')
      },
    },
    config: {},
  })
  assert.equal(report.ok, false)
  const owner = report.checks.find((c) => c.id === 'loop-owner')
  assert.equal(owner.ok, false, 'the throwing check is a failed check')
  assert.match(String(owner.detail), /ownership unavailable/, 'with the error text as the detail')
  ok('a check that throws is reported with its error, not thrown at the caller')
}

console.log(pass + '/' + pass + ' passed')
