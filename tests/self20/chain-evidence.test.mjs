// L2 autonomy: a proposal a human is asked to approve must carry its own case.
//
// The chain mutator already refuses to propose what was already decided and what
// a task's scope forbids. What it never did was say *why this, now*: the card
// said "candidates+1" and the human had to go read a ledger to find out whether
// that was ever measured. L3 (the plugin changing its own source) stays behind a
// human; L2 (the chain) may propose freely, but only with evidence attached.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { proposeMutations, evidenceFor } from '../../src/chain/mutate.js'

const here = dirname(fileURLToPath(import.meta.url))
const tools = readFileSync(join(here, '..', '..', 'src', 'tools', 'index.js'), 'utf8')

const chain = {
  name: 'code-fix',
  version: 1,
  params: { candidates: 1, maxSteps: 40 },
  nodes: [
    { id: 'attempts', type: 'agent', prompt: 'fix it' },
    { id: 'verify', type: 'verifier', cmd: 'node --test' },
    { id: 'gate', type: 'verifier', cmd: 'node scripts/test-all.mjs' },
  ],
}

test('evidence counts what the campaign actually did', () => {
  const rounds = [
    { n: 1, status: 'promoted', promoted: true, score: 1 },
    { n: 2, status: 'no-gain', promoted: false, score: 0 },
    { n: 3, status: 'promoted', promoted: true, score: 1 },
  ]
  const e = evidenceFor({ rounds })
  assert.equal(e.rounds, 3)
  assert.equal(e.promotions, 2)
  assert.equal(e.rejections, 1)
  assert.equal(e.lastVerdict, 'promoted')
  assert.equal(e.basis, 'rounds', 'a proposal built on rounds says so')
})

test('a campaign with no history admits it has none', () => {
  const e = evidenceFor({ rounds: [] })
  assert.equal(e.rounds, 0)
  assert.equal(e.basis, 'none', 'silence is not evidence')
})

test('a recorded decision outranks a guess and is named', () => {
  const e = evidenceFor({ rounds: [], decided: [{ kind: 'candidates+1', decision: 'reject', at: 5 }] })
  assert.equal(e.basis, 'decisions')
  assert.equal(e.decided.length, 1)
})

test('every fresh proposal carries evidence and the blocked ones still say why', () => {
  const rounds = [{ n: 1, status: 'promoted', promoted: true, score: 1 }]
  const out = proposeMutations(chain, {
    fromVersion: 2,
    max: 3,
    decided: [{ kind: 'candidates+1', decision: 'reject', at: 5 }],
    scopeEditable: false,
    rounds,
  })
  for (const m of out) assert.ok(m.evidence, `${m.kind} must carry evidence`)
  const fresh = out.filter((m) => m.status === 'fresh')
  assert.ok(fresh.length > 0, 'something must be proposable')
  for (const m of fresh) assert.equal(m.evidence.basis, 'rounds')
})

test('the tool hands the mutator the campaign history', () => {
  assert.match(tools, /proposeMutations\(/, 'the tool is the one caller')
  assert.match(tools, /rounds:\s/, 'and it must pass the rounds it read')
})
