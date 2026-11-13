// Prints what each b-arm actually did, round by round, from its event log.
// The point of this file: a policy that is recorded and not honoured reads
// exactly like a policy that is honoured until you count the attempts.
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = join(homedir(), '.dsh', 'loom', 'campaigns')
for (const id of process.argv.slice(2)) {
  const p = join(root, id, 'events.jsonl')
  if (!existsSync(p)) { console.log(id, 'no events'); continue }
  const rounds = []
  const gates = []
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'round.started') rounds.push({ n: e.data.n, plan: null })
    else if (e.type === 'round.finished') {
      const r = rounds.find((x) => x.n === e.data.n)
      if (r) Object.assign(r, {
        status: e.data.status,
        planned: e.data.candidatesPlanned,
        source: e.data.candidateModeSource,
        ms: e.data.durationMs,
      })
    } else if (e.type === 'gate.evaluated') gates.push(e.data)
  }
  const q = gates.map((g) => g.attempt ?? g.score)
  console.log(id, rounds.map((r) => `r${r.n}:${r.status}/${r.planned}c/${r.ms}ms`).join(' '))
  const sp = join(root, id, 'views', 'state.json')
  if (existsSync(sp)) {
    const s = JSON.parse(readFileSync(sp, 'utf8'))
    const rows = (s.rounds ?? []).map((r) => `${(r.taskId ?? '').replace('mut-', '')}=${(r.attempts?.[0]?.metrics?.quality ?? '?')}`)
    console.log('   ', s.status, rows.join(' '), '| policy', JSON.stringify(s.policy ?? null))
  }
}
