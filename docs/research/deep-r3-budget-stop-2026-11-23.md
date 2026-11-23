# Deep reading: what the bodies actually say

Generated 2026-11-23 15:05 local by `scripts/research-deepread.mjs`.

Every quotation below was read out of the paper's arXiv HTML5 rendering, not its abstract,
and carries the section a reader can open. A paper whose body could not be read says so;
it is not silently missing.

Terms used to select passages: `budget`, `early stopping`, `successive halving`, `fidelity`, `bandit`, `allocation`.

| paper | sections | passages | note |
| --- | --- | --- | --- |
| Hyperband : A Novel Bandit-Based Approach to Hyperparameter Optimization (`1603.06560`) | 45 | 6 | graded ok (depth full) |
| BOHB: Robust and Efficient Hyperparameter Optimization at Scale (`1807.01774`) | 35 | 6 | graded ok (depth full) |
| Freeze-Thaw Bayesian Optimization (`1406.3896`) | 28 | 1 | graded ok (depth full) |
| Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets (`1605.07079`) | 17 | 3 | graded ok (depth full) |
| Regularized Evolution for Image Classifier Architecture Search (`1802.01548`) | 31 | 2 | graded ok (depth full) |
| Hyperparameter Optimization: Foundations, Algorithms, Best Practices and Open Challenges (`2107.05847`) | 98 | 6 | graded ok (depth full) |
| Massively parallel hyperparameter tuning (`1810.05934`) | 27 | 6 | graded ok (depth full) |
| NAS-Bench-201: Extending the Scope of Reproducible Neural Architecture Search (`2001.00326`) | 16 | 1 | graded ok (depth full) |

## Hyperband : A Novel Bandit-Based Approach to Hyperparameter Optimization — `1603.06560`

- **§5.3.2 A Parameterization of F F and γ \gamma for Interpretability** (`S5.SS3.SSS2.p3.2`)

  > for some set of unique scalars μ 1 < μ 2 < ⋯ < μ K \mu_{1}<\mu_{2}<\dots<\mu_{K} . Note that by letting K → ∞ K\rightarrow\infty this discrete CDF can approximate any piecewise-continuous CDF to arbitrary accuracy. In particular, this model can have multiple means take the same value so that α \alpha mass is on μ 1 \mu_{1} and 1 − α 1-\alpha mass is on μ 2 > μ 1 \mu_{2}>\mu_{1} , capturing the stochastic infinite-armed bandit model of Jamieson et al. (2016) . In this setting, both uniform allocation and SuccessiveHalving output a ν ı ^ \nu_{\hat{\imath}} that is within the top log ⁡ ( 1 / δ )…

- **§1 Introduction** (`S1.p4.1`)

  > We develop a novel configuration evaluation approach by formulating hyperparameter optimization as a pure-exploration adaptive resource allocation problem addressing how to allocate resources among randomly sampled hyperparameter configurations. 2 2 2 A preliminary version of this work appeared in Li et al. (2017) . We extend the previous paper with a thorough theoretical analysis of Hyperband ; an infinite horizon version of the algorithm with application to stochastic infinite-armed bandits; additional intuition and discussion of Hyperband to facilitate its use in practice; and additional re…

- **§3.2 Hyperband** (`S3.SS2.p2.1`)

  > Hyperband requires two inputs (1) R R , the maximum amount of resource that can be allocated to a single configuration, and (2) η \eta , an input that controls the proportion of configurations discarded in each round of SuccessiveHalving . The two inputs dictate how many different brackets are considered; specifically, s max + 1 s_{\max}+1 different values for n n are considered with s max = ⌊ log η ⁡ ( R ) ⌋ s_{\max}=\lfloor\log_{\eta}(R)\rfloor . Hyperband begins with the most aggressive bracket s = s max s=s_{\max} , which sets n n to maximize exploration, subject to the constraint that at…

