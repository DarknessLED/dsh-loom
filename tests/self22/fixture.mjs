// Shared fixtures for the L2 autonomy + continuous-score specs.
//
// These run real `runRound` code against a throwaway git repo and a fake
// dispatcher: the point is the round's own bookkeeping (proposal cards, scores
// on attempt records), not the host's agent runtime.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

export function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-s22-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

export const REPORT = '{"changed":[],"why":"tried","evidence":["ran it"],"openQuestions":[],"confidence":0.2,"nextHint":""}'

export function chainSpec({ candidates = 2, nodes = null } = {}) {
  return {
    name: 'l2-spec',
    version: 1,
    params: { candidates },
    nodes: nodes || [
      {
        id: 'attempts',
        type: 'map',
        over: 'candidates',
        of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: try to make it pass' },
      },
      { id: 'verify', type: 'verifier', cmd: 'exit 1', cwd: '.' },
    ],
  }
}

export function makeRuntime({ repo, tasks, spec = chainSpec(), budget = {} } = {}) {
  const events = []
  const runtime = {
    home: mkdtempSync(join(tmpdir(), 'loom-s22-home-')),
    events,
    dir: repo,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(view, type, data) {
      events.push({ type, data })
      // A real runtime reduces the ledger into the view; this one folds just
      // the state a later round reads back. Lessons matter to selection (a
      // procedure added in round 2 is offered in round 3), and keeping the
      // fold honest is what lets the knowledge specs run real rounds.
      if (type === 'lesson.added' && data?.lesson && Array.isArray(view?.state?.lessons)) {
        if (!view.state.lessons.some((l) => l.id === data.lesson.id)) view.state.lessons.push(data.lesson)
      }
      // Fold just enough for the next predicate: plateau detection reads
      // `finished.rounds` and the checkpoints it already raised (the second card
      // must cover a new window, not the one it just asked about).
      return {
        rounds: events.filter((e) => e.type === 'round.finished').map((e) => ({ n: e.data.n, ...e.data })),
        checkpoints: events
          .filter((e) => e.type === 'checkpoint.raised')
          .map((e) => ({ id: e.data.id, kind: e.data.kind, payload: e.data.payload, status: 'open' })),
      }
    },
    status() {
      return {}
    },
  }
  const view = {
    dir: join(mkdtempSync(join(tmpdir(), 'loom-s22-view-')), 'campaign'),
    state: {
      id: 's22',
      status: 'running',
      workspace: repo,
      rounds: [],
      constraints: [],
      lessons: [],
      checkpoints: [],
      autopilot: { enabled: false, guard: null },
      budget: { rounds: 20, roundsUsed: 0, usd: 5, spentUsd: 0, ...budget },
      evalset: { tasks, holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec, by: 'agent', at: Date.now(), status: 'active' }],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return { runtime, view }
}

export function baseConfig(extra = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: {},
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    chain: { minTasks: 6, minGain: 0.05, holdoutSlack: 0.02, maxMutations: 3 },
    checkpoint: { on: ['gate', 'plateau'], window: 3 },
    models: {},
    ...extra,
  }
}

export function fakeDispatcher(record, reply = () => REPORT) {
  return {
    run: async (brief, opts = {}) => {
      record.push({ brief, opts })
      return { sessionId: 'w', text: reply(brief, opts), stopReason: 'completed' }
    },
  }
}
