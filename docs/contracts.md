# dsh-loom 内部契约（v0，M1）

插件布局：插件入口（apply）→ 运行时（状态/事件/tick）→ 回合引擎 → 一组不依赖宿主即可单测的纯函数模块；每个模块的职责见下面的模块地图。

约束：**零运行时依赖**，只用 node 内置模块；ESM；Node ^22.19 || >=24；所有导出必须能在无 DSH 运行时的情况下被单测 import。

## 模块地图

`src/` 下每个模块的职责如下；后续各节给出关键模块的详细契约。新增模块必须在这里补一行，说明它为什么存在。

### 入口与工具

- `src/index.js` — 插件入口：`apply()` 归一化配置、抢占所有权锁、创建 `Runtime`，并注册工具与面板路由；卸载时释放锁。
- `src/tools/index.js` — 注册全部 `rsi_*` 工具（start/status/control/chain/evalset/decide/report/lean/replay/dashboard），把工具参数翻译成事件或纯函数调用。
- `src/tools/output.js` — 工具输出描述符：无损 JSON schema 进、文本卡片出的统一封装，避免每个工具手写一遍返回形状。

### chain/ — 链（L1）

- `src/chain/spec.js` — 校验链规格的 JSON 结构（节点类型、版本、参数、节点 id），返回人可读的错误字符串数组，供提案检查点直接展示。
- `src/chain/templates.js` — 内置 `code-fix` / `refactor` 两条种子链与 `templateFor(name)`，主 agent 复制一份后按任务改写。
- `src/chain/evidence.js` — 把回合日志折成 (version, task) 配对分数表，并按任务数、增益、单任务回归三项给出链晋升判定。
- `src/chain/mutate.js` — 四种小而可审的链变异（多加候选、最小改动、禁止改测试、声明不确定性），一次只改工作方式，不改验收标准。

### collab/

- `src/collab/board.js` — 同一回合内兄弟尝试共享的追加式 JSONL 便签板（障碍/发现/做法），带长度裁剪与摘要，避免各自重复踩同一个坑。

### core/ — 状态与基础设施

- `src/core/atomic.js` — 原子落盘原语：临时文件加 rename 的 JSON 写、JSONL 追加/读取、无损序列化，供所有状态文件复用。
- `src/core/config.js` — 默认配置与归一化：tick 周期、预算、gate 阈值、检查点、静默时段、会话与定价表，非法值一律回落默认。
- `src/core/ledger.js` — 只追加的事件日志：序号从文件现状分配以兼容热重载双写者，所有派生状态都必须能由它重建。
- `src/core/lock.js` — 面板所有权锁：newest-writer-wins 的抢占、心跳刷新、存活/过期判定，以及只删自己记录的释放。
- `src/core/paths.js` — 状态目录布局：`~/.dsh/loom` 根、campaign 目录校验、目录创建与安全文件名片段。
- `src/core/reduce.js` — 纯 reducer：把事件序列折叠成 `state.json` 形状的 campaign 状态，是面板与工具读到的同一份事实。
- `src/core/services.js` — `ctx.get(name)` 的服务解析垫片，让 effect、定时器、工具回调都能在不声明 inject 的地方取到宿主服务。

### dispatch/ — 子会话

- `src/dispatch/brief.js` — 编译有上限的 worker 简报（固定小节顺序、经验/便签配额），并解析与校验子 agent 返回的单个 JSON 尝试报告。
- `src/dispatch/session.js` — `Dispatcher`：为每次尝试起一个无父上下文的全新子会话，负责 prompt、取消与释放。

### exec/ — 进程与工作树

- `src/exec/verifier.js` — 跑验收命令：`spawn` + `shell`、每流 64KB 尾部裁剪、超时杀进程树、按正则抽取 `metrics`，失败只进返回值不抛。
- `src/exec/worktree.js` — git worktree 生命周期：创建/移除、HEAD 快照、diff 统计、提交与回滚，全部 `git -C` 且有超时。
- `src/exec/patch.js` — 把尝试的改动导出为补丁文件，并在晋升或回滚时正向应用或反向撤销。

### gate/

- `src/gate/gate.js` — 纯函数晋升门：尝试打分、轮内排序，以及按增益/任务数/holdout 回归四选一决定是否晋升；对畸形输入不抛异常。

### knowledge/ — 经验

