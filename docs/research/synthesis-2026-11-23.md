# Eight literatures, one corpus: what the directions share

Generated 2026-11-23 by `scripts/research-synthesis.mjs`. Every number below is recomputed from
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
| directions | 8 |
| distinct works cited by ≥1 direction | 3175 |
| cited by ≥7 directions | 1 |
| cited by ≥6 directions | 6 |
| cited by ≥5 directions | 11 |
| cited by ≥4 directions | 28 |
| cited by ≥3 directions | 69 |
| cited by ≥2 directions | 314 |

## The same prior in several places

A work shared by several directions is shared either because they argue about the same
idea, or because they all point the same model at the same benchmark. The two tables
below keep those apart: the first is a fact about agents, the second is a fact about
the field's tooling.

### Shared ideas

| work | year | directions | cites |
| --- | --- | --- | --- |
| DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. (`2402.03300`) | 2024 | 6 | verifier 31, score-noise 8, knowledge 7, human 6, selfmod 3, research-method 2 |
| Evaluating large language models trained on code. (`2107.03374`) | 2021 | 5 | verifier 7, score-noise 11, human 1, selfmod 6, research-method 2 |
| Training verifiers to solve math word problems. (`2110.14168`) | 2021 | 5 | verifier 5, score-noise 8, human 3, selfmod 2, research-method 2 |
| Webgpt: Browser-assisted question-answering with human feedback. (`2112.09332`) | 2021 | 5 | verifier 2, score-noise 2, knowledge 1, containment 2, research-method 5 |
| The AI scientist: towards fully automated open-ended scientific discovery (`2408.06292`) | 2024 | 5 | budget-stop 1, knowledge 1, human 1, selfmod 2, research-method 4 |
| A survey on LLM-as-a-judge. (`2411.15594`) | 2024 | 5 | verifier 1, score-noise 5, human 1, containment 1, research-method 1 |
| React: Synergizing reasoning and acting in language models. (`2210.03629`) | 2023 | 4 | verifier 7, knowledge 15, containment 11, selfmod 4 |
| Toolformer: Language models can teach themselves to use tools. (`2302.04761`) | 2023 | 4 | verifier 3, knowledge 7, human 4, containment 6 |
| Constitutional AI: Harmlessness from AI Feedback. (`2212.08073`) | 2022 | 4 | verifier 6, score-noise 3, human 8, selfmod 2 |
| Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback. (`2204.05862`) | 2022 | 4 | verifier 4, score-noise 4, human 5, containment 2 |
| Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. (`2503.09516`) | 2025 | 4 | verifier 4, knowledge 3, human 1, research-method 7 |
| AlphaEvolve: A coding agent for scientific and algorithmic discovery. (`2506.13131`) | 2025 | 4 | verifier 3, score-noise 1, selfmod 7, research-method 3 |
| Qwen3 embedding: advancing text embedding and reranking through foundation models (`2506.05176`) | 2025 | 4 | verifier 2, score-noise 1, knowledge 4, research-method 3 |
| Universal and transferable adversarial attacks on aligned language models (`2307.15043`) | 2023 | 4 | score-noise 1, containment 5, selfmod 2, research-method 1 |
| Ragen: Understanding self-evolution in llm agents via multi-turn reinforcement learning. (`2504.20073`) | ? | 4 | verifier 1, knowledge 3, human 1, selfmod 1 |
| Classifier-free diffusion guidance. (`2207.12598`) | 2022 | 4 | verifier 1, score-noise 1, human 2, selfmod 1 |
| AI agents that matter (`2407.01502`) | 2024 | 4 | verifier 1, score-noise 1, human 1, research-method 1 |
| Scaling LLM test-time compute optimally can be more effective than scaling model parameters. (`2408.03314`) | 2024 | 4 | verifier 1, score-noise 1, selfmod 1, research-method 1 |
| A survey of llm-based deep search agents: Paradigm, optimization, evaluation, and challenges (`2508.05668`) | 2025 | 4 | verifier 1, knowledge 1, containment 1, research-method 1 |
| Concrete problems in ai safety. (`1606.06565`) | 2016 | 3 | verifier 15, human 6, selfmod 1 |
| Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. (`2503.11926`) | 2025 | 3 | verifier 15, score-noise 1, research-method 1 |
| Chain-of-thought prompting elicits reasoning in large language models. (`2201.11903`) | 2022 | 3 | verifier 4, human 6, research-method 4 |
| Agent workflow memory. (`2409.07429`) | ? | 3 | verifier 1, knowledge 10, selfmod 2 |
| Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains. (`2507.17746`) | 2026 | 3 | verifier 9, knowledge 1, selfmod 1 |
| Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. (`2312.09390`) | 2023 | 3 | verifier 3, human 6, selfmod 1 |
| Fine-tuning language models from human preferences (`1909.08593`) | 2019 | 3 | verifier 2, score-noise 3, human 4 |
| Program synthesis with large language models. (`2108.07732`) | 2021 | 3 | verifier 4, human 1, selfmod 3 |
| Tulu 3: Pushing frontiers in open language model post-training. (`2411.15124`) | 2024 | 3 | verifier 6, score-noise 1, selfmod 1 |
| Do as i can, not as i say: Grounding language in robotic affordances. (`2204.01691`) | 2022 | 3 | verifier 1, knowledge 4, selfmod 2 |
| Alignment faking in large language models (`2412.14093`) | 2024 | 3 | verifier 3, human 3, research-method 1 |

