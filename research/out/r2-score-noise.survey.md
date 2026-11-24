# R2 评分与噪声：连续评分、评估方差、统计功效、噪声闸门

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 513 个不同候选，保留 327
- 回溯：读通 50 篇全文的参考文献，共 2416 条引用（1 篇无可用 HTML）
- 语料内被引：188 个工作被本语料至少两篇论文引用；被引最多的是 17 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 17 | 31 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. | 2306.05685 |
| 11 | 23 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 11 | 19 | 2022 | Training language models to follow instructions with human feedback. | 2203.02155 |
| 9 | 14 | 2024 | DeepSeekMath: Pushing the limits of mathematical reasoning in open language models. | 2402.03300 |
| 9 | 13 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. | 2305.18290 |
| 8 | 13 | 2021 | Training verifiers to solve math word problems. | 2110.14168 |
| 8 | 9 | 2024 | The Llama 3 herd of models. | 2407.21783 |
| 8 | 6 | 2022 | LoRA: Low-Rank Adaptation of Large Language Models. | 2106.09685 |
| 7 | 12 | 2017 | Proximal policy optimization algorithms. | 1707.06347 |
| 6 | 10 | 2024 | Let’s verify step by step. | 2305.20050 |
| 6 | 8 | 2024 | SWE-bench: can language models resolve real-world github issues? | — |
| 6 | 7 | 2021 | Measuring massive multitask language understanding. | 2009.03300 |
| 6 | 6 | 2025 | Qwen3 technical report. | 2505.09388 |
| 5 | 13 | 2024 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. | 2406.12045 |
| 5 | 10 | 2023 | Self-consistency improves chain of thought reasoning in language models. | — |
| 5 | 8 | 2024 | Adding error bars to evals: A statistical approach to language model evaluations. | 2411.00640 |
| 5 | 7 | 2024 | A Survey on LLM-as-a-Judge. | 2411.15594 |
| 5 | 6 | 2025 | Deepseek-r1: incentivizing reasoning capability in llms via reinforcement learning | 2501.12948 |
| 5 | 5 | 2021 | Measuring mathematical problem solving with the MATH dataset. | — |
| 5 | 4 | 2024 | Qwen2.5 technical report. | 2412.15115 |
| 4 | 7 | 2023 | Large language models are not fair evaluators | 2305.17926 |
| 4 | 6 | 1952 | Rank analysis of incomplete block designs: I. the method of paired comparisons. | — |
| 4 | 6 | 2017 | Deep reinforcement learning from human preferences. | — |
| 4 | 5 | 2022 | Language Models (Mostly) Know What They Know. | 2207.05221 |
| 4 | 4 | 2024 | SWE-agent: Agent-computer interfaces enable automated software engineering. | — |
| 4 | 3 | 2019 | Hellaswag: Can a machine really finish your sentence? | 1905.07830 |
| 4 | 2 | 2019 | Decoupled weight decay regularization. | 1711.05101 |
| 4 | 2 | 2021 | Program synthesis with large language models. | 2108.07732 |
| 3 | 19 | 2019 | BERT: Pre-training of deep bidirectional transformers for language understanding. | — |
| 3 | 8 | 2020 | Learning to summarize with human feedback. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 31 | 17 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. |
| 23 | 11 | 2021 | Evaluating large language models trained on code. |
| 19 | 11 | 2022 | Training language models to follow instructions with human feedback. |
| 14 | 9 | 2024 | DeepSeekMath: Pushing the limits of mathematical reasoning in open language models. |
| 13 | 9 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. |
| 13 | 8 | 2021 | Training verifiers to solve math word problems. |
| 9 | 8 | 2024 | The Llama 3 herd of models. |
| 6 | 8 | 2022 | LoRA: Low-Rank Adaptation of Large Language Models. |
| 12 | 7 | 2017 | Proximal policy optimization algorithms. |
| 10 | 6 | 2024 | Let’s verify step by step. |
| 8 | 6 | 2024 | SWE-bench: can language models resolve real-world github issues? |
| 7 | 6 | 2021 | Measuring massive multitask language understanding. |
| 6 | 6 | 2025 | Qwen3 technical report. |
| 13 | 5 | 2024 | τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. |
| 10 | 5 | 2023 | Self-consistency improves chain of thought reasoning in language models. |
| 8 | 5 | 2024 | Adding error bars to evals: A statistical approach to language model evaluations. |
| 7 | 5 | 2024 | A Survey on LLM-as-a-Judge. |
| 6 | 5 | 2025 | Deepseek-r1: incentivizing reasoning capability in llms via reinforcement learning |
| 5 | 5 | 2021 | Measuring mathematical problem solving with the MATH dataset. |
| 4 | 5 | 2024 | Qwen2.5 technical report. |
| 7 | 4 | 2023 | Large language models are not fair evaluators |
| 6 | 4 | 1952 | Rank analysis of incomplete block designs: I. the method of paired comparisons. |
| 6 | 4 | 2017 | Deep reinforcement learning from human preferences. |
| 5 | 4 | 2022 | Language Models (Mostly) Know What They Know. |
| 4 | 4 | 2024 | SWE-agent: Agent-computer interfaces enable automated software engineering. |
| 3 | 4 | 2019 | Hellaswag: Can a machine really finish your sentence? |
| 19 | 3 | 2019 | BERT: Pre-training of deep bidirectional transformers for language understanding. |
| 8 | 3 | 2020 | Learning to summarize with human feedback. |
| 7 | 3 | 2025 | Confidence improves self-consistency in LLMs |
| 5 | 3 | 2024 | Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators. |

