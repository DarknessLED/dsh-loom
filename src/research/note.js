// The shape of a research note, checked mechanically.
//
// Why a checker and not a paragraph of good advice: the five rules below are
// the ones a summary silently breaks when it is written quickly, and each one
// is decidable from the note itself.
//
//   1. A reachable identifier only proves that a record exists. Identity is
//      title + authors + identifier; anything less is a candidate, and a
//      candidate cannot carry claims yet.
//   2. Reading depth is declared, and a claim cannot be stronger than the
//      depth. A mechanism or evaluation claim read off an abstract is a gap in
//      the note, not a finding about the paper.
//   3. An author claim and a reader inference are different types. The type is
//      required, so a guess cannot be laundered by good grammar.
//   4. Every claim carries a locator: page, section, table, figure, anchor.
//      Without one, the claim cannot be checked and is therefore not evidence.
//   5. A delta is two cells under one protocol, subtracted. Pairing two runs
//      from different setups and calling the difference an improvement is the
//      single most common numerical error in a survey.
//
// What this cannot do: verify that the paper says what the note says. That
// needs the locator opened. The checker only guarantees the note is phrased so
// that opening it is possible.
//
// Source of the method: `3dgs-paper-reader/references/evidence-workflow.md`
// and `research-expert-team`'s claim ledger in
// github.com/jaccen/Awesome-Gaussian-Skills (Apache-2.0), reworked for a
// general topic rather than 3DGS.

const DEPTHS = ['metadata', 'abstract', 'full']

// Sections a claim can belong to. `sections` in the 3DGS paper-evidence schema,
// minus the ones that are pure bookkeeping.
const SECTIONS = ['problem', 'contributions', 'mechanism', 'evaluation', 'ablations', 'limitations', 'prior_work', 'reproducibility']

// Sections that cannot be written from an abstract alone: the abstract states
// the problem and the headline result, not how it works or how it was measured.
const NEEDS_FULL_TEXT = new Set(['mechanism', 'evaluation', 'ablations', 'reproducibility'])

const CLAIM_TYPES = [
  'author-claim', // the paper asserts this
  'literature-statement', // a third party asserts this, cited by the paper
  'measurement', // a number the paper reports
  'reader-inference', // we concluded this; the paper did not say it
  'hypothesis', // to be tested
  'proposal', // to be built
]

const DELTA_EPS = 0.005

function finding(code, detail) {
  return { code, detail: String(detail ?? '') }
}

function nonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0
}

function identityFindings(identity) {
  const out = []
  const id = identity && typeof identity === 'object' ? identity : {}
  if (!nonEmptyString(id.identifier)) {
    out.push(finding('identity-identifier', 'a title alone is a candidate, not a record: give a DOI, versioned arXiv ID or publisher record'))
  }
  const authors = Array.isArray(id.authors) ? id.authors.filter(nonEmptyString) : []
  if (authors.length === 0) out.push(finding('identity-authors', 'identity needs at least one author'))
  if (!nonEmptyString(id.title)) out.push(finding('identity-title', 'identity needs a title'))
  return out
}

