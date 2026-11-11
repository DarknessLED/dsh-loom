# dsh-loom 下一阶段目标（2026-11-11 修订版 · 执行中）

> 状态：**执行中（2026-11-11 01:10 → 07:45）**。你在 01:14 说「改完就**开始**」，所以已按此执行；
> 判据状态见表 1.1（A1–A5、A7、A8 已完成，A6 部分，A9 代码完成待重启验证）。
> 不发版，只提交 master。
> 修订依据：你 2026-11-11 00:37 的八条指示，以及 00:54 的补充（调研领域由我自己发现和评估、模型分配由我定、可以全用 ds v4.1 flash 不用 haiku、改完即开始）。

---

## 零、先报一件已发生的事

我接手时工作区有 4 个未提交文件（上一轮会话遗留的"超时回落"改动），我已补完、验证、提交：

- `57b1d80 dispatch: a model that spent its whole slice is unusable, and the chain shares one clock`
- 新增 `tests/lifecycle/timeout-fallover.test.mjs` **4/4**，已钉进 standing
- 全量 `scripts/test-all.mjs` **116/116**，工作区干净

这条正好是新目标里最急的一条（`loom-acc6` 十二个 600 秒全废的直接解药），所以先落地了：

| 规则 | 行为 |
| --- | --- |
| `timeout` 归入「这个模型不可用」 | 与 `context`/`tokens`/静默死亡同类，可以换链 |
| 一次 attempt 只有一个时钟 | 第二个模型只拿剩余时间，不会翻倍烧预算 |
| `session.fallbackReserveMs`（默认 0） | 设了就从第一个模型切出一块留给回落 |
| `session.minFalloverMs`（默认 30s） | 剩余不足这个值就不派第二个子会话 |

---

## 一、主目标（已获你认可）

> **让每一次子 agent 调用都跑在"和主 agent 同一套 API"上；同一 provider 卡顿时，用被测出来的证据换下一个 provider，而不是盲等 600 秒。**

### 1.1 验收判据（A1–A9，全部机械可检验）

| # | 判据 | 检验方式 | 状态 |
| --- | --- | --- | --- |
| A1 | 子 agent 默认与主 agent 同 provider/model/effort | `agentDefaultModel.currentSelection()` 取值；未配置 `models.worker` 时必须跟随；`attempt.finished.model` 记录实际值 | **已完成** `3bddb1a`（继承 selection）+ `33d3504`（记录真正跑的那个 ref）；`tests/lifecycle/model-inherit.test.mjs` 6/6、`tests/balance/record-the-model-that-ran.test.mjs` 5/5 |
| A2 | 每次 spawn 都带 `reasoningEffort` | 断言 `agentOptions.reasoningEffort === 'high'`，campaign 可覆盖 | **已完成** `3bddb1a`（继承 host 的 effort）+ `session.reasoningEffort` 可覆盖 |
| A3 | 回落链是数据不是代码 | 默认 `fallback: ['command-code/deepseek/deepseek-v4.1-flash']`；断言链顺序真被传下去 | **已完成** `cdc54d3`（默认值落地，并修掉 `null` 头被滤掉导致首个会话直接跑在 fallback 上的 bug）+ `f68eb17` 真机验证（4 个 attempt 真的换了 provider） |
| A4 | 分档可选但默认关闭 | `models.light` 存在且可配，用于规划/筛选/判题；**默认不设** | **已完成** `d6fcb37`（`modelFor(config, role)`，worker 永不被降档；默认 null） |
| A5 | 模型级健康度可见 | `campaignTriangle` 与面板新增 `perModel` | **已完成** `35cb5b5`（`modelHealth`）+ `6133132`（digest）+ `79211f7`（侧栏）+ `a0e4943`（兄弟杀不再算 provider 失败） |
| A6 | 卡顿分钟级发现 | **已部分落地**（`minFalloverMs` + 共享时钟）；剩余：首片零输出的早期探测 | **部分**：`57b1d80` 让 timeout 归入 unusable、整条链共享一个时钟、`minFalloverMs` 保证第二个模型至少拿到 30 秒；首片零输出的早期探测仍未做 |
| A7 | 连续慢的模型被降级 | `models.demoteAfter`（默认 2 次首片静默）→ 本战役内该 ref 排到链尾 | **已完成** `f01eb4c`（`demoteChain`）+ `03a7214`（planner 也跟链，不再直读配置）+ `0fb38b1` 真机验证（planner 跑在策略点名的 ref 上） |
| A8 | 不回归 | `test-all`、`verify`、`e2e`、`panel-audit` 全绿；CI 绿 | **已完成**：`test-all` **149/149**、`verify` 115/115、`e2e` all M1–M3、`panel-audit` OK |
| A9 | 模型策略是**声明过的配置** | `dsh-loom` 导出 `Config` schema；Inspect 的 `status` 从 `absent` 变有 schema | **代码完成、真机未投影**：`014e493` 导出 `Config`（12 个字段，`tests/config/schema.test.mjs` 6/6），直接 import 能拿到 schema，但宿主 loader 在装配时读一次、热重载不重读，Inspect 仍是 `absent` —— 需要重启 DSH 才能验证 |

