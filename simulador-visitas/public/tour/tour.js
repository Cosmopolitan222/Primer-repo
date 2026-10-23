/**
 * Visor público del recorrido virtual.
 *
 * Combina dos visores según el tipo de foto de cada estancia:
 *   - 360° (equirectangular) → Pannellum (WebGL, giroscopio, hotspots).
 *   - Foto normal            → FlatViewer (Ken Burns, zoom, hotspots en %).
 *
 * Parámetros de URL opcionales:
 *   ?autoplay=1   empieza el recorrido automático
 *   ?room=<id>    estancia inicial
 *   ?token=...    vista previa de borradores desde el panel (no cuenta estadísticas)
 */
import { FlatViewer } from './flat-viewer.js';
import { createAnalytics } from './analytics.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const publicId = location.pathname.split('/').filter(Boolean)[1];
const isPreview = params.has('token');

const state = {
  tour: null,
  roomsById: new Map(),
  current: null,
  pano: null,       // instancia de Pannellum
  flat: null,       // instancia de FlatViewer
  mode: null,       // 'pano' | 'flat'
  playing: false,
  playTimer: null,
  hdTimer: null,
};
let analytics;

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
init().catch((err) => showError(err.message || 'No se ha podido cargar el recorrido.'));

async function init() {
  let tour = window.__TOUR__;
  if (!tour) {
    const qs = isPreview ? `?token=${encodeURIComponent(params.get('token'))}` : '';
    const res = await fetch(`/api/public/tours/${encodeURIComponent(publicId)}${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Recorrido no encontrado');
    tour = data;
  }
  if (!tour.rooms.length) throw new Error('Este recorrido todavía no tiene estancias.');
  state.tour = tour;
  tour.rooms.forEach((r) => state.roomsById.set(r.id, r));

  applyBranding(tour);
  buildRoomStrip(tour);
  buildPlan(tour);
  bindControls();
  await waitFor(() => window.pannellum);

  analytics = createAnalytics(publicId, { enabled: !isPreview && tour.status === 'published' });
  analytics.start();

  const first = state.roomsById.get(params.get('room')) || state.roomsById.get(tour.startRoomId) || tour.rooms[0];
  await goToRoom(first.id, { instant: true });
  $('tour').classList.remove('is-loading');
  if (params.get('autoplay') === '1') setPlaying(true);

  // Precarga ligera de las previews del resto de estancias para que los saltos sean instantáneos
  setTimeout(() => tour.rooms.forEach((r) => { new Image().src = r.preview; }), 1500);
}

function applyBranding(tour) {
  const a = tour.agency;
  const root = document.documentElement.style;
  if (a.colorPrimary) root.setProperty('--brand', a.colorPrimary);
  if (a.colorAccent) root.setProperty('--accent', a.colorAccent);
  if (a.logoUrl) {
    $('brand-logo').src = a.logoUrl;
    $('loader-logo').src = a.logoUrl;
    $('loader-logo').hidden = false;
  }
  $('brand-name').textContent = a.logoUrl ? '' : a.name;
  if (a.website) $('brand').href = a.website;
  else $('brand').removeAttribute('href');
  $('contact-agency').textContent = `${a.name}${tour.price ? ` · ${tour.price}` : ''}`;

  const msg = `Hola, he visto la visita virtual de "${tour.title}" y me gustaría recibir más información. ${location.origin}/t/${tour.id}`;
  if (a.whatsapp) {
    $('c-whatsapp').href = `https://wa.me/${a.whatsapp}?text=${encodeURIComponent(msg)}`;
    $('c-whatsapp').hidden = false;
  }
  if (a.phone) {
    $('c-call').href = `tel:${a.phone.replace(/\s/g, '')}`;
    $('c-call').hidden = false;
  }
  if (a.email) {
    $('c-email').href = `mailto:${a.email}?subject=${encodeURIComponent(tour.title)}&body=${encodeURIComponent(msg)}`;
    $('c-email').hidden = false;
  }
  $('ri-prop-title').textContent = tour.title;
  $('ri-prop-meta').textContent = [tour.price, tour.address].filter(Boolean).join(' · ');
  $('ri-prop-desc').textContent = tour.description || '';
}

// ---------------------------------------------------------------------------
// Navegación entre estancias
// ---------------------------------------------------------------------------
async function goToRoom(roomId, { instant = false } = {}) {
  const room = state.roomsById.get(roomId);
  if (!room || room === state.current) return;
  const prevMode = state.mode;
  state.current = room;
  clearTimeout(state.hdTimer);
  analytics?.room(room.id);
  updateRoomUi(room);
  closeCards();

  if (room.kind === 'pano') {
    if (prevMode === 'flat' && !instant) await fade(true);
    showLayer('pano');
    await showPano(room);
    if (prevMode === 'flat' && !instant) fade(false);
  } else {
    if (!instant) await fade(true);
    showLayer('flat');
    if (!state.flat) state.flat = new FlatViewer($('flat'), { onHotspot, onInteract: userInteracted, renderHotspot });
    await state.flat.show(room);
    if (!instant) fade(false);
    state.flat.startKenBurns(state.playing ? state.tour.autoplaySeconds : 14);
  }
  if (state.playing) schedulePlayStep();
}

function showLayer(mode) {
  state.mode = mode;
  $('pano').hidden = mode !== 'pano';
  $('flat').hidden = mode !== 'flat';
  $('btn-gyro').hidden = mode !== 'pano' || !state.pano?.isOrientationSupported?.();
  if (mode === 'pano') state.pano?.resize();
  else state.pano?.stopAutoRotate();
}

/** Fundido a negro para transiciones entre tipos de visor. */
function fade(on) {
  $('fade').classList.toggle('on', on);
  return new Promise((r) => setTimeout(r, on ? 350 : 0));
}

// ---------------------------------------------------------------------------
// Panorámicas 360° (Pannellum)
// ---------------------------------------------------------------------------
function panoScene(room, hd) {
  // En móvil vertical un campo de visión horizontal amplio deforma mucho la imagen
  const portrait = innerHeight > innerWidth;
  return {
    type: 'equirectangular',
    panorama: hd ? room.full : room.preview || room.full,
    yaw: room.initYaw ?? 0,
    pitch: room.initPitch ?? 0,
    hfov: portrait ? Math.min(room.initHfov ?? 100, 70) : room.initHfov ?? 100,
    hotSpots: room.hotspots.map((h) => ({
      pitch: h.pitch ?? 0,
      yaw: h.yaw ?? 0,
      cssClass: 'hs-pnlm',
      createTooltipFunc: (div) => {
        div.classList.add('hs');
        div.replaceChildren(...renderHotspot(h).childNodes);
        div.classList.add(h.kind === 'link' ? 'hs-link' : 'hs-info');
      },
      clickHandlerFunc: () => onHotspot(h),
    })),
  };
}

function showPano(room) {
  return new Promise((resolve) => {
    const sceneId = room.id;
    const onLoad = () => {
      resolve();
      // Tras pintar la versión ligera, carga la de alta resolución y cambia sin saltos
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (state.current !== room || !state.pano) return;
        const v = state.pano;
        state.hdTimer = setTimeout(() => {
          if (state.current === room) v.loadScene(`${room.id}__hd`, v.getPitch(), v.getYaw(), v.getHfov());
        }, 150);
      };
      if (room.full !== room.preview) img.src = room.full;
    };

    if (!state.pano) {
      const scenes = {};
      for (const r of state.tour.rooms) {
        if (r.kind !== 'pano') continue;
        scenes[r.id] = panoScene(r, false);
        scenes[`${r.id}__hd`] = panoScene(r, true);
      }
      state.pano = window.pannellum.viewer('pano', {
        default: { firstScene: sceneId, sceneFadeDuration: 700, autoLoad: true },
        scenes,
        showControls: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        keyboardZoom: true,
        friction: 0.12,
        minHfov: 40,
        maxHfov: 120,
        compass: false,
        strings: { loadingLabel: 'Cargando…' },
      });
      state.pano.on('mousedown', userInteracted);
      state.pano.on('touchstart', userInteracted);
      state.pano.on('load', () => {
        $('btn-gyro').hidden = state.mode !== 'pano' || !state.pano.isOrientationSupported();
      });
      state.pano.on('error', (msg) => console.warn('Pannellum:', msg));
      state.pano.on('load', function first() {
        state.pano.off('load', first);
        onLoad();
      });
    } else {
      const v = state.pano;
      v.on('load', function once() {
        v.off('load', once);
        onLoad();
      });
      v.stopAutoRotate();
      v.loadScene(sceneId);
    }
  });
}

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------
/** Crea el nodo visual de un hotspot (lo usan ambos visores). */
function renderHotspot(h) {
  const node = document.createElement('div');
  node.className = `hs ${h.kind === 'link' ? 'hs-link' : 'hs-info'}`;
  const icon = document.createElement('span');
  icon.className = 'hs-icon';
  if (h.kind === 'info') icon.textContent = 'i';
  const label = document.createElement('span');
  label.className = 'hs-label';
  if (h.kind === 'link') {
    const target = state.roomsById.get(h.target);
    label.textContent = h.label || target?.name || 'Ir';
    const meta = [target?.areaM2 && `${fmtNum(target.areaM2)} m²`, target?.orientation && target.orientation !== '—' && target.orientation].filter(Boolean).join(' · ');
    if (meta) {
      const small = document.createElement('small');
      small.textContent = meta;
      label.append(small);
    }
  } else {
    label.textContent = h.label || 'Información';
  }
  node.append(icon, label);
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', label.textContent);
  return node;
}

