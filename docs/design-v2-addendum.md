# 设计增补 v2 — 数学验证层、知识树、多子 agent 监管

> 来自 2026-11-06 讨论的四点要求。本文只写「要做什么、为什么这样、边界在哪」，实现细节随后落到代码。

---

## 0. 一句话

把「一轮轮试错」升级成三步：**先想象（便宜）→ 再形式化验证（确定）→ 最后跑真实评估（贵）**；
把「子 agent 各自为战」升级成**带租约、带看门狗、带结构化交接**的受管进程；
把「经验」从模型脑子里的模糊印象升级成**可归因、可隔离、可按阶段投放**的知识树。

---

## 1. 数学验证层（Lean 4）

### 1.1 为什么是 Lean，而不是「再问一遍模型」

LLM 评审是**可被说服的**：措辞、格式、自信程度都会改变它的判断。Lean 是这套系统里唯一的**不可贿赂的 oracle**：
它要么接受证明，要么给出精确的失败位置。对我们最值钱的三件事：

1. **快速否定**：一个错误的算法假设，在 Lean 里可能 3 秒就被 `omega`/`simp` 反驳，而在真实实验里要烧掉几小时 GPU 和几百美元。
2. **结构化分解**：Lean 的 proof state 本身就是一棵 **goal 树**——这正好是「大问题切成子问题、递归验证」的原生数据结构，不需要我们另造一个任务分解器。
3. **可复用的确定性产物**：证明一旦通过，永久有效（除非 statement 变了），可以进知识树当"已验证事实"，而不是"上次好像可行"。

### 1.2 流水线（新增两种节点）

```
imagine ──► claim ──► prove ──► check ──►（失败则回 prove，或把子目标 map 出去）
 (便宜)      (形式化)   (尝试)     (机器判定)
```

- **`imagine`（想象式探索，dream 风格）**：在写形式化陈述之前，先产生 N 个候选假设/算法骨架，用**零 LLM 成本**的手段粗筛：小规模穷举、随机测试、已知反例检索、量纲/单调性/边界条件检查。存活者才进入形式化。这一步存在的理由：形式化本身很贵，而大部分假设不值得形式化。
- **`claim`**：把自然语言命题写成 Lean `theorem`，输出结构化 `{statement, informal, assumptions[], imports[]}`。**必须能被 `lean` 解析**（哪怕是带 `sorry` 的骨架），否则直接打回。
- **`prove`**：在独立 worktree 里尝试补全证明，允许调用 `lake build`；失败时返回 **goal 列表**（Lean 的 error message 里带 unsolved goals），这些 goal 通过 `map` 节点递归下发——这就是"用数学把大问题划成子问题"的落地方式。
- **`check`（机械门，不可谈判）**：
  1. 编译通过；
  2. 文件内**没有** `sorry` / `admit`；
  3. **没有新增** `axiom` / `constant` / `@[implemented_by]` / `native_decide`（与基线做声明 diff）；
  4. `#print axioms <main>` 的依赖集合 ⊆ `{propext, Classical.choice, Quot.sound}`（允许按 campaign 配置放宽，但必须显式声明）；
  5. 只读 `imports` 白名单（防止偷换定义）。

### 1.3 诚实的边界

- Lean 能证的是**语义正确性与终止性**；**复杂度/性能**它管不了（除非引入 cost model，成本极高）。所以算法类战役的门是 **Lean（语义）+ benchmark（性能）** 双门，缺一不可。
- 形式化陈述本身可能**不是用户想要的东西**（statement mismatch 是这类系统最大的失败模式）。对策：`claim` 节点必须同时产出 informal 版本并**在人审检查点展示**，首个战役强制人确认一次，之后才允许自动。
- 工具链现实：本机目前**没有** Lean（`lean`/`lake`/`elan` 均不在 PATH）。所以：
  - 插件启动时做**能力探测**（`lake --version`），缺失时不报错、只在用到 `lean` 节点的战役上挂 `setup` 检查点，附精确安装命令；
  - 默认 **no-mathlib 模式**（只用 Lean core + `omega`/`simp`/`decide`），因为 mathlib 在 Windows 上一次构建可能几十分钟；
  - mathlib 按需 per-campaign `lake` 工程 + 共享构建缓存目录，避免重复构建。