- **§3.7 Overview of Theoretical Results** (`S3.SS7.p1.1`)

  > The theoretical properties of Hyperband are best demonstrated through an example. Suppose there are n n configurations, each with a given terminal validation error ν i \nu_{i} for i = 1 , … , n i=1,\dots,n . Without loss of generality, index the configurations by performance so that ν 1 \nu_{1} corresponds to the best performing configuration, ν 2 \nu_{2} to the second best, and so on. Now consider the task of identifying the best configuration. The optimal strategy would allocate to each configuration i i the minimum resource required to distinguish it from ν 1 \nu_{1} , i.e., enough so that…

- **§3.7 Overview of Theoretical Results** (`S3.SS7.p2.1`)

  > The relative size of the budget required for uniform allocation and SuccessiveHalving depends on the envelope functions bounding deviation from terminal losses as well as the distribution from which ν i \nu_{i} ’s are drawn. The budget required for SuccessiveHalving is smaller when the optimal n n versus B / n B/n tradeoff discussed in Section 3.1 requires fewer resources per configuration. Hence, if the envelope functions tighten quickly as a function of resource allocated, or the average distances between terminal losses is large, then SuccessiveHalving can be substantially faster than unifo…

- **§5.3.1 Non-Adaptive Uniform Allocation** (`S5.SS3.SSS1.p1.1`)

  > The non-adaptive uniform allocation strategy takes as inputs a budget B B and n n arms, allocates B / n B/n to each of the arms, and picks the arm with the lowest loss. The following results allow us to compare with SuccessiveHalving .

## BOHB: Robust and Efficient Hyperparameter Optimization at Scale — `1807.01774`

- **§2 Related Work on Model-based Hyperparamter Optimization** (`S2.p4.1`)

  > Hyperband ( Li et al., 2017 ) is a bandit strategy that dynamically allocates resources to a set of random configurations and uses successive halving ( Jamieson & Talwalkar, 2016 ) to stop poorly performing configurations. We describe this in more detail in Section 3.2 . Compared to Bayesian optimization methods that do not use multiple fidelities, Hyperband showed strong anytime performance, as well as flexibility and scalability to higher-dimensional spaces. However, it only samples configurations randomly and does not learn from previously sampled configurations. This can lead to a worse fi…

- **§3.2 Hyperband** (`S3.SS2.p2.1`)

  > Hyperband (HB) ( Li et al., 2017 ) is a multi-armed bandit strategy for hyperparameter optimization that takes advantage of these different budgets b b by repeatedly calling SuccessiveHalving (SH) ( Jamieson & Talwalkar, 2016 ) to identify the best out of n n randomly sampled configurations. It balances very agressive evaluations with many configurations on the smallest budget, and very conservative runs that are directly evaluated on b m ​ a ​ x b_{max} . The exact procedure for this trade-off is shown in Algorithm 1 (with pseudocode for SH shown in Appendix C). Line 1 computes the geometrica…

- **§4.1 Algorithm description** (`S4.SS1.p1.1`)

  > BOHB relies on HB to determine how many configurations to evaluate with which budget, but it replaces the random selection of configurations at the beginning of each HB iteration by a model-based search. Once the desired number of configurations for the iteration is reached, the standard successive halving procedure is carried out using these configurations. We keep track of the performance of all function evaluations g ⁡ ( 𝒙 , b ) + ϵ g({\bm{x}},b)+\epsilon of configurations 𝒙 {\bm{x}} on all budgets b b to use as a basis for our models in later iterations.

- **§4.1 Algorithm description** (`S4.SS1.p4.1`)

  > As the optimization progresses, more configurations are evaluated on bigger budgets. Given that the goal is to optimize on the largest budget, BOHB always uses the model for the largest budget for which enough observations are available (line 2). This enables it to overcome wrong conclusions drawn on smaller budgets by eventually relying on results with the highest fidelity only.

- **§1 Introduction** (`S1.I1.ix1.p1.1`)

  > Since large contemporary neural networks often require days or even weeks to train, HPO methods that view performance as a black box function to be optimized require extreme resources. The overall budget that most researchers and practitioners can afford during development is often not much larger than that of fully training a handful of models, and hence practical HPO methods must go beyond this blackbox view to already yield good configurations with such a small budget.

