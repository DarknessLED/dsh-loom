// For every recorded round with two attempts: did the second candidate ever beat a
// passing first candidate? That is the only case a cascade loses, and it is the only
// case the parallel default is paying for.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
let two = 0, a1ok = 0, a2winsWhenA1ok = 0, a2winsWhenA1fail = 0, a1higher = 0, equal = 0
let bestWhenA1ok = []
for (const id of readdirSync(ROOT)) {
  const f = join(ROOT, id, 'events.jsonl')
  if (!existsSync(f)) continue
  const byRound = new Map()
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'attempt.finished') continue
    const m = /^r(\d+)a(\d+)$/.exec(String(e.data?.id ?? ''))
    if (!m) continue
    const key = `${id}#${m[1]}`
    if (!byRound.has(key)) byRound.set(key, {})
    byRound.get(key)[m[2]] = e.data
  }
  for (const [, arms] of byRound) {
    const a1 = arms['1'], a2 = arms['2']
    if (!a1 || !a2) continue
    two++
    const s1 = Number(a1.score), s2 = Number(a2.score)
    if (a1.verifierOk === true) {
      a1ok++
      if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue
      if (s2 > s1 + 1e-9) { a2winsWhenA1ok++; bestWhenA1ok.push(`${s1.toFixed(2)}->${s2.toFixed(2)}`) }
      else if (s1 > s2 + 1e-9) a1higher++
      else equal++
    } else if (a2.verifierOk === true) a2winsWhenA1fail++
  }
}
console.log(`rounds with two attempts: ${two}`)
console.log(`  first candidate passed: ${a1ok}  of those: second scored higher ${a2winsWhenA1ok}, first higher ${a1higher}, equal ${equal}`)
console.log(`  first failed, second passed: ${a2winsWhenA1fail}`)
if (bestWhenA1ok.length) console.log(`  cases where parallel beat cascade on score: ${bestWhenA1ok.slice(0, 12).join(' ')}`)