---

## 2. 知识树：存与放分离

### 2.1 先看一个反例（来自 Open Dream-RSI 的负结果）

他们试过让系统自动生成「经验教训」注入后续回合：**命令式**的 lesson 让 TravelPlanner 通过数从 18/20 掉到 6/20；改成**陈述式**之后恢复。
结论不是"知识没用"，而是**注入的方式比知识本身更决定成败**。这直接决定了下面的设计。

### 2.2 数据结构

```
Lesson {
  id, scope: repo | campaign | task-class | algorithm-family,
  signature: { files[], errorClass, verifier, tags[] },   // 检索键，不是自由文本
  claim: string,            // 陈述式："X 与 Y 在 Z 条件下冲突"
  kind: fact | hazard | recipe,
  evidence: [eventRef...],  // 必须有出处，指到具体 attempt/round
  confidence: 0..1, status: candidate|active|stale|quarantined,
  ttlRounds, shownCount, harmCount, gainSum
}
```

树按 `signature` 建索引（同一文件/同一错误类聚成一簇），而非按语义相似度——语义检索会把"看起来相关但实际无关"的先验塞进提示词，这是污染的主要来源。

### 2.3 暴露策略（本设计的核心）

| 维度 | 规则 | 理由 |
|---|---|---|
| **阶段** | `explore` 阶段投放 0 条；`exploit`/`repair` 阶段最多 k=3 条 | 先验会杀死灵感；修复时才需要经验 |
| **句式** | 只投**陈述式**（fact/hazard），绝不投命令式步骤清单 | 命令式被证明有害；陈述式让模型自己推理 |
| **剂量** | 每次 attempt 记录"投了哪几条"，形成对照 | 没有对照就无法归因，知识树会退化成迷信集合 |
| **隔离** | 由任务 T 派生的 lesson 不得投给 T 的 holdout 同族任务 | 否则评估被污染，晋升毫无意义 |
| **毒性** | 投放了 L 的 attempt 比配对对照差 ≥σ → L 自动 quarantined | 自动止损，不需要人盯 |
| **写入** | 只从**配对证据**或**已验证产物**写 lesson，不从 agent 自我叙述写 | LLM 会编造因果，自述型经验是噪声源 |

> 这套机制顺带解决了 L1/L2 的归因问题：知识是"可投放的干预"，投放本身是实验，收益进知识树自己的信誉分。

---

## 3. 多子 agent 的监管

用户担心的三件事（调度、进程死掉没人管、历史丢失/上下文过长）分别对应三个机制：

### 3.1 租约 + 看门狗（进程死了要能发现）

- 每个 attempt 开工写 `leases/<attempt>.json { sessionId, startedAt, lastSeq, deadline }`；
- 调度器每次 tick 更新 `lastSeq`（从 `sessionController.inspect(sessionId)` 或 `session.events` 水位拿）；
- 独立 watchdog（比主 tick 更频繁，但仍是纯本地、零模型成本）判定：
  - `deadline` 到期 → interrupt + `attempt.abandoned{reason:'timeout'}`；
  - `now - lastActivity > stallMs`（默认 5 min，可配）→ 判定卡死，同样中断；
  - 会话不存在/进程已死 → 直接 `abandoned{reason:'lost'}`，**不重试同一个 session**（避免半途状态污染），需要时重新派一个干净会话。
- 宿主重启后：所有 `running` 状态先被物化为 `interrupted`，再按策略决定继续/放弃——**绝不假装它还活着**。

### 3.2 准入控制（调度风暴）

- 全局信号量 `maxConcurrent`（默认 2）+ 每战役上限；排队而不是并发爆炸；
- 每轮开始前检查预算三闸（轮数/美元/墙钟），任一触顶就收敛；
- 每 attempt 有 token 上限（`agentOptions.maxTokens`）——这是唯一能在 Windows 上真正兜住"失控烧钱"的闸门（没有 rlimit）。

### 3.3 上下文：交接用结构，不用历史

