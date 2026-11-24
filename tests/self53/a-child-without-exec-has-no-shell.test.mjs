// A task that never says it needs a shell does not get one.
//
// The host offers no per-child capability list: `AgentOptions` is
// provider/model/effort/tokens, and `SubagentStartRequest` has no tool field.
// So the only honest place to put this rule is the tool pipeline — the round
// registers the child session it just started, and a guard registered in the
// plugin's apply() refuses shell tools for that session. This spec pins the
// decision, the registry semantics, and the two wirings; the arithmetic of
// "which tools count as a shell" is pinned separately so adding a name is a
// deliberate edit rather than an accident.
//
// Default mode is `allow`, which must stay byte-identical to today: a guard
// that denied children it was never told about would break the operator's own
// session, so an unregistered session always delegates.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  SHELL_TOOLS,
  declaresExec,
  privilegesFor,
  createPrivilegeRegistry,
  shellPrivileges,
} from '../../src/dispatch/privilege.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// --- the decision -----------------------------------------------------------

{
  const declared = privilegesFor({ id: 't1', exec: true }, { session: { workerShell: 'declared' } })
  const silent = privilegesFor({ id: 't2' }, { session: { workerShell: 'declared' } })
  assert.equal(declared.shell, true)
  assert.equal(silent.shell, false)
  assert.match(silent.reason, /does not declare exec/i)
  // The record has to say which mode produced it: an attempt read later cannot
  // reconstruct what the config said at the time.
  assert.equal(silent.mode, 'declared')
  ok('a task that does not declare exec gets no shell under the declared policy')
}

{
  // Two spellings, because the eval set is hand-written JSON and both appear.
  assert.equal(declaresExec({ exec: true }), true)
  assert.equal(declaresExec({ verify: { cmd: 'node check.mjs', exec: true } }), true)
  assert.equal(declaresExec({ verify: { cmd: 'node check.mjs' } }), false)
  assert.equal(declaresExec({ exec: 'yes' }), false)
  assert.equal(declaresExec(null), false)
  ok('exec is declared by a boolean in either of the two places it has been written')
}

{
  // The default must be exactly today's behaviour, including the reason string
  // saying so, so a reader of an allow-mode attempt is not left guessing.
  const allowed = privilegesFor({ id: 't1' }, {})
  assert.equal(allowed.shell, true)
  assert.equal(allowed.mode, 'allow')
  assert.match(allowed.reason, /allow/i)
  // An old config with no session block at all is the same answer, not a crash.
  assert.equal(privilegesFor({ id: 't1' }, undefined).shell, true)
  const denied = privilegesFor({ id: 't1', exec: true }, { session: { workerShell: 'deny' } })
  assert.equal(denied.shell, false)
  assert.equal(denied.mode, 'deny')
  ok('allow is the default and deny refuses even a task that asked for a shell')
}

// --- the registry -----------------------------------------------------------

{
  const registry = createPrivilegeRegistry()
  // Unregistered sessions are not this plugin's business.
  assert.equal(registry.decision('someone-else', 'bash'), undefined)
  const id = registry.deny('child-1', 'the task does not declare exec')
  assert.equal(id, 'child-1')
  assert.equal(registry.size(), 1)
  assert.ok(registry.has('child-1'))
  // A registered child loses shell tools and keeps everything else.
  assert.match(registry.decision('child-1', 'bash'), /does not declare exec/)
  assert.match(registry.decision('child-1', 'ops_bash'), /does not declare exec/)
  assert.equal(registry.decision('child-1', 'read'), undefined)
  assert.equal(registry.decision('child-1', 'apply_patch'), undefined)
  // Release is what the round calls when the attempt's session ends, whether it
  // succeeded or not: a leaked denial would refuse a later attempt's shell.
  assert.equal(registry.release('child-1'), true)
  assert.equal(registry.has('child-1'), false)
  assert.equal(registry.decision('child-1', 'bash'), undefined)
  assert.equal(registry.release('child-1'), false)
  ok('a registered child loses shell tools, keeps file tools, and is released')
}

