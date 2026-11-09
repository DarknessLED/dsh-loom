#!/usr/bin/env node
// Build dist/dsh-loom-<version>.tgz with the same layout the 0.2.0 tarball has:
// everything a reader of the repo needs (src, client, scripts, tests, docs,
// changelog, release notes) under a `package/` prefix, without .git,
// node_modules, dist or research.
//
// Windows ships bsdtar, which has no `--transform`, so this stages the tree as
// `package/<entry>` in a temp directory and archives that. Slower than a
// one-liner and impossible to get subtly wrong.
//
// Usage: node scripts/build-tgz.mjs

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const out = join(ROOT, 'dist', `dsh-loom-${version}.tgz`)

const ENTRIES = [
  'src',
  'client',
  'scripts',
  'tests',
  'docs',
  'cordis.patch.yml',
  'package.json',
  '.gitignore',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  `RELEASE-${version}.md`,
]

for (const entry of ENTRIES) {
  if (!existsSync(join(ROOT, entry))) {
    console.error(`missing ${entry} — refusing to build a tarball without it`)
    process.exit(1)
  }
}

mkdirSync(join(ROOT, 'dist'), { recursive: true })
rmSync(out, { force: true })

const stage = mkdtempSync(join(tmpdir(), 'loom-tgz-'))
const pkg = join(stage, 'package')
mkdirSync(pkg)
for (const entry of ENTRIES) {
  cpSync(join(ROOT, entry), join(pkg, entry), {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|\.git|dist|research)([\\/]|$)/.test(src),
  })
}

execFileSync('tar', ['-czf', out, '-C', stage, 'package'], { stdio: 'pipe' })

const listing = execFileSync('tar', ['-tzf', out], { encoding: 'utf8' }).split('\n').filter(Boolean)
const bad = listing.filter((p) => /^package\/(node_modules|\.git|dist|research)\//.test(p))
if (bad.length) {
  console.error(`refusing to ship ${bad.length} build artefact(s), e.g. ${bad[0]}`)
  process.exit(1)
}
rmSync(stage, { recursive: true, force: true })

writeFileSync(join(ROOT, 'dist', '.gitignore'), '*\n', 'utf8')
console.log(`wrote ${out} (${listing.length} entries)`)
