# Open Dream-RSI 精读：DSH 插件、学习闭环与可复用性评估

- 仓库：https://github.com/patrykorwat/open-dream-rsi ，clone 于 `research/open-dream-rsi`，HEAD `02a91bb`，`VERSION` = 0.4.8，Python 纯 stdlib（自述），`open_dream_rsi/` + `plugins/` 合计约 9.3k 行 py。
- 精读时间：2026-11-06。方法：读源码为主，README/docs/CHANGELOG 只用于对照「宣称 vs 实现」。
- 标注约定：**【事实】** = 代码可验证（附 `path:line`）；**【推断】** = 我的判断，不可由代码直接证实。
- 结论先行：这是一个**诚实度很高的单机 RSI 骨架**——它的价值 80% 在「回放门控 + 事件溯源 + 证据结构化」这三件设计，20% 在实现；作为 DSH 插件它只是一个 **npm 分发的 MCP-stdio 适配壳**，与 DSH 的 session 生命周期零耦合，几乎不能直接当「人在环编排」的底座用，但它的**判据**可以直接抄。

---

## 1. DSH 插件实现：npm bundle + 零业务代码的 MCP 桥

### 1.1 包结构【事实】

```
plugins/deepseek_harness/
  package.json          # name: dsh-open-dream-rsi, v0.4.8, type: module
  bridge.js             # 唯一的 JS（约 220 行）
  cordis.patch.yml      # bundle 的唯一贡献：两行 overlay
  run_mcp.py            # 12 行：把包根塞 sys.path 后转 cli.main
  open_dream_rsi/       # vendored 一份完整 Python 包（有漂移测试守护）
  odr.cordis.yml        # 备选：手写 overlay（绝对路径）
  odr-http.cordis.yml   # 备选：streamable-http transport
```

`plugins/deepseek_harness/package.json`：`main`/`exports` 都指向 `./bridge.js`，`files` 只含 5 项，`dependencies` **为空**，关键字段：

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

即：它是一个**按 DSH bundle 约定交付的 npm 包**，业务逻辑 100% 在 Python 里，JS 只做两件事（见 1.2）。不是自研插件 API、不是 MCP proxy 重写，也不是「在 Node 里重新实现算法」。

### 1.2 注册方式：只 provide 一个服务 + 插一行 MCP client【事实】

`plugins/deepseek_harness/bridge.js:211-220`：

```js
function apply(ctx) {
  state.ctx = ctx;
  ctx.provide("odrBundle", { python: "python3",
                             runner: import.meta.dirname + "/run_mcp.py",
                             childEnv });
}
```

`plugins/deepseek_harness/cordis.patch.yml:19-41` 插入两行：

```yaml
- id: odr-bundle-paths
  name: dsh-open-dream-rsi/bridge
- id: mcp-open-dream-rsi
  name: '@deepseek-ai/dsh-mcp-client'
  inject: [odrBundle]
  config:
    serverName: open_dream_rsi
    transport: stdio
    command: !!js ctx.odrBundle.python
    args: [runner, 'mcp', '--tasks', <cwd>/tasks.json, '--memory', <cwd>/.dream_rsi]
    env: !!js ctx.odrBundle.childEnv()
    toolCallTimeoutMs: 1800000   # 默认 60s 会杀死 odr_run_once/odr_dream
```

于是工具以 `mcp__open_dream_rsi__<tool>` 出现。**没有注册任何自定义 Tool、没有 hook、没有 prompt/resource、没有 session 事件订阅**——`grep -n "session\|hook" plugins/deepseek_harness/README.md` 只命中「怎么在会话里调用」。这是 DSH 侧最重要的事实：**它是「借 DSH 的 MCP 客户端 + DSH 的模型」的寄生式集成**。

### 1.3 LLM 反代：最值得抄的一手【事实】

DSH 会 scrub 子进程 env（匹配 `KEY|PASSWORD|SECRET|TOKEN` 与全部 `DSH_*`），所以 ODR 拿不到任何 key。bridge 的做法：

- 起服务：`bridge.js:24-27` 宿主进程内 `listen(0, "127.0.0.1")`，`server.unref()`，`requestTimeout = 0`；
- 喂子进程：`bridge.js:44-46` `OPENAI_BASE_URL=http://127.0.0.1:<port>/v1` + 假 key `dsh-bridge`，并删 `ODR_LLM_PRESET`；
- 转发：`bridge.js:135` `for await (const chunk of state.ctx.llm.stream(options))`；选路 `:55-96` 优先级 `ODR_LLM_MODEL` > `ctx.agentDefaultModel.currentSelection()` > `ctx.llm.listProviders()[0]`；上游 `finish.kind === "tool-calls"` 时回 502 `"ODR calls are tool-less"`（`:144-146`）；
- `childEnv()`（`:35-49`）白名单只回传 6 个变量中**非空**者（注释记录历史 bug：`ODR_LLM_PRESET=""` 被当 preset 名，报 `Unknown preset ''`）。

**【推断】** 这段「宿主内 HTTP 反代 + OpenAI 兼容外壳」是 Node/TS 插件驱动任何 Python/外部 RSI 引擎的通用范式，成本约 150 行，比要求用户配 key 现实得多。它的代价是：所有 ODR 的 LLM 调用都串到宿主同一条 `ctx.llm.stream` 上，无法独立计费/限流（只有 ODR 自己的 `api_call_budget` 计数）。

### 1.4 与 DSH session 事件的关系：没有【事实 + 反证】

