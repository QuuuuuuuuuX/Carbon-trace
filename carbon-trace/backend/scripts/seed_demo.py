"""演示账号 seed 脚本：5 个账号（PRD §10）。

用法：
    .venv/bin/python scripts/seed_demo.py [--reset]

选项：
    --reset    先清空 user / character / user_character / decoration / user_decoration 表再插入
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app import models  # noqa
from app.models import User, UserStreak, WorldSnapshot, Character, UserCharacter, Decoration, UserDecoration
from app.config import settings


# ===== 4 个固定角色 =====
CHARACTERS = [
    {"id": 1, "name": "森林精灵", "asset_key": "char_forest", "description": "守护森林的低语者，温和而坚定", "sprite_url": "/static/characters/forest.png"},
    {"id": 2, "name": "海洋之心", "asset_key": "char_ocean", "description": "深蓝之子，胸怀如海", "sprite_url": "/static/characters/ocean.png"},
    {"id": 3, "name": "天空旅者", "asset_key": "char_sky", "description": "云端漫步者，向往自由", "sprite_url": "/static/characters/sky.png"},
    {"id": 4, "name": "大地行者", "asset_key": "char_earth", "description": "脚踏实地，承载万物", "sprite_url": "/static/characters/earth.png"},
]


# ===== 10 个装饰物（4 头像框 + 6 地图装饰物）=====
DECORATIONS = [
    # 头像框
    {"id": 1, "name": "环保绿框", "asset_key": "frame_green", "category": "avatar_frame", "cost": 100, "sprite_url": "/static/decorations/frame_green.png"},
    {"id": 2, "name": "海浪蓝框", "asset_key": "frame_blue", "category": "avatar_frame", "cost": 100, "sprite_url": "/static/decorations/frame_blue.png"},
    {"id": 3, "name": "金叶框", "asset_key": "frame_gold", "category": "avatar_frame", "cost": 200, "sprite_url": "/static/decorations/frame_gold.png"},
    {"id": 4, "name": "钻石框", "asset_key": "frame_diamond", "category": "avatar_frame", "cost": 500, "sprite_url": "/static/decorations/frame_diamond.png"},
    # 地图装饰物
    {"id": 5, "name": "小树苗", "asset_key": "world_tree", "category": "world_item", "cost": 200, "sprite_url": "/static/decorations/tree.png"},
    {"id": 6, "name": "太阳能板", "asset_key": "world_solar", "category": "world_item", "cost": 300, "sprite_url": "/static/decorations/solar.png"},
    {"id": 7, "name": "回收箱", "asset_key": "world_bin", "category": "world_item", "cost": 150, "sprite_url": "/static/decorations/bin.png"},
    {"id": 8, "name": "小风车", "asset_key": "world_windmill", "category": "world_item", "cost": 400, "sprite_url": "/static/decorations/windmill.png"},
    {"id": 9, "name": "电动车", "asset_key": "world_ev", "category": "world_item", "cost": 600, "sprite_url": "/static/decorations/ev.png"},
    {"id": 10, "name": "花园", "asset_key": "world_garden", "category": "world_item", "cost": 500, "sprite_url": "/static/decorations/garden.png"},
]


# ===== 5 个演示账号 =====
DEMO_USERS = [
    {
        "device_token": "demo000000000000000000000000forest01",  # 32 字符
        "phone": "13800000001",
        "nickname": "forest_hero",
        "points": 0,
        "avatar_id": 1,
        "character_id": 1,
        "ai_name": "小森",
        "ai_personality": "温和内敛，关心每一棵树的呼吸",
        "ai_advice": "从步行通勤开始，每天减碳一点点。",
        "level": 1,
        "exp": 0,
        "decoration_ids": [],
        "world_x": 200, "world_y": 300,
    },
    {
        "device_token": "demo000000000000000000000000ocean02",
        "phone": "13800000002",
        "nickname": "ocean_diver",
        "points": 500,
        "avatar_id": 2,
        "character_id": 2,
        "ai_name": "波波",
        "ai_personality": "热情奔放，像海浪一样有节奏",
        "ai_advice": "少吃海鲜多用公共交通，海会更蓝。",
        "level": 3,
        "exp": 240,
        "decoration_ids": [1],  # 1 个头像框
        "world_x": 350, "world_y": 280,
    },
    {
        "device_token": "demo000000000000000000000000sky003",
        "phone": "13800000003",
        "nickname": "sky_walker",
        "points": 2000,
        "avatar_id": 3,
        "character_id": 3,
        "ai_name": "云云",
        "ai_personality": "自由洒脱，梦想是触摸每一片云",
        "ai_advice": "短途不飞航班，是给天空最好的礼物。",
        "level": 8,
        "exp": 1850,
        "decoration_ids": [1, 2, 3, 5, 6, 7],  # 3 头像框 + 3 装饰物
        "world_x": 500, "world_y": 320,
    },
    {
        "device_token": "demo000000000000000000000000earth04",
        "phone": "13800000004",
        "nickname": "earth_keeper",
        "points": 800,
        "avatar_id": 4,
        "character_id": 4,
        "ai_name": "岩岩",
        "ai_personality": "沉稳踏实，是所有人的依靠",
        "ai_advice": "节约用电随手关灯，小动作大不同。",
        "level": 4,
        "exp": 620,
        "decoration_ids": [5, 7],  # 2 装饰物
        "world_x": 420, "world_y": 360,
    },
    {
        "device_token": "demo000000000000000000000000super05",
        "phone": "13800000005",
        "nickname": "super_admin",
        "points": 10000,
        "avatar_id": 3,
        "character_id": 3,
        "ai_name": "飞天小绿",
        "ai_personality": "传说中的碳减排达人，全能王",
        "ai_advice": "你已经做到最棒，继续影响身边的人！",
        "level": 20,
        "exp": 9999,
        "decoration_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],  # 全部
        "world_x": 600, "world_y": 350,
    },
]


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="清空相关表后插入")
    args = parser.parse_args()

    print("=" * 50)
    print(f"Seeding 演示账号 · {settings.database_url}")
    print("=" * 50)

    # 确保所有表已建
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if args.reset:
            print("\n[reset] 清空相关表...")
            for tbl in [UserDecoration, UserCharacter, UserStreak, WorldSnapshot, User, Decoration, Character]:
                db.query(tbl).delete()
            db.commit()
            print("   ✅ 已清空")

        # 1. 插入角色
        print("\n[1/3] 插入 4 个角色...")
        for c in CHARACTERS:
            existing = db.get(Character, c["id"])
            if existing is None:
                db.add(Character(**c))
            else:
                # 更新
                for k, v in c.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"   ✅ 角色 1-4 已就位")

        # 2. 插入装饰物
        print("\n[2/3] 插入 10 个装饰物...")
        for d in DECORATIONS:
            existing = db.get(Decoration, d["id"])
            if existing is None:
                db.add(Decoration(**d))
            else:
                for k, v in d.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"   ✅ 装饰物 1-10 已就位")

        # 3. 插入 5 个演示账号
        print("\n[3/3] 插入 5 个演示账号...")
        now = datetime.utcnow()
        for u in DEMO_USERS:
            # 跳过已存在
            existing = db.get(User, u["device_token"])
            if existing is not None:
                print(f"   ⏭  {u['nickname']} 已存在，跳过")
                continue

            # user
            db.add(User(
                device_token=u["device_token"],
                phone=u["phone"],
                nickname=u["nickname"],
                points=u["points"],
                avatar_id=u["avatar_id"],
                created_at=now,
                last_active_at=now,
            ))
            # user_character
            db.add(UserCharacter(
                user_id=u["device_token"],
                character_id=u["character_id"],
                ai_name=u["ai_name"],
                ai_personality=u["ai_personality"],
                ai_advice=u["ai_advice"],
                level=u["level"],
                exp=u["exp"],
            ))
            # user_streak
            db.add(UserStreak(
                user_id=u["device_token"],
                last_checkin_date="2026-08-23",
                streak_days=u["level"] * 2,  # 演示用
            ))
            # world_snapshot
            db.add(WorldSnapshot(
                user_id=u["device_token"],
                x=u["world_x"],
                y=u["world_y"],
                facing="right",
                map_id="default",
            ))
            # user_decoration
            for dec_id in u["decoration_ids"]:
                db.add(UserDecoration(
                    user_id=u["device_token"],
                    decoration_id=dec_id,
                    placed_x=None,  # 在背包
                    placed_y=None,
                ))
            print(f"   ✅ {u['nickname']:15s} {u['points']:>6} 分  {len(u['decoration_ids']):>2} 装饰物")
        db.commit()

        print("\n" + "=" * 50)
        print("✅ 演示账号 seed 完成")
        print("=" * 50)
        print("\n演示账号速查（device_token 用于 X-Device-Token 头）：")
        for u in DEMO_USERS:
            print(f"  {u['nickname']:15s} phone={u['phone']}  token={u['device_token']}")


if __name__ == "__main__":
    main()
