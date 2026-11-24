# Eight literatures, one corpus: what the directions share

Generated 2026-11-25 by `scripts/research-synthesis.mjs`. Every number below is recomputed from
`research/out/*.survey.json`; the prose after the rule is written by hand.

## How to read this

- A work is "shared" because several corpora cite it. That is evidence that independent
  searches converged on the same prior. It is **not** evidence the work is right.
- "Cited by N directions" counts directions whose corpus cites the work at least once,
  not how many times, so a single passing mention and a load-bearing citation look alike
  in that column. The per-direction strength is in the table.
- The ideas/infrastructure split is a title heuristic, not a human judgement: a title
  that reads like a model report, an optimiser or a benchmark counts as substrate.
  It will misclassify a few works, which is why both tables are printed in full.

## Scale

| quantity | value |
| --- | --- |
| directions | 9 |
| distinct works cited by ≥1 direction | 3314 |
| cited by ≥9 directions | 3 |
| cited by ≥8 directions | 2 |
| cited by ≥7 directions | 3 |
| cited by ≥6 directions | 5 |
| cited by ≥5 directions | 17 |
| cited by ≥4 directions | 23 |
| cited by ≥3 directions | 65 |
| cited by ≥2 directions | 317 |

## The same prior in several places

A work shared by several directions is shared either because they argue about the same
idea, or because they all point the same model at the same benchmark. The two tables
below keep those apart: the first is a fact about agents, the second is a fact about
the field's tooling.

### Shared ideas

| work | year | directions | cites |
| --- | --- | --- | --- |
| DeepSeekMath: Pushing the limits of mathematical reasoning in open language models. (`2402.03300`) | 2024 | 9 | verifier 26, score-noise 9, budget-stop 2, knowledge 4, human 2, containment 1, selfmod 2, research-method 2, eval-budget 1 |
| Training verifiers to solve math word problems. (`2110.14168`) | 2021 | 8 | verifier 7, score-noise 8, budget-stop 4, knowledge 3, human 3, selfmod 1, research-method 1, eval-budget 7 |
| ReAct: Synergizing reasoning and acting in language models. (`2210.03629`) | 2023 | 7 | verifier 10, budget-stop 4, knowledge 24, containment 9, selfmod 3, research-method 14, eval-budget 3 |
| Scaling laws for neural language models. (`2001.08361`) | 2020 | 7 | verifier 1, score-noise 1, budget-stop 1, knowledge 1, human 3, selfmod 1, eval-budget 1 |
| Evaluating large language models trained on code. (`2107.03374`) | 2021 | 6 | verifier 11, score-noise 11, knowledge 6, selfmod 3, research-method 2, eval-budget 1 |
| AlphaEvolve: A coding agent for scientific and algorithmic discovery. (`2506.13131`) | 2025 | 6 | verifier 4, score-noise 1, budget-stop 3, selfmod 10, research-method 1, eval-budget 1 |
| The ai scientist: Towards fully automated open-ended scientific discovery. (`2408.06292`) | 2024 | 6 | verifier 2, budget-stop 1, human 1, selfmod 2, research-method 2, eval-budget 1 |
| Program synthesis with large language models. (`2108.07732`) | 2021 | 5 | verifier 8, score-noise 4, knowledge 3, selfmod 1, eval-budget 1 |
| Webgpt: Browser-assisted question-answering with human feedback. (`2112.09332`) | 2021 | 5 | score-noise 2, budget-stop 1, knowledge 2, containment 2, research-method 7 |
| Universal and transferable adversarial attacks on aligned language models (`2307.15043`) | 2023 | 5 | score-noise 2, containment 5, selfmod 3, research-method 2, eval-budget 1 |
| AI agents that matter (`2407.01502`) | 2024 | 5 | verifier 1, score-noise 1, human 1, selfmod 1, research-method 1 |
| Agent workflow memory. (`2409.07429`) | 2024 | 4 | verifier 1, knowledge 17, selfmod 1, eval-budget 1 |
| Constitutional ai: Harmlessness from ai feedback. (`2212.08073`) | 2022 | 4 | verifier 6, score-noise 2, budget-stop 2, human 9 |
| Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback. (`2204.05862`) | 2022 | 4 | verifier 3, score-noise 2, human 6, containment 1 |
| Tree of thoughts: Deliberate problem solving with large language models. (`2305.10601`) | 2023 | 4 | verifier 5, knowledge 4, research-method 2, eval-budget 1 |
| GEPA: Reflective prompt evolution can outperform reinforcement learning. (`2507.19457`) | 2025 | 4 | verifier 2, budget-stop 4, selfmod 2, eval-budget 4 |
| Think you have solved question answering? try arc, the ai2 reasoning challenge. (`1803.05457`) | 2018 | 4 | score-noise 3, budget-stop 3, human 1, eval-budget 2 |
| Adding error bars to evals: A statistical approach to language model evaluations. (`2411.00640`) | 2024 | 4 | verifier 1, score-noise 5, selfmod 1, eval-budget 2 |
| Qwen3 embedding: advancing text embedding and reranking through foundation models (`2506.05176`) | 2025 | 4 | verifier 1, score-noise 1, knowledge 4, research-method 2 |
| A survey of self-evolving agents: On path to artificial super intelligence. (`2507.21046`) | 2025 | 4 | verifier 1, knowledge 5, selfmod 1, eval-budget 1 |
| Do as i can, not as i say: Grounding language in robotic affordances. (`2204.01691`) | 2022 | 4 | verifier 1, knowledge 4, selfmod 1, eval-budget 1 |
| On the opportunities and risks of foundation models (`2108.07258`) | 2021 | 4 | score-noise 1, human 2, selfmod 1, research-method 1 |
| Red teaming language models to reduce harms: Methods, scaling behaviors, and lessons learned. (`2209.07858`) | 2022 | 4 | verifier 1, human 2, selfmod 1, eval-budget 1 |
| Scaling LLM test-time compute optimally can be more effective than scaling model parameters. (`2408.03314`) | 2024 | 4 | verifier 2, score-noise 1, budget-stop 1, research-method 1 |
| Agent-safetybench: evaluating the safety of llm agents (`2412.14470`) | 2024 | 4 | verifier 1, score-noise 1, human 1, containment 2 |
| Let’s verify step by step. (`2305.20050`) | 2024 | 3 | verifier 17, score-noise 6, human 6 |
| Training language models to follow instructions with human feedback. (`2203.02155`) | 2022 | 3 | verifier 14, score-noise 11, selfmod 2 |
| Voyager: An Open-Ended Embodied Agent with Large Language Models. (`2305.16291`) | 2023 | 3 | knowledge 23, selfmod 2, eval-budget 2 |
| Concrete problems in AI safety. (`1606.06565`) | 2016 | 3 | verifier 13, human 8, eval-budget 1 |
| Toolformer: Language models can teach themselves to use tools. (`2302.04761`) | 2023 | 3 | verifier 5, knowledge 9, research-method 8 |

