// w5 token-budget measurement: what a correctly metered unattended loop costs per hour,
// where the money goes, and what a wasted round costs. Independent of e18's aggregation.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')
const campaignsRoot = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

// Loom's own default table (understates output vs real rate cards: see w4-metering-price-table-inverted)
const LOOM = { input: 0.28, output: 0.42, cacheRead: 0.028, cacheWrite: 0.28 * 1.25 }
// A "correct" table at the shape of a current frontier rate card, same model class:
// input 1.00, output 10.00, cacheRead 0.10, 5m cacheWrite 1.25 (per Mtok)
const REAL = { input: 1.0, output: 10.0, cacheRead: 0.1, cacheWrite: 1.25 }

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

// per-session: usage totals, request timeline, part sizes (system/tools preamble)
function scan(dir) {
  const t = decode(path.join(dir, 'session.v4.jsonl.zstd'))
  const u = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, blocks: 0 }
  const times = []
  let firstIsolatedInput = null, preambleChars = 0, toolDefChars = 0
  for (const line of t.split('\n')) {
    if (!line) continue
    if (!line.includes('assistant/message') && !line.includes('system/message') && !line.includes('request/header')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'assistant/message') {
      const m = e?.data?.message?.usage ?? e?.data?.usage
      if (m) {
        u.blocks += 1
        u.input += Number(m.inputTokens ?? 0) || 0
        u.output += Number(m.outputTokens ?? 0) || 0
        u.cacheRead += Number(m.cacheReadTokens ?? 0) || 0
        u.cacheWrite += Number(m.cacheWriteTokens ?? 0) || 0
        if (u.blocks === 1) firstIsolatedInput = Number(m.inputTokens ?? 0) || 0
      }
      if (e.time) times.push(e.time)
    } else if (e.type === 'system/message') {
      const c = e?.data?.message?.content
      preambleChars += typeof c === 'string' ? c.length : JSON.stringify(c ?? '').length
    } else if (e.type === 'request/header') {
      toolDefChars += JSON.stringify(e?.data ?? '').length
    }
  }
  return { u, times, firstIsolatedInput, preambleChars, toolDefChars, lines: t.split('\n').length }
}

const price = (u, P) => (u.input * P.input + u.output * P.output + u.cacheRead * P.cacheRead + u.cacheWrite * P.cacheWrite) / 1e6

// ---- join attempts -> sessions, and pull round/campaign wall clock ----
const attempts = []
const rounds = []
for (const c of fs.readdirSync(campaignsRoot)) {
  const ev = path.join(campaignsRoot, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  let created = null
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'campaign.created') created = e.t
    if (e.type === 'attempt.finished') {
      attempts.push({
        campaign: c, attempt: e.data?.id, round: e.data?.round, sid: e.data?.sessionId ? String(e.data.sessionId) : null,
        verifierOk: e.data?.verifierOk, score: e.data?.score, error: e.data?.error ?? null,
        abandoned: e.data?.abandoned ?? null, durationMs: Number(e.data?.durationMs) || 0,
        costUsd: Number(e.data?.costUsd) || 0, timedOut: !!e.data?.timedOut, stopReason: e.data?.stopReason ?? null,
      })
    }
    if (e.type === 'round.finished') {
      rounds.push({ campaign: c, round: e.data?.id ?? e.data?.round, status: e.data?.status, promoted: !!e.data?.promoted,
        costUsd: Number(e.data?.costUsd) || 0, durationMs: Number(e.data?.durationMs) || 0, t: e.t })
    }
  }
}

const seen = new Set()
const rows = []
let preChars = 0, preN = 0
for (const a of attempts) {
  if (!a.sid || !dirOf.has(a.sid) || seen.has(a.sid)) continue
  seen.add(a.sid)
  const s = scan(dirOf.get(a.sid))
  if (s.u.blocks === 0) continue
  preChars += s.preambleChars + s.toolDefChars; preN += 1
  rows.push({ ...a, u: s.u, times: s.times, firstIsolatedInput: s.firstIsolatedInput,
    loomUsd: price(s.u, LOOM), realUsd: price(s.u, REAL) })
}

const sum = (a, f) => a.reduce((x, y) => x + f(y), 0)
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null }
const r4 = (x) => (x == null ? null : +x.toFixed(4))

// A. per-attempt economics, whole corpus
const realCosts = rows.map((r) => r.realUsd)
const totalReal = sum(rows, (r) => r.realUsd)
const totalLoomTable = sum(rows, (r) => r.loomUsd)
const totalRecorded = sum(rows, (r) => r.costUsd)
const coveredMs = sum(rows, (r) => r.durationMs)

