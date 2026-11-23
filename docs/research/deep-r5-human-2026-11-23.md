# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `human`, `approval`, `oversight`, `autonomy`, `interrupt`, `trust`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Constitutional AI: Harmlessness from AI Feedback (`2212.08073`) | 45 | 6 | graded ok (depth full) |
| Measuring Progress on Scalable Oversight for Large Language Models (`2211.03540`) | 33 | 6 | graded ok (depth full) |
| AI safety via debate (`1805.00899`) | 32 | 6 | graded ok (depth full) |
| Chain-of-Thought Prompting Elicits Reasoning in Large Language Models (`2201.11903`) | 43 | 5 | graded ok (depth full) |
| Concrete Problems in AI Safety (`1606.06565`) | 11 | 6 | graded ok (depth full) |
| Debating with More Persuasive LLMs Leads to More Truthful Answers (`2402.06782`) | 65 | 6 | graded ok (depth full) |
| Deep Reinforcement Learning from Human Preferences (`1706.03741`) | 29 | 6 | graded ok (depth full) |
| DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (`2402.03300`) | 47 | 6 | graded ok (depth full) |

## Constitutional AI: Harmlessness from AI Feedback — `2212.08073`

- **§1 Introduction** (`S1.I1.i1.p1.1`)

  > AI supervision may be more efficient than collecting human feedback. It allows us to focus more on providing a small amount of legible, focused, high-quality oversight. There may also be ways for humans and AI systems to collaborate [ Bowman et al., 2022 ] to provide better supervision than either can provide alone.

- **§1 Introduction** (`S1.I1.i2.p1.1`)

  > AI systems can already perform some tasks at or beyond human level (e.g. [ Silver et al., 2017 ] ), and over time more examples are likely to emerge. We need to develop methods now that can provide oversight for these powerful AI systems, and scaling supervision may be one possibility, if the capability level of the supervisor can scale proportionally with the capabilities of the actor, and the supervisor remains aligned with our intended goals and constraints.

- **§Scaling Supervision** (`S1.SS1.SSSx1.p2.1`)

  > In a certain sense, work on reinforcement learning from human feedback [ Stiennon et al., 2020 , Bai et al., 2022 , Ouyang et al., 2022 ] has already taken a step in the direction of scaled supervision, since the reward signal in RL actually comes from an AI preference model (PM) rather than from immediate human oversight. However, RLHF typically uses tens of thousands of human preference labels.

- **§1 Introduction** (`S1.p1.1`)

  > We would like to train AI systems that remain helpful, honest, and harmless, even as some AI capabilities reach or exceed human-level performance. This suggests that we will need to develop techniques that do not rely on humans to supervise all aspects of AI behavior, and that can be used to automatically test and enhance robustness to harmful behaviors. We also aim to develop methods that encode desirable AI behavior in a simple and transparent form, and that make it easier to understand and evaluate AI decision making.

- **§1 Introduction** (`S1.p2.1`)

  > In this paper we develop a method we refer to as Constitutional AI (CAI), depicted in Figure 1 , and use it to train a non-evasive and relatively harmless AI assistant, without any human feedback labels for harms . The method therefore improves upon, and partially replaces reinforcement learning from human feedback [ Christiano et al., 2017 ] . The new assistant ‘RL-CAI’ is preferred by crowdworkers over those trained with previously collected [ Bai et al., 2022 , Ganguli et al., 2022 ] human feedback labels for harmfulness. We chose the term ‘constitutional’ because we are able to train less…

- **§1 Introduction** (`S1.p3.1`)

  > Our motivations for developing this technique were: (1) to study simple possibilities for using AI systems to help supervise other AIs, and thus scale supervision , (2) to improve on our prior work training a harmless AI assistant by eliminating evasive responses , reducing tension 1 1 1 That is, helpfulness tends to increase harmfulness, since models are willing to obey pernicious requests, and conversely models trained to be harmless tend to be more evasive and generally less helpful. By harmfulness we include both a variety of forms of harm to the user and responses that help the user to ac…

## Measuring Progress on Scalable Oversight for Large Language Models — `2211.03540`

