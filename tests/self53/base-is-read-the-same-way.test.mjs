// A paired comparison needs both sides read by the same instrument.
//
// P0-1 pairs the candidate against the base tree on the same task with the same
// verifier. That sentence only means something if both sides are read the same
// way — and they were not: the candidate's round took the universal lines out of
// stdout (`verifyMetrics`, so a task that never declares a metric still yields a
// kill rate), while `baseVerdict` cached only the task-declared metrics. In the
// ledger that shows up as 148 of 445 gate evaluations carrying a `baseMetrics`
// object and none of them carrying a `killRate`: the base side of every pair was
// blank, so the sequential gate had no pair to look at and could only defer.
//
// This spec pins that a base verdict carries the universal reading too, and that
// the cache version moved so a stored version-2 entry (declared metrics only)
// cannot be mistaken for a measured base.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baseVerdict } from '../../src/runtime/baseline.js'
import { readFileSync } from 'node:fs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const dir = mkdtempSync(join(tmpdir(), 'rsi-base-'))
const runs = []
const run = async () => {
  runs.push(1)
  return { ok: true, exitCode: 0, stdout: 'KILLRATE=0.4000\nMUTANTS=22\n', metrics: {} }
}

const first = await baseVerdict({ dir, cwd: dir, taskId: 't1', base: 'abc', command: 'exit 0', run })
assert.equal(first.metrics.killRate, 0.4, 'the base is read with the universal parser, not only task-declared metrics')
assert.equal(first.metrics.mutants, 22)
assert.equal(first.cached, false)
ok('a base verdict carries the rate the task never declared')

// A task that declares its own metric still gets both readings, and the declared
// one wins on a key they share: the task named it, the harness only printed it.
const second = await baseVerdict({
  dir,
  cwd: dir,
  taskId: 't2',
  base: 'abc',
  command: 'exit 0',
  run: async () => ({ ok: true, exitCode: 0, stdout: 'KILLRATE=0.9000\n', metrics: { killRate: 0.1 } }),
})
assert.equal(second.metrics.killRate, 0.1, 'a metric the task declares is not overwritten by the universal line')
ok('the declared reading wins on the key it names')

// The cached copy must answer the same question the fresh one answered, and a
// version-2 entry (which had no universal reading) must not be reused.
const third = await baseVerdict({
  dir,
  cwd: dir,
  taskId: 't1',
  base: 'abc',
  command: 'exit 0',
  run: async () => {
    throw new Error('a cached verdict must not spawn the verifier again')
  },
})
assert.equal(third.cached, true)
assert.equal(third.metrics.killRate, 0.4, 'the cache keeps the reading it stored')
ok('the cache answers with the reading, not just the exit code')

const file = join(dir, 'baseline-cache.json')
const stored = JSON.parse(readFileSync(file, 'utf8'))
const key = Object.keys(stored).find((k) => stored[k].taskId === 't1')
assert.ok(key, 'the entry is keyed by task')
// Version 2 wrote entries without a universal reading; reusing one would restore
// the blind base this change exists to remove.
assert.ok(
  !/^sha1\(`?\[?2,/.test(key),
  'the cache key carries the version so an older shape is re-measured, not reused',
)
ok('a stored entry is versioned')

// A base that prints nothing measurable stays unmeasured rather than becoming a
// zero, because zero is a reading and absence is not.
const blank = await baseVerdict({
  dir,
  cwd: dir,
  taskId: 't3',
  base: 'abc',
  command: 'exit 0',
  run: async () => ({ ok: true, exitCode: 0, stdout: 'all good\n', metrics: {} }),
})
assert.equal(blank.metrics, null, 'a base with nothing to read has no metrics, not zero metrics')
ok('silence stays silence')

rmSync(dir, { recursive: true, force: true })
const src = readFileSync(new URL('../../src/runtime/baseline.js', import.meta.url), 'utf8')
assert.match(src, /verifyMetrics\(/, 'the base reader asks the same parser the round asks')
assert.match(src, /CACHE_VERSION = 3/, 'the cache version moved with the shape of a stored verdict')
ok('the base reader is the round reader')
