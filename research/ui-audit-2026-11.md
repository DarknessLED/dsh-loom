# 侧栏面板审计：审计工具看不见的十二件事

对象：`C:\Projects\RSI\docs\panel-preview.html`（三画布 320 / 400 / 720，共 218 行、60452 B）、
生成它的 `C:\Projects\RSI\scripts\panel-preview.mjs`、以及 `C:\Projects\RSI\client\index.js`（2397 行）。
审计工具：`node scripts/panel-audit.mjs`，当前结论 `OK — every canvas reads, nothing overflows, contrast clears the floor.`
读法：`panel-audit` 量的是矩形——是否横向溢出、是否被裁、对比度、轨道数。它不读属性、不读语义、不读时间戳。

## 结论先行

1. 这份 OK 是在一个**丢了属性的 DOM** 上给出的：序列化白名单只有 `class / title / data-depth / data-last / data-tone / style / disabled`（`scripts/panel-preview.mjs:84–91`），整个预览里 `aria-` 出现 0 次、`role=` 0 次、`tabindex` 0 次。面板的键盘契约（`switchProps`、`hitProps`、`aria-live`）在这份产物里**不存在**，所以 audit 结构上不可能失败。
2. 产物还比源码旧一天：`docs/panel-preview.html` 的 mtime 是 **2026-11-09 05:18:24**，`client/index.js` 是 **2026-11-10 03:54:13**。今天 client 里已有的 `whyNode`、`nodeBand`、`waitMs` 在预览里都看不到，audit 验的是昨天的面板。
3. 「需要你处理」确实排在最前：360px 下它的第一行从 **y≈85** 开始，第一个「批准」在 **y≈134**（720px 下 120），前面只有顶栏 42px 与指标条 43px，没有别的行。这一条比 ui-eff 时更好，不必再改顺序。
4. 但它不是**眼睛**里的第一件事：它正上方 43px 高的指标条用 **13px/500 mono** 写 `5 2 26 3 $1.36 18`，而队列自己的标题是 **10px**、行文 **11.5px**。同一屏最大的字是「26 轮」「18 知识」这类累计量，不是那条待批的门。
5. 三种状态在卡头**只有文字差别**：`已完成` 与 `规划中` 都是 `--loom-idle`（#7a7f87）的 6px 圆点 + 10px 灰字；`运行中` 无论有没有 3 条待审都是同一个绿点（#3d8a58）。待办只有一个 **9px** 的「待 N」chip，且只在折叠分支里出现（2066）；展开后连这个 chip 都没有，而 `待审 3` 落在距卡头约 **258px**、距页面顶部约 **561px** 的树里。
6. 十二处缺陷里，收益÷成本最高的是**改审计工具本身**（A1），其次是把后果写进行内（A2）、把卡头让给待审（A7/A8）。没有一条需要动布局几何。

---

## §1 十二处具体缺陷（按 收益÷成本 排序）

样本即 320px 画布（`docs/panel-preview.html` 第 213 行）的实捕文本；行号均指 `client/index.js`，另标注的除外。

### A1 审计产物丢掉全部可访问属性，audit 的 OK 不覆盖语义
- 实捕：`<button class="loom-switch" title="循环正在派发；点这里停掉，战役历史不受影响">`——没有 `role="switch"`、没有 `aria-checked`；`<button class="loom-btn bare" title="重新读取 ~/.dsh/loom">↻</button>`——没有 `aria-label`（源码 1712 是写了的）；队列容器 `aria-live`/`aria-label`（1794–1795）也一并消失。
- 原因在生成器：`scripts/panel-preview.mjs:84–91` 逐条 `if (props.X) attrs.push(...)`，白名单外的一律丢弃，`aria-*` 全不在内；`data-zero` 同样被丢（全文件只在 CSS 选择器里出现 1 次），所以「0 分 = 2px、未计分 = 0px」这条已被 `tests/ui/spark-baseline` 保护的区分，在预览里根本画不出来。
- 360px 读者更差：这条不直接伤害读者，它伤害**判断**——面板唯一能证明「键盘可用」的产物被审计成 OK，于是没人再去看。
- 载体：`__panel.CSS` 不适用；断言应落在生成器与产物上（见 §5 A1）。

