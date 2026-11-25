# Library: r3-budget-stop

Built from arXiv HTML bodies on 2026-11-25. 19 work(s).

| work | year | mechanism points | figure | cited by | summary |
| --- | --- | --- | --- | --- | --- |
| [BOHB: Robust and Efficient Hyperparameter Optimization at Scale](https://arxiv.org/abs/1807.01774) | 2018 | 7 | yes | 0 | yes |
| [Tune: A Research Platform for Distributed Model Selection and Training](https://arxiv.org/abs/1807.05118) | 2018 | 6 | yes | 1 | yes |
| [The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783) | 2024 | 14 | yes | 0 | yes |
| [Freeze-Thaw Bayesian Optimization](https://arxiv.org/abs/1406.3896) | 2014 | 5 | yes | 3 | yes |
| [Massively parallel hyperparameter tuning](https://arxiv.org/abs/1810.05934) | 2018 | 3 | yes | 1 | yes |
| [ReAct : Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) | 2023 | 11 | yes | 1 | yes |
| [Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168) | 2021 | 3 | yes | 1 | yes |
| [GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning](https://arxiv.org/abs/2507.19457) | 2026 | 2 | yes | 0 | yes |
| [Multi-fidelity Bayesian Optimisation with Continuous Approximations](https://arxiv.org/abs/1703.06240) | 2017 | 2 | yes | 1 | yes |
| [NAS-Bench-201: Extending the Scope of Reproducible Neural Architecture Search](https://arxiv.org/abs/2001.00326) | 2020 | 5 | yes | 1 | yes |
| [AlphaEvolve : A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131) | 2025 | 10 | yes | 0 | yes |
| [Model-based Asynchronous Hyperparameter and Neural Architecture Search](https://arxiv.org/abs/2003.10865) | 2020 | 2 | yes | 0 | yes |
| [AlphaX: eXploring Neural Architectures with Deep Neural Networks and Monte Carlo Tree Search](https://arxiv.org/abs/1903.11059) | 2019 | 6 | yes | 0 | yes |
| [Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets](https://arxiv.org/abs/1605.07079) | 2016 | 9 | yes | 0 | yes |
| [Hyperparameter Optimization: Foundations, Algorithms, Best Practices and Open Challenges](https://arxiv.org/abs/2107.05847) | 2021 | 11 | yes | 0 | yes |
| [Regularized Evolution for Image Classifier Architecture Search](https://arxiv.org/abs/1802.01548) | 2018 | 5 | yes | 4 | yes |
| [DARTS: Differentiable Architecture Search](https://arxiv.org/abs/1806.09055) | 2018 | 6 | yes | 1 | yes |
| [NAS-Bench-101: Towards Reproducible Neural Architecture Search](https://arxiv.org/abs/1902.09635) | 2019 | 6 | yes | 2 | yes |
| [Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning](https://arxiv.org/abs/1801.01596) | 2018 | 4 | yes | 1 | yes |

Summaries written: 19 of 19

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

![Illustration of typical results obtained, here for optimizing six hyperparameters of a neural network. We show the immediate regret of the best configuration found by 4 methods as a function of time. Hyperband has strong anytime performance, but for larger budgets does not perform much better than random search. In contrast, Bayesian optimization starts slowly (like random search), but given enough time outperforms Hyperband. Our new method BOHB achieves the best of both worlds, starting fast and also converging to the global optimum quickly.](https://arxiv.org/html/1807.01774v1/moneyshot.svg)

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

![Tune provides narrow-waist interfaces that training scripts can implement with a few lines of code changes. Once done, this enables the use of Tune for experiment management, result visualization, and a choice of trial scheduling strategies. This narrow interface also enables AutoML researchers to easily swap out different search algorithms for comparison, or release distributed implementations of new algorithms without needing to worry about distributed scaffolding.](https://arxiv.org/html/1807.05118v1/tune_api.svg)

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

# The Llama 3 Herd of Models

arXiv:2407.21783 · 2024 · [source](https://arxiv.org/html/2407.21783)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Foundation models are general models of language, vision, speech, and/or other modalities that are designed to support a large variety of AI tasks. They form the basis of many modern AI systems.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 Pre-Training"]
  N1["§3.1 Pre-Training Data"]
  N2["§3.1.1 Web Data Curation"]
  N3["§3.1.2 Determining the Data Mix"]
  N4["§3.1.3 Annealing Data"]
  N5["§3.2 Model Architecture"]
  N6["§3.2.1 Scaling Laws"]
  N7["§3.3 Infrastructure, Scaling, and Efficiency"]
  N8["§3.3.1 Training Infrastructure"]
  N9["§3.3.2 Parallelism for Model Scaling"]
  N10["§3.3.3 Collective Communication"]
  N11["§3.3.4 Reliability and Operational Challenges"]
  N12["§3.4 Training Recipe"]
  N13["§3.4.1 Initial Pre-Training"]
  N14["§3.4.2 Long Context Pre-Training"]
  N15["§3.4.3 Annealing"]
  N16["§4 Post-Training"]
  N17["§4.1 Modeling"]
  N18["§4.1.1 Chat Dialog Format"]
  N19["§4.1.2 Reward Modeling"]
  N20["§4.1.3 Supervised Finetuning"]
  N21["§4.1.4 Direct Preference Optimization"]
  N22["§4.1.5 Model Averaging"]
  N23["§4.1.6 Iterative Rounds"]
  N24["§4.2 Post-training Data"]
  N25["§4.2.1 Preference Data"]
  N26["§4.2.2 SFT Data"]
  N27["§4.2.3 Data Processing and Quality Control"]
  N28["§4.3 Capabilities"]
  N29["§4.3.1 Code"]
  N30["§4.3.2 Multilinguality"]
  N31["§4.3.3 Math and Reasoning"]
  N32["§4.3.4 Long Context"]
  N33["§4.3.5 Tool Use"]
  N34["§4.3.6 Factuality"]
  N35["§4.3.7 Steerability"]
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
```

![Illustration of the overall architecture and training of Llama 3. Llama 3 is a Transformer language model trained to predict the next token of a textual sequence. See text for details.](https://arxiv.org/html/2407.21783v3/llama3_language_architecture.svg)

*Illustration of the overall architecture and training of Llama 3. Llama 3 is a Transformer language model trained to predict the next token of a textual sequence. See text for details.*

<sub>figure: `2407.21783v3/llama3_language_architecture.svg`</sub>

## 机制
### 1. Pre-Training

Language model pre-training involves: (1) the curation and filtering of a large-scale training corpus, (2) the development of a model architecture and corresponding scaling laws for determining model size, (3) the development of techniques for efficient pre-training at large scale, and (4) the development of a pre-training recipe. We present each of these components separately below. URL-level de-duplication. We perform URL-level de-duplication across the entire dataset. We keep the most recent version for pages corresponding to each URL. Document-level de-duplication. We perform global MinHash ( Broder, 1997 ) de-duplication across the entire dataset to remove near duplicate documents. Line-level de-duplication. We perform aggressive line-level de-duplication similar to ccNet ( Wenzek et al., 2019 ) . We remove lines that appeared more than 6 times in each bucket of 30M documents. Although our manual qualitative analysis showed that the line-level de-duplication removes not only leftover boilerplate from various websites such as navigation menus, cookie warnings, but also frequent high-quality text, our empirical evaluations showed strong improvements. We use duplicated n-gram coverage ratio ( Rae et al., 2021 ) to remove lines that consist of repeated content such as logging or error messages. Those lines could be very long and unique, hence cannot be filtered by line-dedup. We use “dirty word” counting ( Raffel et al., 2020 ) to filter out adult websites that are not covered by domain block lists. We use a token-distribution Kullback-Leibler divergence to filter out documents containing excessive numbers of outlier tokens compared to the training corpus distribution. We use a fasttext -based language identification model to categorize documents into 176 languages. We perform document-level and line-level de-duplication within data for each language. We apply language-specific heuristics and model-based filters to remove low-quality documents. We use grouped query attention (GQA; Ainslie et al. (2023) ) with 8 key-value heads to improve inference speed and to reduce the size of key-value caches during decoding. We use an attention mask that prevents self-attention between different documents within the same sequence. We find that this change had limited impact during in standard pre-training, but find it to be important in continued pre-training on very long sequences. We use a vocabulary with 128K tokens. Our token vocabulary combines 100K tokens from the tiktoken 3 3 3 https://github.com/openai/tiktoken/tree/main tokenizer with 28K additional tokens to better support non-English languages. Compared to the Llama 2 tokenizer, our new tokenizer improves compression rates on a sample of English data from 3.17 to 3.94 characters per token. This enables the model to “read” more text for the same amount of training compute. We also found that adding 28K tokens from select non-English languages improved both compression ratios and downstream performance, with no impact on English tokenization. We increase the RoPE base frequency hyperparameter to 500,000. This enables us to better support longer contexts; Xiong et al. (2023) showed this value to be effective for context lengths up to 32,768. We first establish a correlation between the compute-optimal model’s negative log-likelihood on downstream tasks and the training FLOPs. Next, we correlate the negative log-likelihood on downstream tasks with task accuracy, utilizing both the scaling law models and older models trained with higher compute FLOPs. In this step, we specifically leverage the Llama 2 family of models. Network topology. Our RoCE-based AI cluster comprises 24K GPUs 5 5 5 Note that we use only up to 16K of these 24K GPUs for Llama 3 pre-training. connected by a three-layer Clos network ( Lee et al., 2024 ) . At the bottom layer, each rack hosts 16 GPUs split between two servers and connected by a single Minipack2 top-of-the-rack (ToR) switch. In the middle layer, 192 such racks are connected by Cluster Switches to form a pod of 3,072 GPUs with full bisection bandwidth, ensuring no oversubscription. At the top layer, eight such pods within the same datacenter building are connected via Aggregation Switches to form a cluster of 24K GPUs. However, network connectivity at the aggregation layer does not maintain full bisection bandwidth and instead has an oversubscription ratio of 1:7. Our model parallelism methods (see Section 3.3.2 ) and training job scheduler ( Choudhury et al., 2024 ) are all optimized to be aware of network topology, aiming to minimize network communication across pods. Load balancing. LLM training produces fat network flows that are hard to load balance across all available network paths using traditional methods such as Equal-Cost Multi-Path (ECMP) routing. To address this challenge, we employ two techniques. First, our collective library creates 16 network flows between two GPUs, instead of just one, thereby reducing the traffic per flow and providing more flows for load balancing. Second, our Enhanced-ECMP (E-ECMP) protocol effectively balances these 16 flows across different network paths by hashing on additional fields in the RoCE header of packets. Congestion control. We use deep-buffer switches in the spine ( Gangidi et al., 2024 ) to accommodate transient congestion and buffering caused by collective communication patterns. This setup helps limit the impact of persistent congestion and network back pressure caused by slow servers, which is common in training. Finally, better load balancing through E-ECMP significantly reduces the chance of congestion. With these optimizations, we successfully run a 24K GPU cluster without traditional congestion control methods such as Data Center Quantized Congestion Notification (DCQCN). Batch size constraint. Current implementations have constraints on supported batch size per GPU, requiring it to be divisible by the number of pipeline stages. For the example in Figure 6 , the depth-first schedule (DFS) of pipeline parallelism ( Narayanan et al., 2021 ) requires N = PP = 4 N=\textrm{PP}=4 , while the breadth-first schedule (BFS; Lamy-Poirier (2023) ) requires N = M N=M , where M M is the total number of micro-batches and N N is the number of contiguous micro-batches for the same stage’s forward or backward. However, pre-training often needs flexibility to adjust batch size. Memory imbalance. Existing pipeline parallelism implementations lead to imbalanced resource consumption. The first stage consumes more memory due to the embedding and the warm-up micro-batches. Computation imbalance. After the last layer of the model, we need to calculate output and loss, making this stage the execution latency bottleneck.

<sub>§3 Pre-Training</sub>

### 2. Pre-Training Data / Web Data Curation

We create our dataset for language model pre-training from a variety of data sources containing knowledge until the end of 2023. We apply several de-duplication methods and data cleaning mechanisms on each data source to obtain high-quality tokens. We remove domains that contain large amounts of personally identifiable information (PII), and domains with known adult content. Much of the data we utilize is obtained from the web and we describe our cleaning process below. PII and safety filtering. Among other mitigations, we implement filters designed to remove data from websites are likely to contain unsafe content or high volumes of PII, domains that have been ranked as harmful according to a variety of Meta safety standards, and domains that are known to contain adult content. Text extraction and cleaning. We process the raw HTML content for non-truncated web documents to extract high-quality diverse text. To do so, we build a custom parser that extracts the HTML content and optimizes for precision in boilerplate removal and content recall. We evaluate our parser’s quality in human evaluations, comparing it with popular third-party HTML parsers that optimize for article-like content, and found it to perform favorably. We carefully process HTML pages with mathematics and code content to preserve the structure of that content. We maintain the image alt attribute text since mathematical content is often represented as pre-rendered images where the math is also provided in the alt attribute. We experimentally evaluate different cleaning configurations. We find markdown is harmful to the performance of a model that is primarily trained on web data compared to plain text, so we remove all markdown markers. De-duplication. We apply several rounds of de-duplication at the URL, document, and line level: Heuristic filtering. We develop heuristics to remove additional low-quality documents, outliers, and documents with excessive repetitions. Some examples of heuristics include: Model-based quality filtering. Further, we experiment with applying various model-based quality classifiers to sub-select high-quality tokens. These include using fast classifiers such as fasttext ( Joulin et al., 2017 ) trained to recognize if a given text would be referenced by Wikipedia ( Touvron et al., 2023a ) , as well as more compute-intensive Roberta-based classifiers ( Liu et al., 2019a ) trained on Llama 2 predictions. To train a quality classifier based on Llama 2, we create a training set of cleaned web documents, describe the quality requirements, and instruct Llama 2’s chat model to determine if the documents meets these requirements. We use DistilRoberta ( Sanh et al., 2019 ) to generate quality scores for each document for efficiency reasons. We experimentally evaluate the efficacy of various quality filtering configurations. Code and reasoning data. Similar to DeepSeek-AI et al. (2024) , we build domain-specific pipelines that extract code and math-relevant web pages. Specifically, both the code and reasoning classifiers are DistilRoberta models trained on web data annotated by Llama 2. Unlike the general quality classifier mentioned above, we conduct prompt tuning to target web pages containing math deduction, reasoning in STEM areas and code interleaved with natural language. Since the token distribution of code and math is substantially different than that of natural language, these pipelines implement domain-specific HTML extraction, customized text features and heuristics for filtering. Multilingual data. Similar to our processing pipelines for English described above, we implement filters to remove data from websites that are likely to contain PII or unsafe content. Our multilingual text processing pipeline has several unique features: In addition, we perform quality ranking of multilingual documents using a multilingual Llama 2-based classifier to ensure that high-quality content is prioritized. We determine the amount of multilingual tokens used in pre-training experimentally, balancing model performance on English and multilingual benchmarks.

<sub>§3.1 Pre-Training Data · §3.1.1 Web Data Curation</sub>

### 3. Determining the Data Mix / Annealing Data / Model Architecture

To obtain a high-quality language model, it is essential to carefully determine the proportion of different data sources in the pre-training data mix. Our main tools in determining this data mix are knowledge classification and scaling law experiments. Knowledge classification. We develop a classifier to categorize the types of information contained in our web data to more effectively determine a data mix. We use this classifier to downsample data categories that are over-represented on the web, for example, arts and entertainment. Scaling laws for data mix. To determine the best data mix, we perform scaling law experiments in which we train several small models on a data mix and use that to predict the performance of a large model on that mix (see Section 3.2.1 ). We repeat this process multiple times for different data mixes to select a new data mix candidate. Subsequently, we train a larger model on this candidate data mix and evaluate the performance of that model on several key benchmarks. Data mix summary. Our final data mix contains roughly 50% of tokens corresponding to general knowledge, 25% of mathematical and reasoning tokens, 17% code tokens, and 8% multilingual tokens. Empirically, we find that annealing (see Section 3.4.3 ) on small amounts of high-quality code and mathematical data can boost the performance of pre-trained models on key benchmarks. Akin to Li et al. (2024b) , we perform annealing with a data mix that upsamples high-quality data in select domains. We do not include any training sets from commonly used benchmarks in our annealing data. This enables us to assess the true few-shot learning capabilities and out-of-domain generalization of Llama 3. Following OpenAI (2023a) , we evaluate the efficacy of annealing on the GSM8k ( Cobbe et al., 2021 ) and MATH ( Hendrycks et al., 2021b ) training sets in annealing. We find that annealing improved the performance of a pre-trained Llama 3 8B model on the GSM8k and MATH validation sets by 24.0% and 6.4%, respectively. However, the improvements on the 405B model are negligible, suggesting that our flagship model has strong in-context learning and reasoning capabilities and does not require specific in-domain training samples to obtain strong performance. Using annealing to assess data quality. Similar to Blakeney et al. (2024) , we find that annealing enables us to judge the value of small domain-specific datasets. We measure the value of such datasets by annealing the learning rate of a 50% trained Llama 3 8B model linearly to 0 on 40B tokens. In those experiments, we assign 30% weight to the new dataset and the remaining 70% weight to the default data mix. Using annealing to evaluate new data sources is more efficient than performing scaling law experiments for every small dataset. Llama 3 uses a standard, dense Transformer architecture ( Vaswani et al., 2017 ) . It does not deviate significantly from Llama and Llama 2 ( Touvron et al., 2023a ; Touvron et al., 2023b ) in terms of model architecture; our performance gains are primarily driven by improvements in data quality and diversity as well as by increased training scale. We make a few small modifications compared to Llama 2: Llama 3 405B uses an architecture with 126 layers, a token representation dimension of 16,384, and 128 attention heads; see Table 3 for details. This leads to a model size that is approximately compute-optimal according to scaling laws on our data for our training budget of 3.8 × 10 25 3.8\times 10^{25} FLOPs.

<sub>§3.1.2 Determining the Data Mix · §3.1.3 Annealing Data · §3.2 Model Architecture</sub>

### 4. Scaling Laws / Infrastructure, Scaling, and Efficiency / Training Infrastructure

We develop scaling laws ( Hoffmann et al., 2022 ; Kaplan et al., 2020 ) to determine the optimal model size for our flagship model given our pre-training compute budget. In addition to determining the optimal model size, a major challenge is to forecast the flagship model’s performance on downstream benchmark tasks, due to a couple of issues: (1) Existing scaling laws typically predict only next-token prediction loss rather than specific benchmark performance. (2) Scaling laws can be noisy and unreliable because they are developed based on pre-training runs conducted with small compute budgets ( Wei et al., 2022b ) . To address these challenges, we implement a two-stage methodology to develop scaling laws that accurately predict downstream benchmark performance: This approach enables us to predict downstream task performance given a specific number of training FLOPs for compute-optimal models. We use a similar method to select our pre-training data mix (see Section 3.4 ). Scaling law experiments. Concretely, we construct our scaling laws by pre-training models using compute budgets between 6 × 10 18 6\times 10^{18} FLOPs and 10 22 10^{22} FLOPs. At each compute budget, we pre-train models ranging in size between 40M and 16B parameters, using a subset of model sizes at each compute budget. In these training runs, we use a cosine learning rate schedule with a linear warmup for 2,000 training steps. The peak learning rate is set between 2 × 10 − 4 2\times 10^{-4} and 4 × 10 − 4 4\times 10^{-4} depending on the size of the model. We set the cosine decay to 0.1 of the peak value. The weight decay at each step is set to 0.1 times the learning rate at that step. We use a fixed batch size for each compute scale, ranging between 250K and 4M. These experiments give rise to the IsoFLOPs curves in Figure 3 . The loss in these curves is measured on a separate validation set. We fit the measured loss values using a second-degree polynomial and identify the minimums of each parabola. We refer to minimum of a parabola as the compute-optimal model at the corresponding pre-training compute budget. We use the compute-optimal models we identified this way to predict the optimal number of training tokens for a specific compute budget. To do so, we assume a power-law relation between compute budget, C C , and the optimal number of training tokens, N ⋆ ​ ( C ) N^{\star}(C) : We fit A A and α \alpha using the data from Figure 3 . We find that ( α , A ) = ( 0.53 , 0.29 ) (\alpha,A)=(0.53,0.29) ; the corresponding fit is shown in Figure 3 . Extrapolation of the resulting scaling law to 3.8 × 10 25 3.8\times 10^{25} FLOPs suggests training a 402B parameter model on 16.55T tokens. An important observation is that IsoFLOPs curves become flatter around the minimum as the compute budget increases. This implies that performance of the flagship model is relatively robust to small changes in the trade-off between model size and training tokens. Based on this observation, we ultimately decided to train a flagship model with 405B parameters. Predicting performance on downstream tasks. We use the resulting compute-optimal models to forecast the performance of the flagship Llama 3 model on benchmark data sets. First, we linearly correlate the (normalized) negative log-likelihood of correct answer in the benchmark and the training FLOPs. In this analysis, we use only the scaling law models trained up to 10 22 10^{22} FLOPs on the data mix described above. Next, we establish a sigmoidal relation between the log-likelihood and accuracy using both the scaling law models and Llama 2 models, which were trained using the Llama 2 data mix and tokenizer. We show the results of this experiment on the ARC Challenge benchmark in Figure 4 ). We find this two-step scaling law prediction, which extrapolates over four orders of magnitude, to be quite accurate: it only slightly underestimates the final performance of the flagship Llama 3 model. We describe our hardware and infrastructure that powered Llama 3 405B pre-training at scale and discuss several optimizations that leads to improvements in training efficiency. The Llama 1 and 2 models were trained on Meta’s AI Research SuperCluster ( Lee and Sengupta, 2022 ) . As we scaled further, the training for Llama 3 was migrated to Meta’s production clusters ( Lee et al., 2024 ) .This setup optimizes for production-grade reliability, which is essential as we scale up training. Compute. Llama 3 405B is trained on up to 16K H100 GPUs, each running at 700W TDP with 80GB HBM3, using Meta’s Grand Teton AI server platform ( Matt Bowman, 2022 ) . Each server is equipped with eight GPUs and two CPUs. Within a server, the eight GPUs are connected via NVLink. Training jobs are scheduled using MAST ( Choudhury et al., 2024 ) , Meta’s global-scale training scheduler. Storage. Tectonic ( Pan et al., 2021 ) , Meta’s general-purpose distributed file system, is used to build a storage fabric ( Battey and Gupta, 2024 ) for Llama 3 pre-training. It offers 240 PB of storage out of 7,500 servers equipped with SSDs, and supports a sustainable throughput of 2 TB/s and a peak throughput of 7 TB/s. A major challenge is supporting the highly bursty checkpoint writes that saturate the storage fabric for short durations. Checkpointing saves each GPU’s model state, ranging from 1 MB to 4 GB per GPU, for recovery and debugging. We aim to minimize GPU pause time during checkpointing and increase checkpoint frequency to reduce the amount of lost work after a recovery. Network. Llama 3 405B used RDMA over Converged Ethernet (RoCE) fabric based on the Arista 7800 and Minipack2 Open Compute Project 4 4 4 Open Compute Project: https://www.opencompute.org/ OCP rack switches. Smaller models in the Llama 3 family were trained using Nvidia Quantum2 Infiniband fabric. Both RoCE and Infiniband clusters leverage 400 Gbps interconnects between GPUs. Despite the underlying network technology differences between these clusters, we tune both of them to provide equivalent performance for these large training workloads. We elaborate further on our RoCE network since we fully own its design.

<sub>§3.2.1 Scaling Laws · §3.3 Infrastructure, Scaling, and Efficiency · §3.3.1 Training Infrastructure</sub>

### 5. Parallelism for Model Scaling

To scale training for our largest models, we use 4D parallelism—a combination of four different types of parallelism methods—to shard the model. This approach efficiently distributes computation across many GPUs and ensures each GPU’s model parameters, optimizer states, gradients, and activations fit in its HBM. Our implementation of 4D parallelism is illustrated in Figure 5 . It combines tensor parallelism (TP; Krizhevsky et al. (2012) ; Shoeybi et al. (2019) ; Korthikanti et al. (2023) ), pipeline parallelism (PP; Huang et al. (2019) ; Narayanan et al. (2021) ; Lamy-Poirier (2023) ), context parallelism (CP; Liu et al. (2023a) ), and data parallelism (DP; Rajbhandari et al. (2020) ; Ren et al. (2021) ; Zhao et al. (2023b) ). Tensor parallelism splits individual weight tensors into multiple chunks on different devices. Pipeline parallelism partitions the model vertically into stages by layers, so that different devices can process in parallel different stages of the full model pipeline. Context parallelism divides the input context into segments, reducing memory bottleneck for very long sequence length inputs. We use fully sharded data parallelism ( Rajbhandari et al., 2020 ; Ren et al., 2021 ; Zhao et al., 2023b , FSDP;) , which shards the model, optimizer, and gradients while implementing data parallelism which processes data in parallel on multiple GPUs and synchronizes after each training step. Our use of FSDP for Llama 3 shards optimizer states and gradients, but for model shards we do not reshard after forward computation to avoid an extra all-gather communication during backward passes. GPU utilization. Through careful tuning of the parallelism configuration, hardware, and software, we achieve an overall BF16 Model FLOPs Utilization (MFU; Chowdhery et al. (2023) ) of 38-43% for the configurations shown in Table 4 . The slight drop in MFU to 41% on 16K GPUs with DP=128 compared to 43% on 8K GPUs with DP=64 is due to the lower batch size per DP group needed to keep the global tokens per batch constant during training. Pipeline parallelism improvements. We encountered several challenges with existing implementations: To address these issues, we modify our pipeline schedule as shown in Figure 6 , which allows setting N N flexibly—in this case N = 5 N=5 , which can run a arbitrary number of micro-batches in each batch. This allows us to run: (1) fewer micro-batches than the number of stages when we have batch size limit at large scale; or (2) more micro-batches to hide point-to-point communication, finding a sweet spot between DFS and breadth first schedule (BFS) for the best communication and memory efficiency. To balance the pipeline, we reduce one Transformer layer each from the first and the last stages, respectively. This means that the first model chunk on the first stage has only the embedding, and the last model chunk on the last stage has only output projection and loss calculation. To reduce pipeline bubbles, we use an interleaved schedule ( Narayanan et al., 2021 ) with V V pipeline stages on one pipeline rank. Overall pipeline bubble ratio is PP − 1 V ∗ M \frac{\textrm{PP}-1}{V*M} . Further, we adopt asynchronous point-to-point communication in PP, which considerably speeds up training, especially in cases when the document mask introduces extra computation imbalance. We enable TORCH_NCCL_AVOID_RECORD_STREAMS to reduce memory usage from asynchronous point-to-point communication. Finally, to reduce memory cost, based on detailed memory allocation profiling, we proactively deallocate tensors that will not be used for future computation, including the input and output tensors of each pipeline stage, that will not be used for future computation. With these optimizations, we could pre-train Llama 3 on sequences of 8K tokens without activation checkpointing. Context parallelism for long sequences. We utilize context parallelism (CP) to improve memory efficiency when scaling the context length of Llama 3 and enable training on extremely long sequences up to 128K in length. In CP, we partition across the sequence dimension, and specifically we partition the input sequence into 2 × CP 2\times\mbox{CP} chunks so each CP rank receives two chunks for better load balancing. The i i -th CP rank received both the i i -th and the ( 2 × CP − 1 − i ) (2\times\mbox{CP}-1-i) -th chunks. Different from existing CP implementations that overlap communication and computation in a ring-like structure ( Liu et al., 2023a ) , our CP implementation adopts an all-gather based method where we first all-gather the key (K) and value (V) tensors, and then compute attention output for the local query (Q) tensor chunk. Although the all-gather communication latency is exposed in the critical path, we still adopt this approach for two main reasons: (1) it is easier and more flexible to support different types of attention masks in all-gather based CP attention, such as the document mask; and (2) the exposed all-gather latency is small as the communicated K and V tensors are much smaller than Q tensor due to the use of GQA ( Ainslie et al., 2023 ) . Hence, the time complexity of attention computation is an order of magnitude larger than all-gather ( O ⁡ ( S 2 ) O(S^{2}) versus O ⁡ ( S ) O(S) , where S S represents the sequence length in the full causal mask), making the all-gather overhead negligible. Network-aware parallelism configuration. The order of parallelism dimensions, [TP, CP, PP, DP], is optimized for network communication. The innermost parallelism requires the highest network bandwidth and lowest latency, and hence is usually constrained to within the same server. The outermost parallelism may spread across a multi-hop network and should tolerate higher network latency. Therefore, based on the requirements for network bandwidth and latency, we place parallelism dimensions in the order of [TP, CP, PP, DP]. DP ( i.e. , FSDP) is the outermost parallelism because it can tolerate longer network latency by asynchronously prefetching sharded model weights and reducing gradients. Identifying the optimal parallelism configuration with minimal communication overhead while avoiding GPU memory overflow is challenging. We develop a memory consumption estimator and a performance-projection tool which helped us explore various parallelism configurations and project overall training performance and identify memory gaps effectively. Numerical stability. By comparing training loss between different parallelism setups, we fixed several numerical issues that impact training stability. To ensure training convergence, we use FP32 gradient accumulation during backward computation over multiple micro-batches and also reduce-scatter gradients in FP32 across data parallel workers in FSDP. For intermediate tensors, e.g. , vision encoder outputs, that are used multiple times in the forward computation, the backward gradients are also accumulated in FP32.

<sub>§3.3.2 Parallelism for Model Scaling</sub>

### 6. Collective Communication / Reliability and Operational Challenges

Our collective communication library for Llama 3 is based on a fork of Nvidia’s NCCL library, called NCCLX. NCCLX significantly improves the performance of NCCL, especially for higher latency networks. Recall that the order of parallelism dimensions is [TP, CP, PP, DP], where DP corresponds to FSDP. The outermost parallelism dimensions, PP and DP, may communicate through a multi-hop network, with latency up to tens of microseconds. The original NCCL collectives— all-gather and reduce-scatter in FSDP, and point-to-point in PP—require data chunking and staged data copy. This approach incurs several inefficiencies, including (1) requiring a large number of small control messages to be exchanged over the network to facilitate data transfer, (2) extra memory-copy operations, and (3) using extra GPU cycles for communication. For Llama 3 training, we address a subset of these inefficiencies by tuning chunking and data transfer to fit our network latencies, which can be as high as tens of microseconds for a large cluster. We also allow small control messages to traverse our network at a higher priority, especially avoiding being head-of-line blocked in deep-buffer core switches. Our ongoing work for future Llama versions involves making deeper changes in NCCLX to holistically address all the aforementioned problems. The complexity and potential failure scenarios of 16K GPU training surpass those of much larger CPU clusters that we have operated. Moreover, the synchronous nature of training makes it less fault-tolerant—a single GPU failure may require a restart of the entire job. Despite these challenges, for Llama 3, we achieved higher than 90% effective training time while supporting automated cluster maintenance, such as firmware and Linux kernel upgrades ( Vigraham and Leonhardi, 2024 ) , which resulted in at least one training interruption daily. The effective training time measures the time spent on useful training over the elapsed time. During a 54-day snapshot period of pre-training, we experienced a total of 466 job interruptions. Of these, 47 were planned interruptions due to automated maintenance operations such as firmware upgrades or operator-initiated operations like configuration or dataset updates. The remaining 419 were unexpected interruptions, which are classified in Table 5 . Approximately 78% of the unexpected interruptions are attributed to confirmed hardware issues, such as GPU or host component failures, or suspected hardware-related issues like silent data corruption and unplanned individual host maintenance events. GPU issues are the largest category, accounting for 58.7% of all unexpected issues. Despite the large number of failures, significant manual intervention was required only three times during this period, with the rest of issues handled by automation. To increase the effective training time, we reduced job startup and checkpointing time, and developed tools for fast diagnosis and problem resolution. We extensively use PyTorch’s built-in NCCL flight recorder ( Ansel et al., 2024 ) , a feature that captures collective metadata and stack traces into a ring buffer, and hence allowing us to diagnose hangs and performance issues quickly at scale, particularly with regard to NCCLX. Using this, we efficiently record every communication event and the duration of each collective operation, and also automatically dump tracing data on NCCLX watchdog or heartbeat timeout. We enable more computationally intensive tracing operations and metadata collection selectively as needed live in production through online configuration changes ( Tang et al., 2015 ) without needing a code release or job restart. Debugging issues in large-scale training is complicated by the mixed use of NVLink and RoCE in our network. Data transfer over NVLink typically occurs through load/store operations issued by CUDA kernels, and failures in either the remote GPU or NVLink connectivity often manifest as stalled load/store operations within CUDA kernels without returning a clear error code. NCCLX enhances the speed and accuracy of failure detection and localization through a tight co-design with PyTorch, allowing PyTorch to access NCCLX’s internal state and track relevant information. While stalls due to NVLink failures cannot be completely prevented, our system monitors the state of the communication library and automatically times out when such a stall is detected. Additionally, NCCLX traces the kernel and network activities of each NCCLX communication and provides a snapshot of the failing NCCLX collective’s internal state, including finished and pending data transfers between all ranks. We analyze this data to debug NCCLX scaling issues. Sometimes, hardware issues may cause still-functioning but slow stragglers that are hard to detect. Even a single straggler can slow down thousands of other GPUs, often appearing as functioning but slow communications. We developed tools to prioritize potentially problematic communications from selected process groups. By investigating just a few top suspects, we were usually able to effectively identify the stragglers. One interesting observation is the impact of environmental factors on training performance at scale. For Llama 3 405B , we noted a diurnal 1-2% throughput variation based on time-of-day. This fluctuation is the result of higher mid-day temperatures impacting GPU dynamic voltage and frequency scaling. During training, tens of thousands of GPUs may increase or decrease power consumption at the same time, for example, due to all GPUs waiting for checkpointing or collective communications to finish, or the startup or shutdown of the entire training job. When this happens, it can result in instant fluctuations of power consumption across the data center on the order of tens of megawatts, stretching the limits of the power grid. This is an ongoing challenge for us as we scale training for future, even larger Llama models.

<sub>§3.3.3 Collective Communication · §3.3.4 Reliability and Operational Challenges</sub>

### 7. Training Recipe / Initial Pre-Training / Long Context Pre-Training / Annealing

The recipe used to pre-train Llama 3 405B consists of three main stages: (1) initial pre-training, (2) long-context pre-training, and (3) annealing. The three stages are described separately below. We use similar recipes to pre-train the 8B and 70B models. We pre-train Llama 3 405B using AdamW with a peak learning rate of 8 × 10 − 5 , 8\text{\times}{10}^{-5}\text{\,}\mathrm{,} a linear warm up of 8,000 steps, and a cosine learning rate schedule decaying to 8 × 10 − 07 o 8\text{\times}{10}^{-07}\text{\,}\mathrm{o} ver 1,200,000 steps. We use a lower batch size early in training to improve training stability, and increase it subsequently to improve efficiency. Specifically, we use an initial batch size of 4M tokens and sequences of length 4,096, and double these values to a batch size of 8M sequences of 8,192 tokens after pre-training 252M tokens. We double the batch size again to 16M after pre-training on 2.87T tokens. We found this training recipe to be very stable: we observed few loss spikes and did not require interventions to correct for model training divergence. Adjusting the data mix. We made a several adjustments to the pre-training data mix during training to improve model performance on particular downstream tasks. In particular, we increased the percentage of non-English data during pre-training to improve the multilingual performance of Llama 3. We also upsample mathematical data to improve the model’s mathematical reasoning performance, we added more recent web data in the later stages of pre-training to advance the model’s knowledge cut-off, and we downsampled subsets of the pre-training data that were later identified as being lower quality. In the final stages of pre-training, we train on long sequences to support context windows of up to 128K tokens. We do not train on long sequences earlier because the compute in self-attention layers grows quadratically in the sequence length. We increase the supported context length in increments, pre-training until the model has successfully adapted to the increased context length. We assess successful adaptation by measuring whether (1) model performance on short-context evaluations has recovered completely and (2) the model perfectly solves “needle in a haystack” tasks up to that length. In Llama 3 405B pre-training, we increased context length gradually in six stages, starting from the original 8K context window and ending in the final 128K context window. This long-context pre-training stage was performed using approximately 800B training tokens. During pre-training on the final 40M tokens, we linearly annealed the learning rate to 0, maintaining a context length of 128K tokens. During this annealing phase, we also adjusted the data mix to upsample data sources of very high quality; see Section 3.1.3 . Finally, we compute the average of model checkpoints ( Polyak (1991) averaging) during annealing to produce the final pre-trained model.

<sub>§3.4 Training Recipe · §3.4.1 Initial Pre-Training · §3.4.2 Long Context Pre-Training · §3.4.3 Annealing</sub>

### 8. Post-Training

We produce the aligned Llama 3 models by applying several rounds of post-training, 6 6 6 We use the term “post-training” to refer to any model training that happens outside of pre-training. or aligning the model with human feedback ( Ouyang et al., 2022 ; Rafailov et al., 2024 ) on top of a pre-trained checkpoint. Each round of post-training involves supervised finetuning (SFT) followed by Direct Preference Optimization ( Rafailov et al., 2024 , DPO;) on examples collected either via human annotations or generated synthetically. Our post-training modeling and data approaches are described in Sections 4.1 and 4.2 respectively. We further detail custom data curation strategies to improve the reasoning, coding, factuality, multilingual, tool use, long context, and precise instruction following in Section 4.3 . Masking out formatting tokens in DPO loss : We mask out special formatting tokens including header and termination tokens (described in Section 4.1.1 ) from both chosen and rejected responses in the loss to stabilize DPO training. We observe that having these tokens contribute to the loss may lead to undesired model behaviors such as tail repetition or abruptly generating termination tokens. We hypothesize that this is due to the contrastive nature of the DPO loss – the presence of common tokens in both chosen and rejected responses leads to a conflicting learning objective as the model needs to increase and reduce the likelihood of these tokens simultaneously. Regularization with NLL loss : We add an additional negative log-likelihood (NLL) loss term with a scaling coefficient of 0.2 0.2 on the chosen sequences, similar to Pang et al. (2024) . This helps further stabilize DPO training by maintaining desired formatting for generation and preventing the decrease of log probability of chosen responses ( Pang et al., 2024 ; Pal et al., 2024 ) . Prompts from our human annotation collection with rejection-sampled responses. Synthetic data targeting specific capabilities (see Section 4.3 for more details). Small amounts of human-curated data (see Section 4.3 for more details). Topic classification: We first finetune Llama 3 8B into a topic classifier, and perform inference over all data to classify it into both coarsely-grained buckets (“mathematical reasoning”) and fine-grained buckets (“geometry and trigonometry”). Quality scoring: We use both reward model and Llama-based signals to obtain a quality score for each sample. For an RM-based score, we consider data that is in the top quartile of RM scores as high quality. For a Llama-based score, we prompt Llama 3 checkpoint to rate each sample on a three-point scale for general English data (accuracy, instruction following, and tone/presentation) and a two-point scale for coding data (bug identification and user intention), and consider samples that obtain the maximum score as high quality. The RM and Llama-based scores have high disagreement rates, and we find that combining these signals yield the best recall on our internal test set. Ultimately, we select examples that are marked as high quality by the RM or the Llama-based filter. Difficulty scoring: Because we are also interested in prioritizing examples that are more complex for the model, we score data using two measures of difficulty: Instag ( Lu et al., 2023 ) and Llama-based scoring. For Instag, we prompt Llama 3 70B to perform intention tagging of SFT prompts, where more intentions implies more complexity. We also prompt Llama 3 to measure the difficulty ( Liu et al., 2024c ) of dialogs on a three-point scale. Semantic deduplication: Finally, we perform semantic deduplication ( Abbas et al., 2023 ; Liu et al., 2024c ) . We first cluster complete dialogs using RoBERTa ( Liu et al., 2019b ) and within each cluster sort them by quality score × \times difficulty score. We then do greedy selection by iterating through all sorted examples, and only keeping the ones that have maximum cosine similarity less than a threshold to the examples seen so far in the cluster. Synthetic data generation: execution feedback. The 8B and 70B models show significant performance improvements when trained on data generated by a larger, more competent model. However, our initial experiments revealed that training Llama 3 405B on its own generated data is not helpful (and can even degrade performance). To address this limitation, we introduced execution feedback as a source of truth, enabling the model to learn from its mistakes and stay on track. In particular, we generate large dataset of approximately one million synthetic coding dialogues using the following process: Problem description generation: First, we generate a large collection of programming problem descriptions that span a diverse range of topics, including those in the long tail distribution. To achieve this diversity, we sample random code snippets from various sources and prompt the model to generate programming problems inspired by these examples. This allowed us to tap into a wide range of topics and create a comprehensive set of problem descriptions ( Wei et al., 2024 ) . Solution generation: Then, we prompt Llama 3 to solve each problem in a given programming language. We observe that adding general rules of good programming to the prompt improves the generated solution quality. Also, we find it is helpful to require the model to explain its thought process in comments. Correctness analysis: After generating a solution, it is crucial to recognize that its correctness is not guaranteed, and including incorrect solutions in the finetuning dataset could harm the model’s quality. While we do not ensure complete correctness, we develop methods to approximate it. To achieve this, we extract the source code from the generated solution and applied a combination of static and dynamic analysis techniques to test its correctness, including: Static analysis : We run all generated code through a parser and a linter to ensure syntactic correctness, catching errors such as syntax errors, use of uninitialized variables or non-imported functions, code style issues, typing errors, and others. Unit test generation and execution : For each problem and solution, we prompt the model to generate unit tests, executed in a containerized environment together with the solution, catching run-time execution errors and some semantic errors. Error feedback and iterative self-correction: When a solution fails at any step, we prompt the model to revise it. The prompt included the original problem description, the faulty solution, and feedback from the parser/linter/tester (stdout, stderr/ and return code). After a unit test execution failure, the model could either fix the code to pass the existing tests or modify its unit tests to accommodate the generated code. Only dialogs that pass all checks are included in the final dataset, used for supervised finetuning (SFT). Notably, we observed that about 20% of solutions were initially incorrect but self-corrected, indicating that the model learned from the execution feedback and improved its performance. Fine-tuning and iterative improvement: The finetuning process is conducted over multiple rounds, with each round building on the previous one. After each round, the model is improved, generating higher-quality synthetic data for the next round. This iterative process allows for progressive refinement and enhancement of the model’s performance. Synthetic data generation: programming language translation. We observe a performance gap between major programming languages ( e.g. , Python/C++) and less common ones ( e.g. , Typescript/PHP). This is not surprising as we have less training data for less common programming languages. To mitigate this, we supplement our existing data by translating data from common programming languages to less common languages (similar to Chen et al. (2023) in the context of reasoning). This is achieved by prompting Llama 3 and ensuring quality via syntax parsing, compilation, and execution. Figure 8 demonstrates an example of synthetic PHP code translated from Python. This improves performance significantly for less common languages as measured by the MultiPL-E ( Cassano et al., 2023 ) benchmark. Synthetic data generation: backtranslation. To improve certain coding capabilities (e.g., documentation, explanations) where execution feedback is less informative for determining quality, we employ an alternative multi-step approach. Using this procedure, we generated approximately 1.2M synthetic dialogs related to code explanation, generation, documentation, and debugging. Beginning with code snippets from a variety of languages in our pre-training data: Generate: We prompt Llama 3 to generate data that represents our target capability (e.g., we add comments and docstrings for the code snippet, or we ask the model to explain a piece of code). Backtranslate: We then prompt the model to “backtranslate” the synthetically generated data to the original code (e.g., we prompt the model to generate code only from its documentation, or we ask the model to generate code only from its explanation). Filter: Using the original code as a reference, we prompt the Llama 3 to determine the quality of the output (e.g., we ask the model how faithful the backtranslated code is to the original). We then use the generated examples that have the highest self-verification scores in SFT. Human annotations : We collect high-quality, manually annotated data from linguists and native speakers. These annotations mostly consist of open-ended prompts that represent real world use cases. Data from other NLP tasks : To further augment, we use multilingual training data from other tasks and rewrite into dialog format. For example, we use data from exams-qa ( Hardalov et al., 2020 ) and Conic10k ( Wu et al., 2023 ) . To improve language alignment, we also use parallel texts from GlobalVoices ( Prokopidis et al., 2016 ) and Wikimedia ( Tiedemann, 2012 ) . We use LID based filtering and Blaser2.0 ( Seamless Communication et al., 2023 ) to remove low quality data. For parallel text data, instead of using the bitext pairs directly, we apply a multilingual template inspired by Wei et al. (2022a) to better simulate real-life conversations in translation and language learning scenarios. Rejection sampled data : We apply rejection sampling on our human annotated prompts to generate high-quality samples for finetuning, with few modifications compared to the process for English data: Generation : We explored randomly choosing the temperature hyperparameter from the range 0.2 − 1 0.2-1 for diverse generations in early rounds of post-training. With high temperature, responses for multilingual prompts can get creative and inspiring, but are also susceptible to unnecessary or unnatural code-switching. In the final round of post-training, we use a constant value of 0.6 to balance the trade-off. Additionally, we used specialized system prompts to improve response format, structure and general readability. Selection : Prior to reward model based selection, we implement multilingual-specific checks to ensure high language-match rate between the prompt and response (e.g., a romanized Hindi prompt should not expect a response in Hindi Devanagari script). Translated data : We try to avoid using machine-translated data to finetune the model in order to prevent translationese ( Bizzoni et al., 2020 ; Muennighoff et al., 2023 ) or possible name bias ( Wang et al., 2022a ) , gender bias ( Savoldi et al., 2021 ) , or cultural bias ( Ji et al., 2023 ) . Moreover, we aim to prevent the model from being exposed only to tasks that are rooted in English cultural context, which may not be representative of the linguistic and cultural diversity we aim to capture. We made one exception to this and translated our synthetic quantitative reasoning data (see Section 4.3.3 for details) to improve performance in quantitative reasoning in non-English languages. Due to the simple nature of the language in these math problems, the translated samples were found to have little to no quality issues. We observed strong gains on MGSM ( Shi et al., 2022 ) from adding this translated data. Lack of prompts : As the complexity of questions increases, the number of valid prompts or questions for Supervised Fine-Tuning (SFT) decreases. This scarcity makes it difficult to create diverse and representative training datasets for teaching models various mathematical skills ( Yu et al., 2023 ; Yue et al., 2023 ; Luo et al., 2023 ; Mitra et al., 2024 ; Shao et al., 2024 ; Yue et al., 2024b ) . Lack of ground truth chain of thought : Effective reasoning requires a step-by-step solution to facilitate the reasoning process ( Wei et al., 2022c ) . However, there is often a shortage of ground truth chains of thought, which are essential for guiding the model how to break down the problem step-by-step and reach the final answer ( Zelikman et al., 2022 ) . Incorrect intermediate steps : When using model-generated chains of thought, the intermediate steps may not always be correct ( Cobbe et al., 2021 ; Uesato et al., 2022 ; Lightman et al., 2023 ; Wang et al., 2023a ) . This inaccuracy can lead to incorrect final answers and needs to be addressed. Teaching models to use external tools : Enhancing models to utilize external tools, such as code interpreters, allows them to reason by interleaving code and text ( Gao et al., 2023 ; Chen et al., 2022 ; Gou et al., 2023 ) . This capability can significantly improve their problem-solving abilities. Discrepancy between training and inference : There is often a discrepancy between how the model is finetuned during training and how it is used during inference. During inference, the finetuned model may interact with humans or other models, requiring it to improve its reasoning using feedback. Ensuring consistency between training and real-world usage is crucial for maintaining reasoning performance. Addressing the lack of prompts: We source relevant pre-training data from mathematical contexts and converted it into a question-answer format which can then be used for supervised finetuning. Additionally, we identify mathematical skills where the model under-performs and actively sourced prompts from humans to teach models such skills. To facilitate this process, we create a taxonomy of mathematical skills ( Didolkar et al., 2024 ) and ask humans to provide relevant prompts/questions accordingly. Augmenting training data with step-wise reasoning traces : We use Llama 3 to generate step-by-step solutions for a set of prompts. For each prompt, the model produces a variable number of generations. These generations are then filtered based on the correct answer ( Li et al., 2024a ) . We also do self-verification where Llama 3 is used to verify whether a particular step-by-step solution is valid for a given question. This process improves the quality of the finetuning data by eliminating instances where the model does not produce valid reasoning traces. Filtering incorrect reasoning traces : We train outcome and stepwise reward models ( Lightman et al., 2023 ; Wang et al., 2023a ) to filter training data where the intermediate reasoning steps were incorrect. These reward models are used to eliminate data with invalid step-by-step reasoning, ensuring high-quality data for finetuning. For more challenging prompts, we use Monte Carlo Tree Search (MCTS) with learned step-wise reward models to generate valid reasoning traces, further enhancing the collection of high-quality reasoning data ( Xie et al., 2024 ) . Interleaving code and text reasoning : We prompt Llama 3 to solve reasoning problems through a combination of textual reasoning and associated Python code ( Gou et al., 2023 ) . Code execution is used as a feedback signal to eliminate cases where the reasoning chain was not valid, ensuring the correctness of the reasoning process. Learning from feedback and mistakes : To simulate human feedback, we utilize incorrect generations ( i.e. , generations leading to incorrect reasoning traces) and perform error correction by prompting Llama 3 to yield correct generations ( An et al., 2023b ; Welleck et al., 2022 ; Madaan et al., 2024a ) . The iterative process of using feedback from incorrect attempts and correcting them helps improve the model’s ability to reason accurately and learn from its mistakes. Question answering: We carefully curate a set of long documents from our pre-training mix. We split these documents into chunks of 8K tokens, and prompted an earlier version of the Llama 3 model to generate QA pairs conditional on randomly selected chunks. During training, the whole document is used as context. Summarization: We applied hierarchical summarization of long-context documents by first summarizing the chunks of 8K input length using our strongest Llama 3 8K context model and then summarizing the summaries. During training we provide the full document and prompt the model to summarize the document while preserving all the important details. We also generate QA pairs based on the summaries of the documents and prompt the model with questions that require global understanding of the whole long document. Long context code reasoning: We parse Python files to identify import statements and determine their dependencies. From here, we select the most commonly depended-upon files, specifically those referenced by at least five other files. We remove one of these key files from a repository and prompt the model to identify which files depended on the missing file and to generate the necessary missing code. Search engine. Llama 3 is trained to use Brave Search 7 7 7 https://brave.com/search/api/ to answer questions about recent events that go beyond its knowledge cutoff or that require retrieving a particular piece of information from the web. Python interpreter. Llama 3 can generate and execute code to perform complex computations, read files uploaded by the user and solve tasks based on them such as question answering, summarization, data analysis or visualization. Mathematical computational engine. Llama 3 can use the Wolfram Alpha API 8 8 8 https://products.wolframalpha.com/llm-api/documentation to more accurately solve math, science problems, or retrieve accurate information from Wolfram’s database. For tools, dialogs often contain more than a single assistant message (e.g., calling the tool and reasoning about the tool output). Thus, we annotate at the message level to collect granular feedback: annotators provide a preference between two assistant messages with the same context or, if both contain major problems, edit one of the messages. The chosen or edited message is then added to the context and the dialog continues. This provides human feedback for both the assistant’s ability of calling the tools and reasoning about the tool outputs. Annotators cannot rank or edit the tool outputs. We do not perform rejection sampling, as we did not observe gains in our tool benchmarks. Single-step tool use: We start by few-shot generation of synthetic user prompts which, by construction, require a call to one of our core tools (for example, questions that exceed our knowledge cutoff date). Then, still relying on few-shot generation, we generate appropriate tool calls for these prompts, execute them, and add the output to the model’s context. Finally, we prompt the model again to generate a final answer to the user’s query based on the tool output. We end up with trajectories of the following form: system prompt, user prompt, tool call, tool output, final answer. We also filter around 30 % 30\% this dataset to remove tool calls that cannot be executed or other formatting issues. Multi-step tool use: We follow a similar protocol and first generate synthetic data to teach the model basic multi-step tool use capabilities. To do this, we first prompt Llama 3 to generate user prompts that require at least two tool calls, that can be the same or different tools from our core set. Then, conditioned on these prompts, we few-shot prompt Llama 3 to generate a solution consisting of interleaved reasoning steps and tool calls, similar to ReAct ( Yao et al., 2022 ) . See Figure 10 for an example of Llama 3 performing a task involving multi-step tool usage. File uploads: We annotate for the following filetypes: .txt, .docx, .pdf, .pptx, .xlsx, .csv, .tsv, .py, .json, .jsonl, .html, .xml . Our prompts are based on a provided file, and ask to summarize the contents of the file, find and fix bugs, optimize a piece of code, perform data analysis or visualization. See Figure 11 for an example of Llama 3 performing a task involving a file upload. Single, nested, and parallel function calling: Calls can be simple, nested, i.e. we pass a function call as an argument of another function, or parallel, i.e. the model returns a list of independent function calls. Generating a diverse set of functions, queries and ground truths can be challenging ( Mekala et al., 2024 ) , and we resort to mining the Stack ( Kocetkov et al., 2022 ) to ground our synthetic user queries in real functions. More precisely, we extract function calls and their definitions, clean and filter them, e.g. for missing docstrings or non-executable functions, and use Llama 3 to generate a natural language query corresponding to the function call. Multi-turn function calling: We also generate synthetic data for multi-turn dialogs with function calls, following a protocol similar to the one proposed in Li et al. (2023b) . We use multiple agents that generate domains, APIs, user queries, API calls, and responses, while also ensuring that the generated data covers a set of diverse domains and realistic APIs. All agents are variants of Llama 3 prompted in different ways depending on their roles and collaborate in a step-by-step manner. Extract a data snippet from the pre-training data. Generate a factual question about these snippets (context) by prompting Llama 3. Sample responses from Llama 3 to the question. Score the correctness of the generations using the original context as a reference and Llama 3 as a judge. Score the informativeness of the generations using Llama 3 as a judge. Generate a refusal for responses which are consistently informative and incorrect across the generations, using Llama 3.

<sub>§4 Post-Training</sub>

### 9. Modeling / Chat Dialog Format / Reward Modeling / Supervised Finetuning

The backbone of our post-training strategy is a reward model and a language model. We first train a reward model on top of the pre-trained checkpoint using human-annotated preference data (see Section 4.1.2 ). We then finetune pre-trained checkpoints with supervised finetuning (SFT; see Section 4.1.3 ), and further align the checkpoints with Direct Preference Optimization (DPO; see Section 4.1.4 ). This process is illustrated in Figure 7 . Unless otherwise noted, our modeling procedure applies to Llama 3 405B, and we refer to Llama 3 405B as Llama 3 for simplicity. To tune LLMs for human-AI interaction, we need to define a chat dialog protocol for the model to understand human instructions and perform conversational tasks. Compared to its predecessor, Llama 3 has new capabilities such as tool use (Section 4.3.5 ) which may require generating multiple messages and sending them to different locations (e.g., user, ipython ) within a single dialog turn. To support this, we design a new multi-message chat protocol which uses various special header and termination tokens. The header tokens are used to indicate the source and destination of each message in a conversation. Similarly, the termination tokens indicate when it is the time to alternate between human and AI to speak. We train a reward model (RM) covering different capabilities on top of the pre-trained checkpoint. The training objective is the same as Llama 2 except that we remove the margin term in the loss, as we observe diminishing improvements after data scaling. Following Llama 2, we use all of our preference data for reward modeling after filtering out samples with similar responses. In addition to standard preference pair of (chosen, rejected) response, annotations also create a third “edited response” for some prompts, where the chosen response from the pair is further edited for improvement (see Section 4.2.1 ). Hence, each preference ranking sample has two or three responses with clear ranking ( edited ¿ chosen ¿ rejected ). We concatenate the prompt and multiple responses into a single row during training with responses randomly shuffled. This is an approximation to the standard scenario of putting the responses in separate rows and computing the scores, but in our ablations, this approach improves training efficiency without a loss in accuracy. The reward model is then used to perform rejection sampling on our human annotation prompts, the details of which are described in Section 4.2 . Together with this rejection-sampled data and other data sources (including synthetic data), we finetune the pre-trained language model using a standard cross entropy loss on the target tokens (while masking loss on prompt tokens). More details about the data mix can be found in Section 4.2 . We refer to this stage as supervised finetuning ( Wei et al., 2022a ; Sanh et al., 2022 ; Wang et al., 2022b , SFT;) , even though many of the training targets are model-generated. Our largest models are finetuned with a learning rate of 10 − 5 10^{-5} over the course of 8.5K to 9K steps. We found these hyperparameter settings to work well across different rounds and data mixes.

<sub>§4.1 Modeling · §4.1.1 Chat Dialog Format · §4.1.2 Reward Modeling · §4.1.3 Supervised Finetuning</sub>

### 10. Direct Preference Optimization / Model Averaging / Iterative Rounds / Post-training Data / Preference Data

We further train our SFT models with Direct Preference Optimization ( Rafailov et al., 2024 , DPO;) for human preference alignment. For training, we primarily use the most recent batches of preference data collected using the best performing models from the previous alignment rounds. As a result, our training data conforms better to the distribution of the policy model that is being optimized in each round. We also explored on-policy algorithms such as PPO ( Schulman et al., 2017 ) , but found that DPO required less compute for large-scale models and performed better, especially on instruction following benchmarks like IFEval ( Zhou et al., 2023 ) . For Llama 3, we use a learning rate of 10 − 5 10^{-5} and set the β \beta hyper-parameter to be 0.1. In addition, we apply the following algorithmic modifications to DPO: Finally, we average models obtained from experiments using various versions of data or hyperparameters at each RM, SFT, or DPO stage ( Izmailov et al., 2019 ; Wortsman et al., 2022 ; Li et al., 2022 ) . Following Llama 2, we apply the above methods in six rounds. In each cycle, we collect new preference annotations and SFT data, sampling synthetic data from the latest models. The post-training data composition plays a critical role in the usefulness and behavior of language models. In this section, we discuss our human annotation procedures and preference data collection (Section 4.2.1 ), the composition of our SFT data (Section 4.2.2 ), and methods for data quality control and cleaning (Section 4.2.3 ). Our preference data annotation process is similar to Llama 2. We deploy multiple models for annotation after each round and sample two responses from two different models for each user prompt. These models can be trained with different data mixes and alignment recipes, allowing for different capability strength ( e.g. , code expertise) and increased data diversity. We ask annotators to rate the strength of their preference by categorizing it into one of four levels, based on how much more they prefer the chosen response over the rejected one: significantly better, better, slightly better, or marginally better. We also incorporate an editing step after preference ranking to encourage annotators to further improve the preferred response. Annotators edit the chosen response directly or prompt the model with feedback to refine its own response. Consequently, a portion of our preference data has three responses ranked ( edited ¿ chosen ¿ rejected ). In Table 6 , we report the statistics of preference annotations that we use for Llama 3 training. General English covers multiple subcategories such as knowledge-based question and answering or precise instruction-following, which fall outside the scope of specific capabilities. Compared to Llama 2, we observe an increase in the average length of prompt and response, suggesting that we train Llama 3 on more complex tasks. In addition, we implement a quality analysis and human evaluation process to rigorously assess the data collected, allowing us to refine our prompts and provide systematic, actionable feedback to annotators. For example, as Llama 3 improves after each round, we increase prompt complexity accordingly to target areas where the model lags. In each round of post-training, we use all the preference data that is available at the time for reward modeling, while only using the latest batches from various capabilities for DPO training. For both reward modeling and DPO, we use samples that are labeled as the chosen response being significantly better or better than the rejected counterpart for training and discard samples with similar responses.

<sub>§4.1.4 Direct Preference Optimization · §4.1.5 Model Averaging · §4.1.6 Iterative Rounds · §4.2 Post-training Data · §4.2.1 Preference Data</sub>

### 11. SFT Data / Data Processing and Quality Control / Capabilities

Our finetuning data is largely comprised of the following sources: As our post-training rounds progress, we develop stronger Llama 3 variants that we use to collect larger datasets that cover a wide range of complex capabilities. In this section, we discuss the details for the rejection-sampling procedure and overall composition of our final SFT datamix. Rejection sampling. During rejection sampling (RS), for each prompt collected during human annotation (Section 4.2.1 ) we sample K K (typically between 10 and 30) outputs from the latest chat model policy (usually the best performing checkpoint from the previous post-training iteration, or the best performing checkpoint for a particular capability) and use our reward model to select the best candidate, consistent with Bai et al. (2022) . In later rounds of post-training, we introduce system prompts to steer RS responses to conform with desirable tone, style, or formatting, which might be different for different capabilities. To increase the efficiency of rejection sampling, we adopt PagedAttention ( Kwon et al., 2023 ) . PagedAttention enhances memory efficiency through dynamic key-value cache allocation. It supports arbitrary output lengths by dynamically scheduling requests based on the current cache capacity. Unfortunately, this carries the risk of swap-out when running out of memory. To eliminate such swap overhead, we define a maximum output length and perform a request only if sufficient memory is available to fit an output with that length. PagedAttention also enables us to share the key-value cache pages for a prompt across all corresponding outputs. Together, this leads to a throughput improvement of over 2 × 2\times during rejection sampling. Overall data composition. Table 7 shows data statistics for each broad category of our “helpfulness” mix. While SFT and preference data contain overlapping domains, they are curated differently, yielding distinct count statistics. In Section 4.2.3 we describe techniques for categorizing topic, complexity, and quality of our data samples. In each round of post-training, we adjust our overall data mix carefully across these axes to tune performance across a wide range of benchmarks. Our final data mix epochs multiple times on some high quality sources and downsamples others. Given that most of our training data is model-generated , it requires careful cleaning and quality control. Data cleaning. In the early rounds, we observed a number of undesirable patterns common in our data, such as excessive use of emojis or exclamation points. Therefore, we implement a series of rule-based data removal and modification strategies to filter or clean problematic data. For example, to mitigate overly-apologetic tonal issues, we identify overused phrases (such as “I’m sorry” or “I apologize”) and carefully balance the proportion of such samples in our dataset. Data pruning. We also apply a collection of model-based techniques to remove low-quality training samples and improve overall model performance: We highlight special efforts to improve performance for specific capabilities such as code (Section 4.3.1 ), multilinguality (Section 4.3.2 ), math and reasoning (Section 4.3.3 ), long context (Section 4.3.4 ), tool use (Section 4.3.5 ), factuality (Section 4.3.6 ), and steerability (Section 4.3.7 ).

<sub>§4.2.2 SFT Data · §4.2.3 Data Processing and Quality Control · §4.3 Capabilities</sub>

### 12. Code

LLMs for code have received significant attention since the release of Copilot and Codex ( Chen et al., 2021 ) . Developers are now widely using these models to generate code snippets, debug, automate tasks, and improve code quality. For Llama 3, we target improving and evaluating code generation, documentation, debugging, and review capabilities for the following high priority programming languages: Python, Java, Javascript, C/C++, Typescript, Rust, PHP, HTML/CSS, SQL, bash/shell. Here, we present our work on improving these coding capabilities via training a code expert, generating synthetic data for SFT, improving formatting with system prompt steering, and creating quality filters to remove bad samples from our training data. Expert training. We train a code expert which we use to collect high quality human annotations for code throughout subsequent rounds of post-training. This is accomplished by branching the main pre-training run and continuing pre-training on a 1T token mix of mostly (¿85%) code data. Continued pre-training on domain-specific data has been shown to be effective for improving performance in a specific domain ( Gururangan et al., 2020 ) . We follow a recipe similar to that of CodeLlama ( Rozière et al., 2023 ) . For the last several thousand steps of training we perform long-context finetuning (LCFT) to extend the expert’s context length to 16K tokens on a high quality mix of repo-level code data. Finally, we follow the similar post-training modeling recipes described in Section 4.1 to align this model, except with SFT and DPO data mixes primarily targeting code. This model is also used for rejection sampling (Section 4.2.2 ) for coding prompts. Synthetic data generation. During development, we identified key issues in code generation, including difficulty in following instructions, code syntax errors, incorrect code generation, and difficulty in fixing bugs. While intensive human annotation could theoretically resolve these issues, synthetic data generation offers a complementary approach at a lower cost and higher scale, unconstrained by the expertise level of annotators. As such, we use Llama 3 and the code expert to generate a large quantity of synthetic SFT dialogs. We describe three high-level approaches for generating synthetic code data. In total, we generate over 2.7 2.7 M synthetic examples which were used during SFT. System prompt steering during rejection sampling. During the rejection sampling process, we used code specific system prompts to improve code readability, documentation, thoroughness, and specificity. Recall, from Section 7 this data is used to finetune the language model. Figure 9 shows an example of how the system prompt helps improve the generated code quality — it adds necessary comments, uses more informative variable names, saves memory, etc. Filtering training data with execution and model-as-judge signals. As described in Section 4.2.3 , we occasionally encounter quality issues in our rejection-sampled data, such as code blocks containing bugs. Detecting these issues in our rejection-sampled data is not as straightforward as it is for our synthetic code data , as the rejection-sampled responses typically contain a mix of natural language and code for which the code may not always be expected to be executable. (For example, user prompts may explicitly ask for pseudo-code or edits to only a very small snippet of an executable program.) To address this, we utilize the “model-as-judge” approach, where earlier versions of Llama 3 assess and assign a binary (0/1) score based on two criteria: code correctness and code style. We retain only those samples that achieve a perfect score of 2. Initially, this stringent filtering led to a regression in downstream benchmark performance, primarily because it disproportionately removed examples with challenging prompts. To counteract this, we strategically revise the responses of some coding data categorized as most challenging until they met the Llama-based “model-as-judge” criteria. By refining these challenging problems, the coding data achieves a balance between quality and difficulty, resulting in optimal downstream performance.

<sub>§4.3.1 Code</sub>

### 13. Multilinguality / Math and Reasoning / Long Context

We describe how we improve Llama 3’s multilingual capabilities, including training an expert specialized on substantially more multilingual data, sourcing and generating high quality multilingual instruction tuning data for German, French, Italian, Portuguese, Hindi, Spanish, and Thai, and tackling specific challenges of multilingual language steering to enhance the overall performance of our model. Expert training. Our Llama 3 pre-training data mix contains significantly more English tokens than non-English tokens. To collect higher quality human annotations in non-English languages, we train a multilingual expert by branching off the pre-training run and continuing to pre-train on a data mix that consists of 90 90 % multilingual tokens. We then perform post-training on this expert following Section 4.1 . This expert model is then used to collect higher quality annotations in non-English languages until pre-training was fully complete. Multilingual data collection. Our multilingual SFT data is derived primarily from sources described below. The overall distribution is 2.4% human annotations, 44.2% data from other NLP tasks, 18.8% rejection sampled data, and 34.6% translated reasoning data. We define reasoning as the ability to perform multi-step computations and arrive at the correct final answer. Several challenges guide our approach to training models that excel in mathematical reasoning: To address these challenges, we apply the following methodologies: During the final pre-training stage, we extend the context length of Llama 3 from 8K tokens to 128K tokens (see Section 3.4 for more details). Similar to pre-training, we find that during finetuning we must carefully tune the recipe to balance short and long-context capabilities. SFT and synthetic data generation. Naively applying our existing SFT recipe with only short-context data resulted in significant regressions in long-context capabilities from pre-training, highlighting the need to incorporate long-context data in our SFT data mix. In practice, however, it is largely impractical to get humans to annotate such examples due to the tedious and time-consuming nature of reading lengthy contexts, so we predominantly rely on synthetic data to fill this gap. We use earlier versions of Llama 3 to generate synthetic data based on the key long-context use-cases: (possibly multi-turn) question-answering, summarization for long documents, and reasoning over code repositories, and describe them in greater detail below. We further categorize these synthetically generated samples based on the sequence length (16K, 32K, 64K and 128K) to enable more fine-grained targeting of input lengths. Through careful ablations, we observe that mixing 0.1 0.1 % of synthetically generated long-context data with the original short-context data optimizes the performance across both short-context and long-context benchmarks. DPO. We observe that using only short context training data in DPO did not negatively impact long-context performance as long as the SFT model is high quality in long context tasks. We suspect this is due to the fact that our DPO recipe has fewer optimizer steps than SFT. Given this finding, we keep the standard short-context recipe for DPO on top of our long-context SFT checkpoints.

<sub>§4.3.2 Multilinguality · §4.3.3 Math and Reasoning · §4.3.4 Long Context</sub>

### 14. Tool Use / Factuality / Steerability

Teaching LLMs to use tools such as search engines or code interpreters hugely expands the range of tasks they can solve, transforming them from pure chat models into more general assistants ( Nakano et al., 2021 ; Thoppilan et al., 2022 ; Parisi et al., 2022 ; Gao et al., 2023 ; Mialon et al., 2023a ; Schick et al., 2024 ) . We train Llama 3 to interact with the following tools: The resulting model is able to use these tools in a chat setup to solve the user’s queries, including in multi-turn dialogs. If a query requires multiple tool calls, the model can write a step-by-step plan, call the tools in sequence, and do reasoning after each tool call. We also improve Llama 3’s zero-shot tool use capabilities — given in-context, potentially unseen tool definitions and a user query, we train the model to generate the correct tool call. Implementation. We implement our core tools as Python objects with different methods. Zero-shot tools can be implemented as Python functions with descriptions, documentation ( i.e. , examples for how to use them), and the model only needs the function’s signature and docstring as context to generate the appropriate call. We also convert function definitions and calls to JSON format, e.g., for web API calls. All tool calls are executed by the Python interpreter, that must be enabled in the Llama 3 system prompt. Core tools can be individually enabled or disabled in the system prompt. Data collection. Different from Schick et al. (2024) , we rely on human annotations and preferences to teach Llama 3 to use tools. There are two main differences with the post-training pipeline generally used in Llama 3: To accelerate the annotation process, we start by bootstrapping basic tool use capabilities by finetuning on synthetically generated data from previous Llama 3 checkpoints. Thus, annotators have fewer edits to perform. In a similar spirit, as Llama 3 gradually improves through its development, we progressively complexify our human annotation protocols: we start by single-turn tool use annotations, before moving to tool use in dialogs, and finally annotating for multi-step tool use and data analysis. Tool datasets. To create data for tool usage applications, we leverage the following procedure: After finetuning on this synthetic data, we gather human annotations in diverse and challenging scenarios including multi-turn interactions, more than three step tool use, and instances where a tool call does not yield a satisfying answer. We augment our synthetic data with different system prompts to teach the model to use tools only when activated. To train the model to avoid calling tools for simple queries, we also add queries from easy math or question answering datasets ( Berant et al., 2013 ; Koncel-Kedziorski et al., 2016 ; Joshi et al., 2017 ; Amini et al., 2019 ) and their responses without tools, but with tools activated in system prompt. Zero-shot tool use data. We improve Llama 3 zero-shot tool use abilities (also referred to as function calling) by finetuning on a large and diverse set of partly synthetic (functions definitions, user query, corresponding call) tuples. We evaluate our model on a set of unseen tools. Hallucinations remain a major challenge for large language models. Models tend to be overconfident, even in domains where they have little knowledge. Despite these shortcomings, they are often used as knowledge bases, which can lead to risky outcomes such as the spread of misinformation. While we recognize that factuality can go beyond hallucinations, we took a hallucination-first approach here. We follow the principle that post-training should align the model to “know what it knows” rather than add knowledge ( Gekhman et al., 2024 ; Mielke et al., 2020 ) . Our primary approach involves generating data that aligns model generations with subsets of factual data present in the pre-training data. To achieve this, we develop a knowledge probing technique that takes advantage of Llama 3’s in-context abilities. This data generation process involves the following procedure: We use data generated from the knowledge probe to encourage the model to only answer questions which it has knowledge about, and refuse answering those questions that it is unsure about. Further, pre-training data is not always factually consistent or correct. We therefore also collect a limited set of labeled factuality data that deals with sensitive topics where factually contradictory or incorrect statements are prevalent. Steerability is the ability to direct the model’s actions and outcomes to meet developer and user specifications. As Llama 3 is a generic foundational model, it should be maximally steerable to different downstream use cases easily. For Llama 3, we focus on enhancing its steerability through system prompt with natural language instructions, especially around response length, format, tone and character/persona. Data collection. We collect steerability preference samples within the general English category by asking annotators to design different system prompts for Llama 3. Annotators then engage in conversations with the models to evaluate their consistency in following instructions defined in system prompts over the course of the conversation. We show an example customized system prompt used for enhancing steerability below: Modeling. After we collect the preference data, we leverage this data in reward modeling, rejection sampling, SFT, and DPO to enhance Llama 3’s steerability.

<sub>§4.3.5 Tool Use · §4.3.6 Factuality · §4.3.7 Steerability</sub>

## 总结与展望
这份模型报告里藏着一个和预算直接相关的做法：对非 Llama 模型「报告公开结果里的最好分数」，对 MCQ 设置还专门讨论了模型对设计选择的鲁棒性。也就是说，它报告的每个对比数字背后都做过一次未记录的多次比较——取最好值本身是一种预算分配（把预算花在挑结果上）。我们的 gate 每一轮只跑一次、不许挑，看起来更严格，代价是我们没有它的那种「分布感」。

**It connects to**

- `2110.14168` — 它引用了验证器那篇，说明「用验证器在候选里挑最好的」已经是模型报告的一部分；挑最好与取最好分数是同一个统计问题的两种规模。
- `2210.03629` — ReAct 引用了它、它也引用了 ReAct，说明 agent 范式的实验预算（每步一次观测）已经进入模型报告的评估流程。

## 不足之处
**The authors say:** We conducted extensive measurement and mitigation on a wide variety of risks to safe usage of Llama 3. However, no testing can be guaranteed to be exhaustive in identifying every possible risk. Llama 3 may still generate harmful content due to training on various datasets, particularly for languages beyond English and when prompt engineered by skilled adversarial red teamers. Malicious developers or adversarial users may find new ways to jailbreak our models and use them for various nefarious usecases. We will continue to proactively identify risks, conduct research on mitigation methods, and we encourage developers to consider responsibility in every aspect — from model development to deployment to users. We hope developers will leverage and contribute to the tools we release in our open-source system-level safety suite.

**What a reader should still not conclude**

- 机制段抽到的是 Results 一节的导语与 MCQ 鲁棒性小节，真正的评估预算（每项跑几次）贯穿全文表格，摘录读不到。
- 「取公开最好值」这个做法对一个自建 evalset 无法照搬：我们没有别人的公开结果可挑，只能自己重复跑。

<sub>§5.4.8 Limitations</sub>

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

![Example functions from the exponential decay kernel. (a) Example functions from our basis set with α = 1.0 \alpha=1.0 and β = 0.5 \beta=0.5 . (b) Samples from a Gaussian process with this covariance function. (c) Samples from a Gaussian process conditioned on the curves starting at a positive number and with an added Ornstein-Uhlenbeck kernel to simulate natural training curves.](https://arxiv.org/html/1406.3896v1/basis_functions.svg)

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
  N0 --> N1
  N1 --> N2
```

![Promotion scheme for SHA with n = 9 n=9 , r = 1 r=1 , R = 9 R=9 , and η = 3 \eta=3 .](https://arxiv.org/html/1810.05934v5/sha_pic.jpeg)

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
ReAct 的预算单位是「一步」：每一步要么思考、要么调一次维基 API，观测成本由环境决定。它对预算与停止这个方向的意义是把「花多少」从轮次级下沉到步级——我们的每一轮是一个 agent 会话，里面有多少步、哪一步最贵，账本里完全没有记录，于是「省预算」只能省在最粗的粒度上。

**It connects to**

- `2407.21783` — Llama 3 的评估流程吸收了 ReAct 式 agent，说明「步」已经成为评估成本的基本单位；我们仍在用「轮」。
- `2110.14168` — 一个用更多步去检索，一个用更多采样去搜索；两种「多花一点」的边际收益从未被放在同一张图上比较。

## 不足之处
**What a reader should still not conclude**

- 它没有报告任何成本数字，只报告了准确率；把它的步数当预算证据是推断不是引用。
- 机制段抽到的是任务域与动作空间定义，停止条件（何时结束一次 episode）在实验设置里。

---

# Training Verifiers to Solve Math Word Problems

arXiv:2110.14168 · 2021 · [source](https://arxiv.org/html/2110.14168)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
In recent years, large language models have demonstrated impressive skills across many diverse tasks ( Wang et al., 2019 , Brown et al., 2020 ) . Kaplan et al. (2020) describe the consistent benefits of increasing model size, characterizing scaling trends that hold across many orders of magnitude. However, even the largest models falter when required to perform multi-step mathematical reasoning ( Hendrycks et al., 2021 ) . Model samples frequently contain catastrophic mistakes, even after the model has been appropriately finetuned. Mathematical reasoning thus reveals a critical weakness in modern language models.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§4 Methods"]
  N1["§4.1 Finetuning"]
  N2["§4.2 Verification"]
  N0 --> N1
  N1 --> N2
```

![A comparison between finetuning and verification using 6B and 175B model sizes. Verification considers 100 solutions per problem. Mean and standard deviation is shown across 3 runs, except for 175B verification which shows only a single run.](https://arxiv.org/html/2110.14168v2/full_completion_vf_6b.svg)

*A comparison between finetuning and verification using 6B and 175B model sizes. Verification considers 100 solutions per problem. Mean and standard deviation is shown across 3 runs, except for 175B verification which shows only a single run.*

<sub>figure: `2110.14168v2/full_completion_vf_6b.svg`</sub>

## 机制
### 1. Methods

We investigate two methods to solve problems in GSM8K: finetuning and verification. Finetuning, our baseline method, uses the same language modeling objective as the generative pretraining in GPT-3 ( Brown et al., 2020 ) . At test time, we judge performance by autoregressively sampling a single low temperature solution and checking whether the final answer is correct. In contrast, verification consists of sampling multiple high temperature solutions, assigning each solution a score, and outputting the highest ranked solution. Verifiers are trained to judge the correctness of solutions, with the training signal determined solely by whether or not the solution reached the correct final answer. For both methods, we use models from the GPT-3 family as our initialization, primarily focusing on the 175B and 6B model sizes. The 175B model is the largest and produces the most impressive results, while the 6B model is significantly more convenient for research purposes. We discuss hyperparameter choices in Appendix B . Our models frequently fail to accurately perform calculations. Although larger models make fewer arithmetic mistakes than smaller models, this remains a common source of errors. To mitigate this issue, we train all models to use a calculator by injecting calculation annotations into the training set. At test time, a calculator will override sampling when the model chooses to use these annotations. Details can be found in Appendix C . Finetune a model (the “generator”) for 2 epochs on the training set. Sample 100 completions from the generator for each training problem and label each solution as correct or incorrect. Train a verifier for a single epoch on this dataset.

<sub>§4 Methods</sub>

### 2. Finetuning

We perform finetuning by updating model parameters to minimize the cross-entropy loss over all training tokens. Figure 2 shows test performance after finetuning on training sets of varying sizes for 20 epochs. We visualize the same data both as a function of training set size and as a function of model size. Test performance is determined by a single low temperature ( T = 0 T=0 ) sample for each test problem. Unsurprisingly, we see that the 175B model significantly outperforms the smaller models. Assuming a log-linear trend, we can naively extrapolate these results to estimate that a model with 10 16 10^{16} parameters would be required to reach an 80 % 80\% solve rate, when using the full GSM8K training set. It is even harder to extrapolate along the data dimension, since performance does not appear to follow a log-linear trend. Nevertheless, it appears likely that the 175B model would require at least two additional orders of magnitude of training data to reach an 80 % 80\% solve rate. In Figure 3 , we show how 6B test performance varies over the course of 100 training epochs. We use test@N to denote the percentage of problems solved correctly at least once when allowing the model to make N separate guesses for each problem. We use a low temperature ( T = 0 T=0 ) to generate test@1 samples and we use a higher temperature ( T = 0.7 T=0.7 ) to generate test@100 samples. Both temperature values were chosen empirically to produce the best results. Test@1 performance improves approximately monotonically, even though we quickly begin overfitting on test loss. Unfortunately, test@100 performance degrades much more sharply than test@1 as we increase the number of epochs. This is to be expected: as the model repeatedly encounters the same data, it becomes increasingly uncalibrated and overconfident in its predictions. At test time, this overconfidence leads to poor coverage of the solution space, an effect which only becomes noticeable when we are considering multiple samples at test time. Choosing a model with good coverage is critical to successfully train verifiers. Empirically, we see that test@100 performance peaks within the first few epochs. For this reason, we use models trained for 2 epochs to generate samples for training verifiers. We provide several example solutions from 6B and 175B models in Appendix D . We also note that it is important to allow the model to generate the full natural language solution before outputting a final answer. If we instead finetune a 6B model to directly output the final answer without any intermediate steps, performance drops drastically from 20.6% to 5.2%.

<sub>§4.1 Finetuning</sub>

### 3. Verification

To improve upon the finetuning baseline, we train verifiers to judge the correctness of model-generated solutions and search against these verifiers at test time. Conditioned on the problem and a candidate solution, the verifier outputs the probability that the solution is correct. Training solutions are labeled as correct or incorrect based solely on whether they reach the correct final answer. In practice, some solutions will reach the correct final answer using flawed reasoning, leading to false positives. As shown in Figure 4 , we train the verifier as follows: Training for 2 epochs is enough for the generator to learn basic skills in this domain. We choose not to train for longer, since the diversity of generated solutions begins to collapse after this point, as shown in Figure 3 . We train separate generator and verifier models to limit the generator’s training and prevent overfitting, but in principle, it should be possible to combine these models. Unless otherwise specified, we use the same model size for the generator and the verifier. In addition to predicting solution correctness, we also train the verifier with the same language modeling objective as the generator. This serves as a valuable auxiliary objective for the verifier. We discuss additional verifier training details in Appendix E . At test time, we sample 100 completions to each test problem, rank them with the verifier, and then return the one with the highest verifier score. A comparison between verification and finetuning is shown in Figure 5 for both the 6B and 175B model sizes. We find that it is not beneficial to use verification at low dataset sizes. We believe this is due to the pressure to overfit to the correct answer: with small datasets, overfitting to the correct answer happens faster than learning more generalizable properties of correct reasoning. However, once we use a sufficiently large dataset, we see a strong boost from verifiers. It’s interesting to note that the 175B verifiers “take off” earlier than the 6B verifiers, requiring fewer training problems to surpass the finetuning baseline. See Appendix D for example solutions found by verifiers and Appendix F for a visualization of verifier confidence.

<sub>§4.2 Verification</sub>

## 总结与展望
它把「测试时搜索」正式化了：训练一个验证器判每个候选解答的对错，然后在测试时采样多个解答并用验证器挑最好的。这本身就是一次预算分配——采几个、挑多严——而论文最有价值的一句是它明确把「微调」与「验证」当成两条独立的路来比较。我们的候选数与 killRate 阈值是同一枚硬币的两面，却从来没有一起被调过。

**It connects to**

- `2305.20050` — 同一队的下一站：把整题对错的验证器换成逐步的过程奖励，粒度更密、标注更贵。
- `1703.06240` — 验证器挑选是「用便宜信号筛候选」，多保真 BO 是「用便宜保真度筛配置」，两者都是「先便宜地筛，再贵地确认」，但前者从不检查筛与选的排序是否一致。

## 不足之处
**What a reader should still not conclude**

- 机制段抽到的是 Methods 一节的导语与两个子节开头，验证器的规模（6B）与挑选规则在别处。
- GSM8K 的答案可自动判定，所以「挑最好的」有 ground truth 兜底；我们的 killRate 没有。

---

# GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning

arXiv:2507.19457 · 2026 · [source](https://arxiv.org/html/2507.19457)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Large language models (LLMs) have enabled development of agents and systems that combine fuzzy natural-language specifications with tools like retrieval and code execution. This raises the question of how LLMs should be optimized for downstream performance. One popular approach is Reinforcement Learning with Verifiable Rewards (RLVR), e.g. with Group Relative Policy Optimization (GRPO) ( Shao et al., 2024 ) , which treats success metrics as end-of-rollout scalar rewards used to estimate policy gradients ( Lambert, 2025 ) . While these RL approaches are effective, they typically require tens of thousands of rollouts in practice to fit new tasks. For example, recent works leveraging GRPO typically use up to hundreds of thousands of rollouts for training ( Chen et al., 2025c ; Wu et al., 2025b ; Zhang et al., 2025 ; Jin et al., 2025 ; Si et al., 2025 ; Wang et al., 2025a ; Chen et al., 2025a ; Sha et al., 2025 ; Lin et al., 2025a ; Peng et al., 2025 ; Song et al., 2025 ) . This sample inefficiency can quickly become a serious bottleneck: many downstream LLM applications invoke expensive tool calls, have limited inference budget for sampling from the LLM itself, or simply cannot finetune the weights of the largest or best-performing LLMs.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 GEPA: Reflective Prompt Evolution"]
  N1["§3.1 Pareto-based candidate selection"]
  N0 --> N1
```

![A comparison of learning behavior of the GEPA prompt optimizer against a state-of-the-art prompt optimizer (MIPROv2) and GRPO (24,000 rollouts). As more rollouts are sampled, the prompt optimizers can learn much more quickly than GRPO. GEPA substantially outperforms both GRPO and MIPROv2 in final score. The Test-set star markers demonstrate the performance gap in a held-out set of questions.](https://arxiv.org/html/2507.19457v2/HotpotQABench_qwen3-8b_True_rollout_vs_score.svg)

*A comparison of learning behavior of the GEPA prompt optimizer against a state-of-the-art prompt optimizer (MIPROv2) and GRPO (24,000 rollouts). As more rollouts are sampled, the prompt optimizers can learn much more quickly than GRPO. GEPA substantially outperforms both GRPO and MIPROv2 in final score. The Test-set star markers demonstrate the performance gap in a held-out set of questions.*

<sub>figure: `2507.19457v2/HotpotQABench_qwen3-8b_True_rollout_vs_score.svg`</sub>

## 机制
### 1. GEPA: Reflective Prompt Evolution

We introduce GEPA (Genetic-Pareto), a sample-efficient optimizer for compound AI systems motivated by three core principles: genetic prompt evolution (Section 3 ), reflection using natural language feedback (Section 3 ), and Pareto-based candidate selection (Section 3.1 ). Figure 3 gives an overview of GEPA and the full GEPA algorithm is formalized in Figure 4 . GEPA receives the following inputs: A system Φ \Phi instantiated with simple prompts to be optimized, training dataset D t ​ r ​ a ​ i ​ n D_{train} (consisting of task instances ( x , m ) (x,m) as described in Section 2 ), the standard evaluation metric μ \mu for the task, a feedback function μ f \mu_{f} (introduced in Section 3 ) and the total rollout budget B B . Note that GEPA evolves only the set of prompts, denoted as Π Φ \Pi_{\Phi} , whereas the underlying LLM weights, denoted by Θ Φ \Theta_{\Phi} remains fixed. Genetic Optimization Loop: Given an AI system Φ \Phi , the goal is to identify parameters Π Φ \Pi_{\Phi} that maximize task performance. GEPA begins with a candidate pool 𝒫 \mathcal{P} containing only the base system, where each candidate is a concrete instantiation of ⟨ Π , Θ f ​ r ​ o ​ z ​ e ​ n ⟩ Φ \langle\Pi,\Theta_{frozen}\rangle_{\Phi} . It then enters an optimization loop, repeatedly proposing new candidates until the evaluation budget is exhausted. Candidates are derived from existing ones via reflective mutation or crossover , guided by feedback from rollouts, with each inheriting learning signals from its parents and its own rollout so that GEPA accumulates knowledge along the genetic tree. In each iteration, GEPA (i) selects promising candidates, (ii) proposes and evaluates a variant on a minibatch of tasks, and (iii) if it outperforms its parent(s), adds it to 𝒫 \mathcal{P} with ancestry records and evaluate on D p ​ a ​ r ​ e ​ t ​ o D_{pareto} , the validation set used for selection. After the budget is exhausted, GEPA returns the candidate with the best aggregate performance on D p ​ a ​ r ​ e ​ t ​ o D_{pareto} . Reflective Prompt Mutation: Natural language traces generated during the execution of a compound AI system offer rich visibility into the behavior and responsibilities of each module, as they capture the intermediate inferences and underlying reasoning steps. When these traces are paired with the final outcome of the system (e.g., success or failure), they provide substantial diagnostic value, allowing practitioners to trace errors or successes back to specific decisions made at the module level. LLMs can leverage these traces via reflection to perform implicit credit assignment, attributing responsibility for the final outcome to the relevant modules. This process of reflection can then be used to make targeted updates to individual modules, making large and effective updates to the whole system’s behavior. Given a candidate to mutate in the current iteration of the optimization loop (stochastically selected from the Pareto-frontier, see Section 3.1 below), GEPA executes the selected candidate on a stochastically sampled minibatch of input queries from the trainset, tracing the program’s execution. From the execution traces, GEPA extracts the module’s inputs, outputs, and reasoning, and calls the feedback function μ f \mu_{f} , which returns a numeric score and text feedback including details about the evaluation (like compiler error messages, failed rubrics, etc.). GEPA selects the module (among the | M | |M| modules that the language program contains) to be updated based on a policy (round-robin), and a reflection LM is then shown the (current prompt, language program trajectory, score, feedback) with the task to reflectively attribute successes or failures to prompt elements and propose revised instructions. The updated module, with the rest of the language program, is evaluated again on the minibatch, and if the score improves, then the new program is added to the candidate pool. The meta-prompt for reflective prompt updates is shown in Appendix C and the full algorithm is presented in Algorithm 1 . Evaluation traces as diagnostic signals: The text that LLMs produce is the execution trace of the AI system. The text that the environment produces to compute the reward (e.g. compiler error messages before giving reward 0) is the evaluation trace . Beyond reflection on execution traces, we identify a second valuable source of diagnostic information in the evaluation traces. Many evaluation metrics apply rich strategies (e.g., code evaluation may involve compilation, execution, and profiling), producing natural language traces before computing a scalar reward. We propose leveraging these evaluation traces for reflective credit assignment and targeted prompt updates. GEPA achieves this by extending rewards μ \mu into a feedback function μ f \mu_{f} that extracts textual traces during evaluation and returns them with the final score as feedback_text . When available, such feedback can even be module-specific (e.g. in multi-hop systems the evaluator may provide feedback after each hop). In practice, there are domains where human-graders are able to rate the AI system’s responses, along with providing detailed feedback justifying their scalar ratings. When available, D t ​ r ​ a ​ i ​ n D_{train} can be augmented with such human-written explanations for each instance; during reflection, and GEPA can consume these explanations as auxiliary feedback_text to guide targeted prompt updates, even when natural-language feedback from rollouts is limited or unavailable.

<sub>§3 GEPA: Reflective Prompt Evolution</sub>

### 2. Pareto-based candidate selection

GEPA is a highly modular algorithm that supports various strategies for candidate selection, with the choice of strategy governing the exploration–exploitation tradeoff. A naive approach is to always select the best-performing candidate, but this often traps the optimizer in a local optimum: once a dominant strategy is found, it becomes difficult to surpass, and the optimizer exhausts its budget without learning new, potentially better strategies. Figure 6(a) illustrates this behavior: after finding one new strategy (the first child node), the search repeatedly attempts to refine it, fails to improve, and ultimately depletes the budget. To address this, GEPA employs a Pareto-based “illumination" strategy ( Mouret and Clune, 2015 ) , shown in Algorithm 2 . For each training instance, GEPA records the highest score across all candidates, forming a Pareto frontier. Candidates that achieve the best score on at least one task are retained, while strictly dominated ones are pruned. From this pruned set, GEPA stochastically samples a candidate, weighting probabilities by how many tasks each candidate leads. This strategy helps GEPA escape local optima without inflating the search, efficiently balancing exploration and exploitation by focusing resources on candidates that embody “winning” strategies within the optimization budget.

<sub>§3.1 Pareto-based candidate selection</sub>

## 总结与展望
在这条线上 GEPA 的意义是「预算可以花在思考上」：它用验证集分数做早停、用自然语言反馈替代梯度，论文自己承认它和 RL 的区别在于「把预算从 rollout 挪到反思」。对我们的直接启示是：如果我们的候选每一轮都要真跑一次代码，那么最贵的不是生成而是验证，而验证恰恰是最难省的一环。

**It connects to**

- `2506.13131` — AlphaEvolve 也是「让模型多做几轮便宜评估」，区别是它的评估完全自动且便宜，GEPA 的评估是验证集分数。
- `2003.10865` — 一个在「保真度」维度上省，一个在「rollout 数量」维度上省；两条省法都要先有一个可信的低保真度信号。

## 不足之处
**What a reader should still not conclude**

- 它的早停依赖一个独立的验证集，我们没有；在我们这里把 val 当早停依据，等于用同一批数据既训练又判分。
- 机制段只抽到了 Evaluation 一节，反思如何生成（以及它为何比梯度更省）的机制在方法章。

---

# Multi-fidelity Bayesian Optimisation with Continuous Approximations

arXiv:1703.06240 · 2017 · [source](https://arxiv.org/html/1703.06240)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
Many tasks in scientific and engineering applications can be framed as bandit optimisation problems, where we need to sequentially evaluate a noisy black-box function f : 𝒳 → ℝ f:\mathcal{X}\rightarrow\mathbb{R} with the goal of finding its optimum. Some applications include hyper-parameter tuning in machine learning ( Snoek et al., 2012 ; Hutter et al., 2011 ) , optimal policy search ( Lizotte et al., 2007 ; Martinez-Cantin et al., 2007 ) and scientific experiments ( Parkinson et al., 2006 ; Gonzalez et al., 2014 ) . Typically, in such applications, each function evaluation is expensive and historically, the bandit literature has focused on developing methods for finding the optimum while keeping the number of evaluations to f f at a minimum.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§3 BOCA : Bayesian Optimisation with Continuous Approximations"]
  N1["§3.1 Fidelity Selection Criterion"]
  N0 --> N1
```

![Samples drawn from a GP with 0 0 mean and SE kernel with bandwidths h = 0.01 , h = 0.15 , 0.5 h=0.01,h=0.15,0.5 . Samples tend to be smoother across the domain for large bandwidths.](https://arxiv.org/html/1703.06240v1/gp_bw_sample.png)

*Samples drawn from a GP with 0 0 mean and SE kernel with bandwidths h = 0.01 , h = 0.15 , 0.5 h=0.01,h=0.15,0.5 . Samples tend to be smoother across the domain for large bandwidths.*

<sub>figure: `1703.06240v1/gp_bw_sample.png`</sub>

## 机制
### 1. BOCA : Bayesian Optimisation with Continuous Approximations

BOCA is a sequential strategy to select a domain point x t ∈ 𝒳 x_{t}\in\mathcal{X} and fidelity z t ∈ 𝒵 z_{t}\in\mathcal{Z} at time t t based on previous observations. At time t t , we will first construct an upper confidence bound φ t \varphi_{t} for the function f f we wish to optimise. It takes the form, Recall from ( 5 ) that μ t − 1 \mu_{t-1} and σ t − 1 \sigma_{t-1} are the posterior mean and standard deviation of f f using the observations from the previous t − 1 t-1 time steps at all fidelities, i.e. the entire 𝒵 × 𝒳 \mathcal{Z}\times\mathcal{X} space. We will specify β t \beta_{t} in theorems 1 , 8 . Following other UCB algorithms, our next point x t x_{t} in the domain 𝒳 \mathcal{X} for evaluating g g is a maximiser of φ t \varphi_{t} , i.e. x t ∈ argmax x ∈ 𝒳 φ t ​ ( x ) x_{t}\in\mathop{\mathrm{argmax}}_{x\in\mathcal{X}}\varphi_{t}(x) . Next, we need to determine the fidelity z t ∈ 𝒵 z_{t}\in\mathcal{Z} to query g g . For this we will first select a subset 𝒵 t ​ ( x t ) \mathcal{Z}_{t}(x_{t}) of 𝒵 \mathcal{Z} as follows, Here, ξ \xi is the information gap function in ( 4 ) and τ t − 1 \tau_{t-1} is the posterior standard deviation of g g , and p , d p,d are the dimensionalities of 𝒵 , 𝒳 \mathcal{Z},\mathcal{X} . The exponent q q depends on the kernel. For the SE kernel, q = 1 / ( p + d + 2 ) q=1/(p+d+2) . We filter out the fidelities we consider at time t t using three conditions as specified above. We elaborate on these conditions in more detail in Section 3.1 . If 𝒵 t \mathcal{Z}_{t} is not empty, we choose the cheapest fidelity in this set, i.e. z t ∈ argmin z ∈ 𝒵 t λ ⁡ ( z ) z_{t}\in\mathop{\mathrm{argmin}}_{z\in\mathcal{Z}_{t}}\lambda(z) . If 𝒵 t \mathcal{Z}_{t} is empty, we choose z t = z ∙ z_{t}=z_{\bullet} . We have summarised the resulting procedure below in Algorithm 1 . An important advantage of BOCA is that it only requires specifying the GP hyper-parameters for g g such as the kernel κ \kappa . In practice, this can be achieved by various effective heuristics such as maximising the GP marginal likelihood or cross validation which are standard in most BO methods. In contrast, MF-GP-UCB of Kandasamy et al. (2016a) requires tuning several other hyper-parameters. Set ν 0 ​ ( ⋅ ) ← 𝟎 \;\;\nu_{0}(\cdot)\leftarrow{\bf 0} , τ 0 ​ ( ⋅ ) ← κ ​ ( ⋅ , ⋅ ) 1 / 2 \;\;\tau_{0}(\cdot)\leftarrow\kappa(\cdot,\cdot)^{1/2} , 𝒟 0 ← ∅ \;\;\mathcal{D}_{0}\leftarrow\varnothing . x t ← argmax x ∈ 𝒳 φ t ​ ( x ) x_{t}\leftarrow\mathop{\mathrm{argmax}}_{x\in\mathcal{X}}\,\varphi_{t}(x) . See ( 6 ) z t ← argmin z ∈ 𝒵 t ​ ( x t ) ∪ { z ∙ } λ ⁡ ( z ) z_{t}\leftarrow\mathop{\mathrm{argmin}}_{z\in\,\mathcal{Z}_{t}(x_{t})\cup\{z_{\bullet}\}}\,\lambda(z) . See ( 7 ) y t ← y_{t}\leftarrow Query g g at ( z t , x t ) (z_{t},x_{t}) . 𝒟 t ← 𝒟 t − 1 ∪ { ( z t , x t , y t ) } \mathcal{D}_{t}\leftarrow\mathcal{D}_{t-1}\cup\{(z_{t},x_{t},y_{t})\} . Update posterior mean ν t \nu_{t} , and standard deviation τ t \tau_{t} for g g conditioned on 𝒟 t \mathcal{D}_{t} .

<sub>§3 BOCA : Bayesian Optimisation with Continuous Approximations</sub>

### 2. Fidelity Selection Criterion

We will now provide an intuitive justification for the three conditions in the selection criterion for z t z_{t} , i.e., equation ( 7 ). Recall that we query z ∙ z_{\bullet} only if 𝒵 t ​ ( x t ) \mathcal{Z}_{t}(x_{t}) is empty. The first condition, λ ⁡ ( z ) < λ ⁡ ( z ∙ ) \lambda(z)<\lambda(z_{\bullet}) is fairly obvious; since we wish to optimise g ⁡ ( z ∙ , ⋅ ) g(z_{\bullet},\cdot) and since we are not rewarded for queries at other fidelities, there is no reason to consider fidelities that are more expensive than z ∙ z_{\bullet} . The second condition, τ t − 1 ​ ( z , x t ) > γ ⁡ ( z ) \tau_{t-1}(z,x_{t})>\gamma(z) says that we will only consider fidelities where the posterior variance is larger than a threshold γ ⁡ ( z ) = κ 0 ​ ξ ​ ( z ) ​ ( λ ⁡ ( z ) / λ ⁡ ( z ∙ ) ) 1 / ( p + d + 2 ) \gamma(z)=\sqrt{\kappa_{0}}\xi(z)(\lambda(z)/\lambda(z_{\bullet}))^{1/(p+d+2)} , which depends critically on two quantities, the cost function λ \lambda and the information gap ξ \xi . As a first step towards parsing this condition, observe that a reasonable multi-fidelity strategy should be inclined to query cheap fidelities and learn about g g before querying expensive fidelities. Now notice that γ ⁡ ( z ) \gamma(z) is monotonically increasing in λ ⁡ ( z ) \lambda(z) , therefore, it becomes easier for a cheap z z to satisfy τ t − 1 ​ ( z , x t ) > γ ⁡ ( z ) \tau_{t-1}(z,x_{t})>\gamma(z) and be included in 𝒵 t \mathcal{Z}_{t} at time t t . Moreover, since we choose z t z_{t} to be the minimiser of λ \lambda in 𝒵 t \mathcal{Z}_{t} , a cheaper fidelity will always be chosen over expensive ones if included in 𝒵 t \mathcal{Z}_{t} . Second, if a particular fidelity z z is far away from z ∙ z_{\bullet} , it probably contains less information about g ⁡ ( z ∙ , ⋅ ) g(z_{\bullet},\cdot) . Again, a reasonable multi-fidelity strategy should be discouraged from making such queries. This is precisely the role of the information gap ξ \xi which is increasing with ‖ z − z ∙ ‖ \|z-z_{\bullet}\| . As z z moves away from z ∙ z_{\bullet} , γ ⁡ ( z ) \gamma(z) increases and it becomes harder to satisfy τ t − 1 ​ ( z , x t ) > γ ⁡ ( z ) \tau_{t-1}(z,x_{t})>\gamma(z) . Therefore, such a z z is less likely to be included in 𝒵 t ​ ( x t ) \mathcal{Z}_{t}(x_{t}) and be considered for evaluation. Our analysis reveals that setting γ \gamma as in ( 7 ) is a reasonable trade off between cost and information in the approximations available to us; cheaper fidelities cost less, but provide less accurate information about the function f f we wish to optimise. It is worth noting that the second condition is similar in spirit to Kandasamy et al. (2016a) who proceed from a lower to higher fidelity only when the lower fidelity variance is smaller than a threshold. However, while they treat the threshold as a hyper-parameter, we are able to explicitly specify theoretically motivated values. The third condition in ( 7 ) is ξ ⁡ ( z ) > ξ ⁡ ( p ) / β t 1 / 2 \xi(z)>\xi(\sqrt{p})/\beta^{1/2}_{t} . Since ξ \xi is increasing as we move away from z ∙ z_{\bullet} , it says we should exclude fidelities inside a (small) neighbourhood of z ∙ z_{\bullet} . Recall that if 𝒵 t \mathcal{Z}_{t} is empty, BOCA will choose z ∙ z_{\bullet} by default. But when it is not empty, we want to prevent situations where we get arbitrarily close to z ∙ z_{\bullet} but not actually query at z ∙ z_{\bullet} . Such pathologies can occur when we are dealing with a continuum of fidelities and this condition forces BOCA to pick z ∙ z_{\bullet} instead of querying very close to it. Observe that since β t \beta_{t} is increasing with t t , this neighborhood is shrinking with time and therefore the algorithm will eventually have the opportunity to evaluate fidelities close to z ∙ z_{\bullet} .

<sub>§3.1 Fidelity Selection Criterion</sub>

## 总结与展望
这篇是多保真贝叶斯的理论骨架：给每个保真度一个已知代价 λ(z)，在高斯过程上把「参数 × 保真度」当联合空间建模，于是「该在哪个保真度上多花一次」变成一个可以算的采集函数。它对我们最硬的一句话是隐含的：低保真度与高保真度之间的关系是被**学出来**的，不是被假定的。我们的 cheap stage 与 verifier 之间没有任何这样的模型，只有一次性的排序比较。

**It connects to**

- `2003.10865` — BOHB/DEHB 那条线把同样的保真度思想搬到超参搜索的调度里，并用「只在最大资源上做结论」来兜底；这篇是它的数学来源之一。
- `2110.14168` — 验证器挑选可以看成一个只有两个保真度（便宜的打分 vs 真跑）的特例，而这套框架会要求先量两者的一致性。

## 不足之处
**What a reader should still not conclude**

- 它假设代价函数已知且保真度可连续参数化；我们的 cheap stage 与 verifier 是两个不同命令，不存在一个可插值的 z。
- 机制段抽到的是 Preliminaries 的定义，采集函数与收敛性在定理部分。

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

![Top : the macro skeleton of each architecture candidate. Bottom-left : examples of neural cell with 4 nodes. Each cell is a directed acyclic graph, where each edge is associated with an operation selected from a predefined operation set as shown in the Bottom-right .](https://arxiv.org/html/2001.00326v2/DAG-Model.svg)

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
AlphaEvolve 把「多少钱一次评估」压到极低：被进化的程序自带一个自动评估器，于是一天可以跑成千上万次候选。它在方法章里强调「同一问题可以用很不同的抽象层次来进化」——同一个预算下，改抽象层次比改预算更有效。这条对我们尤其刺：我们的候选是整棵链的 spec，抽象层次被钉死在「换一个 mutation kind」上。

**It connects to**

- `2507.19457` — 两者都在「让优化器多想」而不是「让模型多跑」，区别是 AlphaEvolve 的评估器便宜到可以无限跑，GEPA 不能。
- `1703.06240` — 多保真 BO 在「保真度」这一维上省，AlphaEvolve 在「抽象层次」这一维上省；后者是这篇独有的贡献，也是我们完全没利用的一维。

## 不足之处
**The authors say:** AlphaEvolve demonstrates the surprising power of combining state-of-the-art LLMs with automated evaluation metrics within an evolutionary framework, which can lead to new discoveries on decades-old mathematical problems as well as practical improvements to highly optimized compute stacks.

**What a reader should still not conclude**

- 它的评估便宜是因为任务是数学/算法这种可自动判定的对象；搬到一个需要跑测试与人工判断的仓库，前提不成立。
- 机制段抽到的是总述、API 与抽象层次三段，进化循环里的选择与淘汰规则不在摘录里。

<sub>§6 Discussion</sub>

---

# Model-based Asynchronous Hyperparameter and Neural Architecture Search

arXiv:2003.10865 · 2020 · [source](https://arxiv.org/html/2003.10865)

> Written by an agent that read the body (DeepSeek Harness, 2026-11-24) after reading the paper; the mechanism quotes are the paper’s own words.

## 出发点
The goal of hyperparameter and neural architecture search (HNAS) is to automate the process of finding the architecture or hyperparameters 𝒙 ⋆ ∈ arg ​ min 𝒙 ∈ 𝒳 ⁡ f ​ ( 𝒙 ) {\mathbold{x}}_{\star}\in\argmin_{{\mathbold{x}}\in\mathcal{X}}f({\mathbold{x}}) for a deep learning algorithm which minimizes a validation loss f ⁡ ( 𝒙 ) f({\mathbold{x}}) , observed through noise: y i = f ( 𝒙 i ) + ϵ i , ϵ i ∼ 𝒩 ( 0 , σ 2 ) , i = 1 , … , n y_{i}=f({\mathbold{x}}_{i})+\epsilon_{i},\quad\epsilon_{i}\sim\mathcal{N}(0,\sigma^{2}),i=1,\dots,n . Bayesian optimization (BO) [ 13 , 28 ] is an effective model-based approach for these expensive optimization problems. It constructs a probabilistic surrogate model of the loss function p ⁡ ( f ∣ 𝒟 ) p(f\mid\mathcal{D}) based on previous evaluations 𝒟 = { ( 𝒙 i , y i ) } i = 1 n \mathcal{D}=\{({\mathbold{x}}_{i},y_{i})\}_{i=1}^{n} . Searching for the global minimum of f f is then driven by trading off exploration in regions where our model is uncertain and exploitation in regions where the global optimum is assumed to be located.

<sub>§1 Introduction</sub>

## Pipeline
```mermaid
flowchart LR
  N0["§2 Synchronous and Asynchronous Multi-Fidelity Scheduling"]
  N1["§3 Model-based Asynchronous Multi-Fidelity Optimization"]
  N0 --> N1
```

![Comparison of asynchronous HB and BOHB (stopping and promotion scheduling variants). Left: MLP on electricity (4 workers). Right: NASBench201 on CIFAR-10 (8 workers). A-BOHB clearly outperforms A-HB. Differences between the scheduling variants are insignificant for MLP, and more pronounced for NAS.](https://arxiv.org/html/2003.10865v2/nasbench201_cifar10-valid_async.png)

*Comparison of asynchronous HB and BOHB (stopping and promotion scheduling variants). Left: MLP on electricity (4 workers). Right: NASBench201 on CIFAR-10 (8 workers). A-BOHB clearly outperforms A-HB. Differences between the scheduling variants are insignificant for MLP, and more pronounced for NAS.*

<sub>figure: `2003.10865v2/nasbench201_cifar10-valid_async.png`</sub>

## 机制
### 1. Synchronous and Asynchronous Multi-Fidelity Scheduling

Multi-fidelity HNAS considers an objective f ⁡ ( 𝒙 , r ) f({\mathbold{x}},r) , indexed by the resource level r ∈ { r min , … , r max } r\in\{r_{\text{min}},\dotsc,r_{\text{max}}\} . The target function of interest is f ⁡ ( 𝒙 ) = f ⁡ ( 𝒙 , r max ) f({\mathbold{x}})=f({\mathbold{x}},r_{\text{max}}) , while evaluations of f ⁡ ( 𝒙 , r ) f({\mathbold{x}},r) for r < r max r<r_{\text{max}} are lower-fidelity evaluations that may be correlated with f ⁡ ( 𝒙 ) f({\mathbold{x}}) and therefore help guide the search. Here, we consider the number of training epochs ( i.e. , full sweeps over the data) as the resource r r , though other choices can be sensible as well ( e.g. , training subset ratio [ 17 ] ). Parallel multi-fidelity HNAS methods need to make two kinds of decisions: choosing configurations to evaluate and scheduling their evaluations (including resource allocation). Scheduling decisions happen at certain resource rungs , chosen according to the SH principle [ 12 ] . Let η ∈ { 2 , 3 , 4 } \eta\in\{2,3,4\} be the halving constant, r max r_{\text{max}} and r min r_{\text{min}} the maximum and minimum resource level for an evaluation (assuming, for simplicity, that r max / r min = η K r_{\text{max}}/r_{\text{min}}=\eta^{K} ). The full set of rungs is ℛ = { r min η k | k = 0 , … , K } \mathcal{R}=\{r_{\text{min}}\eta^{k}\;|\;k=0,\dots,K\} . Then, brackets are (ordered) subsets B s = { r min η k + s | k = 0 , … , K − s } ⊆ ℛ B_{s}=\{r_{\text{min}}\eta^{k+s}\;|\;k=0,\dots,K-s\}\subseteq\mathcal{R} , where s = 0 , … , K s=0,\dots,K . In the sequel, the term “rung” will be overloaded to both mean the resource level at which stop/go decisions are made, and the list of configs (with metric values) which reached this level. We distinguish between synchronous and asynchronous scheduling. The former is detailed in [ 20 , 8 ] . In a nutshell, each rung of each bracket has an a priori fixed size ( i.e. , number of slots for configs evaluated until the rung level), the size ratio between successive rungs being η − 1 \eta^{-1} . Hyperparameter configurations promoted to a rung are evaluated until the corresponding resource level, making use of parallel computation. Once all of them finish, the η − 1 \eta^{-1} fraction of top performing configurations are promoted to the next rung while the others are terminated. Each rung is a synchronization point for many training tasks: it has to be populated entirely before any configuration can be promoted. In an outer loop, the HB algorithm cycles over brackets s = 0 , … , K s=0,\dots,K periodically until the total budget is spent. The original SH algorithm is obtained as a special case, using only the single bracket B 0 B_{0} . We provide a unified perspective on two different asynchronous generalizations of HB, proposed in prior work. For any hyperparameter and architecture configuration, its bracket index s ∈ { 0 , … , K } s\in\{0,\dots,K\} determines the rung levels B s B_{s} at which scheduling decisions are made, sampled from a distribution P ⁡ ( s ) P(s) . Our choice of P ⁡ ( s ) P(s) is provided in Appendix A . Once an evaluation of 𝒙 {\mathbold{x}} reaches a rung r ∈ B s r\in B_{s} , its metric value y y is recorded there. Then, the binary predicate continue s ​ ( 𝒙 , r , y ) \texttt{continue}_{s}({\mathbold{x}},r,y) evaluates to true iff y y is in the top η − 1 \eta^{-1} fraction of records at the rung. Stopping variant. This is a simple extension of the median stopping rule [ 9 ] , first implemented in Ray Tune [ 22 ] . Once a job for 𝒙 {\mathbold{x}} reaches a rung r r , if continue s ​ ( 𝒙 , r , y ) \texttt{continue}_{s}({\mathbold{x}},r,y) is true, it continues towards the next rung level. Otherwise, it is stopped , and the worker becomes free to pick up a novel evaluation. As long as fewer than η \eta metrics are recorded at a rung, the job is always continued. Promotion variant (ASHA). This variant of asynchronous HB was presented by Li et al. [ 21 ] and called ASHA . Once a job for some 𝒙 {\mathbold{x}} reaches a rung r r , it is paused there, and the worker is released. The evaluation of 𝒙 {\mathbold{x}} can be promoted ( i.e. , continued to the next rung) later on. When a worker becomes available, we sample a bracket s s and scan the rungs r ∈ B s r\in B_{s} in descending order, running a job to promote the first paused 𝒙 {\mathbold{x}} for which continue s ​ ( 𝒙 , r , y ) \texttt{continue}_{s}({\mathbold{x}},r,y) is true. When no such paused configuration exists, we start a new evaluation from scratch. With fewer than η \eta metrics recorded at a rung, no promotions happen there. The promotion variant needs pause-and-resume training. 1 1 1 Supporting pause-and-resume by checkpointing is difficult in the multi-node distributed context. It is simpler to start training from scratch whenever a configuration is promoted. This is done in our implementation. Synchronous scheduling makes less efficient use of parallel computation. Configurations in the same rung may require quite different compute times, for example, if we search over hyperparameters which control network size. At high rungs, few configurations run for much longer, and some workers may just be idle at a synchronization point (such points do not exist in the asynchronous case). Finally, rung levels have fixed sizes, which have to be filled before any configuration can be promoted, while promotions to larger resource levels can happen earlier with asynchronous scheduling. Of course, the latter risks promoting mediocre configurations simply because they were selected earlier. Figure 1 illustrates these differences. The stopping and promotion variants can exhibit rather different behavior. Initially, the stopping variant gives most configurations the benefit of doubt, while promotion pauses evaluations until they can be compared against a sufficient number of alternative configurations.

<sub>§2 Synchronous and Asynchronous Multi-Fidelity Scheduling</sub>

### 2. Model-based Asynchronous Multi-Fidelity Optimization

We now describe our new model-based method that is able to make asynchronous decisions across different fidelities of the objective function. The configurations to be evaluated in HB are drawn at random from the configuration space. Motivated by the fact that in standard sequential settings, Gaussian process (GP) based BO tends to outperform random search [ 28 ] , we aim to equip asynchronous HB with decisions based on a GP surrogate model . Recall that 𝒙 {\mathbold{x}} denotes the hyperparameter configuration, r r the resource level (see Section 2 ). Following a range of prior work on non-parallel multi-fidelity BO [ 30 , 17 , 25 , 31 ] , we place a GP prior over f ⁡ ( 𝒙 , r ) f({\mathbold{x}},r) to jointly model not only the auto-correlation within each fidelity, but also the cross-correlations between fidelities, Compared to synchronous BOHB [ 8 ] , which employs an independent TPE [ 2 ] model over 𝒙 {\mathbold{x}} for each fidelity r r , our method uses a joint GP model that explicitly captures correlations across all fidelities. Since multiple configurations are evaluated in parallel, we have to deal with pending evaluations when proposing new configurations to be evaluated. We do so by fantasizing their outcomes, as detailed by Snoek et al. [ 29 ] . In a nutshell, we marginalize the acquisition function over the GP posterior predictive of evaluation outcomes for pending configurations. In practice, we approximate this by averaging the acquisition function over sampled function values. It is worth noting that, as long as kernel hyperparameters remain constant, fantasizing comes almost for free. For GP regression, the posterior covariance matrix does not depend on the function values (only on the inputs), which means that fantasizing does not require additional cubic-complexity computations. Kernel hyperparameters may be updated with empirical Bayes or Markov chain Monte Carlo [ 29 ] . How do pending evaluations and fantasizing generalize to the asynchronous case? The relevant covariates are now the pairs ( 𝒙 , r ) ({\mathbold{x}},r) . As a task for 𝒙 {\mathbold{x}} runs down a bracket s s , it emits target values at r ∈ B s r\in B_{s} (unless stopped). The following logic is task-local and ensures that each labeled covariate was previously pending. If a task to evaluate 𝒙 {\mathbold{x}} is started in bracket s s , we register a pending evaluation for ( 𝒙 , r min ​ η s ) ({\mathbold{x}},r_{\text{min}}\eta^{s}) . Once it reaches the next rung r ∈ B s r\in B_{s} , we convert the pending to a labeled evaluation ( 𝒙 , r ) ({\mathbold{x}},r) . Then, as detailed above, we make a stopping decision. If the configuration survives, we register ( 𝒙 , r ​ η ) ({\mathbold{x}},r\eta) as pending , as r ​ η r\eta is the next rung it will reach. Details about how posterior distributions over both labeled and labeled plus fantasized evaluations are represented, are given in Appendix B.1 . All linear algebra computations are delayed until the posterior is needed for the next decision. Choice of the kernel. We implemented and compared a range of different surrogate models for f ⁡ ( 𝒙 , r ) f({\mathbold{x}},r) : a joint Matérn 5 2 \frac{5}{2} kernel with automatic relevance determination (ARD) [ 29 ] over ( 𝒙 , r ) ({\mathbold{x}},r) , with and without warping of r r ; the additive exponential decay model of [ 31 ] ; a novel non-additive extension of the latter, relaxing underlying assumptions which may not hold in practice. In all cases, the base kernel on 𝒙 {\mathbold{x}} alone is Matérn 5 2 \frac{5}{2} ARD. Details for our new surrogate model are provided in Appendix B.2 . While A-BOHB can significantly outperform synchronous BOHB or non-model-based variants, we found that the choice of joint surrogate model did not have a consistent impact on these results. Acquisition strategy. As in synchronous BOHB [ 8 ] , we employ the GP surrogate model only to choose configurations 𝒙 {\mathbold{x}} for new tasks, while scheduling decisions are done as in HB. Compared to standard BO without multiple fidelities, it is much less clear how a non-myopically optimal decision would look like in this setting. In this paper, we follow synchronous BOHB in choosing 𝒙 {\mathbold{x}} by optimizing the expected improvement (EI) acquisition function [ 28 ] over the posterior on f ⁡ ( ⋅ , r acq ) f(\cdot,r_{\text{acq}}) , where r acq r_{\text{acq}} is fixed for each decision. We choose r acq ∈ ℛ r_{\text{acq}}\in\mathcal{R} as the largest rung for which at least L L metric values have been observed, where L L is typically set to the input dimensionality ( i.e. number of hyperparameters). After some initial period, r acq r_{\text{acq}} eventually converges to r max r_{\text{max}} . This strategy does not take into account that the choice of 𝒙 {\mathbold{x}} may have different downstream stopping or promotion consequences. Exploring alternative strategies is a direction left for future work.

<sub>§3 Model-based Asynchronous Multi-Fidelity Optimization</sub>

## 总结与展望
DEHB 式的异步多保真调度把目标写成 f(x, r)：资源 r 从 r_min 到 r_max，真正想要的只有 f(x, r_max)。这句形式化的话正好说清了我们 screening 的问题——我们用 f(x, r_min) 去淘汰候选，却假装它等于 f(x, r_max)，而这只有在「小预算的排序与大预算的排序一致」时才成立，论文把这条假设显式写出来并配了调度去绕开它（低资源配置可以继续升资源，不因一次低分被永久淘汰）。

**It connects to**

- `1703.06240` — 一个说「保真度之间的关系要学」，一个说「低资源的结果只是暂定、要允许升级」；两条合起来就是我们 halving 缺的那两条规则。
- `2110.14168` — 验证器挑选同样假设「便宜分数的排序等于真跑」，而它的 6B 验证器准确率是有上限的——排序一致从来不是免费的。

## 不足之处
**What a reader should still not conclude**

- 它的资源是连续的（训练 epoch 数），可以任意切档；我们的两档是两个不同命令，切不细。
- 机制段抽到的是同步/异步调度一节的开头，异步一致性与理论保证在后面的引理里。

---

# AlphaX: eXploring Neural Architectures with Deep Neural Networks and Monte Carlo Tree Search

arXiv:1903.11059 · 2019 · [source](https://arxiv.org/html/1903.11059)

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

![Distributed AlphaX : we decouple the original back-propagation into two parts: one uses predicted accuracy (green arrow), while the other uses the true accuracy (blue arrow). The pseudocode for the whole system is available in Appendix Sec. 6](https://arxiv.org/html/1903.11059v2/AlphaX.png)

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

# Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets

arXiv:1605.07079 · 2016 · [source](https://arxiv.org/html/1605.07079)

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

![Validation error of a grid of 400 400 SVM configurations (20 settings of each of the regularization parameter C C and kernel parameter γ \gamma , both on a log-scale in [ − 10 , 10 ] [-10,10] ) for subsets of the MNIST dataset ( LeCun et al., 2001 ) of various sizes N sub N_{\text{sub}} . Small subsets are quite representative: The validation error of bad configuration (yellow) remains constant at around 0.9 0.9 , whereas the region of good configurations (blue) does not change drastically with s s .](https://arxiv.org/html/1605.07079v2/plots/grid_0.png)

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

![Learner ℐ \mathcal{I} takes input data, performs ERM, and returns model f ^ \hat{f} and its parameters 𝜽 ^ \bm{\hat{\theta}} . The GE of f ^ \hat{f} is evaluated on the fresh test set 𝒟 test \mathcal{D}_{\text{test}} .](https://arxiv.org/html/2107.05847v3/riskmin_bilevel2.svg)

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

arXiv:1802.01548 · 2018 · [source](https://arxiv.org/html/1802.01548)

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
  N6["§Results"]
  N0 --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> N5
  N5 --> N6
```

![NASNet Search Space [ 54 ] . LEFT: the full outer structure (omitting skip inputs for clarity). MIDDLE: detailed view with the skip inputs. RIGHT: cell example. Dotted line demarcates a pairwise combination.](https://arxiv.org/html/1802.01548v7/nasnet_space_outer_cifar.svg)

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

arXiv:1806.09055 · 2018 · [source](https://arxiv.org/html/1806.09055)

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

![Learning dynamics of our iterative algorithm when ℒ v ​ a ​ l ​ ( w , α ) = α ​ w − 2 ​ α + 1 \mathcal{L}_{val}(w,\alpha)=\alpha w-2\alpha+1 and ℒ t ​ r ​ a ​ i ​ n ​ ( w , α ) = w 2 − 2 ​ α ​ w + α 2 \mathcal{L}_{train}(w,\alpha)=w^{2}-2\alpha w+\alpha^{2} , starting from ( α ( 0 ) , w ( 0 ) ) = ( 2 , − 2 ) (\alpha^{(0)},w^{(0)})=(2,-2) . The analytical solution for the corresponding bilevel optimization problem is ( α ∗ , w ∗ ) = ( 1 , 1 ) (\alpha^{*},w^{*})=(1,1) , which is highlighted in the red circle. The dashed red line indicates the feasible set where constraint equation 4 is satisfied exactly (namely, weights in w w are optimal for the given architecture α \alpha ). The example shows that a suitable choice of ξ \xi helps to converge to a better local optimum.](https://arxiv.org/html/1806.09055v2/convergence.svg)

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

![(top-left) The outer skeleton of each model. (top-right) An Inception-like cell with the original 5x5 convolution approximated by two 3x3 convolutions (concatenation and projection operations omitted). (bottom-left) The cell that attained the lowest mean test error (projection layers omitted). (bottom-right) An example cell that demonstrates how channel counts are automatically determined (“+” denotes addition and “&” denotes concatenation; 1 × 1 1\times 1 projections are used to scale channel counts).](https://arxiv.org/html/1902.09635v2/skeleton.svg)

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

![Average accuracy across 10 trials for LeNet on MNIST.](https://arxiv.org/html/1801.01596v1/mnist_comparison-10T.png)

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
