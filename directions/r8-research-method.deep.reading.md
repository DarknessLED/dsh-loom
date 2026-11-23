## 读完这八篇正文之后，我认为什么变了

**1. 「可核查」被拆成了两个数：引用召回与引用精确率。这是我可以直接照抄的东西。**
2304.09848 §1 定义 citation recall / precision 并给硬数字：*merely 51.5% of generated sentences are fully supported with citations*，精确率更低。我们的 `rsi_research` 有逐字 quote 校验（比它更严，因为要求字节级命中），但**没有"每句话是否都有依据"这个维度**：report 的段落可以没有 claimId 而不报错。它们量的是覆盖，我们量的是正确。

**2. 基准的"不可解性"是被主动构造并验证的。**
2504.12516 §1/§2：人类出题者要保证**其他人在十分钟内解不出**、GPT-4o/o1/早期 deep research 都解不出，还要做五次 Google 搜索确认答案不在首页。我们 evalset 的任务几乎都是"我自己写的、我知道答案"，难度与它不可同日而语。

**3. 检索质量与 agent 质量必须分开评估，否则结论不可复现。**
2508.06600 §1：*Current evaluations of deep-research agents often conflate agent system performance with the effectiveness of their retrieval components*，做法是提供固定语料 + 固定检索器。我们的 loop 反过来——同一份仓库、同一套 guard，但**没有固定检索器这个维度**（我们的"检索"是 agent 自己 grep），所以无法判断一次晋升是"模型变强"还是"这次搜到了"。

**4. 把搜索建模成环境的一部分，是 RL 有效的前提。**
2503.09516 §1：*We model the search engine as part of the environment, enabling sampled trajectory*；同篇给数字：相对 RAG 基线平均提升 41% 与 20%。我们的 loop 的"环境"是 workspace + guard，"搜索"是 agent 的一次 bash 调用——**没有被建模成一个可学习的环境成分**。

**5. 在真实网上训练与在本地语料上训练，差的是泛化。**
2504.03160 §Importance of Real-World Environment：*we train agents to interact directly with live search engines, thereby learning to handle the inherent variability and complexity of the open web*；Bamboogle 上"需要维基百科之外的知识"时差距最大。我们的 loop 只在本地仓库里跑，泛化问题在结构上不存在，但**代价是任何关于泛化的结论都不能从我们的战役里得出**。

**6. 带引用的回答更"像真的"，因而更危险。这是被量过的。**
2112.09332 §6.2：*WebGPT makes false statements less frequently than GPT-3, its answers also appear more authoritative, partly because of the use of citations*，§6.3 讲了它如何继承并放大基座模型的偏差。我们的 sealed report 有 sha256 封印、有逐字核验标记——**这会让它看起来比实际更可靠**，尤其当 445/491 条 claim 只读了摘要级页面时。

**7. 思维链对检索任务可能是负担。**
2505.09388 §Appendix A：*In thinking mode, the model's performance slightly degrades. We hypothesize that the thinking content does not provide significant benefits for these retrieval tasks*。这直接反驳"更深思考总是更好"的默认假设，对我们的 R8 工具有直接含义。

**8. ReAct 的局限被原文承认了。**
2201.11903 §6：*although chain of thought emulates the thought processes of human reasoners, this does not answer whether the neural network is actually reasoning*。这条对"把 CoT 当监控通道"（R1 的 2503.11926）是一个反向约束。

## 三条我会改的

1. **给 report 加 citation recall。** 不只是"引用的都对"，还要"每句话都被引用支持"；`rsi_research seal` 现在允许无 claimId 的段落，等于精确率满分、召回率未知。
2. **给 evalset 加"不可解性"验证。** 出题时用当前最强的配置跑一遍，能解出来的题不算难题；我们现在所有任务都是自出题，难度从未标定。
3. **在 report 首页写清"这份报告的证据深度分布"。** 对应 WebGPT §6.2 的警示：带封印的报告更危险，必须把"多少条只读过摘要"写在最前面，而不是附录。

## 这份调研没回答的三件事

1. **中文语料下的可核查性。** 八篇全是英文语料与英文 benchmark；我们的调研对象大半是中文/英文混合，citation recall 的判定规则是否通用，没有对照。
2. **固定检索器在"仓库即环境"里对应什么。** BrowseComp-Plus 的做法需要预先给定语料，我们的 agent 面对的是可变的仓库状态，没有"冻结语料"的版本。
3. **检索的边际收益何时归零。** Search-R1 与 DeepResearcher 都只报"更多搜索更好"，没有一篇给"搜到第几次开始不再有用"的判据——这正是我们那条 `--gaps` 回填该停在哪一维的问题。