## 各细分方向的开篇（按语料内最早一篇）

- **run-to-run variance**（122 篇，最早 2021-03-25）On the Stability of Fine-tuning BERT: Misconceptions, Explanations, and Strong Baselines · arXiv:2006.04884
- **judge / win-rate reliability**（62 篇，最早 2021-11-17）Training Verifiers to Solve Math Word Problems · arXiv:2110.14168
- **benchmark instability**（17 篇，最早 2023-02-28）Is Reinforcement Learning (Not) for Natural Language Processing: Benchmarks, Baselines, and Building Blocks fo · arXiv:2210.01241
- **statistics of evaluation**（11 篇，最早 2026-01-17）Spark-LLM-Eval: A Distributed Framework for Statistically Rigorous Large Language Model Evaluation · arXiv:2603.28769
- **partial credit / graded scoring**（6 篇，最早 2026-06-21）T-IMPACT: A Severity-Aware Benchmark for Contextual Image-Text Manipulation · arXiv:2606.22339
- **flaky measurement**（1 篇，最早 2024-09-16）Do Test and Environmental Complexity Increase Flakiness? An Empirical Study of SAP HANA · arXiv:2409.10062

## 最近的 SOTA（近两年）

- 2026-06-10 · Measuring Semantic Progress in Multi-turn Dialogue via Information Gain · arXiv:2606.12332
- 2025-09-13 · Rethinking Human Preference Evaluation of LLM Rationales · arXiv:2509.11026
- 2026-07-08 · Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings · arXiv:2508.11847
- 2026-11-19 · PosteriorBench: Evaluating Behavior Posterior Sampling in Language Models · arXiv:2611.25735
- 2026-11-18 · ToolPulse: Side-Channel Eavesdropping on Tool-Using LLM Agents · arXiv:2611.25470
- 2026-11-11 · ICARE: cross-domain text classification with incremental class-aware representation and distillation learning · arXiv:2611.24959
- 2026-11-18 · NullTok: empirical-null token selection for training -free long video understanding · arXiv:2611.23881
- 2026-11-17 · Say Less, Hallucinate Less? Diagnosing and Restoring Object Coverage in Preference-Optimized Vision- Language Models · arXiv:2611.23179
- 2026-07-31 · A Systematic Survey of Decompilation: Mapping Classical and Machine-Learning Approaches · arXiv:2611.21612
- 2026-11-16 · Edit Recommendation: Can LLMs Anticipate Edit Requests from Users, and When? · arXiv:2611.21155
- 2026-11-16 · Think2Listen: Evidence-Centric Learning For Agentic Audio Understanding With LALMS · arXiv:2611.21083
- 2026-11-15 · JointQ: Joint Scale-and-Integer Quantization for Large Language Models · arXiv:2611.20384
- 2026-11-14 · VAST: Compiling Grounded Vulnerability Scenarios into Verifiable, Multi-Step Environments for Evaluating LLM Red-Team Agents · arXiv:2611.19465
- 2026-11-17 · Zero-Shot Weight-Space Programming for Prediction and Classification of Target Variables in Structured Datasets · arXiv:2611.19292
- 2026-11-13 · Nahual: A Sequence Model for Language and Atoms · arXiv:2611.19072
- 2026-11-13 · Policy Optimization With Multiple Verifiers via Pareto Rankings · arXiv:2611.19064
- 2026-11-13 · Short Windows, Unmodelled Costs, Unknown Cutoffs: A Pre-Registered Evidence Audit of 91 LLM Trading Papers · arXiv:2611.18934
- 2026-11-13 · WeightBench: Evaluating Language Models as Weight-Space Programmers · arXiv:2611.18553
- 2026-11-13 · JFinBench: A Continuously Refreshable Japanese Financial Benchmark from the Latest Certification Exams · arXiv:2611.18130
- 2026-11-13 · Any Channel Count, One Token Stream: Incorporating Spatial Audio Understanding and Reasoning into Large Audio- Language Models · arXiv:2611.18112
- 2026-11-13 · See Every Block Once: Variance-Reduced Post- Training for Masked Diffusion Language Models · arXiv:2611.17754
- 2026-11-12 · I2C-GRPO: Insight Importance Checklist for Reinforcement Learning in a Multi-Agent DDoS Alert Triage Workflow · arXiv:2611.17534
- 2026-11-11 · CaseScope: A Multi-Field Benchmark for Case-Level Pathology Diagnosis with Multimodal LLMs · arXiv:2611.15325
- 2026-11-09 · Mobile AI Factory: Building Specialized Language Models for Your Mobile Device · arXiv:2611.13509
- 2026-11-09 · More Than Just Style: Benchmarking Personality Influence in Large Language Models · arXiv:2611.12392
- 2026-11-11 · DisasterVLG: Vision- Language Grounding and Evidence-Based Reasoning for Disaster Scene Understanding · arXiv:2611.12144
- 2026-11-09 · Spectral Unlearning: Transformer Structure-Preserving Updates for Language Models · arXiv:2611.11902
- 2026-11-08 · RealEmbedBench: Benchmarking LLMs on Real-World Application-Layer Embedded Software Tasks · arXiv:2611.11469
- 2026-11-07 · Semantic Synthesis over Brute-Force Search: LLM-Guided Transformation Design for Efficient Learning · arXiv:2611.10940
- 2026-11-07 · AutoC2V: Synthesis-Guided LLM Training for QoR-Optimized C++-to-Verilog Generation · arXiv:2611.10824

