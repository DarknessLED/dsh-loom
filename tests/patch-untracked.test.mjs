// Regression: a task whose deliverable is a NEW file used to score 1 in its
// worktree and then promote a patch that did not contain the file, because
// `git diff HEAD` ignores untracked paths. makePatch now runs `git add -A -N`
// first so new files appear as additions.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { makePatch, applyPatch } from '../src/exec/patch.js'

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

const root = mkdtempSync(join(tmpdir(), 'loom-patch-'))
const work = join(root, 'work')
const target = join(root, 'target')
mkdirSync(work, { recursive: true })
mkdirSync(target, { recursive: true })

for (const dir of [work, target]) {
  git(dir, 'init')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  writeFileSync(join(dir, 'tracked.txt'), 'base\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-m', 'base')
}

// The attempt edits a tracked file AND adds a brand new module.
writeFileSync(join(work, 'tracked.txt'), 'base\nmore\n')
mkdirSync(join(work, 'src', 'runtime'), { recursive: true })
writeFileSync(join(work, 'src', 'runtime', 'plateau.js'), 'export const x = 1\n')

const patchFile = join(root, 'out.patch')
const made = await makePatch({ dir: work, outFile: patchFile })
const text = readFileSync(patchFile, 'utf8')

ok('patch is not empty', made.empty === false, String(made.bytes))
ok('patch mentions the new file', text.includes('src/runtime/plateau.js'), text.slice(0, 200))
ok('patch marks the new file as a creation', text.includes('new file mode'), text.slice(0, 400))

const applied = await applyPatch({ repo: target, patchFile })
ok('patch applies to a clean tree', applied.ok === true, JSON.stringify(applied))
ok('new file exists after apply', existsSync(join(target, 'src', 'runtime', 'plateau.js')))
// This machine checks out with autocrlf, so compare after normalising newlines.
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
ok('new file content matches', read(join(target, 'src', 'runtime', 'plateau.js')) === 'export const x = 1\n')
ok('tracked edit applied', read(join(target, 'tracked.txt')) === 'base\nmore\n')

// An agent may `git commit` inside its own worktree; the patch must still be
// taken against the commit the worktree started from, not against HEAD.
const base = git(work, 'rev-parse', 'HEAD').trim()
writeFileSync(join(work, 'tracked.txt'), 'base\nmore\ncommitted\n')
git(work, 'add', '-A')
git(work, 'commit', '-m', 'agent commit')
const committedPatch = join(root, 'committed.patch')
const madeCommitted = await makePatch({ dir: work, outFile: committedPatch, base })
const committedText = readFileSync(committedPatch, 'utf8')
ok('patch vs base sees a committed change', madeCommitted.empty === false, String(madeCommitted.bytes))
ok('committed patch carries the edit', committedText.includes('committed'), committedText.slice(0, 200))

const headPatch = join(root, 'head.patch')
const madeHead = await makePatch({ dir: work, outFile: headPatch, base: 'HEAD' })
ok('patch vs HEAD is empty once the agent committed', madeHead.empty === true, String(madeHead.bytes))

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
