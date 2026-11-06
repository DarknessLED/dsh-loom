// Cordis guards service access per context: `ctx.tools` throws
// "cannot get property X without inject" when the property is read from a
// child fiber (an `effect` callback, a timer, a tool handler) that does not
// itself declare the inject list.
//
// Plugin code legitimately needs those services from all three places, so it
// resolves them through `ctx.get(name)` — the accessor — and only falls back to
// the property when `get` is absent (tests, older hosts).

export function svc(ctx, name) {
  if (!ctx) return undefined
  try {
    if (typeof ctx.get === 'function') {
      const value = ctx.get(name)
      if (value !== undefined && value !== null) return value
    }
  } catch {
    /* guarded property — fall through */
  }
  try {
    return ctx[name]
  } catch {
    return undefined
  }
}
