# Gear（rsi-gear 0.2.2）调研报告：能不能当引擎，还是只借思想

调研对象：https://github.com/rsi-gear/gear @ `11bad082e1163d12caf2f955125d596f40b395f1`（2026-11-02，Merge PR #107），克隆于 `C:\Projects\RSI\research\gear`。
标注约定：**【事实】**＝我读代码/文档确认并附 `文件:行号`；**【推断】**＝基于代码结构的判断，未运行验证。

---

## 0. 结论摘要

- **【事实】** Gear 不是"一个库"，而是三层拼起来的系统：①Node/TS 控制平面（可恢复 run journal + 预算/门禁 + provider 适配）②Python 搜索算法（GEPA 等，跑在沙箱子进程里）③外部评测基座（agent-hitch → Harbor → Docker 里的 DSH headless）。三者都不可省，去掉任何一层剩下的东西不构成"引擎"。
- **【事实】** 它优化的对象极其具体：**一个 DSH profile 源目录**（`preset/*.cordis.yml` + `plugins/*.js` + `prompts/*.md` + `workflows/*.md` + `skills/`），用 manifest + sha256 密封（`src/adapters/dsh/harness.ts:6-19`、`examples/automationbench-marketing/harness/manifest.json`）。不含 weights、不含基础设施、不含模型路由。
- **【事实】** 算法与执行严格分离：算法只会发 5 种 Operation（`python/gear/algorithms/contracts.py:10`），**不能**自己调用模型或容器；promote 的最终裁决权在 TS 运行时（`src/runtime/runner.ts:565-620`），算法只能 `nominate`（`python/gear/algorithms/workflow.py:567-591`）。这是它最值得学的架构决定。
- **【事实】** 候选代码不是算法"变异"出来的：GEPA 的 proposal 模块只把 diagnose 回来的 hypotheses 文本切片（`python/gear/algorithms/gepa/proposal.py:6-45`），真正的改文件动作由一个受沙箱约束的 Meta agent 执行（`src/adapters/codex/execution.ts:27-31`、`src/adapters/codex/sandbox.ts:104-113`）。
- **【推断】** 直接拿来当"我们产品的引擎"成本很高：绑 DSH 插件体系 + Hitch/Harbor + Docker + Linux 沙箱，官方明确 Windows 不支持生产 control-plane（`docs/plugin-installation-and-usage.md:39`）。**建议：不当引擎，当"参考实现 + 可借用零件"**；其中统计/门禁/预算三块可以低成本照抄（见 §8）。

---

## 1. 定位与边界

### 1.1 它到底优化什么

| 维度 | 是否可被 Gear 改 | 证据 |
| --- | --- | --- |
| Prompt / 指令 | 是 | `writableRoots` 含 `prompts`、`preset`（`src/adapters/dsh/harness.ts:6-19`） |
| Tools / hook | 目录可写；具体能否改工具取决于写出的 cordis 插件 | `writableRoots` 含 `plugins`、`allowedImports=['@deepseek-ai/','node:']`（`src/adapters/dsh/harness.ts:6-19`）；示例插件只用了 `ctx.systemPrompt.section(...)`，未见注册工具的实例（【推断】可写但无范例） |
| Workflow | 是，但只是 markdown 文档 | `workflows/*.md` 被当成"按需 read 的文件路径"注入 prompt（`examples/automationbench-marketing/harness/plugins/policy.js`） |
| Context 管理 | 部分（策略文本层面） | 同上，注入的是"怎么管上下文"的指令，不是运行时机制 |
| Skills | 是 | writableRoots 含 `skills`；materialize 时 `customSkillDirs: [/opt/gear-target/skills]`（`harness.ts:74-102`） |
| Model weights | **否**（实验性独立子系统） | `src/training/coordinator.ts:31 ModelTrainingCoordinator` 与 refine 闭环并列、未接入 run journal；README 自认"unfinished" |
| 采样参数/温度 | 否 | `CodexConfiguration` 只有 model 与 reasoningEffort，无 temperature（`src/adapters/codex/contracts.ts:17-25`） |

### 1.2 "harness" 在 Gear 嘴里是什么具体数据结构

**【事实】** 不是抽象概念，就是**一个目录 + 一份 manifest**：

```jsonc
// examples/automationbench-marketing/harness/manifest.json（节选）
{ "schemaVersion": 1,
  "parentRef": "4c681116f338e169af1a0acca9a8eb6ec9551570",
  "dshBaseRef": "b611388ce046292085abbabdbd951bbe608f0f1d",
  "toolchainRef": "dsh-rc2-codex-pnpm-11.7.0",
  "sandboxProfileRef": "harbor-terminal-bench-2.0",
  "artifacts": [ { "path": "plugins/policy.js", "digest": "sha256:…", "bytes": 3109 },
                 { "path": "preset/agent.cordis.yml", … },
                 { "path": "workflows/structured-cli-requests/request.py", … } ],
  "digest": "sha256:7dbe79d3…" }
```

