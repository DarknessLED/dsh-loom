// Prove a spec can be passed before a campaign spends rounds proving it.
//
// A spec that no patch can satisfy is indistinguishable from a hard task: the
// loop keeps producing patches, the verifier keeps failing, and the budget goes.
// Twice now the unreachable thing was my own test harness (a `done(n,'msg')` call
// that did not exist, a literal "\n" that survived no quoting layer), and both
// times the loop was blamed first. This script answers the question directly:
//
//   node scripts/spec-reachability.mjs --spec tests/tri11/holdout-rotation.test.mjs \
//        --patch ~/.dsh/loom/campaigns/<id>/artifacts/r3a1.patch
//
// It copies HEAD into a scratch directory, runs the spec there (it must FAIL, or
// it is not a spec), applies the patch and runs it again (it must PASS), and
// exits non-zero unless both hold. Nothing in the working tree is touched.
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(join(here, '..'))

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const specArg = arg('spec')
const patchArg = arg('patch')
if (!specArg) {
  console.error('usage: node scripts/spec-reachability.mjs --spec <test.mjs> [--patch <file.patch>]')
  process.exit(2)
}
const spec = resolve(root, specArg)
if (!existsSync(spec)) {
  console.error(`no such spec: ${spec}`)
  process.exit(2)
}
const patch = patchArg ? resolve(patchArg.replace(/^~/, process.env.USERPROFILE || '~')) : null
if (patch && !existsSync(patch)) {
  console.error(`no such patch: ${patch}`)
  process.exit(2)
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const scratch = mkdtempSync(join(tmpdir(), 'loom-reach-'))
const run = () => {
  const res = spawnSync(process.execPath, [join(scratch, relative(root, spec))], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 300000,
  })
  return { ok: res.status === 0, out: `${res.stdout || ''}${res.stderr || ''}` }
}

let failed = false
try {
  console.log(`copying HEAD into ${scratch}`)
  git(scratch, 'clone', '-q', root, '.')
  // A spec is written before it passes, so the working tree usually holds a newer
  // copy than HEAD does - and it may pull in a harness beside it. Copy tests/ over.
  cpSync(join(root, 'tests'), join(scratch, 'tests'), { recursive: true })
  const copied = run()
  if (copied.ok) {
    console.log('FAIL the spec already passes on HEAD - it asserts nothing new')
    failed = true
  } else {
    console.log('ok   the spec fails on HEAD (that is what makes it a spec)')
  }

  if (patch && !failed) {
    try {
      git(scratch, 'apply', patch)
    } catch (err) {
      console.log(`FAIL the patch does not apply: ${String(err?.stderr || err?.message || err).trim()}`)
      failed = true
    }
    if (!failed) {
      const withPatch = run()
      if (withPatch.ok) {
        console.log('ok   the spec passes with the patch (it is reachable)')
      } else {
        const tail = withPatch.out.trim().split(/\r?\n/).slice(-6).join('\n  ')
        console.log(`FAIL the spec still fails with the patch:\n  ${tail}`)
        failed = true
      }
    }
  } else if (!patch) {
    console.log('note no --patch given, so reachability was not proven')
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

process.exit(failed ? 1 : 0)
