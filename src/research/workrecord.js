// One work, as a record an agent can query and a person can read.
//
// The library this repo keeps has three shapes that never met: survey documents
// (what a field cites), deep notes (what one paper says on page X), and a ledger
// of verbatim claims. None of them answers a question like "show me every work
// whose pipeline puts a held-out set between the proposal and the commit" --
// there is no field for the starting point, no diagram, no list of mechanisms
// that can be compared across papers.
//
// This module builds that record from a paper's own HTML:
//
//   * `motivation`   -- the paragraph that says what is wrong with the world;
//   * `pipeline`     -- the figure the authors drew for their method, its
//                       caption, the absolute URL it lives at, and a mermaid
//                       diagram of the method's own subsections;
//   * `mechanisms`   -- one point per method subsection, never shorter than
//                       MECHANISM_MIN_CHARS: short neighbours are merged and the
//                       merge is recorded, because a three-sentence subsection
//                       is not a mechanism and padding it with the previous one
//                       silently is worse than saying "these two are one point";
//   * `limitations`  -- the authors' own limits, or null;
//   * `vector`       -- a deterministic hashed bag-of-words, unit length, so two
//                       records can be compared by a dot product without any
//                       embedding service and the same bytes always give the
//                       same vector.
//
// Nothing here invents text. A paper without a method section gets
// `mechanisms: []` and a `note` that says why; a paper without a limitations
// section gets `null`; a figure that cannot be resolved to an absolute URL gets
// `null` rather than a path that 404s.

import { plainText, parseBibEntries } from './citegraph.js'
import { bodyText, documentTitle, sectionForParagraph, splitSections } from './deepread.js'

/** A mechanism point shorter than this is a stub, not an explanation. */
export const MECHANISM_MIN_CHARS = 200

/** Dimensions of the hashed vector; 256 buckets is enough to separate fields. */
export const VECTOR_SIZE = 256