### Shared infrastructure

| work | year | directions | cites |
| --- | --- | --- | --- |
| Qwen3 technical report. (`2505.09388`) | 2025 | 9 | verifier 12, score-noise 6, budget-stop 2, knowledge 10, human 4, containment 6, selfmod 4, research-method 4, eval-budget 4 |
| The LLaMa 3 herd of models. (`2407.21783`) | 2024 | 9 | verifier 2, score-noise 8, budget-stop 5, knowledge 4, human 6, containment 4, selfmod 2, research-method 1, eval-budget 2 |
| Qwen2.5 technical report. (`2412.15115`) | 2025 | 8 | verifier 3, score-noise 5, budget-stop 1, human 3, containment 1, selfmod 2, research-method 3, eval-budget 2 |
| GPT-4 technical report. (`2303.08774`) | 2023 | 7 | verifier 4, score-noise 3, knowledge 4, human 5, selfmod 2, research-method 1, eval-budget 2 |
| Proximal policy optimization algorithms. (`1707.06347`) | 2017 | 6 | verifier 7, score-noise 7, budget-stop 1, knowledge 3, human 2, selfmod 3 |
| LoRA: Low-rank adaptation of large language models. (`2106.09685`) | 2021 | 6 | verifier 2, score-noise 8, knowledge 5, selfmod 1, research-method 5, eval-budget 1 |
| Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. (`2501.12948`) | 2025 | 5 | verifier 11, score-noise 5, knowledge 1, human 2, eval-budget 2 |
| Webarena: A realistic web environment for building autonomous agents. (`2307.13854`) | 2024 | 5 | verifier 3, score-noise 3, containment 4, research-method 5, eval-budget 3 |
| τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. (`2406.12045`) | 2024 | 5 | verifier 7, score-noise 5, knowledge 1, research-method 1, eval-budget 4 |
| Deepseek-v4: Towards highly efficient million-token context intelligence. (`2606.19348`) | 2026 | 5 | verifier 9, budget-stop 1, knowledge 2, selfmod 1, research-method 1 |
| Gpt-4o system card. (`2410.21276`) | 2024 | 5 | verifier 1, score-noise 2, knowledge 4, human 3, eval-budget 2 |
| gpt-oss-120b & gpt-oss-20b model card. (`2508.10925`) | 2025 | 5 | verifier 4, score-noise 3, budget-stop 1, knowledge 2, research-method 2 |
| Glm-5: from vibe coding to agentic engineering. (`2602.15763`) | 2026 | 5 | verifier 5, score-noise 1, knowledge 2, research-method 1, eval-budget 1 |
| Mistral 7b. (`2310.06825`) | 2023 | 5 | verifier 1, score-noise 3, budget-stop 2, knowledge 1, human 1 |
| Gemini: a family of highly capable multimodal models (`2312.11805`) | 2023 | 5 | budget-stop 1, human 2, containment 1, research-method 2, eval-budget 2 |
| Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities. (`2507.06261`) | 2025 | 5 | verifier 1, score-noise 2, knowledge 2, selfmod 2, research-method 1 |
| Kimi k2. 5: Visual agentic intelligence. (`2602.02276`) | 2026 | 5 | verifier 3, score-noise 1, knowledge 2, containment 1, research-method 1 |
| Gemma 4 technical report. (`2607.02770`) | 2026 | 5 | verifier 2, score-noise 1, containment 2, research-method 1, eval-budget 1 |
| OpenAI gpt-5 system card (`2601.03267`) | 2025 | 5 | verifier 2, score-noise 1, knowledge 1, selfmod 1, eval-budget 1 |
| Measuring massive multitask language understanding. (`2009.03300`) | 2021 | 4 | verifier 3, score-noise 6, human 1, eval-budget 3 |

