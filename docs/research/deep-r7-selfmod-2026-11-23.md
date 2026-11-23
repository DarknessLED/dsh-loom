# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `self-modif`, `archive`, `evolution`, `search`, `novelty`, `descriptor`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and Jeff Clune 2 1 Université Pierre et Marie Curie-Paris 6, CNRS UMR 7222, France 2 University of Wyoming, USA Preprint – August 24, 2026 (`1504.04909`) | 24 | 6 | graded ok (depth full) |
| AlphaEvolve : A coding agent for scientific and algorithmic discovery (`2506.13131`) | 50 | 6 | graded ok (depth full) |
| Evaluating Large Language Models Trained on Code (`2107.03374`) | 55 | 6 | graded ok (depth full) |
| Voyager : An Open-Ended Embodied Agent with Large Language Models (`2305.16291`) | 46 | 5 | graded ok (depth full) |
| Automated Design of Agentic Systems (`2408.08435`) | 23 | 6 | graded ok (depth full) |
| R a i n b o w T e a m i n g : Open-Ended Generation of Diverse Adversarial Prompts (`2402.16822`) | 46 | 6 | graded ok (depth full) |
| Artificial Hivemind: The Open-Ended Homogeneity of Language Models (and Beyond) (`2510.22954`) | 39 | 6 | graded ok (depth full) |
| Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents (`2505.22954`) | 42 | 6 | graded ok (depth full) |

## Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and Jeff Clune 2 1 Université Pierre et Marie Curie-Paris 6, CNRS UMR 7222, France 2 University of Wyoming, USA Preprint – August 24, 2026 — `1504.04909`

- **§1 Background and Motivation** (`S1.p5.1`)

  > Because evolutionary algorithms are one of the most successful families of black-box search algorithms [ 3 , 2 ] , and because the work we build on comes from that community, here we adopt the language and metaphors of evolutionary computation. In that parlance, a solution is an organism or phenotype or individual , the organism is described by a genome or genotype , and the actions performed by that organism are the organism’s behavior . The performance or quality of a solution is called its fitness , and the equation, simulation, etc. that returns that fitness value is the fitness function .…

- **§3 Details of the MAP-Elites algorithm** (`S3.p8.1`)

  > One can consider the archive, which is the set of descriptors in all the cells, as the traditional population in an evolutionary algorithm. The difference is that in MAP-Elites each member of the population is by definition diverse, at least according to the dimensions of the feature space.

- **§4 Differences between MAP-Elites and previous, related algorithms** (`S4.p1.1`)

  > In 2011, Lehman and Stanley [ 22 ] note that combining a selective pressure for feature diversity with one performance objective that all of the different types of phenotypes compete on is akin to having butterflies and bacteria compete with bears and badgers on one performance criterion (e.g. speed). Doing so is unhelpful for producing the fastest of each type of creature, given the different speed scales these creatures exhibit. Instead, Lehman and Stanley propose encouraging diversity in the feature space, but having each organism compete on performance only with other organisms that are ne…

- **§4 Differences between MAP-Elites and previous, related algorithms** (`S4.I1.i2.p1.1`)

  > Novelty Search contains both a current population and an archive of previous solutions that serves as a memory of which points in the feature space have been visited. Maintaining both a population and an archive requires many additional parameters that have to be chosen carefully or performance can be detrimentally affected [ 29 ] .

- **§4 Differences between MAP-Elites and previous, related algorithms** (`S4.I1.i3.p1.1`)

  > Given that Novelty Search rewards individuals that are distant from each other in the feature space, having only a population would lead to “cycling”, a phenomenon where the population moves from one area of the feature space to a new area and back again, without any memory of where it has already explored. The archive in NS+LC limits, but does not eliminate, this phenomenon. MAP-Elites does away with the archive vs. population distinction by having only an archive. It thus avoids cycling and is always simultaneously focused on expanding into new niches (until there are none left) and improvin…

