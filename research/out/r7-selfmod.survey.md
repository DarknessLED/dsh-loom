# R7 自我修改与循环：自改 agent、元进化、多样性崩塌与漂移

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 675 个不同候选，保留 218
- 回溯：读通 50 篇全文的参考文献，共 3201 条引用（4 篇无可用 HTML）
- 语料内被引：183 个工作被本语料至少两篇论文引用；被引最多的是 19 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 19 | 40 | 2015 | Illuminating search spaces by mapping elites. | 1504.04909 |
| 14 | 19 | 2011 | Abandoning Objectives: Evolution Through the Search for Novelty Alone. | — |
| 13 | 16 | 2024 | Mathematical discoveries from program search with large language models. | — |
| 10 | 19 | 2016 | Quality diversity: A new frontier for evolutionary computation. | — |
| 10 | 19 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. | 2506.13131 |
| 9 | 11 | 2015 | Robots that can adapt like animals. | — |
| 4 | 18 | 2025 | Qwen3 technical report. | 2505.09388 |
| 4 | 9 | 2022 | Multi-objective quality diversity optimization. | 2202.03057 |
| 4 | 7 | 2018 | Quality and diversity optimization: A unifying modular framework. | — |
| 4 | 4 | 2024 | Promptbreeder: self-referential self-improvement via prompt evolution | 2309.16797 |
| 4 | 3 | 2025 | Automated design of agentic systems. | 2408.08435 |
| 4 | 3 | 2024 | Swe-bench: can language models resolve real-world github issues? | — |
| 3 | 12 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts | 2402.16822 |
| 3 | 9 | 2024 | HarmBench: a standardized evaluation framework for automated red teaming and robust refusal | 2402.04249 |
| 3 | 9 | 2026 | ShinkaEvolve: Towards open-ended and sample-efficient program evolution. | 2509.19349 |
| 3 | 8 | 2026 | Darwin gödel machine: Open-ended evolution of self-improving agents. | 2505.22954 |
| 3 | 8 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 3 | 7 | 2024 | Evolution of heuristics: Towards efficient automatic algorithm design using large language model. | 2401.02051 |
| 3 | 6 | 2024 | ReEvo: Large language models as hyper-heuristics with reflective evolution. | — |
| 3 | 6 | 2023 | Universal and transferable adversarial attacks on aligned language models | 2307.15043 |
| 3 | 6 | 2020 | Language models are few-shot learners. | 2005.14165 |
| 3 | 6 | 2020 | Covariance matrix adaptation for the rapid illumination of behavior space. | — |
| 3 | 5 | 2023 | Jailbreaking black box large language models in twenty queries | 2310.08419 |
| 3 | 5 | 2024 | AutoDAN: generating stealthy jailbreak prompts on aligned large language models | 2310.04451 |
| 3 | 5 | 2007 | Compositional pattern producing networks: A novel abstraction of development. | — |
| 3 | 4 | 2016 | Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites Algorit | — |
| 3 | 4 | 2019 | Autonomous skill discovery with quality-diversity and unsupervised descriptors | — |
| 3 | 4 | 2002 | Evolving Neural Networks Through Augmenting Topologies. | — |
| 3 | 4 | 2025 | LLM-SR: Scientific equation discovery via programming with large language models. | — |
| 3 | 4 | 2023 | Eureka: Human-level reward design via coding large language models. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 40 | 19 | 2015 | Illuminating search spaces by mapping elites. |
| 19 | 14 | 2011 | Abandoning Objectives: Evolution Through the Search for Novelty Alone. |
| 16 | 13 | 2024 | Mathematical discoveries from program search with large language models. |
| 19 | 10 | 2016 | Quality diversity: A new frontier for evolutionary computation. |
| 19 | 10 | 2025 | Alphaevolve: A coding agent for scientific and algorithmic discovery. |
| 11 | 9 | 2015 | Robots that can adapt like animals. |
| 18 | 4 | 2025 | Qwen3 technical report. |
| 9 | 4 | 2022 | Multi-objective quality diversity optimization. |
| 7 | 4 | 2018 | Quality and diversity optimization: A unifying modular framework. |
| 4 | 4 | 2024 | Promptbreeder: self-referential self-improvement via prompt evolution |
| 3 | 4 | 2025 | Automated design of agentic systems. |
| 3 | 4 | 2024 | Swe-bench: can language models resolve real-world github issues? |
| 12 | 3 | 2024 | Rainbow teaming: open-ended generation of diverse adversarial prompts |
| 9 | 3 | 2024 | HarmBench: a standardized evaluation framework for automated red teaming and robust refusal |
| 9 | 3 | 2026 | ShinkaEvolve: Towards open-ended and sample-efficient program evolution. |
| 8 | 3 | 2026 | Darwin gödel machine: Open-ended evolution of self-improving agents. |
| 8 | 3 | 2021 | Evaluating large language models trained on code. |
| 7 | 3 | 2024 | Evolution of heuristics: Towards efficient automatic algorithm design using large language model. |
| 6 | 3 | 2024 | ReEvo: Large language models as hyper-heuristics with reflective evolution. |
| 6 | 3 | 2023 | Universal and transferable adversarial attacks on aligned language models |
| 6 | 3 | 2020 | Language models are few-shot learners. |
| 6 | 3 | 2020 | Covariance matrix adaptation for the rapid illumination of behavior space. |
| 5 | 3 | 2023 | Jailbreaking black box large language models in twenty queries |
| 5 | 3 | 2024 | AutoDAN: generating stealthy jailbreak prompts on aligned large language models |
| 5 | 3 | 2007 | Compositional pattern producing networks: A novel abstraction of development. |
| 4 | 3 | 2016 | Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites |
| 4 | 3 | 2019 | Autonomous skill discovery with quality-diversity and unsupervised descriptors |
| 4 | 3 | 2002 | Evolving Neural Networks Through Augmenting Topologies. |
| 4 | 3 | 2025 | LLM-SR: Scientific equation discovery via programming with large language models. |
| 4 | 3 | 2023 | Eureka: Human-level reward design via coding large language models. |

