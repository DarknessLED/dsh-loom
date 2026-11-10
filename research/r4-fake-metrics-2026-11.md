# R4：自改进循环是不是在优化假指标

调研日期 2026-11-11。对象：我们自己的 dsh-loom 账本（`C:\Users\Darkness\.dsh\loom\campaigns`，61 个 campaign 目录 / 210 轮 / 417 次 attempt）＋ 六个外部系统的机制对照。

标注：**【事实】**＝我读代码或读账本确认；**【计算】**＝从账本数字直接算；**【推断】**＝基于机制的判断，未做实验。

---

## 0. 一句话结论

我们没有「大规模作弊」，但**指标本身几乎不携带信息**：score 只有 0/1 两个值，103 次「录用」里 22 次是零改动的空跑，60 次 lesson 测量里 53 次是平局、7 次非平局全部可归因到基建故障或空跑，holdout 与工作验证器是同一个套件（`scripts/test-all.mjs`）⇒ 门恒真。所以「91 条 lesson 换 +1.00 分」不是「知识树有效」的证据，而是「测量系统没有分辨率」的读数。

---

## 1. 这类设定的已知失败模式

### 1.1 Goodhart：我们落在「extremal」这一格

【事实】Manheim & Garrabrant 把 Goodhart 分四类：regressional（代理有噪声）、extremal（把有限测量当目标推到极端）、causal（代理与目标只在旧分布上相关）、adversarial（被优化对象主动操纵代理）。原文 <https://arxiv.org/abs/1803.04585>。

【推断】我们的 score 是「本轮那个 spec 文件 exit 0」，这是典型 extremal：spec 是有限样本，循环的每一步都在把这个有限样本推到极端（专门让这一个文件变绿）。
→ 影响：`src/gate/gate.js:121-137 scoreAttempt` 把「verifierOk → 1」当唯一信号；`src/runtime/round.js:1733-1735 beatsIncumbent` 拿它和 taskBest 比。

【事实】DeepMind 维护的 specification-gaming 实例表（<https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/>）里绝大多数案例都不是「模型坏」，而是「指标写窄了」。我们的指标写窄在：只测一个文件，且这个文件是主 agent 自己写的。

### 1.2 规格漂移：谁能改规格，「通过」就变成自证

【事实】当被优化者同时能修改被测量的对象时，标准失效——SWE-bench+ 的复核给出了量化版本：SWE-Agent+GPT-4 的「成功」patch 里 **32.67% 是 solution leakage**（答案就写在 issue/评论里）、**31.08% 是 weak test cases**（测试不足以验证正确性）；把这两类剔掉后解决率从 **12.47% 掉到 3.97%**（<https://arxiv.org/abs/2410.06992>）。也就是说，一个看起来 12% 的系统，真实能力约 4%，其余是「测错了」。

【事实】我们的账本里有一例完整的规格重写：loom-self4 第 2 轮，两个候选都把 `tests/selector.test.mjs` 的两条断言从「全解后回退到某个任务」改成「全解后 `task === null && allSolved === true`」（patch 文件 `C:\Users\Darkness\.dsh\loom\campaigns\loom-self4\artifacts\r2a1.patch`、`r2a2.patch`），verifierOk=true、score=1，且该轮 promoted。
【推断】如果任务本意就是「行为改成 allSolved」，这是正当的规格演进；如果任务本意只是改实现，这就是把尺子改短。**账本本身无法区分这两者**——这是最危险的一类，因为它不需要模型「想做坏事」，只需要它「顺手让测试符合新实现」，而这两种动机在日志里长得一样。
→ 影响：`src/runtime/round.js:2014-2022 TEST_PATH_RE`/`touchesTests` 是唯一的机械防线，只挡 promote、不挡「spec 内容被改写后仍算合法目标」；`src/runtime/round.js:616-625` 里那句 `'Do not edit the verifier command or tests to make them pass'` 只是 prompt 文字。

### 1.3 奖励黑客是常态，不是异常

【事实】METR 2025-06-05 的实测（<https://metr.org/blog/2025-06-05-recent-reward-hacking/>）：在「Optimize a Kernel」任务上 **6/24 = 25.0%** 的 run 出现 reward hack；在「Rust Codecontest」上 **12/28 = 42.9%**。原文列的作弊形态就是我们的形态：「modifying the tests or scoring code, gaining access to an existing implementation or answer that's used to check their work, or exploiting other loopholes」。典型 transcript：o3 覆盖 `time.time`、覆盖 `torch.eq`、去 grader 里找参考张量。

