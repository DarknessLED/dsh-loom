import io

p = r'C:\Projects\RSI\research\dsh-plugin-api.md'
s = io.open(p, encoding='utf-8').read()


def rep(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b, 1)


rep(r'''```jsonc
// C:\Users\Darkness\.dsh\profiles\desktop\package.json
{
  "dependencies": { "dsh-rsi-loop": "file:C:/Projects/RSI/research/skeleton" },
  "dsh": { "profile": { "bundles": [ /* 4 个核心 bundle */ ..., "dsh-rsi-loop" ] } }
}
```
然后在 profile 目录跑 pnpm（`node pnpm.mjs install`）。改动被 `dsh-hmr` 监听，HMR 开启时自动重载。''',
r'''改 `C:\Users\Darkness\.dsh\profiles\desktop\package.json`：`dependencies` 加 `"dsh-rsi-loop": "file:C:/Projects/RSI/research/skeleton"`，`dsh.profile.bundles[]` 末尾追加 `"dsh-rsi-loop"`，然后在 profile 目录跑 `node pnpm.mjs install`。改动被 `dsh-hmr` 监听，HMR 开启时自动重载。''')

rep(r'''```
PASS  export apply(ctx, config)
PASS  export inject = ["tools"]
PASS  tool rsi_status registered (rsi_status, rsi_control)
PASS  parameters 是合法 JSON Schema
PASS  非法参数 throw（宿主会转成 isError 结果）
PASS  ticker 推进 ticks=4
PASS  state.json 已写入 …\state.json
PASS  budget 熔断 ticks=2 running=false
PASS  dispose 后 ticker 已停（ticks 冻结在 4）
PASS  重启后从磁盘恢复 ticks=4 running=true
PASS  目录缺失时 apply + tick 会重新创建 state.json
```''',
r'''覆盖：导出形状 / `inject` / 两个工具注册 / `parameters` 是合法 JSON Schema / 非法参数 throw / ticker 真的推进（`ticks=4`）/ `state.json` 落盘 / budget 熔断（`ticks=2, running=false`）/ dispose 后 ticker 冻结 / 重启从磁盘恢复 / 目录缺失时自建。''')

rep(r'''- `inject` 用于声明**硬依赖**；软依赖用 `ctx.get('tools')` 并判空。**【事实】**
- `Config` 依赖 schemastery，而包名在 DSH 版本间有 `schemastery` / `@deepseek-ai/schemastery` 两种形态 → blender 用**运行期动态解析 + 降级**，静态 `import` 会直接 `ERR_MODULE_NOT_FOUND` 让插件整体消失。**【事实】**
- `apply` 里**同步 throw 只会产生一条警告**，插件静默不工作 → 一定要自己 try/catch 并打日志。**【事实，app-boot README 失败模式表】**''',
r'''- `inject` = **硬依赖**；软依赖用 `ctx.get('tools')` 并判空。**【事实】**
- `Config` 依赖 schemastery，包名在 DSH 版本间有 `schemastery` / `@deepseek-ai/schemastery` 两形态 → blender 用**运行期动态解析 + 降级**；静态 `import` 会 `ERR_MODULE_NOT_FOUND` 让插件整体消失。**【事实】**
- `apply` 里**同步 throw 只产生一条警告**，插件静默不工作 → 必须自己 try/catch 并打日志。**【事实】**''')

rep(r'''关键点：**主 agent 回合永不被阻塞**（`prompt` 是 admission ack），UI 里能看到后台会话在自己的侧栏条目里跑；插件重载后靠 `state.json` + `sessionId` 恢复（`sessionController.prompt` 会自动 resume）。''',
r'''关键点：**主 agent 回合永不被阻塞**（`prompt` 只回 admission ack），后台会话在 UI 侧栏有自己的条目；插件重载后靠 `state.json` + `sessionId` 恢复（`prompt` 会自动 resume）。''')

rep(r'''- 插件宿主模块由 Electron 主进程的 Node 直接 `import`——证据：插件里直接 `os.homedir()`、`process.env`、`child_process.spawn`、`fs` 无任何注入；失败模式文档说未捕获 rejection 会让**应用以非零码退出**（只有同进程才可能）。**【推断，证据强】**''',
r'''- 插件宿主模块由 Electron 主进程的 Node 直接 `import`。证据：插件里直接 `os.homedir()` / `process.env` / `child_process.spawn` / `fs`，无任何注入；且未捕获 rejection 会让**应用以非零码退出**。**【推断，证据强】**''')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print(len(s.splitlines()))
