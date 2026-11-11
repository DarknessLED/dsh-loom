// Does the loop ever hit EPERM from rename-over-open-reader in practice?
// Two checks: (a) the reader/writer are actually concurrent (panel reads state
// while a round writes), (b) any EPERM/EEXIST appears in a real ledger or log.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const results = {}

// (a) who reads and writes the same file paths
const panel = fs.readFileSync('src/panel/api.js', 'utf8')
const runtime = fs.readFileSync('src/runtime/runtime.js', 'utf8')
results.panelReadsState = /readJson|readJsonl|readFileSync/.test(panel)
results.runtimeWritesState = /writeJsonAtomic|appendJsonl/.test(runtime)

// (b) scan every campaign state file for a leftover tmp file (evidence a rename
// failed mid-write) and scan the apply log for EPERM
const home = path.join(os.homedir(), '.dsh', 'loom')
const stray = []
const walk = (dir, depth = 0) => {
  if (depth > 3) return
  let ents
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, depth + 1)
    else if (/\.tmp$/.test(e.name)) stray.push(p)
  }
}
walk(home)
results.strayTmpFilesInLoomHome = stray.length
results.straySamples = stray.slice(0, 5)

const log = path.join(home, 'apply.log')
if (fs.existsSync(log)) {
  const text = fs.readFileSync(log, 'utf8')
  results.epermInApplyLog = (text.match(/EPERM/g) || []).length
  results.renameErrorsInApplyLog = (text.match(/rename/gi) || []).length
}
console.log(JSON.stringify(results, null, 2))
