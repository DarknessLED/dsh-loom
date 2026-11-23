# top-40 未读九篇：对 promotion gate 的判断

范围：`.tmp/dig-deep-top40.txt` 里的 9 篇。`2603.19461` 在 digest 里记 0 个 section、没有任何正文，凡涉及它的地方只能写 passages 没说。下面每条主张都带 digest 里的 arXiv-id 与 section locator，引文逐字取自该文件；凡是 digest 不能确定的问题，一律写 passages 没说，不用推测补。

## 一、按主题归并

**1. 持续监控不再被当成道德问题，而是接口问题。**
`2210.01948` §1 Introduction 先把传统检验的失效条件写明：「The traditional approach casts doubt on a hypothesis when a selected test statistic takes too extreme a value.」——统计量必须先选定，之后不许改看的时间。同一节用一个真实案例把代价摆出来：「The lead author later disavowed the conclusion and identified the team’s peeking at the data as one of her reasons」，然后给出立场：「we need to go beyond disapproval of peeking, and we instead should give researchers tools to fully accommodate it」。工具的名字由 `1906.07801` §1 Introduction and Overview 给出：e-value 是「an alternative to, and in many cases an improvement of, the classical p -value」。

**2. e 与 p 的分界不在数值大小，在能不能相乘。**
`2410.23614` §1.4 Definitions of e-variables, p-variables, and tests 直说：「The combination properties of e-variables in (iii)–(iv) of Fact 1.3 are not shared by p-variables.」——这不是两条路线的口味差异，是结构差异。`1906.07801` §e -Variables, Test Martingales, Information Projections, General Novelty 把它落成构造：「e -variables are the building blocks of test (super-) martingales , which go back to Ville (1939) .」`2210.01948` §1 Introduction 用同一结构收尾：「the new methodology is based on the concept of a test martingale, along with its betting interpretation.」后两篇都落在可乘的鞅结构上，而不是单点数值；至于 p 值缺少组合性，只有 `2410.23614` 一篇直说。

**3. 任意停时的保证，正是我们每轮都在破坏的东西。**
`2210.01948` §1.2 A terse technical summary of the paper 写得没有余地：这类方法「remain valid at arbitrary stopping times (possibly unknown in advance), accommodating continuous monitoring and analysis of accumulating data and optional stopping or continuation for any reason」。`1906.07801` §Just-in-Time Conditional e -variables: Optional Continuation 把看一轮再决定写成合法动作：「only evaluates each member variable E ( m ) E_{(m)} after m m rounds, and only on the data」，并且「It is therefore perfectly fine (for the Type-I error safety guaranteed by combining Propositions 2 and 1 )」。两句合起来是本批对我们最直接的一条：看、再决定继续或停，本身不需要被禁止；需要被替换的是承载这个动作的统计量。

**4. 指标一旦没有代价，就会被优化成虚报。**
`2410.23614` §16.3.1 E-statistics 用银行监管做类比：风险度量「In banking regulation, the risk measure」……「would result in financial cost」，反过来「a firm may have incentive to forecast」……「arbitrarily (correctly or incorrectly), but forecasting a large」。`2504.13837` 图 1 题注（digest 该篇首行，未标 section 号）给了同一件事在模型评估上的形态：「the average performance (i.e., pass@1) improves, but the coverage of solvable problems (i.e., pass@256) decreases, indicating a reduction in LLM’s reasoning boundary」——均值上去，能力边界下来。`1802.01548` §Discussion 把噪声抬高分的机制说白：「Noisy training means that models may sometimes reach high accuracy just by luck.」，并指出这种噪声赢家的存活时间：「such lucky models may remain in the population for a long time—even for the whole experiment」。

**5. 自适应抽题能省预算，但把选择与打分放进了同一份数据。**
`2402.14992` §Adaptive testing 提出「instead of pre-selecting a subset of examples before evaluating the LLM, it may be possible to select the examples adaptively during the evaluation process」，同节坦白这是借来的做法：「This idea is widely used in the computerized-assisted testing algorithms behind many standardized tests.」。它对成果的口气是克制的：「We expect further performance estimation improvements can be squeezed out by more sophisticated applications of similar ideas.」——方向，不是结论。§2 Problem statement 的目标也只是「Our objective is to choose a small fraction of examples」。

