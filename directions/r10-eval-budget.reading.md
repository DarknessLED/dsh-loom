# r10-eval-budget: 六个正文之后

这一份写的不只是这六篇，而是这六篇对前面九份的意义。它的由来是个具体问题：R3（预算与停止）在八个方向里最孤立，与其余方向的共享只有 12/122，中位引文年份 2019，而别的方向是 2024–2025。当时的结论是「做预算分配需要在三件事上同时成立：分数可分辨、保真度单调、两个刻度同源，而 agent 评估一条都不满足」。

这一轮加了一个方向去查同一件事：**评估预算与评估可靠性这两个词条，在 agent 的文献里有没有合流。** 答案是有，而且合流得比 R3 那边热闹得多。

## 一、这批论文在说什么（按主题归并）

**第一组：把「晋升」重写成假设检验——这是我们最该抄的一篇。** `2606.08106` PACE 的原话几乎是在描述我们的 `round.js`：「In practice the answer is overwhelmingly the same heuristic: measure the candidate on a small held-out set and keep it if the score went up.」它的诊断更狠：「Applied hundreds of times against the same noisy dev estimate, the ubiquitous 'keep it if the score went up' rule is uncontrolled adaptive multiple testing: the agent effectively p-hacks itself.」（§1 Introduction）它给的替代是一个测试套保的线上赌注（testing by betting）：把候选与在位者在**同一批实例**上配对比较，只数不一致的对（discordant pairs），财富过程 `E_i = ∏_{j≤i}(1 + λ(2w_j − 1))`，由 Ville 不等式 `Pr[sup_t E_t ≥ 1/α] ≤ α` 得到「随时可以停、随时报」的假阳性保证，`E ≥ 1/α` 即接受（§Guarantee / §Testing by betting）。代价写在明处：「The price of the gate's safety is power… a gain too small for the evaluation budget to resolve is rejected」，温和改进（+0.18）只保住 78%（§When (not) to use it）。在 Qwen2.5 0.5B–3B × GSM8K/SVAMP/ARC-Challenge 上，贪心规则（分数涨了就留）**30–42% 的 commit 是假的，其中 10–33% 反而有害**。

**第二组：省评估的三个正交杠杆——省在哪些实例上、省在哪些模型上、省到多少就停。** `2506.07949` 研究「问哪个样本」，把主动推断（active statistical inference）扩展到有标注成本的情形：策略 `π_t` 决定这一条要不要花钱标注，目标是「在成本约束下最小化 MSE」或反之（§2.1）。`2601.20251` FAQ 研究「借历史」，用已完成模型的答案矩阵加因子模型做插补，低预算区间 CI 更窄；它自己承认边界：「The sequential ablation can match or outperform FAQ at larger budgets」（§5）。`2601.13885` 研究「停在哪」，把 CAT 的停表从「每个模型的标准误低于 ε」改成「所有相邻对的 `P(θi > θj)` 越过 `1 − (1−γ)/2`」——停的判据是**排序是否已经分开**，不是每个估计各自是否精确（§Adaptive stopping）；预算 B 定为每模型 20 个条目。三个杠杆叠起来才是「用更少的钱得到同一个决定」。

**第三组：把「决定」本身当成一等公民——accept / reject / defer 三态。** `2607.12338` 把已完成 benchmark 的记录重放，看部分观测下的策略能否复现完整记录给出的**成对决定**，输出三态（accept / reject / defer）。它最有用的一句是划界：「A score interval can inform that decision, but it does not specify the whole decision policy: what threshold matters, what task groups must be covered, which decision errors are acceptable」（§Estimating Scores With Less Evaluation）。也就是：区间是**输入**，决定策略是另一件东西，而我们仓库里两者是混在一起的（`score` 与 `promote` 的判据分散在 `round.js` 与 `gate.js` 两处，见规格 §2 陷阱一）。