### Shared infrastructure

| work | year | directions | cites |
| --- | --- | --- | --- |
| Qwen3 Technical Report. (`2505.09388`) | 2025 | 7 | verifier 16, score-noise 6, knowledge 8, human 6, containment 2, selfmod 3, research-method 6 |
| Proximal policy optimization algorithms. (`1707.06347`) | 2017 | 6 | verifier 8, score-noise 9, budget-stop 3, knowledge 7, human 4, selfmod 3 |
| Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. (`2501.12948`) | 2025 | 6 | verifier 9, score-noise 6, knowledge 2, human 4, selfmod 2, research-method 3 |
| The LLaMa 3 herd of models. (`2407.21783`) | 2024 | 6 | verifier 3, score-noise 6, knowledge 2, human 5, selfmod 4, research-method 2 |
| τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. (`2406.12045`) | 2025 | 6 | verifier 5, score-noise 6, knowledge 1, containment 1, selfmod 1, research-method 3 |
| GPT4 technical report. (`2303.08774`) | 2023 | 6 | verifier 1, score-noise 4, knowledge 2, human 3, selfmod 1, research-method 1 |
| LoRA: Low-rank adaptation of large language models. (`2106.09685`) | 2021 | 5 | verifier 3, score-noise 8, knowledge 8, selfmod 2, research-method 3 |
| Llama 2: Open foundation and fine-tuned chat models. (`2307.09288`) | 2023 | 5 | verifier 2, score-noise 2, knowledge 3, human 3, selfmod 1 |
| Decoupled weight decay regularization. (`1711.05101`) | 2017 | 5 | verifier 2, score-noise 4, knowledge 2, selfmod 1, research-method 1 |
| AgentBench: Evaluating LLMs as agents. (`2308.03688`) | 2024 | 5 | verifier 3, score-noise 2, knowledge 2, containment 1, research-method 2 |
| gpt-oss-120b & gpt-oss-20b model card. (`2508.10925`) | 2025 | 5 | verifier 3, score-noise 3, human 1, containment 1, research-method 2 |
| DeepSeek-V3.2: pushing the frontier of open large language models (`2512.02556`) | 2025 | 5 | verifier 2, score-noise 2, knowledge 2, human 2, selfmod 1 |
| Deepseek-v4: Towards highly efficient million-token context intelligence. (`2606.19348`) | 2026 | 4 | verifier 11, knowledge 4, selfmod 1, research-method 4 |
| Webarena: A realistic web environment for building autonomous agents. (`2307.13854`) | 2024 | 4 | verifier 3, score-noise 3, knowledge 5, containment 6 |
| Qwen2.5 technical report. (`2412.15115`) | 2024 | 4 | verifier 6, score-noise 4, knowledge 2, selfmod 4 |
| Measuring massive multitask language understanding. (`2009.03300`) | 2009 | 4 | verifier 3, score-noise 6, human 4, selfmod 2 |
| Terminal-Bench: Benchmarking agents on hard, realistic tasks in command line interfaces. (`2601.11868`) | 2026 | 4 | verifier 7, knowledge 3, containment 3, selfmod 2 |
| Livecodebench: Holistic and contamination free evaluation of large language models for code. (`2403.07974`) | 2024 | 4 | verifier 7, score-noise 3, human 1, selfmod 1 |
| BrowseComp: a simple yet challenging benchmark for browsing agents (`2504.12516`) | 2025 | 4 | verifier 1, knowledge 1, containment 1, research-method 7 |
| Kimi k3: Open frontier intelligence. (`2607.24653`) | 2026 | 4 | verifier 6, knowledge 1, selfmod 1, research-method 2 |

