// A gap is the only node kind whose id was historically derived from its body, so
// `gaps[]` tolerated anything with a toString: a string, an array, an object. Two
// shapes failed silently and both happened for real:
//
//   * an object stored as "[object Object]" (valid id, valid kind, indistinguishable
//     from a short question) -- the whole body was lost;
//   * a fresh batch reusing a wave prefix whose ids already existed overwrote the
//     earlier gaps and reported them as "updated".
//
// This checks that both now fail loudly, that the batch is all-or-nothing, and that
// re-importing the same payload still counts as an update rather than a collision.

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const KG = resolve('research/kg/kg.mjs')
const here = mkdtempSync(join(tmpdir(), 'kg-gapshape-'))
const db = join(here, 'g.sqlite')
const env = { ...process.env, LOOM_KG: db }

let pass = 0
let fail = 0
const ok = (cond, name, detail) => {
  if (cond) {
    pass += 1
    console.log(`  ok   ${name}`)
  } else {
    fail += 1
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
const run = (args, opts = {}) =>
  execFileSync(process.execPath, [KG, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })
const runFail = (args) => {
  try {
    run(args)
    return { ok: true, stderr: '' }
  } catch (e) {
    return { ok: false, stderr: String(e.stderr || e.message) }
  }
}
const write = (name, obj) => {
  const f = join(here, name)
  writeFileSync(f, JSON.stringify(obj))
  return f
}

run(['init'])

// ---- a prose gap still works, because every wave builder emits this shape
const prose = write('prose.json', { gaps: ['a prose gap the wave builders emit'] })
const r1 = run(['add', prose])
ok(/nodes \+1/.test(r1), 'a prose gap is accepted', r1.trim())

// ---- an object gap keeps its own id, title, body and confidence
const obj = write('obj.json', {
  gaps: [{ id: 'g-object-1', title: 'an object gap', body: 'carrying a real body', confidence: 0.8 }],
})
const r2 = run(['add', obj])
ok(/nodes \+1/.test(r2), 'an object gap is accepted', r2.trim())
const shown = run(['show', 'g-object-1'])
ok(shown.includes('an object gap'), 'the object gap has its title')
ok(shown.includes('carrying a real body'), 'the object gap has its body, not [object Object]')
ok(!shown.includes('[object'), 'nothing stringified an object into the body')

// ---- the same payload twice is an update, not a collision
const r3 = run(['add', obj])
ok(/nodes \+0 ~1/.test(r3), 're-importing the same gap is an update', r3.trim())

// ---- a different body under an existing id fails, and the old body survives
const clash = write('clash.json', {
  gaps: [{ id: 'g-object-1', title: 'replacement', body: 'a different body that would replace the old one' }],
})
const bad = runFail(['add', clash])
ok(!bad.ok, 'a colliding gap id is rejected')
ok(/already exists/.test(bad.stderr), 'the rejection names the collision', bad.stderr.trim())
ok(/kg link/.test(bad.stderr), 'the rejection says what to do instead')
const after = run(['show', 'g-object-1'])
ok(after.includes('carrying a real body'), 'the original body survived the rejected write')
ok(!after.includes('replacement'), 'the rejected body did not land')

// ---- an object with no id and no title is refused rather than hashed from nothing
const empty = write('empty.json', { gaps: [{ confidence: 0.5 }] })
const e1 = runFail(['add', empty])
ok(!e1.ok, 'an object gap with neither id nor title is refused')

// ---- a non-string, non-object entry is refused by name
const num = write('num.json', { gaps: [42] })
const e2 = runFail(['add', num])
ok(!e2.ok && /number/.test(e2.stderr), 'a numeric gap is refused and named', e2.stderr.trim())

// ---- a batch containing one bad entry writes none of its good entries
const mixed = write('mixed.json', {
  gaps: ['this one is fine', { id: 'g-object-1', title: 'clash', body: 'this one collides' }],
})
const before = run(['sql', "SELECT COUNT(*) AS n FROM node WHERE body = 'this one is fine'"]).trim()
const mixedRes = runFail(['add', mixed])
const afterMixed = run(['sql', "SELECT COUNT(*) AS n FROM node WHERE body = 'this one is fine'"]).trim()
ok(!mixedRes.ok, 'a batch with one collision is rejected')
ok(before === afterMixed, 'the rejected batch wrote none of its good entries', `${before} -> ${afterMixed}`)

// ---- the default (no id) path still hashes the body, so prose gaps stay stable
const r4 = run(['add', prose])
ok(/nodes \+0 ~1/.test(r4), 'a prose gap without an id re-hashes to the same id', r4.trim())

rmSync(here, { recursive: true, force: true })

// Sixteen assertions, and the count is asserted rather than transcribed: the first
// version of this file said 14 because I wrote the number before running it, which
// is the same "denominator is a claim" mistake the digest records three times.
const EXPECTED = 16
console.log(`\n${pass}/${EXPECTED} passed`)
if (pass !== EXPECTED || fail) process.exit(1)
