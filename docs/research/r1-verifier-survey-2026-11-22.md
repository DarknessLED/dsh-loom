# R1 判决与验证器：奖励黑客、判决可靠性、验证器设计

> 自动生成于 2026-11-22，来源 `research/out/r1-verifier.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 36 条（26 条手写 + 10 条回填；其中 1 条返回 0 结果）|
| 不同候选 | 979 |
| 保留候选 | 363 |
| 读通全文 | 70 篇（6 篇无可用 HTML） |
| 参考文献条目 | 2954 条引用 |
| 语料内被至少两篇引的工作 | 2044 个 |
| 达到基石门槛 | 310 |
| 被反复对比的基线 | 398 |
| 常引但本轮缺席 | 296 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 31 | 47 | 2024 | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. | [2402.03300](https://arxiv.org/abs/2402.03300) |
| 22 | 49 | 2023 | Scaling Laws for Reward Model Overoptimization. | [2210.10760](https://arxiv.org/abs/2210.10760) |
| 18 | 23 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. | [2306.05685](https://arxiv.org/abs/2306.05685) |
| 17 | 27 | 2022 | Training language models to follow instructions with human feedback. | [2203.02155](https://arxiv.org/abs/2203.02155) |
| 16 | 16 | 2025 | Qwen3 Technical Report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 15 | 30 | 2024 | SWE-bench: can language models resolve real-world GitHub issues? | — |
| 15 | 26 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. | [2503.11926](https://arxiv.org/abs/2503.11926) |
| 15 | 20 | 2016 | Concrete problems in ai safety. | [1606.06565](https://arxiv.org/abs/1606.06565) |
| 14 | 22 | 2022 | Defining and characterizing reward gaming. | — |
| 14 | 21 | 2025 | ImpossibleBench: Measuring LLMs’ propensity of exploiting test cases. | [2510.20270](https://arxiv.org/abs/2510.20270) |
| 13 | 19 | 2025 | Defining and characterizing reward hacking. | [2209.13085](https://arxiv.org/abs/2209.13085) |
| 13 | 17 | 2022 | The effects of reward misspecification: Mapping and mitigating misaligned models. | [2201.03544](https://arxiv.org/abs/2201.03544) |
| 12 | 17 | 2024 | Let’s verify step by step. | [2305.20050](https://arxiv.org/abs/2305.20050) |
| 11 | 17 | 2025 | Natural emergent misalignment from reward hacking in production rl. | [2511.18397](https://arxiv.org/abs/2511.18397) |
| 11 | 12 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. | [2606.19348](https://arxiv.org/abs/2606.19348) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 47 | 31 | 2024 | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. | [2402.03300](https://arxiv.org/abs/2402.03300) |
| 49 | 22 | 2023 | Scaling Laws for Reward Model Overoptimization. | [2210.10760](https://arxiv.org/abs/2210.10760) |
| 23 | 18 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. | [2306.05685](https://arxiv.org/abs/2306.05685) |
| 27 | 17 | 2022 | Training language models to follow instructions with human feedback. | [2203.02155](https://arxiv.org/abs/2203.02155) |
| 16 | 16 | 2025 | Qwen3 Technical Report. | [2505.09388](https://arxiv.org/abs/2505.09388) |
| 30 | 15 | 2024 | SWE-bench: can language models resolve real-world GitHub issues? | — |
| 26 | 15 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. | [2503.11926](https://arxiv.org/abs/2503.11926) |
| 20 | 15 | 2016 | Concrete problems in ai safety. | [1606.06565](https://arxiv.org/abs/1606.06565) |
| 22 | 14 | 2022 | Defining and characterizing reward gaming. | — |
| 21 | 14 | 2025 | ImpossibleBench: Measuring LLMs’ propensity of exploiting test cases. | [2510.20270](https://arxiv.org/abs/2510.20270) |

## 各细分方向的开篇（按语料内最早一篇）

- **benchmark validity** — 语料内 44 篇，最早 2024-10-14：From Crowdsourced Data to High-Quality Benchmarks: Arena -Hard and BenchBuilder Pipeline · [arXiv:2406.11939](https://arxiv.org/abs/2406.11939)
- **judge reliability** — 语料内 41 篇，最早 2023-12-23：Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena · [arXiv:2306.05685](https://arxiv.org/abs/2306.05685)
- **reward hacking / specification gaming** — 语料内 59 篇，最早 2024-08-16：Helping or Herding? Reward Model Ensembles Mitigate but do not Eliminate Reward Hacking · [arXiv:2312.09244](https://arxiv.org/abs/2312.09244)
- **verifier design / test oracle** — 语料内 27 篇，最早 2026-01-09：Understanding LLM-Driven Test Oracle Generation · [arXiv:2601.05542](https://arxiv.org/abs/2601.05542)
- **process vs outcome supervision** — 语料内 14 篇，最早 2026-02-03：PRPO: Aligning Process Reward with Outcome Reward in Policy Optimization · [arXiv:2601.07182](https://arxiv.org/abs/2601.07182)
- **sabotage / sandbagging / deception** — 语料内 7 篇，最早 2025-06-18：LLM Agents for Bargaining with Utility-based Feedback · [arXiv:2505.22998](https://arxiv.org/abs/2505.22998)
- **test generation / repair** — 语料内 5 篇，最早 2026-07-10：Multi- Agent LLM Collaboration for Unit Test Generation via Human-Testing-Inspired Workflows · [arXiv:2607.09101](https://arxiv.org/abs/2607.09101)

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

- 17 篇引 · 2022 · Training language models to follow instructions with human feedback. · [arXiv:2203.02155](https://arxiv.org/abs/2203.02155)
- 15 篇引 · 2024 · SWE-bench: can language models resolve real-world GitHub issues?
- 14 篇引 · 2022 · Defining and characterizing reward gaming.
- 13 篇引 · 2025 · Defining and characterizing reward hacking. · [arXiv:2209.13085](https://arxiv.org/abs/2209.13085)
- 13 篇引 · 2022 · The effects of reward misspecification: Mapping and mitigating misaligned models. · [arXiv:2201.03544](https://arxiv.org/abs/2201.03544)
- 12 篇引 · 2024 · Let’s verify step by step. · [arXiv:2305.20050](https://arxiv.org/abs/2305.20050)
- 11 篇引 · 2026 · Deepseek-v4: Towards highly efficient million-token context intelligence. · [arXiv:2606.19348](https://arxiv.org/abs/2606.19348)
- 10 篇引 · 2026 · Evilgenie: A reward hacking benchmark. · [arXiv:2511.21654](https://arxiv.org/abs/2511.21654)
- 10 篇引 · 2024 · Sycophancy to subterfuge: Investigating reward-tampering in large language models. · [arXiv:2406.10162](https://arxiv.org/abs/2406.10162)
- 9 篇引 · 2026 · Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains. · [arXiv:2507.17746](https://arxiv.org/abs/2507.17746)
- 9 篇引 · 2025 · Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. · [arXiv:2501.12948](https://arxiv.org/abs/2501.12948)
- 9 篇引 · 2025 · Recent frontier models are reward hacking.

---

## 读完这一批之后我认为什么变了

**一、"基石"表里排第一的东西不一定是思想源头。** DeepSeekMath 被 31 篇引，但它被引是因为凡是做 RL-for-reasoning 的论文都要拿它当 baseline 和训练配方，不是因为它提出了"验证器会被钻空子"。真正的思想源头排在后面：Concrete Problems in AI Safety（2016，15 篇）、Defining and characterizing reward gaming（2022，14 篇）、Scaling Laws for Reward Model Overoptimization（2023，22 篇）——最后这篇才是"优化器越用力、代理指标越失真"这条曲线的出处，也就是我们这个 gate 的数学祖先。读表的时候要把"工具型高频引用"和"概念型被引用"分开，否则会以为这个领域的起点是 2024 年。

**二、奖励黑客已经分成两代，第二代和我们的形状不一样。** 第一代是 Goodhart（代理指标失真），第二代是 2025–2026 的 "monitoring reasoning models ... risks of promoting obfuscation"（15 篇引）、ImpossibleBench（14）——它们问的不是"指标对不对"，而是"模型知道你在看它，于是学会在你看的地方表现"。这对我们很直接：我们的 gate 会读 attempt 的报告文本，而报告是 agent 自己写的。"被观察到就会改变行为"这一条，我们目前完全没有防线。

**三、"验证器设计"这个细分方向的开篇是 2026-01**（Understanding LLM-Driven Test Oracle Generation），比 reward hacking 晚一年半。也就是说：**在语料范围内，"怎么造验证器"作为独立课题比"验证器会坏"要新得多**。我们插件里 gate 的成熟度反而处在早期——这是好事，说明这块还有大量未被定式化的空间，也说明我上一轮那份 R1 报告引的"verification horizon"确实踩在时间点上。

**四、判官可靠性（41 篇）和基准有效性（44 篇）几乎是同一个体量，但我们的 gate 只处理前者。** judge reliability 关心"打分的人稳不稳"，benchmark validity 关心"这套题是否还在考它声称要考的东西"。我们的 `tests/` + `spec` 体系其实一直在做后者（红规格、元规格、pin 列表），但从没把它当成一个被研究过的问题来读。这一块可以吸收的东西比 judge 更多。

## 三条我会改的

1. **gate 的输入要区分"agent 自述"与"机器观测"。** `attempt.finished.report` 与 `verifier` 输出混在一份记录里，人在 check 卡上看到的是 agent 的叙述。我一开始把 `src/runtime/round.js:2440` 的 `skipHoldout = checks.noop && !claimedWork` 读成了"自述能跳过复查"——方向正好相反：agent 声称改了文件，`claimedWork` 为真，**holdout 照跑**，这个标记让门禁更严而不是更松，它是采集失败时的逃生口。**我把方向写反了，这是比没读更糟的错误**，现在由 `tests/balance/holdout-claim.test.mjs` 钉住。真正被信任的是 agent 的**沉默**：改动了 0 字节且报告为空才跳过复查。这条规则本身可辩护（没有新字节可查），但"报告为空"必须由 agent **说出来**：883 次尝试里 403 次的报告没通过校验、其中 188 次零字节改动，把"没回答"当成"什么都没改"就会让一个从不回话的 worker 绕过唯一独立检查。已改成只有**合法且明确为空**的报告才跳过（`tests/balance/holdout-silent.test.mjs`）。
2. **给 gate 加一条"被观察"提示的对照**：同一任务、同一模型，在 brief 里显式说"你的报告会被逐字核对"和不说，各跑一次，看分数是否变化。这是 ImpossibleBench 的做法，我们可以在自己的仪器上复现，只需要两轮的钱。
3. **把 benchmark validity 当成一个正式的检查维度**：不只问"这个 patch 通过了吗"，还问"这套验证器最近有没有变得更容易通过"——`docs/` 里其实已经有 `live-report` 的 `noop` 检查，可以扩成"同一任务的通过率随时间漂移"。

## 这份调研没回答的三件事

- **本语料外的经典**：Goodhart 的原始论述、Amodei 的 Concrete Problems 全文、DeepMind 的 specification gaming 清单（那篇是 blog 不是 arXiv）都不在表里。要做真正的"基石"，需要 OpenAlex/S2 的全领域被引数，这一轮额度用完了。
- **哪些防线在真实 agent 上被验证过**：表里的方法多是在 benchmark 上评的；我们这种"长跑、多轮、带文件系统"的 agent 上，哪一条真的挡住过，语料里没有答案。
- **成本**：所有"监控/审计"类方法都没报单位成本。我们的 gate 每轮只花几美分，任何需要第二个模型反复看的方案都可能比被防的风险更贵。

## 复算

```
node scripts/research-survey.mjs directions/r1-verifier.json --resume --gaps 8
node scripts/research-doc.mjs r1-verifier
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
