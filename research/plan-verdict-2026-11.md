# 预规划节点（pre-map planner）到底回本吗？

**结论日期**：2026-11-10
**数据**：`~/.dsh/loom/campaigns/*/events.jsonl`，55 个文件、1.68 MB、158 条 `round.finished`
**口径**：按 `(campaign, n)` 去重后 **155 轮 / 54 个 campaign / 晋升 90（58.1%）**
**复现**：附录 A 是脚本全文，附录 B 是 18 个超时轮逐行明细，数字全部由这两份输出直接抄录

## 结论先行

1. **on 还是 off，账本回答不了。** 不存在可识别变异：18 个超时轮的 `planMs` **全部落在 240.6–241.1s**（240s 窗 + 约 1s 开销，极差 473ms），规划时长在"超时臂"内几乎没有变异；这 18 轮集中在 12 个 campaign，其中 8 个没有任何对照臂。
2. **任务级配对确实存在，但它没用。** 同 campaign、同 taskId、两臂各至少一轮的单元全库只有 **2 个**，合计 2 轮 vs 7 轮；一个两臂全输、一个两臂全赢——配对信息量 = 0。
3. **能判的是成本，而且成本很硬。** 规划吃掉 **24.9%** 的墙钟（13,436s / 54,046s），当前 **983s/晋升**；完全去掉规划 → 738s/晋升（−24.9%）。
4. **其中三分之一是白扔的。** 18 轮超时 × 241s = 4,338s，占全部规划时间的 **32.3%**、总墙钟的 8.0%，产出是空计划（`round.js` 注释自己写着 "A timed-out planner is not a plan"）。
5. **240s 的窗其实没被硬执行。** 34 轮 pre-map 超过 240s，只有 18 轮被标记 `planTimedOut`；超窗滑移合计 **1,511s（2.8% 墙钟）**，最长的一次规划调用跑到 510s。硬执行是唯一零风险的改动。
6. **所以答案是 conditional，但条件必须落在"预算与信号"上，不能落在"任务难度"上。** 任何"难题多给规划时间"的规则，都需要一个账本里不存在的难度标签。
7. **三条候选条件**：C-1 硬执行 240s（省 1,511s / 2.8%，改 34 轮，零风险）；C-2 预算降到 120s（省 6,780s / 12.5%，改 52 轮，需前瞻 A/B）；C-3 把 plan cache 复用当"卡住"信号（改 6 轮，诊断价值 > 节省价值）。
8. **不要用"上一轮输了就更该规划"。** 数据方向是反的：上一轮输 → 本轮 5/27 = 18.5%；上一轮赢 → 10/30 = 33.3%；全体 58.1%。但此对比含时代混杂，**这只是我的推断，未验证**。
9. **现有的 `auto` 规则几乎是死代码。** `round.js:288-304` 要求"连续两轮都超时且都晋升"才在下一轮关规划，155 轮里只命中 **1 次**（loom-tri13 r3）。
10. **唯一一轮 `planMode:'off'` 证明的是可行性，不是优越性**：651s 墙钟，并不快于规划时代的平均墙钟（762s），且它是该 campaign 唯一的一轮。

## §1 数据与口径：先把"我的数字"和"lead 的数字"对齐

### 1.1 事件计数

| 项 | 数值 |
|---|---|
| `round.finished` 原始行 | 158 |
| 重复的 `(campaign, n)` 键 | 3（`loom-self3` r3、`loom-self4` r4、`loom-ui6` r1，各 2 条） |
| 去重后唯一轮次 | **155** |
| campaign 数 | 54 |
| 晋升 | 90（58.1%） |

去重的两种做法会给出不同分母：保留最后一条 = 155，直接丢弃重复 = 152。**lead 的 153 落在两者之间**，所以差异来自去重口径而不是数据缺失；所有比率的差别 < 2pp，下文结论不受影响。

### 1.2 字段覆盖（155 轮）

| 字段 | 有值轮次 | 说明 |
|---|---|---|
| `durationMs` | 85 | 轮墙钟 |
| `planMs` | 77 | 前规划相位墙钟 |
| `planTimedOut` | 47 | 布尔 |
| `planMode` | **13** | 12 个 `full` + 1 个 `off` |
| `tokens` / `costUsd` | 85 | 合计 265,331 tok / $0.068589 |
| `holdoutMs` | 47 | 合计 4,667s，均 99s |

