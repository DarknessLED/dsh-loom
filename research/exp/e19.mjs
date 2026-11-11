// Slot economics: who wins, what each slot costs, and whether lesson credit is
// really just the slot tie-break wearing a lesson's name.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const PRICE = { input: 0.28, output: 0.42, cacheRead: 0.028 }

const dirOf = new Map()
for (const ws of fs.readdirSync(sessionsRoot)) {
  const wsDir = path.join(sessionsRoot, ws)
  let ids = []
  try { ids = fs.readdirSync(wsDir) } catch { continue }
  for (const id of ids) {
    const d = path.join(wsDir, id)
    if (fs.existsSync(path.join(d, 'session.v4.jsonl.zstd'))) dirOf.set(id, d)
  }
}
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const cache = new Map()
function costOf(sid) {
  if (cache.has(sid)) return cache.get(sid)
  const d = dirOf.get(sid)
  let usd = 0
  if (d) {
    const buf = fs.readFileSync(path.join(d, 'session.v4.jsonl.zstd'))
    const starts = []
    for (let i = 0; i + 4 <= buf.length; i += 1) if (buf.subarray(i, i + 4).equals(MAGIC)) starts.push(i)
    starts.push(buf.length)
    let text = ''
    for (let i = 0; i < starts.length - 1; i += 1) {
      try { text += zlib.zstdDecompressSync(buf.subarray(starts[i], starts[i + 1])).toString('utf8') } catch {}
    }
    for (const line of text.split('\n')) {
      if (!line.includes('assistant/message')) continue
      let e; try { e = JSON.parse(line) } catch { continue }
      const m = e?.data?.message?.usage ?? e?.data?.usage
      if (!m) continue
      usd += ((Number(m.inputTokens) || 0) * PRICE.input + (Number(m.outputTokens) || 0) * PRICE.output + (Number(m.cacheReadTokens) || 0) * PRICE.cacheRead) / 1e6
    }
  }
  cache.set(sid, usd)
  return usd
}

const slot = (id) => { const m = /a(\d+)$/.exec(String(id)); return m ? m[1] : '?' }
const bySlot = new Map()
let promotedTotal = 0
let impactByTreatedSlot = new Map()
let impactSum = 0, impactN = 0, impactNeg = 0, impactPos = 0, impactZero = 0
let impactDroppedRounds = 0

for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const attempts = new Map()
  const promotedIds = new Set()
  const roundArms = new Map() // round -> [attemptIds]
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.finished') {
      attempts.set(String(d.id), d)
      const r = Number(d.round)
      if (!roundArms.has(r)) roundArms.set(r, [])
      roundArms.get(r).push(String(d.id))
    }
    if (e.type === 'gate.evaluated' && d.promoted && d.candidateId) promotedIds.add(String(d.candidateId))
    if (e.type === 'lesson.impact') {
      const t = slot(d.attempt)
      if (!impactByTreatedSlot.has(t)) impactByTreatedSlot.set(t, { n: 0, sum: 0, pos: 0, neg: 0, zero: 0 })
      const b = impactByTreatedSlot.get(t)
      b.n += 1
      b.sum += Number(d.delta) || 0
      const dl = Number(d.delta) || 0
      if (dl > 0) b.pos += 1; else if (dl < 0) b.neg += 1; else b.zero += 1
      impactSum += dl; impactN += 1
      if (dl > 0) impactPos += 1; else if (dl < 0) impactNeg += 1; else impactZero += 1
    }
  }
  promotedTotal += promotedIds.size
  // rounds where both arms ran but nothing was promoted while at least one passed
  for (const [r, arms] of roundArms) {
    const passing = arms.filter((a) => attempts.get(a)?.verifierOk && (attempts.get(a)?.diff?.files ?? 0) > 0)
    const promotedHere = arms.some((a) => promotedIds.has(a))
    if (!promotedHere && passing.length) impactDroppedRounds += 1
  }
  for (const [id, a] of attempts) {
    const s = slot(id)
    if (!bySlot.has(s)) bySlot.set(s, { attempts: 0, verified: 0, promoted: 0, usd: 0, errored: 0 })
    const b = bySlot.get(s)
    b.attempts += 1
    b.verified += a.verifierOk ? 1 : 0
    b.promoted += promotedIds.has(id) ? 1 : 0
    b.errored += a.error ? 1 : 0
    b.usd += costOf(String(a.sessionId))
  }
}

const out = {
  promotedTotal,
  slots: {},
  lessonImpact: { n: impactN, mean: +(impactSum / (impactN || 1)).toFixed(4), pos: impactPos, neg: impactNeg, zero: impactZero, byTreatedSlot: {} },
  roundsWithPassingPatchButNothingPromoted: impactDroppedRounds,
}
for (const [s, b] of [...bySlot].sort()) {
  out.slots[s] = {
    attempts: b.attempts, verified: b.verified, errored: b.errored, promoted: b.promoted,
    costUsd: +b.usd.toFixed(2),
    costPerPromotion: b.promoted ? +(b.usd / b.promoted).toFixed(3) : null,
  }
}
for (const [t, b] of [...impactByTreatedSlot].sort()) {
  out.lessonImpact.byTreatedSlot[t] = { n: b.n, mean: +(b.sum / b.n).toFixed(3), pos: b.pos, neg: b.neg, zero: b.zero }
}
console.log(JSON.stringify(out, null, 2))
