# dsh-loom 内部契约（v0，M1）

插件布局：插件入口（apply）→ 运行时（状态/事件/tick）→ 回合引擎 → 一组不依赖宿主即可单测的纯函数模块；每个模块的职责见下面的模块地图。

约束：**零运行时依赖**，只用 node 内置模块；ESM；Node ^22.19 || >=24；所有导出必须能在无 DSH 运行时的情况下被单测 import。

## 模块地图

`src/` 下每个模块的职责如下；后续各节给出关键模块的详细契约。新增模块必须在这里补一行，说明它为什么存在。

### 入口与工具

- `src/index.js` — 插件入口：`apply()` 归一化配置、抢占所有权锁、创建 `Runtime`，并注册工具与面板路由；卸载时释放锁。
- `src/tools/index.js` — 注册全部 `rsi_*` 工具（start/status/control/chain/evalset/decide/report/lean/replay/dashboard），把工具参数翻译成事件或纯函数调用。
- `src/tools/output.js` — 工具输出描述符：无损 JSON schema 进、文本卡片出的统一封装，避免每个工具手写一遍返回形状。

### chain/ — 链（L1）

- `src/chain/spec.js` — 校验链规格的 JSON 结构（节点类型、版本、参数、节点 id），返回人可读的错误字符串数组，供提案检查点直接展示。
- `src/chain/templates.js` — 内置 `code-fix` / `refactor` 两条种子链与 `templateFor(name)`，主 agent 复制一份后按任务改写。
- `src/chain/evidence.js` — 把回合日志折成 (version, task) 配对分数表，并按任务数、增益、单任务回归三项给出链晋升判定。
- `src/chain/mutate.js` — 四种小而可审的链变异（多加候选、最小改动、禁止改测试、声明不确定性），一次只改工作方式，不改验收标准。
- `src/chain/predict.js` — 把历史回合折成一条可检验的预测：候选/引导类变异给出点估计与区间（分位数或 Wilson），平盘时退回“离满分还有多少”的先验，并给出回归风险等级与理由。
- `src/chain/spec-diff.js` — 两版链规格的结构化差异（按节点 id 对齐，prompt 追加单独记成 append），供提案卡展示“这次到底改了什么”，而不是让人猜。
- `src/chain/evidence-card.js` — 一张自足的 L2 提案卡：在链上的回合数、花费、晋升数、逐条变异的预测/风险/diff，以及本轮缺了哪项证据，面板与工具读同一份。
- `src/chain/adopt.js` — 人一键采纳的落点：工具与面板两条门都经由它把 chain/plateau 检查点写成 `chain.activated`，并带上被采纳的预测供下一轮核对。
- `src/chain/measure.js` — 采纳后的对账：把新链第一轮的分数与采纳前基线相减，按预测区间判 met/exceeded/missed，写进 `chain.measured`，让预测兑现与否可被追问。

### collab/

- `src/collab/board.js` — 同一回合内兄弟尝试共享的追加式 JSONL 便签板（障碍/发现/做法），带长度裁剪与摘要，避免各自重复踩同一个坑。

### core/ — 状态与基础设施

- `src/core/atomic.js` — 原子落盘原语：临时文件加 rename 的 JSON 写、JSONL 追加/读取、无损序列化，供所有状态文件复用。
- `src/config-schema.js` — 插件的配置表单：`FIELDS` 列出操作者真正会调的十个路径（模型链、两个超时、并发、推理强度、最小增益、规划策略、开关、心跳），`describeConfig()` 把它们投成 JSON Schema，`mergeConfigValues(base, values)` 只校验表单拥有的路径、**其余键原样保留**（`home`/`budget`/`verify`/`knowledge` 是文件级决定，不能被一次热更新重置），`loadConfigSchema()` 动态 import schemastery 建出宿主读得懂的 `Config`，解析不到就退化成 `undefined`（等于今天的行为，绝不拖垮入口）。
- `src/core/config.js` — 默认配置与归一化：tick 周期、预算、gate 阈值、检查点、静默时段、会话与定价表，非法值一律回落默认。
- `src/core/ledger.js` — 只追加的事件日志：序号从文件现状分配以兼容热重载双写者，所有派生状态都必须能由它重建。
- `src/core/lock.js` — 面板所有权锁：newest-writer-wins 的抢占、心跳刷新、存活/过期判定，以及只删自己记录的释放。
- `src/core/paths.js` — 状态目录布局：`~/.dsh/loom` 根、campaign 目录校验、目录创建与安全文件名片段。
- `src/core/reduce.js` — 纯 reducer：把事件序列折叠成 `state.json` 形状的 campaign 状态，是面板与工具读到的同一份事实。
- `src/core/limits.js` — 插件写给模型的每一段文字的硬上限：系统提示中的战役简报、工具结果、stdout/agent 尾。超出时截断并说明丢弃了多少，避免单个字段把整个请求撑到宿主拒绝转发。
- `src/core/services.js` — `ctx.get(name)` 的服务解析垫片，让 effect、定时器、工具回调都能在不声明 inject 的地方取到宿主服务。
- `src/core/settings.js` — 安装级默认值（目前只有 `plan`）：`settings.json` 原子写 + `settings.jsonl` 审计，缺文件/坏文件一律回落到配置默认；`roundConfigWithSettings` 把工作台开关折进每轮实际使用的 config，战役自己的策略仍然优先。

### dispatch/ — 子会话

- `src/dispatch/brief.js` — 编译有上限的 worker 简报（固定小节顺序、经验/便签配额），并解析与校验子 agent 返回的单个 JSON 尝试报告。；报告契约里有第七个字段 `lesson`（一句可独立成立的陈述，≤200 字），校验器不强制它、缺了就用 `why` 的第一句回退
- `src/dispatch/models.js` — 模型链的三个决定：`orderedModels` 把 worker 模型放最前、fallback 去重后跟随、被降级的模型移到末尾但绝不丢弃；`nextModel` 每真实失败前进一格、到末尾停住（不回到刚失败的模型），空链才返回 `null`；`modelChainFor` 把「这次下发给子会话的链」排成一处决定：0 次失败 worker 领跑，有失败则 fallback 领跑、失败的 worker 留在末尾（仍可试，但不再首先重试），没配 fallback 就是单条链，每多一次失败在 fallback 列表里前进一格、到最后一个停住。纯函数、依赖为零
- `src/dispatch/session.js` — `Dispatcher`：为每次尝试起一个无父上下文的全新子会话，负责 prompt、取消与释放；子会话的模型请求由 `modelChainFor` 排出的链逐条构造，`null` 头保留「让宿主决定」的语义。

