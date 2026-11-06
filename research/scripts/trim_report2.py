import io

p = r'C:\Projects\RSI\research\dsh-plugin-api.md'
s = io.open(p, encoding='utf-8').read()


def rep(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b, 1)


# §6.3 状态布局：3 行代码块 → 1 行
rep(r'''  ```
  ~/.dsh/rsi-loop/state.json        运行态（ticks/预算/上次错误）
  ~/.dsh/rsi-loop/candidates.jsonl  候选池（追加写）
  ~/.dsh/rsi-loop/sessions.json     后台会话 id 映射
  ```''',
r'''  ```
  ~/.dsh/rsi-loop/{state.json, candidates.jsonl, sessions.json}   # 运行态 / 候选池(追加写) / 会话映射
  ```''')

# §4.4 四条编号 → 两行
rep(r'''1. `ctx.agents.currentInitiator(): Agent | undefined`（工具回调之外通常是 undefined）
2. `ctx.agents.create(options) / ctx.agents.get(id) / ctx.agents.roots()`
3. `ctx.sessionController.create({cwd})` → `resolveAgent(sessionId)` → `{ agent }`
4. `ctx.agentLoop.create(id)` 返回 `Promise<Agent>`''',
r'''- `ctx.agents.currentInitiator(): Agent | undefined`（工具回调之外通常是 undefined）；`ctx.agents.create(options)` / `get(id)` / `roots()`
- `ctx.sessionController.create({cwd})` → `resolveAgent(sessionId)` → `{ agent }`；或 `ctx.agentLoop.create(id): Promise<Agent>`''')

# §7.3 mount 代码块压缩
rep(r'''```js
window.__ModuleLoader__.load({ id: "dsh-rsi-loop", chunk: "client.js", factory: u => {
  const React = u("react")
  function mount(ctx) {          // ctx = client 侧 cordis ctx（有 effect / slots / locale / logger）
    ctx.effect(() => () => { /* 清理 */ }, "rsi: panel")
    return function Panel() { return React.createElement("div", null, "RSI") }
  }
  return { mount }
}})
```''',
r'''```js
window.__ModuleLoader__.load({ id: "dsh-rsi-loop", chunk: "client.js", factory: u => {
  const React = u("react")
  function mount(ctx) {   // ctx = client 侧 cordis ctx（有 effect / slots / locale / logger）
    ctx.effect(() => () => { /* 清理 */ }, "rsi: panel")
    return () => React.createElement("div", null, "RSI")
  }
  return { mount } })''')

# §6.4 四条 → 三条
rep(r'''4. `app-boot/config-reload` 事件 = 配置热重载完成，可在此时重读 state。''',
r'''4. `app-boot/config-reload` = 配置热重载完成，可此时重读 state。''')

# §9.3 四条步骤 → 三条
rep(r'''3. 让模型调 `rsi_status` / `rsi_control({action:"start"})`；检查 `~/.dsh/rsi-loop/state.json` 里 `ticks` 在涨。
4. 反证检查：`cordis_inspect_query(platform="host", provider="Tool", method="listTools")` 应能看到这两个工具。''',
r'''3. 让模型调 `rsi_status` / `rsi_control({action:"start"})`，确认 `~/.dsh/rsi-loop/state.json` 里 `ticks` 在涨；并用 `cordis_inspect_query(platform="host", provider="Tool", method="listTools")` 反证工具已注册。''')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print(len(s.splitlines()))
