# Deep reading: what the bodies actually say

Generated 2026-11-23 23:11 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `budget`, `stopping`, `sequential`, `confidence`, `interval`, `power`, `sample`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| How Many Tasks Are Enough for Agent Benchmark Decisions? A Replay Analysis of Public LLM Agent Benchmarks (`2607.12338`) | 42 | 6 | graded ok (depth full) |
| You Don’t Need to Run Every Eval Yuchen Zeng & Dimitris Papailiopoulos (`2606.24020`) | 107 | 6 | graded ok (depth full) |
| Efficient Evaluation of LLM Performance with Statistical Guarantees (`2601.20251`) | 37 | 6 | graded ok (depth full) |
| Cost-Optimal Active AI Model Evaluation (`2506.07949`) | 44 | 6 | graded ok (depth full) |
| Confident Rankings with Fewer Items: Adaptive LLM Evaluation with Continuous Scores (`2601.13885`) | 45 | 6 | graded ok (depth full) |
| PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents (`2606.08106`) | 30 | 6 | graded ok (depth full) |

## How Many Tasks Are Enough for Agent Benchmark Decisions? A Replay Analysis of Public LLM Agent Benchmarks — `2607.12338`

- **§Stopping Rules and Deferral** (`S2.SSx3.p1.1`)

  > Sequential testing and confidence sequences provide tools for stopping under uncertainty ( Wald, 1945 ; Howard et al., 2021 ) . Selective prediction and learning to defer address settings in which a system withholds a prediction or routes a decision to another decision maker ( Geifman and El-Yaniv, 2019 ; Mozannar and Sontag, 2020 ) . Conformal risk control studies calibrated risk constraints under explicit assumptions ( Angelopoulos et al., 2022 ) .

- **§1. Introduction** (`S1.p7.1`)

  > We therefore analyze completed benchmark records by replaying partial task runs. The task set, systems, and task outcomes are fixed; what varies is which tasks have been observed before the budget is exhausted. The target is the full-benchmark decision induced by the completed record. Claims about future tasks, population-level sampling, or formal online stopping require a different model.

- **§Estimating Scores With Less Evaluation** (`S2.SSx1.p2.1`)

  > Several statistical tools fit that score-estimation goal. Cer-Eval frames test-data sufficiency through confidence intervals for LLM evaluation ( Wang et al., 2025 ) . FAQ gives confidence intervals for performance estimates under a finite population view of benchmark evaluation ( Wu et al., 2026 ) . Finite-population inequalities for sampling without replacement and stratified allocation give tools for partial benchmark use ( Serfling, 1974 ; Neyman, 1934 ) .

- **§Estimating Scores With Less Evaluation** (`S2.SSx1.p3.1`)

  > Those methods are useful when the target is a mean score or a confidence interval. Our target is whether a partial task set supports the same pairwise decision as the completed benchmark. A score interval can inform that decision, but it does not specify the whole decision policy: what threshold matters, what task groups must be covered, which decision errors are acceptable, or how often the evaluator may withhold a final decision. We therefore report decision errors, task-group coverage, and unresolved comparisons in addition to partial scores.

- **§Stopping Rules and Deferral** (`S2.SSx3.p2.1`)

  > Our use of deferral is narrower. In this paper, deferral means that a partial policy leaves the comparison unresolved at the budget. Because a completed benchmark record is replayed under partial observation, the measurement target is not online stopping or population risk control. It is whether a partial run preserves the completed benchmark’s pairwise decision under stated coverage and targets on unresolved comparisons.

- **§Replay outcomes.** (`S3.SSx1.SSS0.Px4.p2.1`)

  > Together, these quantities define what the replay measures for a completed benchmark record. For a fixed completed record, threshold, budget, and policy, we average the policy’s output over sampled task orders and ordered system pairs.

## You Don’t Need to Run Every Eval Yuchen Zeng & Dimitris Papailiopoulos — `2606.24020`

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > We show what BenchPress enables for model evaluation. (i) We select compact probe sets that recover a model’s scorecard under an evaluation budget: even when restricted to a low-cost benchmark allowlist, five probes lead to pooled MedAE of 4.55 4.55 score points ( Section 5.1 ). (ii) We verify ranking preservation : allowing a five-point margin on the true scores, completed scores by BenchPress preserve 92.1 % 92.1\% of pairwise model rankings on the same benchmark ( Section 5.2 ). (iii) We stress-test predictions on newly released models : across 27 target models, each predicted from a traini…

