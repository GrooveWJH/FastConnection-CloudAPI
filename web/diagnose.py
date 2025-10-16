#!/usr/bin/env python3
"""
容器内部状态诊断脚本
用法: docker exec fc-cloudapi python3 /app/diagnose.py
"""

import subprocess
import socket
import sys
from pathlib import Path

def print_section(title):
    """打印分隔符"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def run_command(cmd, desc):
    """运行命令并打印结果"""
    print(f"[{desc}]")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        print(result.stdout)
        if result.stderr:
            print(f"错误输出: {result.stderr}")
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("⏱️  命令超时")
        return False
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        return False

def check_port(port, name):
    """检查端口是否监听"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        if result == 0:
            print(f"✅ {name} (端口 {port}): 正在监听")
            return True
        else:
            print(f"❌ {name} (端口 {port}): 未监听")
            return False
    except Exception as e:
        print(f"❌ {name} (端口 {port}): 检测失败 - {e}")
        return False

def main():
    print_section("FastConnection-CloudAPI 容器诊断")

    # 1. 检查进程
    print_section("1. 运行中的进程")
    run_command("ps aux | grep -E 'python|emqx|PID'", "进程列表")

    # 2. 检查端口监听状态
    print_section("2. 端口监听状态")
    run_command("netstat -tlnp 2>/dev/null || ss -tlnp", "所有监听端口")

    # 3. 端口连接测试
    print_section("3. 端口连接测试")
    check_port(3100, "Web UI")
    check_port(18083, "EMQX Dashboard")
    check_port(1883, "MQTT TCP")
    check_port(8083, "MQTT WebSocket")

    # 4. 检查文件存在性
    print_section("4. 关键文件检查")
    files = [
        "/app/web_entrypoint.py",
        "/app/static/login.html",
        "/app/static/config.js",
        "/app/start.sh"
    ]
    for file_path in files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - 不存在")

    # 5. 检查 config.js 内容
    print_section("5. 配置文件内容")
    config_path = Path("/app/static/config.js")
    if config_path.exists():
        print(config_path.read_text())
    else:
        print("❌ config.js 不存在")

    # 6. 检查 Python 进程日志
    print_section("6. Python Web 服务状态")
    run_command("pgrep -f 'python3.*web_entrypoint' && echo '✅ Web 服务进程存在' || echo '❌ Web 服务进程不存在'", "进程检查")

    # 7. 尝试访问 Web 服务
    print_section("7. HTTP 连接测试")
    run_command("curl -s -o /dev/null -w 'HTTP状态码: %{http_code}\\n' http://127.0.0.1:3100/ || echo '❌ 无法连接'", "Web UI (3100)")
    run_command("curl -s -o /dev/null -w 'HTTP状态码: %{http_code}\\n' http://127.0.0.1:18083/ || echo '❌ 无法连接'", "EMQX Dashboard (18083)")

    # 8. 网络接口
    print_section("8. 网络接口")
    run_command("ip addr show || ifconfig", "网络配置")

    # 9. 查看启动日志（如果有）
    print_section("9. 启动脚本状态")
    run_command("cat /app/start.sh", "start.sh 内容")

    print_section("诊断完成")
    print("💡 提示:")
    print("  - 如果 3100 端口未监听，检查 start.sh 中的启动命令")
    print("  - 如果端口已监听但无法访问，检查防火墙或 Docker 端口映射")
    print("  - 查看完整日志: docker logs fc-cloudapi")
    print("")

if __name__ == "__main__":
    main()