- **§4 Differences between MAP-Elites and previous, related algorithms** (`S4.I1.i3.p2.1`)

  > It is thus quite easy to intuit what the selection pressure for MAP-Elites is over time. In contrast, the selection pressures for Novelty Search are more dynamic and thus harder to understand, even for Novelty Search variants that have only an archive and no population [ 29 ] . For example, it is hard to predict how much search will be focused in each area of the feature space, because a relatively sparse area during one era of the search can become relatively crowded later on, and vice versa.

## AlphaEvolve : A coding agent for scientific and algorithmic discovery — `2506.13131`

- **§1 Introduction** (`S1.p3.1`)

  > The evolutionary process in AlphaEvolve leverages modern LLMs’ ability to respond to feedback, enabling the discovery of candidates that are substantially different from the initial candidate pool in syntax and function. It is applicable both to problems where discovering new algorithms is the intrinsic goal, as well as to the broad range of problems where the solution of interest is not an algorithm itself but an algorithm can describe how that solution is to be constructed or found. In the latter case, discovering the algorithm is only an instrumental goal, but it turns out to be a surprisin…

- **§1 Introduction** (`S1.p4.1`)

  > The idea of combining evolutionary methods with coding LLMs has been previously explored in various specialized settings. In particular, AlphaEvolve is a substantial enhancement of FunSearch [ 83 ] (see Table 1 ), which used LLM-guided evolution to discover heuristics in order to construct novel mathematical objects or to drive the operation of online algorithms. Also, related approaches have been used in tasks such as discovering policies for simulated robots [ 57 ] , symbolic regression [ 89 , 35 ] , and the synthesis of heuristic functions for combinatorial optimization [ 63 ] . In contrast…

- **§Flexibility in choosing the abstraction.** (`S2.SS1.SSS0.Px3.p1.1`)

  > AlphaEvolve can be applied to the same problem in very different ways—especially when the evolved programs are not the final output but a means to discover solutions. For example, AlphaEvolve can evolve the solution in raw string representation (as in classical evolutionary algorithms); evolve a function of a definite form that specifies how to construct the solution from scratch (the approach taken in [ 83 ] ); evolve a bespoke search algorithm to find the solution within some fixed compute budget; or even co-evolve intermediate solutions and search algorithms together, such that each search…

- **§Models used.** (`S2.SS3.SSS0.Px2.p1.1`)

  > AlphaEvolve employs an ensemble of large language models. Specifically, we utilize a combination of Gemini 2.0 Flash and Gemini 2.0 Pro. This ensemble approach allows us to balance computational throughput with the quality of generated solutions. Gemini 2.0 Flash, with its lower latency, enables a higher rate of candidate generation, increasing the number of ideas explored per unit of time. Concurrently, Gemini 2.0 Pro, possessing greater capabilities, provides occasional, higher-quality suggestions that can significantly advance the evolutionary search and potentially lead to breakthroughs. T…

- **§2 AlphaEvolve** (`S2.I2.i3.p1.1`)

  > Parallelized evaluation : the sample efficiency of AlphaEvolve makes it feasible to spend on the order of 100 compute-hours to evaluate any new solution. However, unless individual evaluations are parallelized to reduce their wall-clock duration, this can slow down the rate at which new generations appear, limiting the ability of the evolutionary algorithm to apply several consecutive mutations. In many applications, evaluation is embarrassingly parallel (for example, running a search algorithm from multiple randomized initializations), allowing AlphaEvolve to distribute this work through asyn…

- **§2.5 Evolution** (`S2.SS5.p1.1`)

  > During its evolutionary procedure, AlphaEvolve continually generates a growing number of solutions with evaluation results (scores and program outputs) attached to them. These solutions are stored in an evolutionary database, the primary goal of which is to optimally resurface previously explored ideas in future generations. A key challenge in designing such databases is balancing exploration and exploitation, to continuously improve the best programs while maintaining diversity to encourage exploration of the entire search space. In AlphaEvolve , the evolutionary database implements an algori…

## Evaluating Large Language Models Trained on Code — `2107.03374`

- **§3.4 Comparative Analysis of Related Models and Systems** (`S3.SS4.p1.1`)

  > Two recent works similar in spirit to Codex are GPT-Neo ( Black et al., 2021 ) and GPT-J ( Wang & Komatsuzaki, 2021 ) , which are trained on The Pile ( Gao et al., 2020 ) , a dataset containing text from a variety of sources as well as 8% GitHub code. The broader research community has found that these models outperform existing GPT systems in qualitative programming evaluations ( Woolf, 2021 ) .