### exec/ — 进程与工作树

- `src/exec/verifier.js` — 跑验收命令：`spawn` + `shell`、每流 64KB 尾部裁剪、超时杀进程树、按正则抽取 `metrics`，失败只进返回值不抛。；`node-bin.js` 负责找出真正能回答 `node` 的解释器目录（宿主是 Electron 时 `dirname(process.execPath)` 里并没有 node），验证器与裸脚本命令都用它
- `src/exec/worktree.js` — git worktree 生命周期：创建/移除、HEAD 快照、diff 统计、提交与回滚，全部 `git -C` 且有超时。
- `src/exec/patch.js` — 把尝试的改动导出为补丁文件，并在晋升或回滚时正向应用或反向撤销。
- `src/exec/rollback.js` — 只按补丁文本工作的回滚收尾：`createdByPatch(patchText)` 从每个 `diff --git` 小节的文件头（`new file mode` 或旧侧 `/dev/null`）读出该补丁**创建**的路径，`sweepCreated(workspace, patchText)` 删除且只删除这些文件（缺失的文件不算错，改过的和无关的未跟踪文件一概不碰，越出 workspace 的路径忽略），并清掉因删除而变空的父目录。存在的理由：`git checkout` 只还原已跟踪文件，补丁创建的新文件会活下来，一次失败的回合会永久把仓库变成 `workspace-dirty`。
- `src/exec/node-bin.js` — 找出真正能回答 `node` 的解释器目录：宿主的 `process.execPath` 可能是 Electron 应用（目录里没有 node.exe），所以按「正在运行的 node → `DSH_NODE_BIN` → PATH → `~/.dsh/dsh-runtimes/*` → 常规安装位置」搜索，并把找到的目录前置进 PATH；找不到就不改 PATH，绝不假造一个。
- `src/exec/git-bin.js` — 找出真正能回答 `git` 的目录并前置进 PATH，理由与 `node-bin.js` 同源：验证器与 autopilot 守卫跑在应用进程里，PATH 来自 Explorer，没有 Git 安装目录，于是任何 `git init` 的套件都以 `spawnSync git ENOENT` 失败、晋升被回滚成「候选没干活」。候选目录 = Windows 的三个常规安装位置 + 本机 `~/.dsh/dsh-ops/shells/<shell>/[<sha>/]winuxcmd/usr/bin`（这台机器上 git 只存在于那个打包 shell 里）；`hasGit`/`gitBinDir`/`gitOnPath`/`withGitOnPath` 全部可注入 `env`/`platform` 以便测试。

### gate/

- `src/gate/gate.js` — 纯函数晋升门：尝试打分、轮内排序，以及按增益/任务数/holdout 回归四选一决定是否晋升；`noopDecision` 在阈值之前拒绝空补丁（否则把没干的活记成晋升）；对畸形输入不抛异常。
- `src/gate/score.js` — 纯函数「一次尝试该记几分、分从哪来」：`scoreOf(attempt)` 在 `metrics.killRate` 是有限数时返回该连续读数（`0` 是实测值，`source:'killRate'`），否则回落到 `verifierOk ? 1 : 0`（`source:'binary'`）。返回 `source` 不是装饰：杀死率与二值判定是两种度量，调用方必须先决定混合比较的语义，而不是直接相减。存在的理由：验证器只答 1/0，勉强通过和大有余量同分，而 kill-rate harness 已经打印了连续读数。
- `src/gate/earned.js` — 纯函数「这次绿是否由补丁挣来」：基线红→候选绿算挣到；基线已绿时只认指标提升（≥ minGain），指标没动或退步一律不算；基线没测出（`'skipped'`）保持放行，因为缺测不是证据。存在的理由：`loom-graded` 的验证器故意只打印 `QUALITY=<n>` 并恒 exit 0，只用退出码做差分会把三轮真实改进记成「没干活」。
- `src/gate/scope.js` — 纯函数「这个补丁被允许改哪些路径」：`parseScope(verify.scope)` 读出声明的可编辑集，`inScope` 支持精确路径 / 目录前缀 / `*` 后缀（不是 glob 引擎），`diffPaths` 从 `diff --git` 两侧取路径（重命名两侧都算），`scopeVerdict` 把补丁文本与 diff-stat 的并集拿去比对，补丁读不出来时失败关闭。存在的理由：`testsClean` 原本拒绝**任何**测试改动，于是「给这个模块补测试」这类任务必然被拒 —— 而那条规则要保护的是「候选不能改掉衡量它的东西」，不是「不能碰 tests 目录」。没有声明 scope 时旧判定一字不变。
- `src/gate/metrics.js` — 纯函数「验证器输出里的度量」：`parseMetrics(stdout)` 只认整行 `KILLRATE=<0..1>` / `MUTANTS=<非负整数>`，缺失、被别的文字包住或不是十进制数一律 `null`（绝不回落 0，否则「没测到」会被读成「0 杀死率」），`verifyMetrics({stdout,status})` 只把真正读到的度量交给调用方。存在的理由：变异杀死率 harness 一直打印 `KILLRATE=0.3114`，但没有任何回合读过它，判据只剩下二值退出码 —— 杀掉 31% 变异体的补丁和一个也没杀掉的补丁得分相同。
- `src/gate/oracle.js` — 纯函数「补丁有没有改到它自己的判据」：从验收命令里推出它实际 spawn 的文件（跳过解释器、`-e` 的内联源、不存在的 token），再从补丁的 `diff --git` 头取出改动路径，两者取交集。存在的理由：`testsClean` 只拒绝 `tests/` 目录，而 `loom-graded2` 的判据是仓库根目录的 `check.mjs` —— 实测把 `check.mjs` 改成直接打印 `QUALITY=1.000` 的候选会晋升。命令不跑任何文件（`node -e ...`）时该规则不适用；补丁读不出来时失败关闭。

### knowledge/ — 经验

