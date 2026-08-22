# DSH-check-token — 浮动账号余额 & 今日用量插件

在 DSH Web GUI 右下角显示 **DeepSeek API 账户余额 + 今日 API 请求次数 / Tokens 用量** 的浮动徽章插件。

## 功能特性

- 浮动徽章实时显示余额，默认每 60 秒自动刷新，点击徽章打开/关闭详情面板
- **详情面板**（今日用量）：
  - **API 请求次数**、**Tokens 数量**（纯数字、千分位分隔）
  - 数据优先来自 **DeepSeek 平台官方用量接口**（platform.deepseek.com），失败时自动回退本地会话计数，面板日期旁标注数据来源（平台 / 平台+本地 / 本地）
  - 面板日期旁出现 **⚠** 时悬停可看平台接口的具体失败原因（HTTP 状态 / 原始响应样本）
- **自适应弹出方向**：徽章在窗口下半部 → 面板向上弹出；拖到上半部 → 自动改为向下弹出
- **字体大小五级可调**：面板内 5 档「A」按钮（小→大），选择持久化到 `localStorage`，徽章与面板同步缩放
- **可拖动**：按住徽章任意位置即可移动，视口边界自动钳制（距边缘 8px），拖动后单击仍可开面板
- **位置记忆**：拖动位置存入 `localStorage`（`dsh-check-token-pos`），刷新后恢复；窗口缩放自动钳回视口
- 悬停显示明细：各币种充值/赠送余额与账户可用状态
- 安全：API Key / 平台令牌只存在服务端凭据层，浏览器端经本地 `/api/*` 读取，不暴露凭据、无 CORS

## 文件结构

| 文件 | 作用 |
|---|---|
| `package.json` | 插件清单；`dsh.client.platform: "web"` 声明浏览器端，`exports["./client"]` 指向客户端 bundle |
| `lib/index.js` | 宿主端（Node）：余额接口、平台用量接口（含本地计数兜底与持久化）、`/api/account-balance` 与 `/api/account-stats` 路由 |
| `lib/client.js` | 浏览器端（web 插件 bundle）：注入 `shell.overlay` 槽位，渲染可拖动/可缩放徽章与自适应详情面板 |
| `install.ps1` | 一键安装脚本（建链接、登记依赖、写 patch 条目），幂等可重复运行 |

## 工作原理

```
浏览器端浮标 ──轮询──▶ /api/account-balance ──▶ 余额：api.deepseek.com/user/balance
                └──▶ /api/account-stats  ──▶ 用量：platform.deepseek.com/api/v0/usage/by_api_key/amount
                                              （Bearer 平台令牌 + start/end/tz + x-client-* 头）
                                              │ 失败时回退：本地 session/event 计数
```

- 宿主端通过 `ctx.webServer.register({kind: "exact", path: ...})` 挂载路由（精确路由优先于 `/api` 前缀的 RPC 桥）
- 用量统计双通道：
  1. **平台通道（首选）**：`GET https://platform.deepseek.com/api/v0/usage/by_api_key/amount?start=<UTC 日对齐>&end=<...>&tz=<时区秒>`，响应为按 API Key/模型的 `buckets[]`（逐日/逐小时桶），解析 `usage` 中的 `RESPONSE_TOKEN` / `PROMPT_CACHE_HIT_TOKEN` / `PROMPT_CACHE_MISS_TOKEN`（Tokens）与 `REQUEST`（请求数），按本地日期过滤当日
  2. **本地兜底**：订阅全局 `session/event`，`request/header` 计数请求、`assistant/message` 的 usage 累计 Tokens，持久化到 `$DSH_HOME/storages/check-token-daily.json`
- 浏览器端插件注册进 `shell.overlay` 槽位（`dsh-client-ui-layout` 的 AppFrame 浮层），随 shell 常驻

## 安装

推荐直接运行 `install.ps1`（幂等，已完成的步骤自动跳过）：

```powershell
.\install.ps1                          # 默认安装到 $env:USERPROFILE\.dsh\profiles\web
.\install.ps1 -ProfileDir "D:\dsh\profiles\web"   # 指定 profile
```

或手动三步：

