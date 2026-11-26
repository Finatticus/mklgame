"""本機開發伺服器：python tools/serve.py [port]
明確指定 MIME（Windows 登錄檔常把 .js 設錯），並提供 POST /__save/<path> 供素材轉檔工具寫檔。"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
    '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def guess_type(self, path):
        return TYPES.get(os.path.splitext(path)[1].lower(), 'application/octet-stream')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if not self.path.startswith('/__save/'):
            self.send_error(404)
            return
        rel = self.path[len('/__save/'):]
        dest = os.path.normpath(os.path.join(ROOT, rel))
        if not dest.startswith(ROOT):
            self.send_error(400)
            return
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(dest, 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    port = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
