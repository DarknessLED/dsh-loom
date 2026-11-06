export const OBJECT = { type: 'object', additionalProperties: true }

function textOf(value) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Standard tool output descriptor: lossless JSON in, text card out. */
export function output(schema = OBJECT) {
  return {
    schema,
    render: (_args, value) => [{ type: 'text', text: textOf(value) }],
  }
}
