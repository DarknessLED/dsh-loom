# 人在环 RSI 插件 · 设计 v1（已拍板）

> 工作名暂定 **Loom**（织机：把任务织成工作链，反复织到最好）。包名 `dsh-rsi-loop`。
> 状态：5 个关键决策已拍板（2026-11-06），进入 M0 实现。

---

## 0. 一句话与目标体验

**给 agent 一个目标，它自己搭出一条会自我迭代的工作链，把每一步派给 subagent 去跑，每一环和"循环本身"都在证据上被评估和替换；而主 agent 平时是空闲的，只在人类该做决定的地方醒来。**

目标体验（一晚）：

```
你 → 主 agent：把这个仓库的测试覆盖率提到 85%，顺手重构掉 legacy/ 里的面条代码。
主 agent：① 立项（目标/验收/预算/禁区） ② 写工作链 v0 ③ 建评测集 ④ 启动 ⑤ 回到空闲
   ……… 循环在后台跑：13 轮，工作链 v0→v3，评测分数 0.41→0.82，花掉预算 38% ………
次日主 agent 收到一张卡片：
   「2 个候选工作链待批：A(+0.06/成本-12%) B(-0.01，建议拒)。
     约束冲突 1 条：B 改了公开 API 签名。预算剩 62%。」
你 → 批准 A，否决 B，追加约束「不许改公开 API」。
主 agent：把约束写进 L1 硬约束、重排预算、把 A 提升为 incumbent、回去空闲。
```

三条不可让渡的体验约束：

1. **主 agent 不忙**。它是人机接口 + 裁决者，不是工人。工人是插件调度出来的会话/子 agent。
2. **人在环是机制，不是礼貌**。人的每次介入（约束、否决、点赞、改预算）都变成一等事件，进入证据链，影响后续候选。
3. **没有评估就没有 RSI**。任何"优化"必须能回答「换条路是不是更好、好多少、在哪些任务上、置信度多少」。

---

## 1. 调研结论：三块拼图与那个空位

### 1.1 DSH 已经给了运行底座（全部实测签名）

| 需要 | 现成能力 | 关键点 |
|---|---|---|
| 常驻后台循环 | 插件 `apply()` 跑在 Electron 主进程 Node 里 + `ctx.effect(setInterval)` | 零模型成本；单线程，绝不能在回调里同步阻塞 |
| 不阻塞主回合地跑 LLM | `sessionController.create()` → `resolveAgent()` → `prompt({mode:'queue'})` 立即返回 ack | 回合在独立会话跑，UI 侧栏可见，重启可 resume |
| 并行候选 / 派活 | `subagents.startActivation({request, delivery:'parent'\|'caller'})`、`sendMessage`、`waitForChildren` | 结果 `Promise<SubagentResult>`；`delivery:'caller'` 让插件自己持有 |
| 逐轮唤醒 / 检查点 | `sessionController.prompt(mainSessionId, {mode:'queue'})` | 这就是"主 agent 空闲→被叫醒看一眼→继续空闲"的官方入口 |
| 观察状态 | 事件 `agent/status`(idle⇄running)、`session/event`(`turn/end`)、`subagent/start|end`、`tools/result` | 可做记账、审计、熔断 |
| 成本记账 | `assistant/message{usage}` 事件、`tokenMeter` 服务 | 每轮 real cost 可算，预算可硬熔断 |
| 向所有 agent 注入状态 | `systemPrompt.section()` / `system-prompt/assemble` 瀑布 | 主 agent 一睁眼就知道循环到哪了 |
| 控制面 | `ctx.tools.register` + `presentResult` 卡片；`webServer.register('/rsi/...')`；client 槽位 `settings.section` | 先做工具+卡片，GUI 后置 |
| 人工审批/提问 | `userQuestions.askTimed`（超时走默认）、`approval.request` | 注意本机 approval 被禁用，不要把关键路径押在"用户点同意"上 |

**结论：这个插件不需要自己实现 agent 运行时，只需要实现"编排策略 + 证据 + 门禁"。** 这是把项目压到可交付范围的关键。

### 1.2 Gear：能借算法，不能借引擎

