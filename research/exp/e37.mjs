// The product question: does the loop ever change its own structure? The ledger
// records chain.proposed / chain.activated / node.started / node.finished. If every
// campaign activates version 1 and never revisits it, the L2 layer is decorative.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const base = path.join(os.homedir(), '.dsh', 'loom', 'campaigns')
const rows = { proposed: [], activated: [], nodeStarted: [], nodeFinished: [] }
for (const c of fs.readdirSync(base)) {
  const ev = path.join(base, c, 'events.jsonl')
  if (!fs.existsSync(ev)) continue
  for (const line of fs.readFileSync(ev, 'utf8').split('\n')) {
    if (!line) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data || {}
    if (e.type === 'chain.proposed') rows.proposed.push({ campaign: c, ...d })
    if (e.type === 'chain.activated') rows.activated.push({ campaign: c, ...d })
    if (e.type === 'node.started') rows.nodeStarted.push({ campaign: c, ...d })
    if (e.type === 'node.finished') rows.nodeFinished.push({ campaign: c, ...d })
  }
}

const versions = {}
for (const a of rows.activated) {
  const v = a.version ?? a.chainVersion ?? '?'
  versions[v] = (versions[v] || 0) + 1
}
// How many campaigns activated more than one version?
const perCampaign = new Map()
for (const a of rows.activated) {
  if (!perCampaign.has(a.campaign)) perCampaign.set(a.campaign, [])
  perCampaign.get(a.campaign).push(a.version ?? a.chainVersion ?? '?')
}
const multi = [...perCampaign.entries()].filter(([, vs]) => new Set(vs).size > 1)

// Node kinds executed, and how often each node type finishes vs starts.
const kindStart = {}, kindFinish = {}, kindStatus = {}
for (const n of rows.nodeStarted) kindStart[n.kind ?? n.id ?? '?'] = (kindStart[n.kind ?? n.id ?? '?'] || 0) + 1
for (const n of rows.nodeFinished) {
  const k = n.kind ?? n.id ?? '?'
  kindFinish[k] = (kindFinish[k] || 0) + 1
  const s = n.status ?? '?'
  kindStatus[s] = (kindStatus[s] || 0) + 1
}

// Did any campaign's proposal change the chain shape (node count or kinds)?
const shapes = new Map()
for (const p of rows.proposed) {
  const chain = p.chain || p.spec || {}
  const nodes = chain.nodes || []
  const key = nodes.map((x) => x.type || x.kind || '?').join('>') || 'empty'
  shapes.set(key, (shapes.get(key) || 0) + 1)
}

console.log(JSON.stringify({
  proposed: rows.proposed.length,
  activated: rows.activated.length,
  activatedVersions: versions,
  campaignsActivatingMoreThanOneVersion: multi.length,
  nodeStarted: rows.nodeStarted.length,
  nodeFinished: rows.nodeFinished.length,
  nodeKindsStarted: kindStart,
  nodeKindsFinished: kindFinish,
  nodeStatuses: kindStatus,
  distinctChainShapesProposed: shapes.size,
  shapes: [...shapes.entries()].map(([k, v]) => v + 'x ' + k).slice(0, 8),
  sampleProposal: rows.proposed[0] ? JSON.stringify(rows.proposed[0]).slice(0, 500) : null,
}, null, 2))
