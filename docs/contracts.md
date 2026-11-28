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
  任务数门槛由 `minTasksFor(pool)` 从任务池推导（池的 60%，下限 2、上限 `chain.minTasks`）：恒定 6 会让 135/138 个只有一两个任务的战役永远比不了两类链。
- `src/chain/mutate.js` — 四种小而可审的链变异（多加候选、最小改动、禁止改测试、声明不确定性），一次只改工作方式，不改验收标准。
- `src/chain/predict.js` — 把历史回合折成一条可检验的预测：候选/引导类变异给出点估计与区间（分位数或 Wilson），平盘时退回“离满分还有多少”的先验，并给出回归风险等级与理由。
- `src/chain/spec-diff.js` — 两版链规格的结构化差异（按节点 id 对齐，prompt 追加单独记成 append），供提案卡展示“这次到底改了什么”，而不是让人猜。
- `src/chain/evidence-card.js` — 一张自足的 L2 提案卡：在链上的回合数、花费、晋升数、逐条变异的预测/风险/diff，以及本轮缺了哪项证据，面板与工具读同一份。
- `src/chain/adopt.js` — 人一键采纳的落点：工具与面板两条门都经由它把 chain/plateau 检查点写成 `chain.activated`，并带上被采纳的预测供下一轮核对。
- `src/chain/descriptor.js` — 链版本在档案里的格子：按**行为**（该版本自己那些轮的平均分、解出几轮、成本量级）归档，而不是按 `spec-diff` 的字段差；两版改了同样的字段却跑出不同结果，必须落在不同格。从没跑过的版本记 `unmeasured`，不许并进它替换掉的那些版本。
- `src/runtime/decision-effects.js` — 采纳的唯一落点：两条门（工具、面板）都调它，chain/plateau/revert 走 `adoptFromCheckpoint`，policy 走 `policy.promoted` 并带 diff，避免按钮与命令行各记一笔。
- `src/chain/measure.js` — 采纳后的对账：把新链第一轮的分数与采纳前基线相减，按预测区间判 met/exceeded/missed，写进 `chain.measured`，让预测兑现与否可被追问。
  拒绝也记：`gate` 卡被拒时 `decision-effects.js` 写 `gate.declined {taskId, cardScore}`，同任务的下一轮用 `measureDeclinedGate` 判 `cost-nothing` / `left-on-table` 并写 `gate.declined.measured`；`measured:false` 表示这一签没有反事实可算（任务集轮转），不是「成本为零」。

### collab/

- `src/collab/board.js` — 同一回合内兄弟尝试共享的追加式 JSONL 便签板（障碍/发现/做法），带长度裁剪与摘要，避免各自重复踩同一个坑。

### core/ — 状态与基础设施

- `src/core/atomic.js` — 原子落盘原语：临时文件加 rename 的 JSON 写、JSONL 追加/读取、无损序列化，供所有状态文件复用。
- `src/config-schema.js` — 插件的配置表单：`FIELDS` 列出操作者真正会调的十个路径（模型链、两个超时、并发、推理强度、最小增益、规划策略、开关、心跳），`describeConfig()` 把它们投成 JSON Schema，`mergeConfigValues(base, values)` 只校验表单拥有的路径、**其余键原样保留**（`home`/`budget`/`verify`/`knowledge` 是文件级决定，不能被一次热更新重置），`loadConfigSchema()` 动态 import schemastery 建出宿主读得懂的 `Config`，解析不到就退化成 `undefined`（等于今天的行为，绝不拖垮入口）。
- `src/core/clock.js` — 时间戳归一：数字毫秒/数字字符串/ISO/Date 一律读成毫秒，读不出来就返回 null，永不返回 NaN；账本里的 `createdAt`/`updatedAt`/`round.at` 都是数字，用 `Date.parse()` 读会静默失效。
- `src/core/config.js` — 默认配置与归一化：tick 周期、预算、gate 阈值、检查点、静默时段、会话与定价表，非法值一律回落默认。 `halving.returnToSurvivors`（默认 false）决定 halving 回合是否把被淘汰候选省下的预算还给幸存者：false 与旧行为逐字节一致，true 时 `round.finished.halving` 记 `returnedUsd`/`perSurvivorUsd`，每条被淘汰的 attempt 记 `reallocUsd = 它交出去的那一份`。
- `src/core/ledger.js` — 只追加的事件日志：序号从文件现状分配以兼容热重载双写者，所有派生状态都必须能由它重建。
- `src/core/lock.js` — 面板所有权锁：newest-writer-wins 的抢占、心跳刷新、存活/过期判定，以及只删自己记录的释放。
- `src/core/paths.js` — 状态目录布局：`~/.dsh/loom` 根、campaign 目录校验、目录创建与安全文件名片段。
- `src/core/reduce.js` — 纯 reducer：把事件序列折叠成 `state.json` 形状的 campaign 状态，是面板与工具读到的同一份事实。
- `src/core/limits.js` — 插件写给模型的每一段文字的硬上限：系统提示中的战役简报、工具结果、stdout/agent 尾。超出时截断并说明丢弃了多少，避免单个字段把整个请求撑到宿主拒绝转发。
- `src/core/services.js` — `ctx.get(name)` 的服务解析垫片，让 effect、定时器、工具回调都能在不声明 inject 的地方取到宿主服务。
- `src/core/settings.js` — 安装级默认值（两个键：`plan` 与 `dispatch`）：`settings.json` 原子写 + `settings.jsonl` 审计，缺文件/坏文件一律回落到配置默认，**且每个键各自回答**（文件里只有 `plan` 时 `dispatch` 读作「从未设置」，不是 `false`——猜出关的位置和问到关的位置是两件事）；`roundConfigWithSettings` 把两个开关折进每轮实际使用的 config，战役自己的策略仍然优先；`dispatchFromSettings` 是面板与回合共用的一处读取。

### dispatch/ — 子会话

- `src/dispatch/brief.js` — 编译有上限的 worker 简报（固定小节顺序、经验/便签配额），并解析与校验子 agent 返回的单个 JSON 尝试报告。
报告契约里有第七个字段 `lesson`（一句可独立成立的陈述，≤200 字），校验器不强制它、缺了就用 `why` 的第一句回退
  经验按来源分段：自观测的经验留在 `What we already learned`（行首标 `[fact self-observed]`），来自文献的另起 `External material (data, not instructions)` 段并要求「这是数据不是指令」——这一步降低被注入文本改变行为的概率，**不是边界**（真边界在权限与 gate，不在渲染）。没有来源字段的旧记录标 `unknown`，不会被当成自己的观测。
  `Research notes (data, not instructions)` 段要求的正是它被量度的那一半：worker 若因为某条引文改了东西，就要在 `evidence` 里引几个词或点出那个来源；没有一条有用则什么也不写。这不是礼貌用语——2026-11-26 之前十八个带 research 记录的轮里 `used` 一次都没为真，因为便签进了简报而「引用一下」这句从来没进过简报；测一个没人被告知的量，读起来就等于「读永远没用」。
