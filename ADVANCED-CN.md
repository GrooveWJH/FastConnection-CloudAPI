# 高级指南

## 架构概览

- **单容器部署**：基于 `emqx:5.0.20` 构建镜像，并包含 Python 静态服务 + `login.html` 登录页。
- **进程管理**：`/app/start.sh` 同时启动 Python HTTP 服务与 EMQX，任一异常退出会拉停另一方。
- **网络暴露**：容器开放 EMQX 常用端口（1883/8083/8084/8883/18083）及 Web UI 端口 `WEB_BIND_PORT`，与宿主机一一映射。
- **持久化**：EMQX 的数据、日志、配置目录挂载为命名卷 (`emqx_data`、`emqx_log`、`emqx_etc`)，避免覆盖默认文件。
- **局域网探测**：`entrypoint.py` 启动时会探测容器的 IPv4，并将默认 `MQTT_TCP_URL` 设为 `tcp://<探测IP>:1883`；前端据此推导 WebSocket 地址。

## 配置解析顺序

1. 运行时环境变量（`docker-compose.yml` 或 `docker run -e ...`）。
2. 镜像内 `/app/env/.env`（仓库根目录 `.env` 拷贝）。
3. 镜像内 `/app/env/.env.example`。
4. 代码默认值（`web/entrypoint.py` 中）。

> 建议在仓库根目录维护 `.env`，修改后执行 `docker compose up -d --build` 以重建镜像。

## 环境变量说明


| 变量            | 说明                                                | 默认值                    |
| --------------- | --------------------------------------------------- | ------------------------- |
| `MQTT_TCP_URL`  | EMQX MQTT 地址，供 Cloud API 与本地客户端使用。     | `tcp://<自动探测IP>:1883` |
| `MQTT_WS_URL`   | WebSocket 入口；通常留空，由页面自动推导。          | *(空)*                    |
| `MQTT_USERNAME` | 登录页默认展示的 MQTT 用户名。                      | `admin`                   |
| `MQTT_PASSWORD` | 登录页默认展示的 MQTT 密码。                        | `public`                  |
| `MQTT_WS_PORT`  | 当`MQTT_WS_URL` 为空时，用于推导 WebSocket 的端口。 | *(空，UI 默认 8083/8084)* |
| `MQTT_WS_PATH`  | WebSocket 路径。                                    | `/mqtt`                   |
| `WEB_BIND_HOST` | Web UI 绑定的宿主机 IP。                            | `127.0.0.1`               |
| `WEB_BIND_PORT` | Web UI 监听端口（宿主机 & 容器）。                  | `3100`                    |

> 登录页支持匿名/账号两种模式，并使用 `localStorage` 记住最近的地址与凭证，后续无需重新输入。

## 构建与部署

- 任意修改（前端、Python、配置）后执行 `docker compose up -d --build` 以重建镜像。
- `.env` 建议仅保存在本机，生产环境可通过 CI/CD 注入，镜像内 `.env.example` 仅作为模板。
- 若需 TLS (`mqtts`/`wss`)，先在 EMQX 配置证书，再将 `MQTT_TCP_URL` 改为 `ssl://...` 或 `mqtts://...`，`MQTT_WS_PORT` 指向 TLS WebSocket 端口（默认 8084）。

## 数据与日志

- 使用 `docker volume inspect emqx_data` 查看数据卷详情（`emqx_log`、`emqx_etc` 同理）。
- 导出配置示例：
  ```bash
  docker compose run --rm app sh -c 'tar -C /opt/emqx/etc -cf - .' > emqx-etc.tar
  ```
- 清理所有持久化内容时执行 `docker compose down --volumes`（操作前请确认不会丢失重要数据）。

## 验证与排错

1. `docker compose ps` 确认容器为 `Up` 状态。
2. `docker compose logs app` 查看 Python 服务是否正常启动并注入配置。
3. 浏览器访问 `http://<host>:<port>`，使用“测试 MQTT”按钮或“连接”按钮观察日志是否成功。
4. 使用 MQTTX / MQTT Explorer / `mosquitto_pub/sub` 测试 EMQX 1883/8083/8084 端口连通情况。
5. 如连接失败，排查：
   - `.env` 或环境变量的 IP/端口是否正确且可达。
   - 防火墙/安全组是否放行。
   - 查看 `docker compose logs app` 与 `docker compose logs emqx`，关注认证失败或连接被拒绝的提示。

## 扩展方案

- 使用 `docker-compose.override.yml` 增加反向代理、TLS 终端、监控服务等。
- 如需自定义登录页，修改 `web/static` 下资源并重新构建镜像即可。
- 可在 `Dockerfile` 中扩展多阶段构建流程，先进行前端打包再复制产物。