**第一处必须纠正的起点数字**：lead 说"`planMode` 几乎全是 `full`"。事实是它只出现在 **13/155 = 8.4%** 的轮上，剩下 142 轮该字段缺失。所以"全局都是 full"是一个**只有 8% 样本支持的陈述**，不能当作证据使用。

### 1.3 一条真实的账本行（`loom-tri5` seq 43，原样抄录）

```json
{"seq":43,"t":1794083229842,"type":"round.finished","actor":"system",
 "data":{"n":3,"status":"no-gain","score":0,"promoted":false,
         "candidateMode":"parallel","candidatesPlanned":2,"skippedCandidates":0,
         "durationMs":60361,"planMs":86,"attemptCount":2,"attemptMs":119527,
         "verifierRuns":2,"verifierMs":291,"tokens":2390,"costUsd":0.00067,
         "priceSource":"default"}}
```

三个必须注意的口径陷阱，全在这一行里：

- **`planMs` 单位是毫秒**，`86` = 86ms，不是 86s。所有"241s"的轮，账本里是 `241000`。
- **`attemptMs` 是求和，不是墙钟**：这一轮 `attemptMs=119527` > `durationMs=60361`，因为两个候选并行。85 轮里 **43 轮** `attemptMs > durationMs`。
- 因此 lead 给的 **attempt-window = durationMs − planMs − holdoutMs** 在并行轮上不是"尝试用时"，只是一个残差。`loom-holdout-live` r1/r2 就是极端例：wall 256s/258s、plan 241s、attempt 合计 15s/17s（noop 任务），残差 ≈ 15s，恰好等于真实 attempt 时间——**纯属巧合**，不能当规律。

### 1.4 判据

`planMs > 1,000ms` 记为"planner 真的跑了"；`≤ 1,000ms` 记为"没有计划"。这两个口径在 §2.2(c) 会被证明**不能**互相替代：前者是 76 轮，后者是 19 轮，而且后者不是"off 臂"。

## §2 问题 1：这个混杂能不能拆开？

### 2.1 表面上的强关联

| | 晋升 | 未晋升 |
|---|---|---|
| `planTimedOut = true` | 17 | 1 |
| `planTimedOut = false`（含无计划的轮） | 30 | 28 |

Fisher 双侧精确检验 **p = 0.0008**，OR = 15.9。换成更严的口径（对照只取"有 `planTimedOut=false` 且有 `planMs` 的 29 轮"）是 17/18 vs 10/29 = 94.4% vs 34.5%。

如果只看这一张表，结论会是"规划超时的轮更容易晋升"——这显然荒谬。下面三条是它荒谬的原因。

### 2.2 为什么这个 p 值在这里没有意义

**(a) 近似零变异：超时不是"难度连续量"，而是常量截断。**

18 个超时轮的 `planMs` 值：240,649 – 241,122 ms（换算成秒全部读到 241s，**极差只有 473ms**，见附录 A 的 `spread` 与附录 B）。也就是说"超时"这个变量在超时臂内部**几乎是常数**：全部 18 轮都被截断在 240s 窗上、只多出约 1s 的收尾开销。变异是 0.2% 的窗宽，属于噪声。那么，超时臂与其它臂在 attempt、holdout、墙钟上的任何差异，**都不可能是"规划时长"造成的**，因为它几乎没有变化。这是本次分析里最干净的一条逻辑：不是"混杂需要控制"，而是"被解释变量在臂内是退化的"。

**(b) 完美共线：`planTimedOut` 是 campaign 的标签，不是轮的属性。**

18 个超时轮分布在 12 个 campaign：

| campaign | 超时轮 | 同 campaign 的对照轮 | 该 campaign 晋升 |
|---|---|---|---|
| loom-tri13 | 3/3 | 无 | 3/3 |
| loom-dl | 2/2 | 无 | 2/2 |
| loom-hedge | 2/2 | 无 | 2/2 |
| loom-bal2 | 2/2 | 无 | 2/2 |
| loom-holdout-live | 2/2 | 无 | 2/2 |
| loom-noop | 1/1 | 无 | 1/1 |
| loom-band | 1/1 | 无 | 1/1 |
| loom-dag1 | 1/1 | 无 | 1/1 |
| loom-life2 | 1/1 | 1/1 | 2/2 |
| loom-bal3 | 1/1 | 1/1（另一任务） | 2/2 |
| loom-plan2 | 1/1 | 0/1（另一任务） | 1/2 |
| loom-life | 0/1 | 0/6 | 0/13 |

