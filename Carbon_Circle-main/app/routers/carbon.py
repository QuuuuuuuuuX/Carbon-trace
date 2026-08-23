"""碳记录路由 · Phase 2 实现。

核心闭环：记碳 → 算碳 → 积分 → 前端展示。
"""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.limiter import limiter
from app.models import CarbonRecord, PointsLog, User, UserStreak
from app.services.carbon_calc import calculator
from app.services.ocr_client import call_ocr

router = APIRouter()


# ===== 积分规则（PRD §6，4 套并行）=====
POINTS_PER_TYPE = {"步行": 20, "打车": -5, "用电": 0, "素食": 15}


def calc_points(activity: str, co2_kg: float, streak_days: int) -> tuple[int, dict]:
    """4 套规则并行，返回 (总积分, 明细)。"""
    p_fixed = 10                                # ① 固定分
    p_ratio = round(max(0, 10 - co2_kg * 2))    # ② 减排量比例（碳排越低越高）
    p_type = POINTS_PER_TYPE.get(activity, 0)   # ③ 分类差异化
    p_streak = streak_days * 5                  # ④ 连续打卡（第 N 天 +N×5）
    total = p_fixed + p_ratio + p_type + p_streak
    return total, {"fixed": p_fixed, "ratio": p_ratio, "type": p_type, "streak": p_streak}


def _save_record(
    db: Session,
    user: User,
    category: str,
    activity: str,
    value: float,
    unit: str,
    source: str,
    raw_text: str | None,
) -> dict:
    """记碳核心逻辑：算碳 → 写记录 → 打卡 → 积分。record 与 upload 共用。"""
    co2_kg, factor = calculator.match(category, activity, value)
    if co2_kg is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "factor_not_found", "message": f"未找到匹配的排放因子：{category}/{activity}"},
        )

    # 1. 写碳记录
    record = CarbonRecord(
        user_id=user.device_token,
        category=category,
        activity_type=activity,
        value=value,
        unit=unit,
        co2_kg=co2_kg,
        raw_text=raw_text,
        source=source,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.flush()  # 拿到 record.id

    # 2. 连续打卡状态机（跨日 +1）
    streak = db.get(UserStreak, user.device_token)
    today = date.today().isoformat()
    if streak is None:
        streak = UserStreak(user_id=user.device_token, last_checkin_date=today, streak_days=1)
        db.add(streak)
    elif streak.last_checkin_date != today:
        streak.streak_days += 1
        streak.last_checkin_date = today
    streak_days = streak.streak_days

    # 3. 算积分 + 写流水 + 更新余额
    points, detail = calc_points(activity, co2_kg, streak_days)
    user.points += points
    user.last_active_at = datetime.utcnow()
    db.add(PointsLog(
        user_id=user.device_token,
        change=points,
        reason="carbon_record",
        ref_id=record.id,
        balance_after=user.points,
    ))
    db.commit()

    return {
        "id": record.id,
        "category": record.category,
        "activity": record.activity_type,
        "value": record.value,
        "unit": record.unit,
        "co2_kg": co2_kg,
        "factor_source": (factor or {}).get("source_detail", ""),
        "points_earned": points,
        "points_detail": detail,
        "points_balance": user.points,
        "streak_days": streak_days,
    }


# ===== Request Models =====

class RecordRequest(BaseModel):
    category: str = Field(..., description="transport/electricity/food/consumption")
    activity: str = Field(..., description="打车/地铁/用电/牛肉饭/步行...")
    value: float = Field(..., gt=0)
    unit: str = Field(..., description="km/度/份/单")


class UploadRequest(BaseModel):
    image_base64: str = Field(..., description="图片 base64（小票等）")


# ===== Endpoints =====

@router.post("/record", summary="文字记碳（算碳 + 积分）")
@limiter.limit("3/second")
def record_carbon(
    request: Request,
    req: RecordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _save_record(
        db, user, req.category, req.activity, req.value, req.unit,
        source="form",
        raw_text=f"{req.activity} {req.value}{req.unit}",
    )


@router.post("/upload", summary="拍照上传（OCR → 算碳）")
async def upload_carbon(
    req: UploadRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await call_ocr(req.image_base64)
    if result is None:
        raise HTTPException(
            status_code=502,
            detail={"error": "ocr_unavailable", "message": "OCR 服务不可用，请先用文字记碳"},
        )
    category = result.get("category")
    activity = result.get("activity")
    value = result.get("value")
    unit = result.get("unit", "")
    if not category or not activity or value is None:
        raise HTTPException(
            status_code=422,
            detail={"error": "ocr_bad_result", "message": "OCR 结果缺少 category/activity/value 字段"},
        )
    return _save_record(
        db, user, str(category), str(activity), float(value), str(unit),
        source="ocr",
        raw_text=f"OCR:{activity} {value}{unit}",
    )


@router.get("/list", summary="碳记录列表（时间倒序）")
def list_carbon(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(CarbonRecord).filter(CarbonRecord.user_id == user.device_token)
    total = q.count()
    records = (
        q.order_by(CarbonRecord.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "category": r.category,
                "activity": r.activity_type,
                "value": r.value,
                "unit": r.unit,
                "co2_kg": r.co2_kg,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/stats", summary="分类占比统计")
def stats_carbon(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CarbonRecord.category, func.sum(CarbonRecord.co2_kg))
        .filter(CarbonRecord.user_id == user.device_token)
        .group_by(CarbonRecord.category)
        .all()
    )
    stats = {c: round(v, 2) for c, v in rows if v is not None}
    total = round(sum(stats.values()), 2)
    return {
        "transport": stats.get("transport", 0),
        "electricity": stats.get("electricity", 0),
        "food": stats.get("food", 0),
        "consumption": stats.get("consumption", 0),
        "total_kg": total,
    }
