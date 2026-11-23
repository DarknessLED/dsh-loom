# 十八篇被四个以上方向引用、我们却从未读过正文的工作

这批来自 research/out/deep-bridges.json（18 篇，note ok 18/18）。判断段分两部分：前半由 A 写、后半由 B 写，各自只对自己读到的九篇负责。凡写「passages 没说」的地方，是 digest 里确实没有对应段落，不是省略。

范围说明：按题目给的显式区间（`2602.02276` 至 `2407.01502`，含两端）读，digest 里这一段是 14 条而不是 9 条。下面覆盖这个区间内的全部条目（区间按 id 划，不按条数截）：若按条数截断到第九条 `2001.08361`，会漏掉成本与有效性讲得最具体的五条（PaperBench、HealthBench、自演化 agent 综述、GPT-5 系统卡、AI Agents That Matter），而它们正是本题的问点。

## 一、按主题归并

**第一组：成本是基准设计的一部分，不是跑完之后的账。** `2504.01848` §2.6 把贵写成基准自身的属性：“Running a full evaluation on PaperBench is expensive in terms of agent model inference as well as the compute environment provided to agents.”，它的应对不是省钱技巧而是一个降级基准，明确“skipping the focus on executing the code to verify that results are reproduced”。`2407.01502` §6 把贵与统计能力直接连起来：“The high cost of evaluating agents makes it is hard to estimate confidence intervals.”（原文如此）`2507.21046` §Coverage Gaps 则把缺成本当缺陷：“Efficiency suffers from sparse and inconsistent reporting of evolution costs.”——三处说的是同一件事：成本先决定你能测几次，再决定你的分数有没有误差棒。

**第二组：分数是协议的产物，换协议就换数。** `2310.06825` §3 为了可比性重跑全部基准，并把差异摆上台面：“on MBPP, we use the hand-verified subset 2) on TriviaQA, we do not provide Wikipedia contexts.”；`2602.02276` §Evaluation Configurations 固定温度、top-p、上下文，并把重测过的数“marked with an asterisk (*)”。`2408.00118` §5 把这件事量化成方差：“Table 11 shows the standard deviations of MMLU scores for 12 formatting/evaluation combinations, a proxy for undesired performance variability.” `2504.20073` §3.3 与 `2408.03314` §1 分别从固定提示数与 best-of-N 预算两侧说明同一件事：读数旁边必须挂条件。这些例子放一起，同一个模型名下的两个数可能不是同一次测量。

**第三组：有效性被拆成几个可检查的问题，而不是一个难度刻度。** `2505.08775` §1 拆得最干净：“Meaningful : Do scores reflect real-world impact?”、“Trustworthy : Are scores faithful indicators of physician judgment?”、“Unsaturated : Do benchmarks still have headroom to support progress?”。`2311.07911` §2.2 补了第四种病，连程序判据也会错判：“Even though we can verify if an instruction is followed using simple heuristics and programming, we found that there are still false negatives.” 两篇都没有把有效性直接写成三者的联合属性，但前者验的是分数与真实影响、与医生判断的对应，后者验的是判据自身的误判；并读下来，有效性至少落在基准、判据、题目分布三个位置上。

**第四组：开放任务与研究型任务，分数只能对着 rubric 与人类基线读。** `2504.01848` §2.3 说明分数怎么造出来：“A rubric is organized as a tree of requirements, with each leaf node specifying a single clear criterion to pass or fail”，§1 给出唯一一次人类对照：“our human baseline of ML PhDs (best of 3 attempts) achieved 41.4% after 48 hours of effort, compared to 26.6% achieved by o1 on the same subset.”。`2605.08678` §Task structure 把同类要求写成准入条件：“at least 3 strong human baselines including the SOTA ones that we can reproduce”，`2506.18088` §4 则把基准定义成泛化装置：“a standardized benchmark for evaluating policy generalization across tasks”。`2504.01848` 的这几段没说没有人类基线的分数就不算能力证据，那一句是我的读法而不是它的话。

