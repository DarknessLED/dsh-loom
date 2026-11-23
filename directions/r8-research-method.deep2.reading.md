# r8-research-method: 三十篇之后

## 一、这批论文在说什么(按主题归并,不按论文罗列)

**证据的单位从段落掉到句子和 claim，于是"可核验"被迫拆成两个数。** `2304.09848` §1 把这件事量化了：「merely 51.5% of generated sentences are fully supported with citations (citation recall)」，并且把它与 precision 分成两个独立指标——一篇通篇带引文的报告，可以召回过半、精确很低，两个数不会互相补偿。`1803.05355` §1 给出人工侧的真实成本：Fleiss κ 0.6841，证据检索 95.42% precision / 72.36% recall，而整条 pipeline 只有 31.87% 的 verification accuracy——**标注天花板在那里，自动判决再准也只是逼近它**。`2508.04183` §1 把这套形状写成任务定义：「the DR task can be split into two subtasks: 1) synthesizing claims that collectively answer the user's query, given a document corpus; and 2) writing a report based on these claims」，claim 因此成了比段落更正确的记账单位。`2511.07685` §Expert Curated Benchmarks 反过来批现有基准「a reliance on static datasets or answer keys, and the use of non-expert or automated evaluation, including coarse metrics or auto-generated rubrics」；`2506.21506` §4.3 给出最细的一种错——Synthesis Error，「distorting the price listed on a product page」，引文是真的、综合是错的。`2402.14207` §4.2 用 ROUGE 与 FLAIR NER 的 entity recall 顶替可核验性，§6 Human Evaluation 又退回人工 1-7 分制并按维基「verifiable with no original research」的标准判，**自动与人工两套并行，说明指标只是代理**。

**检索不再是"上游步骤"，而是被单独测量、单独造难度的对象。** `2407.12883` §Existing retrieval systems perform poorly on BRIGHT 给出最刺眼的落差：最好的模型 only 24.3 nDCG@10，而同一个 SFR-Embedding-Mistral「scores 59.0 on the MTEB retrieval subset」——34.7 分的缺口不是模型容量，是任务形状。`2310.06770` §4.1 说明检索在大仓库里怎么失真：BM25 在约 40% 的实例里检索到 oracle 文件的超集，但「Dense retrieval methods are ill-suited to our setting」，换检索器不是单调改进。`2212.10509` §Retriever 把评测条件钉死：最多 15 段，量 gold paragraph 的 recall，超参只在 dev 上调。`1809.09600` §3 Processing and Benchmark Settings 用 bigram tf-idf 混入 8 段干扰文档，「to challenge the model to find the true supporting facts in the presence of noise」——**噪声是被构造的，不是自然出现的**。`2312.10997` §II-A 把这套实践命名为 Naive RAG 的「indexing, retrieval, and generation」三段，§II-C 2 再指出真正的增益来自 Rewrite-Retrieve-Read 这类改写查询的做法，而不是更大的索引。`2506.05176` §1 把这一层落到模型上（embedding 与 rerank 直接决定召回），`2302.03495` §5.1 Single Prompt Query Formulation 则给出它的代价：ChatGPT 生成的布尔查询「generally obtain a higher precision ... with a trade off of lower recall」——**精确率与召回率在查询构造层就已经对立**。

**搜索在训练侧被建模成环境，"在哪张网上训练"被证明是要付代价的选择。** `2503.09516` §1 报「two LLMs achieving respective average relative improvements of 41% and 20% over RAG baselines」；`2503.05592` §2.2.1 Reward Design 的两阶段奖励更值得抄：Stage-1 只奖励"会用检索器"，「without considering the correctness of the model's answers」——先学动作，再学对错。`2504.03160` §Importance of Real-World Environment in Training 给反面证据：用本地 RAG 训出来的 R1-Searcher 放到真实网上，「still performs substantially worse than DeepResearcher」，环境与训练分布不匹配时能力不长脚。`2507.02592` §2 Problem Definition 把难度来源讲清楚：「BrowseComp immerses the agent in a vast, unstructured information space where the solution path is not predefined」，其 SOTA 靠合成「complex, hard-to-reduce uncertainty」的数据。`2602.15763` §4.2.3 Search Tasks 是同一件事的工业版：multi-hop QA 合成 pipeline，「Each question requires multi-step reasoning grounded in evidence aggregated from multiple web sources」。

