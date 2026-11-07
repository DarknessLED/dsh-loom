# dsh-loom — 人在环的可递归自我改进循环（DSH 插件）

> 主 agent 保持空闲；一个目标 + 预算 + 工作链在后台子会话里自己迭代；只有需要人判断时才叫醒你。

名字取自「织机」：经线是目标与预算，纬线是每一轮的工作链，人只负责换梭与验收。

---

## 1. 它解决什么问题

普通 agent 干活的形态是：人发一条指令 → 主 agent 忙一整个回合 → 人再发下一条。
RSI 想要的是另一种形态：

1. 人说一句「把 X 做到 Y 水平，预算 Z」；
2. 系统自己把这句话变成**可重复执行的工作链**（侦察 → 多候选实现 → 机械验证 → 评分 → 晋升）；
3. 链条在后台一轮轮跑，每轮都在前一轮的产地上继续改进；
4. **主 agent 不参与每一轮**，因此大部分时间是空闲的，随时可以和人聊别的；
5. 只有「要不要接受这个补丁 / 预算够不够 / 循环卡住了」这类判断，才通过检查点叫醒人；
6. 所有轮次都落成 append-only 事件日志，可回放、可审计、可复现。

本插件把这些做成 DSH 里的真实能力，而不是一个提示词模板。

---

## 2. 现在的状态（M0 – M6 已跑通）

| 能力 | 状态 |
|---|---|
| 战役（campaign）生命周期：创建 / 暂停 / 恢复 / 停止 / 改预算 / 加约束 | ✅ |
| append-only 事件日志 + 纯函数 reduce + 物化视图 `views/state.json` | ✅ |
| 工作链 spec（agent / verifier / human / map 四种节点）与两套经验模板 | ✅ |
| 每轮：git worktree 隔离 → 派子 agent（provider `spawn`）→ 机械验证 → diff → 评分 → 晋升门 | ✅ |
| 晋升门：验证通过 + 有补丁 + 不劣于 incumbent；`autoApply` 否则挂检查点等人 | ✅ |
| 检查点唤醒：`sessionController.prompt(mode:"queue")` 投递到发起战役的会话 | ✅ |
| 成本核算：汇总子会话 `assistant/message.usage`，按可配置单价折 USD，双预算闸门 | ✅ |
| 系统提示注入：主 agent 空闲也能在系统提示里看到各战役状态 | ✅ |
| 工具面：`rsi_start` / `rsi_status` / `rsi_control`（含全局开关） / `rsi_run` / `rsi_chain` / `rsi_evalset` / `rsi_decide` / `rsi_report` / `rsi_lean` / `rsi_replay` / `rsi_dashboard` | ✅ |
| **监管地基**：每次尝试写租约（租约 + 会话事件水位）、看门狗写掉僵死尝试、崩溃重启对账 | ✅ M2 |
| **结构化交接**：worker 输入是编译过的简报（≤6000 字符），输出强制 `AttemptReport` schema；不传 transcript | ✅ M2 |
| **同级交流**：同轮候选共享一块有界黑板（障碍/发现），最多 5 条、每轮结束按上限剪枝 | ✅ M2 |
| **准入控制**：全局 `maxConcurrent` 轮数上限 + 每尝试墙钟上限 + 预算三闸 | ✅ M2 |
| **知识树**：lesson 陈述式投放、explore 阶段零投放、holdout 家族隔离、配对影响审计与自动 quarantine | ✅ M3 |
| **连续减半**：任务声明 `screen` 检查后先筛后跑（4→2），失败候选不进入昂贵回合 | ✅ M3 |
| **Lean 4 数学门**：无 sorry/axiom/native_decide，`#print axioms` 白名单，编译不过不晋升 | ✅ M4 |
| **任务级数学门**：任务声明 `lean.source` / `lean.file` 后，证明与测试同为硬门；没有 Lean 工具链时停在 `setup` 检查点，不浪费回合 | ✅ M4 |
| **L2 循环策略**：策略即数据（minGain / 候选数 / 知识 / 减半），回放重算历史决策，人审后生效 | ✅ M5 |
| **看板**：`rsi_dashboard` 一次看到所有战役的进度、花费、检查点、知识量与活尝试 | ✅ M5 |
| **L1 链条自优化**：四类小变异（候选数+1 / 最小改动 / 不许改测试 / 声明不确定），同一任务配对比较，≥6 个配对任务 + 增益 + 无单任务回归才允许晋升，人审后激活 | ✅ M6 |
| **Lean imagine 阶段**：先产出候选陈述，再用结构规则筛掉空/重复/平凡/sorry/超长，只把值得证的交给编译器 | ✅ M4 |
| **GUI 面板**：侧栏 `RSI` 面板，每 5 秒刷新战役卡片（轮次/花费/最佳分/知识量/活尝试/检查点），可直接 pause/resume/stop 与 approve/reject | ✅ M7 |
| **多窗口安全**：任何新窗口都能拿到全部工具；循环所有权按心跳最新者持有，旧窗口自动降级为只读观察，不会两个窗口同时派发 | ✅ M7 |
| **对抗加固（chaos）**：子会话死掉 / 模型额度用尽换模型 / 上下文爆掉缩小简报重试一次 / ledger 漂移（重复 seq、乱序、torn 尾行）/ 重启后撤回「记了落地但没提交」的假成功 | ✅ M8 |

