# Evaluation budget meets evaluation reliability

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 592 个不同候选，保留 289
- 回溯：读通 49 篇全文的参考文献，共 2241 条引用（6 篇无可用 HTML）
- 语料内被引：151 个工作被本语料至少两篇论文引用；被引最多的是 14 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 28 | 2021 | Time-uniform, nonparametric, nonasymptotic confidence sequences. | — |
| 12 | 24 | 2023 | Game-theoretic statistics and safe anytime-valid inference. | 2210.01948 |
| 9 | 15 | 2024 | Estimating means of bounded random variables by betting. | — |
| 8 | 9 | 1939 | Étude critique de la notion de collectif. | — |
| 6 | 14 | 2024 | Safe testing. | 1906.07801 |
| 6 | 12 | 2021 | Training verifiers to solve math word problems. | 2110.14168 |
| 6 | 10 | 2021 | E-values: Calibration, Combination, and Applications. | — |
| 6 | 8 | 1979 | A simple sequentially rejective multiple test procedure. | — |
| 5 | 15 | 2022 | False discovery rate control with e-values. | — |
| 5 | 12 | 2023 | Self-consistency improves chain of thought reasoning in language models. | 2203.11171 |
| 5 | 10 | 2025 | Hypothesis Testing with E-Values. | 2410.23614 |
| 5 | 6 | 1963 | Probability inequalities for sums of bounded random variables. | — |
| 4 | 17 | 2024 | Time-uniform central limit theory and asymptotic confidence sequences. | — |
| 4 | 11 | 2024 | tinybenchmarks: evaluating llms with fewer examples. | 2402.14992 |
| 4 | 10 | 2025 | Qwen3 technical report. | 2505.09388 |
| 4 | 10 | 2020 | Time-uniform Chernoff bounds via nonnegative supermartingales. | — |
| 4 | 8 | 1970 | Statistical methods related to the law of the iterated logarithm. | — |
| 4 | 7 | 1995 | Controlling the false discovery rate: A practical and powerful approach to multiple testing. | — |
| 4 | 6 | 2023 | ReAct: synergizing reasoning and acting in language models | — |
| 4 | 5 | 2020 | Language models are few-shot learners. | — |
| 4 | 4 | 2024 | Qwen2.5 technical report. | 2412.15115 |
| 4 | 4 | 2021 | Testing by betting: A strategy for statistical and scientific communication. | — |
| 4 | 3 | 2020 | BERTScore: Evaluating Text Generation with BERT. | 1904.09675 |
| 4 | 2 | 2009 | Empirical bernstein bounds and sample variance penalization. | 0907.3740 |
| 3 | 9 | 2024 | Large language models as optimizers. | — |
| 3 | 9 | 2020 | Confidence sequences for sampling without replacement. | — |
| 3 | 8 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. | — |
| 3 | 7 | 2023 | Efficient memory management for large language model serving with PagedAttention. | — |
| 3 | 6 | 2024 | Anchor points: Benchmarking models with much fewer examples. | — |
| 3 | 5 | 2024 | Active, anytime-valid risk controlling prediction sets | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 28 | 14 | 2021 | Time-uniform, nonparametric, nonasymptotic confidence sequences. |
| 24 | 12 | 2023 | Game-theoretic statistics and safe anytime-valid inference. |
| 15 | 9 | 2024 | Estimating means of bounded random variables by betting. |
| 9 | 8 | 1939 | Étude critique de la notion de collectif. |
| 14 | 6 | 2024 | Safe testing. |
| 12 | 6 | 2021 | Training verifiers to solve math word problems. |
| 10 | 6 | 2021 | E-values: Calibration, Combination, and Applications. |
| 8 | 6 | 1979 | A simple sequentially rejective multiple test procedure. |
| 15 | 5 | 2022 | False discovery rate control with e-values. |
| 12 | 5 | 2023 | Self-consistency improves chain of thought reasoning in language models. |
| 10 | 5 | 2025 | Hypothesis Testing with E-Values. |
| 6 | 5 | 1963 | Probability inequalities for sums of bounded random variables. |
| 17 | 4 | 2024 | Time-uniform central limit theory and asymptotic confidence sequences. |
| 11 | 4 | 2024 | tinybenchmarks: evaluating llms with fewer examples. |
| 10 | 4 | 2025 | Qwen3 technical report. |
| 10 | 4 | 2020 | Time-uniform Chernoff bounds via nonnegative supermartingales. |
| 8 | 4 | 1970 | Statistical methods related to the law of the iterated logarithm. |
| 7 | 4 | 1995 | Controlling the false discovery rate: A practical and powerful approach to multiple testing. |
| 6 | 4 | 2023 | ReAct: synergizing reasoning and acting in language models |
| 5 | 4 | 2020 | Language models are few-shot learners. |
| 4 | 4 | 2024 | Qwen2.5 technical report. |
| 4 | 4 | 2021 | Testing by betting: A strategy for statistical and scientific communication. |
| 3 | 4 | 2020 | BERTScore: Evaluating Text Generation with BERT. |
| 9 | 3 | 2024 | Large language models as optimizers. |
| 9 | 3 | 2020 | Confidence sequences for sampling without replacement. |
| 8 | 3 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. |
| 7 | 3 | 2023 | Efficient memory management for large language model serving with PagedAttention. |
| 6 | 3 | 2024 | Anchor points: Benchmarking models with much fewer examples. |
| 5 | 3 | 2024 | Active, anytime-valid risk controlling prediction sets |
| 5 | 3 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. |

