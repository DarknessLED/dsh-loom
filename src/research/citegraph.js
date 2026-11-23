// Following a direction backwards instead of searching it forwards.
//
// The first eight passes in `docs/research-2026-11-22.md` were built from search
// results: five queries, twelve sources, read four. A reviewer names the hole
// immediately — the works a subfield is *built on* are rarely the ones a search
// engine returns in rank order, and a paper that keeps coming back in a SOTA
// paper's related work is a stronger lead than a fresh hit.
//
// So this module reads a paper the way a graduate student does: parse the
// bibliography, count how often the body cites each entry, and turn the most
// cited entries into the next round of queries. It is a pure function over
// arXiv's HTML5 rendering (`arxiv.org/html/<id>` / `ar5iv.labs.arxiv.org`), so
// every rule here is pinned without a network.
//
// Three honest limits, stated here so callers do not over-read the output:
//
//   * a count is *this paper's* reliance, not the field's importance — a survey
//     citing a baseline five times says something about the survey;
//   * arXiv HTML only exists for papers submitted after the LaTeXML switch, so
//     an older cornerstone simply has no citation graph to read;
//   * titles are matched fuzzily downstream, so a query built from a title can
//     return the citing paper itself. The caller dedupes by arXiv id.

const BIB_ITEM_RE = /<li[^>]*\bid="([^"]*bib[\w.-]*)"[^>]*class="[^"]*ltx_bibitem[^"]*"[^>]*>([\s\S]*?)<\/li>/g
const BIB_ITEM_RE_ALT = /<li[^>]*class="[^"]*ltx_bibitem[^"]*"[^>]*\bid="([^"]*bib[\w.-]*)"[^>]*>([\s\S]*?)<\/li>/g
const ANCHOR_RE = /<a[^>]*\bhref="#(bib\.[\w.-]+)"[^>]*>/g
const HEADING_RE = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g
const SPAN_BLOCK_RE = /<span[^>]*class="[^"]*ltx_bibblock[^"]*"[^>]*>([\s\S]*?)<\/span>/g
const TAG_RE = /<[^>]+>/g
const ARXIV_IN_TEXT_RE = /\barxiv[:\s]*([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?/i
const ARXIV_IN_URL_RE = /arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})(?:v[0-9]+)?/i

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#039;': "'",
  '&#x27;': "'",
  '&ndash;': '-',
  '&mdash;': '-',
  '&hellip;': '...',
}

/**
 * The publication year of a bibliography entry, or null when the entry has none.
 *
 * Taking "the last four-digit number in the entry" is right for the common case
 * and wrong for four others, and the wrong ones are 1.2% of a real corpus: a
 * page range (`pp. 2044–2056` -> 2056), an ISSN (`ISSN 1935-7524` -> 1935), a
 * bracketed arXiv id (`[1905.08019]` -> 1905), or an access date
 * (`[Accessed 14-11-2024]`). A survey direction ranked by its citation years
 * cannot survive that, so each of those shapes is removed before the year is
 * looked for, and a parenthesised year wins over a bare one because only APA
 * style puts the publication year in parentheses.
 */
