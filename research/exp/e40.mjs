// The review bill: a night of unattended work ends with a queue of promotions a
// human is supposed to read. Sum the size of that queue, and split it by whether
// the promotion was on a task the campaign had already solved.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const promos = []
const taskOf = new Map()
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const dir = path.join(base, c)
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') taskOf.set(c + '|' + d.n, d.taskId)
    if (e.type === 'artifact.promoted') {
      const round = Number(d.round)
      const task = taskOf.get(c + '|' + round) ?? null
      // Measure the patch on disk rather than trusting the report.
      let lines = 0, files = 0, bytes = 0, noop = d.noop === true
      const p = d.patch && fs.existsSync(d.patch) ? d.patch : null
      if (p) {
        const text = fs.readFileSync(p, 'utf8')
        bytes = text.length
        for (const l of text.split('\n')) {
          if (l.startsWith('+++') || l.startsWith('---')) { files += 1; continue }
          if (l.startsWith('+') || l.startsWith('-')) lines += 1
        }
        files = Math.floor(files / 2)
      }
      promos.push({ campaign: c, round, task, attemptId: d.attemptId, score: d.score, lines, files, bytes, noop, patch: p })
    }
  }
}

const withPatch = promos.filter((p) => p.patch)
const sorted = [...withPatch].sort((a, b) => a.lines - b.lines)
const q = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(arr.length * f))]
const totalLines = withPatch.reduce((a, p) => a + p.lines, 0)
const totalFiles = withPatch.reduce((a, p) => a + p.files, 0)

console.log(JSON.stringify({
  promotions: promos.length,
  promotionsWithPatchOnDisk: withPatch.length,
  noopPromotions: promos.filter((p) => p.noop).length,
  totalChangedLines: totalLines,
  totalFilesTouched: totalFiles,
  meanLines: +(totalLines / withPatch.length).toFixed(1),
  medianLines: q(sorted.map((p) => p.lines), 0.5),
  p90Lines: q(sorted.map((p) => p.lines), 0.9),
  maxLines: sorted[sorted.length - 1]?.lines ?? null,
  reviewMinutesAt20LinesPerMinute: +(totalLines / 20).toFixed(0),
  reviewMinutesAt60sPerPromotionFloor: promos.length,
  distinctTasksPromoted: new Set(promos.map((p) => p.task)).size,
  // How many promotions land on a task the same campaign already promoted before?
  repeatTaskPromotions: (() => {
    const seen = new Set()
    let repeats = 0
    for (const p of [...promos].sort((a, b) => (a.round || 0) - (b.round || 0))) {
      const key = p.campaign + '|' + p.task
      if (seen.has(key)) repeats += 1
      seen.add(key)
    }
    return repeats
  })(),
}, null, 2))
