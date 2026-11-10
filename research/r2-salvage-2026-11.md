# R2：已产出的活如何不丢（salvage / 断点续跑）

调研日期 2026-11-11。范围：DSH loom 插件（`C:\Projects\RSI`）的 attempt 生命周期。
每条结论都标了三件事：**证据（URL）**、**影响哪一行 / 哪个配置项**、**怎么证伪**。
证据强度标记：✅ 我抓取过原文；○ 仅按 URL 引用，未逐字核对数字。

---

## §0 结论先行

一句话：**我们已经 salvage 了，但没有把 salvage 的钥匙落盘。**

`src/runtime/round.js:1359` 已经有这条：

```js
const salvaged = stoppedByDeadline && outcomeKind === 'timeout' && ver.ok === true && (lean ? lean.ok : true)
```

也就是说「超时但补丁过验证」的 attempt 已经能被晋升，注释（L1352-1358）还写着两轮为此浪费了 1,203 秒。
真正的洞有两个，都在同一处：**attempt 记录里没有 `base` 提交**（L1396-1436 的 record 无此字段，而 L1160 明明算出来了、L1311 也传给 `verifyOnce` 了），以及 **`abandoned` 的 attempt 被整体跳过验证**（L1303-1304）。

所以最该立刻做的一条是：**把 `base` 写进 attempt 记录**（一个字段，一行代码），其余 salvage 都建立在它上面。理由：没有 base，补丁就无法回到它当初那棵树重验（`src/runtime/verifier-reuse.js:102` 的缓存键本来就是 `(patch, cmd, base)` 三元组，而 `base` 只存在于内存里）。

---

## §1 我们的现状：到底丢了多少（修正 lead 给的 72）

扫描 61 个 campaign、420 条 attempt 记录、0 条解析失败（`~/.dsh/loom/campaigns/*/events.jsonl`）：

| 事实 | 数字 | 说明 |
|---|---|---|
| 有补丁的 attempt | **200** | `patchBytes > 0`，合计 **1,406,964 字节** |
| 有补丁但**没有** `verifier.finished` 事件 | 90 | 看起来是 45% 丢了 |
| 其中旧版插件（该事件尚不存在） | **61** | `stopReason:'completed'` 且记录里有 `verifierOk`（53 true / 8 false）→ **已被裁决，不算丢** |
| **真正未裁决** | **29** | 全部 `stopReason:'aborted'`；`abandoned` = true×25 / interrupted×4；`verifierOk` 全 false |
| 历史上 `salvaged:true` 的 attempt | **2** | 功能存在，但只被用过两次 |
| attempt 记录里带 `base` 的 | **0** | 420 条全无 |
| worktree 残留目录 | **0** | 清理彻底 → 工作树不是可用的 salvage 仓库 |

→ 影响：`src/runtime/round.js:1396-1436`（record 字段）、`src/exec/worktree.js:321`（清理）。
→ 证伪：重跑同一扫描脚本，若 `stopReason:'aborted'` 且无 `verifier.finished` 的条数 ≠ 29，则本节错。

**补丁尺寸分布（90 个里）**：≥10 KB 9 个、1–10 KB 79 个、<1 KB 2 个。最大的 19,551 B 来自 `loom-acc6` r7a1。
→ 影响：salvage 必须设字节上限，否则一个 19 KB 补丁 + 一个 10 分钟验证器就是一次昂贵的赌博。

**`abandoned` 的原因分布**：solved-by-sibling 28、interrupted 20、host-restart 1。
→ 影响：`src/runtime/round.js:1282-1286`（abandoned 判定）、L1442-1448（兄弟拿满分后主动 abort）。

**loom-acc6 全量（12 个 600 秒 attempt）**：5 个有补丁（1,536 / 318 / 5,646 / 19,551 / 147 B，合计 27,198 B），全部 `timedOut:true`、`abandoned:null`、`verifierOk:false`。
注意 `abandoned:null` —— 它们不是「被兄弟杀掉」，是纯粹的 deadline 超时，正好落在 `salvaged` 分支的判定域里，却仍然没拿到裁决。这说明 `salvaged` 只在**同一轮内**生效：修复（fix）被放弃了，补丁就再也不会被看一眼。
→ 影响：缺一个「轮后 salvage 队列」。

