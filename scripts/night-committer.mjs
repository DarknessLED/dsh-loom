#!/usr/bin/env node
// Night shift helper: the autopilot applies verified patches but never commits,
// so this keeps the workspace on a clean footing between rounds.
//
//  - an open gate checkpoint                        -> commit nothing: a human was
//    asked to look at the patch, and from here that state looks exactly like a
//    promotable one (see scripts/commit-policy.mjs)
//  - workspace dirty and the regression suite passes -> commit it on master
//  - workspace dirty and a suite fails              -> stash it (recoverable) so
//    the next round is not blocked by a dirty tree, and log why
//
// Commit-only, never revert: rolling back a bad promotion is the plugin's job
// (autopilot guard). Run with `--once` for a single pass.
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countOpenGates, shouldCommit } from './commit-policy.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const home = process.env.LOOM_HOME ? resolve(process.env.LOOM_HOME) : join(homedir(), '.dsh', 'loom')
const logFile = join(home, 'night.log')
mkdirSync(dirname(logFile), { recursive: true })
const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`
  appendFileSync(logFile, line)
  process.stdout.write(line)
}
// The daemon ticks every twenty seconds; a refusal that lasts all night must be
// written once, not three hundred times.
let lastSkip = ''
const logSkip = (msg) => {
  if (msg === lastSkip) return
  lastSkip = msg
  log(msg)
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

  // A patch waiting on a person is dirty and green too. Check before spending a
  // regression run, and again after it: the suite can take minutes, and a gate
  // raised while it ran must still stop the commit.
  const gatesBefore = countOpenGates({ home, workspace: root })
  if (gatesBefore > 0) {
    return logSkip(`refusing to commit: ${gatesBefore} open gate checkpoint(s) await a human`)
  }

  const verdict = pass()
  const openGates = countOpenGates({ home, workspace: root })
  if (!shouldCommit({ dirty: true, openGates, suiteGreen: verdict.ok })) {
    if (openGates > 0) {
      return logSkip(`refusing to commit: ${openGates} open gate checkpoint(s) await a human`)
    }
    if (verdict.ok) {
      return logSkip('commit policy declined the commit; leaving the tree dirty')
    }
    const stash = git(['stash', 'push', '-u', '-m', `loom night shift: failing promotion ${new Date().toISOString()}`])
    return log(`guard failed (${verdict.tail.slice(0, 240)}); stashed: ${stash.stdout.trim().split('\n')[0] || stash.stderr.trim()}`)
  }

  lastSkip = ''
  git(['add', '-A'])
  const commit = git(['commit', '-m', `loom night shift: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` (+${files.length - 3})` : ''}`])
  if (commit.status === 0) {
    const sha = git(['rev-parse', '--short', 'HEAD'])
    log(`committed ${sha.stdout.trim()} — ${files.length} file(s)`)
  } else {
    log(`commit failed: ${commit.stderr.trim().slice(0, 300)}`)
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
