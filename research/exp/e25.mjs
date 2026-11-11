// The human's actual job: review promoted diffs. How big are they, and how much
// of the diff is noise (lockfiles, vendored code, reformatting)?
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const NOISE = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock|node_modules\/|dist\/|build\/|\.min\.js$|\.map$)/

const rows = []
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
  for (const id of promoted) {
    const a = attempts.get(id)
    if (!a) continue
    const files = (a.diff?.filesChanged ?? [])
    const insertions = Number(a.diff?.insertions) || 0
    const deletions = Number(a.diff?.deletions) || 0
    const noisyFiles = files.filter((f) => NOISE.test(String(f).replace(/\\/g, '/')))
    rows.push({
      campaign: c, attempt: id,
      files: files.length,
      noisyFiles: noisyFiles.length,
      lines: insertions + deletions,
      insertions, deletions,
      durationMs: Number(a.durationMs) || 0,
      hasReport: Boolean(a.report),
      hasClaim: Boolean(a.report?.lesson),
      claimedFiles: (a.report?.changed ?? []).length,
      claimMentionsChanged: (a.report?.changed ?? []).length > 0,
    })
  }
}

const q = (a, p) => (a.length ? a[Math.floor((a.length - 1) * p)] : null)
const lines = rows.map((r) => r.lines).sort((a, b) => a - b)
const filesArr = rows.map((r) => r.files).sort((a, b) => a - b)
const clean = rows.filter((r) => r.noisyFiles === 0)
const under50 = rows.filter((r) => r.lines <= 50)
const over300 = rows.filter((r) => r.lines > 300)

// do self-reports name the same files the diff touched?
let reportMatch = 0, reportMismatch = 0, noReport = 0
for (const r of rows) {
  if (!r.claimMentionsChanged) { noReport += 1; continue }
  if (r.claimedFiles === r.files) reportMatch += 1; else reportMismatch += 1
}

console.log(JSON.stringify({
  promotions: rows.length,
  lines: { median: q(lines, 0.5), p25: q(lines, 0.25), p75: q(lines, 0.75), p90: q(lines, 0.9), max: lines[lines.length - 1] },
  files: { median: q(filesArr, 0.5), p90: q(filesArr, 0.9), max: filesArr[filesArr.length - 1] },
  reviewableInOneSitting: { under50Lines: under50.length, share: +(under50.length / rows.length).toFixed(3) },
  needsChunking: { over300Lines: over300.length, share: +(over300.length / rows.length).toFixed(3) },
  promotionsWithLockOrVendorNoise: rows.length - clean.length,
  selfReportFileCountMatchesDiff: { match: reportMatch, mismatch: reportMismatch, missing: noReport },
  hasLessonClaim: rows.filter((r) => r.hasClaim).length,
}, null, 2))