## Which directions are the same direction

Overlap between each pair's 20 most-cited works.

| pair | shared of top-20 |
| --- | --- |
| verifier × score-noise | 7 |
| knowledge × research-method | 4 |
| eval-budget × score-noise | 4 |
| eval-budget × selfmod | 4 |
| verifier × knowledge | 3 |
| verifier × selfmod | 3 |
| score-noise × human | 3 |
| score-noise × selfmod | 3 |
| knowledge × selfmod | 3 |
| eval-budget × budget-stop | 3 |
| eval-budget × research-method | 3 |
| verifier × human | 2 |
| verifier × research-method | 2 |
| verifier × eval-budget | 2 |
| score-noise × budget-stop | 2 |
| score-noise × knowledge | 2 |
| score-noise × research-method | 2 |
| budget-stop × selfmod | 2 |
| selfmod × research-method | 2 |
| eval-budget × knowledge | 2 |
| verifier × budget-stop | 1 |
| verifier × containment | 1 |
| budget-stop × knowledge | 1 |
| budget-stop × human | 1 |
| budget-stop × containment | 1 |
| budget-stop × research-method | 1 |
| knowledge × containment | 1 |
| containment × selfmod | 1 |
| containment × research-method | 1 |
| eval-budget × containment | 1 |
| score-noise × containment | 0 |
| knowledge × human | 0 |
| human × containment | 0 |
| human × selfmod | 0 |
| human × research-method | 0 |
| eval-budget × human | 0 |

### The same question asked over the whole corpus

The table above cuts each direction to its most-cited works. That cut can flip the
answer, because the works a direction cites *most* are the shared substrate everyone
cites, not the works it argues with. Below is the same question asked over every work
each direction cites, as Jaccard overlap. Neither number is the field; the two are a
statement about how much the answer depends on where we cut.

| pair | shared | of A | of B | Jaccard |
| --- | --- | --- | --- | --- |
| score-noise × research-method | 116 | 467 | 451 | 0.145 |
| score-noise × eval-budget | 47 | 467 | 352 | 0.061 |
| verifier × score-noise | 72 | 863 | 467 | 0.057 |
| verifier × research-method | 64 | 863 | 451 | 0.051 |
| verifier × knowledge | 64 | 863 | 549 | 0.047 |
| knowledge × research-method | 45 | 549 | 451 | 0.047 |
| verifier × selfmod | 50 | 863 | 355 | 0.043 |
| budget-stop × selfmod | 22 | 191 | 355 | 0.042 |
| selfmod × eval-budget | 28 | 355 | 352 | 0.041 |
| verifier × human | 53 | 863 | 508 | 0.040 |
| score-noise × human | 37 | 467 | 508 | 0.039 |
| knowledge × eval-budget | 34 | 549 | 352 | 0.039 |

**Nearest neighbour under both cuts.** 7 of 9 directions change neighbour when the cut moves:

