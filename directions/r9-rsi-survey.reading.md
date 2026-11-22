## 读完这一批之后我认为什么变了

**一、这篇综述的贡献不是分类，是把"更新循环"当成比较单位。** 已有的几篇（Jiang 2026a 按 self→meta、Fang 2025a 按 what/when/how/where、Ren 2026 按 update operator）都在给系统排队；这一篇的 Figure 5 把 19 篇工作、20 条循环拆成同一张表：谁采集什么、谁评定、谁诊断、谁抽象、谁改、谁验证、谁保留，没做的写 NR。**一旦按这个粒度看，"某系统会自我改进"这句话就没有信息量了** —— A-MEM 的 E/D/V 三列全是 NR，ReasoningBank 也是，而 Self-Harness 和 AHE 的七列是填满的。这解释了一个我之前归因错了的现象：上一轮八个方向的 survey 里，"memory 类工作效果不稳定"其实不是记忆机制的问题，是这些循环里根本没有独立的验证阶段。

**二、"反馈触发了修订"与"这个修订值得保留"是两件事，而这正是我们 L1 的结构性缺口。** 综述反复回到这一点：ReasoningBank 的写入循环没有报告"逐条插入前单独测过"，AHE 是"下一轮看效果再决定保留或回退"（先使用后验证），Self-Harness 是唯一一个在合并前做回归的。我们 `src/chain/predict.js` 现在会算一个预测区间，`src/chain/measure.js` 会在采纳后记录 `chain.measured` —— 但只测**被采纳的那一个**。AHE 的 decision observability 是"每次编辑配一个自述预测，下一轮用任务级结果核验"，**包括被回退的那些**。我们回退的提案没有任何后续记录，于是"我们的预测准不准"这个问题只能靠采纳过的那几条回答，样本量比以为的小一个数量级。

**三、§10 的评估清单里，有三条我们一条都没做到，而且都是可验证的硬缺陷。** ①"候选选择集与最终测试集必须分开"——我们的 holdout 池参与晋升判断（`holdoutSlack`），所以它是选择集，不是测试集；综述点名 Self-Harness 有同样问题（held-out 分数参与选择），并因此拒绝把它当独立最终测试。②"必须在匹配的反馈与推理预算下与简单 test-time scaling 比较"——Rethinking the Evaluation of Harness Evolution（2607.12227）在 Terminal-Bench 2.1 上的结论是自动 harness 演化**打不过**简单 test-time scaling；我们的战役从来不设这个对照臂，只跟"上一版 chain"比，所以"我们的 loop 有用"这个说法缺少最便宜的替代解释。③"成本必须拆成更新成本与验证成本"——我们这一轮才刚给 screening 记上 `costUsd`，而提案成本（读 20 条摘要、写 spec diff）从来没有进账本。

**四、引用的年份分布本身就是一条证据：2026 年占 73/113（65%），2023 年及以前只有 12 条。** 这不是综述作者偷懒，是这个领域的真实形状——harness 这一族（26 条）里最早的也在 2026 年。**意味着我们 2026-11 做的设计，文献里没有"三年前就有人试过并放弃"的先例可查**；反过来说，任何"我们比文献做得细"的自信都缺少历史检验。相比之下 prompt 一族（OPRO 2023、APO 2023、Promptbreeder 2023、EvoPrompt 2023）有三年跨度的复现史，那一族的结论才更可信。

**五、被正文反复拿来对照的不是最著名的工作，是最"完整"的工作。** 括号引用次数前六：Self-Harness 5、Zep 5、AHE 4、MemSkill 4、GEPA 4、OPRO 4。Zep 之所以被反复提，是因为它是少数把"记忆的修订与退休"写清楚的系统（时序知识图谱 + 有效期），而不是因为效果最好。**这提示我们：文献的"重要性"由它填满了循环的哪几列决定，不是由 benchmark 分数决定。** 我们的 checkpoint 卡现在只报分数与花费，不报"这一步填的是七阶段里的哪一段"。

## 三条我会改的