- worker 一律用 `spawn`（全新会话、零父上下文），**永不继承**长历史；
- 输入是**编译出的简报**：目标、任务、约束、≤k 条 lesson、上一次失败的原因摘要（不是全文）；
- 输出强制 `outputSchema` 的 `AttemptReport { changed, why, evidence, openQuestions, confidence, nextHint }`，落盘存档；
- 完整 transcript 只落磁盘、不进下一轮 prompt，用于事后审计与回放；
- 结果：单次 prompt 大小与轮数解耦，跑 100 轮也不会"越跑越傻"。

---

### 3.4 同级交流与剪枝（用户 m00599 追加要求）

交流与剪枝是同一件事的两面：信息要能流动，但流动必须有上限、有方向、有保质期。

**交流（board）**
- 每轮一块黑板 `rounds/<n>/board.jsonl`，只有两种 note：`obstacle`（我撞到的墙：验证器失败的尾部输出）与 `finding`（我验证过的机制提示：报告里的 `nextHint`）。
- 只有**后跑的候选**能读到先跑的 note（读侧 `excludeAttempt` 排除自己），最多 5 条，且简报里明确标注「未经验证的提示，不是指令」。
- 不带 transcript、不带完整 diff、不允许 agent 直接互相发消息——交流的内容永远是**结论级**的一两句话。
- 为什么这么窄：Gear 的经验是 agent 间共享上下文会迅速退化成互相模仿；ODR 的负结果（命令式 lesson 让 18/20 掉到 6/20）说明「怎么做事」的话一旦灌进去就压制探索。所以只允许「哪里撞墙了」和「什么机制有效」两类陈述句。

**剪枝（四层，全部可配）**
| 层 | 机制 | 默认 |
|---|---|---|
| 黑板 | `pruneNotes(board, {max})` 每轮结束保留最新 N 条，重复文本去重（保留最新并计数） | 20 条/轮 |
| 租约 | `sweepLeases` 删掉 7 天前已结束的租约；running 的永不删 | 7 天 |
| 上下文 | 只给简报（≤6000 字符）；attempt 只留 `stdoutTail`/`agentTail` 各 12–15 行 | 固定 |
| 工作树 | `keepWorktrees=false` 时每轮结束 `git worktree remove` | 关闭保留 |

**实现映射（M2 已落地，2026-11-06）**
- `src/runtime/lease.js`：`writeLease/updateLease/readLease/listLeases/clearLease/reconcileLeases/sweepLeases`；租约字段 `{attemptId, round, sessionId, startedAt, deadline, lastSeq, lastAdvanceAt, state, reason}`。
- `src/runtime/watchdog.js`：`Watchdog`，用 `ctx.sessions.get(id).seq`（回退 `snapshotEvents().length`）作水位，`stallMs` 默认 5 min、`graceMs` 默认 90 s（新会话还没建出来时不算卡死），到期或静默 → `abort()`（内部走 `subagents.interrupt`）并通知 `onStall`。
  - 与设计的差异：看门狗**没有独立的更快定时器**，它挂在同一个 ticker 上（20 s 一次），因为 `seq` 水位不需要秒级精度；少一个定时器就少一份「忘 dispose 就杀宿主」的风险。
- `src/runtime/runtime.js`：`recover()` 在 `apply()` 启动时对账（running 租约 → `attempt.abandoned{reason:'host-restart'}`，未闭合的 round → `round.finished{status:'interrupted'}`）；`tick()` 先 `watchdog.check()` 再按 `session.maxConcurrent` 准入；`liveAttempts()` 供 `rsi_status` 显示存活会话。
- `src/dispatch/brief.js`：`buildWorkerBrief` / `attemptReportSchema` / `parseAttemptReport` / `validateReport`；简报硬上限 6000 字符，超预算按 笔记 → lessons → 失败细节 → 截断任务 的顺序丢。
- `src/collab/board.js`：`boardPath/appendNote/readNotes/pruneNotes/summarizeNotes/normalizeText`。
- 事件新增：`attempt.abandoned{id, round, reason}`；round 上落 `abandoned: [{id, reason, at}]`。
- 测试：`tests/lease.test.mjs` 21、`tests/watchdog.test.mjs` 31、`tests/board.test.mjs` 64、`tests/brief.test.mjs` 96、`scripts/verify.mjs` 70、`scripts/e2e.mjs` 19（含「每个 attempt 一条租约且没留下 running」「黑板有界」）。

