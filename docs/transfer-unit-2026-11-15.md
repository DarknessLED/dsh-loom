# 可迁移的知识单元：别人怎么定义，我们该怎么改

日期：2026-11-15 · 触发：`m02615`（"B。当不确定的时候可以先看看别人怎么做的，但是不要百分百肯定"）

## 0. 先认错

上一版把"总结 / 搜索 / 共享 / 触发灵感 / dream"当成架构直接实现了。它是五个**动作**，不是五个**概念**：
混了数据操作（合并）、展示策略（配额）、认知事件（灵感）和维护任务（退休）。结果就是 `cross.js`
没有任何生产调用者、`dream.js` 只在状态页算一遍——五个名词，没有一条通路。

这份文档不急着改代码，先回答一个更基本的问题：**一个"可迁移的知识单元"到底装什么？**

## 1. 五个一手来源怎么定义

| 系统 | 单元是什么 | 怎么被验证 | 怎么被检索 |
|---|---|---|---|
| Voyager（arXiv 2305.16291） | 可执行代码 + 描述，进入"ever-growing skill library" | 环境执行 + 自验证；技能可组合 | 描述的向量检索 |
| Trace2Skill（arXiv 2603.25158） | "skill directory"里的一份 SOP；把反复出现的失败与 workaround 压成标准流程 | held-out 测试集（200 演化 / 200 留出）+ 跨模型/跨分布迁移 | 技能目录本身，**不依赖 test-time retrieval** |
| Agent KB（arXiv 2507.06229） | 从轨迹聚合出的结构化经验库，按用途分两段 | 跨框架、跨基准（GAIA/HLE/GPQA/SWE-bench） | 两段式：planning 先给跨域 workflow，feedback 再给针对性诊断，外加 disagreement gate |
| STRATA（arXiv 2610.19386） | 三层类型化图：原子技能/代码片段 → 任务 workflow → 泛化 meta-framework；边有类型，含"方向相反"的 contrast edge | 四个交互基准、两种基座、七个基线 | 多维相似度（operation × target）；会 GC，保护割点 |
| "When Continual Learning Moves to Memory"（arXiv 2604.27003） | 参数是 (k, v)：**表示**（抽象程序 vs 细节轨迹）× **组织**（检索结构） | ALFWorld/BabyAI 的顺序任务 | 结论：抽象程序记忆比细节轨迹更可迁移；负迁移对难例伤害最大；组织越细不一定越好（前向迁移与遗忘此消彼长） |

另外三份只读了摘要、未读全文，但值得记下（来自 `C:/Projects/rs/out/knowledge-transfer-and-shared-skills.json` 的 arXiv 摘要）：

- **SkillFlow**：终身学习协议下，"技能使用率"与"技能有用性"脱钩——Kimi K2.5 使用率 66.87%，收益只有 +0.60 分。
- **HSE（Hierarchical Skill Evolution）**：任务级 → 仓库级 → 跨仓库三级聚合，10 条从 SWE-Gym 演化出的技能可跨基准迁移。
- **技能迁移的受控研究**：任务级技能平均**低于**无记忆基线，子任务级高于；文本技能比代码技能更可迁移；"特异性 × 抽象性"共同预测成功率，单看一个都不行。

## 2. 他们彼此并不一致

这是最该保留的疑问：

1. **代码 vs 文本**。Voyager 押注可执行代码（Minecraft 的技能就是一个能调用的函数）；受控研究说文本技能迁移更好。
   这不一定是矛盾：**有执行环境时，代码是可验证的资产；没有执行环境时，代码只是不可验证的字符串**。我们的循环大多数时候没有"可调用的技能接口"，只有 brief 里的文字，所以照抄 Voyager 是错的。
2. **存储 vs 不检索**。Trace2Skill 明确说技能可复用而**不需要 test-time retrieval**；Agent KB 和 STRATA 都把检索当核心。
   前者是"技能足够少、直接进上下文"的场景；后者是"库大到必须检索"。我们现在是前者（每个战役几十条经验），所以先做检索器是本末倒置。
3. **验证强度**。五篇里每一篇都在 held-out 任务上报迁移；我们没有任何一项"这条经验迁移后是否有效"的度量。
   **这是最大的差距，不是 schema。**