**第四组：整张记分卡可以被少量探针恢复——但只在有同类模型与相邻基准可借时。** `2606.24020` BenchPress 用 5 个探针基准恢复模型记分卡，pooled MedAE **4.55 分**，5 分容差下排序保持 **92.1%**（§1）。它同时给了两条我们必须听的限制：一是「non-deterministic decoding can change scores by **1 to 3 points** across runs」（§3），二是可信度依赖「target-model and target-benchmark coverage, the availability of similar peer models and neighboring benchmarks, and recency of training anchors」（§1）——这三样我们都不具备：一个战役里只有一个任务集、没有同类模型可借、也没有「相邻基准」。

**第五组：方差修正能把样本量降一到两个数量级，但前提是有可靠的基线估计器。** `2608.06362` AV-AIVAT 在 15 个 LLM agent 配置、71,439 手 HUNL 上，用 AIVAT 做方差修正后中位需要 **54×** 更少样本，再加 confidence sequence 到 **74×**。这个数不能直接搬：AIVAT 需要一个价值估计器，而我们的 verify 是二值 exit code，能借的只有同任务历史，那正是 FAQ 的路线而不是 AIVAT 的。

## 二、我认为什么变了

1. **R3 的孤立有了更好的解释：不是「没人做」，而是两套语料各自成熟、刚刚开始合流。** R10 与 R3 的 top-20 重叠是 **0**，整库 Jaccard 只有 **0.005（15 篇）**。也就是说「老派 HPO 的预算分配」（Hyperband/BOHB/freeze-thaw，中位 2018）与「LLM 评估的统计」（anytime-valid、e-value、confidence sequence，中位 2025）在我们的语料里是**两个几乎不相交的社区**；而 R10 内部确实有完整的联合空间（PACE、AV-AIVAT、Cost-Efficient LLM Eval、Anytime-Valid Promotion Tests 等）。所以前面那句「三件事同时成立而 agent 评估一条都不满足」——现在有了更准确的版本：**这三件事在统计社区里已经被逐个解决，但还没被搬进 agent 的晋升回路**。R3 的孤立不是领域不存在，是搬运没发生。这也解释了为什么我们连一个「commit 就是检验」的说法都没在自己的代码里见过。

2. **我们的晋升规则在文献里有一个名字，而且被判为病态。** `round.js` 现在的规则是「分数涨了（超过 `minGain` 且超出噪声棒）就晋升」。PACE 把它称作「uncontrolled adaptive multiple testing」，并给出量化后果：同一份噪声开发集上反复用，30–42% 的接受是假的。这条改变的是**问题性质**：P0-1（噪声棒由 n 算）不是精度改进，而是把一个已知有偏的规则换成一个有保证的规则；二项下界只是一个下界近似，PACE 的配对 e-process 才是对的形式（我们做的是配对比较：同一个任务、同一个夹具、两个版本，天然满足「identical instances」这个前提）。

3. **「停」的判据应该是排序分开了没有，而不是每个估计各自够不够准。** `2601.13885` §Adaptive stopping 的那个改动很小、很可搬：把「每侧标准误 < ε」换成「所有相邻对的胜率越过阈值」。我们的晋升是成对决定（候选 vs 在位者），本来就没有「多模型排序」问题，所以这条的正确形态是：**当区间不分离时就说不分离**，而不是拿一个点估计的比较去冒充决定。这与 P0-1 是同一件事的两面。

4. **三态（accept / reject / defer）比两态更诚实，而且我们已经有一个「defer」的雏形没有被命名。** `2607.12338` 把「预算不够，无法决定」当成一个正当输出。我们的 `gate.evaluated` 里其实已经有类似状态（`checks` 里有 `beatsNoise: false`、`reason: 'within noise'`），但它没有名字、没有记账、也没有进入任何统计——被拒绝的轮次什么都不写（见规格 P0-2）。这条改变的是：**「没决定」要作为第三种结果被记下来**，否则所有关于「我们的循环判断得准不准」的统计都只统计了它敢下的判断（幸存者偏差）。

