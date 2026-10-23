/**
 * Analítica anónima del recorrido (sin cookies).
 * Envía en lote: inicio de visita, estancias vistas, tiempo en cada estancia y clics de contacto.
 * Usa navigator.sendBeacon para no perder datos al cerrar la pestaña.
 */
export function createAnalytics(publicId, { enabled = true } = {}) {
  const url = `/api/public/tours/${encodeURIComponent(publicId)}/events`;
  const sid = sessionId();
  const device = matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  let queue = [];
  let current = null; // { roomId, since }

  function push(type, roomId, value) {
    if (!enabled) return;
    queue.push({ type, roomId, value });
    if (queue.length >= 20) flush();
  }

  function flush() {
    if (!queue.length) return;
    const body = JSON.stringify({ sid, device, events: queue });
    queue = [];
    if (!navigator.sendBeacon?.(url, body)) {
      fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }

  /** Cierra el tramo de tiempo de la estancia actual. */
  function closeDwell() {
    if (!current) return;
    const ms = performance.now() - current.since;
    if (ms > 500) push('dwell', current.roomId, Math.round(ms));
    current.since = performance.now();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      closeDwell();
      flush();
    } else if (current) {
      current.since = performance.now(); // no contamos el tiempo en segundo plano
    }
  });
  window.addEventListener('pagehide', () => { closeDwell(); flush(); });
  setInterval(flush, 15000);

  return {
    start() { push('start'); },
    room(roomId) {
      closeDwell();
      current = { roomId, since: performance.now() };
      push('room', roomId);
    },
    action(type) {
      push(type, current?.roomId);
      flush();
    },
  };
}

function sessionId() {
  try {
    let id = sessionStorage.getItem('vv_sid');
    if (!id) {
      id = crypto.randomUUID?.() || String(Math.random()).slice(2);
      sessionStorage.setItem('vv_sid', id);
    }
    return id;
  } catch {
    return String(Math.random()).slice(2);
  }
}
