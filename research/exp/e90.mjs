// The point of a gap queue is that it should DRIVE the next round of research.
// Until now the waves came first and the gaps fell out of them; nobody read the
// queue to decide what to ask. This script does the mechanical half: it orders the
// open queue by what depends on it, filters to questions that cannot be answered
// from this machine, and emits the brief for wave9.
//
// The filter is the interesting part. exp-gap-001/ana-023 established that the
// question text does not say who could close it (keyword rules scored 0.20, referent
// rules 0.08). So this does not classify -- it lists, and the human/agent picks.
// What it CAN do mechanically is exclude questions already answered here.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const DB = process.env.LOOM_KG || 'research/kg/store.sqlite'
const db = new DatabaseSync(DB, { readOnly: true })

const rows = db.prepare(`
  WITH dep AS (
    SELECT e.to_id q, COUNT(*) deps, SUM(CASE d.kind WHEN 'number' THEN 3 WHEN 'analysis' THEN 3
      WHEN 'failure' THEN 2 WHEN 'claim' THEN 2 ELSE 1 END) weight
    FROM edge e JOIN node d ON d.id = e.from_id
    WHERE d.status = 'live' AND d.kind != 'question' GROUP BY e.to_id
  )
  SELECT n.id, n.title, n.confidence, n.topic, COALESCE(dep.deps,0) deps, COALESCE(dep.weight,0) weight,
         (SELECT COUNT(*) FROM gap_answer a WHERE a.gap_id = n.id) answered
  FROM node n LEFT JOIN dep ON dep.q = n.id
  WHERE n.kind = 'question' AND n.status = 'live' AND COALESCE(dep.deps,0) > 0
  ORDER BY answered, weight DESC, deps DESC
`).all()

const open = rows.filter((r) => r.answered === 0)
console.log(`open questions that something depends on: ${open.length} of ${rows.length}`)
for (const r of open) console.log(`  ${String(r.weight).padStart(2)}  ←${r.deps}  ${r.id}\n        ${r.title}`)

// Which of these name a source or a paper? Those are the literature questions --
// they need a search, not a query against our ledger. Cheap, and unlike the earlier
// classifiers this one does not try to decide "ours vs theirs"; it only asks
// whether the text points at an external artefact at all.
const external = /arxiv|doi|venue|published|paper|study|benchmark|swe-?bench|icml|neurips|chi|et al/im
const lit = open.filter((r) => external.test(r.title) || !/(dsh|loom|our ledger|this repo)/i.test(r.title))
console.log(`\nof those, ${lit.length} name no local artefact and are candidates for the next wave`)
console.log(`(exp-gap-001 found the text cannot reliably say who could close a gap: keyword 0.20, referent 0.08.`)
console.log(` This is a shortlist for a human to cut, not a classification.)`)

fs.writeFileSync('research/wave9/candidates.json', JSON.stringify({ measuredAt: new Date().toISOString(), open: open.length, candidates: lit.map((r) => ({ id: r.id, title: r.title, deps: r.deps, weight: r.weight, topic: r.topic })) }, null, 2) + '\n')
console.log('\nwrote research/wave9/candidates.json')