4. **负迁移**。STRATA 用 contrast edge 专门处理"看起来相似、方向相反"的经验；我们只有"家族/标签匹配"，没有任何"不适用条件"字段。

## 3. 我原来的模型错在哪

| 我写的 | 问题 | 文献里的对应 |
|---|---|---|
| 五种动作并列 | 动作不是概念；无法判断缺哪一层 | (k, v) 框架：表示与组织是两个轴 |
| `signature`（困难形状）作为跨域匹配键 | 有道理，但**单靠形状相似会放大负迁移**；没有"何时不适用" | STRATA contrast edges；受控研究的 specificity×abstractness |
| `direct / analogy` 二分 | 方向对（对应 Agent KB 的 disagreement gate），但**只做了分类，没做验证** | Agent KB 的 gate 是在推理时判断"是否帮助" |
| dream 的合并/矛盾 | 只是维护；"从原子抽象出流程"才是迁移的关键，我没做 | Trace2Skill 的 SOP 归纳；HSE 的分级聚合 |

## 4. 修正后的单元：两层，而不是一个 schema

**L1 原子（atom）**——一次尝试的事实，带证据：

```
atom = {
  claim,            // 一句话，可被证据检验
  scope,            // 仓库/任务族/文件/符号；越具体越可靠
  polarity,         // helped | harmed | no-work
  evidence,         // 配对结果、次数、代价；没有对照就不是证据
  shape,            // 困难形状（manifestation），只用于放宽检索，不用于决定采纳
  not_when,         // 不适用条件：这条经验在什么情况下会反过来伤人
}
```

**L2 流程（procedure）**——跨原子归纳出的、子任务级的文本 SOP：

```
procedure = {
  title, when, steps, pitfalls, not_when,
  derivedFrom: [atomIds],   // 可追溯
  support,                  // 在多少个不同 scope 上被观察到
  trials: {shown, wins, losses},  // 展示过几次、配对胜负
}
```

关键的三个取舍：

1. **文本优先，代码只在有执行器时**。我们没有技能调用接口，代码型"技能"无法验证；文本 SOP 可以被 brief 直接使用。
2. **子任务级，不是任务级**。受控研究里任务级技能平均低于无记忆基线——"怎么修这类 bug"比"怎么修这个 issue"更可能迁移。
3. **`not_when` 是一等字段**。负迁移是文献里最一致的警告；没有反条件，越相似越危险。

## 5. 检索与归因：两段，但先测再建

- **检索**照 Agent KB 分两段：planning 阶段给一条跨域 workflow（放宽），feedback 阶段给一条针对性诊断（收紧）。我们已有的 `selectLessons` 是 feedback 段的雏形。
- **采纳**不靠相似度，靠"是否会改变计划"的判断（disagreement gate 的弱化版）：在把一条 procedure 放进 brief 之前，要求它至少命中一个 `not_when` 检查。
- **归因**必须复用已有机制：`round.js:1822` 已记录 attempt 看过的 lesson ids，`round.js:1485-1507` 已让同轮一个候选看、其余不看，`pairedImpacts` 已做对照。跨域 procedure 只要走同一条通道，就能被同样计分。

**先测量，再决定要不要建库。** 验收标准：

- 在一组探索轮里，把一条 L2 procedure 展示给 treated 候选；
- 记录 `trials.shown / wins / losses`（相对 control）；
- 若 20 次展示后胜率不高于对照，就删掉这一层，而不是继续加机制。

## 6. 我不确定的

- 五篇里只有 Trace2Skill 读了正文（HTML），其余是摘要；STRATA 的 contrast edge 具体怎么构造、Agent KB 的 gate 阈值，我都没读到实现。
- "子任务级文本优于任务级代码"的证据来自单一受控研究，尚未被独立复现；不要当成定律。
- 我们的任务是软件修复，和这些论文里的 Minecraft / 表格 / 网页导航差异很大；迁移的"形状"可能根本不是同一类。

## 7. 下一步（按顺序，不并行）

