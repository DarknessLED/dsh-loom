# R5 编排与人机：审批闸门、自主度、监督与责任

> 自动生成于 2026-11-22，来源 `research/out/r5-human.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 25 条（17 条手写 + 8 条回填；其中 0 条返回 0 结果）|
| 不同候选 | 669 |
| 保留候选 | 267 |
| 读通全文 | 50 篇（11 篇无可用 HTML） |
| 参考文献条目 | 2868 条引用 |
| 语料内被至少两篇引的工作 | 2008 个 |
| 达到基石门槛 | 133 |
| 被反复对比的基线 | 326 |
| 常引但本轮缺席 | 124 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 13 | 24 | 2022 | Training language models to follow instructions with human feedback,. | — |
| 8 | 13 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. | — |
| 8 | 11 | 2022 | Constitutional AI: Harmlessness from AI Feedback. | [2212.08073](https://arxiv.org/abs/2212.08073) |
| 7 | 14 | 2022 | Measuring progress on scalable oversight for large language models. | [2211.03540](https://arxiv.org/abs/2211.03540) |
| 7 | 9 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. | — |
| 6 | 38 | 2024 | Debating with more persuasive llms leads to more truthful answers. | [2402.06782](https://arxiv.org/abs/2402.06782) |
| 6 | 20 | 2018 | Ai safety via debate. | [1805.00899](https://arxiv.org/abs/1805.00899) |
| 6 | 13 | 2023 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. | [2312.09390](https://arxiv.org/abs/2312.09390) |
| 6 | 11 | 2025 | Qwen3 technical report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 6 | 10 | 2018 | Supervising strong learners by amplifying weak experts. | [1810.08575](https://arxiv.org/abs/1810.08575) |
| 6 | 10 | 2024 | DeepSeekMath: pushing the limits of mathematical reasoning in open language models | [2402.03300](https://arxiv.org/abs/2402.03300) |
| 6 | 9 | 2016 | Concrete problems in AI safety. | [1606.06565](https://arxiv.org/abs/1606.06565) |
| 6 | 9 | 2017 | Deep Reinforcement Learning from Human Preferences. | [1706.03741](https://arxiv.org/abs/1706.03741) |
| 6 | 9 | 2022 | Self-critiquing models for assisting human evaluators. | [2206.05802](https://arxiv.org/abs/2206.05802) |
| 6 | 8 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. | [2201.11903](https://arxiv.org/abs/2201.11903) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 24 | 13 | 2022 | Training language models to follow instructions with human feedback,. | — |
| 13 | 8 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. | — |
| 11 | 8 | 2022 | Constitutional AI: Harmlessness from AI Feedback. | [2212.08073](https://arxiv.org/abs/2212.08073) |
| 14 | 7 | 2022 | Measuring progress on scalable oversight for large language models. | [2211.03540](https://arxiv.org/abs/2211.03540) |
| 9 | 7 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. | — |
| 38 | 6 | 2024 | Debating with more persuasive llms leads to more truthful answers. | [2402.06782](https://arxiv.org/abs/2402.06782) |
| 20 | 6 | 2018 | Ai safety via debate. | [1805.00899](https://arxiv.org/abs/1805.00899) |
| 13 | 6 | 2023 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. | [2312.09390](https://arxiv.org/abs/2312.09390) |
| 11 | 6 | 2025 | Qwen3 technical report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 10 | 6 | 2018 | Supervising strong learners by amplifying weak experts. | [1810.08575](https://arxiv.org/abs/1810.08575) |

## 各细分方向的开篇（按语料内最早一篇）

- **approval gates & oversight** — 语料内 81 篇，最早 2022-11-11：Measuring Progress on Scalable Oversight for Large Language Models · [arXiv:2211.03540](https://arxiv.org/abs/2211.03540)
- **accountability & policy** — 语料内 32 篇，最早 2021-10-11：Auditing Robot Learning for Safety and Compliance during Deployment · [arXiv:2110.05702](https://arxiv.org/abs/2110.05702)
- **autonomy levels** — 语料内 28 篇，最早 2023-06-12：Towards Fair and Explainable AI using a Human-Centered AI Approach · [arXiv:2306.07427](https://arxiv.org/abs/2306.07427)
- **automation bias / complacency** — 语料内 3 篇，最早 2026-05-05：What is Human in Judgment? Comparing Automation Bias and Algorithm Aversion Between the United States Military Academy and the General Public · [arXiv:2604.04333](https://arxiv.org/abs/2604.04333)
- **escalation & uncertainty** — 语料内 12 篇，最早 2026-02-02：Constrained Process Maps for Multi-Agent Generative AI Workflows · [arXiv:2602.02034](https://arxiv.org/abs/2602.02034)

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

- 13 篇引 · 2022 · Training language models to follow instructions with human feedback,.
- 8 篇引 · 2023 · Direct Preference Optimization: Your Language Model is Secretly a Reward Model.
- 7 篇引 · 2023 · Judging LLM-as-a-judge with MT-Bench and Chatbot Arena.
- 6 篇引 · 2023 · Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. · [arXiv:2312.09390](https://arxiv.org/abs/2312.09390)
- 6 篇引 · 2025 · Qwen3 technical report. · [arXiv:2505.09388](https://arxiv.org/abs/2505.09388)
- 6 篇引 · 2024 · DeepSeekMath: pushing the limits of mathematical reasoning in open language models · [arXiv:2402.03300](https://arxiv.org/abs/2402.03300)
- 6 篇引 · 2017 · Deep Reinforcement Learning from Human Preferences. · [arXiv:1706.03741](https://arxiv.org/abs/1706.03741)
- 6 篇引 · 2022 · Chain-of-thought prompting elicits reasoning in large language models. · [arXiv:2201.11903](https://arxiv.org/abs/2201.11903)
- 5 篇引 · 2023 · Artificial intelligence risk management framework (ai rmf 1.0).
- 5 篇引 · 2018 · Scalable agent alignment via reward modeling: a research direction. · [arXiv:1811.07871](https://arxiv.org/abs/1811.07871)
- 5 篇引 · 2022 · Training a helpful and harmless assistant with reinforcement learning from human feedback. · [arXiv:2204.05862](https://arxiv.org/abs/2204.05862)
- 5 篇引 · 2023 · GPQA: A graduate-level Google-proof Q&A benchmark. · [arXiv:2311.12022](https://arxiv.org/abs/2311.12022)

---

## 读完这一批之后我认为什么变了

**一、这个方向没有"agent 审批"的文献，只有"可扩展监督"的文献。** 基石前十里全是 RLHF/DPO/Constitutional AI/debate/weak-to-strong（13/8/8/6/6 篇引），approval gates & oversight 81 篇里绝大多数是在 benchmark 里评"人能不能看出模型在骗人"。**没有一篇在讲"人一键采纳一个自动提案"这种工程形态**。这解释了为什么我们的 checkpoint 卡设计找不到参照——它是工程实践中长出来的，不是从论文里抄的。

**二、automation bias / complacency 只有 3 篇，且最早 2026-05。** 这是最直接对应"人一键采纳"的失效模式：**当系统经常对，人就不再细看**。我们的 plateau 卡显示"predicted gain 25%, risk high, diff 12 lines"，一键采纳只需要点一下——这正是 rubber-stamping 的完美条件（R5 上一轮读到的 arthur.ai 材料把这个叫"两个对称失败模式"之一）。

**三、"自主度跟可逆性走"（28 篇 autonomy levels）在文献里的表述是 levels of automation（Parasuraman 那一线的人因工程），不在 arXiv 的 AI 版块。** 我们的 `src/chain/adopt.js` 允许对 `chain` 与 `plateau` 覆盖自动激活，`patch` 需要 guard——这个分级是我们自己定的，没有外部依据，但方向上与"按可逆性分级"一致。

## 三条我会改的

1. **卡上要显示"你上次采纳的结果"**：automation bias 的解药是让人看到自己的命中率。`~/.dsh/loom/decisions.json` 里已经有采纳记录，而 `measure.js` 已经在算 realized vs predicted——把它放回卡上（"你上次采纳的 v3 预测 +25%，实际 0%"）是在现有数据上零成本的一步。
2. **给"一键采纳"加一个可逆性前置**：现在 adopt 对 chain 与 plateau 一视同仁。chain 变体可以回滚（`chain.activated` 有 fromVersion），但一个 `no-test-edits` 变体会让 gate 失去检查能力——这类变体应当需要第二次确认，而不是与 `minimal-change` 同级。
3. **记录"人看了多久"**：`checkpoint.answered` 有 `at`，`checkpoint.raised` 也有 `at`，两者之差就是决策延迟。R5 的 rubber-stamping 判据在工程上就是"延迟趋近于 0"。这个字段我们已经有了，只是没人算过。

## 这份调研没回答的三件事

- **人机协作的最优分工**：81 篇 approval gates 里没有一篇给出"哪些决定该给人、哪些该给机器"的判据。
- **审批延迟分布**：我们的账本里有数据但没分析过；文献里也没有 agent 场景的基线。
- **责任归属**：accountability & policy 32 篇大多是合规视角，没有讲"agent 自主采纳后被证明是错的，谁负责"。

## 复算

```
node scripts/research-survey.mjs directions/r5-human.json --resume --gaps 8
node scripts/research-doc.mjs r5-human
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
