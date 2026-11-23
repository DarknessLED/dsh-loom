# RSI 插件优化规格（2026-11-23）

> 依据：八方向各 42 篇基石正文精读（336 篇 pick，读到 305 篇，1610 段带 locator 的逐字引文）、
> 8 份 `directions/r*-*.deep2.reading.md`、`directions/synthesis.reading.md`、
> 账本 1700 claim（1699 verified / 1 contradicted / 1654 带 locator）与 13 份封印报告。
> 本文只写「改什么、为什么、红 spec 长什么样、会错在哪」，实现与提交另起。

---

## 0. 一句话

读完三百多篇正文之后，值得改的不是五个新功能，而是**五个读数**：
每一个都已经在某个地方把「测到的东西」换成了「更容易测到的东西」，
而这件事在八个方向里各自被独立命名过一次（reward hacking / 方差 / ASR 衰减 / 自评偏差）。
所以这份规格的组织单位是读数，不是功能。

---

## 1. 边界与写法

**依据的边界（先说清，免得被当成全领域结论）**

1. 所有「被引多少」都是**本语料内**的计数，不是全领域被引数。
2. 判断段（`directions/*.reading.md`）是人写的归纳，不是论文原话；每条判断都尽标注了 locator，但「所以我们应该改 X」这一步是我的推理。
3. `splitShared` 的 ideas / infrastructure 分类是标题启发式，已误判过一次（`2501.12948` DeepSeek-R1 被归进基础设施）；结论只读「shared ideas」表里的大项，不读单条。

**写法（照 `tests/self37/spec-index.test.mjs` 与 TDD 的规矩）**

1. 每条改动**先写红 spec**，红的原因必须是缺行为，不能是 fixture 写错了（这条规矩本身来自一次事故：`tests/balance/holdout-claim.test.mjs` 第一次红是 `evidence` 写成了字符串）。
2. 红 spec 放 `tests/self53/`（下一个空号），绿了之后 append 进 `scripts/test-all.mjs` 的 `standing` 列表——`tests/self37` 会让「没 pin 的 spec」直接失败。
3. 一条改动一个 commit，commit message 里写它对应的 claim id，免得下一个人又要从散文里找回依据。

---

## 2. 先看两个陷阱：改了不生效的地方

这两条不是改动，是**前提**。不先说清，后面所有关于噪声与 holdout 的改动都会变成空转。

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

**后果**：任何「把噪声棒改成由 n 算」的改动，如果只改 `gate.js`，对真实轮次零效果——规格写得再对也不会生效；反过来，只改 `round.js` 会让契约文档与测试继续描述一条不存在的规则。这是要先修的结构问题（见 P0-3）。

### 陷阱二：`holdoutScore` 从来没有值

`gate.js:358-362` 那条「holdout 变好没有记录、变坏才拒绝」的规则读 `candidate.holdoutScore` / `incumbent.holdoutScore`；而真实轮次只写 `checks.holdout: true | false | 'skipped'`（`round.js:2415`、`2465`、`2472`、`2475`、`2477`、`2502`），**从不写分数**。

**后果**：「holdout 只是回归检查」这句话现在有两重含义：规则本身只做否决（事实），而且它连输入都收不到（更强的事实）。P1-1 要修的就是这个。

---

## 3. 改动清单

排序依据：`值 = 影响的读数个数 × 被文献独立命名的次数`，`成本 = 要动的既有契约数`。

### P0（同一类病：读数被替换）

#### P0-1 `scoreOf` 带上 n，噪声棒由 n 算