## 各细分方向的开篇（按语料内最早一篇）

- **replication and noise**（100 篇，最早 2023-06-19）DICES Dataset: Diversity in Conversational AI Evaluation for Safety · arXiv:2306.11247
- **stopping rules with guarantees**（17 篇，最早 2022-08-06）Time - uniform , nonparametric , nonasymptotic confidence sequences · arXiv:1810.08240
- **sample size and power**（12 篇，最早 2024-09-09）Optimizing Sample Size for Supervised Machine Learning with Bulk Transcriptomic Sequencing: A Learning Curve A · arXiv:2409.06180
- **cost-aware benchmarking**（8 篇，最早 2025-05-27）AutoJudger: An Agent-Driven Framework for Efficient Benchmarking of MLLMs · arXiv:2505.21389
- **adaptive and stratified sampling**（8 篇，最早 2023-06-15）Distributionally Robust Stratified Sampling for Stochastic Simulations with Multiple Uncertain Input Models · arXiv:2306.09020

## 最近的 SOTA（近两年）

- 2026-02-02 · Empirical Bernstein and betting confidence intervals for randomized quasi-Monte Carlo · arXiv:2504.18677
- 2025-02-03 · Uniform mean estimation for monotonic processes · arXiv:2502.01244
- 2025-08-04 · On the optimality of coin- betting for mean estimation · arXiv:2412.02640
- 2026-10-17 · What RL Brings to Reasoning: A Few Decisions the Base Model Would Not Make · arXiv:2610.24663
- 2026-07-26 · Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-symbolic Systems, and Verified  · arXiv:2606.08728
- 2026-09-12 · NeuroProlog: Multi-Task Fine-Tuning for Neurosymbolic Mathematical Reasoning via the Cocktail Effect · arXiv:2603.02504
- 2026-02-22 · Adaptive Problem Generation via Symbolic Representations · arXiv:2602.19187
- 2026-09-22 · Sample-Efficient Multiple Testing with Adaptive Data Collection · arXiv:2609.26651
- 2026-05-29 · SCORE: A Unified Framework for Overshoot Refund in Online FDR Control · arXiv:2601.20386
- 2025-12-09 · Exhausting the type I error level in event-driven group- sequential designs with a closed testing procedure for progression-free a · arXiv:2512.08658
- 2025-08-04 · Anytime-valid FDR control with the stopped e-BH procedure · arXiv:2502.08539
- 2025-12-15 · Admissible online closed testing must employ e-values · arXiv:2407.15733
- 2026-11-19 · UDA-Restoration: Bridging Unsupervised Domain Adaptation and Multi-Degradation Denoising for Enhanced AV Semantic Segmentation · arXiv:2611.27097
- 2026-11-18 · The Limit Is in the Input, Not the Model: State-Dependent Command Safety in Natural-Language Interfaces to Industrial Controllers · arXiv:2611.24682
- 2026-11-18 · Risk-Aware Safe Hierarchical Learning for Robust eMBB-URLLC Resource Allocation in O-RAN · arXiv:2611.24497
- 2026-11-19 · Safe Personal RSI: Evaluating and Repairing Personal-Agent Updates · arXiv:2611.23651
- 2026-11-17 · Safe to Omit, Worth Omitting? Keeping the Answer and Cutting Latency When an LLM Agent Skips Another's Message · arXiv:2611.23570
- 2026-11-17 · SEAM: Computer-Use Agents Know the Harm Between Screens, and Commit It Anyway · arXiv:2611.22971
- 2026-11-17 · Right Diagnosis, Unsafe Route: Auditing Clinical AI Decision Trajectories and Corrective Oversight for Validity and Potential Harm · arXiv:2611.22612
- 2026-11-17 · Learning Regions of Attraction for Transverse Feedback Linearization under Controller Singularities · arXiv:2611.22286
- 2026-11-17 · Safely Mitigating Grid Imbalance: A Hybrid Distributional Wide-Margin Recourse Approach · arXiv:2611.22220
- 2026-11-16 · Beyond Acuity Accuracy: A Multidimensional Framework for Evaluating Patient-Facing Emergency Triage AI Tools · arXiv:2611.22045
- 2026-11-16 · Call-Efficient ICD-10 Code Prediction via Supervised Candidate Generation and Selective LLM Invocation · arXiv:2611.21891
- 2026-11-16 · Algorithm Distillation for Safe In-Context Reinforcement Learning · arXiv:2611.21524
- 2026-11-16 · Deep Learning for Physicists: From Linear Regression to Reasoning Models · arXiv:2611.21295
- 2026-11-16 · PQC Migration: End-to-End Performance Profiling of Post Quantum Cryptographic Algorithms in mTLS · arXiv:2611.21206
- 2026-11-16 · Transferable Neural CBFs via Generalized Closure · arXiv:2611.20929
- 2026-11-15 · Designing Deceptive Model Organisms that Successfully Evade Auditing · arXiv:2611.20459
- 2026-11-15 · GNN-Based Deep Reinforcement Learning for Coastal Emergency Response under Extreme Water Levels · arXiv:2611.20268
- 2026-11-14 · Distilling Safety Filters for Filter-free Multi-agent RL · arXiv:2611.19190