## 被常引但不在语料里（下一轮的查询）

- (11 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (11 篇引) Training language models to follow instructions with human feedback. · 2022 · arXiv:2203.02155
- (8 篇引) LoRA: Low-Rank Adaptation of Large Language Models. · 2022 · arXiv:2106.09685
- (7 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (6 篇引) Let’s verify step by step. · 2024 · arXiv:2305.20050
- (6 篇引) SWE-bench: can language models resolve real-world github issues? · 2024
- (6 篇引) Measuring massive multitask language understanding. · 2021 · arXiv:2009.03300
- (6 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (5 篇引) τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. · 2024 · arXiv:2406.12045
- (5 篇引) Self-consistency improves chain of thought reasoning in language models. · 2023
- (5 篇引) Adding error bars to evals: A statistical approach to language model evaluations. · 2024 · arXiv:2411.00640
- (5 篇引) A Survey on LLM-as-a-Judge. · 2024 · arXiv:2411.15594
- (5 篇引) Deepseek-r1: incentivizing reasoning capability in llms via reinforcement learning · 2025 · arXiv:2501.12948
- (5 篇引) Measuring mathematical problem solving with the MATH dataset. · 2021
- (5 篇引) Qwen2.5 technical report. · 2024 · arXiv:2412.15115
- (4 篇引) Large language models are not fair evaluators · 2023 · arXiv:2305.17926
- (4 篇引) Rank analysis of incomplete block designs: I. the method of paired comparisons. · 1952
- (4 篇引) Deep reinforcement learning from human preferences. · 2017
- (4 篇引) Language Models (Mostly) Know What They Know. · 2022 · arXiv:2207.05221
- (4 篇引) SWE-agent: Agent-computer interfaces enable automated software engineering. · 2024
- (4 篇引) Hellaswag: Can a machine really finish your sentence? · 2019 · arXiv:1905.07830
- (4 篇引) Decoupled weight decay regularization. · 2019 · arXiv:1711.05101
- (4 篇引) Program synthesis with large language models. · 2021 · arXiv:2108.07732
- (3 篇引) BERT: Pre-training of deep bidirectional transformers for language understanding. · 2019
- (3 篇引) Learning to summarize with human feedback. · 2020
- (3 篇引) Confidence improves self-consistency in LLMs · 2025
- (3 篇引) Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators. · 2024 · arXiv:2404.04475
- (3 篇引) Elements of information theory · 2006
- (3 篇引) A mathematical theory of communication. · 1948
- (3 篇引) DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning. · 2025
- (3 篇引) RoBERTa: A robustly optimized BERT pretraining approach. · 2019 · arXiv:1907.11692
- (3 篇引) Large language models are effective text rankers with pairwise ranking prompting. · 2024
- (3 篇引) Large Language Monkeys: Scaling Inference Compute with Repeated Sampling. · 2024 · arXiv:2407.21787
- (3 篇引) Scaling LLM test-time compute optimally can be more effective than scaling parameters for reasoning · 2025
- (3 篇引) Tree of thoughts: deliberate problem solving with large language models · 2023
- (3 篇引) An introduction to the bootstrap · 1993
- (3 篇引) Webarena: a realistic web environment for building autonomous agents · 2023 · arXiv:2307.13854
- (3 篇引) Simple statistical gradient-following algorithms for connectionist reinforcement learning. · 1992
- (3 篇引) Reinforcement learning: An introduction. · 1998
- (3 篇引) Fine-tuning language models from human preferences. · 2019 · arXiv:1909.08593

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 13.8 | 2026 | 1 | Measuring Semantic Progress in Multi-turn Dialogue via Information Gain | 2606.12332 |
| 14.9 | 2025 | 1 | Rethinking Human Preference Evaluation of LLM Rationales | 2509.11026 |
| 14.9 | 2026 | 1 | Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings | 2508.11847 |
| 13.0 | 2024 | 1 | TOWER: Tree Organized Weighting for Evaluating Complex Instructions | 2410.06089 |
| 14.1 | 2024 | 1 | From Crowdsourced Data to High-Quality Benchmarks: Arena -Hard and BenchBuilder Pipeline | 2406.11939 |
| 14.1 | 2023 | 1 | Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena | 2306.05685 |
| 3.6 | 2026 | 1 | PosteriorBench: Evaluating Behavior Posterior Sampling in Language Models | 2611.25735 |
| 3.6 | 2026 | 1 | ToolPulse: Side-Channel Eavesdropping on Tool-Using LLM Agents | 2611.25470 |
| 3.6 | 2026 | 1 | ICARE: cross-domain text classification with incremental class-aware representation and distillation | 2611.24959 |
| 3.6 | 2026 | 1 | NullTok: empirical-null token selection for training -free long video understanding | 2611.23881 |
| 4.7 | 2026 | 1 | Say Less, Hallucinate Less? Diagnosing and Restoring Object Coverage in Preference-Optimized Vision- | 2611.23179 |
| 4.0 | 2026 | 1 | A Systematic Survey of Decompilation: Mapping Classical and Machine-Learning Approaches | 2611.21612 |
| 3.6 | 2026 | 1 | Edit Recommendation: Can LLMs Anticipate Edit Requests from Users, and When? | 2611.21155 |
| 3.6 | 2026 | 1 | Think2Listen: Evidence-Centric Learning For Agentic Audio Understanding With LALMS | 2611.21083 |
| 3.6 | 2026 | 1 | JointQ: Joint Scale-and-Integer Quantization for Large Language Models | 2611.20384 |
| 4.7 | 2026 | 1 | VAST: Compiling Grounded Vulnerability Scenarios into Verifiable, Multi-Step Environments for Evalua | 2611.19465 |
| 4.7 | 2026 | 1 | Zero-Shot Weight-Space Programming for Prediction and Classification of Target Variables in Structur | 2611.19292 |
| 3.6 | 2026 | 1 | Nahual: A Sequence Model for Language and Atoms | 2611.19072 |
| 5.8 | 2026 | 1 | Policy Optimization With Multiple Verifiers via Pareto Rankings | 2611.19064 |
| 4.7 | 2026 | 1 | Short Windows, Unmodelled Costs, Unknown Cutoffs: A Pre-Registered Evidence Audit of 91 LLM Trading  | 2611.18934 |
| 4.7 | 2026 | 1 | WeightBench: Evaluating Language Models as Weight-Space Programmers | 2611.18553 |
| 4.7 | 2026 | 1 | JFinBench: A Continuously Refreshable Japanese Financial Benchmark from the Latest Certification Exa | 2611.18130 |
| 3.6 | 2026 | 1 | Any Channel Count, One Token Stream: Incorporating Spatial Audio Understanding and Reasoning into La | 2611.18112 |
| 5.8 | 2026 | 1 | See Every Block Once: Variance-Reduced Post- Training for Masked Diffusion Language Models | 2611.17754 |
| 5.8 | 2026 | 1 | I2C-GRPO: Insight Importance Checklist for Reinforcement Learning in a Multi-Agent DDoS Alert Triage | 2611.17534 |
| 3.6 | 2026 | 1 | CaseScope: A Multi-Field Benchmark for Case-Level Pathology Diagnosis with Multimodal LLMs | 2611.15325 |
| 3.6 | 2026 | 1 | Mobile AI Factory: Building Specialized Language Models for Your Mobile Device | 2611.13509 |
| 4.7 | 2026 | 1 | More Than Just Style: Benchmarking Personality Influence in Large Language Models | 2611.12392 |
| 3.6 | 2026 | 1 | DisasterVLG: Vision- Language Grounding and Evidence-Based Reasoning for Disaster Scene Understandin | 2611.12144 |
| 3.6 | 2026 | 1 | Spectral Unlearning: Transformer Structure-Preserving Updates for Language Models | 2611.11902 |
| 3.6 | 2026 | 1 | RealEmbedBench: Benchmarking LLMs on Real-World Application-Layer Embedded Software Tasks | 2611.11469 |
| 3.6 | 2026 | 1 | Semantic Synthesis over Brute-Force Search: LLM-Guided Transformation Design for Efficient Learning | 2611.10940 |
| 3.6 | 2026 | 1 | AutoC2V: Synthesis-Guided LLM Training for QoR-Optimized C++-to-Verilog Generation | 2611.10824 |
| 3.6 | 2026 | 1 | BlenderFORGE: Framework for Optimizing Reactive 3D-Graphics Editing Ability of MLLMs | 2611.10768 |
| 3.6 | 2026 | 1 | Pruning DNA Sequence | 2611.10386 |
| 3.6 | 2026 | 1 | Assessing the Impact of Retrieval-Augmented Generation on Algorithmic Problem-Solving | 2611.09791 |
| 3.6 | 2026 | 1 | Transformer-FSQ: Discrete Latents for Extreme KV-Cache Compression | 2611.09598 |
| 3.6 | 2026 | 1 | On the Effectiveness and Limitations of Open-Weight LLMs for Low-Resource Offensive Language Detecti | 2611.09506 |
| 3.6 | 2026 | 1 | Rethinking Data Selection as Distribution Matching on Semantic Manifolds | 2611.08495 |
| 4.7 | 2026 | 1 | Label-Wording Augmentation in a Typed-Decision Encoder: Gains on Unfamiliar Words, Not on Abbreviati | 2611.08439 |
| 4.7 | 2026 | 1 | FedReason: Large Language Models as Weight-Space Meta-Aggregators for Heterogeneous Federated Learni | 2611.08383 |
| 3.6 | 2026 | 1 | RIVER: Evidence-guided multi-agent retrieval for enzyme--reaction discovery | 2611.07757 |
| 3.6 | 2026 | 1 | Egocentric Action Recognition with Objects and Vision- Language Affordances | 2611.07673 |
| 3.6 | 2026 | 1 | Binding Paraphrased Instructions to Encountered Objects in sLLM Agents under Partial Observability | 2611.07599 |
| 3.6 | 2026 | 1 | On the Opportunities and Challenges of Prefill-to-Autoregressive Cross- Model Transfer | 2611.06976 |
| 5.8 | 2026 | 1 | PatchCon: Patch-aware Weighted Supervised Contrastive Learning for Vulnerability Detection | 2611.06583 |
| 4.7 | 2026 | 1 | Reassessing Dataset Quality and Fine-Tuning Practices for Vulnerability Detection on PrimeVul datase | 2611.06373 |
| 3.6 | 2026 | 1 | TSFM Meets LLM: Context as Covariates | 2611.05515 |
| 3.6 | 2026 | 1 | Catalyzing Interactive HTML Generation Capabilities via High-Fidelity Reinforcement Learning | 2611.05151 |
| 3.6 | 2026 | 1 | Forget What Comes Next: LLM Unlearning via Statistical Independence | 2611.03955 |
| 3.6 | 2026 | 1 | From Natural Language to Exact Cover: A Neuro-Symbolic Approach to Zebra Puzzles | 2611.03641 |
| 3.6 | 2026 | 1 | Not All Reasoning Generalizes: A Case Study on Learning Generalizable Reasoning Strategies in RLVR | 2611.03627 |
| 4.7 | 2026 | 1 | The Cost of Mismatch: Noise Amplification in Zeroth-Order Reinforcement Learning | 2611.03260 |
| 4.7 | 2026 | 1 | ACTOR: Action-Centered Temporal Organization for Literary Role-Playing Agents | 2611.03184 |
| 3.6 | 2026 | 1 | SurgPace: Complexity-Aware Progressive Distillation for Surgical Multimodal Large Language Models | 2611.03125 |
| 3.6 | 2026 | 1 | A Fine-Grained Hierarchy and Benchmark for State Tracking in Language Models | 2611.03094 |
| 3.6 | 2026 | 1 | Fly as Instructed : Refining World-Action Policies for UAV Vision- Language Navigation | 2611.22883 |
| 4.7 | 2026 | 1 | AuK Technical Report: An Open-Source Foundational Model for Speech Generation and Editing | 2609.08936 |
| 5.8 | 2026 | 1 | Improving Text-to-Audio Instruction Following via Fine-Grained Feedback from Audio-Aware Large Langu | 2607.13408 |
| 4.7 | 2026 | 1 | Qwen-Image-2.0-RL Technical Report | 2606.27608 |
| 3.6 | 2026 | 1 | A Systematic Post- Train Framework for Video Generation | 2604.25427 |
| 6.2 | 2026 | 1 | RbtAct: Rebuttal as Supervision for Actionable Review Feedback Generation | 2603.09723 |
| 3.6 | 2026 | 1 | Pushing Forward Pareto Frontiers of Proactive Agents with Behavioral Agentic Optimization | 2602.11351 |
| 4.7 | 2026 | 1 | R-Align: Enhancing Generative Reward Models through Rationale-Centric Meta-Judging | 2602.06763 |
| 4.7 | 2026 | 1 | StatLLaMA: Multi-Stage training for domain-optimized statistical large language models | 2601.09718 |
| 3.6 | 2026 | 1 | Can LLMs Track Their Output Length? A Dynamic Feedback Mechanism for Precise Length Regulation | 2601.01768 |
| 4.7 | 2026 | 1 | W2S-AlignTree: Weak-to-Strong Inference-Time Alignment for Large Language Models via Monte Carlo Tre | 2511.11518 |
| 5.8 | 2025 | 1 | Reward Model Routing in Alignment | 2510.02850 |
| 4.7 | 2025 | 1 | The Era of Real-World Human Interaction: RL from User Conversations | 2509.25137 |
| 3.6 | 2025 | 1 | Automated Procedural Analysis via Video- Language Models for AI-assisted Nursing Skills Assessment | 2509.16810 |
| 3.6 | 2025 | 1 | Balanced Actor Initialization: Stable RLHF Training of Distillation-Based Reasoning Models | 2509.00309 |
| 3.6 | 2026 | 1 | Learning from Natural Language Feedback for Personalized Question Answering | 2508.10695 |
| 3.6 | 2025 | 1 | CodeBoost: Boosting Code LLMs by Squeezing Knowledge from Code Snippets with RL | 2508.05242 |
| 4.7 | 2025 | 1 | Differentiable Reward Optimization for LLM based TTS system | 2507.05911 |
| 4.7 | 2025 | 1 | LaMDAgent: An Autonomous Framework for Post- Training Pipeline Optimization via LLM Agents | 2505.21963 |
| 3.6 | 2025 | 1 | RFTF: Reinforcement Fine-tuning for Embodied Agents with Temporal Feedback | 2505.19767 |
| 3.6 | 2025 | 1 | ManipLVM-R1: Reinforcement Learning for Reasoning in Embodied Manipulation with Large Vision- Langua | 2505.16517 |
| 5.8 | 2025 | 1 | HelpSteer3-Preference: Open Human -Annotated Preference Data across Diverse Tasks and Languages | 2505.11475 |
| 4.7 | 2025 | 1 | Vision-R1: Evolving Human -Free Alignment in Large Vision- Language Models via Vision-Guided Reinfor | 2503.18013 |
| 3.6 | 2025 | 1 | TextGames: Learning to Self-Play Text-Based Puzzle Games via Language Model Reasoning | 2502.18431 |

## 读不到全文的（诚实记录）

- arXiv:2609.33044 — HTTP 404

_生成于 2026-11-24T17:19:15.350Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_