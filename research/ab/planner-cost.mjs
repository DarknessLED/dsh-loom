// Where the planner's share of the round goes, read off `node.finished`.
//
// The claim arm B rests on is a clock claim: the `recon` node runs, burns its
// budget, and is aborted without producing a usable plan. That is not a
// statistical statement -- either the milliseconds are in the log or they are
// not -- so it is measured with a sum and a count rather than an interval.
//
// Usage: node research/ab/planner-cost.mjs [ab-cand1 ab-cand2 ab-cand3 ...]
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!ids.length) {
  console.error('usage: planner-cost.mjs <campaign> [<campaign> ...]')
  process.exit(2)
}

for (const id of ids) {
  const file = join(ROOT, id, 'events.jsonl')
  if (!existsSync(file)) {
    console.log(`${id.padEnd(12)} (no events)`)
    continue
  }
  const ev = readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const rounds = ev.filter((e) => e.type === 'round.started')
  const finished = ev.filter((e) => e.type === 'round.finished')
  const planner = ev.filter((e) => e.type === 'node.finished' && (e.data?.role === 'planner' || e.data?.id === 'recon'))
  const planMs = planner.reduce((s, e) => s + (Number(e.data?.durationMs) || 0), 0)
  const aborted = planner.filter((e) => e.data?.timedOut === true || e.data?.stopReason === 'aborted').length
  const roundMs = finished.reduce((s, e) => s + (Number(e.data?.durationMs) || 0), 0)
  const share = roundMs > 0 ? planMs / roundMs : 0

  console.log(
    `${id.padEnd(12)} rounds=${String(rounds.length).padStart(2)}  ` +
      `planner=${String(planner.length).padStart(2)} run(s) ${String(Math.round(planMs / 1000)).padStart(4)} s  ` +
      `aborted=${aborted}  ` +
      `round=${String(Math.round(roundMs / 1000)).padStart(5)} s  ` +
      `planner share=${(share * 100).toFixed(1)}%  ` +
      `per-round planner=${rounds.length ? Math.round(planMs / rounds.length / 1000) : 0} s`,
  )
}
