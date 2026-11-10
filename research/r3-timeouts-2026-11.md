# R3：超时与预算的形状

> 数据快照：`~/.dsh/loom/campaigns/*/events.jsonl` 全量 **420 条 `attempt.finished`**、**161 条 planner `node.finished`**、214 条 `round.finished`。一次性统计脚本见附录 A，可原样复跑（输出与本文逐字一致）。
> 文献读取日期：**2026-11-11**。凡标「未验证」的都是我没取到一手证据、或我们自己的数据不足以下判的。
> 写作约定：每条结论都给出 ① 影响哪一行代码 / 哪个配置键 ② 可证伪的预测 ③ 怎么用账本或测试验证。

---

## 0. 结论先行

1. **600s 不是 p90，是审查点（censoring point）。** 420 个 attempt 里有 **50 个落在 600s 以上**：24 个卡在 600–605s 的刀口（被杀），26 个跑到 605s 以上（历史版本）；而 540–570s 只有 12 个、570–600s 只有 **1 个**。真实的自然分位应该用**成功样本**算：205 个可验证成功里 p95 = **659s**、1.2× = **791s**。→ `session.attemptTimeoutMs` 从 `600_000` 提到 **`780_000`**。
2. **按 campaign 缩短上限是坏买卖，按 campaign 放宽是好的。** 反事实（cap = 1.2× 各自成功 p95，夹在 [300s, 900s]）只省 **298s / 97,834s = 0.3%**，却误杀 2 个赢；各 campaign 的成功 p95 从 67s 到 479s 差 7 倍，但那 7 倍里**没有任何一秒值得用赢去换**。→ 自适应只允许**向上**调整：`clamp(1.2×p95_ok, 600s, 900s)`。
3. **时间的大头不在超时，在「1 秒内死掉」的 attempt。** `failureKind=died` 有 **145 个（34.5%）**，中位时长 **1 秒**，总时长只占 13.6%（13,271s），却 **0/145 可验证**。它们和 deadline 无关，和 `models.fallback: []` + 「died 无诊断时不重试」有关。这一项比任何超时调参都值钱。
4. **规划器的 240s 上限根本没生效，而 attempt 的 600s 上限是生效的。** planner 节点 161 个，**48 个 ≥240s，只有 22 个被标记 `timedOut`**；attempt 侧 115 条带 `timeoutMs=600` 的记录最大只跑到 602s，21 个越线全部被标记。同一个代码库守住一个守不住另一个——修法不是改数值，是补 timer 起点（`session.js:255-318`）。
5. **hedging 不该在 t=0 做。** 我们现在的「第二候选」是两个**不同 prompt** 的并行探索，不是 hedge；真正的 hedge 是「同一个任务，t=p75 还没回就补一份」。在 agent 里它应该只在「已过 p75 且没有 patch」时触发，成本上界是被触发的那 24.5% attempt（103/420）。

---

## 1. 先校正统计口径：我们到底在量什么

### 1.1 分布形状与 600 处的堆积

| 分位 | p50 | p75 | p90 | p95 | p99 | max | mean |
|---|---|---|---|---|---|---|---|
| 全部 420 | 144.9s | 368.3s | **601.3s** | 659s | 1068s | 1205.7s | 232.9s |
| 成功 205 | 224s | 374s | 568s | **659s** | 926s | 1136s | — |

| 时长桶 | <60 | 60–180 | 180–300 | 300–450 | 450–540 | 540–570 | 570–600 | 600–605 | ≥605 |
|---|---|---|---|---|---|---|---|---|---|
| 个数 | **143** | 77 | 63 | 55 | 19 | 12 | **1** | **24** | **26** |

按「边际产率」重新切（这条比上面的细粒度直方图有用得多）：

| 时长带 | n | 成功 | 成功率 | 每千秒成功 |
|---|---|---|---|---|
| 0–60s | 143 | 20 | 14% | **15.42** |
| 60–120s | 49 | 39 | 80% | 9.08 |
| 120–240s | 64 | 53 | **83%** | 4.54 |
| 240–374s | 61 | 42 | 69% | 2.24 |
| 374–480s | 29 | 17 | 59% | 1.38 |
| 480–600s | 24 | 15 | 62% | 1.17 |
| 600–780s | 36 | 12 | 33% | 0.53 |
| 780–1206s | 14 | 7 | 50% | 0.50 |

产率读法：**每花一秒买到成功，在 120–240s 带最高，之后单调衰减到 1/10。** 但注意 600–780s 带仍有 12 个成功、780s 以上还有 7 个——「产率低」不等于「不值得买」，我们的决策变量是「误杀一个赢的代价（≈重跑一轮 700s）」而不是平均产率。

