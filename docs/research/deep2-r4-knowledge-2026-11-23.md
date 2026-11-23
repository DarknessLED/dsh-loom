# Deep reading: what the bodies actually say

Generated 2026-11-23 by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `memory`, `retrieval`, `consolidat`, `forget`, `transfer`, `context`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| MemGPT: Towards LLMs as Operating Systems (`2310.08560`) | 24 | 6 | graded ok (depth full) |
| A-Mem: Agentic Memory for LLM Agents (`2502.12110`) | 33 | 6 | graded ok (depth full) |
| Reflexion: Language Agents with Verbal Reinforcement Learning (`2303.11366`) | 42 | 6 | graded ok (depth full) |
| Voyager : An Open-Ended Embodied Agent with Large Language Models (`2305.16291`) | 46 | 6 | graded ok (depth full) |
| Mem0 : Building Production - Ready AI Agents with Scalable Long - Term Memory (`2504.19413`) | 38 | 6 | graded ok (depth full) |
| ReAct : Synergizing Reasoning and Acting in Language Models (`2210.03629`) | 50 | 6 | graded ok (depth full) |
| Generative Agents: Interactive Simulacra of Human Behavior (`2304.03442`) | 56 | 6 | graded ok (depth full) |
| MemoryBank: Enhancing Large Language Models with Long-Term Memory (`2305.10250`) | 25 | 6 | graded ok (depth full) |
| Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (`2005.11401`) | 47 | 6 | graded ok (depth full) |
| Agent Workflow Memory (`2409.07429`) | 43 | 6 | graded ok (depth full) |
| ExpeL: LLM Agents Are Experiential Learners (`2308.10144`) | 65 | 6 | graded ok (depth full) |
| Evaluating Very Long-Term Conversational Memory of LLM Agents (`2402.17753`) | 54 | 6 | graded ok (depth full) |
| LongMemEval : Benchmarking Chat Assist- ants on Long-Term Interactive Memory (`2410.10813`) | 63 | 6 | graded ok (depth full) |
| Zep: A Temporal Knowledge Graph Architecture for Agent Memory (`2501.13956`) | 26 | 6 | graded ok (depth full) |
| ALFWorld: Aligning Text and Embodied Environments for Interactive Learning (`2010.03768`) | 40 | 6 | graded ok (depth full) |
| Language Models are Few-Shot Learners (`2005.14165`) | 55 | 6 | graded ok (depth full) |
| LoRA: Low-Rank Adaptation of Large Language Models (`2106.09685`) | 41 | 6 | graded ok (depth full) |
| Memory-R1: Enhancing Large Language Model Agents to Manage and Utilize Memories via Reinforcement Learning (`2508.19828`) | 52 | 6 | graded ok (depth full) |
| Qwen3 Technical Report (`2505.09388`) | 37 | 6 | graded ok (depth full) |
| SkillRL : Evolving Agents via Recursive Skill-Augmented Reinforcement Learning (`2602.08234`) | 30 | 6 | graded ok (depth full) |
| SWE-bench: Can Language Models Resolve Real-World GitHub Issues? (`2310.06770`) | 44 | 6 | graded ok (depth full) |
| DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (`2402.03300`) | 47 | 6 | graded ok (depth full) |
| LightMem: Lightweight and Efficient Memory-Augmented Generation (`2510.18866`) | 39 | 6 | graded ok (depth full) |
| Lost in the Middle: How Language Models Use Long Contexts (`2307.03172`) | 34 | 6 | graded ok (depth full) |
| Memento: Fine-tuning LLM Agents without Fine-tuning LLMs (`2508.16153`) | 31 | 6 | graded ok (depth full) |
| Memory OS of AI Agent (`2506.06326`) | 40 | 6 | graded ok (depth full) |
| \titlefont MemOS : A Memory OS for AI System (`2507.03724`) | 75 | 6 | graded ok (depth full) |
| M ​ e ​ m p Mem^{p} : Exploring Agent Procedural Memory (`2508.06433`) | 25 | 6 | graded ok (depth full) |
| Proximal policy optimization algorithms (`1707.06347`) | 0 | 0 | unread: no rendered body: arXiv serves a pointer to the PDF |
| ReasoningBank : Scaling Agent Self-Evolving with Reasoning Memory (`2509.25140`) | 44 | 6 | graded ok (depth full) |
| Toolformer: Language Models Can Teach Themselves to Use Tools (`2302.04761`) | 55 | 6 | graded ok (depth full) |
| MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents (`2602.02474`) | 56 | 6 | graded ok (depth full) |
| Titans: Learning to Memorize at Test Time (`2501.00663`) | 32 | 6 | graded ok (depth full) |
| Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models (`2510.04618`) | 64 | 6 | graded ok (depth full) |
| Cognitive Architectures for Language Agents (`2309.02427`) | 23 | 6 | graded ok (depth full) |
| Dense Passage Retrieval for Open-Domain Question Answering (`2004.04906`) | 34 | 6 | graded ok (depth full) |
| From RAG to Memory: Non-Parametric Continual Learning for Large Language Models (`2502.14802`) | 41 | 6 | graded ok (depth full) |
| HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models (`2405.14831`) | 38 | 6 | graded ok (depth full) |
| MEM1 : Learning to Synergize Memory and Reasoning for Efficient Long-Horizon Agents (`2506.15841`) | 43 | 6 | graded ok (depth full) |
| 1Overview of self-evolving results of Memento-Skills on two benchmarks. (a,b) depict the progressive improvement in task performance across reflective learning rounds on HLE and GAIA. (c,d) depict the corresponding growth of the skill memory, while organising learned skills into semantically meaningful clusters. (`2603.18743`) | 23 | 6 | graded ok (depth full) |
| MIRIX: Multi-Agent Memory System for LLM-Based Agents (`2507.07957`) | 39 | 6 | graded ok (depth full) |
| Progressive Neural Networks (`1606.04671`) | 21 | 6 | graded ok (depth full) |

## MemGPT: Towards LLMs as Operating Systems — `2310.08560`

- **§2.3 Function executor (handling of completion tokens )** (`S2.SS3.p1.1`)

  > MemGPT orchestrates data movement between main context and external context via function calls that are generated by the LLM processor. Memory edits and retrieval are entirely self-directed: MemGPT autonomously updates and searches through its own memory based on the current context. For instance, it can decide when to move items between contexts (e.g. when the conversation history is becoming too long, as show in Figure 1 ) and modify its main context to better reflect its evolving understanding of its current objectives and responsibilities (as shown in Figure 3 ). We implement self-directed…

- **§2.3 Function executor (handling of completion tokens )** (`S2.SS3.p2.1`)

  > During each inference cycle, LLM processor takes main context (concatenated into a single string) as input, and generates an output string. This output string is parsed by MemGPT to ensure correctness, and if the parser validates the function arguments the function is executed. The results, including any runtime errors that occur (e.g. trying to add to main context when it is already at maximum capacity), are then fed back to the processor by MemGPT. This feedback loop enables the system to learn from its actions and adjust its behavior accordingly. Awareness of context limits is a key aspect…

- **§1 Introduction** (`S1.p2.1`)

  > Directly extending the context length of transformers incurs a quadratic increase in computational time and memory cost due to the transformer architecture’s self-attention mechanism, making the design of new long-context architectures a pressing research challenge ( Dai et al., 2019 ; Kitaev et al., 2020 ; Beltagy et al., 2020 ) . While developing longer models is an active area of research ( Dong et al., 2023 ) , even if we could overcome the computational challenges of context scaling, recent research shows that long-context models struggle to utilize additional context effectively ( Liu et…

- **§1 Introduction** (`S1.p3.1`)

  > In this paper, we study how to provide the illusion of an infinite context while continuing to use fixed-context models. Our approach borrows from the idea of virtual memory paging that was developed to enable applications to work on datasets that far exceed the available memory by paging data between main memory and disk. We leverage the recent progress in function calling abilities of LLM agents ( Schick et al., 2023 ; Liu et al., 2023b ) to design MemGPT, an OS-inspired LLM system for virtual context management . Using function calls, LLM agents can read and write to external data sources,…

- **§1 Introduction** (`S1.p4.1`)

  > These capabilities allow LLMs to effective “page” in and out information between context windows (analogous to “main memory” in operating systems) and external storage, similar to hierarchical memory in traditional OSes. In addition, function calls can be leveraged to manage control flow between context management, response generation, and user interactions. This allows for an agent to choose to iteratively modify what is in its context for a single task, thereby more effectively utilizing its limited context.

- **§1 Introduction** (`S1.p5.1`)

  > In MemGPT, we treat context windows as a constrained memory resource, and design a memory hiearchy for LLMs analogous to memory tiers used in traditional OSes ( Patterson et al., 1988 ) . Applications in traditional OSes interact with virtual memory , which provides an illusion of there being more memory resources than are actually available in physical (i.e., main) memory by the OS paging overflow data to disk and retrieving data (via a page fault) back into memory when accessed by applications. To provide a similar illusion of longer context length (analogous to virtual memory), we allow the…

## A-Mem: Agentic Memory for LLM Agents — `2502.12110`

- **§2.2 Retrieval-Augmented Generation** (`S2.SS2.p2.1`)

  > However, while agentic RAG approaches demonstrate agency in the retrieval phase by autonomously deciding when and what to retrieve [ 4 , 14 , 38 ] , our agentic memory system exhibits agency at a more fundamental level through the autonomous evolution of its memory structure. Inspired by the Zettelkasten method, our system allows memories to actively generate their own contextual descriptions, form meaningful connections with related memories, and evolve both their content and relationships as new experiences emerge. This fundamental distinction in agency between retrieval versus storage and e…

- **§3.1 Note Construction** (`S3.SS1.p1.4`)

  > By using LLMs to generate enriched components, we enable autonomous extraction of implicit knowledge from raw interactions. The multi-faceted note structure ( K i K_{i} , G i G_{i} , X i X_{i} ) creates rich representations that capture different aspects of the memory, facilitating nuanced organization and retrieval. Additionally, the combination of LLM-generated semantic components with dense vector representations provides both context and computationally efficient similarity matching.

- **§3.2 Link Generation** (`S3.SS2.p1.4`)

  > Each generated link l i l_{i} is structured as: L i = { m i , … , m k } L_{i}=\{m_{i},...,m_{k}\} . By using embedding-based retrieval as an initial filter, we enable efficient scalability while maintaining semantic relevance. A-Mem can quickly identify potential connections even in large memory collections without exhaustive comparison. More importantly, the LLM-driven analysis allows for nuanced understanding of relationships that goes beyond simple similarity metrics. The language model can identify subtle patterns, causal relationships, and conceptual connections that might not be apparent…

- **§3.4 Retrieve Relative Memory** (`S3.SS4.p1.1`)

  > In each interaction, our A-Mem performs context-aware memory retrieval to provide the agent with relevant historical information. Given a query text q q from the current interaction, we first compute its dense vector representation using the same text encoder used for memory notes:

- **§4.3 Empricial Results** (`S4.SS3.p1.1`)

  > Performance Analysis. In our empirical evaluation, we compared A-Mem with four competitive baselines including LoCoMo [ 22 ] , ReadAgent [ 17 ] , MemoryBank [ 39 ] , and MemGPT [ 25 ] on the LoCoMo dataset. For non-GPT foundation models, our A-Mem consistently outperforms all baselines across different categories, demonstrating the effectiveness of our agentic memory approach. For GPT-based models, while LoCoMo and MemGPT show strong performance in certain categories like Open Domain and Adversial tasks due to their robust pre-trained knowledge in simple fact retrieval, our A-Mem demonstrates…

- **§4.5 Hyperparameter Analysis** (`S4.SS5.p1.1`)

  > We conducted extensive experiments to analyze the impact of the memory retrieval parameter k, which controls the number of relevant memories retrieved for each interaction. As shown in Figure 3 , we evaluated performance across different k values (10, 20, 30, 40, 50) on five categories of tasks using GPT-4o-mini as our base model. The results reveal an interesting pattern: while increasing k generally leads to improved performance, this improvement gradually plateaus and sometimes slightly decreases at higher values. This trend is particularly evident in Multi Hop and Open Domain tasks. The ob…

## Reflexion: Language Agents with Verbal Reinforcement Learning — `2303.11366`

- **§Actor** (`S3.SS0.SSS0.Px1.p1.1`)

  > The Actor is built upon a large language model (LLM) that is specifically prompted to generate the necessary text and actions conditioned on the state observations. Analogous to traditional policy-based RL setups, we sample an action or generation, a t a_{t} , from the current policy π θ \pi_{\theta} at time t t , receive an observation from the environment o t o_{t} . We explore various Actor models, including Chain of Thought [ 26 ] and ReAct [ 30 ] . These diverse generation models allow us to explore different aspects of text and action generation within the Reflexion framework, providing…

- **§Memory** (`S3.SS0.SSS0.Px4.p1.1`)

  > Core components of the Reflexion process are the notion of short-term and long-term memory. At inference time, the Actor conditions its decisions on short and long-term memory, similar to the way that humans remember fine-grain recent details while also recalling distilled important experiences from long-term memory. In the RL setup, the trajectory history serves as the short-term memory while outputs from the Self-Reflection model are stored in long-term memory. These two memory components work together to provide context that is specific but also influenced by lessons learned over several tr…

- **§The Reflexion process** (`S3.SS0.SSS0.Px5.p1.1`)

  > Reflexion is formalized as an iterative optimization process in 1 . In the first trial, the Actor produces a trajectory τ 0 \tau_{0} by interacting with the environment. The Evaluator then produces a score r 0 r_{0} which is computed as r t = M e ​ ( τ 0 ) r_{t}=M_{e}(\tau_{0}) . r t r_{t} is only a scalar reward for trial t t that improves as task-specific performance increases. After the first trial, to amplify r 0 r_{0} to a feedback form that can be used for improvement by an LLM, the Self-Reflection model analyzes the set of { τ 0 , r 0 } \{\tau_{0},r_{0}\} to produce a summary s ​ r 0 sr…

- **§Analysis** (`S4.SS2.SSS0.Px2.p1.1`)

  > We perform an ablation experiment to isolate the advantage of the self-reflective step for reasoning using CoT (GT) as the baseline approach 4 . Recall that CoT (GT) uses Chain-of-Thought reasoning with provided ground truth context, which tests reasoning ability over long contexts. Next, we add an element of episodic memory (EPM) by including the most recent trajectory. For the Reflexion agent, we implement the standard self-reflection step as a final pass. Intuitively, we test if the agent is iteratively learning more effectively by using verbal explanation using language written in the firs…

- **§1 Introduction** (`S1.p1.1`)

  > Recent works such as ReAct [ 30 ] , SayCan [ 1 ] , Toolformer [ 22 ] , HuggingGPT [ 23 ] , generative agents [ 19 ] , and WebGPT [ 17 ] have demonstrated the feasibility of autonomous decision-making agents that are built on top of a large language model (LLM) core. These methods use LLMs to generate text and ‘actions‘ that can be used in API calls and executed in an environment. Since they rely on massive models with an enormous number of parameters, such approaches have been so far limited to using in-context examples as a way of teaching the agents, since more traditional optimization schem…

- **§1 Introduction** (`S1.p2.1`)

  > In this paper, we propose an alternative approach called Reflexion that uses verbal reinforcement to help agents learn from prior failings. Reflexion converts binary or scalar feedback from the environment into verbal feedback in the form of a textual summary, which is then added as additional context for the LLM agent in the next episode. This self-reflective feedback acts as a ‘semantic’ gradient signal by providing the agent with a concrete direction to improve upon, helping it learn from prior mistakes to perform better on the task. This is akin to how humans iteratively learn to accomplis…

## Voyager : An Open-Ended Embodied Agent with Large Language Models — `2305.16291`

- **§1 Introduction** (`S1.p4.1`)

  > More specifically, Voyager attempts to solve progressively harder tasks proposed by the automatic curriculum , which takes into account the exploration progress and the agent’s state. The curriculum is generated by GPT-4 based on the overarching goal of “discovering as many diverse things as possible”. This approach can be perceived as an in-context form of novelty search [ 39 , 40 ] . Voyager incrementally builds a skill library by storing the action programs that help solve a task successfully. Each program is indexed by the embedding of its description, which can be retrieved in similar sit…

- **§1 Introduction** (`S1.p1.1`)

  > Building generally capable embodied agents that continuously explore, plan, and develop new skills in open-ended worlds is a grand challenge for the AI community [ 1 , 2 , 3 , 4 , 5 ] . Classical approaches employ reinforcement learning (RL) [ 6 , 7 ] and imitation learning [ 8 , 9 , 10 ] that operate on primitive actions, which could be challenging for systematic exploration [ 11 , 12 , 13 , 14 , 15 ] , interpretability [ 16 , 17 , 18 ] , and generalization [ 19 , 20 , 21 ] . Recent advances in large language model (LLM) based agents harness the world knowledge encapsulated in pre-trained LLM…

- **§1 Introduction** (`S1.p2.1`)

  > Let us consider Minecraft as an example. Unlike most other games studied in AI [ 33 , 34 , 10 ] , Minecraft does not impose a predefined end goal or a fixed storyline but rather provides a unique playground with endless possibilities [ 23 ] . Minecraft requires players to explore vast, procedurally generated 3D terrains and unlock a tech tree using gathered resources. Human players typically start by learning the basics, such as mining wood and cooking food, before advancing to more complex tasks like combating monsters and crafting diamond tools. We argue that an effective lifelong learning a…

- **§1 Introduction** (`S1.p3.1`)

  > Towards these goals, we introduce Voyager , the first LLM-powered embodied lifelong learning agent to drive exploration, master a wide range of skills, and make new discoveries continually without human intervention in Minecraft. Voyager is made possible through three key modules (Fig. 2 ): 1) an automatic curriculum that maximizes exploration; 2) a skill library for storing and retrieving complex behaviors; and 3) a new iterative prompting mechanism that generates executable code for embodied control. We opt to use code as the action space instead of low-level motor commands because programs…

- **§1 Introduction** (`S1.p6.1`)

  > Empirically, Voyager demonstrates strong in-context lifelong learning capabilities. It can construct an ever-growing skill library of action programs that are reusable, interpretable, and generalizable to novel tasks. We evaluate Voyager systematically against other LLM-based agent techniques (e.g., ReAct [ 29 ] , Reflexion [ 30 ] , AutoGPT [ 28 ] ) in MineDojo [ 23 ] , an open-source Minecraft AI framework. Voyager outperforms prior SOTA by obtaining 3.3 × 3.3\times more unique items, unlocking key tech tree milestones up to 15.3 × 15.3\times faster, and traversing 2.3 × 2.3\times longer dist…

- **§2 Method** (`S2.I1.i4.p1.1`)

  > Additional context : We also leverage GPT-3.5 to self-ask questions based on the agent’s current state and exploration progress and self-answer questions. We opt to use GPT-3.5 instead of GPT-4 for standard NLP tasks due to budgetary considerations.

## Mem0 : Building Production - Ready AI Agents with Scalable Long - Term Memory — `2504.19413`

- **§1 Introduction** (`S1.p3.1`)

  > Unlike humans, who dynamically integrate new information and revise outdated beliefs, LLMs effectively “ reset " once information falls outside their context window ( Zhang, 2024 , Timoneda and Vera, 2025 ) . Even as models like OpenAI’s GPT-4 (128K tokens) ( Hurst et al., 2024 ) , o1 (200K context) ( Jaech et al., 2024 ) , Anthropic’s Claude 3.7 Sonnet (200K tokens) ( Anthropic, 2025 ) , and Google’s Gemini (at least 10M tokens) ( Team et al., 2024 ) push the boundaries of context length, these improvements merely delay rather than solve the fundamental limitation. In practical applications,…

- **§5 Conclusion and Future Work** (`S5.p1.1`)

  > We have introduced Mem0 and Mem0 g \texttt{Mem0}^{\tiny g} , two complementary memory architectures that overcome the intrinsic limitations of fixed context windows in LLMs. By dynamically extracting, consolidating, and retrieving compact memory representations, Mem0 achieves state-of-the-art performance across single - hop and multi - hop reasoning, while Mem0 g \texttt{Mem0}^{\tiny g} ’s graph - based extensions unlock significant gains in temporal and open - domain tasks. On the LOCOMO benchmark, our methods deliver 5%, 11%, and 7% relative improvements in single-hop, temporal, and multi-ho…