- `src/knowledge/impact.js` — 用「同轮、同任务、一处理一对照」的配对证据给经验计分，区分增益与伤害，并把有害经验隔离出去；`isNoWorkClaim` 是「这条 claim 只是在说没干活」的唯一判据，生产者与读者共用；`claimHeadline` 把一条经验压成第一句（≤140 字符、不在词中砍断），`lessonFiles`/`filesInClaim`/`symbolInClaim` 回答「这条经验是关于什么东西的」，供面板按文件归组。
- `src/knowledge/select.js` — 经验选择策略：过期判断、任务匹配、评分公式与配额裁剪，控制一轮最多给 worker 看几条。

### lean/ — Lean 门

- `src/lean/scan.js` — Lean 门的廉价半边：剥注释后扫描 `sorry`、新公理、`native_decide` 等违规与 import 白名单，纯函数不碰磁盘。
- `src/lean/probe.js` — 探测本机 Lean 工具链是否可用（elan/lean 路径、版本），缺失时给出安装命令而不是静默下载几个 GB。
- `src/lean/gate.js` — 完整 Lean 门：源码扫描 → 真实编译 → 公理报告，三者都通过才算证明，stderr 已裁到首个 error。
- `src/lean/task.js` — 任务级 Lean 门：读取任务里的 Lean 声明、拒绝工作树外的路径，并复用 `checkLemma` 作为第二道机械门。
- `src/lean/imagine.js` — 证明前的廉价筛选：从文本抽取定理声明，按任务相关性与去重裁到最多 N 条，并生成 imagine 提示。

### loop/ — 循环策略（L2）

- `src/loop/policy.js` — 把循环策略（增益阈值、候选数、知识注入、halving、holdout slack）变成可归一化、可比较的纯数据。
- `src/loop/funding.js` — 给「这个预算上限买得起几轮」一个答案：`fundingFor({rounds, usdPerRound, measured, capUsd})` 里实测价 `measured` 压过配置猜测 `usdPerRound`，`affordableRounds` 是 `floor(capUsd / price)`（带 1e-9 余量，避免 0.1×7 那种数学整数被浮点掉一轮），`shortfallUsd` 是补齐全部回合还差的美元数，`funded` 是 `affordableRounds >= rounds`。**没有价格时 `funded` 是 `null`，既不是 `false` 也不是 `0`**：后两者读起来都是「测过、且连一轮都买不起」，与「没测过」正好相反。`src/core/config.js` 的 `budget.usdPerRound` 默认 0.12（实测每轮 0.0508–0.19 的中位），`src/runtime/runtime.js` 在建战役时把 `funding` 记进 `campaign.created` 的 `budget` 字段，于是 `state.budget.funding` 一开始就回答了「这个上限够不够跑完计划回合」，而不是跑到一半才发现。
- `src/loop/candidates.js` — 第二候选的对冲定价：`hedgeDecision({pSolve, gainIfSolved, extraCostUsd, tailMs, budgetLeftMs})` 只在任务尚未解出（`pSolve < 1`）、`(1 - pSolve) * gainIfSolved` 严格超过第二候选的价格、且尾部不超过剩余预算一半时才买；拒绝理由按检查顺序分为 `solved` / `no-tail-room` / `negative-ev`，`expectedGain` 报出 `(1 - pSolve) * pSolve * gainIfSolved`，盈亏相抵（含浮点上的 0.95 情形）与不可测输入一律不买。`planCandidates` 把它折成规划器要的数量：拒绝时 `count: 1`（`no-tail-room` 保留时钟理由，其余归入 `negative-ev`），买入时 `count: max`（默认 2，`max` 是上限不是建议）。`src/runtime/round.js` 在决定候选数处调用它，传入该任务的历史解题率与战役剩余墙钟预算；任一项测不出时不调用，沿用配置数量。存在理由：每轮默认采样两个候选，第二个只该在第一个可能失败时付钱，而这个问题是期望值问题，不是配置问题。
- `src/loop/replay.js` — 只重放数值决策的策略回放：同一批回合在不同阈值下会晋升几次；明确不模拟换任务或换提示。
- `src/loop/ab.js` — 配对比较两套策略：Wilson 区间（n 只有几十、率 0.25 时正态区间会掉到 0 以下）、精确 McNemar、以及**明确报出 MDE**（`mdePaired` 的灵敏度来自不一致对而不是样本量）。两条判据是硬约束：不一致对为零时 MDE 不能报 0（0 读起来像"无限灵敏"，正好相反），判决只在 `|delta| ≥ mde && p < alpha` 时成立，否则一律 `cannot-distinguish` 并写明"这个样本分不出 X 个点"。
- `src/loop/decisions.js` — 循环对自己链路的决策台账：缺少证据（`evidence` 里没有一个有限数值）就按名字拒绝，按 kind+decision 去重，原子写入并保持人类可读的 JSON 数组；缺失或损坏的文件读作空表，绝不抛错。
- `src/loop/migrate.js` — 清理由「结束」留下的历史欠账：`planMigration(campaigns)` 只把已终结（done/stopped/converged 且带 `ended` 记录）战役里仍 `open` 的 checkpoint 放进 `close`，已被回答的、以及 `heldUntil` 还在未来的（人在处理）一律不动，其余 `open` 进 `keep`；`applyMigration(runtime, campaigns)` 每个 planned id 只追加一条 `checkpoint.closed`（reason 为 `campaign-ended`），并把内存状态标成 closed，所以重跑是 no-op。
- `src/loop/lock.js` — 跨 campaign 的晋升锁：`acquirePromotionLock(home, {owner, now, ttlMs, release})` 把「apply → guard → commit」这段唯一的写 checkout 窗口串行化；同一时刻只有一个持有者，后来者拿到 `{ok:false, holder}` 被告知谁占着；`release()` 交棒；超过 ttl 的锁被偷并标 `stolen:true`（死掉的回合不能把机器卡住）；释放按 owner 校验，非持有者的 `release:true` 不会解锁。

### runtime/ — 运行期支撑

- `src/runtime/review-card.js` — 人审卡片必需的四块证据（任务 / diff / 验证器判决 / 风险），只从本轮已测出的东西生成：没有补丁、改到验证器、改到声明范围外的路径都是 high；大 diff 与「判决靠 base 红而不是指标动」是 medium；缺哪块就写 `missing:`，绝不留白——留白会被读成「没问题」。

### panel/

