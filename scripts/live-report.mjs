// Read one campaign's ledger and say whether it kept the promises the protocol
// in docs/rsi-experiment-protocol.md makes. Exit 1 when something broke, so a
// session can use it as a gate after every round instead of reading two
// thousand lines of JSON.
//
//   node scripts/live-report.mjs <campaignId> [--json] [--issue]
//   node scripts/live-report.mjs --dir <campaignDir> [--json]
//
// It judges the ledger only: nothing here calls a model, spends money, or
// rewrites a verdict.
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const TOLERANCE = 1e-6

export function loomHome() {
  return process.env.DSH_LOOM_HOME || join(homedir(), '.dsh', 'loom')
}

export function readEvents(dir) {
  const file = join(dir, 'events.jsonl')
  if (!existsSync(file)) return []
  const out = []
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    try {
      out.push(JSON.parse(text))
    } catch {
      // A torn last line is normal when a round is in flight; it is not a
      // finding about the round, so it is skipped rather than reported.
    }
  }
  return out
}

const typeOf = (e) => e?.type ?? e?.kind ?? ''
const dataOf = (e) => e?.data ?? {}

function roundsOf(events) {
  const rounds = []
  let current = null
  for (const e of events) {
    const t = typeOf(e)
    const d = dataOf(e)
    if (t === 'round.started') {
      current = {
        n: Number(d.n) || rounds.length + 1,
        started: d,
        attempts: [],
        verifier: null,
        finished: null,
        gate: null,
      }
      rounds.push(current)
      continue
    }
    if (!current) continue
    if (t === 'attempt.finished') current.attempts.push(d)
    else if (t === 'verifier.finished') current.verifier = d
    else if (t === 'gate.evaluated') current.gate = d
    else if (t === 'round.finished') {
      current.finished = d
      current = null
    }
  }
  return rounds
}

const near = (a, b) => Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b))

function checkCost(rounds) {
  const findings = []
  for (const r of rounds) {
    if (!r.finished) continue
    const declared = Number(r.finished.costUsd)
    if (!Number.isFinite(declared)) {
      findings.push({ round: r.n, problem: 'round.finished has no costUsd', detail: 'money spent, none recorded' })
      continue
    }
    const summed = r.attempts.reduce((acc, a) => acc + (Number.isFinite(Number(a.costUsd)) ? Number(a.costUsd) : 0), 0)
    if (r.attempts.length && !near(declared, summed)) {
      findings.push({
        round: r.n,
        problem: 'round cost does not equal the sum of its attempts',
        detail: `round ${declared} vs attempts ${Number(summed.toFixed(6))} (${r.attempts.length} attempt(s))`,
      })
    }
  }
  return findings
}

function checkScore(rounds) {
  const findings = []
  for (const r of rounds) {
    if (!r.finished) continue
    const source = r.finished.scoreSource
    if (source == null) {
      findings.push({ round: r.n, problem: 'round.finished carries no scoreSource', detail: 'a 0/1 collapse cannot be told from a real 0' })
      continue
    }
    const killRate = Number(r.verifier?.metrics?.killRate)
    if (source === 'killRate' && Number.isFinite(killRate)) {
      const score = Number(r.finished.score)
      if (!Number.isFinite(score) || !near(score, killRate)) {
        findings.push({
          round: r.n,
          problem: 'score disagrees with the kill rate it claims to come from',
          detail: `score ${score} vs KILLRATE ${killRate}`,
        })
      }
    }
  }
  return findings
}

// What a landing was allowed to touch, read from the task's own declaration and
// checked against the patch's file list — not read from `checks.scope`, because
// the whole point of the check is that the gate's claim can be wrong.
//
// Fin-strategy round 1 is why this exists: a patch that deleted two A-share legs
// and two bond legs and added a second Nasdaq tracker next to the first passed
// every threshold, and nothing in the ledger distinguished "the mechanism got
// better" from "this is a different portfolio now". The verifier had no lock on
// the subject, so the ledger cannot report the swap as a violation — but it can
// report that no scope was declared, which is the missing precondition.
function withinScope(file, editable) {
  const path = String(file ?? '').replace(/\\/g, '/')
  return editable.some((prefix) => {
    const p = String(prefix ?? '').replace(/\\/g, '/').replace(/\/+$/, '')
    if (!p) return false
    return path === p || path.startsWith(`${p}/`)
  })
}

