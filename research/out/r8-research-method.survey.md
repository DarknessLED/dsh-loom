# R8 调研方法本身：文献饱和、系统综述自动化、证据质量与可复算

- 检索：17 条查询（每条最多 2 页 × 50）→ 773 个不同候选，保留 287
- 回溯：读通 49 篇全文的参考文献，共 2732 条引用（5 篇无可用 HTML）
- 语料内被引：172 个工作被本语料至少两篇论文引用；被引最多的是 11 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 11 | 21 | 2023 | ReAct: Synergizing reasoning and acting in language models. | — |
| 11 | 15 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. | — |
| 7 | 12 | 2023 | Enabling large language models to generate text with citations. | — |
| 7 | 12 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. | 2504.12516 |
| 7 | 11 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. | 2503.09516 |
| 6 | 12 | 2023 | Evaluating verifiability in generative search engines. | 2304.09848 |
| 6 | 11 | 2026 | DeepResearch bench: A comprehensive benchmark for deep research agents. | — |
| 6 | 8 | 2025 | Qwen3 technical report. | 2505.09388 |
| 5 | 8 | 2025 | Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. | 2508.06600 |
| 5 | 7 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. | 2112.09332 |
| 5 | 6 | 2023 | Toolformer: Language models can teach themselves to use tools. | — |
| 5 | 6 | 2023 | Self-Refine: Iterative refinement with self-feedback. | — |
| 4 | 9 | 2025 | Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. | 2511.07685 |
| 4 | 9 | 2025 | Search-o1: Agentic search-enhanced large reasoning models. | 2501.05366 |
| 4 | 9 | 2022 | Chain of thought prompting elicits reasoning in large language models. | 2201.11903 |
| 4 | 8 | 2025 | DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. | 2504.03160 |
| 4 | 8 | 2023 | Reflexion: language agents with verbal reinforcement learning. | — |
| 4 | 7 | 2024 | The AI scientist: Towards fully automated open-ended scientific discovery. | 2408.06292 |
| 4 | 6 | 2025 | Introducing deep research. | — |
| 4 | 6 | 2024 | MMMU: a massive multi-discipline multimodal understanding and reasoning benchmark for expert AGI | — |
| 4 | 6 | 2025 | A survey on hallucination in large language models: Principles, taxonomy, challenges, and open questions. | — |
| 4 | 5 | 2024 | GAIA: a benchmark for general AI assistants. | 2311.12983 |
| 4 | 5 | 2024 | WebArena: A realistic web environment for building autonomous agents. | — |
| 4 | 5 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. | — |
| 4 | 4 | 2023 | Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions. | 2212.10509 |
| 4 | 4 | 2024 | Large Language Models Cannot Self-Correct Reasoning Yet. | 2310.01798 |
| 4 | 4 | 2024 | Lost in the Middle: How Language Models Use Long Contexts. | — |
| 4 | 4 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. | 2606.19348 |
| 4 | 4 | 2026 | Glm-5: from vibe coding to agentic engineering. | 2602.15763 |
| 4 | 3 | 2024 | Self-rag: Learning to retrieve, generate, and critique through self-reflection. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 21 | 11 | 2023 | ReAct: Synergizing reasoning and acting in language models. |
| 15 | 11 | 2020 | Retrieval-augmented generation for knowledge-intensive nlp tasks. |
| 12 | 7 | 2023 | Enabling large language models to generate text with citations. |
| 12 | 7 | 2025 | BrowseComp: A simple yet challenging benchmark for browsing agents. |
| 11 | 7 | 2025 | Search-R1: Training LLMs to reason and leverage search engines with reinforcement learning. |
| 12 | 6 | 2023 | Evaluating verifiability in generative search engines. |
| 11 | 6 | 2026 | DeepResearch bench: A comprehensive benchmark for deep research agents. |
| 8 | 6 | 2025 | Qwen3 technical report. |
| 8 | 5 | 2025 | Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. |
| 7 | 5 | 2021 | WebGPT: Browser-assisted question-answering with human feedback. |
| 6 | 5 | 2023 | Toolformer: Language models can teach themselves to use tools. |
| 6 | 5 | 2023 | Self-Refine: Iterative refinement with self-feedback. |
| 9 | 4 | 2025 | Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. |
| 9 | 4 | 2025 | Search-o1: Agentic search-enhanced large reasoning models. |
| 9 | 4 | 2022 | Chain of thought prompting elicits reasoning in large language models. |
| 8 | 4 | 2025 | DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. |
| 8 | 4 | 2023 | Reflexion: language agents with verbal reinforcement learning. |
| 7 | 4 | 2024 | The AI scientist: Towards fully automated open-ended scientific discovery. |
| 6 | 4 | 2025 | Introducing deep research. |
| 6 | 4 | 2024 | MMMU: a massive multi-discipline multimodal understanding and reasoning benchmark for expert AGI |
| 6 | 4 | 2025 | A survey on hallucination in large language models: Principles, taxonomy, challenges, and open quest |
| 5 | 4 | 2024 | GAIA: a benchmark for general AI assistants. |
| 5 | 4 | 2024 | WebArena: A realistic web environment for building autonomous agents. |
| 5 | 4 | 2023 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. |
| 4 | 4 | 2023 | Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions. |
| 4 | 4 | 2024 | Large Language Models Cannot Self-Correct Reasoning Yet. |
| 4 | 4 | 2024 | Lost in the Middle: How Language Models Use Long Contexts. |
| 4 | 4 | 2026 | Deepseek-v4: Towards highly efficient million-token context intelligence. |
| 4 | 4 | 2026 | Glm-5: from vibe coding to agentic engineering. |
| 3 | 4 | 2024 | Self-rag: Learning to retrieve, generate, and critique through self-reflection. |