8 个 campaign **只有超时轮**、没有对照轮，且全部 100% 晋升。这些恰好是"给 loom 加一个功能 + 一条机械断言"的自举任务（plan-mode、knowledge、deadline、hedge-stats…），天然容易过。所以 `planTimedOut=true → 晋升` 讲的是**这批 campaign 的性质**，不是规划的性质。

**(c) 低 planMs 的 19 轮不是 off 臂，是"卡住"的样本。**

19 轮 `planMs ≤ 1,000ms`，分解：

| 组成 | 轮数 | `planMs` | 晋升 |
|---|---|---|---|
| plan cache 命中（`reused:true`） | 6 | 84–182ms | **0/6** |
| `loom-life` 的循环轮 | 12 | 569–841ms | **0/12** |
| 唯一 `planMode:'off'` 轮 | 1 | 0 | 1/1 |
| 合计 | 19 | — | 1/19 |

注意 `loom-life` 那 12 轮：`planMs` 只有 0.6–0.8s，意味着**规划器根本没跑**（不是跑得快）。也就是说 `loom-life` 事实上是一个"关掉规划的 campaign"，而它在 12 轮里 0 晋升。把它当成"没有规划也能行"的证据，等价于用"卡死的循环"当基线。

### 2.3 任务级配对：技术上存在，实质为空

配对定义：同一 campaign、同一 `taskId`、超时臂与成功臂各至少 1 轮。全库**只有 2 个单元**：

| campaign | task | 超时臂 | 规划成功臂 |
|---|---|---|---|
| `loom-life` | `dispose-recovery` | 0/1（675s，plan 241s） | 0/6（88–97s，plan ≈0） |
| `loom-life2` | `dispose-recovery` | 1/1（673s，plan 241s） | 1/1（605s，plan 207s） |

- 单元 1：该任务在 `loom-life` 里 7 轮 0 晋升；**同一个任务**在 `loom-life2` 里两臂都赢。这说明 `loom-life` 的失败是任务/基座问题，与规划无关。
- 单元 2：两臂同果，零信息。
- 合并：**1/2 vs 1/7**；去掉 `loom-life` 后 **1/1 vs 1/1**。

**直白回答 lead 的问题**：配对"存在"（n=2），但两个单元都是"两臂同果"，所以可识别的信息量是 0。这不比我一开始以为"完全没有配对"更好，只是更精确地说清了为什么不能用。

### 2.4 最佳可用 proxy 是什么

候选 proxy 有三个，全部不合格，列出以便不再重复尝试：

1. **campaign 内跨任务比较**：`loom-bal3`、`loom-plan2` 的两臂落在不同 `taskId` 上，只能当弱对照（n=1/臂）。
2. **按 `tokens` 或 `candidatesPlanned` 分层**：两者都与"是否新式 campaign"强相关，分层后每格 n<5。
3. **用 `holdoutMs` 做工具变量**：holdout 是唯一外部金标准，但它只覆盖 47 轮且与时代强相关（27/47 = 57.4% 晋升 vs 无 holdout 28/37 = 75.7%），同样不可用。

→ 结论：**回顾性代理不存在**。要判 on/off，只能前瞻性制造变异（§5 C-2 的交替设计）。

## §3 问题 2：规划的边际成本

### 3.1 两种货币，只有一种稀缺

| 口径 | 数值 | 备注 |
|---|---|---|
| 墙钟占比 | **24.9%** | 13,436s / 54,046s（85 轮有 `durationMs`） |
| 规划总秒数 | **13,436s** | 77 轮有 `planMs`，均 176s，最长一次规划调用 510s |
| 超时白扔 | **4,338s** | 18 轮 × 241s = 规划时间的 32.3%、总墙钟 8.0% |
| 超窗滑移 | **1,511s** | 34 轮超 240s，其中 16 轮**未**被标记 `planTimedOut` |
| 美元 | **$0.0686** | 265,331 tok / 85 轮 ≈ $0.0008/轮 |