---

## 4. 我另外想加的几条

1. **人的注意力预算**：人也是被调度的资源。检查点上限（每 N 轮 ≤1 次）、合并投递、每条检查点必须带"要你决定什么 + 我的建议 + 备选项"。状态更新不该叫人。
2. **连续减半（successive halving）**：4 个候选先跑 1 个廉价筛选题，留 2 个跑全量，最后留 1 个。代码任务上通常省 50–70% 成本，比"每个候选都跑全量"务实得多。
3. **预注册**：evalset + min_gain + holdout 在第 1 轮前固定并哈希存档；事后改动即视为新一轮基线，不可与旧轮比较（防 p-hacking）。
4. **失败博物馆**：失败 attempt 保留「机制标签」（为什么失败），作为 hazard 类知识；不留全文。
5. **影响审计**：每条 lesson 的投放次数/收益/伤害都可查，季度性淘汰——知识树自身也要经受选择压。
6. **L3：插件改造自己**：把 `dsh-loom` 自身当一个战役目标（独立 worktree + 强制人审 + 回滚），这才是"循环本身也能被优化"的终点，但必须与用户仓库严格隔离。
7. **Windows 现实**：没有 rlimit，所有资源限制都靠调度器 + `taskkill /T` + 每 attempt token 上限；Lean 构建是这台机器上最慢的环节，缓存必须做。

---

## 5. 建议的实施顺序

| 阶段 | 内容 | 理由 |
|---|---|---|
| **M2** | 租约/看门狗/准入 + 结构化交接 + 崩溃恢复 + 同级交流与剪枝 | 不做这个，多开子 agent 就是赌博；它是后面一切的地基 ✅ 已完成（见 §3.4 实现映射） |
| **M3** | 知识树（存/放/隔离/毒性）+ 连续减半 | 让它越跑越聪明，但先有对照再谈收益 ✅ 已完成：`knowledge/select.js`（投放）、`knowledge/impact.js`（配对影响/派生/quarantine）、`runtime/halving.js`（4→2 先筛后跑） |
| **M4** | Lean 层（imagine → claim → prove → check）+ 子目标递归 | 依赖上面两者提供的调度与知识沉淀；且需要先装工具链 ✅ 已完成：`lean/scan.js`（sorry/axiom/native_decide/import 白名单）、`lean/gate.js`（编译 + `#print axioms`）、`lean/task.js`（任务级硬门）、`lean/imagine.js`（陈述产出 + 结构筛选，零成本砍掉空/重复/平凡/sorry/超长）、`rsi_lean` 的 `probe|check|imagine`；**未做**：把 Lean 的 unsolved goals 自动转成 `map` 子节点（子目标递归），以及首次 claim 的人审门——两者都依赖真实 Lean 工具链在本机可用后再验证 |
| **M5** | L2 循环策略回放（离线改 cadence/候选数，零 API 成本） | 有足够的落盘轮次做回放素材后再做，才有意义 ✅ 已完成：`loop/policy.js`（策略即数据）、`loop/replay.js`（历史重算）、`rsi_replay`（propose → 人审 → `policy.promoted`）、`rsi_dashboard` |
| **M7** | GUI 面板 + 多窗口所有权 | 用户 m01393 要求；面板是「人不在终端时也能看见并插手」的唯一途径 ✅ 已完成：`webServer` 路由 `/dsh-loom`（HTML，5 秒刷新）+ `/dsh-loom/state`（JSON GET）+ `/dsh-loom/action`（POST pause/resume/stop/decide）、`client/index.js`（侧栏 `RSI` 入口）、`core/lock.js` 改为心跳所有权（newest-writer-wins，旧窗口降级为只读） |

---

## 6. 实现映射补充（M4 / M5 / M6）

