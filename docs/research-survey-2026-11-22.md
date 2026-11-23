# 一次"研究者标准"的调研是怎么做的（2026-11-22）

上一轮八个方向的调研是 `rsi_research` 的 standard 档：5 条查询、10–14 个来源、读 4–6 篇。用户当时的批评是对的——**一个方向的基石性工作就有十篇左右，加上各细分方向的开篇与 SOTA，再加上从被引方法回溯出的一层，50 篇是起步**。所以这一轮换了方法：不是换更大的预算买同样的东西，而是**换问题**——从"哪些页面回答了我的问题"改成"这个方向的论文在反复引用什么，我漏了谁"。

## 方法：三层

### 第一层：广度（search）

`https://arxiv.org/search/?query=…&searchtype=all&abstracts=show&size=50&start=N`，每方向 17–26 条手写查询、每条最多 2–3 页 × 50 条。查询不是一句话，而是"关键词组合 + 种子标题"：种子是已知的必读（ADAS、AFlow、Darwin Gödel Machine、AlphaEvolve、MAP-Elites……），关键词按细分方向铺开。

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

| 方向 | 手写查询 | 回填查询 | 候选 | 保留 | 读通全文 | 引用条目 | 基石(≥2篇引) | 基线(篇内≥3) | 回填后仍缺席 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 判决与验证器 | 26 | 10 | 979 | 363 | 70 | 2954 | 310 | 398 | 296 |
| R2 评分与噪声 | 18 | 8 | 562 | 373 | 50 | 2570 | 165 | 282 | 160 |
| R3 预算与停止 | 18 | 8 | 724 | 369 | 50 | 1897 | 145 | 172 | 135 |
| R4 知识与迁移 | 17 | 8 | 638 | 236 | 50 | 2652 | 318 | 327 | 306 |
| R5 编排与人机 | 17 | 8 | 669 | 267 | 50 | 2868 | 133 | 326 | 124 |
| R6 遏制与安全 | 18 | 8 | 649 | 174 | 50 | 2565 | 144 | 304 | 134 |
| R7 自我修改 | 18 | 8 | 740 | 282 | 50 | 3733 | 155 | 433 | 150 |
| R8 调研方法 | 17 | 8 | 773 | 287 | 49 | 2732 | 172 | 439 | 163 |
| **合计** | **149** | **66** | **5734** | **2351** | **419** | **21971** | **1542** | — | — |

手写查询 149 条，回填 66 条——**回填贡献了 31% 的查询，却贡献了 123（R1）到 14（R6）篇新论文**，其中 R1、R2、R3、R7、R8 各带回上百篇。真正便宜的不是多写查询词，是有别人的参考文献可抄。

每份方向页在 `docs/research/<slug>-survey-2026-11-22.md`：上半是脚本算的表，`---` 之后是人写的判断。机器与人写的分开，是因为读者要知道哪些数字可以复算、哪些不可以。

## 五条已经能落地的结论

1. **R1：这一方向的高频被引者里有一半是"工具"而不是"思想"。** DeepSeekMath 被 31 篇引，是因为做 RL-for-reasoning 都要拿它当配方；真正的概念源头是 Concrete Problems in AI Safety（2016，15 篇）、Defining and characterizing reward gaming（2022，14）、Scaling Laws for Reward Model Overoptimization（2023，22）。**读表要把"工具型高频"和"概念型被引"分开**。
2. **R1：我把一处门禁的方向读反了，纠正后仍然是一处真缺陷。** 我起初写的是"agent 自述改了文件就能跳过 holdout"，依据是 `src/runtime/round.js:2440` 的 `skipHoldout = checks.noop && !claimedWork`。错了：声称改文件会让 `!claimedWork` 为假、holdout **照跑**，这个标记让门禁更严。方向读反比没读更糟，现在由 `tests/balance/holdout-claim.test.mjs` 钉住。纠正之后剩下的真问题在另一侧：真正被信任的是 agent 的**沉默**。883 次尝试里 403 次报告没通过校验、其中 188 次零字节改动——"没回答"被当成"什么都没改"，于是跳过唯一独立检查。已改为只有合法且明确为空的报告才跳过（`tests/balance/holdout-silent.test.mjs`，2/2）。
3. **R3：我们造了 successive halving，却没接到它有淘汰空间的地方。** 基石前十全是超参搜索（Hyperband 26 篇、Non-stochastic BAI 23、BOHB 20）。Hyperband 的核心是"同一预算刻度上比较、逐档淘汰"；我们的 screening 是一次只读 prompt 的 agent 调用，与完整尝试**不在同一刻度**。账本证据：470 个 round 只有 9 个做过 screening、总支出 $0.0750（0.7%），因为多数任务没有 `screen.cmd`。
4. **R4：`notWhen` 的覆盖是分裂的。** 写这份文档时 47 条 lesson 里 24 条有边界、23 条没有；24 条 research 来的 fact **全部**有边界（`src/research/sink.js:129` 强制），23 条 loop 自己归纳的**全都没有**。11-23 又从综述调研里 sink 了 16 条（全部带边界），现在是 **63 条里 40 条有边界、23 条没有**——没有的那 23 条仍然全是 loop 自己归纳的。同一条纪律只对一条管道生效，这一点没变。
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

