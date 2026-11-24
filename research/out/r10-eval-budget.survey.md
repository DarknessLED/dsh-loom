# Evaluation budget meets evaluation reliability

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 505 个不同候选，保留 201
- 回溯：读通 49 篇全文的参考文献，共 2091 条引用（7 篇无可用 HTML）
- 语料内被引：136 个工作被本语料至少两篇论文引用；被引最多的是 9 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 9 | 22 | 2023 | Game-theoretic statistics and safe anytime-valid inference. | 2210.01948 |
| 9 | 20 | 2021 | Time-uniform, nonparametric, nonasymptotic confidence sequences. | — |
| 7 | 17 | 2024 | tinybenchmarks: evaluating llms with fewer examples. | 2402.14992 |
| 7 | 11 | 2021 | Training verifiers to solve math word problems. | 2110.14168 |
| 6 | 12 | 2024 | Anchor points: Benchmarking models with much fewer examples. | 2309.08638 |
| 5 | 12 | 2024 | Efficient benchmarking (of language models). | 2308.11696 |
| 5 | 8 | 2024 | Estimating means of bounded random variables by betting. | — |
| 5 | 6 | 1963 | Probability inequalities for sums of bounded random variables. | — |
| 4 | 18 | 2024 | Time-uniform central limit theory and asymptotic confidence sequences. | 2103.06476 |
| 4 | 10 | 2025 | Qwen3 technical report. | 2505.09388 |
| 4 | 10 | 2025 | GEPA: Reflective prompt evolution can outperform reinforcement learning. | 2507.19457 |
| 4 | 9 | 2025 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. | 2406.12045 |
| 4 | 8 | 1970 | Statistical methods related to the law of the iterated logarithm. | — |
| 4 | 7 | 1979 | A simple sequentially rejective multiple test procedure. | — |
| 4 | 6 | 2021 | Testing by betting: A strategy for statistical and scientific communication. | — |
| 4 | 2 | 2009 | Empirical bernstein bounds and sample variance penalization. | 0907.3740 |
| 3 | 8 | 2021 | Measuring massive multitask language understanding. | 2009.03300 |
| 3 | 7 | 2023 | Self-consistency improves chain of thought reasoning in language models. | — |
| 3 | 7 | 2024 | Safe testing. | 1906.07801 |
| 3 | 7 | 2025 | Hypothesis testing with e-values | 2410.23614 |
| 3 | 6 | 2025 | Darwin Gödel machine: Open-ended evolution of self-improving agents. | 2505.22954 |
| 3 | 6 | 2025 | metabench: A Sparse Benchmark of Reasoning and Knowledge in Large Language Models. | 2407.12844 |
| 3 | 5 | 2009 | Imagenet: a large-scale hierarchical image database | — |
| 3 | 5 | 1980 | Applications of Item Response Theory to Practical Testing Problems. | — |
| 3 | 4 | 2024 | Quantifying language models’ sensitivity to spurious features in prompt design or: How i learned to start wo | 2310.11324 |
| 3 | 4 | 2024 | Automated design of agentic systems. | 2408.08435 |
| 3 | 4 | 2024 | DSPy: Compiling declarative language model calls into self-improving pipelines. | 2310.03714 |
| 3 | 4 | 2026 | How many tasks are enough for agent benchmark decisions? a replay analysis of public llm agent benchmarks | 2607.12338 |
| 3 | 4 | 2024 | WebArena: a realistic web environment for building autonomous agents | 2307.13854 |
| 3 | 4 | 1961 | Multiple comparisons among means | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 22 | 9 | 2023 | Game-theoretic statistics and safe anytime-valid inference. |
| 20 | 9 | 2021 | Time-uniform, nonparametric, nonasymptotic confidence sequences. |
| 17 | 7 | 2024 | tinybenchmarks: evaluating llms with fewer examples. |
| 11 | 7 | 2021 | Training verifiers to solve math word problems. |
| 12 | 6 | 2024 | Anchor points: Benchmarking models with much fewer examples. |
| 12 | 5 | 2024 | Efficient benchmarking (of language models). |
| 8 | 5 | 2024 | Estimating means of bounded random variables by betting. |
| 6 | 5 | 1963 | Probability inequalities for sums of bounded random variables. |
| 18 | 4 | 2024 | Time-uniform central limit theory and asymptotic confidence sequences. |
| 10 | 4 | 2025 | Qwen3 technical report. |
| 10 | 4 | 2025 | GEPA: Reflective prompt evolution can outperform reinforcement learning. |
| 9 | 4 | 2025 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. |
| 8 | 4 | 1970 | Statistical methods related to the law of the iterated logarithm. |
| 7 | 4 | 1979 | A simple sequentially rejective multiple test procedure. |
| 6 | 4 | 2021 | Testing by betting: A strategy for statistical and scientific communication. |
| 8 | 3 | 2021 | Measuring massive multitask language understanding. |
| 7 | 3 | 2023 | Self-consistency improves chain of thought reasoning in language models. |
| 7 | 3 | 2024 | Safe testing. |
| 7 | 3 | 2025 | Hypothesis testing with e-values |
| 6 | 3 | 2025 | Darwin Gödel machine: Open-ended evolution of self-improving agents. |
| 6 | 3 | 2025 | metabench: A Sparse Benchmark of Reasoning and Knowledge in Large Language Models. |
| 5 | 3 | 2009 | Imagenet: a large-scale hierarchical image database |
| 5 | 3 | 1980 | Applications of Item Response Theory to Practical Testing Problems. |
| 4 | 3 | 2024 | Quantifying language models’ sensitivity to spurious features in prompt design or: How i learned to  |
| 4 | 3 | 2024 | Automated design of agentic systems. |
| 4 | 3 | 2024 | DSPy: Compiling declarative language model calls into self-improving pipelines. |
| 4 | 3 | 2026 | How many tasks are enough for agent benchmark decisions? a replay analysis of public llm agent bench |
| 4 | 3 | 2024 | WebArena: a realistic web environment for building autonomous agents |
| 4 | 3 | 1961 | Multiple comparisons among means |
| 4 | 3 | 1995 | Controlling the false discovery rate: A practical and powerful approach to multiple testing. |

