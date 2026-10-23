/**
 * Editor de una vivienda. Pestañas:
 *   rooms    → subir fotos, ordenar y describir estancias
 *   hotspots → colocar puntos clicables sobre cada foto
 *   plan     → plano esquemático y posición de cada estancia
 *   publish  → datos del anuncio, publicación, enlace e iframe
 *   stats    → estadísticas y contactos captados
 */
import { api, session, upload } from './api.js';
import { compressSimple, guessRoomName, processPhoto } from './image-tools.js';
import { $, $$, copyText, esc, fmtDate, fmtDuration, toast } from './ui.js';

const TABS = [
  ['rooms', 'Estancias'],
  ['hotspots', 'Hotspots'],
  ['plan', 'Plano'],
  ['publish', 'Publicar'],
  ['stats', 'Estadísticas'],
];
const ORIENTATIONS = ['', 'Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste', 'Interior'];

// Estado del editor (se conserva al cambiar de pestaña dentro de la misma vivienda)
const ctx = { id: null, data: null, hsRoomId: null, planRoomId: null, view: null, viewer: null };

export async function renderEditor(app, id, tab) {
  if (ctx.id !== id) Object.assign(ctx, { id, hsRoomId: null, planRoomId: null, view: null });
  ctx.app = app;
  ctx.tab = TABS.some(([k]) => k === tab) ? tab : 'rooms';
  await reload();
}

async function reload() {
  ctx.data = await api(`/properties/${ctx.id}`);
  render();
}

function previewUrl() {
  const p = ctx.data.property;
  return `/t/${p.public_id}${p.status === 'published' ? '' : `?token=${encodeURIComponent(session.get().token)}`}`;
}

function render() {
  const { property: p, agency } = ctx.data;
  destroyViewer();
  ctx.app.innerHTML = `
    <p><a href="#/">← Inicio</a></p>
    <div class="row between">
      <div>
        <h1>${esc(p.title)}</h1>
        <div class="row small">
          <span class="badge ${p.status === 'published' ? 'published' : ''}">${p.status === 'published' ? 'Publicada' : 'Borrador'}</span>
          <span class="muted">${esc(agency.name)} · ${ctx.data.rooms.length} estancias</span>
        </div>
      </div>
      <a class="btn" href="${esc(previewUrl())}" target="_blank" rel="noopener">Ver recorrido ↗</a>
    </div>
    <nav class="tabs">${TABS.map(([k, label]) => `<a href="#/property/${esc(p.id)}/${k}" class="${k === ctx.tab ? 'active' : ''}">${label}</a>`).join('')}</nav>
    <div id="tab"></div>`;
  const el = $('#tab');
  ({ rooms: tabRooms, hotspots: tabHotspots, plan: tabPlan, publish: tabPublish, stats: tabStats })[ctx.tab](el);
}

// ===========================================================================
// Estancias
// ===========================================================================
function tabRooms(el) {
  const { rooms, property } = ctx.data;
  el.innerHTML = `
    <div class="stack">
      <label class="dropzone" id="drop">
        <strong>Arrastra aquí las fotos o haz clic para elegirlas</strong><br>
        <span class="muted small">Fotos 360° (proporción 2:1) o fotos normales. Se comprimen automáticamente antes de subir.</span>
        <input type="file" id="files" accept="image/*" multiple hidden>
      </label>
      <div id="uploads" class="stack"></div>
      ${rooms.length ? '<p class="muted small">Arrastra ⋮⋮ para cambiar el orden del recorrido. Los cambios se guardan solos.</p>' : ''}
      <div class="room-list" id="room-list">${rooms.map((r) => roomItem(r, property.start_room_id === r.id)).join('')}</div>
    </div>`;

  const drop = $('#drop');
  $('#files').addEventListener('change', (e) => uploadFiles([...e.target.files]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    uploadFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });

  for (const item of $$('.room-item', el)) bindRoomItem(item);
  bindReorder($('#room-list'));
}