export function publicationYear(raw) {
  if (typeof raw !== 'string' || !raw) return null
  // A year has to be plausible as one. "2083" in `374(2083):20160112` is an
  // issue number, and it is a four-digit number in the 2000s, so a bound is the
  // only thing that separates it from a publication year. 2030 is the horizon;
  // beyond that a number is almost certainly an identifier.
  const YEAR = '(?:19[0-9]{2}|20[0-2][0-9])'
  let text = raw
  // Whole spans whose numbers are never the publication year.
  text = text.replace(/https?:\/\/\S+/gi, ' ')
  text = text.replace(/\[Accessed[^\]]*\]/gi, ' ')
  text = text.replace(/\bdoi:\s*\S+/gi, ' ')
  text = text.replace(/\bISSN[:\s]*\d{4}-\d{3}[\dxX]\b/gi, ' ')
  text = text.replace(/\b\d{4}-\d{3}[\dxX]\b/g, ' ')
  // arXiv ids look exactly like years ("2505.22954" -> 2505), bare or bracketed.
  text = text.replace(/\barxiv[:\s]*[0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?/gi, ' ')
  text = text.replace(/[0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?/g, ' ')
  // Page ranges ("2002-2029", "2044-2056") before the numbers they contain.
  text = text.replace(/\b\d+\s*[\u2013\u2014-]\s*\d+\b/g, ' ')
  // A parenthesised run of digits that is not a plausible year is an issue, a
  // volume or a page count: `374(2083):20160112` put "2083" where a year goes.
  text = text.replace(new RegExp('\\((?!(?:' + YEAR + ')[a-z]?\\))\\s*\\d[\\d\\s]*\\)', 'g'), ' ')
  // A parenthesised plausible year is the publication year in every style that
  // uses one, and it is the only year the venue parenthetical can contribute.
  const paren = [...text.matchAll(new RegExp('\\(' + YEAR + '[a-z]?\\)', 'g'))]
  if (paren.length) return Number(paren[paren.length - 1][0].replace(/\D/g, '').slice(0, 4))
  // Otherwise the year sits after a comma, a full stop, or opens the entry, and
  // never inside a "vol. 12" / "no. 3" / "pp. 44" field.
  const bare = [...text.matchAll(new RegExp('(?:^|[,.;:(]\\s*)(' + YEAR + ')[a-z]?(?=[\\s,.;:)]|$)', 'g'))]
  return bare.length ? Number(bare[bare.length - 1][1]) : null
}

/** A bibliography title often ends with its year ("DAPO: ..., 2025."); the year has its own field. */
function stripYearSuffix(text) {
  return String(text ?? '')
    .replace(/[,\s]+(?:19|20)[0-9]{2}\.?$/, '')
    .replace(/[,\s]+$/, '')
    .trim()
}

/** Strip tags and decode the few entities a bibliography actually uses. */
export function plainText(html) {
  if (typeof html !== 'string' || !html) return ''
  let text = html.replace(TAG_RE, ' ')
  for (const [entity, value] of Object.entries(ENTITIES)) text = text.split(entity).join(value)
  // Numeric references are common in bibliographies and were reaching callers
  // verbatim as `&#34;` / `&#x2019;`.
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  text = text.replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  return text.replace(/\s+/g, ' ').trim()
}

/** Where the bibliography starts, so in-text citation counting can stop there. */
function bibliographyStart(html) {
  const marker = html.search(/ltx_bibliography|ltx_biblist/)
  return marker === -1 ? html.length : marker
}

/**
 * Parse the references section into records.
 *
 * @param {string} html an arXiv HTML5 page
 * @returns {Array<{key: string, ref: string, authors: string, title: string, year: number|null, venue: string|null, url: string|null, arxivId: string|null, raw: string}>}
 */
export function parseBibEntries(html) {
  if (typeof html !== 'string' || !html) return []
  const region = html.slice(bibliographyStart(html))
  const entries = []
  for (const re of [BIB_ITEM_RE, BIB_ITEM_RE_ALT]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(region))) {
      const [, key, body] = match
      if (!key || !body) continue
      const entry = readEntry(key, body)
      if (entry) entries.push(entry)
    }
    if (entries.length) break
  }
  return entries
}

function readEntry(key, body) {
  const ref = plainText((/<span[^>]*ltx_tag[^>]*>([\s\S]*?)<\/span>/.exec(body) || [])[1] || '')
  const blocks = []
  SPAN_BLOCK_RE.lastIndex = 0
  let block
  while ((block = SPAN_BLOCK_RE.exec(body))) {
    const text = plainText(block[1])
    if (text) blocks.push(text)
  }
  const raw = plainText(body)
  if (!raw) return null
  // Authors and title are the first two prose blocks in arXiv's rendering; a
  // missing block leaves the fields empty rather than shifting the title up.
  const authors = blocks[0] ?? ''
  const title = stripYearSuffix(blocks[1] ?? '')
  if (!title && !authors) return null
  // The venue is whatever is emphasised, because that is how a proceedings or a
  // journal name is marked in the source. An entry with no <em> has no venue.
  const venueHtml = (/<em[^>]*>([\s\S]*?)<\/em>/.exec(body) || [])[1] || ''
  const venue = plainText(venueHtml) || null
  const url = (/\bhref="(https?:\/\/[^"]+)"/.exec(body) || [])[1] || null
  // An arXiv id looks exactly like a year (2505.22954 -> "2505"), and it sits
  // in the entry text, so the year has to be read after the ids are removed.
  // Found on the DGM bibliography: "AI-GAs" was dated 1905 from arXiv 1905.10985.
  // Page ranges, ISSNs and access dates are removed for the same reason.
  const year = publicationYear(raw)
  const arxivId = ARXIV_IN_TEXT_RE.test(raw) ? ARXIV_IN_TEXT_RE.exec(raw)[1] : null
  return { key, ref, authors, title, year, venue, url, arxivId, raw }
}