测试：`scripts/verify.mjs` 87 项、`tests/panel.test.mjs` 49 项、`tests/panel-client.test.mjs` 9 项、`tests/gate.test.mjs` 78 项、`tests/exec.test.mjs` 53 项、`tests/lease.test.mjs` 21 项、`tests/watchdog.test.mjs` 31 项、`tests/board.test.mjs` 64 项、`tests/brief.test.mjs` 96 项、`tests/select.test.mjs` 72 项、`tests/knowledge.test.mjs` 63 项、`tests/lean.test.mjs` 78 项、`tests/loop.test.mjs` 45 项、`tests/chain.test.mjs` 30 项、`tests/imagine.test.mjs` 23 项、**712 条单元断言**；`scripts/e2e.mjs` 41 项（真 git worktree + 真 `git apply`，stub agent；含两轮知识投放、一次 4→2 连续减半、一次 L2 策略晋升把门锁死）。
另有对抗套件 `tests/chaos/*`（13 项：子进程死亡、模型回退、上下文压缩重试、ledger 漂移、重启恢复）与 `tests/chaos2/recover-idempotent`（3 项回归钉），全部并入 `scripts/test-all.mjs`（30 套件）。

---

## 3. 安装

已经装进当前 profile（`desktop`）：

- `C:\Users\Darkness\.dsh\profiles\desktop\package.json`：`dependencies["dsh-loom"] = "file:C:/Projects/RSI"`，`dsh.profile.bundles` 追加 `dsh-loom`
- `node_modules\dsh-loom` → 指向 `C:\Projects\RSI` 的目录联接
- 备份：`package.json.bak-loom`

**重启 DeepSeek Harness 后生效。** 回滚 = 用备份覆盖 package.json、删掉 `node_modules\dsh-loom` 联接，再重启。

数据全在 `~/.dsh/loom/`（可用环境变量 `LOOM_HOME` 覆盖），删掉即清空，不影响 DSH 本身。

---

## 4. 一次典型使用

```
# 1. 立项（会自动提议 code-fix 模板链）
rsi_start(objective:"把 src/parser 的测试覆盖率做到 90% 以上，不许改公开 API",
          workspace:"C:/Projects/demo", budgetUsd:3, budgetRounds:10, template:"code-fix")

# 2. 注册任务集（每个任务 = 提示词 + 机械验证器）
rsi_evalset(action:"register", tasks:[
  { id:"t1", prompt:"补 parser 对行内注释的测试", verify:{ cmd:"npm test -- --coverage", timeoutMs:600000 } },
  { id:"t2", prompt:"补 parser 对嵌套模板字符串的测试", verify:{ cmd:"npm test -- --coverage", timeoutMs:600000 } }
], holdout:["t2"])

# 3. 激活链条并开跑（之后插件自己按 tickMs 推进，主 agent 空闲）
rsi_chain(action:"activate", version:1)
rsi_control(action:"start")
```