| direction | nearest by top-20 | nearest by whole corpus | same |
| --- | --- | --- | --- |
| verifier | score-noise | score-noise | yes |
| score-noise | verifier | research-method | no |
| budget-stop | eval-budget | selfmod | no |
| knowledge | research-method | verifier | no |
| human | score-noise | verifier | no |
| containment | verifier | research-method | no |
| selfmod | eval-budget | verifier | no |
| research-method | knowledge | score-noise | no |
| eval-budget | score-noise | score-noise | yes |

## How old each direction is

Median publication year of the works each direction cites, and the share of them from
the agent era. A direction whose median citation predates that era is not behind; it is
importing a method from another field, and the two cases ask for different reading.

| direction | cited | with a year | median year | 2025 or newer | before 2023 |
| --- | --- | --- | --- | --- | --- |
| r1-verifier | 863 | 861 | 2025 | 69% | 10% |
| r10-eval-budget | 352 | 351 | 2025 | 60% | 18% |
| r2-score-noise | 467 | 457 | 2025 | 52% | 19% |
| r4-knowledge | 549 | 548 | 2025 | 74% | 8% |
| r6-containment | 243 | 243 | 2025 | 69% | 4% |
| r7-selfmod | 355 | 353 | 2025 | 54% | 19% |
| r8-research-method | 451 | 449 | 2025 | 70% | 7% |
| r3-budget-stop | 191 | 188 | 2024 | 39% | 42% |
| r5-human | 508 | 506 | 2024 | 30% | 24% |

## Cited by many, read by none

| work | year | directions |
| --- | --- | --- |
| Gemma 4 technical report. (`2607.02770`) | 2026 | 5 |
| Think you have solved question answering? try arc, the ai2 reasoning challenge. (`1803.05457`) | 2018 | 4 |
| Qwen2.5-Coder technical report. (`2409.12186`) | 2024 | 4 |
| On the opportunities and risks of foundation models (`2108.07258`) | 2021 | 4 |
| Red teaming language models to reduce harms: Methods, scaling behaviors, and lessons learned. (`2209.07858`) | 2022 | 4 |
| Agent-safetybench: evaluating the safety of llm agents (`2412.14470`) | 2024 | 4 |

## How much of each direction we have actually read

Of each direction’s most-cited works, how many have a body note in the ledger yet.

| direction | read | of top |
| --- | --- | --- |
| r1-verifier | 34 | 40 |
| r2-score-noise | 33 | 40 |
| r3-budget-stop | 32 | 40 |
| r4-knowledge | 29 | 40 |
| r5-human | 27 | 40 |
| r6-containment | 27 | 40 |
| r7-selfmod | 31 | 40 |
| r8-research-method | 26 | 40 |
| r10-eval-budget | 28 | 40 |

---

# 八份阅读放在一起时

写完之后我把八份判断段并排读了一遍。单独读每一份，得到的都是"这个方向缺什么"；并排读，得到的是"这几句话其实是同一句话"，以及"这两个方向不能同时为真"。下面是我认为站得住的、以及我认为会错的地方都被标出来的那部分。

## 一、同一个机制被四个方向各起了一个名字

把八份判断段里"我认为什么变了"全部摊开，有一条论断以四种措辞出现了至少四次：

- R1 叫它 reward hacking。`2210.10760` §4.2.1 把机制写成优化力在金奖励与噪声之间的分配，`2510.20270` §7 补上行为证据：任务一旦不可能，前沿模型更爱作弊，而且越强越爱。
- R2 叫它方差。`2411.00640` §1 说行业惯例是"最高者最优"，`2107.03374` §2.1 承认朴素 pass@k 方差很大，`2403.04132` §5 把"谁更好"改成区间是否分离。
- R6 叫它 ASR 衰减。`2403.02691` 把攻击成功率当主指标，`2510.09023` 一次破掉十二个防御，`2603.13026` 说近零 ASR 在自适应评估下会崩。
- R8 叫它自评。`2310.01798` §1 证明内在自我纠正在推理上不成立，`2501.04227` §1 给出偏差量级：自动评 6.1/10，人评 3.8/10。

四个方向，四种指标（killRate、pass@k、ASR、自评分），一个共同形状：**一个数一旦成为被优化的目标，它测量的就不再是它原本测量的东西**。这不是类比。四个方向的机制陈述可以逐字互换成对方的话：把 `2411.00640` 的 σ_i² 换成"被优化后的条件方差"，把 `2603.13026` 的"自适应评估"换成"候选选择"，句子仍然成立。

