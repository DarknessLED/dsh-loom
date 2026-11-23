# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `search`, `retrieval`, `coverage`, `saturation`, `synthesis`, `citation`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents (`2504.12516`) | 17 | 6 | graded ok (depth full) |
| Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning (`2503.09516`) | 38 | 6 | graded ok (depth full) |
| Evaluating Verifiability in Generative Search Engines (`2304.09848`) | 53 | 6 | graded ok (depth full) |
| Qwen3 Technical Report (`2505.09388`) | 37 | 6 | graded ok (depth full) |
| BrowseComp-Plus: A More Fair and Transparent Evaluation Benchmark of Deep-Research Agent (`2508.06600`) | 41 | 6 | graded ok (depth full) |
| WebGPT: Browser-assisted question-answering with human feedback (`2112.09332`) | 38 | 6 | graded ok (depth full) |
| Chain-of-Thought Prompting Elicits Reasoning in Large Language Models (`2201.11903`) | 43 | 3 | graded ok (depth full) |
| DeepResearcher: Scaling Deep Research via Reinforcement Learning in Real-world Environments (`2504.03160`) | 52 | 6 | graded ok (depth full) |

## BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents — `2504.12516`

- **§4.5 Distribution of pass rates** (`S4.SS5.p2.1`)

  > For the subset of questions where Deep Research never produced a correct answer, we conducted a follow-up by prompting the model with the ground-truth answer and asking it to retrieve supporting web evidence. In most cases, the model succeeded, confirming that these questions were not unsolvable, but simply extremely difficult to crack without guidance. This suggests that many BrowseComp tasks test more than retrieval—they demand strategic perseverance, flexible search reformulation, and the ability to assemble fragmented clues across multiple sources.

- **§1 Introduction** (`S1.p3.1`)

  > As exemplified above, problems from BrowseComp are challenging because they require searching through a large space of potential answers and matching them to constraints posed in the question. Noting that adoption of benchmarks by the AI community is a function of reliability, difficulty, and ease-of-use, BrowseComp was designed with the following properties:

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > Challenging questions. Human trainers made sure that questions they created were not solvable by another person within ten minutes, and that existing models (ChatGPT with and without browsing, and an early version of OpenAI Deep Research) were not able to solve them.

- **§1 Introduction** (`S1.p5.1`)

  > Doing well on BrowseComp requires reasoning about factuality, navigating the internet persistently, and to solve the hardest problems, searching creatively to find the answer in a tractable amount of time. Analogous to how programming competitions are a useful proxy for general coding helpfulness, BrowseComp can be seen as measuring an important but limited subset of core browsing capability, but not the ergonomics of long responses or ability to resolve ambiguity in user queries. BrowseComp can be found at https://github.com/openai/simple-evals .

- **§2 Data collection and verification** (`S2.I1.i1.p1.1`)

  > Existing models at the time were not able to solve the question: trainers were asked to verify that GPT-4o (with and without browsing), as well as OpenAI o1 and an early version of the deep research model were not able to solve the problems.

- **§2 Data collection and verification** (`S2.I1.i2.p1.1`)

  > Trainers were asked to perform five simple Google searches and check that the answer was not readily available on any of the first pages of search results.

## Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning — `2503.09516`

- **§1 Introduction** (`S1.p2.1`)

  > Existing approaches for integrating LLMs with search engines typically fall into two categories: (1) retrieval-augmented generation (RAG) ( Gao et al., 2023 ; Lewis et al., 2020 ) and (2) treating the search engine as a tool ( Yao et al., 2023 ; Schick et al., 2023 ) . RAG models often retrieve passages based on the LLM input as query and incorporate them into the LLM’s context for generation ( Lewis et al., 2020 ) . This allows the LLM to leverage external knowledge when answering questions. Although existing work ( Trivedi et al., 2022a ) prompts LLM for multi-turn, multi-query retrieval, th…