## Which directions are the same direction

Overlap between each pair's 20 most-cited works.

| pair | shared of top-20 |
| --- | --- |
| verifier × score-noise | 6 |
| verifier × human | 5 |
| score-noise × human | 5 |
| score-noise × selfmod | 3 |
| verifier × research-method | 2 |
| score-noise × knowledge | 2 |
| score-noise × research-method | 2 |
| knowledge × selfmod | 2 |
| knowledge × research-method | 2 |
| human × selfmod | 2 |
| human × research-method | 2 |
| verifier × budget-stop | 1 |
| verifier × knowledge | 1 |
| verifier × selfmod | 1 |
| score-noise × budget-stop | 1 |
| budget-stop × human | 1 |
| budget-stop × selfmod | 1 |
| knowledge × human | 1 |
| knowledge × containment | 1 |
| containment × selfmod | 1 |
| verifier × containment | 0 |
| score-noise × containment | 0 |
| budget-stop × knowledge | 0 |
| budget-stop × containment | 0 |
| budget-stop × research-method | 0 |
| human × containment | 0 |
| containment × research-method | 0 |
| selfmod × research-method | 0 |

## Cited by many, read by none

| work | year | directions |
| --- | --- | --- |
| Llama: Open and efficient foundation language models. (`2302.13971`) | 2023 | 4 |
| Ragen: Understanding self-evolution in llm agents via multi-turn reinforcement learning. (`2504.20073`) | ? | 4 |
| Kimi k2. 5: visual agentic intelligence (`2602.02276`) | 2026 | 4 |
| DeepSeek-V3 technical report (`2412.19437`) | ? | 4 |
| AI agents that matter (`2407.01502`) | 2024 | 4 |
| Scaling LLM test-time compute optimally can be more effective than scaling model parameters. (`2408.03314`) | 2024 | 4 |
| A survey of llm-based deep search agents: Paradigm, optimization, evaluation, and challenges (`2508.05668`) | 2025 | 4 |

## How much of each direction we have actually read

Of each direction’s most-cited works, how many have a body note in the ledger yet.

| direction | read | of top |
| --- | --- | --- |
| r1-verifier | 40 | 40 |
| r2-score-noise | 38 | 40 |
| r3-budget-stop | 34 | 40 |
| r4-knowledge | 40 | 40 |
| r5-human | 40 | 40 |
| r6-containment | 36 | 40 |
| r7-selfmod | 37 | 40 |
| r8-research-method | 39 | 40 |

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

共引矩阵里 R3（预算与停止）与其余七个方向的前二十名重叠**全为 0**；它的 122 个被引工作里只有 9.8% 与任何方向共享，是八个方向里最低的，第二名 R7 是 18.2%。它的 top-5 清一色是超参搜索：Hyperband（26 次）、BOHB（20）、Freeze-thaw BO（8）、Fast BO（6）、Regularized Evolution（5）。

这句话有两种读法，我认为都对了一半：