美元不是约束（$0.0686 跑 155 轮），所以"换更便宜的模型省规划"这类讨论在本仓没有杠杆。**唯一稀缺的是墙钟与 holdout 额度。**

### 3.2 每分钟晋升的墙钟（正确反事实公式）

反事实必须写成 `newWall = durationMs − max(0, planMs − cap)`：给一个 cap，只砍掉超出 cap 的那部分，而不是把整个 `planMs` 抹掉。晋升数固定为 55（85 轮里有 `durationMs` 的那批）：

| 反事实 | s/晋升 | 相对现状 | 省下 |
|---|---|---|---|
| 现状（240s 窗，未硬执行） | **983** | — | — |
| 完全去掉规划 | 738 | −24.9% | 13,436s |
| cap 60s | 800 | −18.6% | 10,048s |
| cap 90s | 830 | −15.5% | 8,398s |
| cap 120s | 859 | −12.5% | 6,780s |
| cap 150s | 888 | −9.7% | 5,230s |
| **cap 240s（只砍滑移）** | **955** | **−2.8%** | **1,511s** |

最后一行是本次分析的关键：**把 240s 真正执行，只省 2.8%**——因为 18 个超时轮本来就恰好停在 240s。真正超窗的是那 16 个"跑了 240s 以上还没被标记"的轮（最长 510s）。反过来说，**"死守 240s"是个便宜的卫生措施，不是效率杠杆**；要动效率，必须动 cap 本身（C-2）。

### 3.3 `planMs` 分桶（77 轮）

| 桶 | n | 晋升 | 墙钟合计 |
|---|---|---|---|
| ≤ 1s | 18 | 0 | 3,338s |
| （另：恰为 0 的 off 轮） | 1 | 1 | 651s |
| 1–60s | 3 | 1 | 699s |
| 60–120s | 2 | 1 | 786s |
| 120–240s | 19 | 15 | 13,401s |
| ≥ 240s | 34 | 30 | 28,702s |

**这张表不能读成"规划越多越好"。** 它的正确读法是：两端都不晋升——低端是卡住的重试（§2.2c），高端有 18 个空计划；中间 120–240s 的 19 轮才是"规划真的产出内容"的样本，15/19 = 79%。而 ≥240s 桶的 30/34 = 88% 之所以更高，是因为那 18 个超时轮几乎全在容易的自举 campaign 里。

### 3.4 与 holdout 的交叉

47 轮带 holdout（均 99s，合计 4,667s），晋升 27/47 = 57.4%；不带 holdout 28/37 = 75.7%。这**不是**"holdout 有害"的证据，而是"早期轮没有 holdout"的时代混杂。它的用处只有一个：提醒我们**任何跨时代的对照都会被同样污染**，这也是 §2 结论的同一个病根。

## §4 问题 3：唯一一轮 `planMode:'off'` 能证明什么

**这一轮**：`loom-ab` r1，task = `second-candidate-gate`，`promoted=true`，`durationMs=650631`（651s），`planMs=0`，`holdoutMs=140s`，`tokens=2389`，`costUsd=0.000802`，`candidates=2`（parallel），**该轮没有任何 `node.finished` 记录**（规划器确实没启动）。

**它能证明三件事：**

1. **可行性**：零规划墙钟下，一轮仍能完成 attempt + holdout + 晋升。所以"planner 是晋升的必要条件"这个假设是错的。
2. **字段可用性**：`planMode` 这个字段会被写进账本（虽然 155 轮里只写过 13 次）。
3. **下界**：规划可以被完全跳过而不崩，至少对这一类任务——它的 `task.verify.cmd` 是一条能机械判定的断言。

**它不能证明四件事：**

1. **不能证明"关掉更好"**：`loom-ab` 全库只有这 1 轮，没有同 campaign 基线。
2. **不能说它更快**：651s 并不低于规划时代的平均墙钟（762s）。唯一一轮 off 恰好落在一个长尾上——单看它，"省掉 240s 规划"的收益被 attempt 的方差完全吞掉了。
3. **不能做因果推断**：这一轮同时改变了 `planMode`、任务、campaign、候选模式，一次改 5 个变量，n=1。
4. **不能外推到"所有轮"**：`second-candidate-gate` 是我们自己写的、带机械断言的测试型任务；真正的探索型任务不在样本里。