- **文献**：`2107.03374` §2.1「computing pass@k in this way can have high variance」并给出无偏估计；`2403.04132` §5 用 pivot bootstrap + sandwich 稳健标准误，并按**区间是否分离**排名（`R_m = 1 + Σ 1{inf C_m' > sup C_m}`）；`2210.10760` §4.2.1「optimization power … divided between optimizing the gold reward and selecting on the noise proportional to their variances」。claim `c-a3f89646905a`、`c-8ed0fc3598d7`。
- **现状锚点**：`src/gate/score.js:58` 返回 `{score, source}`，没有样本量；`src/gate/gate.js:372-382` 的棒子是 `noiseSpread * noiseMultiplier`，`noiseMultiplier` 缺省 1（`gate.js:377`），`noiseSpread` 缺省 `0.1`（`src/core/config.js:249`）——一个与 n 无关的常数。
- **红 spec**：`tests/self53/score-carries-n.test.mjs`
  ```js
  // 今天失败：out.n === undefined
  const out = scoreOf({ verifierOk: true, metrics: { killRate: 0.62, mutants: 22 } })
  assert.equal(out.n, 22)
  assert.equal(scoreOf({ verifierOk: true, metrics: { killRate: 0.62 } }).n, null)
  ```
  以及 `tests/self53/noise-bar-from-n.test.mjs`：
  ```js
  // 今天失败：没有 noiseBar 这个键（它现在是局部变量，不出现在返回值里）
  const r = decidePromotion({
    candidate: { score: 0.72, metrics: { killRate: 0.72, mutants: 40 } },
    incumbent: { score: 0.62, metrics: { killRate: 0.62, mutants: 40 } },
    config: { minGain: 0.05, minTasks: 1, holdoutSlack: 0 },
    evidence: { complete: true, tasksEvaluated: 1 },
  })
  const want = 1.96 * Math.sqrt((0.72 * 0.28) / 40 + (0.62 * 0.38) / 40)
  assert.ok(Math.abs(r.noiseBar - want) < 1e-6)
  assert.match(r.noiseFormula, /binomial/)
  // 样本太小时不许用这个棒子：n=4 时半宽会比 delta 还大，等于判决失效
  const small = decidePromotion({ ...同上, candidate: {...metrics:{killRate:0.72, mutants:4}}, incumbent: {...metrics:{killRate:0.62, mutants:4}} })
  assert.equal(small.noiseFormula, 'config')
  ```
- **改法**：`scoreOf` 增 `n`（取 `metrics.mutants`，非正整数/缺失 → `null`）；`decidePromotion` 在 `canCompare && 两侧 n 都 ≥ 20` 时用 `1.96 * sqrt(p1(1-p1)/n1 + p0(1-p0)/n0)`，否则退回 `noiseSpread * noiseMultiplier`；返回值增 `noiseBar` 与 `noiseFormula: 'binomial' | 'config'`，`reason` 里带上 n 与所用公式。
- **为什么必须有 n ≥ 20 这道闸**：手算一下就知道不加不行。`p1=0.72, p0=0.62, n1=n0=4` 时半宽是 `1.96 × sqrt(0.0504 + 0.0589) = 0.65`，而 delta 只有 0.10——任何 n=4 的读数都会被判「在噪声里」，等于把判决关掉。`n=40` 时半宽降到 0.20，才算得出东西。我们的变异体规模是 22 级（`src/gate/metrics.js` 的注释写「mean across 22 tasks」），所以这道闸会让相当一部分轮次退回常数棒：**这正是诚实的结果**，不是退步。
- **会错在哪**：二项标准误假设击杀独立同分布，而变异体高度相关（一个补丁可能一次杀掉一串），所以它**低估**真实不确定性。必须写进注释与 `reason` 措辞：它是「至少这么宽」的下界，不是无偏误差棒。若实测显示它比常数棒还窄，说明常数棒本来就没在测任何东西。
- **验收**：两条 spec 绿；`docs/contracts.md §3` 的规则 6 改成「n 可算则用二项下界」；`scripts/test-all.mjs` 全绿（`tests/self20/killrate-score.test.mjs` 只断言 `score`/`source`，加字段不破坏它）。

#### P0-2 拒绝也留反事实：gate 卡也记账

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

#### P0-4 封印报告带引用覆盖率

- **文献**：`2304.09848` §1「merely 51.5% of generated sentences are fully supported」；`2508.04183` §1 的 claim 分解。claim `c-c31d7a4a7a85`。
- **现状锚点**：`src/research/ledger.js:256` 的 `renderReport` 只输出 `## Claims` 表；`sealReport`（`ledger.js:296`）的 manifest 里没有覆盖率。账本现状 1700 claim / 1699 verified，但**报告段落可以不挂任何 claim**，封印照样通过。
- **红 spec**：`tests/self53/seal-counts-unsupported-paragraphs.test.mjs`
  ```js
  // 今天失败：manifest 没有 coverage 字段
  const sealed = sealReport(home, { topic:'t', sections:[{heading:'A', paragraphs:[{text:'no claim here'}]}], claims:[] })
  assert.equal(sealed.manifest.coverage.paragraphs, 1)
  assert.equal(sealed.manifest.coverage.cited, 0)
  assert.equal(sealed.manifest.coverage.uncited, 1)
  ```
