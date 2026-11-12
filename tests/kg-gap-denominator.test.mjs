// `kg gaps` prints a modal-confidence note. Twice now that note has been a false
// statement about its own list: first "170 of these share 0.9" under 28 rows (the
// whole-pile count under a filtered list), then "160 of the 181 above" under 311
// rows (the count of rows that declare a confidence, presented as if it were the
// count of rows). A note whose denominator is invisible is how a report lies without
// printing a wrong number.
//
// This pins the shape: when some rows declare a confidence and some do not, the note
// names both counts; when every row declares one, it claims only the row count.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const KG = resolve('research/kg/kg.mjs')
let pass = 0
const EXPECTED = 4
const ok = (cond, name, detail) => {
  if (cond) { pass += 1; console.log(`  ok   ${name}`) }
  else { console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); process.exitCode = 1 }
}

const make = (nodes) => {
  const dir = mkdtempSync(join(tmpdir(), 'kg-gap-den-'))
  const env = { ...process.env, LOOM_KG: join(dir, 'g.sqlite') }
  const run = (args) => execFileSync(process.execPath, [KG, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  run(['init'])
  const f = join(dir, 'seed.json')
  writeFileSync(f, JSON.stringify({ nodes, edges: [] }))
  run(['add', f])
  const out = run(['gaps'])
  rmSync(dir, { recursive: true, force: true })
  return out
}

// Mixed: five questions share 0.9, two declare nothing. The pile is still the mode
// among the rows that declare a value, so the note must fire -- and must say that it
// is talking about seven of nine rows.
const mixed = make([
  ...Array.from({ length: 5 }, (_, i) => ({ id: `q-${i}`, kind: 'question', title: `pile ${i}`, confidence: 0.9, topic: 'gap' })),
  { id: 'q-noa', kind: 'question', title: 'no confidence A', topic: 'gap' },
  { id: 'q-nob', kind: 'question', title: 'no confidence B', topic: 'gap' },
  { id: 'q-low', kind: 'question', title: 'a low one', confidence: 0.2, topic: 'gap' },
  { id: 'q-mid', kind: 'question', title: 'a middle one', confidence: 0.5, topic: 'gap' },
])
const mixedNote = mixed.split('\n').find((l) => l.startsWith('confidence is not the order')) ?? ''
ok(/of 9 rows/.test(mixedNote), 'a mixed list names the row count alongside the declaring count', mixedNote)
ok(/of the 7 above that declare one/.test(mixedNote), 'and names which subset it is talking about', mixedNote)

// Uniform: every question declares 0.9, so the note should simply say "the 6 above"
// and not imply a distinction that does not exist.
const uniform = make(Array.from({ length: 6 }, (_, i) => ({ id: `u-${i}`, kind: 'question', title: `same ${i}`, confidence: 0.9, topic: 'gap' })))
const uniformNote = uniform.split('\n').find((l) => l.startsWith('confidence is not the order')) ?? ''
ok(/of the 6 above share/.test(uniformNote), 'an all-declared list claims the whole row count', uniformNote)
ok(!/rows\)/.test(uniformNote), 'and does not add a subset clause it does not need', uniformNote)

console.log(`\n${pass}/${EXPECTED} passed`)
if (pass !== EXPECTED) process.exit(1)