- 它优化的是 **harness**（一个被 MutationPolicy 圈住的 DSH profile 源目录：prompt/tool/skill/workflow/context），外层是 TS 控制平面（journal/预算/门禁）+ Python 搜索算法（只发 5 种 Operation）+ Docker 里的 headless DSH。
- **算法只能 nominate，promote 终裁在运行时**：完整性 → 冻结约束 → `minimumGain` → held-out 不回归 → CAS。这个"算法没有终裁权"的分层值得直接照搬。
- 可白嫖的纯逻辑：`StagedSearch` 状态机、evidence 完整性准入、`comparison_key` 分桶（不同任务族不能混算分）、`quota = candidates_remaining // remaining_rounds` 的预算分配、Pareto 父代采样。
- **不可用**：它绑 Harbor + Docker + Linux 沙箱，官方明确 Windows 不支持生产 control-plane；整个系统三层缺一不可，当库用会散架。

### 1.3 Open Dream-RSI：能借判据，不能借代码

- 它优化的是**任务内策略**（在 DiscoveryTree 里选下一个扩展节点的 `choose_action` 程序 / 探索参数 / 解题 recipe），冻结 LLM，离线用 ReplaySimulator 在历史树上回放上千变体（零 API 成本），候选要**严格**优于 incumbent 才晋升（平局不算证据）。
- 三个最值得抄的判据：
  1. **回放门控**：晋升证据必须是"在已有记录上换条路能不能多摘果子，且不重复收割"。
  2. **事件溯源 ALM**：append-only 事件是权威，物化视图必须能 `rebuild(events)` 重建；状态变更先写事件再改视图。
  3. **`termination_reason`**：区分「决策者选择停止」和「运行时移除了选项」。把预算耗尽记成"任务失败"，回放就会学出"遇到难任务就放弃"。
- **它明确没做编排层的自我优化**（cadence 是硬编码 300s，预算只做"用完即停"，作者把 cadence 划为"harness 不该猜的部分"）。而 ODR 自己的 holdout 注册表存在但 loop 从不读——**元层过拟合是它留下的可信度缺口**。

### 1.4 空位就是我们的产品定义

三块拼图拼起来，缺口很清晰：

> **把"编排层"（何时跑、跑几轮、预算怎么分、何时问人、何时停、候选怎么选）变成一等公民——可版本化、可被证据评估、可被人否决——并把它和"工作链结构"一起纳入同一个 RSI 闭环。**

DSH 恰好提供了跑这件事的全部原语，而 Gear/ODR 都停在"任务层/harness 层"。

---

## 2. 设计原则

1. **主 agent = 人机接口 + 裁决者**。它写链、审卡、拍板；不搬砖。
2. **一切皆产物（artifact）**：prompt、工具集、技能、工作链图、循环策略、评测集，全部有 id + 版本 + 哈希 + 父代 + 证据。
3. **证据先于主张**：候选晋升只看配对证据，不看叙述。人类评价也是证据，但要和机器证据分开记账。
4. **便宜的先跑**：格式/编译/脚本验证 → 小样本 live → 全量 live → 人审。回放与影子模式优先。
5. **硬熔断**：预算（钱/轮/时长）、失败签名去重、单实例锁、可回滚。默认不自动改人类仓库的公开接口。
6. **人只在高杠杆点介入**：门禁、预算跃迁、异常、约束冲突；其余自动，事后可否决。

---

## 3. 四层自优化模型

| 层 | 优化对象 | 候选怎么来 | 怎么评 | 谁批 |
|---|---|---|---|---|
| **L0 执行层** | 单个节点的 prompt/工具集/上下文策略/技能 | 失败诊断后由 meta agent 改；或从成功轨迹蒸馏 | 该节点在任务子集上的通过率/成本 | 自动（veto 窗口） |
| **L1 工作链层** | 节点集合、依赖图、并行度、验证节点、重试策略 | meta agent 基于证据提出增删改；或从两条成功链交叉 | 整链在评测集上的分数/成本；配对比较 | 自动 + 人审（可配置） |
| **L2 循环策略层** | 轮次调度、预算分配、任务采样、何时 meta-review、何时问人、何时停 | 参数扰动 / 策略程序（受限 DSL）/ 人类指定 | **离线回放**已记录轮次 → 影子模式 → 小规模 A/B | **默认人审** |
| **L3 插件自身** | 门禁阈值、评分函数权重、RSI 插件自己的 prompt | 人类 + 元评估 | 跨 campaign 的元基准 | 仅人类 |

