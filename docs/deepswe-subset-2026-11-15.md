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
