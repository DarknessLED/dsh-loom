# R8 调研方法本身：停靠饱和规则，不靠篇数；覆盖面不是数量

**日期** 2026-11-22 · **工具** `rsi_research`（本仓库自实现，`src/research/`）·
**封印** `4fdd14d5e0b532822b61046172be7d5189dc5b0b21c96aa51f51e09864e5da4c` · **目录** `~/.dsh/loom/research/ledger/reports/r8-research-coverage-and-saturation-v2-1795288722965` · **判定** 3/3 verified（v1 有一条被标 contradicted，见下）

## 一句话

停不停是**饱和规则**（新读的东西不再改变地图），不是篇数；数量不等于覆盖面——200 篇如果只覆盖"直接支持"的方向仍然不合格；矛盾是发现而不是问题；不能复核的来源不许承载结论。

## 证据（逐字核对过存储字节）

| 证据 | 来源 | 字节 |
| --- | --- | --- |
| `ev-3f5d04e16dea` | https://botnet.com/resources/research-literature-review-faq | 2,676 |
| `ev-2ba4dfaa797d` | https://github.com/yuanzh0u/embodied-learning/.../coverage-and-saturation.md | 1,830 |
| `ev-3e03a9f59f53` | https://www.sciencedirect.com/science/article/abs/pii/S1779012325004711 | 4,073 |

## claim 与判定

- `c-b6239d3d57a7` [verified] 「Enough is when new reads stop changing the map - saturation, not a fixed count」；矛盾属于发现；「do not build the review on sources you cannot recheck」。
- `c-478c12c0b488` [verified] 「A pool of 200 papers can still fail if it covers only direct positive papers.」低于目标的池子可以做初步简报，但不构成完成的综述。
- `c-8738404b942f` [verified] 自动化筛选平台把相关文献覆盖率做到 >90%，人工时间从约 19,920 分钟降到 288.6 分钟，但分类一致性只有中等（r ≈ 0.5）；推荐的形态是"自动预抽取 + 对全文系统核验"。

## 文献说什么

自动化能买覆盖率，买不到判定质量；正确的分工是机器抽取、人对全文核验。而"读够了"是一个可观察的状态（新读不再改变地图），不是一个数字。

## 对我们插件意味着什么

`rsi_research` 现在完全没有停的规则：`run` 按 depth 预设执行固定查询计划就结束。第二轮查询的机制有（`buildFollowupQueries`），但没有任何东西在问"新读的有没有改变地图"。可复核这一条我们满足得字面意义上：每段引文都是存储字节里的逐字片段，每条 claim 都记了字面量是否命中。预抽取 / 核验的分工也正是我们做的（`run` 抽取、`seal` 核验）。缺的那一半是覆盖率检查，诚实的加法是"记下哪些子问题拿到的段落是 0 条"，而不是宣称我们测了召回率。

另外记一次真实失败：本主题 v1 的第三条 claim 被标 `contradicted`，因为我手抄的法语句子把 `d’une` 的弯引号写成了直引号。这正是"逐字"这件事的价值——它拦住了我自己。v2 用从 blob 里取出的原文重封，3/3 verified。

## 还没回答的三件事

1. 一个"新读是否改变地图"的可操作代理指标是什么——新段落命中已有关键词的比例？
2. 子问题 0 段落的记录，能不能直接变成问题台账里的一条 open question？
3. depth 预设（quick/standard/deep）的差别只在查询数与抓取数，不在停止规则，要不要拆开？

## 复算

```bash
NODE=/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
$NODE --input-type=module -e "import {verifySeal} from './src/research/ledger.js'; console.log(verifySeal('~/.dsh/loom/research/ledger/reports/r8-research-coverage-and-saturation-v2-1795288722965'))"
```
