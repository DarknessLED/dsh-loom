# R7 自我修改与循环：自改 agent、元进化、多样性崩塌与漂移

> 自动生成于 2026-11-22，来源 `research/out/r7-selfmod.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 26 条（18 条手写 + 8 条回填；其中 2 条返回 0 结果）|
| 不同候选 | 740 |
| 保留候选 | 282 |
| 读通全文 | 50 篇（3 篇无可用 HTML） |
| 参考文献条目 | 3733 条引用 |
| 语料内被至少两篇引的工作 | 2937 个 |
| 达到基石门槛 | 155 |
| 被反复对比的基线 | 433 |
| 常引但本轮缺席 | 150 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 30 | 2015 | Illuminating search spaces by mapping elites. | [1504.04909](https://arxiv.org/abs/1504.04909) |
| 9 | 15 | 2016 | Quality diversity: A new frontier for evolutionary computation. | — |
| 8 | 14 | 2024 | Mathematical discoveries from program search with large language models. | — |
| 7 | 12 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. | [2506.13131](https://arxiv.org/abs/2506.13131) |
| 7 | 9 | 2011 | Abandoning objectives: Evolution through the search for novelty alone. | — |
| 6 | 13 | 2023 | Voyager: An open-ended embodied agent with large language models. | [2305.16291](https://arxiv.org/abs/2305.16291) |
| 6 | 10 | 2021 | Evaluating large language models trained on code. | [2107.03374](https://arxiv.org/abs/2107.03374) |
| 6 | 7 | 2015 | Robots That Can Adapt Like Animals. | — |
| 5 | 11 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts | [2402.16822](https://arxiv.org/abs/2402.16822) |
| 5 | 7 | 2025 | Automated design of agentic systems. | [2408.08435](https://arxiv.org/abs/2408.08435) |
| 5 | 4 | 2023 | Reflexion: Language agents with verbal reinforcement learning. | — |
| 4 | 13 | 2025 | Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities. | [2507.06261](https://arxiv.org/abs/2507.06261) |
| 4 | 12 | 2024 | The Llama 3 herd of models. | [2407.21783](https://arxiv.org/abs/2407.21783) |
| 4 | 11 | 2025 | Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents. | [2505.22954](https://arxiv.org/abs/2505.22954) |
| 4 | 6 | 2024 | Swe-bench: Can language models resolve real-world github issues? | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 30 | 14 | 2015 | Illuminating search spaces by mapping elites. | [1504.04909](https://arxiv.org/abs/1504.04909) |
| 15 | 9 | 2016 | Quality diversity: A new frontier for evolutionary computation. | — |
| 14 | 8 | 2024 | Mathematical discoveries from program search with large language models. | — |
| 12 | 7 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. | [2506.13131](https://arxiv.org/abs/2506.13131) |
| 9 | 7 | 2011 | Abandoning objectives: Evolution through the search for novelty alone. | — |
| 13 | 6 | 2023 | Voyager: An open-ended embodied agent with large language models. | [2305.16291](https://arxiv.org/abs/2305.16291) |
| 10 | 6 | 2021 | Evaluating large language models trained on code. | [2107.03374](https://arxiv.org/abs/2107.03374) |
| 7 | 6 | 2015 | Robots That Can Adapt Like Animals. | — |
| 11 | 5 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts | [2402.16822](https://arxiv.org/abs/2402.16822) |
| 7 | 5 | 2025 | Automated design of agentic systems. | [2408.08435](https://arxiv.org/abs/2408.08435) |

## 各细分方向的开篇（按语料内最早一篇）

- **diversity & collapse** — 语料内 20 篇，最早 2020-05-08：BOP- Elites , a Bayesian Optimisation algorithm for Quality-Diversity search · [arXiv:2005.04320](https://arxiv.org/abs/2005.04320)
- **complexity control** — 语料内 3 篇，最早 2026-10-04：AgentDiscover: Autonomous Discovery with Minimal Search Scaffolding · [arXiv:2610.05334](https://arxiv.org/abs/2610.05334)
- **open-endedness** — 语料内 6 篇，最早 2023-05-21：Augmenting Autotelic Agents with Large Language Models · [arXiv:2305.12487](https://arxiv.org/abs/2305.12487)
- **evolutionary search over agents** — 语料内 73 篇，最早 2023-03-16：Arbitrary Order Meta-Learning with Simple Population-Based Evolution · [arXiv:2303.09478](https://arxiv.org/abs/2303.09478)
- **evaluator overfitting** — 语料内 25 篇，最早 2025-12-07：POLARIS: Is Multi- Agentic Reasoning the Next Wave in Engineering Self-Adaptive Systems? · [arXiv:2512.04702](https://arxiv.org/abs/2512.04702)
- **self-modification** — 语料内 31 篇，最早 2026-05-13：Harnessing Agentic Evolution · [arXiv:2605.13821](https://arxiv.org/abs/2605.13821)

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

- 9 篇引 · 2016 · Quality diversity: A new frontier for evolutionary computation.
- 8 篇引 · 2024 · Mathematical discoveries from program search with large language models.
- 7 篇引 · 2011 · Abandoning objectives: Evolution through the search for novelty alone.
- 6 篇引 · 2021 · Evaluating large language models trained on code. · [arXiv:2107.03374](https://arxiv.org/abs/2107.03374)
- 6 篇引 · 2015 · Robots That Can Adapt Like Animals.
- 5 篇引 · 2024 · Rainbow teaming: open-ended generation of diverse adversarial prompts · [arXiv:2402.16822](https://arxiv.org/abs/2402.16822)
- 5 篇引 · 2025 · Automated design of agentic systems. · [arXiv:2408.08435](https://arxiv.org/abs/2408.08435)
- 5 篇引 · 2023 · Reflexion: Language agents with verbal reinforcement learning.
- 4 篇引 · 2025 · Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities. · [arXiv:2507.06261](https://arxiv.org/abs/2507.06261)
- 4 篇引 · 2024 · The Llama 3 herd of models. · [arXiv:2407.21783](https://arxiv.org/abs/2407.21783)
- 4 篇引 · 2025 · Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents. · [arXiv:2505.22954](https://arxiv.org/abs/2505.22954)
- 4 篇引 · 2024 · Swe-bench: Can language models resolve real-world github issues?

---

## 读完这一批之后我认为什么变了

**一、自我改进的学科基础不是 LLM，是质量-多样性（QD）进化。** 基石前十：MAP-Elites（14 篇引）、Quality Diversity: A New Frontier（9）、FunSearch（8）、AlphaEvolve（7）、Abandoning Objectives / novelty search（7）、Robots That Can Adapt Like Animals（6）。**"多样性不是噪声，是搜索资源"** 是这一线的核心主张——而我们整个插件里没有任何"多样性"概念：候选是同一个 prompt 的不同采样，archive 里也只有链版本，没有行为描述符。

**二、evaluator overfitting（25 篇）与 diversity & collapse（20 篇）是两个独立的失效面，而我们把它们混在一个 "plateau" 触发器里。** 语料里 evaluator overfitting 讲的是"在训练用的判据上变好、在没见过的上变差"（我们 R7 上一轮读到的"gains largely vanish"），diversity collapse 讲的是"种群塌到同一个点，于是后续搜索再无新意"。前者需要 held-out，后者需要 archive 结构。我们的 plateau 只看"最近 N 轮没晋升"——这两种病都会被它误报成同一种。

**三、complexity control 只有 3 篇，且最早 2026-10。** 这与 RRSI 那条结论（复杂度累积）互证：**"让系统别越改越复杂"是新问题，还没有共识**。我们账本里有 `lineEndingChurn` 这种机械检查，但没有"这个 chain 变体让 spec 复杂度上升了多少"的度量。

## 三条我会改的

1. **给 archive 加行为描述符**：MAP-Elites 的核心是"按行为维度分格，每格留最好的"。我们的 chain 版本可以按 `(candidates 数, 是否有 plan 腿, halving 开关)` 分格——这三者就是行为维度。这能直接解决"plateau 提案总是 minimal-change"的问题（现在 `proposeMutations` 的 fresh 项里 minimal-change 恒定排第一）。
2. **把 plateau 触发器拆成两个**：`no-promotion`（可能是 evaluator overfitting，该换 held-out）与 `population-collapse`（所有候选分数趋同，该加多样性）。两者证据不同，不该共用一个卡。
3. **给 chain 变体加复杂度度量**：spec 的节点数、prompt 总长度、可选腿数量——三个数就能支撑"这个变体让系统更复杂了"的判断，而这是文献里唯一确定的坏味道。

## 这份调研没回答的三件事

- **QD 在大模型 agent 上是否划算**：MAP-Elites 的评测成本假设是"每次评一个点很便宜"；我们每次评一个点要几美分到几毛钱，网格化可能直接烧光预算。
- **行为描述符怎么选**：语料里 QD 的描述符是人工设计的（机器人形态、策略行为）；agent 链的描述符没有公认选择。
- **collapse 的早期信号**：20 篇 diversity & collapse 都在讲"已经塌了"的检测，没有一篇讲预警。

## 复算

```
node scripts/research-survey.mjs directions/r7-selfmod.json --resume --gaps 8
node scripts/research-doc.mjs r7-selfmod
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
