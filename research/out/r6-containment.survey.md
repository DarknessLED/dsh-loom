# R6 遏制与安全：沙箱逃逸、权限边界、供应链与提示注入

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 649 个不同候选，保留 174
- 回溯：读通 50 篇全文的参考文献，共 2565 条引用（2 篇无可用 HTML）
- 语料内被引：144 个工作被本语料至少两篇论文引用；被引最多的是 14 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14 | 37 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Inj | 2302.12173 |
| 13 | 49 | 2024 | AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents. | — |
| 11 | 15 | 2022 | “ReAct: Synergizing reasoning and acting in language models” | 2210.03629 |
| 10 | 37 | 2026 | Defeating Prompt Injections by Design. | 2503.18813 |
| 10 | 18 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” | 2403.02691 |
| 9 | 17 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” | 2403.14720 |
| 8 | 14 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries | 2402.06363 |
| 7 | 11 | 2025 | Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents. | 2410.02644 |
| 6 | 13 | 2025 | Securing AI agents with information-flow control. | 2505.23643 |
| 6 | 9 | 2023 | “WebArena: A Realistic Web Environment for Building Autonomous Agents” | 2307.13854 |
| 6 | 7 | 2023 | “ToolFormer: Language Models Can Teach Themselves to Use Tools” | 2302.04761 |
| 5 | 14 | 2025 | DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. | — |
| 5 | 13 | 2025 | MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. | — |
| 5 | 13 | 2020 | Firecracker: Lightweight virtualization for serverless applications. | — |
| 5 | 12 | 2026 | WASP: Benchmarking web agent security against prompt injection attacks. | 2504.18575 |
| 5 | 9 | 2025 | SecAlign: Defending against prompt injection with preference optimization. | — |
| 5 | 9 | 2024 | “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” | 2310.12815 |
| 5 | 9 | 2022 | “Ignore previous prompt: Attack techniques for language models” | 2211.09527 |
| 5 | 7 | 2024 | “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” | 2307.16789 |
| 5 | 6 | 2023 | “Universal and Transferable Adversarial Attacks on Aligned Language Models” | 2307.15043 |
| 4 | 15 | 2025 | The attacker moves second: Stronger adaptive attacks bypass defenses against LLM jailbreaks and prompt injec | 2510.09023 |
| 4 | 14 | 2023 | “Prompt Injection attack against LLM-integrated Applications” | 2306.05499 |
| 4 | 9 | 2025 | DataSentinel: A game-theoretic detection of prompt injection attacks. | — |
| 4 | 9 | 2025 | PromptArmor: Simple yet effective prompt injection defenses. | 2507.15219 |
| 4 | 8 | 2025 | Progent: Securing AI agents with privilege control. | 2504.11703 |
| 4 | 8 | 2024 | A Survey on Large Language Model based Autonomous Agents. | 2308.11432 |
| 4 | 7 | 2025 | Adaptive Attacks Break Defenses Against Indirect Prompt Injection Attacks on LLM Agents. | — |
| 4 | 7 | 2025 | Jailbreaking black box large language models in twenty queries. | — |
| 4 | 6 | 2024 | “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” | 2404.13208 |
| 4 | 6 | 2024 | External Links: Link | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 37 | 14 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Pr |
| 49 | 13 | 2024 | AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents. |
| 15 | 11 | 2022 | “ReAct: Synergizing reasoning and acting in language models” |
| 37 | 10 | 2026 | Defeating Prompt Injections by Design. |
| 18 | 10 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” |
| 17 | 9 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” |
| 14 | 8 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries |
| 11 | 7 | 2025 | Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents. |
| 13 | 6 | 2025 | Securing AI agents with information-flow control. |
| 9 | 6 | 2023 | “WebArena: A Realistic Web Environment for Building Autonomous Agents” |
| 7 | 6 | 2023 | “ToolFormer: Language Models Can Teach Themselves to Use Tools” |
| 14 | 5 | 2025 | DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. |
| 13 | 5 | 2025 | MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. |
| 13 | 5 | 2020 | Firecracker: Lightweight virtualization for serverless applications. |
| 12 | 5 | 2026 | WASP: Benchmarking web agent security against prompt injection attacks. |
| 9 | 5 | 2025 | SecAlign: Defending against prompt injection with preference optimization. |
| 9 | 5 | 2024 | “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” |
| 9 | 5 | 2022 | “Ignore previous prompt: Attack techniques for language models” |
| 7 | 5 | 2024 | “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” |
| 6 | 5 | 2023 | “Universal and Transferable Adversarial Attacks on Aligned Language Models” |
| 15 | 4 | 2025 | The attacker moves second: Stronger adaptive attacks bypass defenses against LLM jailbreaks and prom |
| 14 | 4 | 2023 | “Prompt Injection attack against LLM-integrated Applications” |
| 9 | 4 | 2025 | DataSentinel: A game-theoretic detection of prompt injection attacks. |
| 9 | 4 | 2025 | PromptArmor: Simple yet effective prompt injection defenses. |
| 8 | 4 | 2025 | Progent: Securing AI agents with privilege control. |
| 8 | 4 | 2024 | A Survey on Large Language Model based Autonomous Agents. |
| 7 | 4 | 2025 | Adaptive Attacks Break Defenses Against Indirect Prompt Injection Attacks on LLM Agents. |
| 7 | 4 | 2025 | Jailbreaking black box large language models in twenty queries. |
| 6 | 4 | 2024 | “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” |
| 6 | 4 | 2024 | External Links: Link |