- `src/panel/api.js` — 浏览器面板唯一数据源：读物化状态返回 JSON，写操作复用与工具相同的事件追加。经验行带 `files`（归组的唯一依据）与 `uses`/`harm`（真的被用上过几次），`lessonsAll` 送整库而不是每战役前三条；旧 lesson 没有 `files` 时，用它 `evidence` 点名的那次 attempt 的 `report.changed` 补上位置。

### report/ — 审计与导出

- `src/report/export.js` — 把 campaign 折成一个版本化、可 JSON 往返的自包含包（目标、链、策略、评测集、落地产物），供 `rsi_export` 写到 `export/bundle.json`，让证据能随代码一起归档。
- `src/report/digest.js` — 面向人的有界追读摘要：表头（campaign、状态、轮数、结论、花费）、最新在前的回合行、按风险排序的待决评审、经验计数；不含 stdout/patch/JSON，行数与行长都有硬上限，`rsi_report` 以它开头。
- `src/report/end.js` — 一个 campaign 结束时的结论：状态、原因、到达的轮次与分数、以及下一次 resume 的确切起点；纯函数且对残缺账本不抛错，面板与摘要共用同一句话，结束了的战役不必再靠猜。
- `src/report/round-cost.js` — 回合的钱花在了哪里：`cacheHitRate(usage)` 是 cacheRead/(input+cacheRead+cacheWrite)（分母为 0 时为 0，空回合不是 100% 命中），`roundCost(round)` 给出该回合的 usd/tokens/命中率与按 attempt.node 合并的 byNode 明细，`costPerPromotedChange(rounds)` 把失败与回滚的回合也算进分母、按晋升次数摊成「一次落地改动的成本」，没有晋升时为 `null` 而不是除零；纯函数、零依赖，供面板与 `rsi_report` 共用同一份数字。

### runtime/ — 回合与运行时

- `src/runtime/baseline.js` — 基线裁决：回答「这条任务命令在补丁之前就已经通过了吗」。候选在从 HEAD 切出的工作树里验证，所以问题可以直接在 workspace 上问一次，答案按 `(任务, base, 命令)` 缓存，HEAD 一动就重测；缓存读坏只会多跑一次，绝不会伪造裁决。
- `src/runtime/candidates.js` — 候选模式的自适应推断：`adaptiveCandidateMode(rounds)` 只看最近 `minRounds` 个「有测量」的回合，若每轮都采样了两个以上候选且每个候选都是满分 1，说明第二意见从未改变结果，下一轮应改为 `cascade`（先跑一个、满分就收手）；历史太短、只有一个候选或存在非 1 分时一律回落 `parallel`。是否启用由 `config.loopPolicy.autoCandidateMode` 决定，显式 `candidateMode` 永远优先，来源记在 `round.finished.candidateModeSource`（`config`/`auto`/`default`）。
- `src/runtime/cost.js` — 从子会话 usage 累计 token 并按配置定价估算美元；活会话消失后，`usageFromSessionLedger(home, sessionId)` 读 `<dsh home>/sessions/<workspace>/<目录>/session.v4.jsonl(.zstd)`，目录先按名字与 sessionId 完全相等的匹配、再按以 sessionId 结尾的匹配（宿主会写成 `session-<uuid>` 这样的前缀名），且完全相等的候选先于后缀候选尝试；把子会话自己账本里的 usage 当作实测（`estimated: false`），账本缺失或无 usage 块返回 null 而不是零；再缺失时才用 transcript 长度给出带 `estimated` 标记的上界。
- `src/runtime/deferred.js` — 静默时段计算：把落在 quiet hours 内的检查点推迟到窗口结束的瞬间，既不投递也不丢弃。
- `src/runtime/doctor.js` — 预检医生：`doctor({workspace, home, runtime, config, now})` 同步检查 workspace 是否在 git 工作树内、工作树是否干净、Node 版本是否达标、home 是否可写、本窗口是否持有循环所有权；每项返回 `{id, ok, detail, fix}`，失败项给出可直接执行的修复命令（如 `git init`、commit 或 stash），单项抛错记为带错误文本的失败检查，函数本身永不抛错。
- `src/runtime/exposure.js` — 决定本轮哪个候选看到经验：只暴露一个且按回合轮换，保证同一轮存在真正的对照组。
- `src/runtime/guard-reuse.js` — 守卫复用：当 autopilot 的 guard 命令作为独立子句逐字出现在任务的 verify 命令里时，验证器跑的就是同一件证据，于是从交给验证器的命令中删掉该子句，晋升后不再重复 spawn，只在 `autopilot.applied` 记 `guard:'reused-verifier'` 并照常提交；guard 不是同一命令时仍恰好运行一次。
- `src/runtime/halving.js` — 轮内 successive halving：先用廉价的 screen 验证器淘汰一半候选，再只为幸存者付真实尝试成本。
- `src/runtime/hold.js` — 人工「暂缓」的到期时刻：读取 `config.checkpoint.holdMs`（缺省 6 小时），非法或非正值回落默认，保证暂缓永远指向未来而不是偷偷变成立即回答。
- `src/runtime/ids.js` — 检查点 id 生成：时间戳加定宽单调计数器，保证同一毫秒内多次 raise 也不碰撞。
- `src/runtime/lease.js` — 尝试租约：记录「本该在跑」的尝试，崩溃重启时对账，并按 TTL 清扫陈旧租约。
- `src/runtime/model-health.js` — 模型健康度：把每个 attempt 的 `model`/`failureKind`/`durationMs` 折成按模型 ref 一行（attempts、ok、verified、timeout/died/context/crash、promoted、p50/p90），没有模型的 attempt 记作 `unknown` 而不是丢掉，未测到的时长是 `null` 而不是 0。`campaignTriangle.perModel` 直接用它，供面板与 `rsi_report` 判断回落链该往哪走。 `demoteChain(chain, rounds, { after })` 是它的唯一消费者：某 ref 连续 `after` 次没有交付（died/timeout/exhausted）就把该 ref 排到链尾，恢复后自动归位，`after <= 0` 关闭整条规则（默认关闭——重排一条正在工作的链是没人要求的改动）。
- `src/runtime/notify.js` — 检查点通知：只在该决策时唤醒主会话一次；静默时段写 `checkpoint.deferred` 并由 tick 补发，且永不重复投递。
- `src/runtime/plateau.js` — 平台期判定：连续 N 轮没有 `promoted === true` 就认为停止进步，供检查点与面板使用。
- `src/runtime/plan-budget.js` — 规划预算学习：把「规划器连续几轮撞满上限却什么都没产出」折成下一轮的截止时间，连续一个窗口的超时就减半、任何时候有一次规划在期限内完成就恢复到上限，从不因没有证据就惩罚新战役，也绝不返回非有限值或越界的数。
- `src/runtime/quality.js` — 战役证据健康度：把回合账本折成通过率、增益、停滞等少数指标，供报告与面板给出同一结论。
- `src/runtime/review.js` — 待决队列排序：按风险（holdout/anomaly 高、gate/policy 中、其余低）再按提出时间与 id 排列，为每条决策生成单行摘要与动词短语建议，供 `rsi_status` 渲染。
- `src/runtime/recovery.js` — 重启恢复：找出「记了落地但其实没提交」的回合并显式撤回，只清理补丁自己新建的文件，绝不动用户原有的改动；另外在启动时把「没有改动」这类旧 claim 退役（`noWorkLessons`），因为它们仍在被选进简报。
- `src/runtime/recon-reuse.js` — 规划复用：以基提交 sha、链版本、任务与节点提示拼出 key，缓存上一轮的侦察计划；树没动就直接复用（`reused:true`、耗时记 0）并照常把计划交给 worker，HEAD 一变即重新规划；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/round.js` — 回合引擎：选任务、起候选、跑验证器与 Lean 门、记分与计成本、执行晋升/回滚并 raise 各类检查点；`attemptOutcome` 把「被兄弟解题而中止」与真正的死亡分开记账。
- `src/runtime/runtime.js` — `Runtime`：campaign 生命周期与 tick 派发，含所有权心跳、watchdog 看护、租约对账和状态缓存。
- `src/runtime/sampling.js` — 确定性选题：普通轮在未解决任务间轮转，每 `holdoutEvery` 轮消耗一个 holdout 任务，可重放。
- `src/runtime/selector.js` — 选题策略：跳过已满分任务以免浪费回合，全部做满时报告 `allSolved` 让调度收尾。
- `src/runtime/triangle.js` — 效率/质量/成本三角的聚合定义：把回合记录折成每秒轮、并行度、验证器占比、晋升率与 token 成本，面板、报告与 `scripts/loom-metrics.mjs` 共用同一套口径。
- `src/runtime/verifier-reuse.js` — 验证器复用：按补丁字节（sha1）加验证命令缓存裁决，同一战役里补丁完全相同的后到候选项继承前一次的 ok/exitCode/输出并把 durationMs 记 0，只对真正启动的验证器计入 verifierRuns；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/switch.js` — 循环总开关：`~/.dsh/loom/switch.json` 存 enabled/at/by，另开 `switch.jsonl` 审计；翻转绝不写 campaign 日志，所以 seq 不偏移、恢复时也无需重新汇总。
- `src/runtime/watchdog.js` — 看护运行中的尝试：以子会话事件水位而非 pid 判断存活，租约到期或 `stallMs` 无事件即写掉。