- `src/knowledge/impact.js` — 用「同轮、同任务、一处理一对照」的配对证据给经验计分，区分增益与伤害，并把有害经验隔离出去。
- `src/knowledge/select.js` — 经验选择策略：过期判断、任务匹配、评分公式与配额裁剪，控制一轮最多给 worker 看几条。

### lean/ — Lean 门

- `src/lean/scan.js` — Lean 门的廉价半边：剥注释后扫描 `sorry`、新公理、`native_decide` 等违规与 import 白名单，纯函数不碰磁盘。
- `src/lean/probe.js` — 探测本机 Lean 工具链是否可用（elan/lean 路径、版本），缺失时给出安装命令而不是静默下载几个 GB。
- `src/lean/gate.js` — 完整 Lean 门：源码扫描 → 真实编译 → 公理报告，三者都通过才算证明，stderr 已裁到首个 error。
- `src/lean/task.js` — 任务级 Lean 门：读取任务里的 Lean 声明、拒绝工作树外的路径，并复用 `checkLemma` 作为第二道机械门。
- `src/lean/imagine.js` — 证明前的廉价筛选：从文本抽取定理声明，按任务相关性与去重裁到最多 N 条，并生成 imagine 提示。

### loop/ — 循环策略（L2）

- `src/loop/policy.js` — 把循环策略（增益阈值、候选数、知识注入、halving、holdout slack）变成可归一化、可比较的纯数据。
- `src/loop/replay.js` — 只重放数值决策的策略回放：同一批回合在不同阈值下会晋升几次；明确不模拟换任务或换提示。

### panel/

- `src/panel/api.js` — 浏览器面板唯一数据源：读物化状态返回 JSON，写操作复用与工具相同的事件追加。

### report/ — 审计与导出

- `src/report/export.js` — 把 campaign 折成一个版本化、可 JSON 往返的自包含包（目标、链、策略、评测集、落地产物），供 `rsi_export` 写到 `export/bundle.json`，让证据能随代码一起归档。
- `src/report/digest.js` — 面向人的有界追读摘要：表头（campaign、状态、轮数、结论、花费）、最新在前的回合行、按风险排序的待决评审、经验计数；不含 stdout/patch/JSON，行数与行长都有硬上限，`rsi_report` 以它开头。

### runtime/ — 回合与运行时

