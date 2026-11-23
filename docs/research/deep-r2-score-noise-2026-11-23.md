# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `variance`, `seed`, `noise`, `significance`, `confidence interval`, `pass@1`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Training language models to follow instructions with human feedback (`2203.02155`) | 87 | 2 | graded ok (depth full) |
| Evaluating Large Language Models Trained on Code (`2107.03374`) | 55 | 6 | graded ok (depth full) |
| Proximal Policy Optimization Algorithms (`1707.06347`) | 0 | 0 | unread: no rendered body: arXiv serves a pointer to the PDF |
| Direct Preference Optimization: Your Language Model is Secretly a Reward Model (`2305.18290`) | 33 | 4 | graded ok (depth full) |
| DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (`2402.03300`) | 47 | 5 | graded ok (depth full) |
| Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference (`2403.04132`) | 27 | 6 | graded ok (depth full) |
| LoRA: Low-Rank Adaptation of Large Language Models (`2106.09685`) | 41 | 4 | graded ok (depth full) |
| Training Verifiers to Solve Math Word Problems (`2110.14168`) | 21 | 1 | graded ok (depth full) |

## Training language models to follow instructions with human feedback — `2203.02155`

- **§Our models generalize to the preferences of "held-out" labelers that did not produce any training data.** (`S4.SS1.SSS0.Px2.p2.1`)

  > We see further evidence of this from the generalization capabilities of our reward models. We ran an experiment where we split our labelers into 5 groups, and train 5 RMs (with 3 different seeds) using 5-fold cross validation (training on 4 of the groups, and evaluating on the held-out group). These RMs have an accuracy of 69.6 ± \pm 0.9% on predicting the preferences of labelers in the held-out group, a small decrease from their 72.4 ± \pm 0.4% accuracy on predicting the preferences of labelers in their training set.

- **§5.2 Who are we aligning to?** (`S5.SS2.p6.1`)

  > Fourth, OpenAI’s customers are not representative of all potential or current users of language models—let alone of all individuals and groups impacted by language model use. For most of the duration of this project, users of the OpenAI API were selected off of a waitlist. The initial seeds for this waitlist were OpenAI employees, biasing the ultimate group toward our own networks.

## Evaluating Large Language Models Trained on Code — `2107.03374`

- **§2.1 Functional Correctness** (`S2.SS1.p4.1`)

  > Kulal et al. (2019) evaluate functional correctness using the pass@ k k metric, where k k code samples are generated per problem, a problem is considered solved if any sample passes the unit tests, and the total fraction of problems solved is reported. However, computing pass@ k k in this way can have high variance. Instead, to evaluate pass@ k k , we generate n ≥ k n\geq k samples per task (in this paper, we use n = 200 n=200 and k ≤ 100 k\leq 100 ), count the number of correct samples c ≤ n c\leq n which pass unit tests, and calculate the unbiased estimator

- **§2.1 Functional Correctness** (`S2.SS1.p6.1`)

  > Calculating this estimator directly results in very large numbers and numerical instability. In Figure 3 , we include a numerically stable numpy implementation that simplifies the expression and evaluates the product term-by-term. One may be tempted to estimate pass@ k k with 1 − ( 1 − p ^ ) k 1-(1-\hat{p})^{k} where p ^ \hat{p} is the empirical estimate of pass@1, but we show that it is biased in Appendix A .

- **§3.3 Results** (`S3.SS3.p3.1`)

  > In particular, for a 679M parameter model, the optimal temperature for pass@1 is T ∗ = 0.2 T^{*}=0.2 and the optimal temperature for pass@100 is T ∗ = 0.8 T^{*}=0.8 . With these temperatures, we find that pass@1 and pass@100 scale smoothly as a function of model size (Figure 6 ).

- **§3.4 Comparative Analysis of Related Models and Systems** (`S3.SS4.p2.1`)

  > We confirm these findings using the HumanEval dataset, showing that GPT-Neo achieves 6.4% pass@1 and 21.3% pass@100, while GPT models of comparable sizes achieve near 0% on both metrics. We see a remarkable progression in capabilities, with GPT-Neo-2.7B roughly equivalent to Codex-85M ( 30 × 30\times fewer parameters). Similarly, GPT-J-6B achieves 11.6% pass@1 and 27.7% pass@100, which is roughly equivalent to Codex-300M ( 20 × 20\times fewer parameters). Pass rates are obtained by taking the best result from evaluating at temperatures 0.2, 0.4, and 0.8 for GPT-Neo, and from temperatures 0.2 a…

