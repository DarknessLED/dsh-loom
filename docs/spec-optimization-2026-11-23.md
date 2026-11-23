# RSI 插件优化规格（2026-11-23）

> 依据：八方向各 42 篇基石正文精读（336 篇 pick，读到 305 篇，1610 段带 locator 的逐字引文）、
> 8 份 `directions/r*-*.deep2.reading.md`、`directions/synthesis.reading.md`（含跨方向共引、
> 截断效应与年代剖面）、`docs/research/synthesis-2026-11-23.md`、
> **第十个方向 `r10-eval-budget`（评估预算 × 评估可靠性，291 篇、49 篇读通、六篇正文精读）**、
> 账本 1741 claim / 312 evidence 与 13 份封印报告。
> 本文只写「改什么、为什么、红 spec 长什么样、会错在哪」，实现与提交另起。
>
> 修订一（2026-11-23 晚）：跨方向综合复核时纠正了三个数、量出了一个此前只是猜测的事实，
> 据此改写了 P0-4，新增 §2 陷阱三，并把「相似度依赖切点」写进边界。
>
> 修订二（2026-11-23 深夜）：补跑 R10 之后 **P0-1 整个换掉**——它原本是「噪声棒由 n 算」，
> 读完 PACE 之后那是错的近似：我们做的是**配对**比较，该用配对赌注 e-process，二项下界只是它的
> 一个更弱特例。同时把 P0-2（defer 记账）提到 P0-1 之前，因为换了检验而没有 defer 账，
> 就无从评估这次换门。另修了一个自己写的解析器缺陷（参考文献年份），见 §6 新增行。
> 改动处均标 **[修订]**。

---

## 0. 一句话

读完三百多篇正文之后，值得改的不是五个新功能，而是**五个读数**：
每一个都已经在某个地方把「测到的东西」换成了「更容易测到的东西」，
而这件事在八个方向里各自被独立命名过一次（reward hacking / 方差 / ASR 衰减 / 自评偏差）。
所以这份规格的组织单位是读数，不是功能。

**[修订] 补跑 R10 之后多一句**：这五个失真里有四个的**解法**不在我们这套工程学里，而在统计学的
现成结果里——序贯检验、e-process、置信序列、自适应停止判据，都已经在 2020–2026 年间被写成可实现的
算法，只是还没被搬进 agent 的晋升回路。所以本轮最贵的改动不是「加一个读数」，是**把晋升门换成
一个正确的检验**（P0-1）。

---

## 1. 边界与写法

**依据的边界（先说清，免得被当成全领域结论）**

1. 所有「被引多少」都是**本语料内**的计数，不是全领域被引数。
2. 判断段（`directions/*.reading.md`）是人写的归纳，不是论文原话；每条判断都尽标注了 locator，但「所以我们应该改 X」这一步是我的推理。
3. `splitShared` 的 ideas / infrastructure 分类是标题启发式，已误判过一次（`2501.12948` DeepSeek-R1 被归进基础设施）；结论只读「shared ideas」表里的大项，不读单条。
4. **[修订] 任何「几个方向看法一致」的句子都依赖一个切点。** 共引矩阵只截每个方向被引最多的 20 篇；用整库 Jaccard 重算，八个方向里 **7 个**的最近邻会变（只有 R5 的最近邻两侧都是 R1）。最被引的往往是共同基础设施（PPO、基座模型、benchmark），不是被争论的东西。所以本文引用「方向之间共享什么」时，一律同时给两种口径，不给单一口径。
5. **[修订] 分清「文献说的」与「我在本机数的」。** §8 的表只收有 claim id 的文献结论；本机测量（战役数、段落覆盖率、R3 的共享比例）单独标注，它们没有封印、可复算但没有作者背书。混在一起会让读者以为「95 个段落没挂 claim」是某篇论文的发现。
6. **[修订] 九个方向和十个方向的数字不能混用。** R10 是补跑的，`research/out/*.survey.md` 里它的参数（`--pages 2 --trace 50 --keep 160 --gaps 8`）与 r2–r8 同档，但 r1 是 `--pages 3 --trace 70 --keep 240 --gaps 10`。共引矩阵里 r10 与 r3 的 top-20 重叠是 **0**、整库只共享 2 篇（Jaccard 0.0040），这个"更彻底的零"本身就是结论的一部分：**老派 HPO 的预算分配与新近的 LLM 评估统计是两个语料**。

**写法（照 `tests/self37/spec-index.test.mjs` 与 TDD 的规矩）**

1. 每条改动**先写红 spec**，红的原因必须是缺行为，不能是 fixture 写错了（这条规矩本身来自一次事故：`tests/balance/holdout-claim.test.mjs` 第一次红是 `evidence` 写成了字符串）。
2. 红 spec 放 `tests/self53/`（下一个空号），绿了之后 append 进 `scripts/test-all.mjs` 的 `standing` 列表——`tests/self37` 会让「没 pin 的 spec」直接失败。
3. 一条改动一个 commit，commit message 里写它对应的 claim id，免得下一个人又要从散文里找回依据。

---

## 2. 先看三个陷阱：改了不生效的地方

这三条不是改动，是**前提**。不先说清，后面所有关于噪声、holdout 与引用的改动都会变成空转。

### 陷阱一：`decidePromotion` 不在主路径上

`src/gate/gate.js:315` 的 `decidePromotion` 实现了 `docs/contracts.md §3` 的八条规则（含 `noiseSpread * noiseMultiplier`、`holdoutScore` 回归、`minTasks`），但它在 `src/` 里**没有调用点**——只有 `tests/gate.test.mjs` 与同文件的 `noopDecision`（`gate.js:473`）用。

真正决定晋升的是 `src/runtime/round.js:2577`：

```js
const promote = basePass && checks.holdout !== false
```

其中 `basePass` 来自 `round.js:2571-2576`，阈值判断在 `round.js:2320` 的 `beatsIncumbent`：

```js
beatsIncumbent: taskBest === null || (score - taskBest >= policy.minGain - 1e-9 && beatsNoise),
```

而 `beatsNoise` 用的是**裸的** `policy.noiseSpread`（`round.js:2303-2309`），没有 `noiseMultiplier`，也不看 `config.noiseSpread`。

**后果**：任何「把噪声棒改成由 n 算」的改动，如果只改 `gate.js`，对真实轮次零效果——规格写得再对也不会生效；反过来，只改 `round.js` 会让契约文档与测试继续描述一条不存在的规则。这是要先修的结构问题（见 P0-3）——[修订] 而换门（P0-1）必须在它之后，否则新证据要写三份。