- **§1 Introduction** (`S1.p3.1`)

  > Reinforcement Learning (RL) ( Sutton et al., 1999 ; Kaelbling et al., 1996 ) has emerged as a potent paradigm for enhancing the reasoning capabilities of LLMs ( Guo et al., 2025 ; Hou et al., 2025 ; Xie et al., 2025 ; Kumar et al., 2024 ) . Notably, models like OpenAI-o1 ( Jaech et al., 2024 ) and DeepSeek-R1 ( Guo et al., 2025 ) have leveraged RL techniques ( e.g. , PPO ( Schulman et al., 2017 ) and GRPO ( Shao et al., 2024 ) ) to improve logical inference and problem-solving skills by learning from experience and feedback. With RL, even when trained solely on the outcome rewards, the models…

- **§1 Introduction** (`S1.p4.1`)

  > To address aforementioned challenges, we introduce Search-R1 , a novel RL framework that enables LLMs to interact with search engines in an interleaved manner with their own reasoning. Specifically, Search-R1 introduces the following key innovations: (1) We model the search engine as part of the environment, enabling sampled trajectory sequences that interleave LLM token generation with search engine retrievals. Search-R1 is compatible with various RL algorithms, including PPO and GRPO, and we apply retrieved token masking to ensure stable optimization. (2) Search-R1 supports multi-turn retrie…

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > We conduct systematic experiments to demonstrate the effectiveness of Search-R1 , with two LLMs achieving respective average relative improvements of 41% and 20% over RAG baselines under the same experimental setup ( e.g. , same retrieval model, training data, and pre-trained LLMs). In addition, we provide insights on RL for reasoning and search settings, including RL method selection, different LLM choices, and response length study.

- **§2.1 Large Language Models and Retrieval** (`S2.SS1.p1.1`)

  > Despite demonstrating remarkable reasoning ( Guo et al., 2025 ) and coding ( Guo et al., 2024 ) capabilities, LLMs ( Zhao et al., 2023 ; Team, 2024 ; Achiam et al., 2023 ) often lack domain-specific knowledge ( Peng et al., 2023 ; Li et al., 2023 ) and are prone to hallucinations ( Zhang et al., 2023 ) . To mitigate these limitations, search engines ( Zhao et al., 2024 ) are widely integrated to supply external information. There are two primary ways to integrate search engines with LLMs: (1) retrieval-augmented generation (RAG) ( Gao et al., 2023 ) and (2) treating the search engines as tools…