---

## §2 Q1：业界的检查点粒度是什么，部分产物怎么处理

| 系统 | 检查点粒度 | 「跑了一半」怎么办 | 对我们的意义 |
|---|---|---|---|
| **Temporal** | Activity 内靠 **Heartbeat** 携带 payload；`Schedule-To-Start` / `Start-To-Close` / `Schedule-To-Close` / `Heartbeat` 四种超时 ✅ | **不续跑**：超时即整段 activity 重试；heartbeat payload 留给**下一次尝试**用。原文：「A Heartbeat can include an application layer payload that can be used to save Activity Execution progress. If an Activity Task Execution times out due to a missed Heartbeat, the next Activity Task can access and continue with that payload.」「The caller cannot read this progress information while the Activity is still executing」 | 我们要的不是「续跑子会话」，而是「把 payload（补丁）交给下一个消费者（验证器）」 |
| **Ray** | 无检查点；task 要么完成要么重跑 ✅ | worker 死 → 重跑，`max_retries` 默认 3；**应用层异常默认不重试** | 重跑是默认答案，所以「已经产出的字节」必须自己落盘，框架不会替你留 |
| **Airflow** | task 边界 | **「You should treat tasks in Airflow equivalent to transactions in a database. This implies that you should never produce incomplete results from your tasks.」** ✅ | 反方证据：边界内不要产出半成品。所以半成品只能进**隔离区**，不能进工作区 |
| **Dagster** | asset materialization 边界 | 用 `code_version` + `data_version` 做 memoization，「the last-computed asset value is always cached」 ✅ | 裁决是 `(code_version, data_version)` 的纯函数 —— 正是我们要的形状 |
| **git worktree** | 无（工作树即状态） | **`remove` 拒绝删除 unclean worktree，除非 `--force`**：「Only clean worktrees (no untracked files and no modification in tracked files) can be removed. Unclean worktrees or ones with submodules can be removed with `--force`.」 ✅ | **我们正是那个 `--force`**：`src/exec/worktree.js:324` 用 `--force` 把 git 本来会拒绝删除的脏树删掉 |
| **LangGraph** | super-step 边界（checkpointer）○ | 从最近 checkpoint 恢复，重放未完成节点 | 粒度是「一步」，不是「一次 LLM 调用」；我们不缺这个粒度，缺的是缺省落盘 |

共同结构：**没有一家做「进程内原地续跑」**。他们做的是「边界处原子提交 + 失败重跑 + 未提交的精确定位丢弃」。我们已经具备「重跑」；缺的是「把提交物留在边界外而不删」。

- 影响：`src/exec/worktree.js:321-334`（`--force` 语义）、`src/runtime/round.js:2005-2011`（finally 无条件删）。
- 证伪：把 `removeWorktree` 的 `--force` 去掉，跑一轮带修改的 attempt，断言 `git worktree remove` 返回非零 —— 若能删成功，说明 git 行为与文档不符，本节错。

---

## §3 Q2：先存后裁 vs 裁后才存，代价各是什么

把两者写成期望值，符号：`p` = 补丁能过验证的概率，`V` = 一次裁决带来的价值（一个分数、一条 lesson、一次可能的晋升），`C_v` = 一次验证的成本，`C_lost` = 丢弃的代价（整段 attempt 的墙钟 + token，实测 400–815 s / 1,874–2,705 tokens）。

- **裁后才存**：成本 `C_v`，收益 `p·V`，期望 `p·V − C_v`。丢掉的那部分（不裁 = 不存）成本 `C_lost`。
- **先存后裁**：成本 `C_v + 存储（≈0，写 19 KB 到 `artifacts/`）`，收益 `p·V`，且失败时仍保住证据（可留给后续轮 / 跨 campaign 复用）。

