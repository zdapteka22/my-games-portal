# -*- coding: utf-8 -*-
"""HTTP server without browser cache — always fresh files."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8765


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print("Портал любимых игр · Blue Cat")
    print("http://127.0.0.1:%s/" % PORT)
    print("http://127.0.0.1:%s/index.html" % PORT)
    print("Root:", ROOT)
    httpd.serve_forever()
