"""SQLAlchemy ORM 模型 · 10 张表（PRD §5）。

约定：
- 所有表名 snake_case 单数
- 主键 strategy: user 表用 device_token（UUID），其他表自增 int
- 时间字段：created_at / updated_at，全部 timezone=True
- 字符串长度：昵称 32、手机号 11、token 64
"""
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ===== 1. user =====
class User(Base):
    """用户主表（device_token + 手机号 + 昵称 + 积分余额）。"""
    __tablename__ = "user"

    device_token: Mapped[str] = mapped_column(String(64), primary_key=True)
    phone: Mapped[str | None] = mapped_column(String(11), nullable=True, index=True)
    nickname: Mapped[str] = mapped_column(String(32), nullable=False)
    avatar_id: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[int] = mapped_column(Integer, default=0)  # 余额冗余

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 关系
    character: Mapped["UserCharacter | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    carbon_records: Mapped[list["CarbonRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    points_logs: Mapped[list["PointsLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    streak: Mapped["UserStreak | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    decorations: Mapped[list["UserDecoration"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    world_snapshot: Mapped["WorldSnapshot | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


# ===== 2. character =====
class Character(Base):
    """4 个固定角色（森林/海洋/天空/大地）。"""
    __tablename__ = "character"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # 1=森林 2=海洋 3=天空 4=大地
    name: Mapped[str] = mapped_column(String(16), nullable=False)
    asset_key: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sprite_url: Mapped[str | None] = mapped_column(String(255), nullable=True)


# ===== 3. user_character =====
class UserCharacter(Base):
    """用户当前选择 + LLM 生成的命名/性格/建议。"""
    __tablename__ = "user_character"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), primary_key=True)
    character_id: Mapped[int] = mapped_column(Integer, ForeignKey("character.id"), nullable=False)
    ai_name: Mapped[str | None] = mapped_column(String(32), nullable=True)  # LLM 生成的角色名
    ai_personality: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_advice: Mapped[str | None] = mapped_column(Text, nullable=True)  # 最新一条减排建议
    level: Mapped[int] = mapped_column(Integer, default=1)
    exp: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user: Mapped["User"] = relationship(back_populates="character")
    character: Mapped["Character"] = relationship()


# ===== 4. carbon_record =====
class CarbonRecord(Base):
    """碳记录（活动类型 + 数值 + 单位 + 计算出的 kgCO₂）。"""
    __tablename__ = "carbon_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), nullable=False, index=True)

    category: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # transport/electricity/food/consumption
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)  # 打车/地铁/10度电/牛肉饭
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)  # km/度/份/单
    co2_kg: Mapped[float] = mapped_column(Float, nullable=False)  # 计算结果

    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # 用户原始输入
    source: Mapped[str] = mapped_column(String(16), default="form")  # form/ocr

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # 关系
    user: Mapped["User"] = relationship(back_populates="carbon_records")

    __table_args__ = (
        Index("ix_carbon_user_created", "user_id", "created_at"),
    )


# ===== 5. points_log =====
class PointsLog(Base):
    """积分流水（增/减/原因/关联 ID）。"""
    __tablename__ = "points_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), nullable=False, index=True)

    change: Mapped[int] = mapped_column(Integer, nullable=False)  # 正负
    reason: Mapped[str] = mapped_column(String(32), nullable=False)  # carbon_fixed / carbon_ratio / carbon_type / streak / spend
    ref_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 关联 carbon_record.id 等
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)  # 流水后余额（便于排查）

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # 关系
    user: Mapped["User"] = relationship(back_populates="points_logs")

    __table_args__ = (
        Index("ix_points_user_created", "user_id", "created_at"),
    )


# ===== 6. user_streak =====
class UserStreak(Base):
    """连续打卡状态（最后打卡日 + 累计天数）。"""
    __tablename__ = "user_streak"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), primary_key=True)
    last_checkin_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user: Mapped["User"] = relationship(back_populates="streak")


# ===== 7. decoration =====
class Decoration(Base):
    """装饰物图鉴（名称 + 资源 key + 价格）。"""
    __tablename__ = "decoration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    asset_key: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False)  # avatar_frame/character_skin/world_item
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    sprite_url: Mapped[str | None] = mapped_column(String(255), nullable=True)


# ===== 8. user_decoration =====
class UserDecoration(Base):
    """玩家已购 + 地图坐标（NULL=在背包，否则放在地图）。"""
    __tablename__ = "user_decoration"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), primary_key=True)
    decoration_id: Mapped[int] = mapped_column(Integer, ForeignKey("decoration.id"), primary_key=True)

    placed_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    placed_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # 关系
    user: Mapped["User"] = relationship(back_populates="decorations")
    decoration: Mapped["Decoration"] = relationship()


# ===== 9. world_snapshot =====
class WorldSnapshot(Base):
    """断线恢复（位置 + 朝向）。"""
    __tablename__ = "world_snapshot"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.device_token"), primary_key=True)
    x: Mapped[float] = mapped_column(Float, default=0)
    y: Mapped[float] = mapped_column(Float, default=0)
    facing: Mapped[str] = mapped_column(String(8), default="right")  # left/right
    map_id: Mapped[str] = mapped_column(String(32), default="default")

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user: Mapped["User"] = relationship(back_populates="world_snapshot")


# ===== 10. emission_factor_log =====
class EmissionFactorLog(Base):
    """排放因子库版本追踪（可选）。"""
    __tablename__ = "emission_factor_log"

    version: Mapped[str] = mapped_column(String(16), primary_key=True)  # v1.0, v1.1
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    factor_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
