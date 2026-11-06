// Spec: pending human decisions must be ranked, not dumped.
//
// Why: overnight the queue showed holds, holdout regressions, empty-patch anomalies
// and chain proposals in the order they were raised, so the human had to read every
// payload to find the one that actually risked breaking the workspace. A reviewer
// needs "what is most dangerous" first, plus a one-line recommendation.
//
// Contract:
//   src/runtime/review.js  exports reviewQueue(state)
//     -> [{ id, kind, risk: 'high'|'normal'|'low', summary, recommendation }]
//   Ordering: risk desc (high -> low), then raisedAt asc (oldest first), then id.
//   Summary must be a single line (no newlines) and <= 160 chars.
//   recommendation is a short verb phrase, never empty.
//   rsi_status must render one line per pending review with its risk and id.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reviewQueue } from '../../src/runtime/review.js';

function stateWith(items) {
  return {
    id: 'review-campaign',
    openCheckpoints: items.map((c, i) => ({ at: i + 1, ...c })),
  };
}

test('risky decisions sort above routine ones', () => {
  const q = reviewQueue(stateWith([
    { id: 'cp-1', kind: 'gate', payload: { round: 1, score: 0.9 } },
    { id: 'cp-2', kind: 'holdout', payload: { task: 'suite', detail: 'regressed' } },
    { id: 'cp-3', kind: 'anomaly', payload: { message: 'workspace dirty' } },
    { id: 'cp-4', kind: 'policy', payload: { policyVersion: 2 } },
    { id: 'cp-5', kind: 'plateau', payload: { window: 3 } },
  ]));
  assert.deepEqual(q.map((x) => x.id), ['cp-2', 'cp-3', 'cp-1', 'cp-4', 'cp-5']);
  assert.deepEqual(q.map((x) => x.risk), ['high', 'high', 'normal', 'normal', 'low']);
});

test('every entry carries a single-line summary and a recommendation', () => {
  const q = reviewQueue(stateWith([
    { id: 'cp-9', kind: 'gate', payload: { round: 4, score: 0.8, patch: 'artifacts/r4a1.patch' } },
    { id: 'cp-10', kind: 'anomaly', payload: { message: 'apply failed\nsecond line of noise' } },
  ]));
  for (const item of q) {
    assert.equal(typeof item.summary, 'string');
    assert.ok(item.summary.length > 0 && item.summary.length <= 160, `summary too long: ${item.summary}`);
    assert.equal(/[\r\n]/.test(item.summary), false, 'summary must be one line');
    assert.equal(typeof item.recommendation, 'string');
    assert.ok(item.recommendation.length > 0);
  }
});

test('ties keep the oldest decision first', () => {
  const q = reviewQueue({
    id: 'c',
    openCheckpoints: [
      { id: 'cp-b', kind: 'gate', at: 20, payload: {} },
      { id: 'cp-a', kind: 'gate', at: 10, payload: {} },
    ],
  });
  assert.deepEqual(q.map((x) => x.id), ['cp-a', 'cp-b']);
});

test('an empty queue is an empty array', () => {
  assert.deepEqual(reviewQueue({ id: 'c', openCheckpoints: [] }), []);
  assert.deepEqual(reviewQueue({ id: 'c' }), []);
});

test('rsi_status renders the ranked queue', async () => {
  const { registerTools } = await import('../../src/tools/index.js');
  const defs = new Map();
  const ctx = {
    tools: { register: (d) => { defs.set(d.name, d); return () => {}; } },
    effect: (fn) => fn(),
    get: () => undefined,
    agents: {},
  };
  const state = {
    id: 'review-campaign',
    status: 'running',
    objective: 'rank the queue',
    workspace: 'C:/tmp/repo',
    rounds: [],
    budget: { usd: 5, rounds: 12, minutes: 60 },
    chain: { active: 1, versions: [] },
    evalset: { tasks: [], holdout: [] },
    openCheckpoints: [
      { id: 'cp-x', kind: 'holdout', at: 2, payload: { task: 'suite' } },
      { id: 'cp-y', kind: 'plateau', at: 3, payload: {} },
    ],
  };
  const runtime = {
    listCampaigns: () => ['review-campaign'],
    open: () => ({ state, dir: 'C:/tmp/loom' }),
    status: () => ({
      id: state.id,
      status: 'running',
      rounds: 0,
      spendUsd: 0,
      openCheckpoints: state.openCheckpoints,
    }),
    liveAttempts: () => [],
    ensureOwner: () => true,
  };
  registerTools(ctx, { runtime, config: { paths: {} } });
  const out = await defs.get('rsi_status').execute({ id: 'review-campaign' }, {});
  const text = typeof out === 'string' ? out : (out.text ?? JSON.stringify(out));
  assert.match(text, /cp-x/);
  assert.match(text, /high/);
  assert.ok(text.indexOf('cp-x') < text.indexOf('cp-y'), 'high risk must be printed first');
});