function claimFindings(claim, depth, index, shallow = false) {
  const out = []
  const c = claim && typeof claim === 'object' ? claim : {}
  const label = nonEmptyString(c.id) ? c.id : `#${index + 1}`

  if (!CLAIM_TYPES.includes(c.type)) {
    out.push(finding('claim-type', `${label}: type must be one of ${CLAIM_TYPES.join(', ')}`))
  }
  if (nonEmptyString(c.section) && !SECTIONS.includes(c.section)) {
    out.push(finding('claim-section', `${label}: unknown section "${c.section}"`))
  }
  if (!nonEmptyString(c.locator)) {
    out.push(finding('claim-locator', `${label}: no locator (page, section, table, figure or anchor)`))
  }
  if (NEEDS_FULL_TEXT.has(c.section) && (depth === 'abstract' || depth === 'metadata')) {
    out.push(
      finding(
        'depth-exceeds-reading',
        `${label}: a ${c.section} claim needs the full text, the note says it only read the ${depth}`,
      ),
    )
  }
  if (NEEDS_FULL_TEXT.has(c.section) && shallow) {
    // Declaring `full` is a claim about what was fetched, not about how much of
    // it could be quoted. A body that yielded almost nothing cannot support a
    // mechanism claim, so the reading's own thinness is what fails here.
    out.push(
      finding(
        'depth-exceeds-reading',
        `${label}: a ${c.section} claim needs the full text, and this reading was too shallow to quote enough of it to support one`,
      ),
    )
  }
  if (!nonEmptyString(c.text)) out.push(finding('claim-text', `${label}: empty claim`))

  // Delta discipline: only meaningful when a delta is claimed.
  if (c.delta !== undefined && c.delta !== null) {
    const pair = Array.isArray(c.pair) ? c.pair : []
    const cells = pair.filter((p) => p && Number.isFinite(Number(p.value)))
    if (cells.length !== 2) {
      out.push(finding('delta-unpairable', `${label}: a delta needs exactly two cells with numeric values`))
    } else {
      const [a, b] = cells
      const protocols = cells.map((p) => String(p.protocol ?? '').trim())
      if (!protocols[0] || protocols[0] !== protocols[1]) {
        out.push(
          finding(
            'delta-protocol',
            `${label}: the two cells were measured under different protocols ("${protocols[0] || '?'}" vs "${protocols[1] || '?'}"); that difference is not a delta`,
          ),
        )
      } else {
        const computed = Number(a.value) - Number(b.value)
        if (Math.abs(computed - Number(c.delta)) > DELTA_EPS) {
          out.push(
            finding(
              'delta-mismatch',
              `${label}: delta says ${c.delta} but the two cells give ${Math.round(computed * 1e6) / 1e6}`,
            ),
          )
        }
      }
    }
  }
  return out
}

/**
 * Grade one research note.
 *
 * Never throws: a loop that calls this must not die on a malformed note.
 *
 * @param {object|null} note
 * @returns {{ok: boolean, findings: Array<{code: string, detail: string}>, counts: object}}
 */
export function gradeNote(note) {
  const counts = { claims: 0, authorClaims: 0, inferences: 0, gaps: 0 }
  if (!note || typeof note !== 'object' || Array.isArray(note)) {
    return { ok: false, findings: [finding('shape', 'the note must be an object')], counts }
  }

  const findings = []
  const depth = nonEmptyString(note.depth) ? note.depth : null
  if (!depth) findings.push(finding('depth', 'declare the reading depth: metadata, abstract or full'))
  else if (!DEPTHS.includes(depth)) findings.push(finding('depth', `unknown reading depth "${depth}"`))

  findings.push(...identityFindings(note.identity))

  const claims = Array.isArray(note.claims) ? note.claims : null
  if (claims === null) {
    findings.push(finding('shape', 'claims must be an array'))
  } else {
    counts.claims = claims.length
    claims.forEach((claim, i) => {
      findings.push(...claimFindings(claim, depth, i, note.shallow === true))
      const type = claim?.type
      // "From sources" means the source said it. A measurement is reported by
      // the paper too, so it counts; an inference does not, and is counted
      // apart so a summary cannot hide its own guesses in the source total.
      if (type === 'author-claim' || type === 'literature-statement') counts.authorClaims += 1
      if (type === 'measurement') counts.measurements = (counts.measurements ?? 0) + 1
      if (type === 'reader-inference') counts.inferences += 1
    })
    if (claims.length === 0) findings.push(finding('claims-empty', 'a note with no claims is a bookmark'))
  }

  const gaps = Array.isArray(note.gaps) ? note.gaps : []
  counts.gaps = gaps.length
  gaps.forEach((gap, i) => {
    const label = nonEmptyString(gap?.scope) ? gap.scope : `#${i + 1}`
    if (!nonEmptyString(gap?.scope)) findings.push(finding('gap-scope', `${label}: a gap must say which scope is missing (supplement, table cell, baseline comparability, …)`))
    if (!nonEmptyString(gap?.text)) findings.push(finding('gap-text', `${label}: empty gap`))
  })

  return { ok: findings.length === 0, findings, counts }
}

/** One line per finding, plus a summary; safe to print in a terminal. */
export function renderNote(result) {
  const lines = result.findings.map((f) => `${f.code}: ${f.detail}`)
  const c = result.counts
  lines.push(
    `${result.ok ? 'ok' : 'failed'} — ${c.claims} claim(s) (${c.authorClaims} from sources, ${c.inferences} inferred), ${c.gaps} gap(s)`,
  )
  return lines
}
