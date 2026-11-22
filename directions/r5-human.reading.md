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