关键是不对称：**`C_v` 是确定性的、无模型 token 的、可在关键路径之外执行的；`C_lost` 是已经付掉的墙钟和 token。** 我们实测验证器 93–144 s/次，而 attempt 400–815 s，比例约 1:5；且 `verifyOnce` 的缓存键已经是 `(patch, cmd, base)`，同样的字节第二次裁决是 0 秒（`src/runtime/verifier-reuse.js:102`）。

反方（必须认真对待）：Airflow 的「任务=事务，不要产出半成品」不是洁癖，是防止消费者读到半成品。对我们成立吗？**不成立**，因为我们的消费者是确定性验证器，而不是人/下游 job：验证器对半成品的回答就是「不通过」，这个答案本身就是正确且有价值的证据 —— 它把「这个方向走不通」变成一条可复用的 lesson，而不是把半成品混进主干。
→ 前提是：**先存的必须是不可变的证据（`artifacts/*.patch` 字节），不是工作区状态**。

- 影响：`src/runtime/round.js:1291-1295`（makePatch 已在验证前执行，位置正确）、`src/exec/patch.js:20`。
- 证伪：人为把 makePatch 移到 `abandoned` 判定之后，跑 `loom-acc6` 类场景，断言 `patchBytes>0` 的 attempt 数从 5 掉到 0。若不掉，说明补丁不是这张表在写，本节错。

---

## §4 Q3：超时但补丁完整的 attempt，能不能直接送验证器

**能，而且代价极低**，因为验证是确定性的、不需要模型：

`applyPatch`（`src/exec/patch.js:42`）先 `git apply --reverse --check`（L56）再 `git apply --check`（L63）再 `git apply`（L68）。也就是说「补丁完整到可以验」有一个机械判据：**`git apply --check` 是否通过**，而不是「模型有没有说完」。

「完整到可以验」的可执行定义（建议实现为 `salvageable()`，纯函数）：

1. `patchBytes > 0` 且文件可读（否则无证据可复现）；
2. `record.base` 存在且是 40/64 位 hex（否则不知道贴到哪棵树；当前 420/420 都缺，见 §1）；
3. 在新 `git worktree add --detach <tmp> <base>` 里 `git apply --check` 通过；
4. `patchTouchesTests`（`src/runtime/round.js:2032`，只解析 `diff --git` 段头）为 false —— 改测试的不救；
5. `patchBytes <= salvageMaxBytes`（建议 262,144，见 §1 分布：全部历史补丁都远小于此）；
6. 不在 `salvageDenylist` 路径内（如 `.github/`、`pnpm-lock.yaml`、二进制）。

注意「半截补丁」在我们这里几乎不可能：补丁是由 `makePatch` 从 worktree 的**当前文件状态** `git diff HEAD` 生成的，不是从模型的流式输出里截的。所以它要么是「一个自洽但可能语义未完成的树」，要么是空 —— 前者正是验证器能判断的，后者直接跳过。这与 Temporal 的 heartbeat payload 语义一致：payload 是「下一次尝试的起点」，不是「必须完整」。
→ 影响：`src/exec/patch.js:42-68`、`src/runtime/round.js:2020-2034`、`src/core/config.js`（新增 `salvage.maxBytes`）。
- 证伪：构造一个 `git apply --check` 失败的补丁文件，断言 `salvageable()` 返回 `{ok:false, reason:'patch-does-not-apply'}`。若返回 ok，本节错。

---

## §5 Q4：不可变 artifact + 纯函数裁决，有没有实证

有，而且是这三条线各自独立地收敛到同一个形状：