function roomItem(r, isStart) {
  return `
    <div class="card room-item" data-id="${esc(r.id)}">
      <div class="handle" draggable="true" title="Arrastrar para ordenar">⋮⋮</div>
      <img src="${esc(r.img_thumb || r.img_preview)}" alt="">
      <div class="fields">
        <label>Nombre <input data-f="name" value="${esc(r.name)}"></label>
        <label>Tipo de foto
          <select data-f="kind">
            <option value="pano" ${r.kind === 'pano' ? 'selected' : ''}>360°</option>
            <option value="flat" ${r.kind === 'flat' ? 'selected' : ''}>Normal</option>
          </select>
        </label>
        <label>m² <input data-f="area_m2" type="number" step="0.1" min="0" value="${r.area_m2 ?? ''}"></label>
        <label>Orientación
          <select data-f="orientation">${ORIENTATIONS.map((o) => `<option ${o === (r.orientation || '') ? 'selected' : ''} value="${o}">${o || '—'}</option>`).join('')}</select>
        </label>
        <label class="wide">Calidades / notas <input data-f="features" value="${esc(r.features || '')}" placeholder="Suelo de roble, armario empotrado, aire acondicionado…"></label>
      </div>
      <div class="actions">
        <button class="icon" data-act="up" title="Subir">↑</button>
        <button class="icon" data-act="down" title="Bajar">↓</button>
        <button class="icon" data-act="start" title="Estancia de inicio" ${isStart ? 'disabled' : ''}>${isStart ? '★ Inicio' : '☆'}</button>
        <label class="btn icon" title="Sustituir la foto">📷<input type="file" accept="image/*" data-act="replace" hidden></label>
        <button class="icon danger" data-act="delete" title="Eliminar">🗑</button>
      </div>
    </div>`;
}

function bindRoomItem(item) {
  const id = item.dataset.id;
  for (const input of $$('[data-f]', item)) {
    input.addEventListener('change', async () => {
      const field = input.dataset.f;
      if (field === 'kind' && ctx.data.hotspots.some((h) => h.room_id === id)) {
        if (!confirm('Al cambiar el tipo de foto tendrás que recolocar los hotspots de esta estancia. ¿Continuar?')) {
          input.value = input.value === 'pano' ? 'flat' : 'pano';
          return;
        }
      }
      try {
        await api(`/rooms/${id}`, { method: 'PUT', body: { [field]: input.value } });
        const room = ctx.data.rooms.find((r) => r.id === id);
        room[field] = input.value;
        toast('Guardado');
      } catch (err) {
        toast(err.message, true);
      }
    });
  }
  item.querySelector('[data-act=up]').onclick = () => moveRoom(id, -1);
  item.querySelector('[data-act=down]').onclick = () => moveRoom(id, 1);
  item.querySelector('[data-act=start]').onclick = async () => {
    await api(`/properties/${ctx.id}`, { method: 'PUT', body: { start_room_id: id } });
    await reload();
  };
  item.querySelector('[data-act=delete]').onclick = async () => {
    const room = ctx.data.rooms.find((r) => r.id === id);
    if (!confirm(`¿Eliminar "${room.name}" y sus hotspots?`)) return;
    await api(`/rooms/${id}`, { method: 'DELETE' });
    toast('Estancia eliminada');
    await reload();
  };
  item.querySelector('[data-act=replace]').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const room = ctx.data.rooms.find((r) => r.id === id);
    try {
      toast('Comprimiendo…');
      const photo = await processPhoto(file);
      const fd = photoForm(photo, room.name);
      await upload(`/rooms/${id}/image`, fd, (p) => toast(`Subiendo ${Math.round(p * 100)} %`));
      toast('Foto sustituida');
      await reload();
    } catch (err) {
      toast(err.message, true);
    }
  };
}

