#!/usr/bin/env node
// Chain the remaining direction surveys in one process so a single background
// job covers them: eight separate `node scripts/research-survey.mjs` invocations
// would each pay the arXiv warm-up and would be easy to leave half-finished.
//
// Usage: node scripts/research-batch.mjs r2-score-noise r3-budget-stop ...
//        [--pages 1] [--trace 50] [--keep 160]

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const node = process.execPath
const argv = process.argv.slice(2)
const flags = []
const slugs = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--pages' || argv[i] === '--trace' || argv[i] === '--keep') {
    flags.push(argv[i], argv[++i])
  } else if (!argv[i].startsWith('--')) {
    slugs.push(argv[i])
  }
}

const files = readdirSync('directions').filter((f) => f.endsWith('.json'))
const wanted = slugs.length ? slugs : files.map((f) => f.replace(/\.json$/, ''))

for (const slug of wanted) {
  const file = join('directions', `${slug}.json`)
  console.log(`\n=== ${slug} ===`)
  const started = Date.now()
  const result = spawnSync(node, ['scripts/research-survey.mjs', file, '--out', 'research/out', ...flags], {
    stdio: 'inherit',
  })
  const minutes = ((Date.now() - started) / 60000).toFixed(1)
  console.log(`=== ${slug}: exit ${result.status} in ${minutes} min ===`)
  if (result.status !== 0) console.log(`    (continuing; a failed direction is recorded, not fatal)`)
}