1. **Dagster**：`code_version` + `data_version` → 「Dagster can predict whether a materialization will change the underlying value」，并跳过重复物化 ✅。裁决 = `f(code, data)`。
2. **Verifier 缓存本身就是这个设计**：`src/runtime/verifier-reuse.js:5-8` 注释写着「Verifier results are keyed by what the verifier actually measures against: the candidate's patch bytes and the command that judged them」，L102 `sha1([sha1(bytes), keySuffix, base])`。**我们已经有纯函数了**，缺的是让它的事后重算成为可能（base 落盘）。
3. **内容寻址构建**：Bazel 的 action cache 按 action 的输入摘要寻址 ○；Nix 的 `/nix/store` 路径由构建输入的哈希决定 ○。两者都说明「把 (输入摘要 → 输出) 落盘」能带来跨运行复用。
4. **先写日志再改数据**：PostgreSQL 文档明确「changes to data files must be written only after those changes have been logged」○ —— 这是「证据先落盘」的另一种表述；我们的对应物是 `events.jsonl` append-only，已经对了。

结论：不需要新机制，只需要把**三元组里缺的那一项（base）落盘**，并允许在轮末对孤儿补丁调用既有的 `verifyOnce`。
→ 影响：`src/runtime/round.js:1311`（已有 base 变量）、L1396-1436（record）。
- 证伪：写一个测试，用 `artifacts/r1a1.patch` + 从记录读出的 base 重建 worktree 并跑 `verifyOnce`，断言得到的 `verdict.exitCode` 与该 attempt 若未超时会得到的 exitCode 一致（用同一 base 的对照跑）。若无法重建（因为没 base），今天就会失败。

---

## §6 Q5：什么情况下**不该** salvage

五条否决条件，每条都对应一类真实数据：

1. **改到了 `tests/`** —— 已有 `patchTouchesTests`（L2032）拒绝晋升；salvage 必须复用同一判据，否则就是绕过 gate。
2. **`abandoned === 'solved-by-sibling'` 且该兄弟 `score === 1`** —— 本轮已有满分解，再验一份只是制造二义性。历史 28 个这样的 attempt，全部跳过是对的。
3. **`failureKind` ∈ {`context`, `exhausted`, `died`} 但 `patchBytes === 0`** —— 没有证据可救。
4. **补丁字节数超上限 / 触碰 denylist 路径** —— 19 KB 的补丁（acc6 r7a1）值得一验，但 1 MB 的不值得。
5. **本轮预算已耗尽 / 已进入 `budget` 终态** —— `round.finished{status:'budget'}` 之后不能再花验证器时间（`src/runtime/round.js:438-456`）。

- 影响：`src/runtime/round.js:1282-1286`、L1442-1448、L2032。
- 证伪：给一个 `patchTouchesTests() === true` 的补丁跑 salvage 判定，断言返回 `{ok:false, reason:'touches-tests'}`。

---

## §7 风险章：salvage 会不会让循环用半成品污染工作区

这是本节最该被认真对待的问题。逐条拆：

| 风险 | 真实机制 | 是否成立 | 缓解 |
|---|---|---|---|
| **工作区被污染** | 补丁直接 `applyPatch` 到 `state.workspace` | **不成立，如果按 §8 实现**：salvage 只在一次性 `git worktree add --detach <base>` 里 apply + 验，验完删 | S1/S2 明确禁止 apply 到 workspace；晋升仍走 L1828 的 `basePass` + holdout |
| **主干被半成品合并** | salvage 结论直接触发 `autopilot.applied` | 成立（若不设限） | salvage 的 verdict 只是**证据**：可进入排名与 lesson，但**只有一轮内没有其他候选时才允许晋升**；且仍需 `testsClean` + holdout |
| **知识被污染** | 从超时 attempt 里 `deriveLesson`，学出「难就放弃」 | 成立 | lesson 打 `source:'salvage'` 标签，先进 quarantine（`config.knowledge.quarantineHarm` 已有），命中 2 次才转 treated |
| **墙钟被拖长** | 关键路径上多一次 100–145 s 验证 | 成立 | 轮末队列（S4），不进 `round.durationMs` |
| **磁盘增长** | 补丁永远不删 | 成立但很小 | 40 万字节量级（历史全部 1.4 MB）；按 campaign 保留 N 轮即可 |
| **假证据** | 补丁在别的 base 上被复用了别人的 verdict | **已被防住**：`verifier-reuse.js:102` 把 base 放进键 | 保持这个键，不要为了 salvage 把它去掉 |