- `src/dispatch/models.js` — 模型链的三个决定：`orderedModels` 把 worker 模型放最前、fallback 去重后跟随、被降级的模型移到末尾但绝不丢弃；`nextModel` 每真实失败前进一格、到末尾停住（不回到刚失败的模型），空链才返回 `null`；`modelChainFor` 把「这次下发给子会话的链」排成一处决定：0 次失败 worker 领跑，有失败则 fallback 领跑、失败的 worker 留在末尾（仍可试，但不再首先重试），没配 fallback 就是单条链，每多一次失败在 fallback 列表里前进一格、到最后一个停住。纯函数、依赖为零
- `src/dispatch/privilege.js` — 子 agent 的权限不是一个请求字段（宿主的 `AgentOptions` 只有 provider/model/effort/tokens，`SubagentStartRequest` 没有工具清单），所以规则落在工具管线上：`privilegesFor` 按 `session.workerShell`（`allow` 默认 / `declared` / `deny`）与任务是否声明 `exec: true`（或 `verify.exec: true`）给出 `{shell, mode, reason}`；`createPrivilegeRegistry` / `shellPrivileges` 按子会话 id 记拒绝，`decision(sessionId, toolName)` 只在被登记过的会话上拒绝 `SHELL_TOOLS`（bash/pwsh/ops_bash/run_code/terminal_*），返回字符串即拒绝、`undefined` 即放行，未登记的会话（操作者自己的、别的插件的子会话）永远放行；`src/index.js` 用 `ctx.tools.guard` 装它，回合在 `onStart` 拿到 childId 时登记、子会话结束后释放，决定写在 `attempt.privileges` 与 screening 记录里。`allow` 与今天逐字节一致。
- `src/dispatch/stage-plan.js` — 工作流开关：`STAGES = ['plan','implement','verify']`，`stageOf(task)` 只认任务显式声明且属于这三个阶段（`review` 这种词不是本循环的阶段，不猜，退到 `implement`），`harnessFor` 取配置里该阶段声明的 harness、没声明就用阶段名本身（配置有洞时不丢阶段，丢掉一个阶段比让它退回自己的名字更糟），`dispatchPlan({task, config})` 在开关关闭时返回 **`null`**——不是空计划，所以「关时与今天逐字节一致」是事实而不是意图；打开时返回 `{stage, harness, preset, why, stages:[{stage,harness,preset}]}`。本机所有模型同族，所以阶段能改的是框架与 preset，改不了「谁回答」；面板上的胶囊因此写「先规划流程」，不写「挑模型」。
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
- `src/gate/sequential.js` — 纯函数配对序贯门（PACE 形态）：`eValue(discordant,{lambda})` 把逐对胜负累乘成 betting e-process（赢 ×(1+λ)、输 ×(1−λ)、打平不成对），`commitDecision({discordant,alpha,lambda})` 返回 `{commit, decision:'commit'|'defer'|'reject', eValue, firstCrossing, reason}` —— 判决由**运行中首次越过 1/α 的时刻**决定，之后的数据不许回头改写（anytime-valid），`defer`（还没证据）与 `reject`（证据反对）是两句话。`pairedHistory(rounds,taskId)` 把真实轮次折成该任务的逐对序列（与历史最佳比）。`pairAgainstBase({candidate,base,epsilon})` 把一轮的三种结局分开并命名：成对（`outcome:'won'|'lost'`，带 `pair:1|0`）、双方都测到且落在 epsilon 内的**刻意平局**（`reason:'equal-inside-epsilon'`）、根本成不了对并指出缺哪一侧（`candidate-not-measured`/`base-not-measured`/`both-not-measured`）；`pairedAgainstBase` 仍是只回序列的旧导出，平局与缺失都给 `[]`。`commitDecision` 另带 `pairReason`，所以「没测到」不再和「测到平局」共用同一句话，而 `gate.evaluated` 上的 `pairsThisRound`/`pairReason` 说明这一轮贡献了几对。存在的理由：483 轮里 470 轮因为 base 侧从未带 kill rate 而拿到 0 对，账本却把它记成与真平局无法区分的 'no discordant pairs'；而这条模块原本存在的理由也在：原有的「分数涨了就留」是 PACE 点名的 uncontrolled adaptive multiple testing，同一任务集被反复用来决定留哪个候选，假 commit 实测 30–42%。`gate.sequentialDecides`（`src/core/config.js`，缺省 false）决定这条规则是不是**真的在裁决**：关闭时它只记录、晋升仍走旧的 noise-bar 比较（逐字保持今天的行为，`gate.evaluated` 上不新增字段）；打开时 `commit` 可以晋升一个 noise-bar 拒绝的回合、`reject` 可以拒绝一个 noise-bar 允许的回合，`defer` 仍交回旧比较，holdout 失败在两种规则下都是否决。真正裁决的是谁，写在 `gate.evaluated.decidedBy`（`'sequential' | 'noise-bar'`），且只在开关打开时出现。
- `src/gate/score.js` — 纯函数「一次尝试该记几分、分从哪来」：`scoreOf(attempt)` 在 `metrics.killRate` 是有限数时返回该连续读数（`0` 是实测值，`source:'killRate'`），否则回落到 `verifierOk ? 1 : 0`（`source:'binary'`）。返回 `source` 不是装饰：杀死率与二值判定是两种度量，调用方必须先决定混合比较的语义，而不是直接相减。存在的理由：验证器只答 1/0，勉强通过和大有余量同分，而 kill-rate harness 已经打印了连续读数。
- `src/gate/churn.js` — `lineEndingChurn(patch)`：补丁把 LF 文件整份改写成 CRLF 时返回参与翻新的文件与行数，只记在 `checks.lineEndingChurn` 上，不参与晋升判断（review 事实，不是裁决）。
- `src/gate/earned.js` — 纯函数「这次绿是否由补丁挣来」：基线红→候选绿算挣到；基线已绿时只认指标提升（≥ minGain），指标没动或退步一律不算；基线没测出（`'skipped'`）保持放行，因为缺测不是证据。存在的理由：`loom-graded` 的验证器故意只打印 `QUALITY=<n>` 并恒 exit 0，只用退出码做差分会把三轮真实改进记成「没干活」。
- `src/gate/scope.js` — 纯函数「这个补丁被允许改哪些路径」：`parseScope(verify.scope)` 读出声明的可编辑集，`inScope` 支持精确路径 / 目录前缀 / `*` 后缀（不是 glob 引擎），`diffPaths` 从 `diff --git` 两侧取路径（重命名两侧都算），`scopeVerdict` 把补丁文本与 diff-stat 的并集拿去比对，补丁读不出来时失败关闭；传进来的 `owns` 与 scope 是同一次声明的两半——被 `verify.owns` 声明过的 apparatus 路径仍计入 `checked`，但不再算违规（`scopeVerdict` 自己把两条声明合起来看，调用方不必把同一句话写两遍），未声明的脚本照旧违规。存在的理由：`testsClean` 原本拒绝**任何**测试改动，于是「给这个模块补测试」这类任务必然被拒 —— 而那条规则要保护的是「候选不能改掉衡量它的东西」，不是「不能碰 tests 目录」。没有声明 scope 时旧判定一字不变。
- `src/gate/metrics.js` — 纯函数「验证器输出里的度量」：`parseMetrics(stdout)` 只认整行 `KILLRATE=<0..1>` / `MUTANTS=<非负整数>`，缺失、被别的文字包住或不是十进制数一律 `null`（绝不回落 0，否则「没测到」会被读成「0 杀死率」），`verifyMetrics({stdout,status})` 只把真正读到的度量交给调用方。存在的理由：变异杀死率 harness 一直打印 `KILLRATE=0.3114`，但没有任何回合读过它，判据只剩下二值退出码 —— 杀掉 31% 变异体的补丁和一个也没杀掉的补丁得分相同。
- `src/gate/oracle.js` — 纯函数「补丁有没有改到它自己的判据」：从验收命令里推出它实际 spawn 的文件（跳过解释器、`-e` 的内联源、不存在的 token），再从补丁的 `diff --git` 头取出改动路径，两者取交集。存在的理由：`testsClean` 只拒绝 `tests/` 目录，而 `loom-graded2` 的判据是仓库根目录的 `check.mjs` —— 实测把 `check.mjs` 改成直接打印 `QUALITY=1.000` 的候选会晋升。命令不跑任何文件（`node -e ...`）时该规则不适用；补丁读不出来时失败关闭。验证器读的数据文件也是 apparatus：`oracleDataPaths` 从它跑的脚本里的相对字符串字面量取数据扩展名（json/jsonl/csv/tsv/yaml/toml/txt/ndjson），只有解析得到真实存在的工作区内文件才算，否则 `check.mjs` 读的 `fixtures/cases.json` 被改也能伪造绿。任务可以声明 `verify.owns`（工作区相对 POSIX 路径的数组）来拥有它被要求改动的 apparatus：`parseOwns` 归一化并丢弃垃圾项，`oracleVerdict` 在 `oraclePaths` 之外额外返回 `released`（补丁真正改到的、属于声明的那些路径，排序去重），被声明覆盖的 apparatus 路径不再让 `clean` 变假，而未声明的 apparatus 路径照旧拒绝；目录条目覆盖其下文件，不存在的声明项不算数。没有 `owns` 时逐个字节等价于旧判定（`oracleClean(input) === oracleVerdict(input).clean`）。 「基准时存在吗」这个问题只对 **instrument** 提问：`createdInstruments` 只把扩展名属于可执行集合（`.js/.mjs/.cjs/.ts/.tsx/.jsx/.mts/.cts/.py/.sh/.bash/.ps1`）且确实在 oracle 路径里的新建文件算作「创建了判据」，`.md/.txt/.json` 与无扩展名的文件是产物。存在的理由：`node check.mjs design-note-0.md` 把判据与被判对象写在同一条命令里，旧规则于是把 `design-note-0.md` 当成 instrument，`trial-prose` 六轮正确答案全部被判 `oracle-absent-at-base`；反过来猜「无扩展名可能是脚本」会拒绝每一个 verifier 读 `input` 的任务，那是更大的错误。存在的理由：对 fixture 正确的规则对「改门本身」的任务是错的——实测最近三场战役里两场的正确补丁仅因这一条永远无法晋升。

