// A promotion is only evidence of work if the spec was failing before it.
//
// The loop verifies a candidate inside its worktree. If the task's own command
// already passed on the base commit, then the passing verdict says nothing about
// the candidate -- and the ledger says this is not hypothetical: of 103 landed
// rounds, 22 carried a `verifierOk: true` candidate whose diff was empty, which is
// the same fact stated the long way round: the spec was already green, the agent
// found nothing to do, and the round was filed as a win.
//
// The check is cheap because the base is where the worktree was cut from: the
// campaign workspace at HEAD *is* the base, and the loop already refuses to run
// in a dirty workspace. One verifier run answers the question, and the answer is
// stable until HEAD moves, so it is cached by (task, base, command).
//
// Rule: before promoting a candidate that carries a patch, the round asks whether
// the task's command passes on the base. If it does, the patch did not earn the
// verdict and the round does not promote. A no-op landing is the opposite case
// and is unaffected: there the empty diff *is* the finding.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { baseVerdict } from '../../src/runtime/baseline.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

function repo(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return dir
}

const cmd = (code) => `"${process.execPath}" -e "process.exit(${code})"`

// 1. A spec that is already green on the base is recorded as such, and the fact
//    is cached: asking twice must not pay for the command twice.
{
  const dir = repo('loom-base-pass-')
  const cache = mkdtempSync(join(tmpdir(), 'loom-basecache-'))
  try {
    const head = git(dir, 'rev-parse', 'HEAD')
    let runs = 0
    const run = async () => {
      runs += 1
      return { ok: true, exitCode: 0, stdout: '', stderr: '' }
    }
    const first = await baseVerdict({ dir: cache, cwd: dir, taskId: 't1', base: head, command: cmd(0), run })
    assert.equal(first.ok, true, 'the base already passes')
    assert.equal(first.cached, false, 'the first answer was measured')
    const second = await baseVerdict({ dir: cache, cwd: dir, taskId: 't1', base: head, command: cmd(0), run })
    assert.equal(second.ok, true)
    assert.equal(second.cached, true, 'the second answer came from the cache')
    assert.equal(runs, 1, 'the command ran once for the same tree')
    ok('a green base is measured once and remembered')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(cache, { recursive: true, force: true })
  }
}

// 2. A different base is a different question -- the cache must not let a verdict
//    about one tree answer for another.
{
  const dir = repo('loom-base-move-')
  const cache = mkdtempSync(join(tmpdir(), 'loom-basecache2-'))
  try {
    const head = git(dir, 'rev-parse', 'HEAD')
    let runs = 0
    const run = async () => {
      runs += 1
      return { ok: false, exitCode: 1, stdout: '', stderr: 'nope' }
    }
    await baseVerdict({ dir: cache, cwd: dir, taskId: 't1', base: head, command: cmd(1), run })
    writeFileSync(join(dir, 'moved.txt'), 'x\n')
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'move')
    const moved = git(dir, 'rev-parse', 'HEAD')
    const res = await baseVerdict({ dir: cache, cwd: dir, taskId: 't1', base: moved, command: cmd(1), run })
    assert.equal(res.cached, false, 'a new head is a new measurement')
    assert.equal(runs, 2, 'the command ran again')
    assert.equal(res.ok, false)
    ok('a verdict is tied to the tree it was measured on')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(cache, { recursive: true, force: true })
  }
}

// 3. A broken cache is not evidence. If the cache file is unreadable, the answer
//    must be re-measured rather than guessed.
{
  const dir = repo('loom-base-bad-')
  const cache = mkdtempSync(join(tmpdir(), 'loom-basecache3-'))
  try {
    const head = git(dir, 'rev-parse', 'HEAD')
    writeFileSync(join(cache, 'baseline-cache.json'), '{not json')
    let runs = 0
    const res = await baseVerdict({
      dir: cache,
      cwd: dir,
      taskId: 't1',
      base: head,
      command: cmd(1),
      run: async () => {
        runs += 1
        return { ok: false, exitCode: 1 }
      },
    })
    assert.equal(runs, 1, 'an unreadable cache costs a run, never a fake answer')
    assert.equal(res.ok, false)
    ok('a corrupt cache is re-measured, never trusted')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(cache, { recursive: true, force: true })
  }
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
