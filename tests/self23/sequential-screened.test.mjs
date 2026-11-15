// Halving paid for its screens and then dispatched every survivor at once; on
// a solvable task that is one full attempt more than the round needs. Screening
// already ranked the candidates, so the round should buy the best one first and
// stop as soon as it wins.
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, chainSpec, REPORT } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const dir = makeRepo()
const calls = []
const dispatcher = {
  run: async (brief, opts = {}) => {
    const screen = String(opts.label || '').includes(':screen')
    calls.push({ label: opts.label, screen })
    if (screen) {
      // a1 looks hopeless, a3 looks best: the round should buy a3 and stop.
      const verdict = String(opts.label).includes('r1a1')
        ? 'VERDICT: unlikely'
        : String(opts.label).includes('r1a3')
          ? 'VERDICT: likely'
          : 'VERDICT: maybe'
      return { sessionId: 's', text: verdict, stopReason: 'completed' }
    }
    return { sessionId: 'w', text: REPORT, stopReason: 'completed' }
  },
}
const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({ candidates: 3 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' }, screen: { cmd: 'exit 0' } }],
})
const config = baseConfig({ halving: { enabled: true, keepRatio: 0.5, screenModel: 'cheap-x' } })
await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })

const full = calls.filter((c) => !c.screen)
assert.equal(full.length, 1, 'one survivor is bought, not every survivor')
assert.match(full[0].label, /r1a3$/, 'the screen-ranked candidate runs first')
const attempts = runtime.events.filter((e) => e.type === 'attempt.finished').map((e) => e.data)
assert.equal(attempts.filter((a) => !a.screenedOut).length, 1, 'the round records the one attempt it actually bought')

rmSync(dir, { recursive: true, force: true })
ok('screened survivors are dispatched best-first and stop at the first win')
console.log(`\n${pass}/${pass} passed`)