### 陷阱二：`holdoutScore` 从来没有值

`gate.js:358-362` 那条「holdout 变好没有记录、变坏才拒绝」的规则读 `candidate.holdoutScore` / `incumbent.holdoutScore`；而真实轮次只写 `checks.holdout: true | false | 'skipped'`（`round.js:2415`、`2465`、`2472`、`2475`、`2477`、`2502`），**从不写分数**。

**后果**：「holdout 只是回归检查」这句话现在有两重含义：规则本身只做否决（事实），而且它连输入都收不到（更强的事实）。P1-1 要修的就是这个。

### 陷阱三 **[修订]**：报告段落与它引的 claim 之间没有文本连接

`src/research/ledger.js:256` 的 `renderReport` 逐段只写 `cleanText(paragraph.text)`（`:262-264`），
`paragraph.claimIds` **从不被读**。claim 与证据的关系全部落在报告末尾的 `## Claims` 表里，
正文与它的依据在文本上没有任何连接。

**这不是推测，是数出来的**：13 份封印报告、95 个正文段落里，**76 个（80%）一个 claim id 都没提到**。
剩下 19 个全部来自同一份报告（`deep-r1-r8-structural-findings`），而那 19 个是我写正文时**手敲进去的**
`· c-xxxx [verified]` 字样——不是渲染器写的（渲染器写的话会按段落声明的顺序出现，而这 19 个的 id
是逐条手抄的）。换句话说：连接能力今天完全由作者手工提供，渲染器一次都没用过 `claimIds`。

（脚本口径：切到 `## Claims` 之前、按空行分段、长度 >40 字符、不以 `#`/`|`/`>` 开头的段落，
两个数分别是「段落里出现任何 `[0-9a-f]{8,}` 形态的 claim id」与「出现 `[c-…]` 方括号标记」。）

**后果**：P0-4 原本写的是「给 manifest 加覆盖率字段」。加字段是对的，但**先加字段等于量一个不存在的东西**——
今天由渲染器生成的覆盖率是 0，不是因为写得敷衍，而是因为渲染器没有这个能力。所以 P0-4 拆成两半，
第一半是把连接渲染出来，第二半才是统计。这也顺带解释了为什么 `claimIds` 在工具 schema 里
（`src/tools/index.js:1243`）存在了整整一轮却没有任何文档产出过它。

---

## 3. 改动清单

排序依据：`值 = 影响的读数个数 × 被文献独立命名的次数`，`成本 = 要动的既有契约数`。

### P0（同一类病：读数被替换）

#### P0-1 **[修订]** 晋升门换成配对序贯检验（PACE 形态），噪声棒降为对照臂

- **文献**：PACE `2606.08106`——§1「an anytime-valid commit gate: a training-free wrapper that compares each candidate to the incumbent on identical instances and commits only when a testing-by-betting e-process clears a threshold」；§Guarantee「The control is anytime-valid… discordant-pair outcomes in evaluation order」；§Testing by betting「Under the null 𝔼[2wᵢ−1]=0, so E is a nonnegative martingale」；§Why the obvious fixes fall short「This is a textbook case of adaptive data analysis: reusing one validation set to steer a long, data-dependent sequence of choices invalidates its naive estimates and inflates false discoveries」；§When (not) to use it「The price of the gate's safety is power… a gain too small for the evaluation budget to resolve is rejected」。claim `c-90990d802bd9`、`c-3b89a409084b`、`c-925acadbff79`、`c-e898290e841f`、`c-bb390d255e39`、`c-5a0c88519839`、`c-e47afdbb026f`。配套：`2607.12338` §Policy outputs 的**三态**（accept / reject / defer）、`2601.13885` §Adaptive stopping（停表判据是相邻对的胜率越过阈值，不是每个模型各自的标准误低于 ε）、`2609.29140`（固定预算在「多测任务」与「重复已选任务」之间分配）。
- **现状锚点**：`src/runtime/round.js:2320` 的 `beatsIncumbent = taskBest === null || (score - taskBest >= policy.minGain - 1e-9 && beatsNoise)`，`beatsNoise` 用常数 `policy.noiseSpread`（`round.js:2303-2309`，缺省 0.1，见 `src/core/config.js:249`）。**这就是 PACE 点名的那种规则**：同一个任务集被反复用来决定留哪个候选，且每轮都在看分数涨没涨。PACE 在 GSM8K / SVAMP / ARC-Challenge 上实测这类贪心接受规则 **30–42% 的 commit 是假的、10–33% 有害**。
- **为什么上一版的「噪声棒由 n 算」是错的**：二项标准误 `1.96·sqrt(p₁(1−p₁)/n₁ + p₀(1−p₀)/n₀)` 假设两次评测**独立**；而我们的候选与在位者是在**同一批任务**上评的，配对结构被丢掉了。丢掉配对结构带来两个后果：一是棒子偏宽（把真实改进判成噪声，`c-bb390d255e39` 说的「功效代价」被我们自己额外放大一次）；二是它**没有** anytime-valid 性——只要轮次足够多、每轮都在同一集合上看，多重比较的假发现率仍然会涨，而 PACE 的 e-process 在 optional stopping 下仍有 `Pr[sup_t E_t ≥ 1/α] ≤ α`。所以二项棒降级为**过渡期的对照臂**，不是终局。
- **依赖**：**必须先做 P0-2**。换了门而没记 `defer`，等于用一个更保守的规则静默地少晋升，事后无从判断是「变准了」还是「变哑了」。§5 的依赖图已改。
- **红 spec（三条）**：
  ```js
  // 1) tests/self53/paired-e-process.test.mjs —— 今天失败：没有这个模块
  import { eValue, commitDecision } from '../../src/gate/sequential.js'
  // λ=0.5、α=0.05（阈值 1/α=20）时每对输赢把 E 乘 1.5 或 0.5：
  // 第 8 个连赢把 E 推到 1.5^8 = 25.63 ≥ 20，过线即 commit。
  const r = commitDecision({ discordant: [1,1,1,1,1,1,1,1], alpha: 0.05, lambda: 0.5 })
  assert.equal(r.commit, true)
  assert.equal(r.firstCrossing, 8)
  assert.ok(Math.abs(r.eValue - 25.62890625) < 1e-6)
  // 过线之后的数据不许回头改写判决：加一个输对，最终 E 掉到 12.81 < 20，但 commit 仍为真。
  // 这正是 anytime-valid 与「看最终均值」的区别，也是第一版最容易写错的地方。
  const late = commitDecision({ discordant: [1,1,1,1,1,1,1,1,0], alpha: 0.05, lambda: 0.5 })
  assert.equal(late.commit, true)
  assert.equal(late.firstCrossing, 8)
  assert.ok(late.eValue < 1 / 0.05)
  // 没有不一致对（每个任务上两边打平）：不许 commit，且必须说得出为什么
  assert.equal(commitDecision({ discordant: [], alpha: 0.05 }).reason, 'no discordant pairs')
  // 输赢混杂、始终没过线：commit 为假，而它必须是 defer 而不是 reject
  const mixed = commitDecision({ discordant: [1,0,1,0,1,0], alpha: 0.05, lambda: 0.5 })
  assert.equal(mixed.commit, false)
  assert.equal(mixed.decision, 'defer')

  // 2) tests/self53/promotion-uses-paired-test.test.mjs —— 今天失败：round.js 里没有它
  const src = readFileSync('src/runtime/round.js', 'utf8')
  assert.match(src, /commitDecision\(/)
  assert.match(src, /defer/)          // 三态要出现在真判决处

  // 3) tests/self53/gate-can-defer.test.mjs —— 今天失败：gate.evaluated 只有 promote 布尔
  // 跑一轮真实 runRound，delta 为正但 e-value 未过线 → promoted=false 且 decision='defer'
  ```
