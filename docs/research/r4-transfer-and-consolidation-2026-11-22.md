# R4 知识与迁移：迁移靠成对的失败，沉淀要分开准入与释放

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `34cb1ebf896934ac0eef0d865a85d16833a2b292293d4f60094f22aa33a7a526` · **目录** `~/.dsh/loom/research/ledger/reports/r4-transfer-and-consolidation-1795288391202` · **判定** 3/3 verified

## 一句话

三条独立线索指向同一个形状：可迁移的经验来自**配对的失败**（源任务里诱发同类失败，迁移才发生）；沉淀要**把准入和释放分成两个决定**；而保留经验有可测的代价——不是分数变低，而是更常跳过当前任务的检查。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-0e70619d70ec` | https://github.com/Unjuno/agent-interface/issues/8500（引 Gick & McGarry 1992） | 11,655 |
| `ev-b662940cd67b` | https://arxivsignals.io/papers/2611.09472 ENGRAM 摘要 | 4,246 |
| `ev-9db3019db4d8` | https://juejin.cn/post/7709704974809006130 | 18,318 |
| `ev-366c40784f4f` | https://ar5iv.labs.arxiv.org/html/2606.17645 web skills transfer | 47,648 |

## claim 与判定

- `c-8dcc99a1a9ca` [verified] 四个实验里的三个：在源领域诱发与目标任务失败**同类**的失败，会促成后续自发迁移；把诱发的失败去掉，效应也消失。
- `c-bb919ccddef9` [verified] 准入与释放是两个决定：ENGRAM 把"这条经验进训练"与"它的外部记录可以离开检索"分开，因为只看学生掌握度会漏掉有用的示范，而训练完就释放会丢掉模型还需要的东西。
- `c-a057677ba66c` [verified] 保留过去经验有可测的代价：agent 少走弯路，但也更常跳过当前任务的检查。

## 文献说什么

迁移不是"讲了成功故事"，是"让源任务的失败与目标任务的失败对上号"。沉淀不是一次写入，是两个时刻：什么时候允许它影响行为，什么时候允许它退出。而"经验越多越好"是错的——多到一定程度，agent 开始跳过检查。

## 对我们插件意味着什么

我们的 `knowledge.json` 只有一条生命周期：写入、显示若干轮、按 TTL 过期。没有准入测试，也没有独立的释放决定——一条不再有用的经验只能靠"轮数用光"离场，这等于按计时器释放而不是按证据释放。更值得注意的是「更常跳过检查」：我们存了 `notWhen` 却从不拿它决定要不要展示。一条让 round 删掉检查的经验，正是这段话描述的事故，而 brief 的 6000 字符预算不会察觉。

## 还没回答的三件事

1. 我们的 lesson 有没有"被展示后，下一轮反而更差"的记录？`impact` 里有没有反向证据？
2. `notWhen` 能不能变成展示时的一次真实过滤（而不是文案）？
3. 释放判据能不能用"最近 N 轮展示后 delta 为负"来替代 TTL？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r4-transfer-and-consolidation-1795288391202'))"
```
