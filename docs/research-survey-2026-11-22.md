# 一次"研究者标准"的调研是怎么做的（2026-11-22）

上一轮八个方向的调研是 `rsi_research` 的 standard 档：5 条查询、10–14 个来源、读 4–6 篇。用户当时的批评是对的——**一个方向的基石性工作就有十篇左右，加上各细分方向的开篇与 SOTA，再加上从被引方法回溯出的一层，50 篇是起步**。所以这一轮换了方法：不是换更大的预算买同样的东西，而是**换问题**——从"哪些页面回答了我的问题"改成"这个方向的论文在反复引用什么，我漏了谁"。

## 方法：三层

### 第一层：广度（search）

`https://arxiv.org/search/?query=…&searchtype=all&abstracts=show&size=50&start=N`，每方向 25–36 条查询、每条最多 2–3 页 × 50 条。查询不是一句话，而是"关键词组合 + 种子标题"：种子是已知的必读（ADAS、AFlow、Darwin Gödel Machine、AlphaEvolve、MAP-Elites……），关键词按细分方向铺开。

arXiv 搜索页的 `order` 参数只接受 `-announced_date_first`；写 `order=relevance` 会 HTTP 400——**relevance 是默认，必须省略**。这一条踩过一次，值得记住。

### 第二层：回溯（backtrace）

每方向挑 50–70 篇读全文 HTML（`https://arxiv.org/html/<id>`），解析 `ltx_bibitem` 拿到完整参考文献，合并成"这个语料在引什么"的一张表。判据是：

- **被几篇引**（`citedByPapers`）：有多少篇不同的论文引了它。高 = 这个方向的共同前提。
- **篇内累计**（`totalCites`）：在所有参考文献列表里出现多少次。高 = 被反复对比的基线（同一篇论文里也反复提）。
- **两份表分开**：一张给"基石"（被≥2 篇引），一张给"反复被对比的基线"（单篇内出现≥3 次）。两者不是同一件事——基线可以在一篇里被提十次，但只有那一篇在乎它。

### 第三层：回填（gap backfill）

把"被至少 3 篇引、但搜索从没返回过"的工作列成 gap，**用它的标题直接去搜**，找到的加回候选列表、再读它们、再合并一次引用图。这一层是用户说的"从 SOTA 的写作里回溯线索"的机械化版本：SOTA 论文的 related work 本身就是一张别人整理好的地图，直接抄它的书名号比自己想查询词更准。

回填不是无限的：一轮就停。R1 回填 10 个工作找到 123 篇新论文（一个标题在 arXiv 上往往对应多篇同主题工作），七方向各回填 8 个找到 14–219 篇。**这说明第一次搜索漏掉的不是"几篇"，是"一整片"**。

## 数字

| 方向 | 查询 | 候选 | 保留 | 读通全文 | 引用条目 | 基石(≥2篇引) | 基线(篇内≥3) | 回填后仍缺席 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 判决与验证器 | 36 | 979 | 363 | 70 | 2954 | 310 | 398 | 296 |
| R2 评分与噪声 | 26 | 562 | 373 | 50 | 2570 | 165 | 282 | 160 |
| R3 预算与停止 | 26 | 724 | 369 | 50 | 1897 | 145 | 172 | 135 |
| R4 知识与迁移 | 25 | 638 | 236 | 50 | 2652 | 318 | 327 | 306 |
| R5 编排与人机 | 25 | 669 | 267 | 50 | 2868 | 133 | 326 | 124 |
| R6 遏制与安全 | 26 | 649 | 174 | 50 | 2565 | 144 | 304 | 134 |
| R7 自我修改 | 26 | 740 | 282 | 50 | 3733 | 155 | 433 | 150 |
| R8 调研方法 | 25 | 773 | 287 | 49 | 2732 | 172 | 439 | 163 |
| **合计** | **215** | **5734** | **2351** | **419** | **21971** | **1542** | — | — |

每份方向页在 `docs/research/<slug>-survey-2026-11-22.md`：上半是脚本算的表，`---` 之后是人写的判断。机器与人写的分开，是因为读者要知道哪些数字可以复算、哪些不可以。

## 五条已经能落地的结论

