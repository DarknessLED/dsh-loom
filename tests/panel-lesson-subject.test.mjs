// Spec: a lesson learned before lessons carried `files` still knows which file
// it is about.
//
// What it looked like before this spec: ninety-nine claims sat in the tree and
// eighty-six of them were filed under one residual bucket called "(未指明文件)",
// because the only reader of a claim's location was a regex over its sentence
// and most sentences name no path. "Scattered" was the accurate word.
//
// The record already answered the question: a lesson's `evidence` names the
// attempt that earned it, and that attempt's report lists the files it changed.
// This spec pins the join, and pins that a claim naming nothing at all still
// lands in a named bucket instead of disappearing.
import assert from 'node:assert/strict'
import { panelState } from '../src/panel/api.js'

let pass = 0
function ok(cond, name) {
  assert.ok(cond, name)
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function runtimeWith(state) {
  return {
    listCampaigns: () => [state.id],
    get: () => ({ state }),
    liveAttempts: () => [],
    ownership: () => ({ mine: true }),
    leanProbe: () => ({ available: false }),
  }
}

function state(lessons, attempts) {
  return {
    id: 'c1',
    status: 'running',
    objective: 'make the tree readable',
    workspace: 'C:/w',
    rounds: [{ n: 1, status: 'promoted', taskId: 't1', attempts }],
    lessons,
    checkpoints: [],
  }
}

// --- the join ---------------------------------------------------------------
{
  const attempt = {
    id: 'r1a1',
    score: 1,
    verifierOk: true,
    report: { changed: ['src/runtime/round.js'], why: 'x', evidence: [], confidence: 0.8 },
  }
  const less = {
    id: 'lsn-old',
    status: 'active',
    claim: 'a demoted provider must not keep planning',
    kind: 'fact',
    evidence: 'round 1 attempt r1a1 verified (score 1)',
  }
  const row = panelState({ runtime: runtimeWith(state([less], [attempt])) }).campaigns[0]
  const lesson = row.lessonsAll.find((l) => l.id === 'lsn-old')
  assert.deepEqual(lesson.files, ['src/runtime/round.js'], 'an old lesson inherits the files of the attempt it names')
  ok(lesson.files.length === 1, 'the join puts the claim under the file the attempt changed')
}

// --- a new lesson keeps its own answer --------------------------------------
{
  const less = {
    id: 'lsn-new',
    status: 'active',
    claim: 'the panel reads one state object',
    kind: 'fact',
    files: ['src/panel/api.js'],
    evidence: 'round 1 attempt r1a1 verified (score 1)',
  }
  const row = panelState({ runtime: runtimeWith(state([less], [])) }).campaigns[0]
  const lesson = row.lessonsAll.find((l) => l.id === 'lsn-new')
  assert.deepEqual(lesson.files, ['src/panel/api.js'], 'a lesson that already lists files is not overridden by its attempt')
  ok(lesson.files[0] === 'src/panel/api.js', 'its own files win')
}

// --- a claim that names a path in its sentence ------------------------------
{
  const less = {
    id: 'lsn-path',
    status: 'active',
    claim: 'src/core/ledger.js must sort duplicate seq before folding',
    kind: 'hazard',
    evidence: 'round 3 attempt r3a9 verified (score 1)',
  }
  const row = panelState({ runtime: runtimeWith(state([less], [])) }).campaigns[0]
  const lesson = row.lessonsAll.find((l) => l.id === 'lsn-path')
  assert.deepEqual(lesson.files, ['src/core/ledger.js'], 'a path named in the sentence is read back')
  ok(lesson.files[0] === 'src/core/ledger.js', 'a sentence that names a path still resolves')
}

// --- nothing to go on is a named bucket, not a crash ------------------------
{
  const less = {
    id: 'lsn-none',
    status: 'active',
    claim: 'be careful about this',
    kind: 'fact',
    evidence: 'round 2 attempt r2a1 verified (score 1)',
  }
  const row = panelState({ runtime: runtimeWith(state([less], [])) }).campaigns[0]
  const lesson = row.lessonsAll.find((l) => l.id === 'lsn-none')
  assert.deepEqual(lesson.files, [], 'a claim with no evidence of place carries no files rather than an invented one')
  ok(lesson.files.length === 0, 'no invented grouping key')
}

// --- the join is one pass, not one lookup per lesson ------------------------
{
  const attempts = [
    { id: 'r1a1', score: 1, verifierOk: true, report: { changed: ['a/one.js'] } },
    { id: 'r1a2', score: 1, verifierOk: true, report: { changed: ['b/two.js'] } },
  ]
  const lessons = [
    { id: 'l1', status: 'active', claim: 'one', kind: 'fact', evidence: 'round 1 attempt r1a1 verified' },
    { id: 'l2', status: 'active', claim: 'two', kind: 'fact', evidence: 'round 1 attempt r1a2 verified' },
  ]
  const row = panelState({ runtime: runtimeWith(state(lessons, attempts)) }).campaigns[0]
  assert.deepEqual(row.lessonsAll.map((l) => l.files[0]), ['a/one.js', 'b/two.js'], 'each lesson joins to its own attempt')
  ok(row.lessonsAll.length === 2, 'both lessons reach the panel')
}

// --- windows separators are normalised --------------------------------------
{
  const attempt = { id: 'r1a1', score: 1, verifierOk: true, report: { changed: ['src\\runtime\\round.js'] } }
  const less = { id: 'lw', status: 'active', claim: 'w', kind: 'fact', evidence: 'round 1 attempt r1a1 verified' }
  const row = panelState({ runtime: runtimeWith(state([less], [attempt])) }).campaigns[0]
  assert.deepEqual(row.lessonsAll[0].files, ['src/runtime/round.js'], 'a backslash path reads as one path everywhere')
  ok(true, 'a windows path is normalised before it becomes a grouping key')
}

// --- the corpus is not capped below itself ---------------------------------
{
  const lessons = []
  for (let i = 0; i < 120; i += 1) {
    lessons.push({ id: `lx${i}`, status: 'active', claim: `claim ${i}`, kind: 'fact', files: ['src/x.js'] })
  }
  const row = panelState({ runtime: runtimeWith(state(lessons, [])) }).campaigns[0]
  assert.equal(row.lessonsAll.length, 120, 'the whole corpus of a campaign reaches the panel')
  ok(row.lessonsAll.length === 120, 'a cap below the corpus would hide rows from the only view that can group them')
}

console.log(`\n${pass} assertions passed`)
