# R4 知识与迁移：经验积累、跨任务迁移、记忆与巩固

- 检索：17 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 638 个不同候选，保留 236
- 回溯：读通 50 篇全文的参考文献，共 2652 条引用（3 篇无可用 HTML）
- 语料内被引：318 个工作被本语料至少两篇论文引用；被引最多的是 19 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 19 | 42 | 2023 | Memgpt: Towards llms as operating systems. | 2310.08560 |
| 17 | 30 | 2025 | A-mem: Agentic memory for LLM agents. | 2502.12110 |
| 16 | 35 | 2024 | Voyager: An open-ended embodied agent with large language models. | 2305.16291 |
| 16 | 22 | 2023 | Reflexion: Language Agents with Verbal Reinforcement Learning. | 2303.11366 |
| 15 | 30 | 2023 | ReAct: Synergizing reasoning and acting in language models. | 2210.03629 |
| 15 | 30 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. | 2504.19413 |
| 13 | 26 | 2024 | Memorybank: Enhancing large language models with long-term memory. | 2305.10250 |
| 13 | 24 | 2023 | Generative agents: Interactive simulacra of human behavior. | 2304.03442 |
| 11 | 13 | 2020 | Retrieval-augmented generation for knowledge-intensive NLP tasks. | 2005.11401 |
| 10 | 24 | 2025 | Agent workflow memory. | 2409.07429 |
| 10 | 15 | 2024 | Expel: Llm agents are experiential learners. | 2308.10144 |
| 9 | 26 | 2017 | Overcoming catastrophic forgetting in neural networks. | — |
| 9 | 18 | 2025 | Zep: A temporal knowledge graph architecture for agent memory. | 2501.13956 |
| 9 | 18 | 2025 | LongMemEval: Benchmarking chat assistants on long-term interactive memory. | 2410.10813 |
| 9 | 17 | 2024 | Evaluating very long-term conversational memory of llm agents. | 2402.17753 |
| 8 | 17 | 2026 | SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. | 2602.08234 |
| 8 | 12 | 2024 | SWE-bench: Can language models resolve real-world github issues? | 2310.06770 |
| 8 | 11 | 2021 | ALFWorld: Aligning text and embodied environments for interactive learning. | 2010.03768 |
| 8 | 11 | 2020 | Language models are few-shot learners. | 2005.14165 |
| 8 | 10 | 2021 | LoRA: Low-Rank Adaptation of Large Language Models. | 2106.09685 |
| 8 | 9 | 2025 | Qwen3 technical report. | 2505.09388 |
| 8 | 8 | 2026 | Memory-r1: Enhancing large language model agents to manage and utilize memories via reinforcement learning. | 2508.19828 |
| 7 | 16 | 2026 | Reasoningbank: Scaling agent self-evolving with reasoning memory. | 2509.25140 |
| 7 | 15 | 2024 | Lost in the Middle: How Language Models Use Long Contexts. | 2307.03172 |
| 7 | 14 | 2023 | Toolformer: Language models can teach themselves to use tools. | 2302.04761 |
| 7 | 13 | 2026 | Memp: Exploring agent procedural memory. | 2508.06433 |
| 7 | 13 | 2025 | Memory os of ai agent. | 2506.06326 |
| 7 | 12 | 2024 | Deepseekmath: Pushing the limits of mathematical reasoning in open language models. | 2402.03300 |
| 7 | 10 | 2026 | Lightmem: Lightweight and efficient memory-augmented generation. | 2510.18866 |
| 7 | 9 | 2025 | Memos: A memory os for ai system. | 2507.03724 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 42 | 19 | 2023 | Memgpt: Towards llms as operating systems. |
| 30 | 17 | 2025 | A-mem: Agentic memory for LLM agents. |
| 35 | 16 | 2024 | Voyager: An open-ended embodied agent with large language models. |
| 22 | 16 | 2023 | Reflexion: Language Agents with Verbal Reinforcement Learning. |
| 30 | 15 | 2023 | ReAct: Synergizing reasoning and acting in language models. |
| 30 | 15 | 2025 | Mem0: Building production-ready ai agents with scalable long-term memory. |
| 26 | 13 | 2024 | Memorybank: Enhancing large language models with long-term memory. |
| 24 | 13 | 2023 | Generative agents: Interactive simulacra of human behavior. |
| 13 | 11 | 2020 | Retrieval-augmented generation for knowledge-intensive NLP tasks. |
| 24 | 10 | 2025 | Agent workflow memory. |
| 15 | 10 | 2024 | Expel: Llm agents are experiential learners. |
| 26 | 9 | 2017 | Overcoming catastrophic forgetting in neural networks. |
| 18 | 9 | 2025 | Zep: A temporal knowledge graph architecture for agent memory. |
| 18 | 9 | 2025 | LongMemEval: Benchmarking chat assistants on long-term interactive memory. |
| 17 | 9 | 2024 | Evaluating very long-term conversational memory of llm agents. |
| 17 | 8 | 2026 | SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. |
| 12 | 8 | 2024 | SWE-bench: Can language models resolve real-world github issues? |
| 11 | 8 | 2021 | ALFWorld: Aligning text and embodied environments for interactive learning. |
| 11 | 8 | 2020 | Language models are few-shot learners. |
| 10 | 8 | 2021 | LoRA: Low-Rank Adaptation of Large Language Models. |
| 9 | 8 | 2025 | Qwen3 technical report. |
| 8 | 8 | 2026 | Memory-r1: Enhancing large language model agents to manage and utilize memories via reinforcement le |
| 16 | 7 | 2026 | Reasoningbank: Scaling agent self-evolving with reasoning memory. |
| 15 | 7 | 2024 | Lost in the Middle: How Language Models Use Long Contexts. |
| 14 | 7 | 2023 | Toolformer: Language models can teach themselves to use tools. |
| 13 | 7 | 2026 | Memp: Exploring agent procedural memory. |
| 13 | 7 | 2025 | Memory os of ai agent. |
| 12 | 7 | 2024 | Deepseekmath: Pushing the limits of mathematical reasoning in open language models. |
| 10 | 7 | 2026 | Lightmem: Lightweight and efficient memory-augmented generation. |
| 9 | 7 | 2025 | Memos: A memory os for ai system. |

