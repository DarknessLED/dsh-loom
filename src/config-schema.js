/**
 * What an operator may set from the plugin's own settings form.
 *
 * The plugin ships a config surface it never declared: `normalizeConfig` accepts
 * `tickMs`, `models`, `session`, `gate`, `loopPolicy`, but the host only learns a
 * plugin's shape through an exported `Config`, and we exported none. So the
 * Settings page showed nothing (`include:dsh-loom` reads `status: "absent"` in the
 * host's own Config directory), changing the model a child runs on meant editing
 * the profile's `cordis.patch.yml` by hand, and a typo there failed silently at
 * load time instead of being rejected at the field.
 *
 * The list here is deliberately short: the knobs an operator actually turns --
 * which refs children run on, how long they may take, how many at once, and the
 * master switch. Everything else stays a file-level decision, because a settings
 * form that mirrors the whole config is a settings form nobody reads.
 *
 * `FIELDS` is the plain description; `describeConfig` turns it into a JSON
 * Schema so the shape can be asserted without the host's schema library.
 */

/** One row per exposed config path: its type, its default, and what it decides. */
export const FIELDS = {
  tickMs: {
    type: 'number',
    default: 20000,
    description: '循环的心跳周期（毫秒）。越小反应越快，越大越省电；空闲时引擎几乎不耗资源。',
  },
  'models.worker': {
    type: 'string',
    default: '',
    description:
      '子 agent 使用的模型（形如 provider/model，如 open-design/claude-haiku-5.5）。留空 = 跟随发起战役的会话。',
  },
  'models.fallback': {
    type: 'array',
    default: [],
    description:
      '主模型到达额度上限（上下文/配额）时依次尝试的模型。子进程死于诊断过的错误不会换模型——那只会重复计费同一个答案。',
  },
  'session.attemptTimeoutMs': {
    type: 'number',
    default: 780000,
    description:
      '单次尝试的墙钟上限（毫秒）。默认 13 分钟：成功样本的 p95 是 659 秒，比它更紧的上限是在制造自己的失败。',
  },
  'session.planTimeoutMs': {
    type: 'number',
    default: 180000,
    description: '规划阶段的墙钟上限（毫秒）。规划是侦察，三分钟还没点出文件就是在游荡。',
  },
  'session.maxConcurrent': {
    type: 'number',
    default: 2,
    description: '同时推进的回合数（跨全部战役）。',
  },
  'session.reasoningEffort': {
    type: 'string',
    default: '',
    description: '子 agent 的推理强度。留空 = 继承发起战役的会话——低一档跑的「同一个模型」其实是另一个模型。',
  },
  'gate.minGain': {
    type: 'number',
    default: 0.05,
    description: '晋升所需的最小分数增益（0–1）。低于它的改进不算证据。',
  },
  'loopPolicy.planMode': {
    type: 'string',
    default: 'auto',
    description: '规划策略：auto（默认，按记录决定）/ full（总是规划）/ off（从不规划）。',
  },
  'rsi.enabled': {
    type: 'boolean',
    default: true,
    description:
      '后台循环的初始开关。一旦由 rsi_control 或面板翻转过，翻转结果记在账本旁并优先于这里的值；翻转从不写入战役日志。',
  },
}

/** Every exposed path, in the order a form should read them. */
export const FIELD_ORDER = [
  'rsi.enabled',
  'models.worker',
  'models.fallback',
  'session.reasoningEffort',
  'session.attemptTimeoutMs',
  'session.planTimeoutMs',
  'session.maxConcurrent',
  'gate.minGain',
  'loopPolicy.planMode',
  'tickMs',
]

/**
 * Project the field list into a JSON Schema.
 *
 * Nested groups stay nested, because that is where the values already live: a
 * form that writes `{"worker": "..."}` at the root would be rejected by nothing
 * and read by nothing, which is worse than having no form.
 */
export function describeConfig() {
  const root = { type: 'object', properties: {}, additionalProperties: true }
  for (const path of FIELD_ORDER) {
    const field = FIELDS[path]
    if (!field) continue
    const parts = path.split('.')
    let node = root
    for (const part of parts.slice(0, -1)) {
      const props = node.properties
      if (!props[part]) props[part] = { type: 'object', properties: {}, additionalProperties: true }
      node = props[part]
    }
    const leaf = {
      type: field.type,
      default: field.default,
      description: field.description,
    }
    if (field.type === 'array') leaf.items = { type: 'string' }
    node.properties[parts[parts.length - 1]] = leaf
  }
  return root
}

/**
 * Copy a plain config value so the caller's object is never mutated.
 *
 * Groups are copied one level deep (the config is nested objects of scalars and
 * string arrays); anything deeper is shared, which is fine because a validated
 * field replaces the leaf rather than editing it in place.
 */
