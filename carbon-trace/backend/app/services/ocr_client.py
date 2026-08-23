"""OCR 客户端（中转到队友 B 的端点 · Phase 2 实装调用）。

Phase 1 范围：
- 暴露 call_ocr(image_base64) 异步接口
- 转发到队友 B 的 /ocr 端点
- 失败 → 返回 None（前端用表单兜底）
"""
import base64
from typing import Any
import httpx

from loguru import logger

from app.config import settings


async def call_ocr(image_base64: str) -> dict[str, Any] | None:
    """调队友 B 的 OCR 端点，返回 {activity, value, unit} 或 None。"""
    try:
        async with httpx.AsyncClient(timeout=settings.ocr_service_timeout) as client:
            resp = await client.post(
                settings.ocr_service_url,
                json={"image_base64": image_base64},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"OCR 识别成功: {data}")
            return data
    except Exception as e:
        logger.warning(f"OCR 调用失败: {e}")
        return None
