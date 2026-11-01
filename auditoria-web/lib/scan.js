// Escáner de cumplimiento web: cookies (LSSI art. 22.2 + Guía AEPD), textos legales (LSSI art. 10),
// formularios (RGPD art. 13) y accesibilidad automática (WCAG 2.1 AA / UNE-EN 301549).
const fs = require('fs');
const path = require('path');
const R = require('./rules');

const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const AXE_ES = fs.readFileSync(path.join(path.dirname(require.resolve('axe-core/axe.min.js')), 'locales', 'es.json'), 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
const regDomain = (h) => h.split('.').slice(-2).join('.');

function classifyRequest(url, siteHost) {
  const h = hostOf(url);
  if (!h || regDomain(h) === regDomain(siteHost)) return null;
  let p = '';
  try { p = new URL(url).pathname; } catch {}
  for (const t of R.TRACKING_HOSTS) {
    if (t.re.test(h) && (!t.path || t.path.test(p))) return { kind: 'tracker', who: t.who, soft: !!t.soft, host: h };
  }
  for (const t of R.IP_LEAK_HOSTS) if (t.re.test(h)) return { kind: 'ipleak', who: t.who, host: h };
  return null;
}

function classifyCookie(c) {
  for (const t of R.TRACKING_COOKIES) if (t.re.test(c.name)) return t.who;
  return null;
}

// Se ejecuta dentro de la página: localiza el banner de cookies (atravesando shadow DOM abierto)
// y marca sus botones para poder pulsarlos después.
function inPageFindBanner(args) {
  const [acceptSrc, rejectSrc, settingsSrc, cmpSelectors] = args;
  const ACC = new RegExp(acceptSrc, 'i'), REJ = new RegExp(rejectSrc, 'i'), SET = new RegExp(settingsSrc, 'i');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const all = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      all.push(el);
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);
  let cmp = null;
  for (const c of cmpSelectors) {
    try { const el = document.querySelector(c.sel); if (el) { cmp = c.name; break; } } catch {}
  }
  const clickableSel = 'button, a, [role=button], input[type=button], input[type=submit], [onclick]';
  const textOf = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  let best = null;
  for (const el of all) {
    if (!visible(el)) continue;
    const t = (el.innerText || '').toLowerCase();
    if (!t.includes('cookie') || t.length > 4000 || t.length < 30) continue;
    const btns = [...el.querySelectorAll(clickableSel)].filter(visible);
    if (!btns.length || btns.length > 15) continue;
    const kinds = btns.map((b) => textOf(b));
    if (!kinds.some((k) => ACC.test(k) || REJ.test(k) || SET.test(k))) continue;
    if (!best || t.length < best.len) best = { el, len: t.length, btns };
  }
  if (!best) return { found: false, cmp };
  const buttons = best.btns.map((b, i) => {
    const text = textOf(b).slice(0, 60);
    const kind = REJ.test(text) ? 'reject' : ACC.test(text) ? 'accept' : SET.test(text) ? 'settings' : 'other';
    b.setAttribute('data-cw-btn', kind + '-' + i);
    const r = b.getBoundingClientRect();
    return { text, kind, mark: kind + '-' + i, area: Math.round(r.width * r.height) };
  });
  return {
    found: true,
    cmp,
    text: (best.el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400),
    buttons,
  };
}

function inPageInfo() {
  const links = [...document.querySelectorAll('a[href]')].map((a) => ({
    text: (a.innerText || a.getAttribute('aria-label') || a.title || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    href: a.href,
  }));
  const forms = [...document.querySelectorAll('form')].filter((f) => f.querySelector('input[type=email], input[name*=mail i]')).map((f) => {
    const txt = (f.innerText || '').toLowerCase();
    return {
      action: f.getAttribute('action') || '',
      hasCheckbox: !!f.querySelector('input[type=checkbox]'),
      mentionsPrivacy: /privacidad|privacy|protecci[oó]n de datos|rgpd|gdpr/.test(txt) || !!f.querySelector('a[href*=privac]'),
      isSearch: f.getAttribute('role') === 'search',
    };
  });
  const html = document.documentElement.outerHTML;
  let platform = 'Desconocida';
  if (window.Shopify || /cdn\.shopify\.com/.test(html)) platform = 'Shopify';
  else if (/woocommerce/.test(html)) platform = 'WordPress + WooCommerce';
  else if (/wp-content|wp-includes/.test(html)) platform = 'WordPress';
  else if (window.prestashop || /prestashop/i.test(html)) platform = 'PrestaShop';
  else if (/wixstatic\.com|_wix/.test(html)) platform = 'Wix';
  else if (/squarespace/.test(html)) platform = 'Squarespace';
  else if (/Magento|mage\/cookies/.test(html)) platform = 'Magento';
  return {
    title: document.title,
    lang: document.documentElement.lang || '',
    links,
    forms,
    bodyText: (document.body ? document.body.innerText : '').slice(-20000),
    platform,
  };
}

async function settle(page, ms = 9000) {
  await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => {});
  await sleep(2500);
}

