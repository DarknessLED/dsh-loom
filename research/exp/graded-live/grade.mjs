// Run the check through the real verifier (declaring the metric the way a task
// would) and the real gate scoring, so the numbers are the loop's own.
import { runVerifier } from '../../../src/exec/verifier.js'
import { scoreAttempt } from '../../../src/gate/gate.js'

const NODE = process.env.LOOM_NODE || 'C:/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe'
const cmd = `"${NODE}" check.mjs`
const quality = { pattern: 'QUALITY=([0-9.]+)', group: 1 }

const undecorated = await runVerifier({ cmd }, { cwd: process.cwd(), timeoutMs: 60000 })
const declared = await runVerifier({ cmd, metrics: { quality } }, { cwd: process.cwd(), timeoutMs: 60000 })

console.log(JSON.stringify({
  exitCode: declared.exitCode,
  qualityLine: (declared.stdout || '').trim().split('\n').pop(),
  metricsUndeclared: undecorated.metrics,
  metricsDeclared: declared.metrics,
  scoreWithoutMetricDeclaration: scoreAttempt({ verifierOk: true, metrics: undecorated.metrics }),
  scoreWithMetricDeclaration: scoreAttempt({ verifierOk: true, metrics: declared.metrics }),
}, null, 2))
