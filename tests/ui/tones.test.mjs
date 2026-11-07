/**
 * Colour is one decision, not thirteen.
 *
 * The panel paints state with mid-tone accents that have to clear WCAG on both
 * canvases. Today those values are declared once as custom properties and then
 * pasted again as literals wherever a tone is needed — so a palette change is a
 * find-and-replace across the file, and the audit can pass while the screen and
 * the stylesheet disagree.
 *
 * The rule: tones are names resolved through `var(--loom-*)`, and the only hex
 * literals in the module are the palette declarations themselves.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '..', '..', 'client', 'index.js'), 'utf8')
const panel = await loadPanel()

{
  const tones = panel.TONES
  assert.ok(tones && typeof tones === 'object', 'the palette must be exported as TONES')
  for (const key of ['ok', 'warn', 'bad', 'idle']) {
    assert.equal(typeof tones[key], 'string', `${key} must name a colour`)
    assert.match(tones[key], /^var\(--loom-[a-z]+\)$/, `${key} must resolve through a custom property, not a literal`)
  }
  ok('the palette is four custom-property names')
}

{
  assert.equal(panel.statusTone('running'), panel.TONES.ok)
  assert.equal(panel.statusTone('paused'), panel.TONES.warn)
  assert.equal(panel.statusTone('failed'), panel.TONES.bad)
  assert.equal(panel.statusTone('planning'), panel.TONES.idle)
  assert.equal(panel.qualityTone('healthy'), panel.TONES.ok)
  assert.equal(panel.qualityTone('regressing'), panel.TONES.bad)
  assert.equal(panel.riskTone('high'), panel.TONES.bad)
  assert.equal(panel.riskTone('low'), panel.TONES.idle)
  ok('every tone helper answers with a palette name')
}

{
  const offenders = source
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => !line.trim().startsWith('//') && !line.includes('--loom-'))
    .filter(({ line }) => /#[0-9a-fA-F]{6}\b/.test(line))
    .map(({ n }) => n)
  assert.deepEqual(offenders, [], 'hex literals outside the palette: ' + offenders.join(','))
  ok('no hex outside the palette')
}

console.log(`${pass}/3 passed`)
assert.ok(pass > 0)