- **§1 Introduction** (`S1.p1.1`)

  > Human memory is a foundation of intelligence —it shapes our identity, guides decision-making, and enables us to learn, adapt, and form meaningful relationships ( Craik and Jennings, 1992 ) . Among its many roles, memory is essential for communication: we recall past interactions, infer preferences, and construct evolving mental models of those we engage with ( Assmann, 2011 ) . This ability to retain and retrieve information over extended periods enables coherent, contextually rich exchanges that span days, weeks, or even months. AI agents, powered by large language models (LLMs), have made re…

- **§1 Introduction** (`S1.p4.1`)

  > In this paper, we address a fundamental limitation in AI systems: their inability to maintain coherent reasoning across extended conversations across different sessions, which severely restricts meaningful long-term interactions with users. We introduce Mem0 (pronounced as mem-zero ), a novel memory architecture that dynamically captures, organizes, and retrieves salient information from ongoing conversations. Building on this foundation, we develop Mem0 g \texttt{Mem0}^{\tiny g} , which enhances the base architecture with graph-based memory representations to better model complex relationship…

- **§2.1 Mem0** (`S2.SS1.p2.1`)

  > The extraction phase initiates upon ingestion of a new message pair ( m t − 1 , m t ) (m_{t-1},m_{t}) , where m t m_{t} represents the current message and m t − 1 m_{t-1} the preceding one. This pair typically consists of a user message and an assistant response, capturing a complete interaction unit. To establish appropriate context for memory extraction, the system employs two complementary sources: (1) a conversation summary S S retrieved from the database that encapsulates the semantic content of the entire conversation history, and (2) a sequence of recent messages { m t − m , m t − m + 1…

- **§2.2 Mem0 g \texttt{Mem0}^{\tiny g}** (`S2.SS2.p6.1`)

  > The memory retrieval functionality in Mem0 g \texttt{Mem0}^{\tiny g} implements a dual-approach strategy for optimal information access. The entity-centric method first identifies key entities within a query, then leverages semantic similarity to locate corresponding nodes in the knowledge graph. It systematically explores both incoming and outgoing relationships from these anchor nodes, constructing a comprehensive subgraph that captures relevant contextual information. Complementing this, the semantic triplet approach takes a more holistic view by encoding the entire query as a dense embeddi…

## ReAct : Synergizing Reasoning and Acting in Language Models — `2210.03629`

- **§1 Introduction** (`S1.p1.1`)

  > A unique feature of human intelligence is the ability to seamlessly combine task-oriented actions with verbal reasoning (or inner speech, Alderson-Day & Fernyhough, 2015 ), which has been theorized to play an important role in human cognition for enabling self-regulation or strategization ( Vygotsky, 1987 ; Luria, 1965 ; Fernyhough, 2010 ) and maintaining a working memory ( Baddeley, 1992 ) . Consider the example of cooking up a dish in the kitchen. Between any two specific actions, we may reason in language in order to track progress (“now that everything is cut, I should heat up the pot of w…

- **§1 Introduction** (`S1.p2.1`)

  > Recent results have hinted at the possibility of combining verbal reasoning with interactive decision making in autonomous systems. On one hand, properly prompted large language models (LLMs) have demonstrated emergent capabilities to carry out several steps of reasoning traces to derive answers from questions in arithmetic, commonsense, and symbolic reasoning tasks ( Wei et al., 2022 ) . However, this “chain-of-thought” reasoning is a static black box, in that the model uses its own internal representations to generate thoughts and is not grounded in the external world, which limits its abili…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p1.1`)

  > Consider a general setup of an agent interacting with an environment for task solving. At time step t t , an agent receives an observation o t ∈ 𝒪 o_{t}\in\mathcal{O} from the environment and takes an action a t ∈ 𝒜 a_{t}\in\mathcal{A} following some policy π ⁡ ( a t | c t ) \pi(a_{t}|c_{t}) , where c t = ( o 1 , a 1 , ⋯ , o t − 1 , a t − 1 , o t ) c_{t}=(o_{1},a_{1},\cdots,o_{t-1},a_{t-1},o_{t}) is the context to the agent. Learning a policy is challenging when the mapping c t ↦ a t c_{t}\mapsto a_{t} is highly implicit and requires extensive computation. For example, the agent shown in Fig…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p2.1`)

  > The idea of ReAct is simple: we augment the agent’s action space to 𝒜 ^ = 𝒜 ∪ ℒ \mathcal{\hat{A}}=\mathcal{A}\cup\mathcal{L} , where ℒ \mathcal{L} is the space of language. An action a ^ t ∈ ℒ \hat{a}_{t}\in\mathcal{L} in the language space, which we will refer to as a thought or a reasoning trace , does not affect the external environment, thus leading to no observation feedback. Instead, a thought a ^ t \hat{a}_{t} aims to compose useful information by reasoning over the current context c t c_{t} , and update the context c t + 1 = ( c t , a ^ t ) c_{t+1}=(c_{t},\hat{a}_{t}) to support futu…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p3.1`)

  > However, as the language space ℒ \mathcal{L} is unlimited, learning in this augmented action space is difficult and requires strong language priors. In this paper, we mainly focus on the setup where a frozen large language model, PaLM-540B ( Chowdhery et al., 2022 ) 1 1 1 We show some GPT-3 ( Brown et al., 2020 ) results in Appendix A.1 , which outperforms PaLM-540B. , is prompted with few-shot in-context examples to generate both domain-specific actions and free-form language thoughts for task solving (Figure 1 (1d), (2b)). Each in-context example is a human trajectory of actions, thoughts, a…

- **§2 ReAct : Synergizing Re asoning + Act ing** (`S2.p4.1`)

  > Since decision making and reasoning capabilities are integrated into a large language model, ReAct enjoys several unique features: A) Intuitive and easy to design : Designing ReAct prompts is straightforward as human annotators just type down their thoughts in language on top of their actions taken. No ad-hoc format choice, thought design, or example selection is used in this paper. We detail prompt design for each task in Sections 3 and 4 . B) General and flexible : Due to the flexible thought space and thought-action occurrence format, ReAct works for diverse tasks with distinct action space…

## Generative Agents: Interactive Simulacra of Human Behavior — `2304.03442`

- **§Approach:** (`S4.SS1.SSSx2.p2.1`)

  > Our architecture implements a retrieval function that takes the agent’s current situation as input and returns a subset of the memory stream to pass on to the language model. There are many possible implementations of a retrieval function, depending on what is important for the agent to consider when deciding how to act. In our context, we focus on three main components that, together, produce effective results.

- **§1. Introduction** (`S1.p4.1`)

  > To enable generative agents, we describe an agent architecture that stores, synthesizes, and applies relevant memories to generate believable behavior using a large language model. Our architecture comprises three main components. The first is the memory stream , a long-term memory module that records, in natural language, a comprehensive list of the agent’s experiences. A memory retrieval model combines relevance, recency, and importance to surface the records needed to inform the agent’s moment-to-moment behavior. The second is reflection , which synthesizes memories into higher-level infere…

- **§1. Introduction** (`S1.I1.i3.p1.1`)

  > Two evaluations, a controlled evaluation and an end-to-end evaluation, that establish causal effects of the importance of components of the architecture, as well as identify breakdowns arising from, e.g., improper memory retrieval.

- **§2.3. Large Language Models and Human Behavior** (`S2.SS3.p2.1`)

  > We posit that, based on the work summarized above, large language models can become a key ingredient for creating believable agents. The existing literature largely relies on what could be considered first-order templates that employ few-shot prompts ( Gao et al., 2020 ; Liu et al., 2021 ) or chain-of-thought prompts ( Wei et al., 2023 ) . These templates are effective in generating behavior that is conditioned solely on the agent’s current environment (e.g., how would a troll respond to a given post, what actions would a robot need to take to enter a room given that there is a door). However,…

- **§Challenge:** (`S4.SS1.SSSx1.p1.1`)

  > Creating generative agents that can simulate human behavior requires reasoning about a set of experiences that is far larger than what should be described in a prompt, as the full memory stream can distract the model and does not even currently fit into the limited context window. Consider the Isabella agent answering the question, “What are you passionate about these days?” Summarizing all of Isabella’s experiences to fit in the limited context window of the language model produces an uninformative response, where Isabella discusses topics such as collaborations for events and projects and cl…

- **§Approach:** (`S4.SS1.SSSx2.p6.1`)

  > To calculate the final retrieval score, we normalize the recency, relevance, and importance scores to the range of [ 0 , 1 ] [0,1] using min-max scaling. The retrieval function scores all memories as a weighted combination of the three elements: s ​ c ​ o ​ r ​ e = α r ​ e ​ c ​ e ​ n ​ c ​ y ⋅ r ​ e ​ c ​ e ​ n ​ c ​ y + α i ​ m ​ p ​ o ​ r ​ t ​ a ​ n ​ c ​ e ⋅ i ​ m ​ p ​ o ​ r ​ t ​ a ​ n ​ c ​ e + α r ​ e ​ l ​ e ​ v ​ a ​ n ​ c ​ e ⋅ r ​ e ​ l ​ e ​ v ​ a ​ n ​ c ​ e score=\alpha_{recency}\cdot recency+\alpha_{importance}\cdot importance+\alpha_{relevance}\cdot relevance . In our impleme…

## MemoryBank: Enhancing Large Language Models with Long-Term Memory — `2305.10250`

- **§1 Introduction** (`S1.p2.1`)

  > Therefore, we introduce MemoryBank, a novel mechanism designed to provide LLMs with the ability to retain long-term memory and draw user portraits. MemoryBank enables LLMs to recall historical interactions, continually evolve their understanding of context, and adapt to a user’s personality based on past interactions, thereby enhancing their performance in long-term interaction scenarios. Inspired by the Ebbinghaus Forgetting Curve theory, a well-established psychological principle that describes how the strength of memory decreases over time, MemoryBank further incorporates a dynamic memory m…

- **§2 MemoryBank: A Novel Memory Mechanism Tailored for LLMs** (`S2.p1.1`)

  > In this section, we provide a detailed description of MemoryBank, our novel memory mechanism designed for LLMs. As shown in Fig. 1 , MemoryBank is a unified mechanism structured around three central pillars: (1) a memory storage (§ 2.1 ) serving as the primary data repository, (2) a memory retriever (§ 2.2 ) for context-specific memory recollection, and (3) a memory updater (§ 2.3 ) drawing inspiration from the Ebbinghaus Forgetting Curve theory, a time-tested psychological principle pertaining to memory retention and forgetting.

- **§2.2 Memory Retrieval** (`S2.SS2.p1.1`)

  > Built on the robust infrastructure of memory storage, our memory retrieval mechanism operates akin to a knowledge retrieval task. In this context, we adopt a dual-tower dense retrieval model similar to Dense Passage Retrieval ( Karpukhin et al., 2020 ) . In this paradigm, every turn of conversations and event summaries is considered as a memory piece m m , which is pre-encoded into a contextual representation h m h_{m} using the encoder model E ⁡ ( ⋅ ) E(\cdot) . Consequently, the entire memory storage M M is pre-encoded into 𝑴 = { 𝒉 m 0 , 𝒉 m 1 , … ​ 𝒉 m | M | } \bm{M}=\{\bm{h}^{0}_{m},\b…

- **§2.3 Memory Updating Mechanism** (`S2.SS3.p1.1`)

  > With the persistent memory storage and the memory retrieval mechanism discussed in § 2.1 and § 2.2 , the memorization capability of LLMs can be greatly enhanced. However, for scenarios that expect more anthropopathic memory behavior, memory updating is needed. These scenarios include AI companion, virtual IP, etc. Forgetting less important memory pieces that are long time ago and have not been recalled much can make the AI companion more natural.

- **§Evaluation Metrics** (`S4.SS2.SSS0.Px2.p1.1`)

  > The performance of models is assessed based on the following metrics. (1) Memory Retrieval Accuracy : Determines if related memory can be successfully retrieved (labels: { 0 : no , 1 : yes } \{0:\text{no},1:\text{yes}\} ). (2) Response Correctness : Evaluates if the response contains the correct answer to the probing question (labels: { 0 : wrong , 0.5 : partial , 1 : correct } \{0:\text{wrong},0.5:\text{partial},1:\text{correct}\} ). (3) Contextual Coherence : Assesses whether the response is naturally and coherently structured, connecting the dialogue context and retrieved memory (labels: 0…

- **§6 Conclusion** (`S6.p1.1`)

  > We present MemoryBank, a novel long-term memory mechanism designed to address the memory limitation of LLMs. MemoryBank enhances the ability to maintain context over time, recall relevant information, and understand user personality. Besides, the memory updating mechanism of MemoryBank draws inspiration from the Ebbinghaus Forgetting Curve theory, a psychological principle that describes the nature of memory retention and forgetting over time. This design improves the anthropomorphism of AI in long-term interactions scenarios. The versatility of MemoryBank is demonstrated through its accommoda…

## Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — `2005.11401`

- **§1 Introduction** (`S1.p1.1`)

  > Pre-trained neural language models have been shown to learn a substantial amount of in-depth knowledge from data [ 47 ] . They can do so without any access to an external memory, as a parameterized implicit knowledge base [ 51 , 52 ] . While this development is exciting, such models do have downsides: They cannot easily expand or revise their memory, can’t straightforwardly provide insight into their predictions, and may produce “hallucinations” [ 38 ] . Hybrid models that combine parametric memory with non-parametric (i.e., retrieval-based) memories [ 20 , 26 , 48 ] can address some of these…

- **§1 Introduction** (`S1.p2.1`)

  > We endow pre-trained, parametric-memory generation models with a non-parametric memory through a general-purpose fine-tuning approach which we refer to as retrieval-augmented generation (RAG). We build RAG models where the parametric memory is a pre-trained seq2seq transformer, and the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever. We combine these components in a probabilistic model trained end-to-end (Fig. 1 ). The retriever (Dense Passage Retriever [ 26 ] , henceforth DPR) provides latent documents conditioned on the input, and the…

- **§1 Introduction** (`S1.p4.1`)

  > Our results highlight the benefits of combining parametric and non-parametric memory with generation for knowledge-intensive tasks —tasks that humans could not reasonably be expected to perform without access to an external knowledge source. Our RAG models achieve state-of-the-art results on open Natural Questions [ 29 ] , WebQuestions [ 3 ] and CuratedTrec [ 2 ] and strongly outperform recent approaches that use specialised pre-training objectives on TriviaQA [ 24 ] . Despite these being extractive tasks, we find that unconstrained generation outperforms previous extractive approaches. For kn…

- **§Memory-based Architectures** (`S5.SS0.SSS0.Px4.p1.1`)

  > Our document index can be seen as a large external memory for neural networks to attend to, analogous to memory networks [ 64 , 55 ] . Concurrent work [ 14 ] learns to retrieve a trained embedding for each entity in the input, rather than to retrieve raw text as in our work. Other work improves the ability of dialog models to generate factual text by attending over fact embeddings [ 15 , 13 ] . A key feature of our memory is that it is comprised of raw text rather distributed representations, which makes the memory both (i) human-readable, lending a form of interpretability to our model, and (…

- **§6 Discussion** (`S6.p1.1`)

  > In this work, we presented hybrid generation models with access to parametric and non-parametric memory. We showed that our RAG models obtain state of the art results on open-domain QA. We found that people prefer RAG’s generation over purely parametric BART, finding RAG more factual and specific. We conducted an thorough investigation of the learned retrieval component, validating its effectiveness, and we illustrated how the retrieval index can be hot-swapped to update the model without requiring any retraining. In future work, it may be fruitful to investigate if the two components can be j…

- **§1 Introduction** (`S1.p3.1`)

  > There has been extensive previous work proposing architectures to enrich systems with non-parametric memory which are trained from scratch for specific tasks, e.g. memory networks [ 64 , 55 ] , stack-augmented networks [ 25 ] and memory layers [ 30 ] . In contrast, we explore a setting where both parametric and non-parametric memory components are pre-trained and pre-loaded with extensive knowledge. Crucially, by using pre-trained access mechanisms, the ability to access knowledge is present without additional training.

## Agent Workflow Memory — `2409.07429`

- **§2.1 Problem Statement** (`S2.SS1.p1.1`)

  > For the purpose of this paper, we consider agents with a language model backbone L L and text-based memory M M , where the base memory contains documentation of built-in actions such as CLICK and TYPE . 1 1 1 Memory is usually implemented as a system prompt or auxiliary information in the main prompt context. To solve a task specified by a natural language (NL) instruction q q , the agent acts in an environment defined by a transition function T T . For each time step t i t_{i} , the environment state s i s_{i} gives observation o i o_{i} , which is then passed into the model to generate actio…

- **§LM-based Workflow Induction** (`S2.SS3.SSS0.Px1.p2.1`)

  > Different from task instructions that specify concrete, less-repetitive tasks, e.g. , “Buy dry cat food on Amazon and deliver to my address”, we deliberately prompt models to induce workflows at finer granularities, i.e. , a sub-task “search for a product on Amazon” that frequently re-appears as part of multiple similar instructions. Meanwhile, instead of giving example-specific values (e.g. , “dry cat food”), we enhance workflow generality by abstracting out example-specific contexts, i.e. , replacing “dry cat food” with a more general name “{product-name}” by specifying this in the workflow…

- **§Enhancing Agents for Complex Tasks** (`S6.SS0.SSS0.Px2.p1.1`)

  > Many works improve agents by modifying their action space, such as constraining its action search space ( Liu et al., 2018 ) , enabling LM self-feedback to refine predicted actions ( Sun et al., 2023 ) , or incorporating human-designed actions to certain tasks ( Sodhi et al., 2023 ) . Other works explore ways to augment agent memory, such as adding example demonstrations in context ( Haluptzok et al., 2023 ; Zheng et al., 2024 ; Fu et al., 2024 ) . However, high-quality examples are not always available or easy to collect. Our AWM can flexibly operate even when auxiliary examples are non-exist…

- **§1 Introduction** (`S1.p1.1`)

  > Language model (LM) based agents are rapidly improving, and are now able to tackle digital tasks such as navigating the web ( Zhou et al., 2024 ; Deng et al., 2023 ) or operating mobile apps ( Rawles et al., 2023 ; Rawles et al., 2024 ) . Current agents mostly integrate a fixed set of given examples via training ( Fu et al., 2024 ; Murty et al., 2024 ) or in-context learning ( Zheng et al., 2024 ) . This allows them to perform well on action sequences similar to those presented in these examples, but results in a lack of robustness to changes in task contexts or environments ( Deng et al., 202…

- **§1 Introduction** (`S1.p2.1`)

  > Motivated by how humans abstract common task routines from past experiences and apply such knowledge to guide future activities ( Chi et al., 1981 ; Chi et al., 2014 ) , we propose agent workflow memory ( AWM ) (§ 2 ) to realize a similar mechanism in agents. AWM induces workflows from agent trajectories by extracting reusable routines, and then integrates these workflows into agent memory to guide future task-solving processes. Each workflow represents a goal with a common routine extracted from available action trajectories, which allows it to effectively capture the most essential and reusa…

- **§1 Introduction** (`S1.p3.1`)

  > AWM readily operates in both offline and online scenarios, where annotated examples are either available or non-existent. When high-quality annotated examples are available for a task, AWM operating in an offline fashion can extract reusable workflows from these canonical examples and integrate them into memory to assist test-time inference. Even if no annotated examples exist, AWM online can also run in an supervision-free setting , where it iteratively induces workflows from self-generated past predictions that are judged correct by an evaluator module.

## ExpeL: LLM Agents Are Experiential Learners — `2308.10144`

- **§2 Related Work** (`S2.p5.1`)

  > Self-improvement and Memory for LLM Agents: Agents like Reflexion showcase feedback-based improvement, yet often lack cross-task memory ( Shinn et al. 2023 ) . Other agents exhibit potential in persistent memory within multi-agent contexts ( Park et al. 2023 ; Maas et al. 2023 ) . Our ExpeL agent combines these approaches, focusing on task-solving while benefiting from self-generated in-context examples and abstracted insights from memory.

- **§Similar Experiences as Demonstrations** (`S4.SS2.SSSx1.p1.1`)

  > Works have shown that using in-context examples that are semantically similar to the task at hand results in better performance ( Liu et al. 2022 ) . Moreover, when involved in a novel situation, humans also recall from their memory similar tasks they’ve solved as references when attempting the task ( Kahneman 2011 ) . Motivated by these observations, we propose experience recall to retrieve successful trajectories from the experience pool gathered during training based on task similarity.

- **§4.3 Task Inference** (`S4.SS3.p1.1`)

  > After the agent gathers experiences, extracts insights from them, and sets up a vectorstore of successful trajectories, it can proceed to the evaluation. For each task, the task specifications will be augmented with the concatenation of the full list of extracted insights ι ^ = concat ⁡ ( ι 1 , ι 2 , ι 3 , … ) \hat{\iota}=\operatorname{concat}(\iota_{1},\iota_{2},\iota_{3},...) , and the top- k k trajectories with the highest task similarity will be retrieved and used as fewshot in-context examples, F similar tasks F_{\text{similar tasks}} . Fig. 3 shows an example prompt template structure, a…

- **§5.4 Transfer Learning** (`S5.SS4.p1.1`)

  > In this experiment, we use the HotpotQA dataset ( Yang et al. 2018 ) as source tasks and the FEVER dataset ( Thorne et al. 2018 ) as target tasks. Like the HotpotQA dataset, we equip the agent with the ability to navigate on Wikipedia using a Docstore API; therefore, we hypothesize that some of the knowledge obtained from HotpotQA tasks should also be beneficial when transferred to the FEVER tasks. We use gpt-4-0613 for adapting the HotpotQA insights into FEVER insights. We use the same fewshot examples to finetune the insights as the ones that will be used during task execution. We compare ou…

- **§5.4 Transfer Learning** (`S5.SS4.p2.1`)

  > Tab. 1 showcases the transfer learning results. Both agents that transferred knowledge from the source domain saw performance gains. Notably, the agent with a few in-context examples had a more significant improvement than the one without, indicating the effectiveness of the proposed “finetuning” method in transfer learning scenarios.

- **§Limitations** (`S6.SS0.SSSx1.p1.1`)

  > In this work, we investigated tasks with textual observation, which is limiting in real-world scenarios. Thus, incorporating image observations will make our method more generally applicable. Using Vision-Language Models or captioning models to supplement the LLM to enable image observations could be an interesting new avenue of research. Additionally, we investigated the efficacy of our method by using closed-source API LLMs, which can be off-limits in some applications. Exploring LLM agents using open-source LLMs should be another promising future work ( Zeng et al. 2023 ) . Furthermore, sin…

## Evaluating Very Long-Term Conversational Memory of LLM Agents — `2402.17753`

- **§1 Introduction** (`S1.p1.1`)

  > Despite recent advancements in dialogue models based on LLMs for extended contexts Bertsch et al. (2024) ; Xiao et al. (2023) , as well as the integration of retrieval augmented generation (RAG) techniques Shuster et al. (2021) ; Ram et al. (2023) ; Shi et al. (2023) , there is still a need for thorough evaluation of their efficacy in handling very long conversations. Indeed, studies in long-term open-domain dialogues have concentrated on assessing model responses within limited contexts e.g., ∼ \sim 1K tokens over five chat sessions Xu et al. (2022) ; Jang et al. (2023) ; Zhang et al. (2023)…

- **§1 Introduction** (`S1.p4.1`)

  > In this study, we present a holistic evaluation framework to assess an agent’s proficiency in managing and responding within long-term contexts (see Figure 2 ). First, agents need to “recall” past context correctly to integrate relevant information into future responses. We present a direct examination of their memory via a question answering (QA) task (§ 4.1 ). We classify questions into five distinct reasoning types to evaluate memory from multiple perspectives: single-hop, multi-hop, temporal, commonsense or world knowledge, and adversarial. Second, agents also need to recognize long-range…

- **§1 Introduction** (`S1.p6.1`)

  > (1) Long-context LLMs and RAG demonstrate effectiveness in QA tasks, improving ‘memory’ capabilities of LLMs (with improvements ranging from 22-66%), but still significantly lag behind human levels (by 56%), especially in temporal reasoning, (by 73%);

- **§Long-term Dialogue.** (`S2.SS0.SSS0.Px1.p1.1`)

  > Recent approaches involve retrieving historical context from a range of previous dialogues and reasoning over retrieved segments in a temporal order Lee et al. (2023b) ; Lu et al. (2023) ; Zhong et al. (2023) ; Liang et al. (2023) and/or using events to scaffold the dialogues Jang et al. (2023) ; Zhang et al. (2023) to enable consistency in long-term conversations. Some limitations of such frameworks are: (1) The accuracy of retrieval can be compromised, as the retrieval model is generally trained on tasks focusing on semantic similarity rather than specifically on such dialogues. Additionally…

- **§Question Answering.** (`S5.SS0.SSS0.Px1.p1.1`)

  > We evaluate three types of models: (1) Base LLMs operating with constrained context lengths where earlier dialogues are omitted i.e., Mistral-7B Jiang et al. (2023) , LLama-70B-chat Touvron et al. (2023) , gpt-3.5-turbo 5 5 5 https://platform.openai.com/docs/models/gpt-3-5 , and gpt-4-turbo 6 6 6 https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo ; (2) Long-context LLMs with an extended context window i.e., gpt-3.5-turbo-16k ; (3) Retrieval-augmented Generation (RAG) involves retrieving relevant context from a database of dialog history, observations (assertions about speakers; see…

- **§6.1 Question Answering Task** (`S6.SS1.p4.1`)

  > (2) LLMs struggle with open-domain knowledge and degrade in the RAG setting. This suggests that while certain open-domain knowledge may be embedded within the model’s parameters, introducing improper context from inaccurate retrieval can lead to a decline in performance Mallen et al. (2023) .

## LongMemEval : Benchmarking Chat Assist- ants on Long-Term Interactive Memory — `2410.10813`

- **§Long-Term Memory Methods** (`S2.SS0.SSS0.Px2.p1.1`)

  > To equip chat assistants with long-term memory capabilities, three major techniques are commonly explored. The first approach involves directly adapting LLMs to process extensive history information as long-context inputs ( Beltagy et al., 2020 ; Kitaev et al., 2020 ; Fu et al., 2024 ; An et al., 2024 ) . While this method avoids the need for complex architectures, it is inefficient and susceptible to the “lost-in-the-middle” phenomenon, where the ability of LLMs to utilize contextual information weakens as the input length grows ( Shi et al., 2023 ; Liu et al., 2024 ) . A second line of resea…

- **§Long-Context LLMs** (`S3.SS4.SSS0.Px2.p1.1`)

  > While LongMemEval poses a significant challenge to online memory systems, is the benchmark easily tackled with offline reading over the entire history? In Figure 3(b) , we evaluated four advanced long-context LLMs on LongMemEval S (with a history length of approximately 115k tokens): GPT-4o, Llama 3.1 Instruct ( Dubey et al., 2024 ) , and Phi-3 ( Abdin et al., 2024a ) . Compared to the oracle retrieval setting (answering with only the evidence sessions as the context), these LLMs showed a 30% to 60% performance decline when tasked with reading the entire LongMemEval S history, regardless of wh…

- **§CP 4: Reading Strategy** (`S4.SS2.SSS0.Px4.p1.1`)

  > Answering complex queries may require recalling numerous memory items. Although the retrieval accuracy can be enhanced through the preceding designs, it does not guarantee that the LLM can effectively reason over the extensive context ( Shi et al., 2023 ; Liu et al., 2024 ) . In Section 5.5 , we explore reading strategies and demonstrate that optimizations such as extracting key information before answering (Chain-of-Note, ( Yu et al., 2023 ) ) and using structured format prompting ( Yin et al., 2023 ) are crucial for achieving high reading performance.

- **§5.5 Improving reading with chain-of-note and structured format** (`S5.SS5.p1.1`)

  > As LongMemEval requires syntheses across multiple sessions, even an optimal memory retrieval mechanism needs to return a long context to capture all relevant information. To enhance the model’s ability to handle long retrieved contexts, we apply two key optimizations. First, we present retrieved items in a structured JSON format ( Yin et al., 2023 ) , which helps the model clearly recognize memory items as the data for reading. Additionally, we apply the Chain-of-Note (CoN) reading approach ( Yu et al., 2023 ) , instructing the LLM to first extract information from each memory item and then re…

- **§6 Conclusion** (`S6.p1.1`)

  > In this paper, we introduced LongMemEval , a comprehensive and challenging benchmark designed to evaluate the long-term memory abilities of chat assistants across five core memory tasks: information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention. Through extensive experiments with both commercial systems and long-context LLMs, we demonstrated the significant challenges posed by LongMemEval , with current systems exhibiting substantial performance drops. By analyzing key design choices across indexing, retrieval, and reading stages, we proposed effect…

- **§1 Introduction** (`S1.p2.1`)

  > Despite these advances, there has been limited progress in holistically evaluating the memory capability in long-term interactions. While several benchmarks evaluate LLMs on understanding long chat histories ( Xu et al., 2022a ; Xu et al., 2022b ; Zhong et al., 2024 ; Maharana et al., 2024 ; Du et al., 2024 ; Kim et al., 2024 ) , they have two major shortcomings. First, they do not accurately reflect user-AI interactions: many focus solely on human-human conversations ( Xu et al., 2022a ; Maharana et al., 2024 ; Kim et al., 2024 ) , while others omit task-oriented dialogues, which represent a…

## Zep: A Temporal Knowledge Graph Architecture for Agent Memory — `2501.13956`

- **§3 Memory Retrieval** (`S3.p1.1`)

  > The memory retrieval system in Zep provides powerful, complex, and highly configurable functionality. At a high level, the Zep graph search API implements a function f : S → S f:S\to S that accepts a text-string query α ∈ S \alpha\in S as input and returns a text-string context β ∈ S \beta\in S as output. The output β \beta contains formatted data from nodes and edges required for an LLM agent to generate an accurate response to query α \alpha . The process f ⁡ ( α ) → β f(\alpha)\to\beta comprises three distinct steps:

- **§4 Experiments** (`S4.p1.1`)

  > This section analyzes two experiments conducted using LLM-memory based benchmarks. The first evaluation employs the Deep Memory Retrieval (DMR) task developed in [ 3 ] , which uses a 500-conversation subset of the Multi-Session Chat dataset introduced in "Beyond Goldfish Memory: Long-Term Open-Domain Conversation" [ 22 ] . The second evaluation utilizes the LongMemEval benchmark from "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory" [ 7 ] . Specifically, we use the LongMemEval s dataset, which provides an extensive conversation context of on average 115,000 tokens.

- **§4.2 Deep Memory Retrieval (DMR)** (`S4.SS2.p4.1`)

  > The limitations of the DMR evaluation extend beyond its small scale. Our analysis revealed significant weaknesses in the benchmark’s design. The evaluation relies exclusively on single-turn, fact-retrieval questions that fail to assess complex memory understanding. Many questions contain ambiguous phrasing, referencing concepts like "favorite drink to relax with" or "weird hobby" that were not explicitly characterized as such in the conversations. Most critically, the dataset poorly represents real-world enterprise use cases for LLM agents. The high performance achieved by simple full-context…

- **§1 Introduction** (`S1.p3.1`)

  > Current approaches using RAG have focused on broad domain knowledge and largely static corpora—that is, document contents added to a corpus seldom change. For agents to become pervasive in our daily lives, autonomously solving problems from trivial to highly complex, they will need access to a large corpus of continuously evolving data from users’ interactions with the agent, along with related business and world data. We view empowering agents with this broad and dynamic "memory" as a crucial building block to actualize this vision, and we argue that current RAG approaches are unsuitable for…

- **§1 Introduction** (`S1.p5.1`)

  > As Zep is a production system, we’ve focused heavily on the accuracy, latency, and scalability of its memory retrieval mechanisms. We evaluate these mechanisms’ efficacy using two existing benchmarks: a Deep Memory Retrieval task (DMR) from MemGPT [ 3 ] , as well as the LongMemEval benchmark [ 7 ] .

- **§2.1 Episodes** (`S2.SS1.p1.1`)

  > Zep’s graph construction begins with the ingestion of raw data units called Episodes. Episodes can be one of three core types: message, text, or JSON. While each type requires specific handling during graph construction, this paper focuses on the message type, as our experiments center on conversation memory. In our context, a message consists of relatively short text (several messages can fit within an LLM context window) along with the associated actor who produced the utterance.

## ALFWorld: Aligning Text and Embodied Environments for Interactive Learning — `2010.03768`

- **§3.1 BUTLER::Brain (Text Agent) : o 0 , o t , g → a t :o_{0},o_{t},g\rightarrow a_{t}** (`S3.SS1.p1.1`)

  > BUTLER::Brain is a novel text-based game agent that generates high-level text actions in a token-by-token fashion akin to Natural Language Generation (NLG) approaches for dialogue ( Sharma et al.,, 2017 ) and summarization ( Gehrmann et al.,, 2018 ) . An overview of the agent’s architecture is shown in Figure 3 . At game step t t , the encoder takes the initial text observation o 0 o_{0} , current observation o t o_{t} , and the goal description g g as input and generates a context-aware representation of the current observable game state. The observation o 0 o_{0} explicitly lists all the nav…

- **§1 Introduction** (`S1.p4.1`)

  > Empowered by the ALFWorld framework, we introduce BUTLER ( B uilding U nderstanding in T extworld via L anguage for E mbodied R easoning), an agent that first learns to perform abstract tasks in TextWorld using Imitation Learning (IL) and then transfers the learned policies to embodied tasks in ALFRED. When operating in the embodied world, BUTLER leverages the abstract understanding gained from TextWorld to generate text-based actions; these serve as high-level subgoals that facilitate physical action generation by a low-level controller. Broadly, we find that BUTLER is capable of generalizing…

- **§1 Introduction** (`S1.I1.ix2.p1.1`)

  > BUTLER architecture : An agent that learns high-level policies in language that transfer to low-level embodied executions, and whose modular components can be independently upgraded.

- **§2 Aligning ALFRED and TextWorld** (`S2.p6.1`)

  > The TextWorld framework ( Côté et al.,, 2018 ) procedurally generates text-based environments for training and evaluating language-based agents. In order to extend TextWorld to create text-based analogs of each ALFRED scene, we adopt a common latent structure representing the state of the simulated world. ALFWorld uses PDDL - Planning Domain Definition Language ( McDermott et al.,, 1998 ) to describe each scene from ALFRED and to construct an equivalent text game using the TextWorld engine. The dynamics of each game are defined by the PDDL domain (see Appendix C for additional details). Textua…

- **§4 Experiments** (`S4.p1.1`)

  > We design experiments to answer the following questions: (1) How important is an interactive language environment versus a static corpus? (2) Do policies learnt in TextWorld transfer to embodied environments? (3) Can policies generalize to human-annotated goals? (4) Does pre-training in an abstract textual environment enable better generalization in the embodied world?

- **§4.2 Transferring to Embodied Tasks** (`S4.SS2.p1.1`)

  > Since TextWorld is an abstraction of the embodied world, transferring between modalities involves overcoming domain gaps that are present in the real world but not in TextWorld. For example, the physical size of objects and receptacles must be respected – while TextWorld will allow certain objects to be placed inside any receptacle, in the embodied world it might be impossible to put a larger object into a small receptacle (e.g. a large pot into a microwave).

## Language Models are Few-Shot Learners — `2005.14165`

- **§1 Introduction** (`S1.p1.1`)

  > Recent years have featured a trend towards pre-trained language representations in NLP systems, applied in increasingly flexible and task-agnostic ways for downstream transfer. First, single-layer representations were learned using word vectors [ 82 , 102 ] and fed to task-specific architectures, then RNNs with multiple layers of representations and contextual state were used to form stronger representations [ 24 , 81 , 100 ] (though still applied to task-specific architectures), and more recently pre-trained recurrent or transformer language models [ 134 ] have been directly fine-tuned, entir…

- **§1 Introduction** (`S1.p6.1`)

  > One potential route towards addressing these issues is meta-learning 1 1 1 In the context of language models this has sometimes been called “zero-shot transfer”, but this term is potentially ambiguous: the method is “zero-shot” in the sense that no gradient updates are performed, but it often involves providing inference-time demonstrations to the model, so is not truly learning from zero examples. To avoid this confusion, we use the term “meta-learning” to capture the inner-loop / outer-loop structure of the general method, and the term “in context-learning” to refer to the inner loop of meta…

- **§2.1 Model and Architectures** (`S2.SS1.p2.1`)

  > Table 2.1 shows the sizes and architectures of our 8 models. Here n params n_{\mathrm{params}} is the total number of trainable parameters, n layers n_{\mathrm{layers}} is the total number of layers, d model d_{\mathrm{model}} is the number of units in each bottleneck layer (we always have the feedforward layer four times the size of the bottleneck layer, d ff d_{\mathrm{ff}} = 4 ∗ d model =4\ast d_{\mathrm{model}} ), and d head d_{\mathrm{head}} is the dimension of each attention head. All models use a context window of n ctx = 2048 n_{\mathrm{ctx}}=2048 tokens. We partition the model across…

- **§7 Related Work** (`S7.p9.1`)

  > Another approach to increasing generality and transfer-learning capability in language models is multi-task learning [ 12 ] , which fine-tunes on a mixture of downstream tasks together, rather than separately updating the weights for each one. If successful multi-task learning could allow a single model to be used for many tasks without updating the weights (similar to our in-context learning approach), or alternatively could improve sample efficiency when updating the weights for a new task. Multi-task learning has shown some promising initial results [ 67 , 76 ] and multi-stage fine-tuning h…

- **§1 Introduction** (`S1.p8.1`)

  > Another recent trend in language modeling may offer a way forward. In recent years the capacity of transformer language models has increased substantially, from 100 million parameters [ 112 ] , to 300 million parameters [ 20 ] , to 1.5 billion parameters [ 117 ] , to 8 billion parameters [ 125 ] , 11 billion parameters [ 116 ] , and finally 17 billion parameters [ 132 ] . Each increase has brought improvements in text synthesis and/or downstream NLP tasks, and there is evidence suggesting that log loss, which correlates well with many downstream tasks, follows a smooth trend of improvement wit…

- **§1 Introduction** (`S1.p9.1`)

  > In this paper, we test this hypothesis by training a 175 billion parameter autoregressive language model, which we call GPT-3, and measuring its in-context learning abilities. Specifically, we evaluate GPT-3 on over two dozen NLP datasets, as well as several novel tasks designed to test rapid adaptation to tasks unlikely to be directly contained in the training set. For each task, we evaluate GPT-3 under 3 conditions: (a) “few-shot learning”, or in-context learning where we allow as many demonstrations as will fit into the model’s context window (typically 10 to 100), (b) “one-shot learning”,…

## LoRA: Low-Rank Adaptation of Large Language Models — `2106.09685`

- **§2 Problem Statement** (`S2.p2.1`)

  > Suppose we are given a pre-trained autoregressive language model P Φ ​ ( y | x ) P_{\Phi}(y|x) parametrized by Φ \Phi . For instance, P Φ ​ ( y | x ) P_{\Phi}(y|x) can be a generic multi-task learner such as GPT ( Radford et al., b ; Brown et al., 2020 ) based on the Transformer architecture ( Vaswani et al., 2017 ) . Consider adapting this pre-trained model to downstream conditional text generation tasks, such as summarization, machine reading comprehension (MRC), and natural language to SQL (NL2SQL). Each downstream task is represented by a training dataset of context-target pairs: 𝒵 = { (…

- **§2 Problem Statement** (`S2.p4.2`)

  > In the subsequent sections, we propose to use a low-rank representation to encode Δ ​ Φ \Delta\Phi that is both compute- and memory-efficient. When the pre-trained model is GPT-3 175B, the number of trainable parameters | Θ | |\Theta| can be as small as 0.01 % 0.01\% of | Φ 0 | |\Phi_{0}| .

- **§3 Aren’t Existing Solutions Good Enough?** (`S3.p1.1`)

  > The problem we set out to tackle is by no means new. Since the inception of transfer learning, dozens of works have sought to make model adaptation more parameter- and compute-efficient. See Section 6 for a survey of some of the well-known works. Using language modeling as an example, there are two prominent strategies when it comes to efficient adaptations: adding adapter layers ( Houlsby et al., 2019 ; Rebuffi et al., 2017 ; Pfeiffer et al., 2021 ; Rücklé et al., 2020 ) or optimizing some forms of the input layer activations ( Li & Liang, 2021 ; Lester et al., 2021 ; Hambardzumyan et al., 20…

- **§4.1 Low-Rank-Parametrized Update Matrices** (`S4.SS1.p4.1`)

  > No Additional Inference Latency. When deployed in production, we can explicitly compute and store W = W 0 + B ​ A W=W_{0}+BA and perform inference as usual. Note that both W 0 W_{0} and B ​ A BA are in ℝ d × k \mathbb{R}^{d\times k} . When we need to switch to another downstream task, we can recover W 0 W_{0} by subtracting B ​ A BA and then adding a different B ′ ​ A ′ B^{\prime}A^{\prime} , a quick operation with very little memory overhead. Critically, this guarantees that we do not introduce any additional latency during inference compared to a fine-tuned model by construction.

- **§4.2 Applying LoRA to Transformer** (`S4.SS2.p2.1`)

  > Practical Benefits and Limitations. The most significant benefit comes from the reduction in memory and storage usage. For a large Transformer trained with Adam, we reduce that VRAM usage by up to 2 / 3 2/3 if r ≪ d m ​ o ​ d ​ e ​ l r\ll d_{model} as we do not need to store the optimizer states for the frozen parameters. On GPT-3 175B, we reduce the VRAM consumption during training from 1.2TB to 350GB. With r = 4 r=4 and only the query and value projection matrices being adapted, the checkpoint size is reduced by roughly 10,000 × \times (from 350GB to 35MB) 4 4 4 We still need the 350GB model…

- **§6 Related Works** (`S6.p2.1`)

  > Prompt Engineering and Fine-Tuning. While GPT-3 175B can adapt its behavior with just a few additional training examples, the result depends heavily on the input prompt ( Brown et al., 2020 ) . This necessitates an empirical art of composing and formatting the prompt to maximize a model’s performance on a desired task, which is known as prompt engineering or prompt hacking. Fine-tuning retrains a model pre-trained on general domains to a specific task Devlin et al. (2019b) ; Radford et al. (a) . Variants of it include learning just a subset of the parameters Devlin et al. (2019b) ; Collobert &…

## Memory-R1: Enhancing Large Language Model Agents to Manage and Utilize Memories via Reinforcement Learning — `2508.19828`

- **§1 Introduction** (`S1.p2.1`)

  > One early effort is the Tensor Brain framework, which uses a bilayer tensor network with index and representation layers to model episodic, semantic, and working memory ( Tresp et al., 2023 ) . Recent studies augment LLMs with explicit external memory modules ( Zhang et al., 2024 ) , most of which adopt the retrieval-augmented generation (RAG) paradigm ( Pan et al., 2025 ; Salama et al., 2025 ) , appending retrieved memory entries to the model’s input prompt. While this extends access to past information, it also creates a fundamental retrieval challenge: heuristics may return too few entries,…

- **§1 Introduction** (`S1.p3.1`)

  > Equally important is the challenge of memory management : deciding what to remember, update, or discard. Some systems ( Packer et al., 2023 ; Modarressi et al., 2024 ; Xiong et al., 2025 ) adopt CRUD-style operations, namely create, read, update, and delete, which are adapted from databases ( Martin, 1983 ) . A more recent work ( AIOS Foundation, 2024 ) augments this paradigm with a search operator, while Mem0 ( Chhikara et al., 2025 ) investigates the operator set { ADD , UPDATE , DELETE , NOOP }. We adopt this setting, as it provides a minimal yet expressive framework for modeling memory dyn…

- **§2.1 Memory Augmented LLM-based Agents** (`S2.SS1.p1.1`)

  > LLMs have emerged as powerful general-purpose reasoners, capable of engaging in multi-turn dialogues, decomposing tasks into actionable steps, and leveraging prior context to guide decision making ( Brown et al., 2020 ; Chowdhery et al., 2022 ; OpenAI et al., 2024 ) . However, their reliance on fixed-length context windows limits their ability to retain information over extended interactions. To overcome this, recent work augments LLM agents with external memory modules, enabling long-horizon reasoning and persistent knowledge accumulation through selective storage, retrieval, and updating of…

- **§1 Introduction** (`S1.p1.1`)

  > Large Language Models (LLMs) have shown remarkable ability in understanding and generating natural language, making them central to recent advances in AI ( OpenAI et al., 2024 ; Qwen et al., 2025 ) . Yet, they remain fundamentally stateless ( Yu et al., 2025 ; Fan et al., 2025 ; Goodyear et al., 2025 ) : their memory is bounded by a finite context window and any information that falls outside this window is forgotten, preventing them from maintaining knowledge across long conversations or evolving tasks ( Wang et al., 2024 ; Fei et al., 2023 ) .

- **§1 Introduction** (`S1.p4.1`)

  > These challenges of retrieving and managing memory remain largely unsolved. Supervised fine-tuning provides limited help because it is impractical to label every memory operation or retrieval decision. Reinforcement learning (RL), in contrast, has recently shown strong potential for aligning LLM behavior with high-level objectives, including tool use ( Qian et al., 2025 ; Wang et al., 2025 ) , web navigation ( Wei et al., 2025 ) , and search optimization ( Jin et al., 2025 ; Song et al., 2025 ) . Building on this success, we argue that RL is the missing ingredient for adaptive memory in LLM ag…

- **§1 Introduction** (`S1.p5.1`)

  > In this paper, we present Memory-R1, an RL fine-tuned, memory-augmented LLM framework with two specialized agents: (1) a Memory Manager that performs structured memory operations to maintain and evolve the memory bank, and (2) an Answer Agent that applies a Memory Distillation policy to filter memories retrieved via Retrieval - Augmented Generation (RAG) and reason over the selected entries to produce answers. Both agents are fine-tuned using PPO ( Schulman et al., 2017 ) or GRPO ( Shao et al., 2024 ) , achieving strong performance with as few as 152 question–answer pairs. On the LoCoMo benchm…

## Qwen3 Technical Report — `2505.09388`

- **§4 Post-training** (`S4.I2.i5.p1.1`)

  > Abilities for Specialized Scenarios : In more specialized scenarios, we design tasks tailored to the specific context. For example, in Retrieval-Augmented Generation (RAG) tasks, we incorporate reward signals to guide the model toward generating accurate and contextually appropriate responses, thereby minimizing the risk of hallucination.

- **§Appendix A Appendix** (`A1.I1.i2.p1.1`)

  > In thinking mode, the model’s performance slightly degrades. We hypothesize that the thinking content does not provide significant benefits for these retrieval tasks, which do not rely on reasoning and may instead interfere with the retrieval process. We are committed to enhancing the long-context capability in the thinking mode in future versions.

- **§1 Introduction** (`S1.p4.1`)

  > The pre-training process for Qwen3 utilizes a large-scale dataset consisting of approximately 36 trillion tokens, curated to ensure linguistic and domain diversity. To efficiently expand the training data, we employ a multi-modal approach: Qwen2.5-VL ( Bai et al., 2025 ) is finetuned to extract text from extensive PDF documents. We also generate synthetic data using domain-specific models: Qwen2.5-Math ( Yang et al., 2024c ) for mathematical content and Qwen2.5-Coder ( Hui et al., 2024 ) for code-related data. The pre-training process follows a three-stage strategy. In the first stage, the mod…

- **§1 Introduction** (`S1.p5.1`)

  > To better align foundation models with human preferences and downstream applications, we employ a multi-stage post-training approach that empowers both thinking (reasoning) and non-thinking modes. In the first two stages, we focus on developing strong reasoning abilities through long chain-of-thought (CoT) cold-start finetuning and reinforcement learning focusing on mathematics and coding tasks. In the final two stages, we combine data with and without reasoning paths into a unified dataset for further fine-tuning, enabling the model to handle both types of input effectively, and we then apply…

- **§3 Pre-training** (`S3.I1.i3.p1.1`)

  > Long Context Stage : In the final pre-training stage, we collect high-quality long context corpora to extend the context length of Qwen3 models. All models are pre-trained on hundreds of billions of tokens with a sequence length of 32,768 tokens. The long context corpus includes 75% of text between 16,384 to 32,768 tokens in length, and 25% of text between 4,096 to 16,384 in length. Following Qwen2.5 ( Yang et al., 2024b ) , we increase the base frequency of RoPE from 10,000 to 1,000,000 using the ABF technique ( Xiong et al., 2023 ) . Meanwhile, we introduce YARN ( Peng et al., 2023 ) and Dua…

- **§4 Post-training** (`S4.I5.i4.p1.1`)

  > Agent & Coding : To test the model’s proficiency in coding and agent-based tasks, we use BFCL v3 ( Yan et al., 2024 ) , LiveCodeBench (v5, 2024.10-2025.02) ( Jain et al., 2024 ) , and Codeforces Ratings from CodeElo ( Quan et al., 2025 ) . For BFCL, all Qwen3 models are evaluated using the FC format, and yarn was used to deploy the models to a context length of 64k for Multi-Turn evaluation. Some baselines are derived from the BFCL leaderboard, taking the higher scores between FC and Prompt formats. For models not reported on the leaderboard, the Prompt formats are evaluated. For LiveCodeBench…

## SkillRL : Evolving Agents via Recursive Skill-Augmented Reinforcement Learning — `2602.08234`

- **§4.2 Main Results** (`S4.SS2.p4.1`)

  > 3) Advantage over Memory-Augmented RL. SkillRL substantially outperforms existing memory-augmented RL frameworks, which differ in how they manage and update experience. MemRL, which uses RL solely to update its memory bank while keeping the policy frozen, fails to adapt to complex environments, yielding only 21.4% on ALFWorld. EvolveR, which jointly updates the policy and memory bank, shows improvement (43.8%) but remains limited by its reliance on rough trajectory storage. To provide a more competitive baseline, we implemented Mem0+GRPO, which combines a state-of-the-art prompt-based memory m…

- **§4.1 Experimental Setup** (`S4.SS1.p2.1`)

  > Baselines. We compare SkillRL against four categories of competitive methods. First, we include closed-source LLMs, specifically GPT-4o [ 24 ] and Gemini-2.5-Pro [ 5 ] , which represent the state-of-the-art in general-purpose reasoning and instruction following. Second, we evaluate prompt-based agentic or memory-based methods, including ReAct [ 54 ] and Reflexion [ 34 ] , which rely on in-context prompting for multi-step reasoning, as well as Mem0 [ 4 ] , ExpeL [ 58 ] , and MemP [ 7 ] , which utilize external memory or experience pools to guide behavior without parameter updates. Third, we con…

- **§4.3 Analysis** (`S4.SS3.p5.1`)

  > Context Efficiency. To evaluate the impact of skill abstraction on inference overhead, we compare the average prompt length of SkillRL with a memory-augmented baseline using raw trajectories (Qwen2.5-7B with Raw Memory) in Figure 5 . The results reveal that while the raw memory approach suffers from a high and fluctuating token footprint (averaging ∼ \sim 1,450 tokens), SkillRL maintains a significantly leaner prompt (averaging < < 1,300 tokens), achieving approximately a 10.3% reduction in context length. This efficiency stems from our distillation mechanism, which compresses verbose environm…

- **§5 Related Work** (`S5.p2.1`)

  > Memory Mechanisms in Agents. To overcome the limitations of finite context windows and the inability of agents to learn from experience, external memory architectures have become a cornerstone of agent design [ 14 ] . Early systems primarily utilized a static RAG paradigm or stored raw trajectories as few-shot examples [ 42 , 4 , 55 , 45 ] . However, raw trajectories are often token-heavy and contain significant redundancy and noise, which can lead to performance degradation. Current research has moved toward self-improving memory, distilling interactions into higher-level insights or procedur…

- **§5 Related Work** (`S5.p3.1`)

  > Evolution of Agentic Skills and Reinforcement Learning. The development of agentic skills [ 2 ] , which are compact, reusable strategies that capture the essence of subtasks, is increasingly viewed through the lens of Continual Learning (CL) and RL. Traditional CL [ 30 ] focuses on knowledge preservation in predefined tasks, but self-evolving agents [ 9 , 51 , 22 ] aim for active skill acquisition in open-ended environments [ 7 , 44 ] . While RL is widely used to align LLMs [ 32 , 28 ] , or improve reasoning via rule-based verifiers [ 33 ] , applying it to agentic skills remains challenging du…

- **§6 Conclusion** (`S6.p1.1`)

  > We introduced SkillRL , a framework for skill-augmented reinforcement learning in LLM agents. By distilling raw trajectories into compact, reusable skills and enabling dynamic skill evolution during training, SkillRL achieves state-of-the-art performance on ALFWorld and WebShop while using substantially less context than memory-based approaches. Our work demonstrates that the abstraction from experience to skill is a powerful principle for building capable, sample-efficient agents.

## SWE-bench: Can Language Models Resolve Real-World GitHub Issues? — `2310.06770`

- **§2.3 Features of SWE-bench** (`S2.SS3.p7.1`)

  > Wide scope for possible solutions. The task of repository-scale code editing can serve as a level playing field to compare approaches ranging from retrieval and long-context models to decision-making agents, which could reason and act in code. SWE-bench also allows creative freedom, as models can generate novel solutions that may deviate from the reference PR.

- **§4.1 Retrieval-Based Approach** (`S4.SS1.p2.1`)

  > To address this issue for our baselines, we simply use a generic retrieval system to select the files to insert as context. In particular, we evaluate models under two relevant context settings: 1) sparse retrieval and 2) an oracle retrieval.

- **§4.1 Retrieval-Based Approach** (`S4.SS1.p3.1`)

  > Sparse retrieval. Dense retrieval methods are ill-suited to our setting due to very long key and query lengths, and especially the unusual setting of retrieving code documents with natural language queries. Therefore, we choose to use BM25 retrieval ( Robertson et al., 2009 ) to retrieve relevant files to provide as context for each task instance. We experiment with three different maximum context limits, and simply retrieve as many files as fits within the specified limit. We evaluate each model on all limits that fit within its context window and report the best performance. From observation…

- **§4.1 Retrieval-Based Approach** (`S4.SS1.p4.1`)

  > “Oracle” retrieval. For analysis purposes we also consider a setting where we “retrieve” the files edited by the reference patch that solved the issue on GitHub. This “oracle” setting is less realistic, since an engineer working on addressing an issue may not know a priori which files need to be modified. In addition, this setting is also not necessarily comprehensive since edited files alone may not include all the required context to understand exactly how software will behave when interacting with unseen parts of the code.

- **§4.1 Retrieval-Based Approach** (`S4.SS1.p5.1`)

  > We compare the BM25 retrieval results with those of the “oracle” retrieval setting, as shown in Table 3 . We observe that in approximately 40 % 40\% of instances, BM25 retrieves a superset of the oracle files for the 27 ​ t ​ r ​ u ​ e ​ 000 27true000 -token context limit. However, in almost half of the instances with the 27 ​ t ​ r ​ u ​ e ​ 000 27true000 -token limit, it retrieves none of the files from the “oracle” context.

- **§5 Results** (`S5.p2.1`)

  > To analyze the importance of the retriever to the overall system results, we present the “oracle” retrieval results in Appendix Table 18 . There, Claude 2 is able to resolve 4.8 % 4.8\% of issues using the “oracle” retriever. We further analyze the importance of context in the discussion below.

## DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models — `2402.03300`

- **§4.1.1 From PPO to GRPO** (`S4.SS1.SSS1.p2.1`)

  > As the value function employed in PPO is typically another model of comparable size as the policy model, it brings a substantial memory and computational burden. Additionally, during RL training, the value function is treated as a baseline in the calculation of the advantage for variance reduction. While in the LLM context, usually only the last token is assigned a reward score by the reward model, which may complicate the training of a value function that is accurate at each token. To address this, as shown in Figure 4 , we propose Group Relative Policy Optimization (GRPO), which obviates the…

- **§2.2.1 Training Setting** (`S2.SS2.SSS1.p1.1`)

  > We apply math training to a general pre-trained language model with 1.3B parameters, which shares the same framework as the DeepSeek LLMs ( DeepSeek-AI, 2024 ) , denoted as DeepSeek-LLM 1.3B. We separately train a model on each mathematical corpus for 150B tokens. All experiments are conducted using the efficient and light-weight HAI-LLM ( High-flyer, 2023 ) training framework. Following the training practice of DeepSeek LLMs, we use the AdamW optimizer ( Loshchilov and Hutter, 2017 ) with β 1 = 0.9 \beta_{1}=0.9 , β 2 = 0.95 \beta_{2}=0.95 , and weight ​ _ ​ decay = 0.1 \mathrm{weight\_decay}…

- **§3.2 Training and Evaluating DeepSeekMath-Instruct 7B** (`S3.SS2.p1.1`)

  > In this section, we introduce DeepSeekMath-Instruct 7B which undergoes mathematical instruction tuning based on DeepSeekMath-Base. Training examples are randomly concatenated until reaching a maximum context length of 4K tokens. We train the model for 500 steps with a batch size of 256 and a constant learning rate of 5e-5.

- **§5 Discussion** (`S5.I2.i2.p1.1`)

  > Training on a mixture of 400B Code Tokens and 150B Math Tokens : Math training following code training degrades coding performance. We investigate whether code tokens, when mixed with math tokens for one-stage training, would still improve mathematical reasoning and also alleviate the problem of catastrophic forgetting.

- **§Results** (`S5.SS1.SSS1.Px1.p2.1`)

  > Code training benefits program-aided mathematical reasoning, both under the two-stage training and one-stage training settings. As shown in Table 6 , under the two-stage training setting, code training alone already significantly enhances the ability to solve GSM8K and MATH problems using Python. Math training in the second stage yields further improvements. Interestingly, under the one-stage training setting, mixing code tokens and math tokens effectively mitigates the issue of catastrophic forgetting that arises from two-stage training, and also synergizes coding (Table 7 ) and program-aided…

- **§Data Source** (`S5.SS2.SSS3.Px1.p1.1`)

  > Data source is the raw material of all training methods. In the context of RL, we specifically refer to the data source as the unlabeled questions with the outputs sampled from the policy model. In this paper, we only use the questions from the instruction tuning stage and a naive nucleus sampling to sample outputs. We think this is a potential reason that our RL pipeline only improves the Maj@K performance. In the future, we will explore our RL pipeline on out-of-distribution question prompts, in conjunction with advanced sampling (decoding) strategies , like those based on tree-search method…

## LightMem: Lightweight and Efficient Memory-Augmented Generation — `2510.18866`

- **§2.1 Conventional Memory Systems for LLMs** (`S2.SS1.p1.1`)

  > We describe mainstream memory architectures pipeline in terms of two major stages. (I) Memory Bank Construction. This stage can be further decomposed into three sub-stages: (a) Raw data D D are first processed at a chosen level of granularity, D ( g ) = f seg ​ ( D , g ) , g ∈ { turn , session , topic } D^{(g)}=f_{\text{seg}}(D;g),g\in\{\text{turn},\text{session},\text{topic}\} in dialog scenario; (b) The segmented data D ( g ) D^{(g)} are then summarized or extracted to generate memory entries, E = f sum ​ ( D ( g ) ) E=f_{\text{sum}}(D^{(g)}) , which are stored and organized within structura…

- **§1 Introduction** (`S1.p2.1`)

  > Note that a typical LLM memory system processes raw interaction data into manageable chunks, such as turn- or session-level in dialogue scenarios ( Xu et al., 2025 ; Li et al., 2025a ) , organizes them into long-term memory (e.g., databases or knowledge graphs) by indexing them into memory units, and continuously updates by adding new information and discarding outdated or conflicting content ( Zhong et al., 2024 ) . This enables retrieval of relevant memories, improving coherence, and personalization in long-context, multi-turn scenarios.

- **§1 Introduction** (`S1.p3.1`)

  > Challenges. Despite these advances, as shown in Figure 1 , contemporary memory systems still suffer from significant inefficiencies and consistency issues. First, in long interactions (e.g., dialogue scenarios), both user inputs and model responses often contain substantial redundant information ( Maharana et al., 2024 ; Wu et al., 2025 ) . Such information is typically irrelevant to downstream tasks or subsequent memory construction, and in some cases, may even negatively affect the model’s in-context learning capability ( Liu et al., 2023 ; Pan et al., 2025 ) . However, current mainstream me…

- **§1 Introduction** (`S1.p4.1`)

  > Building Lightweight Memory. Inspired by the efficiency and structure of human memory, we introduce LightMem . In particular, LightMem emulates human memory through three key components: (1) A pre-compression sensory memory module that filters redundant or low-value tokens from raw input and buffers the distilled content. (2) A topic-aware short-term memory that leverages semantic and topical similarity to dynamically group related utterances into coherent segments. By adaptively determining segment boundaries based on content instead of fixed window sizes, this module produces more concentrat…

- **§7 conclusion** (`S7.p1.1`)

  > In this work, we introduced LightMem, a lightweight and efficient memory framework designed to address the significant overhead of memory systems for LLM agents. Inspired by the multi-stage Atkinson-Shiffrin human memory model, LightMem’s architecture effectively filters, organizes, and consolidates information. Our empirical evaluation demonstrates that this approach maintains strong task performance while sharply reducing computational costs. In the near future, we plan to accelerate LightMem’s update phase via offline pre-computed KV caches, reducing runtime overhead. We aim to integrate a…

- **§1 Introduction** (`S1.p1.1`)

  > Memory is fundamental to intelligent agent, enabling the assimilation of prior experiences, contextual cues, and task-specific knowledge that underpin robust reasoning and decision-making ( Wang et al., 2024 ; Behrouz et al., 2024 ; Du et al., 2025 ; Zhang et al., 2024 ) . While Large Language Models (LLMs) ( DeepSeek-AI et al., 2025 ; Achiam et al., 2023 ) demonstrate remarkable capabilities across a wide range of tasks, they exhibit significant limitations when engaged in long-context or multi-turn interaction scenarios due to fixed context windows and the “lost in the middle” problem ( Liu…

## Lost in the Middle: How Language Models Use Long Contexts — `2307.03172`

- **§1 Introduction** (`S1.p2.1`)

  > Handling these use-cases requires language models to successfully operate over long sequences. Existing language models are generally implemented with Transformers ( Vaswani et al., 2017 ) , which require memory and compute that increases quadratically in sequence length. As a result, Transformer language models were often trained with relatively small context windows (between 512-2048 tokens). Recent improvements in hardware (e.g., faster GPUs with more memory) and algorithms ( Dai et al., 2019 ; Dao et al., 2022 ; Poli et al., 2023 ; Rubin and Berant, 2023 , inter alia ) have resulted in lan…

- **§1 Introduction** (`S1.p4.1`)

  > We first experiment with multi-document question answering, which requires models to reason over provided documents to find relevant information and use it to answer a given question; this task mimics the retrieval-augmented generation setup underlying many commercial generative search and question answering applications (e.g., Bing Chat). In this setting, we control (i) the input context length by changing the number of documents in the input context (akin to retrieving more or less documents in retrieval-augmented generation), and (ii) control the position of the relevant information within…

- **§1 Introduction** (`S1.p6.1`)

  > Given that language models struggle to retrieve and use relevant information in the multi-document question answering task, to what extent can language models even retrieve from their input contexts? We study this question with a synthetic key-value retrieval task, which is designed to be a minimal testbed for the basic ability to retrieve matching tokens from the input context. In this task, models are given a collection of JSON-formatted key-value pairs and must return the value associated with a specific key. Similar to the multi-document QA task, the key-value retrieval task admits control…

- **§2.1 Experimental Setup** (`S2.SS1.p3.1`)

  > To collect k − 1 k-1 distractor documents that do not contain the answer, we use a retrieval system (Contriever, fine-tuned on MS-MARCO; Izacard et al., 2021 ) to retrieve the k − 1 k-1 Wikipedia chunks that are most relevant to the query and do not contain any of the NaturalQuestions-annotated answers. 2 2 2 Ambiguity in NaturalQuestions-Open means that a small number of distractor passages may contain a reasonable answer. We additionally run experiments on subset of unambiguous questions, finding similar results and conclusions; see Appendix A . 3 3 3 We also explored using random documents…

- **§Closed models.** (`S2.SS2.SSS0.Px2.p1.1`)

  > We use the OpenAI API to experiment with GPT-3.5-Turbo and GPT-3.5-Turbo (16K). 5 5 5 We use the 0613 OpenAI model versions. GPT-3.5-Turbo has a maximum context length of 4K tokens, and GPT-3.5-Turbo (16K) is a version with an extended maximum context length of 16K tokens. We evaluate Claude-1.3 and Claude-1.3 (100K) with the Anthropic API; Claude-1.3 has a maximum context length of 8K tokens, and Claude-1.3 (100K) has an extended context length of 100K tokens. 6 6 6 We also evaluate GPT-4 (8K) on a subset of multi-document QA experiments, finding similar results and trends as other models (th…

- **§2.3 Results and Discussion** (`S2.SS3.p1.1`)

  > We experiment with input contexts containing 10, 20, and 30 total documents. Figure 5 presents multi-document question answering performance when varying the position of relevant information within the input context. To contextualize model performance, we also evaluate on the closed-book and oracle settings (Table 1 ). In the closed-book setting, models are not given any documents in their input context, and must rely on their parametric memory to generate the correct answer. On the other hand, in the oracle setting, language models are given the single document that contains the answer and mu…

## Memento: Fine-tuning LLM Agents without Fine-tuning LLMs — `2508.16153`

- **§2.3 Agent Memory Mechanism** (`S2.SS3.p2.1`)

  > LLM agents are increasingly equipped with long-term memory that grows and adapts over time, allowing them to accumulate knowledge, recall prior context, and adjust behaviour based on experience. MemoryBank ( Zhong et al., 2024 ) couples retrieval with an Ebbinghaus-style forgetting schedule so older, low-utility items decay while user-relevant facts are reinforced. Building on this idea, SAGE ( Liang et al., 2024 ) unifies reflection with an Ebbinghaus-based memory optimiser to support continual self-refinement. Mem0 ( Chhikara et al., 2025 ) adopts a structured memory mechanism with explicit…

- **§2.1 Continual-learning in LLM Agent Systems** (`S2.SS1.p1.1`)

  > Continual-learning strategies for LLM agents can be categorised into two camps. Parametric approaches ( Zhu et al., 2025b , Zhu et al., 2025a ) update the LLM through post-training (e.g., Reinforcement Learning ( Wang et al., 2025 ) ) or supervised fine-tuning (e.g., START ( Li et al., 2025a ) ), achieving high task fidelity at the expense of considerable compute, data, and the danger of catastrophic forgetting ( Li et al., 2024 ) . It is often assumed that achieving the capability to solve complex reasoning problems requires substantial changes to the model’s parameters, and therefore, full f…

- **§4.1 Framework** (`S4.SS1.p2.1`)

  > In the planning stage, Planner, instantiated as an LLM-driven CBR agent, receives the task instruction and queries the case memory for relevant case triplets ( s i , a i , r i ) i = 1 K {(s_{i},a_{i},r_{i})}_{i=1}^{K} , where s i s_{i} is the task, a i a_{i} is the plan, r i r_{i} indicates success, and K K is the retrieval count. This process is supported by a Case Memory module, which retrieves relevant experiences from a case bank through either a similarity-based retriever or online-updating Q-function, thus enabling the planner to leverage both parametric and non-parametric memory as prio…

- **§4.2 Case Memory Management** (`S4.SS2.p2.2`)

  > In this process, the state s t s_{t} is encoded using a frozen text encoder, while the action a t a_{t} and reward r t r_{t} are preserved in their original forms, as only the state representation requires vectorisation for subsequent retrieval operations. This Write operation is continuously performed throughout the agent’s execution, allowing the case bank to grow into a comprehensive and transferable repository of experiences incrementally. By accumulating both successes and failures, the memory not only enables retrospective analysis for informed avoidance of past mistakes but also provide…

- **§4.2 Case Memory Management** (`S4.SS2.p3.1`)

  > Non-Parametric Memory Retrieval. A cornerstone of Memento is its dynamically evolving Case Bank, which underpins its continual learning capability. At each planning step, this non-parametric memory module receives the task instruction and then retrieves relevant cases, comprising a mixture of successful and failed cases. This CBR method mirrors human analogical learning, where previously encountered outcomes shape decision-making ( Aamodt and Plaza, 1994 ) . Specifically, we retrieve the K \mathrm{K} nearest past cases from the case bank by computing the semantic similarity between the current…

- **§Abstract** (`Sx1.p1.1`)

  > In this paper, we introduce a novel learning paradigm for Adaptive Large Language Model (LLM) agents that eliminates the need for fine-tuning the underlying LLMs. Existing approaches are often either rigid, relying on static, handcrafted reflection workflows, or computationally intensive, requiring gradient updates of LLM model parameters. In contrast, our method enables low-cost continual adaptation via memory-based online reinforcement learning. We formalise this as a Memory-augmented Markov Decision Process (M-MDP), equipped with a neural case-selection policy to guide action decisions. Pas…

## Memory OS of AI Agent — `2506.06326`

- **§1 Introduction** (`S1.p2.1`)

  > To address this challenge, current memory mechanisms in default LLMs can be broadly categorized into three methodological types: (1) Knowledge-organization methods Xu et al. (2025) ; Liu et al. (2023) , such as A-Mem structure memory into interconnected semantic networks or notes to enable adaptive management and flexible retrieval; (2) Retrieval mechanism-oriented approaches Huang et al. (2024) ; Zhong et al. (2024) ; Li et al. (2024) , e.g., MemoryBank integrates semantic retrieval with a memory forgetting curve mechanism to allow long-term memory updating; and (3) Architecture-driven method…

- **§2.1 Memory for LLM Agents** (`S2.SS1.p1.1`)

  > Existing Large Language Models (LLMs) face fundamental challenges in handling complex scenarios requiring long-term coherence. These challenges stem from the inherent limitations of fixed-length designs, which struggle to maintain continuity in dialogues with significant temporal gaps, resulting in fragmented memory that manifests as factual inconsistencies and diminished personalization. Advancements in memory systems of LLMs addressing this problem can be broadly grouped into three categories: knowledge-organization, retrieval mechanism-oriented, and architecture-driven frameworks Zhang et a…

- **§1 Introduction** (`S1.p3.1`)

  > Inspired by memory management principles in operating systems, we pioneer the proposal of a comprehensive memory operating system, termed MemoryOS . As illustrated in Fig. 1 , MemoryOS comprises four core functional modules: memory Storage, Updating, Retrieval, and Generation . Through their coordinated collaboration, the system establishes a unified memory management framework encompassing hierarchical storage, dynamic updating, adaptive retrieval, and contextual generation. Specifically, Memory Storage organizes information into short-term, mid-term, and long-term storage units. Memory Updat…

- **§3.4 Memory Retrieval Module** (`S3.SS4.p1.1`)

  > The Memory Retrieval Module retrieves information from three parts: STM for recent context, MTM using a two-stage retrieval (segment and page level), and LPM for personalized knowledge. Given a query from the user, the memory retrieval module retrieves from the stored memory, i.e., STM, MTM, and LPM, to return the most relevant information to generate the responses, defined as:

- **§Evaluation Metrics.** (`S4.SS1.SSS0.Px2.p1.1`)

  > For the GVD dataset, we use three evaluation metrics: Memory Retrieval Accuracy (Acc.), Response Correctness (Corr.), and Contextual Coherence (Cohe.). Memory Retrieval Accuracy is evaluated as a binary indicator (0 or 1), while Correctness and Coherence are assessed on a three-point scale (0, 0.5, or 1). All evaluations on the GVD dataset are automatically scored by the DeepSeek-R1 DeepSeek-AI et al. (2025) . On the LoCoMo benchmark, standard F1 and BLEU-1 Papineni et al. (2002) are employed to evaluate the model’s performance.

- **§TiM (Think-in-Memory) Liu et al. (2023) :** (`S4.SS1.SSS0.Px4.p1.1`)

  > This approach mimics human memory by storing reasoning outcomes instead of raw dialogues. It uses locality-sensitive hashing (LSH) to retrieve relevant context before generating responses and updates memory through post-hoc reflection. TiM manages memory via insertion, forgetting, and merging to reduce redundant reasoning and improve consistency.

## \titlefont MemOS : A Memory OS for AI System — `2507.03724`

- **§Plaintext Memory** (`S4.SS1.SSS0.Px1.p2.1`)

  > MemOS encapsulates plaintext memory into tunable MemCube s, with lifecycle control, access policies, and version tracking. It supports graph-structured and multimodal memory, contextual fingerprinting, and timestamp-based loading. Plaintext memory is not merely an external plugin. MemOS deeply integrates it into the inference loop, enabling interaction with activation memory. High-frequency plaintext can be transformed into activation paths, achieving dynamic externalization and internalization of knowledge. To enhance scheduling efficiency and long-term evolvability, MemOS manages plaintext m…

- **§5.3.2 Memory API** (`S5.SS3.SSS2.p1.1`)

  > The interface layer of MemOS is built around a unified and composable Memory API , which bridges upper-level tasks with backend memory operations. All memory-related actions—including creation, updates, retrieval, and auditing—are performed via standardized APIs that ensure extensibility, composability, and governance. Provenance API enables provenance tracking by embedding metadata into memory objects at creation or modification time. This includes event triggers, contextual state, model identifiers, and external links. Each memory is tagged with a unique provenance ID that persists throughou…

- **§1 Introduction** (`S1.p4.1`)

  > The management of memory will become model-defined instead of human-defined. Just as deep learning replaced feature engineering, the transition of memory management from hard-coded pipelines (e.g., RAG) to learnable strategies is natural and necessary. Future agents will autonomously decide whether to retrieve memory, summarize interaction into reusable rules, abstract preferences, or transfer knowledge across contexts. In essence, models must take on the responsibility of shaping their own memory architectures and strategies. Yet, existing infrastructures fall short of enabling this shift.

- **§1 Introduction** (`S1.p12.1`)

  > Therefore, we argue that building future-capable language intelligence systems requires treating memory as a system-level resource that can be explicitly modeled and scheduled. In modern operating systems, computational resources (CPU), storage (RAM/disks), and communication (I/O) are uniformly scheduled and managed across their lifecycle. In contrast, memory in large model architectures exists as implicit parameters or temporary retrievals—neither schedulable nor traceable, and incapable of integration or transfer. Therefore, the key to enhancing memory in LLMs is not simply “adding a cache"…

- **§Implicit Long-term Memory in LLMs** (`S2.SS1.SSS1.Px1.p2.1`)

  > Training: In LLMs, training is the most fundamental and direct method for forming implicit long-term memory. For example, pretraining [ 56 , 23 ] and post-training [ 57 , 28 ] enable large-scale parameter updates, fundamentally reconstructing the internal knowledge distribution and behavioral structure of the model. Some studies introduce memory explicitly during training. For instance, CTRL [ 58 ] includes control codes in training data to help models automatically associate contextual information during text generation. Memory&Reasoning [ 74 ] fine-tunes the model to decouple output into sep…

- **§Explicit Short-term Memory in LLMs** (`S2.SS1.SSS2.Px1.p1.1`)

  > LLMs’ explicit short-term memory primarily resides in their input context window—namely, the prompt and directly concatenated historical dialogues, including user task descriptions, interaction history, and reference documents. These explicitly injected elements are directly perceived and utilized during inference, forming the basis for understanding the current context and generating responses. With the increasing scale and capabilities of LLMs, their ability to manage explicit short-term memory has significantly improved. From early general-purpose language models relying on static text inpu…

## M ​ e ​ m p Mem^{p} : Exploring Agent Procedural Memory — `2508.06433`

- **§Memory in Language Agents.** (`S2.SS0.SSS0.Px1.p1.1`)

  > Memory is a foundational component in language agents, enabling them to retain and utilize past information across multiple timescales, including short-term, episodic, and long-term memory, to enhance their performance and adaptability Zhou et al. (2023) ; Zhou et al. (2024) ; Zhang et al. (2024) ; Liu et al. (2025a) ; Li et al. (2025) . These systems aim to mimic aspects of human memory to improve coherence, personalization, and learning capabilities Chhikara et al. (2025) ; Wu et al. (2025b) ; Xia et al. (2025) . Current approaches include end-to-end memory systems Yu et al. (2025) ; Zhou et…

- **§Learning from Experience.** (`S2.SS0.SSS0.Px2.p1.1`)

  > LLM-based Agent learning from experience involves intelligence continuously improving their decision-making capabilities through interaction with environments and utilization of past experiences Tan et al. (2025) ; Tang et al. (2025) ; Zhou et al. (2025) ; Qiao et al. (2025) ; Su et al. (2025) ; Wang et al. (2024b) . This approach is crucial for developing adaptive and intelligent agents capable of handling dynamic real-world scenarios, as it allows them to optimize behaviors, reduce manual programming needs, and enhance performance across various tasks Zheng et al. () ; Liu et al. (2025c) ; W…

- **§3.1 Agent Procedural Memory** (`S3.SS1.p1.4`)

  > Moreover, as the number of completed tasks continuously increases, simply augmenting the agent’s procedural memory is inconsistent with common sense. A well-designed procedural memory system should have a reasonable update mechanism—that is, it should dynamically perform addition, deletion, modification, and retrieval based on the task execution context.

- **§4.2 Memory Storage & Retrieval** (`S4.SS2.p5.1`)

  > During the retrieval process, we evaluate the similarity by calculating the cosine similarity between their corresponding vectors as shown in Table 2 . Our experiments show that these different retrieval strategies produce varying results. Specifically, compared to random sampling, employing the query based and AveFact methods for precise retrieval significantly improves performance. The query-based approach benefits from capturing semantic contexts, enabling more accurate matches. The AveFact method, by extracting key features and averaging their similarities, effectively focuses on core task…

- **§Scaling Memory Retrieval Improves Agent Performance.** (`S5.SS0.SSS0.Px3.p1.1`)

  > While our main experiment has already demonstrated that procedural memory improves an agent’s task accuracy and reduces the number of steps required, vector-based storage and retrieval confer an advantage over human procedural memory: they can be scaled both in total capacity and in the number of memories retrieved. To investigate whether an agent’s performance continues to rise as the procedural-memory store and the number of retrieved memories increase, we designed a set of follow-up experiments. As shown in Figure 5 (b), as the number of retrieved procedural memories increases, the agent’s…

- **§1 Introduction** (`S1.p3.1`)

  > To close this gap, we present M ​ e ​ m p Mem^{p} , a task-agnostic framework that treats procedural memory as a first-class optimization object. The core exploration of M ​ e ​ m p Mem^{p} lies in how different strategies for memory construction, retrieval, and updating affect overall performance. During the construction phase, we follow the majority of traditional memory architectures and agent-based memory designs by leveraging either the full historical trajectory or explicit guidelines to guide the process. In the retrieval phase, we experiment with various key-building strategies—such as…

## Proximal policy optimization algorithms — `1707.06347`

Not read: no rendered body: arXiv serves a pointer to the PDF

## ReasoningBank : Scaling Agent Self-Evolving with Reasoning Memory — `2509.25140`

- **§3.2 ReasoningBank** (`S3.SS2.p3.1`)

  > Integrating ReasoningBank with Agents. An agent π ℒ \pi_{\mathcal{L}} equipped with ReasoningBank can draw upon a curated pool of transferable strategies to guide decision-making. This enables the agent to recall effective insights, avoid previously observed pitfalls, and adapt more robustly to unseen queries. The integration proceeds in three steps: (i) memory retrieval , (ii) memory extraction , and (iii) memory consolidation , as shown in Figure 2 . During memory retrieval , the agent queries ReasoningBank with the current query context to identify the top- k k relevant experiences and thei…

- **§2 Related Work** (`S2.p1.1`)

  > Memory for LLM Agents. Memory has emerged as an essential module in modern agent systems ( Zhang et al., 2025b ; Hu et al., 2025c ; He et al., 2026 ) to enhance their performance by utilizing past information. Existing memory systems organize and store information in various forms, including plain text ( Packer et al., 2023 ) , latent embeddings ( Wang et al., 2025b ) , and structured graphs ( Xu et al., 2025 ; Chhikara et al., 2025 ; Li et al., 2025b ) . Beyond memory content, those methods usually involve retrieval mechanisms (e.g., semantic search) with memory management strategies (e.g., u…

- **§1 Introduction** (`S1.p2.1`)

  > Recent efforts on agent memory ( Huang et al., 2026 ) have primarily focused on storing past interactions for reuse ( Zhao et al., 2024 ; Tang et al., 2025b ; Chen et al., 2025 ; Sun et al., 2025 ) . However, these approaches are often limited to leveraging raw trajectories ( Zheng et al., 2024 ; Kagaya et al., 2024 ; Kong et al., 2025 ) or successful routines (i.e., workflows, procedures) ( Wang et al., 2025d ; Fang et al., 2025 ) . They suffer from two fundamental drawbacks. First, they lack the ability to distill higher-level, transferable reasoning patterns. Second, by over-emphasizing suc…

- **§1 Introduction** (`S1.p3.1`)

  > To bridge this gap, we propose ReasoningBank , a novel memory framework for agent systems. ReasoningBank distills and organizes memory items from both successful and failed experiences judged by the agent itself without ground-truth labels. As shown in Figure 1 , it captures not only effective strategies from successes but also crucial preventative lessons from failures, abstracting them into a collection of actionable principles. This process operates in a closed loop: when facing a new task, the agent retrieves relevant memories from ReasoningBank to guide its actions. Afterward, the new exp…

- **§3.2 ReasoningBank** (`S3.SS2.p2.1`)

  > Memory Schema. Memory items in ReasoningBank are designed and induced from past experiences as structured knowledge units that abstract away low-level execution details while preserving transferrable reasoning patterns and strategies. Each memory item specifies three components: (i) a title , which serves as a concise identifier summarizing the core strategy or reasoning pattern; (ii) a description , which provides a brief one-sentence summary of the memory item; and (iii) the content , which records the distilled reasoning steps, decision rationales, or operational insights extracted from pas…

- **§3.3 MaTTS : Memory-aware Test-Time Scaling** (`S3.SS3.p4.1`)

  > We define the scaling factor k k , denoting the number of trajectories for parallel scaling and refinement steps for sequential scaling. Equipped with ReasoningBank , both parallel and sequential strategies become memory-aware, ensuring that the additional computation allocated at test time translates into more transferable and higher-quality memory for future tasks.

## Toolformer: Language Models Can Teach Themselves to Use Tools — `2302.04761`

- **§Bootstrapping** (`S6.SS0.SSS0.Px3.p1.1`)

  > The idea of using self-training and bootstrapping techniques to improve models has been investigated in various contexts, ranging from word sense disambiguation ( Yarowsky, 1995 ) , relation extraction ( Brin, 1999 ; Agichtein and Gravano, 2000 ) , parsing ( McClosky et al., 2006 ; Reichart and Rappoport, 2007 ) , sequence generation ( He et al., 2020 ) , few-shot text classification ( Schick and Schütze, 2021a ) and retrieval ( Izacard and Grave, 2021 ) to reasoning ( Zelikman et al., 2022 ) . In a similar spirit to these approaches, Toolformer is trained on its own predictions after applying…

- **§1 Introduction** (`S1.p3.1`)

  > Our approach for achieving these goals is based on the recent idea of using large LMs with in-context learning ( Brown et al., 2020 ) to generate entire datasets from scratch ( Schick and Schütze, 2021b ; Honovich et al., 2022 ; Wang et al., 2022 ) : Given just a handful of human-written examples of how an API can be used, we let a LM annotate a huge language modeling dataset with potential API calls. We then use a self-supervised loss to determine which of these API calls actually help the model in predicting future tokens. Finally, we finetune the LM itself on the API calls that it considers…

- **§2 Approach** (`S2.p3.1`)

  > Given a dataset 𝒞 = { 𝐱 1 , … , 𝐱 | 𝒞 | } \mathcal{C}=\{\mathbf{x}^{1},\ldots,\mathbf{x}^{|\mathcal{C}|}\} of plain texts, we first convert this dataset into a dataset 𝒞 ∗ \mathcal{C}^{*} augmented with API calls. This is done in three steps, illustrated in Figure 2 : First, we exploit the in-context learning ability of M M to sample a large number of potential API calls. We then execute these API calls and finally check whether the obtained responses are helpful for predicting future tokens; this is used as a filtering criterion. After filtering, we merge API calls for different tools, r…

- **§Executing API Calls** (`S2.SS0.SSS0.Px2.p1.1`)

  > As a next step, we execute all API calls generated by M M to obtain the corresponding results. How this is done depends entirely on the API itself – for example, it can involve calling another neural network, executing a Python script or using a retrieval system to perform search over a large corpus. The response for each API call c i c_{i} needs to be a single text sequence r i r_{i} .

- **§Question Answering** (`S3.SS0.SSS0.Px1.p1.1`)

  > Our first tool is a question answering system based on another LM that can answer simple factoid questions. Specifically, we use Atlas ( Izacard et al., 2022 ) , a retrieval-augmented LM finetuned on Natural Questions ( Kwiatkowski et al., 2019 ) .

- **§Calendar** (`S3.SS0.SSS0.Px5.p1.1`)

  > Our final tool is a calendar API that, when queried, returns the current date without taking any input. This provides temporal context for predictions that require some awareness of time.

## MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents — `2602.02474`

- **§4.3 Skill Generalization Under Distribution Shift** (`S4.SS3.p2.1`)

  > Figure 3 shows that MemSkill transfers strongly to HotpotQA across all three context sizes. MemSkill consistently outperforms strong baselines such as MemoryOS and A-MEM, with gains becoming more pronounced in the challenging long-context setting. These results suggest that the learned memory skills are not tied to dialogue-specific surface forms, but capture reusable extraction and revision behaviors that remain effective as input structure and retrieval demands change.

- **§1 Introduction** (`S1.p4.1`)

  > Based on the above observations, we introduce MemSkill , which reframes memory operations as a learnable and evolvable set of memory skills. MemSkill maintains a shared skill bank , where each skill captures a reusable way to extract, consolidate, or revise memories from interaction text (Figure 1 shows the template of a memory skill). Given the current context, a controller learns to select a small set of relevant skills, and an LLM-based executor conditions on these skills to generate skill-guided memories in one pass. This skill-conditioned formulation is not tied to a fixed extraction unit…

- **§4.3 Skill Generalization Under Distribution Shift** (`S4.SS3.p1.1`)

  > Beyond transfer within dialogue-style memory benchmarks, we evaluate whether learned skills generalize under a distribution shift in interaction format and evidence structure. Concretely, we directly apply the skill bank trained on LoCoMo to HotpotQA, where inputs are long-form, document-style narratives rather than multi-turn dialogues. Following the protocol in ( Yu et al., 2025 ) , we test three context-length settings with increasing difficulty, corresponding to different numbers of concatenated documents (i.e., 50/100/200). All results in this section use LLaMA as the base model and repor…

- **§1 Introduction** (`S1.p3.1`)

  > Under this view, an ideal agent memory system should satisfy three properties. (i) Minimal reliance on human priors. Instead of manually encoding what is worth remembering for a domain ( Zhong et al., 2024 ) , memory behaviors should be shaped by interaction data and updated as task demands evolve. (ii) Support for larger extraction granularity. Many approaches are tuned to a fixed unit, such as per-turn processing ( Fang et al., 2025 ) , and can weaken when applied to longer spans. A practical system should be able to operate at larger extraction granularity when needed. (iii) Skill-condition…

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > We evaluate MemSkill on LoCoMo, LongMemEval, HotpotQA, and ALFWorld, demonstrating consistent gains and strong transfer ability across conversational QA and embodied interaction settings, offering insights for self-evolving memory in LLM agents.

- **§2.1 LLM Agent Memory Systems** (`S2.SS1.p1.1`)

  > Prior work on agent memory focuses on constructing external memories from interaction histories and leveraging them to support downstream reasoning and decision making. Typical pipelines periodically extract salient information into a memory store, retrieve relevant entries for a new query, and update the store via consolidation or pruning ( Kang et al., 2025 ; Zhong et al., 2024 ; Xu et al., 2025 ; Packer et al., 2023 ; Chhikara et al., 2025 ; Fang et al., 2025 ) . More recently, learning-based approaches including Memory-R1 ( Yan et al., 2025 ) and Mem- α \alpha Wang et al. (2025a) optimize…

## Titans: Learning to Memorize at Test Time — `2501.00663`

- **§Memory Perspective** (`S1.SSx1.p3.1`)

  > This perspective, can help us better understand existing paradigms, their critical differences, and design more effective architectures. For example, the main difference between Transformers ( Vaswani et al., 2017 ) and linear Transformers ( Katharopoulos et al., 2020 ) is the memory structure as well as the memory updating step, in which linear Transformers compress the historical data into a fixed-size matrix-valued memory while Transformers keep all historical data (within the context length) without any compression. While both linear Transformers and linear RNNs (including state space mode…

- **§Contributions and Roadmap** (`S1.SSx2.p2.1`)

  > Neural Memory (§ 3 ) . We present a (deep) neural long-term memory that (as a meta in-context model) learns how to memorize/store the data into its parameters at test time. Inspired by human long-term memory system ( Mandler, 2014 ) , we design this memory module so an event that violates the expectations (being surprising) is more memorable. To this end, we measure the surprise of an input with the gradient of the neural network with respect to the input in associative memory loss ( see § 3.1 for details ). To better handle the limited memory, we present a decaying mechanism that consider the…

- **§2.1 Backgrounds** (`S2.SS1.p4.1`)

  > In this perspective, the recurrence formula of linear Transformers (see Equation 4 ) is equivalent to additively compress and write keys and values, ( K t , V t ) (K_{t},V_{t}) , into a matrix-valued memory unit ℳ t \mathcal{M}_{t} . Therefore, when dealing with long context data, this additive nature of the process results in memory overflow, significantly damaging the performance of the model. To address this, studies have focused on two promising directions: (1) Adding forget mechanism: several studies have presented adaptive (data-dependent) forgetting gate mechanisms for linear models, wh…

- **§5.3 Needle in a Haystack** (`S5.SS3.p1.1`)

  > Scaling a model to longer context window is not always equivalent to being effective for very long sequences ( Hsieh et al., 2024 ) . The needle-in-a-haystack (NIAH) task is designed to measure the actual effective context length of models. In this task, we evaluate the model on retrieving a piece of information (i.e., the “needle”) from long distractor texts (i.e., the “haystack”). In this part, we use Single NIAH (S-NIAH) task from RULER benchmark ( Hsieh et al., 2024 ) and evaluate Titans and baselines on sequences with length 2K, 4K, 8K, and 16K. The results are reported in Table 2 . Neura…

- **§5.4 BABILong Benchmark** (`S5.SS4.p2.1`)

  > In the fine-tuning setup, we compare the small fine-tuned version of Titans (MAC) with: (i) the fine-tuned version of small models (almost the same number of parameters as Titans) such as Mamba ( Gu & Dao, 2024 ) , RMT ( Bulatov et al., 2022 ) , (ii) large models with Retrieval-Augmented Generation (RAG) ( Lewis et al., 2020 ) such as Llama3.1-8B ( Touvron et al., 2023 ) , and (iii) extremely large models such as GPT-4 ( Achiam et al., 2023 ) , GPT4o-mini, Qwen2.5-72B ( Yang et al., 2024 ) , and Llama3.1-70B ( Touvron et al., 2023 ) . Baseline results are reported by ( Kuratov et al., 2024 ) .…

- **§1 Introduction** (`S1.p2.1`)

  > T ransformers, pure attention-based architectures ( Vaswani et al., 2017 ) , have been firmly established as state-of-the-art models in sequence modeling, mainly due to their in-context learning and ability to learn at scale ( Kaplan et al., 2020 ) . The primary building blocks of Transformers–attention modules—function as associative memory blocks ( Bietti et al., 2024 ) , where they learn to store key-value associations and retrieve them by computing pairwise similarity between queries (i.e., search signals) and keys (i.e., contexts). Accordingly, by design, the output of a Transformer is ex…

## Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models — `2510.04618`

- **§3 Agentic Context Engineering (ACE)** (`S3.p1.1`)

  > We present ACE ( A gentic C ontext E ngineering), a framework for scalable and efficient context adaptation in both offline ( e.g., system prompt optimization) and online ( e.g., test-time memory adaptation) scenarios. Instead of condensing knowledge into terse summaries or static instructions, ACE treats contexts as evolving playbooks that continuously accumulate, refine, and organize strategies over time. Inspired by the agentic design of Dynamic Cheatsheet ( Suzgun et al., 2025 ) , ACE introduces a structured division of labor across three roles (Figure 4 ): the Generator , which produces r…

- **§1 Introduction** (`S1.p1.1`)

  > Modern AI applications based on large language models (LLMs), such as LLM agents ( Yao et al., 2023 ; Yang et al., 2024 ) and compound AI systems ( Zaharia et al., 2024 ) , increasingly depend on context adaptation . Instead of modifying model weights, context adaptation improves performance after model training by incorporating clarified instructions, structured reasoning steps, or domain-specific input formats directly into the model’s inputs. Contexts underpin many AI system components, including system prompts that guide downstream tasks ( Opsahl-Ong et al., 2024 ; Agrawal et al., 2025 ) ,…

- **§1 Introduction** (`S1.p5.1`)

  > To address these limitations, we introduce ACE ( A gentic C ontext E ngineering), a framework for comprehensive context adaptation in both offline settings ( e.g., system prompt optimization) and online settings ( e.g., test-time memory adaptation). Rather than compressing contexts into distilled summaries, ACE treats them as evolving playbooks that accumulate and organize strategies over time. By design, ACE incorporates a modular workflow of generation, reflection, and curation, while adding structured, incremental updates guided by a grow-and-refine principle. This design preserves detailed…

- **§2.1 Context Adaptation** (`S2.SS1.p1.1`)

  > Context adaptation (or context engineering) refers to methods that improve model behavior by constructing or modifying inputs to an LLM, rather than altering its weights. The current state of the art leverages natural language feedback ( Shinn et al., 2023 ; Yuksekgonul et al., 2025 ; Agrawal et al., 2025 ) . In this paradigm, a language model inspects the current context along with signals such as execution traces, reasoning steps, or validation results, and generates natural language feedback on how the context should be revised. This feedback is then incorporated into the context, enabling…

- **§3.1 Incremental Delta Updates** (`S3.SS1.p1.1`)

  > A core design principle of ACE is to represent context as a collection of structured, itemized bullets , rather than a single monolithic prompt. The concept of a bullet is similar to the concept of a memory entry in LLM memory frameworks like Dynamic Cheatsheet ( Suzgun et al., 2025 ) and A-MEM ( Xu et al., 2025 ) , but builds on top of that and consists of (1) metadata , including a unique identifier and counters tracking how often it was marked helpful or harmful; and (2) content , capturing a small unit such as a reusable strategy, domain concept, or common failure mode. When solving new pr…

- **§ACE (ours)** (`S4.SS2.SSS0.Px6.p1.1`)

  > ACE optimizes LLM contexts for both offline and online adaptation through an agentic context engineering framework. To ensure fairness, we use the same LLM for the Generator, Reflector, and Curator (non-thinking mode of DeepSeek-V3.1 ( Liu et al., 2024a ) ), preventing knowledge transfer from a stronger Reflector or Curator to a weaker Generator. This isolates the benefit of context construction itself. We additionally evaluate ACE with other backbone LLMs in the appendix, where we observe consistent gains. We adopt a batch size of 1 (constructing a delta context from each sample). We set the…

## Cognitive Architectures for Language Agents — `2309.02427`

- **§4.3 Retrieval actions** (`S4.SS3.p1.1`)

  > In CoALA, a retrieval procedure ( Li et al., 2022a ; Gu et al., 2018 ) reads information from long-term memories into working memory. Depending on the information and memory type, it could be implemented in various ways, e.g., rule-based, sparse, or dense retrieval. For example, Voyager ( Wang et al., 2023a ) loads code-based skills from a skill library via dense retrieval to interact with the Minecraft world – effectively retrieving grounding procedures from a procedural memory. Generative Agents ( Park et al., 2023 ) retrieves relevant events from episodic memory via a combination of recency…

- **§4.4 Reasoning actions** (`S4.SS4.p1.1`)

  > Reasoning allows language agents to process the contents of working memory to generate new information. Unlike retrieval (which reads from long-term memory into working memory), reasoning reads from and writes to working memory. This allows the agent to summarize and distill insights about the most recent observation ( Yao et al., 2022b ; Peng et al., 2023 ) , the most recent trajectory ( Shinn et al., 2023 ) , or information retrieved from long-term memory ( Park et al., 2023 ) . Reasoning can be used to support learning (by writing the results into long-term memory) or decision-making (by us…

- **§2.3 Cognitive architectures: From algorithms to agents** (`S2.SS3.p5.1`)

  > Grounding. Soar can be instantiated in simulations ( Tambe et al., 1995 ; Jones et al., 1999 ) or real-world robotic systems ( Laird et al., 2012 ) . In embodied contexts, a variety of sensors stream perceptual input into working memory, where it is available for decision-making. Soar agents can also be equipped with actuators, allowing for physical actions and interactive learning via language ( Mohan et al., 2012 ; Mohan and Laird, 2014 ; Kirk and Laird, 2014 ) .

- **§4 Cognitive Architectures for Language Agents (CoALA): A Conceptual Framework** (`S4.I1.i2.p1.1`)

  > Internal actions interact with internal memories. Depending on which memory gets accessed and whether the access is read or write, internal actions can be further decomposed into three kinds: retrieval (read from long-term memory; Section 4.3 ), reasoning (update the short-term working memory with LLM; Section 4.4 ), and learning (write to long-term memory; Section 4.5 ).

- **§4 Cognitive Architectures for Language Agents (CoALA): A Conceptual Framework** (`S4.p1.2`)

  > Language agents choose actions via decision-making , which follows a repeated cycle (Section 4.6 , Figure 4 B). In each cycle, the agent can use reasoning and retrieval actions to plan. This planning subprocess selects a grounding or learning action, which is executed to affect the outside world or the agent’s long-term memory. CoALA’s decision cycle is analogous to a program’s “main” procedure (a method without return values, as opposed to functions ) that runs in loops continuously, accepting new perceptual input and calling various action procedures in response.

- **§4 Cognitive Architectures for Language Agents (CoALA): A Conceptual Framework** (`S4.p3.1`)

  > The rest of this section details key concepts in CoALA: memory, actions (grounding, reasoning, retrieval, and learning), and decision-making. For each concept, we use existing language agents (or relevant NLP/RL methods) as examples – or note gaps in the literature for future directions.

## Dense Passage Retrieval for Open-Domain Question Answering — `2004.04906`

- **§1 Introduction** (`S1.p2.1`)

  > Retrieval in open-domain QA is usually implemented using TF-IDF or BM25 Robertson and Zaragoza (2009) , which matches keywords efficiently with an inverted index and can be seen as representing the question and context in high-dimensional, sparse vectors (with weighting). Conversely, the dense , latent semantic encoding is complementary to sparse representations by design. For example, synonyms or paraphrases that consist of completely different tokens may still be mapped to vectors close to each other. Consider the question “Who is the bad guy in lord of the rings?” , which can be answered fr…

- **§1 Introduction** (`S1.p1.1`)

  > Open-domain question answering (QA) Voorhees (1999) is a task that answers factoid questions using a large collection of documents. While early QA systems are often complicated and consist of multiple components ( Ferrucci (2012) ; Moldovan et al. (2003) , inter alia ), the advances of reading comprehension models suggest a much simplified two-stage framework: (1) a context retriever first selects a small subset of passages where some of them contain the answer to the question, and then (2) a machine reader can thoroughly examine the retrieved contexts and identify the correct answer Chen et a…

- **§1 Introduction** (`S1.p3.1`)

  > However, it is generally believed that learning a good dense vector representation needs a large number of labeled pairs of question and contexts. Dense retrieval methods have thus never be shown to outperform TF-IDF/BM25 for open-domain QA before ORQA Lee et al. (2019) , which proposes a sophisticated inverse cloze task (ICT) objective, predicting the blocks that contain the masked sentence, for additional pretraining. The question encoder and the reader model are then fine-tuned using pairs of questions and answers jointly. Although ORQA successfully demonstrates that dense retrieval can out…

- **§1 Introduction** (`S1.p5.1`)

  > Our contributions are twofold. First, we demonstrate that with the proper training setup, simply fine-tuning the question and passage encoders on existing question-passage pairs is sufficient to greatly outperform BM25. Our empirical results also suggest that additional pretraining may not be needed. Second, we verify that, in the context of open-domain question answering, a higher retrieval precision indeed translates to a higher end-to-end QA accuracy. By applying a modern reader model to the top retrieved passages, we achieve comparable or better results on multiple QA datasets in the open-…

- **§Impact of gold passages** (`S5.SS2.SSS0.Px3.p1.1`)

  > We use passages that match the gold contexts in the original datasets (when available) as positive examples (Section 4.2 ). Our experiments on Natural Questions show that switching to distantly-supervised passages (using the highest-ranked BM25 passage that contains the answer), has only a small impact: 1 point lower top- k k accuracy for retrieval. Appendix A contains more details.

- **§5.4 Run-time Efficiency** (`S5.SS4.p1.1`)

  > The main reason that we require a retrieval component for open-domain QA is to reduce the number of candidate passages that the reader needs to consider, which is crucial for answering user’s questions in real-time. We profiled the passage retrieval speed on a server with Intel Xeon CPU E5-2698 v4 @ 2.20GHz and 512GB memory. With the help of FAISS in-memory index for real-valued vectors 10 10 10 FAISS configuration: we used HNSW index type on CPU, neighbors to store per node = 512, construction time search depth = 200, search depth = 128. , DPR can be made incredibly efficient, processing 995.…

## From RAG to Memory: Non-Parametric Continual Learning for Large Language Models — `2502.14802`

- **§1 Introduction** (`S1.p2.1`)

  > In recent years, large language models (LLMs) have made remarkable progress in many aspects of human intelligence. However, efforts to endow these models with our evolving long-term memory capabilities have faced significant challenges in both fully absorbing new knowledge ( Zhong et al., 2023 ; Hoelscher-Obermaier et al., 2023 ) and avoiding catastrophic forgetting ( Cohen et al., 2024 ; Gu et al., 2024 ) , due to the complex distributional nature of their parametric knowledge. Retrieval-augmented generation (RAG) has emerged as a way to circumvent these obstacles and allow LLMs to access new…

- **§3.1 Overview** (`S3.SS1.p2.1`)

  > HippoRAG’s offline indexing process uses an LLM to process passages into KG triples, which are then incorporated into the KG, our artificial hippocampal index. Meanwhile, the retrieval encoder is responsible for detecting synonymy to interconnect information. In HippoRAG’s online retrieval process, the LLM neocortex extracts named entities from a query while the retrieval encoder finds their most similar counterparts in the KG. Then, the nodes in the KG corresponding to these entities, which we refer to as seed nodes, are used to run the Personalized PageRank (PPR) algorithm. More specifically…

- **§3.1 Overview** (`S3.SS1.p3.1`)

  > Built on the neurobiologically inspired long-term memory framework proposed in HippoRAG ( Gutiérrez et al., 2024 ) , the structure of HippoRAG 2 follows a similar two-stage process: offline indexing and online retrieval, as shown in Figure 2 . Additionally, however, HippoRAG 2 introduces several key refinements that improve its alignment with human memory mechanisms: 1) It seamlessly integrates conceptual and contextual information within the KG, enhancing the comprehensiveness and atomicity of the constructed index (§ 3.2 ). 2) It facilitates more context-aware retrieval by leveraging the KG…

- **§3.1 Overview** (`S3.SS1.p5.1`)

  > Online Retrieval. 1) The query is linked to relevant triples and passages using the encoder, identifying nodes that could be used as seed nodes for graph search (§ 3.3 ). 2) During triple linkage, the recognition memory functions as a filter, ensuring only relevant triples are retained from the retrieved set as the final seed nodes (§ 3.4 ). 3) These final seed nodes are then used to assign reset probabilities within the PPR algorithm, enabling its context-aware retrieval and refining the linking results to retrieve the most relevant passages. 4) Finally, the retrieved passages serve as contex…

- **§1 Introduction** (`S1.p5.1`)

  > As shown in Figure 1 , our evaluation reveals that all previous structure-augmented methods underperform against the strongest embedding-based RAG methods available on all three benchmark types. Perhaps unsurprisingly, we find that each method type experiences the largest performance decay in tasks outside its own experimental setup. For example, HippoRAG’s performance drops most on large-scale discourse understanding due to its lack of query-based contextualization, while RAPTOR’s performance deteriorates substantially on the simple and multi-hop QA tasks due to the noise introduced into the…

- **§1 Introduction** (`S1.p6.1`)

  > In this work, we leverage this experimental setting to help us address the robustness limitations of these innovative approaches while avoiding the pitfalls of focusing too narrowly on just one task. Our proposed method, HippoRAG 2, leverages the strength of HippoRAG’s OpenIE and Personalized PageRank (PPR) methodologies while addressing its query-based contextualization limitations by integrating passages into the PPR graph search process, involving queries more deeply in the selection of KG triples as well as engaging an LLM in the online retrieval process to recognize when retrieved triples…

## HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models — `2405.14831`

- **§2.1 The Hippocampal Memory Indexing Theory** (`S2.SS1.p3.1`)

  > After the memory encoding process is completed, pattern completion drives the memory retrieval process whenever the hippocampus receives partial perceptual signals from the PHR pipeline. The hippocampus then leverages its context-dependent memory system, thought to be implemented through a densely connected network of neurons in the CA3 sub-region [ 76 ] , to identify complete and relevant memories within the hippocampal index and route them back through the PHR for simulation in the neocortex. Thus, this complex process allows for new information to be integrated by changing only the hippocam…

- **§1 Introduction** (`S1.p2.1`)

  > Despite the progress of large language models (LLMs) in recent years, such a continuously updating long-term memory is still conspicuously absent from current AI systems. Due in part to its ease of use and the limitations of other techniques such as model editing [ 46 ] , retrieval-augmented generation (RAG) has become the de facto solution for long-term memory in LLMs, allowing users to present new knowledge to a static model [ 36 , 42 , 66 , 87 ] .

- **§1 Introduction** (`S1.p4.1`)

  > In contrast, our brains are capable of solving challenging knowledge integration tasks like these with relative ease. The hippocampal memory indexing theory [ 75 ] , a well-established theory of human long-term memory, offers one plausible explanation for this remarkable ability. Teyler and Discenna [75] propose that our powerful context-based, continually updating memory relies on interactions between the neocortex, which processes and stores actual memory representations, and the C-shaped hippocampus, which holds the hippocampal index , a set of interconnected indices which point to memory u…

- **§1 Introduction** (`S1.p5.1`)

  > In this work, we propose HippoRAG, a RAG framework that serves as a long-term memory for LLMs by mimicking this model of human memory. Our novel design first models the neocortex’s ability to process perceptual input by using an LLM to transform a corpus into a schemaless knowledge graph (KG) as our artificial hippocampal index. Given a new query, HippoRAG identifies the key concepts in the query and runs the Personalized PageRank (PPR) algorithm [ 30 ] on the KG, using the query concepts as the seeds, to integrate information across passages for retrieval. PPR enables HippoRAG to explore KG p…

- **§2 HippoRAG** (`S2.p1.1`)

  > In this section, we first give a brief overview of the hippocampal memory indexing theory, followed by how HippoRAG’s indexing and retrieval design was inspired by this theory, and finally offer a more detailed account of our methodology.

- **§2.1 The Hippocampal Memory Indexing Theory** (`S2.SS1.p1.1`)

  > The hippocampal memory indexing theory [ 75 ] is a well-established theory that provides a functional description of the components and circuitry involved in human long-term memory. In this theory, Teyler and Discenna [75] propose that human long-term memory is composed of three components that work together to accomplish two main objectives: pattern separation , which ensures that the representations of distinct perceptual experiences are unique, and pattern completion , which enables the retrieval of complete memories from partial stimuli [ 19 , 76 ] .

## MEM1 : Learning to Synergize Memory and Reasoning for Efficient Long-Horizon Agents — `2506.15841`

- **§Single-objective QA in Wikipedia.** (`S4.SS3.SSS0.Px2.p1.1`)

  > Table 3 presents the accuracy and efficiency metrics for evaluations on single-objective QA tasks on Wikipedia [ 24 ] , where the agent can make retrieval requests from the Wikipedia datastore via RAG. The MEM1 used in this evaluation is the same as the one detailed in Section 4.2 , which is trained solely on a 2-objective task. Overall, MEM1 demonstrates superior efficiency across all three evaluated efficiency metrics, while simultaneously achieving the highest EM score and an F1 score comparable to that of Qwen2.5-14B-Instruct. This improvement in efficiency is attributed to the MEM1 agent’…

- **§1 Introduction** (`S1.p4.1`)

  > Recent progress in long-context modeling largely targets static inputs ( e.g., long documents) and does not address multi-turn interaction with external environments [ 6 , 19 ] . Some other approaches introduce external memory modules ( e.g., summarizers or retrievers) [ 63 , 29 , 13 , 57 ] , but these are typically trained separately and cannot be optimized end-to-end with the agent’s policy. This also introduces additional engineering overhead, as engineers must manage and integrate two separate models. Meanwhile, existing works on tool-using agent systems trained with reinforcement learning…

- **§Memory management for LLM agents.** (`S2.SS0.SSS0.Px2.p1.1`)

  > A widely adopted approach to memory management in LLM-based agent systems involves appending all prior information, such as observations, intermediate thoughts, and actions, into the prompt at each interaction turn [ 61 ] . While this method is straightforward and effective when the number of interactions required is small, it results in unbounded context growth, leading to linearly scaled inference memory. Moreover, long contexts often contain irrelevant or redundant information, which impairs the model’s reasoning capabilities [ 2 , 30 , 56 ] . To mitigate these issues, recent studies have p…

- **§3.1 Memory as Part of Reasoning** (`S3.SS1.p1.1`)

  > To achieve a constant memory, MEM1 is particularly trained to iteratively refine its understanding by processing new information in conjunction with a consolidation of its prior state. At each turn t t , the agent produces a new <IS_t> element, which summarizes past information and reasons about subsequent actions. Following this, the agent generates an action—either a <query_t> to interact with the environment, or an <answer_t> if a direct response is warranted. If the agent issues a <query_t> , the corresponding feedback from the environment is appended as <info_t> . At the next turn, t + 1…

- **§3.1 Memory as Part of Reasoning** (`S3.SS1.p2.1`)

  > RL offers a powerful mechanism for shaping agent behavior through reward signals [ 49 ] . In MEM1 , we leverage this framework to incentivize effective state consolidation by designing environments in which the agent is rewarded only when it strategically retains and integrates useful information. Specifically, we construct tasks that require numerous interactions with the environment to arrive at a correct answer (see Section 3.3 ). Success depends on the agent’s ability to rely on information collected along the inference path. At each turn, we prune the agent’s context to retain only the mo…

- **§3.2 Masked Trajectory for Policy Optimization** (`S3.SS2.p1.1`)

  > In the previous section, we detailed the rollout process of our RL pipeline. However, unlike conventional multi-turn agents that preserve a static context during generation, MEM1 introduces a unique challenge: its mechanism continuously updates the context at each turn by consolidating prior memory and pruning irrelevant tokens. This dynamic context update disrupts the continuity of the token generation trajectory, complicating the estimation of token-wise advantages in policy optimization algorithms such as PPO and Reinforce++ [ 41 , 22 ] , where trajectories are typically assumed to be linea…

## 1Overview of self-evolving results of Memento-Skills on two benchmarks. (a,b) depict the progressive improvement in task performance across reflective learning rounds on HLE and GAIA. (c,d) depict the corresponding growth of the skill memory, while organising learned skills into semantically meaningful clusters. — `2603.18743`

- **§2.1 S The Skill-Level Read–Write Loop** (`S2.SS1.p3.1`)

  > This self-evolving mechanism draws on a principle familiar from biological motor learning [ 9 ] : early in skill acquisition, performance depends on deliberate, high-level planning; with repeated practice, neural pathways consolidate and execution becomes increasingly automatic [ 2 ] . Analogously, a newly created skill in Memento-Skills may be brittle and narrowly scoped, but through iterative revision it is consolidated into a robust, reusable routine, finally forming muscle memory for recurring task patterns. Existing approaches to automatic skill learning either produce text-only guides th…

- **§4 Conclusion** (`S4.p1.1`)

  > We have presented Memento-Skills, a system that bridges the gap between memory-based learning and skill-based learning for LLM agents. The central insight is to treat executable skills as the unit of external memory, thereby transferring the theoretical guarantees of the Stateful Reflective Decision Process into a concrete, deployable artefact. Through the Read–Write Reflective Learning loop, the agent autonomously acquires, refines, and reuses these skills from deployment experience alone, requiring no parameter updates to the underlying LLM. A behaviour-aligned contrastive router, trained vi…

- **§1.1 S 4 4 4 This is the shared track, which presents material common to both research track and practitioner tracks. Why Frozen LLMs Need External Memory** (`S1.SS1.p4.1`)

  > where p LLM p_{\mathrm{LLM}} denotes the LLM decision kernel, s s is the current state, c c represents a retrieved case from the episodic memory ℳ t \mathcal{M}_{t} , and μ \mu is the retrieval policy.

- **§1.1 S 4 4 4 This is the shared track, which presents material common to both research track and practitioner tracks. Why Frozen LLMs Need External Memory** (`S1.SS1.p1.1`)

  > Modern machine learning is about learning from experience [ 14 , 16 ] . At the forefront of this evolution, Large Language Models (LLMs) have fundamentally reshaped the learning paradigm, demonstrating exceptional performance across diverse scenarios through few-shot learning [ 3 ] , supervised fine-tuning [ 18 ] , and post-training [ 5 ] . Despite their promise, however, achieving practical utility typically requires parameter optimisation via backpropagation [ 13 ] , which in turn demands vast amounts of data and computational resources. In practice, the cost and complexity of continual para…

- **§1.1 S 4 4 4 This is the shared track, which presents material common to both research track and practitioner tracks. Why Frozen LLMs Need External Memory** (`S1.SS1.p3.1`)

  > This creates a fundamental limitation: the agent is stateless and it cannot learn from its own deployment experience. The Stateful Reflective Decision Process (SRDP) [ 17 ] resolves this by augmenting the agent with an episodic memory ℳ t \mathcal{M}_{t} that grows over time (Figure 3 ):

- **§2.1 S The Skill-Level Read–Write Loop** (`S2.SS1.p1.1`)

  > Memento-Skills is grounded in the theory of Read–Write Reflective Learning [ 17 ] , which provides the theoretical foundation for read–write memory updates as policy iteration. Empirically Memento [ 22 ] and case-based reasoning LLM agents [ 6 , 7 ] validate this principle across deep search, data science, and software engineering. As illustrated in Figure 5 , the skill library serves as an external, writable memory, and the agent alternates between (i) reading skills to induce an execution policy for the current goal and (ii) writing updates back to the skill artefacts based on post-hoc refle…

## MIRIX: Multi-Agent Memory System for LLM-Based Agents — `2507.07957`

- **§1 Introduction** (`S1.p5.1`)

  > We evaluate MIRIX in two experimental settings. First, we introduce a challenging benchmark that requires extracting information and building memory from multimodal input. To this end, we collect between 5,000 and 20,000 high-resolution screenshots spanning one month of computer usage from three PhD students and construct evaluation questions grounded in their visual activity history. This setting demands sophisticated memory modeling and exceeds the capacity of existing long-context models. For example, each screenshot ranges from 2K to 4K resolution depending on the user’s monitor, which lim…

- **§3.2 Active Retrieval and Retrieval Design** (`S3.SS2.p2.1`)

  > To address this, we propose an Active Retrieval mechanism. As illustrated in Figure 5 , the system operates in two stages: first, the agent generates a current topic based on the input context; second, this topic is used to retrieve relevant memories from each memory component. Retrieved results are then injected into the system prompt. For instance, given the query “Who is the CEO of Twitter?”, the agent may infer the topic “CEO of Twitter”, which is then used to retrieve the top-10 most relevant entries from each of the six memory components. Retrieved content is tagged according to its sour…

- **§Conversational Retrieval Workflow** (`S3.SS3.SSS0.Px2.p1.1`)

  > For interactive dialogues, the Chat Agent manages natural language communication with the user. To ground its responses in prior knowledge, it first performs an automatic search over the memory base upon receiving a user query. This initial search is a coarse retrieval spanning all six memory components and returns high-level summaries rather than detailed content. The Chat Agent then analyzes the query to determine which memory components warrant more targeted searches and selects appropriate retrieval methods accordingly. After obtaining the relevant results, it consolidates the information…

- **§4.3 Experimental Results on LOCOMO** (`S4.SS3.p9.1`)

  > Single-Hop and Temporal: On fact lookup and temporal-ordering tasks, MIRIX shows significantly better performances than baselines, which validates the effectiveness of our hierarchical memory storage. We note that there is a minor gap between MIRIX and the Full-Context baseline on Single-Hop questions. Upon reviewing the results, we identified a major reason for this. In some cases, the questions are ambiguous. For example, consider the question “When is Melanie planning on going camping?” In the conversation history, Melanie stated “We’re thinking about going camping next month” in May, which…

- **§Memory-Augmented Large Language Models** (`S5.SS0.SSS0.Px1.p1.1`)

  > A growing body of work focuses on building latent-space memory systems, as characterized in M+ [ 31 ] , where transformer architectures are modified to support memory augmentation. These memory components can reside in various latent forms, including model parameters [ 30 ] , external memory matrices [ 8 , 21 ] , hidden states [ 2 , 10 , 28 , 31 ] , soft prompts [ 3 ] , and key-value caches [ 38 , 9 , 16 , 37 ] . While these approaches demonstrate promising results and continue to advance the frontier of latent-space memory, most require retraining the model [ 28 , 31 , 21 ] , making them inco…

- **§6 Conclusion and Future Work** (`S6.p1.1`)

  > In this work, we introduce MIRIX, a novel memory architecture designed to enhance the long-term reasoning and personalization capabilities of LLM-based agents. Unlike existing memory systems that primarily rely on flat storage or limited memory types, MIRIX leverages a structured and compositional approach, incorporating six specialized memory components—Core, Episodic, Semantic, Procedural, Resource, and Knowledge Vault—managed by dedicated Memory Managers under the coordination of a Meta Memory Manager. To rigorously evaluate our system, we introduce a challenging multimodal benchmark based…

## Progressive Neural Networks — `1606.04671`

- **§1 Introduction** (`S1.p1.1`)

  > Finetuning remains the method of choice for transfer learning with neural networks: a model is pretrained on a source domain (where data is often abundant), the output layers of the model are adapted to the target domain, and the network is finetuned via backpropagation. This approach was pioneered in [ 7 ] by transferring knowledge from a generative to a discriminative model, and has since been generalized with great success [ 11 ] . Unfortunately, the approach has drawbacks which make it unsuitable for transferring across multiple tasks : if we wish to leverage knowledge acquired over a sequ…

- **§1 Introduction** (`S1.p2.1`)

  > This paper introduces progressive networks , a novel model architecture with explicit support for transfer across sequences of tasks. While finetuning incorporates prior knowledge only at initialization, progressive networks retain a pool of pretrained models throughout training, and learn lateral connections from these to extract useful features for the new task. By combining previously learned features in this manner, progressive networks achieve a richer compositionality, in which prior knowledge is no longer transient and can be integrated at each layer of the feature hierarchy. Moreover,…

- **§2 Progressive Networks** (`S2.p1.1`)

  > Continual learning is a long-standing goal of machine learning, where agents not only learn (and remember) a series of tasks experienced in sequence, but also have the ability to transfer knowledge from previous tasks to improve convergence speed [ 20 ] . Progressive networks integrate these desiderata directly into the model architecture: catastrophic forgetting is prevented by instantiating a new neural network (a column ) for each task being solved, while transfer is enabled via lateral connections to features of previously learned columns. The scalability of this approach is addressed at t…

- **§2 Progressive Networks** (`S2.p3.1`)

  > These modelling decisions are informed by our desire to: (1) solve K K independent tasks at the end of training; (2) accelerate learning via transfer when possible; and (3) avoid catastrophic forgetting.

- **§Limitations.** (`S2.SS0.SSS0.Px3.p1.1`)

  > Progressive networks are a stepping stone towards a full continual learning agent: they contain the necessary ingredients to learn multiple tasks, in sequence, while enabling transfer and being immune to catastrophic forgetting. A downside of the approach is the growth in number of parameters with the number of tasks. The analysis of Appendix 2 reveals that only a fraction of the new capacity is actually utilized, and that this trend increases with more columns. This suggests that growth can be addressed, e.g. by adding fewer layers or less capacity, by pruning [ 9 ] , or by online compression…

- **§4 Related Literature** (`S4.p1.1`)

  > There exist many different paradigms for transfer and multi-task reinforcement learning, as these have long been recognized as critical challenges in AI research [ 15 , 19 , 20 ] . Many methods for transfer learning rely on linear and other simple models (e.g. [ 18 ] ), which is a limiting factor to their applicability. Recently, there have been new methods proposed for multi-task or transfer learning with deep RL: [ 22 , 17 , 14 ] . In this work we present an architecture for deep reinforcement learning that in sequential task regimes that enables learning without forgetting while supporting…

---

# r4-knowledge: 三十篇之后

## 一、这批论文在说什么(按主题归并,不按论文罗列)

第一批论文的共同动作,是把记忆从"检索技巧"重新定义成"系统资源"。`2310.08560` 的出发点是一句资源判断:"we treat context windows as a constrained memory resource" (§1 Introduction),由此推出控制权归属:"Memory edits and retrieval are entirely self-directed" (§2.3 Function executor (handling of completion tokens ))。这个隐喻后来被真的做成操作系统:`2507.03724` 把方向定成"The management of memory will become model-defined instead of human-defined." (§1 Introduction),并把动作收敛为接口——"All memory-related actions—including creation, updates, retrieval, and auditing—are performed via standardized APIs" (§5.3.2 Memory API);`2506.06326` 把记忆切成三层,检索要同时跨过"STM for recent context, MTM using a two-stage retrieval (segment and page level), and LPM for personalized knowledge" (§3.4 Memory Retrieval Module)。分层一旦成立,成本立即变成主要矛盾:`2510.18866` 说"contemporary memory systems still suffer from significant inefficiencies and consistency issues" (§1 Introduction),对策是在写入之前先压一道的"pre-compression sensory memory module" (§1 Introduction);`2507.07957` 转向多智能体分工,"we propose an Active Retrieval mechanism" (§3.2 Active Retrieval and Retrieval Design);`2504.19413` 的问题起点是"their inability to maintain coherent reasoning across extended conversations across different sessions" (§1 Introduction),机制起点是"The extraction phase initiates upon ingestion of a new message pair" (§2.1 Mem0)。这六篇合起来主张的不是"记忆要更大",而是"记忆需要有人负责调度"。

写入路径这一支,关心的是一条记忆怎么被造出来。`2502.12110` 把自主性放在结构层:"our agentic memory system exhibits agency at a more fundamental level through the autonomous evolution of its memory structure" (§2.2 Retrieval-Augmented Generation),并声称"consistently outperforms all baselines across different categories" (§4.3 Empricial Results)。`2303.11366` 走的是把信号翻译成语言:"Reflexion converts binary or scalar feedback from the environment into verbal feedback in the form of a textual summary" (§1 Introduction),分析里承认这是加了一层情景记忆——"we add an element of episodic memory (EPM)" (§Analysis)。`2304.03442` 开头就把原始流的不可用写明:"the full memory stream can distract the model and does not even currently fit into the limited context window" (§Challenge:),因此检索必须是"a weighted combination of the three elements" (§Approach:)。`2305.10250` 直接把遗忘写进设计,自称"draws inspiration from the Ebbinghaus Forgetting Curv" (§6 Conclusion)。`2602.02474` 把这一整支再抬一层:"reframes memory operations as a learnable and evolvable set of memory skills" (§1 Introduction),而且这些技能"the learned memory skills are not tied to dialogue-specific surfa" (§4.3 Skill Generalization Under Distribution Shift)。

程序性记忆是这批论文里最接近"技能"的一支。`2305.16291` 立下了形态:"It can construct an ever-growing skill library of action programs that are reusable, interpretable, and generalizable to novel tasks." (§1 Introduction);`2409.07429` 把它压到工作流粒度,"we propose agent workflow memory ( AWM )" (§1 Introduction);`2308.10144` 给出迁移的正面证据"Both agents that transferred knowledge from the source domain saw performance gains." (§5.4 Transfer Learning),但同一节又承认"the agent with a few in-context examples had a more significant improvement" (§5.4 Transfer Learning)——提炼出来的经验并不自动强于直接给样例。`2508.06433` 是唯一把"更新机制"本身当研究对象的:"A well-designed procedural memory system should have a reasonable update mechanism" (§3.1 Agent Procedural Memory),并且认为机器版比生物版更强:"vector-based storage and retrieval confer an advantage over human procedural memory: they can be scaled both in total capacity and in the number of memories retrieved" (§Scaling Memory Retrieval Improves Agent Performance.)。`2509.25140` 的贡献是收失败:"distills and organizes memory items from both successful and failed experiences judged by the agent itself without ground-truth labels" (§1 Introduction),并要求固定结构"Each memory item specifies three components" (§3.2 ReasoningBank)。`2602.08234` 则指出只改记忆不改策略会失效:"MemRL, which uses RL solely to update its memory bank while keeping the policy frozen, fails to adapt to complex environments" (§4.2 Main Results)。`2603.18743` 是本批最激进的一句:"The central insight is to treat executable skills as the unit of external memory" (§4 Conclusion),前提判断是"the agent is stateless and it cannot learn from its own deployment experience" (§1.1 S 4 4 4 This is the shared track, which presents material common to both research track and practitioner tracks. Why Frozen LLMs Need External Memory)。

参数化与否,是这批论文里最干净的一条对立线。`2501.00663` 主张记忆可以写进权重,"learns how to memorize/store the data into its parameters at test time" (§Contributions and Roadmap),并把区别归到结构上:"the main difference between Transformers ( Vaswani et al., 2017 ) and linear Transformers ( Katharopoulos et al., 2020 ) is the memory structure as well as the memory updating step" (§Memory Perspective)。`2106.09685` 走低秩微调,收益落在存储:"The most significant benefit comes from the reduction in memory and storage usage." (§4.2 Applying LoRA to Transformer);`1606.04671` 的老办法是加列,好处是"avoid catastrophic forgetting" (§2 Progressive Networks),代价白纸黑字"A downside of the approach is the growth in number of parameters with the number of tasks." (§Limitations.)。另一端全在上下文侧:`2510.04618` 划界划得很死——"Context adaptation (or context engineering) refers to methods that improve model behavior by constructing or modifying inputs to an LLM, rather than altering its weights." (§2.1 Context Adaptation),做法是把上下文做成条目集合"A core design principle of ACE is to represent context as a collection of structured, itemized bullets" (§3.1 Incremental Delta Updates);`2508.16153` 干脆不动模型,"eliminates the need for fine-tuning the underlying LLMs" (§Abstract),并把这领域分成两派"Continual-learning strategies for LLM agents can be categorised into two camps." (§2.1 Continual-learning in LLM Agent Systems)。`2005.14165` 是这条线的历史起点:"we test this hypothesis by training a 175 billion parameter autoregressive language model" (§1 Introduction)——大模型本身就是一种记忆方案。

检索这一支已经退化成"结构到底有没有用"的反复摇摆。`2005.11401` 给出最干净的定义:"Our document index can be seen as a large external memory for neural networks to attend to" (§Memory-based Architectures);`2004.04906` 证明"simply fine-tuning the question and passage encoders on existing question-passage pairs is sufficient to greatly outperform BM25" (§1 Introduction),并把检索的职责说清楚——"to reduce the number of candidate passages that the reader needs to consider" (§5.4 Run-time Efficiency)。结构派从 `2405.14831` 起,论据是生物学:"pattern completion drives the memory retrieval process" (§2.1 The Hippocampal Memory Indexing Theory),动机是"our brains are capable of solving challenging knowledge integration tasks like these with relative ease" (§1 Introduction);而 `2502.14802` 自己把这派判负:"all previous structure-augmented methods underperform against the strongest embedding-based RAG methods available on all three benchmark types" (§1 Introduction),附加一条更要命的观察"each method type experiences the largest performance decay in tasks outside its own experimental setup" (§1 Introduction)。`2310.06770` 提供了反例场景:"Dense retrieval methods are ill-suited to our setting due to very long key and query lengths" (§4.1 Retrieval-Based Approach),反而"BM25 retrieves a superset of the oracle files" (§4.1 Retrieval-Based Approach)。`2307.03172` 提醒排布本身是变量:"Figure 5 presents multi-document question answering performance when varying the position of relevant information within the input context." (§2.3 Results and Discussion)。`2410.10813` 把评测拆成多能力,"Answering complex queries may require recalling numerous memory items." (§CP 4: Reading Strategy),并指出呈现格式有影响"we present retrieved items in a structured JSON format" (§5.5 Improving reading with chain-of-note and structured format);`2309.02427` 提供术语骨架,记忆动作就是把信息"reads information from long-term memories into working memory" (§4.3 Retrieval actions)。

最后十篇里有相当一部分其实是在测量和训练信号上做工作,而不是在造记忆结构。`2402.17753` 给出人类差距的具体数字:"but still significantly lag behind human levels (by 56%), especially in temporal reasoning, (by 73%)" (§1 Introduction);`2501.13956` 直接质疑旧基准"The limitations of the DMR evaluation extend beyond its small scale." (§4.2 Deep Memory Retrieval (DMR)),并划出 RAG 的边界"Current approaches using RAG have focused on broad domain knowledge and largely static corpora" (§1 Introduction)。训练信号一侧:`2508.19828` 的诊断是"Yet, they remain fundamentally stateless" (§1 Introduction),方案是"an RL fine-tuned, memory-augmented LLM framework with two specialized agents" (§1 Introduction);`2506.15841` 用压缩换上下文"To achieve a constant memory, MEM1 is particularly trained to iteratively refine its understanding" (§3.1 Memory as Part of Reasoning);`2402.03300` 的 GRPO 动机是显存成本"As the value function employed in PPO is typically another model of comparable size as the policy model, it brings a substantial memory and computational burden." (§4.1.1 From PPO to GRPO);`2505.09388` 把奖励接进后训练"we incorporate reward signals to guide the model toward generating accurate and contextually appropriate responses" (§4 Post-training),同时承认"In thinking mode, the model’s performance slightly degrades." (§Appendix A Appendix)。`2302.04761` 的老洞见是自举数据"using large LMs with in-context learning ( Brown et al., 2020 ) to generate entire datasets from scratch" (§1 Introduction);`2210.03629` 把推理轨迹本身当输出"which we will refer to as a thought or a reasoning trace" (§2 ReAct : Synergizing Re asoning + Act ing);`2010.03768` 展示跨环境迁移"an agent that first learns to perform abstract tasks in TextWorld using Imitation Learning (IL) and then transfers the learned policies to embodied tasks in ALFRED" (§1 Introduction)。

## 二、我认为什么变了

1. 记忆的选择应当是连续强度而不是资格判定。我们的 src/knowledge/select.js:64 `isExpired` 是一个二值判断,:113 的 `staleness` 只是每轮线性扣分。`2305.10250` 的遗忘曲线 (§6 Conclusion) 和 `2304.03442` 的加权检索 (§Approach:) 描述的都是同一个量:每条记忆有一个随被使用而上升、随时间而衰减的激活,它出现在候选里的概率由这个量决定。改变的是我们怎么测——现在只能测"这条 lesson 在不在池子里",该测"这条 lesson 在第 8 轮被抽中的概率是否仍高于第 1 轮"。

2. 我们的 lesson 形状太窄,窄到无法承载机制。`2509.25140` 要求"Each memory item specifies three components" (§3.2 ReasoningBank),`2510.04618` 要求上下文是"a collection of structured, itemized bullets" (§3.1 Incremental Delta Updates)。我们 src/dispatch/brief.js:200 只渲染 `[kind] claim`,加上 200 字符的 claim 上限,等于把学到的机制压成一句口号。改变的是写入端:`deriveLesson` 该产出"触发条件 / 动作 / 验证信号"三段,而不是一句自然语言。

3. 我们是 MemRL 那一类系统,而论文已经指出这类系统会在复杂任务上失效。`2602.08234` 的原话——"MemRL, which uses RL solely to update its memory bank while keeping the policy frozen, fails to adapt to complex environments" (§4.2 Main Results)——精确描述了我们的现状:policy 是固定的模型与 prompt,每轮只更新 knowledge.json。改变的是实验设计:需要一条对照臂,让选择策略(而不是记忆内容)随历史变化,看增益是否只存在于简单任务上。

4. trials 的判定是开环的,20 次的门槛没有任何统计依据。src/knowledge/cross.js:115 `TRIAL_MIN=20`,:117 用 `wins > losses` 判 keep 或 drop,平局被算进失败侧。`2508.19828` 的"stateless"诊断 (§1 Introduction) 正好命中这种固定阈值。改变的是测量:shown/wins/losses 必须同时记录上下文(family、phase、任务类型),先问"它在哪一类任务上赢",再问"它总体赢不赢"。

5. 结构化检索在我们这种 key 长度下未必正确,但这不构成升级的理由。`2310.06770` 说 dense 在超长 key/query 下不适用 (§4.1 Retrieval-Based Approach),同时"BM25 retrieves a superset of the oracle files" (§4.1 Retrieval-Based Approach);而我们的 src/knowledge/select.js:150 `blockedByNotWhen` 用子串匹配决定"该不该发",实际上是最粗的关键词过滤。改变的是我对它的评价:它不是占位符,它可能是正确基线。该先测"把子串匹配换成 embedding 相似度能强多少",而不是默认要升级。

6. 上图谱这件事,对我们而言一手证据是负的。`2502.14802` 说结构增强在全部三类基准上输给最强 embedding RAG (§1 Introduction),并说"each method type experiences the largest performance decay in tasks outside its own experimental setup" (§1 Introduction)。我们的 borrow 机制(src/runtime/round.js:1552-1562,每轮把全局 lesson 借进本地池)正是跨设定迁移,却没有任何跨 campaign 的专门评估。改变的是评估范围:加一个 holdout family,只测借入的 lesson 在没见过的 family 上的增量。

7. 位置是一个我们从未控制的变量。`2307.03172` 明确说性能随相关信息在上下文中的位置而变化 (§2.3 Results and Discussion);我们 src/dispatch/brief.js:13 写死 `MAX_LESSONS=3`,:301 超长时又先丢 notes 再丢 lessons,结果是 brief 一旦变长,知识就被系统性推到末尾或被整段删除。改变的是 brief 的构造方式:lessons 在 brief 中的位置必须是一个可配置的实验因子,而不是渲染顺序的副产品。

8. 我们存下了 procedure 的 steps,却从不展示。src/knowledge/procedure.js:100 `induceProcedures` 生成的 steps 在 src/core/reduce.js:416 被保留,在 src/dispatch/brief.js:200 被丢弃。`2508.06433` 说过程记忆"should have a reasonable update mechanism" (§3.1 Agent Procedural Memory),而我们的更新机制连读都没读到它;`2305.16291` 说技能库的价值在于可复用、可解释 (§1 Introduction),一句 claim 两者皆无。改变的是 loop 产出物的定义:一条 procedure 被"使用",应当是它的 steps 被逐条执行,而不是它的 claim 被读一遍。

## 三、这批论文之间互相矛盾的地方

1. 记忆到底该不该写进权重,两边的可行域是互斥的。`2501.00663` 主张"learns how to memorize/store the data into its parameters at test time" (§Contributions and Roadmap),即容量受参数规模约束、更新发生在梯度上;`2508.16153` 主张"eliminates the need for fine-tuning the underlying LLMs" (§Abstract),`2510.04618` 更把界划死——"Context adaptation (or context engineering) refers to methods that improve model behavior by constructing or modifying inputs to an LLM, rather than altering its weights." (§2.1 Context Adaptation)。这不是措辞差异:前者认为长期记忆必须落在权重里,后者认为落在权重里就是错的,两者的容量上限和更新代价根本不同量纲,不可能同时为真。

2. 结构增强有没有增益,而且是同一路线内部的反驳。`2405.14831` 的立论是结构带来知识整合能力——"our brains are capable of solving challenging knowledge integration tasks like these with relative ease" (§1 Introduction),机制是"pattern completion drives the memory retrieval process" (§2.1 The Hippocampal Memory Indexing Theory);`2502.14802` 的立论是这条路线的历史成果全部不如纯 embedding 检索——"all previous structure-augmented methods underperform against the strongest embedding-based RAG methods available on all three benchmark types" (§1 Introduction)。前者说结构解决多跳整合,后者说结构在三个基准类型上都没有兑现;两边至少有一边对"结构"的定义或对"增益"的度量是错的。

3. 记忆该不该忘。`2305.10250` 用遗忘曲线做衰减 (§6 Conclusion),前提是遗忘是功能而非缺陷;`2508.06433` 说"vector-based storage and retrieval confer an advantage over human procedural memory: they can be scaled both in total capacity and in the number of memories retrieved" (§Scaling Memory Retrieval Improves Agent Performance.),前提是容量与召回条数都可以扩大,忘只是人为限制;`2602.08234` 又回到中间立场,但换了机制——"the raw memory approach suffers from a high and fluctuating token footprint" (§4.3 Analysis),问题不是记得太多,而是记得太散。三种立场都自称解决了同一个问题,给出的动作却分别是衰减、扩容、压缩。

4. 结构化多召回是帮忙还是添乱。`2410.10813` 一边说"Answering complex queries may require recalling numerous memory items." (§CP 4: Reading Strategy),一边给出"we present retrieved items in a structured JSON format" (§5.5 Improving reading with chain-of-note and structured format) 作为改进手段;`2602.08234` 说原始记忆方式的 token 占用"high and fluctuating" (§4.3 Analysis);`2307.03172` 说位置一换性能就变 (§2.3 Results and Discussion)。把这三条放在一起,召回越多、结构越复杂,位置效应与 token 波动的暴露面就越大,所以"多而结构化"与"少而稳定"在同一个评测维度上给出相反建议,而这批论文里没有一篇同时测过这两个方向。

## 四、三条我会改的

1. 改 src/knowledge/select.js 的遗忘模型,并把它接进主路径。把 `isExpired`(:64) 的二值过期与 `scoreLesson`(:113) 的线性 `staleness` 合成一条连续强度曲线——每次 `lesson.shown` 抬升、每轮衰减,抽中概率由强度决定;同时把完全没有调用点的 `pruneLessons`(:232) 接进 src/runtime/round.js 的收尾段(2609-2620 一带,与 `deriveLesson`、`induceProcedures` 同一处),否则"遗忘"永远只是选择时的一次过滤,而不是知识库的一次代谢。

2. 改 src/knowledge/procedure.js:100 与 src/dispatch/brief.js:200,让 procedure 的 steps 真正进入 loop。`deriveLesson` 产出三段结构(触发条件 / 动作 / 验证信号),brief 渲染 steps 而不只是 claim;并把 lessons 在 brief 中的位置提升为可配置因子——现在 brief.js:13 的 `MAX_LESSONS=3` 是写死的,:301 又让 lessons 成为超长时第一个被丢弃的对象,这两个决定应当由一个显式的位置参数与预算参数承担,好让 §二.7 的实验能做。

3. 改 src/knowledge/cross.js:117 与 src/knowledge/dream.js:70,把判定从拍数改成区间。`trialVerdict` 的固定 20 次门槛与 `wins > losses` 换成带置信区间的判定,样本不足就老实返回 insufficient 而不是默认归入失败侧;同时把 `consolidate` 从 src/tools/index.js:355 的手动工具提到 round 主路径,让"近重复合并 / 撕裂矛盾检出"成为每轮事件,而不是操作员的主动动作——否则 dream.js 里那套并查集与矛盾检测永远不会作用于真实轮次。

## 五、这份阅读没回答的三件事

1. [UNREAD] `1707.06347`(PPO)在本 digest 里只有指向 PDF 的指针,没有正文。这使得上面所有关于"更新策略还是更新记忆"的对比(尤其 `2602.08234` §4.2 对 MemRL 的判决)缺了一半证据:我不知道一次策略更新的方差是否小于一次记忆库更新的方差,而这正是判断"值不值得动 policy"的核心量。在读不到这一半的情况下,我对 §二.3 的置信度只能算中等。

2. 没有一篇估计过"一条错误记忆被用一次"的边际成本。我们的 src/runtime/round.js:2232 有 `shouldQuarantine(minHarm = 2)` 这条隔离线,但 2 是我拍的;论文里最接近的证据是 `2508.19828` 的 stateless 诊断 (§1 Introduction) 与 `2410.10813` 的多能力评测 (§CP 4: Reading Strategy),两者都不给单条错误记忆的代价。缺这个量,trials 的 keep/drop 判定只能继续拍。

3. 没有一篇回答"跨 campaign 的 lesson 该不该无条件继承"。`2502.14802` 说跨设定迁移是最大退化来源 (§1 Introduction),我们的 borrow 恰恰是无条件跨 campaign;但同一段也没给出"什么条件下迁移为正"的判据。要回答它需要一次我们自己的 holdout family 实验,而不是再读一篇论文。