- DSH bundle 内部：无 `on_session_end`、无 turn hook、无消息注入。
- 但仓库里**另有**两个宿主适配器可对照：① `odr-trigger/__init__.py:11-20` 末尾 `ctx.register_hook("on_session_end", on_session_end)` 是 **Hermes** 插件 API（`plugin.yaml` 声明 `provides_hooks: [on_session_end]`, `kind: standalone`），触发后 `Popen(..., start_new_session=True)` 拉起 `python -m open_dream_rsi dream`，带 `min_interval_seconds`（默认 60）节流与 `trigger.log` 自证；② `hooks/hooks.json` 是 **Cursor** 的 `postToolUse` / `postToolUseFailure` / `sessionEnd` 命令钩子。
- 关键设计声明（`odr-trigger/__init__.py:14-18`）："never decides WHAT or WHETHER a policy is good — that is the promotion gate's job. This adapter decides WHEN only."

**【推断】** 作者对三宿主的态度是「插件只做 WHEN，Python 只做 WHEN 的分层与 WHAT 的判定」。移植到 DSH 时，**DSH 侧缺的正是那个 WHEN**：要么你的插件订阅 turn/session 结束事件主动 `mcp__open_dream_rsi__odr_dream`，要么退回「靠模型自觉调用工具」（作者自己在 `docs/integrations.md:571-573` 承认 "by design no model self-initiates unfamiliar tools"）。

### 1.5 Windows 现实坑【事实】

`bridge.js:214` 硬编码 `python: "python3"`。Windows 上通常只有 `python.exe` / `py.exe`，没有 `python3.exe`，除非装 Store 版或自建 shim → **默认安装即失败**，需要 profile 覆盖 `mcp-open-dream-rsi` 行（作者文档只给了覆盖方法，没给 Windows 分支）。此外 `run_mcp.py:11-15` 用 `sys.path.insert` 兜底，对路径大小写/空格无处理（Git Bash 下 `C:\Program Files` 类路径未测）。

---

## 2. 学习闭环

### 2.1 一次 `run_once` 的真实顺序【事实，`open_dream_rsi/loop.py`】

1. `:300-345` 取任务队列；`fair_queue=True` 时按 `memory.get_all_task_attempts()` **最少尝试优先**排序（防头部饿死）；
2. 逐任务 `_work_on_task`（`:397-523`）：`policy = memory.get_policy(category)`、`recipe = memory.get_recipe(category)` → `_seed_tree`（`warm_start` 节点 score=0.05，有 recipe 时，`:776-782`）→ 每 attempt：`_next_expansion` 选节点 → `_propose_candidate`（LLM，带 recipe/branch/ideas/params/feedback）→ `verifier.run`（或 judge）→ `tree.add_node` → 解出则 `save_recipe` + `_alm_sync("recipe", ...)`；
3. `:494-508` 收尾**离线 dreaming**（零 API）：`DreamEngine(ReplaySimulator(tree)).run_offline_optimization(iterations=dream_iterations)`，有改进则 `_alm_sync("policy_parameters", ...)`；
4. `:509-514` 再尝试 `_maybe_evolve_policy_code`（LLM 重写 `choose_action`，见 3.2）；
5. cycle 尾部 `_alm_maintenance()`（`detect_stale` + `gc`）；
6. 预算闸：`:416` 每次 attempt 前 `if self.api_calls_used >= self.api_call_budget: break`，`stopped_reason="api_budget_exhausted"`。

### 2.2 `dream_once`：两层 + 单实例锁 + 预算【事实】

`open_dream_rsi/dream.py`：

- **分层**（`:1-20` docstring 明说 "This module owns the *cadence*, which is the part a harness should not guess about"）：
  - CHEAP maintenance：**每次调用**都跑，`tasks=[]`、`api_call_budget=0`（`:196-199`），实际效果只剩 ALM housekeeping；
  - FULL：仅当 `age = time.time() - state["last_full_dream"] >= max_age_seconds`（默认 `DEFAULT_MAX_AGE_SECONDS = 6*3600`，`:35`），才带真任务与 `budget` 跑 `run_once`，成功后写 `last_full_dream`。
- **单实例锁**（`:37-98`）：`os.open(lock, O_CREAT|O_EXCL|O_WRONLY)` 写 PID；已存在时先 `os.kill(owner, 0)` 探活——**活着永不判 stale**（注释：早期按年龄判 stale 导致第二个 trigger「偷锁」，API 花费翻倍）；只有 PID 已死或文件不可读，才用 `LOCK_TIMEOUT_S = 30*60` 年龄兜底并 unlink 重入。`_release()` 只在内容 PID == `os.getpid()` 时删除（不删别人的锁）。
- **原子写**：`dream_state.json.tmp` → `.replace()`（`:113-116`）。
- **wake 自检**（`:121-147`, `:185-193`）：`WAKE_TASK_ID="wake:selftest"`，空队列 + FULL + `ODR_WAKE`（默认 on）时注入 `add(a,b)` 两测试探针、`max_attempts=1`，让空闲部署也真的打一次 LLM（否则 metrics 显示 0 api_calls 像假活）。

**【推断】** 这套「trigger 随便打，tier/锁/预算在内层收口」的设计，是**多入口（MCP 工具、CLI、cron、session hook）共存而不互相打架**的唯一简单解。做编排插件时应该照抄「触发器只提供 WHEN，WHEN 的降噪在内层」这一条，否则每个宿主都要写一遍节流。

### 2.3 预算控制【事实】

- 三处独立预算：MCP `odr_run_once.budget` 默认 10；`odr_dream.budget` 文档写 20、代码实际 `int(args.get("budget", 100))`（`mcp.py:222` vs `:321`，**文档与实现不一致，真 bug**）；CLI `--budget` 默认 100。计数单位是「LLM 调用次数」而非 token/美元（`self.api_calls_used` 每次 `client.chat` 后累加）——**【推断】** 对按 token 计费的后端这个闸门偏粗（`max_tokens=100_000` 单次就能烧掉大量预算）。

### 2.4 DiscoveryTree schema【事实，`open_dream_rsi/core/tree.py`】

