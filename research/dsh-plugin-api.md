# DSH 插件开发技术报告 —— 面向「长期后台 RSI 循环插件」

> 目标读者：直接动手写 `dsh-rsi-loop` 的人。
> 证据标记：**【事实】**＝读到的源码/类型/运行输出；**【推断】**＝由签名推导但未实跑。
> 所有签名取自活体 inspect（`cordis_inspect_query`，比源码权威）与已安装插件源码。

调查环境：DSH 0.2.x（profile `desktop`），Electron 主进程，Node v24.21.0，Windows。
关键路径：
- DSH 本体（ASAR 内）：`C:\Software\DeepSeek Harness\resources\app.asar`
- 已装插件：`C:\Users\Darkness\.dsh\profiles\desktop\node_modules\`
- profile 清单：`C:\Users\Darkness\.dsh\profiles\desktop\package.json`

## 0. TL;DR（施工结论）

1. 插件 = 一个 ESM 包，**导出 `apply(ctx, config)`**（可选 `name`/`inject`/`Config`），在 `apply` 里用 `ctx.effect(() => ctx.tools.register(def), 'label')` 注册工具、用 `ctx.effect(() => { const h=setInterval(...); return () => clearInterval(h) })` 起常驻循环。**【事实】**
2. 插件跑在 **Electron 主进程的同一个 Node 进程**里，没有代码沙箱；`setInterval`、`spawn`、`webServer.register` 都能用，但**一次同步阻塞会卡死整个 UI**。**【事实/推断】**
3. 「后台会话」不用自己造：`ctx.sessionController.create()` 建会话 → `prompt({mode:'queue'})` 投递任务并**立即返回 `{accepted:true}`**（不阻塞主 agent 回合），结果落进那个会话的 log，UI 侧栏可见。**【事实】**（签名）/**【推断】**（不阻塞语义）
4. 后台跑 LLM 回合的现成实现可抄：`subagents`（startActivation/sendMessage）与 `agentLoop`（createAgent/resume）+ `@nanmicoder/dsh-agent-teams`、`ralph` 对应的 `workflowEngine`。**【事实】**
5. 状态别指望 `ctx.storage`（类型在 ASAR 里，插件侧不可 grep），**自建目录 + 原子写 JSON** 是社区标准做法（`dsh-unlag`、blender 都这么做）。**【事实】**
6. 最致命的三件事：定时器回调里抛异常、`ctx.inject()` 返回的 thenable 不 catch、`apply` 里同步 throw（后者只是**静默失效**，最难查）。**【事实】**

## 1. 插件包最小结构 / 加载链路 / 本地安装

### 1.1 最小 `package.json` **【事实】**
```json
{
  "name": "dsh-rsi-loop",
  "version": "0.1.0",
  "type": "module",
  "main": "./index.js",
  "exports": { ".": { "default": "./index.js" } },
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } },
  "engines": { "node": "^22.19 || >=24", "dsh": ">=0.2.0-rc.2 <0.2.2-0" },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.4", "@deepseek-ai/dsh": ">=0.2.0-rc.2 <0.2.2-0" },
  "peerDependenciesMeta": { "@deepseek-ai/cordis": { "optional": true }, "@deepseek-ai/dsh": { "optional": true } }
}
```
- `dsh.bundle.patch`：该包作为**组合包(bundle)** 时贡献的 patch 文件（字符串或有序数组）。**没有它，`dsh plugin add` 会把它当普通依赖装**，不会成为 profile 层。**【事实，见 blender 的 cordis.patch.yml 注释】**
- `engines.dsh` 存在时**只由它**决定版本门禁；否则逐个匹配 `peerDependencies` 里所有 `@deepseek-ai/dsh*` 范围。空/无效范围 = 不兼容。**【事实】**
- `dsh.client`：仅当有 client 半时才需要，`{ "platform": "web", "inject": ["@deepseek-ai/dsh-api-gateway", "@deepseek-ai/dsh-client-ui-renderer", ...] }`。**【事实】**
- `dsh-plugin.json`（dsh-std manifest v0.15）是给 market/manager 用的**可选**增强，加载不需要它。**【事实】**

### 1.2 host 半 vs client 半 **【事实】**
| | 入口 | 形态 |
|---|---|---|
| host | `main` / `exports["."]` | ESM，导出 `apply(ctx, config)` |
| client | `exports["./client"]` + `dsh.client` | 浏览器端 `window.__ModuleLoader__.load({id, chunk, factory})`，`factory(u)` 返回 `{ mount }` |

### 1.3 加载链路 **【事实】**
`$DSH_HOME/profiles/<name>/package.json` → `dsh.profile.bundles[]`（有序）→ 每个 bundle 的 `dsh.bundle.patch` 按序拼接 → 再叠加 profile 的 `cordis.patch.yml` → 最后 `$DSH_HOME/cordis.patch.yml`（**home 级优先级最高**）→ 按 patch 里的 `insert: [{id, name, config}]` 逐个 import 并 `apply`。
- **patch 是整行替换 `config`，不合并**：想在 bundle 层改一个字段，必须重述全部字段。**【事实】**
- 同 id 多次写入 → **最后一次获胜**。**【事实】**
- 空 patch 文件/只有注释会导致启动失败，要禁用该层请写 `[]`。**【事实】**
- `name` 可以是**包名、子路径、绝对路径、file URL**（相对 `./`/`../` 会按 patch 文件位置解析）。**【事实】**

### 1.4 三种本地安装方式
**A. 改 profile 清单（推荐，可复现）** **【事实】**
改 `C:\Users\Darkness\.dsh\profiles\desktop\package.json`：`dependencies` 加 `"dsh-rsi-loop": "file:C:/Projects/RSI/research/skeleton"`，`dsh.profile.bundles[]` 末尾追加 `"dsh-rsi-loop"`，然后在 profile 目录跑 `node pnpm.mjs install`。改动被 `dsh-hmr` 监听，HMR 开启时自动重载。

**B. CLI**：`dsh plugin --profile desktop add <path|包名>`（会初始化 base-based profile 并写 bundles）。**【事实】**

**C. 最省事的开发回路（不改 bundles）**：直接写 `$DSH_HOME/profiles/desktop/cordis.patch.yml` **【事实】**
```yaml
- insert:
    - id: dsh-rsi-loop
      name: 'file:///C:/Projects/RSI/research/skeleton/index.js'
      config: { tickMs: 5000 }