## 1. `src/exec/verifier.js`

```js
/**
 * @param {{cmd: string, cwd?: string, timeoutMs?: number,
 *          metrics?: Record<string, {pattern: string, group?: number}>}} spec
 * @param {{cwd: string, timeoutMs?: number, env?: Record<string,string>}} opts
 * @returns {Promise<{
 *   ok: boolean,            // exitCode === 0 && !timedOut
 *   exitCode: number|null,
 *   signal: string|null,
 *   timedOut: boolean,
 *   durationMs: number,
 *   stdout: string,         // capped, tail kept
 *   stderr: string,
 *   metrics: Record<string, number>,
 *   command: string,
 *   cwd: string,
 * }>}
 */
export async function runVerifier(spec, opts)
```

要求：
- Windows 上 `shell: true`（cmd 是复合命令），用 `child_process.spawn`，stdout/stderr 各保留尾部 ≤64KB。
- 超时 → kill 进程树（Windows 用 `taskkill /pid <pid> /T /F` 兜底），`timedOut: true`。
- `metrics`：对 stdout 跑 `pattern`（RegExp 字符串），取 `group ?? 1`，`Number()` 解析，解析失败不写该键。
- 不抛异常（除参数非法）；失败信息进返回值。

## 2. `src/exec/worktree.js`

```js
export async function isGitRepo(dir): Promise<boolean>
export async function createWorktree({repo, dir, branch, baseRef = 'HEAD'}): Promise<void>   // 已存在则先 remove
export async function removeWorktree({repo, dir}): Promise<void>                            // 尽力而为，不抛
export async function diffStat({dir}): Promise<{files:number, insertions:number, deletions:number, filesChanged:string[]}>
export async function hasChanges({dir}): Promise<boolean>
```

要求：全部用 `git -C <repo>` 形式；超时 60s；错误信息要带 stderr；`removeWorktree` 先 `git worktree remove --force` 再 `rm -rf` 兜底。
注意仓库可能有很多未跟踪文件，`diffStat` 用 `git diff --numstat HEAD` 覆盖已跟踪改动即可。

## 3. `src/gate/gate.js`（纯函数，无 IO）

```js
/**
 * 汇总一次 attempt 的评估结果
 * @param {{attemptId:string, taskScores?: Record<string, number>,
 *          verifierOk: boolean, metrics?: Record<string, number>}} attempt
 * @returns {number} 0..1
 */
export function scoreAttempt(attempt)

/**
 * 一轮内排序：返回 {best, ranked}
 * @param {Array<{id:string, score:number, verifierOk:boolean}>} attempts
 */
export function rankAttempts(attempts)

/**
 * 一次尝试的分数与来源（src/gate/score.js）：
 * metrics.killRate 有限（含 0）→ 该读数；否则 verifierOk ? 1 : 0
 * @param {unknown} attempt
 * @returns {{score:number, source:'killRate'|'binary'}}
 */
export function scoreOf(attempt)

/**
 * 晋升判定：candidate / incumbent 可以是数值，也可以是 attempt 对象
 * @param {{
 *   candidate: {score?:number, metrics?:Record<string,number>,
 *               verifierOk?:boolean, holdoutScore?:number|null}|number,
 *   incumbent: {score?:number, metrics?:Record<string,number>,
 *               verifierOk?:boolean, holdoutScore?:number|null}|number|null,
 *   config: {minGain:number, holdoutSlack:number, minTasks:number,
 *            noiseMultiplier?:number, noiseSpread?:number},
 *   policy?: {noiseSpread?:number},
 *   evidence: {tasksEvaluated?:number, tasks?:number, holdoutEvaluated:number,
 *              complete:boolean, noiseSpread?:number},
 * }} input
 * @returns {{promote:boolean, reason:string, delta:number,
 *            checks:Record<string,boolean>, metrics:Record<string,number>,
 *            scoreSource:'killRate'|'score'|'binary'}}
 */
export function decidePromotion(input)

/**
 * 空补丁的晋升门：没补丁一律拒绝，真补丁原样交给 decidePromotion
 * @param {{hasPatch?:boolean, verifierOk?:boolean, score?:number,
 *          candidate?:object, incumbent?:object|null, config?:object,
 *          evidence?:object}} input
 * @returns {{promote:boolean, reason:string, delta:number, checks:Record<string,boolean>}}
 */
export function noopDecision(input)
```

