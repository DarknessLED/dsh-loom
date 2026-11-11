// Does the existing machinery already support a graded score end-to-end?
// If a task's verify spec declares a metrics pattern, runVerifier parses it and
// scoreAttempt blends it 0.7 quality / 0.3 pass. That would mean the binary-score
// defect needs a task-declaration change, not a code change.
import { runVerifier } from '../../src/exec/verifier.js'
import { scoreAttempt } from '../../src/gate/gate.js'

const NODE = process.env.MUT_NODE
const cmd = '"' + NODE + '" -e "console.log(\'RESULT coverage=NN\'); console.log(\'ok\')"'

async function probe(pct) {
  const script = '"' + NODE + '" -e "console.log(\'coverage=' + pct + '\')"'
  const ver = await runVerifier(
    { cmd: script, metrics: { quality: { pattern: 'coverage=(\\d+(?:\\.\\d+)?)', group: 1 } } },
    { cwd: 'C:/Projects/RSI' }
  )
  const quality = ver.metrics?.quality
  const graded = scoreAttempt({ attemptId: 'a', taskScores: { t: 1 }, verifierOk: true, metrics: ver.metrics })
  const plain = scoreAttempt({ attemptId: 'a', taskScores: { t: 1 }, verifierOk: true, metrics: {} })
  return { pct, exit: ver.exitCode, parsedQuality: quality ?? null, scoreWithMetric: graded, scoreWithout: plain }
}

const rows = []
for (const p of [0, 25, 50, 75, 100]) rows.push(await probe(p / 100))
console.log(JSON.stringify({ gradedPathWorks: rows.every((r) => r.scoreWithMetric === +(0.7 * r.pct + 0.3).toFixed(6)), rows }, null, 2))
