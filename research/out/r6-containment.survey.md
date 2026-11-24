# R6 遏制与安全：沙箱逃逸、权限边界、供应链与提示注入

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 650 个不同候选，保留 175
- 回溯：读通 50 篇全文的参考文献，共 2171 条引用（2 篇无可用 HTML）
- 语料内被引：150 个工作被本语料至少两篇论文引用；被引最多的是 22 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 22 | 79 | 2024 | AgentDojo: A dynamic environment to evaluate prompt injection attacks and defenses for LLM agents. | 2406.13352 |
| 18 | 44 | 2026 | Defeating prompt injections by design. | 2503.18813 |
| 18 | 33 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Inj | 2302.12173 |
| 14 | 33 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” | 2403.02691 |
| 13 | 17 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries | 2402.06363 |
| 11 | 18 | 2025 | Agent Security Bench (ASB): Formalizing and benchmarking attacks and defenses in LLM-based agents. | 2410.02644 |
| 11 | 14 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” | 2403.14720 |
| 11 | 11 | 2025 | SecAlign: Defending against prompt injection with preference optimization. | 2410.05451 |
| 9 | 14 | 2022 | “ReAct: Synergizing reasoning and acting in language models” | 2210.03629 |
| 8 | 15 | 2026 | DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. | 2506.12104 |
| 8 | 13 | 2025 | Securing AI agents with information-flow control. | 2505.23643 |
| 8 | 11 | 2023 | “ToolFormer: Language Models Can Teach Themselves to Use Tools” | — |
| 7 | 16 | 2024 | “Identifying the Risks of LM Agents with an LM-Emulated Sandbox” | 2309.15817 |
| 7 | 16 | 2026 | AgentDyn: Are Your Agent Security Defenses Deployable in Real-World Dynamic Environments? | 2602.03117 |
| 7 | 10 | 2022 | “Ignore previous prompt: Attack techniques for language models” | 2211.09527 |
| 7 | 9 | 2024 | “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” | 2310.12815 |
| 7 | 6 | 2023 | Llama guard: Llm-based input-output safeguard for human-ai conversations. | 2312.06674 |
| 7 | 6 | 2024 | System-Level Defense against Indirect Prompt Injection Attacks: An Information Flow Control Perspective. | 2409.19091 |
| 6 | 12 | 2025 | Progent: Securing AI Agents with Privilege Control. | 2504.11703 |
| 6 | 11 | 2025 | Progent: programmable privilege control for llm agents | 2504.11703 |
| 6 | 10 | 2024 | “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” | 2404.13208 |
| 6 | 10 | 2023 | The dual LLM pattern for building AI assistants that can resist prompt injection. | — |
| 6 | 10 | 2025 | “Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models” | 2312.14173 |
| 6 | 8 | 2024 | “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” | 2307.16789 |
| 6 | 8 | 2025 | Qwen3 Technical Report. | 2505.09388 |
| 5 | 24 | 2026 | The attacker moves second: stronger adaptive attacks bypass defenses against { \{ llm } \} jailbreaks and pr | 2510.09023 |
| 5 | 15 | 2025 | AgentHarm: A benchmark for measuring harmfulness of LLM agents. | 2410.09024 |
| 5 | 10 | 2023 | “Universal and Transferable Adversarial Attacks on Aligned Language Models” | 2307.15043 |
| 5 | 7 | 2025 | DataSentinel: A Game-Theoretic Detection of Prompt Injection Attacks. | 2504.11358 |
| 5 | 7 | 2025 | MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. | 2502.05174 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 79 | 22 | 2024 | AgentDojo: A dynamic environment to evaluate prompt injection attacks and defenses for LLM agents. |
| 44 | 18 | 2026 | Defeating prompt injections by design. |
| 33 | 18 | 2023 | “Not What You’ve Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Pr |
| 33 | 14 | 2024 | “InjecAgent: Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents” |
| 17 | 13 | 2025 | { \{ struq } \} : Defending against prompt injection with structured queries |
| 18 | 11 | 2025 | Agent Security Bench (ASB): Formalizing and benchmarking attacks and defenses in LLM-based agents. |
| 14 | 11 | 2024 | “Defending Against Indirect Prompt Injection Attacks With Spotlighting” |
| 11 | 11 | 2025 | SecAlign: Defending against prompt injection with preference optimization. |
| 14 | 9 | 2022 | “ReAct: Synergizing reasoning and acting in language models” |
| 15 | 8 | 2026 | DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. |
| 13 | 8 | 2025 | Securing AI agents with information-flow control. |
| 11 | 8 | 2023 | “ToolFormer: Language Models Can Teach Themselves to Use Tools” |
| 16 | 7 | 2024 | “Identifying the Risks of LM Agents with an LM-Emulated Sandbox” |
| 16 | 7 | 2026 | AgentDyn: Are Your Agent Security Defenses Deployable in Real-World Dynamic Environments? |
| 10 | 7 | 2022 | “Ignore previous prompt: Attack techniques for language models” |
| 9 | 7 | 2024 | “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” |
| 6 | 7 | 2023 | Llama guard: Llm-based input-output safeguard for human-ai conversations. |
| 6 | 7 | 2024 | System-Level Defense against Indirect Prompt Injection Attacks: An Information Flow Control Perspect |
| 12 | 6 | 2025 | Progent: Securing AI Agents with Privilege Control. |
| 11 | 6 | 2025 | Progent: programmable privilege control for llm agents |
| 10 | 6 | 2024 | “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” |
| 10 | 6 | 2023 | The dual LLM pattern for building AI assistants that can resist prompt injection. |
| 10 | 6 | 2025 | “Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models” |
| 8 | 6 | 2024 | “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” |
| 8 | 6 | 2025 | Qwen3 Technical Report. |
| 24 | 5 | 2026 | The attacker moves second: stronger adaptive attacks bypass defenses against { \{ llm } \} jailbreak |
| 15 | 5 | 2025 | AgentHarm: A benchmark for measuring harmfulness of LLM agents. |
| 10 | 5 | 2023 | “Universal and Transferable Adversarial Attacks on Aligned Language Models” |
| 7 | 5 | 2025 | DataSentinel: A Game-Theoretic Detection of Prompt Injection Attacks. |
| 7 | 5 | 2025 | MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. |