{
  // Empty ids are not a session: a host that has not started the child yet must
  // not become a key that refuses everything named `undefined`.
  const registry = createPrivilegeRegistry()
  assert.equal(registry.deny(null, 'x'), null)
  assert.equal(registry.deny('', 'x'), null)
  assert.equal(registry.size(), 0)
  assert.equal(registry.decision(undefined, 'bash'), undefined)
  ok('a missing session id never becomes a registry key')
}

{
  assert.ok(SHELL_TOOLS.includes('bash'))
  assert.ok(SHELL_TOOLS.includes('ops_bash'))
  assert.ok(!SHELL_TOOLS.includes('read'))
  assert.ok(!SHELL_TOOLS.includes('apply_patch'))
  ok('the shell list names command runners and not file tools')
}

// --- the two wirings --------------------------------------------------------

{
  const index = read('src/index.js')
  // The guard is the enforcement: no field on the request reaches it, so it has
  // to be installed where the plugin owns the tool pipeline.
  assert.match(index, /tools\.guard\(/)
  assert.match(index, /shellPrivileges/)
  ok('the plugin installs the guard that enforces the decision')
}

{
  const round = read('src/runtime/round.js')
  // Registered on the child the host just handed back, not on the attempt id:
  // the guard only ever sees the session id.
  assert.match(round, /shellPrivileges\.deny\(/)
  assert.match(round, /shellPrivileges\.release\(/)
  // And the attempt says which way it went, so a refused shell is evidence.
  assert.match(round, /privileges/)
  ok('the round registers the child session and records the decision')
}

// --- one real round ---------------------------------------------------------

{
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { execFileSync } = await import('node:child_process')
  const { tmpdir } = await import('node:os')
  const { runRound } = await import('../../src/runtime/round.js')
  const { makeRuntime, baseConfig, chainSpec } = await import('../self22/fixture.mjs')

  const dir = mkdtempSync(join(tmpdir(), 'rsi-priv-'))
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'rsi@local')
  git('config', 'user.name', 'rsi')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'note.txt'), 'base\n')
  git('add', '-A')
  git('commit', '-qm', 'base')

  const task = { id: 't1', prompt: 'Write note.txt.', verify: { cmd: 'node -e "0"' } }
  const spec = chainSpec({ candidates: 1 })
  const { runtime, view } = makeRuntime({ repo: dir, tasks: [task], spec })

  // The dispatcher plays the host: it hands back a child id through onStart and
  // asks the guard itself, in the order a real turn does.
  const seen = []
  const dispatcher = {
    run: async (brief, opts = {}) => {
      if (opts.onStart) opts.onStart({ sessionId: 'child-abc', abort: () => {}, deadline: Date.now() + 60_000 })
      seen.push({ ordered: opts.label ?? 'attempt', shell: shellPrivileges.decision('child-abc', 'bash'), file: shellPrivileges.decision('child-abc', 'read') })
      return { sessionId: 'child-abc', text: 'did it', stopReason: 'completed' }
    },
  }
  const config = baseConfig({ session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, workerShell: 'declared' } })
  await runRound({ runtime, view, config, dispatcher, log: () => {}, notify: () => {} })
  // The attempt record carries the decision, so a refusal is evidence rather
  // than something a reader has to infer from a tool error that never happened.
  const attempt = runtime.events.find((e) => e.type === 'attempt.finished' && !e.data?.screenedOut)?.data
  assert.ok(attempt, `no attempt record: ${runtime.events.map((e) => e.type).join(',')}`)
  assert.equal(attempt.privileges.mode, 'declared')
  assert.equal(attempt.privileges.shell, false)
  assert.ok(seen.length >= 1, 'the round dispatched something')
  const first = seen[0]
  assert.match(String(first.shell), /does not declare exec/)
  assert.equal(first.file, undefined)
  // After the round the denial is gone: a leaked key would refuse the next
  // attempt that happened to reuse the session id.
  assert.equal(shellPrivileges.has('child-abc'), false)
  ok('a round under the declared policy refuses the shell and releases the child')
}

console.log(`${pass} ok`)
