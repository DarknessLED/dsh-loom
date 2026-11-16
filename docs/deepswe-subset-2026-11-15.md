# DeepSWE 子集对比（2026-11-15）

## 为什么做

SWE-bench Verified 已被指出约 19.78% 的"解决"案例语义上不正确（top-30 榜单分析），
所以这次换 DeepSWE 子集。目标不是刷榜，而是拿到一个**可复现、花得少**的外部对照点。

## 对照的公开基线

DeepSWE 官方（deepswe.datacurve.ai）统一用 mini-swe-agent 跑 28 个模型，其中：

| 模型 | resolved | 每任务花费 |
|---|---|---|
| gpt-6-astra[xhigh] | 74% ±3 | $4.43 |
| claude-opus-5[max] | 74% ±4 | $11.84 |
| **deepseek-v4-flash[max]** | **53% ±4** | **$0.46** |
| gemini-3.5-flash | 36% | — |

选 deepseek-v4-flash 作参照，因为本机 worker 模型同为 deepseek 系、且它是公开表里最便宜的一档。

## 本地怎么跑（没有 docker 的近似）

主机没有 docker，官方镜像无法启动。替代做法是读官方仓库 `felan-ai/deep-swe` 的
`tasks/<id>/{task.toml,instruction.md,tests/,solution/}`，在本地按同样的判定顺序重放：

1. 取 agent 改动 `git diff base` → `model.patch`；
2. 干净的 base 树上应用 `model.patch`，再应用 `tests/test.patch`（新的 holdout 测试）；
3. 跑 base 套件与 new 套件，输出 JUnit XML；
4. 用官方 `tests/grader.py grade` 按 `p2p_node_ids` / `f2p_node_ids` 判定；
5. `REWARD=1` 仅当全部 f2p 通过且 p2p 无回归。

校准：三个任务的 reference `solution/solution.patch` 单独重放都必须 `REWARD=1`，
空补丁必须 `REWARD=0`。不满足就不采信任何 agent 结果。

已知近似：
- Windows + 本地 Python，不是 Linux 容器；无网络隔离、无 CPU/内存限额；
- 环境事先 `pip install -e .` 预热，官方是在镜像内现装；
- vulture 任务里 `tests.test_script.test_whitelists_with_python` 在 Windows 基线就失败，
  为使二值奖励可达，只在 p2p 集合中删除该一条（改动可见于 `grade_task.py` 的 `DROP_P2P`）。

## 任务与结果

每场战役：`code-fix` v1，`candidates=1`、`halving=false`、`planMode=off`，
预算 $0.25、1 轮，worker 模型 deepseek-flash（harness 默认）。

| 任务 | 基线 KILLRATE | 结果 | 花费 | tokens | 用时 |
|---|---|---|---|---|---|
| ipython-session-bundle-replay | 0.6304 | **REWARD 1** | $0.059421 | 70,125 | 157.6s |
| vulture-persistent-analysis-cache | 0.9245 | **REWARD 1**（见下） | $0.104195 | 94,647 | 235.1s |

合计 **2/2 resolved，$0.163616，平均 $0.0818/task**。

vulture 的说明：战役记录里该轮是 `score 0`，原因是本地 grader 的缺陷——agent 把改动
**提交**了，而 `prepare` 在 reset 时从 index 恢复了功能文件，导致 `model.patch` 报
`apply_failed=1`。修复方式是判定前 `git checkout --detach base`（保留 agent 分支），
然后用同一份 `model.patch` 重判，得到 `P2P=294/294 F2P=24/24 REWARD=1`。
ipython 的补丁也用同样方式独立重判为 1，两次结果一致。

## 应该怎么读这个数

- **2/2 不等于 100% 的能力**。只抽了 2 个 Python 任务（官方 113 个、5 种语言），
  n=2，置信区间极宽；挑的都是依赖轻、能在本机装起来的中等难度任务。
- 本地环境比官方宽松：无网络隔离、无镜像冷启动、可自行跑测试拿反馈、
  agent 时间是 13 分钟而不是官方的 3 小时，这些都可能抬高成功率。
- 模型不是同一个：公开基线是 `deepseek-v4-flash[max]`，本机是 harness 的
  `deepseek-flash`，不能当作同一模型的分数对比。
- 花费口径也不同：官方 $0.46 含镜像与环境，本地不含镜像构建；但本地确实只花了约
  $0.08/task，这个量级差值得记录。
- 结论只能是：**在本机这个近似 harness 上、这 2 个任务上，dsh-loom 跑出了 2/2，
  单任务成本比公开的 deepseek-v4-flash 低一个量级**。不能推出"比 mini-swe-agent 强"。

## 复现

```bash
# 任务与环境
git clone https://github.com/felan-ai/deep-swe C:/Projects/deep-swe
C:/Software/Anaconda3/python.exe C:/Projects/ds-run/grade_task.py \
  --task C:/Projects/deep-swe/tasks/ipython-session-bundle-replay \
  --ws C:/Projects/ds-run/ipython
# 战役
rsi_start({id:"deepswe-ipython", workspace:"C:/Projects/ds-run/ipython",
           budgetUsd:0.25, budgetRounds:1, template:"code-fix",
           tasks:[...], auto:true})
```

harness 在 `C:/Projects/ds-run/grade_task.py`（不在本仓库内，未提交；上面 `REWARD=1`
的重判用的就是它）。战役记录：`~/.dsh/loom/campaigns/deepswe-{ipython,vulture}/`。

---

## 2026-11-16 晚：第三个任务，受控实战，以及一次被我污染的运行

