# 调研能力评估（2026-11-22）——先评领域，请审查

这一份只做评估，不动代码。要回答三个问题：**调研这件事现在在 RSI 里是什么状态、应该变成什么、八个领域各要查什么**。

---

## 0. 一句话结论

调研现在是**插件外面的手工活**：我这次会话里装了 `dsh-deep-research` 和 `dsh-research-report` 两个第三方插件，
用它们跑过 6 个主题、封存过 6 份报告；但 RSI 自己的 98 个模块里**没有一行代码调用它们**，
`src/research/note.js` 也没被任何源码 import，`research/kg` 的 1523 个节点只是一个独立 CLI 的仓库。
**能力不缺，缺的是接线。** 所以这一轮该做的是把调研变成 `rsi_*` 的一个动词，而不是再装一个插件。

---

## 1. 现状盘点（都能复核）

### 1.1 已安装的两个调研插件

| 插件 | 版本/许可 | 提供什么 | 谁在用 |
| --- | --- | --- | --- |
| `dsh-deep-research` | 0.1.1 / MIT / 零依赖 | 工具 `deep_research`：多查询检索 → 合并排序 → 抓正文 → 抽证据段落 → 报告；侧边栏面板 + 最近 20 次历史 | 我在会话里手工调用；**RSI 源码零引用** |
| `dsh-research-report` | 0.4.2 / Apache-2.0 / 零依赖 | 工具 `evidence_add` / `research_report` / `ledger_query` / `research_trail`：内容寻址证据账本 + claim 绑定 + 逐字节核对 + 目录封存（封印 = `manifest.json` 的 SHA-256） | 同上；**RSI 源码零引用** |

证据账本现状（`~/.dsh/profiles/desktop/.research-ledger/`）：9 份快照、19 条 claim、
17 条 `verified`、2 条 `unverified`（那两条是我第一版报告里没带可核对字面量的，被挡住了，这是设计对的地方）。
封存报告 6 份：verifier-hacking、rsi-mechanisms、dream-rsi、knowledge-transfer、summarize-explore-verify、quality-efficiency-cost。

### 1.2 RSI 自己已经有的调研零件（但没接上）

| 零件 | 位置 | 状态 |
| --- | --- | --- |
| 调研笔记形式检查 | `src/research/note.js` + `scripts/check-note.mjs` | 5 条纪律可机械检查（读法档位 / 身份三要素 / claim 类型 / locator / 同协议增量），22 条规格全绿；**只有测试在调用它** |
| 知识图谱 | `research/kg/kg.mjs` + `store.sqlite` | 1523 节点 / 1638 边 / **334 条未答问题** / 1100 条有出处 claim；8 条规格；**不在 `src/`、不在 `package.json files`、不在 `rsi_status`** |
| 教训库 | `src/knowledge/store.js`（`~/.dsh/loom/knowledge.json`） | 23 条，`round.js` 每轮写入并选择注入；这是**唯一**真正在循环里生效的"沉淀" |
| 跨域类比 / dream | `src/knowledge/cross.js`、`dream.js` | 会在 `rsi_status` 显示合并/退休/开放问题，但 dream 的 `questions` 只显示前 3 条，且不落盘 |
| 方向扫描器 | `C:/Projects/rs/sweep.mjs`（仓库外） | 5 个方向各 ~50 篇 arXiv，输出到 `C:/Projects/rs/out/`；**不在仓库里** |
| 文献地图 | `docs/research-capability-2026-11-15.md`（commit `6d549bb`） | 八环对照表（入口/基石/SOTA/对比/精读/思考/贯通/产出）+ 四条短板，其中"没有持续问题台账"至今没做 |

### 1.3 三条硬缺口（这是要我改的东西）

1. **问题不持久**：kg 里 334 条 live question 和文档里的 60 条"还缺/没证明"互不相识，一轮之后就散。
2. **证据不进循环**：调研结论停在 `docs/*.md`，不参与 lesson 选择、不参与 chain 提案、不参与 gate。反过来，账本里
   138 个战役、470 个回合、$10.29 的真实数字，也从来没有被调研读过（除了我手工重放）。
3. **调研不可复算**：`docs/` 里的结论靠人读，`research-capability` 那篇的 52 个候选来源现在再跑一次会不同，
   因为没有一份"来源 → 快照 → claim → 判定"的账本跟着仓库走（`.research-ledger` 在 profile 目录，不在仓库）。