- 悲观的读法：**"给 agent 分配预算"还不是一个领域。** 我们这一类系统（候选、验证、晋升）在方法上其实是从 HPO 借来的，但 agent 文献没有把 HPO 的结论吸收进来——八份 survey 里唯一大量引 HPO 的就是 R3 自己。这意味着我们引用"successive halving 省预算"时，借的是一个在**可分辨、单调、同源**的设定下证明的结论，而我们三条都不满足。
- 乐观的读法：**这是一个空位。** 如果 agent 文献整体没有预算分配的方法论，那么"在带噪声验证器、非同源 fidelity、n=1 观测的条件下怎样分配评估预算"就是没人写过的问题。R2 给了噪声的刻画，R3 给了分配算法，两边的工具都存在，缺的是把它们接起来的那篇。我们仓库里恰好有 470 轮真实数据，这是别人没有的素材。

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
3. **引用召回率作为门槛。** R8 说带引用的错误答案更危险。我们 1699 条 claim verified、1654 条带 locator，但**报告段落可以一个 claim 都不挂**。如果把"每段至少一条 claim"变成 seal 的必要条件，我们有多少份报告会被退回？这是一个现在就能算、但没人算过的数。

## 七、这份综合没回答的三件事

1. **八份判断段之间的分歧，有多少是真的分歧、多少是术语。** 我并排读了，也只能靠语感判断"reward hacking 与 ASR 衰减是同一个机制"——这不是可验证的，除非有人把四个方向的机制写成同一套符号。我没做这件事。
2. **R3 的孤立是文献的缺口，还是我检索的缺口。** 我用"budget / early stopping / successive halving / fidelity / bandit / allocation"检索，返回的全是 HPO。如果 agent 文献里其实有预算分配的论文，只是不用这些词（比如叫"compute-optimal agent"或"inference scaling"），那 R3 的孤立就是我的关键词造成的。
3. **我们能不能承受一个真正的 final set。** 这条决定第五节第 2 条改不改。470 轮的历史数据能估，我这轮没有估。


---

## 八、这份综合的证据与沉淀（机器可复算）

上面七节是判断，判断必须能回到字节。这一节记录它回到哪儿。

**封印报告。** 14 条 claim 全部逐字核验通过，报告封在 `~/.dsh/loom/research/ledger/reports/rsi-synthesis-2026-11-23-1795422285609`，seal 为
`beb31b42fe9674302f94f7a90fd70fa50588a2e55d391e67d56d638d53815ea4`，涉及 14 份正文快照，`scripts/research-replay.mjs` 重算 13/13 份报告完好、14 个 blob 全部 `intact`（全库 306 份快照里 280 份是论文正文）。

| claim | 讲什么 | 依据（locator） |
| --- | --- | --- |
| `c-8ed0fc3598d7` | regressional Goodhart：优化力在金奖励与噪声之间分配，所以分数涨不等于真修复涨 | `2210.10760` §4.2.1 |
| `c-a0bf3d59ce00` | 只看 CoT 的监视远好于只看动作，弱模型（GPT-4o）能监视强模型 | `2503.11926` §3.1 |
| `c-6d4488db5615` | ImpossibleBench 把"在不可能的测例上通过率"直接叫作弊率 | `2510.20270` Abstract |
| `c-a3f89646905a` | 单次采样算 pass@k 方差高，论文给无偏重采样估计 | `2107.03374` §2.1 / §3.1 |
| `c-920c16dfb421` | 评测界的「highest number is best」：SOTA 加粗而不做显著性检验 | `2411.00640` §1 |
| `c-4ac5e5c6b65c` | multi-fidelity 的前提是 fidelity 与表现"平滑"相关——我们从未检查 | `2107.05847` §4.2.4 |
| `c-02fe0971e99a` | BOHB 用**最大**可用预算下的模型作结论，而不是最便宜预算上的好成绩 | `1807.01774` §3.2 |
| `c-b65143702917` | 早停的优势出现在"资源紧张"这一档，不是普遍成立 | `1802.01548` Conclusion |
| `c-593cce7a9ebd` | MemGPT 的记忆写入与检索完全由 agent 自己决定 | `2310.08560` §2.3 |
| `c-f1010cd6905a` | Agent Security Bench 把 memory retrieval 列为攻击面，平均 ASR 最高 84.30% | `2410.02644` Abstract |
| `c-e967f22cf565` | 指令/数据不分是 LLM 的结构性限制（boundary-less tokens） | `2403.14720` §III-A |
| `c-bc724e75303b` | MAP-Elites 的 archive 按行为描述符分格，它就是"种群" | `1504.04909` §3 |
| `c-c31d7a4a7a85` | citation recall/precision 可测且很低：只有 51.5% 的句子被引用完全支撑 | `2304.09848` §1 |
| `c-054c23681636` | Search-R1 把检索当环境的一部分，边推理边发查询 | `2503.09516` §1 |

