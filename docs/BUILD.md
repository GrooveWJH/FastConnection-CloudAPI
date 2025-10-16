# 多架构构建说明

## 🎯 构建目标

支持 **2个架构 × 3个系统**：
- **架构**: linux/amd64, linux/arm64
- **系统**: Linux (x86_64/ARM64), macOS (Apple Silicon), Windows (x86_64 via WSL2)

## 📦 三种使用方式

### 方式 1：构建镜像（本地测试）

**适用场景**：开发调试，本地测试镜像功能

```bash
# 构建多架构镜像到本地 Docker
./scripts/build-multiarch.sh [VERSION] [IMAGE_NAME]

# 示例：构建默认版本 (latest)
./scripts/build-multiarch.sh

# 示例：构建指定版本
./scripts/build-multiarch.sh v1.0.0

# 示例：构建自定义镜像名
./scripts/build-multiarch.sh latest myusername/fc-cloudapi
```

**构建结果**：
- ✅ 镜像已加载到本地 Docker
- ✅ 支持 linux/amd64 和 linux/arm64
- ✅ 可立即使用 `docker run` 测试

**本地测试**：
```bash
docker run -d \
  --name fc-cloudapi \
  --network host \
  groovewjh/fc-cloudapi:latest
```

---

### 方式 2：推送到 Docker Hub（在线分发）

**适用场景**：在线环境，用户可以直接 `docker pull` 拉取镜像

```bash
# 1. 登录 Docker Hub
docker login

# 2. 构建镜像
./scripts/build-multiarch.sh v1.0.0 groovewjh/fc-cloudapi

# 3. 推送到仓库
./scripts/push-images.sh v1.0.0 groovewjh/fc-cloudapi
```

**用户使用（所有平台通用）：**
```bash
docker run -d \
  --name fc-cloudapi \
  --network host \
  groovewjh/fc-cloudapi:latest

# Docker 自动选择匹配架构：
# • x86_64 系统 → amd64 版本
# • ARM64 系统 → arm64 版本
```

**优势**：
- ✅ **用户体验最佳**：一条命令拉取正确镜像
- ✅ **自动架构选择**：Docker 自动匹配系统架构
- ✅ **统一镜像名**：所有平台使用相同的镜像名

---

### 方式 3：导出为 tar 文件（离线场景）

**适用场景**：离线环境，需要手动分发镜像文件

```bash
# 导出离线镜像包
./scripts/export-images.sh [VERSION] [IMAGE_NAME]

# 示例：导出默认版本
./scripts/export-images.sh

# 示例：导出指定版本
./scripts/export-images.sh v1.0.0 groovewjh/fc-cloudapi
```

生成 4 个文件：
- `fc-cloudapi-amd64.tar` - 应用镜像 (Intel/AMD)
- `fc-cloudapi-arm64.tar` - 应用镜像 (ARM)
- `emqx-5.0.20-amd64.tar` - EMQX 基础镜像 (Intel/AMD)
- `emqx-5.0.20-arm64.tar` - EMQX 基础镜像 (ARM)

**部署镜像：**

**Linux x86_64 / Windows (WSL2/Docker Desktop)**
```bash
docker load -i emqx-5.0.20-amd64.tar
docker load -i fc-cloudapi-amd64.tar
docker compose up -d
```

**Linux ARM64 / macOS Apple Silicon**
```bash
docker load -i emqx-5.0.20-arm64.tar
docker load -i fc-cloudapi-arm64.tar
docker compose up -d
```

**优势**：
- ✅ **完全离线**：无需网络连接
- ✅ **灵活分发**：按需分发对应架构
- ⚠️ **.tar 文件较大**：每个约 400-500MB
- ⚠️ **需手动选择**：用户需知道自己的系统架构

---

## 🔧 脚本详细说明

### build-multiarch.sh

**功能**：构建多架构镜像并加载到本地 Docker

**参数**：
- `VERSION` (可选): 镜像版本号，默认 `latest`
- `IMAGE_NAME` (可选): 镜像名称，默认 `groovewjh/fc-cloudapi`

**示例**：
```bash
./scripts/build-multiarch.sh
./scripts/build-multiarch.sh v1.0.0
./scripts/build-multiarch.sh latest myusername/fc-cloudapi
```

**输出**：
- 镜像已加载到本地 Docker
- 标签: `IMAGE_NAME:VERSION` 和 `IMAGE_NAME:latest`
- 支持架构: linux/amd64, linux/arm64

**后续操作**：
- 本地测试: `docker run`
- 推送仓库: `./scripts/push-images.sh`
- 导出离线: `./scripts/export-images.sh`

---

### push-images.sh

