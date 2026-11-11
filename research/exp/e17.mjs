// Verify the 246x claim independently, and split it into its two factors:
// (a) are tokens even recorded, (b) is the price table right.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'
const home = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const sessionsRoot = path.join(os.homedir(), '.dsh', 'sessions')

// 1. what does the loop record as cost?
let costEvents = 0, costSum = 0
const sessionIds = new Map()
for (const c of fs.readdirSync(home)) {
  const ev = path.join(home, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'attempt.finished' && e.data?.costUsd !== undefined) { costEvents += 1; costSum += Number(e.data.costUsd) || 0 }
    if (e.type === 'attempt.finished' && e.data?.sessionId) sessionIds.set(String(e.data.sessionId), c)
  }
}

// 2. read the real usage out of one archived transcript to confirm usage exists
const frames = []
const decode = (file) => {
  const buf = fs.readFileSync(file)
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
  const starts = []
  for (let i = 0; i + 4 <= buf.length; i += 1) if (buf.subarray(i, i + 4).equals(magic)) starts.push(i)
  starts.push(buf.length)
  let text = ''
  for (let i = 0; i < starts.length - 1; i += 1) {
    try { text += zlib.zstdDecompressSync(buf.subarray(starts[i], starts[i + 1])).toString('utf8') } catch {}
  }
  return text
}

let found = 0, usageBlocks = 0, inputTok = 0, outputTok = 0, cacheRead = 0, cacheWrite = 0
const sample = []
// layout: sessions/<workspace-slug>/<session-id>/session.v4.jsonl.zstd
const sessionDirs = []
for (const ws of fs.readdirSync(sessionsRoot)) {
  const wsDir = path.join(sessionsRoot, ws)
  let ids = []
  try { ids = fs.readdirSync(wsDir) } catch { continue }
  for (const id of ids) {
    const d = path.join(wsDir, id)
    if (fs.existsSync(path.join(d, 'session.v4.jsonl.zstd'))) sessionDirs.push(d)
  }
}
for (const d of sessionDirs) {
  const files = ['session.v4.jsonl.zstd']
  for (const f of files) {
    const text = decode(path.join(d, f))
    for (const line of text.split('\n')) {
      if (!line.includes('assistant/message') || !line.includes('"usage"')) continue
      let e; try { e = JSON.parse(line) } catch { continue }
      const u = e?.data?.message?.usage || e?.data?.usage
      if (!u) continue
      usageBlocks += 1
      inputTok += Number(u.input_tokens ?? u.inputTokens ?? 0) || 0
      outputTok += Number(u.output_tokens ?? u.outputTokens ?? 0) || 0
      cacheRead += Number(u.cache_read_input_tokens ?? u.cacheReadTokens ?? 0) || 0
      cacheWrite += Number(u.cache_creation_input_tokens ?? u.cacheWriteTokens ?? 0) || 0
      if (sample.length < 1) sample.push(u)
    }
    found += 1
  }
}

console.log(JSON.stringify({
  recorded: { attempts: costEvents, usd: +costSum.toFixed(4) },
  transcriptsScanned: found,
  usageBlocks, inputTok, outputTok, cacheRead, cacheWrite,
  cacheReadShareOfInput: inputTok + cacheRead ? +(100 * cacheRead / (inputTok + cacheRead)).toFixed(1) : null,
  sampleUsageKeys: sample[0] ? Object.keys(sample[0]) : null,
}, null, 2))