```python
TreeNode(node_id, action, result, score, parent_id, children,
         thought="", sentinel: Optional[dict]=None,
         termination_reason: Optional[str]=None)   # :23-45
```

- `thought`：一句话 PLAN，**纯文本不执行**（`loop.py:845-859` 只做解析；`policygen.frontier_entry` 截 160 字符喂给 policy）；
- `sentinel`：replay-safe 结构化事实 `{signature, repeat_world, recurring, blocked, budget_fraction}`，**跨 session 计数被剥离**（保证回放可复现）；
- `TerminationReason`（`:6-20`）封闭枚举 `completed / policy_stop / tool_failure / budget_gate / sentinel_block / unknown`，注释点明动机：回放必须区分「决策者选择停止」与「运行时把选项移除了」。
- 树本体只有 `nodes` dict + `root_id` + `add_node` + `get_best_trajectory`（按 score 回溯源），**没有搜索算法**——选择逻辑在 `loop._next_expansion` 与 policy 代码里。

### 2.5 「零成本回放」到底在哪：README 说法的反证【事实，重要】

- `open_dream_rsi/core/simulator.py` **全文 26 行**，`step_offline(state_id, simulated_action)` 只做：action 与记录一致就返回记录值，否则返回 `("simulated_trajectory_result", node.score * 0.9)`——这是一个**给参数爬山用的假转移**，不是「零成本回放」。
- 真正被 README 称为零成本回放的是 `core/policygen.py` 的**反事实 batch rollout**：
  - `rollout_world_payload(tree, horizon)`（`:451-476`）：序列化 `nodes` + `child_lists`（每个父节点的子节点**按记录顺序**）+ `horizon = max(MIN_HORIZON, steps)`；`outcome` map **故意留空**；
  - `_ROLLOUT_HARNESS`（`:216-282`）：在**一个**子进程里 exec 候选 policy 一次，然后跑 8-24 步循环；每步只 reveal「父节点已被展开超过该子节点 index」的节点，`outcome` 按已 reveal 后代逐步回填（prefix rule，`policygen.py:391-399` 说明「replay 绝不用全树 outcome map」）；
  - 奖励 = 该节点**下一个已记录子节点的 score**；子节点用尽重复最后一个；从未展开的节点付**自身 score**（counterfactual floor，"no invented outcomes"）；非法选择记 0；
  - `_rollout_objective`（`:536-562`）= `mean + DIVERSITY_BETA*覆盖分支/steps - EFFICIENCY_BETA*(1-fresh/steps)`，`fresh` = 不重复的 `(pick, reward)` 对（惩罚反复收割同一分支）；`rollout_score`（`:565-596`）空树 → `-inf`，invalid 超 `1 - MIN_VALIDITY` 拒绝。
- 另有 `SandboxCache`/`content_key`（`sandbox.py:227-296`）：按「候选源码 + world + timeout + jail 前缀」的 sha256 缓存**已完成**的子进程结果，超时与 spawn 失败永不缓存——这才是「同一候选重复打分免费」的机制。

**【推断】** 「零成本」是准确的：一次 rollout 只花 1 次 subprocess（约 40ms），0 次 LLM 调用。但它**不是 world model 预测**，而是「在已有树上重放选择序列」——树里没有的分支永远不会被发明。这既是它的诚实之处，也是它的天花板：**它无法评估「记录里完全没有的探索策略」**，只能评估「换一种走法能不能更快摘到已记录的好果子」。

### 2.6 LLM 写 policy 的 AST gate + 沙箱【事实】

`validate_policy_source`（`policygen.py:148-171`）：

- `ast.parse` 后必须存在顶层 `def choose_action(frontier, step)`；
- ban 语句节点：`(ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal, ast.Try)`（`:119`）——`Try` 也被禁，理由未写，**推断**是防止用异常吞掉沙箱探测失败；
- ban 任意 `ast.Attribute.attr.startswith("_")`（阻断 `().__class__.__bases__` 类逃逸链）；
- ban 名字表（`:120-129`）：`exec/eval/compile/open/input/__import__/globals/locals/vars/dir/getattr/setattr/delattr/breakpoint/exit/quit/memoryview/object/type/super/__builtins__/builtins`；注释记录 `__builtins__` 是**外部审计发现的真实绕过**（`"__imp" + "ort__"` 可拼出 key）。

执行侧（`sandbox.py`）：

- `python -I harness.py`（隔离模式，忽略 env 与 user site）+ `SANDBOX_ENV = {"PATH": "/usr/bin:/bin"}`（`:37`）；
- POSIX：`start_new_session=True` 建独立进程组，超时 `os.killpg(..., SIGKILL)`（`:186-218`）；`preexec_fn` 依次设 `RLIMIT_AS`（默认 512MB，`ODR_SANDBOX_MEMORY_MB` 覆盖）、`RLIMIT_CPU`（`timeout+1`）、`RLIMIT_NPROC`（`max(512, 现有线程+64)`），每个都 clamp 到 hard 上限、失败即跳过（`:64-127`）；
- 可选 jail：`ODR_SANDBOX_CMD`（bwrap/nsjail 前缀，`:130-133`）；无 jail 时**只 warning 一次**（`:140-158`），docstring 自陈「python -I 不限制文件/网络」。**Windows**：`_IS_POSIX=False` → 无 rlimit、无新进程组，超时只 `proc.kill()`（`:185-218`）；docstring `:177-179` 原文："on Windows there are no rlimits and the timeout kills only the direct child — treat Windows as out of scope for hostile task sources."

---

## 3. 晋升门与 ALM

### 3.1 三类产物怎么从 CANDIDATE → ACTIVE【事实】

运行时唯一入口是 `loop._alm_sync(artifact_type, slot, payload, reason, actor)`（`loop.py:285-296`）→ `lifecycle.sync_active`（`lifecycle.py:656-690`）：

