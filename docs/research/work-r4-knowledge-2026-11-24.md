# Library: r4-knowledge

Built from arXiv HTML bodies on 2026-11-25. 12 work(s).

| work | year | mechanism points | figure | cited by | summary |
| --- | --- | --- | --- | --- | --- |
| [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) | 2023 | 5 | yes | 1 | yes |
| [A-Mem: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) | 2025 | 5 | yes | 1 | yes |
| [ReAct : Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) | 2023 | 11 | yes | 1 | yes |
| [Voyager : An Open-Ended Embodied Agent with Large Language Models](https://arxiv.org/abs/2305.16291) | 2024 | 4 | yes | 0 | yes |
| [Mem0 : Building Production - Ready AI Agents with Scalable Long - Term Memory](https://arxiv.org/abs/2504.19413) | 2025 | 12 | yes | 0 | yes |
| [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) | 2023 | 19 | yes | 2 | yes |
| [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | 2023 | 4 | yes | 0 | yes |
| [MemoryBank: Enhancing Large Language Models with Long-Term Memory](https://arxiv.org/abs/2305.10250) | 2024 | 7 | yes | 1 | yes |
| [Agent Workflow Memory](https://arxiv.org/abs/2409.07429) | 2025 | 6 | yes | 0 | yes |
| [LongMemEval : Benchmarking Chat Assist- ants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813) | 2025 | 9 | yes | 0 | yes |
| [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://arxiv.org/abs/2402.17753) | 2024 | 4 | yes | 1 | yes |
| [Zep: A Temporal Knowledge Graph Architecture for Agent Memory](https://arxiv.org/abs/2501.13956) | 2025 | 6 | no | 1 | yes |

Summaries written: 12 of 12

---

# MemGPT: Towards LLMs as Operating Systems

arXiv:2310.08560 · 2023 · [source](https://arxiv.org/html/2310.08560)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
In recent years, large language models (LLMs) and their underlying transformer architecture ( Vaswani et al., 2017 ; Devlin et al., 2018 ; Brown et al., 2020 ; Ouyang et al., 2022 ) have become the cornerstone of conversational AI and have led to a wide array of consumer and enterprise applications. Despite these advances, the limited fixed-length context windows used by LLMs significantly hinders their applicability to long conversations or reasoning about long documents. For example, the most widely used open-source LLMs can only support a few dozen back-and-forth messages or reason about a short document before exceeding their maximum input length ( Touvron et al., 2023 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 MemGPT (MemoryGPT)"]
  N1["§2.1 Main context ( prompt tokens )"]
  N2["§2.2 Queue Manager"]
  N3["§2.3 Function executor (handling of completion tokens )"]
  N4["§2.4 Control flow and function chaining"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

![MemGPT (left) writes data to persistent memory after it receives a system alert about limited context space.](https://arxiv.org/html/2310.08560/2310.08560v2/memgpt_diagrams_wide_memory_creation.png)

*MemGPT (left) writes data to persistent memory after it receives a system alert about limited context space.*

<sub>figure: `2310.08560v2/memgpt_diagrams_wide_memory_creation.png`</sub>

## 机制
### 1. MemGPT (MemoryGPT)

MemGPT’s OS-inspired multi-level memory architecture delineates between two primary memory types: main context (analogous to main memory/physical memory/RAM) and external context (analogous to disk memory/disk storage). Main context consists of the LLM prompt tokens —anything in main context is considered in-context and can be accessed by the LLM processor during inference. External context refers to any information that is held outside of the LLMs fixed context window. This out-of-context data must always be explicitly moved into main context in order for it to be passed to the LLM processor during inference. MemGPT provides function calls that the LLM processor to manage its own memory without any user intervention.

<sub>§2 MemGPT (MemoryGPT)</sub>

### 2. Main context ( prompt tokens )

The prompt tokens in MemGPT are split into three contiguous sections: the system instructions , working context , and FIFO Queue . The system instructions are read-only (static) and contain information on the MemGPT control flow, the intended usage of the different memory levels, and instructions on how to use the MemGPT functions (e.g. how to retrieve out-of-context data). Working context is a fixed-size read/write block of unstructured text, writeable only via MemGPT function calls. In conversational settings, working context is intended to be used to store key facts, preferences, and other important information about the user and the persona the agent is adopting, allowing the agent to converse fluently with the user. The FIFO queue stores a rolling history of messages, including messages between the agent and user, as well as system messages (e.g. memory warnings) and function call inputs and outputs. The first index in the FIFO queue stores a system message containing a recursive summary of messages that have been evicted from the queue.

<sub>§2.1 Main context ( prompt tokens )</sub>

### 3. Queue Manager

The queue manager manages messages in recall storage and the FIFO queue . When a new message is received by the system, the queue manager appends the incoming messages to the FIFO queue, concatenates the prompt tokens and triggers the LLM inference to generate LLM output (the completion tokens). The queue manager writes both the incoming message and the generated LLM output to recall storage (the MemGPT message database). When messages in recall storage are retrieved via a MemGPT function call, the queue manager appends them to the back of the queue to reinsert them into the LLM’s context window. The queue manager is also responsible for controlling context overflow via a queue eviction policy. When the prompt tokens exceed the ‘warning token count‘ of the underlying LLM’s context window (e.g. 70% of the context window), the queue manager inserts a system message into the queue warning the LLM of an impending queue eviction (a ‘memory pressure‘ warning) to allow the LLM to use MemGPT functions to store important information contained in the FIFO queue to working context or archival storage (a read/write database storing arbitrary length text objects). When the prompt tokens exceed the ‘flush token count’ (e.g. 100% of the context window), the queue manager flushes the queue to free up space in the context window: the queue manager evicts a specific count of messages (e.g. 50% of the context window), generates a new recursive summary using the existing recursive summary and evicted messages. Once the queue is flushed, the evicted messages are no longer in-context and immediately viewable to the LLM, however they are stored indefinitely in recall storage and readable via MemGPT function calls.

<sub>§2.2 Queue Manager</sub>

### 4. Function executor (handling of completion tokens )

MemGPT orchestrates data movement between main context and external context via function calls that are generated by the LLM processor. Memory edits and retrieval are entirely self-directed: MemGPT autonomously updates and searches through its own memory based on the current context. For instance, it can decide when to move items between contexts (e.g. when the conversation history is becoming too long, as show in Figure 1 ) and modify its main context to better reflect its evolving understanding of its current objectives and responsibilities (as shown in Figure 3 ). We implement self-directed editing and retrieval by providing explicit instructions within the system instructions that guide the LLM on how to interact with the MemGPT memory systems. These instructions comprise two main components: (1) a detailed description of the memory hierarchy and their respective utilities, and (2) a function schema (complete with their natural language descriptions) that the system can call to access or modify its memory. During each inference cycle, LLM processor takes main context (concatenated into a single string) as input, and generates an output string. This output string is parsed by MemGPT to ensure correctness, and if the parser validates the function arguments the function is executed. The results, including any runtime errors that occur (e.g. trying to add to main context when it is already at maximum capacity), are then fed back to the processor by MemGPT. This feedback loop enables the system to learn from its actions and adjust its behavior accordingly. Awareness of context limits is a key aspect in making the self-editing mechanism work effectively, to this end MemGPT prompts the processor with warnings regarding token limitations to guide its memory management decisions. Additionally, our memory retrieval mechanisms are designed to be cognizant of these token constraints and implement pagination to prevent retrieval calls from overflowing the context window.

<sub>§2.3 Function executor (handling of completion tokens )</sub>

### 5. Control flow and function chaining

In MemGPT, events trigger LLM inference: events are generalized inputs to MemGPT and can consist of user messages (in chat applications), system messages (e.g. main context capacity warnings), user interactions (e.g. an alert that a user just logged in, or an alert that they finished uploading a document), and timed events that are run on a regular schedule (allowing MemGPT to run ‘unprompted’ without user intervention). MemGPT processes events with a parser to convert them into plain text messages that can be appended to main context and eventually be fed as input into the LLM processor. Many practical tasks require calling multiple functions in sequence, for example, navigating through multiple pages of results from a single query or collating data from different documents in main context from separate queries. Function chaining allows MemGPT to execute multiple function calls sequentially before returning control to the user. In MemGPT, functions can be called with a special flag that requests control be immediately returned to the processor after the requested function completes execution. If this flag is present, MemGPT will add the function output to main context and (as opposed to pausing processor execution). If this flag is not present (a yield ), MemGPT will not run the LLM processor until the next external event trigger (e.g. a user message or scheduled interrupt).

<sub>§2.4 Control flow and function chaining</sub>

## 总结与展望
MemGPT 把上下文窗口当成内存来管理：主上下文是「内存」，外部存储是「磁盘」，模型自己决定什么时候把内容换进来、换出去。它对「经验如何变成结构」的意义在于：写入与检索的决策权交给了模型，而不是由外部规则决定什么值得记。

**It connects to**

- `2502.12110` — A-MEM 把这种自主性从「换页」推进到「重组结构」，是同一路线的下一步。
- `2501.13956` — Zep 用知识图谱替代平铺存储，解决的是 MemGPT 检索靠相似度的弱点。

## 不足之处
**What a reader should still not conclude**

- 换页决策由模型自述，论文没有报告「模型是否记得自己写过」这类自洽性检查。
- 它的评测是长文档问答，不是跨会话的经验积累。

---

# A-Mem: Agentic Memory for LLM Agents

arXiv:2502.12110 · 2025 · [source](https://arxiv.org/html/2502.12110)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large Language Model (LLM) agents have demonstrated remarkable capabilities in various tasks, with recent advances enabling them to interact with environments, execute tasks, and make decisions autonomously [ 23 , 33 , 7 ] . They integrate LLMs with external tools and delicate workflows to improve reasoning and planning abilities. Though LLM agent has strong reasoning performance, it still needs a memory system to provide long-term interaction ability with the external environment [ 35 ] .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Methodolodgy"]
  N1["§3.1 Note Construction"]
  N2["§3.2 Link Generation"]
  N3["§3.3 Memory Evolution"]
  N4["§3.4 Retrieve Relative Memory"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

![Our A-Mem architecture comprises three integral parts in memory storage. During note construction, the system processes new interaction memories and stores them as notes with multiple attributes. The link generation process first retrieves the most relevant historical memories and then employs an LLM to determine whether connections should be established between them. The concept of a ’box’ describes that related memories become interconnected through their similar contextual descriptions, analogous to the Zettelkasten method. However, our approach allows individual memories to exist simultaneously within multiple different boxes. During the memory retrieval stage, we extract query embeddings using a text encoding model and search the memory database for relevant matches. When related memory is retrieved, similar memories that are linked within the same box are also automatically accessed.](https://arxiv.org/html/2502.12110/2502.12110v11/framework.png)

*Our A-Mem architecture comprises three integral parts in memory storage. During note construction, the system processes new interaction memories and stores them as notes with multiple attributes. The link generation process first retrieves the most relevant historical memories and then employs an LLM to determine whether connections should be established between them. The concept of a ’box’ describes that related memories become interconnected through their similar contextual descriptions, analogous to the Zettelkasten method. However, our approach allows individual memories to exist simultaneously within multiple different boxes. During the memory retrieval stage, we extract query embeddings using a text encoding model and search the memory database for relevant matches. When related memory is retrieved, similar memories that are linked within the same box are also automatically accessed.*

<sub>figure: `2502.12110v11/framework.png`</sub>

## 机制
### 1. Methodolodgy

Our proposed agentic memory system draws inspiration from the Zettelkasten method, implementing a dynamic and self-evolving memory system that enables LLM agents to maintain long-term memory without predetermined operations. The system’s design emphasizes atomic note-taking, flexible linking mechanisms, and continuous evolution of knowledge structures.

<sub>§3 Methodolodgy</sub>

### 2. Note Construction

Building upon the Zettelkasten method’s principles of atomic note-taking and flexible organization, we introduce an LLM-driven approach to memory note construction. When an agent interacts with its environment, we construct structured memory notes that capture both explicit information and LLM-generated contextual understanding. Each memory note m i m_{i} in our collection ℳ = { m 1 , m 2 , … , m N } \mathcal{M}=\{m_{1},m_{2},...,m_{N}\} is represented as: where c i c_{i} represents the original interaction content, t i t_{i} is the timestamp of the interaction, K i K_{i} denotes LLM-generated keywords that capture key concepts, G i G_{i} contains LLM-generated tags for categorization, X i X_{i} represents the LLM-generated contextual description that provides rich semantic understanding, and L i L_{i} maintains the set of linked memories that share semantic relationships. To enrich each memory note with meaningful context beyond its basic content and timestamp, we leverage an LLM to analyze the interaction and generate these semantic components. The note construction process involves prompting the LLM with carefully designed templates P s ​ 1 P_{s1} : Following the Zettelkasten principle of atomicity, each note captures a single, self-contained unit of knowledge. To enable efficient retrieval and linking, we compute a dense vector representation via a text encoder [ 27 ] that encapsulates all textual components of the note: By using LLMs to generate enriched components, we enable autonomous extraction of implicit knowledge from raw interactions. The multi-faceted note structure ( K i K_{i} , G i G_{i} , X i X_{i} ) creates rich representations that capture different aspects of the memory, facilitating nuanced organization and retrieval. Additionally, the combination of LLM-generated semantic components with dense vector representations provides both context and computationally efficient similarity matching.

<sub>§3.1 Note Construction</sub>

### 3. Link Generation

Our system implements an autonomous link generation mechanism that enables new memory notes to form meaningful connections without predefined rules. When the constrctd memory note m n m_{n} is added to the system, we first leverage its semantic embedding for similarity-based retrieval. For each existing memory note m j ∈ ℳ m_{j}\in\mathcal{M} , we compute a similarity score: The system then identifies the top- k k most relevant memories: Based on these candidate nearest memories, we prompt the LLM to analyze potential connections based on their potential common attributes. Formally, the link set of memory m n m_{n} update like: Each generated link l i l_{i} is structured as: L i = { m i , … , m k } L_{i}=\{m_{i},...,m_{k}\} . By using embedding-based retrieval as an initial filter, we enable efficient scalability while maintaining semantic relevance. A-Mem can quickly identify potential connections even in large memory collections without exhaustive comparison. More importantly, the LLM-driven analysis allows for nuanced understanding of relationships that goes beyond simple similarity metrics. The language model can identify subtle patterns, causal relationships, and conceptual connections that might not be apparent from embedding similarity alone. We implements the Zettelkasten principle of flexible linking while leveraging modern language models. The resulting network emerges organically from memory content and context, enabling natural knowledge organization.

<sub>§3.2 Link Generation</sub>

### 4. Memory Evolution

After creating links for the new memory, A-Mem evolves the retrieved memories based on their textual information and relationships with the new memory. For each memory m j m_{j} in the nearest neighbor set ℳ near n \mathcal{M}_{\text{near}}^{n} , the system determines whether to update its context, keywords, and tags. This evolution process can be formally expressed as: The evolved memory m j ∗ m_{j}^{*} then replaces the original memory m j m_{j} in the memory set ℳ \mathcal{M} . This evolutionary approach enables continuous updates and new connections, mimicking human learning processes. As the system processes more memories over time, it develops increasingly sophisticated knowledge structures, discovering higher-order patterns and concepts across multiple memories. This creates a foundation for autonomous memory learning where knowledge organization becomes progressively richer through the ongoing interaction between new experiences and existing memories.

<sub>§3.3 Memory Evolution</sub>

### 5. Retrieve Relative Memory

In each interaction, our A-Mem performs context-aware memory retrieval to provide the agent with relevant historical information. Given a query text q q from the current interaction, we first compute its dense vector representation using the same text encoder used for memory notes: The system then computes similarity scores between the query embedding and all existing memory notes in ℳ \mathcal{M} using cosine similarity: Then we retrieve the k most relevant memories from the historical memory storage to construct a contextually appropriate prompt. These retrieved memories provide relevant historical context that helps the agent better understand and respond to the current interaction. The retrieved context enriches the agent’s reasoning process by connecting the current interaction with related past experiences stored in the memory system.

<sub>§3.4 Retrieve Relative Memory</sub>

## 总结与展望
A-MEM 让每条笔记在被写入时自动生成标签与上下文，并与其他笔记建立链接，形成一张随使用而演化的网络。它比 MemGPT 更进一步的地方是：结构不是预先设计的，而是写入时生成的——这正是「经验变成结构」的字面含义。

**It connects to**

- `2310.08560` — 自主编辑记忆的路线从它开始。
- `2304.03442` — 生成式代理的检索是三元加权，A-MEM 用链接；两种结构都试图让「相关的旧事」自己浮上来。

## 不足之处
**The authors say:** While our agentic memory system achieves promising results, we acknowledge several areas for potential future exploration. First, although our system dynamically organizes memories, the quality of these organizations may still be influenced by the inherent capabilities of the underlying language models. Different LLMs might generate slightly different contextual descriptions or establish varying connections between memories. Additionally, while our current implementation focuses on text-based interactions, future work could explore extending the system to handle multimodal information, such as images or audio, which could provide richer contextual representations.

**What a reader should still not conclude**

- 链接由 LLM 生成，论文没有测链接的质量（是否会连错），只测了最终问答准确率。
- 笔记数量增长后的检索成本没有系统报告。

<sub>§6 Limitations</sub>

---

# ReAct : Synergizing Reasoning and Acting in Language Models

arXiv:2210.03629 · 2023 · [source](https://arxiv.org/html/2210.03629)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
A unique feature of human intelligence is the ability to seamlessly combine task-oriented actions with verbal reasoning (or inner speech, Alderson-Day & Fernyhough, 2015 ), which has been theorized to play an important role in human cognition for enabling self-regulation or strategization ( Vygotsky, 1987 ; Luria, 1965 ; Fernyhough, 2010 ) and maintaining a working memory ( Baddeley, 1992 ) . Consider the example of cooking up a dish in the kitchen. Between any two specific actions, we may reason in language in order to track progress (“now that everything is cut, I should heat up the pot of water”), to handle exceptions or adjust the plan according to the situation (“I don’t have salt, so let me use soy sauce and pepper instead”), and to realize when external information is needed (“how do I prepare dough? Let me search on the Internet”). We may also act (open a cookbook to read the recipe, open the fridge, check ingredients) to support the reasoning and to answer questions (“What dish can I make right now?”). This tight synergy between “acting” and “reasoning” allows humans to learn new tasks quickly and perform robust decision making or reasoning, even under previously unseen circumstances or facing information uncertainties.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Knowledge-Intensive Reasoning Tasks"]
  N1["§3.1 Setup"]
  N2["§Domains"]
  N3["§Action Space"]
  N4["§3.2 Methods"]
  N5["§ReAct Prompting"]
  N6["§Baselines"]
  N7["§Combining Internal and External Knowledge"]
  N8["§Finetuning"]
  N9["§ReAct outperforms Act consistently"]
  N10["§ReAct vs. CoT"]
  N11["§ReAct + CoT -SC perform best for prompting LLMs"]
  N12["§ReAct performs best for fine-tuning"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
  N9 --> N10
  N10 --> N11
  N11 --> N12
```

![(1) Comparison of 4 prompting methods, (a) Standard , (b) Chain-of-thought ( CoT , Reason Only), (c) Act -only, and (d) ReAct (Reason+Act), solving a HotpotQA ( Yang et al., 2018 ) question. (2) Comparison of (a) Act -only and (b) ReAct prompting to solve an AlfWorld ( Shridhar et al., 2020b ) game. In both domains, we omit in-context examples in the prompt, and only show task solving trajectories generated by the model (Act, Thought) and the environment (Obs).](https://arxiv.org/html/2210.03629/2210.03629v3/teaser-new.svg)

*(1) Comparison of 4 prompting methods, (a) Standard , (b) Chain-of-thought ( CoT , Reason Only), (c) Act -only, and (d) ReAct (Reason+Act), solving a HotpotQA ( Yang et al., 2018 ) question. (2) Comparison of (a) Act -only and (b) ReAct prompting to solve an AlfWorld ( Shridhar et al., 2020b ) game. In both domains, we omit in-context examples in the prompt, and only show task solving trajectories generated by the model (Act, Thought) and the environment (Obs).*

<sub>figure: `2210.03629v3/teaser-new.svg`</sub>

## 机制
### 1. Knowledge-Intensive Reasoning Tasks

We begin with knowledge-intensive reasoning tasks like multi-hop question answering and fact verification. As shown in Figure 1 (1d), by interacting with a Wikipedia API, ReAct is able to retrieve information to support reasoning, while also use reasoning to target what to retrieve next, demonstrating a synergy of reasoning and acting.

<sub>§3 Knowledge-Intensive Reasoning Tasks</sub>

### 2. Domains

We consider two datasets challenging knowledge retrieval and reasoning: (1) HotPotQA ( Yang et al., 2018 ) , a multi-hop question answering benchmark that requires reasoning over two or more Wikipedia passages, and (2) FEVER ( Thorne et al., 2018 ) , a fact verification benchmark where each claim is annotated SUPPORTS, REFUTES, or NOT ENOUGH INFO, based on if there exists a Wikipedia passage to verify the claim. In this work, we operate in a question-only setup for both tasks, where models only receive the question/claim as input without access to support paragraphs, and have to rely on their internal knowledge or retrieve knowledge via interacting with an external environment to support reasoning.

<sub>§Domains</sub>

### 3. Action Space

We design a simple Wikipedia web API with three types of actions to support interactive information retrieval: (1) search [ entity ], which returns the first 5 sentences from the corresponding entity wiki page if it exists, or else suggests top-5 similar entities from the Wikipedia search engine, (2) lookup [ string ], which would return the next sentence in the page containing string , simulating Ctrl+F functionality on the browser. (3) finish [ answer ], which would finish the current task with answer . We note that this action space mostly can only retrieve a small part of a passage based on exact passage name, which is significantly weaker than state-of-the-art lexical or neural retrievers. The purpose is to simulate how humans would interact with Wikipedia, and force models to retrieve via explicit reasoning in language.

<sub>§Action Space</sub>

### 4. ReAct Prompting

For HotpotQA and Fever, we randomly select 6 and 3 cases 2 2 2 We find more examples do not improve performance. from the training set and manually compose ReAct -format trajectories to use as few-shot exemplars in the prompts. Similar to Figure 1 (d), each trajectory consists of multiple thought-action-observation steps (i.e. dense thought), where free-form thoughts are used for various purposes. Specifically, we use a combination of thoughts that decompose questions (“I need to search x, find y, then find z”), extract information from Wikipedia observations (“x was started in 1844”, “The paragraph does not tell x”), perform commonsense (“x is not y, so z must instead be…”) or arithmetic reasoning (“1844 < 1989”), guide search reformulation (“maybe I can search/look up x instead”), and synthesize the final answer (“…so the answer is x”). See Appendix C for more details.

<sub>§ReAct Prompting</sub>

### 5. Baselines

We systematically ablate ReAct trajectories to build prompts for multiple baselines (with formats as Figure 1 (1a-1c)): (a) Standard prompting ( Standard ), which removes all thoughts, actions, observations in ReAct trajectories. (b) Chain-of-thought prompting ( CoT ) ( Wei et al., 2022 ) , which removes actions and observations and serve as a reasoning-only baseline. We also build a self-consistency baseline ( CoT-SC ) ( Wang et al., 2022a ; Wang et al., 2022b ) by sampling 21 CoT trajectories with decoding temperature 0.7 during inference and adopting the majority answer, which is found to consistently boost performance over CoT . (c) Acting-only prompt ( Act ), which removes thoughts in ReAct trajectories, loosely resembling how WebGPT ( Nakano et al., 2021 ) interacts with the Internet to answer questions, though it operates on a different task and action space, and uses imitation and reinforcement learning instead of prompting.

<sub>§Baselines</sub>

### 6. Combining Internal and External Knowledge

As will be detail in Section 3.3 , we observe that the problem solving process demonstrated by ReAct is more factual and grounded, whereas CoT is more accurate in formulating reasoning structure but can easily suffer from hallucinated facts or thoughts. We therefore propose to incorporate ReAct and CoT-SC , and let the model decide when to switch to the other method based on the following heuristics: A) ReAct → \to CoT-SC : when ReAct fails to return an answer within given steps, back off to CoT-SC . We set 7 and 5 steps for HotpotQA and FEVER respectively as we find more steps will not improve ReAct performance 3 3 3 Of all trajectories with correct final answers, those with 7 steps on HotpotQA and 5 steps on FEVER only take up 0.84% and 1.33% respectively. . B) CoT-SC → \to ReAct : when the majority answer among n n CoT-SC samples occurs less than n / 2 n/2 times (i.e. internal knowledge might not support the task confidently), back off to ReAct .

<sub>§Combining Internal and External Knowledge</sub>

### 7. Finetuning

Due to the challenge of manually annotating reasoning traces and actions at scale, we consider a bootstraping approach similar to Zelikman et al. (2022) , using 3,000 trajectories with correct answers generated by ReAct (also for other baselines) to finetune smaller language models (PaLM-8/62B) to decode trajectories (all thoughts, actions, observations) conditioned on input questions/claims. More details are in Appendix B.1 .

<sub>§Finetuning</sub>

### 8. ReAct outperforms Act consistently

Table 1 shows HotpotQA and Fever results using PaLM-540B as the base model with different prompting methods. We note that ReAct is better than Act on both tasks, demonstrating the value of reasoning to guide acting, especially for synthesizing the final answer, as shown in Figure 1 (1c-d). Fine-tuning results 3 also confirm the benefit of reasoning traces for more informed acting.

<sub>§ReAct outperforms Act consistently</sub>

### 9. ReAct vs. CoT

On the other hand, ReAct outperforms CoT on Fever (60.9 vs. 56.3) and slightly lags behind CoT on HotpotQA (27.4 vs. 29.4). Fever claims for SUPPORTS/REFUTES might only differ by a slight amount (see Appendix D.1 ), so acting to retrieve accurate and up-to-date knowledge is vital. To better understand the behavioral difference between ReAct and CoT on HotpotQA, we randomly sampled 50 trajectories with correct and incorrect answers (judged by EM) from ReAct and CoT respectively (thus 200 examples in total), and manually labeled their success and failure modes in Table 2 . Some key observations are as follows: A) Hallucination is a serious problem for CoT , resulting in much higher false positive rate than ReAct (14% vs. 6%) in success mode, and make up its major failure mode (56%). In contrast, the problem solving trajectory of ReAct is more grounded, fact-driven, and trustworthy, thanks to the access of an external knowledge base. B) While interleaving reasoning, action and observation steps improves ReAct ’s groundedness and trustworthiness, such a structural constraint also reduces its flexibility in formulating reasoning steps , leading to more reasoning error rate than CoT . we note that there is one frequent error pattern specific to ReAct , in which the model repetitively generates the previous thoughts and actions, and we categorize it as part of ‘‘reasoning error’’ as the model fails to reason about what the proper next action to take and jump out of the loop 6 6 6 We suspect that this could be due to the sub-optimal greedy decoding procedure, and future work using better decoding (e.g. beam search) might help address this issue. . C) For ReAct , successfully retrieving informative knowledge via search is critical. Non-informative search, which counts for 23% of the error cases, derails the model reasoning and gives it a hard time to recover and reformulate thoughts. This is perhaps an expected trade-off between factuality and flexibility, which motivates our proposed strategies of combining two methods. We provide examples for each success and failure modes in Appendix E.1 . We also find some HotpotQA questions may contain outdated answer labels, see Figure 4 for example.

<sub>§ReAct vs. CoT</sub>

### 10. ReAct + CoT -SC perform best for prompting LLMs

Also shown in Table 1 , the best prompting method on HotpotQA and Fever are ReAct → \to CoT-SC and CoT-SC → \to ReAct respectively. Furthermore, Figure 1 shows how different methods perform with respect to the number of CoT-SC samples used. While two ReAct + CoT-SC methods are advantageous at one task each, they both significantly and consistently outperform CoT-SC across different number of samples, reaching CoT-SC performance with 21 samples using merely 3-5 samples. These results indicate the value of properly combining model internal knowledge and external knowledge for reasoning tasks.

<sub>§ReAct + CoT -SC perform best for prompting LLMs</sub>

### 11. ReAct performs best for fine-tuning

Figure 3 shows the scaling effect of prompting/finetuning four methods ( Standard , CoT , Act , ReAct ) on HotpotQA. With PaLM-8/62B, prompting ReAct performs worst among four methods due to the difficulty to learn both reasoning and acting from in-context examples. However, when finetuned with just 3,000 examples, ReAct becomes the best method among the four, with PaLM-8B finetuned ReAct outperforming all PaLM-62B prompting methods, and PaLM-62B finetuned ReAct outperforming all 540B prompting methods. In contrast, finetuning Standard or CoT is significantly worse than finetuning ReAct or Act for both PaLM-8/62B, as the former essentially teaches models to memorize (potentially halluincated) knowledge facts, and the latter teaches models how to (reason and) act to access information from Wikipedia, a more generalizable skill for knowledge reasoning. As all prompting methods are still significantly far from domain-specific state-of-the-art approaches (Table 1 ), we believe finetuning with more human-written data might be a better way to unleash the power of ReAct .

<sub>§ReAct performs best for fine-tuning</sub>

## 总结与展望
ReAct 把推理与动作分成两条流，只有动作改变环境。这条区分对知识管理是判据：一条经验如果只来自思考，它就是自述；只有观察（工具返回的东西）才是可以被别人核验的证据。

**It connects to**

- `2305.16291` — Voyager 把可复用的东西写成动作（代码），而不是思考。
- `2303.11366` — Reflexion 的自我反思正是「思考」这一侧，所以它的证据强度天然弱。

## 不足之处
**What a reader should still not conclude**

- 论文不讨论跨任务积累，只讨论单任务内的循环。

---

# Voyager : An Open-Ended Embodied Agent with Large Language Models

arXiv:2305.16291 · 2024 · [source](https://arxiv.org/html/2305.16291)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Building generally capable embodied agents that continuously explore, plan, and develop new skills in open-ended worlds is a grand challenge for the AI community [ 1 , 2 , 3 , 4 , 5 ] . Classical approaches employ reinforcement learning (RL) [ 6 , 7 ] and imitation learning [ 8 , 9 , 10 ] that operate on primitive actions, which could be challenging for systematic exploration [ 11 , 12 , 13 , 14 , 15 ] , interpretability [ 16 , 17 , 18 ] , and generalization [ 19 , 20 , 21 ] . Recent advances in large language model (LLM) based agents harness the world knowledge encapsulated in pre-trained LLMs to generate consistent action plans or executable policies [ 16 , 22 , 19 ] . They are applied to embodied tasks like games and robotics [ 23 , 24 , 25 , 26 , 27 ] , as well as NLP tasks without embodiment [ 28 , 29 , 30 ] . However, these agents are not lifelong learners that can progressively acquire, update, accumulate, and transfer knowledge over extended time spans [ 31 , 32 ] .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Method"]
  N1["§2.1 Automatic Curriculum"]
  N2["§2.2 Skill Library"]
  N3["§2.3 Iterative Prompting Mechanism"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Skill library. Top: Adding a new skill. Each time GPT-4 generates and verifies a new skill, we add it to the skill library, represented by a vector database. The key is the embedding vector of the program description (generated by GPT-3.5), while the value is the program itself. Bottom: Skill retrieval. When faced with a new task proposed by the automatic curriculum, we first leverage GPT-3.5 to generate a general suggestion for solving the task, which is combined with environment feedback as the query context. Subsequently, we perform querying to identify the top-5 relevant skills.](https://arxiv.org/html/2305.16291/2305.16291v2/skill_library_fig.png)

*Skill library. Top: Adding a new skill. Each time GPT-4 generates and verifies a new skill, we add it to the skill library, represented by a vector database. The key is the embedding vector of the program description (generated by GPT-3.5), while the value is the program itself. Bottom: Skill retrieval. When faced with a new task proposed by the automatic curriculum, we first leverage GPT-3.5 to generate a general suggestion for solving the task, which is combined with environment feedback as the query context. Subsequently, we perform querying to identify the top-5 relevant skills.*

<sub>figure: `2305.16291v2/skill_library_fig.png`</sub>

## 机制
### 1. Method

Voyager consists of three novel components: (1) an automatic curriculum (Sec. 2.1 ) that suggests objectives for open-ended exploration, (2) a skill library (Sec. 2.2 ) for developing increasingly complex behaviors, and (3) an iterative prompting mechanism (Sec. 2.3 ) that generates executable code for embodied control. Full prompts are presented in Appendix, Sec. A . Directives encouraging diverse behaviors and imposing constraints , such as “ My ultimate goal is to discover as many diverse things as possible ... The next task should not be too hard since I may not have the necessary resources or have learned enough skills to complete it yet. ”; The agent’s current state , including inventory, equipment, nearby blocks and entities, biome, time, health and hunger bars, and position; Previously completed and failed tasks , reflecting the agent’s current exploration progress and capabilities frontier; Additional context : We also leverage GPT-3.5 to self-ask questions based on the agent’s current state and exploration progress and self-answer questions. We opt to use GPT-3.5 instead of GPT-4 for standard NLP tasks due to budgetary considerations. Guidelines for code generation , such as “ Your function will be reused for building more complex functions. Therefore, you should make it generic and reusable. ”; Control primitive APIs, and relevant skills retrieved from the skill library, which are crucial for in-context learning [ 36 , 37 , 38 ] to work well; The generated code from the last round, environment feedback, execution errors, and critique , based on which GPT-4 can self-improve (Sec. 2.3 ); The agent’s current state , including inventory, equipment, nearby blocks and entities, biome, time, health and hunger bars, and position; Chain-of-thought prompting [ 46 ] to do reasoning before code generation. Environment feedback , which illustrates the intermediate progress of program execution (Fig. 5 , left). For example, “ I cannot make an iron chestplate because I need: 7 more iron ingots ” highlights the cause of failure in crafting an iron chestplate. We use bot.chat() inside control primitive APIs to generate environment feedback and prompt GPT-4 to use this function as well during code generation; Execution errors from the program interpreter that reveal any invalid operations or syntax errors in programs, which are valuable for bug fixing (Fig. 5 , right); Self-verification for checking task success. Instead of manually coding success checkers for each new task proposed by the automatic curriculum, we instantiate another GPT-4 agent for self-verification. By providing Voyager ’s current state and the task to GPT-4, we ask it to act as a critic [ 47 , 48 , 49 ] and inform us whether the program achieves the task. In addition, if the task fails, it provides a critique by suggesting how to complete the task (Fig. 6 ). Hence, our self-verification is more comprehensive than self-reflection [ 30 ] by both checking success and reflecting on mistakes.

<sub>§2 Method</sub>

### 2. Automatic Curriculum

Embodied agents encounter a variety of objectives with different complexity levels in open-ended environments. An automatic curriculum offers numerous benefits for open-ended exploration, ensuring a challenging but manageable learning process, fostering curiosity-driven intrinsic motivation for agents to learn and explore, and encouraging the development of general and flexible problem-solving strategies [ 42 , 43 , 44 ] . Our automatic curriculum capitalizes on the internet-scale knowledge contained within GPT-4 by prompting it to provide a steady stream of new tasks or challenges. The curriculum unfolds in a bottom-up fashion, allowing for considerable adaptability and responsiveness to the exploration progress and the agent’s current state (Fig. 3 ). As Voyager progresses to harder self-driven goals, it naturally learns a variety of skills, such as “mining a diamond”. The input prompt to GPT-4 consists of several components:

<sub>§2.1 Automatic Curriculum</sub>

### 3. Skill Library

With the automatic curriculum consistently proposing increasingly complex tasks, it is essential to have a skill library that serves as a basis for learning and evolution. Inspired by the generality, interpretability, and universality of programs [ 45 ] , we represent each skill with executable code that scaffolds temporally extended actions for completing a specific task proposed by the automatic curriculum. The input prompt to GPT-4 consists of the following components: We iteratively refine the program through a novel iterative prompting mechanism (Sec. 2.3 ), incorporate it into the skill library as a new skill, and index it by the embedding of its description (Fig. 4 , top). For skill retrieval, we query the skill library with the embedding of self-generated task plans and environment feedback (Fig. 4 , bottom). By continuously expanding and refining the skill library, Voyager can learn, adapt, and excel in a wide spectrum of tasks, consistently pushing the boundaries of its capabilities in the open world.

<sub>§2.2 Skill Library</sub>

### 4. Iterative Prompting Mechanism

We introduce an iterative prompting mechanism for self-improvement through three types of feedback: During each round of code generation, we execute the generated program to obtain environment feedback and execution errors from the code interpreter, which are incorporated into GPT-4’s prompt for the next round of code refinement. This iterative process repeats until self-verification validates the task’s completion, at which point we add this new skill to the skill library and ask the automatic curriculum for a new objective (Fig. 2 ). If the agent gets stuck after 4 rounds of code generation, then we query the curriculum for another task. This iterative prompting approach significantly improves program synthesis for embodied control, enabling Voyager to continuously acquire diverse skills without human intervention.

<sub>§2.3 Iterative Prompting Mechanism</sub>

## 总结与展望
Voyager 的技能库把「经验」写成可执行代码加描述，于是可以被编译、被组合、被自动课程逐级加压。它在这份语料里代表一种最强的经验形态：可执行，因此可验证；我们存的是一句自然语言断言，因此只能靠复核。

**It connects to**

- `2210.03629` — 技能之所以可靠，是因为它们来自观察而非思考。
- `2409.07429` — Agent Workflow Memory 把工作流也做成可复用单元，形态更接近我们。

## 不足之处
**The authors say:** Cost. The GPT-4 API incurs significant costs. It is 15 × 15\times more expensive than GPT-3.5. Nevertheless, Voyager requires the quantum leap in code generation quality from GPT-4 (Fig. 9 ), which GPT-3.5 and open-source LLMs cannot provide [ 60 ] .

**What a reader should still not conclude**

- 技能的正确性由游戏环境判定，近乎确定性；自然语言经验没有编译器。

<sub>§4 Limitations and Future Work</sub>

---

# Mem0 : Building Production - Ready AI Agents with Scalable Long - Term Memory

arXiv:2504.19413 · 2025 · [source](https://arxiv.org/html/2504.19413)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Human memory is a foundation of intelligence —it shapes our identity, guides decision-making, and enables us to learn, adapt, and form meaningful relationships ( Craik and Jennings, 1992 ) . Among its many roles, memory is essential for communication: we recall past interactions, infer preferences, and construct evolving mental models of those we engage with ( Assmann, 2011 ) . This ability to retain and retrieve information over extended periods enables coherent, contextually rich exchanges that span days, weeks, or even months. AI agents, powered by large language models (LLMs), have made remarkable progress in generating fluent, contextually appropriate responses ( Yu et al., 2024 , Zhang et al., 2024 ) . However, these systems are fundamentally limited by their reliance on fixed context windows, which severely restrict their ability to maintain coherence over extended interactions ( Bulatov et al., 2022 , Liu et al., 2023 ) . This limitation stems from LLMs’ lack of persistent memory mechanisms that can extend beyond their finite context windows. While humans naturally accumulate and organize experiences over time, forming a continuous narrative of interactions, AI systems cannot inherently persist information across separate sessions or after context overflow. The absence of persistent memory creates a fundamental disconnect in human-AI interaction. Without memory, AI agents forget user preferences, repeat questions, and contradict previously established facts. Consider a simple example illustrated in Figure 1 , where a user mentions being vegetarian and avoiding dairy products in an initial conversation. In a subsequent session, when the user asks about dinner recommendations, a system without persistent memory might suggest chicken, completely contradicting the established dietary preferences. In contrast, a system with persistent memory would maintain this critical user information across sessions and suggest appropriate vegetarian, dairy-free options. This common scenario highlights how memory failures can fundamentally undermine user experience and trust.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Proposed Methods"]
  N1["§2.1 Mem0"]
  N2["§2.2 Mem0 g \texttt{Mem0}^{\tiny g}"]
  N3["§3 Experimental Setup"]
  N4["§3.1 Dataset"]
  N5["§(1) Performance Metrics"]
  N6["§(2) Deployment Metrics"]
  N7["§3.3 Baselines"]
  N8["§Open-Source Memory Solutions"]
  N9["§Retrieval-Augmented Generation (RAG)"]
  N10["§Full-Context Processing"]
  N11["§Proprietary Models"]
  N12["§Memory Providers"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
  N9 --> N10
  N10 --> N11
  N11 --> N12
```

![Architectural overview of the Mem0 system showing extraction and update phase. The extraction phase processes messages and historical context to create new memories. The update phase evaluates these extracted memories against similar existing ones, applying appropriate operations through a Tool Call mechanism. The database serves as the central repository, providing context for processing and storing updated memories.](https://arxiv.org/html/2504.19413/2504.19413v1/figures/mem0_pipeline.png)

*Architectural overview of the Mem0 system showing extraction and update phase. The extraction phase processes messages and historical context to create new memories. The update phase evaluates these extracted memories against similar existing ones, applying appropriate operations through a Tool Call mechanism. The database serves as the central repository, providing context for processing and storing updated memories.*

<sub>figure: `2504.19413v1/figures/mem0_pipeline.png`</sub>

## 机制
### 1. Proposed Methods

We introduce two memory architectures for AI agents. (1) Mem0 implements a novel paradigm that extracts, evaluates, and manages salient information from conversations through dedicated modules for memory extraction and updation. The system processes a pair of messages between either two user participants or a user and an assistant. (2) Mem0 g \texttt{Mem0}^{\tiny g} extends this foundation by incorporating graph-based memory representations, where memories are stored as directed labeled graphs with entities as nodes and relationships as edges. This structure enables a deeper understanding of the connections between entities. By explicitly modeling both entities and their relationships, Mem0 g \texttt{Mem0}^{\tiny g} supports more advanced reasoning across interconnected facts, especially for queries that require navigating complex relational paths across multiple memories. Nodes V V represent entities (e.g., Alice , San_Francisco ) Edges E E represent relationships between entities (e.g., lives_in ) Labels L L assign semantic types to nodes (e.g., Alice - Person , San_Francisco - City )

<sub>§2 Proposed Methods</sub>

### 2. Mem0

Our architecture follows an incremental processing paradigm, enabling it to operate seamlessly within ongoing conversations. As illustrated in Figure 2 , the complete pipeline architecture consists of two phases: extraction and update . The extraction phase initiates upon ingestion of a new message pair ( m t − 1 , m t ) (m_{t-1},m_{t}) , where m t m_{t} represents the current message and m t − 1 m_{t-1} the preceding one. This pair typically consists of a user message and an assistant response, capturing a complete interaction unit. To establish appropriate context for memory extraction, the system employs two complementary sources: (1) a conversation summary S S retrieved from the database that encapsulates the semantic content of the entire conversation history, and (2) a sequence of recent messages { m t − m , m t − m + 1 , … , m t − 2 } \{m_{t-m},m_{t-m+1},...,m_{t-2}\} from the conversation history, where m m is a hyperparameter controlling the recency window. To support context-aware memory extraction, we implement an asynchronous summary generation module that periodically refreshes the conversation summary. This component operates independently of the main processing pipeline, ensuring that memory extraction consistently benefits from up-to-date contextual information without introducing processing delays. While S S provides global thematic understanding across the entire conversation, the recent message sequence offers granular temporal context that may contain relevant details not consolidated in the summary. This dual contextual information, combined with the new message pair, forms a comprehensive prompt P = ( S , { m t − m , … , m t − 2 } , m t − 1 , m t ) P=(S,\{m_{t-m},...,m_{t-2}\},m_{t-1},m_{t}) for an extraction function ϕ \phi implemented via an LLM. The function ϕ ⁡ ( P ) \phi(P) then extracts a set of salient memories Ω = { ω 1 , ω 2 , … , ω n } \Omega=\{\omega_{1},\omega_{2},...,\omega_{n}\} specifically from the new exchange while maintaining awareness of the conversation’s broader context, resulting in candidate facts for potential inclusion in the knowledge base. Following extraction, the update phase evaluates each candidate fact against existing memories to maintain consistency and avoid redundancy. This phase determines the appropriate memory management operation for each extracted fact ω i ∈ Ω \omega_{i}\in\Omega . Algorithm 1 , mentioned in Appendix B , illustrates this process. For each fact, the system first retrieves the top s s semantically similar memories using vector embeddings from the database. These retrieved memories, along with the candidate fact, are then presented to the LLM through a function-calling interface we refer to as a ‘tool call.’ The LLM itself determines which of four distinct operations to execute: ADD for creation of new memories when no semantically equivalent memory exists; UPDATE for augmentation of existing memories with complementary information; DELETE for removal of memories contradicted by new information; and NOOP when the candidate fact requires no modification to the knowledge base. Rather than using a separate classifier, we leverage the LLM’s reasoning capabilities to directly select the appropriate operation based on the semantic relationship between the candidate fact and existing memories. Following this determination, the system executes the provided operations, thereby maintaining knowledge base coherence and temporal consistency. In our experimental evaluation, we configured the system with ‘ m m ’ = 10 previous messages for contextual reference and ‘ s s ’ = 10 similar memories for comparative analysis. All language model operations utilized GPT-4o-mini as the inference engine. The vector database employs dense embeddings to facilitate efficient similarity search during the update phase.

<sub>§2.1 Mem0</sub>

### 3. Mem0 g \texttt{Mem0}^{\tiny g}

The Mem0 g \texttt{Mem0}^{\tiny g} pipeline, illustrated in Figure 3 , implements a graph-based memory approach that effectively captures, stores, and retrieves contextual information from natural language interactions ( Zhang et al., 2022 ) . In this framework, memories are represented as a directed labeled graph G = ( V , E , L ) G=(V,E,L) , where: Each entity node v ∈ V v\in V contains three components: (1) an entity type classification that categorizes the entity (e.g., Person, Location, Event), (2) an embedding vector e v e_{v} that captures the entity’s semantic meaning, and (3) metadata including a creation timestamp t v t_{v} . Relationships in our system are structured as triplets in the form ( v s , r , v d ) (v_{s},r,v_{d}) , where v s v_{s} and v d v_{d} are source and destination entity nodes, respectively, and r r is the labeled edge connecting them. The extraction process employs a two-stage pipeline leveraging LLMs to transform unstructured text into structured graph representations. First, an entity extractor module processes the input text to identify a set of entities along with their corresponding types. In our framework, entities represent the key information elements in conversations—including people, locations, objects, concepts, events, and attributes that merit representation in the memory graph. The entity extractor identifies these diverse information units by analyzing the semantic importance, uniqueness, and persistence of elements in the conversation. For instance, in a conversation about travel plans, entities might include destinations (cities, countries), transportation modes, dates, activities, and participant preferences—essentially any discrete information that could be relevant for future reference or reasoning. Next, a relationship generator component derives meaningful connections between these entities, establishing a set of relationship triplets that capture the semantic structure of the information. This LLM-based module analyzes the extracted entities and their context within the conversation to identify semantically significant connections. It works by examining linguistic patterns, contextual cues, and domain knowledge to determine how entities relate to one another. For each potential entity pair, the generator evaluates whether a meaningful relationship exists and, if so, classifies this relationship with an appropriate label (e.g., ‘lives_in’, ‘prefers’, ‘owns’, ‘happened_on’). The module employs prompt engineering techniques that guide the LLM to reason about both explicit statements and implicit information in the dialogue, resulting in relationship triplets that form the edges in our memory graph and enable complex reasoning across interconnected information. When integrating new information, Mem0 g \texttt{Mem0}^{\tiny g} employs a sophisticated storage and update strategy. For each new relationship triple, we compute embeddings for both source and destination entities, then search for existing nodes with semantic similarity above a defined threshold ‘ t t ’. Based on node existence, the system may create both nodes, create only one node, or use existing nodes before establishing the relationship with appropriate metadata. To maintain a consistent knowledge graph, we implement a conflict detection mechanism that identifies potentially conflicting existing relationships when new information arrives. An LLM-based update resolver determines if certain relationships should be obsolete, marking them as invalid rather than physically removing them to enable temporal reasoning. The memory retrieval functionality in Mem0 g \texttt{Mem0}^{\tiny g} implements a dual-approach strategy for optimal information access. The entity-centric method first identifies key entities within a query, then leverages semantic similarity to locate corresponding nodes in the knowledge graph. It systematically explores both incoming and outgoing relationships from these anchor nodes, constructing a comprehensive subgraph that captures relevant contextual information. Complementing this, the semantic triplet approach takes a more holistic view by encoding the entire query as a dense embedding vector. This query representation is then matched against textual encodings of each relationship triplet in the knowledge graph. The system calculates fine-grained similarity scores between the query and all available triplets, returning only those that exceed a configurable relevance threshold, ranked in order of decreasing similarity. This dual retrieval mechanism enables Mem0 g \texttt{Mem0}^{\tiny g} to handle both targeted entity-focused questions and broader conceptual queries with equal effectiveness. From an implementation perspective, the system utilizes Neo4j 1 1 1 https://neo4j.com/ as the underlying graph database. LLM-based extractors and update module leverage GPT-4o-mini with function calling capabilities, allowing for structured extraction of information from unstructured text. By combining graph-based representations with semantic embeddings and LLM-based information extraction, Mem0 g \texttt{Mem0}^{\tiny g} achieves both the structural richness needed for complex reasoning and the semantic flexibility required for natural language understanding.

<sub>§2.2 Mem0 g \texttt{Mem0}^{\tiny g}</sub>

### 4. Dataset

The LOCOMO ( Maharana et al., 2024 ) dataset is designed to evaluate long-term conversational memory in dialogue systems. It comprises 10 extended conversations, each containing approximately 600 dialogues and 26000 tokens on average, distributed across multiple sessions. Each conversation captures two individuals discussing daily experiences or past events. Following these multi-session dialogues, each conversation is accompanied by 200 questions on an average with corresponding ground truth answers. These questions are categorized into multiple types: single-hop, multi-hop, temporal, and open-domain. The dataset originally included an adversarial question category, which was designed to test systems’ ability to recognize unanswerable questions. However, this category was excluded from our evaluation because ground truth answers were unavailable, and the expected behavior for this question type is that the agent should recognize them as unanswerable.

<sub>§3.1 Dataset</sub>

### 5. (1) Performance Metrics

Previous research in conversational AI ( Goswami, 2025 , Soni et al., 2024 , Singh et al., 2020 ) has predominantly relied on lexical similarity metrics such as F1 Score (F 1 ) and BLEU-1 (B 1 ). However, these metrics exhibit significant limitations when evaluating factual accuracy in conversational contexts. Consider a scenario where the ground truth answer is ‘ Alice was born in March ’ and a system generates ‘ Alice is born in July .’ Despite containing a critical factual error regarding the birth month, traditional metrics would assign relatively high scores due to lexical overlap in the remaining tokens (‘ Alice ,’ ‘ born ,’ etc.). This fundamental limitation can lead to misleading evaluations that fail to capture semantic correctness. To address these shortcomings, we use LLM-as-a-Judge (J) as a complementary evaluation metric. This approach leverages a separate, more capable LLM to assess response quality across multiple dimensions, including factual accuracy, relevance, completeness, and contextual appropriateness. The judge model analyzes the question, ground truth answer and the generated answer, providing a more nuanced evaluation that aligns better with human judgment. Due to the stochastic nature of J evaluations, we conducted 10 independent runs for each method on the entire dataset and report the mean scores along with ± \pm 1 standard deviation. More details about the J is present in Appendix A .

<sub>§(1) Performance Metrics</sub>

### 6. (2) Deployment Metrics

Beyond response quality, practical deployment considerations are crucial for real-world applications of long-term memory in AI agents. We systematically track Token Consumption , using ‘ cl100k_base ’ encoding from tiktoken , measuring the number of tokens extracted during retrieval that serve as context for answering queries. For our memory-based models, these tokens represent the memories retrieved from the knowledge base, while for RAG-based models, they correspond to the total number of tokens in the retrieved text chunks. This distinction is important as it directly affects operational costs and system efficiency—whether processing concise memory facts or larger raw text segments. We further monitor Latency , (i) search latency : which captures the total time required to search the memory (in memory-based solutions) or chunk (in RAG-based solutions) and (ii) total latency: time to generate appropriate responses, consisting of both retrieval time (accessing memories or chunks) and answer generation time using the LLM. The relationship between these metrics reveals important trade-offs in system design. For instance, more sophisticated memory architectures might achieve higher factual accuracy but at the cost of increased token consumption and latency. Our multi-dimensional evaluation methodology enables researchers and practitioners to make informed decisions based on their specific requirements, whether prioritizing response quality for critical applications or computational efficiency for real-time deployment scenarios.

<sub>§(2) Deployment Metrics</sub>

### 7. Baselines

To comprehensively evaluate our approach, we compare against six distinct categories of baselines that represent the current state of conversational memory systems. These diverse baselines collectively provide a robust framework for evaluating the effectiveness of different memory architectures across various dimensions, including factual accuracy, computational efficiency, and scalability to extended conversations. Where applicable, unless otherwise specified, we set the temperature to 0 to ensure the runs are as reproducible as possible.

<sub>§3.3 Baselines</sub>

### 8. Open-Source Memory Solutions

Our second category consists of promising open-source memory architectures such as LangMem 2 2 2 https://langchain-ai.github.io/langmem/ (Hot Path) that have demonstrated effectiveness in related conversational tasks but have not yet been evaluated on the LOCOMO dataset. By adapting these systems to our evaluation framework, we broaden the comparative landscape and identify potential alternative approaches that may offer competitive performance. We initialized the LLM with gpt-4o-mini and used text-embedding-small-3 as the embedding model.

<sub>§Open-Source Memory Solutions</sub>

### 9. Retrieval-Augmented Generation (RAG)

As a baseline, we treat the entire conversation history as a document collection and apply a standard RAG pipeline. We first segment each conversation into fixed-length chunks (128, 256, 512, 1024, 2048, 4096, and 8192 tokens), where 8192 is the maximum chunk size supported by our embedding model. All chunks are embedded using OpenAI’s text-embedding-small-3 to ensure consistent vector quality across configurations. At query time, we retrieve the top k k chunks by semantic similarity and concatenate them as context for answer generation. Throughout our experiments we set k k ∈ \in {1,2}: with k k =1 only the single most relevant chunk is used, and with k k =2 the two most relevant chunks (up to 16384 tokens) are concatenated. We avoid k > 2 k>2 since the average conversation length (26000 tokens) would be fully covered, negating the benefits of selective retrieval. By varying chunk size and k k , we systematically evaluate RAG performance on long-term conversational memory tasks.

<sub>§Retrieval-Augmented Generation (RAG)</sub>

### 10. Full-Context Processing

We adopt a straightforward approach by passing the entire conversation history within the context window of the LLM. This method leverages the model’s inherent ability to process sequential information without additional architectural components. While conceptually simple, this approach faces practical limitations as conversation length increases, eventually increasing token cost and latency. Nevertheless, it establishes an important reference point for understanding the value of more sophisticated memory mechanisms compared to direct processing of available context.

<sub>§Full-Context Processing</sub>

### 11. Proprietary Models

We evaluate OpenAI’s memory 3 3 3 https://openai.com/index/memory-and-new-controls-for-chatgpt/ feature available in their ChatGPT interface, specifically using gpt-4o-mini for consistency. We ingest entire LOCOMO conversations with a prompt (see Appendix A ) into single chat sessions, prompting memory generation with timestamps, participant names, and conversation text. These generated memories are then used as complete context for answering questions about each conversation, intentionally granting the OpenAI approach privileged access to all memories rather than only question-relevant ones. This methodology accommodates the lack of external API access for selective memory retrieval in OpenAI’s system for benchmarking.

<sub>§Proprietary Models</sub>

### 12. Memory Providers

We incorporate Zep ( Rasmussen et al., 2025 ) , a memory management platform designed for AI agents. Using their platform version, we conduct systematic evaluations across the LOCOMO dataset, maintaining temporal fidelity by preserving timestamp information alongside conversational content. This temporal anchoring ensures that time-sensitive queries can be addressed through appropriately contextualized memory retrieval, particularly important for evaluating questions that require chronological awareness. This baseline represents an important commercial implementation of memory management specifically engineered for AI agents.

<sub>§Memory Providers</sub>

## 总结与展望
Mem0 把记忆拆成抽取、合并、检索三段，并给出图结构变体。它在工程上的贡献是「跨会话一致性」：多次会话之后，同一事实不能被存成互相矛盾的几条。这正是我们那套平铺 JSON 最缺的检查。

**It connects to**

- `2310.08560` — 同样自主管理记忆，Mem0 更强调抽取与合并的流水线。
- `2410.10813` — LongMemEval 就是测这类系统的跨会话一致性，两者是一对。

## 不足之处
**What a reader should still not conclude**

- 合并规则依赖 LLM 判断，论文没有报告误合并率。
- 它的评测偏问答，不涉及「经验是否被后续任务用到」。

---

# Generative Agents: Interactive Simulacra of Human Behavior

arXiv:2304.03442 · 2023 · [source](https://arxiv.org/html/2304.03442)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
How might we craft an interactive artificial society that reflects believable human behavior? From sandbox games such as The Sims to applications such as cognitive models ( Card et al., 1983 ) and virtual environments ( Laird and VanLent, 2001 ; Bates, 1994 ) , for over four decades, researchers and practitioners have envisioned computational agents that can serve as believable proxies of human behavior. In these visions, computationally-powered agents act consistently with their past experiences and react believably to their environments. Such simulations of human behavior could populate virtual spaces and communities with realistic social phenomena ( Dill and Martin, 2011 ; Park et al., 2022 ) , train people on how to handle rare yet difficult interpersonal situations ( Tambe et al., 1995 ; Jones et al., 1999 ; Hollan et al., 1984 ) , test social science theories ( Binz and Schulz, 2023 ; Horton, 2023 ) , craft model human processors for theory and usability testing ( Card et al., 1983 ; John and Kieras, 1996 ; Hämäläinen et al., 2023 ) , power ubiquitous computing applications ( Fast et al., 2016 ) and social robots ( Bates, 1994 ; Bledsoe, 1986 ) , and underpin non-playable game characters ( Laird and VanLent, 2001 ; Riedl, 2012 ) that can navigate complex human relationships in an open world.

<sub>§1. Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3. Generative Agent Behavior and Interaction"]
  N1["§3.1. Agent Avatar and Communication"]
  N2["§3.1.1. Inter-Agent Communication"]
  N3["§3.1.2. User Controls"]
  N4["§3.2. Environmental Interaction"]
  N5["§3.3. Example “Day in the Life”"]
  N6["§3.4. Emergent Social Behaviors"]
  N7["§3.4.1. Information Diffusion"]
  N8["§3.4.2. Relationship Memory"]
  N9["§3.4.3. Coordination"]
  N10["§4. Generative Agent Architecture"]
  N11["§4.1. Memory and Retrieval"]
  N12["§Challenge:"]
  N13["§Approach:"]
  N14["§4.2. Reflection"]
  N15["§Challenge:"]
  N16["§Approach:"]
  N17["§4.3. Planning and Reacting"]
  N18["§Challenge:"]
  N19["§Approach:"]
  N20["§4.3.1. Reacting and Updating Plans"]
  N21["§4.3.2. Dialogue"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
  N9 --> N10
  N10 --> N11
  N11 --> N12
  N12 --> N13
  N13 --> N14
  N14 --> N15
  N15 --> N16
  N16 --> N17
  N17 --> N18
  N18 --> N19
  N19 --> N20
  N20 --> N21
```

![The memory stream comprises a large number of observations that are relevant and irrelevant to the agent’s current situation. Retrieval identifies a subset of these observations that should be passed to the language model to condition its response to the situation. On the left, a large list of events such as ``refrigerator is idle''. On the right, the question ``What are you looking forward to the most right now?'', followed by retrieval calculations that rank ``ordering decorations for the party'' and ``researching ideas for the party'' highly. Based on these memories, Isabella responds, ``I'm looking forward to the Valentine's Day party that I'm planning at Hobbs Cafe!''](https://arxiv.org/html/2304.03442/2304.03442v2/figures/figure_retrieval2.png)

*The memory stream comprises a large number of observations that are relevant and irrelevant to the agent’s current situation. Retrieval identifies a subset of these observations that should be passed to the language model to condition its response to the situation. On the left, a large list of events such as ``refrigerator is idle''. On the right, the question ``What are you looking forward to the most right now?'', followed by retrieval calculations that rank ``ordering decorations for the party'' and ``researching ideas for the party'' highly. Based on these memories, Isabella responds, ``I'm looking forward to the Valentine's Day party that I'm planning at Hobbs Cafe!''*

<sub>figure: `2304.03442v2/figures/figure_retrieval2.png`</sub>

## 机制
### 1. Generative Agent Behavior and Interaction

To illustrate the affordances of generative agents, we instantiate them as characters in a simple sandbox world reminiscent of The Sims ( Arts, 2009 ) . This sprite-based sandbox game world, Smallville, evokes a small town environment. In this section, we will walk through the affordances and interactions with generative agents in Smallville and describe how the agents behave within it. Then, in Section 4 , we will introduce our generative agent architecture that powers these affordances and interactions. In Section 5 , we will describe the implementation of the sandbox environment and how the agents interact with the underlying engine of the sandbox world.

<sub>§3. Generative Agent Behavior and Interaction</sub>

### 2. Agent Avatar and Communication

A community of 25 unique agents inhabits Smallville. Each agent is represented by a simple sprite avatar. We authored one paragraph of natural language description to depict each agent’s identity, including their occupation and relationship with other agents, as seed memories. For example, John Lin has the following description: John Lin is a pharmacy shopkeeper at the Willow Market and Pharmacy who loves to help people. He is always looking for ways to make the process of getting medication easier for his customers; John Lin is living with his wife, Mei Lin, who is a college professor, and son, Eddy Lin, who is a student studying music theory; John Lin loves his family very much; John Lin has known the old couple next-door, Sam Moore and Jennifer Moore, for a few years; John Lin thinks Sam Moore is a kind and nice man; John Lin knows his neighbor, Yuriko Yamamoto, well; John Lin knows of his neighbors, Tamara Taylor and Carmen Ortiz, but has not met them before; John Lin and Tom Moreno are colleagues at The Willows Market and Pharmacy; John Lin and Tom Moreno are friends and like to discuss local politics together; John Lin knows the Moreno family somewhat well — the husband Tom Moreno and the wife Jane Moreno. Each semicolon-delimited phrase is entered into the agent’s initial memory as memories at the start of the simulation.

<sub>§3.1. Agent Avatar and Communication</sub>

### 3. Inter-Agent Communication

The agents interact with the world by their actions, and with each other through natural language. At each time step of the sandbox engine, the agents output a natural language statement describing their current action, such as “Isabella Rodriguez is writing in her journal”, “Isabella Rodriguez is checking her emails”, “Isabella Rodriguez is talking with her family on the phone”, or “Isabella Rodriguez is getting ready for bed.” This statement is then translated into concrete movements that affect the sandbox world. The action is displayed on the sandbox interface as a set of emojis, providing an abstract representation of the action from an overhead view. To achieve this, the system utilizes a language model to translate the action into a set of emojis, which appear above each avatar’s head in a speech bubble. For example, “Isabella Rodriguez is writing in her journal” is displayed as , while “Isabella Rodriguez is checking her emails” appears as . The complete natural language description of the action can be accessed by clicking on the agent’s avatar. Agents communicate with each other in full natural language. They are aware of other agents in their local area, and the generative agent architecture determines whether they walk by or engage in conversation. Here, a sample in the middle of a conversation between the agents Isabella Rodriguez and Tom Moreno about the upcoming election: 3 3 3 We note that the conversational style of these agents can feel overly formal, likely a result of instruction tuning in the underlying models. We expect that the writing style will be better controllable in future language models. Isabella : I’m still weighing my options, but I’ve been discussing the election with Sam Moore. What are your thoughts on him? Tom : To be honest, I don’t like Sam Moore. I think he’s out of touch with the community and doesn’t have our best interests at heart.

<sub>§3.1.1. Inter-Agent Communication</sub>

### 4. User Controls

The user communicates with the agent through natural language by specifying a persona that the agent should perceive them as. For example, if the user specifies that they are a news “reporter” and asks about the upcoming election by saying, “Who is running for office?”, the John agent replies: John : My friends Yuriko, Tom and I have been talking about the upcoming election and discussing the candidate Sam Moore. We have all agreed to vote for him because we like his platform. To directly command one of the agents, the user takes on the persona of the agent’s “inner voice”—this makes the agent more likely to treat the statement as a directive. For instance, when told “You are going to run against Sam in the upcoming election” by a user as John’s inner voice, John decides to run in the election and shares his candidacy with his wife and son.

<sub>§3.1.2. User Controls</sub>

### 5. Environmental Interaction

Smallville features the common affordances of a small village, including a cafe, bar, park, school, dorm, houses, and stores. It also defines subareas and objects that make those spaces functional, such as a kitchen in a house and a stove in the kitchen (Figure 2 ). All spaces serving as agents’ primary living quarters feature a bed, desk, closet, shelf, as well as a bathroom and a kitchen. 4 4 4 This environment design is not the focus of our work, so we generated this environment manually, not automatically. Future work can continue to expand the richness of the agents’ environments. Agents move around Smallville as one would in a simple video game, entering and leaving buildings, navigating its map, and approaching other agents. Agent movements are directed by the generative agent architecture and the sandbox game engine: when the model dictates that the agent will move to a location, we calculate a walking path to the destination in the Smallville environment, and the agent begins moving. In addition, users can also enter the sandbox world of Smallville as an agent operating within it. The agent that the user embodies can be an agent already present in the world, such as Isabella and John, or it can be an outside visitor with no prior history in Smallville. The inhabitants of Smallville will treat the user-controlled agent no differently than they treat each other. They recognize its presence, initiate interactions, and remember its behavior before forming opinions about it. Users and agents can influence the state of the objects in this world, much like in sandbox games such as The Sims. For example, a bed can be occupied when an agent is sleeping, and a refrigerator can be empty when an agent uses up the ingredients to make breakfast. End users can also reshape an agent’s environment in Smallville by rewriting the status of objects surrounding the agent in natural language. For instance, when Isabella is making breakfast in the morning, the user can change the status of the kitchen stove from “turned on” to “burning” by inputting a command to the system that chooses the object and illustrates its new status, like this: “<Isabella’s apartment: kitchen: stove> is burning.” Isabella will notice this in the next moment and go to turn off the stove and remake her breakfast. Likewise, if the user sets the status of Isabella’s shower to “leaking water” when she enters the bathroom, she will gather tools from her living room and try to fix the leak.

<sub>§3.2. Environmental Interaction</sub>

### 6. Example “Day in the Life”

Starting from the single-paragraph description, generative agents begin planning their days. As time passes in the sandbox world, their behaviors evolve as these agents interact with each other and the world, building memories and relationships, and coordinating joint activities. We demonstrate the behavior of generative agents by tracing the output of our system over the course of one day for the agent John Lin (Figure 3 ). In the Lin family, John is the first to wake up at 7 a.m. He brushes his teeth, takes a shower, gets dressed, eats breakfast, and checks the news at the dining table in the living room. At 8 a.m., Eddy follows suit, rushing out of bed to prepare for his classes. He catches up with John just as he is about to head out: John : Good morning Eddy. Did you sleep well? Eddy : Good morning dad. Yeah, I slept great. John : That’s good. What are you working on today? Eddy : I’m working on a new music composition for my class. It’s due this week, so I’m trying to get it finished. But I’m having so much fun with it! John : That sounds great! Soon after Eddy heads out, Mei wakes up and joins John. Mei asks about her son, and John recalls the conversation they just had: Mei : Did Eddy already leave for school? John : Yes, he just left. He’s working on a music composition for his class. Mei : Oh, that’s wonderful! Tell me about it. John : I think he’s really enjoying it! He said he’s having a lot of fun with it. Mei : That’s great! I’m so proud of him. As they finish their conversation, Mei and John pack up. Mei goes on to teach and work on her research paper, while John opens his pharmacy counter at the Willow Market and Pharmacy by 9 a.m.

<sub>§3.3. Example “Day in the Life”</sub>

### 7. Emergent Social Behaviors

By interacting with each other, generative agents in Smallville exchange information, form new relationships, and coordinate joint activities. Extending prior work ( Park et al., 2022 ) , these social behaviors are emergent rather than pre-programmed.

<sub>§3.4. Emergent Social Behaviors</sub>

### 8. Information Diffusion

As agents notice each other, they may engage in dialogue—as they do so, information can spread from agent to agent. For instance, in a conversation between Sam and Tom at the grocery store, Sam tells Tom about his candidacy in the local election: Sam : Hey Tom, how’s it going? Tom : Good, thanks. What’s up? Sam : Well, I wanted to talk to you about something. I’m actually running for mayor in the upcoming local election. Tom : Really? That’s great news! Why are you running? Sam : I’ve been involved in local politics for years now, and I really feel like I can make a difference in our community. Plus, I want to bring new ideas and perspectives to the table. Later that day, after Sam left, Tom and John, who heard the news from another source, discuss Sam’s chances of winning the election: John : I heard that Sam Moore is running for mayor in the local election. Do you think he has a good chance of winning? Tom : I do think he has a good chance. He’s been working hard in the community and I think he will get a lot of support. What do you think? John : I think it’s great that he’s running. I’m curious to see how the election will turn out. Gradually, Sam’s candidacy becomes the talk of the town, with some supporting him and others remaining undecided.

<sub>§3.4.1. Information Diffusion</sub>

### 9. Relationship Memory

Agents in Smallville form new relationships over time and remember their interactions with other agents. For example, at the start, Sam does not know Latoya Williams. While taking a walk in Johnson Park, Sam runs into Latoya, and they introduce themselves. Latoya mentions that she is working on a photography project: “I’m here to take some photos for a project I’m working on.” In a later interaction, Sam’s interactions with Latoya indicate a memory of that interaction, as he asks “Hi, Latoya. How is your project going?” and she replies “Hi, Sam. It’s going well!”

<sub>§3.4.2. Relationship Memory</sub>

### 10. Coordination

Generative agents coordinate with each other. Isabella Rodriguez, at Hobbs Cafe, is initialized with an intent to plan a Valentine’s Day party from 5 to 7 p.m. on February 14th. From this seed, the agent proceeds to invite friends and customers when she sees them at Hobbs Cafe or elsewhere. Isabella then spends the afternoon of the 13th decorating the cafe for the occasion. Maria, a frequent customer and close friend of Isabella’s, arrives at the cafe. Isabella asks for Maria’s help in decorating for the party, and Maria agrees. Maria’s character description mentions that she has a crush on Klaus. That night, Maria invites Klaus, her secret crush, to join her at the party, and he gladly accepts. On Valentine’s Day, five agents, including Klaus and Maria, show up at Hobbs Cafe at 5 pm, and they enjoy the festivities (Figure 4 ). In this scenario, the end user only set Isabella’s initial intent to throw a party and Maria’s crush on Klaus: the social behaviors of spreading the word, decorating, asking each other out, arriving at the party, and interacting with each other at the party were initiated by the agent architecture.

<sub>§3.4.3. Coordination</sub>

### 11. Generative Agent Architecture

Generative agents aim to provide a framework for behavior in an open world: one that can engage in interactions with other agents and react to changes in the environment. Generative agents take their current environment and past experiences as input and generate behavior as output. Underlying this behavior is a novel agent architecture that combines a large language model with mechanisms for synthesizing and retrieving relevant information to condition the language model’s output. Without these mechanisms, large language models can output behavior, but the resulting agents may not react based on the agent’s past experiences, may not make important inferences, and may not maintain long-term coherence. Challenges with long-term planning and coherence remain ( Bubeck et al., 2023 ) even with today’s most performant models such as GPT-4. Because generative agents produce large streams of events and memories that must be retained, a core challenge of our architecture is to ensure that the most relevant pieces of the agent’s memory are retrieved and synthesized when needed. At the center of our architecture is the memory stream, a database that maintains a comprehensive record of an agent’s experience. From the memory stream, records are retrieved as relevant to plan the agent’s actions and react appropriately to the environment. Records are recursively synthesized into higher- and higher-level reflections that guide behavior. Everything in the architecture is recorded and reasoned over as a natural language description, allowing the architecture to leverage a large language model. Our current implementation utilizes the gpt3.5-turbo version of ChatGPT ( OpenAI, 2022 ) . We expect that the architectural basics of generative agents—memory, planning, and reflection—will likely remain the same as language models improve. Newer language models (e.g., GPT-4) will continue to expand the expressive power and performance of the prompts that underpin generative agents. As of writing, however, GPT-4’s API was invitation-only, so our agents use ChatGPT.

<sub>§4. Generative Agent Architecture</sub>

### 12. Challenge:

Creating generative agents that can simulate human behavior requires reasoning about a set of experiences that is far larger than what should be described in a prompt, as the full memory stream can distract the model and does not even currently fit into the limited context window. Consider the Isabella agent answering the question, “What are you passionate about these days?” Summarizing all of Isabella’s experiences to fit in the limited context window of the language model produces an uninformative response, where Isabella discusses topics such as collaborations for events and projects and cleanliness and organization in a cafe. Instead of summarizing, the memory stream described below surfaces relevant memories, resulting in a more informative and specific response that mentions Isabella’s passion for making people feel welcome and included, planning events and creating an atmosphere that people can enjoy, such as the Valentine’s Day party.

<sub>§Challenge:</sub>

### 13. Approach:

The memory stream maintains a comprehensive record of the agent’s experience. It is a list of memory objects, where each object contains a natural language description, a creation timestamp, and a most recent access timestamp. The most basic element of the memory stream is an observation , which is an event directly perceived by an agent. Common observations include behaviors performed by the agent themselves or behaviors that agents perceive being performed by other agents or non-agent objects. For instance, Isabella Rodriguez, who works at a coffee shop, might accrue the following observations over time: (1) Isabella Rodriguez is setting out the pastries , (2) Maria Lopez is studying for a Chemistry test while drinking coffee , (3) Isabella Rodriguez and Maria Lopez are conversing about planning a Valentine’s day party at Hobbs Cafe , (4) The refrigerator is empty . Our architecture implements a retrieval function that takes the agent’s current situation as input and returns a subset of the memory stream to pass on to the language model. There are many possible implementations of a retrieval function, depending on what is important for the agent to consider when deciding how to act. In our context, we focus on three main components that, together, produce effective results. Recency assigns a higher score to memory objects that were recently accessed, so that events from a moment ago or this morning are likely to remain in the agent’s attentional sphere. In our implementation, we treat recency as an exponential decay function over the number of sandbox game hours since the memory was last retrieved. Our decay factor is 0.995 0.995 . Importance distinguishes mundane from core memories by assigning a higher score to memory objects that the agent believes to be important. For instance, a mundane event, such as eating breakfast in one’s room, would yield a low importance score, whereas a breakup with one’s significant other would yield a high score. There are many possible implementations of an importance score; we find that directly asking the language model to output an integer score is effective. The full prompt appears below: On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth, making bed) and 10 is extremely poignant (e.g., a break up, college acceptance), rate the likely poignancy of the following piece of memory. Memory: buying groceries at The Willows Market and Pharmacy Rating: <fill in> This prompt returns an integer value of 2 for “cleaning up the room” and 8 for “asking your crush out on a date.” The importance score is generated at the time the memory object is created. Relevance assigns a higher score to memory objects that are related to the current situation. What is relevant depends on the answer to, “Relevant to what?”, so we condition relevance on a query memory. If the query, for example, is that a student is discussing what to study for a chemistry test with a classmate, memory objects about their breakfast should have low relevance, whereas memory objects about the teacher and schoolwork should have high relevance. In our implementation, we use the language model to generate an embedding vector of the text description of each memory. Then, we calculate relevance as the cosine similarity between the memory’s embedding vector and the query memory’s embedding vector. To calculate the final retrieval score, we normalize the recency, relevance, and importance scores to the range of [ 0 , 1 ] [0,1] using min-max scaling. The retrieval function scores all memories as a weighted combination of the three elements: s ​ c ​ o ​ r ​ e = α r ​ e ​ c ​ e ​ n ​ c ​ y ⋅ r ​ e ​ c ​ e ​ n ​ c ​ y + α i ​ m ​ p ​ o ​ r ​ t ​ a ​ n ​ c ​ e ⋅ i ​ m ​ p ​ o ​ r ​ t ​ a ​ n ​ c ​ e + α r ​ e ​ l ​ e ​ v ​ a ​ n ​ c ​ e ⋅ r ​ e ​ l ​ e ​ v ​ a ​ n ​ c ​ e score=\alpha_{recency}\cdot recency+\alpha_{importance}\cdot importance+\alpha_{relevance}\cdot relevance . In our implementation, all α \alpha s are set to 1. The top-ranked memories that fit within the language model’s context window are included in the prompt.

<sub>§Approach:</sub>

### 14. Challenge:

Generative agents, when equipped with only raw observational memory, struggle to generalize or make inferences. Consider a scenario in which Klaus Mueller is asked by the user: “If you had to choose one person of those you know to spend an hour with, who would it be?" With access to only observational memory, the agent simply chooses the person with whom Klaus has had the most frequent interactions: Wolfgang, his college dorm neighbor. Unfortunately, Wolfgang and Klaus only ever see each other in passing, and do not have deep interactions. A more desirable response requires that the agent generalize from memories of Klaus spending hours on a research project to generate a higher-level reflection that Klaus is passionate about research, and likewise recognize Maria putting in effort into her own research (albeit in a different field), enabling a reflection that they share a common interest. With the approach below, when Klaus is asked who to spend time with, Klaus chooses Maria instead of Wolfgang.

<sub>§Challenge:</sub>

### 15. Approach:

We introduce a second type of memory, which we call a reflection . Reflections are higher-level, more abstract thoughts generated by the agent. Because they are a type of memory, they are included alongside other observations when retrieval occurs. Reflections are generated periodically; in our implementation, we generate reflections when the sum of the importance scores for the latest events perceived by the agents exceeds a threshold (150 in our implementation). In practice, our agents reflected roughly two or three times a day. The first step in reflection is for the agent to determine what to reflect on, by identifying questions that can be asked given the agent’s recent experiences. We query the large language model with the 100 most recent records in the agent’s memory stream (e.g., “Klaus Mueller is reading a book on gentrification”, “Klaus Mueller is conversing with a librarian about his research project”, “desk at the library is currently unoccupied”) and prompt the language model, “Given only the information above, what are 3 most salient high-level questions we can answer about the subjects in the statements?” The model’s response generates candidate questions: for example, What topic is Klaus Mueller passionate about? and What is the relationship between Klaus Mueller and Maria Lopez? We use these generated questions as queries for retrieval, and gather relevant memories (including other reflections) for each question. Then we prompt the language model to extract insights and cite the particular records that served as evidence for the insights. The full prompt is as follows: Statements about Klaus Mueller 1. Klaus Mueller is writing a research paper 2. Klaus Mueller enjoys reading a book on gentrification 3. Klaus Mueller is conversing with Ayesha Khan about exercising [...] What 5 high-level insights can you infer from the above statements? (example format: insight (because of 1, 5, 3)) This process generates statements such as Klaus Mueller is dedicated to his research on gentrification (because of 1, 2, 8, 15) . We parse and store the statement as a reflection in the memory stream, including pointers to the memory objects that were cited. Reflection explicitly allows the agents to reflect not only on their observations but also on other reflections: for example, the second statement about Klaus Mueller above is a reflection that Klaus previously had, not an observation from his environment. As a result, agents generate trees of reflections: the leaf nodes of the tree represent the base observations, and the non-leaf nodes represent thoughts that become more abstract and higher-level the higher up the tree they are.

<sub>§Approach:</sub>

### 16. Challenge:

While a large language model can generate plausible behavior in response to situational information (e.g., ( Park et al., 2022 ; Horton, 2023 ) ), agents need to plan over a longer time horizon to ensure that their sequence of actions is coherent and believable. If we prompt a language model with Klaus’s background, describe the time, and ask what action he ought to take at the given moment, Klaus would eat lunch at 12 pm, but then again at 12:30 pm and 1 pm, despite having already eaten his lunch twice. Optimizing for believability in the moment sacrifices believability over time. To overcome this issue, planning is essential. With the approach described below, Klaus’s afternoon plan is less gluttonous: he has lunch at Hobbs Cafe while reading at 12pm, works on his research paper at the school library at 1pm, and takes a break for a walk in the park at 3pm.

<sub>§Challenge:</sub>

### 17. Approach:

Plans describe a future sequence of actions for the agent, and help keep the agent’s behavior consistent over time. A plan includes a location, a starting time, and a duration. For instance, Klaus Mueller, who is dedicated in his research and has an impending deadline, 5 5 5 And, in this way, bears at least a passing resemblance to the authors of this paper. may choose to spend his day working at his desk drafting his research paper. An entry in a plan might state, for example: for 180 minutes from 9am, February 12th, 2023, at Oak Hill College Dorm: Klaus Mueller’s room: desk, read and take notes for research paper . Like reflections, plans are stored in the memory stream and are included in the retrieval process. This allows the agent to consider observations, reflections, and plans all together when deciding how to behave. Agents may change their plans midstream if needed. It would be unrealistic and uninteresting for an artist agent to plan on painting while sitting at a pharmacy counter for four hours without moving. A more desirable plan would involve the agent taking the necessary time to gather materials, mix paint, take breaks, and clean up during the four-hour period in their home studio. To create such plans, our approach starts top-down and then recursively generates more detail. The first step is to create a plan that outlines the day’s agenda in broad strokes. To create the initial plan, we prompt the language model with the agent’s summary description (e.g., name, traits, and a summary of their recent experiences) and a summary of their previous day. A full example prompt is below, which is unfinished at the bottom for the language model to complete: Name: Eddy Lin (age: 19) Innate traits: friendly, outgoing, hospitable Eddy Lin is a student at Oak Hill College studying music theory and composition. He loves to explore different musical styles and is always looking for ways to expand his knowledge. Eddy Lin is working on a composition project for his college class. He is taking classes to learn more about music theory. Eddy Lin is excited about the new composition he is working on but he wants to dedicate more hours in the day to work on it in the coming days On Tuesday February 12, Eddy 1) woke up and completed the morning routine at 7:00 am, […] 6) got ready to sleep around 10 pm. Today is Wednesday February 13. Here is Eddy’s plan today in broad strokes: 1) This generates a rough sketch of the agent’s plan for a day, divided into five to eight chunks: “ 1) wake up and complete the morning routine at 8:00 am, 2) go to Oak Hill College to take classes starting 10:00 am, […] 5) work on his new music composition from 1:00 pm to 5:00 pm, 6) have dinner at 5:30 pm, 7) finish school assignments and go to bed by 11:00 pm. ” The agent saves this plan in the memory stream and then recursively decomposes it to create finer-grained actions, first into hour-long chunks of actions—Eddy’s plan to work on his new music composition from 1:00 pm to 5:00 pm becomes 1:00 pm: start by brainstorming some ideas for his music composition […] 4:00 pm: take a quick break and recharge his creative energy before reviewing and polishing his composition . We then recursively decompose this again into 5–15 minute chunks: e.g., 4:00 pm: grab a light snack, such as a piece of fruit, a granola bar, or some nuts. 4:05 pm: take a short walk around his workspace […] 4:50 pm: take a few minutes to clean up his workspace . This process can be adjusted to match the desired granularity.

<sub>§Approach:</sub>

### 18. Reacting and Updating Plans

Generative agents operate in an action loop where, at each time step, they perceive the world around them and those perceived observations are stored in their memory stream. We prompt the language model with these observations to decide whether the agent should continue with their existing plan, or react. Standing at an easel and painting, for example, might trigger an observation of the easel, but this is unlikely to prompt a reaction. However, if Eddy’s father John records that he sees Eddy taking a short walk in the house garden, the outcome is different. The prompt is below, with [Agent’s Summary Description] standing in for a dynamically-generated, paragraph-long summary of the agent’s overall goals and disposition, which is described in Appendix A : [Agent’s Summary Description] It is February 13, 2023, 4:56 pm. John Lin’s status: John is back home early from work. Observation: John saw Eddy taking a short walk around his workplace. Summary of relevant context from John’s memory: Eddy Lin is John’s Lin’s son. Eddy Lin has been working on a music composition for his class. Eddy Lin likes to walk around the garden when he is thinking about or listening to music. Should John react to the observation, and if so, what would be an appropriate reaction? The context summary is generated through two prompts that retrieve memories via the queries “What is [observer]’s relationship with the [observed entity]?” and “[Observed entity] is [action status of the observed entity]”, and their answers summarized together. The output suggests that John could consider asking Eddy about his music composition project . We then regenerate the agent’s existing plan starting from the time when the reaction takes place. Finally, if the action indicates an interaction between agents, we generate their dialogue.

<sub>§4.3.1. Reacting and Updating Plans</sub>

### 19. Dialogue

Agents converse as they interact with each other. We generate agents’ dialogue by conditioning their utterances on their memories about each other. For example, when John initiates his conversation with Eddy, we generate John’s first utterance by using his summarized memory about Eddy and the intended reaction when he decided to ask Eddy about his composition project: [Agent’s Summary Description] It is February 13, 2023, 4:56 pm. John Lin’s status: John is back home early from work. Observation: John saw Eddy taking a short walk around his workplace. Summary of relevant context from John’s memory: Eddy Lin is John’s Lin’s son. Eddy Lin has been working on a music composition for his class. Eddy Lin likes to walk around the garden when he is thinking about or listening to music. John is asking Eddy about his music composition project. What would he say to Eddy? The result: “Hey Eddy, how’s the music composition project for your class coming along?” From Eddy’s perspective, John initiating the dialogue is seen as an event to which he may want to react. So, just as John did, Eddy retrieves and summarizes his memory about his relationship with John, as well as his memory that may be related to John’s last utterance in the dialogue. If he decides to respond, we generate Eddy’s utterance using his summarized memory and the current dialogue history: [Agent’s Summary Description] It is February 13, 2023, 4:56 pm. Eddy Lin’s status: Eddy is taking a short walk around his workplace. Observation: John is initiating a conversation with Eddy. Summary of relevant context from Eddy’s memory: John Lin is Eddy Lin’s father. John Lin is caring and is interested to learn more about Eddy Lin’s school work. John Lin knows that Eddy Lin is working on a music composition. Here is the dialogue history: John: Hey Eddy, how’s the music composition project for your class coming along? How would Eddy respond to John? This generates Eddy’s response: “Hey Dad, it’s going well. I’ve been taking walks around the garden to clear my head and get some inspiration.” The continuation of this dialogue is generated using the same mechanism until one of the two agents decides to end the dialogue.

<sub>§4.3.2. Dialogue</sub>

## 总结与展望
生成式代理用「新近度 + 重要性 + 相关性」三元加权从记忆流里检索，并让检索结果反过来影响行为。这套加权是本方向的经典启发式：它承认「什么值得想起来」是三个不同问题，而多数系统只用相似度回答其中一个。

**It connects to**

- `2502.12110` — 一个用链接结构，一个用加权打分，都是在相似度之外加维度。
- `2305.10250` — MemoryBank 用遗忘曲线处理「新近度」，是同一维度的另一种建模。

## 不足之处
**The authors say:** In terms of evaluation, the assessment of generative agents’ behavior in this study was limited to a relatively short timescale and a baseline human crowdworker condition. While the crowdworker condition provided a helpful comparison point, it did not represent the maximal human performance that could serve as the gold standard in terms of believability. Future research should aim to observe the behavior of generative agents over an extended period to gain a more comprehensive understanding of their capabilities and establish rigorous benchmarks for more effective performance testing. Additionally, varying and contrasting the underlying models, as well as the hyperparameters used for the agents during future simulations, could provide valuable insights into the impact of these factors on the agents’ behavior. Lastly, the robustness of generative agents is still largely unknown. They may be vulnerable to prompt hacking, memory hacking—where a carefully crafted conversation could convince an agent of the existence of a past event that never occurred—and hallucination, among other issues. Future research can comprehensively test these robustness concerns, and as large language models become more resilient to such attacks, generative agents can adopt similar mitigations.

**What a reader should still not conclude**

- 三个权重是手工设定的，论文没有做敏感性分析。
- 评测是模拟社会行为，不是任务成功率。

<sub>§8.2. Future Work and Limitations</sub>

---

# Reflexion: Language Agents with Verbal Reinforcement Learning

arXiv:2303.11366 · 2023 · [source](https://arxiv.org/html/2303.11366)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Recent works such as ReAct [ 30 ] , SayCan [ 1 ] , Toolformer [ 22 ] , HuggingGPT [ 23 ] , generative agents [ 19 ] , and WebGPT [ 17 ] have demonstrated the feasibility of autonomous decision-making agents that are built on top of a large language model (LLM) core. These methods use LLMs to generate text and ‘actions‘ that can be used in API calls and executed in an environment. Since they rely on massive models with an enormous number of parameters, such approaches have been so far limited to using in-context examples as a way of teaching the agents, since more traditional optimization schemes like reinforcement learning with gradient descent require substantial amounts of compute and time.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Experiments"]
  N1["§4.1 Sequential decision making: ALFWorld"]
  N2["§4.2 Reasoning: HotpotQA"]
  N3["§4.3 Programming"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Reflexion works on decision-making 4.1 , programming 4.3 , and reasoning 4.2 tasks.](https://arxiv.org/html/2303.11366/2303.11366v4/reflexion_tasks.svg)

*Reflexion works on decision-making 4.1 , programming 4.3 , and reasoning 4.2 tasks.*

<sub>figure: `2303.11366v4/reflexion_tasks.svg`</sub>

## 机制
### 1. Experiments

We evaluate various natural language RL setups on decision-making, reasoning, and code generation tasks. Specifically, we challenge an agent to perform search-based question answering on HotPotQA [ 28 ] , multi-step tasks in common household environments in AlfWorld [ 24 ] , and code writing tasks in competition-like environments with interpreters and compilers in HumanEval [ 6 ] , MBPP [ 2 ] , and LeetcodeHard, a new benchmark. Most notably, Reflexion improves performance over strong baselines by 22% in AlfWorld, 20% in HotPotQA, and 11% on HumanEval.

<sub>§4 Experiments</sub>

### 2. Sequential decision making: ALFWorld

AlfWorld is a suite of text-based environments that challenge an agent to solve multi-step tasks in a variety of interactive environments based on TextWorld [ 8 ] . Following Yao et al., [30] , we run the agent in 134 AlfWorld environments across six different tasks, including finding hidden objects (e.g., finding a spatula in a drawer), moving objects (e.g., moving a knife to the cutting board), and manipulating objects with other objects (e.g., chilling a tomato in the fridge). We use ReAct [ 30 ] as the action generator as Yao et al., [30] has shown success in long trajectory decision-making using explicit intermediate thoughts. AlfWorld tasks naturally require a self-evaluation step as the environment can only signal if a task is complete. To achieve fully autonomous behavior, we implement two self-evaluation techniques: natural language classification using an LLM and a hand-written heuristic. The heuristic is simple: if the agent executes the same action and receives the same response for more than 3 cycles, or if the number of actions taken in the current environment exceeds 30 (inefficient planning), we self-reflect. In the baseline runs, if self-reflection is suggested, we skip the self-reflection process, reset the environment, and start a new trial. In the Reflexion runs, the agent uses self-reflection to find its mistake, update its memory, reset the environment, and start a new trial. To avoid very long prompt windows that may exceed the maximum limit, we truncate the agent’s memory to the last 3 self-reflections (experiences). To avoid syntactic errors, we provide two domain-specific few-shot trajectories to the agent. We use the same few-shot trajectory examples as Yao et al., [30] with GPT-3 for the LLM. AlfWorld tasks, ReAct few-shot prompts, and Reflexion examples are included in the appendix.

<sub>§4.1 Sequential decision making: ALFWorld</sub>

### 3. Reasoning: HotpotQA

HotPotQA [ 28 ] is a Wikipedia-based dataset with 113k question-and-answer pairs that challenge agents to parse content and reason over several supporting documents. To test improvement in reasoning only ability, we implement Reflexion + Chain-of-Thought (CoT) [ 26 ] for step-by-step Q → A Q\rightarrow A and Q Q , C g ​ t → A C_{gt}\rightarrow A implementations, where Q Q is the question, C g ​ t C_{gt} is the ground truth context from the dataset, and A A is the final answer. Since CoT is not a multi-step decision-making technique, we give C g ​ t C_{gt} to the agent so that we can isolate the reasoning behavior over large sections of the provided text. To test holistic question and answering ability, which requires reasoning and action choice, we implement a Reflexion + ReAct [ 30 ] agent that can retrieve relevant context using a Wikipedia API and infer answers using step-by-step explicit thinking. For CoT implementations, we use 6-shot prompting; for ReAct, we use 2-shot prompting, and for self-reflection, we use 2-shot prompting. All examples can be found in the appendix. Robustly evaluating natural language answers is a long-standing problem in NLP. Therefore, between trials, we use exact match answer grading using the environment to give a binary success signal to the agent. After each trial, the self-reflection loop is employed to amplify the binary signal, similar to the decision-making setup 4.1 in AlfWorld with a memory size of 3 experiences.

<sub>§4.2 Reasoning: HotpotQA</sub>

### 4. Programming

We evaluate the baseline and Reflexion approaches on Python and Rust code writing on MBPP [ 2 ] , HumanEval [ 6 ] , and LeetcodeHardGym, our new dataset. MBPP and HumanEval measure function body generation accuracy given natural language descriptions. We use a benchmark language compiler, MultiPL-E [ 4 ] , to translate subsets of HumanEval and MBPP to the Rust language. MultiPL-E is a collection of small compilers that can be used to translate Python benchmark questions to 18 other languages. We include experiments for Rust code generation to demonstrate that Reflexion implementations for code generation are language-agnostic and can be used for interpreted and compiled languages. Lastly, we introduce a new benchmark, LeetcodeHardGym, which is an interactive programming gym that contains 40 Leetcode hard-rated questions that have been released after October 8, 2022, which is the pre-training cutoff date of GPT-4 [ 18 ] . The task of programming presents a unique opportunity to use more grounded self-evaluation practices such as self-generated unit test suites. Thus, our Reflexion-based programming task implementation is eligible for pass@1 accuracy reporting. To generate a test suite, we use Chain-of-Thought prompting [ 26 ] to produce diverse, extensive tests with corresponding natural language descriptions. Then, we filter for syntactically valid test statements by attempting to construct a valid abstract syntax tree (AST) for each proposed test. Finally, we sample n n tests from the collection of generated unit tests to produce a test suite T T , denoted as { t 0 , t 1 , … , t n } \{t_{0},t_{1},\dots,t_{n}\} . We set n n to a maximum of 6 unit tests. Aside from the unit test suite component, the setup for the learning loop for a Reflexion programming agent is identical to the reasoning and decision-making agents with a max memory limit of 1 experience.

<sub>§4.3 Programming</sub>

## 总结与展望
Reflexion 让代理在失败后写一段自我反思存进记忆，下一轮带着它重试。论文最有价值的是三档消融：只用思维链、加情节记忆、再加自我反思——它把「反思到底贡献了什么」拆开量了，而多数后续工作只报总收益。

**It connects to**

- `2210.03629` — 反思属于「思考」，它的证据强度弱于观察，这一点在消融里能看出来。
- `2409.07429` — AWME 把反思换成可复用的工作流，减少了自述成分。

## 不足之处
**The authors say:** At its core, Reflexion is an optimization technique that uses natural language to do policy optimization. Policy optimization is a powerful approach to improve action choice through experience, but it may still succumb to non-optimal local minima solutions. In this study, we limit long-term memory to a sliding window with maximum capacity, but we encourage future work to extend the memory component of Reflexion with more advanced structures such as vector embedding databases or traditional SQL databases. Specific to code generation, there are many practical limitations to test-driven development in specifying accurate input-output mappings such as non-deterministic generator functions, impure functions that interact with APIs, functions that vary output according to hardware specifications, or functions that invoke parallel or concurrent behavior that may be difficult to predict.

**What a reader should still not conclude**

- 反思由同一个模型写，存在自评偏差；论文没有独立校验反思是否忠实。
- 任务成功判定是二值的，所以「反思有效」只能靠多次重试的通过率体现。

<sub>§5 Limitations</sub>

---

# MemoryBank: Enhancing Large Language Models with Long-Term Memory

arXiv:2305.10250 · 2024 · [source](https://arxiv.org/html/2305.10250)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The advent of Large Language Models (LLMs) such as ChatGPT ( OpenAI, 2022 ) and GPT-4 ( OpenAI, 2023 ) has led to increasing influence across various sectors, from education and healthcare to customer service and entertainment. These powerful AI systems have demonstrated a remarkable ability to understand and generate human-like responses. Despite the remarkable capabilities of LLMs, a key limitation is their lack of long-term memory, an essential aspect of human-like communication, particularly noticeable in scenarios requiring sustained interactions like personal companionship, psychological counseling, and secretarial tasks. Long-term memory in AI is vital to maintain contextual understanding, ensure meaningful interactions and understand user behaviors over time. For instance, personal AI companions need to recall past conversations for rapport building. In psychological counseling, an AI can provide more effective support with knowledge of the user’s history and past emotional states. Similarly, secretarial AI requires memory for task management and preference recognition. The absence of long-term memory in LLMs hinders their performance and user experience. Therefore, it is essential to develop AI systems with improved memory capabilities for a more seamless and personalized interaction.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 MemoryBank: A Novel Memory Mechanism Tailored for LLMs"]
  N1["§2.1 Memory Storage: The Warehouse of MemoryBank"]
  N2["§In-Depth Memory Storage:"]
  N3["§Hierarchical Event Summary:"]
  N4["§Dynamic Personality Understanding:"]
  N5["§2.2 Memory Retrieval"]
  N6["§2.3 Memory Updating Mechanism"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

![Overview of MemoryBank. The memory storage (§ 2.1 ) stores past conversations, summarized events and user portraits, while the memory updating mechanism (§ 2.3 ) updates the memory storage. Memory retrieval (§ 2.2 ) recall relevant memory. SiliconFriend (§ 3 ) serves as an LLM-based AI companion augmented with MemoryBank.](https://arxiv.org/html/2305.10250/2305.10250v3/framework-2.png)

*Overview of MemoryBank. The memory storage (§ 2.1 ) stores past conversations, summarized events and user portraits, while the memory updating mechanism (§ 2.3 ) updates the memory storage. Memory retrieval (§ 2.2 ) recall relevant memory. SiliconFriend (§ 3 ) serves as an LLM-based AI companion augmented with MemoryBank.*

<sub>figure: `2305.10250v3/framework-2.png`</sub>

## 机制
### 1. MemoryBank: A Novel Memory Mechanism Tailored for LLMs

In this section, we provide a detailed description of MemoryBank, our novel memory mechanism designed for LLMs. As shown in Fig. 1 , MemoryBank is a unified mechanism structured around three central pillars: (1) a memory storage (§ 2.1 ) serving as the primary data repository, (2) a memory retriever (§ 2.2 ) for context-specific memory recollection, and (3) a memory updater (§ 2.3 ) drawing inspiration from the Ebbinghaus Forgetting Curve theory, a time-tested psychological principle pertaining to memory retention and forgetting. Rate of Forgetting. Ebbinghaus found that memory retention decreases over time. He quantified this in his forgetting curve, showing that information is lost rapidly after learning unless it is consciously reviewed. Time and Memory Decay. The curve is steep at the beginning, indicating that a significant amount of learned information is forgotten within the first few hours or days after learning. After this initial period, the rate of memory loss slows down. Spacing Effect. Ebbinghaus discovered that relearning information is easier than learning it for the first time. Regularly revisiting and repeating the learned material can reset the forgetting curve, making it less steep and thereby improving memory retention.

<sub>§2 MemoryBank: A Novel Memory Mechanism Tailored for LLMs</sub>

### 2. Memory Storage: The Warehouse of MemoryBank

Memory storage, the warehouse of MemoryBank, is a robust data repository holding a meticulous array of information. As shown in Fig. 1 , it stores daily conversations records, summaries of past events, and evolving assessments of user personalities, thereby constructing a dynamic and multi-layered memory landscape.

<sub>§2.1 Memory Storage: The Warehouse of MemoryBank</sub>

### 3. In-Depth Memory Storage:

MemoryBank’s storage system captures the richness of AI-user interactions by recording multi-turn conversations in a detailed, chronological fashion. Each piece of dialogue is stored with timestamps, creating an ordered narrative of past interactions. This detailed record not only aids in precise memory retrieval but also facilitates the memory updating process afterwards, offering a detailed index of conversational history.

<sub>§In-Depth Memory Storage:</sub>

### 4. Hierarchical Event Summary:

Reflecting the intricacies of human memory, MemoryBank goes beyond mere detailed storage. It processes and distills conversations into a high-level summary of daily events, much like how humans remember key aspects of their experiences. We condense verbose dialogues into a concise daily event summary, which is further synthesized into a global summary. This process results in a hierarchical memory structure, providing a bird’s eye view of past interactions and significant events. Specifically, taken previous daily conversations or daily events as input, we ask the LLMs to summarize daily events or global events with the prompt “ Summarize the events and key information in the content [dialog/events] ”.

<sub>§Hierarchical Event Summary:</sub>

### 5. Dynamic Personality Understanding:

MemoryBank focuses on user personality understanding. It continuously assesses and updates these understandings with the long-term interactions and creates daily personality insights. These insights are further aggregated to form a global understanding of the user’s personality. This multi-tiered approach results in an AI companion that learns, adapts, and tailors its responses to the unique traits of each user, enhancing user experience. Specially, taken the daily conversations or personality analysis, we ask the LLM to deduce with prompts: “ Based on the following dialogue, please summarize the user’s personality traits and emotions. [dialog] ” or “ The following are the user’s exhibited personality traits and emotions throughout multiple days. Please provide a highly concise and general summary of the user’s personality [daily Personalities] ”.

<sub>§Dynamic Personality Understanding:</sub>

### 6. Memory Retrieval

Built on the robust infrastructure of memory storage, our memory retrieval mechanism operates akin to a knowledge retrieval task. In this context, we adopt a dual-tower dense retrieval model similar to Dense Passage Retrieval ( Karpukhin et al., 2020 ) . In this paradigm, every turn of conversations and event summaries is considered as a memory piece m m , which is pre-encoded into a contextual representation h m h_{m} using the encoder model E ⁡ ( ⋅ ) E(\cdot) . Consequently, the entire memory storage M M is pre-encoded into 𝑴 = { 𝒉 m 0 , 𝒉 m 1 , … ​ 𝒉 m | M | } \bm{M}=\{\bm{h}^{0}_{m},\bm{h}^{1}_{m},...\bm{h}^{|M|}_{m}\} , where each h m h_{m} is a vector representation of a memory piece. These vector representations are then indexed using FAISS ( Johnson et al., 2019 ) for efficient retrieval. Parallel to this, the current context of conversation c c is encoded by E ⁡ ( ⋅ ) E(\cdot) into 𝒉 c \bm{h}_{c} , which serves as the query to search M M for the most relevant memory. In practice, the encoder E ⁡ ( ⋅ ) E(\cdot) can be interchanged to any suitable model.

<sub>§2.2 Memory Retrieval</sub>

### 7. Memory Updating Mechanism

With the persistent memory storage and the memory retrieval mechanism discussed in § 2.1 and § 2.2 , the memorization capability of LLMs can be greatly enhanced. However, for scenarios that expect more anthropopathic memory behavior, memory updating is needed. These scenarios include AI companion, virtual IP, etc. Forgetting less important memory pieces that are long time ago and have not been recalled much can make the AI companion more natural. Our memory forgetting mechanism is inspired from Ebbinghaus Forgetting Curve theory ( ) and follow the following principle rules 2 2 2 While Ebbinghaus Forgetting Curve theory includes additional features such as overlearning ( ) and meaningful material effect ( ) , our paper focuses on simulating the listed three principle rules. : The Ebbinghaus forgetting curve is expressed using an exponential decay model: R = e − t S R=e^{-\frac{t}{S}} , where R R is the memory retention, or what fraction of the information can be retained. t t is the time elapsed since learning the information. e e is approximately equal to 2.71828. S S is the memory strength, which changes based on factors such as the depth of learning and the amount of repetition. To simply memory updating process, we model S S as a discrete value and initialize it with 1 1 upon its first mention in a conversation. When a memory item is recalled during conversations, it will persist longer in memory. We increase S S by 1 and reset t t to 0, hence forget it with a lower probability. It is important to note that this is an exploratory and highly simplified memory updating model. Real-life memory processes are more complex and can be influenced by a variety of factors. The forgetting curve will look different for different people and different types of information. In summary, MemoryBank weaves together these critical components to form a more comprehensive memory management system for LLMs. It enhances their ability to provide meaningful and personalized interactions over extended periods, opening up new possibilities for AI applications.

<sub>§2.3 Memory Updating Mechanism</sub>

## 总结与展望
MemoryBank 用艾宾浩斯遗忘曲线给记忆强度建模，让久未使用的记忆自然衰减。这是本方向少见的「主动忘记」机制：它承认记忆不是越多越好，而我们那套知识库里没有遗忘，只有隔离。

**It connects to**

- `2304.03442` — 生成式代理用新近度加权，MemoryBank 用遗忘曲线，两者都在建模时间。

## 不足之处
**What a reader should still not conclude**

- 遗忘参数是手工设定的，且论文没有报告「忘掉的东西后来是否被需要」。
- 评测规模小（对话陪伴场景），不能直接推断到任务型代理。

---

# Agent Workflow Memory

arXiv:2409.07429 · 2025 · [source](https://arxiv.org/html/2409.07429)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Language model (LM) based agents are rapidly improving, and are now able to tackle digital tasks such as navigating the web ( Zhou et al., 2024 ; Deng et al., 2023 ) or operating mobile apps ( Rawles et al., 2023 ; Rawles et al., 2024 ) . Current agents mostly integrate a fixed set of given examples via training ( Fu et al., 2024 ; Murty et al., 2024 ) or in-context learning ( Zheng et al., 2024 ) . This allows them to perform well on action sequences similar to those presented in these examples, but results in a lack of robustness to changes in task contexts or environments ( Deng et al., 2023 ) . Essentially, they fail to grasp the key to disentangling increasingly complex tasks — to extract and learn reusable task workflows shared across similar tasks and environments ( Yu et al., 2023 ; Wang et al., 2024a ) . Moreover, as agents solve each task separately, they do not learn from past successes and failures, and are therefore unable to adapt over time ( Yoran et al., 2024 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Experiments"]
  N1["§3.1 WebArena"]
  N2["§3.1.2 Efficient learning from small amounts of data"]
  N3["§3.1.3 Cross-template workflow generalization"]
  N4["§3.2 Mind2Web"]
  N5["§3.2.2 Online AWM Enables Generalization"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![AWM enables agents to continuously induce and apply workflows to improve performance, compared to stagnant baselines. We show results by AWM on the WebArena map split as an example.](https://arxiv.org/html/2409.07429/2409.07429v1/teaser.png)

*AWM enables agents to continuously induce and apply workflows to improve performance, compared to stagnant baselines. We show results by AWM on the WebArena map split as an example.*

<sub>figure: `2409.07429v1/teaser.png`</sub>

## 机制
### 1. Experiments

In this section, we experiment on two major web navigation benchmarks – WebArena (§ 3.1 ) and Mind2Web (§ 3.2 ). For each benchmark, we first introduce the benchmark and top-performing baseline methods, then present our AWM approach and showcase its ability to achieve superior task success and generalization across varied setups. For both benchmarks, we conduct AWM on a website basis. In other words, we group examples by their associated websites, and respectively run AWM on each group. This mechanism maintains an small collection of workflows that are nonetheless relevent to the test tasks.

<sub>§3 Experiments</sub>

### 2. WebArena

WebArena ( Zhou et al., 2024 ) provides 812 web navigation tasks on five websites that cover four common application domains: e-commerce, social forum discussions, collaborative software development, and content management. Most importantly, WebArena supports rigorous evaluation on the functional correctness of agent trajectories. We adopt the current state-of-the-art method without human-annotated site-specific knowledge, BrowserGym ( Drouin et al., 2024 ) , which altered the agent default action space. We adopt the BrowserGym framework and its default action space, and represent webpages using accessibility trees, following the environment representation in Zhou et al. (2024) . Because BrowserGym inputs both webpage HTML and accessibility tree representations, to keep a fair comparison with our method, we also run the BrowserGym version with only accessibility tree webpage representations, denoted as BrowserGym ax-tree . We also compare to the SteP method ( Sodhi et al., 2023 ) , which uses 14 human expert written workflows tailored to solving WebArena. Our method, in contrast, uses no human supervision and is not tailored to the WebArena setting. Following baseline approaches, we use GPT-4 ( gpt-4-0613 ) with a temperature of 0.0 0.0 to ensure mostly stable model outputs. Because WebArena only has test examples and no additional high-quality, domain-aligned examples exist, we only conduct AWM in the online setting as in § 2.3 .

<sub>§3.1 WebArena</sub>

### 3. Efficient learning from small amounts of data

To demonstrate the behavior of the AWM 𝑜𝑛𝑙𝑖𝑛𝑒 \textsc{AWM}_{\it online} method, we illustrate the cumulative success rate over the process of online evaluation, by evaluating the average success rate of the first k k finished examples. As in Figure 5 , the agent exhibits a fast learning curve in the beginning (between 0–40 examples), by acquiring the most essential workflows, which results in higher success rates. Afterward, agents learn more advanced workflows ( Figure 1 ), while success rates gradually stabilize to the highest point in the early learning phase. This showcases AWM ’s efficient learning process, which substantially improves performance with merely tens of examples.

<sub>§3.1.2 Efficient learning from small amounts of data</sub>

### 4. Cross-template workflow generalization

Some tasks in the WebArena benchmark have highly overlapping canonical trajectories, due to the benchmark construction process that instantiates multiple examples from a single underlying task template. AWM intuitively improves in-template success rate, that is, given one workflow induced from a successful example, it would be theoretically easier to solve all other examples generated from the same task template. To confirm that the benefits of AWM are not just from learning workflows that help only within a template, and investigate whether AWM can obtain cross-template ( ≈ \approx cross-task) generalization, we extract a subset of WebArena examples sourcing from non-overlapping templates, by grouping examples by their templates and randomly choosing one example from each template group. We run AWM on this cross-template subset and examine if it achieves similar performance gains. As shown in Table 2 , AWM still achieves the highest performance, overall and on each website split. These results demonstrate that AWM induced workflows can effectively generalize across different tasks, i.e., examples instantiated from different task templates.

<sub>§3.1.3 Cross-template workflow generalization</sub>

### 5. Mind2Web

Mind2Web ( Deng et al., 2023 ) features web navigation in cross-task, website, and domain settings, stressing the generality of agents on versatile operations and environments. Each task in Mind2Web has a fixed number of steps; at each step, the agent needs to predict an action, which is evaluated by: (1) element accuracy : to check if the correct page element is selected, (2) action F 1 to check if the action taken on the element is correct, and aggregating (1) and (2) yields (3) step success rate which checks that both element and action selection are correct at the current step. Lastly, after completing every step in the given task, the last metric (4) task-level success rate measures if all intermediate steps are successfully conducted for this task, i.e. , all steps for this task score 1 under metric (3). Because Mind2Web provides a training set covering part of the tested websites (cross-task split), we explore both the offline setting that induces workflows from the training set and applies to test sets, and the online setting, where we stream workflow induction and inference on test queries (§ 2.3 ). Since we focus on LM-based agents that only take textual inputs, we compare AWM to two state-of-the-art methods, MindAct ( Deng et al., 2023 ) and Synapse ( Zheng et al., 2024 ) . MindAct introduces webpage element filtering and multi-choice task format to ease observation processing, and Synapse changes the format to a trajectory style and augments retrieved relevant examples. We integrate the element filtering adopted in both methods, and added workflows instead of retrieved examples in Synapse, to verify the superiority of reusable workflows over concrete examples. To fairly compare with all baseline methods, we run AWM with both gpt-3.5-turbo and gpt-4 models with temperature 0.0 0.0 . We use the same model for neural workflow induction and agent action generation.

<sub>§3.2 Mind2Web</sub>

### 6. Online AWM Enables Generalization

Beyond the offline induction setting, we further explore the AWM in the online setting, similar to the WebArena experiment setup in § 3.1 , where no additional training examples are needed besides test queries. This naturally facilitates cross-website and cross-domain generalization, which we examine on the two other splits provided by the Mind2Web dataset: cross-website and cross-domain tests. In addition to the MindAct baseline, we additionally set bars with our AWM offline setup, by randomly selecting workflows induced from the training set as memory augmentations. Specifically, for cross-website examples, we select workflows from the same domain; for the cross-domain setting, we randomly select workflows from all domains. We conduct AWM online by iteratively inducing, integrating, and utilizing workflows over test inferences. We also explore AWM offline+online in § C . As shown in Table 4 , both AWM online and AWM offline surpass the MindAct baseline by a large margin, resulting in 7.4 7.4 – 8.9 8.9 , 3.6 3.6 – 3.8 3.8 , and 14.0 14.0 – 16.9 16.9 absolute point improvements in step success rates, in cross-task, cross-website, and cross-domain scenarios.

<sub>§3.2.2 Online AWM Enables Generalization</sub>

## 总结与展望
Agent Workflow Memory 从成功轨迹里抽出可复用的工作流，再在后续任务里按需取用。它与我们最接近：抽出来的不是一句断言，而是一段步骤序列。这类经验的复用性强，但也更容易把「当时的偶然顺序」当成规律。

**It connects to**

- `2305.16291` — 两者都把经验写成可执行单元，一个用代码一个用步骤。
- `2303.11366` — 从反思到工作流，是从自述走向可执行的一步。

## 不足之处
**What a reader should still not conclude**

- 工作流的抽取依赖成功轨迹的质量，失败轨迹里的信息被丢弃。
- 论文没有测「工作流在新任务上失效时是否会被撤回」。

---

# LongMemEval : Benchmarking Chat Assist- ants on Long-Term Interactive Memory

arXiv:2410.10813 · 2025 · [source](https://arxiv.org/html/2410.10813)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have exhibited impressive capabilities in solving diverse tasks through natural language, leading to numerous successful chat assistant applications ( OpenAI, 2022 ; Microsoft, 2023 ) . Nevertheless, LLMs face limitations on tasks relying heavily on personal knowledge accumulated through long-term user-AI interactions, such as psychological counseling or secretarial duties ( Zhong et al., 2024 ) . Failing to incorporate user background and preferences into responses can diminish the response’s accuracy as well as user satisfaction. To personalize LLM-based assistants, long-term memory, the ability to memorize, recall, and reason with a long interaction history, is indispensable. Recently, several commercial ( OpenAI, 2024 ; Coze, 2024 ) and open-source assistant systems with memory ( Zhong et al., 2024 ; Zhang et al., 2024 ) have been introduced. These systems leverage techniques like compressing, indexing, and retrieving from chat histories to generate more accurate and personalized responses.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 LongMemEval"]
  N1["§3.1 Problem Formulation"]
  N2["§Question Curation"]
  N3["§Evidence Session Construction"]
  N4["§History Compilation"]
  N5["§Question Answering"]
  N6["§Memory Recall"]
  N7["§3.4 LongMemEval represents a significant challenge"]
  N8["§Commercial systems"]
  N9["§Long-Context LLMs"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
  N8 --> N9
```

![Examples of the seven question types in LongMemEval . For each example, we show the associated evidence statements on the left and the question with the answer on the right.](https://arxiv.org/html/2410.10813/2410.10813v2/main_examples.png)

*Examples of the seven question types in LongMemEval . For each example, we show the associated evidence statements on the left and the question with the answer on the right.*

<sub>figure: `2410.10813v2/main_examples.png`</sub>

## 机制
### 1. LongMemEval

Information Extraction (IE): Ability to recall specific information from extensive interactive histories, including the details mentioned by either the user or the assistant. Multi-Session Reasoning (MR): Ability to synthesize the information across multiple history sessions to answer complex questions that involve aggregation and comparison. Knowledge Updates (KU): Ability to recognize the changes in the user’s personal information and update the knowledge of the user dynamically over time. Temporal Reasoning (TR): Awareness of the temporal aspects of user information, including both explicit time mentions and timestamp metadata in the interactions. Abstention (ABS): Ability to identify questions seeking unknown information, i.e., information not mentioned by the user in the interaction history, and answer “I don’t know”.

<sub>§3 LongMemEval</sub>

### 2. Problem Formulation

The evaluation of LongMemEval requires an instance of 4-tuple ( 𝐒 , q , t q , a ) (\mathbf{S},q,t_{q},a) . 𝐒 ≡ [ ( t 1 , S 1 ) , ( t 2 , S 2 ) , … , ( t N , S N ) ] \mathbf{S}\equiv[(t_{1},S_{1}),(t_{2},S_{2}),...,(t_{N},S_{N})] is a sequence of N N history chat sessions ordered from the earliest to the latest, where S i S_{i} is a multi-turn interaction between the user and a chat assistant and t i t_{i} is the session’s timestamp. Each session can be further decomposed into rounds: one user message followed by one assistant response. During test time, 𝐒 \mathbf{S} is provided to the system one by one. q q and t q > t N t_{q}>t_{N} represent the question from the user and its date. a a is a short phrase indicating the answer, or a natural language rubric describing the preferred answer in the case where q q is open-ended.

<sub>§3.1 Problem Formulation</sub>

### 3. Question Curation

Figure 2 depicts the question curation pipeline. We define an ontology of 164 user attributes in five categories: lifestyle, belongings, life events, situations context, and demographic information. For each attribute, we leverage an LLM 1 1 1 Unless otherwise mentioned, Llama 3 70B Instruct ( Dubey et al., 2024 ) is used as the LLM in the pipeline. to generate attribute-focused user background paragraphs, each of which includes detailed discussion of the user’s life experience. To create a question, we randomly sample a paragraph and use an LLM to propose several seed (question, answer) pairs. As these LLM-proposed questions often lack depth and diversity, human experts manually filter and rewrite all the questions to achieve the desired difficulty. Then, we manually decompose the answer into one or more evidence statements with optional timestamps.

<sub>§Question Curation</sub>

### 4. Evidence Session Construction

Each evidence statement is then separately embedded into a task-oriented evidence session created by self-chatting ( Xu et al., 2023 ) . The user LLM is instructed to convey the evidence statement indirectly, e.g., instead of stating “I bought a new car last month,” it might instead ask for help about car insurance and reveal the information incidentally. This approach enhances the benchmark’s difficulty by requiring systems to recognize and memorize user details not explicitly emphasized in conversations. We present the full details in Section A.1 . To ensure the data quality, all the evidence sessions are then manually screened and edited to (1) verify evidence inclusion, (2) distribute the evidence statement across different conversation positions, and (3) rephrase statements into more natural, colloquial language, especially for time mentions, which LLMs often express too formally. We also meticulously annotate the position of the evidence statement within each evidence session. For questions involving temporal information, we then manually add timestamps to both the evidence sessions and the questions. Most questions require evidence from multiple sessions (up to six) with evidence statements positioned diversely within sessions. Section A.3 presents further statistics of the final constructed data.

<sub>§Evidence Session Construction</sub>

### 5. History Compilation

For each question, LongMemEval compiles a coherent user-AI chat history ( Figure 2 c). Our approach is analogous to the needle-in-a-haystack test ( Kamradt, 2023 ) , which asks a model to retrieve brief information (the “needle”) embedded in a long document (the “haystack”). In comparison, LongMemEval is more challenging and realistic as it involves retrieving and synthesizing information from multiple extended evidence sessions. Specifically, we sample a number of unrelated user-AI chat sessions, randomly insert the evidence sessions in the middle, and assign a plausible timestamp to all sessions. We draw the irrelevant sessions from two sources: (1) self-chat sessions simulated based on other non-conflicting attributes and (2) publicly released user-AI style chat data including ShareGPT ( Zheng et al., 2023 ) and UltraChat ( Ding et al., 2023 ) . This design creates extensible realistic chat histories with minimal conflicts. While the pipeline allows us to compile chat histories of arbitrary length, we provide two standard settings: LongMemEval S ( ∼ \sim 115k tokens/question) and LongMemEval M (500 sessions, ∼ \sim 1.5M tokens).

<sub>§History Compilation</sub>

### 6. Question Answering

As the correct answers can take flexible forms, an exact matching strategy as in previous works can result in inaccurate evaluations. To address this, LongMemEval employs a LLM to assess response quality ( Liu et al., 2023 ) . Specifically, we prompt-engineer the gpt-4o-2024-08-06 model via the OpenAI API. Our meta-evaluation study demonstrates that the evaluator achieves more than 97% agreement with human experts. The prompts for each problem type as well as the human meta-evaluation details are presented in Section A.4 .

<sub>§Question Answering</sub>

### 7. Memory Recall

As LongMemEval contains human-annotated answer location labels, intermediate retrieval metrics can be easily calculated if the chat system exposes its retrieval results. We report Recall@ k k and NDCG@ k k , where k k is the number of top items retrieved by the system.

<sub>§Memory Recall</sub>

### 8. LongMemEval represents a significant challenge / Commercial systems

Using LongMemEval , we conduct a pilot study on commercial systems and long-context LLMs. We evaluate two commercial systems that maintain a set of memorized user facts as the user chats with the assistant: ChatGPT ( OpenAI, 2024 ) and Coze ( Coze, 2024 ) . Since these systems only support memory features via their web interfaces, we randomly selected 97 questions and created a short chat history of 3-6 sessions (approximately 10x shorter than LongMemEval S ). Human annotators interacted with the chat assistants session-by-session and turn-by-turn, and finally ask the question in a new session 2 2 2 All evaluations were conducted in the first two weeks of August 2024. . In Figure 3(a) , we compare this online memory evaluation with offline reading, where GPT-4o is prompted to answer with the complete history provided as context. Both ChatGPT and Coze exhibited significant performance drops compared to offline reading, underscoring the challenging nature of LongMemEval . We found ChatGPT tended to overwrite crucial information as the chat continues, while Coze often failed to record indirectly provided user information. We provide analyses in Appendix B . Overall, this result highlights the gap between building a seemingly personalized chat assistant by recalling isolated facts and demonstrating a genuinely strong memory ability .

<sub>§3.4 LongMemEval represents a significant challenge · §Commercial systems</sub>

### 9. Long-Context LLMs

While LongMemEval poses a significant challenge to online memory systems, is the benchmark easily tackled with offline reading over the entire history? In Figure 3(b) , we evaluated four advanced long-context LLMs on LongMemEval S (with a history length of approximately 115k tokens): GPT-4o, Llama 3.1 Instruct ( Dubey et al., 2024 ) , and Phi-3 ( Abdin et al., 2024a ) . Compared to the oracle retrieval setting (answering with only the evidence sessions as the context), these LLMs showed a 30% to 60% performance decline when tasked with reading the entire LongMemEval S history, regardless of whether the chain-of-note technique ( Yu et al., 2023 ) was applied (discussed further in Section 4.2 ). As the histories in LongMemEval S is still short ( ∼ \sim 50 sessions), the performance is likely to further degrade as the interaction history expands. Overall, these findings suggest that even the most capable current long-context LLMs struggle to manage an ever-growing interaction history without an effective memory mechanism .

<sub>§Long-Context LLMs</sub>

## 总结与展望
LongMemEval 用 500 个问题覆盖五种长期记忆能力（信息抽取、多会话推理、时间推理、知识更新、 abstention），是本方向最完整的评测协议。它的价值不在分数，而在把「记忆好」拆成五个可以分别失败的东西。

**It connects to**

- `2504.19413` — 被它评测的系统之一；协议与实现是一对。
- `2402.17753` — 另一个长期对话记忆基准，侧重对话自然度而非能力分解。

## 不足之处
**What a reader should still not conclude**

- 问题由人工构造，分布与真实使用不同。
- 它测的是问答，不测「经验是否改变了后续行为」。

---

# Evaluating Very Long-Term Conversational Memory of LLM Agents

arXiv:2402.17753 · 2024 · [source](https://arxiv.org/html/2402.17753)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Despite recent advancements in dialogue models based on LLMs for extended contexts Bertsch et al. (2024) ; Xiao et al. (2023) , as well as the integration of retrieval augmented generation (RAG) techniques Shuster et al. (2021) ; Ram et al. (2023) ; Shi et al. (2023) , there is still a need for thorough evaluation of their efficacy in handling very long conversations. Indeed, studies in long-term open-domain dialogues have concentrated on assessing model responses within limited contexts e.g., ∼ \sim 1K tokens over five chat sessions Xu et al. (2022) ; Jang et al. (2023) ; Zhang et al. (2023) . This long term evaluation is crucial for refining engaging chatbots capable of remembering key information from past interactions, to generate empathetic, consistent, and useful responses.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§5 Experimental Setup"]
  N1["§Question Answering."]
  N2["§Event Summarization."]
  N3["§Multi-modal Dialogue Generation."]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![An example in LoCoMo . Dialogs are steered by the speakers’ personas and corresponding events e.g., Joanna’s responses are consistent with her pet allergies. For Nate, the event got a new dog is followed by a playdate with neighbor’s dog , showcasing long-term memory. Multimodal dialog is enabled with image-sharing and image-response behaviors.](https://arxiv.org/html/2402.17753/2402.17753v1/intro_figure_conv_only_v2.png)

*An example in LoCoMo . Dialogs are steered by the speakers’ personas and corresponding events e.g., Joanna’s responses are consistent with her pet allergies. For Nate, the event got a new dog is followed by a playdate with neighbor’s dog , showcasing long-term memory. Multimodal dialog is enabled with image-sharing and image-response behaviors.*

<sub>figure: `2402.17753v1/intro_figure_conv_only_v2.png`</sub>

## 机制
### 1. Experimental Setup

For the question-answering and event summarization tasks, we replace images in LoCoMo with their captions Li et al. (2023b) , and use state-of-art LLMs to reason over text-only dialogues interleaved with image captions. We use images directly for the multimodal dialog generation task only. See additional details in Appendix C .

<sub>§5 Experimental Setup</sub>

### 2. Question Answering.

We evaluate three types of models: (1) Base LLMs operating with constrained context lengths where earlier dialogues are omitted i.e., Mistral-7B Jiang et al. (2023) , LLama-70B-chat Touvron et al. (2023) , gpt-3.5-turbo 5 5 5 https://platform.openai.com/docs/models/gpt-3-5 , and gpt-4-turbo 6 6 6 https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo ; (2) Long-context LLMs with an extended context window i.e., gpt-3.5-turbo-16k ; (3) Retrieval-augmented Generation (RAG) involves retrieving relevant context from a database of dialog history, observations (assertions about speakers; see § 3.3 , Figure 9 ), or session-level summaries (see § 3.3 , Figure 8 ). We employ DRAGON Lin et al. (2023) as retriever and gpt-3.5-turbo-16k as reader.

<sub>§Question Answering.</sub>

### 3. Event Summarization.

We present experiments using Base and Long-context setups from the question-answering task, but refrain from including RAG since summarization requires a comprehensive understanding of the entire dialogue, rather than just retrieving a specific portion. We implement incremental summarization i.e., iteratively create a summary of a preceding sessions and then use that summary as a basis to summarize the subsequent sessions Chang et al. (2023) .

<sub>§Event Summarization.</sub>

### 4. Multi-modal Dialogue Generation.

We generate 50 conversations using our automated pipeline (without human filtering; § 3 ) for training data and train three versions of MiniGPT-5 Zheng et al. (2023) : (1) Base trains on prior dialogue turns only; (2) + summary trains on prior dialogue turns and a global summary of the ongoing conversation; (3) + observation trains on prior dialogue turns and observations retrieved from conversation history. Each run is initialized with a MiniGPT-5 checkpoint finetuned on MMDialog Feng et al. (2023) .

<sub>§Multi-modal Dialogue Generation.</sub>

## 总结与展望
这篇构造了超长期（多会话）的对话历史并系统地测「记住多久之后还记得」。它的贡献是把「长期」变成可度量的时间跨度，而不是一个形容词。

**It connects to**

- `2410.10813` — 两个基准互补：一个按能力分类，一个按时间跨度分层。

## 不足之处
**What a reader should still not conclude**

- 对话由模型生成，真实用户的长程行为可能不同。

---

# Zep: A Temporal Knowledge Graph Architecture for Agent Memory

arXiv:2501.13956 · 2025 · [source](https://arxiv.org/html/2501.13956)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The impact of transformer-based large language models (LLMs) on industry and research communities has garnered significant attention in recent years [ 1 ] . A major application of LLMs has been the development of chat-based agents. However, these agents’ capabilities are limited by the LLMs’ context windows, effective context utilization, and knowledge gained during pre-training. Consequently, additional context is required to provide out-of-domain (OOD) knowledge and reduce hallucinations.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Knowledge Graph Construction"]
  N1["§2.1 Episodes"]
  N2["§2.2 Semantic Entities and Facts"]
  N3["§2.2.1 Entities"]
  N4["§2.2.2 Facts"]
  N5["§2.2.3 Temporal Extraction and Edge Invalidation"]
  N6["§2.3 Communities"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

## 机制
### 1. Knowledge Graph Construction

In Zep, memory is powered by a temporally-aware dynamic knowledge graph 𝒢 = ( 𝒩 , ℰ , ϕ ) \mathcal{G}=(\mathcal{N},\mathcal{E},\phi) , where 𝒩 \mathcal{N} represents nodes, ℰ \mathcal{E} represents edges, and ϕ : ℰ → 𝒩 × 𝒩 \phi:\mathcal{E}\to\mathcal{N}\times\mathcal{N} represents a formal incidence function. This graph comprises three hierarchical tiers of subgraphs: an episode subgraph, a semantic entity subgraph, and a community subgraph. Episode Subgraph 𝒢 e \mathcal{G}_{e} : Episodic nodes (episodes), n i ∈ 𝒩 e n_{i}\in\mathcal{N}_{e} , contain raw input data in the form of messages, text, or JSON. Episodes serve as a non-lossy data store from which semantic entities and relations are extracted. Episodic edges, e i ∈ ℰ e ⊆ ϕ ∗ ​ ( 𝒩 e × 𝒩 s ) e_{i}\in\mathcal{E}_{e}\subseteq\phi^{*}(\mathcal{N}_{e}\times\mathcal{N}_{s}) , connect episodes to their referenced semantic entities. Semantic Entity Subgraph 𝒢 s \mathcal{G}_{s} : The semantic entity subgraph builds upon the episode subgraph. Entity nodes (entities), n i ∈ 𝒩 s n_{i}\in\mathcal{N}_{s} , represent entities extracted from episodes and resolved with existing graph entities. Entity edges (semantic edges), e i ∈ ℰ s ⊆ ϕ ∗ ​ ( 𝒩 s × 𝒩 s ) e_{i}\in\mathcal{E}_{s}\subseteq\phi^{*}(\mathcal{N}_{s}\times\mathcal{N}_{s}) , represent relationships between entities extracted from episodes. Community Subgraph 𝒢 c \mathcal{G}_{c} : The community subgraph forms the highest level of Zep’s knowledge graph. Community nodes (communities), n i ∈ 𝒩 c n_{i}\in\mathcal{N}_{c} , represent clusters of strongly connected entities. Communities contain high-level summarizations of these clusters and represent a more comprehensive, interconnected view of 𝒢 s \mathcal{G}_{s} ’s structure. Community edges, e i ∈ ℰ c ⊆ ϕ ∗ ​ ( 𝒩 c × 𝒩 s ) e_{i}\in\mathcal{E}_{c}\subseteq\phi^{*}(\mathcal{N}_{c}\times\mathcal{N}_{s}) , connect communities to their entity members. The dual storage of both raw episodic data and derived semantic entity information mirrors psychological models of human memory. These models distinguish between episodic memory, which represents distinct events, and semantic memory, which captures associations between concepts and their meanings [ 8 ] . This approach enables LLM agents using Zep to develop more sophisticated and nuanced memory structures that better align with our understanding of human memory systems. Knowledge graphs provide an effective medium for representing these memory structures, and our implementation of distinct episodic and semantic subgraphs draws from similar approaches in AriGraph [ 9 ] . Our use of community nodes to represent high-level structures and domain concepts builds upon work from GraphRAG [ 4 ] , enabling a more comprehensive global understanding of the domain. The resulting hierarchical organization—from episodes to facts to entities to communities—extends existing hierarchical RAG strategies [ 10 ] [ 11 ] .

<sub>§2 Knowledge Graph Construction</sub>

### 2. Episodes

Zep’s graph construction begins with the ingestion of raw data units called Episodes. Episodes can be one of three core types: message, text, or JSON. While each type requires specific handling during graph construction, this paper focuses on the message type, as our experiments center on conversation memory. In our context, a message consists of relatively short text (several messages can fit within an LLM context window) along with the associated actor who produced the utterance. Each message includes a reference timestamp t ref t_{\text{ref}} indicating when the message was sent. This temporal information enables Zep to accurately identify and extract relative or partial dates mentioned in the message content (e.g., "next Thursday," "in two weeks," or "last summer"). Zep implements a bi-temporal model, where timeline T T represents the chronological ordering of events, and timeline T ′ T^{\prime} represents the transactional order of Zep’s data ingestion. While the T ′ T^{\prime} timeline serves the traditional purpose of database auditing, the T T timeline provides an additional dimension for modeling the dynamic nature of conversational data and memory. This bi-temporal approach represents a novel advancement in LLM-based knowledge graph construction and underlies much of Zep’s unique capabilities compared to previous graph-based RAG proposals. The episodic edges, ℰ e \mathcal{E}_{e} , connect episodes to their extracted entity nodes. Episodes and their derived semantic edges maintain bidirectional indices that track the relationships between edges and their source episodes. This design reinforces the non-lossy nature of Graphiti’s episodic subgraph by enabling both forward and backward traversal: semantic artifacts can be traced to their sources for citation or quotation, while episodes can quickly retrieve their relevant entities and facts. While these connections are not directly examined in this paper’s experiments, they will be explored in future work.

<sub>§2.1 Episodes</sub>

### 3. Entities

ntity extraction represents the initial phase of episode processing. During ingestion, the system processes both the current message content and the last n n messages to provide context for named entity recognition. For this paper and in Zep’s general implementation, n = 4 n=4 , providing two complete conversation turns for context evaluation. Given our focus on message processing, the speaker is automatically extracted as an entity. Following initial entity extraction, we employ a reflection technique inspired by reflexion [ 12 ] to minimize hallucinations and enhance extraction coverage. The system also extracts an entity summary from the episode to facilitate subsequent entity resolution and retrieval operations. After extraction, the system embeds each entity name into a 1024-dimensional vector space. This embedding enables the retrieval of similar nodes through cosine similarity search across existing graph entity nodes. The system also performs a separate full-text search on existing entity names and summaries to identify additional candidate nodes. These candidate nodes, together with the episode context, are then processed through an LLM using our entity resolution prompt. When the system identifies a duplicate entity, it generates an updated name and summary. Following entity extraction and resolution, the system incorporates the data into the knowledge graph using predefined Cypher queries. We chose this approach over LLM-generated database queries to ensure consistent schema formats and reduce the potential for hallucinations. Selected prompts for graph construction are provided in the appendix.

<sub>§2.2.1 Entities</sub>

### 4. Facts

or each fact containing its key predicate. Importantly, the same fact can be extracted multiple times between different entities, enabling Graphiti to model complex multi-entity facts through an implementation of hyper-edges. Following extraction, the system generates embeddings for facts in preparation for graph integration. The system performs edge deduplication through a process similar to entity resolution. The hybrid search for relevant edges is constrained to edges existing between the same entity pairs as the proposed new edge. This constraint not only prevents erroneous combinations of similar edges between different entities but also significantly reduces the computational complexity of the deduplication process by limiting the search space to a subset of edges relevant to the specific entity pair.

<sub>§2.2.2 Facts</sub>

### 5. Temporal Extraction and Edge Invalidation

A key differentiating feature of Graphiti compared to other knowledge graph engines is its capacity to manage dynamic information updates through temporal extraction and edge invalidation processes. The system extracts temporal information about facts from the episode context using t ref t_{\text{ref}} . This enables accurate extraction and datetime representation of both absolute timestamps (e.g., "Alan Turing was born on June 23, 1912") and relative timestamps (e.g., "I started my new job two weeks ago"). Consistent with our bi-temporal modeling approach, the system tracks four timestamps: t ′ ​ created t^{\prime}\text{created} and t ′ ​ expired ∈ T ′ t^{\prime}\text{expired}\in T^{\prime} monitor when facts are created or invalidated in the system, while t valid t_{\text{valid}} and t invalid ∈ T t_{\text{invalid}}\in T track the temporal range during which facts held true. These temporal data points are stored on edges alongside other fact information. The introduction of new edges can invalidate existing edges in the database. The system employs an LLM to compare new edges against semantically related existing edges to identify potential contradictions. When the system identifies temporally overlapping contradictions, it invalidates the affected edges by setting their t invalid t_{\text{invalid}} to the t valid t_{\text{valid}} of the invalidating edge. Following the transactional timeline T ′ T^{\prime} , Graphiti consistently prioritizes new information when determining edge invalidation. This comprehensive approach enables the dynamic addition of data to Graphiti as conversations evolve, while maintaining both current relationship states and historical records of relationship evolution over time.

<sub>§2.2.3 Temporal Extraction and Edge Invalidation</sub>

### 6. Communities

After establishing the episodic and semantic subgraphs, the system constructs the community subgraph through community detection. While our community detection approach builds upon the technique described in GraphRAG [ 4 ] , we employ a label propagation algorithm [ 13 ] rather than the Leiden algorithm [ 14 ] . This choice was influenced by label propagation’s straightforward dynamic extension, which enables the system to maintain accurate community representations for longer periods as new data enters the graph, delaying the need for complete community refreshes. The dynamic extension implements the logic of a single recursive step in label propagation. When the system adds a new entity node n i ∈ 𝒩 s n_{i}\in\mathcal{N}_{s} to the graph, it surveys the communities of neighboring nodes. The system assigns the new node to the community held by the plurality of its neighbors, then updates the community summary and graph accordingly. While this dynamic updating enables efficient community extension as data flows into the system, the resulting communities gradually diverge from those that would be generated by a complete label propagation run. Therefore, periodic community refreshes remain necessary. However, this dynamic updating strategy provides a practical heuristic that significantly reduces latency and LLM inference costs. Following [ 4 ] , our community nodes contain summaries derived through an iterative map-reduce-style summarization of member nodes. However, our retrieval methods differ substantially from GraphRAG’s map-reduce approach [ 4 ] . To support our retrieval methodology, we generate community names containing key terms and relevant subjects from the community summaries. These names are embedded and stored to enable cosine similarity searches.

<sub>§2.3 Communities</sub>

## 总结与展望
Zep 用时序知识图谱存事实与关系，并显式建模「事实何时有效」。它比向量检索更适合我们的场景：知识库里的断言常常带时间（哪一轮、哪个版本），平铺存储会把这个维度丢掉。

**It connects to**

- `2310.08560` — 同为长期记忆架构，一个用分页一个用图谱。
- `2504.19413` — Mem0 也有图变体，两者是同一思路的竞争实现。

## 不足之处
**What a reader should still not conclude**

- arXiv 只给 PDF，没有 HTML 正文，所以这一页的机制引用来自摘要与其他论文的描述。
- 图谱的构建成本与错误传播没有在论文里充分报告。
