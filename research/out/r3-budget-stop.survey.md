# R3 预算与停止：评估预算、计算最优分配、何时停手

- 检索：18 条查询 + 8 条回填查询（取自 gap 的标题）（每条最多 2 页 × 50）→ 679 个不同候选，保留 325
- 回溯：读通 50 篇全文的参考文献，共 1886 条引用（1 篇无可用 HTML）
- 语料内被引：151 个工作被本语料至少两篇论文引用；被引最多的是 23 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 23 | 54 | 2017 | “Hyperband: A novel bandit-based approach to hyperparameter optimization,” | — |
| 22 | 40 | 2016 | “Non-stochastic best arm identification and hyperparameter optimization,” | — |
| 16 | 39 | 2018 | “Bohb: Robust and efficient hyperparameter optimization at scale,” | 1807.01774 |
| 14 | 20 | 2012 | “Random search for hyper-parameter optimization,” | — |
| 13 | 24 | 2011 | “Algorithms for hyper-parameter optimization,” | — |
| 11 | 31 | 2012 | “Practical bayesian optimization of machine learning algorithms,” | — |
| 10 | 28 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” | — |
| 10 | 15 | 2011 | “Sequential model-based optimization for general algorithm configuration,” | — |
| 8 | 20 | 2015 | “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curv | — |
| 8 | 13 | 2019 | Optuna: A next-generation hyperparameter optimization framework. | — |
| 7 | 10 | 2017 | Google vizier: A service for black-box optimization. | — |
| 6 | 16 | 2017 | Fast bayesian optimization of machine learning hyperparameters on large datasets. | — |
| 6 | 7 | 2022 | “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. | — |
| 6 | 6 | 1998 | Efficient global optimization of expensive black-box functions. | — |
| 6 | 5 | 2020 | A system for massively parallel hyperparameter tuning. | — |
| 5 | 11 | 2013 | “Multi-Task Bayesian Optimization”. | — |
| 5 | 8 | 2017 | Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. | — |
| 5 | 7 | 2018 | Tune: A Research Platform for Distributed Model Selection and Training. | 1807.05118 |
| 5 | 6 | 2017 | Multi-information source optimization. | — |
| 5 | 6 | 2009 | Learning multiple layers of features from tiny images. | — |
| 5 | 6 | 2024 | “The Llama 3 Herd of Models” | 2407.21783 |
| 4 | 17 | 2014 | Freeze-thaw Bayesian optimization. | 1406.3896 |
| 4 | 14 | 2015 | “Efficient and Robust Automated Machine Learning” | — |
| 4 | 11 | 2018 | Massively parallel hyperparameter tuning. | 1810.05934 |
| 4 | 8 | 2016 | Learning curve prediction with Bayesian neural networks. | — |
| 4 | 7 | 2013 | “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” | — |
| 4 | 7 | 2023 | “ReAct: Synergizing Reasoning and Acting in Language Models” | 2210.03629 |
| 4 | 6 | 2013 | “Auto-weka: Combined selection and hyperparameter optimization of classification algorithms,” | — |
| 4 | 6 | 2021 | “Training Verifiers to Solve Math Word Problems” | 2110.14168 |
| 4 | 6 | 2016 | On the complexity of best-arm identification in multi-armed bandit models. | — |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 54 | 23 | 2017 | “Hyperband: A novel bandit-based approach to hyperparameter optimization,” |
| 40 | 22 | 2016 | “Non-stochastic best arm identification and hyperparameter optimization,” |
| 39 | 16 | 2018 | “Bohb: Robust and efficient hyperparameter optimization at scale,” |
| 20 | 14 | 2012 | “Random search for hyper-parameter optimization,” |
| 24 | 13 | 2011 | “Algorithms for hyper-parameter optimization,” |
| 31 | 11 | 2012 | “Practical bayesian optimization of machine learning algorithms,” |
| 28 | 10 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” |
| 15 | 10 | 2011 | “Sequential model-based optimization for general algorithm configuration,” |
| 20 | 8 | 2015 | “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learn |
| 13 | 8 | 2019 | Optuna: A next-generation hyperparameter optimization framework. |
| 10 | 7 | 2017 | Google vizier: A service for black-box optimization. |
| 16 | 6 | 2017 | Fast bayesian optimization of machine learning hyperparameters on large datasets. |
| 7 | 6 | 2022 | “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. |
| 6 | 6 | 1998 | Efficient global optimization of expensive black-box functions. |
| 5 | 6 | 2020 | A system for massively parallel hyperparameter tuning. |
| 11 | 5 | 2013 | “Multi-Task Bayesian Optimization”. |
| 8 | 5 | 2017 | Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. |
| 7 | 5 | 2018 | Tune: A Research Platform for Distributed Model Selection and Training. |
| 6 | 5 | 2017 | Multi-information source optimization. |
| 6 | 5 | 2009 | Learning multiple layers of features from tiny images. |
| 6 | 5 | 2024 | “The Llama 3 Herd of Models” |
| 17 | 4 | 2014 | Freeze-thaw Bayesian optimization. |
| 14 | 4 | 2015 | “Efficient and Robust Automated Machine Learning” |
| 11 | 4 | 2018 | Massively parallel hyperparameter tuning. |
| 8 | 4 | 2016 | Learning curve prediction with Bayesian neural networks. |
| 7 | 4 | 2013 | “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” |
| 7 | 4 | 2023 | “ReAct: Synergizing Reasoning and Acting in Language Models” |
| 6 | 4 | 2013 | “Auto-weka: Combined selection and hyperparameter optimization of classification algorithms,” |
| 6 | 4 | 2021 | “Training Verifiers to Solve Math Word Problems” |
| 6 | 4 | 2016 | On the complexity of best-arm identification in multi-armed bandit models. |

