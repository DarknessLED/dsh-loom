# R3 预算与停止：评估预算、计算最优分配、何时停手

- 检索：18 条查询（每条最多 2 页 × 50）→ 724 个不同候选，保留 369
- 回溯：读通 50 篇全文的参考文献，共 1897 条引用（2 篇无可用 HTML）
- 语料内被引：145 个工作被本语料至少两篇论文引用；被引最多的是 26 篇
- 说明：所有"被引"都是**本语料内**的引用，不是全领域引用数。arXiv 的搜索页与全文 HTML 无需额度，API 当时在 429。

## 基石：本方向多篇论文都在引

| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 26 | 60 | 2018 | “Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization”. | 1903.11059 |
| 23 | 40 | 2016 | “Non-stochastic Best Arm Identification and Hyperparameter Optimization”. | — |
| 20 | 57 | 2018 | “BOHB: Robust and Efficient Hyperparameter Optimization at Scale”. | 1807.01774 |
| 19 | 35 | 2011 | “Algorithms for Hyper-Parameter Optimization”. | — |
| 17 | 21 | 2012 | “Random Search for Hyper-Parameter Optimization”. | — |
| 16 | 36 | 2012 | “Practical bayesian optimization of machine learning algorithms,” | — |
| 15 | 20 | 2011 | “Sequential Model-Based Optimization for General Algorithm Configuration”. | — |
| 8 | 19 | 2014 | “Freeze-thaw bayesian optimization” | 1406.3896 |
| 8 | 18 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” | — |
| 7 | 14 | 2012 | “Multi-Task Bayesian Optimization”. | — |
| 7 | 6 | 1998 | “Efficient Global Optimization of Expensive Black-Box Functions” | — |
| 6 | 18 | 2017 | “Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets” | 1605.07079 |
| 6 | 18 | 2015 | “Efficient and Robust Automated Machine Learning” | — |
| 6 | 17 | 2015 | “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curv | — |
| 6 | 10 | 2021 | “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”. | — |
| 6 | 10 | 2017 | Google vizier: A service for black-box optimization. | — |
| 6 | 10 | 2013 | “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” | — |
| 6 | 9 | 2017 | Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. | — |
| 6 | 8 | 2020 | A system for massively parallel hyperparameter tuning. | — |
| 6 | 7 | 2019 | “Optuna: A Next-Generation Hyperparameter Optimization Framework” | — |
| 6 | 6 | 2022 | “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. | — |
| 6 | 5 | 2006 | “Gaussian processes for machine learning” | — |
| 5 | 13 | 2020 | Nas-bench-201: Extending the scope of reproducible neural architecture search. | 2001.00326 |
| 5 | 11 | 2018 | Massively parallel hyperparameter tuning. | 1810.05934 |
| 5 | 10 | 2017 | Learning curve prediction with Bayesian neural networks. | — |
| 5 | 8 | 2021 | Hyperparameter optimization: Foundations, algorithms, best practices, and open challenges. | 2107.05847 |
| 5 | 8 | 2016 | Bayesian optimization with robust bayesian neural networks. | — |
| 5 | 6 | 2016 | Multi-information source optimization. | — |
| 5 | 6 | 2022 | Yahpo gym - an efficient multi-objective multi-fidelity benchmark for hyperparameter optimization. | — |
| 5 | 6 | 2019 | “Regularized Evolution for Image Classifier Architecture Search” | 1802.01548 |

## 反复被对比的基线（单篇内被多次引用）