## 各细分方向的开篇（按语料内最早一篇）

- **memory architecture**（119 篇，最早 2023-05-21）MemoryBank : Enhancing Large Language Models with Long - Term Memory · arXiv:2305.10250
- **skill library / procedural**（34 篇，最早 2025-11-04）A Comparative Analysis of LLM Adaptation: SFT, LoRA, and ICL in Data-Scarce Scenarios · arXiv:2511.00130
- **experience reuse**（25 篇，最早 2020-07-28）Lessons learned from (and since) the Voyager 2 flybys of Uranus and Neptune · arXiv:2006.08340
- **transfer & analogy**（14 篇，最早 2025-09-01）Bottom-up Domain-specific Superintelligence: A Reliable Knowledge Graph is What We Need · arXiv:2507.13966
- **forgetting / stability**（13 篇，最早 2020-02-15）Scalable and Order-robust Continual Learning with Additive Parameter Decomposition · arXiv:1902.09432

## 最近的 SOTA（近两年）

- 2026-11-02 · WASP- Mem : Let Agent Organize Procedural Memory . Human Spend Effort on Diagnosis · arXiv:2611.04003
- 2026-10-25 · Agent Memory as Recommendation: Recommender-System Design for Long-Term Memory of LLM Agents · arXiv:2610.34673
- 2026-10-23 · FlexA- Mem : Budget-Adaptive Agentic Memory for LLM Agents · arXiv:2610.33274
- 2026-10-08 · SLICE- Mem : Salience-Gated Lightweight Information Curation for Efficient LLM Agent Memory · arXiv:2610.33015
- 2026-10-20 · SAFE- Mem : Secure Agentic Memory with Fine-Grained Authority and Governance-Aware Retrieval · arXiv:2610.22959
- 2026-10-13 · MemCode: Discrete Semantic Representations for Long-Term Agent Memory · arXiv:2610.19472
- 2026-10-08 · Temporal Evidence Forests for Long-Horizon Multi-Party Conversational Memory · arXiv:2610.12874
- 2026-10-05 · Lineage-Aware Memory Governance: A Derivation-Gated Framework for Privacy-Preserving Column-Level Access Control in Enterprise AI  · arXiv:2610.07258
- 2026-10-01 · Mem ++: Non-Destructive Memory for Long-Term Organizational LLM Agents · arXiv:2610.02002
- 2026-09-28 · EP- Mem : Elastic Privacy Memory for Social Relationship-Aware LLM Agents · arXiv:2609.35233
- 2026-09-07 · MoM: Memory of Memory · arXiv:2609.25054
- 2026-09-20 · Jev- Mem : System-One-Controlled Agentic Memory for Efficient AI Agents · arXiv:2609.23986
- 2026-09-20 · From Biological Precursors to Artificial Cognition: Consciousness, Embodiment, and the MEM Architecture · arXiv:2609.23828
- 2026-09-11 · LifeFuse- Mem : Lifecycle-Aware State Fusion Against Temporary Overwriting for Long-Term Memory · arXiv:2609.12436
- 2026-09-08 · Personalizing LLM Agent Memory Using Biometrics · arXiv:2609.08558
- 2026-09-04 · Compact- Memory LLM Agents via Online Max-Member Clustering and Atom-Aware Packing · arXiv:2609.04915
- 2026-09-22 · When Users Don't Ask: Benchmarking Context-Driven Memory Retrieval in Conversational Agents · arXiv:2609.03467
- 2026-09-01 · ClinTraceBench: Source-Verifiable Longitudinal Clinical Reasoning over EHR-Derived Dialogues · arXiv:2609.01111
- 2026-08-18 · CABLE: Extending the Reach of Memory Retrieval via Complementary Antecedent-Based Linking and Expansion · arXiv:2608.17911
- 2026-08-17 · What to Remember, What to Reveal: Privacy-Aware Memory for Conversational Agents · arXiv:2608.16551
- 2026-10-14 · LycheeMemory V2: Efficient Long-Term Memory for LLM Agents via Semantic Segment-Level Consolidation · arXiv:2608.12990
- 2026-08-05 · Caching for the Future: Scrub Jay Episodic Memory Principles for Agent Memory Systems · arXiv:2608.04746
- 2026-08-03 · CoEvo- Mem : Co-Evolving Retrieval Policy and Memory Bank for LLM Agents · arXiv:2608.01739
- 2026-08-02 · V- Mem : Modality-Routed Retrieval for Long-Term Multimodal Agentic Memory · arXiv:2608.01543
- 2026-08-02 · Stop When Memory Suffices: Evidence-Conditioned Progressive Execution for LLM Agents · arXiv:2608.01285
- 2026-07-31 · Zero- Mem : Zero-Token Memory Operations for LLM Agents · arXiv:2607.29377
- 2026-07-30 · - Mem : An Online Reliability Memory for LLM -based Multi- Agent Systems · arXiv:2607.27958
- 2026-05-29 · SF-AMS: Strategic Forgetting for Structured Memory in LLM Agent · arXiv:2607.22562
- 2026-08-21 · CMI- Mem : Toward Generalizable Long-Term Memory Management via CMI-Augmented Reinforcement Learning · arXiv:2607.20553
- 2026-06-01 · Profile-Graph Memory for LLM Agents : Implicit Cross-Entity Traversal through Narrative Profiles · arXiv:2607.19359

