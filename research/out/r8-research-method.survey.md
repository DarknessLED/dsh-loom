# R8 调研方法本身：文献饱和、系统综述自动化、证据质量与可复算

- 检索：17 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 706 个不同候选，保留 219
- 回溯：读通 49 篇全文的参考文献，共 2465 条引用（3 篇无可用 HTML）
- 语料内被引：173 个工作被本语料至少两篇论文引用；被引最多的是 14 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 24 | 2022 | ReAct: Synergizing reasoning and acting in language models. | 2210.03629 |
| 10 | 15 | 2023 | Enabling large language models to generate text with citations. | — |
| 9 | 18 | 2025 | DeepResearch bench: A comprehensive benchmark for deep research agents. | — |
| 9 | 16 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. | — |
| 8 | 10 | 2023 | Toolformer: Language models can teach themselves to use tools. | 2302.04761 |
| 7 | 15 | 2021 | The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. | — |
| 7 | 14 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. | 2504.12516 |
| 7 | 10 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. | 2503.09516 |
| 7 | 9 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. | 2112.09332 |
| 7 | 8 | 2023 | Self-Refine: Iterative refinement with self-feedback. | 2303.17651 |
| 6 | 13 | 2025 | Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. | 2511.07685 |
| 6 | 9 | 2023 | Reflexion: language agents with verbal reinforcement learning. | 2303.11366 |
| 5 | 12 | 2025 | Browsecomp-plus: a more fair and transparent evaluation benchmark of deep-research agent | 2508.06600 |
| 5 | 10 | 2023 | Evaluating verifiability in generative search engines. | — |
| 5 | 9 | 2025 | WebSailor: Navigating super-human reasoning for web agent. | 2507.02592 |
| 5 | 8 | 2025 | DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. | 2504.03160 |
| 5 | 8 | 2017 | Analysis of the time and workers needed to conduct systematic reviews of medical interventions using data fr | — |
| 5 | 7 | 2023 | Survey of hallucination in natural language generation. | 2202.03629 |
| 5 | 7 | 2024 | GAIA: a benchmark for general AI assistants. | 2311.12983 |
| 5 | 7 | 2025 | Introducing deep research. | — |
| 5 | 6 | 2025 | A survey on hallucination in large language models: Principles, taxonomy, challenges, and open questions. | 2311.05232 |
| 5 | 5 | 2023 | Lost in the Middle: How Language Models Use Long Contexts. | — |
| 5 | 5 | 2025 | Tongyi deepresearch technical report. | 2510.24701 |
| 5 | 5 | 2023 | FActScore: Fine-grained atomic evaluation of factual precision in long form text generation. | — |
| 5 | 5 | 2024 | WebArena: A realistic web environment for building autonomous agents. | 2307.13854 |
| 5 | 5 | 2021 | Lora: Low-rank adaptation of large language models. | 2106.09685 |
| 4 | 11 | 2024 | Assisting in writing Wikipedia-like articles from scratch with large language models. | — |
| 4 | 8 | 2022 | Chain of thought prompting elicits reasoning in large language models. | 2201.11903 |
| 4 | 6 | 2025 | Large language models for conducting systematic reviews: on the rise, but not yet ready for use — a scoping  | — |
| 4 | 6 | 2025 | Mind2web 2: evaluating agentic search with agent-as-a-judge | 2506.21506 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 24 | 14 | 2022 | ReAct: Synergizing reasoning and acting in language models. |
| 15 | 10 | 2023 | Enabling large language models to generate text with citations. |
| 18 | 9 | 2025 | DeepResearch bench: A comprehensive benchmark for deep research agents. |
| 16 | 9 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. |
| 10 | 8 | 2023 | Toolformer: Language models can teach themselves to use tools. |
| 15 | 7 | 2021 | The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. |
| 14 | 7 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. |
| 10 | 7 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. |
| 9 | 7 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. |
| 8 | 7 | 2023 | Self-Refine: Iterative refinement with self-feedback. |
| 13 | 6 | 2025 | Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. |
| 9 | 6 | 2023 | Reflexion: language agents with verbal reinforcement learning. |
| 12 | 5 | 2025 | Browsecomp-plus: a more fair and transparent evaluation benchmark of deep-research agent |
| 10 | 5 | 2023 | Evaluating verifiability in generative search engines. |
| 9 | 5 | 2025 | WebSailor: Navigating super-human reasoning for web agent. |
| 8 | 5 | 2025 | DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. |
| 8 | 5 | 2017 | Analysis of the time and workers needed to conduct systematic reviews of medical interventions using |
| 7 | 5 | 2023 | Survey of hallucination in natural language generation. |
| 7 | 5 | 2024 | GAIA: a benchmark for general AI assistants. |
| 7 | 5 | 2025 | Introducing deep research. |
| 6 | 5 | 2025 | A survey on hallucination in large language models: Principles, taxonomy, challenges, and open quest |
| 5 | 5 | 2023 | Lost in the Middle: How Language Models Use Long Contexts. |
| 5 | 5 | 2025 | Tongyi deepresearch technical report. |
| 5 | 5 | 2023 | FActScore: Fine-grained atomic evaluation of factual precision in long form text generation. |
| 5 | 5 | 2024 | WebArena: A realistic web environment for building autonomous agents. |
| 5 | 5 | 2021 | Lora: Low-rank adaptation of large language models. |
| 11 | 4 | 2024 | Assisting in writing Wikipedia-like articles from scratch with large language models. |
| 8 | 4 | 2022 | Chain of thought prompting elicits reasoning in large language models. |
| 6 | 4 | 2025 | Large language models for conducting systematic reviews: on the rise, but not yet ready for use — a  |
| 6 | 4 | 2025 | Mind2web 2: evaluating agentic search with agent-as-a-judge |

