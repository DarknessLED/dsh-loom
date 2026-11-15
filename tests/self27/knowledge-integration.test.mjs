// T1: the knowledge chain, end to end in real rounds.
//
// The unit specs prove selectLessons, the store, the trial counter and the
// induction rule separately. This one proves the wiring: two verified
// promotions on the same subject produce a procedure in a real round, the next
// round hands it to a worker (and says so on the ledger), and a lesson that has
// been shown twenty times without winning is not handed out any more.

import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { reduce } from '../../src/core/reduce.js'
import { tmpdir } from 'node:os'

import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

const NODE = process.execPath

// Base fails (no fixed.txt), the worker's edit makes it pass. A verify command
// that only ever fails would never promote, and a promotion is what induction
// is allowed to learn from.
const VERIFY = `"${NODE}" -e "process.exit(require('fs').existsSync('fixed.txt')?0:1)"`

const report = (files) =>
  JSON.stringify({
    changed: files,
    lesson: 'write fixed.txt to satisfy the parser check',
    why: 'the verifier looks for fixed.txt, so the fix is to create it',
    evidence: ['ran the verifier'],
    openQuestions: [],
    confidence: 0.8,
    nextHint: '',
  })

function dispatcher(record, files = ['fixed.txt', 'note.txt']) {
  return {
    run: async (brief, opts = {}) => {
      record.push({ brief, opts })
      writeFileSync(join(opts.cwd, 'fixed.txt'), 'fixed\n')
      // A second file, so the induced procedure has two steps. A single-file
      // edit is deliberately not promoted to a procedure any more.
      writeFileSync(join(opts.cwd, 'note.txt'), 'what changed\n')
      return { sessionId: 'w', text: report(files), stopReason: 'completed' }
    },
  }
}

