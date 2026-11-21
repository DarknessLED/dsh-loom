# R2 评分与噪声：单次 pass@1 不是一次测量

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `7d662b86e5c975270b94eaa8a3c16b7a290b3002a598695a1c29058f28940871` · **目录** `~/.dsh/loom/research/ledger/reports/r2-score-noise-floor-1795287513153` · **判定** 2/2 verified

## 一句话

同一套 agent 在同一基准上换一次 run，分数就能差 2.2–6.0 个百分点，连 temperature 0 都有 >1.5 个点的标准差。我们用一个 0.02 的噪声闸去挡跨轮比较，量级错了两个数量级。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-c0396ee497bb` | https://arxiv.org/html/2602.07150 《On Randomness in Agentic Evals》 | 51,558 |
| `ev-b24bb131543f` | https://ar5iv.labs.arxiv.org/html/2602.07150 同文 | 47,974 |

## claim 与判定

- `c-00a81c57a181` [verified] SWE-Bench-Verified 十次独立 run、六种配置、60,000 轨迹：单次 pass@1 估计随选哪次 run 变动 2.2–6.0 个百分点；temperature 0 时标准差仍 > 1.5 个百分点。
- `c-1f5b45b8395a` [verified] 可靠评估要多次 run，并按待检效果的大小来决定需要几次。

## 文献说什么

单轮分数不是一个点，是一个区间。把"这一版比上一版高 0.03"当成结论，是在读噪声。论文给的做法是：先估计方差，再按要检出的效果定 run 数；效果小于方差时，多跑是为了把区间收窄，不是为了取平均。

## 对我们插件意味着什么

我们的 `noiseSpread`（默认 0.02）比较的是**同一轮内候选之间的 delta**，不是**跨轮重跑的方差**。所以它防的是"这次抖动"，防不了"换一天跑同一条链会怎样"。账本 470 个 round 里，`noiseSpread` 从未真正拦下过一次晋升。这也是 R3 和 R7 都会撞上的同一个洞：我们的"提升"是一个单次测量值。

## 还没回答的三件事

1. 同一 patch 重跑三次 verifier，分数方差是多少？一次没测过。
2. 候选间 delta 0.02 的闸门，与实测 2.2–6.0 个点的 run 间方差相比，是不是小了两个数量级？
3. 若晋升要求"两次独立 run 都过"，在现有均价 $0.008/attempt 下多花多少？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r2-score-noise-floor-1795287513153'))"
```
