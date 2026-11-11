// Durability question with an operational answer: what does the loop lose when the
// host dies mid-round, and can recovery tell the difference between "the attempt was
// worthless" and "the attempt had already produced a verifiable patch"?
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')

const rows = []
for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const attempts = new Map()
  const finished = new Map()
  const artifactDir = path.join(campaigns, c, 'artifacts')
  let patchesOnDisk = new Set()
  try { patchesOnDisk = new Set(fs.readdirSync(artifactDir)) } catch {}
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'attempt.finished') attempts.set(String(d.id), { ...d, t: Number(e.t) || 0 })
    if (e.type === 'round.finished') finished.set(Number(d.n), { ...d, t: Number(e.t) || 0 })
  }
  for (const [id, a] of attempts) {
    const r = finished.get(Number(a.round))
    const interrupted = r?.status === 'interrupted'
    const patchName = id + '.patch'
    rows.push({
      campaign: c, id, round: Number(a.round),
      verifierOk: Boolean(a.verifierOk), hasPatchField: Boolean(a.patch),
      patchOnDisk: patchesOnDisk.has(patchName),
      roundInterrupted: interrupted,
      roundStatus: r?.status ?? null,
    })
  }
}

const diskMismatch = rows.filter((r) => r.hasPatchField && !r.patchOnDisk)
const orphanPatches = rows.filter((r) => !r.hasPatchField && r.patchOnDisk)
const verifiedInInterruptedRound = rows.filter((r) => r.roundInterrupted && r.verifierOk)
const patchSurvivesInterrupt = rows.filter((r) => r.roundInterrupted && r.patchOnDisk)

console.log(JSON.stringify({
  attempts: rows.length,
  withPatchField: rows.filter((r) => r.hasPatchField).length,
  withPatchOnDisk: rows.filter((r) => r.patchOnDisk).length,
  recordsClaimingPatchThatIsGone: diskMismatch.length,
  patchesOnDiskWithNoRecord: orphanPatches.length,
  interruptedRounds: new Set(rows.filter((r) => r.roundInterrupted).map((r) => r.campaign + '#' + r.round)).size,
  attemptsInInterruptedRounds: rows.filter((r) => r.roundInterrupted).length,
  ofThoseVerified: verifiedInInterruptedRound.length,
  ofThoseWithPatchOnDisk: patchSurvivesInterrupt.length,
  samples: diskMismatch.slice(0, 4).map((r) => ({ campaign: r.campaign, id: r.id })),
}, null, 2))