## 第二种看法：从一篇论文往内看（2026-11-23 追加）

上面八份 survey 都是"给一个主题，往外搜，再顺着别人的参考文献往前扩大"。它回答"这个方向有什么"。
但它回答不了另一个问题：**手里这一篇论文本身是由什么构成的**——它引了 113 篇，正文里反复拿来对照的是哪几篇，哪些条目列在参考文献里却一次都没在正文出现。

那需要反方向的工具，所以有了 `scripts/research-cites.mjs`：输入一篇论文的文本（PDF 抽出的正文或 HTML 全文）与它的 arXiv 摘要页，输出书目条目、正文括号引用次数、年份/主题分布、以及"撞车无法归属"的清单。第一篇用它读的是综述
《When, Where, and How Experience Becomes Structure: Mechanisms for Recursive Self-Improvement in LLM Agents》（预印本 2026-11-04，138,090 字节，sha256 `16f93ca4d878dbeeed4038bc5dcf4c9b9f93eea852fabfc252b579a36a3c0113`），结果在 `docs/research/r9-rsi-survey-2026-11-23.md`。

### 为什么不能只按作者块切参考文献

这件事写坏了六次，每一次都是一个会静默给出错误数字的坑。它们现在都钉在 `tests/self49/cites.test.mjs` 里：

1. **条目边界是年份，不是下一个作者。** 按 `Given Surname,` 切，会把 `P. Chhikara,` 这种首字母缩写当成一个新条目的开头，于是**把下一条的 arXiv id 给了上一条**——实测错配 15 条，而且没有任何报错。
2. **会议条目以"月份 + 年份"收尾**，写作 `Miami, Florida, US, November 2024.`，没有逗号。只认 `, 2024.` 会把 ACL 的整条吞进下一条（实测 `2406.11695` 被算到了 TPTU-v2 头上）。
3. **出版社尾缀会冒充作者。** `Springer Nature Singapore.` 长得就像一个姓 + 首字母。
4. **没有 id 的条目会吃掉下一条。** 四种尾部形态要依次吃掉：`URL <url>.`、`doi: 10.xxx.`、`arXiv preprint arXiv:ID.`、`Available at <url>.`。
5. **折行会落在 id 中间。** `arxiv.org/abs/2607.` + `07663` 要在两处都接回。
6. **同名同年无法归属。** `Xu 2026` 与 `Li 2026` 在书目里各有多个候选（`Li 2026` 有六个，含本地未发表稿与两个会议条目）。这样的 key 既不能算给任何一行，也不能说它没被引用——它单独列在文档的"撞车"段，归属留给读过的人。

### 一条必须记下来的更正

我在这轮开始时写过"综述的参考文献有约 12 条 id 与标题错配，例如 `2502.12110` 被标成 Welcome to the Era of Experience 而实际是 A-MEM"。**这个结论是错的**，它是我从 PDF 抽参考行时的产物：抽取把相邻条目的标题与 id 拼到了一起。用 arXiv 摘要页的 `citation_title` 对 93 条 id 做全量比对，**mismatch = 0**。`2502.12110` 的摘要页标题确实是 "A-MEM: Agentic Memory for LLM Agents"。剩下三条标题不一致是排版差异（上标 ² 丢失、变音符被写成引号、数学斜体），不是错配。

这条记在这里，是因为它示范了那六条坑的同一种失败：**解析器给出的错误数字看起来完全正常**。数字能复算，才谈得上可以引用；不能复算的结论，写下来就是别人的负债。

### 这篇综述最值得带走的一条

它把 19 篇工作、20 条更新循环拆成同一张七阶段表（采集 / 评定 / 诊断 / 抽象 / 更新 / 验证 / 保留），未做的列写 NR。一旦按这个粒度看，**"某系统会自我改进"这句话就没有信息量了**：A-MEM 与 ReasoningBank 的评定、诊断、验证三列全是 NR，而 Self-Harness 与 AHE 的七列是填满的。这解释了上一轮 R4 里"memory 类工作效果不稳定"——不是记忆机制的问题，是这些循环里没有独立的验证阶段。

对我们最直接的三条差距写在 `docs/research/r9-rsi-survey-2026-11-23.md` 的结论段：被回退的提案从来没有被测量、holdout 池参与晋升所以它是选择集不是测试集、每个战役缺少同预算的 test-time scaling 对照臂。

## 第三种看法：把基石论文的正文读掉（2026-11-23 追加）

