// Regression: `commitWorkspace` used to stage the whole tree with `git add -A`.
// That makes the loop's commit a function of everything else lying around — an
// interrupted mutation run left a one-token mutant in `src/runtime/cost.js` for a
// night, and one autopilot commit would have landed it as if it were the
// promotion. A promotion now commits exactly the paths its patch touched.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { commitWorkspace } from '../src/exec/worktree.js'

let passed = 0
let failed = 0

function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } else {
    failed++
    console.log(`not ok ${passed + failed} - ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true })
const status = (cwd) => git(cwd, 'status', '--porcelain')
const filesInHead = (cwd) => git(cwd, 'show', '--name-only', '--pretty=format:', 'HEAD').trim().split('\n').filter(Boolean)

const root = mkdtempSync(join(tmpdir(), 'loom-commit-'))
git(root, 'init')
git(root, 'config', 'user.email', 'loom@local')
git(root, 'config', 'user.name', 'dsh-loom')
writeFileSync(join(root, 'promoted.txt'), 'base\n')
writeFileSync(join(root, 'reviewer.txt'), 'base\n')
git(root, 'add', '-A')
git(root, 'commit', '-m', 'base')

// The promotion touches promoted.txt; the reviewer has an unrelated edit open and
// a leftover artefact is untracked.
writeFileSync(join(root, 'promoted.txt'), 'base\npromoted\n')
writeFileSync(join(root, 'reviewer.txt'), 'base\nwork in progress\n')
writeFileSync(join(root, 'leftover.txt'), 'a stray file\n')

const scoped = await commitWorkspace(root, 'loom: promote r1a1', { paths: ['promoted.txt'] })
ok('scoped commit reports a commit', scoped.committed === true, JSON.stringify(scoped))
ok('scoped commit lands a sha', typeof scoped.sha === 'string' && scoped.sha.length >= 7, String(scoped.sha))
ok('only the promoted path is in the commit', JSON.stringify(filesInHead(root)) === '["promoted.txt"]', JSON.stringify(filesInHead(root)))
ok('the promotion is in the tree', readFileSync(join(root, 'promoted.txt'), 'utf8').replace(/\r\n/g, '\n') === 'base\npromoted\n')
ok('the reviewer edit stays uncommitted', status(root).includes('reviewer.txt'), status(root))
ok('the stray file stays untracked', status(root).includes('?? leftover.txt'), status(root))
ok('the reviewer edit is not staged', !/^M  reviewer\.txt/m.test(status(root)), status(root))

// A second scoped commit with nothing new must not invent a commit.
const again = await commitWorkspace(root, 'loom: promote r1a1', { paths: ['promoted.txt'] })
ok('nothing to commit for an unchanged path', again.committed === false, JSON.stringify(again))
ok('nothing-to-commit is not a failure', again.ok === true, JSON.stringify(again))
// `clean` is what lets the round tell "nothing changed" apart from "a concurrent
// commit already absorbed the applied patch" — the second loses provenance.
ok('nothing-to-commit reports a clean tree', again.clean === true, JSON.stringify(again))

// Without paths the old whole-tree behaviour is still available, and it is the
// behaviour that makes an unrelated edit part of the loop's commit.
const whole = await commitWorkspace(root, 'loom: promote everything')
ok('unscoped commit still commits the tree', whole.committed === true, JSON.stringify(whole))
ok('unscoped commit takes the reviewer edit', filesInHead(root).includes('reviewer.txt'), JSON.stringify(filesInHead(root)))
ok('unscoped commit takes the untracked file', filesInHead(root).includes('leftover.txt'), JSON.stringify(filesInHead(root)))

// A path that does not exist must fail loudly rather than silently committing
// something else: a promotion whose file list is wrong is a bug upstream.
const missing = await commitWorkspace(root, 'loom: promote ghost', { paths: ['no-such-file.txt'] })
ok('a path that matches nothing fails', missing.ok === false, JSON.stringify(missing))

// Deleted paths are paths too: `git add -A -- <path>` records the deletion.
writeFileSync(join(root, 'promoted.txt'), 'base\npromoted\nmore\n')
git(root, 'add', '-A')
git(root, 'commit', '-m', 'more')
execFileSync('git', ['-C', root, 'rm', '--quiet', 'promoted.txt'], { windowsHide: true })
const deletion = await commitWorkspace(root, 'loom: promote deletion', { paths: ['promoted.txt'] })
ok('a deletion is committed when its path is named', deletion.committed === true, JSON.stringify(deletion))
ok('the file is gone from the tree', !existsSync(join(root, 'promoted.txt')))

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
