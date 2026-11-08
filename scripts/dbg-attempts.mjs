import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const home = join(process.env.USERPROFILE, '.dsh', 'loom', 'campaigns', process.argv[2])
const events = readFileSync(join(home, 'events.jsonl'), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l))

for (const e of events) {
  if (e.type === 'attempt.finished') {
    const d = e.data
    console.log(`--- ${d.id} ok=${d.verifierOk} exit=${d.exitCode} dur=${d.durationMs}`)
    console.log('stderr:', String(d.stderrTail ?? '').slice(-900))
    console.log('stdout:', String(d.stdoutTail ?? '').slice(-600))
  }
  if (e.type === 'gate.evaluated') {
    console.log(`gate ${e.data.round}:`, JSON.stringify(e.data.checks))
  }
  if (e.type === 'round.finished') {
    console.log(`round ${e.data.n}:`, e.data.status, `promoted=${e.data.promoted}`, `planMs=${e.data.planMs}`)
  }
}