5. **省评估的钱不在 halving 那 0.73% 里，而在「每轮评测多少次」这个更大的数上。** 我们的 screening 支出是 $0.0750 / $10.2898 = 0.73%，而 PACE/AV-AIVAT/FAQ 谈的是把**决定所需的样本量**降一到两个数量级。两者不是一个量级的问题：改 halving 是在 0.73% 里做优化，改「用多少样本做一个决定」是在 100% 里做优化。这条改变的是优先级：P1-3（多档 halving）应该排在「决定规则换成序贯检验」之后，而不是之前。

6. **年报里那句「R3 是 2019 年的领域」现在要和一个新事实一起读。** 加上 R10 之后，九个方向里唯一的旧方向仍然只有 R3（中位 2018，78% 早于 2023），而新加的 R10 是 2023（64% 来自 2025 后）。两者在语料上几乎不相交，在时间上相差五年——**这不是十个方向，是九加一个，而那一个正是把另外九个里最缺的那块统计地基带进来的**。

## 三、互相矛盾

- **PACE 说「宁可 defer 也不要假接受」，BenchPress 说「5 个探针就够」。** 前者把安全放在最前、并接受「温和改进被拒」；后者在容差 5 分内接受 92.1% 的排序保持。两者不直接冲突，但指向不同的默认值：如果我们的目标是「别把噪声晋升」，PACE 对；如果目标是「用更少的钱维持排序」，BenchPress 对。我们的 `minGain` 默认 0.05 更像后者，而 `docs/contracts.md` 的措辞更像前者——这个不一致本身要修。
- **FAQ 承认顺序消融在大预算下会追平甚至超过它**，而这恰好是我们更接近的场景（同一战役里反复评同一批任务，历史很长）。所以「借历史插补」在我们这里可能收益很小：我们没有「多个模型 × 多个基准」的矩阵，只有一个任务集的时间序列。
- **AV-AIVAT 的 74× 与 PACE 的 78% 保留率**放在一起会得出相反的结论（一个说省很多，一个说会丢改进）。差别在它们省的是不同的东西：前者省「达到同一精度所需的样本」，后者省「达到同一错误率所需的样本」。混着引用会得出错误的乐观。

## 四、三条我会改的

1. **把晋升规则换成配对序贯检验（PACE 形态），而不是给现有规则加噪声棒。** 具体：同一个任务上候选与在位者配对比较，只数不一致对，`E ≥ 1/α` 才接受，其余状态显式记为 `defer`（落账、参与统计）。噪声棒保留为**对照臂**而不是判据。这会改变历史行为，所以先影子运行 20 轮（与规格 P0-3 的四步同构）。
2. **给「没决定」建账。** 每一轮无论晋升与否都落一条 `gate.evaluated`（含 `defer` 与原因），使「我们的判断准不准」可以被统计而不是只能统计我们敢下的判断。这条在规格里是 P0-2，但优先级应提到 P0-1 之前——没有 defer 的账，序贯检验换上去也无法评估。
3. **把「样本量」变成战役的一等参数，与预算并列。** 现在 `budgetUsd` 是唯一上限，样本量是任务集大小决定的隐变量。改成显式的「每个任务评几次」之后，PACE 的 α、AV-AIVAT 的方差修正、FAQ 的历史插补才有地方接。

## 五、这份调研没回答的三件事

1. **我们的配对结构够不够 PACE 的前提。** PACE 要求「identical instances」——同一个任务、同一份夹具、同样的执行环境。我们的 verify 每次跑都是新环境（`worktree` 重建、依赖重装），同一任务的两次评测是不是「同一实例」需要证据，而这需要同一补丁重跑三次的方差（R2 那条 open question 至今没跑）。
2. **e-process 的 λ 怎么选、α 定多少，我们没有先验。** PACE 报的是 30–42% 假接受率，但它的 α 与 λ 是在 GSM8K/SVAMP/ARC 上调的；我们的 killRate 分布（0.85–0.9 常见、0/1 常见）与它差得远，直接抄数会得到一个过松或过紧的门。
3. **「省评估」和「评估可信」在我们的场景里能不能同时成立。** 文献两侧都有实证支持（BenchPress 省、PACE 严），但没有一篇在「单任务集、二值验证器、每轮都改代码」的条件下测过。这正好是我们唯一有的数据形态，也正好是这个方向最缺的那一格。
