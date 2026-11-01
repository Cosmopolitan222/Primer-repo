#!/usr/bin/env node
// Uso:
//   node cli.js tienda1.es tienda2.com            -> analiza esas webs
//   node cli.js --file prospectos.txt --pdf       -> analiza una lista (una URL por línea) y genera PDFs
// Resultado en ./out/<dominio>/ : result.json, muestra.html, completo.html, [*.pdf], mensaje.txt
// y un resumen global en ./out/resumen.csv
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { scanSite } = require('./lib/scan');
const { renderReport, toPdf } = require('./lib/report');
const { outreachMessage } = require('./lib/outreach');

async function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  let urls = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--file', '--out', '--concurrency'].includes(args[i - 1])));
  if (val('--file')) urls.push(...fs.readFileSync(val('--file'), 'utf8').split(/\r?\n/).map((l) => l.split(/[,;\t]/)[0].trim()).filter((l) => l && !l.startsWith('#')));
  urls = [...new Set(urls)];
  if (!urls.length) { console.log('Uso: node cli.js <url> [url...] | --file lista.txt [--pdf] [--out carpeta] [--no-a11y]'); process.exit(1); }
  const outDir = val('--out') || 'out';
  const conc = Number(val('--concurrency') || 3);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const rows = [];
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const u = urls[next++];
      process.stdout.write(`→ ${u}\n`);
      const r = await scanSite(browser, u, { skipA11y: flag('--no-a11y') });
      const host = (() => { try { return new URL(r.finalUrl || r.url).host.replace(/^www\./, '').replace(':', '_'); } catch { return u.replace(/\W+/g, '_'); } })();
      const dir = path.join(outDir, host);
      fs.mkdirSync(dir, { recursive: true });
      const { screenshot, ...lean } = r;
      fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(lean, null, 2));
      if (r.ok) {
        const muestra = renderReport(r, 'muestra'); const completo = renderReport(r, 'completo');
        fs.writeFileSync(path.join(dir, 'muestra.html'), muestra);
        fs.writeFileSync(path.join(dir, 'completo.html'), completo);
        fs.writeFileSync(path.join(dir, 'mensaje.txt'), outreachMessage(r));
        if (flag('--pdf')) {
          await toPdf(browser, muestra, path.join(dir, `diagnostico-${host}.pdf`));
          await toPdf(browser, completo, path.join(dir, `informe-completo-${host}.pdf`));
        }
      }
      const pre = r.preConsent || { trackers: [], trackingCookies: [] };
      rows.push({
        dominio: host, ok: r.ok, error: r.error || '', riesgo: r.risk, plataforma: r.platform || '',
        rastreo_previo: pre.trackingCookies.length + pre.trackers.filter((t) => !t.soft).length > 0,
        servicios_previos: [...new Set([...pre.trackingCookies.map((c) => c.who), ...pre.trackers.filter((t) => !t.soft).map((t) => t.who)])].join(' | '),
        banner: r.banner ? r.banner.found : '', boton_rechazar: r.banner && r.banner.found ? r.banner.buttons.some((b) => b.kind === 'reject') : '',
        rechazo_ignorado: !!(r.afterReject && r.afterReject.clicked && (r.afterReject.trackers.length || r.afterReject.newTrackingCookies.length)),
        aviso_legal: r.legal ? !!r.legal.avisoLegal : '', privacidad: r.legal ? !!r.legal.privacidad : '',
        errores_accesibilidad: Array.isArray(r.a11y) ? r.a11y.length : '',
        incidencias_altas: r.findings.filter((f) => f.severity === 'alta').length,
      });
      console.log(`  ${r.ok ? `riesgo ${r.risk} · ${r.findings.length} incidencias` : 'ERROR ' + r.error}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(conc, urls.length) }, worker));
  await browser.close();

  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(','))].join('\n');
  fs.writeFileSync(path.join(outDir, 'resumen.csv'), csv);
  const ok = rows.filter((r) => r.ok);
  const pct = (n) => ok.length ? Math.round((100 * n) / ok.length) + '%' : '-';
  console.log(`\nAnalizadas: ${ok.length}/${rows.length}`);
  console.log(`Rastrean antes del consentimiento: ${pct(ok.filter((r) => r.rastreo_previo).length)}`);
  console.log(`Sin botón "Rechazar" en 1ª capa (o sin banner): ${pct(ok.filter((r) => !r.boton_rechazar).length)}`);
  console.log(`Riesgo ALTO: ${pct(ok.filter((r) => r.riesgo === 'ALTO').length)}`);
  console.log(`Resumen: ${path.join(outDir, 'resumen.csv')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