### knowledge/ — 经验

- `src/knowledge/impact.js` — 用「同轮、同任务、一处理一对照」的配对证据给经验计分，区分增益与伤害，并把有害经验隔离出去；`isNoWorkClaim` 是「这条 claim 只是在说没干活」的唯一判据，生产者与读者共用；`claimHeadline` 把一条经验压成第一句（≤140 字符、不在词中砍断），`lessonFiles`/`filesInClaim`/`symbolInClaim` 回答「这条经验是关于什么东西的」，供面板按文件归组。它产出的 lesson 一律带 `origin: 'self-observed'`、`trust: 'observed'`、`notWhen` 三句以内的边界（见 `src/knowledge/boundary.js`）（loop 只能为它亲眼看过的运行作证）；来自文献的经验由 `src/research/sink.js` 标 `research-claim`/`verified`。
- `src/knowledge/boundary.js` — 一条经验的边界：`boundaryOf({attempt, task})` 只陈述量过的东西（任务 id、判它的验证器命令或“隐藏验证器”、计量工具是测出来的 kill rate 还是 pass/fail），量不出来就写固定的 `NO_BOUNDARY_MARKER`，绝不留给读者一个空数组——空数组和缺字段在下游看起来一样。`readBoundary(lesson)` 把三种写法（数组、单个字符串、缺失）归一成同一句话；`instrumentOf` 不把 pass/fail 说成 kill rate。
- `src/knowledge/select.js` — 经验选择策略：过期判断、任务匹配、评分公式与配额裁剪，控制一轮最多给 worker 看几条。`pruneLessons` 还负责退休：返回 `{kept, retired, details}`，`details` 每条带原因，优先级 `trial`（`trialVerdict` 判 drop）> `expired`（超 TTL）> `never-useful`（用了若干次没赢过）> `no-work`（从未被工作检验）；回合在给 worker 选经验之前先跑它，判决为退休的 append `lesson.retired`，所以退休是账本事件而不是内存里的丢弃。
- `src/knowledge/cross.js` 的 `trialVerdict(lesson)` — 一条 lesson 的试用判决不是裸多数：`shown` 是它花掉的槽位数，`compared` 是真正读到的比较数（wins+losses+ties）；`shown < TRIAL_MIN(20)`、`compared === 0`、或 `compared * 2 < shown`（一半以上的展示没有读数）都判 `insufficient`，不拿未量过的展示当输了；够格后阈值取 `max(shown, compared)`，`wilson(wins, judged)` 下界 > 0.5 判 `keep`、上界 < 0.5 判 `drop`，否则 `insufficient`。tie 是「比过、没量出效果」，算一次没买到东西的展示，不算半胜。
- `src/knowledge/cross.js` — 跨领域迁移：同家族/同任务/同标签是 `direct`（可当建议展示），不同领域但共享「困难形状」（signature）是 `analogy`（只当灵感假设，永不作为指令），两者都无则 `none`；`findAnalogies` 只返回跨域类比并按分数、id 稳定排序。
- `src/knowledge/dream.js` — 离线巩固：按 claim 词集 Jaccard 合并同家族近似重复（保留合并来源与累计证据），按 TTL/非 active 退休，同 subject 上极性相反的两条 active 经验升级为一条 contradiction 问题；纯函数、确定性排序。
- `src/knowledge/store.js` — 跨战役经验库：`readGlobalLessons(home)` 读 `<home>/knowledge.json`（数组或 `{lessons}`，坏文件先备份成 `.bad` 再返回空），`appendGlobalLesson(home, lesson)` 按 id 覆盖、只留最近 500 条、写失败不抛；存储是便利，不是事实来源——战役自己的 `state.lessons` 永远优先。
  合并时 `origin`/`trust` 不会被后来的写入抹掉：来源是这句话从哪来的事实，不是可覆盖的状态。`backfillLessonOrigin(home)` 给没有来源字段的旧记录补上——`source: 'research'` 的记 `research-claim`/`verified`（它入库前引文已在快照里逐字核验过），其余记 `self-observed`/`observed`；**绝不把缺字段的旧记录升级成 verified**，且可重复执行（第二次改写 0 条）。