### A2 「若忽略会怎样」只存在于 title
- 实捕：行内 `<span class="txt" title="same verifier signature for 3 rounds — the gate cannot be reached · 工作树里的验收门始终不可达，候选跑完了也拿不到一个裁决。 若忽略：同一道门会一轮轮重试，每轮都烧掉一次完整的候选成本。">`，屏幕上只有 `loom-self15 · 门不可达 — same verifier signature for 3 rounds — the gate cannot be reached`。
- 360px 读者更差：批准还是驳回，靠的正是「不处理的代价」；这句话现在只对鼠标悬停可见，键盘与触屏都拿不到。而且行内是**英文原句**，中文解释反而在 tooltip 里（1821 把 `help` 拼进 `title`）。
- 载体：`pending(data)` 已有 `help`（632 起，`checkpointHelp`），但没有 `consequence`；渲染层（1782–1870）只取 `summary`。断言用 `pending(data)[0].consequence`。

### A3 同一战役名在队列里连写三遍
- 实捕：三行都以 `<b>loom-self15</b> · 门不可达 — …` / `… · 晋升待审 — …` / `… · 留出集 — …` 开头。队列 3 条全部来自 loom-self15（`src/panel/api.js` 的 `reviews` 只取前 3，宿主也只评估 3 条）。
- 360px 读者更差：行首 11.5px 的 `loom-self15 · ` 占掉约 70px 宽度（≈12 个字位），把 97 字符的摘要挤成 3 行（行高 63px）；三行里有两个字（`门`/`晋`/`留`）才真正区分它们。
- 载体：`queueOf(data)` 696 起，返回 `rows` 但无分组信息。断言 `rows.filter(r => r.showCampaign).length === 1`。

### A4 一个「批准」覆盖三种不同后果
- 实捕：三行按钮同为 `<button class="loom-btn bare" title="接受这个检查点，让这一轮落地">批准</button>`。但三条检查点是 `门不可达`（批准=接受一个永远达不到的门？）、`晋升待审`（批准=落地一次晋升）、`留出集`（批准=接受 0.04 的回退）。
- 360px 读者更差：动词相同、后果不同，是误操作（错批一条「门不可达」）的直接来源；标题里那句「让这一轮落地」对第一种根本不成立。
- 载体：`pending()` 行 `actions[0].label` 恒为 `批准`（632 起的 actions 构造）。断言三种 kind 给出三种动词。

### A5 待审卡片与运行中卡片，头行同色；展开态反而丢掉「待 N」
- 实捕：loom-self15（3 条待审）卡头 `<span class="loom-dot" style="color:var(--loom-ok)">` + `<span class="loom-state">运行中</span>`；loom-triangle（0 条待审）折叠行 `<span class="loom-dot" style="color:var(--loom-ok)">` + `运行中`。同色、同字、同 6px——两者都来自 `statusTone(c.status)`（2043 展开态、2063 折叠态）。
- 待办标记的分布还不一致：折叠行有 `h('span', { className: 'loom-flag', … }, '待 ' + openCp)`（2066，9px mono），展开态的头行（2040–2048）**没有**这个 flag，待办数只在树里的 `待审 3` 出现，距卡头约 258px（本页 y≈561）。
- 360px 读者更差：卡片最值得横向扫的是色点，而色点只回答「在跑吗」；回答「在等谁」的只有 9px 的文字 chip，且展开后消失。用户收起所有卡扫一遍，得到的是 5 个「运行中」，其中 1 个其实卡在等他。
- 载体：`statusTone` 只吃 `status`（380–385）。断言 `cardTone({status:'running', open:3})` 返回 warn。

### A6 候选行不标「谁落地了」
- 实捕：树里 `<span class="t mono" title="r7a1">r7a1</span><span class="v">0.88</span>` 与 `r7a2 0.94` 同色同字重；落地这件事只在父行 `第 7 轮 · 已晋升 · 0.94` 里，靠分数（0.94）与子行对暗号才能对上。
- 360px 读者更差：一轮最多 3 个候选时还能反推，5 个候选、分数有并列时就只能猜；而「哪个候选进了主线」是这棵树唯一的结论。
- 载体：`lastRoundNode`（1388–1412）子行 `tone` 只看 `verifierOk`，无 `landed`。断言 `children.map(k => k.landed)`。