规则（写死，单测覆盖）：
- `noopDecision`：`hasPatch !== true` → reject("no-patch")，且在第 17 轮那种空补丁
  （`hasPatch:false, diff.files 0`）上**先于任何阈值**拒绝——验证器在没动过的树上打印绿色，
  说明的是那棵树而不是候选。真补丁原样交给 `decidePromotion`，所以包装函数不可能放行普通门
  会拒的东西；`reason === 'no-patch'` 是它唯一自己拥有的拒绝。
- `evidence.complete === false` → reject("incomplete evidence")。
- `evidence.tasksEvaluated < minTasks` → reject("insufficient tasks")；`evidence.tasks` 是同一个计数的短名，两者都有时以 `tasksEvaluated` 为准。
- 每一侧先读成一种度量：数值 / 显式 `score` / 有限 `metrics.killRate`（走 `scoreOf`）/ 仅 `verifierOk`；`scoreSource` 记候选用的种类（`killRate` / `score` / `binary`），`metrics` 带候选读到的度量。
- `incumbent == null` → promote iff 候选读数 > 0（首轮基线）。
- 度量不可比时（候选有 killRate、incumbent 没有）：二值 1 不是杀死率必须越过的门槛，按基线处理——promote iff 候选读数 > 0。反方向（候选无度量、incumbent 有 killRate）→ reject("incomparable measurement")：无法在 incumbent 的度量上证明增益。holdout 与误差棒只在同类度量之间比较。
- `delta = candidate.score - incumbent.score`；`delta < minGain` → reject("gain below threshold")。
- 有效误差棒（effective noise）依次取 `evidence.noiseSpread`（本轮实测）、`policy.noiseSpread`（campaign 记录的）、`config.noiseSpread`（安装配置）中第一个有限数；存在**可比** incumbent 且该值为正时，误差棒为 `noiseSpread * noiseMultiplier`（`config.noiseMultiplier` 缺省 `1`，非有限或负数按 `1` 处理）；`delta < 误差棒` → reject("within measured noise")。误差棒是重复跑同一棵树的实测离散度：落在棒内的 delta 无论是否过 `minGain` 都不算进步。`0` / `NaN` / 字符串 / 三处都缺省一律视为「没测过」，退回上面的旧规则；首轮基线（`incumbent == null`）不受噪声约束。
- `candidate.holdoutScore != null && incumbent.holdoutScore != null`：`candidate.holdoutScore < incumbent.holdoutScore - holdoutSlack` → reject("holdout regression")。
- 其余 → promote，reason 带 delta 与 holdout 数据。

`checks` 每个子判定一个布尔：`complete` / `enoughTasks` / `baseline` / `gain` / `holdout`，
以及 `noise`——**仅在真的测到误差棒时存在**（存在 incumbent 且 `noiseSpread` 为有限正数），
表示 `delta >= noiseSpread * noiseMultiplier`；没有测量时该键缺席，因此没有重复性测量的调用方看到的
`checks` 形状与旧版完全一致。

## 4. `src/dispatch/session.js`（lead 负责）

```js
export class Dispatcher {
  constructor({ctx, config})
  async run(prompt, {cwd, timeoutMs, label}): Promise<{sessionId, text, usage, stopReason, error?}>
  cancel(sessionId): void
  dispose(): void
}
```

## 5. `src/runtime/round.js`（lead 负责）

```js
export async function runRound({runtime, view, config, dispatcher, log}): Promise<void>

/**
 * 这次尝试在账本里到底是哪一种结局
 * @param {{stopReason?:string|null, solvedBy?:string|null, verifierOk?:boolean,
 *          score?:number, error?:string|null, attemptId?:string|null}} input
 * @returns {{failureKind:'solved-by-sibling'|'died'|'ok'}}
 */
export function attemptOutcome(input)
```

`attemptOutcome` 的顺序是契约：`solvedBy` 指向另一个 attempt → `solved-by-sibling`
（兄弟已经解题，被中止的子会话无论看起来多像崩溃都不是失败）；`stopReason === 'error'` → `died`；
其余 → `ok`。回合在**知道赢家的地方**用它给 `failureKind` 定名——分派器只看见会话停下，
中止的子会话与真正死掉的子会话在它那里长得一模一样，第 15 轮 `r15a1` 的顺利交接就是这样被记成
`died` 的。

事件序列：`round.started` → 每个 attempt 一次 `attempt.finished` → `candidate.proposed` →（可选）`gate.evaluated` → `artifact.promoted` → `round.finished`。

map 之前的 agent 节点是可寻址的工作实例：派发前先写 `node.started{id,type,role,round,attempt,at,base,deadlineMs}`，结束后写 `node.finished{id,round,attempt,ok,durationMs,…}`，`reduce` 把它们折进 `state.nodes`；`round.finished` 落地时仍为 `running` 的节点折成 `lost`（只投影事实，不伪造成功）。没有 `node.*` 事件的旧账本折叠结果不变。

