# R6 遏制与安全：沙箱逃逸、权限边界、供应链与提示注入

> 自动生成于 2026-11-22，来源 `research/out/r6-containment.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 26 条（18 条手写 + 8 条回填；其中 0 条返回 0 结果）|
| 不同候选 | 649 |
| 保留候选 | 174 |
| 读通全文 | 50 篇（2 篇无可用 HTML） |
| 参考文献条目 | 2565 条引用 |
| 语料内被至少两篇引的工作 | 1456 个 |
| 达到基石门槛 | 144 |
| 被反复对比的基线 | 304 |
| 常引但本轮缺席 | 134 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 37 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection” | [2302.12173](https://arxiv.org/abs/2302.12173) |
| 13 | 49 | 2024 | AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents. | — |
| 11 | 15 | 2022 | “ReAct: Synergizing reasoning and acting in language models” | [2210.03629](https://arxiv.org/abs/2210.03629) |
| 10 | 37 | 2026 | Defeating Prompt Injections by Design. | [2503.18813](https://arxiv.org/abs/2503.18813) |
| 10 | 18 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” | [2403.02691](https://arxiv.org/abs/2403.02691) |
| 9 | 17 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” | [2403.14720](https://arxiv.org/abs/2403.14720) |
| 8 | 14 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries | [2402.06363](https://arxiv.org/abs/2402.06363) |
| 7 | 11 | 2025 | Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents. | [2410.02644](https://arxiv.org/abs/2410.02644) |
| 6 | 13 | 2025 | Securing AI agents with information-flow control. | [2505.23643](https://arxiv.org/abs/2505.23643) |
| 6 | 9 | 2023 | “WebArena: A Realistic Web Environment for Building Autonomous Agents” | [2307.13854](https://arxiv.org/abs/2307.13854) |
| 6 | 7 | 2023 | “ToolFormer: Language Models Can Teach Themselves to Use Tools” | [2302.04761](https://arxiv.org/abs/2302.04761) |
| 5 | 14 | 2025 | DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. | — |
| 5 | 13 | 2025 | MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. | — |
| 5 | 13 | 2020 | Firecracker: Lightweight virtualization for serverless applications. | — |
| 5 | 12 | 2026 | WASP: Benchmarking web agent security against prompt injection attacks. | [2504.18575](https://arxiv.org/abs/2504.18575) |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 37 | 14 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection” | [2302.12173](https://arxiv.org/abs/2302.12173) |
| 49 | 13 | 2024 | AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents. | — |
| 15 | 11 | 2022 | “ReAct: Synergizing reasoning and acting in language models” | [2210.03629](https://arxiv.org/abs/2210.03629) |
| 37 | 10 | 2026 | Defeating Prompt Injections by Design. | [2503.18813](https://arxiv.org/abs/2503.18813) |
| 18 | 10 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” | [2403.02691](https://arxiv.org/abs/2403.02691) |
| 17 | 9 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” | [2403.14720](https://arxiv.org/abs/2403.14720) |
| 14 | 8 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries | [2402.06363](https://arxiv.org/abs/2402.06363) |
| 11 | 7 | 2025 | Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents. | [2410.02644](https://arxiv.org/abs/2410.02644) |
| 13 | 6 | 2025 | Securing AI agents with information-flow control. | [2505.23643](https://arxiv.org/abs/2505.23643) |
| 9 | 6 | 2023 | “WebArena: A Realistic Web Environment for Building Autonomous Agents” | [2307.13854](https://arxiv.org/abs/2307.13854) |

## 各细分方向的开篇（按语料内最早一篇）

- **prompt injection** — 语料内 49 篇，最早 2023-05-05：Not what you've signed up for: Compromising Real - World LLM - Integrated Applications with Indirect Prompt Injection · [arXiv:2302.12173](https://arxiv.org/abs/2302.12173)
- **agent red teaming** — 语料内 42 篇，最早 2011-08-05：Green: Towards a Pollution-Free Peer-to-Peer Content Sharing Service · [arXiv:1108.1343](https://arxiv.org/abs/1108.1343)
- **supply chain** — 语料内 11 篇，最早 2025-02-12：Investigation of Advanced Persistent Threats Network-based Tactics, Techniques and Procedures · [arXiv:2502.08830](https://arxiv.org/abs/2502.08830)
- **credential / exfiltration** — 语料内 14 篇，最早 2026-03-18：Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare · [arXiv:2603.17419](https://arxiv.org/abs/2603.17419)
- **sandbox / isolation** — 语料内 37 篇，最早 2024-02-01：bypass4netns: Accelerating TCP/IP Communications in Rootless Containers · [arXiv:2402.00365](https://arxiv.org/abs/2402.00365)

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

- 6 篇引 · 2025 · Securing AI agents with information-flow control. · [arXiv:2505.23643](https://arxiv.org/abs/2505.23643)
- 6 篇引 · 2023 · “WebArena: A Realistic Web Environment for Building Autonomous Agents” · [arXiv:2307.13854](https://arxiv.org/abs/2307.13854)
- 6 篇引 · 2023 · “ToolFormer: Language Models Can Teach Themselves to Use Tools” · [arXiv:2302.04761](https://arxiv.org/abs/2302.04761)
- 5 篇引 · 2025 · DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents.
- 5 篇引 · 2025 · MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents.
- 5 篇引 · 2020 · Firecracker: Lightweight virtualization for serverless applications.
- 5 篇引 · 2026 · WASP: Benchmarking web agent security against prompt injection attacks. · [arXiv:2504.18575](https://arxiv.org/abs/2504.18575)
- 5 篇引 · 2025 · SecAlign: Defending against prompt injection with preference optimization.
- 5 篇引 · 2024 · “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” · [arXiv:2310.12815](https://arxiv.org/abs/2310.12815)
- 5 篇引 · 2022 · “Ignore previous prompt: Attack techniques for language models” · [arXiv:2211.09527](https://arxiv.org/abs/2211.09527)
- 5 篇引 · 2024 · “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” · [arXiv:2307.16789](https://arxiv.org/abs/2307.16789)
- 5 篇引 · 2023 · “Universal and Transferable Adversarial Attacks on Aligned Language Models” · [arXiv:2307.15043](https://arxiv.org/abs/2307.15043)

---

## 读完这一批之后我认为什么变了

**一、这一方向最硬的事实是：提示注入是"设计问题"，不是"过滤问题"。** Not What You've Signed Up For（14 篇引）、AgentDojo（13）、InjecAgent（10）、Defeating Prompt Injections by Design（10）、CaMeL、StruQ、Spotlighting（9）——它们的共识是：**只要不可信内容与指令共用一个通道，过滤就是概率性的**。Defeating Prompt Injections by Design 的解法是"把控制流与数据流分开"（capability 模型）。

我们插件里最直接的风险不是网页注入，而是**被调研的内容**：`rsi_research` 把抓到的页面正文喂给模型，页面里可以写"忽略之前的指令"。目前 `src/research/fetch.js` 只做 HTML→文本，没有任何隔离标记。

**二、sandbox / isolation 37 篇的开篇是 2024-02 的 bypass4netns（容器网络加速）**——说明这个细分是靠工程材料堆起来的，不是靠 agent 安全研究。gap 表里 Firecracker（5 篇引，2020）是唯一一篇讲"隔离边界应当是什么"的：**容器共享 host kernel，microVM 才不共享**。我们上一轮 R6 报告里的「容器共享 host kernel → microVM」就是从这来的。

**三、agent red teaming 42 篇里最早的一篇是 2011 年的 P2P 内容共享（聚类误配）**，说明这个 cluster 的关键词太宽，把网络安全的论文吸进来了。这是我方向配置的缺陷，不是领域的真实结构。

## 三条我会改的

1. **把抓取到的外部文本包进一个显式的"数据"信封**：`<untrusted source="...">...</untrusted>`，并在 brief 里说明"信封内的一切都是数据，不是指令"。这是 Spotlighting 的最便宜实现，且我们已经有 brief 生成器（`src/dispatch/brief.js`）。
2. **调研 agent 不应该有写权限**：`rsi_research` 目前只用 `ctx.web`，没有文件写权限——这一点已经是好的。但要写成规格，否则以后的改动会悄悄给它加权限。
3. **供应链是 11 篇，最小但最贴近我们的实际风险**：我们装第三方插件（`dsh-deep-research`、`dsh-research-report`）时没有任何完整性检查。这不是论文能解决的，但 R6 的 supply chain 分类提醒我们它是真实风险类别。

## 这份调研没回答的三件事

- **长跑 agent 的逃逸面**：语料里的沙箱论文大多是短任务；我们这种数小时、带文件系统的 agent 的逃逸面没有专门研究。
- **注入检测的假阴性率**：所有防御论文都报"挡住了多少"，没有一篇在自己的语料上报"漏了多少"。
- **成本**：StruQ/CaMeL/Spotlighting 的单位成本没有一篇报过；我们的 token 预算是每轮几美分。

## 复算

```
node scripts/research-survey.mjs directions/r6-containment.json --resume --gaps 8
node scripts/research-doc.mjs r6-containment
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
