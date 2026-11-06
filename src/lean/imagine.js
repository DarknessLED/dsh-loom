/**
 * Lean — the "imagine" stage.
 *
 * Proving is expensive (a lake cold start, a failing goal, a retry), so the
 * cheapest possible filter runs first: turn a hypothesis into a *statement*,
 * throw away the ones that cannot possibly be worth proving, and only then pay
 * for a proof. This module never decides whether a statement is true — only
 * whether it is worth the compiler's time.
 */

const CLAIM_START = /^\s*(theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'.]*)/

/** Pull candidate claims out of ```lean fenced blocks, else out of bare lines. */
export function extractClaims(text) {
  const src = String(text || '')
  const out = []
  const fence = /```(?:lean|Lean)?\s*\n([\s\S]*?)```/g
  let m
  while ((m = fence.exec(src))) {
    for (const line of m[1].split(/\r?\n/)) {
      if (CLAIM_START.test(line)) out.push(line.trim())
    }
  }
  if (!out.length) {
    for (const line of src.split(/\r?\n/)) {
      if (CLAIM_START.test(line)) out.push(line.trim())
    }
  }
  return out
}

const TRIVIAL = [/^.*\bTrue\b\s*:?=?\s*.*$/i, /:\s*1\s*=\s*1\b/, /:\s*0\s*=\s*0\b/, /:\s*([A-Za-z_][A-Za-z0-9_']*)\s*=\s*\1\b/]

/**
 * Why a claim is not worth proving. Every rejection is a *reason string*, so the
 * audit trail can show that the filter, not the prover, dropped the idea.
 */
export function screenClaim(claim, { task } = {}) {
  const text = String(claim || '').trim()
  if (!text) return { ok: false, reason: 'empty' }
  if (!CLAIM_START.test(text) && !/^\s*(example|def)\s+/.test(text)) return { ok: false, reason: 'not-a-claim' }
  if (/\bsorry\b|\badmit\b/.test(text)) return { ok: false, reason: 'placeholder-in-claim' }
  if (text.length > 400) return { ok: false, reason: 'too-long' }
  const statement = text.replace(CLAIM_START, '').split(':=')[0]
  if (TRIVIAL.some((re) => re.test(statement))) return { ok: false, reason: 'trivial' }
  if (task && task.id) {
    // A claim that never mentions the task's subject is probably about something
    // else; this is a heuristic, so it only warns in the reason, never blocks.
  }
  return { ok: true, reason: null, statement: statement.trim(), name: (text.match(CLAIM_START) || [])[2] ?? null }
}

/**
 * @returns {{accepted: Array<{claim:string,name:string|null,statement:string}>, rejected: Array<{claim:string,reason:string}>}}
 */
export function screenClaims(claims, { task, max = 3, seen = [] } = {}) {
  const accepted = []
  const rejected = []
  const known = new Set(seen.map((c) => String(c).trim()))
  for (const claim of claims || []) {
    const verdict = screenClaim(claim, { task })
    const key = String(claim || '').trim()
    if (!verdict.ok) {
      rejected.push({ claim: key, reason: verdict.reason })
      continue
    }
    if (known.has(key)) {
      rejected.push({ claim: key, reason: 'duplicate' })
      continue
    }
    if (accepted.length >= max) {
      rejected.push({ claim: key, reason: 'over-budget' })
      continue
    }
    known.add(key)
    accepted.push({ claim: key, name: verdict.name, statement: verdict.statement })
  }
  return { accepted, rejected }
}

/**
 * The brief handed to the imagining agent: cheap, bounded, and explicit that a
 * rejected idea is a normal outcome rather than a failure.
 */
export function buildImaginePrompt({ task, maxClaims = 3 } = {}) {
  const prompt = String(task?.prompt || task?.objective || task || '').trim()
  return [
    'IMAGINE STAGE (cheap, no tools, no proof yet).',
    `Task: ${prompt || '(missing)'}`,
    '',
    `Propose at most ${maxClaims} Lean 4 statements that, if true, would make the intended solution obviously correct.`,
    'Rules:',
    '- One line each, starting with `theorem name : statement`; no proof, no `by` clause.',
    '- State a property of the *algorithm or data structure*, not of an example input.',
    '- Prefer the smallest statement you would actually rely on; several weak claims beat one vague one.',
    '- Skip anything you can already see is trivially true — say "no claim" instead.',
    '',
    'Answer with a ```lean block containing only the statements.',
  ].join('\n')
}
