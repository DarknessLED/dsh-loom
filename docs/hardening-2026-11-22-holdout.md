# 一个"读反了"的纠正，和它后面那个真缺陷（2026-11-22）

这一篇只记一件事：我在研究读记里把一处门禁的方向写反了，怎么发现的、纠正后剩下什么、以及为什么这一类错误比"没读"更值得写下来。

## 我原来写了什么

`directions/r1-verifier.reading.md` 的第 1 条原本是这样：agent 在报告里列一个文件名，就能让一个本该被复查的空补丁跳过 holdout，依据是 `src/runtime/round.js` 里的

```js
const claimedWork = Array.isArray(best?.report?.changed) && best.report.changed.length > 0
const skipHoldout = checks.noop && !claimedWork
```

## 它为什么是错的

`skipHoldout` 要成立，需要 `checks.noop` 为真**且** `!claimedWork` 为真。agent 声称改了文件 → `claimedWork` 真 → `!claimedWork` 假 → `skipHoldout` 假 → **holdout 照跑**。这个标记让门禁更严，不是更松。

代码里那句注释说的也是这个意思：「a candidate that verified with no captured diff but reports changed files is a capture problem… so the holdout still applies」。我读到了注释，却把它读成了相反的行为——这是把 `&&` 的第二个条件的方向搞反，而不是漏读了什么。

历史也对得上：这个分支来自 `051dd96`（2026-11-09，`loom-noop` 第 1 轮），当时引入它的目的就是收紧而不是放松；`8f2def9`（11-11）又在它前面加了"同一条命令不算第二意见"的分支。

## 怎么发现的

在给研究结论做"读代码确认"这一步时，我要把这句话变成一个可测试的断言，于是写 `tests/balance/holdout-claim.test.mjs`：构造一个"零字节改动 + 报告说改了 `src/somewhere.js`"的尝试，断言 holdout 跑了。第一次跑就失败了（`holdoutRuns` 是 0）——但失败原因不是门禁，是我自己的报告 fixture 不合契约（`evidence` 写成了字符串，报告校验不通过，于是 `report` 为 `null`）。把 fixture 改成 `evidence: ['the verifier passes']` 之后断言通过，方向得到确认。

这个"跑一次就红、红了才发现是 fixture"的过程本身值得记：**如果我只读代码不写断言，我会带着一个方向相反的说法继续做后面的规划。**

## 纠正之后剩下的真问题

方向是对的，但"claiming work"不是这条规则唯一读的东西——它读的是 `!claimedWork`，而 `claimedWork` 在**报告缺失**时也是假。于是：

- 报告合法且 `changed: []` → 跳过 holdout。可辩护：没有新字节可查。
- 报告合法且 `changed: ['x']` → holdout 照跑。正确。
- **报告缺失或校验失败** → `claimedWork` 假 → **跳过 holdout**。这是把"没回答"当成了"什么都没改"。

账本上的规模（138 个 campaign、883 次尝试）：

| 项 | 数量 |
| --- | --- |
| 报告校验失败的尝试 | 403 |
| 其中零字节改动 | 188 |
| 其中最终以 no-op 晋升 | 7 |
| 有 holdout 池且 no-op 晋升的轮 | 9 |
| 这些轮里 holdout 真的跑了的 | 3 |

也就是说这条路径**从未被真实触发过**（那 7 次 no-op 都在 holdout 池为空的 campaign 里），但规则本身是错的：一个从不回话的 worker 可以绕过唯一的独立检查。6 次 no-op 晋升里 holdout 被跳过的那几轮（`loom-holdout-live` r1/r2、`loom-self10` r2、`loom-self13` r2、`loom-tri13` r3、`loom-triangle` r3）报告都是合法的空报告，属于可辩护的那一类。

## 改了什么

`src/runtime/round.js:2440` 起：

```js
const statedNoWork = Boolean(best?.report) && Array.isArray(best.report.changed) && best.report.changed.length === 0
const skipHoldout = checks.noop && statedNoWork
```

即：只有**合法且明确为空**的报告才跳过。沉默不再算数。

规格（都先红后绿）：

- `tests/balance/holdout-claim.test.mjs`（1 条）：声称改了文件 → holdout 跑。这条钉的是方向，防止我再把它读反。
- `tests/balance/holdout-silent.test.mjs`（2 条）：没有合法报告 → holdout 跑；合法空报告 → 仍然跳过且照常晋升。
- `tests/balance/holdout-noop.test.mjs` 的 fixture 也顺带修了：它的 `evidence` 一直是字符串，报告从未通过校验，所以这条 2026-11-09 就存在的规格**一直在测试"沉默"这条路径**，只是当时没人知道。修好 fixture 后才真正测到它自称要测的东西。
- 两条新规格都 pin 进了 `scripts/test-all.mjs`（`holdout-noop` 之后）。

全量：**306/306 suites passed**。

## 一条方法上的教训

"读代码确认"不等于读代码。我读了那两行、读了注释、还查了历史，仍然把方向搞反；把它写成断言、跑一次，十秒就暴露了。研究笔记里的"读代码确认的缺陷"这个标签本身是有毒的——它让人以为读过就算数。以后凡是要写进结论的代码判断，都要有一条能失败的断言。

至于这个缺陷值多少钱：它在账本里从未触发，所以修它不是修一个正在漏的洞，是修一条会把沉默当证据的规则。这类修改没有可观测的收益，只有"以后不会以这种方式错"——这也是为什么它必须由一条规格钉住，而不是靠注释。
