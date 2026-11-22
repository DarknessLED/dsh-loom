## 读完这一批之后我认为什么变了

**一、自我改进的学科基础不是 LLM，是质量-多样性（QD）进化。** 基石前十：MAP-Elites（14 篇引）、Quality Diversity: A New Frontier（9）、FunSearch（8）、AlphaEvolve（7）、Abandoning Objectives / novelty search（7）、Robots That Can Adapt Like Animals（6）。**"多样性不是噪声，是搜索资源"** 是这一线的核心主张——而我们整个插件里没有任何"多样性"概念：候选是同一个 prompt 的不同采样，archive 里也只有链版本，没有行为描述符。

**二、evaluator overfitting（25 篇）与 diversity & collapse（20 篇）是两个独立的失效面，而我们把它们混在一个 "plateau" 触发器里。** 语料里 evaluator overfitting 讲的是"在训练用的判据上变好、在没见过的上变差"（我们 R7 上一轮读到的"gains largely vanish"），diversity collapse 讲的是"种群塌到同一个点，于是后续搜索再无新意"。前者需要 held-out，后者需要 archive 结构。我们的 plateau 只看"最近 N 轮没晋升"——这两种病都会被它误报成同一种。

**三、complexity control 只有 3 篇，且最早 2026-10。** 这与 RRSI 那条结论（复杂度累积）互证：**"让系统别越改越复杂"是新问题，还没有共识**。我们账本里有 `lineEndingChurn` 这种机械检查，但没有"这个 chain 变体让 spec 复杂度上升了多少"的度量。

## 三条我会改的

1. **给 archive 加行为描述符**：MAP-Elites 的核心是"按行为维度分格，每格留最好的"。我们的 chain 版本可以按 `(candidates 数, 是否有 plan 腿, halving 开关)` 分格——这三者就是行为维度。这能直接解决"plateau 提案总是 minimal-change"的问题（现在 `proposeMutations` 的 fresh 项里 minimal-change 恒定排第一）。
2. **把 plateau 触发器拆成两个**：`no-promotion`（可能是 evaluator overfitting，该换 held-out）与 `population-collapse`（所有候选分数趋同，该加多样性）。两者证据不同，不该共用一个卡。
3. **给 chain 变体加复杂度度量**：spec 的节点数、prompt 总长度、可选腿数量——三个数就能支撑"这个变体让系统更复杂了"的判断，而这是文献里唯一确定的坏味道。

## 这份调研没回答的三件事

- **QD 在大模型 agent 上是否划算**：MAP-Elites 的评测成本假设是"每次评一个点很便宜"；我们每次评一个点要几美分到几毛钱，网格化可能直接烧光预算。
- **行为描述符怎么选**：语料里 QD 的描述符是人工设计的（机器人形态、策略行为）；agent 链的描述符没有公认选择。
- **collapse 的早期信号**：20 篇 diversity & collapse 都在讲"已经塌了"的检测，没有一篇讲预警。