- 目录约定由 `MutationPolicy` 固定：`writableRoots = ['preset','plugins','prompts','skills','workflows']`；`protectedNames = ['manifest.json','package.json','pnpm-lock.yaml',…,'.git']`；`allowedImports = ['@deepseek-ai/','node:']`（`src/adapters/dsh/harness.ts:6-19`）。
- 默认骨架由 `DshHarnessAdapter.prepare()` 生成三件套（`harness.ts:31-57`）：`preset/agent.cordis.yml`（两行：`- id: gear-policy` / `  name: ../plugins/policy.js`）、`plugins/policy.js`（读 `../prompts/system.md` 注入 systemPrompt）、`prompts/system.md`。
- `check()` 只校验 YAML 是数组且每项有 name（`harness.ts:58-65`）——**校验很浅**，能跑起来靠的是 DSH 自己报错。
- `materialize()` 把它搬进容器（`harness.ts:74-102`）：cp 到 `$environment/gear-target`，生成 `gear-target.patch.yml`（开 hmr、`sandbox-policy: danger-full-access` + `workspaceRoot:/app`、`approval: never`、`skill-filesystem.customSkillDirs: [/opt/gear-target/skills]`、insert `@deepseek-ai/cordis-plugin-include` 加载 `preset/agent.cordis.yml`），Dockerfile 两行 COPY，`agentArgs = ['--patch','/opt/gear-target.patch.yml']`。
- 端口抽象：`HarnessAdapter{describe, mutationPolicy, prepare, check, executionSpec, materialize?}`（`src/ports/harness.ts:2-27`），当前两个实现：`src/adapters/dsh/harness.ts`、`src/adapters/pi/harness.ts`。

**【推断】** 这个"harness＝被 mutation policy 圈住的 profile 源目录"的建模非常轻，好处是可 diff、可哈希、可回放；代价是它能表达的变化上限＝"改 prompt/插件/js/文档"，不能改 DSH 运行时本身（真正的工具实现得写成 cordis 插件）。

### 1.3 两层次（inner / outer）如何落成代码

| 层 | 语义 | 代码落点 | 谁在跑 |
| --- | --- | --- | --- |
| Inner（任务执行） | 固定 model+harness 跑 benchmark 任务，产出 trajectory + 分数 | `OperationProvider.submit()`（`src/ports/operations.ts:68-87`）；Hitch 实现 `src/adapters/hitch/provider.ts:93+` → `hitch --root <root> …`（`src/adapters/hitch/transport.ts:6-56`）→ Harbor → 容器内 `dsh --patch` | 外部 hitch/harbor 进程 |
| Outer（harness 优化） | 诊断失败 → 提候选 → 评估排序 → 提名 | Python `StagedSearch.step()`（`python/gear/algorithms/workflow.py:85-138`）；Meta agent 改文件：`src/adapters/codex/execution.ts:27+` | Node 主进程 + Python 子进程 + codex 子进程 |

- Inner 的产物被规范化成 `Evidence`（`contracts.py:13-38`）：`status ∈ {valid, task_failed, scoring_failed, environment_failed}`，**区分"分数 0"与"没测到"**，这是它整套统计的地基。
- Outer 的每一步都被 journal 固化，崩溃可恢复：`DurableRunner.run()`（`src/runtime/runner.ts:41-156`）决策上限 10 000 步（`:91-92`），state/decision/副作用 id 一次性提交（`:118-127`），失败转 `needs_recovery`（`:130-150`）。

---

## 2. 闭环算法（Diagnose → Evolve → Evaluate → Promote）

### 2.1 唯一入口：5 种 Operation

```python
# python/gear/algorithms/contracts.py:10
OperationKind = Literal["diagnose_seed", "generate_candidate", "evaluate_seed", "nominate", "stop"]
# :113-114
class SearchAlgorithm(Protocol):
    def step(self, view: SearchView, state: AlgorithmState) -> Decision: ...
```

`Decision = (state, operations, reason, research)`（`contracts.py:105-110`），`Operation(kind, candidate_id, parent_id, task_ids, scope, rationale, payload)`（`:77-91`）。算法**永远看不到**模型、容器、文件系统，只看到 `SearchView`（任务、候选、证据、剩余预算、anchor、objective）（`:63-74`）。

### 2.2 阶段状态机（通用驱动，非 GEPA 专有）

`python/gear/algorithms/workflow.py` 的 `StagedSearch.step()`（`:85-138`）是一个显式 phase 机：`baseline → parents → proposals → generated → rank`。

| 阶段 | 做什么 | 关键实现 |
| --- | --- | --- |
| baseline | 对 anchor 在**全部 seed 任务**发 `evaluate_seed`，权重 `1/N` | `workflow.py:92-118` |
| parents | 对每个 scope（global + 历史 local scope）排名 → `ParentOption` → 调 `parent_policy` | `workflow.py:140-247`；配额 `quota = max(1, candidates_remaining // remaining_rounds)`（`:209-211`）；批容量 `MAX_DECISION_OPERATIONS - 1`＝63，留 1 个 op 给父代评估（`workflow.py:229`，常量在 `python/gear/algorithms/limits.py:3`） |
| diagnose | 取 parent 在该 batch 上 `score<1` 或违反 objective 的失败任务，发 `diagnose_seed` | `workflow.py:249-296` |
| proposals | 拿回执里的 `diagnosis` 交 `proposal_planner`，按 quota 发 `generate_candidate`，`payload={"hypothesis": h}` | `workflow.py:298-368` |
| evaluate | 按 stage 抽样任务，`participants = (parent, *candidates)` **同任务同 repetition 一起评估** | `workflow.py:370-455` |
| rank | 在 scope 任务上排名，`width = promotion_widths[index-1]` 只推进前 N 个 | `workflow.py:457-533`；注释原文："Expansion allocates research budget; it does not replace the parent" |
| finish | 全任务重排名取第一个合格者 → `nominate` 或 `stop` | `workflow.py:567-591` |