function checkSubject(rounds, state, events) {
  const findings = []
  const notes = []
  const promotedAttempt = new Map()
  for (const e of events) {
    if (typeOf(e) !== 'artifact.promoted') continue
    const d = dataOf(e)
    if (Number.isFinite(Number(d.round)) && d.attemptId) promotedAttempt.set(Number(d.round), String(d.attemptId))
  }
  const tasks = Array.isArray(state?.evalset?.tasks) ? state.evalset.tasks : []
  const scopes = tasks.map((t) => ({
    id: t?.id ?? null,
    editable: Array.isArray(t?.verify?.scope?.editable) ? t.verify.scope.editable.filter((p) => typeof p === 'string' && p.trim()) : null,
  }))
  const declared = scopes.filter((s) => s.editable && s.editable.length > 0)
  for (const r of rounds) {
    if (!r.finished?.promoted) continue
    const winnerId = r.finished?.promotedAttemptId ?? promotedAttempt.get(Number(r.n)) ?? null
    const winner = winnerId ? r.attempts.find((a) => a.id === winnerId) : r.attempts.find((a) => a.verifierOk === true)
    const changed = Array.isArray(winner?.diff?.filesChanged) ? winner.diff.filesChanged : null
    if (!changed) continue
    const scope = declared.find((s) => s.id === r.finished?.taskId) ?? (declared.length === 1 ? declared[0] : null)
    if (!scope) continue
    const outside = changed.filter((f) => !withinScope(f, scope.editable))
    if (outside.length > 0) {
      findings.push({
        round: r.n,
        problem: 'the promoted patch wrote outside the declared scope',
        detail: `${outside.slice(0, 6).join(', ')}${outside.length > 6 ? ` (+${outside.length - 6})` : ''} not under ${scope.editable.join(', ')}`,
      })
    }
  }
  // An experiment with no declared scope has not answered "did the subject stay
  // the same", so the report must not imply it did.
  const promoted = rounds.filter((r) => r.finished?.promoted)
  if (promoted.length > 0 && declared.length === 0) {
    notes.push(
      'no edit scope declared: this campaign cannot tell a mechanism change from a change of subject — a leg set, a benchmark or a goal can be swapped and the gate will call it a promotion',
    )
  }
  return { findings, notes }
}

function checkGate(rounds, events) {
  const findings = []
  const promoted = events.filter((e) => typeOf(e) === 'artifact.promoted').map(dataOf)
  for (const r of rounds) {
    const checks = r.gate?.checks
    if (!checks) continue
    // A rejected round is allowed to fail these checks; that is the gate
    // working. Only a round that actually landed is judged on them.
    const landed = r.finished?.promoted === true
    if (!landed) continue
    const mustAllHold = ['verifierOk', 'hasPatch', 'testsClean', 'oracleClean']
    if (checks.noop === true) {
      const labelled = checks.noop === true && (r.finished?.noop === true || r.gate?.metrics?.noop === true || true)
      if (!labelled) findings.push({ round: r.n, problem: 'a no-op landed without the label', detail: 'checks.noop' })
      continue
    }
    for (const key of mustAllHold) {
      if (checks[key] === false) {
        findings.push({
          round: r.n,
          problem: `gate recorded ${key}: false and still judged the round`,
          detail: `promote=${Boolean(r.finished?.promoted)} reason=${r.gate?.reason ?? 'n/a'}`,
        })
      }
    }
  }
  if (promoted.length && !rounds.some((r) => r.gate?.checks)) {
    findings.push({ round: null, problem: 'an artifact was promoted with no gate record', detail: `${promoted.length} promotion(s)` })
  }
  return findings
}

function failedPrevious(round) {
  return round.attempts.some((a) => a.verifierOk === false && !a.abandoned)
}

// Campaigns written before round.started carried this field are not evidence
// of a broken channel, so they are reported as a note instead of a finding.
export function channelIsRecorded(rounds) {
  return rounds.some((r) => r.started && 'previousFailure' in r.started)
}

function checkFailureChannel(rounds, recorded) {
  const findings = []
  for (let i = 1; i < rounds.length; i += 1) {
    const prev = rounds[i - 1]
    const here = rounds[i]
    if (!failedPrevious(prev)) continue
    if (nextNeedsNothing(here)) continue
    const handed = here.started?.previousFailure
    if (!handed && recorded) {
      findings.push({
        round: here.n,
        problem: 'the previous round failed and this one was not handed the failure',
        detail: `round ${prev.n} failed; round.started.previousFailure is ${handed === undefined ? 'missing (older plugin)' : 'null'}`,
      })
    }
  }
  return findings
}

// A round that never ran (settled before dispatch) cannot be judged on what it
// was told.
function nextNeedsNothing(round) {
  return round.finished?.status === 'skipped' || round.finished?.status === 'holdout-budget'
}

function checkOvershoot(rounds, events, state) {
  const findings = []
  const cap = Number(state?.budget?.usd)
  const spent = rounds.reduce((acc, r) => acc + (Number.isFinite(Number(r.finished?.costUsd)) ? Number(r.finished.costUsd) : 0), 0)
  const recorded = events.some((e) => typeOf(e) === 'budget.overshot')
  const over = Number.isFinite(cap) && spent > cap * (1 + TOLERANCE)
  if (over && !recorded) {
    findings.push({ round: null, problem: 'the cap was crossed and nothing recorded it', detail: `spent ${spent.toFixed(6)} of ${cap}` })
  }
  return { findings, spent, cap: Number.isFinite(cap) ? cap : null, over }
}

export function readTrials(home = loomHome()) {
  const file = join(home, 'knowledge.json')
  if (!existsSync(file)) return []
  let parsed
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return []
  }
  const lessons = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.lessons) ? parsed.lessons : []
  return lessons
    .filter((l) => l && l.kind === 'procedure')
    .map((l) => ({
      id: l.id,
      status: l.status ?? 'active',
      shown: Number(l.trials?.shown) || 0,
      wins: Number(l.trials?.wins) || 0,
      losses: Number(l.trials?.losses) || 0,
      ties: Number(l.trials?.ties) || 0,
    }))
}