```
> 注意：`disabled: true` 可停用某行；`!!js process.platform === 'win32'` 可做平台门控。

## 2. `apply(ctx, config)` 契约与 ctx 能力

### 2.1 模块导出形态 **【事实】**（`@dsh-external/dsh-blender-plugin/lib/index.js:264-355`）
```js
export const name = '@dsh-external/dsh-blender-plugin'
export const inject = ['tools']            // 硬依赖：apply 执行时 ctx.tools 必定存在
export const Config = z.object({ ... })    // schemastery schema，宿主自动补默认值+做设置页
export function apply(ctx, config) { try { ... } catch (e) { log(e) } }
```
- `inject` = **硬依赖**；软依赖用 `ctx.get('tools')` 并判空。**【事实】**
- `Config` 依赖 schemastery，包名在 DSH 版本间有 `schemastery` / `@deepseek-ai/schemastery` 两形态 → blender 用**运行期动态解析 + 降级**；静态 `import` 会 `ERR_MODULE_NOT_FOUND` 让插件整体消失。**【事实】**
- `apply` 里**同步 throw 只产生一条警告**，插件静默不工作 → 必须自己 try/catch 并打日志。**【事实】**

### 2.2 ctx 关键能力（RSS 插件会用的）
| 能力 | 签名 / 用法 | 证据 |
|---|---|---|
| `ctx.effect(fn, label?)` | `fn()` 的返回值（disposer）在 fiber 销毁时调用 | 75 个已装插件文件在用 **【事实】** |
| `ctx.on(event, cb)` | 事件订阅，返回 disposer | **【事实】** |
| `ctx.get(name)` | 软取服务，可能 `undefined` | **【事实】** |
| `ctx.inject(deps, cb)` | 依赖就绪后执行 `cb(scopedCtx)`，返回 **thenable fiber** | **【事实】** |
| `ctx.plugin(plugin, config?)` | 挂子插件（独立 fiber）：`ctx.plugin(mcpClient, cfg)`、`ctx.plugin({ inject:['tools'], apply(scoped){} })` | **【事实，dsh-ops/lib/modes/native.js:70】** |
| `ctx.tools` / `ctx.timer` / `ctx.jobs` / ... | 见 §3/§6 | **【事实】** |
| `ctx.set(k,v)` | ⚠️ 已装插件里 `ctx.set` 的 4 处命中都是 **HTTP 请求上下文** 的 `ctx.set("jwtPayload")`，不是注册服务 | **【事实：未找到服务注册用法】** |

> 隐藏能力 **【事实】**：`Agent` 的公开类型只有 `{ readonly id: SessionId }`，但运行时对象带 `ctx`；`dsh-ops` 用 **`agent.ctx.plugin({inject:['tools'], apply(scoped){...}})`** 做**按 agent 注册工具**。要 per-agent 工具就这么写，类型上需要 `as any`。

## 3. 工具注册

### 3.1 契约（`tools` 服务 referencedTypes，逐字）**【事实】**
```ts
interface ToolSchema { deferLoading?: true; name: string; description: string; parameters: Record<string, unknown> }
interface ToolOutputDefinition { readonly schema: JsonSchemaNode; render(args: unknown, value: JsonValue): ContentBlock[]; presentationMeta?(args, value): JsonValue }
interface ToolDefinition extends ToolSchema {
  readonly output: ToolOutputDefinition
  execute(args: unknown, exec: ToolRunContext): Promise<unknown>
  projectContent?(exec, result): ContentBlock[] | undefined
  finalizeContent?(exec, result): ContentBlock[] | undefined
  timeoutMs?: number
  isConcurrencySafe?(args: unknown): boolean
  presentCall?(args): ToolCallView | undefined
  presentResult?(args, result): ToolResultView | undefined
}
interface ToolRunContext extends ToolExecution { deferContext(context: UserMessage): void; concludeTurn(): void }
```
`tools` 方法：`register(definition): () => void`、`restrict(filter)`、`guard(guard)`（同步，返回 string 即拒绝）、`get(name, scope?)`、`schemas(scope?)`、`execute(exec)`、`presentAs('native'|'ptc')`、`executionMode(exec)`。**【事实】**
- 同一层重名、或占用保留名 `run_code` → 注册失败。**【事实】**

### 3.2 真实写法（`@dsh-external/dsh-blender-plugin/lib/index.js:1818+`）**【事实】**
```js
ctx.effect(() => ctx.tools.register(vTool({
  name: 'blender_rt_see',
  description: '…',
  parameters: {                       // ← 扁平 map，由 defineTool 归一化成 JSON Schema
    max_size: { type: 'integer', description: '最长边像素，默认 560' },
    force:    { type: 'boolean', description: '…' },
  },
  output: { schema: ANY_SCHEMA, render: renderOne },   // render(args, value) → ContentBlock[]
  isConcurrencySafe: () => true,
  timeoutMs: T.see,                                    // 必须是常量，不能按参数动态给
  async execute(args, exec) { ... return value },
})), '@dsh-external/dsh-blender-plugin: rt_see')
```
- `parameters` **两种风格都行**：扁平 map（需 `defineTool` from `@deepseek-ai/dsh-tools` 归一化）或完整 JSON Schema（`{type:'object',properties,required}`，`@v587d/capital-generation` 直接用这种、还能省略 `output`）。**【事实】**
- 返回值 = **lossless JSON**：`undefined` / `NaN` / `Infinity` / `-0` 会被宿主门拒收，blender 专门写了 `losslessSanitize` 兜底。**【事实】**
- 抛异常 → 变成 `isError` 结果（`{isError:true, error:{message, info?}}`），不是崩溃。**【事实】**
- `exec` 上有 `agent`、`signal`、`callId`、`deferContext(msg)`（晚点喂上下文）、`concludeTurn()`（立即收回合）。**【事实】**

### 3.3 长任务 / 流式 **【事实 + 推断】**
- **没有** tool 侧的 token 流式 API；模型只看到最终 `value`。要"边跑边看"就：`presentResult` 渲染卡片 + 把进度写进状态文件，另注册查询工具。
- 长任务两条路：
  1. **同步 execute + 大 `timeoutMs`**（blender 最大 1_920_000ms）。⚠️ 会占住一个工具槽，且宿主有 `dsh-tool-call-timeout-policy`：**只有自己声明 `timeoutMs` 才设截止**，不声明就可能被上游默认值提前砍。**【事实，blender 注释】**
  2. **promoted 回执**：`execute` 立刻返回 `{ jobId }`，实际活交给 `ctx.jobs.start(spec)` / 子进程，再用 `rsi_status` 工具查询。**【事实：blender 的 "promoted 回执(jobId)" 模式；jobs 服务签名见 §6】**

## 4. 子 agent / 会话（后台跑 LLM 回合）

### 4.1 首选：`sessionController`（投递 prompt，不等结果）**【事实签名】**
```ts
create(request: { workspaceId?, cwd?, sessionId?, agentPreset? }): Promise<{ sessionId, agentPreset? }>
prompt(request: { requestId, sessionId, mode: 'queue' | 'steer', content: readonly PromptContentPart[], clientTimeZone? }, signal): Promise<{ accepted: true }>
resolveAgent(sessionId): Promise<{ agent } | { error }>      // 拿到活体 Agent（不激活）
inspect(sessionId, signal?): Promise<SessionInspection>       // 只读、不激活 Agent
fork / cancel / page / follow / projections / list / search / rename
```
> `prompt` 的语义是 "Admit one prompt after explicitly resuming its Session"，返回的是 **acknowledgement**，回合在后台继续跑 → 这就是「后台会话不阻塞主回合」的官方入口。返回后如何得知完成：`ctx.on('session/event')`、`sessionController.follow()`、或 `subagents.waitForChildren()`。**【事实（签名）/推断（不阻塞 + 完成通知路径）】**

### 4.2 `subagents`（父子子 agent）**【事实签名】**
```ts
startActivation(spec: SubagentActivationSpec): Promise<SubagentActivation>
//   spec: { provider, label, childId?, request: SubagentStartRequest, signal, delivery: 'parent'|'caller' }
//   → { childId, messageId?, result: Promise<SubagentResult>, dispose(): Promise<void> }
sendMessage(sender: Agent, targetId: SessionId, content: ContentBlock[], options: { signal }): Promise<MessageId>
interrupt(targetSessionId, authority: {kind:'user',parentSessionId} | {kind:'ancestor',agent})
waitForChildren(parent: Agent): Promise<boolean>   |  listChildren(parentSessionId, signal?)
listDescendants(rootSessionId, signal?) / drainChildren / drainDescendants
registerProvider(provider) / getProvider(name) / list(): string[] / resolveMaxDepth(configured?)
```
```ts
interface SubagentStartRequest { cwd?; agentPreset?; label?; prompt: ContentBlock[]; parent: Agent; signal: AbortSignal; agentOptions?; outputSchema?; maxDepth? }
interface SubagentResult { output: readonly ContentBlock[]; structured?: unknown; diagnostic?: string; stopReason: 'completed'|'aborted'|'error'|'max-tokens'|'refusal' }
```
- `delivery: 'parent'` = 结果回父会话；`'caller'` = 回调用方。**【事实】**
- `sendMessage` 对 **running** 目标在最近 step 边界接收，对 **idle** 目标**直接起一个新回合**，目标不在场则 **cold-resume**。→ 这就是「给 subagent 下发任务」的通用手段。**【事实】**
- 需要 `parent: Agent` → 插件在**没有活跃回合**时必须先拿 Agent（见 4.4）。**【推断】**

### 4.3 `agentLoop`（自己造 agent）**【事实签名】**
```ts
create(id: SessionId, options?: AgentOptions, meta?: Pick<SessionHeader,'cwd'>): Promise<Agent>          // 纯新建，无父、不阻塞
createAgent(ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle>                      // 生命周期挂在 ownerCtx 上
resume(ownerCtx: Context, options: ResumeAgentOptions): Promise<AgentHandle>                           // 从持久化恢复
interface AgentHandle { agent: Agent; dispose(): Promise<void> }
interface CreateAgentOptions { sessionId; parentAgent?; meta?{cwd,parentSession,isSeeded,origin:'subagent',delegationDepth,agentPreset}; inheritedEventCount?; seed?: SessionEvent[]; agentOptions?: {provider,model,reasoningEffort,maxTokens}; signal?; setup?: AgentSetup }
interface ResumeAgentOptions { resumeSessionId; parentAgent?; agentOptions?; signal?; setup? }
```
> `createAgent(ownerCtx,...)` / `resume(ownerCtx,...)` 的 `ownerCtx` 决定生死：**用插件自己的 ctx**，插件卸载即销毁；用 `ctx.root` 就活到应用退出。**【事实（签名）/推断（owner 语义按 cordis fiber 一致）】**

### 4.4 没有活跃 agent 时怎么拿到一个 Agent **【事实能力拼图 + 推断】**
- `ctx.agents.currentInitiator(): Agent | undefined`（工具回调之外通常是 undefined）；`ctx.agents.create(options)` / `get(id)` / `roots()`
- `ctx.sessionController.create({cwd})` → `resolveAgent(sessionId)` → `{ agent }`；或 `ctx.agentLoop.create(id): Promise<Agent>`

### 4.5 可抄的现成实现
- `@nanmicoder/dsh-agent-teams` → 服务 `agentTeams`：`spawnTeammate(caller, req)`、`sendMessage`、`createTask/getTask/listTasks/updateTask`、`waitForChange(caller, timeoutMs, signal)`、`interrupt`、`membership`、`listMembers`。**【事实】**
- `workflowEngine`（DSH 内置 workflow 工具）+ 事件 `workflow/start|phase|log|agent-start|agent-end|end`。**【事实】**
- `goals`：`get/create/edit/pause/resume/complete/clear/disarm/block(agent, ...)`，`GoalView` 型的**长期目标**——RSI 的"持续循环直到目标达成"可直接用它做状态机，且自带 `goal/changed` 事件。**【事实】**

## 5. 事件目录（host，共 76 条）与 hook

### 5.1 有 pre/post tool hook 吗？—— **有，4 个瀑布（waterfall）**
| 事件 | 形态 | 用途 |
|---|---|---|
| `tools/pre-execute` `(this: Scoped<ToolRuntime>, exec: ToolExecution, next: () => Promise<PreToolDecision>)` | waterfall | 允许/拒绝/取消/**先问用户** |
| `tools/post-execute` `(this, exec, result: Readonly<ToolExecutionResult>, next: () => Promise<PostToolDecision>)` | waterfall | 接受/替换/加料/阻断 |
| `tools/execute` `(this, exec: ToolDispatchExecution, next)` | waterfall | 包一层做超时/重试/指标 |
| `tools/result` `(this, exec, result)` | emit | 只观察冻结结果（记账/审计首选） |

**【事实】** 另有 `tools/change`、`tools/ptc-dispatch-log`。

### 5.2 回合 / 生命周期（做"回合结束后继续循环"就靠这些）**【事实】**
- `agent/status` `(this: Scoped<Agent>, payload: {agent, status: AgentStatus})` — emit，`idle ⇄ running`，**空闲检测就用它**
- `agent/turn-stopping` `(this, {agent, turn, signal}): Promise<void>|void` — serial，回合即将关闭
- `agent/pre-step` `(this, {agent, messages, turn, step, signal}, next: () => Promise<PreStepDecision>)` — waterfall，可拒/替换进入 step 的消息
- `agent/created` / `agent/disposed` / `agent/error` / `agent/request`(waterfall，改模型调用配置) / `agent/request-error`
- inbox：`agent/inbox/inserted` / `agent/inbox/claimed` / `agent/inbox/discarded`（payload `{agent, message, turn?}`）
- Session：`session/created`、`session/event`（commit 后 fire-and-forget）、`session/flush`（parallel，会 await 所有监听器）、`session/disposed`
- Session log 事件（`SessionEventMap`）：`turn/start{turn}`、`turn/end{turn, reason: TurnEndReason}`、`step/start`、`step/end`、`user/message`、`developer/message`、`system/message`、`assistant/message{usage?}`、`tool/call{callId,name,arguments}`、`tool/result{error?,meta?}`、`request/header`、`request/context`
- `TurnEndReason`：`completed | aborted{reason} | blocked | error{error} | max-tokens | interrupted | forked`
- 子 agent：`subagent/start`、`subagent/end`、`subagent/provider-added|removed`
- 目标：`goal/changed`、`goal/activation-changed`；定时：`schedule/changed`
- 审批/问答：`approval/request`（waterfall）、`user-questions/request`（waterfall）

### 5.3 其它值得一提 **【事实】**
`app-boot/config-reload`（重载成功）、`hmr/change|reload`、`plugin-manager/changed|install-log|install-state`、`fs/write-intent|edit-intent|observed`（可以拦截写盘）、`llm/stream`（waterfall，可改流）、`system-prompt/assemble`（waterfall，可给所有 agent 注入 RSI 提示词）、`webserver/index-inject`、`workspace/session-stop`、`settings/document-updated`、`commands/change`、`skills/change`。

## 6. 进程模型 / 后台运行 / 持久化

### 6.1 进程模型 **【事实（能力和失败模式）/推断（进程归属）】**
- 插件宿主模块由 Electron 主进程的 Node 直接 `import`。证据：插件里直接 `os.homedir()` / `process.env` / `child_process.spawn` / `fs`，无任何注入；且未捕获 rejection 会让**应用以非零码退出**。**【推断，证据强】**
- ⇒ **单线程**：`apply` 里跑长同步循环会冻结整个 UI。CPU 重活必须丢子进程（blender 就是这么干的：spawn 自己的 `runtime/server.mjs`，主进程只做 HTTP 探活）。
- 可以：`setInterval`、`node:child_process`、`fetch`、`node:http` server、`ctx.webServer.register`（复用 GUI 的端口）。

### 6.2 定时器 **【事实】**
- `ctx.timer`（`@deepseek-ai/cordis-plugin-timer` 混入）：`timeout(cb, delay)`、`timeout(delay)`、`interval(cb, delay)`、`interval<R>(delay)`（AsyncIterable）、`throttle`、`debounce` —— 每种都返回 disposer。
- 也可以裸 `setInterval`，但**必须**放在 `ctx.effect(() => { const h = setInterval(...); return () => clearInterval(h) })` 里（blender 的 watchdog 就是裸 setInterval + ctx.effect）。

### 6.3 状态存储
- `ctx.storage`（`backend`/`mount`/`form`）+ `storageDomain`（`open(spec)` → `Domain<S>`）存在，但**插件侧拿不到 `StorageForms` 类型**（ASAR 内，`node_modules` 里 grep 无结果）。**【事实】**
- ⇒ **推荐：自建目录**。`dsh-unlag` 写 `~/.dsh/unlag-switches.json`，blender 读 `~/.dsh/dsh-blender.config.json`；写盘用 **`writeFileSync(tmp)` + `renameSync`** 原子替换。**【事实】**
- 建议布局（推断）：
  ```
  ~/.dsh/rsi-loop/{state.json, candidates.jsonl, sessions.json}   # 运行态 / 候选池(追加写) / 会话映射
  ```

### 6.4 重启恢复 **【事实能力 + 推断拼装】**
1. `apply()` 里从磁盘读 state（骨架已实现）。
2. 后台会话：存 `sessionId`；重启后 `ctx.sessionController.prompt({sessionId, ...})` 会自动 resume（"explicitly resuming its Session"），或 `agentLoop.resume(ctx, {resumeSessionId})`。
3. 未完成的长任务：`ctx.jobs` 有 `list()/get(id)/wait(id, timeoutMs)`，可枚举恢复。
4. `app-boot/config-reload` = 配置热重载完成，可此时重读 state。

### 6.5 后台作业服务 `jobs` **【事实签名】**
`start(spec: JobSpec): JobId`、`list(caller?)`、`get(id, caller?)`、`read(id, caller?)`、`readAt(id, from, caller?)`、`kill(id, caller?, reason?)`、`wait(id, timeoutMs, caller?, signal?): Promise<JobView>`、`remove(id)`、`attachController(name)`、`events`。

## 7. 人机交互面

### 7.1 向会话注入消息 **【事实 + 推断】**
- 最正规：`sessionController.prompt({requestId, sessionId, mode:'queue'|'steer', content})` → 作为 **user message** 进 log 并触发回合。
- 只要"提示"不要回合：工具里 `exec.deferContext(userMessage)`（下一 step 前插入上下文）；或 `systemPrompt.section()/context()` 常驻注入系统提示。
- 给正在跑的会话插话：`subagents.sendMessage(...)` 或 `prompt({mode:'steer'})`。

### 7.2 审批 / 提问 **【事实】**
```ts
approval.request(req: ApprovalRequest): Promise<ApprovalOutcome>   // 也可挂在 'approval/request' 瀑布里做策略
approval.setPolicy(agent, policy) / approval.overrideOf(session)
userQuestions.ask(request): Promise<AskUserQuestionAnswer>
userQuestions.askTimed(request & {agent}, callId, timeoutMs) / answer(agent, callId, answer) / attachWait(agent, callId, signal)
```
> RSI 的"审阅候选"可以走 `userQuestions.askTimed`：后台循环到关键节点时弹一个可超时的选择题，超时走默认策略。

### 7.3 client 半（设置页 / 控制面板）**【事实】**
构建产物协议：
```js
window.__ModuleLoader__.load({ id: "dsh-rsi-loop", chunk: "client.js", factory: u => {
  const React = u("react")
  function mount(ctx) {   // ctx = client 侧 cordis ctx（有 effect / slots / locale / logger）
    ctx.effect(() => () => { /* 清理 */ }, "rsi: panel")
    return () => React.createElement("div", null, "RSI")
  }
  return { mount } })
挂载到槽位（真实调用形态，来自 `@michengai/dsh-agency-agents` 与 `@v587d/capital-generation` 的 client bundle）：
```js
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: 'rsi-loop', order: 20,
  label: () => t('settings.nav'), locale, icon: 'expert',
}, () => React.createElement(SettingsPage)))
```
已观测到的槽名：`settings.section`（设置页分区）、`conversation.input.left`（输入框左侧按钮）、`plugins.bundle.config`（组合包配置页）、toolview 槽（`slots.register({name: <toolName>, key: 'render_chart'}, View)`）。
样式用主题 token `--dsw-alias-*`（`--dsw-alias-border-l1`、`--dsw-alias-bg-layer-1`、`--dsw-alias-label-secondary`、`--dsw-alias-brand-primary`），CSS 靠 `document.createElement('style')` 注入并在 `ctx.effect` 里移除。
> ⚠️ 本次 `cordis_inspect_query(platform="client", provider="Slots", method="listSubTree")` **超时**（无活跃页面响应），槽名以上述 dist 产物为准。想看权威清单：先打开 GUI 页面再查。

### 7.4 最小控制面板方案（推断，最省事）
- **不做 client 半**：注册工具 `rsi_status` / `rsi_control(action: start|pause|budget|reset)` + 用 `presentResult` 渲染卡片。模型和用户都能操作，零前端成本。
- 要图形化：`settings.section` 挂一个面板，通过 `ctx.remote`/fetch 打到 host 的 `ctx.webServer.register({kind:'exact', path:'/rsi/state', handler})`。

## 8. 权限与沙箱

**【事实】**
- 插件代码**没有**独立的代码沙箱：它和宿主同进程，直接 `fs` / `spawn` / `fetch`。README 明确写版本门禁与权限清单**不是恶意代码沙箱**。
- `dsh-plugin.json` 的 `permissions[]`（`scope: "subprocess" | "filesystem-read" | "dsh-home"`）是**声明式**的（给 market/manager/审计看），不产生运行时拦截。
- **沙箱只作用于"工具调用派生出的进程"**：`sandboxPolicy.resolve(request?)` → `SandboxPolicy`，`sandbox.confine(argv, policy, signal)` → 受限 argv；`sandboxPolicy.defaultMode`、`workspaceRoot`、`overrideOf(session)`。
- 反证：blender 插件用 `child_process.spawn` 直接起后端，**完全绕过** sandbox → 插件自身的子进程不受 DSH 沙箱约束。
- 文件写盘钩子 `fs/write-intent` / `fs/edit-intent` 只在走 `ctx.fs` 的路径上生效；插件自己 `writeFileSync` 不受管。
- 本会话策略是 `danger-full-access`（文件无限制），但**审批提示被禁用**：任何需要 approval 的操作会被直接拒绝。写插件时不要依赖"用户会点同意"。

> 施工建议：RSI 插件自己给自己立规矩——子进程用绝对路径白名单、写盘只写 `~/.dsh/rsi-loop/` 与目标 workspace、所有 shell 一律 `ctx.subprocess.spawn` 或显式 `sandboxPolicy`+`confine` 以继承宿主策略。

## 9. 可运行最小骨架（已实测）

目录 `C:\Projects\RSI\research\skeleton\`：

| 文件 | 作用 |
|---|---|
| [index.js](skeleton/index.js) | host 半：`name`/`inject`/`apply`，2 个工具（`rsi_status`、`rsi_control`）+ 常驻 ticker + JSON 状态原子读写 |
| [package.json](skeleton/package.json) | 最小清单：`type:module`、`main`、`exports`、`dsh.bundle.patch`、`engines.dsh`、可选 peerDeps |
| [cordis.patch.yml](skeleton/cordis.patch.yml) | `insert: [{id, name, config}]`，id 稳定 |
| [verify.mjs](skeleton/verify.mjs) | 假造最小 cordis ctx，直接 `import` 并跑 `apply()`，15 条断言 |

### 9.1 关键代码骨架（index.js 要点）
```js
export const name = 'dsh-rsi-loop'
export const inject = ['tools']                     // 硬依赖

export function apply(ctx, config) {
  try {
    let state = loadState(dir)                      // 作用域内 → 重载/重启后从磁盘恢复
    ctx.effect(() => ctx.tools.register({           // ① 工具
      name: 'rsi_status', description: '…',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: { schema: {...}, render: (_a, v) => [{ type: 'text', text: textOf(v) }] },
      isConcurrencySafe: () => true, timeoutMs: 10_000,
      async execute(args, exec) { return { dir, tickMs, state } },
    }), 'dsh-rsi-loop: tool(rsi_status)')

    ctx.effect(() => {                              // ② 定时任务
      const h = setInterval(() => {
        try { if (!state.running) return; tick(); flush() }
        catch (e) { log('tick failed:', e?.message ?? e) }   // ③ 必须兜住
      }, tickMs)
      return () => clearInterval(h)                 // ④ 必须清理
    }, 'dsh-rsi-loop: ticker')

    ctx.on('dispose', () => flush())
  } catch (error) { log('apply failed:', error?.stack ?? error) }
}
```

### 9.2 验证方法（不需要 DSH 运行时）
```bash
NODE="C:/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe"
cd C:/Projects/RSI/research/skeleton
"$NODE" --check index.js && "$NODE" --check verify.mjs
"$NODE" verify.mjs
```
实测输出（Node v24.21.0）：`15/15 passed`，退出码 0。
覆盖：导出形状 / `inject` / 两个工具注册 / `parameters` 是合法 JSON Schema / 非法参数 throw / ticker 真的推进（`ticks=4`）/ `state.json` 落盘 / budget 熔断（`ticks=2, running=false`）/ dispose 后 ticker 冻结 / 重启从磁盘恢复 / 目录缺失时自建。

### 9.3 进真实 DSH 的验证步骤 **【推断，按 §1.4 走】**
1. `dependencies` 加 `"dsh-rsi-loop": "file:C:/Projects/RSI/research/skeleton"` + `bundles` 追加；或直接在 profile `cordis.patch.yml` 里 insert 绝对路径。
2. 重启 DSH（或等 HMR），日志里应出现 `[dsh-rsi-loop] loaded, state=…`。
3. 让模型调 `rsi_status` / `rsi_control({action:"start"})`，确认 `~/.dsh/rsi-loop/state.json` 里 `ticks` 在涨；并用 `cordis_inspect_query(platform="host", provider="Tool", method="listTools")` 反证工具已注册。

## 10. 做不到 / 有坑（附证据）

1. **定时器与 stream 回调里抛出的未捕获异常 = 直接杀应用** **【事实】**。app-boot README 失败模式表：*"同步回调（流的 `'data'` 监听器、定时器）在任何时刻抛未捕获异常 → 致命"；"从 `apply()` 返回的 Promise 之外产生未处理 rejection → 致命错误，释放应用并以非零码退出"*。实测：`verify.mjs` 忘了 dispose 最后一个 ctx，进程挂到 120s 超时（`[still running after 120000ms; moved to background job]`）→ 泄漏的 interval 同样让宿主进程不退出。
2. **`apply` 里同步 throw 只产生一条警告，插件静默消失** **【事实】**。所以 blender 专门做了"降级也要注册一个诊断工具"（`registerSchemaDiagnostic`）。写插件必须自己 try/catch 并落日志。
3. **`ctx.inject()` 返回的 thenable fiber 必须 catch** **【事实】**(`dsh-unlag`、`dsh-ops` 都写 `Promise.resolve(fiber).catch(...)`)；漏掉就是一个宿主级 unhandled rejection → 见坑 1。
4. **patch 是"整行替换 config"而非合并** **【事实】**。在 bundle 层只写 `{tickMs: 100}` 会把其它字段全冲掉；且同 id 以**最后一次写入**为准（home 级 patch 压过 profile）。
5. **工具回执必须是 lossless JSON** **【事实】**。`undefined`/`NaN`/`Infinity`/`-0` 会被宿主门拒收，整条通道报错；blender 为此写了 `losslessSanitize`。另外 `parameters` 扁平 map 只在走 `defineTool` 时才合法，直接 `tools.register` 必须给完整 JSON Schema。
6. **HMR 重载时旧实例不会被正常 dispose** **【事实】**。`dsh-unlag` 用 `globalThis[Symbol.for('dsh-unlag.xxx')]` 槽传递所有权，并在 `dispose` 里判断"我是否还是当前实例"才拆资源；否则新老实例互相拆台（重复注册工具、双份定时器）。
7. **不能同时用"注入式"和"bundle 式"两种装配** **【事实，blender patch 注释】**：两个 fiber 重复注册同名工具 → 直接失败。切换装配方式前先删掉旧的。
8. **版本门禁不是沙箱** **【事实】**：`engines.dsh` / `peerDependencies` 只管能不能装；插件代码想干什么就能干什么（同进程、无 confinement）。同理 `dsh-plugin.json` 的 permissions 只是声明。
9. **没有 tool 级流式输出** **【事实（契约里没有）】**：模型只看到最终 `value`，中途进度得靠状态文件 + 查询工具 + `presentResult` 卡片。
10. **`Agent` 公开类型只有 `{id}`** **【事实】**：想拿 `agent.ctx` / 更宽形状必须类型断言（`dsh-ops` 里 `agent.ctx.plugin(...)` 就是运行期事实、类型上不存在）。

## 11. 给 RSI 的落地方案（推断，基于以上事实拼装）

```
[host 插件 dsh-rsi-loop]
 ├─ 状态层  ~/.dsh/rsi-loop/{state.json,candidates.jsonl}   原子写
 ├─ 调度层  ctx.effect(setInterval) 每 N 秒 tick：读 state → 决定是否轮到下一轮
 ├─ 执行层  每轮 = sessionController.create() 建/复用后台会话
 │          → prompt({mode:'queue', content:[RSI 任务书]})   立即返回，不占主回合
 │          → ctx.on('session/event') 监听 turn/end 收结果
 │          → subagents.startActivation({delivery:'parent'}) 需要并行候选时用
 ├─ 审阅层  userQuestions.askTimed(...) 弹候选审阅，超时走默认
 ├─ 控制层  工具 rsi_status / rsi_control(start|pause|budget|reset) + presentResult 卡片
 └─ 预算层  goals.create/edit 记账；达到 budget 自动 pause 并写 state.note
```
关键点：**主 agent 回合永不被阻塞**（`prompt` 只回 admission ack），后台会话在 UI 侧栏有自己的条目；插件重载后靠 `state.json` + `sessionId` 恢复（`prompt` 会自动 resume）。