预算不足时的行为是**显式失败而非降级**：`_finish("insufficient budget for comparable <stage> scope")`（`workflow.py:370-455` 内），即"要么可比，要么不做"。

### 2.3 候选如何生成（关键：不是 LLM 提议，也不是代码变异）

```python
# python/gear/algorithms/gepa/proposal.py:6-45（节选语义）
plan_proposals(view):
    # 1) 优先 diagnosis["clusters"] 中 task_ids 与失败集相交且 hypotheses 非空的第一簇
    # 2) 否则 diagnosis["hypotheses"] + 失败最多的 family 的失败任务
    # 3) 否则兜底 "Correct the observed seed failures while preserving successful behavior."
    return tuple(dict.fromkeys(hypotheses))[:candidate_limit]
```

- 模块内**没有一次模型调用**；hypothesis 只是被塞进 `Operation.payload`。
- 真正的"变异"由 Meta agent 完成：runtime 把 `diagnose_seed`/`generate_candidate` 交给 Codex 适配器，在 sandbox 里启动 codex 子进程，**只有 `generate_candidate` 才把 candidate 目录加入 allowWrite**（`src/adapters/codex/sandbox.ts:104-113`）。
- 候选的隔离与身份来自沙箱 + 摘要：`CodexInput.action ∈ {describe, prepare_admission, submit, inspect, cancel}`（`src/adapters/codex/contracts.ts:36-43`），`job.identity` 不一致即拒绝执行（`execution.ts:46-48`）。

**【推断】** 所以"候选生成策略"的定制点被切成两半：*说什么*（hypothesis 文本，Python 可改）和*怎么改*（Meta agent 的编辑能力，TS/沙箱决定，Python 改不了）。这既是解耦也是限制——你无法用自定义算法实现"结构化 patch 变异"，只能通过自然语言指挥 Meta agent。

### 2.4 如何评估（任务采样 + 评分 + 预算）

- 采样：`GEPASampler(local_ratio=0.08, shared_ratio=0.04, cross_ratio=0.03, bridge_ratio=0.4, bucket_weights=(("local",0.6),("shared",0.25),("cross",0.15)))`（`python/gear/algorithms/gepa/sampling.py:33-125`）。global 阶段用全量 seed；bridge 用 `required ∪ 分层抽样 ceil(0.4N)`；local 用 失败任务 + 最多 1 个 control + 跨 family 任务。比例很小（8%/4%/3%），说明它靠**多次便宜局部评估 + 一次全量确认**控成本。
- 分层抽样细节：按 family 分组、family 内按 `estimated_cost` 升序、family 间随机排序，然后**交替从最便宜/最贵两端取**（`sampling.py:13-30`）。
- 评分：`complete_scope_mean()`（`python/gear/algorithms/evidence.py:65-123`）——要求 scope 内**每个 (candidate,task,repetition) 恰好一条有效证据**，缺一格 → `RankingPlan.incomplete`，整个候选当批不参与；无 objective 时 `score = Σ w_t·s_t`（w 默认 1/N，且必须和为 1，误差 1e-9）。
- objective 复杂时：Fraction 精确累加、`comparison_key(v, quantum)=floor(v/quantum+1/2)` 分桶抗浮点噪声（`python/gear/algorithms/objective.py:37-43`）、`score_ceiling()` 算加权上界用于**合法早停**（任一 metric 无 range 就返回 None，禁止早停；`:46-59`）；排序 key 变成 `(not constraints_passed, -score, candidate)` —— **约束优先于分数**（`evidence.py:65-123`）。
- 预算：`budget.max_evaluations` 默认 40（"physical attempt limit，含 baseline、候选、终验与失败修复"）、`max_candidates` 默认 2、`rounds` 默认 1（`docs/guide/en/configuration.md:29-32`）；另有 `generation` 预算单独计 Meta 的模型请求/token（同文件 `:81-90`）。
- 成本核算到"未完成的 reservation 仍占额度"：`coverage.reserved_attempts`、usage 缺一项则总额为 null（`docs/guide/en/results.md:60-75`、`configuration.md:40-42`）。

### 2.5 如何 promote（配对比较 + 两级门禁）

- 配对：同一 batch 内 parent 与所有候选在**同一任务集、同一 repetition** 上评估（`workflow.py:370-455`），所以比较是同条件配对而非跨 run 比分数。
- 算法层只**提名**：`_finish()` → `Operation("nominate")` 或 `stop`（`workflow.py:567-591`）。
- 运行时层做**冻结门禁**（`src/runtime/runner.ts:565-620`），顺序固定：
  1. `compare(journal,'seed',nominee)` 不完整 → `incomplete`；
  2. 违反 frozen objective 约束/保护 → `rejected`；
  3. `seed.gain <= acceptance.minimumGain` → `rejected`（"Seed improvement does not meet the frozen acceptance rule"）；
  4. `validationMode==='research'` → 直接 `accepted`，理由写明"no independent validation"；
  5. 否则为 anchor 与 nominee 各补一次 `scope='held_out'` 评估（"Frozen final gate"），`gain < -acceptance.maxHeldOutRegression` → `rejected`（"Held-out regression exceeds the frozen limit"）；
  6. 通过才 `store.commitChampion()`（CAS）。
