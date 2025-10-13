# Advanced Guide

## Architecture Overview

- **Single-container deployment**: The image extends `emqx:5.0.20` and bundles the Python static server plus `login.html`.
- **Process supervision**: `/app/start.sh` starts the Python HTTP server (`web/entrypoint.py`) and EMQX together; if either process exits, the other is stopped as well.
- **Networking**: EMQX ports (1883/8083/8084/8883/18083) and the web UI port `WEB_BIND_PORT` are exposed one-to-one to the host.
- **Persistence**: EMQX data, log, and config directories are mounted as named volumes (`emqx_data`, `emqx_log`, `emqx_etc`) to avoid overwriting bundled defaults.
- **LAN discovery**: `entrypoint.py` detects the container’s IPv4 address at startup and sets `MQTT_TCP_URL` to `tcp://<detected-ip>:1883`; the front end derives the WebSocket endpoint from this value.

## Configuration Resolution Order

1. Runtime environment variables (`docker-compose.yml` or `docker run -e ...`).
2. `/app/env/.env` baked into the image (copied from repository root).
3. `/app/env/.env.example` packaged with the image.
4. Hard-coded defaults in `web/entrypoint.py`.

> Keep a `.env` at the project root and run `docker compose up -d --build` after edits so the rebuilt image picks up your latest defaults.

## Environment Variables


| Variable        | Description                                                                | Default                             |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `MQTT_TCP_URL`  | EMQX MQTT address for the Cloud API and native clients.                    | `tcp://<auto-detected-ip>:1883`     |
| `MQTT_WS_URL`   | Explicit WebSocket endpoint; usually leave blank and let the UI derive it. | *(empty)*                           |
| `MQTT_USERNAME` | Username prefilled on the login page.                                      | `admin`                             |
| `MQTT_PASSWORD` | Password prefilled on the login page.                                      | `public`                            |
| `MQTT_WS_PORT`  | Port hint when`MQTT_WS_URL` is blank.                                      | *(empty; UI defaults to 8083/8084)* |
| `MQTT_WS_PATH`  | WebSocket path segment.                                                    | `/mqtt`                             |
| `WEB_BIND_HOST` | Host interface the web UI binds to.                                        | `127.0.0.1`                         |
| `WEB_BIND_PORT` | Port used by both the container HTTP server and the host mapping.          | `3100`                              |

> The login page supports anonymous and credential modes, storing the latest address and credentials in `localStorage`.

## Build & Deployment

- After any change (front end, Python, env files) run `docker compose up -d --build` to rebuild the image.
- Keep `.env` out of version control in production; inject it via CI/CD and treat the baked `.env.example` as a template only.
- For TLS (`mqtts`/`wss`), configure certificates in EMQX, set `MQTT_TCP_URL` to `ssl://...` or `mqtts://...`, and point `MQTT_WS_PORT` to the TLS WebSocket port (8084 by default).

## Data & Logs

- Inspect volumes with `docker volume inspect emqx_data` (also works for `emqx_log` and `emqx_etc`).
- Export EMQX config if needed:
  ```bash
  docker compose run --rm app sh -c 'tar -C /opt/emqx/etc -cf - .' > emqx-etc.tar
  ```
- To wipe persisted state, use `docker compose down --volumes` after confirming no important data is stored.

## Verification & Troubleshooting

1. Run `docker compose ps` to ensure the container is `Up`.
2. Check `docker compose logs app` to verify the Python service starts and injects configuration without errors.
3. Visit `http://<host>:<port>` and use the “Connect”/“Test MQTT” actions to confirm the UI reports a successful connection.
4. Test EMQX ports (1883/8083/8084) with MQTTX, MQTT Explorer, or `mosquitto_pub/sub`.
5. If the browser fails to connect, verify:
   - The `.env` or runtime variables point to an IP/domain reachable from your network.
   - Firewalls, NAT rules, or security groups allow the required ports.
   - EMQX logs are free of authentication or connection errors.

## Extension Ideas

- Add reverse proxies, TLS terminators, or monitoring via `docker-compose.override.yml`.
- Customize the login page by editing assets under `web/static` and rebuilding.
- Introduce multi-stage builds in the `Dockerfile` if you need to compile front-end assets first.