前两个任务都是"我写规格、循环去实现"。这一次换成**规格不是我写的**：用 DeepSWE 的
`adaptix-name-mapping-aliases`（reagento/adaptix，base `a691069f`），44 条 held-out
F2P 用例由 benchmark 提供，我这侧只提供 grader。两次运行，两次都记下来。

### 隔离条件

- 工作区 `C:/Projects/ds-run/adaptix`，base `a691069f`。
- 先 `git remote remove origin`，再把默认分支指回 base 并 gc，复刻官方容器的"时间旅行"
  （`main` 原来领先 base 128 个提交，答案就在里面）；删掉 base 之后才有的 tag。
- 参考解 `solution/` 移出任务目录（这是**第二次**运行才做的，原因见下）。
- grader 仍是我写的 `C:/Projects/ds-run/grade_task.py`，为这个任务加了两项：
  `TASKS["adaptix-name-mapping-aliases"]` 的 base/new 套件命令；`DROP_P2P` 里 4 条
  在 Windows 上必挂的用例（`test_with_property.py` 的 `Path("/Laptop")` 在 Windows
  变成 `"\\Laptop"`，与断言里的 `/Laptop` 不等），**这 4 条是公开声明丢弃的**。
- 校准：空补丁 `P2P=2734/2734 F2P=0/44 KILLRATE=0.984161 REWARD=0`；官方参考解
  `P2P=2734/2734 F2P=44/44 KILLRATE=1.0 REWARD=1`。grader 能复现参考解，才允许用它评 agent。

### 运行 1（作废）：循环把参考解抄了

- 战役 `adaptix-aliases-live`，candidates 2、预算 $0.35。第 1 轮 promoted，score 1，
  $0.276367 / 248,380 tokens（r1a1 $0.13736 成功，r1a2 $0.139007 并行跑到 450s 才被
  solved-by-sibling 收掉）。
- 但把 `artifacts/r1a1.patch` 与官方 `solution.patch` 去掉空行后的正文比对：
  711 行、逐行 diff 只差**空行尾部多一个空格**。也就是说它是参考解，不是做出来的。
- 原因在我：任务提示让 agent 读 `C:/Projects/deep-swe/tasks/adaptix-name-mapping-aliases/instruction.md`，
  而 `solution/solution.patch` 就在同一目录。循环没有越权，是我把答案放在了它手边。
- 因此这一轮**只作为"证据隔离是 verifier 契约的一部分"的记录**，不计入能力。

### 运行 2（有效）：44/44 新行为，34 条旧测试回归，被门挡下

- 隔离补齐后重开战役 `adaptix-aliases-blind`，同样 candidates 2、预算 $0.40，
  提示改为指向仓库外的 `C:/Projects/ds-run/adaptix-task.md`，并声明"历史到 base 为止、无网络"。
- 第 1 轮 **no-gain**，$0.270347 / 194,637 tokens：
  - `r1a1` $0.098227 / 77,786 tokens / 293s：`killRate 0.984161` = 2734/2778，
    也就是 base 全绿、44 条新用例**一条没过** —— 它只改了 facade 一侧，没接上加载路径。
  - `r1a2` $0.172120 / 116,851 tokens / 388s：轮内记录 `killRate 0`，我事后用它自己的
    patch 重判得到 `P2P=2700/2734 F2P=44/44 KILLRATE=0.987761 REWARD=0`。
    **44 条新行为全过，但 34 条既有测试被改坏**（`name_layout` 旧路径被覆盖），
    binary reward 因此是 0，门拒绝晋升 —— 这是对的。
- 结论：盲跑一轮、$0.27，循环独立写出了这个 492 行特性的**绝大多数正确行为**，
  但没能保住旧语义；离"解决"差的是回归，不是新功能。这正是我此前说的"验证器能挡住
  它，但挡不住它自己发现"的那类失败。

### 这一轮暴露的两个洞（已修）

1. **环境坏了会被读成"补丁全错"**。`r1a2` 轮内读到 `killRate 0`，重判却是 0.9878：
   当时 `pip install -e` 的指向失效，base 套件一条都收集不到（`P2P=0/2734`），
   这和"完美回归"在数字上无法区分。grader 现在先 `import adaptix` 预检，并在
   `p2p_passed == 0 && p2p_total > 0` 时打印 `ENV-BROKEN` 并以 exit 3 退出，
   明确表示"这不是对补丁的判决"。
2. **提示里的路径泄题**（运行 1）。任务目录不再作为提示的落点；`solution/` 已移出，
   工作区历史被截断到 base、远端已删除。

### 对前两个任务的影响（诚实修正）

`deepswe-ipython` 与 `deepswe-vulture` 当时没有做上面这层隔离：仓库带完整上游历史、
`origin` 也在。我没有找到它们抄答案的证据（两轮的执行轨迹是改源码、跑测试），
但**它们的结果因此弱于"盲跑"证据**，只能算"在这个任务上做出来了"，不能算"在无泄露
条件下做出来了"。以后再用 DeepSWE 评，一律先做时间旅行 + 移走 solution。

### 花费与对比

| 运行 | 结果 | 花费 | tokens |
| --- | --- | --- | --- |
| 运行 1（泄露，作废） | reward 1（抄的） | $0.276367 | 248,380 |
| 运行 2 `r1a1` | 0/44 新行为 | $0.098227 | 77,786 |
| 运行 2 `r1a2` | 44/44 新行为，34 条回归 → reward 0 | $0.172120 | 116,851 |
| 运行 2 合计 | 未解决 | **$0.270347** | 194,637 |

盲跑失败一轮约 $0.27，与公开基线 mini-swe-agent + `deepseek-v4-flash[max]` 的
$0.46/task、53% ±4 是同一量级；但 n=1，不能拿单轮失败去推成功率。
