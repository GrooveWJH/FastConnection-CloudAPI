#!/bin/bash
# 导出多架构镜像为离线 tar 文件

set -e

VERSION="${1:-latest}"
IMAGE_NAME="${2:-groovewjh/fc-cloudapi}"

echo "==========================================="
echo "  导出离线镜像包"
echo "==========================================="
echo "镜像名称: ${IMAGE_NAME}:${VERSION}"
echo "==========================================="
echo ""

# 检查 buildx
if ! docker buildx version &> /dev/null; then
    echo "❌ 错误: Docker Buildx 未安装"
    exit 1
fi

# 使用 buildx builder
docker buildx use multiarch-builder 2>/dev/null || true

echo "[1/3] 导出 linux/amd64 镜像..."
docker buildx build \
    --platform linux/amd64 \
    --output type=docker,dest=fc-cloudapi-amd64.tar \
    --tag "${IMAGE_NAME}:${VERSION}" \
    .
echo "✓ 已导出: fc-cloudapi-amd64.tar"
echo ""

echo "[2/3] 导出 linux/arm64 镜像..."
docker buildx build \
    --platform linux/arm64 \
    --output type=docker,dest=fc-cloudapi-arm64.tar \
    --tag "${IMAGE_NAME}:${VERSION}" \
    .
echo "✓ 已导出: fc-cloudapi-arm64.tar"
echo ""

echo "[3/3] 导出 EMQX 基础镜像..."
docker pull --platform linux/amd64 emqx:5.0.20 2>/dev/null || true
docker pull --platform linux/arm64 emqx:5.0.20 2>/dev/null || true

docker save -o emqx-5.0.20-amd64.tar emqx:5.0.20
docker tag emqx:5.0.20 emqx-arm64:5.0.20 2>/dev/null || true
docker save -o emqx-5.0.20-arm64.tar emqx-arm64:5.0.20
echo "✓ 已导出 EMQX 镜像"
echo ""

echo "==========================================="
echo "  ✅ 离线镜像已生成！"
echo "==========================================="
echo ""
echo "生成的文件:"
echo "  • fc-cloudapi-amd64.tar      ($(du -h fc-cloudapi-amd64.tar 2>/dev/null | cut -f1 || echo '?'))"
echo "  • fc-cloudapi-arm64.tar      ($(du -h fc-cloudapi-arm64.tar 2>/dev/null | cut -f1 || echo '?'))"
echo "  • emqx-5.0.20-amd64.tar      ($(du -h emqx-5.0.20-amd64.tar 2>/dev/null | cut -f1 || echo '?'))"
echo "  • emqx-5.0.20-arm64.tar      ($(du -h emqx-5.0.20-arm64.tar 2>/dev/null | cut -f1 || echo '?'))"
echo ""
echo "使用方法:"
echo ""
echo "【Linux x86_64 / Windows】"
echo "  docker load -i emqx-5.0.20-amd64.tar"
echo "  docker load -i fc-cloudapi-amd64.tar"
echo "  docker-compose up -d"
echo ""
echo "【Linux ARM64 / macOS Apple Silicon】"
echo "  docker load -i emqx-5.0.20-arm64.tar"
echo "  docker load -i fc-cloudapi-arm64.tar"
echo "  docker-compose up -d"
echo "==========================================="
