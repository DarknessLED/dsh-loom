# 加固：不花模型钱能查的十二件事

日期 2026-11-16。这一轮没有买任何真实战役的轮次，全部是可离线验证的修复。
用户的要求是"1~12 全部优化，顺序和方式你定，发现的其它问题一并优化，全部完成再汇报"。

## 为什么要做

T3 的两次试次（¥0.5、¥2）暴露的问题不只是"展示次数贵"，还有一串只在账本上
读得出来、却没人断言过的行为：验证器的依赖没被保护、面板与工具两条采纳路径
不一致、知识库整文件读改写没有锁、预算跨线没有记录、资金可用轮次用的是创建时
的静态估价、预测区间没有分基评估、`shape`/类比路由在生产里从未被观测、五个
`tests/self*` 规格早已红了没人知道、Windows 盘符写死在源码里、`reduce` 全量
重放没有上限。以下按"它错在哪 → 改了什么 → 哪个规格钉住"记录。

## 逐项

| # | 问题 | 修复 | 规格 |
|---|---|---|---|
| 1 | 验证器只在命令里点名的脚本被保护；改它 import 的模块可以绕过 `oracleClean` | `src/gate/oracle.js` 新增 `oraclePathsFor()`：从命令脚本出发做相对 import 闭包（`import/export…from`、`require`、动态 `import`，深度 8、上限 200 个文件），另收 `verify.pin`。**执行面只扩到“点名 + `tests/`/`scripts/` 下的支撑模块”**：闭包整包执行会误伤“验证器 import 被测代码”的常规任务（`graded-requires-metric` 已证明）。完整闭包作为 `checks.oracleClosure` 报告，编辑 `scripts/` 下的支撑模块仍拒绝 | `tests/self34/verifier-closure.test.mjs` |
| 2 | 工具门会提升 policy，面板按钮只采纳 chain，同一个检查点两条门结果不同 | 新增 `src/runtime/decision-effects.js`，`applyApprovalEffects()` 是唯一落点：chain/plateau/revert → `adoptFromCheckpoint`，policy → `policy.promoted` 带 diff；两个入口都改为调它 | `tests/self34/decision-parity.test.mjs` |
| 3 | 门组合（noop/部分/fail/改 tests/改 oracle）没有矩阵断言 | 空 diff 且全过仍会落地，但现在带 `checks.noop` 与 `artifact.noop` 标签，不会被误读成"改了代码"；失败、改 tests 都拒绝 | `tests/self34/gate-matrix.test.mjs` |
| 4 | `knowledge.json` 整文件读改写无锁，两个战役并发会丢计数 | 重写 `src/knowledge/store.js`：`<file>.lock`（`wx`，40×10ms，5s 陈旧锁可破），锁内读一次、按 id 合并（试次计数取 `Math.max`）、写临时文件后 `rename` | `tests/self35/ledger-money.test.mjs` |
| 5 | 预检只投影一轮，真跨线的轮次没有记录 | `triangle.js` 增加 `recordedRoundCost()` / `overshootOf()`；`round.js` 在轮末发现超线就写 `budget.overshot` 并把战役标为 `converged`（reason: cost budget overshot） | 同上 |
| 6 | 资金可用轮次用创建时的静态 `usdPerRound`，曾把实际 $0.005/轮报成"只够 2 轮" | `funding.js` 增加 `refreshFunding()`：有实测轮就用实测均值，没有才回落到配置估价；`runtime.status()` 与 `rsi_status` 都改走它 | 同上 |
| 7 | 校准只报总体 coverage/MAE，prior 的 `[0,1]` 区间会把数字抬高 | `summarizeCalibration()` 增加 `byBasis`，按 `predicted.basis` 分组各报 n/coverage/MAE；无 basis 归 `unknown` | `tests/self36/calibration-basis.test.mjs` |
| 8 | `shape`/类比路由没有任何生产观测 | `impact.js` 导出 `shapeStats()`；`scripts/knowledge-report.mjs` 输出各 shape 计数与类比展示次数 | `tests/self36/shape-stats.test.mjs` |
| 9 | 20 次展示能判什么没有写清 | `docs/transfer-unit-2026-11-15.md` §14：单侧 α=0.05 下 20 次需 ≥15 胜（P=0.0207），只能判 ≥75%；5 次平局把门槛抬到 12/15；判 60% 需约 150 次（80% 把握） | 文档 |
| 10 | `tests/self*` 不在默认 glob 里，不钉就永远不会跑（已发现两个红的） | 钉入 97 个自查规格；新增元规格断言"每个 `tests/self*` 都必须在 standing 列表或显式红名单里"，红名单 5 条各带原因 | `tests/self37/spec-index.test.mjs` |
| 11 | 源码写死 `C:\Program Files`，只在 C 盘 Windows 上成立 | `node-bin.js` 改为只读 `ProgramFiles`/`ProgramFiles(x86)`/`LOCALAPPDATA` 环境变量，没有就跳过；新增扫描规格（注释豁免）与 advisory 的 Linux CI | `tests/self37/portable-paths.test.mjs`、`.github/workflows/test.yml` |
| 12 | `reduce` 每次追加都全量重放，没有上限测量 | 10000 事件折叠实测 167–196ms，规格设 4s 上限；失败时应先测再优化，不许抬阈值 | `tests/self37/reduce-perf.test.mjs` |

## 顺手修掉的