分布读法：**p90 = 601.3s 是 600s 这个刀口自己造出来的**，不是模型行为的自然分位。任何「我们的 p90 正好等于超时值，所以超时设得对」的推理都是循环论证。

> 可证伪：如果 600 处真的是自然分位，那么 570–600 桶应有约 20–30 个（按左侧斜率外推），实际只有 **1** 个。1 ≪ 20，所以它是审查点。验证：附录 A 第 1 段。

### 1.2 时间花在哪：按 failureKind 分账

| failureKind | n | 总时长 | 均值 | 中位 | verifierOk |
|---|---|---|---|---|---|
| `ok` | 107 | 46,275s | 432.5s | 408s | 88 |
| （字段缺失，旧记录） | 136 | 23,242s | 170.9s | 129s | 115 |
| `timeout` | 23 | 15,039s | 653.9s | 601s | **2** |
| `died` | 145 | 13,271s | 91.5s | **1s** | **0** |
| `crash` | 9 | 7s | 0.8s | 1s | 0 |

三条硬事实：

- **timeout 是最贵的无效开销**：15,039s（15.4% 的全部 attempt 时间）买回 2 个赢。其中 16 个**写完了 patch**（均值 4,046 bytes，最大 19,551 bytes）——工作做完了，只是没赶上验证。「被杀的 attempt 都写完了补丁」这句话在账本里是可证的。
- **died 是「秒死」不是「慢死」**：中位 1 秒、均值 91.5s（均值被少数长样本拉高）。145 个 attempt 里 80 条的 error 是同一句 `child session ended in error with no diagnostic (parent or provider)`。这是**启动/传输**故障，重试成本约等于 1 秒 + 真实工作。
- **旧记录的 136 个里 115 个是成功**，说明「字段缺失」主要是时代差，不是失败。

> 可证伪：如果 died 是「慢失败」，其中位时长应接近成功分布的中位（224s）而不是 1s。实测 1s。

### 1.3 上限到底有没有被执行（两个相反的答案）

| 对象 | 记录的 timeout | 越线数 | 最大越线 | 被标记 | 代码位置 |
|---|---|---|---|---|---|
| attempt（新记录） | 115 条 `timeoutMs=600000` | 21 | 602s（1.00×） | 21/21 | `round.js:1190` |
| attempt（旧记录） | 无字段 | 29 | 1205.7s（2.0×） | 未知 | 历史版本 |
| planner 节点 | 无字段（`deadlineMs` 37 条，全 240000） | **48 个 ≥240s** | **510s** | 22/48 | `session.js:255-318` |

结论：**attempt 的 deadline 守得住（误差 0.3%），planner 的守不住（最高 2.1×）。** 原因在 `#one()`：timer 是 `setTimeout(..., Math.max(1000, timeoutMs))`，在 `ensureParent()` **之后**才启动（`session.js:255-318`），而 round 侧算 `deadlineAt` 是在 dispatch **之前**（`round.js:1190-1191`）。两者相差的就是子会话创建/父会话复用/首次网络的耗时，实测可达 200s+。

> 可证伪：如果 planner 的 240s 被守住了，≥240s 的节点数应 ≈ `timedOut` 数。实测 48 vs 22，差 26 个。

---

## 2. Q1：公开的尾延迟分布长什么样，我们正常吗

### 2.1 能拿到的公开分位数

- **按任务的墙钟 p50/p90/p99，公开文献里基本不存在。** agent 论文报的是步数、token、美元（见 §5），不是秒。这一点必须承认：我们无法把 145/601/1086 直接和某个公开分位表对照。
- **能对照的是步数形态**：《Last Step Matters》Table 1 给了 agent 轨迹长度——BrowseComp 平均 **31.6 步**、BC-zh 20.7 步、HLE 13.5 步，且轨迹被 **80 步**截断（https://arxiv.org/pdf/2608.29685）。80 步 × 每步一个工具往返，和我们 p99 = 1068s 是同量级的。
- **单次模型响应本身就能到百秒级**：推理模型 GPT-6 Sol 的 TTFT 实测 **102.15s**、115.2 tok/s；500 token 输出时 TTFT 占总时延 **96%**（https://apidog.com/th/blog/gpt-6-sol-time-to-first-token-latency/，二手，引 Artificial Analysis）。TTFT 的分解式 `TTFT = t_queue + t_prefill + t_step + t_net`、`t_e2e = TTFT + n_out × TPOT` 见 https://raw.githubusercontent.com/Explorer-Dong/open-csai-wiki/main/docs/llm/serving/deployment/performance/ttft.md。
- **工程界的经验值**：pytorch 的 @claude 自动化把 `API_TIMEOUT_MS=180000`（3 次重试）写死，并记录「**单次慢响应约 9 分钟**」（https://github.com/pytorch/pytorch/pull/198687）。

