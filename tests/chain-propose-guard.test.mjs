// The proposer has to read what the loop already knows.
//
// On 2026-11-14 `rsi_chain(action:"auto")` offered three hypotheses. One of them was
// `candidates+1` — a change the paired A/B had rejected two days earlier
// (tokens 2.09x, round clock 1.45x, decision in `research/ab/decision-ab-cand1b-vs-ab-cand4.json`).
// Another was `no-test-edits`, an instruction that forbids exactly what the graded
// corpus asks for: those tasks deliver assertions inside `verify.scope.editable`.
//
// The menu is fixed and reads nothing, so the loop re-proposes refuted work and
// proposes changes that make its own tasks impossible. Rule: a proposal that was
// measured, or that contradicts the task contract, is reported with its reason and
// is not written as a new version. Blocked proposals are listed, never silently
// dropped — a hypothesis is only refuted while the reason is still visible.
//   node tests/chain-propose-guard.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { MUTATION_KINDS, proposeMutations } from '../src/chain/mutate.js'
import { registerTools } from '../src/tools/index.js'
import { Ledger } from '../src/core/ledger.js'
import { reduce } from '../src/core/reduce.js'
import { campaignDir, ok, done } from './chaos/fixture.mjs'

const base = {
  name: 'code-fix',
  version: 1,
  params: { candidates: 2 },
  nodes: [{ id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', prompt: 'do it' } }],
}

// 1. With nothing known, every kind is offered and the versions are contiguous.
{
  const out = proposeMutations(base, { fromVersion: 2, max: 3 })
  assert.deepEqual(out.map((m) => m.kind), ['candidates+1', 'minimal-change', 'no-test-edits'], 'the menu, in order, capped')
  assert.deepEqual(out.map((m) => m.spec.version), [2, 3, 4], 'versions are contiguous from fromVersion')
  assert.ok(out.every((m) => m.status === 'fresh'), 'and nothing is blocked yet')
  assert.ok(out.every((m) => m.note === null), 'a fresh proposal carries no excuse')
  ok('nothing known: every proposal is fresh')
}

// 2. A kind the loop already measured is not a hypothesis.
{
  const out = proposeMutations(base, {
    fromVersion: 2,
    max: 3,
    decided: [{ kind: 'candidates+1', decision: 'reject:budget-mismatch' }],
  })
  const blocked = out.find((m) => m.kind === 'candidates+1')
  assert.equal(blocked.status, 'already-decided', 'the measured kind is marked')
  assert.match(blocked.note, /reject:budget-mismatch/, 'and the note names the verdict it is resting on')
  assert.equal(out.filter((m) => m.status === 'fresh').length, 3, 'the other three are offered — blocking one kind lets the next one in')
  assert.ok(out.some((m) => m.kind === 'state-your-uncertainty'), 'so the cap no longer hides the last hypothesis')
  assert.deepEqual(out.map((m) => m.spec.version), [2, 3, 4, 5], 'numbering does not shift when a kind is blocked')
  ok('a measured kind is blocked with its verdict, and numbering holds')
}

// 3. An instruction the tasks cannot obey is a conflict, not a hypothesis.
{
  const out = proposeMutations(base, { fromVersion: 2, max: 3, scopeEditable: true })
  const conflict = out.find((m) => m.kind === 'no-test-edits')
  assert.equal(conflict.status, 'conflicts-with-scope', 'forbidding test edits conflicts with a task that delivers them')
  assert.match(conflict.note, /test edit/, 'and the note says which contract it breaks')
  const plain = proposeMutations(base, { fromVersion: 2, max: 3, scopeEditable: false })
  assert.equal(plain.find((m) => m.kind === 'no-test-edits').status, 'fresh', 'without such a task it is a real hypothesis')
  ok('no-test-edits is blocked only when a task delivers a test edit')
}

// 4. Both guards at once: the caller still sees all four, and only fresh ones move.
{
  const out = proposeMutations(base, {
    fromVersion: 2,
    max: 3,
    decided: [{ kind: 'candidates+1', decision: 'reject:budget-mismatch' }],
    scopeEditable: true,
  })
  // The menu grew a fifth kind on 2026-11-26 (`research-on-stuck`), so this
  // counts against the menu rather than the number four: every applicable kind
  // is listed, blocked ones included, and only the fresh ones are capped.
  assert.equal(out.length, MUTATION_KINDS.length, 'blocked proposals are reported, not dropped')
  assert.deepEqual(
    out.map((m) => m.status),
    ['already-decided', 'fresh', 'conflicts-with-scope', 'fresh', 'fresh'],
    'each with its own reason',
  )
  assert.deepEqual(out.map((m) => m.spec.version), [2, 3, 4, 5, 6], 'and every applicable kind keeps a version number')
  assert.equal(out.filter((m) => m.status === 'fresh').length, 3, 'max caps the fresh ones, not the list')
  ok('blocked proposals are listed with reasons instead of disappearing')
}

function harness(config = {}) {
  const dir = campaignDir()
  const ledger = new Ledger(join(dir, 'events.jsonl'))
  const events = []
  const views = new Map()
  const runtime = {
    create(opts) {
      const id = opts.id || 'auto'
      const view = { id, dir, ledger, state: null }
      views.set(id, view)
      runtime.append(view, 'campaign.created', {
        id,
        objective: opts.objective,
        workspace: opts.workspace ?? null,
        budget: opts.budget || {},
        actor: opts.actor || 'human',
      })
      return view
    },
    append(view, type, data, actor = 'system') {
      view.ledger.append(type, data, actor)
      view.state = reduce(view.ledger.all(), view.id)
      events.push({ type, data })
      return view.state
    },
    get(id) { return views.get(id) },
    listCampaigns() { return [...views.keys()] },
    ensureOwner() { return true },
    enabled() { return true },
    switchState() { return { enabled: true, at: null, by: 'config', reason: 'default' } },
  }
  const tools = new Map()
  const ctx = {
    effect(fn) { fn(); return () => {} },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
    get: () => undefined,
  }
  registerTools(ctx, { runtime, config: { verify: { timeoutMs: 30_000 }, ...config } })
  return { dir, runtime, tools, events, views }
}

function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'loom-dec-'))
  const prior = process.env.LOOM_HOME
  process.env.LOOM_HOME = home
  try {
    return fn(home)
  } finally {
    if (prior === undefined) delete process.env.LOOM_HOME
    else process.env.LOOM_HOME = prior
  }
}

