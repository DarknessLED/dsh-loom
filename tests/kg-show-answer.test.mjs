// The graph records decisions (kg resolve, kg answer) and must surface them where a
// reader arrives: `kg show <question>` and `kg search <terms>` are the two doors, and
// before this a reader who came through either one was told nothing about the
// question having been answered -- so the answer existed and was unreachable.
//
// This pins both directions (question -> answer, answer -> questions it closes) and
// the search marker, plus the negative case: an unanswered question must not claim
// to be answered.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const KG = resolve('research/kg/kg.mjs')
const dir = mkdtempSync(join(tmpdir(), 'kg-show-'))
const env = { ...process.env, LOOM_KG: join(dir, 'g.sqlite') }
let pass = 0
let failures = 0
const EXPECTED = 13
const ok = (cond, name, detail) => {
  if (cond) {
    pass += 1
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
const run = (args) => execFileSync(process.execPath, [KG, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const file = (name, obj) => {
  const f = join(dir, name)
  writeFileSync(f, JSON.stringify(obj))
  return f
}

run(['init'])
run([
  'add',
  file('seed.json', {
    nodes: [
      { id: 'q-one', kind: 'question', title: 'What is the human decision rate in our loop?', body: 'nobody has counted it', confidence: 0.9 },
      { id: 'q-two', kind: 'question', title: 'What is the cache hit share?', body: 'unmeasured', confidence: 0.9 },
      { id: 'a-one', kind: 'number', title: 'Human decision rate is 0.83 checkpoints per campaign', body: '60 over 72 campaigns', confidence: 0.95 },
    ],
  }),
])

// ---- unanswered question: no claim of an answer anywhere
const before = run(['show', 'q-one'])
ok(!before.includes('answered by'), 'an unanswered question shows no answered marker')
ok(!before.includes('this node answers'), 'a node that answers nothing says nothing')
const beforeSearch = run(['search', 'human decision rate', '--limit', '5'])
ok(!/✓ answered by/.test(beforeSearch), 'an unanswered question is not marked in search')

// ---- answer it, with a reason
run(['answer', 'q-one', 'a-one', '--note', 'the ledger events give the count directly'])

const q = run(['show', 'q-one'])
ok(/\u2713 answered by a-one/.test(q), 'the question names the node that answered it')
ok(q.includes('the ledger events give the count directly'), 'the question carries the reason')
const a = run(['show', 'a-one'])
ok(/\u2713 this node answers q-one/.test(a), 'the answering node lists the question it closes')
ok(!/this node answers q-one, q-one/.test(a), 'the answering node does not list itself twice')

const searched = run(['search', 'human decision rate', '--limit', '5'])
ok(/\u2713 answered by a-one/.test(searched), 'search marks the answered question')
const other = run(['search', 'cache hit share', '--limit', '5'])
ok(!/✓ answered by/.test(other), 'an unrelated question in the same search is not marked')

// ---- one node answering several questions lists them all, comma separated
run(['answer', 'q-two', 'a-one', '--note', 'same measurement, second denominator'])
const a2 = run(['show', 'a-one'])
ok(/answers q-one, q-two|answers q-two, q-one/.test(a2), 'a node answering two questions lists both')

// ---- and unanswering removes the marker from both ends
run(['unanswer', 'q-one'])
const reopened = run(['show', 'q-one'])
ok(!reopened.includes('answered by a-one'), 'unanswer removes the question-side marker')
const a3 = run(['show', 'a-one'])
ok(!/answers q-one,/.test(a3) && !/answers q-one$/.test(a3.trim()), 'unanswer removes the answer-side listing')

// ---- the json view carries the raw node, so a marker there is the caller's job
const asJson = JSON.parse(run(['show', 'q-two', '--json']))
ok(asJson.id === 'q-two', 'show --json still returns the node itself')

rmSync(dir, { recursive: true, force: true })

console.log(`\n${pass}/${EXPECTED} passed`)
if (pass !== EXPECTED || failures) process.exit(1)
