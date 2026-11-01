// Mensaje personalizado para el primer contacto (LinkedIn, formulario de contacto o en persona).
// Regla: aportar valor primero (el hallazgo y su prueba), sin presión y sin alarmismo.
const brand = require('../config.json');

function outreachMessage(r) {
  const host = (() => { try { return new URL(r.finalUrl || r.url).hostname.replace(/^www\./, ''); } catch { return r.inputUrl; } })();
  const top = r.findings[0];
  const pre = r.preConsent;
  const who = [...new Set([...pre.trackingCookies.map((c) => c.who), ...pre.trackers.filter((t) => !t.soft).map((t) => t.who)])];
  let hook;
  if (who.length) hook = `al entrar en ${host}, sin pulsar nada en el aviso de cookies, la web ya activa ${who.slice(0, 3).join(', ')}${who.length > 3 ? ' y otros' : ''}. La LSSI (art. 22.2) exige pedir permiso antes, y la AEPD lo sanciona también a pequeños comercios.`;
  else if (top) hook = `revisando ${host} he visto esto: ${top.title.charAt(0).toLowerCase() + top.title.slice(1)}.`;
  else hook = `he revisado ${host} y está bastante bien en cookies y textos legales.`;
  const rest = r.findings.length > 1 ? ` He encontrado ${r.findings.length - 1} punto(s) más.` : '';

  const linkedin = `Hola, [nombre]:

Soy ${brand.senderName}. Me dedico a revisar tiendas online para el cumplimiento de cookies y textos legales. Te escribo porque ${hook}${rest}

Te he preparado un diagnóstico gratuito de 2 páginas con las pruebas (captura y lista de cookies detectadas). ¿Te lo paso por aquí? Sin compromiso: si lo arregláis vosotros, perfecto.

Un saludo.`;

  const followup = `Hola de nuevo, [nombre]. Te dejo el diagnóstico de ${host} adjunto. Lo más urgente es el punto 1. Si queréis, os lo dejo resuelto yo (normalmente en 48 h) y os paso un informe de verificación después. ¿Os encaja?`;

  const phone = `Guion breve (llamada o visita):
"Hola, ¿hablo con quien lleva la tienda online? Soy ${brand.senderName}. Reviso webs de comercios para el tema de cookies y textos legales. He visto que ${hook.replace(/\s+/g, ' ')} ¿Te mando un resumen gratuito con las pruebas a un email que me indiques?"
(Si dice que sí: ya tienes su consentimiento para enviárselo.)`;

  return `=== ${host} · riesgo ${r.risk} · plataforma ${r.platform} ===

--- 1) Primer mensaje (LinkedIn / formulario de contacto) ---
${linkedin}

--- 2) Seguimiento (cuando responda que sí) ---
${followup}

--- 3) ${phone}
`;
}

module.exports = { outreachMessage };