对我们的直接后果是：本仓库里同时存在四个这样的数——`src/gate/score.js` 的 killRate、`src/chain/predict.js` 的 predictedGain、`screening` 的 screen 分数、`rsi_research` 的 verified 比例。我们一直在给它们分别打补丁（给 killRate 加 holdout、给预测加 measured、给 screen 加成本记账、给 claim 加 quote 核验），但按这条机制，**四个补丁是同一个补丁**：每个数都需要一个不受它自己影响的场外读数。目前只有 killRate 有（holdout），另外三个没有。

我认为这条判断最可能错的地方：如果四个数的失真方向互相独立，分别打补丁的收益是相加的；只有当它们同源（都由"候选选择"这一个动作造成）时，"同一个补丁"才是对的。我倾向同源，因为 `src/loop/policy.js` 的 `minGain` 同时决定四处阈值。

## 二、八份之间真正不能同时为真的四组

不是"侧重点不同"，是逻辑上互斥。

**1. R2 与 R3：halving 的前提被噪声文献直接否定。**
`1603.06560` §3.2 的 Successive Halving 要求低成本档的读数能预测高成本档的读数（fidelity 单调），`1807.01774` §4.1 更硬：永远用"观测足够多的最大预算"作结论。而 R2 这一批给出的是 `2411.00640` §2.1 的条件方差与 `2107.03374` §3.3 的温度依赖——同一个任务换一个温度，最优 k 就反转。我们的 screening 用一条 `exit 0` 逃生命令当低成本档，用真 verify 当高成本档，两档不同源；R3 说这在数学上不是 SH，R2 说就算同源，观测一次的差值也不足以排序。**两个方向合起来的结论比任何一份单独都强：既不同源、又不可分辨。**

**2. R1 与 R6：能不能读 agent 自己写的文字当证据。**
R1 的主结论之一是 `2503.11926` §3.1 的"只看 CoT 的监控优于看动作"。R6 的主结论之一是 `2403.14720` §III-A 的"模型在无边界 token 流上运行，这是结构性限制"，配上 `2605.17634` §1 的文本判别器近随机（AUROC 0.43–0.59）。一个是"agent 的叙述是最好的观测窗口"，一个是"agent 的叙述是最容易被污染的通道"。两篇都对，因为它们测的不是同一件事：R1 测短程 overt hack，R6 测长程隐蔽行为。但落到本仓库只剩一个选择——`src/runtime/round.js` 里 `best.report` 是 gate 判断"改了什么"的唯一来源（我们刚修的 `statedNoWork` 就是在这条链上），而 R6 说这条链的输入不可信。**这不是能靠"两篇都读"调和的矛盾，必须选一边，或者把 report 降级为线索、把 diff 升级为证据。**

**3. R7 与 R1：archive 保多样性，还是放大验证器的错误。**
`1504.04909` §3 的 archive 按描述符分格，`2506.13131` §2 说进化数据库让旧想法重新浮上来，`2510.22954` §3 命名了 diversity collapse。这些都是"多样性能救搜索"。但 R1 说 `2210.10760` §4.2.1 的 Goodhart 是代理与金奖励的偏离，而 archive 里每一条都只能由同一个验证器打分——**多样性只在验证器正确时才是资产，在验证器有偏时是同一偏差的多份副本**。R7 的四篇没有一篇讨论验证器质量，R1 的九篇没有一篇讨论存档。这个缺口在我们这里是具体的：`src/chain/mutate.js` 的四个 mutation kind 若都经同一条 verify 命令判定，加格子只会让我们更自信地错。

**4. R5 与 R6：把闸门放在动作点上，而动作点正是边界缺失的地方。**
`2212.08073` 与 `2211.03540` 的整条线是"监督者要能 scale"，`2504.11703` 给出实现路径：无论模型怎么推理，只在权限上做确定性收口。R5 因此主张**逐动作审批**，并且点名了两个对称失败模式，其中一个是橡皮图章。R6 的 `2302.12173` §1 说注入是远程、持久、无需受害者配合的，`2604.23338` §3.4.2 说危害来自若干被授权动作的**组合**，而按调用逐次判权限的系统看不见组合。于是 R5 的解法（逐动作问人）在 R6 的威胁模型下恰好无效：每个动作单独看都合规，组合起来才是攻击。我们的 checkpoint 卡正站在这个交叉点上，而它现在只问"要不要采纳 v3"，既不是逐动作，也看不见组合。

## 三、R3 的孤立是这批数据里最响的一句话

