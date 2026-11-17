# RSI 实验协议

这份文档是给**任何使用 dsh-loom（`rsi_*` 工具）的会话**看的：你在跑战役、看战役、
或者被要求"验证一下 RSI"时，按这里的做。人也可以照着核对。

配套的机械检查是 `scripts/live-report.mjs`；配套的可加载技能是
`~/.dsh/skills/rsi-experiment/SKILL.md`（由 `scripts/install-skill.mjs` 从本仓库
的 `skill/SKILL.md` 生成）。

---

## 0. 铁律

1. **不打开 ticker。** `rsi_control {action:"enable"}` 会把历史里所有 `running`
   的战役一起唤醒，花费不可控。实验用 `rsi_run {id}` 一轮一轮跑；要开开关，必须
   先确认列表里只剩你要跑的那一场。
2. **每场战役先写死预算。** `budgetUsd` + `budgetRounds`，并且**开跑前**说清这一场
   要回答什么问题；回答不了的问题不要开战役。
3. **每一轮之后跑检查器**，不要靠记忆：
   `node scripts/live-report.mjs <campaignId>`
   退出码 1 就是有发现；`--json` 给机器读，`--issue` 给一张可直接粘的 issue 草稿。
4. **不许为了让轮次变绿去改断言。** 规格红了先问"是规格描述了旧语义，还是代码错了"；
   两种情况都写进记录，不许只改一边。
5. **证据只认账本。** 引用 `events.jsonl` 的字段与 seq、`knowledge.json` 的计数、
   `git log` 的 sha。会话里"我觉得"不算证据。
6. **花钱的话要说清楚。** 每场战役结束时给出：轮次、`costUsd` 之和、tokens 之和、
   与预算的比值。

## 1. 一场实验怎么开

1. **选任务**：要有一个**现在就红、且红得可复现**的验证器（规格、外部 grader、
   隐藏验收套件都行）。验证器绿着开的战役什么也证明不了——门禁会以
   `baseFailed:false` 拒绝晋升，钱白花。
2. **隔离工作区**：给这场战役一个干净克隆，把答案分支/参考补丁清掉
   （`git remote remove origin`、重置到 base、删非祖先 tag、`reflog expire` + `gc`）。
   上一次我把 `solution/` 留在提示路径里，agent 直接把参考实现抄了，那一轮不算能力。
3. **建战役**：`rsi_start`，policy 建议
   `{candidates:1, halving:false, planMode:"off"}`（先看单轮行为，别一次上三个变量）；
   需要落地的加 `guard`（本仓库用 `<node> scripts/test-all.mjs`）。
4. **跑一轮**：`rsi_run {id}`，然后立刻跑检查器。
5. **记录**：把检查器输出 + 关键事件贴进 `docs/`（带 commit sha），不要只留在会话里。
6. **收尾**：`rsi_control {action:"stop", id, reason}`；检查点要么答，要么留着并说明。

## 2. 检查表（`live-report.mjs` 逐条实现）

| # | 面 | 读哪里 | 期望 | 什么算 issue |
|---|---|---|---|---|
| 1 | 花费口径 | `round.finished.costUsd` vs 该轮 `attempt.finished.costUsd` 之和 | 相等（1e-6） | 不等 → 有人的钱没记进账 |
| 2 | 预算纪律 | `budget.spent`、`budget.overshot`、`state.budget.usd` | 越界必有记录 | 超支无事件 → 人只能从账单发现 |
| 3 | 评分连续 | `round.finished.score/scoreSource`、`verifier.finished.metrics.killRate` | 声明 `killRate` 时 score=killRate；每轮都有 scoreSource | 没有 scoreSource；或两者不符 |
| 4 | 门禁诚实 | `gate.evaluated.checks` | 晋升的轮次 `verifierOk/hasPatch/testsClean/oracleClean` 必须全真 | 落了补丁但检查为假（拒绝的轮次不算） |
| 5 | 空补丁 | `checks.noop` | 空补丁必须带标记 | 空补丁被记成一次普通晋升 |
| 6 | 失败通道 | 上一轮有失败 → 本轮 `round.started.previousFailure` | 非空 | 上一轮失败而本轮没拿到失败摘要 |
| 7 | 知识试次 | `~/.dsh/loom/knowledge.json` 的 `trials` | 每次展示 shown+1；<20 次不判决 | shown 不增、或不足 20 就 quarantined |
| 8 | 两条门一致 | panel 批准 policy 检查点后的事件 | `policy.promoted` + diff | 只有 `checkpoint.answered`，没有效果 |
| 9 | 落地干净 | 晋升后 `git status`（工作区）/ `artifact.promoted` | 空 | 提升完工作区还脏 |

**检查器判不了的**（必须人看或场外重判）：

- **可复现性**：轮内 KILLRATE 与场外用同一补丁重判是否一致。DeepSWE 上就吃过
  "轮内 0 / 场外 1"的亏，收益是把这条写成了检查器以外的手工步骤。
- **补丁质量**：`checks.lineEndingChurn` 命中（整份文件 LF→CRLF 重写）不影响晋升，
  但 reviewer 会拒绝——看到就要在记录里点名。
- **二十次展示**：一条 procedure 经验要在真实任务上展示 20 次才够判决，外推约
  $0.5（¥3.5），而且只有 `family` 对得上才会展示。没到 20 次就写"未测到"。

## 3. issue 怎么落

一台机器有没有 `gh` 决定路线（本机目前**没有**，deck 的 issue 后端会直接报
`gh not found`）：

- 有 `gh`：`node scripts/live-report.mjs <id> --issue` 生成正文，再开票；
- 没有：写到目标仓库的 `docs/issues/NNN-<slug>.md`，内容同上，标题写"期望 vs 实际"；
- 人的入口：`rsi_status` / 面板上的检查点本身就是"需要人决定的事"，不要用聊天消息代替它。

一张 issue 至少要有：战役 id、轮次、事件 seq（或检查器输出）、期望值、实际值、
复现命令、影响（这一轮的钱算不算数、结论还能不能用）。

## 4. 报告怎么写

三段，不许合并：

1. **做成了什么** —— 带数字（score、KILLRATE、costUsd、tokens、轮次）。
2. **没做成什么** —— 包括"钱花了但没有可用产出"的轮次，写明原因。
3. **为什么 / 还缺什么** —— 机制层面解释，以及这条结论的边界（n 多大、什么条件下不成立）。

诚实比漂亮重要：`missed` 的预测要写出来，仪器是构造的要说明，被自己污染的运行要标注
"不算能力"。

## 5. 已知盲区（写下来，别当成通过）

- `only Windows verified`：Linux CI 是 advisory。
- 知识试次的统计功效只够发现 ≥75% 的胜率，20 次展示以下一律 `insufficient`。
- halving 只在"没有赢家"的轮次省钱（实测 −37.9%），在有赢家的轮次因为并行提前停止
  反而更贵（+21%）。
- 跨系统能力对比只有 DeepSWE n=2，不能拿来说"比市面大多数好"。

## 6. 变更

- 2026-11-17：首版。检查器 `scripts/live-report.mjs`（9 条）、`round.started`
  记录 `previousFailure`、技能 `rsi-experiment`。
