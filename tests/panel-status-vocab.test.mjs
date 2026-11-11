// The panel is the only place that translates, so a status the host can write
// and the panel cannot read shows up as English in a Chinese card.
//
// That is exactly what happened to `converged`: 12 of the 66 campaigns on
// 2026-11-11 rendered as the bare word "converged", because `STATE_ZH` listed
// seven statuses and `src/runtime/runtime.js` allows eight. A missing key is
// silent by design (unknown values pass through verbatim), so nothing failed --
// the vocabulary just had a hole.
//
// Rule: every status in the host's authoritative list has a Chinese label, and
// an unmapped value still passes through rather than vanishing.
import assert from 'node:assert/strict'
import { STATUSES } from '../src/runtime/runtime.js'
import { loadPanel } from './ui/harness.mjs'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

const { STATE_ZH, statusLabel, QUALITY_ZH, KIND_ZH, CP_ZH, NODE_ZH } = await loadPanel()

// 1. The hole that started this file.
{
  // A superset is fine -- `failed` and `error` are defensive labels for rows the
  // panel still has to render -- but every status the host can actually write
  // must be in it. A missing one is the bug.
  for (const status of STATUSES) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(STATE_ZH, status),
      `STATE_ZH is missing the host status "${status}"`,
    )
  }
  ok('every host status has a label')
}

// 2. Translated, not echoed. This is the assertion that would have failed.
{
  assert.equal(statusLabel('converged'), '已收敛', 'converged is translated')
  assert.equal(statusLabel('running'), '运行中')
  for (const status of STATUSES) {
    const label = statusLabel(status)
    assert.ok(label.length > 0, `${status} has a non-empty label`)
    assert.notEqual(label, status, `${status} is translated, not passed through`)
    assert.ok(/[\u4e00-\u9fa5]/.test(label), `${status} reads as Chinese: ${label}`)
  }
  ok('no status falls back to its English value')
}

// 3. An unknown value still shows through: a future status must not blank the
//    card, and the reader should see what the host actually said.
{
  assert.equal(statusLabel('teleported'), 'teleported')
  assert.equal(statusLabel(undefined), '')
  assert.equal(statusLabel(null), '')
  ok('an unknown status passes through instead of blanking')
}

// 4. The neighbouring vocabularies have the same silent-hole risk, so pin the
//    values their producers actually emit.
{
  assert.deepEqual(Object.keys(QUALITY_ZH).sort(), ['healthy', 'regressing', 'stalled'])
  assert.deepEqual(Object.keys(KIND_ZH).sort(), ['fact', 'hazard', 'recipe'])
  assert.deepEqual(Object.keys(NODE_ZH).sort(), ['agent', 'collect', 'human', 'judge', 'map', 'verifier'])
  for (const [kind, label] of Object.entries(CP_ZH)) {
    assert.ok(/[\u4e00-\u9fa5]/.test(label), `checkpoint kind ${kind} reads as Chinese: ${label}`)
  }
  ok('the other vocabularies still translate their producer values')
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