- **改法**：
  1. 新增 `src/gate/sequential.js`：`eValue(discordant, {lambda})` 逐步累乘 `E_i = ∏(1 + λ(2w_j−1))`；`commitDecision({discordant, alpha, lambda})` → `{commit, decision: 'commit'|'defer'|'reject', eValue, firstCrossing, reason}`。三态的边界要写死：任一时刻 E ≥ 1/α 即 `commit`（此后数据不许回头改写判决，这是 anytime-valid 与「看最终均值」的区别）；E ≤ α 时 `reject`；两者之间 `defer`。
  2. `round.js` 把「本任务历史候选 vs 在位者」的**逐任务胜负**收集成 discordant 序列（同一任务、同一夹具的成对结果），交 `commitDecision`；`promoted` 由它决定，`checks` 里保留原来的 `beatsNoise` 结果作为**对照臂**字段 `checks.noiseArm`。
  3. `gate.evaluated` 增加 `decision: 'accept' | 'reject' | 'defer'`、`eValue`、`firstCrossing`、`alpha`、`lambda`；`promoted` 保持布尔以不破坏既有读法。
  4. α 与 λ 进 `src/core/config.js`（`gate.alpha` 缺省 0.05、`gate.efoldLambda` 缺省 0.5），并允许 campaign 级 policy override。
  5. **先影子跑**：与 P0-3 的四步同构——新门只写 `gate.evaluated.shadow`，真判决仍走旧规则，跑满 20 轮再切。理由：这条会改变历史行为，且 PACE 明说它会拒绝「评估预算分辨不出的改进」。
- **会错在哪（三条，都要写进代码注释）**：
  1. **identical instances 前提没有证据**。PACE 要求同一个实例；我们的每次 verify 都在 `worktree` 重建、依赖可能重装的环境里跑，同一任务的两次评测**是否同一实例**没被验证过。这一条直接决定 e-process 是否合法，而验证它需要的正是 `q-a7ebd5decbd3` 那条至今没跑的「同一补丁重跑三次的方差」。
  2. **α 与 λ 没有先验**。PACE 的 0.05 / 0.5 是在 GSM8K 尺度上调的；我们的 killRate 分布（0.85–0.9 常见、0/1 常见）与它差很远，照抄会得到过松或过紧的门。第一版必须写成可配 + 影子对照，不许硬编码。
  3. **功效代价会真的丢改进**。`c-bb390d255e39`：milder handicap 只保住 +0.18 的 **78%**。所以「门变严了」这件事必须能在账本里被看见（defer 计数与原因），否则下一个人只会看到「晋升变少了」。
- **过渡方案（不推荐单独做）**：若不换门，最小改动是给现有棒子加 n 与下限闸——`scoreOf` 增 `n = metrics.mutants`，`n ≥ 20` 时才用二项下界，否则退回常数棒；返回 `noiseBar` 与 `noiseFormula: 'binomial' | 'config'`。它有 P0-1 的一小半价值（棒子随样本量动），但没有 anytime-valid 性。**只有当 P0-1 的影子对照证明「换门会丢掉过多真实改进」时才回落到这一档**，并在 `docs/l2-state.md` 写明回落原因。
- **验收**：三条 spec 绿；20 轮影子对照表（旧判决 vs 新判决 vs 差异原因）写进 `docs/l2-state.md`；`docs/contracts.md §3` 的规则 6 改成「晋升 = 配对 e-process，噪声棒仅作对照」；`tests/self20/killrate-score.test.mjs` 不破坏（它只断言 `score`/`source`）。

#### P0-2 **[修订] 拒绝与「没决定」都留反事实：gate 卡也记账（P0-1 的前置）**

- **文献**：`2212.08073` §1 监督者本身要能 scale；`2402.06782` §1/§6 debate 的判据是说服力而非正确性（rsi_decide 现在正是「判官没有反方」）；`1805.00899` §1「human may be unable to judge whether an explained answer is correct」。claim 侧：`c-b65143702917` 说明「只在紧档有效」的收益需要被量出来才敢用。
- **现状锚点**：`src/runtime/decision-effects.js:82` 只处理 `chain | plateau | chain-revert` 三类卡，`gate` 卡被拒绝后什么都不写。**但数据其实齐了**：`round.js:2679-2690` 的 `raise('gate', …)` 已经带 `attempt`、`score`，以及 `cardEvidence({task, attempt, score, checks, policyMinGain})`，而 `cardEvidence`（`src/runtime/review-card.js:91-103`）里就有 `task.id`。所以这条改动**不需要动 round.js**，只需要 `decision-effects.js` 读已有字段——这与我上一轮读代码时容易犯的错（以为 payload 缺字段）正好相反，写在这里当提醒：先看 payload 再判断缺什么。
- **红 spec**：`tests/self53/declined-gate-is-measured.test.mjs`
  ```js
  // 今天失败：返回 null，账本里没有 gate.declined
  const target = { kind: 'gate', payload: { attempt: 'r3a1', score: 0.4, evidence: { task: { id: 't1' } } } }
  const r = applyRejectionEffects({ runtime, view, target, actor: 'human' })
  assert.equal(r.kind, 'gate.declined')
  assert.equal(r.baseline, 0.4)
  assert.equal(r.taskId, 't1')
  // 没有任务 id 的卡仍要拒绝记账，但原因要显式：
  const r2 = applyRejectionEffects({ runtime, view, target: { kind: 'gate', payload: { score: 0.4 } } })
  assert.equal(r2, null)  // or {kind:'gate.declined', taskId:null, measured:false}
  ```
