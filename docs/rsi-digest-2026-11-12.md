# 通宵调研汇总（2026-11-12）— 从结论到改动

这一夜做了两件事：把公开证据收进本地图谱（8 轮、48 份 payload、1,409 个节点），
以及**用我们自己的账本量了 20 个数**（`research/exp/` 61 个脚本、458 次 attempt、70 个战役）。
下面每一条都是「结论 → 对应模块 → 改什么 → 预期收益 → 怎么验证」，按收益/成本排序。
图谱不用看，看这张表就够了。

---

## 0. 一句话

**这个循环不是缺功能，是缺一个测量：它记录「树是不是绿的」，从不记录「这个补丁是否让判决变了」。**
一棵本来就绿的树（94 个任务里 89 个如此）让这一位信息量变成零，而下游所有旋钮都建立在这一位上：
二值分数、minGain 从不生效、每任务一次性晋升、14 次空补丁晋升、brief 里没有基线分数、平局决定胜负。
修好这一位，其余大部分「策略」问题会自己消失；不修它，加任何旋钮都是在噪声上调节。

---

## 1. 必修（**已实现，但有一个真缺陷**）：差分预言机已存在，它只读退出码，因此对分级任务失明

`6bc00e1`（2026-11-11 02:35）已加 `src/runtime/baseline.js` + `src/runtime/round.js:1862-1874`，把基线判决按
`(task, base, command)` 缓存并写进 `checks.baseFailed`。我写这节时没查，差点又写一遍。真缺陷在别处：

`loom-graded` 的验证器故意**恒 exit 0**、只打印 `QUALITY=<n>`（这就是「分级任务」的定义）。于是基线「通过」，
`baseFailed` 恒 false，`const earned = checks.baseFailed !== false`（`round.js:1977`）**永远为假** ——
三轮里 `QUALITY` 从 0.500 爬到 1.000，全被丢弃，战役结论三次「no gain」（`exp-diff-003`）。
attempt 记录里工作是真的：`r1a2`/`r2a1`/`r3a2` 的 `stdoutTail` 都是 `QUALITY=1.000`、score 1。

**已修**：新增 `src/gate/earned.js`，两种读法二选一 —— 基线红→候选绿算挣到；基线已绿时只认**声明的指标**动了
≥ minGain；基线没测出保持放行。回放 4 次被 `baseFailed=false` 拒掉的晋升：`loom-graded` 三轮全部恢复，
`loom-ui8` round 3 仍然正确拒绝（无指标）—— 见 `exp-diff-004`。测试 `tests/self6/graded-earned.test.mjs` 8/8。

**端到端证据（2026-11-13 补）**：修完后新建 `loom-graded2` 在同一个 workspace 重跑，6 轮**全部晋升**，
第 1 轮的闸门回执是 `earnedReason:"metric-improved"`、`earnedMetric:{"name":"quality","from":0.5,"to":1}`；
批准 `cp-mwdqn0bx000001` 后补丁落成提交 `122283a`，`node check.mjs` 从 `QUALITY=0.500` 变成 `1.000`。
整个战役花费 $0.01。这是账本里**唯一**一次非二值任务的成功晋升 —— 之前 114 次全发生在验证器会改退出码的任务上，
而那正是旧闸门唯一读得到的信号（`exp-diff-006` / `ana-018`）。

**它顺便几乎带来一个回归**：第一次修缓存时 key 仍是 `(task, base, command)` 而 v1 条目没有 metrics，
于是任何跑过该战役的机器（也就是全部）都会暖缓存拿到无指标判决、把盲区原样复活。改为 `CACHE_VERSION = 2`
折进 key，代价是每任务一次重测（`f1b377c`，`exp-diff-007`）。规矩：**当缓存值的形状开始承载正确性，key 必须在同一个提交里变**。

---

## 1b. 必修：把验证器变成差分预言机（原始建议，保留作背景）

