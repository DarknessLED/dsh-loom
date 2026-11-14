// Wave 20 / p4: the file a dead round leaves behind.
//
// When the guard fails, autopilot reverts the patch with `git checkout` -- which
// restores tracked files and knows nothing about files the patch *created*.
// `src/loop/migrate.js` survived a rollback that way and turned every later
// round's apply into `workspace-dirty`, i.e. one failed round permanently
// poisoned the repo.
//
// The fix deletes exactly the files the patch created, and nothing else.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createdByPatch, sweepCreated } from '../../src/exec/rollback.js'

const patch = [
  'diff --git a/src/loop/migrate.js b/src/loop/migrate.js',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/src/loop/migrate.js',
  '@@ -0,0 +1 @@',
  '+export const x = 1',
  'diff --git a/docs/contracts.md b/docs/contracts.md',
  '--- a/docs/contracts.md',
  '+++ b/docs/contracts.md',
  '@@ -1 +1,2 @@',
  ' existing',
  '+another line',
].join('\n')

function scratch(files) {
  const root = mkdtempSync(join(tmpdir(), 'loom-rb-'))
  for (const f of files) {
    const p = join(root, f)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'x')
  }
  return root
}

test('only the files the patch created are named', () => {
  assert.deepEqual(createdByPatch(patch), ['src/loop/migrate.js'])
})

test('the sweep removes what the patch created and keeps everything else', () => {
  const root = scratch(['src/loop/migrate.js', 'docs/contracts.md', 'notes/local.txt'])
  const removed = sweepCreated(root, patch)
  assert.deepEqual(removed, ['src/loop/migrate.js'])
  assert.equal(existsSync(join(root, 'src/loop/migrate.js')), false)
  assert.equal(existsSync(join(root, 'docs/contracts.md')), true, 'a modified file belongs to git checkout')
  assert.equal(existsSync(join(root, 'notes/local.txt')), true, 'an unrelated untracked file is not ours to delete')
})

test('a file that is not there is not an error', () => {
  const root = scratch([])
  assert.deepEqual(sweepCreated(root, patch), [])
})

test('nothing created means nothing removed', () => {
  const modifyOnly = ['diff --git a/x.txt b/x.txt', '--- a/x.txt', '+++ b/x.txt', '@@ -1 +1 @@', '-a', '+b'].join('\n')
  assert.deepEqual(createdByPatch(modifyOnly), [])
})
