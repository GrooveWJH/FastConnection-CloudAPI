# FastConnection-CloudAPI

Minimal Docker setup that launches an EMQX broker together with the `login.html` web client.

## Quick Start

- **Prerequisites**: Docker Engine ≥ 20.10 and Docker Compose Plugin ≥ 2.0.
- **Configure (optional)**: `cp .env.example .env` and adjust MQTT credentials, host bindings, or page settings（`WEB_BIND_PORT` 同时决定容器和宿主机的网页端口）。
- **Run**: `docker compose up -d --build` (builds a single container running EMQX + web UI).
- **Open**: `http://<WEB_BIND_HOST or host IP>:<WEB_BIND_PORT>` (defaults to `http://localhost:3100`; EMQX ports 1883/8083/8084/8883/18083 are also exposed)。登陆页默认填入容器检测到的局域网 IP，并会记住你上次输入的地址和凭证。
- **Adjust endpoints & credentials**: On the login page ，一次填写 MQTT 地址即可同步 TCP/WS，并选择匿名或账号密码；默认值来自 `.env` 及上次输入，随时可覆盖。
- **Stop**: `docker compose down` (append `--volumes` to clear persisted EMQX data stored in named volumes).

For advanced configuration, runtime details, and troubleshooting see `ADVANCED.md`. The Chinese version of this quick guide is available in `README-CN.md`.

## Publish to Docker Registry

1. Build the production image (replace `yourname/fastconnection-cloudapi` with your registry path):
   ```bash
   docker build -t yourname/fastconnection-cloudapi:latest .
   ```
2. (Optional) Tag another version:
   ```bash
   docker tag yourname/fastconnection-cloudapi:latest yourname/fastconnection-cloudapi:v1.0.0
   ```
3. Login and push:
   ```bash
   docker login
   docker push yourname/fastconnection-cloudapi:latest
   # docker push yourname/fastconnection-cloudapi:v1.0.0
   ```

### One-line run for users

Other users only need Docker installed:

```bash
docker run -d \
  --name fastconnection-cloudapi \
  -p 3100:3100 \
  -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 -p 18083:18083 \
  yourname/fastconnection-cloudapi:latest
```

They can override defaults with `-e MQTT_TCP_URL=...` etc., or mount `/opt/emqx` volumes if needed.
