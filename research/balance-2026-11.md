# 效率 / 质量 / 成本的三角：外部证据、对 dsh-loom 的预测、可机械验证的改法

- 日期：2026-11-08
- 范围：LLM 推理侧（级联、重采样、预算分配）与 agent 系统侧（SWE-bench 家族、Aider）的公开文献与工程报告
- 方法：检索 + 逐页读取；每条结论标 URL 与读取日期；读不到一手材料的地方显式标「无法取证 / 未验证 / 我的推断」
- 与本仓库既有笔记的关系：`research/chain-2026-11.md` 已经算过「一轮的调度账」（plan/attempt/gate 三段、W1 规划全量重跑、W2 第二候选无分差、W3 成本腿死亡）。本篇**不重复**那些账，而是回答：这些账在文献里对应的机制是什么、外部数字是多少、哪条改法值得买、怎么用一条 `tests/` 断言把它钉死。
- 一句话立场：我们以为自己在做「成本-质量」取舍，其实我们的成本轴已经退化（一轮 $0.0004–0.0016，约等于免费），真正稀缺的是**墙钟**与**holdout 额度**；三角在我们这里塌缩成一条线——每次晋升消耗多少秒。

## 结论先行（按收益/成本排序）

1. 我们唯一值得优化的目标函数是「每次晋升的墙钟」= W/p = **533–1880s**（W 480–940s，p 0.5–0.9）。美元轴已经退化（$0.0004–0.0032/晋升），不构成约束。
2. **最该做：holdout 与下一轮 planning 重叠**。两者在数据上互不依赖，只是代码里串行（`round.js:1321-1390`）。预期省 110–175s/轮，即 480–940s 的 **12–36%**。
3. **次该做：给第二候选加准入条件** `p(1-p)·W > tail`。我们的尾差账是 179s / 145s / 19s，而盈亏平衡点是 **43–120s**——中位尾差已经越线。
4. 这意味着一个反直觉的结论：**晋升率越高，第二候选越不值**（p(1-p) 在 p>0.5 递减）。p=0.9 时它几乎纯亏。
5. **第三：先量 screen→final 混淆矩阵，再谈 halving**。每个候选 180s 的「廉价」阶段（`round.js:442`）从未被证明与最终结果相关；Hyperband 的加速前提在我们这里是未验证的。
6. 三条提案的共同点：不加模型、不加候选、不加规划，只改**相位顺序**与**准入条件**。
7. 最硬的反对证据：verifier 不完美时重采样存在准确率天花板，最优采样次数常常 **<10**（fLaws）。
8. 最硬的成本证据：Aider 同分档成本差 78×，准确率与成本几乎不相关；Agentless 用 $0.34 拿到 27.33%，超过许多更复杂的 agent。
9. 我们的 verifier 只占 W 的 0.04–0.2%，且复用要求 patch 字节完全相同——**不要优化它的秒数，要量它的假阳性率**。
10. 明确不做：把候选加到 3–4、拉长规划、为省时间砍 holdout、训练 router、在没有重复观测的情况上 bandit。理由见 §5 与 §9。

## 0. 先把「三角」换算成我们的单位

对照数字（本仓库实测，2026-11-08 之前若干轮）：

| 量 | 区间 | 备注 |
|---|---|---|
| 单轮墙钟 W | 480–940s | 一轮 = plan + attempt(1–2) + verify + holdout + gate |
| planning 占比 | 15–47% | 即 72–442s |
| 验证器 | 0.4–1s（复用后 0ms） | 占 W 的 0.04–0.2% |
| 单轮 token | 1500–5000 | 按 `DEFAULT_PRICING`（`cost.js:16-20`：$0.28/M in、$0.42/M out） |
| 单轮 $ | $0.0004–0.0016 | 与上一条自洽：1500 tok ≈ $0.0004 |
| 晋升率 p | 0.5–0.9 | 账本口径 |
| holdout | 110–175s | 单独入账，`round.js:1382` |

由这张表直接得到四个换算，全篇都会用到：

**（a）每次晋升的墙钟 = W / p = 533–1880s。** 中位约 1000s。这是我们唯一值得优化的目标函数。质量与效率在它下面不是两条轴：降低 p 会同时变差，缩短 W 会同时变好。

**（b）每次晋升的 $ = 0.0004–0.0032。** 按任何云端定价这都是噪声。`cost.js:8-15` 的注释自己承认：曾经「未定价」与「免费」不可区分，于是成本腿整条失效（chain 笔记里的 W3）。一个需要事后补 `fallbackSpend`（`cost.js:171-179`）才能算出非零值的成本轴，说明它不构成约束。

**（c）非 attempt 开销占 W 的 27–83%。** plan 15–47% + holdout 12–36% = 27–83%，留给「真的在改代码」的墙钟只剩 17–73%。这才是我们的效率问题：不是模型慢，是**相位太多、且串行**。

**（d）holdout 是「金标准」而不是「成本项」，但它被当成本项记。** 110–175s 约等于一次晋升墙钟的 12–33%。任何为了省这 110–175s 而降低 holdout 频率的做法，都是在拿唯二的外部信号换时间（另一个外部信号是用户/评审）。

