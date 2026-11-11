// Independent check of the 246x undercount: join loom's recorded costUsd to the
// provider usage blocks in each attempt's own archived transcript.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const PRICE = { input: 0.28, output: 0.42, cacheRead: 0.028 } // per Mtok, loom's default table

// index session id -> directory
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
function decode(file) {
  const buf = fs.readFileSync(file)
  const starts = []
  for (let i = 0; i + 4 <= buf.length; i += 1) if (buf.subarray(i, i + 4).equals(MAGIC)) starts.push(i)
  starts.push(buf.length)
  let text = ''
  for (let i = 0; i < starts.length - 1; i += 1) {
    try { text += zlib.zstdDecompressSync(buf.subarray(starts[i], starts[i + 1])).toString('utf8') } catch {}
  }
  return text
}

function usageOfSession(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const u = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, blocks: 0 }
  for (const line of t.split('\n')) {
    if (!line.includes('assistant/message')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const m = e?.data?.message?.usage ?? e?.data?.usage
    if (!m) continue
    u.blocks += 1
    u.input += Number(m.inputTokens ?? 0) || 0
    u.output += Number(m.outputTokens ?? 0) || 0
    u.cacheRead += Number(m.cacheReadTokens ?? 0) || 0
    u.cacheWrite += Number(m.cacheWriteTokens ?? 0) || 0
  }
  return u
}

const rows = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'attempt.finished') continue
    const sid = e.data?.sessionId
    if (!sid || !dirOf.has(String(sid))) continue
    rows.push({ campaign: c, attempt: e.data?.attemptId, sid: String(sid), costUsd: Number(e.data?.costUsd) || 0 })
  }
}

let recorded = 0, billed = 0, joined = 0
const ratios = []
const perAttempt = []
const seen = new Set()
for (const r of rows) {
  if (seen.has(r.sid)) continue
  seen.add(r.sid)
  const u = usageOfSession(dirOf.get(r.sid))
  const usd = (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead) / 1e6
  joined += 1
  recorded += r.costUsd
  billed += usd
  perAttempt.push({ usd, recorded: r.costUsd, tokens: u })
  if (usd > 0.0005 && r.costUsd > 0) ratios.push(usd / r.costUsd)
}
ratios.sort((a, b) => a - b)
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : null)
const trueCosts = perAttempt.map((p) => p.usd).sort((a, b) => a - b)
const atOrAbove = perAttempt.filter((p) => p.recorded >= p.usd).length
const zeroDollar = perAttempt.filter((p) => p.recorded === 0 && p.usd > 0.0005)
const over = perAttempt.filter((p) => p.recorded > p.usd && p.usd > 0.0005)
const overRatio = over.map((p) => p.recorded / p.usd).sort((a, b) => a - b)
const understated = perAttempt.filter((p) => p.recorded < p.usd * 0.5)

console.log(JSON.stringify({
  joinedSessions: joined,
  recordedUsd: +recorded.toFixed(4),
  billedUsdAtDefaultPricing: +billed.toFixed(4),
  ratio: recorded ? +(billed / recorded).toFixed(1) : null,
  medianPerAttemptRatio: med(ratios) ? +med(ratios).toFixed(0) : null,
  attemptsRecordedAtOrAboveTruth: atOrAbove,
  zeroDollarButReal: zeroDollar.length,
  truePerAttempt: {
    median: +med(trueCosts).toFixed(4),
    mean: +(trueCosts.reduce((a, b) => a + b, 0) / (trueCosts.length || 1)).toFixed(4),
    p90: +trueCosts[Math.floor(trueCosts.length * 0.9)].toFixed(4),
    max: +trueCosts[trueCosts.length - 1].toFixed(4),
  },
  overRecorded: { count: over.length, medianMultiple: overRatio.length ? +overRatio[Math.floor(overRatio.length / 2)].toFixed(1) : null, maxMultiple: overRatio.length ? +overRatio[overRatio.length - 1].toFixed(1) : null },
  understatedByMoreThanHalf: understated.length,
  recordedPositive: perAttempt.filter((p) => p.recorded > 0).length,
  cacheWriteTokensSeen: perAttempt.reduce((a, p) => a + p.tokens.cacheWrite, 0),
}, null, 2))
