# R1 判决与验证器：奖励黑客、判决可靠性、验证器设计

- 检索：29 条查询 + 10 条回填查询（取自 gap 的标题）（每条最多 3 页 × 50）→ 1147 个不同候选，保留 394
- 回溯：读通 70 篇全文的参考文献，共 3555 条引用（2 篇无可用 HTML）
- 语料内被引：358 个工作被本语料至少两篇论文引用；被引最多的是 28 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 28 | 56 | 2024 | SWE-bench: can language models resolve real-world Github issues? | 2310.06770 |
| 26 | 53 | 2024 | DeepSeekMath: Pushing the limits of mathematical reasoning in open language models. | 2402.03300 |
| 17 | 32 | 2024 | Let’s verify step by step. | 2305.20050 |
| 17 | 22 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. | 2306.05685 |
| 14 | 39 | 2023 | Scaling laws for reward model overoptimization. | 2210.10760 |
| 14 | 22 | 2022 | Training language models to follow instructions with human feedback. | 2203.02155 |
| 13 | 27 | 2022 | Defining and characterizing reward gaming. | — |
| 13 | 26 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. | 2503.11926 |
| 13 | 23 | 2024 | SWE-agent: Agent-computer interfaces enable automated software engineering. | 2405.15793 |
| 13 | 20 | 2016 | Concrete problems in AI safety. | 1606.06565 |
| 12 | 28 | 2025 | SWE-bench Pro: can AI agents solve long-horizon software engineering tasks? | 2509.16941 |
| 12 | 27 | 2025 | Training software engineering agents and verifiers with SWE-Gym. | 2412.21139 |
| 12 | 22 | 2024 | Introducing SWE-bench verified. | — |
| 12 | 16 | 2025 | Qwen3 technical report. | 2505.09388 |
| 11 | 25 | 2025 | Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. | 2501.12948 |
| 11 | 17 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 11 | 16 | 2026 | Terminal-Bench: benchmarking agents on hard, realistic tasks in command line interfaces | 2601.11868 |
| 10 | 20 | 2026 | SWE-smith: Scaling data for software engineering agents. | 2504.21798 |
| 10 | 18 | 2025 | DAPO: An open-source LLM reinforcement learning system at scale. | 2503.14476 |
| 10 | 18 | 2025 | Impossiblebench: Measuring llms’ propensity of exploiting test cases. | 2510.20270 |
| 10 | 13 | 2023 | ReAct: Synergizing reasoning and acting in language models. | 2210.03629 |
| 9 | 13 | 2025 | Recent frontier models are reward hacking. | — |
| 9 | 13 | 2021 | The effects of reward misspecification: Mapping and mitigating misaligned models. | 2201.03544 |
| 9 | 9 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. | 2606.19348 |
| 8 | 24 | 2026 | Rubrics as rewards: Reinforcement learning beyond verifiable domains. | 2507.17746 |
| 8 | 16 | 2025 | OpenHands: An open platform for AI software developers as generalist agents. | 2407.16741 |
| 8 | 14 | 2026 | Multi-SWE-bench: A multilingual benchmark for issue resolving. | 2504.02605 |
| 8 | 11 | 2021 | Program synthesis with large language models. | 2108.07732 |
| 8 | 7 | 2024 | Sycophancy to subterfuge: Investigating reward-tampering in large language models. | 2406.10162 |
| 7 | 21 | 2025 | Natural emergent misalignment from reward hacking in production rl. | 2511.18397 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 56 | 28 | 2024 | SWE-bench: can language models resolve real-world Github issues? |
| 53 | 26 | 2024 | DeepSeekMath: Pushing the limits of mathematical reasoning in open language models. |
| 32 | 17 | 2024 | Let’s verify step by step. |
| 22 | 17 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. |
| 39 | 14 | 2023 | Scaling laws for reward model overoptimization. |
| 22 | 14 | 2022 | Training language models to follow instructions with human feedback. |
| 27 | 13 | 2022 | Defining and characterizing reward gaming. |
| 26 | 13 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. |
| 23 | 13 | 2024 | SWE-agent: Agent-computer interfaces enable automated software engineering. |
| 20 | 13 | 2016 | Concrete problems in AI safety. |
| 28 | 12 | 2025 | SWE-bench Pro: can AI agents solve long-horizon software engineering tasks? |
| 27 | 12 | 2025 | Training software engineering agents and verifiers with SWE-Gym. |
| 22 | 12 | 2024 | Introducing SWE-bench verified. |
| 16 | 12 | 2025 | Qwen3 technical report. |
| 25 | 11 | 2025 | Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. |
| 17 | 11 | 2021 | Evaluating large language models trained on code. |
| 16 | 11 | 2026 | Terminal-Bench: benchmarking agents on hard, realistic tasks in command line interfaces |
| 20 | 10 | 2026 | SWE-smith: Scaling data for software engineering agents. |
| 18 | 10 | 2025 | DAPO: An open-source LLM reinforcement learning system at scale. |
| 18 | 10 | 2025 | Impossiblebench: Measuring llms’ propensity of exploiting test cases. |
| 13 | 10 | 2023 | ReAct: Synergizing reasoning and acting in language models. |
| 13 | 9 | 2025 | Recent frontier models are reward hacking. |
| 13 | 9 | 2021 | The effects of reward misspecification: Mapping and mitigating misaligned models. |
| 9 | 9 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. |
| 24 | 8 | 2026 | Rubrics as rewards: Reinforcement learning beyond verifiable domains. |
| 16 | 8 | 2025 | OpenHands: An open platform for AI software developers as generalist agents. |
| 14 | 8 | 2026 | Multi-SWE-bench: A multilingual benchmark for issue resolving. |
| 11 | 8 | 2021 | Program synthesis with large language models. |
| 7 | 8 | 2024 | Sycophancy to subterfuge: Investigating reward-tampering in large language models. |
| 21 | 7 | 2025 | Natural emergent misalignment from reward hacking in production rl. |

