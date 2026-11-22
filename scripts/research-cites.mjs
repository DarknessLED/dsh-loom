#!/usr/bin/env node
// Read a survey paper's own bibliography and say what it is built out of.
//
// `research-survey.mjs` starts from a topic and follows citations outward. This
// script starts from one paper and goes the other way: it parses that paper's
// reference list and its in-text citation groups, then reports the year spread,
// the topic mix, and which works the prose keeps coming back to.
//
// Two rules make the numbers checkable instead of decorative:
//
//   * a work's title and year come from the arXiv abstract page when we have
//     it, never from the survey's own reference line — preprint references get
//     reworded and, in the paper this was built for, a dozen id/title pairs in
//     the extracted list did not match the pages they pointed at;
//   * in-text counts only look inside parenthesised citation groups, so a
//     surname that also appears as prose ("Yang et al. show...") is not a
//     citation.
//
//   node scripts/research-cites.mjs <survey.md> --slug r9-rsi-survey \
//        [--abs .tmp/abs] [--doc docs/research/r9-rsi-survey-2026-11-23.md] \
//        [--reading directions/r9-rsi-survey.reading.md]

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const ARXIV_ID = String.raw`\d{4}\.\d{4,5}`
// A reference list is one long line after unwrapping, so the boundary is the
// pattern each entry ends with: ", Year." and, when it has one, the
// "arXiv preprint arXiv:ID." sentence. Splitting on author blocks instead
// mistakes initials ("P. Chhikara,") for entry starts and hands a paper its
// neighbour's id — the exact error this script exists to avoid.
// The `g` flag is load-bearing: `exec` ignores `lastIndex` without it, so the
// loop below would re-find the first year forever.
// Conference proceedings end with a date ("Miami, Florida, US, November 2024.")
// rather than with ", 2024.", so the month name is a separator in its own
// right. Without it an ACL-style entry runs on into its neighbour and hands
// that neighbour's arXiv id to the wrong paper.
const YEAR_END = String.raw`(?:,|\b(?:January|February|March|April|May|June|July|August|September|October|November|December))\s*((?:19|20)\d{2})([a-z]?)\.`
const ENTRY_END = new RegExp(YEAR_END, 'g')

