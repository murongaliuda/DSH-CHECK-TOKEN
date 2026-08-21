# DSH-check-token — 浮动账号余额插件

在 DSH Web GUI 右下角显示 **DeepSeek API 账户余额** 的浮动徽章插件。

## 功能特性

- 浮动徽章实时显示余额，默认每 60 秒自动刷新，**点击立即刷新**
- **可拖动**：按住徽章任意位置即可移动，视口边界自动钳制（距边缘 8px）
- **位置记忆**：拖动位置存入 `localStorage`（`dsh-balance-pos`），刷新页面后恢复；窗口缩放自动钳回视口
- 悬停显示明细：各币种充值/赠送余额与账户可用状态
- 未配置 Key 或请求失败时显示红点「余额 --」和错误原因
- 安全：API Key 只存在服务端凭据层，浏览器端经 `/api/account-balance` 读取，不暴露 Key、无 CORS

## 文件结构

| 文件 | 作用 |
|---|---|
| `package.json` | 插件清单；`dsh.client.platform: "web"` 声明浏览器端，`exports["./client"]` 指向客户端 bundle |
| `lib/index.js` | 宿主端（Node）：解析 `DEEPSEEK_API_KEY` 凭据，调用 DeepSeek 官方余额接口，注册 `GET /api/account-balance` |
| `lib/client.js` | 浏览器端（web 插件 bundle）：注入 `shell.overlay` 槽位，渲染可拖动浮标并轮询接口 |

## 工作原理

```
浏览器端浮标 ──轮询 GET /api/account-balance──▶ 宿主端
                                              │ ctx.credentials.resolve("DEEPSEEK_API_KEY")
                                              ▼
                        GET https://api.deepseek.com/user/balance
                        (Authorization: Bearer <key>)
```

- 宿主端通过 `ctx.webServer.register({kind: "exact", path: "/api/account-balance"})` 挂载路由（精确路由优先于 `/api` 前缀的 RPC 桥）
- 浏览器端插件注册进 `shell.overlay` 槽位（`dsh-client-ui-layout` 的 AppFrame 浮层，`z-index:20`、子元素可交互），随 shell 常驻

## 安装（本机 web profile 已完成）

1. 将本目录链接进 profile 的 `node_modules`（bare 包名解析需要）：

   ```powershell
   New-Item -ItemType Junction -Path "C:\Users\xxyy\.dsh\profiles\web\node_modules\DSH-check-token" `
     -Target "C:\Users\xxyy\.dsh\profiles\web\plugins\DSH-check-token"
   ```

2. 在 profile 的 `package.json` dependencies 登记（保证后续 `pnpm install` 保留该包）：

   ```json
   "DSH-check-token": "file:plugins/DSH-check-token"
   ```

3. 在 profile 的 `cordis.patch.yml` 插入条目——该文件被 `watchUserPatches` 实时监听，**宿主端无需重启**即可热挂载：

   ```yaml
   - insert:
       - id: account-balance
         name: DSH-check-token
   ```

4. 首次添加时浏览器需 **刷新页面（F5）** 才会挂载新的前端插件（`__DSH_BOOT__` 清单重新注入）；之后修改 `lib/client.js` 会经 client-HMR（`/plugins/events` SSE）自动热更新，无需刷新。

## 数据来源与配置

| 项 | 说明 |
|---|---|
| 凭据 | `ctx.credentials.resolve("DEEPSEEK_API_KEY")`，来源依次为：`$DSH_HOME/.credentials.yaml` → 项目/用户 `.env` → 环境变量（也可在设置页 Models 中管理） |
| 余额接口 | `GET https://api.deepseek.com/user/balance`，`Authorization: Bearer <key>`。官方文档：<https://api-docs.deepseek.com/api/get-user-balance/> |
| 可选环境变量 | `DEEPSEEK_BASE_URL` 可覆盖默认 base URL |
| 刷新间隔 | `lib/client.js` 中 `POLL_INTERVAL_MS`（默认 60000ms） |

## 接口约定

`GET /api/account-balance` → `200 application/json`

成功：

```json
{
  "ok": true,
  "is_available": true,
  "balance_infos": [
    {
      "currency": "CNY",
      "total_balance": "49.53",
      "granted_balance": "0.00",
      "topped_up_balance": "49.53"
    }
  ]
}
```

失败：

```json
{ "ok": false, "error": "DEEPSEEK_API_KEY 未配置（请在设置中填写 DeepSeek API Key）", "detail": "..." }
```

## 卸载

1. 删除 `cordis.patch.yml` 中的 `account-balance` 条目（恢复 `[]`），宿主端立即卸载路由
2. （可选）删除 `plugins/DSH-check-token` 目录、`node_modules\DSH-check-token` 链接、profile `package.json` 中的依赖登记
