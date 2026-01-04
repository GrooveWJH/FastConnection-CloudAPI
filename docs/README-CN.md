# FastConnection-CloudAPI

[![GitHub release](https://img.shields.io/github/v/release/groovewjh/FastConnection-CloudAPI?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/groovewjh/fc-cloudapi?style=flat-square)](https://hub.docker.com/r/groovewjh/fc-cloudapi)
[![License](https://img.shields.io/github/license/groovewjh/FastConnection-CloudAPI?style=flat-square)](LICENSE)
[![平台](https://img.shields.io/badge/平台-Linux%20%7C%20macOS%20%7C%20Windows-blue?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI)
[![架构](https://img.shields.io/badge/架构-amd64%20%7C%20arm64-green?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI)

[![English Docs](https://img.shields.io/badge/docs-English-blue?style=flat-square)](../README.md)

---

## 使用 Docker 运行

**快速启动（推荐）：**

**Linux：**
```bash
docker rm -f fc-cloudapi 2>/dev/null; docker run -d --name fc-cloudapi --restart unless-stopped --network host -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**macOS：**
```bash
docker rm -f fc-cloudapi 2>/dev/null; docker run -d --name fc-cloudapi --restart unless-stopped -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**Windows (PowerShell)：**
```powershell
docker rm -f fc-cloudapi 2>$null; docker run -d --name fc-cloudapi --restart unless-stopped -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**Windows (CMD)：**
```cmd
docker rm -f fc-cloudapi 2>nul & docker run -d --name fc-cloudapi --restart unless-stopped -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**强制更新（当有新版本时）：**

**Linux：**
```bash
docker rm -f fc-cloudapi 2>/dev/null; docker run -d --pull always --name fc-cloudapi --network host -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**macOS：**
```bash
docker rm -f fc-cloudapi 2>/dev/null; docker run -d --pull always --name fc-cloudapi -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**Windows (PowerShell)：**
```powershell
docker rm -f fc-cloudapi 2>$null; docker run -d --pull always --name fc-cloudapi -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

**Windows (CMD)：**
```cmd
docker rm -f fc-cloudapi 2>nul & docker run -d --pull always --name fc-cloudapi -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 -v fc-emqx-data:/opt/emqx/data -v fc-emqx-log:/opt/emqx/log -v fc-emqx-etc:/opt/emqx/etc groovewjh/fc-cloudapi:latest
```

> **提示**：日常使用快速启动命令即可。只有在需要强制更新到最新版本时才添加 `--pull always` 参数。

**平台说明：**

- **Linux**：支持 `--network host`，登录页会自动检测并预填充局域网 IP 地址。
- **macOS**：不支持 `--network host`，需使用端口映射 (`-p`)，并在网页界面手动输入 IP 地址。
- **Windows**：不支持 `--network host`，需使用端口映射 (`-p`)。Docker Desktop 会自动转发端口到 Windows 主机，可在 Windows 浏览器中访问 `http://localhost:3100`。
- **数据持久化**：以上命令使用 Docker 命名卷（`fc-emqx-data`、`fc-emqx-log`、`fc-emqx-etc`）持久化 EMQX 数据，删除/重建容器不会丢失配置。

**端口说明：**

- **端口 3100**：Web 界面，供 DJI 遥控器通过浏览器访问
- **端口 18083**：EMQX 管理面板，供本机访问（管理后台）
- **端口 1883, 8083, 8084, 8883**：MQTT 服务端口

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

**macOS/Windows 提醒**：请确保 Docker Desktop 设置为开机自启动，这样系统登录后容器才能自动恢复。

**更新到最新版本：**

```bash
# 停止并删除旧容器
docker stop fc-cloudapi
docker rm fc-cloudapi

# 拉取最新镜像
docker pull groovewjh/fc-cloudapi:latest

# 使用新镜像重新创建容器
# Linux：
docker run -d --name fc-cloudapi --network host groovewjh/fc-cloudapi:latest

# macOS/Windows：
docker run -d --name fc-cloudapi -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 groovewjh/fc-cloudapi:latest
```

> **注意**：`docker start` 使用的是已有的容器镜像。要获取最新更新，必须拉取新镜像并重新创建容器。

## 使用源码运行

快速开始：

1. 克隆该仓库。
2. Linux：
   `docker compose up -d --build`
3. macOS：
   `docker compose -f docker-compose.yml -f docker-compose.macos.yml up -d --build`
4. 在浏览器访问 `http://<宿主机IP>:3100`。

**自动 IP 检测（仅 Linux）**：在 Linux 系统上，登录页会自动探测容器的局域网地址。在 macOS/Windows 上，需要在网页界面手动配置 MQTT 服务器 IP。

登录页会记住你上一次输入的配置。

## 文档

- **[ADVANCED.md](ADVANCED.md)** / **[ADVANCED-CN.md](ADVANCED-CN.md)** - 高级配置
- **[BUILD.md](BUILD.md)** - 多架构构建指南
- **[README.md](../README.md)** - 英文文档

## 许可

本项目采用 **GNU Affero 通用公共许可证 v3.0 (AGPLv3)** 进行许可。

这意味着您可以自由使用、修改和分发本软件。但如果您在网络上运行本软件以提供服务，您必须将修改后版本的源代码向用户提供。

如果您的商业应用场景无法满足 AGPLv3 的条款（例如，您不希望开源您的衍生产品），我们提供商业许可。请通过邮件联系 [groovewjh@foxmail.com](mailto:groovewjh@foxmail.com) 以获取更多信息。
