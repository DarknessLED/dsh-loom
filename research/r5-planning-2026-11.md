# R5：规划为什么空转

调研日期 2026-11-11。对象：`src/runtime/round.js` 的 pre-map planner 节点（节点 id `recon`，role `planner`），以及 `src/runtime/plan-budget.js`、`src/dispatch/session.js`、`src/runtime/triangle.js`。所有日志取证来自 `C:\Users\Darkness\.dsh\loom\campaigns`（161 条 `node.finished`/planner 记录，50 个战役）。

## 结论先行（10 条）

1. **9/9 不是「规划无用」的证据，是一次基础设施事故的样本。** 这 9 轮全部来自 `loom-acc6`，全部 `status:"interrupted"`、`reason:"infrastructure"`，规划子在 **416/433/452/678/679/992ms** 内死掉（`loom-acc6/events.jsonl` 第 9/20/31/60/75 行附近）。同一战役的 worker 也一起被打断。
2. **全量语料是 48%，不是 0%。** 161 次规划里 `ok:true` **78 次（48.4%）**、超时 **22 次（13.7%）**、`stopReason:"error"` 且空文本 **58 次（36.0%）**、`max-tokens` 10 次。58 次错误只落在 7 个战役里（acc1–acc6、life），36 个战役拿到过可用规划——这是**成簇**故障，不是弥散的质量问题。
3. **「解析丢输出」这句可以排除。** 161 条里 `stopReason:"completed"` 共 67 条，**全部 `ok:true`**——没有一条是「跑完但 `textOf()` 拿到空串」。`session.js:4–10` 只收 `type==='text'` 块，结构性风险是真的（纯结构化回答会变空串），但它在这个语料里**一次都没发生**。把 36% 归因于解析，没有证据。
4. **240 秒确实太紧，但它解释不了 9/9。** 成功样本（`loom-life2` r2）耗时 **207070ms**，离 240000ms 只剩 33 秒；超时只占 13.7%。而 9/9 里的 6 条是 0.4–1 秒的瞬间失败，跟时限无关。
5. **真正缺的是「为什么失败」。** `session.js:361–383` 把「子会话自己报错且没有 diagnostic」压成一句 `child session ended in error with no diagnostic (parent or provider unavailable)`，`record.error` 只有这一句（`round.js:549` 也只把它当布尔用）。没有低基数错误分类，所以 58 次失败在台账里长得一模一样。
6. **我们测了 `planUsable`，但没有任何策略消费它。** 它进 `triangle.js:165–177` 变成「空手 N」，也被面板显示，但 `planModeFor`（`round.js:388–396`）只看 `planTimedOut` 与 `promoted`，`planBudgetMs`（`plan-budget.js:40–42`）只看 `planMs`/`planTimedOut`。**空手的惩罚为零**，只有超时会被降预算。
7. **plan-then-execute 的收益有真实证据，但条件是「计划可执行 + 变化时重规划」。** ReWOO 在六个基准上平均省 **64% token**、准确率 **+4.4%**（对 ReAct）；Self-Discover 在 25 个任务里 21 个胜 CoT、最高 **+42%**；而 Plan-and-Execute 的主要失效模式正是「计划失效但不重规划」（2026 年扰动实验）。
8. **小任务不该默认规划。** ADaPT 的做法是「执行失败才规划」；Claude Code 的 plan mode 是**用户显式进入**的模式（Shift+Tab 或 `/plan`），不是默认路径。我们 `planMode:'auto'` 的默认值（`src/core/config.js:135`）是反的：先付 118 秒，再证明它没用。
9. **一旦加「让模型评规划质量」，三个已知偏差就来了**：位置、长度、自偏好（同一族模型给自己打分更高）。我们目前**没有**模型评审（`planUsable` 是机械判断），但 `planModel = models.meta || models.worker`（`round.js:438`）意味着规划与执行常常同族；此时若让同一族模型评自己的计划，是最坏组合。
10. **一条诊断实验就能定性**（§7）：拿 10 个 `stopReason:"error"` 的 planner `sessionId` 去读子会话日志 + 同任务 `planMode:'off'` 的 A/B。半天内能回答「是基础设施、是时限、还是任务不需要」。

