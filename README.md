# FastConnection-CloudAPI

## Use Docker run

Prefer pulling the ready-made image? Run:

```bash
docker run -d \
  --name fc-cloudapi \
  --network host \
  groovewjh/fc-cloudapi:latest
```

**Note**: `--network host` only works on Linux. The login page will auto-detect and pre-fill the LAN IP address on Linux hosts. On macOS/Windows, you need to manually enter the IP address in the web interface.

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
