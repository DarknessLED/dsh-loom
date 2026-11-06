// Spec: the panel must show what needs a decision without opening the campaign.
//
// Why: the sidebar panel is what the human actually sees while working. After the
// ranked review queue landed, the panel still showed only counters, so the riskiest
// pending decision was invisible until rsi_status was run in the chat.
//
// Contract:
//   panelState() rows gain `reviews`: up to 3 entries, shape
//     { id, kind, risk, summary }  (same fields and ordering as reviewQueue)
//   The list must be empty for a campaign with no open checkpoints.
//   A campaign row keeps `open` as the numeric count so the UI can still badge it.
//   Sorting of campaigns must not change (needs-human first, then updatedAt desc).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { panelState } from '../../src/panel/api.js';

function viewWith(checkpoints) {
  const state = {
    id: 'panel-campaign',
    status: 'running',
    objective: 'surface the risky decision',
    workspace: 'C:/tmp/repo',
    rounds: [],
    budget: { usd: 5, rounds: 12 },
    chain: { active: 1, versions: [] },
    evalset: { tasks: [], holdout: [] },
    openCheckpoints: checkpoints,
  };
  return {
    state,
    dir: 'C:/tmp/loom',
    lastRound: null,
  };
}

function runtimeFor(views) {
  return {
    listCampaigns: () => Object.keys(views),
    open: (id) => views[id],
    liveAttempts: () => [],
    ensureOwner: () => true,
  };
}

test('rows carry the ranked review list', () => {
  const views = {
    c1: viewWith([
      { id: 'cp-a', kind: 'gate', at: 1, payload: { round: 1 } },
      { id: 'cp-b', kind: 'anomaly', at: 2, payload: { message: 'workspace dirty' } },
    ]),
  };
  const out = panelState({ runtime: runtimeFor(views) });
  const row = out.campaigns.find((c) => c.id === 'c1');
  assert.ok(row, 'row must exist');
  assert.equal(row.open, 2, 'open must stay a count');
  assert.equal(row.reviews.length, 2);
  assert.equal(row.reviews[0].id, 'cp-b', 'highest risk first');
  assert.equal(row.reviews[0].risk, 'high');
  for (const item of row.reviews) {
    assert.equal(typeof item.summary, 'string');
    assert.ok(item.summary.length > 0);
    assert.ok(item.summary.length <= 160);
    assert.equal(/[\r\n]/.test(item.summary), false);
  }
});

test('at most three reviews are shipped to the panel', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({
    id: `cp-${i}`,
    kind: i === 1 ? 'holdout' : 'gate',
    at: i,
    payload: { round: i },
  }));
  const out = panelState({ runtime: runtimeFor({ c1: viewWith(many) }) });
  const row = out.campaigns.find((c) => c.id === 'c1');
  assert.equal(row.open, 6);
  assert.equal(row.reviews.length, 3);
  assert.equal(row.reviews[0].kind, 'holdout');
});

test('a quiet campaign ships an empty review list', () => {
  const out = panelState({ runtime: runtimeFor({ c1: viewWith([]) }) });
  const row = out.campaigns.find((c) => c.id === 'c1');
  assert.deepEqual(row.reviews, []);
  assert.equal(row.open, 0);
});
