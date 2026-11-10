// Which model did the work belongs on the card, not only in the digest.
//
// `campaignTriangle().perModel` fills a row per ref, and the digest now prints
// one line. The sidebar -- the place an operator actually looks -- still showed
// a campaign where the primary provider died forty times exactly like a healthy
// one, because nothing rendered the table.
//
// Two failures have to stay visible, and they are different failures:
//   * a ref that keeps losing judged attempts (the chain is a bad bet), and
//   * a ref we never measured at all (`-`, not `0s`).
// A stopped attempt is not in the denominator: we aborted it because a sibling
// already won. Counting it reads as a coin-flip provider.
import assert from 'node:assert/strict'
import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name, cond = true, detail) => {
  if (cond) {
    pass += 1
    console.log(`ok ${pass} - ${name}`)
    return
  }
  throw new Error(`not ok ${pass + 1} - ${name}${detail ? `: ${detail}` : ''}`)
}

const panel = await loadPanel()

ok('modelRows is exported so the reading is assertable', typeof panel.modelRows === 'function',
  `got ${typeof panel.modelRows}`)

function card(perModel) {
  return { id: 'camp', triangle: { measured: true, perModel } }
}

// The loom-ui8 shape after the abandoned fix: 3 judged, 3 won, 3 stopped.
const rows = panel.modelRows(card({
  'deepseek/deepseek-v4.1-flash': {
    attempts: 6, ok: 3, died: 0, abandoned: 3, measured: 6, p90Ms: 594000,
  },
}))

ok('one row per model ref', Array.isArray(rows) && rows.length === 1, JSON.stringify(rows))
ok('the row names the ref', rows[0].ref === 'deepseek/deepseek-v4.1-flash', rows[0].ref)
ok('judged attempts exclude the ones we stopped', rows[0].judged === 3, String(rows[0].judged))
ok('wins over judged is the visible ratio', rows[0].label === '3/3', rows[0].label)
ok('the p90 is stated in seconds', rows[0].p90 === '594s', String(rows[0].p90))
ok('stopped attempts are named, not swallowed', /3 stopped/.test(rows[0].note), rows[0].note)

// A ref that only ever died must be named: silence is the finding.
const dead = panel.modelRows(card({
  'bad/provider': { attempts: 4, ok: 0, died: 4, abandoned: 0, measured: 4, p90Ms: 900 },
}))
ok('a ref that only died still gets a row', dead.length === 1)
ok('and reads 0/4', dead[0].label === '0/4', dead[0].label)
ok('with its own tone so the card can colour it', dead[0].tone === 'bad', dead[0].tone)
ok('a one-second death is not rounded to nothing', dead[0].p90 === '0.9s', String(dead[0].p90))

// Never measured is not zero.
const untimed = panel.modelRows(card({
  'quiet/provider': { attempts: 2, ok: 1, died: 1, abandoned: 0, measured: 0, p90Ms: null },
}))
ok('an unmeasured p90 reads as a dash', untimed[0].p90 === '-', String(untimed[0].p90))

// Ordering must not reshuffle between reads.
const many = panel.modelRows(card({
  'b/one': { attempts: 1, ok: 1, abandoned: 0, measured: 1, p90Ms: 1000 },
  'a/two': { attempts: 9, ok: 5, abandoned: 0, measured: 9, p90Ms: 2000 },
  'c/three': { attempts: 9, ok: 2, abandoned: 0, measured: 9, p90Ms: 3000 },
}))
ok('busiest first, then by ref', many.map((r) => r.ref).join(',') === 'a/two,c/three,b/one', many.map((r) => r.ref).join(','))

// A campaign with no measurement says so instead of rendering an empty table.
ok('no data is no rows, not a crash', panel.modelRows({ id: 'x' }).length === 0)
ok('an unmeasured triangle is also no rows', panel.modelRows({ id: 'x', triangle: { measured: false } }).length === 0)

// And the card actually renders them.
const source = (await import('node:fs')).readFileSync(
  new URL('../../client/index.js', import.meta.url), 'utf8')
ok('the card has a models block', /className: 'loom-models'/.test(source),
  'the rows need somewhere to live')
ok('the block is fed by modelRows', /modelRows\(c\)/.test(source), 'computed, not retyped in JSX')
