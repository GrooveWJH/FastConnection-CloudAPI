# FastConnection-CloudAPI

## 使用 Docker 运行

已有构建好的镜像，可直接运行：

```bash
docker run -d \
  --name fc-cloudapi \
  --network host \
  groovewjh/fc-cloudapi:latest
```

**注意**：`--network host` 仅在 Linux 上有效。在 Linux 系统上，登录页会自动检测并预填充局域网 IP 地址。在 macOS/Windows 上，需要在网页界面手动输入 IP 地址。

**容器管理：**

```bash
# 停止容器
docker stop fc-cloudapi

# 重启容器（离线环境下可用）
docker start fc-cloudapi

# 查看日志
docker logs fc-cloudapi

# 删除容器
docker rm fc-cloudapi
```

## 使用源码运行

快速开始：

1. 克隆该仓库。
2. `cp .env.example .env`（可选）用于调整 MQTT 参数或端口。
3. `docker compose up -d --build`
4. 在浏览器访问 `http://<宿主机IP>:3100`。

**自动 IP 检测（仅 Linux）**：在 Linux 系统上，登录页会自动探测容器的局域网地址。在 macOS/Windows 上，需要在网页界面手动配置 MQTT 服务器 IP。

登录页会记住你上一次输入的配置。

## 文档

- **[ADVANCED.md](ADVANCED.md)** / **[ADVANCED-CN.md](ADVANCED-CN.md)** - 高级配置
- **[BUILD.md](BUILD.md)** - 多架构构建指南
- **[README.md](../README.md)** - 英文文档
