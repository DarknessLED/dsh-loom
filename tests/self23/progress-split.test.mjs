// A failed verifier currently reports score 0, even when the round printed
// KILLRATE=0.9: the number that says "we are close" is thrown away. Score has
// to keep meaning "can this be promoted"; progress is a separate reading that
// says how far the attempt got, so a near miss is visible instead of flat.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

async function runOnce(verifyCmd) {
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: verifyCmd } }],
  })
  await runRound({ runtime, view, config: baseConfig(), dispatcher: fakeDispatcher([]), log: () => {}, notify: () => {} })
  const attempt = runtime.events.find((e) => e.type === 'attempt.finished')?.data
  const round = runtime.events.find((e) => e.type === 'round.finished')?.data
  rmSync(dir, { recursive: true, force: true })
  return { attempt, round }
}

const near = await runOnce('echo KILLRATE=0.9 && exit 1')
assert.equal(near.attempt.score, 0, 'the score still says: not promotable')
assert.equal(near.attempt.progress, 0.9, 'progress keeps the measurement the verifier printed')
assert.equal(near.attempt.promotable, false)
assert.equal(near.round.progress, 0.9, 'the round carries its best progress')
assert.equal(near.round.score, 0)
ok('a failed verifier keeps its progress reading without pretending to be promotable')

const win = await runOnce('echo KILLRATE=1.0')
assert.equal(win.attempt.progress, 1)
assert.equal(win.attempt.promotable, true)
ok('a promotable attempt reports progress 1 and promotable true')

console.log(`\n${pass}/${pass} passed`)
