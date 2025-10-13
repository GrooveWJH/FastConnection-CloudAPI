# FastConnection-CloudAPI

使用 Docker 快速启动 EMQX 与登录页面（`login.html`）的最简方案。

## 快速开始

- **环境要求**：Docker Engine ≥ 20.10，Docker Compose Plugin ≥ 2.0。
- **可选配置**：执行 `cp .env.example .env` 并根据需求修改 MQTT 信息或网页监听地址（`WEB_BIND_PORT` 同时决定容器与宿主机的网页端口）。
- **运行服务**：`docker compose up -d --build`（构建并运行单一容器，内含 EMQX 与网页）。
- **访问页面**：`http://<WEB_BIND_HOST 或宿主机IP>:<WEB_BIND_PORT>`，默认 `http://localhost:3100`，同时会暴露 EMQX 相关端口（1883/8083/8084/8883/18083）。页面会自动填入容器检测到的局域网 IP，并记住上次输入的地址与凭证。
- **登录界面配置**：页面可一处填写 MQTT 地址（自动同步 TCP/WS）并选择匿名/账号密码，默认值来自 `.env` 及上次使用的值，可随时调整后再发起连接。
- **停止服务**：`docker compose down`（如需清理持久化数据，可追加 `--volumes`，会清空 EMQX 使用的命名卷）。

高级配置、运行原理与排错说明请查看 `ADVANCED.md` 与 `ADVANCED-CN.md`。

## 发布镜像到 Docker 仓库

1. 构建镜像（将 `yourname/fastconnection-cloudapi` 换成你的仓库路径）：
   ```bash
   docker build -t yourname/fastconnection-cloudapi:latest .
   ```
2. （可选）再打一个版本标签：
   ```bash
   docker tag yourname/fastconnection-cloudapi:latest yourname/fastconnection-cloudapi:v1.0.0
   ```
3. 登录并推送：
   ```bash
   docker login
   docker push yourname/fastconnection-cloudapi:latest
   # docker push yourname/fastconnection-cloudapi:v1.0.0
   ```

### 让其他用户一键运行

其它用户只需安装 Docker，即可执行：

```bash
docker run -d \
  --name fastconnection-cloudapi \
  -p 3100:3100 \
  -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 \
  yourname/fastconnection-cloudapi:latest
```

如需覆盖默认参数可追加 `-e MQTT_TCP_URL=...` 等环境变量，或挂载 `/opt/emqx` 目录持久化数据。
