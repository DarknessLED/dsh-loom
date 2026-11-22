// Reading a paper's bibliography is the mirror image of following citations
// outward, and it has its own failure modes. Every one of them was hit for real
// while building `scripts/research-cites.mjs` against a 106-entry reference list
// that arrives as one line of fixed-width wrap:
//
//   * splitting on author blocks (`Given Surname,`) treats an initial
//     ("P. Chhikara,") as an entry start and hands a paper its neighbour's
//     arXiv id — the reason this script exists rather than a regex one-liner;
//   * an entry's tail can be a URL, a DOI, the id sentence, or nothing at all,
//     and the last two entries of a list usually have no id, so a splitter that
//     searches for the id lets them swallow the next entry;
//   * the wrap lands *inside* `https: //`, `arxiv.org/ abs/`, and the id
//     itself, so unwrapping is most of the work;
//   * the title and year must come from the arXiv page when we have one, never
//     from the reference line — the survey this was built for printed a
//     reworded title for a dozen entries.
//
// These are pinned here so the next person who simplifies the splitter finds
// out from a failing assertion instead of a quietly wrong citation table.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  inTextCounts,
  joinAbs,
  parseAbsPage,
  parseBibliography,
  renderDoc,
  splitReferences,
  summarize,
  unwrapReferences,
} from '../../scripts/research-cites.mjs'

function survey(referenceBody, body = 'Body.\n\nReferences\n') {
  return `# A survey\n\n${body}${referenceBody}\n`
}

