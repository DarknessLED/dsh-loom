// The guard exists to answer "did the promoted patch break anything". When the
// task's own verify command already *contains* that exact guard command, the
// answer was produced during verification — in the same worktree, against the
// same patch — and running it again spends the guard's seconds to re-learn it.
//
// Measured on this repo: `scripts/test-all.mjs` is ~90s, and campaigns that use
// it as their guard also use it as the tail of their verify command, so every
// promotion was paying for it twice.
//
// The rule is narrow on purpose: reuse only when the guard command appears
// verbatim inside the verified command, and only then. Anything else runs.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

// The repo must stay clean for the promotion to be applied (a dirty workspace is
// exactly what the plugin refuses to patch), so the campaign directory and the
// counter scripts live beside the repo, never inside it.
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

function fakeRuntime(root) {
  const events = []
  return {
    home: join(root, 'home'),
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 2 },
  verify: { timeoutMs: 60_000 },
  loopPolicy: { halving: false },
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
  checkpoint: { on: [] },
}

const chainSpec = {
  name: 'guard-chain',
  version: 1,
  params: { candidates: 1 },
  nodes: [{ id: 'work', type: 'map', role: 'worker', prompt: 'do the task' }],
}

function makeView(root, dir, verifyCmd, guardCmd) {
  const view = {
    dir: join(root, 'campaign'),
    state: {
      id: 'guard',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: true, guard: guardCmd },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 100, spentUsd: 0 },
      evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'write it', verify: { cmd: verifyCmd } }], holdout: [] },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: chainSpec }] },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return view
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

// Case 1: the verify command carries the guard command inside it.
const a = layout('loom-guard-a-')
const guardA = join(a.root, 'guard-a.txt')
const guardScriptA = join(a.root, 'guard-a.cjs')
writeFileSync(guardScriptA, `require('fs').appendFileSync(${JSON.stringify(guardA)}, 'g')\n`)
const guardCmdA = `"${process.execPath}" "${guardScriptA}"`
// The spec has to be red before the candidate works, or the promotion it earns
// is not evidence: `out.txt` is what the dispatcher below writes.
const needsOut = 'process.exit(require(\'fs\').existsSync(\'out.txt\') ? 0 : 1)'
const verifyCmdA = `"${process.execPath}" -e "${needsOut}" && ${guardCmdA}`
const rtA = fakeRuntime(a.root)
const viewA = makeView(a.root, a.dir, verifyCmdA, guardCmdA)

await runRound({ runtime: rtA, view: viewA, config, dispatcher, log: () => {}, notify: () => {} })

const appliedA = rtA.events.filter((e) => e.type === 'autopilot.applied').map((e) => e.data)
const guardMarksA = existsSync(guardA) ? readFileSync(guardA, 'utf8').length : 0
assert.equal(appliedA.length, 1, 'the promotion was applied')
// Zero, from both sides. The base check runs the compound command in the
// workspace, where `out.txt` does not exist yet, so it exits before reaching the
// guard; and the applier reuses the verifier verdict instead of spawning the
// guard again. Two independent reasons the guard never got a second turn.
assert.equal(guardMarksA, 0, 'the guard is not spawned a second time, on either path')
assert.equal(appliedA[0].guard, 'reused-verifier', 'the applier says it reused the verifier verdict')
assert.ok(appliedA[0].commit, 'the patch is still committed, so the next round starts from it')

ok('a guard the verifier already ran is not spawned again')

// Case 2: the guard is a different command. It must run.
const b = layout('loom-guard-b-')
const guardB = join(b.root, 'guard-b.txt')
const guardScriptB = join(b.root, 'guard-b.cjs')
writeFileSync(guardScriptB, `require('fs').appendFileSync(${JSON.stringify(guardB)}, 'g')\n`)
const guardCmdB = `"${process.execPath}" "${guardScriptB}"`
const verifyCmdB = `"${process.execPath}" -e "${needsOut}"`
const rtB = fakeRuntime(b.root)
const viewB = makeView(b.root, b.dir, verifyCmdB, guardCmdB)

await runRound({ runtime: rtB, view: viewB, config, dispatcher, log: () => {}, notify: () => {} })

const appliedB = rtB.events.filter((e) => e.type === 'autopilot.applied').map((e) => e.data)
const guardMarksB = existsSync(guardB) ? readFileSync(guardB, 'utf8').length : 0
assert.equal(appliedB.length, 1, 'the promotion was applied')
// The base check runs the work spec only, so the guard's single mark is the
  // applier's own run.
  assert.equal(guardMarksB, 1, 'an unrelated guard command runs exactly once')
assert.equal(appliedB[0].guard, guardCmdB, 'the applier reports the guard it ran')

ok('a guard the verifier did not run still runs, exactly once')

rmSync(a.root, { recursive: true, force: true })
rmSync(b.root, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
