"""DeepSeek LLM 客户端（异步队列框架 · Phase 2 实装调用）。

Phase 1 范围：
- 定义异步队列
- 提供 enqueue 接口（接 prompt → 排队 → 调 LLM → 返回）
- 失败 fallback 默认建议
"""
import asyncio
from typing import Callable, Awaitable

from loguru import logger
from openai import AsyncOpenAI

from app.config import settings


class DeepSeekClient:
    """DeepSeek 异步客户端 + 串行队列（防并发爆额度）。"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            timeout=settings.deepseek_timeout,
        )
        self.queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

    async def start(self):
        """启动后台 worker（应用启动时调用一次）。"""
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._worker(), name="deepseek-worker")
            logger.info("🤖 DeepSeek worker 已启动")

    async def stop(self):
        """关闭 worker。"""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
            logger.info("🤖 DeepSeek worker 已关闭")

    async def enqueue(
        self,
        prompt: str,
        system: str = "",
        fallback: str = "建议减少高碳活动，多用公共交通和节能设备。",
    ) -> str:
        """把 prompt 扔进队列，等结果。失败 → fallback。"""
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        await self.queue.put((prompt, system, fallback, future))
        return await future

    async def _worker(self):
        """后台串行消费队列。"""
        while True:
            prompt, system, fallback, future = await self.queue.get()
            try:
                messages = []
                if system:
                    messages.append({"role": "system", "content": system})
                messages.append({"role": "user", "content": prompt})

                response = await self.client.chat.completions.create(
                    model=settings.deepseek_model,
                    messages=messages,
                    max_tokens=512,
                )
                content = response.choices[0].message.content or fallback
                future.set_result(content)
            except Exception as e:
                logger.warning(f"DeepSeek 调用失败: {e}")
                future.set_result(fallback)
            finally:
                self.queue.task_done()


# 单例
deepseek = DeepSeekClient()
