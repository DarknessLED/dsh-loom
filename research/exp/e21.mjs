// What does one round actually cost in tokens, and what fraction is fixed overhead?
// Uses transcript usage blocks joined to attempts, so costs are real, not modelled.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
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

function readSession(sid) {
  if (cache.has(sid)) return cache.get(sid)
  const d = dirOf.get(sid)
  const acc = { input: 0, output: 0, cacheRead: 0, calls: 0, steps: 0 }
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
      if (!line) continue
      let e; try { e = JSON.parse(line) } catch { continue }
      if (e.type === 'step/end') acc.steps += 1
      if (e.type !== 'assistant/message') continue
      const m = e?.data?.message?.usage ?? e?.data?.usage
      if (!m) continue
      acc.calls += 1
      acc.input += Number(m.inputTokens ?? 0) || 0
      acc.output += Number(m.outputTokens ?? 0) || 0
      acc.cacheRead += Number(m.cacheReadTokens ?? 0) || 0
    }
  }
  const usd = (acc.input * PRICE.input + acc.output * PRICE.output + acc.cacheRead * PRICE.cacheRead) / 1e6
  const out = { ...acc, usd }
  cache.set(sid, out)
  return out
}

const attempts = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type !== 'attempt.finished' || !d.sessionId) continue
    const u = readSession(String(d.sessionId))
    attempts.push({
      campaign: c, id: String(d.id), round: Number(d.round),
      verifierOk: Boolean(d.verifierOk), errored: Boolean(d.error),
      durationMs: Number(d.durationMs) || 0, ...u,
    })
  }
}

const q = (a, p) => (a.length ? a[Math.floor((a.length - 1) * p)] : null)
const ok = attempts.filter((a) => a.verifierOk)
const bad = attempts.filter((a) => !a.verifierOk && !a.errored)
const err = attempts.filter((a) => a.errored)
const stat = (rows) => {
  const usd = rows.map((r) => r.usd).sort((a, b) => a - b)
  const out = rows.map((r) => r.output).sort((a, b) => a - b)
  return {
    n: rows.length,
    usdMedian: q(usd, 0.5)?.toFixed(4) ?? null,
    usdP90: q(usd, 0.9)?.toFixed(4) ?? null,
    usdTotal: +rows.reduce((s, r) => s + r.usd, 0).toFixed(3),
    outputMedian: q(out, 0.5) ?? null,
    callsMedian: q(rows.map((r) => r.calls).sort((a, b) => a - b), 0.5),
    outputPerCall: rows.reduce((s, r) => s + r.output, 0) / Math.max(1, rows.reduce((s, r) => s + r.calls, 0)),
    cacheShare: rows.reduce((s, r) => s + r.cacheRead, 0) / Math.max(1, rows.reduce((s, r) => s + r.cacheRead + r.input, 0)),
  }
}

// A round is 2 attempts; what does the abandoned attempt cost?
const byRound = new Map()
for (const a of attempts) {
  const k = a.campaign + '#' + a.round
  if (!byRound.has(k)) byRound.set(k, [])
  byRound.get(k).push(a)
}
let loserCost = 0, winnerCost = 0, roundsWithBoth = 0
for (const [, rows] of byRound) {
  if (rows.length !== 2) continue
  const win = rows.filter((r) => r.verifierOk).sort((a, b) => b.usd - a.usd)[0]
  if (!win) continue
  roundsWithBoth += 1
  winnerCost += win.usd
  loserCost += rows.filter((r) => r !== win).reduce((s, r) => s + r.usd, 0)
}

console.log(JSON.stringify({
  attempts: attempts.length,
  all: stat(attempts),
  verified: stat(ok),
  verifiedButFailedChecks: stat(bad),
  errored: stat(err),
  failedAttemptSpend: {
    onError: +err.reduce((s, r) => s + r.usd, 0).toFixed(3),
    onVerifiedFail: +bad.reduce((s, r) => s + r.usd, 0).toFixed(3),
    shareOfAll: +((err.reduce((s, r) => s + r.usd, 0) + bad.reduce((s, r) => s + r.usd, 0)) / attempts.reduce((s, r) => s + r.usd, 0)).toFixed(3),
  },
  twoArmRounds: roundsWithBoth,
  winnerUsd: +winnerCost.toFixed(3),
  loserUsd: +loserCost.toFixed(3),
  loserShare: +(loserCost / (winnerCost + loserCost)).toFixed(3),
}, null, 2))