- `src/runtime/candidates.js` — 候选模式的自适应推断：`adaptiveCandidateMode(rounds)` 只看最近 `minRounds` 个「有测量」的回合，若每轮都采样了两个以上候选且每个候选都是满分 1，说明第二意见从未改变结果，下一轮应改为 `cascade`（先跑一个、满分就收手）；历史太短、只有一个候选或存在非 1 分时一律回落 `parallel`。是否启用由 `config.loopPolicy.autoCandidateMode` 决定，显式 `candidateMode` 永远优先，来源记在 `round.finished.candidateModeSource`（`config`/`auto`/`default`）。
- `src/runtime/cost.js` — 从子会话 usage 累计 token 并按配置定价估算美元；缺失 usage 时用 transcript 长度给出带 `estimated` 标记的上界。
- `src/runtime/deferred.js` — 静默时段计算：把落在 quiet hours 内的检查点推迟到窗口结束的瞬间，既不投递也不丢弃。
- `src/runtime/exposure.js` — 决定本轮哪个候选看到经验：只暴露一个且按回合轮换，保证同一轮存在真正的对照组。
- `src/runtime/guard-reuse.js` — 守卫复用：当 autopilot 的 guard 命令作为独立子句逐字出现在任务的 verify 命令里时，验证器跑的就是同一件证据，于是从交给验证器的命令中删掉该子句，晋升后不再重复 spawn，只在 `autopilot.applied` 记 `guard:'reused-verifier'` 并照常提交；guard 不是同一命令时仍恰好运行一次。
- `src/runtime/halving.js` — 轮内 successive halving：先用廉价的 screen 验证器淘汰一半候选，再只为幸存者付真实尝试成本。
- `src/runtime/hold.js` — 人工「暂缓」的到期时刻：读取 `config.checkpoint.holdMs`（缺省 6 小时），非法或非正值回落默认，保证暂缓永远指向未来而不是偷偷变成立即回答。
- `src/runtime/ids.js` — 检查点 id 生成：时间戳加定宽单调计数器，保证同一毫秒内多次 raise 也不碰撞。
- `src/runtime/lease.js` — 尝试租约：记录「本该在跑」的尝试，崩溃重启时对账，并按 TTL 清扫陈旧租约。
- `src/runtime/notify.js` — 检查点通知：只在该决策时唤醒主会话一次；静默时段写 `checkpoint.deferred` 并由 tick 补发，且永不重复投递。
- `src/runtime/plateau.js` — 平台期判定：连续 N 轮没有 `promoted === true` 就认为停止进步，供检查点与面板使用。
- `src/runtime/quality.js` — 战役证据健康度：把回合账本折成通过率、增益、停滞等少数指标，供报告与面板给出同一结论。
- `src/runtime/review.js` — 待决队列排序：按风险（holdout/anomaly 高、gate/policy 中、其余低）再按提出时间与 id 排列，为每条决策生成单行摘要与动词短语建议，供 `rsi_status` 渲染。
- `src/runtime/recovery.js` — 重启恢复：找出「记了落地但其实没提交」的回合并显式撤回，只清理补丁自己新建的文件，绝不动用户原有的改动。
- `src/runtime/recon-reuse.js` — 规划复用：以基提交 sha、链版本、任务与节点提示拼出 key，缓存上一轮的侦察计划；树没动就直接复用（`reused:true`、耗时记 0）并照常把计划交给 worker，HEAD 一变即重新规划；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/round.js` — 回合引擎：选任务、起候选、跑验证器与 Lean 门、记分与计成本、执行晋升/回滚并 raise 各类检查点。
- `src/runtime/runtime.js` — `Runtime`：campaign 生命周期与 tick 派发，含所有权心跳、watchdog 看护、租约对账和状态缓存。
- `src/runtime/sampling.js` — 确定性选题：普通轮在未解决任务间轮转，每 `holdoutEvery` 轮消耗一个 holdout 任务，可重放。
- `src/runtime/selector.js` — 选题策略：跳过已满分任务以免浪费回合，全部做满时报告 `allSolved` 让调度收尾。
- `src/runtime/triangle.js` — 效率/质量/成本三角的聚合定义：把回合记录折成每秒轮、并行度、验证器占比、晋升率与 token 成本，面板、报告与 `scripts/loom-metrics.mjs` 共用同一套口径。
- `src/runtime/verifier-reuse.js` — 验证器复用：按补丁字节（sha1）加验证命令缓存裁决，同一战役里补丁完全相同的后到候选项继承前一次的 ok/exitCode/输出并把 durationMs 记 0，只对真正启动的验证器计入 verifierRuns；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/switch.js` — 循环总开关：`~/.dsh/loom/switch.json` 存 enabled/at/by，另开 `switch.jsonl` 审计；翻转绝不写 campaign 日志，所以 seq 不偏移、恢复时也无需重新汇总。
- `src/runtime/watchdog.js` — 看护运行中的尝试：以子会话事件水位而非 pid 判断存活，租约到期或 `stallMs` 无事件即写掉。

## 1. `src/exec/verifier.js`

```js
/**
 * @param {{cmd: string, cwd?: string, timeoutMs?: number,
 *          metrics?: Record<string, {pattern: string, group?: number}>}} spec
 * @param {{cwd: string, timeoutMs?: number, env?: Record<string,string>}} opts
 * @returns {Promise<{
 *   ok: boolean,            // exitCode === 0 && !timedOut
 *   exitCode: number|null,
 *   signal: string|null,
 *   timedOut: boolean,
 *   durationMs: number,
 *   stdout: string,         // capped, tail kept
 *   stderr: string,
 *   metrics: Record<string, number>,
 *   command: string,
 *   cwd: string,
 * }>}
 */
export async function runVerifier(spec, opts)
```

要求：
- Windows 上 `shell: true`（cmd 是复合命令），用 `child_process.spawn`，stdout/stderr 各保留尾部 ≤64KB。
- 超时 → kill 进程树（Windows 用 `taskkill /pid <pid> /T /F` 兜底），`timedOut: true`。
- `metrics`：对 stdout 跑 `pattern`（RegExp 字符串），取 `group ?? 1`，`Number()` 解析，解析失败不写该键。
- 不抛异常（除参数非法）；失败信息进返回值。

## 2. `src/exec/worktree.js`