const v1 = {
  name: 'code-fix',
  version: 1,
  params: { candidates: 2 },
  nodes: [{ id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', prompt: 'do it' } }],
}

// 5. Through the tool: a recorded decision and a scoped task both remove a proposal
//    from the ledger, and the answer says what was held back and why.
{
  const answer = await withHome((home) => {
    writeFileSync(join(home, 'decisions.json'), JSON.stringify([{ kind: 'candidates+1', decision: 'reject:budget-mismatch', at: '2026-11-14T00:00:00Z' }]))
    const h = harness()
    const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
    h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
    h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
    h.runtime.append(view, 'evalset.registered', {
      tasks: [{ id: 'mut-x', prompt: 'p', verify: { cmd: 'node x.mjs', scope: { editable: ['tests/x.test.mjs'] } } }],
    }, 'human')
    return h.tools.get('rsi_chain').execute({ id: 'c', action: 'auto' })
  })
  // Two kinds are blocked and the cap is three fresh, so the three that remain
  // are offered -- the fifth kind took the slot that used to be empty.
  assert.deepEqual(
    answer.proposed.map((p) => p.kind),
    ['minimal-change', 'state-your-uncertainty', 'research-on-stuck'],
    'only the fresh hypotheses are offered, up to the cap',
  )
  assert.equal(answer.proposed[0].version, 3, 'and their versions keep their place in the menu')
  assert.deepEqual(answer.blocked.map((b) => b.kind).sort(), ['candidates+1', 'no-test-edits'], 'both blocked kinds are reported')
  assert.equal(answer.blocked.find((b) => b.kind === 'candidates+1').status, 'already-decided', 'one because it was measured')
  assert.equal(answer.blocked.find((b) => b.kind === 'no-test-edits').status, 'conflicts-with-scope', 'the other because the tasks deliver test edits')
  ok('rsi_chain auto holds back what the loop already knows, and says so')
}

// 6. The same campaign with no decision record still gets the full menu: the guard
//    annotates, it never silently narrows the search space.
{
  const answer = await withHome(() => {
    const h = harness()
    const view = h.runtime.create({ id: 'c', objective: 'o', workspace: h.dir })
    h.runtime.append(view, 'chain.proposed', { version: 1, spec: v1 }, 'system')
    h.runtime.append(view, 'chain.activated', { version: 1 }, 'system')
    return h.tools.get('rsi_chain').execute({ id: 'c', action: 'auto' })
  })
  assert.deepEqual(answer.proposed.map((p) => p.kind), ['candidates+1', 'minimal-change', 'no-test-edits'], 'nothing blocked without a record')
  assert.deepEqual(answer.blocked, [], 'and nothing is held back')
  ok('without a decision record the proposer offers the whole menu')
}

done()
