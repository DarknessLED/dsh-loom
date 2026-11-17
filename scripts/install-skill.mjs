// Put the protocol where every session can find it, instead of wherever this
// repo happens to be cloned. The skill body lives in `skill/SKILL.md` (shipped
// with the plugin); this copies it to the user skill root with the canonical
// doc path made absolute, so a session in another project still lands on the
// right file.
//
//   node scripts/install-skill.mjs [--home <dshHome>] [--check]
//
// --check exits 1 when the installed copy has drifted from the repo, which is
// how a stale protocol becomes visible instead of quietly wrong.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = resolve(here, '..')

export function sourcePath() {
  return join(repoRoot, 'skill', 'SKILL.md')
}

export function targetPath(dshHome = join(homedir(), '.dsh')) {
  return join(dshHome, 'skills', 'rsi-experiment', 'SKILL.md')
}

/** The body, with the repo-relative doc reference made absolute. */
export function rendered() {
  const body = readFileSync(sourcePath(), 'utf8')
  const doc = join(repoRoot, 'docs', 'rsi-experiment-protocol.md').replace(/\\/g, '/')
  const rewriter = join(repoRoot, 'scripts', 'live-report.mjs').replace(/\\/g, '/')
  return body
    .replaceAll('`C:/Projects/RSI/docs/rsi-experiment-protocol.md`', `\`${doc}\``)
    .replaceAll('node C:/Projects/RSI/scripts/live-report.mjs', `node ${rewriter}`)
}

export function install({ dshHome, check = false } = {}) {
  const target = targetPath(dshHome)
  const next = rendered()
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null
  if (current === next) return { target, changed: false, check: true }
  if (check) return { target, changed: true, check: false }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, next)
  return { target, changed: true, check: true }
}

function main(argv) {
  const args = argv.slice(2)
  const homeFlag = args.indexOf('--home')
  const dshHome = homeFlag >= 0 ? args[homeFlag + 1] : undefined
  const check = args.includes('--check')
  const result = install({ dshHome, check })
  if (check && result.changed) {
    console.error(`skill is stale: ${result.target}\nrun: node scripts/install-skill.mjs`)
    process.exit(1)
  }
  if (check) console.log(`ok - ${result.target} matches skill/SKILL.md`)
  else console.log(`${result.changed ? 'installed' : 'already current'}: ${result.target}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv)