## 各细分方向的开篇（按语料内最早一篇）

- **prompt injection**（49 篇，最早 2023-05-05）Not what you've signed up for: Compromising Real - World LLM - Integrated Applications with Indirect Prompt In · arXiv:2302.12173
- **agent red teaming**（42 篇，最早 2011-08-05）Green: Towards a Pollution-Free Peer-to-Peer Content Sharing Service · arXiv:1108.1343
- **sandbox / isolation**（37 篇，最早 2024-02-01）bypass4netns: Accelerating TCP/IP Communications in Rootless Containers · arXiv:2402.00365
- **credential / exfiltration**（14 篇，最早 2026-03-18）Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare · arXiv:2603.17419
- **supply chain**（11 篇，最早 2025-02-12）Investigation of Advanced Persistent Threats Network-based Tactics, Techniques and Procedures · arXiv:2502.08830

## 最近的 SOTA（近两年）

- 2026-09-28 · Climbing the Hill: Prompt Injection Red-Teaming Against Frontier Models with Curriculum Reinforcement Learning · arXiv:2609.33628
- 2026-04-04 · AttackEval: A Systematic Empirical Study of Prompt Injection Attack Effectiveness Against Large Language Models · arXiv:2604.03598
- 2026-03-23 · OrgForge-IT: A Verifiable Synthetic Benchmark for LLM-Based Insider Threat Detection · arXiv:2603.22499
- 2025-06-24 · Defeating Prompt Injections by Design · arXiv:2503.18813
- 2026-04-11 · PlanGuard: Defending Agents against Indirect Prompt Injection via Planning-based Consistency Verification · arXiv:2604.10134
- 2025-09-10 · ACE: A Security Architecture for LLM- Integrated App Systems · arXiv:2504.20984
- 2025-05-29 · Agent Security Bench ( ASB ): Formalizing and Benchmarking Attacks and Defenses in LLM - based Agents · arXiv:2410.02644
- 2026-11-18 · SPILLWAY: Separating Target Admission from Sanitization to Defend Tool-Using Agents against Prompt Injection · arXiv:2611.07222
- 2026-05-26 · Cryptographic Registry Provenance: Structural Defense Against Dependency Confusion in AI Package Ecosystems · arXiv:2605.03309
- 2026-11-05 · I Think, Therefore I Attack: Evaluating Thought Injection Attacks on Reasoning Agents · arXiv:2611.08811
- 2026-03-18 · Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare · arXiv:2603.17419
- 2026-11-08 · Scaling Adaptive Prompt Injection Attacks with Agent Swarms · arXiv:2611.11861
- 2026-11-07 · Agents of Chaos: A Systematization of Knowledge (SoK) on Malicious Attacks on Agentic AI Systems · arXiv:2611.10843
- 2026-11-17 · GapLeak: When Privacy-Preserving LLM-based Web Agents Become a Privacy Risk · arXiv:2611.22223
- 2026-11-14 · Compositional Exploits in Autonomous Coding Agents: Attack Mechanics and Ephemeral Defense · arXiv:2611.19764
- 2026-07-21 · Isolation Failure From Shared Storage: Characterizing and Exploiting Page-Cache SCA Leakage Across Containers and VMs · arXiv:2607.17518
- 2026-11-07 · SecureGARD: Dynamic Ontology-Guided Governance for Secure Tool-Using LLM Agents · arXiv:2611.06682
- 2026-07-19 · Trustworthy AI LLM Scalability Risk Index (LSRI): A Cybersecurity Framework Assessing Agentic-AI Security & Software Model Supply  · arXiv:2602.19021
- 2026-11-18 · PIPETTE: Prompt Injection Purple-Teaming for Robust LLM Agents · arXiv:2611.24362
- 2026-11-05 · MetaPI: Constructing Prompt Injection Benchmarks from LLM Agent Benchmark · arXiv:2611.10026
- 2026-11-18 · AutoPI: Taxonomy-Guided Adaptive Red Teaming for Prompt Injection in LLM Agents · arXiv:2611.24313
- 2026-11-05 · Beyond Instruction Override: Benchmarking Indirect Prompt Injection with Task-Tampering Attacks · arXiv:2611.07640
- 2026-11-02 · ATrust: Adaptive Trust Boundary Expansion for Securing LLM Agents · arXiv:2611.02741
- 2026-06-06 · AI Code Sandboxes: A Comparative Security Study. Part 1 of 2 -- Engine-Level Properties (Attack Surface, Leakage, Stackability, CV · arXiv:2606.08433
- 2025-11-22 · eBPF-PATROL: Protective Agent for Threat Recognition and Overreach Limitation using eBPF in Containerized and Virtualized Environm · arXiv:2511.18155
- 2026-09-19 · DeepSeek Elastic Compute (DSec): A Sandbox Infrastructure for Effective Agentic Training at Scale · arXiv:2609.22978
- 2026-01-23 · Pack-A-Mal: A Malware Analysis Framework for Open-Source Packages · arXiv:2511.09957
- 2026-01-08 · Defense Against Indirect Prompt Injection via Tool Result Parsing · arXiv:2601.04795
- 2025-11-03 · Characterizing Build Compromises Through Vulnerability Disclosure Analysis · arXiv:2511.01395
- 2025-02-28 · DySec: A Machine Learning-based Dynamic Analysis for Detecting Malicious Packages in PyPI Ecosystem · arXiv:2503.00324

## 被常引但不在语料里（下一轮的查询）

- (6 篇引) Securing AI agents with information-flow control. · 2025 · arXiv:2505.23643
- (6 篇引) “WebArena: A Realistic Web Environment for Building Autonomous Agents” · 2023 · arXiv:2307.13854
- (6 篇引) “ToolFormer: Language Models Can Teach Themselves to Use Tools” · 2023 · arXiv:2302.04761
- (5 篇引) DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. · 2025
- (5 篇引) MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. · 2025
- (5 篇引) Firecracker: Lightweight virtualization for serverless applications. · 2020
- (5 篇引) WASP: Benchmarking web agent security against prompt injection attacks. · 2026 · arXiv:2504.18575
- (5 篇引) SecAlign: Defending against prompt injection with preference optimization. · 2025
- (5 篇引) “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” · 2024 · arXiv:2310.12815
- (5 篇引) “Ignore previous prompt: Attack techniques for language models” · 2022 · arXiv:2211.09527
- (5 篇引) “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” · 2024 · arXiv:2307.16789
- (5 篇引) “Universal and Transferable Adversarial Attacks on Aligned Language Models” · 2023 · arXiv:2307.15043
- (4 篇引) The attacker moves second: Stronger adaptive attacks bypass defenses against LLM jailbreaks and prompt injecti · 2025 · arXiv:2510.09023
- (4 篇引) “Prompt Injection attack against LLM-integrated Applications” · 2023 · arXiv:2306.05499
- (4 篇引) DataSentinel: A game-theoretic detection of prompt injection attacks. · 2025
- (4 篇引) PromptArmor: Simple yet effective prompt injection defenses. · 2025 · arXiv:2507.15219
- (4 篇引) Progent: Securing AI agents with privilege control. · 2025 · arXiv:2504.11703
- (4 篇引) A Survey on Large Language Model based Autonomous Agents. · 2024 · arXiv:2308.11432
- (4 篇引) Adaptive Attacks Break Defenses Against Indirect Prompt Injection Attacks on LLM Agents. · 2025
- (4 篇引) Jailbreaking black box large language models in twenty queries. · 2025
- (4 篇引) “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” · 2024 · arXiv:2404.13208
- (4 篇引) External Links: Link · 2024
- (4 篇引) Osworld: benchmarking multimodal agents for open-ended tasks in real computer environments · 2024
- (4 篇引) IsolateGPT: An execution isolation architecture for LLM-based agentic systems. · 2025 · arXiv:2403.04960
- (3 篇引) AgentPoison: Red-teaming LLM agents via poisoning memory or knowledge bases. · 2024
- (3 篇引) GPT-4 Technical Report. · 2024
- (3 篇引) Terminal-bench: benchmarking agents on hard, realistic tasks in command line interfaces · 2026 · arXiv:2601.11868
- (3 篇引) “Exploiting programmatic behavior of llms: Dual-use through standard security attacks” · 2024
- (3 篇引) AgentDyn: a dynamic open-ended benchmark for evaluating prompt injection attacks of real-world agent security  · 2026 · arXiv:2602.03117
- (3 篇引) PISmith: Reinforcement Learning-based Red Teaming for Prompt Injection Defenses · 2026 · arXiv:2603.13026
- (3 篇引) “Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models” · 2025 · arXiv:2312.14197
- (3 篇引) Meta secalign: a secure foundation LLM against prompt injection attacks · 2025 · arXiv:2507.02735
- (3 篇引) Progent: programmable privilege control for LLM agents · 2025 · arXiv:2504.11703
- (3 篇引) Benchmarking, analysis, and optimization of serverless function snapshots. · 2021
- (3 篇引) Mind2Web: Towards a generalist agent for the web. · 2023
- (3 篇引) Prompt injection attack to tool selection in LLM agents. · 2025 · arXiv:2504.19793
- (3 篇引) The landscape of prompt injection threats in LLM agents: From taxonomy to analysis. · 2026 · arXiv:2602.10453
- (3 篇引) “Fine-Tuned DeBERTa-v3-base for Prompt Injection Detection” · 2024
- (3 篇引) “Graphene-SGX: A Practical Library OS for Unmodified Applications on SGX” · 2017
- (3 篇引) “The True Cost of Containing: A GVisor Case Study” · 2019

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 13.0 | 2024 | 1 | AgentDojo : A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents | 2406.13352 |
| 11.9 | 2023 | 1 | Not what you've signed up for: Compromising Real - World LLM - Integrated Applications with Indirect | 2302.12173 |
| 4.7 | 2026 | 1 | Climbing the Hill: Prompt Injection Red-Teaming Against Frontier Models with Curriculum Reinforcemen | 2609.33628 |
| 5.8 | 2026 | 1 | AttackEval: A Systematic Empirical Study of Prompt Injection Attack Effectiveness Against Large Lang | 2604.03598 |
| 3.6 | 2026 | 1 | OrgForge-IT: A Verifiable Synthetic Benchmark for LLM-Based Insider Threat Detection | 2603.22499 |
| 4.7 | 2025 | 1 | Defeating Prompt Injections by Design | 2503.18813 |
| 2.5 | 2011 | 1 | Green: Towards a Pollution-Free Peer-to-Peer Content Sharing Service | 1108.1343 |
| 2.8 | 2023 | 1 | ReAct : Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 4.7 | 2026 | 1 | PlanGuard: Defending Agents against Indirect Prompt Injection via Planning-based Consistency Verific | 2604.10134 |
| 3.6 | 2025 | 1 | ACE: A Security Architecture for LLM- Integrated App Systems | 2504.20984 |
| 11.9 | 2024 | 1 | InjecAgent : Benchmarking Indirect Prompt Injections in Tool - Integrated Large Language Model Agent | 2403.02691 |
| 5.0 | 2024 | 1 | Defending Against Indirect Prompt Injection Attacks With Spotlighting | 2403.14720 |
| 5.0 | 2024 | 1 | StruQ : Defending Against Prompt Injection with Structured Queries | 2402.06363 |
| 4.7 | 2025 | 1 | Agent Security Bench ( ASB ): Formalizing and Benchmarking Attacks and Defenses in LLM - based Agent | 2410.02644 |
| 16.0 | 2026 | 1 | SPILLWAY: Separating Target Admission from Sanitization to Defend Tool-Using Agents against Prompt I | 2611.07222 |
| 13.8 | 2026 | 1 | Cryptographic Registry Provenance: Structural Defense Against Dependency Confusion in AI Package Eco | 2605.03309 |
| 10.5 | 2026 | 2 | I Think, Therefore I Attack: Evaluating Thought Injection Attacks on Reasoning Agents | 2611.08811 |
| 10.5 | 2026 | 2 | Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare | 2603.17419 |
| 10.0 | 2026 | 4 | Scaling Adaptive Prompt Injection Attacks with Agent Swarms | 2611.11861 |
| 10.0 | 2026 | 4 | Agents of Chaos: A Systematization of Knowledge (SoK) on Malicious Attacks on Agentic AI Systems | 2611.10843 |
| 9.7 | 2026 | 3 | GapLeak: When Privacy-Preserving LLM-based Web Agents Become a Privacy Risk | 2611.22223 |
| 9.7 | 2026 | 3 | Compositional Exploits in Autonomous Coding Agents: Attack Mechanics and Ephemeral Defense | 2611.19764 |
| 9.4 | 2026 | 2 | Isolation Failure From Shared Storage: Characterizing and Exploiting Page-Cache SCA Leakage Across C | 2607.17518 |
| 9.2 | 2026 | 5 | SecureGARD: Dynamic Ontology-Guided Governance for Secure Tool-Using LLM Agents | 2611.06682 |
| 9.1 | 2026 | 1 | Trustworthy AI LLM Scalability Risk Index (LSRI): A Cybersecurity Framework Assessing Agentic-AI Sec | 2602.19021 |
| 8.9 | 2026 | 4 | PIPETTE: Prompt Injection Purple-Teaming for Robust LLM Agents | 2611.24362 |
| 8.9 | 2026 | 4 | MetaPI: Constructing Prompt Injection Benchmarks from LLM Agent Benchmark | 2611.10026 |
| 8.6 | 2026 | 3 | AutoPI: Taxonomy-Guided Adaptive Red Teaming for Prompt Injection in LLM Agents | 2611.24313 |
| 8.6 | 2026 | 3 | Beyond Instruction Override: Benchmarking Indirect Prompt Injection with Task-Tampering Attacks | 2611.07640 |
| 8.6 | 2026 | 3 | ATrust: Adaptive Trust Boundary Expansion for Securing LLM Agents | 2611.02741 |
| 8.3 | 2026 | 2 | AI Code Sandboxes: A Comparative Security Study. Part 1 of 2 -- Engine-Level Properties (Attack Surf | 2606.08433 |
| 8.3 | 2025 | 2 | eBPF-PATROL: Protective Agent for Threat Recognition and Overreach Limitation using eBPF in Containe | 2511.18155 |
| 8.0 | 2026 | 1 | DeepSeek Elastic Compute (DSec): A Sandbox Infrastructure for Effective Agentic Training at Scale | 2609.22978 |
| 8.0 | 2026 | 1 | Pack-A-Mal: A Malware Analysis Framework for Open-Source Packages | 2511.09957 |
| 8.0 | 2026 | 1 | Defense Against Indirect Prompt Injection via Tool Result Parsing | 2601.04795 |
| 8.0 | 2025 | 1 | Characterizing Build Compromises Through Vulnerability Disclosure Analysis | 2511.01395 |
| 8.0 | 2025 | 1 | DySec: A Machine Learning-based Dynamic Analysis for Detecting Malicious Packages in PyPI Ecosystem | 2503.00324 |
| 7.5 | 2026 | 3 | Replication of Agentic Security Events: Audit and Investigation (ROGUE-AI) | 2611.26553 |
| 7.5 | 2026 | 3 | Security of Deep Research Agents: Attack Surface, Defenses, Benchmarks, and Agenda Seeding against R | 2611.20045 |
| 7.5 | 2026 | 3 | Measuring LLM Agent Defenses by Layer: GDA Measurement and an Envelope-Layer Attack-Defense Model | 2610.00392 |
| 7.2 | 2024 | 1 | Making 'syscall' a Privilege not a Right | 2406.07429 |
| 7.2 | 2024 | 1 | Dynamic Frequency-Based Fingerprinting Attacks against Modern Sandbox Environments | 2404.10715 |
| 7.2 | 2024 | 1 | Are Unikernels Ready for Serverless on the Edge? | 2403.00515 |
| 7.2 | 2024 | 1 | bypass4netns: Accelerating TCP/IP Communications in Rootless Containers | 2402.00365 |
| 7.2 | 2026 | 2 | Scale-Induced Semantic Shift in Visual Prompt Injection Against VLMs and Web Agents | 2611.16744 |
| 7.2 | 2026 | 2 | The Devil is in the Context: Nine Dimensions of Prompt Injection Attacks | 2611.04672 |
| 7.2 | 2026 | 2 | SoK: PIAtlas: Decomposing the Unbounded Prompt Injection Attack Space | 2610.24999 |
| 7.2 | 2026 | 2 | Kairos: Transactional Security Enforcement at the System Boundary for LLM Agents | 2610.18457 |
| 7.2 | 2026 | 2 | Can CaMeLs Talk? Securing Multi-Agent Systems Against Indirect Prompt Injection Attacks | 2610.05640 |
| 7.2 | 2026 | 2 | API Secrets Should Never Become Tokens in the LLM's Vocabulary: A Threat Analysis of API Credential  | 2609.33371 |
| 7.2 | 2026 | 2 | Quantifying Frontier LLM Capabilities for Container Sandbox Escape | 2603.02277 |
| 7.2 | 2026 | 2 | Sandlock: Confining AI Agent Code with Unprivileged Linux Primitives | 2605.26298 |
| 7.2 | 2026 | 2 | Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain | 2604.08407 |
| 7.2 | 2025 | 2 | Locked In, Leaked Out: Measuring Isolation via Kernel Locks | 2507.21248 |
| 6.9 | 2026 | 1 | On the Relative Security of Prompt Injection : Mechanised Definitions, Defences and Verdicts for LLM | 2611.11506 |
| 6.9 | 2026 | 1 | Log-To-Leak: Prompt Injection Attacks on Tool-Using LLM Agents via the Model Context Protocol | 2610.36108 |
| 6.9 | 2026 | 1 | MobileJailBench: Red Queen Jailbreak Benchmarking for Mobile Agents | 2610.23303 |
| 6.9 | 2026 | 1 | Netkit: Specializing Linux Packet Delivery for Container Networks | 2609.18633 |
| 6.9 | 2026 | 1 | The Anatomy of a Prompt Injection: A Component Model for Structured Analysis | 2608.07808 |
| 6.9 | 2026 | 1 | Crab: A Semantics-Aware Checkpoint/Restore Runtime for Agent Sandboxes | 2604.28138 |
| 6.9 | 2026 | 1 | TraceScope: Interactive URL Triage via Decoupled Checklist Adjudication | 2604.21840 |
| 6.9 | 2026 | 1 | TrEnv-X: Transparently Share Serverless Execution Environments Across Different Functions and Nodes | 2509.09525 |
| 6.9 | 2026 | 1 | Cargo Sherlock: An SMT-Based Checker for Software Trust Costs | 2512.12553 |
| 6.9 | 2025 | 1 | Investigating the Impact of Isolation on Synchronized Benchmarks | 2511.03533 |
| 6.9 | 2025 | 1 | Playing in the Sandbox: A Study on the Usability of Seccomp | 2506.10234 |
| 6.4 | 2026 | 3 | Securing and Auditing Long-Horizon LLM Agents: State-Transfer Auditing and Controls in the Agent Har | 2611.23346 |
| 6.4 | 2026 | 3 | Intent-Aware Protection for AI Agents | 2611.16122 |
| 6.4 | 2026 | 3 | Least-Privilege Auditing of Agent Tool Calls with Intent Graphs and Reasoning-Guided Escalation | 2611.11305 |
| 6.4 | 2026 | 3 | Right Tool, Wrong Parameters: Defending LLM Agents Against Parameter Poisoning | 2611.04673 |
| 6.4 | 2026 | 3 | StateFence: Task-State Protection Against Evidence-Chain Contamination in Blue-Team LLM Agents | 2611.02605 |
| 6.4 | 2026 | 3 | Ignored, Not Refused: What Low Prompt-Injection Success Rates Hide in Small Tool-Using Agents | 2610.23254 |
| 6.2 | 2026 | 1 | Notwithstanding Anything to the Contrary, Ignore All Instructions: Measuring Prompt Injection Guards | 2611.08834 |
| 6.2 | 2026 | 1 | AI Slop and Hallucinations in Vulnerability Assessment: A Survey on Reasoning Failures and Trustwort | 2608.25667 |
| 6.1 | 2026 | 2 | SEOYUN: Refusal-Inducing Exam Documents for AI-Glasses Pipelines | 2611.26033 |
| 6.1 | 2026 | 2 | What Survives the Shift from Text to Pixels? Conditional Protection against Prompt Injection in Imag | 2611.24231 |
| 6.1 | 2026 | 2 | Agent Authenticator: Passkey-Grade, Hardware-Bound Authentication for AI Agents | 2611.19536 |
| 6.1 | 2026 | 2 | VAST: Compiling Grounded Vulnerability Scenarios into Verifiable, Multi-Step Environments for Evalua | 2611.19465 |
| 6.1 | 2026 | 2 | Can the Confidence and Decisions of System 1 Models Be Trusted? An Explainability and Perturbation A | 2611.12521 |
| 6.1 | 2026 | 2 | Harness Matters: Measuring and Dissecting Security Resilience in Web Agents | 2611.11971 |
| 6.1 | 2026 | 2 | Multimodal-SEA: Benchmarking AI Agent Security under Multimodal Social Engineering Attacks | 2611.08281 |

## 读不到全文的（诚实记录）

- arXiv:2606.08433 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2511.09957 — HTTP 404

_生成于 2026-11-23T15:07:14.950Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_