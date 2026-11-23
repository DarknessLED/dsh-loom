# Deep reading: what the bodies actually say

Generated 2026-11-24 01:00 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `eval`, `benchmark`, `harness`, `verify`, `score`, `budget`, `memory`, `self-improve`, `compute`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Kimi K2.5: Visual Agentic Intelligence (`2602.02276`) | 91 | 6 | graded ok (depth full) |
| DeepSeek-V3 Technical Report (`2412.19437`) | 90 | 6 | graded ok (depth full) |
| LLaMA: Open and Efficient Foundation Language Models (`2302.13971`) | 43 | 6 | graded ok (depth full) |
| GPT-4o System Card (`2410.21276`) | 33 | 6 | graded ok (depth full) |
| 2504.01848 (`2504.01848`) | 48 | 6 | graded ok (depth full) |
| HealthBench: Evaluating Large Language Models Towards Improved Human Health (`2505.08775`) | 78 | 6 | graded ok (depth full) |
| A Survey of Self-Evolving Agents What, When, How, and Where to Evolve on the Path to Artificial Super Intelligence (`2507.21046`) | 118 | 6 | graded ok (depth full) |
| GPT-5 System Card (`2601.03267`) | 65 | 6 | graded ok (depth full) |
| Scaling Laws for Neural Language Models (`2001.08361`) | 53 | 6 | graded ok (depth full) |
| RAGEN: Understanding Self-Evolution in LLM Agents via Multi-Turn Reinforcement Learning (`2504.20073`) | 45 | 6 | graded ok (depth full) |
| Mistral 7B (`2310.06825`) | 10 | 6 | graded ok (depth full) |
| Instruction-Following Evaluation for Large Language Models (`2311.07911`) | 11 | 6 | graded ok (depth full) |
| MLS-Bench: A Holistic and Rigorous Assessment of AI Systems on Building Better AI (`2605.08678`) | 45 | 6 | graded ok (depth full) |
| AI Agents That Matter (`2407.01502`) | 33 | 6 | graded ok (depth full) |
| Gemma 2: Improving Open Language Models at a Practical Size (`2408.00118`) | 34 | 6 | graded ok (depth full) |
| Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters (`2408.03314`) | 31 | 6 | graded ok (depth full) |
| Robo Twin 2.0: A Scalable Data Generator and Benchmark with Strong Domain Randomization for Robust Bimanual Robotic Manipulation (`2506.18088`) | 42 | 6 | graded ok (depth full) |
| A Survey of LLM-based Deep Search Agents: Paradigm, Optimization, Evaluation, and Challenges (`2508.05668`) | 57 | 6 | graded ok (depth full) |

## Kimi K2.5: Visual Agentic Intelligence — `2602.02276`

- **§Reward Function** (`S4.SS4.SSS2.Px2.p1.1`)

  > We apply a rule-based outcome reward for tasks with verifiable solutions, such as reasoning and agentic tasks. To optimize resource consumption, we also incorporate a budget-control reward aimed at enhancing token efficiency. For general-purpose tasks, we employ Generative Reward Models (GRMs) that provide granular evaluations aligned with Kimi’s internal value criteria. In addition, for visual tasks, we design task-specific reward functions to provide fine-grained supervision. For visual grounding and point localization tasks, we employ an F1-based reward with soft matching: grounding tasks d…

- **§Benchmarks** (`S5.SS1.SSS1.Px1.p1.1`)

  > We evaluate Kimi K2.5 on a comprehensive benchmark suite spanning text-based reasoning, competitive and agentic coding, multimodal understanding (image and video), autonomous agentic execution, and computer use. Our benchmark taxonomy is organized along the following capability axes:

- **§Evaluation Configurations** (`S5.SS1.SSS1.Px3.p1.1`)

  > Unless otherwise specified, all Kimi K2.5 evaluations use temperature = 1.0, top-p = 0.95, and a context length of 256k tokens. Benchmarks without publicly available scores were re-evaluated under identical conditions and marked with an asterisk (*). The full evaluation settings can be found in appendix E .

- **§1 Introduction** (`S1.p8.1`)

  > Kimi K2.5 represents a unified architecture for general-purpose agentic intelligence, integrating vision and language, thinking and instant modes, chats and agents. It achieves strong performance across a broad range of agentic and frontier benchmarks, including state-of-the-art results in visual-to-code generation (image/video-to-code) and real-world software engineering in our internal evaluations, while scaling both the diversity of specialized agents and the degree of parallelism. To accelerate community progress toward General Agentic Intelligence, we open-source our post-trained checkpoi…

- **§Visual RL Improves Text Performance** (`S2.SS3.SSS0.Px2.p1.1`)

  > To investigate potential trade-offs between visual and textual performance, we evaluated text-only benchmarks before and after visual RL. Surprisingly, outcome-based visual RL produced measurable improvements in textual tasks, including MMLU-Pro (84.7% → \rightarrow 86.4%), GPQA-Diamond (84.3% → \rightarrow 86.4%), and LongBench v2 (56.7% → \rightarrow 58.9%) (Table 2 ). Analysis suggests that visual RL enhances calibration in areas requiring structured information extraction, reducing uncertainty on queries that resemble visually grounded reasoning (e.g., counting, OCR). These findings indica…

- **§Token Efficient Reinforcement Learning** (`S4.SS4.SSS2.Px4.p1.1`)

  > Token efficiency is central to LLMs with test-time scaling. While test-time scaling inherently trades computation for reasoning quality, practical gains require algorithmic innovations that actively navigate this trade-off. Our previous findings indicate that imposing a problem-dependent budget effectively constrains inference-time compute, incentivizing the model to generate more concise chain of thought reasoning patterns without unnecessary token expansion [ 30 , 53 ] . However, we also observe a length-overfitting phenomenon : models trained under rigid budget constraints often fail to gen…

## DeepSeek-V3 Technical Report — `2412.19437`

- **§5.3.3 Open-Ended Evaluation** (`S5.SS3.SSS3.p1.1`)

  > In addition to standard benchmarks, we also evaluate our models on open-ended generation tasks using LLMs as judges, with the results shown in Table 7 . Specifically, we adhere to the original configurations of AlpacaEval 2.0 ( Dubois et al., 2024 ) and Arena-Hard ( Li et al., 2024a ) , which leverage GPT-4-Turbo-1106 as judges for pairwise comparisons. On Arena-Hard, DeepSeek-V3 achieves an impressive win rate of over 86% against the baseline GPT-4-0314, performing on par with top-tier models like Claude-Sonnet-3.5-1022. This underscores the robust capabilities of DeepSeek-V3, especially in d…

- **§1 Introduction** (`S1.p2.1`)

  > With a forward-looking perspective, we consistently strive for strong model performance and economical costs. Therefore, in terms of architecture, DeepSeek-V3 still adopts Multi-head Latent Attention (MLA) ( DeepSeek-AI, 2024c ) for efficient inference and DeepSeekMoE ( Dai et al., 2024 ) for cost-effective training. These two architectures have been validated in DeepSeek-V2 ( DeepSeek-AI, 2024c ) , demonstrating their capability to maintain robust model performance while achieving efficient training and inference. Beyond the basic architecture, we implement two additional strategies to furthe…

- **§1 Introduction** (`S1.p5.1`)

  > We evaluate DeepSeek-V3 on a comprehensive array of benchmarks. Despite its economical training costs, comprehensive evaluations reveal that DeepSeek-V3-Base has emerged as the strongest open-source base model currently available, especially in code and math. Its chat version also outperforms other open-source models and achieves performance comparable to leading closed-source models, including GPT-4o and Claude-3.5-Sonnet, on a series of standard and open-ended benchmarks.

- **§1 Introduction** (`S1.p11.1`)

  > In the remainder of this paper, we first present a detailed exposition of our DeepSeek-V3 model architecture (Section 2 ). Subsequently, we introduce our infrastructures, encompassing our compute clusters, the training framework, the support for FP8 training, the inference deployment strategy, and our suggestions on future hardware design. Next, we describe our pre-training process, including the construction of training data, hyper-parameter settings, long-context extension techniques, the associated evaluations, as well as some discussions (Section 4 ). Thereafter, we discuss our efforts on…

- **§2 Architecture** (`S2.p1.1`)

  > We first introduce the basic architecture of DeepSeek-V3, featured by Multi-head Latent Attention (MLA) ( DeepSeek-AI, 2024c ) for efficient inference and DeepSeekMoE ( Dai et al., 2024 ) for economical training. Then, we present a Multi-Token Prediction (MTP) training objective, which we have observed to enhance the overall performance on evaluation benchmarks. For other minor details not explicitly mentioned, DeepSeek-V3 adheres to the settings of DeepSeek-V2 ( DeepSeek-AI, 2024c ) .

- **§Basic Architecture of DeepSeekMoE.** (`S2.SS1.SSS2.Px1.p1.2`)

  > where N s N_{s} and N r N_{r} denote the numbers of shared experts and routed experts, respectively; FFN i ( s ) ⁡ ( ⋅ ) \operatorname{FFN}^{(s)}_{i}(\cdot) and FFN i ( r ) ⁡ ( ⋅ ) \operatorname{FFN}^{(r)}_{i}(\cdot) denote the i i -th shared expert and the i i -th routed expert, respectively; K r K_{r} denotes the number of activated routed experts; g i , t g_{i,t} is the gating value for the i i -th expert; s i , t s_{i,t} is the token-to-expert affinity; 𝐞 i \mathbf{e}_{i} is the centroid vector of the i i -th routed expert; and Topk ⁡ ( ⋅ , K ) \operatorname{Topk}(\cdot,K) denotes the set…

## LLaMA: Open and Efficient Foundation Language Models — `2302.13971`

- **§3.5 Code generation** (`S3.SS5.p1.1`)

  > We evaluate the ability of our models to write code from a natural language description on two benchmarks: HumanEval Chen et al. (2021) and MBPP Austin et al. (2021) . For both tasks, the model receives a description of the program in a few sentences, as well as a few input-output examples. In HumanEval, it also receives a function signature, and the prompt is formatted as natural code with the textual description and tests in a docstring. The model needs to generate a Python program that fits the description and satisfies the test cases. In Table 8 , we compare the pass@1 scores of our models…

- **§5.1 RealToxicityPrompts** (`S5.SS1.p1.1`)

  > Language models can generate toxic language, e.g., insults, hate speech or threats. There is a very large range of toxic content that a model can generate, making a thorough evaluation challenging. Several recent work Zhang et al. (2022) ; Hoffmann et al. (2022) have considered the RealToxicityPrompts benchmark Gehman et al. (2020) as an indicator of how toxic is their model. RealToxicityPrompts consists of about 100 100 k prompts that the model must complete; then a toxicity score is automatically evaluated by making a request to PerspectiveAPI 3 3 3 https://perspectiveapi.com/ . We do not ha…