## 各细分方向的开篇（按语料内最早一篇）

- **replication and noise**（67 篇，最早 2023-06-19）DICES Dataset: Diversity in Conversational AI Evaluation for Safety · arXiv:2306.11247
- **stopping rules with guarantees**（39 篇，最早 2021-05-13）Nonparametric iterated-logarithm extensions of the sequential generalized likelihood ratio test · arXiv:2010.08082
- **cost-aware benchmarking**（29 篇，最早 2024-05-26）tinyBenchmarks : evaluating LLMs with fewer examples · arXiv:2402.14992
- **sample size and power**（26 篇，最早 2023-08-29）Covariate adjustment and estimation of difference in proportions in randomized clinical trials · arXiv:2308.15688
- **adaptive and stratified sampling**（15 篇，最早 2022-10-10）First-passage probability estimation of high-dimensional nonlinear stochastic dynamic systems by a fractional  · arXiv:2210.04715

## 最近的 SOTA（近两年）

- 2026-10-17 · What RL Brings to Reasoning: A Few Decisions the Base Model Would Not Make · arXiv:2610.24663
- 2026-07-26 · Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-symbolic Systems, and Verified  · arXiv:2606.08728
- 2026-09-12 · NeuroProlog: Multi-Task Fine-Tuning for Neurosymbolic Mathematical Reasoning via the Cocktail Effect · arXiv:2603.02504
- 2026-02-22 · Adaptive Problem Generation via Symbolic Representations · arXiv:2602.19187
- 2026-11-01 · Time - Uniform Dependent Central Limit Theory · arXiv:2610.29288
- 2026-05-18 · Asymptotic Anytime-Valid Inference for U-statistics · arXiv:2605.14692
- 2026-01-14 · Distribution- uniform anytime-valid sequential inference and the Robbins-Siegmund distributions · arXiv:2311.03343
- 2026-11-13 · UltraBERT-JEV: Encoder models for System One Applications · arXiv:2611.17867
- 2026-11-04 · Adapting Qwen3 to Tajik from 0.6B to 8B: Lower Text Loss Did Not Mean Better Understanding · arXiv:2611.06062
- 2026-10-16 · Beyond the Benchmark: Conditioning, Domains and Failure Modes of Qwen3 -TTS · arXiv:2610.23678
- 2026-10-01 · Permutation-Robust Decision Modeling with Candidate-Independent Block-Causal Attention · arXiv:2610.01601
- 2026-09-30 · PivotOPD: Learning to Recover from Pivotal Mistakes in Multi-Turn Agents · arXiv:2609.40285
- 2026-08-24 · FinixDoc: Rethinking Financial Document Parsing Beyond Saturated Benchmarks · arXiv:2608.22842
- 2026-08-24 · Industrial-Instruction: An End-to-End Framework for Building Instruction-Tuning and Benchmark Datasets from Industrial Technical R · arXiv:2608.22817
- 2026-08-31 · In-Cell Learning: Language Models That Update Their Own Weights in Sequence Without Changing the File They Ship · arXiv:2608.20873
- 2026-08-11 · ASR-Roundtrip Evaluation Can Mask Context- and Convention-Dependent Reading Errors in Chinese News TTS · arXiv:2608.10606
- 2026-07-22 · Small, Free, and Effective: Orchestrating Open-Weight Small Language Models to Outperform Single LLM for Malware Analysis · arXiv:2607.20216
- 2026-06-02 · Enginuity: A Dataset and Benchmark for Vision-Language Understanding of Engineering Diagrams · arXiv:2606.03410
- 2026-02-28 · Qwen3 -Coder-Next Technical Report · arXiv:2603.00729
- 2026-02-25 · Ruyi2 Technical Report · arXiv:2602.22543
- 2026-01-29 · Qwen3 -ASR Technical Report · arXiv:2601.21337
- 2026-01-21 · Qwen3 -TTS Technical Report · arXiv:2601.15621
- 2025-11-27 · Qwen3 -VL Technical Report · arXiv:2511.21631
- 2025-11-03 · Efficient Tool-Calling Multi-Expert NPC Agent for Commonsense Persona-Grounded Dialogue · arXiv:2511.01720
- 2025-09-22 · Qwen3 -Omni Technical Report · arXiv:2509.17765
- 2025-05-14 · Qwen3 Technical Report · arXiv:2505.09388
- 2026-08-03 · FLARE: Few-shot Learning -based Adaptive Reflective Engine · arXiv:2608.02919
- 2026-02-14 · GEPA : Reflective Prompt Evolution Can Outperform Reinforcement Learning · arXiv:2507.19457
- 2026-07-09 · Stop Guessing When to Stop Testing: Efficient Model Evaluation with Just Enough Data · arXiv:2607.08522
- 2026-03-25 · On Randomness in Agentic Evals · arXiv:2602.07150