## 各细分方向的开篇（按语料内最早一篇）

- **evolutionary search over agents**（93 篇，最早 2015-04-19）Illuminating search spaces by mapping elites · arXiv:1504.04909
- **evaluator overfitting**（55 篇，最早 2022-02-25）FastMimic: Model-based Motion Imitation for Agile, Diverse and Generalizable Quadrupedal Locomotion · arXiv:2109.13362
- **diversity & collapse**（31 篇，最早 2019-04-05）Evaluating MAP - Elites on Constrained Optimization Problems · arXiv:1902.00703
- **self-modification**（8 篇，最早 2026-06-02）Enginuity: A Dataset and Benchmark for Vision-Language Understanding of Engineering Diagrams · arXiv:2606.03410
- **open-endedness**（7 篇，最早 2023-05-21）Augmenting Autotelic Agents with Large Language Models · arXiv:2305.12487
- **complexity control**（2 篇，最早 2019-09-14）Cognitive swarming in complex environments with attractor dynamics and oscillatory computing · arXiv:1909.06711

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
- 2026-03-30 · A Foldable and Agile Soft Electromagnetic Robot for Multimodal Navigation in Confined and Unstructured Environments · arXiv:2603.28362
- 2025-08-25 · Mimicking associative learning of rats via a neuromorphic robot in open field maze using spatial cell models · arXiv:2508.18460
- 2025-07-02 · What Neuroscience Can Teach AI About Learning in Continuously Changing Environments · arXiv:2507.02103
- 2025-08-28 · Motion Priors Reimagined: Adapting Flat-Terrain Skills for Complex Quadruped Mobility · arXiv:2505.16084
- 2025-05-18 · Emergent Active Perception and Dexterity of Simulated Humanoids from Visual Reinforcement Learning · arXiv:2505.12278
- 2026-06-19 · APEX: Action Priors Enable Efficient Exploration for Robust Motion Tracking on Legged Robots · arXiv:2505.10022
- 2025-04-28 · Tensegrity-based Robot Leg Design with Variable Stiffness · arXiv:2504.19685
- 2026-11-13 · UltraBERT-JEV: Encoder models for System One Applications · arXiv:2611.17867
- 2026-11-04 · Adapting Qwen3 to Tajik from 0.6B to 8B: Lower Text Loss Did Not Mean Better Understanding · arXiv:2611.06062
- 2026-10-16 · Beyond the Benchmark: Conditioning, Domains and Failure Modes of Qwen3 -TTS · arXiv:2610.23678
- 2026-10-01 · Permutation-Robust Decision Modeling with Candidate-Independent Block-Causal Attention · arXiv:2610.01601
- 2026-09-30 · PivotOPD: Learning to Recover from Pivotal Mistakes in Multi-Turn Agents · arXiv:2609.40285
- 2026-08-24 · FinixDoc: Rethinking Financial Document Parsing Beyond Saturated Benchmarks · arXiv:2608.22842

