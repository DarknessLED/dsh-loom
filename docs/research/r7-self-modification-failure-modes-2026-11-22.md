# R7 自我修改与循环：自改有自己的失败模式，收益会消失

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `297ffd850b436d3b264c405dfc82217ddfd1793a77f5bddd1d92e40edaea7a5b` · **目录** `~/.dsh/loom/research/ledger/reports/r7-self-modification-failure-modes-1795287037884` · **判定** 3/3 verified

## 一句话

自己改自己的循环会引入普通训练没有的失败模式：reward hacking、多样性塌缩、灾难性遗忘、静默漂移、过度乐观。更关键的一句是：**在没有被优化过的评估器上，收益基本消失**。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-f0880e732351` | https://github.com/Corneldj/context-engineering/blob/main/Module9/Lesson7（14,679 B） | 14,679 |
| `ev-d5a17d48420f` | docxology/template `loop-design-evidence.md` | 13,666 |

## claim 与判定

- `c-6b51914f2896` [verified] 自我修改引入普通训练没有的失败模式（reward hacking / diversity collapse / catastrophic forgetting / silent drift / over-optimism），要**按类记分**而不是看均值。
- `c-9e60fd7a54dd` [verified] 「Gains largely vanish on evaluators the system did not optimize against.」——harness 一直在更新，不等于 harness 一直有收益。
- `c-f78b2554990f` [verified] 验收规则：`delta on held-in >= 0, delta on held-out >= 0, and max of the two > 0`。

## 文献说什么

一个自改循环最危险的不是它变差，是它在**自己的**评估器上变好。来源给的验收规则很具体：留出集上不许退，且两者至少有一个真的涨——这条规则排除了"在留出集上退一点点、在训练集上涨很多"的自我美化。

## 对我们插件意味着什么

我们的 gate 已经有 holdout 检查，但 `holdout` 常常是空数组（`evalset.holdout: []`），于是这条规则在很多战役里等于没跑。"按类记分"我们也没做：`gate.evaluated` 只记一个 `promoted` 布尔和 `delta`。而"静默漂移"正是我们最难看见的——链版本一换，历史分数就跨版本比较了，账本里没有一段"同一条链在固定任务上的最近 N 轮"基线。

## 还没回答的三件事

1. 有多少战役的 `holdout` 是空的？空的时候 gate 还能说什么？
2. 能不能给每个链版本维护"固定任务上的滚动基线"，用来发现静默漂移？
3. "按类记分"最小实现是什么——五类各记一个计数？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r7-self-modification-failure-modes-1795287037884'))"
```