- **§1 Introduction** (`S1.I1.ix2.p1.1`)

  > On the other hand, what matters most at deployment time is the performance of the best configuration a HPO method can find given a larger budget. Since finding the best configurations in a large space requires guidance, this is where methods based on random search struggle.

## Freeze-Thaw Bayesian Optimization — `1406.3896`

- **§Online LDA** (`S6.SS0.SSS0.Px2.p1.1`)

  > Next we optimize five hyperparameters of an online Latent Dirichlet Allocation (LDA) Hoffman et al. (2010) experiment on 250,000 documents from Wikipedia. We optimize the number of topics (from 2 to 100), two Dirichlet distribution prior base measures (from 0 to 2), and two learning rate parameters (rate from 0.1 0.1 to 1 1 , decay from 10 − 5 10^{-5} to 1). We used the implementation from Agarwal et al. (2011) and report average perplexity on a held out validation set of 10% of the data.

## Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets — `1605.07079`

- **§1 Introduction** (`S1.p6.1`)

  > In parallel work 1 1 1 Hyperband was first described in a 2016 arXiv paper ( Li et al., 2016 ) , and Fabolas was first described in a 2015 NIPS workshop paper ( Klein et al., ) , Li et al. (2017) proposed a multi-arm bandit strategy, called Hyperband, which dynamically allocates more and more resources to randomly sampled configurations based on their performance on subsets of the data. Hyperband assures that only well-performing configurations are trained on the full dataset while discarding bad ones early. Despite its simplicity, in their experiments the method was able to outperform well-es…

- **§3.2 Formal algorithm description** (`S3.SS2.p2.1`)

  > Our proposed acquisition function resembles the one used by MTBO (Eq. 5 ), with two differences: First, MTBO’s discrete tasks t t are replaced by a continuous dataset size s s (allowing to learn correlations without evaluations at s = 1 s=1 , and to choose the appropriate subset size automatically). Second, the prediction of computational cost is augmented by the overhead of the Bayesian optimization method. This inclusion of the reasoning overhead is important to appropriately reflect the information gain per unit time spent: it does not matter whether the time is spent with a function evalua…

- **§4 Experiments** (`S4.p2.1`)

  > We implemented Hyperband following Li et al. (2017) using the recommended setting for the parameter η = 3 \eta=3 that controls the intermediate subset sizes. For each experiment, we adjusted the budget allocated to each Hyperband iteration to allow the same minimum dataset size as for Fabolas : 10 times the number of classes for the support vector machine benchmarks and the maximum batch size for the neural network benchmarks. We also followed the prescribed incumbent estimation after each iteration as the configuration with the best performance on the full dataset size.

## Regularized Evolution for Image Classifier Architecture Search — `1802.01548`

- **§Related Work** (`Sx2.p2.1`)

  > Even though some methods stand out due to their efficiency [ 43 , 35 ] , many approaches use large amounts of resources. Several recent papers reduced the compute cost through progressive-complexity search stages [ 29 ] , hypernets [ 5 ] , accuracy prediction [ 3 , 26 , 13 ] , warm-starting and ensembling [ 17 ] , parallelization, reward shaping and early stopping [ 52 ] or Net2Net transformations [ 6 ] . Most of these methods could in principle be applied to evolution too, but this is beyond the scope of this paper.

- **§Conclusion** (`Sx7.I1.i2.p1.1`)

  > We presented the first controlled comparison of algorithms for image classifier architecture search in a case study of evolution, RL and random search. We showed that evolution had somewhat faster search speed and stood out in the regime of scarcer resources / early stopping. Evolution also matched RL in final model quality, employing a simpler method.

## Hyperparameter Optimization: Foundations, Algorithms, Best Practices and Open Challenges — `2107.05847`

- **§4.2.4 Multifidelity and Hyperband** (`S4.SS2.SSS4.p2.1`)

  > Hyperband ( Li et al., 2018c ) can best be understood as repeated execution of the successive halving (SH) procedure ( Jamieson & Talwalkar, 2016a ) . SH assumes a fidelity-budget B B for the sum of λ fid \lambda_{\text{fid}} for all evaluations. It starts with a given, fixed number of candidates 𝝀 ( i ) \bm{\lambda}^{(i)} that we denote with p [ 0 ] p^{[0]} and “races them down” in stages t t to a single best candidate by repeatedly evaluating all candidates with increased fidelity in a certain schedule. Typically, this is controlled by the η HB \eta_{\text{HB}} control multiplier of Hyperba…