> 我的推断（可检验）：把「成本」定义成美元会让我们做出错误的取舍——例如为了省 token 去砍掉 holdout。正确做法是把成本轴重新实例化为「墙钟 + holdout 抽样次数」，再套 Kapoor et al. 的「accuracy 与 cost 联合优化」框架（[arXiv:2407.01502](https://arxiv.org/abs/2407.01502)，读于 2026-11-08；该文摘要只给主张，未给具体省费百分比）。

### 0.1 把一轮 700 秒拆开：钱花在哪些相位

以 W=700s 为锚，把四个实测区间套进去（**下表除标注「推导」外都是账本字段**）：

| 相位 | 区间 | 占 W | 账本字段 / 代码位置 |
|---|---|---|---|
| planning | 105–329s | 15–47% | `planMs`（`roundStats`，`round.js:509`） |
| attempt（并行候选的 max） | 195–484s | 28–69% | `attemptMs`（推导：W − 其余） |
| verifier | 0.4–1s | <0.2% | `verifierMs`；复用命中记 0（`verifier-reuse.js:51`） |
| holdout | 110–175s | 16–25% | `holdoutMs`（`round.js:1382`） |
| gate / 记账 | ≈0 | ≈0 | 同步计算 |

三条读法：

- **attempt 仍是最大单项，但它不可压缩**：它就是我们真正想买的东西（代码改动）。可压缩的是它两边的相位。
- **holdout 是第二大单项，且可压缩**：它在逻辑上只需要「winner 的 worktree + 一条命令」，与下一轮的 plan 没有数据依赖。这是全篇唯一一处「省时间不损质量」。
- **verifier 小到没有意义**：0.4–1s 即使全部消灭也只占 0.04–0.2%。任何以「验证器提速」为卖点的改动，天花板是 1s/轮。

**归一化后的单价**（这是本篇反复用的两个数）：

| 单位 | 区间 | 算法 |
|---|---|---|
| 每次晋升的墙钟 | 533–1880s | W / p |
| 每次晋升的美元 | $0.0004–0.0032 | $0.0004–0.0016 / p |
| 每次 holdout 审计的墙钟 | 110–175s | 直接实测 |
| 「改代码」占墙钟 | 28–69% | attempt / W |

把最后一列和 §4 的外部系统比：Aider 的 gpt-5(high) 是 194 s/case（[榜单](https://aider.chat/docs/leaderboards/)，读于 2026-11-08），AutoCodeRover 约 4 分钟/issue。**我们的 attempt 时长与它们同量级，但我们的总墙钟是它们的两倍左右——差额全在相位开销上。**

## 1. 级联与提前退出：我们的 screen 就是 deferral rule

### 1.1 文献说什么

- **FrugalGPT**（[arXiv:2305.05176](https://arxiv.org/abs/2305.05176)，读于 2026-11-08）：三种省钱手段（prompt adaptation、LLM approximation、cascade）。核心数字：cascade「能以高达 98% 的成本下降匹配最强单模型（如 GPT-4）的表现，或在同成本下比 GPT-4 高 4%」。机制是「先用便宜模型答，用一个 scorer 决定要不要 defer 给贵模型」。
- **RouteLLM**（[arXiv:2406.18665](https://arxiv.org/abs/2406.18665)，读于 2026-11-08）：强/弱二选一路由器，用偏好数据训练；摘要口径是「在若干场景把成本降低 2 倍以上而不损质量」。网上广为流传的「85%/95% 成本下降」出自其博客，我抓 `raw.githubusercontent.com/lm-sys/RouteLLM/main/README.md` 时 fetch 端点返回 404，**该数字未能一手取证**。
- **AutoMix**（[arXiv:2310.12963](https://arxiv.org/abs/2310.12963)，读于 2026-11-08，NeurIPS 2024）：few-shot self-verification 给每个候答打分，再用 POMDP 路由器决定是否升级到更大模型——之所以要 POMDP，正是因为 self-verification **有噪声**。数字：「在可比表现下降低 50% 以上计算成本」。
- **Speculative cascades**（Google Research 博客 2025-09-11，[链接](https://research.google/blog/speculative-cascades-a-hybrid-approach-for-smarter-faster-llm-inference/)，读于 2026-11-08；论文 [arXiv:2405.19261](https://arxiv.org/abs/2405.19261)，读于同日）：把 cascade 的 deferral rule 塞进 speculative decoding 的并行验证里，得到 token 级 deferral 规则（置信度、相对置信度、成本收益、白名单）。论文的定位很准确：cascade 的成本-质量更好，speculative decoding 有 quality-neutrality 保证；他们把两者缝起来，在 Gemma/T5 上拿到更好的权衡。**博客与摘要都没给硬数字**，只有「better cost-quality trade-offs」。

### 1.2 它预测我们的循环会怎样

1. **我们的 screen 不是「廉价检查」，而是一个 deferral rule，而且它的 scorer 是另一个 LLM。** `screenCandidate`（`round.js:421-463`）会 createWorktree、跑一次完整的 `dispatcher.run`、再跑一次 `runVerifier(task.screen)`，上限 `min(halving.screenTimeoutMs=180s, attemptTimeoutMs)`。也就是说，「便宜」阶段的单候选成本是 180s 量级，占整轮 19–38%。FrugalGPT 的 98% 来自「便宜模型几乎免费」；我们的「便宜模型」是同价位模型 + 更短 prompt，**价差接近 1**，所以 deferral 的收益只可能来自「提前杀掉注定失败的候选」，不可能来自单价差。
2. **AutoMix 的噪声警告直接命中我们。** 我们的 screen 判定来自一次短 session + 一次可能 flaky 的检查，噪声不会比 self-verification 小。把 screen 当硬判据（`pickSurvivors` 直接砍掉一半）等于把噪声写进晋升路径；正确用法是把它当**先验**（调整 keepRatio 或候选预算），而不是当判决。
3. **RouteLLM 的前提在我们这里不成立。** 路由器需要成千上万的 (query, 胜负) 偏好对；我们 12 轮 × 1 任务/轮，样本量差三个数量级。所以「训练一个 router 决定要不要上贵模型」在我们这里是伪需求——我们根本没有贵模型可上。
4. **speculative cascades 的启示不是 token 级 deferral，而是「并行验证换来提前退出」。** 我们的等价物是：候选 A 还在跑时，用一个极便宜的探针判断「这轮大概没戏」，从而提前 abort。这与 `tests/tri9/early-abort.test.mjs` 已经在测的东西同源。**预测**：如果探针的判定与最终结果相关性 < 0.5，提前 abort 会误杀本该晋升的轮次，净收益为负；只有当 p(成功) 明显双峰（要么很快过、要么注定不过）时才有正收益。

### 1.3 我们能怎么验证

- **screen→final 混淆矩阵**（最该先做的一条）：在 `round.finished` 里为每个候选记 `screenOk` 与 `finalOk`，积累 20 对后算 precision/recall/Cohen's κ。判据：**precision < 0.75 或 κ < 0.2 ⇒ 关闭 halving**（`config.halving.enabled=false`），因为此时 360s 的 screen 买的是噪声。
  - 可写成断言：`tests/balance/screen-agreement.test.mjs` —— `decideHalving([{s:true,f:true}×8,{s:true,f:false}×2]) → {keep:true, precision:0.8}`；`decideHalving([{s:true,f:false}×5,{s:false,f:true}×5}) → {keep:false}`。
- **提前 abort 的相关性检验**：用 `src/runtime/plateau.js` 同款的滑动窗口，量「前 60s 的行为特征（改了几个文件、跑了几次命令）→ 最终通过」的 AUC。AUC < 0.6 就不要做 abort。

### 1.4 四种「级联」在我们这里的可行性对照

| 变体 | 省的是什么 | 我们有没有 | 可行性 |
|---|---|---|---|
| 模型级联（FrugalGPT） | 单价（$0.5/M vs $30/M） | 没有：worker 与 screen 用同一档模型（`round.js:447` 只传 `config.models.worker`） | **低**：无价差，省不出钱 |
| 提示级联（短 prompt 先试） | 输入 token | 有：screen 的 prompt 明显更短 | **中**：但输入 token 已只占成本小头 |
| 步骤级联（先规划，再决定是否执行） | 墙钟 | 有：plan → attempt | **高**：这是唯一带墙钟杠杆的级联 |
| speculative / 对冲（并行验证换提前完成） | 尾延迟 | 部分：并行第二候选就是一次对冲 | **中**：先算 §2.2 的 EV，否则是对冲过度 |

**预测**：把 screen 从「换一个短任务」改成「同一 attempt 的前 25% 截断」（真正的步骤级联），其排序一致性会显著提高，因为两者分布相同；但实现难度高（agent 无中途可判的状态）。在没做这个改造之前，screen 的收益上限由 §1.3 的 κ 决定。

## 2. 重复采样与验证器：第二个候选什么时候值得买

### 2.1 文献说什么

- **Large Language Monkeys**（[arXiv:2407.21787](https://arxiv.org/abs/2407.21787)，读于 2026-11-08）：覆盖率随样本数在**四个数量级**上按 log-linear 增长。SWE-bench Lite 上 DeepSeek-Coder-V2-Instruct 从 1 样本 15.9% → 250 样本 56%，超过当时单样本 SOTA 43%。**但**：在没有自动验证器、只能靠多数投票或 reward model 的设定里，曲线在几百样本后**平台化**。
- **Codex pass@k**（[arXiv:2107.03374](https://arxiv.org/abs/2107.03374)，读于 2026-11-08）：HumanEval 单样本 28.8%，100 样本解出 70.2%。
- **CodeT**（[arXiv:2207.10397](https://arxiv.org/abs/2207.10397)，读于 2026-11-08，经 HF 论文页摘要）：用模型自生成的测试做 dual execution agreement 来选解，HumanEval pass@1 65.8%，比 code-davinci-002 绝对 +18.8。**要点**：收益来自「选解」，不是「多解」。
- **AlphaCode**（Science 2022；中文稿 [eurekalert](https://www.eurekalert.org/news-releases/973335?language=chinese)，读于 2026-11-08）：生成百万级候选，用示例测试过滤 + 聚类，最多提交 10 个；Codeforces 平均排名前 54.3%，其中 66% 的题第一次提交即解出。**要点**：大规模采样的价值全在「过滤与选择」，且最终只买 10 次提交。
- **Snell et al. compute-optimal**（[arXiv:2408.03314](https://arxiv.org/abs/2408.03314)，读于 2026-11-08）：compute-optimal 分配比 best-of-N 效率高 **>4×**；FLOPs 匹配时「小模型 + test-time compute」可击败 14× 大的模型，**前提是该小模型已有非平凡成功率**；并且「有效性强烈依赖题目难度」。
- **Adaptive-Consistency**（[arXiv:2305.11860](https://arxiv.org/abs/2305.11860)，读于 2026-11-08，EMNLP 2023）：用「样本间一致度」做轻量停止准则，17 个推理/代码数据集上把采样预算降到最多 **1/7.9**，平均精度损失 **<0.1%**。这是「什么时候停止买样本」最干净的一个数字。
- **The Limits of Inference Scaling Through Resampling（fLaws）**（[arXiv:2411.17501](https://arxiv.org/abs/2411.17501)，读于 2026-11-08，v3 2026-03-26）：**本篇最重要的一篇**。原文要点逐条：
  - verifier 有非零假阳性时，重采样**无法降低**这个概率，因此存在与计算预算无关的准确率上限；
  - 单样本准确率与该模型在 HumanEval/MBPP（测试覆盖有限）上的假阳性率**强相关**；
  - 「最优采样次数常常**少于 10**」，假阳性的负效用压过收益，使曲线**向下弯**；
  - 假阳性解还有别的坏性质（如不遵守代码风格）。

### 2.2 它预测我们的循环会怎样

1. **我们的 verifier 就是「测试套件」，因此几乎必然有非零假阳性。** 这不是指控，是测试的常态：Google 的内部数据是约 1.5% 的测试运行报 flaky、约 16% 的测试有某种 flakiness（John Micco 博客，经 [IEEE 论文引用](https://ieeexplore.ieee.org/document/8530060/references)，读于 2026-11-08；一手博客未取，标二手）。我们的 `holdoutSlack=0.02` 意味着门愿意容忍 2% 的回退——**这个数字和假阳性率同量级**，也就是说「容忍」与「噪声」分不开。
2. **因此「多买候选」在我们这里的上限比文献更低。** fLaws 的 <10 是 token 便宜场景下的结论；我们的单候选成本是 480–940s 墙钟，所以我们的实际上限是 1–2，而不是 10。账本 W2（55% 的候选时间无分差）正是这个上限的实证。
3. **第二个候选的期望价值必须写成边际式，而不是「再来一次也许更好」：**

   ```
   EV(second) = p·(1−p)·V − tail − tokenCost
   ```

   其中 V = 一次失败被挽回所省的墙钟 ≈ W = 480–940s，tail = 第二名比第一名多花的墙钟（账本：179s / 145s / 19s）。
   - p=0.9：p(1−p)=0.09 → EV ≈ 43–85s − tail。tail=145s 时**净亏**。
   - p=0.7：p(1−p)=0.21 → EV ≈ 101–197s − tail。tail=145s 时净赚 0–52s。
   - p=0.5：p(1−p)=0.25 → EV ≈ 120–235s − tail。tail=179s 时勉强正。
   - **盈亏平衡 tail\* = p(1−p)·W，即 43–120s（p=0.9…0.5，W=480）。** 我们的中位尾差若 >120s，并行第二候选整体是负收益。

   把它排成表（V=W，单位秒；判据列用账本中位尾差 145s）：

   | p | p(1−p) | EV(W=480) | EV(W=940) | 判据（tail=145s） |
   |---|---|---|---|---|
   | 0.9 | 0.09 | 43 | 85 | **亏 −60 ~ −102** |
   | 0.8 | 0.16 | 77 | 150 | 平 ~ 赚 +5 |
   | 0.7 | 0.21 | 101 | 198 | 赚 0 ~ +53 |
   | 0.6 | 0.24 | 115 | 226 | 赚 0 ~ +81 |
   | 0.5 | 0.25 | 120 | 235 | 赚 0 ~ +90 |

   两个反直觉推论：(i) **p 越高越不该买第二候选**；(ii) 我们的晋升率 0.5–0.9 恰好横跨盈亏线，所以「一刀切地开/关并行」都会错，必须按轮判定。现有 `adaptiveCandidateMode` 只在「所有 score 都 === 1」时才转 cascade（`candidates.js:42-47`），属于 p≈1 的极端情形，覆盖不了 p=0.8 这条真实的亏钱区间。
4. **Aider 的 pass1→pass2 是「有反馈的重试」，不是「盲采样」。** gpt-5(high) 52.0% → 88.0%（225 题，117 → 198），即**失败里 75% 被第二次尝试救回**（[榜单](https://aider.chat/docs/leaderboards/)，读于 2026-11-08）。这个数字看起来支持「买第二次」，但注意两点：(i) 第二次带错误信息，等价于我们的 `previousFailure`（`round.js:410`）；(ii) 它是串行重试，墙钟是加法，而我们并行时墙钟是 max。**预测**：把第二候选改成「只在第一候选失败后才发，且带失败输出」的 cascade，在 p 高时比并行更省（省掉 tail 与 55% 的无分差时间），在 p 低时更慢（多一次串行）。这正是 `src/runtime/candidates.js:27` 的 `adaptiveCandidateMode` 想做的事，但它的触发条件太窄（要求最近每轮每个 score 都 === 1）。
5. **Monkeys 的覆盖率定律在我们这里**只对「同一任务反复采样」成立，而我们的采样单位是「不同任务」。`sampling.js:31` 的 `pickTask` 按 `(round-1) % tasks.length` 轮转，意味着**同一任务在 12 轮内基本只被看一次**。所以覆盖率定律在这里没有作用面——我们不是「采样不足」，是「样本不重复」。

### 2.3 我们能怎么验证

- **尾差与 p 的联合门**：新增纯函数 `admitSecondCandidate({p, tailMs, roundMs, tokenUsd})`，返回复用 `EV(second) > 0` 的那条式子。
  - 断言（`tests/balance/second-candidate-gate.test.mjs`）：`admitSecondCandidate({p:0.9, tailMs:145000, roundMs:700000}) === false`；`admitSecondCandidate({p:0.7, tailMs:19000, roundMs:700000}) === true`；边界 `p(1−p)·W === tail` 时 `reason === 'break-even'`。
- **cascade 触发条件放宽**：把 `adaptiveCandidateMode` 的「全 1 分」改成「最近 k 轮第二候选从未改变胜负」，并用账本回放验证。
  - 断言（`tests/balance/cascade-trigger.test.mjs`）：`adaptiveCandidateMode([{attempts:[{score:1},{score:1}]}], {minRounds:1}) === 'cascade'`；`…[{score:1},{score:0.98}]` 仍为 `'parallel'`。
- **假阳性率的直接测量**（fLaws 的本地化）：对同一 patch、同一命令重跑 verifier 3 次，统计翻转率。判据：翻转率 > `holdoutSlack`(2%) ⇒ 说明 verifier 单独使用不安全，必须靠 holdout 复核。

### 2.4 我们的采样单位不是「样本」，是「任务」——覆盖率定律用不上

Monkeys 的定律是「同一道题采样 n 次，至少一次正确」的覆盖率随 n 增长。我们的循环里 `sampling.js:31` 的 `pickTask` 是 `(round-1) % tasks.length` 轮转：

| 任务数 N | 12 轮内每题被看几次 | 能否谈覆盖率 |
|---|---|---|
| 6 | 2 | 勉强 |
| 12 | 1 | 不能 |
| 24 | 0.5 | 不能（有一半任务从未出现） |

**预测**：除非把「任务」改成「任务族」（同族多次出现、共享 verify），否则：
- 加候选只是在**同一道题上**多买一次，这正是 Monkeys 说的「覆盖率有效」的场景，但也是 fLaws 说「有天花板」的场景——两者夹逼出的可行区间就是我们账本里的 1–2 个候选；
- bandit 化没有统计基础（§3.2）；
- 「学习哪些任务容易晋升」也无法成立，因为每题只出现一次。

**我们的推断**：把 evalset 从「12 道互不相同的题」改成「4 族 × 3 个变体」，是让覆盖率定律、bandit、按难度分配预算三件事同时变得可用的**前置条件**。代价是基准变窄（过拟合风险上升，见 Kapoor 关于 holdout 不足的警告），收益是所有效率手段从「不可测」变成「可测」。

## 3. 预算分配：Hyperband 的类比在我们这里只成立一半

### 3.1 文献说什么

- **Hyperband**（[arXiv:1603.06560](https://arxiv.org/abs/1603.06560)，读于 2026-11-08，JMLR 18(2018)）：把超参搜索表述成 pure-exploration **non-stochastic infinite-armed bandit**，在「资源」（迭代数、样本数、特征数）上做 early-stopping + 逐次减半；「相比对比方法可提供超过一个数量级的加速」。内核是 successive halving：先给所有配置小预算，保留前 1/η，再翻倍预算。
- **固定预算 best-arm identification**（[arXiv:2210.00895](https://arxiv.org/abs/2210.00895)，读于 2026-11-08）：给定固定预算，误识别概率有下界，最优的样本分配是**非均匀**的。我读了摘要/元数据，未逐条核对定理；结论方向（均匀分配次优）是可靠的，具体常数请以原文为准。
- **HEFT / CPOP**（[IEEE 765092](https://ieeexplore.ieee.org/document/765092)，读于 2026-11-08，Topcuoglu et al. 2002）：异构处理器上的 DAG 调度，HEFT 用 **upward rank（≈ 关键路径长度）**给任务排优先级，再为每个任务挑最早完成的处理器。它是低复杂度静态启发式，长期作为对比基线。

### 3.2 它预测我们的循环会怎样

1. **Hyperband 的可迁移部分只有「先小后大」，没有「同一配置给更少资源」。** 我们的 attempt 不可部分执行：agent 要么跑完 480–940s，要么被杀掉重来。`screenCandidate` 表面上像 successive halving，实质是**另起一个不同分布的任务**（不同 prompt、不同链版本 `chain: {name:'screen', version:0}`，`round.js:434`），所以它不满足 SH 的前提「同一配置的早期表现可用于排序」。**预测**：screen→final 的排序一致性会显著低于 SH 论文里的设定，因此 halving 的收益被 180s/候选的固定成本吃掉。
2. **固定预算 BAI 的结论对我们不利：均匀分配次优，但我们连「重复观测」都没有。** 12 轮 × 每轮 1 个任务，等于每个臂只被拉一次；bandit 需要同一臂的多次回报。**结论（反面）**：在我们当前的任务轮转下，bandit 化候选分配没有统计基础；要做，必须先把「任务」改成「任务族」（同一族多次出现），否则是拿 1 个样本做探索-利用权衡。
3. **HEFT 的关键路径结论直接可用：并行只对非关键路径有意义。** 一轮的 DAG 是 `plan → attempts → verify → holdout → gate`，几乎全在关键路径上；唯一的「兄弟节点」是两个候选的 attempt（已在并行）。holdout 与下一轮 plan 之间**没有数据依赖**（holdout 只需本轮 winner 的 worktree，`round.js:1371`；下一轮 plan 只需 objective/task/lessons），所以它们是可并行的兄弟——这正是 §6 提案 P1。**预测**：把两者重叠后，单轮墙钟下降 min(planMs, holdoutMs)，即 110–175s（当 planMs ≥ holdoutMs 时），占 W 的 12–36%。
4. **`triangle.js:158-180` 的 `parallelFactor` 已经把 plan 与 holdout 当串行项折进去**，注释也承认「a round that never promotes reads as less parallel than its attempt phase」。这条口径是对的，但它把一个可优化项固定成了常量——**度量方式会塑造优化方向**：既然账上把它记为串行，就没有人去并行它。

   把 Hyperband 的五个前提逐条对照我们的现实：

   | Hyperband 的前提 | 我们的现实 | 后果 |
   |---|---|---|
   | 同一配置可以被给「更少资源」 | attempt 不可部分执行，只能跑完或杀掉 | 只能另起 screen 任务，分布不同 |
   | 早期表现可用于排序 | screen 用不同 prompt、`chain:{name:'screen',version:0}` | 排序一致性**未验证** |
   | 保留比例 1/η 有效 | `keepRatio=0.5`、`minKeep=1` | 2 候选 → 1，等于「只砍一半」 |
   | 一个 bracket 内多次减半 | 单轮只做一次筛 | 无法跨轮累计证据 |
   | 资源连续可调（迭代数） | 资源是「一次完整 agent 会话」 | 粒度太粗，减半即重跑 |

   结论：我们实现的是「SH 的一次 bracket，而且换了一个配置」，不是 successive halving。它能省时间的前提（早期信号可排序）在我们这里是一条**未检验的假设**。

### 3.3 我们能怎么验证

- **holdout × plan 的重叠收益**：在 `triangle.js` 新增 `overlapGain({planMs, holdoutMs})`，返回 `min(planMs, holdoutMs)`（在无依赖假设下）。
  - 断言（`tests/balance/holdout-overlap.test.mjs`）：`overlapGain({planMs:200000, holdoutMs:150000}) === 150000`；`overlapGain({planMs:60000, holdoutMs:150000}) === 60000`；并且 `roundWall({…, overlapped:true}) < roundWall({…, overlapped:false})`。
- **SH 前提的检验**：见 §1.3 的混淆矩阵；补充一条：`pickSurvivors` 在「screen 与 final 无关」的合成数据上，其期望最终分数不高于随机保留（这可以直接写成属性测试）。
- **bandit 适用性检查**（防止有人真的去实现）：`tests/balance/bandit-precheck.test.mjs` —— 给定 12 轮、每任务出现 1 次，`banditEligible(rounds) === false`。

## 4. 已公开的 agent 系统：每任务成本与通过率到底是多少

| 系统 | 通过率 | 每任务成本 | 来源与状态 |
|---|---|---|---|
| Agentless | SWE-bench Lite 27.33%（82 fixes） | **$0.34/issue** | [arXiv:2407.01489](https://arxiv.org/abs/2407.01489)，读于 2026-11-08 |
| AutoCodeRover | Lite 19% | **$0.43/issue**，约 4 分钟/issue | [arXiv:2404.05427](https://arxiv.org/abs/2404.05427)，读于 2026-11-08（ISSTA 2024） |
| MASAI | Lite 28.33% | **< $2/issue** | [NeurIPS 2024 页面](https://neurips.cc/virtual/2024/100955)，读于 2026-11-08 |
| HyperAgent(-Lite-1) | Lite 25.33% | **$0.45** | [OpenReview PDF](https://openreview.net/pdf?id=PZf4RsPMBG)（经检索摘要读到表 1 行），读于 2026-11-08，**二手** |
| SWE-agent | 12.5% pass@1（论文口径） | $2.55（+GPT-4o）/ $3.41（+Claude 3 Opus，221K tok） | 通过率见 [arXiv:2405.15793](https://arxiv.org/abs/2405.15793)；金额均为**二手**（HyperAgent 表、[CodeR](https://arxiv.org/html/2406.01304v3) 表） |
| OpenHands | — | **未报告 $/实例** | [arXiv:2407.16741](https://arxiv.org/abs/2407.16741) 摘要只讲平台与生态、未给金额，读于 2026-11-08 |
| Aider polyglot（225 题） | gpt-5(high) 88.0%；o3-pro(high) 84.9%；DeepSeek-V3.2 70.2% | $29.08；$146.32；$0.88 | [榜单](https://aider.chat/docs/leaderboards/)，读于 2026-11-08 |
| Devlo | 无公开通过率曲线 | 仅定价页（Pro $39/人/月，4500 积分） | **无法取证**（只有营销话术） |

读这张表的三个要点：

1. **准确率与成本几乎不相关。** Aider 榜单里 70% 档的成本从 $0.88 到 $68.63，差 78×；84.9% 的 o3-pro(high) 花 $146.32，而 88.0% 的 gpt-5(high) 只花 $29.08——**多花 5 倍买 3 个点**。Agentless 用 $0.34 拿到 27.33%，比许多复杂 agent 都高。这对我们是一个警告：**复杂度与成本都不保证质量**，而我们的 $ 已经低到没有优化空间。
2. **「多试一次」的收益在各家报告里都很大，但都是带反馈的串行重试。** Aider 是 75% 的失败被第二次救回；AlphaCode 是「百万候选 → 过滤 → 只提交 10 次」。两者的共同点是**有一个外部选择器**（错误信息 / 示例测试），而不是盲采样。
3. **每分钟/每实例的时间数字很少被报告。** AutoCodeRover 给了 4 分钟/issue；其余多数只给 $ 或 token。**未验证**：没有找到把「每任务墙钟」与「通过率」同时画成曲线的公开系统报告——这可能是我们这个循环唯一有信息量的产出（我们同时记 durationMs 与 score）。

### 4.2 归一化成「每个被解决的任务花多少」

原始 $/任务 掩盖了通过率差异，除以通过率才是可比单价（计算基于上表，四舍五入）：

| 系统 | 通过率 | $/任务 | **$/解决** |
|---|---|---|---|
| Agentless | 27.33% | 0.34 | **$1.24** |
| Aider + DeepSeek-V3.2-Exp | 70.2% | 0.88 | **$1.25** |
| HyperAgent-Lite-1 | 25.33% | 0.45 | $1.78 |
| AutoCodeRover | 19% | 0.43 | $2.26 |
| MASAI | 28.33% | 2.00 | $7.06 |
| SWE-agent + GPT-4o | 12.5% | 2.55 | $20.4 |
| Aider + gpt-5(high) | 88.0% | 29.08 | $33.0 |
| Aider + o3-pro(high) | 84.9% | 146.32 | $172.3 |
| **我们（对照）** | 50–90% | 0.0004–0.0016 | **$0.0006–0.0032**（但 533–1880s/晋升） |

这张表最重要的不是排名，是**跨了五个数量级**。它证明「成本」在一个 agent 系统里不是一个标量：同样是「解决一个问题」，有人花 $1.24，有人花 $172。因此任何「我们的成本高/低」的判断，必须先说清是哪一种成本。

**我们的 $ 是全场最低约四个数量级，但墙钟中位 1000s/晋升。** 如果套用 §4.2 同样的归一化思路，我们真正的单价是 **533–1880 秒/晋升**，而 Aider 的 gpt-5(high) 是 194 s/case × 1/0.88 ≈ 220 s/解决。**我们比它慢 2.4–8.5 倍，而美元便宜 10⁴ 倍。** 这就是 §0 那个论断的量化版本：我们的钱不值钱，时间很值钱。

### 4.3 为什么「换更便宜的模型」在我们这里没有杠杆

上面 8 行里，最便宜与最贵的每任务成本差 430×，但**没有一个系统的成本瓶颈是「模型单价」**——瓶颈都是「跑了几轮、每轮多长」。这与 FrugalGPT 的设定正好相反：FrugalGPT 之所以能省 98%，是因为它面对的是「$30/M 与 $0.5/M 的价差」；我们面对的是「同一档模型，不同相位」。**预测**：任何以「换便宜模型」为手段的改动，在我们的账本上最多体现为 $ 从 0.0016 变成 0.0004，对 W 与 p 都没有影响，因此对目标函数没有影响。

## 5. 反面证据：什么时候「更多候选 / 更长规划 / 更大模型」不划算

- **fLaws**（[arXiv:2411.17501](https://arxiv.org/abs/2411.17501)）：verifier 不完美 ⇒ 重采样有天花板；最优采样 <10；曲线会下弯。**这是「别加候选」最硬的证据。**
- **Monkeys 自己的第二半**（[arXiv:2407.21787](https://arxiv.org/abs/2407.21787)）：没有自动验证器时，多数投票/reward model 在几百样本后平台化。**推论**：如果我们把 verifier 换成「模型自评」，覆盖率定律立刻失效。
- **Huang et al. 《LLMs Cannot Self-Correct Reasoning Yet》**（[arXiv:2310.01798](https://arxiv.org/abs/2310.01798)，ICLR 2024，读于 2026-11-08）：**无外部反馈**的 intrinsic self-correction 在推理任务上无效、有时**性能下降**；很多「有效」结论来自用了 oracle label，且没有与等推理成本的基线比。**对我们的含义**：不要给 worker 加「自己检查一遍再交」的回合，除非检查来自测试。
- **Kambhampati 《LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks》**（[arXiv:2402.01817](https://arxiv.org/abs/2402.01817)，ICML 2024，读于 2026-11-08）：自回归 LLM 本身不能做规划，也不能自我验证；应与外部 model-based verifier 紧耦合。**对我们的含义**：规划阶段的价值取决于它是否被外部检查约束；纯自然语言的「更长规划」不产生保证。
- **Gao et al. 《Scaling Laws for Reward Model Overoptimization》**（[arXiv:2210.10760](https://arxiv.org/abs/2210.10760)，读于 2026-11-08）：proxy reward 被持续优化时 gold reward 先升后降（Goodhart），RL 与 best-of-n 都测到。**对我们的含义**：gate 的 `minGain` 与 verifier score 是 proxy；holdout 是 gold。只优化 proxy 会系统性高估。
- **Kapoor et al. 《AI Agents That Matter》**（[arXiv:2407.01502](https://arxiv.org/abs/2407.01502)，读于 2026-11-08）：只看 accuracy 让 SOTA agent「不必要地复杂和昂贵」；holdout 不足导致过拟合 benchmark；主张 cost+accuracy 联合优化。
- **Agentless**（[arXiv:2407.01489](https://arxiv.org/abs/2407.01489)）：一个**没有 agent 循环**的三段式流程（定位 → 修复 → 验证）在 Lite 上 27.33%、$0.34，超过当时许多更复杂的 agent。**对我们的含义**：我们的「多相位编排」需要证明自己比「plan-once, patch-once, verify」更值。
- **flaky tests**：Google 约 1.5% 的测试运行报 flaky、约 16% 的测试有某种 flakiness（二手，见 §2.2）。**对我们的含义**：verifier 的 0.4–1s 不是风险，**不确定性**才是；`verifier-reuse.js:102` 的缓存键是「patch 字节 + 命令 + base commit」，两个不同候选几乎不会命中同一键，所以「复用后 0ms」是一个很少发生的事件，省下的总量 ~1s/轮。**不该把工程预算投在这里。**
- **The Tail at Scale**（Dean & Barroso, CACM 2013）：对慢请求做对冲（hedged request），BigTable 上「10ms 后对冲，p99.9 从 1800ms 降到 74ms，只多发约 2% 请求」。**状态**：一手 PDF 抓取返回 404（多次重试未成功），这两个数字来自二手转述，**标二手未取证**。机制本身可用：我们的并行第二候选就是一种对冲，但我们的「尾差」是分钟级而非毫秒级，对冲的性价比要用 §2.2 的公式算，不能照搬。

## 6. Top 3 提案（改什么 / 预期收益 / 机械验证）

### P1（收益最大）holdout 与下一轮 planning 重叠执行

**改什么**
- `src/runtime/round.js:1321-1390`：holdout 目前在 winner 的 worktree 里、晋升前串行执行。把它从「round 内部的同步阶段」改成「与下一轮 `planPhase` 并发的任务」：本轮 `round.finished` 可以先写 `holdout: 'pending'`，由下一轮的 plan 阶段 await 上一次 holdout 的结果再决定是否允许 attempt。
- `src/runtime/triangle.js:158-180`：`parallelFactor` 增加 `holdoutOverlapMs` 项，账上不再把 holdout 全额计入串行。
- 注意：**promotion 仍必须早于下一轮 attempt**（attempt 的 worktree 基于已晋升 commit）。所以只重叠 plan，不重叠 attempt。这是我的推断，实施前需确认 `planPhase` 的输入不含 promotion 结果（`round.js:400-413` 的 brief 里只有 objective/task/chain/lessons/plan，看起来满足）。

**预期收益**
- 省 `min(planMs, holdoutMs)` = 110–175s/轮（当 planMs ≥ holdoutMs），即 480–940s 的 **12–36%**；每次晋升省同样的量。
- 来源：HEFT 的关键路径论证（[IEEE 765092](https://ieeexplore.ieee.org/document/765092)）；speculative execution 的「并行验证换提前完成」思想（[arXiv:2405.19261](https://arxiv.org/abs/2405.19261)）。
- 风险：holdout 失败时（账本里有 `holdout-failed`），下一轮 plan 已经做了——但 plan 与晋升结果无关，所以**不浪费**；这是本提案比「投机执行」更划算的地方。

**机械验证**
- `tests/balance/holdout-overlap.test.mjs`：
  ```js
  assert.equal(overlapGain({ planMs: 200_000, holdoutMs: 150_000 }), 150_000)
  assert.equal(overlapGain({ planMs: 60_000,  holdoutMs: 150_000 }), 60_000)
  assert.ok(roundWall({ planMs: 200_000, holdoutMs: 150_000, attemptMs: 600_000, overlapped: true })
          < roundWall({ planMs: 200_000, holdoutMs: 150_000, attemptMs: 600_000, overlapped: false }))
  ```
- 账本侧断言：连续 3 轮 `round.finished.wallMs < planMs + attemptMs + holdoutMs`（允许 ±gate 的 1s）。

### P2（止血）第二候选的准入条件

**改什么**
- `src/runtime/candidates.js:27` 旁新增纯函数 `admitSecondCandidate({p, tailMs, roundMs, tokenUsd})`，实现 `p*(1-p)*roundMs > tailMs + tokenUsd`（token 项当前可忽略）。
- `src/runtime/round.js:695/827`：`candidates` 从 policy 读到时，若 `admitSecondCandidate` 为 false 则强制 `1`，并在 `modeRecord()` 里记 `candidatesPlanned` 与 `reason:'tail-exceeds-ev'`。不要静默降级——账本必须能解释为什么只跑了一个。
- 输入 `p` 用最近 N 轮的晋升率（贝叶斯平滑，先验 Beta(1,1)），`tailMs` 用最近 N 轮的 `attemptMs` 极差（P90−median）。

**预期收益**
- 省 0–60s/轮（3–10%），并消灭账本 W2 里 **55% 的无分差候选时间**；质量按 §2.2 的公式**理论不变**（因为我们只在 EV<0 时才砍）。
- 数字来源：Aider 的 pass1→pass2 挽回率 75% 是**上界**（带反馈、串行）；我们的并行、无额外信息版本达不到它。
- 风险：`p` 的估计在小样本下抖动，可能在 p 高时误砍。用「连续 3 轮 EV<0 才生效」的滞后规则。

**机械验证**
- `tests/balance/second-candidate-gate.test.mjs`：
  ```js
  assert.equal(admitSecondCandidate({ p: 0.9, tailMs: 145_000, roundMs: 700_000 }), false)
  assert.equal(admitSecondCandidate({ p: 0.7, tailMs:  19_000, roundMs: 700_000 }), true)
  assert.equal(admitSecondCandidate({ p: 0.5, tailMs: 179_000, roundMs: 700_000 }), true)
  ```
- 回放断言：用 `events.jsonl` 里最后 10 轮，`admitSecondCandidate` 的判定若为 false 的轮次，其第二候选的 `delta === 0`（不许出现「砍掉了本该赢的候选」）。

### P3（先证伪）screen→final 一致性度量，并让 halving 可自动关闭

**改什么**
- `src/runtime/halving.js:29` 旁新增 `screenAgreement(pairs)` → `{precision, recall, kappa, keep}`；`keep = precision >= 0.75 && kappa >= 0.2`。
- `src/runtime/round.js:790-817`：在 `round.finished` 里记录每个候选的 `{screenOk, finalOk}`（当前只记 `screenedOut`，被筛掉的候选永远没有 final 结果，这本身就是**测量偏差**）。
- 被筛掉的候选无法得到 `finalOk`——所以这条度量需要**抽样**：每 5 轮让一个被筛掉的候选也跑完 attempt（成本 +480–940s，频率 20%），或者干脆先关掉 halving 跑 10 轮收集对照。**我的推断**：这是唯一能无偏估计 screen 价值的方法；不抽样就只能量到 precision 的上界。

**预期收益**
- 若 `keep=false`：省 180s/候选 × 候选数 = **180–360s/轮**（占 W 的 19–75%），且质量不变或变好（不再误杀）。
- 若 `keep=true`：只是把一个隐含假设变成记录在案的证据，收益 0，但让后续 keepRatio 调参有据。
- 来源：Hyperband 的加速前提（[arXiv:1603.06560](https://arxiv.org/abs/1603.06560)）；AutoMix 对「有噪声的自验证」的处理（[arXiv:2310.12963](https://arxiv.org/abs/2310.12963)）。

**机械验证**
- `tests/balance/screen-agreement.test.mjs`：
  ```js
  assert.deepEqual(screenAgreement(pairs(9, 1)).keep, true)   // 9 真阳 1 假阳 → precision .9
  assert.deepEqual(screenAgreement(pairs(0, 0, {fp: 5, fn: 5})).keep, false) // 与随机无异
  assert.equal(screenAgreement([]).keep, true) // 无证据不关闭，保持现状
  ```

### 6.4 实施顺序与回滚判据（这比选择哪个提案更重要）

| 顺序 | 做什么 | 为什么这个顺序 | 回滚判据 |
|---|---|---|---|
| 1 | P3 的**度量**部分（只记录 `screenOk/finalOk`，不改行为） | 零风险；不给后续提案提供归因数据的话，P1/P2 的效果无法与噪声区分 | 无（只加字段） |
| 2 | P2 第二候选准入 | 最小改动、可逆、单独就能止血；且它的判据只用已有字段（`attemptMs`、晋升率） | 连续 5 轮出现「被砍的候选本可赢」⇒ 立刻回滚 |
| 3 | P1 holdout×plan 重叠 | 收益最大但改动最深（相位顺序 + 账本语义）；必须在前两步之后做，否则无法归因 | 任意一轮 `holdout` 与 `attempt` 用了不同的 base commit ⇒ 回滚 |
| 4 | P3 的**关闭**部分（`halving.enabled=false`） | 只有拿到混淆矩阵才允许；否则是在没有证据时改变行为 | 关闭后 W 下降但晋升率不变 ⇒ 保持；晋升率下降 ⇒ 重开 |

**一条元规则**：每个提案都必须先以「只记录、不改行为」的形式上线一轮，拿到账本数据后再开启行为改变。本仓库的 `replayOnly: true`（`config.js` 的 `loopPolicy`）本来就是这个精神——但它是全局开关，不是逐提案的开关。

## 7. 次级提案（收益小、但便宜）

- **P4：verifier 假阳性探针**（≈1s/轮）。在 `verifier-reuse.js` 的命中路径上加「每 N 次复用强制重跑一次」的抽样；把翻转率写进 `round.finished.verifierFlake`。断言：`flakeRate([{ok:true},{ok:false},{ok:true}]) === 1/3`。理由：fLaws 说假阳性率决定天花板，而我们从未测过它。
- **P5：把 `holdoutSlack=0.02` 与实测 flake 率联动**。若 `verifierFlake > 0.02`，则 slack 至少为 `2×flakeRate`，否则「容忍回退」小于「噪声」，门在做随机决策。断言：`effectiveSlack({configured:0.02, flake:0.03}) === 0.06`。
- **P6：cascade 触发条件放宽**。`adaptiveCandidateMode` 现在要求「最近每轮每个 score 都 === 1」才转 cascade（`candidates.js:42-47`），在 p=0.5–0.9 的现实里几乎不触发。改成「最近 k 轮第二候选从未改变胜负」。断言见 §2.3。

## 8. 未验证 / 我的推断（请勿当事实引用）

**未验证（读过摘要但没读到原文细节）**
- RouteLLM 的 85%/95% 成本下降数字（README fetch 404）。
- Wu et al. 《Inference Scaling Laws》（[arXiv:2408.00724](https://arxiv.org/abs/2408.00724)）里「简单题重复采样更划算、难题搜索更划算」的方向性结论——摘要被截断，我**没有**取到原文这句。
- Speculative cascades 的具体加速比（博客与摘要都只有定性表述）。
- The Tail at Scale 的 1800ms→74ms / 2% 额外请求：二手。
- Google 的 1.5% / 16% flaky 数字：二手（一手是 John Micco 的内部博客）。
- HEFT 与 CPOP 的具体加速数字：只读了元数据与摘要级描述。
- SWE-agent 的 $2.55 / $3.41 / $6.59：全部二手（HyperAgent、CodeR、2025 年某论文），一手论文摘要不含金额。

**无法取证**
- Devlo 的通过率/成本曲线（只有定价页与营销文案）。
- OpenHands 的 $/实例（论文摘要未报告；可能在附录，我未逐页翻）。
- 任何把「每任务墙钟」与「通过率」同时画成曲线的公开 agent 报告——我没有找到。若确实不存在，我们账本里的 `durationMs × score` 是稀缺数据。

**我的推断（本文原创，需实验确认）**
- 「我们的 $ 轴已退化，成本应重定义为墙钟 + holdout 次数」——这是把 Kapoor 的框架本地化，不是他们的原话。
- 「holdout 与下一轮 plan 无数据依赖」——基于读 `round.js:400-413/1321-1390` 的代码推断，未经运行时验证。
- 「screen→final 相关性会显著低于 Hyperband 设定」——由 screen 使用不同 prompt/不同链版本推断，未测。
- 「我们的 verifier 有非零假阳性」——由测试套件的普遍性质 + flaky 数据推断，未在本仓库测过。
- 「p(1−p)·W 是第二候选的正确期望式」——假设两个候选独立同分布，实际它们共享 brief 与 lessons，可能正相关（同错）也可能负相关（探索不同方向）。若正相关，EV 更低，结论更强。

### 8.1 这些不确定性怎么关闭（按成本从低到高）

| 未验证项 | 关闭方式 | 成本 | 需要多少样本 |
|---|---|---|---|
| screen→final 相关性 | 记录 `screenOk/finalOk` 对 | ≈0（只加字段） | 20 对起步 |
| verifier 假阳性率 | 同 patch 重跑 3 次 | 3×（0.4–1s）× 次数 | 20 次复跑 |
| 候选间相关性 | 记录两候选的 diff 相似度 + 是否同错 | ≈0 | 10 轮 |
| holdout×plan 无依赖 | 读 `planPhase` 的 brief 输入（已读，`round.js:400-413` 无 promotion 字段） | 已做 | 1 次代码审查 |
| 任务族改造的收益 | 先把 evalset 切 4 族 × 3 变体，跑 12 轮 | 高（改基准，有过拟合风险） | 12 轮 |
| 外部数字的一手核对 | 抓论文 PDF 正文（Tail at Scale、Wu et al. 等） | 中（时间） | — |

**建议的关闭顺序**：前三行只需要加账本字段，可以在 2–3 轮内完成，而且它们同时是 P1/P2/P3 的归因基础。后两行是结构性改动，应等前三行给出方向后再做。

## 9. 不该做

1. **不要加候选数到 3–4。** fLaws 的最优 <10 是 token 便宜场景；我们的单候选 480–940s，且 tails 随候选数单调增长。4 候选 = 4×token + 最长 tail，而晋升率不会因此翻倍（Monkeys 的覆盖率定律需要「有验证器的重复采样」，我们连重复都没有）。
2. **不要拉长 planning。** planning 已占 15–47%，且账本 W1 显示规划全量重跑 38–49% 的轮次。Huang（自我纠错无效）与 Kambhampati（LLM 不能规划，除非有外部 verifier）都指向：更长的自然语言规划不产生保证，只产生墙钟。
3. **不要为了省 token 砍 holdout 或提高 `holdoutEvery`。** holdout 是唯一的外部金标准；fLaws 说没有它，重采样的收益上限由假阳性率决定。省 110–175s 换来 gate 失明，是用 12–36% 的墙钟换 100% 的判据可信度。
4. **不要训练路由器 / 上 bandit。** 12 轮、每任务一次观测，样本量差 RouteLLM 三个数量级；bandit 需要重复拉臂。先把「任务族」做出来再谈。
5. **不要把 verifier 优化当项目。** 0.4–1s 占 W 的 0.04–0.2%，且 `verifier-reuse.js:102` 的缓存键要求 patch 字节完全相同，命中率天然很低。这里的天花板是 1s/轮。
6. **不要加多 agent 角色。** Agentless（$0.34、27.33%）与 AutoCodeRover（$0.43、19%）说明简洁流程能打到同一档；MASAI 用 <$2 拿到 28.33% 也远低于我们想象的复杂度收益。加角色的成本是墙钟，而我们的墙钟已经是瓶颈。
7. **不要用多数投票/自我一致性替代 verifier。** Monkeys 说无验证器时投票会平台化；Huang 说无外部反馈的自纠错会退化。我们的优势恰恰是「有测试」，别把它换成「有共识」。
8. **不要相信「更多尝试必然更好」的直觉。** Aider 的 75% 挽回率是带错误反馈的串行重试，且它的成本是加法。并行盲采样的期望式是 `p(1-p)·V − tail`，不是 `V`。

## 10. 引用清单（URL + 读取日期 2026-11-08）

**级联 / 路由**
1. FrugalGPT — https://arxiv.org/abs/2305.05176 — 读于 2026-11-08 — 摘要级，数字可引
2. RouteLLM — https://arxiv.org/abs/2406.18665 — 读于 2026-11-08 — 摘要级；85% 数字未能取证
3. AutoMix — https://arxiv.org/abs/2310.12963 — 读于 2026-11-08 — 摘要级
4. Speculative Cascades 博客 — https://research.google/blog/speculative-cascades-a-hybrid-approach-for-smarter-faster-llm-inference/ — 读于 2026-11-08 — 全文；无硬数字
5. Faster Cascades via Speculative Decoding — https://arxiv.org/abs/2405.19261 — 读于 2026-11-08 — 摘要级

**重采样 / 验证器**
6. Large Language Monkeys — https://arxiv.org/abs/2407.21787 — 读于 2026-11-08 — 摘要级
7. Codex（pass@k） — https://arxiv.org/abs/2107.03374 — 读于 2026-11-08 — 摘要级
8. CodeT — https://arxiv.org/abs/2207.10397 — 读于 2026-11-08 — 经 HF 摘要
9. AlphaCode — https://www.eurekalert.org/news-releases/973335?language=chinese — 读于 2026-11-08 — 二手中文稿
10. Snell et al. — https://arxiv.org/abs/2408.03314 — 读于 2026-11-08 — 摘要级
11. Adaptive-Consistency — https://arxiv.org/abs/2305.11860 — 读于 2026-11-08 — 摘要级
12. **fLaws（Limits of Inference Scaling Through Resampling）** — https://arxiv.org/abs/2411.17501 — 读于 2026-11-08 — 摘要级，逐条引

**预算分配**
13. Hyperband — https://arxiv.org/abs/1603.06560 — 读于 2026-11-08 — 摘要级
14. Fixed-budget best-arm identification — https://arxiv.org/abs/2210.00895 — 读于 2026-11-08 — 摘要/元数据级
15. HEFT — https://ieeexplore.ieee.org/document/765092 — 读于 2026-11-08 — 元数据级

**Agent 实测**
16. Agentless — https://arxiv.org/abs/2407.01489 — 读于 2026-11-08 — 全文 HTML + README
17. AutoCodeRover — https://arxiv.org/abs/2404.05427 — 读于 2026-11-08 — 摘要级
18. MASAI — https://neurips.cc/virtual/2024/100955 — 读于 2026-11-08 — 页面级
19. HyperAgent — https://openreview.net/pdf?id=PZf4RsPMBG — 读于 2026-11-08 — 表格片段，二手
20. SWE-agent — https://arxiv.org/abs/2405.15793 — 读于 2026-11-08 — 摘要级；金额二手
21. CodeR（SWE-agent 金额表） — https://arxiv.org/html/2406.01304v3 — 读于 2026-11-08 — 二手
22. OpenHands — https://arxiv.org/abs/2407.16741 — 读于 2026-11-08 — 摘要级；确认未报金额
23. Aider 榜单 — https://aider.chat/docs/leaderboards/ — 读于 2026-11-08 — 全文

**反面证据 / 系统**
24. LLMs Cannot Self-Correct Reasoning Yet — https://arxiv.org/abs/2310.01798 — 读于 2026-11-08
25. LLM-Modulo / LLMs Can't Plan — https://arxiv.org/abs/2402.01817 — 读于 2026-11-08
26. Reward Model Overoptimization — https://arxiv.org/abs/2210.10760 — 读于 2026-11-08
27. AI Agents That Matter — https://arxiv.org/abs/2407.01502 — 读于 2026-11-08
28. Flaky tests（IEEE 引用 Google 数据） — https://ieeexplore.ieee.org/document/8530060/references — 读于 2026-11-08 — 二手
29. The Tail at Scale — 一手 PDF 抓取返回 404（https://pages.cs.wisc.edu/~remzi/Classes/838/Spring2013/Papers/dean-cacm13.pdf） — **未取证**，数字来自二手转述

**本仓库内部对照（非外部文献）**
30. `research/chain-2026-11.md`（调度账：plan/attempt/gate、W1/W2/W3）
31. `src/runtime/round.js:421-463`（screenCandidate）、`:695`（candidates 上限 4）、`:827`（cascade 只发 1）、`:1321-1390`（holdout 串行）
32. `src/runtime/halving.js:14-47`、`src/runtime/candidates.js:27-48`、`src/runtime/cost.js:16-20,171-179`、`src/runtime/verifier-reuse.js:90-127`、`src/runtime/triangle.js:158-180`

---

### 附：三张可以立刻画的图（如果只做一件事）

1. **尾差 vs EV 门**：横轴 tailMs，纵轴 `p(1-p)·W`，把每轮画成点。落在线上方的轮次才是第二候选该买的。
2. **screen 混淆矩阵**：2×2 表 + precision/κ。这一张决定 halving 的生死。
3. **相位瀑布**：plan / attempt / verify / holdout / gate 的堆叠面积图。它会把「27–83% 的墙钟不在改代码」这件事画得无法争辩。
