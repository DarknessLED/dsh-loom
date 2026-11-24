# Library: r3-budget-stop

Built from arXiv HTML bodies on 2026-11-25. 12 work(s).

| work | year | mechanism points | figure | cited by | summary |
| --- | --- | --- | --- | --- | --- |
| [AlphaX: eXploring Neural Architectures with Deep Neural Networks and Monte Carlo Tree Search](https://arxiv.org/abs/1903.11059) | 2018 | 6 | yes | 0 | yes |
| [BOHB: Robust and Efficient Hyperparameter Optimization at Scale](https://arxiv.org/abs/1807.01774) | 2018 | 7 | yes | 0 | yes |
| [Freeze-Thaw Bayesian Optimization](https://arxiv.org/abs/1406.3896) | 2014 | 5 | yes | 2 | yes |
| [Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets](https://arxiv.org/abs/1605.07079) | 2017 | 9 | yes | 0 | yes |
| [NAS-Bench-201: Extending the Scope of Reproducible Neural Architecture Search](https://arxiv.org/abs/2001.00326) | 2020 | 5 | yes | 0 | yes |
| [Massively parallel hyperparameter tuning](https://arxiv.org/abs/1810.05934) | 2018 | 8 | yes | 0 | yes |
| [Hyperparameter Optimization: Foundations, Algorithms, Best Practices and Open Challenges](https://arxiv.org/abs/2107.05847) | 2021 | 11 | yes | 0 | yes |
| [Regularized Evolution for Image Classifier Architecture Search](https://arxiv.org/abs/1802.01548) | 2019 | 5 | yes | 4 | yes |
| [DARTS: Differentiable Architecture Search](https://arxiv.org/abs/1806.09055) | 2019 | 6 | yes | 1 | yes |
| [NAS-Bench-101: Towards Reproducible Neural Architecture Search](https://arxiv.org/abs/1902.09635) | 2019 | 6 | yes | 1 | yes |
| [Tune: A Research Platform for Distributed Model Selection and Training](https://arxiv.org/abs/1807.05118) | 2018 | 6 | yes | 0 | yes |
| [Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning](https://arxiv.org/abs/1801.01596) | 2018 | 4 | yes | 1 | yes |

Summaries written: 12 of 12

---

# AlphaX: eXploring Neural Architectures with Deep Neural Networks and Monte Carlo Tree Search

arXiv:1903.11059 · 2018 · [source](https://arxiv.org/html/1903.11059)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Designing efficient neural architectures is extremely laborious. A typical design iteration starts with a heuristic design hypothesis from domain experts, followed by the design validation with hours of GPU training. The entire design process renders many of such iterations before finding a satisfying architecture. Neural Architecture Search (NAS) has emerged as a promising tool to alleviate human effort in this trial and error design process, but the tremendous computing resources required by current NAS methods motivates us to investigate the search efficiency.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 AlphaX: A Scalable MCTS Design Agent"]
  N1["§3.1 Design, State and Action Space"]
  N2["§3.2 Search Procedure"]
  N3["§3.3 The design of Meta-DNN and its related issues"]
  N4["§3.4 Transfer Learning"]
  N5["§3.5 Distributed AlphaX"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Distributed AlphaX : we decouple the original back-propagation into two parts: one uses predicted accuracy (green arrow), while the other uses the true accuracy (blue arrow). The pseudocode for the whole system is available in Appendix Sec. 6](https://arxiv.org/html/1903.11059/1903.11059v2/AlphaX.png)

*Distributed AlphaX : we decouple the original back-propagation into two parts: one uses predicted accuracy (green arrow), while the other uses the true accuracy (blue arrow). The pseudocode for the whole system is available in Appendix Sec. 6*

<sub>figure: `1903.11059v2/AlphaX.png`</sub>

## 机制
### 1. AlphaX: A Scalable MCTS Design Agent

NASNet Search Space : [ 45 ] proposes searching a hierarchical Cell structure as shown in Fig. 3a . There are two types of Cells, Normal Cell ( N ​ C ​ e ​ l ​ l NCell ) and Reduction Cell ( R ​ C ​ e ​ l ​ l RCell ). Normal Cell maintains the input and output dimensions with the padding, while Reduction Cell reduces the height and width by half with the striding. Then, the network is constituted by stacking multiple cells. NASBench Search Space : [ 43 ] proposes searching a small Direct Acyclic Graph (DAG) with each node representing a layer and each edge representing the inter-layer dependency. Similarly, the network is constituted by stacking multiple such DAGs.

<sub>§3 AlphaX: A Scalable MCTS Design Agent</sub>

### 2. Design, State and Action Space

Design Space : the neural architectures for different domain tasks, e.g. the object detection and the image classification, follow fundamentally different designs. This renders different design spaces for the design agent. AlphaX is flexible to support various search spaces with an intuitive state and action abstraction. Here we provide a brief description of two search spaces used in our experiments. State Space : a state represents a network architecture, and AlphaX utilizes states (or nodes) to keep track of past trails to inform future decisions. We implement a state as a map that defines all the hyper-parameters for each network layers and their dependencies. We also introduce a special terminal state to allow for multiple actions. All the other states can transit to the terminal state by taking the terminal action, and the agent only trains the network, from which it reaches the terminal. With the terminal state, the agent freely modifies the architecture before reaching the terminal. This enables multiple actions for the design agent to bypass shallow architectures. Action Space : an action morphs the current network architecture, i.e. current state, to transit to the next state. It not only explicitly specifies the inter-layer connectivity, but also all the necessary hyper-parameters for each layer. Unlike games, actions in NAS are dynamically changing w.r.t the current state and design spaces. For example, AlphaX needs to leverage the current DAG (state) in enumerating all the feasible actions of ’adding an edge’. In our experiments, the actions for the NASNet search domain are adding a new layer in the left or right branch of a B ​ l ​ o ​ c ​ k i Block_{i} in a C ​ e ​ l ​ l Cell , creating a new B ​ l ​ o ​ c ​ k Block with different input combinations, and the terminating. The actions for the NASBench search domain are either adding a node or an edge, and the terminating.

<sub>§3.1 Design, State and Action Space</sub>

### 3. Search Procedure

This section elaborates the integration of MCTS and metaDNN in AlphaX. The MCTS is to analyze the most promising move at a state, while the meta-DNN is to learn the sampled architecture performance and to generalize to unexplored architectures so that MCTS can simulate many rollouts with only an actual network training in evaluating a new node. The superior search efficiency of AlphaX is due to balancing the exploration and exploitation at the finest granularity, i.e. state level, by leveraging the visiting statistics. Each node tracks these two statistics: 1) N ⁡ ( s , a ) N(s,a) counts the selection of action a a at state s s ; 2) Q ⁡ ( s , a ) Q(s,a) is the expected reward after taking action a a at state s s , and intuitively Q ⁡ ( s , a ) Q(s,a) is an estimate of how promising this search direction. Fig. 2 demonstrates a typical searching iteration in AlphaX, which consists of Selection , Expansion , Meta-DNN assisted Simulation , and Backpropagation . We elucidate each step as follows. Selection traverses down the search tree to trace the current most promising search path. It starts from the root and stops till reaching a leaf. At a node, the agent selects actions based on UCB1 [ 2 ] : where N ⁡ ( s ) N(s) is the number of visits to the state s s (i.e. N ⁡ ( s ) = ∑ a ∈ A N ⁡ ( s , a ) N(s)=\sum_{a\in A}N(s,a) ), and c c is a constant. The first term ( Q ⁡ ( s , a ) N ⁡ ( s , a ) \frac{Q(s,a)}{N(s,a)} ) is the exploitation term estimating the expected accuracy of its descendants. The second term ( 2 ​ c ​ 2 ​ log ⁡ N ​ ( s ) N ⁡ ( s , a ) 2c\sqrt{\frac{2\log N(s)}{N(s,a)}} ) is the exploration term encouraging less visited nodes. The exploration term dominates π t ​ r ​ e ​ e ​ ( s ) \pi_{tree}(s) if N ⁡ ( s , a ) N(s,a) is small, and the exploitation term otherwise. As a result, the agent favors the exploration in the beginning until building proper confidences to exploit. c c controls the weight of exploration, and it is empirically set to 0.5. We iterate the tree policy to reach a new node. Expansion adds a new node into the tree. Q ⁡ ( s , a ) Q(s,a) and N ⁡ ( s , a ) N(s,a) are initialized to zeros. Q ⁡ ( s , a ) Q(s,a) will be updated in the simulation step. Meta-DNN assisted Simulation randomly samples the descendants of a new node to approximate Q ⁡ ( s , a ) Q(s,a) of the node with their accuracies. The process is to estimate how promising the search direction rendered by the new node and its descendants. The simulation starts at the new node. The agent traverses down the tree by taking the uniform-random action until reaching a terminal state, then it dispatches the architecture for training. The more simulation we roll, the more accurate estimate of this search direction we get. However, we cannot conduct many simulations as network training is extremely time-consuming. AlphaX adopts a novel hybrid strategy to solve this issue by incorporating a meta-DNN to predict the network accuracy in addition to the actual training. We delay the introduction of meta-DNN to sec. 3.3 . Specifically, we estimate q = Q ⁡ ( s , a ) q=Q(s,a) with where s ′ = s + a s^{\prime}=s+a , and s ​ i ​ m ​ ( s ′ ) sim(s^{\prime}) represents a simulation starting from state s ′ s^{\prime} . A ​ c ​ c Acc is the actually trained accuracy in the first simulation, and P ​ r ​ e ​ d Pred is the predicted accuracy from Meta-DNN in subsequent k k simulations. If a search branch renders architectures similar to previously trained good ones, Meta-DNN updates the exploitation term in Eq. 1 to increase the likelihood of going this branch. Backpropagation back-tracks the search path from the new node to the root to update visiting statistics. Please note we discuss the sequential case here, and the backpropagation will be split into two parts in the distributed setting (sec. 3.5 ). With the estimated q q for the new node, we iteratively back-propagate the information to its ancestral as:

<sub>§3.2 Search Procedure</sub>

### 4. The design of Meta-DNN and its related issues

Meta-DNN intends to generalize the performance of unseen architectures based on previously sampled networks. It provides a practical solution to accurately estimate a search branch with many simulations without involving the actual training (see the metaDNN assisted simulation for details). New training data is generated as AlphaX advances in the search. So, the learning of Meta-DNN is end-to-end. The input of Meta-DNN is a vector representation of architecture, while the output is the prediction of architecture performance, i.e. test accuracy. The coding scheme for NASNet architectures is as follows: we use 6-digits vector to code a B ​ l ​ o ​ c ​ k Block ; the first two digits represent up to two layers in the left branch, and the 3rd and 4th digits for the right branch. Each layer is represented by a number in [ 1 , 12 ] [1,12] to represent 12 different layers, and the specific layer code is available in Appendix TABLE. 4 . We use 0 to pad the vector if a layer is absent. The last two digits represent the input for the left and right branch, respectively. For the coding of block inputs, 0 corresponds to the output of the previous C ​ e ​ l ​ l Cell , 1 is the previous, previous C ​ e ​ l ​ l Cell , and i + 2 i+2 is the output of B ​ l ​ o ​ c ​ k i Block_{i} . If a block is absent, it is [0,0,0,0,0,0]. The left part of Fig. 4 demonstrates an example of NASNet encoding scheme. A C ​ e ​ l ​ l Cell has up to 5 blocks, so a vector of 60 digits is sufficient to represent a state that fully specifies both R ​ C ​ e ​ l ​ l RCell and N ​ C ​ e ​ l ​ l NCell . The coding scheme for NASBench architectures is a vector of flat adjacency matrix, plus the nodelist. Similarly, we pad 0 if a layer or an edge is absent. The right part of Fig. 4 demonstrates an example of NASBench encoding scheme. Since NASBench limits nodes ≤ \leq 7, 7 × \times 7 (adjacency matrix)+ 7 (nodelist) = 56 digits can fully specify a NASBench architecture. Now we cast the prediction of architecture performance as a regression problem. Finding a good metaDNN is heuristically oriented and it should vary from tasks to tasks. We calculate the correlation between predicted accuracies and true accuracies from the sampled architectures in evaluating the design of metaDNN. Ideally, the metaDNN is expected to rank an unseen architecture in roughly similar to its true test accuracy, i.e. corr = 1. Various ML models, such as Gaussian Process, Neural Networks, or Decision Tree, are candidates for this regression task. We choose Neural Networks as the backbone model for its powerful generalization on the high-dimensional data and the online training capability. More ablations studies for the specific choices of metaDNN is available in sec. 4.2 .

<sub>§3.3 The design of Meta-DNN and its related issues</sub>

### 5. Transfer Learning

As MCTS incrementally builds a network with primitive actions, networks falling on the same search path render similar structures. This motivates us to incorporate Transfer Learning in AlphaX to speedup network evaluations. In simulation (Fig. 2 ), AlphaX recursively traverses up the tree to find a previously trained network with the minimal edit distance to the newly sampled network. Then we transfer the weights of overlapping layers, and randomly initialize new layers. In the pre-training, we train every samples for 70 epochs, while we train an architecture for 20 epochs if the parent weights are available. We provide an ablation study in Fig. 12 to justify the design.

<sub>§3.4 Transfer Learning</sub>

### 6. Distributed AlphaX

It is imperative to parallelize AlphaX to work on a large scale distributed systems to tackle the computation challenges rendered by NAS. Fig. 5 demonstrates the distributed AlphaX. There is a master node exclusively for scheduling the search, while there are multiple clients (GPU) exclusively for training networks. The general procedures on the server side are as follows: 1) The agent follows the selection and expansion steps described in Fig. 2 . 2) The simulation in MCTS picks a network a ​ r ​ c ​ h n arch_{n} for the actual training, and the agent traverses back to find the weights of parent architecture having the minimal edit distance to a ​ r ​ c ​ h n arch_{n} for transfer learning; then we push both a ​ r ​ c ​ h n arch_{n} and parent weights into a job queue. We define a ​ r ​ c ​ h n arch_{n} as the selected network architecture at iteration n n , and r ​ o ​ l ​ l ​ o ​ u ​ t − ​ f ​ r ​ o ​ m ​ ( a ​ r ​ c ​ h n ) rollout_{-}from(arch_{n}) as the node which it started the rollout from to reach a ​ r ​ c ​ h n arch_{n} . 3) The agent preemptively backpropagates q ^ ← 1 k ​ ∑ i = 1 . . k P ​ r ​ e ​ d ​ ( s ​ i ​ m i ​ ( s ′ ) ) \hat{q}\leftarrow\frac{1}{k}\sum_{i=1..k}Pred(sim_{i}(s^{\prime})) based only on predicted accuracies from the Meta-DNN at iteration n n . 4) The server checks the receive buffer to retrieve a finished job from clients that includes a ​ r ​ c ​ h z arch_{z} , a ​ c ​ c z acc_{z} . Then the agent starts the second backpropagation to propagate q ← a ​ c ​ c z + q ^ 2 q\leftarrow\frac{acc_{z}+\hat{q}}{2} (Eq. 2 ) from the node the rollout started ( s ← r ​ o ​ l ​ l ​ o ​ u ​ t − ​ f ​ r ​ o ​ m ​ ( a ​ r ​ c ​ h z ) s\leftarrow rollout_{-}from(arch_{z}) ) to replace the backpropagated q ^ \hat{q} with q q : The client constantly tries to retrieve a job from the master job queue if it is free. It starts training once it gets the job, then it transmits the finished job back to the server. So, each client is a dedicated trainer. We also consider the fault-tolerance by taking a snapshot of the server’s states every few iterations, and AlphaX can resume the searching from the breakpoint using the latest snapshot.

<sub>§3.5 Distributed AlphaX</sub>

## 总结与展望
AlphaX 把早停与网络结构搜索放在一个循环里：一部分预算用来尽快筛掉没希望的架构，剩下的预算给少数候选继续训练。它在这份语料里被反复引用的原因是「淘汰判据要早、要便宜」，而不是它搜出的结构；这条判据正是我们 halving 想借的东西。

**It connects to**

- `1807.01774` — BOHB 把早停与贝叶斯优化合并，是同一个「先便宜筛、再贵评」形状的更完整版本。
- `1810.05934` — ASHA 把「并行 + 逐级加预算」写成算法，两者是同一机制的不同侧重。

## 不足之处
**What a reader should still not conclude**

- 它的预算用「训练轮数」度量，能连续加；我们的预算是钱与 token，加预算要重新派活，不是同一件事。
- 论文的早停判据依赖训练曲线，我们的候选没有中间曲线，只有一次成败。

---

# BOHB: Robust and Efficient Hyperparameter Optimization at Scale

arXiv:1807.01774 · 2018 · [source](https://arxiv.org/html/1807.01774)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Machine learning has recently achieved great successes in a wide range of practical applications, but the performance of the most prominent methods depends more strongly than ever on the correct setting of many internal hyperparameters (see, e.g., Henderson et al. (2017) ; Melis et al. (2017) ). The best-performing models for many modern applications of deep learning are getting ever larger and thus more computationally expensive to train, but at the same time both researchers and practitioners desire to set as many hyperparameters automatically as possible. These constraints call for a practical solution to the hyperparameter optimization (HPO) problem that fulfills many desiderata:

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Bayesian Optimization and Hyperband"]
  N1["§3.1 Bayesian Optimization"]
  N2["§Tree Parzen Estimator."]
  N3["§3.2 Hyperband"]
  N4["§4 Model-Based Hyperband"]
  N5["§4.1 Algorithm description"]
  N6["§4.2 Parallelization"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

![Illustration of typical results obtained, here for optimizing six hyperparameters of a neural network. We show the immediate regret of the best configuration found by 4 methods as a function of time. Hyperband has strong anytime performance, but for larger budgets does not perform much better than random search. In contrast, Bayesian optimization starts slowly (like random search), but given enough time outperforms Hyperband. Our new method BOHB achieves the best of both worlds, starting fast and also converging to the global optimum quickly.](https://arxiv.org/html/1807.01774/1807.01774v1/moneyshot.svg)

*Illustration of typical results obtained, here for optimizing six hyperparameters of a neural network. We show the immediate regret of the best configuration found by 4 methods as a function of time. Hyperband has strong anytime performance, but for larger budgets does not perform much better than random search. In contrast, Bayesian optimization starts slowly (like random search), but given enough time outperforms Hyperband. Our new method BOHB achieves the best of both worlds, starting fast and also converging to the global optimum quickly.*

<sub>figure: `1807.01774v1/moneyshot.svg`</sub>

## 机制
### 1. Bayesian Optimization and Hyperband

The validation performance of machine learning algorithms can be modelled as a function f : 𝒳 → ℝ f:\mathcal{X}\rightarrow\mathbb{R} of their hyperparameters 𝒙 ∈ 𝒳 {\bm{x}}\in\mathcal{X} . We note that the hyperparameter configuration space 𝒳 \mathcal{X} can include both discrete and continuous dimensions. The hyperparameter optimization (HPO) problem is then defined as finding 𝒙 ⋆ ∈ arg ​ min 𝒙 ∈ 𝒳 ⁡ f ​ ( 𝒙 ) {\bm{x}}_{\star}\in\operatornamewithlimits{arg\,min}_{{\bm{x}}\in\mathcal{X}}f({\bm{x}}) . Due to the intrinsic randomness of most machine learning algorithms (e. g. stochastic gradient descent), we assume that we cannot observe f ⁡ ( 𝒙 ) f({\bm{x}}) directly but rather only trough noisy observations y ⁡ ( 𝒙 ) = f ⁡ ( 𝒙 ) + ϵ y({\bm{x}})=f({\bm{x}})+\epsilon , with ϵ ∼ 𝒩 ⁡ ( 0 , σ n ​ o ​ i ​ s ​ e 2 ) \epsilon\sim\mbox{${\cal N}$}(0,\sigma^{2}_{noise}) . We now discuss the two methods for tackling this optimization problem in more detail that we will use as components of our new method: Bayesian optimization and Hyperband.

<sub>§3 Bayesian Optimization and Hyperband</sub>

### 2. Bayesian Optimization

In each iteration i i , Bayesian optimization (BO) uses a probabilistic model p ⁡ ( f | D ) p(f|D) to model the objective function f f based on the already observed data points D = { ( 𝒙 0 , y 0 ) , … , ( 𝒙 i − 1 , y i − 1 ) } D=\{({\bm{x}}_{0},y_{0}),\dots,({\bm{x}}_{i-1},y_{i-1})\} . BO uses an acquisition function a : 𝒳 → ℝ a:\mathcal{X}\rightarrow\mathbb{R} based on the current model p ⁡ ( f | D ) p(f|D) that trades off exploration and exploitation. Based on the model and the acquisition function, it iterates the following three steps: (1) select the point that maximizes the acquisition function 𝒙 n ​ e ​ w = arg ​ max 𝒙 ∈ 𝒳 ⁡ a ​ ( 𝒙 ) {\bm{x}}_{new}=\operatornamewithlimits{arg\,max}_{{\bm{x}}\in\mathcal{X}}a({\bm{x}}) , (2) evaluate the objective function y n ​ e ​ w = f ⁡ ( 𝒙 n ​ e ​ w ) + ϵ y_{new}=f({\bm{x}}_{new})+\epsilon , and (3) augment the data D ← D ∪ ( 𝒙 n ​ e ​ w , y n ​ e ​ w ) D\leftarrow D\cup({\bm{x}}_{new},y_{new}) and refit the model. A common acquisition function is the expected improvement (EI) over the currently best observed value α = min ⁡ { y 0 , … , y n } \alpha=\min\{y_{0},\ldots,y_{n}\} :

<sub>§3.1 Bayesian Optimization</sub>

### 3. Tree Parzen Estimator.

The Tree Parzen Estimator (TPE) ( Bergstra et al., 2011 ) is a Bayesian optimization method that uses a kernel density estimator to model the densities over the input configuration space instead of modeling the objective function f f directly by p ⁡ ( f | D ) p(f|D) . To select a new candidate 𝒙 n ​ e ​ w {\bm{x}}_{new} to evaluate, it maximizes the ratio l ⁡ ( 𝒙 ) / g ⁡ ( 𝒙 ) \nicefrac{{l({\bm{x}})}}{{g({\bm{x}})}} ; Bergstra et al. (2011) showed that this is equivalent to maximizing EI in Equation ( 1 ). Due to the nature of kernel density estimators, TPE easily supports mixed continuous and discrete spaces, and model construction scales linearly in the number of data points (in contrast to the cubic-time Gaussian processes (GPs) predominant in the BO literature).

<sub>§Tree Parzen Estimator.</sub>

### 4. Hyperband

While the objective function f : 𝒳 → ℝ f:\mathcal{X}\rightarrow\mathbb{R} is typically expensive to evaluate (since it requires training a machine learning model with the specified hyperparameters), in most applications it is possible to define cheap-to-evaluate approximate versions f ~ ​ ( ⋅ , b ) \tilde{f}(\cdot,b) of f ⁡ ( ⋅ ) f(\cdot) that are parameterized by a so-called budget b ∈ [ b m ​ i ​ n , b m ​ a ​ x ] b\in[b_{min},b_{max}] . With the maximum budget b = b m ​ a ​ x b=b_{max} , we have f ~ ​ ( ⋅ , b m ​ a ​ x ) = f ⁡ ( ⋅ ) \tilde{f}(\cdot,b_{max})=f(\cdot) , whereas with b < b m ​ a ​ x b<b_{max} , f ~ ​ ( ⋅ , b ) \tilde{f}(\cdot,b) is only an approximation of f ⁡ ( ⋅ ) f(\cdot) whose quality typically increases with b b . In our experiments, we will use this budget to encode the number of iterations for an iterative algorithm, the number of data points used, the number of steps in an MCMC chain, and the number of trials in deep reinforcement learning. Hyperband (HB) ( Li et al., 2017 ) is a multi-armed bandit strategy for hyperparameter optimization that takes advantage of these different budgets b b by repeatedly calling SuccessiveHalving (SH) ( Jamieson & Talwalkar, 2016 ) to identify the best out of n n randomly sampled configurations. It balances very agressive evaluations with many configurations on the smallest budget, and very conservative runs that are directly evaluated on b m ​ a ​ x b_{max} . The exact procedure for this trade-off is shown in Algorithm 1 (with pseudocode for SH shown in Appendix C). Line 1 computes the geometrically spaced budget ∈ [ b m ​ i ​ n , b m ​ a ​ x ] \in[b_{min},b_{max}] . The number of configurations sampled in line 3 is chosen such that every SH run requires the same total budget. SH internally evaluates configurations on a given budget, ranks them by their performance, and continues the top η − 1 \eta^{-1} (usually the best-performing third) on a budget η \eta times larger. This is repeated until the maximum budget is reached. In practice, HB works very well and typically outperforms random search and Bayesian optimization methods operating on the full function evaluation budget quite easily for small to medium total budgets. However, its convergence to the global optimum is limited by its reliance on randomly-drawn configurations, and with large budgets its advantage over random search typically diminishes.

<sub>§3.2 Hyperband</sub>

### 5. Model-Based Hyperband

We now introduce our new practical HPO method, which we dub BOHB since it combines Bayesian optimization (BO) and Hyperband (HB). We designed BOHB to satisfy all the desiderata described in the introduction. HB already satisfies most of these desiderata (in particular, strong anytime performance, scalability, robustness and flexibility), and we combine it with BO to also satisfy the desideratum of strong final performance in BOHB. We also describe how to extend BOHB to make effective use of parallel resources. In the design of BOHB’s BO component, on top of the five desiderata above, we also followed two additional ones: Simplicity is a virtue, since simple approaches can be easily verified, have less components that can break, and can be easily reimplemented in different frameworks. HB is very simple, but standard GP-BO methods are not: they tend to require complex approximations, complex MCMC sampling over hyperparameters, and for good performance also data-dependent choices of kernel functions and hyperpriors. Since our HB component allows us to carry out many function evaluations at small budgets, the cubic complexity of standard GPs, and even the lower complexity of approximate GPs would become problematic. Furthermore, compared to these cheap function evaluations, the complexity of computing sophisticated acquisition functions may also become a bottleneck, especially when parallelization effectively reduces the cost of function evaluations. For these reasons, along with the reasons of scalability, robustness & flexibility, we based BOHB’s BO component on the simple TPE method discussed above. As reliable GP-based BO methods become available that satisfy all the desiderata above, it would be easy to replace TPE with them.

<sub>§4 Model-Based Hyperband</sub>

### 6. Algorithm description

BOHB relies on HB to determine how many configurations to evaluate with which budget, but it replaces the random selection of configurations at the beginning of each HB iteration by a model-based search. Once the desired number of configurations for the iteration is reached, the standard successive halving procedure is carried out using these configurations. We keep track of the performance of all function evaluations g ⁡ ( 𝒙 , b ) + ϵ g({\bm{x}},b)+\epsilon of configurations 𝒙 {\bm{x}} on all budgets b b to use as a basis for our models in later iterations. We follow HB’s way of choosing the budgets and continue to use SH, but we replace the random sampling by a BO component to guide the search. We construct a model and use BO to select a new configuration, based on the configurations evaluated so far. In the remainder of this section, we will explain this procedure summarized by the pseudocode in Algorithm 2 . The BO part of BOHB closely resembles TPE, with one major difference: we opted for a single multidimensional KDE compared to the hierarchy of one-dimensional KDEs used in TPE in order to better handle interaction effects in the input space. To fit useful KDEs (in line 4 of Algorithm 2 ), we require a minimum number of data points N m ​ i ​ n N_{min} ; this is set to d + 1 d+1 for our experiments, where d d is the number of hyperparameters. To build a model as early as possible, we do not wait until N b = | D b | N_{b}=|D_{b}| , the number of observations for budget b b , is large enough to satisfy q ⋅ N b ≥ N m ​ i ​ n q\cdot N_{b}\geq N_{min} . Instead, after initializing with N m ​ i ​ n + 2 N_{min}+2 random configurations (line 3), we choose the best and worst configurations, respectively, to model the two densities. This ensures that both models have enough datapoints and have the least overlap when only a limited number of observations is available. We used the KDE implementation from statsmodels ( Seabold & Perktold, 2010 ) , estimating the KDE’s bandwidth with the default estimation procedure (Scott’s rule of thumb), which is efficient and performed well in our experience. Details on our KDE are given in Appendix D. As the optimization progresses, more configurations are evaluated on bigger budgets. Given that the goal is to optimize on the largest budget, BOHB always uses the model for the largest budget for which enough observations are available (line 2). This enables it to overcome wrong conclusions drawn on smaller budgets by eventually relying on results with the highest fidelity only. To optimize EI (lines 5-6), we sample N s N_{s} points from l ′ ​ ( 𝒙 ) l^{\prime}({\bm{x}}) , which is the same KDE as l ⁡ ( 𝒙 ) l({\bm{x}}) but with all bandwidths multiplied by a factor b w b_{w} to encourage more exploration around the promising configurations. We observed that this improves convergence especially in the late stages of the optimization, when the model on the biggest budget is queried frequently but updated rarely. In order to keep the theoretical guarantees of HB, we also sample a constant fraction ρ \rho of the configurations uniformly at random (line 1). Besides global exploration, this guarantees that after m ⋅ ( s m ​ a ​ x + 1 ) m\cdot(s_{max}+1) SH runs, our method has (on average) evaluated ρ ⋅ m ⋅ ( s m ​ a ​ x + 1 ) \rho\cdot m\cdot(s_{max}+1) random configurations on b m ​ a ​ x b_{max} . As every SH run consumes a budget of at most ( s m ​ a ​ x + 1 ) ⋅ b m ​ a ​ x (s_{max}+1)\cdot b_{max} , in the same time random search evaluates ( ρ − 1 ⋅ ( s m ​ a ​ x + 1 ) ) (\rho^{-1}\cdot(s_{max}+1)) -times as many configuration on the largest budget. This means, that in the worst case (when the lower fidelities are misleading), BOHB is at most this factor times slower than RS, but it is still guaranteed to converge eventually. The same argument holds for HB, but in practice both HB and BOHB substantially outperform RS in our experiments. No optimizer is free of hyperparameters itself, and their effects have to be studied carefully. We therefore include a detailed empirical analysis of BOHB’s hyperparameters in Appendix G that shows each hyperparameter’s effect when all others are fixed to their default values (these are also listed there). We find that BOHB is quite insensitive to its hyperparameters, with the default working robustly across different scenarios.

<sub>§4.1 Algorithm description</sub>

### 7. Parallelization

Modern optimizers must be able to take advantage of parallel resources effectively and efficiently. BOHB achieves that by inheriting properties from both TPE and HB. The parallelism in TPE is achieved by limiting the number of samples to optimize EI, purposefully not optimizing it fully to obtain diversity. This ensures that consecutive suggestions by the model are diverse enough to yield near-linear speedups when evaluationed in parallel. On the other hand, HB can be parallelized by (a) starting different iterations at the same time (a parallel for loop in Alg. 1 ), and (b) evaluating configurations concurrently within each SH run. Our parallelization strategy of BOHB is as follows. We start with the first SH run that sequential HB would perform (the most aggressive one, starting from the lowest budget), sampling configurations with the strategy outlined in Algorithm 2 until either (a) all workers are busy, or (b) enough configurations have been sampled for this SH run. In case (a), we simply wait for a worker to free up and then sample a new configuration. In case (b), we start the next SH run in parallel, sampling the configurations to run for it also according to Algorithm 2 ; observations D D (and therefore the resulting models) are shared across all SH runs. BOHB is an anytime algorithm that at each point in time keeps track of the configuration that achieved the best validation performance; it can also be given a maximum budget of SH runs. We note that SH has also been parallelized in (so far unpublished) independent work ( Li et al., 2018 ) . Next to parallelizing SH runs (by filling the next free worker with the ready-to-be-executed run with the largest budget), that work mentioned that HB can trivially be parallelized by running its SH runs in parallel. In contrast to this approach of parallelizing HB by having separate pools of workers for each SH run, we rather join all workers into a single pool, and whenever a worker becomes available preferentially execute waiting runs with smaller budgets. New SH runs are only started when the SH runs currently executed are not waiting for a worker to free up. This strategy (a) allows us to achieve better speedups by using all workers in the most aggressive (and often most effective) bracket first, and (b) also takes full advantage of models built on smaller budgets. Figure 2 demonstrates that our method of parallelization can effectively exploit many parallel workers.

<sub>§4.2 Parallelization</sub>

## 总结与展望
BOHB 把 Hyperband 的多保真调度与 TPE 的采样结合起来，并且明确要求「结论用最大可用预算上的观测」——在更小预算上看到的排序可以指导淘汰，但不能直接当作最终结论。这一条对本方向最实用：它把「便宜档只能用来筛」写成了纪律。

**It connects to**

- `1810.05934` — 两者都做逐级加预算，BOHB 多了采样模型，ASHA 少了它但更容易并行。
- `2107.05847` — 综述把这套调度当作多保真优化的标准做法来介绍。

## 不足之处
**What a reader should still not conclude**

- 多保真成立的前提是「同一配置在不同预算上的表现单调相关」；我们的 cheap screen 与完整 verifier 是两个不同命令，这个前提从未被验证。
- 论文报告的是超参搜索的 regret，不是「淘汰会不会误杀」，后者才是我们关心的。

---

# Freeze-Thaw Bayesian Optimization

arXiv:1406.3896 · 2014 · [source](https://arxiv.org/html/1406.3896)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
In machine learning, the term “training” is used to describe the procedure of fitting a model to data. In many popular models, this fitting procedure is framed as an optimization problem, in which a loss is minimized as a function of the parameters. In all but the simplest machine learning models, this minimization must be performed with an iterative algorithm such as stochastic gradient descent or the nonlinear conjugate gradient method.

<sub>§1. Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4. Efficient Gaussian Processes for Iterative Training Procedures"]
  N1["§4.1 Specification"]
  N2["§4.2 Inference"]
  N3["§Marginal likelihood"]
  N4["§Posterior distribution"]
  N5["§Posterior predictive distributions"]
  N6["§4.3 Computational Complexity"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

![Example functions from the exponential decay kernel. (a) Example functions from our basis set with α = 1.0 \alpha=1.0 and β = 0.5 \beta=0.5 . (b) Samples from a Gaussian process with this covariance function. (c) Samples from a Gaussian process conditioned on the curves starting at a positive number and with an added Ornstein-Uhlenbeck kernel to simulate natural training curves.](https://arxiv.org/html/1406.3896/1406.3896v1/basis_functions.svg)

*Example functions from the exponential decay kernel. (a) Example functions from our basis set with α = 1.0 \alpha=1.0 and β = 0.5 \beta=0.5 . (b) Samples from a Gaussian process with this covariance function. (c) Samples from a Gaussian process conditioned on the curves starting at a positive number and with an added Ornstein-Uhlenbeck kernel to simulate natural training curves.*

<sub>figure: `1406.3896v1/basis_functions.svg`</sub>

## 机制
### 1. Specification

In order to perform Bayesian optimization we need to use a surrogate model as a proxy for the function of interest. The main issue with GPs is that making predictions requires O ⁡ ( N 3 ) O(N^{3}) computation, where N N is the number of training observations. In the context of freeze-thaw Bayesian optimization, a naïve model would put a Gaussian process prior over every observed training loss through time. With N N unique hyperparameters settings and up to T T training iterations per setting, computing quantities of interest using a GP would scale as O ⁡ ( N 3 ​ T 3 ) O(N^{3}T^{3}) , which is prohibitively expensive. To reduce the computational cost, we incorporate a conditional independence assumption that each training curve is drawn from a separate Gaussian process, conditioned on the prior mean, which is itself drawn from a global Gaussian process. We define 𝐲 n \boldsymbol{\mathrm{y}}_{n} to be a vector of generalization loss measurements for the n n th hyperparameter setting, i.e., it is a time series. Formally, we model the distribution over these training curves { 𝐲 n } n = 1 N \{\boldsymbol{\mathrm{y}}_{n}\}_{n=1}^{N} given hyperparameter settings { 𝐱 n } n = 1 N \{\boldsymbol{\mathrm{x}}_{n}\}_{n=1}^{N} as, where 𝐟 \boldsymbol{\mathrm{f}} is a latent function that specifies the mean of each training curve and 𝟏 \mathbf{1} is a column vector of 1 1 ’s. In other words, the generative procedure is to first draw a latent function 𝐟 \boldsymbol{\mathrm{f}} over hyper parameter settings according to a GP prior. Conditioned on 𝐟 \boldsymbol{\mathrm{f}} , each training curve is modelled independently using another GP prior with a mean given by the corresponding entry of 𝐟 \boldsymbol{\mathrm{f}} . We use a constant mean 𝐦 \boldsymbol{\mathrm{m}} (which we infer) and Matérn-5/2 kernel for the GP prior over hyperparameters. Each time-based GP uses the covariance given in Section 3 . A graphical illustration of this model is shown in Figure 2a . The training curves will asymptotically converge to 𝐟 \boldsymbol{\mathrm{f}} away from the observed points. As we will demonstrate, the conditional independence assumption is not too restrictive for the kinds of training curves that are typically found when training machine learning models. Using properties of the Gaussian distribution, we can write the joint distribution over 𝐲 \boldsymbol{\mathrm{y}} and 𝐟 \boldsymbol{\mathrm{f}} as, where 𝐲 = ( 𝐲 1 , 𝐲 2 , … , 𝐲 N ) ⊤ \boldsymbol{\mathrm{y}}=(\boldsymbol{\mathrm{y}}_{1},\boldsymbol{\mathrm{y}}_{2},\ldots,\boldsymbol{\mathrm{y}}_{N})^{\top} , 𝐎 = blockdiag ⁡ ( 𝟏 1 , 𝟏 2 , … , 𝟏 N ) \boldsymbol{\mathrm{O}}=\mathrm{blockdiag}(\mathbf{1}_{1},\mathbf{1}_{2},\ldots,\mathbf{1}_{N}) is a block-diagonal matrix, where each block is a vector of ones corresponding to number of observations in its corresponding training curve, and 𝐊 t = blockdiag ⁡ ( 𝐊 t1 , 𝐊 t2 , … , 𝐊 t ​ N ) \boldsymbol{\mathrm{K}}_{\mathrm{t}}=\mathrm{blockdiag}(\boldsymbol{\mathrm{K}}_{\mathrm{t}1},\boldsymbol{\mathrm{K}}_{\mathrm{t}2},\ldots,\boldsymbol{\mathrm{K}}_{\mathrm{t}N}) is a block-diagonal matrix where each block is the covariance for it’s corresponding training curve.

<sub>§4.1 Specification</sub>

### 2. Inference / Marginal likelihood

Using this representation, we can efficiently compute the required quantities for Bayesian optimization. We have omitted some of the details of these derivations; they can be found in the appendix. The marginal likelihood is required to estimate the hyperparameters of the GP. Using the marginalization property of the Gaussian distribution, the marginal likelihood can be derived from Equation 4.1 and is given by, The covariance of this distribution has a size of N ​ T × N ​ T NT\times NT , however we can efficiently invert it using the Woodbury matrix identity. We can also use the analogous matrix determinant lemma to obtain an efficient representation for the normalization constant of the Gaussian distribution, allowing us to write the log-likelihood as, Where 𝜸 = 𝐎 ⊤ ​ 𝐊 t − 1 ​ ( 𝐲 − 𝐎𝐦 ) \boldsymbol{\gamma}=\boldsymbol{\mathrm{O}}^{\top}\boldsymbol{\mathrm{K}}_{\mathrm{t}}^{-1}(\boldsymbol{\mathrm{y}}-\boldsymbol{\mathrm{O}}\boldsymbol{\mathrm{m}}) and a specific element can be written as, 𝜸 n = 𝟏 n ⊤ ​ 𝐊 t ​ n − 1 ​ ( 𝐲 n − 𝐦 n ) \boldsymbol{\gamma}_{n}=\mathbf{1}_{n}^{\top}\boldsymbol{\mathrm{K}}_{\mathrm{t}n}^{-1}(\boldsymbol{\mathrm{y}}_{n}-\boldsymbol{\mathrm{m}}_{n}) ; 𝚲 = 𝐎 ⊤ ​ 𝐊 t − 1 ​ 𝐎 = diag ⁡ ( λ 1 , λ 2 , … , λ N ) \boldsymbol{\Lambda}=\boldsymbol{\mathrm{O}}^{\top}\boldsymbol{\mathrm{K}}_{\mathrm{t}}^{-1}\boldsymbol{\mathrm{O}}=\mathrm{diag}(\lambda_{1},\lambda_{2},\ldots,\lambda_{N}) , where λ n = 𝟏 n ⊤ ​ 𝐊 t ​ n − 1 ​ 𝟏 n \lambda_{n}=\mathbf{1}_{n}^{\top}\boldsymbol{\mathrm{K}}_{\mathrm{t}n}^{-1}\mathbf{1}_{n} .

<sub>§4.2 Inference · §Marginal likelihood</sub>

### 3. Posterior distribution

Using the conditioning property of the Gaussian, we can express the posterior P ⁡ ( 𝐟 | 𝐲 , { 𝐱 n } n = 1 N ) P(\boldsymbol{\mathrm{f}}\,|\,\boldsymbol{\mathrm{y}},\{\boldsymbol{\mathrm{x}}_{n}\}_{n=1}^{N}) as,

<sub>§Posterior distribution</sub>

### 4. Posterior predictive distributions

Given a new hyperparameter setting 𝐱 ∗ \boldsymbol{\mathrm{x}}_{*} , the posterior distribution P ⁡ ( f ∗ | 𝐲 , { 𝐱 n } n = 1 N , 𝐱 ∗ ) P(f_{*}\,|\,\boldsymbol{\mathrm{y}},\{\boldsymbol{\mathrm{x}}_{n}\}_{n=1}^{N},\boldsymbol{\mathrm{x}}_{*}) is given by, Similarly, the posterior predictive distribution for a new point in a training curve, y n ∗ y_{n*} , is given by, Where 𝟏 ∗ \mathbf{1}_{*} is a vector of ones with size equal to the number of time-steps we are predicting. We have omitted the dependence on t t for brevity since it is a regularly spaced grid in our experiments. Finally, in the absence of any observations, the posterior predictive distribution is given by, Where μ ∗ \mu_{*} and Σ ∗ ⁣ ∗ \Sigma_{**} are the mean and variance given by Equation 24 .

<sub>§Posterior predictive distributions</sub>

### 5. Computational Complexity

In order to evaluate the GP we need to invert 𝐊 x \boldsymbol{\mathrm{K}}_{\mathrm{x}} and 𝐊 t \boldsymbol{\mathrm{K}}_{\mathrm{t}} independently. When computing the quantities 𝚲 \boldsymbol{\Lambda} and 𝜸 \boldsymbol{\gamma} we can pre-compute the Cholesky decomposition of 𝐊 t \boldsymbol{\mathrm{K}}_{\mathrm{t}} and use this to solve linear systems with a T × T T\times T matrix N N times, leading to a total computational complexity of O ⁡ ( N 3 + T 3 + N ​ T 2 ) O(N^{3}+T^{3}+NT^{2}) . In practice T T is somewhere between 10 10 and 100 100 , or can be kept small by sampling the training curves in coarser increments.

<sub>§4.3 Computational Complexity</sub>

## 总结与展望
Freeze-Thaw 用高斯过程在「要不要继续训练这个配置」上做决策，价值在于把早停当成一个带不确定性的推断问题而不是阈值。它对本方向的启示是：淘汰应该是概率性的，应该能说出「有多确定它不会变好」。

**It connects to**

- `1807.01774` — BOHB 的调度不讲不确定性，Freeze-Thaw 讲；两者合起来才是「带区间的淘汰」。

## 不足之处
**What a reader should still not conclude**

- 它依赖配置之间的相似性（核函数），我们的候选是补丁，没有天然的距离度量。
- 高斯过程在小样本下才有效，我们每个候选只有一次观测。

---

# Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets

arXiv:1605.07079 · 2017 · [source](https://arxiv.org/html/1605.07079)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The performance of many machine learning algorithms hinges on certain hyperparameters. For example, the prediction error of non-linear support vector machines depends on regularization and kernel hyperparameters C C and γ \gamma ; and modern neural networks are sensitive to a wide range of hyperparameters, including learning rates, momentum terms, number of units per layer, dropout rates, weight decay, etc. ( Montavon et al., 2012 ) . The poor scaling of naïve methods like grid search with dimensionality has driven interest in more sophisticated hyperparameter optimization methods over the past years ( Bergstra et al., 2011 ; Hutter et al., 2011 ; Bergstra and Bengio, 2012 ; Snoek et al., 2012 ; Bardenet et al., 2013 ; Bergstra et al., 2013 ; Swersky et al., 2013 ; Swersky et al., 2014 ; Snoek et al., ; Snoek et al., 2015 ) . Bayesian optimization has emerged as an efficient framework, achieving impressive successes. For example, in several studies, it found better instantiations of convolutional network hyperparameters than domain experts, repeatedly improving the top score on the CIFAR-10 ( Krizhevsky, 2009 ) benchmark without data augmentation ( Snoek et al., 2012 ; Domhan et al., 2015 ; Snoek et al., 2015 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Bayesian optimization"]
  N1["§2.1 Gaussian Processes"]
  N2["§2.2 Acquisition functions"]
  N3["§2.3 Multi-Task Bayesian optimization"]
  N4["§3 Fast Bayesian optimization for large datasets"]
  N5["§3.1 Kernels for loss and computational cost"]
  N6["§3.2 Formal algorithm description"]
  N7["§3.3 Initial design"]
  N8["§3.4 Implementation details"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
  N7 --> N8
```

![Validation error of a grid of 400 400 SVM configurations (20 settings of each of the regularization parameter C C and kernel parameter γ \gamma , both on a log-scale in [ − 10 , 10 ] [-10,10] ) for subsets of the MNIST dataset ( LeCun et al., 2001 ) of various sizes N sub N_{\text{sub}} . Small subsets are quite representative: The validation error of bad configuration (yellow) remains constant at around 0.9 0.9 , whereas the region of good configurations (blue) does not change drastically with s s .](https://arxiv.org/html/1605.07079/1605.07079v2/plots/grid_0.png)

*Validation error of a grid of 400 400 SVM configurations (20 settings of each of the regularization parameter C C and kernel parameter γ \gamma , both on a log-scale in [ − 10 , 10 ] [-10,10] ) for subsets of the MNIST dataset ( LeCun et al., 2001 ) of various sizes N sub N_{\text{sub}} . Small subsets are quite representative: The validation error of bad configuration (yellow) remains constant at around 0.9 0.9 , whereas the region of good configurations (blue) does not change drastically with s s .*

<sub>figure: `1605.07079v2/plots/grid_0.png`</sub>

## 机制
### 1. Bayesian optimization

Given a black-box function f : 𝕏 → ℝ f:\mathbb{X}\rightarrow\mathbb{R} , Bayesian optimization 2 2 2 Comprehensive tutorials are presented by Brochu et al. (2010) and Shahriari et al. (2016) . aims to find an input 𝒙 ⋆ ∈ arg ​ min 𝒙 ∈ 𝕏 ⁡ f ​ ( 𝒙 ) {\bm{x}}_{\star}\in\operatornamewithlimits{arg\,min}_{{\bm{x}}\in\mathbb{X}}f({\bm{x}}) that globally minimizes f f . It requires a prior p ⁡ ( f ) p(f) over the function and an acquisition function a p ⁡ ( f ) : 𝕏 → ℝ a_{p(f)}:\mathbb{X}\rightarrow\mathbb{R} quantifying the utility of an evaluation at any 𝒙 {\bm{x}} . With these ingredients, the following three steps are iterated ( Brochu et al., 2010 ) : (1) find the most promising 𝒙 n + 1 ∈ arg ​ max ⁡ a p ​ ( 𝒙 ) {\bm{x}}_{n+1}\in\operatornamewithlimits{arg\,max}{a_{p}({\bm{x}})} by numerical optimization; (2) evaluate the expensive and often noisy function y n + 1 ∼ f ⁡ ( 𝒙 n + 1 ) + 𝒩 ⁡ ( 0 , σ 2 ) y_{n+1}\sim f({\bm{x}}_{n+1})+\mathcal{N}(0,\sigma^{2}) and add the resulting data point ( 𝒙 n + 1 , y n + 1 ) ({\bm{x}}_{n+1},y_{n+1}) to the set of observations 𝒟 n = ( 𝒙 j , y j ) j = 1 ​ … ​ n \mathcal{D}_{n}=({\bm{x}}_{j},y_{j})_{j=1...n} ; and (3) update p ⁡ ( f ∣ 𝒟 n + 1 ) p(f\mid\mathcal{D}_{n+1}) and a p ⁡ ( f ∣ 𝒟 n + 1 ) a_{p(f\mid\mathcal{D}_{n+1})} . Typically, evaluations of the acquisition function a a are cheap compared to evaluations of f f such that the optimization effort is negligible.

<sub>§2 Bayesian optimization</sub>

### 2. Gaussian Processes

Gaussian processes (GP) are a prominent choice for p ⁡ ( f ) p(f) , thanks to their descriptive power and analytic tractability ( Rasmussen and Williams, 2006 , e.g.) . Formally, a GP is a collection of random variables, such that every finite subset of them follows a multivariate normal distribution. A GP is identified by a mean function m m (often set to m ⁡ ( 𝒙 ) = 0 ​ ∀ 𝒙 ∈ 𝕏 m({\bm{x}})=0\;\forall{\bm{x}}\in\mathbb{X} ), and a positive definite covariance function (kernel) k k . Given observations 𝒟 n = ( 𝒙 j , y j ) j = 1 ​ … ​ n = ( 𝑿 , 𝒚 ) \mathcal{D}_{n}=({\bm{x}}_{j},y_{j})_{j=1...n}=(\boldsymbol{X},{\bm{y}}) with joint Gaussian likelihood p ⁡ ( 𝒚 ∣ 𝑿 , f ⁡ ( 𝑿 ) ) p({\bm{y}}\mid\boldsymbol{X},f(\boldsymbol{X})) , the posterior p ⁡ ( f | 𝒟 n ) p(f|\mathcal{D}_{n}) follows another GP, with mean and covariance functions of tractable, analytic form. The covariance function determines how observations influence the prediction. For the hyperparameters we wish to optimize, we adopt the Matérn 5 / 2 \nicefrac{{5}}{{2}} kernel ( Matérn, 1960 ) , in its Automatic Relevance Determination form ( MacKay and Neal, 1994 ) . This stationary, twice-differentiable model constitutes a relatively standard choice in the Bayesian optimization literature. In contrast to the Gaussian kernel popular elsewhere, it makes less restrictive smoothness assumptions, which can be helpful in the optimization setting ( Snoek et al., 2012 ) : Here, θ \theta and 𝝀 {\bm{\lambda}} are free parameters—hyperparameters of the GP surrogate model—and d 𝝀 ​ ( 𝒙 , 𝒙 ′ ) = ( 𝒙 − 𝒙 ′ ) T ​ diag ⁡ ( 𝝀 ) ​ ( 𝒙 − 𝒙 ′ ) d_{\bm{\lambda}}({\bm{x}},{\bm{x}}^{\prime})=({\bm{x}}-{\bm{x}}^{\prime})^{\textrm{{\sf{T}}}}\operatorname{diag}({\bm{\lambda}})({\bm{x}}-{\bm{x}}^{\prime}) is the Mahalanobis distance. For the dataset size dependent performance and cost, we construct a custom kernel in 3.1 . An additional hyperparameter of the GP model is a overall noise covariance needed to handle noisy observations. For clarity: These GP hyperparameters are internal hyperparameters of the Bayesian optimizer, as opposed to those of the target machine learning algorithm to be tuned. Section 3.4 shows how we handle them.

<sub>§2.1 Gaussian Processes</sub>

### 3. Acquisition functions

The role of the acquisition function is to trade off exploration vs. exploitation. Popular choices include Expected Improvement (EI) ( Mockus et al., 1978 ) , Upper Confidence Bound (UCB) ( Srinivas et al., 2010 ) , Entropy Search (ES) ( Hennig and Schuler, 2012 ) , and Predictive Entropy Search (PES) ( Hernández-Lobato et al., 2014 ) . In our experiments, we will use EI and ES. We found EI to perform robustly in most applications, providing a solid baseline; it is defined as where f min f_{\text{min}} is the best function value known (also called the incumbent ). This expected drop over the best known value is high for points predicted to have small mean and/or large variance. ES is a more recent acquisition function that selects evaluation points based on the predicted information gain about the optimum, rather than aiming to evaluate near the optimum. At the heart of ES lies the probability distribution p min ​ ( 𝒙 ∣ 𝒟 ) := p ⁡ ( 𝒙 ∈ arg ​ min 𝒙 ′ ∈ 𝕏 ⁡ f ​ ( 𝒙 ′ ) ∣ 𝒟 ) p_{\min}({\bm{x}}\mid\mathcal{D}):=p({\bm{x}}\in\operatornamewithlimits{arg\,min}_{{\bm{x}}^{\prime}\in\mathbb{X}}f({\bm{x}}^{\prime})\mid\mathcal{D}) , the belief about the function’s minimum given the prior on f f and observations 𝒟 \mathcal{D} . The information gain at 𝒙 {\bm{x}} is then measured by the expected Kullback-Leibler divergence (relative entropy) between p min ( ⋅ ∣ 𝒟 ∪ { ( 𝒙 , y ) } ) p_{\min}(\cdot\mid\mathcal{D}\cup\{({\bm{x}},y)\}) and the uniform distribution u ⁡ ( 𝒙 ) u({\bm{x}}) , with expectations taken over the measurement y y to be obtained at 𝒙 {\bm{x}} : The primary numerical challenge in this framework is the computation of p min ( ⋅ ∣ 𝒟 ∪ { ( 𝒙 , y ) } ) p_{\min}(\cdot\mid\mathcal{D}\cup\{({\bm{x}},y)\}) and the integral above. Due to the intractability, several approximations have to be made. We refer to Hennig and Schuler (2012) for details, as well as to the supplemental material (Section A), where we also provide pseudocode for our implementation. Despite the conceptual and computational complexity of ES, it offers a well-defined concept for information gained from function evaluations, which can be meaningfully traded off against other quantities, such as the evaluations’ cost. PES refers to the same acquisition function, but uses different approximations to compute it. In Section 3.4 we describe why, for our application, ES was the more direct choice.

<sub>§2.2 Acquisition functions</sub>

### 4. Multi-Task Bayesian optimization

The Multi-Task Bayesian optimization (MTBO) method of Swersky et al. (2013) refers to a general framework for optimizing in the presents of different, but correlated tasks. Given a set of such tasks 𝕋 = { 1 , … , T } \mathbb{T}=\{1,\ldots,T\} , the objective function f : 𝕏 × 𝕋 → ℝ f:\mathbb{X}\times\mathbb{T}\rightarrow\mathbb{R} corresponds to evaluating a given 𝒙 ∈ 𝕏 {\bm{x}}\in\mathbb{X} on one of the tasks t ∈ 𝕋 t\in\mathbb{T} . The relation between points in 𝕏 × 𝕋 \mathbb{X}\times\mathbb{T} is modeled via a GP using a product kernel: The kernel k T k_{T} is represented implicitly by the Cholesky decomposition of k ⁡ ( 𝕋 , 𝕋 ) k(\mathbb{T},\mathbb{T}) whose entries are sampled via MCMC together with the other hyperparameters of the GP. By considering the distribution over the optimum on the target task t ∗ ∈ 𝕋 t_{*}\in\mathbb{T} , p min t ∗ ​ ( 𝒙 ∣ 𝒟 ) := p ⁡ ( 𝒙 ∈ arg ​ min 𝒙 ′ ∈ 𝕏 ⁡ f ​ ( 𝒙 ′ , t = t ∗ ) ∣ 𝒟 ) p_{\min}^{t_{*}}({\bm{x}}\mid\mathcal{D}):=p({\bm{x}}\in\operatornamewithlimits{arg\,min}_{{\bm{x}}^{\prime}\in\mathbb{X}}f({\bm{x}}^{\prime},t=t_{*})\mid\mathcal{D}) , and computing any information w.r.t. it, Swersky et al. (2013) use the information gain per unit cost as their acquisition function 3 3 3 In fact, Swersky et al. (2013) deviated slightly from this formula (which follows the ES approach of Hennig and Schuler (2012) ) by considering the difference in information gains in p min t ∗ ​ ( 𝒙 ∣ 𝒟 ) p_{\min}^{t_{*}}({\bm{x}}\mid\mathcal{D}) and p min t ∗ ​ ( 𝒙 ∣ 𝒟 ∪ { ( 𝒙 , y ) } ) p_{\min}^{t_{*}}({\bm{x}}\mid\mathcal{D}\cup\{({\bm{x}},y)\}) . They stated this to work better in practice, but we did not find evidence for this in our experiments and thus, for consistency, use the variant presented here throughout. : where 𝒟 ′ = 𝒟 ∪ { ( 𝒙 , t , y ) } \mathcal{D}^{\prime}=\mathcal{D}\cup\{({\bm{x}},t,y)\} . The expectation represents the information gain on the target task averaged over the possible outcomes of f ⁡ ( 𝒙 , t ) f({\bm{x}},t) based on the current model. If the cost c ⁡ ( 𝒙 , t ) c({\bm{x}},t) of a configuration 𝒙 {\bm{x}} on task t t is not known a priori it can be modelled the same way as the objective function. This model supports machine learning hyperparameter optimization for large datasets by using discrete dataset sizes as tasks. Swersky et al. (2013) indeed studied this approach for the special case of 𝕋 = { 0 , 1 } \mathbb{T}=\{0,1\} , representing a small and a large dataset; this will be a baseline in our experiments.

<sub>§2.3 Multi-Task Bayesian optimization</sub>

### 5. Fast Bayesian optimization for large datasets

Here, we introduce our new approach for FAst Bayesian Optimization on LArge data Sets ( Fabolas ). While traditional Bayesian hyperparameter optimizers model the loss of machine learning algorithms on a given dataset as a blackbox function f f to be minimized, Fabolas models loss and computational cost across dataset size and uses these models to carry out Bayesian optimization with an extra degree of freedom. The blackbox function f : 𝕏 × ℝ → ℝ f:\mathbb{X}\times\mathbb{R}\rightarrow\mathbb{R} now takes another input representing the data subset size; we will use relative sizes s = N s ​ u ​ b / N ∈ [ 0 , 1 ] s=N_{sub}/N\in[0,1] , with s = 1 s=1 representing the entire dataset. While the eventual goal is to minimize the loss f ⁡ ( 𝒙 , s = 1 ) f({\bm{x}},s=1) for the entire dataset, evaluating f f for smaller s s is usually cheaper, and the function values obtained correlate across s s . Unfortunately, this correlation structure is initially unknown, so the challenge is to design a strategy that trades off the cost of function evaluations against the benefit of learning about the scaling behavior of f f and, ultimately, about which configurations work best on the full dataset. Following the nomenclature of Williams et al. (2000) , we call s ∈ [ 0 , 1 ] s\in[0,1] an environmental variable that can be changed freely during optimization, but that is set to s = 1 s=1 (i.e., the entire dataset size), at evaluation time. We propose a principled rule for the automatic selection of the next ( 𝒙 , s ) ({\bm{x}},s) pair to evaluate. In a nutshell, where standard Bayesian optimization would always run configurations on the full dataset, we use ES to reason about, how much can be learned about performance on the full dataset from an evaluation at any s s . In doing so, Fabolas automatically determines the amount of data necessary to (usefully) extrapolate to the full dataset. For an initial intuition on how performance changes with dataset size, we evaluated a grid of 400 400 configurations of a support vector machine (SVM) on subsets of the MNIST dataset ( LeCun et al., 2001 ) ; MNIST has N = 50 000 N=50\,000 data points and we evaluated relative subset sizes s ∈ { 1 / 512 , 1 / 256 , 1 / 128 , … , 1 / 4 , 1 / 2 , 1 } s\in\{\nicefrac{{1}}{{512}},\nicefrac{{1}}{{256}},\nicefrac{{1}}{{128}},\ldots,\nicefrac{{1}}{{4}},\nicefrac{{1}}{{2}},1\} . Figure 1 visualizes the validation error of these configurations on s = 1 / 128 s=\nicefrac{{1}}{{128}} , 1 / 16 \nicefrac{{1}}{{16}} , 1 / 4 \nicefrac{{1}}{{4}} , and 1 1 . Evidently, just 1 / 128 \nicefrac{{1}}{{128}} of the dataset is quite representative and sufficient to locate a reasonable configuration. Additionally, there are no deceiving local optima on smaller subsets. Based on these observations, we expect that relatively small fractions of the dataset yield representative performances and therefore vary our relative size parameter s s on a logarithmic scale.

<sub>§3 Fast Bayesian optimization for large datasets</sub>

### 6. Kernels for loss and computational cost

To transfer the insights from this illustrative example into a formal model for the loss and cost across subset sizes, we extend the GP model by an additional input dimension, namely s ∈ [ 0 , 1 ] s\in[0,1] . This allows the surrogate to extrapolate to the full data set at s = 1 s=1 without necessarily evaluating there. We chose a factorized kernel, consisting of the standard stationary kernel over hyperparameters, multiplied with a finite-rank (“degenerate”) covariance function in s s : Since any choice of the basis function ϕ \phi yields a positive semi-definite covariance function, this provides a flexible language for prior knowledge relating to s s . We use the same form of kernel to model the loss f f and cost c c , respectively, but with different basis functions ϕ f \phi_{f} and ϕ c \phi_{c} . The loss of a machine learning algorithms usually decreases with more training data. We incorporate this behavior by choosing ϕ f ​ ( s ) = ( 1 , ( 1 − s ) 2 ) T \phi_{f}(s)=(1,(1-s)^{2})^{T} to enforce monotonic predictions with an extremum at s = 1 s=1 . This kernel choice is equivalent to Bayesian linear regression with these basis functions and Gaussian priors on the weights. To model computational cost c c , we note that the complexity usually grows with relative dataset size s s . To fit polynomial complexity 𝒪 ⁡ ( s α ) \mathcal{O}(s^{\alpha}) for arbitrary α \alpha and simultaneously enforce positive predictions, we model the log-cost and use ϕ c ​ ( s ) = ( 1 , s ) T \phi_{c}(s)=(1,s)^{T} . As above, this amounts to Bayesian linear regression with shown basis functions. In the supplemental material (Section B), we visualize scaling of loss and cost with s s for the SVM example above and show that our kernels indeed fit them well. We also evaluate the possibility of modelling the heteroscedastic noise introduced by subsampling the data (supplementary material, Section C).

<sub>§3.1 Kernels for loss and computational cost</sub>

### 7. Formal algorithm description

Fabolas starts with an initial design, described in more detail in Section 3.3 . Afterwards, at the beginning of each iteration it fits GPs for loss and computational cost across dataset sizes s s using the kernel from Eq. 6 . Then, capturing the distribution of the optimum for s = 1 s=1 using p min s = 1 ​ ( 𝒙 ∣ 𝒟 ) := p ⁡ ( 𝒙 ∈ arg ​ min 𝒙 ′ ∈ 𝕏 ⁡ f ​ ( 𝒙 ′ , s = 1 ) ∣ 𝒟 ) p_{\min}^{s=1}({\bm{x}}\mid\mathcal{D}):=p({\bm{x}}\in\operatornamewithlimits{arg\,min}_{{\bm{x}}^{\prime}\in\mathbb{X}}f({\bm{x}}^{\prime},s=1)\mid\mathcal{D}) , it selects the maximizer of the following acquisition function to trade off information gain versus cost: Algorithm 1 shows pseudocode for Fabolas . We also provide an open-source implementation at https://github.com/automl/RoBO . Our proposed acquisition function resembles the one used by MTBO (Eq. 5 ), with two differences: First, MTBO’s discrete tasks t t are replaced by a continuous dataset size s s (allowing to learn correlations without evaluations at s = 1 s=1 , and to choose the appropriate subset size automatically). Second, the prediction of computational cost is augmented by the overhead of the Bayesian optimization method. This inclusion of the reasoning overhead is important to appropriately reflect the information gain per unit time spent: it does not matter whether the time is spent with a function evaluation or with reasoning about which evaluation to perform. In practice, due to cubic scaling in the number of data points of GPs and the computational complexity of approximating p min s = 1 p_{\min}^{s=1} , the additional overhead of Fabolas is within the order of minutes, such that differences in computational cost in the order of seconds become negligible in comparison. 4 4 4 The same is true for standard ES and MTBO, but was never exploited as no emphasis was put on the total wall clock time spent for the hyperparameter optimization. We want to emphasize that we express budgets in terms of wall clock time (not function evaluations) since this is natural in most practical applications. Being an anytime algorithm, Fabolas keeps track of its incumbent at each time step. To select a configuration that performs well on the full dataset, it predicts the loss of all evaluated configurations at s = 1 s=1 using the GP model and picks the minimizer. We found this to work more robustly than globally minimizing the posterior mean, or similar approaches.

<sub>§3.2 Formal algorithm description</sub>

### 8. Initial design

It is common in Bayesian optimization to start with an initial design of points chosen at random or from a Latin hypercube design to allow for reasonable GP models as starting points. To fully leverage the speedups we can obtain from evaluating small datasets, we bias this selection towards points with small (cheap) datasets in order to improve the prediction for dependencies on s s : We draw k k random points in 𝕏 \mathbb{X} ( k = 10 k=10 in our experiments) and evaluate them on different subsets of the data (for instance on the support vector machine experiments we used s ∈ { 1 / 64 , 1 / 32 , 1 / 16 , 1 / 8 } s\in\{\nicefrac{{1}}{{64}},\nicefrac{{1}}{{32}},\nicefrac{{1}}{{16}},\nicefrac{{1}}{{8}}\} ). This provides information on scaling behavior, and, assuming that costs increase linearly or superlinearly with s s , these k k function evaluations cost less than k 8 \frac{k}{8} function evaluations on the full dataset. This is important as the cost of the initial design, of course, counts towards Fabolas ’ runtime.

<sub>§3.3 Initial design</sub>

### 9. Implementation details

The presentation of Fabolas above omits some details that impact the performance of our method. As it has become standard in Bayesian optimization ( Snoek et al., 2012 ) , we use Markov-Chain Monte Carlo (MCMC) integration to marginalize over the GPs hyperparameters (we use the emcee package ( Foreman-Mackey et al., 2013 ) ). To accelerate the optimization, we use hyper-priors to emphasize meaningful values for the parameters, chiefly adopting the choices of the spearmint toolbox ( Snoek et al., 2012 ) : a uniform prior between [ − 10 , 2 ] [-10,2] for all length scales 𝝀 {\bm{\lambda}} in log space, a lognormal prior ( μ a = 0 \mu_{a}=0 , σ a 2 = 1 \sigma_{a}^{2}=1 ) for the covariance amplitude θ \theta , and a horseshoe prior with length scale of 0.1 0.1 for the noise variance σ 2 \sigma^{2} . We used the original formulation of ES by Hennig and Schuler (2012) rather than the recent reformulation of PES by Hernández-Lobato et al. (2014) . The main reason for this is that the latter prohibits non-stationary kernels due to its use of Bochner’s theorem for a spectral approximation. PES could in principle be extended to work for our particular choice of kernels (using an Eigen-expansion, from which we could sample features); since this would complicate making modifications to our kernel, we leave it as an avenue for future work, but note that in any case it may only further improve our method. To maximize the acquisition function we used the blackbox optimizer DIRECT ( Jones, 2001 ) and CMAES ( Hansen, 2006 ) .

<sub>§3.4 Implementation details</sub>

## 总结与展望
这篇（TADD）把「用少量数据快速估一个配置的好坏」当成独立问题来处理，并用几种估计器做对比。它在语料里的位置是方法学提醒：便宜档的价值取决于它与贵档的秩相关，而这件事实测起来比假设起来难。

**It connects to**

- `1807.01774` — BOHB 假定便宜档可用，这篇在测「到底多可用」。
- `1810.05934` — ASHA 的淘汰同样假定便宜档排序可信。

## 不足之处
**What a reader should still not conclude**

- 它测的是训练早期的曲线外推，不是「两个不同命令测同一件事」。
- 论文的结论依赖具体任务族，不能直接搬到 agent 评估。

---

# NAS-Bench-201: Extending the Scope of Reproducible Neural Architecture Search

arXiv:2001.00326 · 2020 · [source](https://arxiv.org/html/2001.00326)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The deep learning community is undergoing a transition from hand-designed neural architecture ( He et al., 2016 ; Krizhevsky et al., 2012 ; Szegedy et al., 2015 ) to automatically designed neural architecture ( Zoph & Le, 2017 ; Pham et al., 2018 ; Real et al., 2019 ; Dong & Yang, 2019b ; Liu et al., 2019 ) . In its early era, the great success of deep learning was promoted by novel neural architectures, such as ResNet ( He et al., 2016 ) , Inception ( Szegedy et al., 2015 ) , VGGNet ( Simonyan & Zisserman, 2015 ) , and Transformer ( Vaswani et al., 2017 ) . However, manually designing one architecture requires human experts to try numerous different operation and connection choices ( Zoph & Le, 2017 ) . In contrast to architectures that are manually designed, those automatically found by neural architecture search (NAS) algorithms require much less human interaction and expert effort. These NAS-generated architectures have shown promising results in many domains, such as image recognition ( Zoph & Le, 2017 ; Pham et al., 2018 ; Real et al., 2019 ) , sequence modeling ( Pham et al., 2018 ; Dong & Yang, 2019b ; Liu et al., 2019 ) , etc.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 NAS-Bench-201"]
  N1["§2.1 Architectures in the Search Space"]
  N2["§2.2 Datasets"]
  N3["§2.3 Architecture Performance"]
  N4["§2.4 Diagnostic Information"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
```

![Top : the macro skeleton of each architecture candidate. Bottom-left : examples of neural cell with 4 nodes. Each cell is a directed acyclic graph, where each edge is associated with an operation selected from a predefined operation set as shown in the Bottom-right .](https://arxiv.org/html/2001.00326/2001.00326v2/DAG-Model.svg)

*Top : the macro skeleton of each architecture candidate. Bottom-left : examples of neural cell with 4 nodes. Each cell is a directed acyclic graph, where each edge is associated with an operation selected from a predefined operation set as shown in the Bottom-right .*

<sub>figure: `2001.00326v2/DAG-Model.svg`</sub>

## 机制
### 1. NAS-Bench-201

Our NAS-Bench-201 is algorithm-agnostic. Put simply, it is applicable to almost any up-to-date NAS algorithms. In this section, we will briefly introduce our NAS-Bench-201 . The search space of NAS-Bench-201 is inspired by cell-based NAS algorithms (Section 2.1 ). NAS-Bench-201 evaluates each architecture on three different datasets (Section 2.2 ). All implementation details of NAS-Bench-201 are introduced in Section 2.3 . NAS-Bench-201 also provides some diagnostic information which can be used for potentially better designs of future NAS algorithms (discussed in Section 2.4 ).

<sub>§2 NAS-Bench-201</sub>

### 2. Architectures in the Search Space

Macro Skeleton . Our search space follows the design of its counterpart as used in the recent neural cell-based NAS algorithms ( Liu et al., 2019 ; Zoph et al., 2018 ; Pham et al., 2018 ) . As shown in the top of Figure 1 , the skeleton is initiated with one 3-by-3 convolution with 16 output channels and a batch normalization layer ( Ioffe & Szegedy, 2015 ) . The main body of the skeleton includes three stacks of cells, connected by a residual block. Each cell is stacked N = 5 N=5 times, with the number of output channels as 16, 32 and 64 for the first, second and third stages, respectively. The intermediate residual block is the basic residual block with a stride of 2 ( He et al., 2016 ) , which serves to down-sample the spatial size and double the channels of an input feature map. The shortcut path in this residual block consists of a 2-by-2 average pooling layer with stride of 2 and a 1-by-1 convolution. The skeleton ends up with a global average pooling layer to flatten the feature map into a feature vector. Classification uses a fully connected layer with a softmax layer to transform the feature vector into the final prediction. Searched Cell . Each cell in the search space is represented as a densely connected DAG. The densely connected DAG is obtained by assigning a direction from the i i -th node to the j j -th node ( i < j i<j ) for each edge in an undirected complete graph. Each edge in this DAG is associated with an operation transforming the feature map from the source node to the target node. All possible operations are selected from a predefined operation set, as shown in Figure 1 (bottom-right). In our NAS-Bench-201 , the predefined operation set 𝒪 {\mathcal{O}} has L = 5 L=5 representative operations: (1) zeroize, (2) skip connection, (3) 1-by-1 convolution, (4) 3-by-3 convolution, and (5) 3-by-3 average pooling layer. The convolution in this operation set is an abbreviation of an operation sequence of ReLU, convolution, and batch normalization. The DAG has V = 4 V=4 nodes, where each node represents the sum of all feature maps transformed through the associated operations of the edges pointing to this node. We choose V = 4 V=4 to allow the search space to contain basic residual block-like cells, which requires 4 nodes. Densely connected DAG does not restrict the searched topology of the cell to be densely connected, since we include zeroize in the operation set, which is an operation of dropping the associated edge. Besides, since we do not impose the constraint on the maximum number of edges ( Ying et al., 2019 ) , our search space is applicable to most NAS algorithms, including all cell-based NAS algorithms.

<sub>§2.1 Architectures in the Search Space</sub>

### 3. Datasets

We train and evaluate each architecture on CIFAR-10, CIFAR-100 ( Krizhevsky et al., 2009 ) , and ImageNet-16-120 ( Chrabaszcz et al., 2017 ) . We choose these three datasets because CIFAR and ImageNet ( Russakovsky et al., 2015 ) are the most popular image classification datasets. We split each dataset into training, validation and test sets to provide a consistent training and evaluation settings for previous NAS algorithms ( Liu et al., 2019 ) . Most NAS methods use the validation set to evaluate architectures after the architecture is optimized on the training set. The validation performance of the architectures serves as supervision signals to update the searching algorithm. The test set is to evaluate the performance of each searching algorithm by comparing the indicators (e.g., accuracy, model size, speed) of their selected architectures. Previous methods use different splitting strategies, which may result in various searching costs and unfair comparisons. We hope to use the proposed splits to unify the training, validation and test sets for a fairer comparison. CIFAR-10 : It is a standard image classification dataset and consists of 60K 32 × \times 32 colour images in 10 classes. The original training set contains 50K images, with 5K images per class. The original test set contains 10K images, with 1K images per class. Due to the need of validation set, we split all 50K training images in CIFAR-10 into two groups. Each group contains 25K images with 10 classes. We regard the first group as the new training set and the second group as the validation set. CIFAR-100 : This dataset is just like CIFAR-10. It has the same images as CIFAR-10 but categorizes each image into 100 fine-grained classes. The original training set on CIFAR-100 has 50K images, and the original test set has 10K images. We randomly split the original test set into two group of equal size — 5K images per group. One group is regarded as the validation set, and another one is regarded as the new test set. ImageNet-16-120 : We build ImageNet-16-120 from the down-sampled variant of ImageNet (ImageNet16 × \times 16). As indicated in Chrabaszcz et al. (2017) , down-sampling images in ImageNet can largely reduce the computation costs for optimal hyper-parameters of some classical models while maintaining similar searching results. Chrabaszcz et al. (2017) down-sampled the original ImageNet to 16 × \times 16 pixels to form ImageNet16 × \times 16, from which we select all images with label ∈ [ 1,120 ] \in[1,120] to construct ImageNet-16-120. In sum, ImageNet-16-120 contains 151.7K training images, 3K validation images, and 3K test images with 120 classes. By default, in this paper, “the training set”, “the validation set”, “the test set” indicate the new training, validation, and test sets, respectively.

<sub>§2.2 Datasets</sub>

### 4. Architecture Performance

Training Architectures. In order to unify the performance of every architecture, we give the performance of every architecture in our search space. In our NAS-Bench-201 , we follow previous literature to set up the hyper-parameters and training strategies ( Zoph et al., 2018 ; Loshchilov & Hutter, 2017 ; He et al., 2016 ) . We train each architecture with the same strategy, which is shown in Table 1 . For simplification, we denote all hyper-parameters for training a model as a set ℋ {\mathcal{H}} , and we use ℋ † {\mathcal{H}}^{\dagger} to denote the values of hyper-parameter that we use. Specifically, we train each architecture via Nesterov momentum SGD, using the cross-entropy loss for 200 epochs in total. We set the weight decay as 0.0005 and decay the learning rate from 0.1 to 0 with a cosine annealing ( Loshchilov & Hutter, 2017 ) . We use the same ℋ † {\mathcal{H}}^{\dagger} on different datasets, except for the data augmentation which is slightly different due to the image resolution. On CIFAR, we use the random flip with probability of 0.5, the random crop 32 × \times 32 patch with 4 pixels padding on each border, and the normalization over RGB channels. On ImageNet-16-120, we use a similar strategy but random crop 16 × \times 16 patch with 2 pixels padding on each border. Apart from using ℋ † {\mathcal{H}}^{\dagger} for all datasets, we also use a different hyper-parameter set ℋ ‡ {\mathcal{H}}^{\ddagger} for CIFAR-10. It is similar to ℋ † {\mathcal{H}}^{\dagger} but its total number of training epochs is 12. In this way, we could provide bandit-based algorithms ( Falkner et al., 2018 ; Li et al., 2018 ) more options for the usage of short training budget (see more details in appendix). Metrics . We train each architecture with different random seeds on different datasets. We evaluate each architecture A A after every training epoch. NAS-Bench-201 provides the training, validation, and test loss as well as accuracy. We show the supported metrics on different datasets in Table 2 . Users can easily use our API to query the results of each trial of A A , which has negligible computational costs. In this way, researchers could significantly speed up their searching algorithm on these datasets and focus solely on the essence of NAS. We list the training/test loss/accuracies over different split sets on four datasets in Table 2 . On CIFAR-10, we train the model on the training set and evaluate it on the validation set. We also train the model on the training and validation set and evaluate it on the test set. These two paradigm follow the typical experimental setup on CIFAR-10 in previous literature ( Liu et al., 2018 ; Zoph et al., 2018 ; Liu et al., 2018 ; Pham et al., 2018 ) . On CIFAR-100 and ImageNet-16-120, we train the model on the training set and evaluate it on both validation and test sets.

<sub>§2.3 Architecture Performance</sub>

### 5. Diagnostic Information

Validation accuracy is a commonly used supervision signal for NAS. However, considering the expensive computational costs for evaluating the architecture, the signal is too sparse. In our NAS-Bench-201 , we also provide some diagnostic information which is some extra statistics obtained during training each architecture. Collecting these statistics almost involves no extra computation cost but may provide insights for better designs and training strategies of different NAS algorithms, such as platform-aware NAS ( Tan et al., 2019 ) , accuracy prediction ( Baker et al., 2018 ) , mutation-based NAS ( Cai et al., 2018 ; Chen et al., 2016 ) , etc. Architecture Computational Costs: NAS-Bench-201 provides three computation metrics for each architecture — the number of parameters, FLOPs, and latency. Algorithms that target on searching architectures with computational constraints, such as models on edge devices, can use these metrics directly in their algorithm designs without extra calculations. Fine-grained training and evaluation information. NAS-Bench-201 tracks the changes in loss and accuracy of every architecture after every training epochs. These fine-grained training and evaluation information shows the tendency of the architecture performance and could indicate some attributes of the model, such as the speed of convergence, the stability, the over-fitting or under-fitting levels, etc. These attributes may benefit the designs of NAS algorithms. Besides, some methods learn to predict the final accuracy of an architecture based on the results of few early training epochs ( Baker et al., 2018 ) . These algorithm can be trained faster and the performance of the accuracy prediction can be evaluated using the fine-grained evaluation information. Parameters of optimized architecture. Our NAS-Bench-201 releases the trained parameters for each architecture. This can provide ground truth label for hypernetwork-based NAS methods ( Zhang et al., 2019 ; Brock et al., 2018 ) , which learn to generate parameters of an architecture. Other methods mutate an architecture to become another one ( Real et al., 2019 ; Cai et al., 2018 ) . With NAS-Bench-201 , researchers could directly use the off-the-shelf parameters instead of training from scratch and analyze how to transfer parameters from one architecture to another.

<sub>§2.4 Diagnostic Information</sub>

## 总结与展望
NAS-Bench-201 提供了一张完整查表，使得「同一个搜索算法换个种子」这样的问题第一次可以被廉价地回答。它对本方向的意义是实验设计层面：要证明一个淘汰策略不误杀，需要有可以反复查询的真值表，而我们没有。

**It connects to**

- `1902.09635` — 两者都是可复现搜索的查表基准，规模与覆盖不同。

## 不足之处
**The authors say:** How to avoid over-fitting on NAS-Bench-201 ? Our NAS-Bench-201 provides a benchmark for NAS algorithms, aiming to provide a fair and computational cost-friendly environment to the NAS community. The trained architecture and the easy-to-access performance of each architecture might provide some insidious ways for designing algorithms to over-fit the best architecture in our NAS-Bench-201 . Thus, we propose some rules which we wish the users will follow to achieve the original intention of NAS-Bench-201 , a fair and efficient benchmark.

**What a reader should still not conclude**

- 查表是离线真值，真实评估的噪声它并不建模。
- 它的任务族是图像分类，不涉及 LLM 判定。

<sub>§6 Discussion</sub>

---

# Massively parallel hyperparameter tuning

arXiv:1810.05934 · 2018 · [source](https://arxiv.org/html/1810.05934)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Although machine learning (ML) models have recently achieved dramatic successes in a variety of practical applications, these models are highly sensitive to internal parameters, i.e., hyperparameters . In these modern regimes, four trends motivate the need for production-quality systems that support massively parallel for hyperparameter tuning:

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 ASHA Algorithm"]
  N1["§3.1 Successive Halving (SHA)"]
  N2["§3.2 Asynchronous SHA (ASHA)"]
  N3["§5 Productionizing ASHA"]
  N4["§5.1 Usability"]
  N5["§5.2 Automatic Scaling of Parallel Training"]
  N6["§5.3 Resource Allocation"]
  N7["§5.4 Reproducibility in Distributed Environments"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
  N6 --> N7
```

![Promotion scheme for SHA with n = 9 n=9 , r = 1 r=1 , R = 9 R=9 , and η = 3 \eta=3 .](https://arxiv.org/html/1810.05934/1810.05934v5/sha_pic.jpeg)

*Promotion scheme for SHA with n = 9 n=9 , r = 1 r=1 , R = 9 R=9 , and η = 3 \eta=3 .*

<sub>figure: `1810.05934v5/sha_pic.jpeg`</sub>

## 机制
### 1. ASHA Algorithm

We start with an overview of SHA ( Karnin et al., 2013 ; Jamieson & Talwalkar, 2015 ) and motivate the need to adapt it to the parallel setting. Then we present ASHA and discuss how it addresses issues with synchronous SHA and improves upon the original algorithm.

<sub>§3 ASHA Algorithm</sub>

### 2. Successive Halving (SHA)

The idea behind SHA (Algorithm 1 ) is simple: allocate a small budget to each configuration, evaluate all configurations and keep the top 1 / η 1/\eta , increase the budget per configuration by a factor of η \eta , and repeat until the maximum per-configuration budget of R R is reached (lines 5–11). The resource allocated by SHA can be iterations of stochastic gradient descent, number of training examples, number of random features, etc. SHA requires the number of configurations n n , a minimum resource r r , a maximum resource R R , a reduction factor η ≥ 2 \eta\geq 2 , and a minimum early-stopping rate s s . Additionally, the get_hyperparameter_configuration ​ ( n ) \texttt{get\_hyperparameter\_configuration}(n) subroutine returns n n configurations sampled randomly from a given search space; and the run_then_ return_val_loss ​ ( θ , r ) \texttt{return\_val\_loss}(\theta,r) subroutine returns the validation loss after training the model with the hyperparameter setting θ \theta and for r r resources. For a given early-stopping rate s s , a minimum resource of r 0 = r ​ η s r_{0}=r\eta^{s} will be allocated to each configuration. Hence, lower s s corresponds to more aggressive early-stopping, with s = 0 s=0 prescribing a minimum resource of r r . We will refer to SHA with different values of s s as brackets and, within a bracket, we will refer to each round of promotion as a rung with the base rung numbered 0 and increasing. Figure 1 (a) shows the rungs for bracket 0 for an example setting with n = 9 , r = 1 , R = 9 , n=9,r=1,R=9, and η = 3 \eta=3 , while Figure 1 (b) shows how resource allocations change for different brackets s s . Namely, the starting budget per configuration r 0 ≤ R r_{0}\leq R increases by a factor of η \eta per increment of s s . Hence, it takes more resources to explore the same number of configurations for higher s s . Note that for a given s s , the same budget is allocated to each rung but is split between fewer configurations in higher rungs. Straightforward ways of parallelizing SHA are not well suited for the parallel regime. We could consider the embarrassingly parallel approach of running multiple instances of SHA, one on each worker. However, this strategy is not well suited for the large-scale regime, where we would like results in little more than the time to train one configuration. To see this, assume that training time for a configuration scales linearly with the allocated resource and t ​ i ​ m ​ e ​ ( R ) time(R) represents the time required to train a configuration for the maximum resource R R . In general, for a given bracket s s , the minimum time to return a configuration trained to completion is ( log η ⁡ ( R / r ) − s + 1 ) × t ​ i ​ m ​ e ​ ( R ) (\log_{\eta}(R/r)-s+1)\times time(R) , where log η ⁡ ( R / r ) − s + 1 \log_{\eta}(R/r)-s+1 counts the number of rungs. For example, consider Bracket 0 in the toy example in Figure 1 . The time needed to return a fully trained configuration is 3 × t ​ i ​ m ​ e ​ ( R ) 3\times time(R) , since there are three rungs and each rung is allocated R R resource. In contrast, as we will see in the next section, our parallelization scheme for SHA can return an answer in just t ​ i ​ m ​ e ​ ( R ) time(R) . Another naive way of parallelizing SHA is to distribute the training of the n / η k n/\eta^{k} surviving configurations on each rung k k as is done by Falkner et al. (2018) and add brackets when there are no jobs available in existing brackets. We will refer to this method as “synchronous” SHA. The efficacy of this strategy is severely hampered by two issues: (1) SHA’s synchronous nature is sensitive to stragglers and dropped jobs as every configuration within a rung must complete before proceeding to the next rung, and (2) the estimate of the top 1 / η 1/\eta configurations for a given early-stopping rate does not improve as more brackets are run since promotions are performed independently for each bracket. We demonstrate the susceptibility of synchronous SHA to stragglers and dropped jobs on simulated workloads in Appendix A.1 .

<sub>§3.1 Successive Halving (SHA)</sub>

### 3. Asynchronous SHA (ASHA)

We now introduce ASHA as an effective technique to parallelize SHA, leveraging asynchrony to mitigate stragglers and maximize parallelism. Intuitively, ASHA promotes configurations to the next rung whenever possible instead of waiting for a rung to complete before proceeding to the next rung. Additionally, if no promotions are possible, ASHA simply adds a configuration to the base rung, so that more configurations can be promoted to the upper rungs. ASHA is formally defined in Algorithm 2 . Given its asynchronous nature it does not require the user to pre-specify the number of configurations to evaluate, but it otherwise requires the same inputs as SHA. Note that the run_then_return_val_loss subroutine in ASHA is asynchronous and the code execution continues after the job is passed to the worker. ASHA’s promotion scheme is laid out in the get_job subroutine. ASHA is well-suited for the large-scale regime, where wall-clock time is constrained to a small multiple of the time needed to train a single model. For ease of comparison with SHA, assume training time scales linearly with the resource. Consider the example of Bracket 0 shown in Figure 1 , and assume we can run ASHA with 9 machines. Then ASHA returns a fully trained configuration in 13 / 9 × t ​ i ​ m ​ e ​ ( R ) \nicefrac{{13}}{{9}}\times time(R) , since 9 machines are sufficient to promote configurations to the next rung in the same time it takes to train a single configuration in the rung. Hence, the training time for a configuration in rung 0 is 1 / 9 × t ​ i ​ m ​ e ​ ( R ) \nicefrac{{1}}{{9}}\times time(R) , for rung 1 it is 1 / 3 × t ​ i ​ m ​ e ​ ( R ) \nicefrac{{1}}{{3}}\times time(R) , and for rung 2 it is t ​ i ​ m ​ e ​ ( R ) time(R) . In general, η log η ⁡ ( R ) − s \eta^{\log_{\eta}(R)-s} machines are needed to advance a configuration to the next rung in the same time it takes to train a single configuration in the rung, and it takes η s + i − log η ⁡ ( R ) × t ​ i ​ m ​ e ​ ( R ) \eta^{s+i-\log_{\eta}(R)}\times time(R) to train a configuration in rung i i . Hence, ASHA can return a configuration trained to completion in time Moreover, when training is iterative, ASHA can return an answer in t ​ i ​ m ​ e ​ ( R ) time(R) , since incrementally trained configurations can be checkpointed and resumed. Finally, since Hyperband simply runs multiple SHA brackets, we can asynchronously parallelize Hyperband by either running multiple brackets of ASHA or looping through brackets of ASHA sequentially as is done in the original Hyperband. We employ the latter looping scheme for asynchronous Hyperband in the next section.

<sub>§3.2 Asynchronous SHA (ASHA)</sub>

### 4. Productionizing ASHA

While integrating ASHA in Determined AI’s software platform to deliver production-quality hyperparameter tuning functionality, we encountered several fundamental design decisions that impacted usability, computational performance, and reproducibility. We next discuss each of these design decisions along with proposed systems optimizations for each decision. Elimination rate: we set η = 4 \eta=4 so that the top 1/4 of configurations are promoted to the next rung. Maximum early-stopping rate: we set the maximum early-stopping rate for bracket s 0 s_{0} to allow for a maximum of 5 rungs which indicates a minimum resource of r = ( 1 / 4 4 ) ​ R = R / 256 r=(\nicefrac{{1}}{{4^{4}}})R=R/256 . Then the minimum resource per configuration for a given bracket s s is r s = r ​ η s r_{s}=r\eta^{s} . Brackets to run: to increase robustness to misspecification of the early-stopping rate, we default to running the three most aggressively early-stopping brackets s = 0 , 1 , 2 s=0,1,2 of ASHA. We exclude the two least aggressive brackets (i.e. s 4 s_{4} with r 4 = R r_{4}=R and s 3 s_{3} with r 3 = R / 4 r_{3}=R/4 ) to allow for higher speedups from early-stopping. We define this default set of brackets as the ‘standard’ set of early-stopping brackets, though we also expose the options for more conservative or more aggressive bracket sets.

<sub>§5 Productionizing ASHA</sub>

### 5. Usability

Ease of use is one of the most important considerations in production; if an advanced method is too cumbersome to use, its benefits may never be realized. In the context of hyperparameter optimization, classical methods like random or grid search require only two intuitive inputs: number of configurations ( n n ) and training resources per configuration ( R R ). In contrast, as a byproduct of adaptivity, all of the modern methods we considered in this work have many internal hyperparameters. ASHA in particular has the following internal settings: elimination rate η \eta , early-stopping rate s s , and, in the case of asynchronous Hyperband, the brackets of ASHA to run. To facilitate use and increase adoption of ASHA, we simplify its user interface to require the same inputs as random search and grid search, exposing the internal hyperparameters of ASHA only to advanced users. Selecting ASHA default settings . Our experiments in Section 4 and the experiments conducted by Li et al. (2018) both show that aggressive early-stopping is effective across a variety of different hyperparameter tuning tasks. Hence, using both works as guidelines, we propose the following default settings for ASHA: Using n n as ASHA’s stopping criterion . Algorithm 2 does not specify a stopping criterion; instead, it relies on the user to stop once an implicit condition is met, e.g., number of configurations evaluated, compute time, or minimum performance achieved. In a production environment, we decided to use the number of configurations n n as an explicit stopping criterion both to match the user interface for random and grid search, and to provide an intuitive connection to the underlying difficulty of the search space. In contrast, setting a maximum compute time or minimum performance threshold requires prior knowledge that may not be available. From a technical perspective, n n is allocated to the different brackets while maintaining the same total training resources across brackets. We do this by first calculating the average budget per configuration for a bracket (assuming no incorrect promotions), and then allocating configurations to brackets according to the inverse of this ratio. For concreteness, let B B be the set of brackets we are considering, then the average resource for a given bracket s s is r ¯ s = # of Rungs / η ⌊ log η ⁡ R / r ⌋ − s \bar{r}_{s}=\nicefrac{{\text{\# of Rungs}}}{{\eta^{\lfloor\log_{\eta}R/r\rfloor-s}}} . For the default settings described above, this corresponds to r ¯ 0 = 5 / 256 \bar{r}_{0}=5/256 , r ¯ 1 = 4 / 64 \bar{r}_{1}=4/64 , and r ¯ 2 = 3 / 16 \bar{r}_{2}=3/16 , and further translates to 70.5 % 70.5\% , 22.1 % 22.1\% , and 7.1 % 7.1\% of the configurations being allocated to brackets s 0 , s 1 , s_{0},s_{1}, and s 2 s_{2} , respectively. Note that we still run each bracket asynchronously; the allocated number of configurations n s n_{s} for a particular bracket s s simply imposes a limit on the width of the bottom rung. In particular, upon reaching the limit n s n_{s} in the bottom rung, the number of pending configurations in the bottom rung is at most equal to the number of workers, k k . Therefore, since blocking occurs once a bracket can no longer add configuration to the bottom rung and must wait for promotable configurations, for large-scale problems where n s ≫ k n_{s}\gg k , limiting the width of rungs will not block promotions until the bracket is near completion. In contrast, synchronous SHA is susceptible to blocking from stragglers throughout the entire process, which can greatly reduce both the latency and throughput of configurations promoted to the top rung (e.g. Section 4.2 , Appendix A.1 ).

<sub>§5.1 Usability</sub>

### 6. Automatic Scaling of Parallel Training

The promotion schedule for ASHA geometrically increases the resource per configuration as we move up the rungs of a bracket. Hence, the average training time for configurations in higher rungs increases drastically for computation that scales linearly or super-linearly with the training resource, presenting an opportunity to speed up training by using multiple GPUs. We explore autoscaling of parallel training to exploit this opportunity when resources are available. We determine the maximum degree of parallelism for autoscaling a training task using an efficiency criteria motivated by the observation that speedups from parallel training do not scale linearly with the number of GPUs ( Krizhevsky, 2014 ; Szegedy et al., 2014 ; You et al., 2017 ; You et al., 2017 ; Goyal et al., 2017 ) . More specifically, we can use the Paleo framework, introduced by Qi et al. (2017) , to estimate the cost of training neural networks in parallel given different specifications. Qi et al. (2017) demonstrated that the speedups from parallel training computed using Paleo are fairly accurate when compared to the actual observed speedups for a variety of models. Figure 6 shows Paleo applied to Inception on ImageNet ( et al., 2016 ) to estimate the training time with different numbers of GPUs under strong scaling (i.e. fixed batch size with increasing parallelism), Butterfly AllReduce communication scheme, specified hardware settings (namely Tesla K80 GPU and 20G Ethernet), and a batch size of 1024. The diminishing returns when using more GPUs to train a single model is evident in Figure 6 . Additionally, there is a tradeoff between using resources to train a model faster to reduce latency versus evaluating more configurations to increase throughput. Using the predicted tradeoff curves generated using Paleo, we can automatically limit the number of GPUs per configuration to control efficiency relative to perfect linear scaling, e.g., if the desired level of efficiency is at least 75 % 75\% , then we would limit the number of GPUs per configuration for Inception to at most 16 GPUs.

<sub>§5.2 Automatic Scaling of Parallel Training</sub>

### 7. Resource Allocation

Whereas research clusters often require users to specify the number of workers requested and allocate workers on a first-in-first-out (FIFO) fashion, this scheduling mechanism is poorly suited for production settings for two main reasons. First, as we discuss below in the context of ASHA, machine learning workflows can have variable resource requirements over the lifetime of a job, and forcing users to specify static resource requirements can result in suboptimal cluster utilization. Second, FIFO scheduling can result in poor sharing of cluster resources among users, as a single large job could saturate the cluster and block all other user jobs. We address these issues with a centralized fair-share scheduler that adaptively allocates resources over the lifetime of each job. Such a scheduler must both (i) determine the appropriate amount of parallelism for each individual job, and (ii) allocate computational resources across all user jobs. In the context of an ASHA workload, the scheduler automatically determines the maximum resource requirement at any given time based on the inputs to ASHA and the parallel scaling profile determined by Paleo. Then, the scheduler allocates cluster resources by considering the resource requirements of all jobs while maintaining fair allocation across users. We describe each of these components in more detail below. Algorithm level resource allocation. Recall that we propose to use the number of configurations, n n , as a stopping criteria for ASHA in production settings. Crucially, this design decision limits the maximum degree of parallelism for an ASHA job. If n n is the number of desired configurations for a given ASHA bracket and κ \kappa the maximum allowable training parallelism, e.g., as determined by Paleo, then at initialization, the maximum parallelism for the bracket is n ​ κ n\kappa . We maintain a stack of training tasks 𝐒 \mathbf{S} that is populated initially with all configurations for the bottom rung n n . The top task in 𝐒 \mathbf{S} is popped off whenever a worker requests a task and promotable configurations are added to the top of 𝐒 \mathbf{S} when tasks complete. As ASHA progresses, the maximum parallelism is adaptively defined as κ ​ | 𝐒 | \kappa|\mathbf{S}| . Hence, an adaptive worker allocation schedule that relies on κ ​ | 𝐒 | \kappa|\mathbf{S}| would improve cluster utilization relative to a static allocation scheme, without adversely impacting performance. Cluster level resource allocation. Given the maximum degree of parallelism for any ASHA job, the scheduler then allocates resources uniformly across all jobs while respecting these maximum parallelism limits. We allow for an optional priority weighting factor so that certain jobs can receive a larger ratio of the total computational resources. Resource allocation is performed using a water-filling scheme where any allocation above the maximum resource requirements for a job are distributed evenly to remaining jobs. For concreteness, consider a scenario in which we have a cluster of 32 GPUs shared between a group of users. When a single user is running an ASHA job with 8 configurations in 𝐒 𝟏 \mathbf{S_{1}} and a maximum training parallelism of κ 1 = 4 \kappa_{1}=4 , the scheduler will allocate all 32 GPUs to this ASHA job. When another user submits an ASHA job with a maximum parallelism of κ 2 ​ | 𝐒 𝟐 | = 64 \kappa_{2}|\mathbf{S_{2}}|=64 , the central scheduler will then allocate 16 GPUs to each user. This simple scenario demonstrate how our central scheduler allows jobs to benefit from maximum parallelism when the computing resources are available, while maintaining fair allocation across jobs in the presence of resource contention.

<sub>§5.3 Resource Allocation</sub>

### 8. Reproducibility in Distributed Environments

Reproducibility is critical in production settings to instill trust during the model development process; foster collaboration and knowledge transfer across teams of users; and allow for fault tolerance and iterative refinement of models. However, ASHA introduces two primary reproducibility challenges, each of which we describe below. Pausing and restarting configurations . There are many sources of randomness when training machine learning models; some source can be made deterministic by setting the random seed, while others related to GPU floating-point computations and CPU multi-threading are harder to avoid without performance ramifications. Hence, reproducibility when resuming promoted configurations requires carefully checkpointing all stateful objects pertaining to the model. At a minimum this includes the model weights, model optimizer state, random number generator states, and data generator state. We provide a checkpointing solution that facilitates reproducibility in the presence of stateful variables and seeded random generators. The availability of deterministic GPU floating-point computations is dependent on the deep learning framework, but we allow users to control for all other sources of randomness during training. Asynchronous promotions . To allow for full reproducibility of ASHA, we track the sequence of all promotions made within a bracket. This sequence fixes the nondeterminism from asynchrony, allowing subsequent replay of the exact promotions as the original run. Consequently, we can reconstruct the full state of a bracket at any point in time, i.e. which configurations are on which rungs and which training tasks are in the stack. Taken together, reproducible checkpoints and full bracket states allow us to seamlessly resume hyperparameter tuning jobs when crashes happen and allow users to request to evaluate more configurations if desired. For ASHA, refining hyperparameter selection by resuming an existing bracket is highly beneficial, since a wider rung gives better empirical estimates of the top 1 / η 1/\eta configurations.

<sub>§5.4 Reproducibility in Distributed Environments</sub>

## 总结与展望
ASHA 把「并行跑一堆配置、按轮次逐级砍掉一半」写成算法，并指出两条工程改进：所有配置用统一的视界、不要重复晋升已经跑完的配置。这两条正是我们把 halving 叫「prefilter」而不是 halving 的原因——我们砍掉了候选，但省下的预算没有还给幸存者。

**It connects to**

- `1807.01774` — ASHA 是 Hyperband 的异步简化版，BOHB 在它之上加采样。
- `1801.01596` — 那篇把 Hyperband 与贝叶斯优化拼起来，是同一族的另一种拼法。

## 不足之处
**The authors say:** ASHA is able to remove the bottleneck associated with synchronous promotions by incurring a small number of incorrect promotions, i.e. configurations that were promoted early on but are not in the top 1 / η 1/\eta of configurations in hindsight. By the law of large numbers, we expect to erroneously promote a vanishing fraction of configurations in each rung as the number of configurations grows. Intuitively, in the first rung with n n evaluated configurations, the number of mispromoted configurations is roughly n \sqrt{n} , since the process resembles the convergence of an empirical cumulative distribution function (CDF) to its expected value ( Dvoretzky et al., 1956 ) . For later rungs, although the configurations are no longer i.i.d. since they were advanced based on the empirical CDF from the rung below, we expect this dependence to be weak.

**What a reader should still not conclude**

- 论文假设评估成本随预算是线性可分的（跑一半就花一半），我们的候选是离散的整轮，没有半轮这回事。
- 它不处理「评估器本身有噪声」的情形，而那是我们最大的不确定性来源。

<sub>§3.3 Algorithm Discussion</sub>

---

# Hyperparameter Optimization: Foundations, Algorithms, Best Practices and Open Challenges

arXiv:2107.05847 · 2021 · [source](https://arxiv.org/html/2107.05847)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Machine learning (ML) algorithms are highly configurable by their hyperparameters (HPs). These parameters often substantially influence the complexity, behavior, speed as well as other aspects of the learner, and their values must be selected with care in order to achieve optimal performance. Human trial-and-error to select these values is time-consuming, often somewhat biased, error-prone and computationally irreproducible.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Hyperparameter Optimization"]
  N1["§4.1 HPO Problem Definition"]
  N2["§4.2 Well-Established HPO Algorithms"]
  N3["§4.2.1 Grid Search and Random Search"]
  N4["§4.2.2 Evolution Strategies"]
  N5["§4.2.3 Bayesian Optimization"]
  N6["§4.2.4 Multifidelity and Hyperband"]
  N7["§4.2.5 Iterated Racing"]
  N8["§4.3 HPO - A Bilevel Inference Perspective"]
  N9["§4.4 Nested Resampling and Meta-Overfitting"]
  N10["§4.5 Threshold Tuning"]
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

![Learner ℐ \mathcal{I} takes input data, performs ERM, and returns model f ^ \hat{f} and its parameters 𝜽 ^ \bm{\hat{\theta}} . The GE of f ^ \hat{f} is evaluated on the fresh test set 𝒟 test \mathcal{D}_{\text{test}} .](https://arxiv.org/html/2107.05847/2107.05847v3/riskmin_bilevel2.svg)

*Learner ℐ \mathcal{I} takes input data, performs ERM, and returns model f ^ \hat{f} and its parameters 𝜽 ^ \bm{\hat{\theta}} . The GE of f ^ \hat{f} is evaluated on the fresh test set 𝒟 test \mathcal{D}_{\text{test}} .*

<sub>figure: `2107.05847v3/riskmin_bilevel2.svg`</sub>

## 机制
### 1. Hyperparameter Optimization

Typically, learners are constructed in such a way that optimized first-level parameters can be more efficiently computed for fixed HPs, e.g., often the first-level problem is convex, while the joint problem is not. Since the generalization error is eventually optimized for the bilevel approach, the resulting model should be less prone to overfitting.

<sub>§4 Hyperparameter Optimization</sub>

### 2. HPO Problem Definition

Most learners are highly configurable by HPs, and their generalization performance usually depends on this configuration in a non-trivial and subtle way. HPO algorithms automatically identify a well-performing HPC 𝝀 ∈ Λ ~ \bm{\lambda}\in\tilde{\Lambda} for an ML algorithm ℐ 𝝀 \mathcal{I}_{\bm{\lambda}} . The search space Λ ~ ⊂ Λ \tilde{\Lambda}\subset\Lambda contains all considered HPs for optimization and their respective ranges: where Λ ~ i \tilde{\Lambda}_{i} is a bounded subset of the domain of the i i -th HP Λ i \Lambda_{i} , and can be either continuous, discrete, or categorical. This already mixed search space can also contain dependent HPs , leading to a hierarchical search space: An HP λ i \lambda_{i} is said to be conditional on λ j \lambda_{j} if λ i \lambda_{i} is only active when λ j \lambda_{j} is an element of a given subset of Λ j \Lambda_{j} and inactive otherwise, i.e., not affecting the resulting learner ( Thornton et al., 2013b ) . Common examples are kernel HPs of a kernelized machine such as the SVM, when we tune over the kernel type and its respective hyperparameters as well. Such conditional HPs usually introduce tree-like dependencies in the search space, and may in general lead to dependencies that may be represented by directed acyclic graphs. The general HPO problem as visualized in Figure 2 is defined as: where 𝝀 ∗ \bm{\lambda}^{*} denotes the theoretical optimum, and c ⁡ ( 𝝀 ) c(\bm{\lambda}) is a shorthand for the estimated generalization error when ℐ , 𝒥 , ρ \mathcal{I},\mathcal{J},\rho are fixed. We therefore estimate and optimize the generalization error GE ^ ​ ( ℐ , 𝒥 , ρ , 𝝀 ) \widehat{\mathrm{GE}}(\mathcal{I},\mathcal{J},\rho,\bm{\lambda}) of a learner ℐ 𝝀 \mathcal{I}_{\bm{\lambda}} , w.r.t. an HPC 𝝀 \bm{\lambda} , based on a resampling split 𝒥 = ( ( J train , 1 , J test , 1 ) , … , ( J train , B , J test , B ) ) \mathcal{J}=\left((J_{\mathrm{train},1},J_{\mathrm{test},1}),\dots,(J_{\mathrm{train},B},J_{\mathrm{test},B})\right) . 5 5 5 Note again that optimizing the resampling error will result in biased estimates, which are problematic when reporting the generalization error; use nested CV for this, see Section 4.4 . Note that c ⁡ ( 𝝀 ) c(\bm{\lambda}) is a black-box, as it usually has no closed-form mathematical representation, and hence no analytic gradient information is available. Furthermore, the evaluation of c ⁡ ( 𝝀 ) c(\bm{\lambda}) can take a significant amount of time. Therefore, the minimization of c ⁡ ( 𝝀 ) c(\bm{\lambda}) forms an expensive black-box optimization problem. Taken together, these properties define an optimization problem of considerable difficulty. Furthermore, they rule out many popular optimization methods that require gradients or entirely numerical search spaces or that must perform a large number of evaluations to converge to a well-performing solution, like many meta-heuristics. Furthermore, as c ⁡ ( 𝝀 ) = GE ^ ​ ( ℐ , 𝒥 , ρ , 𝝀 ) c(\bm{\lambda})=\widehat{\mathrm{GE}}(\mathcal{I},\mathcal{J},\rho,\bm{\lambda}) , which is defined via resampling and evaluates 𝝀 \bm{\lambda} on randomly chosen validation sets, c c should be considered a stochastic objective – although many HPO algorithms may ignore this fact or simply handle it by assuming that we average out the randomness through enough resampling replications. We can thus define the HP tuner τ : ( 𝒟 , ℐ , Λ ~ , ρ ) ↦ 𝝀 ^ \tau:(\mathcal{D},\mathcal{I},\tilde{\Lambda},\rho)\mapsto\hat{\bm{\lambda}} that proposes its estimate 𝝀 ^ \hat{\bm{\lambda}} of the true optimal configuration 𝝀 ∗ \bm{\lambda}^{*} given a dataset 𝒟 \mathcal{D} , an inducer ℐ \mathcal{I} with corresponding search space Λ ~ \tilde{\Lambda} to optimize, and a target measure ρ \rho . The specific resampling splits 𝒥 \mathcal{J} used can either be passed into τ \tau as well or are internally handled to facilitate adaptive splitting or multi-fidelity optimization (e.g., as done in Klein et al., 2017c ).

<sub>§4.1 HPO Problem Definition</sub>

### 3. Well-Established HPO Algorithms

All HPO algorithms presented here work by the same principle: they iteratively propose HPCs 𝝀 + \bm{\lambda}^{+} and then evaluate the performance on these configurations. We store these HPs and their respective evaluations successively in the so-called archive 𝒜 = ( ( 𝝀 ( 1 ) , c ⁡ ( 𝝀 ( 1 ) ) ) , ( 𝝀 ( 2 ) , c ⁡ ( 𝝀 ( 2 ) ) ) , … ) \mathcal{A}=((\bm{\lambda}^{(1)},c(\bm{\lambda}^{(1)})),(\bm{\lambda}^{(2)},c(\bm{\lambda}^{(2)})),\dots) , with 𝒜 [ t + 1 ] = 𝒜 [ t ] ∪ ( 𝝀 + , c ⁡ ( 𝝀 + ) ) \mathcal{A}^{[t+1]}=\mathcal{A}^{[t]}\cup(\bm{\lambda}^{+},c(\bm{\lambda}^{+})) if a single point is proposed by the tuner. Many algorithms can be characterized by how they handle two different trade-offs: a) The exploration vs. exploitation trade-off refers to how much budget an optimizer spends on either attempting to directly exploit the currently available knowledge base by evaluating very close to the currently best candidates (e.g., local search) or exploring the search space to gather new knowledge (e.g., random search). b) The inference vs. search trade-off refers to how much time and overhead is spent to induce a model from the currently available archive data in order to exploit past evaluations as much as possible. Other relevant aspects that HPO algorithms differ in are: Parallelizability , i.e., how many configurations a tuner can (reasonably) propose at the same time; global vs. local behavior of the optimizer, i.e., if updates are always quite close to already evaluated configurations; noise handling , i.e., if the optimizer takes into account that the estimated generalization error is noisy; multifidelity , i.e., if the tuner uses cheaper evaluations, for example on smaller subsets of the data, to infer performance on the full data; search space complexity , i.e., if and how hierarchical search spaces as introduced in Section 5 can be handled.

<sub>§4.2 Well-Established HPO Algorithms</sub>

### 4. Grid Search and Random Search

Grid search (GS) is the process of discretizing the range of each HP and exhaustively evaluating every combination of values. Numeric and integer HP values are usually equidistantly spaced in their box constraints. The number of distinct values per HP is called the resolution of the grid. For categorical HPs, either a subset or all possible values are considered. A second simple HPO algorithm is random search (RS). In its simplest form, values for each HP are drawn independently of each other and from a pre-specified (often uniform) distribution, which works for (box-constrained) numeric, integer, or categorical parameters (c.f. Figure 3 ). Due to their simplicity, both GS and RS can handle hierarchical search spaces. RS often has much better performance than GS in higher-dimensional HPO settings ( Bergstra & Bengio, 2012c ) . GS suffers directly from the curse of dimensionality ( Bellman, 2015a ) , as the required number of evaluations increases exponentially with the number of HPs for a fixed grid resolution. This seems to be true as well for RS at first glance, and we certainly require an exponential number of points in dim ( Λ ~ ) \dim(\tilde{\Lambda}) to cover the space well. However, in practice, HPO problems often have low effective dimensionality ( Bergstra & Bengio, 2012c ) : The set of HPs that have an influence on performance is often a small subset of all available HPs. Consider the example illustrated in Figure 3 , where an HPO problem with HPs λ 1 \lambda_{1} and λ 2 \lambda_{2} is shown. A GS with resolution 3 3 resulting in 9 9 HPCs is evaluated, and we discover that only HP λ 1 \lambda_{1} has any relevant influence on the performance, so only 3 of 9 evaluations provided any meaningful information. In comparison, RS would have given us 9 different configurations for HP λ 1 \lambda_{1} , which results in a higher chance of finding the optimum. Another advantage of RS is that it can easily be extended by further samples; in contrast, the number of points on a grid must be specified beforehand, and refining the resolution of GS afterwards is more complicated. Altogether, this makes RS preferable to GS and a surprisingly strong baseline for HPO in many practical settings. Notably, there are sampling methods that attempt to cover the search space more evenly than the uniform sampling of RS, e.g., Latin Hypercube Sampling ( McKay et al., 1979a ) , or Sobol sequences ( Antonov & Saleev, 1979a ) . However, these do not seem to significantly outperform naive i.i.d. sampling ( Bergstra & Bengio, 2012c ) .

<sub>§4.2.1 Grid Search and Random Search</sub>

### 5. Evolution Strategies

Evolution strategies (ES) are a class of stochastic population-based optimization methods inspired by the concepts of biological evolution, belonging to the larger class of evolutionary algorithms . They do not require gradients, making them generally applicable in black-box settings such as HPO. In ES terminology, an individual is a single HPC, the population is a currently maintained set of HPCs, and the fitness of an individual is its (inverted) generalization error c ⁡ ( 𝝀 ) c(\bm{\lambda}) . Mutation is the (randomized) change of one or a few HP values in a configuration. Crossover creates a new HPC by (randomly) mixing the values of two other configurations. An ES follows iterative steps to find individuals with high fitness values (c.f. Figure 4 ): (i) An initial population is sampled at random. (ii) The fitness of each individual is evaluated. (iii) A set of individuals is selected as parents for reproduction. 6 6 6 Either completely at random, or with a probability according to their fitness, the most popular variants being roulette wheel and tournament selection. (iv) The population is enlarged through crossover and mutation of the parents. (v) The offspring is evaluated. (vi) The top-k fittest individuals are selected. 7 7 7 In ES-terminology this is called a ( μ + λ \mu+\lambda ) elite survival selection, where μ \mu denotes the population size, and λ \lambda the number of offspring; other variants like ( μ , λ \mu,\lambda ) selection exist. (vii) Steps (ii) to (v) are repeated until a termination condition is reached. For a more comprehensive introduction to ES, see Beyer & Schwefel (2002a) . ES were limited to numeric spaces in their original formulation, but they can easily be extended to handle mixed spaces by treating components of different types independently, e.g., by adding a normally distributed random value to real-valued HPs while adding the difference of two geometrically distributed values to integer-valued HPs ( Li et al., 2013a ) . By defining mutation and crossover operations that operate on tree structures or graphs, it is even possible to perform optimization of preprocessing pipelines ( Olson et al., 2016b ; Escalante et al., 2009a ) or neural network architectures ( Real et al., 2019a ) using evolutionary algorithms. The properties of ES can be summarized as follows: ES have a low likelihood to get stuck in local minima, especially if so-called nested ES are used ( Beyer & Schwefel, 2002a ) . They can be straightforwardly modified to be robust to noise ( Beyer & Sendhoff, 2006a ) , and can also be easily extended to multi-objective settings ( Coello et al., 2007a ) . Additionally, ES can be applied in settings with complex search spaces and can therefore work with spaces where other optimizers may fail ( He et al., 2021c ) . ES are more efficient than RS and GS but still often require a large number of iterations to find good solutions, which makes them unsatisfactory for expensive optimization settings like HPO.

<sub>§4.2.2 Evolution Strategies</sub>

### 6. Bayesian Optimization

Bayesian optimization (BO) has become increasingly popular as a global optimization technique for expensive black-box functions, and specifically for HPO ( Jones et al., 1998a ; Hutter et al., 2011d ; Snoek et al., 2012d ) . BO is an iterative algorithm whose key strategy is to model the mapping 𝝀 ↦ c ⁡ ( 𝝀 ) \bm{\lambda}\penalty\ \mapsto\penalty\ c(\bm{\lambda}) based on observed performance values found in the archive 𝒜 \mathcal{A} via (non-linear) regression. This approximating model is called a surrogate model , for which a Gaussian process or a random forest are typically used. BO starts on an archive 𝒜 \mathcal{A} filled with evaluated configurations, typically sampled randomly, using Latin Hypercube Sampling or the Sobol sampling ( Bossek et al., 2020a ) . BO then uses the archive to fit the surrogate model, which for each 𝝀 \bm{\lambda} produces both an estimate of performance c ^ ​ ( 𝝀 ) \hat{c}(\bm{\lambda}) as well as an estimate of prediction uncertainty σ ^ ​ ( 𝝀 ) \hat{\sigma}(\bm{\lambda}) , which then gives rise to a predictive distribution for one test HPC or a joint distribution for a set of HPCs. Based on the predictive distribution, BO establishes a cheap-to-evaluate acquisition function u ⁡ ( 𝝀 ) u(\bm{\lambda}) that encodes a trade-off between exploitation and exploration : The former means that the surrogate model predicts a good, low c c value for a candidate HPC 𝝀 \bm{\lambda} , while the latter implies that the surrogate is very uncertain about c ⁡ ( 𝝀 ) c(\bm{\lambda}) , likely because the surrounding area has not been explored thoroughly. Instead of working on the true expensive objective, the acquisition function u ⁡ ( 𝝀 ) u(\bm{\lambda}) is then optimized in order to generate a new candidate 𝝀 + \bm{\lambda}^{+} for evaluation. The optimization problem u ⁡ ( 𝝀 ) u(\bm{\lambda}) inherits most characteristics from c ⁡ ( 𝝀 ) c(\bm{\lambda}) ; so it is often still multi-modal and defined on a mixed, hierarchical search space. Therefore, u ⁡ ( 𝝀 ) u(\bm{\lambda}) may still be quite complex, but it is at least cheap to evaluate. This allows the usage of more budget-demanding optimizers on the acquisition function. If the space is real-valued and the combination of surrogate model and acquisition function supports it, even gradient information can be used. Among the possible optimization methods are: iterated local search (as used by Hutter et al. (2009a) ), evolutionary algorithms (as in White et al. (2021a) ), ES using derivatives (as used by Sekhon & Mebane (1998a) ; Roustant et al. (2012c) ), and a focusing RS called DIRECT ( Jones, 2009a ) . The true objective value c ⁡ ( 𝝀 + ) c(\bm{\lambda}^{+}) of the proposed HPC 𝝀 + \bm{\lambda}^{+} – generated by optimization of u ⁡ ( 𝝀 ) u(\bm{\lambda}) – is finally evaluated and added to the archive 𝒜 \mathcal{A} . The surrogate model is updated, and BO iterates until a predefined budget is exhausted, or a different termination criterion is reached. These steps are summarized in Algorithm 1 . BO methods can use different ways of deciding which 𝝀 \bm{\lambda} to return, referred to as the identification step by Jalali et al. (2017a) . This can either be the best observed 𝝀 \bm{\lambda} during optimization, the best (mean, or quantile) predicted 𝝀 \bm{\lambda} from the archive according to the surrogate model ( Picheny et al., 2013a ; Jalali et al., 2017a ) , or the best predicted 𝝀 \bm{\lambda} overall ( Scott et al., 2011a ) . The latter options serve as a way of smoothing the observed performance values and reducing the influence of noise on the choice of 𝝀 ^ \hat{\bm{\lambda}} .

<sub>§4.2.3 Bayesian Optimization</sub>

### 7. Multifidelity and Hyperband

The multifidelity (MF) concept in HPO refers to all tuning approaches that can efficiently handle a learner ℐ ⁡ ( 𝒟 , 𝝀 ) \mathcal{I}(\mathcal{D},\bm{\lambda}) with a fidelity HP λ fid \lambda_{\text{fid}} as a component of 𝝀 \bm{\lambda} , which influences the computational cost of the fitting procedure in a monotonically increasing manner. Higher λ fid \lambda_{\text{fid}} values imply a longer runtime of the fit. This directly implies that the lower we set λ fid \lambda_{\text{fid}} , the more points we can explore in our search space, albeit with much less reliable information w.r.t. their true performance. If λ fid \lambda_{\text{fid}} has a linear relationship with the true computational costs, we can directly sum the λ fid \lambda_{\text{fid}} values for all evaluations to measure the computational costs of a complete optimization run. We assume to know box-constraints of λ fid \lambda_{\text{fid}} in form of a lower and upper limit, so λ fid ∈ [ λ fid low , λ fid upp ] \lambda_{\text{fid}}\in[\lambda_{\text{fid}}^{\textrm{low}},\lambda_{\text{fid}}^{\textrm{upp}}] , where the upper limit implies the highest fidelity returning values closest to the true objective value at the highest computational cost. Usually, we expect higher values of λ fid \lambda_{\text{fid}} to be better in terms of predictive performance yet naturally more computationally expensive. However, overfitting can occur at some point, for example when λ fid \lambda_{\text{fid}} controls the number of training epochs when fitting an NN. Furthermore, we assume that the relationship of the fidelity to the prediction performance changes somewhat smoothly. Consequently, when evaluating multiple HPCs with small λ fid \lambda_{\text{fid}} , this at least indicates their true ranking. Typically, this implies a sequential fitting procedure, where λ fid \lambda_{\text{fid}} is, for example, the number of (stochastic) gradient descent steps or the number of sequentially added (boosting) ensemble members. A further, generally applicable option is to subsample the training data from a small fraction to 100% before training and to treat this as a fidelity control ( Klein et al., 2017c ) . HPO algorithms that exploit such a λ fid \lambda_{\text{fid}} parameter – usually by spending budget on cheap HPCs with low λ fid \lambda_{\text{fid}} values earlier for exploration, and then concentrating on the most promising ones later – are called multifidelity methods . One can define two versions of the MF-HPO problem. (a) If overfitting can occur with higher values of λ fid \lambda_{\text{fid}} (e.g., if it encodes training iterations), simply minimizing min 𝝀 ∈ Λ ~ ⁡ c ⁡ ( 𝝀 ) \min_{\bm{\lambda}\in\tilde{\Lambda}}c(\bm{\lambda}) is already appropriate. (b) If the assumption holds that a higher fidelity always results in a better model (e.g., if λ fid \lambda_{\text{fid}} controls the size of the training set), we are interested in finding the configuration 𝝀 ∗ \bm{\lambda}^{*} for which the inducer will return the best model given the full budget, so min 𝝀 ∈ Λ ~ , λ fid = λ fid upp ⁡ c ⁡ ( 𝝀 ) \min_{\bm{\lambda}\in\tilde{\Lambda},\lambda_{\text{fid}}=\lambda_{\text{fid}}^{\textrm{upp}}}c(\bm{\lambda}) . Of course, in both versions, the optimizer can make use of cheap HPCs with low settings of λ fid \lambda_{\text{fid}} on its path to its result. Hyperband ( Li et al., 2018c ) can best be understood as repeated execution of the successive halving (SH) procedure ( Jamieson & Talwalkar, 2016a ) . SH assumes a fidelity-budget B B for the sum of λ fid \lambda_{\text{fid}} for all evaluations. It starts with a given, fixed number of candidates 𝝀 ( i ) \bm{\lambda}^{(i)} that we denote with p [ 0 ] p^{[0]} and “races them down” in stages t t to a single best candidate by repeatedly evaluating all candidates with increased fidelity in a certain schedule. Typically, this is controlled by the η HB \eta_{\text{HB}} control multiplier of Hyperband with η HB > 1 \eta_{\text{HB}}>1 (typically set to 2 or 3): After each batch evaluation t t of the current population of size p [ t ] p^{[t]} , we reduce the population to the best 1 η HB \frac{1}{\eta_{\text{HB}}} fraction and set the new fidelity for a candidate evaluation to η HB × λ fid \eta_{\text{HB}}\times\lambda_{\text{fid}} . Thus, promising HPCs are assigned a higher fidelity overall, and sub-optimal ones are discarded early on. The starting fidelity λ fid [ 0 ] \lambda_{\text{fid}}^{[0]} and the number of stages s + 1 s+1 are computed in a way such that each batch evaluation of an SH population has approximately B / ( s + 1 ) B/(s+1) amount of fidelity units spent. Overall, this ensures that approximately, but not more than, B B fidelity units are spent in SH: However, the efficiency of SH strongly depends on a sensible choice of the number of starting configurations and the resulting schedule. If we assume a fixed fidelity-budget for HPO, the user has the choice of running either (a) more configurations but with less fidelity, or (b) fewer configurations, but with higher fidelity. While the former naturally explores more, the latter schedules evaluations with stronger correlation to the true objective value and more informative evaluations. As an example, consider how λ ( 6 ) \lambda^{(6)} is discarded in favor of λ ( 8 ) \lambda^{(8)} at 25% in Figure 6 . Because their performance lines would have crossed close to 100%, λ ( 6 ) \lambda^{(6)} is ultimately the better configuration. However, in this case, the superiority of λ ( 6 ) \lambda^{(6)} was only observable after full evaluation. As we often have no prior knowledge regarding this effect, HB simply runs SH for different numbers of starting configurations p s [ 0 ] p_{s}^{[0]} , and each SH run or schedule is called a bracket . As input, HB takes η HB \eta_{\text{HB}} and the maximum fidelity λ fid upp > η HB \lambda_{\text{fid}}^{\textrm{upp}}>\eta_{\text{HB}} . HB then constructs the target fidelity budget B B for each bracket by considering the most explorative bracket: Here, the number of batch evaluations s max + 1 s_{\text{max}}+1 is chosen to be ⌊ log η HB ⁡ ( λ fid upp ) ⌋ + 1 \left\lfloor\log_{\eta_{\text{HB}}}(\lambda_{\text{fid}}^{\textrm{upp}})\right\rfloor+1 for which λ fid [ 0 ] = λ fid upp ​ η HB − s max ∈ ( η HB − 1 , η HB ) , λ fid [ s max ] = λ fid upp \lambda_{\text{fid}}^{[0]}=\lambda_{\text{fid}}^{\textrm{upp}}\eta_{\text{HB}}^{-s_{\text{max}}}\in(\eta_{\text{HB}}^{-1},\eta_{\text{HB}}),\,\lambda_{\text{fid}}^{[s_{\text{max}}]}=\lambda_{\text{fid}}^{\textrm{upp}} , and we collect these values in 𝒓 = ( λ fid upp ​ η HB − s max , λ fid upp ​ η HB − s max + 1 , λ fid upp ​ η HB − s max + 2 , … , λ fid upp ) ∈ ℝ s m ​ a ​ x + 1 \bm{r}=(\lambda_{\text{fid}}^{\textrm{upp}}\eta_{\text{HB}}^{-s_{\text{max}}},\lambda_{\text{fid}}^{\textrm{upp}}\eta_{\text{HB}}^{-s_{\text{max}}+1},\lambda_{\text{fid}}^{\textrm{upp}}\eta_{\text{HB}}^{-s_{\text{max}}+2},\dots,\lambda_{\text{fid}}^{\textrm{upp}})\in\mathds{R}^{s_{max}+1} . Since we want to spend approximately the same total fidelity and reduce the candidates to one winning HPC in every batch evaluation, the fidelity budget of each bracket is B = ( s max + 1 ) ​ λ fid upp B=(s_{\text{max}}+1)\lambda_{\text{fid}}^{\textrm{upp}} . For every s ∈ { 0 , … , s max } s\in\{0,\dots,s_{\text{max}}\} , a bracket is defined by setting the starting fidelity λ fid [ 0 ] ≥ λ fid low \lambda_{\text{fid}}^{[0]}\geq\lambda_{\text{fid}}^{\textrm{low}} of the bracket to 𝒓 ( 1 + s max − s ) \bm{r}^{(1+s_{\text{max}}-s)} , resulting in s max + 1 s_{\text{max}}+1 brackets and an overall fidelity budget of ( s max + 1 ) ​ B (s_{\text{max}}+1)B spent by HB. Consequently, every bracket s s consists of s + 1 s+1 batch evaluations, and the starting population size p s [ 0 ] p_{s}^{[0]} is the maximum value that fulfills Eq. ( 13 ). The full algorithm is outlined in Algorithm 2 , and the bracket design of HB with λ fid upp = 8 \lambda_{\text{fid}}^{\textrm{upp}}=8 and η HB = 2 \eta_{\text{HB}}=2 is shown in Figure 6 . Starting configurations are usually sampled uniformly, but Li et al., 2018c also show that any stationary sampling distribution is valid. Because HB is a random-sampling-based method, it can trivially handle hierarchical HP spaces in the same manner as RS.

<sub>§4.2.4 Multifidelity and Hyperband</sub>

### 8. Iterated Racing

The iterated racing (IR, Birattari et al., 2010a ) procedure is a general algorithm configuration method that optimizes for a configuration of a general (not necessarily ML) algorithm that performs well over a given distribution of (arbitrary) problems. In most HPO algorithms, HPCs are evaluated using a resampling procedure such as CV, so a noisy function (error estimate for single resampling iterations) is evaluated multiple times and averaged. In order to connect racing to HPO, we now define a problem as a single holdout resampling split for a given ML data set, as suggested in Thornton et al. (2013b) ; Lang et al. (2015a) , and we will from now on describe racing only in terms of HPO. The fundamental idea of racing ( Maron & Moore, 1994a ) is that HPCs that show particularly poor performance when evaluated on the first problem instances (in our case: resampling folds) are unlikely to catch up in later folds and can be discarded early to save computation time for more interesting HPCs. This is determined by running a (paired) statistical test w.r.t. HPC performance values on folds. This allows for an efficient and dynamic allocation of the number of folds in the computation of c ⁡ ( 𝝀 ) c(\bm{\lambda}) – a property of IR that is unique, at least when compared to the algorithms covered in this article. Racing is similar to HB in that it discards poorly-performing HPCs early. Like HB, racing must also be combined with a sampling metaheuristic to initialize a race. Particularly well-suited for HPO are iterated races ( López-Ibáñez et al., 2016c ) , and we will use the terminology of that implementation to explain the main control parameters of IR. IR starts by racing down an initial population of randomly sampled HPCs and then uses the surviving HPCs of the race to stochastically initialize the population of the subsequent race to focus on interesting regions of the search space. Sampling is performed by first selecting a parent configuration 𝝀 \bm{\lambda} among the N elite N^{\textrm{elite}} survivors of the previous generation, according to a categorical distribution with probabilities p 𝝀 = 2 ​ ( N elite − r 𝝀 + 1 ) / ( N elite ​ ( N elite + 1 ) ) p_{\bm{\lambda}}=2(N^{\textrm{elite}}-r_{\bm{\lambda}}+1)/(N^{\textrm{elite}}(N^{\textrm{elite}}+1)) , where r 𝝀 r_{\bm{\lambda}} is the rank of the configuration 𝝀 \bm{\lambda} . A new HPC is then generated from this parent by mutating numeric HPs using a truncated normal distribution, always centered at the numeric HP value of the parent. Discrete parameters use a discrete probability distribution. This is visualized in Figure 7 . The parameters of these distributions are updated as the optimization continues: The standard deviation of the Gaussian is narrowed to enforce exploitation and convergence, and the categorical distribution is updated to more strongly favor the values of recent ancestors. IR is able to handle search spaces with dependencies by sampling HPCs that were inactive in a parent configuration from the initial (uniform) distribution. This algorithmic principle of having a distribution that is centered around well-performing candidates, is continuously sampled from and updated, is close to an estimation-of-distribution algorithm (EDA), a well-known template for ES ( Larrañaga & Lozano, 2001a ) . Therefore, IR could be described as an EDA with racing for noise handling. IR has several control parameters that determine how the racing experiments are executed. We only describe the most important ones here; many of these have heuristic defaults set in the implementation introduced by López-Ibáñez et al. (2016c) . N iter N^{\textrm{iter}} ( nbIterations ) determines the number of performed races, defaulting to ⌊ 2 + log ⁡ dim 2 ⁡ ( Λ ~ ) ⌋ \lfloor 2+\log_{2}\dim(\tilde{\Lambda})\rfloor (with dim ( Λ ~ ) \dim(\tilde{\Lambda}) the number of HPs being optimized). Within a race, each HPC is first evaluated on T first T^{\textrm{first}} ( firstTest ) folds before a first comparison test is made. Subsequent tests are then made after every T each T^{\textrm{each}} ( eachTest ) evaluation. IR can be performed as elitist , which means surviving configurations from a generation are part of the next generation. The statistical test that discards individuals can be the Friedman test or the t t -test ( Birattari et al., 2002a ) , the latter possibly with multiple testing correction. López-Ibáñez et al. (2016c) recommend the t t -test when when performance values for evaluations on different instances are commensurable and the tuning objective is the mean over instances, which is usually the case for our resampled performance metric where instances are simply resampling folds.

<sub>§4.2.5 Iterated Racing</sub>

### 9. HPO - A Bilevel Inference Perspective

As discussed in Section 4.1 , HPO produces an approximately optimal HPC 𝝀 ^ = τ ⁡ ( 𝒟 , ℐ , Λ ~ , ρ ) \hat{\bm{\lambda}}=\tau(\mathcal{D},\mathcal{I},\tilde{\Lambda},\rho) by optimizing it w.r.t. the resampled performance c ⁡ ( 𝝀 ) = GE ^ ​ ( ℐ , 𝒥 , ρ , 𝝀 ) c(\bm{\lambda})=\widehat{\mathrm{GE}}(\mathcal{I},\mathcal{J},\rho,\bm{\lambda}) . This is still risk minimization w.r.t. (hyper)parameters, where we search for optimal parameters 𝝀 ^ \hat{\bm{\lambda}} so that the risk of our predictor f ^ 𝝀 ^ , 𝜽 ^ \hat{f}_{\hat{\bm{\lambda}},\bm{\hat{\theta}}} becomes minimal when measured on validation data via where f ^ 𝝀 ^ , 𝜽 ^ = ℐ ⁡ ( 𝒟 train , 𝝀 ^ ) \hat{f}_{\hat{\bm{\lambda}},\bm{\hat{\theta}}}=\mathcal{I}(\mathcal{D}_{\text{train}},\hat{\bm{\lambda}}) and 𝑭 𝝀 ^ , 𝜽 ^ \bm{F}_{\hat{\bm{\lambda}},\bm{\hat{\theta}}} is the prediction matrix of f ^ \hat{f} on validation data, for a pointwise loss function. The above is formulated for a single holdout split ( J train , J test ) (J_{\mathrm{train}},J_{\mathrm{test}}) in order to demonstrate the tight connection between (first level) risk minimization and HPO; Eq. ( 8 ) provides the generalization for arbitrary resampling with multiple folds. This is somewhat obfuscated and complicated by the fact that we cannot evaluate Eq. ( 8 ) in one go, but must rather fit one or multiple models f ^ \hat{f} during its computation (hence also its black-box nature). It is useful to conceptualize this as a bilevel inference mechanism; while the parameters 𝜽 ^ \bm{\hat{\theta}} of f f for a given HPC are estimated in the first level, in the second level we infer the HPs 𝝀 ^ \hat{\bm{\lambda}} . However, both levels are conceptually very similar in the sense that we are optimizing a risk function for model parameters which should be optimal for the the data distribution at hand. In case of the second level, this risk function is not ℛ emp ​ ( 𝜽 ) \mathcal{R}_{\text{emp}}(\bm{\theta}) , but the harder-to-evaluate generalization error GE ^ \widehat{\mathrm{GE}} . An intuitive, alternative term for HPO is second level inference ( Guyon et al., 2010a ) , visualized in Figure 8 . There are mainly two reasons why such a bilevel optimization is preferable to a direct, joint risk minimization of parameters and HPs ( Guyon et al., 2010a ) : Thus, we can define a learner with integrated tuning as a mapping 𝒯 ℐ , Λ ~ , ρ , 𝒥 : 𝔻 → ℋ \mathcal{T}_{\mathcal{I},\tilde{\Lambda},\rho,\mathcal{J}}:\mathds{D}\rightarrow\mathcal{H} , 𝒟 → ℐ τ ⁡ ( 𝒟 , ℐ , Λ ~ , ρ ) ​ ( 𝒟 ) \mathcal{D}\rightarrow\mathcal{I}_{\tau(\mathcal{D},\mathcal{I},\tilde{\Lambda},\rho)}(\mathcal{D}) , which maps a data set 𝒟 \mathcal{D} to the model f ^ 𝝀 ^ \hat{f}_{\hat{\bm{\lambda}}} that has the HPC set to 𝝀 ^ \hat{\bm{\lambda}} as optimized by τ \tau on 𝒟 \mathcal{D} and is then itself trained on the whole of 𝒟 \mathcal{D} ; all for a given inducer ℐ \mathcal{I} , performance measure ρ \rho , and search space Λ ~ \tilde{\Lambda} . Algorithmically, this learner has a 2-step training procedure (see Figure 8 ), where tuning is performed before the final model fit. This “self-tuning” learner 𝒯 \mathcal{T} “shadows” the tuned HPs of its search space Λ ~ \tilde{\Lambda} from the original learner and integrates their configuration into the training procedure 8 8 8 The self-tuning learner actually also adds new HPs that are the control parameters of the HPO procedure. . If such a learner is cross-validated, we naturally arrive at the concept of nested CV , which is discussed in the following Section 4.4 .

<sub>§4.3 HPO - A Bilevel Inference Perspective</sub>

### 10. Nested Resampling and Meta-Overfitting

As discussed in Section 3.2 , the evaluation of any learner should always be performed via resampling on independent test sets to ensure non-biased estimation of its generalization error. This is necessary because evaluating f ^ \hat{f} on the data set 𝒟 \mathcal{D} that was used for its construction would lead to an optimistic bias. In the general HPO problem as in Eq. ( 10 ), we already minimize this generalization error by resampling: If we simply report the estimated c ⁡ ( 𝝀 ^ ) c(\hat{\bm{\lambda}}) value of the returned best HPC, this also creates an optimistically biased estimator of the generalization error, as we have violated the fundamental “untouched test set” principle by optimizing on the test set(s) instead. To better understand the necessity of an additional resampling step, we consider the following example in Figure 9 , introduced by Bischl et al. (2012a) . Assume a balanced binary classification task and an inducer ℐ 𝝀 \mathcal{I}_{\bm{\lambda}} that ignores the data. Hence, 𝝀 \bm{\lambda} has no effect, but rather “predicts” the class labels in a balanced but random manner. Such a learner always has a true misclassification error of GE ⁡ ( ℐ , 𝝀 , n train , ρ ) = 0.5 \mathrm{GE}(\mathcal{I},\bm{\lambda},n_{\mathrm{train}},\rho)=0.5 (using ρ C ​ E \rho_{CE} as a metric), and any normal CV-based estimator will provide an approximately correct value as long as our data set is not too small. We now “tune” this learner, for example, by RS – which is meaningless, as 𝝀 \bm{\lambda} has no effect. The more tuning iterations are performed, the more likely it becomes that some model from our archive will produce partially correct labels simply by random chance, and the (only randomly) “best” of these is selected by our tuner at the end. The more we tune, the smaller our data set, or the more variance our GE estimator exhibits, the more expressed this optimistic bias will be. To avoid this bias, we introduce an additional outer resampling loop around this inner HPO-resampling procedure – or as discussed in Section 4.3 , we simply regard this as cleanly cross-validating the self-tuned learner 𝒯 ℐ , Λ ~ , ρ , 𝒥 \mathcal{T}_{\mathcal{I},\tilde{\Lambda},\rho,\mathcal{J}} . This is called nested resampling , which is illustrated in Figure 10 . The procedure works as follows: In the outer loop, an outer model-building or training set is selected, and an outer test set is cleanly set aside. Each proposed HPC 𝝀 + \bm{\lambda}^{+} during tuning is evaluated via inner resampling on the outer training set. The best performing HPC 𝝀 ^ \hat{\bm{\lambda}} returned by tuning is then used to fit a final model for the current outer loop on the outer training set, and this model is then cleanly evaluated on the test set. This is repeated for all outer loops, and all outer test performances are aggregated at the end. Some further comments on this general procedure: 1. Any resampling scheme is possible on the inside and outside, and these schemes can be flexibly combined based on statistical and computational considerations. Nested CV and nested holdout are most common. 2. Nested holdout is often called the train-validation-test procedure, with the respective terminology for the generated three data sets resulting from the 3-way split. 3. Many users often wonder which “optimal” HPC 𝝀 ^ \hat{\bm{\lambda}} they are supposed to report or study if nested CV is performed, with multiple outer loops, and hence multiple outer HPCs 𝝀 ^ \hat{\bm{\lambda}} . However, the learned HPs that result from optimizations within CV are considered temporary objects that merely exist in order to estimate GE ^ ​ ( ℐ , 𝒥 , ρ , 𝝀 ) \widehat{\mathrm{GE}}(\mathcal{I},\mathcal{J},\rho,\bm{\lambda}) . The comparison to first-level risk minimization from Section 4.3 is instructive here: The formal goal of nested CV is simply to produce the performance distribution on outer test sets; the 𝝀 ^ \hat{\bm{\lambda}} can be considered as the fitted HPs of the self-tuned learner 𝒯 \mathcal{T} . If the parameters of a final model are of interest for further study, the tuner 𝒯 \mathcal{T} should be fitted one final time on the complete data set. This would imply a final tuning run on the complete data set for second-level inference. Nested resampling ensures unbiased outer evaluation of the HPO process, but, as CV for the first level, it is only a process that is used to estimate performance – it does not directly help in constructing a better model. The biased estimation of performance values is not a problem for the optimization itself, as long as all evaluated HPCs are still ranked correctly. But after a considerably large amount of evaluations, wrong HPCs might be selected due to stochasticity or overfitting to the splits of the inner resampling. This effect has been called either overtuning, meta-overfitting or oversearching ( Ng, 1997a ; Quinlan & Cameron-Jones, 1995a ) . At least parts of this problem seem directly related to the problem of multiple hypothesis testing. However, it has not been analysed very well yet, and unlike regularization for (first level) ERM, not many counter measures are currently known for HPO.

<sub>§4.4 Nested Resampling and Meta-Overfitting</sub>

### 11. Threshold Tuning

Most classifiers do not directly output class labels, but rather probabilities or real-valued decision scores, although many metrics require predicted class labels. A score is converted to a predicted label by comparing it to a threshold t t so that y ^ = [ f ( 𝐱 ) ≥ t ] \hat{y}=[f(\mathbf{x})\geq t] , where we use the Iverson bracket [ ] [] with y ^ = 1 \hat{y}=1 if f ⁡ ( 𝐱 ) ≥ t f(\mathbf{x})\geq t and y ^ = 0 \hat{y}=0 in all other cases. For binary classification, the default thresholds are t = 0.5 t=0.5 for probabilities and t = 0 t=0 for scores. However, depending on the metric and the classifier, different thresholds can be optimal. Threshold tuning ( Sheng & Ling, 2006a ) is the practice of optimizing the classification threshold t t for a given model to improve performance. Strictly speaking, the threshold constitutes a further HP that must be chosen carefully. However, since the threshold can be varied freely after a model has been built, it does not need to be tuned jointly with the remaining HPs and can be optimized in a separate, subsequent, and cheaper step for each proposed HPC 𝝀 + \bm{\lambda}^{+} . After models have been fitted and predictions for all test sets have been obtained when c ⁡ ( 𝝀 + ) c(\bm{\lambda}^{+}) is computed via resampling, the vector of joint test set scores 𝑭 ~ \tilde{\bm{F}} can be compared against the joint vector of test set labels 𝐲 \mathbf{y} to optimize for an optimal threshold t ^ = arg ​ min t ρ ( 𝐲 ~ , [ 𝐅 ~ ≥ t ] ) \hat{t}=\argmin_{t}\rho(\tilde{\mathbf{y}},[\tilde{\bm{F}}\geq t]) , where the Iverson bracket is evaluated component-wise and t ∈ [ 0 , 1 ] t\in[0,1] for a binary probabilistic classifier and t ∈ ℝ t\in\mathds{R} for a score classifier. Since t t is scalar and evaluations are cheap, t ^ \hat{t} can be found easily via a line search. This two-step approach ensures that every HPC is coupled with its optimal threshold. c ⁡ ( 𝝀 + ) c(\bm{\lambda}^{+}) is then defined as the optimal performance value for 𝝀 + \bm{\lambda}^{+} in combination with t ^ \hat{t} . The procedure can be generalized to multi-class classification. Class probabilities or scores π ^ k ​ ( 𝐱 ) , k = 1 , … , g \hat{\pi}_{k}(\mathbf{x}),k=1,\ldots,g are divided by threshold weights w k w_{k} , k = 1 , … , g k=1,\ldots,g , and the k k that yields the maximal π ^ k ​ ( 𝐱 ) w k \frac{\hat{\pi}_{k}(\mathbf{x})}{w_{k}} is chosen as the predicted class label. The weights w k , k = 1 , … , g w_{k},k=1,\ldots,g are optimized in the same way as t t in the binary case. Generally, threshold tuning can be performed jointly with any HPO algorithm. In practice, threshold tuning is implemented as a post-processing step of an ML pipeline (Sections 5.1 & 5.2 ).

<sub>§4.5 Threshold Tuning</sub>

## 总结与展望
这篇 HPO 综述里有两段被我们直接引用：一是多保真方法要求保真度与目标单调相关，二是「选一个合适的预算本身是实践难题，尚未被很好解决」。第二句是这一方向对我们最有价值的诚实——它不是我们没做好，是领域内也没有答案。

**It connects to**

- `1807.01774` — 综述把 BOHB、Hyperband 一类归为多保真，并指出它们的共同前提。
- `1810.05934` — ASHA 是综述里并行调度的代表。

## 不足之处
**What a reader should still not conclude**

- 综述覆盖的是传统 HPO，不涉及 LLM 评测，所以「保真度」在那里是训练轮数。
- 它给出的建议是实践性的，没有可检验的定理。

---

# Regularized Evolution for Image Classifier Architecture Search

arXiv:1802.01548 · 2019 · [source](https://arxiv.org/html/1802.01548)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Until recently, most state-of-the-art image classifier architectures have been manually designed by human experts [ 28 , 45 , 20 , 24 , 23 ] . To speed up the process, researchers have looked into automated methods [ 2 , 53 , 32 , 36 , 47 , 43 , 29 , 35 ] . These methods are now collectively known as architecture-search algorithms . A traditional approach is neuro-evolution of topologies [ 33 , 1 , 42 ] . Improved hardware now allows scaling up evolution to produce high-quality image classifiers [ 36 , 47 , 30 ] . Yet, the architectures produced by evolutionary algorithms / genetic programming have not reached the accuracy of those directly designed by human experts. Here we evolve image classifiers that surpass hand-designs.

<sub>§Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§Methods"]
  N1["§Search Space"]
  N2["§Evolutionary Algorithm"]
  N3["§Baseline Algorithms"]
  N4["§Experimental Setup"]
  N5["§Methods Details"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![NASNet Search Space [ 54 ] . LEFT: the full outer structure (omitting skip inputs for clarity). MIDDLE: detailed view with the skip inputs. RIGHT: cell example. Dotted line demarcates a pairwise combination.](https://arxiv.org/html/1802.01548/1802.01548v7/nasnet_space_outer_cifar.svg)

*NASNet Search Space [ 54 ] . LEFT: the full outer structure (omitting skip inputs for clarity). MIDDLE: detailed view with the skip inputs. RIGHT: cell example. Dotted line demarcates a pairwise combination.*

<sub>figure: `1802.01548v7/nasnet_space_outer_cifar.svg`</sub>

## 机制
### 1. Methods / Search Space

This section contains a readable description of the methods. The Methods Details section gives additional information. All experiments use the NASNet search space [ 54 ] . This is a space of image classifiers, all of which have the fixed outer structure indicated in Figure 1 (left): a feed-forward stack of Inception-like modules called cells . Each cell receives a direct input from the previous cell (as depicted) and a skip input from the cell before it (Figure 1 , middle). The cells in the stack are of two types: the normal cell and the reduction cell . All normal cells are constrained to have the same architecture, as are reduction cells, but the architecture of the normal cells is independent of that of the reduction cells. Other than this, the only difference between them is that every application of the reduction cell is followed by a stride of 2 that reduces the image size, whereas normal cells preserve the image size. As can be seen in the figure, normal cells are arranged in three stacks of N cells. The goal of the architecture-search process is to discover the architectures of the normal and reduction cells. As depicted in Figure 1 (middle and right), each cell has two input activation tensors and one output. The very first cell takes two copies of the input image. After that, the inputs are the outputs of the previous two cells. Both normal and reduction cells must conform to the following construction. The two cell input tensors are considered hidden states “0” and “1”. More hidden states are then constructed through pairwise combinations . A pairwise combination is depicted in Figure 1 (right, inside dashed circle). It consists in applying an operation (or op ) to an existing hidden state, applying another op to another existing hidden state, and adding the results to produce a new hidden state. Ops belong to a fixed set of common convnet operations such as convolutions and pooling layers. Repeating hidden states or operations within a combination is permitted. In the cell example of Figure 1 (right), the first pairwise combination applies a 3x3 average pool op to hidden state 0 and a 3x3 max pool op to hidden state 1, in order to produce hidden state 2. The next pairwise combination can now choose from hidden states 0, 1, and 2 to produce hidden state 3 (chose 0 and 1 in Figure 1 ), and so on. After exactly five pairwise combinations, any hidden states that remain unused (hidden states 5 and 6 in Figure 1 ) are concatenated to form the output of the cell (hidden state 7). A given architecture is fully specified by the five pairwise combinations that make up the normal cell and the five that make up the reduction cell. Once the architecture is specified, the model still has two free parameters that can be used to alter its size (and its accuracy): the number of normal cells per stack (N) and the number of output filters of the convolution ops (F). N and F are determined manually.

<sub>§Methods · §Search Space</sub>

### 2. Evolutionary Algorithm

The evolutionary method we used is summarized in Algorithm 1 . It keeps a population of P trained models throughout the experiment. The population is initialized with models with random architectures (“while | p ​ o ​ p ​ u ​ l ​ a ​ t ​ i ​ o ​ n | \left|{population}\right| ” in Algorithm 1 ). All architectures that conform to the search space described are possible and equally likely. After this, evolution improves the initial population in cycles (“while | h ​ i ​ s ​ t ​ o ​ r ​ y | \left|{history}\right| ” in Algorithm 1 ). At each cycle, it samples S random models from the population, each drawn uniformly at random with replacement. The model with the highest validation fitness within this sample is selected as the parent . A new architecture, called the child , is constructed from the parent by the application of a transformation called a mutation . A mutation causes a simple and random modification of the architecture and is described in detail below. Once the child architecture is constructed, it is then trained, evaluated, and added to the population. This process is called tournament selection [ 19 ] . It is common in tournament selection to keep the population size fixed at the initial value P. This is often accomplished with an additional step within each cycle: discarding (or killing ) the worst model in the random S-sample. We will refer to this approach as non-aging evolution . In contrast, in this paper we prefer a novel approach: killing the oldest model in the population—that is, removing from the population the model that was trained the earliest (“remove dead from left of pop ” in Algorithm 1 ). This favors the newer models in the population. We will refer to this approach as aging evolution . In the context of architecture search, aging evolution allows us to explore the search space more, instead of zooming in on good models too early, as non-aging evolution would (see Discussion section for details). In practice, this algorithm is parallelized by distributing the “while | h ​ i ​ s ​ t ​ o ​ r ​ y | \left|{history}\right| ” loop in Algorithm 1 over multiple workers. A full implementation can be found online. 2 2 2 https://colab.research.google.com/github/google-research/google-research/blob/master/evolution/regularized_evolution_algorithm/regularized_evolution.ipynb Intuitively, the mutations can be thought of as providing exploration, while the parent selection provides exploitation. The parameter S S controls the aggressiveness of the exploitation: S = 1 S=1 reduces to a type of random search and 2 ≤ S ≤ P 2\leq S\leq P leads to evolution of varying greediness. New models are constructed by applying a mutation to existing models, transforming their architectures in random ways. To navigate the NASNet search space described above, we use two main mutations that we call the hidden state mutation and the op mutation . A third mutation, the identity, is also possible. Only one of these mutations is applied in each cycle, choosing between them at random. The hidden state mutation consists of first making a random choice of whether to modify the normal cell or the reduction cell. Once a cell is chosen, the mutation picks one of the five pairwise combinations uniformly at random. Once the pairwise combination is picked, one of the two elements of the pair is chosen uniformly at random. The chosen element has one hidden state. This hidden state is now replaced with another hidden state from within the cell, subject to the constraint that no loops are formed (to keep the feed-forward nature of the convnet). Figure 2 (top) shows an example. The op mutation behaves like the hidden state mutation as far as choosing one of the two cells, one of the five pairwise combinations, and one of the two elements of the pair. Then it differs in that it modifies the op instead of the hidden state. It does this by replacing the existing op with a random choice from a fixed list of ops (see Methods Details). Figure 2 (bottom) shows an example.

<sub>§Evolutionary Algorithm</sub>

### 3. Baseline Algorithms

Our main baseline is the application of RL to the same search space. RL was implemented using the algorithm and code in the baseline study [ 54 ] . An LSTM controller outputs the architectures, constructing the pairwise combinations one at a time, and then gets a reward for each architecture by training and evaluating it. More detail can be found in the baseline study. We also compared against random search (RS). In our RS implementation, each model is constructed randomly so that all models in the search space are equally likely, as in the initial population in the evolutionary algorithm. In other words, the models in RS experiments are not constructed by mutating existing models, so as to make new models independent from previous ones.

<sub>§Baseline Algorithms</sub>

### 4. Experimental Setup

We ran controlled comparisons at scale, ensuring identical conditions for evolution, RL and random search (RS). In particular, all methods used the same computer code for network construction, training and evaluation. Experiments always searched on the CIFAR-10 dataset [ 27 ] . As in the baseline study, we first performed architecture search over small models ( i.e . small N and F) until 20k models were evaluated. After that, we used the model augmentation trick [ 54 ] : we took architectures discovered by the search ( e.g . the output of an evolutionary experiment) and turn them into a full-size, accurate models. To accomplish this, we enlarged the models by increasing N and F so the resulting model sizes would match the baselines, and we trained the enlarged models for a longer time on the CIFAR-10 or the ImageNet classification datasets [ 27 , 12 ] . For ImageNet, a stem was added at the input of the model to reduce the image size, as shown in Figure 5 (left). This is the same procedure as in the baseline study. To produce the largest model (see last paragraph of Results section; not included in tables), we increased N and F until we ran out of memory. Actual values of N and F for all models are listed in the Methods Details section.

<sub>§Experimental Setup</sub>

### 5. Methods Details

This section complements the Methods section with the details necessary to reproduce our experiments. Possible ops: none (identity); 3x3, 5x5 and 7x7 separable (sep.) convolutions (convs.); 3x3 average (avg.) pool; 3x3 max pool; 3x3 dilated (dil.) sep. conv.; 1x7 then 7x1 conv. Evolved with P P = 100 100 , S S = 25 25 . CIFAR-10 dataset [ 27 ] with 5k withheld examples for validation. Standard ImageNet dataset [ 12 ] , 1.2M 331x331 images and 1k classes; 50k examples withheld for validation; standard validation set used for testing. During the search phase, each model trained for 25 epochs; N=3/F=24, 1 GPU. Each experiment ran on 450 K40 GPUs for 20k models (approx. 7 days). To optimize evolution, we tried 5 configurations with P/S of: 100/2, 100/50, 20/20, 100/25, 64/16, best was 100/25. The probability of the identity mutation was fixed at the small, arbitrary value of 0.05 and was not tuned. Other mutation probabilities were uniform, as described in the Methods. To optimize RL, started with parameters already tuned in the baseline study and further optimized learning rate in 8 configurations: 0.00003, 0.00006, 0.00012, 0.0002, 0.0004, 0.0008, 0.0016, 0.0032; best was 0.0008. To avoid selection bias, plots do not include optimization runs, as was decided a priori. Best few (20) models were selected from each experiment and augmented to N=6/F=32, as in baseline study; batch 128, SGD with momentum rate 0.9, L2 weight decay 5 × 10 − 4 5\times 10^{-4} , initial lr 0.024 with cosine decay, 600 epochs, ScheduledDropPath to 0.7 prob; auxiliary softmax with half-weight of main softmax. For Table 1 , we used N/F of 6/32 and 6/36. For ImageNet table, N/F were 6/190 and 6/448 and standard training methods [ 44 ] : distributed sync SGD with 100 P100 GPUs; RMSProp optimizer with 0.9 decay and ϵ \epsilon =0.1, 4 × 10 − 5 4\times 10^{-5} weight decay, 0.1 label smoothing, auxiliary softmax weighted by 0.4; dropout probability 0.5; ScheduledDropPath to 0.7 probability (as in baseline—note that this trick only contributes 0.3% top-1 ImageNet acc.); 0.001 initial lr, decaying every 2 epochs by 0.97. Largest model used N=6/F=448. F always refers to the number of filters of convolutions in the first stack; after each reduction cell, this number is doubled. Wherever applicable, we used the same conditions as the baseline study.

<sub>§Methods Details</sub>

## 总结与展望
Regularized Evolution 用「锦标赛选择 + 老化」在架构搜索里打败了更强的搜索器，结论是采样策略比模型复杂度更重要。它的老化机制对我们有直接类比：旧的好版本应该自然退出采样池，否则搜索会锁死在早期发现上。

**It connects to**

- `1504.04909` — 两者都在对抗「搜索坍缩到一个吸引子」，一个用格子，一个用老化。

## 不足之处
**The authors say:** This section will suggest directions for future work, which we will motivate by speculating about the evolutionary process and by summarizing additional minor results. The details of these minor results have been relegated to the supplements, as they are not necessary to understand or reproduce our main results above.

**What a reader should still not conclude**

- 老化是超参（池大小与淘汰速率），论文没有给出选择规则。
- 它的评估是固定预算的训练，不涉及「评估成本可变」。

<sub>§Discussion</sub>

---

# DARTS: Differentiable Architecture Search

arXiv:1806.09055 · 2019 · [source](https://arxiv.org/html/1806.09055)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Discovering state-of-the-art neural network architectures requires substantial effort of human experts. Recently, there has been a growing interest in developing algorithmic solutions to automate the manual process of architecture design. The automatically searched architectures have achieved highly competitive performance in tasks such as image classification ( Zoph & Le, 2017 ; Zoph et al., 2018 ; Liu et al., 2018b ; Liu et al., 2018a ; Real et al., 2018 ) and object detection ( Zoph et al., 2018 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Differentiable Architecture Search"]
  N1["§2.1 Search Space"]
  N2["§2.2 Continuous Relaxation and Optimization"]
  N3["§2.3 Approximate Architecture Gradient"]
  N4["§First-order Approximation"]
  N5["§2.4 Deriving Discrete Architectures"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Learning dynamics of our iterative algorithm when ℒ v ​ a ​ l ​ ( w , α ) = α ​ w − 2 ​ α + 1 \mathcal{L}_{val}(w,\alpha)=\alpha w-2\alpha+1 and ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ) = w 2 − 2 ​ α ​ w + α 2 \mathcal{L}_{train}(w,\alpha)=w^{2}-2\alpha w+\alpha^{2} , starting from ( α ( 0 ) , w ( 0 ) ) = ( 2 , − 2 ) (\alpha^{(0)},w^{(0)})=(2,-2) . The analytical solution for the corresponding bilevel optimization problem is ( α ∗ , w ∗ ) = ( 1 , 1 ) (\alpha^{*},w^{*})=(1,1) , which is highlighted in the red circle. The dashed red line indicates the feasible set where constraint equation 4 is satisfied exactly (namely, weights in w w are optimal for the given architecture α \alpha ). The example shows that a suitable choice of ξ \xi helps to converge to a better local optimum.](https://arxiv.org/html/1806.09055/1806.09055v2/convergence.svg)

*Learning dynamics of our iterative algorithm when ℒ v ​ a ​ l ​ ( w , α ) = α ​ w − 2 ​ α + 1 \mathcal{L}_{val}(w,\alpha)=\alpha w-2\alpha+1 and ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ) = w 2 − 2 ​ α ​ w + α 2 \mathcal{L}_{train}(w,\alpha)=w^{2}-2\alpha w+\alpha^{2} , starting from ( α ( 0 ) , w ( 0 ) ) = ( 2 , − 2 ) (\alpha^{(0)},w^{(0)})=(2,-2) . The analytical solution for the corresponding bilevel optimization problem is ( α ∗ , w ∗ ) = ( 1 , 1 ) (\alpha^{*},w^{*})=(1,1) , which is highlighted in the red circle. The dashed red line indicates the feasible set where constraint equation 4 is satisfied exactly (namely, weights in w w are optimal for the given architecture α \alpha ). The example shows that a suitable choice of ξ \xi helps to converge to a better local optimum.*

<sub>figure: `1806.09055v2/convergence.svg`</sub>

## 机制
### 1. Differentiable Architecture Search

We describe our search space in general form in Sect. 2.1 , where the computation procedure for an architecture (or a cell in it) is represented as a directed acyclic graph. We then introduce a simple continuous relaxation scheme for our search space which leads to a differentiable learning objective for the joint optimization of the architecture and its weights (Sect. 2.2 ). Finally, we propose an approximation technique to make the algorithm computationally feasible and efficient (Sect. 2.3 ).

<sub>§2 Differentiable Architecture Search</sub>

### 2. Search Space

Following Zoph et al. (2018) ; Real et al. (2018) ; Liu et al. (2018a) ; Liu et al. (2018b) , we search for a computation cell as the building block of the final architecture. The learned cell could either be stacked to form a convolutional network or recursively connected to form a recurrent network. A cell is a directed acyclic graph consisting of an ordered sequence of N N nodes. Each node x ( i ) x^{(i)} is a latent representation (e.g. a feature map in convolutional networks) and each directed edge ( i , j ) (i,j) is associated with some operation o ( i , j ) o^{(i,j)} that transforms x ( i ) x^{(i)} . We assume the cell to have two input nodes and a single output node. For convolutional cells, the input nodes are defined as the cell outputs in the previous two layers ( Zoph et al., 2018 ) . For recurrent cells, these are defined as the input at the current step and the state carried from the previous step. The output of the cell is obtained by applying a reduction operation (e.g. concatenation) to all the intermediate nodes. Each intermediate node is computed based on all of its predecessors: A special zero operation is also included to indicate a lack of connection between two nodes. The task of learning the cell therefore reduces to learning the operations on its edges.

<sub>§2.1 Search Space</sub>

### 3. Continuous Relaxation and Optimization

Let 𝒪 \mathcal{O} be a set of candidate operations (e.g., convolution, max pooling, zero ) where each operation represents some function o ⁡ ( ⋅ ) o(\cdot) to be applied to x ( i ) x^{(i)} . To make the search space continuous, we relax the categorical choice of a particular operation to a softmax over all possible operations: where the operation mixing weights for a pair of nodes ( i , j ) (i,j) are parameterized by a vector α ( i , j ) \alpha^{(i,j)} of dimension | 𝒪 | |\mathcal{O}| . The task of architecture search then reduces to learning a set of continuous variables α = { α ( i , j ) } \alpha=\big\{\alpha^{(i,j)}\big\} , as illustrated in Fig. 1 . At the end of search, a discrete architecture can be obtained by replacing each mixed operation o ¯ ( i , j ) \bar{o}^{(i,j)} with the most likely operation, i.e., o ( i , j ) = argmax o ∈ 𝒪 ​ α o ( i , j ) o^{(i,j)}=\mathrm{argmax}_{o\in\mathcal{O}}\enskip\alpha^{(i,j)}_{o} . In the following, we refer to α \alpha as the (encoding of the) architecture. After relaxation, our goal is to jointly learn the architecture α \alpha and the weights w w within all the mixed operations (e.g. weights of the convolution filters). Analogous to architecture search using RL ( Zoph & Le, 2017 ; Zoph et al., 2018 ; Pham et al., 2018b ) or evolution ( Liu et al., 2018b ; Real et al., 2018 ) where the validation set performance is treated as the reward or fitness, DARTS aims to optimize the validation loss, but using gradient descent. Denote by ℒ t ​ r ​ a ​ i ​ n \mathcal{L}_{train} and ℒ v ​ a ​ l \mathcal{L}_{val} the training and the validation loss, respectively. Both losses are determined not only by the architecture α \alpha , but also the weights w w in the network. The goal for architecture search is to find α ∗ \alpha^{*} that minimizes the validation loss ℒ v ​ a ​ l ​ ( w ∗ , α ∗ ) \mathcal{L}_{val}(w^{*},\alpha^{*}) , where the weights w ∗ w^{*} associated with the architecture are obtained by minimizing the training loss w ∗ = argmin w ​ ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ∗ ) w^{*}=\mathrm{argmin}_{w}\ \mathcal{L}_{train}(w,\alpha^{*}) . This implies a bilevel optimization problem ( Anandalingam & Friesz, 1992 ; Colson et al., 2007 ) with α \alpha as the upper-level variable and w w as the lower-level variable: The nested formulation also arises in gradient-based hyperparameter optimization ( Maclaurin et al., 2015 ; Pedregosa, 2016 ; Franceschi et al., 2018 ) , which is related in a sense that the architecture α \alpha could be viewed as a special type of hyperparameter, although its dimension is substantially higher than scalar-valued hyperparameters such as the learning rate, and it is harder to optimize.

<sub>§2.2 Continuous Relaxation and Optimization</sub>

### 4. Approximate Architecture Gradient

Evaluating the architecture gradient exactly can be prohibitive due to the expensive inner optimization. We therefore propose a simple approximation scheme as follows: where w w denotes the current weights maintained by the algorithm, and ξ \xi is the learning rate for a step of inner optimization. The idea is to approximate w ∗ ​ ( α ) w^{*}(\alpha) by adapting w w using only a single training step , without solving the inner optimization (equation 4 ) completely by training until convergence. Related techniques have been used in meta-learning for model transfer ( Finn et al., 2017 ) , gradient-based hyperparameter tuning ( Luketina et al., 2016 ) and unrolled generative adversarial networks ( Metz et al., 2017 ) . Note equation 6 will reduce to ∇ α ℒ v ​ a ​ l ​ ( w , α ) \nabla_{\alpha}\mathcal{L}_{val}(w,\alpha) if w w is already a local optimum for the inner optimization and thus ∇ w ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ) = 0 \nabla_{w}\mathcal{L}_{train}(w,\alpha)=0 . The iterative procedure is outlined in Alg. 1 . While we are not currently aware of the convergence guarantees for our optimization algorithm, in practice it is able to reach a fixed point with a suitable choice of ξ \xi 1 1 1 A simple working strategy is to set ξ \xi equal to the learning rate for w w ’s optimizer. . We also note that when momentum is enabled for weight optimisation, the one-step unrolled learning objective in equation 6 is modified accordingly and all of our analysis still applies. Applying chain rule to the approximate architecture gradient (equation 6 ) yields where w ′ = w − ξ ​ ∇ w ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ) w^{\prime}=w-\xi\nabla_{w}\mathcal{L}_{train}(w,\alpha) denotes the weights for a one-step forward model. The expression above contains an expensive matrix-vector product in its second term. Fortunately, the complexity can be substantially reduced using the finite difference approximation. Let ϵ \epsilon be a small scalar 2 2 2 We found ϵ = 0.01 / ‖ ∇ w ′ ℒ v ​ a ​ l ​ ( w ′ , α ) ‖ 2 \epsilon=0.01/\|\nabla_{w^{\prime}}\mathcal{L}_{val}(w^{\prime},\alpha)\|_{2} to be sufficiently accurate in all of our experiments. and w ± = w ± ϵ ​ ∇ w ′ ℒ v ​ a ​ l ​ ( w ′ , α ) w^{\pm}=w\pm\epsilon\nabla_{w^{\prime}}\mathcal{L}_{val}(w^{\prime},\alpha) . Then: Evaluating the finite difference requires only two forward passes for the weights and two backward passes for α \alpha , and the complexity is reduced from O ⁡ ( | α | ​ | w | ) O(|\alpha||w|) to O ⁡ ( | α | + | w | ) O(|\alpha|+|w|) .

<sub>§2.3 Approximate Architecture Gradient</sub>

### 5. First-order Approximation

When ξ = 0 \xi=0 , the second-order derivative in equation 7 will disappear. In this case, the architecture gradient is given by ∇ α ℒ v ​ a ​ l ​ ( w , α ) \nabla_{\alpha}\mathcal{L}_{val}(w,\alpha) , corresponding to the simple heuristic of optimizing the validation loss by assuming the current w w is the same as w ∗ ​ ( α ) w^{*}(\alpha) . This leads to some speed-up but empirically worse performance, according to our experimental results in Table 1 and Table 2 . In the following, we refer to the case of ξ = 0 \xi=0 as the first-order approximation, and refer to the gradient formulation with ξ > 0 \xi>0 as the second-order approximation.

<sub>§First-order Approximation</sub>

### 6. Deriving Discrete Architectures

To form each node in the discrete architecture, we retain the top- k k strongest operations (from distinct nodes) among all non-zero candidate operations collected from all the previous nodes. The strength of an operation is defined as exp ⁡ ( α o ( i , j ) ) ∑ o ′ ∈ 𝒪 exp ⁡ ( α o ′ ( i , j ) ) \frac{\exp(\alpha_{o}^{(i,j)})}{\sum_{o^{\prime}\in\mathcal{O}}\exp(\alpha_{o^{\prime}}^{(i,j)})} . To make our derived architecture comparable with those in the existing works, we use k = 2 k=2 for convolutional cells ( Zoph et al., 2018 ; Liu et al., 2018a ; Real et al., 2018 ) and k = 1 k=1 for recurrent cells ( Pham et al., 2018b ) . The zero operations are excluded in the above for two reasons. First, we need exactly k k non-zero incoming edges per node for fair comparison with the existing models. Second, the strength of the zero operations is underdetermined, as increasing the logits of zero operations only affects the scale of the resulting node representations, and does not affect the final classification outcome due to the presence of batch normalization ( Ioffe & Szegedy, 2015 ) .

<sub>§2.4 Deriving Discrete Architectures</sub>

## 总结与展望
DARTS 把离散的结构选择松弛成连续可微，本质上是把「搜索」换成了「优化」。它在这一页的作用是反例：我们面对的是离散的、一次性的补丁，没法松弛，所以那些依赖梯度的效率手段一个都用不上。

**It connects to**

- `1902.09635` — DARTS 的可复现性争议正是 NAS-Bench 系列要解决的问题。

## 不足之处
**What a reader should still not conclude**

- 它优化的是结构超参，不是「要不要保留一个版本」。
- 论文的失败模式（松弛间隙）与我们的失败模式（评估噪声）不同类。

---

# NAS-Bench-101: Towards Reproducible Neural Architecture Search

arXiv:1902.09635 · 2019 · [source](https://arxiv.org/html/1902.09635)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Many successes in deep learning ( Krizhevsky et al., 2012 ; Goodfellow et al., 2014 ; Sutskever et al., 2014 ) have resulted from novel neural network architecture designs. For example, in the field of image classification, research has produced numerous ways of combining neural network layers into unique architectures, such as Inception modules ( Szegedy et al., 2015 ) , residual connections ( He et al., 2016 ) , or dense connections ( Huang et al., 2017 ) . This proliferation of choices has fueled research into neural architecture search (NAS) , which casts the discovery of new architectures as an optimization problem ( Baker et al., 2017 ; Zoph & Le, 2016 ; Real et al., 2017 ; Elsken et al., 2019 ) . This has resulted in state of the art performance in the domain of image classification ( Zoph et al., 2018 ; Real et al., 2018 ; Huang et al., 2018 ) , and has shown promising results in other domains, such as sequence modeling ( Zoph & Le, 2016 ; So et al., 2019 ) .

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 The NASBench Dataset"]
  N1["§2.1 Architectures"]
  N2["§2.2 Cell encoding"]
  N3["§2.3 Combine semantics"]
  N4["§2.4 Training"]
  N5["§2.5 Metrics"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![(top-left) The outer skeleton of each model. (top-right) An Inception-like cell with the original 5x5 convolution approximated by two 3x3 convolutions (concatenation and projection operations omitted). (bottom-left) The cell that attained the lowest mean test error (projection layers omitted). (bottom-right) An example cell that demonstrates how channel counts are automatically determined (“+” denotes addition and “&” denotes concatenation; 1 × 1 1\times 1 projections are used to scale channel counts).](https://arxiv.org/html/1902.09635/1902.09635v2/skeleton.svg)

*(top-left) The outer skeleton of each model. (top-right) An Inception-like cell with the original 5x5 convolution approximated by two 3x3 convolutions (concatenation and projection operations omitted). (bottom-left) The cell that attained the lowest mean test error (projection layers omitted). (bottom-right) An example cell that demonstrates how channel counts are automatically determined (“+” denotes addition and “&” denotes concatenation; 1 × 1 1\times 1 projections are used to scale channel counts).*

<sub>figure: `1902.09635v2/skeleton.svg`</sub>

## 机制
### 1. The NASBench Dataset

The NAS-Bench-101 dataset is a table which maps neural network architectures to their training and evaluation metrics. Most NAS approaches to date have trained models on the CIFAR-10 classification set because its small images allow relatively fast neural network training. Furthermore, models which perform well on CIFAR-10 tend to perform well on harder benchmarks, such as ImageNet ( Krizhevsky et al., 2012 ) when scaled up ( Zoph et al., 2018 ) ). For these reasons, we also use CNN training on CIFAR-10 as the basis of NAS-Bench-101. We set L = 3 L=3 , using only the following operations: We limit the maximum number of edges to 9 9 .

<sub>§2 The NASBench Dataset</sub>

### 2. Architectures

Similar to other NAS approaches, we restrict our search for neural net topologies to the space of small feedforward structures, usually called cells , which we describe below. We stack each cell 3 times, followed by a downsampling layer, in which the image height and width are halved via max-pooling and the channel count is doubled. We repeat this pattern 3 times, followed by global average pooling and a final dense softmax layer. The initial layer of the model is a stem consisting of one 3 × 3 3\times 3 convolution with 128 128 output channels. See Figure 1 , top-left, for an illustration of the overall network structure. Note that having a stem followed by stacks of cells is a common pattern both in hand-designed image classifiers ( He et al., 2016 ; Huang et al., 2017 ; Hu et al., 2018 ) and in NAS search spaces for image classification. Thus, the variation in the architectures arises from variation in the cells. The space of cell architectures consists of all possible directed acyclic graphs on V V nodes, where each possible node has one of L L labels, representing the corresponding operation. Two of the vertices are specially labeled as operation IN and OUT , representing the input and output tensors to the cell, respectively. Unfortunately, this space of labeled DAGs grows exponentially in both V V and L L . In order to limit the size of the space to allow exhaustive enumeration, we impose the following constraints: All convolutions utilize batch normalization followed by ReLU. These constraints were chosen to ensure that the search space still contains ResNet-like and Inception-like cells ( He et al., 2016 ; Szegedy et al., 2016 ) . An example of an Inception-like cell is illustrated in Figure 1 , top-right. We intentionally use convolutions instead of separable convolutions to match the original designs of ResNet and Inception, although this comes as the cost of being more parameter-heavy than some of the more recent state-of-the-art architectures like AmoebaNet ( Real et al., 2018 ) .

<sub>§2.1 Architectures</sub>

### 3. Cell encoding

There are multiple ways to encode a cell and different encodings may favor certain algorithms by biasing the search space. For most of our experiments, we chose to use a very general encoding: a 7-vertex directed acyclic graph, represented by a 7 × 7 7\times 7 upper-triangular binary matrix, and a list of 5 labels, one for each of the 5 intermediate vertices (recall that the input and output vertices are fixed) Since there are 21 possible edges in the matrix and 3 possible operations for each label, there are 2 21 ∗ 3 5 ≈ 510 ​ M 2^{21}*3^{5}\approx 510M total unique models in this encoding. In Supplement S3 , we also discuss an alternative encoding. However, a large number of models in this space are invalid (i.e., there is no path from the input vertex, or the number of total edges exceeds 9). Furthermore, different graphs in this encoding may not be computationally unique. The method which we used to identify and enumerate unique graphs is described in Supplement S1 . After de-duplication, there are approximately 423k unique graphs in the search space.

<sub>§2.2 Cell encoding</sub>

### 4. Combine semantics

Translating from the graph to the corresponding neural network is straightforward, with one exception. When multiple edges point to the same vertex, the incoming tensors must be combined. Adding them or concatenating them are both standard techniques. To support both ResNet and Inception-like cells and to keep the space tractable, we adopted the following fixed rule: tensors going to the output vertex are concatenated and those going into other vertices are summed. The output tensors from the input vertex are projected in order to match the expected input channel counts of the subsequent operations. This is illustrated in Figure 1 , bottom-right.

<sub>§2.3 Combine semantics</sub>

### 5. Training

The training procedure forms an important part of an architecture search benchmark, since different training procedures can lead to very substantial performance differences. To counter this issue and allow comparisons of NAS algorithms on equal grounds, we designed and open-sourced a single general training pipeline for all models in the dataset. Choice of hyperparameters. We utilize a single, fixed set of hyperparameters for all NAS-Bench-101 models. This set of hyperparameters was chosen to be robust across different architectures by performing a coarse grid search optimizing the average accuracy of a set of 50 randomly-sampled architectures from the space. This is similar to standard practice in the literature ( Zoph et al., 2018 ; Liu et al., 2018a ; Real et al., 2018 ) and is further justified by our experimental analysis in Section 5.1 . Implementation details. All models are trained and evaluated on CIFAR-10 (40k training examples, 10k validation examples, 10k testing examples), using standard data augmentation techniques ( He et al., 2016 ) . The learning rate is annealed via cosine decay ( Loshchilov & Hutter, 2017 ) to 0 in order to reduce the variance between multiple independent training runs. Training is performed via RMSProp ( Tieleman & Hinton, 2012 ) on the cross-entropy loss with L2 weight decay. All models were trained on the TPU v2 accelerator. The code, implemented in TensorFlow, along with all chosen hyperparameters, is publicly available at https://github.com/google-research/nasbench . 3 repeats and 4 epoch budgets. We repeat the training and evaluation of all architectures 3 times to obtain a measure of variance. Also, in order to allow the evaluation of multi-fidelity optimization methods, e.g. , Hyperband ( Li et al., 2018 ) ), we trained all our architectures with four increasing epoch budgets: E stop ∈ { E max / 3 3 , E max / 3 2 , E max / 3 , E max } = { 4 , 12 , 36 , 108 } E_{\mathrm{stop}}\in\{E_{\mathrm{max}}/3^{3},E_{\mathrm{max}}/3^{2},E_{\mathrm{max}}/3,E_{\mathrm{max}}\}=\{4,12,36,108\} epochs. In each case, the learning rate is annealed to 0 by epoch E stop E_{\mathrm{stop}} . 2 2 2 Instead of 4 epoch budgets, we could have trained single long runs and used the performance at intermediate checkpoints as benchmarking data for early stopping algorithms. However, because of the learning rate schedule, such checkpoints would have occurred when the learning rates are still high, leading to noisy accuracies that do not correlate well with the final performance. We thus trained 3 × 423 ​ k ∼ 1.27 ​ M 3\times 423k\sim 1.27M models for each value of E stop E_{\mathrm{stop}} , and thus 4 × 1.27 ​ M ∼ 5 ​ M 4\times 1.27M\sim 5M models overall.

<sub>§2.4 Training</sub>

### 6. Metrics

We evaluated each architecture A A after training three times with different random initializations, and did this for each of the 4 4 budgets E stop E_{\mathrm{stop}} above. As a result, the dataset is a mapping from the ( A , E stop , 𝚝𝚛𝚒𝚊𝚕 ​ # ) (A,E_{\mathrm{stop}},\mathtt{trial\#}) to the following quantities: Only metrics on the training and validation set should be used to search models within a single NAS algorithm, and testing accuracy should only be used for an offline evaluation. The training time metric allows benchmarking algorithms that optimize for accuracy while operating under a time limit (Section 4 ) and also allows the evaluation of multi-objective optimization methods. Other metrics that do not require retraining can be computed using the released code.

<sub>§2.5 Metrics</sub>

## 总结与展望
NAS-Bench-101 是第一个大规模可查询的架构真值表，它让「同一算法不同种子差异多大」这类问题第一次有了廉价答案。我们在 R2 里反复引用的「单次观测不可排序」，在这类工作里是作为实验基础设施被解决的——这也是我们最缺的那块。

**It connects to**

- `2001.00326` — 同类查表基准，覆盖的搜索空间不同。

## 不足之处
**What a reader should still not conclude**

- 查表给的是确定性评估的真值，真实 LLM 评估的随机性它不建模。

---

# Tune: A Research Platform for Distributed Model Selection and Training

arXiv:1807.05118 · 2018 · [source](https://arxiv.org/html/1807.05118)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Machine learning pipelines are growing in complexity and cost. In particular, the model selection stage, which includes model training and hyperparameter tuning, can take the majority of a machine learning practitioner’s time and consume vast amounts of computational resources. Take for example a researcher aiming to train ResNet-101, a convolutional neural-network model with millions of parameters. Training this model can take around 24 hours on a single GPU, and performing model selection sequentially will take weeks to complete. Naturally, one would be inclined to train the model on a cluster in a distributed fashion ( Goyal et al. (2017) ) and utilize many machines to perform model selection in parallel.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Tune API"]
  N1["§4.1 User API"]
  N2["§4.2 Scheduler API"]
  N3["§4.3 Putting it together"]
  N4["§4.3.1 Scaling computation"]
  N5["§4.3.2 Data input"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
```

![Tune provides narrow-waist interfaces that training scripts can implement with a few lines of code changes. Once done, this enables the use of Tune for experiment management, result visualization, and a choice of trial scheduling strategies. This narrow interface also enables AutoML researchers to easily swap out different search algorithms for comparison, or release distributed implementations of new algorithms without needing to worry about distributed scaffolding.](https://arxiv.org/html/1807.05118/1807.05118v1/tune_api.svg)

*Tune provides narrow-waist interfaces that training scripts can implement with a few lines of code changes. Once done, this enables the use of Tune for experiment management, result visualization, and a choice of trial scheduling strategies. This narrow interface also enables AutoML researchers to easily swap out different search algorithms for comparison, or release distributed implementations of new algorithms without needing to worry about distributed scaffolding.*

<sub>figure: `1807.05118v1/tune_api.svg`</sub>

## 机制
### 1. Tune API

Tune provides two development interfaces: a user API for users seeking to train models and a scheduling API for researchers interested in improving the model search process itself. As a consequence of this division, users of Tune have a choice of many search algorithms. Symmetrically, the scheduler API enables researchers to easily target a diverse range of workloads and provides a mechanism for making their algorithms available to users. [Function-based API] {subfigure} [Class-based API] Early stop a trial that is not performing well based on its intermediate results. Adjust the annealing of hyperparameters such as learning rate. Clone the parameters of a promising trial and launch additional trials that explore the nearby hyperparameter space. Query a shared database of trial results to choose promising hyperparameters. Prioritize resource allocation between a large number of trials, more than can run concurrently given available resources.

<sub>§4 Tune API</sub>

### 2. User API

Model training scripts are commonly implemented as a loop over a model improvement step, with results periodically logged to the console (e.g., every training epoch). To support the full range of model search algorithms, Tune requires access to intermediate training results, the ability to snapshot training state, and also the ability to alter hyperparameters in the middle of training. These requirements can be met with minimal modifications to existing user code via a cooperative control model. Consider a typical model training script as shown in 2 . A handle to Tune is passed into the function. To integrate with Tune, the model and optimizer hyperparameters are pulled from the tune.params map, checkpoints are created when tune.should_checkpoint() returns positive, and the saved checkpoint file is passed to tune.record_checkpoint() . Intermediate results are reported via tune.report() . These cooperative calls enable Tune scheduling algorithms to monitor the training progress of each trial (via the reported metrics), save and clone promising parameters (via checkpoint and restore), and alter hyperparameters at runtime (by restoring a checkpoint with a changed hyperparameter map). Critically, these calls require minimal changes to existing user code. Tune can also directly control trial execution if the user extends the trainable model class (Figure 2 ). Here, training steps, checkpointing, and restore are implemented as class methods which Tune schedulers call to incrementally train models. This mode of execution has some debuggability advantages over cooperative control; we offer both to users. Internally, Tune inserts adapters over the cooperative interface to provide a facade of direct control to trial schedulers.

<sub>§4.1 User API</sub>

### 3. Scheduler API

Given the ability to create trials and control their execution, the next question is how trials should be scheduled. Tune’s trial schedulers operate over a set of possible trials to run, prioritizing trial execution given available cluster resources. In addition, they can add to the list of trials to execute (e.g., based on suggestions from HyperOpt). The simplest trial scheduler executes trials sequentially, running each until a stopping condition is met. Trials are launched in parallel when sufficient resources are available in the cluster. However, this is not all trial schedulers can do. They can: The primary interface for a trial scheduler is as follows: The interface is event based. When Tune has resources available, it calls scheduler.choose_trial_to_run() to get a trial to launch on the cluster. As results for the trial become available, the scheduler.on_result() callback is invoked and the scheduler returns an flag indicating whether to continue, checkpoint, stop, or restart a trial with an updated hyperparameter configuration. This interface is sufficient to provide a broad range of hyperparameter tuning algorithms including Median Stopping Rule ( Golovin et al. (2017) ), Bayesian Optimization approaches ( Bergstra et al. (2013) ), HyperBand ( Li et al. (2016) ), and Population-based Training ( Jaderberg et al. (2017) ). We note that Tune keeps the metadata for active trials in memory and relies on checkpoints for fault tolerance. This drastically simplifies the design of trial schedulers and is not a limitation in practice. Trial scheduler implementations are free to leverage external storage if necessary.

<sub>§4.2 Scheduler API</sub>

### 4. Putting it together

To launch an experiment, the user must specify their model training function or class (Figures 1 and 2 ), an initial set of trials, and a trial scheduler. The following is a minimal example: Here, we use Tune’s built-in DSL to specify a small 3 × 2 3\times 2 grid search over two hyperparameters. These serve as the initial set of trials input to the scheduler. Tune’s parameter DSL offers features similar to those provided by HyperOpt ( Bergstra et al. (2013) ). Alternatively, users can generate the list of initial trial configurations with the mechanism of their choice. Once an experiment is launched, the progress of trials is periodically reported in the console and can also be viewed through integrations such as TensorBoard.

<sub>§4.3 Putting it together</sub>

### 5. Scaling computation

Each trial in Tune runs in its own Python process, and can be allocated given number of CPU and GPU resources through Ray. Individual trials can themselves leverage distributed computation by launching further subprocesses using Ray APIs. These child processes can coordinate with each other using Ray to e.g., perform SGD, or use collective communication primitives provided by libraries such as torch.distributed and Nvidia NCCL.

<sub>§4.3.1 Scaling computation</sub>

### 6. Data input

Since each trial in Tune runs as a Ray task or actor, they can use Ray APIs to handle data ingest. For example, weights can be broadcast to all workers using ray.put(obj) to the Ray object store, and retrieved via ray.get(obj_id) during trial initialization.

<sub>§4.3.2 Data input</sub>

## 总结与展望
Tune 是 Ray 里的分布式调参平台，它的价值不在算法而在工程约束：把「试验、检查点、调度」抽象出来之后，早停才可能真的省下资源。这句话反过来读就是我们的现状——没有检查点与调度，砍掉候选并不真的把资源还回去。

**It connects to**

- `1810.05934` — ASHA 是跑在类似平台上的算法。

## 不足之处
**What a reader should still not conclude**

- 系统论文不报告算法效果，只报告吞吐与容错。
- 它的资源模型是 CPU/GPU 时间，我们的单位是钱与 token。

---

# Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning

arXiv:1801.01596 · 2018 · [source](https://arxiv.org/html/1801.01596)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
We have been witnessing the breakthrough brought by deep learning in various research topics: Computer vision, natural language processing, and speech recognition; and the significant impact on many industries: Augmented reality, self driving cars, and smart home devices, to name a few. However, the design of deep neural networks usually requires huge amount of efforts even for experienced deep learning researchers and practitioners, due to the high complexity involved in nature with these deep neural networks (for example, some modern deep neural networks may even have thousands of layers). What makes the adoption and application of a deep learning based solution even more complex is that (1) all feasible hyperparameter configurations form a huge space, from which we need to choose the optimal case, and that (2) evaluating even a single hyperparameter configuration point in the space is often very time consuming (i.e., training one deep neural network using modern GPU usually takes hours, days, or even weeks).

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Methodology"]
  N1["§2.1 Hyperband"]
  N2["§2.2 Bayesian Optimization"]
  N3["§2.3 Combination of Hyperband and Bayesian Optimization"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
```

![Average accuracy across 10 trials for LeNet on MNIST.](https://arxiv.org/html/1801.01596/1801.01596v1/mnist_comparison-10T.png)

*Average accuracy across 10 trials for LeNet on MNIST.*

<sub>figure: `1801.01596v1/mnist_comparison-10T.png`</sub>

## 机制
### 1. Methodology

In this section, we present our core algorithm. We first briefly review the critical ideas that are helpful for understanding our combination approach, respectively in Hyperband algorithm and Bayesian optimization. Then we illustrate in details why and how we combine them together.

<sub>§2 Methodology</sub>

### 2. Hyperband

The essential idea of Hyperband is to allocate more resources to more promising hyperparameter configurations. First, it initializes a set of n {n} trial points (each trial point corresponding to one hyperparameter configuration). Then, it uniformly allocates a budget to each trial point, and evaluates its performance (i.e., objective function) given that budget. A proportion of trial points with worse performance are deemed as to be less promising, and thus are removed from the set (namely, now there are less trial points in the set). This procedure repeats several rounds until only a single trial point remains in the set. This idea is based on the assumption that a trial point’s performance obtained at earlier rounds is a good indicator of its final performance. Apparently, the more resources each trial point is allocated, the more reliable this indicator is. Given a total finite budget B B of resources, roughly each trial point is allocated B / n B/n resources. If a large n n is used, each trial point would be allocated less resources, thus earlier rounds performance may not reflect well the final performance. On the contrary, if a small n n is used, although each trial point is more likely to be allocated sufficient resources to reflect its final performance, the algorithm would suffer from a pool of less candidates. To alleviate this dilemma, Hyperband actually tries out different values for n n , and returns the best hyperparameter configuration among them. Hyperband algorithm is presented in Algorithm 1 (see [ 7 ] for details). The function g ​ e ​ t ​ _ ​ h ​ y ​ p ​ e ​ r ​ p ​ a ​ r ​ a ​ m ​ e ​ t ​ e ​ r ​ _ ​ c ​ o ​ n ​ f ​ i ​ g ​ u ​ r ​ a ​ t ​ i ​ o ​ n ​ ( n ) get\_hyperparameter\_configuration(n) returns a set of n n i.i.d. trial points from the predefined configuration space. The function r ​ u ​ n ​ _ ​ t ​ h ​ e ​ n ​ _ ​ r ​ e ​ t ​ u ​ r ​ n ​ _ ​ o ​ b ​ j ​ _ ​ v ​ a ​ l ​ ( x , r ) run\_then\_return\_obj\_val(x,r) first trains the trial point x x with r r amount of resources, and then returns the objective function value f ⁡ ( x ) f(x) evaluated after training. And the function t ​ o ​ p ​ _ ​ k ​ ( t ​ r ​ i ​ a ​ l ​ s , o ​ b ​ j ​ _ ​ v ​ a ​ l ​ s , k ) top\_k(trials,obj\_vals,k) first ranks all the input t ​ r ​ i ​ a ​ l ​ s trials according to their objective function value o ​ b ​ j ​ _ ​ v ​ a ​ l ​ s obj\_vals , and then returns the top k k performing trial points.

<sub>§2.1 Hyperband</sub>

### 3. Bayesian Optimization

The main idea of Bayesian optimization is as follows. Since evaluating the objective function f f for a trial point x x is very expensive, it approximates f f using a probabilistic surrogate model that is much cheaper to evaluate, and it is an iterative process: (1) The algorithm samples the next trial point x t + 1 x_{t+1} according to the current surrogate model. (2) It evaluates f ⁡ ( x t + 1 ) f(x_{t+1}) . (3) It updates the surrogate model based on the new data point ( x t + 1 , f ⁡ ( x t + 1 ) ) (x_{t+1},f(x_{t+1})) , and goes back to step (1). Bayesian optimization samples trial points sequentially, and each trial point is sampled utilizing all the information in the history (reflected by the built surrogate model). Namely, what will be sampled next is actually determined by all of those sampled previously. Bayesian optimization is presented in Algorithm 2 . On line 3 , the next trial point is sampled at the place optimizing an acquisition function μ ⁡ ( x | D t ) \mu(x|D_{t}) . The expected improvement in Equation 1 is usually used as the acquisition function in the literature, where x + x^{+} is the trial point with the best objective function value found in the first t t steps. Note that the expected improvement acquisition function favors points with high variance and high mean value. Namely, it balances between exploration of the not well explored regions and exploitation of the visited regions, in the configuration space. In particular, two types of probabilistic models have been proposed as the surrogate to compute the expectation in Equation 1 . Discriminative models like Gaussian process (GP) directly models p ⁡ ( f ⁡ ( x ) | x ) p(f(x)|x) , while generative models like Tree-structured Parzen Estimator (TPE) models p ⁡ ( x | f ⁡ ( x ) ) p(x|f(x)) and p ⁡ ( f ⁡ ( x ) ) p(f(x)) . As reported [ 1 ] , TPE achieves better results than GP.

<sub>§2.2 Bayesian Optimization</sub>

### 4. Combination of Hyperband and Bayesian Optimization

Although both Hyperband and Bayesian Optimization are very powerful, each has its own strength and weakness. We observe that the two approaches are actually complementary to each other, namely, the weakness of one is the strength of the other, and vice versa, as illustrated next. Therefore, we propose to combine them together to obtain an enhanced hyperparameter optimization algorithm. More specifically, on one hand, all the trial points in Hyperband are sampled independently. However, once a trial point x x is sampled and the objective function f ⁡ ( x ) f(x) at that trial point is evaluated, this data point ( x , f ⁡ ( x ) ) (x,f(x)) tells us something about how our objective function behaves on the configuration space. Intuitively, if f ⁡ ( x ) f(x) is a bad one, we should avoid sample trial points near x x subsequently; otherwise, we should consider sampling more trial points near x x . Note that it is only reasonable to take these actions under the condition that the objective function is smooth over the configuration space, which is usually a weak assumption (i.e., easy to be satisfied) for a wide spectrum of hyperparameter optimization problems encountered in deep learning. Each trial point in Hyperband is sampled independently from all the trial points sampled previously, thus it fails to utilize the lessons learned in the history, which may result into wasting precious time on repeating errors that already happened in history. On the other hand, in Bayesian optimization, each trial point x x is allocated sufficient resources to obtain the final objective function value f ⁡ ( x ) f(x) . In deep learning, allocating sufficient resources to a single trial point usually means training a deep neural network to convergence, which may take hours, days, or even weeks using modern GPU. In this case, one cannot afford allocating whatever amount of resources required by a single trial point to obtain its final objective function value, without knowing in advance that this value is likely to be the best one among those of all the trial points. From the above analysis of the weakness of each approach, we see that they are actually perfectly complementary to each other. Trial points in Hyperband should be sampled sequentially, and each trial point should be sampled according to the experience obtained at all previously sampled and evaluated trial points, which is exactly how Bayesian optimization works. An early stopping like mechanism as used in Hyperband should be adopted in Bayesian optimization, so that trials points that are already worse than other trial points at early rounds should be abandoned, since their final performance is also less likely to be the best among all. We propose to combine Hyperband and Bayesian optimization in a straightforward manner as follows. We generally follow the process of Hyperband algorithm. However, the only difference is that, instead of sampling all n n trial points independently at once as in Hyperband, in our combination approach, we sample trial points one by one using Bayesian optimization. More specifically, in each first round of hyperband (on different initial value of n n ), once a trial point x t + 1 x_{t+1} is sampled, its intermediate performance f ⁡ ( x t + 1 ) f(x_{t+1}) given the current allocated resources r 0 r_{0} is evaluated. This new data point ( x t + 1 , f ⁡ ( x t + 1 ) ) (x_{t+1},f(x_{t+1})) contributes to updating the surrogate probabilistic model in Bayesian optimization, based on which the next trial point will be sampled. As illustrated in Algorithm 3 , the bulk of our combination algorithm is very similar to Hyperband in Algorithm 1 , and the major difference is from line 9 to line 16 , which are basically Bayesian optimization in Algorithm 2 .

<sub>§2.3 Combination of Hyperband and Bayesian Optimization</sub>

## 总结与展望
这篇把 Hyperband 的调度与贝叶斯优化的采样拼在一起，做法上是 BOHB 的前身。放在这一页是为了区分两件常被混为一谈的事：调度决定「给谁多少预算」，采样决定「下一个试谁」；我们的 loop 只有前者的一小部分，后者完全靠固定的四种变异。

**It connects to**

- `1807.01774` — 同一思路的更成熟实现。

## 不足之处
**What a reader should still not conclude**

- 论文的采样模型建立在低维连续超参上，我们的提案是结构化的链版本。
