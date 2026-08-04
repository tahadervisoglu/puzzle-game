// Geliştirme sunucusu — `node sunucu.js`, sonra http://localhost:8080
// Tek işi: dosyaları no-store ile sunmak. Tarayıcı önbelleği yüzünden
// olmayan hatayı aramamak için (README: diğer öğrenilenler).
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 8080;
var TIPLER = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

http.createServer(function (istek, cevap) {
  var yol = decodeURIComponent(istek.url.split('?')[0]);
  if (yol === '/') yol = '/index.html';
  var dosya = path.join(__dirname, path.normalize(yol));
  if (dosya.indexOf(__dirname) !== 0) { // dizin dışına çıkma denemesi
    cevap.writeHead(403); return cevap.end('403');
  }
  fs.readFile(dosya, function (hata, veri) {
    if (hata) { cevap.writeHead(404); return cevap.end('404 ' + yol); }
    cevap.writeHead(200, {
      'Content-Type': TIPLER[path.extname(dosya)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    cevap.end(veri);
  });
}).listen(PORT, function () {
  console.log('http://localhost:' + PORT);
});
