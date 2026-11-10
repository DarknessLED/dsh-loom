// A round the host killed says nothing about whether the loop is making
// progress, and the health verdict was reading it as "three quiet rounds".
//
// loom-acc4 and loom-acc5 both report `stalled` from a window of three
// interrupted rounds: the provider was down, every attempt died, the host
// recorded `interrupted` three times in a row. The verdict that a human sees is
// "this loop is spinning", which is an accusation about work that never ran.
//
// The window therefore counts only rounds that actually reached a verdict. An
// interrupted round is set aside; if too few judged rounds remain to fill the
// window, the campaign has no evidence of stalling and must not be accused.
import assert from 'node:assert/strict'
import { campaignQuality, qualityLine } from '../../src/runtime/quality.js'

let pass = 0
function ok(name, cond = true, detail) {
  if (!cond) {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
    return
  }
  pass += 1
  console.log(`  ok   ${name}`)
}

const killed = (n) => ({ n, status: 'interrupted', promoted: false, interrupted: true })
const quiet = (n) => ({ n, status: 'no-gain', promoted: false })
const won = (n) => ({ n, status: 'promoted', promoted: true })

// The real shape: three host kills in a row.
{
  const q = campaignQuality({ rounds: [killed(1), killed(2), killed(3)] })
  ok('three killed rounds are not a stall', q.verdict !== 'stalled', q.verdict)
  ok('and the verdict says there is no evidence', q.verdict === 'no-evidence', q.verdict)
}

// Kills mixed with one quiet round: still one judged round, not three.
{
  const q = campaignQuality({ rounds: [killed(1), killed(2), quiet(3)] })
  ok('one quiet round among kills is not a stall either', q.verdict !== 'stalled', q.verdict)
}

// Three quiet rounds with no kills still is a stall: that is the case the rule
// exists for, and it must keep working.
{
  const q = campaignQuality({ rounds: [quiet(1), quiet(2), quiet(3)] })
  ok('three judged quiet rounds still stall', q.verdict === 'stalled', q.verdict)
}

// A kill inside a window that also holds three quiet rounds is set aside, so
// the last three judged rounds are the ones that decide.
{
  const q = campaignQuality({ rounds: [quiet(1), quiet(2), killed(3), quiet(4)] })
  ok('a kill is skipped, the judged rounds decide', q.verdict === 'stalled', q.verdict)
}

// A kill older than the window changes nothing.
{
  const q = campaignQuality({ rounds: [killed(1), won(2), won(3), won(4)] })
  ok('an old kill does not linger', q.verdict === 'healthy', q.verdict)
}

// Recovery after kills is healthy, not "no evidence".
{
  const q = campaignQuality({ rounds: [killed(1), killed(2), killed(3), won(4)] })
  ok('a promotion after the outage is healthy', q.verdict === 'healthy', q.verdict)
}

// The rate denominator still counts every round, kills included: they cost
// wall clock whether or not they produced a verdict.
{
  const q = campaignQuality({ rounds: [killed(1), won(2)] })
  ok('kills still count toward the round total', q.rounds === 2, String(q.rounds))
  ok('and toward the promotion rate denominator', q.promotionRate === 0.5, String(q.promotionRate))
}

// Regressing is still a judgement and still wins over everything else.
{
  const q = campaignQuality({
    rounds: [killed(1), { n: 2, status: 'holdout-failed', promoted: false }],
  })
  ok('a holdout rejection still reads as regressing', q.verdict === 'regressing', q.verdict)
}

// The line printed to humans must not say "stalled" for an outage.
{
  const line = qualityLine(campaignQuality({ rounds: [killed(1), killed(2), killed(3)] }))
  ok('the rendered line does not accuse an outage', !line.includes('stalled'), line)
}

console.log(`\n${pass}/11 passed`)
assert.ok(pass === 11, `expected 11 passing checks, got ${pass}`)