- 不变式：**held-out 只进门禁，绝不回流做优化信号**（`skills/refine/SKILL.md` 硬规则："Independent held-out data belongs to the final acceptance gate, and must not become optimization feedback"）。

### 2.6 父代选择里的统计设计（最值得抄的部分之一）

`python/gear/algorithms/gepa/parents.py:18-80 frontier_options()`：

1. 按 scope 分组、按 `task_ids+weights` 去重等价 scope、每 scope 按内容 digest 去代表；
2. 只保留"**所有候选都有分**的任务交集"上做**多目标 Pareto 前沿**（逐任务取高分者集合 winners，按该任务权重累加 mass，`option.probability = masses/total`）；
3. 从最差 aggregate 往上删被支配成员，**任务唯一冠军永远保留**；
4. 无任务维度分时回退 champion 或最高 aggregate。

`parents.py:83-139 ScopedFrontier(champion_probability, batch_count)`：把部分概率质量强制留给 champion（champion 无完整 eligible seed scope 时直接 `raise "champion has no complete eligible seed scope"`——宁可崩也不静默降级），batch_count 决定一次抽几个父、候选怎么分。

---

## 3. 可定制点（Python 组件接口）

【事实】作者 API 集中在 `python/gear/algorithms/__init__.py`（注释自称 "Stable algorithm author API"），5 个 Protocol + 1 个组合器：

| 模块 | 协议/签名 | 输入 → 输出 | 文件:行 |
| --- | --- | --- | --- |
| 父代选择 | `ParentPolicy.__call__(view: ParentInput, rng: RandomSource) -> ParentPlan` | `(eligible, candidate_limit, champion_id)` → `allocations[(selection, count)]` + reason | `contracts.py:117-165` |
| 任务采样 | `TaskSampler.__call__(view: SamplingInput, rng) -> SamplingPlan` | `(tasks, failures, stage, required, controls)` → `(task_ids, weights, reason, buckets)` | `contracts.py:168-186` |
| 提议规划 | `ProposalPlanner.__call__(view: ProposalInput) -> ProposalPlan` | `(parent, failures, diagnosis, candidate_limit, tasks)` → `(hypotheses, task_ids, reason)` | `contracts.py:189-206` |
| 候选排序 | `CandidateRanker.__call__(view: RankingInput) -> RankingPlan` | `(candidate_ids, task_ids, evidence, repetitions, weights, objective, anchor_id)` → `(ids, scores, incomplete, disqualified)` | `contracts.py:209-229` |
| 停止规则 | `StopRule.__call__(view, state) -> str \| None` | 返回理由即停 | `contracts.py:232-241` |
| 组合器 | `StagedSearch(parent_policy, sampler, proposal_planner, ranker, stop_rule, stages, promotion_widths, global_gate)` | 状态机本体 | `workflow.py:62-83` |
| 默认实例 | `GEPA(...)`（5 个策略全可注入）、`RandomSearch` | | `python/gear/algorithms/gepa/algorithm.py:20-41` |

写一个自定义算法需要什么（【事实】，`docs/guide/en/example-algorithm.md:7-47`）：
1. 一个模块里定义纯函数，签名匹配上表，例如 `def select_parent(view: ParentInput, rng: RandomSource) -> ParentPlan`；
2. 用 `ParentPlan.single(...)` / `.abstain("...")` 等构造器返回，不允许裸 dict；
3. 必须**可声明依赖、可序列化**：admission 会冻结源码与声明依赖，"Local functions, lambdas and undeclared dependencies are not resumable"（`example-algorithm.md:44-46`）；
4. `python -m gear algorithm test my_policy:select_parent` 离线自测（不调模型）；
5. 挂进项目两种方式：`gear.yaml` 里 `algorithm: {name: gepa, options: {promotion_widths: [2,1], global_gate: no_regression}}`（`configuration.md:26`）或 Python `Project.open(".").refine(algorithm=GEPA(parent_policy=select_parent), rounds=1)`（`example-algorithm.md:31`）。
6. 配方文件约定：`parents.py / sampling.py / proposal.py / ranking.py / stopping.py / algorithm.py` 六件套（`skills/refine/SKILL.md`）。

随机性：`DeterministicRandom(f"{view.seed}:{view.step_id}")`（`workflow.py:624-626`），给定 seed 即可重放出同一个父代/任务选择——【事实】这是它能"重放实验"的关键。

---

## 4. 与 DSH 的集成方式

### 4.1 cordis.patch.yml 改了什么

【事实】全文 5 行有效内容：

```yaml
- insert:
    - id: refine
      name: rsi-gear
      disabled: true
```

配合 `package.json` 的 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。注释写得很明确：安装只插入一行**禁用**的控制平面，"keeping the package layer disabled makes installation side-effect free"，启用必须由用户在自己 profile 的 patch 里打开并给 `projectRoot`（`src/adapters/dsh/project-plugin.ts:17-31` 校验只接受 `projectRoot` 与 `socketPath`）。

### 4.2 作为 DSH 插件它挂了什么

`src/adapters/dsh/project-plugin.ts`：

