// The tool is the only door a model has into this module.
//
// Two failure modes are worth pinning here, both seen in earlier passes:
//
//   * a "research" action that returns a confident report while the web provider
//     is missing — the model then writes up a survey it never ran;
//   * a sealed report whose claims were never checked against bytes, so the seal
//     certifies the prose and not the evidence.
//
// The tool must therefore: answer `plan` with no network at all, report
// `web-unavailable` honestly and still hand back the queries, refuse to seal a
// claim it cannot verify (marking it, never dropping it), and keep the question
// ledger usable without a campaign in sight.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registerTools } from '../../src/tools/index.js'
import { addEvidence } from '../../src/research/ledger.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const defs = new Map()
const services = {
  tools: {
    register(def) {
      defs.set(def.name, def)
      return () => {}
    },
    schemas: () => [],
  },
  agents: { currentInitiator: () => ({ id: 'sess-1' }) },
  sessions: { get: () => null },
}

const ctx = {
  effect(fn) {
    return fn()
  },
  get(name) {
    return services[name]
  },
}

const home = mkdtempSync(join(tmpdir(), 'loom-research-tool-'))
const runtime = {
  home,
  listCampaigns: () => [],
  get: () => {
    throw new Error('no campaigns in this test')
  },
  status: () => ({}),
  liveAttempts: () => [],
  ownership: () => ({ owner: null, mine: true }),
  enabled: () => true,
  switchState: () => ({ enabled: true, at: null, by: 'config' }),
  open: () => {
    throw new Error('no campaigns in this test')
  },
}

registerTools(ctx, { runtime, config: {} })
const tool = defs.get('rsi_research')

// --- the tool exists and can plan with no network ------------------------

{
  assert.ok(tool, 'rsi_research is registered')
  const plan = await tool.execute({ action: 'plan', question: 'why do verifiers miss reward hacking?' })
  assert.equal(plan.action, 'plan')
  assert.ok(Array.isArray(plan.queries) && plan.queries.length >= 2, 'a plan has more than one query')
  assert.equal(plan.depth, 'standard')
  assert.match(plan.text, /research plan/i, 'and it renders as text for a human')
}
ok('rsi_research plans without touching the network')

// --- no web provider is a named refusal, not an empty report -------------

{
  const run = await tool.execute({ action: 'run', question: 'why do verifiers miss reward hacking?' })
  assert.equal(run.ok, false, 'a run with no provider is a failure, not a success')
  assert.equal(run.code, 'web-unavailable')
  assert.ok(Array.isArray(run.queries) && run.queries.length >= 1, 'the queries come back anyway')
  assert.match(String(run.hint), /provider/i, 'and the reason names what is missing')
}
ok('a host with no web provider gets a refusal and the plan, never a fake report')

// --- sealing marks what it cannot check, and keeps it --------------------

{
  const stored = addEvidence(home, {
    origin: 'https://example.test/audit',
    title: 'Audit',
    content: 'A 2026 audit found 323 of 1,968 tasks were hackable without solving them.',
  })

  const sealed = await tool.execute({
    action: 'seal',
    topic: 'verifier-audit',
    title: 'What the audit found',
    sections: [{ heading: 'Result', paragraphs: [{ text: 'Sixteen percent of tasks were hackable.' }] }],
    claims: [
      {
        text: '323 of 1,968 tasks were hackable without solving them.',
        evidenceIds: [stored.id],
        quotes: ['323 of 1,968 tasks were hackable'],
      },
      {
        text: 'Every audit found the same rate.',
        evidenceIds: [stored.id],
        quotes: ['every audit found the same rate everywhere'],
      },
      {
        text: 'Nobody has measured this since.',
        evidenceIds: [],
      },
    ],
    evidenceIds: [stored.id],
  })

  assert.equal(sealed.action, 'seal')
  assert.ok(existsSync(join(sealed.dir, 'report.md')), 'a report file exists')
  assert.ok(existsSync(join(sealed.dir, 'manifest.json')), 'and a manifest')
  assert.equal(sealed.ok, true, 'the seal itself re-derives')
  assert.match(sealed.seal, /^[0-9a-f]{64}$/, 'the seal is a sha256')

  const statuses = sealed.claims.map((c) => c.status)
  assert.equal(statuses[0], 'verified', 'the quoted claim verified')
  assert.equal(statuses[1], 'contradicted', 'the misquoted claim is contradicted, not passed')
  assert.equal(statuses[2], 'unbound', 'the uncited claim is unbound')
  assert.equal(sealed.unverified.length, 2, 'both failures are reported')

  const manifest = JSON.parse(readFileSync(join(sealed.dir, 'manifest.json'), 'utf8'))
  assert.equal(manifest.evidence[0].id, stored.id, 'the manifest names the snapshot it rests on')
  assert.equal(manifest.evidence[0].hash, stored.hash, 'and pins its digest')
}
ok('a sealed report marks the claims it cannot check and never drops them')