## 各细分方向的开篇（按语料内最早一篇）

- **reward hacking / specification gaming**（124 篇，最早 2016-07-25）Concrete Problems in AI Safety · arXiv:1606.06565
- **benchmark validity**（54 篇，最早 2023-07-24）Large Language Models are Few-shot Testers: Exploring LLM-based General Bug Reproduction · arXiv:2209.11515
- **judge reliability**（44 篇，最早 2023-12-23）Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena · arXiv:2306.05685
- **verifier design / test oracle**（41 篇，最早 2025-08-08）CodeARC: Benchmarking Reasoning Capabilities of LLM Agents for Inductive Program Synthesis · arXiv:2503.23145
- **process vs outcome supervision**（33 篇，最早 2026-01-01）W2S-AlignTree: Weak-to-Strong Inference-Time Alignment for Large Language Models via Monte Carlo Tree Search · arXiv:2511.11518
- **test generation / repair**（8 篇，最早 2026-05-12）Characterizing the Failure Modes of LLMs in Resolving Real-World GitHub Issues · arXiv:2605.12270
- **sabotage / sandbagging / deception**（4 篇，最早 2026-03-02）Sleeper Cell: Injecting Latent Malice Temporal Backdoors into Tool-Using LLMs · arXiv:2603.03371

## 最近的 SOTA（近两年）

