# R3 预算与停止：评估预算、计算最优分配、何时停手

> 自动生成于 2026-11-22，来源 `research/out/r3-budget-stop.survey.json`。数字全部由脚本算出，结论段是人写的，两者用 `---` 分开。

## 这一轮读了什么

| 项 | 数量 |
| --- | --- |
| 成功查询 | 26 条（18 条手写 + 8 条回填；其中 1 条返回 0 结果）|
| 不同候选 | 724 |
| 保留候选 | 369 |
| 读通全文 | 50 篇（2 篇无可用 HTML） |
| 参考文献条目 | 1897 条引用 |
| 语料内被至少两篇引的工作 | 1113 个 |
| 达到基石门槛 | 145 |
| 被反复对比的基线 | 172 |
| 常引但本轮缺席 | 135 |

**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 26 | 60 | 2018 | “Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization”. | [1903.11059](https://arxiv.org/abs/1903.11059) |
| 23 | 40 | 2016 | “Non-stochastic Best Arm Identification and Hyperparameter Optimization”. | — |
| 20 | 57 | 2018 | “BOHB: Robust and Efficient Hyperparameter Optimization at Scale”. | [1807.01774](https://arxiv.org/abs/1807.01774) |
| 19 | 35 | 2011 | “Algorithms for Hyper-Parameter Optimization”. | — |
| 17 | 21 | 2012 | “Random Search for Hyper-Parameter Optimization”. | — |
| 16 | 36 | 2012 | “Practical bayesian optimization of machine learning algorithms,” | — |
| 15 | 20 | 2011 | “Sequential Model-Based Optimization for General Algorithm Configuration”. | — |
| 8 | 19 | 2014 | “Freeze-thaw bayesian optimization” | [1406.3896](https://arxiv.org/abs/1406.3896) |
| 8 | 18 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” | — |
| 7 | 14 | 2012 | “Multi-Task Bayesian Optimization”. | — |
| 7 | 6 | 1998 | “Efficient Global Optimization of Expensive Black-Box Functions” | — |
| 6 | 18 | 2017 | “Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets” | [1605.07079](https://arxiv.org/abs/1605.07079) |
| 6 | 18 | 2015 | “Efficient and Robust Automated Machine Learning” | — |
| 6 | 17 | 2015 | “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curves” | — |
| 6 | 10 | 2021 | “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 60 | 26 | 2018 | “Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization”. | [1903.11059](https://arxiv.org/abs/1903.11059) |
| 40 | 23 | 2016 | “Non-stochastic Best Arm Identification and Hyperparameter Optimization”. | — |
| 57 | 20 | 2018 | “BOHB: Robust and Efficient Hyperparameter Optimization at Scale”. | [1807.01774](https://arxiv.org/abs/1807.01774) |
| 35 | 19 | 2011 | “Algorithms for Hyper-Parameter Optimization”. | — |
| 21 | 17 | 2012 | “Random Search for Hyper-Parameter Optimization”. | — |
| 36 | 16 | 2012 | “Practical bayesian optimization of machine learning algorithms,” | — |
| 20 | 15 | 2011 | “Sequential Model-Based Optimization for General Algorithm Configuration”. | — |
| 19 | 8 | 2014 | “Freeze-thaw bayesian optimization” | [1406.3896](https://arxiv.org/abs/1406.3896) |
| 18 | 8 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” | — |
| 14 | 7 | 2012 | “Multi-Task Bayesian Optimization”. | — |

## 各细分方向的开篇（按语料内最早一篇）

- **early stopping / scheduling** — 语料内 68 篇，最早 2018-01-04：Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning · [arXiv:1801.01596](https://arxiv.org/abs/1801.01596)
- **compute-optimal allocation** — 语料内 58 篇，最早 2023-03-01：Fairness for Workers Who Pull the Arms: An Index Based Policy for Allocation of Restless Bandit Tasks · [arXiv:2303.00799](https://arxiv.org/abs/2303.00799)
- **bandits with cost** — 语料内 27 篇，最早 2019-01-12：Pure-Exploration for Infinite-Armed Bandits with General Arm Reservoirs · [arXiv:1811.06149](https://arxiv.org/abs/1811.06149)
- **accuracy-cost Pareto** — 语料内 9 篇，最早 2026-05-25：Dense2MoE: Pushing the Pareto Frontier of On-Device LLMs via Unified Pruning and Upcycling · [arXiv:2605.26496](https://arxiv.org/abs/2605.26496)
- **stopping criteria for agents** — 语料内 7 篇，最早 2026-04-07：Generate, Filter, Control, Replay: A Comprehensive Survey of Rollout Strategies for LLM Reinforcement Learning · [arXiv:2605.02913](https://arxiv.org/abs/2605.02913)

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

- 19 篇引 · 2011 · “Algorithms for Hyper-Parameter Optimization”.
- 17 篇引 · 2012 · “Random Search for Hyper-Parameter Optimization”.
- 16 篇引 · 2012 · “Practical bayesian optimization of machine learning algorithms,”
- 15 篇引 · 2011 · “Sequential Model-Based Optimization for General Algorithm Configuration”.
- 8 篇引 · 2013 · “Almost Optimal Exploration in Multi-Armed Bandits”
- 7 篇引 · 2012 · “Multi-Task Bayesian Optimization”.
- 7 篇引 · 1998 · “Efficient Global Optimization of Expensive Black-Box Functions”
- 6 篇引 · 2017 · “Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets” · [arXiv:1605.07079](https://arxiv.org/abs/1605.07079)
- 6 篇引 · 2015 · “Efficient and Robust Automated Machine Learning”
- 6 篇引 · 2015 · “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curves”
- 6 篇引 · 2021 · “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”.
- 6 篇引 · 2017 · Google vizier: A service for black-box optimization.

---

## 读完这一批之后我认为什么变了

**一、这一方向的"真源头"完全不在机器学习里，我的方向配置一开始就切错了。** 基石表前十全是超参搜索：Hyperband（26 篇引，60 次篇内引用）、Non-stochastic Best Arm Identification（23）、BOHB（20）、Random Search（17）、Practical Bayesian Optimization（16）、Sequential Model-Based Optimization（15）。真正该读的机制是 **successive halving**：Hyperband 的核心就是把"给每档配置的预算"当成资源分配，先用小预算淘汰大部分，再把预算集中给幸存者。我们插件里的 `src/runtime/halving.js` 就是它的一个特例——但我们的实现只在"候选数 > 1 且有 screen cmd"时生效，而且 screening 的成本被记为一次独立尝试。文献里这一条的关键约束是：**淘汰必须发生在"同一份预算刻度"上比较，否则小预算的观测不足以排序**。我们的 screen 是把候选扔给一个只读 prompt 的 agent，和完整尝试不在同一刻度上——这不是实现 bug，是设计上就没对齐文献的前提。

**二、"评估预算 vs 部署预算"这个区分（R3 上一轮已经读到的 2611.21515）在这里找到了它的祖先。** bandits with cost（27 篇）与 accuracy-cost Pareto（9 篇）是同一个问题的两个名字：**每次拉臂都要付钱，于是"该拉哪条臂"和"该花多少"是同一个决定**。我们账本里 470 个 round 只有 9 个做过 screening、总 screen 支出 $0.0750（占 0.7%），原因是大多数任务的 `screen.cmd` 是空的。也就是说，我们造了一个 successive halving 的实现，却没有把它接到有淘汰空间的地方。

**三、"何时停手"在文献里几乎都写成"停止规则"而不是"预算耗尽"。** early stopping / scheduling 68 篇、stopping criteria for agents 只有 7 篇且最早 2026-04——**agent 的停止判据是全新课题**。Hyperband 的答案（预算档位递减直至单臂）对一个能自我报告进度的 agent 不完全适用：我们的 round 有 `progress`（killRate 的连续读数），但没有任何代码用它决定"这一轮值不值得跑完"。

## 三条我会改的

1. **把 screening 与完整尝试放进同一个预算刻度**：screen 的输出应当只作为"排序依据"，而它的成本要计入同一档预算；当 screen 成本接近甚至超过一次完整尝试时（我们实测出现过 42k token 的 screen，比 0.6 分的一次完整尝试还贵），halving 的净收益为负——这正是上一轮实测的 21% 反噬。文献给的做法是**先估 screen 的相对成本，再决定档位宽度**，而不是无条件减半。
2. **把 `progress` 接进停止判据**：如果一轮的 `progress` 在第 k 步之后就再没动过，后半个 round 的支出应当被截断，而不是等墙钟。这是 Hyperband 的"早停"在 agent 上的对应物，且有账本可验证（470 个 round 里每个 attempt 都有 `progress`）。
3. **给 `halving` 一个显式的成本模型**：现在 `loopPolicy.halving` 是布尔值。文献里它是"名次 + 预算档"的函数。至少要让策略能表达"只有当 screen 成本 < 完整尝试的 1/3 时才减半"，否则开关打开就是赌。

## 这份调研没回答的三件事

- **在 agent 上，"预算刻度"是什么**：Hyperband 的档位是 epoch 数，agent 的档位可以是步数、token 数或墙钟——三者不等价，语料里没有对照实验。
- **好臂的早期信号长什么样**：Bradley-Terry 式的排序需要可比的分数，而我们的 attempt 分数在 killRate 任务上是连续的、在 binary 任务上是 0/1，混在一起排序会失真。
- **随机搜索基线**：Random Search 被 17 篇引，说明"复杂方法未必赢过随机"。我们从未跑过"随机选候选 vs 我们的定价"这个对照——这是最便宜、最该先做的实验，却没有做过。

## 复算

```
node scripts/research-survey.mjs directions/r3-budget-stop.json --resume --gaps 8
node scripts/research-doc.mjs r3-budget-stop
```

缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。
