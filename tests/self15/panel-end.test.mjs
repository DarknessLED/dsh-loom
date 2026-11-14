/**
 * Spec: a stopped campaign says why it stopped.
 *
 * 26 of 82 campaigns ended without an incumbent, and the panel showed them as
 * `已停止` with a round count — a status, not a verdict. A reader cannot tell
 * "it finished" from "it ran out of budget" from "the worker never started",
 * so the same questions were re-asked in the chat that the ledger already
 * answered.
 *
 * `describeEnd` (src/report/end.js) answers it as data. The panel owes the
 * reader the same answer as a line: `endNote(campaign)` returns null while
 * there is nothing to say, and a sentence naming the cause once the campaign
 * has stopped.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = join(here, '..', '..', 'client', 'index.js')

function loadClient() {
  const source = readFileSync(clientPath, 'utf8')
  let captured = null
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        captured = {
          id,
          exports: factory((name) => {
            if (name !== 'react') throw new Error(`unexpected require: ${name}`)
            return {
              createElement: () => null,
              useState: (v) => [v, () => {}],
              useEffect: () => {},
              useCallback: (f) => f,
            }
          }),
        }
      },
    },
  }
  // eslint-disable-next-line no-new-func
  new Function('window', source)(window)
  assert.ok(captured, 'the bundle registers itself with the module loader')
  return captured.exports
}

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const client = loadClient()
const panel = client.__panel

test('a running campaign has no verdict to show', () => {
  assert.equal(panel.endNote({ id: 'a', status: 'running', end: null }), null)
  assert.equal(panel.endNote({ id: 'a', status: 'running' }), null)
})

test('a stopped campaign shows the cause the report recorded', () => {
  const note = panel.endNote({
    id: 'a',
    status: 'stopped',
    end: { status: 'stopped', cause: 'no-incumbent', headline: '三轮全死于 spawn，没有留下可比的分数' },
  })
  assert.equal(typeof note, 'string')
  assert.match(note, /spawn/, 'the headline reaches the panel verbatim')
})

test('an ending with only a cause still says something', () => {
  const note = panel.endNote({
    id: 'a',
    status: 'stopped',
    end: { status: 'stopped', cause: 'budget', headline: '' },
  })
  assert.equal(typeof note, 'string')
  assert.ok(note.length > 0, 'a missing headline is not a silent row')
  assert.match(note, /预算|budget|budget/i)
})

console.log(`${passed} passed`)
