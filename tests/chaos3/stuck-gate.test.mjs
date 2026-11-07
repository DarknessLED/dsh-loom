// Adversarial: an unreachable gate. A task can be specified so that no patch can
// ever satisfy it — a spec that throws in its own harness, a typo'd path, a
// verifier that exits before it looks at the code. From the inside that looks
// exactly like "the agent is not good enough yet", so the loop happily spends
// every round of its budget on it. The tell is that the patch changes while the
// verifier's failure stays byte-identical.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runRound } from '../../src/runtime/round.js'
import { baseConfig, baseState, campaignDir, fakeRuntime, ok, done, repo, REPORT } from '../chaos/fixture.mjs'

// The verifier fails the same way whatever the code says: same exit code, same
// stderr. A real, hard task fails differently as the agent learns.
const STUCK = 'same-failure-signature'
const task = {
  id: 'stuck',
  family: 'stuck',
  prompt: 'make the impossible pass',
  verify: { cmd: `echo ${STUCK} 1>&2 && exit 1` },
}

function setup() {
  const dir = repo('loom-chaos-stuck-')
  const camp = campaignDir(dir)
  const rt = fakeRuntime(camp, dir)
  const view = {
    dir: camp,
    state: baseState({
      workspace: dir,
      evalset: { tasks: [{ ...task, verify: { cmd: `echo ${STUCK} 1>&2 && exit 1` } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
      },
    }),
  }
  return { dir, camp, rt, view }
}

// Every attempt writes a different file, so the patches really differ.
let nonce = 0
const mutating = {
  run: async (_prompt, opts) => {
    nonce += 1
    writeFileSync(join(opts.cwd, `attempt-${nonce}.txt`), `try ${nonce}\n`)
    return { sessionId: `s${nonce}`, text: REPORT, structured: null, stopReason: 'completed', timedOut: false, error: null }
  },
}

const { dir, rt, view } = setup()
const config = baseConfig()

const signatures = []
let stuck = []
for (let n = 1; n <= 3; n += 1) {
  await runRound({ runtime: rt, view, config, dispatcher: mutating, log: () => {}, notify: () => {} })
  const attempt = [...rt.events].reverse().find((e) => e.type === 'attempt.finished' && e.data.round === n)
  assert.equal(typeof attempt?.data?.verifySignature, 'string', `round ${n} records a verifier signature`)
  assert.notEqual(attempt.data.verifySignature.length, 0, `round ${n}'s signature is not empty`)
  signatures.push(attempt.data.verifySignature)
  stuck = rt.events.filter((e) => e.type === 'checkpoint.raised' && e.data.kind === 'stuck')
  if (n < 3) {
    assert.equal(stuck.length, 0, `two identical failures are not yet proof (round ${n})`)
  }
}

assert.deepEqual(new Set(signatures).size, 1, 'the three failures carried the same signature')
assert.equal(stuck.length, 1, 'three byte-identical failures raise exactly one checkpoint')
assert.equal(stuck[0].data.payload?.taskId, 'stuck', 'the checkpoint names the task')
assert.equal(typeof stuck[0].data.payload?.signature, 'string', 'the checkpoint carries the signature')
ok('a gate that never moves is reported instead of burning the budget')

// A task that fails differently every time is work in progress, not a trap.
{
  const fresh = setup()
  let n = 0
  const varying = {
    run: async (_prompt, opts) => {
      n += 1
      writeFileSync(join(opts.cwd, `try-${n}.txt`), `${n}\n`)
      // Different stderr each round: the agent's patches are changing the code.
      fresh.view.state.evalset.tasks[0].verify = { cmd: `echo progress-${n} 1>&2 && exit 1` }
      return { sessionId: `v${n}`, text: REPORT, structured: null, stopReason: 'completed', timedOut: false, error: null }
    },
  }
  for (let i = 1; i <= 3; i += 1) {
    await runRound({ runtime: fresh.rt, view: fresh.view, config, dispatcher: varying, log: () => {}, notify: () => {} })
  }
  const stuck2 = fresh.rt.events.filter((e) => e.type === 'checkpoint.raised' && e.data.kind === 'stuck')
  assert.equal(stuck2.length, 0, 'varying failures are not flagged as a trap')
  ok('a task whose failures evolve is left alone')
}

done()
