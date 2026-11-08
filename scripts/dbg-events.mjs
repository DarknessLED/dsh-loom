import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const file = join(homedir(), '.dsh', 'loom', 'campaigns', process.argv[2], 'events.jsonl')
const rows = readFileSync(file, 'utf8')
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

const attempts = rows.filter((r) => r.type === 'attempt.finished')
console.log('rounds:', rows.filter((r) => r.type === 'round.finished').length, 'attempts:', attempts.length)
for (const a of attempts.slice(-6)) {
  const d = a.data
  console.log(
    `${d.id} ok=${d.verifierOk} kind=${d.failureKind} ms=${d.durationMs} err=${String(d.error ?? '').slice(0, 120)} stop=${d.stopReason}`,
  )
}
const nodes = rows.filter((r) => r.type === 'node.finished')
for (const n of nodes.slice(-3)) {
  console.log(`node ${n.data.id} ok=${n.data.ok} ms=${n.data.durationMs} timedOut=${n.data.timedOut} err=${String(n.data.error ?? '').slice(0, 100)}`)
}
