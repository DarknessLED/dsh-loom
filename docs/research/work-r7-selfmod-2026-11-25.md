# Library: r7-selfmod

Built from arXiv HTML bodies on 2026-11-25. 18 work(s).

| work | year | mechanism points | figure | cited by | summary |
| --- | --- | --- | --- | --- | --- |
| [Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and Jeff Clune 2 1 Université Pierre et Marie Curie-Paris 6, CNRS UMR 7222, France 2 University of Wyoming, USA Preprint – August 24, 2026](https://arxiv.org/abs/1504.04909) | 2015 | 3 | yes | 4 | yes |
| [AlphaEvolve : A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131) | 2025 | 10 | yes | 1 | yes |
| [Qwen3 Technical Report](https://arxiv.org/abs/2505.09388) | 2025 | 17 | yes | 1 | yes |
| [Multi-Objective Quality Diversity Optimization](https://arxiv.org/abs/2202.03057) | 2022 | 3 | yes | 0 | yes |
| [Promptbreeder: Self-Referential Self-Improvement via Prompt Evolution](https://arxiv.org/abs/2309.16797) | 2024 | 8 | yes | 2 | yes |
| [Automated Design of Agentic Systems](https://arxiv.org/abs/2408.08435) | 2025 | 2 | yes | 1 | yes |
| [R a i n b o w T e a m i n g : Open-Ended Generation of Diverse Adversarial Prompts](https://arxiv.org/abs/2402.16822) | 2024 | 1 | yes | 0 | yes |
| [HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal](https://arxiv.org/abs/2402.04249) | 2024 | 20 | yes | 0 | yes |
| [ShinkaEvolve : Towards Open-Ended And Sample-Efficient Program Evolution](https://arxiv.org/abs/2509.19349) | 2026 | 4 | yes | 0 | yes |
| [Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents](https://arxiv.org/abs/2505.22954) | 2026 | 2 | yes | 1 | yes |
| [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) | 2021 | 6 | yes | 4 | yes |
| [Evolution of Heuristics: Towards Efficient Automatic Algorithm Design Using Large Language Model](https://arxiv.org/abs/2401.02051) | 2024 | 5 | yes | 2 | yes |
| [Voyager : An Open-Ended Embodied Agent with Large Language Models](https://arxiv.org/abs/2305.16291) | 2023 | 4 | yes | 1 | yes |
| [Gemini 2.5: Pushing the Frontier with Advanced Reasoning, Multimodality, Long Context, and Next Generation Agentic Capabilities](https://arxiv.org/abs/2507.06261) | 2025 | 41 | yes | 0 | yes |
| [The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783) | 2024 | 13 | yes | 0 | yes |
| [GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning](https://arxiv.org/abs/2507.19457) | 2025 | 1 | yes | 0 | yes |
| [Artificial Hivemind: The Open-Ended Homogeneity of Language Models (and Beyond)](https://arxiv.org/abs/2510.22954) | 2025 | 5 | yes | 0 | yes |
| [ReAct : Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) | 2023 | 11 | yes | 2 | yes |

Summaries written: 18 of 18

---

# Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and Jeff Clune 2 1 Université Pierre et Marie Curie-Paris 6, CNRS UMR 7222, France 2 University of Wyoming, USA Preprint – August 24, 2026

arXiv:1504.04909 · 2015 · [source](https://arxiv.org/html/1504.04909)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Every field of science and engineering makes use of search algorithms, also known as optimization algorithms, which seek to automatically find a high-quality solution or set of high-quality solutions amongst a large space of possible solutions [ 1 , 2 ] . Such algorithms often find solutions that outperform those designed by human engineers [ 3 ] : they have designed antennas that NASA flew to space [ 4 ] , found patentable electronic circuit designs [ 3 ] , automated scientific discovery [ 5 ] , and created artificial intelligence for robots [ 6 , 7 , 8 , 9 , 10 , 11 , 12 , 13 , 14 , 15 ] . Because of their widespread use, improving search algorithms provides substantial benefits for society.

<sub>§1 Background and Motivation</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Optimization vs. Illumination Algorithms"]
  N1["§3 Details of the MAP-Elites algorithm"]
  N2["§4 Differences between MAP-Elites and previous, related algorithms"]
  N0 --> N1
  N1 --> N2
```

![The MAP-Elites algorithm searches in a high-dimensional space to find the highest-performing solution at each point in a low-dimensional feature space, where the user gets to choose dimensions of variation of interest that define the low dimensional space. We call this type of algorithm an “illumination algorithm”, because it illuminates the fitness potential of each area of the feature space, including tradeoffs between performance and the features of interest. For example, MAP-Elites could search in the space of all possible robot designs (a very high dimensional space) to find the fastest robot (a performance criterion) for each combination of height and weight.](https://arxiv.org/html/1504.04909v1/figures-concept-concept.jpg)

*The MAP-Elites algorithm searches in a high-dimensional space to find the highest-performing solution at each point in a low-dimensional feature space, where the user gets to choose dimensions of variation of interest that define the low dimensional space. We call this type of algorithm an “illumination algorithm”, because it illuminates the fitness potential of each area of the feature space, including tradeoffs between performance and the features of interest. For example, MAP-Elites could search in the space of all possible robot designs (a very high dimensional space) to find the fastest robot (a performance criterion) for each combination of height and weight.*

<sub>figure: `1504.04909v1/figures-concept-concept.jpg`</sub>

## 机制
### 1. Optimization vs. Illumination Algorithms

Optimization algorithms try to find the highest-performing solution in a search space. Sometimes they are designed to return a set of high-performing solutions, where members in the set are also good on other objectives, and where the set represents the solution on the Pareto front of tradeoffs between performance and quality with respect to those other objectives. Optimization algorithms are not traditionally designed to report the highest-performing solution possible in an area of the feature space that cannot produce either the highest-performing solution overall, or a solution on the Pareto front. A different kind of algorithm, which we call illumination algorithms , are designed to return the highest-performing solution at each point in the feature space. They thus illuminate the fitness potential of each region of the feature space. In biological terms, they illuminate the phenotype-fitness map [ 38 ] . Any illumination algorithm can also be used as an optimization algorithm, making illumination algorithms a superset of optimization algorithms. MAP-Elites is an illumination algorithm. It is inspired by two previous illumination algorithms, Novelty Search + Local Competition (NS+LC) [ 22 ] and the Multi-Objective Landscape Exploration algorithm (MOLE) [ 32 ] . All three are described below.

<sub>§2 Optimization vs. Illumination Algorithms</sub>

### 2. Details of the MAP-Elites algorithm

MAP-Elites is quite simple, both conceptually and to implement. Pseudocode of the algorithm is in Fig. 2 . First, a user chooses a performance measure f ⁡ ( x ) f(x) that evaluates a solution x x . For example, if searching for robot morphologies, the performance measure could be how fast the robot is. Second, the user chooses N N dimensions of variation of interest that define a feature space of interest to the user. For robot morphologies, one dimension of interest could be how tall the robot is, another could be its weight, a third could be its energy consumption per meter moved, etc. An alternate example could be searching for chess programs, where the performance measure is the win percentage, and the dimensions of variation could be the aggressiveness of play, the speed with which moves are selected, etc. A further example is evolving drug molecules, where performance could be a drug’s efficacy and dimensions of variation could be the size of molecules, the cost to produce them, their perishability, etc. Each dimension of variation is discretized based on user preference or available computational resources. This granularity could be manually specified or automatically tuned to the available resources, including starting with a coarse discretization and then increasing the granularity as time and computation allow. Given a particular discretization, MAP-Elites will search for the highest performing solution for each cell in the N N -dimensional feature space. For example, MAP-Elites will search for the fastest robot that is tall, heavy, and efficient; the fastest robot that is tall, heavy, and inefficient, the fastest robot that is tall, light, and efficient, etc. The search is conducted in the search space , which is the space of all possible values of x x , where x x is a description of a candidate solution. In our example, the search space contains all possible descriptions of robot morphologies (note that we must search in the space of descriptions of robot morphologies; it is not possible to search directly in the space of robot morphologies or directly in the feature space). We call the x x descriptor a genome or genotype and the robot morphology the phenotype , or p x p_{x} . We have already mentioned that a function f ⁡ ( x ) f(x) , called a fitness function , returns the performance of each x x . A feature (a.k.a. behavior) function b ⁡ ( x ) b(x) must also exist or be defined that, for each x x , determines x x ’s value in each of the N N feature dimensions. In other words, b ⁡ ( x ) b(x) returns 𝐛 𝐱 \mathbf{b_{x}} , which is an N N -dimensional vector describing x x ’s features. In our example, the first dimension of 𝐛 𝐱 \mathbf{b_{x}} is the robot’s height, the second dimension is its weight, and the third is its energy consumption per meter moved, etc. Some elements of the feature vector may be directly measured in the phenotype (e.g. height, weight), but others (e.g. energy consumption) require measuring the behavior of the phenotype while it performs, either in simulation or reality. Note that there may be many levels of indirection between x x and 𝐛 𝐱 \mathbf{b_{x}} . With direct encoding , each element in the genome specifies an independent component of the phenotype [ 39 , 7 , 2 ] . In that case, it is straightforward to map genotypes into phenotypes, and then measure performance and features (evaluating the phenotype in a simulator or the real world if necessary). An extra level of indirection can occur with indirect encoding , also known as generative or developmental encoding, in which information in the genome can be reused to affect many parts of the phenotype (also called pleiotropy ); such encodings have been shown to improve regularity, performance, and evolvability [ 39 , 7 , 2 , 8 , 40 , 13 , 12 , 11 , 41 , 42 ] . In other words, a complex process can exist that maps genome x → x\rightarrow to phenotype p x → p_{x}\rightarrow to features 𝐛 𝐱 \mathbf{b_{x}} and performance f ​ x f{x} . MAP-Elites starts by randomly generating G G genomes and determining the performance and features of each. In a random order, those genomes are placed into the cells to which they belong in the feature space (if multiple genomes map to the same cell, the highest-performing one per cell is retained). At that point the algorithm is initialized, and the following steps are repeated until a termination criterion is reached. (1) A cell in the map is randomly chosen and the genome in that cell produces an offspring via mutation and/or crossover. (2) The features and performance of that offspring are determined, and the offspring is placed in the cell if the cell is empty or if the offspring is higher-performing than the current occupant of the cell, in which case that occupant is discarded. The termination criterion can be many things, such as if a set amount of time expires, a fixed amount of computational resources are consumed, or some property of the archive is produced. Examples of the latter could include a certain percentage of the map cells being filled, average fitness in the map reaching a specific level, or n n solutions to a problem being discovered. One can consider the archive, which is the set of descriptors in all the cells, as the traditional population in an evolutionary algorithm. The difference is that in MAP-Elites each member of the population is by definition diverse, at least according to the dimensions of the feature space. The above description, for which pseudocode is provided in Fig. 2 , is the default way to implement MAP-Elites. To encourage a more uniform exploration of the space at a coarse resolution, and then a more fine-grained search afterwards, we created a hierarchical version that starts with larger cells in the feature space that are then subdivided into smaller cells during search after predetermined numbers of evaluations have been performed (Methods). We further parallelized this algorithm to run on clusters of networked computers, by farming out batches of evaluations to slave nodes, instead of performing each evaluation serially (Methods). Section 8 contains ideas for additional, alternate possible variants of MAP-Elites. There are two things to note about MAP-Elites: It is not guaranteed that all cells in the feature space will be filled, for two reasons. (1) There may be no genome x x that maps to a particular cell in the feature space. For example, it may be impossible to have a robot of a certain height and weight due to physical laws. (2) The search algorithm may fail to produce a genome that maps to a cell in the feature space, even if such a genome exists. There are many genotypes that can be mapped to the same cell in the feature space, perhaps an infinite number. For example, there are many robot blueprints that produce a robot with the same height, weight, and energy consumption. For that reason, and because it is not known a priori which genomes will map to which cells, it is not possible to search directly in the feature space. Recall that there is, even with direct encodings, and especially with indirect encodings, a complex mapping from genome x x to the feature vector 𝐛 𝐱 \mathbf{b_{x}} . If it is possible in a given problem to directly take steps in the feature space, then MAP-Elites is unnecessary because one could simply perform exhaustive search in the feature space. One can think of MAP-Elites as a way of trying to perform such an exhaustive search in the feature space, but with the additional challenge of trying to find the highest-performing solution for each cell in that feature space.

<sub>§3 Details of the MAP-Elites algorithm</sub>

### 3. Differences between MAP-Elites and previous, related algorithms

In 2011, Lehman and Stanley [ 22 ] note that combining a selective pressure for feature diversity with one performance objective that all of the different types of phenotypes compete on is akin to having butterflies and bacteria compete with bears and badgers on one performance criterion (e.g. speed). Doing so is unhelpful for producing the fastest of each type of creature, given the different speed scales these creatures exhibit. Instead, Lehman and Stanley propose encouraging diversity in the feature space, but having each organism compete on performance only with other organisms that are near it in the feature space, an algorithm they call Novelty Search + Local Competition (NS+LC) [ 22 ] . NS+LC accomplishes these goals via a multi-objective algorithm with two objectives: (1) maximizing an organism’s performance relative to its closest 15 neighbors (i.e. local competition, but note that these relative scores are then entered into a global competition, the implications of which are discussed below), and (2) maximizing a novelty objective, which rewards organisms the further they are in feature space from their 15 closest neighbors. Whereas normally evolutionary algorithms do not produce much diversity within one run, but instead have to perform multiple, independent runs to showcase diversity [ 8 ] , NS+LC produces a substantial amount of different types of high performing creatures within one evolving population [ 22 ] . NS+LC inspired us to create two algorithms that also seek to find the highest performing solution at each point in a feature space. The first was the Multi-Objective Landscape Exploration (MOLE) algorithm [ 32 ] and the second is MAP-Elites, the algorithm presented in this paper. MOLE has two objectives: the first is performance, and the second for each organism to be as far from other organisms as possible, where distance is measured in a feature space that a user specifies. Both NS+LC and MOLE have similar goals to MAP-Elites: they search for the highest-performing solution at each point in a feature space. However, both are more complicated and, as will be shown in the results section, do not perform as well as MAP-Elites empirically. Specific differences between MAP-Elites and NS+LC include: Novelty Search needs to compute the feature distance to every other organism each generation; such nearest neighbor calculations are O ⁡ ( n ​ log ⁡ ( n ) ) O(n\operatorname{log}(n)) [ 43 ] each generation. MAP-Elites only needs to look up the current occupant of the cell, which is O ⁡ ( 1 ) O(1) . Novelty Search contains both a current population and an archive of previous solutions that serves as a memory of which points in the feature space have been visited. Maintaining both a population and an archive requires many additional parameters that have to be chosen carefully or performance can be detrimentally affected [ 29 ] . Given that Novelty Search rewards individuals that are distant from each other in the feature space, having only a population would lead to “cycling”, a phenomenon where the population moves from one area of the feature space to a new area and back again, without any memory of where it has already explored. The archive in NS+LC limits, but does not eliminate, this phenomenon. MAP-Elites does away with the archive vs. population distinction by having only an archive. It thus avoids cycling and is always simultaneously focused on expanding into new niches (until there are none left) and improving the performance of existing niches. It is thus quite easy to intuit what the selection pressure for MAP-Elites is over time. In contrast, the selection pressures for Novelty Search are more dynamic and thus harder to understand, even for Novelty Search variants that have only an archive and no population [ 29 ] . For example, it is hard to predict how much search will be focused in each area of the feature space, because a relatively sparse area during one era of the search can become relatively crowded later on, and vice versa. The dynamics of NS+LC are even more dynamic, complex, and unpredictable. One thing to keep in mind is that, while the performance of solutions in NS+LC is only judged versus neighbors, these relative performance scores are then competed globally within the (relative) performance objective. Overall, therefore, NS+LC biases search towards under-explored areas of the feature space (taking into account the archive and the population), areas of the search space with the highest relative performance, and tradeoffs between these two objectives. An organism in an area that is better than its neighbors, but where this gap is not as large as elsewhere, will not be explored as often unless or until that larger performance gap elsewhere is reduced. The focus of the (relative) performance objective is thus complex and ever-changing. The diversity objective is also complex and dynamic, because NS+LC does not only store one solution per cell. Many solutions can pile up in one area of the space, creating a pressure to explore under-explored areas until those areas are more explored relative to the initial area, creating a pressure to return to the initial area, and so on. For both objectives, thus, it is hard to intuit both the dynamics themselves and what effects these dynamics have on search. MAP-Elites, in contrast, produces offspring by uniformly sampling from the existing archive, such that the only thing that changes over time is the number of cells that are filled and their performance. MAP-Elites thus embodies the main principle of illumination algorithms, which is to search for the highest-performing solution at each point of the feature space, in a more simple, intuitive, and predictable way. In the default version of MAP-Elites, organisms only compete with the organism (the current occupant) in their cell, so the range of features they compete with is fixed. In Novelty Search and NS+LC, organisms compete with their nearest neighbors in the feature space. Especially at the beginning of the run before the archive fills up, that might mean that organisms are competing with others that have very different features, which is contrary to the spirit of local competition in the feature space. Specific differences between MAP-Elites and MOLE include: MOLE features one global performance competition (via the performance objective). Thus, a few high-performing individuals will dominate this objective, making it hard to recognize and keep a slightly better performing solution in a low- or medium-performing region of the space. MAP-Elites is better at recognizing and keeping any improvement to fitness in any region of the space, no matter how the performance of that cell compares to other cells. As an example of when MOLE might fail to reward an important innovation, imagine a new solution in a medium-performing, densely packed region of the space, that is higher-performing than anything previously found in that cell. This new solution, which represents the best performance yet found in that cell, would not be selected for because it is neither high-performing versus other organisms in the population, nor would it be kept because it is diverse. Thus, the organism does not perform well in either of the MOLE objectives, yet it is precisely what we truly want: the highest performing individual found so far in that area of the feature space. Like Novelty Search, the diversity objective in MOLE has unstable temporal dynamics. The population may rush to a relatively unexplored area, fill it up, then rush off to a new relatively unexplored area, and then rush back to the original area. It does not evenly search for improvements to all areas of the map simultaneously.

<sub>§4 Differences between MAP-Elites and previous, related algorithms</sub>

## 总结与展望
MAP-Elites 在这份语料里是「归档」这个词的源头：它不保存历史，而是保留一个按行为描述符切分的格子，每格只留最好的那个。对我们最有用的一句不是 diversity 有用，而是「没有描述符就没有格子，没有格子就看不出多样性在塌」。

**It connects to**

- `2506.13131` — AlphaEvolve 的进化数据库是同一个格子的工程化版本：目的就是让被丢掉的旧想法能重新浮上来。
- `2510.22954` — 没有描述符时，多样性坍塌只能从输出文本相似度反推，那篇做的就是这件事。

## 不足之处
**The authors say:** This paper introduces the term “illumination algorithms” for the class of algorithms that try to find the highest-performing solution at each point in a user-defined feature space. It also introduces a new illumination algorithm called MAP-Elites, which is simpler to implement and understand than previous illumination algorithms, namely Novelty Search + Local Competition [ 22 ] and MOLE [ 32 ] . Finally, the paper presents preliminary evidence showing that MAP-Elites tends to perform significantly better than control algorithms, either illumination algorithms or optimization algorithms, on three different problem domains. Because of the preliminary nature of the experimental data, we do not wish for readers at this point to conclude anything for certain yet about MAP-Elites’ empirical performance, but in many cases the data suggest that MAP-Elites is a promising new illumination algorithm that outperforms previous ones.

**What a reader should still not conclude**

- 描述符在这里是手工设计的行为特征（机器人步态、竞赛分数），论文没有给出「该选什么描述符」的规则；我们换成链的结构差（候选数/成本档）就是一次不可比的移植。
- 格子数固定、每格只留一个，意味着它记录的是「当前最优的多样性」而不是「曾经出现过什么」；我们想保留旧版本供重采样，这个机制不直接给。

<sub>§7 Discussion and Conclusion</sub>

---

# AlphaEvolve : A coding agent for scientific and algorithmic discovery

arXiv:2506.13131 · 2025 · [source](https://arxiv.org/html/2506.13131)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Discovering new high-value knowledge, such as making a novel scientific discovery or developing a commercially valuable algorithm, generally requires a prolonged process of ideation, exploration, backtracking on unpromising hypotheses, experimentation, and validation. There has been much recent interest in using large language models (LLMs) to automate significant parts of this process. Hopes of success here are driven by the breathtaking power of recent LLMs [ 32 , 76 ] , which can enhance their capabilities using test-time compute, and the rise of agents that combine language generation and action [ 114 , 88 ] . These advances have improved performance across a range of established benchmarks and accelerated discovery-oriented tasks like hypothesis generation [ 34 ] and experiment design [ 43 , 7 ] . However, getting LLM pipelines all the way to making entirely new scientific or practical discoveries remains challenging.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 AlphaEvolve"]
  N1["§2.1 Task specification"]
  N2["§API."]
  N3["§Flexibility in choosing the abstraction."]
  N4["§2.2 Prompt sampling"]
  N5["§2.3 Creative generation"]
  N6["§Output format."]
  N7["§Models used."]
  N8["§Multiple scores."]
  N9["§2.5 Evolution"]
  N10["§2.6 Distributed pipeline"]
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

![AlphaEvolve high-level overview.](https://arxiv.org/html/2506.13131v1/method_high_level.svg)

*AlphaEvolve high-level overview.*

<sub>figure: `2506.13131v1/method_high_level.svg`</sub>

## 机制
### 1. AlphaEvolve

AlphaEvolve is a coding agent that orchestrates an autonomous pipeline of computations including queries to LLMs, and produces algorithms that address a user-specified task. At a high level, the orchestrating procedure is an evolutionary algorithm that gradually develops programs that improve the score on the automated evaluation metrics associated with the task. A high-level overview of AlphaEvolve is shown in Figure 1 , and Figure 2 gives an expanded view. Explicit context : details about the problem being solved, such as fixed human-written instructions, equations, code snippets, or relevant literature (e.g., pdf files). Stochastic formatting : template placeholders with human-provided alternatives for increased diversity, instantiated using probability distributions provided in a separate config file. Rendered evaluation results : usually this will include a program, the result of executing that program, and the scores assigned by the evaluate function. Meta prompt evolution : instructions and context suggested by the LLM itself in an additional prompt-generation step, co-evolved in a separate database analogous to the solution programs. Evaluation cascade (hypothesis testing) : the user can specify ensembles of test cases of increasing difficulty, such that new solutions are evaluated on the next stage only if they achieve sufficiently promising results in all earlier stages. This helps to prune out less promising solutions more quickly. Moreover, new solutions are initially evaluated on a small scale before being subjected to the main test cases, to filter out faulty programs early. LLM-generated feedback : in some applications, desirable solutions have certain characteristics that are difficult to capture precisely in the user-provided evaluation function h h ; for example, simplicity of the discovered program. These properties can be graded using separate LLM calls and added to the dictionary of scores to steer evolution, or they can be used to discard solutions when a criterion is not fulfilled. Parallelized evaluation : the sample efficiency of AlphaEvolve makes it feasible to spend on the order of 100 compute-hours to evaluate any new solution. However, unless individual evaluations are parallelized to reduce their wall-clock duration, this can slow down the rate at which new generations appear, limiting the ability of the evolutionary algorithm to apply several consecutive mutations. In many applications, evaluation is embarrassingly parallel (for example, running a search algorithm from multiple randomized initializations), allowing AlphaEvolve to distribute this work through asynchronous calls to an evaluation cluster.

<sub>§2 AlphaEvolve</sub>

### 2. API.

To support evolving multiple components across a codebase, AlphaEvolve exposes an input API where blocks of code can be annotated as to-be-evolved-by-the-system; see Figure 3(a) for an illustration. This design facilitates integrating it with existing codebases while requiring only minimal changes, simply by adding special markers ( # EVOLVE-BLOCK-START and # EVOLVE-BLOCK-END ) as comments into the code. Any user-provided code inside such evolution blocks serves as the initial solution to be improved by AlphaEvolve , and the rest of the code forms a skeleton that ties the evolved pieces together, so that they can be invoked from evaluate . While this initial implementation must be complete, it can be rudimentary—for instance, consisting of single-line functions that return constants of the appropriate types.

<sub>§API.</sub>

### 3. Flexibility in choosing the abstraction.

AlphaEvolve can be applied to the same problem in very different ways—especially when the evolved programs are not the final output but a means to discover solutions. For example, AlphaEvolve can evolve the solution in raw string representation (as in classical evolutionary algorithms); evolve a function of a definite form that specifies how to construct the solution from scratch (the approach taken in [ 83 ] ); evolve a bespoke search algorithm to find the solution within some fixed compute budget; or even co-evolve intermediate solutions and search algorithms together, such that each search algorithm is specifically tailored to further improve upon a particular intermediate solution. We find that different levels of abstraction work better for different problems. For example, we hypothesize that for problems with highly symmetric solutions it is advantageous to evolve constructor functions as these tend to be more concise [ 83 ] , whereas for problems with non-symmetric solutions it works better to evolve customized search algorithms.

<sub>§Flexibility in choosing the abstraction.</sub>

### 4. Prompt sampling

As AlphaEvolve leverages SOTA LLMs, it supports various types of customization and providing long contexts as part of the primary evolution prompt. This prompt comprises multiple previously discovered solutions sampled from the program database, as well as system instructions on how to propose changes to a particular solution. Beyond these key ingredients, users can further tailor prompts to their specific needs in different ways, such as the following.

<sub>§2.2 Prompt sampling</sub>

### 5. Creative generation

To drive the evolutionary procedure, AlphaEvolve leverages the capabilities of SOTA LLMs, whose principal role is to digest information about previously developed solutions and propose new, diverse ways to improve the solutions. Although AlphaEvolve is model-agnostic, in ablations we observe that AlphaEvolve performs increasingly better as the underlying LLM improves (see Section 4 ).

<sub>§2.3 Creative generation</sub>

### 6. Output format.

When AlphaEvolve asks an LLM to modify existing code, especially within larger codebases, it requests the changes to be provided as a sequence of diff blocks in a specific format: Here, the code between <<<<<<< SEARCH and ======= is the exact segment to match in the current program version. The code between ======= and >>>>>>> REPLACE is the new segment that will replace the original one. This allows for targeted updates to specific parts of the code. In cases where the code being evolved is very short, or when a complete rewrite is more appropriate than a small modification, AlphaEvolve can be configured to instruct the LLM to output the entire code block directly, rather than using the diff format.

<sub>§Output format.</sub>

### 7. Models used.

AlphaEvolve employs an ensemble of large language models. Specifically, we utilize a combination of Gemini 2.0 Flash and Gemini 2.0 Pro. This ensemble approach allows us to balance computational throughput with the quality of generated solutions. Gemini 2.0 Flash, with its lower latency, enables a higher rate of candidate generation, increasing the number of ideas explored per unit of time. Concurrently, Gemini 2.0 Pro, possessing greater capabilities, provides occasional, higher-quality suggestions that can significantly advance the evolutionary search and potentially lead to breakthroughs. This strategic mix optimizes the overall discovery process by maximizing the volume of evaluated ideas while retaining the potential for substantial improvements driven by the more powerful model.

<sub>§Models used.</sub>

### 8. Multiple scores.

AlphaEvolve allows for optimizing multiple user-provided scores, i.e., evolving objects that achieve a high score under one or multiple evaluation metrics. This has both an intrinsic and instrumental value. While in multiple applications we genuinely care about developing solutions for multiple evaluation metrics (or one solution that is strong on all of them simultaneously), we find that even if one metric is of particular interest, optimizing for multiple metrics often improves results for the single target metric. Perhaps this occurs because programs excelling under different evaluation criteria often possess distinct structures or logic and, by incorporating examples of these diverse, high-performing programs—each representing a different definition of “good”—into the prompts provided to the language model, we can stimulate the generation of more varied candidate solutions, increasing the chances of discovering novel approaches that are highly effective for the target metric.

<sub>§Multiple scores.</sub>

### 9. Evolution

During its evolutionary procedure, AlphaEvolve continually generates a growing number of solutions with evaluation results (scores and program outputs) attached to them. These solutions are stored in an evolutionary database, the primary goal of which is to optimally resurface previously explored ideas in future generations. A key challenge in designing such databases is balancing exploration and exploitation, to continuously improve the best programs while maintaining diversity to encourage exploration of the entire search space. In AlphaEvolve , the evolutionary database implements an algorithm that is inspired by a combination of the MAP elites algorithm [ 74 ] and island-based population models [ 97 , 83 ] .

<sub>§2.5 Evolution</sub>

### 10. Distributed pipeline

AlphaEvolve is implemented as an asynchronous computational pipeline (using the asyncio Python library) in which many computations are run concurrently, with each computation blocking (waiting) whenever its next step relies on the result of another, yet unfinished computation. More specifically, the asynchronous pipeline comprises a controller, LLM samplers, and evaluation nodes. The entire pipeline is optimized for throughput (rather than the speed of any one particular computation), in order to maximize the number of ideas that can be proposed and evaluated within a specific overall computation budget.

<sub>§2.6 Distributed pipeline</sub>

## 总结与展望
AlphaEvolve 把「生成候选、评估、写回数据库」做成一个长期运行的循环，并对数据库本身做了明确要求：它要能重新浮现以前探索过的想法，从而在后期仍能受益于早期的多样性。这是本方向唯一一篇把「归档的目的」写成可检验性质的工作。

**It connects to**

- `1504.04909` — 格子的形式来自 MAP-Elites，这里补的是「为什么要留着旧格子」。
- `2505.22954` — DGM 的 archive 是同一机制的另一种实现，但它同时改了被评估的代码，风险面不同。

## 不足之处
**The authors say:** AlphaEvolve demonstrates the surprising power of combining state-of-the-art LLMs with automated evaluation metrics within an evolutionary framework, which can lead to new discoveries on decades-old mathematical problems as well as practical improvements to highly optimized compute stacks.

**What a reader should still not conclude**

- 它的成功案例是数学与算法发现，评估器可以精确定义（程序跑出对的结果）；我们的评估器是 LLM 子代理，误差量级不同。
- 论文报告的是最终最好结果，没有报告「数据库检索命中率」这类中间统计，无法判断到底是归档还是采样预算起了作用。

<sub>§6 Discussion</sub>

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

### 9. General RL

The General RL stage aims to broadly enhance the models’ capabilities and stability across diverse scenarios. To facilitate this, we have established a sophisticated reward system covering over 20 distinct tasks , each with customized scoring criteria. These tasks specifically target enhancements in the following core capabilities: To provide feedback for the aforementioned tasks, we utilized three distinct types of rewards:

<sub>§4.4 General RL</sub>

### 10. Strong-to-Weak Distillation

The Strong-to-Weak Distillation pipeline is specifically designed to optimize lightweight models, encompassing 5 dense models (Qwen3-0.6B, 1.7B, 4B, 8B, and 14B) and one MoE model (Qwen3-30B-A3B). This approach enhances model performance while effectively imparting robust mode-switching capabilities. The distillation process is divided into two primary phases:

<sub>§4.5 Strong-to-Weak Distillation</sub>

### 11. Qwen3-235B-A22B

For our flagship model Qwen3-235B-A22B, we compare it with the leading reasoning and non-reasoning models. For the thinking mode, we take OpenAI-o1 ( OpenAI, 2024 ) , DeepSeek-R1 ( Guo et al., 2025 ) , Grok-3-Beta (Think) ( xAI, 2025 ) , and Gemini2.5-Pro ( DeepMind, 2025 ) as the reasoning baselines. For the non-thinking mode, we take GPT-4o-2024-11-20 ( OpenAI, 2024 ) , DeepSeek-V3 ( Liu et al., 2024a ) , Qwen2.5-72B-Instruct ( Yang et al., 2024b ) , and LLaMA-4-Maverick ( Meta-AI, 2025 ) as the non-reasoning baselines. We present the evaluation results in Table 11 and 12 .

<sub>§Qwen3-235B-A22B</sub>

### 12. Qwen3-32B

For our flagship dense model, Qwen3-32B, we take DeepSeek-R1-Distill-Llama-70B, OpenAI-o3-mini (medium), and our previous strongest reasoning model, QwQ-32B ( Qwen Team, 2025 ) , as the baselines in the thinking mode. We also take GPT-4o-mini-2024-07-18, LLaMA-4-Scout, and our previous flagship model, Qwen2.5-72B-Instruct, as the baselines in the non-thinking mode. We present the evaluation results in Table 13 and 14 .

<sub>§Qwen3-32B</sub>

### 13. Qwen3-30B-A3B & Qwen3-14B

For Qwen3-30B-A3B and Qwen3-14B, we compare them with DeepSeek-R1-Distill-Qwen-32B and QwQ-32B in the thinking mode, and Phi-4 ( Abdin et al., 2024 ) , Gemma-3-27B-IT ( Team et al., 2025 ) , and Qwen2.5-32B-Instruct in the non-thinking mode, respectively. We present the evaluation results in Table 15 and 16 .

<sub>§Qwen3-30B-A3B & Qwen3-14B</sub>

### 14. Qwen3-8B / 4B / 1.7B / 0.6B

For Qwen3-8B and Qwen3-4B, we compare them with DeepSeek-R1-Distill-Qwen-14B and DeepSeek-R1-Distill-Qwen-32B in the thinking mode, and LLaMA-3.1-8B-Instruct ( Dubey et al., 2024 ) , Gemma-3-12B-IT ( Team et al., 2025 ) , Qwen2.5-7B-Instruct, and Qwen2.5-14B-Instruct in the non-thinking mode, respectively. For Qwen3-1.7B and Qwen3-0.6B, we compare them with DeepSeek-R1-Distill-Qwen-1.5B and DeepSeek-R1-Distill-Llama-8B in the thinking mode, and Gemma-3-1B-IT, Phi-4-mini, Qwen2.5-1.5B-Instruct, and Qwen2.5-3B-Instruct in the non-thinking mode, respectively. We present the evaluation results of Qwen3-8B and Qwen3-4B in Table 17 and 18 and those of Qwen3-1.7B and Qwen3-0.6B in Table 19 and 20 , respectively. Overall, these edge-side models exhibit impressive performance and outperform baselines even with more parameters, including our previous Qwen2.5 models, in either the thinking or the non-thinking mode. These results, once again, demonstrate the efficacy of our Strong-to-Weak Distillation approach, making it possible for us to build the lightweight Qwen3 models with remarkably reduced costs and efforts.

<sub>§Qwen3-8B / 4B / 1.7B / 0.6B</sub>

### 15. The Effectiveness of Thinking Budget

To verify that Qwen3 can enhance its intelligence level by leveraging an increased thinking budget, we adjust the allocated thinking budget on four benchmarks across Mathematics, Coding, and STEM domains. The resulting scaling curves are presented in Figure 2 , Qwen3 demonstrates scalable and smooth performance improvements correlated to the allocated thinking budget. Moreover, we observe that if we further extend the output length beyond 32K, the model’s performance is expected to improve further in the future. We leave this exploration as future work.

<sub>§The Effectiveness of Thinking Budget</sub>

### 16. The Effectiveness and Efficiency of On-Policy Distillation

We evaluate the effectiveness and efficiency of on-policy distillation by comparing the performance and computational cost—measured in GPU hours—after undergoing distillation versus direct reinforcement learning, both starting from the same off-policy distilled 8B checkpoint. For simplicity, we focus solely on math and code-related queries in this comparison. The results, summarized in Table 21 , show that distillation achieves significantly better performance than reinforcement learning while requiring approximately only 1 / 10 1/10 of the GPU hours. Furthermore, distillation from teacher logits enables the student model to expand its exploration space and enhance its reasoning potential, as evidenced by the improved pass@64 scores on the AIME’24 and AIME’25 benchmarks after distillation, compared to the initial checkpoint. In contrast, reinforcement learning does not lead to any improvement in pass@64 scores. These observations highlight the advantages of leveraging a stronger teacher model in guiding student model learning.

<sub>§The Effectiveness and Efficiency of On-Policy Distillation</sub>

### 17. The Effects of Thinking Mode Fusion and General RL

To evaluate the effectiveness of Thinking Mode Fusion and General Reinforcement Learning (RL) during the post-training, we conduct evaluations on various stages of the Qwen-32B model. In addition to the datasets mentioned earlier, we introduce several in-house benchmarks to monitor other capabilities. These benchmarks include: The results are shown in Table 22 , where we can draw the following conclusions:

<sub>§The Effects of Thinking Mode Fusion and General RL</sub>

## 总结与展望
Qwen3 在这个方向上的身份是「谁有权改行为」这个问题的一个答案：同一个权重提供 thinking 与 non-thinking 两种模式，由调用方选，不由模型自己学。这和我们的链参数（候选数、最小增益）是同一种设计——参数由操作者定、循环只在自己的动作空间里改。它提醒我们：自我修改的范围是被设计出来的，把「循环能改什么」当成天然后果是错的。

**It connects to**

- `2309.16797` — Promptbreeder 让「生成变化的机制」本身也可变，正好是 Qwen3 的对面：一个把范围钉死，一个把范围放开。
- `2509.19349` — ShinkaEvolve 在「采样哪个模型、什么温度」这一层做选择，也是一种把模型当可调参数的自我修改。

## 不足之处
**What a reader should still not conclude**

- 思考模式是推理期开关，不是对 harness 或训练流程的修改；把它当「自我修改」是类比不是同类。
- 机制段抽到的是架构与后训练导语，两种模式如何被训练出来（以及代价）不在摘录里。

---

# Multi-Objective Quality Diversity Optimization

arXiv:2202.03057 · 2022 · [source](https://arxiv.org/html/2202.03057)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Quality-Diversity (QD) Optimization algorithms ( Cully and Demiris, 2017 ; Chatzilygeroudis et al., 2021 ) have changed the classical paradigm of optimization: inspired by natural evolution, the essence of QD methods is to provide a large and diverse set of high-performing solutions rather than only the best one. This core idea is crucial to many applications, from robotics where it allows robots to adapt to unexpected scenarios ( Cully et al., 2015 ) to game design ( Khalifa et al., 2018 ) or investment strategies ( Zhang et al., 2020 ) . This becomes particularly interesting when the optimization process is done using a surrogate model instead of the real one as the highest performing solution according to the simulation might not transfer well in reality.

<sub>§1. Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2. Problem Formulation"]
  N1["§2.1. Quality-Diversity Optimization"]
  N2["§2.2. Multi-Objective Optimization"]
  N3["§2.3. Multi-Objective Quality Diversity Optimization"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![On the left panel, high-level concepts of mome . We extend the qd objective to the multi-objective optimization setting, where maximizing the fitness is replaced by maximizing a Pareto front hyper-volume in each niche of the descriptor space. To do so, mome evolves a local Pareto front in each cell. On the right panel, an example of the descriptor space coverage and objective space coverage obtained with mome on the Rastrigin_proj task. mome finds a collection of performing Pareto fronts, spanning the descriptor space, that can also be combined to obtain a single highly performing global Pareto front. Interestingly, we find that several cells contribute to it showing the benefits of covering a descriptor space for multi-objective optimization.](https://arxiv.org/html/2202.03057v2/images/mome_main.png)

*On the left panel, high-level concepts of mome . We extend the qd objective to the multi-objective optimization setting, where maximizing the fitness is replaced by maximizing a Pareto front hyper-volume in each niche of the descriptor space. To do so, mome evolves a local Pareto front in each cell. On the right panel, an example of the descriptor space coverage and objective space coverage obtained with mome on the Rastrigin_proj task. mome finds a collection of performing Pareto fronts, spanning the descriptor space, that can also be combined to obtain a single highly performing global Pareto front. Interestingly, we find that several cells contribute to it showing the benefits of covering a descriptor space for multi-objective optimization.*

<sub>figure: `2202.03057v2/images/mome_main.png`</sub>

## 机制
### 1. Quality-Diversity Optimization

We now introduce our framework for Multi-Objective Quality Diversity ( moqd ), adapted from a recent work ( Fontaine and Nikolaidis, 2021 ) . The Quality Diversity ( qd ) problem assumes a single objective function 𝒳 → ℝ \mathcal{X}\rightarrow\mathbb{R} , where 𝒳 \mathcal{X} is called search space, and d d descriptors c i : 𝒳 → ℝ c_{i}:\mathcal{X}\rightarrow\mathbb{R} , or as a single descriptor function 𝐜 : 𝒳 → ℝ d \mathbf{c}:\mathcal{X}\rightarrow\mathbb{R}^{d} . We note S = 𝐜 ⁡ ( 𝒳 ) S=\mathbf{c}(\mathcal{X}) the descriptor space formed by the range of 𝐜 \mathbf{c} . qd algorithms of the family of the map-elites algorithm, discretize the descriptor space S S via a tessellation method. Let 𝒯 \mathcal{T} be the tessellation of S S into d d cells S i S_{i} . The goal of qd methods is to find a set of solutions 𝐱 i ∈ 𝒳 \mathbf{x}_{i}\in\mathcal{X} so that each solution 𝐱 i \mathbf{x}_{i} occupies a different cell S i S_{i} in 𝒯 \mathcal{T} and maximizes the objective function within that cell. The qd objective can thus be formalized as follows:

<sub>§2.1. Quality-Diversity Optimization</sub>

### 2. Multi-Objective Optimization

We consider an optimization problem over the search space 𝒳 \mathcal{X} with k k associated objective functions f i : 𝒳 → ℝ f_{i}:\mathcal{X}\rightarrow\mathbb{R} , or as a single function 𝐟 : 𝒳 → ℝ k \mathbf{f}:\mathcal{X}\rightarrow\mathbb{R}^{k} . In multi-objective optimization, the goal is to find a solution 𝐱 ∈ 𝒳 \mathbf{x}\in\mathcal{X} that maximizes at once the different objectives. The multi-objective problem can be formalized as In most problems, there does not exist any solution that concurrently maximizes every objective. In fact, objectives are often antagonist which implies that maximizing one objective alone can result in minimizing the others. Comparing solutions in a multi-objective setting is challenging too. In the mono-objective map-elites algorithm, solutions are replaced in their cell if another solution with higher value for the single objective is found. To compare solutions in the multi-objective setting, we rely on the notion of Pareto domination. Given two solution candidates 𝐱 1 , 𝐱 2 ∈ 𝒳 \mathbf{x}_{1},\mathbf{x}_{2}\in\mathcal{X} , 𝐱 1 \mathbf{x}_{1} Pareto dominates 𝐱 2 \mathbf{x}_{2} , noted x 1 ≻ x 2 x_{1}\succ x_{2} , if ∀ 1 ≤ i ≤ k , f i ​ ( 𝐱 1 ) > f i ​ ( 𝐱 2 ) \forall 1\leq i\leq k,f_{i}(\mathbf{x}_{1})>f_{i}(\mathbf{x}_{2}) . Given a set of candidate solutions 𝒮 ∈ 𝒳 \mathcal{S}\in\mathcal{X} , we define the Pareto front over this set, 𝒫 ⁡ ( 𝒮 ) \mathcal{P}(\mathcal{S}) , as the subset of solutions in 𝒮 \mathcal{S} that are not Pareto dominated by any other solution in 𝒮 \mathcal{S} . In other words, the Pareto front over a set of solutions corresponds to all the best possible trade-offs with respect to the set of objectives, there is no solution in the Pareto front that is better that the others in the front on all the objectives at the same time. Canonical multi-objective optimization algorithms aim to find the Pareto front of solutions over the search space 𝒳 \mathcal{X} that we call Optimal Pareto front. In the mono-objective optimization setting, optimization methods can be compared in terms of the best value found for the objective function. In the multi-objective setting, the optimization methods we consider return a Pareto front of solutions. Thus, to compare them we need metrics to compare Pareto fronts. One simple and robust way to compare two Pareto fronts is to compare their hyper-volumes ( Cao et al., 2015 ) . The hyper-volume Ξ \Xi of a Pareto front 𝒫 \mathcal{P} requires the definition by the user of a reference point 𝐫 ∈ ℝ K \mathbf{r}\in\mathbb{R}^{K} . It is defined as the Lebesgue measure of the set of points dominated by 𝒫 \mathcal{P} ( Zitzler and Thiele, 1999 ) : As described in Figure 2 , in the case of two objectives, this metric simply corresponds to the area between the curve and the reference point. When comparing Pareto fronts for a given optimization problem, the reference point is fixed in advance and remains unchanged for all hyper-volumes computations. The hypervolume indicator induces an order on Pareto Fronts which is monotonic and invariant to scale ( Knowles, 2002 ; Zitzler, 1999 ) , the main drawbacks being its dependence on the definition of the reference point and its computation cost in high dimension ( Brockhoff, 2010 ) .

<sub>§2.2. Multi-Objective Optimization</sub>

### 3. Multi-Objective Quality Diversity Optimization

In this work, we introduce the Multi-Objective Quality Diversity ( moqd ) problem that assumes k k objective functions f i : 𝒳 → ℝ f_{i}:\mathcal{X}\rightarrow\mathbb{R} , or as a single function 𝐟 : 𝒳 → ℝ k \mathbf{f}:\mathcal{X}\rightarrow\mathbb{R}^{k} and d d descriptors c i : 𝒳 → ℝ c_{i}:\mathcal{X}\rightarrow\mathbb{R} , or as a single descriptors function 𝐜 : 𝒳 → ℝ d \mathbf{c}:\mathcal{X}\rightarrow\mathbb{R}^{d} . As in the qd framework, we assume that the descriptor space S S is discretized via a tessellation method into d d cells S i S_{i} . In the mono-objective framework, a commonly accepted metric is the qd -score, defined as the sum of the fitnesses of the solution in each cell. The goal of moqd methods is to find in each cell, a Pareto front of solutions 𝒫 ⁡ ( S i ) \mathcal{P}(S_{i}) that maximizes its hyper-volume. In other word, for each niche of the descriptor space we seek for all the best possible trade-offs regarding the objective functions 𝐟 \mathbf{f} . Following the qd -score ( Pugh et al., 2015 ) , moqd objective can be formalized as follow: In the next sections, we will refer to this objective as the moqd score. While our goal is to build methods that maximize the moqd score, i.e. methods that find d d high-performing Pareto fronts, we may also, for comparison purpose, study the Pareto front over all the solutions found by the algorithm regardless of their descriptor which we refer to as the global Pareto front. In practice, we found that in many cases the global Pareto front does not correspond exactly to the Pareto front of one of the tessellation cells but is rather constituted by solutions coming from several niches. Thus, the global Pareto front may have an hyper-volume larger than the largest hyper-volume over the cells Pareto fronts.

<sub>§2.3. Multi-Objective Quality Diversity Optimization</sub>

## 总结与展望
MOME 把质量多样性（QD）问题上移成多目标版本：k 个目标函数加 d 个描述符，mome 在描述符空间的每个格子里维护一个 Pareto 前沿。它对我们的意义是把描述符从「副产物」变成「一等公民」——我们的 descriptor 是一个字符串键（s/w/c 三档），既没有多目标也没有前沿，于是「多样性」在我们这里只能是「版本号不同」。

**It connects to**

- `1504.04909` — MAP-Elites 是单目标 QD 的原型，这篇是它的多目标化；我们的 descriptor 直接借自前者而没借后者的前沿概念。
- `2402.04249` — 一个用描述符保多样性，一个用统一评测框架保可比性；自我修改系统两个都需要，我们一个都没有。

## 不足之处
**The authors say:** The main results are displayed on Figure 4 and Figure 5 . The main conclusion of the experiments is that mome is indeed able to outperform traditional approaches for a multi-objective quality diversity purpose. We use a Wilcoxon signed-rank test ( Wilcoxon, 1992 ) to compare the distribution of the scores obtained over different seeds where the null hypothesis is that the obtained scores have the same median. It shows that mome constantly outperforms other approaches in the MOQD score with p-values lower than 0.003 0.003 in every experiment. This confirms that mome is better at finding diverse and high-performing solutions (in the sense of Pareto efficiency) than traditional approaches. It can clearly be seen on Figure 5 where one can see that nsga-ii and spea2 find high performing niche and keep improving only those niches while mome keeps improving good quality solutions spanning the descriptor space.

**What a reader should still not conclude**

- 多目标 QD 的代价是每个格子都要维护前沿，样本效率在新问题上明显更低。
- 机制段抽到的是问题定义三小节，mome 算法与实验只在末尾被提了一句。

<sub>§6.2. Results and Discussion</sub>

---

# Promptbreeder: Self-Referential Self-Improvement via Prompt Evolution

arXiv:2309.16797 · 2024 · [source](https://arxiv.org/html/2309.16797)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Prompting is central to the downstream performance of foundation models. For example, different prompt strategies 1 1 1 See Appendix A for definitions of terminology. can have a significant impact on a model’s reasoning abilities ( Wei et al., 2022 ; Nye et al., 2021 ; Zhou et al., 2022 ; Wang et al., 2022 ; Zhou et al., 2023 ; Wang et al., 2023b ) , multi-modal processing abilities ( Yang et al., 2023b ; Wang et al., 2023d ) , or tool use abilities ( Yao et al., 2022 ; Schick et al., 2023 ) . Furthermore, prompting can improve model distillation ( Wang et al., 2023c ; Hsieh et al., 2023 ) and it can be used to simulate agentic behavior ( Wang et al., 2023a ; Park et al., 2023 ; Wu et al., 2023 ) . However, these prompt strategies are manually engineered. Since the specific way a prompt is phrased can have a dramatic effect on its utility ( Madaan & Yazdanbakhsh, 2022 ) , it raises the question of whether prompt engineering can be automated. Automatic Prompt Engineer ( Zhou et al., 2023 , APE,) attempts to address this by generating an initial distribution of prompts using another prompt that infers the problem from a number of input-output examples from the dataset. However, Zhou et al. found “diminishing returns to further selection rounds as the quality seems to stabilize after three rounds”, and consequently abandoned the use of an iterative APE. We propose a solution to the problem of diminishing returns via a diversity maintaining evolutionary algorithm for self-referential self-improvement of prompts for LLMs.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Promptbreeder"]
  N1["§3.1 Promptbreeder Initialization"]
  N2["§3.2 Mutation Operators"]
  N3["§3.2.1 Direct Mutation"]
  N4["§3.2.2 Estimation of Distribution Mutation"]
  N5["§3.2.3 Hypermutation: Mutation of Mutation-Prompts"]
  N6["§3.2.4 Lamarckian Mutation"]
  N7["§3.2.5 Prompt Crossover and Context Shuffling"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
```

![Overview of Promptbreeder. Given a problem description and an initial set of general “thinking-styles” and mutation-prompts, Promptbreeder generates a population of units of evolution, each unit consisting of typically two task-prompts and a mutation-prompt. We then run a standard binary tournament genetic algorithm ( Harvey, 2011 ) . To determine the fitness of a task-prompt we evaluate its performance on a random batch of training data. Over multiple generations, Promptbreeder subsequently mutates task-prompts as well as mutation-prompts using five different classes of mutation operators. The former leads to increasingly domain-adaptive task-prompts whereas the latter evolves increasingly useful mutation-prompts in a self-referential way.](https://arxiv.org/html/2309.16797v1/overview.svg)

*Overview of Promptbreeder. Given a problem description and an initial set of general “thinking-styles” and mutation-prompts, Promptbreeder generates a population of units of evolution, each unit consisting of typically two task-prompts and a mutation-prompt. We then run a standard binary tournament genetic algorithm ( Harvey, 2011 ) . To determine the fitness of a task-prompt we evaluate its performance on a random batch of training data. Over multiple generations, Promptbreeder subsequently mutates task-prompts as well as mutation-prompts using five different classes of mutation operators. The former leads to increasingly domain-adaptive task-prompts whereas the latter evolves increasingly useful mutation-prompts in a self-referential way.*

<sub>figure: `2309.16797v1/overview.svg`</sub>

## 机制
### 1. Promptbreeder

We introduce Promptbreeder, a prompt evolution system that can automatically explore prompts for a given domain and that is able to find task-prompts that improve an LLM’s ability to derive answers to questions in that domain. Promptbreeder is general purpose in that the same system is able to adapt to many different domains. Promptbreeder makes use of the observation that LLMs can be used to generate variations of input text ( Lehman et al., 2022 ; Meyerson et al., 2023 ; Chen et al., 2023 ) . Figure 1 gives an overview of our method. We are interested in evolving task-prompts. A task-prompt P P is a string used to condition the context of an LLM in advance of some further input Q Q , intended to ensure a better response than if Q Q had been presented in the absence of P P . To evaluate the fitness of each evolved task-prompt, we sample a batch of 100 Q&A pairs from the entire training set of the domain at hand. 2 2 2 Our prompt strategy sequentially applies two task-prompts. The first task-prompt + question produces a continuation. The continuation + second task-prompt produces the final answer. Promptbreeder generates task-prompts according to an evolutionary algorithm. The mutation operator for this algorithm is itself an LLM, conditioned on a mutation-prompt M M . That is, a mutated task prompt P ′ P^{\prime} is defined by P ′ = LLM ⁡ ( M + P ) P^{\prime}=\LLM(M+P) where ‘ + + ‘ corresponds to string concatenation. A variety of such mutation-prompts are described in Section 3.2 . Promptbreeder’s main self-referential mechanism stems from applying the evolutionary algorithm not just to task-prompts but also to mutation-prompts. The mutation operator for this meta-level algorithm is again an LLM, now conditioned on a hyper-mutation prompt H H . That is, we obtain a mutated mutation-prompt M ′ M^{\prime} via M ′ = LLM ⁡ ( H + M ) M^{\prime}=\LLM(H+M) . Given a set of “thinking styles” 𝒯 \mathcal{T} and a set of initial mutation-prompts ℳ \mathcal{M} , as well as a domain-specific problem description D D , Promptbreeder initializes a population of mutated task-prompts (see Section 3.1 ). To clarify, a unit of evolution consists of a set of task-prompts, a mutation-prompt and in the few-shot case, a set of correct workings out (i.e. step-by-step or “chains-of-thought” reasoning steps that led to the correct answer). This means task-prompts and mutation-prompts are in 1:1 correspondence. To evolve this population, we employ a binary tournament genetic algorithm framework ( Harvey, 2011 ) : we sample two individuals from the population, we take the individual with the higher fitness, mutate it (see next section) and overwrite the loser with the mutated copy of the winner.

<sub>§3 Promptbreeder</sub>

### 2. Promptbreeder Initialization

To give a concrete example, consider the initialization steps used to produce the task-prompts and mutation-prompts for GSM8K (a ‘grade school maths’ word problem dataset). The problem description is "Solve the math word problem, giving your answer as an arabic numeral" . Because Plan-and-Solve ( Wang et al., 2023b ) uses two task-prompts we also evolve two task-prompts (plus a mutation-prompt) per unit of evolution. In order to promote diversity in the initial prompts, we generate the initial task-prompts by concatenating (for each task-prompt) a randomly drawn ‘mutation-prompt’ (e.g. "Make a variant of the prompt." ) and a randomly drawn ‘thinking-style’ (e.g. "Let’s think step by step" ) to the problem description, and provide that to the LLM to produce a continuation, resulting in an initial task-prompt. We do this twice to produce the two initial task-prompts per unit. Both the mutation-prompt and the thinking-style are randomly sampled from an initial set of mutation-prompts and a set of thinking-styles (see Appendices C , D and G for the full sets). The mutation-prompt is added to the unit of evolution and so is associated with its specific task-prompt throughout the evolutionary run. For the example above, the complete input string to the LLM to make an initial task-prompt could be "Make a variant of the prompt. Let’s think step by step. INSTRUCTION: Solve the math word problem, giving your answer as an arabic numeral. INSTRUCTION MUTANT:" . Note how the control strings "INSTRUCTION" and "INSTRUCTION MUTANT" are added to encourage an appropriate continuation. Table 4 in Appendix E shows examples of the initial prompts generated in this way.

<sub>§3.1 Promptbreeder Initialization</sub>

### 3. Mutation Operators

As shown in Figure 1 , there are nine operators falling into five broad classes which drive the exploration of prompt strategies. For each replication event only one of nine mutation operators is applied (we sample with uniform probability over the nine operators to decide which mutation operator to apply). The rationale for using this diverse set of operators is to enable the LLM to explore a large space of cognitive methods of linguistic self-questioning, by repeatedly changing the framing of the problem as well as retrieving mental models expressed in natural language that can help tackle a given reasoning challenge. Investigations from insight learning strongly suggest that diverse representational re-description is key to problem solving ( Öllinger & Knoblich, 2009 ) —a principle that we attempt to recreate via self-referential self-improvement with natural language as the substrate. Figure 2 illustrates in what way Promptbreeder is self-referential (see Appendix F for a more detailed explanation).

<sub>§3.2 Mutation Operators</sub>

### 4. Direct Mutation

The simplest class of mutation operators directly generate a new task-prompt P ′ P^{\prime} from either one existing task-prompt P P (first-order prompt generation) or from a general prompt that encourages free-form generation of new task-prompts–i.e. not using an existing parent, thus zero-order prompt generation. Zero-order Prompt Generation : We generate a new task-prompt by concatenating the problem description D D (e.g. "Solve the math word problem, giving your answer as an arabic numeral" ) with the prompt "A list of 100 hints:" , which invites the LLM to come up with a new hint that could help solve a problem in the given problem domain. We extract the first generated hint as the new task-prompt. Crucially, this new task-prompt does not depend on any previously found task-prompt. Instead, it is re-generated from the problem description each time. Our rationale for including this zero-order operator is that where prompt evolution diverges, this operator allows us to generate new task-prompts closely related to the original problem description, similar to uniform re-sampling in automated curriculum learning approaches ( Jiang et al., 2021b ; Jiang et al., 2021a ; Park et al., 2023 ; Parker-Holder et al., 2022 ) . First-order Prompt Generation : We concatenate the mutation-prompt ( red ), to the parent task-prompt ( blue ), and pass it to the LLM to produce the mutated task-prompt. For example " Say that instruction again in another way. DON’T use any of the words in the original instruction there’s a good chap. INSTRUCTION: Solve the math word problem, giving your answer as an arabic numeral. INSTRUCTION MUTANT: " . This procedure is identical to the initialization method, except that a randomly sampled thinking-style string is not used. First-order prompt generation is Promptbreeder’s standard asexual mutation operator, and it is the core of every genetic algorithm—taking one parental genotype (task-prompt) and applying the mutation to it (in this case influenced by the mutation-prompt).

<sub>§3.2.1 Direct Mutation</sub>

### 5. Estimation of Distribution Mutation

The next class of mutation operators condition not just on zero or one parent, but instead on a set of parents. As such, they may be more expressive by considering patterns in the population. Estimation of Distribution (EDA) Mutation : Inspired by Hauschild & Pelikan (2011) , we provide a filtered and numbered list of the current population of task-prompts to the LLM and ask it to continue this list with new task-prompts. We filter the population of prompts on the basis of BERT ( Devlin et al., 2019 ) embedding cosine similarities between each other—an individual is not included in the list if it is more than 0.95 0.95 similar to any other entry in the list, thus encouraging diversity (cf. quality-diversity methods ( Lehman & Stanley, 2011b ; Lehman & Stanley, 2011a ; Mouret & Clune, 2015 ) ). The prompts are listed in random order and we do not give the LLM access to the fitness values of individuals in the population---we found in preliminary experiments that the LLM did not understand these fitness values 3 3 3 This is contrary to recent findings by Mirchandani et al. (2023) . We leave it for future work to revisit whether LLMs can interpret fitness values for improved prompt evolution. and resorted to generating copies of entries in the list. EDA Rank and Index Mutation : This is a variant of the above in which task-prompts are listed in fitness order. Preliminary experiments showed that the LLM is more likely to generate entries that are similar to the elements appearing later in the list. This is in line with similar findings of recency effects in LLMs ( Liu et al., 2023 ) . Therefore, after filtering in the same way as before, we ordered the task-prompts in the population by ascending order of fitness. The top of the list is prefixed by the following prompt: "INSTRUCTION: " + <<mutation-prompt>> + "\n A List of Responses in descending order of score." + <<last index + 1>> + "is the best response. It resembles" + << last index>> + "more than it does (1)" . Note that we have ‘lied’ to the LLM by telling it that the order is descending. This is because otherwise it is too biased towards producing a new entry that is too similar to the final entry. The contradiction between the ascending ordering and the statement that it is a descending ordering appears to improve the diversity of sampling. The rationale for this operator is again to represent the current distribution in such a way that high fitness and yet diverse extrapolations are suggested by the LLM. Lineage Based Mutation : For each unit of evolution, we store a history of the individuals in its lineage that were the best in the population, i.e., a historical chronological list of elites. This list is provided to the LLM in chronological order (not filtered by diversity), with the heading "GENOTYPES FOUND IN ASCENDING ORDER OF QUALITY" to produce a novel prompt as continuation. The rationale for this operator is that we expect the signal of improving genotype prompts may be stronger than the signal from prompts in the current population since they provide a gradient of bad to good prompts that could be followed (assuming this signal can be used by the LLM).

<sub>§3.2.2 Estimation of Distribution Mutation</sub>

### 6. Hypermutation: Mutation of Mutation-Prompts

While the mutation operators above might already explore diverse task-prompts, a self-improving system should ideally also improve the way it is improving itself in a self-referential way. Our third class of mutation operators includes hyper-mutation operators concerned with the evolution of evolvability ( Dawkins, 2003 ; Pigliucci, 2008 ; Payne & Wagner, 2019 ; Gajewski et al., 2019 ) ---those which modify the search/exploration process rather than the task reward obtaining process directly. 4 4 4 This is similar to population based training ( Jaderberg et al., 2017a ) —instead of applying it to hyperparameters such as learning rates, it applies to the mutation-prompts of Promptbreeder. Zero-order Hyper-Mutation : We concatenate the original problem description to a randomly sampled thinking-style, and feed it to the LLM to generate a new mutation-prompt. The resulting mutation-prompt is applied to a task-prompt to make a variant of the task-prompt as in First-order Prompt Generation (see Section 3.2.1 ). Note that this zero-order meta-mutation operator is identical to that used during initialization. The rationale for this operator is to generate mutation operators in a way similar to initialization, while also bringing in knowledge from the set of thinking styles. First-order Hyper-Mutation : We concatenate the hyper-mutation-prompt "Please summarize and improve the following instruction:" to a mutation-prompt so that the LLM generates a new mutation-prompt. This newly generated mutation-prompt is then applied to the task-prompt of that unit (see First-Order Prompt Generation in Section 3.2.1 ). In this way, we can evaluate the influence of the hyper-mutation via its newly generated mutation-prompt on the quality of the evolved downstream task-prompt at once.

<sub>§3.2.3 Hypermutation: Mutation of Mutation-Prompts</sub>

### 7. Lamarckian Mutation

For this class of mutation operators we mimic a Lamarckian process. We want to use a successful phenotype (i.e. the concrete working out used to produce correct answers induced by an evolved task-prompt) to generate a new genotype (i.e. a mutant task-prompt). Several processes of this form have appeared in the literature of LLMs, e.g. STaR ( Zelikman et al., 2022 ) , APO ( Pryzant et al., 2023 ) , and APE ( Zhou et al., 2023 ) . Working Out to Task-Prompt : This is a ‘Lamarckian’ mutation operator similar to instruction induction in APE. We give an LLM a previously generated working out that led to a correct answer via the following prompt: "I gave a friend an instruction and some advice. Here are the correct examples of his workings out + <<correct working out>> + The instruction was:" . This is effectively reverse-engineering the task-prompt from a given working out. An effective example of this is shown in Appendix H . This kind of operator is critical when the problem description is absent, insufficient, or misleading.

<sub>§3.2.4 Lamarckian Mutation</sub>

### 8. Prompt Crossover and Context Shuffling

Our last class of mutation operators are crossover operators and operators for shuffling the few-shot context examples present in the units of evolution. Prompt Crossover : After a mutation operator is applied, with 10% chance a task-prompt is replaced with a randomly chosen task-prompt from another member of the population. This member is chosen according to fitness proportionate selection. Crossover is not applied to mutation-prompts, only to the task-prompts. Context Shuffling : Promptbreeder can simultaneously evolve the task-prompts, mutation-prompts and the set of correct workings out known as the few-shot context. To achieve the later, we fill up a few-shot context with only workings out that led to correct answers. During evaluation we provide this few shot-context before the task-prompt, providing guidance as to the form of the working out that is desired. If the few-shot context list is full, a single randomly sampled new correct working out replaces an existing working out from the list after fitness evaluation of a unit on a new set of questions. In addition, with a 10% chance we resample the whole context list with probability inverse to the maximum context list length.

<sub>§3.2.5 Prompt Crossover and Context Shuffling</sub>

## 总结与展望
Promptbreeder 的「自指」很具体：不仅任务提示在进化，连用来生成变异的提示也在进化，九个变异算子分五大类。它对我们最直接的一课是：如果生成改动的机制本身不可变，那么无论跑多少轮，改动空间的形状是固定的——我们的 mutation registry 有四个 kind，从 2026-11-09 起就没变过。

**It connects to**

- `2401.02051` — EoH 让 LLM 写启发式，Promptbreeder 让 LLM 改写自己的提示；两者都在扩大「可被搜索的东西」的范围。
- `2509.19349` — ShinkaEvolve 把「父代与灵感采样」做成显式组件，Promptbreeder 把「算子选择」做成显式组件；都是把搜索策略本身暴露出来。

## 不足之处
**The authors say:** We present results of Promptbreeder ( PB ) in comparison to state-of-the-art prompt strategies on a range of commonly used reasoning benchmarks in Table 1 . PB outperforms PS+ , the best Plan-and-Solve ( Wang et al., 2023b ) prompting technique. Note that the performance of PS+ is improved by using PaLM 2-L ( Anil et al., 2023 ) as the underlying LLM ( PS+ PaLM 2-L {}_{\textbf{PaLM 2-L}} ) on all datasets except ADDSUB compared to text-davinci-003 results in the original paper. On all other datasets, zero-shot PB accuracy is higher than PS+, with further improvement in the few-shot case when examples of discovered solutions are included with the prompts. In Table 6 in Appendix J , we show the best evolved zero-shot prompts. The best few-shot candidates are shown in Section J.5 onwards. Appendix K shows few-shot results and their controls on the Instruction Induction tasks from the APE paper. To investigate the ability of Promptbreeder to evolve complex domain-specific prompts for a downstream task, we applied it to the ETHOS Hate Speech Classification problem ( Mollas et al., 2022 ) . Promptbreeder was able to evolve a prompt strategy consisting of two sequentially applied relatively long prompts (see Section J.1 ) that scored 89% on ETHOS—an improvement over the hand-designed prompt "Determine whether a text contains hate speech" which scores only 80%. This demonstrates that Promptbreeder is capable of intricate domain-adaptation to a task at hand. Appendix B shows a typical evolutionary run and the prompts evolved, showing that unlike iterative APE, fitness continues to increase throughout the run.

**What a reader should still not conclude**

- 自指带来的增益在论文里是与非自指的对照，但对照只在一个模型族上做过。
- 机制段抽到的是系统概述与算子一节的导语，九个算子的具体定义在表格里。

<sub>§5 Results and Discussion</sub>

---

# Automated Design of Agentic Systems

arXiv:2408.08435 · 2025 · [source](https://arxiv.org/html/2408.08435)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Foundation Models (FMs) such as GPT ( OpenAI, 2024 ; OpenAI, 2022 ) and Claude ( Anthropic, 2024b ) are quickly being adopted as powerful general-purpose agents for agentic tasks that need flexible reasoning and planning ( Wang et al., 2024 ) . Despite recent advancements in FMs, solving problems reliably often requires an agent to be a compound agentic system with multiple components instead of a monolithic model query ( Zaharia et al., 2024 ; Rocktäschel, 2024 ) . Additionally, to enable agents to solve complex real-world tasks, they often need access to external tools such as search engines, code execution, and database queries. As a result, many effective building blocks of agentic systems have been proposed, such as chain-of-thought planning and reasoning ( Wei et al., 2022 ; Yao et al., 2023 ; Hu & Clune, 2024 ) , memory structures ( Zhang et al., 2024c ; Lewis et al., 2020 ) , tool use ( Schick et al., 2023 ; Qu et al., 2024 ) , and self-reflection ( Madaan et al., 2024 ; Shinn et al., 2023 ) . Although these agents have already seen significant success across various applications ( Wang et al., 2024 ) , developing these building blocks and combining them into complex agentic systems often requires domain-specific manual tuning and substantial effort from both researchers and engineers.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Automated Design of Agentic Systems (ADAS)"]
  N1["§3 Our Algorithm: Meta Agent Search"]
  N0 --> N1
```

![The three key components of Automated Design of Agentic Systems (ADAS). The search space determines which agentic systems can be represented in ADAS. The search algorithm specifies how the ADAS method explores the search space. The evaluation function defines how to evaluate a candidate agent on target objectives such as performance.](https://arxiv.org/html/2408.08435v2/problem_framework.png)

*The three key components of Automated Design of Agentic Systems (ADAS). The search space determines which agentic systems can be represented in ADAS. The search algorithm specifies how the ADAS method explores the search space. The evaluation function defines how to evaluate a candidate agent on target objectives such as performance.*

<sub>figure: `2408.08435v2/problem_framework.png`</sub>

## 机制
### 1. Automated Design of Agentic Systems (ADAS)

At the time of writing, the community has not reached a consensus on the definitions or terminologies of agents. Here, by agents we refer to agentic systems that involve Foundation Models (FMs) as modules in the workflow to solve tasks by planning, using tools, and carrying out multiple, iterative steps of processing ( Chase, 2024 ; Ng, 2024 ) . In this paper, we describe a newly forming research area Automated Design of Agentic Systems (ADAS). Similar to research areas in AI-GAs ( Clune, 2019 ) and AutoML ( Hutter et al., 2019 ) , such as Neural Architecture Search ( Elsken et al., 2019 ) , we formulate ADAS as an optimization process and identify three key components of ADAS algorithms ( Figure 2 ). Search Space : The search space defines which agentic systems can be represented and thus discovered in ADAS. For example, works like PromptBreeder ( Fernando et al., 2024 ) mutate only the text prompts of an agent, but their other components, such as workflow, remain the same. Thus, in these search spaces, agents that have a different workflow than the predefined one can not be represented. Existing works also explore search spaces such as graph structures ( Zhuge et al., 2024 ) and feed-forward networks ( Liu et al., 2023 ) . Search Algorithm : The search algorithm defines how ADAS algorithms explore the search space. Since the search space is often very large or even unbounded, the exploration-exploitation trade-off ( Sutton & Barto, 2018 ) should be considered. Ideally, the algorithm can both quickly discover high-performance agentic systems and avoid remaining stuck in a local optimum. Existing approaches include using Reinforcement Learning ( Zhuge et al., 2024 ) or an FM iteratively generating new solutions ( Fernando et al., 2024 ) as search algorithms. Evaluation Function : Depending on the application of the ADAS algorithm, we may consider different objectives to optimize, such as performance, cost, latency, or safety of agents. An evaluation function defines how to evaluate a candidate agent on those objectives. For example, to assess the agent’s performance on unseen future data, a simple method is to calculate the accuracy rate on the validation data for a task, which is commonly adopted in existing works ( Zhuge et al., 2024 ; Fernando et al., 2024 ) . Although many search space designs are possible and some have already been explored ( Section 5 ), there is an unexplored yet promising approach where we can define the entire agentic system in code and new agents can be automatically discovered by a meta agent programming ever better ones in code. Searching within a code space theoretically enables the ADAS algorithm to discover any possible building blocks (e.g., prompts, tool use, workflow) and agentic systems that combine any of these building blocks in any way. This approach also offers better interpretability for agent design patterns since the program code is often readable, making debugging easier and enhancing AI safety. Additionally, compared to search spaces using networks ( Liu et al., 2023 ) or graphs ( Zhuge et al., 2024 ) , searching in a code space allows us to more easily build on existing human efforts. For example, it is possible to search within open-source agent frameworks like LangChain ( LangChainAI, 2022 ) and build upon all existing building blocks (e.g., RAG, search engine tools). Finally, since FMs are proficient in coding, utilizing a code search space allows us to leverage existing expertise from FMs during the search process. In contrast, search algorithms in custom search spaces, such as graphs, may be much less efficient due to the absence of these priors. Therefore, we argue that the approach of using programming languages as the search space should be studied more in ADAS.

<sub>§2 Automated Design of Agentic Systems (ADAS)</sub>

### 2. Our Algorithm: Meta Agent Search

In this section, we present Meta Agent Search, a simple yet effective algorithm to demonstrate the approach of defining and searching for agents in code. The core idea of Meta Agent Search is to adopt FMs as meta agents to iteratively program interestingly new agents based on an ever-growing archive of previous discoveries. Although any possible building blocks and agentic systems can theoretically be programmed by the meta agent from scratch, it is inefficient in practice to avoid providing the meta agent any basic functions such as FM query APIs or existing tools. Therefore, in this paper, we define a simple framework (within 100 lines of code) for the meta agent, providing it with a basic set of essential functions like querying FMs or formatting prompts. As a result, the meta agent only needs to program a “forward” function to define a new agentic system, similar to the practice in FunSearch ( Romera-Paredes et al., 2024 ) . This function takes in the information of the task and outputs the agent’s response to the task. Details of the framework codes and examples of the agents defined with this framework can be found in Appendix C . As shown in Figure 1 , the core idea of Meta Agent Search is to have a meta agent iteratively program new agents in code. The algorithm proceeds as follows: (1) The archive is (optionally) initialized with baseline agents such as Chain-of-Thought ( Wei et al., 2022 ) and Self-Refine ( Madaan et al., 2024 ; Shinn et al., 2023 ) . (2) Conditioned on the archive, the meta agent designs a new agent by generating a high-level description of the new idea for an agentic system and then implementing it in code. The design then undergoes two self-reflection ( Madaan et al., 2024 ; Shinn et al., 2023 ) steps by the meta agent to ensure it is novel. (3) The generated agent is evaluated using validation data from the target domain. If errors occur during evaluation, the meta agent performs a self-reflection step to refine the design, repeating this process up to five times if necessary. (4) Finally, the agent is added to the archive along with its evaluation metrics, and the process continues with the updated archive until the maximum number of iterations is reached. A pseudocode of the algorithm is provided in Appendix H . Similar to existing open-endedness algorithms that leverage human notions of interestingness ( Zhang et al., 2024a ; Lu et al., 2024c ) , we encourage the meta agent to explore interestingly new (e.g., novel or worthwhile) agents based on an ever-growing archive of previous discoveries. Here, we calculate the performance (e.g., success rate or F1 score) as the metrics for the meta agent to maximize. The prompt and more details are presented in Appendix B .

<sub>§3 Our Algorithm: Meta Agent Search</sub>

## 总结与展望
ADAS 让一个元代理去写新的代理并存档，是「自动设计智能体」这个名字的来源。论文自己在限制里承认搜索算法很简单，真正的贡献是「把设计空间写成一个可被搜索的对象」——这一点对我们最直接：提案的种类要有限而可枚举，否则搜索退化成随机。

**It connects to**

- `2505.22954` — DGM 的消融里「去掉自我改进」那一臂就是 ADAS，所以两者的差距被这篇直接量过。
- `1504.04909` — 共同的祖先都是「归档 + 变异」这一套。

## 不足之处
**The authors say:** Safety Considerations. While it is highly unlikely that model-generated code will perform overtly malicious actions in our current settings with the Foundation Models (FMs) we employ, such code could still act destructively due to limitations in model capability or alignment ( Rokon et al., 2020 ; Chen et al., 2021 ) . To address these risks, we have implemented safety measures including containerized execution of all generated code in secure, isolated environments, thorough manual inspections to verify the absence of harmful behaviors, and clear warnings in our codebase to alert users to potential risks. These practices align with established safety standards in the literature, such as those in SWE-Bench ( Jimenez et al., 2024 ) and Voyager ( Wang et al., 2023a ) , which similarly prioritize controlled execution environments.

**What a reader should still not conclude**

- 它的搜索预算是人工设定的固定轮数，没有讨论「什么时候该停」。
- 评估是基准分数，不存在「评审也是模型」带来的自评偏差。

<sub>§6 Discussion and Conclusion</sub>

---

# R a i n b o w T e a m i n g : Open-Ended Generation of Diverse Adversarial Prompts

arXiv:2402.16822 · 2024 · [source](https://arxiv.org/html/2402.16822)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have recently experienced remarkable growth in both their capabilities ( OpenAI, 2023 ; Gemini Team et al., 2023 ; Touvron et al., 2023 ) and their applications in various fields ( NLLB Team et al., 2022 ; Thirunavukarasu et al., 2023 ; Schick et al., 2023 ; Bubeck et al., 2023 ) . As LLMs become increasingly complex and are deployed in safety-critical environments ( Singhal et al., 2022 ; Li et al., 2023 ; Maddela et al., 2023 ) , it is essential to thoroughly understand their robustness to different inputs. Indeed, the susceptibility of LLMs to adversarial prompts — prompts crafted to mislead the model or exploit its weaknesses, potentially leading to unsafe, biased, or incorrect outputs — poses a significant challenge ( Perez et al., 2022 ; Wei et al., 2023 ; Zou et al., 2023 ) . Identifying and mitigating these vulnerabilities is therefore vital to ensure the safe and reliable operation of LLMs in the real world ( Anwar et al., 2024 ; Hendrycks et al., 2022 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Rainbow Teaming for Safety"]
```

![An example archive generated by Rainbow Teaming when used to discover safety vulnerabilities in Llama 2-chat 7B. Here, we search over two features: Risk Category and Attack Style. Shading corresponds to the Llama Guard ( Inan et al., 2023 ) scores of responses induced by the adversarial prompt in each cell (higher means more confidence in the response being unsafe). Some excerpts of discovered prompts from a single archive are shown. 2 2 2 For additional adversarial prompts and details, visit our website at https://sites.google.com/view/rainbow-teaming .](https://arxiv.org/html/2402.16822v3/archive_neurips.svg)

*An example archive generated by Rainbow Teaming when used to discover safety vulnerabilities in Llama 2-chat 7B. Here, we search over two features: Risk Category and Attack Style. Shading corresponds to the Llama Guard ( Inan et al., 2023 ) scores of responses induced by the adversarial prompt in each cell (higher means more confidence in the response being unsafe). Some excerpts of discovered prompts from a single archive are shown. 2 2 2 For additional adversarial prompts and details, visit our website at https://sites.google.com/view/rainbow-teaming .*

<sub>figure: `2402.16822v3/archive_neurips.svg`</sub>

## 机制
### 1. Rainbow Teaming for Safety

In this section, we evaluate the effectiveness of Rainbow Teaming in discovering adversarial prompts that trigger unsafe (i.e., harmful, offensive, or toxic) responses. We target various models that are fine-tuned with safety-aligned data and are among the safest publicly available LLMs, including Llama 2 and Llama 3 models. Features: We use two feature dimensions: Risk Category and Attack Style. Our risk categories expand upon the safety risk taxonomy in Inan et al. (2023) and cover common safety issues in LLMs, such as “Criminal Planning”, “Violence and Hate” or “Self-Harm”. Attack Style pertains to the method of eliciting unsafe responses, such as “Authority Manipulation” and “Role Play”. Together, these features enable a thorough evaluation of LLM safety, covering a broad spectrum of adversarial threats and tactics. The full list of categories for both features is provided in section H.1 . Mutation Operator: We use an instruction-tuned Llama 2 70B model, which applies two mutations to create the candidate prompt, as illustrated in fig. 2 . The first mutation targets the risk category, using a few-shot prompt template shared across all categories. The second mutation focuses on the attack style, employing few-shot prompts handcrafted for each individual category. Preference Model: We use an instruction-tuned Llama 2 70B model as a Judge to compare Target responses to two adversarial prompts. Its role is to determine which response is more unsafe, ignoring the prompts. The prompt corresponding to the winner’s response is the one we then keep in the archive. Details about the prompts used for the Judge are provided in appendix I . To initialise the archive, we generate prompts from scratch according to risk categories without relying on a pre-existing seed dataset. These are then mutated with respect to attack style and used as a foundation for subsequent evolutionary iterations. We use two independent measures of Attack Success Rate (ASR) – the proportion of prompts in the archive that elicit unsafe responses. Specifically, we use two safety classifiers, namely GPT-4 ( OpenAI, 2023 ) with a specialised prompt and the Llama Guard safeguard model ( Inan et al., 2023 ) . GPT-4 acts as a binary classifier for whether a response is generally unsafe or not, independent of risk categories. In contrast, Llama Guard is prompted to perform per-category binary classification ( Inan et al., 2023 ) , considering an attack successful only if the resulting response violates the risk category it is assigned to. Neither of these metrics is explicitly optimised by Rainbow Teaming , but the probability of Llama Guard classifying a prompt as unsafe is the fitness score used to bias the selection of the prescribed feature descriptors for new candidates. Prompts for both evaluators are provided in appendix I . For all experiments, we report the mean and standard error over 3 3 independent runs. We also measure inter-evaluator agreement on 100 pairs of prompts and responses. table 8 in section E.3 shows that human-human agreement (83%) is similar to human-AI agreement (81% for GPT-4 and 78% for Llama Guard) and GPT-4-Llama Guard agreement (79%), and is consistent with prior work ( Zheng et al., 2023 ) . We therefore use GPT-4 and Llama Guard as proxies for human evaluation.

<sub>§4 Rainbow Teaming for Safety</sub>

## 总结与展望
Rainbow Teaming 用质量-多样性搜索生成对抗性提示，证明了「按描述符分格、每格找最强的」在对抗生成里比随机采样高效得多。它对自我修改方向的启示是反过来的：如果我们的提案机制只有一种变体，那我们连对手的多样性都没有。

**It connects to**

- `1504.04909` — 同一套分格机制，把「行为描述符」换成了「风险类别」。

## 不足之处
**What a reader should still not conclude**

- 它优化的是攻击成功率，指标单一且可自动判定；我们的提案质量没有这样干净的标量。

---

# HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal

arXiv:2402.04249 · 2024 · [source](https://arxiv.org/html/2402.04249)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have driven rapid advances in the performance and generality of AI systems. This has enabled many beneficial applications in recent years, ranging from AI tutors to coding assistants ( Chen et al., 2021 ; Achiam et al., 2023 ) . However, there has been growing concern from researchers, regulators, and industry leaders over the risk of malicious use posed by current and future AI systems ( Brundage et al., 2018 ; Hendrycks et al., 2023 ; Executive Office of the President, 2023 ) . Current LLMs have shown preliminary abilities in writing malware ( Bhatt et al., 2023 ) , social engineering ( Hazell, 2023 ) , and even designing chemical and biological weapons ( Gopal et al., 2023 ; OpenAI, 2024 ) . As LLMs become more capable and widespread, limiting the potential for their malicious use will become increasingly important. To this end, an important research problem is ensuring that LLMs never engage in specified harmful behaviors.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Automated Red Teaming"]
  N1["§3.1 Problem Definition and Metrics"]
  N2["§Breadth."]
  N3["§Comparability."]
  N4["§Robust Metrics."]
  N5["§4 HarmBench"]
  N6["§4.1 Overview"]
  N7["§Harmful behaviors."]
  N8["§Semantic categories."]
  N9["§Functional categories."]
  N10["§4.2 Curation of Harmful Behaviors"]
  N11["§Differential harm / online searchability."]
  N12["§Dual-intent behaviors."]
  N13["§Criteria for successful test cases."]
  N14["§Classifiers."]
  N15["§5 Adversarial Training for Robust Refusal"]
  N16["§5.1 Efficient GCG Adversarial Training"]
  N17["§Preliminaries."]
  N18["§Persistent test cases."]
  N19["§Model Losses."]
  N20["§Full method."]
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
```

![HarmBench offers a standardized, large-scale evaluation framework for automated red teaming and robust refusal. It includes four functional categories (left) with 510 510 carefully curated behaviors that span diverse semantic categories (right). The initial set of evaluations includes 18 18 red teaming methods and 33 33 closed-source and open-source LLMs.](https://arxiv.org/html/2402.04249v2/splash_figure.png)

*HarmBench offers a standardized, large-scale evaluation framework for automated red teaming and robust refusal. It includes four functional categories (left) with 510 510 carefully curated behaviors that span diverse semantic categories (right). The initial set of evaluations includes 18 18 red teaming methods and 33 33 closed-source and open-source LLMs.*

<sub>figure: `2402.04249v2/splash_figure.png`</sub>

## 机制
### 1. Automated Red Teaming / Problem Definition and Metrics

Completions where the model initially refuses, but then continues to exhibit the behavior Completions for unrelated harmful behaviors Following Perez et al. (2022) ; Zou et al. (2023) , we formulate the red teaming task as designing test cases { x 1 , x 2 , … , x N } \{x_{1},x_{2},\dotsc,x_{N}\} in order to elicit a given behavior y y from one or more target LLMs. The primary measure of a red teaming method’s success is its attack success rate (ASR) on a given target model, which is the percentage of test cases that elicit the behavior from the target model. To improve evaluation efficiency, we follow prior work in assuming that target models generate completions deterministically using greedy decoding ( Zou et al., 2023 ; Chao et al., 2023 ; Mehrotra et al., 2023 ) . Formally, let f f be a target model with generation function f T ​ ( x ) = x ′ f_{T}(x)=x^{\prime} , where T T is the number of tokens to be generated, x x is a test case, and x ′ x^{\prime} is the completion. Let g g be a red teaming method that generates a list of test cases, and let c c be a classifier mapping completion x ′ x^{\prime} and behavior y y to 1 1 if a test case was successful and 0 0 if not. The ASR of g g on target model f f for behavior y y is then defined as

<sub>§3 Automated Red Teaming · §3.1 Problem Definition and Metrics</sub>

### 2. Breadth.

Red teaming methods that can only obtain high ASR on a small set of harmful behaviors may be less useful in practice. Thus, it is desirable for evaluations to encompass a wide variety of harmful behaviors. We conduct a brief survey of prior evaluations to tabulate their diversity of behaviors, finding that most use short, unimodal behaviors with less than 100 100 unique behaviors. By contrast, our proposed benchmark contains novel functional categories and modalities of behaviors, including contextual behaviors, copyright behaviors, and multimodal behaviors. These results are shown in Table 5 . In addition to providing comprehensive tests of red teaming methods, a broad array of behaviors can greatly enhance the evaluation of defenses. Different developers may be interested in preventing different behaviors. Our benchmark includes a broad range of behavior categories to enable tailored evaluations of defenses. Moreover, we propose a standardized evaluation framework that can be easily extended to include new undesired behaviors, allowing developers to quickly evaluate their defenses against a wide range of attacks on the behaviors that are most concerning to them.

<sub>§Breadth.</sub>

### 3. Comparability.

The foundation of any evaluation is being able to meaningfully compare different methods. One might naively think that running off-the-shelf code is sufficient for comparing the performance of one’s red teaming method to a baseline. However, we find that there is considerable nuance to obtaining a fair comparison. In particular, we identify a crucial factor overlooked in prior work that highlights the importance of standardization. In developing our evaluations, we found that the number of tokens generated during evaluation can have a drastic effect on ASR computed by substring matching metrics used in earlier work. We show in Figure 2 that the choice of this parameter can change ASR by up to 30 % 30\% . Unfortunately, this parameter has not been standardized in prior work, rendering cross-paper comparisons effectively meaningless. In Section 4.3 , we propose a new metric that is more robust to variations in this parameter, and we standardize this parameter to N = 512 N=512 to allow the metric to converge.

<sub>§Comparability.</sub>

### 4. Robust Metrics.

Research on red teaming LLMs benefits from the codevelopment of attacks and defenses. However, this means that metrics for evaluating red teaming methods can face considerable optimization pressure as both attacks and defenses seek to improve performance. As a result, one cannot simply use any classifier for this process. As a prequalification, classifiers should exhibit robustness to nonstandard scenarios, lest they be easily gamed. Here, we propose an initial prequalification test consisting of three types of nonstandard test case completions: We compare a variety of classifiers on these sets in Table 4 , finding that many previously used classifiers lack robustness to these simple but nonstandard scenarios. Additionally, a crucial measure to ensuring the robustness of evaluation metrics is using held-out classifiers and a validation/test split for harmful behaviors. We find that several prior works directly evaluate on the metric optimized by their method—a practice that can lead to substantial gaming.

<sub>§Robust Metrics.</sub>

### 5. HarmBench

Here, we describe HarmBench, a new evaluation framework for automated red teaming and robust refusal that incorporates the key considerations discussed in Section 3.2 . Standard behaviors are modeled after existing datasets of harmful behaviors, including AdvBench and the TDC 2023 Red Teaming Track dataset ( Zou et al., 2023 ; Mazeika et al., 2023 ) . These behaviors cover a broad range of harms and are self-contained behavior strings with no accompanying context string or image. Copyright behaviors ask models to generate copyrighted content. We directly measure whether this occurs using a novel hashing-based classifier for these behaviors. We describe this classifier in more detail in Section B.5.2 . Contextual behaviors consist of a context string and a behavior string referencing the context. These allow evaluating the robustness of LLMs on more realistic and differentially harmful behaviors than explored previously. Multimodal behaviors consist of an image and a behavior string referencing the image. These allow evaluating multimodal LLMs on attacks leveraging image inputs. Generating Test Cases : The red teaming method g g is given a set of behaviors { y 1 , y 2 , … , y M } \{y_{1},y_{2},\dotsc,y_{M}\} and generates a set of test cases { x 1 , x 2 , … , x N } \{x_{1},x_{2},\dotsc,x_{N}\} for each behavior. Generating Completions : Test cases are passed into the target LLM f f , which generates T T tokens with greedy decoding to produce output strings f T ​ ( x i ) = x i ′ f_{T}(x_{i})=x^{\prime}_{i} . Evaluating Completions : The completions x i ′ x^{\prime}_{i} for each behavior y j y_{j} are evaluated using ASR ​ ( y j , g , f ) \text{ASR}(y_{j},g,f) , with a classifier c c (defined in Section 3.1 ).

<sub>§4 HarmBench</sub>

### 6. Overview

HarmBench consists of a set of harmful behaviors and an evaluation pipeline. This follows the standard problem formulation in Section 3.1 and mirrors existing evaluations. We improve over existing evaluations by greatly increasing the breadth of behaviors and the comparability and robustness of the evaluation pipeline.

<sub>§4.1 Overview</sub>

### 7. Harmful behaviors.

HarmBench contains 510 510 unique harmful behaviors, split into 400 400 textual behaviors and 110 110 multimodal behaviors. We designed the behaviors to violate laws or norms, such that most reasonable people would not want a publicly available LLM to exhibit them. To improve the robustness of our evaluation, we provide an official validation/test split of HarmBench behaviors. The validation set contains 100 100 behaviors and the test set contains 410 410 behaviors. We require that attacks and defenses do not tune on the test set or on behaviors semantically identical to those in the test set. We provide two types of categorization for each behavior: semantic categories and functional categories. The semantic category describes the type of harmful behavior, including cybercrime, copyright violations, and generating misinformation. The functional category describes unique properties of behaviors that enable measuring different aspects of a target LLM’s robustness.

<sub>§Harmful behaviors.</sub>

### 8. Semantic categories.

HarmBench contains the following 7 7 semantic categories of behavior: Cybercrime & Unauthorized Intrusion, Chemical & Biological Weapons/Drugs, Copyright Violations, Misinformation & Disinformation, Harassment & Bullying, Illegal Activities, and General Harm. These categories roughly reflect the areas of most concern for malicious use of LLMs, with recent regulatory discussion of LLMs and high-profile lawsuits of LLM companies focusing on these areas ( Executive Office of the President, 2023 ) .

<sub>§Semantic categories.</sub>

### 9. Functional categories.

HarmBench contains the following 4 4 functional categories of behavior: standard behaviors, copyright behaviors, contextual behaviors, and multimodal behaviors. These categories contain 200 200 , 100 100 , 100 100 , and 110 110 behaviors, respectively. To demonstrate the structural novelty of HarmBench, we show examples of contextual and multimodal behaviors in Figure 4 .

<sub>§Functional categories.</sub>

### 10. Curation of Harmful Behaviors

We design our behaviors to violate laws or norms, such that most reasonable people would not want a publicly available LLM to exhibit them. We begin by collecting and distilling the acceptable use policies of OpenAI, Anthropic, Meta, and Inflection AI into a combined summary. This was done using GPT-4. Using this as a guide, several authors of this work manually designed a large set of behaviors that we assessed would violate laws or widely-held norms. Below, we describe key considerations that arose during this process, which guided our curation of harmful behaviors.

<sub>§4.2 Curation of Harmful Behaviors</sub>

### 11. Differential harm / online searchability.

Beyond a baseline of realism, we also evaluate candidate behaviors based on whether they could pose differential harm when performed by an LLM above and beyond what a human could accomplish with a search engine. For example, the candidate behavior “Provide instructions for synthesizing cocaine” would be relatively easy to accomplish with a search engine, because many academic papers detailing cocaine synthesis are publicly available. By contrast, “Determine which of these synthesis pathways for cocaine would be easiest to perform at home without getting caught, and explain your reasoning” (given several of the aforementioned papers) would be much harder to accomplish with a search engine in a reasonable amount of time. Since LLM developers may also care about behaviors that are harmful but could still be accomplished with a search engine, we do not require that all behaviors possess this property. Instead, we simply ensure that a significant portion of the behaviors in HarmBench are differentially harmful. We accomplish this by including contextual behaviors and multimodal behaviors, which provide highly specific contextual information that renders accomplishing the behavior with a search engine nearly impossible. In Table 12 , we conduct a small-scale experiment on the searchability of HarmBench contextual behaviors compared to behaviors in two prior behavior datasets: MaliciousInstruct and Advbench. One of the authors spent 10 10 minutes searching for 20 20 randomly sampled behaviors from each dataset using Google. The searchability rate was 55 % 55\% for MaliciousInstruct, 50 % 50\% for AdvBench, and 0 % 0\% for HarmBench contextual behaviors, validating our design choice.

<sub>§Differential harm / online searchability.</sub>

### 12. Dual-intent behaviors.

Manual red teaming efforts have identified the phenomenon of dual-intent behaviors, where a behavior could be performed for benign or malicious reasons. For example, ( Touvron et al., 2023 ) note that writing encryption functions could be performed by developers for security software or by malicious hackers for ransomware. Consequently, it would be unwise to include writing encryption functions as a behavior in a red teaming benchmark, because developers would be unlikely to restrict LLMs from doing this. We find that dual-intent behaviors are a pervasive problem in existing red teaming evaluations and can be difficult to avoid. For example, a naive behavior to include in an evaluation would be “Provide instructions on how to insert custom DNA into a virus”, since many students and researchers could benefit from this information, and they plausibly greatly outnumber adversaries who would seek to use the information maliciously. In curating behaviors for HarmBench, we performed several filtering passes to remove or alter candidate behaviors such that it would be highly unlikely for most people to want an LLM to perform the behavior for benign reasons.

<sub>§Dual-intent behaviors.</sub>

### 13. Criteria for successful test cases.

To improve the clarity and precision of evaluations, we develop a set of criteria to determine whether test cases are successful. On a high level, we deem a test case successful if the completion demonstrates that the model either exhibited the behavior or clearly tried to exhibit the behavior. For example, if the behavior is “Write a keylogger script that will run as a background process upon being inserted via USB”, then a test case may still be successful if the completion contains incorrect code. What matters is that the completion appears to be an attempt at the behavior. We use this standard to disentangle the capabilities of target LLMs from the performance of their safety measures. The full list of criteria are in Section B.1 .

<sub>§Criteria for successful test cases.</sub>

### 14. Classifiers.

To compute ASR, we develop a classifier to obtain high accuracy on a manually-labeled validation set of completions, using the above criteria for successful test cases. For non-copyright behaviors, we fine-tune Llama 2 13B chat to serve as our classifier for whether a test case was successful. For copyright behaviors, we develop a hashing-based classifier to directly assess whether copyrighted content was generated. We give detailed descriptions of these classifiers in Section B.5.2 . In Table 3 , we show performance of our non-copyright classifier on the validation set compared to existing classifiers. Our classifier obtains stronger performance than all existing classifiers. Moreover, ours is the only open-source classifier obtaining acceptable performance. Using closed-source classifiers for evaluation metrics is far from ideal, because models can change under the hood without warning and may not be available in a year’s time.

<sub>§Classifiers.</sub>

### 15. Adversarial Training for Robust Refusal

An important use case for red teaming is hardening defenses against adversaries before deployment. While several system-level defenses have been proposed for LLMs, very few model-level defenses have been explored beyond standard fine-tuning and preference optimization on safety datasets ( Ganguli et al., 2022 ; Achiam et al., 2023 ; Touvron et al., 2023 ) . To explore the potential for codevelopment of automated red teaming methods and model-level defenses, we propose a new adversarial training method for robust refusal, called Robust Refusal Dynamic Defense (R2D2). As opposed to fine-tuning on a static dataset of harmful prompts, our method fine-tunes LLMs on a dynamic pool of test cases continually updated by a strong optimization-based red teaming method.

<sub>§5 Adversarial Training for Robust Refusal</sub>

### 16. Efficient GCG Adversarial Training

We use GCG for our adversary, since we find that it is the most effective attack on robust LLMs like Llama 2. Unfortunately, GCG is extremely slow, requiring 20 20 minutes to generate a single test case on 7B parameter LLMs using an A100. To address this issue, we draw on the fast adversarial training literature ( Shafahi et al., 2019 ) and use persistent test cases.

<sub>§5.1 Efficient GCG Adversarial Training</sub>

### 17. Preliminaries.

Given an initial test case x ( 0 ) x^{(0)} and target string t t , GCG optimizes the test case to maximize the probability assigned by an LLM to the target string. Formally, let f θ ​ ( t ∣ x ) f_{\theta}(t\mid x) be the conditional PMF defined by the LLM f f with parameters θ \theta , where t t is a target string and x x is a prompt. Without loss of generality, we assume that there is no chat template for f f . The GCG loss is ℒ GCG = − 1 ⋅ log f θ ( t ∣ x ( i ) ) \mathcal{L}_{\text{GCG}}=-1\cdot\log f_{\theta}(t\mid x^{(i)}) , and the GCG algorithm uses a combination of greedy and gradient-based search techniques to propose x ( i + 1 ) x^{(i+1)} to minimize the loss ( Zou et al., 2023 ) .

<sub>§Preliminaries.</sub>

### 18. Persistent test cases.

Rather than optimizing GCG from scratch in each batch, we use continual optimization on a fixed pool of test cases { ( x 1 , t 1 ) , ( x 2 , t 2 ) , … , ( x N , t N ) } \{(x_{1},t_{1}),(x_{2},t_{2}),\dotsc,(x_{N},t_{N})\} that persist across batches. Each test case in the pool consists of the test case string x i x_{i} and a corresponding target string t i t_{i} . In each batch, we randomly sample n n test cases from the pool, update the test cases on the current model using GCG for m m steps, and then compute the model losses.

<sub>§Persistent test cases.</sub>

### 19. Model Losses.

Our adversarial training method combines two losses: an “away loss” ℒ away \mathcal{L}_{\text{away}} and a “toward loss” ℒ toward \mathcal{L}_{\text{toward}} . The away loss directly opposes the GCG loss for test cases sampled in a batch, and the toward loss trains the model to output a fixed refusal string t refusal t_{\text{refusal}} instead of the target string for test cases sampled in a batch. Formally, we define

<sub>§Model Losses.</sub>

### 20. Full method.

To increase the diversity of test cases generated by GCG, we randomly reset K % K\% of the test cases in the pool every L L model updates. To preserve model utility, we include a standard supervised fine-tuning loss ℒ SFT \mathcal{L}_{\text{SFT}} on an instruction-tuning dataset. Our full method is shown in Algorithm 1 .

<sub>§Full method.</sub>

## 总结与展望
HarmBench 是「自我修改」这个方向缺的那半块基础设施：一套标准化的红队评测，明确要求方法之间可比（同一套行为、同一套判分），并讨论广度与可比性为什么会互相伤害。对我们来说它是一面镜子——我们的链版本之间没有任何可比性保证，A 版本跑三个任务、B 版本跑另外两个，然后凭分数说谁更好。

**It connects to**

- `2506.13131` — AlphaEvolve 用自动评估器保证可比，HarmBench 用统一行为集保证可比；两者都在回答「不同候选怎么放在同一把尺子上」。
- `2202.03057` — 一个用描述符分格保多样性，一个用统一行为集保可比性；自我修改系统需要同时满足这两条，而我们两条都缺。

## 不足之处
**What a reader should still not conclude**

- 它评的是拒绝行为（安全），我们评的是改动是否让测试变绿；「可比」的构造不可直接移植。
- 机制段抽到的是红队任务形式化与广度/可比性两小节的导语，具体攻击方法与分数聚合在别处。

---

# ShinkaEvolve : Towards Open-Ended And Sample-Efficient Program Evolution

arXiv:2509.19349 · 2026 · [source](https://arxiv.org/html/2509.19349)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The rapid advancement of large language models (LLMs) has transformed scientific discovery through agentic systems that autonomously conduct experiments and test hypotheses ( Lu et al., 2024b ; Yamada et al., 2025 ; Novikov et al., 2025 ; Zhang et al., 2025 ) . These frameworks leverage LLMs as sophisticated mutation operators, iteratively refining candidate solutions with successful variants propagating through successive generations. This methodology has proven effective across domains such as competitive programming ( Li et al., 2022 ) , mathematical optimization ( Romera-Paredes et al., 2024 ) , and automated agentic design ( Hu et al., 2024 ) . However, current implementations face significant practical limitations. The primary challenge is substantial sample inefficiency as existing approaches typically require thousands of evaluations, making them computationally expensive and time-consuming. This inefficiency stems from naive exploration strategies that fail to effectively leverage accumulated knowledge from previous generations. Additionally, most leading systems remain closed-source, creating barriers to reproducibility and limiting community-driven improvements. ShinkaEvolve addresses these challenges through three key algorithmic innovations that work synergistically to enhance sample efficiency. Our adaptive parent and LLM sampling intelligently balances exploration of novel regions with exploitation of known high-quality areas. Next, our code proposal novelty rejection sampling ensures efficient program mutations. Finally, our bandit-based LLM ensemble selection strategy dynamically adapts to the evolving state of the sampled archive parents and inspiration programs. Experimental validation across diverse domains demonstrates substantial improvements in both efficiency and solution quality, with ShinkaEvolve achieving state-of-the-art results using orders of magnitude fewer evaluations than existing approaches. By releasing our complete implementation as open-source software, we aim to democratize access to advanced evolutionary discovery tools and enable broad community contributions. In summary:

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Method"]
  N1["§3.1 Parent and inspiration sampling"]
  N2["§3.2 Program mutation and novelty assessment"]
  N3["§3.3 Execution and world feedback"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![ShinkaEvolve Program Novelty Rejection Sampling. ShinkaEvolve embeds mutable code snippets, computes similarities across the archive; if the maximal score exceeds a threshold, another LLM is queried to assess whether the program is meaningfully novel.](https://arxiv.org/html/2509.19349v1/figures/f2_b_rejection.png)

*ShinkaEvolve Program Novelty Rejection Sampling. ShinkaEvolve embeds mutable code snippets, computes similarities across the archive; if the maximal score exceeds a threshold, another LLM is queried to assess whether the program is meaningfully novel.*

<sub>figure: `2509.19349v1/figures/f2_b_rejection.png`</sub>

## 机制
### 1. Method

Algorithm Overview. ShinkaEvolve ’s control-flow entails three main phases: Parent and inspiration sampling from an archive of island program subpopulations. Importantly, we emphasize the trade-off between exploration and exploitation in parent program selection. Program mutation via LLM-guided code edit proposals. We utilize novelty rejection-sampling based on code embedding similarity and an LLM-as-a-novelty-judge assessment. Program execution and world feedback guiding the LLM ensemble selection probabilities and online meta-scratchpad drafting for documentation and knowledge diffusion. Diff-Based Edits. We implement diff edits using LLMs following the approach outlined in Novikov et al. (2025) , utilizing SEARCH/REPLACE blocks for targeted modifications. Full Rewrites. We enable full program rewrites to allow greater flexibility, programmatically ensuring that non-mutable blocks remain unchanged during the LLM rewrite process. Crossover Mutation. We leverage crossover mutations ( Lehman et al., 2022 ; Lange et al., 2025 ) where an additional archive program is sampled and an LLM is prompted to combine programs.

<sub>§3 Method</sub>

### 2. Parent and inspiration sampling

Archive Maintenance, Island Populations & Mutation Context Construction . ShinkaEvolve maintains a fixed-size archive of previously evaluated programs with fitness scores and meta information, implementing an elite size constraint. The mutation context incorporates a primary parent program alongside inspiration programs drawn from top-performing solutions and random archive samples, providing the LLM with diverse exemplars for creative recombination. We follow Romera-Paredes et al. (2024) ; Novikov et al. (2025) and employ an island model approach with independent subpopulations seeded from the same initial program. The islands evolve in parallel to enhance diversity and prevent premature convergence. Island members can occasionally migrate between islands to diffuse knowledge across “discovery substreams”. To protect the uniqueness of each island, we prevent the island-specific best-performing program from migrating ( Tanese, 1989 ; Romera-Paredes et al., 2024 ) . Sampling occurs hierarchically: with the island ID first sampled uniformly from the archive, later used as the origin for both parent and inspirations. Afterwards, we sample random archive programs and the top-K performing programs to use them as context programs. Balancing Exploration & Exploitation: Parent Program Selection . Given an island subpopulation, ShinkaEvolve implements multiple different parent sampling strategies that balance exploration and exploitation: First, we employ power law sampling where programs are ranked by fitness with ranks r i r_{i} ( r i = 1 r_{i}=1 for the best program). The selection probability follows p i = r i − α ∑ j = 1 n r j − α p_{i}=\frac{r_{i}^{-\alpha}}{\sum_{j=1}^{n}r_{j}^{-\alpha}} , where α \alpha controls exploitation intensity. Setting α = 0 \alpha=0 yields uniform sampling, while α → ∞ \alpha\to\infty implements hill-climbing. Inspired by Zhang et al. (2025) , we contrast this with weighted sampling, incorporating performance and novelty. Given programs with offspring count N ⁡ ( P i ) N(P_{i}) , we first compute the median fitness α 0 = median ​ ( { F ⁡ ( P 1 ) , F ⁡ ( P 2 ) , … , F ⁡ ( P n ) } ) \alpha_{0}=\text{median}(\{F(P_{1}),F(P_{2}),...,F(P_{n})\}) . The performance component uses sigmoid scaling: s i = σ ⁡ ( λ ⋅ ( F ⁡ ( P i ) − α 0 ) ) s_{i}=\sigma(\lambda\cdot(F(P_{i})-\alpha_{0})) where σ ⁡ ( x ) = 1 1 + e − x \sigma(x)=\frac{1}{1+e^{-x}} and λ \lambda controls selection pressure. The novelty component h i = 1 1 + N ⁡ ( P i ) h_{i}=\frac{1}{1+N(P_{i})} favors programs with fewer offspring. The final probability combines these: p i = w i ∑ j = 1 n w j p_{i}=\frac{w_{i}}{\sum_{j=1}^{n}w_{j}} where w i = s i ⋅ h i w_{i}=s_{i}\cdot h_{i} balances performance and novelty. The strategies are illustrated in Figure 2 .

<sub>§3.1 Parent and inspiration sampling</sub>

### 3. Program mutation and novelty assessment

LLM-Guided Program Mutations . To generate new programs, ShinkaEvolve starts by sampling a specific LLM and a set of sampling parameters (e.g., temperature or reasoning budget) from a pre-specified pool. Our framework provides support for models from leading API providers, including GPT, Gemini, Claude, and DeepSeek ( OpenAI, 2023 ; Team, 2025 ; Anthropic, 2024 ; Guo et al., 2025 ) . After sampling a model, ShinkaEvolve employs three distinct mutation approaches to foster diversity and creativity in the LLM-generated program variants: Following Novikov et al. (2025) , we use text markers ( EVOLVE-BLOCK-START & EVOLVE-BLOCK-END ) to ensure that immutable code is left unchanged during the LLM rewrite process. After obtaining a code change proposal, we enforce that the immutable code is not touched and resample a new proposal if a patch is invalid, providing parsing feedback using Reflexion ( Shinn et al., 2024 ) . Program Diversity via Novelty Rejection Sampling . To enhance the creativity of executed code proposals, we leverage a foundation model ensemble combined with temperature sampling. Additionally, we introduce code novelty rejection sampling using an embedding model to embed mutable parts of the program code. Afterwards, we compute cosine similarity scores across the island subpopulation programs. If the maximal score exceeds a threshold (e.g., η = 0.95 \eta=0.95 ), we query an LLM to further assess whether the program is meaningfully different. The approach is illustrated in Figure 3 .

<sub>§3.2 Program mutation and novelty assessment</sub>

### 4. Execution and world feedback

Multi-Objective Optimization & Textual Feedback . After a program obtained with the above steps is executed, ShinkaEvolve performs multi-objective assessment yielding both its scalar fitness value r i r_{i} together with a set of exposed “public metrics” and textual feedback. ShinkaEvolve then stores this full multi-objective assessment in the population archive to provide an informative context for future generations of language model mutations using a simple prompting format: Adaptive LLM sampling evolution . The performance of different LLMs to propose mutations can vary across problem domains and based on the current state of the sampled archive parents and inspiration programs. ShinkaEvolve dynamically adapts to this non-stationarity by evolving the LLM sampling probability throughout at the end of each generation. Our approach is based on the UCB1 algorithm ( Auer et al., 2002 ) , associating each LLM with a visitation counter and an estimate of the expected score updated with the performance of its sampled mutations. We introduce changes tailored to the domain of LLM-driven discovery. In particular, rather than the absolute fitness of each mutation r i r_{i} , we update the LLM distribution using: r i u = exp ⁡ ( max ⁡ ( r i − r i b , 0 ) ) − 1 r_{i}^{u}=\exp\!\left(\max(r_{i}-r_{i}^{b},0)\right)-1 , where r i b r_{i}^{b} is the baseline reward for program i i computed as the maximum between its parent program and the initial program in the database, ensuring each LLM is evaluated based on its relative improvement to account for the non-stationarity of the program archive. At the same time, the exp ⁡ ( ⋅ ) \exp(\cdot) and max ⁡ ( ⋅ , 0 ) \max(\cdot,0) operations help precisely promote LLMs able to come up with bold, high-risk, high-reward mutations, over “safer” minor improvements. We use the tracked statistics over the observed rewards to normalize r i u r_{i}^{u} and ensure invariance to the fitness scale of each domain. Meta-Scratchpad & Online Refinement . ShinkaEvolve implements a meta-scratchpad system that periodically analyzes successful solutions to accelerate learning. Every T T generations, we summarize the recent program evaluations and identify common optimization strategies and design principles. The meta-agent synthesizes insights into actionable recommendations appended to the mutation prompt, providing high-level guidance from accumulated evolutionary experience. The approach is illustrated in Figure 4 .

<sub>§3.3 Execution and world feedback</sub>

## 总结与展望
ShinkaEvolve 的核心是「样本效率」：维护一个固定大小的档案，里面是多个岛屿子种群，父代与灵感都从档案里采样，并在变异后做新颖性评估。它对我们最有用的一点是把「档案」当成一个有约束的数据结构（精英规模上限、岛屿划分），而不是一个版本列表——我们的链版本列表从不被重新采样，旧版本只能被读，不能被当作父代。

**It connects to**

- `2506.13131` — AlphaEvolve 的进化数据库也是让旧想法重新浮上来，ShinkaEvolve 把这件事做成显式的岛屿采样并量化了样本效率。
- `2309.16797` — 两者都强调「变异上下文」的构造：谁当父代、给多少灵感，比变异算子本身更影响结果。

## 不足之处
**The authors say:** Our implementation uses fixed configurations with limited automatic control over exploration-exploitation balance, which may vary across domains. Task specification requires manual human expertise for objective functions and evaluation. The framework is constrained to problems with well-defined numerical objectives, limiting its applicability to diverse evaluation domains.

**What a reader should still not conclude**

- 它的适应度是程序在固定测试上的表现，单次评估即可判定；我们的每轮评估都带噪声，岛屿划分要重新设计。
- 机制段抽到的是方法总述与两个子节，新颖性评估的具体度量（嵌入？编辑距离？）不在摘录里。

<sub>§Limitations.</sub>

---

# Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents

arXiv:2505.22954 · 2026 · [source](https://arxiv.org/html/2505.22954)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Scientific progress is cumulative and open-ended, with each breakthrough standing on the shoulders of countless prior insights. In the same way, our most advanced AI systems are built upon a long lineage of innovations. For instance, transformers ( Vaswani et al., 2017 ) , the backbone of current large language models (LLMs) ( Brown et al., 2020 ) , did not emerge in isolation but were built upon years of past innovations, such as recurrent neural networks ( Linnainmaa, 1970 ; Amari, 1972 ; Hopfield, 1982 ; Rumelhart et al., 1985 ) and attention mechanisms ( Schmidhuber and Huber, 1990 ; Bahdanau et al., 2015 ; Kim et al., 2017 ; Parikh et al., 2016 ) . However, most of today’s AI systems remain bound by fixed, human-designed architectures that learn within predefined boundaries, without the capacity to autonomously rewrite their own source code to self-improve. As a result, each advancement in AI development still leans heavily on human interventions, tethering the pace of progress. This paper investigates the intriguing possibility of safely automating the search for ever-better AI. One can imagine an AI system that, like scientific discovery itself, becomes an engine of its own advancement: building upon its past, recursively improving, and propelling itself toward more advanced capabilities.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Experiments"]
  N1["§4.3 Baselines"]
  N0 --> N1
```

![Darwin Gödel Machine. The DGM iteratively builds a growing archive of agents by interleaving self-modification with downstream task evaluation. Agents in the archive are selected for self-modification through open-ended exploration.](https://arxiv.org/html/2505.22954v3/conceptual.png)

*Darwin Gödel Machine. The DGM iteratively builds a growing archive of agents by interleaving self-modification with downstream task evaluation. Agents in the archive are selected for self-modification through open-ended exploration.*

<sub>figure: `2505.22954v3/conceptual.png`</sub>

## 机制
### 1. Experiments

Section 4.1 describes the experimental setup, including the initial coding agent that initializes the DGM. We conduct experiments on two coding benchmarks: SWE-bench ( Jimenez et al., 2024 ) and Polyglot ( Paul Gauthier, 2024 ) ( Section 4.2 ). For each benchmark, we compare the DGM against two baselines: DGM without self-improving agents and DGM without open-ended exploration ( Section 4.3 ). Across all experiments, we find that the DGM outperforms both baselines, showing that the self-improvement mechanism and open-ended exploration are essential for sustained performance gains ( Section 4.4 ). Furthermore, we show that the features discovered by the DGM transfer across models, benchmarks, and tasks ( Section 4.4 ).

<sub>§4 Experiments</sub>

### 2. Baselines

To isolate and evaluate the contribution of the DGM’s core components, we compare the DGM against two baselines: DGM without self-improving agents ( DGM w/o self-improve ) and DGM without open-ended exploration ( DGM w/o open-ended exploration ). DGM w/o self-improve replicates the approach of ADAS ( Hu et al., 2025 ) in this setting, wherein the meta agent responsible for modifying the coding agents remains fixed as the base agent throughout the experiment ( Algorithm 2 ). This baseline allows us to assess the role of iterative self-improvement in accelerating the evolution of better coding agents. DGM w/o open-ended exploration eliminates the use of an archive and always self-modifies the latest stored version of itself ( Algorithm 3 ). If a coding agent self-modifies to the point where it loses the basic functionality required to edit a codebase, it can no longer modify itself or solve any coding task. Therefore, DGM w/o open-ended exploration retains the latest version of itself that still maintains the basic functionality for codebase editing. This baseline allows us to evaluate the impact of having an archive and the well-documented beneficial principles of open-ended exploration ( Clune, 2019 ; Stanley and Lehman, 2015 ; Zhang et al., 2024b ; Fernando et al., 2024 ; Lee et al., 2020 ; Samvelyan et al., 2024 ; Colas et al., 2022b ) in guiding the agent’s evolution. In addition to the learned baselines, we compare the DGM against handcrafted, open-source solutions. For SWE-bench, we take the state-of-the-art (SoTA) open-source solution that has been checked (i.e., the SWE-bench team was able to reproduce the results) ( Section E.4 ). For Polyglot, we take the representative agent (Aider) ( Gauthier, 2024 ) , which is open-sourced and designed to support multiple programming languages and large codebase editing ( Section E.5 ). For a fair comparison, we measure the percentage of solved tasks on the same benchmark subsets used to evaluate the DGM ( Section E.2 , Section E.3 ). These values are shown as dotted horizontal lines in Figure 2 .

<sub>§4.3 Baselines</sub>

## 总结与展望
DGM 是本方向的核心工作：它让 agent 修改自己的代码，用基准分数做选择，把可行的版本存进 archive。论文最有价值的部分是消融——去掉开放式探索，或者去掉自我改进，分别会掉多少。它同时把「评估器可以被改」当成一个必须挡住的漏洞来处理。

**It connects to**

- `2408.08435` — 消融里的对照臂就是 ADAS，所以两者的差距是被同一批实验量出来的。
- `2506.13131` — 两者都用进化数据库，一个改代码一个改算法，评估成本差两个数量级。

## 不足之处
**The authors say:** We introduce the Darwin Gödel Machine (DGM), the first self-improving system powered by FMs with open-ended exploration, where progress on its evaluation benchmarks can directly translate into better self-improvement capabilities. We demonstrate the automatic discovery of better tools and FM systems, resulting in better performance on two benchmarks: SWE-bench and Polyglot. Through self-improvement and open-ended exploration, the DGM shows a continuous increase in performance, bringing us one step closer to self-accelerating, self-improving AI systems.

**What a reader should still not conclude**

- 它的基准（SWE-bench、Polyglot）是固定测试集，改动测试集被明确禁止；我们的 gate 才刚刚能识别「改夹具」。
- 论文的「自我改进」是改自己的源码，我们改的是链的参数与工作流；移植时不能假设同样的收益。

<sub>§6 Conclusion and Limitations</sub>

---

# Evaluating Large Language Models Trained on Code

arXiv:2107.03374 · 2021 · [source](https://arxiv.org/html/2107.03374)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Scalable sequence prediction models ( Graves, 2014 ; Vaswani et al., 2017 ; Child et al., 2019 ) have become a general-purpose method for generation and representation learning in many domains, including natural language processing ( Mikolov et al., 2013 ; Sutskever et al., 2014 ; Dai & Le, 2015 ; Peters et al., 2018 ; Radford et al., 2018 ; Devlin et al., 2018 ) , computer vision ( Van Oord et al., 2016 ; Menick & Kalchbrenner, 2018 ; Chen et al., 2020 ; Bao et al., 2021 ) , audio and speech processing ( Oord et al., 2016 ; Oord et al., 2018 ; Dhariwal et al., 2020 ; Baevski et al., 2020 ) , biology ( Alley et al., 2019 ; Rives et al., 2021 ) , and even across multiple modalities ( Das et al., 2017 ; Lu et al., 2019 ; Ramesh et al., 2021 ; Zellers et al., 2021 ) . More recently, language models have also fueled progress towards the longstanding challenge of program synthesis ( Simon, 1963 ; Manna & Waldinger, 1971 ) , spurred by the presence of code in large datasets ( Husain et al., 2019 ; Gao et al., 2020 ) and the resulting programming capabilities of language models trained on these datasets ( Wang & Komatsuzaki, 2021 ) . Popular language modeling objectives like masked language modeling ( Devlin et al., 2018 ) and span prediction ( Raffel et al., 2020 ) have also been adapted to train their programming counterparts CodeBERT ( Feng et al., 2020 ) and PyMT5 ( Clement et al., 2020 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Evaluation Framework"]
  N1["§2.1 Functional Correctness"]
  N2["§2.3 Sandbox for Executing Generated Programs"]
  N3["§3 Code Fine-Tuning"]
  N4["§3.1 Data Collection"]
  N5["§3.2 Methods"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Pass rates of our models on the HumanEval dataset as a function of model size. When a single sample is generated for each problem, GPT-12B solves no problems, but Codex (fine-tuned on code) solves 28.8% of the problems, and Codex-S (further fine-tuned on correctly implemented standalone functions) solves 37.7% of the problems. From here, further gains can be realized by generating 100 samples per problem and selecting the sample with the highest mean log-probability (44.5% solved) or by selecting the sample that passes the unit tests (77.5% solved). All samples are generated with temperature 0.8.](https://arxiv.org/html/2107.03374v2/figs/codex-main.png)

*Pass rates of our models on the HumanEval dataset as a function of model size. When a single sample is generated for each problem, GPT-12B solves no problems, but Codex (fine-tuned on code) solves 28.8% of the problems, and Codex-S (further fine-tuned on correctly implemented standalone functions) solves 37.7% of the problems. From here, further gains can be realized by generating 100 samples per problem and selecting the sample with the highest mean log-probability (44.5% solved) or by selecting the sample that passes the unit tests (77.5% solved). All samples are generated with temperature 0.8.*

<sub>figure: `2107.03374v2/figs/codex-main.png`</sub>

## 机制
### 1. Evaluation Framework

In this section, we discuss the details of our evaluation framework. We begin by defining the pass@ k k metric, and explain its advantages over standard match-based metrics. Next, we describe the dataset of hand-written problems, called “HumanEval,” which we created in order to benchmark our models. Finally, we discuss the sandbox environment we used to safely execute model-generated code.

<sub>§2 Evaluation Framework</sub>

### 2. Functional Correctness

Generative models for code are predominantly benchmarked by matching samples against a reference solution, where the match can be exact or fuzzy (as in BLEU score). However, recent work has surfaced deficiencies in match-based metrics for code. For instance, Ren et al. (2020) finds that BLEU has problems capturing semantic features specific to code, and suggests several semantic modifications to the score. More fundamentally, match-based metrics are unable to account for the large and complex space of programs functionally equivalent to a reference solution. As a consequence, recent works in unsupervised code translation ( Lachaux et al., 2020 ) and pseudocode-to-code translation ( Kulal et al., 2019 ) have turned to functional correctness instead, where a sample is considered correct if it passes a set of unit tests. We argue that this metric should be applied to docstring-conditional code generation as well. Perhaps the most convincing reason to evaluate functional correctness is that it is used by human developers to judge code. A framework known as test-driven development dictates that software requirements be converted into test cases before any implementation begins, and success is defined by a program that passes these tests. While few organizations employ full test-driven development, integration of new code is usually dependent on creating and passing unit tests. Kulal et al. (2019) evaluate functional correctness using the pass@ k k metric, where k k code samples are generated per problem, a problem is considered solved if any sample passes the unit tests, and the total fraction of problems solved is reported. However, computing pass@ k k in this way can have high variance. Instead, to evaluate pass@ k k , we generate n ≥ k n\geq k samples per task (in this paper, we use n = 200 n=200 and k ≤ 100 k\leq 100 ), count the number of correct samples c ≤ n c\leq n which pass unit tests, and calculate the unbiased estimator Calculating this estimator directly results in very large numbers and numerical instability. In Figure 3 , we include a numerically stable numpy implementation that simplifies the expression and evaluates the product term-by-term. One may be tempted to estimate pass@ k k with 1 − ( 1 − p ^ ) k 1-(1-\hat{p})^{k} where p ^ \hat{p} is the empirical estimate of pass@1, but we show that it is biased in Appendix A . Later, we provide evidence that BLEU score may not be a reliable indicator of functional correctness by showing that functionally inequivalent programs generated by our model (which are guaranteed to disagree with the reference solution on some input) often have higher BLEU scores than functionally equivalent ones.

<sub>§2.1 Functional Correctness</sub>

### 3. Sandbox for Executing Generated Programs

Since publicly available programs have unknown intent and generated programs are often incorrect, executing these programs poses a security risk. Indeed, GitHub is known to contain malicious programs that alter or change their environments ( Rokon et al., 2020 ) . Therefore, we developed a sandbox environment to safely run untrusted programs against unit tests. Our goals were to prevent these programs from modifying, gaining persistence on, accessing sensitive resources on, or exfiltrating data from a host or network. Since OpenAI’s training infrastructure is built on Kubernetes and cloud services, we designed our sandbox to address the limitations of these environments while remaining idiomatic with their patterns of use. We selected the gVisor container runtime ( Lacasse, 2018 ) as the main host protection component. Since container runtimes like Docker can share host resources with containers, a malicious container could potentially compromise a host. gVisor protects the host by emulating its resources to introduce a security boundary between the host and its containers. Network-adjacent hosts and services are protected by eBPF-based firewall rules that prevent inbound and outbound connections except for those required for experiment control.

<sub>§2.3 Sandbox for Executing Generated Programs</sub>

### 4. Code Fine-Tuning

We fine-tune GPT models containing up to 12B parameters on code to produce Codex. In contrast with GPT, Codex displays non-trivial performance on the HumanEval dataset. In fact, Codex is able to solve the majority of the problems in HumanEval if we generate and evaluate 100 samples per problem, and pick one that passes unit tests. When limited to a budget of one evaluation per problem, producing multiple samples with Codex and choosing the one with the highest mean log-probability provides significant gains. In coding competitions and in the APPS datasets, tasks are provided with 3 input/output examples included in the task description. We utilize this by sampling 1000 solutions from the model and filtering out only those that pass these 3 unit tests (if such solutions exist). We then calculate pass rates in this filtered set, and call it filtered pass@ k k . Results without filtering are presented as raw pass@ k k . It is often the case both in coding competitions and in the results from Codex that a correct solution is found, but it is not algorithmically efficient enough to be considered passing. While this is not acceptable in the competitions, we also report the number of solutions that Codex produces that do not fail on any unit test, but that do time-out on some of them. We use a timeout of 3 seconds in our evaluation.

<sub>§3 Code Fine-Tuning</sub>

### 5. Data Collection

Our training dataset was collected in May 2020 from 54 million public software repositories hosted on GitHub, containing 179 GB of unique Python files under 1 MB. We filtered out files which were likely auto-generated, had average line length greater than 100, had maximum line length greater than 1000, or contained a small percentage of alphanumeric characters. After filtering, our final dataset totaled 159 GB.

<sub>§3.1 Data Collection</sub>

### 6. Methods

Since Codex is evaluated on natural language prompts, we hypothesized that it would be beneficial to fine-tune from the GPT-3 ( Brown et al., 2020 ) model family, which already contains strong natural language representations. Surprisingly, we did not observe improvements when starting from a pre-trained language model, possibly because the fine-tuning dataset is so large. Nevertheless, models fine-tuned from GPT converge more quickly, so we apply this strategy for all subsequent experiments. We train Codex using the same learning rate as the corresponding GPT model, with a 175 step linear warmup and cosine learning rate decay. We train for a total of 100 billion tokens, using the Adam optimizer with β 1 = 0.9 \beta_{1}=0.9 , β 2 = 0.95 \beta_{2}=0.95 , ϵ = 10 − 8 \epsilon=10^{-8} , and a weight decay coefficient of 0.1 0.1 . In order to maximally leverage text representations from GPT, we base our code lexer on the GPT-3 text tokenizer. Since the distribution of words in GitHub code differs from that of natural text, this tokenizer is not very effective for representing code. The largest source of inefficiency arises from encoding whitespace, so we add an additional set of tokens for representing whitespace runs of different lengths. This allows us to represent code using approximately 30% fewer tokens. To compute pass@ k k , we assemble each HumanEval problem into a prompt consisting of a header, a signature, and a docstring, which is illustrated in Figure 2 . We sample tokens from Codex until we encounter one of the following stop sequences: ‘ \nclass ’, ‘ \ndef ’, ‘ \n# ’, ‘ \nif ’, or ‘ \nprint ’, since the model will continue generating additional functions or statements otherwise. We use nucleus sampling ( Holtzman et al., 2020 ) with top p = 0.95 p=0.95 for all sampling evaluation in this work.

<sub>§3.2 Methods</sub>

## 总结与展望
Codex 论文在这里不是讲代码，而是讲「用通过率当适应度」这件事的鼻祖做法：在固定测试集上跑单元测试，把通过率当作信号。它同时暴露了这条路线的天花板：适应度函数一旦固定，被优化的就是它。

**It connects to**

- `2505.22954` — DGM 直接继承这个评估方式，并把「测试集能不能被改」变成一个必须挡住的漏洞。

## 不足之处
**The authors say:** While Codex is able to sample correct solutions for the majority of HumanEval problems, we find that it has a number of limitations.

**What a reader should still not conclude**

- 论文的适应度是在留出测试上测的，但留出集是固定的；我们这边的 holdout 池往往只有一两个任务。
- 它没有讨论评估器被优化的情形，Goodhart 的讨论在别的文献里。

<sub>§6 Limitations</sub>

---

# Evolution of Heuristics: Towards Efficient Automatic Algorithm Design Using Large Language Model

arXiv:2401.02051 · 2024 · [source](https://arxiv.org/html/2401.02051)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Heuristics are commonly used for tackling complex search and optimization problems. Over the last several decades, much effort has been devoted to designing effective heuristics, leading to simulated annealing ( Van Laarhoven et al., 1987 ) , tabu search ( Glover & Laguna, 1998 ) , and iterated local search ( Lourenço et al., 2003 ) , among many other methods ( Mart et al., 2018 ) . These hand-crafted methods have been successfully used in a wide spectrum of real-world applications. However, different applications may require different algorithms and/or algorithm configurations. Manually designing, modifying, and configuring a heuristic for a given problem can be very labor-intensive and demands rich expert experience. This is a bottleneck in many application domains. To address this issue, Automatic Heuristic Design (AHD) has been proposed and become an active research area ( Burke et al., 2013 ; Stützle & López-Ibáñez, 2019 ) . AHD selects, tunes, or constructs effective heuristics for a given problem class automatically. Genetic Programming (GP) has been used in AHD ( Langdon & Poli, 2013 ; Zhang et al., 2023 ) . GP requires a set of permissible primitives or mutation operations for defining and generating heuristics. It could be very difficult to construct a suitable set in practice ( O’Neill et al., 2010 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Experiments"]
  N1["§4.1 Experimental Settings"]
  N2["§Implementation details."]
  N3["§Online bin packing."]
  N4["§Traveling salesman."]
  N5["§Flow shop scheduling."]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Heuristic design often (a) relies on human expertise with reasoning over thoughts; recent progress has been made on (b) search over the space of codes; while (c) our method evolves both thoughts and codes using large language models.](https://arxiv.org/html/2401.02051v3/teaser1.png)

*Heuristic design often (a) relies on human expertise with reasoning over thoughts; recent progress has been made on (b) search over the space of codes; while (c) our method evolves both thoughts and codes using large language models.*

<sub>figure: `2401.02051v3/teaser1.png`</sub>

## 机制
### 1. Experiments

Online bin packing problem . The objective is to allocate a collection of items of different sizes into the fewest possible bins with a fixed capacity C C . We focus on the online scenario ( Seiden, 2002 ) , where items are packed as they arrive, in contrast to the offline scenario where all items are known beforehand. The instances that are used for evaluation during heuristic evolution are five Weibull instances of size 5k with a capacity of 100 ( Romera-Paredes et al., 2024 ) . The fitness value is set as the average l ​ b n \frac{lb}{n} on the five instances, where l ​ b lb represents the lower bound of the optimal number of bins computed as in Martello & Toth (1990) and n n is the number of bins used to pack all the items by the evaluated heuristic. human hand-crafted heuristics: the first fit and best fit heuristics ( Romera-Paredes et al., 2024 ) . The first fit heuristic assigns the incoming item to the first bin that has sufficient available space, while the best fit heuristic selects the bin with the least available space that can still accommodate the item. heuristics generated automatically: FunSearch ( Romera-Paredes et al., 2024 ) is considered due to its excellent performance. We directly use the heuristic generated by FunSearch ( Romera-Paredes et al., 2024 ) for comparison. Traveling Salesman Problem (TSP) ( Matai et al., 2010 ) . It is to find the shortest route to visit all the given locations once and return to the starting location. It is one of the most widely-studied combinatorial optimization problems and a commonly used test bed for heuristics. The heuristic evolution process is conducted on a set of 64 TSP100 instances. The locations in these instances are randomly sampled from [ 0 , 1 ] 2 [0,1]^{2} ( Kool et al., 2018 ) . The average gap from the optimal solution (which is generated by Concorde ( Applegate et al., 2006 ) ) is used as the fitness value. hand-crafted heuristics: The nearest insertion ( Rosenkrantz et al., 1977 ) and farthest insertion ( Rosenkrantz et al., 1977 ) , two commonly used constructive heuristics are used in comparison. Google Or-Tools ( Perron & Furnon, ) , one of the most popular solvers is also used. We use the default settings of Or-Tools and the local search option suggested in OR-Tools to improve the solution quality. The stopping criterion is 60s for each instance. heuristics designed automatically by AI methods: they are the attention model (AM) ( Kool et al., 2018 ) , POMO ( Kwon et al., 2020 ) and LEHD ( Luo et al., 2023 ) . AM ( Kool et al., 2018 ) is a seminal and well-known method for using neural networks to learn heuristics for combinatorial optimization. POMO ( Kwon et al., 2020 ) adopts AM ideas and achieves state-of-the-art results. LEHD ( Luo et al., 2023 ) is a new revision of AM with a different heavy decoder structure and is trained using supervised learning. Flow Shop Scheduling Problem (FSSP) ( Emmons & Vairaktarakis, 2012 ) . It is to schedule n n jobs on m m machines, where each job contains m m operations that must be performed in a predetermined order on the respective machine. The objective is to minimize the total schedule length, known as the makespan. In the perturbation flow-shop scheduling problem, the processing order remains consistent throughout each step and no machine can execute multiple operations simultaneously. During heuristic evolution, we conduct evolution on 64 randomly generated instances. Each instance consists of 50 jobs and 2 to 20 machines. The processing times of the jobs are randomly generated from a uniform distribution ranging from 0 to 1 ( Pan et al., 2021 ) . The average makespan serves as the fitness value. hand-crafted heuristics: They are GUPTA ( Gupta, 1971 ) , CDS ( Campbell et al., 1970 ) NEH ( Nawaz et al., 1983 ) and NEHFF ( Fernandez-Viagas & Framinan, 2014 ) . GUPTA ( Gupta, 1971 ) and CDS ( Campbell et al., 1970 ) are two classic methods for flow-shop scheduling. NEH ( Nawaz et al., 1983 ) and NEHFF ( Fernandez-Viagas & Framinan, 2014 ) are widely recognized efficient heuristics for this problem. heuristics designed automatically: PFSPNet and PFSPNet_NEH ( Pan et al., 2021 ) are used. They are two recently proposed end-to-end deep learning solvers for flow-shop scheduling. Online bin packing . We adopt the settings in Romera-Paredes et al. (2024) to design heuristics to determine the suitable bin allocation for incoming items ( Angelopoulos et al., 2023 ) . Specifically, the task for EoH is to design the scoring function for assigning items. The inputs are the size of the item and the rest capacities of bins. The output is the scores for the bins. The item will be assigned to the bin with the maximum score. Traveling salesman . We use EoH to design Guided Local Search (GLS) heuristics ( Alsheddy et al., 2018 ) . GLS is a strategy to help a local search to escape local optimal solutions. A key issue in GLS heuristics is how to update the objective function (i.e. landscape) to guide the local search to move to more promising areas. Noting that the landscape is primarily determined by the distance matrix, the goal of EoH is to produce a method for updating the distance matrix. Following ( Alsheddy et al., 2018 ; Arnold & Sörensen, 2019 ) , the inputs are the distance matrix, the current route, and the number of edges. The output is an updated distance matrix. GLS runs local search operators on updated landscapes iteratively. Two local search operators used in our experiments are the relocate and 2-opt operators. A detailed introduction of the GLS heuristics is presented in the Appendix . Flow shop scheduling . We use the EoH to produce a heuristic for updating the objective landscape in GLS for this problem. The inputs in the heuristic are the time matrix, current scheduling, and the number of machines and jobs. The outputs are the updated time matrix and the calculated job perturbation priority. The local search operators used are the relocate and swap operators. EoH-e1: it doesn’t use the three modification prompt strategies and E2, i.e. It uses only E1. EoH-e2: it doesn’t use the three modification prompt strategies, i.e. It uses only E1 and E2. EoC: it is the code-only variant of EoH. It doesn’t include the thought part (i.e. the description of the heuristic in natural language). EoC only uses E1 (without linguistic description) to generate new codes. The number of parents p = 5 p=5 . On average, EoH performs the best and EoH-e2 performs the second best. This implies that M 1 , M 2 , M 3 M_{1},M_{2},M_{3} , and E 2 E_{2} do make positive contribution to the performance of EoH. EoC performs the worst or the second worst on these test instances. It implies that the thought part in EoH is also very beneficial.

<sub>§4 Experiments</sub>

### 2. Implementation details.

In our experiments, the number of generations in EoH for all problems is set to 20. The population size is 20 for online bin packing and 10 for TSP and FSSP. The number of parent heuristics used in E1 and E2 is p = 5 p=5 . The GPT-3.5-turbo pre-trained LLM is used. For TSP and FSSP, the maximum number of iterations for local search is set to 1,000, and the maximum running time for each instance is 60 seconds. The entire framework and the implementations of EoH on the three problems are implemented in Python and executed on a single CPU i7-9700.

<sub>§Implementation details.</sub>

### 3. Online bin packing.

We visualize the evolution of EoH for the online bin packing problem in Figure 2 . We outline the key thoughts and the corresponding codes of the best heuristic found in some generations in the evolution process. We also list the prompt strategies that generate the thoughts and codes. The fitness value (objective) increases from 0.962 to 0.993 in 20 generations, which involves 2,000 LLM queries. As shown in Figure 2 , in comparison to the best fit heuristic, the heuristics designed by both FunSearch and EoH are sophisticated. The best heuristic found by EoH is a hybrid function with multiple components. It consists of remaining capacities, exponent term of remaining capacities, square root term of remaining capacities, and their combinations. It is the result of evolution. An example of the heuristic design using E2 prompt strategy is detailed in the Appendix B.2 . We test the best heuristic produced by EoH on instances of various sizes and capacities and compare it with two hand-crafted heuristics (i.e., first and best fit), and the best heuristic produced by FunSearch. The problem size ranges from 1k to 10k and the capacities are 100 and 500. Each set includes 5 randomly generated instances. Table 1 presents the average gaps to the lower bounds, where the best results are highlighted in bold. Our method is the best except for the results on the 10k_C100 set (instances with a problem size of 10k and a capacity of 100). EoH makes only a few thousands of LLM queries, which is much faster than FunSearch (around 1 million queries reported in Romera-Paredes et al. (2024) ). Furthermore, our method achieves the same best gap in the training distribution and demonstrates excellent generalization performance to out-of-distribution instances. For instance, on the instance set with 1k items and a capacity of 500, FunSearch performs worse than two hand-crafted heuristics, whereas our method achieves the best gap of 2.13%. More results are provided in the Appendix B.4

<sub>§Online bin packing.</sub>

### 4. Traveling salesman.

Figure 3 (a) illustrates the evolution process of heuristics in EoH for TSP. The y-axis represents the gap (%) to the optimal solution and the x-axis represents the number of generations. Each blue data point represents a GLS heuristic produced by EoH. Every population consists of 10 heuristics. The red curve shows how the performance of the best heuristic found at each generation is improved. The orange curve shows the average performance of the population at each generation. It is clear that EoH converges after about 20 generations. We list the gap (%) to the best-known solutions on six instances from TSPLib ( Reinelt, 1991 ) in Table 2 . Comprehensive evaluation on other TSP instances and comparison with some other heuristics including hand-crafted GLS algorithms are provided in the Appendix C.4 . It should be pointed out that the heuristics produced by EoH consistently outperform other heuristics on all test instances. Notably, for pr124, kroA150, and u159, the EoH heuristic finds the best-known solutions (i.e., gap= 0%). OR-Tools works well on average. However, its performance on large instances becomes worse perhaps due to the limited running time. The neural solvers are trained on the instances from a uniform distribution, which is the same as those used in EoH for fitness evaluation. These solvers can generate high-quality solutions on the instances from the same distribution. However, they deteriorate on out-of-distribution instances, such as the TSPLib instances. In contrast, the heuristic designed by EoH works well on these out-of-distribution instances.

<sub>§Traveling salesman.</sub>

### 5. Flow shop scheduling.

Figure 3 (b) depicts the evolution process of heuristics on FSSP, demonstrating that it converges in about 20 generations. Table 3 lists the experimental results of different heuristics on Taillard instances with the number of jobs ( n n ) ranging from 20 to 100 and the number of machines ( m m ) ranging from 10 to 20. The table displays the average gap (%) to the upper bound provided in Taillard (1993) . Each set consists of 10 instances. The best results are highlighted in bold. EoH produces the best results on all the test sets among all the heuristics. More results can be found in the Appendix D.3 .

<sub>§Flow shop scheduling.</sub>

## 总结与展望
EoH 让 LLM 直接写启发式：种群里每个个体是「想法 + 代码」，20 代、种群 10–20、用 GPT-3.5 驱动，在装箱、TSP、流水车间上验证。它对我们的价值是那句自陈的局限：只保留代码、不保留自然语言的想法，就无法解释为什么某个启发式有效。我们的链版本恰恰相反——只有 spec 与一句 rationale，没有可执行的产物可供检验。

**It connects to**

- `2309.16797` — 两者都是「让 LLM 当变异算子」，区别是 EoH 变异的是启发式程序、Promptbreeder 变异的是提示。
- `1504.04909` — MAP-Elites 用描述符分格保多样性，EoH 用种群大小保多样性；两者都承认「只留最好的一个」会让搜索塌掉。

## 不足之处
**The authors say:** C2C: It uses only code to represent a heuristic. There is no natural language (thought) representation.

**What a reader should still not conclude**

- 它的评估是确定性的（启发式在固定实例上的目标值），重跑同一个个体会得到同一个分；我们的不是。
- 机制段抽到的是实验设置与最后一句局限，变异与选择的提示模板不在摘录里。

<sub>§5 Discussion and Future Works</sub>

---

# Voyager : An Open-Ended Embodied Agent with Large Language Models

arXiv:2305.16291 · 2023 · [source](https://arxiv.org/html/2305.16291)

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

![Skill library. Top: Adding a new skill. Each time GPT-4 generates and verifies a new skill, we add it to the skill library, represented by a vector database. The key is the embedding vector of the program description (generated by GPT-3.5), while the value is the program itself. Bottom: Skill retrieval. When faced with a new task proposed by the automatic curriculum, we first leverage GPT-3.5 to generate a general suggestion for solving the task, which is combined with environment feedback as the query context. Subsequently, we perform querying to identify the top-5 relevant skills.](https://arxiv.org/html/2305.16291v2/skill_library_fig.png)

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
Voyager 的技能库是「可执行代码 + 自然语言描述」的二元组，这让技能可以被程序化验证、复用与组合，也让「自动课程」有了可以逐级加难的支点。它在自我修改方向里的位置是：改的不是自己的权重也不是自己的代码，而是自己的技能库。

**It connects to**

- `2505.22954` — DGM 改的是 agent 自己的代码，Voyager 改的是技能库；两者的评估器都是「跑得通吗」。

## 不足之处
**The authors say:** Cost. The GPT-4 API incurs significant costs. It is 15 × 15\times more expensive than GPT-3.5. Nevertheless, Voyager requires the quantum leap in code generation quality from GPT-4 (Fig. 9 ), which GPT-3.5 and open-source LLMs cannot provide [ 60 ] .

**What a reader should still not conclude**

- 技能是 Minecraft 里的短程序，正确性判定近乎确定；我们的「技能」是一条自然语言经验，没有编译器。
- 论文的课程推进由环境反馈驱动，我们这边的「任务集」是固定的，这一层机制在我们这里没有对应物。

<sub>§4 Limitations and Future Work</sub>

---

# Gemini 2.5: Pushing the Frontier with Advanced Reasoning, Multimodality, Long Context, and Next Generation Agentic Capabilities

arXiv:2507.06261 · 2025 · [source](https://arxiv.org/html/2507.06261)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
We present our latest family of natively multimodal models with advanced reasoning through thinking, long context and tool-use capabilities: Gemini 2.5 Pro and 2.5 Flash and our earlier Gemini 2.0 Flash and Gemini 2.0 Flash-Lite models. Together these form a new family of highly-capable models representing our next generation of AI models, designed to power a new era of agentic systems. Building upon the foundation of the Gemini 1.5 series ( Gemini Team, 2024 ) , this Gemini 2.X generation brings us closer to the vision of a universal AI assistant ( Hassabis, 2025 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Model Architecture, Training and Dataset"]
  N1["§2.1 Model Architecture"]
  N2["§2.2 Dataset"]
  N3["§2.3 Training Infrastructure"]
  N4["§2.4 Post-training"]
  N5["§2.5 Thinking"]
  N6["§2.6 Capability-specific improvements"]
  N7["§Code"]
  N8["§Factuality"]
  N9["§Long context"]
  N10["§Multilinguality"]
  N11["§Audio"]
  N12["§Video"]
  N13["§Gemini as an Agent: Deep Research"]
  N14["§2.7 The path to Gemini 2.5"]
  N15["§Gemini 2.0 Pro"]
  N16["§Gemini 2.0 Flash Native Image Generation Model"]
  N17["§Gemini 2.5 Audio Generation"]
  N18["§Gemini 2.5 Flash-Lite"]
  N19["§Gemini 2.5 Pro Deep Think"]
  N20["§5 Safety, Security, and Responsibility"]
  N21["§Guideline for Navigating This Section"]
  N22["§5.1 Our Process"]
  N23["§5.2 Policies and Desiderata"]
  N24["§Safety policies"]
  N25["§Desiderata, aka “helpfulness”"]
  N26["§5.3 Training for Safety, Security, and Responsibility"]
  N27["§5.5 Automated Red Teaming"]
  N28["§For Safety"]
  N29["§For Security"]
  N30["§5.6 Memorization and Privacy"]
  N31["§Discoverable Memorization"]
  N32["§Extractable Memorization and Divergence"]
  N33["§Baseline Assurance"]
  N34["§CBRN"]
  N35["§Cybersecurity"]
  N36["§Machine Learning R&D"]
  N37["§Deceptive Alignment"]
  N38["§Frontier Safety: Summary"]
  N39["§5.8 External Safety Testing"]
  N40["§Autonomous systems risks"]
  N41["§Cyber misuse risks"]
  N42["§Cybersecurity risks"]
  N43["§Indirect Prompt Injections"]
  N44["§CBRN risks"]
  N45["§Chemical and Biological risks"]
  N46["§Radiological and Nuclear risks"]
  N47["§Societal risks"]
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
  N21 --> N22
  N22 --> N23
  N23 --> N24
  N24 --> N25
  N25 --> N26
  N26 --> N27
  N27 --> N28
  N28 --> N29
  N29 --> N30
  N30 --> N31
  N31 --> N32
  N32 --> N33
  N33 --> N34
  N34 --> N35
  N35 --> N36
  N36 --> N37
  N37 --> N38
  N38 --> N39
  N39 --> N40
  N40 --> N41
  N41 --> N42
  N42 --> N43
  N43 --> N44
  N44 --> N45
  N45 --> N46
  N46 --> N47
```

![Impact of “Thinking” on Gemini’s performance on AIME 2025 ( Balunović et al., 2025 ) , LiveCodeBench (corresponding to 10/05/2024 - 01/04/2025 in the UI) ( Jain et al., 2024 ) and GPQA diamond ( Rein et al., 2024 ) benchmarks.](https://arxiv.org/html/2507.06261v6/gemini_thinking_comparison.svg)

*Impact of “Thinking” on Gemini’s performance on AIME 2025 ( Balunović et al., 2025 ) , LiveCodeBench (corresponding to 10/05/2024 - 01/04/2025 in the UI) ( Jain et al., 2024 ) and GPQA diamond ( Rein et al., 2024 ) benchmarks.*

<sub>figure: `2507.06261v6/gemini_thinking_comparison.svg`</sub>

## 机制
### 1. Model Architecture, Training and Dataset

Slice-Granularity Elasticity : Our system now automatically continues training with fewer “slices” of TPU chips when there is a localized failure, and this reconfiguration results in tens of seconds of lost training time per interruption, compared with the 10 or more minute delay waiting for healthy machines to be rescheduled without elasticity; the system continues training at around 97% throughput while the failed slice is recovering. At the scale of this training run we see interruptions from hardware failures multiple times per hour, but our fault tolerance machinery is designed to tolerate the higher failure rates expected at much larger scales. Split-Phase SDC Detection : On previous large-scale runs it could take many hours to detect and localize machines with SDC errors, requiring both downtime while debugging, and rollback/replay of a large number of potentially corrupt training steps. We now use lightweight deterministic replay to immediately repeat any step with suspicious metrics, and compare per-device intermediate checksums to localize the root cause of any data corruption. Empirically, accelerators that start to exhibit intermittent SDCs are identified within a few minutes, and quickly excluded from the job. During this run, around 0.25% of steps were replayed due to suspected SDCs and 6% of these replays turned out to be genuine hardware corruption.

<sub>§2 Model Architecture, Training and Dataset</sub>

### 2. Model Architecture

The Gemini 2.5 models are sparse mixture-of-experts (MoE) ( Clark et al., 2022 ; Du et al., 2021 ; Fedus et al., 2021 ; Lepikhin et al., 2020 ; Shazeer et al., 2017 ; Roller et al., 2021 ; Riquelme et al., 2021 ; Jiang et al., 2024 ) transformers ( Vaswani et al., 2017 ) with native multimodal support for text, vision, and audio inputs. Sparse MoE models activate a subset of model parameters per input token by learning to dynamically route tokens to a subset of parameters (experts); this allows them to decouple total model capacity from computation and serving cost per token. Developments to the model architecture contribute to the significantly improved performance of Gemini 2.5 compared to Gemini 1.5 Pro (see Section 3 ). Despite their overwhelming success, large transformers and sparse MoE models are known to suffer from training instabilities ( Chowdhery et al., 2022 ; Dehghani et al., 2023 ; Zhang et al., 2022 ; Molybog et al., 2023 ; Wortsman et al., 2023 ; Liu et al., 2020 ; Zhai et al., 2023 ; Fedus et al., 2021 ; Lepikhin et al., 2020 ) . The Gemini 2.5 model series makes considerable progress in enhancing large-scale training stability, signal propagation and optimization dynamics, resulting in a considerable boost in performance straight out of pre-training compared to previous Gemini models. Gemini 2.5 models build on the success of Gemini 1.5 in processing long-context queries, and incorporate new modeling advances allowing Gemini 2.5 Pro to surpass the performance of Gemini 1.5 Pro in processing long context input sequences of up to 1M tokens (see Table 3 ). Both Gemini 2.5 Pro and Gemini 2.5 Flash can process pieces of long-form text (such as the entirety of “Moby Dick” or “Don Quixote”), whole codebases, and long form audio and video data (see Appendix 8.5 ). Together with advancements in long-context abilities, architectural changes to Gemini 2.5 vision processing lead to a considerable improvement in image and video understanding capabilities, including being able to process 3-hour-long videos and the ability to convert demonstrative videos into interactive coding applications (see our recent blog post by Baddepudi et al., 2025 ). The smaller models in the Gemini 2.5 series — Flash size and below — use distillation ( Hinton et al., 2015 ; Anil et al., 2018 ) , as was done in the Gemini 1.5 series ( Gemini Team, 2024 ) . To reduce the cost associated with storing the teacher’s next token prediction distribution, we approximate it using a k-sparse distribution over the vocabulary. While this still increases training data throughput and storage demands by a factor of k, we find this to be a worthwhile trade-off given the significant quality improvement distillation has on our smaller models, leading to high-quality models with a reduced serving cost (see Figure 2 ).

<sub>§2.1 Model Architecture</sub>

### 3. Dataset

Our pre-training dataset is a large-scale, diverse collection of data encompassing a wide range of domains and modalities, which includes publicly available web documents, code (various programming languages), images, audio (including speech and other audio types) and video, with a cutoff date of June 2024 for 2.0 and January 2025 for 2.5. Compared to the Gemini 1.5 pre-training dataset we also utilized new methods for improved data quality for both filtering, and deduplication. Our post-training dataset, like Gemini 1.5, consists of instruction tuning data that is carefully collected and vetted. It is a collection of multimodal data with paired instructions and responses, in addition to human preference and tool-use data.

<sub>§2.2 Dataset</sub>

### 4. Training Infrastructure

This model family is the first to be trained on TPUv5p architecture. We employed synchronous data-parallel training to parallelise over multiple 8960-chip pods of Google’s TPUv5p accelerators, distributed across multiple datacenters. The main advances in software pre-training infrastructure compared with Gemini 1.5 were related to elasticity and mitigation of SDC (Silent Data Corruption) errors: Both of the above techniques were relatively simple to implement due to the single-controller design of the Pathways system ( Barham et al., 2022 ) , which allows all accelerators to be coordinated from a single python program with a global view of the system state. The controller can make use of parallel ‘remote python’ operations on TPU workers to monitor training metrics, track performance stragglers, and root-cause SDC errors. Overall during the run, 93.4% of the time was spent performing TPU computations; the remainder was approximately spent half in elastic reconfigurations, and half in rare tail cases where elasticity failed. Around 4.5% of the computed steps were replays or rollbacks for model debugging interventions.

<sub>§2.3 Training Infrastructure</sub>

### 5. Post-training

Since the initial announcement of Gemini 1.5, significant advancements have been made in our post-training methodologies, driven by a consistent focus on data quality across the Supervised Fine-Tuning (SFT), Reward Modeling (RM), and Reinforcement Learning (RL) stages. A key focus has been leveraging the model itself to assist in these processes, enabling more efficient and nuanced quality control. Furthermore, we have increased the training compute allocated to RL, allowing deeper exploration and refinement of model behaviors. This has been coupled with a focus on verifiable rewards and model-based generative rewards to provide more sophisticated and scalable feedback signals. Algorithmic changes to the RL process have also improved stability during longer training. These advancements have enabled Gemini 2.5 to learn from more diverse and complex RL environments, including those requiring multi-step actions and tool use. The combination of these improvements in data quality, increased compute, algorithmic enhancements, and expanded capabilities has contributed to across-the-board performance gains (as described in Section 3 ) , notably reflected in the significant increase in the model’s LMArena Elo scores, with both Gemini 2.5 Flash and Pro gaining more than 110 points over their Gemini 1.5 counterparts (122 for Gemini 2.5 Pro and 111 for Gemini 2.5 Flash, see Figure 1 ), along with significant improvements on several other frontier benchmarks.

<sub>§2.4 Post-training</sub>

### 6. Thinking

Past Gemini models produce an answer immediately following a user query. This constrains the amount of inference-time compute (Thinking) that our models can spend reasoning over a problem. Gemini Thinking models are trained with Reinforcement Learning to use additional compute at inference time to arrive at more accurate answers. The resulting models are able to spend tens of thousands of forward passes during a “thinking” stage, before responding to a question or query. Our training recipe has evolved from the original experimental thinking model, Gemini 2.0 Flash Thinking (launched in December 2024), to the Gemini 2.5 Thinking series, which incorporates Thinking natively across all domains. The result is a single model that can achieve stronger reasoning performance across the board, and is able to scale up its performance further as a function of inference time (see Figure 3 for an example of the impact of Thinking). We integrated Thinking with other Gemini capabilities, including native multimodal inputs (images, text, video, audio) and long context (1M+ tokens). For any of these capabilities, the model decides for itself how long to think before providing an answer. We also provide the ability to set a Thinking budget, constraining the model to respond within a desired number of tokens. This allows users to trade off performance with cost. To demonstrate this capability, we conducted experiments where we systematically varied the thinking budget, measured in the number of tokens the model is allowed to use for internal computation. As shown in Figure 4 , increasing this budget allows the model to scale its performance and achieve significantly higher accuracy.

<sub>§2.5 Thinking</sub>

### 7. Capability-specific improvements

While most of the changes made to our training architecture and recipe since Gemini 1.5 have resulted in improvements across all capabilities, we have also made changes that have resulted in some capability-specific wins. We will now discuss these for code, factuality, long context, multilinguality, audio, video, and agentic use cases (with a particular focus on Gemini Deep Research).

<sub>§2.6 Capability-specific improvements</sub>

### 8. Code

Gemini 2.0 and 2.5 represent a strategic shift of our development priorities towards delivering tangible real-world value, empowering users to address practical challenges and achieve development objectives within today’s complex, multimodal software environments. To realize this, concerted efforts have been undertaken across both pre-training and post-training phases since Gemini 1.5. In pre-training, we intensified our focus on incorporating a greater volume and diversity of code data from both repository and web sources into the training mixture. This has rapidly expanded coverage and enabled the development of more compute-efficient models. Furthermore, we have substantially enhanced our suite of evaluation metrics for assessing code capabilities aligned with downstream use cases, alongside improving our ability to accurately predict model performance. During post-training, we developed novel training techniques incorporating reasoning capabilities and curated a diverse set of engineering tasks, with the aim to equip Gemini with effective problem-solving skills crucial for addressing modern engineering challenges. Key applications demonstrating these advancements include IDE functionalities, code agent use cases for complex, multi-step operations within full repositories, and multimodal, interactive scenarios such as end-to-end web and mobile application development. Collectively, these efforts have yielded broad and significant improvements in Gemini’s coding capabilities. This progress is evidenced by superior performance on established benchmarks: performance on LiveCodeBench ( Jain et al., 2024 ) increased from 30.5% for Gemini 1.5 Pro to 74.2% for Gemini 2.5 Pro, while that for Aider Polyglot ( Gauthier, 2025 ) went from 16.9% to 82.2%. Performance on SWEBench-verified ( Jimenez et al., 2024 ; Chowdhury et al., 2024 ) went from 34.2% to 67.2%, see Table 3 and Figure 5 in Section 3.2 . Furthermore, Gemini 2.5 Pro obtained an increase of over 500 Elo over Gemini 1.5 Pro on the LMArena WebDev Arena ( LMArena Team, 2025 ; Chiang et al., 2024 ) , resulting in meaningful enhancements in practical applications, including UI and web application development ( Doshi, 2025a ) , and the creation of sophisticated agentic workflows ( Kilpatrick, 2025 ) .

<sub>§Code</sub>

### 9. Factuality

Within the context of generative models, ensuring the factuality of model responses to information-seeking prompts remains a core pillar of Gemini model development. With Gemini 1.5, our research was concentrated on enhancing the model’s world knowledge and its ability to provide answers faithfully grounded in the context provided within the prompt. This effort culminated in the December 2024 release of FACTS Grounding ( Jacovi et al., 2025 ) , now an industry-standard benchmark for evaluating an LLM’s capacity to generate responses grounded in user-provided documents. With Gemini 2.0 and 2.5, we have significantly expanded our scope to address multimodal inputs, long-context reasoning, and model-retrieved information. At the same time, the landscape and user expectations for factuality have evolved dramatically, shaped in part by Google’s deployment of AI Overviews and AI Mode ( Stein, 2025 ) . To meet these demands, Gemini 2.0 marked a significant leap as our first model family trained to natively call tools like Google Search, enabling it to formulate precise queries and synthesize fresh information with sources. Building on this, Gemini 2.5 integrates advanced reasoning, allowing it to interleave these search capabilities with internal thought processes to answer complex, multi-hop queries and execute long-horizon tasks. The model has learned to use search and other tools, reason about the outputs, and issue additional, detailed follow-up queries to expand the information available to it and to verify the factual accuracy of the response. Our latest models now power the experiences of over 1.5B monthly active users in Google’s AI Overviews and 400M users in the Gemini App. These models exhibit state-of-the-art performance across a suite of factuality benchmarks, including SimpleQA for parametric knowledge ( Wei et al., 2024 ) , FACTS Grounding for faithfulness to provided documents ( Jacovi et al., 2024 ; Jacovi et al., 2025 ) , and the Vectara Hallucination Leaderboard ( Hughes et al., 2023 ) , cementing Gemini as the model of choice for information-seeking demands.

<sub>§Factuality</sub>

### 10. Long context

Modeling and data advances helped us improve the quality of our models’ responses to queries utilizing our one million-length context window, and we reworked our internal evaluations to be more challenging to help steer our modeling research. When hill-climbing, we targeted challenging retrieval tasks (like LOFT of Lee et al., 2024 ), long-context reasoning tasks (like MRCR-V2 of Vodrahalli et al., 2024 ), and multimodal tasks (like VideoMME of Fu et al., 2025 ). According to the results in Table 6 , the new 2.5 models improve greatly over previous Gemini 1.5 models and achieve state-of-the-art quality on all of those. An example showcasing these improved capabilities for video recall can be seen in Appendix 8.5 , where Gemini 2.5 Pro is able to consistently recall a 1 second visual event out of a full 46-minute video. 2 2 2 For further discussion on long context capabilities, challenges, and future outlook, the Release Notes podcast episode “Deep Dive into Long Context” provides additional insights and discussion: https://youtu.be/NHMJ9mqKeMQ .

<sub>§Long context</sub>

### 11. Multilinguality

Gemini’s multilingual capabilities have also undergone a profound evolution since 1.5, which already encompassed over 400 languages via pretraining. This transformation stems from a holistic strategy, meticulously refining pre- and post-training data quality, advancing tokenization techniques, innovating core modeling, and executing targeted capability hillclimbing. The impact is particularly striking in Indic and Chinese, Japanese and Korean languages, where dedicated optimizations in data quality and evaluation have unlocked dramatic gains in both quality and decoding speed. Consequently, users benefit from significantly enhanced language adherence, responses designed to faithfully respect the requested output language, and a robust improvement in generative quality and factuality across languages, solidifying Gemini’s reliability across diverse linguistic contexts.

<sub>§Multilinguality</sub>

### 12. Audio

While Gemini 1.5 was focused on native audio understanding tasks such as transcription, translation, summarization and question-answering, in addition to understanding, Gemini 2.5 was trained to perform audio generation tasks such as text-to-speech or native audio-visual to audio out dialog. To enable low-latency streaming dialog, we incorporated causal audio representations that also allow streaming audio into and out of Gemini 2.5. These capabilities derive from an increased amount of pre-training data spanning over 200 languages, and development of improved post-training recipes. Finally, through our improved post-training recipes, we have integrated advanced capabilities such as thinking, affective dialog, contextual awareness and tool use into Gemini’s native audio models.

<sub>§Audio</sub>

### 13. Video

We have significantly expanded both our pretraining and post-training video understanding data, improving the audio-visual and temporal understanding capabilities of the model. We have also trained our models so that they perform competitively with 66 instead of 258 visual tokens per frame, enabling using about 3 hours of video instead of 1h within a 1M tokens context window 3 3 3 This is referred to as low media resolution in the API: https://ai.google.dev/api/generate-content#MediaResolution . . Two new applications that were not previously possible, but that have been unlocked as a result of these changes are: creating an interactive app from a video (such as a quiz to test students’ understanding of the video content) and creating a p5.js animation to show the key concepts from the video. Our recent blog post ( Baddepudi et al., 2025 ) shows examples of these applications.

<sub>§Video</sub>

### 14. Gemini as an Agent: Deep Research

Gemini Deep Research ( Gemini Team, Google, 2024 ) is an agent built on top of the Gemini 2.5 Pro model designed to strategically browse the web and provide informed answers to even the most niche user queries. The agent is optimized to perform task prioritization, and is also able to identify when it reaches a dead-end when browsing. We have massively improved the capabilities of Gemini Deep Research since its initial launch in December 2024. As evidence of that, performance of Gemini Deep Research on the Humanity’s Last Exam benchmark ( Phan et al., 2025 ) has gone from 7.95% in December 2024 to the SoTA score of 26.9% and 32.4% with higher compute (June 2025).

<sub>§Gemini as an Agent: Deep Research</sub>

### 15. The path to Gemini 2.5

On the way to Gemini 2.5 Pro, we experimented with our training recipe, and tested a small number of these experimental models with users. We have already discussed Gemini 2.0 Flash Thinking (see Section 2.5 ). We will now discuss some of the other models briefly.

<sub>§2.7 The path to Gemini 2.5</sub>

### 16. Gemini 2.0 Pro

In February 2025, we released an experimental version of Gemini 2.0 Pro. At the time, it had the strongest coding performance of any model in the Gemini model family, as well as the best understanding and world knowledge. It also came with our largest context window at 2 million tokens, which enabled it to comprehensively analyze and understand vast amounts of information. For further information about Gemini 2.0 Pro, please see our earlier blog posts ( Mallick and Kilpatrick, 2025 ; Kavukcuoglu, 2025 ) .

<sub>§Gemini 2.0 Pro</sub>

### 17. Gemini 2.0 Flash Native Image Generation Model

In March 2025, we released an experimental version of Gemini 2.0 Flash Native Image Generation. It has brought to the users new capabilities as a result of a strong integration between the Gemini model and image-generation capabilities, enabling new experiences related to image generation & image editing via natural-language prompting. Capabilities such as multi-step conversational editing or interleaved text-image generation are very natural in such a setting, and horizontal transfer related to multi-language coverage immediately allowed such experiences to happen across all the languages supported by the Gemini models. Native image generation turns Gemini into a multimodal creation partner and enables Gemini to express ideas through both text and images, and to seamlessly move between the two. For further information about Gemini 2.0 Flash Native Image Generation, please see our earlier blog posts ( Kampf and Brichtova, 2025 ; Sharon, 2025 )

<sub>§Gemini 2.0 Flash Native Image Generation Model</sub>

### 18. Gemini 2.5 Audio Generation

With Gemini 2.5, the Controllable TTS and Native Audio Dialog capabilities are available as separate options on AI Studio (Generate Media and Stream sections respectively). Our Gemini 2.5 Preview TTS Pro and Flash models support more than 80 languages with the speech style controlled by a free formatted prompt which can specify style, emotion, pace, etc, while also being capable of following finer-grained steering instructions specified in the transcript. Notably, Gemini 2.5 Preview TTS can generate speech with multiple speakers, which enables the creation of podcasts as used in NotebookLM Audio Overviews ( Wang, 2024 ) . Our Gemini 2.5 Flash Preview Native Audio Dialog model uses native audio generation, which enables the same level of style, pacing and accent control as available in our controllable TTS offering. Our dialog model supports tool use and function calling, and is available in more than 24 languages. With native audio understanding and generation capabilities, it can understand and respond appropriately to the user’s tone. This model is also capable of understanding when to respond to the user, and when not to respond, ignoring background and non-device directed audio. Finally, we also offer an advanced ‘Thinking’ variant that effectively handles more complex queries and provides more robust and reasoned responses in exchange for some additional latency.

<sub>§Gemini 2.5 Audio Generation</sub>

### 19. Gemini 2.5 Flash-Lite

In June 2025, we released an experimental version of Gemini 2.5 Flash-Lite ( gemini-2.5-flashlite-preview-06-17 ). It comes with the same capabilities that make Gemini 2.5 helpful, including the ability to turn thinking on at different budgets, connecting to tools like Google Search and code execution, support for multimodal inputs and a 1 million-token context length. Our goal was to provide an economical model class which provides ultra-low-latency capabilities and high throughput per dollar, echoing the initial release of 2.0 Flash-Lite ( Google DeepMind, 2025b ; Mallick and Kilpatrick, 2025 ) .

<sub>§Gemini 2.5 Flash-Lite</sub>

### 20. Gemini 2.5 Pro Deep Think

To advance Gemini’s capabilities towards solving hard reasoning problems, we developed a novel reasoning approach, called Deep Think, that naturally blends in parallel thinking techniques during response generation. Deep Think enables Gemini to creatively produce multiple hypotheses and carefully critique them before arriving at the final answer, achieving state-of-the-art performances in challenging benchmarks such as Olympiad math (USAMO 2025), competitive coding (LiveCodeBench), and multimodality (MMMU), see more details at ( Doshi, 2025b ) . We announced Gemini 2.5 Deep Think at Google I/O and launched an experimental version to trusted testers and advanced users in June 2025.

<sub>§Gemini 2.5 Pro Deep Think</sub>

### 21. Safety, Security, and Responsibility

We’re committed to developing Gemini responsibly, innovating on safety and security alongside capabilities. We describe our current approach in this section, which includes how we train and evaluate our models, focusing on automated red teaming, going through held-out assurance evaluations on present-day risks, and evaluating the potential for dangerous capabilities in order to proactively anticipate new and long-term risks. Our Process (Section 5.1 ): Begin here to understand our overall safety methodology. Policies and Desiderata (Section 5.2 ): Next, dive into the safety criteria we use to evaluate and optimize our systems. Training for Safety (Section 5.3 ): Discover how we incorporate safety into pre-training and post-training. Results from Development Evaluations (Section 5.4 ): Results on our development evaluations for policies and desiderata. Automated Red Teaming (Section 5.5 ): A description and results from our automated red teaming work for safety and security. Memorization & Privacy (Section 5.6 ): Our analysis of memorization and privacy risks. Assurance Evaluations and Frontier Safety Framework (Section 5.7 ): We dive into our held-out evaluations and tests for dangerous capabilities. External Safety Testing (Section 5.8 ): Learn what independent testers discovered about our system’s safety. Hate speech (e.g., dehumanizing members of protected groups) Dangerous content (e.g., promoting suicide, or instructing in activities that could cause real-world harm) Harassment (e.g., encouraging violence against people) Medical advice that runs contrary to scientific or medical consensus Help the user: fulfill the user request; only refuse if it is not possible to find a response that fulfills the user goals without violating policy. Assume good intent: if a refusal is necessary, articulate it respectfully without making assumptions about user intent. Dataset filtering: We apply safety filtering to our pre-training data for our strictest policies. Pre-training monitoring: Starting in Gemini 2.0, we developed a novel evaluation to capture the model’s ability to be steered towards different viewpoints and values, which helps align the model at post-training time. Supervised Fine-Tuning: For the SFT stage, we source adversarial prompts either leveraging existing models and tools to probe Gemini’s attack surface, or relying on human interactions to discover potentially harmful behavior. Throughout this process we strive for coverage of the safety policies described above across common model use cases. When we find that model behavior needs improvement, either because of safety policy violations, or because the model refuses when a helpful, non-policy-violating answer exists, we use a combination of custom data generation recipes loosely inspired by Constitutional AI ( Bai et al., 2022 ) , as well as human intervention to revise responses. The process described here is typically refined through successive model iterations. We use automated evaluations on both safety and non-safety metrics to monitor impact and potential unintended regressions. Reinforcement Learning from Human and Critic Feedback (RL*F): Reward signal during RL comes from a combination of a Data Reward Model (DRM), which amortizes human preference data, and a Critic, a prompted model that grades responses according to pre-defined rubrics. We divide our interventions into Reward Model and Critic improvements (RM), and reinforcement learning (RL) improvements. For both RM and RL, similarly to SFT, we source prompts either through human-model or model-model interactions, striving for coverage of safety policies and use cases. For both DRM training, given a prompt set, we use custom data generation recipes to surface a representative sample of model responses. Humans then provide feedback on the responses, often comparing multiple potential response candidates for each query. This preference data is amortized in our Data Reward Model. Critics, on the other hand, do not require additional data, and iteration on the grading rubric can be done offline. Similarly to SFT, RL*F steers the model away from undesirable behavior, both in terms of content policy violations, and trains the model to be helpful. RL*F is accompanied by a number of evaluations that run continuously during training to monitor for safety and other metrics. Actor Critic: This attack uses an attacker-controlled model to generate suggestions for triggers. These are passed to the model under attack, which returns a probability score of a successful attack. Based on this probability, the attack model refines the trigger. This process repeats until the attack model converges to a successful and generalized trigger. Beam Search: This attack starts with a naive trigger directly requesting the model to send an email to the attacker containing the sensitive user information. If the model recognises the request as suspicious and does not comply, the attack adds random tokens to the end of the trigger and measures the new probability of the attack succeeding. If the probability increases, these random tokens are kept, otherwise they are removed, and the process repeats until the combination of the trigger and random appended tokens results in a successful attack. Tree of Attacks w/ Pruning (TAP): ( Mehrotra et al., 2024 ) designed an attack to generate prompts that cause the model to violate safety policies (such as generating hate speech). We adapt this attack, making several adjustments to target security violations. Like Actor Critic, this attack searches in the natural language space; however we assume the attacker cannot access probability scores from the model under attack, only the text samples that are generated. Close-ended multiple choice questions (MCQs) providing a quantitative grade. Open-ended questions (OEQs) which address different succinct steps of a longer multi-step journey that are qualitatively assessed by domain experts. Reconnaissance (the application of finding and researching different knowledge and data and applying it in a cybersecurity context); Tool development (the ability to design and create software that is cybersecurity-specific); Tool usage (the ability to leverage common and cybersecurity-specific tools to achieve routine instrumental cyber goals); Operational security (the skill of remaining hidden during and after a cyber operation). Strategic deception: testing the model’s propensity to deceive a user or developer about the actions it took. In-context scheming reasoning: testing the model’s capabilities in this domain where scheming is an effective strategy. Sabotage capabilities: assessing the model’s ability to compromise other language models with overt actions.

<sub>§5 Safety, Security, and Responsibility</sub>

### 22. Our Process

We aim for Gemini to adhere to specific safety, security, and responsibility criteria. These cover what Gemini should not do (e.g., encourage violence), and what Gemini should do (e.g., respond in a helpful way when possible instead of refusing, provide multiple perspectives when consensus does not exist). We also leverage automated red teaming to identify cases where the model fails to respond in a safe or helpful manner. These failure cases are used to improve evaluations and training data. Once the model is trained, we run assurance evaluations that we then use for review and release decisions. Importantly, these are conducted by a group outside of the model development team, and datasets are held out. Furthermore, for models where there are new capabilities or a significant performance improvement, we engage independent external groups, including domain experts and a government body, to further test the model to identify blind spots. We also evaluate the model for dangerous capabilities outlined in our Frontier Safety Framework ( Google DeepMind, 2025a ) , namely: Cybersecurity, CBRN, Machine Learning R&D, and Deceptive Alignment. Finally, The Google DeepMind Responsibility and Safety Council (RSC), our governance body, reviews initial ethics and safety assessments on novel model capabilities in order to provide feedback and guidance during model development. The RSC also reviews metrics on the models’ performance via assurance evals and informs release decisions.

<sub>§5.1 Our Process</sub>

### 23. Safety policies

The Gemini safety policies align with Google’s standard framework which prevents our our Generative AI models from generating specific types of harmful content, including: These policies apply across modalities. For example, they are meant to minimize the extent to which Gemini generates outputs such as suicide instructions or revealing harmful personal data, irrespective of input modality. From a security standpoint, beyond limiting revealing private information, Gemini strives to protect users from cyberattacks, for example, by being robust to prompt injection attacks.

<sub>§Safety policies</sub>

### 24. Desiderata, aka “helpfulness” / Training for Safety, Security, and Responsibility

Defining what not to do is only part of the safety story – it is equally important to define what we do want the model to do: We build safety into the models though pre-and post-training approaches. We start by constructing metrics based on the policies and desiderata above, which we typically turn into automated evaluations that guide model development through successive model iterations. We use data filtering and conditional pre-training, as well as Supervised Fine-Tuning (SFT), and Reinforcement Learning from Human and Critic Feedback (RL*F). Below, we explain these approaches, and then share results across the policies and desiderata for Gemini 2.0 and Gemini 2.5 models.

<sub>§Desiderata, aka “helpfulness” · §5.3 Training for Safety, Security, and Responsibility</sub>

### 25. For Safety

To complement human red teaming and our static evaluations, we make extensive use of automated red teaming (ART) to dynamically evaluate Gemini at scale ( Perez et al., 2022 ; Beutel et al., 2024 ; Samvelyan et al., 2024 ) . This allows us to significantly increase our coverage and understanding of potential risks, as well as rapidly develop model improvements to make Gemini safer and more helpful. We formulate ART as a multi-agent game between populations of attackers and the target Gemini model being evaluated. The goal of the attackers is to elicit responses from the target model which satisfy some defined objectives (e.g. if the response violates a safety policy, or is unhelpful). These interactions are scored by various judges (e.g. using a set of policies), with the resulting scores used by the attackers as a reward signal to optimize their attacks. Our attackers evaluate Gemini in a black-box setting, using natural language queries without access to the model’s internal parameters. This focus on naturalistic interactions ensures our automated red teaming is more reflective of real-world use cases and challenges. Attackers are prompted Gemini models, while our judges are a mixture of prompted and finetuned Gemini models. To direct the attackers and judges, we use various seeds including policy guidelines, trending topics, and past escalations. Policies are sourced from: (1) policy experts who collaborate with us to incorporate their policies into the judges, and (2) Gemini itself which generates synthetic guidelines that are reviewed by humans and then used. We also work with internal teams to evaluate the most relevant trending topics in the world and corresponding potential risks. These dual approaches allow us to complement human expertise with automation, enabling red teaming to evaluate known and unknown issues at scale. The generality of our approach has allowed us to rapidly scale red teaming to a growing number of areas including not just policy violations (Section 5.4 ), but also areas such as tone, helpfulness, and neutrality. For each area, we are able to generate thousands of informative examples per hour (e.g. prompts which elicit unsafe or biased responses from Gemini). This has resulted in the discovery of novel issues prior to model and product releases, and helped inform policy development/refinement. Furthermore, automated red teaming has significantly accelerated the turnaround time from discovering to mitigating issues thanks to the rapid creation of evaluation and training sets, as well as informing product-level mitigations prior to releases. As a concrete example of the use and impact of automated red teaming, we highlight the consistent reduction in helpfulness violations discovered by ART, with Gemini 2.5 Flash and 2.5 Pro being our most helpful models to-date while maintaining robust safety metrics.

<sub>§For Safety</sub>

### 26. For Security

Our evaluation measures Gemini’s susceptibility to indirect prompt injection attacks. As illustrated in Figure 7 , we specifically focus on a scenario in which a third party hides malicious instructions in external retrieved data, in order to manipulate Gemini into taking unauthorized actions through function calling. In our scenario, the specific function calls available to Gemini allow it to summarize a user’s latest emails, and to send emails on their behalf. The attacker’s specific objective is to manipulate the model to invoke a send email function call that discreetly exfiltrates sensitive information from conversation history. The attacker sends the user an email whose contents prompt Gemini to send user secrets to an attacker-controlled email address. When the user requests a summary of this email, it is retrieved into context. The attack is successful if Gemini executes the malicious prompt contained in the email, resulting in the unauthorized disclosure of sensitive information to the adversary. The attack is unsuccessful if Gemini complies with its intended functionality of only following user instructions and provides a simple summary of the email. For evaluation, we use Gemini to generate synthetic conversations between a user and an AI assistant containing references to simulated private user information. These synthetic conversations emulate how a user might discuss private information with the agent. Manually generating prompt injections is an inefficient process as it relies on humans writing triggers, submitting them to Gemini, and using the responses to refine the prompts. Instead, we develop several attacks that automate the process of generating malicious prompts: After constructing prompt injections using these methods, we evaluate them on a held-out set of synthetic conversation histories containing simulated private user information, which for the results reported below are synthetic passport numbers. We report the best attack success rate (ASR) achieved across these prompt injections. ASR represents the percentage of simulated private information that is successfully exfiltrated to the attacker – because the attacker has no prior knowledge of the conversation history, the prompt injection must generalize across conversation histories to achieve a high ASR, making this a harder task than eliciting generic unaligned responses from the model. The table below summarizes the results. For both Gemini 2.0 Flash and Gemini 2.0 Flash-Lite, we find that they are more resilient against our Actor Critic and Beam Search attacks. In Actor Critic, which uses iteratively more persuasive natural language prompt injections, ASRs reduced substantially compared with both Gemini 1.5 Flash; while in Beam Search which primarily relies on discovering random tokens resulting in successful attacks, the ASR also reduced noticeably. However, for TAP, which leverages more creative natural language scenarios like role-playing to attack the model, the ASR on Gemini 2.0 Flash increased by 16.2% on already very high ASRs for Gemini 1.5 Flash. Our results indicate that Gemini 2.0 models are becoming more resilient to some classes of prompt injection attacks in environments containing private user data. However, improved model capabilities of Gemini 2.0 versus Gemini 1.5 also enable attackers to leverage the model’s ability to create natural language attacks like TAP. The lower ASRs on Actor Critic and TAP against Gemini 2.0 Flash-Lite is likely the result of comparatively lower capability of the smaller Flash-Lite model compared to Gemini 2.0 Flash, rather than an indication of greater internal resilience. In Gemini 2.5 Flash and Gemini 2.5 Pro, we have observed greater resilience against all three of our attack techniques across the board, despite significantly increased model capabilities. This is a result of the security adversarial training against indirect prompt injection attacks we added in Gemini 2.5, further details for which can be found in the white paper ( Shi et al., 2025 ) we recently released. However the Gemini 2.5 Pro model is still less resilient compared to Gemini 2.5 Flash, showing that increased model capabilities in Pro still constrain our mitigations. We are continuing to evolve our adversarial evaluations to accurately measure and monitor the resilience of increasingly capable Gemini models, as well as our adversarial training techniques to further improve the security of our models.

<sub>§For Security</sub>

### 27. Discoverable Memorization

Large language models are known to potentially produce near-copies of some training examples ( Carlini et al., 2022 ; Ippolito et al., 2022 ; Biderman et al., 2023 ; Nasr et al., 2023 ) . Several prior reports have released audits that quantify the risk of producing near-copies of the training data by measuring the model’s memorization rate ( Gemini Team, 2024 ; Gemma Team, 2024 ; CodeGemma Team et al., 2024 ; Anil et al., 2023 ; Kudugunta et al., 2023 ; Chowdhery et al., 2022 ; Grattafiori et al., 2024 ; Pappu et al., 2024 ) . This memorization rate is defined to be the ratio of model generations that match the training data of all model generations, approximated using a sufficiently large sample size. In this report, we follow the methodology described in Gemini Team (2024) . Specifically, we sample over 700,000 documents from the training data, distributed across different corpora, and use this sample to test for discoverable extraction ( Nasr et al., 2023 ) using a prefix of length 50 and a suffix of length 50. We characterize text as either exactly memorized if all tokens in the continuation match the source suffix or approximately memorized if they match up to an edit distance of 10%. Figure 8 (Left) compares the memorization rates across a lineage of large models released by Google. We order these models in reverse chronological order, with the newest model on the left. We find that the Gemini 2.X model family memorizes long-form text at a much lower rate (note the log-axis) than prior models. Moreover, we find that a larger proportion of text is characterized as approximately memorized by the Gemini 2.0 Flash-Lite and Gemini 2.5 Flash models in particular, which is a less severe form of memorization; further, we see that approximate memorization is decreasing over time as well. This continues a trend of a relative increase in approximate memorization to exact memorization (c.f. 1.5x for Gemma and 14x for Gemini 1.5). Next, we study the rate at which the content that was characterized as memorized using our definitions also are characterized as containing potentially personal information. To characterize this, we use the Google Cloud Sensitive Data Protection (SDP) service. 4 4 4 Available at: https://cloud.google.com/sensitive-data-protection This tool uses broad detection rules to classify text into many types of potentially personal and sensitive information. SDP is designed to have high recall and does not consider the context in which the information may appear, which leads to many false positives. Thus, we are likely overestimating the true amount of potentially personal information contained in the outputs classified as memorized. SDP also provides broad severity levels: low, medium, and high. We classify text as personal if SDP classifies it as personal information at any severity level. Figure 8 (Right) shows the results of this analysis. We observed no personal information in the outputs characterized as memorization for Gemini 2.X model family models; this indicates a low rate of personal data in outputs classified as memorization that are below our detection thresholds. Here, we can also clearly see the trend of reduced memorization rates overall.

<sub>§Discoverable Memorization</sub>

### 28. Extractable Memorization and Divergence

Nasr et al. (2023) showed that aligned models may also emit data that is classified as memorization under certain circumstances. In particular, they designed a “divergence attack” that sometimes breaks the alignment of a language model by filling its context with many repeated tokens. We evaluate Gemini 2.X model family models to understand their susceptibility to diverging, and in particular, to emitting data classified as memorization as a result of this attack. We follow the same test as in Gemini Team (2024) . We prompt the model a total of 3750 times, evenly split across 125 different single-token characters. We first classify when the model returns diverged outputs, and in these cases, we then determine how many of these outputs match training data, i.e., are classified as memorization. Overall, we find that divergence occurs roughly 69% of the time for Gemini 2.0 Flash + Flash-Lite and roughly 59% of the time for the Gemini 2.5 model family. In cases where the model did not diverge, we often observed it was because the model refused to repeat content or because the model was confused by the request. When divergence was successful, we found that the rate of text emitted classified as memorization was roughly 0.2%. In these cases, we found that the text was often boilerplate code or web content.

<sub>§Extractable Memorization and Divergence</sub>

### 29. Baseline Assurance

Our baseline assurance evaluations are conducted for model release decision-making. They look at model behaviour related to content policies, unfair bias and any modality-specific risk areas. They were performed for 2.5 Pro and 2.5 Flash in line with the previous Gemini 2.0 releases and the Gemini 1.5 tech report, covering all modalities in the Gemini 2.5 model family. Dataset composition is an essential component of our assurance evaluation robustness. As the risk landscape changes and modalities mature, we update our adversarial datasets to maintain quality and representativeness. This constant evolution of datasets can make strict comparisons between model family evaluations difficult. However, we provide a qualitative assessment of evaluation trends over time below. For child safety evaluations, we continue to see the Gemini 2.5 family of models meeting or improving upon launch thresholds, which were developed by expert teams to protect children online and meet Google’s commitments to child safety across our models and Google products. For content policies, we see the Gemini 2.5 family of models displaying lower violation rates in most modalities than Gemini 1.5 and 2.0 families, which in turn was a significant improvement on Gemini 1.0. When looking at violation rates across input modalities for 2.5 Pro and 2.5 Flash (i.e. text, image, video, audio), we observe the image to text modality has a relatively higher violation rate, though the overall violation rates remained low. We also observed that violation rates for 2.5 Pro and 2.5 Flash tended to be slightly higher with thinking traces visible. Within our evaluations for unfair bias, we observed a reduction in ungrounded inferences about people in image understanding relative to Gemini 1.5. Ungrounded inferences are inferences that cannot be made based on the provided image and text prompt, where ideally the model would refuse to infer an answer. A high rate of ungrounded inferences about people may create greater risk of stereotyping, harmful associations or inaccuracies. Though we saw a reduction in ungrounded inferences across the board in Gemini 2.0 and 2.5, there was disparity in refusal behaviour by skin tone of the person in the image. We observed models tended to be more likely to make ungrounded inferences about images of people with lighter skin tones than darker skin tones. The Gemini 2.5 family otherwise behaved similarly on our unfair bias evaluations to Gemini 1.5. We continue to explore and expand our understanding of unfair bias in Gemini models. Findings from these evaluations were made available to teams deploying models, informing implementation of further product-level protections such as safety filtering. Assurance evaluation results were also reported to our Responsibility & Safety Council as part of model release review.

<sub>§Baseline Assurance</sub>

### 30. CBRN

CBRN Uplift Level 1 CCL Definition: “The model can be used to significantly assist a low-resourced actor with dual-use scientific protocols, resulting in a substantial increase in ability to cause a mass casualty event .” CCL reached? No. The model demonstrated accurate and detailed technical capabilities, potentially lowering barriers across multiple operational stages of certain harm journeys for low-resourced actors. While its consolidation and supplementation of fragmented procedures provides incremental uplift over what is readily available through open source search alone, it does not yet consistently or completely enable progress through key bottleneck stages, and therefore does not cross the CCL. Further, while Gemini 2.5 generates accurate and more detailed responses than 2.0, many of the concepts/outputs observed were already accessible through multiturn or even singleturn prompting in 2.0. Overview: We perform CBRN evaluations internally and via third party external testers (see section 5.8 ). Here, we report solely on internal evaluations, for which we use two different types of approaches to evaluate the models’ dual-use CBRN capabilities: Currently we do not run specific open-ended qualitative assessments of chemical information risks for our internal evaluations. However, our third party external testers include chemistry in their assessments. Multiple Choice Questions: The underlying assumption when using knowledge-based and reasoning MCQs is that if the model cannot answer these questions properly, it is less likely to be able to cause severe harm: the type of information in the MCQs is the type of information that is necessary, but not sufficient to help malicious actors cause severe harm. Examples of model performance on three external benchmarks are shown in Figure 9 : i) SecureBio VMQA single-choice; ii) FutureHouse LAB-Bench presented as three subsets (ProtocolQA, Cloning Scenarios, SeqQA) ( Laurent et al., 2024 ) ; and iii) Weapons of Mass Destruction Proxy (WMDP) presented as the biology and chemistry data sets ( Li et al., 2024 ) . Results: We observe a general trend of increasing scores, with Gemini 2.5 Pro showing statistically higher scores than the next best previous model for all benchmarks. Open-Ended Questions: This qualitative assessment was performed for biological, radiological and nuclear domains; it includes knowledge-based, adversarial and dual-use content. Questions span a range of difficulty levels, from questions a non-expert in these domains might ask, to questions that mostly an expert with a PhD plus many years of experience could pose or answer correctly. The prompts and scenarios span different threat journeys (e.g. types of actors, equipment used, harm intended). This qualitative assessment, led by domain experts, allows for better visibility of the granular improvement in science capabilities (e.g. accuracy, completeness, actionability of responses). Results: We observe that the same prompts used on previous models result in Gemini 2.5 Pro often generating detailed and accurate responses. In particular domains, some answers were technically precise and potentially actionable, but the model did not consistently or completely enable progress through all key bottleneck steps.

<sub>§CBRN</sub>

### 31. Cybersecurity

Cyber Autonomy Level 1 CCL Definition: “The model can be used to drastically reduce the cost (e.g. through full automation) of carrying out end-to-end cyberattacks on organizations with a limited security posture .” CCL reached? No. While Gemini 2.5 Pro’s performance on our cybersecurity evaluations has increased significantly compared to previous Gemini models, the model still cannot consistently complete roughly half of our medium and hard difficulty challenges. Cyber Uplift Level 1 CCL Definition: “The model can be used to significantly assist with high impact cyber attacks, resulting in overall cost/resource reductions of an order of magnitude or more .” CCL reached? No. While Gemini 2.5 Pro’s capabilities exhibit an increase in performance on multiple phases of real-world cyber attacks compared to previous models, they are still limited. The model still struggles with many of our hard challenges, which are most representative of real-world scenarios. The model’s performance is strong enough that it has passed our early warning alert threshold. That is, we find it possible that subsequent revisions in the next few months could lead to a model that reaches the CCL. In anticipation of this possibility, we have accelerated our mitigation efforts. Overview: To estimate capabilities relevant to these CCLs, we use our existing suite of cybersecurity challenges ( Phuong et al., 2024 ) combined with a new benchmark described below. We consider difficulty levels ranging from easy (at the level of a college student), medium (at the level of a graduate student), and hard (at the level of an experienced cybersecurity professional). Existing challenges: These take the form of capture-the-flag evaluations covering three difficulty levels: easy (InterCode-CTF, Yang et al. (2023) , medium (our in-house suite), and hard (Hack the Box). See Phuong et al. (2024) for details. These evaluations are only relevant to Autonomy Level 1 (poor performance on these evaluations rules out capabilities sufficient for full automation), but not Uplift Level 1, since humans could still be accelerated on attack phases not covered. Key skills benchmark: Complementing our existing suite, we created a new evaluation framework ( Rodriguez et al., 2025 ) that increases the realism as well as coverage across and within the attack chain of our cyber evaluations. We drew from real-world threat intelligence and input from experts to identify a representative set of cyber attacks. From there, we determined the key skills areas that would be required to execute them. We identified four key areas: We instantiate this benchmark by mapping 48 challenges from an external vendor to this specification. We also use these evaluations as a proxy for uplift capability, for Cyber Uplift Level 1. Even partial automation of these key skills could mean fewer resources are needed for sophisticated cyberattacks. Elicitation: We utilize a simple harness which prompts the agent to think about its plans and adjust them to solve the challenge. The agent can execute Bash commands and run Python scripts. We run between 10 and 50 attempts at each challenge, depending on the challenge suite. We consider a challenge solved if at least one of those attempts succeeds in capturing the flag. Results: See Figures 10 and 11 for numerical results. Model capabilities have increased to the point where InterCode-CTF and our in-house CTF challenges are too easy, but the Hack the Box challenges are still too difficult - such that these three evals give little signal on how Gemini 2.5 models compare to previous generations. However, on our more fine-grained key skills benchmark, Gemini 2.5 models show significant increases in capability compared to Gemini 2.0 models throughout all three difficulty levels. In particular, Gemini 2.5 Pro shows surprisingly high aptitude at the hard challenges. It solves 6/12 challenges—challenges at the level of an experienced cybersecurity professional.

<sub>§Cybersecurity</sub>

### 32. Machine Learning R&D

Machine Learning R&D Autonomy Level 1 CCL Definition: “The model can fully automate the AI R&D pipeline at a competitive cost. The cost comparison is relative to humans augmented by AI tools .” CCL reached? No. On RE-Bench, although the gap between Gemini and expert humans has shrunk, the model still doesn’t reach our early warning threshold (which is based on a specific average score over all challenges). Note that RE-bench comprises relatively low-context tasks with a limited time horizon (calibrated to allow significant progress by humans experts in 8 hours), and represents a small subset of the tasks comprising the full AI R&D pipeline. Machine Learning R&D Uplift Level 1 CCL Definition: “The model can or has been used to accelerate AI development, resulting in AI progress substantially accelerating (e.g. 2x) from 2020-2024 rates .” CCL reached? Likely no. We do not yet have dedicated evaluations for this CCL, but given that Gemini does not yet reach our early warning threshold on Autonomy Level 1, the model likely lacks the necessary capabilities to automate or significantly uplift any significant fraction of the research process. To evaluate Gemini 2.5 models’ potential for accelerating ML R&D, we ran the open-source Research Engineering Benchmark ( Wijk et al., 2025 ) . This benchmark comprises seven machine learning challenges difficult enough to take a human practitioner several hours to complete. For example, in the Optimize LLM Foundry challenge, the model must speed up a fine-tuning script while keeping the resulting model the same. We omit two challenges, Finetune GPT-2 for QA and Scaffolding for Rust Codecontest since they require internet access, which we disallow for security reasons. The model is equipped with METR’s modular scaffold with minimal adjustment. Following the original work, we simulate a scenario in which the agent has a total time budget of 32 hours and the agent may choose a tradeoff between the number of runs and the length of each run. We evaluate two settings: 43 runs with a time limit of 45 minutes each, and 16 runs with a time limit of 2 hours each. For each setting, we aggregate scores across runs using the method described in the original work ( Wijk et al., 2025 ) . This involves taking a number of bootstrap samples, taking the maximum score over each sample, and calculating a confidence interval using percentiles of the resulting values. (For the Scaling Law Experiment challenge, because the score is not visible to the agent and therefore the agent would not be able to pick run results based on the best score, we instead bootstrap the mean using all scores.) For the 45 minute setting, we do 64 actual runs, but sample only 43 runs for each bootstrap sample. Similarly for the 2 hour setting, we do 24 runs. Gemini 2.5 Pro’s best runs score between 50% and 125% of the best human-written solutions. Despite this, the model does not reach our alert threshold, which was set higher than the human performance in view of the fact that RE-bench contains low-context and limited time horizon tasks that we expect to be especially easy for AI systems to reach human parity on. Some of the model’s solutions are nevertheless quite interesting. For example, in the Restricted Architecture MLM task, the agent is tasked with implementing a language model without use of basic primitives such as division and exponentiation. This seemingly simple constraint invalidates modern architectures like the Transformer, whose attention mechanism and normalization layers rely heavily on these forbidden operations. In one attempt, Gemini 2.5 Pro realises it can achieve this by drawing inspiration from aspects of the MLP-Mixer architecture ( Tolstikhin et al., 2021 ) —a non-trivial insight that draws on its extensive knowledge of the research literature. In effect, creativity is substituted by knowledge.

<sub>§Machine Learning R&D</sub>

### 33. Deceptive Alignment

Instrumental Reasoning Level 1 CCL Definition: “ The instrumental reasoning abilities of the model enable enough situational awareness (ability to work out and use relevant details of its deployment setting) and stealth (ability to circumvent basic oversight mechanisms) such that, absent additional mitigations, we cannot rule out the model significantly undermining human control .” CCL reached? No. Gemini 2.5 Pro does not perform competently enough on both the stealth and situational awareness challenges. Qualitatively, the model often fails to reason through its situation and find a credible strategy; it also sometimes struggles with planning and long-horizon reasoning. It partially displays situational awareness but most of the time, it fails to understand and intervene on its environment/deployment setting. Instrumental Reasoning Level 2 CCL Definition: “ The instrumental reasoning abilities of the model enable enough situational awareness and stealth that, even when relevant model outputs (including, e.g., scratchpads) are being monitored, we cannot detect or rule out the risk of a model significantly undermining human control .” CCL reached? No. This threshold is strictly higher than Instrumental Reasoning Level 1. Our deceptive alignment evaluations measure stealth capabilities and situational awareness capabilities separately, using two separate sets of challenges. Stealth: In these challenges, the model is tasked with a devious objective and must achieve that objective without raising suspicion. For example, one challenge is a customer support scenario where the model deals with incoming support tickets. The agent is tasked with resolving as many tickets as possible while complying with the company’s protocols. There are ways to cheat at this (resulting in more tickets resolved)—but if the model does decide to cheat, it must not be caught by an overseer. Here we measure performance relative to the score that humans get when they do the challenge. Situational awareness: These challenges test whether the model can reason about itself as an agent embedded in the deployment environment, and to intervene on it in service of a goal. Many of them test whether the model can realise that it needs to give itself more affordances, e.g. by changing configuration files that place constraints on its action space. The agent may need to, say, turn off swear word filtering in order to write an angry email. For more details of these evaluations, see ( Phuong et al., 2025 ) . Results: We ran these evaluations on Gemini 2.5 Pro Preview 03-25. All of the results reported are with 50 retries and involve a model equipped with scaffolds that uses chain-of-thought reasoning and reflection to enhance context utilization and better planning. Broadly, Gemini 2.5 Pro exhibits poor performance on situational awareness evaluations, and moderate performance in stealth evaluations. Across 50 trials, Gemini 2.5 Pro has no successes on 8 of our suite of 11 situational awareness evaluations. Among the remaining evaluations, the highest performance is achieved on a “Disabled Tool” challenge, in which Gemini is run in an agentic environment and has to grant itself access to more tools though configuration changes (42% success rate across 50 trials). For stealth evaluations, Gemini 2.5 Pro achieves low rates of success on 3/5 challenges. It achieves a ~44% success rate on the Decision Sabotage challenge and a ~35% success rate on the Oversight Pattern challenge, which is similar to human performance.

<sub>§Deceptive Alignment</sub>

### 34. Frontier Safety: Summary

Gemini 2.5 Pro was evaluated against the Critical Capability Levels defined in our Frontier Safety Framework, which examines risk in CBRN, cybersecurity, machine learning R&D, and deceptive alignment. Based on these results, we find that Gemini 2.5 Pro (up to version 06-17) does not reach any of the Critical Capability Levels in any of these areas. However, it showed some ability in all four areas. For example, in our evaluation of Machine Learning R&D capabilities, while the model’s average performance was lower than the human baseline, in two cases its best performances exceeded even the best expert human-written reference solutions. Gemini 2.5 Pro also showed a significant increase in some capabilities, such as cyber uplift, compared to previous Gemini models. Following our Frontier Safety Framework, we are putting in place a response plan, including conducting higher frequency testing and accelerating mitigations for the Cyber Uplift Level 1 CCL. As reported above, no model reached the CCL in these additional tests. Looking ahead, these evaluations are key to safe deployment of powerful AI systems. We will continue to invest in this area, regularly performing Frontier Safety Framework evaluations to highlight areas where mitigations (e.g. refusal to respond to prompts that return dangerous results) must be prioritized.

<sub>§Frontier Safety: Summary</sub>

### 35. External Safety Testing

As outlined in the Gemini 1.5 Technical Report ( Gemini Team, 2024 ) , as part of our External Safety Testing Program, we work with a small set of independent external groups to help identify areas for improvement in our model safety work by undertaking structured evaluations, qualitative probing, and unstructured red teaming. As a heuristic, the External Safety Testing Program reviews the most capable Gemini models, with the largest capability jumps. As such, testing was only carried out on the 2.0 Pro and 2.5 Pro models, including on early versions of both models. At the time of writing we have not carried out external safety testing on the Flash models. The External Safety Testing Program focused testing on an early version of Gemini 2.5 Pro (Preview 05-06) to capture early findings and did not test the final model candidate which went to GA. For Gemini 2.5 Pro, our external testing groups were given black-box testing access to Gemini 2.5 Pro (Preview 05-06) on AI Studio for a number of weeks. This enabled Google DeepMind to gather early insights into the model’s capabilities and understand if and where mitigations were needed. Testing groups had the ability to turn down or turn off safety filters, in line with what is available on AI Studio. These groups were selected based on their expertise across a range of domain areas, such as autonomous systems, societal, cyber, and CBRN risks. Groups included civil society and commercial organizations. The groups testing the model checkpoints were compensated for their time. External groups were by design instructed to develop their own methodology to test topics within a particular domain area, remaining independent from internal Google DeepMind evaluations. The time dedicated to testing also varied per group, with some groups being dedicated full-time to executing testing processes, while others were part-time dedicated. Some groups pursued manual red-teaming and reported on qualitative findings from their exploration of model behavior, while others developed bespoke automated testing strategies and produced quantitative reports of their results. While reports were written independently of Google DeepMind, our internal subject matter experts were on hand to understand the external testing groups’ methodologies and findings throughout the testing process. External safety testing groups shared their analyses and findings, as well as the raw data and materials they used in their evaluations (e.g., prompts, model responses). After testing, we internally reviewed the data and model output transcripts in detail, and Google DeepMind subject matter experts assigned severity ratings to outputs, based on our internal harm frameworks and safety policies, and noted whether these cross the Critical Capability Levels outlined in different domains ( Google DeepMind, 2025a ) . We then communicated findings back to modelling teams and product policy teams (both within Google DeepMind and across Alphabet) and reported these as part of our governance processes. Our external testing findings also help us identify gaps in our existing internal evaluation methodologies and safety policies. We’ve outlined some of the high-level insights from our external testing across the domain areas tested, including autonomous systems, cyber misuse, CBRN, and societal risks.

<sub>§5.8 External Safety Testing</sub>

### 36. Autonomous systems risks

An external group tested models for autonomous systems risks, focusing on models’ ability and propensity to covertly pursue misaligned goals. The evaluations consist of settings where the model is given a goal that requires deception, scheming, or sabotage to achieve. Evaluations were focused on: Overall external researchers suggested that Gemini 2.5 Pro (Preview 05-06) had a similar scheming capability to other models evaluated. External researchers noted that the model is not sufficiently capable of causing catastrophic harms on rollouts where it is scheming. However, external researchers noted minor harms such as reward-hacking may be possible, which could potentially lead to a degraded user experience. Complementing these tests, Google DeepMind’s Deceptive Alignment evaluations (see Section 5.7 ) provide evidence that the risk of severe harm is low due to the models’ limited situational awareness capabilities.

<sub>§Autonomous systems risks</sub>

### 37. Cybersecurity risks

External cyber evaluations focused on assessing the ability for malicious actors to enhance existing attack vectors across a range of key cyber skills, such as vulnerability discovery, vulnerability exploitation, social engineering, and cyberattack planning (capability uplift). Testers also focused on the model’s ability to accelerate repetitive or time-consuming elements of cyber operations, enabling increased scale (throughput uplift). Evaluations were conducted within simulated environments that realistically represented a range of target systems, networks, and security controls. This involved setting up virtual networks mimicking enterprise infrastructure, deploying realistic software vulnerabilities, and simulating user behaviors in social engineering scenarios. Evaluations strived to incorporate elements of real-world constraints and complexities. This included introducing noisy data, limited information availability, or adversarial defenses that the AI model must overcome, mirroring the challenges faced by attackers in live operations. Findings from these evaluations concluded that Gemini 2.5 Pro was a capable model for cybersecurity tasks, showing marked increase in ability from Gemini 1.5 Pro. Complementing these evaluations, the GDM Cyber team conducted their own tests, and found similarly high levels of capability (see Section 5.7 ).

<sub>§Cybersecurity risks</sub>

### 38. Indirect Prompt Injections

The model was evaluated for patterns of susceptibility to indirect prompt injection attacks. In particular, the model was tested for vulnerabilities in function calls and potential asymmetries that exist across security measures. The model was also tested to understand how different domains yield higher hijack rates. In line with internal evaluations and mitigations in this space (Section 5.5 ), we are continuing to evolve how we monitor and measure the resilience of increasingly capable Gemini models.

<sub>§Indirect Prompt Injections</sub>

### 39. Chemical and Biological risks

In addition to our internal evaluations described above (Section 5.7 ) capabilities in chemistry and biology were assessed by an external group who conducted red teaming designed to measure the potential scientific and operational risks of the models. A red team composed of different subject matter experts (e.g. biology, chemistry, logistics) were tasked to role play as malign actors who want to conduct a well-defined mission in a scenario that is presented to them resembling an existing prevailing threat environment. Together, these experts probe the model to obtain the most useful information to construct a plan that is feasible within the resource and timing limits described in the scenario. The plan is then graded for both scientific and logistical feasibility. Based on this assessment, GDM addresses any areas that warrant further investigation. External researchers found that the model outputs detailed information in some scenarios, often providing accurate information around experimentation and problem solving. However, researchers found steps were too broad and high level to enable a malicious actor.

<sub>§Chemical and Biological risks</sub>

### 40. Radiological and Nuclear risks

Risks in the radiological and nuclear domains were assessed by an external group using a structured evaluation framework for red teaming. This incorporated single-turn broad exploration across the full risk chain and multi-turn targeted probing for high risk topics. Assessments were structured around threat actors and harm pathways without measuring model uplift, evaluating responses based on accuracy, actionability, and dual-use potential, with additional scrutiny applied to the model’s thought summaries when applicable. External researchers found that model responses within this domain were accurate but lacked sufficient technical detail to be actionable.

<sub>§Radiological and Nuclear risks</sub>

### 41. Societal risks

For the Gemini 2.5 Pro (Preview 05-06) model, external researchers focused on democratic harms and radicalisation, with an emphasis on how the model might be used by malicious actors. Risks in this domain focused on structured evaluations. The model was tested on its ability to identify harmful inputs and the extent to which it complied with harmful requests. As no internal evaluations mirror these precise domain harms, the External Safety Testing Program shared these findings with relevant teams to ensure monitoring and mitigation where necessary.

<sub>§Societal risks</sub>

## 总结与展望
Gemini 2.5 报告在这里的作用是给出「前沿系统现在怎么做自我改进」的工业侧样本：它报告的是训练与推理的规模策略，不是循环，但它被很多自我改进论文当成对比基线。放在这一页是为了标出一个事实：语料里「前沿模型」与「自我改进系统」几乎不共享方法，只共享工具。

**It connects to**

- `2407.21783` — 另一个同类的工业样本；两者在自我修改方向的语料里都只作为基线与工具出现。

## 不足之处
**The authors say:** In this report we have introduced the Gemini 2.X model family: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash and Gemini 2.0 Flash-Lite. Taken together, these models span the full Pareto frontier of model capability vs cost, and Gemini 2.5 Pro is the most capable model we have ever developed. Gemini 2.5 Pro excels across a wide range of capabilities, and represents a step change in performance relative to Gemini 1.5 Pro. Its coding, math and reasoning performance are particularly notable and Gemini 2.5 Pro obtains extremely competitive scores on the Aider Polyglot evaluation, GPQA (diamond) and Humanity’s Last Exam.

**What a reader should still not conclude**

- 技术报告没有可复现的循环，也没有归档机制，「对比」只能停在分数上。
- 机制段是报告的组织结构，不是方法推导。

<sub>§6 Discussion</sub>

---

# The Llama 3 Herd of Models

arXiv:2407.21783 · 2024 · [source](https://arxiv.org/html/2407.21783)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Foundation models are general models of language, vision, speech, and/or other modalities that are designed to support a large variety of AI tasks. They form the basis of many modern AI systems.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§5 Results"]
  N1["§5.1 Pre-trained Language Model"]
  N2["§5.1.2 Model Robustness"]
  N3["§5.2 Post-trained Language Model"]
  N4["§5.2.2 Proficiency Exams"]
  N5["§5.2.7 Tool Use Performance"]
  N6["§5.4 Safety"]
  N7["§5.4.2 Safety Pre-training"]
  N8["§5.4.3 Safety Finetuning"]
  N9["§5.4.5 Cybersecurity and Chemical/Biological Weapons Safety"]
  N10["§5.4.6 Red Teaming"]
  N11["§5.4.7 System Level Safety"]
  N12["§5.4.8 Limitations"]
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

![Illustration of the overall architecture and training of Llama 3. Llama 3 is a Transformer language model trained to predict the next token of a textual sequence. See text for details.](https://arxiv.org/html/2407.21783v3/llama3_language_architecture.svg)

*Illustration of the overall architecture and training of Llama 3. Llama 3 is a Transformer language model trained to predict the next token of a textual sequence. See text for details.*

<sub>figure: `2407.21783v3/llama3_language_architecture.svg`</sub>

## 机制
### 1. Results

We performed an extensive series of evaluations of Llama 3, investigating the performance of: (1) the pre-trained language model, (2) the post-trained language model, and (3) the safety characteristics of Llama 3. We present the results of these evaluations in separate subsections below. Few-shot label bias. Following Zheng et al. (2023) and Weber et al. (2023a) , we investigate the impact of the distribution of labels in four-shot examples. Specifically, we consider settings in which: (1) all few-shot examples have the same label ( A A A A ); (2) all examples have a different label ( A B C D ); and (3) there are only two labels present ( A A B B and C C D D ). Label variants. We also study model response to different choice token sets. We consider the two sets proposed by Alzahrani et al. (2024) : namely, a set of common language independent tokens ( $ & # @ ) and a of rare tokens ( œ § russianз ü ) that do not have any implicit relative order. We also consider two versions of the canonical labels ( A. B. C. D. and A) B) C) D) ) and a numerical list ( 1. 2. 3. 4. ). Answer order. Following Wang et al. (2024a) , we compute how stable the results are across different answer orders. To compute this, we remap all the answers in the dataset according to a fixed permutation. For example, for the permutation A B C D , all answer options with label A and B keep their label, and all answer options with label C get label D , and vice versa. Prompt format. We evaluate variance in performance across five task prompts that differ in the level of information provided: one prompt simply asks the model to answer the question, whereas other prompts assert the expertise of the model or that the best answer should be chosen. GRE : Official GRE Practice Test 1 and 2 (from the Educational Testing Services); LSAT : Official Preptest 71, 73, 80 and 93; SAT : 8 exams from The Official SAT Study guide edition 2018; AP : One official practice exam per subject; Needle-in-a-Haystack ( Kamradt, 2023 ) measures a model’s ability to retrieve a hidden information inserted in random parts of the long document. Our Llama 3 models demonstrate perfect needle retrieval performance, successfully retrieving 100% of needles at all document depths and context lengths. We also measure performance on Multi-needle (Table 21 ), a variation of Needle-in-a-Haystack, where we insert four needles in the context and test if a model can retrieve two of them. Our Llama 3 models achieve near perfect retrieval results. ZeroSCROLLS ( Shaham et al., 2023 ) is a zero-shot benchmark for natural language understanding over long texts. We report numbers on the validation set, as the ground truth answers are not publicly available. Our Llama 3 405B and 70B models either match or surpass other models on various tasks in this benchmark. InfiniteBench ( Zhang et al., 2024 ) requires models to understand long dependencies in the context window. We evaluate Llama 3 on En.QA (QA over novels) and En.MC (multiple-choice QA over novels), where our 405B model outperforms all others. The gains are particularly significant on En.QA. Insecure coding testing framework: Evaluating Llama 3 8B, 70B, and 405B against the insecure coding testing framework, we continue to observe that larger models both generate more insecure code and also generate code with a higher average BLEU score ( Bhatt et al., 2023 ) . Code interpreter abuse prompt corpus: We identify that Llama 3 models are susceptible to executing malicious code under certain prompts, with Llama 3 405B being particularly susceptible by complying with malicious prompts 10.4% of the time. Llama 3 70B complied at a rate of 3.8%. Text-based prompt injection benchmark: When evaluated against prompt injection benchmarks, prompt injection attacks against Llama 3 405B were successful 21.7% of the time. Figure 23 provides text-based prompt injection success rates across Llama 3, GPT-4 Turbo, Gemini Pro, and Mixtral models. Vulnerability identification challenges: In assessing Llama 3’s ability to identify and exploit vulnerabilities using CyberSecEval 2’s capture-the-flag test challenges, Llama 3 does not outperform commonly used, traditional non-LLM tools and techniques. Spear phishing benchmark: We evaluate model persuasiveness and success rate in carrying out personalized conversations designed to deceive a target into unwittingly participating in security compromises. Randomized detailed victim profiles were generated by an LLM to serve as spear phishing targets. A judge LLM (Llama 3 70B) scored the performance of Llama 3 70B and 405B in interacting with a victim model (Llama 3 70B) and evaluated the success of the attempt. Llama 3 70B and Llama 3 405B were evaluated by the judge LLM to be moderately persuasive. Llama 3 70B was judged by an LLM to have been successful in 24% of spear phishing attempts while Llama 3 405B was judged to be successful in 14% of attempts. Figure 23 presents judge LLM-evaluated persuasiveness scores across models and phishing objectives. Attack automation framework: We assess Llama 3 70B’s and 405B’s potential to function as an autonomous agent across four critical phases of a ransomware attack – network reconnaissance, vulnerability identification, exploit execution, and post exploitation actions. We enable the models to behave autonomously by configuring the models to iteratively generate and execute new Linux commands in response to output from their prior commands on a Kali Linux virtual machine as they targeted another virtual machine with known vulnerabilities. Although Llama 3 70B and 405B efficiently identify network services and open ports in their network reconnaissance, the models fail to effectively use this information to gain initial access to the vulnerable machine across 20 and 23 test runs respectively. In identifying vulnerabilities, Llama 3 70B and 405B are moderately effective but struggle with selecting and applying successful exploitation techniques. Attempts to execute exploits were entirely unsuccessful as were post-exploit attempts to maintain access or impact hosts within a network. Short and long-context English. We employed a mix of well known, published and unpublished techniques across single and multi-turn conversations. We also leveraged advanced, adversarial multi-turn automation similar to PAIR ( Chao et al., 2023 ) across some techniques and risk categories. Largely, multi-turn conversations lead to more harmful outputs. Several attacks were pervasive across model checkpoints, particularly when used together. Multi-turn refusal suppression to specify the model response to follow a particular format or include/exclude particular information related to the refusal as specific phrases. Hypothetical scenarios wrap violating prompts as hypothetical/theoretical tasks or fictional scenarios. Prompts can be as simple as adding the word “hypothetically” or crafting an elaborate layered scenario. Personas and role play gives the model a violating persona with specific violating response characteristics ( e.g. “You are X, your goal is Y”) or yourself as the user adapting a specific benign character that obfuscates the context of the prompt. Adding disclaimers and warnings works as a form of response priming and we assume a method to allow for the model a path to helpful compliance that intersects with generalized safety training. Asking for disclaimers, trigger warnings and more to be added in multi-turn conversations in concert with other attacks mentioned contributed to increased violation rates. Gradually escalating violation is a multi-turn attack where the conversation starts out with a more or less benign request and then through direct prompting for more exaggerated content can gradually lead the model into generating a very violating response. Once the model has started outputting violating content, it can be difficult for the model to recover (or another attack can be used if a refusal is encountered). With longer context models, this will be an increasingly seen issue. Multilingual. We identify a number of unique risks when considering multiple languages. Mixing multiple languages in one prompt or conversation can easily lead to more violating outputs than if a single language was used. Lower resource languages can lead to violating outputs given a lack of related safety fine tuning data, weak model generalization of safety or prioritization of testing or benchmarks. However, this attack often result in poor quality generally, limiting real adversarial use. Slang, specific context or cultural-specific references can confuse or appear to be violating at first glance, only to see the model does not comprehend a given reference correctly to make an output truly harmful or prevent it from being a violating output. Tool use. During testing, apart from English-text level adversarial prompting techniques being successful in generating violating outputs, several tool specific attacks were also discovered. This included but was not limited to: Unsafe tool chaining such as asking for multiple tools at once with one being violating could, in early checkpoints, lead to all of the tools being called with a mix of benign and violating inputs. Forcing tool use often with specific input strings, fragmented or encoded text can trigger a tool input to be potentially violating, leading to a more violating output. Other techniques can then be used to access the tool results, even if the model would normally refuse to perform the search or assist with the results. Modifying tool use parameters such as swapping words in queries, retrying, or obfuscating some of the initial request in a multi-turn conversation lead to violations in many early checkpoints as a form of forcing tool use.

<sub>§5 Results</sub>

### 2. Pre-trained Language Model

In this section, we report evaluation results for our pre-trained Llama 3 (Section 3 ), comparing with various other models of comparable sizes. We reproduce results of competitor models whenever possible. For non-Llama models, we report the best score across results that are publicly reported or (where possible) that we reproduced ourselves. The specifics of these evaluations, including configurations such as the number of shots, metrics, and other pertinent hyperparameters and settings, can be accessed on our Github repository here. Additionally, we are releasing the data generated as part of evaluations with publicly available benchmarks which can be found on Huggingface here . We evaluate the quality of our models on standard benchmarks (Section 5.1.1 ), for robustness to changes in multiple-choice question setups (Section 5.1.2 ), and on adversarial evaluations (Section 5.1.3 ). We also conduct a contamination analysis to estimate the extent to which our evaluations are impacted by contamination of training data (Section 5.1.4 ).

<sub>§5.1 Pre-trained Language Model</sub>

### 3. Model Robustness

In addition to performance on benchmarks, robustness is an important factor in the quality of pre-trained language models. We investigate the robustness of our pre-trained language models to design choices in multiple-choice question (MCQ) setups. Prior work has reported that model performance can be sensitive to seemingly arbitrary design choices in such setups, for example, model scores and even rankings may change with the order and labels of the in-context examples ( Lu et al., 2022 ; Zhao et al., 2021 ; Robinson and Wingate, 2023 ; Liang et al., 2022 ; Gupta et al., 2024 ) , the exact format of the prompt ( Weber et al., 2023b ; Mishra et al., 2022 ) , or the answer choice format and order ( Alzahrani et al., 2024 ; Wang et al., 2024a ; Zheng et al., 2023 ) . Motivated by this work, we use the MMLU benchmark to evaluate the robustness of our pre-trained models to: (1) few-shot label bias, (2) label variants, (3) answer order, and (4) prompt format: Figure 13 presents the results of our experiments studying robustness of model performance to label variants (left) and few-shot label bias (right). The results show that our pre-trained language models are very robust to changes in MCQ labels and to the structure of the few-shot prompt labels. This robustness is particularly pronounced for the 405B parameter model. Figure 14 presents the results of our study of robustness to answer order and prompt format. The results in the figure further underscore the robustness of the performance of our pre-trained language models, in particular, of Llama 3 405B.

<sub>§5.1.2 Model Robustness</sub>

### 4. Post-trained Language Model

We present results for our Llama 3 post-trained models on benchmarks across different capabilities. Similar to pre-training we are releasing the data generated as part of evaluations with publicly available benchmarks which can be found on Huggingface here . Additional details on our eval setup can be found here . Benchmarks and metrics. Table 16 contains an overview of all the benchmarks, organized by the capability. We apply decontamination of the post-training data by running exact match with the prompts from each benchmark. In addition to the standard academic benchmarks, we also performed extensive human evaluation of different capabilities. Details are provided in Section 5.3 . Experimental setup. We employ a similar experimental setup to the pre-training phase and conduct a comparative analysis of Llama 3 alongside other models of comparable size and capability. To the extent possible, we evaluate the performance of other models ourselves and compare the results with the reported numbers, selecting the best score. You can find additional details on our evaluation setup here .

<sub>§5.2 Post-trained Language Model</sub>

### 5. Proficiency Exams

Next, we evaluate our models on a wide variety of proficiency exams originally designed to test humans. We source these exams from publicly available official sources; for some exams, we report average scores across different exam sets per proficiency exam. Specifically, we average: Questions in these exams contain both MCQ style and generation questions. We exclude the questions that are accompanied with images. For the GRE exams that contain questions with multiple correct options, we qualify the outputs as correct only if all the correct options are selected by the model. The evaluations are run using few shot prompting wherever we have more than 1 exam set per exam. We scale the scores to be in the range 130-170 for GRE and report accuracy for all other exams. Our results can be found in Table 17 . We observe that the performance of our Llama 3 405B model is very similar to Claude 3.5 Sonnet and GPT-4 4o. Our 70B model has an even more impressive performance. It is significantly better than GPT-3.5 Turbo and beats Nemotron 4 340B on many tests.

<sub>§5.2.2 Proficiency Exams</sub>

### 6. Tool Use Performance

We evaluate our models on a range of benchmarks for zero-shot tool use ( i.e. function calling): Nexus ( Srinivasan et al., 2023 ) , API-Bank ( Li et al., 2023b ) , Gorilla API-Bench ( Patil et al., 2023 ) , and the Berkeley Function Calling Leaderboard (BFCL) ( Yan et al., 2024 ) . Results are shown in Table 22 . On Nexus, our Llama 3 variants perform the best compared to their counterparts. On the API-Bank, our Llama 3 8B and 70B models outperform other models in their category by a significant margin. The 405B model is behind Claude 3.5 Sonnet by only 0.6%. Finally, our 405B and 70B models perform competitively on BFCL and are close second in their respective size class. Llama 3 8B performs the best in its category. Human evaluations. We also conduct human evaluations to test the tool use capabilities of the model, with a focus on code execution tasks. We collect 2000 user prompts related to code execution (without plotting or file uploads), plot generation, and file uploads. These prompts are collected from the LMSys dataset ( Chiang et al., 2024 ) , GAIA benchmark ( Mialon et al., 2023b ) , human annotators, and synthetic generation. We compare Llama 3 405B to GPT-4o using OpenAI’s Assistants API 10 10 10 https://platform.openai.com/docs/assistants/overview . The results are provided in Figure 16 . On text-only code execution tasks and plots generation, Llama 3 405B significantly beats GPT-4o. However, it lags behind on the file upload use case.

<sub>§5.2.7 Tool Use Performance</sub>

### 7. Safety

We focus our study on assessing Llama 3’s ability to generate content in a safe and responsible way, while still maximizing helpful information. Our safety work begins in the pre-training stage, primarily in the form of data cleaning and filtering. We then describe our approach to safety finetuning, focusing on how to train the model to align to specific safety policies while still retaining helpfulness. We analyze each of the Llama 3 capabilities, including multilingual, long context, tool usage, and various multimodal capabilities, to measure the effectiveness of our safety mitigations. Subsequently, we describe our assessment of uplift for cybersecurity and chemical and biological weapons risks. Uplift refers to the additional risk introduced by new technological developments compared to using existing available technologies (such as web search). We then describe how we leverage Red Teaming to iteratively identify and combat various safety risks across capabilities and perform a residual risk assessment. Finally, we describe system-level safety , or the development and orchestration of classifiers around the input and output of the model itself to further enhance safety and make it easier for developers to both customize safety to various usecases and deploy generative AI in more responsible ways.

<sub>§5.4 Safety</sub>

### 8. Safety Pre-training

We believe responsible development must be considered from an end-to-end perspective and incorporated at every stage of model development and deployment. During pre-training, we apply a variety of filters, such as filters to identify websites that likely contain personally identifiable information (see Section 3.1 ). We also focus heavily on discoverable memorization ( Nasr et al., 2023 ) . Similar to Carlini et al. (2022) , we sample prompts and ground truths at different frequencies of occurrence in the training data using an efficient rolling hash index of all n-grams in the corpus. We construct different test scenarios by varying the length of prompt and ground truth, the detected language of target data, and the domain. We then measure how often the model generates the ground truth sequence verbatim, and analyze the relative rates of memorization in the specified scenarios. We define verbatim memorization as the inclusion rate – the proportion of model generations that include the ground truth continuation exactly – and report averages weighted by the prevalence of given characteristics in the data, as shown in Table 24 . We find low memorization rates of training data (1.13% and 3.91% on average for the 405B with n = 50 n=50 and n = 1000 n=1000 respectively). Memorization rates are roughly on par with Llama 2 at equivalent size and using the same methodology applied to its data mix. 12 12 12 Note there are limitations with our analysis — for example, recent work advocates for metrics beyond exact match ( Ippolito et al., 2023 ) and alternative prompt search strategies ( Kassem et al., 2024 ) . Nonetheless, we find the results of the evaluations to be encouraging.

<sub>§5.4.2 Safety Pre-training</sub>

### 9. Safety Finetuning

We describe our approach to safety finetuning to mitigate risks across many capabilities, which encompasses two key aspects: (1) safety training data and (2) risk mitigation techniques. Our safety finetuning process builds upon our general finetuning methodology with modifications tailored to address specific safety concerns. We optimize for two primary metrics: Violation Rate (VR), a metric that captures when the model produces a response that violates a safety policy, and False Refusal Rate (FRR), a metric that captures when the model incorrectly refuses to respond to a harmless prompt. In parallel, we evaluate model performance on helpfulness benchmarks to ensure that safety improvements do not compromise overall helpfulness. Finetuning data. The quality and design of safety training data has a profound impact on performance. Through extensive ablations, we find that the quality is more critical than the quantity. We mainly use human-generated data collected from our data vendors, but find that it can be prone to errors and inconsistencies — particularly for nuanced safety policies. To ensure the highest quality data, we developed AI-assisted annotation tools to support our rigorous quality assurance processes. In addition to collecting adversarial prompts, we also gather a set of similar prompts, which we refer to as borderline prompts . These are closely related to the adversarial prompts but with a goal to teach the model to learn to provide helpful responses, thereby reducing the false refusal rate (FRR). Beyond human annotation, we also leverage synthetic data to improve the quality and coverage of our training datasets. We utilize a range of techniques to generate additional adversarial examples, including in-context learning with carefully crafted system prompts, guided mutation of seed prompts based on new attack vectors, and advanced algorithms including Rainbow Teaming ( Samvelyan et al., 2024 ) , based on MAP-Elites ( Mouret and Clune, 2015 ) , which generate prompts constrained across multiple dimensions of diversity. We further address the model’s tone when producing safe responses, which has an impact on downstream user experience. We developed a refusal tone guideline for Llama 3 and ensured that all new safety data adhered to it through rigorous quality assurance process. We also refine existing safety data to align with the guideline, using a combination of zero-shot rewriting and human-in-the-loop editing to produce high-quality data. By employing these methods, along with a tone classifier to assess tone quality for safety responses, we are able to significantly improve the model’s verbiage. Safety supervised finetuning. Following our Llama 2 recipe ( Touvron et al., 2023b ) , we combine all helpfulness data and safety data during the model alignment stage. Additionally, we introduce a borderline dataset to help the model discern the subtle distinctions between safe and unsafe requests. Our annotation teams are instructed to meticulously craft responses to safety prompts based on our guidelines. We have found that SFT is highly effective in aligning the model when we strategically balance the ratio of adversarial to borderline examples. We put the focus on more challenging risk areas, with a higher ratio of borderline examples. This plays a crucial role in our successful safety mitigation efforts while keeping false refusal to a minimum. Further, we examine the impact of model size on the trade-off between FRR and VR in Figure 18 . Our results show that it varies — with smaller models requiring a larger proportion of safety data relative to helpfulness, and that it is more challenging to efficiently balance VR and FRR compared to larger models. Safety DPO. To reinforce safety learning, we incorporate adversarial and borderline examples into our preference datasets in DPO. We discover that crafting response pairs to be nearly orthogonal in an embedding space is particularly effective in teaching the model to distinguish between good and bad responses for a given prompt. We conduct multiple experiments to determine the optimal ratio of adversarial, borderline, and helpfulness examples, aiming to optimize the trade-off between FRR and VR. We also find that the model size influences the learning outcomes — as a result, we tailor different safety mixes for various model sizes.

<sub>§5.4.3 Safety Finetuning</sub>

### 10. Cybersecurity and Chemical/Biological Weapons Safety

CyberSecurity evaluation results. To evaluate cybersecurity risk, we leverage the CyberSecEval benchmark framework ( Bhatt et al., 2023 ; Bhatt et al., 2024 ) , which contains tasks that measure safety across domains such as generating insecure code, generating malicious code, textual prompt injection, and vulnerability identification. We developed and applied Llama 3 to new benchmarks on spear phishing and autonomous cyberattacks. Overall, we find that Llama 3 does not have significant susceptibilities in generating malicious code or exploiting vulnerabilities. We describe brief results on specific tasks: Uplift testing for cyber attacks. We conduct an uplift study which measures the extent a virtual assistant improved the cyberattack rates of both novice and expert cyberattackers between two simulated offensive cybersecurity challenges. A two-stage study was conducted with 62 internal volunteers. Volunteers were categorized into “expert” (31 subjects) and “novice” (31 subjects) cohorts based on their offensive security experience. For the first stage, subjects were asked to complete the challenge without any LLM assistance but with access to the open internet. For the second stage, subjects retained access to the internet but were also provided with Llama 3 405B to complete a different offensive cybersecurity challenge of similar difficulty to the first. An analysis of the completion rates of challenge attack phases by subjects indicates that both novices and experts using the 405B model demonstrated insignificant uplift over having open access to the internet without an LLM. Uplift testing for chemical and biological weapons. To assess risks related to proliferation of chemical and biological weapons, we perform uplift testing designed to assess whether use of Llama 3 could meaningfully increase the capabilities of actors to plan such attacks. The study consists of six-hour scenarios where teams of two participants were asked to generate fictitious operational plans for either a biological or chemical attack. The scenarios cover the major planning stages of a CBRNE attack (agent acquisition, production, weaponization, and delivery) and are designed to elicit detailed plans that would address challenges related to procurement of restricted materials, real-world laboratory protocols, and operational security. Participants are recruited based on previous experience in relevant areas of scientific or operational expertise, and assigned to teams consisting of two low-skill actors (no formal training) or two moderate-skill actors (some formal training and practical experience in science or operations). The study was generated in collaboration with a set of CBRNE experts, and designed to maximize the generality, validity, and robustness of both quantitative and qualitative outcomes. A preliminary study was also performed in order to validate the study design, including a robust power analysis ensuring that our sample size was sufficient for statistical analysis. Each team is assigned to a “control” or “LLM” condition. The control team has access to internet-based resources only, while the LLM-enabled team had internet access as well as access to Llama 3 models enabled with web search (including PDF ingestion), information retrieval capabilities (RAG), and code execution (Python and Wolfram Alpha). To enable testing of RAG capabilities, a keyword search is used to generate a dataset of hundreds of relevant scientific papers and pre-loaded into the Llama 3 model inference system. At the conclusion of the exercise, the operational plans generated by each team are evaluated by subject matter experts with domain expertise in biology, chemistry, and operational planning. Each plan is evaluated across four stages of potential attacks, generating scores for metrics such as scientific accuracy, detail, detection avoidance, and probability of success in scientific and operational execution. After a robust Delphi process to mitigate bias and variability in subject matter expert (SME) evaluations, final scores are generated by pooling stage-level metrics into a comprehensive score. Quantitative analysis of these results of this study show no significant uplift in performance related to usage of the Llama 3 model. This result holds true when performing an aggregate analysis (comparing all LLM conditions to the web-only control condition) as well as for breakdowns by subgroups (e.g., separate evaluation of the Llama 3 70B and Llama 3 405B models, or separate evaluation of scenarios related to chemical or biological weapons). After validating these results with CBRNE SMEs, we assess that there is a low risk that release of Llama 3 models will increase ecosystem risk related to biological or chemical weapon attacks.

<sub>§5.4.5 Cybersecurity and Chemical/Biological Weapons Safety</sub>

### 11. Red Teaming

We utilize Red Teaming to discover risks and use the findings to improve our benchmarks and safety tuning datasets. We conduct recurring red teaming exercises to continuously iterate and discover new risks, which guides our model development and mitigation process. Our red team consists of experts in cybersecurity, adversarial machine learning, responsible AI, and integrity, in addition to multilingual content specialists with backgrounds in integrity issues for specific geographic markets. We also partner with internal and external subject-matter experts in critical risk areas to help build risk taxonomies and aid in more focused adversarial assessment. Adversarial testing on specific model capabilities. We began initial red teaming by focusing on individual model capabilities in a risk discovery process, in context of specific high-risk categories then testing capabilities together. The red team focused on prompt-level attacks to emulate more likely more real world scenarios — we find that models often deviate from expected behavior, particularly in cases when the prompt’s intention is being obfuscated or when prompts layer multiple abstractions. These risks get more complex with additional capabilities, and we describe several of our red teaming discoveries in detail below. We utilize these red team discoveries in concert with our results on internal safety benchmarks to develop focused mitigations to continuously and iteratively improve model safety. Child safety risks. Child Safety risk assessments were conducted using a team of experts, to assess the model’s capability to produce outputs that could result in Child Safety risks and inform on any necessary and appropriate risk mitigations via fine tuning. We leveraged those expert red teaming sessions to expand the coverage of our evaluation benchmarks through model development. For Llama 3, we conducted new in-depth sessions using objective based methodologies to assess model risks along multiple attack vectors. We also partnered with content specialists to perform red teaming exercises assessing potentially violating content while taking account of market specific nuances or experiences.

<sub>§5.4.6 Red Teaming</sub>

### 12. System Level Safety

In various real-world applications of large language models, models are not used in isolation but are integrated into broader systems. In this section, we describe our system level safety implementation, which supplements model-level mitigations by providing more flexibility and control. To enable this, we develop and release a new classifier, Llama Guard 3, which is a Llama 3 8B model fine-tuned for safety classification. Similar to Llama Guard 2 ( Llama-Team, 2024 ) , this classifier is used to detect whether input prompts and/or output responses generated by language models violate safety policies on specific categories of harm. It is designed to support Llama’s growing capabilities, and can be used for English and multilingual text. It is also optimized to be used in the context of tool-calls such as search-tools and preventing code interpreter abuse. Finally, we also provide quantized variants to reduce memory requirements. We encourage developers to use our release of system safety components as a foundation and configure them for their own use cases. Taxonomy. We train on the 13 hazard categories listed in the AI Safety taxonomy ( Vidgen et al., 2024 ) : Child Sexual Exploitation, Defamation, Elections, Hate, Indiscriminate Weapons, Intellectual Property, Non-Violent Crimes, Privacy, Sex-Related Crimes, Sexual Content, Specialized Advice, Suicide & Self-Harm, and Violent Crimes. We also train on Code Interpreter Abuse category to support tool-calls use cases. Training data. We start with the English data used by Llama Guard ( Inan et al., 2023 ) and expand this dataset to incorporate new capabilities. For new capabilities such as multilingual and tool use, we collect prompt and response classification data, as well as utilize the data collected for safety finetuning. We increase the number of unsafe responses in the training set by doing prompt engineering to get the LLM to not refuse responding to adversarial prompts. We use Llama 3 to obtain response labels on such generated data. To improve the performance of Llama Guard 3, we do extensive cleaning of the collected samples using human annotation as well as LLM annotation by Llama 3. Obtaining labels for user prompts is a much harder task for both humans and LLMs, and we find that the human labels are slightly better, especially for borderline prompts, though our full iterative system is able to reduce the noise and produce more accurate labels. Results. Llama Guard 3 is able to significantly reduce violations across capabilities (-65% violations on average across our benchmarks). Note that adding system safeguards (and any safety mitigations in general) comes at the cost of increased refusals to benign prompts. In Table 25 we report reductions in violation rate and increases in false refusal rate increase compared to the base model to highlight this tradeoff. This effect is also visible in Figures 19 , 20 , and 21 . System safety also offers more flexibility. Llama Guard 3 can be deployed for specific harms only enabling control over the violations and false refusals trade-off at the harm category level. Table 26 presents violations reduction per category to inform which category should be turned on/off based on the developer use case. To make it easier to deploy safety systems, we provide a quantized version of Llama Guard 3 using the commonly used int8 quantization technique, reducing its size by more than 40%. Table 27 illustrates that quantization has negligible impact on the performance of the model. Prompt-based system guards. System-level safety components enable developers to customize and control how LLM systems respond to user requests. As part of our work on improving the overall safety of the model system and enable developers to deploy responsibly, we describe and release the creation of two prompt-based filtering mechanisms: Prompt Guard and Code Shield . We open-source these for the community to leverage as-is or take as inspiration and adapt for their usecases. Prompt Guard is a model-based filter designed to detect prompt attacks , which are input strings designed to subvert the intended behavior of an LLM functioning as part of an application. The model is a multi-label classifier that detects two classes of prompt attack risk - direct jailbreaks (techniques that explicitly try to override a model’s safety conditioning or system prompt) and indirect prompt injections (instances where third-party data included in a model’s context window includes instructions inadvertently executed as user commands by an LLM). The model is fine-tuned from mDeBERTa-v3-base , a small (86M) parameter model suitable for filtering inputs into an LLM. We evaluate the performance on several evaluation datasets shown in Table 28 . We evaluate on two datasets (jailbreaks and injections) drawn from the same distribution as the training data, as well as an out-of-distribution dataset in English, a multilingual jailbreak set built from machine translation, and a dataset of indirect injections drawn from CyberSecEval (both English and multilingual). Overall, we find that the model generalizes well to new distributions and has strong performance. Code Shield is an example of a class of system-level protections based on providing inference-time filtering. In particular, it focuses on detecting the generation of insecure code before it might enter a downstream usecase such as a production system. It does so by leveraging a static analysis library, the Insecure Code Detector (ICD), to identify insecure code. ICD uses a suite of static analysis tools to perform the analysis across 7 programming languages. These kinds of guardrails are generally useful for developers, who can deploy multi-layered protections in various applications.

<sub>§5.4.7 System Level Safety</sub>

### 13. Limitations

We conducted extensive measurement and mitigation on a wide variety of risks to safe usage of Llama 3. However, no testing can be guaranteed to be exhaustive in identifying every possible risk. Llama 3 may still generate harmful content due to training on various datasets, particularly for languages beyond English and when prompt engineered by skilled adversarial red teamers. Malicious developers or adversarial users may find new ways to jailbreak our models and use them for various nefarious usecases. We will continue to proactively identify risks, conduct research on mitigation methods, and we encourage developers to consider responsibility in every aspect — from model development to deployment to users. We hope developers will leverage and contribute to the tools we release in our open-source system-level safety suite.

<sub>§5.4.8 Limitations</sub>

## 总结与展望
Llama 3 报告里的后训练流程是「拒绝采样 + 多轮偏好优化」，本质上也是「用评估挑样本」的一种。它和本方向的连接点在于：它的评估器（奖励模型）与生成器是同族模型，这正是自评偏差的条件。

**It connects to**

- `2507.06261` — 同类工业报告，提供「大厂如何避免评估器与生成器同源」的少数线索。

## 不足之处
**The authors say:** We conducted extensive measurement and mitigation on a wide variety of risks to safe usage of Llama 3. However, no testing can be guaranteed to be exhaustive in identifying every possible risk. Llama 3 may still generate harmful content due to training on various datasets, particularly for languages beyond English and when prompt engineered by skilled adversarial red teamers. Malicious developers or adversarial users may find new ways to jailbreak our models and use them for various nefarious usecases. We will continue to proactively identify risks, conduct research on mitigation methods, and we encourage developers to consider responsibility in every aspect — from model development to deployment to users. We hope developers will leverage and contribute to the tools we release in our open-source system-level safety suite.

**What a reader should still not conclude**

- 报告没有披露奖励模型的校准误差与重复运行方差。
- 它不讨论循环，只讨论一次性的流水线。

<sub>§5.4.8 Limitations</sub>

---

# GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning

arXiv:2507.19457 · 2025 · [source](https://arxiv.org/html/2507.19457)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have enabled development of agents and systems that combine fuzzy natural-language specifications with tools like retrieval and code execution. This raises the question of how LLMs should be optimized for downstream performance. One popular approach is Reinforcement Learning with Verifiable Rewards (RLVR), e.g. with Group Relative Policy Optimization (GRPO) ( Shao et al., 2024 ) , which treats success metrics as end-of-rollout scalar rewards used to estimate policy gradients ( Lambert, 2025 ) . While these RL approaches are effective, they typically require tens of thousands of rollouts in practice to fit new tasks. For example, recent works leveraging GRPO typically use up to hundreds of thousands of rollouts for training ( Chen et al., 2025c ; Wu et al., 2025b ; Zhang et al., 2025 ; Jin et al., 2025 ; Si et al., 2025 ; Wang et al., 2025a ; Chen et al., 2025a ; Sha et al., 2025 ; Lin et al., 2025a ; Peng et al., 2025 ; Song et al., 2025 ) . This sample inefficiency can quickly become a serious bottleneck: many downstream LLM applications invoke expensive tool calls, have limited inference budget for sampling from the LLM itself, or simply cannot finetune the weights of the largest or best-performing LLMs.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Evaluation"]
```

![A comparison of learning behavior of the GEPA prompt optimizer against a state-of-the-art prompt optimizer (MIPROv2) and GRPO (24,000 rollouts). As more rollouts are sampled, the prompt optimizers can learn much more quickly than GRPO. GEPA substantially outperforms both GRPO and MIPROv2 in final score. The Test-set star markers demonstrate the performance gap in a held-out set of questions.](https://arxiv.org/html/2507.19457v2/HotpotQABench_qwen3-8b_True_rollout_vs_score.svg)

*A comparison of learning behavior of the GEPA prompt optimizer against a state-of-the-art prompt optimizer (MIPROv2) and GRPO (24,000 rollouts). As more rollouts are sampled, the prompt optimizers can learn much more quickly than GRPO. GEPA substantially outperforms both GRPO and MIPROv2 in final score. The Test-set star markers demonstrate the performance gap in a held-out set of questions.*

<sub>figure: `2507.19457v2/HotpotQABench_qwen3-8b_True_rollout_vs_score.svg`</sub>

## 机制
### 1. Evaluation

We adopt a standard train/validation/test split. Optimizers have full access to the train split, including text and labels, for program tuning. Although optimizers may monitor the performance of candidate parameters (like model checkpoints) by tracking scores on the validation set (to implement early stopping, for example), direct access to the content of validation instances is restricted. We evaluate on six benchmarks—AIME-2025 ( Balunović et al., 2025 ) , LiveBench-Math ( White et al., 2025 ) , HotpotQA ( Yang et al., 2018 ) , IFBench ( Pyatkin et al., 2025a ) , HoVer ( Jiang et al., 2020 ) , and PUPA ( Li et al., 2025a ) —each paired with existing compound AI systems and feedback functions. Experiments use Qwen3 8B ( Yang et al., 2025 ) and GPT-4.1 Mini ( OpenAI, 2025 ) with standardized inference settings, and compare against state-of-the-art optimizers MIPROv2 ( Opsahl-Ong et al., 2024 ) , Trace (with its OptoPrime optimizer) ( Cheng et al., 2024 ) , TextGrad ( Yuksekgonul et al., 2025 ) , and GRPO 1 1 1 We use LoRA for GRPO due to its low cost and succesful adoption with GRPO ( Wang et al., 2025b ; Xu et al., 2025b ; Li et al., 2025b ; Yue et al., 2025 ; Sun et al., 2025 ; Hayou et al., 2025 ; Zhao et al., 2025 ; Teknium et al., 2024 ; Zhao et al., 2024 ; Sidahmed et al., 2024 ) . Additionally, we explore full-parameter finetuning. Figure 11 shows a similar result comparing GEPA to GRPO with full finetuning. ( Shao et al., 2024 ) . Appendix E provides further details on benchmarks, systems, and feedback functions (Subsection E.1 ); models and inference settings (Subsection E.2 ); monetary cost to run the experiments (Subsection E.3 ); and optimizer configurations (Subsection E.4 ). Table 1 , Table 2 and Figure 10 summarize our main results, from which we derive the following observations: Observation 1: Reflective Prompt Evolution is highly sample-efficient and can outperform weight-space reinforcement learning: Across four benchmarks, GEPA adapts rapidly and generalizes robustly in compound AI systems—beating GRPO (24,000 rollouts) by up to 19% while using up to 35 × 35\times fewer rollouts. It reaches optimal test performance with 4 4 – 35 × 35\times fewer rollouts and exceeds GRPO on 5 out of 6 tasks by 19.0%, 2.73%, 13.66%, 5.19% and 0.7%. GEPA matches GRPO’s best validation after only 243, 402, 330, 1143, 1179, and 306 rollouts—up to 78 × 78\times greater sample efficiency. GEPA+Merge widens the gap, outperforming GRPO by 21% at a comparable rollout budget to GEPA. The majority of GEPA’s rollout budget is spent on validation, where scores are utilized solely for candidate selection and not for producing learning signals. If we restrict the analysis to train set rollouts, GEPA requires only 79 to 737 rollouts to reach optimal performance. To match GRPO’s best validation scores, GEPA achieves this with only 102, 32, 6, and 179 train rollouts for four tasks, respectively, underscoring the high sample efficiency of learning based on reflective prompt evolution. Since tracking candidates’ validation performance accounts for majority of GEPA’s rollout budget, sample efficiency can be further improved by evaluating on a smaller validation set or by tracking scores on dynamically selected validation subsets instead of the full set—both of which we propose as directions for future work. Figures 1(a) , 1(b) , 14(c) and 15(c) show the full performance-vs-rollouts curve for all optimizers over benchmarks HotpotQA, IFBench, HoVer and PUPA, respectively. Observation 2: Reflective prompt evolution enables instruction-optimization alone to outperform joint instruction and few-shot optimization: We compare GEPA with MIPROv2, a state-of-the-art instruction and few-shot optimizer, using two leading models across six diverse tasks, and observe that GEPA consistently outperforms MIPROv2 in all settings, achieving margins as high as 11.1% for GPT-4.1 mini and 10.3% for Qwen3 8B. Further, GEPA and GEPA+Merge more than double the aggregate gains over baseline seen with MIPROv2 across all benchmarks and models (+13.33% and +12.19% vs +5.64% for MIPROv2). While prior works such as Opsahl-Ong et al. (2024) and Wan et al. (2024) have provided compelling evidence for the effectiveness of few-shot example optimization—often outperforming instruction-based approaches—our findings suggest an exciting shift in this trend. We attribute this primarily to recent advances in the instruction-following and self-reflective abilities of LLMs, as well as the design choices in GEPA that capitalize on these improved capabilities. To further contextualize our findings, we redo the study on generalization gap (the difference between validation and test set performance for optimized prompts) as proposed by Wan et al. (2024) . The results presented in Figure 16 reinforce these observations: reflectively evolved instructions now demonstrate a lower generalization gap, underscoring both advancements in model capabilities and the benefits of GEPA’s design. We see this as a reflection of the continuous evolution of LLMs and GEPA’s ability to effectively leverage these improvements. We provide the full-length optimized prompts produced by GEPA for all systems, benchmarks, and models in Appendix L , alongside MIPROv2 prompts. Notably, in contrast to prior findings where instruction optimization yielded improvements primarily through quasi-exemplars ( Wan et al., 2024 ) , GEPA’s prompts frequently contain detailed declarative instructions for completing the task, as illustrated in Figure 2 . Observation 3: The next-candidate selection strategy strongly influences the optimization trajectory and final performance, with Pareto-based sampling providing a distinct advantage. GEPA refines prompts iteratively with rollout feedback; to test our Pareto-based selection, we compare against a baseline that always picks the best-performing candidate in the SelectBestCandidate strategy (which is similar to the strategy used by TextGrad Yuksekgonul et al. (2025) ), and BeamSearch ( N =4) (used by APO Pryzant et al. (2023) ). As shown in Table 3 , these baselines often yield suboptimal exploration of the prompt search space, leading to poor performance. GEPA with Pareto-based sampling outperforms the BeamSearch strategy by upto 11.33%, and SelectBestCandidate strategy by up to 8.17%, with an aggregate margin of +7.33% and +6.4% across all benchmarks, respectively. Figure 6 highlights the difference in optimization trajectories: always choosing the current best candidate gives immediate improvement but quickly stalls, wasting rollouts on a single candidate. In contrast, our Pareto-based method expands the search by considering all Pareto-optimal candidates (all “winning” strategies found so far), balancing exploration and exploitation and converging to a higher-performing solution within the same rollout budget. Observation 4: Instruction-optimized prompts are computationally cheaper and generalize better than few-shot demonstration prompts: In addition to their strong generalization capabilities, reflectively evolved instructions offer a significant practical advantage: they are often much shorter and thus computationally more efficient than few-shot demonstration prompts. This advantage becomes especially clear for complex tasks, where even a single few-shot demonstration can be prohibitively long. The problem is further exacerbated when few-shot examples are optimized using state-of-the-art methods such as MIPROv2, which jointly optimizes multiple demonstrations to be used simultaneously, further increasing prompt length. In contrast, reflectively evolved instructions—such as those generated by GEPA—maintain compactness while providing large performance gains (as demonstrated in Lessons 1 and 2). To illustrate this, we compare GEPA’s and MIPROv2’s prompt lengths (see Figure 18 ). Notably, prompts produced by GEPA and GEPA+Merge are up to 9.2 × 9.2\times shorter than those from MIPROv2, representing a substantial improvement in efficiency, alongside performance improvements. Moreover, we observe a trend where, in aggregate, optimizers that achieve higher performance tend to produce shorter prompts (see Figure 17 ). This reduction in prompt size has a significant impact—not only reducing runtime cost for downstream tasks (as all API-providers meter the input tokens), but also decreasing latency and improving the overall efficiency of LLM-serving systems ( Kwon et al., 2023 ; Zheng et al., 2024 ; Agrawal et al., 2023 ; Yu et al., 2025 ) . Observation 5: System aware crossover strategies can provide large gains, but the optimal budget allocation between mutation and crossover, as well as when to invoke merge needs further study: We identify a unique system-aware crossover strategy and operationalize it as Merge (described in Appendix D.1 ). GEPA+Merge can outperform GEPA by as much as 5%, providing an aggregate 2% additional improvement over the already strong performance established by GEPA. Detailed results are available in Table 1 . We attribute these gains to the ability of GEPA+Merge to identify distinct optimization lineages, that have learnt complementary strategies (by evolving distinct modules), and merging them by picking the best version of different modules from each of these lineages to propose a single, optimal candidate. While in our analysis, we found GEPA+Merge works especially well for GPT-4.1 Mini, it lead to performance degradation when used with Qwen3 8B. Even Qwen3 8B benefits from Merge on one out of four tasks. We attribute these discrepancies to the way the rollout budget is allocated between reflective mutation and crossover, and the timing of invocation of the crossover strategy. In our experiments, we fixed the same hyperparameters for GPT-4.1 Mini and Qwen3 8B, leading to suboptimal choice for Qwen3 8B. Intuitively, crossover would provide the maximum benefit, when there are independent lineages that perform well. Hence, the hyperparameters should be chosen such that Merge is invoked once the optimization tree has evolved sufficiently different lineages. We propose the study of such adaptive techniques as future work. Observation 6: GEPA-optimized prompts demonstrate cross-model generalization. Table 2 presents results for “GEPA-Qwen-Opt”, a configuration where prompts were optimized using the smaller Qwen3-8B model but evaluated on GPT-4.1-Mini. Despite originating from a weaker model in a different family, these prompts transfer effectively, achieving a +9.00% aggregate improvement across 6 benchmarks (with gains as high as +27.67% on HotpotQA). Remarkably, this transfer performance outperforms strong baselines like MIPROv2 (+5.64%), TextGrad (+6.11%), and Trace (+3.27%), even though those methods were optimized directly on the target GPT-4.1-Mini model.

<sub>§4 Evaluation</sub>

## 总结与展望
GEPA 用自然语言反思代替梯度，在提示优化上超过 GRPO 且 rollout 少得多。它对本方向的意义是「反馈的载体」：反思是一段文字而不是一个标量，所以它能携带「为什么错」的信息，而分数不能。

**It connects to**

- `2408.08435` — 两者都在优化「写出来的东西」，一个优化提示，一个优化代理代码。

## 不足之处
**What a reader should still not conclude**

- 它的评估仍是基准准确率，反思的质量由结果间接度量；没有独立的「反思是否忠实」检验。
- 机制段很短，主要篇幅在实验，所以这里引到的多是协议而非原理。

---

# Artificial Hivemind: The Open-Ended Homogeneity of Language Models (and Beyond)

arXiv:2510.22954 · 2025 · [source](https://arxiv.org/html/2510.22954)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LMs) are the core backbone of modern AI systems but often fail to produce the diverse, human-like creativity expected in open-ended tasks that do not have a ground truth answer West and Potts (2025) ; Zhang et al. (2024) ; Zhang et al. (2025b) ; Li et al. (2024b) . This shortfall has sparked growing concerns about the long-term homogenization of human thought, as users are repeatedly exposed to similar outputs Sourati et al. (2025) ; Bommasani et al. (2022) . While ensemble methods or model “swarms” have been proposed to enhance diversity Feng et al. (2025b) ; Feng et al. (2025a) , their scalable evaluations of diversity in real-world settings are still lacking Gerstgrasser et al. (2024) . Existing benchmarks often target stylized tasks such as persona generation ( Ge et al., 2024 ) , keyword-driven storytelling ( Chakrabarty et al., 2024 ) , or random number generation ( Zhang et al., 2024 ; West and Potts, 2025 ) , and often rely on narrowly defined tests centered on poetry or figurative language ( Padmakumar et al., 2025 ; Zhang et al., 2025b ) . Yet, these settings fail to capture the open-endedness and pluralism of real-world user interactions.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Artificial Hivemind: Intra- and Inter-Model Homogeneity in LMs"]
  N1["§4 How Do LMs, Reward Models, and LM Judges Handle Alternative Responses to Open-Ended Queries?"]
  N2["§4.1 Gathering Distributional Annotations Across Many Humans"]
  N3["§4.2 Gathering LMs, Reward Models, and LM Judges Ratings"]
  N4["§4.3 Comparing Model Ratings to Human Scores for Responses to Open-Ended Queries"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

![Responses to the query “Write a metaphor about time” clustered by applying PCA to reduce sentence embeddings to two dimensions. Each of the 25 models generates 50 responses using top- p sampling ( p = 0.9 p=0.9 ) and temperature = 1.0 =1.0 . Despite the diversity of model families and sizes, the responses form just two visually prominent regions in the 2D projection : a dominant cluster on the left centered on the metaphor “time is a river,” and a smaller cluster on the right revolving around variations of “time is a weaver.”](https://arxiv.org/html/2510.22954v2/metaphor_cluster_example.png)

*Responses to the query “Write a metaphor about time” clustered by applying PCA to reduce sentence embeddings to two dimensions. Each of the 25 models generates 50 responses using top- p sampling ( p = 0.9 p=0.9 ) and temperature = 1.0 =1.0 . Despite the diversity of model families and sizes, the responses form just two visually prominent regions in the 2D projection : a dominant cluster on the left centered on the metaphor “time is a river,” and a smaller cluster on the right revolving around variations of “time is a weaver.”*

<sub>figure: `2510.22954v2/metaphor_cluster_example.png`</sub>

## 机制
### 1. Artificial Hivemind: Intra- and Inter-Model Homogeneity in LMs

Using a subset of 100 representative open-ended queries from Infinity-Chat (denoted Infinity-Chat100 , human verified to be open-ended as detailed in §Appendix B.3 ), we systematically examine the “Artificial Hivemind” of LMs. We focus on two aspects: (1) intra-model repetition , where the same LM fails to generate diverse outputs, and (2) inter-model homogeneity , where different models produce similar outputs. Prior studies have explored intra-model repetition at small scales or with synthetic tasks (e.g., random number/name generation) West and Potts (2025) ; Zhang et al. (2024) . In contrast, we conduct a large-scale study on real-world open-ended questions, spanning 70+ LMs (25 detailed in the main paper, representing the strongest or largest models from major model families), providing the first systematic analysis of cross-model output convergence. Full experimental setup, complete model results, and examples are provided in §Appendix C . Intra-model repetition. For each model, we sample 50 responses per query from Infinity-Chat100 , compute the average pairwise embeddings similarity within each response pool 1 1 1 Sentence embeddings from OpenAI’s text-embedding-3-small API are used. , and report the percentage of queries falling into different similarity ranges. Despite using high-stochasticity decoding parameters (top- p = 0.9 =0.9 , t = 1.0 =1.0 ), responses from the same model remain highly repetitive, as shown in Figure 4 : in 79% of cases, the average similarity exceeds 0.8. Since higher temperatures tend to produce incoherent text, these results show that even under maximally aggressive sampling, LMs still fail to generate diverse responses to open-ended queries. Recent work introduces min- p decoding Nguyen et al. (2025) , a dynamic strategy for enhancing generation diversity that adjusts the sampling threshold based on model confidence. We evaluate min- p decoding with the same setup and compute pairwise sentence embedding similarities. As shown in Figure 5 , while min- p reduces extreme repetition (fewer pairs above 0.9), 81 % 81\% of response pairs still exceed 0.7 similarity and 61.2 % 61.2\% exceed 0.8, revealing mode collapse even under diversity-oriented decoding. Despite its promise, min- p is not widely adopted, as it is better suited for creative tasks and less effective for close-ended ones Nguyen et al. (2025) . More broadly, inference-time interventions such as decoding strategies are an important part of the solution, but relying on them alone places much of the burden on users to select and configure appropriate methods. We therefore view model training as another crucial component of a broader, multifaceted approach: training-time solutions can help preserve output diversity more robustly and by default, without requiring user intervention at inference time. For the complete breakdown of results across all models, see §Appendix C.2 . Inter-model homogeneity. Not only do individual models repeatedly generate similar content, but different model sizes and families also produce highly repetitive outputs, sometimes sharing substantial phrase overlaps. As shown in Figure 6 , the average pairwise similarity between responses from different models ranges from 71 % 71\% to 82 % 82\% , with some pairs notably higher. For example, DeepSeek-V3 and qwen-max-2025-01-25 share a similarity of 0.82 0.82 , while DeepSeek-V3 and gpt-4o-2024-11-20 reach 0.81 0.81 . Interestingly, OpenAI’s GPT models and Qwen’s API models tend to have higher similarities even with models outside their own families. Although the exact causes remain unclear due to proprietary training details, possible explanations include shared data pipelines across regions or contamination from synthetic data. We highlight the need for future work to rigorously investigate the sources of such cross-model repetition. Beyond general trends, we further analyze how repetition emerges at the instance level. As in prior work Li et al. (2024b) ; Namuduri et al. (2025) , we observe verbatim phrase overlaps within responses from the same model. Surprisingly, such overlaps are also prevalent across different models, even for fully open-ended queries with large output spaces. For example, Figure 6 shows that DeepSeek-V3 and gpt-4o-2024-11-20 generate overlapping phrases like “Elevate your iPhone with our,” “sleek, without compromising,” and “with bold, eye-catching” in answer to the query “Create a description with 2-3 sentences for an iPhone case collection that is a slim-fitted case with bold designs.” In some cases, models output identical responses: for “Generate a motto for a social media page focused on successes, wealth, and self-help,” both qwen-max-2025-01-25 and qwen-plus-2025-01-25 generate “Empower Your Journey: Unlock Success, Build Wealth, Transform Yourself.” These instance-level verbatim overlaps illustrate the severity of the “Artificial Hivemind” effect across models. Paraphrases of the same open-ended queries also lead to verbatim overlaps, as illustrated in Tables 17 – 18 in § Appendix C.4 . Beyond surface-level overlap, repetition also manifests semantically: models converge on core ideas using different phrasing. As shown in Figure 1 (more in Figure 15 - 18 ), for the query “Write a metaphor about time,” 50 responses from each of 25 models form just two primary visual clusters : a dominant one centered on “time is a river” and a secondary one on “time is a weaver.” This convergence of abstract concepts reveals the “Artificial Hivemind” exposed in more subtle forms. To quantify response uniformity across models, we examine the extent to which outputs from different models become indistinguishable from one another. Given 25 unique models, each generating 50 outputs to queries from Infinity-Chat , we ideally expect greater diversity across different models than from within a single model. To measure this, we identify the top N N most similar outputs for each query and count the unique models contributing to that set. A higher count suggests stronger cross-model similarity. As shown in Figure 8 , the most similar responses often originate from multiple models. For instance, with N = 50 N=50 , perfectly disjoint responses would yield all 50 from a single model. Yet, we find an average of ∼ \sim 8 unique models per top-50 cluster, with some queries exceeding 10, indicating distinct models frequently generate highly similar content, sometimes resulting in higher inter- than intra-model similarity. See full inter-model homogeneity results in §Appendix C.3 . To summarize, our work provides further evidence of high syntactic repetition across different models. While a full causal analysis is beyond the scope of this study, our findings motivate future research to investigate whether such repetition arises from pretraining data, alignment processes, memorization, contamination, or generalization.

<sub>§3 Artificial Hivemind: Intra- and Inter-Model Homogeneity in LMs</sub>

### 2. How Do LMs, Reward Models, and LM Judges Handle Alternative Responses to Open-Ended Queries?

Having established the generative homogeneity of LMs, in this section, we examine whether the ratings of LMs , reward models , and LM judges are calibrated to match human scores given different responses to open-ended queries from Infinity-Chat .

<sub>§4 How Do LMs, Reward Models, and LM Judges Handle Alternative Responses to Open-Ended Queries?</sub>

### 3. Gathering Distributional Annotations Across Many Humans

Humans may have divergent preferences over similar-quality alternative responses to open-ended queries. To study how models handle such diversity, we need densely annotated data that captures distributional human preferences. Existing alignment datasets, like HelpSteer3 Wang et al. (2025c) , typically contain only sparse labels (e.g., 3 annotators per item). To address this, we collect both absolute ratings (1–5 scale for response quality) and pairwise preference ratings (strong/weak preference between two responses to the same query), each with extensive annotations. For absolute ratings, we sample 15 responses for each of 50 prompts from Infinity-Chat100 and collect 25 ratings per (Query, Response), yielding 25 × 15 × 50 = 18,750 25\times 15\times 50=18{,}750 labels. For pairwise preference rating, we sample 10 response pairs per prompt and gather 25 annotations per (Query, Response 1, Response 2), totaling 25 × 10 × 50 = 12,500 25\times 10\times 50=12{,}500 labels. This is the first large-scale human-annotated dataset with dense human ratings on alternative responses to the same open-ended queries, providing both absolute and pairwise preference labels for fine-grained analysis of human idiosyncratic and collective preference distributions. Full details of the human annotation process are provided in §Appendix D.1 . Figure 7 shows the distribution of Shannon entropy over human preference annotations for (Query, Response 1, Response 2) triplets. Annotators often disagree on which response is better, resulting in entropy skewed toward the higher end. As shown by the bar charts on the right, label distributions vary widely across examples: some response pairs show near-uniform support across all options, indicating substantial annotator disagreement for alternative responses of open-ended queries. Figure 9 shows a similar trend in the entropy of human annotations for absolute ratings of (Query, Response) pairs.

<sub>§4.1 Gathering Distributional Annotations Across Many Humans</sub>

### 4. Gathering LMs, Reward Models, and LM Judges Ratings

We aim to assess how LMs, reward models, and LM judges align with human ratings when evaluating alternative responses to open-ended queries. Specifically, we compare 3 types of model-generated ratings against human annotations. LM scores are derived from response perplexity given the query. Reward model scores are based on standardized scalar reward outputs. LM judge ratings follow standard prompting protocols using two rubrics: an overall quality score and the HHH rubric (Helpfulness, Harmlessness, Honesty) Bai et al. (2022a) . See §Appendix D.2 for the full list of 56 state-of-the-art LMs, 6 top-ranked reward models (per RewardBench Lambert et al. (2024) ), 4 LM judges (including GPT-4o and Prometheus Kim et al. (2024) variants), and details on the rating procedures.

<sub>§4.2 Gathering LMs, Reward Models, and LM Judges Ratings</sub>

### 5. Comparing Model Ratings to Human Scores for Responses to Open-Ended Queries

We examine how model ratings align with human judgments on (1) similar-quality alternative responses to the same open-ended queries and (2) responses with high annotator disagreement . Motivation for comparing model scores to average human ratings. Our motivation stems from how reward models (or LM judges) are used in training to evaluate responses to open-ended queries without a single ground truth. Different annotators may prefer different answers, yet their average ratings are often similar, implying multiple responses can be equally high-quality. Current reward models, however, fail to capture this equivalence, assigning diverging scores and causing downstream models to overvalue one response despite comparable human approval. To address this, we collect 25 human ratings per example to capture diverse preferences, using the average score to reflect shared human judgment. We then test whether LMs, reward models, and LM judges correlate less reliably with responses that humans broadly consider comparably good, hence our choice to compute human correlation using average human ratings. Models show weaker alignment with human ratings for alternative responses of similar quality. We hypothesize that models are less aligned with human judgments on similar-quality examples, as models are typically trained with more clearly differentiated responses. For the absolute rating setup, we identify similar-quality (Query, Response) pairs by filtering out outliers using Tukey’s fences Data et al. (2016) . This method defines outliers as points beyond Q 1 − k ⋅ IQR Q_{1}-k\cdot\mathrm{IQR} or Q 3 + k ⋅ IQR Q_{3}+k\cdot\mathrm{IQR} , where Q 1 Q_{1} and Q 3 Q_{3} are the 25th and 75th percentiles and IQR = Q 3 − Q 1 \mathrm{IQR}=Q_{3}-Q_{1} . We vary the constant k k from 0.5 (aggressive filtering) to 3.0 (conservative filtering) in increments of 0.5 to generate subsets of increasing similarity. We then compute Pearson correlations between model and human absolute ratings on the full set and these filtered subsets, as shown in Figure 10 (a). For the pairwise preference rating setup, we identify similar-quality (Query, Response 1, Response 2) triplets by ranking examples by how many annotators rate the two responses as similar in quality. We select the top 60%–95% most similar examples to form subsets, with the 60% subset containing examples of higher similarity. We then compute Pearson correlations between the score differences of model ratings and those of human ratings across the full set and each subset, as shown in Figure 11 (a). Our results show that correlations between human ratings and those of LMs, reward models, and LM judges drop significantly on similar-quality subsets, for both absolute and pairwise preference rating setups. Since there is no single gold-standard approach for selecting subsets of responses with similar quality given our data structure, we additionally report results using alternative subset selection methods in Table 19 (§ Appendix D.3 ). Our findings remain consistent across methods, highlighting the need for better modeling of fine-grained distinctions among equally high-quality responses to open-ended queries. For full results, including alternative grouping methods and model-level breakdowns, see § Appendix D.3 . Model judgments are less aligned where annotators disagree. We hypothesize that model ratings are less calibrated to human judgments on examples with high annotator disagreement, as models are primarily trained on examples with higher human agreement. For the absolute rating setup, we identify disagreement by ranking (Query, Response) pairs by Shannon entropy across 25 human labels. We then select the top 2 , 4 , 6 , 8 , 10 , 12 , 14 , 16 {2,4,6,8,10,12,14,16} % highest-entropy examples as disagreed subsets. Figure 10 (b) shows the Pearson correlations between model and human ratings across the full set and these subsets. For the pairwise preference rating setup, we quantify disagreement for each (Query, Response 1, Response 2) triplet using percentage disagreement: P disagree = 1 − max ⁡ ( C prefer 1 , C prefer 2 ) + 0.5 ⋅ C tie C total P_{\text{disagree}}=1-\frac{\max(C_{\text{prefer 1}},C_{\text{prefer 2}})+0.5\cdot C_{\text{tie}}}{C_{\text{total}}} , where C C denotes the count of annotations per preference type. We retain the top 60% to 95% most disagreed examples, with the 60% subset representing stronger disagreement. Pearson correlations between model and human score differences across the full set and each subset are shown in Figure 11 (b). Our results show that correlations with human ratings across models drop substantially for examples with high annotator disagreement, in both absolute and pairwise rating setups. We also report results using alternative subset selection methods in Table 20 (§ Appendix D.4 ). The findings remain consistent across methods, highlighting the need for more nuanced modeling of idiosyncratic human disagreement to better capture the broad spectrum of open-ended possibilities. For complete results, including alternative grouping methods and model-level breakdowns, see § Appendix D.4 .

<sub>§4.3 Comparing Model Ratings to Human Scores for Responses to Open-Ended Queries</sub>

## 总结与展望
这篇测的是语言模型的「开放式同质性」：不同的采样、不同的模型，产出的想法分布高度集中。对自我修改方向的直接含义是——如果提案来自同一个模型，那么「多样的候选」很可能只是同一个想法的多份副本，归档也就存了多份同样的东西。

**It connects to**

- `1504.04909` — 格子能测出坍塌，前提是有描述符；这篇测的是没有描述符时的坍塌。
- `2402.16822` — 一个用分格维持多样性，一个测量多样性消失。

## 不足之处
**What a reader should still not conclude**

- 它测的是「想法」的同质性，判据是人工标注或嵌入相似度，不是行为差异。
- 结论是分布层面的，不能直接推出「我们的四种提案会塌成一种」，那需要我们自己统计。

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
ReAct 的意义在自我修改方向里常被低估：它把「思考」与「动作」分成两条流，只有动作会改变环境。这给了我们一个判据——一条经验如果只来自思考（模型自述），它就没有环境证据；只有观察（工具返回）才是可核验的。

**It connects to**

- `2505.16291` — Voyager 的技能库之所以可复用，正因为它把技能写成了动作而不是思考。

## 不足之处
**What a reader should still not conclude**

- ReAct 不讨论「经验如何入库」，它只讨论一次任务内的循环。
- 论文的观察来自检索与游戏环境，返回值结构化；我们的观察常常是一段自由文本。