- **§3.4 Comparative Analysis of Related Models and Systems** (`S3.SS4.p3.1`)

  > Finally, we benchmark Codex against the largest free model from Tabnine, a leading code autocomplete system, which achieves 2.6% pass@1 (at T = 0.4 T=0.4 ) and 7.6% pass@100 (at T = 0.8 T=0.8 ). This is roughly equivalent to Codex-12M, one of the smallest models in our suite.

- **§3.5 Results on the APPS Dataset** (`S3.SS5.p2.1`)

  > In the paper that introduces APPS, the authors benchmark a few language models and report two metrics: the percentage of problems where the model finds a correct solution (called the “strict accuracy”) and the percentage of unit tests passed, even if the solution is incorrect. The latter measure is reported only so as to reduce variance of the measurements, because the results on the first metric were so low. We avoid this metric and only focus on “strict accuracy”, and - as in the previous sections - we report pass@ k k numbers for various k k (Table 2 ). There are 2 additional factors, well-…

## Proximal Policy Optimization Algorithms — `1707.06347`

Not read: no rendered body: arXiv serves a pointer to the PDF

## Direct Preference Optimization: Your Language Model is Secretly a Reward Model — `2305.18290`

- **§3 Preliminaries** (`S3.p3.3`)

  > where σ \sigma is the logistic function. In the context of LMs, the network r ϕ ​ ( x , y ) r_{\phi}(x,y) is often initialized from the SFT model π SFT ​ ( y ∣ x ) \pi^{\text{SFT}}(y\mid x) with the addition of a linear layer on top of the final transformer layer that produces a single scalar prediction for the reward value [ 51 ] . To ensure a reward function with lower variance, prior works normalize the rewards, such that 𝔼 x , y ∼ 𝒟 ​ [ r ϕ ​ ( x , y ) ] = 0 \mathbb{E}_{x,y\sim\mathcal{D}}\left[r_{\phi}(x,y)\right]=0 for all x x .

- **§5.2 Instability of Actor-Critic Algorithms** (`S5.SS2.p1.2`)

  > This is the same objective optimized in prior works [ 51 , 40 , 1 , 28 ] using the DPO-equivalent reward for the reward class of r ϕ r_{\phi} . In this setting, we can interpret the normalization term in f ⁡ ( r ϕ , π ref , β ) f(r_{\phi},\pi_{\text{ref}},\beta) as the soft value function of the reference policy π ref \pi_{\text{ref}} . While this term does not affect the optimal solution, without it, the policy gradient of the objective could have high variance, making learning unstable. We can accommodate for the normalization term using a learned value function, but that can also be difficu…

- **§6.1 How well can DPO optimize the RLHF objective?** (`S6.SS1.p1.1`)

  > The KL-constrained reward maximization objective used in typical RLHF algorithms balances exploitation of reward while restricting the policy from deviating far from the reference policy. Therefore, when comparing algorithms, we must take into account both reward achieved as well as the KL discrepancy; achieving slightly higher reward but with much higher KL is not necessarily desirable. Figure 2 shows the reward-KL frontier for various algorithms in the sentiment setting. We execute multiple training runs for each algorithm, using a different hyperparameter for policy conservativeness in each…

- **§Acknowledgements** (`Sx1.p1.1`)

  > EM gratefully acknowledges funding from a Knight-Hennessy Graduate Fellowship. CF and CM are CIFAR Fellows. This work was supported in part by the Stanford Accelerator for Learning (SAL) and Stanford Institute for Human-Centered Artificial Intelligence (HAI) Generative AI for the Future of Learning seed grant program. The Stanford Center for Research on Foundation Models (CRFM) provided part of the compute resources used for the experiments in this work. This work was supported in part by ONR grant N00014-20-1-2675.

## DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models — `2402.03300`

- **§2.1 Data Collection and Decontamination** (`S2.SS1.p1.1`)

  > In this section, we will outline the process of constructing the DeepSeekMath Corpus from Common Crawl. As depicted in Figure 2 , we present an iterative pipeline that demonstrates how to systematically gather a large-scale mathematical corpus from Common Crawl, starting with a seed corpus (e.g., a small but high-quality collection of math-related dataset). It’s worth noting that this approach is also applicable to other domains, such as coding.

