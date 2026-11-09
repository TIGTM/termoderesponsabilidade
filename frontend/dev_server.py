#Server python local para testes

from http.client import HTTPConnection
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

HOST = "127.0.0.1"
PORT = 5500
API_HOST = "127.0.0.1"
API_PORT = 5268
HOP_BY_HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
}


class TermoTiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def _proxy_api(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length else None
        headers = {
            name: value for name, value in self.headers.items()
            if name.lower() not in HOP_BY_HOP_HEADERS | {"host"}
        }
        headers["Host"] = f"{API_HOST}:{API_PORT}"

        connection = HTTPConnection(API_HOST, API_PORT, timeout=30)
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            response_body = response.read()
            self.send_response(response.status, response.reason)
            for name, value in response.getheaders():
                if name.lower() not in HOP_BY_HOP_HEADERS | {"content-length"}:
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)
        finally:
            connection.close()

    def _handle(self):
        if urlsplit(self.path).path.startswith("/api/"):
            self._proxy_api()
        else:
            super_method = getattr(super(), f"do_{self.command}", None)
            if super_method is None:
                self.send_error(405, "Method Not Allowed")
            else:
                super_method()

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def do_PUT(self):
        self._handle()

    def do_DELETE(self):
        self._handle()

    def do_PATCH(self):
        self._handle()


if __name__ == "__main__":
    print(f"Termo TI em http://localhost:{PORT}")
    ThreadingHTTPServer((HOST, PORT), TermoTiHandler).serve_forever()
