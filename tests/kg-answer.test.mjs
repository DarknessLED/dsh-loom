// The gap list has to be able to shrink, and the shrink has to survive a pack.
//
// A question node has no transition out of status='live', so before `kg answer`
// existed the list could only grow: 320 questions after eight research waves, six
// of which carried the measurement answering them (exp-gap-002). Two things follow
// and both are tested here:
//   1. recording an answer removes the question from the default list while
//      leaving both nodes readable, and requires a reason;
//   2. pack/unpack carries the answers, because a round trip that silently
//      reopens every question is the same defect that pack had with resolutions.
//
// Run: node tests/kg-answer.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const NODE = process.execPath
const KG = 'C:/Projects/RSI/research/kg/kg.mjs'
const dir = mkdtempSync(join(tmpdir(), 'kg-answer-'))
const DB = join(dir, 'store.sqlite')
const env = { ...process.env, LOOM_KG: DB }

let pass = 0
let fail = 0
const check = (name, fn) => {
  try { fn(); pass += 1; console.log(`  ok  ${name}`) }
  catch (err) { fail += 1; console.log(`  FAIL ${name}\n       ${err.message.split('\n')[0]}`) }
}

const kg = (...args) => {
  try {
    return { ok: true, out: execFileSync(NODE, [KG, ...args], { env, encoding: 'utf8' }) }
  } catch (err) {
    return { ok: false, out: `${err.stdout ?? ''}${err.stderr ?? ''}`, status: err.status }
  }
}

const payload = {
  nodes: [
    { id: 'q-open', kind: 'question', title: 'Is the carryover order of a promotion one round or several?', body: 'Lag-1 autocorrelation would answer it from our own ledger.', confidence: 0.4, topic: 'gap' },
    { id: 'q-answered', kind: 'question', title: 'What share of spend is wasted rounds?', body: 'Measured at 40.4% already.', confidence: 0.4, topic: 'gap' },
    { id: 'n-answer', kind: 'number', title: '40.4% of attempts produced nothing', body: '233 of 577 attempts, $2.1 of $5.2.', confidence: 0.9, topic: 'gap' },
    { id: 'c-claim', kind: 'claim', title: 'not a question', body: 'x'.repeat(160), confidence: 0.5 },
  ],
  edges: [
    { from: 'n-answer', rel: 'supports', to: 'q-answered', note: 'carries the same 40.4%' },
  ],
}
const seed = join(dir, 'seed.json')
writeFileSync(seed, JSON.stringify(payload))

kg('init')
check('seed imports', () => {
  const r = kg('add', seed)
  assert.match(r.out, /nodes \+4/)
})

check('both questions are listed before any answer', () => {
  const r = kg('gaps')
  assert.match(r.out, /q-open/)
  assert.match(r.out, /q-answered/)
  assert.match(r.out, /2 open question\(s\) of 2 asked/)
})

check('answer requires a note', () => {
  const r = kg('answer', 'q-answered', 'n-answer')
  assert.equal(r.ok, false)
  assert.match(r.out, /needs --note/)
})

check('answer rejects an answering node that does not exist', () => {
  const r = kg('answer', 'q-answered', 'nope', '--note', 'x')
  assert.equal(r.ok, false)
  assert.match(r.out, /no node "nope"/)
})

check('answer rejects a target that is not a question', () => {
  const r = kg('answer', 'c-claim', 'n-answer', '--note', 'x')
  assert.equal(r.ok, false)
  assert.match(r.out, /is a claim, not a question/)
})

check('answer rejects a missing question', () => {
  const r = kg('answer', 'nope', 'n-answer', '--note', 'x')
  assert.equal(r.ok, false)
  assert.match(r.out, /no node "nope"/)
})

check('answering removes it from the default list and keeps the count honest', () => {
  assert.equal(kg('answer', 'q-answered', 'n-answer', '--note', 'the number node measures exactly what the question asked').ok, true)
  const r = kg('gaps')
  assert.doesNotMatch(r.out, /q-answered/)
  assert.match(r.out, /q-open/)
  assert.match(r.out, /1 open question\(s\) of 2 asked/)
})

check('--answered still shows it, with the answering node named', () => {
  const r = kg('gaps', '--answered')
  assert.match(r.out, /q-answered/)
  assert.match(r.out, /\[answered by n-answer\]/)
  assert.match(r.out, /1 answered/)
})

check('both nodes and the edge survive the answer', () => {
  assert.match(kg('show', 'q-answered').out, /q-answered/)
  assert.match(kg('show', 'n-answer').out, /n-answer/)
  const e = kg('sql', "SELECT rel FROM edge WHERE from_id='n-answer' AND to_id='q-answered'")
  assert.match(e.out, /supports/)
})

check('the answer is readable from SQL, so it is real state not formatting', () => {
  const r = kg('sql', 'SELECT gap_id, node_id, note FROM gap_answer')
  assert.match(r.out, /q-answered/)
  assert.match(r.out, /n-answer/)
  assert.match(r.out, /measures exactly what the question asked/)
})