## 各细分方向的开篇（按语料内最早一篇）

- **evidence grounding**（102 篇，最早 2021-04-12）Retrieval - Augmented Generation for Knowledge - Intensive NLP Tasks · arXiv:2005.11401
- **review automation**（49 篇，最早 2022-01-06）Paperfetcher: A tool to automate handsearch for systematic reviews · arXiv:2110.12490
- **research agent evaluation**（49 篇，最早 2024-09-15）HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild · arXiv:2403.04307
- **coverage & saturation**（5 篇，最早 2025-10-03）Multilingual Retrieval - Augmented Generation for Knowledge - Intensive Task · arXiv:2504.03616
- **citation graph mining**（2 篇，最早 2025-07-12）GRAG: Graph Retrieval-Augmented Generation · arXiv:2405.16506

## 最近的 SOTA（近两年）

- 2026-06-04 · Automatic bioinformatic software named entity recognition from literature · arXiv:2608.19201
- 2026-04-14 · Multi-Persona Debate System for Automated Scientific Hypothesis Generation · arXiv:2605.23917
- 2026-03-27 · CoAuthorAI: A Human in the Loop System For Scientific Book Writing · arXiv:2604.19772
- 2026-03-18 · Grounded Multimodal Retrieval-Augmented Drafting of Radiology Impressions Using Case-Based Similarity Search · arXiv:2603.17765
- 2026-02-18 · Retrieval Augmented Generation of Literature-derived Polymer Knowledge: The Example of a Biodegradable Polymer Expert System · arXiv:2602.16650
- 2026-01-13 · sui-1: Grounded and Verifiable Long-Form Summarization · arXiv:2601.08472
- 2025-12-12 · Citation -Grounded Code Comprehension: Preventing LLM Hallucination Through Hybrid Retrieval and Graph-Augmented Context · arXiv:2512.12117
- 2025-11-20 · SemanticCite: Citation Verification with AI-Powered Full- Text Analysis and Evidence-Based Reasoning · arXiv:2511.16198
- 2025-10-17 · SQuAI: Scientific Question-Answering with Multi-Agent Retrieval-Augmented Generation · arXiv:2510.15682
- 2026-08-26 · SciTrek: Evaluating and Improving Long-Context Numerical Reasoning over Scientific Articles · arXiv:2509.21028
- 2026-04-22 · From Nodes to Narratives: Explaining Graph Neural Networks with LLMs and Graph Context · arXiv:2508.07117
- 2025-06-20 · eSapiens: A Real-World NLP Framework for Multimodal Document Understanding and Enterprise Knowledge Processing · arXiv:2506.16768
- 2026-01-11 · Graph-KV: Breaking Sequence via Injecting Structural Biases into Large Language Models · arXiv:2506.07334
- 2026-02-22 · Towards A Universal Graph Structural Encoder · arXiv:2504.10917
- 2025-04-02 · YourBench: Easy Custom Evaluation Sets for Everyone · arXiv:2504.01833
- 2025-02-02 · ChartCitor: Multi-Agent Framework for Fine-Grained Chart Visual Attribution · arXiv:2502.00989
- 2025-07-12 · GRAG: Graph Retrieval-Augmented Generation · arXiv:2405.16506
- 2026-04-16 · Mind DeepResearch Technical Report · arXiv:2604.14518
- 2026-02-05 · TRACE: Trajectory-Aware Comprehensive Evaluation for Deep Research Agents · arXiv:2602.21230
- 2026-08-25 · A Tale of Two Graphs: Separating Knowledge Exploration from Outline Structure for Open-Ended Deep Research · arXiv:2602.13830
- 2026-01-28 · Deep Researcher with Sequential Plan Reflection and Candidates Crossover ( Deep Researcher Reflect Evolve) · arXiv:2601.20843
- 2026-01-25 · Self-Manager: Parallel Agent Loop for Long-form Deep Research · arXiv:2601.17879
- 2026-09-10 · DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports · arXiv:2601.08536
- 2025-12-04 · A Hierarchical Tree-based approach for creating Configurable and Static Deep Research Agent (Static-DRA) · arXiv:2512.03887
- 2025-12-15 · How Far Are We from Genuinely Useful Deep Research Agents ? · arXiv:2512.01948
- 2025-10-07 · WebWeaver: Structuring Web-Scale Evidence with Dynamic Outlines for Open-Ended Deep Research · arXiv:2509.13312
- 2025-06-13 · DeepResearch Bench : A Comprehensive Benchmark for Deep Research Agents · arXiv:2506.11763
- 2026-07-17 · LR-Robot: A Unified Supervised Intelligent Framework for Real-Time Systematic Literature Reviews with Large Language Models · arXiv:2603.17723
- 2025-12-14 · GRADE: Generating multi-hop QA and fine-gRAined Difficulty matrix for RAG Evaluation · arXiv:2508.16994
- 2025-08-24 · Test-time Corpus Feedback: From Retrieval to RAG · arXiv:2508.15437

