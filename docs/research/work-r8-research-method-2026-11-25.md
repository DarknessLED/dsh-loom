# Library: r8-research-method

Built from arXiv HTML bodies on 2026-11-25. 18 work(s).

| work | year | mechanism points | figure | cited by | summary |
| --- | --- | --- | --- | --- | --- |
| [ReAct : Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) | 2022 | 11 | yes | 1 | yes |
| [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761) | 2023 | 6 | yes | 2 | yes |
| [BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents](https://arxiv.org/abs/2504.12516) | 2025 | 6 | no | 3 | yes |
| [Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning](https://arxiv.org/abs/2503.09516) | 2025 | 4 | yes | 3 | yes |
| [WebGPT: Browser-assisted question-answering with human feedback](https://arxiv.org/abs/2112.09332) | 2021 | 4 | yes | 4 | yes |
| [Self-Refine : Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651) | 2023 | 4 | yes | 1 | yes |
| [ResearchRubrics : A Benchmark of Prompts and Rubrics For Evaluating Deep Research Agents](https://arxiv.org/abs/2511.07685) | 2025 | 4 | yes | 0 | yes |
| [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | 2023 | 6 | yes | 1 | yes |
| [BrowseComp-Plus: A More Fair and Transparent Evaluation Benchmark of Deep-Research Agent](https://arxiv.org/abs/2508.06600) | 2025 | 7 | yes | 0 | yes |
| [WebSailor: Navigating Super-human Reasoning for Web Agent](https://arxiv.org/abs/2507.02592) | 2025 | 10 | yes | 1 | yes |
| [DeepResearcher: Scaling Deep Research via Reinforcement Learning in Real-world Environments](https://arxiv.org/abs/2504.03160) | 2025 | 11 | yes | 0 | yes |
| [Survey of Hallucination in Natural Language Generation](https://arxiv.org/abs/2202.03629) | 2023 | 7 | yes | 0 | yes |
| [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848) | 2023 | 8 | yes | 0 | yes |
| [Qwen3 Technical Report](https://arxiv.org/abs/2505.09388) | 2025 | 14 | yes | 1 | yes |
| [Search-o1: Agentic Search-Enhanced Large Reasoning Models](https://arxiv.org/abs/2501.05366) | 2025 | 7 | yes | 3 | yes |
| [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) | 2022 | 3 | yes | 3 | yes |
| [The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery](https://arxiv.org/abs/2408.06292) | 2024 | 2 | yes | 0 | yes |
| [GAIA : A Benchmark for G eneral AI A ssistants](https://arxiv.org/abs/2311.12983) | 2024 | 9 | yes | 0 | yes |

Summaries written: 18 of 18

---

# ReAct : Synergizing Reasoning and Acting in Language Models

arXiv:2210.03629 · 2022 · [source](https://arxiv.org/html/2210.03629)

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

![(1) Comparison of 4 prompting methods, (a) Standard , (b) Chain-of-thought ( CoT , Reason Only), (c) Act -only, and (d) ReAct (Reason+Act), solving a HotpotQA ( Yang et al., 2018 ) question. (2) Comparison of (a) Act -only and (b) ReAct prompting to solve an AlfWorld ( Shridhar et al., 2020b ) game. In both domains, we omit in-context examples in the prompt, and only show task solving trajectories generated by the model (Act, Thought) and the environment (Obs).](https://arxiv.org/html/2210.03629v3/teaser-new.svg)

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
在这个方向里 ReAct 是「检索作为环境」的原始形态：模型每想一步就发一次检索动作，观测回到上下文里再决定下一步，而不是先规划好全部查询再一次性搜。我们的调研管线走的正是相反的路（先广度、再回溯、再回填，三轮固定），好处是可复现，代价是模型无法在中途改变问题——一旦第一轮查询问偏了，后面只在同一个偏的方向上加深。

**It connects to**

- `2507.02592` — WebSailor 把这种交互式检索拿去训练（BrowseComp 上的长程搜索），说明「检索即环境」已经从提示技巧变成了训练目标。
- `2302.04761` — Toolformer 让模型自己学何时调用工具，ReAct 让模型每步都调用；一个是学出来的策略，一个是写死的循环。

## 不足之处
**What a reader should still not conclude**

- 它没有把「检索质量」与「推理质量」分开评估，而这恰恰是调研方法最需要分开的两件事。
- 机制段抽到的是任务域与动作空间，检索结果的截断策略（返回前几句）对结论的影响没有被讨论。

---

# Toolformer: Language Models Can Teach Themselves to Use Tools

arXiv:2302.04761 · 2023 · [source](https://arxiv.org/html/2302.04761)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models achieve impressive zero- and few-shot results on a variety of natural language processing tasks ( Brown et al., 2020 ; Chowdhery et al., 2022 , i.a.) and show several emergent capabilities ( Wei et al., 2022 ) . However, all of these models have several inherent limitations that can at best be partially addressed by further scaling. These limitations include an inability to access up-to-date information on recent events ( Komeili et al., 2022 ) and the related tendency to hallucinate facts ( Maynez et al., 2020 ; Ji et al., 2022 ) , difficulties in understanding low-resource languages ( Lin et al., 2021 ) , a lack of mathematical skills to perform precise calculations ( Patel et al., 2021 ) and an unawareness of the progression of time ( Dhingra et al., 2022 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Approach"]
  N1["§Sampling API Calls"]
  N2["§Executing API Calls"]
  N3["§Filtering API Calls"]
  N4["§Model Finetuning"]
  N5["§Inference"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![An exemplary prompt P ⁡ ( 𝐱 ) P(\mathbf{x}) used to generate API calls for the question answering tool.](https://arxiv.org/html/2302.04761v1/prompt.svg)

*An exemplary prompt P ⁡ ( 𝐱 ) P(\mathbf{x}) used to generate API calls for the question answering tool.*

<sub>figure: `2302.04761v1/prompt.svg`</sub>

## 机制
### 1. Approach

Our aim is to equip a language model M M with the ability to use different tools by means of API calls. We require that inputs and outputs for each API can be represented as text sequences. This allows seamless insertion of API calls into any given text, using special tokens to mark the start and end of each such call. We represent each API call as a tuple c = ( a c , i c ) c=({a}_{c},{i}_{c}) where a c a_{c} is the name of the API and i c i_{c} is the corresponding input. Given an API call c c with a corresponding result r r , we denote the linearized sequences of the API call not including and including its result, respectively, as: where “ <API> ”, “ </API> ” and “ → \rightarrow ’’ are special tokens. 1 1 1 In practice, we use the token sequences “ [ ”, “ ] ” and “ -> ” to represent “ <API> ”, “ </API> ” and “ → \rightarrow ”, respectively. This enables our approach to work without modifying the existing LM’s vocabulary. For reasons of readability, we still refer to them as “ <API> ”, “ </API> ” and “ → \rightarrow ” throughout this section. Some examples of linearized API calls inserted into text sequences are shown in Figure 1 . Given a dataset 𝒞 = { 𝐱 1 , … , 𝐱 | 𝒞 | } \mathcal{C}=\{\mathbf{x}^{1},\ldots,\mathbf{x}^{|\mathcal{C}|}\} of plain texts, we first convert this dataset into a dataset 𝒞 ∗ \mathcal{C}^{*} augmented with API calls. This is done in three steps, illustrated in Figure 2 : First, we exploit the in-context learning ability of M M to sample a large number of potential API calls. We then execute these API calls and finally check whether the obtained responses are helpful for predicting future tokens; this is used as a filtering criterion. After filtering, we merge API calls for different tools, resulting in the augmented dataset 𝒞 ∗ \mathcal{C}^{*} , and finetune M M itself on this dataset. Each of these steps is described in more detail below.

<sub>§2 Approach</sub>

### 2. Sampling API Calls

For each API, we write a prompt P ⁡ ( 𝐱 ) P(\mathbf{x}) that encourages the LM to annotate an example 𝐱 = x 1 , … , x n \mathbf{x}=x_{1},\ldots,x_{n} with API calls. An example of such a prompt for a question answering tool is shown in Figure 3 ; all prompts used are shown in Appendix A.2 . Let p M ​ ( z n + 1 ∣ z 1 , … , z n ) p_{M}(z_{n+1}\mid z_{1},\ldots,z_{n}) be the probability that M M assigns to token z n + 1 z_{n+1} as a continuation for the sequence z 1 , … , z n z_{1},\ldots,z_{n} . We first sample up to k k candidate positions for doing API calls by computing, for each i ∈ { 1 , … , n } i\in\{1,\ldots,n\} , the probability that M M assigns to starting an API call at position i i . Given a sampling threshold τ s \tau_{s} , we keep all positions I = { i ∣ p i > τ s } I=\{i\mid p_{i}>\tau_{s}\} ; if there are more than k k such positions, we only keep the top k k . For each position i ∈ I i\in I , we then obtain up to m m API calls c i 1 , … , c i m c_{i}^{1},\ldots,c_{i}^{m} by sampling from M M given the sequence [ P ⁡ ( 𝐱 ) , x 1 , … , x i − 1 , <API> ] [P(\mathbf{x}),x_{1},\ldots,x_{i-1},\texttt{<API>}] as a prefix and </API> as an end-of-sequence token. 2 2 2 We discard all examples where M M does not generate the </API> token.

<sub>§Sampling API Calls</sub>

### 3. Executing API Calls

As a next step, we execute all API calls generated by M M to obtain the corresponding results. How this is done depends entirely on the API itself – for example, it can involve calling another neural network, executing a Python script or using a retrieval system to perform search over a large corpus. The response for each API call c i c_{i} needs to be a single text sequence r i r_{i} .

<sub>§Executing API Calls</sub>

### 4. Filtering API Calls

Let i i be the position of the API call c i c_{i} in the sequence 𝐱 = x 1 , … , x n \mathbf{x}=x_{1},\ldots,x_{n} , and let r i r_{i} be the response from the API. Further, given a sequence ( w i ∣ i ∈ ℕ ) (w_{i}\mid i\in\mathbb{N}) of weights , let be the weighted cross entropy loss for M M over the tokens x i , … , x n x_{i},\ldots,x_{n} if the model is prefixed with 𝐳 \mathbf{z} . We compare two different instantiations of this loss: where ε \varepsilon denotes an empty sequence. The former is the weighted loss over all tokens x i , … , x n x_{i},\ldots,x_{n} if the API call and its result are given to M M as a prefix; 3 3 3 We provide e ​ ( c i , r i ) \text{e}(c_{i},r_{i}) as a prefix instead of inserting it at position i i because M M is not yet finetuned on any examples containing API calls, so inserting it in the middle of 𝐱 \mathbf{x} would interrupt the flow and not align with patterns in the pretraining corpus, thus hurting perplexity. the latter is the minimum of the losses obtained from (i) doing no API call at all and (ii) doing an API call, but not providing the response. Intuitively, an API call is helpful to M M if providing it with both the input and the output of this call makes it easier for the model to predict future tokens, compared to not receiving the API call at all, or receiving only its input. Given a filtering threshold τ f \tau_{f} , we thus only keep API calls for which holds, i.e., adding the API call and its result reduces the loss by at least τ f \tau_{f} , compared to not doing any API call or obtaining no result from it.

<sub>§Filtering API Calls</sub>

### 5. Model Finetuning

After sampling and filtering calls for all APIs, we finally merge the remaining API calls and interleave them with the original inputs. That is, for an input text 𝐱 = x 1 , … , x n \mathbf{x}=x_{1},\ldots,x_{n} with a corresponding API call and result ( c i , r i ) (c_{i},r_{i}) at position i i , we construct the new sequence 𝐱 ∗ = x 1 : i − 1 , e ( c i , r i ) , x i : n \mathbf{x}^{*}=x_{1:{i-1}},\text{e}(c_{i},r_{i}),x_{i:n} ; we proceed analogously for texts with multiple API calls. Doing this for all 𝐱 ∈ 𝒞 \mathbf{x}\in\mathcal{C} results in the new dataset 𝒞 ∗ \mathcal{C}^{*} augmented with API calls. We use this new dataset to finetune M M , using a standard language modeling objective. Crucially, apart from inserted API calls the augmented dataset 𝒞 ∗ \mathcal{C}^{*} contains the exact same texts as 𝒞 \mathcal{C} , the original dataset. As a consequence, finetuning M M on 𝒞 ∗ \mathcal{C}^{*} exposes it to the same content as finetuning on 𝒞 \mathcal{C} . Moreover, as API calls are inserted in exactly those positions and with exactly those inputs that help M M predict future tokens, finetuning on 𝒞 ∗ \mathcal{C}^{*} enables the language model to decide when and how to use which tool, based purely on its own feedback.

<sub>§Model Finetuning</sub>

### 6. Inference

When generating text with M M after finetuning with our approach, we perform regular decoding until M M produces the “ → \rightarrow ” token, indicating that it next expects the response for an API call. At this point, we interrupt the decoding process, call the appropriate API to get a response, and continue the decoding process after inserting both the response and the </API> token.

<sub>§Inference</sub>

## 总结与展望
Toolformer 的关键是一个廉价的自动化筛选器：让模型自己标注 API 调用、执行、然后只保留那些能降低后续 token 损失的调用。它对调研方法的意义是把「这条信息值不值得用」变成可以用一个本地指标判定的事——我们的调研里没有对应的筛选，读进来的每一篇都按同一套流程处理，值不值得读由结果的条数而不是由内容决定。

**It connects to**

- `2210.03629` — 一个学「何时调用」，一个「总在调用」；两者都把工具输出当上下文的一部分，而不检查它是否真的有用。
- `2303.11366` — Reflexion 把「没帮上忙的经验」写进记忆，Toolformer 直接丢掉不划算的调用；一个是保留加反思，一个是丢弃。

## 不足之处
**The authors say:** While our approach enables LMs to learn how to use a variety of tools in a self-supervised way, there are some clear limitations to what can be achieved with our method in its current form. One such limitation is the inability of Toolformer to use tools in a chain (i.e., using the output of one tool as an input for another tool). This is due to the fact that API calls for each tool are generated independently; as a consequence, there are no examples of chained tool use in the finetuning dataset. Our current approach also does not allow the LM to use a tool in an interactive way – especially for tools such as search engines, that could potentially return hundreds of different results, enabling a LM to browse through these results or to refine its search query in a similar spirit to Nakano et al. (2021) can be crucial for certain applications. Beyond this, we found models trained with Toolformer to often be sensitive to the exact wording of their input when deciding whether or not to call an API; this is perhaps unsurprising given that LMs are known to be very sensitive to the prompt they are provided with in both zero-and few-shot settings ( Jiang et al., 2020 ; Schick and Schütze, 2021a ) . Depending on the tool, our method is also very sample-inefficient; for example, processing more than a million documents results in only a few thousand examples of useful calls to the calculator API. A potential solution to this problem might be to iteratively apply our approach, similar to how this is done in related bootstrapping approaches ( Schick and Schütze, 2021a ; Izacard and Grave, 2021 ; Parisi et al., 2022 ) . Finally, when deciding whether or not to make an API call, Toolformer currently does not take into account the tool-dependent, computational cost incurred from making an API call.

**What a reader should still not conclude**

- 损失下降这个筛选器需要一个可计算的目标；调研的「有用」没有这样的目标，只能靠人判断。
- 机制段抽到的是方法总述与采样/执行两小节，筛选阈值与过滤后的规模在实验部分。

<sub>§7 Limitations</sub>

---

# BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents

arXiv:2504.12516 · 2025 · [source](https://arxiv.org/html/2504.12516)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Although the internet has transformed the way we access information, human navigation of the internet to find information is clunky for several reasons: (1) our memory and world knowledge are limited; (2) our browsing abilities are hindered by distraction and fatigue; and (3) human brains can only attend to one thing at a time and cannot be parallelized. Machine intelligence, on the other hand, has much more extensive recall and can operate tirelessly without getting distracted. A sufficiently capable machine intelligence should be able to, in principle, retrieve any well-specified any piece of information from the open web, even if retrieving it would require browsing thousands of web pages.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Data collection and verification"]
  N1["§2.1 BrowseComp criteria"]
  N2["§2.2 Dataset diversity"]
  N3["§2.3 Grading"]
  N4["§2.4 What BrowseComp exercises"]
  N5["§3 Human performance on BrowseComp"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

## 机制
### 1. Data collection and verification

The BrowseComp dataset was collected purely by human trainers. The instructions of BrowseComp largely followed those of SimpleQA ( Wei et al., 2024 ) —the human trainers created challenging, fact-seeking questions with single, indisputable, short answers that would not change over time and were supported by evidence. The key properties of BrowseComp are described below. Existing models at the time were not able to solve the question: trainers were asked to verify that GPT-4o (with and without browsing), as well as OpenAI o1 and an early version of the deep research model were not able to solve the problems. Trainers were asked to perform five simple Google searches and check that the answer was not readily available on any of the first pages of search results. Trainers were asked to create tasks that were challenging enough that another person would not be able to solve it within ten minutes. This was not strictly enforced, but for a portion of the questions a second trainer attempted finding the answer. Trainers who created tasks that were solved more than 40 % of the time were asked to revise their tasks. To identify the correct answer, models must be competent in reasoning about the factuality of content on the internet. Because answers are hard to find, doing well on BrowseComp requires persistence and depth of browsing ability. Many answers would be too time-intensive (or impossible) to find using a brute-force approach. In order to finish in a reasonable time, the model must be creative in its searches to find the correct answer.

<sub>§2 Data collection and verification</sub>

### 2. BrowseComp criteria

Challenging to answer. The most distinctive criteria for BrowseComp is that trainers created questions that were extremely challenging. We used three checks employed to motivate trainers to create questions that were challenging: Easy to verify, but hard to solve. To create challenging questions, we encouraged trainers to start with a fact, and then create an inverted question, where the answer is hard to find but easy to verify. Trainers typically started with a “seed” (could be a person, event, or artifact), found several characteristics with a large search space, and created a question from them. The exemplar question we gave them was: What’s the title of the scientific paper published in the EMNLP conference between 2018-2023 where the first author did their undergrad at Dartmouth College and the fourth author did their undergrad at University of Pennsylvania? (Answer: Frequency Effects on Syntactic Rule Learning in Transformers) In this example, it’s easy to verify the answer with just a few web searches, but it is much harder to find the answer, as a brute-force search would require examining thousands of papers, and looking into the backgrounds of the authors for each of them. Likely but not guaranteed to have all valid answers. One drawback in creating questions in an inverted fashion is that while we can be certain that the answer we provide as the reference answer is correct, we cannot be certain that there were no other answers. Using the EMNLP example above, the only way to be sure that there were no other papers fitting the above criteria would be to check every single one of them, which would be too time consuming. However, we can know that it is fairly unlikely that another answer fits the criteria, as Dartmouth College is a small school, and the person who wrote the question was familiar enough with the domain to know that no one else from Dartmouth wrote papers in EMNLP in the specified time span. To mitigate the possibility of additional answers other than the provided reference answer, we asked trainers to be comfortable enough with the content of their question that they were fairly confident that there were no additional valid answers, and to add more criteria if they were not confident. Moreover, if another trainer found valid answers within ten minutes that was not the reference answer, feedback was given to trainers for them to revise their question.

<sub>§2.1 BrowseComp criteria</sub>

### 3. Dataset diversity

In creating BrowseComp, we encouraged trainers to create questions about topics that they were personally interested in, hoping that creating data points about personal interests would lead to a more engaging experience, and higher quality data. The distribution of topics is shown below.

<sub>§2.2 Dataset diversity</sub>

### 4. Grading

As all the reference answers for BrowseComp are just a single short string, grading is done by simply using an AI model compare whether a predicted answer is semantically equivalent to the reference answer. We use the same grading prompt as Humanity’s Last Exam ( Phan et al., 2025 ) . You can view the full prompt to the grader in Appendix B .

<sub>§2.3 Grading</sub>

### 5. What BrowseComp exercises

Despite the simplicity of BrowseComp, it nonetheless measures the AI agent’s core browsing skills: BrowseComp can be seen as an incomplete but useful benchmark for agents that browse the internet. Although BrowseComp sidesteps the challenges of a true user query distribution, like generating long answers or resolving ambiguity, it measures the important core capability of exercising persistence and creativity in finding information. As a loose analogy, models that crush programming competitions like CodeForces demonstrate high coding capabilities that likely generalize well to other coding tasks, but this is not guaranteed. Similarly, to solve BrowseComp, the model must be very proficient at locating hard-to-find pieces of information, but it’s not guaranteed that this generalizes to all tasks that require browsing.

<sub>§2.4 What BrowseComp exercises</sub>

### 6. Human performance on BrowseComp

As one measure of how challenging the BrowseComp dataset is, we asked human trainers to also try to solve BrowseComp questions. These trainers were from the same group of trainers that created questions, but they could not solve the questions they created. The human trainers did not have access to the correct answer to the question, and were asked to complete the task without using an AI assistant (specifically, without using ChatGPT, Claude, Perplexity, Grok, or Gemini). Since some questions are extremely hard, we allowed trainers to label a problem as unsolvable and move on if they could solve it within 2 hours of searching. As shown in Table 2 , trainers solved 29.2% of problems, and of solved problems, the answer from the trainer matched with the original reference answer 86.4% of the time. Trainers self-reported how much time it took them to answer a question. Figure 3 below shows the distribution of times for questions that were solved versus questions where trainers gave up. For solved questions, we see a range of times—some questions were solved in less than one hour of searching, but there were also many questions that took two or three hours. When trainers gave up, they (per the rules) only did so after attempting the problem for around two hours. This data underscores the difficulty of the BrowseComp dataset—the trainers were humans experienced with the dataset and were not able to solve most questions in a few hours. On the other hand, the trainers were also not competition-level internet browsers, and it is possible that many of the problems that they gave up on would be solvable by experienced professionals (e.g., detectives or investigative journalists) with ample time.

<sub>§3 Human performance on BrowseComp</sub>

## 总结与展望
BrowseComp 用手工构造、答案难以直接搜到的问题测浏览代理，构造规则要求「十分钟内解不出、需要多次搜索确认」。它在调研方法方向的意义是：难题的难度可以被设计，而不是被观察——这正好是我们 evalset 缺的一层。

**It connects to**

- `2508.06600` — 后继工作指出原基准的检索污染问题，把「可解性」做成了透明指标。
- `2311.12983` — GAIA 是同类的人工难题基准，覆盖面更广。

## 不足之处
**The authors say:** There has been a long-standing interest in using AI to retrieve information from the internet. The task of retrieving information from the internet were of interest in the natural language processing community as early as IBM Watson ( Ferrucci et al., 2010 ) , with interest increasing with the popularization of pre-trained language models ( Guu et al., 2020 , Lewis et al., 2020 ) . Compared to prior work that focuses on information that could be easily found by a human within ten minutes of searching ( Joshi et al., 2017 , Yang et al., 2018 , Thorne et al., 2018 , Dinan et al., 2019 , Lee et al., 2019 , Fan et al., 2019 , Petroni et al., 2021 , Yao et al., 2022 , Mialon et al., 2023 , Song et al., 2025 ) , BrowseComp focuses on the ability to retrieve hard-to-find, deeply entangled information on the web.

**What a reader should still not conclude**

- 题目由人写，难度依赖作者的直觉，没有可复现的难度标定。
- 答案可被记忆污染，这正是后继工作要解决的问题。

<sub>§5 Related work and discussion</sub>

---

# Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning

arXiv:2503.09516 · 2025 · [source](https://arxiv.org/html/2503.09516)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have demonstrated remarkable capabilities in natural language understanding and generation ( Hendrycks et al., 2020 ; Clark et al., 2018 ) . Despite these achievements, LLMs often encounter challenges when tasked with complex reasoning ( Wei et al., 2022 ) and retrieving up-to-date information from external sources ( Jin et al., 2024 ) . Addressing these limitations necessitates integrating advanced reasoning abilities ( Huang & Chang, 2022 ) and the capability to interact effectively with search engines to best utilize external up-to-date information ( Schick et al., 2023 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Main Results"]
  N1["§4.1 Datasets"]
  N2["§4.2 Baselines"]
  N3["§4.3 Experimental Setup"]
  N4["§4.4 Performance"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

![Demonstration of PPO and GRPO training with the search engine ( Search-R1 ). During the rollout, LLMs can conduct multi-turn interactions with the search engine.](https://arxiv.org/html/2503.09516v5/main.svg)

*Demonstration of PPO and GRPO training with the search engine ( Search-R1 ). During the rollout, LLMs can conduct multi-turn interactions with the search engine.*

<sub>figure: `2503.09516v5/main.svg`</sub>

## 机制
### 1. Datasets

We evaluate Search-R1 on seven benchmark datasets, categorized as follows: (1) General Question Answering : NQ ( Kwiatkowski et al., 2019 ) , TriviaQA ( Joshi et al., 2017 ) , and PopQA ( Mallen et al., 2022 ) . (2) Multi-Hop Question Answering : HotpotQA ( Yang et al., 2018 ) , 2WikiMultiHopQA ( Ho et al., 2020 ) , Musique ( Trivedi et al., 2022b ) , and Bamboogle ( Press et al., 2022 ) . These datasets encompass a diverse range of search with reasoning challenges, enabling a comprehensive evaluation of Search-R1 .

<sub>§4.1 Datasets</sub>

### 2. Baselines

To evaluate the effectiveness of Search-R1 , we compare it against the following baselines: (1) Inference without Retrieval : Direct inference and Chain-of-Thought (CoT) reasoning ( Wei et al., 2022 ) . (2) Inference with Retrieval : Retrieval-Augmented Generation (RAG) ( Lewis et al., 2020 ) , IRCoT ( Trivedi et al., 2022a ) , and Search-o1 ( Li et al., 2025 ) . (3) Fine-Tuning-Based Methods : Supervised fine-tuning (SFT) ( Chung et al., 2024 ) , RL-based fine-tuning without a search engine (R1) ( Guo et al., 2025 ) and rejection sampling ( Ahn et al., 2024 ) with a search engine. For R1, we train the LLMs with the RL methods proposed in Guo et al. (2025) with our data to have a fair comparison with Search-R1 . It only contains reasoning and answer steps without a search engine. For rejection sampling, we generate five candidate responses per training prompt from the same dataset with the instructed LLMs and select those that lead to correct final answers. These selected trajectories are then used to construct a new training set that retains the same multi-turn LLM–search engine interaction rollout mechanism proposed in Search-R1 to fine-tune the LLMs. These baselines cover a broad spectrum of retrieval-augmented and fine-tuning approaches, allowing for a comprehensive assessment of Search-R1 in both zero-shot and learned retrieval settings. To make a fair comparison between different methods, we use the same retriever, same number of retrieved documents, same knowledge corpus, same training data and same pre-trained LLMs. Details can be found in Appendix B .

<sub>§4.2 Baselines</sub>

### 3. Experimental Setup

We conduct experiments using two types of models: Qwen-2.5-3B (Base/Instruct) and Qwen-2.5-7B (Base/Instruct) ( Yang et al., 2024 ) . For retrieval, we use the 2018 Wikipedia dump ( Karpukhin et al., 2020 ) as the knowledge source and E5 ( Wang et al., 2022 ) as the retriever. To ensure fair comparison, we follow Lin et al. (2023) and set the number of retrieved passages to 3 across all retrieval-based methods. A study of the number of retrieved passages can be found in Appendix G . For training, we merge the training sets of NQ and HotpotQA to form a unified dataset for Search-R1 and other fine-tuning based baselines. Evaluation is conducted on the test or validation sets of seven datasets to assess both in-domain and out-of-domain performance. Exact Match (EM) is used as the evaluation metric, following Yu et al. (2024) . For inference-style baselines, we use instruct models, as base models fail to follow instructions. For RL tuning methods, experiments are conducted on both base and instruct models. More details on experimental settings can be found in Appendix B . Unless stated otherwise, PPO is used as the default RL method , and a detailed comparison between PPO and GRPO is provided in Section 5.1 .

<sub>§4.3 Experimental Setup</sub>

### 4. Performance

The main results comparing Search-R1 with baseline methods across the seven datasets are presented in Table 2 . From the results, we make the following key observations: (1) Search-R1 consistently outperforms strong baseline methods. We achieve 24% and 20% average relative improvement with Qwen2.5-7B and Qwen2.5-3B, respectively. These gains hold across both in-distribution evaluation ( i.e. , NQ and HotpotQA) and out-of-distribution evaluation ( i.e. , TriviaQA, PopQA, 2WikiMultiHopQA, Musique, and Bamboogle). (2) Search-R1 surpasses RL-based training for LLM reasoning without retrieval (R1). This aligns with expectations, as incorporating search into LLM reasoning provides access to relevant external knowledge, improving overall performance. (3) Search-R1 is effective for both base and instruction-tuned models. This demonstrates that DeepSeek-R1-Zero-style RL with outcome-based rewards ( Guo et al., 2025 ) can be successfully applied to reasoning with search, extending beyond its previously established effectiveness in pure reasoning scenarios. (4) Larger models are better on learning how to do search. Search-R1 on 7B model shows much larger “performance gap” compared with 3B model ( e.g. , compared with second best model - RAG).

<sub>§4.4 Performance</sub>

## 总结与展望
Search-R1 把检索当成环境的一部分，用强化学习训练模型「何时搜、搜什么」。它对本方向的价值是把「检索质量」与「模型能力」分开：同一个模型，检索接口变化就会带来大幅分数变化，所以不能把两者混在一个分数里。

**It connects to**

- `2501.05366` — 同样把检索嵌入推理循环，一个靠 RL 一个靠提示。
- `2504.03160` — 把环境从本地语料换成真实网，泛化问题因此暴露。

## 不足之处
**What a reader should still not conclude**

- 奖励是最终答案正确，检索过程本身没有监督信号。
- 训练用的检索器固定，评测时换检索器会破坏可比性。

---

# WebGPT: Browser-assisted question-answering with human feedback

arXiv:2112.09332 · 2021 · [source](https://arxiv.org/html/2112.09332)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
A rising challenge in NLP is long-form question-answering (LFQA), in which a paragraph-length answer is generated in response to an open-ended question. LFQA systems have the potential to become one of the main ways people learn about the world, but currently lag behind human performance ( Krishna et al., 2021 ) . Existing work tends to focus on two core components of the task, information retrieval and synthesis.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Environment design"]
  N1["§3 Methods"]
  N2["§3.1 Data collection"]
  N3["§3.2 Training"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Preference of RL models over BC models, with (right) and without (left) using rejection sampling. RL slightly improves preference, but only when not using rejection sampling. Error bars represent ± 1 \pm 1 standard error.](https://arxiv.org/html/2112.09332v3/rl_v_bc_eval.svg)

*Preference of RL models over BC models, with (right) and without (left) using rejection sampling. RL slightly improves preference, but only when not using rejection sampling. Error bars represent ± 1 \pm 1 standard error.*

<sub>figure: `2112.09332v3/rl_v_bc_eval.svg`</sub>

## 机制
### 1. Environment design

Previous work on question-answering such as REALM ( Guu et al., 2020 ) and RAG ( Lewis et al., 2020a ) has focused on improving document retrieval for a given query. Instead, we use a familiar existing method for this: a modern search engine (Bing). This has two main advantages. First, modern search engines are already very powerful, and index a large number of up-to-date documents. Second, it allows us to focus on the higher-level task of using a search engine to answer questions, something that humans can do well, and that a language model can mimic. For this approach, we designed a text-based web-browsing environment. The language model is prompted with a written summary of the current state of the environment, including the question, the text of the current page at the current cursor location, and some other information (see Figure 1 ( 1(b) )). In response to this, the model must issue one of the commands given in Table 1 , which performs an action such as running a Bing search, clicking on a link, or scrolling around. This process is then repeated with a fresh context (hence, the only memory of previous steps is what is recorded in the summary). While the model is browsing, one of the actions it can take is to quote an extract from the current page. When this is performed, the page title, domain name and extract are recorded to be used later as a reference. Browsing then continues until either the model issues a command to end browsing, the maximum number of actions has been reached, or the maximum total length of references has been reached. At this point, as long as there is at least one reference, the model is prompted with the question and the references, and must compose its final answer. Further technical details about our environment can be found in Appendix A .

<sub>§2 Environment design</sub>

### 2. Methods

Behavior cloning (BC). We fine-tuned on the demonstrations using supervised learning, with the commands issued by the human demonstrators as labels. Reward modeling (RM). Starting from the BC model with the final unembedding layer removed, we trained a model to take in a question and an answer with references, and output a scalar reward. Following Stiennon et al. (2020) , the reward represents an Elo score, scaled such that the difference between two scores represents the logit of the probability that one will be preferred to the other by the human labelers. The reward model is trained using a cross-entropy loss, with the comparisons as labels. Ties are treated as soft 50% labels. Reinforcement learning (RL). Once again following Stiennon et al. (2020) , we fine-tuned the BC model on our environment using PPO ( Schulman et al., 2017 ) . For the environment reward, we took the reward model score at the end of each episode, and added this to a KL penalty from the BC model at each token to mitigate overoptimization of the reward model. Rejection sampling (best-of- n ). We sampled a fixed number of answers (4, 16 or 64) from either the BC model or the RL model (if left unspecified, we used the BC model), and selected the one that was ranked highest by the reward model. We used this as an alternative method of optimizing against the reward model, which requires no additional training, but instead uses more inference-time compute.

<sub>§3 Methods</sub>

### 3. Data collection

Guidance from humans is central to our approach. A language model pre-trained on natural language would not be able to use our text-based browser, since it does not know the format of valid commands. We therefore collected examples of humans using the browser to answer questions, which we call demonstrations . However, training on demonstrations alone does not directly optimize answer quality, and is unlikely to lead far beyond human performance ( Stiennon et al., 2020 ) . We therefore collected pairs of model-generated answers to the same question, and asked humans which one they preferred, which we call comparisons . For both demonstrations and comparisons, the vast majority of questions were taken from ELI5 ( Fan et al., 2019 ) , a dataset of long-form questions. For diversity and experimentation, we also mixed in a small number of questions from other sources, such as TriviaQA ( Joshi et al., 2017 ) . In total, we collected around 6,000 demonstrations, 92% of which were for questions from ELI5, and around 21,500 comparisons, 98% of which were for questions from ELI5. A more detailed breakdown of the questions we used along with post-processing details can be found in Appendix B . To make it easier for humans to provide demonstrations, we designed a graphical user interface for the environment (see Figure 1 ( 1(a) )). This displays essentially the same information as the text-based interface and allows any valid action to be performed, but is more human-friendly. For comparisons, we designed a similar interface, allowing auxiliary annotations as well as comparison ratings to be provided, although only the final comparison ratings (better, worse or equally good overall) were used in training. For both demonstrations and comparisons, we emphasized that answers should be relevant, coherent, and supported by trustworthy references. Further details about these criteria and other aspects of our data collection pipeline can be found in Appendix C . We are releasing a dataset of comparisons, the details of which can be found in Appendix K .

<sub>§3.1 Data collection</sub>

### 4. Training

The use of pre-trained models is crucial to our approach. Many of the underlying capabilities required to successfully use our environment to answer questions, such as reading comprehension and answer synthesis, emerge as zero-shot capabilities of language models ( Brown et al., 2020 ) . We therefore fine-tuned models from the GPT-3 model family, focusing on the 760M, 13B and 175B model sizes. Starting from these models, we used four main training methods: We used mutually disjoint sets of questions for each of BC, RM and RL. For BC, we held out around 4% of the demonstrations to use as a validation set. For RM, we sampled answers for the comparison datasets in an ad-hoc manner, using models of various sizes (but primarily the 175B model size), trained using various combinations of methods and hyperparameters, and combined them into a single dataset. This was for data efficiency: we collected many comparisons for evaluation purposes, such as for tuning hyperparameters, and did not want to waste this data. Our final reward models were trained on around 16,000 comparisons, the remaining 5,500 being used for evaluation only. For RL, we trained on a mixture of 90% questions from ELI5 and 10% questions from TriviaQA. To improve sample efficiency, at the end of each episode we inserted 15 additional answering-only episodes using the same references as the previous episode. We were motivated to try this because answering explained slightly more of the variance in reward model score than browsing despite taking many fewer steps, and we found it to improve sample efficiency by approximately a factor of 2. We also randomized the maximum number of browsing actions, sampling uniformly from the range 20–100 inclusive. Hyperparameters for all of our training methods can be found in Appendix E .

<sub>§3.2 Training</sub>

## 总结与展望
WebGPT 用浏览器辅助人做问答，并用人类偏好训练。它在方法方向的地位是「检索 + 引用 + 人评」这套流程的早期完整实现，也是后来所有 deep research 系统的结构原型。

**It connects to**

- `2304.09848` — 后来的可核查性评测直接继承了它的引用形态。

## 不足之处
**The authors say:** Imitative falsehoods. These are false statements that are incentivized by the training objective (even in the limit of infinite data and compute), such as reproducing common misconceptions ( Lin et al., 2021 ) .

**What a reader should still not conclude**

- 模型规模与今天不同，绝对分数不可比。

<sub>§6 Discussion</sub>

---

# Self-Refine : Iterative Refinement with Self-Feedback

arXiv:2303.17651 · 2023 · [source](https://arxiv.org/html/2303.17651)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Although large language models ( LLM s) can generate coherent outputs, they often fall short in addressing intricate requirements. This mostly includes tasks with multifaceted objectives, such as dialogue response generation, or tasks with hard-to-define goals, such as enhancing program readability. In these scenarios, modern LLM s may produce an intelligible initial output, yet may benefit from further iterative refinement—i.e., iteratively mapping a candidate output to an improved one—to ensure that the desired quality is achieved. Iterative refinement typically involves training a refinement model that relies on domain-specific data (e.g., Reid and Neubig (2022) ; Schick et al. (2022a) ; Welleck et al. (2022) ). Other approaches that rely on external supervision or reward models require large training sets or expensive human annotations ( Madaan et al., 2021 ; Ouyang et al., 2022 ) , which may not always be feasible to obtain. These limitations underscore the need for an effective refinement approach that can be applied to various tasks without requiring extensive supervision.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Iterative Refinement with Self-Refine"]
  N1["§Initial generation"]
  N2["§feedback"]
  N3["§refine"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Given an input ( \raisebox{-1pt} {\footnotesize{0}\vphantom{a}}⃝ ), Self-Refine starts by generating an output and passing it back to the same model ℳ \mathcal{M} to get feedback ( \raisebox{-1pt} {\footnotesize{1}\vphantom{a}}⃝ ). The feedback is passed back to ℳ \mathcal{M} , which refines the previously generated output ( \raisebox{-1pt} {\footnotesize{2}\vphantom{a}}⃝ ). Steps ( \raisebox{-1pt} {\footnotesize{1}\vphantom{a}}⃝ ) and ( \raisebox{-1pt} {\footnotesize{2}\vphantom{a}}⃝ ) iterate until a stopping condition is met. Self-Refine is instantiated with a language model such as GPT-3.5 and does not involve human assistance.](https://arxiv.org/html/2303.17651v2/autofb_figv3.png)

*Given an input ( \raisebox{-1pt} {\footnotesize{0}\vphantom{a}}⃝ ), Self-Refine starts by generating an output and passing it back to the same model ℳ \mathcal{M} to get feedback ( \raisebox{-1pt} {\footnotesize{1}\vphantom{a}}⃝ ). The feedback is passed back to ℳ \mathcal{M} , which refines the previously generated output ( \raisebox{-1pt} {\footnotesize{2}\vphantom{a}}⃝ ). Steps ( \raisebox{-1pt} {\footnotesize{1}\vphantom{a}}⃝ ) and ( \raisebox{-1pt} {\footnotesize{2}\vphantom{a}}⃝ ) iterate until a stopping condition is met. Self-Refine is instantiated with a language model such as GPT-3.5 and does not involve human assistance.*

<sub>figure: `2303.17651v2/autofb_figv3.png`</sub>

## 机制
### 1. Iterative Refinement with Self-Refine

Given an input sequence, Self-Refine generates an initial output, provides feedback on the output, and refines the output according to the feedback. Self-Refine iterates between feedback and refinement until a desired condition is met. Self-Refine relies on a suitable language model and three prompts (for initial generation, feedback, and refinement), and does not require training. Self-Refine is shown in Figure 1 and Algorithm 1 . Next, we describe Self-Refine in more detail.

<sub>§2 Iterative Refinement with Self-Refine</sub>

### 2. Initial generation

Given an input x x , prompt p gen p_{\text{gen}} , and model ℳ \mathcal{M} , Self-Refine generates an initial output y 0 y_{0} : For example, in Figure 2(d) , the model generates functionally correct code for the given input. Here, p gen p_{\text{gen}} is a task-specific few-shot prompt (or instruction) for an initial generation, and ∥ \| denotes concatenation. The few-shot prompt contains input-output pairs ⟨ x ( k ) , y ( k ) ⟩ \langle x^{(k)},y^{(k)}\rangle for the task. 2 2 2 Few-shot prompting (also referred to as “in-context learning”) provides a model with a prompt consisting of k k in-context examples of the target task, each in the form of input-output pairs ⟨ x i , y i ⟩ \langle x_{i},y_{i}\rangle ( Brown et al., 2020 ) .

<sub>§Initial generation</sub>

### 3. feedback

Next, Self-Refine uses the same model ℳ \mathcal{M} to provide feedback f ​ b t fb_{t} on its own output, given a task-specific prompt p fb p_{\text{fb}} for generating feedback: Intuitively, the feedback may address multiple aspects of the output. For example, in code optimization, the feedback might address the efficiency, readability, and overall quality of the code. Here, the prompt p fb p_{\text{fb}} provides examples of feedback in the form of input-output-feedback triples ⟨ x ( k ) , y ( k ) , f ​ b ( k ) ⟩ \langle x^{(k)},y^{(k)},fb^{(k)}\rangle . We prompt the model to write feedback that is actionable and specific via f ​ b ( k ) fb^{(k)} . By ‘actionable’, we mean the feedback should contain a concrete action that would likely improve the output. By ‘specific’, we mean the feedback should identify concrete phrases in the output to change. For example, the feedback in Figure 2(e) is “ This code is slow as it uses a for loop which is brute force. A better approach is to use the formula … (n(n+1))/2 ”. This feedback is actionable, since it suggests the action ‘use the formula…’. The feedback is specific since it mentions the ‘for loop’.

<sub>§feedback</sub>

### 4. refine

Next, Self-Refine uses ℳ \mathcal{M} to refine its most recent output, given its own feedback: For example, in Figure 2(f) , given the initial output and the generated feedback, the model generates a re-implementation that is shorter and runs much faster than the initial implementation. The prompt p refine p_{\text{refine}} provides examples of improving the output based on the feedback, in the form of input-output-feedback-refined quadruples ⟨ x ( k ) , y t ( k ) , f ​ b t ( k ) , y t + 1 ( k ) ⟩ \langle x^{(k)},y_{t}^{(k)},fb_{t}^{(k)},y_{t+1}^{(k)}\rangle . Iterating Self-Refine Self-Refine alternates between feedback and refine steps until a stopping condition is met. The stopping condition stop ⁡ ( f ​ b t , t ) \mathrm{stop}(fb_{t},t) either stops at a specified timestep t t , or extracts a stopping indicator (e.g. a scalar stop score) from the feedback. In practice, the model can be prompted to generate a stopping indicator in p fb p_{\text{fb}} , and the condition is determined per-task. To inform the model about the previous iterations, we retain the history of previous feedback and outputs by appending them to the prompt. Intuitively, this allows the model to learn from past mistakes and avoid repeating them. More precisely, Equation 3 is in fact instantiated as: Finally, we use the last refinement y t y_{t} as the output of Self-Refine . Algorithm 1 summarizes Self-Refine , and Figure 2 shows an example of Self-Refine in the Dialogue Response Generation ( Mehri and Eskenazi, 2020 ) and Code Optimization ( Madaan et al., 2023 ) tasks. Appendix S provides examples of the p gen p_{\text{gen}} , p fb p_{\text{fb}} , p refine p_{\text{refine}} prompts for various tasks. The key idea is that Self-Refine uses the same underlying LLM to generate, get feedback, and refine its outputs given its own feedback. It relies only on supervision present in the few-shot examples.

<sub>§refine</sub>

## 总结与展望
Self-Refine 是自改进宣称的标准阴性对照：同一个模型给自己反馈、自己改，最多四轮，七个任务上都有效果。它对我们的意义有两层——一层是正面的，说明「自我批评」确实能带来提升；另一层更重要：后面 2607.12227 用它证明「自动 harness 进化打不过简单的 test-time scaling」，也就是说这种提升很容易被更便宜的办法复制。我们做调研时如果只读到前者，会高估自改进的稀缺性。

**It connects to**

- `2303.11366` — Self-Refine 是单轮任务内的迭代，Reflexion 把反思存下来跨任务复用；后者才是我们知识库的原型。
- `2202.03629` — 两者都在讨论「模型自己说的话可不可信」，一个在生成质量上、一个在事实性上。

## 不足之处
**The authors say:** The main limitation of our approach is that the base models need to have sufficient few-shot modeling or instruction-following abilities, in order to learn to provide feedback and to refine in an in-context fashion, without having to train supervised models and rely on supervised data.

**What a reader should still not conclude**

- 它的反馈来自同一个模型，等于自己给自己判分；在我们这里这个循环还多一层——判分器是一条命令，不是模型。
- 机制段抽到的是评估任务与实例化两小节，四轮的上限是经验值，没有说明为什么是四。

<sub>§6 Limitations and Discussion</sub>

---

# ResearchRubrics : A Benchmark of Prompts and Rubrics For Evaluating Deep Research Agents

arXiv:2511.07685 · 2025 · [source](https://arxiv.org/html/2511.07685)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
An exciting development in the growing capabilities of large language models (LLMs) is the emergence of Deep Research agents: autonomous LLM-based systems that conduct multi-step web exploration, targeted retrieval, and synthesis to answer open-ended queries. Industry leaders have begun deploying such systems (e.g., OpenAI’s “Deep Research” [ 18 ] and Google’s “Gemini Deep Research” [ 9 ] ), which have demonstrated strong performance on certain benchmarks (for instance, scoring 26.6% on the expert-level HLE benchmark Phan et al. [21] ). However, evaluating deep research agents poses significant challenges. Deep Research (DR) tasks are inherently open-ended: they require reasoning across multiple documents, often with no single “correct” answer, and their outputs can be long and varied. Consequently, existing evaluation methods fall short. Typical QA benchmarks, both general [ 29 , 17 , 21 , 14 ] and deep research specific [ 13 , 5 ] , focus on short, easily-verifiable factual answers and do not capture the long-form, multi-source synthesis required by DR, e.g., “Which material has band gap 0.9 eV 0.9\text{\,}\mathrm{eV} , dislocation density 4 × 10 8 4\times 10^{8} cm − 2 \text{\,}{\mathrm{cm}}^{-2} ?” with the unique answer “Gallium nitride (GaN)” . Such benchmarks do not capture the long-form, multi-source synthesis required by DR.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Overview of ResearchRubrics"]
  N1["§3.1 Data Collection and Task Domains"]
  N2["§3.2 Prompt Complexity Dimensions"]
  N3["§3.3 Rubric Design"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Overview of ResearchRubrics and its evaluation pipeline.](https://arxiv.org/html/2511.07685v1/model_evaluation.png)

*Overview of ResearchRubrics and its evaluation pipeline.*

<sub>figure: `2511.07685v1/model_evaluation.png`</sub>

## 机制
### 1. Overview of ResearchRubrics

ResearchRubrics consists of 101 single-turn prompts, each paired with a set of 20–43 prompt-specific rubric criteria. Every prompt and criterion in ResearchRubrics was written and iteratively refined by human experts to ensure clarity and relevance (no criteria were seeded or generated by LLMs). The prompts cover a wide range of topics and inquiry types to emulate real user questions that deep research agents receive. In total, the benchmark contains 2,593 unique rubric items, enabling a fine-grained assessment of open-ended, realistic research queries. Figurer 2 og 1 provide an overview of our benchmark design and evaluation process. Mandatory criteria define the minimum requirements for a valid response, i.e., core elements that must be satisfied for the answer to be considered correct or adequate. Optional criteria capture desirable but non-essential qualities (“nice-to-have” behaviors) that distinguish strong responses from merely sufficient ones.

<sub>§3 Overview of ResearchRubrics</sub>

### 2. Data Collection and Task Domains

Our data collection pipeline consists of three expert participants, as shown in Figur 2 . In this context, we define an “expert” as an individual with a strong STEM background who is skilled in task design and evaluation, rather than a domain-specific specialist for each prompt. All participants in our data collection only chose and worked on domains they were familiar with. The pipeline involves three experts, each assigned to a distinct and separate role. Expert 1 initially proposes a prompt and a set of rubric criteria. This proposal is then passed to Expert 2 for review. Expert 2 provides feedback and iterates with Expert 1 until the pair is approved. Finally, Expert 3 conducts a final, independent review and makes any last adjustments. This three-participant setup ensures that each component is thoroughly reviewed multiple times, guaranteeing high quality in the final data. To ensure realism and variety, initial prompt ideas were drawn from user forums, Q&A sites, and brainstorming sessions, then adapted to represent the range of research-like questions a deep reasoning agent might encounter. The result is a collection of prompts that span both breadth (a wide variety of domains) and depth (challenging multi-step problems). For each finalized prompt, experts developed a detailed rubric specifying what an ideal response should include and which common errors to avoid, following the pipeline detailed in Figur 2 . We weighted each criterion based on its importance (see Afsnit 3.3 ) and included negative criteria targeting likely pitfalls, such as factually incorrect statements, off-topic tangents, or disallowed content. We curated prompts from nine broad categories (see Tabel 10 in the Appendix for a detailed description of each category) to maximize diversity. These range from technical documentation to historical analysis, creative writing, and current events. Figur 3 shows the distribution of categories in ResearchRubrics . The distribution is fairly even, with AI/ML and historical analysis queries constituting the largest portions closely, followed by domains like general consumer research, reflecting both specialized academic topics and everyday research questions. Other categories provide targeted challenges (e.g., creative synthesis or real-time news retrieval). This diversity ensures that a DR agent must draw on a wide range of knowledge sources and adapt to different task structures.

<sub>§3.1 Data Collection and Task Domains</sub>

### 3. Prompt Complexity Dimensions

Not all research prompts are equal—some involve a broader knowledge base, others require deeper reasoning, and others are underspecified and exploratory. We categorize each ResearchRubrics task along three orthogonal complexity dimensions: Conceptual Breadth , Logical Nesting Depth , and Exploration ( Tabel 2 ). This framework helps ensure our benchmark covers a balanced mix of task types and allows analysis of where agents struggle most. Every task in ResearchRubrics is annotated with a triplet of (Breadth, Depth, Ambiguity) labels. In our evaluations, we analyze model performance across these dimensions to see, for example, if a model struggles more with breadth (integrating many sources) or with depth (long reasoning chains). This also helps researchers filter the benchmark for specific experiment focuses (e.g., testing only high-depth reasoning tasks).

<sub>§3.2 Prompt Complexity Dimensions</sub>

### 4. Rubric Design

ResearchRubrics is a rubric-based benchmark: each prompt is judged against a tailored set of criteria that define the requirements of a good answer. ResearchRubrics also separates mandatory (required for sufficiency) from optional criteria, addressing a key gap in existing benchmarks. Tabel 3 presents the six broad evaluation axes used to assess response quality. Each axis contains multiple rubric criteria, which are categorized as either mandatory or optional . Each criterion is assigned a numerical weight in the range [ − 5 , 5 ] \left[-5,5\right] , reflecting its relative importance. Weights of ± 4 \pm 4 or ± 5 \pm 5 correspond to mandatory criteria, while criteria with weights in [ − 3 , 3 ] \left[-3,3\right] are optional. Positive weights reward the presence of valuable attributes, while negative weights penalize common failure modes such as factual inaccuracies, irrelevance, or verbosity. These weights are aligned with a calibrated human preference scale ( Tabel 4 ) spanning six levels, from Critically Detrimental to Critically Important . This mapping encourages more consistent human–model agreement during grading.

<sub>§3.3 Rubric Design</sub>

## 总结与展望
ResearchRubrics 提供了一个带评分细则的研究报告基准，把「好报告」拆成可逐条检查的条目。它对本方向最直接：我们的封印报告现在只检查「claim 是否被证据支持」，没有检查「报告是否覆盖了该覆盖的方面」。

**It connects to**

- `2304.09848` — 一个测引用是否支持句子，一个测内容是否覆盖要点。

## 不足之处
**The authors say:** The consistency of failure patterns across systems—45-50% implicit criteria failures (see Figur 5 ), poor multi-hop reasoning, synthesis bottlenecks—indicates fundamental architectural constraints rather than implementation differences. Multi-hop reasoning studies [ 29 ] demonstrate that while agents achieve 80%+ success on first-hop inference, bridge entity resolution in early neural layers creates hard limits on subsequent reasoning depth. This explains the limited improvements from prompt engineering alone.

**What a reader should still not conclude**

- 细则由人写，覆盖范围受作者视野限制。
- 评分仍需模型或人执行，执行者偏差没有系统测量。

<sub>§Architectural Limitations Beyond Prompt Engineering</sub>

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
  N0["§3 Reflexion: reinforcement via verbal reflection"]
  N1["§Actor"]
  N2["§Evaluator"]
  N3["§Self-reflection"]
  N4["§Memory"]
  N5["§The Reflexion process"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Reflexion works on decision-making 4.1 , programming 4.3 , and reasoning 4.2 tasks.](https://arxiv.org/html/2303.11366v4/reflexion_tasks.svg)

*Reflexion works on decision-making 4.1 , programming 4.3 , and reasoning 4.2 tasks.*

<sub>figure: `2303.11366v4/reflexion_tasks.svg`</sub>

## 机制
### 1. Reflexion: reinforcement via verbal reflection

We develop a modular formulation for Reflexion, utilizing three distinct models: an Actor , denoted as M a M_{a} , which generates text and actions; an Evaluator model, represented by M e M_{e} , that scores the outputs produced by M a M_{a} ; and a Self-Reflection model, denoted as M s ​ r M_{sr} , which generates verbal reinforcement cues to assist the Actor in self-improvement. We provide a detailed description of each of these models and subsequently elucidate their collaborative functioning within the Reflexion framework.

<sub>§3 Reflexion: reinforcement via verbal reflection</sub>

### 2. Actor

The Actor is built upon a large language model (LLM) that is specifically prompted to generate the necessary text and actions conditioned on the state observations. Analogous to traditional policy-based RL setups, we sample an action or generation, a t a_{t} , from the current policy π θ \pi_{\theta} at time t t , receive an observation from the environment o t o_{t} . We explore various Actor models, including Chain of Thought [ 26 ] and ReAct [ 30 ] . These diverse generation models allow us to explore different aspects of text and action generation within the Reflexion framework, providing valuable insights into their performance and effectiveness. In addition, we also add a memory component mem that provides additional context to this agent. This adaption was inspired by Brooks et al., [3] , who suggest a policy iteration approach using in-context learning. Details on how this is populated are provided below.

<sub>§Actor</sub>

### 3. Evaluator

The Evaluator component of the Reflexion framework plays a crucial role in assessing the quality of the generated outputs produced by the Actor. It takes as input a generated trajectory and computes a reward score that reflects its performance within the given task context. Defining effective value and reward functions that apply to semantic spaces is difficult, so we investigate several variants of the Evaluator model. For reasoning tasks, we explore reward functions based on exact match (EM) grading, ensuring that the generated output aligns closely with the expected solution. In decision-making tasks, we employ pre-defined heuristic functions that are tailored to specific evaluation criteria. Additionally, we experiment with using a different instantiation of an LLM itself as an Evaluator, generating rewards for decision-making and programming tasks. This multi-faceted approach to Evaluator design allows us to examine different strategies for scoring generated outputs, offering insights into their effectiveness and suitability across a range of tasks.

<sub>§Evaluator</sub>

### 4. Self-reflection

The Self-Reflection model instantiated as an LLM, plays a crucial role in the Reflexion framework by generating verbal self-reflections to provide valuable feedback for future trials. Given a sparse reward signal, such as a binary success status (success/fail), the current trajectory, and its persistent memory mem , the self-reflection model generates nuanced and specific feedback. This feedback, which is more informative than scalar rewards, is then stored in the agent’s memory ( mem ). For instance, in a multi-step decision-making task, when the agent receives a failure signal, it can infer that a specific action a i a_{i} led to subsequent incorrect actions a i + 1 a_{i+1} and a i + 2 a_{i+2} . The agent can then verbally state that it should have taken a different action, a i ′ a_{i}^{\prime} , which would have resulted in a i + 1 ′ a_{i+1}^{\prime} and a i + 2 ′ a_{i+2}^{\prime} , and store this experience in its memory. In subsequent trials, the agent can leverage its past experiences to adapt its decision-making approach at time t t by choosing action a i ′ a_{i}^{\prime} . This iterative process of trial, error, self-reflection, and persisting memory enables the agent to rapidly improve its decision-making ability in various environments by utilizing informative feedback signals.

<sub>§Self-reflection</sub>

### 5. Memory

Core components of the Reflexion process are the notion of short-term and long-term memory. At inference time, the Actor conditions its decisions on short and long-term memory, similar to the way that humans remember fine-grain recent details while also recalling distilled important experiences from long-term memory. In the RL setup, the trajectory history serves as the short-term memory while outputs from the Self-Reflection model are stored in long-term memory. These two memory components work together to provide context that is specific but also influenced by lessons learned over several trials, which is a key advantage of Reflexion agents over other LLM action choice works.

<sub>§Memory</sub>

### 6. The Reflexion process

Reflexion is formalized as an iterative optimization process in 1 . In the first trial, the Actor produces a trajectory τ 0 \tau_{0} by interacting with the environment. The Evaluator then produces a score r 0 r_{0} which is computed as r t = M e ​ ( τ 0 ) r_{t}=M_{e}(\tau_{0}) . r t r_{t} is only a scalar reward for trial t t that improves as task-specific performance increases. After the first trial, to amplify r 0 r_{0} to a feedback form that can be used for improvement by an LLM, the Self-Reflection model analyzes the set of { τ 0 , r 0 } \{\tau_{0},r_{0}\} to produce a summary s ​ r 0 sr_{0} which is stored in the memory mem . s ​ r t sr_{t} is a verbal experience feedback for trial t t . The Actor, Evaluator, and Self-Reflection models work together through trials in a loop until the Evaluator deems τ t \tau_{t} to be correct. As mentioned in 3 , the memory component of Reflexion is crucial to its effectiveness. After each trial t t , s ​ r t sr_{t} , is appended mem . In practice, we bound mem by a maximum number of stored experiences, Ω \Omega (usually set to 1-3) to adhere to max context LLM limitations.

<sub>§The Reflexion process</sub>

## 总结与展望
Reflexion 把「反思」变成一种不更新权重的强化学习：失败后写一段语言反思存进情景记忆，下次遇到同类任务时读出来。它对本方向的意义是给出了「经验如何被沉淀」的最小实现，也暴露了最小实现的弱点——论文自己在局限里说它可能陷入非最优的局部极小。我们的 knowledge.json 是同一结构的放大版，却没有对应的「陷在局部」的检测。

**It connects to**

- `2303.17651` — 同一族的两支：一个在同一任务里迭代，一个把迭代结果存下来跨任务用。
- `2302.04761` — Toolformer 用损失筛选调用，Reflexion 用下游分数筛选经验；两者都是「没有显式好坏标签时怎么办」。

## 不足之处
**The authors say:** At its core, Reflexion is an optimization technique that uses natural language to do policy optimization. Policy optimization is a powerful approach to improve action choice through experience, but it may still succumb to non-optimal local minima solutions. In this study, we limit long-term memory to a sliding window with maximum capacity, but we encourage future work to extend the memory component of Reflexion with more advanced structures such as vector embedding databases or traditional SQL databases. Specific to code generation, there are many practical limitations to test-driven development in specifying accurate input-output mappings such as non-deterministic generator functions, impure functions that interact with APIs, functions that vary output according to hardware specifications, or functions that invoke parallel or concurrent behavior that may be difficult to predict.

**What a reader should still not conclude**

- 它的记忆是按任务类型索引的文本，没有去重与冲突消解；放大到上百条时会互相矛盾，论文规模没到那一步。
- 机制段抽到的是实验设置三小节，反思的提示模板与记忆容量在附录里。

<sub>§5 Limitations</sub>

---

# BrowseComp-Plus: A More Fair and Transparent Evaluation Benchmark of Deep-Research Agent

arXiv:2508.06600 · 2025 · [source](https://arxiv.org/html/2508.06600)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Recent benchmarks for evaluating Deep-Research Agents, such as BrowseComp [ 1 ] , have showcased the impressive capabilities of combining large language models (LLMs) with web search tools in solving complex, reasoning-intensive queries [ 2 , 3 ] . These benchmarks typically provide sets of queries paired directly with answers, agents are employed with live web search APIs to retrieve supporting documents in real time [ 4 , 5 ] . While this approach effectively assesses the end-to-end performance of Deep-Research agents, it introduces several critical limitations that impede systematic analysis and evaluation of individual system components.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 BrowseComp-Plus"]
  N1["§3.1 Preliminary: BrowseComp"]
  N2["§3.2 Building the Document Corpus"]
  N3["§3.2.1 Evidence Document Gathering"]
  N4["§3.2.2 Evidence Document Verification"]
  N5["§3.3 Hard Negative Mining"]
  N6["§3.4 Final Corpus Statistics"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

![Accuracy vs. number of search calls for Deep-Research agents with different retrievers. GPT5, o3, gpt-oss are evaluated with high reasoning effort. The figure shows that Deep Research agents mostly improve the final accuracy at a cost of more search calls, whereas better retrieval systems not only improve the overall accuracy but also reduce the number of search calls .](https://arxiv.org/html/2508.06600v1/figures/teaser.png)

*Accuracy vs. number of search calls for Deep-Research agents with different retrievers. GPT5, o3, gpt-oss are evaluated with high reasoning effort. The figure shows that Deep Research agents mostly improve the final accuracy at a cost of more search calls, whereas better retrieval systems not only improve the overall accuracy but also reduce the number of search calls .*

<sub>figure: `2508.06600v1/figures/teaser.png`</sub>

## 机制
### 1. BrowseComp-Plus

In this section, we provide details on the construction of the proposed BrowseComp-Plus dataset, which builds upon BrowseComp [ 1 ] to further enable independent evaluation of the retrieval and LLM components within the Deep-Research framework. Comprehensive coverage: The corpus must provide complete evidence to support the entire reasoning chain required to answer each question. Retrieval difficulty: It should contain enough distracting negative documents so that search agents and retrievers are challenged in locating the correct evidence. Practical size: The corpus should be large enough to yield reliable research insights, but avoid too-large computation costs for research purposes. Confirm that each clue is sufficiently justified by the supporting documents. Instead of simply confirming the match, annotators must label the text spans in the documents that justify each clue, as this explicit step encourages high-quality verification. Determine whether the combination of clues and supporting evidence enables a human to answer the entirety of the question correctly. For instance, if a query asks for an individual matching five characteristics, all five must be verifiable from the documents.

<sub>§3 BrowseComp-Plus</sub>

### 2. Preliminary: BrowseComp

The BrowseComp benchmark comprises 1,266 challenging fact-seeking questions specifically designed to assess the capability of Deep-Research AI agents to interactively and creatively navigate the web for complex, hard-to-find information [ 1 ] . The questions are deliberately constructed to be difficult for both humans and LLMs, yet they feature verifiable, concise answers, enabling straightforward evaluation through simple answer matching. While effective and widely employed for end-to-end evaluation of integrated deep research systems, this approach complicates the isolated measurement of retrieval effectiveness within these frameworks.

<sub>§3.1 Preliminary: BrowseComp</sub>

### 3. Building the Document Corpus

Constructing a corpus for BrowseComp questions is non-trivial. Three key challenges must be addressed: To meet these criteria, we curate evidence documents through a two-stage pipeline involving automated evidence mining followed by human verification, and perform hard-negative mining via web search to attach challenging, distracting documents to each query. The sections below describe this process in detail and present a 100k-document corpus that effectively supports the study of the Deep Research framework.

<sub>§3.2 Building the Document Corpus</sub>

### 4. Evidence Document Gathering

The original BrowseComp dataset contains only question-answer pairs, without the URLs of the web pages that support these answers. To build a document collection with supporting evidence, the first step involves retrieving relevant web pages for each question. To achieve this, we leverage the OpenAI o3 model with web search enabled. We provide the question-answer pairs as input prompts and instruct the model to search online for web pages containing evidence that supports the answers. We also ask the model to structure the output in a table format with three columns: (1) Clue: the part of the question that can help derive the answer; (2) URL: the web page link containing evidence supporting the clue; and (3) Evidence: the content from the web page that supports the clue. The purpose of this table format is to facilitate human annotators in verifying each clue and its corresponding web page in the next step. An example prompt for this step is provided in Appendix A . Of the 1,266 original question-answer pairs in BrowseComp, the OpenAI o3 model fails to provide supporting evidence for 124 pairs, either due to output formatting errors or because the model abstains from answering due to low confidence. For the remaining 1,142 pairs, we scrape the URLs cited as evidence using Selenium 1 1 1 https://www.selenium.dev/documentation , and parse them with Trafilatura [ 31 ] . However, a combination of hallucinated URLs and scraping challenges prevents us from successfully scraping all of them. As a result, we exclude 137 question-answer pairs that contain at least one URL that we are unable to scrape, as missing a URL for a clue will make the question incomplete to answer. This leaves us with 1,005 queries for the next stage: human verification.

<sub>§3.2.1 Evidence Document Gathering</sub>

### 5. Evidence Document Verification

In this stage, we aim to verify documents that contain evidence for each clue in the questions. For each question-answer pair, we present human annotators with the output table from OpenAI o3 in the previous stage, with URLs replaced by the corresponding processed documents. If the original output from OpenAI o3 fails to meet both criteria, annotators are instructed to revise the clues and search the web for additional supporting documents for at least 20 minutes, before concluding that the desired evidence documents cannot be collected. In addition to constructing the evidence document set, annotators also label which documents directly contain the final answer; these are designated as gold documents . Note that a gold document is not defined merely by containing the ground-truth answer as an exact substring; in some cases, the answer is included in the document in an implicit way. For example, a question might ask for the number of publications by a particular author, with the ground-truth answer being “7”. A gold document in this case could be the author’s personal webpage listing their publications; while it may not contain the string “7” explicitly, it logically contains the answer. Similarly, there are many cases where the answer appears in the document in a variant form, such as a different date format or a paraphrased phrase, rather than an exact string match. Our goal in constructing the gold document set is to provide a more robust and semantically meaningful alternative to the simple substring-based approach in identifying documents that contain the final answer. Figure 2 illustrates the complete evidence document collection process. A detailed example, including a screenshot of the labeling interface shown to human annotators, is provided in Appendix B . For quality control, we sample each annotator’s labeled data and cross-validate them among annotators, showing over 80% of agreement on average. Overall, of the 1,005 question-answer pairs from the previous stage, 830 passed human verification. The most common failure mode occurs when the documents provided by OpenAI o3 do not satisfy the two verification criteria, and human annotators are unable to gather sufficient additional evidence within a reasonable effort. In addition to these, we identify and exclude several other categories of problematic cases as detailed in Appendix C . The entire labeling process involved 14 university student annotators and required over 400 hours of manual effort.

<sub>§3.2.2 Evidence Document Verification</sub>

### 6. Hard Negative Mining

To ensure the collected corpus remains a reasonable size while still being challenging enough for search systems to identify correct answers among distracting documents, we mine hard negative documents via web search to form the corpus. This approach has been proven effective in evaluating information retrieval systems using a small sub-sampled corpus [ 32 , 33 ] . Specifically, we take each question from BrowseComp and prompt GPT-4o to break it down into simpler, self-contained sub-queries. On average, this results in about seven sub-queries per original query. Each sub-query is then sent to a Google Search API provider (SerpAPI), which returns up to 100 search results. We scrape these results using the same process used for collecting documents during positive example construction. We illustrate this hard negative document collecting process in Figure 3 . The prompt used to create these sub-queries is provided in Appendix D .

<sub>§3.3 Hard Negative Mining</sub>

### 7. Final Corpus Statistics

After deduplicating the positive and negative documents collected as above, we arrive at a corpus of 100,195 documents, along with 830 queries. On average, each query contains 6.1 evidence documents, 76.28 negatives, and 2.9 gold documents. Each document averages 5179.2 words and 32296.2 characters.

<sub>§3.4 Final Corpus Statistics</sub>

## 总结与展望
BrowseComp-Plus 指出原基准的答案可能出现在训练数据里，于是构造了「答案不在预训练语料」的版本，并公开了检索索引。它的方法论贡献是：基准的可信度需要证明，而不是声明。

**It connects to**

- `2504.12516` — 同一基准的修正版本。
- `2504.03160` — 都把「语料是否干净」当成一等问题。

## 不足之处
**The authors say:** We believe that our BrowseComp-Plus opens new avenues for advancing research in the Deep-Research area. BrowseComp-Plus retains the challenging nature of the original BrowseComp while providing a more controlled and transparent experimental setup similar to early pivotal evaluation benchmarks like Natural Question (NQ) [ 27 ] and HotpotQA [ 30 ] . Like how NQ and HotpotQA have facilitated the design, comparison, and diagnosis of modern neural QA systems, we hope that BrowseComp-Plus will serve similar roles for Deep-Research agent studies. Here, we list some immediate research directions.

**What a reader should still not conclude**

- 构造干净语料需要大量人工，我们无法复制这个流程。

<sub>§5 Future Work and Discussion</sub>

---

# WebSailor: Navigating Super-human Reasoning for Web Agent

arXiv:2507.02592 · 2025 · [source](https://arxiv.org/html/2507.02592)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Information seeking, the fundamental human drive to resolve uncertainty, has been revolutionized by the internet ( Wilson, 1999 ; Jurado et al., 2015 ) . Yet, human ability to navigate this vast digital landscape is constrained by cognitive limits: finite memory, fragile attention, and an inability to pursue multiple exploratory paths in parallel. Leading proprietary agentic systems, such as Deep Research ( OpenAI, 2025a ) , show that Large Language Model (LLM) agents can transcend these human limitations. Their superhuman performance on complex web benchmarks like BrowseComp-en/zh ( Wei et al., 2025 ; Zhou et al., 2025 ) stems from sophisticated reasoning—internal or tool-mediated—that systematically reduces uncertainty ( Kapoor et al., 2024 ; Huang et al., 2023 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Large-scale Training Data Synthesis for Complex Reasoning"]
  N1["§3.1 SailorFog-QA: Scalable Graph-Synthesized QA"]
  N2["§Constructing the Structural Foundation for Hard-to-Reduce Uncertainty"]
  N3["§Generating High-Uncertainty Questions via Subgraph Sampling and Obfuscation"]
  N4["§3.2 Reconstructing Reasoning from Expert LRM Trajectories"]
  N5["§4 Reinforcement Learning with Cold Start"]
  N6["§4.1 Rejection Sampling Fine-Tuning"]
  N7["§Setup"]
  N8["§Filtering"]
  N9["§Training objective"]
  N10["§4.2 Duplicating Sampling Policy Optimization"]
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
```

![Performance on the BrowseComp-en/zh benchmarks. DeepSeek-R1-Browse is DeepSeek-R1 equipped with browsing tools via the ReAct framework, sharing the same implementation as our model, WebSailor. Doubao-Search and Grok-3 are proprietary web-based products (marked by ∗ * ). The result for GPT-4o with browsing is taken from OpenAI’s official publication.](https://arxiv.org/html/2507.02592v1/abs_fig_bc.svg)

*Performance on the BrowseComp-en/zh benchmarks. DeepSeek-R1-Browse is DeepSeek-R1 equipped with browsing tools via the ReAct framework, sharing the same implementation as our model, WebSailor. Doubao-Search and Grok-3 are proprietary web-based products (marked by ∗ * ). The result for GPT-4o with browsing is taken from OpenAI’s official publication.*

<sub>figure: `2507.02592v1/abs_fig_bc.svg`</sub>

## 机制
### 1. Large-scale Training Data Synthesis for Complex Reasoning

In this section, we present our training data construction from two perspectives: QA construction and reasoning trajectory generation. Level 1: tasks exhibit low uncertainty that is easily reduced. These include questions answerable by the model’s internal knowledge or through a single, straightforward web search. Level 2: tasks, such as multi-hop QA, present high initial uncertainty but follow a clear path to resolution. Even with many steps, the entities are linked by well-defined logic, allowing uncertainty to be systematically reduced through a structured sequence of actions. Level 3: the focus of our work, involves problems with both high uncertainty and high difficulty in its reduction. Here, entities are coupled in complex, emergent ways, lacking a pre-defined reasoning path. Solving these problems demands creative exploration and novel reasoning patterns that are difficult to specify manually. The data is grounded in the real-world internet, mirroring the challenges agents face in practice. The diverse subgraph topologies naturally produce problems requiring a spectrum of complex reasoning patterns, from multi-step deduction to compositional and comparative analysis. The approach is highly scalable, as the number of potential subgraphs—and thus challenging questions—grows non-linearly with the graph size, enabling efficient large-scale data synthesis. Stylistic Contamination: These LRMs possess strong, often verbose, stylistic priors in their reasoning. Directly fine-tuning on these outputs can be overly prescriptive, stifling the agent’s ability to develop its own exploratory strategies and generalize to unseen problems. Context Overload: The verbosity of their reasoning chains is a practical barrier for complex web agent tasks. A trajectory with dozens of tool calls can easily generate a history that exceeds the context limits, degrading performance and making the reasoning process intractable.

<sub>§3 Large-scale Training Data Synthesis for Complex Reasoning</sub>

### 2. SailorFog-QA: Scalable Graph-Synthesized QA

The reasoning patterns required to answer a question are dictated by its intrinsic uncertainty and the complexity of reducing that uncertainty. As shown in Fig. 2 , we classify information-seeking QAs into three levels based on these two dimensions.

<sub>§3.1 SailorFog-QA: Scalable Graph-Synthesized QA</sub>

### 3. Constructing the Structural Foundation for Hard-to-Reduce Uncertainty

To generate Level 3 tasks, we first construct a complex informational landscape where uncertainty is inherently difficult to reduce. Our process, inspired by random walks, builds knowledge graphs with emergent, non-linear structures. We begin by seeding the graph with a fuzzy entity retrieved from Wikidata’s SPARQL service to ensure a challenging starting point. Using simulated web browsing, we gather unstructured text and features about this entity from the internet. From this raw information, we extract related entities and the relationships connecting them, forming the initial nodes and edges. The crucial step is the iterative expansion: we probabilistically select existing nodes and seek out new, distinct entities to connect. This stochastic process discourages simple linear chains (characteristic of Level 2 tasks) and instead fosters a densely interconnected graph with intricate, overlapping relational paths. The resulting graph serves as a structural foundation for problems that lack a pre-defined reasoning path, compelling an agent to navigate a complex web of information rather than follow a straight line.

<sub>§Constructing the Structural Foundation for Hard-to-Reduce Uncertainty</sub>

### 4. Generating High-Uncertainty Questions via Subgraph Sampling and Obfuscation

With these complex graphs as a foundation, we generate questions characterized by high initial uncertainty. This is achieved by sampling subgraphs with diverse topologies, each representing a unique constellation of coupled entities and relations. We then formulate a question and an answer based on the subgraph. Critically, we introduce ambiguity through deliberate information obfuscation. Instead of presenting clear facts, we obfuscate features and relationships within the question. For example, a precise date is transformed into a vague period ("in the early 2010s"), a name is partially masked ("an institution founded by someone with the initial ’F’"), or a quantitative attribute is described qualitatively ("a market share of less than 1%"). This obfuscation directly increases the initial uncertainty, forcing the agent to reason, compare, and synthesize information rather than simply executing a lookup. We name our synthetic training data SailorFog-QA , which has three key advantages: To illustrate the characteristics of our generated Level 3 tasks, two examples are presented below. These questions epitomize our methodology: they feature multiple, intricately coupled entities and deliberately obfuscated information, such as vague time references ("around the mid-5th century", "early 21st century") and non-specific descriptors ("a prominent South American capital", "a respected arts institution"). This combination of structural complexity and informational ambiguity creates a high degree of initial uncertainty that is exceptionally difficult to reduce. In fact, our manual evaluations confirm that these problems are intractable for human researchers under typical time constraints (e.g., within two hours), as they lack clear starting points for search and require extensive, non-linear exploration. Further details on our QA generation process are available in Appendix A.2 .

<sub>§Generating High-Uncertainty Questions via Subgraph Sampling and Obfuscation</sub>

### 5. Reconstructing Reasoning from Expert LRM Trajectories

Having synthesized complex QA pairs, the next challenge is to generate corresponding solution trajectories for cold-start supervision. While powerful open-source LRMs like QwQ-32B ( Qwen Team, 2025 ) can provide some correct trajectories, directly using their full output for fine-tuning is counterproductive. We identify two critical issues: The process is as follows: first, we prompt an expert open-source LRM to generate a complete solution trajectory, including its native thoughts. From this full trajectory, we selectively discard the LRM’s original, verbose thoughts, retaining only the successful action-observation sequence ( a 0 , o 0 , a 1 , o 1 , … ) (a_{0},o_{0},a_{1},o_{1},\dots) . This trace represents the "what" and "how" of the solution path, but not the "why". Next, we reconstruct the missing "why". For each step t t in the action trace, we possess the history up to the previous step, ℋ t − 1 = ( τ ^ 0 , a 0 , o 0 , … , τ ^ t − 1 , a t − 1 , o t − 1 ) \mathcal{H}_{t-1}=(\hat{\tau}_{0},a_{0},o_{0},\dots,\hat{\tau}_{t-1},a_{t-1},o_{t-1}) , along with the expert’s chosen action a t a_{t} and the subsequent observation o t o_{t} . We then prompt a separate, powerful instruction-following model, π ∗ \pi^{*} , to generate a new thought τ ^ t \hat{\tau}_{t} that serves as a concise, logical justification for taking action a t a_{t} : By iteratively applying this for every step, we synthesize a complete, high-quality reasoning trajectory ℋ ^ T = ( τ ^ 0 , a 0 , o 0 , … , τ ^ T , a T , o T ) \hat{\mathcal{H}}_{T}=(\hat{\tau}_{0},a_{0},o_{0},\dots,\hat{\tau}_{T},a_{T},o_{T}) where the reasoning is clean and goal-oriented. For this reconstruction, we use another LLM and enforce a "short-CoT" style. This is a critical design choice, ensuring the final reasoning chain is compact enough for long-horizon tasks. This method allows us to scalably generate supervision data that instills complex reasoning patterns without the negative side effects of direct imitation.

<sub>§3.2 Reconstructing Reasoning from Expert LRM Trajectories</sub>

### 6. Reinforcement Learning with Cold Start

Our training methodology is a two-stage process. Inspired by recent advancements in post-training ( Chu et al., 2025 ; Swamy et al., 2025 ; Ye et al., 2025 ) which highlight the efficacy of targeted fine-tuning before more complex learning, we first employ a modest RFT phase as a "cold start". This initial phase aims to equip the model with fundamental tool-use capabilities and adherence to the long-horizon reasoning skeleton. Subsequently, we leverage RL to further refine the agent’s reasoning abilities, enhance its sample efficiency ( Yue et al., 2025 ) , and enable fuller utilization of our high-quality, complex training data.

<sub>§4 Reinforcement Learning with Cold Start</sub>

### 7. Setup

Within a complete trajectory ℋ T \mathcal{H}_{T} , the agent’s thoughts ( τ i \tau_{i} ) are enclosed by <think> and </think> tags. Actions ( a i a_{i} ) are demarcated by <tool_call> and </tool_call> for function calls, or <answer> and </answer> for final responses. The environment’s observations ( o i o_{i} ) resulting from tool calls are wrapped with <tool_response> and </tool_response> tags. Different segments are separated by these special tokens.

<sub>§Setup</sub>

### 8. Filtering

We apply a three-stage filtering process to the expert-generated trajectories. Firstly, to guarantee the correctness of the supervisory signal, we conduct rejection sampling that only trajectories culminating in a correct final answer are retained. Secondly, acknowledging that the expert models possess superior long-context processing capabilities compared to our policy model, we discard any trajectory exceeding 32k tokens in length. Thirdly, we filter for task complexity by retaining those trajectories with more than 5 5 tool calls, as intricate reasoning patterns and effective planning strategies typically manifest through a more extended sequence of decision-making steps.

<sub>§Filtering</sub>

### 9. Training objective

The training objective is to specifically enhance the agent’s decision-making capability—that is, its ability to generate effective thoughts and actions. Consequently, the tokens corresponding to the environment’s observations ( o i o_{i} ) are masked out from the loss calculation ( Chen et al., 2023 ) .

<sub>§Training objective</sub>

### 10. Duplicating Sampling Policy Optimization

Following the RFT cold-start phase, which equips the model with fundamental tool-use capabilities and adherence to a reasoning skeleton, we propose Duplicating Sampling Policy Optimization (DUPO) to further refine the reasoning abilities, enhance the sample efficiency ( Yue et al., 2025 ) and ultimately elicit its intrinsic potential to discover and internalize sophisticated problem-solving strategies beyond direct imitation. The main difference between RL for agents and conventional reasoning tasks is that rollout is a multi-turn process involving interaction with the environment (tool responses) ( Sun et al., 2024 ) . However, the interaction with the environment causes the rollout speed of agent RL to be much slower compared to standard RL. DAPO ( Yu et al., 2025 ) employs dynamic sampling to filter out rollouts that are entirely correct or incorrect, subsequently filling the batch to its target size with new QAs. While this is effective for data curation, it may necessitate sequential rollouts for different cases within the same batch. This sequential processing further exacerbates the slow training speeds characteristic of agentic RL. To solve this issue, we first filter out overly simple cases (those with all 8 8 rollouts correct) before training. During training, instead of using padding to expand the batch, we duplicate samples from the same batch that have a non-zero standard deviation. Compared to DAPO’s dynamic sampling, this approach achieves approximately 2–3 times speedup. Similar to SFT, it is also necessary to mask observations when calculating the policy loss ( Jin et al., 2025 ) . We follow GPRO ( Shao et al., 2024 ) to estimate the advantage in a group-relative manner. We also utilize the token-level policy gradient loss and higher clip techniques in DAPO. The training objective of DUPO is defined as follows: where ( q , y ) (q,y) is the question-answer pair, r i , t ​ ( θ ) r_{i,t}(\theta) is the importance sampling ratio, and A ^ i , t \hat{A}_{i,t} is an estimator of the advantage at time step t t : Notably, in Eq. 4 , o i o_{i} represents the tokens generated by the model but not the whole trajectory. Meanwhile, context comprises the model generation and tool response. Cases with a standard deviation of 0 (i.e., all roll-out answers are either completely correct or completely incorrect) are removed. These slots in the batch were then filled by randomly duplicating other cases within the same batch whose standard deviation was not 0. To avoid reward hacking ( Amodei et al., 2016 ; OpenAI, 2025c ) , we adopt a rule-based reward that combines both format validation and answer validation: Specifically, the format score verifies whether the rollout trajectory follows the predefined format, such as whether different content segments are correctly wrapped with tags like <think> and <tool_call> , and whether the sequence complies with the ReAct framework. The answer score uses an LLM as a judge to determine whether the final prediction is correct.

<sub>§4.2 Duplicating Sampling Policy Optimization</sub>

## 总结与展望
WebSailor 是「训练一个调研 agent」这条路线的代表：构造高不确定性的合成任务、过滤掉超过 32k token 的轨迹、在 BrowseComp 这类「难找」的基准上评估，并用 LLM 当裁判、用 pass@1（非零温度）。它对我们的意义是给出了两个可比的锚点——轨迹长度上限与裁判方式——而我们的调研两者都没有显式记录（读多少篇是参数，判得好不好是人写的）。

**It connects to**

- `2210.03629` — 同一个「检索即环境」的思路，从提示级升级到训练级；WebSailor 的合成任务就是给这种交互造训练场。
- `2303.17651` — 一个训练模型去搜，一个让模型自己改；两者都在回答「不换权重能不能提升」，答案不同但都受样本效率约束。

## 不足之处
**The authors say:** First, our decision to filter training trajectories to under 32k tokens, while pragmatic, may cap the model’s ability to tackle even more complex problems. Our analysis of failed cases reveals that many errors stem from exceeding the context limit, and we observe that performance can degrade as inference length increases. Furthermore, WebSailor can exhibit a tendency for "over-thinking", applying multi-step tool calls even to seemingly simple questions. However, this is not a clear-cut drawback; our qualitative analysis suggests that in many such instances, the agent is not aimlessly exploring but performing cross-verification, using different information sources to validate an initial finding. Finally, on the training front, our RL process is limited to 50 steps. This is primarily due to the inherent inefficiency of the synchronous RL framework; even with the optimizations from DUPO, the training speed remains a bottleneck. Future work will focus on migrating to an asynchronous training framework to improve efficiency and enable more extensive RL training.

**What a reader should still not conclude**

- 它的轨迹长度上限（32k）是自己设的，论文承认这会限制更难的问题；我们的「读 12 篇」是同类截断但从未被讨论。
- 机制段抽到的是实验设置与失败分析导语，合成任务的构造与难度分级在方法章。

<sub>§5.4 Limitations and Future Work</sub>

---

# DeepResearcher: Scaling Deep Research via Reinforcement Learning in Real-world Environments

arXiv:2504.03160 · 2025 · [source](https://arxiv.org/html/2504.03160)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The emergence of Large Language Models (LLMs) has fundamentally transformed the landscape of artificial intelligence, enabling increasingly autonomous problem-solving capabilities. When equipped with external tools such as web search and code execution Li et al. (2025c) , these models can tackle complex research tasks that previously required significant human workload and expertise. Notable examples include Gemini and OpenAI Deep Research Google (2024) ; OpenAI (2025) , Grok3’s DeeperSearch xAI (2025) , and open-source projects like MetaGPT Hong et al. (2024) , OpenManus Liang et al. (2025) , and OWL agents CAMEL-AI.org (2025) . These systems demonstrate promising capabilities in synthesizing information, writing and executing code, and conducting iterative investigations across diverse domains. Despite their potential, most current agents are prompt-engineered LLM agents that face significant limitations, while the technical details of commercial systems like OpenAI Deep Research remain completely opaque. Specifically, prompt-engineered agents follow pre-defined workflows designed by developers Anthropic (2024) , resulting in strict behavioral patterns. Consequently, they often struggle with instruction following, consistent reasoning, exhibit poor generalization to novel tasks, and require extensive manual prompt engineering to achieve reliable performance Pan et al. (2025) . The brittle nature of these systems becomes particularly evident when confronted with complex, multi-step research scenarios requiring adaptive information gathering through web search. While impressive commercial products exist, reproducible frameworks for creating robust research agents remain elusive.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Methodology"]
  N1["§3.1 Deep Research Trajectory"]
  N2["§Reasoning"]
  N3["§Web Search Tool"]
  N4["§Web Browsing Agent"]
  N5["§Answering"]
  N6["§3.2 Addressing Challenges in Dynamic Real-World Web Environments"]
  N7["§Challenge I: High-concurrency requests at a single moment"]
  N8["§Challenge II: Managing Web Crawling and API Limitations"]
  N9["§Challenge III: Optimizing Information Extraction via a Multi-Agent Approach"]
  N10["§3.3 RL Training Framework"]
  N11["§GRPO"]
  N12["§Masking Observations"]
  N13["§3.4 Reward"]
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
```

![The trajectory of a single sample from a batch of questions processed in parallel by a distributed cluster. Each question undergoes multiple independent rollouts with distinct memory. Upper-left: Displays the batch of questions and their concurrent rollout paths. Upper-right: Shows the browsing agent retrieving web pages via URLs, processing them sequentially to incrementally extract relevant information. Bottom: Details the iterative decision-making steps, from initial query formulation and search to snippet retrieval, further reasoning, browsing, information extraction, and answer generation.](https://arxiv.org/html/2504.03160v4/training_framework.png)

*The trajectory of a single sample from a batch of questions processed in parallel by a distributed cluster. Each question undergoes multiple independent rollouts with distinct memory. Upper-left: Displays the batch of questions and their concurrent rollout paths. Upper-right: Shows the browsing agent retrieving web pages via URLs, processing them sequentially to incrementally extract relevant information. Bottom: Details the iterative decision-making steps, from initial query formulation and search to snippet retrieval, further reasoning, browsing, information extraction, and answer generation.*

<sub>figure: `2504.03160v4/training_framework.png`</sub>

## 机制
### 1. Methodology

In this section, we describe the methodology used to train an agent capable of solving problems with web search in dynamic real-world environments. Format Penalty : If the format is incorrect (e.g., missing tags or structural errors), the agent receives a penalty of -1. F1 Reward : If the format is correct, the reward is based on the word-level F1 score, which measures the accuracy of the generated answer compared to the reference answer. A higher F1 score results in a higher reward.

<sub>§3 Methodology</sub>

### 2. Deep Research Trajectory / Reasoning

In a DeepResearcher’s trajectory, it conducts reasoning and tool selection based on the user question and observations iteratively as illustrated in Figure 3 . We restrict DeepResearcher to do reasoning before taking action. Each reasoning process is wrapped in a <think> tag following the setting in DeepSeek-R1 Guo et al. (2025) .

<sub>§3.1 Deep Research Trajectory · §Reasoning</sub>

### 3. Web Search Tool

DeepResearcher invokes the web search tool by generating a JSON-formatted request with the tool name web_search and the search queries as arguments. Search results are returned in a structured format comprising title, URL, and snippet for each webpage. The current implementation employs a fixed top-k (e.g., 10) value for search results retrieval. Future work could explore LLM-driven dynamic parameter optimization for enhanced search efficacy.

<sub>§Web Search Tool</sub>

### 4. Web Browsing Agent

The web browsing agent provides reliable, question-relevant, and incrementally updated information in to the DeepResearcher system. Specifically, the agent maintains a short-term memory repository for each query. Upon receiving a web_browse request, it processes the first-page segment of the URL in the request. Subsequently, the web browsing agent takes two actions based on the query, historical memory, and the newly acquired webpage content: (1) determining whether to continue reading the next URL/segment or stop and (2) appending relevant information to the short-term memory. Once the agent decides to discontinue further browsing, it compiles all newly added information from the short-term memory and returns it to the DeepResearcher system.

<sub>§Web Browsing Agent</sub>

### 5. Answering / Addressing Challenges in Dynamic Real-World Web Environments

When the model determines it has sufficient information to answer the question, it generates a final response within <answer></answer>as the answer to return to the user. In our open, real-world web setting, several unique challenges arise that necessitate specialized solutions. The following sections detail our strategies for managing these issues effectively.

<sub>§Answering · §3.2 Addressing Challenges in Dynamic Real-World Web Environments</sub>

### 6. Challenge I: High-concurrency requests at a single moment

The implementation of GRPO results in a large number of sampling iterations, leading to a significant volume of search queries and webpage crawling operations (e.g., 4096), causing long delays. To resolve this issue, we created a distributed CPU server cluster with 50 nodes, specifically designed to manage the Tool requests generated during the RL rollout process. Each server is tasked with handling a portion of these requests, processing search results, and crawling webpages based on the URLs identified by the language model for further reading.

<sub>§Challenge I: High-concurrency requests at a single moment</sub>

### 7. Challenge II: Managing Web Crawling and API Limitations

During the crawling phase, the system frequently encounters anti-crawl measures deployed by web servers, which may return irrelevant content or fail to respond entirely. Similarly, when interfacing with search engines or LLM APIs, restrictions such as provider rate limits (e.g. 200 per second) can arise. To mitigate these issues, we implemented a robust retry mechanism that effectively addresses exceptions encountered during API calls or webpage crawling. In addition, we introduced a caching strategy for search results: if an identical search query is made within a predetermined period (e.g., 7 days), the system retrieves the results from the cache. This approach not only reduces the API call frequency but also helps manage the associated costs, particularly for expensive services like the Google Search API.

<sub>§Challenge II: Managing Web Crawling and API Limitations</sub>

### 8. Challenge III: Optimizing Information Extraction via a Multi-Agent Approach

We employ a multi-agent framework wherein a dedicated reading agent is tasked with extracting pertinent information from crawled webpages. Given that many webpages are lengthy and may contain limited relevant content, these pages are partitioned into smaller segments. The reading agent mimics human behavior by processing content sequentially from the first page onward. Under the assumption that if the initial segments of a URL predominantly contain irrelevant information, the webpage is likely unproductive and can be skipped, this method enables more efficient resource allocation and improves overall information extraction accuracy.

<sub>§Challenge III: Optimizing Information Extraction via a Multi-Agent Approach</sub>

### 9. RL Training Framework / GRPO

Our approach utilizes Reinforcement Learning (RL) to train the agent. This section outlines how we employ the RL framework to train the agent and the tools used within it. In this work, we adopt the Group Relative Policy Optimization (GRPO) algorithm. GRPO optimizes the current policy π θ \pi_{\theta} by leveraging a reference policy π θ ref \pi_{\theta_{\text{ref}}} along with a set of rollouts generated by an existing policy π θ old \pi_{\theta_{\text{old}}} . Specifically, given G G rollouts (with each input x ∼ D x\sim D , where D D is the experience distribution), GRPO estimates the baseline using these trajectories instead of training a separate critic. The current policy is then optimized by maximizing the following objective function:

<sub>§3.3 RL Training Framework · §GRPO</sub>

### 10. Masking Observations

The output of the tool is an observation, not the desired result that the model is expected to produce. Therefore, we apply masking to prevent the observation from being involved in training, allowing only the model’s responses to contribute to the training process.

<sub>§Masking Observations</sub>

### 11. Reward

Rewards play a crucial role during the training process, guiding the agent to continuously improve its performance. This section defines the reward structure and describes how the agent’s behavior is rewarded. We employ F1 score as our primary reward metric due to our utilization of open-domain QA datasets with short-answer ground truth. For future work involving long-form answers, more sophisticated reward mechanisms may be necessary, as noted in the Deep Research system card OpenAI (2025) . The reward is determined by the following conditions:

<sub>§3.4 Reward</sub>

## 总结与展望
DeepResearcher 在真实网络环境里训练研究代理，并明确指出「在本地固定语料上训练的策略，到真实网上会退化」。这对我们是最直接的方法论警告：我们的 survey 基于 arXiv 固定语料，结论外推到开放网络时不可假设成立。

**It connects to**

- `2503.09516` — 环境从本地语料换成真实网，是两者最大的差别。
- `2508.06600` — 都在处理「语料是否代表真实世界」。

## 不足之处
**The authors say:** During the crawling phase, the system frequently encounters anti-crawl measures deployed by web servers, which may return irrelevant content or fail to respond entirely. Similarly, when interfacing with search engines or LLM APIs, restrictions such as provider rate limits (e.g. 200 per second) can arise. To mitigate these issues, we implemented a robust retry mechanism that effectively addresses exceptions encountered during API calls or webpage crawling. In addition, we introduced a caching strategy for search results: if an identical search query is made within a predetermined period (e.g., 7 days), the system retrieves the results from the cache. This approach not only reduces the API call frequency but also helps manage the associated costs, particularly for expensive services like the Google Search API.

**What a reader should still not conclude**

- 真实网环境的不可复现性使对比困难，论文用固定快照缓解但仍有漂移。

<sub>§Challenge II: Managing Web Crawling and API Limitations</sub>

---

# Survey of Hallucination in Natural Language Generation

arXiv:2202.03629 · 2023 · [source](https://arxiv.org/html/2202.03629)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Natural Language Generation (NLG) is one of the crucial yet challenging sub-fields of Natural Language Processing (NLP). NLG techniques are used in many downstream tasks such as summarization, dialogue generation, generative question answering (GQA), data-to-text generation, and machine translation. Recently, the rapid development of NLG has captured the imagination of many thanks to the advances in deep learning technologies, especially Transformer ( Vaswani et al., 2017 ) -based models like BERT ( Devlin et al., 2019 ) , BART ( Lewis et al., 2020 ) , GPT-2 ( Radford et al., 2019 ) , and GPT-3 ( Brown et al., 2020 ) . The conspicuous development of NLG tasks attracted the attention of many researchers, leading to an increased effort in the field.

<sub>§1. Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2. Definitions"]
  N1["§2.1. Categorization"]
  N2["§2.3. Terminology Clarification"]
  N3["§5. Hallucination Mitigation Methods"]
  N4["§5.1. Data-Related Methods"]
  N5["§5.1.1. Building a Faithful Dataset"]
  N6["§5.1.2. Cleaning Data Automatically"]
  N7["§5.1.3. Information Augmentation"]
  N8["§5.2. Modeling and Inference Methods"]
  N9["§5.2.1. Architecture"]
  N10["§5.2.2. Training"]
  N11["§5.2.3. Post-Processing"]
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
```

![The frameworks of training methods.](https://arxiv.org/html/2202.03629v7/modeling.png)

*The frameworks of training methods.*

<sub>figure: `2202.03629v7/modeling.png`</sub>

## 机制
### 1. Definitions

In the general context outside of NLP, hallucination is a psychological term referring to a particular type of perception ( Fish et al., 2009 ; Macpherson and Platchias, 2013 ) . Blom ([n. d.]) define hallucination as “a percept, experienced by a waking individual, in the absence of an appropriate stimulus from the extracorporeal world” . Simply put, a hallucination is an unreal perception that feels real. The undesired phenomenon of “NLG models generating unfaithful or nonsensical text” shares similar characteristics with such psychological hallucinations – explaining the choice of terminology. Hallucinated text gives the impression of being fluent and natural despite being unfaithful and nonsensical. It appears to be grounded in the real context provided, although it is actually hard to specify or verify the existence of such contexts. Similar to psychological hallucination, which is hard to tell apart from other “real” perceptions, hallucinated text is also hard to capture at first glance. Within the context of NLP, the above definition of hallucination, the generated content that is nonsensical or unfaithful to the provided source content ( Filippova, 2020 ; Maynez et al., 2020 ; Parikh et al., 2020 ; Zhou et al., 2021b ) , is the most inclusive and standard. However, there do exist variations in definition across NLG tasks, which will be further described in the later task-specific sections. Intrinsic Hallucinations : The generated output that contradicts the source content. For instance, in the abstractive summarization task from Table 1 , the generated summary “ The first Ebola vaccine was approved in 2021 ” contradicts the source content “ The first vaccine for Ebola was approved by the FDA in 2019 . ”. Extrinsic Hallucinations : The generated output that cannot be verified from the source content (i.e., output that can neither be supported nor contradicted by the source). For example, in the abstractive summarization task from Table 1 , the information “ China has already started clinical trials of the COVID-19 vaccine. ” is not mentioned in source. We can neither find evidence for the generated output from the source nor assert that it is wrong. Notably, the extrinsic hallucination is not always erroneous because it could be from factually correct external information ( Maynez et al., 2020 ; Thomson and Reiter, 2020 ) . Such factual hallucination can be helpful because it recalls additional background knowledge to improve the informativeness of the generated text. However, in most of the literature, extrinsic hallucination is still treated with caution because its unverifiable aspect of this additional information increases the risk from a factual safety perspective.

<sub>§2. Definitions</sub>

### 2. Categorization

Following the categorization from previous works ( Maynez et al., 2020 ; Huang et al., 2021 ; Dziri et al., 2021a ) , there are two main types of hallucinations, namely intrinsic hallucination and extrinsic hallucination. To explain the definition and categorization more intuitively, we give examples of each category of hallucinations for each NLG downstream task in Table 1 .

<sub>§2.1. Categorization</sub>

### 3. Terminology Clarification

Multiple terminologies are associated with the concept of hallucination. We provide clarification of the commonly used terminologies hallucination , faithfulness , and factuality to resolve any confusion. Faithfulness is defined as staying consistent and truthful to the provided source – an antonym to "hallucination." Any work that tries to maximize faithfulness thus focuses on minimizing hallucination. For this reason, our survey includes all those works that address the faithfulness of machine-generated outputs. Factuality refers to the quality of being actual or based on fact. Depending on what serves as the “fact”, "factuality" and "faithfulness" may or may not be the same. Maynez et al. (2020) differentiate "factuality" from "faithfulness" by defining the “fact” to be the world knowledge. In contrast, Dong et al. (2020) use the source input as the “fact” to determine the factual correctness, making "factuality" indistinguishable from "faithfulness". In this paper, we adopt the definition from Maynez et al. (2020) because we believe having such a distinction between source knowledge and world knowledge provides a more clear understanding. Note that the judging criteria for what is considered faithful or hallucinated (i.e., the definition of hallucination) can differ across tasks. For more details of these variation definitions, you can find in the later task-specific sections.

<sub>§2.3. Terminology Clarification</sub>

### 4. Hallucination Mitigation Methods / Building a Faithful Dataset

Common mitigation methods can be divided into two categories, in accordance with two main contributors of hallucinations: Data-Related Methods , and Modeling and Inference Methods . Considering that noisy data encourage hallucinations, constructing faithful datasets manually is an intuitive method, and there are various ways to build such datasets: One way is employing annotators to write clean and faithful targets from scratch given the source ( Gardent et al., 2017 ; Wen et al., 2015b ) , which may lack diversity ( Parikh et al., 2020 ; Gururangan et al., 2018 ; Poliak et al., 2018 ) . Another way is employing annotators to rewrite real sentences on the web ( Parikh et al., 2020 ) , or targets in the existing dataset ( Wang, 2019 ) . Basically, the revision strategy consists of three stages: (1) phrase trimming: removing phrases unsupported by the source in the exemplar sentence; (2) decontextualization: resolving co-references and deleting phrases dependent on context; (3) syntax modification: making the purified sentences flow smoothly. Meanwhile, other works ( Honovich et al., 2021 ; Gabriel et al., 2021 ) leverage the model to generate data and instruct annotators to label whether these outputs contain hallucinations or not. While this approach is typically used to build diagnostic evaluation datasets, it has the potential to build faithful datasets.

<sub>§5. Hallucination Mitigation Methods · §5.1.1. Building a Faithful Dataset</sub>

### 5. Cleaning Data Automatically

In order to alleviate semantic noise issues, another approach is to find information that is irrelevant or contradictory to the input from the existing parallel corpus and then filter or correct the data. This approach is suitable for the case where there is a low or moderate level of noise in the original data ( Filippova, 2020 ; Nie et al., 2019 ) . Some works ( Liu et al., 2021b ; Shen et al., 2021 ; Raunak et al., 2021 ) have dealt with the hallucination issue at the instance level by using a score for each source-reference pair and filtering out hallucinated ones. This corpus filtering method consists of several steps: (1) measuring the quality of the training samples in terms of hallucination utilizing the metrics described above; (2) ranking these hallucination scores in descending order; (3) selecting and filtering out the untrustworthy samples at the bottom. Instance-level scores can lead to a signal loss because divergences occur at the word level; i.e., parts of the target sentence are loyal to the source input, while others diverge ( Rebuffel et al., 2022 ) . Considering this issue, other works ( Nie et al., 2019 ; Dušek et al., 2019 ) correct paired training samples, specifically the input data, according to the references. This method is mainly applied in the data-to-text task because structured data are easier to correcte than utterances. This method consists of two steps: (1) utilizing a model to parse the meaning representation (MR), such as attribute-value pairs, from original human textual references; (2) using the MR extracted from the reference to correct the input MR through slot matching. This method will enhance the semantic consistency between input and output without abandoning a part of the dataset.

<sub>§5.1.2. Cleaning Data Automatically</sub>

### 6. Information Augmentation

It is intuitive that augmenting the inputs with external information will obtain a better representation of the source. Because the external knowledge, explicit alignment, extra training data, etc., can improve the correlation between the source and target and help the model learn better task-related features. Consequently, a better semantic understanding helps alleviate the divergence from the source issue. Examples of the augmented information include entity information ( Liu et al., 2021b ) , extracted relation triples from source document ( Huang et al., 2020a ; Cao et al., 2018 ) obtained by Fact Description Extraction, pre-executed operation results ( Nie et al., 2018 ) , synthetic data generated through replacement or perturbation ( Chen et al., 2021b ; Lee et al., 2019 ) , retrieved external knowledge ( Shuster et al., 2021 ; Zhu et al., 2021 ; Gunel et al., 2019 ; Bi et al., 2019 ; Fan et al., 2019a ) , and retrieved similar training samples ( Białecki et al., 2012 ) . These methods enforce a stronger alignment between inputs and outputs. However, they will bring challenges due to the gap between the original source and augmented information, such as the semantic gap between an ambiguous utterance and a distinct MR of structured data, and the format discrepancy between the structured knowledge graph and natural language.

<sub>§5.1.3. Information Augmentation</sub>

### 7. Post-Processing

Post-processing methods can correct hallucinations in the output, and this standalone task requires less training data. Especially for noisy datasets where a large proportion of the ground truth references suffer from hallucinations, modeling correction is a competitive choice to handle the hallucination problem ( Chen et al., 2021b ) . Chen et al. (2021b) ; Dong et al. (2020) ; Cao et al. (2020) , and Dziri et al. (2021a) follow a generate-then-refine strategy. While the post-processing correction step tends to result in ungrammatical texts, this method allows researchers to utilise SOTA models which perform best in respect of other attributes, such as fluency, and then correct the results specifically for faithfulness by using small amounts of automatically generated training data.

<sub>§5.2.3. Post-Processing</sub>

## 总结与展望
这篇综述给这个方向提供了最基础的词汇区分：内在幻觉（与给定源矛盾）与外在幻觉（源里没有、无法验证），并把 faithful、factual、consistent 三个词的关系说清楚。它对我们的调研方法直接有用——一份封印报告里「未被任何引文支持」的段落，按它的定义就是外在幻觉，而我们的报告里这样的段落曾经占到八成（76/95）。

**It connects to**

- `2303.11366` — 一个讲「生成的句子与来源不符」，一个讲「反思与经验不符」；同一个可信度问题在两个尺度上。
- `2302.04761` — Toolformer 用损失做筛选，恰好是「用下游可用性代替事实核查」的做法，这篇综述解释了为什么那不够。

## 不足之处
**What a reader should still not conclude**

- 它是 2023 年的综述，覆盖的是 NLG 时代的幻觉分类，没有 agent 工具调用带来的「动作型幻觉」（声称做了实际没做）。
- 机制段抽到的是定义与分类两小节，缓解方法的评估对比在后面的章节里。

---

# Evaluating Verifiability in Generative Search Engines

arXiv:2304.09848 · 2023 · [source](https://arxiv.org/html/2304.09848)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Generative search engines fulfill user information needs by directly generating responses to input queries, along with in-line citations (Figure 1 ). 1 1 1 In contrast, conventional search engines are limited to retrieving pre-existing webpages. Existing generative search engines are rapidly gaining users—in March 2023, Microsoft reported that “roughly one third of daily preview users are using [Bing] Chat daily”, and that Bing Chat served 45 million chats in the first month of its public preview ( Mehdi, 2023 ) . Generative search engines have the potential to transform how people find information online, but generated responses from existing large language model-backed generative search engines may not always be accurate ( Maynez et al., 2020 ) . Given their potential and rapid mainstream adoption, it is critical to evaluate these systems to better understand their potential limitations (akin to prior work in algorithmic auditing; Metaxas and Pruksachatkun, 2017 ; Buolamwini and Gebru, 2018 ; Kiritchenko and Mohammad, 2018 ; Robertson et al., 2018 ; Metaxa et al., 2019 ; Green and Chen, 2019 ; Birhane et al., 2022 , inter alia ).

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Human Evaluation of Fluency, Perceived Utility, and Verifiability"]
  N1["§2.1 Task Formulation"]
  N2["§2.2 Measuring Fluency and Perceived Utility"]
  N3["§2.3 Measuring Citation Recall"]
  N4["§Identifying verification-worthy statements."]
  N5["§Evaluating whether a verification-worthy statement is fully supported by its associated citations."]
  N6["§2.4 Measuring Citation Precision"]
  N7["§2.5 Citation F 1 F_{1}"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
```

![Generative search engines answer user queries by generating a tailored response, along with in-line citations. However, not all generated statements are fully supported by citations (citation recall), and not every citation supports its associated statement (citation precision).](https://arxiv.org/html/2304.09848v2/figure_1.svg)

*Generative search engines answer user queries by generating a tailored response, along with in-line citations. However, not all generated statements are fully supported by citations (citation recall), and not every citation supports its associated statement (citation precision).*

<sub>figure: `2304.09848v2/figure_1.svg`</sub>

## 机制
### 1. Human Evaluation of Fluency, Perceived Utility, and Verifiability

In this section, we formalize the inputs and outputs of the generative search engines we study, describe the evaluation of fluency and perceived utility, and define and describe the evaluation of citation recall and precision. Citation recall and precision are designed to reward systems that cite comprehensively (i.e., high recall; all statements are fully supported by citations) and accurately (i.e., high precision; every cite supports its associated statement). We also define citation F 1 F_{1} , a metric that combines citation precision and citation recall. Full support : all of the information in the statement is supported by the citation. Partial support : some of the information in the statement is supported by the citation, but other parts are not supported (e.g., missing or contradictory). No support : the citation does not support any part of the statement (e.g., the cited webpage is completely irrelevant or contradictory).

<sub>§2 Human Evaluation of Fluency, Perceived Utility, and Verifiability</sub>

### 2. Task Formulation

Given a user query q q as input, a generative search engine produces a text response r r , which is a string with embedded in-line citations. For the example in Figure 1 , the query q q is “What are the latest discoveries from the James Webb Space Telescope?” and the response r r is the string paragraph “The James Webb Space Telescope … used to study the next interstellar interloper [3].”, with embedded citations “[1]”, “[2]”, and “[3]”. To evaluate citation precision and recall, we first segment the r r into a set of n n statements 𝒮 = { s 1 , … , s n } \mathcal{S}=\{s_{1},\dots,s_{n}\} . In this work, the segmentation 𝒮 \mathcal{S} is set of sentences in the response r r . For each statement s i ∈ 𝒮 s_{i}\in\mathcal{S} , we construct a (possibly empty) set 𝒞 i = { c i , 1 , … , c i , k } \mathcal{C}_{i}=\{{c_{{i},1}},\dots,{c_{{i},k}}\} of k k citations associated with the statement s i s_{i} , where c i , j c_{{i},j} is the j j th citation associated with the i i th response statement. For each citation c i , j c_{i,j} , we have a URL u i , j u_{i,j} and its contents p i , j p_{i,j} . In this work, 𝒞 i \mathcal{C}_{i} is set of citations that occur in s i s_{i} (e.g., for s i s_{i} = “Blueberries[1], cherries[2], and grapes[3] grow on trees.[4]”, 𝒞 i = { [1] , [2] , [3] , [4] } \mathcal{C}_{i}=\{\textrm{[1]},\textrm{[2]},\textrm{[3]},\textrm{[4]}\} ). In practice, a sentence may contain multiple independently-verifiable claims (e.g., conjuncts such as “Cups can be made of glass[1] or plastic[2].”), and a single in-line citation’s scope is often ambiguous (e.g., a cite marker after two statements could be interpreted as either supporting both statements, or merely the final one); we leave finer-grained evaluation to future work.

<sub>§2.1 Task Formulation</sub>

### 3. Measuring Fluency and Perceived Utility

To measure response fluency, annotators were shown the user query, the generated response, and the claim “The response is fluent and cohesive”. We ask annotators to rate their level of agreement with the claim on a five-point Likert scale from Strongly Disagree to Strongly Agree . We use a similar process to measure perceived utility, asking annotators to rate their level of agreement with the claim “The response is a helpful and informative answer to the query”.

<sub>§2.2 Measuring Fluency and Perceived Utility</sub>

### 4. Measuring Citation Recall

Citation recall is the proportion of verification-worthy statements that are fully supported by their associated citations (see Figure 2 for several examples). Thus, computing citation recall requires (i) identifying the verification-worthy statements in a response and (ii) evaluating whether each verification-worthy statement is fully supported by its associated citations.

<sub>§2.3 Measuring Citation Recall</sub>

### 5. Identifying verification-worthy statements.

Given the statements 𝒮 \mathcal{S} in a response r r , we first ask annotators to remove statements in the response that are not verification-worthy. We take the position that every generated statement about the external world is verification-worthy, even those that might seem obvious, trivially true, or “common sense”. Generated statements may be incorrect, and statements that seem obvious to some readers may be less than obvious to others (e.g., “The Pope is Catholic”). We believe that systems should aim to provide a source for all generated statements about the external world, enabling readers to easily verify any statement in a generated response. In practice, almost all system-generated statements are verification-worthy—notable exceptions include statements about the speaker (the system) itself (e.g., “As a language model, I do not have the ability to ban books.”) and questions posed to the user (e.g.,“Would you like to learn more?”, generated by systems like Bing Chat and YouChat that are deployed in conversational settings).

<sub>§Identifying verification-worthy statements.</sub>

### 6. Evaluating whether a verification-worthy statement is fully supported by its associated citations.

Given the verification-worthy statements in a response r r , annotators evaluate whether each statement is fully supported by its associated citations (see the sentences of generated response in Figure 1 for examples). To collect these binary judgments, we use the attributable to identified sources (AIS) evaluation framework of Rashkin et al. (2022) . In particular, a statement s i s_{i} is fully supported by its associated citations 𝒞 i \mathcal{C}_{i} if a generic hearer would affirm the statement “According to cited webpages 𝒞 i \mathcal{C}_{i} , s i s_{i} ”, within the context of the query q q and response r r , and unsupported otherwise.

<sub>§Evaluating whether a verification-worthy statement is fully supported by its associated citations.</sub>

### 7. Measuring Citation Precision

Citation precision is the proportion of generated citations that support their associated statements (Figure 2 ). In contrast to citation recall, citation precision rewards systems for citing accurately—a response that cites every webpage on the Internet for each generated statement would have high citation recall, but low citation precision (since many articles are irrelevant and do not support their associated statement). To measure citation precision for a response r r , we first ask annotators to judge whether each citation c i , k {c_{i,k}} contributes full, partial, or no support for its associated statement s i s_{i} (see cited webpages in Figure 1 for examples): For statements that have multiple associated citations, we additionally ask annotators whether the union of its associated cited webpages collectively provides full support for the statement (a binary judgment). Similar to citation recall, we use the AIS evaluation framework of Rashkin et al. (2022) to collect these binary judgments. To calculate citation precision, let T f ​ s T_{fs} be the number of citations that fully support its associated statement, and let T p ​ s T_{ps} be the number of citations that partially supports its associated statement, where the associated statement is fully supported by the union of its associated citations and no associated citation fully supports the statement by itself. 4 4 4 For an intuitive example of when partially-supporting cites count toward improving precision (greater T p ​ s T_{ps} ), consider the statement “Health benefits of cycling include improved cardiovascular health[1] and lowered cholesterol levels[2].” with its associated citations [1] and [2]. Suppose that these citations each contribute partial support for the entire statement—the first citation [1] only states that “Health benefits of cycling include improved cardiovascular health”, and second citation [2] only states that “Health benefits of cycling include lowered cholesterol levels”. Taken together, the citations offer full support for the statement. Although these citations do not fully support the statement on their own, they still meaningfully contribute to its verifiability—systems should not be penalized for aggregating information from multiple citations. Let N N be the total number of citations in the response. Then, the citation precision is ( T f ​ s + T p ​ s ) / N (T_{fs}+T_{ps})/N .

<sub>§2.4 Measuring Citation Precision</sub>

### 8. Citation F 1 F_{1}

Citation F 1 F_{1} is a metric that combines citation precision and citation recall by taking their harmonic mean: To achieve a high citation F 1 F_{1} , systems must have high citation precision and high citation recall.

<sub>§2.5 Citation F 1 F_{1}</sub>

## 总结与展望
这篇首次系统测生成式搜索引擎的可核查性，用「引用召回率」与「引用精确率」两个数，并给出一个刺眼的基线：只有约一半的生成句子能得到所引来源的支持。它对本方向的直接含义是——带引用的错误答案比裸错误更危险，因为引用制造了可信度。

**It connects to**

- `2112.09332` — 同一条线上更早的系统，也有引用与人工反馈。
- `2511.07685` — 把「可核查」推进到评分细则层面。

## 不足之处
**The authors say:** The primary goal of this work was to assess verifiability in generative search engine responses. However, note that verifiability is not factuality —rather than arbitrating if a generated statement is true (difficult for all but the simplest claims; Rashkin et al., 2022 ), verifiability enables users to easily check any generated statement’s source, allowing them to draw their own conclusions about whether to trust the generated statement. Studying the factuality of generative search engines (that may or may not provide citations) is an important direction for future work—users may not necessarily bother to check the sources, especially given that responses often seem helpful and sound confident, and we’d thus like responses to be as factual as possible.

**What a reader should still not conclude**

- 人工标注规模有限，召回率的置信区间很宽。
- 它测的是句子级支持，不是「结论是否被整篇文献支持」。

<sub>§Limitations</sub>

---

# Qwen3 Technical Report

arXiv:2505.09388 · 2025 · [source](https://arxiv.org/html/2505.09388)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The pursuit of artificial general intelligence (AGI) or artificial super intelligence (ASI) has long been a goal for humanity. Recent advancements in large foundation models, e.g., GPT-4o ( OpenAI, 2024 ) , Claude 3.7 ( Anthropic, 2025 ) , Gemini 2.5 ( DeepMind, 2025 ) , DeepSeek-V3 ( Liu et al., 2024a ) , Llama-4 ( Meta-AI, 2025 ) , and Qwen2.5 ( Yang et al., 2024b ) , have demonstrated significant progress toward this objective. These models are trained on vast datasets spanning trillions of tokens across diverse domains and tasks, effectively distilling human knowledge and capabilities into their parameters. Furthermore, recent developments in reasoning models, optimized through reinforcement learning, highlight the potential for foundation models to enhance inference-time scaling and achieve higher levels of intelligence, e.g., o3 ( OpenAI, 2025 ) , DeepSeek-R1 ( Guo et al., 2025 ) . While most state-of-the-art models remain proprietary, the rapid growth of open-source communities has substantially reduced the performance gap between open-weight and closed-source models. Notably, an increasing number of top-tier models ( Meta-AI, 2025 ; Liu et al., 2024a ; Guo et al., 2025 ; Yang et al., 2024b ) are now being released as open-source, fostering broader research and innovation in artificial intelligence.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Architecture"]
  N1["§4 Post-training"]
  N2["§4.1 Long-CoT Cold Start"]
  N3["§4.2 Reasoning RL"]
  N4["§4.3 Thinking Mode Fusion"]
  N5["§Construction of SFT data."]
  N6["§Chat Template Design."]
  N7["§Thinking Budget."]
  N8["§4.4 General RL"]
  N9["§4.5 Strong-to-Weak Distillation"]
  N10["§Qwen3-235B-A22B"]
  N11["§Qwen3-32B"]
  N12["§Qwen3-30B-A3B & Qwen3-14B"]
  N13["§Qwen3-8B / 4B / 1.7B / 0.6B"]
  N14["§The Effectiveness of Thinking Budget"]
  N15["§The Effectiveness and Efficiency of On-Policy Distillation"]
  N16["§The Effects of Thinking Mode Fusion and General RL"]
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
```

![Post-training pipeline of the Qwen3 series models.](https://arxiv.org/html/2505.09388v1/posttrain_pipeline.svg)

*Post-training pipeline of the Qwen3 series models.*

<sub>figure: `2505.09388v1/posttrain_pipeline.svg`</sub>

## 机制
### 1. Architecture

The Qwen3 series includes 6 dense models, namely Qwen3-0.6B, Qwen3-1.7B, Qwen3-4B, Qwen3-8B, Qwen3-14B, and Qwen3-32B, and 2 MoE models, Qwen3-30B-A3B and Qwen3-235B-A22B. The flagship model, Qwen3-235B-A22B, has a total of 235B parameters with 22B activated ones. Below, we elaborate on the architecture of the Qwen3 models. The architecture of the Qwen3 dense models is similar to Qwen2.5 ( Yang et al., 2024b ) , including using Grouped Query Attention (GQA, Ainslie et al., 2023 ), SwiGLU ( Dauphin et al., 2017 ) , Rotary Positional Embeddings (RoPE, Su et al., 2024 ), and RMSNorm ( Jiang et al., 2023 ) with pre-normalization. Besides, we remove QKV-bias used in Qwen2 ( Yang et al., 2024a ) and introduce QK-Norm ( Dehghani et al., 2023 ) to the attention mechanism to ensure stable training for Qwen3. Key information on model architecture is provided in Table 1 . The Qwen3 MoE models share the same fundamental architecture as the Qwen3 dense models. Key information on model architecture is provided in Table 2 . We follow Qwen2.5-MoE ( Yang et al., 2024b ) and implement fine-grained expert segmentation ( Dai et al., 2024 ) . The Qwen3 MoE models have 128 total experts with 8 activated experts per token. Unlike Qwen2.5-MoE, the Qwen3-MoE design excludes shared experts. Furthermore, we adopt the global-batch load balancing loss ( Qiu et al., 2025 ) to encourage expert specialization. These architectural and training innovations have yielded substantial improvements in model performance across downstream tasks. Qwen3 models utilize Qwen’s tokenizer ( Bai et al., 2023 ) , which implements byte-level byte-pair encoding (BBPE, Brown et al., 2020 ; Wang et al., 2020 ; Sennrich et al., 2016 ) with a vocabulary size of 151,669.

<sub>§2 Architecture</sub>

### 2. Post-training

The post-training pipeline of Qwen3 is strategically designed with two core objectives: Thinking Control : This involves the integration of two distinct modes, namely the “non-thinking” and “thinking” modes, providing users with the flexibility to choose whether the model should engage in reasoning or not, and to control the depth of thinking by specifying a token budget for the thinking process. Strong-to-Weak Distillation : This aims to streamline and optimize the post-training process for lightweight models. By leveraging the knowledge from large-scale models, we substantially reduce both the computational costs and the development efforts required for building smaller-scale models. As illustrated in Figure 1 , the flagship models in the Qwen3 series follow a sophisticated four-stage training process. The first two stages focus on developing the models’ “thinking” abilities. The next two stages aim to integrate strong “non-thinking” functionalities into the models. Preliminary experiments suggest that directly distilling the output logits from teacher models into lightweight student models can effectively enhance their performance while maintaining fine-grained control over their reasoning processes. This approach eliminates the necessity of performing an exhaustive four-stage training process individually for every small-scale model. It leads to better immediate performance, as indicated by higher Pass@1 scores, and also improves the model’s ability of exploration, as reflected in improved Pass@64 results. In addition, it achieves these gains with much greater training efficiency, requiring only 1/10 of the GPU hours compared to the four-stage training method. In the following sections, we present the four-stage training process and provide a detailed explanation of the Strong-to-Weak Distillation approach. Thinking Mode Non-Thinking Mode <|im_start|>user {query} /think <|im_end|> <|im_start|>assistant <think> {thinking_content} </think> {response} <|im_end|> <|im_start|>user {query} /no_think <|im_end|> <|im_start|>assistant <think> </think> {response} <|im_end|> Instruction Following : This capability ensures that models accurately interpret and follow user instructions, including requirements related to content, format, length, and the use of structured output, delivering responses that align with user expectations. Format Following : In addition to explicit instructions, we expect the model to adhere to specific formatting conventions. For instance, it should respond appropriately to the /think and /no_think flags by switching between thinking and non-thinking modes, and consistently use designated tokens (e.g., <think> and </think> ) to separate the thinking and response parts in the final output. Preference Alignment : For open-ended queries, preference alignment focuses on improving the model’s helpfulness, engagement, and style, ultimately delivering a more natural and satisfying user experience. Agent Ability : This involves training the model to correctly invoke tools via designated interfaces. During the RL rollout, the model is allowed to perform complete multi-turn interaction cycles with real environment execution feedback, thereby improving its performance and stability in long-horizon decision-making tasks. Abilities for Specialized Scenarios : In more specialized scenarios, we design tasks tailored to the specific context. For example, in Retrieval-Augmented Generation (RAG) tasks, we incorporate reward signals to guide the model toward generating accurate and contextually appropriate responses, thereby minimizing the risk of hallucination. Rule-based Reward : The rule-based reward has been widely used in the reasoning RL stage, and is also useful for general tasks such as instruction following ( Lambert et al., 2024 ) and format adherence. Well-designed rule-based rewards can assess the correctness of model outputs with high precision, preventing issues like reward hacking. Model-based Reward with Reference Answer : In this approach, we provide a reference answer for each query and prompt Qwen2.5-72B-Instruct to score the model’s response based on this reference. This method allows for more flexible handling of diverse tasks without requiring strict formatting, avoiding false negatives that can occur with purely rule-based rewards. Model-based Reward without Reference Answer : Leveraging human preference data, we train a reward model to assign scalar scores to model responses. This approach, which does not depend on a reference answer, can handle a broader range of queries while effectively enhancing the model’s engagement and helpfulness. Off-policy Distillation : At this initial phase, we combine the outputs of teacher models generated with both /think and /no_think modes for response distillation. This helps lightweight student models develop basic reasoning skills and the ability to switch between different modes of thinking, laying a solid foundation for the next on-policy training phase. On-policy Distillation : In this phase, the student model generates on-policy sequences for fine-tuning. Specifically, prompts are sampled, and the student model produces responses in either /think or /no_think mode. The student model is then fine-tuned by aligning its logits with those of a teacher model (Qwen3-32B or Qwen3-235B-A22B) to minimize the KL divergence. General Tasks : We utilize benchmarks including MMLU-Redux ( Gema et al., 2024 ) , GPQA-Diamond ( Rein et al., 2023 ) , C-Eval ( Huang et al., 2023 ) , and LiveBench (2024-11-25) ( White et al., 2024 ) . For GPQA-Diamond, we sample 10 times for each query and report the averaged accuracy. Alignment Tasks : To evaluate how well the model aligns with human preferences, we employ a suite of specialized benchmarks. For instruction-following performance, we report the strict-prompt accuracy of IFEval ( Zhou et al., 2023 ) . To assess alignment with human preferences on general topics, we utilize Arena-Hard ( Li et al., 2024 ) and AlignBench v1.1 ( Liu et al., 2023b ) . For writing tasks, we rely on Creative Writing V3 ( Paech, 2024 ) and WritingBench ( Wu et al., 2025 ) to evaluate the model’s proficiency and creativity. Math & Text Reasoning : For evaluating mathematical and logical reasoning skills, we employ high-level math benchmarks including MATH-500 ( Lightman et al., 2023 ) , AIME’24 and AIME’25 ( AIME, 2025 ) , and text reasoning tasks including ZebraLogic ( Lin et al., 2025 ) and AutoLogi ( Zhu et al., 2025 ) . For AIME problems, each year’s questions include Part I and Part II, totaling 30 questions. For each question, we sample 64 times and take the average accuracy as the final score. Agent & Coding : To test the model’s proficiency in coding and agent-based tasks, we use BFCL v3 ( Yan et al., 2024 ) , LiveCodeBench (v5, 2024.10-2025.02) ( Jain et al., 2024 ) , and Codeforces Ratings from CodeElo ( Quan et al., 2025 ) . For BFCL, all Qwen3 models are evaluated using the FC format, and yarn was used to deploy the models to a context length of 64k for Multi-Turn evaluation. Some baselines are derived from the BFCL leaderboard, taking the higher scores between FC and Prompt formats. For models not reported on the leaderboard, the Prompt formats are evaluated. For LiveCodeBench, for the non-thinking mode, we use the officially recommended prompt, while for the thinking mode, we adjust the prompt template to allow the model to think more freely, by removing the restriction You will not return anything except for the program . To evaluate the performance gap between models and competitive programming experts, we use CodeForces to calculate Elo ratings. In our benchmark, each problem is solved by generating up to eight independent reasoning attempts. Multilingual Tasks : For multilingual capabilities, we evaluate four kinds of tasks: instruction following, knowledge, mathematics, and logical reasoning. Instruction following is assessed using Multi-IF ( He et al., 2024 ) , which focuses on 8 key languages. Knowledge assessment consisted of two types: regional knowledge evaluated through INCLUDE ( Romanou et al., 2024 ) , covering 44 languages, and general knowledge assessed with MMMLU ( OpenAI, 2024 ) across 14 languages, excluding the unoptimized Yoruba language; for these two benchmarks, we sample only 10% of the original data to improve evaluation efficiency. The mathematics task employ MT-AIME2024 ( Son et al., 2025 ) , encompassing 55 languages, and PolyMath ( Wang et al., 2025 ) , which includes 18 languages. Logical reasoning is evaluated using MlogiQA, covering 10 languages, sourced from Zhang et al. (2024) . OpenAI-o1 DeepSeek-R1 Grok-3-Beta (Think) Gemini2.5-Pro Qwen3-235B-A22B Architecture - MoE - - MoE # Activated Params - 37B - - 22B # Total Params - 671B - - 235B General Tasks MMLU-Redux 92.8 92.9 - 93.7 92.7 GPQA-Diamond 78.0 71.5 80.2 84.0 71.1 C-Eval 85.5 91.8 - 82.9 89.6 LiveBench 2024-11-25 75.7 71.6 - 82.4 77.1 Alignment Tasks IFEval strict prompt 92.6 83.3 - 89.5 83.4 Arena-Hard 92.1 92.3 - 96.4 95.6 AlignBench v1.1 8.86 8.76 - 9.03 8.94 Creative Writing v3 81.7 85.5 - 86.0 84.6 WritingBench 7.69 7.71 - 8.09 8.03 Math & Text Reasoning MATH-500 96.4 97.3 98.8 98.0 AIME’24 74.3 79.8 83.9 92.0 85.7 AIME’25 79.2 70.0 77.3 86.7 81.5 ZebraLogic 81.0 78.7 - 87.4 80.3 AutoLogi 79.8 86.1 - 85.4 89.0 Agent & Coding BFCL v3 67.8 56.9 - 62.9 70.8 LiveCodeBench v5 63.9 64.3 70.6 70.4 70.7 CodeForces (Rating / Percentile) 1891 / 96.7% 2029 / 98.1% - 2001 / 97.9% 2056 / 98.2% Multilingual Tasks Multi-IF 48.8 67.7 - 77.8 71.9 INCLUDE 84.6 82.7 - 85.1 78.7 MMMLU 14 languages 88.4 86.4 - 86.9 84.3 MT-AIME2024 67.4 73.5 - 76.9 80.8 PolyMath 38.9 47.1 - 52.2 54.7 MLogiQA 75.5 73.8 - 75.6 77.1 GPT-4o -2024-11-20 DeepSeek-V3 Qwen2.5-72B -Instruct LLaMA-4 -Maverick Qwen3-235B-A22B Architecture - MoE Dense MoE MoE # Activated Params - 37B 72B 17B 22B # Total Params - 671B 72B 402B 235B General Tasks MMLU-Redux 87.0 89.1 86.8 91.8 89.2 GPQA-Diamond 46.0 59.1 49.0 69.8 62.9 C-Eval 75.5 86.5 84.7 83.5 86.1 LiveBench 2024-11-25 52.2 60.5 51.4 59.5 62.5 Alignment Tasks IFEval strict prompt 86.5 86.1 84.1 86.7 83.2 Arena-Hard 85.3 85.5 81.2 82.7 96.1 AlignBench v1.1 8.42 8.64 7.89 7.97 8.91 Creative Writing v3 81.1 74.0 61.8 61.3 80.4 WritingBench 7.11 6.49 7.06 5.46 7.70 Math & Text Reasoning MATH-500 77.2 90.2 83.6 90.6 91.2 AIME’24 11.1 39.2 18.9 38.5 40.1 AIME’25 7.6 28.8 15.0 15.9 24.7 ZebraLogic 27.4 42.1 26.6 40.0 37.7 AutoLogi 65.9 76.1 66.1 75.2 83.3 Agent & Coding BFCL v3 72.5 57.6 63.4 52.9 68.0 LiveCodeBench v5 32.7 33.1 30.7 37.2 35.3 CodeForces (Rating / Percentile) 864 / 35.4% 1134 / 54.1% 859 / 35.0% 712 / 24.3% 1387 / 75.7% Multilingual Tasks Multi-IF 65.6 55.6 65.3 75.5 70.2 INCLUDE 78.8 76.7 69.6 80.9 75.6 MMMLU 14 languages 80.3 81.1 76.9 82.5 79.8 MT-AIME2024 9.2 20.9 12.7 27.0 32.4 PolyMath 13.7 20.4 16.9 26.1 27.0 MLogiQA 57.4 58.9 59.3 59.9 67.6 Our flagship model, Qwen3-235B-A22B, demonstrates the state-of-the-art overall performance among open-source models in both the thinking and non-thinking modes, surpassing strong baselines such as DeepSeek-R1 and DeepSeek-V3. Qwen3-235B-A22B is also highly competitive to closed-source leading models, such as OpenAI-o1, Gemini2.5-Pro, and GPT-4o, showcasing its profound reasoning capabilities and comprehensive general abilities. Our flagship dense model, Qwen3-32B, outperforms our previous strongest reasoning model, QwQ-32B, in most of the benchmarks, and performs comparably to the closed-source OpenAI-o3-mini, indicating its compelling reasoning capabilities. Qwen3-32B is also remarkably performant in the non-thinking mode and surpasses our previous flagship non-reasoning dense model, Qwen2.5-72B-Instruct. Our lightweight models, including Qwen3-30B-A3B, Qwen3-14B, and other smaller dense ones, possess consistently superior performance to the open-source models with a close or larger amount of parameters, proving the success of our Strong-to-Weak Distillation approach. From Table 11 , with only 60% activated and 35% total parameters, Qwen3-235B-A22B (Thinking) outperforms DeepSeek-R1 on 17/23 the benchmarks, particularly on the reasoning-demanded tasks (e.g., mathematics, agent, and coding), demonstrating the state-of-the-art reasoning capabilities of Qwen3-235B-A22B among open-source models. Moreover, Qwen3-235B-A22B (Thinking) is also highly competitive to the closed-source OpenAI-o1, Grok-3-Beta (Think), and Gemini2.5-Pro, substantially narrowing the gap in the reasoning capabilities between open-source and close-source models. From Table 12 , Qwen3-235B-A22B (Non-thinking) exceeds the other leading open-source models, including DeepSeek-V3, LLaMA-4-Maverick, and our previous flagship model Qwen2.5-72B-Instruct, and also surpasses the closed-source GPT-4o-2024-11-20 in 18/23 the benchmarks, indicating its inherent strong capabilities even when not enhanced with the deliberate thinking process. From Table 13 , Qwen3-32B (Thinking) outperforms QwQ-32B on 17/23 the benchmarks, making it the new state-of-the-art reasoning model at the sweet size of 32B. Moreover, Qwen3-32B (Thinking) also competes with the closed-source OpenAI-o3-mini (medium) with better alignment and multilingual performance. From Table 14 , Qwen3-32B (Non-thinking) exhibits superior performance to all the baselines on almost all the benchmarks. Particularly, Qwen3-32B (Non-thinking) performs on par with Qwen2.5-72B-Instruct on the general tasks with significant advantages on the alignment, multilingual, and reasoning-related tasks, again proving the fundamental improvements of Qwen3 over our previous Qwen2.5 series models. DeepSeek-R1 -Distill-Llama-70B QwQ-32B OpenAI-o3-mini (medium) Qwen3-32B Architecture Dense Dense - Dense # Activated Params 70B 32B - 32B # Total Params 70B 32B - 32B General Tasks MMLU-Redux 89.3 90.0 90.0 90.9 GPQA-Diamond 65.2 65.6 76.8 68.4 C-Eval 71.8 88.4 75.1 87.3 LiveBench 2024-11-25 54.5 72.0 70.0 74.9 Alignment Tasks IFEval strict prompt 79.3 83.9 91.5 85.0 Arena-Hard 60.6 89.5 89.0 93.8 AlignBench v1.1 6.74 8.70 8.38 8.72 Creative Writing v3 62.1 82.4 74.8 81.0 WritingBench 6.08 7.86 7.52 7.90 Math & Text Reasoning MATH-500 94.5 98.0 98.0 97.2 AIME’24 70.0 79.5 79.6 81.4 AIME’25 56.3 69.5 74.8 72.9 ZebraLogic 71.3 76.8 88.9 88.8 AutoLogi 83.5 88.1 86.3 87.3 Agent & Coding BFCL v3 49.3 66.4 64.6 70.3 LiveCodeBench v5 54.5 62.7 66.3 65.7 CodeForces (Rating / Percentile) 1633 / 91.4% 1982 / 97.7% 2036 / 98.1% 1977 / 97.7% Multilingual Tasks Multi-IF 57.6 68.3 48.4 73.0 INCLUDE 62.1 69.7 73.1 73.7 MMMLU 14 languages 69.6 80.9 79.3 80.6 MT-AIME2024 29.3 68.0 73.9 75.0 PolyMath 29.4 45.9 38.6 47.4 MLogiQA 60.3 75.5 71.1 76.3 GPT-4o-mini -2024-07-18 LLaMA-4 -Scout Qwen2.5-72B -Instruct Qwen3-32B Architecture - MoE Dense Dense # Activated Params - 17B 72B 32B # Total Params - 109B 72B 32B General Tasks MMLU-Redux 81.5 86.3 86.8 85.7 GPQA-Diamond 40.2 57.2 49.0 54.6 C-Eval 66.3 78.2 84.7 83.3 LiveBench 2024-11-25 41.3 47.6 51.4 59.8 Alignment Tasks IFEval strict prompt 80.4 84.7 84.1 83.2 Arena-Hard 74.9 70.5 81.2 92.8 AlignBench v1.1 7.81 7.49 7.89 8.58 Creative Writing v3 70.3 55.0 61.8 78.3 WritingBench 5.98 5.49 7.06 7.54 Math & Text Reasoning MATH-500 78.2 82.6 83.6 88.6 AIME’24 8.1 28.6 18.9 31.0 AIME’25 8.8 10.0 15.0 20.2 ZebraLogic 20.1 24.2 26.6 29.2 AutoLogi 52.6 56.8 66.1 78.5 Agent & Coding BFCL v3 64.0 45.4 63.4 63.0 LiveCodeBench v5 27.9 29.8 30.7 31.3 CodeForces (Rating / Percentile) 1113 / 52.6% 981 / 43.7% 859 / 35.0% 1353 / 71.0% Multilingual Tasks Multi-IF 62.4 64.2 65.3 70.7 INCLUDE 66.0 74.1 69.6 70.9 MMMLU 14 languages 72.1 77.5 76.9 76.5 MT-AIME2024 6.0 19.1 12.7 24.1 PolyMath 12.0 20.9 16.9 22.5 MLogiQA 42.6 53.9 59.3 62.9 DeepSeek-R1 -Distill-Qwen-32B QwQ-32B Qwen3-14B Qwen3-30B-A3B Architecture Dense Dense Dense MoE # Activated Params 32B 32B 14B 3B # Total Params 32B 32B 14B 30B General Tasks MMLU-Redux 88.2 90.0 88.6 89.5 GPQA-Diamond 62.1 65.6 64.0 65.8 C-Eval 82.2 88.4 86.2 86.6 LiveBench 2024-11-25 45.6 72.0 71.3 74.3 Alignment Tasks IFEval strict prompt 72.5 83.9 85.4 86.5 Arena-Hard 60.8 89.5 91.7 91.0 AlignBench v1.1 7.25 8.70 8.56 8.70 Creative Writing v3 55.0 82.4 80.3 79.1 WritingBench 6.13 7.86 7.80 7.70 Math & Text Reasoning MATH-500 94.3 98.0 96.8 98.0 AIME’24 72.6 79.5 79.3 80.4 AIME’25 49.6 69.5 70.4 70.9 ZebraLogic 69.6 76.8 88.5 89.5 AutoLogi 74.6 88.1 89.2 88.7 Agent & Coding BFCL v3 53.5 66.4 70.4 69.1 LiveCodeBench v5 54.5 62.7 63.5 62.6 CodeForces (Rating / Percentile) 1691 / 93.4% 1982 / 97.7% 1766 / 95.3% 1974 / 97.7% Multilingual Tasks Multi-IF 31.3 68.3 74.8 72.2 INCLUDE 68.0 69.7 71.7 71.9 MMMLU 14 languages 78.6 80.9 77.9 78.4 MT-AIME2024 44.6 68.0 73.3 73.9 PolyMath 35.1 45.9 45.8 46.1 MLogiQA 63.3 75.5 71.1 70.1 Phi-4 Gemma-3 -27B-IT Qwen2.5-32B -Instruct Qwen3-14B Qwen3-30B-A3B Architecture Dense Dense Dense Dense MoE # Activated Params 14B 27B 32B 14B 3B # Total Params 14B 27B 32B 14B 30B General Tasks MMLU-Redux 85.3 82.6 83.9 82.0 84.1 GPQA-Diamond 56.1 42.4 49.5 54.8 54.8 C-Eval 66.9 66.6 80.6 81.0 82.9 LiveBench 2024-11-25 41.6 49.2 50.0 59.6 59.4 Alignment Tasks IFEval strict prompt 62.1 80.6 79.5 84.8 83.7 Arena-Hard 75.4 86.8 74.5 86.3 88.0 AlignBench v1.1 7.61 7.80 7.71 8.52 8.55 Creative Writing v3 51.2 82.0 54.6 73.1 68.1 WritingBench 5.73 7.22 5.90 7.24 7.22 Math & Text Reasoning MATH-500 80.8 90.0 84.6 90.0 89.8 AIME’24 22.9 32.6 18.8 31.7 32.8 AIME’25 17.3 24.0 12.8 23.3 21.6 ZebraLogic 32.3 24.6 26.1 33.0 33.2 AutoLogi 66.2 64.2 65.5 82.0 81.5 Agent & Coding BFCL v3 47.0 59.1 62.8 61.5 58.6 LiveCodeBench v5 25.2 26.9 26.4 29.0 29.8 CodeForces (Rating / Percentile) 1280 / 65.3% 1063 / 49.3% 903 / 38.2% 1200 / 58.6% 1267 / 64.1% Multilingual Tasks Multi-IF 49.5 69.8 63.2 72.9 70.8 INCLUDE 65.3 71.4 67.5 67.8 67.8 MMMLU 14 languages 74.7 76.1 74.2 72.6 73.8 MT-AIME2024 13.1 23.0 15.3 23.2 24.6 PolyMath 17.4 20.3 18.3 22.0 23.3 MLogiQA 53.1 58.5 58.0 58.9 53.3 DeepSeek-R1 -Distill-Qwen-14B DeepSeek-R1 -Distill-Qwen-32B Qwen3-4B Qwen3-8B Architecture Dense Dense Dense Dense # Activated Params 14B 32B 4B 8B # Total Params 14B 32B 4B 8B General Tasks MMLU-Redux 84.1 88.2 83.7 87.5 GPQA-Diamond 59.1 62.1 55.9 62.0 C-Eval 78.1 82.2 77.5 83.4 LiveBench 2024-11-25 52.3 45.6 63.6 67.1 Alignment Tasks IFEval strict prompt 72.6 72.5 81.9 85.0 Arena-Hard 48.0 60.8 76.6 85.8 AlignBench v1.1 7.43 7.25 8.30 8.46 Creative Writing v3 54.2 55.0 61.1 75.0 WritingBench 6.03 6.13 7.35 7.59 Math & Text Reasoning MATH-500 93.9 94.3 97.0 97.4 AIME’24 69.7 72.6 73.8 76.0 AIME’25 44.5 49.6 65.6 67.3 ZebraLogic 59.1 69.6 81.0 84.8 AutoLogi 78.6 74.6 87.9 89.1 Agent & Coding BFCL v3 49.5 53.5 65.9 68.1 LiveCodeBench v5 45.5 54.5 54.2 57.5 CodeForces (Rating / Percentile) 1574 / 89.1% 1691 / 93.4% 1671 / 92.8% 1785 / 95.6% Multilingual Tasks Multi-IF 29.8 31.3 66.3 71.2 INCLUDE 59.7 68.0 61.8 67.8 MMMLU 14 languages 73.8 78.6 69.8 74.4 MT-AIME2024 33.7 44.6 60.7 65.4 PolyMath 28.6 35.1 40.0 42.7 MLogiQA 53.6 63.3 65.9 69.0 LLaMA-3.1-8B -Instruct Gemma-3 -12B-IT Qwen2.5-7B -Instruct Qwen2.5-14B -Instruct Qwen3-4B Qwen3-8B Architecture Dense Dense Dense Dense Dense Dense # Activated Params 8B 12B 7B 14B 4B 8B # Total Params 8B 12B 7B 14B 4B 8B General Tasks MMLU-Redux 61.7 77.8 75.4 80.0 77.3 79.5 GPQA-Diamond 32.8 40.9 36.4 45.5 41.7 39.3 C-Eval 52.0 61.1 76.2 78.0 72.2 77.9 LiveBench 2024-11-25 26.0 43.7 34.9 42.2 48.4 53.5 Alignment Tasks IFEval strict prompt 75.0 80.2 71.2 81.0 81.2 83.0 Arena-Hard 30.1 82.6 52.0 68.3 66.2 79.6 AlignBench v1.1 6.01 7.77 7.27 7.67 8.10 8.38 Creative Writing v3 52.8 79.9 49.8 55.8 53.6 64.5 WritingBench 4.57 7.05 5.82 5.93 6.85 7.15 Math & Text Reasoning MATH-500 54.8 85.6 77.6 83.4 84.8 87.4 AIME’24 6.3 22.4 9.1 15.2 25.0 29.1 AIME’25 2.7 18.8 12.1 13.6 19.1 20.9 ZebraLogic 12.8 17.8 12.0 19.7 35.2 26.7 AutoLogi 30.9 58.9 42.9 57.4 76.3 76.5 Agent & Coding BFCL v3 49.6 50.6 55.8 58.7 57.6 60.2 LiveCodeBench v5 10.8 25.7 14.4 21.9 21.3 22.8 CodeForces (Rating / Percentile) 473 / 14.9% 462 / 14.7% 191 / 0.0% 904 / 38.3% 842 / 33.7% 1110 / 52.4% Multilingual Tasks Multi-IF 52.1 65.6 47.7 55.5 61.3 69.2 INCLUDE 34.0 65.3 53.6 63.5 53.8 62.5 MMMLU 14 languages 44.4 70.0 61.4 70.3 61.7 66.9 MT-AIME2024 0.4 16.7 5.5 8.5 13.9 16.6 PolyMath 5.8 17.6 11.9 15.0 16.6 18.8 MLogiQA 41.9 54.5 49.5 51.3 49.9 51.4 DeepSeek-R1 -Distill-Qwen-1.5B DeepSeek-R1 -Distill-Llama-8B Qwen3-0.6B Qwen3-1.7B Architecture Dense Dense Dense Dense # Activated Params 1.5B 8B 0.6B 1.7B # Total Params 1.5B 8B 0.6B 1.7B General Tasks MMLU-Redux 45.4 66.4 55.6 73.9 GPQA-Diamond 33.8 49.0 27.9 40.1 C-Eval 27.1 50.4 50.4 68.1 LiveBench 2024-11-25 24.9 40.6 30.3 51.1 Alignment Tasks IFEval strict prompt 39.9 59.0 59.2 72.5 Arena-Hard 4.5 17.6 8.5 43.1 AlignBench v1.1 5.00 6.24 6.10 7.60 Creative Writing v3 16.4 51.1 30.6 48.0 WritingBench 4.03 5.42 5.61 7.02 Math & Text Reasoning MATH-500 83.9 89.1 77.6 93.4 AIME’24 28.9 50.4 10.7 48.3 AIME’25 22.8 27.8 15.1 36.8 ZebraLogic 4.9 37.1 30.3 63.2 AutoLogi 19.1 63.4 61.6 83.2 Agent & Coding BFCL v3 14.0 21.5 46.4 56.6 LiveCodeBench v5 13.2 42.5 12.3 33.2 Multilingual Tasks Multi-IF 13.3 27.0 36.1 51.2 INCLUDE 21.9 34.5 35.9 51.8 MMMLU 14 languages 27.3 40.1 43.1 59.1 MT-AIME2024 12.4 13.2 7.8 36.1 PolyMath 14.5 10.8 11.4 25.2 MLogiQA 29.0 32.8 40.9 56.0 Gemma-3 -1B-IT Phi-4-mini Qwen2.5-1.5B -Instruct Qwen2.5-3B -Instruct Qwen3-0.6B Qwen3-1.7B Architecture Dense Dense Dense Dense Dense Dense # Activated Params 1.0B 3.8B 1.5B 3.1B 0.6B 1.7B # Total Params 1.0B 3.8B 1.5B 3.1B 0.6B 1.7B General Tasks MMLU-Redux 33.3 67.9 50.7 64.4 44.6 64.4 GPQA-Diamond 19.2 25.2 29.8 30.3 22.9 28.6 C-Eval 28.5 40.0 53.3 68.2 42.6 61.0 LiveBench 2024-11-25 14.4 25.3 18.0 23.8 21.8 35.6 Alignment Tasks IFEval strict prompt 54.5 68.6 42.5 58.2 54.5 68.2 Arena-Hard 17.8 32.8 9.0 23.7 6.5 36.9 AlignBench v1.1 5.3 6.00 5.60 6.49 5.60 7.20 Creative Writing v3 52.8 10.3 31.5 42.8 28.4 43.6 WritingBench 5.18 4.05 4.67 5.55 5.13 6.54 Math & Text Reasoning MATH-500 46.4 67.6 55.0 67.2 55.2 73.0 AIME’24 0.9 8.1 0.9 6.7 3.4 13.4 AIME’25 0.8 5.3 0.4 4.2 2.6 9.8 ZebraLogic 1.9 2.7 3.4 4.8 4.2 12.8 AutoLogi 16.4 28.8 22.5 29.9 37.4 59.8 Agent & Coding BFCL v3 16.3 31.3 47.8 50.4 44.1 52.2 LiveCodeBench v5 1.8 10.4 5.3 9.2 3.6 11.6 Multilingual Tasks Multi-IF 32.8 40.5 20.2 32.3 33.3 44.7 INCLUDE 32.7 43.8 33.1 43.8 34.4 42.6 MMMLU 14 languages 32.5 51.4 40.4 51.8 37.1 48.3 MT-AIME2024 0.2 0.9 0.7 1.6 1.5 4.9 PolyMath 3.5 6.7 5.0 7.3 4.6 10.3 MLogiQA 31.8 39.5 40.9 39.5 37.3 41.1 From Table 15 , Qwen3-30B-A3B and Qwen3-14B (Thinking) are both highly competitive to QwQ-32B, especially on the reasoning-related benchmarks. It is noteworthy that Qwen3-30B-A3B achieves comparable performance to QwQ-32B with a smaller model size and less than 1/10 activated parameters, demonstrating the effectiveness of our Strong-to-Weak Distillation approach in endowing lightweight models with profound reasoning capabilities. From Table 16 , Qwen3-30B-A3B and Qwen3-14B (Non-thinking) surpass the non-reasoning baselines in most of the benchmarks. They exceed our previous Qwen2.5-32B-Instruct model with significantly fewer activated and total parameters, allowing for more efficient and cost-effective performance. CounterFactQA : Contains counterfactual questions where the model needs to identify that the questions are not factual and avoid generating hallucinatory answers. LengthCtrl : Includes creative writing tasks with length requirements; the final score is based on the difference between the generated content length and the target length. ThinkFollow : Involves multi-turn dialogues with randomly inserted /think and /no_think flags to test whether the model can correctly switch thinking modes based on user queries. ToolUse : Evaluates the stability of the model in single-turn, multi-turn, and multi-step tool calling processes. The score includes accuracy in intent recognition, format accuracy, and parameter accuracy during the tool calling process. Stage 3 integrates the non-thinking mode into the model, which already possesses thinking capabilities after the first two stages of training. The ThinkFollow benchmark score of 88.7 indicates that the model has developed an initial ability to switch between modes, though it still occasionally makes errors. Stage 3 also enhances the model’s general and instruction-following capabilities in thinking mode, with CounterFactQA improving by 10.9 points and LengthCtrl by 8.0 points. Stage 4 further strengthens the model’s general, instruction-following, and agent capabilities in both thinking and non-thinking modes. Notably, the ThinkFollow score improves to 98.9, ensuring accurate mode switching. For Knowledge, STEM, Math, and Coding tasks, Thinking Mode Fusion and General RL do not bring significant improvements. In contrast, for challenging tasks like AIME’24 and LiveCodeBench, the performance in thinking mode actually decreases after these two training stages. We conjecture this degradation is due to the model being trained on a broader range of general tasks, which may compromise its specialized capabilities in handling complex problems. During the development of Qwen3, we choose to accept this performance trade-off to enhance the model’s overall versatility.

<sub>§4 Post-training</sub>

### 3. Long-CoT Cold Start

We begin by curating a comprehensive dataset that spans a wide range of categories, including math, code, logical reasoning, and general STEM problems. Each problem in the dataset is paired with verified reference answers or code-based test cases. This dataset serves as the foundation for the “cold start” phase of long Chain-of-Thought (long-CoT) training. The dataset construction involves a rigorous two-phase filtering process: query filtering and response filtering. In the query filtering phase, we use Qwen2.5-72B-Instruct to identify and remove queries that are not easily verifiable. This includes queries containing multiple sub-questions or those asking for general text generation. Furthermore, we exclude queries that Qwen2.5-72B-Instruct can answer correctly without using CoT reasoning. This helps prevent the model from relying on superficial guessing and ensures that only complex problems requiring deeper reasoning are included. Additionally, we annotate each query’s domain using Qwen2.5-72B-Instruct to maintain balanced domain representation across the dataset. After reserving a validation query set, we generate N N candidate responses for each remaining query using QwQ-32B ( Qwen Team, 2025 ) . When QwQ-32B consistently fails to generate correct solutions, human annotators manually assess the accuracy of the responses. For queries with positive Pass@ N N , further stringent filtering criteria are applied to remove responses that (1) yield incorrect final answers, (2) contain substantial repetition, (3) clearly indicate guesswork without adequate reasoning, (4) exhibit inconsistencies between the thinking and summary contents, (5) involve inappropriate language mixing or stylistic shifts, or (6) are suspected of being overly similar to potential validation set items. Subsequently, a carefully selected subset of the refined dataset is used for the initial cold-start training of the reasoning patterns. The objective at this stage is to instill foundational reasoning patterns in the model without overly emphasizing immediate reasoning performance. This approach ensures that the model’s potential is not limited, allowing for greater flexibility and improvement during the subsequent reinforcement learning (RL) phase. To achieve this objective effectively, it is preferable to minimize both the number of training samples and the training steps during this preparatory phase.

<sub>§4.1 Long-CoT Cold Start</sub>

### 4. Reasoning RL

The query-verifier pairs used in the Reasoning RL stage must satisfy the following four criteria: (1) They were not used during the cold-start phase. (2) They are learnable for the cold-start model. (3) They are as challenging as possible. (4) They cover a broad range of sub-domains. We ultimately collect a total of 3,995 query-verifier pairs, and employed GRPO ( Shao et al., 2024 ) to update the model parameters. We observe that using a large batch size and a high number of rollouts per query, along with off-policy training to improve sample efficiency, is beneficial to the training process. We have also addressed how to balance exploration and exploitation by controlling the model’s entropy to increase steadily or remain stable, which is crucial for maintaining stable training. As a result, we achieve consistent improvements in both training reward and validation performance over the course of a single RL run, without any manual intervention on hyperparameters. For instance, the AIME’24 score of the Qwen3-235B-A22B model increases from 70.1 to 85.1 over a total of 170 RL training steps.

<sub>§4.2 Reasoning RL</sub>

### 5. Thinking Mode Fusion

The goal of the Thinking Mode Fusion stage is to integrate the “non-thinking” capabilities into the previously developed “thinking” model. This approach allows developers to manage and control reasoning behaviors, while also reducing the cost and complexity of deploying separate models for thinking and non-thinking tasks. To achieve this, we conduct continual supervised fine-tuning (SFT) on the Reasoning RL model and design a chat template to fuse the two modes. Moreover, we find that models capable of handling both modes proficiently perform consistently well under different thinking budgets.

<sub>§4.3 Thinking Mode Fusion</sub>

### 6. Construction of SFT data.

The SFT dataset combines both the “thinking” and “non-thinking” data. To ensure that the performance of the Stage 2 model is not compromised by the additional SFT, the “thinking” data is generated via rejection sampling on Stage 1 queries using the Stage 2 model itself. The “non-thinking” data, on the other hand, is carefully curated to cover a diverse range of tasks, including coding, mathematics, instruction-following, multilingual tasks, creative writing, question answering, and role-playing. Additionally, we employ automatically generated checklists for assessing the response quality of “non-thinking” data. To enhance the performance on tasks with low-resource languages, we particularly increase the proportion of translation tasks.

<sub>§Construction of SFT data.</sub>

### 7. Chat Template Design.

To better integrate the two modes and enable users to dynamically switch the model’s thinking process, we design chat templates for Qwen3, as shown in Table 9 . Specifically, for samples in thinking mode and non-thinking mode, we introduce /think and /no_think flags in the user query or system message, respectively. This allows the model to follow the user’s input and select the appropriate thinking mode accordingly. For non-thinking mode samples, we retain an empty thinking block in the assistant’s response. This design ensures internal format consistency within the model and allows developers to prevent the model from engaging in thinking behavior by concatenating an empty think block in the chat template. By default, the model operates in thinking mode; therefore, we add some thinking mode training samples where the user queries do not include /think flags. For more complex multi-turn dialogs, we randomly insert multiple /think and /no_think flags into users’ queries, with the model response adhering to the last flag encountered.

<sub>§Chat Template Design.</sub>

### 8. Thinking Budget.

An additional advantage of Thinking Mode Fusion is that, once the model learns to respond in both non-thinking and thinking modes, it naturally develops the ability to handle intermediate cases—generating responses based on incomplete thinking. This capability lays the foundation for implementing budget control over the model’s thinking process. Specifically, when the length of the model’s thinking reaches a user-defined threshold, we manually halt the thinking process and insert the stop-thinking instruction: “ Considering the limited time by the user, I have to give the solution based on the thinking directly now.\n</think>.\n\n ”. After this instruction is inserted, the model proceeds to generate a final response based on its accumulated reasoning up to that point. It is worth noting that this ability is not explicitly trained but emerges naturally as a result of applying Thinking Mode Fusion.

<sub>§Thinking Budget.</sub>

### 9. General RL / Strong-to-Weak Distillation

The General RL stage aims to broadly enhance the models’ capabilities and stability across diverse scenarios. To facilitate this, we have established a sophisticated reward system covering over 20 distinct tasks , each with customized scoring criteria. These tasks specifically target enhancements in the following core capabilities: To provide feedback for the aforementioned tasks, we utilized three distinct types of rewards: The Strong-to-Weak Distillation pipeline is specifically designed to optimize lightweight models, encompassing 5 dense models (Qwen3-0.6B, 1.7B, 4B, 8B, and 14B) and one MoE model (Qwen3-30B-A3B). This approach enhances model performance while effectively imparting robust mode-switching capabilities. The distillation process is divided into two primary phases:

<sub>§4.4 General RL · §4.5 Strong-to-Weak Distillation</sub>

### 10. Qwen3-235B-A22B / Qwen3-32B / Qwen3-30B-A3B & Qwen3-14B

For our flagship model Qwen3-235B-A22B, we compare it with the leading reasoning and non-reasoning models. For the thinking mode, we take OpenAI-o1 ( OpenAI, 2024 ) , DeepSeek-R1 ( Guo et al., 2025 ) , Grok-3-Beta (Think) ( xAI, 2025 ) , and Gemini2.5-Pro ( DeepMind, 2025 ) as the reasoning baselines. For the non-thinking mode, we take GPT-4o-2024-11-20 ( OpenAI, 2024 ) , DeepSeek-V3 ( Liu et al., 2024a ) , Qwen2.5-72B-Instruct ( Yang et al., 2024b ) , and LLaMA-4-Maverick ( Meta-AI, 2025 ) as the non-reasoning baselines. We present the evaluation results in Table 11 and 12 . For our flagship dense model, Qwen3-32B, we take DeepSeek-R1-Distill-Llama-70B, OpenAI-o3-mini (medium), and our previous strongest reasoning model, QwQ-32B ( Qwen Team, 2025 ) , as the baselines in the thinking mode. We also take GPT-4o-mini-2024-07-18, LLaMA-4-Scout, and our previous flagship model, Qwen2.5-72B-Instruct, as the baselines in the non-thinking mode. We present the evaluation results in Table 13 and 14 . For Qwen3-30B-A3B and Qwen3-14B, we compare them with DeepSeek-R1-Distill-Qwen-32B and QwQ-32B in the thinking mode, and Phi-4 ( Abdin et al., 2024 ) , Gemma-3-27B-IT ( Team et al., 2025 ) , and Qwen2.5-32B-Instruct in the non-thinking mode, respectively. We present the evaluation results in Table 15 and 16 .

<sub>§Qwen3-235B-A22B · §Qwen3-32B · §Qwen3-30B-A3B & Qwen3-14B</sub>

### 11. Qwen3-8B / 4B / 1.7B / 0.6B

For Qwen3-8B and Qwen3-4B, we compare them with DeepSeek-R1-Distill-Qwen-14B and DeepSeek-R1-Distill-Qwen-32B in the thinking mode, and LLaMA-3.1-8B-Instruct ( Dubey et al., 2024 ) , Gemma-3-12B-IT ( Team et al., 2025 ) , Qwen2.5-7B-Instruct, and Qwen2.5-14B-Instruct in the non-thinking mode, respectively. For Qwen3-1.7B and Qwen3-0.6B, we compare them with DeepSeek-R1-Distill-Qwen-1.5B and DeepSeek-R1-Distill-Llama-8B in the thinking mode, and Gemma-3-1B-IT, Phi-4-mini, Qwen2.5-1.5B-Instruct, and Qwen2.5-3B-Instruct in the non-thinking mode, respectively. We present the evaluation results of Qwen3-8B and Qwen3-4B in Table 17 and 18 and those of Qwen3-1.7B and Qwen3-0.6B in Table 19 and 20 , respectively. Overall, these edge-side models exhibit impressive performance and outperform baselines even with more parameters, including our previous Qwen2.5 models, in either the thinking or the non-thinking mode. These results, once again, demonstrate the efficacy of our Strong-to-Weak Distillation approach, making it possible for us to build the lightweight Qwen3 models with remarkably reduced costs and efforts.

<sub>§Qwen3-8B / 4B / 1.7B / 0.6B</sub>

### 12. The Effectiveness of Thinking Budget

To verify that Qwen3 can enhance its intelligence level by leveraging an increased thinking budget, we adjust the allocated thinking budget on four benchmarks across Mathematics, Coding, and STEM domains. The resulting scaling curves are presented in Figure 2 , Qwen3 demonstrates scalable and smooth performance improvements correlated to the allocated thinking budget. Moreover, we observe that if we further extend the output length beyond 32K, the model’s performance is expected to improve further in the future. We leave this exploration as future work.

<sub>§The Effectiveness of Thinking Budget</sub>

### 13. The Effectiveness and Efficiency of On-Policy Distillation

We evaluate the effectiveness and efficiency of on-policy distillation by comparing the performance and computational cost—measured in GPU hours—after undergoing distillation versus direct reinforcement learning, both starting from the same off-policy distilled 8B checkpoint. For simplicity, we focus solely on math and code-related queries in this comparison. The results, summarized in Table 21 , show that distillation achieves significantly better performance than reinforcement learning while requiring approximately only 1 / 10 1/10 of the GPU hours. Furthermore, distillation from teacher logits enables the student model to expand its exploration space and enhance its reasoning potential, as evidenced by the improved pass@64 scores on the AIME’24 and AIME’25 benchmarks after distillation, compared to the initial checkpoint. In contrast, reinforcement learning does not lead to any improvement in pass@64 scores. These observations highlight the advantages of leveraging a stronger teacher model in guiding student model learning.

<sub>§The Effectiveness and Efficiency of On-Policy Distillation</sub>

### 14. The Effects of Thinking Mode Fusion and General RL

To evaluate the effectiveness of Thinking Mode Fusion and General Reinforcement Learning (RL) during the post-training, we conduct evaluations on various stages of the Qwen-32B model. In addition to the datasets mentioned earlier, we introduce several in-house benchmarks to monitor other capabilities. These benchmarks include: The results are shown in Table 22 , where we can draw the following conclusions:

<sub>§The Effects of Thinking Mode Fusion and General RL</sub>

## 总结与展望
Qwen3 报告在调研方法方向里是个提醒：它的附录提到开启思考模式在部分检索型任务上反而略降。这条被引用得很少，但对我们重要——「更长的推理」不是免费的，在检索任务上它可能挤掉真正有用的查询。

**It connects to**

- `2503.09516` — 检索型任务上推理与检索的权衡在那里被显式建模。

## 不足之处
**What a reader should still not conclude**

- 这是技术报告里的一个附带观察，没有独立的消融实验支撑。

---

# Search-o1: Agentic Search-Enhanced Large Reasoning Models

arXiv:2501.05366 · 2025 · [source](https://arxiv.org/html/2501.05366)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Recently emerged large reasoning models (LRMs), exemplified by OpenAI’s o1 [ 22 ] , Qwen-QwQ [ 54 ] and DeepSeek-R1 [ 7 ] , employ large-scale reinforcement learning foster impressive long-sequence stepwise reasoning capabilities, offering promising solutions to complex reasoning problems [ 46 , 31 , 59 , 84 , 73 , 74 , 67 ] . This advancement has inspired a series of foundational efforts aimed at exploring and reproducing o1-like reasoning patterns, to broaden their application to a wider range of foundational models [ 49 , 19 , 77 , 80 , 71 , 25 , 45 ] .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Methodology"]
  N1["§3.1 Problem Formulation"]
  N2["§3.2 Overview of the Search-o1 Framework"]
  N3["§3.3 Agentic Retrieval-Augmented Generation Mechanism"]
  N4["§3.4 Knowledge Refinement via Reason-in-Documents"]
  N5["§3.5 Search-o1 Inference Process"]
  N6["§Inference Logic for a Single Question."]
  N7["§Batch Inference Mechanism."]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
```

![Analysis of reasoning uncertainty with QwQ-32B-Preview. Left : Examples of uncertain words identified during the reasoning process. Right : Average occurrence of high-frequency uncertain words per output in the GPQA diamond set.](https://arxiv.org/html/2501.05366v1/words_statistics.svg)

*Analysis of reasoning uncertainty with QwQ-32B-Preview. Left : Examples of uncertain words identified during the reasoning process. Right : Average occurrence of high-frequency uncertain words per output in the GPQA diamond set.*

<sub>figure: `2501.05366v1/words_statistics.svg`</sub>

## 机制
### 1. Methodology

Vanilla Reasoning Pattern: Consider the example in Figure 2 (a), where the task involves determining the carbon atom count in the final product of a three-step chemical reaction. The vanilla reasoning approach falters when encountering knowledge gaps (e.g., the “structure of trans-Cinnamaldehyde”). Without access to accurate information, the model must rely on assumptions, potentially leading to cascading errors throughout subsequent reasoning steps. Agentic RAG: To bridge the knowledge gaps during reasoning, we build the agentic RAG mechanism (Figure 2 (b)) to enable the model to autonomously retrieve external knowledge when needed. When uncertainty arises—such as regarding the compound’s structure—the model generates targeted search queries (e.g., “structure of trans-Cinnamaldehyde”). However, the direct insertion of retrieved documents, which often contain lengthy and irrelevant information, may disrupt the reasoning flow and hurt coherence. Search-o1: Our Search-o1 framework (Figure 2 (c)) extends the agentic RAG mechanism by incorporating a Reason-in-Documents module. This module condenses retrieved documents into focused reasoning steps that integrate external knowledge while maintaining the logical flow of the reasoning chain. It considers the current search query, retrieved documents, and the existing reasoning chain to generate coherent steps. This iterative process continues until the final answer is reached. The following sections provide detailed explanations of agentic RAG, Reason-in-Documents, and the Search-o1 inference process.

<sub>§3 Methodology</sub>

### 2. Problem Formulation

We consider a complex reasoning task that necessitates multi-step reasoning and the retrieval of external knowledge to derive solutions. The objective is to generate a comprehensive solution for each question q q , consisting of both a logical reasoning chain ℛ \mathcal{R} and the final answer a a . In this work, we enable the reasoning model to utilize external knowledge sources during the reasoning process. Specifically, we consider three primary inputs in the problem-solving process: the task instruction I I , the question q q , and externally retrieved documents 𝒟 \mathcal{D} . Here, I I provides an overarching description of the reasoning task, q q is the specific complex question to be answered, and 𝒟 \mathcal{D} comprises background knowledge dynamically retrieved from a relevant knowledge base. The goal is to design a reasoning mechanism that effectively integrates I I , q q , and 𝒟 \mathcal{D} to produce a coherent reasoning chain ℛ \mathcal{R} and a final answer a a . This can be formalized as the mapping ( I , q , 𝒟 ) → ( ℛ , a ) (I,q,\mathcal{D})\rightarrow(\mathcal{R},a) . The generation of the reasoning sequence and the final answer can be expressed as: where T r T_{r} is the number of tokens in the reasoning sequence ℛ \mathcal{R} . The token at the position t t is ℛ t \mathcal{R}_{t} , and ℛ < t \mathcal{R}_{<t} represents all tokens generated before position t t . 𝒟 ≤ t \mathcal{D}_{\leq t} represents all documents retrieved up to token t t in the reasoning chain. Similarly, T a T_{a} is the length of the answer sequence a a , with a t a_{t} being the token at the position t t and a < t a_{<t} indicating all generated answer tokens before the position t t .

<sub>§3.1 Problem Formulation</sub>

### 3. Overview of the Search-o1 Framework

The Search-o1 framework addresses knowledge insufficiency in large reasoning models (LRMs) by seamlessly integrating external knowledge retrieval into their reasoning process while maintaining chain-of-thought coherence. As illustrated in Figure 2 , we present a comparative analysis of three approaches: vanilla reasoning, agentic retrieval-augmented generation (RAG), and our proposed Search-o1 framework.

<sub>§3.2 Overview of the Search-o1 Framework</sub>

### 4. Agentic Retrieval-Augmented Generation Mechanism

The agentic RAG mechanism is a pivotal component of the Search-o1 framework, empowering the reasoning model to autonomously determine when to retrieve external knowledge during the reasoning process. This mechanism allows the model itself to decide whether to continue generating reasoning steps or to initiate a retrieval step. Detailed model instructions can be found in Appendix A.1 . During the generation of the reasoning chain ℛ \mathcal{R} , the model may intermittently generate search queries q search ( i ) q_{\text{search}}^{(i)} encapsulated between special symbols <|begin_search_query|> and <|end_search_query|> , where i i indexes the i i -th search step. Each search query is generated based on the current state of the reasoning process and the previously retrieved knowledge. The generation of each search query is expressed as: where T q ( i ) T_{q}^{(i)} is the length of the i i -th search query, q search , t ( i ) q_{\text{search},t}^{(i)} denotes the token generated at step t t of the i i -th search query, and ℛ ( i − 1 ) \mathcal{R}^{(i-1)} represents all the reasoning steps prior to the i i -th search step, including both search queries and search results. Once a new pair of special symbols for the search query is detected in the reasoning sequence, we pause the reasoning process, and the search query q search ( i ) q_{\text{search}}^{(i)} is extracted. The retrieval function Search is invoked to obtain relevant documents: where 𝒟 ( i ) = d 1 ( i ) , d 2 ( i ) , … , d k i ( i ) \mathcal{D}^{(i)}={d_{1}^{(i)},d_{2}^{(i)},\ldots,d_{k_{i}}^{(i)}} represents the set of top- k i k_{i} relevant documents retrieved for the i i -th search query. The retrieved documents 𝒟 ( i ) \mathcal{D}^{(i)} are subsequently injected into the reasoning chain ℛ ( i − 1 ) \mathcal{R}^{(i-1)} between the special symbols <|begin_search_result|> and <|end_search_result|> , allowing the reasoning model to utilize the external knowledge to continue the reasoning process. This agentic mechanism enables the model to dynamically and efficiently incorporate external knowledge, maintaining the coherence and relevance of the reasoning process while avoiding information overload from excessive or irrelevant retrieval results.

<sub>§3.3 Agentic Retrieval-Augmented Generation Mechanism</sub>

### 5. Knowledge Refinement via Reason-in-Documents

While the agentic RAG mechanism addresses knowledge gaps in reasoning, directly inserting full documents can disrupt coherence due to their length and redundancy. To overcome this, the Search-o1 framework includes the knowledge refinement module, which selectively integrates only relevant and concise information into the reasoning chain through a separate generation process using the original reasoning model. This module processes retrieved documents to align with the model’s specific reasoning needs, transforming raw information into refined, pertinent knowledge while maintaining coherence and logical consistency of the main reasoning chain. The refinement guidelines for Reason-in-Documents are detailed in Appendix A.1 . These guidelines instruct the model to analyze the retrieved web pages based on the previous reasoning steps, current search query, and the content of the searched web pages. The objective is to extract relevant and accurate information that directly contributes to advancing the reasoning process for the original question, ensuring seamless integration into the existing reasoning chain. For each search step i i , let ℛ ( < i ) \mathcal{R}^{(<i)} denote the reasoning chain accumulated up to just before the i i -th search query. Given ℛ ( < i ) \mathcal{R}^{(<i)} , the current search query q search ( i ) q_{\text{search}}^{(i)} , and the retrieved documents 𝒟 ( i ) \mathcal{D}^{(i)} , the knowledge refinement process operates in two stages: first generating an intermediate reasoning sequence r docs ( i ) {r}_{\text{docs}}^{(i)} to analyze the retrieved documents, then producing refined knowledge r final ( i ) {r}_{\text{final}}^{(i)} based on this analysis. The generation of the intermediate reasoning sequence r docs ( i ) {r}_{\text{docs}}^{(i)} is expressed as: where T d ( i ) T_{d}^{(i)} is the length of the intermediate reasoning sequence, and r docs , t ( i ) {r}_{\text{docs},t}^{(i)} denotes the token at step t t . The refined knowledge r final ( i ) {r}_{\text{final}}^{(i)} is then generated based on this analysis: where T r ( i ) T_{r}^{(i)} is the length of the refined knowledge sequence, and r final , t ( i ) {r}_{\text{final},t}^{(i)} denotes the token at step t t . The refined knowledge r final ( i ) {r}_{\text{final}}^{(i)} is then incorporated into the reasoning chain ℛ ( i ) \mathcal{R}^{(i)} , enabling the model to continue generating coherent reasoning steps with access to the external knowledge. where { r final ( j ) } j ≤ i ⁡ ( t ) \{r_{\text{final}}^{(j)}\}_{j\leq i(t)} denotes all previously refined knowledge up to the i ⁡ ( t ) i(t) -th search step. Here, i ⁡ ( t ) i(t) represents the index of the search step corresponding to the current reasoning step t t . This refined knowledge integration ensures that each reasoning step can access relevant external information while maintaining the conciseness and focus of the reasoning process.

<sub>§3.4 Knowledge Refinement via Reason-in-Documents</sub>

### 6. Inference Logic for a Single Question.

For each question, the Search-o1 inference begins by initializing the reasoning sequence with the task instruction I I concatenated with the specific question q q . As the reasoning model ℳ \mathcal{M} generates the reasoning chain ℛ \mathcal{R} , it may produce search queries encapsulated within the special symbols <|begin_search_query|> and <|end_search_query|> . Upon detecting the <|end_search_query|> symbol, the corresponding search query q search q_{\text{search}} is extracted, triggering the retrieval function Search to obtain relevant external documents 𝒟 \mathcal{D} . These retrieved documents, along with the reason-in-documents instruction I docs I_{\text{docs}} and the current reasoning sequence ℛ \mathcal{R} , are then processed by the Reason-in-Documents module. This module refines the raw documents into concise, pertinent information r final r_{\text{final}} , which is seamlessly integrated back into the reasoning chain ℛ \mathcal{R} within symbols <|begin_search_result|> and <|end_search_result|> . This iterative process ensures that the reasoning model incorporates necessary external knowledge while maintaining coherence and logical consistency, leading to the generation of a comprehensive reasoning chain ℛ \mathcal{R} and the final answer a a .

<sub>§Inference Logic for a Single Question.</sub>

### 7. Batch Inference Mechanism.

To efficiently handle multiple questions simultaneously, the Search-o1 framework employs a batch inference mechanism that optimizes both token generation and knowledge refinement. Initially, a set of unfinished reasoning sequences 𝒮 \mathcal{S} is created by concatenating the task instruction I I with each question q q in the batch 𝒬 \mathcal{Q} . The reasoning model ℳ \mathcal{M} then generates tokens for all sequences in 𝒮 \mathcal{S} in parallel, advancing each reasoning chain until it either completes or requires external knowledge retrieval. When a search query is identified within any sequence, the corresponding queries are extracted and processed in batches through the Search function to retrieve relevant documents 𝒟 \mathcal{D} . These documents are then collectively refined by the Reason-in-Documents module, which generates the refined knowledge r final r_{\text{final}} for each sequence. The refined knowledge is subsequently inserted back into the respective reasoning chains. Completed sequences are moved to the finished set ℱ \mathcal{F} , while ongoing sequences remain in 𝒮 \mathcal{S} for further processing. By leveraging parallel processing for both generation and refinement steps, the batch inference mechanism enhances system throughput associated with handling multiple inputs concurrently.

<sub>§Batch Inference Mechanism.</sub>

## 总结与展望
Search-o1 让推理模型在思考过程中主动发起检索，并把检索结果插回推理链。它的工程贡献是「检索触发点由模型决定」；风险是模型可能在没有必要时检索，或在不该停时停下。

**It connects to**

- `2503.09516` — 同一目标，一个靠提示工程一个靠 RL。

## 不足之处
**What a reader should still not conclude**

- 触发策略没有独立评估，只有端到端分数。

---

# Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

arXiv:2201.11903 · 2022 · [source](https://arxiv.org/html/2201.11903)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The NLP landscape has recently been revolutionized by language models ( Peters et al., 2018 ; Devlin et al., 2019 ; Brown et al., 2020 , inter alia ) . Scaling up the size of language models has been shown to confer a range of benefits, such as improved performance and sample efficiency ( Kaplan et al., 2020 ; Brown et al., 2020 , inter alia ) . However, scaling up model size alone has not proved sufficient for achieving high performance on challenging tasks such as arithmetic, commonsense, and symbolic reasoning ( Rae et al., 2021 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Arithmetic Reasoning"]
  N1["§3.1 Experimental Setup"]
  N2["§3.4 Robustness of Chain of Thought"]
  N0 --> N1
  N1 --> N2
```

![Chain-of-thought prompting enables large language models to tackle complex arithmetic, commonsense, and symbolic reasoning tasks. Chain-of-thought reasoning processes are highlighted.](https://arxiv.org/html/2201.11903v6/new-pull-figure-landscape.png)

*Chain-of-thought prompting enables large language models to tackle complex arithmetic, commonsense, and symbolic reasoning tasks. Chain-of-thought reasoning processes are highlighted.*

<sub>figure: `2201.11903v6/new-pull-figure-landscape.png`</sub>

## 机制
### 1. Arithmetic Reasoning

We begin by considering math word problems of the form in Figure 1 , which measure the arithmetic reasoning ability of language models. Though simple for humans, arithmetic reasoning is a task where language models often struggle ( Hendrycks et al., 2021 ; Patel et al., 2021 , inter alia ) . Strikingly, chain-of-thought prompting when used with the 540B parameter language model performs comparably with task-specific finetuned models on several tasks, even achieving new state of the art on the challenging GSM8K benchmark ( Cobbe et al., 2021 ) .

<sub>§3 Arithmetic Reasoning</sub>

### 2. Experimental Setup

We explore chain-of-thought prompting for various language models on multiple benchmarks. Benchmarks. We consider the following five math word problem benchmarks: (1) the GSM8K benchmark of math word problems ( Cobbe et al., 2021 ) , (2) the SVAMP dataset of math word problems with varying structures ( Patel et al., 2021 ) , (3) the ASDiv dataset of diverse math word problems ( Miao et al., 2020 ) , (4) the AQuA dataset of algebraic word problems, and (5) the MAWPS benchmark ( Koncel-Kedziorski et al., 2016 ) . Example problems are given in Appendix Table 12 . Standard prompting. For the baseline, we consider standard few-shot prompting, popularized by Brown et al. (2020) , in which a language model is given in-context exemplars of input–output pairs before outputting a prediction for a test-time example. Exemplars are formatted as questions and answers. The model gives the answer directly, as shown in Figure 1 (left). Chain-of-thought prompting. Our proposed approach is to augment each exemplar in few-shot prompting with a chain of thought for an associated answer, as illustrated in Figure 1 (right). As most of the datasets only have an evaluation split, we manually composed a set of eight few-shot exemplars with chains of thought for prompting— Figure 1 (right) shows one chain of thought exemplar, and the full set of exemplars is given in Appendix Table 20 . (These particular exemplars did not undergo prompt engineering; robustness is studied in Section 3.4 and Section A.2 .) To investigate whether chain-of-thought prompting in this form can successfully elicit successful reasoning across a range of math word problems, we used this single set of eight chain of thought exemplars for all benchmarks except AQuA, which is multiple choice instead of free response. For AQuA, we used four exemplars and solutions from the training set, as given in Appendix Table 21 . Language models. We evaluate five large language models. The first is GPT-3 ( Brown et al., 2020 ) , for which we use text-ada-001, text-babbage-001, text-curie-001, and text-davinci-002, which presumably correspond to InstructGPT models of 350M, 1.3B, 6.7B, and 175B parameters ( Ouyang et al., 2022 ) .The second is LaMDA ( Thoppilan et al., 2022 ) , which has models of 422M, 2B, 8B, 68B, and 137B parameters. The third is PaLM , which has models of 8B, 62B, and 540B parameters. The fourth is UL2 20B ( Tay et al., 2022 ) , and the fifth is Codex ( Chen et al., 2021 , code-davinci-002 in the OpenAI API) . We sample from the models via greedy decoding (though follow-up work shows chain-of-thought prompting can be improved by taking the majority final answer over many sampled generations ( Wang et al., 2022a ) ). For LaMDA, we report averaged results over five random seeds, where each seed had a different randomly shuffled order of exemplars. As LaMDA experiments did not show large variance among different seeds, to save compute we report results for a single exemplar order for all other models.

<sub>§3.1 Experimental Setup</sub>

### 3. Robustness of Chain of Thought

Sensitivity to exemplars is a key consideration of prompting approaches—for instance, varying the permutation of few-shot exemplars can cause the accuracy of GPT-3 on SST-2 to range from near chance (54.3%) to near state of the art (93.4%) ( Zhao et al., 2021 ) . In this final subsection, we evaluate robustness to chains of thought written by different annotators. In addition to the results above, which used chains of thought written by an Annotator A, two other co-authors of this paper (Annotators B and C) independently wrote chains of thought for the same few-shot exemplars (shown in Appendix H ). Annotator A also wrote another chain of thought that was more concise than the original, following the style of solutions given in Cobbe et al. (2021) . 1 1 1 For instance, whereas original chain of thought uses several short sentences ( “’There were originally 9 computers. For each of 4 days, 5 more computers were added. So 5 * 4 = 20 computers were added. 9 + 20 is 29.” ), the concise chain of thought would read “5 * 4 = 20 new computers were added. So there are 9 + 20 = 29 new computers in the server room now” . Figure 6 shows these results for LaMDA 137B on GSM8K and MAWPS (ablation results for other datasets are given in Appendix Table 6 / Table 7 ). Although there is variance among different chain of thought annotations, as would be expected when using exemplar-based prompting ( Le Scao and Rush, 2021 ; Reynolds and McDonell, 2021 ; Zhao et al., 2021 ) , all sets of chain of thought prompts outperform the standard baseline by a large margin. This result implies that successful use of chain of thought does not depend on a particular linguistic style. To confirm that successful chain-of-thought prompting works for other sets of exemplars, we also run experiments with three sets of eight exemplars randomly sampled from the GSM8K training set, an independent source (examples in this dataset already included reasoning steps like a chain of thought). 2 2 2 We sample examples ≤ 60 \leq 60 tokens to fit into our input context window, and also limit the examples to ≤ 2 \leq 2 steps to solve for a fair comparison with the eight exemplars that we composed. Figure 6 shows that these prompts performed comparably with our manually written exemplars, also substantially outperforming standard prompting. In addition to robustness to annotators, independently-written chains of thought, different exemplars, and various language models, we also find that chain-of-thought prompting for arithmetic reasoning is robust to different exemplar orders and varying numbers of exemplars (see Section A.2 ).

<sub>§3.4 Robustness of Chain of Thought</sub>

## 总结与展望
思维链在调研方法方向的用处是让检索查询可以被推理出来，但论文本身提醒「写出来的推理不等于真实推理」。我们的封装报告如果只展示结论，读者无法判断推理链是否成立。

**It connects to**

- `2501.05366` — 把推理与检索结合时，这个提醒更重要。

## 不足之处
**The authors say:** We have explored chain-of-thought prompting as a simple mechanism for eliciting multi-step reasoning behavior in large language models. We first saw that chain-of-thought prompting improves performance by a large margin on arithmetic reasoning, yielding improvements that are much stronger than ablations and robust to different annotators, exemplars, and language models ( Section 3 ). Next, experiments on commonsense reasoning underscored how the linguistic nature of chain-of-thought reasoning makes it generally applicable ( Section 4 ). Finally, we showed that for symbolic reasoning, chain-of-thought prompting facilitates OOD generalization to longer sequence lengths ( Section 5 ). In all experiments, chain-of-thought reasoning is elicited simply by prompting an off-the-shelf language model. No language models were finetuned in the process of writing this paper.

**What a reader should still not conclude**

- 论文不涉及检索，只涉及解题。

<sub>§6 Discussion</sub>

---

# The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery

arXiv:2408.06292 · 2024 · [source](https://arxiv.org/html/2408.06292)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The modern scientific method ( Chalmers, 2013 ; Jevons, 1877 ; Dewey, 1910 ) is arguably one of the greatest achievements of the Enlightenment. Traditionally, a human researcher collects background knowledge, drafts a set of plausible hypotheses to test, constructs an evaluation procedure, collects evidence for the different hypotheses, and finally assesses and communicates their findings. Afterward, the resulting manuscript undergoes peer review and subsequent iterations of refinement. This procedure has led to countless breakthroughs in science and technology, improving human quality of life. However, this iterative process is inherently limited by human researchers’ ingenuity, background knowledge, and finite time. Attempting to automate general scientific discovery ( Waltz and Buchanan, 2009 ; Langley, 2024 ; Langley, 1987 ) has been a long ambition of the community since at least the early 70s, with computer-assisted works like the Automated Mathematician ( Lenat, 1977 ; Lenat and Brown, 1984 ) and DENDRAL ( Buchanan and Feigenbaum, 1981 ) . In the field of AI, researchers have envisioned the possibility of automating AI research using AI itself ( Schmidhuber, 1991 ; Schmidhuber, 2010b ; Schmidhuber, 2010a ; Schmidhuber, 2012 ; Ghahramani, 2015 ) , leading to “AI-generating algorithms” ( Clune, 2019 ) . More recently, foundation models have seen tremendous advances in their general capabilities ( OpenAI, 2023 ; Google DeepMind Gemini Team, 2023 ; Anthropic, 2024 ; Llama Team, 2024 ) , but they have only been shown to accelerate individual parts of the research pipeline, e.g. the writing of scientific manuscripts ( Altmäe et al., 2023 ; Ifargan et al., 2024 ; Majumder et al., 2024 ; Dinu et al., 2024 ) , as a muse to brainstorm ideas ( Girotra et al., 2023 ; Wang et al., 2024b ; Baek et al., 2024 ) , or aides to coding ( Gauthier, 2024 ) . To date, the community has yet to show the possibility of executing entire research endeavors without human involvement.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Automated Paper Reviewing"]
  N1["§5 In-Depth Case Study"]
  N0 --> N1
```

![Conceptual illustration of The AI Scientist , an end-to-end LLM-driven scientific discovery process. The AI Scientist first invents and assesses the novelty of a set of ideas. It then determines how to test the hypotheses, including writing the necessary code by editing a codebase powered by recent advances in automated code generation. Afterward, the experiments are automatically executed to collect a set of results consisting of both numerical scores and visual summaries (e.g. plots or tables). The results are motivated, explained, and summarized in a LaTeX report. Finally, The AI Scientist generates an automated review, according to current practice at standard machine learning conferences. The review can be used to either improve the project or as feedback to future generations for open-ended scientific discovery.](https://arxiv.org/html/2408.06292v3/figures/conceptual.png)

*Conceptual illustration of The AI Scientist , an end-to-end LLM-driven scientific discovery process. The AI Scientist first invents and assesses the novelty of a set of ideas. It then determines how to test the hypotheses, including writing the necessary code by editing a codebase powered by recent advances in automated code generation. Afterward, the experiments are automatically executed to collect a set of results consisting of both numerical scores and visual summaries (e.g. plots or tables). The results are motivated, explained, and summarized in a LaTeX report. Finally, The AI Scientist generates an automated review, according to current practice at standard machine learning conferences. The review can be used to either improve the project or as feedback to future generations for open-ended scientific discovery.*

<sub>figure: `2408.06292v3/figures/conceptual.png`</sub>

## 机制
### 1. Automated Paper Reviewing

An LLM Reviewer Agent. A key component of an effective scientific community is its reviewing system, which evaluates and improves the quality of scientific papers. To mimic such a process using large language models, we design a GPT-4o-based agent ( OpenAI, 2023 ) to conduct paper reviews based on the Neural Information Processing Systems (NeurIPS) conference review guidelines . The review agent processes the raw text of the PDF manuscript using the PyMuPDF parsing library. The output contains numerical scores (soundness, presentation, contribution, overall, confidence), lists of weaknesses and strengths as well as a preliminary binary decision ( accept or reject ). These decisions may then be post-calibrated by thresholding using the reviewer score. We leverage this automated reviewing process to obtain an initial evaluation of the papers generated by The AI Scientist . We provide the entire reviewing prompt template in Section A.4 . Evaluating the Automated Reviewer. To evaluate the LLM-based reviewer’s performance, we compared the artificially generated decisions with ground truth data for 500 ICLR 2022 papers extracted from the publicly available OpenReview dataset ( Berto, 2024 ) . Similar to the previous section, we combine many recent advancements in LLM agents to make the decision-making process robust. More specifically, we improve the base LLM’s decision-making process by leveraging self-reflection ( Shinn et al., 2024 ) , providing few-shot examples ( Wei et al., 2022 ) and response ensembling ( Wang et al., 2022 ) . With GPT-4o, The AI Scientist ’s reviewing procedure achieves 70% accuracy when combining 5 rounds of self-reflection, 5 ensembled reviews, and a 1-shot review example taken from the ICLR 2022 review guidelines . Afterward, we perform an LLM-based meta-review, which prompts the agent to act as an Area Chair ( Wang et al., 2022 ) (full prompts in Section A.4 ). While this number is lower than the 73% accuracy that was reported for humans in the NeurIPS 2021 consistency experiment ( Beygelzimer et al., 2021 ) , the automated reviewer achieves superhuman F1 Scores (0.57 vs. 0.49) and human-level AUC (0.65 for both) when thresholding the decision at a score of 6 (a “Weak Accept” in the NeurIPS review guidelines). This choice corresponds roughly to the average score of accepted papers. The considered ICLR 2022 paper dataset is very class-imbalanced, i.e. it contains many more rejected papers. When considering a balanced dataset of papers, The AI Scientist ’s reviewing process achieves human-level accuracy (0.65% vs. 0.66%). Furthermore, the False Negative Rate (FNR) is much lower than the human baseline (0.39 vs. 0.52). Hence, the LLM-based review agent rejects fewer high-quality papers. The False Positive Rate (FNR), on the other hand, is higher (0.31 vs. 0.17) highlighting room for potential future improvements. To further validate the performance of the automated reviewer, we compare the consistency of the overall paper scores between anonymous OpenReview reviewers randomly sampled pairwise per paper ( Figure 2 , bottom-left) and between the average of all reviewers and the LLM score ( Figure 2 , bottom-middle). For the set of 500 ICLR 2022 papers, we find that the correlation between the score of two human reviewers is smaller (0.14) than the correlation between the LLM score and the average score across the reviewers (0.18). Overall, across all metrics, the results suggest that LLM-based reviews can not only provide valuable feedback ( D’Arcy et al., 2024 ) but also align more closely with the average human reviewer score than individual human reviewers align with each other. Each review is generated for $0.25 to $0.50 in API costs. We additionally compared the reviewing performance of various other foundation models. While Claude Sonnet 3.5 ( Anthropic, 2024 ) and GPT-4o-mini provide a more cost-efficient approach, their performance was substantially worse ( Table 1 ). Moreover, we had to threshold scores at 8 for Sonnet 3.5 to obtain calibrated results, due to persistent over-optimism bias. Llama 3.1 405B ( Llama Team, 2024 ) struggled to follow the reviewer output template consistently. We open-source our code, providing a new and interesting LLM benchmark for the community. LLM Reviewer Ablations. We compare various prompt configurations for GPT-4o and find that both Reflexion (+2%) and one-shot prompting (+2%) substantially help with performing more accurate reviewing ( Figure 2 , top and bottom-right). On the other hand, using review ensembling does not appear to improve the reviewer’s performance substantially but can reduce variance. In the following sections, we used our best overall reviewer: GPT-4o with 5 rounds of self-reflection, 5 ensembled reviews, a meta-aggregation step, and 1 few-shot example.

<sub>§4 Automated Paper Reviewing</sub>

### 2. In-Depth Case Study

Before we present extensive experiments and metrics for The AI Scientist ’s generated papers in Section 6 , we first visualize a representative sample from a run of the The AI Scientist which illustrates both its strengths and shortcomings , followed by a broader discussion of its potential. The selected paper “Adaptive Dual-Scale Denoising” is generated from a run where The AI Scientist is asked to do research on diffusion modeling, which is fully detailed in Section 6.1 . The base foundation model was Claude Sonnet 3.5 ( Anthropic, 2024 ) . Generated Idea. As discussed in Section 3 , The AI Scientist first generates an idea based on the provided template and its previous archive of discoveries. The idea in the selected paper was proposed in the 6th iteration of the algorithm and aims to improve the ability of diffusion models to capture both global structure and local details in a 2D dataset, by proposing two branches in the standard denoiser network. This is a well-motivated direction that has been the primary reason for researchers adopting diffusion models over prior styles of generative models such as VAEs ( Kingma and Welling, 2014 ) and GANs ( Goodfellow et al., 2014 ) , and to the best of our knowledge has not been widely studied. We highlight that The AI Scientist generates an impressive experimental plan that includes the proposed code modification, comparison to baselines, evaluation metrics, and the design of additional plots . As has been previously observed in the literature, judgments by LLMs can often have bias ( Zheng et al., 2024 ) which we can observe in over-estimation of an idea’s interestingness, feasibility, or novelty. The “novel” flag at the end indicates The AI Scientist believes the idea is novel after searching for related papers using the Semantic Scholar API. Generated Experiments. We display the generated code diff (deletions are in red , and additions are in green ) for the substantial algorithmic changes below. The code matches the experimental description and is well-commented. The AI Scientist is able to iterate on the code with results from intermediate experiments in the loop, and it eventually ends up with interesting design choices for the adaptive weight network, e.g. a LeakyReLU. Importantly, this network has a well-behaved output that is guaranteed to be between 0 and 1. We additionally note that The AI Scientist changed the output of the network to return the adaptive weights to make new visualizations. Generated Paper. The AI Scientist generates an 11-page scientific manuscript in the style of a standard machine learning conference submission complete with visualizations and all standard sections. We display a preview of the completely AI-generated paper in Figure 3 , with the full-sized version available in Section D.1 . We highlight specific things that were particularly impressive in the paper: Precise Mathematical Description of the Algorithm. The algorithmic changes in the code above are described precisely, with new notation introduced where necessary, using LaTeX math packages. The overall training process is also described exactly. Comprehensive Write-up of Experiments. The hyperparameters, baselines, and datasets are listed in the paper. As an essential sanity check, we verified that the main numerical results in Table 1 of the generated paper exactly match the experimental logs. Impressively, while the recorded numbers are in long-form floats, The AI Scientist chooses to round them all to 3 decimal places without error. Even more impressively, the results are accurately compared to the baseline (e.g. 12.8% reduction in KL on the dinosaur dataset). Good Empirical Results. Qualitatively, the sample quality looks much improved from the baseline. Fewer points are greatly out-of-distribution with the ground truth. Quantitatively, there are improvements to the approximate KL divergence between true and estimated distribution. New Visualizations. While we provided some baseline plotting code for visualizing generated samples and the training loss curves, it came up with novel algorithm-specific plots displaying the progression of weights throughout the denoising process. Interesting Future Work Section. Building on the success of the current experiments, the future work section lists relevant next steps such as scaling to higher-dimensional problems, more sophisticated adaptive mechanisms, and better theoretical foundations. On the other hand, there are also pathologies in this paper: Subtle Error in Upscaling Network. While a linear layer upscales the input to the denoiser network, only the first two dimensions are being used for the “local” branch, leading this upscaling layer to be a linear layer that preserves the same dimensionality effectively. Hallucination of Experimental Details. The paper claims that V100 GPUs were used, even though the agent couldn’t have known the actual hardware used. In reality, H100 GPUs were used. It also guesses the PyTorch version without checking. Positive Interpretation of Results. The paper tends to take a positive spin even on its negative results, which leads to slightly humorous outcomes. For example, while it summarizes its positive results as: “Dino: 12.8% reduction (from 0.989 to 0.862)” (lower KL is better), the negative results are reported as “Moons: 3.3% improvement (from 0.090 to 0.093)”. Describing a negative result as an improvement is certainly a stretch of the imagination. Artifacts from Experimental Logs. While each change to the algorithm is usually descriptively labeled, it occasionally refers to results as “Run 2”, which is a by-product from its experimental log and should not be presented as such in a professional write-up. Presentation of Intermediate Results. The paper contains results for every single experiment that was run. While this is useful and insightful for us to see the evolution of the idea during execution, it is unusual for standard papers to present intermediate results like this. Minimal References. While additional references have been sourced from Semantic Scholar, including two papers in the related work that are very relevant comparisons, overall the bibliography is small at only 9 entries. Review. The automated reviewer points out valid concerns in the generated manuscript. The review recognizes the experiments were with simple, 2D datasets only, however, this is because we externally constrained the system to use these datasets, and in its current form, The AI Scientist cannot download higher-dimensional datasets from the internet. On the other hand, limitations such as the proposed algorithm’s increased computational cost of the algorithm are mentioned in the actual paper, which shows that The AI Scientist is often up-front about the drawbacks of its idea. The reviewer also lists many relevant questions about the paper, such as: explaining the variability of performance across datasets, and explaining in more detail how the upscaling process affects the local branch’s input. Final Comments. Drawing from our domain knowledge in diffusion modeling—which, while not our primary research focus, is an area in which we have published papers—we present our overall opinions on the paper generated by The AI Scientist below. The AI Scientist correctly identifies an interesting and well-motivated direction in diffusion modeling research, e.g. previous work has studied modified attention mechanisms ( Hatamizadeh et al., 2024 ) for the same purpose in higher-dimensional problems. It proposes a comprehensive experimental plan to investigate its idea, and successfully implements it all, achieving good results. We were particularly impressed at how it responded to subpar earlier results and iteratively adjusted its code (e.g. refining the weight network). The full progression of the idea can be viewed in the paper. While the paper’s idea improves performance and the quality of generated diffusion samples, the reasons for its success may not be as explained in the paper. In particular, there is no obvious inductive bias beyond an upscaling layer (effectively just an additional linear layer) for the splitting of global or local features. However, we do see progression in weights (and thus a preference for the global or local branch) across diffusion timesteps which suggests that something non-trivial is happening. Our interpretation is instead that the network that The AI Scientist has implemented for this idea resembles a mixture-of-expert (MoE, Yuksel et al. (2012) ; Fedus et al. (2022) ) structure that is prevalent across LLMs ( Jiang et al., 2024 ) . An MoE could indeed lead to the diffusion model learning separate branches for global and local features, as the paper claims, but this statement requires more rigorous investigation. Interestingly, the true shortcomings of this paper described above certainly require some level of domain knowledge to identify and were only partially captured by the automated reviewer (i.e., when asking for more details on the upscaling layer). At the current capabilities of The AI Scientist , this can be resolved by human feedback. However, future generations of foundation models may propose ideas that are challenging for humans to reason about and evaluate. This links to the field of “superalignment” ( Burns et al., 2023 ) or supervising AI systems that may be smarter than us, which is an active area of research. Overall, we judge the performance of The AI Scientist to be about the level of an early-stage ML researcher who can competently execute an idea but may not have the full background knowledge to fully interpret the reasons behind an algorithm’s success. If a human supervisor was presented with these results, a reasonable next course of action could be to advise The AI Scientist to re-scope the project to further investigate MoEs for diffusion. Finally, we naturally expect that many of the flaws of the The AI Scientist will improve, if not be eliminated, as foundation models continue to improve dramatically.

<sub>§5 In-Depth Case Study</sub>

## 总结与展望
The AI Scientist 把「提出想法、写代码、跑实验、写论文、评审」串成一个自动流程，并让模型给自己评审。它在方法方向的地位是把「研究」整体当作可自动化对象；也是它让「评审也是模型」这个偏差第一次以系统形态出现。

**It connects to**

- `2511.07685` — 把评审细则化，是对「模型自评」的一种回应。

## 不足之处
**The authors say:** While The AI Scientist produces research that can provide novel insights, it has many limitations and raises several important ethical considerations. We believe future versions of The AI Scientist will be able to address many of its current shortcomings.

**What a reader should still not conclude**

- 生成论文的质量评估由模型完成，自评偏差没有被独立测量。
- 实验的可复现性依赖沙箱环境，论文报告的成功率包含大量人工筛选。

<sub>§8 Limitations & Ethical Considerations</sub>

---

# GAIA : A Benchmark for G eneral AI A ssistants

arXiv:2311.12983 · 2024 · [source](https://arxiv.org/html/2311.12983)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large Language Models (LLMs) arguably open the way to general purpose systems. Indeed, the latest among them ( OpenAI, 2023 ; Anthropic, 2023 ; Anil et al., 2023 ; Touvron et al., 2023 ) are fluent, knowledgeable, aligned to some extent with human preferences ( Ouyang et al., 2022 ) , and can be augmented ( Mialon et al., 2023 ) with tools such as web browsers or code interpreters in a zero or few-shot setting ( Brown et al., 2020 ) . However, evaluating these systems is an open problem: given their emerging new capabilities, LLMs are regularly breaking AI benchmarks, at an ever-increasing rate ( Kiela et al., 2023 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 GAIA"]
  N1["§What is GAIA and how does it work?"]
  N2["§Design choices."]
  N3["§3.3 Composition of GAIA"]
  N4["§Capabilities coverage."]
  N5["§Increasing difficulty."]
  N6["§Distribution of required capabilities."]
  N7["§3.4 Building and extending GAIA"]
  N8["§Crafting questions."]
  N9["§Validating questions."]
  N10["§Challenges associated to relying on the web."]
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
```

![Sample GAIA questions. Completing the tasks requires fundamental abilities such as reasoning, multi-modality handling, or tool use proficiency. Answers are unambiguous and by design unlikely to be found in plain text in training data. Some questions come with additional evidence, such as images, reflecting real use cases and allowing better control on the questions.](https://arxiv.org/html/2311.12983v1/figures/ice_cream.jpg)

*Sample GAIA questions. Completing the tasks requires fundamental abilities such as reasoning, multi-modality handling, or tool use proficiency. Answers are unambiguous and by design unlikely to be found in plain text in training data. Some questions come with additional evidence, such as images, reflecting real use cases and allowing better control on the questions.*

<sub>figure: `2311.12983v1/figures/ice_cream.jpg`</sub>

## 机制
### 1. GAIA

This section covers the design and content of GAIA , as well as guidelines for creating questions and associated challenges. Level 1 questions generally require no tools, or at most one tool but no more than 5 steps. Level 2 question generally involve more steps, roughly between 5 and 10 and combining different tools is needed. Level 3 are questions for a near perfect general assistant, requiring to take arbitrarily long sequences of actions, use any number of tools, and access to the world in general.

<sub>§3 GAIA</sub>

### 2. What is GAIA and how does it work?

GAIA is a benchmark for AI systems proposing general assistant questions. GAIA attempts to circumvent different pitfalls of LLMs evaluation. It is composed of 466 questions designed and annotated by humans. These questions are text-based, and sometimes come with a file (such as an image or a spreadsheet). They cover various assistant use cases such as daily personal tasks, science, or general knowledge. The questions are designed to admit a short, single correct answer, therefore easy to verify. To use GAIA , one only needs to zero-shot prompt an AI assistant with the questions and attached evidence if there are some. Scoring perfectly on GAIA requires a varied set of fundamental abilities (see Section 3.3 ). We provide questions along various with meta-data in supplementary material.

<sub>§What is GAIA and how does it work?</sub>

### 3. Design choices.

GAIA results both from the need for revised AI benchmarks, and the observed shortcomings of LLM evaluation. Our first principle is to target questions that are conceptually simple although potentially tedious for humans, yet varied, rooted in the real world and challenging for current AI systems. This allows to focus on fundamental abilities such as quick adaptation via reasoning, multi-modality understanding, and potentially diverse tool use, rather than specialised skills ( Chollet, 2019 ) . The questions generally consist in finding and transforming information gathered from different and various sources, such as provided documents or the open and changing web, to produce an accurate answer. To answer the first example question above ( Figure 1 ), LLMs should typically browse the web to find a study, then look for the correct enrolment. This goes against the trend of benchmarks that are increasingly difficult for humans, and/or operate in purely textual or artificial environments. Our second principle is interpretability. The restricted number of highly curated questions makes the benchmark easier to use compared to aggregated ones ( Perlitz et al., 2023 ) . The conceptual simplicity of the task (human success rate is 92%) makes it easy for users to understand a model’s reasoning trace. For the Level 1 question from Figure 1 , the reasoning trace will mostly consist in checking the correct website, and report the correct enrolment, which is simple to verify. Our third principle is robustness against memorization: GAIA aims to be less gameable than most current benchmarks. To complete a task, a system has to plan and successfully complete some number of steps since the resulting answer is absent by design in plain text from current pre-training data. A progress in accuracy reflects actual system progress. Due to their diversity and the size of the action space, these tasks cannot be brute-forced without cheating, for example by memorizing the ground truth. Although accidental memorization is possible through data contamination, the accuracy required in the answers, their absence from pre-training data, and the possibility to check the reasoning trace mitigate this risk. In contrast, multiple choice answers make contamination assessment difficult since a wrong reasoning trace can still get to the correct choice. If catastrophic memorization happens in spite of these mitigations, it is easy to craft new questions using the guidelines we provide in Section 3.4 . Our last principle is easiness of use. Our tasks are simple prompts that may come with an additional file. Crucially, the answers to our questions are factoid, concise and unambiguous. These properties allow simple, fast and factual evaluation. Our questions are meant to be answered in zero shot, limiting the influence of the evaluation setup. By opposition, many LLM benchmarks require evaluations that are sensitive to the experimental setup such as the number and nature of prompts ( Liang et al., 2022b ) (Section 8.2), or the benchmark implementation.

<sub>§Design choices.</sub>

### 4. Composition of GAIA / Capabilities coverage.

This subsection delves into the composition of the 466 questions we devised for GAIA . Scoring perfectly on GAIA requires advanced reasoning, multi-modality understanding, coding capabilities and generally tool use, e.g web browsing, for which we provide a more precise definition in Appendix C . We also include questions requiring to process varied data modalities such as PDFs, spreadsheets, but also images, videos or audio, whose distribution is reported in Appendix C ( Figure 6 ). Figure 3 (left) is an overview of these capabilities. Although web browsing is a key component of GAIA , we do not require assistants to perform actions other than “clicks” on a website such as uploading a file, post a comment or book a meeting. Testing these capabilities in real environments while avoiding spamming websites requires careful consideration that we leave for future work, and refer the reader to recent works proposing closed environments for LLMs agents ( Liu et al., 2023a ) . We do not provide a more detailed list of required capabilities to solve the benchmark since most questions can be solved equally well via different combinations of capabilities. For example, a given piece of evidence may have been properly memorised by an assistant LLM, or retrieved via a web search. In particular, we do not provide a fine-grained benchmarking of tool usage by LLMs, and refer the reader to Xu et al. (2023b) ; Li et al. (2023c) .

<sub>§3.3 Composition of GAIA · §Capabilities coverage.</sub>

### 5. Increasing difficulty.

The questions can be sorted into three levels of increasing difficulty depending on the number of steps required to solve the questions, and the number of different tools needed to answer the question. There is naturally not a single definition of step or tool, and possibly many paths to answer a given question. Therefore, we rely as a proxy on the number of steps and tools used by our annotators when crafting the questions. Figure 3 (right) illustrates the distribution of our questions along these two axes. Tools are always related to one or more capability (see Appendix C ). We loosely use the following definitions to attribute a level to a question: An illustration of these levels is provided in Figure 1 . Those definitions are not hard constraints: for example, a question with less than 10 10 annotator steps but that requires complex web navigation might be categorised as Level 3 rather than 2. Our definition of the difficulty is validated in Section 4 .

<sub>§Increasing difficulty.</sub>

### 6. Distribution of required capabilities.

While GAIA targets real-world assistant questions, we also include tasks that could potentially benefits physically impaired people, such as finding a piece of information in a small audio file. Finally, we make our best effort to cover various topic domains and cultures, although the language of the dataset is restricted to English (see Section 6 ).

<sub>§Distribution of required capabilities.</sub>

### 7. Building and extending GAIA / Crafting questions.

This subsection delves into our question design and annotation process. In particular, we discuss some associated challenges and hope our insights will help the community building over GAIA . Our questions are created by humans 5 5 5 More precisely, in a collaboration between our teams and compensated annotators from Surge AI. and aim to reflect realistic use cases of AI assistants. The authors designed initial questions, and gave them as examples to annotators along with instructions (reported in Appendix D ) to create more questions. The questions were based on one or more sources of truth that were often specified in the question to avoid ambiguity. Examples of sources of truth are trusted web pages that have low chance to disappear anytime soon e.g. , Wikipedia, Papers With Code, or arXiv. In other cases, the source of truth is entirely provided with the question, e.g. , an attached document. The last case is a self-contained question, e.g. , a small puzzle. We do not specify a fixed list of sources of truth in order to enforce question diversity and avoid memorisation. Apart from puzzles, most questions were created by finding and potentially combining information from different sources of truth to produce a specific answer. Once a question was created, it was also annotated, i.e. the question creator provided an answer as well as meta-data: which tools were needed, which steps were taken, or how many time was required to answer. A typical annotation result is presented in Table 1 ( Appendix C ).

<sub>§3.4 Building and extending GAIA · §Crafting questions.</sub>

### 8. Validating questions.

Most of the work associated with crafting questions consists in ensuring that they are unambiguous, i.e. , there is a single correct answer. This property allows fast and factual evaluation, hence it is crucial to maintain it. Ambiguities can be subtle and rarely obvious to the creator of a question. For example, a question is ambiguous if it does not specify a version for a web page while the information needed to answer the question is different in other versions. We therefore asked two new annotators to independently answer each question. If the original annotator and the two new annotators arrived at the same answer, the question was validated. Questions on which annotators disagreed generally only required a simple fix, but were removed otherwise. For this reason, question creation can hardly be automated while keeping the interest and variety of questions high. We report statistics on this validation phase in Table 3 ( Appendix C ). 68% of the questions were good as is, while the rest had to be corrected or removed. While the questions are conceptually simple, annotators might do inadvertent mistakes: we estimate the annotator’s success rate to be 92% when aggregated on all levels of difficulty, and report this as the human score for GAIA . It is close to perfect, demonstrating that GAIA is simple for non experts. We estimate the creation of a question, including its validation by two supplementary annotators and potential repairs, to require two hours of annotator time.

<sub>§Validating questions.</sub>

### 9. Challenges associated to relying on the web.

Designing questions can be delicate when a source of truth is hosted on the web. First, the evidence might change over time. For example, a Wikipedia article could be updated between the moment the question is created and the moment it is asked to an AI assistant, potentially removing the evidence required to answer. For such questions, it is often important to specify a version of the evidence, such as the page’s date. In practice, we find our benchmark to be robust to these changes since we try to rely as much as possible on evidence that will likely pass the test of time. Second, some website owners wish to prevent access to parts or totality of their website from bots via their robots.txt files. While this is rather a demand than a constraint, it is obviously desirable to comply. For example, OpenAI provides instruction to website owners wishing to forbid access to GPT4 on how to modify their robots.txt accordingly. Hence, we verify that accessing the part of the website hosting the evidence is not restricted.

<sub>§Challenges associated to relying on the web.</sub>

## 总结与展望
GAIA 用 466 个需要多步工具使用的问题测通用助手，强调「对人类简单、对 AI 难」。它在方法方向的价值是问题构造原则：难度来自步骤组合，而不是知识稀缺。

**It connects to**

- `2504.12516` — 同类人工基准，侧重浏览与多步。

## 不足之处
**The authors say:** While GAIA attempts to circumvent current pitfalls of LLM benchmarks, some limitation remains.

**What a reader should still not conclude**

- 答案多为短字符串，评测依赖精确匹配，对表达差异不宽容。

<sub>§6 Limitations</sub>