| 篇内引用 | 被几篇引 | 年 | 工作 |
| --- | --- | --- | --- |
| 60 | 26 | 2018 | “Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization”. |
| 40 | 23 | 2016 | “Non-stochastic Best Arm Identification and Hyperparameter Optimization”. |
| 57 | 20 | 2018 | “BOHB: Robust and Efficient Hyperparameter Optimization at Scale”. |
| 35 | 19 | 2011 | “Algorithms for Hyper-Parameter Optimization”. |
| 21 | 17 | 2012 | “Random Search for Hyper-Parameter Optimization”. |
| 36 | 16 | 2012 | “Practical bayesian optimization of machine learning algorithms,” |
| 20 | 15 | 2011 | “Sequential Model-Based Optimization for General Algorithm Configuration”. |
| 19 | 8 | 2014 | “Freeze-thaw bayesian optimization” |
| 18 | 8 | 2013 | “Almost Optimal Exploration in Multi-Armed Bandits” |
| 14 | 7 | 2012 | “Multi-Task Bayesian Optimization”. |
| 6 | 7 | 1998 | “Efficient Global Optimization of Expensive Black-Box Functions” |
| 18 | 6 | 2017 | “Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets” |
| 18 | 6 | 2015 | “Efficient and Robust Automated Machine Learning” |
| 17 | 6 | 2015 | “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learn |
| 10 | 6 | 2021 | “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”. |
| 10 | 6 | 2017 | Google vizier: A service for black-box optimization. |
| 10 | 6 | 2013 | “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” |
| 9 | 6 | 2017 | Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. |
| 8 | 6 | 2020 | A system for massively parallel hyperparameter tuning. |
| 7 | 6 | 2019 | “Optuna: A Next-Generation Hyperparameter Optimization Framework” |
| 6 | 6 | 2022 | “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. |
| 5 | 6 | 2006 | “Gaussian processes for machine learning” |
| 13 | 5 | 2020 | Nas-bench-201: Extending the scope of reproducible neural architecture search. |
| 11 | 5 | 2018 | Massively parallel hyperparameter tuning. |
| 10 | 5 | 2017 | Learning curve prediction with Bayesian neural networks. |
| 8 | 5 | 2021 | Hyperparameter optimization: Foundations, algorithms, best practices, and open challenges. |
| 8 | 5 | 2016 | Bayesian optimization with robust bayesian neural networks. |
| 6 | 5 | 2016 | Multi-information source optimization. |
| 6 | 5 | 2022 | Yahpo gym - an efficient multi-objective multi-fidelity benchmark for hyperparameter optimization. |
| 6 | 5 | 2019 | “Regularized Evolution for Image Classifier Architecture Search” |

## 各细分方向的开篇（按语料内最早一篇）

- **early stopping / scheduling**（68 篇，最早 2018-01-04）Combination of Hyperband and Bayesian Optimization for Hyperparameter Optimization in Deep Learning · arXiv:1801.01596
- **compute-optimal allocation**（58 篇，最早 2023-03-01）Fairness for Workers Who Pull the Arms: An Index Based Policy for Allocation of Restless Bandit Tasks · arXiv:2303.00799
- **bandits with cost**（27 篇，最早 2019-01-12）Pure-Exploration for Infinite-Armed Bandits with General Arm Reservoirs · arXiv:1811.06149
- **accuracy-cost Pareto**（9 篇，最早 2026-05-25）Dense2MoE: Pushing the Pareto Frontier of On-Device LLMs via Unified Pruning and Upcycling · arXiv:2605.26496
- **stopping criteria for agents**（7 篇，最早 2026-04-07）Generate, Filter, Control, Replay: A Comprehensive Survey of Rollout Strategies for LLM Reinforcement Learning · arXiv:2605.02913

## 最近的 SOTA（近两年）