// Rejoining the fixed-width wrap is most of the work in reading a reference
// list. Everything below assumes one line.
export function unwrapReferences(text) {
  const at = text.lastIndexOf('\nReferences\n')
  if (at < 0) return ''
  let body = text.slice(at + '\nReferences\n'.length)
  // Page furniture: a bare page number, and the running head the .md repeats.
  body = body
    .split('\n')
    .filter((line) => !/^\s*\d{1,3}\s*$/.test(line))
    .filter((line) => !/^When, Where, and How Experience Becomes Structure/.test(line.trim()))
    .join('\n')
  body = body.replace(/\n/g, ' ')
  // A wrapped id ("arxiv.org/abs/2607.\n07663") is one token; so is a URL whose
  // wrap landed before "abs/".
  // The wrap also lands after the scheme ("https: //arxiv.org/..."), and a
  // URL with a space in it stops being one token for every rule below.
  body = body.replace(/(https?):\s+\/\//g, '$1://')
  body = body.replace(/(\d{4}\.)\s+(\d{4,5})/g, '$1$2')
  body = body.replace(/arxiv\.org\/\s+abs\/\s*(\d)/g, 'arxiv.org/abs/$1')
  body = body.replace(/\babs\/\s+(\d)/g, 'abs/$1')
  // A hyphen at the end of a line is a broken word, not a hyphen.
  body = body.replace(/([a-z])-\s+([a-z])/g, '$1$2')
  return body.replace(/\s+/g, ' ').trim()
}

// An entry start is an author list: a name followed by a comma, by "and", or by
// the period that closes a single-author block ("Yi Duan, ", "Zhiwei Li and Yong
// Hu.", "Y. Zhang, Wei Song,", "Second Author. "). Publisher tailers that the
// list leaves after a year ("Springer Nature Singapore.") match the bare name
// shape too, so a candidate only counts when it either carries a comma or an
// "and", or is followed by a title and a year before the next candidate. That
// second clause is what keeps single-author entries and rejects tailers.
const NAME = String.raw`(?:[A-Z]\.\s+)*[A-Z][A-Za-z'\u2019\-]+(?:\s+(?:[A-Z]\.\s+)*[A-Z][A-Za-z'\u2019\-]+)*(?:\s*,\s*|\s+and\b|\s*\.\s)`
const ENTRY_YEAR = new RegExp(String.raw`,\s*(?:19|20)\d{2}[a-z]?\.`)

function nextAuthorStart(text) {
  const pattern = new RegExp(NAME, 'g')
  let candidate = pattern.exec(text)
  while (candidate) {
    const head = candidate[0]
    const rest = text.slice(candidate.index + head.length)
    const nextAt = (() => {
      const probe = new RegExp(NAME, 'g')
      probe.lastIndex = candidate.index + head.length
      const next = probe.exec(text)
      return next ? next.index : text.length
    })()
    const shaped = /,|\band\b/.test(head)
    const closesAnEntry = ENTRY_YEAR.test(text.slice(candidate.index + head.length, nextAt))
    if (shaped || closesAnEntry) return candidate.index
    pattern.lastIndex = nextAt
    candidate = pattern.exec(text)
  }
  return -1
}

export function splitReferences(flat) {
  if (!flat) return []
  const chunks = []
  let cursor = 0
  for (const year of flat.matchAll(ENTRY_END)) {
    const afterYear = year.index + year[0].length
    // Everything between this entry's year and the next entry's first author
    // — the URL, the DOI, the id sentence, and any publisher tailer — belongs
    // to this entry. The last entries of a list often have no id at all, so
    // searching for the id instead of the next name cuts them in the middle.
    const ahead = flat.slice(afterYear, afterYear + 400)
    const gap = nextAuthorStart(ahead)
    const stop = gap < 0 ? flat.length : afterYear + gap
    chunks.push(flat.slice(cursor, stop).trim())
    cursor = stop
    if (stop >= flat.length) break
  }
  if (cursor < flat.length) chunks.push(flat.slice(cursor).trim())
  // A chunk that carries no year at all is page furniture that slipped past
  // unwrapping; anything with a year is an entry, however its year is written.
  return chunks.filter((chunk) => chunk && new RegExp(YEAR_END).test(chunk))
}

// The author block ends at the first sentence break whose preceding token is
// not a one-letter initial. Writing this as a regex over the whole prefix is
// what got "Aaa Bbb. Alpha work, 2024" wrong: with no comma in the name there
// is no author list to key on, and the surname came out as the last word of the
// title. Skipping "A." style tokens keeps "Lakshya A. Agrawal, ..." intact.
function authorBlockEnd(piece) {
  const dot = /\.\s/g
  let match = dot.exec(piece)
  while (match) {
    const before = piece.slice(Math.max(0, match.index - 12), match.index)
    const word = (before.match(/([A-Za-z][A-Za-z'’\-]*)$/) || [])[1] ?? ''
    if (!/^[A-Z]$/.test(word)) return match.index + 1
    match = dot.exec(piece)
  }
  return 0
}

function letterBetween(text, from) {
  // "https://arxiv.org/abs/2607.07663" contains ids, not years; a bare year in
  // a title ("Scaling Laws for Reward Model Overoptimization, 2023") is also not
  // the entry boundary unless it is the last one.
  const pattern = new RegExp(YEAR_END, 'g')
  let best = null
  for (const hit of text.matchAll(pattern)) best = hit
  return best && best.index >= from ? best : null
}

export function parseBibliography(text) {
  const flat = unwrapReferences(text)
  if (!flat) return []
  const pieces = splitReferences(flat)

  const entries = []
  for (const piece of pieces) {
    const arxivId = (piece.match(new RegExp(String.raw`arXiv preprint arXiv:(${ARXIV_ID})`)) || [])[1]
      ?? (piece.match(new RegExp(String.raw`arxiv\.org\/abs\/(${ARXIV_ID})`)) || [])[1]
      ?? null
    const blockEnd = authorBlockEnd(piece)
    const authorsPart = piece.slice(0, blockEnd).replace(/\.$/, '').trim()
    const cited = letterBetween(piece, blockEnd)
    let title = cited ? piece.slice(blockEnd, cited.index).replace(/^[\s.]+/, '').trim() : ''
    // A conference entry carries its container after the title ("... with
    // cross-consistency. In Feida Zhu, ... editors, Database Systems, pages
    // 193-208, Singapore, 2026e."). The title is the first sentence; keeping the
    // rest puts editors, page ranges and cities in the title column.
    const container = title.match(/\s+In\s+[A-Z]/)
    if (container) title = title.slice(0, container.index).trim()
    // The first author ends at the first comma (or at "and", for a two-author
    // entry: "David Silver and Richard Sutton" is cited as Silver alone), and
    // the surname is its last word: "Lakshya A. Agrawal" -> "Agrawal".
    const firstAuthor = (authorsPart.split(',')[0] ?? '')
      .replace(/\bet al\.?$/i, '')
      .split(/\s+and\s+/)[0]
      .trim()
    const words = firstAuthor.split(/\s+/).filter(Boolean)
    const surname = words.length ? words[words.length - 1].replace(/\.$/, '') : ''
    entries.push({
      surname,
      year: cited ? cited[1] : '',
      letter: cited?.[2] ?? '',
      arxivId,
      title: title.replace(/\s+/g, ' '),
      raw: piece.trim(),
    })
  }
  return entries
}

// Only parenthesised groups count. The survey writes "(Yang et al., 2023)" and
// "(Agrawal et al., 2025; Pryzant et al., 2023)"; prose names are not citations.
export function inTextCounts(body) {
  const counts = new Map()
  for (const group of body.matchAll(/\(([^()]{0,240}?(?:19|20)\d{2}[a-z]?[^()]{0,240}?)\)/g)) {
    for (const part of group[1].split(';')) {
      const hit = part.match(/([A-Z][A-Za-z'’\-]+)(?:\s+(?:et al\.?|&\s*[A-Z][A-Za-z'’\-]+|and\s+[A-Z][A-Za-z'’\-]+))?\s*,\s*((?:19|20)\d{2})([a-z])?/)
      if (!hit) continue
      const key = `${hit[1]} ${hit[2]}${hit[3] ?? ''}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

// Attributes arrive HTML-escaped, and arXiv double-escapes the quotes it uses
// in titles ("G\&#34;odel"). Decoding twice, innermost first, is what turns
// that back into the title a reader expects.
export function decodeEntities(text) {
  if (typeof text !== 'string') return text
  let out = text
  for (let pass = 0; pass < 2; pass += 1) {
    out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
      if (body[0] === '#') {
        const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
      }
      const named = NAMED[body.toLowerCase()]
      return named === undefined ? whole : named
    })
  }
  return out
}

export function parseAbsPage(html) {
  const meta = (name) => {
    const raw = (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1]
    if (raw === undefined) return null
    // arXiv's LaTeX pipeline writes an escaped quote as \&#34;, so decoding
    // the entity leaves a stray backslash in front of it.
    return decodeEntities(raw).replace(/\\(["'])/g, '$1')
  }
  const authors = [...html.matchAll(/<meta name="citation_author" content="([^"]*)"/g)].map((m) => m[1])
  const title = meta('citation_title')
  const date = meta('citation_date')
  const abstractBlock = html.match(/<blockquote class="abstract[^"]*">([\s\S]*?)<\/blockquote>/)
  const abstract = abstractBlock
    ? decodeEntities(abstractBlock[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    : null
  return title ? { title, date, authors, abstract } : null
}

export function joinAbs(entries, absById) {
  const rows = entries.map((entry) => {
    const abs = entry.arxivId ? absById.get(entry.arxivId) : null
    // The page wins over the reference line, and it keeps the raw line so a
    // reader can see what the survey actually printed.
    return {
      key: `${entry.surname} ${entry.year}${entry.letter}`.trim(),
      surname: entry.surname,
      year: Number(abs?.date?.slice(0, 4) ?? entry.year) || null,
      letter: entry.letter,
      arxivId: entry.arxivId,
      title: (abs?.title ?? entry.title).replace(/^\.\s*/, '').trim(),
      date: abs?.date ?? null,
      titleFrom: abs ? 'arxiv' : 'reference',
    }
  })
  return rows
}

function topicOf(title) {
  const t = title.toLowerCase()
  if (/harness/.test(t)) return 'harness'
  if (/skill/.test(t)) return 'skill'
  if (/memor|memgpt|mem0|a-mem|ze[p]?\b|remember/.test(t)) return 'memory'
  if (/prompt/.test(t)) return 'prompt'
  if (/survey|review|landscape|overview/.test(t)) return 'survey'
  if (/inject|attack|security|guard|adversarial|safety/.test(t)) return 'security'
  if (/bench|evaluat|test/.test(t)) return 'benchmark'
  if (/self-improv|self-evolv|recursive|g[oö]del|meta-evol|self-refin|self-modif|self-rewrit/.test(t)) return 'rsi'
  return 'other'
}

export function summarize(rows, counts) {
  const byYear = {}
  for (const row of rows) if (row.year) byYear[row.year] = (byYear[row.year] ?? 0) + 1
  const byTopic = {}
  for (const row of rows) {
    const topic = topicOf(row.title)
    byTopic[topic] = (byTopic[topic] ?? 0) + 1
  }

  // Attribution runs from the citation key to the row, not the other way round,
  // because a key is what the prose actually said. "Xu et al., 2026" with two
  // 2026 Xu papers in the list names neither of them; crediting both invents a
  // citation, and calling both unread drops a real one. A key that resolves to
  // exactly one row is credited; any other is reported as unattributable and
  // kept out of the totals and the foil table.
  const candidatesFor = (key) => {
    const space = key.lastIndexOf(' ')
    if (space < 0) return []
    const surname = key.slice(0, space)
    const stamp = key.slice(space + 1).match(/^(\d{4})([a-z]?)$/)
    if (!stamp) return []
    const [, year, letter] = stamp
    return rows.filter(
      (row) => row.surname === surname && String(row.year) === year && (!letter || row.letter === letter),
    )
  }
  const credited = new Map()
  const ambiguousKeys = []
  const ambiguousGroups = []
  const unmatched = []
  for (const [key, n] of counts) {
    const candidates = candidatesFor(key)
    if (candidates.length === 1) {
      credited.set(candidates[0].key, (credited.get(candidates[0].key) ?? 0) + n)
    } else if (candidates.length > 1) {
      ambiguousKeys.push(key)
      ambiguousGroups.push({ key, works: candidates.map((row) => ({ key: row.key, title: row.title, arxivId: row.arxivId })) })
      for (const row of candidates) credited.set(row.key, credited.get(row.key) ?? null)
    } else {
      unmatched.push(key)
    }
  }
  const cited = rows.map((row) => {
    const share = credited.has(row.key) ? credited.get(row.key) : 0
    return { ...row, inText: share, ambiguous: share === null }
  })
  const attributable = cited.filter((row) => typeof row.inText === 'number')
  return {
    rows: cited,
    byYear,
    byTopic,
    counts: {
      entries: rows.length,
      withArxivId: rows.filter((row) => row.arxivId).length,
      titledByArxiv: rows.filter((row) => row.titleFrom === 'arxiv').length,
      inTextKeys: counts.size,
      matchedKeys: [...counts.keys()].length - unmatched.length - ambiguousKeys.length,
      unmatchedKeys: unmatched.length,
      inTextOccurrences: attributable.reduce((sum, row) => sum + row.inText, 0),
      neverCited: attributable.filter((row) => !row.inText).length,
      ambiguousKeys,
      ambiguousGroups,
    },
    unmatched,
    top: [...attributable].sort((a, b) => b.inText - a.inText).filter((row) => row.inText).slice(0, 15),
    uncited: attributable.filter((row) => !row.inText),
  }
}

export function renderDoc({ title, source, summary, reading, date, sha256, bytes, command }) {
  const lines = [
    `# ${title}`,
    '',
    `> 自动生成于 ${date}，来源 ${source}。数字全部由 \`scripts/research-cites.mjs\` 从该文的参考文献与正文引用括号算出，结论段是手写的，两者用 \`---\` 分开。`,
    '',
    ...(sha256 || bytes
      ? [
          `**这份输入是什么。** ${bytes ? `${bytes} 字节，` : ''}${sha256 ? `sha256 \`${sha256}\`，` : ''}不随仓库入库。要复算，重新取到同一份文本（同一 URL 的同一版本）后比对哈希，再跑：`,
          '',
          '```',
          command ?? 'node scripts/research-cites.mjs <survey.md> --slug <slug> --abs <abs-dir>',
          '```',
          '',
          '哈希对不上说明拿到的是另一个版本，表里的数字与结论都不再适用于这份输入。',
          '',
        ]
      : []),
    '## 这篇的文字规模',
    '',
    '| 项 | 数量 |',
    '| --- | --- |',
    `| 参考文献条目 | ${summary.counts.entries} |`,
    `| 带 arXiv id | ${summary.counts.withArxivId} |`,
    `| 标题经 arXiv 摘要页校正 | ${summary.counts.titledByArxiv} |`,
    `| 正文不同的引用 key | ${summary.counts.inTextKeys} |`,
    `| 其中能对上书目条目 | ${summary.counts.matchedKeys} |`,
    `| 正文引用次数（括号内） | ${summary.counts.inTextOccurrences} |`,
    `| 书目里从未被正文引用 | ${summary.counts.neverCited} |`,
    ...(summary.counts.ambiguousKeys.length ? [`| 姓氏+年份撞车、无法归属的 key | ${summary.counts.ambiguousKeys.length} |`] : []),
    '',
    '**怎么读这张表。** “正文引用次数”只数括号引用组里的出现，不数正文散文里提到的名字；所以它衡量的是“这篇综述把它当作对照对象反复拿来讨论的程度”，不是全领域被引数。标题与年份以 arXiv 摘要页为准：预印本参考文献里的标题常被改写或压缩，摘要页是记录。两篇同名同年的工作会让一个引用 key 无法归属，这类 key 单列在下面，不进总数。',
    '',
    '## 年份分布',
    '',
    '| 年 | 条目 |',
    '| --- | --- |',
    ...Object.entries(summary.byYear).sort().map(([year, n]) => `| ${year} | ${n} |`),
    '',
    '## 主题分布（按标题关键词，一件工作只归一类）',
    '',
    '| 类 | 条目 |',
    '| --- | --- |',
    ...Object.entries(summary.byTopic).sort((a, b) => b[1] - a[1]).map(([topic, n]) => `| ${topic} | ${n} |`),
    '',
    '## 被正文反复拿来对照的工作',
    '',
    '| 括号引用 | key | 年 | 工作 | arXiv |',
    '| --- | --- | --- | --- | --- |',
    ...summary.top.map((row) => `| ${row.inText} | ${row.key} | ${row.year ?? '—'} | ${row.title || '—'} | ${row.arxivId ? `[${row.arxivId}](https://arxiv.org/abs/${row.arxivId})` : '—'} |`),
    '',
    ...(summary.counts.ambiguousKeys.length
      ? [
          '**姓氏+年份撞车。** 下面这些 key 在正文里出现过，但书目里有不止一篇同名同年的工作，所以既不能把它们算给任何一行，也不能说它们没被引用 —— 它们被单独放在这里，归属留给读过的人判断：',
          '',
          ...summary.counts.ambiguousGroups.map(
            ({ key, works }) => `- \`${key}\` → ${works.map((work) => `${work.title || work.key}${work.arxivId ? ` (${work.arxivId})` : ''}`).join(' / ')}`,
          ),
          '',
        ]
      : []),
    '## 只在书目里、正文没引',
    '',
    ...(summary.uncited.length
      ? summary.uncited.map((row) => `- ${row.key} · ${row.title || '（无标题）'}${row.arxivId ? ` · [arXiv:${row.arxivId}](https://arxiv.org/abs/${row.arxivId})` : ''}`)
      : ['_（没有：每条书目都在正文里被引过）_']),
    '',
    ...(summary.unmatched.length
      ? ['## 正文里有、书目对不上（姓氏+年份有歧义）', '', ...summary.unmatched.map((key) => `- ${key}`), '']
      : []),
    '---',
    '',
    (reading ?? '').trim(),
    '',
  ]
  return `${lines.join('\n').trimEnd()}\n`
}

function main() {
  const args = process.argv.slice(2)
  const flag = (name) => {
    const at = args.indexOf(name)
    return at >= 0 ? args.splice(at, 2)[1] : null
  }
  const slug = flag('--slug')
  const absDir = flag('--abs')
  const docPath = flag('--doc')
  const readingPath = flag('--reading')
  const titleFlag = flag('--title')
  const sourceFlag = flag('--source')
  const dateFlag = flag('--date')
  const outPath = flag('--out') ?? (slug ? `research/out/${slug}.refs.json` : null)
  const input = args[0]
  if (!input) {
    console.error('usage: node scripts/research-cites.mjs <survey.md> --slug <slug> [--abs <dir>] [--doc <path>] [--reading <path>]')
    process.exit(2)
  }

  const text = readFileSync(input, 'utf8')
  const entries = parseBibliography(text)
  if (!entries.length) {
    console.error(`no reference list found in ${input}`)
    process.exit(1)
  }

  const absById = new Map()
  if (absDir && existsSync(absDir)) {
    for (const name of readdirSync(absDir)) {
      if (!name.endsWith('.html')) continue
      const parsed = parseAbsPage(readFileSync(join(absDir, name), 'utf8'))
      if (parsed) absById.set(name.replace(/\.html$/, ''), parsed)
    }
  }

  const rows = joinAbs(entries, absById)
  // The body is everything before the reference list; that is where citations live.
  const body = text.slice(0, text.lastIndexOf('\nReferences\n'))
  const summary = summarize(rows, inTextCounts(body))

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(
      outPath,
      `${JSON.stringify({ source: { file: input, bytes: text.length }, counts: summary.counts, byYear: summary.byYear, byTopic: summary.byTopic, datasets: summary.rows }, null, 1)}\n`,
    )
  }

  if (docPath) {
    const reading = readingPath && existsSync(readingPath) ? readFileSync(readingPath, 'utf8') : null
    // A plain-text export of a paper rarely opens with its own title as a
    // markdown heading (the alphaXiv export opens with an extraction note), so
    // the caller passes the real title in rather than getting "keep source +
    // user id" printed as the document heading.
    const title = titleFlag ?? slug ?? input
    mkdirSync(dirname(docPath), { recursive: true })
    writeFileSync(
      docPath,
      renderDoc({
        title,
        source: sourceFlag ?? `\`${input}\``,
        summary,
        reading: reading ?? '_（还没有人写的结论段。这张表只说明数字，不要把它当结论用。）_',
        date: dateFlag ?? new Date().toLocaleDateString('en-CA'),
        sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
        bytes: Buffer.byteLength(text, 'utf8'),
        command: `node scripts/research-cites.mjs ${input} --slug ${slug ?? '<slug>'}${absDir ? ` --abs ${absDir}` : ''} --doc ${docPath}`,
      }),
    )
  }

  const c = summary.counts
  console.log(
    `${c.entries} entries | ${c.withArxivId} with arXiv id | ${c.titledByArxiv} titles from arXiv | ` +
      `${c.inTextKeys} in-text keys (${c.matchedKeys} matched) | ${c.neverCited} never cited`,
  )
  if (summary.unmatched.length) console.log(`unmatched: ${summary.unmatched.join(', ')}`)
  for (const row of summary.top.slice(0, 10)) console.log(` ${String(row.inText).padStart(2)}x ${row.key} ${row.arxivId ?? '-'} ${row.title.slice(0, 60)}`)
  if (docPath) console.log(`doc ${docPath}`)
  if (outPath) console.log(`data ${outPath}`)
}

const invokedDirectly = process.argv[1] && /research-cites\.mjs$/.test(process.argv[1])
if (invokedDirectly) main()