一句话：**它证明了可行性，没证明优越性。** 把它当成"off 也 100% 晋升（1/1）"来引用，是 n=1 的典型误用。

## §5 问题 4：三条候选条件

每条给出：改什么 / 读哪些账本字段 / 可证伪的预测 / 会改变历史多少轮 / 怎么机械验证。

### C-1（推荐，零风险，先做）硬执行 240s 并把超窗量记账

- **改什么**：pre-map 阶段已经有 `planTimeoutMs`（默认 240,000ms）并设了 deadline，但 34 轮里 16 轮在 240s 之后才返回，说明 deadline 只被**记录**、没被**执行**（有 `graceMs` 90s 的痕迹）。改成 fail-closed：到点即中止，`planTimedOut=true`、findings 为空；同时给 `round.finished` 加一个 `planOverrunMs = max(0, planMs − planTimeoutMs)`。
- **读字段**：`round.finished.planMs`、`planTimedOut`、`durationMs`；`node.finished.durationMs`、`stopReason`、`timedOut`。
- **可证伪预测**：硬执行后，16 个原超窗轮的晋升率**不下降**。可检验的当前对照：未超窗的 120–240s 桶 15/19 = 79%，超窗的 16 轮 13/16 = 81%——无差异。若硬执行后这 16 轮掉到 < 70%，则 C-1 回滚为"只告警"。
- **改变历史轮数**：34 轮（18 轮只省约 1s，16 轮平均省约 94s）。
- **省多少**：1,511s = 2.8% 墙钟，983 → 955s/晋升。
- **机械验证**（写成断言）：一个纯函数 + 一条账本审计。
  ```
  planBudget(planMs, planTimeoutMs) -> { withinBudget: planMs <= planTimeoutMs, overrunMs: max(0, planMs - planTimeoutMs) }
  断言 1（历史审计，修复后应 0 违规）：overrunMs === 0 对所有带 planMs 的轮
  断言 2（单测）：planBudget(241000, 240000).overrunMs === 1000
  ```
  落点建议 `tests/balance/plan-budget.test.mjs`：断言 1 用 `scripts/loom-metrics.mjs` 输出的 JSON 做输入（不直接读 `~/.dsh`）。

### C-2（需前瞻检验，唯一能省两位数的改动）预算从 240s 降到 120s

- **改什么**：`config.session.planTimeoutMs` 240,000 → 120,000；或按 campaign 配，verifier 型任务给 120s，探索型给 240s。
- **读字段**：`planMs`、`planTimedOut`、`promoted`、`durationMs`。
- **可证伪预测**：120–240s 桶（19 轮，15 晋升，79%）与 ≤120s 桶（5 轮，2 晋升，40%）的差**全部来自时代/任务**，同一 campaign 内交替后差异消失。**这条现在无法验证**：≤120s 桶只有 5 轮 2 晋升，且 3 轮来自早期。所以它是"前瞻可证伪、回顾不可证伪"。
- **改变历史轮数**：52 轮（`planMs > 120s` 的 19 + 34，扣除 1 轮恰为 120s）。
- **省多少**：6,780s = 12.5% 墙钟，983 → 859s/晋升。
- **机械验证**：campaign 内按轮次奇偶交替 `planTimeoutMs`（120/240），20 轮后比较：
  ```
  断言：sPerPromotion(T) <= 0.95 * sPerPromotion(C)
     且 promotionRate(T) >= promotionRate(C) - 0.10
  ```
  任一不成立即证伪 C-2，退回 240s。这个断言可以直接写进一个读账本的脚本（`tests/balance/plan-budget-ab.test.mjs` 需要注入假账本，不能读真实 ledger）。

### C-3（诊断，不省时间）把 plan cache 复用当"卡住"信号