## §1 plan-then-execute 的真实收益在哪里

### 1.1 正收益证据（都是「先计划、再执行」的直接对照）

- **Plan-and-Solve**（ACL 2023，[arXiv:2305.04091](https://arxiv.org/abs/2305.04091)）：把 zero-shot CoT 换成「先给计划、再执行子步骤」，在 10 个数据集上稳定高于 zero-shot CoT，主要修的是计算错误、漏步、语义误解这三类。适用于**多步算术/符号推理**。
- **ReWOO**（[arXiv:2305.18323](https://arxiv.org/abs/2305.18323)）：计划与观察解耦，六个公开基准平均 **token −64%、准确率 +4.4%**（对 ReAct）。适用于**工具调用多、观察很长**的任务——省的是重复塞回上下文的观察。
- **Self-Discover**（NeurIPS 2024，[arXiv:2402.03620](https://arxiv.org/abs/2402.03620)）：先让模型自选推理模块组合成结构，再执行；25 个任务里 21 个胜 CoT，最高 +42%，且比 CoT+自洽少 10–40× 推理算力。适用于**任务结构未知、但可分解**的场景。

**对我们的含义**：这三条的收益都来自「计划让后续步骤更短或更准」。我们的规划子输出的是「缺口、涉及文件、如何验证」的散文，交给下游 worker 当 prompt——这更像 ReWOO 的「先想清楚要查什么」，理论收益是**省 worker 的探索 token**，不是省规划自己的时间。要证明它，得量 worker 阶段的 token/回合数，而不是只看最终通过率。

### 1.2 伪收益：别把「会背流程」当「会规划」

- **PlanBench**（[arXiv:2206.10498](https://arxiv.org/abs/2206.10498)）：多数「LLM 会规划」的结论建立在常识任务上，分不清是规划还是检索。
- **Chain of Thoughtlessness?**（[arXiv:2405.04776](https://arxiv.org/abs/2405.04776)）：在 Blocksworld 上，给 CoT 示例并不能让模型获得可迁移的规划能力；查询稍一泛化，收益就消失。**对我们的含义**：规划子即使这次写出了漂亮的「涉及文件」，也不代表它下一次能写对；用「这次它看起来挺专业」当验收是自欺。

### 1.3 负收益的机制：计划失效而不重规划

- **ADaPT**（[arXiv:2311.05772](https://arxiv.org/abs/2311.05772)）：plan-and-execute 的问题是「任一子任务执行不了就整体失败」，所以它改成**执行失败才让 planner 分解**，在 ALFWorld/WebShop/TextCraft 上同时优于纯 plan-and-execute 与纯迭代执行。
- **2026 年扰动实验**（Scientific Reports，[s41598-026-72720-7](https://www.nature.com/articles/s41598-026-72720-7)）：ReAct / Reflexion / Plan-and-Execute × 三种环境 × 4,320 个 episode，注入工具拒绝、目标修改、约束加严。Plan-and-Execute 的两大失效模式是 **tool-dependency collapse**（工具被禁了还继续调用）与 **plan-invalidation without revision**（计划里还引着被禁的工具，且不修订）。ReAct 没有计划可失效，反而少这一类。
- **对我们的含义**：我们的计划是**一次性文本**，写进 `findings` 就再不回看（`round.js:552`）；`planBasis:'same'|'delta'` 只决定「要不要重新规划」，不决定「执行中发现计划错了怎么办」。这正是上面那条失效模式。

### 1.4 我们自己的数据：9/9 是一次事故

按 `role:"planner"` 统计 161 条 `node.finished`：

| 结局 | 条数 | 占比 |
|---|---|---|
| `ok:true`（有文本、无超时、无错） | 78 | 48.4% |
| `timedOut:true` | 22 | 13.7% |
| `stopReason:"error"` + 空文本 | 58 | 36.0% |
| `stopReason:"completed"` | 67 | 41.6%（**全部 ok**） |
| `stopReason:"aborted"` | 26 | 16.1%（含全部 22 条超时） |
| `max-tokens` | 10 | 6.2% |

注意：`completed` 与 `ok` 在上表里**重叠**（67 条 completed 全部 ok），所以各桶不能相加；分区依据是 `stopReason`（67 + 58 + 26 + 10 = 161）。

错误的分布是关键：**58 条只出现在 7 个战役**（`loom-acc1` 1、`acc2` 14、`acc3` 8、`acc4` 6、`acc5` 7、`acc6` 9、`life` 13），而 36 个战役拿到过可用规划。`loom-acc6` 的 9 条与 lead 说的 9/9 完全重合，它们对应的每一轮 `round.finished` 都写着：

```
"status":"interrupted","reason":"infrastructure","planUsable":false,"planMode":"full"
```

（见 `loom-acc6/events.jsonl` 第 17/28/39 行。）也就是说：**规划子只是这一轮里第一个被拉起来的子会话**，基础设施坏掉时它第一个吃到错误；随后 candidate 也跑不成，整轮被标成 interrupted。把这段样本当成「规划质量」指标，等于拿停电当灯泡评测。

## §2 什么信号能判断「这次规划有价值」

### 2.1 事后信号：我们已经记了，只是没人用

- `planUsable`（`round.js:1080`）= `planFindings.length > 0`，恒等于 `record.ok`。它进 `round.finished` 的字段列表（`reduce.js:140`），进 `triangle.js:165–177` 的 `planUsable/planFailed`，面板把它显示成「空手 N」。
- **但没有任何策略读它**：`planModeFor` 只在「连续两轮超时**且**赢」时关（`round.js:388–396`），`planBudgetMs` 只在连续 3 次超时时减半（`plan-budget.js:27–60`）。一个跑满 118 秒、交白卷的规划子，**零代价**。
- **可证伪**：给 `plan-budget.js` 加一条「连续 `window` 次 `planUsable===false` 且非超时 → 同样减半」，再跑 10 轮，`planMs` 的移动平均应该下降；若它不下降，说明规划时间根本不是这个策略能省的（那就是 §4 的结论）。

### 2.2 事前信号：复杂度代理

业界没有「规划价值预测器」，只有**当需要才规划**的结构：ADaPT 用「执行失败」当触发器；TDAG（[arXiv:2402.10178](https://arxiv.org/abs/2402.10178)）按子任务动态生成子代理。对我们这种「一个战役反复改同一仓库」的形态，可用的廉价代理是：

- 改动面：`git diff --stat` 的文件数与行数（`planBasis:'delta'` 已经在算 `changedFiles`，`round.js:475–497`）；
- 结构面：`chain.nodes` 的数量与是否有 `map` 节点（`preMapAgentNodes`，`round.js:202–214`）；
- 历史面：该战役最近 3 轮 `attemptCount` 与 `verifierRuns` 的方差——方差小说明步骤固定，规划边际价值低。

**可证伪**：把 `planMode:'auto'` 改成「`changedFiles ≤ 2` 且最近 3 轮 `attemptCount` 中位数 ≤ 1 → 不规划」，比较 20 轮的 `promoted` 率；若通过率不降、`planMs` 占比从 25% 掉到 10% 以下，则「小改动不需要规划」在我们自己数据上成立。

### 2.3 规划质量的评估方法：细粒度、可执行、别只看通过率

- **TDAG 的 ItineraryBench**（[arXiv:2402.10178](https://arxiv.org/abs/2402.10178)）：二值打分下 ReAct/Plan-and-Solve/ADaPT/TDAG 全在 27–32%、无显著差异；换成细粒度打分后分层为 **43/44/45/49%**。**对我们的含义**：用「本轮是否晋升」评规划，等于用二值指标，噪声会把 5 个点的差异淹掉。
- **可执行性**是规划里最像「硬指标」的一项：计划里点到的文件是否存在、命令是否可跑、验证方式是否真有对应测试。我们的 `RECON_GUIDE`（`round.js:191–192`）已经要求「the files involved, and how success is verified」——**这句话可以机械检查**：解析 findings 里的路径，`fs.existsSync` 一遍，得到「计划可执行率」。这是全篇最便宜的新指标。
- **LLM-as-judge 的噪声有实测**：[arXiv:2512.09629](https://arxiv.org/html/2512.09629) 在 PlanBench + Google Natural Plan 上用同一批评审做三次评估，vanilla 的成功率最大波动 **12%**（七个任务平均）。也就是说，用模型当判官，±12 个点的抖动是常态。

## §3 「用模型评模型」的陷阱

前提：我们**现在没有**模型评审——`planUsable` 是「有没有文本」的机械判断，`triangle` 只做计数。以下五条是**如果**要按提案加「模型评计划质量」时会踩的坑。

1. **位置偏差**：同一对答案换顺序，判官会改判（[arXiv:2306.05685](https://arxiv.org/abs/2306.05685)，MT-Bench/Chatbot Arena 的系统性偏差清单：位置、长度、自我增强）。
2. **自偏好**：判官认得出自己的输出并给更高分，即使人类认为质量相同（Panickssery/Bowman/Feng，NeurIPS 2024，[arXiv:2404.13076](https://arxiv.org/abs/2404.13076)，oral）。
3. **长度偏差**：更长的答案更容易赢——而我们的规划子被要求写散文（`RECON_GUIDE` 明确「short plain text」），长度偏差会直接奖励啰嗦。
4. **Goodhart**：一旦 `planUsable` 或「计划评分」进策略，模型会学会产出「看起来可执行」的清单。`planUsable` 现在只判「有没有文本」，是最容易被灌水的一种。
5. **同族评审**：`planModel = models.meta || models.worker`（`round.js:438`）——如果 meta 与 worker 同族，评审就是自偏好最严重的配置。**可证伪**：加评审时用两个不同族的模型评同一批 findings，评分分布若几乎不变，说明自偏好不是主因；若差异显著，则评审必须由人抽样校准。

## §4 小改动类任务要不要规划

- **ADaPT**：只在执行失败时规划，且递归分解，不是每轮先规划。
- **Claude Code 的 plan mode**（[code.claude.com/docs/en/permission-modes](https://code.claude.com/docs/en/permission-modes)）：用户用 Shift+Tab 或 `/plan` **显式**进入；进入后编辑被阻断，直到批准计划；还有「No, keep planning」这条路径。也就是说，业界领先的实现把规划做成**人按需触发的模式**，而不是默认前置阶段。
- **Claude Code 的 workflows**（[code.claude.com/docs/en/workflows](https://code.claude.com/docs/en/workflows)）：文档的说法是「workflows move the plan into code」——计划写进脚本，由脚本循环/分支持有，模型上下文里只留最终答案。**对我们的含义**：我们的 `chain` 已经是这个形态（节点+角色），那么「计划」更适合作为**链上的一次显式节点**，而不是每轮一次的影子阶段。
- **Anthropic 的 agent 指南**（[building-effective-agents](https://www.anthropic.com/research/building-effective-agents)）：从最简单的可组合模式开始，编排者-工作者只在需要时引入。它没有把「先规划」列为默认第一层。

**结论**：小改动（单函数、单分支）不该默认付 118 秒。默认应当是 `off` 或「失败后再规划」；`full` 作为显式选择。

## §5 9/9 空手的四种可能，逐条判

| 假设 | 证据 | 判定 |
|---|---|---|
| (a) prompt 有问题 | 成功样本 `loom-life2` r2 用同一份 `RECON_GUIDE` 写出了 400 字、含文件与验证方式的 findings；78/161 成功 | **否**（prompt 可用，只是不保证） |
| (b) 240 秒不够 | 成功样本 207070ms，离上限 33 秒；超时 22/161 | **部分成立**：对「长规划」紧，但解释不了 0.4 秒的失败 |
| (c) 这个任务类型本不需要规划 | 9/9 全在 `loom-acc6`，每轮 `reason:"infrastructure"` | **样本不能回答**；但全量 48% 可用说明「不需要」不是 0% 的原因 |
| (d) 解析丢了有效输出 | `textOf` 只收 text 块（`session.js:4–10`）；但 completed 且空文本 **0/161** | **否**（一条都没有） |

**我的判断**：9/9 的直接原因是 (b)+(e)，其中 (e) 是我加的第五种——**子会话在 0.4–1 秒内失败，且失败原因被 `session.js:379` 压成了一句不可诊断的话**。`planUsable:false` 只是这句话的下游。

## §6 计划复用的粒度

我们现在的复用（`round.js:475–497`）只有三档：

- `same`：`entry.base === base` → 直接用缓存计划，`durationMs:0`；
- `delta`：base 变了，但**改动文件与本轮计划点名的文件没有交集** → 复用旧计划；
- 否则：重规划。

问题在 `delta` 的语义：它只比较「文件名交集」，不比较**计划内容是否仍然成立**。改一个函数签名而文件名不变，`delta` 会认为计划仍然有效——这正是 §1.3 的 plan-invalidation。

业界的更细粒度：

- **plan repair vs replanning**（Fox 等，[strathprints 2776](https://strathprints.strath.ac.uk/2776/1/strathprints002776.pdf)）：修复复用原计划的推理成果，只改动被破坏的部分，并显式度量 **plan stability**（新计划与原计划的距离）。比全量重规划快，且执行更稳。
- **Classical replanning 的教训**：修复的收益来自「确认未受影响的部分仍然有效」，而不是「假设它有效」。落到我们身上：`delta` 复用时应当**逐条核对计划的假设**（文件还在、命令还能跑、验证测试还存在），任何一条失败就降级为重规划。
- **迁移到代码形态**：Claude Code workflows 把计划搬进脚本，改的是脚本而不是重跑一次「规划阶段」——等价于「只重规划受影响的那一段」。

**可证伪**：给 `cachedPlanEntry` 的 `delta` 路径加「文件存在性 + 计划中命令的可解析性」两项校验，记录校验失败率；若失败率 > 10%，说明 `delta` 现在正在大量复用已经失效的计划。

## §7 立刻可做的诊断实验（半天）

按顺序做，前两步不需要改代码：

1. **读子会话日志。** 从 10 条 `stopReason:"error"` 的 planner 记录里各取 `sessionId`（例如 `loom-acc6` 的 `197a9d15-df32-4a22-a94a-c61503cc939f`、`18a3ae5e-b0a3-49d2-964b-d135eb1a7464`），找到对应子会话日志，看第一条错误是什么。若日志里是 `rate_limit` / `auth` / `context_length` 之类，则 58 条的错误分类立刻清楚；若是空，则问题在 `#sessionDiagnosis`（`session.js:368`）读不到日志。
2. **按时间对齐。** 把这 7 个战役的 planner 错误时刻与宿主的其他活动对齐，确认是否同一时间窗（同一缺陷）。`loom-acc2` 的 `240502/240755/240561ms` 三条超时与 `loom-acc6` 的 0.4 秒失败是否同窗，决定「这是两个 bug 还是一个」。
3. **同任务 A/B。** 挑一个 `planUsable:false` 的任务，`planMode:'off'` 跑 5 轮，再用 `full` 跑 5 轮，比较 `promoted` 率与 `attemptMs`。这是我们唯一能直接回答「规划值不值 118 秒」的实验；样本小，但足以排除「规划是净负收益」这一极端。
4. **加低基数错误分类。** 按 OTel GenAI 的 `error.type` 约定（[semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)：`rate_limit`/`context_length_exceeded`/`auth`/`network`/`_OTHER`）在 `session.js:379` 之外保一份 `errorType`，写进 `node.finished`。这条改动小于 10 行，却让 58 条错误第一次可分组。
5. **量「计划可执行率」。** 把成功 findings 里点名的路径与验证命令抽出来，逐条 `existsSync` / 试跑，得到「计划里有多少条能落地」。这是 §2.3 的细粒度指标，也是唯一不依赖晋升结果的规划质量信号。

**判读标准**：若第 1 步显示错误是基础设施类（rate_limit/network），则规划本身没问题，问题是重试与分类缺失；若第 3 步显示 `off` 的通过率不低于 `full`，则默认值应改成 `auto`+失败后规划（ADaPT 形态），而不是「每轮先规划」。

## §8 可证伪的结论清单

1. 「9/9 是事故样本」→ 若 `loom-acc6` 的 9 轮不是全部 `reason:"infrastructure"`，此结论错。证据：`loom-acc6/events.jsonl:17,28,39` 等。
2. 「解析不是主因」→ 若 58 条错误里出现 `stopReason:"completed"` 的记录，此结论错。当前 67 条 completed 全部 `ok:true`，空文本 0 条。
3. 「时限是次要因」→ 若把 `planTimeoutMs` 从 240000（`config.js:80`）提到 480000 后 `ok` 率仍 <60%，则时限不是主因。
4. 「策略不消费 planUsable」→ 若 `planModeFor`（`round.js:388–396`）或 `planBudgetMs`（`plan-budget.js:40–42`）读了 `planUsable`，此结论错。当前不读。
5. 「小改动可省规划」→ 若 `changedFiles ≤ 2` 的轮次在 `off` 下 `promoted` 率显著更低，此结论错。
6. 「delta 复用会复用失效计划」→ 若加「文件存在 + 命令可解析」校验后失败率 <10%，此结论错。

## §9 我否决的提案

- **否决「加大超时到 10 分钟」。** 成功样本 207 秒已经逼近 240 秒；再加时只会让失败更贵，不解决 0.4 秒的瞬间失败。而且 `planMs` 已占回合 25%，加时是把 25% 变成 40%。
- **否决「用 LLM 给规划打分并当门禁」。** 同族自偏好 + 位置/长度偏差 + 实测 12% 的判官抖动（§2.3、§3），把它当门禁会把噪声变成决策；`planUsable` 已经是最便宜的可执行代理。
- **否决「把规划改成必然成功重试 3 次」。** 在基础设施故障窗口里重试只会把 0.4 秒失败变成 1.2 秒失败三次；先分类再重试。
- **否决「删掉规划」。** 48% 的可用率与 207 秒的成功样本都说明它能产出东西；问题在默认值与失败可见性，不在能力。
- **否决「给规划加 CoT/自洽投票」。** Self-Discover 的收益来自结构选择，不是重复采样；我们连一次都没稳定跑通，加采样是放大成本。

## 附：取证方法

- 台账：`C:\Users\Darkness\.dsh\loom\campaigns\*\events.jsonl`，按 `"type":"node.finished"` + `"role":"planner"` 匹配，共 161 条。
- 计数：`ok:true` 78、`timedOut:true` 22、`stopReason:"error"` 58、`completed` 67、`aborted` 26、`max-tokens` 10（按 `stopReason` 分区：67+58+26+10 = 161）。
- 代码：`round.js` 191–192、429–574、1061–1081、381–397；`plan-budget.js` 13–15、27–60；`config.js` 80、135；`session.js` 4–10、342–383；`triangle.js` 165–177。
