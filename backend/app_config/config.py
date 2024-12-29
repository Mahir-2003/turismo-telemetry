from pydantic_settings import BaseSettings
from pathlib import Path
import sys


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    # server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/gt7_telemetry.log"

    # gt7 settings
    GT7_HEARTBEAT_INTERVAL: int = 100  # packets
    GT7_SOCKET_TIMEOUT: int = 10  # seconds

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    class Config:
        env_file = ".env"


# Create logs directory if it doesn't exist
Path("../logs").mkdir(exist_ok=True)

# Create and export settings
settings = Settings()