function setup({ tasks, knowledge = { enabled: true, maxShown: 3 } } = {}) {
  const repo = makeRepo()
  const spec = chainSpec({ candidates: 2, nodes: [
    { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: fix it' } },
    { id: 'verify', type: 'verifier', cmd: VERIFY, cwd: '.' },
  ] })
  const { runtime, view } = makeRuntime({ repo, spec, tasks })
  const config = baseConfig({ knowledge, checkpoint: { on: ['plateau'], window: 3 } })
  return { repo, runtime, view, config }
}

const tasks = [
  { id: 't1', family: 'parser', prompt: 'fix parser one', verify: { cmd: VERIFY } },
  { id: 't2', family: 'parser', prompt: 'fix parser two', verify: { cmd: VERIFY } },
  { id: 't3', family: 'parser', prompt: 'fix parser three', verify: { cmd: VERIFY } },
]

async function round(n, ctx) {
  // The round number is derived from the projected rounds; a fake runtime only
  // folds what it was told to fold.
  const finished = ctx.runtime.events.filter((e) => e.type === 'round.finished')
  ctx.view.state.rounds = finished.map((f) => ({
    n: f.data.n,
    ...f.data,
    attempts: ctx.runtime.events
      .filter((a) => a.type === 'attempt.finished' && String(a.data.id).startsWith(`r${f.data.n}a`))
      .map((a) => a.data),
  }))
  return runRound({ runtime: ctx.runtime, view: ctx.view, config: ctx.config, dispatcher: ctx.dispatcher, log: () => {}, notify: () => {} })
}

test('two promotions on the same subject become a procedure in the campaign and the store', async () => {
  const ctx = setup({ tasks: [tasks[0], tasks[1]] })
  ctx.dispatcher = dispatcher([])
  await round(1, ctx)
  await round(2, ctx)

  const procedures = (ctx.view.state.lessons || []).filter((l) => l.kind === 'procedure')
  assert.equal(procedures.length, 1, 'exactly one procedure after two promotions')
  const proc = procedures[0]
  assert.match(proc.id, /^proc-/)
  assert.equal(proc.family, 'parser')
  assert.ok(proc.support.length >= 2)

  const store = join(ctx.runtime.home, 'knowledge.json')
  assert.ok(existsSync(store), 'the procedure reaches the cross-campaign store')
  const saved = JSON.parse(readFileSync(store, 'utf8'))
  assert.ok(saved.some((l) => l.id === proc.id))
})

test('the next round hands the procedure to a treated worker and records the showing', async () => {
  const ctx = setup({ tasks })
  ctx.dispatcher = dispatcher([])
  await round(1, ctx)
  await round(2, ctx)
  const proc = (ctx.view.state.lessons || []).find((l) => l.kind === 'procedure')
  assert.ok(proc, 'induction happened before the showing test')

  await round(3, ctx)
  const shown = ctx.runtime.events.filter((e) => e.type === 'lesson.shown' && e.data?.id === proc.id)
  assert.ok(shown.length >= 1, 'the procedure was shown to at least one attempt')
  const withLesson = ctx.runtime.events
    .filter((e) => e.type === 'attempt.finished')
    .filter((e) => Array.isArray(e.data?.lessons) && e.data.lessons.includes(proc.id))
  assert.ok(withLesson.length >= 1, 'the attempt that saw it records the id for credit')
})

test('a lesson whose notWhen condition holds is not handed out', async () => {
  const ctx = setup({ tasks: [{ id: 't4', family: 'parser', prompt: 'the locked parser case', verify: { cmd: VERIFY } }] })
  ctx.dispatcher = dispatcher([])
  const blocked = {
    id: 'lsn-blocked',
    family: 'parser',
    kind: 'fact',
    claim: 'restart the worker when the link stalls',
    status: 'active',
    ttlRounds: 12,
    confidence: 0.9,
    createdRound: 0,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    notWhen: ['locked'],
  }
  ctx.runtime.append(ctx.view, 'lesson.added', { lesson: blocked }, 'system')
  await round(1, ctx)
  const seen = ctx.runtime.events
    .filter((e) => e.type === 'attempt.finished')
    .some((e) => (e.data?.lessons || []).includes('lsn-blocked'))
  assert.equal(seen, false, 'a lesson that warns about this situation stays out of the brief')
})

test('a lesson borrowed from the global store enters this campaign ledger, so its trial advances', async () => {
  const ctx = setup({ tasks: [{ id: 't6', family: 'parser', prompt: 'fix parser six', verify: { cmd: VERIFY } }] })
  ctx.dispatcher = dispatcher([])
  const borrowed = {
    id: 'lsn-global',
    family: 'parser',
    kind: 'procedure',
    subject: 'fixed.txt',
    steps: ['1. create fixed.txt'],
    claim: 'two promotions began at fixed.txt',
    status: 'active',
    ttlRounds: 12,
    confidence: 0.9,
    createdRound: 0,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    trials: { shown: 0, wins: 0, losses: 0 },
  }
  // The store is the cross-campaign library; the campaign starts with no lesson
  // of its own, so only the borrow can explain anything that happens next.
  writeFileSync(join(ctx.runtime.home, 'knowledge.json'), JSON.stringify([borrowed]))

  await round(1, ctx)

  const shown = ctx.runtime.events.filter((e) => e.type === 'lesson.shown' && e.data?.id === 'lsn-global')
  assert.ok(shown.length >= 1, 'the borrowed lesson was shown')
  const inState = (ctx.view.state.lessons || []).find((l) => l.id === 'lsn-global')
  assert.ok(inState, 'a borrowed lesson is folded into the campaign ledger it acted on')
  assert.ok(inState.trials.shown >= 1, 'its trial denominator advanced with the showing')
})

test('a lesson that lost its trial is not handed out again', async () => {
  const ctx = setup({ tasks: [{ id: 't5', family: 'parser', prompt: 'fix parser five', verify: { cmd: VERIFY } }] })
  ctx.dispatcher = dispatcher([])
  const loser = {
    id: 'lsn-loser',
    family: 'parser',
    kind: 'fact',
    claim: 'always rewrite the whole module first',
    status: 'active',
    ttlRounds: 12,
    confidence: 0.9,
    createdRound: 0,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    trials: { shown: 20, wins: 3, losses: 9 },
  }
  ctx.runtime.append(ctx.view, 'lesson.added', { lesson: loser }, 'system')
  await round(1, ctx)
  const seen = ctx.runtime.events
    .filter((e) => e.type === 'attempt.finished')
    .some((e) => (e.data?.lessons || []).includes('lsn-loser'))
  assert.equal(seen, false, 'twenty showings without a win is a verdict, not a shrug')
})


test('re-borrowing a lesson does not reset the trial it already ran', () => {
  const base = {
    id: 'lsn-reborrow',
    family: 'parser',
    kind: 'procedure',
    claim: 'start at the entry file',
    status: 'active',
    ttlRounds: 12,
    confidence: 0.8,
    createdRound: 0,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
  }
  const ev = (seq, trials) => ({
    seq,
    t: seq,
    type: 'lesson.added',
    actor: 'system',
    data: { lesson: { ...base, trials } },
  })
  // The campaign pruned its local copy, so the borrow is folded in again from
  // the global record, which still says zero. The campaign already paid for
  // three showings and one win; re-adding must not pretend they never happened.
  const state = reduce([ev(1, { shown: 3, wins: 1, losses: 1 }), ev(2, { shown: 0, wins: 0, losses: 0 })], 'c')
  const lesson = state.lessons.find((l) => l.id === 'lsn-reborrow')
  assert.deepEqual(lesson.trials, { shown: 3, wins: 1, losses: 1 })
})
