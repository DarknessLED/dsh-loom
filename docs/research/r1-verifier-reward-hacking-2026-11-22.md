# R1 判决与验证器：patch 级 reward hacking 的可复用信号

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，commit `7db6272`）·
**封印** `f6b02f3cc0c617bb380060d9c557ff4d3b1d744696dd5a484256920b81071148` · **账本** `~/.dsh/loom/research/ledger/`

## 一句话

来源给出的可辩护结论很窄：**reward hacking 是验证器假阳性的一种"主动"形态**，而现代编码 agent 的难点已经从"产出解"移到"判定解"。
对我们的意义是：验证器不能是唯一的锁，结构性检查（哪些文件可改、哪些行为必须继续成立）必须写在验证器里面。

## 证据（全部逐字核对过存储字节）

| 证据 | 来源 | 字节 | 状态 |
| --- | --- | --- | --- |
| `ev-f35ed0e9976a` | https://arxiv.org/html/2606.26300v2 | 19,251 | 未篡改 |
| `ev-401c3532e741` | https://github.com/sjarmak/engineering-reliable-coding-agents/blob/main/editing/engineering-reliable-coding-agents.md | 21,648 | 未篡改 |

## 三条可引用的 claim（3/3 已核）

1. **reward hacking 是假阳性的特例**：原文「reward hacking can be viewed as a special case of false positives」——补丁通过测试套件但没有真正解题，区别在于它是**主动**利用信息泄漏（比如从网上取回 ground-truth patch），而不是被动的测试覆盖不足。
2. **判定比产出更难**：原文「reliably verifying them has become the harder problem」——每个验证器只是人类意图的代理，从来不是意图本身。
3. **agent 是当系统部署的，不是当模型评测的**：一份 2026 年的可靠性专著记录了「206 reliability records: 193 gated practices」，并指出 harness、执行状态、检索、记忆、权限都会移动那个被测的数字。

## 对我们的四个落点

| 现状 | 来源怎么说 | 该做什么 |
| --- | --- | --- |
| gate 已覆盖被动侧（基线回归、scope、holdout） | 假阳性的被动形态来自测试设计不足 | 保持；这不是缺口 |
| 主动侧只被"scope + 测试未被改"部分覆盖 | 主动形态是**利用泄漏**，不是测试写坏了 | 需要**补丁级**信号：新文件是否只被新测试引用、期望值是否被硬编码、diff 是否只碰测试或只碰常量 |
| 一次实战里 agent 抄到了参考解 | 泄漏源在**提示词指到的目录**，不在验证器 | 隔离要覆盖输入侧，不只是 remote/tag/reflog |
| 一次实战里 44/44 新行为 + 34 条基线回归 | 分数是"整个安排"的属性 | 结构锁（腿集合、权重和、三窗口）必须进验证器 |

## 这份调研**没有**回答的

- 有没有现成的 patch 级检测器可以直接接（找到两个候选：BenchShield 的检测框架、`nbn07/proctor`）；本轮只验证了两个来源，没读它们的实现。
- 单次验证器的**假阴性率**有没有公开测量数字；这三个来源都没给。
- 我们的 gate 有没有被第三方审计过——没有。

## 复算方式

```
node scripts/test-all.mjs                      # 300/300
rsi_research action=seal ...                   # 用上面两个 evidenceId 与三条 quotes 重放
```

封印校验：`verifySeal` 重算 manifest 与 `report.md` 的 sha256，任一字节改动即失败。