- **§1 Introduction** (`S1.p1.1`)

  > Large Languages Models (LLMs) trained on massive corpora of texts have shown their ability to perform new tasks from textual instructions or from a few examples Brown et al. (2020) . These few-shot properties first appeared when scaling models to a sufficient size Kaplan et al. (2020) , resulting in a line of work that focuses on further scaling these models Chowdhery et al. (2022) ; Rae et al. (2021) . These efforts are based on the assumption that more parameters will lead to better performance. However, recent work from Hoffmann et al. (2022) shows that, for a given compute budget, the best…

- **§1 Introduction** (`S1.p2.1`)

  > The objective of the scaling laws from Hoffmann et al. (2022) is to determine how to best scale the dataset and model sizes for a particular training compute budget. However, this objective disregards the inference budget, which becomes critical when serving a language model at scale. In this context, given a target level of performance, the preferred model is not the fastest to train but the fastest at inference, and although it may be cheaper to train a large model to reach a certain level of performance, a smaller one trained longer will ultimately be cheaper at inference. For instance, alt…

- **§1 Introduction** (`S1.p3.1`)

  > The focus of this work is to train a series of language models that achieve the best possible performance at various inference budgets, by training on more tokens than what is typically used. The resulting models, called LLaMA , ranges from 7B to 65B parameters with competitive performance compared to the best existing LLMs. For instance, LLaMA-13B outperforms GPT-3 on most benchmarks, despite being 10 × \times smaller. We believe that this model will help democratize the access and study of LLMs, since it can be run on a single GPU. At the higher-end of the scale, our 65B-parameter model is a…

- **§Stack Exchange [2%].** (`S2.SS1.SSS0.Px7.p1.1`)

  > We include a dump of Stack Exchange, a website of high quality questions and answers that covers a diverse set of domains, ranging from computer science to chemistry. We kept the data from the 28 largest websites, removed the HTML tags from text and sorted the answers by score (from highest to lowest).

## GPT-4o System Card — `2410.21276`

- **§3.3.3 Disparate performance on voice inputs** (`S3.SS3.SSS3.p5.1`)

  > Capabilities: We evaluate 6 6 6 Evaluations in this section were run on a fixed, randomly sampled subset of examples, and these scores should not be compared with publicly reported benchmarks on the same task. on four tasks: TriviaQA, a subset of MMLU 7 7 7 Anatomy, Astronomy, Clinical Knowledge, College Biology, Computer Security, Global Facts, High School Biology, Sociology, Virology, College Physics, High School European History and World Religions. Following the issues described in Evaluation Methodology 3.2 , we exclude tasks with heavily mathematical or scientific notation. , HellaSwag a…

- **§3.2 Evaluation methodology** (`S3.SS2.p2.1`)

  > We used Voice Engine to convert text inputs to audio, feed it to the GPT-4o, and score the outputs by the model. We always score only the textual content of the model output, except in cases where the audio needs to be evaluated directly, such as in evaluations for voice cloning (see Section 3.3.1 ).

- **§3.4 Preparedness Framework Evaluations** (`S3.SS4.p1.1`)

  > We evaluated GPT-4o in accordance with our Preparedness Framework [ 4 ] . The Preparedness Framework is a living document that describes our procedural commitments to track, evaluate, forecast, and protect against catastrophic risks from frontier models. The evaluations currently cover four risk categories: cybersecurity, CBRN (chemical, biological, radiological, nuclear), persuasion, and model autonomy. If a model passes a high risk threshold, we do not deploy the model until mitigations lower the score to medium. We below detail the evaluations conducted on GPT-4o’s text capabilities; persua…

- **§3.4 Preparedness Framework Evaluations** (`S3.SS4.p2.1`)

  > After reviewing the results from the Preparedness evaluations, the Safety Advisory Group recommended classifying GPT-4o before mitigations as borderline medium risk for persuasion, and low risk in all others. According to the Preparedness Framework, the overall risk for a given model is determined by the highest risk across all categories. Therefore, the overall risk score for GPT-4o is classified as medium.

- **§3.6 Biological threats** (`S3.SS6.p2.1`)

  > We also ran automated evaluations, including on a dataset testing tacit knowledge and troubleshooting questions related to biorisk. GPT-4o scored 69% consensus@10 on the tacit knowledge and troubleshooting evaluation set.

- **§3.8 Model autonomy** (`S3.SS8.p1.1`)

  > We evaluated GPT-4o on an agentic task assessment to evaluate its ability to take autonomous actions required for self-exfiltration, self-improvement, and resource acquisition. These tasks included:

## 2504.01848 — `2504.01848`

- **§2.6 PaperBench Code-Dev** (`S2.SS6.p1.1`)

  > Running a full evaluation on PaperBench is expensive in terms of agent model inference as well as the compute environment provided to agents. For broader accessibility, we release a simplified version of PaperBench, which we call PaperBench Code-Dev. PaperBench Code-Dev reduces the evaluation task to only code development , skipping the focus on executing the code to verify that results are reproduced. During evaluation, we skip the reproduction step and the judge only grades “Code Development” nodes in the rubrics.