### 2.2 判断

我们的形状**正常，但被审查污染**：

- p50 = 145s 与「一个 agent 跑 20–30 步、每步一次模型往返」一致（145s / 30 步 ≈ 4.8s/步）。
- p99 = 1068s 与「80 步上限 × 每步数秒到数十秒」一致，量级没有异常。
- **不正常的是「34% 的 attempt 在 60s 内结束」**：143 个 <60s 的 attempt 里只有 20 个成功（14%），而其中 145 个 `died` 的中位时长是 **1 秒**。这是基础设施噪声，不是模型行为。

> 但这三句都是**我的推断**，公开数据只支持「量级合理」，不支持「分位数相同」。标：未验证。

### 2.3 对我们的操作含义

统计口径必须换成**成功样本**：用全体算分位，等于在拟合刀口。附录 A 第 2 段给出成功样本的分位表（p95 = 659s）。

---

## 3. Q2：按任务类型自适应 deadline

### 3.1 文献怎么说

- **The Handoff Tax（AWS，58,000 runs）** 给了一个可直接借用的方法：切换点不取固定步数，而是「**在每个难度桶内、对起始模型的 step-count 分布取分位**」，并明确写下理由——`Fixed step counts are not comparable across tasks or models because trajectory lengths vary`（https://arxiv.org/html/2608.24358v1）。
- **微服务侧**：腾讯云的自适应治理文章主张超时按「历史分位数 + 当前 P99」动态调，固定阈值的核心问题是「同一个值对慢调用太紧、对快调用太松」（https://cloud.tencent.com.cn/developer/article/2725408?policyId=1004）。
- **gRPC 官方**：deadline 是绝对时间点，建议「先从经验估计，再用压测校准」（https://grpc.org.cn/docs/guides/deadlines/）。社区规范进一步要求级联预算每层 ≤ 0.8× 上层，且**必须传绝对 deadline，不得只传相对 duration**，因为「下层 timeout 大于上层」等于没设 timeout（https://raw.githubusercontent.com/AsiaOstrich/universal-dev-standards/refs/heads/main/core/timeout-standards.md）。

### 3.2 三种做法的证据强度

| 做法 | 证据 | 我能给出的判词 |
|---|---|---|
| **A. 历史成功分位 × 系数** | Handoff Tax 的分位法 + 腾讯云的历史分位 | **最强，且我们有数据**。按 campaign 分组即可。 |
| **B. token 预算反推时长** | 无直接文献 | **否决**。我们单轮 token 1500–5000、美元 0.0004–0.0016，几乎恒定；token 与墙钟的相关性**未测量**，而且 `priceSource` 大量回退到默认价（245/420 条有 priceSource），口径本身可疑。 |
| **C. 先探一个小请求测延迟** | 级联路由（FrugalGPT/RouteLLM）有证据，但那是「换模型」不是「估时长」 | **不可用**。TTFT 的方差主要来自排队（`t_queue`），同一 prompt 两次调用可以差数倍；拿一次探测去定 20 分钟预算，信噪比不够。标：未验证。 |

### 3.3 我们的反事实（这是本节最硬的部分）

按 campaign 分组，取 `cap = clamp(1.2 × p95(该 campaign 成功 attempt), 300s, 900s)`，重放 420 个 attempt：

| campaign | n | 成功 | p95_ok | 新 cap | 现耗时 | 省下 | 受影响 | 误杀赢 |
|---|---|---|---|---|---|---|---|---|
| loom-chaos | 12 | 8 | 250s | 300s | 2,860s | **265s** | 3 | 1 |
| loom-self2 | 32 | 29 | 200s | 300s | 3,620s | 33s | 1 | 1 |
| loom-self3 | 22 | 19 | 253s | 303s | 2,144s | 0s | 0 | 0 |
| 其余 7 个 | — | — | — | 600s | — | 0s | 0 | 0 |
| **合计** | **420** | **205** | — | — | **97,834s** | **298s（0.3%）** | 4 | **2** |

**结论：往小调没有任何价值。** 省 0.3% 的时间、误杀 2 个赢，而且这两个赢都是「刚好超过 300s」的那类（慢但有效）。这直接推出两条设计约束：

