# R4 知识与迁移：经验积累、跨任务迁移、记忆与巩固

> 自动生成于 2026-11-22，来源 `research/out/r4-knowledge.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 25 条（其中 1 条返回 0 结果）|
| 不同候选 | 638 |
| 保留候选 | 236 |
| 读通全文 | 50 篇（3 篇无可用 HTML） |
| 参考文献条目 | 2652 条引用 |
| 语料内被至少两篇引的工作 | 1820 个 |
| 达到基石门槛 | 318 |
| 被反复对比的基线 | 327 |
| 常引但本轮缺席 | 306 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 19 | 42 | 2023 | Memgpt: Towards llms as operating systems. | [2310.08560](https://arxiv.org/abs/2310.08560) |
| 17 | 30 | 2025 | A-mem: Agentic memory for LLM agents. | [2502.12110](https://arxiv.org/abs/2502.12110) |
| 16 | 35 | 2024 | Voyager: An open-ended embodied agent with large language models. | [2305.16291](https://arxiv.org/abs/2305.16291) |
| 16 | 22 | 2023 | Reflexion: Language Agents with Verbal Reinforcement Learning. | [2303.11366](https://arxiv.org/abs/2303.11366) |
| 15 | 30 | 2023 | ReAct: Synergizing reasoning and acting in language models. | [2210.03629](https://arxiv.org/abs/2210.03629) |
| 15 | 30 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. | [2504.19413](https://arxiv.org/abs/2504.19413) |
| 13 | 26 | 2024 | Memorybank: Enhancing large language models with long-term memory. | [2305.10250](https://arxiv.org/abs/2305.10250) |
| 13 | 24 | 2023 | Generative agents: Interactive simulacra of human behavior. | [2304.03442](https://arxiv.org/abs/2304.03442) |
| 11 | 13 | 2020 | Retrieval-augmented generation for knowledge-intensive NLP tasks. | [2005.11401](https://arxiv.org/abs/2005.11401) |
| 10 | 24 | 2025 | Agent workflow memory. | [2409.07429](https://arxiv.org/abs/2409.07429) |
| 10 | 15 | 2024 | Expel: Llm agents are experiential learners. | [2308.10144](https://arxiv.org/abs/2308.10144) |
| 9 | 26 | 2017 | Overcoming catastrophic forgetting in neural networks. | — |
| 9 | 18 | 2025 | Zep: A temporal knowledge graph architecture for agent memory. | [2501.13956](https://arxiv.org/abs/2501.13956) |
| 9 | 18 | 2025 | LongMemEval: Benchmarking chat assistants on long-term interactive memory. | [2410.10813](https://arxiv.org/abs/2410.10813) |
| 9 | 17 | 2024 | Evaluating very long-term conversational memory of llm agents. | [2402.17753](https://arxiv.org/abs/2402.17753) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 42 | 19 | 2023 | Memgpt: Towards llms as operating systems. | [2310.08560](https://arxiv.org/abs/2310.08560) |
| 30 | 17 | 2025 | A-mem: Agentic memory for LLM agents. | [2502.12110](https://arxiv.org/abs/2502.12110) |
| 35 | 16 | 2024 | Voyager: An open-ended embodied agent with large language models. | [2305.16291](https://arxiv.org/abs/2305.16291) |
| 22 | 16 | 2023 | Reflexion: Language Agents with Verbal Reinforcement Learning. | [2303.11366](https://arxiv.org/abs/2303.11366) |
| 30 | 15 | 2023 | ReAct: Synergizing reasoning and acting in language models. | [2210.03629](https://arxiv.org/abs/2210.03629) |
| 30 | 15 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. | [2504.19413](https://arxiv.org/abs/2504.19413) |
| 26 | 13 | 2024 | Memorybank: Enhancing large language models with long-term memory. | [2305.10250](https://arxiv.org/abs/2305.10250) |
| 24 | 13 | 2023 | Generative agents: Interactive simulacra of human behavior. | [2304.03442](https://arxiv.org/abs/2304.03442) |
| 13 | 11 | 2020 | Retrieval-augmented generation for knowledge-intensive NLP tasks. | [2005.11401](https://arxiv.org/abs/2005.11401) |
| 24 | 10 | 2025 | Agent workflow memory. | [2409.07429](https://arxiv.org/abs/2409.07429) |

## 各细分方向的开篇（按语料内最早一篇）

- **memory architecture** — 语料内 119 篇，最早 2023-05-21：MemoryBank : Enhancing Large Language Models with Long - Term Memory · [arXiv:2305.10250](https://arxiv.org/abs/2305.10250)
- **experience reuse** — 语料内 25 篇，最早 2020-07-28：Lessons learned from (and since) the Voyager 2 flybys of Uranus and Neptune · [arXiv:2006.08340](https://arxiv.org/abs/2006.08340)
- **skill library / procedural** — 语料内 34 篇，最早 2025-11-04：A Comparative Analysis of LLM Adaptation: SFT, LoRA, and ICL in Data-Scarce Scenarios · [arXiv:2511.00130](https://arxiv.org/abs/2511.00130)
- **forgetting / stability** — 语料内 13 篇，最早 2020-02-15：Scalable and Order-robust Continual Learning with Additive Parameter Decomposition · [arXiv:1902.09432](https://arxiv.org/abs/1902.09432)
- **transfer & analogy** — 语料内 14 篇，最早 2025-09-01：Bottom-up Domain-specific Superintelligence: A Reliable Knowledge Graph is What We Need · [arXiv:2507.13966](https://arxiv.org/abs/2507.13966)

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

- 17 篇引 · 2025 · A-mem: Agentic memory for LLM agents. · [arXiv:2502.12110](https://arxiv.org/abs/2502.12110)
- 10 篇引 · 2025 · Agent workflow memory. · [arXiv:2409.07429](https://arxiv.org/abs/2409.07429)
- 10 篇引 · 2024 · Expel: Llm agents are experiential learners. · [arXiv:2308.10144](https://arxiv.org/abs/2308.10144)
- 9 篇引 · 2017 · Overcoming catastrophic forgetting in neural networks.
- 9 篇引 · 2025 · Zep: A temporal knowledge graph architecture for agent memory. · [arXiv:2501.13956](https://arxiv.org/abs/2501.13956)
- 9 篇引 · 2025 · LongMemEval: Benchmarking chat assistants on long-term interactive memory. · [arXiv:2410.10813](https://arxiv.org/abs/2410.10813)
- 9 篇引 · 2024 · Evaluating very long-term conversational memory of llm agents. · [arXiv:2402.17753](https://arxiv.org/abs/2402.17753)
- 8 篇引 · 2026 · SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. · [arXiv:2602.08234](https://arxiv.org/abs/2602.08234)
- 8 篇引 · 2024 · SWE-bench: Can language models resolve real-world github issues? · [arXiv:2310.06770](https://arxiv.org/abs/2310.06770)
- 8 篇引 · 2010 · ALFWorld: Aligning text and embodied environments for interactive learning. · [arXiv:2010.03768](https://arxiv.org/abs/2010.03768)
- 8 篇引 · 2020 · Language models are few-shot learners. · [arXiv:2005.14165](https://arxiv.org/abs/2005.14165)
- 8 篇引 · 2021 · LoRA: Low-Rank Adaptation of Large Language Models. · [arXiv:2106.09685](https://arxiv.org/abs/2106.09685)

---

## 读完这一批之后我认为什么变了

**一、记忆方向的基石几乎全是"上下文管理"，而不是"学习"。** MemGPT（19 篇引）、A-MEM（17）、Mem0（15）、MemoryBank（13）、Generative Agents（13）——它们解决的是"上下文装不下时怎么办"，机制是分页、摘要、检索。反思（Reflexion，16）、技能库（Voyager，16）才是"把经验变成能力"的那一类。我们插件里 `src/knowledge/store.js` 存的是 lesson（claim + notWhen），属于后者；`src/knowledge/dream.js` 的合并与退休属于前者。**这两件事在大方向上不是一回事，但我们都叫它"知识"**，这是概念混乱的来源。

**二、"检索到的记忆会挤掉当前任务的检查"这条（R4 上一轮读到的 2606.17645）在这里找到了同伴。** gap 表里 Expel（10 篇引，"LLM agents are experiential learners"）与 Agent Workflow Memory（10）都在讲同一件事：**经验复用是有代价的，代价是注意力和当前任务的判断**。我们的 dream 合并只按内容相似度并，从不问"这条经验在什么情况下不该被拿出来"——而这正是 `notWhen` 字段存在的理由。**我查了：47 条 lesson 里只有 24 条带 `notWhen`，23 条没有**，而且一条 `procedure` 和 46 条 `fact` 之间只有前者被 `src/research/sink.js:129` 强制要求边界（`'a fact lesson needs a notWhen boundary; without one it is an over-general rule'`）。也就是说 research 进来的 fact 有边界，loop 自己归纳出来的 fact 没有。

**三、forgetting / stability 只有 13 篇，其中 9 篇是"克服灾难性遗忘"（2017 EWC 那一线）。** 也就是说，文献里"如何不忘记"是成熟问题，"如何主动忘掉错误的经验"几乎没人做。我们的 `retire` 只在 ttl 或 harm 计数触发时执行——这不是"主动忘掉"，是"过期清理"。

**四、跨领域类比（transfer & analogy，14 篇）的开篇是 2025-09 的 "Bottom-up Domain-specific Superintelligence: A Reliable Knowledge Graph is What We Need"**，比整个记忆方向晚了两年。我们上一轮做的 `cross.js`（类比是假设，不是指令）恰好落在这个新细分里，而且比它更保守——这是个可以继续做的方向。

## 三条我会改的

1. **把"上下文"与"知识"在代码里分开命名**：`store.js` 存的是 claim（可迁移断言），检索压缩是另一层。现在 `knowledge` 这个词同时指两者，导致 dream 的合并规则（内容相似度）被用在 claim 上——相似的两条 claim 可能一个真一个假，合并会丢掉"在什么条件下不成立"。
2. **`notWhen` 必须成为硬字段**：没有 `notWhen` 的 claim 不允许进 store，或者只能以 `hypothesis` 身份进。这与 `src/research/note.js` 已有的纪律一致（`claim.type` 必须是六类之一），只是还没落到 knowledge 上。
3. **把"主动退休"做成一个可测的动作**：现在只有 ttl。文献里对应的是"经验性遗忘"——一条 lesson 在被反复证否后应当降权而不是等过期。账本里有 `pairedImpacts`，可以统计每条 lesson 出现后相关任务的通过率变化，据此降权。

## 这份调研没回答的三件事

- **记忆的价值如何计量**：没有一篇给出"多存一条记忆值多少钱"的公式；我们的 lesson 影响评估（`pairedImpacts`）是自己发明的，没有外部对照。
- **跨领域迁移的成功率**：transfer & analogy 14 篇里没有一篇报"跨领域借来的假设有多少被证实"。
- **检索的噪声**：我们每次注入最多 3 条 lesson（`knowledge.maxShown`），但没有任何证据说明 3 是好的数字；语料里检索类论文都在报 recall，不报"注入后的行为变化"。

## 复算

```
node scripts/research-survey.mjs directions/r4-knowledge.json --resume --gaps 8
node scripts/research-doc.mjs r4-knowledge
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