```ts
export const name = 'refine'                        // :15
export const inject = ['commands', 'tools', 'skills']  // :16
export const Config = Schema.object({ projectRoot: Schema.string().required(), socketPath: Schema.string() })  // :21
ctx.provide('gear', control.controller)             // :38   → 其他插件可注入 ctx.gear
ctx.commands.register({ name: 'gear', … })          // :39-66 → 斜杠命令 /gear
mountProjectSkill(ctx, control.controller)          // :37   → 注册 refine_request 工具 + bundled refine skill
```

`refine_request` 工具（`src/adapters/dsh/project-skill.ts:32-70`）：`{method: string, params: json, request_id?}` → 直接转发到同一个 `ProjectController.call(method, params, id)`；`request_id` 用于"响应丢失后重放不重复建 run"。对应地 `mountProjectSkill` 还通过 `ctx.skills.registerProvider` 注册了随包携带的 refine skill（`:11-31`）。

### 4.3 Refine Skill 如何驱动

【事实】`skills/refine/SKILL.md`（97 行）是**操作手册式 skill**，不是代码：它告诉 agent 依次跑 `gear setup → doctor → init → profile → benchmark import/check/probe → evaluate --split seed --limit 1 → refine --rounds N --dry-run → refine → report/archive/experience → resume/cancel/export`，并给两条硬规则（不得凭候选解释判断提升；held-out 不得进优化信号）与一条算法作者规则（六文件 + `gear algorithm test`）。skill 通过 DSH 的 skill provider 注册，"原生 `refine_request` 可用时优先用它"——即 skill 是**给模型的入口文档**，实际动作打到控制平面。

### 4.4 依赖 agent-hitch 做什么

【事实】Hitch 是"评测执行器 + 证据来源"：Gear 不自己跑容器，而是 `spawn(hitch, ['--root', root, ...args])`（`src/adapters/hitch/transport.ts:6-56`），由 Hitch 负责 exact-commit 身份、Harbor 任务发现/容器运行/verifier/reward、multi-attempt slot 重跑；Gear 只拿回结构化 trial 证据。约束写得挺硬：`agent-hitch >= 0.2.5`、**生产评测只用 Hitch CLI 不用其 Node 内部 API**、启动时做 version/capability preflight、失败绝不去掉 `--eval-id` 重试（`docs/plugin-installation-and-usage.md:29-33`）。stderr 被丢弃（"Credentials and provider diagnostics never enter Meta errors"，`transport.ts:6-56`）。

### 4.5 我该怎么复用它（四种形态，按侵入度排序）

| 形态 | 可行性 | 依据 |
| --- | --- | --- |
| **npm 依赖 import 库 API** | 【事实】有，但只覆盖"控制平面"，不含算法（算法在 Python） | `src/index.ts:3-37` 导出 `ProjectApplication`、`ProjectController`、`createProjectControlPlane`、`DshHarnessAdapter`、`PiHarnessAdapter`、`initProject`、`setup`、`doctor`、benchmark import/probe、`GearError`、`RunSpec/RunJournal` 等类型；`src/skill/index.ts:1-6` 导出 skill server/client 与 `loadBundledRefineSkill` |
| **CLI 调用** | 【事实】最稳，所有能力都在 CLI 上，且 `--json` 单次返回 | `src/cli/project.ts:61-355`：显式分支 `serve/setup/doctor/profile/init/benchmark/experience/config/algorithm/evaluate/refine`，其余落到 `run.<command>` 通用通道（`report/archive/export/resume/cancel`，`:347-354`）；自定义算法还可用 `refine --algorithm-config <json>`（`:327,333-337`） |
| **MCP / skill 调用** | 【事实】没有 MCP server；有 DSH tool（`refine_request`）+ unix socket JSON-lines 控制面 | `project-skill.ts:32-70`；`src/adapters/skill/server.ts:26-28`（`write(socket, v)` 就是 `${JSON.stringify(v)}\n`），协议是 `{id, method, params}` 信封（`:11-25`） |
| **Python 库 API** | 【事实】`gear.Project` 存在，但**内部是 CLI 子进程包装**，不是进程内 API | `python/gear/project.py:376-421`：`shutil.which("gear")` 或 `GEAR_COMMAND` argv，`--project <root> --json <args>`，失败读 stderr |

**【推断】** 对"在我们自己的 DSH 插件里复用"：库 API 够用（`createProjectControlPlane` + `ProjectController.call` 就是 socket 协议的服务端），但你会连带承担 Python 子进程、沙箱、Hitch 依赖；如果只是想借算法，**更划算的是把 Python 算法层（`python/gear/algorithms/`）单独抄出去**，它只依赖标准库 + dataclass 契约，不依赖 DSH。

---

## 5. 数据与产物

### 5.1 一次运行的磁盘布局（【事实】合成自多处）

```
<project>/
  gear.yaml, benchmark.yaml, tasks.csv, target/, .gear/
    config.lock, imports/<planId>.json, probes/<probeId>.json, doctor/,
    control.sock            # gear serve / 插件控制面（win32 不做 unlink/chmod：server.ts:71-105）
    runs/<runId>/
      journal.json          # 全量状态机快照（不可变发布，带 digest 自校验：run-store.ts:21-63）
      research/             # ResearchStore：算法自报的 scope/ranking/parents 记录
      <opId>/…              # 每次 operation 的工作目录：events.jsonl、stderr.log、cancel.json、schema.json
      exports/…             # gear export 输出：retained target + manifest + report + changes
```