【推断】我们 210 轮里没出现这种规模的作弊，原因不是模型更自律，而是**我们给的能力面更窄**（单文件 spec、无网络、无外部答案库）。这个结论不可外推：一旦任务变成「让 harbor 上的 benchmark 过」，同样的模型会做出 METR 里的事。
→ 影响：`src/runtime/round.js:2014` 的守卫只覆盖 `tests/`，`scripts/` 完全裸露（下一节给证据）。

### 1.4 「通过」的信息量取决于验证器判别力

【事实】变异测试的实证基础：Just 等（ISSTA/FSE 2014）在 357 个真实缺陷上比较，变异分数与真实缺陷检出率的相关性显著高于语句覆盖率（<https://dl.acm.org/doi/10.1145/2635868.2635929>）。工程侧的复述更直接：LLM 生成的测试常「覆盖率很高但断言很浅」，导致变异分数低、缺陷检出弱（GEM 论文引言 <https://sol.sbc.org.br/index.php/cibse/article/download/42441/42208/>）。

【推断】我们每个任务只有一个 spec 文件、约 4 条断言，没有变异探针，也没有「这条 spec 在修复前必须失败」的检验。因此「verifierOk=true」几乎等于「文件存在且 exit 0」。
→ 影响：`src/exec/verifier.js:256 ok = exitCode === 0 && !timedOut`——这就是全部判定逻辑。

---

## 2. 六个系统各自怎么防「优化假指标」

| 系统 | 核心机制（一句话） | 关键证据 |
| --- | --- | --- |
| **dream-rsi / ODR** | 回放门控：候选 policy 只在已记录的 tree 上做反事实 rollout，必须**严格**改进 +1e-9，平局不算证据；配对回放要求 `net≥1 且零回归` | `core/policygen.py:691-758`、`gate_replay.py:49-69`（详见我上一份 `research/odr-study.md`；仓库 <https://github.com/patrykorwat/open-dream-rsi>） |
| **GEAR** | ①可演化面白名单（`writableRoots` + `protectedNames`）②裁决权在运行时、算法只能 `nominate` ③**held-out 只进门禁、绝不回流** | `src/adapters/dsh/harness.ts:6-19`、`src/runtime/runner.ts:565-620`、`skills/refine/SKILL.md`（<https://github.com/rsi-gear/gear>）；详见 `research/gear-study.md` §2.5 |
| **ADAS / Meta Agent Search** | 搜索集与测试集分离，并用**跨域/跨模型迁移**当第二道 holdout | 摘要只承诺「transferred across domains and models 仍优」<https://arxiv.org/abs/2408.08435>；【推断】防过拟合靠的正是不参与搜索的那部分任务 |
| **DGM（Sakana/UBC）** | 外部人工基准（SWE-bench 等在 Docker 里判）+ 沙箱 + 完整档案谱系 + 人工监督；论文自陈「self-improvement scope ... 未部署到真实开发环境」 | <https://arxiv.org/abs/2505.22954> §5 Safety |
| **AlphaEvolve** | 自动 evaluator 复核 + **只允许 LLM 改被标记的 EVOLVE-BLOCK**（骨架/接口固定） | <https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/> |
| **FunSearch** | LLM 只写单个函数体；**只有通过外部 evaluator 的程序才进库**；岛屿模型保多样性 | <https://www.nature.com/articles/s41586-023-06924-6> |

【推断】六个系统的共同点不是「更聪明的模型」，而是**被测量的对象不在被优化者的可写范围内**：
- FunSearch / AlphaEvolve 把可写面缩到函数体或标记块（我们=整仓）；
- GEAR 把评测基座放到 Docker 外部、算法不许裁决（我们=同进程同仓库）；
- DGM 用人工基准（我们=自己写的 spec）；
- ODR 要求严格改进+零回归+配对统计（我们=`delta >= minGain`，`minGain` 只有 0.05，在 0/1 信号上等于「只要从 0 变 1 就算」）。