## 各细分方向的开篇（按语料内最早一篇）

- **evidence grounding**（82 篇，最早 2023-02-16）Recitation- Augmented Language Models · arXiv:2210.01296
- **review automation**（59 篇，最早 2023-06-30）Outcome-based Evaluation of Systematic Review Automation · arXiv:2306.17614
- **research agent evaluation**（49 篇，最早 2024-09-15）HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild · arXiv:2403.04307
- **coverage & saturation**（11 篇，最早 2026-02-14）Unifying Ranking and Generation in Query Auto-Completion via Retrieval-Augmented Generation and Multi-Objectiv · arXiv:2602.01023
- **citation graph mining**（3 篇，最早 2026-10-05）Citations Are Late: Reading epistemic instability from what papers believe, years before the citation graph ca · arXiv:2610.07397

## 最近的 SOTA（近两年）

- 2026-07-17 · LR-Robot: A Unified Supervised Intelligent Framework for Real-Time Systematic Literature Reviews with Large Language Models · arXiv:2603.17723
- 2025-12-14 · GRADE: Generating multi-hop QA and fine-gRAined Difficulty matrix for RAG Evaluation · arXiv:2508.16994
- 2025-08-24 · Test-time Corpus Feedback: From Retrieval to RAG · arXiv:2508.15437
- 2026-04-28 · From Ambiguity to Accuracy: The Transformative Effect of Coreference Resolution on Retrieval - Augmented Generation systems · arXiv:2507.07847
- 2025-10-03 · Multilingual Retrieval - Augmented Generation for Knowledge - Intensive Task · arXiv:2504.03616
- 2025-03-30 · An Analysis of Decoding Methods for LLM-based Agents for Faithful Multi-Hop Question Answering · arXiv:2503.23415
- 2025-10-21 · CausalRAG: Integrating Causal Graphs into Retrieval - Augmented Generation · arXiv:2503.19878
- 2025-03-01 · Post-training an LLM for RAG? Train on Self- Generated Demonstrations · arXiv:2502.10596
- 2025-06-29 · RAG and RAU: A Survey on Retrieval - Augmented Language Model in Natural Language Processing · arXiv:2404.19543
- 2025-05-19 · Automating construction contract review using knowledge graph-enhanced large language models · arXiv:2309.12132
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
- 2026-11-15 · Generative AI-Driven Parametric Design Optimization Framework for Vehicle Closure Systems · arXiv:2611.20451
- 2026-11-02 · Characterizing Adversarial GEO via Implicit Brand Injection · arXiv:2611.04005
- 2026-10-31 · Do GEO Gains Survive the Live Web? Evaluating In-the-Wild Visibility Gains of Generative Engine Optimization via LIVE-GEO · arXiv:2611.01126