**第五组：预算与分数落在同一个坐标里。** `2001.08361` §1 的幂律是有条件的：“Throughout we will observe precise power-law scalings for performance as a function of training time, context length, dataset size, model size, and compute budget.”，同篇 §Convergence is inefficient 说明预算怎么花会挪动最优点：“we attain optimal performance by training very large models and stopping significantly short of convergence”。`2302.13971` §1 把推理预算写成选型标准：“given a target level of performance, the preferred model is not the fastest to train but the fastest at inference”；`2602.02276` §Reward Function 更进一步，把预算写进奖励：“To optimize resource consumption, we also incorporate a budget-control reward aimed at enhancing token efficiency.”。

**第六组：开放式评估只剩裁判读数，而裁判自己也要被评。** `2412.19437` §5.3.3 明说开放式任务用模型裁判：“In addition to standard benchmarks, we also evaluate our models on open-ended generation tasks using LLMs as judges”，`2410.21276` §3.2 把被评对象缩到文本：“We always score only the textual content of the model output”。`2505.08775` §Macro F1 于是把裁判本身当分类器去验：“we treat grading as binary classification (met/not-met)”。`2508.05668` §Metrics 把这一取向说白：“Most benchmarks assess the performance of search agents based on the effectiveness of the final output.”——开放式分数因此不是能力读数，而是某个裁判在某套 rubric 下的判读，裁判自己的 F1 才是这个分数的误差来源。

## 二、我认为什么变了

1. 成本应该写进基准的定义，而不是跑完之后的账。依据：`2504.01848` §2.6 直接发行一个便宜变体，把昂贵当成可裁剪的设计项。
2. 引用别人的数字之前，必须用别人的管线重跑一遍。依据：`2310.06825` §3 为公平比较重跑全部基准并列出两处协议差异；不重跑，手里就只有没有协议的数。
3. 不带协议的数字不能放进同一张表。依据：`2602.02276` §Evaluation Configurations 固定温度、top-p、上下文，并把重测过单独打星；需要打星这件事本身说明星号数与未打星数不是一列。
4. 基准失效有三种病，我以前只认一种。依据：`2505.08775` §1 的 meaningful / trustworthy / unsaturated 三问；我过去的动作只有换更难的题，那只治饱和。
5. 变难导致的分数下降可以是正确信号。依据：`2601.03267` §3.2 的“scores are therefore expected to be lower than the standard evaluation.”，它把偏低从退步改写成设计意图。
6. agent 的分数可以被 retry 买出来，accuracy 不能单独报。依据：`2407.01502` §2.1“the accuracy of AlphaCode increases from close to 0% zero-shot to over 15% with 1,000 retries and over 30% with a million retries”，以及 §6“set a cost limit of USD 4 per task”。
7. rubric 让评分可审计，但把成本转移给了出 rubric 的人。依据：`2504.01848` §2.3 每个叶子是一个二值判据，§1 说单次复现的评分要几十小时。
8. benchmark score 的合法含义只剩在给定协议、预算、基线下的相对位置。依据：`2001.08361` §1 的幂律只在性能“limited by only either the number of non-embedding parameters”这类受限条件下成立，它不预测排行榜名次。

## 三、互相矛盾

- 成本该不该进表。`2407.01502` §4 说“reporting costs breaks many properties of benchmarks that we take for granted: measurements don’t change over time (whereas costs tend to come down) and different models compete on a level playing field”；`2507.21046` §Coverage Gaps 说“Efficiency suffers from sparse and inconsistent reporting of evolution costs.”。同一张基准表，前者把成本当污染，后者把缺成本当缺陷，两种默认值不能同时采用。
- 便宜变体算不算同一个基准。`2504.01848` §2.6 的 Code-Dev 把复现验证整个拿掉仍叫同一个基准；`2605.08678` §Task structure 则要求任务自带至少三条可复现的强人类基线。一个说可以不做复现验证就出分，一个说没有可复现基线就不是有效任务；它们嘴里的分数不是同一个东西。
- 子集分数能不能比。`2410.21276` §3.3.3 写“these scores should not be compared with publicly reported benchmarks on the same task.”；`2601.03267` §3.2 却在解释生产集分数为什么低于标准评估，把跨集合的高低差当成可解释的信号。前者禁止的比较，后者正在做。
- performance 一词指什么。`2001.08361` §1 把 performance 写成 N/D/C 的函数；`2310.06825` §3 说明同一模型换协议、换子集就换数。若后者成立，前者的因变量就不是排行榜上那个数，两篇不能同时用同一个 `performance` 指同一个量。