1. 自适应只允许**向上**：`cap = clamp(1.2×p95_ok, 600_000, 900_000)`，下限锁死在今天的 600s。
2. 「600s 对 `loom-self` 太宽」这个直觉是对的（它的成功 p95 只有 67s），但**不要因此缩短它**——缩短省不到时间，只会杀掉慢赢。宽一点的机会成本是每轮多等，而 600s 已经是并发 2 下的轮墙钟上界。

### 3.4 建议值与冷启动

```
attemptTimeoutMs(campaign) = clamp( 1.2 × p95(该 campaign 最近 20 个 verifierOk 的 attempt 时长),
                                    600_000, 900_000 )
若该 campaign 的成功样本 < 8 条 → 继承全局 780_000
```

- **全局默认 780_000**：= 1.2 × 659s（205 个成功样本的 p95）。
- **上限 900_000**：给 `loom-tri11`（成功 p95 = 1026s）这类历史上有 1000s+ 成功案例的 campaign 留出空间；再高就会撞上 `graceMs` 与并发 2 的轮墙钟。
- **滞后控制**：每 20 个 attempt 重算一次，单次变动不超过 ±20%（防止尾部样本把 cap 甩飞）。
- **软截止**：`0.75 × hard` 时注入「停止探索、提交当前 patch」的提示——这是把 timeout 从「杀」变成「收」的唯一便宜办法，见 §4.3 与 §7。

> 可证伪：如果 780s 是错的（也就是 600→780 这段完全没有可救的工作），那么把 cap 提到 780 后，新增的 600–780s 区间内的成功率应接近 0。历史证据相反：**≥605s 的 26 个 attempt 里有 15 个成功（58%）**——虽然那是旧版本、无硬上限的记录，是最好的可得 proxy。
> 验证脚本：附录 A 第 4 段（重放：给定 cap，统计落在 (600, cap] 区间的成功数）。

---

## 4. Q3：Tail-at-Scale 式 hedging 在 agent 里能不能用

### 4.1 原始技术

Tail at Scale 的 hedged request：先发给「认为最合适」的副本，**短暂延迟后**再发第二份，谁先回用谁，收到后取消其余。原文同时警告 naive 实现会加不可接受的负载，但有只增加少量负载的变体（https://mags.acm.org/communications/201302?pm=2&u1=texterity&linkImageSrc=undefined/&pg=79，CACM 2013-02，正文片段已取到）。二手数字：P95 hedging「96% P99 降低、5% 额外开销」（https://hex.pm/packages/crucible_hedging/0.4.0/files/README.md?fallback=default）；BigTable 10ms 对冲把 p99.9 从 1800ms 压到 74ms（多个二手来源，一手 PDF 两次 404，标二手）。

### 4.2 agent 场景的等价物

| 机制 | 是什么 | 代价 | 我们有没有 |
|---|---|---|---|
| 同 prompt 双发 | 真 hedge，压尾延迟 | 双倍 token + 双倍并发槽 | 没有 |
| 不同 prompt 并行 | 探索（diversity），不是 hedge | 双倍 token | **有**（candidateMode=parallel） |
| 中途重启（overlay/fresh） | 换轨迹 | 重启开销 / 丢进度 | 有 salvage，但只在 timeout |
| 换模型 handoff | 难度升级 | 上下文重建（handoff tax） | 有代码路径，但**没被使用**（见 §6） |

关键文献：**Abort + 在新上下文里重跑，比「带着半截上下文 handoff」又便宜又准**（79.2% / $0.90 vs 69.2% / $1.61，https://arxiv.org/html/2608.24358v1）；而 **cold restart 几乎没有收益**（66.8% vs 空 66.6%，+0.2pp），有收益的是「保留编辑的 overlay 重启」（+5.2pp，https://arxiv.org/pdf/2608.03222）。这三条放在一起说明：**重启的价值不在「重来」，在「带着已完成的编辑重来」**——正好对应我们 salvage 的语义（patch 已在 worktree 里，只差验证）。

### 4.3 对我们的建议：把第二候选从 t=0 挪到 p75

现在 `candidateMode='parallel'` 在 t=0 就发两份不同 prompt 的 attempt（`round.js:827`）。改成 hedge：

```
hedgeAtMs = p75(该 campaign 成功 attempt 的时长)      // 全局约 374s
触发条件：t > hedgeAtMs 且 该 attempt 尚无 patch（patchBytes == 0）
动作：再发一份（不同 phase），谁先产出可验证 patch 用谁，另一份 cancel
```