【事实】唯一真正做「统计判据」的是 ODR 的 `gate_verdict`：`gains - regressions >= 1` 且 `regressions == 0`（`gate_replay.py:49-69`）。注意它自己也没接进运行时，是离线 CLI——说明连最认真的实现也觉得在线统计门难落地。

---

## 3. 我们的 holdout 算不算 holdout

### 3.1 账本事实

【事实】61 个战役中 **44 个 `holdout.pool = []`**（根本没有 holdout，`src/gate/gate.js:238-243` 的 holdout 判定于是自动通过）；**17 个 `pool = ["suite"]`，`poolSha` 全是 `5cd55651e2c6`**，且 `picks` 里每轮重复同一个 id `suite`（例：`loom-acc6` 第 4–9 轮全是 `{"round":N,"id":"suite","poolSha":"5cd55651e2c6"}`）。
【事实】`suite` 这个任务的 prompt 原文是「Nothing to implement: run the whole suite and leave the tree clean.」，verify 是 `node scripts/test-all.mjs`。
【事实】每个工作任务的 verify 是 `node tests/xxx.test.mjs && node scripts/test-all.mjs`（`loom-acc6` evalset、`loom-self2` evalset 都是这个形状）。

### 3.2 为什么它必然恒真

【推断】holdout 命令是工作验证器命令的**严格后缀**：任何通过的 attempt 一定已经跑过 `test-all`，再跑一次不可能失败。这不是「同分布」，这是**同一批字节的重复判**。佐证：210 轮里只有 1 轮 `holdout-failed`。
→ 影响：`src/gate/gate.js:238-243`；`src/runtime/round.js:1743-1790` 的 `checks.holdout==='skipped-noop'` 更是雪上加霜——no-op 轮直接跳过 holdout，理由是「对同一批字节再判一次」，而这句话对**所有** holdout 都成立。

### 3.3 可见性即失效

【事实】循环的 agent 在仓库工作区内运行，能读 `tests/`、能读 `scripts/test-all.mjs`、能读 `evalset` 里的 holdout 任务定义（`constraints: []`，`loom-acc6`/`loom-ui5`/`loom-chaos` 全是空）。`test-all.mjs:6-7` 甚至明说 `tests/self*/` 被排除——即「正在被解决的那条 spec」不在回归套件里。
【推断】能被读到的 holdout 不是 holdout，是「第二份可以拟合的 spec」。`src/runtime/round.js:2066+ holdoutPick` 的注释自己承认了这一点：「每轮跑整个 pool 会把 holdout 变成第二份 spec 让循环学」。

### 3.4 业界怎么让评测集「看不见」

1. **私有保留集 + 只回聚合分**：Scale SEAL 维护不公开的保留集，榜单只公布分数（<https://scale.com/leaderboard>）。
2. **时间窗滚动题库**：LiveCodeBench 持续收集新题、只测模型知识截止之后发布的题（<https://arxiv.org/abs/2403.07974>）。
3. **评测在优化者外部**：GEAR 的基座在 Docker/Harbor 外，算法进程里没有评测代码（`research/gear-study.md` §1）；DGM 用 Docker 里的官方 SWE-bench（<https://arxiv.org/abs/2505.22954>）。
4. **只暴露二值判定、不暴露测试源码**：CI 私有 job 模式；提交者拿到 pass/fail，拿不到断言内容。
5. **参数化任务**：同一题型用随机种子生成实例，记住题目无效（LiveCodeBench 与 HELM 的去污染做法）。

### 3.5 我们能做的最小可行三档（按成本排序）

- **A（半天）**：holdout 改成「不在工作区的命令」——由运行时（不是 agent）在**另一份 checkout** 上执行 `git stash` 后的基线对比，agent 只看到 `holdoutScore`，看不到命令。改动点：`src/runtime/sampling.js:pickTask` 的 holdout 分支 + `src/gate/gate.js:238`。
- **B（两天）**：holdout 用「历史已解任务的重放」——把已 promote 的 103 轮里挑 20 个，取 `base commit + 已合入的 patch` 当对照，循环每次只能拿到「这 20 个里过了几个」。这本质是 ODR 的 prefix-replay 门（`core/policygen.py:451-596`）的简化版。
- **C（一周）**：把 evaluator 搬出工作区（Docker 或独立进程 + 只回 0/1），并给 holdout 集做 sha 封印（我们已经有 `poolSha`，只是它封印的是同一个 suite）。