## 被常引但不在语料里（下一轮的查询）

- (5 篇引) Efficient benchmarking (of language models). · 2024 · arXiv:2308.11696
- (5 篇引) Estimating means of bounded random variables by betting. · 2024
- (5 篇引) Probability inequalities for sums of bounded random variables. · 1963
- (4 篇引) τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. · 2025 · arXiv:2406.12045
- (4 篇引) Statistical methods related to the law of the iterated logarithm. · 1970
- (4 篇引) A simple sequentially rejective multiple test procedure. · 1979
- (4 篇引) Testing by betting: A strategy for statistical and scientific communication. · 2021
- (4 篇引) Empirical bernstein bounds and sample variance penalization. · 2009 · arXiv:0907.3740
- (3 篇引) Measuring massive multitask language understanding. · 2021 · arXiv:2009.03300
- (3 篇引) Self-consistency improves chain of thought reasoning in language models. · 2023
- (3 篇引) Safe testing. · 2024 · arXiv:1906.07801
- (3 篇引) Hypothesis testing with e-values · 2025 · arXiv:2410.23614
- (3 篇引) Darwin Gödel machine: Open-ended evolution of self-improving agents. · 2025 · arXiv:2505.22954
- (3 篇引) metabench: A Sparse Benchmark of Reasoning and Knowledge in Large Language Models. · 2025 · arXiv:2407.12844
- (3 篇引) Imagenet: a large-scale hierarchical image database · 2009
- (3 篇引) Applications of Item Response Theory to Practical Testing Problems. · 1980
- (3 篇引) Quantifying language models’ sensitivity to spurious features in prompt design or: How i learned to start worr · 2024 · arXiv:2310.11324
- (3 篇引) Automated design of agentic systems. · 2024 · arXiv:2408.08435
- (3 篇引) DSPy: Compiling declarative language model calls into self-improving pipelines. · 2024 · arXiv:2310.03714
- (3 篇引) How many tasks are enough for agent benchmark decisions? a replay analysis of public llm agent benchmarks · 2026 · arXiv:2607.12338
- (3 篇引) WebArena: a realistic web environment for building autonomous agents · 2024 · arXiv:2307.13854
- (3 篇引) Multiple comparisons among means · 1961
- (3 篇引) Controlling the false discovery rate: A practical and powerful approach to multiple testing. · 1995
- (3 篇引) E-values: Calibration, combination and applications. · 2021
- (3 篇引) ReAct: Synergizing reasoning and acting in language models. · 2022 · arXiv:2210.03629
- (3 篇引) Language models are few-shot learners. · 2020
- (3 篇引) Promptbreeder: Self-referential self-improvement via prompt evolution. · 2023 · arXiv:2309.16797
- (3 篇引) Self-refine: Iterative refinement with self-feedback. · 2023
- (3 篇引) Reflexion: Language agents with verbal reinforcement learning. · 2023
- (3 篇引) Deep residual learning for image recognition · 2016
- (3 篇引) Statistical power analysis for the behavioral sciences. · 2013
- (3 篇引) Evaluation Examples Are Not Equally Informative: How Should That Change NLP Leaderboards? · 2021
- (3 篇引) Building an Evaluation Scale using Item Response Theory. · 2016
- (3 篇引) Sequential tests of statistical hypotheses. · 1945
- (3 篇引) False discovery rate control with e-values. · 2022

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 3.9 | 2023 | 1 | Game - theoretic statistics and safe anytime - valid inference | 2210.01948 |
| 3.9 | 2023 | 1 | On the near-optimality of betting confidence sets for bounded means | 2310.01547 |
| 3.9 | 2024 | 1 | Nonparametric extensions of randomized response for private confidence sets | 2202.08728 |
| 4.3 | 2021 | 1 | Nonparametric iterated-logarithm extensions of the sequential generalized likelihood ratio test | 2010.08082 |
| 4.3 | 2022 | 1 | Time - uniform , nonparametric , nonasymptotic confidence sequences | 1810.08240 |
| 5.0 | 2024 | 1 | tinyBenchmarks : evaluating LLMs with fewer examples | 2402.14992 |
| 3.6 | 2026 | 1 | What RL Brings to Reasoning: A Few Decisions the Base Model Would Not Make | 2610.24663 |
| 4.0 | 2026 | 1 | Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-s | 2606.08728 |
| 4.7 | 2026 | 1 | NeuroProlog: Multi-Task Fine-Tuning for Neurosymbolic Mathematical Reasoning via the Cocktail Effect | 2603.02504 |
| 3.6 | 2026 | 1 | Adaptive Problem Generation via Symbolic Representations | 2602.19187 |
| 2.8 | 2024 | 1 | Orca- Math : Unlocking the potential of SLMs in Grade School Math | 2402.14830 |
| 3.9 | 2024 | 1 | GraphReason: Enhancing Reasoning Capabilities of Large Language Models through A Graph-Based Verific | 2308.09267 |
| 2.8 | 2023 | 1 | Leveraging Training Data in Few-Shot Prompting for Numerical Reasoning | 2305.18170 |
| 3.9 | 2023 | 1 | Solving Math Word Problems via Cooperative Reasoning induced Language Models | 2210.16257 |
| 2.1 | 2022 | 1 | Unbiased Math Word Problems Benchmark for Mitigating Solving Bias | 2205.08108 |
| 2.1 | 2021 | 1 | Training Verifiers to Solve Math Word Problems | 2110.14168 |
| 3.9 | 2024 | 1 | Anchor Points : Benchmarking Models with Much Fewer Examples | 2309.08638 |
| 6.9 | 2026 | 1 | Time - Uniform Dependent Central Limit Theory | 2610.29288 |
| 5.8 | 2026 | 1 | Asymptotic Anytime-Valid Inference for U-statistics | 2605.14692 |
| 5.8 | 2026 | 1 | Distribution- uniform anytime-valid sequential inference and the Robbins-Siegmund distributions | 2311.03343 |
| 6.1 | 2024 | 1 | Time - uniform central limit theory and asymptotic confidence sequences | 2103.06476 |
| 3.6 | 2026 | 1 | UltraBERT-JEV: Encoder models for System One Applications | 2611.17867 |
| 3.6 | 2026 | 1 | Adapting Qwen3 to Tajik from 0.6B to 8B: Lower Text Loss Did Not Mean Better Understanding | 2611.06062 |
| 4.7 | 2026 | 1 | Beyond the Benchmark: Conditioning, Domains and Failure Modes of Qwen3 -TTS | 2610.23678 |
| 3.6 | 2026 | 1 | Permutation-Robust Decision Modeling with Candidate-Independent Block-Causal Attention | 2610.01601 |
| 3.6 | 2026 | 1 | PivotOPD: Learning to Recover from Pivotal Mistakes in Multi-Turn Agents | 2609.40285 |
| 3.6 | 2026 | 1 | FinixDoc: Rethinking Financial Document Parsing Beyond Saturated Benchmarks | 2608.22842 |
| 3.6 | 2026 | 1 | Industrial-Instruction: An End-to-End Framework for Building Instruction-Tuning and Benchmark Datase | 2608.22817 |
| 3.6 | 2026 | 1 | In-Cell Learning: Language Models That Update Their Own Weights in Sequence Without Changing the Fil | 2608.20873 |
| 3.6 | 2026 | 1 | ASR-Roundtrip Evaluation Can Mask Context- and Convention-Dependent Reading Errors in Chinese News T | 2608.10606 |
| 3.6 | 2026 | 1 | Small, Free, and Effective: Orchestrating Open-Weight Small Language Models to Outperform Single LLM | 2607.20216 |
| 3.6 | 2026 | 1 | Enginuity: A Dataset and Benchmark for Vision-Language Understanding of Engineering Diagrams | 2606.03410 |
| 3.6 | 2026 | 1 | Qwen3 -Coder-Next Technical Report | 2603.00729 |
| 3.6 | 2026 | 1 | Ruyi2 Technical Report | 2602.22543 |
| 3.6 | 2026 | 1 | Qwen3 -ASR Technical Report | 2601.21337 |
| 3.6 | 2026 | 1 | Qwen3 -TTS Technical Report | 2601.15621 |
| 3.6 | 2025 | 1 | Qwen3 -VL Technical Report | 2511.21631 |
| 3.6 | 2025 | 1 | Efficient Tool-Calling Multi-Expert NPC Agent for Commonsense Persona-Grounded Dialogue | 2511.01720 |
| 4.7 | 2025 | 1 | Qwen3 -Omni Technical Report | 2509.17765 |
| 3.6 | 2025 | 1 | Qwen3 Technical Report | 2505.09388 |
| 4.7 | 2026 | 1 | FLARE: Few-shot Learning -based Adaptive Reflective Engine | 2608.02919 |
| 3.6 | 2026 | 1 | GEPA : Reflective Prompt Evolution Can Outperform Reinforcement Learning | 2507.19457 |
| 10.2 | 2026 | 1 | Stop Guessing When to Stop Testing: Efficient Model Evaluation with Just Enough Data | 2607.08522 |
| 10.2 | 2026 | 1 | On Randomness in Agentic Evals | 2602.07150 |
| 9.1 | 2026 | 1 | PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents | 2606.08106 |
| 8.7 | 2026 | 2 | Are We Testing Too Much? A Survey of Benchmark Compression for Efficient Evaluation of Large Languag | 2610.18248 |
| 8.3 | 2026 | 2 | Reproducible LLM Inference Benchmarking : A Sequential Isolation Protocol for Regression Testing | 2610.09778 |
| 8.3 | 2026 | 2 | Risk-Aware Adaptive Evaluation : Finding High-Impact Failures Under Limited Budgets | 2609.38914 |
| 8.3 | 2025 | 2 | Empowering Clinical Trial Design through AI: A Randomized Evaluation of PowerGPT | 2509.12471 |
| 8.3 | 2024 | 1 | Denoising Improves Cross-Scanner and Cross-Protocol Test-Retest Reproducibility of Higher-Order Diff | 2407.18253 |
| 8.0 | 2026 | 1 | EPI-SST: Renewal-Structured State-Space Transformers for Epidemic Forecasting | 2611.20352 |
| 8.0 | 2026 | 1 | ProCerDCL: Query-Efficient Black-Box Probabilistic Verification of Deep Learning Compiler Optimizati | 2610.36499 |
| 8.0 | 2026 | 1 | Decision-aware validation of zero-noise extrapolation in QAOA optimization landscapes | 2610.33386 |
| 8.0 | 2026 | 1 | Anytime - Valid Inference in Linear Models with Clustered Outcomes: Exact Multivariate Tests and Clu | 2610.25613 |
| 8.0 | 2026 | 1 | Hit Selection Using SSMD-Based Machine Learning Performance Metrics in High-Throughput Screening Ass | 2608.07609 |
| 8.0 | 2026 | 1 | AV-AIVAT: 74x Cheaper Agent Evaluation with Certified Anytime-Valid Stopping in Imperfect-Informatio | 2608.06362 |
| 8.0 | 2026 | 1 | Representation Without Reward: A JEPA Audit for LLM Fine-Tuning | 2605.15394 |
| 8.0 | 2025 | 1 | Beyond Top Activations: Efficient and Reliable Crowdsourced Evaluation of Automated Interpretability | 2506.07985 |
| 7.3 | 2026 | 1 | A tutorial on conducting sample size and power calculations for detecting treatment effect heterogen | 2501.18383 |
| 7.2 | 2024 | 1 | Covariance-free Bi-fidelity Control Variates Importance Sampling for Rare Event Reliability Analysis | 2405.03834 |
| 7.2 | 2023 | 1 | Distributionally Robust Stratified Sampling for Stochastic Simulations with Multiple Uncertain Input | 2306.09020 |
| 6.9 | 2026 | 1 | Realized versus Population Reliability: Anytime - Valid Self-Consistency Certification under Correla | 2611.26592 |
| 6.9 | 2026 | 1 | Cost-Efficient LLM Evaluation: A Framework for Narrow Confidence Intervals Under Fixed Budgets | 2609.29140 |
| 6.9 | 2026 | 1 | Martingalized U-statistics-based sequential inference: a blessing of degeneracy | 2611.00753 |
| 6.9 | 2026 | 1 | Anytime - Valid Inference in Conjoint Experiments | 2610.28979 |
| 6.9 | 2026 | 1 | Bayesian Evidence Fusion for Capability Tracking-A Simulation Study and Historical CI Pilot | 2611.14541 |
| 6.9 | 2026 | 1 | Harness Self-Evolution for Long-Horizon Terminal Agents | 2610.27435 |
| 6.9 | 2026 | 1 | How Should a Prompt Optimizer Spend a Tight Budget ? BudgetAPO with Noise- Adaptive Evaluation | 2610.05671 |
| 6.9 | 2026 | 1 | When Has a Bayesian Neural Network Sampled Enough? Adaptive Inference Time with Statistical Guarante | 2610.12212 |
| 6.9 | 2026 | 1 | When Is Enough Enough in Self-Evolving LLM Systems? | 2610.04756 |
| 6.9 | 2026 | 1 | The Difference Between " Replicable " and "Not Replicable " Is Not Itself Scientifically Replicable | 2604.26268 |
| 6.9 | 2026 | 1 | Which Self-Improvements Should We Trust? Reliable Self-Improvement When Agents Reuse Their Benchmark | 2609.33180 |
| 6.9 | 2026 | 1 | SymbolicArena: A Unified Infrastructure for Benchmark Distillation and Dynamic Evaluation in Symboli | 2609.35113 |
| 6.9 | 2026 | 1 | Online activity prediction via generalized Indian buffet process models | 2505.19643 |
| 6.9 | 2026 | 1 | A Statistical Approach to Estimating Sample Size of Machine Learning Models | 2609.09547 |
| 6.9 | 2026 | 1 | Incremental Pooled LLM Evaluation for Cost-Effective Retrieval Model Selection | 2609.02745 |
| 6.9 | 2026 | 1 | Half-Truth Audio Detection and Localisation: A Lightweight Cross-Attentive Architecture and a Cross- | 2605.29531 |
| 6.9 | 2026 | 1 | Power and Sample Size Calculations for Hybrid Controlled Trials | 2608.26475 |
| 6.9 | 2026 | 1 | Item Response Theory for AI Safety | 2608.05086 |
| 6.9 | 2026 | 1 | CalibratedRubric: Task- Adaptive Rubric Banks for Open-Ended LLM Evaluation | 2607.29252 |

## 读不到全文的（诚实记录）

- arXiv:2509.12471 — HTTP 404
- arXiv:2407.18253 — HTTP 404
- arXiv:2608.07609 — HTTP 404
- arXiv:2501.18383 — HTTP 404
- arXiv:2508.18815 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2603.13517 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2310.01547 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-24T17:31:46.067Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_