关键点：**L2 是差异化所在**，也是最容易自嗨的地方，所以它默认走"回放 → 影子 → 人审"三重门，且样本少时拒绝晋升（见 §11 风险）。

每层的产物都是同一个 `Artifact` 结构：

```ts
type Artifact = {
  id: string; kind: 'prompt'|'toolset'|'skill'|'chain'|'loop-policy'|'evalset'|'recipe';
  version: number; parent?: string;           // 血缘
  content: unknown; contentHash: string;
  status: 'candidate'|'active'|'stale'|'superseded'|'rejected'|'quarantined';
  createdAt: number; createdBy: 'human:<id>'|'agent:<sessionId>';
  evidence: EvidenceRef[];
}
```

---

## 4. 运行时架构

```
┌────────────────────────────── DSH 宿主进程（插件同进程） ──────────────────────────────┐
│  Loom Engine (host plugin)                                                            │
│  ├─ Scheduler   每 tick(默认 20s，可退避) 读状态 → 决定下一步动作（纯函数，可回放）        │
│  ├─ Dispatcher  sessionController.prompt / subagents.startActivation（派活，不阻塞）     │
│  ├─ Collector   session/event + subagent/end → 收工件、轨迹、usage                       │
│  ├─ Verifier    跑脚本验证器（子进程）/ LLM judge / 人审                                 │
│  ├─ Ledger      append-only events.jsonl（权威）+ 物化 views（可 rebuild）               │
│  ├─ Gate        完整性→约束→minimumGain→holdout→人审 veto→CAS 生效                       │
│  └─ Notifier    sessionController.prompt(mainSessionId) 投递检查点卡片                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
         │ 派活                                  │ 观察
         ▼                                       ▼
  ┌───────────────┐  ┌───────────────┐   ┌──────────────────────┐
  │ worker 会话 A │  │ worker 会话 B │   │ 事件流（turn/end 等）│
  │ (L0 节点执行) │  │ (并行候选)    │   └──────────────────────┘
  └───────┬───────┘  └───────────────┘
          │ spawn
          ▼
    子 agent（可选，任务再分解）
```

### 4.1 Campaign 状态机

```
draft ──rsi_start──▶ planning ──chain+evalset ready──▶ running ──┐
                        ▲                                  │      │
                        │                                  ▼      │
                        └────────── paused ◀── budget/人的暂停    │
                                                                  ▼
                                            running ──stop 条件──▶ converged
                                              │                     │
                                              └── 连续无增益 ──▶ plateaued（转人审/换层）
```

`draft/planning` 由主 agent 驱动（人机交互密集）；`running` 由引擎驱动（主 agent 空闲）。

### 4.2 一轮（round）的时序

```
1 sample     按 L2 策略从评测集抽任务（难例优先 + 分层）
2 attempt    L1 链 × 每个任务：并行起 worker 会话（候选链各自跑）
3 collect    收工件/轨迹/usage/termination_reason
4 verify     脚本验证 → 结构化断言 → (必要时) LLM judge → (必要时) 人审
5 score      score = f(pass_rate, cost, latency)；配对比较候选 vs incumbent
6 diagnose   meta agent（子 agent）读失败簇/成功轨迹，产出 hypotheses + 候选改动
7 propose    生成 L0/L1/L2 候选（受 MutationPolicy 白名单约束）
8 gate       完整性 → 约束 → minimumGain → holdout 不回归 → 人审(可配) → promote
9 commit     写事件、更新 incumbent、重排预算、检查检查点（该不该叫醒人）
```

### 4.3 会话拓扑（为什么主 agent 能空闲）

- **主会话**：人类对话 + 立项 + 审卡。只在 `planning` 和检查点被 `prompt` 唤醒。
- **worker 会话**：每次 attempt 一个，任务单一、上下文干净、结束即弃（或按需 resume 续聊）。
- **meta 会话**：每轮或每 N 轮一个，只读证据、只写候选，不碰工作区（默认只读工具）。
- **插件自身**：不占用任何会话，纯宿主定时器 + 状态机。