check('answering twice replaces rather than duplicates', () => {
  kg('answer', 'q-answered', 'n-answer', '--note', 'second reason')
  const r = kg('sql', "SELECT count(*) AS n FROM gap_answer WHERE gap_id='q-answered'")
  const n = JSON.parse(r.out)[0].n
  assert.equal(n, 1)
  assert.match(kg('gaps', '--answered').out, /second reason|\[answered by n-answer\]/)
})

check('unanswer reopens the question', () => {
  assert.equal(kg('unanswer', 'q-answered').ok, true)
  assert.match(kg('gaps').out, /q-answered/)
  assert.match(kg('gaps').out, /2 open question\(s\) of 2 asked/)
})

check('unanswer on an unanswered question reports that rather than failing', () => {
  const r = kg('unanswer', 'q-open')
  assert.equal(r.ok, true)
  assert.match(r.out, /was not answered/)
})

check('pack carries answers and unpack restores them', () => {
  kg('answer', 'q-answered', 'n-answer', '--note', 'a reason with a | pipe in it')
  const packFile = join(dir, 'g.pack')
  writeFileSync(packFile, kg('pack').out)
  const text = readFileSync(packFile, 'utf8')
  assert.match(text, /^\? q-answered n-answer \|/m, 'pack must emit an answer record')

  const DB2 = join(dir, 'copy.sqlite')
  const env2 = { ...process.env, LOOM_KG: DB2 }
  execFileSync(NODE, [KG, 'init'], { env: env2 })
  const un = execFileSync(NODE, [KG, 'unpack', packFile], { env: env2, encoding: 'utf8' })
  assert.match(un, /answers \+1/)
  const listed = execFileSync(NODE, [KG, 'gaps', '--answered'], { env: env2, encoding: 'utf8' })
  assert.match(listed, /\[answered by n-answer\]/)
  const row = execFileSync(NODE, [KG, 'sql', 'SELECT note FROM gap_answer'], { env: env2, encoding: 'utf8' })
  assert.match(row, /a reason with a \| pipe in it/, 'the reason must survive the pipe escape')
})

check('pack -> unpack -> pack is byte-identical', () => {
  const DB3 = join(dir, 'rt.sqlite')
  const env3 = { ...process.env, LOOM_KG: DB3 }
  execFileSync(NODE, [KG, 'init'], { env: env3 })
  const p1 = join(dir, 'p1.pack')
  writeFileSync(p1, kg('pack').out)
  execFileSync(NODE, [KG, 'unpack', p1], { env: env3 })
  const p2 = join(dir, 'p2.pack')
  writeFileSync(p2, execFileSync(NODE, [KG, 'pack'], { env: env3, encoding: 'utf8' }))
  assert.equal(readFileSync(p1, 'utf8'), readFileSync(p2, 'utf8'))
})

check('unpack rejects an answer whose question is missing', () => {
  const bad = join(dir, 'bad.pack')
  writeFileSync(bad, readFileSync(join(dir, 'g.pack'), 'utf8') + '\n\n? q-missing n-answer | x\n')
  const DB4 = join(dir, 'bad.sqlite')
  const env4 = { ...process.env, LOOM_KG: DB4 }
  execFileSync(NODE, [KG, 'init'], { env: env4 })
  try {
    execFileSync(NODE, [KG, 'unpack', bad], { env: env4, encoding: 'utf8', stdio: 'pipe' })
  } catch { /* stderr only; the record is skipped, not fatal */ }
  const row = execFileSync(NODE, [KG, 'sql', "SELECT count(*) AS n FROM gap_answer WHERE gap_id='q-missing'"], { env: env4, encoding: 'utf8' })
  assert.equal(JSON.parse(row)[0].n, 0)
})

check('merge migrates an answer whose answering node is folded away', () => {
  const DB5 = join(dir, 'merge.sqlite')
  const env5 = { ...process.env, LOOM_KG: DB5 }
  execFileSync(NODE, [KG, 'init'], { env: env5 })
  execFileSync(NODE, [KG, 'add', seed], { env: env5 })
  execFileSync(NODE, [KG, 'answer', 'q-answered', 'n-answer', '--note', 'r'], { env: env5 })
  execFileSync(NODE, [KG, 'merge', 'c-claim', 'n-answer'], { env: env5 })
  const row = execFileSync(NODE, [KG, 'sql', 'SELECT gap_id, node_id FROM gap_answer'], { env: env5, encoding: 'utf8' })
  assert.match(row, /q-answered/)
  assert.match(row, /c-claim/, 'the answer must follow the surviving node')
})

// The denominator is a claim: count the checks above by hand before trusting the
// line below. (First version of this file said 18 and there are 17 -- the assert
// caught it, which is the only reason the number is worth printing.)
const EXPECTED = 17
console.log(`\n${pass}/${EXPECTED} passed`)
assert.equal(pass, EXPECTED, `${fail} check(s) failed`)