- **[修订] 为什么它现在排在 P0-1 前面**：PACE 的三态里 `defer` 是一等状态（`2607.12338` §Policy outputs 把 budgeted policy 的输出写成 accept / reject / defer 三态）。我们的账本今天只有「晋升」与「没晋升」两种事实，没有「本可以晋升但证据不够」这一类——而换门之后最多的恰恰是这一类。没有这笔账，P0-1 的效果无法评估，只能说「晋升少了」。
- **改法**：`decision-effects.js` 增 `gate` 分支，从 `payload.evidence.task.id` 取任务、`payload.score` 取 baseline，追加 `gate.declined {taskId, baseline, at}`；`src/chain/measure.js` 增 `measureDeclinedGate`（与 `measureDeclined` 同构：下一轮同任务的分差），reducer 侧落 `state.gate.declined` 列表（cap 10）。无任务 id 时按上面的 spec 二选一——**倾向返回 `{taskId: null, measured: false}` 并落一条账，因为「拒绝了一件不知道是什么的事」本身就是要被看见的事实**。
- **会错在哪**：被拒绝的轮次可能根本没有下一轮同任务（任务集轮转），于是「拒绝的成本」永远是 null——这比不记更糟，因为它看起来像 0。所以必须显式记 `measured: false, reason: 'no later round on this task'`。
- **验收**：spec 绿；`gate.evaluated` 与 `gate.declined` 在 `docs/contracts.md` 的事件表里各有一行。

#### P0-3 两条晋升路径合一（P0-1 / P1-1 的前置）

- **文献**：`2403.04132` §5（区间分离才敢排名）与 `1603.06560` §3.2（判据必须写在一个地方才可复算）合起来说明：判定逻辑有两份实现时，你测的永远是较松的那份。
- **现状锚点**：见 §2 陷阱一。`round.js:2320` 与 `gate.js:315` 是同一套规则的两个版本，已经漂移（multiplier、config 回退、holdoutScore 三处不同）。
- **红 spec**：`tests/self53/one-promotion-rule.test.mjs`
  ```js
  // 今天失败：round.js 不调用 decidePromotion
  const src = readFileSync('src/runtime/round.js', 'utf8')
  assert.match(src, /decidePromotion\(/)
  // 且同一输入下，round 的判决与 decidePromotion 的 promote 相等
  ```
  后半条用 `tests/self22/fixture.mjs` 的 `makeRuntime` 跑一轮真实 `runRound`，把 `gate.evaluated` 的 `promoted` 与手工调用 `decidePromotion` 的结果比对。
- **改法**：`round.js` 把 `basePass` 的每一项映射成 `evidence`，调用 `decidePromotion`（`hasPatch` 走 `noopDecision`），保留 `checks` 里 round 特有的键（`testsClean`、`oracleClean`、`scope`）；**先只让判决走 gate，其它副作用（promote 后写知识、写 artifact）不变**，一轮之后再删旧的 `basePass`。
- **会错在哪**：这会改变历史行为——`round.js` 现在不看 `minTasks`，而 `decidePromotion` 在 `tasksEvaluated < minTasks` 时拒绝。默认 `minTasks = 6`（`src/core/config.js:19`，`config.chain.minTasks` 也是 6）。**这个数不是小数**：把 138 个战役的 evalset 与晋升轮次对起来数，**135 个战役的任务数 < 6，它们贡献了 248 次晋升里的 230 次（92.7%）**；任务数 ≥ 6 的只有 3 个战役、18 次晋升。也就是说「直接合并」会让几乎所有历史战役立刻停止晋升。所以顺序必须是：

  1. 先加一个**只记录不判决**的影子字段：`round.js` 在同一处调用 `decidePromotion`，把结果写进 `gate.evaluated.shadow = {promote, reason}`，真判决仍走旧的 `basePass`；
  2. 跑满 20 轮真实战役，统计旧判决 `promote:true` 而影子 `promote:false` 的轮次与 `reason` 分布；
  3. 只有当差异全部落在「`insufficient tasks`」这一个理由上时才继续——那说明要改的是 `minTasks` 的语义（轮次级任务数应改成「该任务历史上被评过几次」），不是合并本身；
  4. 验证：`tests/self53/one-promotion-rule.test.mjs` 绿 + 影子对照表写进 `docs/l2-state.md`。

#### P0-4 **[修订]** 封印报告带引用覆盖率（先接线，再统计）

- **文献**：`2304.09848` §1「merely 51.5% of generated sentences are fully supported」；`2508.04183` §1 的 claim 分解。claim `c-c31d7a4a7a85`。
- **现状锚点**：§2 陷阱三。`src/research/ledger.js:256` 的 `renderReport` 只输出 `## Claims` 表、从不写 `paragraph.claimIds`；`sealReport`（`ledger.js:296`）的 manifest 里没有覆盖率。**实测 13 份报告 / 95 个正文段落里 76 个什么都没挂**，另 19 个是同一份报告里手敲的 id、渲染器一次没用过 `claimIds`——所以这条改动的第一步不是统计，是让段落能挂。
- **红 spec 一（接线）**：`tests/self53/report-renders-its-claim-links.test.mjs`
  ```js
  // 今天失败：report.md 里根本没有 claim id 出现在正文行上
  const sealed = sealReport(home, {
    topic: 't',
    sections: [{ heading: 'A', paragraphs: [{ text: 'Two budgets, not one.', claimIds: ['c-1'] }] }],
    claims: [{ id: 'c-1', status: 'verified', text: 'Two budgets.', note: '1 quote' }],
  })
  const body = readFileSync(join(sealed.dir, 'report.md'), 'utf8')
  const para = body.split('## Claims')[0]
  assert.match(para, /Two budgets, not one\.[^\n]*\[c-1\]/, 'the paragraph carries the id it rests on')
  // 没有 claimId 的段落不许被伪造一条：仍然原样输出
  ```
- **红 spec 二（统计）**：`tests/self53/seal-counts-unsupported-paragraphs.test.mjs`
  ```js
  // 今天失败：manifest 没有 coverage 字段
  const sealed = sealReport(home, { topic:'t', sections:[{heading:'A', paragraphs:[{text:'no claim here'}]}], claims:[] })
  assert.equal(sealed.manifest.coverage.paragraphs, 1)
  assert.equal(sealed.manifest.coverage.cited, 0)
  assert.equal(sealed.manifest.coverage.uncited, 1)
  ```