一句话：**风险不在「存」，在「存完就晋升」**。把 salvage 定义为「产生一条带出处（base）的证据」，风险就收敛为磁盘与验证器时间。
→ 影响：`src/runtime/round.js:1828-1830`（晋升门）、`src/core/config.js`（`knowledge.quarantineHarm`）。
- 证伪：构造一轮「兄弟已满分 + 迟到补丁也过验证」的场景，断言该轮 `promotedAttemptId` 仍是兄弟、且 salvage 只产生 `attempt.salvagedFrom:'abandoned'` 与一条 `lesson.added{source:'salvage'}`。若 salvage 抢走了晋升，本节错。

---

## §8 提案（按 收益 ÷ 成本 排序）

每条固定字段：`id | 改什么 | 证据 | 影响的腿 | 期望效果 | 机械验证 | 风险`。

### S1 —— `base` 落盘（一行，一切的前提）
- **改什么**：`src/runtime/round.js:1396-1436` 的 attempt record 增加 `base`（值取自 L1160 的 `const base = await headCommit(workspace)`）；`attempt.finished` 事件同步带出。
- **证据**：`verifier-reuse.js:102` 的键已是 `(patch, cmd, base)`，而 base 只活在内存里；Dagster 的 `data_version` 同理必须落盘才能 memoize ✅ https://docs.dagster.io/guides/dagster/asset-versioning-and-caching
- **影响的腿**：成本（决定能否复用裁决）、质量（让孤儿补丁可重验）
- **期望效果**：让 100% 的历史补丁从「不可重验」变成「可重验」；为 S2/S3 提供输入
- **机械验证**：`tests/tri4/salvage-base.test.mjs` —— fakeRuntime 跑一轮，断言 `attempt.finished.data.base` 是 40 位十六进制且等于 `git rev-parse HEAD`；**今天会失败**（字段不存在）
- **风险**：极低；唯一注意是 `base` 可能为 null（仓库为空），此时写 `null` 而非 `'HEAD'`

### S2 —— 轮末 salvage 队列（不占关键路径）
- **改什么**：新增 `src/runtime/salvage.js`（`planSalvage(round)` + `drainSalvage(view, config)`），由 `Runtime.tickCampaign` 在 `runRound` 之后以并发 1 排空；对每个候选 `salvageable()` → `verifyOnce({patchFile, keySuffix, base, cwd})` → 写 `salvage.verdict` 事件 + `attempt.salvagedFrom`
- **证据**：Temporal 的 heartbeat payload 就是「交给下一次尝试」而不是续跑 ✅ https://docs.temporal.io/encyclopedia/detecting-activity-failures ；Ray 也是整段重跑 ✅ https://docs.ray.io/en/latest/ray-core/fault_tolerance/tasks.html
- **影响的腿**：质量（29 个历史未裁决 + 未来每轮 0–2 个）
- **期望效果**：`loom-acc6` 的 5 个补丁（27,198 B）全部拿到裁决；每轮墙钟 +0（队列在轮后）
- **机械验证**：`tests/tri4/salvage-queue.test.mjs` —— 一轮里两个候选都超时且都有补丁，断言 `round.finished` 的 `durationMs` 不含验证秒数，且随后 `tick()` 再跑一次时产生 `salvage.verdict` 事件
- **风险**：并发问题（队列与下一轮抢 `.git/worktrees`）；用独立 tmp 目录 + `pruneStaleWorktrees` 缓解

### S3 —— `abandoned` 分支：有补丁就别跳过验证
- **改什么**：`src/runtime/round.js:1303-1304` 的 `abandoned ? {skipped:true, ...}` 改为：若有补丁且 base 已知 → 进 S2 队列（标 `salvagedFrom:'abandoned'`），否则保持 skipped
- **证据**：Airflow「task = transaction」说的是**不要产出半成品**，不是「不要把半成品判为失败」✅ https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html ；裁决对半成品给出的「不通过」本身就是有效证据
- **影响的腿**：质量（25 个 `abandoned:true` 从未被裁决）
- **期望效果**：把「被杀 = 无信息」变成「被杀 = 至少一条负证据」
- **机械验证**：`tests/tri4/salvage-abandoned.test.mjs` —— 构造 solved-by-sibling 场景，断言被 abort 的 attempt 在队列里出现且 `verifier.finished`（或 `salvage.verdict`）最终存在；**今天它会因 `skipped:true` 失败**
- **风险**：给「已被满分兄弟覆盖」的补丁白花验证时间 → 用 §6 第 2 条否决

