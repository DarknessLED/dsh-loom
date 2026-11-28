// A change can say what roles it still needs; the table can only say what was
// fast. Reading the first is how the second stops being the only answer.
//
// The reader must never mistake prose for a step, a ticked step for pending work,
// or a missing state file for an empty plan — each of those turns "I read the
// change" into "I guessed".
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  comparePlans,
  parseStateYaml,
  parseTasks,
  readState,
  roleOfVerb,
  rolesFromTasks,
  runSsf,
  ssfCommand,
  ssfPlan,
} from '../../src/dispatch/ssf.js'

function change(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ssf-plan-'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  return dir
}

test('a verb names a role, and the most specific verb wins', () => {
  assert.equal(roleOfVerb('Write the parser'), 'implement')
  assert.equal(roleOfVerb('Verify the migration writes rows'), 'verify')
  assert.equal(roleOfVerb('Review the diff for leaks'), 'review')
  assert.equal(roleOfVerb('Draft the spec section'), 'spec')
  assert.equal(roleOfVerb('Investigate why the timeout fires'), 'triage')
  assert.equal(roleOfVerb('something else entirely'), null)
})

test('only real checkboxes are steps, and done is done', () => {
  const md = [
    '# Tasks',
    '',
    '- [ ] **1.1 Write the parser**',
    '- [x] **1.2 Verify it rejects bad input**',
    '- [ ] 2.1 Review the error messages',
    '',
    '```md',
    '- [ ] this is an example inside a fence, not a step',
    '```',
    '- [ ] **3.1 Draft the release note**',
  ].join('\n')
  const tasks = parseTasks(md)
  assert.equal(tasks.length, 4)
  assert.deepEqual(tasks.map((t) => t.id), ['1.1', '1.2', '2.1', '3.1'])
  assert.deepEqual(tasks.map((t) => t.done), [false, true, false, false])
  assert.deepEqual(tasks.map((t) => t.role), ['implement', 'verify', 'review', 'spec'])
})

test('the plan keeps only the roles the open steps ask for, in their order', () => {
  const tasks = parseTasks('- [x] **1.1 Write it**\n- [ ] **2.1 Verify it**\n- [ ] **3.1 Review it**\n- [ ] **4.1 Verify the edge case**')
  assert.deepEqual(rolesFromTasks(tasks), ['verify', 'review'], 'a finished step does not re-hire its role')
  assert.deepEqual(rolesFromTasks(tasks, { includeDone: true }), ['implement', 'verify', 'review'])
  assert.deepEqual(rolesFromTasks([]), [])
})

test('the state file is read line by line, and absence is an answer', () => {
  assert.deepEqual(parseStateYaml('phase: executing\nchange: "add-parser"\nslug: x'), { phase: 'executing', change: 'add-parser', slug: 'x' })
  assert.deepEqual(readState(join(tmpdir(), 'no-such-change-at-all')), {
    ok: false,
    reason: 'no .spec-superflow.yaml here',
  })

  const dir = change({ '.spec-superflow.yaml': 'phase: draft\nchange: add-parser\n' })
  const result = ssfPlan({ dir, doctor: false })
  assert.equal(result.available, true)
  assert.equal(result.phase, 'draft')
  assert.equal(result.change, 'add-parser')
  assert.deepEqual(result.roles, [], 'a change with no tasks.md declares no role')
  assert.equal(result.doctor, null, 'the health check is opt in')
})

test('reading a change with tasks gives the roles, and done ones are left out', () => {
  const dir = change({
    '.spec-superflow.yaml': 'phase: executing\nchange: add-parser\n',
    'tasks.md': '- [x] **1.1 Write the parser**\n- [ ] **2.1 Verify it accepts input**\n- [ ] **2.2 Review the diff**\n',
  })
  const result = ssfPlan({ dir, doctor: false })
  assert.deepEqual(result.roles, ['verify', 'review'])
  assert.equal(result.open, 2)
  assert.equal(result.tasks.length, 3)
})

test('a plan that is compared names where the two disagree', () => {
  const same = comparePlans({ measured: ['triage', 'spec', 'implement', 'verify', 'review'], dynamic: ['triage', 'spec', 'implement', 'verify', 'review'] })
  assert.equal(same.same, true)
  assert.match(same.sentence, /same 5 role/)

  const differ = comparePlans({ measured: ['triage', 'spec', 'implement', 'verify', 'review'], dynamic: ['verify', 'review'], phase: 'executing' })
  assert.equal(differ.same, false)
  assert.deepEqual(differ.onlyMeasured, ['triage', 'spec', 'implement'])
  assert.deepEqual(differ.onlyDynamic, [])
  assert.match(differ.sentence, /does not ask for/)
  assert.match(differ.sentence, /executing/)

  const hole = comparePlans({ measured: ['implement', 'verify'], dynamic: ['implement', 'verify', 'review'] })
  assert.deepEqual(hole.onlyDynamic, ['review'])
  assert.match(hole.sentence, /has not measured/)

  const silent = comparePlans({ measured: ['implement'], dynamic: [] })
  assert.match(silent.sentence, /declares no role/)
})

test('a non-zero exit is reported, not thrown', () => {
  const fake = () => ({ status: 2, stdout: '', stderr: 'no such command\n' })
  const result = runSsf(['nope'], { cwd: tmpdir(), node: 'node', script: 'x.mjs', spawnSync: fake })
  assert.equal(result.ok, false)
  assert.equal(result.code, 2)
  assert.match(result.reason, /no such command/)

  const withError = runSsf(['x'], { cwd: tmpdir(), script: 'x.mjs', spawnSync: () => ({ error: new Error('ENOENT') }) })
  assert.equal(withError.ok, false)
  assert.match(withError.reason, /ENOENT/)

  const noRoot = runSsf(['doctor'], { cwd: tmpdir() })
  assert.equal(noRoot.ok, false)
  assert.match(noRoot.reason, /LOOM_SSF_ROOT/)
})

test('the command knows where ssf lives and whether this install has it', () => {
  const found = ssfCommand({ root: 'C:/somewhere/spec-superflow', exists: () => true })
  assert.match(found.script.replace(/\\/g, '/'), /somewhere\/spec-superflow\/scripts\/spec-superflow\.mjs$/)
  assert.equal(found.exists, true)
  assert.equal(ssfCommand({ root: 'C:/nope', exists: () => false }).exists, false)
})

test('a directory with a state file but no tasks file still reports its phase', () => {
  const dir = change({ '.spec-superflow.yaml': 'phase: closing\n' })
  const result = ssfPlan({ dir, doctor: false })
  assert.equal(result.phase, 'closing')
  assert.equal(result.tasksFile, null)
  assert.deepEqual(result.roles, [])
})
