// The screen is the part of halving that was never budgeted.
//
// A screening pass ran on the worker model with a 180 s deadline and an
// open-ended prompt; on real campaigns one screen burned 42k tokens because the
// agent kept reading the repo. These specs pin the two levers that make a
// screen cheap on purpose: an optional cheaper model, and a shared, one-line
// verdict format the round can rank on.
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
    calls.push({ brief, opts })
    const screen = String(opts.label || '').includes(':screen')
    return {
      sessionId: screen ? 'screen' : 'work',
      text: screen ? 'VERDICT: likely\ncause: one line' : REPORT,
      stopReason: 'completed',
    }
  },
}
const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({ candidates: 2 }),
  tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' }, screen: { cmd: 'exit 0' } }],
})
const config = baseConfig({ halving: { enabled: true, keepRatio: 0.5, screenModel: 'cheap-x' } })
await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })

const screens = calls.filter((c) => String(c.opts.label || '').includes(':screen'))
assert.equal(screens.length, 2, 'both candidates were screened')
for (const s of screens) {
  assert.equal(s.opts.model, 'cheap-x', 'a screen runs on the configured screen model, not the worker model')
  assert.match(s.brief, /VERDICT:/, 'the screen is asked for a machine-readable verdict')
  assert.match(s.brief, /Do not (open|read|run)/i, 'the screen is told to stay out of the repo')
}

const screensRecorded = runtime.events.filter((e) => e.type === 'attempt.finished' && e.data.screen)
for (const e of screensRecorded) {
  assert.equal(typeof e.data.screen.verdict, 'string', 'the verdict travels with the screen result')
  assert.ok(e.data.screen.rank >= 0 && e.data.screen.rank <= 2, 'the verdict is ranked so dispatch can order survivors')
}

rmSync(dir, { recursive: true, force: true })
ok('a screen has a model budget, a one-line verdict, and a rank')
console.log(`\n${pass}/${pass} passed`)