## 四、三条我会改的

1. 给晋升门加测量协议字段，跨协议直接拒。落地在 `src/gate/gate.js`：它已经有一条度量不可比分支（`docs/contracts.md:271`：候选有 killRate、incumbent 没有就 `reject("incomparable measurement")`），把它从度量种类扩到协议——evidence 带 `regime = {promptHash, temperature, topP, subsetId, n}`，与 incumbent 不同就拒，reason 写明哪一项不同。依据：`2602.02276` §Evaluation Configurations、`2410.21276` §3.3.3。没有这一条，我们的 `delta` 会把两次不同测量的差当成进步。
2. 每轮把分数、花费、每任务尝试次数绑在一起记，缺一项不许晋升。落地在 `src/runtime/round.js` 的轮次记录（现在只写 `score`、`scoreSource`、`promoted`，见 `round.js:2700`）加 `evalUsd` 与 `attemptsPerTask`，并在门里加一条：gain 只在 attempts 高于 incumbent 时成立，按 retry 买来的分拒绝。依据：`2407.01502` §2.1 与 §6。
3. 给 holdout 加准入，没有基线与退化读数的任务不许当 holdout。落地：新增 `docs/benchmark-validity-2026-11.md` 写三问清单，并在 `src/runtime/sampling.js` 的 holdout 选取处过滤——任务必须有记录的 `baselineScore`，`killRate` 不能全部堆在 0 或 1，否则退回普通轮。依据：`2505.08775` §1、`2605.08678` §Task structure；`2601.03267` §3.2 说明更难要事前写进设计，不能事后解释。

## 五、没回答的三件事

1. 人类基线怎么计价。`2504.01848` §1 给了“48 hours of effort”与 41.4%，但 the passages do not say 这 48 小时按什么价折算进基准成本，也没说 “best of 3 attempts” 是不是允许的基线定义。
2. 差多少算信号。`2601.03267` §3.2 说生产集分数“expected to be lower”，`2505.08775` §1 要求基准留有 headroom，但两篇都没给噪声尺度；`2407.01502` §6 只说贵到“hard to estimate confidence intervals”，没给区间宽度。可分辨阈值，the passages do not say。
3. 打星的重测数与自报数能不能同桌。`2602.02276` §Evaluation Configurations 只说重测条件一致并打星，没说星号数与未打星数的可比性；`2310.06825` §3 只说协议不同会有差异，没说差异多大。跨来源分数能否合并，the passages do not say。


覆盖范围先对齐一下，因为"后九篇"是个位置主张而 digest 的排列不是按年份：digest 共 18 条，最后九条按文件顺序是 `2504.20073`、`2310.06825`、`2311.07911`、`2605.08678`、`2407.01502`、`2408.00118`、`2408.03314`、`2506.18088`、`2508.05668`。题目给的起点 `2408.00118` 在这份文件里是倒数第四条，`2408.00118` 到 `2508.05668` 只有四条，凑不出九条；所以我按"末尾九条"取，这九条里包含题目点名的整个区间。两点后果需要写明：一、`2001.08361`（scaling laws 原文）正好落在窗口之外，所以本文里的"scaling"只以三种形态出现——参数口径、预算口径、turn/推理预算，不是幂律拟合；二、digest 是摘录，每个错过的机制都算"段落没说"，不当作"论文没说"。

先说一个覆盖事实，免得后面被追问：这九篇里没有一篇是 scaling law 的原始论文（`2001.08361` 在前九条），所以"scaling"在这批里只以三种形态出现——参数口径、预算口径、turn/推理预算。digest 是摘录不是全文，下面凡是只有一段支撑的地方都写"一篇"，凡是段落没给数的地方都写"段落没说"。

## 一、按主题归并