**"想"与"搜"是两种模式，而且不总是相容。** `2606.19348` §5.4.2 Search 把产品行为写明了：「the "non-think" mode employs Retrieval-Augmented Search (RAG), whereas the "thinking" mode utilizes agentic search」——同一家把两种范式同时留在线上，说明它们服务的任务不同。`2505.09388` §Appendix A Appendix 更直接：「In thinking mode, the model's performance slightly degrades」，作者的猜测是 thinking 对「these retrieval tasks, which do not rely on reasoning」没有帮助、反而干扰。`2501.12948` §6 Conclusion, Limitation, and Future Work 承认「DeepSeek-R1 cannot leverage tools, such as search engines and calculators」；`2201.11903` §6 Discussion 早就把这条界线画好了——CoT「emulates the thought processes of human reasoners」不代表网络「is actually "reasoning"」，所以"想得更久"与"搜得更准"之间没有先验的单调关系；`2606.19348` §Knowledge and Reasoning 给出另一个极端：Lean 形式化任务上「running up to 500 tool calls with max reasoning effort」。这批里另有四份模型技术报告（`2505.09388`、`2606.19348`、`2602.15763`、`2511.21631`），检索在其中只占一两节，`2511.21631` §3.2.2 Knowledge 谈的还是数据的长尾采样而不是检索——**检索在这些报告里是产品特性，不是研究对象**。

**评测对象从"答案"移到"轨迹与报告"，judge 本身也被 agent 化。** `2311.12983` §1 的数字仍是这条线的锚：GPT-4 在最简单的题上不超过 30%，最难的 0%，人类 92%。`2506.21506` §4.2 Main Results 换成相对量：「OpenAI Deep Research, already achieves 50-70% of human performance while spending less than half the time」。`2410.10934` §4.1 Proof-of-Concept 说明 judge 要靠证据而不是靠打分：模块化组合 (1)(2)(3)(5)(6) 时性能最高，因为它需要「high-quality factual」证据。`2308.03688` §4 Evaluation of AgentBench 一次评 29 个模型；`2207.01206` §4.1 Rule Baseline 提醒词法基线并不弱——直接拿指令原文去搜、点第一个商品，「would lead to a non-trivial attribute reward」。`2406.12045` §4.2 Key Characteristics 的取舍写得最诚实：「we trade off quantity for quality」。

**自动化科研这条线从"模板流水线"走到"树搜索/进化"，但它自己承认自评不可信。** `2408.06292` §3 The AI Scientist 的预算很朴素：20 轮 Semantic Scholar 调用换 related work。`2504.08066` §2 Background 直指 v1 的病：「often resulted in short-sighted experimentation」，v2 的解法是 agentic tree search 加 VLM feedback。`2506.13131` §1 的战果是硬的——「improving the SOTA for 14 matrix multiplication algorithms」，而 §Evaluation 强调数学问题的 h 函数「typically very simple」：**验证器便宜，才是进化的前提**。`2602.20133` §1 指出这条线的软肋：「Canonical systems like OpenEvolve rely on static, pre-determined schedules. This creates a fragility problem」。最刺的是 `2501.04227` §1：自动评分「significantly overestimating quality (6.1/10 vs. 3.8/10 overall)」；`2310.01798` §1 把自我修正定义为「based solely on its inherent capabilities, without the crutch of external feedback」，结论是当前模型做不到；`2310.01783` §Discussion 再补一刀：那套反馈实验只基于一个 prompt 下的 GPT-4。

## 二、我认为什么变了

1. **引用召回率是现在就能封进 seal 的一个数，而且它比精确率更能伤我们。** `2304.09848` §1 的 51.5% 说明：系统可以"引用的都对"而"多数句子没有引用"。我们的 `ledger.js::sealReport` 逐条验 quote、把 verdict 打进报告表格，等于只测了 precision；`renderReport` 允许段落没有 claimId 而不报错，召回在我们的报告里因此是未知量。改法不是请一个评委，而是在 seal 时数"有 claim 的段落 / 总段落"。这条可以是错的：如果我们所有段落本来就都挂了 claim，这个数恒等于 1，那它就只是仪表盘噪声。

2. **难度必须被构造并验证，否则 score 的上限是假的。** `2504.12516` §1 Introduction 要求出题人保证「not solvable by another person within ten minutes」，§2 Data collection and verification 还要求做「five simple Google searches」确认答案不在首页；§4.5 Distribution of pass rates 更狠——对 Deep Research 始终答不对的题，把答案喂给模型让它找证据，「In most cases, the model succeeded」，于是这些题被判成"难"而非"不可解"。我们的 evalset 全是自出题、答案在出题人手里，`gate.js` 只比较候选与在任者，从不检查在任者本来就做得出。**一个在任者已经能过的任务对晋升的贡献是零，而我们把它记成了一轮证据。**