### 1.2 模型策略（按你的指示定稿）

```
主 agent      : 跟随宿主 agentDefaultModel（当前 open-design / deepseek-v4.1-flash / high，会变）
子 agent 默认 : 同主 agent（provider + model + reasoningEffort 一起继承）
回落链        : open-design/deepseek-v4.1-flash → command-code/deepseek/deepseek-v4.1-flash
                两者 reasoningEffort = high
简单活        : 默认不降级，同样 open-design/deepseek-v4.1-flash（可按需指定，不再预设 haiku 档）
触发回落      : ①context/token 类错误 ②静默死亡（无诊断） ③首片零输出 ④该 ref 已被降级
不触发回落    : ①带诊断的真实失败（补丁已证明坏，换 provider 只是双倍账单）
                ②验证器 ok=false（任务难度，不是模型故障）
```

---

## 二、方法：把 RSI 自身已有的四个机制真正用起来

你的第 7 条点明了我一直没用足的东西。这一阶段的做法**不发明新流程**，而是把插件自己的设计兑现：

### 2.1 调研先行（第 6 条）—— **Phase 0，不写任何代码**

**调研哪些领域由数据决定，不是由我拍脑袋列三个 R。** 昨晚我把 22 个战役、211 轮、420 个 attempt 的账本做了一次全量核算（`node scripts/diag-where-the-time-goes.mjs` 的输出就是下面的数字），它把该调研什么直接指出来了：

| 实测 | 数字 | 它问的问题 |
| --- | --- | --- |
| attempt 总数 / 决出结果 | 420 / 205（49%） | 一半的子会话没给出任何裁决 |
| **子会话死亡** | **145（34.5%）**，远多于 timeout 23 | 为什么会死？是不是 provider 层？业界怎么兜 |
| 有补丁却没拿到裁决 | 200 带补丁 → **72 个（36%）没被验过就丢了** | 已经做出来的活为什么不算数 |
| 轮结论分布 | 录用 104（49%）、无进展 87（41%）、中断 22 | 41% 的无进展是难度还是流程 |
| 规划 | 均值 118s = 一回合的 **25%**；记了 `planUsable` 的 9 轮里 **9 轮空手（100%）** | 规划到底在产出什么 |
| 知识树 | 加了 91 条 lesson，只有 60 次 impact 测量，**delta 合计 +1.00，harm 3 次** | 91 条教训换 1.0 分，这套机制是否自欺 |
| attempt 时长 | p50 145s / p90 601s / p99 1086s | 我们按 600s 一刀切，切在了 p90 上 |

按这些数字，Phase 0 派 **5 个**调研子 agent（这是我根据上面的账本定的，执行中发现问题再加，不设上限）：

| 调研 | 由哪个数字触发 | 必须回答 |
| --- | --- | --- |
| **R1 · 子会话死亡与失败分型** | 145 次 died（34.5%）是最大单一失败类 | 2025–2026 关于 provider 故障、连接断了、空诊断的实践：怎么区分"它死了"与"它没答"；心跳/liveness 该探什么；业界超时设在哪 |
| **R2 · 已产出的活如何不丢（salvage）** | 72 个带补丁的 attempt 没被验就丢了（有补丁的 36%） | 断点续跑、worktree 落盘、partial result 复用；Temporal/LangGraph 的 checkpoint 粒度 |
| **R3 · 超时与预算的形状** | 一刀切 600s 落在 p90 上 | 自适应 deadline、按任务类型估时、Tail-at-Scale 的尾延迟处理；我们该用分位数还是固定值 |
| **R4 · 自改进循环是否在优化假指标** | 91 条 lesson → delta +1.00 | dream-rsi / gear / Sakana ADAS/DGM / AlphaEvolve：他们怎么防止"循环优化了假指标"；holdout 与泄漏 |
| **R5 · 规划为什么空转** | 规划占 25% 墙钟、9/9 空手、24 次超时 | 规划-执行分离在 agent 上的真实收益证据；什么任务不值得规划；如何验证"规划有用"而不是假设 |

每份笔记必须带**可证伪的结论**和**会影响我们哪一行代码/哪个配置**。达不到这两点就是废纸，退回重写。调研不做完不写规格。

**模型分配（第 2 条的修订）**：你说可以全用 v4.1 flash、不用 haiku。我按这个来 —— **默认全部 `open-design/deepseek-v4.1-flash`**，不再为省钱把有判断力的活（R4 那种评估我们是否自欺的）降级给 haiku。哪里需要换模型，我会在派活时说明理由，而不是预先分配一个"简单活"档位。

### 2.2 知识树的共享（第 7 条）

