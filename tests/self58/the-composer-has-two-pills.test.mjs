// Two pills in the composer tool row, beside the permission control.
//
// A pill is a control with three jobs and no fourth: show the current value, say
// what it will do when clicked, and send exactly one request. It must not look
// like it is loading when it is not, and it must not claim a state it did not
// read -- a switch that renders "on" because it was clicked, before the host
// agreed, is the failure this file exists to prevent.
//
// The bundle stays a lazy-CJS module that requires `react` and nothing else: the
// host loads it into the page, so a bundler import here would be a blank panel.
//   node tests/self58/the-composer-has-two-pills.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { ok, done } from '../chaos/fixture.mjs'

const source = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')

// 1. The row the pills live in is the composer's left tool slot, not the sidebar.
{
  assert.match(source, /slots\.inject\('conversation\.input\.left'/, 'the pills are registered where the operator asked')
  assert.match(source, /name: 'conversation\.input\.left'/, 'through a registration naming that slot')
  ok('the pills register into the composer tool row')
}

// 2. Two pills, each with a label the operator can read, and the dispatch one
//    says what it plans instead of repeating the word "dispatch".
{
  assert.match(source, /function Pills\(react\)/, 'the pills are one component family')
  assert.match(source, /'RSI'/, 'the loop pill is called RSI')
  assert.match(source, /调度/, 'the second pill is labelled in the operator’s language')
  assert.match(source, /planning|规划|先规划/, 'and it says it plans a workflow')
  ok('there are two pills, and the second one says it plans the workflow')
}

// 3. Each pill sends one action and nothing else: the loop pill the master switch,
//    the dispatch pill its own setting.
{
  assert.match(source, /action: rsiOn \? 'disable' : 'enable'/, 'the loop pill toggles the master switch')
  assert.match(source, /action: 'dispatch'/, 'the dispatch pill writes its own setting')
  assert.match(source, /dispatch\.enabled/, 'and it reads the dispatch block it wrote')
  ok('each pill sends exactly the action it owns')
}

// 4. The bundle still loads without a bundler.
{
  const requires = [...source.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1])
  const external = requires.filter((name) => name !== 'react')
  assert.deepEqual(external, [], `the bundle may only require react, found: ${external.join(', ')}`)
  assert.match(source, /__ModuleLoader__/, 'and it is still a lazy-CJS module the host can load')
  ok('the bundle still requires only react')
}

done()