- `journal.json` 是**唯一真相**：`RunJournal{version,id,createdAt,spec,specDigest,generation,status,state,decisions[],operations[],candidates[],seedEvidence[],heldOutEvidence[],completed[],nomineeId,championId,gate{status,reason},physicalAttempts,failure,digest}`（`src/domain/run.ts:82-103`），`status ∈ {ready,running,needs_recovery,cancelled,completed}`；读取时用 canonical digest 复核，篡改即 `run-identity-mismatch`（`src/adapters/storage/run-store.ts:47-63`）。
- `RunSpec` 是**冻结的实验条件**（`src/domain/run.ts:28-58`）：benchmarkDigest、configDigest、providerIdentity、evaluationIdentity、championRevision、algorithm{name,options}、validationMode、budget、acceptance、objective、generationBudget。改配置不能改运行中的实验，只能新开 run。

### 5.2 报告 schema（外部 UI 最该读的东西）

`gear report RUN_ID --json`（`docs/guide/en/results.md:51-79`）字段：

| 字段 | 含义 |
| --- | --- |
| `status` / `initial` / `retained` / `nominee` / `gate` | 入口五件套；`gate.status ∈ {accepted,rejected,incomplete,not_run}` + reason |
| `scores.seed` / `scores.held_out` | 分数、observed/required slots、完整性 |
| `coverage.{valid,valid_zero,invalid,scoring_failed,environment_failed,physical_attempts,reserved_attempts}` | 分母恒定的计数（缺失不缩分母） |
| `evaluation_repairs` / `evidence_projections` | 修复次数、用法、blocked 原因 |
| `changes.retained` / `changes.nominee` | 逐文件 diff：path、增删改、before/after digest、可执行位；UTF-8 文本带 unified patch（>64 KiB 或二进制只留元数据） |
| `usage` | provider 用量；**null ≠ 0** |
| `plan` | 冻结的准入范围（不是实时剩余预算） |
| `baseline_reuse` / `research` | 基线复用证明；研究归档（`gear archive` 读） |

每个 score scope 内含 `metrics`、`objective.contributions`、`objective.constraintResults`、逐任务 `protection`（`results.md:108`）——【推断】这已经是一份能直接喂给 dashboard 的 schema（候选 × 任务 × repetition 的矩形 + 分母 + 门禁结论）。

### 5.3 外部程序能否驱动 UI

【事实】能，三条路：
1. **读文件**：`journal.json`（状态机）、`research/`（算法自述）、`export` 目录（含 `experience-snapshots.json`、`trajectory-sources.json`、`research-archive.json`、`baseline-source.json`，见 `results.md:81-104`）；都是不可变、带 digest 的 JSON。
2. **CLI `--json`**：`report` / `archive` / `experience` / `export` 全部单次 JSON。
3. **控制面 socket**：`gear serve` 或插件内 `createProjectControlPlane()` → `.gear/control.sock`，JSON-lines 请求 `{id, method, params}`（`server.ts:11-28`），方法即 `ProjectController.call(method,…)`（`project-controller.ts:81`），如 `run.refine` / `run.report` / `benchmark.check`。
【推断】做 UI 建议走 socket（可长任务 + request_id 幂等），只读页面走 journal/report JSON 更省事。

---

## 6. 落地成本

### 6.1 依赖清单（【事实】）

| 依赖 | 要求 | 证据 |
| --- | --- | --- |
| Node | `^22.19.0 || >=24.0.0` | `package.json engines` |
| DSH | `0.1.0-rc.8` 或 `0.1.1-rc.2`；需提供 cordis/dsh-agent/-session/-skill/-tools/-llm 等 11 个 peer 包 | `docs/plugin-installation-and-usage.md:22-33,54-68` |
| pnpm | 在 PATH（`dsh plugin` 转发） | 同上 `:26` |
| Git | 支持 worktree | 同上 `:27` |
| Python | 3.10+（开发/CI 用 3.12）+ IPython | `docs/guide/en/quickstart.md:3-6`、`plugin-installation…:28` |
| Hitch | `agent-hitch >= 0.2.5` | `:29` |
| Harbor + Docker | 任务发现/容器运行/verifier | `:30-31` |
| 平台沙箱 | macOS `sandbox-exec`；Linux `bwrap`+`socat`+`rg`（+ seccomp 或 bubblewrap-only） | `:35-48` |

### 6.2 Windows 能不能跑

**【事实】** 官方口径：`docs/plugin-installation-and-usage.md:39` —— "Windows：当前不支持作为生产 control-plane host"。技术佐证：
- Meta 沙箱走 `@anthropic-ai/sandbox-runtime`，代码里只有 `darwin`（sandbox-exec）/`linux`（bubblewrap）分支，`sandbox.ts:119-134`，无 win32 分支；
- CI 只有 `ubuntu-24.04` 与 `macos-15`（`.github/workflows/ci.yml:20,41,88,113,136`），无 Windows job；
- 控制面 socket 虽然对 win32 做了 `if (process.platform !== 'win32')` 的 unlink/chmod 跳过（`server.ts:71,94,105`），但那是"别崩"，不是"支持"；
- Harbor 任务本身就是 Linux 容器（`docs/guide/en/datasets.md:77` 明确拒绝 multi-step/Windows 任务环境）。
**【推断】** 在 Windows 上可以跑：`gear init` / `benchmark check` / `algorithm test` / `--dry-run` 规划这类纯本地命令；**跑不了**完整 refine（Meta 沙箱 + Docker Linux + bwrap 全缺）。真正落地要 WSL2 或 Linux 机器。