成本上界：420 个 attempt 里落在 >374s 的是 **103 个（24.5%）**，即最多多付 24.5% 的 attempt-seconds；而 480–600s 桶的成功率是 62%，其中大部分会自己回来，所以真实触发率会明显低于 24.5%。

> 这是**提案，未验证**。可证伪的预测：若「慢 = 更容易失败」成立，则在 374s 后补发的 attempt 里，第一份的最终成功率应 < 33%（即低于总体 49%），否则 hedge 就是白花钱。
> 先测量再实施：在 `attempt.finished` 里加 `patchAtMs`（首个 patch 落盘的相对时间），跑 20 轮即可算出 P(最终成功 | t>374s 且 patchBytes=0)。

**不要做的事**：在 t=0 改成「同 prompt 双发」。我们的两个候选是不同 prompt 的探索（`phase: explore|exploit`），同 prompt 双发只会让两份输出高度相关，浪费一个并发槽——这个判断的文献依据是 diversity 与 redundancy 的区别，我**没有**找到 agent 场景的直接对照实验，标：我的推断。

---

## 5. Q4：固定超时 vs 自适应超时，有没有定量对比

### 5.1 公开的定量对比：没有直接实验

我找不到「同一 agent 系统，固定 deadline vs 自适应 deadline，完成率/成本」的对照论文。能拼出来的只有三段间接证据：

1. **固定步数不可比**：Handoff Tax 明确说 trajectory 长度跨任务/模型不可比，所以按桶取分位（https://arxiv.org/html/2608.24358v1）。
2. **预算预测普遍过于乐观**：agent 自己估的剩余预算不可信（`Agents' budget forecasts are over-optimistic (Lin et al. 2026)`，转引自 https://arxiv.org/pdf/2608.03222）——这条直接否掉了「让 agent 自己说还要多久」的做法。
3. **时间预算写进系统提示是有效的工程手段**：pytorch 给 @claude 55 分钟预算并写进 prompt（https://github.com/pytorch/pytorch/pull/198687）。

### 5.2 我们自己的定量对比（cap 反事实）

| 方案 | 省时 | 误杀赢 | 轮墙钟可预测性 |
|---|---|---|---|
| 固定 600s（现状） | 0 | 0 | 强：并发 2 时单轮 ≤ 600s + 验证 |
| 固定 780s | 最坏 +180s × 50 个 = **+9,000s（+9.2%）** | 0 | 中：单轮上界 +30% |
| 按 campaign 缩到 300s | 298s（0.3%） | **2** | 强 |
| 按 campaign 放宽到 900s（仅 tri*） | 0 | 0 | 弱（少数 campaign 才触发） |

**取舍是清楚的**：固定值的价值是**可预测性**（并发 2 时轮墙钟有硬上界，牌桌上能算下一轮什么时候开始），自适应的价值是**不误杀**。我们的实际稀缺资源是墙钟，但误杀一个赢的代价是整轮重来（~700s）——所以 **780s 的固定值 + 只向上自适应** 是这两者的交集，而不是二选一。

> 可证伪：如果 780 让每轮平均墙钟涨超 10%，而晋升率没涨，就回退到 600。验证：比较开 780 前后各 20 轮的 `round.finished.durationMs` 与 `promoted` 比例。

---

## 6. Q5：`#one()` 的共享时钟——第二个模型是不是必被挤死

### 6.1 代码路径（逐行）

1. `run(prompt, {timeoutMs})` 记 `startedAt = Date.now()`，`left() = timeoutMs - elapsed`（`session.js:143` 附近）。
2. `reserve = config.session.fallbackReserveMs || 0`，**默认 0**（`config.js:66`）。
3. `firstSlice = chain.length > 1 && reserve > 0 ? min(timeoutMs, max(minFallover, timeoutMs - reserve)) : timeoutMs`（`session.js:170-173`）→ **reserve=0 时第一个模型拿走全部预算**。
4. 后续模型：`slice = i === 0 ? firstSlice : Math.max(1000, left())`（`session.js:182`）→ **回落时只剩剩余时间**，且有个 `Math.max(1000, …)` 的 1 秒下限。
5. 是否回落：`roomToFallOver = kind !== 'timeout' || left() >= minFallover`（`session.js:211`）→ **超时后 left() ≈ 0 < 30s，直接不回落**。

### 6.2 事实