- **§4.2 Well-Established HPO Algorithms** (`S4.SS2.p2.1`)

  > Many algorithms can be characterized by how they handle two different trade-offs: a) The exploration vs. exploitation trade-off refers to how much budget an optimizer spends on either attempting to directly exploit the currently available knowledge base by evaluating very close to the currently best candidates (e.g., local search) or exploring the search space to gather new knowledge (e.g., random search). b) The inference vs. search trade-off refers to how much time and overhead is spent to induce a model from the currently available archive data in order to exploit past evaluations as much a…

- **§4.2.4 Multifidelity and Hyperband** (`S4.SS2.SSS4.p1.1`)

  > The multifidelity (MF) concept in HPO refers to all tuning approaches that can efficiently handle a learner ℐ ⁡ ( 𝒟 , 𝝀 ) \mathcal{I}(\mathcal{D},\bm{\lambda}) with a fidelity HP λ fid \lambda_{\text{fid}} as a component of 𝝀 \bm{\lambda} , which influences the computational cost of the fitting procedure in a monotonically increasing manner. Higher λ fid \lambda_{\text{fid}} values imply a longer runtime of the fit. This directly implies that the lower we set λ fid \lambda_{\text{fid}} , the more points we can explore in our search space, albeit with much less reliable information w.r.t. th…

- **§4.2.4 Multifidelity and Hyperband** (`S4.SS2.SSS4.p4.1`)

  > However, the efficiency of SH strongly depends on a sensible choice of the number of starting configurations and the resulting schedule. If we assume a fixed fidelity-budget for HPO, the user has the choice of running either (a) more configurations but with less fidelity, or (b) fewer configurations, but with higher fidelity. While the former naturally explores more, the latter schedules evaluations with stronger correlation to the true objective value and more informative evaluations. As an example, consider how λ ( 6 ) \lambda^{(6)} is discarded in favor of λ ( 8 ) \lambda^{(8)} at 25% in Fi…

