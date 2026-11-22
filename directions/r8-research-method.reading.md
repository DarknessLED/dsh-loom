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