```python
cand = self.register_candidate(artifact_type, payload, slot=slot, created_by=actor)
result = self.validate(cand.artifact_id, actor=actor)      # 跑类型校验器
if not result.ok: return None                              # 静默拒绝，写 alm_error
if current is not None and current.artifact_type == artifact_type:
    self.supersede(current.artifact_id, cand.artifact_id, reason, actor)
elif current is not None:                                  # 槽位换类型
    self.quarantine(current.artifact_id, ...)
self._transition(cand.artifact_id, ACTIVE, actor=actor, reason=reason)
```

三类产物与各自「谁判定它够好」：

| 产物 | slot | 判定者 | 证据格式 |
|---|---|---|---|
| `recipe` | `recipe:<category>` | 在线 verifier「解出了」 | `{"code": str, "score": float}`（必须是解出时的 score） |
| `policy_parameters` | `policy_parameters:<category>` | 离线爬山在**同一 rollout 目标**上严格改进 | `{"params": {"temperature": float, "exploration_depth": float}}` |
| `policy_program` | `policy_program:<category>` | LLM 生成 → rollout 严格胜 incumbent | `{"code": str, "score": float, "steps": int}` |

类型校验器（`lifecycle.py:223-264`）：`policy_program` 直接跑 `validate_policy_source`（**连 ALM 也拒绝未过 AST 门的代码**）；`policy_parameters` 必须非空数值映射且每值 ∈ [-1e9, 1e9]；`recipe` 必须有 code + score 溯源。`EVIDENCE_TYPES = (discovery_tree, audit_event)` 被显式拒绝注册为生命周期制品——**证据不是产物**，这条边界很干净。

### 3.2 policy 晋升的严格改进【事实】

`_maybe_evolve_policy_code`（`loop.py:702-774`）的闸门层层叠加：

1. `enable_policy_code` 关 / 预算耗尽 / category 已 `frozen`（evolution stop）→ 直接返回；
2. 本 cycle 解出且已有 policy → 返回（"the category already solves itself"）；
3. `steps < 2` → 返回（历史太短，评分不公平）；
4. 树没长够 `POLICY_REGROW_STEPS` → 返回（"dreaming stays free, calls do not"）；**incumbent 必须在当前树上重打分**（`:729-737`），不能信旧分数（注释记录：否则出现 `old_incumbent < candidate < current_incumbent` 的假晋升，2026-10 外部审计发现）；
6. `PolicyGenerator.generate` 要求 `score > incumbent_score + 1e-9`（`policygen.py:749-757`）——**平局不算证据**，注释明确 "A tying challenger must not displace a trusted incumbent"；
7. 通过后 `save_policy_code` + `log_event("policy_promoted")` + `_alm_sync`。

### 3.3 ALM 状态机与事件溯源【事实，`lifecycle.py`】

- 8 态：`CANDIDATE / VALIDATED / ACTIVE / STALE / SUPERSEDED / QUARANTINED / ARCHIVED / REJECTED`（`:74-75`）。
- 显式边表（`:82-96`）13 条；**故意没有** `CANDIDATE→ACTIVE`、`ARCHIVED→ACTIVE`、`QUARANTINED→ACTIVE`（恢复必须回到 `VALIDATED` 重新校验）；`VALIDATED→ACTIVE` 存在但注释强调「必须走显式 `activate()` 晋升调用」，不能由隐式副作用完成。
- `SINGLE_ACTIVE_TYPES = ("policy_parameters", "policy_program")`（`:101`）——同一 slot 至多一个 ACTIVE；recipe 允许同 category 多版本共存。**【推断】** 这是「代码/参数是单版本事实，配方是可并存经验」的正确建模。
- 事件溯源：`ArtifactEventStore` 把 `<memory>/artifacts/events.jsonl` 当**权威历史**（append-only），`states.json` 只是物化视图；启动时 `rebuild_artifact_state(events)` 与视图比对，不一致就重建（`:350-359`）。
- `_commit()`（`:884-924`）顺序「History first」：`store.append(event)` → 改内存 → `save_states`。事件字段 `event_id=evt_{seq:08d}` / `artifact_id` / `artifact_type` / `sequence` / `timestamp` / `from_state` / `to_state` / `actor` / `reason` / `kind` / `metadata`，并带 `payload_sha256` 完整性。
- 自动化策略：`detect_stale`（ACTIVE 闲置 7d → STALE，pinned 豁免）、`gc`（SUPERSEDED 宽限 3d、保留 30d）、`promote_replacement`（单 ACTIVE 类型换版）、`verify_materialization`。

### 3.4 配对回放的统计判据：**是离线 CLI，没接进运行时**【事实 + 重要澄清】

`open_dream_rsi/gate_replay.py:49-69`：

```python
gains = # (treatment solve, baseline fail)
regs  = # (baseline solve, treatment fail)
net   = gains - regs
ok    = net >= GATE_MIN_NET (== 1) and regs == 0
```

- 证据格式：**任意 replay harness 输出的 JSON 行**，每行需一个 join key（默认 `task_id`，可 `--key krs`）与 `solved` 字段（truthy 即真）；`arm_pairs` 做 key join，重复/缺失 key **跳过并计数**（`skipped_unmatched` / `duplicate_keys`），绝不静默补齐。
- 输出：per-arm `{gains, regressions, net, promoted, joined, skipped_unmatched, duplicate_keys, pairs}`，`to_markdown` 出表。
- 判据性格：**harm-asymmetric sign test**——「至少净赚 1 个 + 零回归」；不是 t 检验、不管样本量、不做多重比较校正。**【推断】** 对 20-100 条任务的小样本，这个规则的假阳性率靠「零回归」硬约束压住，但零回归也意味着**任何有随机性的有害臂都会被拒**，代价是统计功效低（作者自己在 benchmarks 里用 McNemar 做旁证）。
- `grep -rn "gate_verdict\|gate_replay" --include=*.py` 显示**只有 `cli.py:695-733` 调用它**（`odr gate-replay` 子命令）。运行时的晋升用的是 rollout 严格改进与 recipe「解出」规则，**不是**这个配对门。**【推断】** 所以 README 里「配对回放晋升门」在读代码时要拆成两层：**在线晋升 = 单臂反事实 rollout**；**离线评估 = 配对 sign test**。在报告/宣传里这两者容易被读成同一件事。

