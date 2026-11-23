// Putting the eight surveys' foundations in front of a reader.
//
// A survey's `cls.foundations` list is what the direction actually cites: each
// entry names a work and how many of the read papers cited it. That list is
// the honest answer to "which papers should I read deeply", and it is the one
// thing the survey documents do not use — they print the table and stop.
//
// The selection is deliberately conservative about what it can promise:
//
//   * only works with an arXiv id can be fetched at all, so an entry without
//     one is dropped rather than retried;
//   * the ranking is cited-by-papers inside the corpus, not a field-wide count,
//     and the returned objects say which basis produced the order;
//   * `sota` papers carry no citation count, so they are appended after the
//     ranked foundations rather than mixed into a ranking they cannot join.
import { plainText } from './citegraph.js'

const YEAR_OF = (w) => (Number.isFinite(Number(w?.year)) ? Number(w.year) : null)

function titleOf(work) {
  const raw = work?.title ?? ''
  // Titles out of a bibliography carry a trailing period and stray markup.
  return String(plainText(raw))
    .replace(/\s+/g, ' ')
    // Bibliography entries arrive wrapped in the quotes the PDF used for a
    // title, and with the trailing period that ends the entry.
    .replace(/^[\u201c"']+/, '')
    .replace(/[\u201d"']+\s*\.?\s*$/, '')
    .replace(/\s*\.\s*$/, '')
    .trim()
}

/**
 * @param {object} survey parsed `research/out/<slug>.survey.json`
 * @param {{top?:number, exclude?:string[], minCited?:number}} options
 * @returns {Array<{id:string, title:string, year:number|null, cites:number, why:'foundation'|'sota', basis:string}>}
 */
export function selectReadingList(survey, { top = 8, exclude = [], minCited = 1 } = {}) {
  const skip = new Set((Array.isArray(exclude) ? exclude : []).map((x) => String(x).trim()).filter(Boolean))
  const out = []
  const seen = new Set()

  const foundations = Array.isArray(survey?.cls?.foundations) ? survey.cls.foundations : []
  const ranked = foundations
    .filter((w) => w && typeof w.arxivId === 'string' && w.arxivId)
    .filter((w) => Number(w.citedByPapers) >= minCited)
    .slice()
    .sort((a, b) => Number(b.citedByPapers) - Number(a.citedByPapers) || String(a.title).localeCompare(String(b.title)))

  for (const work of ranked) {
    const id = String(work.arxivId).trim()
    if (!id || skip.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      title: titleOf(work),
      year: YEAR_OF(work),
      cites: Number(work.citedByPapers) || 0,
      why: 'foundation',
      basis: 'cited by papers in this corpus',
    })
    if (out.filter((x) => x.why === 'foundation').length >= top) break
  }

  const sota = Array.isArray(survey?.cls?.sota) ? survey.cls.sota : []
  for (const paper of sota) {
    if (out.length >= top) break
    const id = typeof paper?.id === 'string' ? paper.id.trim() : ''
    if (!id || skip.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: titleOf(paper), year: YEAR_OF(paper), cites: 0, why: 'sota', basis: 'recent in this direction' })
  }
  return out
}
