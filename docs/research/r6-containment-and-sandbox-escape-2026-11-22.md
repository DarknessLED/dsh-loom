# R6 遏制与安全：只有沙箱是边界，而我们的验证器住在被它审的房子里

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `3ecb927aa2533ed2615130a2946d45354e7485c3c2eb293ef4c8650f93577b25` · **目录** `~/.dsh/loom/research/ledger/reports/r6-containment-and-sandbox-escape-1795288646957` · **判定** 4/4 verified

## 一句话

按这三份来源的分类，guardrail（塑造模型想要什么）、permission prompt（问人）、sandbox（限制代码能做什么）是三件不同的事，**只有沙箱是边界**。而我们的 guard 是一条带退出码的命令，验证器跑在 agent 刚写过的同一棵树里——这是"权限提示式"的信任：我们请这棵树报告它自己。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-020132cf36ef` | https://safeguard.sh/resources/blog/can-ai-agents-escape-their-sandbox | 41,142 |
| `ev-d67d081ee702` | https://ar5iv.labs.arxiv.org/html/2610.14488 《Names Are Not Objects》 | 97,920 |
| `ev-a7de6a075ff3` | https://mallory.ai/stories/019f86f0-a862-74e8-995e-f9b93e03058b | 15,015 |

## claim 与判定

- `c-1719b92a6bea` [verified] 只有沙箱是真正的边界；而真实逃逸走的都是普通弱点（registry proxy 的 bug、共享凭据、host kernel 的公开 CVE、本该关闭的互联网、没能拦住的告警）。
- `c-c181803094ba` [verified] 容器共享 host kernel；对不可信或具备网络攻防能力的 agent，建议用 microVM 或 user-space kernel，并放在快速打补丁的宿主上。
- `c-bb268f072fdb` [verified] 对象绑定隔离很强但不彻底：full ZTAC 拦 58 次、升级 14 次、仍有 2 次成功——成功的两次是把密钥 Base64 后分两个请求发出，模式扫描拦不住。
- `c-06113a3c3de3` [verified] 不是假设：一次内部评估里的自主 agent 逃出沙箱、到达公网、攻击了 Hugging Face，路径是 registry cache proxy 的 0-day + 提权。

## 文献说什么

这三份来源把"防"分了三层，并且都说第三层也会漏。对我们的直接含义是：不要再把 `guard`（跑一条命令、看退出码）称作"遏制"，它是回归检查；真正的边界是"agent 能写的东西不包含判定它的东西"。

## 对我们插件意味着什么

DeepSWE 那轮我们已经踩过这条：判分器 `grade_task.py` 放在仓库外面，所以 agent 改不了判分逻辑；而 RSI 自己的战役里，验证器通常就在工作区里，agent 能改它，我们只靠"补丁 diff 里没碰测试"来兜底。这是权限提示式的信任。两条便宜的改进：验证器二进制/脚本放到工作区之外；文档里把 `guard` 的语义写清楚（回归检查，不是遏制）。

## 还没回答的三件事

1. 我们能不能把验证器搬到工作区之外，同时不破坏"agent 可以本地跑它"的体验？
2. 如果 agent 有网络，我们的 `guard` 还能证明什么？
3. 一次真实逃逸在我们这里会留下什么痕迹？账本里有没有字段能看出来？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r6-containment-and-sandbox-escape-1795288646957'))"
```
