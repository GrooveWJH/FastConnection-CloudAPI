# FastConnection-CloudAPI

[![GitHub release](https://img.shields.io/github/v/release/groovewjh/FastConnection-CloudAPI?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/groovewjh/fc-cloudapi?style=flat-square)](https://hub.docker.com/r/groovewjh/fc-cloudapi)
[![License](https://img.shields.io/github/license/groovewjh/FastConnection-CloudAPI?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI)
[![Architecture](https://img.shields.io/badge/arch-amd64%20%7C%20arm64-green?style=flat-square)](https://github.com/groovewjh/FastConnection-CloudAPI)

[![中文文档](https://img.shields.io/badge/文档-中文-blue?style=flat-square)](docs/README-CN.md)

---

## Use Docker run

Prefer pulling the ready-made image? Run:

**Linux:**

```bash
docker run -d \
  --name fc-cloudapi \
  --network host \
  groovewjh/fc-cloudapi:latest
```

**macOS/Windows:**

```bash
docker run -d --name fc-cloudapi -p 3100:3100 -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 groovewjh/fc-cloudapi:latest
```

**Platform Notes:**

- **Linux**: `--network host` works. The login page will auto-detect and pre-fill the LAN IP address.
- **macOS/Windows**: `--network host` is not supported. Use port mappings (`-p`) instead. You need to manually enter the IP address in the web interface.
- **Windows**: Docker Desktop automatically forwards ports to Windows host, so you can access `http://localhost:3100` from Windows browsers.

**Managing the container:**

```bash
# Stop the container
docker stop fc-cloudapi

# Restart the container (works offline)
docker start fc-cloudapi

# View logs
docker logs fc-cloudapi

# Remove the container
docker rm fc-cloudapi
```

## Run with Source Code

Quick start:

1. clone this repo.
2. `cp .env.example .env` (optional) to tweak MQTT settings or ports.
3. `docker compose up -d --build`
4. Visit `http://<host-ip>:3100` in your browser.

**Auto IP Detection (Linux only)**: On Linux systems, the login page will automatically detect the container's LAN address. On macOS/Windows, you need to manually configure the MQTT server IP in the web interface.

The login page remembers your last configuration.

## Documentation

- **[ADVANCED.md](docs/ADVANCED.md)** / **[ADVANCED-CN.md](docs/ADVANCED-CN.md)** - Advanced configuration
- **[BUILD.md](docs/BUILD.md)** - Multi-architecture build guide
- **[README-CN.md](docs/README-CN.md)** - Chinese documentation
