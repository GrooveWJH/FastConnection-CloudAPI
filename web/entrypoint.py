import http.server
import json
import os
import platform
import socketserver
from pathlib import Path

# 导入增强版的 IP 检测功能
from get_local_ip import get_best_local_ip

# 动态检测路径：优先使用 Docker 路径，否则使用当前目录
if Path("/app/static").exists():
    STATIC_DIR = Path("/app/static")
    DEFAULTS_PATH = Path("/app/web/config_defaults.json")
else:
    # 本地开发环境：使用脚本所在目录
    SCRIPT_DIR = Path(__file__).parent
    STATIC_DIR = SCRIPT_DIR / "static"
    DEFAULTS_PATH = SCRIPT_DIR / "config_defaults.json"

CONFIG_OUTPUT = STATIC_DIR / "config.js"

# 使用增强版的 IP 检测
LAN_IP = get_best_local_ip()

DEFAULTS = {}


def enable_windows_ansi_support() -> None:
    """Enable ANSI escape codes in the Windows console if possible."""
    if os.name != "nt":
        return

    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
        mode = ctypes.c_uint()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            # ENABLE_VIRTUAL_TERMINAL_PROCESSING
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
    except Exception:
        # 安静地忽略失败，保持兼容性
        pass


def load_defaults() -> None:
    """Load config defaults from JSON file."""
    print(f"\033[1;33m[配置生成] 配置文件路径:\033[0m {DEFAULTS_PATH}")
    print(f"\033[1;33m[配置生成] 当前工作目录:\033[0m {Path.cwd()}")
    print(
        f"\033[1;33m[配置生成] 目录检查:\033[0m /app -> {Path('/app').exists()}, /app/web -> {Path('/app/web').exists()}")
    try:
        print(
            f"\033[1;33m[配置生成] /app 目录内容:\033[0m {sorted(p.name for p in Path('/app').iterdir())}")
    except Exception as exc:
        print(f"\033[1;33m[配置生成] 无法读取 /app 目录:\033[0m {exc}")
    try:
        print(
            f"\033[1;33m[配置生成] /app/web 目录内容:\033[0m {sorted(p.name for p in Path('/app/web').iterdir())}")
    except Exception as exc:
        print(f"\033[1;33m[配置生成] 无法读取 /app/web 目录:\033[0m {exc}")

    if not DEFAULTS_PATH.exists():
        raise FileNotFoundError(f"Missing defaults file: {DEFAULTS_PATH}")
    DEFAULTS.update(json.loads(DEFAULTS_PATH.read_text(encoding="utf-8")))


def generate_config() -> None:
    """Generate config.js directly from resolved settings."""
    # 获取解析后的配置
    mqtt_tcp_url = DEFAULTS["MQTT_TCP_URL"].format(lan_ip=LAN_IP)
    mqtt_ws_url = DEFAULTS["MQTT_WS_URL"]

    config_payload = {
        "mqttTcpUrl": mqtt_tcp_url,
        "mqttWsUrl": mqtt_ws_url,
        "mqttUsername": DEFAULTS["MQTT_USERNAME"],
        "mqttPassword": DEFAULTS["MQTT_PASSWORD"],
        "mqttWsPort": DEFAULTS["MQTT_WS_PORT"],
        "mqttWsPath": DEFAULTS["MQTT_WS_PATH"],
        "apiToken": DEFAULTS["API_TOKEN"],
        "platformName": DEFAULTS["PLATFORM_NAME"],
        "workspaceName": DEFAULTS["WORKSPACE_NAME"],
        "workspaceDesc": DEFAULTS["WORKSPACE_DESC"],
    }

    CONFIG_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
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
    print(
        f"\033[1;33mMQTT 用户名:\033[0m            {config_payload['mqttUsername']}")
    print(
        f"\033[1;33mMQTT 密码:\033[0m              {'*' * min(len(config_payload['mqttPassword']), 8)}")
    print(f"\033[1;33m配置文件:\033[0m               {CONFIG_OUTPUT}")
    system_info = platform.uname()
    print(
        f"\033[1;33m系统架构:\033[0m               {system_info.system} {system_info.machine}")
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
        port = int(DEFAULTS["WEB_BIND_PORT"])
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
    enable_windows_ansi_support()
    load_defaults()
    generate_config()
    serve_static()


if __name__ == "__main__":
    main()