**6. 基准太小与阈值靠调，是同一类错误的两个面。**
`2602.03117` §2.2 Existing Benchmark Statistics 点出单步基准的结构性缺陷：「InjecAgent and ASB are single-step benchmarks; consequently, their average trajectory length and the number of applications involved per task are both exactly one.」，§4.2 Agents and Defenses Evaluation 自己认账：「AgentDyn is just a small open-ended benchmark with limited scenarios and task complexity, which is still far from the real-world settings」。`2101.10617` §Discussion 从另一侧说同一件事：「the change-point detection algorithm is sensitive to the choice of model」，方向是「a less complex model (with smaller K K ) for global fitting gave fewer false positives」，此外「Selecting a suitable window size W W is also very important for our method.」。两篇都在说测量口径不可靠，但口径层次不同：一篇说基准太单薄、自己的构造也离真实太远，一篇说模型与窗口的选择会直接改变假阳性的数量。它们不能互相替代；从这两句推到基准太小会让效应虚高，是我们自己的外推，passages 没说。

## 二、我认为什么变了

1. **我们的 gate 确实在做多重检验，而且是没记账的那种。** 依据：每轮拿新候选和同一个 incumbent 比一次 delta，轮数就是检验次数，`src/runtime/round.js:2320` 的 `beatsIncumbent` 只看当轮，没有任何跨轮累积或 α 分配；对接口径见 `2210.01948` §1.2 A terse technical summary of the paper 的「remain valid at arbitrary stopping times」。（digest 里没有出现 Bonferroni 或 α-spending 一类字样，所以这不是照文献做的校正，是我们自己少了一层结构。）

2. **二值 promote 不够用，必须三态。** 依据：`1906.07801` §Just-in-Time Conditional e -variables: Optional Continuation 的「It is therefore perfectly fine (for the Type-I error safety guaranteed by combining Propositions 2 and 1 )」；我们现在 `src/gate/gate.js:428-437` 把 `gain below threshold` 和 `within measured noise` 都翻成 `promote:false`，审计上分不出证据不足与证明过没收益这两种情形。

3. **`scoreOf` 丢掉 n，从一处小瑕疵升级为结论不可复核。** 依据：`2504.13837` 图 1 题注的 pass@1↑/pass@256↓ 说明单一均值会掩盖边界收缩；而 `src/gate/score.js:58-70` 只返回 `{score, source}`，`src/gate/metrics.js:19-32` 明明已经把 `MUTANTS` 解析成 `metrics.mutants`。丢掉的是分母。

4. **`noiseSpread: 0.1` 是安装默认值，不是我们测出来的值。** 依据：`2101.10617` §Discussion 的「sensitive to the choice of model」与「a less complex model (with smaller K K ) for global fitting gave fewer false positives」；`src/core/config.js:249` 把 0.1 写死，而 `docs/contracts.md` 第 319 行把它描述成安装默认使用的实测 pooled spread，文字与机制不一致。

5. **评估集可以自适应，但选择用的信息必须与判定用的分数分开，否则省下的预算会还回去。** 依据：`2402.14992` §Adaptive testing 的两句提议；`1802.01548` §Discussion 的「such lucky models may remain in the population for a long time—even for the whole experiment」。我们的 `minTasks: 6`（`src/core/config.js:18-19`）小到任何选择偏差都会直接进分数。

6. **基准太小不是别人的问题。** 依据：`2602.03117` §2.2 Existing Benchmark Statistics 对单步基准的判定，以及 §4.2 Agents and Defenses Evaluation 的自认「still far from the real-world settings」。我们的 holdout 在同样的量级上，所以 promotion 的效应量不能按模型能力提升来读。

7. **演化/变异这条路线本身站得住，但它的好只是固定预算下的均值更好。** 依据：`1802.01548` §Comparison With RL and RS Baselines 的「Evolved architectures had higher accuracy (and similar FLOPs) than those obtained with RS」；同一篇 §Discussion 末尾又限定「Some of our findings may be restricted to the search spaces and datasets we used.」。

8. **指标必须让虚报有代价，否则循环会学会报高分而不是变好。** 依据：`2410.23614` §16.3.1 E-statistics 的监管类比——不产生「financial cost」的度量会被「arbitrarily (correctly or incorrectly), but forecasting a large」地写。我们的 killRate 目前没有这种代价。

## 三、互相矛盾

1. **`2101.10617` 说简单模型更少假阳性，`1906.07801`/`2210.01948` 说固定阈值在监控下失效，两者不能同时当指导。** `2101.10617` §Discussion 说「a less complex model (with smaller K K ) for global fitting gave fewer false positives」，把答案放在调模型复杂度和「Selecting a suitable window size W W 」。但 `1906.07801` §e -Variables, Test Martingales, Information Projections, General Novelty 与 `2210.01948` §1.2 A terse technical summary of the paper 的保证不来自参数选择，来自鞅结构；按前者调 K、W 不会得到按任意停时的有效性。同一份工程时间不能同时记在两边。