| 项 | 内容 |
|---|---|
| 证据 | `exp-ver-003`：94 个单 spec 验证器在今天这棵树上 **89 个已经通过**；`exp-gate-002`：208 个闸门里 **192 个根本没测过 `baseFailed`**（真 12、假 1） |
| 机制 | `src/runtime/round.js:1977` `const earned = checks.baseFailed !== false` —— 缺测时按「不是 false」放行；而 `baseFailed` 只在 `hasPatch && verifierOk` 时才测（同文件 1862–1874）。所以 114 次晋升靠的是**缺席**，不是「基线失败」 |
| 改法 | 每轮在**同一棵树**上跑两次验证器：`base` 与 `candidate`，把「绿→绿」「红→绿」「绿→红」「红→红」四态写进 `gate.evaluated`，`earned` 只认「红→绿」 |
| 状态 | **已实现**（`6bc00e1`），本节保留为「它为什么存在」的背景；分级任务的盲区见 §1 |
| 预期收益（**已在 71 次落到提交上的晋升上回放，数字是实测不是估计**） | **拦下 7 次**（`exp-diff-001`：64 次基线红→候选绿、7 次基线本来就绿 ⇒ 不earned）；基线跑一次 mean 1,000 ms / 中位 240 ms / p90 2,093 ms / max 9,757 ms，71 次共 71 s = 那 4.9 小时轮时长的 <1%。**不包含** 14 次空补丁晋升 —— 那 14 次 `hasPatch=false`、根本没有补丁可跑，预言机不会碰到它们（`exp-diff-002`，我原文把两件事混成一件） |
| 成本 | **3.07 s / 次**（`exp-ver-005`：105 个任务 ×3 次、零 flake、共 968 s）⇒ 相对 166–204 s 的轮时长 < 4% |
| 怎么验证（**回放已做，这一步只剩把规则写进代码**） | ① 新测试：`tests/selfN/differential-earned.test.mjs` —— 用 `tests/self4/` 那套「临时 git repo + 真 runRound + 恒失败验证器」骨架，断言基线已绿时 `earned=false`；② 回放 211 个历史 `gate.evaluated`，断言只有那 4 个（3 个 graded 轮 + loom-life r1）翻转（`exp-graded-005` 已给出期望值） |

**回放复现命令**：`node research/exp/e47.mjs`（重建每次晋升的父提交 tree、link `node_modules`、跑任务自己的 spec；
输出 `research/exp/e47.json`，含 71 行逐条判定）。**一个坑**：worktree 只有被跟踪的文件，不 link `node_modules`
会让每个 spec 都因为缺依赖失败，把 71 次全读成「earned」（`src/exec/worktree.js:132`）。

**前置条件（已满足，但要写成规则）**：差分预言机怕 flake。我们量了：**0/105 flake**
（`exp-ver-005`）。所以现在不需要 flake 过滤器，但需要一条规则——
**凡验证器命令离开「固定解释器、单仓库、无网络」这个信封，就必须在任务注册时补一条 3 次稳定性记录**
（9 s）。理由是 w8-differential 的 84% P2F flake 率来自依赖漂移，而不是差分本身。

---

## 1c. 已实现：判据作用域 —— 候选不能改写自己的判据

差分预言机问的是「这次改动有没有让判决变化」。它答不了另一个问题：**谁有权改变判决**。
规则原来写的是目录（`src/runtime/round.js:1801` 的 `TEST_PATH_RE = /^tests(?:[/\\]|$)/`），
而判据是文件。分级 fixture 的判据是仓库根目录的 `check.mjs`（打印 `QUALITY=<n>`、恒 exit 0），
它不在 `tests/` 下，任务文本只是「请求」agent 不要改它 —— 请求不是检查。

**实测（`e51.mjs`，真 `baseVerdict` + 真 `runVerifier` + 真 `earnedByDifferential`，同一 base `cd338ca`）**：

| 候选 | 改了什么 | QUALITY | `testsClean` | 结果 |
|---|---|---|---|---|
| honest | `lib.mjs` | 0.500 → 1.000 | true | promoted |
| forged | 不改 `lib.mjs`，把 `check.mjs` 改成直接打印 `QUALITY=1.000` | 0.500 → 1.000 | **true** | **promoted** |

也就是说：一个什么都没修好的候选，靠改写仪器拿到了和真修好一样的分数、通过了所有既有检查。
**启用分级通道的同时，也启用了伪造通道**（这与 `w4-graded-metric-regex-shadowing` 是同一件事的两面）。

**已修（`c9eebe7`）**：新增 `src/gate/oracle.js`，把判据从命令本身推出来，而不是让作者声明
（声明会被忘，推导不会被忘）：