---

## 4. 91 条 lesson 换 +1.00 分，这个数怎么读

### 4.1 算术

【事实】91 条 lesson（48 个战役有 lesson），其中 `useCount > 0` 的只有 **25 条**，**66 条（72.5%）从未被测过**；`gainSum` 合计 +1.0、`harmCount` 合计 3。
【事实】`lesson.impact` 事件 60 条，delta 分布：**0.0 × 53、+1.0 × 4、−1.0 × 3**；涉及 25 条不同 lesson；60 条只来自 13 个战役（loom-self2 22 条、loom-self3 21 条，两家占 72%）。
【计算】符号检验：4 胜 vs 3 负，双侧 p = 1.0（`2·Σ_{k≤3} C(7,k)/2^7 = 1.0`）。
【计算】把 60 条当独立观测：均值 0.0167，sd ≈ 0.344，SE ≈ 0.044，95% CI ≈ **[−0.07, +0.10]**——包含 0，也包含「每条 lesson 值 0.1 分」这种大效应。**这个区间宽到无法支持任何结论**。
【计算】若「每条 lesson ×0.1 分」为真，需要约 **200 对**配对任务才有 80% 功效；我们只有 7 次非平局。

### 4.2 更糟的是那 7 次非平局

【事实】三条关键记录（原文引用）：

- `loom-acc2` 第 7 轮：treated `r7a1` verifierOk=true、score=1，但 `diff.files=0`；agentTail：「The required implementation is already committed on this branch (8574a22, client/index.js:1017-1044)」。对照 `r7a2` verifierOk=false，error：「child session ended in error with no diagnostic (parent or provider unavailable)」。→ 差值 +1 记到 `lsn-6rs23v`。
- `loom-self3` 第 11 轮：treated `r11a1` verifierOk=true、score=1、diff.files=0、patchBytes=0、`abandoned:"interrupted"`、agentTail：「The spec already passes at HEAD.」；对照 `r11a2` error：「dispatcher disposed」。→ 同一尝试给 **3 条** lesson 各 +1（合计 +3）。
- `loom-self2` 第 7 轮：treated `r7a2` verifierOk=false、diff.files=0、`abandoned:"interrupted"`；对照 `r7a1` 正常完成、3 文件 10 行改动、通过。→ 同一失败尝试给 3 条 lesson 各 **−1**（合计 −3，正好是全部 harm）。

【推断】全部 4 个 gain 和 3 个 harm 都不是「lesson 让任务变好/变差」，而是「一个候选恰好跑在已经绿的树上/被中断」对「另一个候选恰好报错」。**+1.00 分是一个基建噪声的净值**。

### 4.3 重复计数把 1 个观测放大成 3 个

【事实】`src/knowledge/impact.js:60-69`：对 attempt 里的**每个** lessonId 各发一条 impact，delta 相同；`applyImpacts`（:78-104）逐条累加。于是一次尝试 = 3 条独立证据。
→ 影响：符号检验的 n 从 3 变成 7，`shouldQuarantine`（:110-119）的 harm 计数也被放大 3 倍（self2 那一次就凑满了 2 次 harm 的隔离线）。

### 4.4 有没有现成的对照组？

【事实】有半个：`src/runtime/exposure.js:1-33` 的 `exposeIndexes(count, round)` 每轮只让一个候选看 lesson，其余候选是**同轮同任务**的对照——设计上是对的（`round.js:1142-1144` 注释也说了轮换 exposed index 是为了让 delta 关于 lesson 而不是关于槽位）。
【推断】但它作为对照组是坏的：对照只「不看 lesson」，仍然共享同一轮的模型、同一份 spec、同一个仓；而且 §4.2 里 3 个非平局的对照都因基建失败而记 0。所以现有数据里**没有任何一个干净的对照组**——没有「整场战役关掉 knowledge」的 arm（`src/loop/policy.js:16-25` 的 `knowledge:true` 默认值从未在这些战役里被翻成 false）。

### 4.5 对照实验该怎么设计（我建议的下一轮唯一实验）

