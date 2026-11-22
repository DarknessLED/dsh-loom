# R5 编排与人机：审批闸门、自主度、监督与责任

- 检索：17 条查询（每条最多 2 页 × 50）→ 669 个不同候选，保留 267
- 回溯：读通 50 篇全文的参考文献，共 2868 条引用（11 篇无可用 HTML）
- 语料内被引：133 个工作被本语料至少两篇论文引用；被引最多的是 13 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 13 | 24 | 2022 | Training language models to follow instructions with human feedback,. | — |
| 8 | 13 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. | — |
| 8 | 11 | 2022 | Constitutional AI: Harmlessness from AI Feedback. | 2212.08073 |
| 7 | 14 | 2022 | Measuring progress on scalable oversight for large language models. | 2211.03540 |
| 7 | 9 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. | — |
| 6 | 38 | 2024 | Debating with more persuasive llms leads to more truthful answers. | 2402.06782 |
| 6 | 20 | 2018 | Ai safety via debate. | 1805.00899 |
| 6 | 13 | 2023 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. | 2312.09390 |
| 6 | 11 | 2025 | Qwen3 technical report. | 2505.09388 |
| 6 | 10 | 2018 | Supervising strong learners by amplifying weak experts. | 1810.08575 |
| 6 | 10 | 2024 | DeepSeekMath: pushing the limits of mathematical reasoning in open language models | 2402.03300 |
| 6 | 9 | 2016 | Concrete problems in AI safety. | 1606.06565 |
| 6 | 9 | 2017 | Deep Reinforcement Learning from Human Preferences. | 1706.03741 |
| 6 | 9 | 2022 | Self-critiquing models for assisting human evaluators. | 2206.05802 |
| 6 | 8 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. | 2201.11903 |
| 5 | 16 | 2023 | Artificial intelligence risk management framework (ai rmf 1.0). | — |
| 5 | 10 | 2018 | Scalable agent alignment via reward modeling: a research direction. | 1811.07871 |
| 5 | 8 | 2022 | Training a helpful and harmless assistant with reinforcement learning from human feedback. | 2204.05862 |
| 5 | 6 | 2023 | GPQA: A graduate-level Google-proof Q&A benchmark. | 2311.12022 |
| 5 | 6 | 2024 | The llama 3 herd of models. | 2407.21783 |
| 5 | 5 | 2023 | Gemini: A family of highly capable multimodal models. | 2312.11805 |
| 5 | 5 | 2021 | Truthfulqa: Measuring how models mimic human falsehoods. | 2109.07958 |
| 4 | 11 | 2024 | On scalable oversight with weak llms judging strong llms. | — |
| 4 | 11 | 2023 | Debate helps supervise unreliable experts. | 2311.08702 |
| 4 | 8 | 2022 | QuALITY: Question answering with long input texts, yes! | 2112.08608 |
| 4 | 6 | 2020 | Measuring massive multitask language understanding,. | 2009.03300 |
| 4 | 5 | 2025 | Deepseek-r1: Incentivizing reasoning capability in llms via reinforcement learning. | 2501.12948 |
| 4 | 4 | 2017 | Proximal policy optimization algorithms. | 1707.06347 |
| 4 | 4 | 2024 | Toolformer: Language models can teach themselves to use tools. | 2302.04761 |
| 4 | 4 | 2020 | Learning to summarize with human feedback. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 24 | 13 | 2022 | Training language models to follow instructions with human feedback,. |
| 13 | 8 | 2023 | Direct Preference Optimization: Your Language Model is Secretly a Reward Model. |
| 11 | 8 | 2022 | Constitutional AI: Harmlessness from AI Feedback. |
| 14 | 7 | 2022 | Measuring progress on scalable oversight for large language models. |
| 9 | 7 | 2023 | Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. |
| 38 | 6 | 2024 | Debating with more persuasive llms leads to more truthful answers. |
| 20 | 6 | 2018 | Ai safety via debate. |
| 13 | 6 | 2023 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. |
| 11 | 6 | 2025 | Qwen3 technical report. |
| 10 | 6 | 2018 | Supervising strong learners by amplifying weak experts. |
| 10 | 6 | 2024 | DeepSeekMath: pushing the limits of mathematical reasoning in open language models |
| 9 | 6 | 2016 | Concrete problems in AI safety. |
| 9 | 6 | 2017 | Deep Reinforcement Learning from Human Preferences. |
| 9 | 6 | 2022 | Self-critiquing models for assisting human evaluators. |
| 8 | 6 | 2022 | Chain-of-thought prompting elicits reasoning in large language models. |
| 16 | 5 | 2023 | Artificial intelligence risk management framework (ai rmf 1.0). |
| 10 | 5 | 2018 | Scalable agent alignment via reward modeling: a research direction. |
| 8 | 5 | 2022 | Training a helpful and harmless assistant with reinforcement learning from human feedback. |
| 6 | 5 | 2023 | GPQA: A graduate-level Google-proof Q&A benchmark. |
| 6 | 5 | 2024 | The llama 3 herd of models. |
| 5 | 5 | 2023 | Gemini: A family of highly capable multimodal models. |
| 5 | 5 | 2021 | Truthfulqa: Measuring how models mimic human falsehoods. |
| 11 | 4 | 2024 | On scalable oversight with weak llms judging strong llms. |
| 11 | 4 | 2023 | Debate helps supervise unreliable experts. |
| 8 | 4 | 2022 | QuALITY: Question answering with long input texts, yes! |
| 6 | 4 | 2020 | Measuring massive multitask language understanding,. |
| 5 | 4 | 2025 | Deepseek-r1: Incentivizing reasoning capability in llms via reinforcement learning. |
| 4 | 4 | 2017 | Proximal policy optimization algorithms. |
| 4 | 4 | 2024 | Toolformer: Language models can teach themselves to use tools. |
| 4 | 4 | 2020 | Learning to summarize with human feedback. |