- `oracleScripts(spec, {cwd})` —— 跳过解释器 token（按 basename 认 `node`/`python`/`bash`… 含 `.exe`）、
  让 `-e`/`-c`/`-m` 这类 flag 吞掉下一个 token、**只把真实存在且是文件的 token 当判据**。
  所以 inline `node -e` 返回空集 —— 那是诚实答案，不是漏洞。`e50.mjs` 量到 105 个任务里
  **93 个能推出判据文件、12 个是 inline**（`exp-oracle-002`）。
- `patchPaths()` 只解析 `diff --git` 头；读不出返回 `null`，调用方必须**失败关闭**。
- `oracleClean({patchFile, oraclePaths, filesChanged})` —— 无判据文件 ⇒ 不适用（`true`）；
  补丁读不出 ⇒ `false`；否则补丁路径与 `filesChanged` 都必须与判据集**不相交**。

**代价（要说清楚）**：这是对 shell 字符串的启发式，看不见「脚本再 spawn 脚本」「`sh -c` 包装」
「运行期拼出的路径」。同一个洞在 holdout 命令和验证器**读取**的文件（比如 `lib.mjs` —— 那是候选
本来就该改的）上仍然存在，那条边界是**任务的属性**，不是命令的属性（`ana-021`）。

**爆炸半径（`e52.mjs`，这是它能今天就上的理由）**：116 个落到文件上的晋升里，
新规则**会拒绝 0 个**（12 个 inline 不适用）⇒ 规则今天免费。测试
`tests/oracle-scope.test.mjs` 16/16、`tests/oracle-gate.test.mjs` 2/2（真 `runRound`：伪造判据被拒、
诚实修 `lib.mjs` 仍然晋升）。

**端到端**：新建 `loom-oracle`（workspace `C:/tmp/oracle-live`，3 轮）3 轮全部 `promoted`，
`checks.oracleFiles == ["check.mjs"]`、`oracleClean: true`；批准第 1 轮后提交 `774c990`，
`node check.mjs` 从 `QUALITY=0.500` 到 **`1.000`** ⇒ 规则没有挡住诚实工作（`exp-whitespace-001` 的同类问题见下）。

**顺手排掉的一个假线索**：批准之后工作区一度显示 ` M lib.mjs`（23 行改动），但 `git diff -w` 为空、
`git ls-files --eol` 是 `i/lf w/crlf` —— 即整文件行尾翻转。我本想为此加一条「空白改动不得晋升」的规则，
先量了两件事：①461 个补丁产物里 296 个非空、**0 个是空白改动**；②把这种候选真造出来过一遍活闸门
（`e56.mjs`）⇒ `{earned:false, reason:'metric-did-not-improve'}`。**通用不变量已经覆盖了这个类别**，
所以没有加规则（`exp-whitespace-001`、`ana-022`）。而那个 CRLF 的成因在四次受控实验里都没复现
（`applyPatch` 与 `commitWorkspace` 都保持 LF），记为 `exp-whitespace-002`：
成因未定，但它**挡住的是轮次、不是落盘**，所以不是工作项。

---

## 1d. 已实现：缺口层能收口了（此前只增不减）

矛盾有 `kg resolve`，缺口没有对手动词 —— 320 个 question 节点里 **6 个在自己的正文里就带着回答它的那个数**
（`exp-gap-002`，例：`gap-w7-030` 的正文写着「It would skip 108 of 211 rounds and 42.8% of round time」，
而 `n-post-promotion-spend` 量的正是这个）。`kg gaps` 只认 `kind='question' AND status='live'`，
没有出边、没有状态迁移 ⇒ **清单是单调的，长度是「跑了几波」的函数，不是无知的函数**。

**改法**（与 `kg resolve` 刻意同形）：新表 `gap_answer(gap_id PK, node_id, note, answered_at)`；
`kg answer <问题> <节点> --note "..."`（note 必填 —— 没有理由的收口和「问烦了」不可区分）、`kg unanswer <问题>`、
`kg gaps` 默认只列未答、`--answered` 显示 `[answered by X]`。pack/unpack 用 `? <gap> <node> | note` 块承载
（丢掉它会让一次往返把每个问题重新打开 —— 这正是 pack 在 resolution 上犯过的同一个错）；`merge` 迁移两端并删掉 `gap_id = node_id` 的自指行。