## 被常引但不在语料里（下一轮的查询）

- (17 篇引) A-mem: Agentic memory for LLM agents. · 2025 · arXiv:2502.12110
- (10 篇引) Agent workflow memory. · 2025 · arXiv:2409.07429
- (10 篇引) Expel: Llm agents are experiential learners. · 2024 · arXiv:2308.10144
- (9 篇引) Overcoming catastrophic forgetting in neural networks. · 2017
- (9 篇引) Zep: A temporal knowledge graph architecture for agent memory. · 2025 · arXiv:2501.13956
- (9 篇引) LongMemEval: Benchmarking chat assistants on long-term interactive memory. · 2025 · arXiv:2410.10813
- (9 篇引) Evaluating very long-term conversational memory of llm agents. · 2024 · arXiv:2402.17753
- (8 篇引) SkillRL: Evolving Agents via Recursive Skill-Augmented Reinforcement Learning. · 2026 · arXiv:2602.08234
- (8 篇引) SWE-bench: Can language models resolve real-world github issues? · 2024 · arXiv:2310.06770
- (8 篇引) ALFWorld: Aligning text and embodied environments for interactive learning. · 2021 · arXiv:2010.03768
- (8 篇引) Language models are few-shot learners. · 2020 · arXiv:2005.14165
- (8 篇引) LoRA: Low-Rank Adaptation of Large Language Models. · 2021 · arXiv:2106.09685
- (8 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (8 篇引) Memory-r1: Enhancing large language model agents to manage and utilize memories via reinforcement learning. · 2026 · arXiv:2508.19828
- (7 篇引) Reasoningbank: Scaling agent self-evolving with reasoning memory. · 2026 · arXiv:2509.25140
- (7 篇引) Lost in the Middle: How Language Models Use Long Contexts. · 2024 · arXiv:2307.03172
- (7 篇引) Toolformer: Language models can teach themselves to use tools. · 2023 · arXiv:2302.04761
- (7 篇引) Memp: Exploring agent procedural memory. · 2026 · arXiv:2508.06433
- (7 篇引) Memory os of ai agent. · 2025 · arXiv:2506.06326
- (7 篇引) Deepseekmath: Pushing the limits of mathematical reasoning in open language models. · 2024 · arXiv:2402.03300
- (7 篇引) Lightmem: Lightweight and efficient memory-augmented generation. · 2026 · arXiv:2510.18866
- (7 篇引) Memos: A memory os for ai system. · 2025 · arXiv:2507.03724
- (7 篇引) PackNet: Adding multiple tasks to a single network by iterative pruning. · 2018
- (7 篇引) Memento: Fine-tuning llm agents without fine-tuning llms. · 2025 · arXiv:2508.16153
- (7 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (6 篇引) Learning without forgetting. · 2018
- (6 篇引) Why there are complementary learning systems in the hippocampus and neocortex: Insights from the successes and · 1995
- (6 篇引) MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents. · 2026 · arXiv:2602.02474
- (6 篇引) A survey on the memory mechanism of large language model-based agents. · 2025
- (6 篇引) The probabilistic relevance framework: BM25 and beyond. · 2009
- (6 篇引) Titans: Learning to memorize at test time. · 2025 · arXiv:2501.00663
- (5 篇引) Cognitive architectures for language agents. · 2023 · arXiv:2309.02427
- (5 篇引) Progressive neural networks. · 2016 · arXiv:1606.04671
- (5 篇引) Skillx: Automatically constructing skill knowledge bases for agents. · 2026 · arXiv:2604.04804
- (5 篇引) SimpleMem: Efficient lifelong memory for LLM agents. · 2026 · arXiv:2601.02553
- (5 篇引) Agentic context engineering: Evolving contexts for self-improving language models. · 2026 · arXiv:2510.04618
- (5 篇引) HippoRAG: neurobiologically inspired long-term memory for large language models · 2024 · arXiv:2405.14831
- (5 篇引) Dense passage retrieval for open-domain question answering. · 2020 · arXiv:2004.04906
- (5 篇引) Webarena: A realistic web environment for building autonomous agents. · 2024 · arXiv:2307.13854
- (5 篇引) From RAG to memory: non-parametric continual learning for large language models · 2025 · arXiv:2502.14802

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 11.9 | 2024 | 1 | MemGPT : Towards LLMs as Operating Systems | 2310.08560 |
| 5.8 | 2026 | 1 | WASP- Mem : Let Agent Organize Procedural Memory . Human Spend Effort on Diagnosis | 2611.04003 |
| 5.8 | 2026 | 1 | Agent Memory as Recommendation: Recommender-System Design for Long-Term Memory of LLM Agents | 2610.34673 |
| 4.7 | 2026 | 1 | FlexA- Mem : Budget-Adaptive Agentic Memory for LLM Agents | 2610.33274 |
| 5.8 | 2026 | 1 | SLICE- Mem : Salience-Gated Lightweight Information Curation for Efficient LLM Agent Memory | 2610.33015 |
| 4.7 | 2026 | 1 | SAFE- Mem : Secure Agentic Memory with Fine-Grained Authority and Governance-Aware Retrieval | 2610.22959 |
| 5.8 | 2026 | 1 | MemCode: Discrete Semantic Representations for Long-Term Agent Memory | 2610.19472 |
| 5.8 | 2026 | 1 | Temporal Evidence Forests for Long-Horizon Multi-Party Conversational Memory | 2610.12874 |
| 4.7 | 2026 | 1 | Lineage-Aware Memory Governance: A Derivation-Gated Framework for Privacy-Preserving Column-Level Ac | 2610.07258 |
| 4.7 | 2026 | 1 | Mem ++: Non-Destructive Memory for Long-Term Organizational LLM Agents | 2610.02002 |
| 4.7 | 2026 | 1 | EP- Mem : Elastic Privacy Memory for Social Relationship-Aware LLM Agents | 2609.35233 |
| 4.7 | 2026 | 1 | MoM: Memory of Memory | 2609.25054 |
| 4.7 | 2026 | 1 | Jev- Mem : System-One-Controlled Agentic Memory for Efficient AI Agents | 2609.23986 |
| 4.7 | 2026 | 1 | From Biological Precursors to Artificial Cognition: Consciousness, Embodiment, and the MEM Architect | 2609.23828 |
| 5.8 | 2026 | 1 | LifeFuse- Mem : Lifecycle-Aware State Fusion Against Temporary Overwriting for Long-Term Memory | 2609.12436 |
| 4.7 | 2026 | 1 | Personalizing LLM Agent Memory Using Biometrics | 2609.08558 |
| 4.7 | 2026 | 1 | Compact- Memory LLM Agents via Online Max-Member Clustering and Atom-Aware Packing | 2609.04915 |
| 4.7 | 2026 | 1 | When Users Don't Ask: Benchmarking Context-Driven Memory Retrieval in Conversational Agents | 2609.03467 |
| 3.6 | 2026 | 1 | ClinTraceBench: Source-Verifiable Longitudinal Clinical Reasoning over EHR-Derived Dialogues | 2609.01111 |
| 4.7 | 2026 | 1 | CABLE: Extending the Reach of Memory Retrieval via Complementary Antecedent-Based Linking and Expans | 2608.17911 |
| 5.8 | 2026 | 1 | What to Remember, What to Reveal: Privacy-Aware Memory for Conversational Agents | 2608.16551 |
| 5.8 | 2026 | 1 | LycheeMemory V2: Efficient Long-Term Memory for LLM Agents via Semantic Segment-Level Consolidation | 2608.12990 |
| 5.8 | 2026 | 1 | Caching for the Future: Scrub Jay Episodic Memory Principles for Agent Memory Systems | 2608.04746 |
| 4.7 | 2026 | 1 | CoEvo- Mem : Co-Evolving Retrieval Policy and Memory Bank for LLM Agents | 2608.01739 |
| 4.7 | 2026 | 1 | V- Mem : Modality-Routed Retrieval for Long-Term Multimodal Agentic Memory | 2608.01543 |
| 4.7 | 2026 | 1 | Stop When Memory Suffices: Evidence-Conditioned Progressive Execution for LLM Agents | 2608.01285 |
| 4.7 | 2026 | 1 | Zero- Mem : Zero-Token Memory Operations for LLM Agents | 2607.29377 |
| 4.7 | 2026 | 1 | - Mem : An Online Reliability Memory for LLM -based Multi- Agent Systems | 2607.27958 |
| 5.8 | 2026 | 1 | SF-AMS: Strategic Forgetting for Structured Memory in LLM Agent | 2607.22562 |
| 5.8 | 2026 | 1 | CMI- Mem : Toward Generalizable Long-Term Memory Management via CMI-Augmented Reinforcement Learning | 2607.20553 |
| 5.8 | 2026 | 1 | Profile-Graph Memory for LLM Agents : Implicit Cross-Entity Traversal through Narrative Profiles | 2607.19359 |
| 4.7 | 2026 | 1 | When Does Overlap Help? OSU- Mem and a Cell-Conditional Analysis of Trajectory Memory for LLM Agents | 2606.28376 |
| 5.8 | 2026 | 1 | TRUSTMEM: Learning Trustworthy Memory Consolidation for LLM Agents with Long-Term Memory | 2606.25161 |
| 5.8 | 2026 | 1 | T- Mem : Memory That Anticipates, Not Archives | 2606.15405 |
| 4.7 | 2026 | 1 | Beyond Similarity: Trustworthy Memory Search for Personal AI Agents | 2606.06054 |
| 4.7 | 2026 | 1 | eMEM: A Hybrid Spatio-Temporal Memory System For Embodied Agents | 2606.03374 |
| 4.7 | 2026 | 1 | SAGE: A Novelty Gate for Efficient Memory Evolution in Agentic LLMs | 2605.30711 |
| 5.8 | 2026 | 1 | MemMark: State-Evolution Attribution Watermarking for Agent Long-Term Memory Systems | 2605.25002 |
| 4.7 | 2026 | 1 | Mem -$π$: Adaptive Memory through Learning When and What to Generate | 2605.21463 |
| 3.6 | 2026 | 1 | Multi-Paradigm Agent Interaction in Practice:A Systematic Analysis of Generator-Evaluator, ReAct Loo | 2605.16821 |
| 4.7 | 2026 | 1 | H- Mem : A Novel Memory Mechanism for Evolving and Retrieving Agent Memory via a Hybrid Structure | 2605.15701 |
| 5.8 | 2026 | 1 | R^2- Mem : Reflective Experience for Memory Search | 2605.13486 |
| 4.7 | 2026 | 1 | Goal-Oriented Reasoning for RAG-based Memory in Conversational Agentic LLM Systems | 2605.12213 |
| 4.7 | 2026 | 1 | What Happens Inside Agent Memory ? Circuit Analysis from Emergence to Diagnosis | 2605.03354 |
| 4.7 | 2026 | 1 | MEMAUDIT: An Exact Package-Oracle Evaluation Protocol for Budgeted Long-Term LLM Memory Writing | 2605.02199 |
| 4.7 | 2026 | 1 | ZenBrain: A Neuroscience-Inspired 7-Layer Memory Architecture for Autonomous AI Systems | 2604.23878 |
| 4.7 | 2026 | 1 | To Know is to Construct: Schema-Constrained Generation for Agent Memory | 2604.20117 |
| 4.7 | 2026 | 1 | HiGMem: A Hierarchical and LLM -Guided Memory System for Long-Term Conversational Agents | 2604.18349 |
| 5.8 | 2026 | 1 | HeLa- Mem : Hebbian Learning and Associative Memory for LLM Agents | 2604.16839 |
| 4.7 | 2026 | 1 | Memory as Metabolism: A Design for Companion Knowledge Systems | 2604.12034 |
| 4.7 | 2026 | 1 | Synthius- Mem : Brain-Inspired Hallucination-Resistant Persona Memory Achieving 94.4% Memory Accurac | 2604.11563 |
| 4.7 | 2026 | 1 | VRL-Bench: Benchmarking agents on computer control tasks under finite trial budgets | 2609.12404 |
| 11.9 | 2023 | 1 | Reflexion : Language Agents with Verbal Reinforcement Learning | 2303.11366 |
| 2.8 | 2023 | 1 | ReAct : Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 4.7 | 2025 | 1 | Mem0 : Building Production - Ready AI Agents with Scalable Long - Term Memory | 2504.19413 |
| 3.9 | 2023 | 1 | MemoryBank : Enhancing Large Language Models with Long - Term Memory | 2305.10250 |
| 11.6 | 2026 | 1 | AgentSociety: Large-Scale Simulation of LLM-Driven Generative Agents Advances Understanding of Human | 2502.08691 |
| 3.6 | 2025 | 1 | Crafting Customisable Characters with LLMs: A Persona-Driven Role-Playing Agent Framework | 2406.17962 |
| 10.8 | 2023 | 1 | Generative Agents : Interactive Simulacra of Human Behavior | 2304.03442 |
| 4.0 | 2026 | 1 | LR-Robot: A Unified Supervised Intelligent Framework for Real-Time Systematic Literature Reviews wit | 2603.17723 |
| 3.6 | 2025 | 1 | GRADE: Generating multi-hop QA and fine-gRAined Difficulty matrix for RAG Evaluation | 2508.16994 |
| 3.6 | 2025 | 1 | Test-time Corpus Feedback: From Retrieval to RAG | 2508.15437 |
| 3.6 | 2026 | 1 | From Ambiguity to Accuracy: The Transformative Effect of Coreference Resolution on Retrieval - Augme | 2507.07847 |
| 3.6 | 2025 | 1 | Multilingual Retrieval - Augmented Generation for Knowledge - Intensive Task | 2504.03616 |
| 3.6 | 2025 | 1 | An Analysis of Decoding Methods for LLM-based Agents for Faithful Multi-Hop Question Answering | 2503.23415 |
| 3.6 | 2025 | 1 | CausalRAG: Integrating Causal Graphs into Retrieval - Augmented Generation | 2503.19878 |
| 3.6 | 2025 | 1 | Post-training an LLM for RAG? Train on Self- Generated Demonstrations | 2502.10596 |
| 2.8 | 2024 | 1 | Domain-Specific Retrieval - Augmented Generation Using Vector Stores, Knowledge Graphs, and Tensor F | 2410.02721 |
| 2.8 | 2024 | 1 | TongGu: Mastering Classical Chinese Understanding with Knowledge -Grounded Large Language Models | 2407.03937 |
| 2.8 | 2024 | 1 | BiomedRAG: A Retrieval Augmented Large Language Model for Biomedicine | 2405.00465 |
| 4.0 | 2025 | 1 | RAG and RAU: A Survey on Retrieval - Augmented Language Model in Natural Language Processing | 2404.19543 |
| 2.8 | 2024 | 1 | HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild | 2403.04307 |
| 2.8 | 2024 | 1 | Accelerating Retrieval - Augmented Language Model Serving with Speculation | 2401.14021 |
| 3.2 | 2024 | 1 | A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Quest | 2311.05232 |
| 4.0 | 2025 | 1 | Automating construction contract review using knowledge graph-enhanced large language models | 2309.12132 |
| 2.8 | 2023 | 1 | Meta-training with Demonstration Retrieval for Efficient Few-shot Learning | 2307.00119 |
| 2.8 | 2023 | 1 | Recitation- Augmented Language Models | 2210.01296 |
| 2.1 | 2022 | 1 | Evidentiality-guided Generation for Knowledge - Intensive NLP Tasks | 2112.08688 |
| 2.1 | 2021 | 1 | Retrieval - Augmented Generation for Knowledge - Intensive NLP Tasks | 2005.11401 |
| 14.1 | 2026 | 2 | VidEngram: Agentic Long - Term Video Understanding via Structured Hierarchical Memory | 2611.18578 |

## 读不到全文的（诚实记录）

- arXiv:2006.08340 — HTTP 404
- arXiv:2503.01058 — HTTP 404
- arXiv:2610.39180 — HTTP 404

_生成于 2026-11-23T15:06:15.137Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_