- **420 个 attempt 里，`modelsTried` 长度 > 1 的记录：0 条。** 275 条记录全是 `["default"]`。
- 原因不是「没触发」，是 **`models.fallback` 默认为空数组**（`config.js:44`），而 `models.worker/meta/judge` 默认 null。整条 fallback 链路是**不可达代码**。
- 但设计缺陷是真的：一旦有人填了 `fallback: ['model-b']`，共享时钟会保证 **model-b 只在「第一个模型非超时失败」时拿到剩余时间**；超时（我们最常见的失败）时 `left() ≈ 0`，`roomToFallOver` 为假，**model-b 一次都不会被调用**。lead 说的「第二个模型必然被挤死」——准确说法是：**超时路径下它必死；非超时路径下它只拿剩饭**。

### 6.3 三种修法

| 修法 | 改动 | 代价 | 判词 |
|---|---|---|---|
| A. 设 reserve | `session.fallbackReserveMs: 0 → 90_000` | 第一个模型少 90s（在 780s 下是 11.5%） | **推荐**（仅当 `fallback` 非空时生效） |
| B. 删掉整条链 | 移除 `models.fallback` 与 `firstSlice`/`roomToFallOver` | 无 | 次选：代码更诚实，但丢掉「provider 挂掉」的兜底 |
| C. 让回落重启而非续时 | 超时后在新会话里用剩余预算重跑 | 复杂 | 否决：等于把 hedge 塞进 fallback，语义混乱 |

另加一条**与 Q5 相关但独立**的修补：`session.js:182` 的 `Math.max(1000, left())` 会在剩余不足 1s 时仍然创建子会话，换回一个 `kind='timeout'` 的记录，**这个记录永远不可 salvage**（`round.js:1359` 要求 `ver.ok`）。正确做法是：`left() < minFalloverMs` 时**不发起**，直接返回 `unusable: 'timeout'` 并记 `reason:'no-budget'`。依据是 gRPC 的「过期请求立即 fail-fast，不要发起下游调用」（https://grpc.org.cn/docs/guides/deadlines/）与 cordum 的「retry 前必须查剩余预算」（https://cordum.io/blog/ai-agent-grpc-deadline-budgeting）。

> 可证伪：如果 share-clock 不是问题，那么在 `fallback: ['x']` 的 10 轮里，`modelsTried` 应出现长度 2。现在 0/420，说明它从未发生——修正后应 > 0，且这些 attempt 的 `timedOut` 比例应下降。

---

## 7. Q6：提前判死的信号，哪个最可靠

### 7.1 文献的答案：早期信号基本不可靠

- **《Last Step Matters》**（https://arxiv.org/pdf/2608.29685）：15 个 model×bench 组合，**50% 进度时所有信号（verbal confidence、entropy、self-consistency）AUROC ≤ 0.60**，90% 时仍 < 0.70，只有**完成时**才到 0.85。机制是 **path switching**——agent 中途换方向，让早期信号与终局脱钩。它的建议是：**用终局置信度决定要不要重启，不要在途中干预**。
- **《Fail-Fast, Restart-Smart》**（https://arxiv.org/pdf/2608.03222）：要判死，得训一个 0.6B 的 monitor（LoRA + 三个 head），只看 [ISSUE] + 最近 8 步，且**前 20 步不判**（φ_min）。收益：5% FPR 下省 14.6–20.4% execution token；**关键对照：只用 duration 的朴素基线已经能省 11.4%**。而且 25% FPR 时靠它把准确率从 66.6% 提到 71.8%（+5.2pp）——注意这是**重启带来的**，不是判死本身。
- **DEER**（ICLR 2026，https://mlanthology.org/iclr/2026/yang2026iclr-dynamic/）：在 reasoning 的 switch point 用 trial answer 的置信度提前退出，CoT 长度 −19.1%~−80.1%、准确率 +0.3%~5.0%。但这是**单次生成内部**的退出，不是跨 tool call 的 agent 判死。

### 7.2 我们手上有什么信号

| 信号 | 我们有吗 | 判词 |
|---|---|---|
| 首 token 延迟 | 没有（`attempt.finished` 不记，只有总时长） | 且 TTFT 方差主要来自排队，弱 |
| 输出速率（token/s） | 只有总 `tokens` 与 `textChars`，无时间序列 | 需要新增事件 |
| tool call 间隔 | 完全没有 | 需要新增事件 |
| **已过时长 / 已过比例** | **有**（`deadlineAt`、`timeoutMs`） | **唯一现在就能用的** |
| **有没有 patch** | 有 `patchBytes`（347/420 条） | **与上一条组合最强** |

### 7.3 建议：只做 duration-gated 的「收尾」判据，不做「判死」

