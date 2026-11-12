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

## 1. 必修：把验证器变成差分预言机

| 项 | 内容 |
|---|---|
| 证据 | `exp-ver-003`：94 个单 spec 验证器在今天这棵树上 **89 个已经通过**；`exp-gate-002`：208 个闸门里 **192 个根本没测过 `baseFailed`**（真 12、假 1） |
| 机制 | `src/runtime/round.js:1977` `const earned = checks.baseFailed !== false` —— 缺测时按「不是 false」放行；而 `baseFailed` 只在 `hasPatch && verifierOk` 时才测（同文件 1862–1874）。所以 114 次晋升靠的是**缺席**，不是「基线失败」 |
| 改法 | 每轮在**同一棵树**上跑两次验证器：`base` 与 `candidate`，把「绿→绿」「红→绿」「绿→红」「红→红」四态写进 `gate.evaluated`，`earned` 只认「红→绿」 |
| 预期收益 | 直接消灭 14 次空补丁晋升（`exp-gate-002`）、把 22 个「shell 绿但闸门判不绿」变成可解释（`exp-ver-003` 附测）、并给分级评分提供第一个连续量 |
| 成本 | **3.07 s / 次**（`exp-ver-005`：105 个任务 ×3 次、零 flake、共 968 s）⇒ 相对 166–204 s 的轮时长 < 4% |
| 怎么验证 | ① 新测试：`tests/selfN/differential-earned.test.mjs` —— 用 `tests/self4/` 那套「临时 git repo + 真 runRound + 恒失败验证器」骨架，断言基线已绿时 `earned=false`；② 回放 211 个历史 `gate.evaluated`，断言只有那 4 个（3 个 graded 轮 + loom-life r1）翻转（`exp-graded-005` 已给出期望值） |

**前置条件（已满足，但要写成规则）**：差分预言机怕 flake。我们量了：**0/105 flake**
（`exp-ver-005`）。所以现在不需要 flake 过滤器，但需要一条规则——
**凡验证器命令离开「固定解释器、单仓库、无网络」这个信封，就必须在任务注册时补一条 3 次稳定性记录**
（9 s）。理由是 w8-differential 的 84% P2F flake 率来自依赖漂移，而不是差分本身。

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
# 图谱（1,409 节点 / 1,430 边 / 254 个缺口）
node research/kg/kg.mjs stats
node research/kg/kg.mjs search "differential oracle"
node research/kg/kg.mjs around ana-012 --depth 2
node research/kg/kg.mjs contradictions     # 每个矛盾是一个尚未做出的决定
node research/kg/kg.mjs gaps
node research/kg/kg.mjs pack > graph.pack  # 纯文本，可 diff

# 本文引用的测量
node research/exp/e42.mjs   # 94 个验证器、348 个断言
node research/exp/e43b.mjs  # shell 绿 vs 闸门绿
node research/exp/e44.mjs   # flake 率（105×3）
node research/exp/e45.mjs   # git 作为独立见证
node research/exp/e46.mjs   # 测试数 vs 晋升率趋势
node scripts/test-all.mjs   # 157/157
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
