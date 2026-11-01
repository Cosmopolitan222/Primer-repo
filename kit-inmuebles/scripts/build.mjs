// Genera kit-inmuebles/generador.html: un único archivo con todo el JavaScript dentro,
// para abrirlo con doble clic (sin servidor) o enviarlo por WhatsApp/email a uno mismo.
//   node kit-inmuebles/scripts/build.mjs
//   node kit-inmuebles/scripts/build.mjs --artifact <salida.html>   (versión para publicar en claude.ai)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'generador');
let html = readFileSync(join(dir, 'index.html'), 'utf8');

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = readFileSync(join(dir, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>/* ${src} */\n${code}\n</script>`;
});
if (/<script src=/.test(html)) throw new Error('Quedan scripts externos sin incrustar');

const i = process.argv.indexOf('--artifact');
let out = join(root, 'generador.html');
if (i > -1) {
  // El visor de claude.ai pone su propio esqueleto (doctype, html, head, body, charset y viewport).
  out = resolve(process.argv[i + 1]);
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/(<title>[^<]*<\/title>)/, '$1\n<meta name="claude:viewport-fit-sides" content="cover">');
}
writeFileSync(out, html);
console.log(`OK → ${out} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