## 各细分方向的开篇（按语料内最早一篇）

- **agent red teaming**（62 篇，最早 2011-08-05）Green: Towards a Pollution-Free Peer-to-Peer Content Sharing Service · arXiv:1108.1343
- **prompt injection**（54 篇，最早 2024-09-25）StruQ : Defending Against Prompt Injection with Structured Queries · arXiv:2402.06363
- **credential / exfiltration**（27 篇，最早 2026-03-20）Trojan's Whisper: Stealthy Manipulation of OpenClaw through Injected Bootstrapped Guidance · arXiv:2603.19974
- **sandbox / isolation**（23 篇，最早 2024-03-01）Are Unikernels Ready for Serverless on the Edge? · arXiv:2403.00515
- **supply chain**（9 篇，最早 2026-05-26）Cryptographic Registry Provenance: Structural Defense Against Dependency Confusion in AI Package Ecosystems · arXiv:2605.03309

## 最近的 SOTA（近两年）

- 2026-09-28 · Climbing the Hill: Prompt Injection Red-Teaming Against Frontier Models with Curriculum Reinforcement Learning · arXiv:2609.33628
- 2026-04-04 · AttackEval: A Systematic Empirical Study of Prompt Injection Attack Effectiveness Against Large Language Models · arXiv:2604.03598
- 2026-03-23 · OrgForge-IT: A Verifiable Synthetic Benchmark for LLM-Based Insider Threat Detection · arXiv:2603.22499
- 2025-06-24 · Defeating Prompt Injections by Design · arXiv:2503.18813
- 2026-04-11 · PlanGuard: Defending Agents against Indirect Prompt Injection via Planning-based Consistency Verification · arXiv:2604.10134
- 2025-09-10 · ACE: A Security Architecture for LLM- Integrated App Systems · arXiv:2504.20984
- 2025-05-29 · Agent Security Bench ( ASB ): Formalizing and Benchmarking Attacks and Defenses in LLM - based Agents · arXiv:2410.02644
- 2026-01-15 · ReasAlign: Reasoning Enhanced Safety Alignment against Prompt Injection Attack · arXiv:2601.10173
- 2025-07-03 · SecAlign : Defending Against Prompt Injection with Preference Optimization · arXiv:2410.05451
- 2026-05-12 · IPI-proxy: An Intercepting Proxy for Red-Teaming Web-Browsing AI Agents Against Indirect Prompt Injection · arXiv:2605.11868
- 2026-10-31 · AgentCap: Capability-Based Runtime Authorization for Secure LLM Agent Execution · arXiv:2611.00729
- 2026-10-16 · Ignored, Not Refused: What Low Prompt-Injection Success Rates Hide in Small Tool-Using Agents · arXiv:2610.23254
- 2026-08-16 · Bounded Agents : Delegation Security for Multi- Agent AI Systems · arXiv:2608.15888
- 2026-11-02 · ATrust: Adaptive Trust Boundary Expansion for Securing LLM Agents · arXiv:2611.02741
- 2026-11-07 · SecureGARD: Dynamic Ontology-Guided Governance for Secure Tool-Using LLM Agents · arXiv:2611.06682
- 2026-11-18 · PIPETTE: Prompt Injection Purple-Teaming for Robust LLM Agents · arXiv:2611.24362
- 2026-08-07 · The Anatomy of a Prompt Injection: A Component Model for Structured Analysis · arXiv:2608.07808
- 2026-11-18 · AutoPI: Taxonomy-Guided Adaptive Red Teaming for Prompt Injection in LLM Agents · arXiv:2611.24313
- 2026-10-15 · Autonomous OSS Threat Detection via Taxonomy-Aligned LLMs · arXiv:2610.01263
- 2026-10-13 · Kairos: Transactional Security Enforcement at the System Boundary for LLM Agents · arXiv:2610.18457
- 2026-10-04 · Can CaMeLs Talk? Securing Multi-Agent Systems Against Indirect Prompt Injection Attacks · arXiv:2610.05640
- 2026-07-21 · Data Leakage Prevention in Agentic Applications via Preemptive Hardening · arXiv:2607.18847
- 2026-05-26 · Cryptographic Registry Provenance: Structural Defense Against Dependency Confusion in AI Package Ecosystems · arXiv:2605.03309
- 2025-11-03 · Characterizing Build Compromises Through Vulnerability Disclosure Analysis · arXiv:2511.01395
- 2026-11-11 · Intent-Aware Protection for AI Agents · arXiv:2611.16122
- 2026-09-29 · ToolFence: Fine-Grained Authorization for Secure Tool-Using LLM Agents · arXiv:2609.37196
- 2026-09-28 · CounterSteer: Suppressing Indirect Prompt Injection with Activation Steering · arXiv:2609.36570
- 2026-09-25 · AgentXploit: Autonomous Repository-to-Runtime Red-Teaming for AI Agents · arXiv:2609.31318
- 2026-11-18 · SPILLWAY: Separating Target Admission from Sanitization to Defend Tool-Using Agents against Prompt Injection · arXiv:2611.07222
- 2026-03-18 · Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare · arXiv:2603.17419