---

## 4. 课程 / 配方库

### 4.1 lessons.json 已经不存在了【事实，`CHANGELOG.md:69-80`，0.4.0 — 2026-11-02】

0.4.0 一次性删除：`core/curator.py`、`sessions.py`、`corrections.py`、ALM 的 `lesson` 类型、`lessons.json`、`lessons_to_skills`、probe-task queue；MCP `odr_lessons`、CLI `sessions/skills`、`gate-replay --lessons` 同步移除。**理由**：九条已发布 prompt-injection 臂配对回放**零收益**，其中两条**有害**。

**【推断】** 这是整个仓库最有价值的负结果：他们**删掉了自己最像「RSI」的功能**，因为配对证据不支持它。对要做「人在环 RSI 编排」的我，这条比任何正面结果都值钱——课程/经验注入必须过配对门，否则就是往 prompt 里加噪声。

### 4.2 recipes.json 的真实结构【事实，`open_dream_rsi/memory.py`，157 行】

```json
{ "<category>": { "code": "def solve(...): ...", "score": 0.93, "saved_at": 1712345678.0 } }
```

- `save_recipe(category, code, score)` **只在 score 更高时覆盖**（等分不覆盖）；
- 检索 = `data[category]` **O(1) 精确查**；无向量、无相似度、无模糊匹配。category 就是「项目名/任务族名」的人为标签。同一文件家族：`policies.json`（`{category:{params,updated_at}}`）、`policy_codes.json`（`{category:{code,score,steps,updated_at}}`）、`task_outcomes.json`（每类末 100 条 `{solved,calls}`）、`task_attempts.json`（公平队列计数）、`trees/<task_id>.json`、`events.jsonl`；全部 `tmp` → `os.replace` 原子写，单进程无锁（靠 `dream` 的单实例锁 + CLI 串行）。
- 注入方式：`loop._propose_candidate` 把 recipe 作为 `{recipe}` 变量塞进 `REFINE_USER_TEMPLATE`（`loop.py:816-825`），即**整段代码进 prompt**，不是检索片段。

### 4.3 「声明式而非命令式」18/20 → 6/20【事实，`docs/benchmarks.md:113-131` + `README.md:308`】

- 设置：20 个任务，贪心解码，cold baseline 解 18/20。
- 注入一条**结构上完美**的 lesson（含触发条件、步骤、反例）→ solve-rate 崩到 **6/20**。
- 归因：lesson 里的祈使建议（"keep checking" 类）把贪心解码变成**过度探索循环**，模型反复检查而不收尾。
- 同一批事实改写成**陈述性背景**（无祈使动词、显式 stop clause）→ 回到 **18/20**，与 cold baseline 无差别（McNemar `p = 1.0`）。
- 结论：**危害来自祈使语气，不是内容**；另七种注入策略（抽象工作流 / 样例 / 证据证书 / 反应式 error note / 移到 prompt 末尾等）相对同期 cold **零配对收益**，把安全文本移到末尾反而有害（11/20, `p = 0.008`）。机制【推断】：对无状态、单轮、贪心解码的 agent，「检查清单」等价于**新增未满足的终止条件**——没有外部状态机告诉它「已经检查过了」，它就一直检查。

---

## 5. MCP 工具面

`open_dream_rsi/mcp.py`（522 行）手写 **newline-delimited JSON-RPC**，`PROTOCOL_VERSION "2025-06-18"`，`SERVER_NAME "open-dream-rsi"`。`TOOLS` 实际 **6 个**（`:239-336`）：

| 工具 | 入参（必填*） | 出参 |
|---|---|---|
| `odr_status` | `memory?` | `{memory_root, categories, policies, promoted_policy_codes, recipes, recent_events[末5条，截200字符]}` |
| `odr_metrics` | `hours?`, `memory?` | `metrics.collect` 结果（api_calls、solve rate 等，从 events 派生） |
| `odr_recipes` | `category*`, `memory?` | `{category, found, code}`（code 是整段源码字符串） |
| `odr_add_task` | `task_id*`, `category*`, `prompt*`; `tests[]`, `criteria`, `max_attempts=4`, `tasks_file?` | `loop.append_task` 结果 |
| `odr_run_once` | `tasks_file?`, `memory?`, `provider ∈ {openai,cursor,local,goose,mock}`, `model?`, `thoughts=true`, `max_tokens=100000`, `timeout=300`, `no_thinking?`, `budget=10` | `CycleReport.to_dict()`；空队列会写 `[]` 并回 `note`（`:162-199`） |
| `odr_dream` | `memory?`, `provider?`, `model?`, `budget`（描述说 20 / 代码默认 100）, `max_age_seconds=21600`, `wake?` | `{skipped, tier, cycle, wake?}` |

- **`odr_lessons` 不存在**（0.4.0 已删除）。
- **没有 prompts / resources / notifications / sampling**；`initialize` 只回 capabilities 里的 tools。错误一律转成 `{"content":[{"type":"text","text":<json>}], "isError": true}`（`:380-382`）——工具调用永不抛协议错，宿主只能从 `isError` 判断。
- 宿主提示**完全靠 tool description 文本**，例如：
  - `odr_recipes`："Fetch the loop's best verified solution (warm-start recipe) … reuse it instead of solving from scratch"；
  - `odr_dream`："Safe to call after every task — the cadence is decided internally … concurrent calls are collapsed by a lock"；
  - `odr_run_once`：描述里解释 `no_thinking` 对 vLLM/Qwen 更快、`timeout` 对慢本地模型要调大。
