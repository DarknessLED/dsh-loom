# R8 调研方法本身：文献饱和、系统综述自动化、证据质量与可复算

> 自动生成于 2026-11-22，来源 `research/out/r8-research-method.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 25 条（其中 0 条返回 0 结果）|
| 不同候选 | 773 |
| 保留候选 | 287 |
| 读通全文 | 49 篇（5 篇无可用 HTML） |
| 参考文献条目 | 2732 条引用 |
| 语料内被至少两篇引的工作 | 2289 个 |
| 达到基石门槛 | 172 |
| 被反复对比的基线 | 439 |
| 常引但本轮缺席 | 163 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 11 | 21 | 2023 | ReAct: Synergizing reasoning and acting in language models. | — |
| 11 | 15 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. | — |
| 7 | 12 | 2023 | Enabling large language models to generate text with citations. | — |
| 7 | 12 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. | [2504.12516](https://arxiv.org/abs/2504.12516) |
| 7 | 11 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. | [2503.09516](https://arxiv.org/abs/2503.09516) |
| 6 | 12 | 2023 | Evaluating verifiability in generative search engines. | [2304.09848](https://arxiv.org/abs/2304.09848) |
| 6 | 11 | 2026 | DeepResearch bench: A comprehensive benchmark for deep research agents. | — |
| 6 | 8 | 2025 | Qwen3 technical report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 5 | 8 | 2025 | Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. | [2508.06600](https://arxiv.org/abs/2508.06600) |
| 5 | 7 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. | [2112.09332](https://arxiv.org/abs/2112.09332) |
| 5 | 6 | 2023 | Toolformer: Language models can teach themselves to use tools. | — |
| 5 | 6 | 2023 | Self-Refine: Iterative refinement with self-feedback. | — |
| 4 | 9 | 2025 | Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. | [2511.07685](https://arxiv.org/abs/2511.07685) |
| 4 | 9 | 2025 | Search-o1: Agentic search-enhanced large reasoning models. | [2501.05366](https://arxiv.org/abs/2501.05366) |
| 4 | 9 | 2022 | Chain of thought prompting elicits reasoning in large language models. | [2201.11903](https://arxiv.org/abs/2201.11903) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 21 | 11 | 2023 | ReAct: Synergizing reasoning and acting in language models. | — |
| 15 | 11 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. | — |
| 12 | 7 | 2023 | Enabling large language models to generate text with citations. | — |
| 12 | 7 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. | [2504.12516](https://arxiv.org/abs/2504.12516) |
| 11 | 7 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. | [2503.09516](https://arxiv.org/abs/2503.09516) |
| 12 | 6 | 2023 | Evaluating verifiability in generative search engines. | [2304.09848](https://arxiv.org/abs/2304.09848) |
| 11 | 6 | 2026 | DeepResearch bench: A comprehensive benchmark for deep research agents. | — |
| 8 | 6 | 2025 | Qwen3 technical report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 8 | 5 | 2025 | Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. | [2508.06600](https://arxiv.org/abs/2508.06600) |
| 7 | 5 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. | [2112.09332](https://arxiv.org/abs/2112.09332) |

## 各细分方向的开篇（按语料内最早一篇）

- **review automation** — 语料内 59 篇，最早 2023-06-30：Outcome-based Evaluation of Systematic Review Automation · [arXiv:2306.17614](https://arxiv.org/abs/2306.17614)
- **evidence grounding** — 语料内 82 篇，最早 2023-02-16：Recitation- Augmented Language Models · [arXiv:2210.01296](https://arxiv.org/abs/2210.01296)
- **research agent evaluation** — 语料内 49 篇，最早 2024-09-15：HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild · [arXiv:2403.04307](https://arxiv.org/abs/2403.04307)
- **coverage & saturation** — 语料内 11 篇，最早 2026-02-14：Unifying Ranking and Generation in Query Auto-Completion via Retrieval-Augmented Generation and Multi-Objective Alignment · [arXiv:2602.01023](https://arxiv.org/abs/2602.01023)
- **citation graph mining** — 语料内 3 篇，最早 2026-10-05：Citations Are Late: Reading epistemic instability from what papers believe, years before the citation graph catches up · [arXiv:2610.07397](https://arxiv.org/abs/2610.07397)

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

- 6 篇引 · 2023 · Evaluating verifiability in generative search engines. · [arXiv:2304.09848](https://arxiv.org/abs/2304.09848)
- 5 篇引 · 2025 · Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. · [arXiv:2508.06600](https://arxiv.org/abs/2508.06600)
- 5 篇引 · 2021 · WebGPT: Browser-assisted question-answering with human feedback. · [arXiv:2112.09332](https://arxiv.org/abs/2112.09332)
- 5 篇引 · 2023 · Toolformer: Language models can teach themselves to use tools.
- 5 篇引 · 2023 · Self-Refine: Iterative refinement with self-feedback.
- 4 篇引 · 2025 · Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. · [arXiv:2511.07685](https://arxiv.org/abs/2511.07685)
- 4 篇引 · 2025 · Search-o1: Agentic search-enhanced large reasoning models. · [arXiv:2501.05366](https://arxiv.org/abs/2501.05366)
- 4 篇引 · 2022 · Chain of thought prompting elicits reasoning in large language models. · [arXiv:2201.11903](https://arxiv.org/abs/2201.11903)
- 4 篇引 · 2025 · DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. · [arXiv:2504.03160](https://arxiv.org/abs/2504.03160)
- 4 篇引 · 2023 · Reflexion: language agents with verbal reinforcement learning.
- 4 篇引 · 2024 · The AI scientist: Towards fully automated open-ended scientific discovery. · [arXiv:2408.06292](https://arxiv.org/abs/2408.06292)
- 4 篇引 · 2025 · Introducing deep research.

---

## 读完这一批之后我认为什么变了

**一、这个方向的基石不是"调研方法"，是检索与生成的基础设施。** ReAct（11 篇引）、RAG（11）、BrowseComp（7）、Search-R1（7）、WebGPT（5）——它们都在解决"怎么让模型用上外部信息"，而不是"怎么知道调研够了"。真正的 coverage & saturation 只有 11 篇，citation graph mining 只有 3 篇且最早 2026-10。

**二、"饱和"在文献里的定义与我们的定义不一样。** 我们上一轮 R8 读到的是"新读不再改变地图"；系统综述自动化（review automation，59 篇）里的饱和是"再检索也没有新的纳入文献"（grounded theory 的 theoretical saturation）。**两者是同一个直觉的两种形式化**：前者按结论变化，后者按文献穷尽。我们的 `questions.json` 台账只能记后者（还有哪些问题没答），记不了前者。

**三、evidence grounding 82 篇是最大的 cluster，但它们的共同点是"引用要可验证"，不是"引用要够多"。** Evaluating verifiability in generative search engines（6 篇引）与 Recitation-Augmented LM（82 篇 cluster 的开篇）都在问同一件事：**生成的每句话能不能在来源里找到**。我们的 `src/research/note.js` + `ledger.js` 做的正是这件事（quote 必须逐字命中），而且是机械执行的——这一块我们比语料里绝大多数方案更严格。

## 三条我会改的

1. **把"饱和"写成两个可算的量**：`coverage`（引用图里还有多少高频工作没读）与 `delta`（新读一轮后已有结论有几条被改写）。前者我已实现（gap 表），后者只在上轮 R8 试过一次。两者都写进 `rsi_research` 的返回值，而不是靠人看报告。
2. **引用图挖掘应当成为内建能力**：现在的 `scripts/research-survey.mjs` 是脚本，不在插件里。citation graph mining 只有 3 篇说明这是新方向，但对我们是最直接有用的（回溯 SOTA 的参考文献）。它值得进 `src/research/`。
3. **对"不可核验"的来源要记账**：我们的 ledger 会把 quote 找不到的 claim 标 `contradicted`，但从不统计"有多少来源因为抓不到而没进账"。`fetchByUrl` 的失败是静默的。这一条与 R6 的"假阴性率"是同一个病。

## 这份调研没回答的三件事

- **调研质量的度量**：DeepResearch Bench / BrowseComp 评的是"答案对不对"，不是"覆盖够不够"。没有 benchmark 评覆盖。
- **人读一份调研需要多久**：所有自动化综述论文都报节省的时间，但基线是人工综述（数周），不是"读一份 agent 写的报告"。
- **多轮深挖的收益递减点**：我们有 `readAttemptsFor`（fetchTop×3+4）这种工程启发式，文献里没有对应的"第几轮之后不再有边际收益"的实证。

## 复算

```
node scripts/research-survey.mjs directions/r8-research-method.json --resume --gaps 8
node scripts/research-doc.mjs r8-research-method
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
