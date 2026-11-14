// Wave 22 / p5: the score is a coin, and the instrument exists.
//
// The gate promotes on a binary verifier: 1 or 0, and the same task scores 1
// whether the patch is artful or barely enough. The mutation-kill harness measures
// something continuous -- 0.3114 mean across 22 tasks, 5pp of kill rate worth
// 3.5pp of score -- and no round has ever read it, because nothing parses its
// `KILLRATE=` line out of the verifier output.
//
// This is the smallest honest step: the line becomes a recorded metric, and the
// gate can see it. Using it to promote is a later, measured decision.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMetrics, verifyMetrics } from '../../src/gate/metrics.js'

test('the kill-rate line the harness prints is read', () => {
  const out = parseMetrics('running 22 tasks\nKILLRATE=0.3114\n')
  assert.equal(out.killRate, 0.3114)
})

test('a missing line is null, never zero', () => {
  assert.equal(parseMetrics('all good').killRate, null)
  assert.equal(parseMetrics('').killRate, null)
})

test('a malformed number is not silently a metric', () => {
  assert.equal(parseMetrics('KILLRATE=abc').killRate, null)
  assert.equal(parseMetrics('KILLRATE=').killRate, null)
})

test('other METRIC lines are carried too, under their own name', () => {
  const out = parseMetrics('KILLRATE=0.5\nMUTANTS=12\n')
  assert.equal(out.mutants, 12)
})

test('the verifier result carries the metrics onto the attempt', () => {
  const out = verifyMetrics({ stdout: 'KILLRATE=0.62\n', status: 0 })
  assert.equal(out.metrics.killRate, 0.62)
  assert.equal(out.status, 0)
})

test('an attempt that prints nothing still verifies', () => {
  const out = verifyMetrics({ stdout: 'ok\n', status: 0 })
  assert.deepEqual(out.metrics, {})
  assert.equal(out.status, 0)
})