### A7 「已完成」和「规划中」共用同一颗灰点
- 实捕：`loom-self3`（已完成）与 `loom-fresh`（规划中）的折叠行都是 `<span class="loom-dot" style="color:var(--loom-idle)">`，状态词都是 10px 同色。`statusTone` 380–385：`done/stopped/planning/idle` 之外的状态才分色，这四种全落 `TONES.idle`。
- 360px 读者更差：一排折叠卡里，做完的和没开始的无法用颜色区分，只能逐字读「已完成 / 规划中」；5 张卡就是 5 次阅读。
- 载体：`statusTone`。断言 `notEqual(statusTone('done'), statusTone('planning'))`。

### A8 折叠行的 brief 会空转
- 实捕：`loom-fresh` 的折叠行是 `<span class="loom-brief"></span>`——空元素、无 title（`campaignMeta` 返回 `[]`，因为它既无预算也无晋升）；`loom-triangle`（运行中）的 brief 只有 `未定价` 三个字，没有轮数、没有静默时长。
- 360px 读者更差：折叠行是 90% 的日常视图；在「未定价/未开始」这两种常见数据形状下，它给出的信息量是 0 或 1 个词，用户必须展开才知道这张卡是否还活着。
- 载体：`campaignMeta` 911 起。断言 `foldBrief({status:'planning'})` 非空。

### A9 检查点的第三列会缺，导致 id 不对齐
- 实捕：`cp-9f21` 行是 `晋升待审 cp-9f21 improved · Δ0.12`，`cp-a01c` 行只有 `门不可达 cp-a01c`（`payload` 里没有 `verdict / delta / taskId`，所以 `meta` 为空串，1443–1450），`cp-b77e` 是 `regressed`。三行的 `cp-xxxx` 起始 x 相同，右侧长度不同，看起来像「第二条没数据」。
- 360px 读者更差：同一组三行缺一列，读者会怀疑数据丢了，而这恰恰是最需要被信任的区域（要按它做决定）。
- 载体：`waitingNode` 1440–1459 子行 `meta` 无兜底。断言每个子行 `meta !== ''`。

### A10 年龄没有「前」，42秒读成耗时
- 实捕：卡头 `<span class="loom-age" title="最近活动 42秒前">42秒</span>`；`age()` 369–378 直接返回 `42秒 / 11分 / 3小时`，源码只有 title 里有「前」。
- 360px 读者更差：同一行里有 `7/12`、`$0.41`、`96秒/轮`，`42秒` 落在其中会被读成「这一轮花了 42 秒」而不是「42 秒前有过活动」——后者才是「它是不是卡住了」的判断依据。
- 载体：`age()`。断言 `age(42000) === '42秒前'`。

### A11 指标条是全屏最大的字，且四个数是累计量
- 实捕：`<div class="loom-metric is-primary"><b>2</b><span>运行中</span></div>` 等六格，`b` 为 13px/500 mono（CSS 119–120），而队列标题 `.loom-sec-head` 是 10px（127）、行文 11.5px（134）、待审行里的 `.v` 是 10px。360px 下 `@media (max-width:360px)`（297–300）只保留 3 格，但字号不变。
- 360px 读者更差：视线落点是字号与字重，不是 DOM 顺序；`26 轮 / 18 知识` 不回答任何「现在做什么」，却和 `待处理 3` 抢同一个视觉层。
- 载体：CSS（`metric b` 字号）+ `metrics()`。断言 `CSS` 中该规则 ≤ 11px。

### A12 知识区一个术语两个分母
- 实捕：区标题 `知识` + `18 有效 · 3 隔离`（全部 5 个战役合计），而展开卡树里的 `知识 6` 是本战役计数（`lessonsNode` 1487–1501 用 `c.lessons`）。两条都在同一屏，都没有写分母。每条 lesson 只画 `claim + score`，虽然 `knowledgeOf` 的 item 已带 `campaign`（846–851），渲染没用。
- 360px 读者更差：看到 18 与 6 会以为丢了一半；而 8 条英文长句（每条 11.5px、约 2 行）没有任何来源标记，无法判断适用哪个战役。
- 载体：新增 `knowledgeHeader(data)`（或给 `knowledge()` 加 `scope` 字段）。断言返回 `5 战役 · 18 有效 · 3 隔离`。

---

## §2 信息层级复审：第一在 DOM，不在眼睛

按 320/400/720 三个真实画布的盒模型累加（数值取自 CSS 89、116–121、127、131 与预览实际文本长度；行高 13px×1.45、11.5px×1.45、9px×1.15）。

