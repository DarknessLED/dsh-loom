// What eight separate surveys know together that no one of them knows alone.
//
// Each direction was read on its own: query a corpus, follow its references,
// rank the works it cites most. That answers "what does this literature rest
// on". It cannot answer "do these eight literatures rest on the same things",
// and that second question is the one that changes what we build -- a paper
// every direction cites is a fact about agents, a paper one direction cites is
// a fact about that direction.
//
// Everything here works on the survey files already on disk. Nothing re-fetches
// and nothing re-reads: a citation edge is a line in a bibliography, and the
// bibliography is in the survey.
//
// The rule that keeps this honest: a work is "shared" because several corpora
// cite it, not because several corpora are about it. Co-citation is evidence
// that independent searchers converged on the same prior, which is why it is
// worth a look, and it is not evidence that the work is right.

/** The works a direction cites at least once, keyed by arXiv id where there is one. */
export function workIndex(survey) {
  const index = new Map()
  for (const work of survey?.agg?.works ?? []) {
    const id = work?.arxivId ?? null
    if (!id) continue
    if (!Number.isFinite(Number(work.citedByPapers)) || Number(work.citedByPapers) < 1) continue
    if (!index.has(id)) {
      index.set(id, {
        id,
        title: String(work.title ?? '').trim(),
        year: Number(work.year) || null,
        inCorpus: Boolean(work.inCorpus),
        cites: Number(work.citedByPapers) || 0,
      })
    }
  }
  return index
}

/**
 * One row per work, with every direction that cites it.
 *
 * Sorted by how many directions cite it and then by how hard each cites it, so
 * the head of the list is the answer to "what do we all believe" and the tail
 * is "what does only one direction care about".
 */