const BIB_RE = /ltx_bibliography|ltx_biblist|id="bib\./i
const PARAGRAPH_RE = /<p\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
const IMG_RE = /<img\b[^>]*\bsrc="([^"]+)"[^>]*>/i
const OBJECT_RE = /<object\b[^>]*\bdata="([^"]+)"[^>]*>/i
const CAPTION_RE = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i
const FIGURE_TAG_RE = /<span[^>]*class="[^"]*ltx_tag[^"]*"[^>]*>[\s\S]*?<\/span>/i

const METHOD_RE = /method|approach|design|mechanism|framework|algorithm|architecture/
const INTRO_RE = /introduction|motivation|problem statement/
// Sections that are never the pipeline: they frame the work or add to it, and
// taking the longest of them would draw a diagram of the related-work page.
const NOT_METHOD_RE =
  /introduction|motivation|related work|prior work|background|conclusion|discussion|references|acknowledg|appendix|author|ethic|broader impact|reproducib/
// Sub-parts of a method section that are about judging it rather than being
// it. A technical report's "Post-training Evaluation" is a result table; it is
// not a mechanism, and merging it into the mechanism list puts numbers where a
// reader expects a design.
const NOT_METHOD_SUB_RE = /evaluation|experiments?\b|results?\b|analysis|ablation|comparison|benchmark|what we did not|discussion/
// The same words, applied to whole chapters: a top-level "Results" is where the
// measurements live, and a mechanism list built from it would be a list of
// numbers presented as a design.
const NOT_METHOD_ROOT_RE = /results?\b|evaluation\b|experiments?\b|ablation|analysis\b|benchmark/

function stripToBody(html) {
  if (typeof html !== 'string' || !html) return ''
  const marker = html.search(BIB_RE)
  return marker === -1 ? html : html.slice(0, marker)
}

function paragraphs(region) {
  const out = []
  PARAGRAPH_RE.lastIndex = 0
  let match
  while ((match = PARAGRAPH_RE.exec(region))) {
    const anchor = match[1]
    if (!anchor || /^abstract/i.test(anchor)) continue
    const text = plainText(match[2]).replace(/\s+/g, ' ').trim()
    if (!text) continue
    out.push({ anchor, text })
  }
  return out
}

/**
 * An absolute URL for a figure, or null.
 *
 * arXiv writes `src="2601.00001v1/pipeline.png"` -- relative to the paper's own
 * HTML directory. Concatenating the base and the path without the slash gives
 * ".../htmlpipeline.png", which is a 404 that looks like a missing figure, so a
 * caller can never tell "the authors drew no figure" from "we built the URL
 * wrong". A URL that is already absolute is kept as written (authors do link
 * out to their own CDN), and no base means no answer.
 */
export function figureUrl(base, src) {
  const path = typeof src === 'string' ? src.trim() : ''
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const root = typeof base === 'string' ? base.trim() : ''
  if (!root) return null
  return `${root.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

// --- mechanisms -----------------------------------------------------------

function combine(points) {
  const text = points.map((point) => point.text).join(' ')
  return {
    locator: points[0].locator,
    title: points.map((point) => point.title).join(' / '),
    text,
    chars: text.length,
    sections: points.flatMap((point) => point.sections ?? [{ locator: point.locator, title: point.title }]),
    merged: points.reduce((sum, point) => sum + (point.merged ?? 1), 0),
  }
}

/**
 * Group consecutive short points until each group reaches `min` characters.
 *
 * Order is never changed and a long point is never absorbed into a neighbour:
 * the caller renders these in document order and a mechanism that moved is a
 * different claim about how the method works. A trailing group too short to
 * stand alone is folded into the point before it rather than published as a
 * stub.
 */
export function mergeToMinimum(points, min = MECHANISM_MIN_CHARS) {
  const list = Array.isArray(points) ? points.filter((point) => point && typeof point.text === 'string') : []
  const out = []
  let buffer = []
  const flush = () => {
    if (!buffer.length) return
    out.push(combine(buffer))
    buffer = []
  }
  for (const point of list) {
    const chars = typeof point.chars === 'number' ? point.chars : point.text.length
    if (chars >= min) {
      // A short point immediately before a long one is that point's lead-in: a
      // method section opens with one paragraph naming the two stages and then
      // explains them, and "§3 Method" with 72 characters of preamble is not a
      // mechanism of its own.
      if (buffer.length) {
        const lead = buffer
        buffer = []
        out.push(combine([...lead, point]))
        continue
      }
      out.push(combine([point]))
      continue
    }
    buffer.push(point)
    const total = buffer.reduce((sum, item) => sum + item.text.length + 1, 0) - 1
    if (total >= min) flush()
  }
  if (buffer.length) {
    if (!out.length) {
      out.push(combine(buffer))
    } else {
      const last = out.pop()
      out.push(combine([last, ...buffer]))
    }
  }
  return out
}

// --- the diagram ----------------------------------------------------------

function mermaidLabel(text) {
  return String(text || '').replace(/"/g, "'").replace(/\r?\n/g, ' ')
}

/**
 * The method's pipeline as a mermaid flowchart.
 *
 * The authors already drew this figure, so the diagram here is not a drawing of
 * the method -- it is a map of how the paper explains it, one node per
 * subsection, in order. That is the thing a reader can walk in a terminal and
 * the thing an agent can match against another paper's subsections; the original
 * figure stays in `figure` for the reader who needs the real thing.
 */
export function pipelineMermaid(sections) {
  const list = Array.isArray(sections) ? sections.filter((section) => section && section.locator) : []
  if (!list.length) return ''
  const lines = ['flowchart LR']
  list.forEach((section, index) => {
    lines.push(`  N${index}["${mermaidLabel(section.locator)}"]`)
  })
  for (let i = 1; i < list.length; i += 1) lines.push(`  N${i - 1} --> N${i}`)
  return lines.join('\n')
}

// --- the vector -----------------------------------------------------------

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'is', 'are', 'was', 'were', 'be',
  'been', 'that', 'this', 'these', 'those', 'it', 'its', 'as', 'at', 'from', 'we', 'our', 'their', 'they', 'can',
  'may', 'not', 'but', 'which', 'than', 'then', 'so', 'such', 'into', 'over', 'also', 'has', 'have', 'had', 'do',
  'does', 'did', 'one', 'two', 'all', 'any', 'each', 'more', 'most', 'no', 'nor', 'only', 'own', 'same', 'very',
  'will', 'would', 'should', 'could', 'there', 'here', 'when', 'where', 'how', 'what', 'who', 'whom', 'if', 'while',
])

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
}

function hashWord(word) {
  // FNV-1a, truncated: a fixed hash keeps the vector stable across runs and
  // machines, which `Math.random` or a salted hash would not be.
  let hash = 0x811c9dc5
  for (let i = 0; i < word.length; i += 1) {
    hash ^= word.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % VECTOR_SIZE
}

/**
 * A unit vector for one work: term frequency weighted by "how many characters
 * of the text this token covers", hashed into 256 buckets.
 *
 * Unit length so cosine similarity is a plain dot product, and hashed rather
 * than learned so the number is reproducible from the bytes alone. This is not
 * an embedding -- it cannot know that "verifier" and "checker" are related --
 * but it is enough to cluster a library by vocabulary, which is all the graph
 * index needs, and it costs nothing to rebuild.
 */
export function workVector(work) {
  const source = work && typeof work === 'object' ? work : {}
  const text = [
    source.title,
    source.abstract,
    source.motivation?.text,
    ...(Array.isArray(source.mechanisms) ? source.mechanisms.map((point) => point.text) : []),
    source.limitations?.text,
  ]
    .filter(Boolean)
    .join(' ')
  const vector = new Array(VECTOR_SIZE).fill(0)
  for (const word of tokenize(text)) {
    const bucket = hashWord(word)
    // Signed hashing: without the sign every bucket grows and shared stop-word
    // noise dominates the cosine, which is the classic hashing-trick failure.
    const sign = hashWord(`${word}#`) % 2 === 0 ? 1 : -1
    vector[bucket] += sign * Math.min(3, 1 + word.length / 20)
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (!norm) return vector
  return vector.map((value) => Math.round((value / norm) * 1e6) / 1e6)
}

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i += 1) dot += (a[i] || 0) * (b[i] || 0)
  return Math.round(dot * 1e6) / 1e6
}

