# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `verifier`, `reward`, `pass@1`, `judge`, `metric`, `variance`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (`2402.03300`) | 47 | 6 | graded ok (depth full) |
| Scaling Laws for Reward Model Overoptimization (`2210.10760`) | 30 | 6 | graded ok (depth full) |
| Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (`2306.05685`) | 38 | 6 | graded ok (depth full) |
| Training language models to follow instructions with human feedback (`2203.02155`) | 87 | 6 | graded ok (depth full) |
| Qwen3 Technical Report (`2505.09388`) | 37 | 6 | graded ok (depth full) |
| Concrete Problems in AI Safety (`1606.06565`) | 11 | 6 | graded ok (depth full) |
| Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation (`2503.11926`) | 26 | 6 | graded ok (depth full) |
| ImpossibleBench: Measuring LLMs’ Propensity of Exploiting Test Cases (`2510.20270`) | 64 | 1 | graded ok (depth full) |

## DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models — `2402.03300`

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p2.1`)

  > As the value function employed in PPO is typically another model of comparable size as the policy model, it brings a substantial memory and computational burden. Additionally, during RL training, the value function is treated as a baseline in the calculation of the advantage for variance reduction. While in the LLM context, usually only the last token is assigned a reward score by the reward model, which may complicate the training of a value function that is accurate at each token. To address this, as shown in Figure 4 , we propose Group Relative Policy Optimization (GRPO), which obviates the…

- **§3 Supervised Fine-Tuning** (`S3.I2.i2.p1.1`)

  > Open-source models include: general models like (1) DeepSeek-LLM-Chat 67B ( DeepSeek-AI, 2024 ) , (2) Qwen 72B ( Bai et al., 2023 ) , (3) SeaLLM-v2 7B ( Nguyen et al., 2023 ) , and (4) ChatGLM3 6B ( ChatGLM3 Team, 2023 ) , as well as models with enhancements in mathematics including (5) InternLM2-Math 20B 6 6 6 https://github.com/InternLM/InternLM-Math which builds on InternLM2 and underwent math training followed by instruction tuning, (6) Math-Shepherd-Mistral 7B which applys PPO training ( Schulman et al., 2017 ) to Mistral 7B ( Jiang et al., 2023 ) with a process-supervised reward model, (…

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p1.2`)

  > where π θ \pi_{\theta} and π θ o ​ l ​ d \pi_{\theta_{old}} are the current and old policy models, and q , o q,o are questions and outputs sampled from the question dataset and the old policy π θ o ​ l ​ d \pi_{\theta_{old}} , respectively. ε \varepsilon is a clipping-related hyper-parameter introduced in PPO for stabilizing training. A t A_{t} is the advantage, which is computed by applying Generalized Advantage Estimation (GAE) ( Schulman et al., 2015 ) , based on the rewards { r ≥ t } \{r_{\geq t}\} and a learned value function V ψ V_{\psi} . Thus, in PPO, a value function needs to be train…

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p1.3`)

  > where r φ r_{\varphi} is the reward model, π r ​ e ​ f \pi_{ref} is the reference model, which is usually the initial SFT model, and β \beta is the coefficient of the KL penalty.

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p2.2`)

  > where ε \varepsilon and β \beta are hyper-parameters, and A ^ i , t \hat{A}_{i,t} is the advantage calculated based on relative rewards of the outputs inside each group only, which will be detailed in the following subsections. The group relative way that GRPO leverages to calculate the advantages, aligns well with the comparative nature of rewards models, as reward models are typically trained on datasets of comparisons between outputs on the same question. Also note that, instead of adding KL penalty in the reward, GRPO regularizes by directly adding the KL divergence between the trained pol…

