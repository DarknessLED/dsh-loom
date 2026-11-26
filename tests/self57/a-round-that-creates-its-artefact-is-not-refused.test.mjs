// The unit spec pins `createdInstruments`. This one pins the round: a verifier
// that takes its subject on the command line must not refuse the round that
// creates that subject.
//
// All six rounds of `trial-prose` were refused with `verifierOk: true`,
// `score: 1`, `oracleInBase: false`, `oracleCreated: ["design-note-N.md"]` and
// `earnedReason: 'oracle-absent-at-base'`. Six rounds of a correct answer, six
// refusals, and nothing in the status said the task was impossible as posed.
//
// The shape that matters: `node check.mjs note.md` names the instrument and the
// artefact in one command. `check.mjs` existed at base; `note.md` is what the
// round was told to write.
//
//   node tests/self57/a-round-that-creates-its-artefact-is-not-refused.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runRound } from '../../src/runtime/round.js'
import { makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

let pass = 0
let fail = 0
async function ok(name, fn) {
  try {
    await fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

const NODE = process.execPath
const REPORT = '{"changed":["note.md"],"why":"wrote the note","evidence":["wrote it"],"openQuestions":[],"confidence":0.7,"nextHint":""}'

function repo({ withCheck = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'loom-artefact-'))
  mkdirSync(join(dir, 'tests'))
  if (withCheck) {
    writeFileSync(
      join(dir, 'check.mjs'),
      [
        "import { readFileSync } from 'node:fs'",
        'const file = process.argv[2]',
        'let text = ""',
        'try { text = readFileSync(file, "utf8") } catch { text = "" }',
        'const ok = text.includes("ready")',
        'console.log("KILLRATE=" + (ok ? "1.0000" : "0.0000"))',
        'process.exit(ok ? 0 : 1)',
        '',
      ].join('\n'),
    )
  }
  writeFileSync(join(dir, 'README.md'), 'write note.md saying ready\n')
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

// The candidate writes the artefact into its own worktree, the way a worker
// that was told "write note.md" actually does.
function writer(text = 'ready') {
  return {
    run: async (brief, opts = {}) => {
      writeFileSync(join(opts.cwd, 'note.md'), `${text}\n`)
      return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
    },
  }
}

function runtimeFor(dir, verifyCmd) {
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({
      candidates: 1,
      nodes: [
        { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: write note.md' } },
        { id: 'verify', type: 'verifier', cmd: verifyCmd, cwd: '.' },
      ],
    }),
    tasks: [{ id: 't1', title: 'write a note', verify: { cmd: verifyCmd, cwd: '.' }, brief: 'write note.md' }],
    budget: { rounds: 3 },
  })
  view.state.evalset.tasks[0].base = git(dir, 'rev-parse', 'HEAD').trim()
  return { runtime, view }
}

// Relative on purpose: `oracleCandidates` skips drive-letter absolute paths (they
// are outside the workspace a patch can touch), and a probe whose command names
// its instrument absolutely would test nothing here.
const cmdFor = () => `"${NODE}" check.mjs note.md`

await ok('a round that creates the file its verifier reads is not refused', async () => {
  const dir = repo()
  const { runtime, view } = runtimeFor(dir, cmdFor())
  await runRound({
    runtime,
    view,
    config: baseConfig({ halving: { enabled: false } }),
    dispatcher: writer(),
    log: () => {},
    notify: () => {},
  })
  const gate = runtime.events.filter((e) => e.type === 'gate.evaluated').at(-1)
  assert.ok(gate, 'a gate decision must exist')
  const checks = gate.data.checks ?? {}
  assert.equal(checks.verifierOk, true, 'the verifier ran and passed')
  assert.equal(checks.oracleInBase, true, 'the instrument existed at base')
  assert.equal(checks.oracleCreated, undefined, 'the artefact is not a created instrument')
  assert.notEqual(checks.earnedReason, 'oracle-absent-at-base')
})

await ok('creating the instrument itself is still refused', async () => {
  const dir = repo({ withCheck: false })
  const { runtime, view } = runtimeFor(dir, cmdFor())
  const dispatcher = {
    run: async (brief, opts = {}) => {
      writeFileSync(
        join(opts.cwd, 'check.mjs'),
        [
          "import { readFileSync } from 'node:fs'",
          'const file = process.argv[2]',
          'let text = ""',
          'try { text = readFileSync(file, "utf8") } catch { text = "" }',
          'const ok = text.includes("ready")',
          'console.log("KILLRATE=" + (ok ? "1.0000" : "0.0000"))',
          'process.exit(ok ? 0 : 1)',
          '',
        ].join('\n'),
      )
      writeFileSync(join(opts.cwd, 'note.md'), 'ready\n')
      return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
    },
  }
  await runRound({
    runtime,
    view,
    config: baseConfig({ halving: { enabled: false } }),
    dispatcher,
    log: () => {},
    notify: () => {},
  })
  const gates = runtime.events.filter((e) => e.type === 'gate.evaluated')
  const checks = gates.length ? (gates.at(-1).data.checks ?? {}) : {}
  const created = checks.oracleCreated ?? []
  assert.ok(
    created.includes('check.mjs') || checks.earnedReason === 'oracle-absent-at-base' || gates.length === 0,
    `a created instrument must still be caught, got ${JSON.stringify({ created, earnedReason: checks.earnedReason })}`,
  )
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