function onHotspot(h) {
  userInteracted();
  if (h.kind === 'link') return goToRoom(h.target);
  $('hs-title').textContent = h.label || 'Información';
  $('hs-text').textContent = h.text || '';
  $('room-info').hidden = true;
  $('hs-card').hidden = false;
}

// ---------------------------------------------------------------------------
// Interfaz: estancias, plano, controles
// ---------------------------------------------------------------------------
function buildRoomStrip(tour) {
  const nav = $('rooms');
  for (const r of tour.rooms) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'room-btn';
    b.dataset.room = r.id;
    b.innerHTML = '<img alt="" loading="lazy"><span></span>';
    b.querySelector('img').src = r.thumb || r.preview;
    b.querySelector('span').textContent = r.name;
    if (r.kind === 'pano') {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = '360°';
      b.append(badge);
    }
    b.addEventListener('click', () => { userInteracted(); goToRoom(r.id); });
    nav.append(b);
  }
  // En pantallas pequeñas la tira empieza plegada para dejar ver la foto
  if (innerHeight < 560) nav.classList.add('collapsed');
}

function buildPlan(tour) {
  const placed = tour.rooms.filter((r) => r.planX != null && r.planY != null);
  if (!tour.planUrl) return;
  $('plan-img').src = tour.planUrl;
  $('btn-plan').hidden = false;
  const dots = $('plan-dots');
  for (const r of placed) {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'plan-dot';
    d.style.left = `${r.planX}%`;
    d.style.top = `${r.planY}%`;
    d.title = r.name;
    d.dataset.room = r.id;
    d.addEventListener('click', () => { userInteracted(); goToRoom(r.id); });
    dots.append(d);
  }
  // Visible de entrada en pantallas grandes
  if (innerWidth >= 900) togglePlan(true);
}