> 备选形态（不推荐为首版）：用一个长期 orchestrator 会话每轮自我 prompt。它更"agentic"，但会烧上下文、难回放、贵，且与"主 agent 空闲"目标混淆。

---

## 5. 数据模型与文件布局

```
~/.dsh/loom/
  campaigns/<id>/
    campaign.json            # 目标/约束/预算/状态机/incumbent 指针
    evalset/tasks.jsonl      # 任务：初始状态 + 验证器 + 标签 + holdout 标记
    evalset/holdout.json     # holdout 预约（先注册后使用，防调参）
    artifacts/<kind>/<id>@<version>/…   # chain.yaml / prompt.md / policy.yaml
    events.jsonl             # append-only 权威事件
    views/{state,candidates,scores}.json  # 物化，可 rebuild
    runs/<round>/<attempt>/  # 轨迹、stdout、diff、usage、verdict
    reports/round-0007.md    # 给人看的轮报
  global/artifacts/          # 跨 campaign 复用的 recipe/skill
  lock                       # 单实例
```

事件类型（一等公民，含 human actor）：

```
campaign.created / objective.updated / constraint.added / constraint.removed
evalset.registered / holdout.reserved
chain.proposed / chain.activated
round.started / attempt.started / attempt.finished / verify.finished
artifact.proposed / gate.evaluated / artifact.promoted / artifact.rejected / artifact.rolled_back
budget.spent / budget.adjusted
human.approved / human.vetoed / human.note / human.steered
checkpoint.raised / checkpoint.answered
loop.policy_proposed / loop.policy_shadowed / loop.policy_activated
```

---

## 6. 评估协议（这个插件有没有价值，全看这一节）

### 6.1 三级 oracle

| 级别 | 形式 | 成本 | 适用 |
|---|---|---|---|
| O1 机械 | 脚本/测试/编译/静态检查/断言 | 极低 | 代码、数据、格式 |
| O2 模型 | LLM judge（rubric + 参考解 + 成对比较） | 低-中 | 文档、方案、分析 |
| O3 人类 | 人类打分/排序/通过与否 | 高 | 主观质量、关键决策 |

规则：**能用低级的绝不用高级的**；O3 只用于校准 O2 和最终验收；每次 O3 评分都入库，用来测 O2 与人的相关性（judge drift 检测）。

### 6.2 配对比较是唯一晋升依据

候选与 incumbent 在**同一批任务**上跑（paired），按任务维度比较：

```
Δ = mean(score_cand - score_inc) over paired tasks
晋升要求：Δ ≥ min_gain（默认 0.05） 且
         holdout 上 Δ_holdout ≥ -ε（默认不回归）
         且 成本不超预算上限（或 Pareto 更优）
         且 证据完整（无 missing/超时/被中断的任务）
```
平局不算证据；样本 < n_min（默认 6 个任务 × 2 次）时只允许"探索"，不允许"晋升"。

### 6.3 任务采样与防过拟合

- 分层：easy/normal/hard 各占比例；**难例优先**（近 N 轮失败签名聚类）。
- **holdout 先注册后使用**：注册时写哈希，晋升评估只能用注册过的 holdout；同一 holdout 被用过 k 次后强制退休。
- **comparison_key 分桶**：不同任务族分别算 Δ，禁止混算。
- 每晋升 3 次强制一次"历史回归"（用旧任务重跑 incumbent）。

### 6.4 L2（循环策略）的评估阶梯

1. **离线回放**：把已记录轮次喂给候选调度器，只重算"决策"（选哪些任务、给多少预算、何时停），用记录里的结果估收益。零 API 成本，能砍掉大部分坏候选。
2. **影子模式**：真实轮次里候选策略并行输出决策但不执行，与 incumbent 决策对比，记录分歧与"若按它做会怎样"的估计。
3. **A/B**：同一批评测任务上交替执行两套策略，配对比较。
4. **人审**：L2 晋升默认需要人批准（因为元层过拟合代价最大）。

---

## 7. 人在环：主 agent 的三个角色