节点调度是**就绪池**而不是按 `topoOrder` 线性走：`src/chain/spec.js` 的 `runnableNodes(chain, settled, {cancelled})` 返回所有 `needs` 都已在 `settled` 中、且自身未结算的节点 id（声明顺序）；`cancelled` 中的分支算已结算，否则等它的 join 永远醒不来，但它自己不会再被派发。未知依赖是坏链：抛错并在消息里点名那个 id。池宽由 `maxParallelOf(chain)` = `params.maxParallel` 取下限 1（缺省 1，非法值按 1），所以没写 `maxParallel` 的链保持旧的串行行为。`round.js` 用它们决定 pre-map 节点先跑哪一个。候选因兄弟已解题而被中止时，除了 attempt 记录，还要写一条终态 `node.cancelled{id,node,round,attemptId,reason:'solved-by-sibling'}`：被取消不等于死亡，账本必须能区分。

晋升门还有一条**误差棒**：`policyFor()` 从 `config.loopPolicy.noiseSpread` 读出有限正数（缺省 `0.1`，即安装默认使用的实测 pooled spread，`DEFAULT_CONFIG.loopPolicy.noiseSpread`；显式 `0` 或垃圾值视为「没测过」，行为与旧版一致），回合内联门把它当作额外门槛——存在 incumbent 时，`score - taskBest` 必须同时过 `minGain` 和 `noiseSpread` 才算 `beatsIncumbent`，`gate.evaluated.checks.noise` 记录这次是否过棒（只有测到误差棒时才出现）。它就是 `decidePromotion` 的同一条规则（`evidence.noiseSpread * config.noiseMultiplier`），让 campaign 把自己的重复性测量写进配置后，2 分的「提升」不再被当成进步。

---

## 8. Lean 门（M4）

```js
// src/lean/scan.js — 纯函数，不碰磁盘
scanSource(source, { allowedImports, allowAxioms }) -> { ok, violations: [{ code, detail }] }
// code ∈ empty | sorry | axiom-decl | native-decide | implemented-by | unsafe | import | allow-list
checkAxioms(axioms, { allowAxioms }) -> { ok, violations }
buildCheckSource({ source, theorem, imports }) -> string

// src/lean/gate.js
checkLemma({ source, theorem, imports, allowedImports, allowAxioms, dir, compiler, run, timeoutMs, keep })
  -> { ok, stage: 'scan'|'compile'|'axioms', violations, axioms, theorem, exitCode, stdout, stderr, durationMs, file, dir }

// src/lean/task.js
runTaskLeanGate({ task, config, worktree, run }) -> null | { ok, skipped } | checkLemma 结果
```

语义：`ok === true` 是**唯一的放行条件**；`stage` 说明拦在哪一步；`violations[0].code` 是给人看的分类。
`gate` 失败时 `stderr` 已裁剪到首个 `error` 行（≤1200 字符），避免把整份 lake 日志塞进上下文。

## 9. L2 循环策略（M5）

```js
// src/loop/policy.js
normalizePolicy(raw, base = POLICY_DEFAULTS) -> { minGain, candidates, knowledge, halving, holdoutSlack }
effectivePolicy({ state, config }) -> policy      // 晋升过的策略覆盖 config，未设字段回落
diffPolicy(a, b) -> { <field>: { from, to } }

// src/loop/replay.js — 纯函数
replayRounds({ rounds, policy }) -> { decisions: [{ n, promote, reason, score, delta }], metrics, policy }
comparePolicies({ rounds, base, candidate }) -> { base, candidate, delta, verdict }
// verdict ∈ candidate-better | candidate-worse | no-difference | no-evidence
```

语义：回放只重算**数值决策**（谁赢、增益是否过线、晋升几次），不模拟换任务或换提示；
`no-difference` 不算证据，因此 `commit` 出去的提案默认仍要人审（`policy.proposed` → 检查点 → `rsi_decide approve` → `policy.promoted`）。
`candidates` 变小时只保留前 N 个已记录的尝试——这正是「候选少一半，选项也少一半」的诚实含义。

## 10. L1 链条演化（M6）

```js
// src/chain/evidence.js — 纯函数
chainEvidence({ rounds }) -> [{ version, task, score, round }]   // 每个 (version, task) 取最好分
byTask(rows, version) -> Map<task, score>
compareChains({ rounds, baseVersion, candidateVersion, minTasks = 6, minGain = 0.05, holdoutSlack = 0.02 })
  -> { ok, reason, checks: { enoughTasks, gain, noRegression }, paired, pairedTasks,
       baseScore, candidateScore, delta, worst }
// reason ∈ not-enough-tasks | gain-too-small | regressed-a-task | promote
coverage(rounds) -> [{ version, tasks }]

// src/chain/mutate.js
mutateChain(base, { kind, version, rationale }) -> { kind, spec } | null
proposeMutations(base, { fromVersion, max = 3, decided = [], scopeEditable = false, rounds = [] })
  -> [{ kind, spec, status, note, evidence }]
evidenceFor({ rounds = [], decided = [] })
  -> { rounds:n, promotions, rejections, lastVerdict, decided, basis:'rounds'|'decisions'|'none' }
// kind ∈ candidates+1 | minimal-change | no-test-edits | state-your-uncertainty
```

语义：**promote 是四选一，不是打分**——任务数不足、增益不够、任一任务回归，任一命中就不晋升，且 `ok === false`。
`regressed-a-task` 排在 `gain-too-small` 之后判定：先看整体是否值得，再看有没有把某个任务做坏。
`mutateChain` 不修改 `base`；返回 `null` 表示这类变异在当前链上不适用（没有 map 节点、候选数已达上限 4）。
`evidenceFor` 把战役自己的回合账折成批准卡要说的一句话：`promotions`/`rejections` 只数真的跑过的回合（`interrupted`、`budget` 这种什么都没测的回合两边都不算），`basis` 说明数字来自哪本账——没有回合但有已记录的决策时是 `'decisions'`，两本都空时是 `'none'`（第一次提议就是猜测，卡片不许把它包装成证据）。`proposeMutations` 把同一份 `evidence` 快照挂到**每一条**返回的变异上，被挡下的那些也要带，因为「为什么不再提」本身就是卡片的一行。
一次晋升只改**工作方式**，不改验收标准——验收标准属于 `evalset`，改它等于换考题。

事件：`chain.proposed{version, spec, parent}` → `chain.proposed` + `checkpoint.raised{kind:"chain"}` → `chain.activated{version}`
（`round.started` 与每次 `attempt.finished` 都带 `chainVersion`，这是 L1 拿到配对证据的唯一来源。）

## 11. 面板与多窗口所有权（M7）

