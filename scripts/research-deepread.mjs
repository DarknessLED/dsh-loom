// Reading the body of a paper, not its abstract, and depositing what we read.
//
// `scripts/research-survey.mjs` answers "what does this field cite"; this one
// answers "what does this paper actually say, and where on the page does it say
// it". It exists because the eight survey documents were written from truncated
// abstracts: 219 MB of arXiv HTML5 was fetched and only the bibliography was
// ever extracted, so every claim about a mechanism or an evaluation rested on a
// summary, and `src/research/note.js` — the depth checker this repo already
// ships — rejects such a note with `depth-exceeds-reading`.
//
// What it produces, per paper:
//
//   * a *note* at depth `full`, every claim carrying a locator of the form
//     `§III-A Candidate acceptance`, graded by `gradeNote` and printed with its
//     findings so a bad note is visible, not silently accepted;
//   * the verbatim passage behind each claim, so the same sentence can be
//     stored as evidence and checked against the snapshot bytes later;
//   * with `--ledger`, that passage becomes a ledger evidence snapshot and a
//     registered claim that quotes it, which is what makes the reading
//     checkable by `scripts/research-replay.mjs` instead of trusted.
//
// Usage:
//   node scripts/research-deepread.mjs --ids 2604.25850,2606.09498 \
//     --terms "harness,edit,regression,held-out" --out research/out/deep-r9.json
//   node scripts/research-deepread.mjs --ids ... --doc docs/research/deep.md
//   node scripts/research-deepread.mjs --ids ... --ledger
//
// Bodies are cached under `research/out/.cache/deep/<id>.html`, so a rerun is
// free and a reviewer can see exactly which bytes were read.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  bodyText,
  splitSections,
  sectionForParagraph,
  passagesWithLocators,
  buildDeepNote,
} from '../src/research/deepread.js'
import { gradeNote, renderNote } from '../src/research/note.js'
import { addEvidence, addClaim } from '../src/research/ledger.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CACHE = join(ROOT, 'research', 'out', '.cache', 'deep')
const UA = 'dsh-loom-research/0.1 (+https://github.com/darkness/dsh-loom)'

function usage() {
  return [
    'node scripts/research-deepread.mjs --ids <a,b,c> [options]',
    '',
    '  --ids <list>      comma-separated arXiv ids (required)',
    '  --terms <list>    comma-separated terms used to pick passages',
    '  --out <file>      write the JSON result here',
    '  --doc <file>      write a Markdown document here',
    '  --reading <file>  append this hand-written judgement section to the doc',
    '  --ledger          store passages as evidence and register locator claims',
    '  --home <dir>      loom home (default: ~/.dsh/loom)',
  ].join('\n')
}

export function parseArgs(argv) {
  const out = { ids: [], terms: [], ledger: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === '--ids') { out.ids = String(next || '').split(',').map((s) => s.trim()).filter(Boolean); i += 1 }
    else if (flag === '--terms') { out.terms = String(next || '').split(',').map((s) => s.trim()).filter(Boolean); i += 1 }
    else if (flag === '--out') { out.out = next; i += 1 }
    else if (flag === '--doc') { out.doc = next; i += 1 }
    else if (flag === '--home') { out.home = next; i += 1 }
    else if (flag === '--reading') { out.reading = next; i += 1 }
    else if (flag === '--ledger') out.ledger = true
    else if (flag === '--help' || flag === '-h') out.help = true
  }
  return out
}

/** One body, cached by id. A cache hit never touches the network. */
async function bodyFor(id, { refresh = false } = {}) {
  mkdirSync(CACHE, { recursive: true })
  const file = join(CACHE, `${id.replace(/[^0-9a-zA-Z._-]/g, '_')}.html`)
  if (!refresh && existsSync(file)) {
    const cached = readFileSync(file, 'utf8')
    if (/ltx_section|ltx_p/.test(cached)) return { html: cached, cached: true, file }
  }
  const url = `https://arxiv.org/html/${id}`
  let response
  try {
    response = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' } })
  } catch (err) {
    return { html: '', error: `request failed: ${err?.message ?? err}`, file: null }
  }
  if (!response.ok) return { html: '', error: `HTTP ${response.status}`, file: null }
  const html = await response.text()
  if (!/ltx_section|ltx_p/.test(html)) return { html: '', error: 'no rendered body (arXiv has no HTML for this paper yet)', file: null }
  writeFileSync(file, html, 'utf8')
  return { html, cached: false, file }
}