- **§7 Broader Impacts and Hazard Analysis** (`S7.p3.1`)

  > While some of our findings about the potential societal impacts of code generation systems were informed by work towards responsible deployment of the production-oriented Codex models (which descended from the research-oriented Codex models described in this paper), this section is not intended to provide a full account of any particular product’s safety features. Unless otherwise specified, we anchor our analysis in the specific properties of the models described in this paper. We share this analysis in the belief that some of it generalizes to the broader class of code generation systems, an…

- **§7.1 Over-reliance** (`S7.SS1.p2.1`)

  > We note several immediate ways to improve safety in the subsection on risk mitigation below, though over-reliance in particular is one that we believe merits further inquiry in industry and academia. While it is conceptually straightforward to provide documentation to users reminding them about model limitations, empirical investigation is necessary in order to identify how to reliably ensure vigilance in practice across a range of user experience levels, UI designs, and tasks. One challenge researchers should consider is that as capabilities improve, it may become increasingly difficult to gu…

- **§7.5 Security implications** (`S7.SS5.p2.1`)

  > Codex could also be misused to aid cybercrime. Although this is worthy of concern, based on our testing, we believe that at their current level of capability, Codex models do not materially lower the barrier to entry for malware development. 4 4 4 For more on characterizing Codex’s capability limitations, see the Limitations section and experiments in the security analysis in Appendix G . We expect that more powerful code generation models will lead to future advancements, and therefore further research into mitigations and continued study of model capabilities are necessary.

- **§7.7 Legal implications** (`S7.SS7.p2.1`)

  > Our preliminary research also finds that Codex models rarely generate code that is identical to the contents of training data. Such occurrences were < < 0.1% in a study examining the frequency of code generations that appear to match code snippets in the training data ( Ziegler, 2021 ) . In these rare instances, the generated code consisted of common expressions or conventions within the programming language that appeared over and over again in the training data. We find that, to the extent the generated code appears identical to the training data, it is due to the predictive weightings in the…

- **§7.8 Risk mitigation** (`S7.SS8.p3.1`)

  > Appendices E, F, G, and H provide further detail on the risks described in this section and outline additional mitigation and research opportunities.

## Voyager : An Open-Ended Embodied Agent with Large Language Models — `2305.16291`

- **§1 Introduction** (`S1.p4.1`)

  > More specifically, Voyager attempts to solve progressively harder tasks proposed by the automatic curriculum , which takes into account the exploration progress and the agent’s state. The curriculum is generated by GPT-4 based on the overarching goal of “discovering as many diverse things as possible”. This approach can be perceived as an in-context form of novelty search [ 39 , 40 ] . Voyager incrementally builds a skill library by storing the action programs that help solve a task successfully. Each program is indexed by the embedding of its description, which can be retrieved in similar sit…

- **§2.2 Skill Library** (`S2.SS2.p1.1`)

  > With the automatic curriculum consistently proposing increasingly complex tasks, it is essential to have a skill library that serves as a basis for learning and evolution. Inspired by the generality, interpretability, and universality of programs [ 45 ] , we represent each skill with executable code that scaffolds temporally extended actions for completing a specific task proposed by the automatic curriculum.