function togglePlan(force) {
  const show = force ?? $('plan').hidden;
  $('plan').hidden = !show;
  $('btn-plan').classList.toggle('active', show);
}

function updateRoomUi(room) {
  $('room-name').textContent = room.name;
  const meta = [room.areaM2 && `${fmtNum(room.areaM2)} m²`, room.orientation && room.orientation !== '—' && room.orientation].filter(Boolean).join(' · ');
  $('room-info-btn').textContent = meta ? `${meta}  ⓘ` : 'ⓘ';
  $('ri-title').textContent = room.name;
  $('ri-meta').textContent = meta;
  $('ri-features').textContent = room.features || '';
  document.querySelectorAll('[data-room]').forEach((el) => el.classList.toggle('current', el.dataset.room === room.id));
  document.querySelector('.room-btn.current')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  document.querySelectorAll('.plan-dot').forEach((el) => el.classList.toggle('current', el.dataset.room === room.id));
}

function closeCards() {
  $('hs-card').hidden = true;
  $('room-info').hidden = true;
  $('room-info-btn').setAttribute('aria-expanded', 'false');
}

function bindControls() {
  $('btn-next').onclick = () => { userInteracted(); step(1); };
  $('btn-prev').onclick = () => { userInteracted(); step(-1); };
  $('btn-play').onclick = () => setPlaying(!state.playing);
  $('btn-zoom-in').onclick = () => zoom(1.25);
  $('btn-zoom-out').onclick = () => zoom(0.8);
  $('btn-plan').onclick = () => togglePlan();
  $('btn-rooms').onclick = () => $('rooms').classList.toggle('collapsed');
  $('btn-fs').onclick = toggleFullscreen;
  $('btn-gyro').onclick = toggleGyro;
  $('room-info-btn').onclick = () => {
    const open = $('room-info').hidden;
    closeCards();
    $('room-info').hidden = !open;
    $('room-info-btn').setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeCards));
  $('btn-contact').onclick = () => {
    setPlaying(false);
    $('contact').showModal();
  };
  for (const [id, type] of [['c-whatsapp', 'whatsapp'], ['c-call', 'call'], ['c-email', 'email']]) {
    $(id).addEventListener('click', () => analytics?.action(type));
  }
  $('lead-form').addEventListener('submit', sendLead);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, dialog')) return;
    if (e.key === 'PageDown' || e.key === 'n') step(1);
    if (e.key === 'PageUp' || e.key === 'p') step(-1);
    if (e.key === ' ') { e.preventDefault(); setPlaying(!state.playing); }
  });
}