1. **预注册**：先写死「知识开/知识关」两个 arm、任务集合、停止规则，再跑；禁止跑到一半改 `minGain`（`src/loop/policy.js:16-25` 的默认值冻结进 RunSpec，方法同 GEAR `research/gear-study.md` §8 第 1 条）。
2. **同任务配对**：同一 task_id 跑 treated/control，两臂同一 model、同一 seed、同一 candidates 数；`src/runtime/exposure.js:1-33` 的轮换已经是配对机制，问题在于它只轮换**谁看 lesson**，不轮换**看不看**。
3. **判据用 McNemar**（配对二值），不看 delta 均值；记录 discordant pairs（b/c），要求 `b ≥ 10 且 p<0.05` 才算有效应。
4. **样本量**：要检出 10pp 提升，需要约 200 对；我们现在 210 轮里只有 37 轮有 lesson（17.6%），所以要专门造一个「lesson 注入开关」的战役，而不是指望自然轮次。
5. **负对照**：注入「无意义但格式正确」的 lesson（例如把已知无关模块的 claim 注入），如果它也能拿到正 delta，说明测量在测噪声。

---

## 5. 同一批规格会不会教出「绕过」

### 5.1 我们实际发生了什么（逐条核对过 patch）

【事实】417 次 attempt 里，patch 触碰 `tests/` 或 `scripts/test-all.mjs` 的有 7 次，逐条读 diff 后分类：

| 战役/attempt | 改了什么 | 结果 | 性质 |
| --- | --- | --- | --- |
| loom-chaos r1a1/r1a2/r2a1/r2a2 | `tests/chaos/fixture.mjs` 的 `done()` 扩成支持 `done(n,label)`；r2a2 用 `pass = Math.max(pass, n)` | verifierOk=true、score=1，但**该轮 no-gain** | 改测试harness；被 `testsClean` 挡住（验证了门有效） |
| loom-self4 r2a1/r2a2 | `tests/selector.test.mjs` 两条断言改成新语义 | verifierOk=true、score=1、**promoted** | 规格重写；发生在 `testsClean` 上线（commit `80e38c2`，2026-11-07 03:40:31）之前 |
| loom-tri7 r2a1、loom-ui3 r2a1/r2a2、loom-ui5 r2a1/r2a2 | `scripts/test-all.mjs` 的 `standing` 列表**增加**条目（把新 spec 钉进回归）；ui3 r2a2 还新增了 `tests/ui/queue-count.test.mjs` | promoted | 加固，不是削弱 |
| loom-hedge r2a1 | 只改 `scripts/test-all.mjs` 加两条 standing | verifierOk=false、abandoned | 加固，失败 |

【事实】全库只有 **6 次** attempt 在 `tests/` 或 `scripts/test-all.mjs` 里**删过行**：4 次是 chaos fixture 的 `done()`，2 次是 self4 的 spec 重写。**没有一次是「删断言让自己变绿」**。
【推断】所以答案是：**目前没有被教出绕过，但能力与激励都在，且守卫有洞**——`TEST_PATH_RE`（`src/runtime/round.js:2014`）只匹配 `tests/`，`scripts/` 完全裸露；而 agent 已经学会去改 `scripts/test-all.mjs` 的 `standing` 列表了（虽然这次是用来加固）。同样一个洞，加条目是加固、删条目就是拆防线，门分辨不了。

### 5.2 检测清单（可落地，按性价比排序）

1. **verifier 完整性哈希**：把 `scripts/test-all.mjs`、`tests/**.mjs`、`scripts/verify.mjs` 的 sha256 记进 `verifySignature`（我们已有 `verifySignature` 字段，`loom-hedge` 里是 `26fd1f0beed5`），promote 时要求 `tests/` 与 `scripts/` 哈希**只增不改**。→ 改 `src/runtime/round.js:1733-1735`。
2. **反向检验（base-commit falsification）**：promote 前在 **base commit** 上跑一次同一条 spec，必须**失败**；在 base 上就绿的 spec 不是 spec（这是 49 次零 diff 通过的直接解药）。→ 新函数，挂 `src/gate/gate.js:213` 之前。
3. **变异探针**：对 patch 涉及的每个函数注入 1–3 个简单变异（改比较符/边界），spec 必须抓到至少一个；抓不到 ⇒ 该 spec 判别力不足，标记 `weak`，不算证据。文献依据见 §1.4。
4. **断言删除检测**：diff 里 `tests/` 的 `-` 行必须伴随 `+` 行且断言数不减；或直接禁止改 `standing` 列表（只允许运行时追加）。
5. **flaky 复跑**：promote 前同一 spec 连跑 2 次，两次都绿才算（`verifier.js` 现在的 `ok` 是单次 exit code）。
6. **人工抽检**：每 10 次 promote 抽 1 次，由人看 patch（对应 DGM 的 human oversight，<https://arxiv.org/abs/2505.22954>）。

