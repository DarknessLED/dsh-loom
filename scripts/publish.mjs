#!/usr/bin/env node
// Publish the prepared release. Everything that does not need credentials is
// already done (version, changelog, tag, tarball, green suites); this script
// only does the three things that do:
//
//   1. push main
//   2. push the tag
//   3. create the GitHub release and attach the tarball
//
// Usage:
//   GITHUB_TOKEN=ghp_... node scripts/publish.mjs
//
// Without a token it prints exactly what is missing and exits 2 — it never
// pretends to have published anything.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const OWNER = 'DarknessLED'
const REPO = 'dsh-loom'
const VERSION = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) || {}).version
const TAG = `v${VERSION}`
const NOTES = new URL(`../RELEASE-${VERSION}.md`, import.meta.url)
const TARBALL = new URL(`../dist/dsh-loom-${VERSION}.tgz`, import.meta.url)

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
if (!token) {
  console.error(`no GITHUB_TOKEN in the environment — nothing was pushed.`)
  console.error(`create a fine-grained token with "Contents: read and write" on ${OWNER}/${REPO}, then:`)
  console.error(`  GITHUB_TOKEN=ghp_... node scripts/publish.mjs`)
  process.exit(2)
}
if (!existsSync(NOTES)) {
  console.error(`missing ${NOTES.pathname} — run the release staging first`)
  process.exit(2)
}

const run = (args) =>
  execFileSync('git', ['-c', 'http.version=HTTP/1.1', ...args], { stdio: 'pipe', encoding: 'utf8' })
// The proxy in front of this machine eats git's HTTP/2 upgrade and then hangs
// with no output at all — forcing HTTP/1.1 is the difference between a push
// that returns in a second and one that never returns. The token is passed in
// the URL rather than left to a credential helper that may hold a stale one.
const authed = `https://x-access-token:${token}@github.com/${OWNER}/${REPO}.git`
const api = (path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'dsh-loom-release',
      ...(init.headers || {}),
    },
  })

const body = readFileSync(NOTES, 'utf8')

// 1. main
run(['push', authed, 'main'])
console.log(`ok pushed main`)

// 2. tag
try {
  run(['rev-parse', '--verify', TAG])
} catch {
  run(['tag', '-a', TAG, '-m', `dsh-loom ${VERSION}`])
}
run(['push', authed, TAG])
console.log(`ok pushed ${TAG}`)

// 3. release (create or update)
let release = null
const existing = await api(`/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
if (existing.status === 200) {
  release = await existing.json()
  const patched = await api(`/repos/${OWNER}/${REPO}/releases/${release.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: TAG, body, draft: false, prerelease: false }),
  })
  release = await patched.json()
  console.log(`ok updated release ${TAG}`)
} else {
  const created = await api(`/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: TAG, name: TAG, body, draft: false, prerelease: false }),
  })
  release = await created.json()
  if (!release.id) {
    console.error(`could not create the release: ${JSON.stringify(release).slice(0, 300)}`)
    process.exit(1)
  }
  console.log(`ok created release ${TAG}`)
}

// 4. asset
if (existsSync(TARBALL)) {
  const name = `dsh-loom-${VERSION}.tgz`
  const bytes = readFileSync(TARBALL)
  const upload = await fetch(
    `https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=${name}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/gzip',
        'content-length': String(bytes.length),
        'user-agent': 'dsh-loom-release',
      },
      body: bytes,
    },
  )
  if (!upload.ok) {
    console.error(`asset upload failed (${upload.status}): ${(await upload.text()).slice(0, 200)}`)
    process.exit(1)
  }
  console.log(`ok attached ${name} (${bytes.length} bytes)`)
} else {
  console.warn(`no tarball at ${TARBALL.pathname} — release created without the asset`)
}

console.log(`\ndone: https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`)
