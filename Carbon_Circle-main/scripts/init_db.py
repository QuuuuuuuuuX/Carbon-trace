"""数据库初始化脚本：建表 + 写入排放因子库版本记录。

用法：
    .venv/bin/python scripts/init_db.py
"""
import json
import sys
from pathlib import Path

# 把 backend 根目录加到 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import engine, Base
from app import models  # noqa: F401  确保所有模型被 import
from app.config import settings


def main():
    print("=" * 50)
    print(f"数据库初始化 · {settings.database_url}")
    print("=" * 50)

    # 1. 建表
    print("\n[1/2] 建表...")
    Base.metadata.create_all(bind=engine)
    tables = list(Base.metadata.tables.keys())
    print(f"   ✅ 已建 {len(tables)} 张表：{', '.join(tables)}")

    # 2. 写入排放因子库版本记录
    print("\n[2/2] 写入排放因子库版本...")
    factor_path = Path(__file__).parent.parent / "app" / "data" / "emission_factors.json"
    if factor_path.exists():
        with open(factor_path) as f:
            factor_data = json.load(f)
        from app.database import SessionLocal
        from app.models import EmissionFactorLog
        with SessionLocal() as db:
            existing = db.get(EmissionFactorLog, factor_data["version"])
            if existing is None:
                log = EmissionFactorLog(
                    version=factor_data["version"],
                    note=f"initial import from emission_factors.json",
                    factor_count=len(factor_data.get("factors", [])),
                )
                db.add(log)
                db.commit()
                print(f"   ✅ 已写入版本 {factor_data['version']}（{len(factor_data.get('factors', []))} 个因子）")
            else:
                print(f"   ⏭  版本 {factor_data['version']} 已存在，跳过")
    else:
        print(f"   ⚠️  因子库文件不存在：{factor_path}")

    print("\n✅ 数据库初始化完成")


if __name__ == "__main__":
    main()
