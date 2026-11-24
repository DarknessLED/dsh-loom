# R4 知识与迁移：经验积累、跨任务迁移、记忆与巩固

- 检索：20 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 706 个不同候选，保留 264
- 回溯：读通 50 篇全文的参考文献，共 2576 条引用（3 篇无可用 HTML）
- 语料内被引：252 个工作被本语料至少两篇论文引用；被引最多的是 24 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 24 | 48 | 2023 | ReAct: Synergizing Reasoning and Acting in Language Models. | 2210.03629 |
| 23 | 54 | 2023 | Voyager: An Open-Ended Embodied Agent with Large Language Models. | 2305.16291 |
| 22 | 47 | 2023 | Reflexion: language agents with verbal reinforcement learning. | 2303.11366 |
| 18 | 38 | 2024 | Expel: Llm agents are experiential learners. | 2308.10144 |
| 17 | 46 | 2025 | Agent workflow memory. | 2409.07429 |
| 12 | 15 | 2023 | Generative agents: Interactive simulacra of human behavior. | 2304.03442 |
| 11 | 30 | 2026 | Reasoningbank: Scaling agent self-evolving with reasoning memory. | 2509.25140 |
| 11 | 24 | 2023 | Memgpt: Towards llms as operating systems. | 2310.08560 |
| 11 | 19 | 2025 | A-mem: Agentic memory for LLM agents. | 2502.12110 |
| 10 | 18 | 2026 | SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. | 2602.08234 |
| 10 | 13 | 2025 | Qwen3 technical report. | 2505.09388 |
| 9 | 16 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. | 2504.19413 |
| 9 | 15 | 2023 | Toolformer: Language models can teach themselves to use tools. | 2302.04761 |
| 9 | 12 | 2023 | Mind2web: Towards a generalist agent for the web. | — |
| 9 | 12 | 2024 | Memorybank: Enhancing large language models with long-term memory. | — |
| 9 | 10 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. | — |
| 8 | 17 | 2021 | ALFWorld: Aligning text and embodied environments for interactive learning. | 2010.03768 |
| 8 | 13 | 2026 | Agentic context engineering: Evolving contexts for self-improving language models. | — |
| 7 | 24 | 2026 | Trace2Skill: Distill trajectory-local lessons into transferable agent skills. | 2603.25158 |
| 7 | 24 | 2026 | Autoskill: Experience-driven lifelong learning via skill self-evolution. | 2603.01145 |
| 7 | 12 | 2024 | Synapse: Trajectory-as-exemplar prompting with memory for computer control. | 2306.07863 |
| 7 | 11 | 2017 | Overcoming catastrophic forgetting in neural networks. | — |
| 7 | 9 | 2022 | WebShop: Towards Scalable Real-World Web Interaction with Grounded Language Agents. | 2207.01206 |
| 7 | 9 | 2024 | Webarena: A realistic web environment for building autonomous agents. | — |
| 7 | 8 | 2026 | MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents. | 2602.02474 |
| 6 | 16 | 2026 | CoEvoSkills: Self-evolving agent skills via co-evolutionary verification. | 2604.01687 |
| 6 | 13 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. | 2201.11903 |
| 6 | 11 | 2026 | Memp: Exploring agent procedural memory. | 2508.06433 |
| 6 | 10 | 2021 | Evaluating large language models trained on code. | 2107.03374 |
| 6 | 10 | 2023 | Self-refine: Iterative refinement with self-feedback. | 2303.17651 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 48 | 24 | 2023 | ReAct: Synergizing Reasoning and Acting in Language Models. |
| 54 | 23 | 2023 | Voyager: An Open-Ended Embodied Agent with Large Language Models. |
| 47 | 22 | 2023 | Reflexion: language agents with verbal reinforcement learning. |
| 38 | 18 | 2024 | Expel: Llm agents are experiential learners. |
| 46 | 17 | 2025 | Agent workflow memory. |
| 15 | 12 | 2023 | Generative agents: Interactive simulacra of human behavior. |
| 30 | 11 | 2026 | Reasoningbank: Scaling agent self-evolving with reasoning memory. |
| 24 | 11 | 2023 | Memgpt: Towards llms as operating systems. |
| 19 | 11 | 2025 | A-mem: Agentic memory for LLM agents. |
| 18 | 10 | 2026 | SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. |
| 13 | 10 | 2025 | Qwen3 technical report. |
| 16 | 9 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. |
| 15 | 9 | 2023 | Toolformer: Language models can teach themselves to use tools. |
| 12 | 9 | 2023 | Mind2web: Towards a generalist agent for the web. |
| 12 | 9 | 2024 | Memorybank: Enhancing large language models with long-term memory. |
| 10 | 9 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. |
| 17 | 8 | 2021 | ALFWorld: Aligning text and embodied environments for interactive learning. |
| 13 | 8 | 2026 | Agentic context engineering: Evolving contexts for self-improving language models. |
| 24 | 7 | 2026 | Trace2Skill: Distill trajectory-local lessons into transferable agent skills. |
| 24 | 7 | 2026 | Autoskill: Experience-driven lifelong learning via skill self-evolution. |
| 12 | 7 | 2024 | Synapse: Trajectory-as-exemplar prompting with memory for computer control. |
| 11 | 7 | 2017 | Overcoming catastrophic forgetting in neural networks. |
| 9 | 7 | 2022 | WebShop: Towards Scalable Real-World Web Interaction with Grounded Language Agents. |
| 9 | 7 | 2024 | Webarena: A realistic web environment for building autonomous agents. |
| 8 | 7 | 2026 | MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents. |
| 16 | 6 | 2026 | CoEvoSkills: Self-evolving agent skills via co-evolutionary verification. |
| 13 | 6 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. |
| 11 | 6 | 2026 | Memp: Exploring agent procedural memory. |
| 10 | 6 | 2021 | Evaluating large language models trained on code. |
| 10 | 6 | 2023 | Self-refine: Iterative refinement with self-feedback. |