- 2026-11-09 · Optimal Rates for Adaptive Private $k$-PCA · arXiv:2611.12419
- 2026-10-11 · Revisited Support Vector Machines: A Unified Joint Optimization Framework with Nyström Approximation for Scalable Adaptive Learnin · arXiv:2610.15498
- 2026-09-24 · A Particle-Swarm-Assisted Gradient Meta-Learning Algorithm for Joint Transmit Precoding and STAR-RIS Coefficient Optimization · arXiv:2609.29150
- 2026-08-27 · A quantum-assisted framework for PDE-based Bayesian inverse problems · arXiv:2608.27028
- 2026-07-24 · On the Runtime Analysis of Reinforcement Learning Hyper -Heuristics · arXiv:2607.22036
- 2026-06-20 · Gradient-Descent Steps to Success over Mean Accuracy: A Paradigm Shift for ML · arXiv:2606.22053
- 2026-05-29 · Precomputed 1D-CNNs for Atrial Fibrillation Detection on Tiny Smart Sensor Systems · arXiv:2605.29994
- 2026-08-26 · Selection Hyper -heuristics Can Automatically Adjust the Learning Period to Optimally Solve Pseudo-Boolean Problems · arXiv:2605.29916
- 2026-05-14 · A Calculus-Based Framework for Determining Vocabulary Size in End-to-End ASR · arXiv:2605.14427
- 2026-04-08 · When Switching Algorithms Helps: A Theoretical Study of Online Algorithm Selection · arXiv:2604.07473
- 2026-04-12 · Cognitive Training for Language Models: Towards General Capabilities via Cross-Entropy Games · arXiv:2603.22479
- 2026-01-23 · Least-Loaded Expert Parallelism: Load Balancing An Imbalanced Mixture-of-Experts · arXiv:2601.17111
- 2025-12-30 · Medical Image Classification on Imbalanced Data Using ProGAN and SMA- Optimized ResNet: Application to COVID-19 · arXiv:2512.24214
- 2025-12-26 · Modeling high dimensional point clouds with the spherical cluster model · arXiv:2512.21960
- 2025-12-23 · Model-free stochastic linear quadratic control for discrete-time systems with multiplicative and additive noises via semidefinite  · arXiv:2512.20911
- 2025-12-14 · Hyperparameter Tuning-Based Optimized Performance Analysis of Machine Learning Algorithms for Network Intrusion Detection · arXiv:2512.15779
- 2026-06-11 · Hierarchical Besov-Laplace priors for spatially inhomogeneous binary classification · arXiv:2511.21441
- 2025-11-19 · Learning Where, What and How to Transfer: A Multi-Role Reinforcement Learning Approach for Evolutionary Multitasking · arXiv:2511.15199
- 2026-01-26 · A general framework for adaptive nonparametric dimensionality reduction · arXiv:2511.09486
- 2026-09-12 · Interpretable Recognition of Cognitive Distortions in Natural Language Texts · arXiv:2511.05969
- 2026-09-28 · Stein-based Optimization of Sampling Distributions in Model Predictive Path Integral Control · arXiv:2511.02015
- 2025-11-01 · Automatic Policy Search using Population-Based Hyper -heuristics for the Integrated Procurement and Perishable Inventory Problem · arXiv:2511.00762
- 2025-11-25 · Probabilistic Hyper -Graphs using Multiple Randomly Masked Autoencoders for Semi-supervised Multi-modal Multi-task Learning · arXiv:2510.10068
- 2026-08-27 · A Scalable Lift-and-Project Differentiable Approach For the Maximum Cut Problem · arXiv:2509.18612
- 2025-08-20 · Optimizing Hyper parameters in CNN for Soil Classification using PSO and Whale Optimization Algorithm · arXiv:2508.16660
- 2025-08-19 · Data Compression with Noise Suppression for Inference under Noisy Covariance · arXiv:2508.14021
- 2026-01-06 · Statistical Multiport-Network Modeling and Efficient Discrete Optimization of RIS · arXiv:2508.01776
- 2026-06-18 · On the Limitations of Ray-Tracing for Learning-Based RF Tasks in Urban Environments · arXiv:2507.19653
- 2025-07-22 · Swift-Sarsa: Fast and Robust Linear Control · arXiv:2507.19539
- 2025-06-24 · Block Tensor Decomposition: A dual grid scheme with formal O(N3) for THC decomposition of molecular systems · arXiv:2506.19392

## 被常引但不在语料里（下一轮的查询）

