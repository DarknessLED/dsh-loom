## 读完这八篇正文之后，我认为什么变了

**1. 注入的边界不在提示词里，在数据流与能力的分离上。**
2503.18813（CaMeL）§2：*By enforcing capability-based security policies, CaMeL effectively prevents unintended data flows and actions*；§Is Dual LLM of Willison enough? 专门论证了"双模型"不够——被污染的笔记里的指令仍然能让 Privileged LLM 干坏事，所以必须给数据打上能力标签并在解释器里强制。我们 `knowledge.json` 里的 lesson 直接进 prompt，**没有任何能力/来源标签**：一条从网页抓来的句子和一条 loop 自己归纳的句子，在 prompt 里长得一样。

**2. 提示注入的根本原因是"模型分不清代码与数据"，这是结构性而非可修补的。**
2403.14720（Spotlighting）§I 与 §III-A 反复写：*the LLM is not able to distinguish code from data … This is a structural limitation of LLMs since they operate on boundary-less streams of tokens*。他们的对策是把不可信数据**显式标记**（spotlighting/datamarking/编码），§IV-B 用 1000 篇合成文档量 ASR 下降。我们的检索结果、网页正文、外部 issue 全部原样进上下文。

**3. 间接注入的威胁模型是"远程、持久、无需受害者配合"，跟我们想的不一样。**
2302.12173 §1：*adversaries can now remotely affect other users' systems by strategically injecting the prompts*，影响包括 *remote control of the model, persistent compromise, theft of data, and denial of service*。我们的 loop 会读外部网页（`rsi_research`）并把结论写进知识库 → **远程内容有机会写进持久记忆**，这正是它描述的 persistent compromise 路径。

**4. 结构化的接口比"更好的提示"更有效，而且它限制适用面。**
2402.06363（StruQ）§1 提出把 prompt 与 data 分成两个通道；§6 Limitations 明说 *StruQ only protects programmatic applications that use an API or library to invoke LLMs*，不适用于网页聊天。我们是 API 调用方，**正好落在它保护得到的范围内**，但没有用结构化通道。

**5. 攻击成功率是被系统地量过的，不是个别案例。**
2403.02691（InjecAgent）§1/§3.1：17 条用户指令 × 62 条攻击指令，30 个 agent，主指标 ASR。2410.02644（ASB）§1 把攻击面拆到 agent 的每一步——system prompt、user prompt、tool usage、**memory retrieval**——并覆盖 DPI/IPI/memory poisoning/backdoor。我们的知识库写入路径**没有任何一处被当作攻击面审计过**。

**6. "工具"本身是攻击面，Toolformer 的自主性放大了它。**
2302.04761 §1：*The LM should not lose any of its generality and should be able to decide for itself when and how to use which tool*。我们 `rsi_research` 的工具就是"任意 URL 抓取 + 写账本"，按 ASB 的分类这是 tool usage + memory retrieval 两个面同时暴露。

**7. ReAct 把 thought 与 action 分开，正好给出了"哪一半可以信"的线索。**
2210.03629 §2：thought ∈ L *does not affect the external environment*，action 才影响。把外部数据当 thought 处理（即当上下文而非指令）在原理上是对的，但 LLM 不区分——所以需要外部机制，而不是靠 prompt 声明。

## 三条我会改的

1. **给进 prompt 的每条 lesson 打来源标签。** 按 CaMeL/StruQ，标签要能被下游强制（谁写的、何时抓的、可信级别），而不只是文字说明；至少先做到"外来文本一律标为不可信数据"。
2. **把知识库写入当成攻击面审计。** 对应 ASB 的 memory retrieval 面：外部内容进 `knowledge.json` 时走一次检查（能否诱导后续提案），并把结果记进账本。
3. **让研究抓取走结构化通道。** 抓来的正文放在独立的 data 通道里（不拼进指令段），这是 StruQ 在 API 场景下最便宜的落地。

## 这份调研没回答的三件事

1. **防御的代价由谁承担。** spotlighting/CaMeL 都量了 ASR 下降，但没有一篇量"防御之后任务成功率降多少"——我们的 loop 本来就常失败，加一层防御可能直接把产出打到零。
2. **持久记忆被污染的检测。** 五篇都讲"当次注入"，没有一篇给"三个月前写进记忆的毒句子"的发现方法。
3. **自演化系统里的注入。** 我们的威胁模型是"loop 自己改自己"，语料里的威胁模型全是"外部攻击者攻击用户"，两者交集（模型把自己的错误当经验写进记忆）没有对照。
