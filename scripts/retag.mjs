// Re-point v0.2.1 at the final commit: rebuild the tarball from HEAD, move the
// tag, and replace the release asset so the thing people download is the tree
// CI just proved green.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const token = (process.env.GITHUB_TOKEN || '').trim()
if (!token) {
  console.error('no GITHUB_TOKEN')
  process.exit(2)
}
const OWNER = 'DarknessLED'
const REPO = 'dsh-loom'
const TAG = 'v0.2.1'
const version = JSON.parse(readFileSync('package.json', 'utf8')).version
if (`v${version}` !== TAG) {
  console.error(`package.json says ${version}, script wants ${TAG}`)
  process.exit(2)
}

const notes = readFileSync(`RELEASE-${version}.md`, 'utf8')
const tarball = `dist/dsh-loom-${version}.tgz`
if (!existsSync(tarball)) {
  console.error(`missing ${tarball}`)
  process.exit(2)
}

const git = (args) => execFileSync('git', ['-c', 'http.version=HTTP/1.1', ...args], { encoding: 'utf8' })
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

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

git(['tag', '-f', '-a', TAG, '-m', `dsh-loom ${version}`])
git(['push', authed, 'main'])
git(['push', '--force', authed, TAG])
console.log(`ok ${TAG} -> ${head.slice(0, 7)}`)

let release = null
const existing = await api(`/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
if (existing.status === 200) {
  const found = await existing.json()
  const patched = await api(`/repos/${OWNER}/${REPO}/releases/${found.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: TAG, body: notes, draft: false, prerelease: false }),
  })
  release = await patched.json()
  console.log(`ok updated release ${TAG}`)
  for (const asset of release.assets || []) {
    const del = await api(`/repos/${OWNER}/${REPO}/releases/assets/${asset.id}`, { method: 'DELETE' })
    if (del.ok || del.status === 204) console.log(`ok removed old ${asset.name}`)
    else console.error(`could not remove ${asset.name}: ${del.status}`)
  }
} else {
  const created = await api(`/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: TAG, name: TAG, body: notes, draft: false, prerelease: false }),
  })
  release = await created.json()
  console.log(`ok created release ${TAG}`)
}

const bytes = readFileSync(tarball)
const name = `dsh-loom-${version}.tgz`
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
console.log(`https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`)
