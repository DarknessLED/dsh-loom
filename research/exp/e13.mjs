// Which candidate slot actually wins, and does the treatment arm (a2, lessons
// injected) lose to the control arm (a1) more often than chance?
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const root = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rounds = []
for (const c of fs.readdirSync(root)) {
  const ev = path.join(root, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  const cur = new Map()
  const push = () => { if (cur.size) rounds.push({ campaign: c, slots: new Map(cur) }); cur.clear() }
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'round.started') { push(); cur.set('round', d.n) }
    if (e.type === 'attempt.finished') {
      const m = /^r(\d+)a(\d+)$/.exec(String(d.id || ''))
      if (m) cur.set(+m[2], { verify: d.verifierOk === true, err: !!d.error, dur: Number(d.durationMs) || 0, patch: !!d.patch })
    }
    if (e.type === 'artifact.promoted') {
      const m = /^r(\d+)a(\d+)$/.exec(String(d.attemptId || ''))
      if (m) cur.set('winner', +m[2])
    }
    if (e.type === 'round.finished') push()
  }
  push()
}
const slot = {}
for (const r of rounds) for (const [k, v] of r.slots) {
  if (typeof k !== 'number') continue
  const s = (slot[k] = slot[k] || { n: 0, verified: 0, errors: 0, withPatch: 0, dur: 0 })
  s.n += 1; if (v.verify) s.verified += 1; if (v.err) s.errors += 1; if (v.patch) s.withPatch += 1; s.dur += v.dur
}
const out = {}
for (const [k, s] of Object.entries(slot)) out['a' + k] = { n: s.n, verifyRate: +(s.verified / s.n).toFixed(3), errorRate: +(s.errors / s.n).toFixed(3), patchRate: +(s.withPatch / s.n).toFixed(3), meanMinutes: +(s.dur / s.n / 60000).toFixed(1) }

// head-to-head: rounds where both slots verified a patch
let both = 0, a1Wins = 0, a2Wins = 0
const bothDetail = []
for (const r of rounds) {
  const a1 = r.slots.get(1), a2 = r.slots.get(2), w = r.slots.get('winner')
  if (a1?.verify && a2?.verify && a1.patch && a2.patch) { both += 1; if (w === 1) a1Wins += 1; if (w === 2) a2Wins += 1; bothDetail.push(r.campaign + '#r' + r.slots.get('round') + ' winner=a' + w) }
}
console.log(JSON.stringify({ rounds: rounds.length, bySlot: out, bothVerifiedWithPatch: both, a1Wins, a2Wins, bothDetail: bothDetail.slice(0, 8) }, null, 2))
