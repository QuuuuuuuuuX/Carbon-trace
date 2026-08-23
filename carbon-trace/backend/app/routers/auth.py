"""认证路由：设备 token 创建 + 手机号昵称绑定。

流程：
1. 客户端首次进入 → POST /api/auth/device → 拿到 device_token
2. 客户端输入手机号+昵称 → POST /api/auth/identify（带 X-Device-Token 头）→ 绑定身份
3. 之后所有请求带 X-Device-Token 头即可
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from slowapi import Limiter

from app.database import get_db
from app.deps import parse_device_token, generate_device_token
from app.models import User, UserStreak, WorldSnapshot
from app.limiter import limiter

router = APIRouter()


# ===== Request/Response Models =====

class DeviceCreateResponse(BaseModel):
    device_token: str
    created: bool
    message: str


class IdentifyRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^\d{11}$", description="11位手机号")
    nickname: str = Field(..., min_length=1, max_length=32, description="昵称 1-32 字符")


class IdentifyResponse(BaseModel):
    device_token: str
    phone: str
    nickname: str
    points: int
    is_new_user: bool


class MeResponse(BaseModel):
    device_token: str
    phone: str | None
    nickname: str
    points: int
    avatar_id: int
    created_at: datetime
    last_active_at: datetime | None


# ===== Endpoints =====

@router.post(
    "/device",
    response_model=DeviceCreateResponse,
    summary="创建设备 token（首次进入）",
)
def create_device(db: Session = Depends(get_db)) -> DeviceCreateResponse:
    """为新设备创建匿名 token。同时建占位 user + world_snapshot + streak 三行。"""
    token = generate_device_token()
    now = datetime.utcnow()
    db.add(User(
        device_token=token,
        phone=None,
        nickname=f"player_{token[:6]}",
        points=0,
        avatar_id=0,
        created_at=now,
        last_active_at=now,
    ))
    db.add(WorldSnapshot(user_id=token, x=400, y=300, facing="right", map_id="default"))
    db.add(UserStreak(user_id=token, last_checkin_date=None, streak_days=0))
    db.commit()

    return DeviceCreateResponse(
        device_token=token,
        created=True,
        message="设备 token 已创建，请调用 /api/auth/identify 绑定手机号昵称",
    )


@router.post(
    "/identify",
    response_model=IdentifyResponse,
    summary="绑定手机号+昵称（需先调 /device）",
)
@limiter.limit("1/second")
def identify(
    request: Request,
    req: IdentifyRequest,
    device_token: str = Depends(parse_device_token),
    db: Session = Depends(get_db),
) -> IdentifyResponse:
    """用 device_token 找到 user，更新/写入手机号+昵称。"""
    user = db.get(User, device_token)
    if user is None:
        # device_token 校验已 raise 401，这里走不到
        raise RuntimeError("unreachable")

    is_new = user.phone is None
    user.phone = req.phone
    user.nickname = req.nickname
    user.last_active_at = datetime.utcnow()
    db.commit()

    return IdentifyResponse(
        device_token=device_token,
        phone=user.phone,
        nickname=user.nickname,
        points=user.points,
        is_new_user=is_new,
    )


@router.get(
    "/me",
    response_model=MeResponse,
    summary="查看当前用户",
)
def me(
    db: Session = Depends(get_db),
    device_token: str = Depends(parse_device_token),
) -> MeResponse:
    """根据 device_token 查自己。"""
    u = db.get(User, device_token)
    assert u is not None
    return MeResponse(
        device_token=u.device_token,
        phone=u.phone,
        nickname=u.nickname,
        points=u.points,
        avatar_id=u.avatar_id,
        created_at=u.created_at,
        last_active_at=u.last_active_at,
    )