/**
 * How often the body cites each bibliography key.
 *
 * Counting stops at the bibliography, so an entry that links sideways to
 * another entry is not mistaken for the paper leaning on it.
 */
export function citationCounts(html) {
  const counts = new Map()
  if (typeof html !== 'string' || !html) return counts
  const body = html.slice(0, bibliographyStart(html))
  ANCHOR_RE.lastIndex = 0
  let match
  while ((match = ANCHOR_RE.exec(body))) {
    const key = match[1]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** Attach counts and sort, most-cited first; ties keep bibliography order. */
export function rankReferences(entries, counts) {
  const list = Array.isArray(entries) ? entries : []
  const map = counts instanceof Map ? counts : new Map()
  return list
    .map((entry, index) => ({ ...entry, cited: map.get(entry.key) ?? 0, index }))
    .sort((a, b) => b.cited - a.cited || a.index - b.index)
}

/** The works a paper compares against: cited more than once, by default. */
export function comparedWorks(entries, counts, options = {}) {
  const minCited = Number.isFinite(options?.minCited) ? Number(options.minCited) : 2
  return rankReferences(entries, counts).filter((entry) => entry.cited >= minCited)
}

/**
 * Turn the most-cited references into the next round of search queries.
 *
 * Title plus year, because "Alpha method" alone returns every later paper that
 * mentions it while "Alpha method 2021" tends to return the paper itself.
 *
 * @param {Array} entries
 * @param {Map<string, number>} counts
 * @param {{limit?: number, exclude?: string[]}} [options]
 * @returns {string[]}
 */
export function followupQueriesFrom(entries, counts, options = {}) {
  const limit = Number.isFinite(options?.limit) ? Number(options.limit) : 5
  const seen = (Array.isArray(options?.exclude) ? options.exclude : [])
    .map((item) => plainText(String(item ?? '')).toLowerCase())
    .filter(Boolean)
  const queries = []
  for (const entry of rankReferences(entries, counts)) {
    if (queries.length >= limit) break
    const title = plainText(entry.title || '')
    if (!title) continue
    const bare = title.toLowerCase().replace(/[.]$/, '')
    if (seen.some((item) => item.includes(bare) || bare.includes(item))) continue
    const query = plainText([title.replace(/[.]$/, ''), entry.year ?? ''].filter(Boolean).join(' '))
    if (!query) continue
    if (queries.some((q) => q.toLowerCase() === query.toLowerCase())) continue
    queries.push(query)
  }
  return queries
}

/** The arXiv id of a paper, from its URL or from a citation string. */
export function arxivIdOf(record) {
  if (!record || typeof record !== 'object') return null
  for (const field of ['url', 'text', 'raw', 'title']) {
    const value = typeof record[field] === 'string' ? record[field] : ''
    if (!value) continue
    const fromUrl = ARXIV_IN_URL_RE.exec(value)
    if (fromUrl) return fromUrl[1]
    const fromText = ARXIV_IN_TEXT_RE.exec(value)
    if (fromText) return fromText[1]
  }
  return null
}

/** Section titles in document order, so a reader can find related work. */
export function sectionHeadings(html) {
  if (typeof html !== 'string' || !html) return []
  const headings = []
  HEADING_RE.lastIndex = 0
  let match
  while ((match = HEADING_RE.exec(html))) {
    const text = plainText(match[2])
    if (text) headings.push(text)
  }
  return headings
}