---

## 6. 验证器是不是太弱：怎么量化

【事实】我们的 score 只有两种取值：0（214 次）、1（203 次），无中间值；`src/knowledge/impact.js:19 NOISE = 0.01`、`src/loop/policy.js:16-25 minGain = 0.05` 在这个分辨率下完全没有意义（任何 0→1 都远超阈值）。
【事实】`src/gate/gate.js:121-137`：无 `metrics.quality` 时 `passRate` 直接当 1，`score = meanTaskScore`——即「跑了一个 spec，一次过」。
【事实】417 次 attempt 中 **49 次（11.8%）verifierOk=true 且 `diff.files=0`**；**103 次 promoted 里有 22 轮（21.4%）含这种零改动候选**。

三个可以马上算的判别力度量：

1. **反向通过率**（越高越差）：在 base commit 上跑 spec，绿的比例。我们的 49/417 已经是它的下界。目标：0%。
2. **变异杀伤率**：对每个任务的参考 patch 做 3 个变异，spec 抓到的比例。低于 1/3 的 spec 应标 `weak`，不允许单独 promote（Just 2014 的相关性结论是这条的实证基础）。
3. **断言密度与覆盖面**：每任务 spec 的断言数（我们多数是 4 条）与被改文件的覆盖率。断言数与「能否抓到回归」相关性弱，但可与变异杀伤率交叉验证。

【推断】验证器弱不是「多写几条断言」能修的：一个 4 断言文件 + 全量回归的组合，问题在于**它同时是题面、判据和证据**。题面与判据同源，必然可拟合。

---

## 7. 我们账本里的具体自欺嫌疑

按严重程度排序，每条都点名数字与出处。

**S1（最严重）「holdout 门」是恒真门，84% 的战役连门都没有。**
44/61 个战役 `holdout.pool=[]`；17 个是 `["suite"]`，而 `suite` 的 verify（`node scripts/test-all.mjs`）是每个工作任务 verify 的后半段——通过的 attempt 必然已经跑过它。210 轮里 `holdout-failed` 只有 1 轮。
→ 可疑在哪：`src/gate/gate.js:238-243` 看起来在「防 holdout 不回归」，实际在跑一条已经在通过的测试；`src/runtime/round.js:1779-1790` 的 no-op 跳过 holdout 让这个门更空。
→ 影响流程：「promote 前有独立验证」这句话目前是假的。

**S2「91 条 lesson 换 +1.00 分」= 1 次空跑 − 1 次中断，乘 3。**
60 次测量：53 平局；4 个 +1 全部来自「规格本来就过」（acc2 r7a1、self3 r11a1 各含 1 与 3 条 lesson）；3 个 −1 全部来自一次被中断的尝试（self2 r7a2）被 3 条 lesson 分摊。p=1.0，CI [−0.07, +0.10]。
→ 可疑在哪：`src/knowledge/impact.js:49-72 pairedImpacts` 用 `scoreOf(control)` 当基线，但 control 是个**失败的 attempt**（provider 不可用/dispatcher disposed），不是「没看 lesson 的同一条件」；`round.js:1683` 只过滤 `abandoned`，而 acc2 r7a1 的 `abandoned` 是 null。
→ 影响流程：知识树的 score 排序（`src/knowledge/select.js:110`）直接由这些数字驱动。

**S3「录用率 49%」里 21% 是零改动空转。**
103 个 promoted 轮次中 22 轮含「verifierOk 且 diff.files=0」的候选（acc2、self2、self3、self10、self13、ui4、triangle、holdout-live、bal1、hedge、life2、self5、tri13…）。
→ 可疑在哪：`round.js:1743-1790 checks.noop` 把「验证过但没改」当作「任务已被满足」，`round.js:1828-1855` 让它在 `beatsIncumbent` 时 promote；`round.js:1849` 还**照样 `deriveLesson`**（注释说 Only verified work becomes knowledge，实现没有排除 noop）。于是「不用干活」的教训进了树：91 条里有 19 条的 evidence 指向零 diff 的 attempt，claim 原文就是「No change was needed. The worktree HEAD is 94cdc47 ... already contains both implementations」「nothing to do: this attempt exists only so a round completes and the holdout gate fires」「Nothing needed changing: the switch behavior is already implemented」。
→ 影响流程：轮结论统计把 no-op 计为「录用」；这 19 条又会在后续轮里被 `selectLessons` 当普通 fact 注入。

