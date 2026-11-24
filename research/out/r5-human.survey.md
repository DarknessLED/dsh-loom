# R5 编排与人机：审批闸门、自主度、监督与责任

- 检索：17 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 672 个不同候选，保留 269
- 回溯：读通 49 篇全文的参考文献，共 3388 条引用（10 篇无可用 HTML）
- 语料内被引：201 个工作被本语料至少两篇论文引用；被引最多的是 13 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 13 | 57 | 2024 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. | 2312.09390 |
| 11 | 47 | 2022 | Training language models to follow instructions with human feedback. | — |
| 10 | 26 | 2022 | Measuring progress on scalable oversight for large language models. | 2211.03540 |
| 10 | 25 | 2018 | AI safety via debate. | 1805.00899 |
| 9 | 21 | 2018 | Scalable agent alignment via reward modeling: a research direction. | 1811.07871 |
| 9 | 20 | 2022 | Constitutional ai: Harmlessness from ai feedback. | 2212.08073 |
| 8 | 15 | 2023 | Deep reinforcement learning from human preferences. | 1706.03741 |
| 8 | 14 | 2016 | Concrete problems in ai safety. | 1606.06565 |
| 7 | 19 | 2018 | Supervising strong learners by amplifying weak experts. | 1810.08575 |
| 7 | 12 | 2020 | Language models are few-shot learners. | — |
| 7 | 12 | 2024 | Quantifying the Gain in Weak-to-Strong Generalization. | 2405.15116 |
| 7 | 9 | 2022 | Self-critiquing models for assisting human evaluators. | 2206.05802 |
| 6 | 21 | 2024 | On scalable oversight with weak LLMs judging strong LLMs. | 2407.04622 |
| 6 | 16 | 2022 | Training a helpful and harmless assistant with reinforcement learning from human feedback. | 2204.05862 |
| 6 | 14 | 2023 | Direct preference optimization: Your language model is secretly a reward model. | 2305.18290 |
| 6 | 8 | 2024 | The llama 3 herd of models. | 2407.21783 |
| 6 | 8 | 2024 | Theoretical analysis of weak-to-strong generalization. | 2405.16043 |
| 6 | 6 | 2024 | Let’s verify step by step. | 2305.20050 |
| 5 | 16 | 2024 | Debating with more persuasive llms leads to more truthful answers. | 2402.06782 |
| 5 | 8 | 2019 | Guidelines for human-AI interaction. | — |
| 5 | 8 | 2024 | Towards understanding sycophancy in language models. | 2310.13548 |
| 5 | 7 | 2020 | Learning to summarize with human feedback. | — |
| 5 | 7 | 2024 | LLM Critics Help Catch LLM Bugs. | 2407.00215 |
| 5 | 6 | 2023 | Gpt-4 technical report. | 2303.08774 |
| 4 | 15 | 1997 | Humans and automation: Use, misuse, disuse, abuse. | — |
| 4 | 12 | 2023 | Debate helps supervise unreliable experts. | 2311.08702 |
| 4 | 10 | 2021 | To trust or to think: cognitive forcing functions can reduce overreliance on AI in AI-assisted decision-maki | — |
| 4 | 8 | 2012 | Automation bias: a systematic review of frequency, effect mediators, and mitigators. | — |
| 4 | 7 | 2025 | Qwen3 technical report | 2505.09388 |
| 4 | 6 | 2023 | Introducing superalignment. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 57 | 13 | 2024 | Weak-to-strong generalization: Eliciting strong capabilities with weak supervision. |
| 47 | 11 | 2022 | Training language models to follow instructions with human feedback. |
| 26 | 10 | 2022 | Measuring progress on scalable oversight for large language models. |
| 25 | 10 | 2018 | AI safety via debate. |
| 21 | 9 | 2018 | Scalable agent alignment via reward modeling: a research direction. |
| 20 | 9 | 2022 | Constitutional ai: Harmlessness from ai feedback. |
| 15 | 8 | 2023 | Deep reinforcement learning from human preferences. |
| 14 | 8 | 2016 | Concrete problems in ai safety. |
| 19 | 7 | 2018 | Supervising strong learners by amplifying weak experts. |
| 12 | 7 | 2020 | Language models are few-shot learners. |
| 12 | 7 | 2024 | Quantifying the Gain in Weak-to-Strong Generalization. |
| 9 | 7 | 2022 | Self-critiquing models for assisting human evaluators. |
| 21 | 6 | 2024 | On scalable oversight with weak LLMs judging strong LLMs. |
| 16 | 6 | 2022 | Training a helpful and harmless assistant with reinforcement learning from human feedback. |
| 14 | 6 | 2023 | Direct preference optimization: Your language model is secretly a reward model. |
| 8 | 6 | 2024 | The llama 3 herd of models. |
| 8 | 6 | 2024 | Theoretical analysis of weak-to-strong generalization. |
| 6 | 6 | 2024 | Let’s verify step by step. |
| 16 | 5 | 2024 | Debating with more persuasive llms leads to more truthful answers. |
| 8 | 5 | 2019 | Guidelines for human-AI interaction. |
| 8 | 5 | 2024 | Towards understanding sycophancy in language models. |
| 7 | 5 | 2020 | Learning to summarize with human feedback. |
| 7 | 5 | 2024 | LLM Critics Help Catch LLM Bugs. |
| 6 | 5 | 2023 | Gpt-4 technical report. |
| 15 | 4 | 1997 | Humans and automation: Use, misuse, disuse, abuse. |
| 12 | 4 | 2023 | Debate helps supervise unreliable experts. |
| 10 | 4 | 2021 | To trust or to think: cognitive forcing functions can reduce overreliance on AI in AI-assisted decis |
| 8 | 4 | 2012 | Automation bias: a systematic review of frequency, effect mediators, and mitigators. |
| 7 | 4 | 2025 | Qwen3 technical report |
| 6 | 4 | 2023 | Introducing superalignment. |