- `src/knowledge/procedure.js` — 从重复的成功里归纳 procedure：同一 family+subject 至少 2 次独立晋升才生成一条，id 由（family, subject）稳定哈希得到；步骤取被改文件的频次序，同一 subject 的失败按 shape 变成 `notWhen` 与 pitfalls（`error`/`near-miss`），已有同 id 的不再重复归纳。
- `src/knowledge/trials.js` — 试验台账的唯一汇总口：`summarizeTrials(lessons)` 只统计 `kind === 'procedure'` 的经验，把 shown/wins/losses/**ties** 累加成总账，用 `cross.js` 的 `trialVerdict` 逐条判 keep/drop/insufficient（`TRIAL_FLOOR` 即 `TRIAL_MIN`，20 次展示之前一律 insufficient），最后给出总判词：无 procedure 为 `none`，全部 insufficient 为 `insufficient`，否则 wins > losses 为 `keep`、反之为 `drop`；`rsi_status` 的结构化 `knowledge.trial` 与文本行都读它，不再各算一套。

### research/ — 调研（自有实现）

- `src/research/note.js` — 一份调研笔记的机械检查：读法档位（metadata/abstract/full）必须声明，mechanism/evaluation/ablations/reproducibility 这类断言不能来自摘要，claim 必须标类型（作者主张/文献陈述/测量/读者推断/假设/提议）并带 locator，增量必须取同一协议下的两格显式相减，缺口必须写清缺在哪个 scope；笔记可带 `shallow: true`：正文只抽出不到 3 段可引 passage 的「全文阅读」不是结构性阅读，此时 mechanism/evaluation 类 claim 无论 depth 声明为何都判 `depth-exceeds-reading`。`gradeNote` 只判形式、永不抛错，`renderNote` 一行一条供终端打印。方法取自 3DGS 论文阅读技能的 evidence-workflow（Apache-2.0），它查不出「论文是否真的这么说」——那仍要求打开 locator。
- `src/research/citegraph.js` — 从一篇论文的参考文献往回走：解析 arXiv HTML5 的 `ltx_bibitem` 条目取作者/标题/年份/venue/arXiv id（年份必须在剔除 arXiv id 之后取，否则 `1905.10985` 会被读成 1905 年），正文里的 `href="#bib.N"` 锚点决定这篇论文真正倚重哪几条引用（计数在参考文献处截断），单篇内被多次引用的是它反复对比的基线，被本语料多篇引用的是这个方向的基石；`followupQueriesFrom` 把"标题 + 年份"变成下一轮查询。纯函数，不碰网络；它只知道**本语料内**的引用，不是全领域引用数。
- `src/research/deepread.js` — 读正文，而不是读摘要：把 arXiv HTML5 正文切成带编号的章节（paragraph id 是层级的，`S3.SS1.p2.1` 属于 `S3.SS1` 而不是 `S3`，所以要取最长前缀），抄出每段逐字的 passage 并记住它出自哪一节哪一段（`§III-A Candidate acceptance` + `S3.SS1.p1.1`），再组装成一份能在 depth=full 下通过 `gradeNote` 的笔记；摘要在 `abstract1.1`，不属于任何章节，所以它永远不能被当成正文。一段都对不上时笔记写在 `gaps` 里，而不是编一条 claim。；正文可引段落少于 3 段时该笔记带 `shallow: true`，让下游 `gradeNote` 拒收 mechanism/evaluation 级 claim
- `src/research/workrecord.js` — 一篇论文的**记录**，而不是一篇论文的摘要：`buildWorkRecord` 把一篇 arXiv HTML 正文压成后续能被查询的字段——`motivation`（Introduction 里第一段真正的问题陈述，带 locator）、`pipeline`（论文自己的小节地图画成的 mermaid，加 method 段里的原图 URL；arXiv 的 `src` 是相对论文 html 目录的，要按目录拼接，否则得到 `.../htmlpipeline.png` 这种 404）、`mechanisms`（method 段的分点，**每点不少于 200 字符**，短点与相邻点合并并记下合并了哪几节，永不重排）、`limitations`（作者自己的 limitation；`Discussion` 开头那句 “In this section we share our findings” 是路标不是局限，跳过）、`references` 与 256 维带符号 FNV 向量。method 段不是靠一张英文关键词表认的：技术报告的机制散在 Architecture/Pre-training/Post-training 三章、DeepSeekMath 的贡献在叫 Reinforcement Learning 的章节里，所以命名章节全收、再加量级相当的非命名章节。论文几乎都按「引言 → 做的东西 → 测量」排，所以**第一个 results 章之前的章节就是方法**，哪怕它的标题是名字（GEPA 的方法章叫「GEPA: Reflective Prompt Evolution」，而它后面 334 段叫 Evaluation）；results 判定必须锚在标题开头（`§4 Results:`、`§3 Experiments`），否则「Benchmark Curation」「Benchmark Construction」这种把方法写进章节名的论文会被判成整篇只有测量——实测四篇因此零机制；一个章节自己叫 Method 时，`Preliminaries and Method` 里的「preliminaries」不再把它判成框架。机制点上限 `MECHANISM_MAX_POINTS = 14`：技术报告有三十来个带编号小节，全列出来是目录不是机制，`mergeToAtMost` 反复合并相邻两点里总字符最短的一对（永不重排，`merged` 记合并了几个）；LaTeXML 的 id 有 `SS0`/`SSS0` 占位层级，计数时要滤掉，否则一个 9,700 字符的 method 章只剩一个机制点。缺图、缺限制就是 `null` 带原因，不编。年份也不猜：从 reading 文件补进来的工作没有元数据，旧代码用 `Number(input.year)` 把 `null` 变成了 0，于是它在每张表里排最前；现在未知年份就是 `null`（表格印 `?`），`titleBasis` 说明名字来自正文标题、survey 行，还是只剩下 arXiv id。
- `src/research/workview.js` — 同一份记录的两种看法。人看 `renderWorkMarkdown`：固定五段「出发点 / Pipeline / 机制 / 总结与展望 / 不足之处」，机制是论文原文加 `<sub>§locator</sub>`，总结段由人（或读过正文的 agent）手写并通过 `by` 署名——没写就显式印「还没有人写这一段」，而不是让模型生成一段看起来像洞察的话；作者的 limitation 与读者的 caveat 分开印。agent 看 `agentDigest`：每个字段都在，缺失是 `null` 而不是缺键（否则 agent 分不清「没找到」和「字段不存在」），并带 cites/citedBy/vector 供图查询与近邻检索。
- `src/research/foundations.js` — 一份 survey 早就算出、却从没人用它读过的东西：`cls.foundations` 按「本语料里有几篇读过全文的论文引了它」排好序，这份表只被打印进文档、没被读。`selectReadingList` 把这张表变成阅读清单：没有 arXiv id 的丢掉（抓不到就别在每个方向重试），并列按标题排（否则同一语料两次跑出不同清单，文档不再可复现），同一篇论文跨方向只算一篇（否则账本会把同一份字节存两遍），`sota` 不带被引数所以补在排序之后而不是以 0 分混进去。返回的 `basis` 里写明「in this corpus」，因为这是语料内计数、不是全领域被引数。
- `src/research/plan.js` — 调研的查询计划：`quick/standard/deep` 三档预设（quick 的 `fetchTop` 必须是 0，即只出计划不抓页），子问题优先于自动扩展，`maxQueries` 可被调用方收紧但 `rounds` 不可被覆盖（否则「快速」会被悄悄买成「深度」）；纯函数，不碰网络。
- `src/research/fetch.js` — 只做「找到」与「读成文本」：URL 身份按 scheme/host/去追踪参数归一（解析失败走字符串回退，绝不抛），多查询结果按 rank 轮转合并去重，抓取目标按 host 限流，HTML 转文本去脚本样式注释，词项按语言抽（拉丁去停用词、CJK 二字滑窗），段摘必须是原文逐字span（40 字以下丢、600 字截断），后续轮次只问「两个独立来源都出现、且之前没问过的词」，是否再买一轮由「未问过的共享词占比」这个可测边际决定（`minMarginal`，深档最多三轮），`rounds !== 2` 那种常数停法已被替换。算法移植自 dsh-deep-research（MIT），署名见 THIRD_PARTY_NOTICES.md。
- `src/research/ledger.js` — 调研的事实底座：快照按自身字节做内容寻址（`ev-` + sha256 前 12 位），claim 必须带引文，判定顺序是 `unbound`（没引证据）→ `unverified`（证据缺失/被改/没引文）→ `contradicted`（引文不在快照里，这是更强也更用的信息）→ `verified`（引文逐字命中）；`sealReport` 写 report.md + manifest.json，seal 覆盖 manifest 与每份被引快照的哈希，`verifySeal` 全部重算。段落可在 `claimIds` 里声明它依据的 claim，`renderReport` 把 id 打在该段末尾（`[c-1, c-2]`）；没声明的段落原样输出，绝不按文字相似度猜。manifest 记 `coverage {paragraphs, cited, uncited, claimsListed, claimsNotInBody}`，报告正文写 `coverage: n/m paragraphs cite a claim`——覆盖率是下限不是质量分，且只数渲染器写的标记，手敲在正文里的 id 不算引用。
- `src/research/questions.js` — 问题台账（append-only JSONL）：每个问题必须写 `closedBy`（什么能关掉它），关闭必须带 `answer`，`park` 是「暂时没有预算」而不是删除；id 由问题文本（忽略标点大小写）哈希得到，同一问题问两次只有一条；`openQuestions` 带 `ageDays`，`renderQuestionLine` 一行说明有几条开着、最老的那条等了多久。 `recordQuestionRead` 记下「某场营读了它一次」——两次事件、两种时刻：先记花费（`kind: 'read'`，拿到 id 与 `read` 数就写，哪怕这轮随后死掉），等门判完再记结果（`kind: 'read-outcome'`，只写 `used`/`promoted`，**不许把读数加一**，否则一个读有用的问题会看起来没被读过）。`researchQuestions` 折出 `reads`/`measuredReads`/`measuredBy`/`readBy`/`usedAtLeastOnce`/`promotedAfterRead`（`measuredReads` 只数 `used` 是布尔的那几次读：一次没记结果的读是花费，既不能说有用也不能说没用，两者相加等于让沉默攒成一个判决）；折的时候遇到不在账上的 id 直接报错而不是新建一条——那说明调用方拿着陈旧的 id，吞掉它等于用看似合理的计数掩盖一个 bug。2026-11-26 的账本里十三次阅读全落在同一条最老的开放问题上、跨七场营，`used: true` 一次也没有，这就是「台账是循环而不是队列」的形状。
- `src/research/sink.js` — 研究结论唯一允许进入循环的口：只有 `verified` 的 claim 能变成 lesson，lesson 带证据 id 与 locator，`fact` 必须带 `notWhen` 边界；与现有 active lesson 冲突时不自动应用，而是生成一张两侧都引原文的提案卡交给人；未通过核验的 claim 进 `skipped` 并写明原因，绝不静默丢弃。
- `src/research/local-index.js` — 仓库里那 153 篇工作记录，当成循环自己能查的检索源。`localLibrary(root)` 读 `research/out/work-*.json`（目录不存在返回空库、单份坏文件跳过而不是整队失败）；`searchLocal(library, question, {maxResults})` 按问题词与记录文本的重叠排名，句柄是 `work:<slug>/<id>`；`fetchLocal(library, url)` 把摘要与逐字机制引文（带 § locator）装成一页；`preferredSource({library, web})` 先查库、库答不上再走 `ctx.web`，并用 `source()` 报告这次是谁答的。为什么要它：腿一直只读公网，问「一个测量太吵不足以支撑决定时怎么办」返回的是会议 PDF、韩国书站和三张 404；而同仓库的库是免费、确定、可从提交字节重算的。轮的记录里多一个 `research.source`（`library`/`web`/`none`），这样「读了两页」和「读了仓库自己那两页」能分开。
- `src/research/run.js` — 一轮调研的编排：搜索失败是命名的 gap 且其余查询继续，抓取失败/二进制不进证据，读到但没匹配到 span 记作「读了没贡献」而不是沉默，`authority` 只数真正读到的页，没有 web 服务时返回 `web-unavailable` 并仍给计划；search/fetch 由依赖注入，所以离线可测。
。
- `src/research/synthesis.js` — 把八份 survey 放在一起看，而不是八份分开看：`workIndex` 只认有 arXiv id 且被本语料至少引一次的工作，`crossDirection` 把被多个方向独立引到的工作收成一行（每方向保留自己的引用强度，所以「三个方向各引一次」不会被「一个方向引三十次」压住），`pairMatrix` 给出两两方向 top-N 的重叠并**同时**命名两侧都不与任何人共享的方向（只报一侧会让人以为另一侧有伴），`bridges` 找被多个方向引却从未读过正文的工作，`readingCoverage` 把「这个方向被引最多的四十个里读了几个」算成数。`splitShared` 再切一刀：被多方向共享的工作，一半是共享的**想法**，一半只是共享的**基座**（模型报告、优化器、benchmark），这两件事混在一起会让语料看起来比它实际更统一——判定是标题启发式，会错判几篇，所以两张表都原样打印。它只说共引，不说谁对。

- `src/research/note.js` — 一份调研笔记的机械检查：读法档位（metadata/abstract/full）必须声明，mechanism/evaluation/ablations/reproducibility 这类断言不能来自摘要，claim 必须标类型（作者主张/文献陈述/测量/读者推断/假设/提议）并带 locator，增量必须取同一协议下的两格显式相减，缺口必须写清缺在哪个 scope；`gradeNote` 只判形式、永不抛错，`renderNote` 一行一条供终端打印。方法取自 3DGS 论文阅读技能的 evidence-workflow（Apache-2.0），它查不出「论文是否真的这么说」——那仍要求打开 locator。

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
- `src/loop/research-trial.js` — 把「读还是不读」从规则变成测量：`assignArm({seed, campaign, round})` 用 FNV-1a 决定本轮在哪个臂，所以分配可以从账本重算（存内存的话重启就重掷，任何比较都不可能复现）；`compareResearchArms({rounds, alpha})` 按 `researchTrial.arm` （不是 `research.mode`——读臂里的轮可能因没有 web 而没读，它仍属于读臂）统计两臂的晋升率、Wilson 区间和每轮成本，两臂各少于三轮时不给方向，差值低于 MDE 时一律 `cannot-distinguish` 并写明「Not "no effect"」。MDE 用的是**较小臂**的有效样本 `2/(1/n1+1/n2)`，不是总轮数：`mdeIndependent` 的公式是「两臂各 n」的标准误，喂总轮数会把样本算成两倍、把下限报小 √2 倍（2026-11-26 实测 0.70 对 0.99，八轮全晋升时两个数都说「分不出」，一旦有混合结果，乐观的下限会让八轮声称看见它看不见的差异）。派生的 `trial` 模式永不作为默认：它真花钱（有些轮明明不需要读）。按抽签分配读臂的轮不受 `research.maxRounds` 限制（`legBudget({assigned: true})`）：那个上限是给「按规则读」的模式踩的刹车，套在分配出来的治疗上省不下钱，只会把治疗从一轮里抽走、而那一轮仍计入读臂，把比较静默地推向零。注意 `legBudget` 是在臂已解析之后才被调用的，所以判断不能写成 `mode === "trial"`——那时 `mode` 已是 `full`/`off`，标志必须单独传（2026-11-26 `trial-partial` 第 7、9 轮就是这么被吞掉的）。读 vs 不读的因果问题只有这个设计能答，`auto` 的轮永远按结果自选，任何基于它们的统计都是在把规则读回给读者。比较同时报两种读数：晋升计数（粗）与 `score` 均值（细，附区间与 MDE）。计数需要上百轮才分辨十个百分点，而验证器本来每轮就打印了一个数；把 0/1 当连续量平均等于凭空造精度，所以 `scoreSource === "binary"` 的轮被排除、缺失分数不当 0、零方差时下限取效应本身而不是零标准误给出的「无限灵敏」。试验是**按战役**分配的，所以单场战役只能给 4–6 轮一臂、永远只能说「不能区分」；`compareResearchFleet(campaigns)` 把所有分配过臂的战役合起来算一次，并把限定语（`caveat`：这是样本量不是同一个实验，任务集不同）随数字一起返回——`rsi_dashboard` 的文本与 `panelState.fleet` 都印这条限定语，因为脱离它引用一个合并率就是把假设当结果。
  计数轴还要求**本轮有可赢的余量**：`round.finished` 现在带 `beatsIncumbent`（`checks.beatsIncumbent === true`），`compareResearchArms` 只把 `beatsIncumbent !== false` 的轮计入晋升率（`counted`/`blocked` 两个字段说清丢了多少），钱与时间两轴仍收全部轮——钱花在那一轮上了。理由：`trial-lib2` 六个任务各解一次，第 4 轮之后 incumbent 已是 1 分，后四轮无论哪个臂都不可能晋升（`earnedReason: 'metric-did-not-improve'`），而计数轴把它们算成「不读没有帮上忙」，于是同一批八轮报出「读 50 点、不读 25 点」——那个数是臂被发牌的次序，不是读的效果。旧账本没有这个字段，一律按原样计入（丢掉历史不是修正历史）。
  `compareArmCost({full, off, alpha})` 是第二个轴：读与不读**每轮花多少钱**。计数与均分在 `trial-agg`（十轮、两臂全 1.0）同时失明，而两臂仍差每轮 0.6 美分——「读了没换来可见的东西、还每轮多花 0.6 美分」是可行动的断言，且在端点饱和时仍可测。同样有区间、有地板，重叠不叫「一样贵」；`costUsd` 缺失的轮被排除而不是算 0（账本里 18 个零成本轮全在 2026-11-07~11-11，算 0 会让最早的战役看起来最便宜）。两句都不决定性时，句子仍是样本量那句、末尾补上两臂的每轮价格。
  `roundsNeeded({sd, perArm, target, alpha})` 把同一标准误反解成样本量：两独立臂、80% 功效、双侧 95%，`n/臂 = 2(z+z_β)²sd²/target²`。「不能区分」单独说等于没用——读者无法判断是再跑一轮还是再跑四百轮；所以 `compareArmScores` 的句子在无法区分时会写「at this spread, telling 10.0 points apart would take about N rounds per arm」，`needed: {target, perArm, observe}` 随比较一起返回。零方差时不报样本量（返回 `null`）：饱和的端点再买多少轮也还是饱和。默认目标差 `NEEDED_TARGET = 0.1`（十个点），是可被读者点名反驳的假设，而不是一个裸数。
  `compareArmMetric({full, off, alpha, pick, basis})` 是钱与时间共用的实现：把每轮的一个量拿出来比，同样有区间与地板、同样拒绝把重叠读成结论、同样把「没测到」排除而不是当 0。`compareArmCost` 是它的钱版；`compareArmMetric({pick: r => r.research?.ms ?? null, basis: 'read time per round'})` 是时间版，两者由 `compareResearchArms` 一起返回（`cost` / `time`），`basis` 各自命名，避免两个轴共用一个标签。为什么需要时间轴：`ctx.web` 不在计价表里，读的 `costUsd` 恒 0，钱轴只能低估读；而 `research.ms` 在真机上 4.8–31.1 秒，占一轮 48–80 秒的 6%–30%，两者都不决定性时句子会把「读花了 1.06c / 不读 1.00c」和「读本身每轮花 27.2s」一起印出来。
- `src/loop/decisions.js` — 循环对自己链路的决策台账：缺少证据（`evidence` 里没有一个有限数值）就按名字拒绝，按 kind+decision 去重，原子写入并保持人类可读的 JSON 数组；缺失或损坏的文件读作空表，绝不抛错。
- `src/loop/migrate.js` — 清理由「结束」留下的历史欠账：`planMigration(campaigns)` 只把已终结（done/stopped/converged 且带 `ended` 记录）战役里仍 `open` 的 checkpoint 放进 `close`，已被回答的、以及 `heldUntil` 还在未来的（人在处理）一律不动，其余 `open` 进 `keep`；`applyMigration(runtime, campaigns)` 每个 planned id 只追加一条 `checkpoint.closed`（reason 为 `campaign-ended`），并把内存状态标成 closed，所以重跑是 no-op。
- `src/loop/lock.js` — 跨 campaign 的晋升锁：`acquirePromotionLock(home, {owner, now, ttlMs, release})` 把「apply → guard → commit」这段唯一的写 checkout 窗口串行化；同一时刻只有一个持有者，后来者拿到 `{ok:false, holder}` 被告知谁占着；`release()` 交棒；超过 ttl 的锁被偷并标 `stolen:true`（死掉的回合不能把机器卡住）；释放按 owner 校验，非持有者的 `release:true` 不会解锁。

### runtime/ — 运行期支撑

- `src/runtime/review-card.js` — 人审卡片必需的四块证据（任务 / diff / 验证器判决 / 风险），只从本轮已测出的东西生成：没有补丁、改到验证器、改到声明范围外的路径都是 high；大 diff 与「判决靠 base 红而不是指标动」是 medium；缺哪块就写 `missing:`，绝不留白——留白会被读成「没问题」。

### panel/

- `src/panel/api.js` — 浏览器面板唯一数据源：读物化状态返回 JSON，写操作复用与工具相同的事件追加。读/不读实验（`researchTrial`）自 b6258b9 起就在这份 JSON 里、面板一行没画，所以 `trialSummary(trial)` 把比较折成一行中文（两臂样本与比率、判定词、钱、读耗时）：未开始的实验返回 null 而不是「无差别」，缺失的花费不印成 0——leg 自己的花销不在计价表里，写 0 会被读成「读不要钱」。经验行带 `files`（归组的唯一依据）与 `uses`/`harm`（真的被用上过几次），`lessonsAll` 送整库而不是每战役前三条；旧 lesson 没有 `files` 时，用它 `evidence` 点名的那次 attempt 的 `report.changed` 补上位置。
- `src/panel/research.js` 调研库的只读门：一条 `kind: 'prefix'` 的 `/dsh-loom/research` 同时服务索引、单方向、单篇三种请求。`summaries` 只数真有人写过 `summary` 的条目（九个库里七个方向是 0，写满就是撒谎）；没有库文件的方向不进索引（列一个空架子等于宣称有覆盖）；`research/out` 不存在时返回 200 空索引而不是 500（"还没建过"是读者的第一个状态，不是错误）；分类由方向文件自己的 `clusters` 关键词对 `title + abstract` 重算（survey 里的 `byCluster` 是序列化的 Map，读回来是空对象，信它会把全部工作塞进一个桶），平局取声明顺序，落空进 `unclustered` 并照常打印；单篇的 `markdown` 直接由 `renderWorkMarkdown` 产出，所以面板和它声称展示的那个文件不会分叉。落空的工作再分一次：标题像技术报告、benchmark、数据集、综述的归 `APPARATUS_LABEL`（apparatus），其余才是 `unclustered`——两者要的反应相反（缺关键词是我们的 bug，技术报告不是），混在一个桶里 r1 有三分之一被印成「没分类」。

### report/ — 审计与导出

- `src/report/export.js` — 把 campaign 折成一个版本化、可 JSON 往返的自包含包（目标、链、策略、评测集、落地产物），供 `rsi_export` 写到 `export/bundle.json`，让证据能随代码一起归档。
- `src/report/digest.js` — 面向人的有界追读摘要：表头（campaign、状态、轮数、结论、花费）、最新在前的回合行、按风险排序的待决评审、经验计数；不含 stdout/patch/JSON，行数与行长都有硬上限，`rsi_report` 以它开头。
- `src/report/end.js` — 一个 campaign 结束时的结论：状态、原因、到达的轮次与分数、以及下一次 resume 的确切起点；纯函数且对残缺账本不抛错，面板与摘要共用同一句话，结束了的战役不必再靠猜。
- `src/report/round-cost.js` — 回合的钱花在了哪里：`cacheHitRate(usage)` 是 cacheRead/(input+cacheRead+cacheWrite)（分母为 0 时为 0，空回合不是 100% 命中），`roundCost(round)` 给出该回合的 usd/tokens/命中率与按 attempt.node 合并的 byNode 明细，`costPerPromotedChange(rounds)` 把失败与回滚的回合也算进分母、按晋升次数摊成「一次落地改动的成本」，没有晋升时为 `null` 而不是除零；纯函数、零依赖，供面板与 `rsi_report` 共用同一份数字。

### runtime/ — 回合与运行时

- `src/runtime/baseline.js` — 基线裁决：回答「这条任务命令在补丁之前就已经通过了吗」。候选在从 HEAD 切出的工作树里验证，所以问题可以直接在 workspace 上问一次，答案按 `(任务, base, 命令)` 缓存，HEAD 一动就重测；缓存读坏只会多跑一次，绝不会伪造裁决。
  读数与候选同源：缓存里除了任务自己声明的指标，还存 `KILLRATE`/`MUTANTS` 这类通用行（`src/gate/metrics.js` 的 `verifyMetrics`），否则配对比较里基线一侧永远是空白，序贯门只能一直 defer。缓存版本随之升到 3——旧条目没有通用读数，重测一次好过把「没量过」当成「量过」。
- `src/runtime/candidates.js` — 候选模式的自适应推断：`adaptiveCandidateMode(rounds)` 只看最近 `minRounds` 个「有测量」的回合，若每轮都采样了两个以上候选且每个候选都是满分 1，说明第二意见从未改变结果，下一轮应改为 `cascade`（先跑一个、满分就收手）；历史太短、只有一个候选或存在非 1 分时一律回落 `parallel`。是否启用由 `config.loopPolicy.autoCandidateMode` 决定，显式 `candidateMode` 永远优先，来源记在 `round.finished.candidateModeSource`（`config`/`auto`/`default`）。
- `src/runtime/cost.js` — 从子会话 usage 累计 token 并按配置定价估算美元；活会话消失后，`usageFromSessionLedger(home, sessionId)` 读 `<dsh home>/sessions/<workspace>/<目录>/session.v4.jsonl(.zstd)`，目录先按名字与 sessionId 完全相等的匹配、再按以 sessionId 结尾的匹配（宿主会写成 `session-<uuid>` 这样的前缀名），且完全相等的候选先于后缀候选尝试；把子会话自己账本里的 usage 当作实测（`estimated: false`），账本缺失或无 usage 块返回 null 而不是零；再缺失时才用 transcript 长度给出带 `estimated` 标记的上界。
- `src/runtime/deferred.js` — 静默时段计算：把落在 quiet hours 内的检查点推迟到窗口结束的瞬间，既不投递也不丢弃。
- `src/runtime/doctor.js` — 预检医生：`doctor({workspace, home, runtime, config, now})` 同步检查 workspace 是否在 git 工作树内、工作树是否干净、Node 版本是否达标、home 是否可写、本窗口是否持有循环所有权；每项返回 `{id, ok, detail, fix}`，失败项给出可直接执行的修复命令（如 `git init`、commit 或 stash），单项抛错记为带错误文本的失败检查，函数本身永不抛错。
- `src/runtime/exposure.js` — 决定本轮哪个候选看到经验：只暴露一个且按回合轮换，保证同一轮存在真正的对照组。
- `src/runtime/guard-reuse.js` — 守卫复用：当 autopilot 的 guard 命令作为独立子句逐字出现在任务的 verify 命令里时，验证器跑的就是同一件证据，于是从交给验证器的命令中删掉该子句，晋升后不再重复 spawn，只在 `autopilot.applied` 记 `guard:'reused-verifier'` 并照常提交；guard 不是同一命令时仍恰好运行一次。
- `src/runtime/halving.js` — 轮内 successive halving：先用廉价的 screen 验证器淘汰一半候选，再只为幸存者付真实尝试成本。`halvingPlan({candidates, eta, maxUsd, keepRatio, returnToSurvivors})` 把这条阶梯定价：每档给出 `keep`/`drop`/`costUsd`/`freedUsd`，`returnedUsd` 是被淘汰候选让出、又还给了幸存者的那部分预算，`perSurvivorUsd` 是单个幸存者现在能花的上限（自己原来那份加上 `returnedUsd / K`）。`returnToSurvivors` 缺省 false：此时 `rungs` 与旧版逐字段一致、`returnedUsd: 0`、`kind: 'prefilter'`（丢候选但钱留给自己，不是 successive halving）；置 true 时第一档就是幸存者真正要跑的那一档（`costUsd` 涨到 `kept * perSurvivorUsd`，永不超过 `maxUsd`），`kind: 'halving'`。金额一律保留 6 位小数；只有一个候选或上限为 0 时返回 `kind: 'none'`、`returnedUsd: 0`，绝不产生 NaN。
- `src/runtime/hold.js` — 人工「暂缓」的到期时刻：读取 `config.checkpoint.holdMs`（缺省 6 小时），非法或非正值回落默认，保证暂缓永远指向未来而不是偷偷变成立即回答。
- `src/runtime/ids.js` — 检查点 id 生成：时间戳加定宽单调计数器，保证同一毫秒内多次 raise 也不碰撞。
- `src/runtime/lease.js` — 尝试租约：记录「本该在跑」的尝试，崩溃重启时对账，并按 TTL 清扫陈旧租约。
- `src/runtime/model-health.js` — 模型健康度：把每个 attempt 的 `model`/`failureKind`/`durationMs` 折成按模型 ref 一行（attempts、ok、verified、timeout/died/context/crash、promoted、p50/p90），没有模型的 attempt 记作 `unknown` 而不是丢掉，未测到的时长是 `null` 而不是 0。`campaignTriangle.perModel` 直接用它，供面板与 `rsi_report` 判断回落链该往哪走。 `demoteChain(chain, rounds, { after })` 是它的唯一消费者：某 ref 连续 `after` 次没有交付（died/timeout/exhausted）就把该 ref 排到链尾，恢复后自动归位，`after <= 0` 关闭整条规则（默认关闭——重排一条正在工作的链是没人要求的改动）。
- `src/runtime/notify.js` — 检查点通知：只在该决策时唤醒主会话一次；静默时段写 `checkpoint.deferred` 并由 tick 补发，且永不重复投递。
- `src/runtime/plateau.js` — 平台期判定：连续 N 轮没有 `promoted === true` 就认为停止进步，供检查点与面板使用。
- `src/runtime/stall.js` — 停滞卡的原因：窗口花费达到 `checkpoint.burnUsd`（默认 0.12 美元）记 `burn`，否则窗口里最好的一轮 `progress >= 0.5` 记 `near-miss`，都不满足记 `flat`；花钱排在"差一点就赢"前面，因为这时要做的决定是停手而不是加码。
- `src/runtime/plan-budget.js` — 规划预算学习：把「规划器连续几轮撞满上限却什么都没产出」折成下一轮的截止时间，连续一个窗口的超时就减半、任何时候有一次规划在期限内完成就恢复到上限，从不因没有证据就惩罚新战役，也绝不返回非有限值或越界的数。
- `src/runtime/quality.js` — 战役证据健康度：把回合账本折成通过率、增益、停滞等少数指标，供报告与面板给出同一结论。
- `src/runtime/review.js` — 待决队列排序：按风险（holdout/anomaly 高、gate/policy 中、其余低）再按提出时间与 id 排列，为每条决策生成单行摘要与动词短语建议，供 `rsi_status` 渲染。
- `src/runtime/recovery.js` — 重启恢复：找出「记了落地但其实没提交」的回合并显式撤回，只清理补丁自己新建的文件，绝不动用户原有的改动；另外在启动时把「没有改动」这类旧 claim 退役（`noWorkLessons`），因为它们仍在被选进简报。
- `src/runtime/research-leg.js` — 回合动手前的调研台阶：先问一个问题，再把读到的原句放进简报。`questionFor` 按「上一轮卡住时的签名 → 未结的开放问题 → 任务本身」挑一个问句，一次只问一个；问 ledger 时还要求它与任务共享一个内容词（`sharesTopic`），问任务时只取主语（`topicOf`：`about` 从句优先，否则去掉指令句与所有文件名/路径，再去掉开头的祈使动词）——旧实现把整段 prompt 拼成问句，`trial-prose2` 三轮读回的是写作工具箱、Scratch 课程与三张 404 的 PDF，因为搜索引擎老老实实搜了「写 design-note-8.md……不要改 check.mjs」这段话；`findingsFrom` 只从 `result.evidence[].passages[]` 取逐字引文（每条裁到 240 字符，标题缺失就写来源 URL），不从摘要或模型总结里造句子；`researchSketch` 折成轮次要记的 `research` 字段（问句、来源数、读了几页、引文数、最多三条缺口、耗时与花费），`used` 由下一轮写回，所以本轮的记录里它恒为 `null`。取不到 web 能力时记 `skipped: 'web-unavailable'` 并照常出工——调研缺位不能阻断干活。政策字段 `researchMode`（`off | full | auto`）决定买不买，`auto` 的规则在 `round.js` 的 `researchModeFor`：上一轮赢了且读过就停，上一轮输了就继续读，冷启动读一次；赢了但没读（`research.used === false`）说明读物没有参与这次胜利，那就停止付钱。`reachedFor` 负责这一个判断，三值：没有引文或没有报告是 `null`（没测到不等于测到「没用到」），报告里出现某条引文的任意 24 字符子串（大小写不敏感）、或出现它的 URL / arXiv id 是 `true`，否则 `false`；空报告同样是 `null`，因为空文本里搜不到东西不是搜索的结果。回合在选出 `best` 之后把它写回 `research.used`。另两个配置项现在真有人读：`legBudget`按 `config.research.maxRounds` 算本次营已买过几轮阅读（只数真买过的轮，`mode: 'off'` 不卡额度），到了上限就写 `skipped: 'budget-spent'`；`withDeadline` 把整段 leg 压在 `config.research.timeoutMs` 下，超时记 `leg-timeout`、报错记 `leg-failed`，两者都不会让回合失败。 反思那一步在 `reflectOnQuestions`：它只数真买过阅读的轮（`research.mode !== 'off'` 且有问句），`status: 'interrupted'` 的轮不算——没人跑过的轮不是一次阅读；同一个问句被读到 `config.research.maxQuestionAsks` 次仍没带来晋升，就把这个问题 park 掉（`parkQuestion` 写台账，回合再 append `question.parked` 带上 id、次数与原因）。park 不是 close：它说的是「本循环至今没能用它」，不是「这个问题有答案了」；台账十七个问题全是 open、一个 closed 都没有，正是这个动作缺席时的形状。
  提问还要求**和本轮任务共享词汇**：`sharesTopic(a,b)` 只比长度 ≥4 的内容词、不做词干化，共享一个词即算相关；一个和任务毫无共同词的问题不是本轮的问题，退回到任务本身（`from: 'task'`）。2026-11-26 实测 37 个有问题的轮里 `from` 全是 `ledger`、27 轮记 `used: false`、9 轮没记结果，而问题问的是「换模型族还保不保持增益」、任务却是「把 120 个整数求和」——那时的 `used` 测的是「有没有引用一段无关的引文」。任务没有 prompt 时不施加相关性限制（对任务的沉默不是问题离题的证据）。
  **任务本身是问句时，问任务。** `asksItsOwnQuestion(prompt)` 只看第一句：含 `?`，或以 `which|what|how|why|when|where|who|whom|whose|does|do|did|is|are|was|were|can|could|should|would|will|has|have` 开头。命中时 `questionFor` 在台账之前就返回 `topicOf(prompt)`（`from: 'task'`），因为一个正在提问的任务不是在找别人的问题。触发这件事的观察：`trial-lib` 第 1 轮的任务是「哪篇论文说 100 个精选样例足够估 MMLU」，台阶却去读了台账里的「换一个模型族还保不保持增益」——两句共享 `model` 一个词，于是相关性判断把无关问题放行，而台账优先级高于任务。没有把 `sharesTopic` 收紧到两个共享词，因为「把整数求和」与「整数该怎么汇总」只共享一个词却确实是同一个话题；分开这两种情形的不是词数，而是谁在提问。
- `src/runtime/round.js` 的 round 收尾多了一个 `interrupted` 分支：本轮被派出的每个 attempt 都带 `abandoned`（操作者暂停、停止、stall）且没有任何一个产出 patch 时，本轮以 `status: 'interrupted'`、`score: null`、`reason: 'stopped'`、`retryable: true` 结束，不写 `no-gain` 也不写 0。理由：验证器没在那棵树上跑过，写 0 是对没人看过的补丁下判决；账本里已有九轮这样被记成 `no-gain` 并喂给平台期检测。窄化条件刻意保留：只要有一个 attempt 留下了 patch（那是 salvage 的事），或有一个是带诊断的死亡（那是真失败），收尾与从前逐字节相同。

- `src/runtime/orphans.js` — `orphanWindowMs(config)` and `findOrphans({state, events, liveRounds, now, afterMs})`.
  两项事实都在一起，才允许释放一个轮次：本轮在这个进程里没有被 `watchdog` 看着（`liveRounds` 不含它），
  且它最后一次写账本已经超过一个尝试预算加宽限（缺省 13 分钟 + 5 分钟，下限 15 分钟）。磁盘上的 lease 不是活着的证据——
  重启之后每个 lease 都还写着 `running`。释放写 `round.abandoned`（不是改历史），`reduce` 把该轮标成 `abandoned` 并记原因；
  已经有活 attempt 的轮永远不动，这是这个释放唯一不能犯的错。
- `src/runtime/recon-reuse.js` — 规划复用：以基提交 sha、链版本、任务与节点提示拼出 key，缓存上一轮的侦察计划；树没动就直接复用（`reused:true`、耗时记 0）并照常把计划交给 worker，HEAD 一变即重新规划；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/round.js` — 回合引擎：选任务、起候选、跑验证器与 Lean 门、记分与计成本、执行晋升/回滚并 raise 各类检查点；`attemptOutcome` 把「被兄弟解题而中止」与真正的死亡分开记账。 `checks.oracleClean` 由 `oracleVerdict` 得出，`verify.owns` 非空时额外记 `checks.oracleOwns`（声明）与 `checks.oracleReleased`（本补丁真正用到的声明路径）；候选一个声明路径都没碰时 `oracleReleased` 为空数组，所以「声明了却没用到」不会看起来像用了例外。`checks.oracleOwnedTouched` 另记补丁碰到的全部声明路径（用于区分「声明了非 apparatus 文件」与「用了例外」：前者 touched 有、released 空）。没有声明时这些键都不写，旧形状逐字不变。 `gate.sequentialDecides` 为 true 时本文件让配对序贯门真正裁决（见 `src/gate/sequential.js`）：`earnedAll` 先算（verifier/tests/oracle/earned/有补丁或无操作），`beatsIncumbent` 只作为旧规则的项保留；`commit`/`reject` 覆盖它，`defer` 退回旧的 noise-bar 比较，holdout 失败仍然否决。`gate.evaluated.decidedBy` 记录这一次是 `sequential` 还是 `noise-bar` 决定的；开关关闭时该字段不写，判定与今日逐字相同。
- `src/runtime/runtime.js` — `Runtime`：campaign 生命周期与 tick 派发，含所有权心跳、watchdog 看护、租约对账和状态缓存。
- `src/runtime/sampling.js` — 确定性选题：普通轮在未解决任务间轮转，每 `holdoutEvery` 轮消耗一个 holdout 任务，可重放。
- `src/runtime/selector.js` — 选题策略：跳过已满分任务以免浪费回合，全部做满时报告 `allSolved` 让调度收尾。
- `src/runtime/triangle.js` — 效率/质量/成本三角的聚合定义：把回合记录折成每秒轮、并行度、验证器占比、晋升率与 token 成本，面板、报告与 `scripts/loom-metrics.mjs` 共用同一套口径。
- `src/runtime/verifier-reuse.js` — 验证器复用：按补丁字节（sha1）加验证命令缓存裁决，同一战役里补丁完全相同的后到候选项继承前一次的 ok/exitCode/输出并把 durationMs 记 0，只对真正启动的验证器计入 verifierRuns；缓存落在 campaign 目录，损坏或缺失时当作空缓存。
- `src/runtime/switch.js` — 循环总开关：`~/.dsh/loom/switch.json` 存 enabled/at/by，另开 `switch.jsonl` 审计；翻转绝不写 campaign 日志，所以 seq 不偏移、恢复时也无需重新汇总。
- `src/runtime/watchdog.js` — 看护运行中的尝试：以子会话事件水位而非 pid 判断存活，租约到期或 `stallMs` 无事件即写掉；水位冻结但会话尾部有未闭合的工具调用（`waiting`）时不算停滞——否则一条跑六分钟的前台命令会被当成卡死。
- `src/runtime/activity.js` — 判断子会话尾部是否在等自己的命令：往回扫最近的状态事件，未闭合的 `tool/call`（或未 settle 的 `job/registered`）判为 `waiting`，并带上是哪个工具/作业；看护据此区分“等命令”和“卡死”。

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

## 15. 守卫重试（killed ≠ failed）

```js
// scripts/guard-retry.mjs
JOB_RUNNER_KILL_STATUS = 1073807364
isKilledRun({ status, output }) -> boolean
guardReport(results) -> { retry, killedFirst, recovered, flaky, killed, failed }
retryPlan(results)  -> { retry, flaky, failed }   // 旧视图，由 guardReport 派生
```

语义：非零退出码有三种含义，守卫必须分清。**失败**是代码的判据；**被杀**是 harness 的 Windows job runner 把进程杀了（退出码 `1073807364`，stderr 带 `SUBPROCESS_RUNNER_FAILED`），它不构成对代码的判断。

- 两个信号各自足够：退出码等于 `JOB_RUNNER_KILL_STATUS`，或输出里出现 `SUBPROCESS_RUNNER_FAILED`；`status === 0` 永远不算被杀。
- `retry` 只包含还欠一次重试的 spec：首次失败或首次被杀都只有这一次预算，被杀不会换来额外重试。
- `recovered` 是「首次被杀、重试通过」；`flaky` 是「首次失败、重试通过」。两者都不计失败。
- `failed` 是「代码被判过且没过」，包括首次真失败、重试被杀（预算已用完，不给第三次）。
- `killed` 是「两次都被杀」：重试预算耗尽但代码从未被判断，所以既不是通过也不是失败，汇总行把它从通过数里扣除，退出码仍为非零（晋升不能落在没读过代码的守卫上），报告用 `never judged` 单独列出。
- `killedFirst` 记录首次被杀的所有 spec，`scripts/test-all.mjs` 用它打印 `killed` 行。

由此报告里读得出区别：`FAIL` 是代码两次被判失败，`KILLED ... never judged` 是运行器死了而代码没被读过。
