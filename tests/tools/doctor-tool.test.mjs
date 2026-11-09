// `doctor()` exists in src/runtime/doctor.js and answers the first question any
// new user actually has — "is this machine set up for the loop?" — but no tool
// exposes it. The capability is real and unreachable, which is the same failure
// as a missing one: the operator cannot act on it.
//
// Required:
//   - a `rsi_doctor` tool is registered next to the other rsi_* tools;
//   - it runs the doctor against the campaign's workspace when one is named, and
//     against the arguments it was given when none is;
//   - it reports `{ok, checks}` unchanged (id/ok/detail/fix per check) so the
//     reader can act on the failing check instead of a wall of prose;
//   - a missing workspace is a named failure, not a crash: calling it with no
//     campaigns and no workspace must still return a report whose first failing
//     check says what to do.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { registerTools } from '../../src/tools/index.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const registered = new Map()
const ctx = {
  get: (name) => (name === 'tools' ? ctx.tools : null),
  tools: {
    register(def) {
      registered.set(def.name, def)
      return () => registered.delete(def.name)
    },
    get: (n) => registered.get(n),
    schemas: () => [...registered.values()].map(({ name }) => ({ name })),
  },
  effect(fn) {
    const out = fn()
    return () => {
      if (typeof out === 'function') out()
    }
  },
}

function campaign(id, workspace) {
  return {
    state: {
      id,
      status: 'running',
      objective: 'x',
      workspace,
      rounds: [],
      budget: { spentUsd: 0, rounds: 0, usd: 5, minutes: 60 },
      chain: { activeVersion: 1 },
      checkpoints: [],
      evalset: { tasks: [], holdout: [] },
      lessons: [],
    },
    dir: null,
  }
}

const root = mkdtempSync(join(tmpdir(), 'loom-doctor-tool-'))
const runtimeHome = join(root, 'home')
mkdirSync(runtimeHome, { recursive: true })
const campaigns = new Map()
const runtime = {
  home: runtimeHome,
  config: { budget: {}, session: {} },
  listCampaigns: () => [...campaigns.keys()],
  get: (id) => {
    const found = campaigns.get(String(id))
    if (!found) throw new Error(`no campaign ${id}`)
    return found
  },
  open: (id) => runtime.get(id),
  ownership: () => ({ mine: true, owner: null }),
  ensureOwner: () => true,
}

registerTools(ctx, { runtime, config: {} })

{
  assert.ok(registered.has('rsi_doctor'), 'rsi_doctor is registered next to the other tools')
}
ok('the capability is reachable from the tool surface')

{
  const tool = registered.get('rsi_doctor')
  assert.ok(tool && typeof tool.execute === 'function', 'it is a real tool with an execute')
  const params = tool.parameters || {}
  assert.equal(params.type, 'object', 'it takes an object schema like every other tool')
  assert.ok(params.properties && params.properties.workspace, 'it can be pointed at a workspace')
}
ok('the tool declares the arguments a caller needs')

{
  // A real git repo that is dirty: the doctor must name the uncommitted paths and
  // tell the operator how to clear them, and the tool must pass that through.
  const { execFileSync } = await import('node:child_process')
  const repo = join(root, 'repo')
  mkdirSync(repo, { recursive: true })
  execFileSync('git', ['-C', repo, 'init', '-q'])
  execFileSync('git', ['-C', repo, 'config', 'user.email', 'loom@local'])
  execFileSync('git', ['-C', repo, 'config', 'user.name', 'dsh-loom'])
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(repo, 'keep.txt'), 'keep\n')
  execFileSync('git', ['-C', repo, 'add', '-A'])
  execFileSync('git', ['-C', repo, 'commit', '-q', '-m', 'base'])
  writeFileSync(join(repo, 'keep.txt'), 'changed\n')

  campaigns.set('doc-a', campaign('doc-a', repo))
  const tool = registered.get('rsi_doctor')
  const result = await tool.execute({ id: 'doc-a' }, { deferContext() {}, concludeTurn() {} })
  assert.ok(result && Array.isArray(result.checks), 'the report carries the checks')
  assert.equal(result.ok, false, 'a dirty workspace is not ok')
  const dirty = result.checks.find((c) => c.id === 'workspace-clean')
  assert.ok(dirty, 'the dirty check is present')
  assert.equal(dirty.ok, false, 'and it failed')
  assert.match(String(dirty.detail), /keep\.txt/, 'it names the offending path')
  assert.ok(String(dirty.fix).length > 0, 'and it says what to do about it')
  assert.equal(result.id, 'doc-a', 'the report says which campaign it checked')
  assert.equal(result.workspace, repo, 'and which workspace')
}
ok('it runs against the named campaign and passes the findings through')

{
  // No campaign, no workspace: still a report, and the failure names the gap.
  campaigns.clear()
  const tool = registered.get('rsi_doctor')
  const result = await tool.execute({}, { deferContext() {}, concludeTurn() {} })
  assert.ok(result && Array.isArray(result.checks), 'a report still comes back')
  assert.equal(result.ok, false, 'with nothing to check it cannot be ok')
  const repoCheck = result.checks.find((c) => c.id === 'git-repo')
  assert.ok(repoCheck, 'the first check is the one that needs a workspace')
  assert.equal(repoCheck.ok, false, 'and it failed')
  assert.match(String(repoCheck.fix), /\S/, 'with a concrete fix')
  assert.equal(result.workspace ?? null, null, 'no workspace is reported as null, not as a guess')
}
ok('a missing workspace is a named failure, not a crash')

{
  const tool = registered.get('rsi_doctor')
  const result = await tool.execute({ workspace: join(root, 'nope') }, { deferContext() {}, concludeTurn() {} })
  assert.equal(result.ok, false, 'a directory that is not a repo is not ok')
  const repoCheck = result.checks.find((c) => c.id === 'git-repo')
  assert.equal(repoCheck.ok, false, 'and the git check is the one that says so')
}
ok('an explicit workspace argument is honoured')

rmSync(root, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
