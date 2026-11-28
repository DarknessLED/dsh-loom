// Two switches in the composer tool row, beside the permission control.
//
// A switch is a control with three jobs and no fourth: show the current value,
// say what it will do when clicked, and send exactly one request. The state has
// to be readable before it is read: a knob sits on the side it is on, so "on"
// is a position and not only a colour. It must not look like it is loading when
// it is not, and it must not claim a state it did not read -- a switch that
// renders "on" because it was clicked, before the host agreed, is the failure
// this file exists to prevent.
//
// The on-colour is the host's own accent, not one invented here: the composer
// lives inside the host theme, which declares `--dsw-alias-brand-primary`; the
// hex is only its fallback, so this module does not become a second palette.
//
// The bundle stays a lazy-CJS module that requires `react` and nothing else: the
// host loads it into the page, so a bundler import here would be a blank panel.
//   node tests/self58/the-composer-has-two-pills.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { ok, done } from '../chaos/fixture.mjs'

const source = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')

// 1. The row the switches live in is the composer's left tool slot, not the sidebar.
{
  assert.match(source, /slots\.inject\('conversation\.input\.left'/, 'the switches are registered where the operator asked')
  assert.match(source, /name: 'conversation\.input\.left'/, 'through a registration naming that slot')
  ok('the switches register into the composer tool row')
}

// 2. Two switches with the operator's names, and the second one is called Auto.
{
  assert.match(source, /function Pills\(react\)/, 'the switches are one component family')
  assert.match(source, /'RSI'/, 'the loop switch is called RSI')
  assert.match(source, /'Auto'/, 'the second switch is called Auto')
  assert.doesNotMatch(source, /'调度'/, 'the old label is gone, not kept beside the new one')
  assert.match(source, /label: \(\) => 'RSI \/ Auto'/, 'and the slot label names both')
  ok('the two switches are RSI and Auto')
}

// 3. Auto says what auto decides when it is hovered, not just that it is Auto.
{
  assert.match(source, /Auto：每轮先规划流程/, 'the tooltip says Auto plans the workflow first')
  assert.match(source, /harness/, 'and that each stage gets its own harness')
  assert.match(source, /不换模型/, 'and that it does not change the model today')
  ok('Auto explains what auto does on hover')
}

// 4. The state is a sliding knob on a pill track, and on is the host accent.
{
  // Scoped to the Pills component: the panel has its own switches, and a switch
  // somewhere else in the file would make this assertion say nothing about these.
  const pills = source.slice(source.indexOf('function Pills(react)'))
  const body = pills.slice(0, pills.indexOf('function apply(ctx)'))
  assert.match(body, /role: 'switch'/, 'each control announces itself as a switch')
  assert.match(body, /'aria-checked': rsiOn/, 'with the loop state exposed to assistive tech')
  assert.match(body, /'aria-checked': dispatchOn/, 'and the Auto state too')
  assert.match(body, /borderRadius: '999px'/, 'the track is a pill')
  assert.match(body, /function track\(on\)/, 'one track renderer for both')
  assert.match(body, /transform: on \? KNOB_ON : KNOB_OFF/, 'the knob moves to the side it is on')
  assert.match(body, /KNOB_ON = 'translateX\(13px\)'/, 'and the on side is the right one')
  assert.match(body, /var\(--dsw-alias-brand-primary, #4D6BFE\)/, 'on is the host brand accent, with a fallback')
  ok('the state is a knob that slides, and on is the host blue')
}

// 5. Each switch sends one action and nothing else.
{
  assert.match(source, /action: rsiOn \? 'disable' : 'enable'/, 'the loop switch toggles the master switch')
  assert.match(source, /action: 'dispatch'/, 'the Auto switch writes its own setting')
  assert.match(source, /dispatch\.enabled/, 'and it reads the dispatch block it wrote')
  ok('each switch sends exactly the action it owns')
}

// 6. The bundle still loads without a bundler.
{
  const requires = [...source.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1])
  const external = requires.filter((name) => name !== 'react')
  assert.deepEqual(external, [], `the bundle may only require react, found: ${external.join(', ')}`)
  assert.match(source, /__ModuleLoader__/, 'and it is still a lazy-CJS module the host can load')
  ok('the bundle still requires only react')
}

done()