- **§Large Language Models for Agent Planning.** (`S5.SS0.SSS0.Px2.p1.1`)

  > Inspired by the strong emergent capabilities of LLMs, such as zero-shot prompting and complex reasoning [ 72 , 37 , 38 , 36 , 73 , 74 ] , embodied agent research [ 75 , 76 , 77 , 78 ] has witnessed a significant increase in the utilization of LLMs for planning purposes. Recent efforts can be roughly classified into two groups. 1) Large language models for robot learning: Many prior works apply LLMs to generate subgoals for robot planning [ 27 , 27 , 25 , 79 , 80 ] . Inner Monologue [ 26 ] incorporates environment feedback for robot planning with LLMs. Code as Policies [ 16 ] and ProgPrompt [ 2…

- **§Code Generation with Execution.** (`S5.SS0.SSS0.Px3.p1.1`)

  > Code generation has been a longstanding challenge in NLP [ 41 , 84 , 85 , 73 , 37 ] , with various works leveraging execution results to improve program synthesis. Execution-guided approaches leverage intermediate execution outcomes to guide program search [ 86 , 87 , 88 ] . Another line of research utilizes majority voting to choose candidates based on their execution performance [ 89 , 90 ] . Additionally, LEVER [ 91 ] trains a verifier to distinguish and reject incorrect programs based on execution results. CLAIRIFY [ 92 ] , on the other hand, generates code for planning chemistry experimen…

- **§7 Broader Impacts** (`S7.p1.1`)

  > Our research is conducted within Minecraft, a safe and harmless 3D video game environment. While Voyager is designed to be generally applicable to other domains, such as robotics, its application to physical robots would require additional attention and the implementation of safety constraints by humans to ensure responsible and secure deployment.

## Automated Design of Agentic Systems — `2408.08435`

- **§4.1 Case Study: ARC Challenge** (`S4.SS1.p4.1`)

  > Results and Analysis. As shown in Figure 3(a) , Meta Agent Search effectively and progressively discovers agents that perform better than state-of-the-art hand-designed baselines. Important breakthroughs are highlighted in the text boxes. As is critical in prior works on open-endedness and AI-GAs ( Zhang et al., 2024a ; Faldor et al., 2024 ; Wang et al., 2019 ; Wang et al., 2020 ; Lehman & Stanley, 2011 ) , Meta Agent Search innovates based on a growing archive of previous stepping stones. For example, an important design pattern emerged in iteration 3 where it uses multiple COTs to generate p…

- **§1 Introduction** (`S1.p5.1`)

  > Following the aforementioned ideas, we present Meta Agent Search in this paper as one of the first algorithms in ADAS that enables complete design in code space ( Figure 1 ). The core concept of Meta Agent Search is to instruct a meta agent to iteratively create interestingly new agents, evaluate them, add them to an archive that stores discovered agents, and use this archive to help the meta agent in subsequent iterations create yet more interestingly new agents. Similar to existing open-endedness algorithms that leverage human notions of interestingness ( Zhang et al., 2024a ; Lu et al., 202…

- **§3 Our Algorithm: Meta Agent Search** (`S3.p1.1`)

  > In this section, we present Meta Agent Search, a simple yet effective algorithm to demonstrate the approach of defining and searching for agents in code. The core idea of Meta Agent Search is to adopt FMs as meta agents to iteratively program interestingly new agents based on an ever-growing archive of previous discoveries. Although any possible building blocks and agentic systems can theoretically be programmed by the meta agent from scratch, it is inefficient in practice to avoid providing the meta agent any basic functions such as FM query APIs or existing tools. Therefore, in this paper, w…

- **§3 Our Algorithm: Meta Agent Search** (`S3.p2.1`)

  > As shown in Figure 1 , the core idea of Meta Agent Search is to have a meta agent iteratively program new agents in code. The algorithm proceeds as follows: (1) The archive is (optionally) initialized with baseline agents such as Chain-of-Thought ( Wei et al., 2022 ) and Self-Refine ( Madaan et al., 2024 ; Shinn et al., 2023 ) . (2) Conditioned on the archive, the meta agent designs a new agent by generating a high-level description of the new idea for an agentic system and then implementing it in code. The design then undergoes two self-reflection ( Madaan et al., 2024 ; Shinn et al., 2023 )…

- **§4.1 Case Study: ARC Challenge** (`S4.SS1.p3.1`)

  > Baselines. We compared against five state-of-the-art hand-designed agents: (1) Chain-of-Thought (COT, Wei et al. (2022) ), which instructs the agent to output the reasoning before answering to improve complex problem-solving through intermediate steps; (2) Self-Consistency with Chain-of-Thought (COT-SC, Wang et al. (2023b) ), which ensembles multiple parallel answers from COT to produce a more accurate answer; (3) Self-Refine ( Madaan et al., 2024 ; Shinn et al., 2023 ) , which allows iterative self-reflection to correct mistakes made in previous attempts; (4) LLM-Debate ( Du et al., 2023 ) ,…

- **§6 Discussion and Conclusion** (`S6.I1.i7.p1.1`)

  > Novelty search algorithms. In Meta Agent Search, the design of the search algorithm is relatively simple, focusing solely on exploring interesting new designs. A more careful design of the search algorithm can be a promising future direction. For example, one could incorporate more sophisticated ideas from Quality-Diversity ( Mouret & Clune, 2015 ; Cully & Demiris, 2017 ) , AI-generating ( Clune, 2019 ) , and Open-ended Algorithms ( Faldor et al., 2024 ; Zhang et al., 2024a ; Stanley & Lehman, 2015 ; Stanley et al., 2019 ) . One could also include more classic approaches to balance exploration…

## R a i n b o w T e a m i n g : Open-Ended Generation of Diverse Adversarial Prompts — `2402.16822`

- **§7 Related Work** (`S7.p2.1`)

  > Open-Endedness and LLMs. Rainbow Teaming builds on the ability of LLMs to act as a powerful mutation operator over language inputs, one that adheres to the underlying structure of natural language ( Lehman et al., 2022 ) . Several recent methods exploit this capability of LLMs in order to perform an efficient novelty-driven evolutionary search in the language space, leading to the discovery of potentially open-ended repertoires of solutions ( Chen et al., 2023 ; Fernando et al., 2023 ; Meyerson et al., 2023 ) . Closest to our approach is QDAIF ( Bradley et al., 2023 ) which similarly uses LLMs…

- **§1 Introduction** (`S1.p4.1`)

  > Rainbow Teaming is an open-ended approach ( Hughes et al., 2024 ) which builds on MAP-Elites ( Mouret and Clune, 2015 ) , an evolutionary search method that iteratively populates an “archive” with increasingly higher-performing solutions. In our case, these solutions are adversarial prompts that elicit undesirable behaviours in a target LLM, while the archive is a discrete grid where each dimension categorises prompts according to a feature of interest for diversity, such as attack style, risk category, or prompt length. The output of our method, as shown in footnote 2 , is a set of prompts co…

- **§3 Rainbow Teaming** (`S3.p2.1`)

  > Rainbow Teaming is based on MAP-Elites ( Mouret and Clune, 2015 ) . We store adversarial prompts as solutions in a K K -dimensional archive, with each dimension corresponding to one of the pre-defined features. Each cell in the archive corresponds to a unique combination of K K categories that describe the prompt within it, known as the cell’s and the solution’s descriptor , and denoted z = ⟨ c 1 , … , c K ⟩ z=\langle c_{1},\dots,c_{K}\rangle . The LLM for which the adversarial prompts are generated is referred to as the Target . Initial solutions can be either generated randomly using an LLM…

- **§4 Rainbow Teaming for Safety** (`S4.p3.1`)

  > To initialise the archive, we generate prompts from scratch according to risk categories without relying on a pre-existing seed dataset. These are then mutated with respect to attack style and used as a foundation for subsequent evolutionary iterations. We use two independent measures of Attack Success Rate (ASR) – the proportion of prompts in the archive that elicit unsafe responses. Specifically, we use two safety classifiers, namely GPT-4 ( OpenAI, 2023 ) with a specialised prompt and the Llama Guard safeguard model ( Inan et al., 2023 ) . GPT-4 acts as a binary classifier for whether a res…

- **§2 Background** (`S2.p1.1`)

  > Rainbow Teaming builds on existing approaches in quality-diversity (QD) search to automate the discovery of a broad spectrum of adversarial prompts. QD methods seek to produce a collection of solutions that are individually high-performing and collectively diverse ( Lehman and Stanley, 2011 ; Cully and Demiris, 2018 ) . Given a space of solutions 𝒳 \mathcal{X} , the quality of a solution x ∈ 𝒳 x\in\mathcal{X} is measured using a fitness function f : 𝒳 → ℝ f:\mathcal{X}\rightarrow\mathbb{R} . The diversity of solutions is characterised using a feature descriptor function , d : 𝒳 ↦ 𝒵 d:\mat…

- **§2 Background** (`S2.p2.1`)

  > Our work builds directly on MAP-Elites ( Mouret and Clune, 2015 ) , a simple yet effective QD method. MAP-Elites tracks the highest-fitness solutions in a multidimensional grid, referred to as the archive , which discretises the feature space 𝒵 \mathcal{Z} . The archive is first initialised with random solutions. During each iteration of MAP-Elites, a solution x x is sampled at random from the archive and modified to create a new solution x ′ x^{\prime} (e.g., by injecting Gaussian noise). The new solution x ′ x^{\prime} is then evaluated and assigned to its corresponding archive cell based o…

## Artificial Hivemind: The Open-Ended Homogeneity of Language Models (and Beyond) — `2510.22954`

- **§2 Infinity-Chat : Real-World Open-Ended Queries with Diverse Responses** (`S2.p1.1`)

  > Most existing LM alignment datasets prioritize response correctness over diversity, and rarely include multiple distinctive responses to the same prompt. This overlooks the inherent variability of open-ended queries, which often admit several equally valid answers. This gap motivates our first central research question: What types of open-ended queries do users actually pose to language models?

- **§3 Artificial Hivemind: Intra- and Inter-Model Homogeneity in LMs** (`S3.p9.1`)

  > To summarize, our work provides further evidence of high syntactic repetition across different models. While a full causal analysis is beyond the scope of this study, our findings motivate future research to investigate whether such repetition arises from pretraining data, alignment processes, memorization, contamination, or generalization.

- **§5 Related Work** (`S5.p1.1`)

  > The diversity collapse problem of LMs. Diversity collapse, characterized by the inability of LMs to generate diverse outputs, presents a significant challenge to pluralistic alignment research ( Zhang et al., 2024 ; Shumailov et al., 2023 ; Dohmatob et al., 2024 ; Yang et al., 2024 ; Li et al., 2024b ; West and Potts, 2025 ) . Prior studies identify some key factors contributing to diversity collapse, including training on synthetic data ( Havrilla et al., 2024 ; Wang et al., 2024 ; Yang et al., 2024 ; Shumailov et al., 2024 ) , LM alignment ( Murthy et al., 2024a ; Kirk et al., 2024a ; Kirk e…

- **§5 Related Work** (`S5.p2.1`)

  > Measuring the creativity and divergent thinking of language models. Recent efforts to measure the creativity and divergent thinking of LMs often adapt established psychometric tests. For example, ( Chen and Ding, 2023 ) utilizes a divergent association task (DAT) by asking models to generate semantically distant or unrelated words ( Olson et al., 2021 ) . Similarly, tasks such as the Alternate Uses Test (AUT) ( Rabeyah et al., 2024 ) , the Torrance Tests of Creative Thinking (TTCT) ( Alabbasi et al., 2022 ; Chakrabarty et al., 2024 ) , Human Evaluation, and LLM-as-a-judge ( Krumdick et al., 20…

- **§5 Related Work** (`S5.p3.1`)

  > Disagreement and pluralistic alignment of language models. Advances in AI value alignment research have substantially improved LM utility and safety, through enhanced training processes ( Schulman et al., 2017 ; Ouyang et al., 2022 ; Rafailov et al., 2023 ) , and the use of both synthetic data ( Ge et al., 2024 ) and human datasets ( Bai et al., 2022b ; Ganguli et al., 2022 ) . Yet, a significant challenge remains: the potential for monolithic value representation ( Ryan et al., 2024b ; Ryan et al., 2024a ) . In contrast, the emerging focus on pluralistic alignment emphasizes the need for AI t…

- **§Acknowledgment** (`Sx1.p1.1`)

  > This work was supported by DARPA under the ITM program (FA8650-23-C-7316). This work was also supported in part by the Defense Advanced Research Projects Agency’s (DARPA) SciFy program (Agreement No. HR00112520300). The views expressed are those of the author and do not reflect the official policy or position of the Department of Defense or the U.S. Government.

## Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents — `2505.22954`

- **§1 Introduction** (`S1.p2.1`)

  > Schmidhuber (2007) presented a class of mathematically rigorous, self-referential, self-improving problem solvers. It relies on formal proofs to justify code rewrites, ensuring that any self-modification is provably beneficial. However, in practice and without restrictive assumptions about the system, it is impossible to formally prove whether a modification to an AI system will be beneficial. For example, while it may seem that an LLM-based coding agent would benefit from access to more tools (e.g., code search, test runners), the actual impact depends heavily on the model’s training and task…

- **§1 Introduction** (`S1.p3.1`)

  > We propose the Darwin Gödel Machine (DGM) , a self-referential, self-improving system that writes and modifies its own code to become a better coding agent. Each self-modification requires the DGM to edit its own codebase. We use Python, which is Turing-complete, giving the DGM the potential to build any computable machine. Our framework envisions agents that can rewrite their own training scripts (including training a new foundation model (FM)). However, we do not show that in this paper, as training FMs is computationally intensive and would introduce substantial additional complexity, which…

- **§2 Related Work** (`S2.p1.1`)

  > Open-Endedness. A grand challenge for driving unbounded innovation is designing open-ended AI systems that continuously generate novel and learnable artifacts ( Stanley et al., 2017 ) . Hughes et al. (2024) characterized open-endedness as a system’s capacity to generate sequences of artifacts that are both novel and learnable from an observer’s perspective. A central difficulty lies in structuring and exploring vast search spaces to consistently produce artifacts that are interesting to humans ( Clune, 2019 ; Jiang et al., 2023 ) . Early progress drew on quality-diversity algorithms, goal-dire…

- **§2 Related Work** (`S2.p3.1`)

  > Self-Improving AI. Early on, various researchers outlined theoretical and conceptual approaches to self-improvement ( Good, 1966 ; Schmidhuber, 1987 ; Schmidhuber, 2007 ) . Some practical approaches to automated self-improvement include systems defined by neural network weight parameterizations ( Schmidhuber, 1993 ; Hall, 2007 ; Hobbhahn, 2025 ; Kirsch and Schmidhuber, 2022 ; Irie et al., 2022 ; Irie et al., 2025 ; Lu et al., 2023 ; Havrilla et al., 2024b ) . Metz et al. (2021) developed a gradient-based optimizer that is self-referentially meta-trained using a variant of population-based trai…

- **§3 Darwin Gödel Machine** (`S3.p1.1`)

  > A Gödel Machine is a theoretical idea of an AI that searches for ways that provably improve itself ( Schmidhuber, 2007 ) . In this paper, we propose Darwin Gödel Machine (DGM), an attempt to realize the long-held dream of creating a Gödel Machine. The DGM relaxes the Gödel Machine’s impractical requirement of theoretically proving that a change will improve the system, instead requiring empirical evidence from experiments to demonstrate that a proposed new version enhances performance. Additionally, since the DGM relies on empirical evidence of improvement, it may get stuck in a local optimum…

- **§4.3 Baselines** (`S4.SS3.p1.1`)

  > To isolate and evaluate the contribution of the DGM’s core components, we compare the DGM against two baselines: DGM without self-improving agents ( DGM w/o self-improve ) and DGM without open-ended exploration ( DGM w/o open-ended exploration ). DGM w/o self-improve replicates the approach of ADAS ( Hu et al., 2025 ) in this setting, wherein the meta agent responsible for modifying the coding agents remains fixed as the base agent throughout the experiment ( Algorithm 2 ). This baseline allows us to assess the role of iterative self-improvement in accelerating the evolution of better coding a…

---

## 读完这八篇正文之后，我认为什么变了

**1. MAP-Elites 的 archive 不是"保存历史"，是"按行为描述符分格保存最优"。**
1504.04909 §3：*the archive, which is the set of descriptors in all the cells … in MAP-Elites each member of the population is by definition diverse, at least according to the dimensions of the feature space*。§4 还点出它与 Novelty Search 的差别：NS 需要同时维护 population 与 archive，参数多且容易调坏，而且会"cycling"（去了又回、没有记忆）。我们的链版本只有一条时间线（v1→v2→…），**没有描述符分格**，所以"多样性崩溃"在我们这里无法被观测。

**2. 我们的 archive 缺的不是容量，是"格"这个维度。**
同上 §4 引 Lehman & Stanley 的比喻：让蝴蝶和细菌跟熊和獾比同一个性能指标是没意义的。我们的 `heldOut`/`minGain` 就是那个"单一性能指标"——所有变体在同一把尺子上竞争，于是变体越像 incumbent 越容易被保留。

**3. AlphaEvolve 的进化数据库存在的理由是"让旧想法重新浮上来"。**
2506.13131 §2.5：*These solutions are stored in an evolutionary database, the primary goal of which is to optimally resurface previously explored ideas in future generations*；§Models used 用 Gemini Flash+Pro 双模型做吞吐/质量权衡；§2 提到单次评估可花 ~100 计算小时但必须并行。我们 `reduce.js` 里的 `chain.versions` 只是历史记录，**没有任何"重新浮上来"的机制**——旧版本不会再被采样。

**4. 进化搜索的抽象层次是可选的，这决定了"改什么"的自由度。**
同上 §Flexibility in choosing the abstraction：可以进化原始字符串、可以进化定形函数、也可以进化更高层的结构。我们的 `mutateChain` 只在一个固定的参数空间里动（candidates/minGain/halving…），**抽象层次被钉死**，所以永远发现不了"参数空间本身不对"。

**5. 自我修改的理论版本要求"可证明有益"，实践版本只能靠评估。**
2505.22954（DGM）§1：Schmidhuber 的 Gödel Machine 依赖形式证明，*it is impossible to formally prove* 之后 DGM 改成"写代码 + 用 benchmark 评估 + archive 保留可行者"；§3 明确这是 relax。§4.3 的消融把"自我改进"与"开放式探索"分开量：DGM w/o self-improve（= ADAS）、DGM w/o open-ended exploration。我们的 loop 只有"改进"，没有"开放式探索"这一臂。

**6. 开放式探索的必要条件被定义过：持续产出既新颖又可学的人工物。**
2408.08435（ADAS）§1/§3 的 Meta Agent Search：meta agent 不断写新 agent 进 archive，§6 自己承认搜索算法很简单（*focusing solely on exploring interesting new designs*），并把 QD 列为未来方向。我们连"新颖性"这个量都没有。

**7. 多样性崩溃是一个已被命名、被测量的失败模式。**
2510.22954 §3/§5：intra/inter-model homogeneity 与 *diversity collapse*，并把它归到 pluralistic alignment 的挑战。我们的 loop 每轮用同一个模型、同一套 prompt 生成候选，**结构上就在这个失败模式里**，而我们的指标只有一个分数，看不见它。

**8. 用 MAP-Elites 生成对抗样本是被验证过的用法。**
2402.16822 §3：archive 的每一维对应一个预定义特征，每个格是特征的组合；§4 用两条独立的 ASR 度量。这说明"分格"不是理论装饰，是可操作的工程。

## 三条我会改的

1. **给链版本加描述符。** 至少两个维度（例如"改动面：参数 vs 结构"与"代价：轮成本区间"），把 `chain.versions` 从列表改成按格取最优的 archive；这是让"多样性崩溃"可被观测的最小改动。
2. **让旧版本能被重新采样。** 对应 AlphaEvolve 的 database：候选生成时按格采样父代，而不是永远从 activeVersion 出发。
3. **加一条"开放式探索"臂。** 对应 DGM §4.3 的消融：现在每一轮都在"改进"，从来没有一轮是"探索"；把两者分成两个可选动作，至少能量出哪一半在起作用。

## 这份调研没回答的三件事

1. **描述符该选什么。** 语料里全是"人工预定义特征"（风险类别、攻击风格），没有一篇给"如何为任意搜索空间选描述符"的方法；我们的"链"没有天然的特征空间。
2. **QD 与 LLM 成本的关系。** MAP-Elites 假设评估便宜（跑一次仿真），我们每次评估是真实计费；分格意味着更少的资源集中在最好的格上，代价没人算过。
3. **自我修改的安全下限。** DGM 用 archive + benchmark 兜底，但我们的 benchmark 是"自己的测试套件"，两者同源（R8 那条），DGM 的兜底在我们这里不成立。