// B. where the money goes on an Anthropic-shaped rate card
const bucket = { input: sum(rows, (r) => r.u.input) * REAL.input / 1e6,
  output: sum(rows, (r) => r.u.output) * REAL.output / 1e6,
  cacheRead: sum(rows, (r) => r.u.cacheRead) * REAL.cacheRead / 1e6,
  cacheWrite: sum(rows, (r) => r.u.cacheWrite) * REAL.cacheWrite / 1e6 }

// C. TTL: gap between consecutive assistant messages inside one attempt
const gaps = []
for (const r of rows) for (let i = 1; i < r.times.length; i += 1) gaps.push(r.times[i] - r.times[i - 1])
const over300 = gaps.filter((g) => g > 300_000)
const over3600 = gaps.filter((g) => g > 3_600_000)

// D. wasted vs productive spend
const wasted = rows.filter((r) => r.error || r.abandoned || r.verifierOk === false || r.timedOut)
const prod = rows.filter((r) => !(r.error || r.abandoned || r.verifierOk === false || r.timedOut))
const errOnly = rows.filter((r) => r.error)

// E. per-hour: sum cost of attempts / sum wall clock of those attempts
const perHourReal = totalReal / (coveredMs / 3_600_000)
// per landed promotion
const promotedRounds = rounds.filter((r) => r.promoted)
const attemptsPerPromotion = promotedRounds.length ? rows.length / promotedRounds.length : null
const costPerPromotion = promotedRounds.length ? totalReal / promotedRounds.length : null
const campaignClockMs = {}
for (const r of rounds) campaignClockMs[r.campaign] = Math.max(campaignClockMs[r.campaign] || 0, r.durationMs)

// F. fixed-per-call preamble: chars of system message + tool defs, and how many requests re-send it
const reqCount = rows.length ? sum(rows, (r) => r.u.blocks) : 0

console.log(JSON.stringify({
  corpus: { attemptsJoined: rows.length, campaigns: new Set(rows.map((r) => r.campaign)).size,
    requests: reqCount, assistantBlocks: sum(rows, (r) => r.u.blocks),
    wallClockHours: +(coveredMs / 3_600_000).toFixed(2) },
  tokens: { input: sum(rows, (r) => r.u.input), output: sum(rows, (r) => r.u.output),
    cacheRead: sum(rows, (r) => r.u.cacheRead), cacheWrite: sum(rows, (r) => r.u.cacheWrite),
    cacheReadShare: +(sum(rows, (r) => r.u.cacheRead) / Math.max(1, sum(rows, (r) => r.u.input + r.u.output + r.u.cacheRead + r.u.cacheWrite)) * 100).toFixed(1) },
  dollars: { recorded: r4(totalRecorded), loomTable: r4(totalLoomTable), anthropicShape: r4(totalReal),
    undercountVsRecorded: totalRecorded ? +(totalReal / totalRecorded).toFixed(0) : null,
    tableMismatch: +(totalReal / totalLoomTable).toFixed(1) },
  buckets: { input: r4(bucket.input), output: r4(bucket.output), cacheRead: r4(bucket.cacheRead), cacheWrite: r4(bucket.cacheWrite) },
  perAttempt: { median: r4(q(realCosts, 0.5)), mean: r4(totalReal / rows.length), p90: r4(q(realCosts, 0.9)), max: r4(q(realCosts, 0.999)) },
  perHour: { usd: r4(perHourReal), attemptsPerHour: +(rows.length / (coveredMs / 3_600_000)).toFixed(1) },
  perPromotion: { attempts: attemptsPerPromotion ? +attemptsPerPromotion.toFixed(2) : null, usd: r4(costPerPromotion) },
  ttl: { gaps: gaps.length, medianSec: q(gaps, 0.5) ? Math.round(q(gaps, 0.5) / 1000) : null,
    p90Sec: Math.round(q(gaps, 0.9) / 1000), p99Sec: Math.round(q(gaps, 0.99) / 1000),
    shareOver300s: +(over300.length / gaps.length * 100).toFixed(1), shareOver3600s: +(over3600.length / gaps.length * 100).toFixed(1) },
  waste: { attempts: rows.length, wasted: wasted.length, wastedShare: +(wasted.length / rows.length * 100).toFixed(1),
    wastedUsd: r4(sum(wasted, (r) => r.realUsd)), productiveUsd: r4(sum(prod, (r) => r.realUsd)),
    errorAttempts: errOnly.length, errorUsd: r4(sum(errOnly, (r) => r.realUsd)),
    verifierFailUsd: r4(sum(rows.filter((r) => r.verifierOk === false && !r.error), (r) => r.realUsd)) },
  preamble: { meanChars: Math.round(preChars / Math.max(1, preN)), requestsResending: reqCount,
    charsResentTotal: (Math.round(preChars / Math.max(1, preN)) * reqCount) },
}, null, 2))