之后：

- 每 20 秒 tick 一次，有 running 战役就跑一轮（一次最多 `candidates` 个候选，各自一个 worktree、一个子会话）；
- 每轮结束写 `attempt.finished` / `gate.evaluated` / `artifact.promoted` / `round.finished`；
- 需要人拍板时挂 `checkpoint.raised`，并通过 `sessionController.prompt` 给发起会话塞一条消息（**这是唯一会叫醒主 agent 的路径**）；
- 人回 `rsi_decide(decision:"approve")` → 插件把补丁 `git apply` 进工作区；`reject` 则继续下一轮；`stop` 停战役。

随时用 `rsi_status` / `rsi_report` 查看，不会打断循环。

### 总开关（随时开关循环）

循环有一个全局开关，**不写进任何战役日志**——翻转只改 `~/.dsh/loom/switch.json`，另在 `switch.jsonl` 留一行审计。因此：

```
rsi_control(action:"disable", reason:"今晚不跑")   # 立即停止派发
rsi_control(action:"enable")                        # 下次 tick 继续，从原来的轮次接着走
```

- 关掉后：不再派发新回合，**但所有工具照常可用**（`rsi_status`、`rsi_report`、`rsi_dashboard`、`rsi_decide`、`rsi_lean`…），已挂起的检查点也还在等你处理。
- 历史不偏移：不追加任何 campaign 事件，`seq` 不动，恢复时不需要重放或重新总结；重启后开关状态从磁盘读回，不依赖任何摘要。
- 想只花一轮、不重启循环：`rsi_run(id:"...")` —— 手动跑一轮，走完全一样的 worktree / 验证器 / 迁升路径，即使开关是关的。
- 开关只管**派发**；已经跑起来的那一轮会自己收尾并如实记账。想让在飞的那轮也停：`rsi_control(action:"stop", id:"...")` 会中断该战役正在跑的尝试（尽力而为），尝试仍走自己的收尾路径并记下 `aborted`，不会伪造结果。
- 面板右上角有 `loop on / loop off` 按钮，走同一条 `POST /dsh-loom/state`。

### 面板

重启后侧栏面板列表里会出现 `RSI` 入口（客户端注册 `sidebar.panellist` 与 `main` 槽位），点开即面板。面板每 5 秒轮询 `GET /dsh-loom/state`，按钮走 `POST /dsh-loom/state` 同一路由，可以直接 pause / resume / stop 以及 approve / reject 当前检查点；面板改状态时同样要过所有权检查。

多开窗口是安全的：每个窗口都注册了全部工具，但只有心跳最新的那个窗口会真正派发回合；旧窗口自动降级为只读观察（工具仍可读，改状态时会提示「another dsh-loom window is driving the loop」）。

面板从上到下是四块，顺序按「谁需要你」排：

| 区块 | 内容 |
| --- | --- |
| 顶栏 | `loop on / loop off` 开关、`refresh` |
| 概览条 | 战役数 / 运行中 / 总轮数 / 花费 / 待处理数 / 知识条数 |
| 待你处理 | **跨战役**汇总的开放检查点，按风险排序（`high` 红、`normal` 黄），每行可直接 approve / reject |
| 战役卡 | 每张卡：状态、目标、轮数/花费/链版本/最佳分/知识条数/holdout、**证据质量**（healthy / stalled / regressing、晋升率、平均每轮秒数）、`chain v1: agent → map → verifier → human`、上一轮各候选的分数与状态、该战役的检查点与 pause/resume/stop |
| 知识 | 按 `fact / hazard / recipe` 分组的活跃知识，按累计收益排序，显示 claim 与收益值；隔离条数单列 |

只有中间那栏滚动，开关与概览永远在视野里。数据全部来自同一条 `GET /dsh-loom/state`，与 `rsi_dashboard` / `rsi_report` 同源（面板不读战役文件，也不自己派发回合）。

### Lean 4