| 宽度 | 顶栏 | 指标条 | 队列标题 | 队列首行高 | 第一个「批准」的 y | 它之前有几行内容 |
|---|---|---|---|---|---|---|
| 320 | 42 | 43（3 格） | 28.5 | 63（3 行文字） | **≈134** | 0 行 |
| 400 | 42 | 43（6 格） | 28.5 | 63（3 行） | **≈134** | 0 行 |
| 720 | 42 | 43（6 格） | 28.5 | 33（1 行） | **≈120** | 0 行 |

推导：42 + 43 + 28.5 + 6（行 padding 上）+（50 − 21）/2（按钮在 50px 文字块里居中）≈ 134。320 与 400 恰好同高，是因为那 97 字符的摘要都正好折成 3 行（可用宽 202 / 282px，约 34 / 48 字符每行，需要 3 行）。

结论：**「需要你处理」在 DOM 里第一、在视口里也在第一屏、而且确实是第一个可点的东西**——不需要重排来抢首屏，ui-eff 的「首屏像素账」在这里是达标的（目标 ≤200px，实测 134）。

但它不是眼睛里的第一件事。竞争元素有三个，按强度：

1. **`.loom-metrics` 的 `b`（13px/500 mono）**：正上方 43px 的一条，六个数字里最大的 `26`/`18` 是累计量；`待处理 3` 被 `.hot` 染成 `--loom-warn`（#8f7a33），这是好意，却让整条数字带成为视觉起点。13px 对 10px（队列标题）是 1.3 倍，对 11.5px（行文）是 1.13 倍——层级差不足以让标题先被读到。
2. **`.loom-sec-head` 里的 `全收起`**：内联 `font-size:9.5px`（1960 附近的 `style`），与「战役 5」同排，是面板正文里第一颗按钮；它作用于全部 5 张卡，却长得像标题的一部分。
3. **`批准` 与 `驳回` 同形**：两个都是 `loom-btn bare` 11px 无边框，唯一的差别是 danger 的 hover 色（CSS 101）；主操作没有视觉优先权。

所以正确的问题不是「把队列再往上挪」，而是：**把指标条从 13px 降到 ≤11px，或者只留 `待处理` 与 `花费` 两格**；再给「批准」一个实心/描边的差异，让它在行内成为唯一的主按钮。

---

## §3 三种状态的对照：一秒内分不出来

取预览里的三张卡：`loom-self15`（运行中 + 3 条待审）、`loom-triangle`（运行中 + 0 条待审）、`loom-self3`（已完成）。

| | loom-self15（有待审） | loom-triangle（纯运行） | loom-self3（已完成） |
|---|---|---|---|
| 形态 | 展开卡 | 折叠行 | 折叠行 |
| 圆点 | 6×6，`--loom-ok` #3d8a58 | 6×6，`--loom-ok` #3d8a58 | 6×6，`--loom-idle` #7a7f87 |
| 状态字 | `运行中` 10px，`--loom-quiet`（68% ink） | `运行中` 同左 | `已完成` 10px，同色 |
| 右侧 | `42秒`（age）+ `⌄` | brief `未定价` + `›` | brief `最佳 1 · 9 条知识` + `›` |
| 待办可见性 | `待审 3` 在展开体里，y≈561（距卡头 258px） | 无 | 无 |

一眼能分辨的只有**展开/折叠**这一件事，而它是用户上一次点击的结果，不是状态。具体差多少：

- (a) 与 (b) 的头行像素级相同：同样 6px 圆点、同样 #3d8a58、同样 10px「运行中」、同样 10px 灰。不同之处只有 (a) 展开了、且 258px 之下有一行 `待审 3`。一屏 5 张卡里，**没有任何可横向扫的通道**能告诉读者「这张在等我」。
- (b) 与 (c) 差两个汉字和一颗点的色相：#3d8a58（绿，L≈0.52）对 #7a7f87（灰，L≈0.51）——明度几乎相同，靠色相区分；而 (c) 与 `loom-fresh`（规划中）**完全相同**：同一颗 #7a7f87、同一 10px 灰字。也就是说「做完了」与「还没开始」在颜色上不可分。
- 语义压缩：4 个色（ok/warn/bad/idle，CSS 76）承担了 5 个状态（running/paused/done/planning/failed），其中 3 个状态共用 idle。