- **改法**：
  1. `renderReport` 在每个段落末尾追加 `[c-xxx, c-yyy]`（只写段落自己声明的 id，**不**根据文字相似度猜）；
  2. 同一函数统计 `{paragraphs, cited, uncited, claimsListed, claimsNotInBody}`，透传到 manifest 的 `coverage`；
  3. 报告首行输出 `coverage: 3/7 paragraphs cite a claim`；`verifySeal` 不动（覆盖率是内容，改了 seal 自然会变）；
  4. 可选（另一条 commit）：`claimsNotInBody` 非空时 `verifySeal` 不算失败，但 `scripts/research-replay.mjs` 打印出来——那是「列在表里、没被任何段落用到」的 claim。
- **会错在哪**：
  - 段落级只是句级的粗近似，不能当精确率用；覆盖率高的报告也可能引用的是自己上一段。规格里必须写「覆盖率是下限，不是质量分」。
  - 接线之后**旧报告的渲染结果会变**。已封的 13 份报告不许重封（重封等于换掉历史），它们的 manifest 读出来是 `coverage: null`；新报告才有。
  - 统计口径要能区分「作者手敲的 id」与「渲染器写的 id」：只数 manifest 里由 `paragraph.claimIds` 生成的标记，别把正文里手写的字样算成覆盖率——两者混在一起正是当前 19/95 这个数看起来还不错的原因。
  - `[c-1]` 这种标记是**给人看的**，不是给机器解析的权威来源——权威仍是 `## Claims` 表与 manifest。
- **验收**：两条 spec 绿；新封一份报告能看到段落带 id 与 manifest 里的 coverage；`scripts/research-replay.mjs` 仍 13/13；`docs/research/` 里新增的报告带覆盖率。

### P1（结构改动）

#### P1-1 holdout 从「通过/不通过」改成第二读数

- **文献**：`2510.20270` §7「frontier models frequently cheat when faced with these impossible tasks」；`2503.11926` §3.1 只看 CoT 的 monitor 优于只看动作；`2306.05685` §1 三类偏差、§6 只覆盖 helpfulness。claims `c-a0bf3d59ce00`、`c-6d4488db5615`。
- **现状锚点**：§2 陷阱二；另外 `round.js:2434` 的注释自己写明「One holdout per round, round-robin over stable ids」——每轮只抽**一个任务**、只看 exit code。
- **红 spec**：`tests/self53/holdout-is-a-second-reading.test.mjs`——一轮里 visible 通过、holdout 通过 => `gate.evaluated` 带 `holdoutScore`（finite）；visible 通过、holdout 失败 => `holdoutScore === 0` 且 `promoted === false`；两侧都有分数且 holdout 变好 => `checks.holdoutGain === true`（今天没有这个键）。
- **改法**：`research/mutants/task.mjs` 增打 `HOLDOUTKILL=`（与 `KILLRATE=` 同格式，`src/gate/metrics.js` 的 `METRICS` 加一项即可，两个文件都不用改解析）；`round.js` 把 holdout 的 reading 写进 `gate.evaluated` 与 `attempt`；`decision-effects`/`measure` 侧按 P0-1 的同一把尺子算分差。
- **会错在哪**：holdout 池只有 1–3 个任务时，「第二读数」的噪声比它要测的信号大（R2 的 2.2–6.0 个点）。所以必须先量 holdout 池大小，池小于 3 就直接记 `holdoutScore: null, reason: 'pool too small'`，不许拿单次读数当第二意见。**现状对我们不利**：138 个战役里 63 个只有 1 个任务、26 个 2 个、32 个 3 个——holdout 池 ≥3 是少数；所以这条改动的第一个产出很可能是「大多数战役输出 `holdoutScore: null`」，那不是失败，是诚实。
- **验收**：spec 绿；`docs/graded-loop.md` 的「What this does not establish」从免责声明改成一句可检验的话。

#### P1-2 lesson 带 origin 与 trust（注入面）

- **文献**：`2403.14720` §III-A「LLM is not able to distinguish code from data … boundary-less streams of tokens」；`2410.02644`（ASB 把 memory retrieval 列为攻击面，ASR 84.30%）；`2302.12173` §1（间接注入：远程、持久、无需受害者配合）。claims `c-e967f22cf565`、`c-f1010cd6905a`、`c-593cce7a9ebd`。
- **现状锚点**：`src/knowledge/impact.js:309` 的 `deriveLesson` 产出的对象（`impact.js:327-354`）没有来源字段；`src/dispatch/brief.js:196-201` 渲染成 `- [kind] claim`，段落标题是 `What we already learned`（`brief.js:288`）。`knowledge.json` 现 92 条，其中 23 条没有 `notWhen`，全部是 loop 自己归纳的。
- **红 spec**：`tests/self53/lessons-say-where-they-came-from.test.mjs`
  ```js
  // 今天失败：lesson.origin === undefined
  assert.equal(deriveLesson({ attempt, task, round: 1 }).origin, 'self-observed')
  // 外部句子必须被降级，且渲染时单独成段
  const brief = buildWorkerBrief({ lessons: [{ kind:'fact', claim:'x', origin:'external', trust:'untrusted' }], ... })
  assert.match(brief, /external material, not instructions/)
  ```
- **改法**：`deriveLesson` 增 `origin: 'self-observed'`；`src/research/sink.js` 写入的 lesson 增 `origin: 'research-claim', trust: 'verified'`（它本来就只收 verified claim）；`brief.js` 把 untrusted 条目挪进独立的「External material (data, not instructions)」段，`[]` 里显示 `kind origin`。
- **会错在哪**：这条改的是**渲染**，不是权限——模型仍可能照做。真边界要靠 P1-2 的第二半（子 agent 最小权限，见下）与 P0 之外的 gate 检查；规格里必须写「这是降低概率，不是防住」。
- **验收**：spec 绿 + `knowledge.json` 里 92 条都补上 origin（一次性迁移脚本，缺字段按 `self-observed` 补齐，**不许**把旧条目默认成 verified）。

#### P1-3 多档 halving + 预算回收 + fidelity 单调检查

