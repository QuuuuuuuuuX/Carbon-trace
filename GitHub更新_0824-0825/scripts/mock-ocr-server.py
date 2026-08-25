#!/usr/bin/env python3
"""Mock OCR 服务（本地联调用，队友B 真服务就绪后可移除）

协议（与后端 ocr_client.py 对齐）:
    POST /ocr   body: {"image_base64": "<base64>"}
    → 200 {"category": "...", "activity": "...", "value": 1, "unit": "份"}
"""
import json
import random
from http.server import BaseHTTPRequestHandler, HTTPServer

SAMPLES = [
    {"category": "food", "activity": "牛肉饭", "value": 1, "unit": "份"},
    {"category": "transport", "activity": "打车", "value": 8, "unit": "km"},
    {"category": "electricity", "activity": "用电", "value": 5, "unit": "度"},
    {"category": "consumption", "activity": "外卖", "value": 1, "unit": "单"},
]


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/ocr":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            body = {}
        img = body.get("image_base64", "")
        print(f"[mock-ocr] 收到图片 base64 {len(img)} 字符 → 返回示例识别结果")
        result = random.choice(SAMPLES)
        data = json.dumps(result, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Mock OCR 服务: http://127.0.0.1:9001/ocr  (Ctrl+C 退出)")
    HTTPServer(("127.0.0.1", 9001), Handler).serve_forever()