可机械验证的差别应当是：`cardTone` 把 `open > 0` 提到 warn，`statusTone` 给 `done` 一个独立的第五色（或一个 `✓` 字形，而不是再加一个 hex）——两者都能被断言，且不需要新的布局空间。

---

## §4 五条该停止做的事

1. **停止把跨战役累计量放在首屏最大的字号上。** `26 轮`、`18 知识`、`5 战役` 不改变任何一次点击；它们占着 13px/500 的视觉首位，把 10px 的「待你处理」压成小标题。累计量该退到页脚或折叠区。
2. **停止把英文 summary 与英文 objective 当正文。** 队列行是 97 字符的英文原句（3 行、63px 行高），卡内 `loom-obj` 也是整段英文（`make the loop survive a hostile host: …`）。中文面板里最需要被读的两处，恰恰是唯一不翻译的两处。
3. **停止用「批准」一个动词覆盖三种检查点。** 批准一次晋升、接受一道不可达的门、接受一次 0.04 的回退，是三件不同的事，同一个按钮文案会把最贵的那次误操作变成默认路径。
4. **停止让「待审」在两种形态里长得不一样。** 折叠行有 9px 的「待 N」，展开后反而没有；而卡头最容易被扫的色点始终只表达「在跑吗」。同一个事实在两种形态下要么都在、要么都不在。
5. **停止用一个丢属性的静态预览为可访问性背书。** `panel-preview.mjs` 的白名单不写 `aria-*`，产物比源码旧一天，于是 `panel-audit` 的 OK 只证明了几何，却被读成「面板没问题」。

---

## §5 可机械验证的断言清单

全部对着 `tests/ui/harness.mjs` 的 `loadPanel()` 返回的 `__panel` 写；`data` 用预览里的同一份 payload（5 战役、loom-self15 带 3 条 openCheckpoints）。每条今天为假、修好后为真。

```
A1  assert.ok(/aria-/.test(fs.readFileSync('scripts/panel-preview.mjs','utf8')))
    // 且重新生成后：assert.ok(fs.readFileSync('docs/panel-preview.html','utf8').includes('aria-live="polite"'))
A2  assert.equal(panel.pending(data)[0].consequence, '同一道门会一轮轮重试，每轮都烧掉一次完整的候选成本。')
A3  assert.equal(panel.queueOf(data).rows.filter(r => r.showCampaign).length, 1)
A4  assert.deepEqual(panel.pending(data).map(r => r.actions[0].label), ['接受门不可达', '批准晋升', '接受回退'])
A5  assert.equal(panel.cardTone({ status: 'running', open: 3 }), 'warn')
A6  assert.deepEqual(panel.lastRoundNode(c15).children.map(k => k.landed), [false, true, false])
A7  assert.notEqual(panel.statusTone('done'), panel.statusTone('planning'))
A8  assert.equal(panel.foldBrief({ id: 'loom-fresh', status: 'planning', rounds: 0 }), '规划中 · 未开始')
A9  assert.ok(panel.treeOf(c15).find(n => n.key === 'wait').children.every(k => k.meta !== ''))
A10 assert.equal(panel.age(42000), '42秒前')
A11 assert.match(panel.CSS, /\.loom-metric b\{[^}]*font-size:11px/)
A12 assert.equal(panel.knowledgeHeader(data), '5 战役 · 18 有效 · 3 隔离')
```

三条需要新导出（`cardTone`、`foldBrief`、`knowledgeHeader`），九条改现有返回值；没有一条改动渲染几何，所以 `panel-audit` 在修完之后仍应全绿——这正是把它当作回归网的前提：**几何由 audit 守，语义只能由这些断言守**。

## 附：方法与局限

- 未运行 `node scripts/panel-audit.mjs`（本会话 PATH 里没有 node），所有结论来自 `docs/panel-preview.html` 的实际标记、`scripts/panel-preview.mjs` 的序列化逻辑与 `client/index.js` 的行号，配合 CSS 盒模型手算；像素值为推导值（±2px）。
- 预览是 2026-11-09 05:18 的产物，今天 client（11-10 03:54）里的 `whyNode`、`nodeBand`、`waitMs` 未出现在标记中；凡依赖它们的判断都已在文中避开（例如未把「band 缺失」列为缺陷）。
- 本文件不修改任何源码；A1 需要改的是 `scripts/panel-preview.mjs`，由持有写权限的任务执行。