## 被常引但不在语料里（下一轮的查询）

- (8 篇引) Étude critique de la notion de collectif. · 1939
- (6 篇引) Safe testing. · 2024 · arXiv:1906.07801
- (6 篇引) E-values: Calibration, Combination, and Applications. · 2021
- (6 篇引) A simple sequentially rejective multiple test procedure. · 1979
- (5 篇引) False discovery rate control with e-values. · 2022
- (5 篇引) Self-consistency improves chain of thought reasoning in language models. · 2023 · arXiv:2203.11171
- (5 篇引) Hypothesis Testing with E-Values. · 2025 · arXiv:2410.23614
- (5 篇引) Probability inequalities for sums of bounded random variables. · 1963
- (4 篇引) Time-uniform central limit theory and asymptotic confidence sequences. · 2024
- (4 篇引) tinybenchmarks: evaluating llms with fewer examples. · 2024 · arXiv:2402.14992
- (4 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (4 篇引) Time-uniform Chernoff bounds via nonnegative supermartingales. · 2020
- (4 篇引) Statistical methods related to the law of the iterated logarithm. · 1970
- (4 篇引) Controlling the false discovery rate: A practical and powerful approach to multiple testing. · 1995
- (4 篇引) ReAct: synergizing reasoning and acting in language models · 2023
- (4 篇引) Language models are few-shot learners. · 2020
- (4 篇引) Qwen2.5 technical report. · 2024 · arXiv:2412.15115
- (4 篇引) Testing by betting: A strategy for statistical and scientific communication. · 2021
- (4 篇引) BERTScore: Evaluating Text Generation with BERT. · 2020 · arXiv:1904.09675
- (4 篇引) Empirical bernstein bounds and sample variance penalization. · 2009 · arXiv:0907.3740
- (3 篇引) Large language models as optimizers. · 2024
- (3 篇引) Confidence sequences for sampling without replacement. · 2020
- (3 篇引) Chain-of-thought prompting elicits reasoning in large language models. · 2022
- (3 篇引) Efficient memory management for large language model serving with PagedAttention. · 2023
- (3 篇引) Anchor points: Benchmarking models with much fewer examples. · 2024
- (3 篇引) Active, anytime-valid risk controlling prediction sets · 2024
- (3 篇引) Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. · 2023
- (3 篇引) Multiple comparisons among means · 1961
- (3 篇引) How many tasks are enough for agent benchmark decisions? A replay analysis of public LLM agent benchmarks · 2026 · arXiv:2607.12338
- (3 篇引) Admissible anytime-valid sequential inference must rely on nonnegative martingales. · 2022 · arXiv:2009.03167
- (3 篇引) ROUGE: A Package for Automatic Evaluation of Summaries. · 2004
- (3 篇引) BLEU: A Method for Automatic Evaluation of Machine Translation. · 2002
- (3 篇引) Training language models to follow instructions with human feedback · 2022
- (3 篇引) Red teaming language models with language models · 2022
- (3 篇引) Universal and transferable adversarial attacks on aligned language models · 2023 · arXiv:2307.15043
- (3 篇引) The use of confidence or fiducial limits illustrated in the case of the binomial · 1934
- (3 篇引) Promptbreeder: Self-referential self-improvement via prompt evolution. · 2023 · arXiv:2309.16797
- (3 篇引) Test Martingales, Bayes Factors and p-Values. · 2011
- (3 篇引) Constitutional ai: Harmlessness from ai feedback. · 2022 · arXiv:2212.08073
- (3 篇引) AgentBench: evaluating llms as agents · 2024

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 2.8 | 2023 | 1 | On the near-optimality of betting confidence sets for bounded means | 2310.01547 |
| 2.8 | 2024 | 1 | Nonparametric extensions of randomized response for private confidence sets | 2202.08728 |
| 2.1 | 2021 | 1 | Nonparametric iterated-logarithm extensions of the sequential generalized likelihood ratio test | 2010.08082 |
| 3.2 | 2022 | 1 | Time - uniform , nonparametric , nonasymptotic confidence sequences | 1810.08240 |
| 2.8 | 2023 | 1 | Game - theoretic statistics and safe anytime - valid inference | 2210.01948 |
| 3.6 | 2026 | 1 | Empirical Bernstein and betting confidence intervals for randomized quasi-Monte Carlo | 2504.18677 |
| 3.6 | 2025 | 1 | Uniform mean estimation for monotonic processes | 2502.01244 |
| 3.6 | 2025 | 1 | On the optimality of coin- betting for mean estimation | 2412.02640 |
| 3.9 | 2023 | 1 | Li, Li, and Dai's Contribution to the Discussion of " Estimating Means of Bounded Random Variables b | 2308.07318 |
| 2.8 | 2023 | 1 | Tighter PAC-Bayes Bounds Through Coin- Betting | 2302.05829 |
| 3.2 | 2022 | 1 | Estimating means of bounded random variables by betting | 2010.09686 |
| 3.6 | 2026 | 1 | What RL Brings to Reasoning: A Few Decisions the Base Model Would Not Make | 2610.24663 |
| 4.0 | 2026 | 1 | Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-s | 2606.08728 |
| 4.7 | 2026 | 1 | NeuroProlog: Multi-Task Fine-Tuning for Neurosymbolic Mathematical Reasoning via the Cocktail Effect | 2603.02504 |
| 3.6 | 2026 | 1 | Adaptive Problem Generation via Symbolic Representations | 2602.19187 |
| 2.8 | 2024 | 1 | Orca- Math : Unlocking the potential of SLMs in Grade School Math | 2402.14830 |
| 2.8 | 2024 | 1 | GraphReason: Enhancing Reasoning Capabilities of Large Language Models through A Graph-Based Verific | 2308.09267 |
| 2.8 | 2023 | 1 | Leveraging Training Data in Few-Shot Prompting for Numerical Reasoning | 2305.18170 |
| 2.8 | 2023 | 1 | Solving Math Word Problems via Cooperative Reasoning induced Language Models | 2210.16257 |
| 2.1 | 2022 | 1 | Unbiased Math Word Problems Benchmark for Mitigating Solving Bias | 2205.08108 |
| 2.1 | 2021 | 1 | Training Verifiers to Solve Math Word Problems | 2110.14168 |
| 3.6 | 2026 | 1 | Sample-Efficient Multiple Testing with Adaptive Data Collection | 2609.26651 |
| 3.6 | 2026 | 1 | SCORE: A Unified Framework for Overshoot Refund in Online FDR Control | 2601.20386 |
| 3.6 | 2025 | 1 | Exhausting the type I error level in event-driven group- sequential designs with a closed testing pr | 2512.08658 |
| 4.7 | 2025 | 1 | Anytime-valid FDR control with the stopped e-BH procedure | 2502.08539 |
| 4.7 | 2025 | 1 | Admissible online closed testing must employ e-values | 2407.15733 |
| 2.8 | 2023 | 1 | Sequential Cauchy Combination Test for Multiple Testing Problems with Financial Applications | 2303.13406 |
| 1.4 | 2018 | 1 | Online control of the false discovery rate in biomedical research | 1809.07292 |
| 1.4 | 2012 | 1 | The sequential rejection principle of familywise error control | 1211.3313 |
| 3.6 | 2026 | 1 | UDA-Restoration: Bridging Unsupervised Domain Adaptation and Multi-Degradation Denoising for Enhance | 2611.27097 |
| 3.6 | 2026 | 1 | The Limit Is in the Input, Not the Model: State-Dependent Command Safety in Natural-Language Interfa | 2611.24682 |
| 4.7 | 2026 | 1 | Risk-Aware Safe Hierarchical Learning for Robust eMBB-URLLC Resource Allocation in O-RAN | 2611.24497 |
| 3.6 | 2026 | 1 | Safe Personal RSI: Evaluating and Repairing Personal-Agent Updates | 2611.23651 |
| 3.6 | 2026 | 1 | Safe to Omit, Worth Omitting? Keeping the Answer and Cutting Latency When an LLM Agent Skips Another | 2611.23570 |
| 3.6 | 2026 | 1 | SEAM: Computer-Use Agents Know the Harm Between Screens, and Commit It Anyway | 2611.22971 |
| 3.6 | 2026 | 1 | Right Diagnosis, Unsafe Route: Auditing Clinical AI Decision Trajectories and Corrective Oversight f | 2611.22612 |
| 3.6 | 2026 | 1 | Learning Regions of Attraction for Transverse Feedback Linearization under Controller Singularities | 2611.22286 |
| 3.6 | 2026 | 1 | Safely Mitigating Grid Imbalance: A Hybrid Distributional Wide-Margin Recourse Approach | 2611.22220 |
| 3.6 | 2026 | 1 | Beyond Acuity Accuracy: A Multidimensional Framework for Evaluating Patient-Facing Emergency Triage  | 2611.22045 |
| 3.6 | 2026 | 1 | Call-Efficient ICD-10 Code Prediction via Supervised Candidate Generation and Selective LLM Invocati | 2611.21891 |
| 3.6 | 2026 | 1 | Algorithm Distillation for Safe In-Context Reinforcement Learning | 2611.21524 |
| 3.6 | 2026 | 1 | Deep Learning for Physicists: From Linear Regression to Reasoning Models | 2611.21295 |
| 3.6 | 2026 | 1 | PQC Migration: End-to-End Performance Profiling of Post Quantum Cryptographic Algorithms in mTLS | 2611.21206 |
| 3.6 | 2026 | 1 | Transferable Neural CBFs via Generalized Closure | 2611.20929 |
| 3.6 | 2026 | 1 | Designing Deceptive Model Organisms that Successfully Evade Auditing | 2611.20459 |
| 3.6 | 2026 | 1 | GNN-Based Deep Reinforcement Learning for Coastal Emergency Response under Extreme Water Levels | 2611.20268 |
| 3.6 | 2026 | 1 | Distilling Safety Filters for Filter-free Multi-agent RL | 2611.19190 |
| 4.7 | 2026 | 1 | Reliable Conditioned Hamilton-Jacobi Reachability via Subsolution Learning on Exact Local Windows | 2611.19088 |
| 4.7 | 2026 | 1 | Certify, Then Select: Viability-Aware Runtime Steering of Frozen Diffusion Policies | 2611.19047 |
| 3.6 | 2026 | 1 | Providing Accuracy Guarantees for the Fixed-Point Emulation of Matrix Multiplication | 2611.19008 |
| 3.6 | 2026 | 1 | Screen Before You Add: Reducing Candidate Inference in Model Ensembles | 2611.18647 |
| 3.6 | 2026 | 1 | Safety Certificates for Systems under Attack via Stackelberg Set Games | 2611.18173 |
| 3.6 | 2026 | 1 | A Generalizable Approach to Safety-Aware Robotic Behavior Planning with an Explicit Constraint Space | 2611.18026 |
| 3.6 | 2026 | 1 | Evaluating the Robustness of PRNU Source-Camera Attribution to the Fingerprint-Copy Attack: An Open  | 2611.17747 |
| 3.6 | 2026 | 1 | MobileProbe: Adaptive Security Evaluation of Mobile Agents via Trajectory-Aware Injection | 2611.16693 |
| 4.7 | 2026 | 1 | Flexible nonlinear spatial autoregressive models under spatial confounding: a gradient boosting appr | 2611.16592 |
| 3.6 | 2026 | 1 | Contain, Conform, Compare (Extended Version): A Red-Teamed Evaluation Kit for Small Coding Agents an | 2611.16485 |
| 3.6 | 2026 | 1 | Scaling public input on AI policy with pluralistic agents | 2611.16028 |
| 3.6 | 2026 | 1 | Agreement Is Not Assurance: Evidence-Independent Safety Gates for Agentic AI in DER-Rich Distributio | 2611.15363 |
| 3.6 | 2026 | 1 | Epigraph Form Reinforcement Learning-based Safe Trajectory Tracking Control for Connected and Autono | 2611.14903 |
| 3.6 | 2026 | 1 | Social Engineering Attack Detection in Corporate Communications | 2611.14897 |
| 3.6 | 2026 | 1 | Open-Source Transtibial Prosthetic Bypass Preserving Joint Alignment: Gait Learning and Kinematic Ev | 2611.14762 |
| 4.7 | 2026 | 1 | When Should Agents Remember? Falsification-Gated Self-Evolution for LLM Agents | 2611.14326 |
| 4.7 | 2026 | 1 | ForeseeDrive: Future-Token Conditioning for Anticipatory Generative Driving | 2611.14286 |
| 3.6 | 2026 | 1 | Hx2Dx: From Anamnesis to Diagnosis - A Multimodal Arena for Conversational Clinical Reasoning in LLM | 2611.14122 |
| 4.7 | 2026 | 1 | Curriculum proof repair with learned counterexamples | 2611.13627 |
| 3.6 | 2026 | 1 | No finite rulebook can certify every safe program: an impossibility theorem for gatekeeping AI agent | 2611.13367 |
| 4.7 | 2026 | 1 | DOBB: Dynamic Oriented Bounding Boxes for Multi-Agent Collision Avoidance under State Uncertainty an | 2611.13142 |
| 3.6 | 2026 | 1 | Code-Grounded Agentic Explanations for Static Analysis Vulnerability Findings | 2611.13041 |
| 3.6 | 2026 | 1 | Just AI Governance and the Forbidden-Boundary Principle | 2611.13007 |
| 3.6 | 2026 | 1 | Maze Runner: Autonomous Maze Navigation with Line-Based Localization and Control Barrier Functions | 2611.12949 |
| 3.6 | 2026 | 1 | Certified Zonotopic Reachability Analysis for Trajectory Tracking on Lie Groups | 2611.12767 |
| 3.6 | 2026 | 1 | SAFE -Hair: Scalp-Anchored Fields for Exportable Single-View Hair Reconstruction | 2611.12037 |
| 3.6 | 2026 | 1 | Late but Valuable: Why Deadlines Change the Measured Value of LLM Reasoning | 2611.11910 |
| 3.6 | 2026 | 1 | ColNav: Uncertainty-Aware Spacetime Collision Checking with Bounding Volume Hierarchies | 2611.11646 |
| 3.6 | 2026 | 1 | NightSteps: A Night-Time Dataset and Benchmark for Pedestrian Crossing Intention Prediction | 2611.11583 |
| 3.6 | 2026 | 1 | MicroSim: Contrastive Graph Neural Networks for Binary Code Similarity Detection | 2611.11486 |
| 3.6 | 2026 | 1 | FESOM2.8 in single precision: climate fidelity over six decades and performance on CPUs and GPUs | 2611.11248 |
| 3.6 | 2026 | 1 | Same Contacts, Different Rooms:Meeting Format Shapes LLM Group Influence Beyond Pairwise Contact Cou | 2611.10641 |
| 3.6 | 2026 | 1 | Cognitive Mapping of Learning by Thinking Mechanisms in Large Language Models | 2611.14382 |

## 读不到全文的（诚实记录）

- arXiv:2610.29195 — HTTP 404
- arXiv:2508.18815 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2501.18383 — HTTP 404
- arXiv:2509.12471 — HTTP 404
- arXiv:2610.29288 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2310.01547 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-23T16:45:01.273Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_