### S4 —— 不再 `--force` 盲删脏树
- **改什么**：`src/exec/worktree.js:324` `git worktree remove --force` → 先判断 `hasChanges()`（L442）；脏树时要求调用方传入「补丁已落盘」的凭据，否则以 `{ok:false, reason:'dirty-without-patch'}` 返回并保留目录
- **证据**：git 文档明说 unclean worktree **只有 `--force` 才删得掉** ✅ https://git-scm.com/docs/git-worktree
- **影响的腿**：质量（防止未来的新路径再丢证据）；成本（少量磁盘）
- **期望效果**：任何「有产出但没记录」的路径当场报错，而不是静默销毁
- **机械验证**：`tests/tri4/worktree-dirty.test.mjs` —— 在 worktree 里改一个 tracked 文件，调 `removeWorktree` 不传凭据，断言 `ok:false` 且目录仍在；**今天会返回 ok:true**
- **风险**：可能让 `finally`（L2005-2011）在异常路径抛错 → 必须保持 best-effort，只记录不抛出

### S5 —— `salvageable()` 纯函数 + 上限
- **改什么**：新增 `src/runtime/salvage.js` 的 `salvageable({patchBytes, patchFile, base, task, maxBytes})`，实现 §4 的 6 条；配置项 `salvage {maxBytes: 262144, enabled: true}` 写进 `src/core/config.js` DEFAULT_CONFIG
- **证据**：`git apply --check` 是机械判据 ✅ https://git-scm.com/docs/git-apply ；Airflow 的「不产出半成品」被替换成「半成品也必须被判定」
- **影响的腿**：成本（拒绝 19 KB 以上的赌博）、质量（只救能救的）
- **期望效果**：salvage 命中率可预测；不产生「贴不上的补丁 → 验证器崩溃」
- **机械验证**：`tests/tri4/salvageable.test.mjs` —— 五个用例（空补丁 / 无 base / 贴不上 / 触碰 tests / 超上限）各断言一个 `reason`
- **风险**：`git apply --check` 对二进制/重命名补丁的行为差异；先只允许文本补丁

### S6 —— 跨轮 / 跨 campaign 的补丁去重
- **改什么**：`verifyOnce` 已按 `(patch, cmd, base)` 去重（`verifier-reuse.js:102`）；只需在 S2 队列里把 `keySuffix` 与 base 传对，即自动获得
- **证据**：Dagster memoization ✅（同 §5）；Bazel action cache 按输入摘要命中 ○ https://bazel.build/remote/caching
- **影响的腿**：成本（同字节不重复裁决）
- **期望效果**：历史 200 个补丁中大量重复（如 acc6 的 147 B 与 318 B 可能同源）→ 0 秒复用
- **机械验证**：`tests/tri4/salvage-dedupe.test.mjs` —— 两个 attempt 产出相同字节的补丁，断言第二次 `verifyOnce` 的 `reused === true` 且 `durationMs === 0`
- **风险**：低；注意空补丁不做去重（L100 已有这条保护）

---

## §9 我否决的提案

1. **「续跑」被中断的子会话（resume the same session from where it died）**
   否决理由：Temporal ✅ 与 Ray ✅ 都是整段重跑，没有一家做进程内原地续跑；子会话没有幂等的副作用日志，重放 transcript 的 token 成本 ≥ 重新跑一次（我们的 attempt 只有 1,874–2,705 tokens，重跑很便宜）。反例：真做了，会得到一个「半新半旧」的上下文，比重新跑更难解释。

