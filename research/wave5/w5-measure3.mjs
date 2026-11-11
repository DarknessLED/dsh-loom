// w5 part 3: inside one attempt — how context resend scales, what the fixed preamble costs,
// and the marginal price of one more request.
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
// per assistant block: cumulative in/out/cacheRead so we can see the replay curve
function blocks(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const out = []
  for (const line of t.split('\n')) {
    if (!line.includes('assistant/message')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const m = e?.data?.message?.usage ?? e?.data?.usage
    if (!m) continue
    out.push({ t: e.time, input: +m.inputTokens || 0, output: +m.outputTokens || 0,
      cacheRead: +m.cacheReadTokens || 0, cacheWrite: +m.cacheWriteTokens || 0 })
  }
  return out
}
const sidOf = new Map()
for (const c of fs.readdirSync(campaignsRoot)) {
  const ev = path.join(campaignsRoot, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue; let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'attempt.finished' && e.data?.sessionId) sidOf.set(String(e.data.sessionId), { c, a: e.data.id, round: e.data.round })
  }
}
const rows = []
for (const [sid, meta] of sidOf) {
  if (!dirOf.has(sid)) continue
  const b = blocks(dirOf.get(sid)); if (!b.length) continue
  rows.push({ ...meta, b })
}
// position curve: mean cacheRead at block index k, normalised by the attempt's own first block
const byIdx = new Map()
for (const r of rows) r.b.forEach((x, i) => {
  if (i > 30) return
  if (!byIdx.has(i)) byIdx.set(i, [])
  byIdx.get(i).push(x.cacheRead)
})
const curve = []
for (const i of [...byIdx.keys()].sort((a, b) => a - b)) {
  const a = byIdx.get(i); curve.push({ k: i, n: a.length, meanCacheRead: Math.round(a.reduce((x, y) => x + y, 0) / a.length) })
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null }
// first-block economics: what an attempt pays before it has done anything
const firstInput = rows.map((r) => r.b[0].input)
const firstCacheRead = rows.map((r) => r.b[0].cacheRead)
const firstWrite = rows.map((r) => r.b[0].cacheWrite)
const reqPer = rows.map((r) => r.b.length)
// sum of output vs cache read, and the ratio last/first
const growth = rows.map((r) => (r.b.length > 2 ? r.b[r.b.length - 1].cacheRead / Math.max(1, r.b[1].cacheRead) : null)).filter((x) => x && x > 0)
// dollar split inside one attempt on the anthropic-shaped card
let inp = 0, outc = 0, cr = 0, cw = 0
for (const r of rows) for (const x of r.b) { inp += x.input; outc += x.output; cr += x.cacheRead; cw += x.cacheWrite }
const usd = { input: inp / 1e6, output: outc * 10 / 1e6, cacheRead: cr * 0.1 / 1e6, cacheWrite: cw * 1.25 / 1e6 }
const tot = usd.input + usd.output + usd.cacheRead + usd.cacheWrite
// what one extra request costs at the median context size
const medCtx = q(rows.map((r) => { const b = r.b; return b.reduce((s, x) => s + x.cacheRead, 0) / b.length }), 0.5)
console.log(JSON.stringify({
  sessions: rows.length,
  requestsPerAttempt: { median: q(reqPer, 0.5), mean: +(reqPer.reduce((a, b) => a + b, 0) / reqPer.length).toFixed(1), p90: q(reqPer, 0.9) },
  firstBlock: { inputMedian: q(firstInput, 0.5), inputMean: Math.round(firstInput.reduce((a, b) => a + b, 0) / firstInput.length),
    cacheReadMedian: q(firstCacheRead, 0.5), cacheWriteSum: firstWrite.reduce((a, b) => a + b, 0) },
  contextGrowth: { medianLastOverSecond: q(growth, 0.5) ? +q(growth, 0.5).toFixed(2) : null,
    p90: +q(growth, 0.9).toFixed(2), max: +q(growth, 1).toFixed(2) },
  curve,
  attemptDollarSplit: { input: +usd.input.toFixed(2), output: +usd.output.toFixed(2), cacheRead: +usd.cacheRead.toFixed(2), cacheWrite: +usd.cacheWrite.toFixed(2),
    outputShare: +(usd.output / tot * 100).toFixed(1), cacheReadShare: +(usd.cacheRead / tot * 100).toFixed(1) },
  marginalRequest: { medianMeanCtxTokens: Math.round(medCtx), usdAtCacheRead: +(medCtx * 0.1 / 1e6).toFixed(5) },
}, null, 2))