---

## 2. 让它变成 RSI 自己的功能：三个选项

| 选项 | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A. 薄依赖 | RSI 声明 peer 依赖两个插件，`rsi_research` 直接转发它们的工具 | 少写代码 | RSI 变成"必须有别人才能用"；两个插件都还在 0.x；它们的账本在 profile 目录，不进仓库 |
| **B. 自己实现，借算法（推荐）** | 把 `deep_research` 里**纯函数**部分（URL 归一、结果合并打分、正文转文本、证据段落抽取、后续查询生成）按 MIT 署名移植进 `src/research/`；联网统一走 `ctx.web`，没配置时降级为"只出计划不抓取"；证据账本改成 `~/.dsh/loom/research/` 下内容寻址 + 封存，格式对齐 `dsh-research-report` 以便互操作 | RSI 零第三方依赖即可用；账本跟仓库/战役同居；离线可复算 | 要写约 4 个模块 + 1 个工具 + 规格；移植部分要写 NOTICE |
| C. 两套并存 | 保留插件给会话用，RSI 内部另建一套 | 互不干扰 | 两份账本，最坏的选项 |

**推荐 B。** 理由不是"自己写更好"，而是：RSI 是一个会被别人装的插件，它不能假设用户也装了另外两个插件；
而"调研结论要能进 gate / 进 lesson / 进 chain 提案"这件事，只有账本在 RSI 手里才做得到。
移植时保留 MIT/Apache-2.0 署名，并在 `THIRD_PARTY_NOTICES` 里写清哪几段来自哪个文件的哪个函数。

### 2.1 拟新增的模块（评估用，未实现）

| 模块 | 职责 | 对应缺口 |
| --- | --- | --- |
| `src/research/plan.js` | 把一个问题拆成检索计划（查询、档位、预算），CJK/英文分开处理 | 3 |
| `src/research/fetch.js` | `ctx.web` 适配 + 失败降级 + 正文转文本 + 段落抽取（移植自 `deep-research/lib/research.js` 的纯函数） | 3 |
| `src/research/ledger.js` | 内容寻址快照、claim 绑定、逐字节核对、目录封存（对齐 `dsh-research-report` 的四本 JSONL） | 3 |
| `src/research/questions.js` | 问题台账：提出 / 认领 / 已答 / 被证伪 / 搁置；每条必须带"谁能关掉它" | 1 |
| `src/research/sink.js` | 调研 → 教训库（`kind:'fact'` + `notWhen`）/ chain 提案 / `rsi_status` 一行 | 2 |
| `src/tools/` 新增 `rsi_research` | `plan` / `run` / `note` / `seal` / `questions` / `open` 六个动作 | 1+3 |

`src/research/note.js` 直接复用，不再另写。

---

## 3. 调研领域：八个方向，覆盖"我们插件的一切"

每个方向的"已知"来自 kg 的 1523 个节点，"未知"来自 334 条 live question 里对应的部分。
**这一节是请你审查的重点**——觉得哪个方向不该查、或者漏了哪个，直接说。