- `src/tools/index.js` 的 `applyApprovalEffects` 导入路径写错（指到 `chain/adopt.js`），是跑一个未钉的旧规格时炸出来的；已改为 `runtime/decision-effects.js`，该旧规格 7/7。
- `docs/contracts.md` 补 `decision-effects.js` 一行，`docs-coverage` 3/3（93 个模块）。
- 三个通过但从未被运行的 `tests/self/*` 规格已钉入列表。

## 诚实的边界

- 五个旧规格仍然是红的，已在 `spec-index` 里点名：它们描述的是 2026-11 之前的
  晋升/留出语义（现在晋升要求基座失败，留出拒绝记 `holdout-failed`），夹具不再
  触发对应分支。没有为了变绿去放宽断言。
- Linux CI 是 advisory（`continue-on-error: true`），因为这台机器从未跑过 Linux；
  在第一次真的跑绿之前，它只是一盏灯，不是门。
- `shapeStats` 在 114 个旧战役上只看到 `solved` 与 `no-patch`；`near-miss` 与
  类比路由仍然只在合成规格里被走过，生产观测依然是零。这是"看见了"，不是"验证了"。
- 第 9 项是文档，不是代码；它约束的是读数字的人，不是循环。

## 验证

- 新增规格：self34（3 个文件 / 10 断言）、self35（4）、self36（7）、self37（3），
  全部先红后绿（或先有观测再钉）。
- 全量 `scripts/test-all.mjs`：**277/277 通过**。
- 这一轮改动撞出三处旧契约，按“契约优先”处理而不是改代码迁就：
  1. `oracle-gate` 期望 `oracleFiles` 只含命令点名的文件 —— 保留该字段含义，
     闭包另记 `checks.oracleClosure`；
  2. `graded-requires-metric` / `oracle-creation` 的验证器 import 被测代码，
     闭包整包执行会拒绝真正的修复 —— 执行面收窄到点名 + `tests/`/`scripts/`
     支撑模块；
  3. `self22/l2-adopt-measure` 还在找 `adoptFromCheckpoint` 直接调用 —— 改为
     断言两条门都走 `applyApprovalEffects`，且门自己不直接采纳。
- `tri9/early-abort` 的 6s 上限在本机负载下擦边（夹具本身已 5.7s），改为 9.5s；
  兄弟仍是 12s，断言“提前结束而不是等完”没有被放宽。

## 2026-11-16 晚：五个点名红规格清零

上一轮在 `tests/self37/spec-index.test.mjs` 里点名了五个红的旧规格。这一轮把它们
全部改成描述今天的语义，不是放宽断言：

| 规格 | 旧失败原因 | 修法 |
|---|---|---|
| `tests/self12/review-queue.test.mjs` | 假 runtime 没有 `get()`，而 `rsi_status` 现在要读投影背后的 state 才能取到校准台账 | 给假 runtime 补 `get: () => ({ state })`，断言不变 |
| `tests/self5/no-test-edits.test.mjs` | 基座 `exit 0` 本来就绿，晋升被“基座未失败”拒绝 | 夹具加 `verify.mjs`：`keep.txt` 未改时退出 1，改了才 0 |
| `tests/self5/holdout-gate.test.mjs` | 同上，留出闸到不了 | 三个用例的可视任务都改成基座红、补丁后绿 |
| `tests/self9/holdout-report.test.mjs` | 同上，`holdout-failed` 分支不再被触达 | 可视任务改成 `new.txt` 存在才通过 |
| `tests/self8/human-node.test.mjs` | 同上，human 节点在晋升之前就被基座检查挡掉 | 可视任务改成 `new.txt` 存在才通过 |

`KNOWN_RED` 现在为空，但机制保留：以后任何新红规格必须写理由，不能只从列表里消失。
元规格现在报 `103 self specs are pinned, 0 named red`。

顺带量化了一件此前只有轶事证据的事：扫描 119 个战役账本，
`solved-by-sibling` 作废的候选人共 **23 次、$0.538608、725,572 tokens、35.5 分钟**，
集中在 `p6-route`、`trial-summary-live` 与 halving 仪器战役；单次中位数约 $0.03。
这个量级不足以证明该新造调度机制，串行（cascade）本来就存在，缺的是默认值与取舍
说明——先记在案，不改默认。

## 2026-11-17 凌晨：两处"记下来但不拦"的硬化

1. **`src/gate/churn.js`**：`lineEndingChurn(patch)` 认出"把 LF 文件整份改写成 CRLF"的补丁（新增行 ≥20、新增行 ≥80% 带 CR、被替换行 ≥80% 不带 CR、删除量 ≥80% 新增量），返回涉及的文件与行数。只写进 `checks.lineEndingChurn`，**不参与晋升**——测试是真的全绿，这是 review 事实不是裁决。真实数据上已经开火过两次。
2. **`failureDigest` 认识更多方言**：`FAILURE_LINE` 原来只认 node 的 `FAIL …`；现在也认 `REGRESSED:`、`UNIMPLEMENTED:`、pytest 的 `path::test_name`、以及 `P2P=`/`KILLRATE=`/`REWARD=`。上一轮的失败摘要因此能带上全部 12 条坏用例 id，而不是像 300 字符尾巴那样只带 4 条。
3. **`lastFailure` 的预算**：从 `tailOf(detail, 300)` 换成 `failureDigest(detail)`（24 行 / 1600 字符），回退到 300 字符尾巴只在摘要为空时发生。

三条都由 `tests/self39/churn-digest.test.mjs` 钉住（含"没有任何地方对 churn 做 if 判断"这一条）。