## 各细分方向的开篇（按语料内最早一篇）

- **early stopping / scheduling**（91 篇，最早 2018-01-04）Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning · arXiv:1801.01596
- **compute-optimal allocation**（53 篇，最早 2022-08-30）A Deep Neural Networks ensemble workflow from hyperparameter search to inference leveraging GPU clusters · arXiv:2208.14046
- **bandits with cost**（46 篇，最早 2011-12-06）Exploiting Channel Memory for Joint Estimation and Scheduling in Downlink Networks · arXiv:1009.3959
- **stopping criteria for agents**（6 篇，最早 2019-05-23）DEEP-BO for Hyperparameter Optimization of Deep Networks · arXiv:1905.09680
- **accuracy-cost Pareto**（5 篇，最早 2024-01-11）MultiSlot ReRanker: A Generic Model - based Re-Ranking Framework in Recommendation Systems · arXiv:2401.06293

## 最近的 SOTA（近两年）

- 2026-10-21 · Optimally Emulating Smooth Functions for Bayesian Analyses · arXiv:2610.29685
- 2026-09-24 · A Particle-Swarm-Assisted Gradient Meta-Learning Algorithm for Joint Transmit Precoding and STAR-RIS Coefficient Optimization · arXiv:2609.29150
- 2026-08-05 · Hyper -ES: Effective Evolution Strategies for LLM Reasoning via Descent Direction Merging · arXiv:2608.05541
- 2026-07-24 · On the Runtime Analysis of Reinforcement Learning Hyper -Heuristics · arXiv:2607.22036
- 2026-08-26 · Selection Hyper -heuristics Can Automatically Adjust the Learning Period to Optimally Solve Pseudo-Boolean Problems · arXiv:2605.29916
- 2025-12-14 · Hyperparameter Tuning-Based Optimized Performance Analysis of Machine Learning Algorithms for Network Intrusion Detection · arXiv:2512.15779
- 2025-11-18 · Hyper -VIB: A Hypernetwork-Enhanced Information Bottleneck Approach for Task-Oriented Communications · arXiv:2511.15041
- 2026-01-06 · Statistical Multiport-Network Modeling and Efficient Discrete Optimization of RIS · arXiv:2508.01776
- 2025-12-31 · An Analysis of Hyper - Parameter Optimization Methods for Retrieval Augmented Generation · arXiv:2505.03452
- 2025-10-01 · Learning Linear Block Codes with Gradient Quantization · arXiv:2503.16169
- 2026-11-09 · Optimal Rates for Adaptive Private $k$-PCA · arXiv:2611.12419
- 2026-10-11 · Revisited Support Vector Machines: A Unified Joint Optimization Framework with Nyström Approximation for Scalable Adaptive Learnin · arXiv:2610.15498
- 2026-08-27 · A quantum-assisted framework for PDE-based Bayesian inverse problems · arXiv:2608.27028
- 2026-06-20 · Gradient-Descent Steps to Success over Mean Accuracy: A Paradigm Shift for ML · arXiv:2606.22053
- 2026-05-29 · Precomputed 1D-CNNs for Atrial Fibrillation Detection on Tiny Smart Sensor Systems · arXiv:2605.29994
- 2026-05-14 · A Calculus-Based Framework for Determining Vocabulary Size in End-to-End ASR · arXiv:2605.14427
- 2026-04-08 · When Switching Algorithms Helps: A Theoretical Study of Online Algorithm Selection · arXiv:2604.07473
- 2026-04-12 · Cognitive Training for Language Models: Towards General Capabilities via Cross-Entropy Games · arXiv:2603.22479
- 2026-01-23 · Least-Loaded Expert Parallelism: Load Balancing An Imbalanced Mixture-of-Experts · arXiv:2601.17111
- 2025-12-30 · Medical Image Classification on Imbalanced Data Using ProGAN and SMA- Optimized ResNet: Application to COVID-19 · arXiv:2512.24214
- 2025-12-26 · Modeling high dimensional point clouds with the spherical cluster model · arXiv:2512.21960
- 2025-12-23 · Model-free stochastic linear quadratic control for discrete-time systems with multiplicative and additive noises via semidefinite  · arXiv:2512.20911
- 2026-06-11 · Hierarchical Besov-Laplace priors for spatially inhomogeneous binary classification · arXiv:2511.21441
- 2025-11-19 · Learning Where, What and How to Transfer: A Multi-Role Reinforcement Learning Approach for Evolutionary Multitasking · arXiv:2511.15199
- 2026-01-26 · A general framework for adaptive nonparametric dimensionality reduction · arXiv:2511.09486
- 2026-09-12 · Interpretable Recognition of Cognitive Distortions in Natural Language Texts · arXiv:2511.05969
- 2026-09-28 · Stein-based Optimization of Sampling Distributions in Model Predictive Path Integral Control · arXiv:2511.02015
- 2025-11-01 · Automatic Policy Search using Population-Based Hyper -heuristics for the Integrated Procurement and Perishable Inventory Problem · arXiv:2511.00762
- 2025-11-25 · Probabilistic Hyper -Graphs using Multiple Randomly Masked Autoencoders for Semi-supervised Multi-modal Multi-task Learning · arXiv:2510.10068
- 2026-08-27 · A Scalable Lift-and-Project Differentiable Approach For the Maximum Cut Problem · arXiv:2509.18612