**已收 6 个**（每条 note 都点名「这个节点闭合了问题的哪一部分」）：`gap-w7-030`→`n-post-promotion-spend`、
`w2-human-gap-miss-rate-on-agent-diffs`→`w2-human-automation-bias-ecg`、`gap-w4-030`→`w4-review-judge-skill-is-pair-property`、
`gap-w5-022`→`w5-tokenbudget-half-spend-buys-nothing`、`cheapest-policy`→`ledger-slots`、`gap-w7-007`→`n-loom-wasted-rounds`。
清单 320 → **314 个未答 / 共 320 个问过**。全量往返验证：`nodes +1437 · edges +1477 · decisions +174 · answers +6`，`cmp` 字节相同。
`tests/kg-answer.test.mjs` **17/17**（note 必填、端点缺失/类型错被拒、默认列表收缩、`--answered` 显示成对、
两端节点与边都还在、SQL 可查、重复收口是替换不是追加、`unanswer` 可重开、pack 带 `|` 的 note、字节往返、缺失问题被跳过不是致命、merge 迁移）。

**为什么这件事的优先级不低**：目标第五步是「用缺口驱动下一轮调研」。在做这个动词之前我试了两个分类器判断
「哪些缺口今晚这台机器能关」，它们互相差一个数量级（关键词规则 13 ours / 84 literature / 220 unclassified；
指称规则 8 / 49 / 262），而手工标注 25 条样本显示 **218/320 是「本机答得出」的**（`exp-gap-001`，
两条规则分别只命中 5/25 与 2/25）。结论不是「换个更好的正则」，而是 `ana-023`：
**一个缺口清单只有在每条缺口写明「谁能关掉它」之后才是待办队列，而这个字段必须由提出问题的那个 agent 在提问时写下**
（它当时手里就有数）。派生不出来的东西就问，这是 `exp-oracle-002` 与 `exp-brief-001` 的同一条规矩。

---

## 1e. 顺带修掉的一个测量学问题：测量把自己写进了被测的语料

`e59` 判定「缺口是否出生即被回答」的依据是：某个两位小数百分比在**全体 live 节点**里的文档频率 ≤ 2
（是引用，不是词汇 —— `42.8%` df=2，而 `25.2%` df=7 是晋升率、证明不了任何事）。然后我把结果写成 `exp-gap-002`
存进同一个图谱，它的正文引用全部六个百分比 ⇒ 每个字符串 df 从 2 变 3 ⇒ 下一次运行 `answeredAtBirth` 从 6 掉到 0。
**两次测量都不错，是语料变了。** 已修：`EXCLUDE = /^(exp-gap-|ana-023$)/` 把「关于缺口的报告」排除出频次统计，
且**把排除项写在代码里而不是自动推断**（自动推断「提到阈值的节点要排除」是循环论证；另一个选项是每次测量前快照图谱，
那不是图谱该干的活）。记为 `exp-gap-004`。这是今晚第四个同形：**报告某个量时不写它算在哪个总体上**
（前三个：`exp-stop-002` 少了 futility 臂、`exp-diff-002` 的 14 与 7 是不相交的两个集合、`exp-dedup-001` 的 gap 清单）。

---

## 2. 必修：绿色验证器被丢掉的 22 个案例

| 项 | 内容 |
|---|---|
| 证据 | `exp-ver-003` 附测：257 个带 `verifier.finished` 的 attempt 里 **22 个 shell 判绿、闸门判不绿**，其中 **7 个在树里留了文件**；原因分布 `stop:error` 14、超时 6、`no-diagnostic` 2 |
| 机制 | `src/runtime/round.js:1460` `const gateOk = (ver.ok && (lean ? lean.ok : true) && outcomeKind === 'ok') || salvaged` —— 子会话先死，绿色验证器被丢弃。`salvaged` 只救「超时且树可验证」，不救「stop:error 但树可验证」 |
| 改法 | 把 `salvaged` 从「只在 deadline 超时」扩成「**任何非正常结束 + 树验证通过**」，并在事件里记 `salvagedFrom: <stopReason>`，让下游知道这是救回来的（现在只有布尔） |
| 预期收益 | 7 个已丢弃补丁里至少一部分本可晋升；更重要的是一类失败从「0 分」变成「有归因」——`exp-fail-003` 说失败分类学被我们自己的管道支配 |
| 成本 | 零额外运行（树已经验证过了） |
| 怎么验证 | 重跑 `e43b.mjs`，断言 `shellGreenGateNot` 从 22 降到 ≤2（剩下的应是真空 diff）；补一条 `tests/` 断言 `salvaged` 覆盖 `error` 分支 |