- **§1 Introduction** (`S1.p1.1`)

  > We introduce PaperBench, a benchmark evaluating the ability of AI agents to replicate state-of-the-art AI research. AI agents that can autonomously replicate ML research papers could accelerate machine learning progress, a prospect that is exciting but also warrants careful study to ensure AI capabilities are developed safely. PaperBench can be used as a measure of model autonomy in OpenAI’s Preparedness Framework ( OpenAI, 2023 ) , autonomous capabilities in Anthropic’s Responsible Scaling Policy ( Anthropic, 2024 ) , and ML R&D in Google DeepMind’s Frontier Safety Framework ( Google DeepMind…

- **§1 Introduction** (`S1.p4.1`)

  > Given the complexity of ML research papers, we found that even grading a single replication attempt can take tens of hours for a human expert. To streamline the grading process, we explore LLM-based judges and introduce an auxiliary evaluation, JudgeEval, which compares the outputs of automated judges against a dataset of gold labels from human expert judges. Our best LLM-based judge, which uses o3-mini-high with custom scaffolding, achieves an F1 score of 0.83 on the auxiliary evaluation, suggesting that this judge is a reasonable stand-in for a human judge.

- **§1 Introduction** (`S1.p5.1`)

  > We find that agents exhibit non-trivial capabilities in replicating ML research papers. Anthropic’s Claude 3.5 Sonnet (New) with a simple agentic scaffold achieves a score of 21.0% on PaperBench. On a 3-paper subset, our human baseline of ML PhDs (best of 3 attempts) achieved 41.4% after 48 hours of effort, compared to 26.6% achieved by o1 on the same subset. We further release a variant of PaperBench called PaperBench Code-Dev for more lightweight evaluation. On this variant, o1 achieves a score of 43.4%.

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > PaperBench Code-Dev: a more lightweight variant of the benchmark which relaxes some requirements of PaperBench to make setup and evaluation more accessible to the broader community.

- **§2.3 Grading** (`S2.SS3.p2.1`)

  > A rubric is organized as a tree of requirements, with each leaf node specifying a single clear criterion to pass or fail (see Figure 2 ), and where each node has been manually weighted for its importance relative to its siblings. We explain the design of rubrics in Section 3.1 . Given a leaf criterion, the judge evaluates whether the submission meets its requirements, assigning a binary score of 1 if yes and 0 otherwise.

## HealthBench: Evaluating Large Language Models Towards Improved Human Health — `2505.08775`

- **§Macro F ​ 1 F1 score** (`S8.SS1.SSS0.Px1.p2.1`)

  > In our setup, we treat grading as binary classification (met/not-met). To evaluate a model, we compare individual predictions of physicians and model-based graders for each meta-example. We compute F ​ 1 F1 scores for both the positive class (met) and the negative class (not-met), and then take the unweighted average of the two. This ensures balanced sensitivity to both false positives and false negatives.

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > Meaningful : Do scores reflect real-world impact? Many existing evaluations rely on multiple-choice exams or narrow clinical questions, making them poorly aligned with the open-ended, dynamic nature of real situations and workflows for healthcare professionals and individual users.

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > Trustworthy : Are scores faithful indicators of physician judgment? Many existing evaluations lack validation against expert medical opinions.

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > Unsaturated : Do benchmarks still have headroom to support progress? Many existing evaluations offer no room for improvement, failing to incentivize model developers to improve performance.

- **§1 Introduction** (`S1.p5.1`)

  > HealthBench is a rubric evaluation . To grade open-ended model responses, we score them against a conversation-specific physician-written rubric, 2 2 2 An “example” in this paper refers to an individual conversation between an LLM and a layperson or a healthcare professional. composed of self-contained, objective criteria. Criteria capture attributes that a response should be rewarded or penalized for in the context of that conversation (e.g., specific facts that should be included, aspects of clear communication, common misconceptions about a topic) and their relative importance. HealthBench…

- **§1 Introduction** (`S1.p6.1`)

  > In addition to a single-number overall score, HealthBench also provides targeted measurement of health behavior. Model performance can be stratified by both themes , which are high-level categories of health-related tasks that reflect distinct challenges in real-world health interactions (e.g., emergency referrals, global health, or seeking context), and axes , which define the specific behavioral dimensions that each rubric criterion evaluates, such as clinical accuracy, communication quality, and context awareness. This helps diagnose the specific behaviors of different AI models and indicat…

## A Survey of Self-Evolving Agents What, When, How, and Where to Evolve on the Path to Artificial Super Intelligence — `2507.21046`

- **§Coverage Gaps** (`S7.SS1.SSS4.Px2.p1.1`)

  > Efficiency suffers from sparse and inconsistent reporting of evolution costs. While benchmark papers occasionally document aggregate resource consumption during evaluation ( Chan et al., 2024 ) , they rarely decompose costs into evolution-specific components: tokens consumed during self-reflection or experience replay, wall-clock time spent on architecture search or memory updates, tool invocations triggered by autonomous exploration. Cost constraints in human baseline collection ( Xu et al., 2024b ) reflect broader accessibility challenges but do not illuminate the efficiency of the evolution…

- **§7.2.3 Long-Horizon Lifelong Learning Ability Assessment** (`S7.SS2.SSS3.p2.1`)

  > Currently, there are few benchmarks of this type. LTMBenchmark ( Castillo-Bolado et al., 2024 ) is a specialized benchmark focusing on long-term memory (LTM) evaluation. It assesses LLM agents’ memory retention and continual learning through dynamic conversational tests, using interleaved dialogues with controlled distractions to simulate real-world recall challenges. Key metrics include task accuracy, memory-span-weighted LTM Score, and efficiency measures (tests/hour, cost) for cross-architecture comparison. LifelongAgentBench ( Zheng et al., 2025b ) is another pioneering benchmark specifica…

- **§7.3.2 Challenges for Fair Comparison** (`S7.SS3.SSS2.p1.1`)

  > To supplement our discussion of evaluation benchmarks, we provide Table 11 , which aligns a representative subset of self-evolving agents evaluated under partially matched conditions, i.e., similar domains, benchmarks, and backbone models. This table aims to make explicit how different methods instantiate the what/when/how dimensions when the surrounding experimental context is held as constant as the literature allows. However, as the table also makes clear, true apples-to-apples comparison remains infeasible at present. Existing works differ substantially in (1) reporting practices: key metr…

- **§1 Introduction** (`S1.p4.1`)

  > To the best of our knowledge, this is the first systematic and comprehensive survey focusing on self-evolving agents, offering a clear roadmap for both theoretical inquiry and practical deployment. However, given that this represents a rapidly forming research area where conceptual boundaries are still being actively negotiated within the community, we frame this survey as a guiding synthesis rather than a review of a fully established paradigm. Instead of enforcing rigid boundaries, we aim to structure the heterogeneous mechanisms emerging in the community into a coherent framework. We organi…

- **§Scalable Management and Selection** (`S3.SS3.SSS0.Px3.p1.1`)

  > As an agent’s mastered skill library grows into the hundreds or thousands, it faces a "curse of abundance." The challenge shifts from creating tools to efficiently managing and selecting from them. A large library creates a massive search space, making traditional retrieval methods slow and inaccurate. To overcome this, ToolGen ( Wang et al., 2025j ) represents a fundamental paradigm shift by encoding tools as unique tokens within the language model’s vocabulary. This elegantly reframes tool retrieval as a generation problem, leveraging the transformer’s immense pattern-recognition capabilitie…

- **§Textual Feedback** (`S5.SS1.SSS0.Px1.p1.1`)

  > Textual Feedback leverages the native modality of LLMs—natural language—to provide detailed, interpretable instructions for refinement. Unlike scalar rewards, textual feedback encapsulates nuanced critiques and actionable suggestions. Recent frameworks such as Reflexion ( Shinn et al., 2023 ) , AdaPlanner ( Sun et al., 2023 ) , AgentS2 ( Agashe et al., 2025 ) , SELF ( Lu et al., 2023 ) , Self-Refine ( Madaan et al., 2023a ) , SCoRe ( Kumar et al., 2024 ) , PAG ( Jiang et al., 2025b ) , and TextGrad ( Yellamraju and others, 2024 ) exemplify this direction. For instance, Reflexion proposes “verb…

## GPT-5 System Card — `2601.03267`

- **§3.2 Disallowed Content** (`S3.SS2.p5.1`)

  > Note that the production benchmark set is designed specifically to be more challenging, to provide useful signal; scores are therefore expected to be lower than the standard evaluation.

- **§3.3.1 Looking ahead** (`S3.SS3.SSS1.p1.1`)

  > We have post-trained the GPT-5 models to be less sycophantic, and we are actively researching related areas of concern, such as situations that may involve emotional dependency or other forms of mental or emotional distress. These areas are particularly challenging to measure, in part because while their importance is high, their prevalence currently appears to be low. We are engaging human-computer-interaction (HCI) researchers and clinicians to give feedback on our definitions for concerning interactions, and on our evaluation methods. We are working to mature our evaluations in order to set…

- **§3.7 Hallucinations** (`S3.SS7.p3.1`)

  > We especially focused on reducing the models’ tendency to hallucinate when reasoning about complex, open-ended, fact-seeking prompts. Accordingly, we added new evaluations to test open-ended factuality on open-source prompts. We take prompts from two public factuality benchmarks: LongFact and FActScore . LongFact consists of LLM-generated questions asking for detailed responses about either specific objects (e.g., people or places) or broad concepts, while FActScore consists of questions seeking biographies on notable individuals. Then, to measure the factual correctness of responses, we emplo…

- **§6.1.3.3 MLE-Bench** (`S6.SS1.SSS3.P3.p2.1`)

  > The full dataset consists of 75 hand-curated Kaggle competitions, worth $1.9m in prize value. Measuring progress towards model self-improvement is key to evaluating autonomous agents’ full potential. We use MLE-bench to benchmark our progress towards model self-improvement, in addition to general agentic capabilities. The subset plotted below is 30 of the most interesting and diverse competitions chosen from the subset of tasks that are <50GB and <10h.

- **§1 Introduction** (`S1.p4.1`)

  > This system card focuses primarily on gpt-5-thinking and gpt-5-main, while evaluations for other models are available in the appendix. The GPT-5 system not only outperforms previous models on benchmarks and answers questions more quickly, but—more importantly—is more useful for real-world queries. We’ve made significant advances in reducing hallucinations, improving instruction following, and minimizing sycophancy, and have leveled up GPT-5’s performance in three of ChatGPT’s most common uses: writing, coding, and health. All of the GPT-5 models additionally feature safe-completions, our lates…

- **§3 Observed Safety Challenges and Evaluations** (`S3.p1.1`)

  > In the evaluations below, we find it helpful to compare the new GPT-5 model to its predecessor to understand the progression of safety. This means we compare gpt-5-thinking to OpenAI o3, and gpt-5-main to GPT-4o. Since gpt-5-thinking-pro is gpt-5-thinking using a setting that makes use of parallel test time compute, we have determined that the results from our safety evaluations on gpt-5-thinking are strong proxies, and therefore we did not rerun these evaluations in the parallel test time compute setting.

## Scaling Laws for Neural Language Models — `2001.08361`

- **§1 Introduction** (`S1.p3.1`)

  > Throughout we will observe precise power-law scalings for performance as a function of training time, context length, dataset size, model size, and compute budget.

- **§Convergence is inefficient:** (`S1.SS1.SSS0.Px7.p1.1`)

  > When working within a fixed compute budget C C but without any other restrictions on the model size N N or available data D D , we attain optimal performance by training very large models and stopping significantly short of convergence (see Figure 3 ). Maximally compute-efficient training would therefore be far more sample efficient than one might expect based on training small models to convergence, with data requirements growing very slowly as D ∼ C 0.27 D\sim C^{0.27} with training compute. (Section 6 )

- **§1.2 Summary of Scaling Laws** (`S1.SS2.p1.1`)

  > The test loss of a Transformer trained to autoregressively model language can be predicted using a power-law when performance is limited by only either the number of non-embedding parameters N N , the dataset size D D , or the optimally allocated compute budget C min C_{\rm min} (see Figure 1 ):

- **§1.2 Summary of Scaling Laws** (`S1.SS2.p6.1`)

  > When training within a fixed compute budget C C , but with no other constraints, Equation ( 1.6 ) leads to the prediction that the optimal model size N N , optimal batch size B B , optimal number of steps S S , and dataset size D D should grow as

- **§1.2 Summary of Scaling Laws** (`S1.SS2.p6.3`)

  > which closely matches the empirically optimal results N ∝ C min 0.73 N\propto C_{\rm min}^{0.73} , B ∝ C min 0.24 B\propto C_{\rm min}^{0.24} , and S ∝ C min 0.03 S\propto C_{\rm min}^{0.03} . As the computational budget C C increases, it should be spent primarily on larger models, without dramatic increases in training time or dataset size (see Figure 3 ). This also implies that as models grow larger, they become increasingly sample efficient. In practice, researchers typically train smaller models for longer than would be maximally compute-efficient because of hardware constraints. Optimal p…

- **§5.3 Lower Bound on Early Stopping Step** (`S5.SS3.p1.2`)

  > where L ⁡ ( N , ∞ ) L(N,\infty) is the converged loss, evaluated with infinite available data. This inequality and its comparison to the empirical data is displayed in Figure 16 in the appendix. In that figure, the values of S stop S_{\rm stop} and L ⁡ ( N , D ) L(N,D) are empirical (though S stop S_{\rm stop} is adjusted to mimic training at B ≫ B crit B\gg B_{\rm crit} ), while L ⁡ ( N , ∞ ) L(N,\infty) is computed from the fit to L ⁡ ( N , D ) L(N,D) evaluated at D = ∞ D=\infty .

## RAGEN: Understanding Self-Evolution in LLM Agents via Multi-Turn Reinforcement Learning — `2504.20073`

- **§1 Introduction** (`S1.p1.1`)

  > Training large language models (LLMs) to function as autonomous agents in interactive environments presents unique challenges. Unlike static tasks such as single-turn math problem solving ( Shao et al., 2024a ) or coding ( DeepSeek-AI et al., 2024 ) , agent settings require models to make sequential decisions, maintain memory across turns, and adapt to stochastic feedback from their environment. These settings—central to planning assistants, robotics, and tutoring agents—demand that models not only perform well, but also self-improve through experience.

- **§3.3 Evaluation Metrics** (`S3.SS3.p1.1`)

  > We evaluate on 256 fixed prompts per environment with temperature T = 0.5 T{=}0.5 , truncating episodes after 5 turns. Metrics include: (i) success rate (task completion), (ii) rollout entropy (exploration), (iii) in-group reward variability (behavioral diversity), (iv) response length (reasoning verbosity), and (v) gradient norm (training stability). All are computed over validation instances. More details can be found in Appendix C.3 .

- **§5 Related Work** (`S5.p2.1`)

  > On the agent side , systems have evolved from early reactive planning ( Yao et al., 2022b ; Xu et al., 2023 ) to modularized decision pipelines ( Liu et al., 2023 ; Wu et al., 2023 ) , multi-agent cooperation ( Li et al., 2023 ; Wang et al., 2024a ) , and embodied interaction ( Lin et al., 2024b ; Li et al., 2025 ) . Benchmarks like Sokoban ( Junghanns and Schaeffer, 2001 ) , FrozenLake ( Dell’Aversana, 2021 ) , and WebShop ( Yao et al., 2022a ) provide controlled testbeds for evaluating reasoning under different dynamics. Our work builds on these advances, aiming to unify RL-based reasoning w…

- **§1 Introduction** (`S1.p3.1`)

  > We explore this question through a systematic study of agent learning under a general RL framework StarPO ( S tate- T hinking- A ctions- R eward P olicy O ptimization). StarPO provides a unified view of multi-turn, trajectory-level agent training with flexible control over reasoning, reward assignment, and prompt-rollout structure. Built on top of StarPO, we develop RAGEN , a modular agent training and evaluation system designed to support the study of RL-based training in LLM Agents. RAGEN implements the full training loop—including rollout generation, reward assignment, and trajectory optimi…

- **§1 Introduction** (`S1.p4.1`)

  > Training LLM agents on real-world tasks like web browsing often depends on pretrained priors and heavy task-specific engineering. We evaluate RAGEN on four environments spanning different complexities: Bandit (single-turn, stochastic), Sokoban (multi-turn, deterministic), Frozen Lake (multi-turn, stochastic), and WebShop (multi-turn, open-domain). The first three symbolic environments are minimalistic and fully controllable , while WebShop adds real-world understanding and reasoning . Together, they enable analysis of generalization across varied decision-making challenges.

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > Emerging Agent Reasoning Requires Meticulous Reward Signal. We find that simply encouraging reasoning in the action format does not guarantee reasoning behavior. Even when models are prompted to reason (e.g., with ‘ <think> ’ tokens) with trajectory-level optimization via StarPO, they often regress to direct action selection if reasoning offers no distinct reward advantage. We assume this is due to the simple action spaces in MDP where shallow strategies suffice. Moreover, when rewards only reflect task success, models produce hallucinated reasoning , revealing a mismatch between thoughts and…

## Mistral 7B — `2310.06825`

- **§3 Results** (`S3.p4.1`)

  > Size and Efficiency. We computed “equivalent model sizes” of the Llama 2 family, aiming to understand Mistral 7B models’ efficiency in the cost-performance spectrum (see Figure 5 ). When evaluated on reasoning, comprehension, and STEM reasoning (specifically MMLU), Mistral 7B mirrored performance that one might expect from a Llama 2 model with more than 3x its size. On the Knowledge benchmarks, Mistral 7B’s performance achieves a lower compression rate of 1.9x, which is likely due to its limited parameter count that restricts the amount of knowledge it can store.

- **§3 Results** (`S3.p1.1`)

  > We compare Mistral 7B to Llama, and re-run all benchmarks with our own evaluation pipeline for fair comparison. We measure performance on a wide variety of tasks categorized as follow:

- **§3 Results** (`S3.p5.1`)

  > Evaluation Differences. On some benchmarks, there are some differences between our evaluation protocol and the one reported in the Llama 2 paper: 1) on MBPP, we use the hand-verified subset 2) on TriviaQA, we do not provide Wikipedia contexts.

