# R7 自我修改与循环：自改 agent、元进化、多样性崩塌与漂移

- 检索：18 条查询（每条最多 2 页 × 50）→ 740 个不同候选，保留 282
- 回溯：读通 50 篇全文的参考文献，共 3733 条引用（3 篇无可用 HTML）
- 语料内被引：155 个工作被本语料至少两篇论文引用；被引最多的是 14 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 30 | 2015 | Illuminating search spaces by mapping elites. | 1504.04909 |
| 9 | 15 | 2016 | Quality diversity: A new frontier for evolutionary computation. | — |
| 8 | 14 | 2024 | Mathematical discoveries from program search with large language models. | — |
| 7 | 12 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. | 2506.13131 |
| 7 | 9 | 2011 | Abandoning objectives: Evolution through the search for novelty alone. | — |
| 6 | 13 | 2023 | Voyager: An open-ended embodied agent with large language models. | 2305.16291 |
| 6 | 10 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 6 | 7 | 2015 | Robots That Can Adapt Like Animals. | — |
| 5 | 11 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts | 2402.16822 |
| 5 | 7 | 2025 | Automated design of agentic systems. | 2408.08435 |
| 5 | 4 | 2023 | Reflexion: Language agents with verbal reinforcement learning. | — |
| 4 | 13 | 2025 | Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation a | 2507.06261 |
| 4 | 12 | 2024 | The Llama 3 herd of models. | 2407.21783 |
| 4 | 11 | 2025 | Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents. | 2505.22954 |
| 4 | 6 | 2024 | Swe-bench: Can language models resolve real-world github issues? | — |
| 4 | 6 | 2026 | GEPA: Reflective prompt evolution can outperform reinforcement learning. | 2507.19457 |
| 4 | 6 | 2002 | Evolving Neural Networks through Augmenting Topologies. | — |
| 4 | 5 | 2025 | Artificial hivemind: The open-ended homogeneity of language models (and beyond). | 2510.22954 |
| 4 | 4 | 2020 | Language models are few-shot learners. | — |
| 4 | 4 | 2023 | React: Synergizing reasoning and acting in language models. | 2210.03629 |
| 4 | 4 | 2025 | Qwen2.5 technical report. | 2412.15115 |
| 3 | 20 | 2023 | Self-consuming generative models go mad. | 2307.01850 |
| 3 | 17 | 2025 | Qwen3 technical report. | 2505.09388 |
| 3 | 13 | 2024 | Ai models collapse when trained on recursively generated data. | — |
| 3 | 11 | 2022 | Multi-Objective Quality Diversity Optimization. | 2202.03057 |
| 3 | 6 | 2018 | Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites Algorit | — |
| 3 | 6 | 2024 | Deepseekmath: Pushing the limits of mathematical reasoning in open language models. | 2402.03300 |
| 3 | 5 | 2024 | OMNI: Open-endedness via Models of human Notions of Interestingness. | 2306.01711 |
| 3 | 5 | 2026 | HyperAgents. | 2603.19461 |
| 3 | 5 | 2021 | Measuring mathematical problem solving with the math dataset. | 2103.03874 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 30 | 14 | 2015 | Illuminating search spaces by mapping elites. |
| 15 | 9 | 2016 | Quality diversity: A new frontier for evolutionary computation. |
| 14 | 8 | 2024 | Mathematical discoveries from program search with large language models. |
| 12 | 7 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. |
| 9 | 7 | 2011 | Abandoning objectives: Evolution through the search for novelty alone. |
| 13 | 6 | 2023 | Voyager: An open-ended embodied agent with large language models. |
| 10 | 6 | 2021 | Evaluating large language models trained on code. |
| 7 | 6 | 2015 | Robots That Can Adapt Like Animals. |
| 11 | 5 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts |
| 7 | 5 | 2025 | Automated design of agentic systems. |
| 4 | 5 | 2023 | Reflexion: Language agents with verbal reinforcement learning. |
| 13 | 4 | 2025 | Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next gene |
| 12 | 4 | 2024 | The Llama 3 herd of models. |
| 11 | 4 | 2025 | Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents. |
| 6 | 4 | 2024 | Swe-bench: Can language models resolve real-world github issues? |
| 6 | 4 | 2026 | GEPA: Reflective prompt evolution can outperform reinforcement learning. |
| 6 | 4 | 2002 | Evolving Neural Networks through Augmenting Topologies. |
| 5 | 4 | 2025 | Artificial hivemind: The open-ended homogeneity of language models (and beyond). |
| 4 | 4 | 2020 | Language models are few-shot learners. |
| 4 | 4 | 2023 | React: Synergizing reasoning and acting in language models. |
| 4 | 4 | 2025 | Qwen2.5 technical report. |
| 20 | 3 | 2023 | Self-consuming generative models go mad. |
| 17 | 3 | 2025 | Qwen3 technical report. |
| 13 | 3 | 2024 | Ai models collapse when trained on recursively generated data. |
| 11 | 3 | 2022 | Multi-Objective Quality Diversity Optimization. |
| 6 | 3 | 2018 | Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites |
| 6 | 3 | 2024 | Deepseekmath: Pushing the limits of mathematical reasoning in open language models. |
| 5 | 3 | 2024 | OMNI: Open-endedness via Models of human Notions of Interestingness. |
| 5 | 3 | 2026 | HyperAgents. |
| 5 | 3 | 2021 | Measuring mathematical problem solving with the math dataset. |