```
在 0.75 × hardDeadline 时：
  - 若 patchBytes > 0 → 注入「停止探索，提交并自检」提示（保赢）
  - 若 patchBytes = 0 → 注入「缩小范围到最小可验证改动」提示（转向，不杀）
在 hardDeadline 时：
  - 走现有 salvage 路径（round.js:1359），但把 patch 先 commit 到 worktree
```

理由：文献里唯一被重复验证的收益是「重启 + 保留编辑」（+5.2pp，FailFast），而「凭早期信号杀」的收益被 duration-only 基线（11.4%）证明**大部分来自『等得够久』本身**，不是来自聪明。我们没有必要为了 11.4% 去训模型，因为我们**已经在等**——缺的只是在等的时候把 patch 存下来。

> 可证伪：如果 16 个「超时但有 patch」的 attempt 里有相当比例本来能在硬截止前通过验证，那么加软截止后，timeout 类的 `verifierOk` 应从 2/23 上升到 ≥5/23。若不变，说明 patch 差的不是时间而是正确性，该退回「不 salvage」。

---

## 8. 建议的默认值（一张表）

| 键 / 位置 | 现值 | 建议值 | 依据 | 怎么验证 |
|---|---|---|---|---|
| `session.attemptTimeoutMs`（`config.js:57`） | `600_000` | **`780_000`** | 成功样本 p95 = 659s × 1.2 | 20 轮 A/B 看 `promoted` 与 `durationMs` |
| 新增 `session.attemptTimeoutRatioOfP95` | — | `1.2`（按 campaign 算，`n≥8` 才生效，夹 `[600_000, 900_000]`） | §3.3 反事实 | 重放脚本：任何 cap 下不误杀成功 |
| 新增 `session.softDeadlineRatio` | — | `0.75` | §7.3；FailFast 的重启收益 | timeout 类 `verifierOk` 从 2/23 起 |
| `session.planTimeoutMs`（`config.js:87`） | `240_000` | **`180_000`** | plan-verdict：120s 省 12.5%，240s 只省 2.8%；且 48/161 越线说明它形同虚设 | 越线数应 ≈ `timedOut` 数 |
| planner 软截止 | — | `120_000`（发「给出当前最优计划」） | 同上 | `planMs` 分布左移 |
| `session.fallbackReserveMs`（`config.js:66`） | `0` | `90_000`（仅 `models.fallback` 非空时） | §6.3 | `modelsTried` 出现长度 2 |
| `session.minFalloverMs`（`config.js:74`） | `30_000` | 保持 | gRPC 级联预算 ≥0.8× | — |
| `session.js:182` 的 `Math.max(1000, left())` | 1s 下限照发 | 改为 `left() < minFalloverMs` 时不发 | 不可 salvage 的假 attempt | 新增 `reason:'no-budget'` 计数 |
| `models.fallback`（`config.js:44`） | `[]` | 保持 `[]`，但**删掉不可达的 firstSlice 分支**或补测试 | 0/420 使用 | 代码审查 |
| died 重试 | 无 | 新增 `session.diedRetryMs: 60_000`：`failureKind=died` 且 `durationMs < 60s` 时**原样重试一次** | 145 个 died 中位 1s | died 数应下降；重试成本 ≈ 1s |

---

## 9. 实施顺序与回滚判据

1. **先改 timer 起点**（`#one` 接受绝对 `deadline`）：零风险，让 planner 的 180s 真正生效。回滚判据：无（纯修 bug）。
2. **died 重试**：成本 1s/次，预期把 145 个名额里的一部分救回来。回滚判据：重试成功率为 0 且轮墙钟涨 >3%。
3. **780s + 软截止**：主改动。回滚判据：20 轮内 `promoted` 不升且 `durationMs` 中位数升 >10%。
4. **planner 180s**：依赖 1。回滚判据：`planUsable` 比例下降。
5. **hedge at p75**：需要先加 `patchAtMs` 埋点，测量 ≥20 轮后再决定。
6. **`fallbackReserveMs=90s`**：只在真的填了第二个模型时才有意义，最后做。

---

## 10. 我否决的提案