```js
// src/panel/route.js —— 路由契约；宿主注册的就是这个 handler
routeState(runtime, req) -> { status, headers, body }
panelRoute(runtime, { write? }) -> { kind: 'exact', path: '/dsh-loom/state', handler }

// src/panel/api.js
registerPanel(ctx, { runtime, config, log }) -> void      // ctx.effect 注册上面那条路由
panelSource(deps) -> { panelState() }                     // 把 Runtime + config 收成路由的读口
actionHandler(deps) -> (req) -> Promise<decision>         // 面板写入口，一次 body 交给 panelAction
panelState({ runtime }) -> { campaigns, live, ownership, lean, at }
panelAction({ runtime }, { campaign, action, decision, note })
  -> { ok, campaign, action, decision?, open? }           // action ∈ pause|resume|stop|decide

// src/core/lock.js
claimOwnership(home, meta) -> { ok, file, record, previous }
heartbeat(file, meta) -> boolean            // 只在仍持有所有权时刷新 heartbeatAt
holdsOwnership(file) -> boolean
ownerStatus(file, { now, staleMs = 90000 }) -> { owner, mine, alive, fresh }
releaseLock(file) -> boolean                // 只删自己的记录
```

路由：

| 方法 | 路径 | 语义 |
|---|---|---|
| GET | `/dsh-loom/state` | 200 + `application/json`，body 是 `runtime.panelState()` 的 JSON；`panelState` 抛错是 500，错误信息在 body |
| 其他 | `/dsh-loom/state` | 405，且在读 runtime 之前拒绝——读路由不接受写，也不允许写顺带读到状态 |
| * | 其他路径 | 404，不是 payload |

`routeState` 是纯决策：一个请求进，`{status, headers, body}` 出。`panelRoute` 的 handler 既可按 `handler(req)` 调用（返回决策，spec 断言的是这个），也可按宿主的 `handler(req, res)` 调用（同一决策写到 res），因此 spec 与宿主不可能跑在两条不同的实现上。
面板的写入口是显式的：只有宿主注册时传入 `write`，非 GET 才在同一路径上交给人处理；不传时该路由只读。

语义：**所有权不是独占访问，是独占派发**——每个窗口都注册工具、都能读；只有心跳最新者跑 `tick()` 派发回合。
`claimOwnership` 是 newest-writer-wins，因此旧窗口不会因为「先启动」而永久占住循环，也不会出现两个窗口同时派发。
`decide` 走的是与工具路径相同的 `checkpoint.answered` 事件（`answer.source = "panel"`），所以面板和模型看到的是同一份决策记录。

## 12. 晋升锁（W20）

```js
// src/loop/lock.js
promotionLockPath(home) -> string                    // <home>/promotion.lock
acquirePromotionLock(home, { owner, now = Date.now(), ttlMs = 15 * 60_000, release = false })
  -> { ok, holder, file, stolen?, reentrant?, since?, expiresAt?, retryInMs?, reason?, release: () => boolean }
releasePromotionLock(home, owner) -> 同上，带 released 表示是否真的删掉
```

语义：锁落在 loom home 而不是 campaign 目录，因为要序列化的是同一棵 checkout 上的写窗口，不是战役状态。
`ok:false` 时 `holder` 一定是当前持有者，`expiresAt`/`retryInMs` 给出 ttl 之后的时刻；持有者也可以主动 `release()` 立即交棒。
`release()` 与 `release:true` 都只释放 owner 匹配的锁；锁被偷后，旧持有者的释放返回 `false`，绝不误删新持有者的锁。
同一 owner 重复 acquire 记作 `reentrant:true` 且不刷新 `at`（否则重试循环会无限续期）；锁文件缺失或损坏时没有可承认的持有者，按空闲处理并替换。

## 13. 守卫路由（W20）

```js
// scripts/guard-plan.mjs
guardPlan({ changed, promotionsSinceFull, fullEvery = 10 })
  -> { mode: 'full' | 'light' | 'related', suites: string[] }
```

语义：守卫的默认实现是 `scripts/test-all.mjs`（好日子 3m41s，坏日子 12 分钟），而一个回合只有约十二分钟，
所以按改动类别路由，但选路必须**过近似**——选择器看不见的改动一律跑全量。

- `src/**`、`package.json` / 各种 lockfile 与构建配置、空 diff、以及任何不在 `src/`、`docs/`、`tests/` 内的路径 → `full`，`suites` 为 `['scripts/test-all.mjs']`。
- 全是 docs（`docs/**` 或 `*.md`）→ `light`，只跑 docs pin（`tests/self11/docs-coverage.test.mjs`）。
- 全是 `tests/**` 且至少一个 `*.test.mjs` → `related`，跑改动到的那些 spec 加 config pins（docs coverage 与守卫自身的路由 spec）；没有 spec 的测试树改动（helper/fixture）可以影响所有 spec，所以回落到 `full`。
- `promotionsSinceFull` 记的是已完成的晋升数，因此紧挨着第 `since + 1` 次晋升的这次守卫运行在该数达到 `fullEvery` 时欠一次全量；它是周期兜底，优先于上面所有窄化。

## 14. 判据指标（W22）

```js
// src/gate/metrics.js
parseMetrics(stdout) -> { killRate, mutants }        // 缺失/非法为 null，永不回落到 0
verifyMetrics({ stdout, status }) -> { metrics, status }
```

语义：变异杀死率 harness 把 `KILLRATE=0.3114` 写在验证器输出里，但过去没有任何回合读过它，
判据只剩二值退出码——杀掉 31% 变异体的补丁与一个也没杀掉的补丁得分相同。这个模块只做「读」：

- 只认整行 `KILLRATE=<0..1>` 与 `MUTANTS=<非负整数>`；名字不在表里、值被别的文字包住、不是十进制数或超出范围，都算「没测到」并保持 `null`。
- **`null` 不是 0**：没有 KILLRATE 行与 `KILLRATE=0.0000` 是相反的事实，前者若被当成 0 会让「没测」冒充「测得差」，所以它永远不参与比较。
- 同一名字出现多次时以最后一个合法读数为准；后面的畸形行不会抹掉前面已经读到的数。
- `verifyMetrics` 只把非 `null` 的度量放进 `metrics`（什么也没打印就是 `{}`），并把 `status` 原样带回；它不替调用方决定晋升。

用它晋升是之后独立的、要有测量的决定，不属于本模块。
