"""积分路由 · Phase 2 实现。"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.limiter import limiter
from app.models import Decoration, PointsLog, User, UserDecoration

router = APIRouter()


class SpendRequest(BaseModel):
    decoration_id: int


@router.post("/spend", summary="消费积分买装饰物")
@limiter.limit("3/second")
def spend_points(
    request: Request,
    req: SpendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dec = db.get(Decoration, req.decoration_id)
    if dec is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "decoration_not_found", "message": f"装饰物 {req.decoration_id} 不存在"},
        )

    # 已拥有？
    owned = db.get(UserDecoration, (user.device_token, req.decoration_id))
    if owned is not None:
        raise HTTPException(
            status_code=400,
            detail={"error": "already_owned", "message": "已拥有该装饰物"},
        )

    if user.points < dec.cost:
        raise HTTPException(
            status_code=400,
            detail={"error": "insufficient_points", "message": f"积分不足（需要 {dec.cost}，当前 {user.points}）"},
        )

    # 扣积分 + 记录已购 + 写流水
    user.points -= dec.cost
    db.add(UserDecoration(
        user_id=user.device_token,
        decoration_id=dec.id,
        placed_x=None,  # 在背包
        placed_y=None,
        acquired_at=datetime.utcnow(),
    ))
    db.add(PointsLog(
        user_id=user.device_token,
        change=-dec.cost,
        reason="spend",
        ref_id=dec.id,
        balance_after=user.points,
    ))
    db.commit()

    return {
        "success": True,
        "points_balance": user.points,
        "decoration": {"id": dec.id, "name": dec.name, "cost": dec.cost},
    }


@router.get("/log", summary="积分流水（时间倒序）")
def get_points_log(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PointsLog).filter(PointsLog.user_id == user.device_token)
    total = q.count()
    logs = (
        q.order_by(PointsLog.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "items": [
            {
                "id": l.id,
                "change": l.change,
                "reason": l.reason,
                "ref_id": l.ref_id,
                "balance_after": l.balance_after,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "size": size,
    }
