// The door has to be in the panel, not in a script.
//
// A route alone changes nothing for a reader: the panel is where they look, and
// the library is nine files on disk. This spec loads the browser half through
// the host's lazy-CJS protocol — the same harness `tests/panel-client.test.mjs`
// uses, because a bundle that only imports cleanly is not a bundle the host
// ever mounts — and pins three things a reader would notice immediately:
//
//   * a `调研` section exists, so the shelf is somewhere on the page;
//   * the five section names the page is made of are in the bundle, so opening
//     one work shows the same five sections the Markdown file has;
//   * the bundle still requires nothing but `react`, because a panel entry that
//     pulls a diagram library would be a new dependency the host never agreed
//     to install. The Mermaid block therefore renders as text, and this spec
//     says so rather than leaving the next reader to discover it.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const captured = { loads: [], factory: null, module: null, required: [] }

const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value }),
  Fragment: 'fragment',
}

globalThis.window = {
  ...(globalThis.window ?? {}),
  __ModuleLoader__: {
    load(spec) {
      captured.loads.push({ id: spec.id })
      captured.factory = spec.factory
      const require = (name) => {
        captured.required.push(name)
        if (name === 'react') return fakeReact
        throw new Error(`unexpected require: ${name}`)
      }
      captured.module = spec.factory(require)
    },
  },
}

await import('../../client/index.js')

const slots = []
const ctx = {
  inject(deps, fn) {
    fn({
      slots: {
        inject(name, generator) {
          const it = generator()
          const first = it.next()
          if (!first.done) slots.push({ name, value: first.value })
        },
        register() {
          return () => {}
        },
      },
    })
  },
}
captured.module.apply(ctx)

// The bundle is one source string at load time; flatten the React trees it
// produces and read the text they carry, which is what a reader sees.
function flatten(node, out = []) {
  if (node == null || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out
  }
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out)
    return out
  }
  if (typeof node === 'object') {
    if (node.children) flatten(node.children, out)
    // Props that are strings show up as attributes and captions, so they are
    // part of what the page says.
    for (const [key, value] of Object.entries(node.props ?? {})) {
      if (key === 'children') continue
      if (typeof value === 'string' && /^aria-|^title$|^alt$/.test(key)) out.push(value)
    }
  }
  return out
}

// A depth-first search for the first node matching a predicate: the diagram's
// shape is what matters here, not its position in the tree.
function find(node, want) {
  if (node == null || node === false) return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, want)
      if (hit) return hit
    }
    return null
  }
  if (typeof node !== 'object') return null
  if (want(node)) return node
  return find(node.children, want)
}

test('the bundle still only requires react', () => {
  assert.deepEqual([...new Set(captured.required)], ['react'])
})

test('the panel has a research section, not just the two it had', () => {
  const panel = captured.module.__panel
  assert.equal(typeof panel?.Research, 'function', 'the research section is exported so the spec can mount it')
  const Research = panel.Research(fakeReact)
  const tree = Research({
    shelf: {
      loading: false,
      error: null,
      directions: [
        { slug: 'r1-verifier', name: 'R1 判决与验证器', works: 12, figures: 11, summaries: 12 },
        { slug: 'r4-knowledge', name: 'R4 知识与迁移', works: 12, figures: 11, summaries: 0 },
      ],
      total: { directions: 2, works: 24, figures: 22 },
      open: null,
    },
  })
  const text = flatten(tree).join(' ')
  assert.match(text, /调研/, 'the section names itself')
  assert.match(text, /R1 判决与验证器/, 'each direction is listed by its own name')
  assert.match(text, /24/, 'the shelf says how many works it holds')
})

test('a direction whose works were never summarised says so', () => {
  const Research = captured.module.__panel.Research(fakeReact)
  const tree = Research({
    shelf: {
      loading: false,
      error: null,
      directions: [{ slug: 'r4-knowledge', name: 'R4 知识与迁移', works: 12, figures: 11, summaries: 0 }],
      total: { directions: 1, works: 12, figures: 11 },
      open: null,
    },
  })
  const text = flatten(tree).join(' ')
  assert.match(text, /0/, 'the zero is printed rather than hidden')
  assert.match(text, /总结|summary/i, 'the row says which column the zero belongs to')
})

test('one work renders the same five sections the Markdown page has', () => {
  const Research = captured.module.__panel.Research(fakeReact)
  const tree = Research({
    shelf: {
      loading: false,
      error: null,
      directions: [{ slug: 'r1-verifier', name: 'R1', works: 1, figures: 1, summaries: 1 }],
      total: { directions: 1, works: 1, figures: 1 },
      open: {
        loading: false,
        error: null,
        markdown: [
          '# A work',
          '',
          '## 出发点',
          'Because it was wrong.',
          '',
          '## Pipeline',
          '```mermaid',
          'flowchart LR',
          '  N0["§2 Method"]',
          '```',
          '',
          '## 机制',
          '### 1. First step',
          'The text of the mechanism.',
          '',
          '## 总结与展望',
          'It works because of the thing.',
          '',
          '## 不足之处',
          'It is small.',
        ].join('\n'),
      },
    },
  })
  const text = flatten(tree).join(' ')
  for (const heading of ['出发点', 'Pipeline', '机制', '总结与展望', '不足之处']) {
    assert.ok(text.includes(heading), `the panel shows the ${heading} section`)
  }
  assert.ok(text.includes('flowchart LR'), 'the diagram text is shown even though nothing renders it')
  // Shown as a diagram source, not as a sentence: the block has its own node
  // and a line that says the host draws nothing here. Before this, the mermaid
  // lines were joined into a paragraph and `N0["§2 Method"] --> N1[...]` read
  // like prose.
  const pre = find(tree, (node) => node?.type === 'pre')
  assert.ok(pre, 'the diagram is a <pre>, which is how source is shown')
  assert.match(String(pre.children?.[0] ?? ''), /flowchart LR/)
  assert.match(text, /没有图渲染器|no renderer/, 'the panel says the diagram is not drawn')
  assert.ok(!/\bh\('div', \{ className: 'loom-wsec' \},[^)]*paragraphs\(/.test(String(captured.module.__panel.Research)), 'prose and diagram take different paths')
})
