## 读完这八篇正文之后，我认为什么变了

**1. MAP-Elites 的 archive 不是"保存历史"，是"按行为描述符分格保存最优"。**
1504.04909 §3：*the archive, which is the set of descriptors in all the cells … in MAP-Elites each member of the population is by definition diverse, at least according to the dimensions of the feature space*。§4 还点出它与 Novelty Search 的差别：NS 需要同时维护 population 与 archive，参数多且容易调坏，而且会"cycling"（去了又回、没有记忆）。我们的链版本只有一条时间线（v1→v2→…），**没有描述符分格**，所以"多样性崩溃"在我们这里无法被观测。

**2. 我们的 archive 缺的不是容量，是"格"这个维度。**
同上 §4 引 Lehman & Stanley 的比喻：让蝴蝶和细菌跟熊和獾比同一个性能指标是没意义的。我们的 `heldOut`/`minGain` 就是那个"单一性能指标"——所有变体在同一把尺子上竞争，于是变体越像 incumbent 越容易被保留。

**3. AlphaEvolve 的进化数据库存在的理由是"让旧想法重新浮上来"。**
2506.13131 §2.5：*These solutions are stored in an evolutionary database, the primary goal of which is to optimally resurface previously explored ideas in future generations*；§Models used 用 Gemini Flash+Pro 双模型做吞吐/质量权衡；§2 提到单次评估可花 ~100 计算小时但必须并行。我们 `reduce.js` 里的 `chain.versions` 只是历史记录，**没有任何"重新浮上来"的机制**——旧版本不会再被采样。

**4. 进化搜索的抽象层次是可选的，这决定了"改什么"的自由度。**
同上 §Flexibility in choosing the abstraction：可以进化原始字符串、可以进化定形函数、也可以进化更高层的结构。我们的 `mutateChain` 只在一个固定的参数空间里动（candidates/minGain/halving…），**抽象层次被钉死**，所以永远发现不了"参数空间本身不对"。

**5. 自我修改的理论版本要求"可证明有益"，实践版本只能靠评估。**
2505.22954（DGM）§1：Schmidhuber 的 Gödel Machine 依赖形式证明，*it is impossible to formally prove* 之后 DGM 改成"写代码 + 用 benchmark 评估 + archive 保留可行者"；§3 明确这是 relax。§4.3 的消融把"自我改进"与"开放式探索"分开量：DGM w/o self-improve（= ADAS）、DGM w/o open-ended exploration。我们的 loop 只有"改进"，没有"开放式探索"这一臂。

**6. 开放式探索的必要条件被定义过：持续产出既新颖又可学的人工物。**
2408.08435（ADAS）§1/§3 的 Meta Agent Search：meta agent 不断写新 agent 进 archive，§6 自己承认搜索算法很简单（*focusing solely on exploring interesting new designs*），并把 QD 列为未来方向。我们连"新颖性"这个量都没有。

**7. 多样性崩溃是一个已被命名、被测量的失败模式。**
2510.22954 §3/§5：intra/inter-model homogeneity 与 *diversity collapse*，并把它归到 pluralistic alignment 的挑战。我们的 loop 每轮用同一个模型、同一套 prompt 生成候选，**结构上就在这个失败模式里**，而我们的指标只有一个分数，看不见它。

**8. 用 MAP-Elites 生成对抗样本是被验证过的用法。**
2402.16822 §3：archive 的每一维对应一个预定义特征，每个格是特征的组合；§4 用两条独立的 ASR 度量。这说明"分格"不是理论装饰，是可操作的工程。

## 三条我会改的

1. **给链版本加描述符。** 至少两个维度（例如"改动面：参数 vs 结构"与"代价：轮成本区间"），把 `chain.versions` 从列表改成按格取最优的 archive；这是让"多样性崩溃"可被观测的最小改动。
2. **让旧版本能被重新采样。** 对应 AlphaEvolve 的 database：候选生成时按格采样父代，而不是永远从 activeVersion 出发。
3. **加一条"开放式探索"臂。** 对应 DGM §4.3 的消融：现在每一轮都在"改进"，从来没有一轮是"探索"；把两者分成两个可选动作，至少能量出哪一半在起作用。

## 这份调研没回答的三件事

1. **描述符该选什么。** 语料里全是"人工预定义特征"（风险类别、攻击风格），没有一篇给"如何为任意搜索空间选描述符"的方法；我们的"链"没有天然的特征空间。
2. **QD 与 LLM 成本的关系。** MAP-Elites 假设评估便宜（跑一次仿真），我们每次评估是真实计费；分格意味着更少的资源集中在最好的格上，代价没人算过。
3. **自我修改的安全下限。** DGM 用 archive + benchmark 兜底，但我们的 benchmark 是"自己的测试套件"，两者同源（R8 那条），DGM 的兜底在我们这里不成立。
