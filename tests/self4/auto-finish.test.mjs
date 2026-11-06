// A campaign whose every task is solved must stop, not spin. Tonight loom-self2
// burned rounds 14 and 15 re-running tasks that had already landed at 1.0 and
// reporting "no-gain" for work nobody needed.
//
//   node tests/self4/auto-finish.test.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'
import { templateFor } from '../../src/chain/templates.js'
import { pickTask } from '../../src/runtime/selector.js'

const NODE = process.execPath
const root = mkdtempSync(join(tmpdir(), 'loom-finish-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })
writeFileSync(join(repo, 'a.txt'), 'a\n')
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', windowsHide: true })
git('init', '-q')
git('config', 'user.email', 'loom@example.com')
git('config', 'user.name', 'loom')
git('add', '.')
git('commit', '-q', '-m', 'init')

const config = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 1 } })
const runtime = new Runtime({ ctx: {}, home, config, log: () => {} })
const view = runtime.create({ id: 'finish-campaign', objective: 'solve one task', workspace: repo, initiator: null })

runtime.append(view, 'evalset.registered', {
  tasks: [
    { id: 'one', prompt: 'write the file', verify: { cmd: `"${NODE}" -e "process.exit(0)"`, timeoutMs: 30_000 } },
  ],
  holdout: [],
})
const spec = { ...JSON.parse(JSON.stringify(templateFor('code-fix'))), version: 1, params: { candidates: 1 } }
runtime.append(view, 'chain.proposed', { version: 1, spec })
runtime.append(view, 'chain.activated', { version: 1 })
runtime.append(view, 'campaign.status', { status: 'running' })

let failed = 0
const check = (name, cond, detail = '') => {
  if (cond) console.log(`ok - ${name}`)
  else {
    failed += 1
    console.log(`not ok - ${name}${detail ? ` (${detail})` : ''}`)
  }
}

// The selector must be able to say "nothing left to do" rather than hand back a
// task that already scores 1.0.
const st = () => runtime.get('finish-campaign').state
const tasks = [{ id: 'one', prompt: 'write the file' }]
const solvedRows = [{ n: 1, taskId: 'one', landed: true, promotedAttemptId: 'r1a1', attempts: [{ id: 'r1a1', verifierOk: true, score: 1 }] }]
const picked = pickTask(tasks, solvedRows, { round: 2 })
check('a solved campaign reports it has nothing left', picked.task === null && picked.allSolved === true, JSON.stringify(picked))

// A round on a task that is not solved still gets that task back.
const openRows = [{ n: 1, taskId: 'one', landed: false, attempts: [{ id: 'r1a1', verifierOk: false, score: 0 }] }]
const next = pickTask(tasks, openRows, { round: 2 })
check('an unsolved campaign still gets a task', next.task?.id === 'one' && next.allSolved === false, JSON.stringify(next))

// Driving the scheduler: with the single task already landed, a tick must mark
// the campaign done instead of starting another round.
runtime.append(view, 'round.started', { n: 1, taskId: 'one', chainVersion: 1 })
runtime.append(view, 'attempt.finished', { id: 'r1a1', round: 1, taskId: 'one', verifierOk: true, score: 1, patch: 'x.patch' })
runtime.append(view, 'gate.evaluated', { candidateId: 'r1a1', round: 1, promoted: true, score: 1, incumbentScore: null, checks: { verifierOk: true, hasPatch: true, beatsIncumbent: true } })
runtime.append(view, 'artifact.promoted', { kind: 'attempt', round: 1, score: 1, patch: 'x.patch', branch: 'b' })
runtime.append(view, 'autopilot.applied', { round: 1, patch: 'x.patch', commit: 'abc', committed: true })
runtime.append(view, 'round.finished', { n: 1, status: 'promoted', score: 1, promoted: true })

await runtime.tick()

const state = st()
check('the campaign marks itself done when every task is solved', state.status === 'done', `status=${state.status}`)
check('no extra round was started', (state.rounds || []).length === 1, `rounds=${(state.rounds || []).length}`)
const finished = (runtime.get('finish-campaign').ledger.all() || []).filter((e) => e.type === 'campaign.status' && e.data?.status === 'done')
check('the reason is recorded', finished.length === 1 && finished[0].data.reason === 'all-tasks-solved', JSON.stringify(finished[0]?.data || null))

console.log(failed === 0 ? '\nauto finish: ok' : `\nauto finish: ${failed} failed`)
process.exitCode = failed === 0 ? 0 : 1
