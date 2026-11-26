// The library module works; the round has to call it.
//
// `the-loop-reads-its-own-library` pins `local-index.js`. This pins the wiring,
// because a module that works and a round that never calls it is the failure
// mode this repository keeps producing (`researchTrial` was in the panel JSON
// for four commits before anyone drew it).
//
// The leg's dependency injection already takes `{search, fetchPage}`. So the
// change is: build the source from `research/out` when there is a library,
// fall back to `ctx.web` when there is not, and record which one answered.
//
//   node tests/self57/the-round-can-read-the-library.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runRound } from '../../src/runtime/round.js'
import { localLibrary, preferredSource } from '../../src/research/local-index.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec, REPORT } from '../self22/fixture.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROUND_SOURCE = readFileSync(join(HERE, '..', '..', 'src', 'runtime', 'round.js'), 'utf8')

let pass = 0
let fail = 0
const pending = []
function ok(name, fn) {
  pending.push(async () => {
    try {
      await fn()
      pass++
      console.log(`ok ${pass + fail} - ${name}`)
    } catch (err) {
      fail++
      console.log(`not ok ${pass + fail} - ${name}`)
      console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
    }
  })
}

const WORK = {
  slug: 'r10-eval-budget',
  built: '2026-11-26',
  works: [
    {
      id: '2606.08106',
      title: 'PACE: A Promotion Gate with a Budget of Evidence',
      year: 2026,
      abstract:
        'Keeping a change whenever the verifier score goes up is uncontrolled adaptive multiple testing; the agent p-hacks itself, and the fix is a budget of evidence.',
      mechanisms: [
        {
          locator: '§3 Testing by betting',
          title: 'Testing by betting',
          text: 'The e-value multiplies one plus lambda times twice the win indicator minus one, so a budget of evidence accumulates across rounds and the Ville bound controls the false-commit rate.',
        },
      ],
    },
  ],
}

// The task names a subject, so the leg asks about that subject rather than
// reciting the brief (`topicOf`).
const PROMPT = 'Write a note about how a promotion gate should use a budget of evidence.'

function libraryRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-leglib-'))
  const out = join(dir, 'research', 'out')
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'work-r10-eval-budget.json'), JSON.stringify(WORK, null, 1))
  return dir
}

async function roundWith({ root = libraryRoot(), web = null } = {}) {
  const repo = makeRepo()
  const tasks = [
    {
      id: 't-one',
      prompt: PROMPT,
      // Relative paths and the real node binary: an absolute path with a drive
      // letter is skipped by the oracle scanner, and `${NODE}` is not exported
      // into the verify shell.
      verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` },
    },
  ]
  const made = makeRuntime({ repo, tasks, spec: chainSpec() })
  made.runtime.home = root
  // The fixture runtime is a stub; the leg reaches for `runtime.ctx` the way the
  // real one does, so the fake injects it here.
  made.runtime.ctx = web ? { web } : {}
  const config = baseConfig({ research: { enabled: true, depth: 'quick', fetchTop: 2 } })
  await runRound({
    runtime: made.runtime,
    view: made.view,
    config,
    dispatcher: fakeDispatcher([], () => REPORT),
    log: () => {},
    notify: () => {},
  })
  const finished = made.runtime.events.filter((e) => e.type === 'round.finished').pop()
  return { made, finished: finished?.data ?? null }
}

ok('a round with a library and no web reads the library', async () => {
  const { finished } = await roundWith({ web: null })
  assert.ok(finished, 'the round finished')
  assert.equal(finished.research.mode, 'full')
  assert.equal(finished.research.skipped, undefined, `expected a real read, got ${finished.research.skipped}`)
  assert.ok(finished.research.read >= 1, `expected at least one page read, got ${finished.research.read}`)
  assert.ok(finished.research.passages >= 1, 'the page yielded a quotable passage')
  assert.equal(finished.research.source, 'library', 'the record says the library answered')
})

ok('the library answers even when the web service is absent', async () => {
  const { made } = await roundWith({ web: null })
  assert.equal(typeof (made.runtime.ctx?.web), 'undefined')
  const finished = made.runtime.events.filter((e) => e.type === 'round.finished').pop()
  assert.notEqual(finished?.data?.research?.skipped, 'web-unavailable', 'a missing web service is not a missing library')
})

ok('reading the library costs no measurable wall clock', async () => {
  const { finished } = await roundWith({ web: null })
  // The web leg spends 17–27 seconds a round (`trial-prose3`, `trial-agg`). A
  // library read is file I/O; a second would mean something is going out to the
  // network behind our back.
  assert.ok(finished.research.ms < 1000, `expected a local read, took ${finished.research.ms} ms`)
})

ok('with no library and no web the round still finishes and says why', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'loom-nolib-'))
  const { finished } = await roundWith({ root: empty, web: null })
  assert.ok(finished, 'the round finished anyway')
  assert.equal(finished.research.read, 0)
  assert.equal(finished.research.skipped, 'web-unavailable')
})

ok('the record says which source answered', async () => {
  assert.match(ROUND_SOURCE, /preferredSource\(/, 'the round builds a source that prefers the library')
  assert.match(ROUND_SOURCE, /localLibrary\(/, 'the round loads the library')
  assert.match(ROUND_SOURCE, /research\.source = source\.source\(\)/, 'the record says which source answered')
})

ok('the preferred source answers from the library, and says so', async () => {
  const lib = localLibrary(libraryRoot())
  const source = preferredSource({ library: lib, web: null })
  const found = await source.search('a budget of evidence for a promotion gate', { maxResults: 3 })
  assert.ok(Array.isArray(found.sources) && found.sources.length >= 1, 'search answers with `sources`, which the pipeline reads')
  assert.equal(source.source(), 'library')
  const page = await source.fetchPage(found.sources[0].url)
  assert.ok(page && typeof page.body?.content === 'string' && page.body.content.length > 40)
})

for (const run of pending) await run()
console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