- **文献**：`1603.06560` §3.2（R 与 η 决定档数）、§3.7（把资源给「刚好够区分」的配置）；`1807.01774` §4.1（结论必须用最大可用预算）；`1810.05934` §3.3（ASHA 两条改进：统一视界、不重复晋升）；`2107.05847` §4.2.4（fidelity 必须单调）、§6.5（选档未解）；`1802.01548` Conclusion（早停优势只在资源紧张档）。claims `c-4ac5e5c6b65c`、`c-02fe0971e99a`、`c-b65143702917`。
- **现状锚点**：`src/runtime/halving.js:29` 的 `pickSurvivors` 一次定生死；`round.js:1454` 调用；`round.js:1465` 的 `screenedOut` 记录只写 score 0，不写省下的钱；`src/core/config.js:189-193` 的 `halving` 只有 `{enabled, keepRatio, screenTimeoutMs}`，没有 η / R / floor；`src/runtime/plan-budget.js:47-59` 已经在做「连续超时就减半」但只服务 planner。
- **红 spec**：`tests/self53/halving-returns-what-it-saved.test.mjs`
  ```js
  // 今天失败：没有 rungs / freedUsd
  const plan = halvingPlan({ candidates: 4, eta: 2, rungs: ['screen','half','full'], maxUsd: 0.4 })
  assert.deepEqual(plan.rungs.map(r => r.keep), [4, 2, 1])
  assert.ok(plan.rungs[0].freedUsd > 0)
  ```
  以及 `tests/self53/fidelity-check-can-stop-halving.test.mjs`：给 `roundStats` 喂最近 5 轮「screen 第一的候选从未被晋升」的历史，`policy.halving` 必须变 false 且 checkpoint 写明理由。
- **改法**：`halving.js` 增 `halvingPlan`（纯函数，η 与 R 显式参数）；`round.js` 在 `screenedOut` 记录上写 `freedUsd`，在幸存者上写 `reallocUsd`，两者不等就在 round 记录里标 `halvingKind: 'prefilter'`（诚实命名）；`plan-budget.js` 的减半逻辑抽成共用 `budgetRungs(ceiling, {eta, floor, window, streak})`；`roundStats` 增秩相关（screen 排名 vs 晋升结果）。
- **会错在哪**：我们的 screen 与 verify 是**两个不同命令**，fidelity 单调性无法保证——所以「掉下阈值就关 halving」会关得很频繁，可能大幅减少 screening 次数（现在 470 轮里只有 9 轮 screen 过）。这是可接受的结果，但必须在文档里写明「关掉是正确行为，不是退化」。
- **验收**：spec 绿；`docs/l2-state.md:193` 的 21% 那条 Correction 再核对一次（它已经是「n=1 紧档观测」）；新跑一场真实战役，记录 `freedUsd` 与总支出差。

#### P1-4 链版本按描述符归档 + 提案分布坍塌检测

- **文献**：`1504.04909` §3（archive 按描述符分格，即种群本身）、§4（novelty search 的 cycling 与参数负担）；`2506.13131` §2.5（进化数据库的用途是「optimally resurface previously explored ideas」）；`2510.22954` §3/§5（diversity collapse 已被命名并测量）。claim `c-bc724e75303b`。
- **现状锚点**：`src/chain/mutate.js:76` 的 `MUTATION_KINDS` 是四条平铺字符串；`mutate.js:90` 的 `statusOf` 只挡 `conflicts-with-scope` 与 `already-decided`，没有「这一类已经用得太多」；`src/chain/spec-diff.js` 给的是**结构差**（字段变了什么），不是**行为差**（任务上变了什么）。
- **红 spec**：`tests/self53/proposal-kinds-can-collapse.test.mjs`
  ```js
  // 今天失败：没有 collapsed 状态
  const out = proposeMutations(spec, { fromVersion: 5, history: [重复四次 minimal-change] })
  assert.equal(out.find(m => m.kind === 'minimal-change').status, 'collapsed')
  ```
  以及 `tests/self53/versions-are-filed-by-behaviour.test.mjs`：同一 spec 的两个版本在同一任务集上跑分不同，`descriptorOf` 必须给出不同的格（今天没有这个函数）。
- **改法**：`MUTATION_KINDS` 从字符串数组变成 `{kind, since, evidence}` 注册表（保留字符串导出以兼容）；`proposeMutations` 增 `history` 参数算占比，超 60% 降 `collapsed`；新增 `descriptorOf({rounds, chainVersion})` 返回 `{meanScore, tasksSolved, costUsd, edits}` 这类可归档的格子键（**不是** `spec-diff` 的结构差）。
- **会错在哪**：描述符选什么是文献自己没解决的问题（`2506.13131` §Flexibility 只说抽象层次要好）。选错了会让 archive 分格变噪声——所以第一步只**记录**格键、不据此改变提案，观察 20 轮再决定是否让它参与选择。
- **验收**：spec 绿；一轮真实战役的 `chain.proposed` 事件带 `descriptor` 字段；`docs/l2-state.md` 记一条「格键是否稳定」的观测。

### P2（便宜、可延后）

| 编号 | 改动 | 文献锚点 | 红 spec 断言（今天失败的地方） |
| --- | --- | --- | --- |
| P2-1 | `compareChains` 的 `minTasks` 由任务池推导、阈值从分位数估 | `2506.13131` §2.5、`2403.04132` §5 | `src/chain/evidence.js:68` 的 `minTasks = 6` 是常量；spec 喂 4 个任务必须得到 `enoughTasks: true`（按池 60% 算） |
| P2-2 | research 的 followup 停止改成可测边际 | `2310.06770` §4.1（召回是任务形状的函数）、`2407.12883` | `src/research/fetch.js:368` 的 `if (rounds !== 2) return []` 与 `:377` 的 `Math.min(2, …)` 是硬编码；spec 要求第 3 轮在边际覆盖 > 阈值时仍产出查询 |
| P2-3 | 整篇 shallow 标记，`gradeNote` 对 shallow 来源降级 | `2501.04227` §1（6.1 vs 3.8）、`src/research/note.js:38` 已有 `NEEDS_FULL_TEXT` | 给 `deepread` 的 1–2 段论文打 `shallow: true`，其 mechanism claim 必须被判 `depth-exceeds-reading`（今天 `note.js:85` 只看单条 claim 的 depth） |
| P2-4 | `trialVerdict` 用区间，`pruneLessons` 接进主路径 | `1504.04909` §4（cycling：同一批旧想法被反复重采）、`2504.19413` §1（跨会话一致性） | `src/knowledge/cross.js:115` 的 `TRIAL_MIN = 20` 是拍数门槛、`:131` 的 `wins > losses ? 'keep' : 'drop'` 是裸多数：20 次里 11 胜 9 负今天判 `keep`，而二项 95% 区间跨过 0.5，spec 要求 `insufficient`。另：`pruneLessons`（`src/knowledge/select.js:232`）在 `src/` 里**零调用点**（`grep -rn pruneLessons src/ \| wc -l` = 0），所以「遗忘」今天只是选择时的一次过滤 |
| P2-5 | `oracleScripts` 看住夹具文件 | `2511.21654` §2.5（test file edit 是三类检测之一） | `src/gate/oracle.js` 只认命令里出现且存在的文件；spec 要求「verify 命令读的 JSON 夹具被改」也算 oracle 污染（今天改夹具能伪造绿） |
| P2-6 | 子 agent 最小权限 profile | `2505.23643`（策略挂到会触发后果的工具上）、`2503.18666` §3.2（`user_inspection` 是合法执行动作） | `src/dispatch/session.js:400-418` 的 `agentOptions` 只有 provider/model/effort；spec 要求任务未声明 `exec` 时子 agent 的 spec 里没有 exec 权限 |

