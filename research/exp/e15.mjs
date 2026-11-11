// Two measurements wave3 says are the ones that matter and nobody has taken:
//  (a) how often does a promoted patch touch the tests or the verifier itself
//      (the Goodhart surface), and
//  (b) how often does a patch fail to apply at all (the w3-cheapwin step change)
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

let patches = 0, touchTests = 0, touchVerifier = 0, touchRunner = 0
const touched = {}
const offenders = []
for (const c of fs.readdirSync(root)) {
  const dir = path.join(root, c, 'artifacts')
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.patch')) continue
    patches += 1
    const text = fs.readFileSync(path.join(dir, f), 'utf8')
    const files = [...text.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1].trim())
    let t = false, v = false, r = false
    for (const file of files) {
      touched[file] = (touched[file] || 0) + 1
      if (/^tests\//.test(file) || /\.test\.mjs$/.test(file)) t = true
      if (/^src\/exec\/verifier\.js$/.test(file) || /^src\/gate\//.test(file)) v = true
      if (/^scripts\/(test-all|verify|e2e)\.mjs$/.test(file)) r = true
    }
    if (t) { touchTests += 1; offenders.push(c + '/' + f) }
    if (v) touchVerifier += 1
    if (r) touchRunner += 1
  }
}
const top = Object.entries(touched).sort((a, b) => b[1] - a[1]).slice(0, 10)
console.log(JSON.stringify({
  patches,
  touchedTests: touchTests, touchedTestsPct: +(100 * touchTests / patches).toFixed(1),
  touchedGateOrVerifier: touchVerifier, touchedRunnerScripts: touchRunner,
  topFiles: top,
  offenders: offenders.slice(0, 10),
}, null, 2))