- **§1 Introduction** (`S1.I1.i4.p1.1`)

  > We characterize when predictions should be trusted. We first identify what makes a score easier or harder to predict: target-model and target-benchmark coverage, the availability of similar peer models and neighboring benchmarks, and recency of training anchors. We combine these factors with disagreement among several score predictors to estimate the reliability of each BenchPress prediction. This produces a trust probability and a conformally calibrated 90 % 90\% prediction interval ( Section 6 ).

- **§3 The Score Matrix and Its Geometry** (`S3.I1.i1.p1.1`)

  > Evaluation heterogeneity. Scores come from vendor reports and independent third parties and may differ in prompting strategy, reasoning budget, sampling temperature, evaluation harness, benchmark version, and evaluation date. Vendor-reported scores may be optimistically biased relative to independent reproductions. Even with identical prompts, non-deterministic decoding can change scores by 1 to 3 points across runs, while different harnesses can shift the same benchmark score by more than 5 points ( biderman2024 ) .

- **§5 What BenchPress Enables for Model Evaluation** (`S5.p1.1`)

  > With the default score predictor fixed, we now evaluate what BenchPress enables across realistic model-evaluation tasks. Three questions guide this section. First , under a fixed evaluation budget, which probe benchmarks should a practitioner run so that BenchPress best recovers the model’s scorecard ( Section 5.1 )? Second , do BenchPress ’s predicted scores preserve same-benchmark model rankings well enough that practitioners can use them to compare models ( Section 5.2 )? Third , when a brand-new model is released after the matrix was assembled, can BenchPress still produce useful predictio…

- **§Experiment setting.** (`S5.SS1.SSS0.Px1.p1.1`)

  > We simulate a practitioner who evaluates each target model on a fixed probe set and then asks BenchPress to complete the rest of that model’s public scorecard. For a target model, only the probe columns remain visible in its row; all other models keep their observed rows. We evaluate every observed model-benchmark cell at every budget, so the denominator is fixed across probe-set sizes. Observed probe cells are counted as exact predictions with zero error, and all remaining observed cells for the target model are predicted from the masked matrix. Thus the curves measure how much of the current…

- **§5 What BenchPress Enables for Model Evaluation** (`S5.I1.i3.p1.1`)

  > Random baseline: we run 10 seeds. Each seed draws one global random benchmark ordering, and each budget uses the corresponding prefix for every target model. The plotted line is the mean across seeds; the shaded band is the 25th–75th percentile range.

## Efficient Evaluation of LLM Performance with Statistical Guarantees — `2601.20251`

- **§1 Introduction** (`S1.p5.1`)

  > We also assume access to historical data H ∈ { 0 , 1 , NA } N old × N q H\in\{0,1,\text{NA}\}^{N_{\text{old}}\times N_{q}} from N old N_{\text{old}} prior models (e.g., previously benchmarked and/or observed in deployment), potentially with many missing entries (i.e., NA) due to resource and deployment constraints. Here, H i ​ j H_{ij} records historical model i i ’s outcome on question j j : 1 1 for correct, 0 0 for incorrect, and NA for unobserved. Given a new model and budget n b n_{b} , the problem is: how should we adaptively select which n b n_{b} questions to query so as to construct a…

- **§3.2 Pro-Active Inference** (`S3.SS2.p5.2`)

  > where randomness arises solely from adaptive question selection. Although the theorem is stated for a sequence of problem instances, we observe a single one in practice. Consequently, Theorem 3.1 implies that the above CI attains coverage at approximately the nominal level 1 − α 1-\alpha for sufficiently large problem sizes. 4 4 4 Nonasymptotic confidence intervals can also be constructed using martingale concentration inequalities, but straightforward approaches can be prohibitively conservative. For example, applying Azuma-Hoeffding under our hybrid sampling policy (c.f. Section 3.5 ) with t…

