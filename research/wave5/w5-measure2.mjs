// w5 part 2: unattended wall clock at campaign level, inter-attempt cache-TTL exposure,
// and the cost of a round that does not promote.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const campaignsRoot = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const REAL = { input: 1.0, output: 10.0, cacheRead: 0.1, cacheWrite: 1.25 }
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
function decode(file) {
  const buf = fs.readFileSync(file); const starts = []
  for (let i = 0; i + 4 <= buf.length; i += 1) if (buf.subarray(i, i + 4).equals(MAGIC)) starts.push(i)
  starts.push(buf.length); let text = ''
  for (let i = 0; i < starts.length - 1; i += 1) { try { text += zlib.zstdDecompressSync(buf.subarray(starts[i], starts[i + 1])).toString('utf8') } catch {} }
  return text
}
const dirOf = new Map()
for (const ws of fs.readdirSync(sessionsRoot)) {
  const wsDir = path.join(sessionsRoot, ws); let ids = []
  try { ids = fs.readdirSync(wsDir) } catch { continue }
  for (const id of ids) { const d = path.join(wsDir, id); if (fs.existsSync(path.join(d, 'session.v4.jsonl.zstd'))) dirOf.set(id, d) }
}
function usage(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const u = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, blocks: 0 }
  let firstT = null, lastT = null
  for (const line of t.split('\n')) {
    if (!line.includes('assistant/message')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const m = e?.data?.message?.usage ?? e?.data?.usage
    if (m) { u.blocks += 1; u.input += +m.inputTokens || 0; u.output += +m.outputTokens || 0; u.cacheRead += +m.cacheReadTokens || 0; u.cacheWrite += +m.cacheWriteTokens || 0 }
    if (!firstT && e.time) firstT = e.time
    if (e.time) lastT = e.time
  }
  return { u, firstT, lastT,
    usd: (u.input * REAL.input + u.output * REAL.output + u.cacheRead * REAL.cacheRead + u.cacheWrite * REAL.cacheWrite) / 1e6 }
}

const camps = []
for (const c of fs.readdirSync(campaignsRoot)) {
  const ev = path.join(campaignsRoot, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const A = [], R = []; let created = null, status = null
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'campaign.created') created = e.t
    if (e.type === 'campaign.status') status = e.data?.status ?? status
    if (e.type === 'attempt.finished') A.push({ t: e.t, sid: e.data?.sessionId ? String(e.data.sessionId) : null,
      round: e.data?.round, ok: e.data?.verifierOk, err: !!e.data?.error, ab: !!e.data?.abandoned,
      ms: +e.data?.durationMs || 0, recorded: +e.data?.costUsd || 0 })
    if (e.type === 'round.finished') R.push({ t: e.t, round: e.data?.n ?? e.data?.id ?? e.data?.round, promoted: !!e.data?.promoted,
      status: e.data?.status, ms: +e.data?.durationMs || 0, recorded: +e.data?.costUsd || 0 })
  }
  camps.push({ c, created, status, A, R })
}

let totalSpanH = 0, totalAttemptH = 0, spans = []
const gapsInter = [], roundGaps = []
let allUsd = 0, promotedUsd = 0, npUsd = 0, nPromoted = 0, nNotPromoted = 0
const perCampaign = []
for (const k of camps) {
  if (!k.A.length) continue
  const first = k.created ?? Math.min(...k.A.map((a) => a.t))
  const last = Math.max(...k.A.map((a) => a.t), ...(k.R.length ? k.R.map((r) => r.t) : [0]))
  const spanH = (last - first) / 3_600_000
  spans.push(spanH); totalSpanH += spanH
  totalAttemptH += k.A.reduce((s, a) => s + a.ms, 0) / 3_600_000
  const ts = [...k.A].sort((a, b) => a.t - b.t)
  for (let i = 1; i < ts.length; i += 1) gapsInter.push(ts[i].t - ts[i - 1].t)
  const rs = [...k.R].sort((a, b) => a.t - b.t)
  for (let i = 1; i < rs.length; i += 1) roundGaps.push(rs[i].t - rs[i - 1].t)
  // per-round cost from its own attempts
  const byRound = new Map()
  for (const a of k.A) {
    const sid = a.sid && dirOf.has(a.sid) ? usage(dirOf.get(a.sid)).usd : 0
    const key = a.round ?? 0
    byRound.set(key, (byRound.get(key) || 0) + sid)
  }
  for (const r of k.R) {
    const usd = byRound.get(r.round ?? 0) || 0
    allUsd += usd
    if (r.promoted) { promotedUsd += usd; nPromoted += 1 } else { npUsd += usd; nNotPromoted += 1 }
  }
  perCampaign.push({ c: k.c, spanH: +spanH.toFixed(2), attempts: k.A.length, rounds: k.R.length })
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null }
const cnt = (a, f) => a.filter(f).length

perCampaign.sort((x, y) => y.spanH - x.spanH)
console.log(JSON.stringify({
  campaigns: camps.length,
  withAttempts: perCampaign.length,
  unattended: {
    totalSpanHours: +totalSpanH.toFixed(1),
    utilShare: +(totalAttemptH / totalSpanH).toFixed(3),
    spanMedianH: +q(spans, 0.5).toFixed(2),
    spanP90H: +q(spans, 0.9).toFixed(2),
    spanMaxH: +q(spans, 1).toFixed(2),
    top5: perCampaign.slice(0, 5),
  },
  interAttemptGap: { n: gapsInter.length, medianSec: Math.round(q(gapsInter, 0.5) / 1000),
    p90Sec: Math.round(q(gapsInter, 0.9) / 1000), p99Sec: Math.round(q(gapsInter, 0.99) / 1000),
    over300s: cnt(gapsInter, (g) => g > 300_000), over1h: cnt(gapsInter, (g) => g > 3_600_000) },
  interRoundGap: { n: roundGaps.length, medianSec: Math.round(q(roundGaps, 0.5) / 1000),
    p90Sec: Math.round(q(roundGaps, 0.9) / 1000), over300s: cnt(roundGaps, (g) => g > 300_000) },
  roundEconomics: { promoted: nPromoted, notPromoted: nNotPromoted,
    promotedUsd: +promotedUsd.toFixed(2), notPromotedUsd: +npUsd.toFixed(2),
    meanPromotedUsd: nPromoted ? +(promotedUsd / nPromoted).toFixed(3) : null,
    meanNotPromotedUsd: nNotPromoted ? +(npUsd / nNotPromoted).toFixed(3) : null },
}, null, 2))
