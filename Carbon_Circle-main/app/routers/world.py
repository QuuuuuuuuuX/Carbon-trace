"""世界路由 · Phase 3 stub（WebSocket 占位）。"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/world")
async def world_socket(ws: WebSocket):
    """Phase 3 stub：接受连接、ping/pong、立即关闭。"""
    await ws.accept()
    try:
        await ws.send_json({
            "type": "stub",
            "message": "WS /ws/world 将在 Phase 3 (8/30-9/2) 实现",
            "phase": 3,
        })
        while True:
            data = await ws.receive_text()
            await ws.send_json({"type": "echo", "data": data})
    except WebSocketDisconnect:
        pass
