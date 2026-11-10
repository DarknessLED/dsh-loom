// The plugin ships a config surface it never declared.
//
// `normalizeConfig` accepts `tickMs`, `models`, `session`, `gate`, `loopPolicy` --
// and the host learns a plugin's shape only through an exported `Config`. We
// exported none, so `include:dsh-loom` reads `status: "absent"` in the host's own
// Config directory: the settings page had nothing to show, and changing the model
// a child runs on meant editing the profile's `cordis.patch.yml` by hand, where a
// typo fails at load instead of at the field.
//
// Rule: the plugin exports a `Config` the host can project into a form, the field
// list names the knobs an operator actually turns, a bad value is dropped instead
// of travelling into `normalizeConfig`, and a missing schema library degrades to
// `undefined` (exactly today's behaviour) rather than taking the host entry down.
import assert from 'node:assert/strict'
import { FIELDS, FIELD_ORDER, describeConfig, mergeConfigValues, loadConfigSchema } from '../../src/config-schema.js'
import { Config, name } from '../../src/index.js'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

// 1. The host has something to project. An absent Config is the bug this file
//    exists for, so the export itself is the first assertion.
{
  assert.equal(typeof name, 'string', 'the entry still names itself')
  // A schemastery schema is callable, so `typeof` is 'function' for a live one.
  assert.ok(Config !== undefined, 'the entry exports a Config')
  assert.ok(typeof Config === 'object' || typeof Config === 'function', 'and it is a schema, not a bare object')
  const json = JSON.stringify(Config)
  assert.ok(json.includes('models'), 'the projected schema names the models group')
  assert.ok(json.includes('attemptTimeoutMs'), 'and the timeout knob')
  ok('the plugin exports a Config the host can project')
}

// 2. Every exposed path is described and every description says what it decides.
//    A row without a sentence would surface in the form as a bare input box.
{
  for (const path of FIELD_ORDER) {
    const field = FIELDS[path]
    assert.ok(field, `field ${path} is described`)
    assert.ok(typeof field.description === 'string' && field.description.length >= 12, `${path} says what it decides`)
    assert.ok(['number', 'string', 'boolean', 'array'].includes(field.type), `${path} has a usable type`)
  }
  ok('each exposed knob is described in words a person can act on')
}

// 3. The projection nests the way the config nests. A form that writes
//    `{"worker": ...}` at the root writes into nothing.
{
  const schema = describeConfig()
  assert.equal(schema.type, 'object')
  assert.equal(schema.properties.models.properties.worker.default, '')
  assert.deepEqual(schema.properties.models.properties.fallback.items, { type: 'string' })
  assert.equal(schema.properties.session.properties.attemptTimeoutMs.default, 780000)
  assert.equal(schema.properties.rsi.properties.enabled.default, true)
  ok('the schema nests the groups the config already uses')
}

// 4. A bad value is dropped, not carried. `normalizeConfig` would accept a model
//    name of `42` and the run would fail somewhere far from the form.
{
  const base = {
    models: { worker: 'a/b' },
    session: { maxConcurrent: 2 },
    rsi: { enabled: false },
    budget: { usd: 20, rounds: 30 },
  }
  const merged = mergeConfigValues(base, {
    models: { worker: 42, fallback: ['x/y', 7] },
    session: { maxConcurrent: '3', attemptTimeoutMs: -1 },
    rsi: { enabled: 'yes' },
    notAField: { x: 1 },
  })
  assert.equal(merged.models.worker, 'a/b', 'a non-string worker keeps the previous value')
  assert.deepEqual(merged.models.fallback, undefined, 'a list with a non-string is dropped whole')
  assert.equal(merged.session.maxConcurrent, 3, 'a numeric string is a number')
  assert.equal(merged.session.attemptTimeoutMs, undefined, 'a negative timeout is dropped')
  assert.equal(merged.rsi.enabled, false, 'a string is not a boolean, so the previous value stands')
  // The form owns ten paths, not the whole config: `home`, `budget`, `verify`,
  // `knowledge` and anything else in the patch document are file-level decisions
  // and must survive a hot update, or a settings form would silently reset a
  // tuned install.
  assert.deepEqual(merged.notAField, { x: 1 }, 'a field the form does not own survives untouched')
  assert.deepEqual(merged.budget, base.budget, 'an untouched group is carried through')
  ok('the merge drops values it cannot trust')
}

// 5. The merge copies rather than mutates: the host hands us the live config.
{
  const base = { models: { worker: 'a/b' } }
  const merged = mergeConfigValues(base, { models: { worker: 'c/d' } })
  assert.equal(base.models.worker, 'a/b', 'the input is untouched')
  assert.equal(merged.models.worker, 'c/d')
  ok('the merge leaves the live config alone')
}

// 6. No schema library is not a crash. The static-import version of this took the
//    whole host entry down (the sidebar goes with it), so the failure has to be a
//    missing form and nothing worse.
{
  const missing = await loadConfigSchema(() => Promise.reject(new Error('ERR_MODULE_NOT_FOUND')))
  assert.equal(missing, undefined, 'an unresolvable library degrades to no form')
  const junk = await loadConfigSchema(() => Promise.resolve({ default: {} }))
  assert.equal(junk, undefined, 'a module without a schema factory also degrades')
  ok('a missing schema library costs a form, not the plugin')
}

console.log(`\n${pass}/6 passed`)
assert.equal(pass, 6)
