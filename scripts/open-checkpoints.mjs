import { readFileSync } from 'node:fs'
const file = process.argv[2]
const answered = new Set()
const raised = []
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue
  let e
  try { e = JSON.parse(line) } catch { continue }
  if (e.type === 'checkpoint.raised') raised.push({ id: e.data.id, kind: e.data.kind, attempt: e.data.payload?.attempt, patch: e.data.payload?.patch })
  if (e.type === 'checkpoint.answered') answered.add(e.data.checkpoint ?? e.data.id)
}
for (const r of raised) {
  const base = r.patch ? r.patch.split(/[\\/]/).pop() : ''
  console.log(r.id, r.kind, r.attempt ?? '', base, answered.has(r.id) ? 'ANSWERED' : 'OPEN')
}