## 被常引但不在语料里（下一轮的查询）

- (14 篇引) Abandoning Objectives: Evolution Through the Search for Novelty Alone. · 2011
- (13 篇引) Mathematical discoveries from program search with large language models. · 2024
- (10 篇引) Quality diversity: A new frontier for evolutionary computation. · 2016
- (4 篇引) Multi-objective quality diversity optimization. · 2022 · arXiv:2202.03057
- (4 篇引) Quality and diversity optimization: A unifying modular framework. · 2018
- (4 篇引) Automated design of agentic systems. · 2025 · arXiv:2408.08435
- (4 篇引) Swe-bench: can language models resolve real-world github issues? · 2024
- (3 篇引) Rainbow teaming: open-ended generation of diverse adversarial prompts · 2024 · arXiv:2402.16822
- (3 篇引) HarmBench: a standardized evaluation framework for automated red teaming and robust refusal · 2024 · arXiv:2402.04249
- (3 篇引) Darwin gödel machine: Open-ended evolution of self-improving agents. · 2026 · arXiv:2505.22954
- (3 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (3 篇引) Evolution of heuristics: Towards efficient automatic algorithm design using large language model. · 2024 · arXiv:2401.02051
- (3 篇引) ReEvo: Large language models as hyper-heuristics with reflective evolution. · 2024
- (3 篇引) Universal and transferable adversarial attacks on aligned language models · 2023 · arXiv:2307.15043
- (3 篇引) Language models are few-shot learners. · 2020 · arXiv:2005.14165
- (3 篇引) Covariance matrix adaptation for the rapid illumination of behavior space. · 2020
- (3 篇引) Jailbreaking black box large language models in twenty queries · 2023 · arXiv:2310.08419
- (3 篇引) AutoDAN: generating stealthy jailbreak prompts on aligned large language models · 2024 · arXiv:2310.04451
- (3 篇引) Compositional pattern producing networks: A novel abstraction of development. · 2007
- (3 篇引) Using Centroidal Voronoi Tessellations to Scale Up the Multidimensional Archive of Phenotypic Elites Algorithm · 2016
- (3 篇引) Autonomous skill discovery with quality-diversity and unsupervised descriptors · 2019
- (3 篇引) Evolving Neural Networks Through Augmenting Topologies. · 2002
- (3 篇引) Eureka: Human-level reward design via coding large language models. · 2023
- (3 篇引) Proximal Policy Optimization Algorithms. · 2017 · arXiv:1707.06347
- (3 篇引) Artificial hivemind: The open-ended homogeneity of language models (and beyond). · 2025 · arXiv:2510.22954
- (3 篇引) React: Synergizing reasoning and acting in language models. · 2023 · arXiv:2210.03629
- (3 篇引) Monte carlo tree search for comprehensive exploration in LLM-based automatic heuristic design. · 2025 · arXiv:2501.08603
- (3 篇引) Swe-agent: Agent-computer interfaces enable automated software engineering. · 2024
- (3 篇引) Chain-of-thought prompting elicits reasoning in large language models. · 2022
- (3 篇引) MLE-bench: Evaluating machine learning agents on machine learning engineering. · 2025 · arXiv:2410.07095
- (3 篇引) Reflexion: Language agents with verbal reinforcement learning. · 2023

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 18.2 | 2026 | 1 | Adversarial Coevolutionary Illumination with Generational Adversarial MAP - Elites | 2505.06617 |
| 5.0 | 2023 | 1 | Gradient-Informed Quality Diversity for the Illumination of Discrete Spaces | 2306.05138 |
| 13.4 | 2021 | 1 | Generating and Blending Game Levels via Quality-Diversity in the Latent Space of a Variational Autoe | 2102.12463 |
| 13.4 | 2020 | 1 | BOP- Elites , a Bayesian Optimisation algorithm for Quality-Diversity search | 2005.04320 |
| 3.6 | 2019 | 1 | Evaluating MAP - Elites on Constrained Optimization Problems | 1902.00703 |
| 1.4 | 2017 | 1 | Data-Efficient Exploration, Optimization, and Modeling of Diverse Designs through Surrogate-Assisted | 1702.03713 |
| 3.6 | 2015 | 1 | Illuminating search spaces by mapping elites | 1504.04909 |
| 20.7 | 2026 | 1 | AgentDiscover: Autonomous Discovery with Minimal Search Scaffolding | 2610.05334 |
| 6.9 | 2026 | 1 | CURIO: Curiosity-Driven Test-Time Learning for Open-Ended Discovery | 2610.04851 |
| 16.0 | 2026 | 1 | InsightSR: Refining Symbolic Regression Search Spaces via Parallel Semantic and Structural LLM Guida | 2608.25291 |
| 3.6 | 2026 | 1 | EvoPINN: Agentic Discovery of Executable Algorithms for Physics-Informed Neural Networks | 2607.26490 |
| 6.9 | 2026 | 1 | LLMs Improving LLMs: Agentic Discovery for Test-Time Scaling | 2605.08083 |
| 16.0 | 2025 | 1 | Iterated Agent for Symbolic Regression | 2510.08317 |
| 10.2 | 2025 | 1 | ShinkaEvolve: Towards Open-Ended And Sample-Efficient Program Evolution | 2509.19349 |
| 13.8 | 2025 | 1 | LLM-SR: Scientific Equation Discovery via Programming with Large Language Models | 2404.18400 |
| 11.6 | 2026 | 1 | automodel: A Skill for Agentic Model Discovery | 2611.24347 |
| 13.8 | 2026 | 1 | MLEvolve: A Self-Evolving Framework for Automated Machine Learning Algorithm Discovery | 2606.06473 |
| 11.6 | 2026 | 1 | ArchAgent: Agentic AI-driven Computer Architecture Discovery | 2602.22425 |
| 12.7 | 2026 | 1 | DeltaEvolve: Accelerating Scientific Discovery through Momentum-Driven Evolution | 2602.02919 |
| 22.9 | 2025 | 1 | LoongFlow: Directed Evolutionary Search via a Cognitive Plan-Execute-Summarize Paradigm | 2512.24077 |
| 13.8 | 2025 | 1 | Mathematical exploration and discovery at scale | 2511.02864 |
| 13.8 | 2025 | 1 | Scientific Algorithm Discovery by Augmenting AlphaEvolve with Deep Research | 2510.06056 |
| 13.8 | 2025 | 1 | AlphaEvolve : A coding agent for scientific and algorithmic discovery | 2506.13131 |
| 5.0 | 2024 | 1 | STAR: Synthesis of Tailored Architectures | 2411.17800 |
| 3.6 | 2026 | 1 | A Foldable and Agile Soft Electromagnetic Robot for Multimodal Navigation in Confined and Unstructur | 2603.28362 |
| 3.6 | 2025 | 1 | Mimicking associative learning of rats via a neuromorphic robot in open field maze using spatial cel | 2508.18460 |
| 4.7 | 2025 | 1 | What Neuroscience Can Teach AI About Learning in Continuously Changing Environments | 2507.02103 |
| 5.8 | 2025 | 1 | Motion Priors Reimagined: Adapting Flat-Terrain Skills for Complex Quadruped Mobility | 2505.16084 |
| 3.6 | 2025 | 1 | Emergent Active Perception and Dexterity of Simulated Humanoids from Visual Reinforcement Learning | 2505.12278 |
| 3.6 | 2026 | 1 | APEX: Action Priors Enable Efficient Exploration for Robust Motion Tracking on Legged Robots | 2505.10022 |
| 3.6 | 2025 | 1 | Tensegrity-based Robot Leg Design with Variable Stiffness | 2504.19685 |
| 2.8 | 2024 | 1 | Nature's All-in-One: Multitasking Robots Inspired by Dung Beetles | 2411.02891 |
| 2.8 | 2023 | 1 | Borinot: an agile torque-controlled robot for hybrid flying and contact loco-manipulation (workshop  | 2305.01423 |
| 3.2 | 2022 | 1 | FastMimic: Model-based Motion Imitation for Agile, Diverse and Generalizable Quadrupedal Locomotion | 2109.13362 |
| 2.1 | 2022 | 1 | Body models in humans, animals , and robots : mechanisms and plasticity | 2010.09325 |
| 2.5 | 2019 | 1 | Cognitive swarming in complex environments with attractor dynamics and oscillatory computing | 1909.06711 |
| 1.4 | 2018 | 1 | Scalable closed-form trajectories for periodic and non-periodic human- like walking | 1803.10048 |
| 1.4 | 2015 | 1 | Distributed Recurrent Neural Forward Models with Synaptic Adaptation for Complex Behaviors of Walkin | 1506.03599 |
| 1.4 | 2015 | 1 | Robots that can adapt like animals | 1407.3501 |
| 9.4 | 2010 | 1 | Modular RADAR: An Immune System Inspired Search and Response Strategy for Distributed Systems | 1006.3394 |
| 4.7 | 2026 | 1 | UltraBERT-JEV: Encoder models for System One Applications | 2611.17867 |
| 4.7 | 2026 | 1 | Adapting Qwen3 to Tajik from 0.6B to 8B: Lower Text Loss Did Not Mean Better Understanding | 2611.06062 |
| 4.7 | 2026 | 1 | Beyond the Benchmark: Conditioning, Domains and Failure Modes of Qwen3 -TTS | 2610.23678 |
| 4.7 | 2026 | 1 | Permutation-Robust Decision Modeling with Candidate-Independent Block-Causal Attention | 2610.01601 |
| 3.6 | 2026 | 1 | PivotOPD: Learning to Recover from Pivotal Mistakes in Multi-Turn Agents | 2609.40285 |
| 4.7 | 2026 | 1 | FinixDoc: Rethinking Financial Document Parsing Beyond Saturated Benchmarks | 2608.22842 |
| 5.8 | 2026 | 1 | Industrial-Instruction: An End-to-End Framework for Building Instruction-Tuning and Benchmark Datase | 2608.22817 |
| 4.7 | 2026 | 1 | In-Cell Learning: Language Models That Update Their Own Weights in Sequence Without Changing the Fil | 2608.20873 |
| 3.6 | 2026 | 1 | ASR-Roundtrip Evaluation Can Mask Context- and Convention-Dependent Reading Errors in Chinese News T | 2608.10606 |
| 4.7 | 2026 | 1 | Small, Free, and Effective: Orchestrating Open-Weight Small Language Models to Outperform Single LLM | 2607.20216 |
| 5.8 | 2026 | 1 | Enginuity: A Dataset and Benchmark for Vision-Language Understanding of Engineering Diagrams | 2606.03410 |
| 4.7 | 2026 | 1 | Qwen3 -Coder-Next Technical Report | 2603.00729 |
| 5.8 | 2026 | 1 | Ruyi2 Technical Report | 2602.22543 |
| 4.7 | 2026 | 1 | Qwen3 -ASR Technical Report | 2601.21337 |
| 4.7 | 2026 | 1 | Qwen3 -TTS Technical Report | 2601.15621 |
| 4.7 | 2025 | 1 | Qwen3 -VL Technical Report | 2511.21631 |
| 3.6 | 2025 | 1 | Efficient Tool-Calling Multi-Expert NPC Agent for Commonsense Persona-Grounded Dialogue | 2511.01720 |
| 4.7 | 2025 | 1 | Qwen3 -Omni Technical Report | 2509.17765 |
| 5.8 | 2025 | 1 | Qwen3 Technical Report | 2505.09388 |
| 7.2 | 2023 | 1 | Promptbreeder : Self - Referential Self - Improvement Via Prompt Evolution | 2309.16797 |
| 25.4 | 2024 | 1 | Quality Diversity for Robot Learning: Limitations and Future Directions | 2407.17515 |
| 24.0 | 2026 | 1 | DSevolve: Enabling Real-Time Adaptive Scheduling on Dynamic Flexible Job Shop with LLM-Evolved Heuri | 2603.27628 |
| 24.0 | 2026 | 1 | RainbowPlus: Enhancing Adversarial Prompt Generation via Evolutionary Quality - Diversity Search | 2504.15047 |
| 23.2 | 2026 | 2 | Evaluation-Free Recursive Self - Improvement for Coding Agents | 2611.21056 |
| 22.9 | 2026 | 1 | CreativeBench: Benchmarking and Enhancing Machine Creativity via Self-Evolving Challenges | 2603.11863 |
| 22.9 | 2026 | 1 | Quality - Diversity Search in Sound Generation: Investigating Innovation Engines for Audio Explorati | 2606.09780 |
| 21.8 | 2026 | 1 | ExpEvolve: Structuring and Reusing Experience for Open - Ended Discovery | 2610.29303 |
| 21.8 | 2026 | 1 | Autonomously Acquiring Robot Manipulation Skills with Language-Driven Quality - Diversity | 2608.30983 |
| 21.0 | 2025 | 3 | EvoLattice: Persistent Internal-Population Evolution through Multi-Alternative Quality-Diversity Gra | 2512.13857 |
| 20.7 | 2026 | 2 | Kernel Autoresearch for Open-Ended Model Discovery | 2610.10394 |
| 20.7 | 2026 | 1 | Reimagining computational quantum research with AI scientists | 2611.02833 |
| 19.3 | 2026 | 1 | T-GADE: Thermodynamical Generative-AI-Driven Evolution of LLM Artifacts | 2609.12286 |
| 17.7 | 2026 | 4 | Harnesses That Improve Themselves: A Unifying Framework for Self - Improving Agent Harnesses | 2611.22299 |
| 17.4 | 2026 | 2 | Self-Evolving Agent Harness | 2610.18813 |
| 17.1 | 2026 | 1 | Do Quantum AIs Dream in Paths? Path-Integral Slow Thinking through Grover Interference | 2609.05842 |
| 17.1 | 2026 | 1 | Vocabulary Dropout for Curriculum Diversity in LLM Co- Evolution | 2604.03472 |
| 17.1 | 2026 | 1 | Uncertainty-Aware Crack Growth Forecasting via Conditional Denoising Diffusion Models for Phase-Fiel | 2607.11971 |
| 17.1 | 2026 | 1 | Heuresis: Search Strategies for Autonomous AI Research Agents Across Quality , Diversity and Novelty | 2606.25198 |
| 17.1 | 2026 | 1 | Quality - Diversity Evolution for Discovering Diverse Vulnerabilities in LLM Safety | 2606.00801 |
| 17.1 | 2025 | 1 | Discovering Quality - Diversity Algorithms via Meta-Black-Box Optimization | 2502.02190 |

## 读不到全文的（诚实记录）

- arXiv:2610.18813 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2608.25291 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2606.28639 — HTTP 404
- arXiv:2604.12672 — HTTP 404

_生成于 2026-11-24T17:29:38.917Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_