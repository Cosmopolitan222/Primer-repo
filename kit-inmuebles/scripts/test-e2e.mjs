// Prueba de extremo a extremo del generador en Chromium (Playwright):
// carga las fotos de demostración, rellena el formulario, genera Reel, vídeo 16:9,
// carrusel, story y ZIP, y comprueba los MP4 con ffprobe.
//   node kit-inmuebles/scripts/test-e2e.mjs [carpeta-salida] [--muestra] [--720]
// Requisitos: playwright (con Chromium) y ffprobe/ffmpeg en el PATH.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outDir = resolve(args.find((a) => !a.startsWith('--')) || join(root, 'muestras', 'salida-prueba'));
const sample = args.includes('--muestra');
const low = args.includes('--720');
const fontDir = process.env.MONTSERRAT_DIR; // opcional: carpeta con montserrat-latin-*-normal.woff2
mkdirSync(outDir, { recursive: true });

const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const ok = (m) => console.log('✓ ' + m);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => { errors.push('alert: ' + d.message()); d.dismiss(); });

// Fuentes: si hay copia local, se sirve en lugar de Google Fonts (el contenedor de pruebas no tiene salida directa)
await page.route(/fonts\.googleapis\.com/, async (route) => {
  if (!fontDir) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  const css = ['500', '600', '700', '800'].map((w) => {
    const b64 = readFileSync(join(fontDir, `montserrat-latin-${w}-normal.woff2`)).toString('base64');
    return `@font-face{font-family:'Montserrat';font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }).join('\n');
  return route.fulfill({ status: 200, contentType: 'text/css', body: css });
});
await page.route(/fonts\.gstatic\.com/, (r) => r.abort());

await page.goto('file://' + join(root, 'generador.html'));
await page.waitForFunction(() => window.KI_APP && document.querySelector('#support').className !== '');
const support = await page.textContent('#support');
console.log('Soporte del navegador:', support);

// 1) Fotos de demostración
const fotosDir = join(root, 'muestras', 'fotos-demo');
const fotos = readdirSync(fotosDir).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => join(fotosDir, f));
await page.setInputFiles('#photoInput', fotos);
await page.waitForFunction((n) => document.querySelectorAll('#photos .ph').length === n, fotos.length);
ok(`${fotos.length} fotos cargadas`);

// 2) Datos del anuncio y de la agencia (ficticios: vivienda de demostración)
const fill = async (sel, v) => page.fill(sel, String(v));
await page.selectOption('#op', 'venta');
await fill('#price', '245000');
await fill('#ref', 'DEMO-01');
await fill('#title', 'Piso reformado con terraza y mucha luz');
await fill('#location', 'Ruzafa, Valencia');
await fill('#rooms', 3);
await fill('#baths', 2);
await fill('#m2', 95);
// Punto fuerte de cada foto (la portada no lleva): orden de muestras/fotos-demo
const puntos = ['Cocina abierta totalmente equipada', 'Salón con salida a terraza orientada al sur', 'Dormitorio principal con armario empotrado', 'Baño completo reformado', '', 'Suelos de madera en toda la vivienda'];
const hiInputs = await page.$$('#photos input[data-f="highlight"]');
for (let i = 0; i < hiInputs.length && i < puntos.length; i++) if (puntos[i]) await hiInputs[i].fill(puntos[i]);
const capInputs = await page.$$('#photos input[data-f="caption"]');
if (capInputs[2]) await capInputs[2].fill('Terraza');
await fill('#agName', 'Inmobiliaria Mirador');
await fill('#phone', '960 000 000');
await fill('#whatsapp', '600 000 000');
await fill('#web', 'www.inmobiliaria-ejemplo.es');
await page.fill('#color', '#0f766e').catch(() => {});
await page.evaluate(() => { const c = document.querySelector('#color'); c.value = '#0f766e'; c.dispatchEvent(new Event('input')); });
const logo = join(root, '..', 'simulador-visitas', 'public', 'demo', 'logo.svg');
if (existsSync(logo)) { await page.setInputFiles('#logoInput', logo); await page.waitForFunction(() => !!window.KI_APP.collect().agency.logo); ok('logo cargado'); }
if (sample) { await page.check('#sample'); await fill('#wmText', 'Tu nombre · 600 000 000'); }
if (low) await page.selectOption('#quality', '720');
await page.waitForTimeout(600);

// Guardar perfil (localStorage) y comprobar que aparece
await page.click('#saveProfile');
const opts = await page.$$eval('#profile option', (o) => o.map((x) => x.value));
opts.includes('Inmobiliaria Mirador') ? ok('perfil de agencia guardado') : fail('el perfil no se guardó');

// Captura de la interfaz con la vista previa
await page.evaluate(() => { const b = document.querySelector('#play'); b.click(); });
await page.evaluate(() => { const s = document.querySelector('#scrub'); s.value = '120'; s.dispatchEvent(new Event('input')); });
await page.screenshot({ path: join(outDir, 'interfaz.png'), fullPage: false });

// 3) Generación desde los botones de la interfaz
async function clickAndWait(btn, kind, timeout = 600000) {
  const t0 = Date.now();
  await page.click(btn);
  await page.waitForFunction((k) => window.KI_APP.state.outputs[k] && !window.KI_APP.state.busy, kind, { timeout });
  return (Date.now() - t0) / 1000;
}
async function saveOutputs(kind) {
  const files = await page.evaluate(async (k) => {
    const out = [];
    for (const f of window.KI_APP.state.outputs[k].files) {
      const buf = new Uint8Array(await f.blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      out.push({ name: f.name, b64: btoa(bin) });
    }
    return out;
  }, kind);
  return files.map((f) => { const p = join(outDir, f.name); writeFileSync(p, Buffer.from(f.b64, 'base64')); return p; });
}
function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find((s) => s.codec_type === 'video');
  return { codec: v.codec_name, w: v.width, h: v.height, dur: Number(j.format.duration), frames: Number(v.nb_frames), fps: v.r_frame_rate, size: Number(j.format.size) };
}

const expect = low ? { reel: [720, 1280], wide: [1280, 720] } : { reel: [1080, 1920], wide: [1920, 1080] };
for (const [btn, kind] of [['#genReel', 'reel'], ['#genWide', 'wide']]) {
  const secs = await clickAndWait(btn, kind);
  const [file] = await saveOutputs(kind);
  const info = await page.evaluate(() => window.KI_APP.state.lastVideoInfo);
  const p = probe(file);
  console.log(`  ${kind}: ${p.codec} ${p.w}x${p.h} ${p.dur.toFixed(2)} s, ${p.frames} fotogramas, ${(p.size / 1e6).toFixed(1)} MB, generado en ${secs.toFixed(1)} s (${info.method}, ${info.codec})`);
  if (p.codec !== 'h264') fail(`${kind}: códec ${p.codec}`);
  else if (p.w !== expect[kind][0] || p.h !== expect[kind][1]) fail(`${kind}: tamaño ${p.w}x${p.h}`);
  else if (Math.abs(p.dur - info.duration) > 0.2) fail(`${kind}: duración ${p.dur} ≠ ${info.duration}`);
  else ok(`${kind} MP4 válido`);
  // decodificar el archivo entero para detectar corrupción
  try { execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']); ok(`${kind} se decodifica sin errores`); } catch (e) { fail(`${kind} no se decodifica: ${e.stderr}`); }
  // fotogramas de control
  const times = kind === 'reel' ? [1.6, 4.4, 6.6, 9.0, info.duration - 1] : [1.6, 4.4, info.duration - 1];
  times.forEach((t, i) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-q:v', '3', join(outDir, `fotograma-${kind}-${i + 1}.jpg`)]));
}

await clickAndWait('#genStills', 'stills');
const stills = await saveOutputs('stills');
stills.length >= 3 ? ok(`${stills.length} imágenes de carrusel/story`) : fail('faltan imágenes');

await clickAndWait('#genZip', 'zip');
const [zip] = await saveOutputs('zip');
try {
  const list = execFileSync('python3', ['-I', '-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("\\n".join(z.namelist()))', zip]).toString().trim().split('\n');
  list.some((n) => n.startsWith('texto-publicacion')) && list.some((n) => n.endsWith('.mp4')) ? ok(`ZIP íntegro con ${list.length} archivos`) : fail('ZIP incompleto');
} catch (e) { fail('ZIP corrupto: ' + e.message); }

const caption = await page.inputValue('#caption');
writeFileSync(join(outDir, 'texto-publicacion.txt'), caption);
caption.includes('245.000 €') && caption.includes('#') ? ok('texto de publicación generado') : fail('texto de publicación incorrecto');

// Vista móvil (sin desbordamiento horizontal)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
overflow <= 1 ? ok('sin scroll horizontal en móvil (390 px)') : fail(`desborda ${overflow}px en móvil`);
await page.screenshot({ path: join(outDir, 'interfaz-movil.png'), fullPage: false });

if (errors.length) fail('errores en la página:\n  ' + errors.join('\n  ')); else ok('sin errores de JavaScript');
await browser.close();
console.log(process.exitCode ? 'PRUEBA FALLIDA' : 'PRUEBA SUPERADA', '→', outDir);
