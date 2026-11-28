// The two pills write install-level settings, and a broken file never flips one.
//
// The RSI pill is not a setting: it is the master switch (`switch.json`), and it
// already has a door (`action: "enable" | "disable"`). The dispatch pill is a
// setting in the same sense as planning: the default for campaigns that say
// nothing about their workflow, owned by the operator, audited in its own log.
//
// The rule the settings file was built to keep applies unchanged: a missing file
// means "never set" and the configured default applies; an unreadable one answers
// `null` with a reason instead of quietly turning behaviour on.
//   node tests/self58/the-dispatch-toggle-is-a-setting.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readSettings, settingsLogPath, settingsPath, writeSettings } from '../../src/core/settings.js'
import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { panelAction, panelState } from '../../src/panel/api.js'
import { ok, done } from '../chaos/fixture.mjs'

const home = () => mkdtempSync(join(tmpdir(), 'loom-dispatch-'))

// A runtime stub is enough: neither action reads campaign state, which is the
// point -- a panel with zero campaigns must still be able to turn these off.
function runtimeStub(h) {
  return {
    home: h,
    listCampaigns: () => [],
    get: () => {
      throw new Error('no campaign should be resolved for an install-level action')
    },
    ensureOwner: () => true,
    enabled: () => true,
    switchState: () => ({ enabled: true, at: null, by: 'config', reason: 'default' }),
    setEnabled: (enabled, opts) => ({ enabled: enabled !== false, at: 1, by: opts?.by ?? 'human' }),
    settingsState: () => readSettings(h),
    setSettings(patch, opts = {}) {
      writeSettings(h, patch, { by: 'human:panel', ...opts })
      return readSettings(h)
    },
  }
}

// 1. Off by default, and the dispatch block is in the state the panel polls.
{
  assert.equal(DEFAULT_CONFIG.session.dispatch.enabled, false, 'shipped default is off')
  const h = home()
  const state = panelState({ runtime: runtimeStub(h), config: DEFAULT_CONFIG })
  assert.equal(state.dispatch.enabled, false, 'the panel can see the switch')
  assert.equal(state.dispatch.by, 'config', 'and where the answer came from')
  assert.deepEqual(
    state.dispatch.stages,
    ['triage', 'spec', 'implement', 'verify', 'review'],
    'with the five measured stages it will plan, in pipeline order',
  )
  // The tooltip may name an arm per stage, so the panel has to carry the same
  // arms the plan would hand a child -- otherwise the switch promises one thing
  // and the round records another.
  assert.deepEqual(
    state.dispatch.arms,
    { triage: 'dsh', spec: 'cc', implement: 'codex', verify: 'gcli', review: 'agy' },
    'and the arm a bench measured each stage wants',
  )
  ok('the dispatch switch is visible in the panel state and off by default')
}

// 2. The pill writes, the audit line names the operator, and the poll reflects it.
{
  const h = home()
  const runtime = runtimeStub(h)
  const out = panelAction({ runtime, config: DEFAULT_CONFIG }, { action: 'dispatch', enabled: true })
  assert.equal(out.ok, true, 'the action answers')
  assert.equal(out.dispatch.enabled, true, 'with the new value')
  assert.equal(readSettings(h).dispatch, true, 'and it is on disk')
  const log = readFileSync(settingsLogPath(h), 'utf8').trim().split('\n')
  assert.equal(JSON.parse(log[log.length - 1]).patch.dispatch, true, 'the audit line records the patch')
  assert.equal(panelState({ runtime, config: DEFAULT_CONFIG }).dispatch.enabled, true, 'the next poll agrees')
  const back = panelAction({ runtime, config: DEFAULT_CONFIG }, { action: 'dispatch', enabled: false })
  assert.equal(back.dispatch.enabled, false, 'and the same pill turns it off')
  ok('the dispatch pill writes the setting and the next poll agrees')
}

// 3. A wrong type is refused instead of coerced.
{
  const h = home()
  assert.throws(() => writeSettings(h, { dispatch: 'yes' }), /dispatch.*boolean/, 'a string is a mistake worth naming')
  assert.throws(() => writeSettings(h, { nonsense: true }), /unknown setting/, 'and an unknown key is not stored')
  assert.equal(readSettings(h).dispatch, null, 'a refused write leaves the file answering nothing')
  ok('a dispatch value of the wrong type is refused, not coerced')
}

// 4. A broken file answers null with a reason, never `true`.
{
  const h = home()
  writeFileSync(settingsPath(h), '{ this is not json', 'utf8')
  const s = readSettings(h)
  assert.equal(s.dispatch, null, 'a broken file does not claim the switch is on')
  assert.equal(s.reason, 'unreadable', 'and says why')
  ok('an unreadable settings file answers nothing rather than flipping the switch')
}

done()
