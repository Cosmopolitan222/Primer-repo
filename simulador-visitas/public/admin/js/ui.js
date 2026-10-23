/** Pequeñas utilidades de interfaz compartidas por el panel. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escapa texto para insertarlo de forma segura en HTML. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let toastTimer;
/** Mensaje temporal en la parte inferior de la pantalla. */
export function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), isError ? 5000 : 2200);
}

export function fmtDate(ms) {
  return ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export function fmtDuration(sec) {
  if (!sec) return '0 s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

/** Ejecuta fn como mucho una vez cada `ms` milisegundos tras el último cambio. */
export function debounce(fn, ms = 600) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado al portapapeles');
  } catch {
    toast('No se ha podido copiar; selecciona el texto y cópialo a mano', true);
  }
}
