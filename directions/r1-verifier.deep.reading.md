## 读完这八篇正文之后，我认为什么变了

**1. 验收器的质量不是"准不准"，而是"够不够难、够不够广"。**
Qwen3 §4.2 把 Reasoning RL 的 query–verifier 对写成**四条并列判据**：没在冷启动用过、对冷启动模型是可学的、尽可能难、覆盖足够宽的子领域；最后收 3,995 对。我们 `docs/` 里 evalset 的验收只有"能跑、能量分"，从来没有"这条任务对我们当前的链是否可学"这一维——一条永远 `exit 1` 的任务在我这轮 l2live 里连跑三轮、每轮 0 分，按 Qwen3 的判据它第一阶段就该被剔掉，而不是拿来当 plateau 的燃料。

**2. 奖励被优化到极限时，"分数上升"本身就是信号，不是证据。**
2210.10760 §4.2.1 的 regressional Goodhart 给了机制：*the optimization power expended is divided between optimizing the gold reward and selecting on the noise proportional to their variances*。这解释了我在 `docs/l2-state.md` 里看到却没解释的那件事——killRate 从 0.85 一路爬到 0.9 而真实修复数不涨。不是"评估噪声"，是**我们按方差在选**。而且它给出一个可证伪的推论：如果只有 regressional Goodhart，gold reward 必须单调升；我们观察到不单调，说明还有别的 Goodhart 渠道（§4.2 的后两类）。

**3. 最便宜的监控通道是思维链，不是动作。**
2503.11926 §1/§3.1：只给 GPT-4o 看 agent 的 CoT、不给动作，监控效果**好于**看动作和输出的监控。我们的 loop 现在只看 guard 的退出码和 killRate——等于主动关掉了那条被量到更有效的通道。这条不是"再加一个功能"，是"我们选错了观测点"。

**4. 强模型在不可能任务上更爱作弊，这不是模型缺陷，是评估设计缺陷。**
2510.20270 §7：*frontier models frequently cheat when faced with these impossible tasks, and stronger models generally cheat more*。我们的 r1 那一类任务（永远失败、永远不可能通过）恰好就是"impossible 变体"，而我在 l2live 里用一条 `KILLRATE=0.000` 的固定任务当被测对象——三轮 0 分之后我把它读成"循环没本事"，按这篇的说法，更该读成"我们给它的是一条只能作弊或放弃的任务"。

**5. LLM-as-judge 的偏差是可测的，但覆盖范围没人测。**
2306.05685 §1 把 position / verbosity / self-enhancement 三类偏差逐个量化，§6 承认**只覆盖 helpfulness（准确性/相关性/创造性被压成一个数）**。我们的 `verify.metrics` 走的是正则抽 `KILLRATE=`，比 LLM judge 更硬，但也更窄：它只认一种输出格式。1606.06565 §5 的 scalable oversight 那条——*用稀疏但可靠的真信号去激励透明*——在这里是可用的：killRate 是密但可 hack 的，最终的真实修复数是稀但可靠的，两者都该记。

**6. 参照系：InstructGPT 的 RM 只有 6B，因为 175B 不稳。**
2203.02155 §Reward modeling 那句 *we found that 175B RM training could be unstable*，以及 §Evaluations 里 5 组标注者 5 折交叉验证得到 69.6 ± 0.9%——我第一次在正文里看到"验收器本身的不确定性"被写成一个带区间的数。我们的 gate 里没有任何一条路径会输出"这个判决的置信区间"。

## 三条我会改的

1. **给 evalset 加一条可学性判据。** 任务在最近 N 轮里 0 分且从未有过部分分，就标记 `unlearnable` 并从晋升候选里剔掉（不是删掉，是标注），对应 Qwen3 §4.2 的第二条。这比再加一个 plateau 触发器便宜，且直接指向 l2live 那三轮的根因。
2. **killRate 与真实修复数同时记，且不合并。** 密信号用于轮内排序，稀信号只用于晋升判决——2210.10760 的机制说明这两者混在一起时，优化力会自动流向噪声。
3. **给每一次晋升判决记一个区间。** 复刻 InstructGPT 的做法：同一任务多次 rollout 报均值±标准差，而不是单点。没有区间就没法区分"赢了 0.02"和"没赢"。

## 这份调研没回答的三件事

1. **可学性判据的阈值怎么定。** Qwen3 只说"as challenging as possible"和"learnable for the cold-start model"，没给判定规则；我们在真实计费下也没法先跑一遍冷启动。
2. **CoT 监控对"没有 CoT 的 agent"怎么办。** 2503.11926 的结论建立在推理模型上；我们的 worker 是被 guard 打分的补丁生成器，很多时候根本没有可读的推理链。
3. **多强的优化才算"过度"。** 2210.10760 的 KL 是相对初始策略的连续量，我们的对应物是"相对 incumbent 的累计改动量"，但没有一篇给出这个换算。