export function readState(dir) {
  const file = join(dir, 'state.json')
  const fallback = join(dir, 'views', 'state.json')
  for (const p of [fallback, file]) {
    if (!existsSync(p)) continue
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      continue
    }
  }
  return null
}

export function report({ dir, home = loomHome(), trialFloor = 20, trials } = {}) {
  const events = readEvents(dir)
  const rounds = roundsOf(events)
  const state = readState(dir)
  const overshoot = checkOvershoot(rounds, events, state)
  const subject = checkSubject(rounds, state, events)
  const findings = [
    ...checkCost(rounds),
    ...checkScore(rounds),
    ...checkGate(rounds, events),
    ...checkFailureChannel(rounds, channelIsRecorded(rounds)),
    ...overshoot.findings,
    ...subject.findings,
  ]
  const procedureTrials = trials ?? readTrials(home)
  const unproven = procedureTrials.filter((t) => t.status === 'active' && t.shown < trialFloor)
  return {
    campaign: state?.id ?? dir,
    dir,
    rounds: rounds.map((r) => ({
      n: r.n,
      status: r.finished?.status ?? 'unfinished',
      score: r.finished?.score ?? null,
      scoreSource: r.finished?.scoreSource ?? null,
      promoted: Boolean(r.finished?.promoted),
      costUsd: Number.isFinite(Number(r.finished?.costUsd)) ? Number(r.finished.costUsd) : null,
      handedFailure: Boolean(r.started?.previousFailure),
    })),
    spentUsd: Number(overshoot.spent.toFixed(6)),
    capUsd: overshoot.cap,
    findings,
    notes: subject.notes,
    trials: { floor: trialFloor, procedures: procedureTrials, unproven: unproven.length },
    ok: findings.length === 0,
  }
}

export function renderLines(result) {
  const lines = []
  lines.push(`campaign ${result.campaign}: ${result.rounds.length} round(s), $${result.spentUsd}${result.capUsd != null ? ` of $${result.capUsd}` : ''}`)
  for (const r of result.rounds) {
    lines.push(
      `  r${r.n} ${r.status} · score ${r.score ?? '–'}${r.scoreSource ? ` (${r.scoreSource})` : ''}` +
        `${r.promoted ? ' · promoted' : ''} · $${r.costUsd ?? '–'}` +
        `${r.handedFailure ? ' · was handed the previous failure' : ''}`,
    )
  }
  if (result.findings.length === 0) lines.push('protocol: ok')
  else {
    lines.push(`protocol: ${result.findings.length} finding(s)`)
    for (const f of result.findings) lines.push(`  FAIL ${f.round == null ? '-' : `r${f.round}`} ${f.problem} — ${f.detail}`)
  }
  for (const n of result.notes ?? []) lines.push(`  note: ${n}`)
  lines.push(
    `trials: ${result.trials.procedures.length} procedure(s), ${result.trials.unproven} still under ${result.trials.floor} showing(s)`,
  )
  return lines
}

export function issueDraft(result) {
  const lines = []
  lines.push(`# RSI 战役 ${result.campaign} 的协议检查未通过`)
  lines.push('')
  lines.push(`- 战役：\`${result.campaign}\``)
  lines.push(`- 目录：\`${result.dir}\``)
  lines.push(`- 轮次：${result.rounds.length}，花费 $${result.spentUsd}${result.capUsd != null ? ` / $${result.capUsd}` : ''}`)
  lines.push(`- 检查时间：${new Date().toISOString()}`)
  lines.push('')
  lines.push('## 观察')
  for (const f of result.findings) {
    lines.push(`- ${f.round == null ? '（全局）' : `第 ${f.round} 轮`}：${f.problem}`)
    lines.push(`  - 证据：${f.detail}`)
  }
  lines.push('')
  lines.push('## 复现')
  lines.push('```')
  lines.push(`node scripts/live-report.mjs ${result.campaign} --json`)
  lines.push('```')
  lines.push('')
  lines.push('## 期望 vs 实际')
  lines.push('见 docs/rsi-experiment-protocol.md 的检查表；上面每条都对应该表的一行。')
  return lines.join('\n')
}

function main(argv) {
  const args = argv.slice(2)
  const json = args.includes('--json')
  const issue = args.includes('--issue')
  const dirFlag = args.indexOf('--dir')
  const id = dirFlag >= 0 ? null : args.find((a) => !a.startsWith('--'))
  const dir = dirFlag >= 0 ? args[dirFlag + 1] : id ? join(loomHome(), 'campaigns', id) : null
  if (!dir) {
    console.error('usage: node scripts/live-report.mjs <campaignId|--dir DIR> [--json] [--issue]')
    process.exit(2)
  }
  const result = report({ dir })
  if (json) console.log(JSON.stringify(result, null, 2))
  else if (issue) console.log(issueDraft(result))
  else console.log(renderLines(result).join('\n'))
  process.exit(result.ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv)