## 各细分方向的开篇（按语料内最早一篇）

- **evolutionary search over agents**（73 篇，最早 2023-03-16）Arbitrary Order Meta-Learning with Simple Population-Based Evolution · arXiv:2303.09478
- **self-modification**（31 篇，最早 2026-05-13）Harnessing Agentic Evolution · arXiv:2605.13821
- **evaluator overfitting**（25 篇，最早 2025-12-07）POLARIS: Is Multi- Agentic Reasoning the Next Wave in Engineering Self-Adaptive Systems? · arXiv:2512.04702
- **diversity & collapse**（20 篇，最早 2020-05-08）BOP- Elites , a Bayesian Optimisation algorithm for Quality-Diversity search · arXiv:2005.04320
- **open-endedness**（6 篇，最早 2023-05-21）Augmenting Autotelic Agents with Large Language Models · arXiv:2305.12487
- **complexity control**（3 篇，最早 2026-10-04）AgentDiscover: Autonomous Discovery with Minimal Search Scaffolding · arXiv:2610.05334

## 最近的 SOTA（近两年）

- 2026-05-08 · Adversarial Coevolutionary Illumination with Generational Adversarial MAP - Elites · arXiv:2505.06617
- 2026-10-04 · AgentDiscover: Autonomous Discovery with Minimal Search Scaffolding · arXiv:2610.05334
- 2026-10-03 · CURIO: Curiosity-Driven Test-Time Learning for Open-Ended Discovery · arXiv:2610.04851
- 2026-08-25 · InsightSR: Refining Symbolic Regression Search Spaces via Parallel Semantic and Structural LLM Guidance · arXiv:2608.25291
- 2026-07-29 · EvoPINN: Agentic Discovery of Executable Algorithms for Physics-Informed Neural Networks · arXiv:2607.26490
- 2026-05-11 · LLMs Improving LLMs: Agentic Discovery for Test-Time Scaling · arXiv:2605.08083
- 2025-10-09 · Iterated Agent for Symbolic Regression · arXiv:2510.08317
- 2025-09-17 · ShinkaEvolve: Towards Open-Ended And Sample-Efficient Program Evolution · arXiv:2509.19349
- 2025-03-20 · LLM-SR: Scientific Equation Discovery via Programming with Large Language Models · arXiv:2404.18400
- 2026-11-18 · automodel: A Skill for Agentic Model Discovery · arXiv:2611.24347
- 2026-10-22 · MLEvolve: A Self-Evolving Framework for Automated Machine Learning Algorithm Discovery · arXiv:2606.06473
- 2026-02-25 · ArchAgent: Agentic AI-driven Computer Architecture Discovery · arXiv:2602.22425
- 2026-02-02 · DeltaEvolve: Accelerating Scientific Discovery through Momentum-Driven Evolution · arXiv:2602.02919
- 2025-12-30 · LoongFlow: Directed Evolutionary Search via a Cognitive Plan-Execute-Summarize Paradigm · arXiv:2512.24077
- 2025-12-22 · Mathematical exploration and discovery at scale · arXiv:2511.02864
- 2025-10-07 · Scientific Algorithm Discovery by Augmenting AlphaEvolve with Deep Research · arXiv:2510.06056
- 2025-06-16 · AlphaEvolve : A coding agent for scientific and algorithmic discovery · arXiv:2506.13131
- 2025-12-16 · MindForge: Empowering Embodied Agents with Theory of Mind for Lifelong Cultural Learning · arXiv:2411.12977
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

