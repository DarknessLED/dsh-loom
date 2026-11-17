---
name: rsi-experiment
description: 用 dsh-loom（rsi_* 工具）跑真实任务、验证循环行为、给结果开 issue 时加载。当用户说「跑一场战役 / 开个 RSI 任务 / 验证一下这个循环 / 看看上轮到底做了什么 / 给这个实验开票 / 上报 issue / 这轮的钱花在哪」，或你要调用 rsi_start、rsi_run、rsi_status、rsi_control、rsi_decide 之前，先读这里。也适用于「别打开开关」这类约束需要落实的时候。
version: 1.0.0
---

# rsi-experiment

跑 RSI 战役的规矩。**完整检查表与 issue 格式在
`C:/Projects/RSI/docs/rsi-experiment-protocol.md`，以那份为准**；这里只列不许忘的
几条和最常用的命令。

## 三条不许忘

1. **不打开 ticker。** `rsi_control {action:"enable"}` 会把历史里所有 `running`
   的战役一起唤醒。实验用 `rsi_run {id}` 一轮一轮跑；要开开关先确认列表只剩这一场。
2. **每轮之后跑检查器**，不要凭记忆：
   `node C:/Projects/RSI/scripts/live-report.mjs <campaignId>`
   退出码 1 = 有发现；`--json` 机器读；`--issue` 直接出 issue 草稿。
3. **证据只认账本**：`~/.dsh/loom/campaigns/<id>/events.jsonl` 的字段与 seq、
   `~/.dsh/loom/knowledge.json` 的计数、`git log` 的 sha。会话记忆不算。

## 开一场

1. 选一个**现在就红**的验证器（绿着开的战役由 `baseFailed:false` 拒绝，钱白花）。
2. 隔离工作区：干净克隆，清掉答案分支/参考补丁（`git remote remove origin`、重置到
   base、删非祖先 tag、`reflog expire --expire=now --all`、`gc --prune=now`）。
3. `rsi_start`，policy 建议 `{candidates:1, halving:false, planMode:"off"}`，
   写死 `budgetUsd` / `budgetRounds`，说清这场要回答什么。
4. `rsi_run {id}` → 跑检查器 → 贴证据（带 sha）→ 下一轮或收尾。
5. 收尾 `rsi_control {action:"stop", id, reason}`；检查点要么答要么留着说明原因。

## 报告

三段：做成了什么（带数字）/ 没做成什么（含白花的轮次）/ 为什么 + 边界。
构造的仪器要说明，被自己污染的运行要标"不算能力"，预测落空要写 `missed`。
