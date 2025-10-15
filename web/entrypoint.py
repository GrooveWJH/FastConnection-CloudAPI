import http.server
import json
import os
import socketserver
from pathlib import Path
from typing import Dict

# 导入增强版的 IP 检测功能
from get_local_ip import get_best_local_ip

# 动态检测路径：优先使用 Docker 路径，否则使用当前目录
if Path("/app/static").exists():
    STATIC_DIR = Path("/app/static")
    ENV_DIR = Path("/app/env")
else:
    # 本地开发环境：使用脚本所在目录
    SCRIPT_DIR = Path(__file__).parent
    STATIC_DIR = SCRIPT_DIR / "static"
    ENV_DIR = SCRIPT_DIR.parent / "env"

CONFIG_OUTPUT = STATIC_DIR / "config.js"

# 使用增强版的 IP 检测
LAN_IP = get_best_local_ip()

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
    # 获取解析后的配置
    mqtt_tcp_url = resolve_setting("MQTT_TCP_URL")
    mqtt_ws_url = resolve_setting("MQTT_WS_URL")

    config_payload = {
        "mqttTcpUrl": mqtt_tcp_url,
        "mqttWsUrl": mqtt_ws_url,
        "mqttUsername": resolve_setting("MQTT_USERNAME"),
        "mqttPassword": resolve_setting("MQTT_PASSWORD"),
        "mqttWsPort": resolve_setting("MQTT_WS_PORT"),
        "mqttWsPath": resolve_setting("MQTT_WS_PATH"),
    }

    CONFIG_OUTPUT.write_text(
        f"window.APP_CONFIG = {json.dumps(config_payload, ensure_ascii=False)};\n",
        encoding="utf-8",
    )

    # 打印配置信息（带颜色输出）
    print("\033[1;36m" + "=" * 70 + "\033[0m")
    print("\033[1;32m[配置生成] FastConnection CloudAPI 配置\033[0m")
    print("\033[1;36m" + "=" * 70 + "\033[0m")
    print(f"\033[1;33m检测到的局域网 IP:\033[0m     {LAN_IP}")
    print(f"\033[1;33mMQTT TCP 地址:\033[0m          {mqtt_tcp_url}")
    print(f"\033[1;33mMQTT WebSocket 地址:\033[0m   {mqtt_ws_url or '(自动生成)'}")
    print(f"\033[1;33mMQTT 用户名:\033[0m            {config_payload['mqttUsername']}")
    print(f"\033[1;33mMQTT 密码:\033[0m              {'*' * min(len(config_payload['mqttPassword']), 8)}")
    print(f"\033[1;33m配置文件:\033[0m               {CONFIG_OUTPUT}")
    print(f"\033[1;33m系统架构:\033[0m               {os.uname().sysname} {os.uname().machine}")
    print("\033[1;36m" + "=" * 70 + "\033[0m")
    print("\033[1;32m✅ 配置已自动生成，Web 服务即将启动...\033[0m")
    print("\033[1;36m" + "=" * 70 + "\033[0m\n")


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

        def log_message(self, format, *args):
            """自定义日志格式，添加颜色"""
            print(f"\033[0;36m[Web 服务]\033[0m {format % args}")

    try:
        port = int(resolve_setting("WEB_BIND_PORT"))
    except ValueError:
        port = 3100

    # 打印启动信息
    print("\033[1;32m🚀 Web 服务已启动\033[0m")
    print(f"\033[1;33m监听地址:\033[0m http://0.0.0.0:{port}")
    print(f"\033[1;33m访问地址:\033[0m http://{LAN_IP}:{port}")
    print(f"\033[1;33m静态目录:\033[0m {STATIC_DIR}")
    print("\033[0;36m" + "-" * 70 + "\033[0m")
    print("\033[0;90m提示: 按 Ctrl+C 停止服务\033[0m\n")

    with socketserver.TCPServer(("0.0.0.0", port), LoginRequestHandler) as httpd:
        httpd.serve_forever()


def main() -> None:
    generate_config()
    serve_static()


if __name__ == "__main__":
    main()