**第一组：评测设置写在正文的哪一层，九篇差了两个数量级。** `2504.20073` 把设置钉死在正文里："We evaluate on 256 fixed prompts per environment with temperature T = 0.5 T{=}0.5 , truncating episodes after 5 turns."（`2504.20073` §3.3 Evaluation Metrics）——样本数、温度、截断轮数三个都给了，指标还列了五项。`2310.06825` 只给到"用自家流水线重跑"这一层："We compare Mistral 7B to Llama, and re-run all benchmarks with our own evaluation pipeline for fair comparison."（`2310.06825` §3 Results），温度、few-shot 数、解码方式一概不在摘录段落里。同一节的下一段才补了两条具体差异："1) on MBPP, we use the hand-verified subset 2) on TriviaQA, we do not provide Wikipedia contexts."（`2310.06825` §3 Results）——也就是说，读者要判断"这两个分数能不能比"，靠的是作者顺手列的两条脚注，不是任何契约。`2408.00118` 走的是第三条路：不给采样设置，先给参数口径——"Note that we consider total parameters, not active parameters, since total memory usage is often what limits the use of open models on standard devices."（`2408.00118` §6 Evaluation）。三篇合起来说明：模型报告里的"评测设置"不是一个字段，至少是三件不同的事（采样、协议差异、可比单位），而它们各自被写在不同层级。

**第二组：规模主张的单位正在从"参数个数"换成"资源口径"。** `2310.06825` 用的是换算："We computed “equivalent model sizes” of the Llama 2 family"（`2310.06825` §3 Results），结论是 MMLU 上"mirrored performance that one might expect from a Llama 2 model with more than 3x its size"（同节）。`2408.00118` 拒绝换算，改用显存视角的总参数（上引 §6）。`2605.08678` 把单位推到任务定义里：agent 拿到的是"the task description, action and test budgets"（`2605.08678` §Infrastructure），并且它明确测过"去掉预算约束"会发生什么——"it opens a recurring shortcut: agents can increase the submitted model’s capacity to obtain higher scores rather than improve the method itself."（`2605.08678` §Validity controls）。一篇论文（`2605.08678`）把这条写成机制：预算不是成本控制的附属品，是防止"改大自己"的护栏。

**第三组：test-time compute 的关键结论是"分配"而不是"总量"。** `2408.03314` 先把它形式化："we view the use of additional test-time compute through the lens of modifying the model’s predicted distribution adaptively at test-time, conditioned on a given prompt."（`2408.03314` §2）。然后给了一个反直觉的实测：总量相同的时候方法差异被平均掉，分难度之后才现形——"while in aggregate, beam search and best-of-N perform similarly with a high generation budget, evaluating their efficacy over difficulty bins reveals very different trends."（`2408.03314` §5.3）。最后把 pretraining 与 test-time 放进同一个预算轴："we use this approach to exchanging test-time and pretraining compute to compare our compute-optimal scaling against scaling up model parameters by a factor of ∼ 14"（`2408.03314` §7），并给了三个比值 "0.16 ( R << 1 R<<1 ), 0.79 ( R ∼ 1 R\sim 1 ), and 22 ( R >> 1 R>>1 )"（同节）。另一条路线是"加轮数"：`2508.05668` 把搜索 agent 的扩展写成"how agents scale up search turns and utilize complex search structures ( i.e. , parallel, sequential, and hybrid)"（`2508.05668` §1 Introduction）。两篇都在扩计算，但一篇扩的是候选数与验证深度，一篇扩的是检索轮次——这是本批里唯一成对出现的"扩展轴"。

**第四组：判据从人退到程序，再从程序退到模型，每一步都留下一个没被量化的缝。** `2311.07911` 的整个设计建立在"可程序判定"上："These verifiable instructions are atomic instructions for which one can use a simple, interpretable, and deterministic program to verify if corresponding responses follow the instructions or not."（`2311.07911` §1 Introduction），但它自己先承认缝在哪："Even though we can verify if an instruction is followed using simple heuristics and programming, we found that there are still false negatives."（`2311.07911` §2.2 IFEval metrics）——给了例子（markdown 加粗导致字符串比对失败），没给率。`2508.05668` 把这条演化史直接写出来："progressing from simplistic rule-based metrics to more intricate LLM- and Agent-based judging paradigms"（`2508.05668` §Judge），理由是 rule-based "fail to account for semantic variations"（同节）。再往上一层是人：`2408.00118` 的 Arena 分数来自"blind side by side evaluations by human raters against other state of the art models"（`2408.00118` §LMSYS Chatbot Arena）。三种判据各有一个没被量化的量：假阴性率、judge 与人的一致率、评分者间一致性——三篇都没在摘录里给。

