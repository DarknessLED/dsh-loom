// Spec: a campaign must be exportable as one self-contained, replayable bundle.
//
// Why: the whole point of keeping an append-only ledger plus real patches is that a
// third party (or the human, on another machine) can re-derive what happened. Today
// the evidence only exists as loose files under ~/.dsh/loom, so nothing can be
// archived, diffed, or attached to a report.
//
// Contract:
//   src/report/export.js  exports exportBundle({ state, view, config })
//     -> {
//          schema: 'loom.bundle/1',
//          created: <number>,
//          campaign: { id, objective, workspace },
//          chain:    <active chain spec or null>,
//          policy:   <effective policy or null>,
//          evalset:  { tasks: [...], holdout: [...] },
//          artifacts: [{ round, attemptId, score, patch, landed }],
//          rounds:   <number>,
//        }
//   JSON.stringify(bundle) must round-trip: no functions, no undefined-only noise,
//   and the artifact list must describe every attempt that actually landed.
//   The rsi_export tool writes that bundle to <campaign dir>/export/bundle.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { exportBundle } from '../../src/report/export.js';

function stateFixture() {
  return {
    id: 'bundle-campaign',
    objective: 'make the bundle carry the whole story',
    workspace: 'C:/tmp/repo',
    chain: { active: 2, versions: [{ version: 1 }, { version: 2, spec: { name: 'code-fix', version: 2 } }] },
    policy: { version: 1, status: 'promoted', policy: { minGain: 0.05, candidates: 3 } },
    evalset: { tasks: [{ id: 'a', family: 'f' }, { id: 'b', family: 'f' }], holdout: ['h'] },
    rounds: [
      { n: 1, status: 'promoted', landed: true, promotedAttemptId: 'r1a1', attempts: [{ id: 'r1a1', score: 1, patch: 'artifacts/r1a1.patch' }] },
      { n: 2, status: 'no-gain', attempts: [{ id: 'r2a1', score: 0.4, patch: 'artifacts/r2a1.patch' }] },
      { n: 3, status: 'promoted', landed: true, promotedAttemptId: 'r3a2', attempts: [{ id: 'r3a1', score: 0.2, patch: null }, { id: 'r3a2', score: 0.9, patch: 'artifacts/r3a2.patch' }] },
    ],
  };
}

test('exportBundle wraps the campaign into a versioned bundle', () => {
  const bundle = exportBundle({ state: stateFixture(), view: { dir: 'C:/tmp/loom' }, config: {} });
  assert.equal(bundle.schema, 'loom.bundle/1');
  assert.equal(bundle.campaign.id, 'bundle-campaign');
  assert.equal(bundle.campaign.workspace, 'C:/tmp/repo');
  assert.equal(typeof bundle.created, 'number');
  assert.deepEqual(bundle.evalset.holdout, ['h']);
  assert.equal(bundle.rounds, 3);
});

test('only landed artifacts are exported, with their patch and score', () => {
  const bundle = exportBundle({ state: stateFixture(), view: { dir: 'C:/tmp/loom' }, config: {} });
  assert.equal(bundle.artifacts.length, 2);
  assert.deepEqual(bundle.artifacts.map((a) => a.attemptId), ['r1a1', 'r3a2']);
  assert.equal(bundle.artifacts[1].round, 3);
  assert.equal(bundle.artifacts[1].score, 0.9);
  assert.equal(bundle.artifacts[1].patch, 'artifacts/r3a2.patch');
  assert.equal(bundle.artifacts.every((a) => a.landed === true), true);
});

test('the bundle is JSON-serialisable and stable across stringify', () => {
  const bundle = exportBundle({ state: stateFixture(), view: { dir: 'C:/tmp/loom' }, config: {} });
  const text = JSON.stringify(bundle);
  assert.match(text, /loom\.bundle\/1/);
  const again = JSON.parse(text);
  assert.deepEqual(again.artifacts, bundle.artifacts);
  assert.equal(again.chain.version, 2);
});

test('a campaign with no rounds still exports a valid bundle', () => {
  const empty = { ...stateFixture(), rounds: [] };
  const bundle = exportBundle({ state: empty, view: { dir: 'C:/tmp/loom' }, config: {} });
  assert.equal(bundle.schema, 'loom.bundle/1');
  assert.deepEqual(bundle.artifacts, []);
  assert.equal(bundle.rounds, 0);
});

test('rsi_export writes the bundle next to the campaign', async () => {
  const { registerTools } = await import('../../src/tools/index.js');
  const dir = mkdtempSync(join(tmpdir(), 'loom-export-'));
  const state = stateFixture();
  const writes = [];
  const defs = new Map();
  const ctx = {
    tools: { register: (d) => { defs.set(d.name, d); return () => {}; } },
    effect: (fn) => fn(),
    get: () => undefined,
    agents: {},
  };
  const runtime = {
    listCampaigns: () => ['bundle-campaign'],
    open: () => ({ state, dir }),
    status: () => ({ id: state.id }),
    append: (view, type, data) => writes.push({ type, data }),
    ensureOwner: () => true,
  };
  registerTools(ctx, { runtime, config: { paths: {} } });
  const def = defs.get('rsi_export');
  assert.ok(def, 'rsi_export tool must be registered');
  const out = await def.execute({ id: 'bundle-campaign', outDir: dir }, {});
  assert.equal(out.written, true);
  assert.ok(existsSync(out.path), 'bundle file must exist');
  const parsed = JSON.parse(readFileSync(out.path, 'utf8'));
  assert.equal(parsed.schema, 'loom.bundle/1');
  assert.equal(parsed.artifacts.length, 2);
});
