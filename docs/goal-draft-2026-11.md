# dsh-loom 下一阶段目标草案（2026-11-11）

> 状态：**草案，待审核**。不会 activate，不会建战役，不会改任何代码，直到你批准。
> 起草依据：`~/.dsh/loom/campaigns/*/events.jsonl` 的 61 个战役 / 211 轮实测 + `src/` 现状 + profile 的模型配置。

---

## 一、先说结论（一句话）

上一阶段把循环的**证据语义**修对了，但这两天的失败几乎全部来自**模型层**：provider 卡顿、静默死亡、跨 provider 无法回退、reasoning effort 从来没被请求过。所以下一阶段的主线不是再加功能，而是把 **"子 agent 用哪个模型、什么时候换、换到哪"** 变成循环里一等公民，并且**默认与主 agent 同一套 API**。

---

## 二、现状评估（数字都是实测，不是估计）

### 2.1 全局（`scripts/loom-metrics.mjs --json`）

| 指标 | 值 | 说明 |
| --- | --- | --- |
| 战役 / 轮次 | 61 / 211 | 141 轮有完整墙钟测量 |
| 晋升率 | **44.5%** | 两周前是 58.8%，回落全部来自 acc2–acc6 |
| 空转率（no-gain） | 41.2% | 同上 |
| 秒/轮 | 473.8 s | 比两周前 646.9 s 好（salvage + cascade 生效） |
| 并行因子 | 1.115 | 健康回合真并行度是 1.46–2.00；这个数被秒级失败回合拉低，是分母问题 |
| 验证器占比 | 1.14% | 已经不是瓶颈，别再优化它 |
| tokens / USD | 355,175 / $0.0942 | **未定价**：provider 不报 usage，这是估算 |

### 2.2 最近的五条战役：钱花在模型故障上，不是花在任务上

| 战役 | 轮 | 晋升 | 症状 |
| --- | --- | --- | --- |
| loom-acc2 | 18 | 3 | r11–r18 连续 8 轮 `fk=died`，1–2 秒返回 |
| loom-acc3 | 13 | 0 | 13 轮 26 attempt，全部秒级死 |
| loom-acc4 | 6 | 0 | 12 attempt 全秒级死 |
| loom-acc5 | 7 | 0 | 连续 3 轮触发 infra-pause（这条机制是对的） |
| loom-acc6 | 9 | 0 | r4–r9 十二个 attempt **全部 600 秒超时**，零验证通过 |

`loom-acc6` 那 12 个 attempt 里，有 5 个**产出了补丁**（318 / 5,646 / 19,551 / 147 / 1,536 字节），只是没等来验证器就被 deadline 砍掉。也就是说：**模型在干活，是我们在它干完之前把表掐了。**

### 2.3 三个结构性缺口（都在代码里，不是猜测）

1. **`reasoningEffort` 从来没被传过。** `src/dispatch/session.js:246` 的 `#one()` 只装配 `agentOptions = {provider, model, maxTokens}`。宿主契约 `agentOptions` 支持 `reasoningEffort` —— 我们一次都没设。所以"都用 high"目前是**靠宿主默认碰运气**，一旦显式指定了 model 就可能掉回模型自身的默认档。
2. **默认模型是写死的配置，不是主 agent 的当前选择。** `src/core/config.js:32` 是 `worker: null / meta: null / fallback: []`，`worker: null` 的含义是"继承宿主默认"。在正常情况下这**恰好**等于主 agent；但你在别的会话切了模型，loom 读不到，只能等下一次 spawn 时宿主恰好给了新默认。宿主有 `agentDefaultModel.currentSelection() → {provider, model, reasoningEffort?}`，我们没调用过。
3. **没有"这个 provider 现在不行"的记忆。** `attempt.finished` 记了 `model`，但从没有按模型聚合过延迟/成功率；`infraPauseAfter` 是**整条战役**级别的刹车（连续 3 轮），不是"这个模型连续慢"的降级。所以 open-design 卡顿时，我们唯一的手段是烧完 600 秒再说。

### 2.4 已经做对、不要重做的

- 静默死亡 → 读子会话 `turn/end` 拿真实诊断（`1c03503`）
- 重试预算按 attempt 而不是按 dispatcher 实例（`dc8deb5`）
- 跨 provider 回退用 `provider/model` 拆成两个字段（`93dd5d2`）
- 超时抢救 salvage：树能过验证器就晋升（`e23d742`）
- 基建轮记 `interrupted/retryable`，不进证据、不进 plateau
- 连续三轮基建故障自动暂停
- 115/115 套件、CI 绿、0.2.1 已发版

