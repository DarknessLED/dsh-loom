// The comparison is a report: two plans, side by side, and the sentence that says
// where they disagree. It must never turn a missing change into "no roles" and
// must never dispatch anything.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { compareChange, renderComparison } from '../../scripts/ssf-plan-compare.mjs'

function change(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ssf-compare-'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  return dir
}

test('a change with open steps narrows the plan and the report says what the table would have added', () => {
  const dir = change({
    '.spec-superflow.yaml': 'state: executing\nchange_name: add-parser\n',
    'tasks.md': '- [x] **1.1 Write it**\n- [ ] **2.1 Verify it**\n- [ ] **2.2 Review it**\n',
  })
  const result = compareChange({ dir })
  assert.equal(result.available, true)
  assert.equal(result.phase, 'executing')
  assert.equal(result.change, 'add-parser')
  assert.deepEqual(result.dynamicRoles, ['verify', 'review'])
  assert.equal(result.open, 2)
  assert.deepEqual(result.onlyMeasured, ['triage', 'spec', 'implement'])
  assert.equal(result.same, false)

  const text = renderComparison(result)
  assert.match(text, /measured table: triage → spec → implement → verify → review/)
  assert.match(text, /this change:\s+verify → review/)
  assert.match(text, /does not ask for/)
  assert.match(text, /\[x\] 1\.1 implement/)
})

test('a directory that is not a change reports that, instead of inventing an empty plan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ssf-compare-none-'))
  const result = compareChange({ dir })
  assert.equal(result.available, false)
  assert.match(result.reason, /no \.spec-superflow\.yaml/)
  assert.deepEqual(result.dynamicRoles, [])
  assert.match(renderComparison(result), /change: \(none\)/)
})

test('identical plans are reported as identical, not as a tie to break', () => {
  const dir = change({
    '.spec-superflow.yaml': 'state: executing\n',
    'tasks.md': '- [ ] **1.1 Write it**\n- [ ] **2.1 Verify it**\n- [ ] **3.1 Review it**\n- [ ] **4.1 Investigate the timeout**\n- [ ] **5.1 Draft the spec**\n',
  })
  const result = compareChange({ dir })
  assert.deepEqual(result.dynamicRoles, ['implement', 'verify', 'review', 'triage', 'spec'])
  assert.equal(result.same, true)
  assert.match(renderComparison(result), /both plans name the same 5 role/)
})