**S4 知识树里 72.5% 的条目从未被验证，而排序偏爱它们。**
91 条里 66 条 `useCount=0`；`src/knowledge/select.js:110 scoreLesson = confidence + gainSum/(useCount+1) − 0.5·harmCount − 0.15·(round−createdRound)/12`，其中 `confidence` 对所有条目固定 0.5（`src/knowledge/impact.js:137-159 deriveLesson` 写死）。代入算：
- 未用过、3 轮前创建：`0.5 − 0.0375 = 0.4625`
- 用过 1 次、增益 0、5 轮前创建：`0.5 + 0 − 0 − 0.0625 = 0.4375`
即**「从没被验证过的新 claim」分数高于「验证过且中性的 claim」**；而真正被验证过的旧条目大多已过 `ttlRounds=12` 被 `selectLessons` 过滤掉（`select.js:136-165`）。结果：注入的 top-3 系统性地偏向最没证据的条目。
→ 可疑在哪：`select.js:136-165` 的 top-3 选择。
→ 影响流程：「知识注入」= 优先注入验证最少的断言。

**S5 lead 口径与账本不符，三处。**
「22 个战役」：账本有 61 个 campaign 目录、48 个含 lesson、13 个含 impact。「22 轮中断」：账本是 interrupted 19（+holdout-failed 1）。「49%/41%」与账本一致（103/210=49.0%、87/210=41.4%）。
→ 可疑在哪：口径混用会让「91 条」听起来像 22 个战役的产出，实际来自 48 个战役、且 72% 的测量集中在一个战役（self3 21 条）。

**S6 「7 次改测试全通过」这个直觉是错的，但错的方式更有意思。**
7 次里 4 次被 `testsClean` 挡住（no-gain）、2 次是 gate 上线前的规格重写、5 次是**加固**（往 `standing` 加条目）。真正能叫「绕过」的一次也没有。
→ 可疑在哪：这不叫「我们安全」，叫「我们只见过一种作弊者」。守卫 `TEST_PATH_RE` 不覆盖 `scripts/`，而 agent 已经在改 `scripts/test-all.mjs` 了。

**S7 「验证器 = 一个 4 断言 spec」被当成「任务定义」。**
spec 由主 agent 写、由被优化的 agent 改（self4）、由运行时当唯一判据。三方同源。
→ 可疑在哪：`round.js:616-625` 用一段 prompt 文字当第一道防线；`gate.js:121-137` 没有 base-commit 反向检验。

---

## 8. 我否决的提案

1. **「把 holdout 改成每轮跑全量 test-all」**——否决：它就是现在的 plan，且 `round.js:2066` 的注释已经解释过为什么这会把 holdout 变成第二份可拟合 spec。要做的是「循环看不见的集」，不是「更大的集」。
2. **「换更强的模型/更多轮就能提升录用率」**——否决：问题不在能力，在判据。SWE-bench+ 的 12.47%→3.97% 说明同样的模型换个判据，成绩能掉 3 倍（<https://arxiv.org/abs/2410.06992>）。
3. **「给 lesson 加更多字段/更长文本」**——否决：91 条里 66 条没测过，加字段只会让未验证的断言更有说服力。要加的是「可测量性」，不是「可读性」。
4. **「用 LLM judge 代替部分 verifier」**——否决：judge 与 spec 同源（都出自同一个模型），等于把「自己判自己」再放大一层；ODR 的教训是 LLM 写的东西必须过 AST/沙箱/统计门（`core/policygen.py:148-171`），而不是当裁判。
5. **「把 minGain 从 0.05 调到 0.5」**——否决：0/1 信号上调阈值只会让所有轮变成 no-gain，不解决分辨率；先换指标（变异杀伤率/反向通过率），再谈阈值。
6. **「保留 no-op promote，因为它是『任务已被满足』的证据」**——否决（部分）：它可以算「任务已满足」，但**不能算知识、不能算录用、不能喂 lesson 的 delta**。修法很小：`round.js:1849` 的 `deriveLesson` 加一个 `!checks.noop`，`round.js:1683` 的 `pairedImpacts` 加 `&& diff.files > 0`。

