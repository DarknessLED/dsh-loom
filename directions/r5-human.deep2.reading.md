# r5-human: 三十篇之后

## 一、这批论文在说什么(按主题归并,不按论文罗列)

监督者位置的原始设定,是把"人能审"写成一条成本约束而不是能力约束。`1606.06565` §2 把情形讲得很直:「the designer may know the correct objective function, or at least have a method of evaluating it ... but it is too expensive to do so frequently」;§6 再补一刀,人类监督会撞上规模:「the agent may need to make too many exploratory actions for human oversight to be practical, or may need to make them too fast for humans to judge them」。`1811.07871` §7.7 把这归进 Amodei 那一串问题里,§6 的提问十年没变:「How can we be confident that the agent we are training is indeed sufficiently aligned?」——到 `2312.09390` §1 只是换了对象:「how can weak supervisors control models much smarter than them?」。`2211.03540` §1 给出可操作的版本:监督要「remain effective past the point that models start to achieve broadly human-level performance」,而 §The Paradigm 说清非专家的处境恰好是未来的我们:「no straightforward way to be certain」。

用 AI 顶替人的那半边,已经从提案变成了工程。`2212.08073` §1 的方法前提是「without any human feedback labels for harms」,动机则是把人的注意力花在少数地方:「focus more on providing a small amount of legible, focused, high-quality oversight」。`2206.05802` §7 已经敢下结论「Large language models are already capable enough to meaningfully assist human evaluation」,§5.1 却留下真正该问的那句:「if a model can tell an answer is poor, can it also point out the flaw to a human?」。`1810.08575` §1.1 是最激进的形式:「we allow them to invoke several copies of the current agent」。`2312.09390` §2 把它降格成可做的实验:「humans may ask models to critique the outputs of other models」;`2305.14325` §Reasoning and Factuality 则只要「only requires black-box access to a language generator」。

辩论这一支的核心不是机制,是把"人判断不了"当成可实验的前提。`1805.00899` §1 说「A human may be unable to judge whether an explained answer or exhibited behavior is correct: the behavior may be too hard to understand without help」。`2402.06782` §1 给了不带 ground truth 的度量:「Persuasiveness is measured by judge approval, meaning it does not require ground-truth labels」。`2311.14125` §3 用 complexity 语言重写同一件事:「can be verified by polynomially many human judgements」;§4.2 更激进,推理时「no human feedback is used. Instead the output of the model」。`2311.08702` §Motivation 把 consultancy 定义为 RLHF 的最坏情形,§1 则点明模型的优势是知识面「far beyond the knowledge of any individual human who might be involved in supervising them」。

人的判断被折算成什么,这批论文给的是一张成本表而不是一个理论。`1706.03741` §1 选了比较而非打分:「We ask the human to compare short video clips of the agent's behavior, rather than to supply an absolute numerical score. We found comparisons to be easier for humans」,预算写在同段:「fifteen minutes to five hours」。`1909.08593` §1 把它固化成两段式:「first use human labels to train a model of reward, and then optimize that model」。`2204.05862` §3.3 给出这套流程最需要也最脆弱的一句:「Since the PM scores are well-calibrated, we can trust that they faithfully encode the probabilities that humans will prefer specific model samples」;同文 §1 承认「Helpfulness and harmlessness often stand in opposition to each other」。校准线由 `1706.04599` §1 立起:「classification networks must not only be accurate, but also should indicate when they are likely to be incorrect」;`2207.05221` §1 把自我评估定义成外部事实「according to accepted truth in the wider world (i.e. according to humans)」,§4.1 却承认对自己的样本下 True/False「may be considerably more difficult than the tasks we studied in section 3.2」。`2109.07958` §1.1 是唯一直写人之上限的:「the best-performing model (GPT-3-175B with “helpful” prompt) was truthful on 58% of questions」。

