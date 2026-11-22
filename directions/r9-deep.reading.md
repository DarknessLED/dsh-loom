## 读完这十个正文之后，我认为什么变了

**1. "给每次改动配一个预测"这件事，我原来只做对了一半。**
AHE 的 §3.3 写得很具体：每次改动附一份 manifest，写明失败证据、推断的根因、目标修复，以及**预期修复与预期回归两类**影响；下一轮把这两份集合与观测到的任务级 delta 求交，给每个改动一个裁决。这套东西我们 `src/chain/predict.js` 有预测、`src/chain/measure.js` 有核验，但只对**被采纳**的那一版做核验（`chain.activated` 之后才有 `pending`）。AHE 的裁决发生在**下一轮开始前**，被回退的改动同样进账本。差别不是措辞：我们的 loophole 是"猜错就没人再看"，他们的是"猜错就是一条记录"。
更能说明问题的是 AHE 自己的 §1 第三条限制：*self-attribution is reliable for fixes but blind to regressions*。也就是说连做对了预测的团队，回归侧仍然是瞎的——而回归恰恰是我们 `regressionRisk` 唯一输出高等级的那一类。

**2. 单次观测的分数不能用来做决定，这不是理论问题。**
AHE §3.3 的算法里有一句我原来会跳过的细节：`k ≥ 2` 次 rollout 每个任务，理由是"让每个任务带一个 pass-rate 信号"，并且让部分通过的任务能参与比较诊断。我们 `src/runtime/round.js` 每个任务一次、`decidePromotion` 比的是单点分数；`docs/l2-state.md` 里那两场 halving 对比（$0.035567 vs $0.029309）差的量级（约 21%）正好落在 R2 那篇量到的 run-to-run 波动区间（2.2–6.0 个点）附近。**同一份代码，换一次 run 就可能翻过来**——这一点现在有正文依据，不再只是我从摘要推的。

**3. 我们缺的不是"更聪明的提案"，是"一个不参与选择的最终测试集"。**
Self-Harness §3.4 把候选改动当成一个新的 harness 变体，在当前与候选上同时跑 held-in 和 held-out，两个 split 都不许掉；§5 的结论句是"在 acceptance rule 下保持 held-in 与 held-out 表现"。我们的 `holdoutSlack = 0.02` 让 holdout **参与**晋升判断，所以它不是测试集，是第二个选择集。综述 §10 那句 *Candidate selection and final evaluation should be distinguished* 现在有了具体的失败方式：当 holdout 也成为选择依据，任何"在 holdout 上变好"的结论都退化成"我们优化了它"。

**4. "让优化器改自己"单独做没有用，必须先给它执行验证。**
VERSE §1 给了一个反面实验：把自演化加进 Meta-Harness 之后，优化器把自己的**未经验证的教训**写进 harness，之后没有任何一轮在 validation 上超过初始 harness。他们加的是什么？三个验证工具（跑草稿、重放失败、改单步看是否复现），以及 §4.4 那个刺眼的数字：优化器声称要修的失败任务里，**十个只有一个**在下一轮真的通过；170 次草稿评估里只有 17 次找到了它声称要修的失败任务。我们有 `rsi_lean`、有 guard、有 oracle，但**没有任何一步在提案提交前跑一次**——提案是"读日志后写下的判断"，和 Meta-Harness 里被写坏的教训是同一种东西。

**5. 我原以为"技能应该越攒越多"，SLIM 说不是。**
SLIM §4.3 的 retire 条件是**两个**同时成立：累计曝光次数足够，且低贡献连续出现足够长；理由是保护低频技能不被过早删除。我们的 `knowledge.json` 63 条 lesson 只进不出，`quarantineHarm` 是"有害才隔离"，没有"贡献已经归零就退休"的路径。这解释了为什么 R4 那轮看到 24 条 research lesson 全部带 `notWhen`、23 条 loop 自归纳的全都没有——**没有边界就没有退休判断的依据**。

**6. 分模块演化不是工程洁癖，是信用分配的单位。**
ModularRSI §1 把可演化 harness 拆成五个功能模块（Agent Loop / Tool Use / Observation Management / Context Management / Task Completion Detection），每个模块在受限范围内独立演化，再做跨模块集成；理由是"机制级信用分配"。我们的 L1 链是整条链一起换（`mutateChain` 一次动一个参数，但没有模块边界的概念），R7 那轮已经量到"evaluator overfitting 与 diversity collapse 是两个病、我们只有一个 plateau 触发器"。**一个触发器、一条链，无法表达"这个模块坏了那个没坏"。**

## 三条我会改的

1. **被测回退也要留测量。** 现在只有 `chain.activated` 之后才有 `pending`；改成提案时就写下 baseline 与预测，下一轮无论采纳与否都记一条 `chain.measured`（裁决为 `not-applied` 也算）。这条改动最小、收益最直接：它把"猜错"从沉默变成数据。
2. **holdout 改名，或者加一个真正的最终集。** 最省的做法是把现有 holdout 明确叫 selection pool，并在 `decidePromotion` 之外留一个只在提审时跑一次的 final set；更省的做法是先把这个名字改对，让读代码的人不会误以为它已经是测试集。
3. **提案提交前跑一次。** 至少对 `candidates+1` 这一类，在 dispatch 之前用一次真实 short-run 验证"多一个候选这轮能不能跑起来"，把失败记成 `proposal-unverified`。VERSE 的数字说明这一步不是保险，是主要增益来源。

## 这份调研没回答的三件事

1. **`k ≥ 2` 的代价谁来付。** 两篇都建议多次 rollout 换取 pass-rate 信号，但都把成本写在"evaluation budget"里不再讨论；我们每轮是真实计费的（`docs/l2-state.md` 记着 $10.29 的累计支出），多一次 rollout 就是多一倍。没有一篇给出"什么时候不值得"的判据。
2. **AHE 的"回归预见"到底怎么做。** 它自己承认 blind to regressions，把回归预见列为"clearest direction"，但正文里没有给出方法。我们能做的最多是 `regressionRisk` 的历史分位数，这和"预见"是两件事。
3. **中文语境下的 harness 演化没有对照。** 这十篇的 benchmark 全是 Terminal-Bench / SWE-bench / AppWorld / ALFWorld，我们的战役对象是"改自己仓库里的代码并通过自己的测试"。**我们的评测器和被评测对象是同一个仓库**，这在上面的任何一篇文章里都不存在，所以它们关于 held-out 的结论不能直接搬过来。

---
_以上引文全部取自各论文 arXiv HTML5 正文，可由 `scripts/research-deepread.mjs` 重跑复算；每条 claim 都带 `§` 章节 locator 与段落锚点，已逐字核验（60/60 verified）。判断段（本节）是我的推断，不是论文主张。_
