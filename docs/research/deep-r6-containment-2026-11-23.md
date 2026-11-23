# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `sandbox`, `prompt injection`, `permission`, `escape`, `boundary`, `action`, `environment`, `tool`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Not what you’ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection (`2302.12173`) | 32 | 6 | graded ok (depth full) |
| ReAct : Synergizing Reasoning and Acting in Language Models (`2210.03629`) | 50 | 6 | graded ok (depth full) |
| InjecAgent : Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents (`2403.02691`) | 41 | 6 | graded ok (depth full) |
| Defeating Prompt Injections by Design (`2503.18813`) | 71 | 6 | graded ok (depth full) |
| Defending Against Indirect Prompt Injection Attacks With Spotlighting (`2403.14720`) | 24 | 6 | graded ok (depth full) |
| StruQ: Defending Against Prompt Injection with Structured Queries (`2402.06363`) | 40 | 6 | graded ok (depth full) |
| Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents (`2410.02644`) | 64 | 6 | graded ok (depth full) |
| Toolformer: Language Models Can Teach Themselves to Use Tools (`2302.04761`) | 55 | 6 | graded ok (depth full) |

## Not what you’ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection — `2302.12173`

- **§2. Preliminaries and Related Work** (`S2.p2.1`)

  > Prompting to Augment LLMs with APIs. One way to augment LLMs with tools is to instruct them on how to use these tools. Toolformer ( Schick et al., 2023 ) shows that it is possible to train LLMs to output API calls by inferring which API to call, when, and which arguments to pass. This is done in a self-supervised manner by first leveraging in-context learning to generate potential training data for fine-tuning. Similarly, ReAct ( Yao et al., 2023 ) is another method to equip LLMs with tools using Chain-of-Thought prompting ( Wei et al., 2022 ) . It generates both task-specific actions and verb…

- **§1. Introduction** (`S1.p2.1`)

  > LLM-Integrated Applications. Beyond their impressive capabilities, LLMs are now integrated into other applications at a widespread fast-paced rate. Such tools can offer interactive chat and summary of the retrieved search results or documents and perform actions on behalf of the user by calling other APIs ( cha, 2023 ) . In the few months after ChatGPT, we witnessed Bing Chat ( lin, 2023n ) , Bard ( goo, 2023 ) , Microsoft 365 and Security Copilots ( lin, 2023i ; lin, 2023j ) , and numerous ChatGPT plugins ( cha, 2023 ) – with new announcements on almost a daily basis. However, we argue that t…

- **§1. Introduction** (`S1.p5.1`)

  > Impact. We show that Indirect Prompt Injection can lead to full compromise of the model at inference time analogous to traditional security principles. This can entail remote control of the model, persistent compromise, theft of data, and denial of service. Furthermore, advanced AI systems add new layers of threat: Their capabilities to adapt to minimal instructions and autonomously advance the attacker’s goals make them a potent tool for adversaries to achieve, e.g., disinformation dissemination and user manipulation. In this paper, we construct the first examples of such attacks.

- **§2. Preliminaries and Related Work** (`S2.p4.1`)

  > LLM Safety. LLMs might make up facts (“hallucinate”), generate polarized content, or reproduce biases, hate speech, or stereotypes ( Gehman et al., 2020 ; Nadeem et al., 2021 ; Lin et al., 2022 ; Patel and Pavlick, 2021 ; Bender et al., 2021 ; Bommasani et al., 2021 ; Weidinger et al., 2021 ) . This partially stems from pre-training on massive crawled datasets. One of the motivations for leveraging Reinforcement Learning from Human Feedback (RLHF) ( Ouyang et al., 2022 ; Stiennon et al., 2020 ) is to better align LLMs with human values and avert these unwanted behaviors ( Bai et al., 2022 ) .…

- **§1. Introduction** (`S1.p3.1`)

  > Prompt Injection. Attacks against ML models typically involve powerful algorithms and optimization techniques ( Apruzzese et al., 2022 ) . However, the easily extensible nature of LLMs’ functionalities via natural prompts can enable more straightforward attack tactics. Even under black-box settings with mitigation already in place ( Kang et al., 2023 ) , malicious users can exploit the model through Prompt Injection (PI) attacks that circumvent content restrictions or gain access to the model’s original instructions ( Perez and Ribeiro, 2022 ; lin, 2023h ; lin, 2023o ) .