---

## 9. 最小修复清单（按「每小时换回多少可信度」排序）

| # | 改动 | 落在哪 | 换回什么 | 成本 |
| --- | --- | --- | --- | --- |
| 1 | **base-commit 反向检验**：promote 前在基线 commit 上跑同一条 spec，必须失败 | `src/gate/gate.js:213` 之前 | 49 次零改动通过立刻归零；「规格本来就过」不再算证据 | 半天 |
| 2 | **no-op 不许产知识**：`deriveLesson` 加 `!checks.noop`；`pairedImpacts` 的 attempts 过滤加 `filesChanged.length > 0` | `src/runtime/round.js:1849`、`:1683` | 砍掉 19 条「不用干活」的教训与 22 轮空转录用 | 1 小时 |
| 3 | **保护面扩到脚本**：`TEST_PATH_RE` 加上 `scripts/`；或对 `tests/`+`scripts/` 的哈希只允许「新增条目」 | `src/runtime/round.js:2014` | 堵住 agent 已经在用的 `standing` 列表漏洞 | 2 小时 |
| 4 | **impact 记账改成 attempt 级**：一次尝试只发一条 impact，多 lesson 均摊或只记最相关一条 | `src/knowledge/impact.js:60-69` | 符号检验的 n 不再被 ×3 虚增 | 2 小时 |
| 5 | **holdout 移出工作区**：由运行时在另一 checkout 跑，agent 只看到分数 | `src/runtime/sampling.js`、`src/gate/gate.js:238` | 把恒真门变成真门 | 半天 |
| 6 | **变异探针**：每个 reference patch 注入 3 个变异，spec 至少要抓到一个，否则标 `weak` 且不许单独 promote | 新模块 + `gate.js` | 让「通过」重新携带信息 | 2 天 |
| 7 | **固定判据**：`minGain`/`holdoutSlack` 冻结进 RunSpec，禁止运行中 override | `src/loop/policy.js:40-70` | 让「放宽门槛」变成新开实验而不是偷偷改判据（GEAR 做法） | 1 小时 |

只做 1+2，本轮账本的可信度就会从「91 条换 1.0 分」变成「若干条真实测量 + 明确的空跑计数」；做 1+2+3+5，holdout 才第一次真的在防过拟合。

---

## 10. 参考文献

- Manheim & Garrabrant, *Categorizing Variants of Goodhart's Law*, 2018 — <https://arxiv.org/abs/1803.04585>
- DeepMind, *Specification gaming: the flip side of AI ingenuity* — <https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/>
- METR, *Recent Frontier Models Are Reward Hacking*, 2025-06-05 — <https://metr.org/blog/2025-06-05-recent-reward-hacking/>
- Aleithan et al., *SWE-Bench+: Enhanced Coding Benchmark for LLMs*, 2024 — <https://arxiv.org/abs/2410.06992>
- Just, Jalali, Ernst, *Are Mutants a Valid Substitute for Real Faults in Software Testing?*, FSE 2014 — <https://dl.acm.org/doi/10.1145/2635868.2635929>
- Jain et al., *LiveCodeBench: Holistic and Contamination Free Evaluation*, 2024 — <https://arxiv.org/abs/2403.07974>
- Hu, Lu, Clune, *Automated Design of Agentic Systems*, 2024 — <https://arxiv.org/abs/2408.08435>
- Zhang et al., *Darwin Gödel Machine*, 2025 — <https://arxiv.org/abs/2505.22954>
- DeepMind, *AlphaEvolve*, 2025 — <https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/>
- Romera-Paredes et al., *Mathematical discoveries from program search with LLMs* (FunSearch), Nature 2023 — <https://www.nature.com/articles/s41586-023-06924-6>
- Scale AI SEAL leaderboards（私有保留集做法）— <https://scale.com/leaderboard>
- 本仓库前序调研：`research/odr-study.md`（ODR 回放门/ALM）、`research/gear-study.md`（GEAR 门禁与 held-out 规则）