- (19 篇引) “Algorithms for Hyper-Parameter Optimization”. · 2011
- (17 篇引) “Random Search for Hyper-Parameter Optimization”. · 2012
- (16 篇引) “Practical bayesian optimization of machine learning algorithms,” · 2012
- (15 篇引) “Sequential Model-Based Optimization for General Algorithm Configuration”. · 2011
- (8 篇引) “Almost Optimal Exploration in Multi-Armed Bandits” · 2013
- (7 篇引) “Multi-Task Bayesian Optimization”. · 2012
- (7 篇引) “Efficient Global Optimization of Expensive Black-Box Functions” · 1998
- (6 篇引) “Fast Bayesian Optimization of Machine Learning Hyperparameters on Large Datasets” · 2017 · arXiv:1605.07079
- (6 篇引) “Efficient and Robust Automated Machine Learning” · 2015
- (6 篇引) “Speeding Up Automatic Hyperparameter Optimization of Deep Neural Networks by Extrapolation of Learning Curves · 2015
- (6 篇引) “DEHB: Evolutionary Hyberband for Scalable, Robust and Efficient Hyperparameter Optimization”. · 2021
- (6 篇引) Google vizier: A service for black-box optimization. · 2017
- (6 篇引) “Towards an empirical foundation for assessing bayesian optimization of hyperparameters,” · 2013
- (6 篇引) Hyperband: Bandit-based configuration evaluation for hyperparameter optimization. · 2017
- (6 篇引) A system for massively parallel hyperparameter tuning. · 2020
- (6 篇引) “Optuna: A Next-Generation Hyperparameter Optimization Framework” · 2019
- (6 篇引) “SMAC3: A Versatile Bayesian Optimization Package for Hyperparameter Optimization”. · 2022
- (6 篇引) “Gaussian processes for machine learning” · 2006
- (5 篇引) Nas-bench-201: Extending the scope of reproducible neural architecture search. · 2020 · arXiv:2001.00326
- (5 篇引) Massively parallel hyperparameter tuning. · 2018 · arXiv:1810.05934
- (5 篇引) Learning curve prediction with Bayesian neural networks. · 2017
- (5 篇引) Bayesian optimization with robust bayesian neural networks. · 2016
- (5 篇引) Multi-information source optimization. · 2016
- (5 篇引) Yahpo gym - an efficient multi-objective multi-fidelity benchmark for hyperparameter optimization. · 2022
- (5 篇引) “Regularized Evolution for Image Classifier Architecture Search” · 2019 · arXiv:1802.01548
- (5 篇引) Openml: Networked science in machine learning. · 2014
- (5 篇引) UCI Machine Learning Repository. · 2017
- (5 篇引) “Auto-weka: Combined selection and hyperparameter optimization of classification algorithms,” · 2013
- (5 篇引) “Hyperparameter Optimization” · 2019
- (5 篇引) Learning multiple layers of features from tiny images. · 2009
- (5 篇引) “Scalable Bayesian Optimization Using Deep Neural Networks” · 2015
- (4 篇引) “DARTS: Differentiable Architecture Search” · 2019 · arXiv:1806.09055
- (4 篇引) Taking the human out of the loop: A review of Bayesian optimization. · 2016
- (4 篇引) NAS-Bench-101: Towards reproducible neural architecture search. · 2019 · arXiv:1902.09635
- (4 篇引) Tune: A research platform for distributed model selection and training. · 2018 · arXiv:1807.05118
- (4 篇引) Automated Machine Learning: Methods, Systems, Challenges. · 2018
- (4 篇引) The application of Bayesian methods for seeking the extremum. · 1978
- (4 篇引) Multi-fidelity Bayesian optimisation with continuous approximations. · 2017 · arXiv:1703.06240
- (4 篇引) Gradient-based learning applied to document recognition. · 1998
- (4 篇引) “Scikit-learn: Machine Learning in Python” · 2011

## 全部候选（按综合分）