**功能**：推送多架构镜像到 Docker 仓库

**前置条件**：
- 已执行 `./scripts/build-multiarch.sh` 构建镜像
- 已执行 `docker login` 登录仓库

**参数**：
- `VERSION` (可选): 镜像版本号，默认 `latest`
- `IMAGE_NAME` (可选): 镜像名称，默认 `groovewjh/fc-cloudapi`

**示例**：
```bash
# 登录 Docker Hub
docker login

# 推送镜像
./scripts/push-images.sh v1.0.0 groovewjh/fc-cloudapi
```

**输出**：
- 推送 `IMAGE_NAME:VERSION`
- 推送 `IMAGE_NAME:latest`
- 包含所有架构 (linux/amd64, linux/arm64)

**用户使用**：
```bash
docker run -d --name fc-cloudapi --network host IMAGE_NAME:VERSION
```

---

### export-images.sh

**功能**：导出多架构镜像为离线 tar 文件

**参数**：
- `VERSION` (可选): 镜像版本号，默认 `latest`
- `IMAGE_NAME` (可选): 镜像名称，默认 `groovewjh/fc-cloudapi`

**示例**：
```bash
./scripts/export-images.sh v1.0.0 groovewjh/fc-cloudapi
```

**生成文件**：
- `fc-cloudapi-amd64.tar` - 应用镜像 (x86_64)
- `fc-cloudapi-arm64.tar` - 应用镜像 (ARM64)
- `emqx-5.0.20-amd64.tar` - EMQX 基础镜像 (x86_64)
- `emqx-5.0.20-arm64.tar` - EMQX 基础镜像 (ARM64)

**部署方法**：
```bash
# x86_64 系统
docker load -i emqx-5.0.20-amd64.tar
docker load -i fc-cloudapi-amd64.tar

# ARM64 系统
docker load -i emqx-5.0.20-arm64.tar
docker load -i fc-cloudapi-arm64.tar

# 启动
docker compose up -d
```

---

## ✨ 自动化特性

启动后自动完成：
1. 检测系统架构
2. 检测局域网 IP
3. 生成配置文件 `config.js`
4. 启动 Web 服务 (端口 3100)
5. 浏览器访问时自动填充 IP 地址

---

## 📝 完整工作流示例

### 开发流程（本地测试 → 推送仓库）

```bash
# 1. 构建多架构镜像
./scripts/build-multiarch.sh v1.0.0

# 2. 本地测试
docker run -d \
  --name fc-cloudapi-test \
  --network host \
  groovewjh/fc-cloudapi:v1.0.0

# 3. 访问测试
curl http://localhost:3100

# 4. 测试通过后清理
docker stop fc-cloudapi-test
docker rm fc-cloudapi-test

# 5. 登录 Docker Hub
docker login

# 6. 推送到仓库
./scripts/push-images.sh v1.0.0
```

---

### 离线部署流程（导出 → 分发 → 加载）

```bash
# 开发机器：导出镜像
./scripts/export-images.sh v1.0.0

# 生成文件（约 1.5-2GB）：
# - fc-cloudapi-amd64.tar
# - fc-cloudapi-arm64.tar
# - emqx-5.0.20-amd64.tar
# - emqx-5.0.20-arm64.tar

# 目标机器 (x86_64)：加载镜像
docker load -i emqx-5.0.20-amd64.tar
docker load -i fc-cloudapi-amd64.tar
docker compose up -d

# 目标机器 (ARM64)：加载镜像
docker load -i emqx-5.0.20-arm64.tar
docker load -i fc-cloudapi-arm64.tar
docker compose up -d
```

---

## 📊 对比总结

| 方式 | 适用场景 | 用户命令复杂度 | 文件大小 | 网络需求 |
|------|---------|---------------|---------|---------|
| **推送仓库** | 在线环境 | ⭐⭐⭐⭐⭐ (一条命令) | 无本地文件 | 需要网络 |
| **导出 tar** | 离线环境 | ⭐⭐⭐ (需选架构) | 1.5-2GB | 完全离线 |
| **本地构建** | 开发测试 | ⭐⭐⭐⭐ (简单测试) | 无导出文件 | 构建时需网络 |

---

## 💡 最佳实践

1. **开发/测试环境**：使用推送模式，快速迭代
2. **生产/离线环境**：使用导出模式，提前准备好镜像文件
3. **镜像命名**：使用语义化版本号（如 `v1.0.0`）而非 `latest`
4. **分发策略**：只给用户提供对应架构的 tar 文件，避免混淆

---

## 📖 参考

- [Docker Multi-platform images](https://docs.docker.com/build/building/multi-platform/)
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