本机已装 Lean 4.35.0（elan 在 `~/.elan`，toolchain 在 `~/.elan/toolchains/leanprover--lean4---v4.35.0`）。用 `rsi_lean(action:"probe")` 确认。

注意：Windows 上 elan 的 shim 每次调用约 34 秒（要解析 toolchain 并检查更新），所以插件**直接调用 toolchain 里的真实二进制**（`toolchains/*/bin/lean.exe` / `lake.exe`），并把该目录前置进子进程 `PATH`；shim 只在没有 toolchain 时兜底。

---

## 5. 目录结构

```
src/
  index.js            apply()：单实例锁、工具注册、系统提示段、唯一 ticker、优雅 dispose
  core/               paths / atomic（原子写）/ lock / ledger / reduce（纯函数折叠）/ config
  chain/              spec 校验、code-fix 与 refactor 模板
  exec/               worktree、verifier 子进程、git diff/apply
  dispatch/session.js 派子 agent（provider: spawn），超时可中断
  runtime/            runtime（战役/调度）、round（一轮的完整流程）、cost、notify、lease、watchdog
  dispatch/           session.js（子会话派发）、brief.js（简报编译 + AttemptReport 解析）
  collab/             board.js（同轮候选之间的有界黑板）
  knowledge/          select.js（陈述式投放策略）、impact.js（配对影响与派生）
  chain/              spec.js（校验）、templates.js、mutate.js（L1 变异算子）、evidence.js（配对证据与晋升判据）
  lean/               scan（源码静态门）、probe（工具链探测）、gate（编译 + 公理检查）、task（任务级门）、imagine（陈述产出与筛选）
  loop/               policy.js（策略即数据）、replay.js（回放重算历史决策）
  tools/              10 个工具的定义与渲染
scripts/              verify.mjs（单元）、e2e.mjs（真 worktree 端到端）
tests/                gate / exec / lease / watchdog / board / brief / select / knowledge / lean / loop / chain / imagine 的纯函数测试
docs/                 design-v1.md（设计稿）、design-v2-addendum.md（Lean / 知识树 / 监管）、contracts.md（内部契约）
research/             三份调研报告（DSH 插件 API / Gear / Open Dream-RSI）
```

事件类型（`~/.dsh/loom/campaigns/<id>/events.jsonl`）：
`campaign.created` `campaign.status` `objective.updated` `constraint.added|removed` `budget.adjusted|spent`
`chain.proposed|activated` `evalset.registered` `round.started|finished` `attempt.finished|abandoned`
`candidate.proposed` `gate.evaluated` `artifact.promoted` `checkpoint.raised|answered` `note.added`
`lesson.added|impact|quarantined` `policy.proposed|promoted`

监管产物（都在战役目录内，可删可重建）：
- `leases/<attemptId>.json` — 这次尝试「本该在跑」的凭据；`state` ∈ running/done/abandoned/failed。重启时凡是 `running` 一律判为 `abandoned(host-restart)`。
- `rounds/<n>/board.jsonl` — 同轮候选之间的黑板（`obstacle` / `finding`），每轮最多留 20 条，读侧去重。
- `artifacts/r<n>a<i>.patch` — 每次尝试的补丁；`views/state.json` — 物化视图（权威永远是事件日志）。

---

## 6. 安全边界（有意为之）

- **不自动改用户工作区**：默认 `loopPolicy.autoApply=false`，晋升只挂检查点；人点 `approve` 才 `git apply`，且工作区必须干净。
- **每轮都在独立 worktree/分支**里跑，失败不污染主仓库；`keepWorktrees` 可留证据。
- **双重预算**：轮数上限 + 美元上限（按 token 用量与配置单价折算）；任一触顶即收敛并挂检查点。
- **单实例锁**：同一 `LOOM_HOME` 只允许一个宿主进程驱动循环，避免双份 ticker。
- **ticker 从不抛异常**：宿主进程里未捕获异常会直接杀掉应用，所以 tick / 定时器 / 回调全部 try/catch。
- 插件零运行时依赖（只用 node 内置模块），没有外部进程常驻。

---

## 7. 与参考项目的关系