// --- the record -----------------------------------------------------------

function firstParagraphIn(region, sections, pattern, accept = null) {
  const wanted = new Set(
    sections
      .filter((section) => pattern.test(String(section.locator || '').toLowerCase()))
      .map((section) => section.id),
  )
  if (!wanted.size) return null
  for (const paragraph of paragraphs(region)) {
    const section = sectionForParagraph(sections, paragraph.anchor)
    if (!section || !wanted.has(section.id)) continue
    if (paragraph.text.length < 40) continue
    if (accept && !accept(paragraph.text)) continue
    return { text: paragraph.text, locator: section.locator, anchor: paragraph.anchor }
  }
  return null
}

// A "Discussion" heading is where limitations often live, but its first
// paragraph is usually a signpost ("In this section, we will share our
// findings..."), which is not a limitation. The signpost is skipped rather than
// published as the authors' own account of what their work cannot do.
const SIGNPOST_RE =
  /^in this (?:section|paper|chapter|work)\b|^we (?:will|now|first) (?:share|present|describe|discuss|introduce|show)\b|^this (?:section|paper) (?:is organized|describes|presents)\b/i

function firstLimitation(region, sections) {
  const specific = firstParagraphIn(region, sections, /limitation|threats? to validity/, (text) => !SIGNPOST_RE.test(text))
  if (specific) return specific
  return firstParagraphIn(region, sections, /discussion/, (text) => !SIGNPOST_RE.test(text))
}

// LaTeXML pads ids with placeholder levels: the first run-in paragraph of §2 is
// "S2.SS0.SSS0.Px1", five segments deep for what a reader sees as "§2, one level
// in". Counting placeholders would push every run-in paragraph past the
// subsection cut and leave a 9,700-character method chapter with one mechanism.
const PLACEHOLDER_RE = /^(?:SS0|SSS0)$/

function depthOf(id) {
  return String(id || '')
    .split('.')
    .filter((part) => part && !PLACEHOLDER_RE.test(part)).length
}

