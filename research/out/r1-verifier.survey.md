# R1 判决与验证器：奖励黑客、判决可靠性、验证器设计

- 检索：26 条查询（每条最多 3 页 × 50）→ 979 个不同候选，保留 363
- 回溯：读通 70 篇全文的参考文献，共 2954 条引用（6 篇无可用 HTML）
- 语料内被引：310 个工作被本语料至少两篇论文引用；被引最多的是 31 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 31 | 47 | 2024 | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. | 2402.03300 |
| 22 | 49 | 2023 | Scaling Laws for Reward Model Overoptimization. | 2210.10760 |
| 18 | 23 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. | 2306.05685 |
| 17 | 27 | 2022 | Training language models to follow instructions with human feedback. | 2203.02155 |
| 16 | 16 | 2025 | Qwen3 Technical Report. | 2505.09388 |
| 15 | 30 | 2024 | SWE-bench: can language models resolve real-world GitHub issues? | — |
| 15 | 26 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. | 2503.11926 |
| 15 | 20 | 2016 | Concrete problems in ai safety. | 1606.06565 |
| 14 | 22 | 2022 | Defining and characterizing reward gaming. | — |
| 14 | 21 | 2025 | ImpossibleBench: Measuring LLMs’ propensity of exploiting test cases. | 2510.20270 |
| 13 | 19 | 2025 | Defining and characterizing reward hacking. | 2209.13085 |
| 13 | 17 | 2022 | The effects of reward misspecification: Mapping and mitigating misaligned models. | 2201.03544 |
| 12 | 17 | 2024 | Let’s verify step by step. | 2305.20050 |
| 11 | 17 | 2025 | Natural emergent misalignment from reward hacking in production rl. | 2511.18397 |
| 11 | 12 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. | 2606.19348 |
| 10 | 15 | 2026 | Evilgenie: A reward hacking benchmark. | 2511.21654 |
| 10 | 12 | 2024 | Sycophancy to subterfuge: Investigating reward-tampering in large language models. | 2406.10162 |
| 9 | 24 | 2026 | Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains. | 2507.17746 |
| 9 | 17 | 2025 | Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. | 2501.12948 |
| 9 | 14 | 2025 | Recent frontier models are reward hacking. | — |
| 8 | 15 | 2025 | DAPO: An open-source LLM reinforcement learning system at scale. | 2503.14476 |
| 8 | 14 | 2017 | Proximal policy optimization algorithms. | 1707.06347 |
| 8 | 12 | 2017 | Deep reinforcement learning from human preferences. | 1706.03741 |
| 8 | 11 | 2026 | Reward hacking benchmark: Measuring exploits in LLM agents with tool use. | 2605.02964 |
| 8 | 9 | 2026 | SpecBench: Measuring reward hacking in long-horizon coding agents. | 2605.21384 |
| 7 | 17 | 2026 | Terminal-Bench: Benchmarking agents on hard, realistic tasks in command line interfaces. | 2601.11868 |
| 7 | 15 | 2023 | Direct preference optimization: Your language model is secretly a reward model. | — |
| 7 | 13 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 7 | 10 | 2023 | React: Synergizing reasoning and acting in language models. | 2210.03629 |
| 7 | 6 | 2024 | Livecodebench: Holistic and contamination free evaluation of large language models for code. | 2403.07974 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 47 | 31 | 2024 | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models. |
| 49 | 22 | 2023 | Scaling Laws for Reward Model Overoptimization. |
| 23 | 18 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. |
| 27 | 17 | 2022 | Training language models to follow instructions with human feedback. |
| 16 | 16 | 2025 | Qwen3 Technical Report. |
| 30 | 15 | 2024 | SWE-bench: can language models resolve real-world GitHub issues? |
| 26 | 15 | 2025 | Monitoring reasoning models for misbehavior and the risks of promoting obfuscation. |
| 20 | 15 | 2016 | Concrete problems in ai safety. |
| 22 | 14 | 2022 | Defining and characterizing reward gaming. |
| 21 | 14 | 2025 | ImpossibleBench: Measuring LLMs’ propensity of exploiting test cases. |
| 19 | 13 | 2025 | Defining and characterizing reward hacking. |
| 17 | 13 | 2022 | The effects of reward misspecification: Mapping and mitigating misaligned models. |
| 17 | 12 | 2024 | Let’s verify step by step. |
| 17 | 11 | 2025 | Natural emergent misalignment from reward hacking in production rl. |
| 12 | 11 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. |
| 15 | 10 | 2026 | Evilgenie: A reward hacking benchmark. |
| 12 | 10 | 2024 | Sycophancy to subterfuge: Investigating reward-tampering in large language models. |
| 24 | 9 | 2026 | Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains. |
| 17 | 9 | 2025 | Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. |
| 14 | 9 | 2025 | Recent frontier models are reward hacking. |
| 15 | 8 | 2025 | DAPO: An open-source LLM reinforcement learning system at scale. |
| 14 | 8 | 2017 | Proximal policy optimization algorithms. |
| 12 | 8 | 2017 | Deep reinforcement learning from human preferences. |
| 11 | 8 | 2026 | Reward hacking benchmark: Measuring exploits in LLM agents with tool use. |
| 9 | 8 | 2026 | SpecBench: Measuring reward hacking in long-horizon coding agents. |
| 17 | 7 | 2026 | Terminal-Bench: Benchmarking agents on hard, realistic tasks in command line interfaces. |
| 15 | 7 | 2023 | Direct preference optimization: Your language model is secretly a reward model. |
| 13 | 7 | 2021 | Evaluating large language models trained on code. |
| 10 | 7 | 2023 | React: Synergizing reasoning and acting in language models. |
| 6 | 7 | 2024 | Livecodebench: Holistic and contamination free evaluation of large language models for code. |