- **§1 Introduction** (`S1.p1.1`)

  > To build and deploy powerful AI responsibly, we will need to develop robust techniques for scalable oversight : the ability to provide reliable supervision—in the form of labels, reward signals, or critiques—to models in a way that will remain effective past the point that models start to achieve broadly human-level performance ( Amodei et al., 2016 ) . These techniques are likely to build on the methods we use today for steering large models ( Christiano et al., 2017 ; Stiennon et al., 2020 , like RLHF;) , but will need to be further developed to continue behaving as expected in regimes where…

- **§5 Related Work** (`S5.p1.1`)

  > In addition to the work on scalable oversight strategies described above, this work has clear parallels with the literature on human–AI team decision making, surveyed in Lai et al. (2021) , and including targeted case studies on recidivism prediction ( Liu et al., 2021 , e.g.) , medical diagnosis ( Lakkaraju et al., 2016 , e.g.) , and credit risk prediction ( Chromik et al., 2021 , e.g.) , among many others. Our work stands out from these in particular through our use of a more general-purpose AI system with a natural-language interface, which allows human participants to (in a potentially unt…

- **§1 Introduction** (`S1.p2.1`)

  > In this paper, we present a technique—based closely on the as-yet-untested sandwiching proposal ( Cotra, 2021 ) —for the evaluation of scalable oversight techniques with present-day models. We then present a simple baseline experiment motivated by this lens in which we ask humans to solve difficult question-answering tasks with the help of a large-language-model assistant. The experiment reinforces existing evidence that humans can benefit from this kind of assistance and shows that key assumptions of the paradigm hold for two existing question-answering datasets.

- **§The Paradigm** (`S1.SS0.SSS0.Px1.p1.1`)

  > The goal of scalable oversight is difficult to pursue experimentally since current systems differ in many important ways from the future systems that we are most concerned with being able to align, such that scalable oversight techniques are often both unnecessary and cumbersome. However, there is empirical work we can do that will bring us evidence about the problem and experience with many (though not all) of its challenges: Under the proposed sandwiching experimental paradigm ( Cotra, 2021 ) , researchers choose problem settings where a model is already more capable than a typical human, bu…

- **§The Paradigm** (`S1.SS0.SSS0.Px1.p2.1`)

  > The situation of the non-expert participants is analogous to the situation we expect to find ourselves in with more capable future models: They have a wide range of tools and techniques at their disposal, including access to an untrustworthy but capable AI system, but they have no straightforward way to be certain that any of the decisions that they make are correct. However, in the case of these experiments, we can use the experts to catch and learn from our mistakes rather than waiting for them to yield consequences in the outside world. If research under this paradigm succeeds, it will prod…

- **§1 Introduction** (`S1.I1.i3.p1.1`)

  > Conclusions: This result represents a simple proof of concept for sandwiching experiments with multiple-choice question answering and shows—echoing Saunders et al. (2022) —that present large language models can help humans achieve difficult tasks in settings that are relevant to scalable oversight.

## AI safety via debate — `1805.00899`

- **§1 Introduction** (`S1.p5.1`)

  > The goal of this paper is to lay out theoretical and practical properties of debate as an approach to AI alignment. We also lay out plans for experiments to test the properties of debate, but we leave these to future work except for a simple MNIST example. On the theoretical side, we observe that the complexity class analog of debate can answer any question in 𝖯𝖲𝖯𝖠𝖢𝖤 {\mathsf{PSPACE}} using only polynomial time judges, corresponding to aligned agents exponentially smarter than the judge. Whether debate works with humans and ML is more subtle, and requires extensive testing and analysis b…

- **§1 Introduction** (`S1.p1.1`)

  > Learning to align an agent’s actions with the values and preferences of humans is a key challenge in ensuring that advanced AI systems remain safe [ Russell et al., 2016 ] . Subtle problems in alignment can lead to unexpected and potentially unsafe behavior [ Amodei et al., 2016 ] , and we expect this problem to get worse as systems become more capable. Alignment is a training-time problem: it is difficult to retroactively fix the behavior and incentives of trained unaligned agents. Alignment likely requires interaction with humans during training, but care is required in choosing the precise…

- **§1 Introduction** (`S1.p2.1`)

  > For some tasks it is harder to bring behavior in line with human goals than for others. In simple cases, humans can directly demonstrate the behavior—this is the case of supervised learning or imitation learning, for example classifying an image or using a robotic gripper to pick up a block. For these tasks alignment with human preferences can in principle be achieved by imitating the human, and is implicit in existing ML approaches (although issues of bias in the training data still arise, see e.g. Mitchell and Shadlen [2018] ). Taking a step up in alignment difficulty, some tasks are too dif…

- **§1 Introduction** (`S1.p3.1`)

  > Just as there are problems harder than 𝖯 {\mathsf{P}} or 𝖭𝖯 {\mathsf{NP}} in complexity theory, lining up behavior with human preferences can be harder still. A human may be unable to judge whether an explained answer or exhibited behavior is correct: the behavior may be too hard to understand without help, or the answer to a question may have a flaw that is too subtle for the human to detect. We could imagine a system trained to both give answers and point out flaws in answers; this gives a third level of difficulty. Flaws themselves may be too hard to judge: flaws could have their own fla…

- **§1 Introduction** (`S1.p4.1`)

  > This hierarchy of alignment tasks has a natural limit: a debate between competing agents where agents make arguments, other agents poke holes in those arguments, and so on until we have enough information to decide the truth. The simplest version of debate has two competing agents, though we cover versions with more agents as well. Our hypothesis is that optimal play in this game produces honest, aligned information far beyond the capabilities of the human judge. We can approximate optimal play by training ML systems via self play, which has shown impressive performance in games such as Go, ch…

- **§1 Introduction** (`S1.p6.1`)

  > Our eventual goal is natural language debate, where the human judges a dialog between the agents. However, unrestricted dialog models remain far from human performance and even evaluation is difficult [ Lowe et al., 2017a ] , so it is instructive to consider debates with non-natural language statements. Consider the board game Go. Given a board configuration, we can ask “What is the best move?” If AlphaZero [ Silver et al., 2017b ] shows us a move, there is no way to judge its quality unless we are roughly as strong as AlphaZero. However, we can ask another copy of AlphaZero to show us a count…

## Chain-of-Thought Prompting Elicits Reasoning in Large Language Models — `2201.11903`

- **§2 Chain-of-Thought Prompting** (`S2.I1.i3.p1.1`)

  > Third, chain-of-thought reasoning can be used for tasks such as math word problems, commonsense reasoning, and symbolic manipulation, and is potentially applicable (at least in principle) to any task that humans can solve via language.

- **§3 Arithmetic Reasoning** (`S3.p1.1`)

  > We begin by considering math word problems of the form in Figure 1 , which measure the arithmetic reasoning ability of language models. Though simple for humans, arithmetic reasoning is a task where language models often struggle ( Hendrycks et al., 2021 ; Patel et al., 2021 , inter alia ) . Strikingly, chain-of-thought prompting when used with the 540B parameter language model performs comparably with task-specific finetuned models on several tasks, even achieving new state of the art on the challenging GSM8K benchmark ( Cobbe et al., 2021 ) .

- **§4 Commonsense Reasoning** (`S4.p1.1`)

  > Although chain of thought is particularly suitable for math word problems, the language-based nature of chain of thought actually makes it applicable to a broad class of commonsense reasoning problems, which involve reasoning about physical and human interactions under the presumption of general background knowledge. Commonsense reasoning is key for interacting with the world and is still beyond the reach of current natural language understanding systems ( Talmor et al., 2021 ) .

- **§5 Symbolic Reasoning** (`S5.p1.1`)

  > Our final experimental evaluation considers symbolic reasoning, which is simple for humans but potentially challenging for language models. We show that chain-of-thought prompting not only enables language models to perform symbolic reasoning tasks that are challenging in the standard prompting setting, but also facilitates length generalization to inference-time inputs longer than those seen in the few-shot exemplars.

- **§6 Discussion** (`S6.p3.1`)

  > As for limitations, we first qualify that although chain of thought emulates the thought processes of human reasoners, this does not answer whether the neural network is actually “reasoning,” which we leave as an open question. Second, although the cost of manually augmenting exemplars with chains of thought is minimal in the few-shot setting, such annotation costs could be prohibitive for finetuning (though this could potentially be surmounted with synthetic data generation, or zero-shot generalization). Third, there is no guarantee of correct reasoning paths, which can lead to both correct a…

## Concrete Problems in AI Safety — `1606.06565`

- **§2 Overview of Research Problems** (`S2.p7.1`)

  > There are several trends which we believe point towards an increasing need to address these (and other) safety problems. First is the increasing promise of reinforcement learning (RL), which allows agents to have a highly intertwined interaction with their environment. Some of our research problems only make sense in the context of RL, and others (like distributional shift and scalable oversight) gain added complexity in an RL setting. Second is the trend toward more complex agents and environments. “Side effects” are much more likely to occur in a complex environment, and an agent may need to…

- **§2 Overview of Research Problems** (`S2.p3.1`)

  > Second, the designer may know the correct objective function, or at least have a method of evaluating it (for example explicitly consulting a human on a given situation), but it is too expensive to do so frequently, leading to possible harmful behavior caused by bad extrapolations from limited samples. “Scalable oversight” (Section 5 ) discusses ideas for how to ensure safe behavior even given limited access to the true objective function.

- **§2 Overview of Research Problems** (`S2.I1.i3.p1.1`)

  > Scalable Oversight: How can we efficiently ensure that the cleaning robot respects aspects of the objective that are too expensive to be frequently evaluated during training? For instance, it should throw out things that are unlikely to belong to anyone, but put aside things that might belong to someone (it should handle stray candy wrappers differently from stray cellphones). Asking the humans involved whether they lost anything can serve as a check on this, but this check might have to be relatively infrequent—can the robot find a way to do the right thing despite limited information?

- **§5 Scalable Oversight** (`S5.I2.i2.p2.1`)

  > The top-level agent in hierarchical RL may be able to learn from very sparse rewards, since it does not need to learn how to implement the details of its policy; meanwhile, the sub-agents will receive a dense reward signal even if the top-level reward is very sparse, since they are optimizing synthetic reward signals defined by higher-level agents. So a successful approach to hierarchical RL might naturally facilitate scalable oversight. 4 4 4 When implementing hierarchical RL, we may find that subagents take actions that don’t serve top-level agent’s real goals, in the same way that a human m…

- **§6 Safe Exploration** (`S6.I1.i5.p1.1`)

  > Trusted Policy Oversight: If we have a trusted policy and a model of the environment, we can limit exploration to actions the trusted policy believes we can recover from. It’s fine to dive towards the ground, as long as we know we can pull out of the dive in time.

- **§6 Safe Exploration** (`S6.I1.i6.p1.1`)

  > Human Oversight: Another possibility is to check potentially unsafe actions with a human. Unfortunately, this problem runs into the scalable oversight problem: the agent may need to make too many exploratory actions for human oversight to be practical, or may need to make them too fast for humans to judge them. A key challenge to making this work is having the agent be a good judge of which exploratory actions are genuinely risky, versus which are safe actions it can unilaterally take; another challenge is finding appropriately safe actions to take while waiting for the oversight.

## Debating with More Persuasive LLMs Leads to More Truthful Answers — `2402.06782`

- **§6 Discussion, Limitations & Conclusion** (`S6.p1.1`)

  > In this work, we explore debate as a method to elicit more truthful answers from LLMs. We demonstrate that by allowing non-experts to judge a transcript between two experts, we can identify the correct answers to questions. Additionally, we show that this oversight mechanism can be automated with LLM judges. Although the original debate protocol that Irving et al. (2018) propose involves a stricter protocol in which only a sub-component has to be judged to validate the entire debate, our results show that judging over full debate transcripts is already useful for producing expert labels for da…

- **§6 Discussion, Limitations & Conclusion** (`S6.p4.1`)

  > In our domain, we observe that debate becomes more truth-seeking with increased model persuasiveness. This finding is explained by models becoming relatively better at arguing for the correct answer compared to the incorrect answer when their outputs are optimised for judge approval. This indicates that optimising for persuasiveness can lead to more truthful models, paving the way for future research in fine-tuning LLMs via debate. Furthermore, we show how debate can be used to augment human judgements and generate accurate labels to questions beyond their knowledge. Overall, these results dem…

- **§1 Introduction** (`S1.p4.1`)

  > To investigate how debate will scale with increased model capabilities, we introduce a metric called persuasiveness . Persuasiveness is measured by judge approval, meaning it does not require ground-truth labels. We optimise model outputs for persuasion with inference-time methods, generating a range of expert models. The resulting models are evaluated by unseen LLM judges whose preferences have not been used in optimisation. Finally, we evaluate debate and consultancy with human judges, conducting a large-scale study with over a thousand hours of annotator time spent providing judgements. Our…

- **§1 Introduction** (`S1.p4.2`)

  > Although greater access to information is only one way in which future models may be stronger than their supervisors, our results pave the way for further research on adversarial oversight methods. We provide empirical evidence in one domain indicating that as models get more capable, debate enables scalable oversight by both human and model judges.

- **§5 Related Work** (`S5.p3.1`)

  > Irving et al. (2018) originally proposed the ‘debate game’ as a mechanism for training safe AI systems. Since then, a body of work has focused on verifying the usefulness for oversight ( Barnes, 2020 ; Parrish et al., 2022b ; Parrish et al., 2022a ; Michael et al., 2023 ) . These studies are all conducted with human debaters, while in our work the debaters are LLMs. Using LLM debaters ensures that we can control for debater skill and investigate self-play debates.

- **§1 Introduction** (`S1.p1.1`)

  > Most existing approaches to align LLMs rely on the availability of labelled data ( Ouyang et al., 2022 ; Menick et al., 2022 ) . However, faced with models that can answer questions in increasingly broad context, obtaining such data requires domain expertise ( OpenAI, 2023 ; Gemini Team et al., 2023 ) . As these systems continue to advance, they will surpass expert knowledge. Consequently, there will be no ground truth to rely on, rendering most alignment approaches unusable. We need mechanisms that provide scalable oversight ( Amodei et al., 2016 ; Christiano et al., 2018 ; Irving et al., 201…

## Deep Reinforcement Learning from Human Preferences — `1706.03741`

- **§1 Introduction** (`S1.p3.1`)

  > If we have demonstrations of the desired task, we can extract a reward function using inverse reinforcement learning ( Ng and Russell, 2000 ) . This reward function can then be used to train an agent with reinforcement learning. More directly, we can use imitation learning to clone the demonstrated behavior. However, these approaches are not directly applicable to behaviors that are difficult for humans to demonstrate (such as controlling a robot with many degrees of freedom but very non-human morphology).

- **§1 Introduction** (`S1.p4.1`)

  > An alternative approach is to allow a human to provide feedback on our system’s current behavior and to use this feedback to define the task. In principle this fits within the paradigm of reinforcement learning, but using human feedback directly as a reward function is prohibitively expensive for RL systems that require hundreds or thousands of hours of experience. In order to practically train deep RL systems with human feedback, we need to decrease the amount of feedback required by several orders of magnitude.

- **§1 Introduction** (`S1.p5.1`)

  > Our approach is to learn a reward function from human feedback and then to optimize that reward function. This basic approach has been considered previously, but we confront the challenges involved in scaling it up to modern deep RL and demonstrate by far the most complex behaviors yet learned from human feedback.

- **§1 Introduction** (`S1.p7.1`)

  > Our algorithm fits a reward function to the human’s preferences while simultaneously training a policy to optimize the current predicted reward function (see Figure 1 ). We ask the human to compare short video clips of the agent’s behavior, rather than to supply an absolute numerical score. We found comparisons to be easier for humans to provide in some domains, while being equally useful for learning human preferences. Comparing short video clips is nearly as fast as comparing individual states, but we show that the resulting comparisons are significantly more helpful. Moreover, we show that…

- **§1 Introduction** (`S1.p8.1`)

  > Our experiments take place in two domains: Atari games in the Arcade Learning Environment ( Bellemare et al., 2013 ) , and robotics tasks in the physics simulator MuJoCo ( Todorov et al., 2012 ) . We show that a small amount of feedback from a non-expert human, ranging from fifteen minutes to five hours, suffices to learn most of the original RL tasks even when the reward function is not observable. We then consider some novel behaviors in each domain, such as performing a backflip or driving with the flow of traffic. We show that our algorithm can learn these behaviors from about an hour of f…

- **§1.1 Related Work** (`S1.SS1.p1.1`)

  > A long line of work studies reinforcement learning from human ratings or rankings, including Akrour et al. (2011) , Pilarski et al. (2011) , Akrour et al. (2012) , Wilson et al. (2012) , Sugiyama et al. (2012) , Wirth and Fürnkranz (2013) , Daniel et al. (2015) , El Asri et al. (2016) , Wang et al. (2016) , and Wirth et al. (2016) . Other lines of research considers the general problem of reinforcement learning from preferences rather than absolute reward values ( Fürnkranz et al., 2012 ; Akrour et al., 2014 ) , and optimizing using human preferences in settings other than reinforcement learni…

## DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models — `2402.03300`

- **§1 Introduction** (`S1.p1.1`)

  > Large language models (LLM) have revolutionized the approach to mathematical reasoning in artificial intelligence, spurring significant advancements in both the quantitative reasoning benchmark ( Hendrycks et al., 2021 ) and the geometry reasoning benchmark ( Trinh et al., 2024 ) . Moreover, these models have proven instrumental in assisting humans in solving complex mathematical problems ( Tao, 2023 ) . However, cutting-edge models such as GPT-4 ( OpenAI, 2023 ) and Gemini-Ultra ( Anil et al., 2023 ) are not publicly available, and the currently accessible open-source models considerably trai…

- **§1 Introduction** (`S1.p2.1`)

  > In this study, we introduce DeepSeekMath, a domain-specific language model that significantly outperforms the mathematical capabilities of open-source models and approaches the performance level of GPT-4 on academic benchmarks. To achieve this, we create the DeepSeekMath Corpus, a large-scale high-quality pre-training corpus comprising 120B math tokens. This dataset is extracted from the Common Crawl (CC) using a fastText-based classifier ( Joulin et al., 2016 ) . In the initial iteration, the classifier is trained using instances from OpenWebMath ( Paster et al., 2023 ) as positive examples,…

- **§1 Introduction** (`S1.I3.i3.p1.1`)

  > Natural Language Understanding, Reasoning, and Code : To build a comprehensive profile of models’ general understanding, reasoning, and coding capabilities, we evaluate DeepSeekMath-Base on the Massive Multitask Language Understanding (MMLU) benchmark ( Hendrycks et al., 2020 ) which encompasses 57 multiple-choice tasks covering diverse subjects, BIG-Bench Hard (BBH) ( Suzgun et al., 2022 ) which consists of 23 challenging tasks that mostly require multi-step reasoning to solve, as well as HumanEval ( Chen et al., 2021 ) and MBPP ( Austin et al., 2021 ) which are widely used to evaluate code l…

- **§Natural Language Understanding, Reasoning, and Code** (`S2.SS3.SSS0.Px4.p1.1`)

  > We evaluate model performance of natural language understanding on MMLU ( Hendrycks et al., 2020 ) , reasoning on BBH ( Suzgun et al., 2022 ) , and coding capabilities on HumanEval ( Chen et al., 2021 ) and MBPP ( Austin et al., 2021 ) . As shown in Table 4 , DeepSeekMath-Base 7B exhibits significant enhancements in performance on MMLU and BBH over its precursor, DeepSeek-Coder-Base-v1.5 ( Guo et al., 2024 ) , illustrating the positive impact of math training on language understanding and reasoning. Additionally, by including code tokens for continual training, DeepSeekMath-Base 7B effectively…

- **§5 Discussion** (`S5.T7.2.1`)

  > Training Setting Training Tokens MMLU BBH HumanEval (Pass@1) MBPP (Pass@1) General Code Math No Continual Training – – – 24.5% 28.1% 12.2% 13.0% Two-Stage Training Stage 1: General Training 400B – – 25.9% 27.7% 15.2% 13.6% Stage 2: Math Training – – 150B 33.1% 32.7% 12.8% 13.2% Stage 1: Code Training – 400B – 25.0% 31.5% 25.0% 40.0% Stage 2: Math Training – – 150B 36.2% 35.3% 12.2% 17.0% One-Stage Training Math Training – – 150B 32.3% 32.5% 11.6% 13.2% Code & Math Mixed Training – 400B 150B 33.5% 35.6% 29.3% 39.4%

- **§5 Discussion** (`S5.I5.i1.p1.1`)

  > Supervised Fine-tuning (SFT) : SFT fine-tunes pretrained model on human selected SFT data.

---

## 读完这八篇正文之后，我认为什么变了

**1. 「人在环上」被写成了"监督者本身也要能被监督"，这是我没读到的角度。**
2212.08073（Constitutional AI）§1：*We need to develop methods now that can provide oversight for these powerful AI systems, and scaling supervision may be one possibility, if the capability level of the supervisor can scale*。它的做法是**用 AI 给 AI 反馈，去掉人类的伤害标签**（§1：*without any human feedback labels for harms*）。我们的 checkpoint 是纯人审，没有任何"用另一个模型先预审一遍再把人的注意力导向分歧点"的机制。

**2. sandwiching 是唯一被设计出来的实验范式，我们不能凭空谈"人类能看懂"。**
2211.03540 §1：方法**紧贴 Cotra 的 sandwiching 提案**——让非专家借助一个不可信但强的 AI 去判断专家级问题，§The Paradigm 明说非专家的处境**类比未来的我们**。我们的 checkpoint 卡目前只给人结论（预测增益、风险），**没有给"反驳它的最强论据"**——按 sandwiching，人需要的是争辩双方，不是一个摘要。

**3. debate 的可扩展性依赖"更有说服力的模型更诚实"，这是被量过的。**
2402.06782 §6：*debate becomes more truth-seeking with increased model persuasiveness … models becoming relatively better at arguing for the correct answer compared to the incorrect answer*；§1 定义了 persuasiveness = judge approval，**不需要 ground truth**。我们的 `rsi_decide` 恰好是一个 judge，但没有"正反两方"，只有一张卡。

**4. 对齐任务的难度层级里，"人类判断不了"是被明确列出的情形。**
1805.00899 §1：*A human may be unable to judge whether an explained answer or exhibited behavior is correct: the behavior may be too hard to understand without help*，并把 debate 放在这个层级的上限。我们的 L2 采纳决策正是这种情形——人看不懂链 spec 的后果，只能看预测。

**5. 先有"人给稀疏偏好"，才谈得上"人给密集审计"。**
1706.03741 §1：让人比较两段短视频而不是打绝对分，*We found comparisons to be easier for humans to express*，并且 **15 分钟到 5 小时的非专家反馈就够**。我们的 checkpoint 要人读一整张卡做绝对判断（采纳/拒绝），按这篇，**成对比较比绝对判断更省人力**——而且我们天然有配对（v2 vs v3）。

**6. 安全的探索可以被"可信策略"兜底，不必靠人盯。**
1606.06565 §6：*If we have a trusted policy and a model of the environment, we can limit exploration to actions the trusted policy believes we can recover from*；同段又说人类监督会撞上 scalable oversight（动作太多太快）。我们的 guard 就是那个可信策略，但它是**事后**跑的，不是"只允许可恢复动作"的前置限制。

**7. 好的可读性本身就是对齐收益。**
1606.06565 §5：*use of semi-supervised RL with a reliable but sparse true approval metric may incentivize communication and transparency by the agent* —— 因为 agent 要靠便宜的代理信号猜真信号，透明对它有利。这给"让 checkpoint 卡写清证据"一个机制性理由，不只是"对人友好"。

**8. 人工标注的成本结构被写成了数字。**
2203.02155 §1：40 名承包商做标注。我们的 checkpoint 是"一个人（我）读卡"，没有成本计量，也没有"这张卡值不值得人看一眼"的判据。

## 三条我会改的

1. **checkpoint 卡加"反方"一栏。** 按 sandwiching/debate，人需要的是最强反驳论据，不是一个被推荐的选项；我们现在只有 `rationale` 单向论证。
2. **把绝对判断改成成对比较。** 有多个候选时让人在两个之间选（"哪个更可能兑现"），而不是逐个采纳/拒绝——1706.03741 说比较更省人力，而且我们的数据天然成对。
3. **把 guard 从事后检查改成"可信策略前置"。** 对应 1606.06565 §6：只允许 trusted policy 认为可恢复的动作，而不是跑完再回滚。

## 这份调研没回答的三件事

1. **人读卡的时间该记在哪。** 八篇里只有 2203.02155 给了标注成本（40 人），没有一篇把"监督者的时间"当成预算项；我们的 `budgetUsd` 不含人的时间。
2. **橡皮图章怎么测。** 综述与 R5 语料都提到 automation bias，但没有一篇给出"这次采纳是不是随便点的"的检测方法。
3. **AI 预审 + 人终审的分工边界。** Constitutional AI 是纯 AI 反馈，sandwiching 是纯人判断，两者中间的"AI 先筛、人只看分歧"没有对照实验。