1. 给 `selectLessons` 的候选加 `not_when` 过滤与 `procedure` 类型（小改动，可回滚）。
2. 把跨域 procedure 接进"探索轮 treated 候选"，打上 attempt 标记，复用 pairedImpacts。
3. 攒 20 次展示，算配对胜率；零结果就撤掉 `cross.js` 这条线，别留死代码。
4. 只有第 3 步为正，才讨论 SOP 归纳（dream 的抽象层）与跨战役存储。

## 8. 已落地（2026-11-15 深夜，commit 见文末）

第 1–3 步已接进生产路径，规格是 `tests/self25/procedure-transfer.test.mjs`：

- `notWhen` 在 `selectLessons` 里真正被读：任务文本、家族、标签、shape 任一命中即不展示。
- `procedure` 是稀缺类型：每份 brief 最多一条，`phase === 'repair'` 时一条也不给。
- 跨域经验只能以 `analogy` 进入，且只在调用方显式 `allowAnalogies` 时；call site 只在探索/停滞时打开，repair 永不打开。
- 展示即记账：选中一条 procedure/analogy 就写 `lesson.shown`，`lesson.impact` 再按配对增益记 win/loss；`trialVerdict` 在 20 次展示后给出 keep/drop，`rsi_status` 直接打印。
- 跨战役存储：`src/knowledge/store.js` 读写 `<home>/knowledge.json`，按 id 去重、最多 500 条、坏文件先备份；`round.js` 在采纳一条新经验时同时写全局库。
- 每次尝试被归类成 shape（`error`/`no-patch`/`solved`/`near-miss`/`unsolved`），随 `round.finished` 落账；下一轮用它作为"现在卡在哪"的匹配条件。

**procedure 的生产者**：`src/knowledge/procedure.js` 从**同一 family+subject 的至少 2 次独立晋升**归纳一条 procedure（单次成功不算；id 由 family+subject 稳定哈希；步骤取被改文件频次序；同 subject 的失败按 shape 写成 `notWhen` 与 pitfalls）。`round.js` 在晋升后调用它，新 procedure 同时写本战役与全局库；已有同 id 的不重复归纳。所以这条线现在是闭环的：归纳 → 选择/展示 → `lesson.shown` 记账 → `lesson.impact` 记胜负 → 20 次后 keep/drop。

**仍然没有的真实数据**：20 次展示的裁决要真实战役慢慢攒，不能在本轮伪造。`notWhen` 目前对任务文本做子串匹配（例如 'error' 会误伤提到 error 的任务），这是已知的过度抑制，等真实误伤出现再收紧成"只匹配 shape 标签"。

诚实的边界：Trace2Skill 之外的四篇只读了摘要与部分章节；"抽象记忆迁移更好"只有一篇受控研究支持；我们的任务与那些基准是否共享 shape，仍是假设。



## 9. T1/T2 验证（2026-11-15 夜，m02966）

T1 是确定性集成测试，不是演示：`tests/self27/knowledge-integration.test.mjs` 用真的 `runRound` 跑三轮，假 dispatcher 只写文件、真正跑 verifier。四条断言分别证明：

1. 同一 subject 的两次晋升会在本轮 `lessons` 和 `<home>/knowledge.json` 里各产生一条 `kind:'procedure'`（且只一条）；
2. 第三轮的 brief 里出现这条 procedure 的 id，尝试记录也带着它 —— 归纳真的回到了选择里；
3. `notWhen:['locked']` 的任务文本命中时，这条经验不再发给 worker；
4. `trials:{shown:20,wins:3,losses:9}` 的经验不再发给 worker —— 输掉的试验会真的停掉它的曝光。

写这条规格时修了两个真问题：`selectLessons` 原本没有执行 `trialVerdict === 'drop'` 的过滤；`tests/self22/fixture.mjs` 的假 runtime 只折叠 rounds/checkpoints，不折叠 `lesson.added`，所以"第三轮看见第二轮的经验"这件事从未被测过。两处都已改。

T2 是只读回放，脚本 `scripts/knowledge-report.mjs`（默认 `~/.dsh/loom`，`--json` 出结构化结果，不写任何文件）。对现有 **114** 个战役的回放：