---

## 三、目标（建议）

### 3.1 主目标

> **让 dsh-loom 的每一次子 agent 调用都跑在"和主 agent 同一套 API"上，并且在同一个 provider 卡顿时，用被测出来的证据而不是固定的超时去换下一个 provider；把 600 秒的盲等换成分钟级的探测。**

### 3.2 可验证的验收判据（全部可机械检验，不许"感觉好多了"）

| # | 判据 | 怎么测 |
| --- | --- | --- |
| A1 | 子 agent 默认与主 agent 同 provider/model/effort | 新规格：`dispatcher` 在**没配 `models.worker`** 时必须向 `agentDefaultModel.currentSelection()` 取值；配了就以配置为准，并在 `attempt.finished.model` 记录实际值 |
| A2 | 每次 spawn 都带 `reasoningEffort` | 新规格断言 `agentOptions.reasoningEffort === 'high'`（默认），且 campaign 可覆盖 |
| A3 | 回落链是数据、不是代码 | `config.models.fallback` 默认改为 `['command-code/deepseek/deepseek-v4.1-flash']`；`campaign.policy.models.fallback` 可覆盖；规格断言链顺序被真正传给 dispatcher |
| A4 | 简单活可以下放 | 新配置 `models.light`（默认 `open-design/claude-haiku-5.5`）用于规划/筛选/判题；规格断言 worker 仍用主链、planning 用 light |
| A5 | 模型级健康度可见 | `campaignTriangle` / 面板新增 `perModel: {ref: {attempts, ok, timeouts, died, p50Ms, p90Ms}}`；规格用假事件折叠 |
| A6 | 卡顿在分钟级被发现 | `session.firstSliceMs`（默认 120 秒）：某模型在首片内零输出 → 立即判该模型不可用并换链，**不**等满 600 秒；规格：假 dispatcher 首片静默 → 第二次调用换模型且总耗时 < 2×firstSlice |
| A7 | 连续慢的模型被降级 | `models.demoteAfter`（默认 2 次首片静默）→ 本战役内该 ref 排到链尾；规格断言第三次不再首选它 |
| A8 | 既有全部不回归 | `scripts/test-all.mjs` 115/115 起、`verify.mjs`、`e2e.mjs`、`panel-audit` 全绿；CI 绿 |

### 3.2.1 补充发现：插件没有声明 Config schema（刚查证）

宿主 Inspect 显示 `include:dsh-loom` 的 **Config `status: "absent"`** —— 也就是说 dsh-loom 一个配置项都没有向外声明。后果：

- profile 的 `cordis.patch.yml` 里写 `config:` 也无从校验，写错了没人拦；设置面板里也看不到任何可调项。
- 所以"子 agent 用哪个模型"目前**只能写默认值或写 campaign.policy**，不能作为插件配置被发现、被检查、被记录。

补一条判据：

| # | 判据 | 怎么测 |
| --- | --- | --- |
| A9 | 模型策略是**声明过的配置**，不是隐藏默认值 | `dsh-loom` 导出 `Config` schema（至少覆盖 `models.worker/meta/light/fallback/reasoningEffort/firstSliceMs`）；Inspect 的 Config `status` 从 `absent` 变为有 schema；规格断言非法值被 schema 拒绝 |

### 3.3 明确**不**在本阶段做的事

- 不做「多 provider 并发竞速」—— 那是把账单乘 N，A6/A7 已经能压住延迟
- 不重写计划器（planning 的空转 46/117 已经记账，等 A4 的 light 模型跑出对照再说）
- 不动面板视觉结构（上一轮刚稳定，只加"每模型健康"一块）
- 不做 Lean/数学层（跟当前瓶颈无关）

---

## 四、做法（沿用已经跑通的闭环，不发明新流程）

每一批：

1. **我写会失败的规格**（`tests/model/*.test.mjs`），并在 HEAD 上确认失败点正确
2. **三步验证可达性**：HEAD 失败 → 参考实现通过 → 删掉参考实现仍失败（这条被我自己违反过四次，每次白烧 2–4 轮，已写进 README）
3. **建战役**让循环自己实现（`rsi_start` one-call + autopilot guard = test-all）
4. **我审补丁 / 跑护栏 / 提交**，通过的规格钉进 `scripts/test-all.mjs` 的 standing
5. **带前后数字报告**

