// A sealed report says "this paragraph rests on c-4" or it says nothing at all.
//
// Measured over the 13 reports already in the ledger: 95 prose paragraphs, and
// 76 of them name no claim whatsoever. The other 19 all sit in one report where
// the ids were typed by hand. The renderer never wrote one, because
// `renderReport` (src/research/ledger.js:256) prints `cleanText(paragraph.text)`
// and never looks at `paragraph.claimIds` — the field is accepted by the seal
// schema (`src/tools/index.js` sections items are `additionalProperties: true`)
// and silently thrown away.
//
// The consequence is not cosmetic: a report can cite fourteen verified claims
// in a table at the bottom and argue something entirely different in the body,
// and nothing in the sealed bytes connects the two. Citation recall of 51.5%
// (`2304.09848` §1) is a number about generated sentences being *supported*;
// ours is currently a number about a table existing.
//
// So the first half of this fix is wiring, not counting: a paragraph that
// declares claims prints them, a paragraph that declares none stays exactly as
// written, and the renderer never invents a link by comparing words.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sealReport } from '../../src/research/ledger.js'

let passed = 0
let failed = 0
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-report-links-'))
const body = (dir) => readFileSync(join(dir, 'report.md'), 'utf8')
const prose = (text) => text.split('## Claims')[0]

{
  const sealed = sealReport(home, {
    topic: 'links-a',
    sections: [
      {
        heading: 'What the gate does',
        paragraphs: [
          { text: 'Two budgets, not one.', claimIds: ['c-1'] },
          { text: 'A refusal is a decision and is now recorded.', claimIds: ['c-2', 'c-3'] },
          { text: 'This sentence rests on nothing and says so by being silent.' },
        ],
      },
    ],
    claims: [
      { id: 'c-1', status: 'verified', text: 'Two budgets.', note: '1 quote' },
      { id: 'c-2', status: 'verified', text: 'A refusal is a decision.', note: '1 quote' },
      { id: 'c-3', status: 'verified', text: 'It is recorded.', note: '1 quote' },
    ],
  })
  const text = prose(body(sealed.dir))

  assert.match(text, /Two budgets, not one\.[^\n]*\[c-1\]/, 'a paragraph carries the id it declares')
  assert.match(text, /now recorded\.[^\n]*\[c-2, c-3\]/, 'two ids print in the order they were declared')
  assert.match(
    text,
    /rests on nothing and says so by being silent\.\n/,
    'a paragraph with no declared claim is left byte-identical, not decorated',
  )
  assert.doesNotMatch(text, /being silent[^\n]*\[/, 'no id is invented for a paragraph that declared none')
  const lines = text.split('\n').filter((line) => /\[c-/.test(line))
  assert.equal(lines.length, 2, 'exactly the two declaring paragraphs gained a marker')
  ok('a paragraph prints the claims it declares, and only those')
}

{
  // The marker is for a reader, not a parser: the sentence itself must stay
  // readable, so the ids go after the terminal punctuation on the same line.
  const sealed = sealReport(home, {
    topic: 'links-b',
    sections: [{ heading: 'H', paragraphs: [{ text: 'It ends with a question?', claimIds: ['c-9'] }] }],
    claims: [{ id: 'c-9', status: 'verified', text: 'x', note: '' }],
  })
  const line = prose(body(sealed.dir)).split('\n').find((l) => l.includes('question'))
  assert.equal(line, 'It ends with a question? [c-9]', 'the marker is appended, never spliced into the sentence')
  ok('the marker is appended to the paragraph, not spliced into it')
}

{
  // Non-string paragraph entries (a string instead of {text, claimIds}) must
  // keep working: the schema allows both, and a renderer that throws on the
  // older shape would make every existing caller a migration.
  const sealed = sealReport(home, {
    topic: 'links-c',
    sections: [{ heading: 'H', paragraphs: ['A bare string paragraph.'] }],
    claims: [],
  })
  assert.match(prose(body(sealed.dir)), /A bare string paragraph\.\n/)
  ok('a bare-string paragraph still renders unchanged')
}
