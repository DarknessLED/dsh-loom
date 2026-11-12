// `kg gaps` used to sort by confidence, which on a question means what the asker
// thought when it wrote the question down -- and the wave builders write a flat 0.9
// for every generated gap, so the modal band was ordered by id. Two facts have to
// hold and neither is checked by "it prints something":
//   1. the order is dependence, not confidence, and a question something points at
//      comes before one nothing points at regardless of confidence;
//   2. the footer describes the rows actually printed -- a note that says "163 of the
//      above share 0.9" under a list of 28 is a false statement about the list.
// Plus the flag that makes the queue usable: --load-bearing drops the 283 notes.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const KG = resolve('research/kg/kg.mjs')
const dir = mkdtempSync(join(tmpdir(), 'kg-gap-order-'))
const env = { ...process.env, LOOM_KG: join(dir, 'g.sqlite') }
let pass = 0
const EXPECTED = 11
const ok = (cond, name, detail) => {
  if (cond) { pass += 1; console.log(`  ok   ${name}`) }
  else { console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); process.exitCode = 1 }
}
const run = (args) => execFileSync(process.execPath, [KG, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const file = (name, obj) => {
  const f = join(dir, name)
  writeFileSync(f, JSON.stringify(obj))
  return f
}
const lines = (text) => text.split('\n').filter((l) => /^\S+\s+conf /.test(l))
const ids = (text) => lines(text).map((l) => l.split(/\s+/)[0])

run(['init'])
run([
  'add',
  file('seed.json', {
    nodes: [
      // A pile: eight questions, all claiming 0.9, ids in the order a builder would
      // write them (which is exactly the order the old code produced).
      { id: 'q-01', kind: 'question', title: 'a pile member one', confidence: 0.9, topic: 'gap' },
      { id: 'q-02', kind: 'question', title: 'a pile member two', confidence: 0.9, topic: 'gap' },
      { id: 'q-03', kind: 'question', title: 'a pile member three', confidence: 0.9, topic: 'gap' },
      { id: 'q-04', kind: 'question', title: 'a pile member four', confidence: 0.9, topic: 'gap' },
      { id: 'q-05', kind: 'question', title: 'a pile member five', confidence: 0.9, topic: 'gap' },
      // One question a number depends on, with low confidence: it must sort first.
      { id: 'q-load', kind: 'question', title: 'what is the real throughput', confidence: 0.4, topic: 'gap' },
      // One question two weights depend on: an analysis and a number beat two claims.
      { id: 'q-heavy', kind: 'question', title: 'is the oracle independent', confidence: 0.5, topic: 'gap' },
      { id: 'n-1', kind: 'number', title: 'throughput is 0.4 rounds per minute', confidence: 0.9 },
      { id: 'a-1', kind: 'analysis', title: 'the oracle cannot be both cheap and independent', confidence: 0.9 },
      { id: 'n-2', kind: 'number', title: 'the oracle costs 3 seconds', confidence: 0.9 },
      { id: 'c-1', kind: 'claim', title: 'claims resting on the pile', confidence: 0.9 },
      { id: 'c-2', kind: 'claim', title: 'another claim', confidence: 0.9 },
      // Answered: must leave the default list.
      { id: 'q-done', kind: 'question', title: 'already closed', confidence: 0.9, topic: 'gap' },
      { id: 'n-3', kind: 'number', title: 'the answer', confidence: 0.9 },
    ],
    edges: [
      { from: 'n-1', rel: 'requires', to: 'q-load' },
      { from: 'a-1', rel: 'applies-to', to: 'q-heavy' },
      { from: 'n-2', rel: 'requires', to: 'q-heavy' },
      { from: 'c-1', rel: 'requires', to: 'q-01' },
      { from: 'c-2', rel: 'requires', to: 'q-02' },
      { from: 'n-3', rel: 'measures', to: 'q-done' },
    ],
  }),
])
run(['answer', 'q-done', 'n-3', '--note', 'measured'])

const plain = run(['gaps'])
const order = ids(plain)
ok(!order.includes('q-done'), 'an answered question is not in the default list')
ok(order[0] === 'q-heavy', 'the question with the heaviest dependents sorts first', order[0])
ok(order[1] === 'q-load', 'a low-confidence question with one number depending on it outranks every 0.9 pile member', order[1])
ok(order.indexOf('q-01') > order.indexOf('q-load'), 'a 0.9 question nothing depends on sorts below a 0.4 question something depends on')
ok(order.indexOf('q-01') < order.indexOf('q-03'), 'within the zero-dependence pile the order still falls back to id')

const heavy = lines(plain).find((l) => l.startsWith('q-heavy'))
ok(/←2 deps/.test(heavy), 'the printed row shows how many nodes depend on it', heavy)
const load = lines(plain).find((l) => l.startsWith('q-load'))
ok(/←1 dep\b/.test(load), 'a single dependent is singular and still printed', load)

const loadOnly = run(['gaps', '--load-bearing'])
const loadIds = ids(loadOnly)
// q-01 and q-02 are pile members, but claims point at them, so they are load-bearing
// too -- the filter is about who depends on a question, not about its confidence.
ok(loadIds.length === 4 && loadIds.every((i) => ['q-heavy', 'q-load', 'q-01', 'q-02'].includes(i)), '--load-bearing keeps every question something points at', loadIds.join(','))
ok(!loadIds.includes('q-03') && !loadIds.includes('q-04'), '--load-bearing drops the questions nothing points at')

// The footer must describe the rows it follows.
const footer = plain.trim().split('\n').slice(-2).join(' ')
ok(/7 open question\(s\) of 8 asked/.test(footer), 'the footer counts what was printed', footer)
ok(!/of these share|of the 7 above share/.test(footer) || /of the \d+ above share/.test(footer), 'any note about the modal confidence names its own denominator')

rmSync(dir, { recursive: true, force: true })

console.log(`\n${pass}/${EXPECTED} passed`)
if (pass !== EXPECTED) process.exit(1)