## 被常引但不在语料里（下一轮的查询）

- (9 篇引) Quality diversity: A new frontier for evolutionary computation. · 2016
- (8 篇引) Mathematical discoveries from program search with large language models. · 2024
- (7 篇引) Abandoning objectives: Evolution through the search for novelty alone. · 2011
- (6 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (6 篇引) Robots That Can Adapt Like Animals. · 2015
- (5 篇引) Rainbow teaming: open-ended generation of diverse adversarial prompts · 2024 · arXiv:2402.16822
- (5 篇引) Automated design of agentic systems. · 2025 · arXiv:2408.08435
- (5 篇引) Reflexion: Language agents with verbal reinforcement learning. · 2023
- (4 篇引) Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation age · 2025 · arXiv:2507.06261
- (4 篇引) The Llama 3 herd of models. · 2024 · arXiv:2407.21783
- (4 篇引) Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents. · 2025 · arXiv:2505.22954
- (4 篇引) Swe-bench: Can language models resolve real-world github issues? · 2024
- (4 篇引) GEPA: Reflective prompt evolution can outperform reinforcement learning. · 2026 · arXiv:2507.19457
- (4 篇引) Evolving Neural Networks through Augmenting Topologies. · 2002
- (4 篇引) Artificial hivemind: The open-ended homogeneity of language models (and beyond). · 2025 · arXiv:2510.22954
- (4 篇引) Language models are few-shot learners. · 2020
- (4 篇引) React: Synergizing reasoning and acting in language models. · 2023 · arXiv:2210.03629
- (4 篇引) Qwen2.5 technical report. · 2025 · arXiv:2412.15115
- (3 篇引) Self-consuming generative models go mad. · 2023 · arXiv:2307.01850
- (3 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (3 篇引) Ai models collapse when trained on recursively generated data. · 2024
- (3 篇引) Multi-Objective Quality Diversity Optimization. · 2022 · arXiv:2202.03057
- (3 篇引) Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites Algorithm · 2018
- (3 篇引) Deepseekmath: Pushing the limits of mathematical reasoning in open language models. · 2024 · arXiv:2402.03300
- (3 篇引) OMNI: Open-endedness via Models of human Notions of Interestingness. · 2024 · arXiv:2306.01711
- (3 篇引) Measuring mathematical problem solving with the math dataset. · 2021 · arXiv:2103.03874
- (3 篇引) Aflow: automating agentic workflow generation · 2025 · arXiv:2410.10762
- (3 篇引) Jailbreaking black-box large language models in twenty queries · 2023 · arXiv:2310.08419
- (3 篇引) Quality and Diversity Optimization: A Unifying Modular Framework. · 1941
- (3 篇引) Continual Lifelong Learning with Neural Networks: A Review. · 2019
- (3 篇引) STaR: Bootstrapping Reasoning With Reasoning. · 2022
- (3 篇引) AutoDAN: generating stealthy jailbreak prompts on aligned large language models · 2024 · arXiv:2310.04451
- (3 篇引) HarmBench: a standardized evaluation framework for automated red teaming and robust refusal · 2024 · arXiv:2402.04249
- (3 篇引) Promptbreeder: Self-Referential Self-Improvement Via Prompt Evolution. · 2023 · arXiv:2309.16797
- (3 篇引) Program synthesis with large language models. · 2021 · arXiv:2108.07732
- (3 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (3 篇引) Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks. · 2017
- (3 篇引) Self-Rewarding Language Models. · 2024 · arXiv:2401.10020
- (3 篇引) Evolving a diversity of virtual creatures through novelty search and local competition. In Proceedings of the  · 2011
- (3 篇引) Chain-of-thought prompting elicits reasoning in large language models. · 2022

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14.9 | 2026 | 1 | Adversarial Coevolutionary Illumination with Generational Adversarial MAP - Elites | 2505.06617 |
| 3.9 | 2023 | 1 | Gradient-Informed Quality Diversity for the Illumination of Discrete Spaces | 2306.05138 |
| 13.4 | 2021 | 1 | Generating and Blending Game Levels via Quality-Diversity in the Latent Space of a Variational Autoe | 2102.12463 |
| 12.3 | 2020 | 1 | BOP- Elites , a Bayesian Optimisation algorithm for Quality-Diversity search | 2005.04320 |
| 1.4 | 2019 | 1 | Evaluating MAP - Elites on Constrained Optimization Problems | 1902.00703 |
| 1.4 | 2017 | 1 | Data-Efficient Exploration, Optimization, and Modeling of Diverse Designs through Surrogate-Assisted | 1702.03713 |
| 1.4 | 2015 | 1 | Illuminating search spaces by mapping elites | 1504.04909 |
| 4.7 | 2026 | 1 | AgentDiscover: Autonomous Discovery with Minimal Search Scaffolding | 2610.05334 |
| 4.7 | 2026 | 1 | CURIO: Curiosity-Driven Test-Time Learning for Open-Ended Discovery | 2610.04851 |
| 3.6 | 2026 | 1 | InsightSR: Refining Symbolic Regression Search Spaces via Parallel Semantic and Structural LLM Guida | 2608.25291 |
| 3.6 | 2026 | 1 | EvoPINN: Agentic Discovery of Executable Algorithms for Physics-Informed Neural Networks | 2607.26490 |
| 3.6 | 2026 | 1 | LLMs Improving LLMs: Agentic Discovery for Test-Time Scaling | 2605.08083 |
| 3.6 | 2025 | 1 | Iterated Agent for Symbolic Regression | 2510.08317 |
| 5.8 | 2025 | 1 | ShinkaEvolve: Towards Open-Ended And Sample-Efficient Program Evolution | 2509.19349 |
| 3.6 | 2025 | 1 | LLM-SR: Scientific Equation Discovery via Programming with Large Language Models | 2404.18400 |
| 3.6 | 2026 | 1 | automodel: A Skill for Agentic Model Discovery | 2611.24347 |
| 3.6 | 2026 | 1 | MLEvolve: A Self-Evolving Framework for Automated Machine Learning Algorithm Discovery | 2606.06473 |
| 3.6 | 2026 | 1 | ArchAgent: Agentic AI-driven Computer Architecture Discovery | 2602.22425 |
| 4.7 | 2026 | 1 | DeltaEvolve: Accelerating Scientific Discovery through Momentum-Driven Evolution | 2602.02919 |
| 4.7 | 2025 | 1 | LoongFlow: Directed Evolutionary Search via a Cognitive Plan-Execute-Summarize Paradigm | 2512.24077 |
| 11.6 | 2025 | 1 | Mathematical exploration and discovery at scale | 2511.02864 |
| 11.6 | 2025 | 1 | Scientific Algorithm Discovery by Augmenting AlphaEvolve with Deep Research | 2510.06056 |
| 11.6 | 2025 | 1 | AlphaEvolve : A coding agent for scientific and algorithmic discovery | 2506.13131 |
| 2.8 | 2024 | 1 | STAR: Synthesis of Tailored Architectures | 2411.17800 |
| 3.6 | 2025 | 1 | MindForge: Empowering Embodied Agents with Theory of Mind for Lifelong Cultural Learning | 2411.12977 |
| 2.8 | 2023 | 1 | Voyager : An Open - Ended Embodied Agent with Large Language Models | 2305.16291 |
| 3.6 | 2026 | 1 | PosteriorBench: Evaluating Behavior Posterior Sampling in Language Models | 2611.25735 |
| 3.6 | 2026 | 1 | ToolPulse: Side-Channel Eavesdropping on Tool-Using LLM Agents | 2611.25470 |
| 3.6 | 2026 | 1 | ICARE: cross-domain text classification with incremental class-aware representation and distillation | 2611.24959 |
| 3.6 | 2026 | 1 | NullTok: empirical-null token selection for training -free long video understanding | 2611.23881 |
| 3.6 | 2026 | 1 | Say Less, Hallucinate Less? Diagnosing and Restoring Object Coverage in Preference-Optimized Vision- | 2611.23179 |
| 12.0 | 2026 | 1 | A Systematic Survey of Decompilation: Mapping Classical and Machine-Learning Approaches | 2611.21612 |
| 3.6 | 2026 | 1 | Edit Recommendation: Can LLMs Anticipate Edit Requests from Users, and When? | 2611.21155 |
| 3.6 | 2026 | 1 | Think2Listen: Evidence-Centric Learning For Agentic Audio Understanding With LALMS | 2611.21083 |
| 3.6 | 2026 | 1 | JointQ: Joint Scale-and-Integer Quantization for Large Language Models | 2611.20384 |
| 3.6 | 2026 | 1 | VAST: Compiling Grounded Vulnerability Scenarios into Verifiable, Multi-Step Environments for Evalua | 2611.19465 |
| 3.6 | 2026 | 1 | Zero-Shot Weight-Space Programming for Prediction and Classification of Target Variables in Structur | 2611.19292 |
| 3.6 | 2026 | 1 | Nahual: A Sequence Model for Language and Atoms | 2611.19072 |
| 3.6 | 2026 | 1 | Policy Optimization With Multiple Verifiers via Pareto Rankings | 2611.19064 |
| 3.6 | 2026 | 1 | Short Windows, Unmodelled Costs, Unknown Cutoffs: A Pre-Registered Evidence Audit of 91 LLM Trading  | 2611.18934 |
| 3.6 | 2026 | 1 | WeightBench: Evaluating Language Models as Weight-Space Programmers | 2611.18553 |
| 4.7 | 2026 | 1 | JFinBench: A Continuously Refreshable Japanese Financial Benchmark from the Latest Certification Exa | 2611.18130 |
| 3.6 | 2026 | 1 | Any Channel Count, One Token Stream: Incorporating Spatial Audio Understanding and Reasoning into La | 2611.18112 |
| 3.6 | 2026 | 1 | See Every Block Once: Variance-Reduced Post- Training for Masked Diffusion Language Models | 2611.17754 |
| 3.6 | 2026 | 1 | I2C-GRPO: Insight Importance Checklist for Reinforcement Learning in a Multi-Agent DDoS Alert Triage | 2611.17534 |
| 4.7 | 2026 | 1 | CaseScope: A Multi-Field Benchmark for Case-Level Pathology Diagnosis with Multimodal LLMs | 2611.15325 |
| 3.6 | 2026 | 1 | Mobile AI Factory: Building Specialized Language Models for Your Mobile Device | 2611.13509 |
| 4.7 | 2026 | 1 | More Than Just Style: Benchmarking Personality Influence in Large Language Models | 2611.12392 |
| 3.6 | 2026 | 1 | DisasterVLG: Vision- Language Grounding and Evidence-Based Reasoning for Disaster Scene Understandin | 2611.12144 |
| 3.6 | 2026 | 1 | Spectral Unlearning: Transformer Structure-Preserving Updates for Language Models | 2611.11902 |
| 4.7 | 2026 | 1 | RealEmbedBench: Benchmarking LLMs on Real-World Application-Layer Embedded Software Tasks | 2611.11469 |
| 3.6 | 2026 | 1 | Semantic Synthesis over Brute-Force Search: LLM-Guided Transformation Design for Efficient Learning | 2611.10940 |
| 3.6 | 2026 | 1 | AutoC2V: Synthesis-Guided LLM Training for QoR-Optimized C++-to-Verilog Generation | 2611.10824 |
| 3.6 | 2026 | 1 | BlenderFORGE: Framework for Optimizing Reactive 3D-Graphics Editing Ability of MLLMs | 2611.10768 |
| 3.6 | 2026 | 1 | Pruning DNA Sequence | 2611.10386 |
| 3.6 | 2026 | 1 | Assessing the Impact of Retrieval-Augmented Generation on Algorithmic Problem-Solving | 2611.09791 |
| 3.6 | 2026 | 1 | Transformer-FSQ: Discrete Latents for Extreme KV-Cache Compression | 2611.09598 |
| 3.6 | 2026 | 1 | On the Effectiveness and Limitations of Open-Weight LLMs for Low-Resource Offensive Language Detecti | 2611.09506 |
| 3.6 | 2026 | 1 | Rethinking Data Selection as Distribution Matching on Semantic Manifolds | 2611.08495 |
| 3.6 | 2026 | 1 | Label-Wording Augmentation in a Typed-Decision Encoder: Gains on Unfamiliar Words, Not on Abbreviati | 2611.08439 |
| 3.6 | 2026 | 1 | FedReason: Large Language Models as Weight-Space Meta-Aggregators for Heterogeneous Federated Learni | 2611.08383 |
| 3.6 | 2026 | 1 | RIVER: Evidence-guided multi-agent retrieval for enzyme--reaction discovery | 2611.07757 |
| 3.6 | 2026 | 1 | Egocentric Action Recognition with Objects and Vision- Language Affordances | 2611.07673 |
| 3.6 | 2026 | 1 | Binding Paraphrased Instructions to Encountered Objects in sLLM Agents under Partial Observability | 2611.07599 |
| 3.6 | 2026 | 1 | On the Opportunities and Challenges of Prefill-to-Autoregressive Cross- Model Transfer | 2611.06976 |
| 3.6 | 2026 | 1 | PatchCon: Patch-aware Weighted Supervised Contrastive Learning for Vulnerability Detection | 2611.06583 |
| 3.6 | 2026 | 1 | Reassessing Dataset Quality and Fine-Tuning Practices for Vulnerability Detection on PrimeVul datase | 2611.06373 |
| 3.6 | 2026 | 1 | TSFM Meets LLM: Context as Covariates | 2611.05515 |
| 3.6 | 2026 | 1 | Catalyzing Interactive HTML Generation Capabilities via High-Fidelity Reinforcement Learning | 2611.05151 |
| 3.6 | 2026 | 1 | Forget What Comes Next: LLM Unlearning via Statistical Independence | 2611.03955 |
| 3.6 | 2026 | 1 | From Natural Language to Exact Cover: A Neuro-Symbolic Approach to Zebra Puzzles | 2611.03641 |
| 4.7 | 2026 | 1 | Not All Reasoning Generalizes: A Case Study on Learning Generalizable Reasoning Strategies in RLVR | 2611.03627 |
| 3.6 | 2026 | 1 | The Cost of Mismatch: Noise Amplification in Zeroth-Order Reinforcement Learning | 2611.03260 |
| 3.6 | 2026 | 1 | ACTOR: Action-Centered Temporal Organization for Literary Role-Playing Agents | 2611.03184 |
| 4.7 | 2026 | 1 | SurgPace: Complexity-Aware Progressive Distillation for Surgical Multimodal Large Language Models | 2611.03125 |
| 4.7 | 2026 | 1 | A Fine-Grained Hierarchy and Benchmark for State Tracking in Language Models | 2611.03094 |
| 3.6 | 2026 | 1 | RAVEN: A Self-RAG Based Agent for Threat Classification and Response | 2611.25832 |
| 3.6 | 2026 | 1 | DS2Agent: Holistic Device Agents for Accelerated Embedded Board-Level Design | 2611.25774 |
| 4.7 | 2026 | 1 | AutoRAGBench: A Benchmark for LLM Agents Automating RAG System Development | 2611.25582 |
| 4.7 | 2026 | 1 | DVBench: End-to-End Benchmark for Real-World UVM Design Verification Agents | 2611.25066 |

## 读不到全文的（诚实记录）

- arXiv:2608.25291 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2603.19461 — HTTP 404
- arXiv:2610.18813 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-22T13:36:37.850Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_