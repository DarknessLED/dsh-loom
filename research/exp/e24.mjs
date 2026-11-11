// Does the failure taxonomy hold? classify attempt errors from transcripts so the
// loop stops lumping "provider died" together with "the patch was wrong".
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const buckets = new Map()
const samples = new Map()
let total = 0
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.abandoned') {
      const key = 'abandoned:' + String(d.reason || 'unknown').slice(0, 60)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
      total += 1
      continue
    }
    if (e.type !== 'attempt.finished' || !d.error) continue
    total += 1
    const msg = String(d.error)
    // canonicalise so the counts are classes, not unique strings
    let key = msg
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
      .replace(/\d{4,}/g, '<n>')
      .replace(/[A-Za-z]:[\\/][^\s"']+/g, '<path>')
      .slice(0, 110)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
    if (!samples.has(key)) samples.set(key, { campaign: c, attempt: d.id, stopReason: d.stopReason, raw: msg.slice(0, 300) })
  }
}
const top = [...buckets.entries()].sort((a, b) => b[1] - a[1])
console.log(JSON.stringify({
  totalFailures: total,
  classes: top.length,
  top: top.slice(0, 14).map(([k, n]) => ({ n, key: k, sample: samples.get(k) })),
}, null, 2))