- 38 个战役能归纳出至少一条 procedure，共 **57** 条；
- support 分布：恰好 2 次晋升的 **42/57（74%）**，3 次 6 条，4 次 5 条，6 次 2 条，8 次 2 条；
- 步骤数：只有 1 个文件的 **18/57（32%）**，2 个 13 条，3 个 14 条，4 个 11 条，5 个 1 条；
- `notWhen` 非空的：**0/57**；
- 48 个 family，跨战役重复 id 只有 1 条（`proc-fa4293e9`，同为 `lib.mjs`）。

**结论（这是 T2 想回答的）**：规则偏松，且松在结构上，不只是阈值。

- subject 取"第一个被改的文件"，所以两条晋升只要碰过同一个文件就算同 subject；claim 因此是套套逻辑 —— 示例原文是"2 verified attempts in t1 changed src/list.mjs through the same files"，它复述共现，没有指出杠杆。
- 32% 的条目只有一步"change X"，这不是 procedure，是"这个仓库改这个文件就行"。
- 74% 的 support 恰好等于阈值 2；把 `minSupport` 提到 3 会砍掉 42/57，说明目前证据本来就薄。
- 0 条 `notWhen` 说明"同 subject 的失败"几乎没有被记录（旧账本里失败尝试常无 report），所以抑制条件这条线在真实数据上还没被检验过。

不建议现在调阈值来"让数字好看"。更合理的是收紧归纳条件本身：要求两次晋升的**首个改动文件相同**（subject 身份，而不是集合相交）、要求步骤 ≥2 个不同文件、`notWhen` 只从同 subject 的失败里取。这三条都会减少条数，但会提高每条的可检验性 —— 是否做，等你定；T3（小预算真实战役攒 20 次展示）比继续加规则更能说明问题。

**回放不能证明的**：这些 procedure 是否帮到了任何一次尝试。旧账本没有 shown/control 记录，回放只能看"会归纳出什么"，不能看因果。T3/T4 仍然必要。

## 10. 收紧归纳规则（2026-11-16 凌晨）

T2 指出的两个结构问题直接改在规则上，不是调阈值。`induceProcedures` 现在要求：

- **同任务不算独立**：support 里至少要来自 `minSupport` 个不同 taskId。同一任务两轮成功是"缓存答案"，不是可迁移的情境。
- **一步不算 procedure**：步骤至少 `minSteps`（默认 2）个不同文件；"1. change src/parser.js" 这种条目不再产生。
- **subject 身份不变**：仍然按"首个被改文件"分组，两条晋升必须从同一个文件起步；不同入口文件永不合并。
- **claim 改成观察句**：从"changed X through the same files"改成"N verified promotions on M task(s) began at X; together they also changed K other file(s)"——它描述证据，不暗示因果。

配套改动：`attempt.finished` 现在带 `taskId`（此前只有 `family`，独立性和回放都没法判断）；回放脚本会把每个 group 的拒绝原因计数（`onReject`），所以"规则砍掉了什么"是可数的，不靠感觉。

**同一批 114 个战役的回放，规则收紧前后：**

| | 收紧前 | 收紧后 |
|---|---|---|
| 能归纳出 procedure 的战役 | 38 | 2 |
| procedure 总数 | 57 | 2 |
| 只有一步的条目 | 18 | 0 |
| support = 2 的条目 | 42 | 0 |

拒绝原因：`same-task` **67** 组，`too-few-steps` **4** 组。也就是说，旧规则下 57 条里有 55 条要么是"同一任务重复成功"，要么是"只改了一个文件"——两类都不该被称为可迁移的过程。剩下两条（`loom-self8`、`loom-self9`）各有 3–4 次晋升、2 个任务、2–3 个步骤，claim 是"began at src/runtime/round.js; together they also changed 2 other file(s)"。

**这带来的新问题，必须说清楚**：procedure 现在非常稀有（2/114 战役），`lesson.shown` 的真实样本会比以前更少，"20 次展示后裁决"在现有战役规模下可能长期停在 `insufficient`。这不是缺陷，是收紧的代价——要么接受 procedure 是低频高置信单元，要么用 T3 的小预算战役专门攒展示次数。在你决定 T3 之前，我不会为了让数字好看再放宽规则。

新规格：`tests/self28/procedure-tightening.test.mjs`（5 条）；旧规格 `tests/self26`、`tests/self27` 按新规则改写（不是放宽断言：T1 的 fixture 现在写两个文件，因为单文件编辑已不再产生 procedure）。