## 各细分方向的开篇（按语料内最早一篇）

- **memory architecture**（143 篇，最早 2023-10-10）Reflexion : Language Agents with Verbal Reinforcement Learning · arXiv:2303.11366
- **experience reuse**（37 篇，最早 2020-07-28）Lessons learned from (and since) the Voyager 2 flybys of Uranus and Neptune · arXiv:2006.08340
- **skill library / procedural**（37 篇，最早 2023-10-19）Voyager : An Open-Ended Embodied Agent with Large Language Models · arXiv:2305.16291
- **forgetting / stability**（29 篇，最早 2025-11-12）FSC-Net: Fast-Slow Consolidation Networks for Continual Learning · arXiv:2511.11707
- **transfer & analogy**（15 篇，最早 2024-12-20）ExpeL : LLM Agents Are Experiential Learners · arXiv:2308.10144

## 最近的 SOTA（近两年）

- 2026-09-10 · VRL-Bench: Benchmarking agents on computer control tasks under finite trial budgets · arXiv:2609.12404
- 2026-11-23 · Non-intrusive Differentiation of High-Performance Seismic Solvers · arXiv:2611.30524
- 2026-11-23 · mini-psych- agent : Evaluating Human-Like Behavior in LLM Agents through Interactive Psychological Environments · arXiv:2611.30365
- 2026-11-23 · Retrieval-Augmented Generation in the Agentic Era: Tradition, Present, and Prospect · arXiv:2611.30181
- 2026-11-21 · HyperHarness: Learning to Generate Personalized Agent Harnesses from User Histories · arXiv:2611.29062
- 2026-11-19 · Privacy Protection in Self-Evolving Personal Agents : Persistent Memory and Cross-Carrier Transfer · arXiv:2611.26983
- 2026-11-19 · TwinLab-Bench: Evaluating AI Scientists in Agentic Twins of Real Labs · arXiv:2611.26248
- 2026-11-19 · Generalist Meets Specialists: An Evolving Multimodal Agent with Persistent Tool Orchestration for Traffic Scenario Understanding · arXiv:2611.25868
- 2026-11-18 · Piccolo: Co-Evolving Decision Models and Data through Recursive Self-Improvement · arXiv:2611.24651
- 2026-11-18 · VOL- Agent : Programming Your Film via Video Orchestration Language Agentic System · arXiv:2611.23950
- 2026-11-17 · ARISE: Practical Self-Evolving Memory for Accurate and Cost-Efficient Enterprise Agents · arXiv:2611.23588
- 2026-11-17 · LaFlash: Capacity-Driven Acceleration for Coding Agent Workflows via QLC-HBF · arXiv:2611.22746
- 2026-11-16 · Evaluating Authorization and Trust Boundaries in Agentic Orchestration Frameworks · arXiv:2611.21259
- 2026-11-16 · AdMem: Expectation-Grounded Procedural Memory for Long-Horizon Task-Solving Agents · arXiv:2611.20605
- 2026-11-15 · When Facts Change, Which Decisions Break? Dependency-Aware Context Graphs for Agents · arXiv:2611.19859
- 2026-11-14 · Compositional Exploits in Autonomous Coding Agents : Attack Mechanics and Ephemeral Defense · arXiv:2611.19764
- 2026-11-13 · Can Agentic LLMs Write Task-Based Parallel Code? A Study of OpenMP Tasking, HPX, StarPU and TTG · arXiv:2611.19105
- 2026-11-13 · B2G- Agent : An LLM-Based Multi- Agent Tool for End-to-End Building-Grid Interactions · arXiv:2611.19036
- 2026-11-13 · NeoResearch: Literature- and Experience-Guided Autonomous Time Series Model Discovery · arXiv:2611.18235
- 2026-11-13 · Agent -as-a-Judge · arXiv:2611.18067
- 2026-11-12 · Reducing Batch Makespan for LLM Agent Workloads through Inference-Environment Coordination · arXiv:2611.16661
- 2026-11-12 · Evidence-Governed Adoption of Self-Generated Updates in Autonomous AI Agents · arXiv:2611.16378
- 2026-11-11 · Recompute or Restore? Host-Tier KV for Multi-Model Agent Workflows on a Static-Graph NPU Serving Stack · arXiv:2611.15126
- 2026-11-10 · EvoX: Rethinking the Agent Harness as a Runtime Policy · arXiv:2611.15006
- 2026-11-10 · RSI-PDEbench: A Benchmark for Self-Improving Agents in PDE Solving · arXiv:2611.14949
- 2026-11-10 · DisasterAgent: An Evidence-Driven Agent for Verifiable Disaster Report Generation From Remote Sensing Imagery · arXiv:2611.13776
- 2026-11-09 · MRFoundry: Knowledge-guided agent loops for end-to-end MRI research · arXiv:2611.13289
- 2026-11-07 · Embodied Science Agents : Making Embodied Experimental Design Learnable · arXiv:2611.12958
- 2026-11-08 · InfraRSI: Harnessing Recursive Self-Improvement for Training Infrastructure · arXiv:2611.11558
- 2026-11-06 · Tail-risk-aware Agent Safety: Constraining Tail Risks Across Multi-step LLM Agent Workflows · arXiv:2611.10411