- **§1 Introduction** (`S1.p1.1`)

  > In the rapidly evolving domain of Natural Language Processing (NLP), the race towards higher model performance often necessitates an escalation in model size. However, this scaling tends to increase computational costs and inference latency, thereby raising barriers to deployment in practical, real-world scenarios. In this context, the search for balanced models delivering both high-level performance and efficiency becomes critically essential. Our model, Mistral 7B, demonstrates that a carefully designed language model can deliver high performance while maintaining an efficient inference. Mis…

- **§1 Introduction** (`S1.p2.1`)

  > Mistral 7B leverages grouped-query attention (GQA) [ 1 ] , and sliding window attention (SWA) [ 6 , 3 ] . GQA significantly accelerates the inference speed, and also reduces the memory requirement during decoding, allowing for higher batch sizes hence higher throughput, a crucial factor for real-time applications. In addition, SWA is designed to handle longer sequences more effectively at a reduced computational cost, thereby alleviating a common limitation in LLMs. These attention mechanisms collectively contribute to the enhanced performance and efficiency of Mistral 7B.

- **§2 Architectural details** (`S2.p3.1`)

  > Rolling Buffer Cache. A fixed attention span means that we can limit our cache size using a rolling buffer cache. The cache has a fixed size of W W , and the keys and values for the timestep i i are stored in position i mod W i\bmod W of the cache. As a result, when the position i i is larger than W W , past values in the cache are overwritten, and the size of the cache stops increasing. We provide an illustration in Figure 2 for W = 3 W=3 . On a sequence length of 32k tokens, this reduces the cache memory usage by 8x, without impacting the model quality.

## Instruction-Following Evaluation for Large Language Models — `2311.07911`

- **§1 Introduction** (`S1.p7.1`)

  > In summary, we propose IFEval: Instruction-Following Eval, a benchmark to evaluate the instruction following ability of LLMs using a set of prompts containing verifiable instructions. These verifiable instructions are atomic instructions for which one can use a simple, interpretable, and deterministic program to verify if corresponding responses follow the instructions or not. We report evaluation results of multiple models, and release our code and prompts used for evaluation in https://github.com/google-research/google-research/tree/master/instruction_following_eval

- **§2.2 IFEval metrics** (`S2.SS2.p2.1`)

  > Even though we can verify if an instruction is followed using simple heuristics and programming, we found that there are still false negatives. For example, for a given verifiable instruction of “end your email with: P.S. I do like the cake”, a language model may follow the instruction by ending the email with “P.S. **I do like the cake**” which has markdown tags (** indicates the bold text). If we simply check the string match of “P.S. I do like the cake”, we will miss-classify it as not-followed. To alleviate this false negative problem, we compute a loose accuracy score of instruction follo…

- **§3 Evaluation results** (`S3.p1.1`)

  > We evaluated GPT-4 ( Brown et al., 2020 ; OpenAI, 2023 ) and PaLM 2 Small (S) ( Anil et al., 2023 ) . We scrapped GPT-4 and PaLM 2 S responses in November and August of 2023, respectively, through API calls. For evaluating each model, we compute four accuracy scores:

- **§1 Introduction** (`S1.p3.1`)

  > Existing evaluating methods in the literature can be categorized into three main types, each with their own drawbacks: 1. Human evaluation ( Ouyang et al., 2022 ; Zheng et al., 2023 ; Taori et al., 2023 ) is time consuming, expensive and relies on a set of human annotators, leading to potential biases and inconsistencies for reproducibility. 2. Model-based evaluation ( Chang et al., 2023 ; Liu et al., 2023 ; Peng et al., 2023 ; Naismith et al., 2023 ; Skopek et al., 2023 ; Wu et al., 2023 ; Chiang & Lee, 2023 ; Fu et al., 2023 ) involves using an internal or external model to assess the perfor…

- **§1 Introduction** (`S1.p1.1`)

  > Large Language Models (LLMs) are the backbones of many state-of-the-art researches and applications ( Brown et al., 2020 ; Chowdhery et al., 2022 ; Anil et al., 2023 ; OpenAI, 2023 ; Touvron et al., 2023 ) . One key capability of LLMs is to follow input natural language instructions, also known as zero-shot prompts ( Zhong et al., 2021 ; Mishra et al., 2022 ; Wei et al., 2022 ; Victor et al., 2022 ) . The capability of LLMs to accurately interpret and follow natural language instructions is crucial, not only for the precision of tasks but also for the safety and reliability of their implementa…

- **§1 Introduction** (`S1.p2.1`)

  > However, evaluating the instruction following ability of LLMs is a complex and challenging task. This is particularly because human languages are inherently subjective and ambiguous. The same text can be interpreted differently, leading to varying judgments when evaluating whether a model has followed instructions. For example, when judging if LLM’s responses follow given instructions such as “write with a funny tone” and “generate detailed reasoning processes but do not over-explain”, the underlying standard is greatly unclear.

## MLS-Bench: A Holistic and Rigorous Assessment of AI Systems on Building Better AI — `2605.08678`

- **§Task structure.** (`S3.SS1.SSS0.Px3.p1.1`)

  > A task specifies a research problem in executable form. It is defined by (i) a research question that describes the research problem, its background and target; (ii) underlying codebase with designated editable scopes that constrain the regions the agents are able to edit; (iii) at least 3 strong human baselines including the SOTA ones that we can reproduce; (iv) at least 3 evaluation settings that probe generalization across benchmarks, environments, or base-model scales; (v) a seeds policy that requires multi-seed evaluation for tasks whose scores carry non-negligible variance; (vi) a score…

- **§Validity controls.** (`S4.SS3.SSS0.Px2.p1.1`)

  > We evaluate the capacity-budget control on computer vision and reinforcement learning tasks, where agents can adjust the model size. While removing the budget constraint does not consistently improve overall average performance, it opens a recurring shortcut: agents can increase the submitted model’s capacity to obtain higher scores rather than improve the method itself. As illustrated by the specific cases in Figure 5 (middle), some over-capacity submissions surpass human SOTA. Our budget check rejects such submissions, forcing gains to come from method design rather than model-size increases…

- **§Automated scientific discovery.** (`S2.SS0.SSS0.Px1.p1.1`)

  > Computational methods have contributed to scientific discovery across diverse domains [ 98 , 48 , 4 , 36 , 80 , 42 , 106 , 91 , 21 , 62 ] , including computer science itself, spanning algorithms and systems [ 64 , 17 , 61 ] , and especially machine learning—including model architectures [ 121 , 54 ] , training procedures [ 1 , 26 , 37 ] , and data and loss design [ 23 , 28 ] . More recently, LLMs have accelerated automated discovery across a broad spectrum: serving as collaborative scientific partners [ 29 , 83 ] , optimizing specific algorithms and computational components [ 68 , 80 , 71 ] ,…

- **§3 MLS-Bench** (`S3.p1.1`)

  > MLS-Bench evaluates whether AI systems can produce genuine, transferable algorithmic innovations. The benchmark is guided by the following principles: (1) Holistic : the benchmark covers the major areas the ML community actively pursues and their core research tasks. (2) Atomic : each task targets a single research question recognized by its research community as a coherent method-level contribution. (3) Challenging : every task includes strong human baselines recognized by the relevant community, including SOTA methods that we can reproduce. (4) Generalizable : solutions are evaluated across…

- **§Infrastructure.** (`S3.SS1.SSS0.Px4.p1.1`)

  > To ensure stable reproduction across diverse environments, the evaluation framework is built on a unified backend that supports multiple runtimes, including Apptainer, Docker, Conda, and Harbor [ 31 ] . At the start of each run, the agent receives the task description, action and test budgets, task-relevant codebase files, and complete baseline implementations. Agents interact through four tools: edit modifies allowed code, test runs our harness and returns training and visible-test metrics, submit selects a previous test result as final, and undo reverts edits. See Appendix for the full syste…

