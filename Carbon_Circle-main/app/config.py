"""应用配置：统一从 .env 读取，启动时校验。"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# backend 根目录（绝对路径），用于解析相对路径
BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # ===== Server =====
    app_name: str = "carbon-backend"
    app_version: str = "0.1.0"
    app_env: str = "development"
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000

    # ===== Database =====
    database_url: str = f"sqlite:///{BACKEND_ROOT / 'data' / 'carbon.db'}"

    # ===== CORS =====
    allowed_origins: str = "*"

    # ===== DeepSeek =====
    deepseek_api_key: str = "sk-placeholder"
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout: int = 10

    # ===== OCR (队友 B) =====
    ocr_service_url: str = "http://localhost:9001/ocr"
    ocr_service_timeout: int = 15

    # ===== Rate Limit =====
    rate_limit_carbon: int = 3
    rate_limit_auth: int = 1
    rate_limit_ws: int = 1

    # ===== WebSocket =====
    ws_heartbeat_timeout: int = 10
    ws_move_hz: int = 10
    ws_idle_hz: int = 1

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """解析 ALLOWED_ORIGINS，逗号分隔。"""
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