## 各细分方向的开篇（按语料内最早一篇）

- **reward hacking / specification gaming**（59 篇，最早 2024-08-16）Helping or Herding? Reward Model Ensembles Mitigate but do not Eliminate Reward Hacking · arXiv:2312.09244
- **benchmark validity**（44 篇，最早 2024-10-14）From Crowdsourced Data to High-Quality Benchmarks: Arena -Hard and BenchBuilder Pipeline · arXiv:2406.11939
- **judge reliability**（41 篇，最早 2023-12-23）Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena · arXiv:2306.05685
- **verifier design / test oracle**（27 篇，最早 2026-01-09）Understanding LLM-Driven Test Oracle Generation · arXiv:2601.05542
- **process vs outcome supervision**（14 篇，最早 2026-02-03）PRPO: Aligning Process Reward with Outcome Reward in Policy Optimization · arXiv:2601.07182
- **sabotage / sandbagging / deception**（7 篇，最早 2025-06-18）LLM Agents for Bargaining with Utility-based Feedback · arXiv:2505.22998
- **test generation / repair**（5 篇，最早 2026-07-10）Multi- Agent LLM Collaboration for Unit Test Generation via Human-Testing-Inspired Workflows · arXiv:2607.09101

## 最近的 SOTA（近两年）

- 2025-11-27 · DeepSeekMath -V2: Towards Self-Verifiable Mathematical Reasoning · arXiv:2511.22570
- 2026-01-03 · From RLHF to Direct Alignment: A Theoretical Unification of Preference Learning for Large Language Models · arXiv:2601.06108
- 2026-06-10 · Measuring Semantic Progress in Multi-turn Dialogue via Information Gain · arXiv:2606.12332
- 2025-09-13 · Rethinking Human Preference Evaluation of LLM Rationales · arXiv:2509.11026
- 2026-07-08 · Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings · arXiv:2508.11847
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
- 2025-03-14 · Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation · arXiv:2503.11926
- 2026-10-29 · Countable Nondeterminism in Weighted Programming with an Application to Mechanized Foundations for Probabilistic Program Verificat · arXiv:2610.39723
- 2026-10-28 · Game -Theoretic Foundations for Undiscounted Bisimulation Metrics · arXiv:2610.38313
- 2026-11-13 · An Automata-Based Approach to Games with $ω$-Automatic Preferences · arXiv:2602.08549
- 2026-10-25 · Sequential Solution Concepts in Cooperative Games with Generalized Characteristic Functions · arXiv:2510.11255
- 2025-10-23 · ImpossibleBench : Measuring LLMs ' Propensity of Exploiting Test Cases · arXiv:2510.20270

## 被常引但不在语料里（下一轮的查询）