- 2025-11-27 · DeepSeekMath -V2: Towards Self-Verifiable Mathematical Reasoning · arXiv:2511.22570
- 2026-06-10 · Measuring Semantic Progress in Multi-turn Dialogue via Information Gain · arXiv:2606.12332
- 2025-09-13 · Rethinking Human Preference Evaluation of LLM Rationales · arXiv:2509.11026
- 2026-07-08 · Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings · arXiv:2508.11847
- 2026-11-23 · Linear forms in logarithms of rational numbers: an ineffective measure with the best possible exponent · arXiv:2611.30820
- 2026-11-19 · Self- verifiable LLM-driven science and why it needs human researchers · arXiv:2611.26754
- 2026-11-18 · Agentic Harness Engineering Beta: Requirement-Centered Evolution of Agent Harnesses · arXiv:2611.24924
- 2026-11-05 · Where Does an On-Device Prescription Reader Lose Medications? A Frozen-Replay Study, from a 270M Language Model to a 2B Vision-Lan · arXiv:2611.18699
- 2026-11-22 · Catch It Where It Happens: Real-Time Error Correction During LLM Reasoning · arXiv:2611.13107
- 2026-10-31 · Using LLM Agents to Evaluate Prosocial Interventions on Social Media Platforms · arXiv:2611.12922
- 2026-11-07 · Keeping LLM Agents on Procedure: Executable Finite-State Control for Long-Horizon Instruction Fidelity · arXiv:2611.10884
- 2026-11-07 · No Second Run: Does RSI Stop at Frontier Pre-training? · arXiv:2611.10719
- 2026-11-06 · SciCheck: A Framework for Verifying the Integrity of Deep Learning Training · arXiv:2611.09889
- 2026-10-26 · samQEq: universal charge equilibration for molecules and conductors · arXiv:2611.03687
- 2026-11-02 · Ask, Don't Equip: Question-Driven Coding Agents for Deep Kernel Optimization · arXiv:2611.03517
- 2026-10-31 · When Should an Agent Refresh? Adaptive Index Reuse for Efficient Long-Horizon Reasoning · arXiv:2611.01429
- 2026-11-01 · Positive Values of Inhomogeneous Quadratic Forms of Type (1, 4): The Constant Γ_{1,4} = 8 · arXiv:2610.41223
- 2026-11-13 · Temporal regularization of petal modes in single conjugate adaptive optics systems: The soft-limiter approach · arXiv:2610.40184
- 2026-10-26 · CuraLoc: Repository-Level Fault Localization via Planned Code Inspection · arXiv:2610.31809
- 2026-10-20 · PACT-VLA: Speculative Action-Chunk Verification with Pre-Commit Observations · arXiv:2610.28019
- 2026-10-19 · StepBench: Diagnosing Real-World Procedural Understanding in AI Agents · arXiv:2610.26679
- 2026-10-19 · Pangolin: Efficient DAG-based BFT State-Machine Replication with TEE-Accelerated Commitment · arXiv:2610.26295
- 2026-10-09 · AutoEnvScaling: Automating the Data Flywheel with Terminal Agents · arXiv:2610.14163
- 2026-10-06 · More than 83.9% of the zeros of the Riemann zeta function are distinct and more than 67.35% are simple and on the critical line · arXiv:2610.08965
- 2026-10-11 · Nucleus Speculative Decoding: Plausibility-Aware Verification Beyond Exact Distribution · arXiv:2610.07822
- 2026-10-05 · VERA: Scaling Verifiable Environments for Agentic co-Evolution · arXiv:2610.05923
- 2026-10-01 · VERSE: Verified Self-Evolving Optimizer for Agent Harnesses · arXiv:2610.02616
- 2026-09-30 · Improved Quantum Random Self-Reduction for Linear Problems · arXiv:2609.39823
- 2026-09-28 · AutoDataBench: Can Agents Write the Data That Feeds the Self-Improvement Loop? · arXiv:2609.35025
- 2026-09-22 · Diffusion Drafts, AR Verifies : Accelerating Document OCR with Self-Speculative Decoding · arXiv:2609.26638

## 被常引但不在语料里（下一轮的查询）

