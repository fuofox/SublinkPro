# 机场订阅管理

SublinkPro 提供了完善的机场订阅管理功能，不仅能将订阅转换为节点，还能全方位监控和管理您的机场服务。

---

## 💡 核心功能

| 功能 | 说明 |
|:---|:---|
| **📥 多格式导入** | 支持 Clash/mihomo、V2Ray 订阅格式的自动解析与导入；Mieru 仅支持 Clash/mihomo YAML |
| **⏱️ 智能定时更新** | 内置 Crontab 级调度器，支持按时间间隔或 Cron 表达式自动更新订阅，确保节点时刻在线 |
| **📊 流量用量监控** | 自动解析订阅返回的 `Subscription-Userinfo` 头，直观展示**已用上传**、**已用下载**、**总流量**及**过期时间** |
| **🚀 立即更新机制** | 支持一键「立即拉取」，配合实时回调机制，无需刷新页面即可看到最新的流量数据和节点列表 |
| **🤖 Bot 集成管理** | 通过 Telegram Bot 可随时查询各订阅的剩余流量、到期时间，并支持远程触发更新任务 |

### VLESS / XHTTP 兼容说明

- 机场订阅导入现已支持 `vless://` 链接中的 `type=xhttp`。
- 当上游订阅是 Clash / mihomo YAML 且节点为 `type: vless`、`network: xhttp` 时，系统会识别 `xhttp-opts` 并回写为 VLESS URL。
- 当前已支持的 URL 顶层字段包括：`type`、`path`、`host`、`mode`、`extra`、`ech`。
- `extra` 中已支持映射到 mihomo 的字段包括：`headers`、`noGRPCHeader`、`xPaddingBytes`、`downloadSettings` 及其已知子字段。
- 顶层 `ech` 会优先映射到 mihomo 顶层 `ech-opts`：当值是固定 base64 ECHConfig 时写入 `config`，当值是 Xray 的 DNS / URI 风格时会按 mihomo 可表达的范围做最佳努力映射。
- 当机场订阅本身是 Clash/mihomo YAML，且导入时只能从顶层 `ech-opts` 恢复出 `query-server-name` 时，系统会在保存节点链接前按本地兼容规则重建为 `ech=<query-server-name>+https://dns.alidns.com/dns-query`。
- `extra.downloadSettings.echOpts` 仍只映射到 mihomo `xhttp-opts.download-settings.ech-opts`，不会和顶层 `ech-opts` 混写。
- `xmux`、`sessionPlacement` 等在 Xray 侧存在但 mihomo 当前没有公开承载字段的扩展项，会被视为未支持，不会静默降级成 `http`、`h2` 或 `grpc`。

### Mieru 兼容说明

- 机场订阅导入支持 Clash/mihomo YAML 中的 `type: mieru` 节点，并保留 mihomo 官方字段：`server`、`port` 或 `port-range`、`transport`、`username`、`password`、`multiplexing`、`traffic-pattern`。
- Mieru 官方存在 `mieru://` / `mierus://` 分享链接，但未定义适合 SublinkPro 原始编辑器逐字段修改的通用 URL schema。系统保存节点时使用内部可编辑形态 `mieru://username:password@server:port?...#name`，端口范围使用 `portRange=2090-2099`，用于 Clash/mihomo YAML 导入后的回写与后续导出。
- Mieru 不会输出到 v2ray 或 Surge；这些客户端当前不在 SublinkPro 的 Mieru 支持范围内。

---

## 📱 界面展示

系统在订阅列表中清晰展示了每个机场的详细状态，包括：
- 上次更新时间
- 下次计划更新时间
- 可视化的流量进度条

让您对机场使用情况一目了然。

---

## 使用流程

### 添加机场订阅

1. 进入「机场管理」页面
2. 点击「添加机场」
3. 填写订阅链接和名称
4. 按需配置请求设置（如 User-Agent、自定义 Header、代理下载）
5. 配置更新策略（可选）
6. 保存并拉取节点

### 节点处理：名称唯一化

在机场编辑弹窗的「节点处理（拉取时生效）」中，可使用“节点名称唯一化”相关配置：

- **节点名称唯一化**：为当前机场导入的节点统一添加稳定前缀，用于避免不同机场之间出现重名节点。
- **机场内节点名称唯一化**：在同一机场内如果存在重名节点，会在当前节点名称后依次追加 `-1`、`-2`、`-3` 等数字编号。

说明：

- 两个开关都在**拉取订阅时生效**，修改后需要重新拉取该机场才能应用到已存在节点。
- 机场间前缀唯一化与机场内顺序编号可以同时开启；此时系统会先生成机场前缀，再对同机场内的重名节点追加 `-1`、`-2`… 数字编号。
- 机场内顺序编号也可以单独开启；单独开启时不会添加机场前缀，只会在同机场的重名节点后追加数字编号。
- 编号是**按重名组分别计算**的，不是全机场共享一套连续序号；例如 `HK` 重名组会得到 `HK-1`、`HK-2`，而 `US` 重名组会单独从 `US-1` 开始。

### 请求设置

机场的「请求设置」支持配置拉取订阅时附带的请求参数：

- `User-Agent`：使用专用输入框设置常见客户端 UA 或手动输入。
- **自定义 Header**：可按 `Header 名称` + `Header 值` 的方式添加多条请求头，适合需要额外鉴权或来源标识的机场。
- `使用代理下载`：通过指定节点或自动选择最佳节点拉取订阅。

说明：

- 自定义 Header 会在请求机场订阅地址时一并附带。
- 如果开启了「获取用量信息」，系统在刷新机场用量时也会复用相同的自定义 Header。
- `User-Agent` 使用单独字段管理，自定义 Header 中不支持再次填写 `User-Agent`。

### 配置定时更新

支持两种定时更新方式：

| 方式 | 说明 |
|:---|:---|
| **按间隔更新** | 设置固定时间间隔，如每 6 小时更新一次 |
| **Cron 表达式** | 灵活的 Cron 表达式配置，如 `0 */6 * * *` |

### 流量监控

系统自动解析订阅响应头中的 `Subscription-Userinfo`，提取以下信息：
- `upload`：已用上传流量
- `download`：已用下载流量
- `total`：总流量额度
- `expire`：到期时间戳

---

## Telegram Bot 集成

通过 Telegram Bot 可以：
- 查询各机场剩余流量
- 查看到期时间
- 远程触发订阅更新

详见 [Telegram 机器人文档](telegram-bot.md)
