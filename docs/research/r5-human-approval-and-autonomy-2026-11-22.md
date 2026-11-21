# R5 编排与人机：闸门在动作点，自主度跟可逆性走

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `466c6712ec6ed38f9c101becd3141736f7fd9d6dfda44f44cd1888a4963f6a2f` · **目录** `~/.dsh/loom/research/ledger/reports/r5-human-approval-and-autonomy-1795288552128` · **判定** 3/3 verified

## 一句话

三个实务来源在形状上一致：闸门设在**动作点**而不是事后；监督是**逐个动作**的设计决定，不是 agent 级的开关；自主度应当跟**可逆性**走，而不是跟置信度走。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-00354e630a0b` | https://www.obsidiansecurity.com/academy/human-in-the-loop-agent-approvals | 16,847 |
| `ev-c3d4d12ef440` | https://www.arthur.ai/column/human-in-the-loop-governance-for-ai-agents | 8,615 |
| `ev-af03bb4f67ca` | https://www.sim.ai/library/what-is-human-in-the-loop-in-ai-agents | 11,496 |

## claim 与判定

- `c-f8ebb6c56413` [verified] 闸门属于动作点：agent 在执行一类动作前暂停，把动作交给一个人，只有这个人在窗口内批准才继续。
- `c-ebc34d6ffbac` [verified] 监督是逐动作的设计决定而不是 agent 级开关，且有两个对称的失败模式：审得太多会产生橡皮图章，审得太少会让 agent 做出没人批准的重大动作。
- `c-22d709390d51` [verified] 自主度应当跟可逆性走：全自动适合低风险、可逆的工作；难逆转的动作要设检查点，因为 agent 的前提本身就可能是错的。

## 文献说什么

按这份分类，我们做的是**事后审计**：钱花了、验证跑完了、门禁判完了，人才看到一张卡。人可以拒绝落地，但没法在花钱之前拦下这轮。而"橡皮图章"是可以观察到的形态——每次只给一个推荐项，批准永远是更便宜的动作。

## 对我们插件意味着什么

账本 247 次晋升、每一次 checkpoint 都只有一个推荐。来源给的补救是把闸门深度绑到风险上、只在真的需要人时触发——我们一个都没实现。要改的第一步不是加更多卡，而是让卡上出现"拒绝的代价"与"批准的条件"，并把最贵的那类动作（新链版本、改验证器）放到动作点之前。

## 还没回答的三件事

1. 我们的卡为什么总是单推荐？是提案生成只出一项，还是过滤掉了其他项？
2. 哪些动作是真不可逆的（push、改验证器、删测试）？这些能不能在动作点之前拦？
3. 如果把"批准"变得比"拒绝"更贵（要求读 diff），还有多少人会批？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r5-human-approval-and-autonomy-1795288552128'))"
```
