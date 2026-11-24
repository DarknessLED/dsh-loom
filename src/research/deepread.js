// Reading a paper's body instead of its abstract.
//
// The eight surveys kept 219 MB of arXiv HTML5 renderings and, until now, read
// exactly one thing out of them: the bibliography. Everything else in a survey
// document came from the search page's truncated abstract, which is why
// `src/research/note.js` — the depth checker this repo already ships — refuses
// such a note with `depth-exceeds-reading` the moment a claim is about a
// mechanism or an evaluation.
//
// This module is the missing half. It splits a body into named sections,
// returns verbatim passages that remember which section and paragraph they came
// from, and assembles a note whose claims carry a locator, so `gradeNote` can
// be run on it at depth `full` instead of being skipped.
//
// Four facts about arXiv's HTML5 that shape every rule here:
//
//   * paragraph ids are hierarchical (`S3.SS1.p2.1`), so the section a
//     paragraph belongs to is the *longest* section id that prefixes it — a
//     first-match lookup files a subsection's paragraphs under its parent and
//     the locator then points a reader at the wrong section;
//   * the tag a reader cites ("III-B") lives in its own `<span class="ltx_tag">`
//     and is deleted by a naive strip-tags, which leaves "Candidate acceptance"
//     with no number to look up;
//   * the abstract is `<p id="abstract1.1">`, outside every section, so it can
//     never inherit a section locator — assigning it one is the same error as
//     citing the abstract as the body;
//   * a passage has to come back verbatim (whitespace collapsed) or the quote
//     cannot be checked against the stored bytes in the ledger later.

import { plainText } from './citegraph.js'

