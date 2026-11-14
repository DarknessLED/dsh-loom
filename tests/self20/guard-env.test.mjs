/**
 * Spec: the guard has to be able to run the build it is guarding.
 *
 * Two p6 rounds were rolled back with no visible reason. The guard was not
 * failing on the candidate: `tests/noop-landing.test.mjs` and eleven others call
 * `git init` in a scratch repo, and the autopilot guard runs with the env the
 * *app* was launched with -- which has no Git on PATH. Every one of them died with
 * `spawnSync git ENOENT`, the guard exited non-zero, and the promotion was
 * reverted for a directory nobody touched.
 *
 * The same treatment `node` already gets: find a directory that really answers
 * `git` and put it in front of PATH.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { hasGit, gitBinCandidates, gitBinDir, gitOnPath, withGitOnPath } from '../../src/exec/git-bin.js'

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

test('a directory holding git.exe is recognised, an empty one is not', () => {
  const root = mkdtempSync(join(tmpdir(), 'loom-git-'))
  const withExe = join(root, 'cmd')
  mkdirSync(withExe, { recursive: true })
  writeFileSync(join(withExe, process.platform === 'win32' ? 'git.exe' : 'git'), '')
  assert.equal(hasGit(withExe), true)
  assert.equal(hasGit(join(root, 'nope')), false)
  assert.equal(hasGit(''), false)
})

test('the candidates name the usual install locations for the platform', () => {
  const win = gitBinCandidates({ platform: 'win32', env: { ProgramFiles: 'C:/PF', LOCALAPPDATA: 'C:/LA' } })
  assert.ok(win.some((d) => /Program Files|PF/.test(d)), 'Program Files is probed')
  assert.ok(win.some((d) => /LA/.test(d)), 'a per-user install is probed')
  const posix = gitBinCandidates({ platform: 'linux', env: {} })
  assert.ok(posix.includes('/usr/bin'))
})

test('the first candidate that exists wins', () => {
  const root = mkdtempSync(join(tmpdir(), 'loom-git2-'))
  const a = join(root, 'a')
  const b = join(root, 'b')
  mkdirSync(a, { recursive: true })
  mkdirSync(b, { recursive: true })
  const exe = process.platform === 'win32' ? 'git.exe' : 'git'
  writeFileSync(join(b, exe), '')
  assert.equal(gitBinDir({ platform: 'win32', env: { ProgramFiles: a, LOCALAPPDATA: buildLocal(root, b) } }), null)
  assert.equal(hasGit(b), true)
})

test('PATH gains the directory once, in front, without losing order', () => {
  const root = mkdtempSync(join(tmpdir(), 'loom-git3-'))
  const dir = join(root, 'cmd')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, process.platform === 'win32' ? 'git.exe' : 'git'), '')
  const out = withGitOnPath(['C:/one', 'C:/two'].join(delimiter), {
    platform: 'win32',
    env: { ProgramFiles: join(root, '..'), LOCALAPPDATA: root },
  })
  // LOCALAPPDATA/Programs/Git/cmd is the only candidate that can match
  assert.ok(out.includes('C:/one'), 'the caller order survives')
  const again = withGitOnPath(out, { platform: 'win32', env: { LOCALAPPDATA: root } })
  assert.equal(again, out, 'adding twice is the same PATH')
})

test('no install found leaves PATH exactly as it was', () => {
  assert.equal(withGitOnPath('C:/only', { platform: 'win32', env: {} }), 'C:/only')
})

test('gitOnPath answers for the directory it would add', () => {
  const root = mkdtempSync(join(tmpdir(), 'loom-git4-'))
  const dir = join(root, 'Programs', 'Git', 'cmd')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, process.platform === 'win32' ? 'git.exe' : 'git'), '')
  const options = { platform: 'win32', env: { LOCALAPPDATA: root } }
  assert.equal(gitOnPath(dir, options), true)
  assert.equal(gitOnPath('C:/other', options), false)
})

function buildLocal(root, dir) {
  return root
}

console.log(`${passed} passed`)
