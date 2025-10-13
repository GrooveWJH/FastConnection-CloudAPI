# Advanced Guide / 高级指南

## Architecture Overview · 架构概览
- **Single container**: Image builds on `emqx:5.0.20`, installs Python, and bundles `login.html`.
- **Process supervision**: `/app/start.sh` launches the Python HTTP server (`web/entrypoint.py`) alongside EMQX, shutting down both if either exits.
- **Networking**: Container exposes EMQX ports (1883/8083/8084/8883/18083) plus the web UI listening on `WEB_BIND_PORT`（容器与宿主机使用同一端口映射）。
- **Persistence**: EMQX data, log, and configuration directories persist in Docker named volumes (`emqx_data`, `emqx_log`, `emqx_etc`), avoiding accidental overwrite of bundled defaults.
 - **LAN auto-detection**: `entrypoint.py` probes the container's LAN IPv4 when it starts and sets `MQTT_TCP_URL` 默认为 `tcp://<detect-ip>:1883`，浏览器端再根据该地址推导 WebSocket URL。

## Configuration Resolution · 配置解析顺序
1. **Runtime environment variables** passed through `docker-compose.yml`.
2. **`.env` inside the image** (copied from the project root during build).
3. **`.env.example` inside the image** as a fallback.
4. **Hard-coded defaults** in `web/entrypoint.py` (`tcp://127.0.0.1:1883`, `admin/public`, etc.).

> 推荐在项目根目录维护 `.env` 并在调整配置后执行 `docker compose up -d --build`，以确保新镜像包含最新示例或默认值。

## Environment Variables · 环境变量说明

| Variable | Description | 默认值 |
| -------- | ----------- | ------ |
| `MQTT_TCP_URL` | Broker address used by native MQTT clients and DJI bridge. | `tcp://<detected-LAN-ip>:1883` |
| `MQTT_WS_URL` | Explicit WebSocket endpoint exposed to the browser (usually leave blank and let UI derive). | *(empty)* |
| `MQTT_USERNAME` | EMQX username presented to the browser client. | `admin` |
| `MQTT_PASSWORD` | EMQX password presented to the browser client. | `public` |
| `MQTT_WS_PORT` | Port hint for auto-deriving WebSocket URL when `MQTT_WS_URL` 留空. | `8083` |
| `MQTT_WS_PATH` | WebSocket path segment. | `/mqtt` |
| `WEB_BIND_HOST` | Host interface mapping the web UI (e.g. `127.0.0.1`, `0.0.0.0`, or LAN IP). | `127.0.0.1` |
| `WEB_BIND_PORT` | Port used by both the container’s HTTP server and the host mapping. | `3100` |

> 如果宿主机同时拥有公网与内网地址，可以通过 `WEB_BIND_HOST` 指定监听接口，以控制外部访问路径。

> 浏览器端登录页可随时切换匿名/账号密码两种模式，以便在修改 EMQX 默认凭证后立即使用新账号连接。

## Build & Deployment Notes · 构建与部署提示
- 任何变更（HTML、Python、环境文件）后执行 `docker compose up -d --build`，以确保镜像重建并包含最新内容。
- 登录页面支持在匿名与账号密码模式间切换；默认凭证由 `.env` 提供，浏览器会记住最近一次输入的地址和凭证，后续打开无需再改。
- 在生产环境中可将 `.env` 放置在安全位置，并通过 CI/CD 注入。镜像内置的 `.env.example` 仅作为模板。
- 若需要使用 TLS (`mqtts`/`wss`)，在 EMQX 中配置证书后，将 `MQTT_TCP_URL` 设置为 `ssl://...` 或 `mqtts://...`，并将 `MQTT_WS_PORT` 调整为 TLS WebSocket 端口（默认 8084）。

## Data & Logs · 数据与日志
- `docker volume inspect emqx_data`：查看数据卷细节（同理适用于 `emqx_log`、`emqx_etc`）。
- 若需在宿主机访问配置，可通过 `docker compose run --rm app sh -c 'tar -C /opt/emqx/etc -cf - .' > emqx-etc.tar` 导出，再解压修改后绑定。
- 要清理所有持久化内容时使用 `docker compose down --volumes`，操作前请确认不会丢失重要数据。

## Verification & Troubleshooting · 验证与排错
1. `docker compose ps` 确认容器处于 `Up` 状态。
2. `docker compose logs app` 查看配置生成是否成功（日志应显示 HTTP server 启动且无异常）。
3. 浏览器访问 `http://<host>:<port>`，页面顶部显示当前 MQTT 参数，并在“登录”操作后输出连接日志。
4. 使用 MQTTX、MQTT Explorer 或 `mosquitto_pub/sub` 测试 EMQX 1883/8083/8084 端口，验证消息收发。
5. 若浏览器无法连接，排查：
   - `.env` 是否正确指向宿主机在相应网络下可达的 IP/域名。
   - 防火墙、NAT 或安全组是否开放对应端口。
   - EMQX 日志中是否有认证失败或连接拒绝记录。

## Extending the Stack · 扩展方案
- 通过 `docker-compose.override.yml` 增加反向代理、TLS 终端或监控等附加服务。
- 若需要不同的登录页面版本，可在 `web/login.html` 中引入版本参数，然后重建镜像。
- 可在 `Dockerfile` 中加入多阶段构建，先执行前端打包再复制产物。

---

以上内容涵盖常见高级使用场景与排错流程，可根据业务需求进一步扩展。