### 6.3 benchmark 格式

【事实】两条路：
1. **原生模板**：`tasks.csv`（列 `id,instruction,expected,family,split`）或 JSONL + `benchmark.yaml`；`expected` 支持 `text`（trim/casefold/collapse_whitespace 三种比较）、`json`（JSON Pointer 值映射）、`files`（路径→内容）（`docs/guide/en/datasets.md:3-26`）。`split` 必须显式 seed/held_out，family 或相同内容不得跨分区。
2. **Harbor 原生导入**：`gear benchmark import /path --template harbor`，保留 instruction/环境/tests/solution/权限/空目录，镜像 tag 解析为固定 digest，预构建镜像转成 Dockerfile 基底；拒绝动态 ARG、多步 Compose、Windows 环境、host mount（`docs/refactor-progress.zh-CN.md:51`、`datasets.md:60-77`）。
3. 分割策略：导入时可自动把约 1/5 的组按确定性 hash 分到 held_out；组数 <2 不能 holdout，只能显式 `--research`（`datasets.md:60`）。

### 6.4 实验数字的可信度

| 数字 | 条件 | 评价 |
| --- | --- | --- |
| Luna medium：Marketing 27.0%→40.0%、objective 75.4%→83.9%；Support 17.0%→25.0%、72.9%→81.3%；TB2.1 52.8%→62.9% | README "Same-model, same-effort harness comparison"，同模型同 effort，harness 换 DSH Base → DSH+Gear（`README.md:49-53`） | **结构上可信**（同 effort、同模型、配对 harness），但只有单次演进结果、无多种子方差、无置信区间；判定"提升"靠 pass rate 点估计 |
| Astra max：Marketing 57.0%→61.0%、Support 35.0%→39.0%、TB 86.7%→87.6% | 同上，但 baseline 是 **Codex** 不是 DSH Base | 这是"跨 harness 家族"比较，混杂因素多，README 自己也把 Codex 单列 |
| Luna max：Marketing 53.0%/88.9%、Support 27.0%/82.4%、TB 84.3% | README `:62-72` 明确写"improvements over Luna's medium baseline include both harness and effort changes" | **不可归因于 harness**，作者已声明 |
| 成本 $0.0568 vs $1.1858 /task | 同一优化 harness `a0740800`、AutomationBench **100 个公开 Marketing 任务**、API 等价估算（非真实账单，排除 harness 优化成本/无效尝试/基础设施） | 口径写得干净（`docs/marketing-token-cost.md:5-15`），是"估算"不是"账单" |
| 53/100 vs Codex 57/100 | `examples/evolution-search/README.md:13` 明说"public research set with **no independent held-out**" | **这是最需要注意的一条**：主推案例本身没有独立 held-out，属 research 模式（对应 `validationMode==='research'` 的"accepted: no independent validation"分支，`runner.ts:565-620`） |

**【推断】** 可信度分层：机制/口径可信（门禁、分母、usage 都写死了）；效应量可信度中等（单次演进、点估计、benchmark 可能是自家/公开集）；**外推性未知**（不同任务域、不同 harness 起点是否还有 +13pp 没有证据）。

---

## 7. 可复用清单

### 7.1 直接复用（拿来即用，几乎不用改）

1. **`python/gear/algorithms/` 六个契约 + `StagedSearch` 状态机**（`contracts.py`、`workflow.py`）：纯标准库 + dataclass，不依赖 DSH/Harbor，可以原样搬进任何"候选-评估-排序"搜索系统。
2. **`evidence.py` 的完整性语义**：`(candidate,task,repetition)` 缺一格即 `incomplete`、`valid_zero` 与 `missing` 分离、分母恒定。
3. **`objective.py` 的 `comparison_key` 分桶 + `score_ceiling` 早停**：几行代码解决"浮点噪声导致假提升"和"何时可以合法早停"。
4. **`RunJournal` + `RunSpec` 的冻结实验条件设计**（`src/domain/run.ts:28-103`）与"state/decision/副作用 id 一次性提交"的恢复写法（`runner.ts:118-127`）。
5. **`skills/refine/SKILL.md` 的操作序列与两条硬规则**：这是一份现成的"agent 驱动自演化"流程规范，可改写进我们自己的 skill。

### 7.2 改造复用（结构对，需要换掉执行基座）

1. **`OperationProvider` 端口**（`src/ports/operations.ts:68-87`）：接口很干净（submit/completeEvidence/inspect/cancel + capabilities 位图），但没有 DSH/Hitch 时得自己实现一个 provider——这其实是"接我们自己的 runner"的最短路径。
2. **`HarnessAdapter` + `MutationPolicy`**（`src/ports/harness.ts:2-27`）：把"可演化面"显式声明成 writableRoots/protectedNames/allowedImports，这个抽象可以照搬到任何 profile-as-files 的 agent 框架。
3. **GEPA 的 Pareto 父代选择 + `ScopedFrontier`**（`gepa/parents.py`）：逻辑可直接用，但概率质量、batch_count 的默认值是按"100 任务 + 40 次评估"调的，换规模要重调。
4. **控制面 socket 协议**（`adapters/skill/server.ts` + `ProjectController`）：`{id, method, params}` + `request_id` 幂等，是给 UI/多 agent 共享一个 run 的好模型；但要换成我们自己的方法表。
5. **报告 schema**（`docs/guide/en/results.md:51-108`）：字段设计可直接当我们的 dashboard 契约，只需删掉 Hitch/Codex 特有字段。