- **rsi-gear/gear**：它的 outer loop 优化的是「harness 本身（提示词/工具/skill/上下文管理）」，跑在 Docker 里、Windows 不在官方支持范围。我们借了它的四阶段（Diagnose → Evolve → Evaluate → Promote）与「证据完整性准入 + 最小增益 + held-out 不回归」的晋升判据，但把粒度下沉到「一个战役 = 一个目标」。
- **open-dream-rsi**：它冻结模型、只优化任务内策略（policy_program / policy_parameters / recipe），编排层是硬编码的（`interval_seconds=300` 等常数），作者明确说 cadence 不属于学习系统。我们借了它的三件判据（回放门控晋升、append-only 事件溯源 + 可重建物化视图、termination_reason 分类），而**编排循环本身**正是本插件要优化的对象（M3）。

---

## 8. 对抗测试（M8）

循环跑在别人的进程、别人的额度和别人的时钟上，所以「正常路径正确」不够。`tests/chaos/` 用故障注入把五类坏情况钉成规格，每一条都对应一处真实修复：

| 故障 | 注入方式 | 现在的行为 |
|---|---|---|
| 子会话死掉 | dispatcher 返回 `stopReason:"error"` / 直接抛错 | `attempt.finished.failureKind="died"`，回合照常收尾、租约清掉、不晋升；验证器在工作树上的「恰好通过」不算证据（`gateOk` 还要求 `failureKind==="ok"`） |
| 模型额度用尽 | 首个模型报 `context length exceeded`、`max-tokens`、quota | 按 `models.fallback` 换下一个模型并记录 `modelSwitch`；全部用尽 → `failureKind="exhausted"`，回合记 `exhausted` 并挂检查点，不再把空转伪装成 no-gain |
| 上下文压缩失败 | `compaction failed: prompt is too long` | 丢 notes/lessons/plan，用约一半长度的简报**只重试一次**，记 `retried:"smaller-brief"`；再失败即 `context`，不晋升 |
| 历史漂移 | 重复 seq、乱序行、torn 尾行、双写者 | `Ledger` 排序去重（同 seq 先到先得）、丢 torn 行、从磁盘最大 seq 继续；`appendJsonl` 先补换行，避免坏尾行吞掉新记录 |
| 视图漂移 | `views/state.json` 被删、写一半、或声称「已 done / 已 landed」 | 视图只是缓存：`runtime.open()` 永远从事件日志 reduce，坏缓存不解析、旧缓存赢不了日志（假 `done`、假 `landed`、假 incumbent 都推翻）；`flush()` 用日志的结果重建文件 |
| 重启恢复（含「假恢复」） | 账本有 `autopilot.applied{committed:false}` + 脏工作区 + 活租约 | `recovery.js` 判定「未证明的落地」→ `round.unlanded`（任务重新变回未解决）+ 只清理补丁自己新建的文件、`git checkout --` 恢复被改的已跟踪文件；**没有未提交证据时不动用户自己的脏工作区**；连跑两次第二次零写入（幂等） |
| 门根本不可达（任务写坏了） | 连续三轮「补丁在变、验证器 stderr 一模一样」（`tests/chaos3`） | `attempt.finished.verifySignature`（exit code + stderr 尾部 20 行的 sha1 前 12 位）；同一任务连续 3 轮签名相同 → 挂**一个** `checkpoint{kind:"stuck"}` 并继续跑，不把预算烧在不可能完成的任务上；签名在变（真的在推进）不报 |

这条最后加得最值：它来自一次真实事故——作者自己写的两条 chaos2 规格调用了 `done(n, msg)` 而不是 `ok(msg)`，harness 里 `done()` 要求至少一次 `ok()`，于是**规格永远不可能通过**。循环在它上面连烧 4 轮才发现人肉去看。现在的规则是：补丁在变而验证器的说法一字不变 = 门有问题，交给人。

边界（有意不做）：`git clean -fd` 从不使用（会删用户未跟踪文件）；凭据/权限失败不重试（重试不会让账号有钱）；换模型只为额度类失败买单，进程死掉换模型只会翻倍账单。