- **§3.2 Evaluation Rigor** (`S3.SS2.p1.1`)

  > We use three strategies to ensure that MLS-Bench reflects genuine method invention rather than confounders: (1) we constrain the agent’s search to the algorithmic component under study while keeping the editable scope expressive enough to admit legitimate new methods (Section 3.2.1 ); (2) we select evaluation scales that preserve scalability evidence under a feasible compute budget (Section 3.2.2 ); and (3) we guard against contamination and plagiarism (Section 3.2.3 ).

## AI Agents That Matter — `2407.01502`

- **§2.1 Maximizing accuracy can lead to unbounded cost** (`S2.SS1.p2.1`)

  > When the agent environment has easy signals to check if an answer is correct, repeatedly retrying can lead to even more compelling performance gains [ 51 ] . Li et al. [27] showed that the accuracy of AlphaCode increases from close to 0% zero-shot to over 15% with 1,000 retries and over 30% with a million retries (accuracy is measured by how often one of the top 10 answers generated by the model is correct). Thus, there is seemingly no limit to the amount of inference compute that can increase accuracy, and increasing the generation budget has been shown to improve performance in various appli…

- **§4 Model and downstream developers have distinct benchmarking needs** (`S4.p2.1`)

  > Model evaluation is a scientific question of interest to researchers. Here, it makes sense to stay away from dollar costs, because reporting costs breaks many properties of benchmarks that we take for granted: measurements don’t change over time (whereas costs tend to come down) and different models compete on a level playing field (whereas some developers may benefit from economies of scale, leading to lower inference costs). Because of this, researchers usually pick a different axis for the Pareto curve, such as parameter count or the amount of compute used to train a model.

- **§6 Inadequate benchmark standardization leads to irreproducible agent evaluations** (`S6.I1.i3.p1.1`)

  > The high cost of evaluating agents makes it is hard to estimate confidence intervals. Agents might call the underlying language models hundreds (or thousands) of times. This means that evaluating agents can be extremely expensive. For example, SWE-bench [ 21 ] consists of over 2,000 programming tasks. The authors of SWE-Agent [ 59 ] set a cost limit of USD 4 per task. Evaluating SWE-Agent on the entire benchmark could cost over USD 8,000 for a single evaluation run . The high cost makes it infeasible to run evaluations multiple times, and perhaps as a result, agent evaluations are rarely accom…

- **§6 Inadequate benchmark standardization leads to irreproducible agent evaluations** (`S6.p4.1`)

  > The need for a standardized evaluation framework. These shortcomings stem from three distinct (but related) reasons. First, as of yet, there are no clear standards for providing agent evaluation scripts (shortcoming 1). As a result, the differences between model and agent benchmarks are not appreciated (shortcomings 1-3). Finally, due to the lack of community norms on evaluation, there is scope for bugs to creep in during agent development and evaluation (shortcoming 5). We include examples and more details on each in Table A6 . Shortcomings with standardization have also been observed for LLM…

- **§1 Introduction** (`S1.p1.1`)

  > Compound AI systems, or AI agents, are becoming an important research direction. Zaharia et al. [63] argue that “compound AI systems will likely be the best way to maximize AI results in the future, and might be one of the most impactful trends in AI in 2024.” Over a dozen agent benchmarks have been released, spanning domains such as web interaction [ 66 ] , programming [ 21 ] and tool use [ 39 ] . Many benchmarks developed for LLM evaluation have also been used for agent evaluation.

- **§1 Introduction** (`S1.p2.1`)

  > Agent evaluation differs from language model evaluation in fundamental ways. Agents can be used on tasks that are harder, more realistic, have more real-world utility, and usually don’t have a single correct answer. For example, agents can use the command line to carry out tasks; SWE-Agent even includes its own agent-computer interface [ 59 ] . Agents can cost much more than a single model call. For example, the authors of SWE-Agent capped each run of the agent at $4 USD, which translates to hundreds of thousands of language model tokens.

## Gemma 2: Improving Open Language Models at a Practical Size — `2408.00118`

- **§6 Evaluation** (`S6.p1.1`)

  > In this section, we evaluate both pre-trained and IT models over a series of automated benchmarks and human evaluations across a variety of domains. We also report performance from models of similar sizes that have permissive licenses, or as reported by others. Note that we consider total parameters, not active parameters, since total memory usage is often what limits the use of open models on standard devices.