- **§2.1 Data Collection and Decontamination** (`S2.SS1.p2.1`)

  > First, we choose OpenWebMath ( Paster et al., 2023 ) , a collection of high-quality mathematical web texts, as our initial seed corpus. Using this corpus, we train a fastText model ( Joulin et al., 2016 ) to recall more OpenWebMath-like mathematical web pages. Specifically, we randomly select 500,000 data points from the seed corpus as positive training examples and another 500,000 web pages from Common Crawl as negative ones. We employ an open-source library 1 1 1 https://fasttext.cc for training, configuring the vector dimension to 256, learning rate to 0.1, the maximum length of word n-gram…

- **§2.1 Data Collection and Decontamination** (`S2.SS1.p3.1`)

  > After the first iteration of data collection, numerous mathematical web pages remain uncollected, mainly because the fastText model is trained on a set of positive examples that lacks sufficient diversity. We therefore identify additional mathematical web sources to enrich the seed corpus, so that we can optimize the fastText model. Specifically, we first organize the entire Common Crawl into disjoint domains; a domain is defined as web pages sharing the same base URL. For each domain, we calculate the percentage of web pages that are collected in the first iteration. Domains where over 10% of…

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p2.1`)

  > As the value function employed in PPO is typically another model of comparable size as the policy model, it brings a substantial memory and computational burden. Additionally, during RL training, the value function is treated as a baseline in the calculation of the advantage for variance reduction. While in the LLM context, usually only the last token is assigned a reward score by the reward model, which may complicate the training of a value function that is accurate at each token. To address this, as shown in Figure 4 , we propose Group Relative Policy Optimization (GRPO), which obviates the…

- **§5 Discussion** (`S5.T7.2.1`)

  > Training Setting Training Tokens MMLU BBH HumanEval (Pass@1) MBPP (Pass@1) General Code Math No Continual Training – – – 24.5% 28.1% 12.2% 13.0% Two-Stage Training Stage 1: General Training 400B – – 25.9% 27.7% 15.2% 13.6% Stage 2: Math Training – – 150B 33.1% 32.7% 12.8% 13.2% Stage 1: Code Training – 400B – 25.0% 31.5% 25.0% 40.0% Stage 2: Math Training – – 150B 36.2% 35.3% 12.2% 17.0% One-Stage Training Math Training – – 150B 32.3% 32.5% 11.6% 13.2% Code & Math Mixed Training – 400B 150B 33.5% 35.6% 29.3% 39.4%

## Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference — `2403.04132`

- **§2 Related Work** (`S2.p4.1`)

  > Human Preference Dataset. Owing to the significance of human preferences, several datasets and analyses exist that incorporate human preferences. These include OpenAssistant ( Köpf et al., 2023 ) , HH-RLHF ( Bai et al., 2022 ) , LMSYS-Chat-1M ( Zheng et al., 2023a ) , and synthetic approximations of human preferences like UltraFeedback ( Cui et al., 2023 ) and Nectar ( Zhu et al., 2023 ) . Our prior data release, LMSYS-Chat-1M ( Zheng et al., 2023a ) , is similarly collected via crowdsourcing. However, LMSYS-Chat-1M comprises solely conversations and lacks human preference data, rendering it u…

- **§4 From Pairwise Comparisons to Rankings** (`S4.p6.1`)

  > Although the BT model technically assumes a parametric form for the model win rates, the seminal results of Huber et al. (1967) ; White (1982) show that maximum likelihood estimators are still asymptotically normal even when these assumptions do not hold, so long as the so-called “sandwich” covariance matrix is used; see Section 5 for details, and see Appendix B for a nonparametric extension of the Bradley-Terry model. Finally, we remark that previous evolutions of our online interface have reported different ranking scores, such as the Elo score ( Elo, 1967 ) instead of the BT coefficients. W…

- **§5 Efficient Approximate Ranking** (`S5.p2.2`)

  > Note that 𝔼 ⁡ [ X t ​ ( a ) ] = θ ∗ ​ ( a ) \mathbb{E}[X_{t}(a)]=\theta^{*}(a) for all t t , and thus θ ^ T \hat{\theta}_{T} is an unbiased estimator of θ ∗ \theta^{*} . We will furthermore estimate the covariance matrix as

- **§5 Efficient Approximate Ranking** (`S5.p2.4`)

  > and we construct confidence intervals accordingly. For an understanding of the appropriate regularity conditions, see Durrett (2019) , Theorem 8.2.8, where condition (ii) is trivially satisfied so long as P t ​ ( a ) > ϵ > 0 P_{t}(a)>\epsilon>0 , and condition (i) is implied by the almost-sure convergence of P t ​ ( a ) P_{t}(a) to a limiting distribution P ⁡ ( a ) P(a) .

- **§5 Efficient Approximate Ranking** (`S5.p4.1`)

  > To compute confidence intervals on the BT coefficients, we employ two strategies: (1) the pivot bootstrap ( DiCiccio & Efron, 1996 ) , and (2) the “sandwich” robust standard errors outlined in Huber et al. (1967) (see also Freedman (2006) for an outline of the necessary technical assumptions). Ultimately, based on the results of a simulation study described in Appendix A , we choose to deploy the sandwich intervals due to their smaller size in large samples.

- **§5 Efficient Approximate Ranking** (`S5.p5.2`)

  > we extract an approximate ranking R m = 1 + ∑ m ′ ∈ [ M ] 𝟙 { inf 𝒞 m ′ > sup 𝒞 m } R_{m}=1+\sum_{m^{\prime}\in[M]}\mathds{1}\left\{\inf\mathcal{C}_{m^{\prime}}>\sup\mathcal{C}_{m}\right\} . The uniform validity of 𝒞 \mathcal{C} directly implies that ℙ ( ∃ m : R m > rank ( ℙ ) m ) ≤ α \mathbb{P}(\exists m:R_{m}>\rank(\mathbb{P})_{m})\leq\alpha —i.e., with high probability, no model’s performance is understated. A guarantee on the other side—that no model’s performance is overstated—is possible by interchanging the inf \inf and sup \sup . To get the uniform confidence set, we construct the…

## LoRA: Low-Rank Adaptation of Large Language Models — `2106.09685`

- **§5.5 Scaling up to GPT-3 175B** (`S5.SS5.p1.1`)

  > As a final stress test for LoRA, we scale up to GPT-3 with 175 billion parameters. Due to the high training cost, we only report the typical standard deviation for a given task over random seeds, as opposed to providing one for every entry. See Section D.4 for details on the hyperparameters used.

- **§7.2 What is the Optimal Rank r r for LoRA?** (`S7.SS2.p2.1`)

  > Table 6 shows that, surprisingly, LoRA already performs competitively with a very small r r (more so for { W q , W v } \{W_{q},W_{v}\} than just W q W_{q} ). This suggests the update matrix Δ ​ W \Delta W could have a very small ‘‘intrinsic rank”. 6 6 6 However, we do not expect a small r r to work for every task or dataset. Consider the following thought experiment: if the downstream task were in a different language than the one used for pre-training, retraining the entire model (similar to LoRA with r = d m ​ o ​ d ​ e ​ l r=d_{model} ) could certainly outperform LoRA with a small r r . To…

- **§7.2 What is the Optimal Rank r r for LoRA?** (`S7.SS2.p8.1`)

  > Since both A r = 8 A_{r=8} and A r = 64 A_{r=64} are learned using the same pre-trained model, Figure 3 indicates that the top singular-vector directions of A r = 8 A_{r=8} and A r = 64 A_{r=64} are the most useful, while other directions potentially contain mostly random noises accumulated during training. Hence, the adaptation matrix can indeed have a very low rank.

- **§7.2 What is the Optimal Rank r r for LoRA?** (`S7.SS2.p9.1`)

  > Subspace similarity between different random seeds. We further confirm this by plotting the normalized subspace similarity between two randomly seeded runs with r = 64 r=64 , shown in Figure 4 . Δ ​ W q \Delta W_{q} appears to have a higher “intrinsic rank” than Δ ​ W v \Delta W_{v} , since more common singular value directions are learned by both runs for Δ ​ W q \Delta W_{q} , which is in line with our empirical observation in Table 6 . As a comparison, we also plot two random Gaussian matrices, which do not share any common singular value directions with each other.

## Training Verifiers to Solve Math Word Problems — `2110.14168`

- **§5.2 Regularization** (`S5.SS2.p2.1`)

  > We first investigate the effect of dropout on finetuning across various training set sizes. Figure 8(a) shows that dropout leads to a significant improvement over baseline. We next investigate the effect of dropout on verifiers, considering both the solution-level and token-level variants. In Figure 8(b) , we see that dropout significantly improves solution-level verifiers, mitigating the overfitting that occurs in the unregularized baseline. Notably, using dropout with solution-level verifiers reaches a similar level of performance as token-level verifiers. In Figure 8(c) , we apply dropout t…

---

## 读完这八篇正文之后，我认为什么变了

**1. pass@k 的"高方差"是论文里写明的，不是我的猜测。**
2107.03374 §2.1 原话：*computing pass@ k in this way can have high variance*，所以他们改用无偏估计并给了数值稳定的实现。我们 `src/gate/score.js` 的 killRate 就是"一次 run 里通过的比例"，等价于论文里被点名抛弃的那种朴素估计。**这不是"我们可以以后再改"，是我们用了被原作者换掉的估计量。**

**2. 最优温度本身随 k 变化，说明"一个配置一个数"没有意义。**
同上 §3.3：679M 模型 pass@1 的最优温度 T*=0.2，pass@100 的最优温度 T*=0.8。同一模型、同一任务，只是取样口径不同，最优配置就反了。我们每轮只取一次样，所以"这条链更好"永远是在一个未标定的温度点上说的。

**3. 排行榜的置信区间是可以算的，而且算法早就公开。**
2403.04132 §5 给了两条：pivot bootstrap 与 sandwich 稳健标准误；并且给出近似排名公式 R_m = 1 + Σ 1{inf C_m' > sup C_m}——**只有当两个区间完全分离时才敢说名次**。我们 `decidePromotion` 的 `noiseSpread` 是拍出来的阈值，不是区间；按这篇的规则，"A 比 B 好 0.02"在同区间时连名次都不该报。

**4. 验收器自己的准确率也是有区间的。**
2203.02155 的 reward modeling 段：5 组标注者 5 折交叉验证，RM 准确率 **69.6 ± 0.9%**，并且明说 175B RM 不稳所以只用 6B。我们 gate 里没有任何一处输出"这个判决的置信度"——判决被当成布尔值用。

**5. 「只报典型标准差」是一种被容忍的省略，不是标准。**
2106.09685 §5.5 直说：因为训练太贵，GPT-3 175B 那档**只报随机种子的典型标准差**，而不是每格都报。我们 `docs/l2-state.md` 里那两场 halving 对比（$0.035567 vs $0.029309，差 21%）连"典型标准差"都没有，却已经被我写成了"halving 省了钱"。

**6. DPO 提醒：比分数时不能只比分。**
2305.18290 §6.1：*achieving slightly higher reward but with very different KL divergence from the reference policy is not a fair comparison*。我们比的是"这条链 vs incumbent"，但没有把"离 incumbent 多远"记成一个量——改了三个参数的链和改了一个参数的链，增益被当成同一种东西比较。

## 三条我会改的

1. **killRate 换成无偏估计并报区间。** 至少把 2107.03374 的数值稳定写法抄过来；每轮记 `killRate ± se`，`noiseSpread` 改成"区间是否分离"的判据，而不是固定阈值。
2. **把"离 incumbent 的距离"记成一个数。** 对应 DPO 的 KL 项：改动涉及的参数个数/字符数，与增益并列写进 `gate.evaluated`，让"同样 +0.02，改动小一半"这件事可见。
3. **诚实撤回 `docs/l2-state.md` 里那 21% 的结论**，改成"两次单点观测的差，未标定噪声，不足以支持结论"。

## 这份调研没回答的三件事

1. **多少次 rollout 才够。** 2107.03374 给的是估计量不是样本量；2203.02155 用 5 折；两篇都没给"我们的预算下该跑几次"的判据。
2. **killRate 的方差与 pass@1 的方差是否同构。** 我们量的是"一个任务内通过比例"，它们是"跨任务通过率"，两者的方差来源不同，不能直接套公式。
3. **非平稳环境下的区间怎么算。** 我们的 incumbent 每轮可能被替换，而 bootstrap 假设分布不变；文献里没有"边优化边估区间"的做法。
