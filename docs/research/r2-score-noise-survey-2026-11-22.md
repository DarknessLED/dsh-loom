# R2 评分与噪声：连续评分、评估方差、统计功效、噪声闸门

> 自动生成于 2026-11-22，来源 `research/out/r2-score-noise.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 26 条（其中 2 条返回 0 结果）|
| 不同候选 | 562 |
| 保留候选 | 373 |
| 读通全文 | 50 篇（4 篇无可用 HTML） |
| 参考文献条目 | 2570 条引用 |
| 语料内被至少两篇引的工作 | 2070 个 |
| 达到基石门槛 | 165 |
| 被反复对比的基线 | 282 |
| 常引但本轮缺席 | 160 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 16 | 31 | 2023 | “Judging LLM-as-a-judge with MT-bench and Chatbot Arena” | — |
| 13 | 17 | 2022 | Training language models to follow instructions with human feedback. | [2203.02155](https://arxiv.org/abs/2203.02155) |
| 11 | 25 | 2021 | Evaluating large language models trained on code. | [2107.03374](https://arxiv.org/abs/2107.03374) |
| 9 | 14 | 2017 | “Proximal Policy Optimization Algorithms” | [1707.06347](https://arxiv.org/abs/1707.06347) |
| 9 | 11 | 2023 | Direct preference optimization: Your language model is secretly a reward model. | [2305.18290](https://arxiv.org/abs/2305.18290) |
| 8 | 21 | 2024 | Chatbot arena: An open platform for evaluating llms by human preference. | [2403.04132](https://arxiv.org/abs/2403.04132) |
| 8 | 18 | 2024 | “DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models” | [2402.03300](https://arxiv.org/abs/2402.03300) |
| 8 | 11 | 2021 | Training verifiers to solve math word problems. | [2110.14168](https://arxiv.org/abs/2110.14168) |
| 8 | 6 | 2022 | Lora: Low-rank adaptation of large language models. | [2106.09685](https://arxiv.org/abs/2106.09685) |
| 6 | 16 | 2025 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. | [2406.12045](https://arxiv.org/abs/2406.12045) |
| 6 | 8 | 2025 | “DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning” | [2501.12948](https://arxiv.org/abs/2501.12948) |
| 6 | 7 | 2025 | “Qwen3 Technical Report” | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 6 | 6 | 2024 | The Llama 3 Herd of Models. | [2407.21783](https://arxiv.org/abs/2407.21783) |
| 6 | 6 | 2020 | Measuring massive multitask language understanding. | [2009.03300](https://arxiv.org/abs/2009.03300) |
| 5 | 9 | 2024 | Adding error bars to evals: A statistical approach to language model evaluations. | [2411.00640](https://arxiv.org/abs/2411.00640) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 31 | 16 | 2023 | “Judging LLM-as-a-judge with MT-bench and Chatbot Arena” | — |
| 17 | 13 | 2022 | Training language models to follow instructions with human feedback. | [2203.02155](https://arxiv.org/abs/2203.02155) |
| 25 | 11 | 2021 | Evaluating large language models trained on code. | [2107.03374](https://arxiv.org/abs/2107.03374) |
| 14 | 9 | 2017 | “Proximal Policy Optimization Algorithms” | [1707.06347](https://arxiv.org/abs/1707.06347) |
| 11 | 9 | 2023 | Direct preference optimization: Your language model is secretly a reward model. | [2305.18290](https://arxiv.org/abs/2305.18290) |
| 21 | 8 | 2024 | Chatbot arena: An open platform for evaluating llms by human preference. | [2403.04132](https://arxiv.org/abs/2403.04132) |
| 18 | 8 | 2024 | “DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models” | [2402.03300](https://arxiv.org/abs/2402.03300) |
| 11 | 8 | 2021 | Training verifiers to solve math word problems. | [2110.14168](https://arxiv.org/abs/2110.14168) |
| 6 | 8 | 2022 | Lora: Low-rank adaptation of large language models. | [2106.09685](https://arxiv.org/abs/2106.09685) |
| 16 | 6 | 2025 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. | [2406.12045](https://arxiv.org/abs/2406.12045) |

## 各细分方向的开篇（按语料内最早一篇）

- **judge / win-rate reliability** — 语料内 39 篇，最早 2023-02-28：Is Reinforcement Learning (Not) for Natural Language Processing: Benchmarks, Baselines, and Building Blocks for Natural Language Policy Optimization · [arXiv:2210.01241](https://arxiv.org/abs/2210.01241)
- **run-to-run variance** — 语料内 38 篇，最早 2024-12-05：Stochastic Monkeys at Play: Random Augmentations Cheaply Break LLM Safety Alignment · [arXiv:2411.02785](https://arxiv.org/abs/2411.02785)
- **benchmark instability** — 语料内 15 篇，最早 2023-04-17：K-means Clustering Based Feature Consistency Alignment for Label-free Model Evaluation · [arXiv:2304.09758](https://arxiv.org/abs/2304.09758)
- **flaky measurement** — 语料内 3 篇，最早 2024-09-16：Do Test and Environmental Complexity Increase Flakiness? An Empirical Study of SAP HANA · [arXiv:2409.10062](https://arxiv.org/abs/2409.10062)
- **partial credit / graded scoring** — 语料内 1 篇，最早 2026-08-18：Pander Score: A Continuous Measure of Sycophancy as Epistemic Deference · [arXiv:2606.07897](https://arxiv.org/abs/2606.07897)
- **statistics of evaluation** — 语料内 2 篇，最早 2026-01-17：Spark-LLM-Eval: A Distributed Framework for Statistically Rigorous Large Language Model Evaluation · [arXiv:2603.28769](https://arxiv.org/abs/2603.28769)

**开篇不等于首创。** 这是"本语料里最早"的一篇，语料是按 2023 年后的查询抓的，真正的 2011–2020 开篇要么在 gap 表里（搜索没返回过它），要么根本没被渲染成 HTML。

## 最近的 SOTA（近两年，按语料）

- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —
- — · —

## 被常引但不在语料里（下一轮的查询）

- 13 篇引 · 2022 · Training language models to follow instructions with human feedback. · [arXiv:2203.02155](https://arxiv.org/abs/2203.02155)
- 11 篇引 · 2021 · Evaluating large language models trained on code. · [arXiv:2107.03374](https://arxiv.org/abs/2107.03374)
- 9 篇引 · 2017 · “Proximal Policy Optimization Algorithms” · [arXiv:1707.06347](https://arxiv.org/abs/1707.06347)
- 8 篇引 · 2024 · Chatbot arena: An open platform for evaluating llms by human preference. · [arXiv:2403.04132](https://arxiv.org/abs/2403.04132)
- 8 篇引 · 2022 · Lora: Low-rank adaptation of large language models. · [arXiv:2106.09685](https://arxiv.org/abs/2106.09685)
- 6 篇引 · 2025 · τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. · [arXiv:2406.12045](https://arxiv.org/abs/2406.12045)
- 6 篇引 · 2025 · “DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning” · [arXiv:2501.12948](https://arxiv.org/abs/2501.12948)
- 6 篇引 · 2025 · “Qwen3 Technical Report” · [arXiv:2505.09388](https://arxiv.org/abs/2505.09388)
- 6 篇引 · 2024 · The Llama 3 Herd of Models. · [arXiv:2407.21783](https://arxiv.org/abs/2407.21783)
- 6 篇引 · 2020 · Measuring massive multitask language understanding. · [arXiv:2009.03300](https://arxiv.org/abs/2009.03300)
- 5 篇引 · 2024 · Adding error bars to evals: A statistical approach to language model evaluations. · [arXiv:2411.00640](https://arxiv.org/abs/2411.00640)
- 5 篇引 · 2024 · Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators. · [arXiv:2404.04475](https://arxiv.org/abs/2404.04475)

---

## 读完这一批之后我认为什么变了

**一、这一方向最硬的结论来自一篇 2026-02 的论文（2602.07150），而它说的正是我们账本里最脆弱的地方。** 十条独立 run、六种配置、六万条轨迹，单次 pass@1 估计随"选了哪一次 run"变动 2.2–6.0 个百分点，temperature 0 时标准差仍超过 1.5 个百分点。我们所有"promoted / no-gain"的判断都是单次 run 的：一个 round 的 `score` 是那一次 attempt 的 killRate，`decidePromotion` 的 `noiseSpread` 用的是同一轮内候选之间的分散度。也就是说，**我们测的是"这一次做得怎么样"，却拿它当"这个改动做得怎么样"**。文献里这个区别有名字：单次观测的方差 vs 处理效应。我们的 gate 从来没有重复观测，所以它测不出"改进小于噪声"。

**二、判官可靠性（39 篇）与 run-to-run 方差（38 篇）体量相当，但我们只处理了前者的一小块。** judge reliability 关心"同一个回答被两个判官打分是否一致"；我们的 `scoreOf` 用 killRate 绕开了判官，这是对的——但代价是把方差全部推给了"这次机器跑出来的 killRate"。R2 的 38 篇里没有一篇在讲"killRate 这种程序化指标也有方差"，因为程序化指标通常被认为是确定的。**在我们这里它不确定**：同一个 patch 在不同轮次可能因为缓存的测试顺序、随机种子或环境温度而通过不同数量的用例。

**三、"部分分"（partial credit）在文献里只有 1 篇，且是 2026-08 的。** 这说明"连续评分"在 LLM 评估里仍是边缘做法——大多数 benchmark 还是 0/1。我们上一轮把 killRate 接进每轮、scoreSource 标成 `killRate`，在方法上是走在文献前面的，但这也意味着**没有现成的规范可抄**：没有论文告诉我们"killRate 0.6 与 0.9 之间的差是否可加"。

## 三条我会改的

1. **给 gate 加"重复观测"的最小实现**：同一个 patch 在判定前跑两次验证器，取两次的中位数与差；差超过 `noiseSpread` 就判 `noise`，不判 `promote`。账本显示我们的验证器大多在 10–400 秒、每轮几美分，重跑一次的成本远低于一次错误晋升（后者平均 $0.03 的兄弟支出加上一次撤回）。
2. **把"这一轮"与"这个改动"分开记**：`round.finished.score` 是观测，`gate.evaluated.delta` 是推断。现在两者用同一批数字、没有区分字段。至少要加 `observations: n`，让读者知道 delta 是几条观测算出来的。
3. **对连续分数做一次可加性检查**：拿三个已知难度的仪器（比如 0.364 / 0.6 / 1.0 基线），各跑 5 轮，看 killRate 的均值是否稳定在真值附近。这是 R2 那篇论文最便宜的复现，也是我们所有"连续评分更好"的说法唯一能站住的证据。

## 这份调研没回答的三件事

- **killRate 的方差有多大**：语料里没有任何一篇测过程序化指标的重跑方差；我们自己的账本里有同一任务多次跑的数据，但没人算过。
- **多小的改进值得测**：统计学给了功效公式，但"一个晋升值多少钱"是我们的经济学问题，不是文献问题。
- **判官与程序化指标谁更稳**：R2 的 39 篇判官论文与我们的 killRate 之间没有对照实验；这个对照要我们自己跑。

## 复算

```
node scripts/research-survey.mjs directions/r2-score-noise.json --resume --gaps 8
node scripts/research-doc.mjs r2-score-noise
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