## 被常引但不在语料里（下一轮的查询）

- (7 篇引) The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. · 2021
- (7 篇引) WebGPT: Browser-assisted question-answering with human feedback. · 2021 · arXiv:2112.09332
- (7 篇引) Self-Refine: Iterative refinement with self-feedback. · 2023 · arXiv:2303.17651
- (6 篇引) Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. · 2025 · arXiv:2511.07685
- (6 篇引) Reflexion: language agents with verbal reinforcement learning. · 2023 · arXiv:2303.11366
- (5 篇引) Browsecomp-plus: a more fair and transparent evaluation benchmark of deep-research agent · 2025 · arXiv:2508.06600
- (5 篇引) Evaluating verifiability in generative search engines. · 2023
- (5 篇引) WebSailor: Navigating super-human reasoning for web agent. · 2025 · arXiv:2507.02592
- (5 篇引) DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. · 2025 · arXiv:2504.03160
- (5 篇引) Analysis of the time and workers needed to conduct systematic reviews of medical interventions using data from · 2017
- (5 篇引) Survey of hallucination in natural language generation. · 2023 · arXiv:2202.03629
- (5 篇引) GAIA: a benchmark for general AI assistants. · 2024 · arXiv:2311.12983
- (5 篇引) Introducing deep research. · 2025
- (5 篇引) Lost in the Middle: How Language Models Use Long Contexts. · 2023
- (5 篇引) Tongyi deepresearch technical report. · 2025 · arXiv:2510.24701
- (5 篇引) FActScore: Fine-grained atomic evaluation of factual precision in long form text generation. · 2023
- (5 篇引) WebArena: A realistic web environment for building autonomous agents. · 2024 · arXiv:2307.13854
- (5 篇引) Lora: Low-rank adaptation of large language models. · 2021 · arXiv:2106.09685
- (4 篇引) Assisting in writing Wikipedia-like articles from scratch with large language models. · 2024
- (4 篇引) Chain of thought prompting elicits reasoning in large language models. · 2022 · arXiv:2201.11903
- (4 篇引) Large language models for conducting systematic reviews: on the rise, but not yet ready for use — a scoping re · 2025
- (4 篇引) Mind2web 2: evaluating agentic search with agent-as-a-judge · 2025 · arXiv:2506.21506
- (4 篇引) Large Language Models Cannot Self-Correct Reasoning Yet. · 2024
- (4 篇引) Judging llm-as-a-judge with mt-bench and chatbot arena. · 2023
- (4 篇引) Self-RAG: Learning to retrieve, generate, and critique through self-reflection. · 2024 · arXiv:2310.11511
- (4 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (3 篇引) Automation of systematic literature reviews: A systematic literature review. · 2021
- (3 篇引) Guidelines for performing systematic literature reviews in software engineering. · 2007
- (3 篇引) GhostCite: A large-scale analysis of citation validity in the age of large language models. · 2026 · arXiv:2602.06718
- (3 篇引) Cochrane handbook for systematic reviews of interventions. · 2019
- (3 篇引) HalluCitation matters: Revealing the impact of hallucinated references with 300 hallucinated papers in ACL con · 2026 · arXiv:2601.18724
- (3 篇引) AutoSurvey: Large language models can automatically write surveys. · 2024
- (3 篇引) Deep research: A survey of autonomous research agents. · 2025 · arXiv:2508.12752
- (3 篇引) MC-search: evaluating and enhancing multimodal agentic search with structured long reasoning chains · 2026
- (3 篇引) Synthesizing scientific literature with retrieval-augmented language models. · 2026
- (3 篇引) WebThinker: Empowering large reasoning models with deep research capability. · 2025
- (3 篇引) SWE-bench: can language models resolve real-world github issues? · 2024
- (3 篇引) Self-consistency improves chain of thought reasoning in language models · 2023 · arXiv:2203.11171
- (3 篇引) Quest: Training frontier deep research agents with fully synthetic tasks. · 2026 · arXiv:2605.24218
- (3 篇引) Fabrication and errors in the bibliographic citations generated by ChatGPT. · 2023

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 5.0 | 2023 | 1 | ReAct : Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 8.0 | 2026 | 1 | Automatic bioinformatic software named entity recognition from literature | 2608.19201 |
| 5.8 | 2026 | 1 | Multi-Persona Debate System for Automated Scientific Hypothesis Generation | 2605.23917 |
| 5.8 | 2026 | 1 | CoAuthorAI: A Human in the Loop System For Scientific Book Writing | 2604.19772 |
| 6.9 | 2026 | 1 | Grounded Multimodal Retrieval-Augmented Drafting of Radiology Impressions Using Case-Based Similarit | 2603.17765 |
| 5.8 | 2026 | 1 | Retrieval Augmented Generation of Literature-derived Polymer Knowledge: The Example of a Biodegradab | 2602.16650 |
| 6.9 | 2026 | 1 | sui-1: Grounded and Verifiable Long-Form Summarization | 2601.08472 |
| 6.9 | 2025 | 1 | Citation -Grounded Code Comprehension: Preventing LLM Hallucination Through Hybrid Retrieval and Gra | 2512.12117 |
| 5.8 | 2025 | 1 | SemanticCite: Citation Verification with AI-Powered Full- Text Analysis and Evidence-Based Reasoning | 2511.16198 |
| 6.9 | 2025 | 1 | SQuAI: Scientific Question-Answering with Multi-Agent Retrieval-Augmented Generation | 2510.15682 |
| 5.8 | 2026 | 1 | SciTrek: Evaluating and Improving Long-Context Numerical Reasoning over Scientific Articles | 2509.21028 |
| 4.7 | 2026 | 1 | From Nodes to Narratives: Explaining Graph Neural Networks with LLMs and Graph Context | 2508.07117 |
| 6.9 | 2025 | 1 | eSapiens: A Real-World NLP Framework for Multimodal Document Understanding and Enterprise Knowledge  | 2506.16768 |
| 5.8 | 2026 | 1 | Graph-KV: Breaking Sequence via Injecting Structural Biases into Large Language Models | 2506.07334 |
| 4.7 | 2026 | 1 | Towards A Universal Graph Structural Encoder | 2504.10917 |
| 8.0 | 2025 | 1 | YourBench: Easy Custom Evaluation Sets for Everyone | 2504.01833 |
| 8.0 | 2025 | 1 | ChartCitor: Multi-Agent Framework for Fine-Grained Chart Visual Attribution | 2502.00989 |
| 4.3 | 2024 | 1 | Graph Learning in the Era of LLMs: A Survey from the Perspective of Data, Models , and Tasks | 2412.12456 |
| 6.1 | 2024 | 1 | LongCite: Enabling LLMs to Generate Fine-grained Citations in Long-context QA | 2409.02897 |
| 7.6 | 2024 | 1 | pathfinder: A Semantic Framework for Literature Review and Knowledge Discovery in Astronomy | 2408.01556 |
| 6.9 | 2025 | 1 | GRAG: Graph Retrieval-Augmented Generation | 2405.16506 |
| 5.0 | 2024 | 1 | On the Evaluation of Machine- Generated Reports | 2405.00982 |
| 3.9 | 2024 | 1 | One for All: Towards Training One Graph Model for All Classification Tasks | 2310.00149 |
| 6.1 | 2023 | 1 | Enabling Large Language Models to Generate Text with Citations | 2305.14627 |
| 5.8 | 2026 | 1 | Mind DeepResearch Technical Report | 2604.14518 |
| 6.9 | 2026 | 1 | TRACE: Trajectory-Aware Comprehensive Evaluation for Deep Research Agents | 2602.21230 |
| 5.8 | 2026 | 1 | A Tale of Two Graphs: Separating Knowledge Exploration from Outline Structure for Open-Ended Deep Re | 2602.13830 |
| 6.9 | 2026 | 1 | Deep Researcher with Sequential Plan Reflection and Candidates Crossover ( Deep Researcher Reflect E | 2601.20843 |
| 5.8 | 2026 | 1 | Self-Manager: Parallel Agent Loop for Long-form Deep Research | 2601.17879 |
| 18.2 | 2026 | 1 | DeepResearch Bench II: Diagnosing Deep Research Agents via Rubrics from Expert Reports | 2601.08536 |
| 6.9 | 2025 | 1 | A Hierarchical Tree-based approach for creating Configurable and Static Deep Research Agent (Static- | 2512.03887 |
| 9.1 | 2025 | 1 | How Far Are We from Genuinely Useful Deep Research Agents ? | 2512.01948 |
| 16.0 | 2025 | 1 | WebWeaver: Structuring Web-Scale Evidence with Dynamic Outlines for Open-Ended Deep Research | 2509.13312 |
| 8.0 | 2025 | 1 | DeepResearch Bench : A Comprehensive Benchmark for Deep Research Agents | 2506.11763 |
| 5.1 | 2026 | 1 | LR-Robot: A Unified Supervised Intelligent Framework for Real-Time Systematic Literature Reviews wit | 2603.17723 |
| 4.7 | 2025 | 1 | GRADE: Generating multi-hop QA and fine-gRAined Difficulty matrix for RAG Evaluation | 2508.16994 |
| 3.6 | 2025 | 1 | Test-time Corpus Feedback: From Retrieval to RAG | 2508.15437 |
| 3.6 | 2026 | 1 | From Ambiguity to Accuracy: The Transformative Effect of Coreference Resolution on Retrieval - Augme | 2507.07847 |
| 4.7 | 2025 | 1 | Multilingual Retrieval - Augmented Generation for Knowledge - Intensive Task | 2504.03616 |
| 3.6 | 2025 | 1 | An Analysis of Decoding Methods for LLM-based Agents for Faithful Multi-Hop Question Answering | 2503.23415 |
| 3.6 | 2025 | 1 | CausalRAG: Integrating Causal Graphs into Retrieval - Augmented Generation | 2503.19878 |
| 3.6 | 2025 | 1 | Post-training an LLM for RAG? Train on Self- Generated Demonstrations | 2502.10596 |
| 3.9 | 2024 | 1 | Domain-Specific Retrieval - Augmented Generation Using Vector Stores, Knowledge Graphs, and Tensor F | 2410.02721 |
| 3.9 | 2024 | 1 | TongGu: Mastering Classical Chinese Understanding with Knowledge -Grounded Large Language Models | 2407.03937 |
| 5.0 | 2024 | 1 | BiomedRAG: A Retrieval Augmented Large Language Model for Biomedicine | 2405.00465 |
| 4.0 | 2025 | 1 | RAG and RAU: A Survey on Retrieval - Augmented Language Model in Natural Language Processing | 2404.19543 |
| 3.9 | 2024 | 1 | HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild | 2403.04307 |
| 5.0 | 2024 | 1 | Accelerating Retrieval - Augmented Language Model Serving with Speculation | 2401.14021 |
| 4.3 | 2024 | 1 | A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Quest | 2311.05232 |
| 4.0 | 2025 | 1 | Automating construction contract review using knowledge graph-enhanced large language models | 2309.12132 |
| 2.8 | 2023 | 1 | Meta-training with Demonstration Retrieval for Efficient Few-shot Learning | 2307.00119 |
| 5.0 | 2023 | 1 | Recitation- Augmented Language Models | 2210.01296 |
| 3.2 | 2022 | 1 | Evidentiality-guided Generation for Knowledge - Intensive NLP Tasks | 2112.08688 |
| 3.2 | 2021 | 1 | Retrieval - Augmented Generation for Knowledge - Intensive NLP Tasks | 2005.11401 |
| 2.8 | 2023 | 1 | Toolformer : Language Models Can Teach Themselves to Use Tools | 2302.04761 |
| 5.8 | 2025 | 1 | BrowseComp : A Simple Yet Challenging Benchmark for Browsing Agents | 2504.12516 |
| 3.6 | 2025 | 1 | AI-SearchPlanner: Modular Agentic Search via Pareto-Optimal Multi-Objective Reinforcement Learning | 2508.20368 |
| 5.8 | 2026 | 1 | End-to-End Agentic RAG System Training for Traceable Diagnostic Reasoning | 2508.15746 |
| 3.6 | 2025 | 1 | An Empirical Study on Reinforcement Learning for Reasoning - Search Interleaved LLM Agents | 2505.15117 |
| 3.6 | 2025 | 1 | Search - R1 : Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning | 2503.09516 |
| 16.4 | 2025 | 1 | LatteReview: A Multi-Agent Framework for Systematic Review Automation Using Large Language Models | 2501.05468 |
| 16.0 | 2026 | 1 | LongCat-DeepResearch Technical Report | 2609.36071 |
| 15.6 | 2023 | 1 | Outcome-based Evaluation of Systematic Review Automation | 2306.17614 |
| 14.9 | 2026 | 1 | RIVO: Lightweight Adaptive Rerouting for Deep Research Agents | 2610.15910 |
| 14.9 | 2026 | 1 | Horizon Scans can be accelerated using novel information retrieval and artificial intelligence tools | 2504.01627 |
| 14.2 | 2026 | 1 | Phantom References: Hallucinated Citations That Survive Peer Review at Top-Tier Conferences | 2607.00738 |
| 12.7 | 2026 | 1 | Can Agent Harnesses and Inference Engines Hear Each Other? The HEAR Protocol for Agentic LLM Serving | 2610.06597 |
| 12.7 | 2025 | 1 | InterChat: Enhancing Generative Visual Analytics using Multimodal Interactions | 2503.04110 |
| 11.6 | 2026 | 2 | Beyond Watching and Searching: Benchmarking Agents for Video-centered Deep Research Reports | 2610.31158 |
| 10.9 | 2026 | 2 | LUMEN: Cost-Transparent Multi-Agent Pipeline for Automated Systematic Review and Meta-Analysis | 2606.28362 |
| 10.5 | 2026 | 2 | Diagnosing Structural Failures in LLM-Based Evidence Extraction for Meta-Analysis | 2602.10881 |
| 10.2 | 2026 | 1 | Security of Deep Research Agents : Attack Surface, Defenses, Benchmarks , and Agenda Seeding against | 2611.20045 |
| 10.2 | 2026 | 1 | An Incremental Knowledge-Graph Learner Digital Twin for Evidence - Grounded Early Warning | 2610.36820 |
| 10.2 | 2026 | 1 | Prompt-to-Paper: Agentic AI System for Bioinformatics | 2607.05456 |
| 9.8 | 2026 | 2 | meta-pipe: An LLM-agent pipeline for end-to-end automated systematic review and meta-analysis | 2606.28363 |
| 9.8 | 2025 | 2 | Transforming Evidence Synthesis: A Systematic Review of the Evolution of Automated Meta-Analysis in  | 2504.20113 |
| 9.5 | 2026 | 1 | AI Slop and Hallucinations in Vulnerability Assessment: A Survey on Reasoning Failures and Trustwort | 2608.25667 |
| 9.5 | 2026 | 1 | ReviewPilot: A Multi- Agent System for Screening and Data Extraction in Systematic Reviews | 2610.21042 |
| 9.5 | 2026 | 1 | LLM-Based Test Oracles: Source-of-Authority Taxonomy -- A Systematic Literature Review | 2607.05031 |
| 9.5 | 2026 | 1 | ARISMA: Guidelines for AI- and LLM-Assisted Systematic Reviews , Scoping Reviews, and Mapping Studie | 2608.25050 |

## 读不到全文的（诚实记录）

- arXiv:2501.05468 — HTTP 404
- arXiv:2504.01627 — HTTP 404
- arXiv:2608.19201 — HTTP 404

_生成于 2026-11-24T17:30:48.473Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_