import re
import socket
from typing import Optional


def is_valid_ip(ip: str) -> bool:
    """Validate IPv4 address"""
    try:
        socket.inet_pton(socket.AF_INET, ip)
        return True
    except (socket.error, ValueError):
        return False


def validate_ps_ip(ip: str) -> Optional[str]:
    """Validate PlayStation IP Address and Format"""
    if not ip or not isinstance(ip, str):
        raise ValueError("IP address is required")

    ip = ip.strip()

    # basic IPv4 pattern
    if not re.match(r'^(\d{1,3}\.){3}\d{1,3}$', ip):
        raise ValueError("Invalid IP address format")

    # validate as proper IP
    if not is_valid_ip(ip):
        raise ValueError("Invalid IP Address")

    return ip
