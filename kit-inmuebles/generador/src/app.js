/* Interfaz del generador: fotos, formulario, perfiles, vista previa y exportación. */
(function (KI) {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const LS_PROFILES = 'kitInmueble.perfiles.v1';
  const LS_PREFS = 'kitInmueble.prefs.v1';
  const MAX_PHOTOS = 20;

  const state = {
    photos: [],
    logo: null,
    logoDataUrl: '',
    version: 0,
    busy: false,
    cancel: false,
    outputs: {}, // kind -> { version, files:[{name, blob}] }
  };
  let uid = 0;

  // ---------------- utilidades ----------------
  function notify(msg, kind) {
    const n = $('#notice');
    if (!n) return;
    n.textContent = msg;
    n.className = kind || 'warn';
    n.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { n.hidden = true; }, 8000);
  }

  // Dentro de claude.ai (Artifact) las descargas pasan por la capacidad «downloads»;
  // fuera (archivo abierto en el navegador) se usan enlaces normales.
  const inViewer = !!(window.claude && typeof window.claude.use === 'function');
  let downloads = null;
  function initDownloads() {
    if (!inViewer) return;
    window.claude.use('downloads').then((ns) => { downloads = ns; renderOutputs(); }).catch(() => {});
  }
  async function saveInViewer(f) {
    if (!downloads) { notify('La descarga no está disponible en esta vista. Abre generador.html en Chrome o Edge.'); return; }
    try {
      await downloads.save({ filename: f.name, data: f.blob });
      notify('Descargado: ' + f.name, 'ok');
    } catch (e) {
      const code = e && e.code;
      if (code === 'declined') return;
      if (code === 'rate_limited') notify('Hay otra descarga pendiente: espera un momento y vuelve a pulsar.');
      else if (code === 'too_large') notify('El archivo es demasiado grande para esta vista: genera la versión «Ligera 720p».');
      else notify('No se pudo descargar aquí. Abre generador.html en Chrome o Edge.');
    }
  }
  const store = {
    get(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
  };

  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  function fmtBytes(n) {
    if (n > 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(n / 1e3)) + ' KB';
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = typeof src === 'string' ? src : URL.createObjectURL(src);
      img.onload = () => { if (typeof src !== 'string') URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { if (typeof src !== 'string') URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }
  const CAPTIONS = [
    [/sal[oó]n|living|estar/i, 'Salón'], [/comedor/i, 'Comedor'], [/cocina|kitchen/i, 'Cocina'],
    [/ba[nñ]o|aseo|bath/i, 'Baño'], [/dormitorio|habitaci[oó]n|bedroom|cuarto/i, 'Dormitorio'],
    [/terraza|terrace/i, 'Terraza'], [/balc[oó]n/i, 'Balcón'], [/jard[ií]n|garden/i, 'Jardín'],
    [/piscina|pool/i, 'Piscina'], [/garaje|parking/i, 'Garaje'], [/trastero/i, 'Trastero'],
    [/recibidor|entrada|hall/i, 'Recibidor'], [/pasillo/i, 'Pasillo'], [/fachada|exterior/i, 'Exterior'],
    [/vistas|view/i, 'Vistas'], [/estudio|despacho|office/i, 'Despacho'],
  ];
  const guessCaption = (name) => (CAPTIONS.find(([re]) => re.test(name)) || [null, ''])[1];

  // ---------------- fotos ----------------
  async function preparePhoto(file) {
    const img = await loadImage(file);
    const maxSide = 2400;
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    const bw = 64, bh = Math.max(1, Math.round(64 * h / w));
    const b = document.createElement('canvas');
    b.width = bw; b.height = bh;
    const bx = b.getContext('2d');
    bx.imageSmoothingQuality = 'high';
    bx.drawImage(c, 0, 0, bw, bh);
    let src = c;
    if (typeof createImageBitmap === 'function') {
      try { src = await createImageBitmap(c); c.width = 1; c.height = 1; } catch (e) { src = c; }
    }
    return { id: ++uid, name: file.name, src, blur: b, w, h, caption: guessCaption(file.name), highlight: '', thumb: URL.createObjectURL(file) };
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|avif)$/i.test(f.name));
    if (!files.length) return;
    files.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    const room = MAX_PHOTOS - state.photos.length;
    if (room <= 0) { notify(`Máximo ${MAX_PHOTOS} fotos.`); return; }
    $('#drop').textContent = 'Cargando fotos…';
    let failed = 0;
    for (const f of files.slice(0, room)) {
      try { state.photos.push(await preparePhoto(f)); } catch (e) { failed++; }
    }
    $('#drop').innerHTML = 'Arrastra aquí más fotos o <u>pulsa para elegirlas</u><br><small>Reordena con ↑ ↓ o arrastrando. La primera es la portada.</small>';
    if (failed) notify(`${failed} foto(s) no se pudieron leer. Si son HEIC (iPhone), expórtalas como JPG.`);
    if (files.length > room) notify(`Solo se han añadido ${room}: el máximo es ${MAX_PHOTOS}.`);
    renderPhotoList();
    changed();
  }

  function renderPhotoList() {
    const box = $('#photos');
    box.innerHTML = '';
    state.photos.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'ph';
      row.draggable = true;
      row.dataset.id = p.id;
      row.innerHTML = `<span class="idx">${i + 1}</span><img alt="" src="${p.thumb}">
        <span class="fields">${i === 0 ? '<span class="tag">PORTADA · muestra título, zona y precio</span>' : ''}<input type="text" data-f="caption" maxlength="40" placeholder="Estancia: Salón, Cocina…" aria-label="Estancia de la foto ${i + 1}">${i === 0 ? '' : `<input type="text" data-f="highlight" maxlength="70" placeholder="Punto fuerte (opcional): Terraza de 20 m²…" aria-label="Punto fuerte de la foto ${i + 1}">`}</span>
        <span class="acts"><button type="button" data-a="up" aria-label="Subir">↑</button><button type="button" data-a="down" aria-label="Bajar">↓</button><button type="button" data-a="del" aria-label="Quitar">✕</button></span>`;
      $$('input', row).forEach((inp) => {
        const key = inp.dataset.f;
        inp.value = p[key] || '';
        inp.addEventListener('input', () => { p[key] = inp.value; changed(); });
      });
      row.addEventListener('click', (e) => {
        const a = e.target.closest('button') && e.target.closest('button').dataset.a;
        if (!a) return;
        const idx = state.photos.indexOf(p);
        if (a === 'del') { state.photos.splice(idx, 1); try { URL.revokeObjectURL(p.thumb); } catch (er) { /* */ } }
        if (a === 'up' && idx > 0) state.photos.splice(idx - 1, 0, state.photos.splice(idx, 1)[0]);
        if (a === 'down' && idx < state.photos.length - 1) state.photos.splice(idx + 1, 0, state.photos.splice(idx, 1)[0]);
        renderPhotoList();
        changed();
      });
      row.addEventListener('dragstart', (e) => { row.classList.add('dragging'); e.dataTransfer.setData('text/plain', String(p.id)); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/plain')) e.preventDefault(); });
      row.addEventListener('drop', (e) => {
        const id = Number(e.dataTransfer.getData('text/plain'));
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        const from = state.photos.findIndex((x) => x.id === id);
        const to = state.photos.indexOf(p);
        if (from < 0 || from === to) return;
        state.photos.splice(to, 0, state.photos.splice(from, 1)[0]);
        renderPhotoList();
        changed();
      });
      box.appendChild(row);
    });
  }

  // ---------------- logo ----------------
  async function setLogoFromSrc(src) {
    if (!src) { state.logo = null; state.logoDataUrl = ''; changed(); return; }
    const img = await loadImage(src);
    const s = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    state.logo = c;
    try { state.logoDataUrl = c.toDataURL('image/png'); } catch (e) { state.logoDataUrl = ''; }
    changed();
  }

  // ---------------- datos del formulario ----------------
  const val = (id) => ($('#' + id).value || '').trim();

  function collect() {
    const d = {
      op: val('op'), label: val('label'), title: val('title'), location: val('location'),
      price: val('price'), m2: val('m2'), rooms: val('rooms'), baths: val('baths'), ref: val('ref'),
      highlights: state.photos.slice(1).map((p) => (p.highlight || '').trim()).filter(Boolean),
      cta: val('cta'),
    };
    const agency = {
      name: val('agName'), phone: val('phone'), whatsapp: val('whatsapp'), web: val('web'),
      plate: $('#plate').checked, logo: state.logo, color: $('#color').value,
    };
    const L = KI.LANGS[val('lang')] || KI.LANGS.es;
    const opts = { style: val('style'), perPhoto: Number($('#perPhoto').value), sample: $('#sample').checked, wmText: val('wmText') };
    const stillHighlights = {};
    state.photos.forEach((p, i) => { if (i > 0 && p.highlight) stillHighlights[i] = p.highlight.trim(); });
    return { photos: state.photos, d, agency, L, brand: KI.hexToRgb(agency.color), opts, stillHighlights };
  }

  function baseName(S) {
    const a = slug(S.agency.name) || 'inmueble';
    const b = slug(S.d.ref) || slug(S.d.title).slice(0, 24) || 'anuncio';
    return `${a}_${b}${S.opts.sample ? '_MUESTRA' : ''}`;
  }

  // ---------------- vista previa ----------------
  const pv = { fmt: 'reel', playing: true, t: 0, last: 0, slide: 0, S: null, tl: null };

  function slidesFor(S) {
    const n = Math.min(S.photos.length, 9);
    const list = [];
    if (!S.photos.length) return list;
    list.push({ kind: 'cover', index: 0 });
    for (let i = 1; i < n; i++) list.push({ kind: 'photo', index: i });
    list.push({ kind: 'cta', index: n });
    return list;
  }

  function sizePreview() {
    const c = $('#pv');
    const F = KI.FORMATS[pv.fmt];
    const stageW = Math.max(200, $('#stage').clientWidth - 20);
    const maxH = pv.fmt === 'wide' ? 260 : 640;
    let w = Math.min(stageW, F.w);
    let h = w * F.h / F.w;
    if (h > maxH) { h = maxH; w = h * F.w / F.h; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.style.width = Math.round(w) + 'px';
    c.style.height = Math.round(h) + 'px';
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }

  function refresh() {
    pv.S = collect();
    pv.tl = KI.buildTimeline(pv.S, pv.fmt === 'post' ? 'reel' : pv.fmt);
    $('#caption').value = KI.buildCaption(pv.S.d, pv.S.agency, pv.S.L);
    const slides = slidesFor(pv.S);
    pv.slide = Math.min(pv.slide, Math.max(0, slides.length - 1));
    $('#slideNo').textContent = slides.length ? `${pv.slide + 1} / ${slides.length}` : '0 / 0';
    drawPreview();
  }

  function drawPreview() {
    const c = $('#pv');
    const ctx = c.getContext('2d');
    const S = pv.S;
    if (!S) return;
    if (!S.photos.length) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#1b1e24';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#9aa1ab';
      ctx.font = `600 ${Math.round(c.width / 22)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Añade fotos para ver la vista previa', c.width / 2, c.height / 2);
      return;
    }
    if (pv.fmt === 'post') {
      const s = slidesFor(S)[pv.slide];
      const total = slidesFor(S).length;
      KI.drawStill(ctx, S, 'post', s.kind, s.kind === 'cta' ? total - 1 : s.index, total, c.width);
      return;
    }
    KI.drawFrame(ctx, S, pv.fmt, pv.tl, Math.min(pv.t, pv.tl.duration - 0.001), c.width);
    const fmt = (x) => x.toFixed(1).replace('.', ',');
    $('#time').textContent = `${fmt(pv.t)} / ${fmt(pv.tl.duration)} s`;
    $('#scrub').value = String(Math.round((pv.t / pv.tl.duration) * 1000));
  }

  function loop(now) {
    const dt = pv.last ? (now - pv.last) / 1000 : 0;
    pv.last = now;
    if (pv.playing && pv.fmt !== 'post' && pv.tl && pv.S && pv.S.photos.length && !state.busy) {
      pv.t += Math.min(dt, 0.1);
      if (pv.t >= pv.tl.duration) pv.t = 0;
      drawPreview();
    }
    requestAnimationFrame(loop);
  }

  function setFormat(fmt) {
    pv.fmt = fmt;
    $$('.tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt)));
    $('#videoControls').hidden = fmt === 'post';
    $('#slideControls').hidden = fmt !== 'post';
    pv.t = 0;
    sizePreview();
    refresh();
  }

  function changed() {
    state.version++;
    refresh();
  }

  // ---------------- perfiles de agencia ----------------
  function profileFields() {
    return { name: val('agName'), color: $('#color').value, phone: val('phone'), whatsapp: val('whatsapp'), web: val('web'), cta: val('cta'), plate: $('#plate').checked, logo: state.logoDataUrl };
  }
  function fillProfileSelect(selected) {
    const sel = $('#profile');
    const profiles = store.get(LS_PROFILES, {});
    sel.innerHTML = '<option value="">— Perfil guardado —</option>' + Object.keys(profiles).sort().map((k) => `<option></option>`).join('');
    Object.keys(profiles).sort().forEach((k, i) => { sel.options[i + 1].value = k; sel.options[i + 1].textContent = k; });
    sel.value = selected || '';
  }
  async function applyProfile(name) {
    const p = store.get(LS_PROFILES, {})[name];
    if (!p) return;
    $('#agName').value = p.name || '';
    $('#color').value = p.color || '#0f766e';
    $('#phone').value = p.phone || '';
    $('#whatsapp').value = p.whatsapp || '';
    $('#web').value = p.web || '';
    $('#cta').value = p.cta || '';
    $('#plate').checked = p.plate !== false;
    try { await setLogoFromSrc(p.logo || ''); } catch (e) { state.logo = null; }
    changed();
  }

  // ---------------- exportación ----------------
  function setBusy(on, txt) {
    state.busy = on;
    $$('.gen button').forEach((b) => { b.disabled = on; });
    $('#progress').classList.toggle('on', on);
    if (txt) $('#progTxt').textContent = txt;
    if (!on) { $('#progress .bar i').style.width = '0'; drawPreview(); }
  }
  function progress(p, txt) {
    $('#progress .bar i').style.width = Math.round(p * 100) + '%';
    if (txt) $('#progTxt').textContent = txt;
  }

  function addOutputs(kind, files) {
    state.outputs[kind] = { version: state.version, files };
    renderOutputs();
  }
  function renderOutputs() {
    const box = $('#outputs');
    box.innerHTML = '';
    const canShare = !inViewer && !!(navigator.canShare && navigator.share);
    Object.values(state.outputs).forEach((o) => o.files.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'out';
      row.innerHTML = `<span class="name"></span><span class="size">${fmtBytes(f.blob.size)}</span>`;
      $('.name', row).textContent = f.name + (o.version !== state.version ? ' (versión anterior)' : '');
      if (inViewer) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Descargar';
        b.addEventListener('click', () => saveInViewer(f));
        row.appendChild(b);
      } else {
        if (!f.url) f.url = URL.createObjectURL(f.blob);
        const a = document.createElement('a');
        a.className = 'btn';
        a.textContent = 'Descargar';
        a.href = f.url;
        a.download = f.name;
        row.appendChild(a);
      }
      if (canShare) {
        const file = new File([f.blob], f.name, { type: f.blob.type });
        if (navigator.canShare({ files: [file] })) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = 'Compartir';
          b.addEventListener('click', () => navigator.share({ files: [file], title: f.name }).catch(() => {}));
          row.appendChild(b);
        }
      }
      box.appendChild(row);
    }));
  }

  function requirePhotos(S) {
    if (!S.photos.length) { notify('Añade al menos una foto en el paso 1.'); return false; }
    return true;
  }

  async function genVideo(fmtId, opt) {
    const S = collect();
    if (!requirePhotos(S)) return null;
    const hq = val('quality') === '1080';
    const F = KI.FORMATS[fmtId];
    const outW = hq ? F.w : Math.round(F.w * (fmtId === 'reel' ? 720 / 1080 : 1280 / 1920));
    const outH = Math.round(outW * F.h / F.w / 2) * 2;
    const bitrate = hq ? 8e6 : 3e6;
    const tl = KI.buildTimeline(S, fmtId);
    const label = fmtId === 'reel' ? 'Reel' : 'Vídeo 16:9';
    const own = !(opt && opt.nested);
    if (own) { state.cancel = false; setBusy(true, `Generando ${label}…`); }
    try {
      const res = await KI.encodeVideo({
        width: outW, height: outH, fps: 30, bitrate, duration: tl.duration,
        draw: (ctx, t) => KI.drawFrame(ctx, S, fmtId, tl, t, outW),
        onProgress: (p) => progress(p, `Generando ${label}… ${Math.round(p * 100)} %`),
        isCancelled: () => state.cancel,
      });
      const name = `${fmtId === 'reel' ? 'reel-9x16' : 'video-16x9'}_${baseName(S)}.${res.ext}`;
      const files = [{ name, blob: res.blob }];
      addOutputs(fmtId, files);
      state.lastVideoInfo = { codec: res.codec, method: res.method, width: outW, height: outH, duration: tl.duration };
      return files;
    } catch (e) {
      if (e.message !== 'cancelado') { console.error(e); notify('No se pudo generar el vídeo: ' + e.message + '. Prueba con Chrome o Edge actualizados.'); }
      return null;
    } finally {
      if (own) setBusy(false);
    }
  }

  function canvasToBlob(c, type, q) {
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen'))), type, q));
  }

  async function genStills(opt) {
    const S = collect();
    if (!requirePhotos(S)) return null;
    const own = !(opt && opt.nested);
    if (own) setBusy(true, 'Generando imágenes…');
    try {
      const slides = slidesFor(S);
      const files = [];
      const c = document.createElement('canvas');
      c.width = 1080; c.height = 1350;
      const ctx = c.getContext('2d', { alpha: false });
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        KI.drawStill(ctx, S, 'post', s.kind, s.kind === 'cta' ? slides.length - 1 : s.index, slides.length, 1080);
        files.push({ name: `carrusel-${String(i + 1).padStart(2, '0')}_${baseName(S)}.jpg`, blob: await canvasToBlob(c, 'image/jpeg', 0.92) });
        progress((i + 1) / (slides.length + 1), `Imagen ${i + 1} de ${slides.length + 1}…`);
        await new Promise((r) => setTimeout(r, 0));
      }
      c.width = 1080; c.height = 1920;
      KI.drawStill(ctx, S, 'story', 'cover', 0, 1, 1080);
      files.push({ name: `story-9x16_${baseName(S)}.jpg`, blob: await canvasToBlob(c, 'image/jpeg', 0.92) });
      progress(1);
      addOutputs('stills', files);
      return files;
    } finally {
      if (own) setBusy(false);
    }
  }

  async function genZip() {
    const S = collect();
    if (!requirePhotos(S)) return null;
    state.cancel = false;
    setBusy(true, 'Preparando el kit completo…');
    try {
      const fresh = (k) => state.outputs[k] && state.outputs[k].version === state.version ? state.outputs[k].files : null;
      const reel = fresh('reel') || await genVideo('reel', { nested: true });
      if (!reel) return null;
      const wide = fresh('wide') || await genVideo('wide', { nested: true });
      if (!wide) return null;
      const stills = fresh('stills') || await genStills({ nested: true });
      progress(1, 'Empaquetando ZIP…');
      const all = [...reel, ...wide, ...(stills || [])];
      const entries = [];
      for (const f of all) entries.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
      entries.push({ name: `texto-publicacion_${baseName(S)}.txt`, data: new TextEncoder().encode(KI.buildCaption(S.d, S.agency, S.L)) });
      const zip = KI.makeZip(entries);
      const files = [{ name: `kit_${baseName(S)}.zip`, blob: zip }];
      addOutputs('zip', files);
      return files;
    } finally {
      setBusy(false);
    }
  }

  // ---------------- arranque ----------------
  function bind() {
    const drop = $('#drop');
    const input = $('#photoInput');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); drop.classList.add('over'); } }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
    // soltar fotos en cualquier parte de la página
    document.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    document.addEventListener('drop', (e) => { if (e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });

    $$('input, select, textarea').forEach((el) => {
      if (el.type === 'file' || el.id === 'profile' || el.id === 'caption') return;
      el.addEventListener('input', changed);
      el.addEventListener('change', changed);
    });
    ['lang', 'quality', 'wmText', 'style', 'perPhoto'].forEach((id) => $('#' + id).addEventListener('change', savePrefs));
    $('#logoInput').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f) { try { await setLogoFromSrc(f); } catch (er) { notify('No se pudo leer el logo. Usa un PNG, JPG o SVG.'); } }
    });

    $('#profile').addEventListener('change', (e) => applyProfile(e.target.value));
    $('#saveProfile').addEventListener('click', () => {
      const f = profileFields();
      if (!f.name) { notify('Escribe el nombre de la inmobiliaria para guardar el perfil.'); return; }
      const all = store.get(LS_PROFILES, {});
      all[f.name] = f;
      const ok = store.set(LS_PROFILES, all);
      fillProfileSelect(f.name);
      $('#profileMsg').textContent = ok ? `Perfil «${f.name}» guardado en este navegador.` : 'No se pudo guardar (navegador en modo privado o sin espacio).';
    });
    $('#delProfile').addEventListener('click', () => {
      const name = $('#profile').value;
      if (!name) return;
      const all = store.get(LS_PROFILES, {});
      delete all[name];
      store.set(LS_PROFILES, all);
      fillProfileSelect('');
    });

    $$('.tabs button').forEach((b) => b.addEventListener('click', () => setFormat(b.dataset.fmt)));
    $('#play').addEventListener('click', () => {
      pv.playing = !pv.playing;
      $('#play').textContent = pv.playing ? '❚❚' : '▶';
      $('#play').setAttribute('aria-label', pv.playing ? 'Pausa' : 'Reproducir');
    });
    $('#scrub').addEventListener('input', (e) => { if (pv.tl) { pv.t = (Number(e.target.value) / 1000) * pv.tl.duration; drawPreview(); } });
    $('#prevSlide').addEventListener('click', () => { pv.slide = Math.max(0, pv.slide - 1); refresh(); });
    $('#nextSlide').addEventListener('click', () => { pv.slide = Math.min(slidesFor(pv.S).length - 1, pv.slide + 1); refresh(); });

    $('#genReel').addEventListener('click', () => genVideo('reel'));
    $('#genWide').addEventListener('click', () => genVideo('wide'));
    $('#genStills').addEventListener('click', () => genStills());
    $('#genZip').addEventListener('click', () => genZip());
    $('#cancel').addEventListener('click', () => { state.cancel = true; });
    $('#copyCaption').addEventListener('click', async () => {
      const t = $('#caption').value;
      try { await navigator.clipboard.writeText(t); $('#copyMsg').textContent = 'Copiado.'; }
      catch (e) { $('#caption').select(); document.execCommand('copy'); $('#copyMsg').textContent = 'Copiado.'; }
      setTimeout(() => { $('#copyMsg').textContent = ''; }, 2000);
    });
    window.addEventListener('resize', () => { sizePreview(); drawPreview(); });
  }

  function savePrefs() {
    store.set(LS_PREFS, { lang: val('lang'), quality: val('quality'), wmText: val('wmText'), style: val('style'), perPhoto: $('#perPhoto').value });
  }
  function loadPrefs() {
    const p = store.get(LS_PREFS, null);
    if (!p) return;
    ['lang', 'quality', 'wmText', 'style', 'perPhoto'].forEach((k) => { if (p[k] != null) $('#' + k).value = p[k]; });
  }

  async function checkSupport() {
    const el = $('#support');
    try {
      const s = await KI.videoSupport();
      if (s.mode === 'webcodecs') { el.textContent = 'Navegador compatible: vídeo MP4 rápido'; el.className = 'ok'; }
      else if (s.mode === 'mediarecorder') { el.textContent = s.codec.includes('mp4') ? 'Modo lento: el vídeo se graba en tiempo real' : 'Este navegador exporta WebM: usa Chrome o Edge para MP4'; el.className = 'bad'; }
      else { el.textContent = 'Este navegador no puede crear vídeo: usa Chrome, Edge o Safari'; el.className = 'bad'; }
      state.support = s;
    } catch (e) { el.textContent = 'No se pudo comprobar el navegador'; el.className = 'bad'; }
  }

  async function waitFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px Montserrat`)));
    await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
  }

  async function init() {
    loadPrefs();
    initDownloads();
    fillProfileSelect('');
    bind();
    sizePreview();
    refresh();
    requestAnimationFrame(loop);
    checkSupport();
    await waitFonts();
    refresh();
  }

  // Ganchos para las pruebas automáticas
  window.KI_APP = { state, collect, genVideo, genStills, genZip, addFiles, setLogoFromSrc, setFormat, refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.KI = window.KI || {});
