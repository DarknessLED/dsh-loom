// Four behaviours, each independently testable. `broken` names the ones that are
// deliberately implemented naively, so a candidate can fix them one at a time and
// move QUALITY. Fixing one must not fix another: each has its own implementation.
export const cases = [
  { name: 'trim', input: '  x  ', expected: 'x' },
  { name: 'slug', input: 'A B', expected: 'a-b' },
  { name: 'pad', input: 'x', expected: ' x ' },
  { name: 'clip', input: 'abcdef', expected: 'abc' },
]

const broken = new Set(['pad', 'clip'])

const correct = {
  trim: (s) => String(s).trim(),
  slug: (s) => String(s).trim().toLowerCase().replace(/\s+/g, '-'),
  pad: (s) => ` ${String(s)} `,
  clip: (s) => String(s).slice(0, 3),
}

const naive = {
  trim: (s) => String(s),
  slug: (s) => String(s),
  pad: (s) => String(s),
  clip: (s) => String(s),
}

export function run(name, input) {
  const table = broken.has(name) ? naive : correct
  return table[name](input)
}

export function isIntended(name) {
  return !broken.has(name)
}