2. **常开 `keepWorktrees`，把 worktree 留到下一轮当 salvage 源**
   否决理由：git 自己警告 multiple checkout 仍是 experimental ✅，而且我们的 worktree 在 `finally`（L2005-2011）删得一个不剩（实测残留 = 0）——这说明磁盘上从来没有可复用的树。补丁（1.4 MB 全历史）比工作树（每棵几十 MB）便宜两个数量级。反例：acc6 十二个 attempt 若都留树，磁盘会是 GB 级。

3. **让 salvage 的结论直接进 autopilot 合并**
   否决理由：绕过 `gate.evaluated`（L1828-1830）与 holdout。salvage 的价值是「多一条证据」，不是「换一条捷径」。反例：一个在 600 秒末尾被砍断的重构，恰好让 spec 变绿但把另一个未覆盖的路径改坏 —— 只有 holdout 才拦得住。

（第四条我没写进「不该做」，因为它是真实空白而非陷阱：**轮内 attempt 之间共享已产出的补丁**（兄弟 A 的补丁作为 B 的起点）。它需要「补丁可组合」的证据，而我们没有。留作后续。）

---

## §10 影响索引（改哪里 / 看哪里）

| 文件:行 | 现状 | 与本文关系 |
|---|---|---|
| `src/runtime/round.js:1359-1360` | `salvaged` 已有 | 我们的机制比 lead 的模型先进；不要重写 |
| `src/runtime/round.js:1303-1304` | `abandoned` 一律 skipped | S3 的改动点 |
| `src/runtime/round.js:1160` / `:1294` / `:1311` | base 已算出、已用于 makePatch 与 verifyOnce | S1 只差把它写进 record |
| `src/runtime/round.js:1396-1436` | record 无 `base` | S1 |
| `src/runtime/round.js:1442-1448` | 满分即 abort 兄弟 | §6 第 2 条否决条件的来源 |
| `src/runtime/round.js:2005-2011` | finally 无条件删 worktree | S4 的调用方 |
| `src/runtime/round.js:2032` | `patchTouchesTests` 只解析 `diff --git` | S5 复用 |
| `src/exec/worktree.js:324` | `git worktree remove --force` | S4 的根因（git 本会拒绝） |
| `src/exec/patch.js:42-68` | apply 三步校验 | §4「完整到可以验」的判据 |
| `src/runtime/verifier-reuse.js:102` | 键 = `(patch, cmd, base)` | §5 的纯函数已存在 |
| `src/core/config.js` | 无 `salvage.*`、无 `keepWorktrees` 默认值 | S5 新增配置 |
| `artifacts/r{n}a{i}.patch` | 90 个孤儿补丁在磁盘上 | S2 的输入；实测全部存在 |

---

## 附：证据清单

- ✅ Temporal 活动失败检测（四种超时 / heartbeat payload / 整段重试）：https://docs.temporal.io/encyclopedia/detecting-activity-failures
- ✅ Ray task fault tolerance（`max_retries` 默认 3 / 重跑而非续跑）：https://docs.ray.io/en/latest/ray-core/fault_tolerance/tasks.html
- ✅ Apache Airflow best practices（task = transaction，不产出半成品）：https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html
- ✅ Dagster asset versioning（code_version + data_version memoization）：https://docs.dagster.io/guides/dagster/asset-versioning-and-caching
- ✅ git-worktree（unclean worktree 需 `--force` 才可删）：https://git-scm.com/docs/git-worktree
- ○ git-apply（`--check` 语义）：https://git-scm.com/docs/git-apply
- ○ LangGraph persistence（super-step checkpoint）：https://docs.langchain.com/oss/python/langgraph/persistence —— 该站以 JSON 配置渲染正文，我未能抓到正文，故只作背景引用，不引用其数字。
- ○ Bazel remote/action cache（输入摘要寻址）：https://bazel.build/remote/caching
- ○ PostgreSQL WAL（先写日志再改数据）：https://www.postgresql.org/docs/current/wal-reliability.html