- **事实**：`node.finished.reused === true` 的 6 轮 **0 晋升**（`loom-bal4` r2/r3、`loom-demo-plan` r2/r3、`loom-tri11` r4、`loom-tri5` r3），全部是同一任务在同一 `base` 上的重试；`planMs` 84–182ms（复用确实几乎免费），但整轮墙钟 60–663s。
- **改什么**：不改规划本身，改**下一步动作**——当 `reused=true` 且该任务上一轮未晋升时，不再重跑同一链，而是（a）换链/换候选模式，或（b）注入"该计划已失败"的 lesson 后再规划。
- **读字段**：`node.finished.reused`、`planBasis`（`same`/`delta`）、`round.finished.promoted`、`round.started.taskId`。
- **可证伪预测**：未来 10 轮若 reuse 轮仍 0 晋升，则"reuse=卡住"成立；一旦有 reuse 轮晋升，信号失效。历史预测已成立（0/6）。
- **改变历史轮数**：6 轮（未来每出现一次 reuse 就改一次决策）。
- **机械验证**：`assert(reuseRounds.every(r => !r.promoted))` 作为当前不变式；修复后改为"reuse 轮必须带 `escalate:true`"。

### 明确不采纳的三个条件

| 条件 | 数据 | 为什么不采纳 |
|---|---|---|
| 上一轮输 → 本轮更该规划 | 输后 5/27 = 18.5%；赢后 10/30 = 33.3%；全体 58.1% | 方向是反的；且含时代混杂，只是推断 |
| 连续两轮超时且赢 → off（现有 `auto`） | 155 轮命中 **1** 次（loom-tri13 r3） | 实际没有调节能力，等同死代码 |
| 全局 `planMode:'off'` | 30 轮"planMs 1–240s 且晋升" | 账本无法告诉你这些轮失去计划后还剩多少 |

## §6 什么会推翻这份结论

按"推翻力度"排序。任何一条成立，请直接改结论，不要给这份文档打补丁。

1. **同 campaign、同任务、两臂各 ≥3 轮的对照出现，off 臂晋升率 ≥ on 臂** → 立即关规划，省 24.9% 墙钟。这是唯一能直接判 off 的证据形态。
2. **C-2 的交替实验跑完 20 轮，`sPerPromotion(T) ≤ 0.95 × sPerPromotion(C)` 且晋升率不掉 10pp** → 采纳 120s，我的"需谨慎"作废。
3. **把"计划是否被 attempt 真正使用"写进账本**（findings 条数、plan hash 是否进了 attempt prompt）后，发现晋升轮与非晋升轮的使用率差 > 20pp → 规划有真实贡献，应保留 240s 甚至放宽，C-1 的"零风险"也要重估。
4. **硬执行 240s 后，16 个原超窗轮晋升率掉到 < 70%** → 说明"多给的计划时间"确实有用，C-1 必须回滚成告警。
5. **`auto` 规则被改成"一次超时+晋升就 off"后，被关掉的轮晋升率不降** → 说明 240s 是白给的，此时应该直接讨论全局 off，而不是 C-1/C-2。

## §7 我标为"未验证 / 我的推断"的部分

1. "16 个未标记超窗轮跑了 240s 以上"——来自 `planMs > 240,000` 与 `planTimedOut !== true` 的差集（34 − 18 = 16），**但没有逐轮核对它们的 `stopReason`**，可能其中几轮是"正常完成但很慢"而非"超窗未中止"。（我的推断）
2. "`loom-life` 的 12 轮规划器没跑"——依据是 `planMs` 只有 0.6–0.8s。**替代解释**：规划器跑了但极快（缓存命中？但 reuse 记录只有 6 条，不在这 12 轮里）。未验证。
3. "8 个纯超时 campaign 都是自举任务所以容易过"——依据是 `taskId` 的名字（plan-mode、knowledge、deadline…），**没有读这些任务的 `verify.cmd`**。（我的推断）
4. "上一轮输后更难赢"——18.5% vs 33.3%，但两组的时代构成不同（`loom-life` 的 12 轮占了输后组的大头）。（未验证）
5. "$0.0008/轮 说明美元不是约束"——只对当前 `DEFAULT_PRICING`（0.28/0.42 每百万 tok）成立；若换成真实计费模型，这个结论要重算。（前提依赖）

## 附录 A：复现脚本

本机 PowerShell 执行策略禁止 `.ps1`，必须用 `Invoke-Expression` 载入：把下面存成 `plan-audit.ps1`，然后运行 `Invoke-Expression ([System.IO.File]::ReadAllText('C:\path\to\plan-audit.ps1'))`。