| 设计 | 实现 | 备注 |
|---|---|---|
| claim 的机械门 | `src/lean/scan.js` + `src/lean/gate.js` | 静态门先于编译，省一次 lake 冷启动；`#print axioms` 二次门 |
| 编译不过 = 该尝试失败 | `src/runtime/round.js` 的 `gateOk = ver.ok && lean.ok` | 数学门与测试门同权，任一不过都不晋升 |
| 任务怎么带证明 | `task.lean.{source,file,theorem}`，`src/lean/task.js` | 文件从 worktree 读，越界拒绝；缺文件给 `missing-file` |
| 工具链缺失怎么办 | `rsi_lean(action:"probe")` → `probeLean()` | 返回安装命令，不假装有 Lean |
| 策略作为数据 | `src/loop/policy.js` 的 `effectivePolicy({state,config})` | 晋升过的策略覆盖 config，未设字段回落 |
| 回放的诚实边界 | `src/loop/replay.js` | 只重算「谁赢、增益够不够、晋升几次」；不模拟换任务/换提示 |
| 策略怎么生效 | `rsi_replay(commit:true)` → `policy.proposed` + 检查点 → `rsi_decide approve` → `policy.promoted` | 零 API 成本的改动也必须过人这一关 |
| 面板（工具面） | `rsi_dashboard` 返回表格 + 活尝试 | 终端里最快的入口；与 GUI 面板共用 `runtime.status()` 同一份数据 |
| 面板（GUI） | `src/panel/api.js` + `client/index.js` | 宿主侧只加 `webServer` 路由（`/dsh-loom`、`/dsh-loom/state`、`/dsh-loom/action`），客户端手写懒 CJS 注册一个槽位入口；不引入构建步骤，面板本体是服务端渲染的 HTML，升级不会碎 |
| 多窗口所有权 | `src/core/lock.js` 的 `claimOwnership/ownerStatus/ensureOwner` | 旧规则（拿不到锁就 stand down）会让**所有窗口都没有工具**；新规则每个窗口都注册工具，只有心跳最新者派发回合，工具调用时按需接管 |
| 面板操作也要过所有权 | `panelAction` 里的 `runtime.ensureOwner()` | 只读观察任何窗口都能做，改动循环状态必须先成为 owner |
| L1 变异从哪来 | `src/chain/mutate.js` 的 `proposeMutations` | 四类小算子（候选数+1 / 最小改动 / 不许改测试 / 声明不确定）；变异只改**怎么工作**，不改验收标准 |
| L1 凭什么晋升 | `src/chain/evidence.js` 的 `compareChains` + `coverage` | 同一任务上配对比较；≥`chain.minTasks` 个配对任务、平均增益 ≥`minGain`、无单任务回归；三条任一不满足都不晋升 |
| L1 怎么生效 | `rsi_chain(action:"auto"|"compare"|"promote")` → `chain` 检查点 → `rsi_decide approve` → `chain.activated` | 与 L2 同样过人的关：链一变，后续所有轮次的证据都换了“工作方式” |
| 一个版本跑过哪些任务 | `round.started{taskId, chainVersion}` + 每 attempt 的 `chainVersion` | 没有这个标记，L1 就永远拿不到配对证据——这是 M6 的前置修正 |
| imagine 只筛不定 | `src/lean/imagine.js` | 筛掉空/重复/平凡/sorry/超长，剩下的**一定**要过编译器；想象阶段不产生“已验证”结论 |

## 7. 已知边界（交付时必须说清）

1. **L3（插件改造自己）未做**：设计里它是终点，但它需要一个隔离的出题人与回滚机制，风险等级高于其余各层。
2. **Lean 子目标递归未做**：需要真实 Lean 工具链；`rsi_lean(action:"probe")` 会先告诉你装没装。已确认两件事：elan 的 `bin` 不在 GUI 进程 PATH 上，且 **Windows 上 elan shim 每次调用约 34 秒**（它要解析 toolchain 并检查更新），而 toolchain 自己的二进制 0.08 秒。因此 `probe.js` 的 `leanBinDir()` 优先用 `<ELAN_HOME|~/.elan>/toolchains/*/bin`（要求 `lean` 与 `lake` 都在，按 mtime 取最新），shim 只作兜底，并把选中的目录前置进 `PATH` 供 `lake env lean` 使用。
3. **GUI 面板已做（M7），但没有客户端构建**：面板是服务端渲染的 HTML 页（`/dsh-loom`），客户端只贡献一个侧栏入口；没用 React 组件树，因此不能内嵌到会话流里，也不支持离线状态。
4. **成本估算只算 token**：按 m00150，人类时间单列、不进优化目标。
5. **Windows 无 rlimit**：真正的硬闸门是每 attempt 的 `maxTokens` 与调度器并发上限；`taskkill /T` 只保证进程树被杀干净。