```js
export async function isGitRepo(dir): Promise<boolean>
export async function createWorktree({repo, dir, branch, baseRef = 'HEAD'}): Promise<void>   // 已存在则先 remove
export async function removeWorktree({repo, dir}): Promise<void>                            // 尽力而为，不抛
export async function diffStat({dir}): Promise<{files:number, insertions:number, deletions:number, filesChanged:string[]}>
export async function hasChanges({dir}): Promise<boolean>
```

要求：全部用 `git -C <repo>` 形式；超时 60s；错误信息要带 stderr；`removeWorktree` 先 `git worktree remove --force` 再 `rm -rf` 兜底。
注意仓库可能有很多未跟踪文件，`diffStat` 用 `git diff --numstat HEAD` 覆盖已跟踪改动即可。

## 3. `src/gate/gate.js`（纯函数，无 IO）

```js
/**
 * 汇总一次 attempt 的评估结果
 * @param {{attemptId:string, taskScores?: Record<string, number>,
 *          verifierOk: boolean, metrics?: Record<string, number>}} attempt
 * @returns {number} 0..1
 */
export function scoreAttempt(attempt)

/**
 * 一轮内排序：返回 {best, ranked}
 * @param {Array<{id:string, score:number, verifierOk:boolean}>} attempts
 */
export function rankAttempts(attempts)

/**
 * 晋升判定
 * @param {{
 *   candidate: {score:number, holdoutScore:number|null},
 *   incumbent: {score:number, holdoutScore:number|null}|null,
 *   config: {minGain:number, holdoutSlack:number, minTasks:number},
 *   evidence: {tasksEvaluated:number, holdoutEvaluated:number, complete:boolean},
 * }} input
 * @returns {{promote:boolean, reason:string, delta:number, checks:Record<string,boolean>}}
 */
export function decidePromotion(input)
```

规则（写死，单测覆盖）：
- `evidence.complete === false` → reject("incomplete evidence")。
- `evidence.tasksEvaluated < minTasks` → reject("insufficient tasks")。
- `incumbent == null` → promote iff `candidate.score > 0`（首轮基线）。
- `delta = candidate.score - incumbent.score`；`delta < minGain` → reject("gain below threshold")。
- `candidate.holdoutScore != null && incumbent.holdoutScore != null`：`candidate.holdoutScore < incumbent.holdoutScore - holdoutSlack` → reject("holdout regression")。
- 其余 → promote，reason 带 delta 与 holdout 数据。

## 4. `src/dispatch/session.js`（lead 负责）

```js
export class Dispatcher {
  constructor({ctx, config})
  async run(prompt, {cwd, timeoutMs, label}): Promise<{sessionId, text, usage, stopReason, error?}>
  cancel(sessionId): void
  dispose(): void
}
```

## 5. `src/runtime/round.js`（lead 负责）

```js
export async function runRound({runtime, view, config, dispatcher, log}): Promise<void>
```

事件序列：`round.started` → 每个 attempt 一次 `attempt.finished` → `candidate.proposed` →（可选）`gate.evaluated` → `artifact.promoted` → `round.finished`。

---

## 8. Lean 门（M4）

```js
// src/lean/scan.js — 纯函数，不碰磁盘
scanSource(source, { allowedImports, allowAxioms }) -> { ok, violations: [{ code, detail }] }
// code ∈ empty | sorry | axiom-decl | native-decide | implemented-by | unsafe | import | allow-list
checkAxioms(axioms, { allowAxioms }) -> { ok, violations }
buildCheckSource({ source, theorem, imports }) -> string

// src/lean/gate.js
checkLemma({ source, theorem, imports, allowedImports, allowAxioms, dir, compiler, run, timeoutMs, keep })
  -> { ok, stage: 'scan'|'compile'|'axioms', violations, axioms, theorem, exitCode, stdout, stderr, durationMs, file, dir }

// src/lean/task.js
runTaskLeanGate({ task, config, worktree, run }) -> null | { ok, skipped } | checkLemma 结果
```

语义：`ok === true` 是**唯一的放行条件**；`stage` 说明拦在哪一步；`violations[0].code` 是给人看的分类。
`gate` 失败时 `stderr` 已裁剪到首个 `error` 行（≤1200 字符），避免把整份 lake 日志塞进上下文。

## 9. L2 循环策略（M5）

