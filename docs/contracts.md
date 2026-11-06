# dsh-loom 内部契约（v0，M1）

插件布局：`src/index.js`（apply）→ `src/runtime/runtime.js`（状态/事件）→ `src/runtime/round.js`（回合引擎）→ 三个纯模块。

约束：**零运行时依赖**，只用 node 内置模块；ESM；Node ^22.19 || >=24；所有导出必须能在无 DSH 运行时的情况下被单测 import。

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