**注意**：这 7 个补丁**已经不可恢复**（`loom-life` 的 11 个是空 diff、`loom-tri6/r2a1` 无法 apply），
所以这条的价值在将来，不在回收。

---

## 3. 已修但需要守住：诊断丢失

`exp-fail-005`：80 个「无诊断」失败，**80 个在子会话档案里都有诊断**，全是同一类——
`Tool call "read": Unexpected non-whitespace character after JSON`，即**模型把两个 JSON 对象粘在一个 tool-call 参数里**。
一个 provider 侧格式缺陷被记成 80 个不同的任务失败。

这条**已经修了**：`src/dispatch/session.js:504 #sessionDiagnosis` + `diagnosisSource:'session-log'`，commit `1c03503`（2026-11-10 06:18）。
所以 80 条是历史数据。**要做的是守住**：加一条回归测试，构造 `turn/end` 带 `reason.error.message` 的子会话，
断言 attempt 的 `error` 等于那条消息、且 `diagnosisSource==='session-log'`；再对账一次
`SELECT count(*) FROM attempt WHERE error LIKE '%no diagnostic%' AND at > 1c03503 的时间` 必须为 0。

---

## 4. 便宜且立刻见效：brief 瘦身

| 项 | 内容 |
|---|---|
| 证据 | `exp-brief-001`：40 个真任务的真 brief 平均 **2,139 字符，其中 1,484（69.4%）逐字相同**；分解 Rules 402、Report **1,009**（占 47%） |
| 机制 | `src/dispatch/brief.js:133 buildWorkerBrief` —— 报告契约（7 个字段 + 围栏 json + 逐字段说明）是 worker 读到的文本的一半，而 452 次 attempt ≈ **950 KB 同样的模板** |
| 改法 | 两处：① 报告契约压成一行 schema（字段名 + 类型），描述挪进 system prompt 或按需展开；② **补上 brief 现在缺的三样东西**：当前分数、任务的 `QUALITY=` 值、声明的指标名字。这三样缺席是同一个 bug（基线缓存不存指标，`src/runtime/baseline.js` 只存 `{ok, exitCode}`） |
| 预期收益 | 每轮省 ~700 字符输入（全走 cache read，便宜的省不多）；**真正的收益是第 ②项**——worker 现在看不到自己在打多少分，于是无法判断「还差多少」 |
| 成本 | 改一个模板 + 在 baseline 缓存里多存两个字段 |
| 怎么验证 | 重跑 `e38.mjs`，断言 `meanChars` 从 2,139 降到 < 1,500、`delta0` 从 1,484 降到 < 800；加一条测试断言 brief 含 `QUALITY=` 与当前分数 |

**坑（写测试时会踩）**：`buildWorkerBrief` 必须传 `objective`，否则 `## Objective` 显示 `(missing)`；
任务在 `state.evalset.tasks`，**没有** `state.tasks`。

---

## 5. 便宜：第二候选的经济学喂错了数

`exp-cand-001`：`admitSecondCandidate` 的 `tailMs` 在 n=2 时**结构性为 0**
（`src/runtime/candidates.js:139` 对 tails 取均值，而 n=2 时 `sorted[1]` 就是最慢的那个），
于是 `EV = p(1-p)·roundMs > 0` 对所有 p 成立 ⇒ 永远说「对冲免费」。
直接喂真实数字（p=0.5, roundMs=82,845, tailMs=45,000）时它正确拒绝（ev=−24,288, `reason:'tail-exceeds-ev'`）
⇒ **错的是喂给它的测量，不是经济学**。

改法：`tailMs` 取「第二个 attempt 自己的墙钟」，而不是「第二个 attempt 与中位数的差」。
验证：单测喂 3 个真实轮形（62/78、70/88、69/85 s），断言 `admit===false`。

同一类病还有两处（`exp-cand-002`）：`minGain` 作用于二值分、`earned` 被布尔 `baseFailed` 卡死。
通用修法是**给每条策略一个廉价输入不变量**，让测试在输入退化时失败，而不是喂良构数字验算术。

---

## 6. 结构性天花板（知道就好，别在上面加旋钮）