## 被常引但不在语料里（下一轮的查询）

- (17 篇引) Agent workflow memory. · 2025 · arXiv:2409.07429
- (11 篇引) A-mem: Agentic memory for LLM agents. · 2025 · arXiv:2502.12110
- (10 篇引) SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. · 2026 · arXiv:2602.08234
- (10 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (9 篇引) Mem0: Building production-ready ai agents with scalable long-term memory. · 2025 · arXiv:2504.19413
- (9 篇引) Toolformer: Language models can teach themselves to use tools. · 2023 · arXiv:2302.04761
- (9 篇引) Mind2web: Towards a generalist agent for the web. · 2023
- (9 篇引) Memorybank: Enhancing large language models with long-term memory. · 2024
- (9 篇引) Retrieval-augmented generation for knowledge-intensive nlp tasks. · 2020
- (8 篇引) ALFWorld: Aligning text and embodied environments for interactive learning. · 2021 · arXiv:2010.03768
- (8 篇引) Agentic context engineering: Evolving contexts for self-improving language models. · 2026
- (7 篇引) Trace2Skill: Distill trajectory-local lessons into transferable agent skills. · 2026 · arXiv:2603.25158
- (7 篇引) Autoskill: Experience-driven lifelong learning via skill self-evolution. · 2026 · arXiv:2603.01145
- (7 篇引) Synapse: Trajectory-as-exemplar prompting with memory for computer control. · 2024 · arXiv:2306.07863
- (7 篇引) Overcoming catastrophic forgetting in neural networks. · 2017
- (7 篇引) WebShop: Towards Scalable Real-World Web Interaction with Grounded Language Agents. · 2022 · arXiv:2207.01206
- (7 篇引) Webarena: A realistic web environment for building autonomous agents. · 2024
- (7 篇引) MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents. · 2026 · arXiv:2602.02474
- (6 篇引) CoEvoSkills: Self-evolving agent skills via co-evolutionary verification. · 2026 · arXiv:2604.01687
- (6 篇引) Chain-of-thought prompting elicits reasoning in large language models. · 2022 · arXiv:2201.11903
- (6 篇引) Memp: Exploring agent procedural memory. · 2026 · arXiv:2508.06433
- (6 篇引) Evaluating large language models trained on code. · 2021 · arXiv:2107.03374
- (6 篇引) Self-refine: Iterative refinement with self-feedback. · 2023 · arXiv:2303.17651
- (6 篇引) SWE-bench: Can language models resolve real-world github issues? · 2024 · arXiv:2310.06770
- (6 篇引) Evoskill: Automated skill discovery for multi-agent systems. · 2026 · arXiv:2603.02766
- (6 篇引) A survey on the memory mechanism of large language model-based agents · 2025
- (6 篇引) Memento: Fine-tuning llm agents without fine-tuning llms. · 2025 · arXiv:2508.16153
- (6 篇引) SWE-agent: Agent-computer interfaces enable automated software engineering. · 2024
- (6 篇引) The Probabilistic Relevance Framework: BM25 and Beyond. · 2009
- (5 篇引) Cognitive architectures for language agents. · 2024 · arXiv:2309.02427
- (5 篇引) Skillsbench: Benchmarking how well agent skills work across diverse tasks. · 2026 · arXiv:2602.12670
- (5 篇引) MetaGPT: Meta programming for a multi-agent collaborative framework. · 2024
- (5 篇引) Agentboard: An analytical evaluation board of multi-turn LLM agents. · 2024
- (5 篇引) ChatDev: communicative agents for software development · 2023 · arXiv:2307.07924
- (5 篇引) Evaluating very long-term conversational memory of LLM agents · 2024
- (5 篇引) Language models are few-shot learners. · 2020
- (5 篇引) Skillopt: Executive strategy for self-evolving agent skills · 2026 · arXiv:2605.23904
- (5 篇引) Dynamic Cheatsheet: Test-time learning with adaptive memory. · 2026
- (5 篇引) Skillx: Automatically constructing skill knowledge bases for agents. · 2026 · arXiv:2604.04804
- (5 篇引) Skillclaw: Let skills evolve collectively with agentic evolver. · 2026 · arXiv:2604.08377

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 2.8 | 2023 | 1 | ReAct : Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 17.1 | 2026 | 1 | VRL-Bench: Benchmarking agents on computer control tasks under finite trial budgets | 2609.12404 |
| 15.2 | 2023 | 1 | Reflexion : Language Agents with Verbal Reinforcement Learning | 2303.11366 |
| 14.1 | 2024 | 1 | ExpeL : LLM Agents Are Experiential Learners | 2308.10144 |
| 5.8 | 2026 | 1 | Non-intrusive Differentiation of High-Performance Seismic Solvers | 2611.30524 |
| 5.8 | 2026 | 1 | mini-psych- agent : Evaluating Human-Like Behavior in LLM Agents through Interactive Psychological E | 2611.30365 |
| 4.7 | 2026 | 1 | Retrieval-Augmented Generation in the Agentic Era: Tradition, Present, and Prospect | 2611.30181 |
| 5.8 | 2026 | 1 | HyperHarness: Learning to Generate Personalized Agent Harnesses from User Histories | 2611.29062 |
| 8.0 | 2026 | 1 | Privacy Protection in Self-Evolving Personal Agents : Persistent Memory and Cross-Carrier Transfer | 2611.26983 |
| 4.7 | 2026 | 1 | TwinLab-Bench: Evaluating AI Scientists in Agentic Twins of Real Labs | 2611.26248 |
| 5.8 | 2026 | 1 | Generalist Meets Specialists: An Evolving Multimodal Agent with Persistent Tool Orchestration for Tr | 2611.25868 |
| 4.7 | 2026 | 1 | Piccolo: Co-Evolving Decision Models and Data through Recursive Self-Improvement | 2611.24651 |
| 6.9 | 2026 | 1 | VOL- Agent : Programming Your Film via Video Orchestration Language Agentic System | 2611.23950 |
| 5.8 | 2026 | 1 | ARISE: Practical Self-Evolving Memory for Accurate and Cost-Efficient Enterprise Agents | 2611.23588 |
| 4.7 | 2026 | 1 | LaFlash: Capacity-Driven Acceleration for Coding Agent Workflows via QLC-HBF | 2611.22746 |
| 4.7 | 2026 | 1 | Evaluating Authorization and Trust Boundaries in Agentic Orchestration Frameworks | 2611.21259 |
| 10.2 | 2026 | 1 | AdMem: Expectation-Grounded Procedural Memory for Long-Horizon Task-Solving Agents | 2611.20605 |
| 6.9 | 2026 | 1 | When Facts Change, Which Decisions Break? Dependency-Aware Context Graphs for Agents | 2611.19859 |
| 5.8 | 2026 | 1 | Compositional Exploits in Autonomous Coding Agents : Attack Mechanics and Ephemeral Defense | 2611.19764 |
| 4.7 | 2026 | 1 | Can Agentic LLMs Write Task-Based Parallel Code? A Study of OpenMP Tasking, HPX, StarPU and TTG | 2611.19105 |
| 5.8 | 2026 | 1 | B2G- Agent : An LLM-Based Multi- Agent Tool for End-to-End Building-Grid Interactions | 2611.19036 |
| 6.9 | 2026 | 1 | NeoResearch: Literature- and Experience-Guided Autonomous Time Series Model Discovery | 2611.18235 |
| 4.7 | 2026 | 1 | Agent -as-a-Judge | 2611.18067 |
| 5.8 | 2026 | 1 | Reducing Batch Makespan for LLM Agent Workloads through Inference-Environment Coordination | 2611.16661 |
| 3.6 | 2026 | 1 | Evidence-Governed Adoption of Self-Generated Updates in Autonomous AI Agents | 2611.16378 |
| 5.8 | 2026 | 1 | Recompute or Restore? Host-Tier KV for Multi-Model Agent Workflows on a Static-Graph NPU Serving Sta | 2611.15126 |
| 4.7 | 2026 | 1 | EvoX: Rethinking the Agent Harness as a Runtime Policy | 2611.15006 |
| 5.8 | 2026 | 1 | RSI-PDEbench: A Benchmark for Self-Improving Agents in PDE Solving | 2611.14949 |
| 4.7 | 2026 | 1 | DisasterAgent: An Evidence-Driven Agent for Verifiable Disaster Report Generation From Remote Sensin | 2611.13776 |
| 6.9 | 2026 | 1 | MRFoundry: Knowledge-guided agent loops for end-to-end MRI research | 2611.13289 |
| 4.7 | 2026 | 1 | Embodied Science Agents : Making Embodied Experimental Design Learnable | 2611.12958 |
| 9.1 | 2026 | 1 | InfraRSI: Harnessing Recursive Self-Improvement for Training Infrastructure | 2611.11558 |
| 4.7 | 2026 | 1 | Tail-risk-aware Agent Safety: Constraining Tail Risks Across Multi-step LLM Agent Workflows | 2611.10411 |
| 4.7 | 2026 | 1 | The Storage View Of KV Cache: Characterizing Cache Behavior Across LLM Workloads | 2611.10178 |
| 4.7 | 2026 | 1 | TwinHash: Two-Sided Object Identity Management for Time- and Energy-Efficient Agentic Workflows | 2611.09254 |
| 4.7 | 2026 | 1 | MobiInfer: Accelerating On-Device GUI Agents with Workload-Aware Inference | 2611.08496 |
| 5.8 | 2026 | 1 | RAGAM-AI: A Hybrid Reinforcement Learning based Agentic approach powered by Generative AI for Edge R | 2611.06554 |
| 5.8 | 2026 | 1 | Can LLM Agents Learn to Test? Maintaining Scoped Experience as Testing Evidence for Mobile GUI Testi | 2611.05873 |
| 4.7 | 2026 | 1 | Uncertainty-Aware Resource Orchestration for Agentic AI Systems | 2611.05392 |
| 5.8 | 2026 | 1 | ATC: Agent Trajectory Control for Role-Contract Enforcement in Black-Box Multi- Agent Systems | 2611.04321 |
| 4.7 | 2026 | 1 | SurgEye: Instruction Tuning-Free Perception-Reasoning Framework for Surgical Scene Understanding | 2611.04012 |
| 4.7 | 2026 | 1 | El Agente Fármaco: A Scalable AI Scientist for Drug Discovery | 2611.03832 |
| 5.8 | 2026 | 1 | BLPO: Beyond-Local Policy Optimization for Long-Horizon LLM Agents | 2611.03005 |
| 5.8 | 2026 | 1 | Multi-Modal Multi- Agent System for Bridge Operation and Maintenance based on Large Language Model | 2611.02738 |
| 4.7 | 2026 | 1 | TenonAgent: Virtualizing Execution Residency for Memory -Oversubscribed LLM Agents | 2611.00051 |
| 4.7 | 2026 | 1 | SketchDirector: Complex Scene Sketching via Agentic Layout Reasoning and Detail Refinement | 2610.41260 |
| 5.8 | 2026 | 1 | MAServeBench: Benchmarking Multi- Agent LLM Serving Systems with Hierarchical Collaboration Workload | 2610.40293 |
| 8.0 | 2026 | 1 | MoLRSI: A Recursive Self-Improving AI agent for Molecular Discovery | 2610.39714 |
| 5.8 | 2026 | 1 | Judging Before Propagation: Task-Graph Contextual Integrity for Multi- Agent Privacy | 2610.39532 |
| 4.7 | 2026 | 1 | From Interaction to Capability: Task Advancement as State and Supervision for GUI Agents | 2610.37482 |
| 10.2 | 2026 | 1 | EMMA: Structured Episodic Memory for Multi- Agent Workflow Synthesis | 2610.35966 |
| 4.7 | 2026 | 1 | Then there is prompt injection, a malicious email, ...: The Wild Wide West of OpenClaw Agentic Syste | 2610.35451 |
| 4.7 | 2026 | 1 | MarkovSim: an LLM Agent Harness with Bounded Context for Long-Horizon Computational Simulation | 2610.35349 |
| 10.2 | 2026 | 1 | Harness-Model Collaboration for Long-Horizon Continual Learning | 2610.34724 |
| 5.8 | 2026 | 1 | ReasoningBank : Scaling Agent Self - Evolving with Reasoning Memory | 2509.25140 |
| 13.0 | 2024 | 1 | MemGPT : Towards LLMs as Operating Systems | 2310.08560 |
| 9.1 | 2026 | 1 | WASP- Mem : Let Agent Organize Procedural Memory . Human Spend Effort on Diagnosis | 2611.04003 |
| 5.8 | 2026 | 1 | Agent Memory as Recommendation: Recommender-System Design for Long-Term Memory of LLM Agents | 2610.34673 |
| 4.7 | 2026 | 1 | FlexA- Mem : Budget-Adaptive Agentic Memory for LLM Agents | 2610.33274 |
| 6.9 | 2026 | 1 | SLICE- Mem : Salience-Gated Lightweight Information Curation for Efficient LLM Agent Memory | 2610.33015 |
| 4.7 | 2026 | 1 | SAFE- Mem : Secure Agentic Memory with Fine-Grained Authority and Governance-Aware Retrieval | 2610.22959 |
| 5.8 | 2026 | 1 | MemCode: Discrete Semantic Representations for Long-Term Agent Memory | 2610.19472 |
| 5.8 | 2026 | 1 | Temporal Evidence Forests for Long-Horizon Multi-Party Conversational Memory | 2610.12874 |
| 13.8 | 2026 | 1 | Lineage-Aware Memory Governance: A Derivation-Gated Framework for Privacy-Preserving Column-Level Ac | 2610.07258 |
| 4.7 | 2026 | 1 | Mem ++: Non-Destructive Memory for Long-Term Organizational LLM Agents | 2610.02002 |
| 5.8 | 2026 | 1 | EP- Mem : Elastic Privacy Memory for Social Relationship-Aware LLM Agents | 2609.35233 |
| 4.7 | 2026 | 1 | MoM: Memory of Memory | 2609.25054 |
| 4.7 | 2026 | 1 | Jev- Mem : System-One-Controlled Agentic Memory for Efficient AI Agents | 2609.23986 |
| 5.8 | 2026 | 1 | From Biological Precursors to Artificial Cognition: Consciousness, Embodiment, and the MEM Architect | 2609.23828 |
| 6.9 | 2026 | 1 | LifeFuse- Mem : Lifecycle-Aware State Fusion Against Temporary Overwriting for Long-Term Memory | 2609.12436 |
| 4.7 | 2026 | 1 | Personalizing LLM Agent Memory Using Biometrics | 2609.08558 |
| 4.7 | 2026 | 1 | Compact- Memory LLM Agents via Online Max-Member Clustering and Atom-Aware Packing | 2609.04915 |
| 4.7 | 2026 | 1 | When Users Don't Ask: Benchmarking Context-Driven Memory Retrieval in Conversational Agents | 2609.03467 |
| 4.7 | 2026 | 1 | ClinTraceBench: Source-Verifiable Longitudinal Clinical Reasoning over EHR-Derived Dialogues | 2609.01111 |
| 5.8 | 2026 | 1 | CABLE: Extending the Reach of Memory Retrieval via Complementary Antecedent-Based Linking and Expans | 2608.17911 |
| 5.8 | 2026 | 1 | What to Remember, What to Reveal: Privacy-Aware Memory for Conversational Agents | 2608.16551 |
| 5.8 | 2026 | 1 | LycheeMemory V2: Efficient Long-Term Memory for LLM Agents via Semantic Segment-Level Consolidation | 2608.12990 |
| 6.9 | 2026 | 1 | Caching for the Future: Scrub Jay Episodic Memory Principles for Agent Memory Systems | 2608.04746 |
| 5.8 | 2026 | 1 | CoEvo- Mem : Co-Evolving Retrieval Policy and Memory Bank for LLM Agents | 2608.01739 |
| 4.7 | 2026 | 1 | V- Mem : Modality-Routed Retrieval for Long-Term Multimodal Agentic Memory | 2608.01543 |

## 读不到全文的（诚实记录）

- arXiv:2006.08340 — HTTP 404
- arXiv:2611.20819 — HTTP 404
- arXiv:2508.21296 — HTTP 404

_生成于 2026-11-24T17:21:22.620Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_