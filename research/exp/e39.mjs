// The dominant failure string says "parent or provider unavailable". Is the child
// session log actually silent, or is the recovery lookup failing? Compare the
// attempt record against the child session's own archive on disk.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const home = os.homedir()
const camps = path.join(home, '.dsh', 'loom', 'campaigns')
const sessionsRoot = path.join(home, '.dsh', 'sessions')

// Every attempt that reported the silent error, with its child session id.
const rows = []
for (const c of fs.readdirSync(camps)) {
  const ev = path.join(camps, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type !== 'attempt.finished') continue
    const err = String(d.error || '')
    if (!err.includes('no diagnostic')) continue
    rows.push({ campaign: c, id: d.id, sessionId: d.sessionId, diagnosisSource: d.diagnosisSource ?? null })
  }
}

// Find each child session's archive and look for an error event in it.
function frames(buf) {
  const out = []
  let i = 0
  while (i < buf.length - 3) {
    const a = buf.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), i)
    if (a < 0) break
    const b = buf.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), a + 4)
    const end = b < 0 ? buf.length : b
    try { out.push(zlib.zstdDecompressSync(buf.subarray(a, end)).toString('utf8')) } catch { /* partial frame */ }
    i = end
  }
  return out.join('')
}

const found = { checked: 0, archiveMissing: 0, hadErrorEvent: 0, hadDiagnosticText: 0, examples: [] }
const seen = new Set(rows.map((r) => r.sessionId).filter(Boolean))
for (const sid of seen) {
  found.checked += 1
  let file = null
  for (const ws of fs.readdirSync(sessionsRoot)) {
    const p = path.join(sessionsRoot, ws, sid, 'session.v4.jsonl.zstd')
    if (fs.existsSync(p)) { file = p; break }
  }
  if (!file) { found.archiveMissing += 1; continue }
  let text = ''
  try { text = frames(fs.readFileSync(file)) } catch { /* unreadable */ }
  // The diagnosis lives at turn/end -> reason.error.message, so look for that
  // shape rather than for a bare "error":"..." pair.
  const tails = text.split('\n').filter((l) => l.includes('"turn/end"'))
  const withMessage = tails.filter((l) => /"reason"\s*:\s*\{[^}]*"kind"\s*:\s*"error"/.test(l) && /"message"\s*:\s*"/.test(l))
  if (withMessage.length) {
    found.hadErrorEvent += 1
    found.hadDiagnosticText += 1
    if (found.examples.length < 3) {
      try {
        const e = JSON.parse(withMessage[withMessage.length - 1])
        const msg = e?.data?.reason?.error?.message ?? e?.reason?.error?.message ?? ''
        found.examples.push({ sid, message: String(msg).slice(0, 220) })
      } catch { /* keep counting */ }
    }
  }
}

console.log(JSON.stringify({
  attemptsWithSilentError: rows.length,
  distinctChildSessions: seen.size,
  ...found,
  sampleRows: rows.slice(0, 4),
}, null, 2))
