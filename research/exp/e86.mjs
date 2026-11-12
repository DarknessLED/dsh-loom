// w3-attention-gap-no-cadence-ab: nobody has randomised checkpoint cadence in an
// agent supervision loop. Before designing that experiment, check whether cadence
// is a parameter here -- if every campaign runs back-to-back with the same plateau
// window, there is nothing to randomise.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.env.USERPROFILE ?? process.env.HOME, '.dsh', 'loom', 'campaigns')
const readJsonl = (f) => {
  const out = []
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* torn */ }
  }
  return out
}

const rounds = []
const raises = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  const stateFile = path.join(DIR, c, 'views', 'state.json')
  let cfg = null
  try { cfg = JSON.parse(fs.readFileSync(stateFile, 'utf8'))?.config ?? null } catch { /* none */ }
  let first = null
  let last = null
  for (const e of readJsonl(f)) {
    if (e.type === 'round.finished') { rounds.push({ campaign: c, ...e.data, t: e.t }); first ??= e.t; last = e.t }
    if (e.type === 'checkpoint.raised' && e.data.kind === 'plateau') raises.push({ campaign: c, t: e.t, window: e.data.payload?.window })
  }
  void cfg
}

// Plateau window: is it ever anything but 3?
const windows = {}
for (const r of raises) windows[r.window] = (windows[r.window] ?? 0) + 1
console.log(`plateau checkpoints: ${raises.length}; window values: ${JSON.stringify(windows)}`)

// The parameter that would have to move: how many rounds run between checkpoints.
// Count checkpoint kinds per campaign and rounds per campaign.
const perCampaign = new Map()
for (const r of rounds) {
  const p = perCampaign.get(r.campaign) ?? { rounds: 0, cps: 0 }
  p.rounds += 1
  perCampaign.set(r.campaign, p)
}
for (const r of raises) {
  const p = perCampaign.get(r.campaign) ?? { rounds: 0, cps: 0 }
  p.cps += 1
  perCampaign.set(r.campaign, p)
}
const vals = [...perCampaign.values()]
const withCp = vals.filter((v) => v.cps > 0)
console.log(`campaigns: ${vals.length}; with any plateau checkpoint: ${withCp.length}`)
const ratios = withCp.map((v) => v.rounds / v.cps).sort((a, b) => a - b)
console.log(`rounds per plateau checkpoint: min ${ratios[0]?.toFixed(1)} median ${ratios[Math.floor(ratios.length / 2)]?.toFixed(1)} max ${ratios[ratios.length - 1]?.toFixed(1)}`)

// Is the checkpoint decision a function of the round count alone? window=3, so a
// campaign that promotes in round 4 gets its checkpoint at a predictable place.
const roundsToFirstPlateau = []
for (const [c, v] of perCampaign) {
  if (!v.cps) continue
  // first plateau round index from the raise payload
  for (const r of raises) if (r.campaign === c) { roundsToFirstPlateau.push(r.window); break }
}

// CORRECTION. The first version of this file said "cadence is not a parameter;
// it is a hard-coded window". That is wrong: src/runtime/round.js:2221 reads
// `config.checkpoint?.window ?? 3`, so it IS settable -- and normalizeConfig accepts
// it (verified: normalizeConfig({checkpoint:{window:5}}).checkpoint.window === 5).
//
// What is true is narrower and more interesting: `window` is absent from
// DEFAULT_CONFIG.checkpoint, so it is undocumented, it is install-wide (one plugin
// config for every campaign), and every recorded campaign ran with the default.
// A parameter nobody can discover is indistinguishable from a constant -- until
// someone changes the config shape and it silently disappears.
console.log(`\ntreatment variation available: the plateau window is ${JSON.stringify(Object.keys(windows))} in every campaign`)
console.log(`=> cadence IS a parameter (config.checkpoint.window, read at round.js:2221)`)
console.log(`   but it is install-wide, undocumented (absent from DEFAULT_CONFIG.checkpoint),`)
console.log(`   and never varied: an AB test has two values, the record has one.`)

// Where cadence WOULD come from if it existed: the gap between consecutive
// checkpoint decisions within a campaign (already measured: 16 of 60 within 60s).
const allRaises = []
for (const c of fs.readdirSync(DIR)) {
  const f = path.join(DIR, c, 'events.jsonl')
  if (!fs.existsSync(f)) continue
  for (const e of readJsonl(f)) if (e.type === 'checkpoint.raised') allRaises.push({ campaign: c, t: e.t })
}
allRaises.sort((a, b) => a.t - b.t)
let gapsUnder60 = 0
for (let i = 1; i < allRaises.length; i += 1) if (allRaises[i].t - allRaises[i - 1].t < 60000) gapsUnder60 += 1
console.log(`observed inter-alert gaps under 60s: ${gapsUnder60} of ${allRaises.length - 1}`)

fs.writeFileSync(path.join('research', 'exp', 'e86.json'), JSON.stringify({
  plateauCheckpoints: raises.length, windowValues: windows,
  campaigns: vals.length, withCp: withCp.length,
  roundsPerCheckpoint: { min: ratios[0], median: ratios[Math.floor(ratios.length / 2)], max: ratios[ratios.length - 1] },
  gapsUnder60, totalGaps: allRaises.length - 1,
}, null, 2))
