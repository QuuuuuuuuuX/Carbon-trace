"""角色路由 · Phase 2 实现。"""
import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Character, User, UserCharacter
from app.services.llm_client import deepseek

router = APIRouter()

DEFAULT_ADVICE = "建议减少高碳活动，多用公共交通和节能设备。"


class ChooseRequest(BaseModel):
    character_id: int


@router.get("/options", summary="4 个可选角色")
def character_options(db: Session = Depends(get_db)):
    chars = db.query(Character).order_by(Character.id).all()
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "asset_key": c.asset_key,
                "sprite_url": c.sprite_url,
                "description": c.description,
            }
            for c in chars
        ]
    }


@router.post("/choose", summary="选角色 + 触发 LLM 生成设定")
async def character_choose(
    req: ChooseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    char = db.get(Character, req.character_id)
    if char is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "character_not_found", "message": f"角色 {req.character_id} 不存在"},
        )

    # LLM 生成设定（失败走 fallback）
    prompt = (
        f"你是碳账本养成游戏的 AI 设定师。为角色「{char.name}」（{char.description}）生成设定，"
        f"严格只返回 JSON：{{\"ai_name\":\"4字以内昵称\",\"ai_personality\":\"30字以内性格描述\",\"ai_advice\":\"20字以内减排建议\"}}"
    )
    raw = await deepseek.enqueue(prompt, system="你是简洁的 AI 角色设定师，只输出 JSON，不要多余文字。")

    ai_name, ai_personality, ai_advice = char.name, char.description, DEFAULT_ADVICE
    try:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            d = json.loads(m.group())
            ai_name = d.get("ai_name") or ai_name
            ai_personality = d.get("ai_personality") or ai_personality
            ai_advice = d.get("ai_advice") or ai_advice
    except Exception:
        pass  # 解析失败用默认值

    # upsert user_character
    uc = db.get(UserCharacter, user.device_token)
    if uc is not None:
        uc.character_id = char.id
        uc.ai_name = ai_name
        uc.ai_personality = ai_personality
        uc.ai_advice = ai_advice
    else:
        db.add(UserCharacter(
            user_id=user.device_token,
            character_id=char.id,
            ai_name=ai_name,
            ai_personality=ai_personality,
            ai_advice=ai_advice,
            level=1,
            exp=0,
        ))
    user.avatar_id = char.id
    db.commit()

    return {
        "character_id": char.id,
        "ai_name": ai_name,
        "ai_personality": ai_personality,
        "ai_advice": ai_advice,
    }


@router.get("/me", summary="我的角色（含 LLM 生成字段）")
def character_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uc = db.get(UserCharacter, user.device_token)
    if uc is None:
        return {"has_character": False}
    char = db.get(Character, uc.character_id)
    return {
        "has_character": True,
        "character_id": uc.character_id,
        "ai_name": uc.ai_name,
        "ai_personality": uc.ai_personality,
        "ai_advice": uc.ai_advice,
        "level": uc.level,
        "exp": uc.exp,
        "character": {
            "id": char.id,
            "name": char.name,
            "asset_key": char.asset_key,
            "sprite_url": char.sprite_url,
            "description": char.description,
        } if char else None,
    }
