#!/bin/bash
# 多架构 Docker 镜像构建脚本
# 支持: Linux x86_64 (amd64), Linux ARM64, Windows x86_64 (via WSL2/Docker Desktop)

set -e

# 默认值
VERSION="latest"
IMAGE_NAME="groovewjh/fc-cloudapi"
AUTO_PUSH=false

# 解析参数
for arg in "$@"; do
    case $arg in
        --push)
            AUTO_PUSH=true
            ;;
        -h|--help)
            show_help() {
                cat << EOF
使用方法:
  $0 [VERSION] [IMAGE_NAME] [--push]

参数:
  VERSION      镜像版本号 (默认: latest)
  IMAGE_NAME   镜像名称 (默认: groovewjh/fc-cloudapi)
  --push       构建完成后自动推送到仓库

示例:
  # 构建镜像（不推送）
  $0

  # 构建指定版本
  $0 v1.0.0

  # 构建并自动推送
  $0 v1.0.0 --push

  # 构建、指定镜像名并推送
  $0 v1.0.0 myusername/fc-cloudapi --push

EOF
                exit 0
            }
            show_help
            ;;
        *)
            if [ "$VERSION" = "latest" ]; then
                VERSION="$arg"
            elif [ "$IMAGE_NAME" = "groovewjh/fc-cloudapi" ]; then
                IMAGE_NAME="$arg"
            fi
            ;;
    esac
done

echo "==========================================="
echo "  FastConnection CloudAPI"
echo "  多架构镜像构建"
echo "==========================================="
echo "镜像名称: ${IMAGE_NAME}:${VERSION}"
echo "支持平台: linux/amd64, linux/arm64"
echo "==========================================="
echo ""

# 检查 buildx
if ! docker buildx version &> /dev/null; then
    echo "❌ 错误: Docker Buildx 未安装"
    echo ""
    echo "安装方法:"
    echo "  macOS:   brew install docker-buildx"
    echo "  Linux:   apt install docker-buildx-plugin"
    echo "  或访问: https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

# 创建/使用 buildx builder
echo "[1/2] 配置构建器..."

# 如果 builder 已存在但有问题，先删除
if docker buildx ls | grep -q multiarch-builder; then
    echo "检测到现有 builder，尝试使用..."
    if ! docker buildx use multiarch-builder 2>/dev/null; then
        echo "⚠ 现有 builder 无法使用，删除并重新创建..."
        docker buildx rm multiarch-builder 2>/dev/null || true
        docker buildx create --name multiarch-builder --use --bootstrap
        echo "✓ 已重新创建 multiarch-builder"
    else
        echo "✓ 使用现有 multiarch-builder"
    fi
else
    docker buildx create --name multiarch-builder --use --bootstrap
    echo "✓ 已创建 multiarch-builder"
fi
echo ""

# 构建多架构镜像（仅缓存，不输出）
echo "[2/2] 构建多架构镜像..."
echo ""
echo "ℹ️  构建多架构镜像并缓存（不加载到本地 Docker）"
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${IMAGE_NAME}:${VERSION}" \
    --tag "${IMAGE_NAME}:latest" \
    --cache-to type=inline \
    .

echo ""
echo "==========================================="
echo "  ✅ 构建完成！"
echo "==========================================="
echo ""

# 如果指定了 --push 参数，自动推送
if [ "$AUTO_PUSH" = true ]; then
    echo "🚀 检测到 --push 参数，开始推送镜像..."
    echo ""

    # 调用推送脚本
    ./scripts/push-images.sh "$VERSION" "$IMAGE_NAME"

    exit 0
fi

echo "镜像信息:"
echo "  • 名称: ${IMAGE_NAME}:${VERSION}"
echo "  • 架构: linux/amd64, linux/arm64"
echo "  • 状态: 已构建并缓存在 buildx"
echo ""
echo "💡 说明:"
echo "  多架构镜像已构建完成，但未加载到本地 Docker"
echo "  因为 Docker 的 --load 参数不支持多架构镜像"
echo ""
echo "后续操作:"
echo ""
echo "1️⃣  推送到仓库供所有用户使用 (推荐):"
echo "   docker login"
echo "   ./scripts/push-images.sh ${VERSION} ${IMAGE_NAME}"
echo "   # 或者重新运行: $0 ${VERSION} ${IMAGE_NAME} --push"
echo ""
echo "2️⃣  导出为离线包 (离线部署):"
echo "   ./scripts/export-images.sh ${VERSION} ${IMAGE_NAME}"
echo ""
echo "3️⃣  本地测试 (仅构建当前架构 $(uname -m)):"
echo "   docker-compose up -d --build"
echo ""
echo "==========================================="