## 各细分方向的开篇（按语料内最早一篇）

- **approval gates & oversight**（115 篇，最早 2016-07-25）Concrete Problems in AI Safety · arXiv:1606.06565
- **accountability & policy**（34 篇，最早 2020-04-29）The Responsibility Quantification (ResQu) Model of Human Interaction with Automation · arXiv:1810.12644
- **autonomy levels**（29 篇，最早 2023-07-12）Reflective Hybrid Intelligence for Meaningful Human Control in Decision-Support Systems · arXiv:2307.06159
- **automation bias / complacency**（21 篇，最早 2022-03-24）Human Response to an AI-Based Decision Support System: A User Study on the Effects of Accuracy and Bias · arXiv:2203.15514
- **escalation & uncertainty**（5 篇，最早 2026-07-05）Agentic SABRE: An Uncertainty -Aware Neuro-Symbolic Multi-Agent Framework for Adaptive Ransomware Detection · arXiv:2607.04292

## 最近的 SOTA（近两年）

- 2026-10-26 · TAC2: Timestamped Audio Captioning as composable functions · arXiv:2610.36568
- 2026-05-12 · The Mechanism of Weak -to- Strong Generalization : Feature Elicitation from Latent Knowledge · arXiv:2605.12908
- 2026-03-22 · Spilling the Beans: Teaching LLMs to Self-Report Their Hidden Objectives · arXiv:2511.06626
- 2026-03-07 · Weak -to- Strong Generalization with Failure Trajectories: A Tree-based Approach to Elicit Optimal Policy in Strong Models · arXiv:2507.18858
- 2026-10-29 · Denoising Mutual Knowledge Distillation in Bi-Directional Multiple Instance Learning · arXiv:2505.12074
- 2025-04-11 · Alice: Proactive Learning with Teacher's Demonstrations for Weak -to- Strong Generalization · arXiv:2504.07316
- 2025-03-06 · How to Mitigate Overfitting in Weak -to- strong Generalization ? · arXiv:2503.04249
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

