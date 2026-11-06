// Spec: the human needs a 30-second catch-up, not a ledger dump.
//
// Why: overnight the only human-facing artefacts were rsi_status (hundreds of lines
// with stdout tails) and rsi_dashboard (one table row per campaign). Neither says
// "what changed since you last looked, and what is waiting for you". A digest is the
// piece that makes the human-in-the-loop actually loop.
//
// Contract:
//   src/report/digest.js  exports campaignDigest(state, opts?)
//     opts: { rounds = 5 }
//     -> string, at most MAX lines (see below), each line <= 120 chars
//   Shape:  header line  : "<id> [<status>] round <n> · <verdict> · <spend summary>"
//           round lines  : one per recent round, newest first, "<n> <taskId> <score|-> <status>"
//           review lines : "- <risk> <id>: <summary>" for pending checkpoints (max 3)
//           lesson line  : "lessons: <count> active, <quarantined> quarantined" (only if any)
//   Rules:  no stdout/stderr tails, no patch bodies, no JSON blobs, no blank-line spam.
//           Empty state must still produce a valid one-line header.
//   rsi_report must include that digest at the top of its output.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { campaignDigest, DIGEST_MAX_LINES } from '../../src/report/digest.js';

function fixture() {
  return {
    id: 'digest-campaign',
    status: 'running',
    objective: 'keep the human in the loop cheaply',
    workspace: 'C:/tmp/repo',
    budget: { usd: 5, rounds: 20 },
    chain: { active: 1, versions: [] },
    evalset: { tasks: [{ id: 'a' }, { id: 'b' }], holdout: [] },
    openCheckpoints: [
      { id: 'cp-1', kind: 'holdout', at: 5, payload: { task: 'suite' } },
      { id: 'cp-2', kind: 'gate', at: 6, payload: { round: 3 } },
    ],
    lessons: [
      { id: 'lsn-x', status: 'active', claim: 'x' },
      { id: 'lsn-y', status: 'quarantined', claim: 'y' },
    ],
    rounds: [
      { n: 1, taskId: 'a', status: 'promoted', attempts: [{ id: 'r1a1', score: 1 }] },
      { n: 2, taskId: 'b', status: 'no-gain', attempts: [{ id: 'r2a1', score: 0.4 }] },
      { n: 3, taskId: 'a', status: 'error', attempts: [] },
    ],
  };
}

test('the digest is short, line-bounded and readable', () => {
  const text = campaignDigest(fixture(), { rounds: 5 });
  const lines = text.split('\n');
  assert.ok(lines.length <= DIGEST_MAX_LINES, `too many lines: ${lines.length}`);
  for (const line of lines) assert.ok(line.length <= 120, `line too long: ${line}`);
  assert.match(lines[0], /digest-campaign/);
  assert.match(lines[0], /running/);
  assert.match(lines[0], /round 3/);
});

test('recent rounds come newest first and keep scores honest', () => {
  const lines = campaignDigest(fixture(), { rounds: 2 }).split('\n');
  const r3 = lines.findIndex((l) => /^3\s+a\s/.test(l));
  const r2 = lines.findIndex((l) => /^2\s+b\s/.test(l));
  assert.ok(r3 >= 0 && r2 >= 0, 'round lines must be present');
  assert.ok(r3 < r2, 'newest round must be printed first');
  assert.match(lines[r2], /0\.4/);
  assert.doesNotMatch(campaignDigest(fixture(), { rounds: 2 }), /^1\s+a\s/m, 'old rounds are trimmed');
});

test('pending reviews surface with risk, worst first, capped at three', () => {
  const text = campaignDigest(fixture());
  assert.match(text, /cp-1/);
  assert.match(text, /high/);
  assert.ok(text.indexOf('cp-1') < text.indexOf('cp-2'), 'high risk first');
});

test('counts stay visible but quarantined lessons are named as such', () => {
  const text = campaignDigest(fixture());
  assert.match(text, /lessons: 1 active/);
  assert.match(text, /1 quarantined/);
});

test('no tails, blobs or blank-line spam leak into the digest', () => {
  const noisy = fixture();
  noisy.rounds[1].attempts[0].stdoutTail = 'x'.repeat(4000);
  noisy.rounds[1].attempts[0].patch = 'artifacts/r2a1.patch';
  const text = campaignDigest(noisy);
  assert.doesNotMatch(text, /x{200}/);
  assert.doesNotMatch(text, /\{"|\[\{/);
  assert.doesNotMatch(text, /\n\s*\n\s*\n/);
});

test('an empty campaign still yields a one-line header', () => {
  const text = campaignDigest({ id: 'bare', status: 'planning', rounds: [] });
  const lines = text.split('\n').filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /bare/);
});

test('rsi_report starts with the digest', async () => {
  const { registerTools } = await import('../../src/tools/index.js');
  const defs = new Map();
  const ctx = {
    tools: { register: (d) => { defs.set(d.name, d); return () => {}; } },
    effect: (fn) => fn(),
    get: () => undefined,
    agents: {},
  };
  const state = fixture();
  const runtime = {
    listCampaigns: () => ['digest-campaign'],
    open: () => ({ state, dir: 'C:/tmp/loom' }),
    status: () => ({ id: state.id, status: 'running', rounds: 3, spendUsd: 0 }),
    ensureOwner: () => true,
  };
  registerTools(ctx, { runtime, config: { paths: {} } });
  const out = await defs.get('rsi_report').execute({ id: 'digest-campaign' }, {});
  const text = typeof out === 'string' ? out : JSON.stringify(out);
  assert.match(text, /digest-campaign \[running\]/);
});
