// Do lessons actually cross campaign boundaries? A lesson that is only ever used
// by the campaign that earned it is not knowledge, it is a local variable.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const campaigns = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const lessons = new Map() // id -> {family, createdRound, uses: Set(campaign), impacts: [{campaign, delta}]}
const states = new Map()

for (const c of fs.readdirSync(campaigns)) {
  const ev = path.join(campaigns, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'lesson.added' && d.lesson?.id) {
      const id = String(d.lesson.id)
      if (!lessons.has(id)) lessons.set(id, { family: String(d.lesson.family ?? c), createdIn: c, createdRound: d.lesson.createdRound ?? null, impacts: [], usedIn: new Set() })
      lessons.get(id).family = String(d.lesson.family ?? lessons.get(id).family)
    }
    if (e.type === 'lesson.impact' && d.id) {
      const id = String(d.id)
      if (!lessons.has(id)) lessons.set(id, { family: null, createdIn: null, createdRound: null, impacts: [], usedIn: new Set() })
      const L = lessons.get(id)
      L.impacts.push({ campaign: c, delta: Number(d.delta) || 0, round: d.round })
      L.usedIn.add(c)
    }
    if (e.type === 'lesson.quarantined' && d.id) {
      const id = String(d.id)
      if (!lessons.has(id)) lessons.set(id, { family: null, createdIn: null, createdRound: null, impacts: [], usedIn: new Set() })
      lessons.get(id).quarantined = c
    }
  }
}

const all = [...lessons.entries()].map(([id, L]) => ({ id, ...L, usedIn: [...L.usedIn] }))
const withImpacts = all.filter((L) => L.impacts.length)
const crossCampaign = withImpacts.filter((L) => L.usedIn.length > 1)
const ownCampaignOnly = withImpacts.filter((L) => L.usedIn.length === 1)
const neverUsed = all.filter((L) => !L.impacts.length)
const quarantined = all.filter((L) => L.quarantined)

// within the used-in-multiple set: is the delta different when used outside its birth campaign?
let inside = [], outside = []
for (const L of crossCampaign) {
  for (const im of L.impacts) {
    if (im.campaign === L.createdIn) inside.push(im.delta)
    else outside.push(im.delta)
  }
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

console.log(JSON.stringify({
  lessonsTotal: all.length,
  lessonsWithAnyImpact: withImpacts.length,
  lessonsReusedAcrossCampaigns: crossCampaign.length,
  lessonsUsedOnlyInBirthCampaign: ownCampaignOnly.length,
  lessonsNeverUsed: neverUsed.length,
  quarantined: quarantined.length,
  impactRowsInsideBirthCampaign: { n: inside.length, mean: mean(inside)?.toFixed(3) },
  impactRowsOutsideBirthCampaign: { n: outside.length, mean: mean(outside)?.toFixed(3) },
  note: 'a lesson is created in the campaign that earned it; cross-campaign reuse would show as usedIn.length > 1',
}, null, 2))