**第五组：agent 评测的经济性已经不是脚注，而是方法论的一部分。** `2407.01502` 把重试次数与精度的耦合摆到最前："the accuracy of AlphaCode increases from close to 0% zero-shot to over 15% with 1,000 retries and over 30% with a million retries"（`2407.01502` §2.1）。它同时指出这也让统计变贵："The high cost of evaluating agents makes it is hard to estimate confidence intervals."（`2407.01502` §6）。标准化那一节的说法是"还没有标准"："there are no clear standards for providing agent evaluation scripts"（`2407.01502` §6）。而 `2605.08678` 已经是"有标准"的形态：统一后端 "Apptainer, Docker, Conda, and Harbor"（`2605.08678` §Infrastructure），任务结构里还要求"at least 3 strong human baselines including the SOTA ones that we can reproduce"（`2605.08678` §Task structure.）。两篇不是互相驳倒，是同一件事的两个时间点：一篇描述缺口，一篇是补缺口的一次尝试。

## 二、我认为什么变了

1. **"同一个 benchmark 名"不再等于"同一把尺子"，这一点现在有正文证据，不再只是常识。** 依据：`2310.06825` §3 明说重跑时 MBPP 用 hand-verified 子集、TriviaQA 不给 Wikipedia 上下文——两条都足以单独改变分数。
2. **报告的方差要按"格式"分层，而我们已经把它当成单一噪声。** 依据：`2408.00118` §5 用"12 formatting/evaluation combinations"测 MMLU 的标准差，并点名 Mistral 7B 显著更差；也就是说同一个模型换一种提示格式的波动，本身就是一个可报告的量。
3. **参数个数作为可比单位正在失效，取而代之的是"总参数（显存）"或"等效规模"两种互不兼容的口径。** 依据：`2408.00118` §6 明确选总参数而弃 active 参数，`2310.06825` §3 选等效规模换算。
4. **预算必须是任务定义的一部分，否则 agent 会改大自己而不是改好方法。** 依据：`2605.08678` §Validity controls 的 capacity-budget control 直接报出这个捷径。
5. **test-time compute 的收益是任务难度的函数，不是总量的函数。** 依据：`2408.03314` §5.3 聚合上看不出差别、按难度分箱后差别很大。
6. **"试几次"和"得几分"在我们的账本里必须同时出现，否则分数不可解释。** 依据：`2407.01502` §2.1 的重试-精度曲线（0% → 15% → 30%+），以及 §6 的成本-置信区间耦合。
7. **可程序判定的判据也会有系统性的假阴性，这不是实现 bug 而是设计属性。** 依据：`2311.07911` §2.2 举的 markdown 例子——语义上照做了，字符串上没照做。
8. **数据规模可以生成，但"跨 embodiment"这类主张只能靠评测侧兑现。** 依据：`2506.18088` §1 给的是 100,000 条轨迹、50 个任务、五个平台，而 §4.5 的评测只在一个 embodiment 上跑（见第三节）。

## 三、互相矛盾

- **可程序判定到底够不够：`2311.07911` 与 `2508.05668` 不能同时成立。** 前者把整张 benchmark 建在"simple, interpretable, and deterministic program"上（`2311.07911` §1），只把 false negatives 当边角；后者说 rule-based judges "fail to account for semantic variations"，判据已经整体迁到 LLM/agent（`2508.05668` §Judge）。如果后者的判断成立，前者的分数就是一个下界而不是测量值；如果前者成立，后者换 judge 换掉的是可靠性而不是能力。两篇都没给假阴性率/一致率，所以谁对目前无法在这批段落里裁决。
- **"小模型打赢大模型"该按哪个参数口径排名：`2408.00118` 与 `2310.06825` 冲突。** 前者按总参数比，并给出 Arena 上的结论 "Gemma 27B (Elo 1218) ranked higher than Llama 3 70B (Elo 1206)"（`2408.00118` §LMSYS Chatbot Arena）；后者按等效规模换算，主张 7B 对 MMLU 相当于"more than 3x its size"的 Llama 2（`2310.06825` §3）。两种口径不能同时是一张比较表的横轴：一个说"数总数"，一个说"换成等效值再比"，同一对模型会排出不同名次，而两篇都没说自己的口径可以跨论文相加。
- **`2506.18088` 的"跨 embodiment 基准"与它的评测协议不能同时成立。** 正文一侧写"data collection and evaluation on five distinct robot platforms, enabling comprehensive cross-embodiment benchmarking"（`2506.18088` §3.2），实验一侧写"Evaluations are conducted on all 50 benchmark tasks using the Aloha AgileX dual-arm embodiment"（`2506.18088` §4.5）。五平台是数据与任务的覆盖面，单平台是评测的覆盖面；把前者当成后者的证据，就是这批里最典型的"分母是主张"错误。