async function runAxe(page) {
  try {
    await page.addScriptTag({ content: AXE_SRC });
    return await page.evaluate(async (loc) => {
      window.axe.configure({ locale: JSON.parse(loc) });
      const res = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations'],
      });
      return res.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, description: v.description, helpUrl: v.helpUrl,
        nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 160)),
      }));
    }, AXE_ES);
  } catch (e) {
    return { error: e.message };
  }
}

async function scanSite(browser, inputUrl, opts = {}) {
  const url = /^https?:\/\//i.test(inputUrl) ? inputUrl : 'https://' + inputUrl;
  const started = new Date();
  const result = { inputUrl, url, scannedAt: started.toISOString(), ok: false };
  const ctx = await browser.newContext({
    locale: 'es-ES',
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: false,
  });
  const reqs = [];
  ctx.on('request', (r) => reqs.push({ url: r.url(), t: Date.now() }));
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout || 30000 });
    result.httpStatus = resp ? resp.status() : null;
    await settle(page);
    result.finalUrl = page.url();
    result.https = result.finalUrl.startsWith('https://');
    const siteHost = hostOf(result.finalUrl);

    // 1) Estado ANTES de cualquier interacción
    const preCookies = await ctx.cookies();
    const preReqs = reqs.slice();
    result.screenshot = (await page.screenshot({ type: 'jpeg', quality: 60 })).toString('base64');

    const bannerArgs = [R.ACCEPT_RE.source, R.REJECT_RE.source, R.SETTINGS_RE.source, R.CMP_SELECTORS];
    let banner = { found: false };
    for (const f of page.frames()) {
      const b = await f.evaluate(inPageFindBanner, bannerArgs).catch(() => null);
      if (b && b.found) { banner = { ...b, frame: f === page.mainFrame() ? 'main' : f.url() }; break; }
      if (b && b.cmp && !banner.cmp) banner.cmp = b.cmp;
    }
    result.banner = banner;

    const info = await page.evaluate(inPageInfo);
    result.title = info.title; result.lang = info.lang; result.platform = info.platform; result.forms = info.forms;

    // 2) Accesibilidad (portada)
    if (!opts.skipA11y) result.a11y = await runAxe(page);

    // 3) Prueba de rechazo: pulsar "Rechazar" y navegar; ¿siguen cargando rastreadores?
    const reject = banner.found && banner.buttons.find((b) => b.kind === 'reject');
    if (reject) {
      try {
        const frame = banner.frame === 'main' ? page.mainFrame() : page.frames().find((f) => f.url() === banner.frame);
        await frame.locator(`[data-cw-btn="${reject.mark}"]`).first().click({ timeout: 5000 });
        await sleep(1500);
        const tReject = Date.now();
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await settle(page);
        const after = reqs.filter((r) => r.t >= tReject);
        result.afterReject = {
          clicked: true,
          trackers: dedupe(after.map((r) => classifyRequest(r.url, siteHost)).filter((c) => c && c.kind === 'tracker' && !c.soft)),
          newTrackingCookies: dedupe((await ctx.cookies())
            .filter((c) => !preCookies.find((p) => p.name === c.name && p.domain === c.domain))
            .map((c) => ({ name: c.name, who: classifyCookie(c) })).filter((c) => c.who)),
        };
      } catch (e) {
        result.afterReject = { clicked: false, error: e.message.split('\n')[0] };
      }
    }

    // 4) Textos legales
    const links = info.links;
    const legal = {};
    for (const [k, re] of Object.entries(R.LEGAL_LINKS)) {
      const l = links.find((x) => re.test(x.text) || re.test(decodeURIComponent(x.href).replace(/[-_/]/g, ' ')));
      legal[k] = l ? l.href : null;
    }
    legal.nifInHome = R.NIF_RE.test(info.bodyText);
    if (legal.avisoLegal && !opts.skipLegalFetch) {
      try {
        const p2 = await ctx.newPage();
        await p2.goto(legal.avisoLegal, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const t = await p2.evaluate(() => document.body.innerText);
        legal.nifInLegal = R.NIF_RE.test(t);
        legal.registroMercantil = /registro mercantil/i.test(t);
        legal.emailInLegal = /[\w.+-]+@[\w-]+\.[\w.]+/.test(t);
        await p2.close();
      } catch { legal.nifInLegal = null; }
    }
    result.legal = legal;

    // 5) Rastreo previo al consentimiento
    result.preConsent = {
      trackers: dedupe(preReqs.map((r) => classifyRequest(r.url, siteHost)).filter((c) => c && c.kind === 'tracker')),
      ipLeaks: dedupe(preReqs.map((r) => classifyRequest(r.url, siteHost)).filter((c) => c && c.kind === 'ipleak')),
      trackingCookies: dedupe(preCookies.map((c) => ({ name: c.name, who: classifyCookie(c) })).filter((c) => c.who)),
      totalCookies: preCookies.length,
    };
    result.ok = true;
  } catch (e) {
    result.error = e.message.split('\n')[0];
  } finally {
    await ctx.close().catch(() => {});
  }
  result.durationMs = Date.now() - started.getTime();
  result.findings = result.ok ? buildFindings(result) : [];
  result.risk = riskOf(result.findings);
  return result;
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((x) => { const k = JSON.stringify([x.who, x.name || x.host]); if (seen.has(k)) return false; seen.add(k); return true; });
}