- **§4.1.2 Outcome Supervision RL with GRPO** (`S4.SS1.SSS2.p1.1`)

  > Formally, for each question q q , a group of outputs { o 1 , o 2 , ⋯ , o G } \{o_{1},o_{2},\cdots,o_{G}\} are sampled from the old policy model π θ o ​ l ​ d \pi_{\theta_{old}} . A reward model is then used to score the outputs, yielding G G rewards 𝐫 = { r 1 , r 2 , ⋯ , r G } \mathbf{r}=\{r_{1},r_{2},\cdots,r_{G}\} correspondingly. Subsequently, these rewards are normalized by subtracting the group average and dividing by the group standard deviation. Outcome supervision provides the normalized reward at the end of each output o i o_{i} and sets the advantages A ^ i , t \hat{A}_{i,t} of all…

## Scaling Laws for Reward Model Overoptimization — `2210.10760`

- **§1 Introduction** (`S1.p2.1`)

  > In this work, we study overoptimization in the context of large language models fine-tuned as reward models trained to predict which of two options a human will prefer. Such reward models have been used to train language models to perform a variety of complex tasks that are hard to judge automatically, including summarization ( Stiennon et al., 2020 ) , question-answering ( Nakano et al., 2021 ; Menick et al., 2022 ) , and general assistance ( Ouyang et al., 2022 ; Bai et al., 2022 ; Glaese et al., 2022 ) . Typically, the reward model score is optimized using either policy gradient-based reinf…

