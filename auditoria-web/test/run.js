// Prueba de extremo a extremo: levanta 3 tiendas locales y comprueba lo que detecta el escáner.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright'); const { scanSite } = require('../lib/scan'); const assert = require('assert');
const serve = (dir, port) => new Promise((ok) => {
  const s = http.createServer((q, r) => { const f = path.join(__dirname, 'sites', dir, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
    fs.readFile(f, (e, d) => { r.writeHead(e ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' }); r.end(e ? 'no' : d); }); });
  s.listen(port, () => ok(s)); });
(async () => {
  const servers = await Promise.all([serve('mala', 8201), serve('trampa', 8202), serve('buena', 8203)]);
  const b = await chromium.launch();
  const titles = async (p) => (await scanSite(b, 'http://localhost:' + p, {})).findings.map((f) => f.title);
  const mala = await titles(8201), trampa = await titles(8202), buena = await titles(8203);
  assert(mala.some((t) => t.includes('ANTES')), 'mala: rastreo previo');
  assert(mala.some((t) => t.includes('primera capa')), 'mala: sin rechazar');
  assert(mala.some((t) => t.includes('Aviso Legal')), 'mala: sin aviso legal');
  assert(trampa.some((t) => t.includes('no funciona')), 'trampa: rechazo ignorado');
  assert(trampa.some((t) => t.includes('NIF')), 'trampa: sin NIF');
  assert(!trampa.some((t) => t.includes('ANTES')), 'trampa: sin rastreo previo');
  assert.deepStrictEqual(buena.filter((t) => !t.includes('HTTPS')), [], 'buena: limpia salvo https local');
  console.log('OK · mala:', mala.length, '· trampa:', trampa.length, '· buena:', buena.length);
  await b.close(); servers.forEach((s) => s.close());
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