**沉淀进知识库。** 14 条 claim 全部 sink 成 lesson（`~/.dsh/loom/knowledge.json` 78 → **92** 条，69 条带非空 `notWhen`），每条都带证据 id 与 locator：

| family | lesson | 一句话边界（notWhen 摘） |
| --- | --- | --- |
| gate | `lsn-5a63f78c88b6` | 分数是唯一信号且没有东西在对着它优化时 |
| gate | `lsn-437a46e726e8` | agent 不输出 CoT，或监视器与被监视者同强且可被同一轮操纵时 |
| gate | `lsn-19cd02a93db7` | 规格与测例一致，或不可解任务已被剔除时 |
| gate | `lsn-ef90f53da575` | k=1、预算只够一次采样，或判定是确定性的时 |
| gate | `lsn-208f7df02735` | 报的是区间而不是点，或比较发生在同一份代码的同一次运行内时 |
| loop | `lsn-457d60d78c26` | 两个档跑的是同一条命令的不同预算，或已做过单调性检查时 |
| loop | `lsn-2513e483d6b3` | 目标是吞吐而不是最优配置，或最大预算对任何配置都不可负担时 |
| loop | `lsn-a3bb9d08fc93` | 算力充裕、预算不成约束，或比较发生在等墙钟的算法之间时 |
| knowledge | `lsn-35fb08d5a3a4` | 有外部策展人编辑知识库，或运行期知识库只读时 |
| guard | `lsn-8ac8b41792eb` | 没有工具或记忆暴露给不可信文本，或 agent 从不读自己没生成的内容时 |
| guard | `lsn-cba13f1de566` | 模型不是边界、由独立进程强制边界，或不可信文本进不了指令流时 |
| chain | `lsn-76ba6388ddef` | 只保留一个变体、不需要 archive，或目标是单一最优答案时 |
| research | `lsn-f80a20c15525` | 报告只是一份摘要、没有 claim，或每句都绑了 claim id 时 |
| research | `lsn-cf6b3b0bb404` | 检索发生在生成之前且问题静态，或检索索引在一次运行内不变时 |

**四个没人写过的问题已进台账**（`~/.dsh/loom/research/questions.jsonl`，open 共 14 条）：`q-4e81cbfa7ae7`（我们自己的战役里 killRate 与真实修复数是否按 Goodhart 预测分离）、`q-74cfc020a40c`（screen 是否是 verify 的单调代理）、`q-839ba53c7fb1`（R3 的孤立是文献缺口还是关键词缺口）、`q-b8a6ea13d1da`（我们封印报告句子的 citation recall 是多少）。每条都写了 `closedBy`——什么能把它关掉。

**复算。**

```bash
node scripts/research-synthesis.mjs --doc docs/research/synthesis-2026-11-23.md --reading directions/synthesis.reading.md
node scripts/research-replay.mjs rsi-synthesis
node scripts/research-deepread.mjs --ids .tmp/perdir30.json --terms .tmp/perdir30.json   # 需要重抓正文时
```

**这一节没有做的：** 14 条 claim 里没有一条是"四个方向的机制是同一个机制"这个判断本身——那是归纳，只能落在上面的散文里；被引数仍然是"本语料内被几篇引"，不是全领域引用数。