## 各细分方向的开篇（按语料内最早一篇）

- **approval gates & oversight**（81 篇，最早 2022-11-11）Measuring Progress on Scalable Oversight for Large Language Models · arXiv:2211.03540
- **accountability & policy**（32 篇，最早 2021-10-11）Auditing Robot Learning for Safety and Compliance during Deployment · arXiv:2110.05702
- **autonomy levels**（28 篇，最早 2023-06-12）Towards Fair and Explainable AI using a Human-Centered AI Approach · arXiv:2306.07427
- **escalation & uncertainty**（12 篇，最早 2026-02-02）Constrained Process Maps for Multi-Agent Generative AI Workflows · arXiv:2602.02034
- **automation bias / complacency**（3 篇，最早 2026-05-05）What is Human in Judgment? Comparing Automation Bias and Algorithm Aversion Between the United States Military · arXiv:2604.04333

## 最近的 SOTA（近两年）

- 2026-11-17 · Fly as Instructed : Refining World-Action Policies for UAV Vision- Language Navigation · arXiv:2611.22883
- 2026-09-08 · AuK Technical Report: An Open-Source Foundational Model for Speech Generation and Editing · arXiv:2609.08936
- 2026-07-25 · Improving Text-to-Audio Instruction Following via Fine-Grained Feedback from Audio-Aware Large Language Models · arXiv:2607.13408
- 2026-06-25 · Qwen-Image-2.0-RL Technical Report · arXiv:2606.27608
- 2026-04-28 · A Systematic Post- Train Framework for Video Generation · arXiv:2604.25427
- 2026-04-27 · RbtAct: Rebuttal as Supervision for Actionable Review Feedback Generation · arXiv:2603.09723
- 2026-06-28 · Pushing Forward Pareto Frontiers of Proactive Agents with Behavioral Agentic Optimization · arXiv:2602.11351
- 2026-02-06 · R-Align: Enhancing Generative Reward Models through Rationale-Centric Meta-Judging · arXiv:2602.06763
- 2026-02-11 · StatLLaMA: Multi-Stage training for domain-optimized statistical large language models · arXiv:2601.09718
- 2026-01-07 · Can LLMs Track Their Output Length? A Dynamic Feedback Mechanism for Precise Length Regulation · arXiv:2601.01768
- 2026-01-01 · W2S-AlignTree: Weak-to-Strong Inference-Time Alignment for Large Language Models via Monte Carlo Tree Search · arXiv:2511.11518
- 2025-10-03 · Reward Model Routing in Alignment · arXiv:2510.02850
- 2025-09-29 · The Era of Real-World Human Interaction: RL from User Conversations · arXiv:2509.25137
- 2025-09-20 · Automated Procedural Analysis via Video- Language Models for AI-assisted Nursing Skills Assessment · arXiv:2509.16810
- 2025-08-29 · Balanced Actor Initialization: Stable RLHF Training of Distillation-Based Reasoning Models · arXiv:2509.00309
- 2026-04-24 · Learning from Natural Language Feedback for Personalized Question Answering · arXiv:2508.10695
- 2025-08-07 · CodeBoost: Boosting Code LLMs by Squeezing Knowledge from Code Snippets with RL · arXiv:2508.05242
- 2025-07-08 · Differentiable Reward Optimization for LLM based TTS system · arXiv:2507.05911
- 2025-05-28 · LaMDAgent: An Autonomous Framework for Post- Training Pipeline Optimization via LLM Agents · arXiv:2505.21963
- 2025-05-26 · RFTF: Reinforcement Fine-tuning for Embodied Agents with Temporal Feedback · arXiv:2505.19767
- 2025-05-24 · ManipLVM-R1: Reinforcement Learning for Reasoning in Embodied Manipulation with Large Vision- Language Models · arXiv:2505.16517
- 2025-10-24 · HelpSteer3-Preference: Open Human -Annotated Preference Data across Diverse Tasks and Languages · arXiv:2505.11475
- 2025-03-23 · Vision-R1: Evolving Human -Free Alignment in Large Vision- Language Models via Vision-Guided Reinforcement Learning · arXiv:2503.18013
- 2025-02-25 · TextGames: Learning to Self-Play Text-Based Puzzle Games via Language Model Reasoning · arXiv:2502.18431
- 2025-10-11 · Beyond Sample-Level Feedback : Using Reference-Level Feedback to Guide Data Synthesis · arXiv:2502.04511
- 2025-05-19 · Disentangling Length Bias In Preference Learning Via Response-Conditioned Modeling · arXiv:2502.00814
- 2025-01-14 · Iterative Label Refinement Matters More than Preference Optimization under Weak Supervision · arXiv:2501.07886
- 2025-05-30 · AlphaPO: Reward Shape Matters for LLM Alignment · arXiv:2501.03884
- 2025-01-23 · Cross-lingual Transfer of Reward Models in Multilingual Alignment · arXiv:2410.18027
- 2025-09-17 · VLM Agents Generate Their Own Memories: Distilling Experience into Embodied Programs of Thought · arXiv:2406.14596

