"""限流器（slowapi 封装）+ 路由级限流。"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

from app.config import settings


def device_key(request: Request) -> str:
    """限流 key 优先用 X-Device-Token，没有则用 IP。"""
    return request.headers.get("X-Device-Token") or get_remote_address(request)


# 全局限流器
limiter = Limiter(
    key_func=device_key,
    default_limits=[],  # 不设全局默认，按路由单独限流
    storage_uri="memory://",  # MVP 内存限流，Phase 4 再换 Redis
    strategy="fixed-window",
)


# 路由限流字符串（slowapi 接受 "N/period"，period: second/minute/hour）
def rate_limit_carbon() -> str:
    return f"{settings.rate_limit_carbon}/second"


def rate_limit_auth() -> str:
    return f"{settings.rate_limit_auth}/second"
