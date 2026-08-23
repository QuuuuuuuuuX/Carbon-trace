"""FastAPI 入口。"""
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from loguru import logger

from app.config import settings
from app.database import engine, Base
from app.limiter import limiter
from app.services.llm_client import deepseek


# ===== 日志配置 =====
logger.remove()
logger.add(
    sys.stdout,
    level=settings.log_level,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
)


# ===== 应用生命周期 =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时建表，关闭时清理。"""
    logger.info(f"🚀 启动 {settings.app_name} v{settings.app_version} ({settings.app_env})")
    await deepseek.start()
    yield
    logger.info("🛑 服务关闭")
    await deepseek.stop()
    engine.dispose()


# ===== FastAPI 实例 =====
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="个人碳账本 App · 清华绿创赛方案 B · 后端 API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 注册限流器
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== 全局异常处理 =====
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """兜底异常：500 错误统一格式。"""
    logger.exception(f"未处理异常 {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc) if settings.is_production is False else "Internal Server Error",
        },
    )


# ===== 根路径 =====
@app.get("/", tags=["基础"])
async def root():
    """服务存活 + 版本信息。"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "env": settings.app_env,
        "status": "running",
    }


@app.get("/healthz", tags=["基础"])
async def healthz():
    """健康检查（供 systemd / k8s liveness 探针）。"""
    return {"status": "ok"}


# ===== 路由注册（Phase 1 全部）=====
# Phase 1 真实现
from app.routers import auth
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])

# Phase 2/3 stub（占位 501）
from app.routers import carbon, points, character, world
app.include_router(carbon.router, prefix="/api/carbon", tags=["碳记录 (Phase 2)"])
app.include_router(points.router, prefix="/api/points", tags=["积分 (Phase 2)"])
app.include_router(character.router, prefix="/api/character", tags=["角色 (Phase 2)"])
app.include_router(world.router, prefix="/ws", tags=["世界 (Phase 3)"])


# ===== 启动（开发期直接 python app/main.py）=====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_production is False,
    )