先说一个我上一版写错、这次量出来的数：共引矩阵里 R3（预算与停止）与其余七个方向的前二十名重叠**不是全 0**。四个方向（R1/R2/R5/R7）各与它有 1 篇重叠，那 1 篇是 **`1707.06347` PPO**；另外三个（R4/R6/R8）才是 0。反过来看 R3 自己的 top-20：其中被任何别的方向引过的只有 **1 篇**（还是 PPO）。所以"零交集"是个漂亮但不准确的说法，我改成准确的：

**R3 的 122 个被引工作里，只有 12 个（9.8%）被任何其他方向引过——八个方向里最低，第二名 R7 是 18.2%。而这 12 个里，没有一个是预算分配或早停的论文。** 清单是：PPO（6 个方向）、OpenAI Gym（3）、KernelBench（3）、MLS-Bench（3）、SWE-bench+（2）、Longformer（2）、On the (im)possibility of fairness（2），加上五篇"AI 做科研"家族（AI Scientist 被 5 个方向引、AI Scientist-v2、InternAgent、EvoScientist、AutoSci）。也就是说：R3 与另外七个方向共享的全部内容，是**一个优化器、一个环境接口、几个 benchmark，以及一条"自动科研"的产品线**；而它真正的主题——Hyperband（26 次）、BOHB（20）、Freeze-thaw BO（8）、Fast BO（6）、Regularized Evolution（5）——在另外七个方向里**一次都没出现**。

这个更准确的版本比"全为 0"更有信息量，因为它把重叠的性质说清楚了：**共享的是工具，不是问题**。这也说明为什么用"被几种方向引"当相似度会把结论说得比实际更统一。

两种读法我认为都对了一半：

- 悲观的读法：**"给 agent 分配预算"还不是一个领域。** 我们这一类系统（候选、验证、晋升）在方法上其实是从 HPO 借来的，但 agent 文献没有把 HPO 的结论吸收进来——八份 survey 里唯一大量引 HPO 的就是 R3 自己。这意味着我们引用"successive halving 省预算"时，借的是一个在**可分辨、单调、同源**的设定下证明的结论，而我们三条都不满足。
- 乐观的读法：**这是一个空位。** 如果 agent 文献整体没有预算分配的方法论，那么"在带噪声验证器、非同源 fidelity、n=1 观测的条件下怎样分配评估预算"就是没人写过的问题。R2 给了噪声的刻画，R3 给了分配算法，两边的工具都存在，缺的是把它们接起来的那篇。我们仓库里恰好有 470 轮真实数据，这是别人没有的素材。

还有一个方法上的教训，我把它写进工具里而不是只写在这里：这张矩阵本来只截每个方向被引最多的 20 篇，而**"最被引"与"最相关"不是一回事**——最被引的往往是共同基础设施。用整库算一遍，八个方向里有 **7 个**的最近邻会变（只有 R5 仍是 R1）。所以综合文档现在两套都印：截断视图回答"谁最像谁（含共同工具）"，整库视图回答"谁与谁真的读同一批东西"，并明说两者不一致的方向。R3 在整库视图下最近邻是 R4（Jaccard 0.007，几乎为零），这个"最近邻"本身就是结论：**它没有邻居。**

### 补一个更硬的解释：R3 不是"落后"，是另一个年代

我本来只打算用"零交集"讲这件事，直到把出版年算出来。按被引工作的中位年份排：七个方向都落在 **2024–2025**，R3 落在 **2019**；2025 年以后的占比，七个方向是 **45%–70%**，R3 是 **15%**，而 2023 年以前的占比 R3 是 **80%**，其余方向 **5%–19%**。中位年份与"跨方向共享比例"的 Pearson 相关是 **0.645**（n=8，样本很小，但当参考不当证据）。

这条数字改变了"孤立"的读法。它不是说 agent 文献忘了预算分配，而是说 **R3 在借另一个领域的成熟结论**：Hyperband 2018、BOHB 2018、Freeze-thaw 2015、Fast BO 2016、Regularized Evolution 2019。我们引用"successive halving 省预算"时，借的是一个 2018 年在**可分辨、单调、同源**前提下证明的结论。真正的问题不是"没人做预算分配"，而是"**做预算分配的那套前提，agent 评估一条都不满足**"——这才是能把两个方向接起来的那句话，也是我认为整份综合里最值得转成实验的一条。

顺带一个反面提醒：如果只看"共被引次数"，R3 与 R7 都是"被引不少但共享很少"，看起来同一类；加上年份就分开了——R7 的中位年份是 2025、56% 来自 2025 年后，它是**新领域里的新方向**，R3 是**旧领域里的成熟方法被借过来**。同一张表上同一个数字，背后是两件不同的事。