const FIX = {
  cmp: {
    'Shopify': 'Activar el banner nativo de Shopify (Ajustes > Privacidad del cliente > Banner de cookies) con la opción "Rechazar" visible, o una app CMP gratuita, y comprobar que los píxeles se cargan mediante la Customer Privacy API.',
    'WordPress + WooCommerce': 'Instalar un plugin CMP gratuito (p. ej. Complianz o CookieYes), activar el bloqueo automático de scripts y mover Google Analytics / Meta Pixel a la categoría "Estadística" / "Marketing".',
    'WordPress': 'Instalar un plugin CMP gratuito (p. ej. Complianz o CookieYes), activar el bloqueo automático de scripts y mover Google Analytics / Meta Pixel a la categoría "Estadística" / "Marketing".',
    'PrestaShop': 'Configurar un módulo de cookies con bloqueo previo de scripts (p. ej. el módulo de consentimiento que ya tenga la tienda) y asignar cada etiqueta de terceros a su categoría.',
    default: 'Implantar una plataforma de gestión del consentimiento (CMP) que bloquee los scripts de analítica y publicidad hasta que el usuario acepte, y activar Google Consent Mode v2 si se usan productos de Google.',
  },
};

function buildFindings(r) {
  const F = [];
  const fixCmp = FIX.cmp[r.platform] || FIX.cmp.default;
  const pre = r.preConsent;
  const hardTrackers = pre.trackers.filter((t) => !t.soft);
  const whoList = [...new Set([...hardTrackers.map((t) => t.who), ...pre.trackingCookies.map((c) => c.who)])];

  if (whoList.length) {
    F.push({
      area: 'Cookies', severity: 'alta',
      title: 'Se instalan rastreadores ANTES de que el visitante acepte',
      detail: `Nada más abrir la web, sin pulsar ningún botón, se activan: ${whoList.join(', ')}. La LSSI (art. 22.2) y la Guía sobre el uso de cookies de la AEPD exigen consentimiento previo para cookies no técnicas. La AEPD ha multado este incumplimiento también a pequeños comercios online.`,
      evidence: [
        ...pre.trackingCookies.map((c) => `Cookie "${c.name}" (${c.who})`),
        ...hardTrackers.map((t) => `Petición a ${t.host} (${t.who})`),
      ].slice(0, 12),
      fix: fixCmp,
    });
  }
  if (r.afterReject && r.afterReject.clicked && (r.afterReject.trackers.length || r.afterReject.newTrackingCookies.length)) {
    const w = [...new Set([...r.afterReject.trackers.map((t) => t.who), ...r.afterReject.newTrackingCookies.map((c) => c.who)])];
    F.push({
      area: 'Cookies', severity: 'alta',
      title: 'El botón "Rechazar" no funciona: se sigue rastreando',
      detail: `Tras pulsar "${r.banner.buttons.find((b) => b.kind === 'reject').text}" y recargar, siguen activos: ${w.join(', ')}. Ignorar el rechazo equivale a no pedir consentimiento.`,
      evidence: [...r.afterReject.newTrackingCookies.map((c) => `Cookie "${c.name}" (${c.who})`), ...r.afterReject.trackers.map((t) => `Petición a ${t.host}`)].slice(0, 10),
      fix: fixCmp,
    });
  }
  if (!r.banner.found) {
    const needs = whoList.length > 0 || pre.trackers.length > 0;
    F.push({
      area: 'Cookies', severity: needs ? 'alta' : 'media',
      title: r.banner.cmp ? `No aparece un banner de cookies visible (hay ${r.banner.cmp} instalado, pero no se muestra al visitante)` : 'No hay banner de consentimiento de cookies',
      detail: needs
        ? 'La web usa servicios de analítica o publicidad pero no pide consentimiento al visitante en su primera visita.'
        : 'No se detecta banner. Si la web usa cualquier cookie no técnica (analítica, publicidad, vídeos, chat), necesita uno.',
      evidence: [],
      fix: fixCmp,
    });
  } else {
    const kinds = r.banner.buttons.map((b) => b.kind);
    if (!kinds.includes('reject')) {
      F.push({
        area: 'Cookies', severity: 'alta',
        title: 'El banner no permite rechazar en la primera capa',
        detail: 'Desde la actualización de la Guía de cookies de la AEPD (julio 2023), el botón para rechazar debe estar en la primera capa, al mismo nivel y con la misma facilidad que el de aceptar. Este banner solo ofrece: ' +
          r.banner.buttons.map((b) => `"${b.text}"`).join(', ') + '.',
        evidence: [`Texto del banner: "${r.banner.text.slice(0, 200)}…"`],
        fix: 'Añadir un botón "Rechazar todas" en la primera capa con el mismo tamaño, color y posición que "Aceptar".',
      });
    } else {
      const acc = r.banner.buttons.find((b) => b.kind === 'accept');
      const rej = r.banner.buttons.find((b) => b.kind === 'reject');
      if (acc && rej && acc.area > rej.area * 2.5) {
        F.push({
          area: 'Cookies', severity: 'media',
          title: 'El botón "Rechazar" es mucho menos visible que "Aceptar"',
          detail: `El botón de aceptar ocupa ${(acc.area / Math.max(rej.area, 1)).toFixed(1)} veces más superficie que el de rechazar. La AEPD considera que un diseño que empuja a aceptar no permite un consentimiento libre.`,
          evidence: [`Aceptar: "${acc.text}" · Rechazar: "${rej.text}"`],
          fix: 'Igualar tamaño y estilo de ambos botones.',
        });
      }
    }
  }
  if (!r.legal.avisoLegal) {
    F.push({
      area: 'Textos legales', severity: 'alta',
      title: 'No se encuentra el Aviso Legal',
      detail: 'La LSSI (art. 10) obliga a mostrar de forma permanente y accesible: titular, NIF, domicilio, email de contacto y, si procede, datos registrales. Su ausencia es infracción leve (hasta 30.000 €).',
      evidence: [r.legal.nifInHome ? 'Hay un NIF visible en la portada, pero no hay página de aviso legal enlazada.' : 'No se detecta enlace a aviso legal ni NIF en la portada.'],
      fix: 'Crear la página "Aviso legal" con los datos del art. 10 LSSI y enlazarla en el pie de todas las páginas.',
    });
  } else if (r.legal.nifInLegal === false && !r.legal.nifInHome) {
    F.push({
      area: 'Textos legales', severity: 'media',
      title: 'El Aviso Legal no muestra el NIF/CIF del titular',
      detail: 'El art. 10 LSSI exige identificar al titular con su NIF. No se ha encontrado ningún NIF/CIF en la página de aviso legal.',
      evidence: [`Página revisada: ${r.legal.avisoLegal}`],
      fix: 'Completar el aviso legal con razón social, NIF, domicilio, email y datos registrales.',
    });
  }
  if (!r.legal.privacidad) {
    F.push({
      area: 'Textos legales', severity: 'alta',
      title: 'No se encuentra la Política de Privacidad',
      detail: 'El RGPD (art. 13) obliga a informar a quien deja sus datos (pedidos, registro, newsletter) de quién los trata, para qué y qué derechos tiene.',
      evidence: [], fix: 'Publicar la Política de Privacidad y enlazarla en el pie y en cada formulario.',
    });
  }
  if (!r.legal.cookies && (whoList.length || r.banner.found)) {
    F.push({
      area: 'Textos legales', severity: 'media',
      title: 'No se encuentra la Política de Cookies',
      detail: 'La Guía de la AEPD exige una política de cookies accesible desde el banner y desde todas las páginas, con el listado de cookies, su finalidad y su duración.',
      evidence: [], fix: 'Publicar la Política de Cookies (la mayoría de CMP la generan automáticamente) y enlazarla en el banner y en el pie.',
    });
  }
  const badForms = (r.forms || []).filter((f) => !f.isSearch && !f.mentionsPrivacy);
  if (badForms.length) {
    F.push({
      area: 'Privacidad', severity: 'media',
      title: `${badForms.length === 1 ? 'Un formulario recoge' : badForms.length + ' formularios recogen'} emails sin informar sobre privacidad`,
      detail: 'Formularios de newsletter o contacto que piden el email sin enlazar la política de privacidad ni la información básica de protección de datos (RGPD art. 13).',
      evidence: badForms.slice(0, 3).map((f) => `Formulario${f.action ? ' → ' + f.action.slice(0, 80) : ''}`),
      fix: 'Añadir bajo el botón la "primera capa" informativa (responsable, finalidad, derechos) y el enlace a la política de privacidad.',
    });
  }
  if (r.preConsent.ipLeaks.length) {
    F.push({
      area: 'Privacidad', severity: 'baja',
      title: 'Se envía la IP del visitante a terceros sin necesidad',
      detail: 'Algunos recursos se cargan desde servidores de terceros fuera del control de la tienda. Un tribunal alemán (LG München, 2022) condenó el uso de Google Fonts remotas sin consentimiento. Es una mejora sencilla.',
      evidence: r.preConsent.ipLeaks.map((t) => `${t.who} (${t.host})`),
      fix: 'Alojar las fuentes en el propio servidor y usar youtube-nocookie.com / carga diferida para mapas y vídeos.',
    });
  }
  if (!r.https) {
    F.push({ area: 'Seguridad', severity: 'alta', title: 'La web no usa HTTPS', detail: 'Los datos viajan sin cifrar. El RGPD (art. 32) exige medidas técnicas de seguridad adecuadas.', evidence: [r.finalUrl], fix: 'Activar un certificado SSL (gratuito con Let\'s Encrypt) y redirigir todo a https.' });
  }
  if (Array.isArray(r.a11y) && r.a11y.length) {
    const serious = r.a11y.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const total = r.a11y.reduce((s, v) => s + v.nodes, 0);
    F.push({
      area: 'Accesibilidad', severity: serious.length >= 3 ? 'media' : 'baja',
      title: `${r.a11y.length} tipos de errores de accesibilidad (${total} elementos afectados) en la portada`,
      detail: 'Desde el 28/06/2025, la Ley 11/2023 (Acta Europea de Accesibilidad) exige que las tiendas online cumplan la norma UNE-EN 301549 (WCAG 2.1 AA). Están exentas las microempresas (menos de 10 empleados y ≤ 2 M€ de facturación). Revisión automática: los errores reales suelen ser más.',
      evidence: r.a11y.slice().sort((a, b) => rank(a.impact) - rank(b.impact)).slice(0, 8).map((v) => `[${impactEs(v.impact)}] ${v.help} — ${v.nodes} elemento(s)`),
      fix: 'Corregir primero los errores críticos y graves (textos alternativos, contraste, etiquetas de formularios, nombres de botones).',
    });
  }
  const order = { alta: 0, media: 1, baja: 2 };
  return F.sort((a, b) => order[a.severity] - order[b.severity]);
}

const rank = (i) => ({ critical: 0, serious: 1, moderate: 2, minor: 3 }[i] ?? 4);
const impactEs = (i) => ({ critical: 'Crítico', serious: 'Grave', moderate: 'Moderado', minor: 'Leve' }[i] || i);

function riskOf(findings) {
  const legal = findings.filter((f) => f.area !== 'Accesibilidad');
  if (legal.some((f) => f.severity === 'alta')) return 'ALTO';
  if (legal.some((f) => f.severity === 'media')) return 'MEDIO';
  return 'BAJO';
}

module.exports = { scanSite, impactEs };