| 分 | 年 | 命中 | 工作 | arXiv |
| --- | --- | --- | --- | --- |
| 11.6 | 2018 | 1 | Hyperband : A Novel Bandit - Based Approach to Hyperparameter Optimization | 1603.06560 |
| 1.4 | 2015 | 1 | Non - stochastic Best Arm Identification and Hyperparameter Optimization | 1502.07943 |
| 3.6 | 2026 | 1 | Optimal Rates for Adaptive Private $k$-PCA | 2611.12419 |
| 3.6 | 2026 | 1 | Revisited Support Vector Machines: A Unified Joint Optimization Framework with Nyström Approximation | 2610.15498 |
| 3.6 | 2026 | 1 | A Particle-Swarm-Assisted Gradient Meta-Learning Algorithm for Joint Transmit Precoding and STAR-RIS | 2609.29150 |
| 3.6 | 2026 | 1 | A quantum-assisted framework for PDE-based Bayesian inverse problems | 2608.27028 |
| 3.6 | 2026 | 1 | On the Runtime Analysis of Reinforcement Learning Hyper -Heuristics | 2607.22036 |
| 3.6 | 2026 | 1 | Gradient-Descent Steps to Success over Mean Accuracy: A Paradigm Shift for ML | 2606.22053 |
| 3.6 | 2026 | 1 | Precomputed 1D-CNNs for Atrial Fibrillation Detection on Tiny Smart Sensor Systems | 2605.29994 |
| 3.6 | 2026 | 1 | Selection Hyper -heuristics Can Automatically Adjust the Learning Period to Optimally Solve Pseudo-B | 2605.29916 |
| 3.6 | 2026 | 1 | A Calculus-Based Framework for Determining Vocabulary Size in End-to-End ASR | 2605.14427 |
| 3.6 | 2026 | 1 | When Switching Algorithms Helps: A Theoretical Study of Online Algorithm Selection | 2604.07473 |
| 3.6 | 2026 | 1 | Cognitive Training for Language Models: Towards General Capabilities via Cross-Entropy Games | 2603.22479 |
| 3.6 | 2026 | 1 | Least-Loaded Expert Parallelism: Load Balancing An Imbalanced Mixture-of-Experts | 2601.17111 |
| 3.6 | 2025 | 1 | Medical Image Classification on Imbalanced Data Using ProGAN and SMA- Optimized ResNet: Application  | 2512.24214 |
| 3.6 | 2025 | 1 | Modeling high dimensional point clouds with the spherical cluster model | 2512.21960 |
| 3.6 | 2025 | 1 | Model-free stochastic linear quadratic control for discrete-time systems with multiplicative and add | 2512.20911 |
| 3.6 | 2025 | 1 | Hyperparameter Tuning-Based Optimized Performance Analysis of Machine Learning Algorithms for Networ | 2512.15779 |
| 3.6 | 2026 | 1 | Hierarchical Besov-Laplace priors for spatially inhomogeneous binary classification | 2511.21441 |
| 3.6 | 2025 | 1 | Learning Where, What and How to Transfer: A Multi-Role Reinforcement Learning Approach for Evolution | 2511.15199 |
| 3.6 | 2026 | 1 | A general framework for adaptive nonparametric dimensionality reduction | 2511.09486 |
| 3.6 | 2026 | 1 | Interpretable Recognition of Cognitive Distortions in Natural Language Texts | 2511.05969 |
| 3.6 | 2026 | 1 | Stein-based Optimization of Sampling Distributions in Model Predictive Path Integral Control | 2511.02015 |
| 3.6 | 2025 | 1 | Automatic Policy Search using Population-Based Hyper -heuristics for the Integrated Procurement and  | 2511.00762 |
| 3.6 | 2025 | 1 | Probabilistic Hyper -Graphs using Multiple Randomly Masked Autoencoders for Semi-supervised Multi-mo | 2510.10068 |
| 3.6 | 2026 | 1 | A Scalable Lift-and-Project Differentiable Approach For the Maximum Cut Problem | 2509.18612 |
| 3.6 | 2025 | 1 | Optimizing Hyper parameters in CNN for Soil Classification using PSO and Whale Optimization Algorith | 2508.16660 |
| 3.6 | 2025 | 1 | Data Compression with Noise Suppression for Inference under Noisy Covariance | 2508.14021 |
| 3.6 | 2026 | 1 | Statistical Multiport-Network Modeling and Efficient Discrete Optimization of RIS | 2508.01776 |
| 3.6 | 2026 | 1 | On the Limitations of Ray-Tracing for Learning-Based RF Tasks in Urban Environments | 2507.19653 |
| 3.6 | 2025 | 1 | Swift-Sarsa: Fast and Robust Linear Control | 2507.19539 |
| 3.6 | 2025 | 1 | Block Tensor Decomposition: A dual grid scheme with formal O(N3) for THC decomposition of molecular  | 2506.19392 |
| 3.6 | 2025 | 1 | LLM Agent for Hyper - Parameter Optimization | 2506.15167 |
| 3.6 | 2025 | 1 | Continuous-Time Output Feedback Adaptive Control for Stabilization and Tracking with Experimental Re | 2506.08042 |
| 3.6 | 2025 | 1 | Learning Deterministic Policies with Policy Gradients in Constrained Markov Decision Processes | 2506.05953 |
| 3.6 | 2025 | 1 | The Impact of On-Policy Parallelized Data Collection on Deep Reinforcement Learning Networks | 2506.03404 |
| 3.6 | 2025 | 1 | LightSAM: Parameter -Agnostic Sharpness-Aware Minimization | 2505.24399 |
| 3.6 | 2025 | 1 | An Analytical Characterization of Sloppiness in Neural Networks: Insights from Linear Models | 2505.08915 |
| 3.6 | 2025 | 1 | Dynamic Domain Information Modulation Algorithm for Multi-domain Sentiment Analysis | 2505.06630 |
| 3.6 | 2026 | 1 | FDA-Opt: Federated Fine-Tuning via Dynamic Update Schedules | 2505.04535 |
| 3.6 | 2025 | 1 | An Analysis of Hyper - Parameter Optimization Methods for Retrieval Augmented Generation | 2505.03452 |
| 3.6 | 2025 | 1 | Hyper -differential sensitivity analysis with respect to model discrepancy: Prior distributions | 2504.19812 |
| 3.6 | 2025 | 1 | Tree Boosting Methods for Balanced andImbalanced Classification and their Robustness Over Time in Ri | 2504.18133 |
| 3.6 | 2025 | 1 | Challenges of Interaction in Optimizing Mixed Categorical-Continuous Variables | 2504.00491 |
| 3.6 | 2025 | 1 | Evaluation-Time Policy Switching for Offline Reinforcement Learning | 2503.12222 |
| 3.6 | 2025 | 1 | Evaluating a Novel Neuroevolution and Neural Architecture Search System | 2503.10869 |
| 3.6 | 2025 | 1 | Risk-aware Trading Portfolio Optimization | 2503.04662 |
| 3.6 | 2025 | 1 | Deep-Unfolded Massive Grant-Free Transmission in Cell-Free Wireless Communication Systems | 2502.13390 |
| 3.6 | 2025 | 1 | Bayesian Optimization for Simultaneous Selection of Machine Learning Algorithms and Hyperparameters  | 2502.09329 |
| 3.6 | 2025 | 1 | Aerial Reliable Collaborative Communications for Terrestrial Mobile Users via Evolutionary Multi-Obj | 2502.05824 |
| 5.8 | 2025 | 1 | Alternative Mixed Integer Linear Programming Optimization for Joint Job Scheduling and Data Allocati | 2502.00261 |
| 3.6 | 2025 | 1 | Random Forest Calibration | 2501.16756 |
| 3.6 | 2026 | 1 | Optimally Emulating Smooth Functions for Bayesian Analyses | 2610.29685 |
| 3.6 | 2026 | 1 | Hyper -ES: Effective Evolution Strategies for LLM Reasoning via Descent Direction Merging | 2608.05541 |
| 3.6 | 2025 | 1 | Hyper -VIB: A Hypernetwork-Enhanced Information Bottleneck Approach for Task-Oriented Communications | 2511.15041 |
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
| 2.8 | 2024 | 1 | A Retrospective Approximation Approach for Smooth Stochastic Optimization | 2103.04392 |
| 2.1 | 2021 | 1 | Self-supervised learning for fast and scalable time series hyper - parameter tuning | 2102.05740 |
| 2.1 | 2020 | 1 | Stochastic analysis of heterogeneous porous material with modified neural architecture search (NAS)  | 2010.12344 |
| 2.1 | 2020 | 1 | Automatic Setting of DNN Hyper - Parameters by Mixing Bayesian Optimization and Tuning Rules | 2006.02105 |
| 2.1 | 2020 | 1 | Hyperparameter optimization with REINFORCE and Transformers | 2006.00939 |

## 读不到全文的（诚实记录）

- arXiv:2410.18118 — HTTP 404
- arXiv:2302.02688 — HTTP 404

_生成于 2026-11-22T13:32:46.514Z；缓存见 .cache/（搜索页与全文 HTML 都在里面）。_