- **§2.2 Large Language Models and Reinforcement Learning** (`S2.SS2.p1.1`)

  > Reinforcement learning (RL) ( Kaelbling et al., 1996 ) is a learning paradigm where an agent learns to make sequential decisions by interacting with an environment and receiving feedback in the form of rewards, aiming to maximize cumulative reward over time ( Sutton et al., 1999 ) . RL was introduced to LLM tuning by Ouyang et al. (2022) through RL from human feedback (RLHF) ( Kaufmann et al., 2023 ) . This approach first trains a reward model using human preference data ( Lambert et al., 2024 ) , which then guides RL-based tuning of the policy LLM, typically via Proximal Policy Optimization (…

## Evaluating Verifiability in Generative Search Engines — `2304.09848`

- **§1 Introduction** (`S1.p1.1`)

  > Generative search engines fulfill user information needs by directly generating responses to input queries, along with in-line citations (Figure 1 ). 1 1 1 In contrast, conventional search engines are limited to retrieving pre-existing webpages. Existing generative search engines are rapidly gaining users—in March 2023, Microsoft reported that “roughly one third of daily preview users are using [Bing] Chat daily”, and that Bing Chat served 45 million chats in the first month of its public preview ( Mehdi, 2023 ) . Generative search engines have the potential to transform how people find inform…

- **§1 Introduction** (`S1.p2.1`)

  > A prerequisite trait of a trustworthy generative search engine is verifiability , 2 2 2 We adopt the term verifiability from the Wikipedia community. Verifiability is a core content policy of Wikipedia: statements must be fully supported by provided sources. that is, each generated statement about the external world should be fully supported by a set of in-line citations, and each provided citation should support its associated statement. Verifiability enables readers to easily check that any generated statement is supported by its cited source.

- **§1 Introduction** (`S1.p6.1`)

  > A trustworthy generative search engine should achieve high citation recall and precision, indicating that its generated citations are comprehensive (every generated statement is fully supported by citation) and correct (every citation supports its associated statement).

- **§1 Introduction** (`S1.p7.1`)

  > We find that existing generative search engine responses often have high fluency and perceived utility (§ 4.1 ), but frequently contain unsupported statements or inaccurate citations (low citation recall and precision; § 4.2 ). On average, merely 51.5% of generated sentences are fully supported with citations (citation recall), and only 74.5% of citations support their associated sentence (citation precision). Furthermore, citation precision is inversely correlated with perceived utility ( r = − 0.96 r=-0.96 ); the responses that seem more helpful are often those with inaccurate citations (§ 4…

- **§1 Introduction** (`S1.p8.1`)

  > We make the following contributions: first, we define the citation recall and citation precision evaluation metrics, which aim to encourage the development of systems that cite comprehensively and correctly. Second, we conduct a human evaluation of four popular generative search engines, finding that responses are broadly fluent and appear useful, but frequently contain unsupported statements and inaccurate citations, increasing their potential to mislead users. Third, we observe that perceived utility is inversely correlated with citation precision in existing generative search engines, and h…

- **§2 Human Evaluation of Fluency, Perceived Utility, and Verifiability** (`S2.p1.1`)

  > In this section, we formalize the inputs and outputs of the generative search engines we study, describe the evaluation of fluency and perceived utility, and define and describe the evaluation of citation recall and precision. Citation recall and precision are designed to reward systems that cite comprehensively (i.e., high recall; all statements are fully supported by citations) and accurately (i.e., high precision; every cite supports its associated statement). We also define citation F 1 F_{1} , a metric that combines citation precision and citation recall.

## Qwen3 Technical Report — `2505.09388`

- **§1 Introduction** (`S1.p1.1`)

  > The pursuit of artificial general intelligence (AGI) or artificial super intelligence (ASI) has long been a goal for humanity. Recent advancements in large foundation models, e.g., GPT-4o ( OpenAI, 2024 ) , Claude 3.7 ( Anthropic, 2025 ) , Gemini 2.5 ( DeepMind, 2025 ) , DeepSeek-V3 ( Liu et al., 2024a ) , Llama-4 ( Meta-AI, 2025 ) , and Qwen2.5 ( Yang et al., 2024b ) , have demonstrated significant progress toward this objective. These models are trained on vast datasets spanning trillions of tokens across diverse domains and tasks, effectively distilling human knowledge and capabilities into…

- **§1 Introduction** (`S1.p7.1`)

  > In the following sections, we describe the design of the model architecture, provide details on its training procedures, present the experimental results of pre-trained and post-trained models, and finally, conclude this technical report by summarizing the key findings and outlining potential directions for future research.

- **§3.1 Pre-training Data** (`S3.SS1.p2.1`)

  > To further expand the pre-training data corpus, we first employ the Qwen2.5-VL model ( Bai et al., 2025 ) to perform text recognition on a large volume of PDF-like documents. The recognized text is then refined using the Qwen2.5 model ( Yang et al., 2024b ) , which helps improve its quality. Through this two-step process, we are able to obtain an additional set of high-quality text tokens, amounting to trillions in total. Besides, we employ Qwen2.5 ( Yang et al., 2024b ) , Qwen2.5-Math ( Yang et al., 2024c ) , and Qwen2.5-Coder ( Hui et al., 2024 ) models to synthesize trillions of text tokens…

- **§4 Post-training** (`S4.I2.i5.p1.1`)

  > Abilities for Specialized Scenarios : In more specialized scenarios, we design tasks tailored to the specific context. For example, in Retrieval-Augmented Generation (RAG) tasks, we incorporate reward signals to guide the model toward generating accurate and contextually appropriate responses, thereby minimizing the risk of hallucination.

- **§5 Conclusion** (`S5.p2.1`)

  > In the near future, our research will focus on several key areas. We will continue to scale up pretraining by using data that is both higher in quality and more diverse in content. At the same time, we will work on improving model architecture and training methods for the purposes of effective compression, scaling to extremely long contexts, etc. In addition, we plan to increase computational resources for reinforcement learning, with a particular emphasis on agent-based RL systems that learn from environmental feedback. This will allow us to build agents capable of tackling complex tasks that…

- **§Appendix A Appendix** (`A1.I1.i2.p1.1`)

  > In thinking mode, the model’s performance slightly degrades. We hypothesize that the thinking content does not provide significant benefits for these retrieval tasks, which do not rely on reasoning and may instead interfere with the retrieval process. We are committed to enhancing the long-context capability in the thinking mode in future versions.

## BrowseComp-Plus: A More Fair and Transparent Evaluation Benchmark of Deep-Research Agent — `2508.06600`

- **§4.7 Effect of Retrieval Quality** (`S4.SS7.p5.1`)

  > These results are likely due to the higher precision of early search results, which reduces the need for follow-up queries. This is supported by the Recall metric in Table 1 , where stronger retrievers yield higher recall for retrieved documents. In addition, Table 3 reports the coverage, average number, precision, and recall of the document citations attributed by the agent during answer generation. As the results show, although agents using BM25 issue more search calls, nearly all metrics are lower than those achieved with Qwen3-Embedding-8B. This indicates that documents returned by BM25 ar…

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > Fair Comparison on Deep Research Agents. Current evaluations of deep-research agents often conflate agent system performance with the effectiveness of their retrieval components, making it difficult to achieve fair and consistent comparisons across systems. This entanglement also severely undermines the reproducibility of experiments, which is a key requirement for rigorous evaluation [ 6 ] .

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > Transparency of Retrieval Process. The transparency of the retrieval process comes from two aspects: the retrieval algorithm and the target retrieval corpus. In the current evaluation pipelines, supporting documents are obtained through black-box web search APIs that operate over the entire internet, which are highly dynamic in content and consistently evolving over time. The lack of a controlled retrieval process hinders the evaluation of retrieval models’ contribution to deep-research agents.

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > Accessibility : The dependence on commercial web search APIs introduces substantial practical constraints, including high operational costs and variability in retrieval quality. These issues not only limit accessibility but also introduce unnecessary complexity and uncertainty in benchmarking.

- **§1 Introduction** (`S1.p3.1`)

  > To address these limitations and enable precise, reproducible, transparent, and component-focused evaluation of Deep-Research agents, we introduce BrowseComp-Plus , a novel benchmark dataset. BrowseComp-Plus extends the original BrowseComp dataset [ 1 ] by providing a fixed and curated corpus of documents specifically selected and verified by human annotators. Each query in BrowseComp-Plus is accompanied by explicitly identified supportive documents and hard negative documents. This carefully collected document corpus allows researchers to evaluate the retrieval and LLM agent components indepe…

- **§1 Introduction** (`S1.p4.1`)

  > To demonstrate the utility of BrowseComp-Plus , we conduct comprehensive evaluations by pairing various open- and closed-source LLMs with a range of retrieval models on our curated corpus. This setup allows us to systematically analyze how different combinations affect answer quality and to identify where performance bottlenecks lie, whether in the retriever or the language model. We find that even when equipped with state-of-the-art retrievers, Deep-Research agents still face substantial challenges in consistently surfacing all necessary evidence, for reasoning-intensive queries. These findin…

## WebGPT: Browser-assisted question-answering with human feedback — `2112.09332`

- **§1 Introduction** (`S1.p2.1`)

  > In this work we leverage existing solutions to these components: we outsource document retrieval to the Microsoft Bing Web Search API, 1 1 1 https://www.microsoft.com/en-us/bing/apis/bing-web-search-api and utilize unsupervised pre-training to achieve high-quality synthesis by fine-tuning GPT-3 ( Brown et al., 2020 ) . Instead of trying to improve these ingredients, we focus on combining them using more faithful training objectives. Following Stiennon et al. (2020) , we use human feedback to directly optimize answer quality, allowing us to achieve performance competitive with humans.

- **§1 Introduction** (`S1.p1.1`)

  > A rising challenge in NLP is long-form question-answering (LFQA), in which a paragraph-length answer is generated in response to an open-ended question. LFQA systems have the potential to become one of the main ways people learn about the world, but currently lag behind human performance ( Krishna et al., 2021 ) . Existing work tends to focus on two core components of the task, information retrieval and synthesis.

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > We create a text-based web-browsing environment that a fine-tuned language model can interact with. This allows us to improve both retrieval and synthesis in an end-to-end fashion using general methods such as imitation learning and reinforcement learning.

- **§2 Environment design** (`S2.p1.1`)

  > Previous work on question-answering such as REALM ( Guu et al., 2020 ) and RAG ( Lewis et al., 2020a ) has focused on improving document retrieval for a given query. Instead, we use a familiar existing method for this: a modern search engine (Bing). This has two main advantages. First, modern search engines are already very powerful, and index a large number of up-to-date documents. Second, it allows us to focus on the higher-level task of using a search engine to answer questions, something that humans can do well, and that a language model can mimic.

- **§6.2 Perceived truthfulness of WebGPT** (`S6.SS2.p1.1`)

  > In order to assess the benefits and risks of WebGPT, it is necessary to consider not only how often it makes false statements, but also how likely users are to rely on those statements. Although WebGPT makes false statements less frequently than GPT-3, its answers also appear more authoritative, partly because of the use of citations. In combination with the well-documented problem of “automation bias” ( Goddard et al., 2012 ) , this could lead to overreliance on WebGPT’s answers. This is particularly problematic because, as discussed in Section 6.1 , WebGPT can make more mistakes than humans…

- **§6.3 Reinforcement of bias** (`S6.SS3.p1.1`)

  > There are a number of ways in which WebGPT tends to perpetuate and reinforce existing assumptions and biases. Firstly, WebGPT inherits the biases of the base model from which it is fine tuned, GPT-3 ( Brown et al., 2020 ) , and this influences the way in which it chooses to search for and synthesize information. Search and synthesis both depend on the ability to include and exclude material depending on some measure of its value, and by incorporating GPT-3’s biases when making these decisions, WebGPT can be expected to perpetuate them further. Secondly, the fact that WebGPT synthesizes informa…

## Chain-of-Thought Prompting Elicits Reasoning in Large Language Models — `2201.11903`

- **§6 Discussion** (`S6.p3.1`)

  > As for limitations, we first qualify that although chain of thought emulates the thought processes of human reasoners, this does not answer whether the neural network is actually “reasoning,” which we leave as an open question. Second, although the cost of manually augmenting exemplars with chains of thought is minimal in the few-shot setting, such annotation costs could be prohibitive for finetuning (though this could potentially be surmounted with synthetic data generation, or zero-shot generalization). Third, there is no guarantee of correct reasoning paths, which can lead to both correct a…

- **§7 Related Work** (`S7.p1.1`)

  > This work is inspired by many research areas, which we detail in an extended related work section ( Appendix C ). Here we describe two directions and associated papers that are perhaps most relevant.

- **§7 Related Work** (`S7.p2.1`)

  > The first relevant direction is using intermediate steps to solve reasoning problems. Ling et al. (2017) pioneer the idea of using natural language rationales to solve math word problems through a series of intermediate steps. Their work is a remarkable contrast to the literature using formal languages to reason ( Roy et al., 2015 ; Chiang and Chen, 2019 ; Amini et al., 2019 ; Chen et al., 2019 ) . Cobbe et al. (2021) extend Ling et al. (2017) by creating a larger dataset and using it to finetune a pretrained language model rather than training a model from scratch. In the domain of program sy…

## DeepResearcher: Scaling Deep Research via Reinforcement Learning in Real-world Environments — `2504.03160`

- **§Importance of Real-World Environment in Training** (`S5.SS2.SSS4.Px3.p1.1`)

  > Questions in Bamboogle specifically require knowledge beyond Wikipedia’s coverage. Consequently, DeepResearcher significantly outperforms local RAG-based methods on this benchmark. Furthermore, even when we enable R1-Searcher (which was trained using local RAG) to search the real-world web, it still performs substantially worse than DeepResearcher. These results demonstrate the critical advantage of using real-world environments during RL scaling training, as this exposure develops robust information retrieval and synthesis capabilities that cannot be achieved in controlled, static environment…

- **§1 Introduction** (`S1.p2.1`)

  > Recent advances suggest that reinforcement learning (RL) offers a promising path forward for improving LLM capabilities. Studies by Guo et al. (2025) and Team et al. (2025) demonstrate that scaling reinforcement learning for LLMs on math and coding tasks Li et al. (2025b) substantially improves their reasoning abilities. For open-domain tasks, OpenAI has acknowledged using reinforcement learning techniques to enhance their Deep Research agent’s capabilities, but detailed methodologies remain proprietary and undisclosed, creating a significant gap in open research. Current open-source efforts t…

- **§1 Introduction** (`S1.p3.1`)

  > In this work, we present the first comprehensive study of RL scaling for LLM agents operating with real-world web search capabilities. Our approach, DeepResearcher , trains agents to interact directly with live search engines , thereby learning to handle the inherent variability and complexity of the open web. By training in genuine web environments rather than controlled simulations , our system develops robust capabilities for handling the unpredictable nature of real-world information retrieval and synthesis.

- **§Real-World Web Search Environments** (`S2.SS3.SSS0.Px2.p2.1`)

  > In contrast to previous work, our approach uniquely combines reinforcement learning with training in genuine web environments. Unlike existing RL methods that primarily focus on static, local text corpora, our method trains agents to interact directly with live search engines. This enables them to handle the inherent variability and complexity of the open web, developing robust capabilities for real-world information retrieval and synthesis. Our approach addresses the limitations of both prompt-based and RAG-confined methods by learning adaptive search strategies through direct interaction wit…

- **§2 Related Work** (`S2.p1.1`)

  > In this section, we review existing approaches to enhance large language models’ (LLMs) ability to access external knowledge with search. We categorize these methods into prompt-based and training-based search agents. We also examine the environments in which these methods operate—either local retrieval-augmented generation (RAG) or real-world web search—and position our work in this landscape.

- **§Reinforcement Learning (RL)** (`S2.SS2.SSS0.Px2.p1.1`)

  > End-to-end reinforcement learning offers a promising alternative that effectively unlocks LLMs’ inherent capabilities. By late 2024, large language models achieved remarkable breakthroughs in reasoning capability enhancement through RL Guo et al. (2025) ; OpenAI (2024) ; Team et al. (2025) . Recent research has explored applying RL to external knowledge retrieval, with systems such as Search-R1 Jin et al. (2025) , ReSearch Chen et al. (2025) , and R1-Searcher Song et al. (2025) abandoning manually specified cues in favor of models that autonomously develop reasoning during the retrieval proces…

---

## 读完这八篇正文之后，我认为什么变了

**1. 「可核查」被拆成了两个数：引用召回与引用精确率。这是我可以直接照抄的东西。**
2304.09848 §1 定义 citation recall / precision 并给硬数字：*merely 51.5% of generated sentences are fully supported with citations*，精确率更低。我们的 `rsi_research` 有逐字 quote 校验（比它更严，因为要求字节级命中），但**没有"每句话是否都有依据"这个维度**：report 的段落可以没有 claimId 而不报错。它们量的是覆盖，我们量的是正确。

**2. 基准的"不可解性"是被主动构造并验证的。**
2504.12516 §1/§2：人类出题者要保证**其他人在十分钟内解不出**、GPT-4o/o1/早期 deep research 都解不出，还要做五次 Google 搜索确认答案不在首页。我们 evalset 的任务几乎都是"我自己写的、我知道答案"，难度与它不可同日而语。

**3. 检索质量与 agent 质量必须分开评估，否则结论不可复现。**
2508.06600 §1：*Current evaluations of deep-research agents often conflate agent system performance with the effectiveness of their retrieval components*，做法是提供固定语料 + 固定检索器。我们的 loop 反过来——同一份仓库、同一套 guard，但**没有固定检索器这个维度**（我们的"检索"是 agent 自己 grep），所以无法判断一次晋升是"模型变强"还是"这次搜到了"。

**4. 把搜索建模成环境的一部分，是 RL 有效的前提。**
2503.09516 §1：*We model the search engine as part of the environment, enabling sampled trajectory*；同篇给数字：相对 RAG 基线平均提升 41% 与 20%。我们的 loop 的"环境"是 workspace + guard，"搜索"是 agent 的一次 bash 调用——**没有被建模成一个可学习的环境成分**。

**5. 在真实网上训练与在本地语料上训练，差的是泛化。**
2504.03160 §Importance of Real-World Environment：*we train agents to interact directly with live search engines, thereby learning to handle the inherent variability and complexity of the open web*；Bamboogle 上"需要维基百科之外的知识"时差距最大。我们的 loop 只在本地仓库里跑，泛化问题在结构上不存在，但**代价是任何关于泛化的结论都不能从我们的战役里得出**。

**6. 带引用的回答更"像真的"，因而更危险。这是被量过的。**
2112.09332 §6.2：*WebGPT makes false statements less frequently than GPT-3, its answers also appear more authoritative, partly because of the use of citations*，§6.3 讲了它如何继承并放大基座模型的偏差。我们的 sealed report 有 sha256 封印、有逐字核验标记——**这会让它看起来比实际更可靠**，尤其当 445/491 条 claim 只读了摘要级页面时。

**7. 思维链对检索任务可能是负担。**
2505.09388 §Appendix A：*In thinking mode, the model's performance slightly degrades. We hypothesize that the thinking content does not provide significant benefits for these retrieval tasks*。这直接反驳"更深思考总是更好"的默认假设，对我们的 R8 工具有直接含义。

**8. ReAct 的局限被原文承认了。**
2201.11903 §6：*although chain of thought emulates the thought processes of human reasoners, this does not answer whether the neural network is actually reasoning*。这条对"把 CoT 当监控通道"（R1 的 2503.11926）是一个反向约束。

## 三条我会改的

1. **给 report 加 citation recall。** 不只是"引用的都对"，还要"每句话都被引用支持"；`rsi_research seal` 现在允许无 claimId 的段落，等于精确率满分、召回率未知。
2. **给 evalset 加"不可解性"验证。** 出题时用当前最强的配置跑一遍，能解出来的题不算难题；我们现在所有任务都是自出题，难度从未标定。
3. **在 report 首页写清"这份报告的证据深度分布"。** 对应 WebGPT §6.2 的警示：带封印的报告更危险，必须把"多少条只读过摘要"写在最前面，而不是附录。

## 这份调研没回答的三件事

1. **中文语料下的可核查性。** 八篇全是英文语料与英文 benchmark；我们的调研对象大半是中文/英文混合，citation recall 的判定规则是否通用，没有对照。
2. **固定检索器在"仓库即环境"里对应什么。** BrowseComp-Plus 的做法需要预先给定语料，我们的 agent 面对的是可变的仓库状态，没有"冻结语料"的版本。
3. **检索的边际收益何时归零。** Search-R1 与 DeepResearcher 都只报"更多搜索更好"，没有一篇给"搜到第几次开始不再有用"的判据——这正是我们那条 `--gaps` 回填该停在哪一维的问题。
