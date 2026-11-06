// DSH host-side plugin skeleton (ESM, zero runtime deps).
// 目标形态：1 个 tool + 1 个常驻定时任务 + 本地 JSON 状态读写。
// 参照实现：@dsh-external/dsh-blender-plugin/lib/index.js（export name/inject/Config/apply + ctx.effect）
// 验证：node verify.mjs   （不需要 DSH 运行时）
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-rsi-loop'

// 硬依赖：cordis 保证 apply() 执行时 ctx.tools 一定存在（等价于 ctx.inject(['tools'], ...)）
// 若写成可选依赖，就必须自己判空：const tools = ctx.get('tools'); if (!tools) return
export const inject = ['tools']

const DEFAULT_TICK_MS = 5_000
const STATE_FILE = 'state.json'

const log = (...a) => console.error('[dsh-rsi-loop]', ...a)

function resolveDir(config) {
	return process.env.RSI_STATE_DIR || config?.stateDir || join(homedir(), '.dsh', 'rsi-loop')
}

function loadState(dir) {
	try {
		return JSON.parse(readFileSync(join(dir, STATE_FILE), 'utf8'))
	} catch {
		return { running: false, ticks: 0, budget: 0, spent: 0, lastTick: null, note: '' }
	}
}

// 原子写：写 .tmp 再 rename。dsh-unlag 也是这个写法（HMR 重载/断电不会留半个 JSON）
function saveState(dir, state) {
	mkdirSync(dir, { recursive: true })
	const tmp = join(dir, STATE_FILE + '.tmp')
	writeFileSync(tmp, JSON.stringify(state, null, 2))
	renameSync(tmp, join(dir, STATE_FILE))
}

// 工具回执：必须 lossless JSON（undefined/NaN/Infinity/-0 会被宿主门拒收）
function textOf(value) {
	if (typeof value === 'string') return value
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}

const output = {
	schema: { type: 'object', additionalProperties: true },
	render: (_args, value) => [{ type: 'text', text: textOf(value) }],
}

export function apply(ctx, config) {
	try {
		const dir = resolveDir(config)
		const tickMs = Number(process.env.RSI_TICK_MS) || config?.tickMs || DEFAULT_TICK_MS

		// 状态在 apply 的作用域里 → 插件重载/应用重启后重新从磁盘读，天然可恢复
		let state = loadState(dir)
		const flush = () => {
			try {
				saveState(dir, state)
			} catch (e) {
				log('state write failed:', e?.message ?? e)
			}
		}

		ctx.effect(() => ctx.tools.register({
			name: 'rsi_status',
			description: '读取 RSI 后台循环的当前状态（运行中/轮次/预算/最近一次 tick 时间）。',
			// 这是完整 JSON Schema；如果改用 @deepseek-ai/dsh-tools 的 defineTool，
			// 可以写扁平 { field: {type, description} } 由它归一化。
			parameters: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
			output,
			isConcurrencySafe: () => true,
			// 声明静态上限；不声明则宿主超时策略可能在上游给默认值时抢先中断（blender 插件踩过）
			timeoutMs: 10_000,
			async execute() {
				return { dir, tickMs, state }
			},
		}), 'dsh-rsi-loop: tool(rsi_status)')

		ctx.effect(() => ctx.tools.register({
			name: 'rsi_control',
			description: '控制 RSI 后台循环：start / pause / budget / reset。',
			parameters: {
				type: 'object',
				properties: {
					action: { type: 'string', enum: ['start', 'pause', 'budget', 'reset'], description: '要执行的动作' },
					budget: { type: 'integer', description: 'action=budget 时的轮次预算（>=0）' },
				},
				required: ['action'],
				additionalProperties: false,
			},
			output,
			timeoutMs: 10_000,
			async execute(args) {
				const action = String(args?.action ?? '')
				if (action === 'start') state.running = true
				else if (action === 'pause') state.running = false
				else if (action === 'budget') {
					const budget = Number(args?.budget)
					if (!Number.isInteger(budget) || budget < 0) throw new Error('budget 必须是 >=0 的整数')
					state.budget = budget
				} else if (action === 'reset') {
					state = { running: false, ticks: 0, budget: 0, spent: 0, lastTick: null, note: '' }
				} else {
					throw new Error(`未知 action: ${action}`)   // throw → 宿主转成 isError 结果
				}
				flush()
				return { ok: true, action, state }
			},
		}), 'dsh-rsi-loop: tool(rsi_control)')

		// 常驻循环。两条铁律：
		//  1) 必须包 try/catch —— 定时器回调里抛出的未捕获异常在 DSH 里是致命的（详见报告“坑”章节）
		//  2) 必须返回 disposer —— 插件卸载/HMR 重载时由 cordis 清掉
		ctx.effect(() => {
			const handle = setInterval(() => {
				try {
					if (!state.running) return
					if (state.budget && state.ticks >= state.budget) {
						state.running = false
						state.note = 'budget exhausted'
						flush()
						return
					}
					state.ticks += 1
					state.lastTick = Date.now()
					flush()
				} catch (e) {
					log('tick failed:', e?.message ?? e)
				}
			}, tickMs)
			return () => clearInterval(handle)
		}, 'dsh-rsi-loop: ticker')

		ctx.on('dispose', () => flush())
		log(`loaded, state=${dir}, tickMs=${tickMs}`)
	} catch (error) {
		// apply 的同步抛出只会让宿主记一条警告，插件静默失效 → 自己兜住并留痕
		log('apply failed:', error?.stack ?? error)
	}
}
