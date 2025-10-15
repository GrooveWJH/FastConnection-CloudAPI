#!/usr/bin/env python3
"""
跨平台本机局域网 IP 获取脚本
支持 Windows, Linux, macOS
"""

import socket
import platform
import subprocess
import re
from typing import Optional, List


def get_local_ip_by_socket() -> Optional[str]:
    """
    通过创建 UDP 连接获取本机 IP（推荐方法，跨平台）
    不会真正发送数据包，只是用于获取本地 IP
    """
    try:
        # 创建一个 UDP socket
        # 连接到外部地址（这里使用 Google DNS，不会真正发送数据）
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return None


def get_local_ip_windows() -> List[str]:
    """Windows 系统通过 ipconfig 获取 IP"""
    try:
        result = subprocess.run(
            ["ipconfig"],
            capture_output=True,
            text=True,
            encoding="gbk",  # Windows 中文系统使用 GBK 编码
        )

        # 匹配 IPv4 地址
        pattern = r"IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)"
        matches = re.findall(pattern, result.stdout)

        # 过滤掉回环地址
        return [ip for ip in matches if not ip.startswith("127.")]
    except Exception:
        return []


def get_local_ip_linux() -> List[str]:
    """Linux 系统通过 ip addr 或 ifconfig 获取 IP"""
    ips = []

    # 尝试使用 ip addr (现代 Linux 系统)
    try:
        result = subprocess.run(
            ["ip", "addr"],
            capture_output=True,
            text=True,
        )

        # 匹配 inet 后的 IP 地址
        pattern = r"inet\s+(\d+\.\d+\.\d+\.\d+)/\d+"
        matches = re.findall(pattern, result.stdout)
        ips.extend([ip for ip in matches if not ip.startswith("127.")])
    except Exception:
        pass

    # 如果 ip addr 失败，尝试 ifconfig (旧系统)
    if not ips:
        try:
            result = subprocess.run(
                ["ifconfig"],
                capture_output=True,
                text=True,
            )

            pattern = r"inet\s+(\d+\.\d+\.\d+\.\d+)"
            matches = re.findall(pattern, result.stdout)
            ips.extend([ip for ip in matches if not ip.startswith("127.")])
        except Exception:
            pass

    return ips


def get_local_ip_macos() -> List[str]:
    """macOS 系统通过 ifconfig 获取 IP"""
    try:
        result = subprocess.run(
            ["ifconfig"],
            capture_output=True,
            text=True,
        )

        # 匹配 inet 后的 IP 地址
        pattern = r"inet\s+(\d+\.\d+\.\d+\.\d+)"
        matches = re.findall(pattern, result.stdout)

        # 过滤掉回环地址
        return [ip for ip in matches if not ip.startswith("127.")]
    except Exception:
        return []


def is_private_ip(ip: str) -> bool:
    """判断是否为私有 IP 地址（局域网 IP）"""
    parts = list(map(int, ip.split(".")))

    # 10.0.0.0/8
    if parts[0] == 10:
        return True

    # 172.16.0.0/12
    if parts[0] == 172 and 16 <= parts[1] <= 31:
        return True

    # 192.168.0.0/16
    if parts[0] == 192 and parts[1] == 168:
        return True

    return False


def get_best_local_ip() -> str:
    """
    获取最可能是本机局域网的 IP 地址
    这是主要的公开接口函数

    返回:
        str: 本机局域网 IP，如果获取失败返回 127.0.0.1
    """
    # 方法 1: 通过 socket 方式获取（最推荐，跨平台）
    ip = get_local_ip_by_socket()
    if ip and is_private_ip(ip):
        return ip

    # 方法 2: 根据系统类型使用不同命令
    system = platform.system()
    ips = []

    if system == "Windows":
        ips = get_local_ip_windows()
    elif system == "Linux":
        ips = get_local_ip_linux()
    elif system == "Darwin":  # macOS
        ips = get_local_ip_macos()

    # 过滤并优先选择私有 IP
    private_ips = [ip for ip in ips if is_private_ip(ip)]

    if private_ips:
        # 优先级：192.168.x.x > 10.x.x.x > 172.16-31.x.x
        for ip in private_ips:
            if ip.startswith("192.168."):
                return ip

        for ip in private_ips:
            if ip.startswith("10."):
                return ip

        return private_ips[0]

    # 如果都失败，返回回环地址
    return "127.0.0.1"


def print_all_ips():
    """打印所有检测到的 IP 信息（用于调试）"""
    print(f"操作系统: {platform.system()} {platform.release()}")
    print("-" * 50)

    # Socket 方法
    socket_ip = get_local_ip_by_socket()
    print(f"Socket 方法获取的 IP: {socket_ip}")

    # 系统命令方法
    system = platform.system()
    if system == "Windows":
        ips = get_local_ip_windows()
    elif system == "Linux":
        ips = get_local_ip_linux()
    elif system == "Darwin":
        ips = get_local_ip_macos()
    else:
        ips = []

    print(f"系统命令获取的所有 IP: {', '.join(ips) if ips else '无'}")
    print("-" * 50)

    best_ip = get_best_local_ip()
    print(f"\033[1;32m最佳局域网 IP: {best_ip}\033[0m")


if __name__ == "__main__":
    import sys

    # 如果带参数 -v 或 --verbose，显示详细信息
    if len(sys.argv) > 1 and sys.argv[1] in ["-v", "--verbose"]:
        print_all_ips()
    else:
        # 默认只输出 IP
        print(get_best_local_ip())