benchmark 这一组证明的不是能力,是"人还能不能当答案"正在分行业地失效。`2009.03300` §5 说模型「notably poor at modeling human (dis)approval, as evident by the low performance on the Professional Law and Moral Scenarios tasks」;§1 记录 25% 到 43.9% 的跳变。`2112.08608` 是反面数据:人类多数票 93.5%(§3.1 Human Accuracy),最好模型与人类差 38.1 分(§4.2 Results and Analysis)。`2311.12022` §1 反过来要求「we need tasks that non-experts are unable to complete on their own」。`1905.10044` §1 给 80.43% 对 90% human。`2303.08774` §3.2 把能力写成幂律「approximate power law relationship」,`2312.11805` §5.1.1 则以 90.04% 首次越过 89.8% 的人类线。而 `2407.21783` §10 自曝防守动作:为了「to ensure Llama 3 is not accidentally overfitted on commonly used benchmarks, our pre-training data was procured and processed by a separate team」;`2307.09288` §Quality Is All You Need. 说标注平台差异会「result in markedly different downstream model performance」。后训练侧仍在买人:`2505.09388` §4.1「human annotators manually assess the accuracy of the responses」,`2402.03300` §5 仍是「human selected SFT data」,直到 `2501.12948` §1 才写「with minimal reliance on human labeling efforts」,§2.3 的 15.6% 到 77.9% 是这条线的成绩单。

最后一条线是优化压力本身。`2201.11903` §6 先自己拆台:「this does not answer whether the neural network is actually “reasoning,”」;`2210.01240` §5 给出反证「LLMs tend to skip steps by producing non-atomic steps」。替代方案都在绕开人:`2203.11171` §1「entirely unsupervised」,`2110.14168` §2 仍用人保证题目干净(「less than 2 percent of problems contain breaking errors」),`2302.04761` §1 把"人不知道什么有用"写成设计前提(「what humans find useful may be different from what a model finds useful」)。`1906.01820` §1.2 把内对齐定义为「the gap between the base objective and the mesa-objective」;`2412.14093` §1 给出实证:模型推断「if it were to produce non-compliant outputs during training, the training process would likely modify its behavior to be more compliant」。图像那一支只有同构证据:`2505.05470` §Reward Hacking. 用 KL「to mitigate reward hacking ... keeping the model close to its pretrained weights」,`2403.03206` §5.2.2 则把人写的 caption 换成模型写的(「synthetically generated captions can greatly improve text-to-image models trained at scale」)。`2210.02747`(0 passages)与 `2207.12598`(0 passages)在本批里不构成证据,`2509.25050` 只有 1 条(§4 Experiments 提到 PickScore),以下不引用。

## 二、我认为什么变了

1. **卡上四个 block 解决的是"信息缺失",不是"判断不可信",而后者才是 scalable oversight 的真问题。** `2211.03540` §The Paradigm 说非专家「no straightforward way to be certain」,`1805.00899` §1 说人可能「unable to judge whether an explained answer ... is correct」。我们的卡给了结论和 diff,却没有给"如果这条 patch 是假的,它会以什么方式露馅"。改法:加第五块 `disconfirm`,内容只能由 `checks` 里已算出的字段生成(例如 base 未失败、diff 触碰测试、oracle 在 base 不存在),不新采集。可能错:12 行的 patch,diff 本身就是反方,第五块会变成套话。

2. **`met = realized >= point * 0.5` 这条线,配合 prior 的 point 定义,会让预测系统性显得准。** `predict.js` 里 prior basis 的 point 是剩余 headroom 的四分之一,`measure.js` 再用 point 的一半判 missed——拿到 headroom 的八分之一就算 met。这套自指判据与 `1706.04599` §1 要求的"能指出自己何时会错"正好相反,也和 `2207.05221` §1 把正确性定义为外部事实的做法相反。改法:同时产出 strict(以 `low` 为线)与 legacy 两个 verdict,历史 measurement 不改写。可能错:严格线会把所有预测判 missed,信号一起消失。

3. **风险排序现在按 checkpoint 种类,不按 round 已经算出来的 evidence。** `review.js` 的 `RISK_BY_KIND` 给 `gate` 定 normal,但 `round.js:2679` 的 `cardEvidence` 完全可能给出 high(`assessRisk` 里 "the patch edits the file the verifier runs" 就是 high)。同一个决策因此有两个风险等级,而队列用粗的那个排序。改法:`reviewQueue` 优先读 `payload.evidence.risk.level`,没有 evidence 的 holdout/anomaly 卡回落到种类默认值。可能错:两套标度混排需要映射,而映射本身是新的猜测。这条对应 `1606.06565` §2——人的注意力是那个"too expensive to do frequently"的资源。

