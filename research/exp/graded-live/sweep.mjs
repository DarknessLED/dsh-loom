// The question the gate needs answered: with a declared metric, do successive
// genuine improvements produce distinct scores, and does the loop's own gate
// accept them? This rewrites one file in place, so it restores it afterwards.
import fs from 'node:fs'
import { runVerifier } from '../../../src/exec/verifier.js'
import { scoreAttempt } from '../../../src/gate/gate.js'
import { bestPriorScore } from '../../../src/runtime/round.js'

const NODE = process.env.LOOM_NODE || 'C:/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe'
const FILE = 'lib.mjs'
const original = fs.readFileSync(FILE, 'utf8')

// each state is an honest, escalating fix: nothing is faked, the check is untouched
const states = [
  { label: 'untouched', broken: "new Set(['pad', 'clip'])" },
  { label: 'pad fixed', broken: "new Set(['clip'])" },
  { label: 'pad+clip fixed', broken: 'new Set()' },
  { label: 'regression: clip re-broken', broken: "new Set(['clip'])" },
]

const rounds = []
try {
  for (const s of states) {
    fs.writeFileSync(FILE, original.replace("new Set(['pad', 'clip'])", s.broken))
    const v = await runVerifier(
      { cmd: `"${NODE}" check.mjs`, metrics: { quality: { pattern: 'QUALITY=([0-9.]+)', group: 1 } } },
      { cwd: process.cwd(), timeoutMs: 60000 },
    )
    const score = scoreAttempt({ verifierOk: v.exitCode === 0, metrics: v.metrics })
    rounds.push({ label: s.label, exit: v.exitCode, quality: v.metrics.quality ?? null, score })
  }
} finally {
  fs.writeFileSync(FILE, original)
}

// replay the gate's own rule over the sequence
const minGain = 0.05
const replay = rounds.map((r, i) => {
  const prior = i === 0 ? null : Math.max(...rounds.slice(0, i).map((x) => x.score))
  return { ...r, prior, beatsIncumbent: prior === null || r.score - prior >= minGain - 1e-9 }
})

console.log(JSON.stringify({
  minGain,
  rounds: replay,
  distinctScores: new Set(rounds.map((r) => r.score)).size,
  restored: fs.readFileSync(FILE, 'utf8') === original,
}, null, 2))