```powershell
$ErrorActionPreference = 'Continue'
$root = Join-Path $env:USERPROFILE '.dsh\loom\campaigns'
$map = @{}; $starts = @{}; $nodeHits = @{}
foreach ($f in (Get-ChildItem $root -Recurse -Filter events.jsonl)) {
  $camp = $f.Directory.Name
  foreach ($line in [System.IO.File]::ReadAllLines($f.FullName)) {
    if ($line -notmatch '"type":"(round\.finished|round\.started|node\.finished)"') { continue }
    try { $o = $line | ConvertFrom-Json } catch { continue }
    if ($o.type -eq 'round.started') { $starts["$camp|$($o.data.n)"] = $o.data.taskId; continue }
    if ($o.type -eq 'node.finished') {
      if ($o.data.reused -eq $true) { $nodeHits["$camp|$($o.data.round)"] = $true }
      continue
    }
    $d = $o.data
    $map["$camp|$($d.n)"] = [pscustomobject]@{
      camp = $camp; n = [int]$d.n; promoted = $d.promoted; planMs = $d.planMs
      timedOut = $d.planTimedOut; wall = $d.durationMs; holdout = $d.holdoutMs
      tokens = $d.tokens; usd = $d.costUsd; taskId = $starts["$camp|$($d.n)"]
    }
  }
}
$rounds = @($map.Values)

"rounds=$( $rounds.Count ) campaigns=$( @($rounds|Group-Object camp).Count ) promoted=$( @($rounds|Where-Object{$_.promoted}).Count )"
"withDuration=$( @($rounds|Where-Object{$null -ne $_.wall}).Count ) withPlan=$( @($rounds|Where-Object{$null -ne $_.planMs}).Count )"

$dur = @($rounds | Where-Object { $null -ne $_.wall })
$wall = ($dur | ForEach-Object { [double]$_.wall } | Measure-Object -Sum).Sum
$plan = ($dur | ForEach-Object { if ($null -ne $_.planMs) { [double]$_.planMs } else { 0 } } | Measure-Object -Sum).Sum
$pro  = @($dur | Where-Object { $_.promoted }).Count
"wall=$([math]::Round($wall/1000,0))s plan=$([math]::Round($plan/1000,0))s share=$([math]::Round(100*$plan/$wall,1))% perPromotion=$([math]::Round(($wall/1000)/$pro,0))s"

# 反事实：newWall = durationMs - max(0, planMs - cap)
foreach ($cap in @(60,90,120,150,240)) {
  $saved = 0.0
  foreach ($r in $dur) { $over = [double]$r.planMs - $cap*1000; if ($over -gt 0) { $saved += $over } }
  "cap ${cap}s perPromotion=$([math]::Round((($wall-$saved)/1000)/$pro,0))s saved=$([math]::Round($saved/1000,0))s ($([math]::Round(100*$saved/$wall,1))%)"
}

# 超时轮的变异检查：deadline 是"截断点"，不是"难度的测量"
$to = @($rounds | Where-Object { $_.timedOut -eq $true })
$pms = @($to | ForEach-Object { [double]$_.planMs })
$lo = ($pms | Measure-Object -Minimum).Minimum
$hi = ($pms | Measure-Object -Maximum).Maximum
"timeouts=$($to.Count) planMsRange=$([math]::Round($lo/1000,1))-$([math]::Round($hi/1000,1))s spread=$([math]::Round($hi-$lo,0))ms"

# 同 campaign 同 task 的双臂单元
foreach ($g in ($rounds | Where-Object { $_.taskId } | Group-Object camp,taskId)) {
  $t = @($g.Group | Where-Object { $_.timedOut -eq $true })
  $c = @($g.Group | Where-Object { $_.timedOut -eq $false })
  if ($t.Count -gt 0 -and $c.Count -gt 0) {
    "CELL $($g.Name)  timeout $(@($t|Where-Object{$_.promoted}).Count)/$($t.Count)  completed $(@($c|Where-Object{$_.promoted}).Count)/$($c.Count)"
  }
}

# cache 复用轮的结局
$hits = @($rounds | Where-Object { $nodeHits.ContainsKey("$($_.camp)|$($_.n)") })
"reuseRounds=$($hits.Count) promoted=$(@($hits|Where-Object{$_.promoted}).Count)"
```

