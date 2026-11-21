# R3 预算与停止：评估预算与部署预算是两笔钱

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `5762f6aa1a7850da8609a10fdc3e0d80e38a650b7aacebd2ea0ca8997a1369b9` · **目录** `~/.dsh/loom/research/ledger/reports/r3-evaluation-versus-deployment-budget-1795287854445` · **判定** 3/3 verified

## 一句话

选 agent 有两笔预算：评估预算买候选的试跑，部署预算买被选中者在未来任务上的表现。我们的 `budgetUsd` 只有一个池子，于是"多试一个候选"和"把这条链跑完"在抢同一笔钱。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-b82b1c1c2f3e` | https://arxiv.org/html/2611.21515v1 《Beyond Leaderboard Ranks》 | 19,128 |
| `ev-b9ed75fed4b7` | https://arxivsignals.io/papers/2611.21515 摘要 | 3,942 |

## claim 与判定

- `c-b094d0948512` [verified] 「The evaluation budget pays for trial runs of candidate agents. The deployment budget pays for the chosen agent on future issues.」两笔预算用途不同。
- `c-0952689dc844` [verified] 复现一个榜单排名，不等于为某个预算选出最好的 agent；报告的分数差异可能统计上不可分辨，报告的成本也可能不是跑完整个基准的成本。
- `c-d8ed113a3300` [verified] 58,197 条 run-task 记录、七个基准：accuracy–cost Pareto 前沿 35 步里 27 步在统计上不可分辨。

## 文献说什么

在 Pareto 前沿上相邻的两点，多数时候分不出高下；真正的差异要么在成本上，要么需要更多 run 才看得见。所以"选哪个 agent"是一个带噪声的多目标决策，不是一个排序问题。

## 对我们插件意味着什么

我们的 `spentUsd` 与 `budgetUsd` 是单池的，`planCandidates` 也是从同一池里算"还买不买得起第二个候选"。按 R3 的框架，这里混了两件事：试跑（探路）与执行（把链跑完）。当一场战役只剩 $0.05 时，我们的逻辑是"别买第二个候选了"，而不是"停止探路，把剩下的钱留给一个确定的候选"。这个区分我们还没做。另外 27/35 不可分辨 直接说明我们 rsi_status 里"best 0.895 vs 0.910"这种对比大多没有统计意义。

## 还没回答的三件事

1. 把 `budgetUsd` 拆成 `trialUsd` 与 `deployUsd` 会不会让停止判据更清楚？
2. 我们的 Pareto 视图（成本 vs 分数）里，有多少点对是不可分辨的？
3. 若一个 round 的成本方差本身就有 ±30%，预算预测还准吗？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r3-evaluation-versus-deployment-budget-1795287854445'))"
```