## 被常引但不在语料里（下一轮的查询）

- (11 篇引) Training language models to follow instructions with human feedback. · 2022
- (8 篇引) Deep reinforcement learning from human preferences. · 2023 · arXiv:1706.03741
- (7 篇引) Language models are few-shot learners. · 2020
- (7 篇引) Quantifying the Gain in Weak-to-Strong Generalization. · 2024 · arXiv:2405.15116
- (7 篇引) Self-critiquing models for assisting human evaluators. · 2022 · arXiv:2206.05802
- (6 篇引) Training a helpful and harmless assistant with reinforcement learning from human feedback. · 2022 · arXiv:2204.05862
- (6 篇引) Direct preference optimization: Your language model is secretly a reward model. · 2023 · arXiv:2305.18290
- (6 篇引) The llama 3 herd of models. · 2024 · arXiv:2407.21783
- (6 篇引) Theoretical analysis of weak-to-strong generalization. · 2024 · arXiv:2405.16043
- (6 篇引) Let’s verify step by step. · 2024 · arXiv:2305.20050
- (5 篇引) Guidelines for human-AI interaction. · 2019
- (5 篇引) Towards understanding sycophancy in language models. · 2024 · arXiv:2310.13548
- (5 篇引) Learning to summarize with human feedback. · 2020
- (5 篇引) LLM Critics Help Catch LLM Bugs. · 2024 · arXiv:2407.00215
- (5 篇引) Gpt-4 technical report. · 2023 · arXiv:2303.08774
- (4 篇引) Humans and automation: Use, misuse, disuse, abuse. · 1997
- (4 篇引) Debate helps supervise unreliable experts. · 2023 · arXiv:2311.08702
- (4 篇引) To trust or to think: cognitive forcing functions can reduce overreliance on AI in AI-assisted decision-making · 2021
- (4 篇引) Automation bias: a systematic review of frequency, effect mediators, and mitigators. · 2012
- (4 篇引) Qwen3 technical report · 2025 · arXiv:2505.09388
- (4 篇引) Introducing superalignment. · 2023
- (4 篇引) Lora: Low-rank adaptation of large language models. · 2022
- (4 篇引) Super (ficial)-alignment: strong models may deceive weak models in weak-to-strong generalization · 2025 · arXiv:2406.11431
- (4 篇引) Weak-to-strong reasoning. · 2024 · arXiv:2407.13647
- (4 篇引) Superintelligence: Paths, dangers, strategies. · 2014
- (4 篇引) Ai control: Improving safety despite intentional subversion. · 2024 · arXiv:2312.06942
- (4 篇引) Distilling the knowledge in a neural network. · 2015 · arXiv:1503.02531
- (4 篇引) Easy-to-hard generalization: Scalable alignment beyond human supervision. · 2024 · arXiv:2403.09472
- (4 篇引) Discovering language model behaviors with model-written evaluations. · 2023 · arXiv:2212.09251
- (4 篇引) Alignment faking in large language models. · 2024 · arXiv:2412.14093
- (4 篇引) MACPO: Weak-to-strong alignment via multi-agent contrastive preference optimization. · 2025 · arXiv:2410.07672
- (3 篇引) Trust in automation: Designing for appropriate reliance. · 2004
- (3 篇引) Generative agents: interactive simulacra of human behavior · 2023
- (3 篇引) Ironies of automation · 1983
- (3 篇引) Risks from learned optimization in advanced machine learning systems. · 2019 · arXiv:1906.01820
- (3 篇引) A model for types and levels of human interaction with automation · 2000
- (3 篇引) Thinking, fast and slow. · 2011
- (3 篇引) Improving alignment of dialogue agents via targeted human judgements. · 2022 · arXiv:2209.14375
- (3 篇引) Does automation bias decision-making? · 1999
- (3 篇引) Rlaif vs. rlhf: Scaling reinforcement learning from human feedback with ai feedback. · 2024 · arXiv:2309.00267

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 3.6 | 2026 | 1 | TAC2: Timestamped Audio Captioning as composable functions | 2610.36568 |
| 3.6 | 2026 | 1 | The Mechanism of Weak -to- Strong Generalization : Feature Elicitation from Latent Knowledge | 2605.12908 |
| 5.8 | 2026 | 1 | Spilling the Beans: Teaching LLMs to Self-Report Their Hidden Objectives | 2511.06626 |
| 4.7 | 2026 | 1 | Weak -to- Strong Generalization with Failure Trajectories: A Tree-based Approach to Elicit Optimal P | 2507.18858 |
| 3.6 | 2026 | 1 | Denoising Mutual Knowledge Distillation in Bi-Directional Multiple Instance Learning | 2505.12074 |
| 5.8 | 2025 | 1 | Alice: Proactive Learning with Teacher's Demonstrations for Weak -to- Strong Generalization | 2504.07316 |
| 4.7 | 2025 | 1 | How to Mitigate Overfitting in Weak -to- strong Generalization ? | 2503.04249 |
| 2.8 | 2023 | 1 | Weak -to- Strong Generalization : Eliciting Strong Capabilities With Weak Supervision | 2312.09390 |
| 3.6 | 2026 | 1 | Fly as Instructed : Refining World-Action Policies for UAV Vision- Language Navigation | 2611.22883 |
| 3.6 | 2026 | 1 | AuK Technical Report: An Open-Source Foundational Model for Speech Generation and Editing | 2609.08936 |
| 3.6 | 2026 | 1 | Improving Text-to-Audio Instruction Following via Fine-Grained Feedback from Audio-Aware Large Langu | 2607.13408 |
| 4.7 | 2026 | 1 | Qwen-Image-2.0-RL Technical Report | 2606.27608 |
| 5.8 | 2026 | 1 | A Systematic Post- Train Framework for Video Generation | 2604.25427 |
| 5.1 | 2026 | 1 | RbtAct: Rebuttal as Supervision for Actionable Review Feedback Generation | 2603.09723 |
| 3.6 | 2026 | 1 | Pushing Forward Pareto Frontiers of Proactive Agents with Behavioral Agentic Optimization | 2602.11351 |
| 4.7 | 2026 | 1 | R-Align: Enhancing Generative Reward Models through Rationale-Centric Meta-Judging | 2602.06763 |
| 4.7 | 2026 | 1 | StatLLaMA: Multi-Stage training for domain-optimized statistical large language models | 2601.09718 |
| 3.6 | 2026 | 1 | Can LLMs Track Their Output Length? A Dynamic Feedback Mechanism for Precise Length Regulation | 2601.01768 |
| 3.6 | 2026 | 1 | W2S-AlignTree: Weak-to-Strong Inference-Time Alignment for Large Language Models via Monte Carlo Tre | 2511.11518 |
| 4.7 | 2025 | 1 | Reward Model Routing in Alignment | 2510.02850 |
| 3.6 | 2025 | 1 | The Era of Real-World Human Interaction: RL from User Conversations | 2509.25137 |
| 3.6 | 2025 | 1 | Automated Procedural Analysis via Video- Language Models for AI-assisted Nursing Skills Assessment | 2509.16810 |
| 4.7 | 2025 | 1 | Balanced Actor Initialization: Stable RLHF Training of Distillation-Based Reasoning Models | 2509.00309 |
| 4.7 | 2026 | 1 | Learning from Natural Language Feedback for Personalized Question Answering | 2508.10695 |
| 3.6 | 2025 | 1 | CodeBoost: Boosting Code LLMs by Squeezing Knowledge from Code Snippets with RL | 2508.05242 |
| 3.6 | 2025 | 1 | Differentiable Reward Optimization for LLM based TTS system | 2507.05911 |
| 3.6 | 2025 | 1 | LaMDAgent: An Autonomous Framework for Post- Training Pipeline Optimization via LLM Agents | 2505.21963 |
| 3.6 | 2025 | 1 | RFTF: Reinforcement Fine-tuning for Embodied Agents with Temporal Feedback | 2505.19767 |
| 3.6 | 2025 | 1 | ManipLVM-R1: Reinforcement Learning for Reasoning in Embodied Manipulation with Large Vision- Langua | 2505.16517 |
| 4.7 | 2025 | 1 | HelpSteer3-Preference: Open Human -Annotated Preference Data across Diverse Tasks and Languages | 2505.11475 |
| 3.6 | 2025 | 1 | Vision-R1: Evolving Human -Free Alignment in Large Vision- Language Models via Vision-Guided Reinfor | 2503.18013 |
| 3.6 | 2025 | 1 | TextGames: Learning to Self-Play Text-Based Puzzle Games via Language Model Reasoning | 2502.18431 |
| 4.7 | 2025 | 1 | Beyond Sample-Level Feedback : Using Reference-Level Feedback to Guide Data Synthesis | 2502.04511 |
| 4.7 | 2025 | 1 | Disentangling Length Bias In Preference Learning Via Response-Conditioned Modeling | 2502.00814 |
| 3.6 | 2025 | 1 | Iterative Label Refinement Matters More than Preference Optimization under Weak Supervision | 2501.07886 |
| 4.7 | 2025 | 1 | AlphaPO: Reward Shape Matters for LLM Alignment | 2501.03884 |
| 2.8 | 2024 | 1 | Align Anything: Training All-Modality Models to Follow Instructions with Language Feedback | 2412.15838 |
| 2.8 | 2024 | 1 | T-REG: Preference Optimization with Token-Level Reward Regularization | 2412.02685 |
| 4.7 | 2025 | 1 | Cross-lingual Transfer of Reward Models in Multilingual Alignment | 2410.18027 |
| 3.9 | 2024 | 1 | Rewriting Conversational Utterances with Instructed Large Language Models | 2410.07797 |
| 2.8 | 2024 | 1 | CS4: Measuring the Creativity of Large Language Models Automatically by Controlling the Number of St | 2410.04197 |
| 5.0 | 2024 | 1 | The Perfect Blend: Redefining RLHF with Mixture of Judges | 2409.20370 |
| 2.8 | 2024 | 1 | Meta-Rewarding Language Models : Self-Improving Alignment with LLM-as-a-Meta-Judge | 2407.19594 |
| 2.8 | 2024 | 1 | InstructPatentGPT: Training patent language models to follow instructions with human feedback | 2406.16897 |
| 3.6 | 2025 | 1 | VLM Agents Generate Their Own Memories: Distilling Experience into Embodied Programs of Thought | 2406.14596 |
| 2.8 | 2024 | 1 | Self-play with Execution Feedback : Improving Instruction - following Capabilities of Large Language | 2406.13542 |
| 2.8 | 2024 | 1 | ChatGLM: A Family of Large Language Models from GLM-130B to GLM-4 All Tools | 2406.12793 |
| 3.9 | 2024 | 1 | OPTune: Efficient Online Preference Tuning | 2406.07657 |
| 5.0 | 2024 | 1 | Scalable Ensembling For Mitigating Reward Overoptimisation | 2406.01013 |
| 2.8 | 2024 | 1 | Improving Reward Models with Synthetic Critiques | 2405.20850 |
| 2.8 | 2024 | 1 | InstructionCP: A fast approach to transfer Large Language Models into target language | 2405.20175 |
| 2.8 | 2024 | 1 | Would I Lie To You? Inference Time Alignment of Language Models using Direct Preference Heads | 2405.20053 |
| 3.6 | 2025 | 1 | Triple Preference Optimization: Achieving Better Alignment using a Single Step Optimization | 2405.16681 |
| 5.0 | 2024 | 1 | Impact of Non-Standard Unicode Characters on Security and Comprehension in Large Language Models | 2405.14490 |
| 3.9 | 2024 | 1 | Multimodal Large Language Model is a Human -Aligned Annotator for Text-to-Image Generation | 2404.15100 |
| 3.6 | 2025 | 1 | TeaMs-RL: Teaching LLMs to Generate Better Instruction Datasets via Reinforcement Learning | 2403.08694 |
| 3.9 | 2024 | 1 | DiffChat: Learning to Chat with Text-to-Image Synthesis Models for Interactive Image Creation | 2403.04997 |
| 2.8 | 2024 | 1 | Aligning Modalities in Vision Large Language Models via Preference Fine-tuning | 2402.11411 |
| 3.6 | 2026 | 1 | AI Governance Should Prioritize Control and Knowledge Boundaries Over Limiting Intelligence | 2611.12941 |
| 13.8 | 2026 | 1 | Humans Correct Their Judgments Through Debate , but Weaker AI Models Do Not | 2610.28539 |
| 13.8 | 2026 | 1 | AI Safety via Debate is Compromised by Cognitive Biases | 2610.05461 |
| 3.6 | 2026 | 1 | How to Avoid Debate : Scalable AI Safety via Doubly-Efficient Interactive Proofs | 2607.03561 |
| 4.7 | 2026 | 1 | Enhancing Operational Safety via Agentic Dialogue Hazard Identification Analysis | 2606.03812 |
| 6.2 | 2026 | 1 | Make Mechanistic Interpretability Auditable: A Call to Develop Guidelines via Continuous Collaborati | 2606.00033 |
| 3.6 | 2026 | 1 | Clear, Compelling Arguments: Rethinking the Foundations of Frontier AI Safety Cases | 2603.08760 |
| 20.7 | 2026 | 1 | Knowledge Divergence and the Value of Debate for Scalable Oversight | 2603.05293 |
| 12.7 | 2026 | 1 | Debate is efficient with your time | 2602.08630 |
| 3.6 | 2025 | 1 | An alignment safety case sketch based on debate | 2505.03989 |
| 4.7 | 2025 | 1 | Understanding and Mitigating Risks of Generative AI in Financial Services | 2504.20086 |
| 6.1 | 2024 | 1 | Generative AI regulation can learn from social media regulation | 2412.11335 |
| 10.8 | 2024 | 1 | Playing Large Games with Oracles and AI Debate | 2312.04792 |
| 2.8 | 2023 | 1 | Scalable AI Safety via Doubly-Efficient Debate | 2311.14125 |
| 3.9 | 2023 | 1 | Topological Parallax: A Geometric Specification for Deep Perception Models | 2306.11835 |
| 3.2 | 2022 | 1 | Modeling Transformative AI Risks (MTAIR) Project -- Summary Report | 2206.09360 |
| 10.5 | 2020 | 1 | An overview of 11 proposals for building safe advanced AI | 2012.07532 |
| 9.4 | 2018 | 1 | AI safety via debate | 1805.00899 |
| 5.8 | 2026 | 1 | Food Critic: An Agentic Visualization System for Auditable Restaurant- Safety Reasoning | 2611.15843 |
| 4.7 | 2026 | 1 | AI Alignment Is Neither Solvable nor Sufficient | 2611.13167 |
| 3.6 | 2026 | 1 | Verified Implementation of the Next-gen Borrow Checking Algorithm for Rust via Abstract Interpretati | 2611.06319 |
| 4.7 | 2026 | 1 | When Compliance Data Masquerades as Evaluation: Measurement Validity for Deployed AI Systems | 2609.13642 |

## 读不到全文的（诚实记录）

- arXiv:2603.01202 — HTTP 404
- arXiv:2110.04880 — HTTP 404
- arXiv:2604.14807 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2608.21618 — HTTP 404
- arXiv:2512.10304 — HTTP 404
- arXiv:2611.25202 — HTTP 404
- arXiv:2611.20926 — HTTP 404
- arXiv:2512.04334 — HTTP 404
- arXiv:2512.12500 — HTTP 404
- arXiv:2505.12074 — HTTP 404

_生成于 2026-11-24T17:24:04.228Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_