## 被常引但不在语料里（下一轮的查询）

- (13 篇引) Training language models to follow instructions with human feedback,. · 2022
- (8 篇引) Direct Preference Optimization: Your Language Model is Secretly a Reward Model. · 2023
- (7 篇引) Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. · 2023
- (6 篇引) Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. · 2023 · arXiv:2312.09390
- (6 篇引) Qwen3 technical report. · 2025 · arXiv:2505.09388
- (6 篇引) DeepSeekMath: pushing the limits of mathematical reasoning in open language models · 2024 · arXiv:2402.03300
- (6 篇引) Deep Reinforcement Learning from Human Preferences. · 2017 · arXiv:1706.03741
- (6 篇引) Chain-of-thought prompting elicits reasoning in large language models. · 2022 · arXiv:2201.11903
- (5 篇引) Artificial intelligence risk management framework (ai rmf 1.0). · 2023
- (5 篇引) Scalable agent alignment via reward modeling: a research direction. · 2018 · arXiv:1811.07871
- (5 篇引) Training a helpful and harmless assistant with reinforcement learning from human feedback. · 2022 · arXiv:2204.05862
- (5 篇引) GPQA: A graduate-level Google-proof Q&A benchmark. · 2023 · arXiv:2311.12022
- (5 篇引) The llama 3 herd of models. · 2024 · arXiv:2407.21783
- (5 篇引) Gemini: A family of highly capable multimodal models. · 2023 · arXiv:2312.11805
- (5 篇引) Truthfulqa: Measuring how models mimic human falsehoods. · 2021 · arXiv:2109.07958
- (4 篇引) Debate helps supervise unreliable experts. · 2023 · arXiv:2311.08702
- (4 篇引) QuALITY: Question answering with long input texts, yes! · 2022 · arXiv:2112.08608
- (4 篇引) Measuring massive multitask language understanding,. · 2020 · arXiv:2009.03300
- (4 篇引) Deepseek-r1: Incentivizing reasoning capability in llms via reinforcement learning. · 2025 · arXiv:2501.12948
- (4 篇引) Proximal policy optimization algorithms. · 2017 · arXiv:1707.06347
- (4 篇引) Toolformer: Language models can teach themselves to use tools. · 2024 · arXiv:2302.04761
- (4 篇引) Learning to summarize with human feedback. · 2020
- (4 篇引) Fine-tuning language models from human preferences · 2019 · arXiv:1909.08593
- (3 篇引) Automation bias: a systematic review of frequency, effect mediators, and mitigators · 2012
- (3 篇引) Language models are few-shot learners. · 2020
- (3 篇引) Automation bias and Verification Complexity: A systematic review · 2016
- (3 篇引) Easy-to-hard generalization: scalable alignment beyond human supervision · 2024
- (3 篇引) GPT-4 Technical Report · 2024 · arXiv:2303.08774
- (3 篇引) Big data’s disparate impact. · 2016
- (3 篇引) Flow-grpo: Training flow matching models via online rl. · 2025 · arXiv:2505.05470
- (3 篇引) Improving factuality and reasoning in language models through multiagent debate. · 2024 · arXiv:2305.14325
- (3 篇引) Ai safety via market making. · 2020
- (3 篇引) Llama 2: Open Foundation and Fine-Tuned Chat Models. · 2023 · arXiv:2307.09288
- (3 篇引) On calibration of modern neural networks. · 2017 · arXiv:1706.04599
- (3 篇引) LoRA: Low-rank adaptation of large language models. · 2022
- (3 篇引) Flow matching for generative modeling. · 2023 · arXiv:2210.02747
- (3 篇引) Let’s verify step by step. · 2024
- (3 篇引) Self-consistency improves chain of thought reasoning in language models · 2023 · arXiv:2203.11171
- (3 篇引) Risks from Learned Optimization in Advanced Machine Learning Systems. · 1906 · arXiv:1906.01820
- (3 篇引) Training verifiers to solve math word problems. · 2021 · arXiv:2110.14168

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 3.6 | 2026 | 1 | Fly as Instructed : Refining World-Action Policies for UAV Vision- Language Navigation | 2611.22883 |
| 3.6 | 2026 | 1 | AuK Technical Report: An Open-Source Foundational Model for Speech Generation and Editing | 2609.08936 |
| 3.6 | 2026 | 1 | Improving Text-to-Audio Instruction Following via Fine-Grained Feedback from Audio-Aware Large Langu | 2607.13408 |
| 3.6 | 2026 | 1 | Qwen-Image-2.0-RL Technical Report | 2606.27608 |
| 3.6 | 2026 | 1 | A Systematic Post- Train Framework for Video Generation | 2604.25427 |
| 5.1 | 2026 | 1 | RbtAct: Rebuttal as Supervision for Actionable Review Feedback Generation | 2603.09723 |
| 3.6 | 2026 | 1 | Pushing Forward Pareto Frontiers of Proactive Agents with Behavioral Agentic Optimization | 2602.11351 |
| 3.6 | 2026 | 1 | R-Align: Enhancing Generative Reward Models through Rationale-Centric Meta-Judging | 2602.06763 |
| 4.7 | 2026 | 1 | StatLLaMA: Multi-Stage training for domain-optimized statistical large language models | 2601.09718 |
| 3.6 | 2026 | 1 | Can LLMs Track Their Output Length? A Dynamic Feedback Mechanism for Precise Length Regulation | 2601.01768 |
| 3.6 | 2026 | 1 | W2S-AlignTree: Weak-to-Strong Inference-Time Alignment for Large Language Models via Monte Carlo Tre | 2511.11518 |
| 3.6 | 2025 | 1 | Reward Model Routing in Alignment | 2510.02850 |
| 3.6 | 2025 | 1 | The Era of Real-World Human Interaction: RL from User Conversations | 2509.25137 |
| 3.6 | 2025 | 1 | Automated Procedural Analysis via Video- Language Models for AI-assisted Nursing Skills Assessment | 2509.16810 |
| 3.6 | 2025 | 1 | Balanced Actor Initialization: Stable RLHF Training of Distillation-Based Reasoning Models | 2509.00309 |
| 3.6 | 2026 | 1 | Learning from Natural Language Feedback for Personalized Question Answering | 2508.10695 |
| 3.6 | 2025 | 1 | CodeBoost: Boosting Code LLMs by Squeezing Knowledge from Code Snippets with RL | 2508.05242 |
| 3.6 | 2025 | 1 | Differentiable Reward Optimization for LLM based TTS system | 2507.05911 |
| 3.6 | 2025 | 1 | LaMDAgent: An Autonomous Framework for Post- Training Pipeline Optimization via LLM Agents | 2505.21963 |
| 3.6 | 2025 | 1 | RFTF: Reinforcement Fine-tuning for Embodied Agents with Temporal Feedback | 2505.19767 |
| 3.6 | 2025 | 1 | ManipLVM-R1: Reinforcement Learning for Reasoning in Embodied Manipulation with Large Vision- Langua | 2505.16517 |
| 3.6 | 2025 | 1 | HelpSteer3-Preference: Open Human -Annotated Preference Data across Diverse Tasks and Languages | 2505.11475 |
| 3.6 | 2025 | 1 | Vision-R1: Evolving Human -Free Alignment in Large Vision- Language Models via Vision-Guided Reinfor | 2503.18013 |
| 3.6 | 2025 | 1 | TextGames: Learning to Self-Play Text-Based Puzzle Games via Language Model Reasoning | 2502.18431 |
| 3.6 | 2025 | 1 | Beyond Sample-Level Feedback : Using Reference-Level Feedback to Guide Data Synthesis | 2502.04511 |
| 3.6 | 2025 | 1 | Disentangling Length Bias In Preference Learning Via Response-Conditioned Modeling | 2502.00814 |
| 3.6 | 2025 | 1 | Iterative Label Refinement Matters More than Preference Optimization under Weak Supervision | 2501.07886 |
| 3.6 | 2025 | 1 | AlphaPO: Reward Shape Matters for LLM Alignment | 2501.03884 |
| 2.8 | 2024 | 1 | Align Anything: Training All-Modality Models to Follow Instructions with Language Feedback | 2412.15838 |
| 2.8 | 2024 | 1 | T-REG: Preference Optimization with Token-Level Reward Regularization | 2412.02685 |
| 3.6 | 2025 | 1 | Cross-lingual Transfer of Reward Models in Multilingual Alignment | 2410.18027 |
| 2.8 | 2024 | 1 | Rewriting Conversational Utterances with Instructed Large Language Models | 2410.07797 |
| 2.8 | 2024 | 1 | CS4: Measuring the Creativity of Large Language Models Automatically by Controlling the Number of St | 2410.04197 |
| 2.8 | 2024 | 1 | The Perfect Blend: Redefining RLHF with Mixture of Judges | 2409.20370 |
| 2.8 | 2024 | 1 | Meta-Rewarding Language Models : Self-Improving Alignment with LLM-as-a-Meta-Judge | 2407.19594 |
| 2.8 | 2024 | 1 | InstructPatentGPT: Training patent language models to follow instructions with human feedback | 2406.16897 |
| 3.6 | 2025 | 1 | VLM Agents Generate Their Own Memories: Distilling Experience into Embodied Programs of Thought | 2406.14596 |
| 2.8 | 2024 | 1 | Self-play with Execution Feedback : Improving Instruction - following Capabilities of Large Language | 2406.13542 |
| 2.8 | 2024 | 1 | ChatGLM: A Family of Large Language Models from GLM-130B to GLM-4 All Tools | 2406.12793 |
| 2.8 | 2024 | 1 | OPTune: Efficient Online Preference Tuning | 2406.07657 |
| 2.8 | 2024 | 1 | Scalable Ensembling For Mitigating Reward Overoptimisation | 2406.01013 |
| 2.8 | 2024 | 1 | Improving Reward Models with Synthetic Critiques | 2405.20850 |
| 2.8 | 2024 | 1 | InstructionCP: A fast approach to transfer Large Language Models into target language | 2405.20175 |
| 2.8 | 2024 | 1 | Would I Lie To You? Inference Time Alignment of Language Models using Direct Preference Heads | 2405.20053 |
| 3.6 | 2025 | 1 | Triple Preference Optimization: Achieving Better Alignment using a Single Step Optimization | 2405.16681 |
| 2.8 | 2024 | 1 | Impact of Non-Standard Unicode Characters on Security and Comprehension in Large Language Models | 2405.14490 |
| 2.8 | 2024 | 1 | Multimodal Large Language Model is a Human -Aligned Annotator for Text-to-Image Generation | 2404.15100 |
| 3.6 | 2025 | 1 | TeaMs-RL: Teaching LLMs to Generate Better Instruction Datasets via Reinforcement Learning | 2403.08694 |
| 2.8 | 2024 | 1 | DiffChat: Learning to Chat with Text-to-Image Synthesis Models for Interactive Image Creation | 2403.04997 |
| 2.8 | 2024 | 1 | Aligning Modalities in Vision Large Language Models via Preference Fine-tuning | 2402.11411 |
| 3.6 | 2026 | 1 | SIGMA: Self-Improving Alignment Generalization from a Model Spec | 2610.07935 |
| 3.6 | 2026 | 1 | Reverse Constitutional AI : A Framework for Controllable Toxic Data Generation via Probability-Clamp | 2604.17769 |
| 3.6 | 2026 | 1 | Via Negativa for AI Alignment: Why Negative Constraints Are Structurally Superior to Positive Prefer | 2603.16417 |
| 2.8 | 2023 | 1 | Specific versus General Principles for Constitutional AI | 2310.13798 |
| 2.1 | 2022 | 1 | Constitutional AI : Harmlessness from AI Feedback | 2212.08073 |
| 2.8 | 2024 | 1 | Debating with More Persuasive LLMs Leads to More Truthful Answers | 2402.06782 |
| 3.6 | 2026 | 1 | AI Governance Should Prioritize Control and Knowledge Boundaries Over Limiting Intelligence | 2611.12941 |
| 3.6 | 2026 | 1 | Humans Correct Their Judgments Through Debate , but Weaker AI Models Do Not | 2610.28539 |
| 11.6 | 2026 | 1 | AI Safety via Debate is Compromised by Cognitive Biases | 2610.05461 |
| 3.6 | 2026 | 1 | How to Avoid Debate : Scalable AI Safety via Doubly-Efficient Interactive Proofs | 2607.03561 |
| 3.6 | 2026 | 1 | Enhancing Operational Safety via Agentic Dialogue Hazard Identification Analysis | 2606.03812 |
| 6.2 | 2026 | 1 | Make Mechanistic Interpretability Auditable: A Call to Develop Guidelines via Continuous Collaborati | 2606.00033 |
| 3.6 | 2026 | 1 | Clear, Compelling Arguments: Rethinking the Foundations of Frontier AI Safety Cases | 2603.08760 |
| 12.7 | 2026 | 1 | Knowledge Divergence and the Value of Debate for Scalable Oversight | 2603.05293 |
| 3.6 | 2026 | 1 | Debate is efficient with your time | 2602.08630 |
| 3.6 | 2025 | 1 | An alignment safety case sketch based on debate | 2505.03989 |
| 3.6 | 2025 | 1 | Understanding and Mitigating Risks of Generative AI in Financial Services | 2504.20086 |
| 2.8 | 2024 | 1 | Generative AI regulation can learn from social media regulation | 2412.11335 |
| 2.8 | 2024 | 1 | Playing Large Games with Oracles and AI Debate | 2312.04792 |
| 2.8 | 2023 | 1 | Scalable AI Safety via Doubly-Efficient Debate | 2311.14125 |
| 2.8 | 2023 | 1 | Topological Parallax: A Geometric Specification for Deep Perception Models | 2306.11835 |
| 2.1 | 2022 | 1 | Modeling Transformative AI Risks (MTAIR) Project -- Summary Report | 2206.09360 |
| 2.5 | 2020 | 1 | An overview of 11 proposals for building safe advanced AI | 2012.07532 |
| 9.4 | 2018 | 1 | AI safety via debate | 1805.00899 |
| 1.4 | 2018 | 1 | Supervising strong learners by amplifying weak experts | 1810.08575 |
| 4.7 | 2026 | 1 | Food Critic: An Agentic Visualization System for Auditable Restaurant- Safety Reasoning | 2611.15843 |
| 3.6 | 2026 | 1 | AI Alignment Is Neither Solvable nor Sufficient | 2611.13167 |
| 3.6 | 2026 | 1 | Verified Implementation of the Next-gen Borrow Checking Algorithm for Rust via Abstract Interpretati | 2611.06319 |
| 4.7 | 2026 | 1 | When Compliance Data Masquerades as Evaluation: Measurement Validity for Deployed AI Systems | 2609.13642 |
| 3.6 | 2026 | 1 | Thomson: Continual Learning of Frontier Models for SovereignAI | 2608.27147 |

## 读不到全文的（诚实记录）

- arXiv:2502.10036 — HTTP 404
- arXiv:2307.06159 — HTTP 404
- arXiv:2512.04334 — HTTP 404
- arXiv:2502.08255 — HTTP 404
- arXiv:2305.11892 — HTTP 404
- arXiv:2303.05091 — HTTP 404
- arXiv:2603.01202 — HTTP 404
- arXiv:2610.21144 — HTTP 404
- arXiv:2609.15422 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2604.23635 — HTTP 404
- arXiv:2512.10304 — HTTP 404

_生成于 2026-11-22T13:34:59.967Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_