function step(dir) {
  const rooms = state.tour.rooms;
  const i = rooms.indexOf(state.current);
  return goToRoom(rooms[(i + dir + rooms.length) % rooms.length].id);
}

function zoom(f) {
  userInteracted();
  if (state.mode === 'pano') state.pano.setHfov(state.pano.getHfov() / f);
  else state.flat.zoom(f);
}

// ---------------------------------------------------------------------------
// Recorrido automático
// ---------------------------------------------------------------------------
function setPlaying(on) {
  state.playing = on;
  $('btn-play').classList.toggle('active', on);
  $('btn-play').textContent = on ? '❚❚' : '▶';
  clearTimeout(state.playTimer);
  if (on) {
    if (state.mode === 'flat') state.flat.startKenBurns(state.tour.autoplaySeconds);
    schedulePlayStep();
  } else {
    state.pano?.stopAutoRotate();
  }
}

function schedulePlayStep() {
  clearTimeout(state.playTimer);
  if (state.mode === 'pano') state.pano.startAutoRotate(-5);
  state.playTimer = setTimeout(() => {
    if (state.playing) step(1);
  }, state.tour.autoplaySeconds * 1000);
}

/** Cualquier gesto del visitante detiene el recorrido automático. */
function userInteracted() {
  if (state.playing) setPlaying(false);
}

// ---------------------------------------------------------------------------
// Pantalla completa y giroscopio
// ---------------------------------------------------------------------------
function toggleFullscreen() {
  const doc = document;
  const el = doc.documentElement;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    return;
  }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    req.call(el).catch(() => fallbackFullscreen());
  } else {
    fallbackFullscreen();
  }
}

/** iPhone no permite pantalla completa en páginas: si estamos en un iframe, abrimos en pestaña nueva. */
function fallbackFullscreen() {
  if (window.self !== window.top) window.open(location.href, '_blank');
  else document.body.classList.toggle('pseudo-fs');
}

function toggleGyro() {
  const v = state.pano;
  if (!v) return;
  userInteracted();
  if (v.isOrientationActive()) {
    v.stopOrientation();
    $('btn-gyro').classList.remove('active');
  } else {
    v.startOrientation(); // en iOS pide permiso al usuario
    $('btn-gyro').classList.add('active');
  }
}

// ---------------------------------------------------------------------------
// Contacto
// ---------------------------------------------------------------------------
async function sendLead(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const msg = $('lead-msg');
  if (!data.phone && !data.email) {
    msg.textContent = 'Indica un teléfono o un email.';
    return;
  }
  if (isPreview) {
    msg.textContent = 'Vista previa: el formulario no envía datos.';
    return;
  }
  msg.textContent = 'Enviando…';
  try {
    const res = await fetch(`/api/public/tours/${encodeURIComponent(publicId)}/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    analytics?.action('lead');
    form.reset();
    msg.textContent = '¡Gracias! Te contactaremos muy pronto.';
  } catch (err) {
    msg.textContent = err.message || 'No se ha podido enviar. Inténtalo de nuevo.';
  }
}

// ---------------------------------------------------------------------------
function showError(text) {
  $('tour').classList.remove('is-loading');
  $('error-text').textContent = text;
  $('error').hidden = false;
}

function fmtNum(n) {
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function waitFor(fn, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function check() {
      if (fn()) return resolve();
      if (Date.now() - t0 > timeout) return reject(new Error('No se ha podido cargar el visor.'));
      setTimeout(check, 30);
    })();
  });
}