- (28 篇引) SWE-bench: can language models resolve real-world Github issues? · 2024 · arXiv:2310.06770
- (17 篇引) Let’s verify step by step. · 2024 · arXiv:2305.20050
- (14 篇引) Training language models to follow instructions with human feedback. · 2022 · arXiv:2203.02155
- (13 篇引) Defining and characterizing reward gaming. · 2022
- (12 篇引) SWE-bench Pro: can AI agents solve long-horizon software engineering tasks? · 2025 · arXiv:2509.16941
- (12 篇引) Training software engineering agents and verifiers with SWE-Gym. · 2025 · arXiv:2412.21139
- (12 篇引) Introducing SWE-bench verified. · 2024
- (12 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (11 篇引) Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. · 2025 · arXiv:2501.12948
- (11 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (11 篇引) Terminal-Bench: benchmarking agents on hard, realistic tasks in command line interfaces · 2026 · arXiv:2601.11868
- (10 篇引) SWE-smith: Scaling data for software engineering agents. · 2026 · arXiv:2504.21798
- (10 篇引) DAPO: An open-source LLM reinforcement learning system at scale. · 2025 · arXiv:2503.14476
- (10 篇引) Impossiblebench: Measuring llms’ propensity of exploiting test cases. · 2025 · arXiv:2510.20270
- (10 篇引) ReAct: Synergizing reasoning and acting in language models. · 2023 · arXiv:2210.03629
- (9 篇引) Recent frontier models are reward hacking. · 2025
- (9 篇引) The effects of reward misspecification: Mapping and mitigating misaligned models. · 2021 · arXiv:2201.03544
- (9 篇引) Deepseek-v4: Towards highly efficient million-token context intelligence. · 2026 · arXiv:2606.19348
- (8 篇引) Rubrics as rewards: Reinforcement learning beyond verifiable domains. · 2026 · arXiv:2507.17746
- (8 篇引) OpenHands: An open platform for AI software developers as generalist agents. · 2025 · arXiv:2407.16741
- (8 篇引) Multi-SWE-bench: A multilingual benchmark for issue resolving. · 2026 · arXiv:2504.02605
- (8 篇引) Program synthesis with large language models. · 2021 · arXiv:2108.07732
- (8 篇引) Sycophancy to subterfuge: Investigating reward-tampering in large language models. · 2024 · arXiv:2406.10162
- (7 篇引) Natural emergent misalignment from reward hacking in production rl. · 2025 · arXiv:2511.18397
- (7 篇引) Training verifiers to solve math word problems. · 2021 · arXiv:2110.14168
- (7 篇引) Math-shepherd: Verify and reinforce llms step-by-step without human annotations. · 2024
- (7 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (7 篇引) DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning. · 2025
- (7 篇引) τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. · 2024 · arXiv:2406.12045
- (7 篇引) Evilgenie: A reward hacking benchmark · 2026 · arXiv:2511.21654
- (6 篇引) SWE-rebench: An automated pipeline for task collection and decontaminated evaluation of software engineering a · 2026 · arXiv:2505.20411
- (6 篇引) Reflexion: Language agents with verbal reinforcement learning. · 2023
- (6 篇引) Direct preference optimization: Your language model is secretly a reward model. · 2023
- (6 篇引) Tulu 3: Pushing frontiers in open language model post-training. · 2024 · arXiv:2411.15124
- (6 篇引) Defining and characterizing reward hacking. · 2025 · arXiv:2209.13085
- (6 篇引) Qwen2.5-Coder technical report. · 2024 · arXiv:2409.12186
- (6 篇引) Constitutional ai: Harmlessness from ai feedback. · 2022 · arXiv:2212.08073
- (6 篇引) Specification gaming: The flip side of ai ingenuity. · 2020
- (6 篇引) Self-rewarding language models. · 2024
- (6 篇引) SpecBench: Measuring reward hacking in long-horizon coding agents. · 2026 · arXiv:2605.21384

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 4.7 | 2025 | 1 | DeepSeekMath -V2: Towards Self-Verifiable Mathematical Reasoning | 2511.22570 |
| 3.9 | 2024 | 1 | DeepSeekMath : Pushing the Limits of Mathematical Reasoning in Open Language Models | 2402.03300 |
| 5.8 | 2026 | 1 | Measuring Semantic Progress in Multi-turn Dialogue via Information Gain | 2606.12332 |
| 4.7 | 2025 | 1 | Rethinking Human Preference Evaluation of LLM Rationales | 2509.11026 |
| 4.7 | 2026 | 1 | Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings | 2508.11847 |
| 5.0 | 2024 | 1 | TOWER: Tree Organized Weighting for Evaluating Complex Instructions | 2410.06089 |
| 5.0 | 2024 | 1 | From Crowdsourced Data to High-Quality Benchmarks: Arena -Hard and BenchBuilder Pipeline | 2406.11939 |
| 6.1 | 2023 | 1 | Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena | 2306.05685 |
| 3.6 | 2026 | 1 | Linear forms in logarithms of rational numbers: an ineffective measure with the best possible expone | 2611.30820 |
| 4.7 | 2026 | 1 | Self- verifiable LLM-driven science and why it needs human researchers | 2611.26754 |
| 5.8 | 2026 | 1 | Agentic Harness Engineering Beta: Requirement-Centered Evolution of Agent Harnesses | 2611.24924 |
| 3.6 | 2026 | 1 | Where Does an On-Device Prescription Reader Lose Medications? A Frozen-Replay Study, from a 270M Lan | 2611.18699 |
| 5.8 | 2026 | 1 | Catch It Where It Happens: Real-Time Error Correction During LLM Reasoning | 2611.13107 |
| 3.6 | 2026 | 1 | Using LLM Agents to Evaluate Prosocial Interventions on Social Media Platforms | 2611.12922 |
| 12.7 | 2026 | 1 | Keeping LLM Agents on Procedure: Executable Finite-State Control for Long-Horizon Instruction Fideli | 2611.10884 |
| 4.7 | 2026 | 1 | No Second Run: Does RSI Stop at Frontier Pre-training? | 2611.10719 |
| 5.8 | 2026 | 1 | SciCheck: A Framework for Verifying the Integrity of Deep Learning Training | 2611.09889 |
| 3.6 | 2026 | 1 | samQEq: universal charge equilibration for molecules and conductors | 2611.03687 |
| 3.6 | 2026 | 1 | Ask, Don't Equip: Question-Driven Coding Agents for Deep Kernel Optimization | 2611.03517 |
| 12.7 | 2026 | 1 | When Should an Agent Refresh? Adaptive Index Reuse for Efficient Long-Horizon Reasoning | 2611.01429 |
| 3.6 | 2026 | 1 | Positive Values of Inhomogeneous Quadratic Forms of Type (1, 4): The Constant Γ_{1,4} = 8 | 2610.41223 |
| 3.6 | 2026 | 1 | Temporal regularization of petal modes in single conjugate adaptive optics systems: The soft-limiter | 2610.40184 |
| 12.7 | 2026 | 1 | CuraLoc: Repository-Level Fault Localization via Planned Code Inspection | 2610.31809 |
| 4.7 | 2026 | 1 | PACT-VLA: Speculative Action-Chunk Verification with Pre-Commit Observations | 2610.28019 |
| 5.8 | 2026 | 1 | StepBench: Diagnosing Real-World Procedural Understanding in AI Agents | 2610.26679 |
| 3.6 | 2026 | 1 | Pangolin: Efficient DAG-based BFT State-Machine Replication with TEE-Accelerated Commitment | 2610.26295 |
| 3.6 | 2026 | 1 | AutoEnvScaling: Automating the Data Flywheel with Terminal Agents | 2610.14163 |
| 3.6 | 2026 | 1 | More than 83.9% of the zeros of the Riemann zeta function are distinct and more than 67.35% are simp | 2610.08965 |
| 4.7 | 2026 | 1 | Nucleus Speculative Decoding: Plausibility-Aware Verification Beyond Exact Distribution | 2610.07822 |
| 5.8 | 2026 | 1 | VERA: Scaling Verifiable Environments for Agentic co-Evolution | 2610.05923 |
| 4.7 | 2026 | 1 | VERSE: Verified Self-Evolving Optimizer for Agent Harnesses | 2610.02616 |
| 3.6 | 2026 | 1 | Improved Quantum Random Self-Reduction for Linear Problems | 2609.39823 |
| 5.8 | 2026 | 1 | AutoDataBench: Can Agents Write the Data That Feeds the Self-Improvement Loop? | 2609.35025 |
| 3.6 | 2026 | 1 | Diffusion Drafts, AR Verifies : Accelerating Document OCR with Self-Speculative Decoding | 2609.26638 |
| 6.9 | 2026 | 1 | CoEvo: Oracle-Grounded Self-Evolution of a Single Model for Multi- Step Causal Reasoning | 2609.26094 |
| 3.6 | 2026 | 1 | A Walk From Free Probability to Matrix Discrepancy III: Higher Rank Kadison-Singer and Spectrally Th | 2609.21279 |
| 4.7 | 2026 | 1 | ASPIRE: Asynchronous Batched Self-Speculative Decoding for Long-Context LLM Inference | 2609.17943 |
| 6.9 | 2026 | 1 | PaperDoctor: Evidence-Grounded and Actionable Feedback for Scientific Papers in Progress | 2609.16995 |
| 4.7 | 2026 | 1 | Atlas: Efficient Verifiable Semantic Search | 2609.11841 |
| 3.6 | 2026 | 1 | Asymptotic mean value Laplacian on equiregular sub-Riemannian manifolds | 2609.02710 |
| 4.7 | 2026 | 1 | ArcticSwarm: Deferring Early Consensus in Long-Horizon Multi-Agent Research | 2609.01870 |
| 4.7 | 2026 | 1 | GUI-CC: Benchmarking Contextual Consistency of GUI World Models as Agent Environments | 2609.00048 |
| 5.8 | 2026 | 1 | Schwarz: Solver-Aware Agentic Program Verification | 2608.30803 |
| 3.6 | 2026 | 1 | The Decoherence Exponent: Stable Phase Noise and Constraints on Objective State Reduction | 2608.18335 |
| 5.8 | 2026 | 1 | What Do Compliance Detectors Read? An Audit of Activation Probes and Guard Models | 2608.16852 |
| 4.7 | 2026 | 1 | How to Verify Probabilistic Consistency of Predictive Models | 2608.11181 |
| 3.6 | 2026 | 1 | Exact Periodicity, Surjectivity, and a Haar Limit Law for a Restarting Josephus Process | 2608.09092 |
| 5.8 | 2026 | 1 | Reinforcement Learning with Evolving Rubrics as Rewards for Audio Reasoning | 2608.02831 |
| 3.6 | 2026 | 1 | TraceViT: Grounded Trace Supervision for Visual Abstract Reasoning | 2607.29586 |
| 4.7 | 2026 | 1 | ParaASR: Multi-Token Prediction for Fast and Long-Context LLM-Based Speech Recognition | 2607.29279 |
| 3.6 | 2026 | 1 | A Type-and-Effect System for Temporal Dependency Analysis of Render-based Reactive Programs | 2607.27074 |
| 3.6 | 2026 | 1 | Toward Auditable AI Scientists: A Hypothesis Evolution Protocol for LLM Agents | 2607.09195 |
| 4.7 | 2026 | 1 | Agon: Competitive Cross-Model RL with Implicit Rival Grading of Reasoning | 2607.07690 |
| 11.6 | 2026 | 1 | SWE-MeM: Learning Adaptive Memory Management for Long-Horizon Coding Agents | 2606.28434 |
| 4.7 | 2026 | 1 | Speculation at a Distance: Where Edge-Cloud Speculative Decoding Actually Pays Off | 2606.25091 |
| 11.6 | 2026 | 1 | Probe-and-Refine Tuning of Repository Guidance for Coding Agents | 2606.20512 |
| 4.7 | 2026 | 1 | Thinking with Visual Grounding | 2606.16122 |
| 3.6 | 2026 | 1 | Sparrow: Sparse Rollout for Stable and Efficient Long-context RL of Large Language Models | 2606.08446 |
| 4.7 | 2026 | 1 | From RLHF to Direct Alignment: A Theoretical Unification of Preference Learning for Large Language M | 2601.06108 |
| 5.0 | 2024 | 1 | Scaling Laws for Reward Model Overoptimization in Direct Alignment Algorithms | 2406.02900 |
| 3.2 | 2022 | 1 | Scaling Laws for Reward Model Overoptimization | 2210.10760 |
| 3.6 | 2026 | 1 | Countable Nondeterminism in Weighted Programming with an Application to Mechanized Foundations for P | 2610.39723 |
| 3.6 | 2026 | 1 | Game -Theoretic Foundations for Undiscounted Bisimulation Metrics | 2610.38313 |
| 3.6 | 2026 | 1 | An Automata-Based Approach to Games with $ω$-Automatic Preferences | 2602.08549 |
| 3.6 | 2026 | 1 | Sequential Solution Concepts in Cooperative Games with Generalized Characteristic Functions | 2510.11255 |
| 2.8 | 2024 | 1 | The Cyber Alliance Game : How Alliances Influence Cyber-Warfare | 2410.05953 |
| 2.1 | 2022 | 1 | Stable and Efficient Shapley Value-Based Reward Reallocation for Multi-Agent Reinforcement Learning  | 2203.06333 |
| 2.1 | 2022 | 1 | On Reward -Penalty-Selection Games | 2201.05515 |
| 2.1 | 2021 | 1 | Gamifying optimization: a Wasserstein distance-based analysis of human search | 2112.06292 |
| 2.1 | 2021 | 1 | Unifying Behavioral and Response Diversity for Open-ended Learning in Zero-sum Games | 2106.04958 |
| 2.1 | 2021 | 1 | Do the Rich Get Richer? Fairness Analysis for Blockchain Incentives | 2103.14713 |
| 1.4 | 2018 | 1 | Sequential Experiment Design for Hypothesis Verification | 1812.01137 |
| 2.1 | 2020 | 1 | On time-inconsistent stopping problems and mixed strategy stopping times | 1804.07018 |
| 1.4 | 2017 | 1 | Adaptive Multiple-Arm Identification | 1706.01026 |
| 1.4 | 2015 | 1 | Hybrid Centralized-Distributed Resource Allocation for Device-to-Device Communication Underlaying Ce | 1502.04539 |
| 1.4 | 2013 | 1 | Incentive Mechanisms based on Minority Game in Heterogeneous DTNs | 1207.6760 |
| 5.8 | 2025 | 1 | Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation | 2503.11926 |
| 2.8 | 2024 | 1 | SWE - agent : Agent - Computer Interfaces Enable Automated Software Engineering | 2405.15793 |
| 3.6 | 2026 | 1 | Food Critic: An Agentic Visualization System for Auditable Restaurant- Safety Reasoning | 2611.15843 |
| 3.6 | 2026 | 1 | AI Alignment Is Neither Solvable nor Sufficient | 2611.13167 |

## 读不到全文的（诚实记录）

- arXiv:2605.12270 — HTTP 404
- arXiv:2610.26088 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-24T17:18:45.773Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_