前两层是"找到"和"往回看引用"，第三层是"打开正文"。差别的量级不是修辞：`cls.foundations` 那张表早就排在每份 survey 里，八份合计 1542 个被本语料多篇引用的工作，而此前读过正文的只有 10 篇——全部来自 r9 那一篇综述的引用族。

`src/research/foundations.js` 的 `selectReadingList` 把那张表变成清单，规则四条，每条都对着一种"看起来合理却没用的清单"：没有 arXiv id 的丢掉（抓不到就别在每个方向重试）、并列按标题排（否则同一语料两次跑出不同清单）、同一篇跨方向只算一篇（否则账本存两遍同一份字节）、`sota` 不带被引数所以补在排序之后而不是以 0 分混进去。八方向各取 8 篇，64 个 pick、55 篇唯一（8 篇在两个方向各被引用一次）。

实际读到 **52 篇**（`1707.06347` PPO 的 arXiv 页只有一句"See pages 1-last of ppo-min.pdf"，报 unread 而不是算它没说话；`1903.11059` 见下），共 **338 段逐字引文**，每段带章节号与段落锚点（`§4.2.1 Regressional Goodhart` + `S4.SS2.SSS1.p1.1`），全部通过 `gradeNote` 的 depth=full 检查。账本从 **46 claim / 0 带 locator** 变成 **491 claim / 445 带 locator**，其中这一轮新增 385 条全部 verified。

### 一次「引用撒谎」的实录

r3 的清单第一名按语料内被引数是"Hyperband"，arXiv id 写作 `1903.11059`。抓下来发现那是 **AlphaX**（神经架构搜索），不是 Hyperband：`2108.08019` 的参考文献里写着 `Hyperband ... arXiv preprint arXiv:1903.11059, 2019`——**引用本身是错的**，而我们的证据链完全能通过（引文在页面里逐字存在）。

所以深读脚本现在带 `--expect <id,标题>`：正文提取的标题与期望标题相似度低于 0.5 时**不落账**，走 arXiv 标题检索找回正确 id（阈值 0.8）。Hyperband 由此解析到 `1603.06560`，日志里留一行 `FROM:1903.11059`。这一条是整轮里最值得记住的：**能验证引文存在，不等于这篇论文就是它自称的那篇**。

### 八份正文阅读的位置

每份 `docs/research/deep-r<N>-<name>-2026-11-23.md` 是机器表（章节数、段落数、`gradeNote` 结论）+ 逐段引文 + `---` + `directions/r<N>-<name>.deep.reading.md`（人手判断：读完这八篇正文我认为什么变了 / 三条我会改的 / 这份调研没回答的三件事）。判断段里的每个数字都能回到上面某一段引文的章节号。

八份判断段里最重的三条，都指向仓库里已经存在的代码：

1. **`docs/l2-state.md` 里那个 21% 的 halving 结论要撤回。** r3 的正文说得很清楚：successive halving 省下的预算必须还给幸存者，我们的 screening 没有还；而 r2 的正文给出单次观测的波动区间（`docs/research/deep-r2-score-noise-2026-11-23.md` 引 Chatbot Arena §5 的区间算法与 pass@k §2.1 的高方差警告），21% 的差异落在这个区间里。
2. **score 上升不等于修复。** r1 的正文（Scaling Laws §4.2.1 的 regressional Goodhart）解释了为什么 killRate 从 0.85 涨到 0.9 可能什么都没修好——优化力被分给了噪声。巡环现在的 `score` 正是那种单一读数。
3. **带封印的报告更危险。** r8 的正文（WebGPT §6.2）说带引用的错误陈述更可能被相信；我们的账本里 445 条带 locator 的 claim 是这一轮才补上的，此前 72% 只读摘要。报告首页应当写明证据深度分布。

### 沉淀去了哪

- **账本**：98 份证据快照（其中 75 份来自 arxiv.org 的正文或摘要页）+ 491 条 claim，`scripts/research-replay.mjs` 复算 **12/12 seal ok**。
- **封印报告**：`deep-r1-r8-structural-findings`（19 条 claim，19 verified，seal `802fe2f4…`）。
- **知识库**：15 条 lesson 进 `knowledge.json`（63 → 78 条），每条带 `notWhen` 边界与 locator；按 family 分 gate 2 / loop 3 / knowledge 2 / panel 2 / guard 2 / chain 2 / research 2。
- **问题台账**：5 条新问题（screen 与 verify 是否单调、哪些 eval 任务不可解、lesson 能否跨仓库迁移、外部句子能否驱动提案、链的描述符该选什么），现共 10 条 open。

这一轮没做到的：每方向只取被引最高的 8 篇（不是全部基石）、只用一个术语表抽段（不是全文精读）、PPO 的正文读不到、八份判断段之间还没有交叉引用。
