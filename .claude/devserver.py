# Gelistirme sunucusu: tarayici eski dosyalari onbellekten kullanmasin diye
# her yanita no-store ekler. Sadece test icindir, oyunun bir parcasi degildir.
import http.server
import socketserver

PORT = 5300


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
        print('devserver http://localhost:%d' % PORT)
        httpd.serve_forever()
