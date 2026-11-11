// w5 part 4: price the SAME usage at the route's own published card, split peak/off-peak,
// and find usage sitting in child sessions the attempt ledger never sees.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const campaignsRoot = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
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
  for (const id of ids) { const d = path.join(wsDir, id); if (fs.existsSync(path.join(d, 'session.v4.jsonl.zstd'))) dirOf.set(id, { dir: d, ws }) }
}
// DeepSeek V4.1 Flash published card, USD per Mtok (api-docs.deepseek.com/quick_start/pricing, fetched 2026-11-12)
const DS = { peak: { miss: 0.30, hit: 0.006, out: 1.20 }, off: { miss: 0.15, hit: 0.003, out: 0.60 } }
// peak = 01:00-04:00 and 06:00-10:00 UTC Mon-Fri
function isPeak(ms) {
  const d = new Date(ms); const dow = d.getUTCDay(); if (dow === 0 || dow === 6) return false
  const h = d.getUTCHours(); return (h >= 1 && h < 4) || (h >= 6 && h < 10)
}
function scan(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const u = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, blocks: 0, peakBlocks: 0, offBlocks: 0 }
  let peakUsd = 0, offUsd = 0, parent = null, first = null, last = null
  for (const line of t.split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'session' && e.data?.parentSessionId) parent = String(e.data.parentSessionId)
    if (e.type === 'subagent/descriptor' && e.data?.parentSessionId) parent = String(e.data.parentSessionId)
    if (e.type !== 'assistant/message') continue
    const m = e?.data?.message?.usage ?? e?.data?.usage
    if (e.time) { if (!first) first = e.time; last = e.time }
    if (!m) continue
    const bk = { input: +m.inputTokens || 0, output: +m.outputTokens || 0, cacheRead: +m.cacheReadTokens || 0, cacheWrite: +m.cacheWriteTokens || 0 }
    u.blocks += 1; u.input += bk.input; u.output += bk.output; u.cacheRead += bk.cacheRead; u.cacheWrite += bk.cacheWrite
    const card = isPeak(e.time || Date.now()) ? DS.peak : DS.off
    if (isPeak(e.time || Date.now())) u.peakBlocks += 1; else u.offBlocks += 1
    // DeepSeek bills cache hit vs miss; no separate write premium. inputTokens == cache miss portion.
    peakUsd += 0; offUsd += 0
    const ppm = isPeak(e.time || Date.now())
    const v = (bk.input * card.miss + bk.cacheRead * card.hit + bk.output * card.out) / 1e6
    if (ppm) peakUsd += v; else offUsd += v
  }
  return { u, peakUsd, offUsd, parent, first, last }
}

// attempt sessions
const meta = new Map()
for (const c of fs.readdirSync(campaignsRoot)) {
  const ev = path.join(campaignsRoot, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line.includes('attempt.finished')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.data?.sessionId) meta.set(String(e.data.sessionId), { c, a: e.data.id, recorded: +e.data.costUsd || 0, ms: +e.data.durationMs || 0 })
  }
}
const scanned = new Map()
for (const [sid, m] of meta) {
  if (!dirOf.has(sid)) continue
  scanned.set(sid, { ...m, ...scan(dirOf.get(sid).dir) })
}
// find child sessions of attempt sessions (subagents inside an attempt) that the attempt row never counts
const children = []
for (const [sid, info] of dirOf) {
  if (meta.has(sid)) continue
  const s = scan(info.dir)
  if (!s.parent) continue
  if (meta.has(s.parent)) children.push({ parent: s.parent, sid, usdAtDS: s.peakUsd + s.offUsd, blocks: s.u.blocks, tokens: s.u })
}
const attDS = [...scanned.values()].reduce((a, r) => a + r.peakUsd + r.offUsd, 0)
const childDS = children.reduce((a, r) => a + r.usdAtDS, 0)
const recorded = [...scanned.values()].reduce((a, r) => a + r.recorded, 0)
const peakShare = [...scanned.values()].reduce((a, r) => a + r.u.peakBlocks, 0) /
  Math.max(1, [...scanned.values()].reduce((a, r) => a + r.u.blocks, 0))
const hours = [...scanned.values()].reduce((a, r) => a + r.ms, 0) / 3_600_000
const byCamp = new Map()
for (const r of scanned.values()) byCamp.set(r.c, (byCamp.get(r.c) || 0) + r.peakUsd + r.offUsd)
const top = [...byCamp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
console.log(JSON.stringify({
  routedAs: 'command-code / deepseek/deepseek-v4.1-flash (subagent/descriptor in every attempt session)',
  attempts: scanned.size,
  totalsAtDeepSeekCard: {
    attemptSessions: +attDS.toFixed(3), childSessionsInsideAttempts: +childDS.toFixed(3),
    childSessionCount: children.length,
    recordedByLoom: +recorded.toFixed(5),
    undercountAttemptOnly: recorded ? +(attDS / recorded).toFixed(0) : null,
    undercountWithChildren: recorded ? +((attDS + childDS) / recorded).toFixed(0) : null,
  },
  alreadyInGraphAtLoomTable: 21.3868,
  tableComparison: { loomDefault: 21.3868, actualRoute: +attDS.toFixed(3), loomOverstates: +(21.3868 / attDS).toFixed(2) },
  peak: { blockShare: +peakShare.toFixed(2), attemptsWhollyOffPeak: [...scanned.values()].filter((r) => r.u.peakBlocks === 0).length },
  perHourAtActualCard: +(attDS / hours).toFixed(2),
  perAttemptAtActualCard: +(attDS / scanned.size).toFixed(4),
  topCampaigns: top.map(([c, u]) => ({ c, usd: +u.toFixed(3) })),
  childPreview: children.slice(0, 5).map((c) => ({ parent: c.parent, blocks: c.blocks, usd: +c.usdAtDS.toFixed(3), tokens: c.tokens })),
}, null, 2))
