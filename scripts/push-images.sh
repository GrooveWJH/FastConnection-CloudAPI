#!/bin/bash
# 推送多架构镜像到 Docker Hub

set -e

VERSION="${1:-latest}"
IMAGE_NAME="${2:-groovewjh/fc-cloudapi}"

echo "==========================================="
echo "  推送镜像到仓库"
echo "==========================================="
echo "镜像名称: ${IMAGE_NAME}:${VERSION}"
echo "==========================================="
echo ""

# 检查是否已登录（通过检查 ~/.docker/config.json）
if [ ! -f ~/.docker/config.json ] || ! grep -q "auths" ~/.docker/config.json 2>/dev/null; then
    echo "❌ 错误: 未登录 Docker Hub"
    echo ""
    echo "请先登录:"
    echo "  docker login"
    exit 1
fi

# 检查 buildx
if ! docker buildx version &> /dev/null; then
    echo "❌ 错误: Docker Buildx 未安装"
    exit 1
fi

# 使用 buildx builder
docker buildx use multiarch-builder 2>/dev/null || {
    echo "⚠️  multiarch-builder 不存在，请先运行:"
    echo "  ./scripts/build-multiarch.sh"
    exit 1
}

# 构建并推送多架构镜像
echo "正在构建并推送多架构镜像..."
echo "支持架构: linux/amd64, linux/arm64"
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --tag "${IMAGE_NAME}:latest" \
    --cache-from type=registry,ref="${IMAGE_NAME}:buildcache" \
    --cache-to type=registry,ref="${IMAGE_NAME}:buildcache",mode=max \
    --push \
    .

echo ""
echo "==========================================="
echo "  ✅ 推送完成！"
echo "==========================================="
echo ""
echo "用户使用方法（所有平台通用）:"
echo "  docker run -d \\"
echo "    --name fc-cloudapi \\"
echo "    --network host \\"
echo "    ${IMAGE_NAME}:${VERSION}"
echo ""
echo "Docker 会自动选择匹配的架构:"
echo "  • x86_64 系统 → amd64 版本"
echo "  • ARM64 系统 → arm64 版本"
echo "==========================================="