1. **给被回退的提案也记一次测量。** `chain.proposed` 已经带 `prediction`；在 plateau 卡被 reject/hold 时，把当时的 `baseline` 存进 `state.chain.rejected`，下一轮用同一任务的结果记一条 `verdict:'not-applied-baseline'`。这样"预测 vs 现实"的样本从"采纳过的几条"变成"每一次提案"，而这正是 AHE 那张表能成立的原因。代价很小：reject 时账本已经有一条记录，只差一个 baseline 快照。
2. **把 holdout 从晋升判断里拿掉，或明确改名为 selection pool。** 现在的 `holdoutSlack` 让 holdout 分数参与 `decidePromotion`，于是它不能再被称作独立验证。两条路：要么加一个真正不参与任何决策的 final set（只在报告里出现一次），要么在文档与 `docs/l2-state.md` 里把它改名为 selection pool，并停止用它支撑"泛化"的说法。第二条便宜且诚实，第一条才解决问题。
3. **给每个战役加一个 test-time scaling 对照臂。** Rethinking 那篇的对照是"同样的预算，不用 harness 演化，只做任务级搜索/多次采样"。我们 `rsi_start` 已经有 `budgetRounds`/`budgetUsd`，可以在同一 workspace 上用同一预算跑一次 `candidates:3 + 不演化` 的战役，把它的最终分数作为"这个 loop 到底值不值"的分母。没有这个分母，`docs/l2-state.md` 里所有"提升"都只是相对上一版 chain。

## 这份调研没回答的三件事

- **harness 演化的增益到底能不能跨模型族留住。** AHE 说冻结后跨族 +5.1~+10.1pp，Self-Harness 说 9 个组合里 held-in/held-out 都涨，Rethinking 说打不过 test-time scaling。三篇的差别在预算与评测设置，而综述没有（也没法）把它们放到同一把尺子上。**我们要在自己的账本里回答这个问题，只能自己做对照臂。**
- **"什么值得评估"这一层没有机制。** Mingguang Chen 那篇把研究方向设定的瓶颈分成"可被验证层级索引的"与"索引不到的"，后者（什么值得评估）它明确说没有解法；这篇综述的七个阶段也没有一列对应它。我们的 evalset 是人写的、固定的，所以这个瓶颈在我们这里被"外部化"了——但也就意味着 loop 永远不会提出"该换一组任务"。
- **经验注入的安全面没有任何量化。** Skill-Inject 报 80% 攻击成功率，SkillGuard-Robust 做加载前三分类审计，但两者都不谈"我们的经验库被自己的 loop 写脏之后会怎样"。我们 `knowledge.json` 现在 63 条 lesson（其中 16 条就是这一轮从这篇综述核验出来的结论里 sink 进去的），全部由 `sink` 写入、全部会进 prompt（`knowledge.maxShown: 3`），**没有一条经过对抗性检查**。这不是这篇综述的漏洞，是它指出来的、我们没做的事。


## 这一轮的证据落在哪

以上判断里能在字节上核验的部分，都已经进了研究账本，不是只在这份文档里：

- **18 条 claim 逐字核验通过**（`seal` 前缀 `r9-rsi-survey-structure-1795365934176`，seal `016589fa84faccbbb11567c3ac669be9ccb4d049570133de3df008b8798209b2`）。每条都绑定一个自己抓的快照：综述全文（`ev-16f93ca4d878`，138,090 字节，sha256 `16f93ca4d8…`）与六篇关键论文的 arXiv 摘要页（`ev-5ee7edb53bc3` AHE、`ev-3d87926a214f` Self-Harness、`ev-332bf644afb9` Rethinking、`ev-9700e5d36556` RRSI、`ev-852d40b2bf37` VERSE、`ev-7b7ba0d02b0c` ModularRSI）。
- **16 条 lesson 进了知识库**（47 → 63）。每条都带 `notWhen` 边界——这是 `src/research/sink.js:129` 的硬要求：没有边界的事实就是过度概括的规则。边界本身是我写的判断，所以它也会错，但它写在库里，能被下一轮的人改。
- **3 条未答问题进了台账**（`q-12d4bc459434` 跨模型族是否留住增益、`q-753e482b7e1d` loop 何时能提议换任务集、`q-599051419655` 一条 lesson 到底改变了什么提案）。它们的 `closedBy` 是可执行的动作，不是"进一步研究"。

复算方式：账本用 `scripts/research-replay.mjs` 重新推导每一份报告的 seal 与每个证据 blob 的哈希（`10/10 seal(s) ok` 这类输出），不需要重新联网；引用表用 `scripts/research-cites.mjs` 重新从同一份文本算，哈希对得上才说明是同一个版本。
