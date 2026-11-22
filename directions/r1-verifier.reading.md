## 读完这一批之后我认为什么变了

**一、"基石"表里排第一的东西不一定是思想源头。** DeepSeekMath 被 31 篇引，但它被引是因为凡是做 RL-for-reasoning 的论文都要拿它当 baseline 和训练配方，不是因为它提出了"验证器会被钻空子"。真正的思想源头排在后面：Concrete Problems in AI Safety（2016，15 篇）、Defining and characterizing reward gaming（2022，14 篇）、Scaling Laws for Reward Model Overoptimization（2023，22 篇）——最后这篇才是"优化器越用力、代理指标越失真"这条曲线的出处，也就是我们这个 gate 的数学祖先。读表的时候要把"工具型高频引用"和"概念型被引用"分开，否则会以为这个领域的起点是 2024 年。

**二、奖励黑客已经分成两代，第二代和我们的形状不一样。** 第一代是 Goodhart（代理指标失真），第二代是 2025–2026 的 "monitoring reasoning models ... risks of promoting obfuscation"（15 篇引）、ImpossibleBench（14）——它们问的不是"指标对不对"，而是"模型知道你在看它，于是学会在你看的地方表现"。这对我们很直接：我们的 gate 会读 attempt 的报告文本，而报告是 agent 自己写的。"被观察到就会改变行为"这一条，我们目前完全没有防线。

**三、"验证器设计"这个细分方向的开篇是 2026-01**（Understanding LLM-Driven Test Oracle Generation），比 reward hacking 晚一年半。也就是说：**在语料范围内，"怎么造验证器"作为独立课题比"验证器会坏"要新得多**。我们插件里 gate 的成熟度反而处在早期——这是好事，说明这块还有大量未被定式化的空间，也说明我上一轮那份 R1 报告引的"verification horizon"确实踩在时间点上。

**四、判官可靠性（41 篇）和基准有效性（44 篇）几乎是同一个体量，但我们的 gate 只处理前者。** judge reliability 关心"打分的人稳不稳"，benchmark validity 关心"这套题是否还在考它声称要考的东西"。我们的 `tests/` + `spec` 体系其实一直在做后者（红规格、元规格、pin 列表），但从没把它当成一个被研究过的问题来读。这一块可以吸收的东西比 judge 更多。

## 三条我会改的

1. **gate 的输入要区分"agent 自述"与"机器观测"。** 现在 `attempt.finished.report` 与 `verifier` 输出混在一份记录里，而且已经有一处**自述改变门禁**：`src/runtime/round.js:2439` 的 `claimedWork = Array.isArray(best?.report?.changed) && best.report.changed.length > 0`，只有 `checks.noop && !claimedWork` 才跳过 holdout——也就是说 agent 在报告里列一个文件名，就能让一个本该被 holdout 复查的空补丁跳过复查。这不是理论风险，是读代码就能指出的路径。把 report 标成 `selfReported: true`，并让任何"通过了"的判断只落在机器观测上——这是第二代奖励黑客文献的直接推论，成本很低。
2. **给 gate 加一条"被观察"提示的对照**：同一任务、同一模型，在 brief 里显式说"你的报告会被逐字核对"和不说，各跑一次，看分数是否变化。这是 ImpossibleBench 的做法，我们可以在自己的仪器上复现，只需要两轮的钱。
3. **把 benchmark validity 当成一个正式的检查维度**：不只问"这个 patch 通过了吗"，还问"这套验证器最近有没有变得更容易通过"——`docs/` 里其实已经有 `live-report` 的 `noop` 检查，可以扩成"同一任务的通过率随时间漂移"。

## 这份调研没回答的三件事

- **本语料外的经典**：Goodhart 的原始论述、Amodei 的 Concrete Problems 全文、DeepMind 的 specification gaming 清单（那篇是 blog 不是 arXiv）都不在表里。要做真正的"基石"，需要 OpenAlex/S2 的全领域被引数，这一轮额度用完了。
- **哪些防线在真实 agent 上被验证过**：表里的方法多是在 benchmark 上评的；我们这种"长跑、多轮、带文件系统"的 agent 上，哪一条真的挡住过，语料里没有答案。
- **成本**：所有"监控/审计"类方法都没报单位成本。我们的 gate 每轮只花几美分，任何需要第二个模型反复看的方案都可能比被防的风险更贵。