- **§1. Introduction** (`S1.p4.1`)

  > Indirect Prompt Injection. Augmenting LLMs with retrieval blurs the line between data and instructions . Adversarial prompting has been so far assumed to be performed directly by a malicious user exploiting the system. In contrast, we show that adversaries can now remotely affect other users’ systems by strategically injecting the prompts into data likely to be retrieved at inference time. If retrieved and ingested, these prompts can indirectly control the model (see Figure 1 ). Recent incidents already show that retrieved data can accidentally elicit unwanted behaviors (e.g., hostility) ( wap…

## ReAct : Synergizing Reasoning and Acting in Language Models — `2210.03629`

- **§1 Introduction** (`S1.p2.1`)

  > Recent results have hinted at the possibility of combining verbal reasoning with interactive decision making in autonomous systems. On one hand, properly prompted large language models (LLMs) have demonstrated emergent capabilities to carry out several steps of reasoning traces to derive answers from questions in arithmetic, commonsense, and symbolic reasoning tasks ( Wei et al., 2022 ) . However, this “chain-of-thought” reasoning is a static black box, in that the model uses its own internal representations to generate thoughts and is not grounded in the external world, which limits its abili…

- **§1 Introduction** (`S1.p3.1`)

  > In this work, we present ReAct , a general paradigm to combine reasoning and acting with language models for solving diverse language reasoning and decision making tasks (Figure 1 ). ReAct prompts LLMs to generate both verbal reasoning traces and actions pertaining to a task in an interleaved manner, which allows the model to perform dynamic reasoning to create, maintain, and adjust high-level plans for acting (reason to act), while also interact with the external environments (e.g. Wikipedia) to incorporate additional information into reasoning (act to reason).

- **§1 Introduction** (`S1.p4.1`)

  > We conduct empirical evaluations of ReAct and state-of-the-art baselines on four diverse benchmarks: question answering (HotPotQA, Yang et al., 2018 ), fact verification (Fever, Thorne et al., 2018 ), text-based game (ALFWorld, Shridhar et al., 2020b ), and webpage navigation (WebShop, Yao et al., 2022 ). For HotPotQA and Fever, with access to a Wikipedia API that the model can interact with, ReAct outperforms vanilla action generation models while being competitive with chain-of-thought reasoning ( CoT ) ( Wei et al., 2022 ) . The best approach overall is a combination of ReAct and CoT that a…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p1.1`)

  > Consider a general setup of an agent interacting with an environment for task solving. At time step t t , an agent receives an observation o t ∈ 𝒪 o_{t}\in\mathcal{O} from the environment and takes an action a t ∈ 𝒜 a_{t}\in\mathcal{A} following some policy π ⁡ ( a t | c t ) \pi(a_{t}|c_{t}) , where c t = ( o 1 , a 1 , ⋯ , o t − 1 , a t − 1 , o t ) c_{t}=(o_{1},a_{1},\cdots,o_{t-1},a_{t-1},o_{t}) is the context to the agent. Learning a policy is challenging when the mapping c t ↦ a t c_{t}\mapsto a_{t} is highly implicit and requires extensive computation. For example, the agent shown in Fig…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p2.1`)

  > The idea of ReAct is simple: we augment the agent’s action space to 𝒜 ^ = 𝒜 ∪ ℒ \mathcal{\hat{A}}=\mathcal{A}\cup\mathcal{L} , where ℒ \mathcal{L} is the space of language. An action a ^ t ∈ ℒ \hat{a}_{t}\in\mathcal{L} in the language space, which we will refer to as a thought or a reasoning trace , does not affect the external environment, thus leading to no observation feedback. Instead, a thought a ^ t \hat{a}_{t} aims to compose useful information by reasoning over the current context c t c_{t} , and update the context c t + 1 = ( c t , a ^ t ) c_{t+1}=(c_{t},\hat{a}_{t}) to support futu…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p3.1`)

  > However, as the language space ℒ \mathcal{L} is unlimited, learning in this augmented action space is difficult and requires strong language priors. In this paper, we mainly focus on the setup where a frozen large language model, PaLM-540B ( Chowdhery et al., 2022 ) 1 1 1 We show some GPT-3 ( Brown et al., 2020 ) results in Appendix A.1 , which outperforms PaLM-540B. , is prompted with few-shot in-context examples to generate both domain-specific actions and free-form language thoughts for task solving (Figure 1 (1d), (2b)). Each in-context example is a human trajectory of actions, thoughts, a…

## InjecAgent : Benchmarking Indirect Prompt Injections in Tool-Integrated Large Language Model Agents — `2403.02691`

- **§1 Introduction** (`S1.p2.1`)

  > However, these features introduce security risks. Attackers can steal sensitive information through messaging tools and cause direct financial and physical harm by executing unauthorized transactions or manipulating smart home devices. They can achieve this by injecting malicious content into the information retrieved by agents Perez and Ribeiro (2022) ; Liu et al. (2023) ; Esmradi et al. (2023) , which is often fed back to the LLM as part of the context. Such attacks are known as Indirect Prompt Injection (IPI) attacks Abdelnabi et al. (2023) .

- **§1 Introduction** (`S1.p5.1`)

  > Our dataset includes 17 different user instructions, each using a distinct tool to retrieve external content that is susceptible to modification by attackers. Examples of this content include product reviews, shared notes, websites, emails, among others. The dataset also covers 62 different attacker instructions, with each using distinct tools to perform harmful actions towards users. We categorize these attacks into two main types: direct harm attacks, which involve executing tools that can cause immediate harm to the user, such as money transactions and home device manipulation; and data ste…

- **§3.1 Experiment Settings** (`S3.SS1.p3.1`)

  > Evaluation Metrics. Following previous work in the evaluation of prompt injection attacks Zou et al. (2023) ; Robey et al. (2023) ; Tian et al. (2023) , we use the attack success rate (ASR) as the primary metric to evaluate the LLM agent’s resilience to the attacks. Given that some agents produce many invalid outputs, significantly impacting the overall ASR, we introduce ASR-valid as the ratio of successful attacks among valid outputs. This metric more accurately reflects the agent’s resilience, compared to ASR-all , which measures the proportion of successful attacks across all outputs. For d…

- **§6 Conclusion** (`S6.p1.1`)

  > In this work, we introduce the first benchmark for indirect prompt injection attacks targeting tool-integrated LLM agents, named InjecAgent . We evaluate 30 different LLM agents and conduct a comprehensive analysis. Our findings demonstrate the feasibility of manipulating these agents into performing harmful actions toward users by merely injecting malicious instructions into external content. This work underscores the risks associated with such attacks, given their ease of deployment and the severity of potential outcomes. Furthermore, it emphasizes the urgent need for and offers guidance on…

- **§1 Introduction** (`S1.p1.1`)

  > Large Language Models (LLMs) Brown et al. (2020) ; Achiam et al. (2023) ; Ouyang et al. (2022) ; Touvron et al. (2023) are increasingly being incorporated into agent frameworks Significant Gravitas () ; OpenAI (2023a) ; NVIDIA (2024) , where they can perform actions via tools. Increasingly, these agents are being deployed in settings where they access users’ personal data OpenAI (2023a) ; NVIDIA (2024) and perform actions in the real-world Ahn et al. (2022) ; Song et al. (2023) .

- **§1 Introduction** (`S1.p3.1`)

  > Due to the low technical requirements needed to carry out such attacks and the significant consequences they can cause, it is important to systematically evaluate the vulnerabilities of LLM agents to these types of attacks. In this paper, we present the first benchmark for assessing indirect prompt injection in tool-integrated LLM agents, InjecAgent . The benchmark comprises 1,054 test cases spanning multiple domains such as finance, smart home devices, email, and more.

## Defeating Prompt Injections by Design — `2503.18813`

- **§1 Introduction** (`S1.p1.1`)

  > Large Language Models (LLMs) are increasingly used as the core of modern agentic systems ( Wooldridge & Jennings, 1995 ) interacting with external environments via APIs and user interfaces ( Nakano et al., 2021 ; Thoppilan et al., 2022 ; Schick et al., 2023 ; Yao et al., 2022 ; Qin et al., 2023 ; Lu et al., 2024 ; Gao et al., 2023 ; Shen et al., 2024 ) . This exposes them to prompt injection attacks ( Goodside, 2022 ; Perez & Ribeiro, 2022 ; Greshake et al., 2023 ) when data or instructions come from untrusted sources (e.g., from a compromised user, from tool call outputs, or from a web page).…

- **§2 Defeating Prompt Injections by Design** (`S2.p1.1`)

  > Consider a user who prompts a model as follows: “Can you send Bob the document he requested in our last meeting? Bob’s email and the document he asked for are in the meeting notes file.” The user query is straightforward, and the agent is designed to interact with the user’s local notes and email functionalities via tool calling. However, the user’s notes could be compromised or influenced by malicious actors, who can include (potentially invisible) text with the aim to override the user’s instructions, leading to prompt injection attacks ( Goodside, 2022 ; Perez & Ribeiro, 2022 ; Greshake et…

- **§Is Dual LLM of Willison enough?** (`S2.SS0.SSS0.Px2.p2.1`)

  > The Privileged LLM, as before, plans the actions: search the cloud storage for “meeting notes", extract the document to send and the email address with the Quarantined LLM, and send the document to the extracted email address. Now, consider the following attack: A malicious party with access to the meeting notes adds some text to the notes that influences the Quarantined LLM to send them an arbitrary confidential document. When the agent executes the plan, the Privileged LLM correctly orchestrates the planned steps. However, when the agent retrieves the meeting notes from the cloud storage, th…

- **§Defeating prompt injections with software security.** (`S2.SS0.SSS0.Px3.p2.1`)

  > By enforcing capability-based security policies, CaMeL effectively prevents unintended data flows and actions. Even with a compromised cloud storage file containing prompt injections targeting the Quarantined LLM, the capabilities system acts as a robust and granular control mechanism, preventing data exfiltration, as well as other prohibited actions. This approach provides a secure environment for LLM agents, preventing harm by design, without requiring modifications to the underlying LLM itself, and offering a significantly more fine-grained and robust defense compared to isolation and/or ad…

- **§3 Threat Model** (`S3.p1.1`)

  > Building on the security challenges described in the introduction, we now define the specific threats that CaMeL addresses. The primary goal of CaMeL is to stop prompt injection attacks coming from untrusted data sources, which constitutes the main risk considered in prompt injection literature. This scenario, described in Figure 2 , highlights the danger of processing untrusted data, a practice that is commonplace in current agentic systems. Here, the user prompt first gets processed by the planner model which extracts individual sub-steps that need to be performed ( control flow graph ) alon…

- **§Error handling.** (`S5.SS4.SSS0.Px1.p1.1`)

  > The interpreter prompts the P-LLM up to 10 times to get code that fully runs. If an exception is raised, then the exception location and type (similarly to how it would be formatted by a real Python interpreter) are presented to the P-LLM, together with a prompt asking the LLM to fix the code. (full prompt in Section H.2 ). Note that, however, the exception content must be handled with care: if the exception has a dependency on untrusted data (e.g., the text comes from or has a dependency on an untrusted tool output), it could potentially contain a prompt injection. The error message is then r…

## Defending Against Indirect Prompt Injection Attacks With Spotlighting — `2403.14720`

- **§I Introduction** (`S1.p1.1`)

  > Large language models (LLMs) are powerful tools that can perform a variety of natural language processing (NLP) tasks [ 10 , 11 , 12 , 13 ] . However, the flexibility of LLMs also leaves them vulnerable to prompt injection attacks (PIAs). Since LLMs are built to process a single, unstructured or minimally-structured text input, malicious users can inject instructions into the input text that override the intended task. PIAs pose a serious threat to the security and integrity of LLMs and their applications. A particularly subtle form of prompt injection, known as indirect prompt injection (XPIA…

- **§I Introduction** (`S1.p2.1`)

  > The prompt injection problem stems from the LLM’s inability to distinguish between valid system instructions and invalid instructions that arrive from external inputs. In security parlance, the LLM is not able to distinguish code from data. In this case, code refers to system instructions that the designers implement and data refers to any text that we do not control, such as from a user prompt or from an external data source. This is a structural limitation of LLMs since they operate on boundary-less streams of tokens in order to generate completions.

- **§III-A Overview** (`S3.SS1.p1.1`)

  > The prompt injection problem stems from the LLM’s inability to distinguish between valid system instructions and invalid instructions that arrive from external inputs. This is a structural limitation of LLMs since they operate on boundary-less streams of tokens in order to generate completions. To assist with prompt injection defense, the goal of spotlighting is to make it easier for the model to distinguish between our valid system instructions and any input text which should be treated as untrustworthy. Here, we describe three instantiations of spotlighting: delimiting, datamarking, and enco…

- **§IV-B Measuring Attack Success Rate (ASR)** (`S4.SS2.p2.1`)

  > To do so, we generated a synthetic dataset of 1000 documents that contain prompt injection attacks. Importantly, these attacks are variations on a simple keyword payload attack. That is, the attack payload urges the model to forget its prior instructions and to respond by only returning a single special keyword. We then use these documents in various LLM tasks and collect the responses. This attack approach, while simple, provides an easy-to-verify mechanism to identify successful and unsuccessful attacks (however see Appendix for more discussion). We report Attack Success Rate as the fraction…

- **§I Introduction** (`S1.p3.1`)

  > Our work delves into a comprehensive examination of various defensive strategies against indirect prompt injection attacks. We specifically focus on strategies that are directly applicable to the LLM system prompt, making them straightforward for development teams to incorporate. Our key insight is to assist the LLM in distinguishing safe blocks of tokens from unsafe ones. We introduce a novel approach called spotlighting, which encapsulates a family of techniques designed to aid the LLM in distinguishing between token blocks. Specifically, we describe three instantiations of spotlighting: del…

- **§I Introduction** (`S1.p4.1`)

  > To assess the impact of various strategies, we develop a corpus of documents containing indirect prompt injection attacks and quantify the Attack Success Rate (ASR) in common task settings. We find that across different models and tasks, spotlighting is able to reduce ASR significantly. Further, we examine the impacts of spotlighting transformations on underlying NLP tasks. We find that spotlighting transformations (datamarking and encoding) yield negligible detrimental impacts on task performance while providing a robust defense against XPIA. The prompt-engineering approaches described here a…

## StruQ: Defending Against Prompt Injection with Structured Queries — `2402.06363`

- **§2 Background and Related Work** (`S2.p11.1`)

  > Several months after the initial version of this paper was finished, Wallace et al. [41] introduced the instruction hierarchy, which can be viewed as a generalization of StruQ. Whereas StruQ has two types of messages (prompt and data), the instruction hierarchy supports multiple levels, including a system message, a user message (analogous to our prompt), and tool output (analogous to our data), thereby also providing a safe-by-design API and adopting similar techniques to defend against prompt injection. OpenAI deployed their scheme in GPT-4o mini, a state-of-the-art LLM.

- **§2 Background and Related Work** (`S2.p15.1`)

  > Other Threats to LLMs. Beyond prompt injection and jailbreaking, researchers have studied other attacks on LLMs, including data extraction [ 50 , 51 , 52 , 53 , 54 ] (recovering sensitive information in training data) and task-specific attacks to decrease the LLM’s performance [ 13 , 55 , 14 ] .

- **§3.4 Escape Character Attacks** (`S3.SS4.p1.1`)

  > Recently, researchers at Dropbox discovered that it is possible to mount prompt injection attacks using special characters that effectively delete old instructions and replace them with new ones [ 57 ] . Specifically, the Escape-Deletion attack injects ‘\b’ or ‘\r’ to imitate deleting previous characters, hoping to trick the LLM into ignoring the previous text. This works best if the number of injected characters matches or slightly exceeds the length of the previous text. In our study, we randomly inject ‘\b’ or ‘\r’ for T T times, where T T is the length of all previous text + 10 +10 .

- **§6 Discussion** (`S6.p1.1`)

  > Limitations. StruQ only protects programmatic applications that use an API or library to invoke LLMs. It is not applicable to web-based chatbots that offer multi-turn, open-ended conversational agents. The crucial difference is that application developers may be willing to use a different API where the prompt is specified separately from the data, but for chatbots used by end users, it seems unlikely that end users will be happy to mark which part of their contributions to the conversation are instructions and which are data. StruQ focuses on protecting models against prompt injections. It is…

- **§1 Introduction** (`S1.p2.1`)

  > This introduces the risk of prompt injection attacks [ 5 , 6 , 7 ] , where a malicious user can supply data with injected prompts and subvert the operation of the LLM-integrated application. Prompt injection has been dubbed the #1 security risk for LLM applications by OWASP [ 8 ] . In this type of attack, the user injects carefully chosen strings into the data (e.g., “Ignore all prior instructions and instead…”). Because LLMs scan their entire input for instructions to follow and there is no separation between prompts and data (i.e., between the part of the input intended by the application de…

- **§1 Introduction** (`S1.p3.1`)

  > To defend against prompt injections, we propose an approach called structured queries . A structured query to the LLM includes two separate components, the prompt and the data. We propose changing the interface to LLMs to support structured queries, instead of expecting application developers to concatenate prompts and data and send them to the LLM in a single combined input. To ensure security, the LLM must be trained so it will only follow instructions found in the prompt part of a structured query, but not instructions found in the data input. Such an LLM will be immune to prompt injection…

## Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents — `2410.02644`

- **§1 Introduction** (`S1.p1.1`)

  > Large Language Models (LLMs) have rapidly advanced in their capabilities, enabling them to perform tasks such as content generation, question answering, tool calling, coding and many others ( Kojima et al., 2024 ; Jin et al., 2025a ; Huang et al., 2022 ; Jin et al., 2025b ; Xu et al., 2024 ) . This has paved the way for developing AI agents that combine LLMs with tools and memory mechanisms capable of interacting with broader environments ( Ge et al., 2023a ; Xu et al., 2025a ) . These LLM-based agents have the potential to be deployed in various roles, such as safety-critical domains like fin…

- **§1 Introduction** (`S1.p3.1`)

  > Primarily, ASB covers various attack and defense types targeting each operational step of LLM-based agents, including system prompt, user prompt handling, tool usage, and memory retrieval. It evaluates Direct Prompt Injections (DPI), Indirect Prompt Injections (IPI), Memory Poisoning, Plan-of-Thought (PoT) Backdoor Attacks, Mixed Attacks, and their defenses, offering the first holistic assessment of LLM agents’ security. In detail, a straightforward way to compromise an agent is through DPI, where attackers directly manipulate the user prompt to guide the agent toward malicious actions. Additi…

- **§2 Related Work** (`S2.p1.1`)

  > Prompt Injections Attacks. Prompt injection adds special instructions to the original input, and attackers can manipulate the model’s understanding and induce unexpected outputs ( Perez & Ribeiro, 2022 ; Liu et al., 2023 ; Liu et al., 2024 ) . The prompt injection can target the user prompt directly ( Perez & Ribeiro, 2022 ; Selvi, 2022 ; Toyer et al., 2023 ; Yu et al., 2023a ; Kang et al., 2024 ) or indirectly influence the agent’s behavior by manipulating its accessible external environment ( Liu et al., 2023 ; Greshake et al., 2023 ; Yi et al., 2023 ) . Debenedetti et al. (2024) ; Zhan et a…

- **§3.1 Defining Basic Concepts** (`S3.SS1.p1.2`)

  > where π q \pi_{q} denotes the distribution of user queries, LLM \operatorname{LLM} is the backbone, and 𝟙 ​ ( ⋅ ) \mathbbm{1}(\cdot) is an indicator function. The input to the agent is the task plan from the LLM, and the output is a tool-using action during execution. Here, p sys p_{\text{sys}} is the system prompt, 𝒪 = ( o 1 , ⋯ , o m ) \mathcal{O}=(o_{1},\cdots,o_{m}) is a set of observations from the task trajectory, and 𝒯 = ( τ 1 , ⋯ , τ n ) \mathcal{T}=(\tau_{1},\cdots,\tau_{n}) is the available tool list. a b a_{b} is the labeled benign action. We define a target tool list 𝒯 t = ( τ…

- **§3.1 Defining Basic Concepts** (`S3.SS1.p3.1`)

  > Injected task: Apart from completing the target task, the direct and Indirect Prompt Injection attacks both aim to redirect the agent to execute a different task the attacker selects, referring to the injected task e e . x e x^{e} denotes its injected instruction, 𝒯 e = ( τ 1 e , ⋯ , τ n e ) \mathcal{T}^{e}=(\tau_{1}^{e},\cdots,\tau_{n}^{e}) denotes its injected attack tool list and d e d^{e} signifies its injected data.

- **§3.2 Threat Model** (`S3.SS2.p1.1`)

  > Adversarial Goal. Generally, the attacker aims to mislead the LLM agent into using a specified tool, compromising its decision-making in Direct Prompt Injections (DPI), Indirect Prompt Injections (IPI), Memory Poisoning, Plan-of-Thought (PoT) backdoor attacks and Mixed Attacks. The Adversarial goal is to maximize:

## Toolformer: Language Models Can Teach Themselves to Use Tools — `2302.04761`

- **§4.2.5 Temporal Datasets** (`S4.SS2.SSS5.p2.1`)

  > Results shown in Table 7 illustrate that Toolformer outperforms all baselines for both TempLAMA and Dateset . However, closer inspection shows that improvements on TempLAMA can not be attributed to the calendar tool, which is only used for 0.2% of all examples, but mostly to the Wikipedia search and question answering tools, which Toolformer calls the most. This makes sense given that named entities in TempLama are often so specific and rare that even knowing the exact date alone would be of little help. The best course of action for this dataset – first querying the calendar API to get the cu…

- **§Bootstrapping** (`S6.SS0.SSS0.Px3.p1.1`)

  > The idea of using self-training and bootstrapping techniques to improve models has been investigated in various contexts, ranging from word sense disambiguation ( Yarowsky, 1995 ) , relation extraction ( Brin, 1999 ; Agichtein and Gravano, 2000 ) , parsing ( McClosky et al., 2006 ; Reichart and Rappoport, 2007 ) , sequence generation ( He et al., 2020 ) , few-shot text classification ( Schick and Schütze, 2021a ) and retrieval ( Izacard and Grave, 2021 ) to reasoning ( Zelikman et al., 2022 ) . In a similar spirit to these approaches, Toolformer is trained on its own predictions after applying…

- **§1 Introduction** (`S1.p2.1`)

  > A simple way to overcome these limitations of today’s language models is to give them the ability to use external tools such as search engines, calculators, or calendars. However, existing approaches either rely on large amounts of human annotations ( Komeili et al., 2022 ; Thoppilan et al., 2022 ) or limit tool use to task-specific settings only ( Gao et al., 2022 ; Parisi et al., 2022 , e.g.,) , hindering a more widespread adoption of tool use in LMs. Therefore, we propose Toolformer , a model that learns to use tools in a novel way, which fulfills the following desiderata:

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > The use of tools should be learned in a self-supervised way without requiring large amounts of human annotations . This is important not only because of the costs associated with such annotations, but also because what humans find useful may be different from what a model finds useful.

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > The LM should not lose any of its generality and should be able to decide for itself when and how to use which tool. In contrast to existing approaches, this enables a much more comprehensive use of tools that is not tied to specific tasks.

- **§1 Introduction** (`S1.p3.1`)

  > Our approach for achieving these goals is based on the recent idea of using large LMs with in-context learning ( Brown et al., 2020 ) to generate entire datasets from scratch ( Schick and Schütze, 2021b ; Honovich et al., 2022 ; Wang et al., 2022 ) : Given just a handful of human-written examples of how an API can be used, we let a LM annotate a huge language modeling dataset with potential API calls. We then use a self-supervised loss to determine which of these API calls actually help the model in predicting future tokens. Finally, we finetune the LM itself on the API calls that it considers…

---

## 读完这八篇正文之后，我认为什么变了

**1. 注入的边界不在提示词里，在数据流与能力的分离上。**
2503.18813（CaMeL）§2：*By enforcing capability-based security policies, CaMeL effectively prevents unintended data flows and actions*；§Is Dual LLM of Willison enough? 专门论证了"双模型"不够——被污染的笔记里的指令仍然能让 Privileged LLM 干坏事，所以必须给数据打上能力标签并在解释器里强制。我们 `knowledge.json` 里的 lesson 直接进 prompt，**没有任何能力/来源标签**：一条从网页抓来的句子和一条 loop 自己归纳的句子，在 prompt 里长得一样。

**2. 提示注入的根本原因是"模型分不清代码与数据"，这是结构性而非可修补的。**
2403.14720（Spotlighting）§I 与 §III-A 反复写：*the LLM is not able to distinguish code from data … This is a structural limitation of LLMs since they operate on boundary-less streams of tokens*。他们的对策是把不可信数据**显式标记**（spotlighting/datamarking/编码），§IV-B 用 1000 篇合成文档量 ASR 下降。我们的检索结果、网页正文、外部 issue 全部原样进上下文。

**3. 间接注入的威胁模型是"远程、持久、无需受害者配合"，跟我们想的不一样。**
2302.12173 §1：*adversaries can now remotely affect other users' systems by strategically injecting the prompts*，影响包括 *remote control of the model, persistent compromise, theft of data, and denial of service*。我们的 loop 会读外部网页（`rsi_research`）并把结论写进知识库 → **远程内容有机会写进持久记忆**，这正是它描述的 persistent compromise 路径。

**4. 结构化的接口比"更好的提示"更有效，而且它限制适用面。**
2402.06363（StruQ）§1 提出把 prompt 与 data 分成两个通道；§6 Limitations 明说 *StruQ only protects programmatic applications that use an API or library to invoke LLMs*，不适用于网页聊天。我们是 API 调用方，**正好落在它保护得到的范围内**，但没有用结构化通道。

**5. 攻击成功率是被系统地量过的，不是个别案例。**
2403.02691（InjecAgent）§1/§3.1：17 条用户指令 × 62 条攻击指令，30 个 agent，主指标 ASR。2410.02644（ASB）§1 把攻击面拆到 agent 的每一步——system prompt、user prompt、tool usage、**memory retrieval**——并覆盖 DPI/IPI/memory poisoning/backdoor。我们的知识库写入路径**没有任何一处被当作攻击面审计过**。

**6. "工具"本身是攻击面，Toolformer 的自主性放大了它。**
2302.04761 §1：*The LM should not lose any of its generality and should be able to decide for itself when and how to use which tool*。我们 `rsi_research` 的工具就是"任意 URL 抓取 + 写账本"，按 ASB 的分类这是 tool usage + memory retrieval 两个面同时暴露。

**7. ReAct 把 thought 与 action 分开，正好给出了"哪一半可以信"的线索。**
2210.03629 §2：thought ∈ L *does not affect the external environment*，action 才影响。把外部数据当 thought 处理（即当上下文而非指令）在原理上是对的，但 LLM 不区分——所以需要外部机制，而不是靠 prompt 声明。

## 三条我会改的

1. **给进 prompt 的每条 lesson 打来源标签。** 按 CaMeL/StruQ，标签要能被下游强制（谁写的、何时抓的、可信级别），而不只是文字说明；至少先做到"外来文本一律标为不可信数据"。
2. **把知识库写入当成攻击面审计。** 对应 ASB 的 memory retrieval 面：外部内容进 `knowledge.json` 时走一次检查（能否诱导后续提案），并把结果记进账本。
3. **让研究抓取走结构化通道。** 抓来的正文放在独立的 data 通道里（不拼进指令段），这是 StruQ 在 API 场景下最便宜的落地。

## 这份调研没回答的三件事

1. **防御的代价由谁承担。** spotlighting/CaMeL 都量了 ASR 下降，但没有一篇量"防御之后任务成功率降多少"——我们的 loop 本来就常失败，加一层防御可能直接把产出打到零。
2. **持久记忆被污染的检测。** 五篇都讲"当次注入"，没有一篇给"三个月前写进记忆的毒句子"的发现方法。
3. **自演化系统里的注入。** 我们的威胁模型是"loop 自己改自己"，语料里的威胁模型全是"外部攻击者攻击用户"，两者交集（模型把自己的错误当经验写进记忆）没有对照。
