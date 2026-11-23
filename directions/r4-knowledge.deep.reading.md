## 读完这八篇正文之后，我认为什么变了

**1. 记忆系统的核心不是"存什么"，是"谁来编辑"。**
2310.08560（MemGPT）§2.3 那句话是全部要害：*Memory edits and retrieval are entirely self-directed: MemGPT autonomously updates and searches through its own memory*；§1 把它类比成虚拟内存分页。我们的 `knowledge.json` 63 条 lesson 是**由 loop 自己写的**，但**没有任何一条路径让 loop 自己删/改**——我们只有 `quarantineHarm`（有害才隔离）。MemGPT 的对照点不是"它记得多"，而是"它有权忘"。

**2. 结构性 agency 比检索期 agency 更根本。**
2502.12110（A-MEM）§2.2：*our agentic memory system exhibits agency at a more fundamental level through the autonomous evolution of its memory structure*，方法是 Zettelkasten 式的手工链接（§3.2 每个 note 生成链接集合 L_i）。我们的 lesson 是**平铺的 JSON 数组**，没有链接、没有簇、没有"这条与那条冲突"的结构位。所以"27 条没 notWhen"这种缺口在我们这里是隐形的：没人能看见它和谁相邻。

**3. 反思的价值被消融实验单独量过，且量到了具体形态。**
2303.11366（Reflexion）§Analysis 用它自己的消融：CoT(GT) 基线 → 加 episodic memory（EPM）→ 加 self-reflection，逐级分离。这是"文本反馈比标量反馈有用"的第一份定量证据。我们的 loop 拿到的是 guard 退出码（标量），`src/chain/predict.js` 的 rationale 是模板生成的，不是对失败的自由文本反思——我们停在 Reflexion 消融的第一级。

**4. 技能库的可复用性依赖"可执行"这个载体。**
2305.16291（Voyager）§2.2：每个 skill 是**可执行代码**，理由是"generality, interpretability, universality of programs"。我们的 lesson 是自然语言句子，`notWhen` 是自然语言的边界。差别在于：代码能被测试，句子不能。Voyager §1 还给了自动课程（curriculum）这一半——任务难度自适应——我们完全没有。

**5. 生产级记忆的指标是"跨会话一致性"，不是"单轮准确"。**
2504.19413（Mem0）§1 把问题定义成 *their inability to maintain coherent reasoning across extended conversations across different sessions*，§2.1/§2.2 是 extract → consolidate → retrieve 与图变体的双轨。我们的评估单位是"一轮一个任务"，跨轮一致性从未被测过——R2 那篇说单次观测有噪声，这里说单次会话有遗忘，两件事叠在一起。

**6. 有人已经把"遗忘"写成了公式。**
2305.10250（MemoryBank）§2.3 与 §6：记忆更新机制**借鉴 Ebbinghaus 遗忘曲线**，§Evaluation Metrics 把"记忆检索准确率"与"回答正确率"分成两个标签。我们的 `ttlRounds: 12` 是硬过期，不是强度衰减。

**7. ReAct 的观察是"环境返回的东西"，不是"模型自己写的总结"。**
2210.03629 §2 把 observation o_t 定义成来自环境 O 的元素，且明确 thought a_t ∈ L *does not affect the external environment*。我们 loop 里的"经验"大量来自模型自己写的总结（lesson 文本），按 ReAct 的划分那不是 observation，是 thought——把它当 observation 存进知识库，等于让模型用自己的话给自己作证。

**8. 生成式 agent 的检索是三元加权，不是相似度。**
2304.03442 §Approach 给出 score = α_recency·recency + α_importance·importance + α_relevance·relevance，三项 min-max 归一后加权。我们取 lesson 只看"命中关键词"，连 recency 都没有。

## 三条我会改的

1. **给 lesson 加"链接"这一维。** 每条 lesson 记录它反驳/依赖哪些 lesson id（我们现在只有 `notWhen` 这个半结构），让"冲突"变成可见的数据结构而不是靠检索时比对。
2. **给 lesson 加衰减与退休。** 借用 Ebbinghaus 曲线做权重（不是硬 TTL），并且引入"贡献归零 → 退休"的路径（这一条与 R7 的 SLIM 结论一致）。
3. **把"模型自己写的总结"与"环境返回的观察"分开存。** 前者是 thought，后者才是 observation；现在它们混在同一个 `knowledge.json` 里，等于把自证词当证据。

## 这份调研没回答的三件事

1. **谁有权删。** 八篇里有四篇让模型自主编辑记忆（MemGPT/A-MEM/Mem0/Reflexion），但没有一篇讨论"模型删错了怎么办"——我们的 `quarantineHarm` 是防御性设计，文献里没有对应物。
2. **跨会话一致性的度量。** Mem0 提出了问题但用的是 QA 准确率；没有一篇给出"同一事实在两次会话里说法不同"的检测方法。
3. **可执行 skill 的自然语言边界。** Voyager 的 skill 是代码所以能测；我们不可能把每条 lesson 都变成可执行断言，那条分界线在哪，没有文献给。