- **§4 Experimental Setup** (`S4.p8.1`)

  > Metrics We evaluate (a) coverage and (b) effective sample size (ESS). For each setting, we run 100 100 random seeds for each of 2.2 2.2 K test models. In each seed/model, methods output Wald intervals of the form [ θ ^ method ± 1.96 ​ σ ^ method ] [\hat{\theta}_{\text{method}}\pm 1.96\hat{\sigma}_{\text{method}}] (clipped to be in [ 0 , 1 ] [0,1] ), where σ ^ method \hat{\sigma}_{\text{method}} is computed via the method’s plug-in variance formula at budget n b n_{b} . Coverage is computed as the fraction of intervals containing θ \theta , averaged over models and seeds. ESS at budget n b n_{b…

- **§2 Related Work** (`S2.p2.1`)

  > Active statistical inference For model-free asymptotic frequentist coverage, FAQ builds on active statistical inference ( Zrnic and Candès, 2024 ; Gligorić et al., 2025 ) , which uses machine learning predictions over unlabeled covariates to adaptively select labels under a fixed budget and construct CIs. Our benchmark setting, however, provides no explicit covariates, so we use the factor model to construct latent features to guide adaptive query selection. Moreover, unlike sequential active inference---which, in a pre-specified ‘‘nature’s order" stream, can only make label/skip decisions for…

- **§3.2 Pro-Active Inference** (`S3.SS2.p4.1`)

  > Pro-Active Inference estimator Fix a query budget n b n_{b} . At each round t = 1 , … , n b t=1,\dots,n_{b} , we sample a question I t ∈ { 1 , … , N q } I_{t}\in\{1,\dots,N_{q}\} from an adaptive distribution q t ​ ( ⋅ ) q_{t}(\cdot) , 3 3 3 To support Assumptions A.1 – A.2 for Theorem 3.1 we require sampling with replacement. Appendix B discusses how ad-hoc without-replacement variants can fail to yield valid coverage. query the new model, and observe label z I t ∈ { 0 , 1 } z_{I_{t}}\in\{0,1\} . We define the Pro-Active Inference (PAI) estimator θ ^ n b \hat{\theta}_{n_{b}} :

- **§4 Experimental Setup** (`S4.p6.1`)

  > Baselines Let p ¯ j \overline{p}_{j} be the mean of the observed outcomes in H H for question j j 8 8 8 If question j j is never observed in H H (e.g., when 0.1 % 0.1\% entries in H H are observed), we impute p ¯ j \overline{p}_{j} with H H ’s global mean. , used as a proxy for question difficulty. For each budget/missingness setting, we compare against model-assisted, design-based AIPW estimators for finite-population inference, using established sequential sampling schemes from survey sampling and active inference. Unlike FAQ/PAI, these baselines follow nature’s order : questions arrive in a…

## Cost-Optimal Active AI Model Evaluation — `2506.07949`

- **§2.1 Basic notation** (`S2.SS1.p2.1`)

  > We consider a sequential setting: for every t ∈ ℕ t\in\mathbb{N} , we observe X t X_{t} drawn i.i.d. from the distribution P X P_{X} and G t ∼ P G | X G_{t}\sim P_{G\mid X} . Upon observing X t X_{t} , we then have the option of also querying H t ∼ P H | X H_{t}\sim P_{H\mid X} . Our objective is to estimate θ ∗ = 𝔼 ⁡ [ H ] \theta^{*}=\mathbb{E}[H] , the mean target rating. To this end, we develop estimators that efficiently sample only the data points for which H t H_{t} is needed, and stop sampling after a certain budget is exhausted. Define the binary random variable ξ t ∼ Bern ( π t ​ ( X…

- **§4.3 Results** (`S4.SS3.p1.1`)

  > Figure 2 shows results for the Chatbot Arena datasets using the transfer approach (A1), while Figure 3 shows results for all datasets using the burn-in approach (A2). 1 1 1 We also apply power tuning [ 2 ] after all samples are collected. See Appendix B.2 for details. As expected, the absolute improvement for both π active \pi_{\mathrm{active}} over π random \pi_{\mathrm{random}} and π random \pi_{\mathrm{random}} over π base \pi_{\mathrm{base}} is greatest in the transfer setting in Figure 2 , where the parameters of π random \pi_{\mathrm{random}} and π active \pi_{\mathrm{active}} can be app…

- **§Related work.** (`S1.SS0.SSS0.Px1.p1.1`)

  > Prediction-powered inference (PPI) [ 1 ; 2 ; 33 ] is the technique of combining a small number of trusted observations with predictions from a machine learning system for the purpose of statistical estimation. Its core statistical principles are closely related to control variate estimators [ 5 ; 23 ] as well as semi-parametric inference with missing data [ 7 ; 24 ; 27 ] . Recently, a body of work has explored applying PPI to the evaluation of GenAI systems, where human annotations are combined with "autorater" outputs [ 4 ; 6 ; 12 ; 13 ; 25 ] ; though it has also been noted that the sample ef…

- **§2.1 Basic notation** (`S2.SS1.p3.1`)

  > These functions describe the mean squared error and expected cost of the estimator with annotation policy π \pi as a function of time, and our goal will be to minimize one subject to a constraint on the other. When we refer to a budget on the cost, it will be denoted as B B . Furthermore, we note that, for convenience, the cost-optimized policies that we present in the remainder of this section will relax the constraint that the stopping time T stop T^{\rm stop} at which 𝖢𝗈𝗌𝗍 T stop ​ ( π ) \mathsf{Cost}_{T^{\rm stop}}(\pi) is just under budget must be an integer, though this does not have…

- **§2.3 Optimal active annotation** (`S2.SS3.p3.1`)

  > While the form of π active \pi_{\mathrm{active}} is more complex than that of π random \pi_{\mathrm{random}} , it still admits a fairly straightforward interpretation: for some confidence threshold τ ∗ \tau^{*} below which the conditional mean squared error of G G over all confident data points with u ⁡ ( x ) ≤ τ ∗ \sqrt{u(x)}\leq\tau^{*} is sufficiently low, we sample proportional to u ⁡ ( x ) \sqrt{u(x)} . On the remaining highly uncertain examples where u ⁡ ( x ) > τ ∗ \sqrt{u(x)}>\tau^{*} , we always use H H , and ignore G G . The exact threshold τ ∗ \tau^{*} depends on the distributions o…

- **§1 Introduction** (`S1.p3.1`)

  > We derive these optimal policies via new technical extensions and combinations of modern techniques in statistics, namely, active statistical inference [ 32 ] and prediction-powered inference [ 1 ; 2 ; 33 ] . Building on this foundation, we test and analyze empirical approximations to these optimal policies. Our experiments demonstrate promising results for implementing cost-optimal active evals in practice, although we also highlight important practical challenges that naturally arise due to "cold-start" issues, as well as imperfections of existing autorater models and their uncertainty estim…

## Confident Rankings with Fewer Items: Adaptive LLM Evaluation with Continuous Scores — `2601.13885`

- **§Adaptive stopping.** (`S6.SS0.SSS0.Px2.p1.1`)

  > Traditional CAT terminates when each model’s standard error falls below a threshold ϵ \epsilon , regardless of how the models compare. We instead terminate when all adjacent pairs in the current ranking satisfy P ⁡ ( θ i > θ j ) > 1 − 1 − γ 2 P(\theta_{i}>\theta_{j})>1-\frac{1-\gamma}{2} or P ⁡ ( θ i > θ j ) < 1 − γ 2 P(\theta_{i}>\theta_{j})<\frac{1-\gamma}{2} , corresponding to a two-sided confidence interval at level γ \gamma , or we reach a maximum item budget n max n_{\text{max}} . This focuses testing effort where it matters: models that are clearly separated require fewer items to estab…

- **§Algorithm.** (`S6.SS0.SSS0.Px4.p1.1`)

  > The complete procedure combines continuous CAT estimation with pairwise stopping and cost-aware allocation under a total budget constraint. Rather than allocating a fixed maximum number of items per model, we specify a total cost budget B B that can be flexibly distributed across models. After a warm-up phase that administers initial items to all models via MFI selection, the algorithm iteratively identifies uncertain pairs, selects the most cost-effective model to test, chooses the maximally informative item for that model, and updates posteriors. Testing continues until either all adjacent p…

- **§Budget.** (`S7.SS1.SSS0.Px1.p1.1`)

  > We set B B to the cost equivalent of 20 items per model. At this budget the adaptive ranker is in a budget-constrained regime: its pairwise-confidence stopping rule would naturally fire at roughly 30–100 items per model depending on dataset. Appendix D traces ranking quality as a function of B B and shows that adaptive outperforms random sampling across the small-to-mid budget regime that motivates this work, with the gap shrinking as B B approaches full evaluation.

- **§7.3 Tie Detection** (`S7.SS3.p2.1`)

  > Table 3 presents tie detection performance of the adaptive ranker against ground-truth ties derived from bootstrap confidence intervals on full evaluation. The adaptive ranker is consistently conservative: Adapt Tie% exceeds GT Tie% for all metrics. Tie detection recall is high (0.76–1.00), which means that our method catches most ground-truth ties. For pairs where one model is ranked strictly higher than the other, overall accuracy is 99%. TruthfulQA BERTScore reports 98% ties because all models score within a 0.7% range, and the differences are too small to resolve within the budget constrai…

- **§1 Introduction** (`S1.p6.1`)

  > We validate our approach on five generation benchmarks that span summarization (GovReport, BioLaySumm2025), named entity recognition (Nemotron PII), question answering (TruthfulQA) and translation (FLORES). For each dataset, we evaluate 5 disjoint sets of 4 hold-out models and multiple metric types (ROUGE, BLEU, BERTScore, COMET, readability indices, LLM-as-judge). Our adaptive ranker achieves 0.75 Kendall’s τ \tau correlation with ground-truth rankings while using only 2% of the full evaluation budget at evaluation time, outperforming random sampling by 0.13 τ \tau . This figure excludes the…

- **§6 Adaptive Ranker** (`S6.p1.1`)

  > Standard CAT runs each model independently until its own standard error falls below the fixed precision threshold ϵ \epsilon introduced in § 4 . However, when model ranking is the main goal and θ ^ \hat{\theta} values are an intermediate quantity used to place all models on a shared scale, this is inefficient: a model whose ability lies several standard errors above the next-best receives the same item budget as two models within half a standard error of each other, even though only the latter pair requires further testing to establish their relative order. We propose an adaptive multi-model r…

## PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents — `2606.08106`

- **§Guarantee.** (`S4.SS0.SSS0.Px3.p1.1`)

  > The control is anytime-valid. Let w 1 , w 2 , … w_{1},w_{2},\dots be the discordant-pair outcomes in evaluation order and ℱ i = σ ⁡ ( w 1 , … , w i ) \mathcal{F}_{i}=\sigma(w_{1},\dots,w_{i}) . Under the null H 0 H_{0} that the candidate is not better—so Pr ⁡ [ w i = 1 ∣ ℱ i − 1 ] ≤ 1 2 \Pr[w_{i}{=}1\mid\mathcal{F}_{i-1}]\leq\tfrac{1}{2} —the wealth E i = ∏ j ≤ i ( 1 + λ ⁡ ( 2 ​ w j − 1 ) ) E_{i}=\prod_{j\leq i}\bigl(1+\lambda(2w_{j}{-}1)\bigr) is a nonnegative supermartingale with E 0 = 1 E_{0}{=}1 and 𝔼 H 0 ​ [ E i ] ≤ 1 \mathbb{E}_{H_{0}}[E_{i}]\leq 1 . For the commit time τ = inf { i : E…

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > A method (PACE). We propose PACE , an anytime-valid commit gate: a training-free wrapper that compares each candidate to the incumbent on identical instances and commits only when a testing-by-betting e-process clears a calibrated threshold, stopping early to minimize evaluations (§ 4 ). The method is deliberately simple—a single paired sequential test, ∼ 10 {\sim}10 lines—and applies to any self-modification loop whose incumbent and candidate can be scored on shared instances (binary correctness, or pairwise preferences), consuming only those paired outcomes rather than the proposer’s interna…

- **§Why the obvious fixes fall short.** (`S3.SS0.SSS0.Px3.p1.1`)

  > This is a textbook case of adaptive data analysis : reusing one validation set to steer a long, data-dependent sequence of choices invalidates its naive estimates and inflates false discoveries ( Dwork et al., 2015 ; Blum and Hardt, 2015 ) . The standard remedies sit poorly in an autonomous loop. A larger dev set only postpones the problem—its noise shrinks as 1 / n 1/\sqrt{n} while the number of adaptive comparisons grows with the run. A fixed multiplicity correction (Bonferroni or α \alpha -spending) must know the number of tests in advance, which an open-ended run does not, and spends its b…

- **§Testing by betting.** (`S4.SS0.SSS0.Px2.p1.2`)

  > Under the null 𝔼 ⁡ [ 2 ​ w i − 1 ] = 0 \mathbb{E}[2w_{i}-1]=0 , so E E is a nonnegative martingale with 𝔼 ⁡ [ E ] = 1 \mathbb{E}[E]=1 ; by Ville’s inequality Pr [ sup t E t ≥ 1 / α ] ≤ α \Pr[\sup_{t}E_{t}\geq 1/\alpha]\leq\alpha ( Shafer, 2021 ; Ramdas et al., 2023 ) . We therefore commit as soon as E ≥ 1 / α E\geq 1/\alpha , which controls the false-commit probability at level α \alpha at any stopping time . Because the test is anytime-valid, we may evaluate instances incrementally and stop the moment the evidence is conclusive; if the evaluation budget is exhausted without crossing the thr…

- **§When (not) to use it.** (`S6.SS0.SSS0.Px1.p1.1`)

  > The price of the gate’s safety is power, and that power scales with effect size: a large true gain crosses the e-process threshold in a handful of discordant pairs, a marginal gain needs many, and a gain too small for the evaluation budget to resolve is rejected—exactly the milder-handicap case, where the gate kept 78 % 78\% of a + 0.18 {+}0.18 improvement rather than all of it. The gate is therefore the wrong tool when genuine gains are expected to be tiny and a missed improvement is costlier than a wrongly committed one; there, a higher α \alpha or a larger dev budget trades precision back f…

- **§Sequential and anytime-valid testing.** (`S2.SS0.SSS0.Px4.p1.1`)

  > PACE draws on safe, anytime-valid inference: e-processes and testing-by-betting yield nonnegative martingales whose maxima are controlled by Ville’s inequality, enabling tests that remain valid under optional stopping ( Wald, 1947 ; Shafer, 2021 ; Ramdas et al., 2023 ) ; online error-control procedures bound error over streams of tests ( Ramdas et al., 2017 ) . We import this machinery into the agent self-evolution loop, where, to our knowledge, commit decisions are currently made by unguarded point estimates.

---

# r10-eval-budget: 六个正文之后

这一份写的不只是这六篇，而是这六篇对前面九份的意义。它的由来是个具体问题：R3（预算与停止）在八个方向里最孤立，与其余方向的共享只有 12/122，中位引文年份 2019，而别的方向是 2024–2025。当时的结论是「做预算分配需要在三件事上同时成立：分数可分辨、保真度单调、两个刻度同源，而 agent 评估一条都不满足」。

这一轮加了一个方向去查同一件事：**评估预算与评估可靠性这两个词条，在 agent 的文献里有没有合流。** 答案是有，而且合流得比 R3 那边热闹得多。

## 一、这批论文在说什么（按主题归并）

**第一组：把「晋升」重写成假设检验——这是我们最该抄的一篇。** `2606.08106` PACE 的原话几乎是在描述我们的 `round.js`：「In practice the answer is overwhelmingly the same heuristic: measure the candidate on a small held-out set and keep it if the score went up.」它的诊断更狠：「Applied hundreds of times against the same noisy dev estimate, the ubiquitous 'keep it if the score went up' rule is uncontrolled adaptive multiple testing: the agent effectively p-hacks itself.」（§1 Introduction）它给的替代是一个测试套保的线上赌注（testing by betting）：把候选与在位者在**同一批实例**上配对比较，只数不一致的对（discordant pairs），财富过程 `E_i = ∏_{j≤i}(1 + λ(2w_j − 1))`，由 Ville 不等式 `Pr[sup_t E_t ≥ 1/α] ≤ α` 得到「随时可以停、随时报」的假阳性保证，`E ≥ 1/α` 即接受（§Guarantee / §Testing by betting）。代价写在明处：「The price of the gate's safety is power… a gain too small for the evaluation budget to resolve is rejected」，温和改进（+0.18）只保住 78%（§When (not) to use it）。在 Qwen2.5 0.5B–3B × GSM8K/SVAMP/ARC-Challenge 上，贪心规则（分数涨了就留）**30–42% 的 commit 是假的，其中 10–33% 反而有害**。

**第二组：省评估的三个正交杠杆——省在哪些实例上、省在哪些模型上、省到多少就停。** `2506.07949` 研究「问哪个样本」，把主动推断（active statistical inference）扩展到有标注成本的情形：策略 `π_t` 决定这一条要不要花钱标注，目标是「在成本约束下最小化 MSE」或反之（§2.1）。`2601.20251` FAQ 研究「借历史」，用已完成模型的答案矩阵加因子模型做插补，低预算区间 CI 更窄；它自己承认边界：「The sequential ablation can match or outperform FAQ at larger budgets」（§5）。`2601.13885` 研究「停在哪」，把 CAT 的停表从「每个模型的标准误低于 ε」改成「所有相邻对的 `P(θi > θj)` 越过 `1 − (1−γ)/2`」——停的判据是**排序是否已经分开**，不是每个估计各自是否精确（§Adaptive stopping）；预算 B 定为每模型 20 个条目。三个杠杆叠起来才是「用更少的钱得到同一个决定」。

**第三组：把「决定」本身当成一等公民——accept / reject / defer 三态。** `2607.12338` 把已完成 benchmark 的记录重放，看部分观测下的策略能否复现完整记录给出的**成对决定**，输出三态（accept / reject / defer）。它最有用的一句是划界：「A score interval can inform that decision, but it does not specify the whole decision policy: what threshold matters, what task groups must be covered, which decision errors are acceptable」（§Estimating Scores With Less Evaluation）。也就是：区间是**输入**，决定策略是另一件东西，而我们仓库里两者是混在一起的（`score` 与 `promote` 的判据分散在 `round.js` 与 `gate.js` 两处，见规格 §2 陷阱一）。

**第四组：整张记分卡可以被少量探针恢复——但只在有同类模型与相邻基准可借时。** `2606.24020` BenchPress 用 5 个探针基准恢复模型记分卡，pooled MedAE **4.55 分**，5 分容差下排序保持 **92.1%**（§1）。它同时给了两条我们必须听的限制：一是「non-deterministic decoding can change scores by **1 to 3 points** across runs」（§3），二是可信度依赖「target-model and target-benchmark coverage, the availability of similar peer models and neighboring benchmarks, and recency of training anchors」（§1）——这三样我们都不具备：一个战役里只有一个任务集、没有同类模型可借、也没有「相邻基准」。

**第五组：方差修正能把样本量降一到两个数量级，但前提是有可靠的基线估计器。** `2608.06362` AV-AIVAT 在 15 个 LLM agent 配置、71,439 手 HUNL 上，用 AIVAT 做方差修正后中位需要 **54×** 更少样本，再加 confidence sequence 到 **74×**。这个数不能直接搬：AIVAT 需要一个价值估计器，而我们的 verify 是二值 exit code，能借的只有同任务历史，那正是 FAQ 的路线而不是 AIVAT 的。

## 二、我认为什么变了

1. **R3 的孤立有了更好的解释：不是「没人做」，而是两套语料各自成熟、刚刚开始合流。** R10 与 R3 的 top-20 重叠是 **0**，整库 Jaccard 只有 **0.005（15 篇）**。也就是说「老派 HPO 的预算分配」（Hyperband/BOHB/freeze-thaw，中位 2018）与「LLM 评估的统计」（anytime-valid、e-value、confidence sequence，中位 2025）在我们的语料里是**两个几乎不相交的社区**；而 R10 内部确实有完整的联合空间（PACE、AV-AIVAT、Cost-Efficient LLM Eval、Anytime-Valid Promotion Tests 等）。所以前面那句「三件事同时成立而 agent 评估一条都不满足」——现在有了更准确的版本：**这三件事在统计社区里已经被逐个解决，但还没被搬进 agent 的晋升回路**。R3 的孤立不是领域不存在，是搬运没发生。这也解释了为什么我们连一个「commit 就是检验」的说法都没在自己的代码里见过。

2. **我们的晋升规则在文献里有一个名字，而且被判为病态。** `round.js` 现在的规则是「分数涨了（超过 `minGain` 且超出噪声棒）就晋升」。PACE 把它称作「uncontrolled adaptive multiple testing」，并给出量化后果：同一份噪声开发集上反复用，30–42% 的接受是假的。这条改变的是**问题性质**：P0-1（噪声棒由 n 算）不是精度改进，而是把一个已知有偏的规则换成一个有保证的规则；二项下界只是一个下界近似，PACE 的配对 e-process 才是对的形式（我们做的是配对比较：同一个任务、同一个夹具、两个版本，天然满足「identical instances」这个前提）。

3. **「停」的判据应该是排序分开了没有，而不是每个估计各自够不够准。** `2601.13885` §Adaptive stopping 的那个改动很小、很可搬：把「每侧标准误 < ε」换成「所有相邻对的胜率越过阈值」。我们的晋升是成对决定（候选 vs 在位者），本来就没有「多模型排序」问题，所以这条的正确形态是：**当区间不分离时就说不分离**，而不是拿一个点估计的比较去冒充决定。这与 P0-1 是同一件事的两面。

4. **三态（accept / reject / defer）比两态更诚实，而且我们已经有一个「defer」的雏形没有被命名。** `2607.12338` 把「预算不够，无法决定」当成一个正当输出。我们的 `gate.evaluated` 里其实已经有类似状态（`checks` 里有 `beatsNoise: false`、`reason: 'within noise'`），但它没有名字、没有记账、也没有进入任何统计——被拒绝的轮次什么都不写（见规格 P0-2）。这条改变的是：**「没决定」要作为第三种结果被记下来**，否则所有关于「我们的循环判断得准不准」的统计都只统计了它敢下的判断（幸存者偏差）。

5. **省评估的钱不在 halving 那 0.73% 里，而在「每轮评测多少次」这个更大的数上。** 我们的 screening 支出是 $0.0750 / $10.2898 = 0.73%，而 PACE/AV-AIVAT/FAQ 谈的是把**决定所需的样本量**降一到两个数量级。两者不是一个量级的问题：改 halving 是在 0.73% 里做优化，改「用多少样本做一个决定」是在 100% 里做优化。这条改变的是优先级：P1-3（多档 halving）应该排在「决定规则换成序贯检验」之后，而不是之前。

6. **年报里那句「R3 是 2019 年的领域」现在要和一个新事实一起读。** 加上 R10 之后，九个方向里唯一的旧方向仍然只有 R3（中位 2018，78% 早于 2023），而新加的 R10 是 2023（64% 来自 2025 后）。两者在语料上几乎不相交，在时间上相差五年——**这不是十个方向，是九加一个，而那一个正是把另外九个里最缺的那块统计地基带进来的**。

## 三、互相矛盾

- **PACE 说「宁可 defer 也不要假接受」，BenchPress 说「5 个探针就够」。** 前者把安全放在最前、并接受「温和改进被拒」；后者在容差 5 分内接受 92.1% 的排序保持。两者不直接冲突，但指向不同的默认值：如果我们的目标是「别把噪声晋升」，PACE 对；如果目标是「用更少的钱维持排序」，BenchPress 对。我们的 `minGain` 默认 0.05 更像后者，而 `docs/contracts.md` 的措辞更像前者——这个不一致本身要修。
- **FAQ 承认顺序消融在大预算下会追平甚至超过它**，而这恰好是我们更接近的场景（同一战役里反复评同一批任务，历史很长）。所以「借历史插补」在我们这里可能收益很小：我们没有「多个模型 × 多个基准」的矩阵，只有一个任务集的时间序列。
- **AV-AIVAT 的 74× 与 PACE 的 78% 保留率**放在一起会得出相反的结论（一个说省很多，一个说会丢改进）。差别在它们省的是不同的东西：前者省「达到同一精度所需的样本」，后者省「达到同一错误率所需的样本」。混着引用会得出错误的乐观。

## 四、三条我会改的

1. **把晋升规则换成配对序贯检验（PACE 形态），而不是给现有规则加噪声棒。** 具体：同一个任务上候选与在位者配对比较，只数不一致对，`E ≥ 1/α` 才接受，其余状态显式记为 `defer`（落账、参与统计）。噪声棒保留为**对照臂**而不是判据。这会改变历史行为，所以先影子运行 20 轮（与规格 P0-3 的四步同构）。
2. **给「没决定」建账。** 每一轮无论晋升与否都落一条 `gate.evaluated`（含 `defer` 与原因），使「我们的判断准不准」可以被统计而不是只能统计我们敢下的判断。这条在规格里是 P0-2，但优先级应提到 P0-1 之前——没有 defer 的账，序贯检验换上去也无法评估。
3. **把「样本量」变成战役的一等参数，与预算并列。** 现在 `budgetUsd` 是唯一上限，样本量是任务集大小决定的隐变量。改成显式的「每个任务评几次」之后，PACE 的 α、AV-AIVAT 的方差修正、FAQ 的历史插补才有地方接。

## 五、这份调研没回答的三件事

1. **我们的配对结构够不够 PACE 的前提。** PACE 要求「identical instances」——同一个任务、同一份夹具、同样的执行环境。我们的 verify 每次跑都是新环境（`worktree` 重建、依赖重装），同一任务的两次评测是不是「同一实例」需要证据，而这需要同一补丁重跑三次的方差（R2 那条 open question 至今没跑）。
2. **e-process 的 λ 怎么选、α 定多少，我们没有先验。** PACE 报的是 30–42% 假接受率，但它的 α 与 λ 是在 GSM8K/SVAMP/ARC 上调的；我们的 killRate 分布（0.85–0.9 常见、0/1 常见）与它差得远，直接抄数会得到一个过松或过紧的门。
3. **「省评估」和「评估可信」在我们的场景里能不能同时成立。** 文献两侧都有实证支持（BenchPress 省、PACE 严），但没有一篇在「单任务集、二值验证器、每轮都改代码」的条件下测过。这正好是我们唯一有的数据形态，也正好是这个方向最缺的那一格。