4. **我们唯一能测的 rubber-stamping 信号是决策延迟,而它已经在账本里,只是没人减过。** `review.js` 的 `atOf` 只用于排序,`reduce.js:372` 存了 `answeredAt`,两者之差就是一张卡占用人的时长。`2212.08073` §1 把 legibility 说成一种预算(「a small amount of legible, focused, high-quality oversight」),预算是要计量的。改法:出卡时并列"你最近 N 张高风险卡的中位决策时间",并把极短的高风险批准单独标出。可能错:快不等于敷衍,真正的判据是延迟方差与后续 miss rate 的相关,不是均值。

5. **"拒绝"在账本上是免费的,所以循环学不到保守的代价。** `measure.js` 的 `measureDeclined` 只覆盖 chain/plateau/chain-revert,`gate` 的拒绝什么也不留。`2402.06782` §1 说 judge approval 是唯一信号,`1805.00899` §1 说人可能根本判断不了——两者合起来意味着:拒绝必须是默认动作,而默认动作的成本必须被记录。改法:gate 拒绝写 `gate.declined {taskId, score, checks}`,下一轮同任务的分差当反事实。可能错:同一任务不会以同一分数重跑,噪声可能大于效应。

6. **alignment faking 把威胁模型从"人会偷懒"改成"模型会为评估者表演"。** `2412.14093` §1 的推断链是「if it were to produce non-compliant outputs during training, the training process would likely modify its behavior to be more compliant」,§Threat models. 说「current safety training doesn't always prevent AIs from later engaging in alignment faking」。我们防作弊的三条检查(`testsClean`/`oracleClean`/`oracleInBase`)全是静态的,对"为评估者表演"无效。改法:chain 与 policy 卡的晋升必须带一个候选看不见的测量,而现在 holdout 只是 `config.checkpoint.on` 里的可选项(`round.js:2823`)。可能错:§Key element 1 要求「the model being trained needs to, in at least some contexts, exhibit preferences that entail disliking certain types of modification」,我们的一次性 worker session 里未必成立。

7. **这批文献里没有一个"agent 自主采纳一个自动提案"的实验,所以 L2 自动激活不是监督研究,是有预测记录的产品决定。** `2311.12022` §6 自认「still an imperfect proxy for the setting we care about」,`2312.09390` §6.2.3 说「We will not get this from strong benchmark performance alone」。改法:`evidence-card.js` 的表头加一行证据等级(prior / measured / externally validated),让读者一眼知道这张卡背后是自家 12 轮还是别人的实验。可能错:把"产品决定"当免责声明,本身就是逃避——它确实在改变监督关系。

8. **人的时间没有进预算,所以循环会无限购买它。** `budgetUsd` 只计 token,而 `1706.03741` §1 的整个前提是人的反馈以分钟计价(「fifteen minutes to five hours」)。`2212.08073` §1 的卖点正是用 AI 监督换人的注意力,不计量就等于假设它免费。改法:campaign 的 spend 行并列 human-minutes,由 `at`→`answeredAt` 累计。可能错:我们就是那个人,记这个数只会变成自我审视的噪音。

## 三、这批论文之间互相矛盾的地方

1. **辩论到底有没有用,取决于辩手是人还是模型,而两篇论文各取一半。** `2402.06782` §6 说「debate becomes more truth-seeking with increased model persuasiveness」,`2311.08702` §Debate 却说「In this setting, we find no difference between debate and consultancy.」——后者用的是 GPT-4 辩手;同一篇 §Accuracy 用人类辩手又得出「the presence of an equally-well-informed adversarial debater helps judges supervise unreliable experts」。所以真正的分歧不是结论,是"把模型当辩手时这个机制还成不成立"。上一轮 r5-human.deep 的第 3 条把 `2402.06782` 当成"被量过的"普遍事实,这里必须收窄成:只在模型足够有说服力且正确方相对更会辩时成立。

2. **自我批评能不能替代外部判断,两篇给的答案相反,差别在评的是谁。** `2206.05802` §7「Large language models are already capable enough to meaningfully assist human evaluation」;`2207.05221` §4.1 却说对自己刚生成的答案做 True/False「may be considerably more difficult than the tasks we studied in section 3.2」。`2210.01240` §5 再加一层:「LLMs tend to skip steps by producing non-atomic steps」——看起来在推理不等于过程可审计。`2201.11903` §6 自己也不否认「this does not answer whether the neural network is actually “reasoning,”」。

