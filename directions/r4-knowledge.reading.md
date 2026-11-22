## 读完这一批之后我认为什么变了

**一、记忆方向的基石几乎全是"上下文管理"，而不是"学习"。** MemGPT（19 篇引）、A-MEM（17）、Mem0（15）、MemoryBank（13）、Generative Agents（13）——它们解决的是"上下文装不下时怎么办"，机制是分页、摘要、检索。反思（Reflexion，16）、技能库（Voyager，16）才是"把经验变成能力"的那一类。我们插件里 `src/knowledge/store.js` 存的是 lesson（claim + notWhen），属于后者；`src/knowledge/dream.js` 的合并与退休属于前者。**这两件事在大方向上不是一回事，但我们都叫它"知识"**，这是概念混乱的来源。

**二、"检索到的记忆会挤掉当前任务的检查"这条（R4 上一轮读到的 2606.17645）在这里找到了同伴。** gap 表里 Expel（10 篇引，"LLM agents are experiential learners"）与 Agent Workflow Memory（10）都在讲同一件事：**经验复用是有代价的，代价是注意力和当前任务的判断**。我们的 dream 合并只按内容相似度并，从不问"这条经验在什么情况下不该被拿出来"——而这正是 `notWhen` 字段存在的理由。**我查了：47 条 lesson 里只有 24 条带 `notWhen`，23 条没有**，而且一条 `procedure` 和 46 条 `fact` 之间只有前者被 `src/research/sink.js:129` 强制要求边界（`'a fact lesson needs a notWhen boundary; without one it is an over-general rule'`）。也就是说 research 进来的 fact 有边界，loop 自己归纳出来的 fact 没有。

**三、forgetting / stability 只有 13 篇，其中 9 篇是"克服灾难性遗忘"（2017 EWC 那一线）。** 也就是说，文献里"如何不忘记"是成熟问题，"如何主动忘掉错误的经验"几乎没人做。我们的 `retire` 只在 ttl 或 harm 计数触发时执行——这不是"主动忘掉"，是"过期清理"。

**四、跨领域类比（transfer & analogy，14 篇）的开篇是 2025-09 的 "Bottom-up Domain-specific Superintelligence: A Reliable Knowledge Graph is What We Need"**，比整个记忆方向晚了两年。我们上一轮做的 `cross.js`（类比是假设，不是指令）恰好落在这个新细分里，而且比它更保守——这是个可以继续做的方向。

## 三条我会改的

1. **把"上下文"与"知识"在代码里分开命名**：`store.js` 存的是 claim（可迁移断言），检索压缩是另一层。现在 `knowledge` 这个词同时指两者，导致 dream 的合并规则（内容相似度）被用在 claim 上——相似的两条 claim 可能一个真一个假，合并会丢掉"在什么条件下不成立"。
2. **`notWhen` 必须成为硬字段**：没有 `notWhen` 的 claim 不允许进 store，或者只能以 `hypothesis` 身份进。这与 `src/research/note.js` 已有的纪律一致（`claim.type` 必须是六类之一），只是还没落到 knowledge 上。
3. **把"主动退休"做成一个可测的动作**：现在只有 ttl。文献里对应的是"经验性遗忘"——一条 lesson 在被反复证否后应当降权而不是等过期。账本里有 `pairedImpacts`，可以统计每条 lesson 出现后相关任务的通过率变化，据此降权。

## 这份调研没回答的三件事

- **记忆的价值如何计量**：没有一篇给出"多存一条记忆值多少钱"的公式；我们的 lesson 影响评估（`pairedImpacts`）是自己发明的，没有外部对照。
- **跨领域迁移的成功率**：transfer & analogy 14 篇里没有一篇报"跨领域借来的假设有多少被证实"。
- **检索的噪声**：我们每次注入最多 3 条 lesson（`knowledge.maxShown`），但没有任何证据说明 3 是好的数字；语料里检索类论文都在报 recall，不报"注入后的行为变化"。
