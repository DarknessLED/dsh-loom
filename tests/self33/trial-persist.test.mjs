// A trial only concludes if its counter outlives the campaign that ran it.
//
// The showing and the paired win/loss/tie are recorded in the campaign ledger,
// but the lesson itself lives in the cross-campaign store. Before this spec the
// store kept the copy it was created with (`shown: 0`), so every new campaign
// borrowed a fresh trial and the twenty showings could never add up. T3 spent
// two budgets discovering that; this pins the write-back instead of the spend.

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { runRound } from '../../src/runtime/round.js'
import { makeRepo, makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

const NODE = process.execPath
const VERIFY = `"${NODE}" -e "process.exit(require('fs').existsSync('fixed.txt')?0:1)"`

const report = JSON.stringify({
  changed: ['fixed.txt'],
  lesson: 'create fixed.txt to satisfy the verifier',
  why: 'the verifier only checks for the file',
  evidence: ['ran the verifier'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
})

const dispatcher = () => ({
  run: async (brief, opts = {}) => {
    writeFileSync(join(opts.cwd, 'fixed.txt'), 'fixed\n')
    return { sessionId: 'w', text: report, stopReason: 'completed' }
  },
})

function setup(trials) {
  const repo = makeRepo()
  const spec = chainSpec({
    candidates: 2,
    nodes: [
      { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: fix it' } },
      { id: 'verify', type: 'verifier', cmd: VERIFY, cwd: '.' },
    ],
  })
  const tasks = [{ id: 't1', family: 'parser', prompt: 'fix parser one', verify: { cmd: VERIFY } }]
  const { runtime, view } = makeRuntime({ repo, spec, tasks })
  const lesson = {
    id: 'proc-persist',
    family: 'parser',
    kind: 'procedure',
    subject: 'fixed.txt',
    steps: ['1. create fixed.txt', '2. check the verifier'],
    claim: 'two promotions began at fixed.txt',
    status: 'active',
    ttlRounds: 400,
    confidence: 0.9,
    createdRound: 0,
    useCount: 0,
    gainSum: 0,
    harmCount: 0,
    trials: { ...trials },
  }
  writeFileSync(join(runtime.home, 'knowledge.json'), JSON.stringify([lesson]))
  const config = baseConfig({ knowledge: { enabled: true, maxShown: 3 }, checkpoint: { on: [], window: 3 } })
  return { runtime, view, config }
}

const storeLesson = (home) => JSON.parse(readFileSync(join(home, 'knowledge.json'), 'utf8'))[0]

test('a showing survives the campaign that recorded it', async () => {
  const { runtime, view, config } = setup({ shown: 0, wins: 0, losses: 0, ties: 0 })
  await runRound({ runtime, view, config, dispatcher: dispatcher(), log: () => {}, notify: () => {} })

  const saved = storeLesson(runtime.home)
  assert.ok(saved.trials, 'the store now carries the trial it borrowed out')
  assert.ok(saved.trials.shown >= 1, 'the showing was written back, not just reduced into the campaign')
})

test('write-back never lowers a counter another campaign already raised', async () => {
  const { runtime, view, config } = setup({ shown: 7, wins: 2, losses: 1, ties: 4 })
  await runRound({ runtime, view, config, dispatcher: dispatcher(), log: () => {}, notify: () => {} })

  const saved = storeLesson(runtime.home)
  assert.equal(saved.trials.shown, 8, 'this campaign adds its own showing to the stored seven')
  assert.equal(saved.trials.wins, 2)
  assert.equal(saved.trials.losses, 1)
  assert.equal(saved.trials.ties, 4)
})