test('an entry boundary is the year, not the author block', () => {
  // The trap: "P. Chhikara," looks exactly like "Pryzant, Dan Iter," to a
  // splitter that keys on a capitalized word followed by a comma.
  const flat = [
    'Reid Pryzant, Dan Iter, Jerry Li, and Michael Zeng. Automatic Prompt Optimization, 2023. URL https://arxiv.org/abs/2305.03495. arXiv preprint arXiv:2305.03495.',
    'P. Chhikara, J. Singh, and A. Kumar. LongMemEval: Benchmarking Memory, 2024. URL https://arxiv.org/abs/2410.10813. arXiv preprint arXiv:2410.10813.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  assert.equal(entries.length, 2)
  assert.equal(entries[0].arxivId, '2305.03495', 'the first entry keeps its own id')
  assert.equal(entries[1].arxivId, '2410.10813', 'the initial did not start a new entry')
})

test('a two-author entry is keyed by its first author, not its second', () => {
  // "David Silver and Richard Sutton" is cited as "(Silver and Sutton, 2025)".
  // Taking the last word of the author block gives a citation key that exists
  // nowhere in the prose and loses the most-cited entry in the list.
  const flat = 'David Silver and Richard Sutton. Welcome to the Era of Experience, 2025. URL https://example.com/paper.pdf.'
  const [entry] = parseBibliography(survey(flat))
  assert.equal(entry.surname, 'Silver')
  assert.equal(entry.arxivId, null)
})

test('a publisher tailer stays with the entry it closes', () => {
  // "Springer Nature Singapore." reads like a single-author block, and the
  // splitter that looks for the next name keeps it as the head of the entry
  // that follows — which then has a title starting with a publisher's name.
  const flat = [
    'Zhishuai Li, Xiang Wang, and Jingjing Zhao. A conference paper, 2026e. Springer Nature Singapore.',
    'Zhiwei Li and Yong Hu. SkillHone: A Harness for Continual Skill Evolution, 2026. URL https://arxiv.org/abs/2606.08671. arXiv preprint arXiv:2606.08671.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  assert.equal(entries.length, 2)
  assert.equal(entries[0].surname, 'Li')
  assert.equal(entries[0].arxivId, null, 'the tailer did not borrow the next id')
  assert.equal(entries[1].surname, 'Li')
  assert.match(entries[1].title, /^SkillHone/)
  assert.equal(entries[1].arxivId, '2606.08671')
})

test('a conference entry ending with a month and a year is still an entry boundary', () => {
  // "Miami, Florida, US, November 2024." has no comma before the year, so a
  // splitter keyed on ", 2024." runs this entry into the next one and gives the
  // proceedings paper its neighbour's arXiv id.
  const flat = [
    'Yilun Kong, Jingqing Ruan, and Xueqian Wang. TPTU-v2: Boosting task planning, in Proceedings of EMNLP: Industry Track, pages 371-385, Miami, Florida, US, November 2024. doi: 10.18653/v1/2024.emnlp-industry.27.',
    'Krista Opsahl-Ong, Michael J. Ryan, and Omar Khattab. Optimizing Instructions and Demonstrations, 2024. URL https://arxiv.org/abs/2406.11695. arXiv preprint arXiv:2406.11695.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  assert.equal(entries.length, 2, 'the proceedings entry did not swallow its neighbour')
  assert.equal(entries[0].surname, 'Kong')
  assert.equal(entries[0].arxivId, null, 'the proceedings paper has no arXiv id')
  assert.equal(entries[1].surname, 'Opsahl-Ong', 'a hyphenated surname survives')
  assert.equal(entries[1].arxivId, '2406.11695')
})

test('an entry with no id does not eat the entry after it', () => {
  // The last two entries of a real reference list are often a PDF and an
  // unpublished manuscript. A splitter that hunts for "arXiv preprint" runs
  // past them and merges the next author into their text.
  const flat = [
    'David Silver and Richard Sutton. Welcome to the Era of Experience, 2025. URL https://storage.googleapis.com/deepmind-media/paper.pdf.',
    'Junjie Li, Xi Xiao, and Yunbei Zhang. Agent harness engineering: a survey. Unpublished manuscript; locally available version, 2026b.',
    'Lakshya A. Agrawal, Shangyin Tan, and Dilara Soylu. GEPA: Reflective Prompt Evolution, 2025. URL https://arxiv.org/abs/2507.19457. arXiv preprint arXiv:2507.19457.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  assert.equal(entries.length, 3)
  assert.equal(entries[0].arxivId, null)
  assert.equal(entries[1].arxivId, null)
  assert.match(entries[1].surname, /Li/)
  assert.match(entries[1].title, /harness engineering/)
  assert.equal(entries[2].arxivId, '2507.19457')
  assert.match(entries[2].title, /^GEPA/)
})

test('the fixed-width wrap is rejoined inside schemes, paths, and ids', () => {
  const wrapped = [
    'Some Author. A wrapped entry, 2026.',
    'URL https: //arxiv.org/',
    'abs/2607.',
    '07663. arXiv preprint arXiv:2607.07663.',
  ].join('\n')
  const flat = unwrapReferences(survey(wrapped))
  assert.match(flat, /https:\/\/arxiv\.org\/abs\/2607\.07663/, 'scheme, path, and id wrap are all closed')
  const [entry] = parseBibliography(survey(wrapped))
  assert.equal(entry.arxivId, '2607.07663')
})

test('a bare page number and the running head are not entries', () => {
  const body = [
    'First Author. One, 2024. URL https://arxiv.org/abs/2401.00001. arXiv preprint arXiv:2401.00001.',
    '',
    '7',
    '',
    'When, Where, and How Experience Becomes Structure',
    '',
    'Second Author. Two, 2025. URL https://arxiv.org/abs/2501.00002. arXiv preprint arXiv:2501.00002.',
  ].join('\n')
  const entries = parseBibliography(survey(body))
  assert.equal(entries.length, 2)
  assert.deepEqual(entries.map((e) => e.arxivId), ['2401.00001', '2501.00002'])
  assert.match(entries[0].title, /^One$/)
})

test('only parenthesised groups count as citations', () => {
  // The survey discusses its sources in prose as well ("Yang et al. show
  // that..."). Counting every surname occurrence would inflate whichever work
  // the author argues with most.
  const body = [
    'Yang et al. show that instructions can be optimised. Yang et al. again.',
    'Work has compared these (Yang et al., 2023; Agrawal et al., 2025; Pryzant et al., 2023).',
    'Others add a second example (Yang et al., 2023).',
    'A single-name group (Smith, 2024a) and a repeated one (Smith, 2024a).',
  ].join('\n\n')
  const counts = inTextCounts(body)
  assert.equal(counts.get('Yang 2023'), 2, 'prose mentions are not citations')
  assert.equal(counts.get('Agrawal 2025'), 1)
  assert.equal(counts.get('Pryzant 2023'), 1)
  assert.equal(counts.get('Smith 2024a'), 2)
})

test('the arXiv page decides a title and a year, not the reference line', () => {
  // The reference line in the source survey was reworded for a dozen works;
  // the page is the record. When there is no page, the line is all we have and
  // the row must say so rather than look verified.
  const flat = [
    'Wujiang Xu, Zujie Liang, and K. Mei. Welcome to the Era of Experience, 2025. URL https://arxiv.org/abs/2502.12110. arXiv preprint arXiv:2502.12110.',
    'Nobody Known. A work with no page, 2024.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  const absById = new Map([
    ['2502.12110', { title: 'A-MEM: Agentic Memory for LLM Agents', date: '2026-02-11', authors: [], abstract: null }],
  ])
  const rows = joinAbs(entries, absById)
  assert.equal(rows[0].title, 'A-MEM: Agentic Memory for LLM Agents')
  assert.equal(rows[0].year, 2026)
  assert.equal(rows[0].titleFrom, 'arxiv')
  assert.equal(rows[1].titleFrom, 'reference', 'an unverified row says where its title came from')
  assert.equal(rows[1].year, 2024)
})

test('the summary separates "in the bibliography" from "used as a foil"', () => {
  const flat = [
    'Aaa Bbb. Alpha work, 2024. URL https://arxiv.org/abs/2401.00001. arXiv preprint arXiv:2401.00001.',
    'Ccc Ddd. Beta work, 2025. URL https://arxiv.org/abs/2501.00002. arXiv preprint arXiv:2501.00002.',
    'Eee Fff. Gamma work with no id, 2023.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  const rows = joinAbs(entries, new Map())
  const body = 'Compare (Bbb et al., 2024; Bbb et al., 2024) and maybe (Mystery, 2022).'
  const summary = summarize(rows, inTextCounts(body))
  assert.equal(summary.counts.entries, 3)
  assert.equal(summary.counts.withArxivId, 2)
  assert.equal(summary.counts.neverCited, 2)
  assert.deepEqual(summary.top.map((row) => row.key), ['Bbb 2024'])
  assert.deepEqual(summary.unmatched, ['Mystery 2022'], 'an unmatched key is reported, not dropped')
  assert.match(renderDoc({ title: 'T', source: 's', summary, reading: 'READING', date: '2026-11-23' }), /READING/)
})

test('a document with no reference list is empty, not an exception', () => {
  assert.deepEqual(parseBibliography('# nothing here\n\njust prose\n'), [])
  assert.equal(unwrapReferences('no references section'), '')
  assert.deepEqual(splitReferences(''), [])
})

test('an abstract page without citation metadata is not a record', () => {
  assert.equal(parseAbsPage('<html><body>nothing</body></html>'), null)
  const record = parseAbsPage(
    '<meta name="citation_title" content="A Title">' +
      '<meta name="citation_date" content="2026/11/04">' +
      '<meta name="citation_author" content="First Author">' +
      '<meta name="citation_author" content="Second Author">' +
      '<blockquote class="abstract mathjax">We study &amp; report.</blockquote>',
  )
  assert.equal(record.title, 'A Title')
  assert.equal(record.authors.length, 2)
  assert.equal(record.abstract, 'We study & report.')
})

test('two works sharing a surname and year are not both credited with its citations', () => {
  // "Xu et al., 2026" appears in the prose, and the bibliography holds two
  // different 2026 works by an author named Xu. Attributing the count to both
  // rows would make the reference list claim six citations where the prose has
  // three, and would let either row top the "most used as a foil" table on
  // evidence that belongs to neither.
  const flat = [
    'Renjun Xu and Yang Yan. Agent Skills for Large Language Models, 2026. URL https://arxiv.org/abs/2602.12430. arXiv preprint arXiv:2602.12430.',
    'Ruiyao Xu, Yanfei Chen, and Tomas Pfister. Harness Squared, 2026. URL https://arxiv.org/abs/2610.14224. arXiv preprint arXiv:2610.14224.',
    'Lakshya A. Agrawal, Shangyin Tan, and Dilara Soylu. GEPA, 2025. URL https://arxiv.org/abs/2507.19457. arXiv preprint arXiv:2507.19457.',
  ].join(' ')
  const entries = parseBibliography(survey(flat))
  const rows = joinAbs(entries, new Map())
  const summary = summarize(rows, inTextCounts('Cited (Xu et al., 2026; Xu et al., 2026; Agrawal et al., 2025).'))
  const xu = summary.rows.filter((row) => row.key === 'Xu 2026')
  assert.equal(xu.length, 2)
  assert.deepEqual(xu.map((row) => row.ambiguous), [true, true], 'both rows carry the ambiguity')
  assert.equal(xu[0].inText, null, 'an ambiguous key has no attributable count')
  assert.deepEqual(summary.counts.ambiguousKeys, ['Xu 2026'], 'the collision is reported, not silently resolved')
  assert.equal(summary.counts.inTextOccurrences, 1, 'only the unambiguous citation is counted')
  assert.equal(summary.counts.neverCited, 0, 'an ambiguous work is not called uncited')
  assert.ok(!summary.top.some((row) => row.key === 'Xu 2026'), 'an ambiguous work cannot top the foil table')
  assert.match(renderDoc({ title: 'T', source: 's', summary, reading: 'R', date: '2026-11-23' }), /Xu 2026/)
})

test('a title from the page is decoded, not shipped with entity escapes', () => {
  // arXiv wraps quotes in the title metadata as &#34; and, for some papers,
  // escapes the ampersand of that entity (G\&#34;odel). Copying the raw attribute
  // puts "TextGrad: Automatic &#34;Differentiation&#34; via Text" in the table,
  // which reads like a broken bibliography rather than a decoded title.
  const plain = parseAbsPage('<meta name="citation_title" content="TextGrad: Automatic &#34;Differentiation&#34; via Text">')
  assert.equal(plain.title, 'TextGrad: Automatic "Differentiation" via Text')
  const escaped = parseAbsPage('<meta name="citation_title" content="G\\&#34;odel Agent: A Self-Referential Agent Framework">')
  assert.equal(escaped.title, 'G"odel Agent: A Self-Referential Agent Framework')
  const numeric = parseAbsPage('<meta name="citation_title" content="A &#x2019;quoted&#x2019; title &amp; more">')
  assert.equal(numeric.title, 'A \u2019quoted\u2019 title & more')
})

test('a conference entry title stops at the sentence, not at the editors', () => {
  // "Pet-sql: A prompt-enhanced two-round refinement of text-to-sql with
  // cross-consistency. In Feida Zhu, ... editors, Database Systems for Advanced
  // Applications, pages 193-208, Singapore, 2026e." — the title is the first
  // sentence. Running it to the citation year puts the editors' names in the
  // title column and makes the row unreadable.
  const flat =
    'Zhishuai Li, Xiang Wang, and Jingjing Zhao. Pet-sql: A prompt-enhanced two-round refinement of text-to-sql with cross-consistency. In Feida Zhu, Philip S. Yu, and Bingxue Zhang, editors, Database Systems for Advanced Applications, pages 193-208, Singapore, 2026e.'
  const [entry] = parseBibliography(survey(flat))
  assert.equal(entry.surname, 'Li')
  assert.equal(entry.letter, 'e')
  assert.match(entry.title, /^Pet-sql: /)
  assert.doesNotMatch(entry.title, /editors|pages 193/, 'the container is not part of the title')
})