- **§4.2.4 Multifidelity and Hyperband** (`S4.SS2.SSS4.p5.1`)

  > As we often have no prior knowledge regarding this effect, HB simply runs SH for different numbers of starting configurations p s [ 0 ] p_{s}^{[0]} , and each SH run or schedule is called a bracket . As input, HB takes η HB \eta_{\text{HB}} and the maximum fidelity λ fid upp > η HB \lambda_{\text{fid}}^{\textrm{upp}}>\eta_{\text{HB}} . HB then constructs the target fidelity budget B B for each bracket by considering the most explorative bracket: Here, the number of batch evaluations s max + 1 s_{\text{max}}+1 is chosen to be ⌊ log η HB ⁡ ( λ fid upp ) ⌋ + 1 \left\lfloor\log_{\eta_{\text{HB}}}(…

- **§6.5 When to Terminate HPO** (`S6.SS5.p1.1`)

  > Choosing an appropriate budget for HPO or dynamically terminating HPO based on collected archive data is a difficult practical challenge that is not readily solved. The user typically has these options: 1. A certain amount of runtime is specified before HPO is started, solely based on practical considerations and intuition. This is what currently happens nearly exclusively in practice. A simple rule-of-thumb might be scaling the budget of HPC evaluations with search space dimensionality in a linear fashion like 50 × l 50\times l or 100 × l 100\times l , which would also define the number of fu…

## Massively parallel hyperparameter tuning — `1810.05934`

- **§1 Introduction** (`S1.p7.1`)

  > To this end, and motivated by the shortfalls of existing methods, we first introduce A synchronous S uccessive H alving A lgorithm (ASHA), a simple and practical hyperparameter optimization method suitable for massive parallelism that exploits aggressive early stopping. Our algorithm is inspired by the Successive Halving algorithm (SHA) ( Karnin et al., 2013 ; Jamieson & Talwalkar, 2015 ) , a theoretically principled early stopping method that allocates more resources to promising configurations. ASHA is designed for what we refer to as the ‘large-scale regime,’ where to find a good hyperparam…

- **§3.1 Successive Halving (SHA)** (`S3.SS1.p2.1`)

  > SHA requires the number of configurations n n , a minimum resource r r , a maximum resource R R , a reduction factor η ≥ 2 \eta\geq 2 , and a minimum early-stopping rate s s . Additionally, the get_hyperparameter_configuration ​ ( n ) \texttt{get\_hyperparameter\_configuration}(n) subroutine returns n n configurations sampled randomly from a given search space; and the run_then_ return_val_loss ​ ( θ , r ) \texttt{return\_val\_loss}(\theta,r) subroutine returns the validation loss after training the model with the hyperparameter setting θ \theta and for r r resources. For a given early-stoppin…

- **§2 Related Work** (`S2.p3.1`)

  > In contrast, SHA ( Jamieson & Talwalkar, 2015 ) and Hyperband ( Li et al., 2018 ) are adaptive configuration evaluation approaches which do not have the aforementioned drawbacks and have achieved state-of-the-art performance on several empirical tasks. SHA serves as the inner loop for Hyperband, with Hyperband automating the choice of the early-stopping rate by running different variants of SHA. While the appropriate choice of early stopping rate is problem dependent, Li et al. (2018) ’s empirical results show that aggressive early-stopping works well for a wide variety of tasks. Hence, we foc…

- **§2 Related Work** (`S2.p9.1`)

  > Similarly, we note that Kim et al. (2018) address the problem of resource management for generic hyperparameter optimization methods in a shared compute environment, while we focus on efficient resource allocation with adaptive scheduling specifically for ASHA in Section 5.3 . Additionally, in contrast to the user-specified automated scaling capability for parallel training presented in Xiao et al. (2018) , we propose to automate appropriate autoscaling limits by using the performance prediction framework by Qi et al. (2017) .

- **§3.1 Successive Halving (SHA)** (`S3.SS1.p1.1`)

  > The idea behind SHA (Algorithm 1 ) is simple: allocate a small budget to each configuration, evaluate all configurations and keep the top 1 / η 1/\eta , increase the budget per configuration by a factor of η \eta , and repeat until the maximum per-configuration budget of R R is reached (lines 5–11). The resource allocated by SHA can be iterations of stochastic gradient descent, number of training examples, number of random features, etc.

- **§3.3 Algorithm Discussion** (`S3.SS3.p2.1`)

  > We further note that ASHA improves upon SHA in two ways. First, Li et al. (2018) discusses two SHA variants: finite horizon (bounded resource R R per configuration) and infinite horizon (unbounded resources R R per configuration). ASHA consolidates these settings into one algorithm. In Algorithm 2 , we do not promote configurations that have been trained for R R , thereby restricting the number of rungs. However, this algorithm trivially generalizes to the infinite horizon; we can remove this restriction so that the maximum resource per configuration increases naturally as configurations are p…

## NAS-Bench-201: Extending the Scope of Reproducible Neural Architecture Search — `2001.00326`

- **§2.3 Architecture Performance** (`S2.SS3.p2.1`)

  > literature to set up the hyper-parameters and training strategies ( Zoph et al., 2018 ; Loshchilov & Hutter, 2017 ; He et al., 2016 ) . We train each architecture with the same strategy, which is shown in Table 1 . For simplification, we denote all hyper-parameters for training a model as a set ℋ {\mathcal{H}} , and we use ℋ † {\mathcal{H}}^{\dagger} to denote the values of hyper-parameter that we use. Specifically, we train each architecture via Nesterov momentum SGD, using the cross-entropy loss for 200 epochs in total. We set the weight decay as 0.0005 and decay the learning rate from 0.1 t…

---

## 读完这八篇正文之后，我认为什么变了

**1. 我一直在说"successive halving"，但我们做的不是 successive halving。**
1603.06560（Hyperband）§3 把 SH 的定义写得很硬：给定**总保真预算 B**，初始 n 个配置，每轮保留 1/η，**预算在配置之间重新分配**，直到单个配置吃满 R。我们的 screen 是"先花一小笔把候选筛掉一半，剩下的照原样跑"，**没有任何一步把被筛掉的那半的预算还给幸存者**。所以我们的 screen 只省了钱，没买到"幸存者被更深地评估"——这是 SH 与"预筛"的本质区别。

**2. η 是算法参数，不是"减半"这个常数。**
同篇 §3.2：Hyperband 的两个输入是 R（单配置最大资源）与 η（每轮淘汰比例），两者共同决定 bracket 数 s_max+1。我们 `keepRatio: 0.5` 写死在 config 里，等于把 η 钉死在 2，且从未把 R 当成参数——我们的"资源"是步数/回合，没有上限概念。

**3. 保真度（fidelity）必须单调。**
2107.05847 §4.2.4：fidelity HP λ_fid 是**单调影响计算成本**的一个超参，MF 方法的全部合法性建立在这个单调性上。我们的 `screen.cmd` 与完整 verify 是**两个不同的命令**，没有任何证据说明 screen 通过率与最终 killRate 单调相关——如果不单调，SH 的理论保证不成立，省钱就是运气。

**4. 低保真度的结论会被高保真度推翻，BOHB 明确处理了这件事。**
1807.01774 §4.1：*BOHB always uses the model for the largest budget for which enough observations are available … This enables it to overcome wrong conclusions drawn on smaller budgets*。我们的 screen 一旦淘汰就不再回看，等于把"小预算的错结论"永久固化。

**5. ASHA 的两条改进正好对应我们缺的两件事。**
1810.05934 §3.3 说 ASHA 相对 SHA 改了两点：把有限/无限视界统一，以及**不晋升已经跑完的配置**。我们第二轮起会把上一轮幸存者重新当候选排队，正是它说要避免的重复投入。

**6. 早停的收益在"资源稀缺"时才显出来，这是被量过的。**
1802.01548 §Conclusion：*evolution had somewhat faster search speed and stood out in the regime of scarcer resources / early stopping*。这给我们的 21% 一个正确的读法：**在有预算约束的档位，早停的收益大；在富裕档位几乎为零**。我们那两场对比恰好一场在紧档、一场不在，所以 21% 不是"halving 的收益"，是"紧档下的收益"。

**7. 早停该不该停，是个没有好答案的开放问题。**
2107.05847 §6.5 直说 *Choosing an appropriate budget for HPO or dynamically terminating HPO based on collected archive data is a difficult practical challenge that is not readily solved*，然后列了"拍一个运行时长"这类原始做法。我们的 `budgetRounds` 就是它列的第一种。

## 三条我会改的

1. **把 screen 改成真正的 SH：把被淘汰候选的剩余预算还给幸存者。** 现在 screen 只在轮首跑一次（`round.js` 的 screening 段），改成多档（screen → 半程 → 完整），每档淘汰比例 η 可配，才是 Hyperband 的内循环。
2. **给 screen 与 verify 之间加一条单调性检查。** 在有过 screen 的轮里，记 `screen 通过率` 与 `最终 killRate` 的秩相关；相关系数掉到阈值以下就**关掉 halving 并报警**，因为理论前提没了。
3. **引入 R（单配置最大资源）作为显式参数**，让 η 与 R 共同决定档数，而不是把 keepRatio 写死。

## 这份调研没回答的三件事

1. **非平稳的 arm。** HPO 里每个配置的好坏是固定的，我们的候选是 LLM 生成的、彼此不同质的，"哪个配置更好"本身带模型方差；SH 的理论假设里没有这一项。
2. **screen 的成本该记在哪。** 三篇都把 screen 当作"便宜的部分"不再讨论；我们 screen 也是真实计费（`docs/l2-state.md` 记过 $0.0750），但文献里没有"筛选开销计入总预算后还划不划算"的判据。
3. **我们的"资源"是什么。** HPO 的资源是 epoch/样本，单调可分；我们的资源是"一轮 agent 的步数"，中途截断的 agent 输出与完整跑完的输出不是同一个东西，保真度单调性在这里最可疑。