3. **可比性来自冻结检索面，不来自冻结模型。** `2508.06600` §1 Introduction 的原话是「Current evaluations of deep-research agents often conflate agent system performance with the effectiveness of their retrieval components」。我们的 loop 里"检索"是 agent 自己在 worktree 里 grep，语料随上一轮补丁而变——两轮之间既不是同一模型也不是同一语料，`promoted` 的归因在结构上不成立。**除非 round 记录里落下"这一轮读过哪些文件"，否则无法回答"这次晋升是模型变强还是这次搜到了"。** 反例风险：如果增益远大于语料漂移，冻结语料就是昂贵的洁癖。

4. **带引文的权威感是负资产，而我们正在放大它。** `2112.09332` §6.2 Perceived truthfulness of WebGPT 写道：「its answers also appear more authoritative, partly because of the use of citations」——同段承认 WebGPT 说谎比 GPT-3 少，但因为像真的，危害未必更小；§6.3 Reinforcement of bias 列了它如何继承并放大基座偏差。我们给报告加 sha256 封印、给每条 claim 打 verified 标记，提升的是"可信外观"而不是"可信"。**seal 的封面必须写证据深度分布（多少条只读了摘要或单段），而不是只写"全部通过"。**

5. **检索失败的主要形态是 query 不够推理密集，不是"读得不够多"。** `2407.12883` 的 24.3 nDCG@10 与同模型 59.0 的 MTEB 分数说明差距不在容量；`2310.06770` §4.1 Retrieval-Based Approach 的 40% 说明大仓库里词法检索经常已覆盖 oracle 文件，缺的是选对文件。我们的 `readAttemptsFor(fetchTop) = max(3n, n+4)` 是在同一 query 家族里重试——**重试修不了推理缺口，只修得了网络失败**。可证伪处：若失败抓取里绝大多数是 404/timeout，重试预算就是对的，这条判断错。

6. **自评在闭环里是噪声源，不是信号。** `2310.01798` §1 Introduction 定义了 intrinsic self-correction 并证明它不提升推理，§6 Conclusion and Discussion 的出路是「when valid external feedback is available, it is beneficial to leverage it properly」；`2501.04227` §1 Introduction 给了偏差量级：自动评 6.1/10，人评 3.8/10。我们代码那半边有外部 verifier，调研这半边没有——`verifyClaim` 的 verified 只等于"字面命中已存字节"，不等于"结论成立"。**把 verified 当质量分，是这类错误里最贵的一种。**

7. **静态 schedule 是我们欠的债，不是省下来的复杂度。** `2602.20133` §1 Introduction：「Canonical systems like OpenEvolve rely on static, pre-determined schedules. This creates a fragility problem」，它的替代是"用户只给 LLM 名字与迭代次数"。我们的 `src/loop/policy.js` 把 `minGain`、`candidates`、`holdoutSlack` 做成全局常量，而现存战役的分数从 0.5 到 0.895 跨得很开——**同一个 minGain 在低分战役里拒掉真增益、在高分战役里放进噪声**。可错之处：若分数分布其实双峰且稳定，自适应带来的方差可能大于收益。

8. **"更深地读"不是免费的，对抽取型任务它可能是负的。** `2505.09388` §Appendix A Appendix 说 thinking mode 在检索任务上「slightly degrades」，理由是这些任务「do not rely on reasoning」；`2501.05366` §1 Introduction 从另一侧佐证：standard RAG 相对 direct reasoning「do not effectively address the knowledge gaps」。我们的 `deepread.js` 与 survey 流程默认"读正文一定好过读摘要"，`note.js` 甚至用 `depth-exceeds-reading` 强制这一点。**更稳的做法是让 depth 成为可测的选择（同一 claim 在 abstract 与 full 下各判一次），而不是默认值。**

## 三、这批论文之间互相矛盾的地方

1. **RAG 是增益还是负增益，两篇给出相反读数。** `2503.09516` §1 Introduction：「two LLMs achieving respective average relative improvements of 41% and 20% over RAG baselines」；`2501.05366` §1 Introduction：「traditional problem-oriented RAG techniques do not effectively address the knowledge gaps compared to direct reasoning」。前者拿可训练 agent 比 one-shot RAG，后者拿 one-shot RAG 比纯推理。**争的不是检索的价值，是 baseline 选谁**——但两篇都用 "RAG" 这个词，只读摘要的人会得出相反结论。