1. **R1：这一方向的高频被引者里有一半是"工具"而不是"思想"。** DeepSeekMath 被 31 篇引，是因为做 RL-for-reasoning 都要拿它当配方；真正的概念源头是 Concrete Problems in AI Safety（2016，15 篇）、Defining and characterizing reward gaming（2022，14）、Scaling Laws for Reward Model Overoptimization（2023，22）。**读表要把"工具型高频"和"概念型被引"分开**。
2. **R1：我们的 gate 有一处"自述改变门禁"。** `src/runtime/round.js:2439` 的 `claimedWork = Array.isArray(best?.report?.changed) && best.report.changed.length > 0`：只有 `checks.noop && !claimedWork` 才跳过 holdout。也就是说 agent 在报告里列一个文件名，就能让一个本该被复查的空补丁跳过复查。这是 R1 第二代奖励黑客文献（"被观察到就会改变行为"）的直接对应物，也是本轮唯一一条**读代码就能确认**的缺陷。
3. **R3：我们造了 successive halving，却没接到它有淘汰空间的地方。** 基石前十全是超参搜索（Hyperband 26 篇、Non-stochastic BAI 23、BOHB 20）。Hyperband 的核心是"同一预算刻度上比较、逐档淘汰"；我们的 screening 是一次只读 prompt 的 agent 调用，与完整尝试**不在同一刻度**。账本证据：470 个 round 只有 9 个做过 screening、总支出 $0.0750（0.7%），因为多数任务没有 `screen.cmd`。
4. **R4：`notWhen` 的覆盖是分裂的。** 47 条 lesson 里 24 条有边界、23 条没有；24 条 research 来的 fact **全部**有边界（`src/research/sink.js:129` 强制），23 条 loop 自己归纳的**全都没有**。同一条纪律只对一条管道生效。
5. **R2：连续评分在文献里仍是边缘做法。** partial credit 只有 1 篇（2026-08），run-to-run 方差 38 篇。我们上一轮把 killRate 接进每轮，在方法上走在前面，代价是**没有现成规范可抄**——killRate 0.6 与 0.9 的差是否可加，没人给过答案。

## 四件这一轮没做到的事

- **没有全领域被引数。** OpenAlex 每 IP 每日 $0.10 额度，R1 一次 54 个请求就见底；Semantic Scholar 全程 429。所以全部"被引"都是"本语料内被几篇引"，不是"这个领域最重要的工作是哪篇"。**要真正回答后者，需要一个 OpenAlex key 或 S2 key。**
- **经典论文的缺席是系统性的。** 2011–2020 的开篇（Random Search、Practical Bayesian Optimization、EWC、MAP-Elites 之前的 QD）大半在 gap 表里，因为 arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文。gap 表就是给下一轮的查询清单，不是结论。
- **没有真正"精读"到能复现的程度。** 这 419 篇是读了 HTML 的标题、摘要、参考文献，不是读了方法节的每个公式。八份 `docs/research/r*-2026-11-22.md` 里的 sealed claim（24 条逐字核验）才是精读过的部分，一共只覆盖了 8 个工作。
- **没有按 R8 的饱和规则做第二轮。** R8 的结论是"新读不再改变地图才算饱和"；这一轮只做了一次回填，没有迭代到达标。

## 复算

```bash
node scripts/research-survey.mjs directions/r1-verifier.json --pages 3 --trace 70 --keep 240 --gaps 10
node scripts/research-survey.mjs directions/r3-budget-stop.json --pages 2 --trace 50 --keep 160 --gaps 8
node scripts/research-doc.mjs          # 重新生成 docs/research/*-survey-*.md
```

缓存命中不重新请求网络（`research/out/.cache/`，97MB，已 gitignore）；换机器从头抓，数字会变——arXiv 的搜索结果本身随时间变。

规格：`tests/self48/citegraph.test.mjs`（书目解析、引用计数、标题合并）、`tests/self48/survey-parse.test.mjs`（搜索页解析、空页、书目截断）、`tests/self48/research-doc.test.mjs`（计数来自 survey 文件、缺结论段要显式标注、gap 不等于"没读"）。三条都已 pin 进 `scripts/test-all.mjs`。