- **§1 Introduction** (`S1.p6.1`)

  > Overall, Gemma 2 significantly advances state-of-the-art performance relative to comparable-scale open models and are even competitive with some models more than twice their size ( xAI, 2024 ; AI@Meta, 2024 ; Jiang et al., 2023 ; Almazrouei et al., 2023 ) , across a variety of automated benchmarks and human evaluations. Example domains include question answering ( Clark et al., 2019 ; Kwiatkowski et al., 2019 ) , commonsense reasoning ( Sakaguchi et al., 2019 ; Suzgun et al., 2022 ) , mathematics and science ( Cobbe et al., 2021 ; Hendrycks et al., 2020 ) , and coding ( Austin et al., 2021 ; C…

- **§1 Introduction** (`S1.p8.1`)

  > In this technical report, we provide an overview of models, including the architecture, training, and pre- and post-training recipes for Gemma 2. We also provide detailed evaluations across a wide variety of quantitative and qualitative benchmarks, as well as both standard academic benchmarks and human-preference evaluations. Finally, we discuss our approach to safe and responsible deployment and outline the broader implications of Gemma 2, its limitations, and advantages.

- **§5 Ablations** (`S5.p7.1`)

  > Impact of formatting. We measure performance variance on MMLU across prompt/evaluation formatting variations. Table 11 shows the standard deviations of MMLU scores for 12 formatting/evaluation combinations, a proxy for undesired performance variability. The Gemma 2B models are slightly less format-robust than the larger ones. Notably, Mistral 7B is significantly less robust than our models.

- **§6.2 Post-training Evaluations** (`S6.SS2.p1.1`)

  > In this section, we evaluate our IT models on a set of human evaluations as well as standard academic benchmarks. The Gemma 2 models push the frontier for post-trained open-weights models, setting a new state of the art on the LMSYS Chatbot Arena ( Chiang et al., 2024 ) .

- **§LMSYS Chatbot Arena** (`S6.SS2.SSSx1.p1.1`)

  > Gemma 2 Instruction Tuned models were evaluated on the Chatbot Arena ( Chiang et al., 2024 ) in blind side by side evaluations by human raters against other state of the art models. We report Elo scores in Table 14 . Gemma 2.6B, 9B and 27B strongly outperform all other open models in the same range of parameters, with notably: Gemma 27B (Elo 1218) ranked higher than Llama 3 70B (Elo 1206), Gemma 9B (Elo 1187) similar as GPT-4-0314 (Elo 1186), Gemma 2.6B (Elo 1126) ranked higher than GPT-3.5-Turbo-0613 (Elo 1116).

## Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters — `2408.03314`

- **§1 Introduction** (`S1.p4.1`)

  > To understand the benefits of scaling up test-time computation, we carry out experiments on the challenging MATH [ 13 ] benchmark using PaLM-2 [ 3 ] models specifically fine-tuned 1 1 1 Capability-specific finetuning is necessary to induce revision and verification capabilities into the base model on MATH since these capabilities are absent even in strong proprietary LLMs [ 15 , 33 ] . However, we expect that future LLMs will be more effective at verification and revision due to both increased scale and the inclusion of additional data targeted specifically towards these capabilities [ 36 , 5…

- **§5.2 Search Methods Against a PRM** (`S5.SS2.p4.1`)

  > Lookahead search. Lookahead search modifies how beam search evaluates individual steps. It uses lookahead rollouts to improve the accuracy of the PRM’s value estimation in each step of the search process. Specifically, at each step in the beam search, rather than using the PRM score at the current step to select the top candidates, lookahead search performs a simulation, rolling out up to k k steps further while stopping early if the end of solution is reached. To minimize variance in the simulation rollout, we perform rollouts using temperature 0. The PRM’s prediction at the end of this rollo…

- **§5.3 Analysis Results: Test-Time Scaling for Search with Verifiers** (`S5.SS3.p5.1`)

  > Which problems does search improve? To understand how to compute-optimally scale search methods, we now conduct a difficulty bin analysis. Specifically, we compare beam-search ( M = 4 M=4 ) against best-of-N. In Figure 3 (right) we see that while in aggregate, beam search and best-of-N perform similarly with a high generation budget, evaluating their efficacy over difficulty bins reveals very different trends. On the easy questions (levels 1 and 2), the stronger optimizer of the two approaches, beam search, degrades performance as the generation budget increases, suggesting signs of exploitati…

- **§7 Putting it Together: Exchanging Pretraining and Test-Time Compute** (`S7.p6.1`)

  > In Figure 9 , we use this approach to exchanging test-time and pretraining compute to compare our compute-optimal scaling against scaling up model parameters by a factor of ∼ 14 \sim 14 . We conduct comparisons for 3 different values of R: 0.16 ( R << 1 R<<1 ), 0.79 ( R ∼ 1 R\sim 1 ), and 22 ( R >> 1 R>>1 ), with each ratio corresponding to an inference budget. Observe that if we only expect to see very difficult questions (e.g. difficulty bins 4/5) or have a larger D inference D_{\text{inference}} (corresponding to a larger R R value), then it is often more effective to allocate our budget to…

- **§1 Introduction** (`S1.p3.1`)

  > We are interested in understanding the benefits of scaling up test-time compute. Arguably the simplest and most well-studied approach for scaling test-time computation is best-of-N sampling: sampling N outputs in “parallel” from a base LLM and selecting the one that scores the highest per a learned verifier or a reward model [ 7 , 22 ] . However, this approach is not the only way to use test-time compute to improve LLMs. By modifying either the proposal distribution from which responses are obtained (for instance, by asking the base model to revise its original responses “sequentially” [ 28 ]…

- **§2 A Unified Perspective on Test-Time Computation: Proposer and Verifier** (`S2.p1.1`)

  > We first unify approaches for using test-time computation and then analyze some representative methods. First, we view the use of additional test-time compute through the lens of modifying the model’s predicted distribution adaptively at test-time, conditioned on a given prompt. Ideally, test-time compute should modify the distribution so as to generate better outputs than naïvely sampling from the LLM itself would. In general, there are two knobs to induce modifications to an LLM’s distribution: (1) at the input level : by augmenting the given prompt with an additional set of tokens that the…

## Robo Twin 2.0: A Scalable Data Generator and Benchmark with Strong Domain Randomization for Robust Bimanual Robotic Manipulation — `2506.18088`

- **§1 Introduction** (`S1.p4.1`)

  > Building on these components, we introduce three new resources to support scalable research in bimanual manipulation: (1) the RoboTwin-OD asset library, comprising 731 annotated object instances across 147 categories; (2) an automated data generation pipeline with comprehensive domain randomization and a collection of over 100,000 expert trajectories spanning 50 tasks across five dual-arm robot platforms; and (3) a benchmark for evaluating policy generalization to cluttered environments and open-ended language goals. Together, these resources enable the community to train and evaluate robust b…

- **§1 Introduction** (`S1.p5.1`)

  > In summary, our main contributions are as follows: (1) We develop an automated expert data generation framework that integrates multimodal large language models with simulation-in-the-loop feedback to ensure high-quality, expert-level trajectories; (2) We propose a systematic domain randomization strategy that enhances policy robustness by increasing data diversity and sim-to-real generalization; (3) We introduce an embodiment-aware adaptation mechanism that generates robot-specific manipulation candidates based on object affordances; (4) We release the RoboTwin-OD asset library, a large-scale…

- **§3.2 50 Tasks for Data Generation and Benchmarking** (`S3.SS2.p1.1`)

  > Building on our automated task generation framework, embodiment-adaptive behavior synthesis, and the large-scale RoboTwin-OD asset library, we construct a suite of 50+ dual-arm collaborative manipulation tasks. We further support data collection and evaluation on five distinct robot platforms, enabling comprehensive cross-embodiment benchmarking. Keyframes from representative tasks are shown in Fig. 8 , and the complete task descriptions are available at http://robotwin-platform.github.io/doc/tasks/ . We also pre-collected over 100,000 dual-arm manipulation trajectories across 50 tasks in Robo…

- **§4 Experiment** (`S4.p1.1`)

  > We design experiments to evaluate the effectiveness of RoboTwin 2.0 in three key aspects: (1) automating the generation of high-quality expert code for manipulation tasks; (2) improving policy robustness to environmental variation via diversified training data; and (3) demonstrating the utility and diversity of RoboTwin 2.0 as a standardized benchmark for evaluating policy generalization across tasks, scenes, and embodiments.

- **§4.5 RoboTwin 2.0 Benchmark** (`S4.SS5.p1.1`)

  > To evaluate the benchmarking utility and generalization challenges of RoboTwin 2.0, we assess five policy models: ACT, DP, RDT, Pi0, and DP3. All VLAs are fine-tuned from their released pretrained weights in the single-task setting. Evaluations are conducted on all 50 benchmark tasks using the Aloha AgileX dual-arm embodiment. For each task, 50 clean expert demonstrations are used for training, and policies are tested with 100 rollouts under two conditions: Easy (clean) and Hard (domain-randomized with clutter, lighting, textures, and height variations). We provide a visualization of the bench…

- **§2.1 Expert Code Generation via MLLMs and Simulation-in-the-Loop Feedback** (`S2.SS1.p6.1`)

  > Multimodal Observation and Error Localization. In parallel with execution, a vision-language model (VLM) agent observes the robot’s behavior across all ten trials. The VLM performs frame-by-frame inspection to evaluate the success of each program step and localize the point of failure when errors occur. Beyond temporal localization, the VLM also diagnoses failure modes by inferring whether the underlying cause stems from flawed logic, incorrect API usage, or other systemic issues. This diagnostic capability enables the system to address root causes rather than merely responding to superficial…

## A Survey of LLM-based Deep Search Agents: Paradigm, Optimization, Evaluation, and Challenges — `2508.05668`

- **§Metrics.** (`S6.SS2.SSS0.Px1.p1.1`)

  > Most benchmarks assess the performance of search agents based on the effectiveness of the final output. For closed-ended QA, fact-checking, and most domain-specific tasks, the dominant metric is typically task success rate, e.g. , Exact Match (EM), F1 score, Accuracy, and Pass@k. Sometimes, the evaluation extends beyond the final output to the intermediate processes , such as evaluating the quality of the reasoning chain ( Wu et al., 2024 ) and retrieval ( Su et al., 2024 ; Yao et al., 2023 ; Wei et al., 2024 ; Eisenschlos et al., 2021 ) . Since most benchmarks rely on static search environmen…

- **§1 Introduction** (`S1.p4.1`)

  > Specifically, this paper is structured as follows: Sec. 2 introduces the task formulation for search agents. How to Search in Sec. 3 presents how agents scale up search turns and utilize complex search structures ( i.e. , parallel, sequential, and hybrid) to determine query content. How to Optimize in Sec. 4 discusses various optimization methodologies for search agents, including tuning and non-tuning approaches. How to Apply in Sec. 5 delineates the extensive application areas of search agents, encompassing both internal agent enhancements ( e.g. , reasoning, memory, and tool-use) and extern…

- **§Multi-Agent Architectures.** (`S4.SS1.SSS0.Px2.p1.1`)

  > While it is challenging for a single agent to handle multiple search tasks, multi-agent architectures decompose complex search tasks and distribute them among specialized agents. Common roles include planner agent , control the process, and terminate; search agent , gathering evidence from external sources; and generation agent , synthesizing the final answer with the collected evidence ( Jiang et al., 2025d ; Chen et al., 2024 ; Huang et al., 2025a ; Hu et al., 2024 ; Ma et al., 2025 ) . Some work also involves browser agent ( Huang et al., 2025a ; Du et al., 2025 ) , evaluator agent ( Nguyen…

- **§5.2 Internal Applications** (`S5.SS2.p1.1`)

  > Beyond external sources, a crucial, often overlooked, retrieval source for an agent lies within its internal components: its memory, accumulated experiences, and available tools. Agentic search can be effectively introduced to significantly enhance its core capabilities:

- **§Closed-ended QA.** (`S6.SS1.SSS0.Px1.p1.1`)

  > Closed-ended questions have specific, definite answers, which are easy to evaluate. However, simple closed-ended QA datasets like NQ ( Kwiatkowski et al., 2019 ) and TriviaQA ( Joshi et al., 2017 ) are often insufficient to effectively evaluate search agents in multi-turn search. Therefore, more challenging closed-ended QA datasets are developed, specifically focusing on multi-hop QA, challenging QA, and fact-checking. Multi-hop QA requires search agents to synthesize information from multiple sources, necessitating iterative information retrieval ( Yang et al., 2018 ; Ho et al., 2020 ; Press…

- **§Judge.** (`S6.SS2.SSS0.Px2.p1.1`)

  > The judge of the above metrics has undergone significant evolution, progressing from simplistic rule-based metrics to more intricate LLM- and Agent-based judging paradigms. Initially, search agents were evaluated using Rule-based Judges , such as metrics Exact Match (EM) and F1 score, against predefined ground truth answers. However, these metrics fail to account for semantic variations, where factually correct answers may be phrased differently. Thus, LLM-as-a-Judge paradigm emerged, leveraging LLMs to assess the accuracy and quality of results. This approach is effective for both closed-ende…

---

# 十八篇被四个以上方向引用、我们却从未读过正文的工作

这批来自 research/out/deep-bridges.json（18 篇，note ok 18/18）。判断段分两部分：前半由 A 写、后半由 B 写，各自只对自己读到的九篇负责。凡写「passages 没说」的地方，是 digest 里确实没有对应段落，不是省略。

范围说明：按题目给的显式区间（`2602.02276` 至 `2407.01502`，含两端）读，digest 里这一段是 14 条而不是 9 条。下面覆盖这个区间内的全部条目（区间按 id 划，不按条数截）：若按条数截断到第九条 `2001.08361`，会漏掉成本与有效性讲得最具体的五条（PaperBench、HealthBench、自演化 agent 综述、GPT-5 系统卡、AI Agents That Matter），而它们正是本题的问点。

## 一、按主题归并

**第一组：成本是基准设计的一部分，不是跑完之后的账。** `2504.01848` §2.6 把贵写成基准自身的属性：“Running a full evaluation on PaperBench is expensive in terms of agent model inference as well as the compute environment provided to agents.”，它的应对不是省钱技巧而是一个降级基准，明确“skipping the focus on executing the code to verify that results are reproduced”。`2407.01502` §6 把贵与统计能力直接连起来：“The high cost of evaluating agents makes it is hard to estimate confidence intervals.”（原文如此）`2507.21046` §Coverage Gaps 则把缺成本当缺陷：“Efficiency suffers from sparse and inconsistent reporting of evolution costs.”——三处说的是同一件事：成本先决定你能测几次，再决定你的分数有没有误差棒。

**第二组：分数是协议的产物，换协议就换数。** `2310.06825` §3 为了可比性重跑全部基准，并把差异摆上台面：“on MBPP, we use the hand-verified subset 2) on TriviaQA, we do not provide Wikipedia contexts.”；`2602.02276` §Evaluation Configurations 固定温度、top-p、上下文，并把重测过的数“marked with an asterisk (*)”。`2408.00118` §5 把这件事量化成方差：“Table 11 shows the standard deviations of MMLU scores for 12 formatting/evaluation combinations, a proxy for undesired performance variability.” `2504.20073` §3.3 与 `2408.03314` §1 分别从固定提示数与 best-of-N 预算两侧说明同一件事：读数旁边必须挂条件。这些例子放一起，同一个模型名下的两个数可能不是同一次测量。

**第三组：有效性被拆成几个可检查的问题，而不是一个难度刻度。** `2505.08775` §1 拆得最干净：“Meaningful : Do scores reflect real-world impact?”、“Trustworthy : Are scores faithful indicators of physician judgment?”、“Unsaturated : Do benchmarks still have headroom to support progress?”。`2311.07911` §2.2 补了第四种病，连程序判据也会错判：“Even though we can verify if an instruction is followed using simple heuristics and programming, we found that there are still false negatives.” 两篇都没有把有效性直接写成三者的联合属性，但前者验的是分数与真实影响、与医生判断的对应，后者验的是判据自身的误判；并读下来，有效性至少落在基准、判据、题目分布三个位置上。

**第四组：开放任务与研究型任务，分数只能对着 rubric 与人类基线读。** `2504.01848` §2.3 说明分数怎么造出来：“A rubric is organized as a tree of requirements, with each leaf node specifying a single clear criterion to pass or fail”，§1 给出唯一一次人类对照：“our human baseline of ML PhDs (best of 3 attempts) achieved 41.4% after 48 hours of effort, compared to 26.6% achieved by o1 on the same subset.”。`2605.08678` §Task structure 把同类要求写成准入条件：“at least 3 strong human baselines including the SOTA ones that we can reproduce”，`2506.18088` §4 则把基准定义成泛化装置：“a standardized benchmark for evaluating policy generalization across tasks”。`2504.01848` 的这几段没说没有人类基线的分数就不算能力证据，那一句是我的读法而不是它的话。

**第五组：预算与分数落在同一个坐标里。** `2001.08361` §1 的幂律是有条件的：“Throughout we will observe precise power-law scalings for performance as a function of training time, context length, dataset size, model size, and compute budget.”，同篇 §Convergence is inefficient 说明预算怎么花会挪动最优点：“we attain optimal performance by training very large models and stopping significantly short of convergence”。`2302.13971` §1 把推理预算写成选型标准：“given a target level of performance, the preferred model is not the fastest to train but the fastest at inference”；`2602.02276` §Reward Function 更进一步，把预算写进奖励：“To optimize resource consumption, we also incorporate a budget-control reward aimed at enhancing token efficiency.”。

**第六组：开放式评估只剩裁判读数，而裁判自己也要被评。** `2412.19437` §5.3.3 明说开放式任务用模型裁判：“In addition to standard benchmarks, we also evaluate our models on open-ended generation tasks using LLMs as judges”，`2410.21276` §3.2 把被评对象缩到文本：“We always score only the textual content of the model output”。`2505.08775` §Macro F1 于是把裁判本身当分类器去验：“we treat grading as binary classification (met/not-met)”。`2508.05668` §Metrics 把这一取向说白：“Most benchmarks assess the performance of search agents based on the effectiveness of the final output.”——开放式分数因此不是能力读数，而是某个裁判在某套 rubric 下的判读，裁判自己的 F1 才是这个分数的误差来源。

## 二、我认为什么变了

1. 成本应该写进基准的定义，而不是跑完之后的账。依据：`2504.01848` §2.6 直接发行一个便宜变体，把昂贵当成可裁剪的设计项。
2. 引用别人的数字之前，必须用别人的管线重跑一遍。依据：`2310.06825` §3 为公平比较重跑全部基准并列出两处协议差异；不重跑，手里就只有没有协议的数。
3. 不带协议的数字不能放进同一张表。依据：`2602.02276` §Evaluation Configurations 固定温度、top-p、上下文，并把重测过单独打星；需要打星这件事本身说明星号数与未打星数不是一列。
4. 基准失效有三种病，我以前只认一种。依据：`2505.08775` §1 的 meaningful / trustworthy / unsaturated 三问；我过去的动作只有换更难的题，那只治饱和。
5. 变难导致的分数下降可以是正确信号。依据：`2601.03267` §3.2 的“scores are therefore expected to be lower than the standard evaluation.”，它把偏低从退步改写成设计意图。
6. agent 的分数可以被 retry 买出来，accuracy 不能单独报。依据：`2407.01502` §2.1“the accuracy of AlphaCode increases from close to 0% zero-shot to over 15% with 1,000 retries and over 30% with a million retries”，以及 §6“set a cost limit of USD 4 per task”。
7. rubric 让评分可审计，但把成本转移给了出 rubric 的人。依据：`2504.01848` §2.3 每个叶子是一个二值判据，§1 说单次复现的评分要几十小时。
8. benchmark score 的合法含义只剩在给定协议、预算、基线下的相对位置。依据：`2001.08361` §1 的幂律只在性能“limited by only either the number of non-embedding parameters”这类受限条件下成立，它不预测排行榜名次。

## 三、互相矛盾

- 成本该不该进表。`2407.01502` §4 说“reporting costs breaks many properties of benchmarks that we take for granted: measurements don’t change over time (whereas costs tend to come down) and different models compete on a level playing field”；`2507.21046` §Coverage Gaps 说“Efficiency suffers from sparse and inconsistent reporting of evolution costs.”。同一张基准表，前者把成本当污染，后者把缺成本当缺陷，两种默认值不能同时采用。
- 便宜变体算不算同一个基准。`2504.01848` §2.6 的 Code-Dev 把复现验证整个拿掉仍叫同一个基准；`2605.08678` §Task structure 则要求任务自带至少三条可复现的强人类基线。一个说可以不做复现验证就出分，一个说没有可复现基线就不是有效任务；它们嘴里的分数不是同一个东西。
- 子集分数能不能比。`2410.21276` §3.3.3 写“these scores should not be compared with publicly reported benchmarks on the same task.”；`2601.03267` §3.2 却在解释生产集分数为什么低于标准评估，把跨集合的高低差当成可解释的信号。前者禁止的比较，后者正在做。
- performance 一词指什么。`2001.08361` §1 把 performance 写成 N/D/C 的函数；`2310.06825` §3 说明同一模型换协议、换子集就换数。若后者成立，前者的因变量就不是排行榜上那个数，两篇不能同时用同一个 `performance` 指同一个量。

## 四、三条我会改的

1. 给晋升门加测量协议字段，跨协议直接拒。落地在 `src/gate/gate.js`：它已经有一条度量不可比分支（`docs/contracts.md:271`：候选有 killRate、incumbent 没有就 `reject("incomparable measurement")`），把它从度量种类扩到协议——evidence 带 `regime = {promptHash, temperature, topP, subsetId, n}`，与 incumbent 不同就拒，reason 写明哪一项不同。依据：`2602.02276` §Evaluation Configurations、`2410.21276` §3.3.3。没有这一条，我们的 `delta` 会把两次不同测量的差当成进步。
2. 每轮把分数、花费、每任务尝试次数绑在一起记，缺一项不许晋升。落地在 `src/runtime/round.js` 的轮次记录（现在只写 `score`、`scoreSource`、`promoted`，见 `round.js:2700`）加 `evalUsd` 与 `attemptsPerTask`，并在门里加一条：gain 只在 attempts 高于 incumbent 时成立，按 retry 买来的分拒绝。依据：`2407.01502` §2.1 与 §6。
3. 给 holdout 加准入，没有基线与退化读数的任务不许当 holdout。落地：新增 `docs/benchmark-validity-2026-11.md` 写三问清单，并在 `src/runtime/sampling.js` 的 holdout 选取处过滤——任务必须有记录的 `baselineScore`，`killRate` 不能全部堆在 0 或 1，否则退回普通轮。依据：`2505.08775` §1、`2605.08678` §Task structure；`2601.03267` §3.2 说明更难要事前写进设计，不能事后解释。

## 五、没回答的三件事

1. 人类基线怎么计价。`2504.01848` §1 给了“48 hours of effort”与 41.4%，但 the passages do not say 这 48 小时按什么价折算进基准成本，也没说 “best of 3 attempts” 是不是允许的基线定义。
2. 差多少算信号。`2601.03267` §3.2 说生产集分数“expected to be lower”，`2505.08775` §1 要求基准留有 headroom，但两篇都没给噪声尺度；`2407.01502` §6 只说贵到“hard to estimate confidence intervals”，没给区间宽度。可分辨阈值，the passages do not say。
3. 打星的重测数与自报数能不能同桌。`2602.02276` §Evaluation Configurations 只说重测条件一致并打星，没说星号数与未打星数的可比性；`2310.06825` §3 只说协议不同会有差异，没说差异多大。跨来源分数能否合并，the passages do not say。


覆盖范围先对齐一下，因为"后九篇"是个位置主张而 digest 的排列不是按年份：digest 共 18 条，最后九条按文件顺序是 `2504.20073`、`2310.06825`、`2311.07911`、`2605.08678`、`2407.01502`、`2408.00118`、`2408.03314`、`2506.18088`、`2508.05668`。题目给的起点 `2408.00118` 在这份文件里是倒数第四条，`2408.00118` 到 `2508.05668` 只有四条，凑不出九条；所以我按"末尾九条"取，这九条里包含题目点名的整个区间。两点后果需要写明：一、`2001.08361`（scaling laws 原文）正好落在窗口之外，所以本文里的"scaling"只以三种形态出现——参数口径、预算口径、turn/推理预算，不是幂律拟合；二、digest 是摘录，每个错过的机制都算"段落没说"，不当作"论文没说"。

先说一个覆盖事实，免得后面被追问：这九篇里没有一篇是 scaling law 的原始论文（`2001.08361` 在前九条），所以"scaling"在这批里只以三种形态出现——参数口径、预算口径、turn/推理预算。digest 是摘录不是全文，下面凡是只有一段支撑的地方都写"一篇"，凡是段落没给数的地方都写"段落没说"。

## 一、按主题归并

**第一组：评测设置写在正文的哪一层，九篇差了两个数量级。** `2504.20073` 把设置钉死在正文里："We evaluate on 256 fixed prompts per environment with temperature T = 0.5 T{=}0.5 , truncating episodes after 5 turns."（`2504.20073` §3.3 Evaluation Metrics）——样本数、温度、截断轮数三个都给了，指标还列了五项。`2310.06825` 只给到"用自家流水线重跑"这一层："We compare Mistral 7B to Llama, and re-run all benchmarks with our own evaluation pipeline for fair comparison."（`2310.06825` §3 Results），温度、few-shot 数、解码方式一概不在摘录段落里。同一节的下一段才补了两条具体差异："1) on MBPP, we use the hand-verified subset 2) on TriviaQA, we do not provide Wikipedia contexts."（`2310.06825` §3 Results）——也就是说，读者要判断"这两个分数能不能比"，靠的是作者顺手列的两条脚注，不是任何契约。`2408.00118` 走的是第三条路：不给采样设置，先给参数口径——"Note that we consider total parameters, not active parameters, since total memory usage is often what limits the use of open models on standard devices."（`2408.00118` §6 Evaluation）。三篇合起来说明：模型报告里的"评测设置"不是一个字段，至少是三件不同的事（采样、协议差异、可比单位），而它们各自被写在不同层级。

**第二组：规模主张的单位正在从"参数个数"换成"资源口径"。** `2310.06825` 用的是换算："We computed “equivalent model sizes” of the Llama 2 family"（`2310.06825` §3 Results），结论是 MMLU 上"mirrored performance that one might expect from a Llama 2 model with more than 3x its size"（同节）。`2408.00118` 拒绝换算，改用显存视角的总参数（上引 §6）。`2605.08678` 把单位推到任务定义里：agent 拿到的是"the task description, action and test budgets"（`2605.08678` §Infrastructure），并且它明确测过"去掉预算约束"会发生什么——"it opens a recurring shortcut: agents can increase the submitted model’s capacity to obtain higher scores rather than improve the method itself."（`2605.08678` §Validity controls）。一篇论文（`2605.08678`）把这条写成机制：预算不是成本控制的附属品，是防止"改大自己"的护栏。

**第三组：test-time compute 的关键结论是"分配"而不是"总量"。** `2408.03314` 先把它形式化："we view the use of additional test-time compute through the lens of modifying the model’s predicted distribution adaptively at test-time, conditioned on a given prompt."（`2408.03314` §2）。然后给了一个反直觉的实测：总量相同的时候方法差异被平均掉，分难度之后才现形——"while in aggregate, beam search and best-of-N perform similarly with a high generation budget, evaluating their efficacy over difficulty bins reveals very different trends."（`2408.03314` §5.3）。最后把 pretraining 与 test-time 放进同一个预算轴："we use this approach to exchanging test-time and pretraining compute to compare our compute-optimal scaling against scaling up model parameters by a factor of ∼ 14"（`2408.03314` §7），并给了三个比值 "0.16 ( R << 1 R<<1 ), 0.79 ( R ∼ 1 R\sim 1 ), and 22 ( R >> 1 R>>1 )"（同节）。另一条路线是"加轮数"：`2508.05668` 把搜索 agent 的扩展写成"how agents scale up search turns and utilize complex search structures ( i.e. , parallel, sequential, and hybrid)"（`2508.05668` §1 Introduction）。两篇都在扩计算，但一篇扩的是候选数与验证深度，一篇扩的是检索轮次——这是本批里唯一成对出现的"扩展轴"。

**第四组：判据从人退到程序，再从程序退到模型，每一步都留下一个没被量化的缝。** `2311.07911` 的整个设计建立在"可程序判定"上："These verifiable instructions are atomic instructions for which one can use a simple, interpretable, and deterministic program to verify if corresponding responses follow the instructions or not."（`2311.07911` §1 Introduction），但它自己先承认缝在哪："Even though we can verify if an instruction is followed using simple heuristics and programming, we found that there are still false negatives."（`2311.07911` §2.2 IFEval metrics）——给了例子（markdown 加粗导致字符串比对失败），没给率。`2508.05668` 把这条演化史直接写出来："progressing from simplistic rule-based metrics to more intricate LLM- and Agent-based judging paradigms"（`2508.05668` §Judge），理由是 rule-based "fail to account for semantic variations"（同节）。再往上一层是人：`2408.00118` 的 Arena 分数来自"blind side by side evaluations by human raters against other state of the art models"（`2408.00118` §LMSYS Chatbot Arena）。三种判据各有一个没被量化的量：假阴性率、judge 与人的一致率、评分者间一致性——三篇都没在摘录里给。

**第五组：agent 评测的经济性已经不是脚注，而是方法论的一部分。** `2407.01502` 把重试次数与精度的耦合摆到最前："the accuracy of AlphaCode increases from close to 0% zero-shot to over 15% with 1,000 retries and over 30% with a million retries"（`2407.01502` §2.1）。它同时指出这也让统计变贵："The high cost of evaluating agents makes it is hard to estimate confidence intervals."（`2407.01502` §6）。标准化那一节的说法是"还没有标准"："there are no clear standards for providing agent evaluation scripts"（`2407.01502` §6）。而 `2605.08678` 已经是"有标准"的形态：统一后端 "Apptainer, Docker, Conda, and Harbor"（`2605.08678` §Infrastructure），任务结构里还要求"at least 3 strong human baselines including the SOTA ones that we can reproduce"（`2605.08678` §Task structure.）。两篇不是互相驳倒，是同一件事的两个时间点：一篇描述缺口，一篇是补缺口的一次尝试。

## 二、我认为什么变了

1. **"同一个 benchmark 名"不再等于"同一把尺子"，这一点现在有正文证据，不再只是常识。** 依据：`2310.06825` §3 明说重跑时 MBPP 用 hand-verified 子集、TriviaQA 不给 Wikipedia 上下文——两条都足以单独改变分数。
2. **报告的方差要按"格式"分层，而我们已经把它当成单一噪声。** 依据：`2408.00118` §5 用"12 formatting/evaluation combinations"测 MMLU 的标准差，并点名 Mistral 7B 显著更差；也就是说同一个模型换一种提示格式的波动，本身就是一个可报告的量。
3. **参数个数作为可比单位正在失效，取而代之的是"总参数（显存）"或"等效规模"两种互不兼容的口径。** 依据：`2408.00118` §6 明确选总参数而弃 active 参数，`2310.06825` §3 选等效规模换算。
4. **预算必须是任务定义的一部分，否则 agent 会改大自己而不是改好方法。** 依据：`2605.08678` §Validity controls 的 capacity-budget control 直接报出这个捷径。
5. **test-time compute 的收益是任务难度的函数，不是总量的函数。** 依据：`2408.03314` §5.3 聚合上看不出差别、按难度分箱后差别很大。
6. **"试几次"和"得几分"在我们的账本里必须同时出现，否则分数不可解释。** 依据：`2407.01502` §2.1 的重试-精度曲线（0% → 15% → 30%+），以及 §6 的成本-置信区间耦合。
7. **可程序判定的判据也会有系统性的假阴性，这不是实现 bug 而是设计属性。** 依据：`2311.07911` §2.2 举的 markdown 例子——语义上照做了，字符串上没照做。
8. **数据规模可以生成，但"跨 embodiment"这类主张只能靠评测侧兑现。** 依据：`2506.18088` §1 给的是 100,000 条轨迹、50 个任务、五个平台，而 §4.5 的评测只在一个 embodiment 上跑（见第三节）。

## 三、互相矛盾

- **可程序判定到底够不够：`2311.07911` 与 `2508.05668` 不能同时成立。** 前者把整张 benchmark 建在"simple, interpretable, and deterministic program"上（`2311.07911` §1），只把 false negatives 当边角；后者说 rule-based judges "fail to account for semantic variations"，判据已经整体迁到 LLM/agent（`2508.05668` §Judge）。如果后者的判断成立，前者的分数就是一个下界而不是测量值；如果前者成立，后者换 judge 换掉的是可靠性而不是能力。两篇都没给假阴性率/一致率，所以谁对目前无法在这批段落里裁决。
- **"小模型打赢大模型"该按哪个参数口径排名：`2408.00118` 与 `2310.06825` 冲突。** 前者按总参数比，并给出 Arena 上的结论 "Gemma 27B (Elo 1218) ranked higher than Llama 3 70B (Elo 1206)"（`2408.00118` §LMSYS Chatbot Arena）；后者按等效规模换算，主张 7B 对 MMLU 相当于"more than 3x its size"的 Llama 2（`2310.06825` §3）。两种口径不能同时是一张比较表的横轴：一个说"数总数"，一个说"换成等效值再比"，同一对模型会排出不同名次，而两篇都没说自己的口径可以跨论文相加。
- **`2506.18088` 的"跨 embodiment 基准"与它的评测协议不能同时成立。** 正文一侧写"data collection and evaluation on five distinct robot platforms, enabling comprehensive cross-embodiment benchmarking"（`2506.18088` §3.2），实验一侧写"Evaluations are conducted on all 50 benchmark tasks using the Aloha AgileX dual-arm embodiment"（`2506.18088` §4.5）。五平台是数据与任务的覆盖面，单平台是评测的覆盖面；把前者当成后者的证据，就是这批里最典型的"分母是主张"错误。

## 四、三条我会改的

1. **每个分数必须带上产生它的评测设置，且不同设置下的分数禁止直接相减。** 落点：`src/gate/score.js` 的 `scoreOf` 现在只返回 `{score, source}`（`src/gate/score.js:58`），扩成 `{score, source, config}`，`config` 至少装 verify 命令、超时、重试数、任务集 id；`src/runtime/round.js:2320` 的 `beatsIncumbent` 在 `config` 不一致时返回不可比（让 `checks.beatsIncumbent` 有一个显式的 `incomparable` 分支），而不是照旧做减法。依据是 `2310.06825` §3 那两条协议差异和 `2408.00118` §5 的 12 种格式方差——它们说明"同一个 benchmark 名"下的两个数可以差出一个决策。
2. **把"每任务评几次"和误差棒一起变成显式输入，默认不再是"没测过"。** 落点：`src/runtime/sampling.js` 的 `pickTask` 只决定选哪个任务，不决定评几次；`src/runtime/round.js:2305-2309` 里 `noiseSpread` 在配置没测过时是 null，等于默认没有误差棒。改法：`evalset.repeats` 成为显式字段（缺省 1，但要在 `round.finished` 上记 `repeats:1`），`repeats > 1` 时用实测标准差覆盖配置值，区间不分离时按 R10 已提议的 `defer` 落账。依据：`2407.01502` §2.1 说明次数能把 0% 抬到 30%+，§6 说明次数贵到 CI 估不出来——两头都在说"次数"是分数定义的一部分。
3. **在 gate 上加一道"分母捷径"检查，锁住候选改小自己判据的规模。** 落点：`src/gate/metrics.js` 已经在解析 `MUTANTS=` 与 `KILLRATE=`，但没有任何一回合拿两个回合的 `MUTANTS` 相比；新增 `src/gate/capacity.js`（按仓库规矩在 `docs/contracts.md` 模块地图补一行，说明它为什么存在），规则：候选把 `MUTANTS` 或测试数量改小、或把 verify 命令指向更小的任务集时，记 `checks.denominator`、判 high 风险、不参与晋升。依据：`2605.08678` §Validity controls 的 capacity-budget control——去掉预算约束后 agent 靠放大容量拿分；我们的对应物就是放大/缩小分母。

## 五、没回答的三件事

1. **同一设置下重复评测的方差是多少。** `digest` 里只有 `2408.00118` §5 的"12 种格式组合"的标准差，那是格式间方差，不是同格式重跑方差；`2407.01502` §6 只说成本高到 CI 难估，没给数。所以我们 `noiseSpread` 该取 0.02 还是 0.2，段落没说。
2. **test-time 预算怎么折算成我们的计价单位。** `2408.03314` §7 的 R 是推理预算与预训练预算之比，但段落没说推理预算按 token 还是按 FLOPs 计；`2508.05668` §1 说轮数可以扩，也没给单轮成本。于是"把 $0.05 换成几次重试/几轮检索"目前没有汇率。
3. **判据的假阴性率。** `2311.07911` §2.2 承认 false negatives 存在但没给率；`2508.05668` §Judge 说 rule-based 已被 LLM/agent judge 取代但没给一致率；`2605.08678` §Task structure 要求 3 个人类基线，却没说评分者间一致性。我们二值 `verify` 的假阴性率，在这批段落里没有任何可比数字。