2. **BrowseComp 与 BrowseComp-Plus 对"不可复现的基准有没有用"正面冲突。** `2504.12516` §1 Introduction 以难度构造立身（十分钟、五次搜索、现有模型解不出），把黑箱检索当背景条件接受；`2508.06600` §1 Introduction 说现有评测「conflate agent system performance with the effectiveness of their retrieval components」，且黑箱 API「highly dynamic in content」，直接判它不可复现。**同一批题，一篇当资产，一篇当缺陷。**

3. **"对人类难"能不能代理"对模型难"，两篇基准取向相反。** `2311.12983` §1 Introduction 明确反对：任务「that are difficult for humans are not necessarily」难对模型，它要的是对人类不难、对 AI 难；`2504.12516` §1 Introduction 的构造恰恰是"人类十分钟解不出"。两篇都是主流基准，取舍相反，且都自洽。

4. **我上一轮的结论与这批里那篇自己的数据冲突。** 上一轮 deep reading 我写"检索质量与 agent 质量必须分开评估"，依据是 `2508.06600` §1 Introduction；但同一篇 §4.7 Effect of Retrieval Quality 说「the higher precision of early search results, which reduces the need for follow-up queries」——更强的 retriever 会改变 agent 的查询次数。**两者在测量上不可分离，分开评等于把交互项抹掉。** 上一轮那条应改成"冻结语料 + 记录查询轨迹"，而不是"分离两个分数"。

## 四、三条我会改的

1. **`src/research/ledger.js`：把 citation recall 做成封印的一部分。** 在 `sealReport` 里数"有 claimId 的段落 / 总段落"，写进 manifest 并输出在报告首行；`verifyClaim` 的四态（unbound / unverified / contradicted / verified）不动，只加一个段落级 `uncited` 计数。依据是 `2304.09848` §1 的 51.5% 与 `2508.04183` §1 的 claim 分解。风险：段落级只是句级的粗近似，不能当精确率用。

2. **`src/research/fetch.js`：把 `buildFollowupQueries` 的"再来两轮"换成可测的停止。** 现在开头是 `if (rounds !== 2) return []`，随后 `maxAdd` 又被 `Math.min(2, …)` 钉死——纯硬编码。改成"新词边际覆盖低于阈值即停"，并把每轮 marginal recall 写进返回的 gaps，让"搜索该停在哪"成为报告里的数而不是常量。依据：`2407.12883` 只给单点 24.3，`2310.06770` §4.1 的 40% 说明召回是任务形状的函数。可证伪点：若曲线在第 2 轮仍陡，现有硬编码偶然是对的。

3. **`src/research/deepread.js` 与 `scripts/research-deepread.mjs`：给 digest 加逐篇深度标记。** 本批 42 篇里有 4 篇只有 1-2 段（`1904.09675` 唯一一段是致谢，`2307.13702` 只有 ARC 的数据集描述），但 digest 的表面结构与读满正文的那些没有区别。改为在 note 上打 `shallow`，让 `gradeNote` 对 shallow 来源的 mechanism / evaluation claim 一律降级——这与 `note.js` 现有的 `depth-exceeds-reading` 是同一条规则，只是从"单条 claim 的深度"扩到"整篇的深度"。依据：`2501.04227` §1 的 6.1 vs 3.8。

## 五、这份阅读没回答的三件事

1. **覆盖该在哪一轮停，没有判据。** `2407.12883` 只给单点 nDCG，`2503.09516` / `2504.03160` 只说"更多搜索更好"，没有一篇给出边际召回曲线。我们的 follow-up 现在是 2 轮硬编码，改成阈值之后阈值取多少仍然没有文献依据。

2. **中文与混合语料上"每句话是否被支持"能不能机械判定。** `2304.09848` 是人判的；我们靠字面命中，中文长句的同义改写会让召回系统性偏低，而这个偏低与"确实没引用"在数字上分不开。

3. **人评与自动评的混合比例。** `2501.04227` §1 只证明自动评高估（6.1 vs 3.8），`2310.01783` §Retrospective Evaluation 用 8,745 条人类评审意见做对照，但也没给抽样比例。我们要么全自动（已知高估），要么全人工（不可持续），中间那一档没有依据。

本批没有 [UNREAD] 标记，所以没有论文被标为未读；但深度不足与未读在效果上等价：`2106.09685`（1 段，且是 §6 Related Works 的 Transformer 综述）、`1904.09675`（1 段，致谢）、`2307.13702`（1 段，§2 Measuring Chain of Thought Faithfulness 里的数据集描述）、`2406.12045`（2 段）这四篇在本批里只是"存在证明"，没有构成论证，上面三条改动没有一条敢依赖它们。