---

## 4. 明确不做

1. **不改 killRate 的语义**（不做成 0/1、不换成别的指标）。R2 说的问题是它的**精度**，不是它的方向；换指标会把 470 轮历史全部作废。
2. **不引入新 benchmark、不换模型**。八方向里真正贵的是「同一棵树跑两次」的重复性测量，那件事不需要新任务集。
3. **不做「agent 一键采纳」的自动化提升**。R5 读下来，没有一篇支持把审批变成自动；`2211.03540` §The Paradigm 的 sandwiching 恰恰要求监督者在环上。
4. **不给 `decidePromotion` 加第九条规则**。先让两条路径合一（P0-3），否则第九条规则会变成第三份实现。
5. **不回溯重封 13 份旧报告**。P0-4 只加 manifest 字段；旧报告的 `coverage: null` 是诚实的历史。

---

## 5. 顺序与依赖

```
P0-2 ──► P0-1 ──► P1-1
  │                 │
  └──► P0-3         └──► P1-3
P0-4（独立）
P1-2（独立）
P1-4（独立，先只记录）
P2-*（任意时候，互不依赖）
```

- **[修订] P0-4 内部有顺序**：先接线（渲染 claim 链接），再统计（manifest 覆盖率）。反过来的话，由渲染器算出的覆盖率全是 0，字段加了也读不出任何信息——这正是本轮量出来的 0（手敲那 19 个不算，因为下一份报告不会有）。
- **[修订] 换门之前的顺序**：P0-2（defer 记账）→ P0-1 的影子段 → P0-3（两条晋升路径合一）→ P0-1 切真。理由：P0-1 要在一处判决里加新证据（逐任务配对结果），而今天这处判决在 `round.js` 里、`decidePromotion` 里各有一份；不先合一，就要写第三份。
- **本轮建议**：P0-2 + P0-4（各一个下午，互不依赖；一个让「没决定」可见，一个让「带引用的错误答案」可见），P0-1 与 P0-3 用影子对照起头。
- **下一轮**：P0-1 切真 → P1-1 → P1-3，这三条是一条链，必须一起验收（单独看 P0-1 会得到「门变严了但没人在看 defer」的假象）。
- **不许跳过 P0-2 直接做 P0-1**：换门之后丢掉的那部分晋升，若没有 defer 账就变成静默损失，是这份规格里最贵的错。

---

## 6. 写这份规格时先量过的数（别凭记忆）

上文的每一条「现状」都不是从散文里抄的，是这一轮从本机账本与战役目录里数的。留在这里，好让下一个人复核而不必重数：

| 量 | 值 | 出处 |
| --- | --- | --- |
| 战役数 / 晋升轮次 | 138 / 248 | `~/.dsh/loom/campaigns/*/events.jsonl` 的 `round.finished` |
| 任务数 < 6 的战役 / 它们的晋升 | **135 / 230（92.7%）** | 同上 + `views/*.json` 的 `evalset.tasks` |
| holdout 池为 0 的战役 | **95 / 138** | `views/*.json` 的 `evalset.holdout`；池 ≥3 的只有 1 个 |
| 做过 screening 的轮次 / 支出 | 9 轮 / $0.0750（全库 $10.2898 的 0.73%） | `events.jsonl` 的 `attempt.finished.screened` |
| 账本 claim / evidence / 报告 | 1741 / 312 / 13 | `~/.dsh/loom/research/ledger/` |
| **[修订]** 参考文献坏年份（不可信年份比例） | 修前 231 / 17474（1.3%），修后 **0** | 9 份 survey 的 `agg.works`；`publicationYear` 的 7 条规格 |
| **[修订]** R10 与 r3 的 top-20 重叠 / 整库共享 | **0 篇 / 2 篇（Jaccard 0.0040）** | `scripts/research-synthesis.mjs`（九方向） |
| `knowledge.json` lesson / 带 `notWhen` | 92 / 69 | 同上 |
| `decisions.json` 记录 | 5 | 同上 |
| `pruneLessons` 的调用点 | **0** | `grep -rn pruneLessons src/` |
| 全量 suite | **317/317** | `node scripts/test-all.mjs` |
| **[修订]** 封印报告中「段落挂 claim」的比例 | **76 / 95 什么都没挂（80%）**；另 19 个是作者手敲的 id，渲染器 0 次 | `~/.dsh/loom/research/ledger/reports/*/report.md`；口径见 §2 陷阱三 |
| **[修订]** R3 与其余方向的共享 | **12 / 122（9.8%）**，八方向最低；其中 0 篇关于预算分配或早停 | `research/out/*.survey.json` + `scripts/research-synthesis.mjs` |
| **[修订]** R3 的引文中位年份 | **2019**（其余 2024–2025）；80% 早于 2023 | 同上（`eraProfile`） |
| **[修订]** 截断视图下「最近邻」会变的方向数 | **7 / 8** | 同上（`truncationEffect`） |

六个数最容易被说错，特别记下来：