- **`minGain` 一次都没生效**（`exp-gate-001`：0/208 在任何阈值下改判）。分数只有 0 和 1，边际只有 0 和 1，191/211 次决策根本没有 incumbent。
- **每个任务只有一次晋升机会**（`exp-gate-004`）：`bestPriorScore` 按任务比，任务到 1.0 后永远 no-gain（6 次 no-gain 里 5 次是天花板）。
- **L2 从没跑过**（`exp-chain-001`：69 次激活全是 v1，96 个提案只有 2 种形状）——「优化工作链本身」这一层是空的。别先修它，先修第 1 条。
- **任务选择是反的**（`exp-curric-001`）：被 7 个战役重复试的 11 个任务平均通过率 **0.244**，只试过一次的 89 个平均 **0.777**；`card-actions` 48 次/2 过，`head-dot` 40 次/4 过。`src/runtime/selector.js:48 pickTask` 偏好未解决任务 ⇒ 反复烧在 0% 的任务上（多半是 harness 死亡）。
- **停止规则省 41%，不是 69%**（`exp-stop-002`，修正我自己两个互相矛盾的数字）：总 230 轮，停止于首次晋升且保留「永不晋升的战役照样跑完预算」的 futility 臂 ⇒ 剩 133–136 轮（省 41%）；若假设能预知「这个战役永远不会晋升」⇒ 剩 70–71 轮（省 69%）。差额正是 **12 个从未晋升的战役烧掉的 66 轮**。诚实的数是 41%，因为没有预言机能在一轮之内分辨 0% 与赢家（`exp-slot-006`）。
- **知识树不跨战役**（`exp-transfer-001`）：100 条 lesson 在 53 个战役里，**0 条跨战役可见**，25 条曾被展示、75 条从没用过、13 条被 quarantine。
- **趋势是天花板不是进步**（`exp-trend-001`）：测试文件 14→193，而晋升率 0.343→0.132，每次 attempt 204 s→166 s。
- **成本记错 71 倍**：真实卡价下 **$0.074 / landed promotion**（`w5-tokenbudget`），账本记 $0.0004。不影响决策，但影响所有「值不值」的讨论。

---

## 7. 人这一侧（插件要交付的界面）

- **队列本身就是产品**（`w8-attention-queue-is-the-product`）：整个历史的晋升队列是 **6,684 行 / 187 文件 / 114 项**，中位 42 行、p90 146；按 20 行/分钟 = 334 分钟阅读，其中 **14 项是空补丁**（第 1 条修掉后消失）。
- **早报的五个字段**（`w8-attention-morning-brief`）：①相比上次看什么变了（69% 的 brief 是重复文本，早报不能重复）②每个失败的一行原因（从子会话日志取，第 3 条已保证可得）③只列需要决定的 ④按决策成本排序 ⑤显式说「哪些我替你决定了」。
- **不要连续通知，也不要静默**（`w8-attention-two-windows`）：07:00 分诊 + 19:00 深审；批量是唯一有机制支撑的杠杆（`w8-review-an-batch-economics`：恢复上下文 ~23 分钟/次）。
- **别问那些 85% 以上都会被通过的问题**（`w6-attn-loom-never-ask`）：97% 的动作级审批被通过、39% 的计划级被拒 —— 动作级审批没有信息量，计划级才有。
- **解释只在该人能独立证伪时有用**（`w8-attention-explanation-error-split`：+5%，其余 0）。所以早报应该解释 **diff**，不是解释意图。

---

## 8. 我没有做的事，以及为什么

- **没有改代码**。这一夜的产出是测量与图谱，不是补丁；上面每一条都写了「怎么验证」，但都必须先写一条**会失败的规格**再让循环自己改（这是这个项目的既定工作方式，也是它 114 次晋升的全部来源）。
- **没有跑分级评分**（第 1 条的下一步）。`research/exp/graded-live/` 已有一个端到端可跑的 fixture：`check.mjs` 只打印 `QUALITY=0.500` 且永远 exit 0，四个诚实状态分别得 0.65 / 0.825 / 1.000 / 0.825 且两次转移被正确接受/拒绝。它证明机器可用，缺的是**一个真实任务声明指标**。
- **没有修 L2/L3**。证据（`exp-chain-001`、`ana-002`）说这两层在 L0 还有 89/94 天花板时加旋钮是浪费。
- **没有跨仓库迁移实验**。文献里没有一个把 lesson 搬到另一个仓库的测量（`w5-transfer`），我们也只有 0/100 的跨战役复用（`exp-transfer-001`）—— 这是最大的空白，但不是今晚能做的。

---

## 9. 复跑方式

