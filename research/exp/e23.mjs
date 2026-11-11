// Counterfactual: if the tie-break preferred the CHEAPER verified attempt instead
// of a1, what would it have cost and would the promoted work have differed?
// No model calls: this replays recorded attempts.
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

const rounds = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const attempts = new Map()
  const promoted = new Set()
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.finished') attempts.set(String(d.id), d)
    if (e.type === 'gate.evaluated' && d.promoted && d.candidateId) promoted.add(String(d.candidateId))
  }
  const byRound = new Map()
  for (const [id, a] of attempts) {
    const r = Number(a.round)
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r).push({ id, ...a, usd: costOf(String(a.sessionId)) })
  }
  for (const [r, rows] of byRound) {
    const eligible = rows.filter((x) => x.verifierOk && (x.diff?.files ?? 0) > 0)
    if (eligible.length < 2) continue
    const actual = eligible.find((x) => promoted.has(x.id))
    if (!actual) continue
    const cheaper = [...eligible].sort((a, b) => a.usd - b.usd || (a.id < b.id ? -1 : 1))[0]
    rounds.push({
      campaign: c, round: r,
      actualId: actual.id, actualUsd: actual.usd,
      cheaperId: cheaper.id, cheaperUsd: cheaper.usd,
      cheaperDiffers: cheaper.id !== actual.id,
      filesChangedEqual: JSON.stringify((actual.diff?.filesChanged ?? []).sort()) === JSON.stringify((cheaper.diff?.filesChanged ?? []).sort()),
    })
  }
}

const differing = rounds.filter((r) => r.cheaperDiffers)
const save = rounds.reduce((s, r) => s + (r.actualUsd - r.cheaperUsd), 0)
const spent = rounds.reduce((s, r) => s + r.actualUsd, 0)
const saveDiff = differing.reduce((s, r) => s + (r.actualUsd - r.cheaperUsd), 0)
const spentDiff = differing.reduce((s, r) => s + r.actualUsd, 0)
const sameFiles = differing.filter((r) => r.filesChangedEqual).length

console.log(JSON.stringify({
  eligibleRounds: rounds.length,
  wouldPickDifferentAttempt: differing.length,
  differentAttemptTouchesSameFiles: sameFiles,
  currentSpendOnTheseRounds: +spent.toFixed(3),
  spendIfCheapestTieBreak: +(spent - save).toFixed(3),
  saving: +save.toFixed(3),
  savingPct: +(100 * save / spent).toFixed(1),
  savingOnDifferingRoundsOnly: { spend: +spentDiff.toFixed(3), save: +saveDiff.toFixed(3), pct: +(100 * saveDiff / spentDiff).toFixed(1) },
}, null, 2))
