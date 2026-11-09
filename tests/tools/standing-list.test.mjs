// The regression runner is a guard, so its own accounting has to be honest: a
// spec listed twice runs twice and is counted twice, which inflates the headline
// total and makes a suite look like two suites. The standing list is built by
// appending, so duplicates crept in three times already. Pin the dedupe rule.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const source = readFileSync(join(root, 'scripts', 'test-all.mjs'), 'utf8')

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. The runner must not push a standing entry it already queued.
assert.match(
  source,
  /const seen = new Set\(files\)/,
  'the runner tracks which files it already queued',
)
assert.match(
  source,
  /if \(seen\.has\(abs\)\) continue/,
  'and skips a standing entry that is already queued',
)
ok('the runner queues each spec once')

// 2. No duplicate entries may be left in the standing list itself: a reader of
//    the list should see the set of pins, not a history of edits.
const start = source.indexOf('const standing = [')
const end = source.indexOf(']', start)
const listing = source.slice(start, end)
const names = [...listing.matchAll(/'(tests\/[^']+)'/g)].map((m) => m[1])
const counts = new Map()
for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
const duplicates = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n)
assert.deepEqual(duplicates, [], `the standing list names each pin once, got ${duplicates.join(', ')}`)
ok('the standing list has no duplicate pins')

// 3. The list must not be formatted as one line per handful of pins: a single
//    line holding several entries is what let duplicates hide from review.
const longLines = listing
  .split(/\r?\n/)
  .filter((line) => (line.match(/'(tests\/[^']+)'/g) ?? []).length > 1)
assert.deepEqual(longLines, [], `one pin per line, got ${longLines.length} packed line(s)`)
ok('each pin sits on its own line')

console.log(`\n${pass}/${pass} passed`)