function photoForm(photo, name) {
  const fd = new FormData();
  const ext = photo.full.type === 'image/webp' ? 'webp' : 'jpg';
  fd.append('name', name);
  fd.append('kind', photo.kind);
  fd.append('width', photo.width);
  fd.append('height', photo.height);
  fd.append('full', photo.full, `full.${ext}`);
  fd.append('preview', photo.preview, `preview.${ext}`);
  fd.append('thumb', photo.thumb, `thumb.${ext}`);
  return fd;
}

/** Comprime y sube las fotos una a una mostrando el progreso. */
async function uploadFiles(files) {
  const box = $('#uploads');
  for (const file of files) {
    const row = document.createElement('div');
    row.className = 'card upload-row';
    row.innerHTML = `<strong>${esc(file.name)}</strong><span class="muted">Comprimiendo…</span><progress max="1" value="0"></progress>`;
    box.append(row);
    const status = row.querySelector('span');
    const bar = row.querySelector('progress');
    try {
      const photo = await processPhoto(file);
      status.textContent = `${photo.kind === 'pano' ? '360°' : 'Foto normal'} · ${(photo.full.size / 1024).toFixed(0)} KB (−${photo.savedPct} %) · Subiendo…`;
      await upload(`/properties/${ctx.id}/rooms`, photoForm(photo, guessRoomName(file.name)), (p) => (bar.value = p));
      bar.value = 1;
      status.textContent = '✓ Subida';
    } catch (err) {
      status.textContent = `✗ ${err.message}`;
    }
  }
  await reload();
}

async function moveRoom(id, dir) {
  const ids = ctx.data.rooms.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await saveOrder(ids);
}

async function saveOrder(ids) {
  await api(`/properties/${ctx.id}/order`, { method: 'PUT', body: { roomIds: ids } });
  await reload();
}

/** Reordenar arrastrando (escritorio). En móvil se usan los botones ↑ ↓. */
function bindReorder(list) {
  let dragged = null;
  list.addEventListener('dragstart', (e) => {
    dragged = e.target.closest('.room-item');
    dragged?.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    const over = e.target.closest('.room-item');
    if (!over || over === dragged) return;
    const r = over.getBoundingClientRect();
    over.parentNode.insertBefore(dragged, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
  });
  list.addEventListener('dragend', async () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    dragged = null;
    const ids = $$('.room-item', list).map((n) => n.dataset.id);
    if (ids.join() !== ctx.data.rooms.map((r) => r.id).join()) await saveOrder(ids);
  });
}