- 另有 `open_dream_rsi/mcp_server.py`——**另一个** MCP server（sentinel 沙箱：`krs_lookup/fetch_company/fetch_page/sentinel_check` + `PermuteGate` 预算闸），与 `odr_*` 无关，勿混。

**【推断】** 「工具描述就是 prompt」在这里做到极致：没有 `instructions` 域、没有 skill 文件，全靠 description 教会宿主何时调用。对 DSH 这种会自动把工具描述放进 system prompt 的宿主，这是**唯一能生效的提示通道**；但也意味着工具名/描述一改，行为就变，无法版本化。

---

## 6. 可复用性判断（我的插件是 Node/TS DSH 插件）

前提：ODR 是 Python stdlib、单进程、文件型记忆、无外部依赖、以 `python -m open_dream_rsi` 为唯一入口——对集成是**利好**（无依赖地狱），对移植是**利空**（算法与沙箱都绑 CPython 语义）。

### 路径 A：MCP stdio 子进程（推荐，成本最低）

- 做法：npm 包里 vendored Python（或要求 `pip install`），`dsh.bundle.patch` 插一行 `@deepseek-ai/dsh-mcp-client`，`command` 指向解释器，`args: [run_mcp.py, mcp, --tasks, ..., --memory, ...]`；LLM 用 1.3 的宿主内 HTTP 反代。
- 成本：**1-2 天**（照抄 `cordis.patch.yml` + `bridge.js`，改 python 解析与路径）。风险：
  1. **Windows 无 `python3`**（`bridge.js:214`），须自己解析 `python`/`py -3`/venv 并处理含空格路径；
  2. **工具超时 + 无进度**：`odr_run_once`/`odr_dream` 可跑数十分钟，必须显式设 `toolCallTimeoutMs`（默认 60s 会腰斩），而本仓库没实现 MCP progress notification，宿主 UI 只能表现为「卡住」；
  3. 记忆是**文件 + 单进程锁**：`_acquire` 只在 `dream_once` 里，护得住 dream，护不住 `run_once`；CLI/cron/第二个窗口并发时可能写坏视图（虽有原子写兜底）。
- 结论：**如果目标只是「让 ODR 在我的 DSH 里可用」，走 A，不要重写。**

### 路径 B：HTTP（streamable-http MCP）

- 做法：`odr-http.cordis.yml` 已有样例，`python -m open_dream_rsi mcp --http` 起服务，插件只配 URL。
- 成本：**0.5 天**（配置即可）。风险：**URL 即凭证**（作者自己在 `docs/integrations.md` 标注 "the URL is a credential"）；本机回环尚可，跨机/容器要自己加鉴权；进程生命周期要自己管（谁负责起停、崩了谁重启）；Windows 下防火墙弹窗。
- 结论：**多宿主共享一个 ODR 实例时选 B**；单机单人没必要。

### 路径 C：移植核心算法到 TS（成本最高，只有一种情况值得）

值得移植的只有三块，且**都不大**：① **rollout 目标 + prefix 回放**（`policygen.py:216-282`, `:391-596`，约 300 行）→ TS 约 400 行，纯计算无 IO，可单测；② **ALM 状态机 + 事件溯源**（`lifecycle.py` 1000 行，但核心 = 边表 + append-only + 物化重建 + 类型校验器，约 300 行）→ TS 很自然（JSONL + `fs.appendFile` + `zod`）；③ **单实例锁 + tier/cadence**（`dream.py` 约 200 行）→ TS 更简单（`fs.open(..., 'wx')` + `process.kill(pid, 0)`）。

**不要**移植：`sandbox.py` 的 rlimit 语义（Node 无 `setrlimit`，要么调 `windows-job-objects`/`taskkill /T`，要么依赖容器）；`CodeVerifier` 的 Python 子进程验证（要跑被测代码就必须有 Python/Runtime，绕不开）。

成本：**1-2 周**（含测试）。风险：**语义漂移**——回放目标的 beta 系数、`MIN_VALIDITY`、horizon 下限这些常数一旦改动，「严格改进」的门就变了，历史证据不可比。**【推断】** 如果移植，必须把「目标函数版本号」写进每个事件，否则 ALM 里的旧证据会污染新判据。

### Windows 支持的真实缺口【事实】

| 缺口 | 证据 | 影响 |
|---|---|---|
| 无 `python3` 名 | `bridge.js:214` 硬编码 | 默认装不上，必需 shim/覆盖 |
| 无 rlimit | `sandbox.py:185`（`_IS_POSIX` 才设 preexec） | 内存/CPU/进程数**完全不设限**，候选代码可吃满机器 |
| 超时只杀直接子进程 | `sandbox.py:208-218`（非 POSIX 走 `proc.kill()`） | 候选代码 `subprocess.Popen` 出的孙进程**存活**，可后台常驻 |
| 无 `start_new_session` / 无 jail | 同上；`ODR_SANDBOX_CMD` 依赖 bwrap/nsjail | 无法整组杀死、Ctrl-C 漏杀；只能靠容器/WSL 获得文件/网络隔离 |
| 明确声明不支持 | `sandbox.py:177-179` docstring | 作者自己把 Windows 划出「敌意任务源」范围 |

**【推断】** 对我的插件，这意味着：**Windows 上不能把 ODR 的 policy 生成/候选验证当成安全边界**。要么只跑「可信任务」（我自己的 repo、我写的测试），要么把执行放进 WSL2/容器，要么在 Windows 上禁用 `enable_policy_code` 与不可信 code 验证。

