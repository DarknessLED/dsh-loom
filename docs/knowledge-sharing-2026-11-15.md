# 跨领域知识：总结、搜索、共享、触发灵感、dream 的设计

日期：2026-11-15 · 相关提交：本次 `feat(knowledge)`（见 `git log`）

> **修正（同日）**：下面的"五个动作"是一个提法，不是架构——它混了数据操作、展示策略、认知事件和维护任务，
> 照着实现会得到五个互不相连的模块。按"证据链"重做的模型、文献依据和取舍见
> [transfer-unit-2026-11-15.md](transfer-unit-2026-11-15.md)。本文保留作当时的记录，其中
> `cross.js` 目前没有生产调用者，`dream.js` 只在状态页展示，不要据此认为跨域层已经生效。


## 1. 现在的问题

`src/knowledge/select.js` 的 `selectLessons` 只在**同家族/同任务/同标签**时把一条经验给 worker 看。
这解决的是"同一类任务不要再犯同一个错"，但恰好丢掉了人做研究时最有价值的部分：
**另一个领域的机制，可能解释这里的困难。**

而经验本身已经有了不错的底子：`deriveLesson` 把晋升尝试转成一句 claim，`pairedImpacts` 用同轮对照
给它计分，`shouldQuarantine` 隔离有害经验，`pruneLessons` 退休过期条目。缺的不是"记录"，是
**跨域检索、灵感转化和离线巩固**。

## 2. 五个动作，各自回答什么

| 动作 | 回答的问题 | 单位 | 落地位置 |
|---|---|---|---|
| 总结 summarize | 这次到底学到了什么，能一句话说清吗？ | claim + evidence + scope + signature | `deriveLesson`（已有） |
| 搜索 search | 以前有没有人遇到过同样的困难？ | 三视角：领域 / 标签 / 困难形状 | `cross.js` + `select.js` |
| 共享 share | 这条经验能不能给别人用？以什么身份给？ | 建议 vs 灵感 | `cross.js`（本次） |
| 触发灵感 inspire | 别的领域怎么解这个困难，我们能不能借？ | 类比 + 可证伪假设 | 本文档 + 问题台账（下一步） |
| dream | 这些经验里哪些其实是同一条、哪些互相矛盾？ | 合并 / 矛盾问题 / 退休 | `dream.js`（本次） |

## 3. 关键设计：建议与灵感必须分开

这是整套设计里最重要的一条，来自 BadScientist(2510.18003) 的教训：**验证栈会给出高分但不成立的结论**。
一条在文档领域成立的经验，直接当指令搬到代码领域，就是把"别处的证据"当"这里的证据"。

所以 `transferRoute(lesson, target)` 只返回两种可用状态：

- **direct（建议）**：同家族、同任务或同标签。`advice: true`，可以进 brief。
- **analogy（灵感）**：领域不同，但共享 `signature`（困难形状，如 `cheap-filter`、`noisy-verifier`、
  `proxy-metric`）。`advice: false`，**永不进 brief 当指令**；它只能变成一条待验证的假设。

没有共享形状就是 `none`，不展示。`findAnalogies` 只返回跨域项，按 Jaccard 分数排序。

困难形状是这套设计的杠杆：它是领域无关的。两个任务可以一个在编译器、一个在文档，
但都"评估很贵、代理指标可被利用"，这时`screen cheaply first`才是可迁移的。

## 4. dream：不是"再想一遍"，是做四件确定性的事

`consolidate(lessons, {round, threshold})`：

1. **合并近似重复**：同家族、claim 词集 Jaccard ≥ 0.8 的条目并成一条，保留 `mergedFrom` 与累计
   `useCount/gainSum/harmCount`。同一机制被两次发现，应该增强证据，而不是占两个位置。
2. **退休**：TTL 过期或非 active 的条目进 `retired`，不静默留在树里。
3. **提取矛盾**：同 `subject` 上一条说"raise/improve"、另一条说"lower/degrade"，产出一条
   `contradiction` 问题（不是自动选一边）。矛盾是研究问题，不是数据错误。
4. **确定性**：排序固定，同样输入两次调用结果逐字节相同（有 spec 钉住）。

Dream 的"灵光"不来自随机组合，而来自**把矛盾摆到桌面上**；真正的新假设是下一步研究循环的事。

## 5. 搜索与配额：灵感要限量

- 检索三视角：`family`（领域）、`tags`（方法）、`signature`（困难形状）。
- 排序：`direct` 按 `select.js` 的评分（置信度 + 增益 - 伤害 - 陈旧）；`analogy` 按形状 Jaccard。
- 配额：建议每轮 ≤3（沿用 `knowledge.maxShown`）；**灵感每轮 ≤1**，且只出现在"探索/停滞"阶段，
  不出现在修复阶段——灵感是噪声，修复需要确定性。
- 幻觉防线：每条灵感必须带 `from`（来源领域）、`reasons`（为什么形状相同）、来源 id；
  没有这三样就不展示。

## 6. 与既有机制的咬合

- **pairedImpacts**：灵感一旦被采纳并产生一次尝试，它和普通经验一样接受同轮对照计分；
  被证伪的类比会自然降权/隔离。
- **decisions.json**：矛盾问题与研究结论应写入同一个 ledger，避免"调研一套、循环一套"。
- **rsi_status**：状态页现在会打印 `knowledge: N lesson(s), M merged, K retired, open question: ...`，
  矛盾不会被埋进文件里。

## 7. 本次已落地 / 未落地

已落地（有 8 条 spec，`tests/self24/cross-domain.test.mjs`，已进 standing 列表）：

- `src/knowledge/cross.js`：`transferRoute`、`findAnalogies`。
- `src/knowledge/dream.js`：`consolidate`（合并/退休/矛盾/确定性）。
- `rsi_status` 暴露知识摘要与最尖锐的一条开放问题。

未落地（按优先级）：

1. **signature 自动生成**：现在靠人工标注；应从失败轨迹抽"困难形状"（改测试/仅注释/超时/验证器抖动）。
2. **问题台账持久化**：矛盾问题现在只出现在 status 文本里，需要 `research/questions.json` 与状态流转。
3. **跨 campaign 存储**：`lessons` 仍在单个 campaign 的 state 内，跨战役共享要抽到 loom home 的全局树。
4. **灵感到假设的闭环**：`findAnalogies` 的结果还没有"生成假设 → 设计实验 → 回填结论"的通道。
5. **dream 的预算**：离线巩固应作为 campaign 结束时的可选步骤，带 token 上限，而不是每次 status 全量算。

## 8. 验收标准（下一轮）

- 一条来自不同家族、共享 `signature` 的经验，能进入 `findAnalogies`，且**不会**出现在任何 brief 里；
- 两条极性相反的 active 经验，在 `rsi_status` 里能看到一条 contradiction 问题；
- 合并后的经验 `mergedFrom` 可追溯，`gainSum` 等于各部分之和；
- `tests/self24/cross-domain.test.mjs` 与全量 228+ 套件保持绿色。
