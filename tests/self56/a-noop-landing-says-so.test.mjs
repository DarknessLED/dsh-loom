// A promotion that changed nothing is not the same fact as one that changed
// something, and only the artifact said so.
//
// `artifact.promoted` carries `noop: true` when the round landed on a tree that
// already satisfied the task — the verifier passed and the diff was empty. The
// round record does not: over this ledger that is 26 no-op landings out of 267
// promotions, every one of them reading in `round.finished` as an ordinary
// promotion. A reader asking "how much work did this campaign land" answers
// 267, and 26 of those answers are wrong.
//
// The fix carries the flag the round already computed. `checks.noop` is decided
// before the holdout gate and is exactly the condition the artifact uses, so the
// round can say it without deciding anything new.
//
//   node tests/self56/a-noop-landing-says-so.test.mjs
import assert from 'node:assert/strict'
import { rmSync, writeFileSync } from 'node:fs'
import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, fakeDispatcher, chainSpec, REPORT } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

async function runWith({ edits = false } = {}) {
  const dir = makeRepo()
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({ candidates: 1 }),
    tasks: [{ id: 't1', prompt: 'make it pass', verify: { cmd: 'exit 0' } }],
    budget: { usd: 4, spentUsd: 0 },
  })
  const calls = []
  const dispatcher = fakeDispatcher(calls, (brief, opts) => {
    // A real edit in the worktree: the round must not call this a no-op.
    if (edits && opts?.cwd) writeFileSync(`${opts.cwd}/fix.txt`, 'real work\n')
    return REPORT
  })
  await runRound({ runtime, view, config: baseConfig(), dispatcher, log: () => {}, notify: () => {} })
  const finish = runtime.events.find((e) => e.type === 'round.finished')?.data
  const artifact = runtime.events.find((e) => e.type === 'artifact.promoted')?.data
  rmSync(dir, { recursive: true, force: true })
  return { finish, artifact }
}

// 1. No edit, verifier green: the tree already satisfied the task. That is a
// landing, and it is a landing of nothing.
const empty = await runWith()
assert.ok(empty.finish, 'the round finished')
assert.equal(empty.finish.promoted, true, 'an empty diff that satisfies the task still lands')
assert.equal(empty.artifact?.noop, true, 'the artifact already said it was empty')
assert.equal(
  empty.finish.noop,
  true,
  'and the round says so too: 26 of 267 promotions in this ledger were empty, and none of them said it',
)
ok('a landing with no diff is recorded as a no-op')

// 2. A round that did change a file must not be flagged, or the field would just
// be `promoted` spelled twice.
const changed = await runWith({ edits: true })
assert.ok(changed.finish, 'the second round finished')
assert.equal(changed.finish.noop, false, 'a round that changed a file is not a no-op')
ok('a round with a diff is not flagged')

console.log(`\n${pass} checks passed`)