- 调研结论不只写进 `research/`，还要通过 `lesson.added` 进战役知识树，让后续候选真的看到（现在知识树只有 18 条 active，且大多是我自己写的，收益近乎为零——这本身是个待修的问题）
- 每个战役结束时核对：**这轮学到的教训有没有进树**；没进就是流程漏洞
- 反向也要看：`impact` 记录的 harm 是否真实（此前 quarantine 过 2 条，原因是候选曝光顺序固定导致误判，已修）

### 2.3 最小验证先行（第 7 条）

三条线都要做到：

1. **我写规格时**：三步验证（HEAD 失败 → 参考实现通过 → 删掉参考实现仍失败）。这条我违反过四次，每次白烧 2–4 轮，已经是硬门
2. **循环做任务时**：`screen` 廉价筛选先跑，只有活下来的才进昂贵尝试（`halving` 已实现，`keepRatio 0.5`）
3. **provider 健康**：先用一个**极小 prompt** 探活，再派真活（A6 的早期探测，比盲等 600 秒便宜 100 倍）

### 2.4 subagent 策略（第 7 条）

- 调研、审查、取证这类**可并行、不需要工作区写权限**的活，一律派 subagent，主 agent 不忙
- 每个 subagent 只许写自己的文件（`research/*.md`），禁止改 `src`/`tests`/`client`/`scripts`，禁止跑 `test-all`
- 默认全部 v4.1 flash；只有实测证明"某类活降级不掉质量"才把那一类换掉，且必须留下对照数据

---

## 三、执行计划

### Phase 0 · 调研（~60–90 分钟）

3 个调研 subagent 并行，我同时做两件不冲突的事：把 A9 的 Config schema 设计出来、把 A5 的 `perModel` 折叠逻辑先写成会失败的规格。

**Phase 0 出口**：每份笔记 + 我对每份的复核（哪些采纳、哪些驳回、为什么），以及**按调研结论重排 M1–M5 的批次表**（下面的批次是我现在的猜测，调研可能推翻它）。如果调研指出还有别的领域该挖，就在 Phase 0 内追加，不进入 Phase 1 直到这块地翻完。

### Phase 1–5 · 五批规格 → 战役（每批 1–2 条；内容待 Phase 0 复核）

> 下面是**基于当前账本的猜测**。R1–R5 任一结论与它冲突，就以调研为准改表 —— 这本身就是这个循环该做的事。

| 批 | 规格 | 依据 |
| --- | --- | --- |
| M1 | A1 + A2：读主 agent 选择 + 必带 effort | 纯装配层，最小风险 |
| M2 | A3 + A4：默认回落链 + light 模型 | 配置 + 一处分支 |
| M3 | A5 + A9：perModel 记账 + Config schema | 中；A9 让策略从隐藏默认值变成可发现配置 |
| M4 | A6 剩余：首片零输出探测 + 存活心跳 | dispatcher 核心，风险最高，单独一批；R1 若给出更准的 liveness 判据就换掉我的猜测 |
| M5 | A7：降级 | 依赖 A5/A6 的数据 |

每批流程固定：**写规格（三步验证）→ 建战役 → 循环自己实现 → 我审补丁/跑护栏/提交 → 钉 standing → 带前后数字报告**。

### 时间

- 现在 ~00:50，跑到 **2026-11-11 08:00**
- 不看预算；但如果连续 **2 批**拿不到晋升，就停下来写诊断报告（acc2–acc6 的教训）
- **不发版**（你的第 4 条）：只提交到 master，不动 `package.json` 版本号、不打 tag、不建 release

### 停止条件

任一成立即停并汇报：
1. 到达 08:00
2. 连续 2 批无晋升
3. 出现无法在不重启宿主的前提下解决的阻塞（例如子会话系统性死亡）

---

## 四、风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| `agentDefaultModel` 在 timer fiber 不可用 | A1 无法实现 | `svc(ctx,...)` 取不到就回落 `config.models.worker`，记 `modelSource:'config'`（保持现状语义） |
| `reasoningEffort` 某 provider 不认 | spawn 抛错 | 只在模型声明了 `reasoningEfforts` 时传（profile 里 open-design 的模型有声明） |
| `minFalloverMs` 30s 对慢模型太短 | 误杀 | 首片只判"零输出"，不判"没写完"；可配 |
| A6 改 dispatcher 核心引入竞态 | 回归 | 单独一批 + 新规格覆盖"首片内有输出则正常跑满" |
| 我的规格又不可达 | 白烧轮次 | 三步验证是硬门，不可达不许建战役 |
| 知识树条目是错的 | 候选被误导 | Phase 0 的 R3 专门审这批条目 |

---

## 五、批准后我会做的事（顺序）

1. `create_goal`（objective = 本文件第一章 + 时间盒 08:00）
2. `hindsight_capture_initiative` 记录这条 initiative
3. 派 3 个调研 subagent（Phase 0）
4. 等笔记 → 复核 → 写 M1 规格 → 建第一个战役

**在你回复"开始"之前，以上一步都不会做。**