```js
// src/loop/policy.js
normalizePolicy(raw, base = POLICY_DEFAULTS) -> { minGain, candidates, knowledge, halving, holdoutSlack }
effectivePolicy({ state, config }) -> policy      // 晋升过的策略覆盖 config，未设字段回落
diffPolicy(a, b) -> { <field>: { from, to } }

// src/loop/replay.js — 纯函数
replayRounds({ rounds, policy }) -> { decisions: [{ n, promote, reason, score, delta }], metrics, policy }
comparePolicies({ rounds, base, candidate }) -> { base, candidate, delta, verdict }
// verdict ∈ candidate-better | candidate-worse | no-difference | no-evidence
```

语义：回放只重算**数值决策**（谁赢、增益是否过线、晋升几次），不模拟换任务或换提示；
`no-difference` 不算证据，因此 `commit` 出去的提案默认仍要人审（`policy.proposed` → 检查点 → `rsi_decide approve` → `policy.promoted`）。
`candidates` 变小时只保留前 N 个已记录的尝试——这正是「候选少一半，选项也少一半」的诚实含义。

## 10. L1 链条演化（M6）

```js
// src/chain/evidence.js — 纯函数
chainEvidence({ rounds }) -> [{ version, task, score, round }]   // 每个 (version, task) 取最好分
byTask(rows, version) -> Map<task, score>
compareChains({ rounds, baseVersion, candidateVersion, minTasks = 6, minGain = 0.05, holdoutSlack = 0.02 })
  -> { ok, reason, checks: { enoughTasks, gain, noRegression }, paired, pairedTasks,
       baseScore, candidateScore, delta, worst }
// reason ∈ not-enough-tasks | gain-too-small | regressed-a-task | promote
coverage(rounds) -> [{ version, tasks }]

// src/chain/mutate.js
mutateChain(base, { kind, version, rationale }) -> { kind, spec } | null
proposeMutations(base, { fromVersion, max = 3 }) -> [{ kind, spec }]
// kind ∈ candidates+1 | minimal-change | no-test-edits | state-your-uncertainty
```

语义：**promote 是四选一，不是打分**——任务数不足、增益不够、任一任务回归，任一命中就不晋升，且 `ok === false`。
`regressed-a-task` 排在 `gain-too-small` 之后判定：先看整体是否值得，再看有没有把某个任务做坏。
`mutateChain` 不修改 `base`；返回 `null` 表示这类变异在当前链上不适用（没有 map 节点、候选数已达上限 4）。
一次晋升只改**工作方式**，不改验收标准——验收标准属于 `evalset`，改它等于换考题。

事件：`chain.proposed{version, spec, parent}` → `chain.proposed` + `checkpoint.raised{kind:"chain"}` → `chain.activated{version}`
（`round.started` 与每次 `attempt.finished` 都带 `chainVersion`，这是 L1 拿到配对证据的唯一来源。）

## 11. 面板与多窗口所有权（M7）

```js
// src/panel/api.js
registerPanel(ctx, { runtime, config, log }) -> void      // ctx.effect 注册三条路由
panelState({ runtime }) -> { campaigns, live, ownership, lean, at }
panelAction({ runtime }, { campaign, action, decision, note })
  -> { ok, campaign, action, decision?, open? }           // action ∈ pause|resume|stop|decide

// src/core/lock.js
claimOwnership(home, meta) -> { ok, file, record, previous }
heartbeat(file, meta) -> boolean            // 只在仍持有所有权时刷新 heartbeatAt
holdsOwnership(file) -> boolean
ownerStatus(file, { now, staleMs = 90000 }) -> { owner, mine, alive, fresh }
releaseLock(file) -> boolean                // 只删自己的记录
```

路由：

| 方法 | 路径 | 语义 |
|---|---|---|
| GET | `/dsh-loom/state` | `panelState` JSON，单战役读取失败只替换该行为 `{id,error}` |
| POST | `/dsh-loom/state` | `{campaign, action, decision?, note?}`；写操作先 `ensureOwner()` |

语义：**所有权不是独占访问，是独占派发**——每个窗口都注册工具、都能读；只有心跳最新者跑 `tick()` 派发回合。
`claimOwnership` 是 newest-writer-wins，因此旧窗口不会因为「先启动」而永久占住循环，也不会出现两个窗口同时派发。
`decide` 走的是与工具路径相同的 `checkpoint.answered` 事件（`answer.source = "panel"`），所以面板和模型看到的是同一份决策记录。
