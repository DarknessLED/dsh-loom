// Apply the verdicts in research/exp/resolutions.json through the real CLI, so the
// record goes through the same door a human would use.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const rows = JSON.parse(readFileSync(new URL('./resolutions.json', import.meta.url), 'utf8'))
const KG = new URL('../kg/kg.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
let ok = 0
const failed = []
for (const [a, b, verdict, note] of rows) {
  try {
    execFileSync(process.execPath, [KG, 'resolve', a, b, '--verdict', verdict, '--note', note], { encoding: 'utf8' })
    ok += 1
  } catch (e) {
    failed.push(`${a} vs ${b}: ${String(e.stderr || e.message).split('\n')[0]}`)
  }
}
console.log(`${ok}/${rows.length} resolved`)
if (failed.length) console.log(failed.join('\n'))
