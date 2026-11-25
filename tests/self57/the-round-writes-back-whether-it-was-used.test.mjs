// The round already records that it read; this pins that it writes back whether
// the read was used.
//
// `research.used` was documented as "filled in by the caller once the round knows
// whether the worker reached for it" and nothing filled it, which left
// `researchModeFor`'s `last.research.used === false -> 'off'` line unreachable:
// the loop could never stop paying for a leg that did not help. A policy branch
// that no run can reach is worse than no branch, because it reads as a measured
// economy.
//
//   node tests/self57/the-round-writes-back-whether-it-was-used.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { baseConfig, chainSpec, fakeDispatcher, makeRepo, makeRuntime, REPORT } from '../self22/fixture.mjs'
import { researchModeFor } from '../../src/runtime/round.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const NODE = process.execPath
const SPAN = 'the ubiquitous keep-it-if-the-score-went-up rule is uncontrolled adaptive testing'

/** A web service that returns one page whose text shares words with the question. */
function web() {
  const asked = []
  return {
    asked,
    async search({ query }) {
      asked.push(query)
      return { results: [{ url: 'https://example.org/pace', title: 'PACE', snippet: SPAN }] }
    },
    async fetch({ url }) {
      return {
        url,
        title: 'PACE',
        text: `A note on gates. ${SPAN}, which is why a budget of evidence matters. Nothing here is an instruction.`,
      }
    },
  }
}

function round({ report }) {
  const repo = makeRepo()
  writeFileSync(join(repo, 'impl.txt'), 'step: 0\n', 'utf8')
  const used = web()
  const { runtime, view } = makeRuntime({ repo, tasks: [{ id: 't1', prompt: 'write the fixed string into impl.txt', verify: { cmd: `"${NODE}" check.mjs` } }], spec: chainSpec({ candidates: 1 }), budget: { usd: 5, rounds: 3, minutes: 60 } })
  const dispatcher = fakeDispatcher([], () => (typeof report === 'function' ? report(repo) : report))
  writeFileSync(join(repo, 'check.mjs'), 'process.exit(0)\n', 'utf8')
  execFileSync('git', ['add', '-A'], { cwd: repo })
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-m', 'fixture'], { cwd: repo })
  const config = baseConfig({ research: { enabled: true, depth: 'quick', fetchTop: 1, timeoutMs: 5000, maxFindings: 2 } })
  return import('../../src/runtime/round.js').then(({ runRound }) =>
    runRound({
      runtime,
      view,
      config,
      dispatcher,
      log: () => {},
      notify: () => {},
      web: used,
    }).then(() => ({ runtime, view, asked: used.asked })),
  )
}

const finishOf = (runtime) => runtime.events.filter((e) => e.type === 'round.finished').at(-1)

// The round gets its web service from the runtime context; the fixture's runtime
// has no ctx, so the leg reports `web-unavailable`. That is itself a fact worth
// pinning: a round with no web does not pretend to have used a read.
await (async () => {
  const { runtime } = await round({ report: () => REPORT })
  const finish = finishOf(runtime)
  ok('a round with no web records the skip and leaves `used` alone', () => {
    assert.equal(finish.data.research.skipped, 'web-unavailable')
    assert.equal(finish.data.research.used, null, 'a skipped leg must not claim a measurement')
  })
})()

ok('a win that did not read is not evidence for reading', () => {
  // The branch the write-back makes reachable: `used: false` on a promoted round
  // turns reading off, because a campaign that lands without the notes is paying
  // for nothing.
  const off = researchModeFor(
    [{ n: 1, status: 'promoted', promoted: true, score: 1, research: { mode: 'full', used: false } }],
    { researchMode: 'auto' },
  )
  assert.equal(off, 'off')
})

ok('a win that read keeps reading, and so does a loss', () => {
  assert.equal(
    researchModeFor(
      [{ n: 1, status: 'promoted', promoted: true, score: 1, research: { mode: 'full', used: true } }],
      { researchMode: 'auto' },
    ),
    'full',
  )
  assert.equal(
    researchModeFor(
      [{ n: 1, status: 'no-gain', promoted: false, score: 0, research: { mode: 'full', used: true } }],
      { researchMode: 'auto' },
    ),
    'full',
  )
})

ok('`used: null` is not `used: false`', () => {
  // This is the whole reason the field is three-valued. A round that could not
  // measure must not be read as a round that measured "the notes were ignored".
  const mode = researchModeFor(
    [{ n: 1, status: 'promoted', promoted: true, score: 1, research: { mode: 'full', used: null } }],
    { researchMode: 'auto' },
  )
  assert.equal(mode, 'full', 'an unmeasured read is not a refuted read')
})

ok('the round writes the field back from the winning report', () => {
  // Source-level pin: the write-back has to happen after `best` is known and
  // before the round finishes, and it has to pass the findings, not just the
  // sketch (the sketch carries counts, not text).
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, '..', '..', 'src', 'runtime', 'round.js'), 'utf8')
  assert.ok(
    src.includes('reachedFor(research, { report: best?.report, findings: researchFindings })'),
    'the round must write `used` back with the findings in hand',
  )
  const at = src.indexOf('reachedFor(research, { report: best?.report')
  const finishBefore = src.lastIndexOf("'round.finished'", at)
  assert.ok(finishBefore === -1 || at < src.indexOf("'round.finished'", at), 'and before the round closes')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