## 8. M7 面板与多窗口（实现说明）

- **路由**：只注册一条 `exact` 路由 `/dsh-loom/state`——`GET` 返回 `panelState`（每战役的状态、轮次、花费、最佳分、知识条数、活尝试、未决检查点），`POST` 走 `panelAction`。渲染在客户端：`client/index.js` 注册 `sidebar.panellist` 入口与 `main` 面板，5 秒轮询同一路由。
- **为什么不加构建**：客户端半是手写懒 CJS（`window.__ModuleLoader__.load({id, factory})`），不引 bundler、不编译 JSX，用 `require('react')` 拿宿主同一份 React；槽位名对不上时只掉面板、不影响工具面（`ctx.slots?.inject?.(...)` 全程可选链）。
- **所有权语义**（`src/core/lock.js`）：每个窗口 `apply()` 都 `claimOwnership` 并**总是**注册工具；`tick()` 只在 `holdsOwnership` 时派发，其余窗口降级为只读观察并照常 `flushAll()`。工具里改状态的 6 个入口先 `runtime.ensureOwner()`，holder 死了或心跳超过 90 秒就接管，否则明确报错而不是静默执行两份循环。
- **心跳**：`tick()` 每轮刷新 `heartbeatAt`；`ownerStatus` 的 `fresh` 判定用 90 秒，远大于 tick 默认 20 秒，避免正常抖动被误判为「holder 已死」。

## 9. M8 对抗加固（chaos）

循环的钱、进程和时间都不归自己管，所以「正常路径对」不够。做法是先把五类坏情况写成**会失败的可执行规格**（`tests/chaos/`），再改代码到全绿——和整夜自优化用的是同一套机制。

1. **子进程死掉**：`classifyResult()` 把 dispatcher 的结果归一成 `ok | timeout | tokens | context | died | exhausted`。`died` 不给分、不换模型、不重试（换模型只是把账单翻倍），回合照常收尾。关键一条：`gateOk` 现在要求 `failureKind === 'ok'`——子进程没跑完就不算验证通过，此前「验证器在未改动的工作树上恰好 exit 0」会被当成证据。
2. **token 用尽 / 上下文爆掉**：`models.fallback` 是有序的降级链，只在 `tokens | context` 类失败上换下一个模型并记 `modelSwitch`；`context` 额外允许**一次**缩小简报的重试（丢掉 notes/lessons/plan，长度约减半），记 `retried:"smaller-brief"`。两者都不再静默变成 `no-gain`：全链用尽即 `round.finished.status="exhausted"` + `checkpoint{kind:"exhausted"}`。
3. **历史偏移**：`Ledger.normalize()` 只留有限 seq、按 seq 升序、同 seq 先到先得；`appendJsonl` 在追加前补换行，避免 torn 尾行吞掉新记录。事件溯源因此保持「物化视图可由日志重建」的前提。
4. **重启后的诚实恢复**（`src/runtime/recovery.js`）：账本里 `autopilot.applied` 只记了「应用过」而没记 commit，就不能算已落地。恢复时把这些轮次显式 `round.unlanded`（任务重新变为未解决），并只清理补丁自己 `new file mode` 建的文件 + `git checkout --` 恢复被改的已跟踪文件；**没有未提交证据时绝不动用户自己的脏工作区**（不用 `git clean -fd`）。同一份账本连跑两次恢复，第二次零写入。
5. **面板降级**：一块坏数据只降级对应的行/字段（`{id, error}`、`live: []`、`lean: null`），不允许一条坏战役把整个侧栏变成 500——操作者无法从 500 里 debug 任何东西。

**为什么不自动重试更多次**：重试是资源消耗，不是正确性。额度类失败靠换模型 + 交给人；进程死掉靠租约与看门狗识别；只有「成本已知且很可能成功」的场景（上下文超限）才值得自动重跑一次。