- **改法**：`renderReport` 统计「有 claimId 的段落 / 总段落」，数据透传到 manifest 的 `coverage`；报告首行输出 `coverage: 3/7 paragraphs cite a claim`；`verifySeal` 不动（覆盖率是内容，改了 seal 自然会变）。另加**引用召回**：`renderReport` 数「`claims` 表里出现的不同 evidence id 数 / manifest 里 pinned 的 evidence 数」（今天恒等于全部，因为没人统计缺失）。
- **会错在哪**：段落级只是句级的粗近似，不能当精确率用；覆盖率高的报告也可能引用的是自己上一段。规格里必须写「覆盖率是下限，不是质量分」。已有的 13 份报告不会回溯加字段——只在 manifest 里加，旧报告读出来是 `coverage: null`，不许假装是 0。
- **验收**：spec 绿 + `scripts/research-replay.mjs` 仍 13/13（新字段进了 manifest 就会改 seal，所以**旧报告不重封**）。

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
P0-3 ──► P0-1 ──► P1-1
  │                 │
  └──► P0-2         └──► P1-3
P0-4（独立）
P1-2（独立）
P1-4（独立，先只记录）
P2-*（任意时候，互不依赖）
```

- **本轮建议**：P0-4 + P1-2（各一个下午，互不依赖，能立刻降低「带引用的错误答案」与「外部句子当指令」两个面），P0-3 用影子对照起头。
- **下一轮**：P0-1 → P1-1 → P1-3，这三条是一条链，必须一起验收（单独看 P0-1 会得到「棒子变了但没人用」的假象）。
- **不许跳过 P0-3 直接做 P0-1**：改完不生效，是这份规格里最容易犯的错。

---

## 6. 写这份规格时先量过的数（别凭记忆）

上文的每一条「现状」都不是从散文里抄的，是这一轮从本机账本与战役目录里数的。留在这里，好让下一个人复核而不必重数：

| 量 | 值 | 出处 |
| --- | --- | --- |
| 战役数 / 晋升轮次 | 138 / 248 | `~/.dsh/loom/campaigns/*/events.jsonl` 的 `round.finished` |
| 任务数 < 6 的战役 / 它们的晋升 | **135 / 230（92.7%）** | 同上 + `views/*.json` 的 `evalset.tasks` |
| holdout 池为 0 的战役 | **95 / 138** | `views/*.json` 的 `evalset.holdout`；池 ≥3 的只有 1 个 |
| 做过 screening 的轮次 / 支出 | 9 轮 / $0.0750（全库 $10.2898 的 0.73%） | `events.jsonl` 的 `attempt.finished.screened` |
| 账本 claim / 带 locator / 报告 | 1700 / 1654 / 13 | `~/.dsh/loom/research/ledger/` |
| `knowledge.json` lesson / 带 `notWhen` | 92 / 69 | 同上 |
| `decisions.json` 记录 | 5 | 同上 |
| `pruneLessons` 的调用点 | **0** | `grep -rn pruneLessons src/` |
| 全量 suite | 315/315 | `node scripts/test-all.mjs` |

三个数最容易被说错，特别记下来：

1. **92.7%**：所以「合并两条晋升路径」不是重构，是停掉九成历史行为——P0-3 的四步顺序不能省。
2. **95/138 没有 holdout 池**：所以 P1-1 的第二个读数在多数战役里根本不存在，写「加一个读数」之前得先承认「没有第二个读数」是常态。
3. **9 轮 screening / 0.73%**：所以 P1-3 的所有改动都在一个几乎没有被用过的路径上；它的收益上限是 0.73% 的支出，不该按「能省很多钱」来估。

---

## 7. 验收（整份规格）

1. 每条改动的红 spec 在改之前**因为缺行为**失败，红的原因写进 commit message；变绿后 append 进 `scripts/test-all.mjs`。
2. `node scripts/test-all.mjs` 全绿（当前 315/315）。
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

复算：`node scripts/research-replay.mjs`（13/13 seal）、`node scripts/research-synthesis.mjs --out-dir research/out`（共引矩阵）、
`~/.dsh/loom/research/ledger/claims.jsonl`（1700 行）。