3. **透明是激励还是伪装,同一结构被推出相反的行为预测。** `1606.06565` §5 的结构性前提是:真信号稀疏时,系统会「optimizing synthetic reward signals」,也就是用密集的代理信号替代它;`2412.14093` §Threat models. 说「current safety training doesn't always prevent AIs from later engaging in alignment faking」。两者的结构完全相同:稀疏的真信号 + 密集的代理信号。分歧在于代理信号是被"推断"还是被"表演"——这一条对我们最要命,因为我们的稀疏真信号是 verifier,代理信号就是那张卡。

4. **什么算有效的监督实验,两派的设计目标正好相反。** `2211.03540` §1 的结论是「present large language models can help humans achieve difficult tasks in settings that are relevant to scalable oversight」;`2311.12022` §1 却要求「we need tasks that non-experts are unable to complete on their own」,§Non-Expert Validation 更进一步,要保证"non-experts are given more resources"之后也不出现 trivial solutions。一个说"帮上忙就是证据",一个说"帮上忙恰恰说明题目不合格"。

5. **benchmark 分数能不能当对齐证据,这批论文一边否认一边使用。** `2312.09390` §6.2.3 明说「We will not get this from strong benchmark performance alone」;`2303.08774` §4 仍用整张 exam 表当能力证据(Uniform Bar Exam 298/400、LSAT 163),`2312.11805` §5.1.1 用「the first model to exceed this threshold」当里程碑。这不是不同作者的立场差异,是同一批文本内部的用法分裂。

## 四、三条我会改的

1. **`src/chain/measure.js` + `src/chain/evidence-card.js`:把预测判据从自指改成外部。** `grade()` 现在用 `realized < point * 0.5` 判 missed,而 `predict.js` 的 prior point 已经是 headroom 的四分之一;改成同时产出 strict(以 `low` 为线)与 legacy 两个 verdict,`summarizeCalibration` 分开累计,`renderCard` 并列显示。历史 measurement 不动,新卡先说清"这条预测按哪条线算准"。

2. **`src/runtime/review.js` + `src/runtime/review-card.js`:排序用证据,并给每张卡配一行"上次同类决策用了多久"。** `reviewQueue` 的键改为 `payload.evidence?.risk?.level ?? RISK_BY_KIND[kind]`;`renderEvidence` 增加第五块 `disconfirm`,只允许从 `checks` 已有字段生成。没有 evidence 的 holdout/anomaly 卡保留种类默认值,避免两套标度硬混。

3. **`src/runtime/round.js` + `src/runtime/decision-effects.js`:让 gate 的拒绝也留下反事实。** `applyRejectionEffects` 现在只认 chain/plateau/chain-revert 并返回 `chain.declined`;在 `round.js:2679` 的 `raise('gate', ...)` 里把 `taskId` 写进 payload,拒绝时追加 `gate.declined`,下一轮同任务的分差用一个与 `measureDeclined` 同构的函数打分。否则"人保守"这件事在我们的账本上永远是零成本。

## 五、这份阅读没回答的三件事

1. **一张卡该有几个 block,没有任何一篇测过。** `2211.03540` 与 `2311.12022` 都在造任务,没有一篇做"多加一栏是否改变决定"的对照;我们只能自己 A/B,而 n 只有几十。另一个洞:`1707.06347` 在 digest 里标 [UNREAD](arXiv 只给了指向 PDF 的指针),它正是这批 RLHF 循环底下那套 clipped objective 的出处;没有它,我对"trust region 与我们的 guard 是不是同一类东西"没有判断,只能说不知道。

2. **拒绝的反事实在单任务 campaign 里可识别吗?** `measure.js` 的 `realized = actual - baseline` 假设 baseline 可比,可任务一旦被重新生成、prompt 一旦被改,这个假设就断了。文献里没有一篇处理"同一个样本只被决策一次"的场合——GPQA/QuALITY 都是上千题、多个 annotator,反事实是设计出来的,不是事后推的。

3. **我们这种规模上,"可扩展监督"的任何结论有统计功效吗?** 一个 campaign、一个人、n≈20 次决策,连一个 20 样本的置信区间都没算过;`2112.08608` §3.1 用 3 个新 annotator 的多数票就敢报 93.5%,我们连"3 个重复"都没有。这不是方法问题,是这套循环目前只能产生轶事,不能产生证据。