输出（本机实测，2026-11-10 02:31）：

```
rounds=155 campaigns=54 promoted=90
withDuration=85 withPlan=77
wall=54046s plan=13436s share=24.9% perPromotion=983s
cap 60s perPromotion=800s saved=10048s (18.6%)
cap 90s perPromotion=830s saved=8398s (15.5%)
cap 120s perPromotion=859s saved=6780s (12.5%)
cap 150s perPromotion=888s saved=5230s (9.7%)
cap 240s perPromotion=955s saved=1511s (2.8%)
timeouts=18 planMsRange=240.6-241.1s spread=473ms
CELL loom-life, dispose-recovery  timeout 0/1  completed 0/6
CELL loom-life2, dispose-recovery  timeout 1/1  completed 1/1
reuseRounds=6 promoted=0
```

## 附录 B：18 个超时轮逐行明细

`planMs` 全部落在 240.6–241.1s（极差 473ms，见附录 A 的 `spread` 检查）——deadline 是截断点，不是难度的测量。

| campaign | 轮 | task | plan | wall | attemptΣ | 晋升 |
|---|---|---|---|---|---|---|
| loom-bal2 | r1 | plan-mode | 241s | 884s | 1110s | ✅ |
| loom-bal2 | r2 | metrics-priority | 241s | 546s | 402s | ✅ |
| loom-bal3 | r1 | policy-override | 241s | 762s | 860s | ✅ |
| loom-band | r1 | node-band-render | 241s | 1036s | 1373s | ✅ |
| loom-dag1 | r1 | node-identity | 241s | 807s | 898s | ✅ |
| loom-dl | r1 | deadline | 241s | 558s | 422s | ✅ |
| loom-dl | r2 | late-success | 241s | 561s | 427s | ✅ |
| loom-hedge | r1 | hedge-stats | 241s | 690s | 687s | ✅ |
| loom-hedge | r2 | policy-visible | 241s | 699s | 704s | ✅ |
| loom-holdout-live | r1 | noop | 241s | 256s | 15s | ✅ |
| loom-holdout-live | r2 | noop | 241s | 258s | 17s | ✅ |
| loom-life | r1 | dispose-recovery | 241s | 675s | 720s | ❌ |
| loom-life2 | r1 | dispose-recovery | 241s | 673s | 687s | ✅ |
| loom-noop | r1 | holdout-noop | 241s | 1014s | 1318s | ✅ |
| loom-plan2 | r1 | plan-mode-evidence | 241s | 610s | 515s | ✅ |
| loom-tri13 | r1 | plan-model | 241s | 761s | 736s | ✅ |
| loom-tri13 | r2 | knowledge | 241s | 1431s | 2171s | ✅ |
| loom-tri13 | r3 | plan-model | 241s | 956s | 1082s | ✅ |

小计：18 轮，墙钟 13,177s，其中规划 4,338s；晋升 17。→ 计规划 775s/晋升，不计规划 520s/晋升（**但这是选择后的样本，不能当反事实**）。

两个 `noop` 轮值得单独看：wall 256s/258s、attempt 合计 15s/17s。也就是说这一轮的全部成本几乎是规划（241s）——**当任务是"什么都不用做"时，规划仍是 241s 的固定开销**。这正是"240s 窗是常量而非难度信号"的极端演示。

## 附录 C：口径警告清单

1. `planMs`、`durationMs`、`attemptMs`、`holdoutMs` 全部是**毫秒**。
2. `attemptMs` 是**多次尝试求和**，43/85 轮大于 `durationMs`（并行候选）。不能当墙钟用。
3. `planTimedOut` 只覆盖 47/155 轮；`planMode` 只覆盖 13/155 轮。任何"全局取值"的陈述都要标注覆盖度。
4. 158 条 `round.finished` 有 3 个重复 `(campaign, n)` 键；去重方式影响分母（152 / 155）。
5. 78 轮没有 `planMs` 字段（旧 schema，20 个 campaign，42 晋升）——它们**不能**当"没有规划"的对照，只能当"字段不存在"。
6. 所有跨时代的比较（有无 holdout、有无 planMs、`planMode` 是否 full）都会被同一个混杂污染：**新 campaign 更容易过**。
