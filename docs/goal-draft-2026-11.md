# dsh-loom 下一阶段目标（2026-11-11 修订版 · 待批准）

> 状态：**待你批准**。批准后才会 `create_goal`；在你明确说"开始"之前不会建任何战役。
> 修订依据：你 2026-11-11 00:37 的八条指示（认主目标 / 简单活 haiku 5.5 / 不看预算跑到 08:00 / 不着急发版 / 插件已修复 / 调研先行 / 用 RSI 自身机制 / 改完再给看）。

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
| A1 | 子 agent 默认与主 agent 同 provider/model/effort | `agentDefaultModel.currentSelection()` 取值；未配置 `models.worker` 时必须跟随；`attempt.finished.model` 记录实际值 | 待做 |
| A2 | 每次 spawn 都带 `reasoningEffort` | 断言 `agentOptions.reasoningEffort === 'high'`，campaign 可覆盖 | 待做 |
| A3 | 回落链是数据不是代码 | 默认 `fallback: ['command-code/deepseek/deepseek-v4.1-flash']`；断言链顺序真被传下去 | 部分（链已可配，默认值未定） |
| A4 | 简单活下放 | 新配置 `models.light`（默认 `open-design/claude-haiku-5.5`）用于规划/筛选/判题；worker 仍走主链 | 待做 |
| A5 | 模型级健康度可见 | `campaignTriangle` 与面板新增 `perModel`：`{ref:{attempts, ok, timeouts, died, p50Ms, p90Ms}}` | 待做 |
| A6 | 卡顿分钟级发现 | **已部分落地**（`minFalloverMs` + 共享时钟）；剩余：首片零输出的早期探测 | 部分 |
| A7 | 连续慢的模型被降级 | `models.demoteAfter`（默认 2 次首片静默）→ 本战役内该 ref 排到链尾 | 待做 |
| A8 | 不回归 | `test-all` 116/116 起、`verify`、`e2e`、`panel-audit` 全绿；CI 绿 | 每次都要 |
| A9 | 模型策略是**声明过的配置** | `dsh-loom` 导出 `Config` schema；Inspect 的 `status` 从 `absent` 变有 schema；非法值被 schema 拒绝 | 待做 |

### 1.2 模型策略（按你的指示定稿）

```
主 agent      : 跟随宿主 agentDefaultModel（当前 open-design / deepseek-v4.1-flash / high，会变）
子 agent 默认 : 同主 agent（provider + model + reasoningEffort 一起继承）
回落链        : open-design/deepseek-v4.1-flash → command-code/deepseek/deepseek-v4.1-flash
                两者 reasoningEffort = high
简单活        : open-design/claude-haiku-5.5（规划 planner、筛选 screen、判题 judge）
触发回落      : ①context/token 类错误 ②静默死亡（无诊断） ③首片零输出 ④该 ref 已被降级
不触发回落    : ①带诊断的真实失败（补丁已证明坏，换 provider 只是双倍账单）
                ②验证器 ok=false（任务难度，不是模型故障）
```

---

## 二、方法：把 RSI 自身已有的四个机制真正用起来

你的第 7 条点明了我一直没用足的东西。这一阶段的做法**不发明新流程**，而是把插件自己的设计兑现：

### 2.1 调研先行（第 6 条）—— **Phase 0，不写任何代码**

在写第一条规格之前，先并行派 3 个调研子 agent（走 `models.light`，即 haiku 5.5，便宜），各写一份 `< 500 行` 的中文笔记到 `research/`：

| 调研 | 范围 | 必须回答 |
| --- | --- | --- |
| **R1 · 调度与失败处理** | 2025–2026 关于 agent 编排、provider 熔断、模型路由（含 RouteLLM / FrugalGPT / Tail-at-Scale 类）的论文与开源实现 | 业界怎么判"这个 provider 现在不可用"？阈值多少？我们的 `minFalloverMs`/`demoteAfter` 该取什么值？ |
| **R2 · 自改进循环（RSI）** | dream-rsi、gear、Sakana ADAS/DGM、AlphaEvolve 类 | 他们怎么防止"循环优化了假指标"？知识如何跨轮共享而不污染？我们的差距在哪 |
| **R3 · 廉价验证与知识树** | 最小验证先行、successive halving、多臂老虎机在 agent 上的应用 | 我们 46/117 规划空转、41% no-gain 的结构性原因是什么？知识树现有哪些条目是错的 |

每份笔记必须带**可证伪的结论**和**会影响我们哪一行代码/哪个配置**。调研不做完不写规格。

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
- 简单活走 haiku 5.5，真活走主链

---

## 三、执行计划

### Phase 0 · 调研（~60–90 分钟）

3 个调研 subagent 并行，我同时做两件不冲突的事：把 A9 的 Config schema 设计出来、把 A5 的 `perModel` 折叠逻辑先写成会失败的规格。

**Phase 0 出口**：三份笔记 + 我对每份的复核（哪些采纳、哪些驳回、为什么）。

### Phase 1–5 · 五批规格 → 战役（每批 1–2 条）

| 批 | 规格 | 依据 |
| --- | --- | --- |
| M1 | A1 + A2：读主 agent 选择 + 必带 effort | 纯装配层，最小风险 |
| M2 | A3 + A4：默认回落链 + light 模型 | 配置 + 一处分支 |
| M3 | A5 + A9：perModel 记账 + Config schema | 中；A9 让策略从隐藏默认值变成可发现配置 |
| M4 | A6 剩余：首片零输出探测 | dispatcher 核心，风险最高，单独一批 |
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
