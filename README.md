# FastConnection-CloudAPI

## Use Docker run

Prefer pulling the ready-made image? Run:

```bash
docker run -d \
  --name fc-cloudapi \
  -p 3100:3100 \
  -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 \
  -e MQTT_TCP_URL=your_mqtt_url \
  groovewjh/fc-cloudapi:latest
```

## Run with Source Code

Quick start:
1. clone this repo.
2. `cp .env.example .env` (optional) to tweak MQTT settings or ports.
3. `docker compose up -d --build`
4. Visit `http://<host-ip>:3100` in your browser.

The login page auto-detects the container's LAN address and remembers your last configuration.

More details & advanced configuration: `ADVANCED.md` / `ADVANCED-CN.md`.