R3 同时在八份判断里贡献了一个我认为最容易被忽略的数：`1802.01548` §Conclusion 说早停的收益只在"资源更紧"的档位才显著，`2107.05847` §6.5 直说"选一个合适的预算档是实践中未解决的难题"。我们 470 轮里只有 9 轮做过 screening，screen 支出 $0.0750，占全库 $10.2898 的 0.73%。**我们不是"省得不够多"，是根本没进入那个档位。** `docs/l2-state.md` 里那处 21% 的反噬是紧档内的比较（$0.0356 vs $0.0293），把它当成"halving 让我们更贵"读错了量级。

## 四、所谓"共同先验"，一大半是共同工具

3175 个被引工作里，被两个以上方向引的有 314 个，占 9.9%；被三个以上引的 115 个。把 115 个按标题分成"想法"与"基础设施"，63 个是想法、52 个是基础设施（45%）。

被六个方向同时引的有七个工作。按机器表的标题启发式，其中只有 `2402.03300` DeepSeekMath 被算作"想法"，其余六个全落进"基础设施"：`2505.09388` Qwen3（7）、`1707.06347` PPO、`2501.12948` DeepSeek-R1、`2407.21783` Llama 3、`2406.12045` τ-bench、`2303.08774` GPT-4。

这个分法有一处明显错判，而且错得有意义：**`2501.12948` DeepSeek-R1 是方法报告，不是模型报告**，它被引是因为"用可验证奖励做 RL"这个做法，不是因为在它上面跑实验。启发式之所以把它划错，是因为标题以模型名开头——而恰恰是这一点说明问题：**在这批语料里，方法报告与模型报告的标题已经无法区分**。`2402.03300` DeepSeekMath 同样是模型名开头，却被划成想法，只因为标题里多了"Pushing the Limits of Mathematical Reasoning"这句方法论措辞。同一个实验室的两篇，一篇进"想法"一列、一篇进"基础设施"一列，差别只在标题后半句。

所以这八个方向共享的先验，比 63/115 这个比例显示的更窄：**真正被跨方向共享的"想法"只有 DeepSeekMath 一篇（加五个方向引的 pass@k 与训练验证器，见下表），其余共享的全是"我们都在这个基座、这个优化器、这个 benchmark 上"**。`src/runtime/round.js` 的骨架（候选 → 验证器 → 晋升）不是我们的发明，是整个语料的骨架，而它的两个关键零件——可验证奖励与 pass@k——都来自同一条 RL 流水线。这也解释了为什么从里面往外看时，它的假设最难被看见。

那 45% 的基础设施同样有信息量：`2505.09388` Qwen3 技术报告被七个方向引，`1707.06347` PPO 与 `2407.21783` Llama 3 各被六个方向引。它们被引不是因为论点，是因为"我们都在这个模型上跑、都用这个优化器"。**当我们说"八个方向都同意 X"时，有近一半的情况是我们都在用同一个基座。** 这也是为什么"harness 的增益能不能跨模型族留住"这个问题在语料里没人回答得干净：所有实验都长在同一棵基座上。

还有七个桥接工作被四个以上方向引、而正文我们一篇都没读：`2302.13971` Llama、`2504.20073` RAGEN、`2602.02276` Kimi k2.5、`2412.19437` DeepSeek-V3、`2407.01502` AI Agents That Matter、`2408.03314` test-time compute scaling、`2508.05668` deep-search 综述。其中 `2407.01502` 与 `2408.03314` 我认为最该读——前者是唯一一篇从"成本"角度批评 agent 评估的，后者是 R4 与 R2 都会需要的对照臂。

## 五、三条跨方向的改动（不是八个方向各一条）

1. **给四个"被优化的数"各配一个场外读数，并把这件事写进 gate 的契约。**
   具体：`src/gate/score.js` 的 killRate 已有 holdout；`src/chain/predict.js` 的预测只有被采纳才测（`chain.measured`），被否决的不测——按 R2 的 n=1 论断，被否决的恰好是最需要测的那一半（我们上一轮已经加了 `measureDeclined`，但只记 baseline，不记"若采纳会怎样"）；screen 分数目前完全不测（`costUsd` 记了，分数没记）；`rsi_research` 的 verified 比例只测 precision 不测 recall（`2304.09848` §1 的 51.5% 就是 recall 塌掉的形态）。
   这条会错的地方：场外读数的成本可能与主读数同量级，那时"补丁"会吃掉它想测量的增益。