// ===========================================================================
// Hotspots
// ===========================================================================
function tabHotspots(el) {
  const { rooms } = ctx.data;
  if (!rooms.length) {
    el.innerHTML = '<div class="card muted">Primero sube las fotos en la pestaña «Estancias».</div>';
    return;
  }
  if (!rooms.some((r) => r.id === ctx.hsRoomId)) ctx.hsRoomId = rooms[0].id;
  const room = rooms.find((r) => r.id === ctx.hsRoomId);
  const hs = ctx.data.hotspots.filter((h) => h.room_id === room.id);

  el.innerHTML = `
    <div class="hs-editor">
      <div class="room-picker">
        ${rooms.map((r) => `<button data-room="${esc(r.id)}" class="${r.id === room.id ? 'active' : ''}">${esc(r.name)} <span class="muted small">(${ctx.data.hotspots.filter((h) => h.room_id === r.id).length})</span></button>`).join('')}
      </div>
      <div class="stack">
        <p class="muted small" style="margin:0">
          <strong>Haz clic sobre la foto</strong> donde quieras el punto (por ejemplo, en una puerta).
          ${room.kind === 'pano' ? 'Arrastra para girar la vista; la rueda del ratón acerca y aleja.' : ''}
        </p>
        <div class="stage ${room.kind === 'flat' ? 'flat' : ''}" id="stage"></div>
        ${room.kind === 'pano' ? '<div class="row"><button id="save-view">📌 Usar esta vista como vista inicial</button><span class="muted small">Es hacia dónde mira el visitante al entrar.</span></div>' : ''}
        <table class="hs-table">
          <thead><tr><th>Tipo</th><th>Destino / etiqueta</th><th></th></tr></thead>
          <tbody>${hs.length ? hs.map((h) => `
            <tr>
              <td>${h.kind === 'link' ? '➜ Enlace' : 'ⓘ Información'}</td>
              <td>${h.kind === 'link' ? esc(roomName(h.target_room_id)) : ''} ${h.label ? `<span class="muted">«${esc(h.label)}»</span>` : ''}</td>
              <td class="row" style="justify-content:flex-end"><button data-edit="${esc(h.id)}">Editar</button><button class="danger" data-del="${esc(h.id)}">Eliminar</button></td>
            </tr>`).join('') : '<tr><td colspan="3" class="muted">Esta estancia aún no tiene hotspots.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  $$('[data-room]', el).forEach((b) => (b.onclick = () => { ctx.hsRoomId = b.dataset.room; ctx.view = null; render(); }));
  $$('[data-edit]', el).forEach((b) => (b.onclick = () => openHotspotForm(room, hs.find((h) => h.id === b.dataset.edit))));
  $$('[data-del]', el).forEach((b) => (b.onclick = () => deleteHotspot(b.dataset.del)));

  const stage = $('#stage');
  if (room.kind === 'pano') mountPanoEditor(stage, room, hs);
  else mountFlatEditor(stage, room, hs);

  $('#save-view')?.addEventListener('click', async () => {
    const v = ctx.viewer;
    await api(`/rooms/${room.id}`, { method: 'PUT', body: { init_yaw: v.getYaw(), init_pitch: v.getPitch(), init_hfov: v.getHfov() } });
    Object.assign(room, { init_yaw: v.getYaw(), init_pitch: v.getPitch(), init_hfov: v.getHfov() });
    toast('Vista inicial guardada');
  });
}

function roomName(id) {
  return ctx.data.rooms.find((r) => r.id === id)?.name || '¿?';
}

function markerNode(h) {
  const m = document.createElement('div');
  m.className = `marker ${h.kind === 'info' ? 'info' : ''}`;
  m.textContent = h.kind === 'info' ? 'i' : '➜';
  m.title = h.kind === 'link' ? `→ ${roomName(h.target_room_id)}` : h.label || 'Información';
  return m;
}

/** Editor sobre panorámica 360°: clic sin arrastrar = nuevo hotspot. */
function mountPanoEditor(stage, room, hs) {
  const view = ctx.view || { yaw: room.init_yaw ?? 0, pitch: room.init_pitch ?? 0, hfov: room.init_hfov ?? 100 };
  const viewer = window.pannellum.viewer(stage, {
    type: 'equirectangular',
    panorama: room.img_full,
    preview: room.img_preview,
    autoLoad: true,
    showZoomCtrl: true,
    showFullscreenCtrl: false,
    ...view,
    hotSpots: hs.map((h) => ({
      id: h.id,
      yaw: h.yaw ?? 0,
      pitch: h.pitch ?? 0,
      cssClass: 'marker-wrap',
      createTooltipFunc: (div) => {
        const m = markerNode(h);
        m.classList.add('pnlm');
        div.append(m);
      },
      clickHandlerFunc: () => openHotspotForm(room, h),
    })),
  });
  ctx.viewer = viewer;
  let down = null;
  stage.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
  stage.addEventListener('pointerup', (e) => {
    if (!down || e.target.closest('.marker, .hs-form, .pnlm-controls-container')) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5) return; // era un arrastre para girar
    const [pitch, yaw] = viewer.mouseEventToCoords(e);
    onStageClick(room, { yaw, pitch });
  });
}

/** Editor sobre foto normal: posiciones en % de la imagen. */
function mountFlatEditor(stage, room, hs) {
  stage.innerHTML = `<div class="flat-wrap"><img src="${esc(room.img_full)}" alt="" draggable="false"></div>`;
  const wrap = stage.firstElementChild;
  for (const h of hs) {
    const m = markerNode(h);
    m.style.left = `${h.x}%`;
    m.style.top = `${h.y}%`;
    m.onclick = (e) => { e.stopPropagation(); openHotspotForm(room, h); };
    wrap.append(m);
  }
  wrap.querySelector('img').addEventListener('click', (e) => {
    const r = e.target.getBoundingClientRect();
    onStageClick(room, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  });
}

/** Si hay un formulario de edición abierto, el clic recoloca ese hotspot; si no, crea uno nuevo. */
function onStageClick(room, pos) {
  const open = $('.hs-form');
  if (open?.pending) {
    open.pending.pos = pos;
    open.querySelector('.pos-note').textContent = '📍 Nueva posición marcada (pulsa Guardar)';
    return;
  }
  openHotspotForm(room, null, pos);
}

function openHotspotForm(room, h, pos) {
  $('.hs-form')?.remove();
  const others = ctx.data.rooms.filter((r) => r.id !== room.id);
  const kind = h?.kind || (others.length ? 'link' : 'info');
  const form = document.createElement('form');
  form.className = 'hs-form form';
  form.pending = { pos: pos || null };
  form.innerHTML = `
    <h3>${h ? 'Editar hotspot' : 'Nuevo hotspot'}</h3>
    <label>Tipo
      <select name="kind">
        <option value="link" ${kind === 'link' ? 'selected' : ''}>➜ Ir a otra estancia</option>
        <option value="info" ${kind === 'info' ? 'selected' : ''}>ⓘ Etiqueta informativa</option>
      </select>
    </label>
    <label data-for="link">Lleva a
      <select name="target_room_id">${others.map((r) => `<option value="${esc(r.id)}" ${r.id === h?.target_room_id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
    </label>
    <label>Etiqueta <input name="label" value="${esc(h?.label || '')}" placeholder="Ej.: Dormitorio · Calidades del suelo"></label>
    <label data-for="info">Texto <textarea name="text" rows="3" placeholder="Suelo radiante, carpintería de aluminio…">${esc(h?.text || '')}</textarea></label>
    <p class="muted small pos-note">${h ? 'Haz clic en la foto para moverlo.' : ''}</p>
    <div class="row">
      <button type="button" data-cancel>Cancelar</button>
      ${h ? '<button type="button" class="danger" data-delete>Eliminar</button>' : ''}
      <span class="spacer"></span><button class="primary">Guardar</button>
    </div>`;
  const sync = () => {
    const k = form.kind.value;
    form.querySelector('[data-for=link]').hidden = k !== 'link';
    form.querySelector('[data-for=info]').hidden = k !== 'info';
  };
  form.kind.onchange = sync;
  sync();
  form.querySelector('[data-cancel]').onclick = () => form.remove();
  form.querySelector('[data-delete]')?.addEventListener('click', () => deleteHotspot(h.id));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    if (body.kind === 'link' && !others.length) return toast('Necesitas al menos otra estancia para crear un enlace', true);
    if (body.kind === 'info') body.target_room_id = null;
    if (form.pending.pos) Object.assign(body, form.pending.pos);
    try {
      rememberView();
      if (h) await api(`/hotspots/${h.id}`, { method: 'PUT', body });
      else await api(`/rooms/${room.id}/hotspots`, { method: 'POST', body });
      toast('Hotspot guardado');
      await reload();
    } catch (err) {
      toast(err.message, true);
    }
  });
  $('#stage').append(form);
  form.querySelector('input[name=label]').focus({ preventScroll: true });
}