const CHROME_RE = /<(script|style|noscript|svg|head|nav|header|footer|form|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const SECTION_RE = /<section\b[^>]*\bid="([^"]+)"[^>]*>/g
const HEADING_RE = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g
const TAG_SPAN_RE = /<span[^>]*class="[^"]*ltx_tag[^"]*"[^>]*>([\s\S]*?)<\/span>/i
const PARAGRAPH_RE = /<p\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
const BODY_BLOCK_RE =
  /<\/?(?:p|div|br|li|ul|ol|tr|td|th|h[1-6]|section|article|table|blockquote|pre)\b[^>]*>/gi

/** Everything a reader never cites: scripts, styles, chrome, comments. */
function stripChrome(html) {
  if (typeof html !== 'string' || !html) return ''
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(CHROME_RE, ' ')
}

/** Stop at the references: a bibliography entry is not a passage of the body. */
function bodyRegion(html) {
  const marker = html.search(/ltx_bibliography|ltx_biblist|id="bib\./i)
  return marker === -1 ? html : html.slice(0, marker)
}

/**
 * The body as flat text. Kept separate from `passagesWithLocators` because a
 * caller sometimes wants the whole text (to search it) rather than quotations.
 */
export function bodyText(html) {
  if (typeof html !== 'string' || !html) return ''
  const text = stripChrome(html).replace(BODY_BLOCK_RE, '\n').replace(/<[^>]+>/g, ' ')
  return plainText(text).replace(/\s*\n\s*/g, '\n').trim()
}

// A title a reader could search for. LaTeXML writes "Untitled Document" when a
// paper declares none, and falls back to the first section heading ("1
// Introduction") when it cannot find the document title at all -- both look
// like a title to a string comparison and neither can be cited.
const JUNK_TITLE_RE = /^(untitled document|untitled|no title)$/i
const HEADING_TITLE_RE = /^(?:\d+(?:\.\d+)*\.?\s*)?(?:introduction|related work|background|conclusion|references|appendix)\b/i

function titleFromHeading(html) {
  const h1 = /<h1[^>]*class="[^"]*ltx_title_document[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
  if (h1) return plainText(h1[1])
  const span = /<span[^>]*class="[^"]*ltx_title_document[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(html)
  if (span) return plainText(span[1])
  return ''
}

/**
 * The paper's own title, or '' when the page does not state one.
 *
 * Returning '' rather than the best available string is deliberate: the caller
 * has an expected title and a similarity check, and a plausible-looking wrong
 * title is what gets a note filed under the wrong paper.
 */
export function documentTitle(html) {
  if (typeof html !== 'string' || !html) return ''
  const candidates = [
    titleFromHeading(html),
    (/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '',
    (/<meta\s+name="citation_title"\s+content="([^"]*)"/i.exec(html) || [])[1] || '',
  ]
  for (const raw of candidates) {
    const title = plainText(String(raw)).replace(/\s+/g, ' ').trim()
    if (!title || JUNK_TITLE_RE.test(title) || HEADING_TITLE_RE.test(title)) continue
    if (title.length < 4) continue
    return title
  }
  return ''
}

/**
 * Normalised title for comparison; keeps letters and spaces.
 *
 * Superscripts go first: NFKD turns a superscript two into a plain "2", which
 * welds it to the word and makes "Harness2" a different word from "Harness".
 * Quotes inside a word are a glyph artifact ("G\"odel" is Gödel rendered by a
 * converter that lost the diaeresis), so they are deleted rather than turned
 * into a word break.
 */
function titleKey(text) {
  return String(text || '')
    .replace(/[\u00b2\u00b3\u00b9\u2070-\u209f]/g, '')
    .replace(/["'\u2018\u2019\u201c\u201d]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * How much two titles share, 0..1, by word overlap of the longer title.
 *
 * Word overlap rather than edit distance because the mismatches are whole
 * words ("AlphaX" against "Hyperband") while the matches are punctuation,
 * superscripts and restored diaereses.
 */
export function titleSimilarity(a, b) {
  const words = (text) => new Set(titleKey(text).split(' ').filter((w) => w.length > 2))
  const left = words(a)
  const right = words(b)
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const w of left) if (right.has(w)) shared += 1
  const overlap = shared / Math.max(left.size, right.size)
  // A swallowed title is still the title: `1504.04949` (MAP-Elites) renders as
  // one `<title>` containing the paper name followed by every author, their
  // institutions and the preprint date. Word overlap of the long form scores
  // 0.15, so near-containment has to count as a match -- the opposite error,
  // a short generic title inside an unrelated paper, is what the words filter
  // and the 0.8 threshold exist for.
  if (shared / Math.min(left.size, right.size) >= 0.9) return 1
  return overlap
}

/**
 * Pick the search result that is the paper we meant, or none.
 *
 * A wrong id is not always recoverable by guessing: Hyperband is
 * `1603.06560`, and a citing paper wrote `1903.11059` (AlphaX) next to its
 * title. The title is what we actually know, so the search result whose title
 * matches it is the paper -- but only above a real threshold, because the top
 * hit for a title query is usually a *paper that cites it*.
 *
 * @param {Array<{id:string,title:string}>} records
 * @param {string} expected
 * @param {{min?:number}} options
 */
export function pickBestTitle(records, expected, { min = 0.8 } = {}) {
  const list = Array.isArray(records) ? records : []
  let best = null
  for (const record of list) {
    if (!record || typeof record.id !== 'string' || !record.id.trim()) continue
    const similarity = titleSimilarity(expected, record.title)
    if (!best || similarity > best.similarity) best = { id: record.id.trim(), title: record.title, similarity }
  }
  if (!best || best.similarity < min) return null
  return best
}

/**
 * True when arXiv served a placeholder instead of a rendered body.
 *
 * `1707.06347` (PPO) is the example that motivated this: the page says "See
 * pages 1-last of ppo-min.pdf" and nothing else. Reading it yields zero
 * passages, which is indistinguishable from "the terms did not match" unless
 * the stub itself is recognised.
 */
export function bodyIsUnrendered(html) {
  if (typeof html !== 'string' || !html) return true
  const paragraphs = (html.match(/<p\b[^>]*\bid="[^"]*"/g) || []).length
  // No paragraph with an id means no body this module can quote, whatever the
  // page contains.
  if (!paragraphs) return true
  const text = bodyText(html)
  const pointer = /see pages\s+\S+\s+of\s+\S+\.pdf/i.exec(text)
  if (!pointer) return false
  // A rendered paper may quote that sentence (it is how a supplement is
  // announced); a placeholder is *only* that sentence.
  const rest = `${text.slice(0, pointer.index)} ${text.slice(pointer.index + pointer[0].length)}`
  return rest.trim().length < 200
}

/**
 * The sections of a body, in document order, each with the number a reader
 * would cite and the plain name.
 *
 * @returns {Array<{id: string, level: number, tag: string, title: string, locator: string}>}
 */
export function splitSections(html) {
  if (typeof html !== 'string' || !html) return []
  const region = stripChrome(html)
  const marks = []
  SECTION_RE.lastIndex = 0
  let match
  while ((match = SECTION_RE.exec(region))) marks.push({ id: match[1], at: match.index })

  const headings = []
  HEADING_RE.lastIndex = 0
  let heading
  while ((heading = HEADING_RE.exec(region))) {
    headings.push({ level: Number(heading[1]), body: heading[2], at: heading.index })
  }

  const sections = []
  for (let i = 0; i < marks.length; i += 1) {
    const mark = marks[i]
    const next = i + 1 < marks.length ? marks[i + 1].at : region.length
    // The heading belongs to the section and sits right after its opening tag.
    const own = headings.find((h) => h.at > mark.at && h.at < next)
    if (!own) continue
    const tag = plainText((TAG_SPAN_RE.exec(own.body) || [])[1] || '')
    const title = plainText(own.body.replace(TAG_SPAN_RE, ' '))
    if (!title) continue
    const locator = tag ? `§${tag} ${title}` : `§${title}`
    sections.push({ id: mark.id, level: own.level, tag, title, locator })
  }
  return sections
}

/**
 * Which section a paragraph belongs to: the longest section id that prefixes
 * it, or `null` when no section does (the abstract, a footnote).
 */
export function sectionForParagraph(sections, paragraphId) {
  if (!Array.isArray(sections) || typeof paragraphId !== 'string' || !paragraphId) return null
  let best = null
  for (const section of sections) {
    if (!section || typeof section.id !== 'string') continue
    if (!paragraphId.startsWith(`${section.id}.`)) continue
    if (!best || section.id.length > best.id.length) best = section
  }
  return best
}

/**
 * Verbatim passages that mention at least one term, each with the paragraph
 * anchor and the section locator a reader can open.
 *
 * Ranked by how many terms a passage matches, ties in document order, so the
 * same file and the same terms always give the same list.
 */
export function passagesWithLocators(html, terms, options = {}) {
  if (typeof html !== 'string' || !html) return []
  const region = bodyRegion(stripChrome(html))
  const sections = splitSections(region)
  const wanted = (Array.isArray(terms) ? terms : [])
    .map((term) => (typeof term === 'string' ? term.trim().toLowerCase() : ''))
    .filter(Boolean)
  if (!wanted.length) return []

  const maxPassages = Number.isFinite(Number(options.maxPassages)) ? Math.max(0, Number(options.maxPassages)) : 6
  const hits = []
  PARAGRAPH_RE.lastIndex = 0
  let match
  let index = 0
  while ((match = PARAGRAPH_RE.exec(region))) {
    const anchor = match[1]
    const section = sectionForParagraph(sections, anchor)
    index += 1
    if (!anchor || /^abstract/i.test(anchor) || !section) continue
    const text = plainText(match[2])
    if (!text || text.length < 40) continue
    const lower = text.toLowerCase()
    const matchedTerms = wanted.filter((term) => lower.includes(term))
    if (!matchedTerms.length) continue
    hits.push({
      text,
      anchor,
      sectionId: section.id,
      locator: section.locator,
      matchedTerms: [...new Set(matchedTerms)],
      score: matchedTerms.length,
      index,
    })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxPassages)
}

/** The section a heading name implies, for the note's `section` field. */
function sectionKind(locator) {
  const text = String(locator || '').toLowerCase()
  if (/result|evaluat|experiment|benchmark/.test(text)) return 'evaluation'
  if (/ablation/.test(text)) return 'ablations'
  if (/limitation/.test(text)) return 'limitations'
  if (/related work|prior work/.test(text)) return 'prior_work'
  if (/method|approach|design|mechanism|framework|algorithm/.test(text)) return 'mechanism'
  if (/introduction|motivation|problem/.test(text)) return 'problem'
  return null
}

/**
 * A research note assembled from body passages, shaped so `gradeNote` can judge
 * it at depth `full`: every claim carries a locator, and a paper whose body
 * yields nothing says so in `gaps` rather than inventing a claim.
 *
 * @param {{paper: object, html: string, terms: string[], gaps?: Array}} input
 */
export function buildDeepNote({ paper, html, terms, gaps } = {}) {
  const record = paper && typeof paper === 'object' ? paper : {}
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const note = {
    depth: 'full',
    identity: {
      title: typeof record.title === 'string' ? record.title.trim() : '',
      authors: Array.isArray(record.authors) ? record.authors.filter((a) => typeof a === 'string' && a.trim()) : [],
      identifier: id ? `arxiv:${id}` : '',
    },
    claims: [],
    gaps: Array.isArray(gaps) ? gaps.map((gap) => ({ scope: gap?.scope, text: gap?.text })) : [],
  }

  const passages = passagesWithLocators(html, terms)
  // A reading that could quote almost nothing is a shallow reading wearing the
  // word `full`: HTML was fetched, so `depth` is honest, but two usable
  // paragraphs are not a structural reading of a long paper. Marking it lets
  // `gradeNote` refuse the mechanism and evaluation claims that a thin body
  // cannot support (see arXiv 2501.04227 §1 for the 6.1 vs 3.8 gap between a
  // thorough and a quick reading of the same material).
  const SHALLOW_PASSAGES = 3
  note.shallow = passages.length < SHALLOW_PASSAGES
  for (const passage of passages) {
    const section = sectionKind(passage.locator)
    const claim = {
      section: section ?? undefined,
      type: /\d/.test(passage.text) ? 'measurement' : 'author-claim',
      text: passage.text.length > 400 ? `${passage.text.slice(0, 397)}...` : passage.text,
      locator: passage.locator,
      anchor: passage.anchor,
    }
    note.claims.push(claim)
  }

  if (!passages.length) {
    note.gaps.push({
      scope: 'full text',
      text: 'no passage of the body matched the question terms, so this note has no claim to make about it',
    })
  }
  return note
}