| # | 领域 | 覆盖我们哪些功能 | kg 里已有 | 未答问题 | 这一轮要回答的三件事 |
| --- | --- | --- | --- | --- | --- |
| **R1** | 判决与验证器 | `gate/`（7 模块）、`exec/verifier.js`、holdout、`churn.js`、`scope.js`、`oracle.js` | 386 节点，92 条未答 | 92 | ① patch 级 reward-hacking 信号有没有可复用的检测器 ② 单次 verifier 的假阴性率有没有公开测量 ③ 我们自己的 gate 被别人审计过吗 |
| **R2** | 评分与噪声 | `gate/score.js`、`metrics.js`、`halving.js`、`selector.js`、`sampling.js`、`triangle.js` | 184 / 32 | 32 | ① killRate 这类连续分怎么校准 ② flake 率有没有一手测量 ③ 噪声下晋升阈值该多高 |
| **R3** | 预算与停止 | `loop/funding.js`、`candidates.js`、`plan-budget.js`、`stall.js`、`plateau.js`、`halving` | 269 / 51 | 51 | ① 每个"晋升"的公开成本有没有人报过 ② 停止规则（burn/deadline/plateau）有没有对照实验 ③ 定价表怎么核 |
| **R4** | 知识与迁移 | `knowledge/`（7 模块）、`lesson` 注入、dream、cross、trials | 180 / 45 | 45 | ① lesson 注入值不值得多一次调用 ② 跨域类比在代码循环里有没有正例 ③ 20 次展示的裁决线有没有依据 |
| **R5** | 编排与人机 | `dispatch/`、`collab/board.js`、`lease.js`、checkpoint、`decide` | 167 / 33 | 33 | ① N>2 候选在单一机械验证器下有没有对照 ② 人类每分钟值多少（checkpoint 设计） ③ 重启后双派发的实测率 |
| **R6** | 遏制与安全 | `exec/worktree.js`、`patch.js`、`rollback.js`、`activity.js`、`watchdog.js` | 61 / 9 | 9 | ① 工作树隔离在 Windows 上的已知缺口 ② 记忆投毒在"存的是补丁"时怎么测 ③ 自杀式进程的看护判据有没有先例 |
| **R7** | 自我修改与循环 | `chain/`（10 模块）、`loop/`（8 模块）、`runtime/round.js`、`replay.js` | 294 / 65 | 65 | ① harness 级自改的公开失败案例 ② L2 提案的预测校准有没有先例 ③ "改自己"与"改任务"如何区分 |
| **R8** | 调研方法本身 | `src/research/`、kg、evidence 账本 | 98 / 17 | 17 | ① 有没有"结论必须可复算"的现成协议 ② 来源噪声怎么降 ③ 调研结论怎么进决策 |

合计：**334 条 live question 全部落在八个方向里**，每个方向这一轮取 3 条做成"可回答的问题"，
其余保持开放（不是这轮的事，但台账会留）。

---

## 4. 执行方式与预算（请你定）

### 4.1 两步走

1. **先接线**（不花钱）：`plan/fetch/ledger/questions/sink` 五个模块 + `rsi_research` + 红规格，
   在没有任何 web provider 时也能跑（只出计划、只读已有账本），全量 suite 保持绿。
2. **再跑调研**：八个方向各一次，每个方向 = 一次 arXiv 扫描（免费）+ 6–10 个来源取证 + 一份封存报告 + 3 条进问题台账。

### 4.2 预算估算（按本机历史价格）

- arXiv / Crossref 扫描：免费，但慢（`sweep.mjs` 每个方向 ~3–5 分钟）。
- 正文取证 + 抽取：`deep_research` 一次 `deep` 档大约 4.6 万字符、耗时 33 秒，token 成本在分钱级。
- 若用 RSI 战役跑（一轮 1 候选）：按账本中位数 ≈ **$0.03–0.06/轮**。

**建议上限 $6（约 ¥43）**：八方向 × 约 $0.5 + 一次返工余量。如果要更省，先只做 R1 和 R7 两个方向（$1.5）。

### 4.3 沉淀到哪里

| 产出 | 落点 |
| --- | --- |
| 问题台账 | `~/.dsh/loom/research/questions.jsonl` + `rsi_status` 一行（"3 条待答，最早一条 11 天"） |
| 证据账本 | `~/.dsh/loom/research/ledger/`（内容寻址 + 封存，可离线复算） |
| 报告 | `docs/research/<方向>-2026-11-2x.md`（进仓库，带 commit sha 与封印哈希） |
| 可执行的结论 | `~/.dsh/loom/knowledge.json`（`kind:'fact'` + `notWhen`），下一轮自动进 brief |
| 与该方向冲突的现状 | chain 提案卡（走已有 plateau/evidence-card 通道，不新开一条路） |

---

## 5. 需要你拍板的三件事

1. **选项 B（自己实现 + 移植纯函数，署名 MIT/Apache-2.0）是否可以？** 如果不行，退 A（薄依赖），但"账本进仓库"就做不到。
2. **预算上限 $6 是否可以？** 或者先只做 R1 + R7（$1.5）。
3. **八个方向是否要增删？** 我担心两个：R5（人机）和 R6（遏制）各自的 9–33 条问题偏少，
   但它们是"出事故才看得见"的方向，删了短期没损失、长期最贵；R8（调研方法本身）容易被说成自我循环，
   但它正是这轮要建的东西的说明书。

审查完我按你改过的版本执行：先接线（不花钱、全量绿、提交），再跑调研，每份报告都带封印哈希和 commit sha。
