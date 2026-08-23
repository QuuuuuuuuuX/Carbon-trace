"""排放因子库匹配 · 碳核算引擎核心。

Phase 1 范围：
- 从 emission_factors.json 加载因子
- 提供 match(category, activity, value) → (co2_kg, matched_factor) 接口
- 找不到时返回 None
"""
import json
from pathlib import Path
from typing import Any

from loguru import logger


class CarbonCalculator:
    def __init__(self, factor_path: Path | None = None):
        if factor_path is None:
            factor_path = Path(__file__).parent.parent / "data" / "emission_factors.json"
        self.factor_path = factor_path
        self.factors: list[dict[str, Any]] = []
        self.version: str = "v0"
        self._load()

    def _load(self):
        if not self.factor_path.exists():
            logger.warning(f"排放因子库文件不存在：{self.factor_path}")
            return
        with open(self.factor_path) as f:
            data = json.load(f)
        self.version = data.get("version", "v0")
        self.factors = data.get("factors", [])
        logger.info(f"📊 加载排放因子库 {self.version}（{len(self.factors)} 个因子）")

    def match(self, category: str, activity: str, value: float) -> tuple[float | None, dict | None]:
        """根据 category + activity 查因子，返回 (co2_kg, factor_dict)。

        Phase 1 简单匹配：category + activity 都相等。
        """
        for f in self.factors:
            if f["category"] == category and f["activity"] == activity:
                co2_kg = round(value * f["factor_kgco2_per_unit"], 4)
                return co2_kg, f
        return None, None


calculator = CarbonCalculator()