### 4.1 分批（每批 1–2 条规格，小到能一次人审）

| 批 | 规格 | 预期 |
| --- | --- | --- |
| M1 | A1 + A2（读主 agent 选择 + 必带 effort） | 小，纯装配层 |
| M2 | A3 + A4（默认回落链 + light 模型） | 小，配置 + 一处分支 |
| M3 | A5（perModel 记账） | 中，triangle + 面板 |
| M4 | A6（首片探测） | 中，dispatcher 核心改动，风险最高，单独一批 |
| M5 | A7（降级） | 中，依赖 A5/A6 的数据 |

### 4.2 模型策略（按你的要求，写死在这里作为规范）

```
主 agent      : 跟随宿主 agentDefaultModel（现在是 open-design / deepseek-v4.1-flash / high，会变）
子 agent 默认 : 同主 agent（provider + model + reasoningEffort 一起继承）
回落链        : open-design/deepseek-v4.1-flash  →  command-code/deepseek/deepseek-v4.1-flash
                （两者 reasoningEffort = high）
简单活        : open-design/claude-haiku-5.5（规划、筛选、判题）
触发回落      : ①context/token 类错误 ②静默死亡（无诊断） ③首片 120 秒零输出 ④该 ref 已被降级
不触发回落    : ①带诊断的真实失败（补丁已证明是坏的，换 provider 只是双倍账单）
                ②验证器 ok=false（那是任务难度，不是模型故障）
```

---

## 五、预算与节奏

- **预算建议**：本阶段 5 批 × 12 轮 ≈ 60 轮上限，USD 上限 40（当前实际单价 $0.0006–0.0032/轮，这个上限是"允许失败"的余量，不是计划花费）
- **节奏**：每批一个战役，跑完审完再开下一批（不并行，因为都改 `src/dispatch/` 和 `src/runtime/round.js`，会互相弄脏工作区）
- **何时停**：连续 2 批拿不到晋升 → 停下来写诊断报告，而不是继续烧（这是 acc2–acc6 的教训）
- **发版**：A1–A7 全绿后打 0.3.0，CHANGELOG 写清楚"默认模型从写死改为跟随主 agent"

---

## 六、风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| `agentDefaultModel` 服务在某些窗口不可用 | 子 agent 拿不到主 agent 的模型 | `ctx.get()` 取不到就回落到 `config.models.worker`（保持现状语义），并记 `modelSource: 'config'` |
| `reasoningEffort` 传了但宿主某 provider 不认 | spawn 抛错 | 只在模型声明了 `reasoningEfforts` 时传（profile 里 open-design 的模型有声明），否则不传 |
| 首片 120 秒太短，砍掉慢启动但正常的调用 | 误杀 | 首片只判"零输出"，不判"还没写完"；且 `firstSliceMs` 可配 |
| A6 改 dispatcher 核心，可能引入新竞态 | 回归 | 单独一批 + 新规格覆盖"首片内有输出则正常跑满" |
| 我写的规格又不可达 | 白烧轮次 | 三步验证成为**硬门**，不可达不许建战役 |

---

## 七、需要你拍板的四件事

1. **主目标**认不认？（3.1 + 3.2 的 A1–A8）
2. **模型策略**按 4.2 那张表定吗？（尤其：简单活默认 haiku 5.5，还是也跟主 agent？）
3. **预算**：60 轮 / $40 够不够？要不要更保守（比如 40 轮）？
4. **发版**：A1–A7 全绿就发 0.3.0，还是等 UI 那两条（`card-actions`、`head-dot`）也落地一起发？

你确认后我再 `create_goal`，**在你明确说"开始"之前不会建任何战役**。

---

## 附：本草案引用的事实来源

- `scripts/loom-metrics.mjs --json`（2026-11-10 23:39 快照）
- `~/.dsh/loom/campaigns/loom-acc6/events.jsonl`（r4–r9 逐 attempt）
- `src/dispatch/session.js:246-278`（agentOptions 装配）
- `src/core/config.js:32-52`（models 默认值）
- `src/runtime/round.js:246-333`（policyFor / modelsFor）
- `~/.dsh/profiles/desktop/cordis.patch.yml:47-93`（provider 与默认模型）
- 宿主契约 `agentDefaultModel.currentSelection()`、`SubagentStartRequest.agentOptions`
