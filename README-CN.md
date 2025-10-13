# FastConnection-CloudAPI

## 使用 Docker 运行

已有构建好的镜像，可直接运行：

```bash
docker run -d \
  --name fc-cloudapi \
  -p 3100:3100 \
  -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 \
  groovewjh/fc-cloudapi:latest
```

## 使用源码运行

快速开始：

1. 克隆该仓库。
2. `cp .env.example .env`（可选）用于调整 MQTT 参数或端口。
3. `docker compose up -d --build`
4. 在浏览器访问 `http://<宿主机IP>:3100`。

登录页会自动探测容器的局域网地址，并记住你上一次输入的配置。

更多细节与高级配置：`ADVANCED.md` / `ADVANCED-CN.md`。