function methodSections(sections, region = '') {
  const list = Array.isArray(sections) ? sections : []
  // A section is framing if it, or any ancestor, is one of the sections a
  // method is never in. Without the ancestor check, DeepSeekMath's appendix
  // subsection "Algorithms" (a sub-part of "Appendix A.1 Analysis of
  // Reinforcement Learning") matched the word "algorithm" and the library
  // called an appendix subsection the paper's method.
  const framing = (section) => {
    const parts = String(section.id || '').split('.')
    for (let i = 1; i <= parts.length; i += 1) {
      const prefix = parts.slice(0, i).join('.')
      const ancestor = list.find((other) => other.id === prefix)
      if (ancestor && pattern2(NOT_METHOD_RE, ancestor.locator)) return true
    }
    return pattern2(NOT_METHOD_RE, section.locator)
  }
  const weigh = (section) => {
    let total = 0
    for (const other of list) {
      if (other.id !== section.id && !other.id.startsWith(`${section.id}.`)) continue
      total += (region.match(new RegExp(`id="${other.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g')) || []).length
    }
    return total
  }
  // Top-level means "no dot in the LaTeXML id", not "heading level 2": one
  // paper numbers its chapters with <h2>, another with <h3>, and a paper whose
  // chapters are h3 would otherwise have no top level at all -- which is how
  // 2511.18397 came out with zero mechanisms while its §2 is titled "Methods".
  const top = list.filter((section) => depthOf(section.id) === 1 && !framing(section))
  const ranked = top.map((section) => ({ section, weight: weigh(section) })).sort((a, b) => b.weight - a.weight)
  const biggest = ranked[0] ?? null
  if (!biggest || biggest.weight <= 0) return []

  // Named method sections first. Inside a technical report the design is not
  // one section: DeepSeekMath spends its method across pre-training, SFT and RL
  // (GRPO is the whole contribution and lives in §4), and Qwen3 across
  // architecture, pre-training and post-training. So the keyword sections are
  // kept, and any other top-level section nearly as large is added -- a paper
  // that writes 25k characters about post-training has a method there whatever
  // its heading says.
  const named = ranked.filter((entry) => pattern2(METHOD_RE, entry.section.locator))
  const chosen = []
  for (const entry of named) chosen.push(entry)
  for (const entry of ranked) {
    if (chosen.some((pick) => pick.section.id === entry.section.id)) continue
    if (entry.weight < biggest.weight * 0.5) continue
    // A results chapter is not a method chapter even when it is long: adding it
    // puts a table of numbers under "mechanisms" where a reader expects a
    // design. A named section is trusted whatever it is called -- a benchmark
    // paper's method chapter is literally "Benchmark Curation".
    if (pattern2(NOT_METHOD_ROOT_RE, entry.section.locator)) continue
    chosen.push(entry)
  }
  if (!chosen.length) chosen.push(biggest)
  chosen.sort((a, b) => a.section.id.localeCompare(b.section.id, undefined, { numeric: true }))

  const out = []
  for (const entry of chosen.slice(0, 3)) {
    const root = entry.section
    out.push(root)
    for (const section of list) {
      if (!section.id.startsWith(`${root.id}.`)) continue
      // One level of subsections: the chapters a reader would name as the
      // stages. Deeper headings are sub-points and would make the diagram a
      // table of contents.
      if (depthOf(section.id) > depthOf(root.id) + 2) continue
      if (pattern2(NOT_METHOD_SUB_RE, section.locator)) continue
      out.push(section)
    }
  }
  return out
}

function pattern2(re, text) {
  return re.test(String(text || '').toLowerCase())
}

/**
 * Outer `<figure>` elements with balanced nesting.
 *
 * A composite figure is written as `<figure id="F3"><div><figure id="F3.sf1">...
 * <figcaption>(a)</figcaption></figure><figure id="F3.sf2">...</figure></div>
 * <figcaption>Figure 3: Design space ...</figcaption></figure>`. A non-greedy
 * regex stops at the first inner `</figure>`, so the caption it finds is the
 * panel label "(a)" and the page shows a figure whose caption is a letter. The
 * scanner keeps nesting depth so the caption is read from the outer block after
 * the panels are removed.
 */
function figureBlocks(region) {
  const blocks = []
  const open = /<figure\b[^>]*\bid="([^"]+)"[^>]*>/g
  let match
  while ((match = open.exec(region))) {
    const start = match.index + match[0].length
    const tag = /<\/?figure\b/g
    tag.lastIndex = start
    let depth = 1
    let step
    let end = -1
    while ((step = tag.exec(region))) {
      depth += step[0].length === 8 ? -1 : 1
      if (depth === 0) {
        end = step.index
        break
      }
    }
    if (end === -1) break
    blocks.push({ id: match[1], inner: region.slice(start, end) })
    open.lastIndex = end
  }
  return blocks
}

const NESTED_FIGURE_RE = /<figure\b[^>]*>[\s\S]*?<\/figure>/g

function ownCaption(inner) {
  const flat = String(inner || '').replace(NESTED_FIGURE_RE, ' ')
  return (CAPTION_RE.exec(flat) || [])[1] || ''
}

function figureOf(region, base, sections) {
  const found = []
  for (const block of figureBlocks(region)) {
    const src = (IMG_RE.exec(block.inner) || OBJECT_RE.exec(block.inner) || [])[1] || ''
    if (!src) continue
    // The outer caption describes the whole figure; a panel label ("(a)") only
    // says which half of the picture this is, so it is the fallback.
    const caption = plainText(ownCaption(block.inner) || (CAPTION_RE.exec(block.inner) || [])[1] || '')
      // LaTeXML writes `<span class="ltx_tag">Figure 1: </span>` inside the
      // caption, so the plain text of the caption begins with the label the tag
      // already carries. Keeping it doubles the label on the page ("Figure 1:
      // Figure 1: ..."), so it is stripped from the front only.
      .replace(FIGURE_TAG_RE, ' ')
      .replace(/^\s*(?:Figure|Fig\.)\s*\d+\s*[:.]\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const section = sectionForParagraph(sections, block.id)
    found.push({
      id: block.id,
      src,
      url: figureUrl(base, src),
      caption,
      locator: section?.locator ?? null,
      inMethod: Boolean(section && pattern2(METHOD_RE, section.locator)),
      kind: /\.svg(\?|$)/i.test(src) ? 'svg' : 'img',
    })
  }
  if (!found.length) return null
  // The figure a reader wants first is the one inside the method section; a
  // teaser in the introduction is usually the same drawing at half size. A
  // caption that survived is worth more than a bare panel label, so among the
  // method figures the one with the longest caption wins.
  const inMethod = found.filter((figure) => figure.inMethod)
  if (inMethod.length) return inMethod.sort((a, b) => b.caption.length - a.caption.length)[0]
  return found[0]
}

/**
 * Build the record for one work.
 *
 * @param {{id:string, html:string, origin?:string, abstract?:string, year?:number, title?:string}} input
 */
export function buildWorkRecord(input = {}) {
  const html = typeof input.html === 'string' ? input.html : ''
  const region = stripToBody(html)
  const sections = splitSections(region)
  const base = typeof input.origin === 'string' ? input.origin.replace(/\/+$/, '') : ''
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  // The body is the paper; a title from a search result or a citation entry is
  // a second-hand copy of it. One survey row carried the title "Hyperband" for
  // 1903.11059, whose own first heading reads "AlphaX": resolving by title had
  // put the id next to a paper that cites it. So the body wins when the two
  // disagree, and the caller's title is the fallback for papers whose HTML has
  // no document title at all.
  const bodyTitle = documentTitle(html) || ''
  const givenTitle = typeof input.title === 'string' ? input.title.trim() : ''
  const title = bodyTitle || givenTitle || ''

  const motivation = firstParagraphIn(region, sections, INTRO_RE)
  const limitation = firstLimitation(region, sections)

  const method = methodSections(sections, region)
  const bySection = new Map()
  for (const paragraph of paragraphs(region)) {
    const section = sectionForParagraph(sections, paragraph.anchor)
    if (!section) continue
    if (!method.some((candidate) => candidate.id === section.id)) continue
    if (paragraph.text.length < 40) continue
    if (!bySection.has(section.id)) bySection.set(section.id, [])
    bySection.get(section.id).push(paragraph)
  }
  // A method section with no subsections is still one mechanism: its own
  // paragraphs, in order. Grouping by subsection is the finer reading and is
  // used whenever the paper gives us subsections to use.
  const points = []
  for (const section of method) {
    const own = bySection.get(section.id) ?? []
    if (!own.length) continue
    points.push({
      locator: section.locator,
      title: section.title,
      text: own.map((paragraph) => paragraph.text).join(' '),
      sections: [{ locator: section.locator, title: section.title }],
      merged: 1,
    })
  }
  const mechanisms = mergeToMinimum(points.map((point) => ({ ...point, chars: point.text.length })))

  const figure = figureOf(region, base, sections)
  // Every method section is a stage in the order the paper writes it. Dropping
  // the first one used to be "the chapter is not a stage", which held while a
  // paper had one method chapter and loses a third of the diagram once it has
  // three: Architecture, Pre-training, Post-training, then the subsections.
  const stages = method.map((section) => ({ locator: section.locator, title: section.title }))
  const mermaid = pipelineMermaid(stages)

  const references = []
  for (const entry of parseBibEntries(html)) {
    if (!entry || !entry.title) continue
    references.push({ arxivId: entry.arxivId ?? null, title: entry.title, year: entry.year ?? null })
  }

  const note = mermaid
    ? 'the diagram is the paper’s own method subsections in order; the drawn figure is under figure'
    : 'no method section was found, so there is no pipeline to draw and no mechanism to list'

  const record = {
    id,
    title: title.replace(/^[\u2018\u2019\u201c\u201d"']+/, '').replace(/[\u2018\u2019\u201c\u201d"'.]+$/, '').trim() || title,
    year: Number.isFinite(Number(input.year)) ? Number(input.year) : null,
    origin: base || null,
    abstract: typeof input.abstract === 'string' ? input.abstract.trim() : '',
    motivation,
    pipeline: { mermaid, figure, stages, note },
    mechanisms,
    limitations: limitation ? { text: limitation.text, locator: limitation.locator, anchor: limitation.anchor } : null,
    references,
    counts: {
      sections: sections.length,
      paragraphs: paragraphs(region).length,
      mechanisms: mechanisms.length,
      references: references.length,
    },
  }
  record.vector = workVector({ ...record, abstract: record.abstract })
  return record
}

// --- the graph ------------------------------------------------------------

/**
 * An index over records: who cites whom inside the library, and who is near
 * whom by vocabulary.
 *
 * Only edges *inside* the library are kept: a citation to a paper we never read
 * is not a node, and pretending otherwise would make the graph look denser than
 * the evidence behind it.
 */
export function indexOfWorks(records) {
  const list = Array.isArray(records) ? records.filter((record) => record && typeof record.id === 'string') : []
  const byId = new Map(list.map((record) => [record.id, record]))
  const edges = []
  const works = {}
  for (const record of list) {
    works[record.id] = { id: record.id, title: record.title ?? '', citedBy: [], cites: [], vector: record.vector ?? null }
  }
  for (const record of list) {
    for (const reference of Array.isArray(record.references) ? record.references : []) {
      const target = reference && reference.arxivId ? byId.get(reference.arxivId) : null
      if (!target || target.id === record.id) continue
      edges.push({ from: record.id, to: target.id, kind: 'cites' })
      works[record.id].cites.push(target.id)
      works[target.id].citedBy.push(record.id)
    }
  }
  for (const work of Object.values(works)) {
    work.cites = [...new Set(work.cites)]
    work.citedBy = [...new Set(work.citedBy)]
  }
  return { works, edges }
}

/**
 * The works nearest one work: by vector when the library has vectors, else by
 * the citation graph. Both answers are "near", and the caller can see which one
 * it got from `basis`.
 */
export function similarTo(index, id, { k = 5 } = {}) {
  const works = index?.works ?? {}
  const origin = works[id]
  if (!origin) return []
  const others = Object.values(works).filter((work) => work.id !== id)
  if (origin.vector) {
    return others
      .filter((work) => Array.isArray(work.vector))
      .map((work) => ({ id: work.id, title: work.title, similarity: cosine(origin.vector, work.vector), basis: 'vector' }))
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, k))
  }
  const neighbours = new Set([...(origin.cites ?? []), ...(origin.citedBy ?? [])])
  return [...neighbours]
    .sort()
    .slice(0, Math.max(0, k))
    .map((neighbour) => ({ id: neighbour, title: works[neighbour]?.title ?? '', similarity: null, basis: 'graph' }))
}

export { bodyText }