```bash
# 图谱（1,437 节点 / 1,477 边 / 320 个问题，其中 6 个已收口）
node research/kg/kg.mjs stats
node research/kg/kg.mjs search "differential oracle"
node research/kg/kg.mjs around ana-012 --depth 2
node research/kg/kg.mjs contradictions     # 174 对，全部已裁定
node research/kg/kg.mjs gaps               # 314 个未答 / 共 320 个问过
node research/kg/kg.mjs gaps --answered    # 已收口的 6 个 + 是哪个节点收的
node research/kg/kg.mjs pack > graph.pack  # 纯文本，可 diff；含 ! 裁定与 ? 收口

# 本文引用的测量
node research/exp/e42.mjs   # 94 个验证器、348 个断言
node research/exp/e43b.mjs  # shell 绿 vs 闸门绿
node research/exp/e44.mjs   # flake 率（105×3）
node research/exp/e45.mjs   # git 作为独立见证
node research/exp/e46.mjs   # 测试数 vs 晋升率趋势
node research/exp/e47.mjs   # 71 次晋升的差分预言机回放
node research/exp/e57.mjs   # 重复节点合并会塌掉什么
node research/exp/e59.mjs   # 出生即被回答的缺口
node research/exp/e61.mjs   # 三种缺口分类器 vs 手工标注
node scripts/test-all.mjs   # 165/165
```

---

## 10. 附录：两个我自己的数字打架，查清后是个「没写分母」的病

`a-stop-at-first-promotion` 说停在首次晋升要 133 轮，`exp-stop-001` 说 71 轮。重数 70 个战役的原始事件后：
**两个都对**，只是回答了不同问题 —— 前者保留 futility 臂（12 个从未晋升的战役照样跑完，66 轮），后者假设能预知「永不会晋升」。
记录为 `exp-stop-002`（number）与 `ana-016`（analysis）。**今晚第三次同一种病**：把某个群体上算出的量，报成没有群体的量
（前两次是 `exp-cand-001` 的 `tailMs` 在 n=2 时结构性为 0、`exp-gate-002` 的 `baseFailed` 在 192/208 次里缺席却被读成「不是 false」）。
机械检查法：**任何反事实都要同时打印「该规则仍然要花的量」，并断言它非零**；为零就说明这条规则是在它帮忙的那批战役上评估的。
这条不变量该写进报告函数，而不是留在分析者的脑子里 —— 因为规则就是分析者写的。

---

## 11. 附录：交付图谱时发现并修掉的一个真 bug

给这个通宵收尾时，我按「图谱能不能离开这台机器」做了一次真实检验 —— 结果 `kg pack/unpack` **静默丢了数据**，三种方式同时存在：

1. **topic 不是字段**，`unpack` 回落到 `--topic` 参数（默认 null）⇒ 45 个节点回来时没有 topic（41 个 `ver` 加 `ana-003`、`ana-013` 和 3 个 `exp-*`）。因为 `kg pack --topic X` 按 topic 选，这些节点从此对按主题导出不可见，但对 `search` 仍可见。
2. **空行终止记录**，而正文是带段落分隔的散文 ⇒ 6 个节点在第一个空行处被截断（`ana-003` 378/1348 字符、`exp-coverage-002` 456/1366、`exp-mut-001` 483/1237、`exp-guard-001` 450/1195、`exp-guard-002` 571/1245）。
3. **头部用 `|` 分隔且不转义**，正文里 `mean |GAE|` 这种标题、或引用 `a || b` 的 source 会被切成字段 ⇒ 5 行错乱，`n-loom-exit0-passes` 的 source 在第一个 `||` 处被截断。

修法：topic 变成可转义字段、空行用单反斜杠哨兵、`\|` 转义且只按未转义的管道切分。
修完全量验证：**1409 节点 / 1430 边 pack → unpack 到空库，零字段哈希差异**，且 `pack → unpack → pack` 字节相同。

**已加回归**：`tests/kg-roundtrip.test.mjs`（41 条断言，fixture 专门带这三种形状：无 topic 节点、带空行的正文、含 `|` 的标题与含 `||` 的 source；并断言幂等），已进 `scripts/test-all.mjs` ⇒ **158/158**。
这个 bug 已作为 `exp-portability-001`（failure）与 `ana-015`（analysis，规则：**任何跨进程/跨机器的表示都必须有往返断言，抽查不算**）记进图谱。
数据已按原始 payload 全部恢复（`research/kg/_inbox/_restore_unpack.json`）。