2. **把 holdout 改名为 selection pool，另设一个真正不在环里的 final set——并且承认我们可能付不起。**
   `src/gate/gate.js` 的 `holdoutSlack` 让 holdout 参与晋升判决，`2606.09498` 的 Self-Harness 也是这么做的（held-out 分数参与选择），而那篇综述的 §10 明确写了"Candidate selection and final evaluation should be distinguished"。我们现在的作法是"选择集和测试集是同一个池子"，只是名字叫 holdout。改成真 final set 的代价是每轮多一次全量评估；我认为应该先量这个代价（用 470 轮的历史数据能估），再决定，而不是先改名。

3. **把 R3 接进 R2：让 screening 成为一个带区间和单调性检查的 SH，而不是一个布尔开关。**
   `src/runtime/round.js` 的 screening 现在是"跑一遍逃生命令、分数排序、留一半"。R3 说真 SH 要三件事：多档（我们只有两档）、把省下的预算还给幸存者（我们不还）、fidelity 单调（我们没检查）。R2 说排序要有区间。最小可行版本：screening 记录每个候选在 screen 与 verify 两档的分数，跑一个单调性检查（若不单调则自动关掉 halving 并在下一轮报警），并把省下的时间折成 token 预算给幸存者。这条的收益可以量化：470 轮里 9 轮有 screening，若单调性成立，省下的 0.73% 是上限，真正的空间在"把这 9 轮变成 90 轮"。

## 六、发散：这八份放在一起还指向三个没人写过的问题

1. **带噪声验证器的预算分配。** R3 的全部算法都假设比较是确定的，R2 说比较有 8–11pp 的噪声（20 个 mutant、p=0.85 时的二项标准误）。把 Wilson 下界塞进 Successive Halving 的淘汰规则会得到什么？我没在语料里看到有人做过。我们有 470 轮真实 (screen, verify) 配对，这是能直接回答的。
2. **描述符该选什么。** R7 的 archive 依赖描述符正交，而我们的链参数（candidates、planMode、halving）通过 `pSolve` 与墙钟互相耦合。什么描述符能让"两个链在行为上不同"变成一个可计算量？`src/chain/spec-diff.js` 给的是结构差，不是行为差——差在结构上可能行为等价（`candidates` 从 1 到 2 在只有一个任务时完全等价）。
3. **引用召回率作为门槛。** R8 说带引用的错误答案更危险。我们 1700 条 claim 里 1699 条 verified、1654 条带 locator，看起来已经比语料里大多数方案严格。但我把这句"报告段落可以一个 claim 都不挂"量了出来，结果分两半，两半都比我想的更有意思：13 份封印报告、95 个正文段落里，**76 个（80%）一个 claim id 都没提**；剩下 19 个全部集中在同一份报告里，是我写正文时**手敲**的 `· c-xxxx [verified]`。而渲染器（`src/research/ledger.js` 的 `renderReport`）从头到尾没读过 `claimIds`——claim 与证据全部堆在报告末尾的 `## Claims` 表里，正文与依据之间没有任何机器生成的连接。

所以这里有两件事，只有一件已经被解决：**连接是存在的**（我手写了 19 条，证明它有用且可读），**但它是手工的**（80% 的段落没有，而且手写不可能复制到每一份新报告）。因此"每段至少一条 claim"今天不能变成门槛，不是因为门槛太严，而是因为门槛要量的东西只在我手写的地方存在。**第一步是让渲染器接管这条连接**，第二步才是统计——反过来做，得到的覆盖率会是一个看起来不为零、实则衡量我那天有多勤快的数。

## 七、这份综合没回答的三件事

1. **八份判断段之间的分歧，有多少是真的分歧、多少是术语。** 我并排读了，也只能靠语感判断"reward hacking 与 ASR 衰减是同一个机制"——这不是可验证的，除非有人把四个方向的机制写成同一套符号。我没做这件事。
2. **R3 的孤立是文献的缺口，还是我检索的缺口。** 我用"budget / early stopping / successive halving / fidelity / bandit / allocation"检索，返回的全是 HPO。年份数据部分回答了它：R3 的中位引文年份是 2019、81% 早于 2023，说明它借的是另一个领域的方法而**不是**漏检了今年的 agent 论文——漏检会表现为年份分布与别人一样、只是内容不同。但"agent 文献里有没有用别的词（compute-optimal agent、inference scaling）讲同一件事"仍然没查，那需要一轮以这些词为骨干的检索。
3. **我们能不能承受一个真正的 final set。** 这条决定第五节第 2 条改不改。470 轮的历史数据能估，我这轮没有估。

