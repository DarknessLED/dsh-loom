#!/usr/bin/env node
// Night shift helper: the autopilot applies verified patches but never commits,
// so this keeps the workspace on a clean footing between rounds.
//
//  - workspace dirty and the regression suite passes -> commit it on master
//  - workspace dirty and a suite fails              -> stash it (recoverable) so
//    the next round is not blocked by a dirty tree, and log why
//
// Commit-only, never revert: rolling back a bad promotion is the plugin's job
// (autopilot guard). Run with `--once` for a single pass.
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const logFile = join(homedir(), '.dsh', 'loom', 'night.log')
mkdirSync(dirname(logFile), { recursive: true })
const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`
  appendFileSync(logFile, line)
  process.stdout.write(line)
}

const git = (args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' })

function pass(extra = []) {
  const run = spawnSync(process.execPath, [join(root, 'scripts', 'test-all.mjs'), ...extra], {
    cwd: root,
    encoding: 'utf8',
    timeout: 600000,
  })
  return { ok: run.status === 0, tail: `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-6).join(' | ') }
}

function step() {
  const status = git(['status', '--porcelain'])
  if (status.status !== 0) return log(`git status failed: ${status.stderr.trim()}`)
  if (!status.stdout.trim()) return
  // Give the loop a moment: a patch that is still being applied shows up here too,
  // so re-check that the tree is still dirty after a short settle time.
  const before = status.stdout
  spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},1500)'])
  const after = git(['status', '--porcelain'])
  if (!after.stdout.trim()) return
  if (after.stdout !== before) return log('tree still changing; skipping this pass')

  const files = after.stdout.trim().split('\n').map((l) => l.slice(3))
  const verdict = pass()
  if (verdict.ok) {
    git(['add', '-A'])
    const commit = git(['commit', '-m', `loom night shift: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` (+${files.length - 3})` : ''}`])
    if (commit.status === 0) {
      const sha = git(['rev-parse', '--short', 'HEAD'])
      log(`committed ${sha.stdout.trim()} — ${files.length} file(s)`)
    } else {
      log(`commit failed: ${commit.stderr.trim().slice(0, 300)}`)
    }
  } else {
    const stash = git(['stash', 'push', '-u', '-m', `loom night shift: failing promotion ${new Date().toISOString()}`])
    log(`guard failed (${verdict.tail.slice(0, 240)}); stashed: ${stash.stdout.trim().split('\n')[0] || stash.stderr.trim()}`)
  }
}

if (process.argv.includes('--once')) {
  step()
} else {
  log('night committer started')
  const until = new Date()
  until.setHours(9, 0, 0, 0)
  const stopAt = until.getTime()
  const tick = () => {
    try {
      step()
    } catch (err) {
      log(`step threw: ${err?.message ?? err}`)
    }
    if (Date.now() >= stopAt) {
      log('night committer stopping (09:00)')
      process.exit(0)
    }
  }
  setInterval(tick, 20000)
  tick()
}
