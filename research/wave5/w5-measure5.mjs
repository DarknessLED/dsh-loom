// w5 part 5: at the ACTUAL route card — where the money goes, what waste costs,
// and what share of all cache traffic is the same fixed preamble re-sent.
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
  for (const id of ids) { const d = path.join(wsDir, id); if (fs.existsSync(path.join(d, 'session.v4.jsonl.zstd'))) dirOf.set(id, d) }
}
const DS = { miss: 0.15, hit: 0.003, out: 0.60 } // off-peak V4.1 Flash; all 431 attempts ran off-peak
const usd = (u) => (u.input * DS.miss + u.cacheRead * DS.hit + u.output * DS.out) / 1e6

function scan(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const u = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, blocks: 0 }
  let sysChars = 0, toolChars = 0, firstRead = 0, sysTokens = 0
  for (const line of t.split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'system/message') { const c = e?.data?.message?.content; sysChars += typeof c === 'string' ? c.length : JSON.stringify(c ?? '').length }
    else if (e.type === 'request/header') {
      const h = e?.data?.header ?? e?.data ?? {}
      toolChars += JSON.stringify(h.tools ?? '').length
      sysChars += JSON.stringify(h.system ?? '').length
    } else if (e.type === 'assistant/message') {
      const m = e?.data?.message?.usage ?? e?.data?.usage
      if (!m) continue
      if (u.blocks === 0) firstRead = +m.cacheReadTokens || 0
      u.blocks += 1; u.input += +m.inputTokens || 0; u.output += +m.outputTokens || 0
      u.cacheRead += +m.cacheReadTokens || 0; u.cacheWrite += +m.cacheWriteTokens || 0
    }
  }
  return { u, sysChars, toolChars, firstRead }
}

const meta = new Map()
const roundsByC = new Map()
for (const c of fs.readdirSync(campaignsRoot)) {
  const ev = path.join(campaignsRoot, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const R = []
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue; let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'attempt.finished' && e.data?.sessionId) meta.set(String(e.data.sessionId), {
      c, a: e.data.id, round: e.data.round, recorded: +e.data.costUsd || 0, ms: +e.data.durationMs || 0,
      err: !!e.data.error, ab: !!e.data.abandoned, ok: e.data.verifierOk, timedOut: !!e.data.timedOut })
    if (e.type === 'round.finished') R.push({ n: e.data?.n, promoted: !!e.data.promoted, ms: +e.data.durationMs || 0 })
  }
  roundsByC.set(c, R)
}
const rows = []
for (const [sid, m] of meta) {
  if (!dirOf.has(sid)) continue
  const s = scan(dirOf.get(sid))
  if (!s.u.blocks) continue
  rows.push({ ...m, ...s, usd: usd(s.u) })
}
const T = rows.reduce((a, r) => ({ input: a.input + r.u.input, output: a.output + r.u.output, cacheRead: a.cacheRead + r.u.cacheRead, blocks: a.blocks + r.u.blocks }), { input: 0, output: 0, cacheRead: 0, blocks: 0 })
const usdTotal = rows.reduce((a, r) => a + r.usd, 0)
const bucket = { miss: T.input * DS.miss / 1e6, hit: T.cacheRead * DS.hit / 1e6, out: T.output * DS.out / 1e6 }
const sum = (f) => rows.filter(f).reduce((a, r) => a + r.usd, 0)
const wasted = rows.filter((r) => r.err || r.ab || r.ok === false || r.timedOut)
const hours = rows.reduce((a, r) => a + r.ms, 0) / 3_600_000
// preamble share of cache traffic
const meanFirstRead = rows.reduce((a, r) => a + r.firstRead, 0) / rows.length
const preambleReadTokens = meanFirstRead * T.blocks
const sysTok = rows.reduce((a, r) => a + (r.sysChars + r.toolChars) / 4, 0) / rows.length
// per-promotion at this card
const promoted = [...roundsByC.values()].flat().filter((r) => r.promoted).length
console.log(JSON.stringify({
  atActualCard: {
    totalUsd: +usdTotal.toFixed(3), perHour: +(usdTotal / hours).toFixed(3), attempts: rows.length,
    perAttemptMedian: null,
    bucketUsd: { miss: +bucket.miss.toFixed(3), hit: +bucket.hit.toFixed(3), out: +bucket.out.toFixed(3) },
    bucketSharePct: { miss: +(bucket.miss / usdTotal * 100).toFixed(1), hit: +(bucket.hit / usdTotal * 100).toFixed(1), out: +(bucket.out / usdTotal * 100).toFixed(1) },
    tokenSharePct: { miss: +(T.input / (T.input + T.cacheRead + T.output) * 100).toFixed(1),
      hit: +(T.cacheRead / (T.input + T.cacheRead + T.output) * 100).toFixed(1),
      out: +(T.output / (T.input + T.cacheRead + T.output) * 100).toFixed(1) },
  },
  costPerPromotionAtActualCard: promoted ? +(usdTotal / promoted).toFixed(3) : null,
  promotedRounds: promoted,
  waste: { attempts: wasted.length, sharePct: +(wasted.length / rows.length * 100).toFixed(1),
    usd: +sum((r) => r.err || r.ab || r.ok === false || r.timedOut).toFixed(3),
    errUsd: +sum((r) => r.err).toFixed(3), errN: rows.filter((r) => r.err).length,
    verifierFailUsd: +sum((r) => r.ok === false && !r.err).toFixed(3),
    abortUsd: +sum((r) => r.ab && !r.err).toFixed(3) },
  preamble: { meanFirstBlockCacheReadTokens: Math.round(meanFirstRead), meanPreambleTokensEst: Math.round(sysTok),
    requestsTotal: T.blocks, preambleReadTokens: Math.round(preambleReadTokens),
    shareOfAllCacheRead: +(preambleReadTokens / T.cacheRead * 100).toFixed(1),
    usdOfPreambleAtHit: +(preambleReadTokens * DS.hit / 1e6).toFixed(3) },
}, null, 2))