### 7.3 只借思想（绑定太深或收益不匹配）

1. **Meta agent = Codex 适配器 + 沙箱**（`adapters/codex/*`）：与 codex CLI 参数、`--output-schema`、seccomp/bwrap 强绑定，Windows 无解；借"诊断与生成都跑在受限沙箱里、只有 generate 阶段可写候选目录"这个思想即可。
2. **Hitch/Harbor 执行链**：`agent-hitch >= 0.2.5` + Docker + 镜像 digest pin 的一整套；借"exact-commit 身份 + slot 级重跑 + 证据来源签名"的思想，不必接这套 CLI。
3. **DSH 插件形态（cordis bundle + patch）**：`disabled: true` 的 dormant row 设计很讲究，但那是 DSH 生态特有的分发方式。
4. **模型训练子系统（`src/training/*` + `python/gear/training`，约 100 文件 + SLIME）**：`ModelTrainingCoordinator` 自成体系、未接入 refine 闭环、依赖 GPU/SLIME；只借"训练与 harness 演化并列、共享 champion/证据"的图景。
5. **`/opt/gear-target` 容器内 materialize 方案**：借"把候选 profile 目录 COPY 进镜像 + 用 patch.yml 挂载"的做法，具体路径与 skill-filesystem 配置要按我们的运行时重写。

---

## 8. 如果不用它，该抄哪几个具体零件

按"投入产出比"排序：

1. **两级门禁的判定顺序与文案**（`src/runtime/runner.ts:565-620`）：先完整性 → 再约束 → 再最小增益 → 再 held-out 不回归 → 才接受。特别是把 `minimumGain` 与 `maxHeldOutRegression` 做成**冻结在 RunSpec 里的两个标量**，而不是运行时参数——这让"放宽门槛"变成新开一次实验，而不是偷偷改判据。
2. **"算法只能提名，不能裁决"**（`workflow.py:567-591` + `runner.ts:565-620`）：把 promote 的最终决定权从搜索算法手里拿走，是防止"算法给自己放水"的最有效结构。
3. **预算分配：`quota = max(1, candidates_remaining // remaining_rounds)`**（`workflow.py:209-211`）+ 批次容量留 1 个 op 给父代评估（`MAX_DECISION_OPERATIONS - 1`）。小而具体的两条规则，直接决定"不会第一轮就把预算烧光"。
4. **证据完整性即准入**（`evidence.py:13-62`）：只要有一个 slot 缺失，整个候选当批不参与排序；配合"reserved attempt 仍占额度"（`configuration.md:40-42`），堵住了"多跑几次挑最好结果"的漏洞。
5. **`comparison_key` 分桶比较**（`objective.py:37-43`）：`floor(v/quantum + 1/2)`，一行代码消灭浮点抖动引起的假胜负。
6. **Pareto 前沿 + 概率质量分配**（`gepa/parents.py:18-80`）：不是"取最高分当父代"，而是按逐任务冠军的权重质量抽父代，天然保留多样性；再叠加 `champion_probability` 保底探索 exploit。
7. **stage 分层的采样比例**（`gepa/sampling.py:33-125`：8%/4%/3%/40% + 全量 global 确认）：便宜的局部筛 + 昂贵的一次全量确认，是"评估预算有限"场景的通用配方。
8. **research 模式显式化**（`validationMode: 'holdout' | 'research'`，`runner.ts:565-620`）：没有独立 held-out 时不是拒绝运行，而是把结论降级成"shared-set research, no independent validation"并写进报告——诚实且可审计。

---

## 附录：本次阅读覆盖的文件（可作为二次核查入口）

`src/adapters/dsh/harness.ts`、`src/adapters/dsh/project-plugin.ts`、`src/adapters/dsh/project-skill.ts`、`src/adapters/codex/{contracts,execution,sandbox}.ts`、`src/adapters/hitch/{transport,provider}.ts`、`src/adapters/python/worker.ts`、`src/adapters/storage/run-store.ts`、`src/application/{control-plane,project-service,project-controller}.ts`、`src/cli/project.ts`、`src/domain/{run,algorithm-wire}.ts`、`src/index.ts`、`src/ports/{harness,operations}.ts`、`src/runtime/runner.ts`、`src/skill/index.ts`、`src/training/coordinator.ts`、`python/gear/algorithms/{contracts,workflow,evidence,objective}.py`、`python/gear/algorithms/gepa/{algorithm,parents,proposal,sampling,ranking,stopping}.py`、`python/gear/project.py`、`python/gear/refine/worker.py`、`skills/refine/SKILL.md`、`docs/guide/en/{quickstart,configuration,datasets,example-algorithm,results}.md`、`docs/plugin-installation-and-usage.md`、`docs/marketing-token-cost.md`、`README.md`、`cordis.patch.yml`、`examples/{automationbench-marketing,evolution-search}/`。

测试规模：`find tests -name "*.spec.ts"` = 91 个文件；`python/tests/test_*.py` = 73 个文件；CI 仅 `ubuntu-24.04` / `macos-15`（`.github/workflows/ci.yml:20,41,88,113,136`）。
