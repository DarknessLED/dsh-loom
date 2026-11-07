// A campaign that makes its autopilot guard the tail of its own verify command
// pays for the same suite twice: the verifier already runs it while judging the
// winning candidate, and autopilot then runs it again after the patch lands. The
// second run re-learns a verdict the first one produced in the same worktree,
// against the same patch.
//
// The rule is narrow on purpose: only a command that appears *verbatim* as one
// clause of the verified command is reused. A different guard — even a similar
// one — still runs exactly once, because it measures something the verifier did
// not. Comparison is clause-exact (an `echo "node guard.js"` does not count), so
// a guard that is merely mentioned in the command is never mistaken for one that
// was executed.
//
// Reuse means the guard clause is removed from the command handed to the
// verifier; there is no other copy of it to run. A clause that is the *whole*
// command cannot be removed (there would be nothing left to verify), so in that
// case the command is kept and only the applier's duplicate run is skipped.

/**
 * Split a shell command into clauses, respecting single and double quotes.
 * Each clause keeps the separator that follows it, so dropping a clause also
 * drops the connective that belonged to it.
 *
 * @param {string} cmd
 * @returns {Array<{text: string, after: string|null}>}
 */
function splitClauses(cmd) {
  const clauses = []
  let text = ''
  let quote = null
  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i]
    if (quote) {
      text += ch
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      text += ch
      continue
    }
    const two = cmd.slice(i, i + 2)
    const sep = two === '&&' || two === '||' ? two : ch === ';' ? ';' : null
    if (sep !== null) {
      clauses.push({ text, after: sep })
      text = ''
      if (sep.length === 2) i += 1
      continue
    }
    text += ch
  }
  clauses.push({ text, after: null })
  return clauses
}

/** Indexes of the clauses that are exactly the guard command. */
function guardClauses(cmd, guard) {
  if (typeof cmd !== 'string' || typeof guard !== 'string') return null
  const want = guard.trim()
  if (!want) return null
  const clauses = splitClauses(cmd)
  const indexes = []
  for (let i = 0; i < clauses.length; i += 1) {
    if (clauses[i].text.trim() === want) indexes.push(i)
  }
  return indexes.length ? { clauses, indexes } : null
}

/**
 * Is the guard command one of the verified command's clauses?
 *
 * @param {string} cmd the command the verifier runs
 * @param {string} guard the configured autopilot guard
 * @returns {boolean}
 */
export function guardIsPartOf(cmd, guard) {
  return guardClauses(cmd, guard) !== null
}

/**
 * The verified command with every verbatim guard clause removed.
 *
 * Returns the command unchanged when the guard is not a clause, and also when
 * removing it would leave nothing to verify: a command that *is* the guard has
 * to run, and the caller then only skips the applier's duplicate.
 *
 * @param {string} cmd the command the verifier runs
 * @param {string} guard the configured autopilot guard
 * @returns {string}
 */
export function stripGuardClause(cmd, guard) {
  const found = guardClauses(cmd, guard)
  if (!found) return cmd
  const dropped = new Set(found.indexes)
  const kept = found.clauses.filter((_clause, i) => !dropped.has(i))
  if (!kept.length) return cmd
  let out = kept[0].text
  for (let i = 1; i < kept.length; i += 1) {
    out += ` ${kept[i - 1].after} ${kept[i].text}`
  }
  // A rewrite that leaves no command behind would fail closed for the wrong
  // reason (runVerifier rejects an empty command); keep the original instead and
  // let the applier's duplicate be the one that is skipped.
  return out.trim() === '' ? cmd : out
}
