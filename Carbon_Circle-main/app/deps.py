"""FastAPI 依赖注入：device_token 解析、当前用户获取、限流器。"""
from typing import Annotated
import uuid

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User


def parse_device_token(
    x_device_token: Annotated[str | None, Header(alias="X-Device-Token")] = None,
) -> str:
    """从请求头 X-Device-Token 解析 device_token。"""
    if not x_device_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_device_token", "message": "请求头缺少 X-Device-Token"},
        )
    return x_device_token


def get_current_user(
    device_token: Annotated[str, Depends(parse_device_token)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """根据 device_token 获取当前用户。未注册 → 401。"""
    user = db.get(User, device_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unknown_device_token", "message": "device_token 未注册，请先调用 /api/auth/device"},
        )
    return user


def generate_device_token() -> str:
    """生成新的 device_token（UUID4 无连字符，64 字符内）。"""
    return uuid.uuid4().hex


# 类型别名，方便 routers 引用
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
DeviceToken = Annotated[str, Depends(parse_device_token)]