| 角色 | 触发 | 主 agent 做什么 | 插件给什么 |
|---|---|---|---|
| **立项者** | 用户下达任务 | 澄清目标/验收/禁区/预算；写 chain v0 与 evalset；`rsi_start` | 模板、历史 recipe、成本估算 |
| **审阅者** | 检查点（门禁/预算 50%/异常/plateau） | 看卡片 → 批准/否决/加约束/改预算 → `rsi_decide` | 一页轮报：Δ、成本、风险、证据链接 |
| **裁决者** | 冲突/不可逆操作 | 拍板（如"是否允许改公开 API"） | 明确的二选一 + 默认建议 |

检查点策略（L2 的一部分，可被优化）：
```yaml
checkpoint:
  on: [gate, budget_cross: 0.5, anomaly, plateau, constraint_conflict]
  quiet_hours: "23:00-08:00"     # 夜里不叫人，攒到早上
  batch: true                     # 多个检查点合并成一张卡
  default_if_no_answer: hold      # 人不回就保持现状，绝不自动放行 L2
```

**卡片形态**（走 `presentResult` 或 `sessionController.prompt` 的富文本）：

```
[Loom · campaign cov-refactor · 第 13 轮]
分数 0.68 → 0.82 (+0.14, 6/8 任务胜, holdout +0.03)
成本 $3.12 / $8.00 (39%)   剩 6 轮预算
候选 A: chain v4 (+0.06, 成本 -12%)  ← 建议批准
候选 B: chain v5 (-0.01, 改了公开 API)  ← 建议否决
待定: 是否允许把 legacy/ 整体删除？(不可逆)
```

---

## 8. 工具面

主 agent 可见（默认 8 个，克制）：

| 工具 | 作用 |
|---|---|
| `rsi_start` | 立项：目标/验收/预算/约束 → 返回 campaign id 与 chain 模板 |
| `rsi_chain` | 读/写工作链版本（get/set/validate/diff） |
| `rsi_evalset` | 注册任务集、预约 holdout、试跑单任务 |
| `rsi_status` | 一页状态：轮次/分数/成本/候选/待办检查点 |
| `rsi_decide` | 对检查点做决定：approve/veto/constraint/budget/steer |
| `rsi_control` | pause/resume/stop/rollback/budget |
| `rsi_report` | 取某轮/某候选的完整证据包（给人看或自己读） |
| `rsi_replay` | 对候选 L2 策略做离线回放（零成本预演） |

slash 命令：`/loom status|start|pause|report`（可选，后置）。
Dashboard：先 `webServer.register('/loom/api/...')` 出一页只读 HTML；GUI 槽位面板放 M4。

---

## 9. 成本、安全、回滚

- **预算**：campaign 级（USD/轮数/时长）+ 每轮 + 每节点三级；超限硬停并落 `budget_gate` 事件（不是失败）。
- **模型分工**：agentPresets —— worker 用便宜快模型，meta 用强模型，judge 用独立模型（避免自评自夸）；都可配置。
- **沙箱**：worker 的 shell 走 DSH 的 `sandboxPolicy` + `sandbox.confine`；插件自己的子进程用绝对路径白名单。
- **自改边界**：L0/L1 只能改"工作链产物"（prompt/工具集/图），**不能自动改插件代码、不能自动改 DSH 配置、不能自动推公开 API**；这三类永远要人批。
- **回滚**：incumbent 指针 CAS + 上一版快照；`rsi_control rollback` 一条命令回到任意已晋升版本（事件里留痕）。
- **单实例锁**：`~/.dsh/loom/lock`（`wx` + pid 存活检查），防两个窗口同时跑。
- **崩溃恢复**：启动时 `rebuild(events)` 校验视图；不一致以事件为准重建；未完成 attempt 标记 `interrupted`（不是失败）。

---

## 10. 里程碑与验收