1. **把 salvage 扩展到 `died`。** `died` 的 145 个 attempt 里 `verifierOk` 为 0/145，patch 不存在，没有东西可验。salvage 只能救「做完了但没赶上」，不能救「根本没做」。
2. **按 campaign 把上限缩到 300s。** 省 298s（0.3%），误杀 2 个赢。见 §3.3。
3. **用首 token 延迟 / 输出速率做在线判死。** 两个原因：早期 AUROC ≤0.60（Last Step Matters）；我们**根本没有这些埋点**，加埋点的成本高于收益，而 duration-only 基线已经能拿 11.4%。
4. **训一个 FailFast 式的 0.6B monitor。** 我们没有离线轨迹库（145 个 died 是噪声不是负样本），也没有可比的 issue 文本；投产成本远超 14.6–20.4% 的 token 节省——而我们的瓶颈是墙钟不是 token。
5. **按 token 预算反推 deadline。** token 与墙钟的相关性未测量；我们的 token 几乎恒定（1500–5000），反推出来的是一个常数。见 §3.2 B。
6. **全局把 cap 提到 1800s。** 超过 600s 的只有 50 个 attempt（24 个是刚被砍在刀口上的、26 个是历史的无硬上限记录，后者 15 个成功）——支持「多一点」，不支持「多三倍」。1800s 会让每个慢失败多烧 20 分钟，而并发 2 下轮墙钟失去上界。
7. **让 agent 自己报「还需要多久」再据此调 deadline。** `budget forecasts are over-optimistic`（FailFast 引 Lin et al. 2026），我们有 9 次「跑完但空手」的 planner 也是同类证据。
8. **降低 `maxConcurrent` 让每个 attempt 更快。** 无证据；并发 2 是本机瓶颈下的吞吐来源，降到 1 只会把墙钟翻倍。

---

## 附录 A：复现脚本

全部为 PowerShell 5.1，`Invoke-Expression ([IO.File]::ReadAllText('...'))` 运行（本机禁止 `.ps1` 直接执行）。

- **A1 分布与直方图**：`%TEMP%\r3-stats.ps1`（分位、桶计数、成功率）。
- **A2 成功样本分位**：`r3-stats2.ps1`（p50/p75/p90/p95/p99、>480/540/600 计数）。
- **A3 按 kind 分账**：`r3-cap3.ps1`（输出 §1.2、§1.3 的表格；`n=420 total=97834s`）。
- **A4 cap 反事实**：`r3-cap2.ps1`（输出 §3.3 的表；`SUM saved=298s ; lostWins=2`）。
- **A5 上限执行情况**：`r3-tmo.ps1`（`with timeoutMs: 115`、`OVER_DEADLINE total=21`）。
- **A6 分带产率**：`%TEMP%\r3-bands.ps1`（输出 §1.1 第二张表；`gt374 = 103`、`gt600 = 50`）。

（`%TEMP%` = `C:\Users\Darkness\AppData\Local\Temp`；脚本即本机实测版本，未参数化。）

## 附录 B：引用清单（均 2026-11-11 读取）

1. 《Last Step Matters: Early Uncertainty Cannot Predict Failure in Long-Horizon Agents》 https://arxiv.org/pdf/2608.29685
2. 《Fail-Fast, Restart-Smart》 https://arxiv.org/pdf/2608.03222
3. 《The Handoff Tax》 https://arxiv.org/html/2608.24358v1
4. DEER（ICLR 2026） https://mlanthology.org/iclr/2026/yang2026iclr-dynamic/
5. Tail at Scale（CACM 2013-02） https://mags.acm.org/communications/201302?pm=2&u1=texterity&linkImageSrc=undefined/&pg=79 （一手 PDF 两次 404）
6. gRPC Deadlines https://grpc.org.cn/docs/guides/deadlines/
7. cordum.io《AI Agent gRPC Deadline Budgeting》 https://cordum.io/blog/ai-agent-grpc-deadline-budgeting
8. Timeout 标准（级联预算 0.8×、绝对 deadline） https://raw.githubusercontent.com/AsiaOstrich/universal-dev-standards/refs/heads/main/core/timeout-standards.md
9. TTFT 分解 https://raw.githubusercontent.com/Explorer-Dong/open-csai-wiki/main/docs/llm/serving/deployment/performance/ttft.md
10. GPT-6 Sol TTFT 实测（二手） https://apidog.com/th/blog/gpt-6-sol-time-to-first-token-latency/
11. pytorch PR #198687（55 分钟预算、`API_TIMEOUT_MS=180000`） https://github.com/pytorch/pytorch/pull/198687
12. 腾讯云自适应治理 https://cloud.tencent.com.cn/developer/article/2725408?policyId=1004
13. crucible_hedging README（P95 hedging 二手数字） https://hex.pm/packages/crucible_hedging/0.4.0/files/README.md?fallback=default

**取不到证的**：Tail at Scale 一手 PDF（404）；agent 系统按任务的墙钟 p50/p90/p99（公开文献里不存在）；「固定 vs 自适应 deadline」的直接对照实验（未找到）；BigTable 对冲数字的一手来源（二手）。
