# 2026-11-21：把论文调研的五条纪律变成检查器

用户给了两个东西：一是 fin-oneyear1 那场战役的心跳误杀（见
`docs/hardening-2026-11-16.md` 的「等自己的命令不是卡死」一节），二是一个
3DGS 论文调研技能仓库，明确说**不要它的领域知识，要它的工具与方法**，并把
调研方法融进插件。

## 拿来的东西

仓库：[`jaccen/Awesome-Gaussian-Skills`](https://github.com/jaccen/Awesome-Gaussian-Skills)
（Apache-2.0），克隆在 `C:/Projects/awesome-gaussian-skills`，18 个 skill 目录。
真正值得看的是两个文件：

- `skills/3dgs-paper-reader/references/evidence-workflow.md`（21 行）——把「读论文」
  拆成辨身份、抽取检查、逐项记录、引用定位、保存审计五步。
- `skills/research-expert-team/SKILL.md`——R1–R9 九个检查角色，以及一张
  `Claim and type / Primary source / Location / Checked scope` 的证据台账。

其中五条是**可判定的**，所以不该写成嘱咐，而该写成检查器：

1. **一个可访问的 ID 只证明记录存在。** 身份是 title + authors + identifier 三件事；
   只有标题时它只是候选，候选不能携带断言。
2. **读法档位要声明**（metadata / abstract / full），且断言不能强于读法：从摘要里
   读出来的 mechanism、evaluation、ablations、reproducibility 是**笔记的缺口**，
   不是论文的结论。
3. **作者主张与读者推断是两种类型。** 类型必填，推断不能靠文笔洗成事实。
4. **每条断言都要 locator**（页、节、表、图、锚点）。没有 locator 就无法核对，
   也就不是证据。
5. **增量是同一协议下的两格相减。** 把两次不同设置的运行相减叫提升，是综述里
   最常见的数值错误。

## 落地

- 新模块 `src/research/note.js`：`gradeNote(note)` → `{ok, findings, counts}`，
  错误码 `shape` / `depth` / `identity-{title,authors,identifier}` /
  `claim-{type,section,locator,text}` / `depth-exceeds-reading` / `claims-empty` /
  `delta-{unpairable,protocol,mismatch}` / `gap-{scope,text}`；`DELTA_EPS = 0.005`，
  `NEEDS_FULL_TEXT = {mechanism, evaluation, ablations, reproducibility}`，
  `CLAIM_TYPES = {author-claim, literature-statement, measurement,
  reader-inference, hypothesis, proposal}`。纯函数、零依赖、对 `null`/`{}` 不抛错。
- 新脚本 `scripts/check-note.mjs`：`node scripts/check-note.mjs <note.json> [--json]`，
  干净退出 0、有 findings 退出 1、文件读不了退出 2——和验证器一样，先写再验，
  验过再信。
- 规格 `tests/self45/research-note.test.mjs`（22 条断言）先红在
  `ERR_MODULE_NOT_FOUND: src/research/note.js`，实现后转绿；覆盖身份三缺一、
  摘要级 mechanism 被拒而 problem 可过、未知类型被拒而 reader-inference 可过、
  无 locator、三种 delta 错误、gap 无 scope、junk 输入、CLI 两个退出码。
- `scripts/test-all.mjs` 的 standing 列表加入这条规格（self44 之后）；
  `docs/contracts.md` 新增 `research/` 一节（97 个模块）。

## 它查不出来的

- 论文是否真的这么说。locator 给了，仍然要有人把它打开；检查器只保证
  「这份笔记写得可以被核对」。
- 覆盖面。十篇的综述和五十篇的综述都能通过这五条；广度不在这五条里，
  它在 `docs/research-capability-2026-11-15.md` 的三层取源法里。
- 类型是否诚实地被使用。把推断标成 `author-claim` 依然能过——这里只能要求它
  必须选一个类型，并让 `counts.authorClaims` 与 `counts.inferences` 分开记账，
  让人一眼看到比例。

## 出处与许可

方法来自 `jaccen/Awesome-Gaussian-Skills`（Apache-2.0）的
`3dgs-paper-reader` 与 `research-expert-team`；本仓库只取其中的检查纪律，
没有引入任何 3DGS 领域内容。`gradeNote` 的字段命名沿用其
`sections` 八段（problem / contributions / mechanism / evaluation / ablations /
limitations / prior_work / reproducibility），以便两份记录可以互读。
