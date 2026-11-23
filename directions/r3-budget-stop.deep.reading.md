## 读完这八篇正文之后，我认为什么变了

**1. 我一直在说"successive halving"，但我们做的不是 successive halving。**
1603.06560（Hyperband）§3 把 SH 的定义写得很硬：给定**总保真预算 B**，初始 n 个配置，每轮保留 1/η，**预算在配置之间重新分配**，直到单个配置吃满 R。我们的 screen 是"先花一小笔把候选筛掉一半，剩下的照原样跑"，**没有任何一步把被筛掉的那半的预算还给幸存者**。所以我们的 screen 只省了钱，没买到"幸存者被更深地评估"——这是 SH 与"预筛"的本质区别。

**2. η 是算法参数，不是"减半"这个常数。**
同篇 §3.2：Hyperband 的两个输入是 R（单配置最大资源）与 η（每轮淘汰比例），两者共同决定 bracket 数 s_max+1。我们 `keepRatio: 0.5` 写死在 config 里，等于把 η 钉死在 2，且从未把 R 当成参数——我们的"资源"是步数/回合，没有上限概念。

**3. 保真度（fidelity）必须单调。**
2107.05847 §4.2.4：fidelity HP λ_fid 是**单调影响计算成本**的一个超参，MF 方法的全部合法性建立在这个单调性上。我们的 `screen.cmd` 与完整 verify 是**两个不同的命令**，没有任何证据说明 screen 通过率与最终 killRate 单调相关——如果不单调，SH 的理论保证不成立，省钱就是运气。

**4. 低保真度的结论会被高保真度推翻，BOHB 明确处理了这件事。**
1807.01774 §4.1：*BOHB always uses the model for the largest budget for which enough observations are available … This enables it to overcome wrong conclusions drawn on smaller budgets*。我们的 screen 一旦淘汰就不再回看，等于把"小预算的错结论"永久固化。

**5. ASHA 的两条改进正好对应我们缺的两件事。**
1810.05934 §3.3 说 ASHA 相对 SHA 改了两点：把有限/无限视界统一，以及**不晋升已经跑完的配置**。我们第二轮起会把上一轮幸存者重新当候选排队，正是它说要避免的重复投入。

**6. 早停的收益在"资源稀缺"时才显出来，这是被量过的。**
1802.01548 §Conclusion：*evolution had somewhat faster search speed and stood out in the regime of scarcer resources / early stopping*。这给我们的 21% 一个正确的读法：**在有预算约束的档位，早停的收益大；在富裕档位几乎为零**。我们那两场对比恰好一场在紧档、一场不在，所以 21% 不是"halving 的收益"，是"紧档下的收益"。

**7. 早停该不该停，是个没有好答案的开放问题。**
2107.05847 §6.5 直说 *Choosing an appropriate budget for HPO or dynamically terminating HPO based on collected archive data is a difficult practical challenge that is not readily solved*，然后列了"拍一个运行时长"这类原始做法。我们的 `budgetRounds` 就是它列的第一种。

## 三条我会改的

1. **把 screen 改成真正的 SH：把被淘汰候选的剩余预算还给幸存者。** 现在 screen 只在轮首跑一次（`round.js` 的 screening 段），改成多档（screen → 半程 → 完整），每档淘汰比例 η 可配，才是 Hyperband 的内循环。
2. **给 screen 与 verify 之间加一条单调性检查。** 在有过 screen 的轮里，记 `screen 通过率` 与 `最终 killRate` 的秩相关；相关系数掉到阈值以下就**关掉 halving 并报警**，因为理论前提没了。
3. **引入 R（单配置最大资源）作为显式参数**，让 η 与 R 共同决定档数，而不是把 keepRatio 写死。

## 这份调研没回答的三件事

1. **非平稳的 arm。** HPO 里每个配置的好坏是固定的，我们的候选是 LLM 生成的、彼此不同质的，"哪个配置更好"本身带模型方差；SH 的理论假设里没有这一项。
2. **screen 的成本该记在哪。** 三篇都把 screen 当作"便宜的部分"不再讨论；我们 screen 也是真实计费（`docs/l2-state.md` 记过 $0.0750），但文献里没有"筛选开销计入总预算后还划不划算"的判据。
3. **我们的"资源"是什么。** HPO 的资源是 epoch/样本，单调可分；我们的资源是"一轮 agent 的步数"，中途截断的 agent 输出与完整跑完的输出不是同一个东西，保真度单调性在这里最可疑。