## 四、三条我会改的

1. **每个分数必须带上产生它的评测设置，且不同设置下的分数禁止直接相减。** 落点：`src/gate/score.js` 的 `scoreOf` 现在只返回 `{score, source}`（`src/gate/score.js:58`），扩成 `{score, source, config}`，`config` 至少装 verify 命令、超时、重试数、任务集 id；`src/runtime/round.js:2320` 的 `beatsIncumbent` 在 `config` 不一致时返回不可比（让 `checks.beatsIncumbent` 有一个显式的 `incomparable` 分支），而不是照旧做减法。依据是 `2310.06825` §3 那两条协议差异和 `2408.00118` §5 的 12 种格式方差——它们说明"同一个 benchmark 名"下的两个数可以差出一个决策。
2. **把"每任务评几次"和误差棒一起变成显式输入，默认不再是"没测过"。** 落点：`src/runtime/sampling.js` 的 `pickTask` 只决定选哪个任务，不决定评几次；`src/runtime/round.js:2305-2309` 里 `noiseSpread` 在配置没测过时是 null，等于默认没有误差棒。改法：`evalset.repeats` 成为显式字段（缺省 1，但要在 `round.finished` 上记 `repeats:1`），`repeats > 1` 时用实测标准差覆盖配置值，区间不分离时按 R10 已提议的 `defer` 落账。依据：`2407.01502` §2.1 说明次数能把 0% 抬到 30%+，§6 说明次数贵到 CI 估不出来——两头都在说"次数"是分数定义的一部分。
3. **在 gate 上加一道"分母捷径"检查，锁住候选改小自己判据的规模。** 落点：`src/gate/metrics.js` 已经在解析 `MUTANTS=` 与 `KILLRATE=`，但没有任何一回合拿两个回合的 `MUTANTS` 相比；新增 `src/gate/capacity.js`（按仓库规矩在 `docs/contracts.md` 模块地图补一行，说明它为什么存在），规则：候选把 `MUTANTS` 或测试数量改小、或把 verify 命令指向更小的任务集时，记 `checks.denominator`、判 high 风险、不参与晋升。依据：`2605.08678` §Validity controls 的 capacity-budget control——去掉预算约束后 agent 靠放大容量拿分；我们的对应物就是放大/缩小分母。

## 五、没回答的三件事

1. **同一设置下重复评测的方差是多少。** `digest` 里只有 `2408.00118` §5 的"12 种格式组合"的标准差，那是格式间方差，不是同格式重跑方差；`2407.01502` §6 只说成本高到 CI 难估，没给数。所以我们 `noiseSpread` 该取 0.02 还是 0.2，段落没说。
2. **test-time 预算怎么折算成我们的计价单位。** `2408.03314` §7 的 R 是推理预算与预训练预算之比，但段落没说推理预算按 token 还是按 FLOPs 计；`2508.05668` §1 说轮数可以扩，也没给单轮成本。于是"把 $0.05 换成几次重试/几轮检索"目前没有汇率。
3. **判据的假阴性率。** `2311.07911` §2.2 承认 false negatives 存在但没给率；`2508.05668` §Judge 说 rule-based 已被 LLM/agent judge 取代但没给一致率；`2605.08678` §Task structure 要求 3 个人类基线，却没说评分者间一致性。我们二值 `verify` 的假阴性率，在这批段落里没有任何可比数字。
