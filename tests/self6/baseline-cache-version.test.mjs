// A cache entry that answers a different question than the caller asks is a lie.
//
// baseline-cache.json stores one verdict per (task, base, command). Version 1 of
// that record carried only {ok, exitCode}. The graded-task reading in
// src/gate/earned.js needs the base's metrics as well -- without them the rule
// falls through to 'base-already-green' and refuses the work, which is exactly the
// defect the reading was added to fix. So an old entry must not be reused just
// because its ok/exitCode still look valid: it would silently restore the blind
// spot, and it would do so only on machines that had already run the campaign,
// which is the worst shape a bug can take.
//
// Rule: the cache key carries a version, and a shape change bumps it. A bump must
// cost re-measurement, never a fallback to the older, narrower answer.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { baseVerdict } from '../../src/runtime/baseline.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const sha1 = (v) => createHash('sha1').update(v).digest('hex')

// 1. An entry written by the previous format must not satisfy a request that now
//    needs metrics. Simulate it by writing the v1 key directly.
{
  const dir = mkdtempSync(join(tmpdir(), 'loom-basever-'))
  const taskId = 'graded'
  const base = 'cd338caa32fe841f0298fe7ad5589bc25c10ca74'
  const command = '"node" check.mjs'
  const v1key = sha1(JSON.stringify([taskId, base, command]))
  writeFileSync(
    join(dir, 'baseline-cache.json'),
    JSON.stringify({ [v1key]: { ok: true, exitCode: 0, taskId, base, command, at: 1 } }),
  )
  let runs = 0
  const res = await baseVerdict({
    dir,
    cwd: dir,
    taskId,
    base,
    command,
    run: async () => {
      runs += 1
      return { ok: true, exitCode: 0, metrics: { quality: 0.5 } }
    },
  })
  assert.equal(runs, 1, 'a v1 entry must be re-measured, not reused')
  assert.equal(res.cached, false)
  assert.deepEqual(res.metrics, { quality: 0.5 }, 'the fresh answer carries the metric')
  ok('a verdict from the previous format is re-measured, never reused')
}

// 2. The new answer is stored with its metrics, and reusing it must return them.
//    Caching a metric-less verdict under the new key would be the same bug again.
{
  const dir = mkdtempSync(join(tmpdir(), 'loom-basever2-'))
  const taskId = 'graded'
  const base = 'abc123'
  const command = '"node" check.mjs'
  let runs = 0
  const run = async () => {
    runs += 1
    return { ok: true, exitCode: 0, metrics: { quality: 0.5 } }
  }
  const first = await baseVerdict({ dir, cwd: dir, taskId, base, command, run })
  assert.deepEqual(first.metrics, { quality: 0.5 })
  assert.equal(first.cached, false)
  const second = await baseVerdict({ dir, cwd: dir, taskId, base, command, run })
  assert.equal(second.cached, true, 'the second answer comes from the cache')
  assert.deepEqual(second.metrics, { quality: 0.5 }, 'a cached verdict keeps its metric')
  assert.equal(runs, 1)
  ok('a cached verdict keeps its metrics, so the graded reading survives a warm cache')
}

// 3. The stored record is self-describing enough to tell the two shapes apart.
{
  const dir = mkdtempSync(join(tmpdir(), 'loom-basever3-'))
  await baseVerdict({
    dir,
    cwd: dir,
    taskId: 't',
    base: 'b',
    command: 'c',
    run: async () => ({ ok: false, exitCode: 1 }),
  })
  const raw = JSON.parse(readFileSync(join(dir, 'baseline-cache.json'), 'utf8'))
  const entries = Object.values(raw)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].ok, false)
  assert.equal(entries[0].metrics, null, 'a verdict without metrics records that fact explicitly')
  ok('the record states the absence of metrics rather than omitting it')
}

console.log(`\n${pass}/3 passed`)
assert.equal(pass, 3)
