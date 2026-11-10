// Cheaper models for cheap work is a reasonable idea and a dangerous default.
//
// The loop spends a third of its wall clock on steps whose output is a paragraph of
// text -- planning, screening a candidate, judging a report. Running those on a
// smaller model could pay for itself. But the evidence for "a smaller model does not
// change the answer" has to be produced before the switch is flipped, not after: a
// planner that names the wrong files costs more than the tokens it saved, and the
// loop would have no way to notice because it only reads whether a plan arrived.
//
// So the setting must EXIST (an operator can turn it on deliberately, per role) and
// be OFF by default. This spec pins both halves: the declared config path is
// present and empty by default, and the resolved chain is unchanged when it is unset.
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG, normalizeConfig } from '../../src/core/config.js'
import { describeConfig, FIELDS } from '../../src/config-schema.js'
import { modelFor } from '../../src/dispatch/session.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

// 1. The setting is declared, empty by default, and documented where an operator
//    will look for it.
{
  assert.equal(DEFAULT_CONFIG.models.light, null, 'no cheaper model is assumed')
  assert.ok(FIELDS['models.light'], 'the path is declared, so it can be set from the settings page')
  assert.equal(typeof FIELDS['models.light'].description, 'string')
  assert.ok(FIELDS['models.light'].description.length > 15, 'the description says what it costs')
  const schema = describeConfig()
  assert.ok(schema.properties?.models?.properties?.light, 'it survives projection into the schema')
  ok('a per-role cheap model exists and is off by default')
}

// 2. Unset means "same chain as everything else". A missing light model must not
//    silently become the default model or an empty chain.
{
  const cfg = normalizeConfig({})
  assert.equal(modelFor(cfg, 'planner'), null, 'an unset light model says nothing')
  assert.equal(modelFor({ ...cfg, models: { ...cfg.models, light: 'cheap/model' } }, 'planner'), 'cheap/model')
  ok('unset keeps the main chain in force')
}

// 3. Only the roles that were named get the cheap model. A worker that writes code
//    is not "simple work" just because the operator bought a cheap planner.
{
  const cfg = normalizeConfig({ models: { light: 'cheap/model' } })
  assert.equal(modelFor(cfg, 'planner'), 'cheap/model')
  assert.equal(modelFor(cfg, 'judge'), 'cheap/model')
  assert.equal(modelFor(cfg, 'worker'), null, 'the work itself is never downgraded by this switch')
  ok('the switch is scoped to the roles it names')
}

// 4. An operator who writes garbage gets their config back rather than a crash.
{
  const cfg = normalizeConfig({ models: { light: 42 } })
  assert.equal(modelFor(cfg, 'planner'), null, 'a non-string is not a model')
  ok('a malformed value is ignored, not obeyed')
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