function titleOf(html) {
  // arXiv's HTML5 pages do not carry `citation_*` meta tags (only the abs page
  // does), so the title has to come from `<title>` and the author list from the
  // `ltx_personname` spans. Reading it from meta alone left every real paper
  // titled with its own arXiv id.
  const meta = /<meta\s+name="citation_title"\s+content="([^"]*)"/i.exec(html)
  if (meta) return meta[1].replace(/&amp;/g, '&').replace(/&#34;/g, '"').trim()
  const tag = /<title>([\s\S]*?)<\/title>/i.exec(html)
  if (tag) return plainTextFromHtml(tag[1])
  return ''
}

function plainTextFromHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function authorsOf(html) {
  const clean = (name) =>
    plainTextFromHtml(name)
      // "Jiahang Lin *" — the asterisk marks equal contribution and is not part
      // of the name; leaving it in makes the identity look like a footnote.
      .replace(/[\s*†‡§¶]+$/u, '')
      .trim()
  const meta = [...html.matchAll(/<meta\s+name="citation_author"\s+content="([^"]*)"/gi)].map((m) => clean(m[1]))
  if (meta.filter(Boolean).length) return meta.filter(Boolean)
  return [...html.matchAll(/<span[^>]*class="[^"]*ltx_personname[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((m) => clean(m[1]))
    .filter(Boolean)
}

/**
 * Read one paper: sections, passages, a graded note. Never throws — a paper
 * that cannot be read is reported as a gap on the note, not as a crash.
 */
export function readPaper(id, html, terms) {
  const sections = splitSections(html)
  const notes = buildDeepNote({ paper: { id, title: titleOf(html) || id, authors: [] }, html, terms })
  const authors = authorsOf(html)
  notes.identity.authors = authors.length ? authors.slice(0, 6) : ['(author list not in the page)']
  const graded = gradeNote(notes)
  const passages = passagesWithLocators(html, terms)
  return {
    id,
    title: notes.identity.title,
    sections: sections.length,
    sectionList: sections.map((s) => s.locator),
    passages,
    note: notes,
    graded,
    ok: graded.ok,
  }
}

/**
 * Deposit one paper's reading: the body as a snapshot, then one claim per
 * passage that quotes it verbatim and carries its locator.
 *
 * Split out of `main` so a spec can run it against a temporary ledger — the
 * rule "no passage, no claim" is the one that decides whether a later
 * verification failure means a bad source or a bad reading, and it must be
 * testable without a network.
 */
export function writePaperToLedger(home, read, html, { maxClaims = 8 } = {}) {
  // The snapshot is the body text, not the HTML: a quote is a sentence, and
  // storing markup would make every quote a whitespace accident.
  const text = bodyText(html)
  const evidence = addEvidence(home, {
    origin: read.origin || `https://arxiv.org/html/${read.id}`,
    title: `${read.title || read.id} (arXiv HTML5, full body)`,
    content: text,
  })
  let registered = 0
  for (const passage of (read.passages || []).slice(0, maxClaims)) {
    const quote = passage.text.replace(/\s+/g, ' ')
    if (!quote.trim()) continue
    // A claim quotes the passage verbatim; the locator is where it lives.
    // Without both, `verifyClaim` would either reject the quote or accept a
    // sentence nobody can find again.
    try {
      addClaim(home, {
        text: `${read.title || read.id} — ${passage.locator}: ${quote.slice(0, 220)}`,
        evidenceIds: [evidence.id],
        quotes: [quote],
        locator: passage.locator,
        anchor: passage.anchor,
      })
      registered += 1
    } catch (err) {
      console.error(`claim skipped for ${read.id}: ${err?.message ?? err}`)
    }
  }
  return { evidenceId: evidence.id, bytes: evidence.bytes, claims: registered }
}

/** The document's own clock, in the timezone its filename is dated in. */
export function localStamp(at = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())} local`
}

export function renderDoc(result, { terms, generated, reading } = {}) {
  const lines = [
    '# Deep reading: what the bodies actually say',
    '',
    `Generated ${generated} by \`scripts/research-deepread.mjs\`.`,
    '',
    'Every quotation below was read out of the paper\'s arXiv HTML5 rendering, not its abstract,',
    'and carries the section a reader can open. A paper whose body could not be read says so;',
    'it is not silently missing.',
    '',
    `Terms used to select passages: ${terms.map((t) => `\`${t}\``).join(', ')}.`,
    '',
    '| paper | sections | passages | note |',
    '| --- | --- | --- | --- |',
  ]
  for (const paper of result.papers) {
    const state = paper.error ? `unread: ${paper.error}` : paper.ok ? 'graded ok (depth full)' : `findings: ${paper.graded.findings.map((f) => f.code).join(', ')}`
    lines.push(`| ${paper.title || paper.id} (\`${paper.id}\`) | ${paper.sections} | ${paper.passages.length} | ${state} |`)
  }
  lines.push('')
  for (const paper of result.papers) {
    lines.push(`## ${paper.title || paper.id} — \`${paper.id}\``, '')
    if (paper.error) { lines.push(`Not read: ${paper.error}`, ''); continue }
    if (!paper.passages.length) { lines.push('No body passage matched the terms. Nothing is claimed about this paper.', ''); continue }
    for (const passage of paper.passages) {
      lines.push(`- **${passage.locator}** (\`${passage.anchor}\`)`, '')
      const flat = passage.text.replace(/\s+/g, ' ')
      const shown = flat.length > 600 ? `${flat.slice(0, 600).trimEnd()}…` : flat
      lines.push(`  > ${shown}`, '')
    }
  }
  // The machine half above is generated; the half below is written by whoever
  // read it. Keeping them in one file is the point: a reader can check a
  // sentence in the judgement against the quotation it came from.
  if (typeof reading === 'string' && reading.trim()) {
    lines.push('---', '', reading.trim(), '')
  } else {
    lines.push('---', '', '_还没有人写的结论段：上面的引文是机器选的，不是判断。不要把它当结论用。_', '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

async function main(argv) {
  const args = parseArgs(argv)
  if (args.help || !args.ids.length) {
    console.log(usage())
    process.exitCode = args.help ? 0 : 2
    return
  }
  const home = args.home || join(homedir(), '.dsh', 'loom')
  const generated = localStamp()
  const result = { generated, terms: args.terms, papers: [] }

  for (const id of args.ids) {
    const body = await bodyFor(id)
    if (!body.html) {
      result.papers.push({ id, title: '', sections: 0, passages: [], error: body.error })
      continue
    }
    const read = readPaper(id, body.html, args.terms)
    const digest = createHash('sha256').update(body.html).digest('hex').slice(0, 16)
    result.papers.push({ ...read, cached: body.cached, sha256: digest, bytes: Buffer.byteLength(body.html, 'utf8'), origin: `https://arxiv.org/html/${id}` })

    if (args.ledger) {
      // The snapshot is the body text, not the HTML: a quote is a sentence, and
      // storing markup would make every quote a whitespace accident.
      read.ledger = writePaperToLedger(home, { ...read, origin: `https://arxiv.org/html/${id}` }, body.html)
    }
    console.error(`${id}: ${read.sections} section(s), ${read.passages.length} passage(s), note ${read.ok ? 'ok' : 'failed'}`)
  }

  if (args.out) {
    mkdirSync(dirname(resolve(args.out)), { recursive: true })
    writeFileSync(resolve(args.out), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    console.error(`wrote ${args.out}`)
  }
  if (args.doc) {
    mkdirSync(dirname(resolve(args.doc)), { recursive: true })
    const reading = args.reading && existsSync(resolve(args.reading)) ? readFileSync(resolve(args.reading), 'utf8') : ''
    writeFileSync(resolve(args.doc), renderDoc(result, { terms: args.terms, generated, reading }), 'utf8')
    console.error(`wrote ${args.doc}${reading ? '' : ' (no judgement section: pass --reading)'}`)
  }

  const failed = result.papers.filter((p) => p.error || !p.ok).length
  for (const paper of result.papers) {
    if (paper.error) { console.log(`${paper.id}\tunread\t${paper.error}`); continue }
    const line = renderNote(paper.graded).join(' | ')
    console.log(`${paper.id}\t${paper.passages.length} passages\t${line}`)
  }
  process.exitCode = failed === result.papers.length ? 1 : 0
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('research-deepread.mjs')
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err?.stack ?? String(err))
    process.exitCode = 1
  })
}
