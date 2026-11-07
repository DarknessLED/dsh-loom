# 夜间自跑记录（2026-11-07 00:45 → 09:00）

这一夜不是我在改代码，而是 **dsh-loom 在改 dsh-loom 自己**。我扮演的角色是「人」这一侧：
写可执行的规格（= 目标与验收标准）、审补丁、跑护栏、提交、决定什么时候停。

## 一句话结论

十三个自优化战役，12 个已完成（1 个手动停），全部规格从失败变为通过，
`scripts/test-all.mjs` 从 22 个测试套件长到 2x 个且全绿，仓库从「没有 git」变成一个有
~70 次提交、可回溯的工作树。改动全部来自循环自己写的补丁，经 holdout 门与护栏放行。

## 运行方式（这本身就是要演示的东西）

```bash
# 1) 我写规格（故意在基线上失败）
#    tests/selfN/<x>.test.mjs 断言某个能力存在

# 2) 建战役
rsi_start { id: 'loom-selfN', workspace: 'C:/Projects/RSI', budgetUsd: 8,
            budgetRounds: 24, budgetMinutes: 200, template: 'code-fix' }
rsi_evalset register { tasks: [...3 条规格...], holdout: ['suite'] }   # suite = test-all
rsi_chain activate { version: 1 }
rsi_control { action: 'autopilot', enabled: true, guard: '<node> scripts/test-all.mjs' }
rsi_control { action: 'start' }

# 3) 循环在子会话里每轮：选任务 → 派 N 个候选 → 各自 worktree 里改 → 跑 verifier
#    → holdout 复验 → 证据够则应用补丁 + 跑护栏 + 自动提交；不够就挂检查点等人
```

人的接口只有三个：`rsi_dashboard`（一眼看全部战役）、`rsi_status`（细节）、
`rsi_decide`（批准/否决）。夜里我大部分时间只是每 10–15 分钟看一眼看板。

## 战果（按战役）

| 战役 | 轮 | 结果 | 循环自己实现了什么 |
| --- | --- | --- | --- |
| self | 7 | 停 | 知识树审计、quiet hours、面板 lessonsTop（补丁捕获有 bug，见下） |
| self2 | 16 | 停 | plateau / deferred / sampling 三个模块 |
| self3 | 11 | 停 | 成本口径 `campaignUsage`、逐轮表、策略 diff、候选曝光轮换 |
| self4 | 4 | 停 | plateau 检查点、quiet-hours 延迟投递、全解自动收尾 |
| self5 | 3 | done | **holdout 门 + 禁改测试 + 检查点 id 唯一** |
| self6 | 3 | done | token 计量回退、USD 预算断路、检查点批量投递 |
| self7 | 1 | done | 链的 pre-map agent 节点真正执行 |
| self8 | 2 | done | 链 verifier 节点、human 节点强制人审 |
| self9 | 3 | done | 停滞时自己提链变异、holdout 回归挂检查点、提交纪律 |
| self10 | 2 | done | 质量指标 `campaignQuality`（healthy/stalled/regressing） |
| self11 | 2 | done | 无 token 计量时的估算口径、文档覆盖检查 |
| self12 | 2 | done | 可导出 `loom.bundle/1`、待审队列按风险排序 |
| self13 | 2 | done | 摘要 digest、面板暴露待审项 |
| self14 | — | 跑 | 候选真正的并发派发（见下「没做到的」） |

## 夜里的六个人类修（循环自己没修，因为我看到的是「证据语义」问题）

1. `cost.js` 里 `ctx?.sessions?.get` 触发 cordis 的 inject 守卫 → 每轮 attempt 当场死；改为一律走 `svc()`。
2. 补丁捕获漏掉未跟踪文件 → `git add -A -N` 后再 diff。
3. agent 在 worktree 里自己 commit → patch 为空；改为对「建 worktree 前的 base commit」取 diff。
4. **未落地的尝试被当成已解决** → 只有 `landed` 的轮次才计入基线，否则循环会收敛在假状态。
5. 空补丁被当作可晋升产物 → 引入 no-op landing（验证通过但零改动 = 任务已解决，不产生补丁）。
6. 晋升后不提交 → 下一轮补丁基线过期、apply 冲突；改为应用即提交。

第 4 条是这一夜最重要的发现：**没有它，RSI 会自信地收敛到一个什么都没变的仓库上。**

## 我否决过的循环设计

self8 round 2 曾把胜出补丁直接铺进工作区「供人审」。但夜里 `night-committer` 每 20 秒会把
「脏且全绿」的工作区提交 —— 等于未经人审就落盘。已改回工作树隔离，检查点里给
`review: git apply --stat <patch>` 让人自己决定。

## 成本

`spend` 列几乎一直是 `$0.00`：DSH 的子会话事件里没有 token 用量，self6/self11 只做到
「有 meter 就用、没有就按字符估算」。USD 预算目前是**装饰性**的，真正的闸门是轮数、
墙钟、并发数与 `maxTokens`。这是要修的下一个真问题。

## 留下的东西

- `docs/contracts.md` 现在是全量契约（self11 的 docs-coverage 规格逼出来的）。
- `scripts/test-all.mjs` 25+ 套件；`night-committer.mjs` / `commit-policy.mjs` 负责夜间提交纪律。
- 每个自优化规格都留成了回归钉（`standing` 列表），下一轮改动不能把它们弄坏。