async function deleteHotspot(id) {
  if (!confirm('¿Eliminar este hotspot?')) return;
  rememberView();
  await api(`/hotspots/${id}`, { method: 'DELETE' });
  await reload();
}

/** Guarda la orientación actual del visor para no "saltar" al recargar. */
function rememberView() {
  const v = ctx.viewer;
  if (v) ctx.view = { yaw: v.getYaw(), pitch: v.getPitch(), hfov: v.getHfov() };
}

function destroyViewer() {
  try { ctx.viewer?.destroy(); } catch { /* ya destruido */ }
  ctx.viewer = null;
}

// ===========================================================================
// Plano
// ===========================================================================
function tabPlan(el) {
  const { property: p, rooms } = ctx.data;
  if (!rooms.some((r) => r.id === ctx.planRoomId)) ctx.planRoomId = rooms[0]?.id;
  el.innerHTML = `
    <div class="stack">
      <div class="card row">
        <div class="spacer">
          <h2 style="margin:0">Plano esquemático (opcional)</h2>
          <p class="muted small" style="margin:4px 0 0">Muestra al visitante dónde está en cada momento. Vale un plano escaneado, una foto o un PNG.</p>
        </div>
        <label class="btn">${p.plan_url ? 'Cambiar plano' : 'Subir plano'}<input type="file" id="plan-file" accept="image/*" hidden></label>
        ${p.plan_url ? '<button class="danger" id="plan-del">Quitar plano</button>' : ''}
      </div>
      ${p.plan_url ? `
      <div class="plan-editor">
        <div class="plan-stage" id="plan-stage">
          <img src="${esc(p.plan_url)}" alt="Plano" draggable="false">
          ${rooms.filter((r) => r.plan_x != null).map((r) => `<span class="plan-pin ${r.id === ctx.planRoomId ? 'selected' : ''}" style="left:${r.plan_x}%;top:${r.plan_y}%">${esc(r.name)}</span>`).join('')}
        </div>
        <div class="card stack">
          <p class="small" style="margin:0"><strong>1.</strong> Elige una estancia · <strong>2.</strong> Haz clic en el plano donde se hizo la foto.</p>
          ${rooms.map((r) => `
            <label class="row" style="font-weight:600;color:var(--ink)">
              <input type="radio" name="plan-room" value="${esc(r.id)}" ${r.id === ctx.planRoomId ? 'checked' : ''}>
              <span class="spacer">${esc(r.name)}</span>
              ${r.plan_x != null ? `<button type="button" class="ghost small" data-unplace="${esc(r.id)}">quitar</button>` : '<span class="muted small">sin colocar</span>'}
            </label>`).join('')}
        </div>
      </div>` : ''}
    </div>`;

  $('#plan-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', await compressSimple(file, 1600), 'plan');
      await upload(`/properties/${ctx.id}/plan`, fd);
      toast('Plano subido');
      await reload();
    } catch (err) {
      toast(err.message, true);
    }
  };
  $('#plan-del')?.addEventListener('click', async () => {
    if (!confirm('¿Quitar el plano?')) return;
    await api(`/properties/${ctx.id}/plan`, { method: 'DELETE' });
    await reload();
  });
  $$('input[name=plan-room]', el).forEach((r) => (r.onchange = () => { ctx.planRoomId = r.value; render(); }));
  $$('[data-unplace]', el).forEach((b) => (b.onclick = async (e) => {
    e.preventDefault();
    await api(`/rooms/${b.dataset.unplace}`, { method: 'PUT', body: { plan_x: null, plan_y: null } });
    await reload();
  }));
  $('#plan-stage')?.querySelector('img').addEventListener('click', async (e) => {
    if (!ctx.planRoomId) return;
    const r = e.target.getBoundingClientRect();
    const body = { plan_x: ((e.clientX - r.left) / r.width) * 100, plan_y: ((e.clientY - r.top) / r.height) * 100 };
    await api(`/rooms/${ctx.planRoomId}`, { method: 'PUT', body });
    // Pasa automáticamente a la siguiente estancia sin colocar
    const next = ctx.data.rooms.find((x) => x.plan_x == null && x.id !== ctx.planRoomId);
    if (next) ctx.planRoomId = next.id;
    await reload();
  });
}

