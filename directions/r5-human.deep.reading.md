## 读完这八篇正文之后，我认为什么变了

**1. 「人在环上」被写成了"监督者本身也要能被监督"，这是我没读到的角度。**
2212.08073（Constitutional AI）§1：*We need to develop methods now that can provide oversight for these powerful AI systems, and scaling supervision may be one possibility, if the capability level of the supervisor can scale*。它的做法是**用 AI 给 AI 反馈，去掉人类的伤害标签**（§1：*without any human feedback labels for harms*）。我们的 checkpoint 是纯人审，没有任何"用另一个模型先预审一遍再把人的注意力导向分歧点"的机制。

**2. sandwiching 是唯一被设计出来的实验范式，我们不能凭空谈"人类能看懂"。**
2211.03540 §1：方法**紧贴 Cotra 的 sandwiching 提案**——让非专家借助一个不可信但强的 AI 去判断专家级问题，§The Paradigm 明说非专家的处境**类比未来的我们**。我们的 checkpoint 卡目前只给人结论（预测增益、风险），**没有给"反驳它的最强论据"**——按 sandwiching，人需要的是争辩双方，不是一个摘要。

**3. debate 的可扩展性依赖"更有说服力的模型更诚实"，这是被量过的。**
2402.06782 §6：*debate becomes more truth-seeking with increased model persuasiveness … models becoming relatively better at arguing for the correct answer compared to the incorrect answer*；§1 定义了 persuasiveness = judge approval，**不需要 ground truth**。我们的 `rsi_decide` 恰好是一个 judge，但没有"正反两方"，只有一张卡。

**4. 对齐任务的难度层级里，"人类判断不了"是被明确列出的情形。**
1805.00899 §1：*A human may be unable to judge whether an explained answer or exhibited behavior is correct: the behavior may be too hard to understand without help*，并把 debate 放在这个层级的上限。我们的 L2 采纳决策正是这种情形——人看不懂链 spec 的后果，只能看预测。

**5. 先有"人给稀疏偏好"，才谈得上"人给密集审计"。**
1706.03741 §1：让人比较两段短视频而不是打绝对分，*We found comparisons to be easier for humans to express*，并且 **15 分钟到 5 小时的非专家反馈就够**。我们的 checkpoint 要人读一整张卡做绝对判断（采纳/拒绝），按这篇，**成对比较比绝对判断更省人力**——而且我们天然有配对（v2 vs v3）。

**6. 安全的探索可以被"可信策略"兜底，不必靠人盯。**
1606.06565 §6：*If we have a trusted policy and a model of the environment, we can limit exploration to actions the trusted policy believes we can recover from*；同段又说人类监督会撞上 scalable oversight（动作太多太快）。我们的 guard 就是那个可信策略，但它是**事后**跑的，不是"只允许可恢复动作"的前置限制。

**7. 好的可读性本身就是对齐收益。**
1606.06565 §5：*use of semi-supervised RL with a reliable but sparse true approval metric may incentivize communication and transparency by the agent* —— 因为 agent 要靠便宜的代理信号猜真信号，透明对它有利。这给"让 checkpoint 卡写清证据"一个机制性理由，不只是"对人友好"。

**8. 人工标注的成本结构被写成了数字。**
2203.02155 §1：40 名承包商做标注。我们的 checkpoint 是"一个人（我）读卡"，没有成本计量，也没有"这张卡值不值得人看一眼"的判据。

## 三条我会改的

1. **checkpoint 卡加"反方"一栏。** 按 sandwiching/debate，人需要的是最强反驳论据，不是一个被推荐的选项；我们现在只有 `rationale` 单向论证。
2. **把绝对判断改成成对比较。** 有多个候选时让人在两个之间选（"哪个更可能兑现"），而不是逐个采纳/拒绝——1706.03741 说比较更省人力，而且我们的数据天然成对。
3. **把 guard 从事后检查改成"可信策略前置"。** 对应 1606.06565 §6：只允许 trusted policy 认为可恢复的动作，而不是跑完再回滚。

## 这份调研没回答的三件事

1. **人读卡的时间该记在哪。** 八篇里只有 2203.02155 给了标注成本（40 人），没有一篇把"监督者的时间"当成预算项；我们的 `budgetUsd` 不含人的时间。
2. **橡皮图章怎么测。** 综述与 R5 语料都提到 automation bias，但没有一篇给出"这次采纳是不是随便点的"的检测方法。
3. **AI 预审 + 人终审的分工边界。** Constitutional AI 是纯 AI 反馈，sandwiching 是纯人判断，两者中间的"AI 先筛、人只看分歧"没有对照实验。
