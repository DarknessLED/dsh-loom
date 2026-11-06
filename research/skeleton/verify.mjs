// 不依赖 DSH 运行时的加载验证：假造一个最小 cordis ctx，直接跑 apply()。
// run: node verify.mjs
import { pathToFileURL } from 'node:url'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const stateDir = mkdtempSync(join(tmpdir(), 'rsi-verify-'))
process.env.RSI_STATE_DIR = stateDir
process.env.RSI_TICK_MS = '40'

const results = []
const ok = (cond, label) => {
	results.push([cond ? 'PASS' : 'FAIL', label])
	if (!cond) process.exitCode = 1
}

// ---- 最小 ctx 替身：只实现骨架用到的成员 ----
function makeCtx() {
	const tools = new Map()
	const effects = []
	const listeners = new Map()
	const ctx = {
		name: 'fake-ctx',
		effect(fn, label) {
			const dispose = fn()
			if (typeof dispose === 'function') effects.push({ label, dispose })
			return () => dispose?.()
		},
		on(event, cb) {
			if (!listeners.has(event)) listeners.set(event, [])
			listeners.get(event).push(cb)
			return () => listeners.set(event, (listeners.get(event) ?? []).filter((x) => x !== cb))
		},
		get(key) {
			return key === 'tools' ? ctx.tools : undefined
		},
		inject(_deps, cb) {
			const fiber = Promise.resolve(cb(ctx))
			return fiber
		},
		tools: {
			register(definition) {
				if (tools.has(definition.name)) throw new Error(`duplicate tool: ${definition.name}`)
				tools.set(definition.name, definition)
				return () => tools.delete(definition.name)
			},
			get: (n) => tools.get(n),
			schemas: () => [...tools.values()].map(({ name, description, parameters }) => ({ name, description, parameters })),
		},
		disposeAll() {
			for (const e of effects.reverse()) {
				try {
					e.dispose()
				} catch (err) {
					console.error('dispose threw', e.label, err)
				}
			}
			for (const cbs of listeners.values()) for (const cb of cbs) cb()
		},
	}
	return ctx
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- 1. 加载模块 ----
const mod = await import(pathToFileURL(join(HERE, 'index.js')).href)
ok(typeof mod.apply === 'function', 'export apply(ctx, config)')
ok(Array.isArray(mod.inject) && mod.inject.includes('tools'), `export inject = ${JSON.stringify(mod.inject)}`)

// ---- 2. apply 不抛、注册了 2 个 tool ----
const ctx = makeCtx()
mod.apply(ctx, {})
const names = ctx.tools.schemas().map((s) => s.name)
ok(names.includes('rsi_status'), `tool rsi_status registered (${names.join(', ')})`)
ok(names.includes('rsi_control'), 'tool rsi_control registered')
ok(ctx.tools.get('rsi_status').parameters.type === 'object', 'parameters 是合法 JSON Schema')

// ---- 3. tool 往返 + 错误处理 ----
const before = await ctx.tools.get('rsi_status').execute({}, {})
ok(before.state.running === false, 'status 初始 running=false')
await ctx.tools.get('rsi_control').execute({ action: 'start' }, {})
ok((await ctx.tools.get('rsi_status').execute({}, {})).state.running === true, 'control start → running=true')
let threw = false
try {
	await ctx.tools.get('rsi_control').execute({ action: 'nope' }, {})
} catch {
	threw = true
}
ok(threw, '非法参数 throw（宿主会转成 isError 结果）')

// ---- 4. 定时任务真的在跑，且状态落盘 ----
await sleep(200) // 40ms × ~5
const after = await ctx.tools.get('rsi_status').execute({}, {})
ok(after.state.ticks >= 3, `ticker 推进 ticks=${after.state.ticks}`)
const file = join(stateDir, 'state.json')
ok(existsSync(file), 'state.json 已写入 ' + file)
const onDisk = JSON.parse(readFileSync(file, 'utf8'))
ok(onDisk.ticks >= 3, `磁盘 ticks=${onDisk.ticks}`)

// ---- 5. 预算熔断 ----
await ctx.tools.get('rsi_control').execute({ action: 'reset' }, {})
await ctx.tools.get('rsi_control').execute({ action: 'budget', budget: 2 }, {})
await ctx.tools.get('rsi_control').execute({ action: 'start' }, {})
await sleep(220)
const capped = await ctx.tools.get('rsi_status').execute({}, {})
ok(capped.state.running === false && capped.state.ticks === 2, `budget 熔断 ticks=${capped.state.ticks} running=${capped.state.running}`)

// ---- 6. dispose 后定时器停止（在 running 状态下测，否则断言无意义）----
await ctx.tools.get('rsi_control').execute({ action: 'budget', budget: 9999 }, {})
await ctx.tools.get('rsi_control').execute({ action: 'start' }, {})
await sleep(60)
ctx.disposeAll()
const frozen = JSON.parse(readFileSync(file, 'utf8')).ticks
await sleep(200)
const stillFrozen = JSON.parse(readFileSync(file, 'utf8')).ticks
ok(frozen === stillFrozen && frozen > 0, `dispose 后 ticker 已停（ticks 冻结在 ${frozen}）`)

// ---- 7. 重启恢复：新实例从磁盘读回状态 ----
const ctx2 = makeCtx()
mod.apply(ctx2, {})
const resumed = await ctx2.tools.get('rsi_status').execute({}, {})
ok(resumed.state.ticks >= frozen && resumed.state.running === true, `重启后从磁盘恢复 ticks=${resumed.state.ticks} running=${resumed.state.running}`)
ctx2.disposeAll()

// ---- 8. 状态目录不存在时能自建（删掉整个目录再加载）----
rmSync(stateDir, { recursive: true, force: true })
const ctx3 = makeCtx()
mod.apply(ctx3, {})
await ctx3.tools.get('rsi_control').execute({ action: 'start' }, {})
await sleep(100)
ok(existsSync(file), '目录缺失时 apply + tick 会重新创建 state.json')
ctx3.disposeAll() // 不 dispose 的话 setInterval 会让进程永不退出（实测：verify 挂到 120s 超时）

console.log('\n' + results.map(([s, l]) => `${s}  ${l}`).join('\n'))
console.log(`\n${results.filter((r) => r[0] === 'PASS').length}/${results.length} passed`)
console.log(`home=${homedir()}  stateDir=${stateDir}`)