function copyConfig(node) {
  if (!node || typeof node !== "object") return node
  if (Array.isArray(node)) return node.slice()
  const out = {}
  for (const [k, v] of Object.entries(node)) out[k] = copyConfig(v)
  return out
}

function readPath(source, parts) {
  let node = source
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined
    node = node[part]
  }
  return node
}

function dropPath(target, parts) {
  let node = target
  for (const part of parts.slice(0, -1)) {
    if (!node || typeof node !== "object") return
    node = node[part]
  }
  if (node && typeof node === "object") delete node[parts[parts.length - 1]]
}

function writePath(target, parts, value) {
  let node = target
  for (const part of parts.slice(0, -1)) {
    const child = node[part]
    node[part] = child && typeof child === "object" && !Array.isArray(child) ? child : {}
    node = node[part]
  }
  node[parts[parts.length - 1]] = value
}

/**
 * Overlay an incoming config with the fields this form owns validated.
 *
 * Two rules, both learned the hard way:
 *
 * 1. **Unknown keys survive.** A settings form owns a handful of paths, not the
 *    whole config. `home`, `budget`, `verify`, `knowledge` and every group member
 *    this list does not name are file-level decisions, and dropping them because a
 *    form happened to be present would silently reset a tuned install.
 * 2. **An invalid owned value is dropped, not passed on.** `normalizeConfig`
 *    accepts anything, so a model name of `42` would travel all the way to the
 *    dispatcher and fail there, far from the field that caused it. Dropping it
 *    restores the default in one place the operator can see.
 */
export function mergeConfigValues(base, values) {
  const out = copyConfig(base && typeof base === "object" ? base : {})
  const source = values && typeof values === "object" ? values : {}
  // Everything the caller set survives first, so an untouched group is untouched.
  for (const [key, value] of Object.entries(source)) {
    if (out[key] && typeof out[key] === "object" && !Array.isArray(out[key]) && value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = { ...out[key], ...copyConfig(value) }
    } else {
      out[key] = copyConfig(value)
    }
  }
  // Then the owned fields are checked, coerced or dropped.
  for (const path of FIELD_ORDER) {
    const field = FIELDS[path]
    if (!field) continue
    const parts = path.split(".")
    const raw = readPath(source, parts)
    if (raw === undefined) continue
    let value = raw
    let ok = true
    if (field.type === "number") {
      const n = Number(raw)
      if (typeof raw === "boolean" || raw === null || !Number.isFinite(n) || n < 0) ok = false
      else value = n
    } else if (field.type === "boolean") {
      if (typeof raw !== "boolean") ok = false
    } else if (field.type === "array") {
      if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) ok = false
      else value = raw.slice()
    } else if (field.type === "string") {
      if (typeof raw !== "string") ok = false
    }
    if (ok) {
      writePath(out, parts, value)
    } else {
      // An untrustworthy value restores what the caller already had: deleting the
      // path would let a typo in the form silently reset a tuned default.
      const previous = readPath(base, parts)
      if (previous === undefined) dropPath(out, parts)
      else writePath(out, parts, copyConfig(previous))
    }
  }
  return out
}
export async function loadConfigSchema(importer) {
  let z
  try {
    const mod = await (importer ? importer() : import('@deepseek-ai/schemastery'))
    z = mod?.default
  } catch {
    return undefined
  }
  if (typeof z !== 'function' || typeof z.object !== 'function') return undefined
  try {
    const groups = new Map()
    for (const path of FIELD_ORDER) {
      const field = FIELDS[path]
      if (!field) continue
      const parts = path.split('.')
      const leaf = () => {
        let s
        if (field.type === 'number') s = z.number().default(field.default)
        else if (field.type === 'boolean') s = z.boolean().default(field.default)
        else if (field.type === 'array') s = z.array(z.string()).default(field.default)
        else s = z.string().default(field.default)
        // Volatile is what puts a field in the form; the host writes those back
        // into the profile patch document and hot-updates them in place.
        return s.volatile()
      }
      if (parts.length === 1) {
        groups.set(parts[0], leaf())
      } else {
        const [head, ...rest] = parts
        if (!groups.has(head)) groups.set(head, {})
        let node = groups.get(head)
        for (const part of rest.slice(0, -1)) {
          if (!node[part]) node[part] = {}
          node = node[part]
        }
        node[rest[rest.length - 1]] = leaf()
      }
    }
    const shape = {}
    for (const [key, value] of groups) {
      shape[key] = isLeaf(value) ? value : groupSchema(z, value)
    }
    return z.object(shape).default({})
  } catch {
    return undefined
  }
}

function isLeaf(node) {
  return typeof node === 'function' || (node && typeof node === 'object' && typeof node.type === 'string')
}

function groupSchema(z, node) {
  const shape = {}
  for (const [key, value] of Object.entries(node)) {
    shape[key] = isLeaf(value) ? value : groupSchema(z, value)
  }
  return z.object(shape).default({})
}
