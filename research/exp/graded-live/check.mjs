// Prints one number and exits 0 in every state, so the only signal is the metric.
import { cases } from './lib.mjs'
import * as lib from './lib.mjs'

let ok = 0
for (const c of cases) {
  let got
  try { got = lib.run(c.name, c.input) } catch { got = undefined }
  if (got === c.expected) ok += 1
  else process.stdout.write(`fail ${c.name}: expected ${JSON.stringify(c.expected)} got ${JSON.stringify(got)}\n`)
}
process.stdout.write(`QUALITY=${(ok / cases.length).toFixed(3)}\n`)
process.exit(0)