## 被常引但不在语料里（下一轮的查询）

- (14 篇引) “Random search for hyper-parameter optimization,” · 2012
- (13 篇引) “Algorithms for hyper-parameter optimization,” · 2011
- (11 篇引) “Practical bayesian optimization of machine learning algorithms,” · 2012
- (10 篇引) “Almost Optimal Exploration in Multi-Armed Bandits” · 2013
- (10 篇引) “Sequential model-based optimization for general algorithm configuration,” · 2011
- (8 篇引) “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curves · 2015
- (7 篇引) Google vizier: A service for black-box optimization. · 2017
- (6 篇引) Fast bayesian optimization of machine learning hyperparameters on large datasets. · 2017
- (6 篇引) “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. · 2022
- (6 篇引) Efficient global optimization of expensive black-box functions. · 1998
- (6 篇引) A system for massively parallel hyperparameter tuning. · 2020
- (5 篇引) “Multi-Task Bayesian Optimization”. · 2013
- (5 篇引) Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. · 2017
- (5 篇引) Tune: A Research Platform for Distributed Model Selection and Training. · 2018 · arXiv:1807.05118
- (5 篇引) Multi-information source optimization. · 2017
- (5 篇引) Learning multiple layers of features from tiny images. · 2009
- (5 篇引) “The Llama 3 Herd of Models” · 2024 · arXiv:2407.21783
- (4 篇引) Freeze-thaw Bayesian optimization. · 2014 · arXiv:1406.3896
- (4 篇引) “Efficient and Robust Automated Machine Learning” · 2015
- (4 篇引) Massively parallel hyperparameter tuning. · 2018 · arXiv:1810.05934
- (4 篇引) Learning curve prediction with Bayesian neural networks. · 2016
- (4 篇引) “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” · 2013
- (4 篇引) “ReAct: Synergizing Reasoning and Acting in Language Models” · 2023 · arXiv:2210.03629
- (4 篇引) “Auto-weka: Combined selection and hyperparameter optimization of classification algorithms,” · 2013
- (4 篇引) “Training Verifiers to Solve Math Word Problems” · 2021 · arXiv:2110.14168
- (4 篇引) On the complexity of best-arm identification in multi-armed bandit models. · 2016
- (4 篇引) GEPA: Reflective prompt evolution can outperform reinforcement learning. · 2026 · arXiv:2507.19457
- (4 篇引) Yahpo gym - an efficient multi-objective multi-fidelity benchmark for hyperparameter optimization. · 2022
- (4 篇引) Multi-fidelity bayesian optimisation with continuous approximations. · 2017 · arXiv:1703.06240
- (4 篇引) Gaussian Processes for Machine Learning. · 2006
- (3 篇引) Best arm identification in multi-armed bandits. · 2010
- (3 篇引) Nas-bench-201: Extending the scope of reproducible neural architecture search. · 2020 · arXiv:2001.00326
- (3 篇引) Tight (lower) bounds for the fixed budget best arm identification bandit problem. · 2016
- (3 篇引) Imagenet large scale visual recognition challenge. · 2015
- (3 篇引) Bayesian optimization in high dimensions via random embeddings. · 2013
- (3 篇引) Overcoming catastrophic forgetting in neural networks · 2017
- (3 篇引) Large language models as optimizers. · 2024
- (3 篇引) Alphaevolve: a coding agent for scientific and algorithmic discovery · 2025 · arXiv:2506.13131
- (3 篇引) Pure exploration in multi-armed bandits problems. · 2009
- (3 篇引) “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”. · 2021

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 14.9 | 2018 | 1 | Hyperband : A Novel Bandit - Based Approach to Hyperparameter Optimization | 1603.06560 |
| 3.6 | 2015 | 1 | Non - stochastic Best Arm Identification and Hyperparameter Optimization | 1502.07943 |
| 3.6 | 2026 | 1 | Optimally Emulating Smooth Functions for Bayesian Analyses | 2610.29685 |
| 3.6 | 2026 | 1 | A Particle-Swarm-Assisted Gradient Meta-Learning Algorithm for Joint Transmit Precoding and STAR-RIS | 2609.29150 |
| 3.6 | 2026 | 1 | Hyper -ES: Effective Evolution Strategies for LLM Reasoning via Descent Direction Merging | 2608.05541 |
| 3.6 | 2026 | 1 | On the Runtime Analysis of Reinforcement Learning Hyper -Heuristics | 2607.22036 |
| 3.6 | 2026 | 1 | Selection Hyper -heuristics Can Automatically Adjust the Learning Period to Optimally Solve Pseudo-B | 2605.29916 |
| 3.6 | 2025 | 1 | Hyperparameter Tuning-Based Optimized Performance Analysis of Machine Learning Algorithms for Networ | 2512.15779 |
| 3.6 | 2025 | 1 | Hyper -VIB: A Hypernetwork-Enhanced Information Bottleneck Approach for Task-Oriented Communications | 2511.15041 |
| 3.6 | 2026 | 1 | Statistical Multiport-Network Modeling and Efficient Discrete Optimization of RIS | 2508.01776 |
| 3.6 | 2025 | 1 | An Analysis of Hyper - Parameter Optimization Methods for Retrieval Augmented Generation | 2505.03452 |
| 3.6 | 2025 | 1 | Learning Linear Block Codes with Gradient Quantization | 2503.16169 |
| 2.8 | 2024 | 1 | Beyond adaptive gradient: Fast-Controlled Minibatch Algorithm for large-scale optimization | 2411.15795 |
| 2.8 | 2024 | 1 | Hyper -Heuristics Can Profit From Global Variation Operators | 2407.14237 |
| 2.8 | 2023 | 1 | Multiform Evolution for High-Dimensional Problems with Low Effective Dimensionality | 2401.00168 |
| 2.8 | 2023 | 1 | Agent-based Collaborative Random Search for Hyper - parameter Tuning and Global Function Optimizatio | 2303.03394 |
| 2.8 | 2023 | 1 | Enhancing Machine Learning Model Performance with Hyper Parameter Optimization : A Comparative Study | 2302.11406 |
| 2.1 | 2022 | 1 | Behavior of Hyper - Parameters for Selected Machine Learning Algorithms: An Empirical Investigation | 2211.08536 |
| 2.1 | 2022 | 1 | Supervised Contrastive Learning with Tree-Structured Parzen Estimator Bayesian Optimization for Imba | 2210.10824 |
| 2.1 | 2022 | 1 | Deep Learning-Based Acoustic Mosquito Detection in Noisy Conditions Using Trainable Kernels and Augm | 2207.13843 |
| 2.1 | 2022 | 1 | Bayesian Hyperparameter Optimization for Deep Neural Network-Based Network Intrusion Detection | 2207.09902 |
| 2.1 | 2022 | 1 | Hierarchical Collaborative Hyper - parameter Tuning | 2205.05272 |
| 2.1 | 2022 | 1 | The Effects of Regularization and Data Augmentation are Class Dependent | 2204.03632 |
| 2.1 | 2022 | 1 | StepDIRECT -- A Derivative-Free Optimization Method for Stepwise Functions | 2202.00865 |
| 2.1 | 2022 | 1 | Survival Prediction of Children Undergoing Hematopoietic Stem Cell Transplantation Using Different M | 2201.08987 |
| 2.1 | 2022 | 1 | A Comparative study of Hyper - Parameter Optimization Tools | 2201.06433 |
| 2.1 | 2021 | 1 | Automatic tuning of hyper - parameters of reinforcement learning algorithms using Bayesian optimizat | 2112.08094 |
| 2.1 | 2021 | 1 | Hyper - parameter optimization based on soft actor critic and hierarchical mixture regularization | 2112.04084 |
| 2.1 | 2021 | 1 | HyP-ABC: A Novel Automated Hyper - Parameter Tuning Algorithm Using Evolutionary Optimization | 2109.05319 |
| 2.1 | 2021 | 1 | The Power of Proxy Data and Proxy Networks for Hyper - Parameter Optimization in Medical Image Segme | 2107.05471 |
| 2.1 | 2021 | 1 | Search Algorithms for Automated Hyper - Parameter Tuning | 2104.14677 |
| 3.9 | 2024 | 1 | A Retrospective Approximation Approach for Smooth Stochastic Optimization | 2103.04392 |
| 2.1 | 2021 | 1 | Self-supervised learning for fast and scalable time series hyper - parameter tuning | 2102.05740 |
| 2.1 | 2020 | 1 | Stochastic analysis of heterogeneous porous material with modified neural architecture search (NAS)  | 2010.12344 |
| 2.1 | 2020 | 1 | Automatic Setting of DNN Hyper - Parameters by Mixing Bayesian Optimization and Tuning Rules | 2006.02105 |
| 3.2 | 2020 | 1 | Hyperparameter optimization with REINFORCE and Transformers | 2006.00939 |
| 3.2 | 2020 | 1 | Rethinking Performance Estimation in Neural Architecture Search | 2005.09917 |
| 2.1 | 2020 | 1 | A Modified Bayesian Optimization based Hyper - Parameter Tuning Approach for Extreme Gradient Boosti | 2004.05041 |
| 2.1 | 2020 | 1 | Optimizing JPEG Quantization for Classification Networks | 2003.02874 |
| 1.4 | 2019 | 1 | CNN-LSTM models for Multi-Speaker Source Separation using Bayesian Hyper Parameter Optimization | 1912.09254 |
| 2.1 | 2020 | 1 | Deep Neural Network Hyperparameter Optimization with Orthogonal Array Tuning | 1907.13359 |
| 1.4 | 2019 | 1 | ReinBo: Machine Learning pipeline search and configuration with Bayesian Optimization embedded Reinf | 1904.05381 |
| 1.4 | 2019 | 1 | Quantifying error contributions of computational steps, algorithms and hyperparameter choices in ima | 1903.02521 |
| 1.4 | 2019 | 1 | Deep Networks as Approximators of Optimal Transfers Solutions in Multitarget Missions | 1902.00250 |
| 1.4 | 2019 | 1 | A XGBoost risk model via feature selection and Bayesian hyper - parameter optimization | 1901.08433 |
| 1.4 | 2018 | 1 | Progressive Sampling-Based Bayesian Optimization for Efficient and Automatic Machine Learning Model  | 1812.02855 |
| 1.4 | 2017 | 1 | HyperPower: Power- and Memory-Constrained Hyper - Parameter Optimization for Neural Networks | 1712.02446 |
| 1.4 | 2017 | 1 | Critical Hyper - Parameters : No Random , No Cry | 1706.03200 |
| 1.4 | 2017 | 1 | Classification of MRI data using Deep Learning and Gaussian Process-based Model Selection | 1701.04355 |
| 1.4 | 2017 | 1 | Bayesian optimization of hyper - parameters in reservoir computing | 1611.05193 |
| 3.6 | 2026 | 1 | Optimal Rates for Adaptive Private $k$-PCA | 2611.12419 |
| 3.6 | 2026 | 1 | Revisited Support Vector Machines: A Unified Joint Optimization Framework with Nyström Approximation | 2610.15498 |
| 3.6 | 2026 | 1 | A quantum-assisted framework for PDE-based Bayesian inverse problems | 2608.27028 |
| 3.6 | 2026 | 1 | Gradient-Descent Steps to Success over Mean Accuracy: A Paradigm Shift for ML | 2606.22053 |
| 3.6 | 2026 | 1 | Precomputed 1D-CNNs for Atrial Fibrillation Detection on Tiny Smart Sensor Systems | 2605.29994 |
| 3.6 | 2026 | 1 | A Calculus-Based Framework for Determining Vocabulary Size in End-to-End ASR | 2605.14427 |
| 3.6 | 2026 | 1 | When Switching Algorithms Helps: A Theoretical Study of Online Algorithm Selection | 2604.07473 |
| 3.6 | 2026 | 1 | Cognitive Training for Language Models: Towards General Capabilities via Cross-Entropy Games | 2603.22479 |
| 3.6 | 2026 | 1 | Least-Loaded Expert Parallelism: Load Balancing An Imbalanced Mixture-of-Experts | 2601.17111 |
| 3.6 | 2025 | 1 | Medical Image Classification on Imbalanced Data Using ProGAN and SMA- Optimized ResNet: Application  | 2512.24214 |
| 3.6 | 2025 | 1 | Modeling high dimensional point clouds with the spherical cluster model | 2512.21960 |
| 3.6 | 2025 | 1 | Model-free stochastic linear quadratic control for discrete-time systems with multiplicative and add | 2512.20911 |
| 3.6 | 2026 | 1 | Hierarchical Besov-Laplace priors for spatially inhomogeneous binary classification | 2511.21441 |
| 3.6 | 2025 | 1 | Learning Where, What and How to Transfer: A Multi-Role Reinforcement Learning Approach for Evolution | 2511.15199 |
| 3.6 | 2026 | 1 | A general framework for adaptive nonparametric dimensionality reduction | 2511.09486 |
| 3.6 | 2026 | 1 | Interpretable Recognition of Cognitive Distortions in Natural Language Texts | 2511.05969 |
| 3.6 | 2026 | 1 | Stein-based Optimization of Sampling Distributions in Model Predictive Path Integral Control | 2511.02015 |
| 3.6 | 2025 | 1 | Automatic Policy Search using Population-Based Hyper -heuristics for the Integrated Procurement and  | 2511.00762 |
| 3.6 | 2025 | 1 | Probabilistic Hyper -Graphs using Multiple Randomly Masked Autoencoders for Semi-supervised Multi-mo | 2510.10068 |
| 4.7 | 2026 | 1 | A Scalable Lift-and-Project Differentiable Approach For the Maximum Cut Problem | 2509.18612 |
| 3.6 | 2025 | 1 | Optimizing Hyper parameters in CNN for Soil Classification using PSO and Whale Optimization Algorith | 2508.16660 |
| 3.6 | 2025 | 1 | Data Compression with Noise Suppression for Inference under Noisy Covariance | 2508.14021 |
| 4.7 | 2026 | 1 | On the Limitations of Ray-Tracing for Learning-Based RF Tasks in Urban Environments | 2507.19653 |
| 3.6 | 2025 | 1 | Swift-Sarsa: Fast and Robust Linear Control | 2507.19539 |
| 3.6 | 2025 | 1 | Block Tensor Decomposition: A dual grid scheme with formal O(N3) for THC decomposition of molecular  | 2506.19392 |
| 4.7 | 2025 | 1 | LLM Agent for Hyper - Parameter Optimization | 2506.15167 |
| 3.6 | 2025 | 1 | Continuous-Time Output Feedback Adaptive Control for Stabilization and Tracking with Experimental Re | 2506.08042 |
| 4.7 | 2025 | 1 | Learning Deterministic Policies with Policy Gradients in Constrained Markov Decision Processes | 2506.05953 |
| 3.6 | 2025 | 1 | The Impact of On-Policy Parallelized Data Collection on Deep Reinforcement Learning Networks | 2506.03404 |
| 3.6 | 2025 | 1 | LightSAM: Parameter -Agnostic Sharpness-Aware Minimization | 2505.24399 |

## 读不到全文的（诚实记录）

- arXiv:1811.06149 — HTTP 404

_生成于 2026-11-24T17:20:16.099Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_