export function crossDirection(surveys, { minDirections = 2 } = {}) {
  const directions = Object.keys(surveys ?? {})
  const byWork = new Map()
  const totals = { directions: directions.length, works: 0, perDirection: {} }

  for (const direction of directions) {
    const index = workIndex(surveys[direction])
    totals.perDirection[direction] = index.size
    if (index.size > totals.works) totals.works = index.size
    for (const [id, work] of index) {
      let row = byWork.get(id)
      if (!row) {
        row = { id, title: work.title, year: work.year, directions: [], strength: {} }
        byWork.set(id, row)
      }
      row.directions.push(direction)
      row.strength[direction] = work.cites
    }
  }

  const rows = [...byWork.values()]
    .map((row) => ({ ...row, count: row.directions.length, weight: Object.values(row.strength).reduce((s, n) => s + n, 0) }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight || a.id.localeCompare(b.id))

  const shared = {}
  for (const row of rows) if (row.count >= minDirections) shared[row.count] = (shared[row.count] ?? 0) + 1

  return { totals: { ...totals, union: rows.length, shared }, rows, byId: new Map(rows.map((r) => [r.id, r])) }
}

/**
 * How many of each pair's most-cited works the other direction also cites.
 *
 * Higher is not better: two directions that share their top works are one
 * direction wearing two names, and the pair that shares nothing is the one
 * worth asking about (see `lonely`).
 */
export function pairMatrix(cross, { top = 20 } = {}) {
  const directions = Object.keys(cross.totals.perDirection)
  const rank = (direction) =>
    cross.rows
      .filter((row) => row.directions.includes(direction))
      .sort((a, b) => (b.strength[direction] ?? 0) - (a.strength[direction] ?? 0) || a.id.localeCompare(b.id))
      .slice(0, top)
      .map((row) => row.id)

  const tops = Object.fromEntries(directions.map((d) => [d, new Set(rank(d))]))
  const cells = []
  for (const a of directions) {
    for (const b of directions) {
      if (a >= b) continue
      const shared = [...tops[a]].filter((id) => tops[b].has(id))
      cells.push({ a, b, shared: shared.length, ids: shared })
    }
  }
  const lonely = directions
    .map((direction) => ({
      direction,
      partners: cells.filter((c) => (c.a === direction || c.b === direction) && c.shared > 0).length,
    }))
    .filter((row) => row.partners === 0)
  return { top, cells, lonely }
}

/**
 * Works several directions cite that nobody has read yet.
 *
 * This is the actionable half of the synthesis: a work four independent corpora
 * agree on, whose body is not in the ledger, is a hole in what we claim to know.
 */
export function bridges(cross, { minDirections = 4, readIds = new Set() } = {}) {
  return cross.rows
    .filter((row) => row.count >= minDirections && !readIds.has(row.id))
    .map((row) => ({ ...row, read: false }))
}

/** Which of a direction's own most-cited works have a note in the ledger. */
export function readingCoverage(cross, readIds = new Set(), { top = 40 } = {}) {
  const out = {}
  for (const direction of Object.keys(cross.totals.perDirection)) {
    const ranked = cross.rows
      .filter((row) => row.directions.includes(direction))
      .sort((a, b) => (b.strength[direction] ?? 0) - (a.strength[direction] ?? 0))
      .slice(0, top)
    out[direction] = {
      top: ranked.length,
      read: ranked.filter((row) => readIds.has(row.id)).length,
      missing: ranked.filter((row) => !readIds.has(row.id)).map((row) => row.id),
    }
  }
  return out
}

// A work can be shared because two directions agree on an idea, or because both
// run the same benchmark and both fine-tune the same model. Those are different
// facts and averaging them is how a corpus makes itself look more unified than
// it is. These patterns name the substrates: model reports, adaptation tricks,
// optimisers, and the benchmarks everyone scores on.
const INFRASTRUCTURE = [
  /\btechnical report\b/,
  /\bsystem card\b/,
  /\bmodel card\b/,
  /\bherd of models\b/,
  // A title that opens with a model family is a report about that model, even
  // when the rest of the title says nothing about being one.
  /^(?:gemini|llama|qwen|gpt|claude|kimi|glm|mistral|deepseek|phi|grok|gemma|command[ar]?|yi|internlm|ernie|solar|olmo)\b/,
  /\bopen foundation (?:and fine-tuned )?(?:chat )?models?\b/,
  /\blow-rank adaptation\b/,
  /\bdecoupled weight decay\b/,
  /\bproximal policy optimization\b/,
  /\blayer normalization\b/,
  /\battention is all you need\b/,
  /\b(?:adam|adamw|sgd)\b/,
  // Benchmarks and datasets are what a direction measures on, not what it
  // argues; several of them do not carry the word "benchmark" in the title.
  /\bbenchmark|\bbench\b|leaderboard/,
  /\b(?:dataset|corpus) of\b/,
  /\bmultitask language understanding\b/,
  /\bmathematical problem solving with the\b/,
  /\b(?:humaneval|mmlu|gsm8k|swe-bench|terminal-bench|browsecomp|livecodebench|gpqa|agentbench|webarena|paperbench|healthbench|kernelbench|alpacaeval|mt-bench|chatbot arena)\b/,
]

/**
 * Split shared works into the ones several directions share because they all
 * use the thing, and the ones they share because they all argue about the idea.
 * Every shared row lands on exactly one side.
 */
export function splitShared(cross, { minDirections = 3 } = {}) {
  const shared = cross.rows.filter((row) => row.count >= minDirections)
  const infrastructure = []
  const ideas = []
  for (const row of shared) {
    const title = String(row.title ?? '')
    if (INFRASTRUCTURE.some((re) => re.test(title.toLowerCase()))) infrastructure.push(row)
    else ideas.push(row)
  }
  return { shared, infrastructure, ideas }
}

/** Markdown for the machine half of the synthesis document. */
export function renderSynthesis({ cross, matrix, bridgeRows, coverage, generated, reading = '' }) {
  const split = splitShared(cross, { minDirections: 3 })
  const lines = []
  lines.push('# Eight literatures, one corpus: what the directions share')
  lines.push('')
  lines.push(`Generated ${generated} by \`scripts/research-synthesis.mjs\`. Every number below is recomputed from`)
  lines.push('`research/out/*.survey.json`; the prose after the rule is written by hand.')
  lines.push('')
  lines.push('## How to read this')
  lines.push('')
  lines.push('- A work is "shared" because several corpora cite it. That is evidence that independent')
  lines.push('  searches converged on the same prior. It is **not** evidence the work is right.')
  lines.push('- "Cited by N directions" counts directions whose corpus cites the work at least once,')
  lines.push('  not how many times, so a single passing mention and a load-bearing citation look alike')
  lines.push('  in that column. The per-direction strength is in the table.')
  lines.push('- The ideas/infrastructure split is a title heuristic, not a human judgement: a title')
  lines.push('  that reads like a model report, an optimiser or a benchmark counts as substrate.')
  lines.push('  It will misclassify a few works, which is why both tables are printed in full.')
  lines.push('')
  lines.push('## Scale')
  lines.push('')
  lines.push('| quantity | value |')
  lines.push('| --- | --- |')
  lines.push(`| directions | ${cross.totals.directions} |`)
  lines.push(`| distinct works cited by ≥1 direction | ${cross.totals.union} |`)
  for (const [count, n] of Object.entries(cross.totals.shared).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    lines.push(`| cited by ≥${count} directions | ${n} |`)
  }
  lines.push('')
  lines.push('## The same prior in several places')
  lines.push('')
  lines.push('A work shared by several directions is shared either because they argue about the same')
  lines.push('idea, or because they all point the same model at the same benchmark. The two tables')
  lines.push('below keep those apart: the first is a fact about agents, the second is a fact about')
  lines.push('the field\'s tooling.')
  lines.push('')
  lines.push('### Shared ideas')
  lines.push('')
  lines.push('| work | year | directions | cites |')
  lines.push('| --- | --- | --- | --- |')
  for (const row of split.ideas.slice(0, 30)) {
    const strength = row.directions.map((d) => `${d.replace(/^r\d+-/, '')} ${row.strength[d] ?? 0}`).join(', ')
    lines.push(`| ${row.title.replace(/\|/g, '/')} (\`${row.id}\`) | ${row.year ?? '?'} | ${row.count} | ${strength} |`)
  }
  lines.push('')
  lines.push('### Shared infrastructure')
  lines.push('')
  lines.push('| work | year | directions | cites |')
  lines.push('| --- | --- | --- | --- |')
  for (const row of split.infrastructure.slice(0, 20)) {
    const strength = row.directions.map((d) => `${d.replace(/^r\d+-/, '')} ${row.strength[d] ?? 0}`).join(', ')
    lines.push(`| ${row.title.replace(/\|/g, '/')} (\`${row.id}\`) | ${row.year ?? '?'} | ${row.count} | ${strength} |`)
  }
  lines.push('')
  lines.push('## Which directions are the same direction')
  lines.push('')
  lines.push(`Overlap between each pair's ${matrix.top} most-cited works.`)
  lines.push('')
  lines.push('| pair | shared of top-' + matrix.top + ' |')
  lines.push('| --- | --- |')
  for (const cell of [...matrix.cells].sort((a, b) => b.shared - a.shared)) {
    lines.push(`| ${cell.a.replace(/^r\d+-/, '')} × ${cell.b.replace(/^r\d+-/, '')} | ${cell.shared} |`)
  }
  lines.push('')
  if (matrix.lonely.length) {
    lines.push(`**Shares nothing with any other direction:** ${matrix.lonely.map((l) => l.direction).join(', ')}.`)
    lines.push('')
  }
  lines.push('## Cited by many, read by none')
  lines.push('')
  if (!bridgeRows.length) lines.push('_Nothing left: every work cited by four or more directions has a note in the ledger._')
  else {
    lines.push('| work | year | directions |')
    lines.push('| --- | --- | --- |')
    for (const row of bridgeRows.slice(0, 25)) {
      lines.push(`| ${row.title.replace(/\|/g, '/')} (\`${row.id}\`) | ${row.year ?? '?'} | ${row.count} |`)
    }
  }
  lines.push('')
  lines.push('## How much of each direction we have actually read')
  lines.push('')
  lines.push('Of each direction’s most-cited works, how many have a body note in the ledger yet.')
  lines.push('')
  lines.push('| direction | read | of top |')
  lines.push('| --- | --- | --- |')
  for (const [direction, row] of Object.entries(coverage)) {
    lines.push(`| ${direction} | ${row.read} | ${row.top} |`)
  }
  lines.push('')
  if (reading.trim()) {
    lines.push('---')
    lines.push('')
    lines.push(reading.trim())
    lines.push('')
  }
  return lines.join('\n')
}