---

## 7. 最有价值的 3 个设计（对「人在环 RSI 编排插件」）

### 7.1 回放门控晋升（replay-gated promotion）：证据必须是「换条路会不会更好」

- 机制：候选策略在**已记录的树**上反事实重放，只有**严格**优于 incumbent（`+1e-9`）才晋升；incumbent 必须**在当前树上重打分**；平局不算证据（`policygen.py:743-757`，`loop.py:723-737`）。
- 为什么值得抄：人在环场景里，最大的风险不是「学不会」，而是**「人类/AI 的主观好评把垃圾升上去」**。这条把「晋升」从「谁说得动听」变成「在已有证据上重放，能否多摘到果子、且不重复收割」。它**不需要**新采样，因此可以在人类每次 approve 的间隙免费跑。
- 怎么改造：把「树」换成「我的 task 执行轨迹」（每一步 = 一次工具调用 + 观察 + 评分），rollout = 「按候选编排策略重放这条轨迹的选择序列」。这样人类的每一次介入都能被压成一条可回放的证据，而不是一段聊天记录。

### 7.2 事件溯源 ALM（append-only + 物化视图可重建）

- 机制：`events.jsonl` 是权威历史，`states.json` 只是缓存；启动时比对、不一致就重建；`_commit` 先写事件再改状态（`lifecycle.py:350-359`, `:884-924`）；13 条显式边、单 ACTIVE 类型、`payload_sha256`。
- 为什么值得抄：人在环 RSI 的核心交付物不是「更好的 prompt」，而是**「这个改动凭什么被信任」的可审计链**。append-only 让「谁在什么时候、基于什么证据、把哪个版本从 CANDIDATE 推到 ACTIVE」永久可查；物化视图可重建让「状态文件被手改/崩溃写坏」不再是灾难。
- 怎么改造：事件类型扩到编排层（`plan.proposed` / `human.approved` / `run.started` / `gate.rejected`），actor 区分 `human:<id>` 与 `agent:<id>`——**人类介入本身就是一等事件**，这是 ODR 没有的（它只有 `dream_rsi_pipeline` / `dream_rsi_promotion` 两个机器 actor）。

### 7.3 证据即任务 / 结构化探针（sentinel + termination_reason）

- 机制：`TreeNode.sentinel` 存 replay-safe 结构化事实（`signature/repeat_world/recurring/blocked`），`termination_reason` 区分「决策者选择停止」与「运行时移除了选项」（`tree.py:6-45`）；`policygen.frontier_entry` 把这俩变成 policy 可直接读的原始特征（`policygen.py:429-448`）。
- 为什么值得抄：**「为什么停」是最容易被丢弃、又最影响回放正确性的信息**。把「预算耗尽」记成「任务失败」，回放就会学出「遇到难任务就放弃」；记成 `budget_gate`，回放才知道这个分支**从未被真正尝试过**。这直接决定晋升门是否可信。
- 怎么改造：我的编排插件里，每个 step 都应带 `termination_reason ∈ {human_stop, agent_stop, budget_gate, tool_error, policy_stop}` + 一个「失败类签名」（错误类型 + 关键栈帧哈希），并用它做**去重/熔断**（同一签名重复 N 次 → 不再花预算）。

---

## 8. 它有没有做「循环本身 / 编排方式」的自我优化？

**结论：没有。你的判断成立。** 但有 3 个容易被误读成「有」的地方，需要精确区分。

### 8.1 它自我优化的对象只有三件，全是「任务内策略」【事实】

| 产物 | 被优化的是什么 | 优化器 | 证据 |
|---|---|---|---|
| `policy_program` | `choose_action(frontier, step)`：**在树里选下一个扩展节点** | LLM 写代码 + rollout 严格改进 | `loop.py:702-774`, `policygen.py:676-758` |
| `policy_parameters` | `temperature`, `exploration_depth`（softmax 锐度、单节点重抛光上限） | 随机爬山 ±0.1 / ±0.5，50 次迭代，6 个固定种子 episode | `core/dreamer.py:43-70`, `:6-18` |
| `recipe` | 某 category 的**解题代码** | 在线 verifier 解出即存 | `loop.py:472-476` |

三者都作用在「给定任务后怎么解题/怎么探索」这一层。**没有**任何产物描述「什么时候该跑 cycle、跑多长、预算给多少、什么时候该问人」。

### 8.2 编排层是硬编码常数，且作者明确划为「不由系统决定」【事实】

- 周期间隔：`AutoRSIRuntime.interval_seconds = 300.0` 默认，`run_forever` 里 `time.sleep(self.interval_seconds)`（`loop.py:376-393`）——**固定 sleep，无自适应**。
- tier 判据：`age >= max_age_seconds`，默认 6h 常数（`dream.py:35`）。
- 预算：`api_call_budget` 由调用方传（MCP 默认 10 / CLI 100），cycle 内只做「用完即停」，**不做分配**（没有「这个任务值 3 次、那个值 1 次」的调度）。
- 作者的设计声明（`dream.py:1-20`）："This module owns the *cadence*, which is the part a harness should not guess about." 以及 `odr-trigger/__init__.py:14-18`："This adapter decides WHEN only … never decides WHAT or WHETHER a policy is good."
- 【推断】这不是疏忽，是**有意的边界**：作者认为 cadence 属于部署环境（cron/systemd/hook），不属于学习系统。对「人在环编排」而言，这恰好是**留白**——也是最该由我的插件填的部分。

### 8.3 三个「看起来像」但不是的东西【事实 + 澄清】