1. 将本目录链接进 profile 的 `node_modules`（bare 包名解析需要）：

   ```powershell
   New-Item -ItemType Junction -Path "<profile>\node_modules\DSH-check-token" `
     -Target "<profile>\plugins\DSH-check-token"
   ```

2. 在 profile 的 `package.json` dependencies 登记（保证后续 `pnpm install` 保留该包）：

   ```json
   "DSH-check-token": "file:plugins/DSH-check-token"
   ```

3. 在 profile 的 `cordis.patch.yml` 插入条目（`watchUserPatches` 实时监听，宿主端热挂载）：

   ```yaml
   - insert:
       - id: account-balance
         name: DSH-check-token
   ```

**注意**：首次安装后浏览器需 **F5** 挂载前端插件；`lib/client.js` 的改动经 client-HMR 自动热更新，但 **`lib/index.js`（宿主端）的改动必须重启 dsh web 服务**（Node ESM 模块缓存不会热加载）。

## 数据来源与配置

| 项 | 说明 |
|---|---|
| 余额凭据 | `ctx.credentials.resolve("DEEPSEEK_API_KEY")`：`$DSH_HOME/.credentials.yaml` 的 `refs` 下 → `.env` → 环境变量 |
| 平台用量凭据 | `DEEPSEEK_PLATFORM_TOKEN`：登录 platform.deepseek.com 后从浏览器 Network 的 `Authorization: Bearer <token>` 获取，写入 `$DSH_HOME/.credentials.yaml` 的 `refs` 下（文件热重载，改完无需重启） |
| 平台接口 | `GET https://platform.deepseek.com/api/v0/usage/by_api_key/amount`，参数 `start`/`end`（**UTC 零点对齐**的 epoch 秒，窗口自动覆盖完整本地日）、`tz`（时区秒，自动计算），头：`Authorization: Bearer <token>` + `x-client-bundle-id: com.deepseek.chat` / `x-client-locale` / `x-client-platform: web` / `x-client-version` |
| 免重启调参 | `$DSH_HOME/storages/check-token-platform.json`（可选）：`{url, method, query, body, headers}` 覆盖请求；query 支持 `"utcDay"`（展开为 UTC 日窗口）与 `"now"` |
| 余额接口 | `GET https://api.deepseek.com/user/balance`，`Authorization: Bearer <key>`。官方文档：<https://api-docs.deepseek.com/api/get-user-balance/> |
| 环境变量 | `DEEPSEEK_BASE_URL`（余额 base）、`DEEPSEEK_PLATFORM_USAGE_URL`（平台接口地址）可覆盖默认 |
| 刷新间隔 | `lib/client.js` 中 `POLL_INTERVAL_MS`（默认 60000ms） |

## 接口约定

### `GET /api/account-balance` → `200 application/json`

成功：

```json
{
  "ok": true,
  "is_available": true,
  "balance_infos": [
    { "currency": "CNY", "total_balance": "43.03", "granted_balance": "0.00", "topped_up_balance": "43.03" }
  ]
}
```

失败：`{ "ok": false, "error": "DEEPSEEK_API_KEY 未配置（请在设置中填写 DeepSeek API Key）", "detail": "..." }`

### `GET /api/account-stats` → `200 application/json`

```json
{
  "ok": true,
  "date": "2026-08-22",
  "requests": 213,
  "tokens": 84004450,
  "source": "platform",
  "platformError": "可选：平台接口失败详情（⚠ 悬停显示）",
  "platformSample": "可选：平台接口原始响应样本（前 3000 字符，用于排障）"
}
```

- `source`：`platform`（全部来自平台）/ `mixed`（Tokens 平台、请求数本地）/ `local`（全部本地兜底）
- 平台失败时字段不缺失，前端自动回退本地计数并标注来源

## 卸载

1. 删除 `cordis.patch.yml` 中的 `account-balance` 条目，宿主端立即卸载路由
2. （可选）删除 `plugins/DSH-check-token` 目录、`node_modules\DSH-check-token` 链接、profile `package.json` 中的依赖登记、`$DSH_HOME/storages/check-token-daily.json` 与 `check-token-platform.json`

## 版本记录

- **v1.02**：详情面板自适应上下弹出；今日请求数/Tokens 接入平台官方用量接口（`by_api_key/amount`），含本地兜底与来源标注；平台令牌支持；免重启调参配置
- **v1.01**：单击打开今日用量面板（本地计数）、五级字号、可拖动
- **v1.00**：浮动余额徽章（原 dsh-plugin-balance，因与 npm 同名包冲突改名）