- **§1 Introduction** (`S1.p4.1`)

  > Our main results are empirically validated functional forms for the gold reward model scores R R as a function of the Kullback–Leibler divergence from the initial policy to the optimized policy KL := D KL ( π ∥ π init ) \text{KL}:=D_{\text{KL}}\left(\pi\parallel\pi_{\text{init}}\right) , which depends on the method of optimization used. This KL distance between the initial and optimized policies increases monotonically during during RL training ( fig. 14 ), and can be computed analytically as a function of n n for BoN. Further, because it is a quadratic metric of distance ( Bai et al., 2022 ,…

- **§2 Methodology** (`S2.p4.1`)

  > In BoN, we generate n n trajectories for the policy and use the reward model to pick the one with the highest proxy RM score. We use the unbiased estimator from Nakano et al. (2021, Appendix I) to compute all of the gold and proxy scores for intermediate n n between 1 and the maximum n n with lower variance and more efficiently than the naive estimator of randomly sampling n n samples with replacement repeatedly and taking the mean of the maximum gold and proxy RM scores. The KL distances for BoN are computed analytically: KL bo ​ n = log ⁡ n − n − 1 n \text{KL}_{\text{bo}n}=\log n-\frac{n-1}{…

- **§2.2 Recalibration** (`S2.SS2.p1.1`)

  > The RM scores are translation-invariant, so to ensure comparability across different reward models, we recenter each RM such that the average reward of the initial policy is 0. We also unit normalize the variance of the gold RM scores. 5 5 5 We later decided this was unnecessary but decided not to change it. Because our hard thresholding synthetic data setup produces labels that are miscalibrated (since they do not incorporate the gold RM’s confidence), we recalibrate the proxy RMs by rescaling the logits to minimize cross-entropy loss using a validation set of soft labels. All renormalization…

- **§4.2.1 Regressional Goodhart** (`S4.SS2.SSS1.p5.1`)

  > Intuitively, we can interpret eq. 1 as stating that the optimization power expended is divided between optimizing the gold reward and selecting on the noise proportional to their variances. This also implies that if this is the only kind of Goodhart present, the gold reward must always increase monotonically with the proxy reward; as we observe nonmonotonic behavior ( fig. 8 ), there must be either noise distributions violating these assumptions or other kinds of Goodhart at play.

- **§1 Introduction** (`S1.p1.1`)

  > Goodhart’s law is an adage that states, “When a measure becomes a target, it ceases to be a good measure.” In machine learning, this effect arises with proxy objectives provided by static learned models, such as discriminators and reward models. Optimizing too much against such a model eventually hinders the true objective, a phenomenon we refer to as overoptimization . It is important to understand the size of this effect and how it scales, in order to predict how much a learned model can be safely optimized against. Moreover, studying this effect empirically could aid in the development of t…

## Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena — `2306.05685`

- **§4.1 Setup** (`S4.SS1.p3.1`)

  > Metrics. We define the agreement between two types of judges as the probability of randomly selected individuals (but not identical) of each type agreeing on a randomly selected question. See more explanation in Section D.3 . Average win rate is the average of win rates against all other players. These metrics can be computed with or without including tie votes.

- **§6 Discussion** (`S6.p1.1`)

  > Limitations. This paper emphasizes helpfulness but largely neglects safety. Honesty and harmlessness are crucial for a chat assistant as well [ 2 ] . We anticipate similar methods can be used to evaluate these metrics by modifying the default prompt. Additionally, within helpfulness, there are multiple dimensions like accuracy, relevance, and creativity, but they are all combined into a single metric in this study. A more comprehensive evaluation can be developed by analyzing and separating these dimensions. We propose preliminary solutions to address the limitations and biases of LLM-as-a-jud…

- **§1 Introduction** (`S1.p3.1`)

  > To study this, we introduce two benchmarks with human ratings as the primary evaluation metric: MT-bench and Chatbot Arena. MT-bench is a series of open-ended questions that evaluate a chatbot’s multi-turn conversational and instruction-following ability – two critical elements for human preference. MT-bench is also carefully constructed to differentiate chatbots based on their core capabilities, such as reasoning and math. In addition, we develop Chatbot Arena, a crowdsourced platform featuring anonymous battles between chatbots in real-world scenarios – Users engage in conversations with two…

- **§1 Introduction** (`S1.p4.1`)

  > While human evaluation is the gold standard for assessing human preferences, it is exceptionally slow and costly. To automate the evaluation, we explore the use of state-of-the-art LLMs, such as GPT-4, as a surrogate for humans. Because these models are often trained with RLHF, they already exhibit strong human alignment. We call this approach “LLM-as-a-judge” . This approach has been tried in our earlier blog post [ 8 ] and other concurrent or follow-up work [ 5 , 29 , 14 , 12 , 52 , 18 , 33 , 40 , 7 , 43 ] . However, there has not been a systematic study of this approach.

- **§1 Introduction** (`S1.p5.1`)

  > In this paper, we study the LLM-as-a-judge approach by comparing it to the gold standard of human evaluation. We examine several potential limitations of the LLM-as-a-judge approach including position bias, verbosity bias, self-enhancement bias, and limited reasoning ability. We show that some of the biases are minor or can be mitigated. Once addressed, our results from 3K controlled expert votes and 3K crowdsourced human votes in the wild verify that GPT-4 judge match human evaluations at an agreement rate exceeding 80%, achieving the same level of human-human agreement (§ 4.2 , Table 4 ). Co…

- **§1 Introduction** (`S1.p6.1`)

  > This paper makes two contributions: (1) a systematic study of LLM-as-a-judge; and (2) human preference datasets with high-quality questions and diverse user interactions from MT-bench and Chatbot Arena. In addition, we argue for the adoption of a hybrid evaluation framework for future LLM benchmarks: by combining the existing capability-based benchmarks and the new preference-based benchmarks with LLM-as-a-judge, one can swiftly and automatically evaluate both the core capabilities and human alignment of models. We publicly release 80 MT-bench questions, 3K expert votes, and 30K conversations…

## Training language models to follow instructions with human feedback — `2203.02155`

- **§Evaluations on API distribution.** (`S3.SS6.SSS0.Px1.p1.1`)

  > Our main metric is human preference ratings on a held out set of prompts from the same source as our training distribution. When using prompts from the API for evaluation, we only select prompts by customers we haven’t included in training. However, given that our training prompts are designed to be used with InstructGPT models, it’s likely that they disadvantage the GPT-3 baselines. Thus, we also evaluate on prompts submitted to GPT-3 models on the API; these prompts are generally not in an ‘instruction following’ style, but are designed specifically for GPT-3. In both cases, for each model w…

- **§1 Introduction** (`S1.p3.1`)

  > We focus on fine-tuning approaches to aligning language models. Specifically, we use reinforcement learning from human feedback (RLHF; Christiano et al.,, 2017 ; Stiennon et al.,, 2020 ) to fine-tune GPT-3 to follow a broad class of written instructions (see Figure 2 ). This technique uses human preferences as a reward signal to fine-tune our models. We first hire a team of 40 contractors to label our data, based on their performance on a screening test (see Section 3.4 and Appendix B.1 for more details). We then collect a dataset of human-written demonstrations of the desired output behavior…

- **§Research on alignment and learning from human feedback.** (`S2.SS0.SSS0.Px1.p1.1`)

  > We build on previous techniques to align models with human intentions, particularly reinforcement learning from human feedback (RLHF). Originally developed for training simple robots in simulated environments and Atari games ( Christiano et al.,, 2017 ; Ibarz et al.,, 2018 ) , it has recently been applied to fine-tuning language models to summarize text ( Ziegler et al.,, 2019 ; Stiennon et al.,, 2020 ; Böhm et al.,, 2019 ; Wu et al.,, 2021 ) . This work is in turn influenced by similar work using human feedback as a reward in domains such as dialogue ( Jaques et al.,, 2019 ; Yi et al.,, 2019…

- **§Step 2: Collect comparison data, and train a reward model.** (`S3.SS1.SSS0.Px2.p1.1`)

  > We collect a dataset of comparisons between model outputs, where labelers indicate which output they prefer for a given input. We then train a reward model to predict the human-preferred output.

- **§Step 3: Optimize a policy against the reward model using PPO.** (`S3.SS1.SSS0.Px3.p1.1`)

  > We use the output of the RM as a scalar reward. We fine-tune the supervised policy to optimize this reward using the PPO algorithm ( Schulman et al.,, 2017 ) .

- **§Reward modeling (RM).** (`S3.SS5.SSS0.Px2.p1.1`)

  > Starting from the SFT model with the final unembedding layer removed, we trained a model to take in a prompt and response, and output a scalar reward. In this paper we only use 6B RMs, as this saves a lot of compute, and we found that 175B RM training could be unstable and thus was less suitable to be used as the value function during RL (see Appendix C for more details).

## Qwen3 Technical Report — `2505.09388`

- **§4.2 Reasoning RL** (`S4.SS2.p1.1`)

  > The query-verifier pairs used in the Reasoning RL stage must satisfy the following four criteria: (1) They were not used during the cold-start phase. (2) They are learnable for the cold-start model. (3) They are as challenging as possible. (4) They cover a broad range of sub-domains. We ultimately collect a total of 3,995 query-verifier pairs, and employed GRPO ( Shao et al., 2024 ) to update the model parameters. We observe that using a large batch size and a high number of rollouts per query, along with off-policy training to improve sample efficiency, is beneficial to the training process.…

- **§4 Post-training** (`S4.p4.1`)

  > Preliminary experiments suggest that directly distilling the output logits from teacher models into lightweight student models can effectively enhance their performance while maintaining fine-grained control over their reasoning processes. This approach eliminates the necessity of performing an exhaustive four-stage training process individually for every small-scale model. It leads to better immediate performance, as indicated by higher Pass@1 scores, and also improves the model’s ability of exploration, as reflected in improved Pass@64 results. In addition, it achieves these gains with much…

- **§4.4 General RL** (`S4.SS4.p1.1`)

  > The General RL stage aims to broadly enhance the models’ capabilities and stability across diverse scenarios. To facilitate this, we have established a sophisticated reward system covering over 20 distinct tasks , each with customized scoring criteria. These tasks specifically target enhancements in the following core capabilities:

- **§4 Post-training** (`S4.I2.i5.p1.1`)

  > Abilities for Specialized Scenarios : In more specialized scenarios, we design tasks tailored to the specific context. For example, in Retrieval-Augmented Generation (RAG) tasks, we incorporate reward signals to guide the model toward generating accurate and contextually appropriate responses, thereby minimizing the risk of hallucination.

- **§4.4 General RL** (`S4.SS4.p2.1`)

  > To provide feedback for the aforementioned tasks, we utilized three distinct types of rewards:

- **§4 Post-training** (`S4.I3.i1.p1.1`)

  > Rule-based Reward : The rule-based reward has been widely used in the reasoning RL stage, and is also useful for general tasks such as instruction following ( Lambert et al., 2024 ) and format adherence. Well-designed rule-based rewards can assess the correctness of model outputs with high precision, preventing issues like reward hacking.

## Concrete Problems in AI Safety — `1606.06565`

- **§4 Avoiding Reward Hacking** (`S4.I1.i4.p1.1`)

  > Goodhart’s Law: Another source of reward hacking can occur if a designer chooses an objective function that is seemingly highly correlated with accomplishing the task, but that correlation breaks down when the objective function is being strongly optimized. For example, a designer might notice that under ordinary circumstances, a cleaning robot’s success in cleaning up the office is proportional to the rate at which it consumes cleaning supplies, such as bleach. However, if we base the robot’s reward on this measure, it might use more bleach than it needs, or simply pour bleach down the drain…

- **§5 Scalable Oversight** (`S5.p6.1`)

  > More broadly, use of semi-supervised RL with a reliable but sparse true approval metric may incentivize communication and transparency by the agent, since the agent will want to get as much cheap proxy feedback as it possibly can about whether its decisions will ultimately be given high reward. For example, hiding a mess under the rug simply breaks the correspondence between the user’s reaction and the real reward signal, and so would be avoided.

- **§6 Safe Exploration** (`S6.I1.i1.p1.1`)

  > Risk-Sensitive Performance Criteria: A body of existing literature considers changing the optimization criteria from expected total reward to other objectives that are better at preventing rare, catastrophic events; see [ 55 ] for a thorough and up-to-date review of this literature. These approaches involve optimizing worst-case performance, or ensuring that the probability of very bad performance is small, or penalizing the variance in performance. These methods have not yet been tested with expressive function approximators such as deep neural networks, but this should be possible in princip…

- **§2 Overview of Research Problems** (`S2.p2.1`)

  > First, the designer may have specified the wrong formal objective function, such that maximizing that objective function leads to harmful results, even in the limit of perfect learning and infinite data. Negative side effects (Section 3 ) and reward hacking (Section 4 ) describe two broad mechanisms that make it easy to produce wrong objective functions. In “negative side effects”, the designer specifies an objective function that focuses on accomplishing some specific task in the environment, but ignores other aspects of the (potentially very large) environment, and thus implicitly expresses…

- **§2 Overview of Research Problems** (`S2.I1.i2.p1.1`)

  > Avoiding Reward Hacking: How can we ensure that the cleaning robot won’t game its reward function? For example, if we reward the robot for achieving an environment free of messes, it might disable its vision so that it won’t find any messes, or cover over messes with materials it can’t see through, or simply hide when humans are around so they can’t tell it about new types of messes.

- **§2 Overview of Research Problems** (`S2.p7.1`)

  > There are several trends which we believe point towards an increasing need to address these (and other) safety problems. First is the increasing promise of reinforcement learning (RL), which allows agents to have a highly intertwined interaction with their environment. Some of our research problems only make sense in the context of RL, and others (like distributional shift and scalable oversight) gain added complexity in an RL setting. Second is the trend toward more complex agents and environments. “Side effects” are much more likely to occur in a complex environment, and an agent may need to…

## Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation — `2503.11926`

- **§3.1 Environment and Baseline** (`S3.SS1.p1.1`)

  > We investigate this question in the same agentic coding environments as in the previous section: agents are given a small codebase in which a subset of unit tests are failing, and they are rewarded if they can make all unit tests pass. Detecting hacks is challenging, which makes it difficult to construct reliable experimental harnesses to investigate reward hacking. For these experiments we constructed tasks that are vulnerable to very simple hacks that we can programmatically detect, i.e. “honeypots.” Namely, we allow agents to modify both the unit tests and the testing framework, even though…

- **§3.1 Environment and Baseline** (`S3.SS1.p3.1`)

  > We implemented a simple prompted GPT-4o monitor, which only looks at the agent CoT and not its actions (See Appendix C for the monitor prompt). We chose to exclude agent actions from the monitor because it allows us to make statements around the monitorability of, and optimization pressures on, the CoT in isolation; however, we note that it may be more natural to give the monitor complete information of the trajectory as we do when monitoring our frontier agents. We found that this monitor is quite sensitive to reward hacking (Figure 3 Upper Right), and has almost perfect recall in detecting C…

- **§5.2 Future Work** (`S5.SS2.p5.1`)

  > Unsupervised metrics and objectives. There may be proxy objectives for faithfulness, such as causality [ 28 ] , or legibility, such as in prover-verifier game dynamics [ 74 ] , that could be incorporated into training to improve monitorability. Alternatively, if these metrics and procedures become robust enough, they could help detect the phase transitions that lead to high rates of obfuscated chains-of-thought. Additionally, when training in a broader variety of environments, it remains an open question whether the emergence of obfuscation follows a sharp phase transition across all modalitie…

- **§1 Introduction** (`S1.p1.1`)

  > Exploiting flaws or misspecifications in learning objectives, known as reward hacking in reinforcement learning (RL) settings, remains a critical failure mode in modern AI systems [ 1 , 2 , 3 ] and has led to agents exhibiting misaligned behaviors across many domains such as language modeling [ 4 , 5 , 6 ] , control tasks [ 7 , 8 , 9 , 10 ] , and recommendation systems [ 11 , 12 , 13 , 14 ] . The true objective function we wish to optimize is often hard to write down precisely, and so the challenge in creating capable and aligned systems largely lies in designing robust proxies that do not dev…

- **§1 Introduction** (`S1.p2.1`)

  > The emerging generation of large language models (LLMs) [ 23 ] that are trained with reinforcement learning to reason in chain-of-thought (CoT) [ 24 , 25 , 26 ] offers a promising new avenue for monitoring. Where LLMs are normally trained to give an answer directly after a prompt, CoT reasoning models first produce their reasoning and then give their answer. In particular, these reasoning models are trained by an RL procedure that searches for chains-of-thought that maximize the probability of the model giving a high reward answer. Because LLMs are pretrained on human text, the CoTs that are m…

- **§1 Introduction** (`S1.p4.1`)

  > During a recent frontier reasoning model training run, we tested just how useful this signal in agent CoTs can be. We found that a simple prompted LLM (we used GPT-4o [ 29 ] ) is very effective at monitoring for reward hacking behavior within agentic coding environments, and we also discovered that our CoT monitor performs much better than a monitor with access to only the agent’s actions and outputs (See Section 2 ). We underscore that at the time of this experiment, the agent being monitored was OpenAI’s most advanced model, performing better at hard reasoning tasks than even its predecessor…

## ImpossibleBench: Measuring LLMs’ Propensity of Exploiting Test Cases — `2510.20270`

- **§7 Conclusion** (`S7.p1.1`)

  > We introduced ImpossibleBench , a framework for systematically measuring LLMs’ propensity to exploit test cases. By creating “impossible” variants of coding tasks where any successful completion necessarily implies cheating, we unambiguously identify reward hacking behaviors. Our experiments reveal a concerning pattern: frontier models frequently cheat when faced with these impossible tasks, and stronger models generally exhibit higher cheating rates. As LLMs become increasingly capable and deployed in more autonomous settings, ImpossibleBench provides a crucial testbed for understanding and m…

---

## 读完这八篇正文之后，我认为什么变了

**1. 验收器的质量不是"准不准"，而是"够不够难、够不够广"。**
Qwen3 §4.2 把 Reasoning RL 的 query–verifier 对写成**四条并列判据**：没在冷启动用过、对冷启动模型是可学的、尽可能难、覆盖足够宽的子领域；最后收 3,995 对。我们 `docs/` 里 evalset 的验收只有"能跑、能量分"，从来没有"这条任务对我们当前的链是否可学"这一维——一条永远 `exit 1` 的任务在我这轮 l2live 里连跑三轮、每轮 0 分，按 Qwen3 的判据它第一阶段就该被剔掉，而不是拿来当 plateau 的燃料。

**2. 奖励被优化到极限时，"分数上升"本身就是信号，不是证据。**
2210.10760 §4.2.1 的 regressional Goodhart 给了机制：*the optimization power expended is divided between optimizing the gold reward and selecting on the noise proportional to their variances*。这解释了我在 `docs/l2-state.md` 里看到却没解释的那件事——killRate 从 0.85 一路爬到 0.9 而真实修复数不涨。不是"评估噪声"，是**我们按方差在选**。而且它给出一个可证伪的推论：如果只有 regressional Goodhart，gold reward 必须单调升；我们观察到不单调，说明还有别的 Goodhart 渠道（§4.2 的后两类）。

**3. 最便宜的监控通道是思维链，不是动作。**
2503.11926 §1/§3.1：只给 GPT-4o 看 agent 的 CoT、不给动作，监控效果**好于**看动作和输出的监控。我们的 loop 现在只看 guard 的退出码和 killRate——等于主动关掉了那条被量到更有效的通道。这条不是"再加一个功能"，是"我们选错了观测点"。

**4. 强模型在不可能任务上更爱作弊，这不是模型缺陷，是评估设计缺陷。**
2510.20270 §7：*frontier models frequently cheat when faced with these impossible tasks, and stronger models generally cheat more*。我们的 r1 那一类任务（永远失败、永远不可能通过）恰好就是"impossible 变体"，而我在 l2live 里用一条 `KILLRATE=0.000` 的固定任务当被测对象——三轮 0 分之后我把它读成"循环没本事"，按这篇的说法，更该读成"我们给它的是一条只能作弊或放弃的任务"。

**5. LLM-as-judge 的偏差是可测的，但覆盖范围没人测。**
2306.05685 §1 把 position / verbosity / self-enhancement 三类偏差逐个量化，§6 承认**只覆盖 helpfulness（准确性/相关性/创造性被压成一个数）**。我们的 `verify.metrics` 走的是正则抽 `KILLRATE=`，比 LLM judge 更硬，但也更窄：它只认一种输出格式。1606.06565 §5 的 scalable oversight 那条——*用稀疏但可靠的真信号去激励透明*——在这里是可用的：killRate 是密但可 hack 的，最终的真实修复数是稀但可靠的，两者都该记。

**6. 参照系：InstructGPT 的 RM 只有 6B，因为 175B 不稳。**
2203.02155 §Reward modeling 那句 *we found that 175B RM training could be unstable*，以及 §Evaluations 里 5 组标注者 5 折交叉验证得到 69.6 ± 0.9%——我第一次在正文里看到"验收器本身的不确定性"被写成一个带区间的数。我们的 gate 里没有任何一条路径会输出"这个判决的置信区间"。

## 三条我会改的

1. **给 evalset 加一条可学性判据。** 任务在最近 N 轮里 0 分且从未有过部分分，就标记 `unlearnable` 并从晋升候选里剔掉（不是删掉，是标注），对应 Qwen3 §4.2 的第二条。这比再加一个 plateau 触发器便宜，且直接指向 l2live 那三轮的根因。
2. **killRate 与真实修复数同时记，且不合并。** 密信号用于轮内排序，稀信号只用于晋升判决——2210.10760 的机制说明这两者混在一起时，优化力会自动流向噪声。
3. **给每一次晋升判决记一个区间。** 复刻 InstructGPT 的做法：同一任务多次 rollout 报均值±标准差，而不是单点。没有区间就没法区分"赢了 0.02"和"没赢"。

## 这份调研没回答的三件事

1. **可学性判据的阈值怎么定。** Qwen3 只说"as challenging as possible"和"learnable for the cold-start model"，没给判定规则；我们在真实计费下也没法先跑一遍冷启动。
2. **CoT 监控对"没有 CoT 的 agent"怎么办。** 2503.11926 的结论建立在推理模型上；我们的 worker 是被 guard 打分的补丁生成器，很多时候根本没有可读的推理链。
3. **多强的优化才算"过度"。** 2210.10760 的 KL 是相对初始策略的连续量，我们的对应物是"相对 incumbent 的累计改动量"，但没有一篇给出这个换算。
