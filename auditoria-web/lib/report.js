// Genera el informe HTML (y PDF) en dos versiones:
//  - "muestra": gratuita, para captar. Enseña el riesgo y las pruebas, no cómo arreglarlo.
//  - "completo": el producto de pago. Incluye pruebas, solución paso a paso y accesibilidad detallada.
const brand = require('../config.json');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SEV = { alta: ['Alta', '#b42318', '#fef3f2'], media: ['Media', '#b54708', '#fffaeb'], baja: ['Baja', '#175cd3', '#eff8ff'] };
const RISK = { ALTO: '#b42318', MEDIO: '#b54708', BAJO: '#067647' };

function renderReport(r, mode = 'completo') {
  const full = mode === 'completo';
  const host = (() => { try { return new URL(r.finalUrl || r.url).hostname; } catch { return r.inputUrl; } })();
  const date = new Date(r.scannedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const counts = ['alta', 'media', 'baja'].map((s) => r.findings.filter((f) => f.severity === s).length);
  const findings = full ? r.findings : r.findings.slice(0, 2);
  const hidden = r.findings.length - findings.length;

  const fcard = (f, i) => `
    <section class="f" style="border-left-color:${SEV[f.severity][1]}">
      <div class="fh"><span class="n">${i + 1}</span><span class="tag" style="color:${SEV[f.severity][1]};background:${SEV[f.severity][2]}">Gravedad ${SEV[f.severity][0]}</span><span class="area">${esc(f.area)}</span></div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.detail)}</p>
      ${f.evidence.length ? `<div class="ev"><b>Pruebas registradas</b><ul>${f.evidence.map((e) => `<li><code>${esc(e)}</code></li>`).join('')}</ul></div>` : ''}
      ${full ? `<div class="fix"><b>Cómo solucionarlo</b><p>${esc(f.fix)}</p></div>` : ''}
    </section>`;

  const a11yTable = full && Array.isArray(r.a11y) && r.a11y.length ? `
    <h2>Anexo: detalle de accesibilidad (WCAG 2.1 AA)</h2>
    <table><thead><tr><th>Impacto</th><th>Problema</th><th>Elementos</th></tr></thead><tbody>
    ${r.a11y.map((v) => `<tr><td>${esc(require('./scan').impactEs(v.impact))}</td><td>${esc(v.help)}<br><small><code>${esc(v.sample[0] || '')}</code></small></td><td>${v.nodes}</td></tr>`).join('')}
    </tbody></table>` : '';

  const pre = r.preConsent || { trackers: [], trackingCookies: [], totalCookies: 0 };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe de cumplimiento web · ${esc(host)}</title>
<style>
:root{--ink:#101828;--mut:#475467;--line:#e4e7ec;--acc:${brand.color}}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
.w{max-width:860px;margin:0 auto;padding:32px 24px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid var(--acc);padding-bottom:16px}
.logo{font-weight:800;font-size:20px;color:var(--acc)}.meta{color:var(--mut);font-size:13px;text-align:right}
h1{font-size:26px;margin:24px 0 4px}h2{font-size:19px;margin:32px 0 12px}h3{font-size:17px;margin:6px 0}
.sum{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:12px;margin:20px 0}
.k{border:1px solid var(--line);border-radius:10px;padding:14px}.k b{display:block;font-size:26px}.k span{color:var(--mut);font-size:13px}
.f{border:1px solid var(--line);border-left:5px solid;border-radius:10px;padding:16px 18px;margin:14px 0;break-inside:avoid}
.fh{display:flex;gap:10px;align-items:center;font-size:12px}.n{font-weight:700;color:var(--mut)}.tag{padding:2px 8px;border-radius:99px;font-weight:600}.area{color:var(--mut)}
.ev{background:#f9fafb;border-radius:8px;padding:10px 12px;font-size:13px}.ev ul{margin:6px 0 0;padding-left:18px}code{font-size:12px;word-break:break-all}
.fix{background:#ecfdf3;border-radius:8px;padding:10px 12px;margin-top:10px;font-size:14px}.fix p{margin:4px 0 0}
.lock{border:2px dashed var(--acc);border-radius:12px;padding:18px;text-align:center;margin:20px 0}
.cta{display:inline-block;background:var(--acc);color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:6px}
.shot{width:100%;border:1px solid var(--line);border-radius:8px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
footer{margin-top:36px;border-top:1px solid var(--line);padding-top:12px;color:var(--mut);font-size:12px}
@media (max-width:640px){.sum{grid-template-columns:1fr 1fr}.meta{text-align:left}header{flex-direction:column}}
@media print{.w{padding:0}.cta{display:none}}
</style></head><body><div class="w">
<header><div class="logo">${esc(brand.name)}</div><div class="meta">${full ? 'Informe completo' : 'Diagnóstico gratuito (resumen)'}<br>${esc(date)}</div></header>
<h1>${esc(host)}</h1>
<div style="color:var(--mut)">Plataforma detectada: ${esc(r.platform || '—')} · Revisión automatizada de la portada con un navegador real, sin aceptar cookies.</div>
<div class="sum">
  <div class="k"><span>Nivel de riesgo legal</span><b style="color:${RISK[r.risk]}">${r.risk}</b></div>
  <div class="k"><span>Gravedad alta</span><b>${counts[0]}</b></div>
  <div class="k"><span>Gravedad media</span><b>${counts[1]}</b></div>
  <div class="k"><span>Gravedad baja</span><b>${counts[2]}</b></div>
</div>
<div class="k" style="margin-bottom:8px"><span>Antes de que el visitante acepte nada, la web ya había instalado</span>
${(() => { const c = pre.trackingCookies.length, s = new Set(pre.trackers.filter((t) => !t.soft).map((t) => t.who)).size;
  return `<b style="font-size:18px">${c} ${c === 1 ? 'cookie' : 'cookies'} de rastreo y ${s} ${s === 1 ? 'conexión' : 'conexiones'} a servicios de analítica/publicidad</b>`; })()}</div>
${r.screenshot ? `<h2>Lo que ve un visitante al entrar</h2><img class="shot" alt="Captura de la portada de ${esc(host)} en el momento del análisis" src="data:image/jpeg;base64,${r.screenshot}">` : ''}
<h2>${full ? 'Incidencias detectadas' : 'Principales incidencias'}</h2>
${findings.length ? findings.map(fcard).join('') : '<p>No se han detectado incidencias en la revisión automática. ¡Buen trabajo!</p>'}
${!full && hidden > 0 ? `<div class="lock"><b>${hidden} incidencia(s) más</b> y la solución paso a paso para ${esc(r.platform && r.platform !== 'Desconocida' ? r.platform : 'tu plataforma')} están en el informe completo.<br>
<a class="cta" href="${esc(brand.url)}">Ver opciones</a></div>` : ''}
${!full && hidden <= 0 && findings.length ? `<div class="lock">La solución paso a paso para ${esc(r.platform && r.platform !== 'Desconocida' ? r.platform : 'tu plataforma')} está en el informe completo.<br><a class="cta" href="${esc(brand.url)}">Ver opciones</a></div>` : ''}
${a11yTable}
<footer>
<b>Alcance y limitaciones.</b> Revisión técnica automatizada de la página de inicio en la fecha indicada, sin iniciar sesión ni aceptar cookies. Las detecciones de rastreadores son hechos verificables (cookies y peticiones registradas por el navegador). Las referencias normativas (LSSI, RGPD, Guía de cookies de la AEPD, Ley 11/2023) son orientativas: este informe <b>no constituye asesoramiento jurídico</b>. La revisión de accesibilidad automática detecta en torno a un tercio de los problemas posibles.<br><br>
${esc(brand.name)} · ${esc(brand.contact)}
</footer>
</div></body></html>`;
}

async function toPdf(browser, html, outFile) {
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: outFile, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  await p.close();
}

module.exports = { renderReport, toPdf };
