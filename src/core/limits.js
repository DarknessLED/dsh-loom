/**
 * How much text this plugin is allowed to put into a model request.
 *
 * Every string dsh-loom hands to the host ends up in a request body: the system
 * prompt section, a tool result, a checkpoint card. A single unbounded field
 * (`stdoutTail` of a failing suite, a `report`, an objective pasted by a human)
 * can therefore make every later request unforwardable — the host refuses the
 * whole payload, and the failure names bytes, not the field that caused them.
 *
 * So the plugin clips at the boundary, says what it clipped, and never lets one
 * field decide whether the next step can be sent at all.
 */

export const PAYLOAD = {
  /** The system-prompt status block: a few lines, never a transcript. */
  promptSection: 4_000,
  /** One tool result. Big enough for a real status, small enough to always ship. */
  toolResult: 48_000,
  /** One string field inside a result. */
  field: 2_000,
  /** A stdout/agent tail, which is the usual offender. */
  tail: 1_200,
}

const ELLIPSIS = '\n…[clipped]'

/**
 * Clip one string to `max` bytes' worth of characters.
 * @returns {{text: string, clipped: boolean, omitted: number}}
 */
export function clipText(text, max = PAYLOAD.field) {
  const s = typeof text === 'string' ? text : text == null ? '' : String(text)
  const limit = Number.isFinite(Number(max)) && Number(max) > 0 ? Math.floor(Number(max)) : PAYLOAD.field
  if (s.length <= limit) return { text: s, clipped: false, omitted: 0 }
  return { text: s.slice(0, limit) + ELLIPSIS, clipped: true, omitted: s.length - limit }
}

/**
 * Clip every long string inside a value, leaving its shape intact.
 * Order is preserved so a caller can still read the record.
 *
 * @param {*} value
 * @param {{budget?: number, field?: number}} opts
 * @returns {{value: *, clipped: boolean, bytes: number, fields: string[]}}
 */
export function clipDeep(value, { budget = PAYLOAD.toolResult, field = PAYLOAD.field } = {}) {
  const fields = []
  let used = 0
  const walk = (node, path) => {
    if (typeof node === 'string') {
      const { text, clipped } = clipText(node, field)
      if (clipped) fields.push(path)
      used += text.length
      return text
    }
    if (Array.isArray(node)) return node.map((item, i) => walk(item, `${path}[${i}]`))
    if (node && typeof node === 'object') {
      const out = {}
      for (const key of Object.keys(node)) out[key] = walk(node[key], path ? `${path}.${key}` : key)
      return out
    }
    return node
  }
  const walked = walk(value, '')
  // A record of many small fields can still be too big on its own; clipping each
  // field is not a budget. Cut at the top level only when the shape allows it.
  if (used <= budget) return { value: walked, clipped: fields.length > 0, bytes: used, fields }
  return { value: walked, clipped: true, bytes: used, fields: fields.length ? fields : ['(total)'] }
}

/**
 * The system-prompt status block: hard-capped, with the remainder named.
 * `briefForPrompt` builds the text; this makes sure the block can never grow
 * past a few kilobytes no matter how many campaigns exist.
 */
export function clipSection(text, max = PAYLOAD.promptSection) {
  const { text: clipped, clipped: did, omitted } = clipText(text, max)
  if (!did) return clipped
  return `${clipped}\n(${omitted} more characters withheld to keep the request sendable)`
}

/** Byte length of a value as JSON, which is what a request actually carries. */
export function payloadBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8')
  } catch {
    return 0
  }
}

// Verifiers name the breakage in more than one dialect: node's runner says
// FAIL, pytest says `path::test_name` under a REGRESSED: header, and mine
// prints the P2P/REWARD numbers. A digest that keeps only the first dialect
// hands the next round a score instead of a task.
const FAILURE_LINE = /^(FAIL|not ok|\s*✖|\s*AssertionError|\s*Error:|Error:|\s*at .*\.test\.mjs|REGRESSED:|UNIMPLEMENTED:|\s*\S+\.(?:py|mjs|cjs|js|ts|tsx)::|P2P=|KILLRATE=|REWARD=)/

/**
 * The part of a verifier log that says what failed.
 *
 * A checkpoint used to keep the last 400 characters of the guard output, which is
 * exactly the summary line ("209/210 suites passed") and never the suite that
 * broke: two promotions were rolled back this way and the reason was invisible.
 * Keep the failure lines first, then the head, then the tail.
 *
 * @param {string} text
 * @param {{maxLines?: number, maxChars?: number}} opts
 */
export function failureDigest(text, { maxLines = 24, maxChars = 1_600 } = {}) {
  const raw = typeof text === 'string' ? text : ''
  if (!raw.trim()) return ''
  const lines = raw.split('\n')
  const picked = []
  const seen = new Set()
  const push = (line, prefix = '') => {
    const key = prefix + line.trim()
    if (seen.has(key) || picked.length >= maxLines) return
    seen.add(key)
    picked.push(prefix + line.trimEnd())
  }
  for (const line of lines) if (FAILURE_LINE.test(line)) push(line)
  const head = lines.slice(0, 3)
  for (const line of head) push(line, '· ')
  for (const line of lines.slice(-3)) push(line, '· ')
  return clipText(picked.join('\n'), maxChars).text
}