// ===========================================================================
// Publicar
// ===========================================================================
function tabPublish(el) {
  const { property: p, rooms } = ctx.data;
  const url = `${location.origin}/t/${p.public_id}`;
  const published = p.status === 'published';
  el.innerHTML = `
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); align-items:start">
      <form class="card form" id="f-data">
        <h2>Datos del anuncio</h2>
        <label>Título <input name="title" value="${esc(p.title)}" required></label>
        <div class="two">
          <label>Dirección <input name="address" value="${esc(p.address || '')}"></label>
          <label>Precio <input name="price" value="${esc(p.price || '')}"></label>
        </div>
        <label>Descripción <textarea name="description" rows="4">${esc(p.description || '')}</textarea></label>
        <div class="two">
          <label>Estancia de inicio
            <select name="start_room_id">${rooms.map((r) => `<option value="${esc(r.id)}" ${r.id === p.start_room_id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
          </label>
          <label>Segundos por estancia (recorrido automático) <input name="autoplay_seconds" type="number" min="3" max="60" value="${p.autoplay_seconds}"></label>
        </div>
        <div><button class="primary">Guardar datos</button></div>
      </form>

      <section class="card stack">
        <h2>Publicación</h2>
        <label class="switch"><input type="checkbox" id="published" ${published ? 'checked' : ''} ${rooms.length ? '' : 'disabled'}> ${published ? 'Publicada: cualquiera con el enlace puede verla' : 'Borrador: solo tú puedes verla'}</label>
        ${rooms.length ? '' : '<p class="muted small">Sube al menos una estancia para poder publicar.</p>'}
        <label>Enlace público (para Idealista, Fotocasa, WhatsApp, redes…)
          <div class="row" style="flex-wrap:nowrap"><input class="code" readonly value="${esc(url)}" id="pub-url"><button type="button" id="copy-url">Copiar</button></div>
        </label>
        <label>Código para insertar en una web
          <textarea class="code" rows="4" readonly id="embed"></textarea>
        </label>
        <div class="row small">
          <label class="row" style="font-weight:600"><input type="checkbox" id="opt-autoplay"> Empezar en recorrido automático</label>
          <span class="spacer"></span><button type="button" id="copy-embed">Copiar código</button>
        </div>
        <details class="small">
          <summary>¿Cómo lo pongo en los portales?</summary>
          <ul>
            <li><strong>Idealista / Fotocasa / Habitaclia:</strong> no permiten iframes; pega el <em>enlace público</em> en el campo «Visita virtual» o «Tour 3D / enlace externo» del anuncio.</li>
            <li><strong>Web propia (WordPress, Wix…):</strong> añade un bloque «HTML personalizado» y pega el código.</li>
            <li><strong>Redes sociales y WhatsApp:</strong> comparte el enlace; se mostrará con la foto y el título.</li>
          </ul>
        </details>
      </section>
    </div>
    <section class="card stack" style="margin-top:16px">
      <h2>Vista previa</h2>
      <iframe class="preview-frame" src="${esc(previewUrl())}" allow="fullscreen; accelerometer; gyroscope; magnetometer" allowfullscreen></iframe>
    </section>`;

  const embed = () => {
    const src = `${url}${$('#opt-autoplay').checked ? '?autoplay=1' : ''}`;
    $('#embed').value = `<iframe src="${src}" width="100%" height="560" style="border:0;border-radius:12px;max-width:100%" allow="fullscreen; accelerometer; gyroscope; magnetometer" allowfullscreen loading="lazy" title="Visita virtual: ${esc(p.title)}"></iframe>`;
  };
  embed();
  $('#opt-autoplay').onchange = embed;
  $('#copy-url').onclick = () => copyText(url);
  $('#copy-embed').onclick = () => copyText($('#embed').value);
  $('#published').onchange = async (e) => {
    await api(`/properties/${ctx.id}`, { method: 'PUT', body: { status: e.target.checked ? 'published' : 'draft' } });
    toast(e.target.checked ? '¡Publicada!' : 'Pasada a borrador');
    await reload();
  };
  $('#f-data').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/properties/${ctx.id}`, { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      toast('Guardado');
      await reload();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ===========================================================================
// Estadísticas y contactos
// ===========================================================================
async function tabStats(el, days = 30) {
  el.innerHTML = '<p class="muted">Cargando estadísticas…</p>';
  const [s, leads] = await Promise.all([api(`/properties/${ctx.id}/stats?days=${days}`), api(`/properties/${ctx.id}/leads`)]);
  const c = s.contacts;
  el.innerHTML = `
    <div class="stack">
      <div class="row between">
        <h2 style="margin:0">Últimos ${days} días</h2>
        <select id="days" style="width:auto">${[7, 30, 90, 365].map((d) => `<option value="${d}" ${d === days ? 'selected' : ''}>${d} días</option>`).join('')}</select>
      </div>
      <div class="kpis">
        <div class="card kpi"><div class="v">${s.visits}</div><div class="l">Visitas</div></div>
        <div class="card kpi"><div class="v">${fmtDuration(s.avgSeconds)}</div><div class="l">Tiempo medio por visita</div></div>
        <div class="card kpi"><div class="v">${Math.round(s.mobileShare * 100)} %</div><div class="l">Desde móvil</div></div>
        <div class="card kpi"><div class="v">${(c.whatsapp || 0) + (c.call || 0) + (c.email || 0) + (c.lead || 0)}</div><div class="l">Contactos (WhatsApp ${c.whatsapp || 0} · llamada ${c.call || 0} · email ${c.email || 0} · formulario ${c.lead || 0})</div></div>
      </div>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items:start">
        <section class="card">
          <h3>Estancias más vistas</h3>
          <table class="data">
            <thead><tr><th>Estancia</th><th class="num">Vistas</th><th class="num">Tiempo medio</th></tr></thead>
            <tbody>${s.rooms.length ? s.rooms.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${r.views}</td><td class="num">${fmtDuration(r.avgSeconds)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Sin datos todavía.</td></tr>'}</tbody>
          </table>
        </section>
        <section class="card">
          <h3>Visitas por día</h3>
          <table class="data">
            <thead><tr><th>Día</th><th class="num">Visitas</th></tr></thead>
            <tbody>${s.daily.length ? s.daily.slice(-14).reverse().map((d) => `<tr><td>${esc(new Date(d.day).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }))}</td><td class="num">${d.visits}</td></tr>`).join('') : '<tr><td colspan="2" class="muted">Sin datos todavía.</td></tr>'}</tbody>
          </table>
        </section>
      </div>
      <section class="card">
        <div class="row between"><h3 style="margin:0">Contactos del formulario (${leads.length})</h3>${leads.length ? '<button id="csv">Descargar CSV</button>' : ''}</div>
        <table class="data">
          <thead><tr><th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Mensaje</th></tr></thead>
          <tbody>${leads.length ? leads.map((l) => `<tr><td>${fmtDate(l.created_at)}</td><td>${esc(l.name)}</td><td>${l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : ''}</td><td>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : ''}</td><td>${esc(l.message || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Aún no hay contactos.</td></tr>'}</tbody>
        </table>
      </section>
      <p class="muted small">Las estadísticas son anónimas (sin cookies). Las vistas previas desde el panel no cuentan.</p>
    </div>`;
  $('#days').onchange = (e) => tabStats(el, Number(e.target.value));
  $('#csv')?.addEventListener('click', () => downloadCsv(leads));
}

function downloadCsv(leads) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Fecha', 'Nombre', 'Teléfono', 'Email', 'Mensaje'], ...leads.map((l) => [new Date(l.created_at).toISOString(), l.name, l.phone, l.email, l.message])];
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `contactos-${ctx.data.property.public_id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