## 被常引但不在语料里（下一轮的查询）

- (9 篇引) “ReAct: Synergizing reasoning and acting in language models” · 2022 · arXiv:2210.03629
- (8 篇引) DRIFT: Dynamic Rule-Based Defense with Injection Isolation for Securing LLM Agents. · 2026 · arXiv:2506.12104
- (8 篇引) Securing AI agents with information-flow control. · 2025 · arXiv:2505.23643
- (8 篇引) “ToolFormer: Language Models Can Teach Themselves to Use Tools” · 2023
- (7 篇引) “Identifying the Risks of LM Agents with an LM-Emulated Sandbox” · 2024 · arXiv:2309.15817
- (7 篇引) AgentDyn: Are Your Agent Security Defenses Deployable in Real-World Dynamic Environments? · 2026 · arXiv:2602.03117
- (7 篇引) “Ignore previous prompt: Attack techniques for language models” · 2022 · arXiv:2211.09527
- (7 篇引) “Formalizing and Benchmarking Prompt Injection Attacks and Defenses” · 2024 · arXiv:2310.12815
- (7 篇引) Llama guard: Llm-based input-output safeguard for human-ai conversations. · 2023 · arXiv:2312.06674
- (7 篇引) System-Level Defense against Indirect Prompt Injection Attacks: An Information Flow Control Perspective. · 2024 · arXiv:2409.19091
- (6 篇引) “The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions” · 2024 · arXiv:2404.13208
- (6 篇引) The dual LLM pattern for building AI assistants that can resist prompt injection. · 2023
- (6 篇引) “Benchmarking and Defending Against Indirect Prompt Injection Attacks on Large Language Models” · 2025 · arXiv:2312.14173
- (6 篇引) “ToolLLM: Facilitating large language models to master 16000+ real-world APIs” · 2024 · arXiv:2307.16789
- (6 篇引) Qwen3 Technical Report. · 2025 · arXiv:2505.09388
- (5 篇引) The attacker moves second: stronger adaptive attacks bypass defenses against { \{ llm } \} jailbreaks and prom · 2026 · arXiv:2510.09023
- (5 篇引) AgentHarm: A benchmark for measuring harmfulness of LLM agents. · 2025 · arXiv:2410.09024
- (5 篇引) “Universal and Transferable Adversarial Attacks on Aligned Language Models” · 2023 · arXiv:2307.15043
- (5 篇引) DataSentinel: A Game-Theoretic Detection of Prompt Injection Attacks. · 2025 · arXiv:2504.11358
- (5 篇引) MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents. · 2025 · arXiv:2502.05174
- (4 篇引) PISmith: reinforcement learning-based red teaming for prompt injection defenses · 2026 · arXiv:2603.13026
- (4 篇引) Jailbreaking black box large language models in twenty queries · 2025 · arXiv:2310.08419
- (4 篇引) “Can LLMs Separate Instructions From Data? And What Do We Even Mean By That?” · 2025 · arXiv:2403.06833
- (4 篇引) IPIGuard: A Novel Tool Dependency Graph-Based Defense Against Indirect Prompt Injection in LLM Agents. · 2025
- (4 篇引) Tree of Attacks: Jailbreaking Black-Box LLMs Automatically · 2024 · arXiv:2312.02119
- (4 篇引) Learning to inject: Automated prompt injection via reinforcement learning. · 2026 · arXiv:2602.05746
- (4 篇引) Promptarmor: simple yet effective prompt injection defenses · 2025 · arXiv:2507.15219
- (4 篇引) AgentSpec: customizable runtime enforcement for safe and reliable LLM agents · 2025 · arXiv:2503.18666
- (4 篇引) WASP: benchmarking web agent security against prompt injection attacks · 2025 · arXiv:2504.18575
- (4 篇引) A survey on large language model based autonomous agents. · 2024 · arXiv:2308.11432
- (4 篇引) Assessing automated prompt injection attacks in agentic environments. · 2026 · arXiv:2606.10525
- (4 篇引) “Prompt Injection attack against LLM-integrated Applications” · 2023 · arXiv:2306.05499
- (4 篇引) “WebArena: A Realistic Web Environment for Building Autonomous Agents” · 2023 · arXiv:2307.13854
- (4 篇引) The Llama 3 herd of models. · 2024 · arXiv:2407.21783
- (4 篇引) “Neural Exec: Learning (and Learning from) Execution Triggers for Prompt Injection Attacks” · 2024 · arXiv:2403.03792
- (3 篇引) Meta-SecAlign: Training LLMs against prompt injection for robust agents. · 2025 · arXiv:2507.02735
- (3 篇引) RL Is a Hammer and LLMs Are Nails: A Simple Reinforcement Learning Recipe for Strong Prompt Injection · 2025 · arXiv:2510.04885
- (3 篇引) DecodingTrust-Agent Platform (DTap): A Controllable and Interactive Red-Teaming Platform for AI Agents · 2026 · arXiv:2605.04808
- (3 篇引) AgentArmor: Enforcing Program Analysis on Agent Runtime Trace to Defend Against Prompt Injection. · 2025 · arXiv:2508.01249
- (3 篇引) ARGUS: Defending LLM agents against context-aware prompt injection. · 2026 · arXiv:2605.03378

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14.1 | 2024 | 1 | AgentDojo : A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents | 2406.13352 |
| 5.8 | 2026 | 1 | Climbing the Hill: Prompt Injection Red-Teaming Against Frontier Models with Curriculum Reinforcemen | 2609.33628 |
| 6.9 | 2026 | 1 | AttackEval: A Systematic Empirical Study of Prompt Injection Attack Effectiveness Against Large Lang | 2604.03598 |
| 4.7 | 2026 | 1 | OrgForge-IT: A Verifiable Synthetic Benchmark for LLM-Based Insider Threat Detection | 2603.22499 |
| 14.9 | 2025 | 1 | Defeating Prompt Injections by Design | 2503.18813 |
| 3.6 | 2011 | 1 | Green: Towards a Pollution-Free Peer-to-Peer Content Sharing Service | 1108.1343 |
| 15.2 | 2023 | 1 | Not what you've signed up for: Compromising Real - World LLM - Integrated Applications with Indirect | 2302.12173 |
| 14.9 | 2026 | 1 | PlanGuard: Defending Agents against Indirect Prompt Injection via Planning-based Consistency Verific | 2604.10134 |
| 13.8 | 2025 | 1 | ACE: A Security Architecture for LLM- Integrated App Systems | 2504.20984 |
| 15.2 | 2024 | 1 | InjecAgent : Benchmarking Indirect Prompt Injections in Tool - Integrated Large Language Model Agent | 2403.02691 |
| 5.0 | 2024 | 1 | StruQ : Defending Against Prompt Injection with Structured Queries | 2402.06363 |
| 5.8 | 2025 | 1 | Agent Security Bench ( ASB ): Formalizing and Benchmarking Attacks and Defenses in LLM - based Agent | 2410.02644 |
| 6.9 | 2026 | 1 | ReasAlign: Reasoning Enhanced Safety Alignment against Prompt Injection Attack | 2601.10173 |
| 8.0 | 2025 | 1 | SecAlign : Defending Against Prompt Injection with Preference Optimization | 2410.05451 |
| 8.3 | 2024 | 1 | Defending Against Indirect Prompt Injection Attacks With Spotlighting | 2403.14720 |
| 27.6 | 2026 | 2 | IPI-proxy: An Intercepting Proxy for Red-Teaming Web-Browsing AI Agents Against Indirect Prompt Inje | 2605.11868 |
| 25.4 | 2026 | 2 | AgentCap: Capability-Based Runtime Authorization for Secure LLM Agent Execution | 2611.00729 |
| 24.6 | 2026 | 3 | Ignored, Not Refused: What Low Prompt-Injection Success Rates Hide in Small Tool-Using Agents | 2610.23254 |
| 22.9 | 2026 | 1 | Bounded Agents : Delegation Security for Multi- Agent AI Systems | 2608.15888 |
| 19.9 | 2026 | 3 | ATrust: Adaptive Trust Boundary Expansion for Securing LLM Agents | 2611.02741 |
| 19.4 | 2026 | 5 | SecureGARD: Dynamic Ontology-Guided Governance for Secure Tool-Using LLM Agents | 2611.06682 |
| 19.1 | 2026 | 4 | PIPETTE: Prompt Injection Purple-Teaming for Robust LLM Agents | 2611.24362 |
| 18.2 | 2026 | 1 | The Anatomy of a Prompt Injection: A Component Model for Structured Analysis | 2608.07808 |
| 17.7 | 2026 | 3 | AutoPI: Taxonomy-Guided Adaptive Red Teaming for Prompt Injection in LLM Agents | 2611.24313 |
| 17.4 | 2026 | 2 | Autonomous OSS Threat Detection via Taxonomy-Aligned LLMs | 2610.01263 |
| 17.4 | 2026 | 2 | Kairos: Transactional Security Enforcement at the System Boundary for LLM Agents | 2610.18457 |
| 17.4 | 2026 | 2 | Can CaMeLs Talk? Securing Multi-Agent Systems Against Indirect Prompt Injection Attacks | 2610.05640 |
| 17.1 | 2026 | 1 | Data Leakage Prevention in Agentic Applications via Preemptive Hardening | 2607.18847 |
| 17.1 | 2026 | 1 | Cryptographic Registry Provenance: Structural Defense Against Dependency Confusion in AI Package Eco | 2605.03309 |
| 17.1 | 2025 | 1 | Characterizing Build Compromises Through Vulnerability Disclosure Analysis | 2511.01395 |
| 16.6 | 2026 | 3 | Intent-Aware Protection for AI Agents | 2611.16122 |
| 16.3 | 2026 | 2 | ToolFence: Fine-Grained Authorization for Secure Tool-Using LLM Agents | 2609.37196 |
| 16.3 | 2026 | 2 | CounterSteer: Suppressing Indirect Prompt Injection with Activation Steering | 2609.36570 |
| 16.3 | 2026 | 2 | AgentXploit: Autonomous Repository-to-Runtime Red-Teaming for AI Agents | 2609.31318 |
| 16.0 | 2026 | 1 | SPILLWAY: Separating Target Admission from Sanitization to Defend Tool-Using Agents against Prompt I | 2611.07222 |
| 16.0 | 2026 | 2 | Caging the Agents: A Zero Trust Security Architecture for Autonomous AI in Healthcare | 2603.17419 |
| 15.3 | 2026 | 1 | eBPF-Based Cybersecurity Mechanisms: A Systematic Literature Review | 2608.27511 |
| 15.2 | 2026 | 2 | CapLite: Prompt - Injection Defense for Small Language Model Agents without Model-Written Security A | 2611.17115 |
| 15.2 | 2026 | 2 | GreyZone: Production-quality Agentic Application Threats | 2611.09161 |
| 15.2 | 2026 | 2 | SEAL: Sealed Queries for Local Sanitization against Indirect Prompt Injection | 2610.39758 |
| 14.9 | 2026 | 1 | ROPE: Routed Origin Policy Enforcement against Indirect Prompt Injection | 2608.27496 |
| 14.9 | 2026 | 1 | SecPO: Principled Adversarial Training for Prompt Injection Security | 2610.41998 |
| 14.9 | 2026 | 1 | Attention-based Classification for Indirect Prompt Injection | 2610.28988 |
| 14.9 | 2026 | 1 | MetaPermit: Scalable and Auditable Access Control for AI Agents via LLM-Inferred Meta-Attributes | 2609.31039 |
| 14.9 | 2026 | 1 | CaMeLoT: CaMeL orchestrated with Temporal logic for static verification and liveness | 2609.18674 |
| 14.9 | 2026 | 1 | Progent: Securing AI Agents with Privilege Control | 2504.11703 |
| 14.9 | 2026 | 1 | Owner-Harm: A Missing Threat Model for AI Agent Safety | 2604.18658 |
| 14.1 | 2026 | 2 | AutoRedClaw: Automated Red-Teaming for Claw-Style Agents | 2610.27244 |
| 14.1 | 2024 | 1 | SafeBPF: Hardware-assisted Defense-in-depth for eBPF Kernel Extensions | 2409.07508 |
| 13.8 | 2026 | 1 | AgentTracer: Tracing Indirect Prompt Injection Attack through Fine-Grained Intention-Execution Align | 2610.09935 |
| 13.8 | 2026 | 1 | Readable Before Actionable: Causal Tracing of Indirect Prompt Injection | 2610.05295 |
| 13.8 | 2026 | 1 | AgenTRIM: Tool Risk Mitigation for Agentic AI | 2601.12449 |
| 13.8 | 2026 | 1 | Adaptive Evaluation of Out-of-Band Defenses Against Prompt Injection in LLM Agents | 2606.26479 |
| 13.0 | 2026 | 3 | Compositional Exploits in Autonomous Coding Agents: Attack Mechanics and Ephemeral Defense | 2611.19764 |
| 12.7 | 2026 | 1 | Conflux: Preventing Privilege Escalation with Principal Contexts and System-Level Evaluation | 2611.08768 |
| 12.7 | 2026 | 1 | Exposure Is Not Commitment: Double-Stratified Evaluation of Latent Monitors for Tool-Using Agents | 2610.37679 |
| 12.7 | 2026 | 1 | Boundary-State Control for Tool - Using Language-Model Agents : Commit-Time Consistency under State  | 2609.37475 |
| 12.7 | 2026 | 2 | Isolation Failure From Shared Storage: Characterizing and Exploiting Page-Cache SCA Leakage Across C | 2607.17518 |
| 12.2 | 2026 | 4 | Scaling Adaptive Prompt Injection Attacks with Agent Swarms | 2611.11861 |
| 11.6 | 2026 | 2 | I Think, Therefore I Attack: Evaluating Thought Injection Attacks on Reasoning Agents | 2611.08811 |
| 11.6 | 2026 | 2 | SPIDES: Information-Flow Control for Browser Agents | 2610.24277 |
| 11.6 | 2026 | 2 | Sandlock: Confining AI Agent Code with Unprivileged Linux Primitives | 2605.26298 |
| 11.6 | 2026 | 2 | Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain | 2604.08407 |
| 11.6 | 2026 | 2 | Agent Skills in the Wild: An Empirical Study of Security Vulnerabilities at Scale | 2601.10338 |
| 11.3 | 2026 | 1 | Model-as-a-Trojan: Self-Activating Covert DNS Exfiltration Baked Into the Weights of an LLM Agent | 2610.22578 |
| 11.3 | 2026 | 1 | On Understanding, Identifying, and Mitigating Vulnerabilities in Agentic Large Language Models | 2608.10530 |
| 11.3 | 2026 | 1 | ClawSafety: "Safe" LLMs, Unsafe Agents | 2604.01438 |
| 11.3 | 2026 | 1 | Trojan's Whisper: Stealthy Manipulation of OpenClaw through Injected Bootstrapped Guidance | 2603.19974 |
| 10.8 | 2026 | 3 | GapLeak: When Privacy-Preserving LLM-based Web Agents Become a Privacy Risk | 2611.22223 |
| 10.8 | 2026 | 3 | Security of Deep Research Agents: Attack Surface, Defenses, Benchmarks, and Agenda Seeding against R | 2611.20045 |
| 10.5 | 2026 | 2 | AI Code Sandboxes: A Comparative Security Study. Part 1 of 2 -- Engine-Level Properties (Attack Surf | 2606.08433 |
| 10.5 | 2026 | 2 | Comment and Control: Hijacking Agentic Workflows via Context-Grounded Evolution | 2605.11229 |
| 10.2 | 2026 | 1 | Inadvertent Context Leakage in Language Models | 2608.19857 |
| 10.2 | 2026 | 1 | Aegis OS: A Transactional Multi-Tenant Operating System Runtime for Eliminating Authorization Fatigu | 2611.08516 |
| 10.2 | 2026 | 1 | Understanding and Evaluating Claw-like Agent Security Through a Computer-Systems Lens | 2606.30755 |
| 10.2 | 2025 | 1 | LLM Agents Should Employ Security Principles | 2505.24019 |
| 10.0 | 2026 | 4 | Agents of Chaos: A Systematization of Knowledge (SoK) on Malicious Attacks on Agentic AI Systems | 2611.10843 |
| 10.0 | 2026 | 4 | MetaPI: Constructing Prompt Injection Benchmarks from LLM Agent Benchmark | 2611.10026 |
| 9.7 | 2026 | 3 | Replication of Agentic Security Events: Audit and Investigation (ROGUE-AI) | 2611.26553 |
| 9.7 | 2026 | 3 | Measuring LLM Agent Defenses by Layer: GDA Measurement and an Envelope-Layer Attack-Defense Model | 2610.00392 |

## 读不到全文的（诚实记录）

- arXiv:2610.28988 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)
- arXiv:2606.26479 — no HTML rendering (pre-2023 paper, or LaTeX that did not convert)

_生成于 2026-11-24T17:27:55.796Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_