## 被常引但不在语料里（下一轮的查询）

- (6 篇引) Evaluating verifiability in generative search engines. · 2023 · arXiv:2304.09848
- (5 篇引) Browsecomp-plus: A more fair and transparent evaluation benchmark of deep-research agent. · 2025 · arXiv:2508.06600
- (5 篇引) WebGPT: Browser-assisted question-answering with human feedback. · 2021 · arXiv:2112.09332
- (5 篇引) Toolformer: Language models can teach themselves to use tools. · 2023
- (5 篇引) Self-Refine: Iterative refinement with self-feedback. · 2023
- (4 篇引) Researchrubrics: A benchmark of prompts and rubrics for evaluating deep research agents. · 2025 · arXiv:2511.07685
- (4 篇引) Search-o1: Agentic search-enhanced large reasoning models. · 2025 · arXiv:2501.05366
- (4 篇引) Chain of thought prompting elicits reasoning in large language models. · 2022 · arXiv:2201.11903
- (4 篇引) DeepResearcher: Scaling deep research via reinforcement learning in real-world environments. · 2025 · arXiv:2504.03160
- (4 篇引) Reflexion: language agents with verbal reinforcement learning. · 2023
- (4 篇引) The AI scientist: Towards fully automated open-ended scientific discovery. · 2024 · arXiv:2408.06292
- (4 篇引) Introducing deep research. · 2025
- (4 篇引) MMMU: a massive multi-discipline multimodal understanding and reasoning benchmark for expert AGI · 2024
- (4 篇引) GAIA: a benchmark for general AI assistants. · 2024 · arXiv:2311.12983
- (4 篇引) WebArena: A realistic web environment for building autonomous agents. · 2024
- (4 篇引) Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. · 2023
- (4 篇引) Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions. · 2023 · arXiv:2212.10509
- (4 篇引) Large Language Models Cannot Self-Correct Reasoning Yet. · 2024 · arXiv:2310.01798
- (4 篇引) Lost in the Middle: How Language Models Use Long Contexts. · 2024
- (4 篇引) Deepseek-v4: Towards highly efficient million-token context intelligence. · 2026 · arXiv:2606.19348
- (4 篇引) Glm-5: from vibe coding to agentic engineering. · 2026 · arXiv:2602.15763
- (4 篇引) Self-rag: Learning to retrieve, generate, and critique through self-reflection. · 2024
- (3 篇引) Cochrane handbook for systematic reviews of interventions. · 2019
- (3 篇引) The PRISMA 2020 statement: an updated guideline for reporting systematic reviews. · 2020
- (3 篇引) The AI scientist-v2: Workshop-level automated scientific discovery via agentic tree search. · 2025 · arXiv:2504.08066
- (3 篇引) WebThinker: Empowering large reasoning models with deep research capability. · 2026
- (3 篇引) Webshop: Towards scalable real-world web interaction with grounded language agents. · 2022 · arXiv:2207.01206
- (3 篇引) WebSailor: Navigating super-human reasoning for web agent. · 2025 · arXiv:2507.02592
- (3 篇引) Mind2Web 2: evaluating agentic search with agent-as-a-judge · 2025 · arXiv:2506.21506
- (3 篇引) Fever: a large-scale dataset for fact extraction and verification. · 2018 · arXiv:1803.05355
- (3 篇引) R1-Searcher: Incentivizing the Search Capability in LLMs via Reinforcement Learning. · 2025 · arXiv:2503.05592
- (3 篇引) Hotpotqa: A dataset for diverse, explainable multi-hop question answering. · 2018 · arXiv:1809.09600
- (3 篇引) Introducing perplexity deep research. · 2025
- (3 篇引) Measuring and narrowing the compositionality gap in language models. · 2023
- (3 篇引) τ \tau -bench: a benchmark for tool-agent-user interaction in real-world domains · 2024 · arXiv:2406.12045
- (3 篇引) Direct Preference Optimization: Your Language Model is Secretly a Reward Model. · 2024
- (3 篇引) MMBench: is your multi-modal model an all-around player? · 2024
- (3 篇引) DocVQA: a dataset for vqa on document images · 2021
- (3 篇引) AlphaEvolve: A coding agent for scientific and algorithmic discovery. · 2025 · arXiv:2506.13131
- (3 篇引) Mind2Web: Towards a generalist agent for the web. · 2023

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 2.8 | 2023 | 1 | ReAct : Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 5.1 | 2026 | 1 | LR-Robot: A Unified Supervised Intelligent Framework for Real-Time Systematic Literature Reviews wit | 2603.17723 |
| 3.6 | 2025 | 1 | GRADE: Generating multi-hop QA and fine-gRAined Difficulty matrix for RAG Evaluation | 2508.16994 |
| 3.6 | 2025 | 1 | Test-time Corpus Feedback: From Retrieval to RAG | 2508.15437 |
| 3.6 | 2026 | 1 | From Ambiguity to Accuracy: The Transformative Effect of Coreference Resolution on Retrieval - Augme | 2507.07847 |
| 3.6 | 2025 | 1 | Multilingual Retrieval - Augmented Generation for Knowledge - Intensive Task | 2504.03616 |
| 3.6 | 2025 | 1 | An Analysis of Decoding Methods for LLM-based Agents for Faithful Multi-Hop Question Answering | 2503.23415 |
| 3.6 | 2025 | 1 | CausalRAG: Integrating Causal Graphs into Retrieval - Augmented Generation | 2503.19878 |
| 3.6 | 2025 | 1 | Post-training an LLM for RAG? Train on Self- Generated Demonstrations | 2502.10596 |
| 2.8 | 2024 | 1 | Domain-Specific Retrieval - Augmented Generation Using Vector Stores, Knowledge Graphs, and Tensor F | 2410.02721 |
| 3.9 | 2024 | 1 | TongGu: Mastering Classical Chinese Understanding with Knowledge -Grounded Large Language Models | 2407.03937 |
| 2.8 | 2024 | 1 | BiomedRAG: A Retrieval Augmented Large Language Model for Biomedicine | 2405.00465 |
| 4.0 | 2025 | 1 | RAG and RAU: A Survey on Retrieval - Augmented Language Model in Natural Language Processing | 2404.19543 |
| 3.9 | 2024 | 1 | HaluEval-Wild: Evaluating Hallucinations of Language Models in the Wild | 2403.04307 |
| 2.8 | 2024 | 1 | Accelerating Retrieval - Augmented Language Model Serving with Speculation | 2401.14021 |
| 3.2 | 2024 | 1 | A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Quest | 2311.05232 |
| 4.0 | 2025 | 1 | Automating construction contract review using knowledge graph-enhanced large language models | 2309.12132 |
| 2.8 | 2023 | 1 | Meta-training with Demonstration Retrieval for Efficient Few-shot Learning | 2307.00119 |
| 3.9 | 2023 | 1 | Recitation- Augmented Language Models | 2210.01296 |
| 2.1 | 2022 | 1 | Evidentiality-guided Generation for Knowledge - Intensive NLP Tasks | 2112.08688 |
| 2.1 | 2021 | 1 | Retrieval - Augmented Generation for Knowledge - Intensive NLP Tasks | 2005.11401 |
| 4.7 | 2026 | 1 | Automatic bioinformatic software named entity recognition from literature | 2608.19201 |
| 4.7 | 2026 | 1 | Multi-Persona Debate System for Automated Scientific Hypothesis Generation | 2605.23917 |
| 3.6 | 2026 | 1 | CoAuthorAI: A Human in the Loop System For Scientific Book Writing | 2604.19772 |
| 4.7 | 2026 | 1 | Grounded Multimodal Retrieval-Augmented Drafting of Radiology Impressions Using Case-Based Similarit | 2603.17765 |
| 3.6 | 2026 | 1 | Retrieval Augmented Generation of Literature-derived Polymer Knowledge: The Example of a Biodegradab | 2602.16650 |
| 5.8 | 2026 | 1 | sui-1: Grounded and Verifiable Long-Form Summarization | 2601.08472 |
| 5.8 | 2025 | 1 | Citation -Grounded Code Comprehension: Preventing LLM Hallucination Through Hybrid Retrieval and Gra | 2512.12117 |
| 5.8 | 2025 | 1 | SemanticCite: Citation Verification with AI-Powered Full- Text Analysis and Evidence-Based Reasoning | 2511.16198 |
| 3.6 | 2025 | 1 | SQuAI: Scientific Question-Answering with Multi-Agent Retrieval-Augmented Generation | 2510.15682 |
| 3.6 | 2026 | 1 | SciTrek: Evaluating and Improving Long-Context Numerical Reasoning over Scientific Articles | 2509.21028 |
| 3.6 | 2026 | 1 | From Nodes to Narratives: Explaining Graph Neural Networks with LLMs and Graph Context | 2508.07117 |
| 3.6 | 2025 | 1 | eSapiens: A Real-World NLP Framework for Multimodal Document Understanding and Enterprise Knowledge  | 2506.16768 |
| 3.6 | 2026 | 1 | Graph-KV: Breaking Sequence via Injecting Structural Biases into Large Language Models | 2506.07334 |
| 3.6 | 2026 | 1 | Towards A Universal Graph Structural Encoder | 2504.10917 |
| 3.6 | 2025 | 1 | YourBench: Easy Custom Evaluation Sets for Everyone | 2504.01833 |
| 4.7 | 2025 | 1 | ChartCitor: Multi-Agent Framework for Fine-Grained Chart Visual Attribution | 2502.00989 |
| 3.2 | 2024 | 1 | Graph Learning in the Era of LLMs: A Survey from the Perspective of Data, Models , and Tasks | 2412.12456 |
| 3.9 | 2024 | 1 | LongCite: Enabling LLMs to Generate Fine-grained Citations in Long-context QA | 2409.02897 |
| 4.3 | 2024 | 1 | pathfinder: A Semantic Framework for Literature Review and Knowledge Discovery in Astronomy | 2408.01556 |
| 3.6 | 2025 | 1 | GRAG: Graph Retrieval-Augmented Generation | 2405.16506 |
| 2.8 | 2024 | 1 | On the Evaluation of Machine- Generated Reports | 2405.00982 |
| 2.8 | 2024 | 1 | One for All: Towards Training One Graph Model for All Classification Tasks | 2310.00149 |
| 3.9 | 2023 | 1 | Enabling Large Language Models to Generate Text with Citations | 2305.14627 |
| 3.6 | 2026 | 1 | Generative AI-Driven Parametric Design Optimization Framework for Vehicle Closure Systems | 2611.20451 |
| 3.6 | 2026 | 1 | Characterizing Adversarial GEO via Implicit Brand Injection | 2611.04005 |
| 3.6 | 2026 | 1 | Do GEO Gains Survive the Live Web? Evaluating In-the-Wild Visibility Gains of Generative Engine Opti | 2611.01126 |
| 3.6 | 2026 | 1 | ODAT-SE: A modular and parallel framework for simulation-based inverse problems | 2610.36746 |
| 3.6 | 2026 | 1 | OrbitTAMP: Grounding Language Models for Task and Motion Planning in Spacecraft Rendezvous | 2610.01093 |
| 4.7 | 2026 | 1 | Efficient Dense Vector Search within Knowledge Graph Content Embeddings | 2609.24236 |
| 4.7 | 2026 | 1 | CITECHOICE: A Causal Audit of How Document Presentation Redistributes Citation Credit in Agentic Sea | 2609.15164 |
| 3.6 | 2026 | 1 | Deep-Fake CAPTCHA: Mitigating Next- Generation Social Engineering Attacks | 2609.11404 |
| 3.6 | 2026 | 1 | Evaluating Deep- Search Agents under Hierarchical Web Evidence Poisoning | 2609.06027 |
| 3.6 | 2026 | 1 | Counter-GEO-Bench: Evaluating Defenses Against Information-Distorting Generative Engine Optimization | 2609.02316 |
| 3.6 | 2026 | 1 | GEO-Flag: Detecting and Measuring GEO-Optimized Web Content | 2608.16824 |
| 3.6 | 2026 | 1 | The Specification Paradox: Rethinking Requirements Engineering in the Age of AI | 2608.16618 |
| 3.6 | 2026 | 1 | Designing Agent-Ready Websites for AI Web Agents: A Framework for Machine Readability, Actionability | 2607.12056 |
| 3.6 | 2026 | 1 | Breaking the Evaluation Paradox: Evaluating High-Entropy Search with Computationally Irreducible Con | 2606.22783 |
| 3.6 | 2026 | 1 | ENPIRE: Agentic Robot Policy Self-Improvement in the Real World | 2606.19980 |
| 4.7 | 2026 | 1 | Verifiable User Simulation for Search and Recommendation Systems | 2606.14474 |
| 3.6 | 2026 | 1 | Toward Generalist Autonomous Research via Hypothesis-Tree Refinement | 2606.11926 |
| 4.7 | 2026 | 1 | APEX: Automated Prompt Engineering eXpert with Dynamic Data Selection | 2606.11459 |
| 3.6 | 2026 | 1 | ATLAS: Agentic Test-time Learning-to-Allocate Scaling | 2606.01667 |
| 3.6 | 2026 | 1 | Validating Navmesh using Geometry: Voxel-Based Analysis with Prioritized Exploration | 2605.21397 |
| 3.6 | 2026 | 1 | EcoGEO: Trajectory-Aware Evidence Ecosystems for Web-Enabled LLM Search Agents | 2605.12887 |
| 5.1 | 2026 | 1 | LLM4Log: A Systematic Review of Large Language Model-based Log Analysis | 2604.16359 |
| 4.7 | 2026 | 1 | Frontier-Eng: Benchmarking Self-Evolving Agents on Real-World Engineering Tasks with Generative Opti | 2604.12290 |
| 3.6 | 2026 | 1 | AVO: Agentic Variation Operators for Autonomous Evolutionary Search | 2603.24517 |
| 3.6 | 2026 | 1 | KARL: Knowledge Agents via Reinforcement Learning | 2603.05218 |
| 3.6 | 2026 | 1 | EGSS: Entropy-guided Stepwise Scaling for Reliable Software Engineering | 2602.05242 |
| 4.7 | 2026 | 1 | Unifying Ranking and Generation in Query Auto-Completion via Retrieval-Augmented Generation and Mult | 2602.01023 |
| 4.7 | 2026 | 1 | OpenNovelty: An LLM-powered Agentic System for Verifiable Scholarly Novelty Assessment | 2601.01576 |
| 3.6 | 2025 | 1 | BOAD: Discovering Hierarchical Software Engineering Agents via Bandit Optimization | 2512.23631 |
| 5.1 | 2025 | 1 | Deep Research: A Systematic Survey | 2512.02038 |
| 3.6 | 2025 | 1 | SkyRL-Agent: Efficient RL Training for Multi-turn LLM Agent | 2511.16108 |
| 4.7 | 2026 | 1 | Inverse Knowledge Search over Verifiable Reasoning: Synthesizing a Scientific Encyclopedia from a Lo | 2510.26854 |
| 4.7 | 2026 | 1 | SpotIt: Evaluating Text-to-SQL Evaluation with Formal Verification | 2510.26840 |
| 3.6 | 2025 | 1 | Code World Models for General Game Playing | 2510.04542 |
| 4.7 | 2025 | 1 | Hybrid Reward Normalization for Process-supervised Non- verifiable Agentic Tasks | 2509.25598 |
| 3.6 | 2025 | 1 | A Knowledge Graph and a Tripartite Evaluation Framework Make Retrieval-Augmented Generation Scalable | 2509.19209 |

## 读不到全文的（诚实记录）

- arXiv:2501.05468 — HTTP 404
- arXiv:2610.32285 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2608.28612 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2411.02426 — HTTP 404
- arXiv:2603.17723 — HTTP 404

_生成于 2026-11-22T13:37:29.670Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_