1. `evolution.py` 的 anytime-valid 停止器（betting martingale，`alpha=0.05`、`lam=0.5`、`threshold=1/alpha`、`min_rounds=4`）：决定的是**「这个 category 的 policy 生成何时该停」**（冻结后不再花 API），是**停止规则**不是编排优化，且默认关闭（`cli.py:63`）；`POLICY_REGROW_STEPS`（`loop.py:721`）同理只是**成本节流**。
2. `holdout.py` 的 holdout 预约注册表：**loop 从不读它**（`grep` 只在 CLI `holdout` 子命令里用）——防「在同一批任务上反复调参」的机制存在，但没有接线。**【推断】** 这是一个已知的、未完成的可信度缺口：当前晋升门可以在**它自己评估过的同一棵树上**反复晋升。

### 8.4 反驳检查：有没有我漏掉的元层？【事实】

- `grep -rniE "meta[- ]?(loop|policy|optimis|optimiz)|orchestrat|self-modif|cadence"` 全仓库（排除 vendored）：命中的全是「cadence 由 dream 模块拥有」这类**声明性**文本，无实现。
- `TOOLS` 无「改 cadence / 改预算 / 改 tier」的工具；`dream_once` 的 `max_age_seconds`、`budget` 都是**入参**（宿主传，不落盘、不被学习）；ALM 的 `artifact_type` 枚举里没有 `orchestration` / `schedule` / `cadence` 类制品。因此：**元层在这个仓库里是「人的配置 + 宿主的 WHEN」，不是学习对象。**

**【推断】** 这给「人在环 RSI 编排插件」留了一个明确的空位：把 `cadence / budget / 何时升级到人 / 何时回滚` 变成**第四类产物**（`orchestration_policy`），并用同样的「回放门控 + 事件溯源」管它——但要小心 8.3 的 holdout 缺口，元层的过拟合比任务层更致命（样本更少）。

---

## 9. 事实 / 推断清单与未验证项

**高置信事实**（所有 `path:line` 均读原文）：DSH 包结构与注册、`bridge.js` 反代、6 个 MCP 工具 schema、`dream_once` 两层/锁/预算、`TreeNode` schema、`simulator.py` 与 `policygen` rollout 的分工、AST 门名单、`sandbox.py` 的 Windows 缺口、ALM 8 态/13 边/事件溯源/`sync_active`、`gate_replay` 仅在 CLI、`lessons` 已删、recipes 结构与 O(1) 检索、18/20→6/20。

**推断（未直接证实）**：① 我没有真跑 DSH + 该插件（需装 npm 包并重启宿主，且当前 Windows 无 `python3`），运行表现全是读码推断；② `docs/benchmarks.md` 的 20 任务臂是作者自测，我未复现；③ 「零成本回放对未见分支评估能力为零」是从 `rollout_world_payload` 实现推出，作者文档未明说该局限；④ `gate_replay` sign test 在小样本下的功效/假阳性属纯统计推断，无实验。

**已知不一致 / 可疑点**：① `odr_dream.budget` 描述默认 20 vs 代码默认 100（`mcp.py:321` vs `:222`）；② `bridge.js:214` 硬编码 `python3`，Windows 无该名；③ `holdout.py` 存在但 loop 不读（防过拟合未接线）；④ README 把「配对回放晋升门」写得像在线门，实际在线是单臂 rollout 严格改进，配对门只是离线 CLI；⑤ `_BANNED_NODES` 禁 `ast.Try`，**推断**会抬高候选代码崩溃率（`invalid` 惩罚已覆盖，但不区分「崩溃」与「乱选」）。

---

## 10. 关键文件索引（供后续复读）

- **DSH 集成**：`plugins/deepseek_harness/package.json`（`dsh.bundle.patch`）、`bridge.js:211-220`（注册）、`cordis.patch.yml:19-41`（MCP 行）、`bridge.js:24-27,44-46,55-96,135,144-146`（LLM 反代）；对照物 `odr-trigger/__init__.py:11-20`（Hermes hook）、`hooks/hooks.json`（Cursor hooks）。
- **主循环**：`open_dream_rsi/loop.py:300-345`（run_once）、`:397-523`（_work_on_task）、`:702-774`（policy 晋升）、`:776-782`（种子树）。
- **回放/优化**：`core/policygen.py:119-171`（AST 门）、`:216-282`（harness）、`:451-476`（world）、`:536-596`（目标/评分）；`core/dreamer.py:41-70`（爬山）、`:77-100`（softmax 选择）。
- **沙箱**：`sandbox.py:37-133`（env/rlimit/jail）、`:161-218`（run_isolated/杀进程组）、`:227-296`（结果缓存）。
- **生命周期**：`core/tree.py:6-45`（schema）；`lifecycle.py:74-101`（状态/边）、`:223-264`（校验器）、`:350-359`（重建）、`:656-690`（sync_active）、`:884-924`（_commit）。
- **判据与记忆**：`gate_replay.py:40-69`（仅 `cli.py:695-733` 调用）、`memory.py`（157 行）、`mcp.py:239-336`（TOOLS）、`dream.py:1-20`（cadence 声明）、`docs/benchmarks.md:113-131` + `CHANGELOG.md:69-80`（负结果）。

---

### 一句话给 lead

**能借的是「判据」，不是「代码」**：回放门控（严格改进 + 平局不算证据 + incumbent 重打分）、事件溯源 ALM（append-only 权威 + 物化可重建 + 类型校验器）、`termination_reason`（区分「选择停」与「选项被移除」）；**必须自己写的是编排层**（cadence/budget/何时问人/何时回滚）与 **Windows 沙箱**（无 rlimit、只杀直接子进程、无 jail、`python3` 硬编码）；集成走 **MCP stdio + 宿主内 LLM 反代**（1-2 天），不要移植算法（1-2 周且目标函数语义漂移风险高）；它**没有**做循环/编排的自我优化，那是它留给我的空位，也是它 holdout 未接线的可信度缺口所在。