| 里程碑 | 内容 | 验收（可测） |
|---|---|---|
| **M0 骨架**（1-2 天） | 插件装配进 profile；2 个工具；ticker；状态原子写；单实例锁 | 工具在真实 DSH 里可见；重启后状态恢复；`verify.mjs` 通过 |
| **M1 单链闭环**（3-5 天） | campaign + 固定 chain + 1 个脚本验证器 + 预算 + 轮报 | 一条命令跑 5 轮，分数曲线落盘，主 agent 全程只被叫 1 次 |
| **M2 工作链进化**（1-2 周） | L0/L1 候选生成 + 配对门禁 + holdout + 回滚 | 在自建 10 任务基准上，v3 链比 v0 链 Δ≥0.1 且 holdout 不回归 |
| **M3 循环进化**（1-2 周） | L2 回放 + 影子 + A/B + 人审；checkpoint 策略参数化 | 回放能提前否决 ≥50% 的坏策略；L2 晋升全部有人审记录 |
| **M4 面板与复用**（1 周） | settings 面板、跨 campaign recipe 库、导出报告 | 面板可暂停/改预算/看曲线；recipe 在第二个 campaign 被复用 |

**元基准（必须有，否则无法证明插件有用）**：固定 8-10 个任务（含 3 个代码任务、3 个写作任务、2 个分析任务），跑 base DSH vs Loom，报告 分数/成本/人类偏好 三列。没有这个数字，这个插件就只是"看起来很 RSI"。

---

## 11. 风险清单（按杀伤力排序）

1. **没有可靠 oracle** → 整个系统退化成"agent 自嗨"。缓解：立项时强制要求至少 O1 或可校准的 O2；否则只允许"探索模式"，不许晋升。
2. **元层过拟合**（样本少、同一批任务反复调参）→ 学出"考试技巧"。缓解：holdout 预约 + 退休 + 样本量下限 + L2 默认人审。
3. **judge 被候选"讨好"**（长度、格式、套话）→ 分数虚高。缓解：成对比较 + 参考解 + 独立 judge 模型 + 定期与人类评分做相关性校准。
4. **成本失控**（并行候选 × 任务数 × 轮数）。缓解：三级预算 + 便宜优先 + 失败签名熔断 + 每轮硬上限。
5. **自改引入不可逆破坏**（删文件、改公开 API、改配置）。缓解：MutationPolicy 白名单 + 人批 + 工作区快照 + 回滚。
6. **Windows 沙箱弱点**（无 rlimit、只杀直接子进程）→ 不可信代码不要在本机跑；默认只跑可信任务，敌意代码走 WSL/容器。
7. **插件把宿主搞挂**（未捕获异常、泄漏 interval）→ 所有回调 try/catch、`ctx.effect` 清理、HMR 所有权槽、崩溃后从事件重建。

---

## 12. 待拍板的 5 个问题

1. **首个目标域**：代码任务（测试/重构，O1 强）／可验证的通用任务／写作分析（O2/O3 为主）／先做"插件优化自己"的自举 demo？
2. **工作链谁来写**：主 agent 写声明式 spec（灵活、可审计）／插件内置模板+槽位（稳、快）／两者混合（模板起步，agent 改）？
3. **自主度**：全自动+事后否决／L1 自动 L2 人审（推荐）／每个晋升都要人批？
4. **首版要不要 GUI 面板**：先工具+卡片（省 1 周）／直接做 settings 面板？
5. **成本口径**：只算 API 钱／也算人类审阅时间（把人的时间当预算）？

---

## 13. 已拍板的决策（2026-11-06）

| # | 决策 | 选择 |
|---|---|---|
| 1 | 首个目标域 | **代码任务**（测试覆盖率 / 重构 / 修 bug），O1 验证器 = 测试与编译 |
| 2 | 工作链定义 | **混合**：插件提供经过验证的模板，主 agent 用 JSON spec 改写 |
| 3 | 自主度 | **L1 自动 + L2 人审 + 事后否决窗口** |
| 4 | 首版界面 | **只做工具 + 结果卡片**，GUI 面板推迟到 M4 |
| 5 | 成本口径 | **只算 API/Token 费用**，人类时间单独统计不参与优化目标 |

由此确定的首版边界：
- spec 用 **JSON**（`.json`），不引入 YAML 解析依赖；
- 工作链节点类型首版只支持 `agent | verifier | human | map`；
- 验证器首版只支持「命令 + 退出码 + 可选 JSON 指标」；
- L2 首版只做「回放 + 人审」，不做自动 A/B；
- 插件零运行时依赖（node 内置模块 only）。