2. **`2402.14992` 说边评边选能提升估计，`1802.01548` 说噪声赢家会存活整个实验，两者在同一份数据上互斥。** `2402.14992` §Adaptive testing 说「select the examples adaptively during the evaluation process」能改进估计；`1802.01548` §Discussion 说「such lucky models may remain in the population for a long time」。若选择规则用到了候选的分数，两者对同一批任务的结论互相取消；要同时成立，选择与判定必须用不同信息——而 `2402.14992` 的 passages 没说怎么分。

3. **`2410.23614` 的条件性构造与 `2210.01948` 的普适承诺没有对齐。** `2410.23614` §Universal Inference for model selection. 说「Although the limiting distribution of the likelihood ratio statistic is unknown or intractable for general Gaussian mixtures, it admits a simple expression when the underlying mixing proportions are known.」——一般情形不可解，只有特例有闭式。`2210.01948` §1 Introduction 的口气是「we need to go beyond disapproval of peeking, and we instead should give researchers tools to fully accommodate it」。一篇给的是带条件的构造，一篇给的是通用工具箱的口吻；本 digest 里没有任何一处用后者的承诺去回应前者的条件。

## 四、三条我会改的

1. **让分数把 n 带到门槛上，而不是只带一个均值。**
   改 `src/gate/score.js:58-70`：`scoreOf` 返回 `{score, source, mutants, n}`（`metrics.js:19-32` 已经有 `mutants`，接上即可）。改 `src/gate/gate.js:372-382`：`noiseBar` 不再是 `noiseSpread × noiseMultiplier` 的常数，改为 n 的函数，n 低于 `minTasks` 时不产生单侧结论。改 `src/runtime/round.js:2320`：`beatsIncumbent` 增加 n 的前提条件。
   依据：`2504.13837` 图 1 题注（均值掩盖边界）与 `1802.01548` §Discussion（噪声赢家存活）。这一步先把可复核补上，不引入新统计量。

2. **新建 `src/gate/sequential.js`，把 promote 布尔换成三态。**
   现在 `src/gate/` 下没有这个文件。接口按 `eValue(discordant, {lambda})` 与 `commitDecision({discordant, alpha, lambda}) → {commit, decision:'commit'|'defer'|'reject', eValue, firstCrossing, reason}` 落地；`src/runtime/round.js:2324` 的 `checks.noise` 保留为审计字段但不再是唯一出口；`docs/contracts.md` 第 273 行把 `noiseSpread * noiseMultiplier` 这条写死的规则改写，注明 defer 是一个合法结论而不是失败。
   依据：`1906.07801` §Just-in-Time Conditional e -variables: Optional Continuation（看一轮再决定是允许的）、`2410.23614` §1.4 Definitions of e-variables, p-variables, and tests（可乘性是 e 独有的）、`2210.01948` §1.2 A terse technical summary of the paper（任意停时）。

3. **把 `noiseSpread` 从安装默认改成 per-campaign 实测，并让已有的 mde 代码进生产路径。**
   改 `src/core/config.js:249`：无实测时该值退化为 `null` 而不是 0.1（`src/runtime/round.js:2305-2309` 已经写了 null 分支，正好接得上）。把 `src/loop/ab.js:200-212` 的 `cannot-distinguish` 与 `:89 mdePaired` 接进 gate 的 defer 理由：这两个函数现在只被 `tests/ab.test.mjs` 调用，生产路径走的是 `loop/replay.js` 的 `comparePolicies`，等于写了没用。
   依据：`2101.10617` §Discussion（阈值选择本身就是敏感性来源）与 `2410.23614` §16.3.1 E-statistics（没有代价的度量会被博弈）。

## 五、没回答的三件事

1. **`2603.19461` 到底说了什么。** digest 里它只有标题行、0 个 section，正文一个字没有，所以关于它的一切 passages 没说；要判断得回去读全文，不能用这批 digest 补。

2. **α 与 λ 具体取多少、defer 该等几轮。** 本批给了结构（`1906.07801` §Just-in-Time Conditional e -variables: Optional Continuation、`2210.01948` §1.2 A terse technical summary of the paper），没给数字。`1906.07801` §3.1 One-parameter models with minimum relevant effect size 只写到前提：「If, as is standard practice in e.g. medical statistics, we have a minimum clinically relevant effect size」，没有说我们这种 killRate 场景该取多大。passages 没说。

3. **holdout 与自适应选择怎么共存，以及一次 look 花多少钱。** `2402.14992` 说了该做什么（§Adaptive testing），没说怎么防止选择污染 holdout；九篇都在谈统计保证，没有一篇把每轮的美元成本写进判定。两处都是 passages 没说，得我们在 `src/gate/sequential.js` 和预算层自己定，而且定了要写进 `docs/contracts.md`，否则下一轮又变成隐式约定。
