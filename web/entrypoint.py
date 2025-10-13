import http.server
import json
import os
import socket
import socketserver
from pathlib import Path
from typing import Dict

STATIC_DIR = Path("/app/static")
CONFIG_OUTPUT = STATIC_DIR / "config.js"
ENV_DIR = Path("/app/env")

def detect_host_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


LAN_IP = detect_host_ip()

DEFAULTS = {
    "MQTT_TCP_URL": f"tcp://{LAN_IP}:1883",
    "MQTT_WS_URL": "",
    "MQTT_USERNAME": "admin",
    "MQTT_PASSWORD": "public",
    "MQTT_WS_PORT": "",
    "MQTT_WS_PATH": "/mqtt",
    "WEB_BIND_PORT": "3100",
}

ENV_FILE_ORDER = (ENV_DIR / ".env", ENV_DIR / ".env.example")
_ENV_CACHE: Dict[Path, Dict[str, str]] = {}


def parse_env_file(path: Path) -> Dict[str, str]:
    """Parse simple KEY=VALUE lines from a dotenv-style file."""
    variables: Dict[str, str] = {}
    if not path.exists():
        return variables

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        variables[key.strip()] = value.strip().strip('"').strip("'")
    return variables


def resolve_setting(key: str) -> str:
    """Resolve a single config value: env var -> .env -> .env.example -> default."""
    if (value := os.getenv(key)) not in (None, ""):
        return value

    for env_path in ENV_FILE_ORDER:
        env_values = _ENV_CACHE.setdefault(env_path, parse_env_file(env_path))
        if key in env_values and env_values[key] != "":
            return env_values[key]

    return DEFAULTS[key]


def generate_config() -> None:
    """Generate config.js directly from resolved settings."""
    config_payload = {
        "mqttTcpUrl": resolve_setting("MQTT_TCP_URL"),
        "mqttWsUrl": resolve_setting("MQTT_WS_URL"),
        "mqttUsername": resolve_setting("MQTT_USERNAME"),
        "mqttPassword": resolve_setting("MQTT_PASSWORD"),
        "mqttWsPort": resolve_setting("MQTT_WS_PORT"),
        "mqttWsPath": resolve_setting("MQTT_WS_PATH"),
    }
    CONFIG_OUTPUT.write_text(
        f"window.APP_CONFIG = {json.dumps(config_payload, ensure_ascii=False)};\n",
        encoding="utf-8",
    )


def serve_static() -> None:
    """Serve static files via Python's built-in HTTP server."""
    os.chdir(STATIC_DIR)

    class LoginRequestHandler(http.server.SimpleHTTPRequestHandler):
        def _map_path(self, path: str) -> str:
            normalized = path.split("?", 1)[0]
            if normalized in ("", "/", "/login", "/login/"):
                return "/login.html"
            return path

        def do_GET(self) -> None:
            self.path = self._map_path(self.path)
            super().do_GET()

        def do_HEAD(self) -> None:
            self.path = self._map_path(self.path)
            super().do_HEAD()

    try:
        port = int(resolve_setting("WEB_BIND_PORT"))
    except ValueError:
        port = 3100

    with socketserver.TCPServer(("0.0.0.0", port), LoginRequestHandler) as httpd:
        httpd.serve_forever()


def main() -> None:
    generate_config()
    serve_static()


if __name__ == "__main__":
    main()
