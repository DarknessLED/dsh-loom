// Two readers, one library.
//
// `workrecord.js` builds the record: the starting point, the drawn pipeline, the
// mechanism points, the authors' own limits, a vector and the citation edges.
// That shape is what an agent wants -- fields it can filter, vectors it can take
// a dot product of, edges it can walk. A person wants the same knowledge as
// prose they can read in ten minutes, and the difference between "the same
// knowledge" and "two documents that drift apart" is that both are rendered
// from one record.
//
// So this module renders the human view and the agent digest from the same
// object, and it refuses to fill the two places a machine cannot: the summary
// ("why this works, and what it connects to") and the judgement about what the
// work is worth. Those are hand-written, arrive through `reading`, and when one
// is missing the document says so in those words instead of printing a
// machine-generated paragraph that reads like a person wrote it.

/** The five sections every work page has, in the order a reader needs them. */
export const WORK_SECTIONS = [
  '出发点',
  'Pipeline',
  '机制',
  '总结与展望',
  '不足之处',
]

function clean(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

function figureMarkdown(figure) {
  if (!figure || !figure.url) return []
  const caption = clean(figure.caption) || 'the pipeline figure'
  return [`![${caption}](${figure.url})`, '', `*${caption}*`]
}

/**
 * One work as a page a person reads.
 *
 * `reading` is what a human wrote about this work after reading it:
 * `{summary, connects: [{id, why}], caveats: []}`. All of it is optional, and
 * what is missing is named at the top rather than at the bottom, because a page
 * that opens with machine text and mentions its provenance in a footnote is
 * exactly the failure mode this module exists to avoid.
 */
export function renderWorkMarkdown(record, { similar = [], reading = null } = {}) {
  const work = record && typeof record === 'object' ? record : {}
  const lines = []
  const title = clean(work.title) || work.id || 'untitled work'
  lines.push(`# ${title}`, '')
  const meta = [
    work.id ? `arXiv:${work.id}` : null,
    Number.isFinite(work.year) ? String(work.year) : null,
    work.origin ? `[source](${work.origin})` : null,
  ].filter(Boolean)
  if (meta.length) lines.push(meta.join(' · '), '')

  const hand = reading && typeof reading === 'object' ? reading : null
  // Who wrote the summary is part of the summary. A page that says "a person
  // read this" when an agent wrote it is the same failure as a page that
  // invents one, so the reading carries its author and the page repeats it.
  const author = clean(hand?.by) || 'an unnamed reader'
  lines.push(
    hand?.summary
      ? `> Written by ${author} after reading the paper; the mechanism quotes are the paper’s own words.`
      : '> **No one has written the summary yet.** The fields below are extracted from the paper; the 总结与展望 section is empty on purpose rather than generated.',
    '',
  )

  // 1. 出发点
  lines.push(`## ${WORK_SECTIONS[0]}`)
  lines.push(work.motivation?.text ? `${work.motivation.text}` : '*The paper does not say in one paragraph what is wrong; see the abstract.*')
  if (work.motivation?.locator) lines.push('', `<sub>${work.motivation.locator}</sub>`)
  lines.push('')

  // 2. Pipeline
  lines.push(`## ${WORK_SECTIONS[1]}`)
  if (work.pipeline?.mermaid) {
    lines.push('```mermaid', work.pipeline.mermaid, '```', '')
  }
  const fig = figureMarkdown(work.pipeline?.figure)
  if (fig.length) lines.push(...fig, '')
  if (work.pipeline?.figure?.src) lines.push(`<sub>figure: \`${work.pipeline.figure.src}\`</sub>`, '')
  if (!work.pipeline?.mermaid && !fig.length) lines.push(`*${clean(work.pipeline?.note) || 'no pipeline was extracted.'}*`, '')

  // 3. 机制
  lines.push(`## ${WORK_SECTIONS[2]}`)
  const mechanisms = Array.isArray(work.mechanisms) ? work.mechanisms : []
  if (!mechanisms.length) {
    lines.push('*No method section was found, so there is no mechanism to quote.*', '')
  }
  mechanisms.forEach((point, index) => {
    lines.push(`### ${index + 1}. ${clean(point.title) || clean(point.locator)}`, '')
    lines.push(point.text)
    const where = (point.sections ?? []).map((section) => clean(section.locator)).filter(Boolean)
    if (where.length) lines.push('', `<sub>${where.join(' · ')}</sub>`)
    lines.push('')
  })

  // 4. 总结与展望 — hand-written or explicitly absent.
  lines.push(`## ${WORK_SECTIONS[3]}`)
  if (hand?.summary) {
    lines.push(hand.summary, '')
    const connects = Array.isArray(hand.connects) ? hand.connects : []
    if (connects.length) {
      lines.push('**It connects to**', '')
      for (const link of connects) lines.push(`- \`${link.id}\` — ${clean(link.why)}`)
      lines.push('')
    }
  } else {
    lines.push('*还没有人写这一段。* 这一段要回答的是“它为什么有效、它和别的工作是什么关系”，这两件都不是抽取能得到的。', '')
  }
  const near = Array.isArray(similar) ? similar : []
  if (near.length) {
    lines.push('**Nearly the same vocabulary**', '')
    for (const item of near) {
      const score = Number.isFinite(item.similarity) ? ` (${item.similarity.toFixed(2)})` : ''
      lines.push(`- [${clean(item.title) || item.id}](https://arxiv.org/abs/${item.id})${score} — by ${item.basis}`)
    }
    lines.push('')
  }

  // 5. 不足之处
  lines.push(`## ${WORK_SECTIONS[4]}`)
  const caveats = Array.isArray(hand?.caveats) ? hand.caveats.filter(Boolean) : []
  if (work.limitations?.text) lines.push(`**The authors say:** ${work.limitations.text}`, '')
  if (caveats.length) {
    lines.push('**What a reader should still not conclude**', '')
    for (const caveat of caveats) lines.push(`- ${clean(caveat)}`)
    lines.push('')
  }
  if (!work.limitations?.text && !caveats.length) lines.push('*No limitations section and no reader notes: this page does not claim to know the failure modes.*', '')
  if (work.limitations?.locator) lines.push(`<sub>${work.limitations.locator}</sub>`, '')

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

/**
 * The agent's view: one JSON object per work, no prose, every field present.
 *
 * Present-but-null matters more here than in the page: an agent that has to
 * distinguish "no limitation was found" from "the field is missing" will guess,
 * and guessing is what the record exists to prevent.
 */
export function agentDigest(records, { index = null } = {}) {
  const list = Array.isArray(records) ? records.filter((record) => record && record.id) : []
  const works = index?.works ?? {}
  return list.map((record) => ({
    id: record.id,
    title: clean(record.title),
    year: Number.isFinite(record.year) ? record.year : null,
    origin: record.origin ?? null,
    motivation: record.motivation ? { text: record.motivation.text, locator: record.motivation.locator ?? null } : null,
    pipeline: record.pipeline
      ? {
          mermaid: record.pipeline.mermaid ?? '',
          figure: record.pipeline.figure
            ? { url: record.pipeline.figure.url ?? null, caption: clean(record.pipeline.figure.caption) }
            : null,
          stages: (record.pipeline.stages ?? []).map((stage) => clean(stage.locator)),
        }
      : null,
    mechanisms: (Array.isArray(record.mechanisms) ? record.mechanisms : []).map((point) => ({
      locator: point.locator,
      title: clean(point.title),
      text: point.text,
      chars: Number.isFinite(point.chars) ? point.chars : point.text.length,
      merged: point.merged ?? 1,
    })),
    limitations: record.limitations ? { text: record.limitations.text, locator: record.limitations.locator ?? null } : null,
    cites: works[record.id]?.cites ?? [],
    citedBy: works[record.id]?.citedBy ?? [],
    vector: Array.isArray(record.vector) ? record.vector : null,
  }))
}

/**
 * A page that lists a whole library: one table a person can scan, then the
 * works in order.
 */
export function renderLibraryMarkdown(records, { slug = '', index = null, readings = {}, date = '' } = {}) {
  const list = Array.isArray(records) ? records.filter((record) => record && record.id) : []
  const works = index?.works ?? {}
  const lines = []
  lines.push(`# Library: ${slug || 'works'}`, '')
  lines.push(`Built from arXiv HTML bodies${date ? ` on ${date}` : ''}. ${list.length} work(s).`, '')
  lines.push('| work | year | mechanism points | figure | cited by | summary |', '| --- | --- | --- | --- | --- | --- |')
  for (const record of list) {
    const reading = readings[record.id]
    lines.push(
      `| [${clean(record.title).replace(/\|/g, '\\|')}](https://arxiv.org/abs/${record.id}) | ${Number.isFinite(record.year) ? record.year : '?'} | ${(record.mechanisms ?? []).length} | ${record.pipeline?.figure?.url ? 'yes' : 'no'} | ${(works[record.id]?.citedBy ?? []).length} | ${reading?.summary ? 'yes' : '—'} |`,
    )
  }
  lines.push('')
  const missing = list.filter((record) => !readings[record.id]?.summary).length
  lines.push(`Summaries written: ${list.length - missing} of ${list.length}${missing ? ` — ${missing} work(s) have mechanism quotes but no one has written why they work yet.` : ''}`, '')
  for (const record of list) {
    lines.push('---', '')
    lines.push(renderWorkMarkdown(record, { similar: [], reading: readings[record.id] ?? null }))
  }
  return lines.join('\n')
}

export { clean as cleanText }