1. **92.7%**：所以「合并两条晋升路径」不是重构，是停掉九成历史行为——P0-3 的四步顺序不能省。
2. **95/138 没有 holdout 池**：所以 P1-1 的第二个读数在多数战役里根本不存在，写「加一个读数」之前得先承认「没有第二个读数」是常态。
3. **9 轮 screening / 0.73%**：所以 P1-3 的所有改动都在一个几乎没有被用过的路径上；它的收益上限是 0.73% 的支出，不该按「能省很多钱」来估。
4. **76/95 段落一个 claim id 都没提**：所以 P0-4 不是「加一个质量指标」，是「把连接从手工改回机器」。它今天看起来不是 0（19/95）只是因为我在一份报告里手敲了 id——那种做法不可能复制到每一份报告。正确的第一步是让渲染器接管，而不是让人继续抄。
5. **[修订] R10 与 r3 共享 0 篇（top-20）、整库 2 篇**：所以「R3 孤立」不是关键词缺口——换了一整套统计词汇去搜，搜到的联合空间（PACE / AV-AIVAT / Cost-Efficient Eval / Anytime-Valid Promotion Tests）与 R3 的老派 HPO 语料**几乎零重叠**。两句话都对：联合方向存在，且它和 HPO 是两个语料。上一轮把 R3 的孤立读成「没人做」，现在要读成「统计社区早已逐个解决，只是没搬进 agent 的晋升回路」。
6. **[修订] 坏年份 1.3% 但中位数不变**：修前 231 个不可能年份（>2027 或 <1960），修后 0；九个方向的年代中位数一个都没变（r3 2018 仍是 2018）。所以 `eraProfile` 的结论不用改口，但**单条记录的年份**在下游使用前要重新取。

---

## 7. 验收（整份规格）

1. 每条改动的红 spec 在改之前**因为缺行为**失败，红的原因写进 commit message；变绿后 append 进 `scripts/test-all.mjs`。
2. `node scripts/test-all.mjs` 全绿（当前 **317/317**）。
3. `docs/contracts.md` 与实现同步（`tests/self11/docs-coverage.test.mjs` 会让新模块没文档就失败）。
4. `docs/l2-state.md`：halving 21% 那条 Correction 保持；新增一条「两条晋升路径何时合一、影子对照的不一致轮次数」。
5. **诚实条款**：任何一条改动如果在真实战役里量不出收益，把观测写进 `docs/` 并保留 spec（spec 记录的是契约，不是效果）；不许为了让 spec 变绿而放宽断言。

---

## 8. 文献 → 改动 对照表（可复算）

| claim id | 论文 | locator | 落到 |
| --- | --- | --- | --- |
| `c-8ed0fc3598d7` | `2210.10760` | §4.2.1 | P0-1 |
| `c-a3f89646905a` | `2107.03374` | §2.1 | P0-1 |
| `c-4ac5e5c6b65c` | `2107.05847` | §4.2.4 | P1-3 |
| `c-02fe0971e99a` | `1807.01774` | §4.1 / §3.2 | P1-3 |
| `c-b65143702917` | `1802.01548` | Conclusion | P1-3、§4.5 |
| `c-6d4488db5615` | `2510.20270` | §7 | P1-1 |
| `c-a0bf3d59ce00` | `2503.11926` | §3.1 | P1-1 |
| `c-e967f22cf565` | `2403.14720` | §III-A | P1-2 |
| `c-f1010cd6905a` | `2410.02644` | §1 | P1-2 |
| `c-593cce7a9ebd` | `2310.08560` | §2.3 | P1-2、P2-4 |
| `c-bc724e75303b` | `1504.04909` | §3 | P1-4 |
| `c-c31d7a4a7a85` | `2304.09848` | §1 | P0-4 |
| `c-920c16dfb421` | `2411.00640` | §1 | P0-4、P1-1 |
| `c-054c23681636` | `2503.09516` | §1 | P2-2 |
| **[修订]** `c-90990d802bd9` | `2606.08106` PACE | §1 Introduction | P0-1 |
| **[修订]** `c-e898290e841f` | `2606.08106` PACE | §Why the obvious fixes fall short | P0-1（我们正是那种规则） |
| **[修订]** `c-3b89a409084b` | `2606.08106` PACE | §Guarantee | P0-1（anytime-valid） |
| **[修订]** `c-bb390d255e39` | `2606.08106` PACE | §When (not) to use it | P0-1（功效代价，78%） |
| **[修订]** `c-2d34dca257f5` | `2607.12338` | §Policy outputs | P0-2（defer 是第三态） |
| **[修订]** `c-8bdb6403f975` | `2601.13885` | §Adaptive stopping | P0-1（停表判据不是各自标准误） |

上表的每一行都有一条**带封印**的 claim 支撑（`~/.dsh/loom/research/ledger/claims.jsonl`）。下面这三条是**本机测量**，没有封印、没有作者背书，只可复算：

| 量 | 值 | 复算方式 | 支撑了哪条改动 |
| --- | --- | --- | --- |
| 报告段落挂 claim 的比例 | 76 / 95 全裸；19 个手敲 | 见 §2 陷阱三的口径；`node -e` 扫 `reports/*/report.md` | P0-4 |
| R3 的跨方向共享 | 12 / 122 | `node scripts/research-synthesis.mjs --out-dir research/out` | P1-3 的前提论证 |
| R3 引文中位年份 | 2019 | 同上（`eraProfile` 段） | P1-3：不是「没人做」，是「前提不成立」 |
| **[修订]** 参考文献坏年份 | 修前 231 / 17474（1.3%）→ 修后 0 | `node -e` 扫九份 `agg.works` 的 `year`（>2027 或 1900–1959） | 与改动无关；它是我自己解析器引入的缺陷，记在这里因为 §6 的年份统计都依赖它 |
| **[修订]** 九个方向重跑后的 per-direction 被引数 | r1 2044 / r2 2070 / r3 1113 / r4 1820 / r5 2008 / r6 1456 / r7 2937 / r8 2289 / r10 1737 | `node -e` 读 `research/out/*.survey.json` 的 `agg.works` | §1 边界 6：九个与十个方向的数字不能混用 |

**R3 这条为什么值得单列（[修订]）**：上一版本写「R3 与其余七个方向零交集」，复核后是错的——四个方向各与它共享 1 篇，都是 PPO。更准确、也更有用的说法是：它共享的 12 篇全是**工具**（一个优化器、一个环境接口、几个 benchmark、一条「AI 做科研」产品线），没有一篇是预算分配或早停；而它真正依赖的 Hyperband / BOHB / freeze-thaw / regularized evolution 在其余七个方向一次都没出现。加上年代（中位 2019、80% 早于 2023），结论从「agent 文献忽略了预算分配」变成「**做预算分配的那套前提（可分辨、单调、同源）agent 评估一条都不满足**」。P1-3 的价值全部押在这句话上，所以它必须写对。

复算：`node scripts/research-replay.mjs`（13/13 seal）、`node scripts/research-synthesis.mjs --out-dir research/out`（共引矩阵、整库 Jaccard、年代剖面）、
`~/.dsh/loom/research/ledger/claims.jsonl`（1700 行）。