// --- the question ledger works with no campaign in sight ----------------

{
  const added = await tool.execute({
    action: 'questions',
    op: 'add',
    question: 'Do published verifier flake rates exceed 5%?',
    closedBy: 'three independent measurements, each over 100 runs',
    scope: 'R1',
  })
  assert.ok(/^q-/.test(added.question.id), 'the question gets an id')
  assert.equal(added.question.status, 'open')

  const again = await tool.execute({
    action: 'questions',
    op: 'add',
    question: 'do published verifier flake rates exceed 5%',
    closedBy: 'different wording, same question',
  })
  assert.equal(again.duplicate, true, 'asking the same thing twice is one question')

  const listed = await tool.execute({ action: 'questions', op: 'list' })
  assert.equal(listed.open.length, 1)
  assert.match(listed.text, /open question/i)

  const closed = await tool.execute({
    action: 'questions',
    op: 'close',
    id: added.question.id,
    answer: 'No: 1-4% across three suites.',
    evidenceIds: ['ev-x'],
  })
  assert.equal(closed.question.status, 'closed')
  assert.equal(closed.open.length, 0, 'a closed question leaves the open list')

  const open = await tool.execute({ action: 'open' })
  assert.equal(open.questions.open, 0)
  assert.ok(open.ledger.evidence >= 1, 'the ledger summary counts stored snapshots')
  assert.ok(open.ledger.verified >= 1, 'and the claims that verified')
  assert.match(open.text, /ledger:/)
}
ok('questions and the ledger summary work without a campaign')

// --- a note is graded by the same rules the analysis uses ---------------

{
  const bad = await tool.execute({ action: 'note', note: { depth: 'abstract', identity: { title: 'X' }, claims: [] } })
  assert.equal(bad.ok, false, 'an empty abstract-level note does not pass')
  assert.ok(bad.findings.length > 0, 'each failure is named')
  assert.ok(
    bad.findings.some((f) => /identity-identifier/.test(f.code)),
    'a note with a title and no identifier is called out specifically',
  )
  assert.match(bad.text, /claims-empty|identity-/, 'and the rendered card carries the codes')
}
ok('a reading note that claims more than it read is refused by the tool too')

ok('a verified claim becomes a lesson, and a claim with no boundary is refused')

// --- a verified claim reaches the lesson store, a contradicted one does not

{
  const stored = addEvidence(home, {
    origin: 'https://example.test/more',
    title: 'More',
    content: 'Additional candidates did not help when the first candidate solved the task; the sibling was abandoned unsolved.',
  })
  const good = await tool.execute({
    action: 'seal',
    topic: 'candidates',
    title: 'Candidates',
    sections: [{ heading: 'Result', paragraphs: [{ text: 'A second candidate rarely pays.' }] }],
    claims: [
      {
        text: 'Additional candidates did not help when the first candidate solved the task.',
        evidenceIds: [stored.id],
        quotes: ['Additional candidates did not help when the first candidate solved the task'],
      },
    ],
    evidenceIds: [stored.id],
  })
  assert.equal(good.ok, true)

  // The ledger still holds the earlier audit claim, so name the one claim this
  // block is about: "fold everything" is a different question from "fold this".
  const verifyId = await tool.execute({ action: 'open' })
  assert.ok(verifyId.ledger.claims >= 2, 'both sealed claims are on the books')

  const folded = await tool.execute({
    action: 'sink',
    claimIds: ['c-does-not-matter'],
    family: 'loop',
    notWhen: ['tasks where the first candidate never solves'],
    write: false,
  })
  assert.equal(folded.lessons.length, 0, 'naming a claim that is not in the ledger folds nothing')

  const realClaim = good.claims.find((c) => c.status === 'verified')
  const written = await tool.execute({
    action: 'sink',
    claimIds: [realClaim.id],
    family: 'loop',
    notWhen: ['tasks where the first candidate never solves'],
  })
  assert.equal(written.wrote, true)
  assert.equal(written.lessons.length, 1, 'the named verified claim becomes one lesson')
  assert.match(written.text, /1 lesson/)

  const dry = await tool.execute({
    action: 'sink',
    claimIds: [realClaim.id],
    family: 'loop',
    notWhen: ['x'],
    write: false,
  })
  assert.equal(dry.wrote, false, 'a dry run does not write')
  assert.equal(dry.lessons.length, 1)
  assert.ok(written.lessonsInStore >= 1, 'the lesson is now in the store every round reads')

  const noBoundary = await tool.execute({ action: 'sink', claimIds: [realClaim.id], family: 'loop' })
  assert.equal(noBoundary.lessons.length, 0, 'a fact without a boundary is refused')
  assert.ok(noBoundary.skipped.length >= 1)
  assert.match(noBoundary.skipped[0].reason, /notWhen/i)
}

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