- (17 篇引) Training language models to follow instructions with human feedback. · 2022 · arXiv:2203.02155
- (15 篇引) SWE-bench: can language models resolve real-world GitHub issues? · 2024
- (14 篇引) Defining and characterizing reward gaming. · 2022
- (13 篇引) Defining and characterizing reward hacking. · 2025 · arXiv:2209.13085
- (13 篇引) The effects of reward misspecification: Mapping and mitigating misaligned models. · 2022 · arXiv:2201.03544
- (12 篇引) Let’s verify step by step. · 2024 · arXiv:2305.20050
- (11 篇引) Deepseek-v4: Towards highly efficient million-token context intelligence. · 2026 · arXiv:2606.19348
- (10 篇引) Evilgenie: A reward hacking benchmark. · 2026 · arXiv:2511.21654
- (10 篇引) Sycophancy to subterfuge: Investigating reward-tampering in large language models. · 2024 · arXiv:2406.10162
- (9 篇引) Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains. · 2026 · arXiv:2507.17746
- (9 篇引) Deepseek-r1: Incentivizing reasoning capability in LLMs via reinforcement learning. · 2025 · arXiv:2501.12948
- (9 篇引) Recent frontier models are reward hacking. · 2025
- (8 篇引) DAPO: An open-source LLM reinforcement learning system at scale. · 2025 · arXiv:2503.14476
- (8 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (8 篇引) Deep reinforcement learning from human preferences. · 2017 · arXiv:1706.03741
- (8 篇引) Reward hacking benchmark: Measuring exploits in LLM agents with tool use. · 2026 · arXiv:2605.02964
- (8 篇引) SpecBench: Measuring reward hacking in long-horizon coding agents. · 2026 · arXiv:2605.21384
- (7 篇引) Terminal-Bench: Benchmarking agents on hard, realistic tasks in command line interfaces. · 2026 · arXiv:2601.11868
- (7 篇引) Direct preference optimization: Your language model is secretly a reward model. · 2023
- (7 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (7 篇引) React: Synergizing reasoning and acting in language models. · 2023 · arXiv:2210.03629
- (7 篇引) Livecodebench: Holistic and contamination free evaluation of large language models for code. · 2024 · arXiv:2403.07974
- (6 篇引) SWE-Bench Pro: can AI agents solve long-horizon software engineering tasks? · 2025 · arXiv:2509.16941
- (6 篇引) Countdown-code: a testbed for studying the emergence and generalization of reward hacking in rlvr · 2026 · arXiv:2603.07084
- (6 篇引) Introducing SWE-bench Verified · 2026
- (6 篇引) Glm-5: from vibe coding to agentic engineering. · 2026 · arXiv:2602.15763
- (6 篇引) DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning. · 2025
- (6 篇引) Reward Hacking in Rubric-Based Reinforcement Learning. · 2026 · arXiv:2605.12474
- (6 篇引) Tulu 3: Pushing frontiers in open language model post-training. · 2024 · arXiv:2411.15124
- (6 篇引) Kimi k3: Open frontier intelligence. · 2026 · arXiv:2607.24653
- (6 篇引) Specification gaming: The flip side of ai ingenuity. · 2020
- (6 篇引) Constitutional AI: Harmlessness from AI Feedback. · 2022 · arXiv:2212.08073
- (6 篇引) Qwen2.5 technical report. · 2024 · arXiv:2412.15115
- (5 篇引) Measuring mathematical problem solving with the MATH dataset. · 2021 · arXiv:2103.03874
- (5 篇引) τ \tau -bench: A benchmark for tool-agent-user interaction in real-world domains. · 2025 · arXiv:2406.12045
- (5 篇引) Training verifiers to solve math word problems. · 2021 · arXiv:2110.14168
- (5 篇引) Towards understanding sycophancy in language models. · 2024 · arXiv:2310.13548
- (5 篇引) Training software engineering agents and verifiers with swe-gym. · 2025 · arXiv:2412.21139
- (5 篇引) Is it thinking or cheating? detecting implicit reward hacking by measuring reasoning effort. · 2026
- (5 篇引) SWE-agent: agent-computer interfaces enable automated software engineering · 2024

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 3.6 | 2025 | 1 | DeepSeekMath -V2: Towards Self-Verifiable Mathematical Reasoning | 2511.22570 |
| 2.8 | 2024 | 1 | DeepSeekMath : Pushing the Limits of Mathematical Reasoning in Open Language Models | 2402.03300 |
| 3.6 | 2026 | 1 | From RLHF to Direct Alignment: A Theoretical Unification of Preference Learning for Large Language M | 2601.06108 |
| 2.8 | 2024 | 1 | Scaling Laws for Reward Model Overoptimization in Direct Alignment Algorithms | 2406.02900 |
| 2.1 | 2022 | 1 | Scaling Laws for Reward Model Overoptimization | 2210.10760 |
| 3.6 | 2026 | 1 | Measuring Semantic Progress in Multi-turn Dialogue via Information Gain | 2606.12332 |
| 3.6 | 2025 | 1 | Rethinking Human Preference Evaluation of LLM Rationales | 2509.11026 |
| 3.6 | 2026 | 1 | Dropping Just a Handful of Preferences Can Change Top Large Language Model Rankings | 2508.11847 |
| 2.8 | 2024 | 1 | TOWER: Tree Organized Weighting for Evaluating Complex Instructions | 2410.06089 |
| 3.9 | 2024 | 1 | From Crowdsourced Data to High-Quality Benchmarks: Arena -Hard and BenchBuilder Pipeline | 2406.11939 |
| 3.9 | 2023 | 1 | Judging LLM -as-a- Judge with MT - Bench and Chatbot Arena | 2306.05685 |
| 3.6 | 2026 | 1 | UltraBERT-JEV: Encoder models for System One Applications | 2611.17867 |
| 3.6 | 2026 | 1 | Adapting Qwen3 to Tajik from 0.6B to 8B: Lower Text Loss Did Not Mean Better Understanding | 2611.06062 |
| 4.7 | 2026 | 1 | Beyond the Benchmark: Conditioning, Domains and Failure Modes of Qwen3 -TTS | 2610.23678 |
| 3.6 | 2026 | 1 | Permutation-Robust Decision Modeling with Candidate-Independent Block-Causal Attention | 2610.01601 |
| 3.6 | 2026 | 1 | PivotOPD: Learning to Recover from Pivotal Mistakes in Multi-Turn Agents | 2609.40285 |
| 4.7 | 2026 | 1 | FinixDoc: Rethinking Financial Document Parsing Beyond Saturated Benchmarks | 2608.22842 |
| 4.7 | 2026 | 1 | Industrial-Instruction: An End-to-End Framework for Building Instruction-Tuning and Benchmark Datase | 2608.22817 |
| 3.6 | 2026 | 1 | In-Cell Learning: Language Models That Update Their Own Weights in Sequence Without Changing the Fil | 2608.20873 |
| 3.6 | 2026 | 1 | ASR-Roundtrip Evaluation Can Mask Context- and Convention-Dependent Reading Errors in Chinese News T | 2608.10606 |
| 3.6 | 2026 | 1 | Small, Free, and Effective: Orchestrating Open-Weight Small Language Models to Outperform Single LLM | 2607.20216 |
| 4.7 | 2026 | 1 | Enginuity: A Dataset and Benchmark for Vision-Language Understanding of Engineering Diagrams | 2606.03410 |
| 3.6 | 2026 | 1 | Qwen3 -Coder-Next Technical Report | 2603.00729 |
| 3.6 | 2026 | 1 | Ruyi2 Technical Report | 2602.22543 |
| 3.6 | 2026 | 1 | Qwen3 -ASR Technical Report | 2601.21337 |
| 3.6 | 2026 | 1 | Qwen3 -TTS Technical Report | 2601.15621 |
| 3.6 | 2025 | 1 | Qwen3 -VL Technical Report | 2511.21631 |
| 3.6 | 2025 | 1 | Efficient Tool-Calling Multi-Expert NPC Agent for Commonsense Persona-Grounded Dialogue | 2511.01720 |
| 3.6 | 2025 | 1 | Qwen3 -Omni Technical Report | 2509.17765 |
| 3.6 | 2025 | 1 | Qwen3 Technical Report | 2505.09388 |
| 5.8 | 2025 | 1 | Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation | 2503.11926 |
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
| 3.6 | 2025 | 1 | ImpossibleBench : Measuring LLMs ' Propensity of Exploiting Test Cases | 2510.20270 |
| 3.6 | 2026 | 1 | Food Critic: An Agentic Visualization System for Auditable Restaurant- Safety Reasoning | 2611.15843 |
| 3.6 | 2026 | 1 | AI Alignment Is Neither Solvable nor Sufficient | 2611.13167 |
| 3.6 | 2026 | 1 | Verified Implementation of the Next-gen Borrow Checking Algorithm for Rust via Abstract Interpretati | 2611.06319 |
| 3.6 | 2026 | 1 | When Compliance Data Masquerades as Evaluation: Measurement Validity for Deployed AI Systems | 2609.13642 |
| 3.6 | 2026 | 1 | Thomson: Continual Learning of Frontier Models for SovereignAI | 2608.27147 |
| 4.7 | 2026 | 1 | An Investigation of the NeurIPS and ICML 2025 Position Tracks | 2608.16894 |
| 3.6 | 2026 | 1 | Engineering Trustworthy Agentic AI for Critical Systems | 2607.18548 |
| 3.6 | 2026 | 1 | Position: Preventing AI -Generated CSAM Necessitates New Approaches to AI Safety | 2607.05407 |
| 3.6 | 2026 | 1 | Position: Don't Just "Fix it in Post": A Science of AI Must Study Training Dynamics | 2606.06533 |
| 3.6 | 2026 | 1 | Bridging the Gap in the Responsible AI Divides | 2603.14495 |
| 3.6 | 2026 | 1 | A Collaborative Reasoning Framework for Anomaly Diagnostics in Underwater Robotics | 2511.03075 |
| 2.8 | 2024 | 1 | SoK: Towards Security and Safety of Edge AI | 2410.05349 |
| 2.8 | 2024 | 1 | IDs for AI Systems | 2406.12137 |
| 2.8 | 2024 | 1 | Expectation Alignment: Handling Reward Misspecification in the Presence of Expectation Mismatch | 2404.08791 |
| 10.8 | 2023 | 1 | Concrete Problems in AI Safety , Revisited | 2401.10899 |
| 2.8 | 2024 | 1 | Safety and Performance, Why Not Both? Bi-Objective Optimized Model Compression against Heterogeneous | 2401.00996 |
| 2.8 | 2023 | 1 | Linear-Time Verification of Data-Aware Processes Modulo Theories via Covers and Automata (Extended V | 2310.12180 |
| 2.5 | 2022 | 1 | A survey of Identification and mitigation of Machine Learning algorithmic biases in Image Analysis | 2210.04491 |
| 2.1 | 2022 | 1 | Safety and Performance, Why not Both? Bi-Objective Optimized Model Compression toward AI Software De | 2208.05969 |
| 2.1 | 2022 | 1 | Sandboxing ( AI -based) Unverified Controllers in Stochastic Games: An Abstraction-based Approach wi | 2203.14924 |
| 2.1 | 2021 | 1 | Auditing Robot Learning for Safety and Compliance during Deployment | 2110.05702 |
| 2.1 | 2022 | 1 | The Role of Explainability in Assuring Safety of Machine Learning in Healthcare | 2109.00520 |
| 2.1 | 2020 | 1 | Open Questions in Creating Safe Open-ended AI : Tensions Between Control and Creativity | 2006.07495 |
| 1.4 | 2018 | 1 | Siamese Generative Adversarial Privatizer for Biometric Data | 1804.08757 |
| 1.4 | 2017 | 1 | Robust Computer Algebra, Theorem Proving, and Oracle AI | 1708.02553 |
| 9.4 | 2016 | 1 | Concrete Problems in AI Safety | 1606.06565 |
| 3.6 | 2026 | 1 | Fly as Instructed : Refining World-Action Policies for UAV Vision- Language Navigation | 2611.22883 |
| 3.6 | 2026 | 1 | AuK Technical Report: An Open-Source Foundational Model for Speech Generation and Editing | 2609.08936 |
| 3.6 | 2026 | 1 | Improving Text-to-Audio Instruction Following via Fine-Grained Feedback from Audio-Aware Large Langu | 2607.13408 |
| 3.6 | 2026 | 1 | Qwen-Image-2.0-RL Technical Report | 2606.27608 |
| 3.6 | 2026 | 1 | A Systematic Post- Train Framework for Video Generation | 2604.25427 |
| 4.0 | 2026 | 1 | RbtAct: Rebuttal as Supervision for Actionable Review Feedback Generation | 2603.09723 |
| 3.6 | 2026 | 1 | Pushing Forward Pareto Frontiers of Proactive Agents with Behavioral Agentic Optimization | 2602.11351 |

## 读不到全文的（诚实记录）

- arXiv:2610.26088 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2609.35677 — HTTP 404
- arXiv:2606.29771 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2611.10305 — HTTP 404
- arXiv:2610.04793 — HTTP 404
- arXiv:2607.13707 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-22T06:08:21.904Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_