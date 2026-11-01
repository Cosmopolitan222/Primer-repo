/* Motor de composición: dibuja cada fotograma del Reel / vídeo horizontal y
 * las imágenes estáticas (carrusel y story) en un <canvas> 2D.
 * Todo el dibujo se hace en coordenadas «base» del formato (1080×1920,
 * 1920×1080 o 1080×1350) y se escala con setTransform al tamaño de salida. */
(function (KI) {
  'use strict';

  const FONT = '"Montserrat", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  const FORMATS = {
    reel: { id: 'reel', w: 1080, h: 1920 },
    wide: { id: 'wide', w: 1920, h: 1080 },
    post: { id: 'post', w: 1080, h: 1350 },
    story: { id: 'story', w: 1080, h: 1920 },
  };
  KI.FORMATS = FORMATS;

  // ---------- utilidades ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => 0.5 - Math.cos(Math.PI * p) / 2;
  /** Progreso 0..1 de una animación que empieza en `delay` y dura `dur` (segundos). */
  const anim = (lt, delay, dur) => easeOut(clamp((lt - delay) / dur, 0, 1));

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return { r: 15, g: 118, b: 110 };
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;
  function textOn(c) {
    const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    return lum > 0.62 ? '#111111' : '#ffffff';
  }
  KI.hexToRgb = hexToRgb;

  function font(weight, size) { return `${weight} ${Math.round(size)}px ${FONT}`; }

  /** Parte el texto en líneas que caben en maxW; la última se corta con «…». */
  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      const test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width <= maxW || !cur) {
        cur = test;
      } else {
        lines.push(cur);
        cur = words[i];
        if (lines.length === maxLines) { cur = ''; break; }
      }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) lines.length = maxLines;
    // ¿quedaron palabras sin colocar? → elipsis en la última línea
    const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
    if (used < words.length && lines.length) {
      let last = lines[lines.length - 1] + '…';
      while (ctx.measureText(last).width > maxW && last.length > 2) last = last.slice(0, -2) + '…';
      lines[lines.length - 1] = last;
    }
    // una sola palabra demasiado larga: recortar
    for (let i = 0; i < lines.length; i++) {
      while (ctx.measureText(lines[i]).width > maxW && lines[i].length > 2) lines[i] = lines[i].slice(0, -2) + '…';
    }
    return lines;
  }

  /** Reduce el tamaño de fuente hasta que `text` cabe en maxW. */
  function fitSize(ctx, text, weight, size, maxW, minSize) {
    let s = size;
    ctx.font = font(weight, s);
    while (s > minSize && ctx.measureText(text).width > maxW) {
      s -= 2;
      ctx.font = font(weight, s);
    }
    return s;
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Píldora con texto. align: 'left' | 'center' | 'right' respecto a x. Devuelve {w,h}. */
  function pill(ctx, text, x, y, opt) {
    const size = opt.size, padX = opt.padX ?? size * 0.6, padY = opt.padY ?? size * 0.36;
    ctx.font = font(opt.weight || 700, size);
    const tw = ctx.measureText(text).width;
    const w = tw + padX * 2 + (opt.icon ? size * 0.95 : 0), h = size + padY * 2;
    let x0 = x;
    if (opt.align === 'center') x0 = x - w / 2;
    else if (opt.align === 'right') x0 = x - w;
    ctx.save();
    if (opt.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = opt.bg;
    roundRect(ctx, x0, y, w, h, opt.radius ?? h / 2);
    ctx.fill();
    ctx.restore();
    let tx = x0 + padX;
    if (opt.icon === 'pin') { drawPin(ctx, tx + size * 0.32, y + h / 2, size * 0.8, opt.color); tx += size * 0.95; }
    ctx.fillStyle = opt.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, tx, y + h / 2 + size * 0.04);
    return { w, h, x: x0 };
  }

  /** Icono de ubicación dibujado con trazos (sin emojis: se ven igual en todos los equipos). */
  function drawPin(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.fillStyle = color;
    const r = s * 0.34;
    const top = cy - s * 0.18;
    ctx.beginPath();
    ctx.arc(cx, top, r, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(cx, cy + s * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, top, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Texto con sombra suave para que se lea sobre cualquier foto. */
  function shadowText(ctx, text, x, y, opt) {
    ctx.save();
    ctx.font = font(opt.weight, opt.size);
    ctx.textAlign = opt.align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = opt.size * 0.35;
    ctx.shadowOffsetY = opt.size * 0.05;
    ctx.fillStyle = opt.color || '#fff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ---------- capas de imagen ----------

  /** Dibuja la foto con movimiento (Ken Burns / barrido). p = progreso 0..1 de la escena. */
  function drawPhoto(ctx, F, ph, motion, p, style, isStatic) {
    if (!ph) {
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(0, 0, F.w, F.h);
      return;
    }
    const iw = ph.w, ih = ph.h;
    if (style === 'marco' && !isStatic) {
      drawBlur(ctx, F, ph, 0.38);
      // foto completa (contain) con un zoom muy suave
      const s0 = Math.min(F.w / iw, F.h / ih) * (F.w > F.h ? 0.94 : 1);
      const z = 1 + 0.05 * (motion.zoomOut ? 1 - p : p);
      const w = iw * s0 * z, h = ih * s0 * z;
      const cy = F.w > F.h ? F.h / 2 : F.h * 0.4;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 40;
      ctx.drawImage(ph.src, (F.w - w) / 2, cy - h / 2, w, h);
      ctx.restore();
      return;
    }
    const cover = Math.max(F.w / iw, F.h / ih);
    let scale, cx, cy; // cx, cy: punto de la imagen (0..1) en el centro del encuadre
    if (isStatic) {
      scale = cover; cx = 0.5; cy = 0.5;
    } else if (motion.type === 'pan') {
      scale = cover * 1.04;
      const visW = F.w / (iw * scale);           // fracción visible del ancho
      const range = Math.max(0, 1 - visW) * 0.86; // recorrido horizontal disponible
      const e = easeInOut(p);
      const from = 0.5 - range / 2, to = 0.5 + range / 2;
      cx = motion.dir > 0 ? from + (to - from) * e : to - (to - from) * e;
      cy = 0.5;
    } else {
      const z0 = 1.0, z1 = 1.13;
      const z = motion.zoomOut ? z1 + (z0 - z1) * p : z0 + (z1 - z0) * p;
      scale = cover * z;
      cx = 0.5 + (motion.dx || 0) * p;
      cy = 0.5 + (motion.dy || 0) * p;
    }
    const dw = iw * scale, dh = ih * scale;
    // limitar para no enseñar bordes vacíos
    let x = F.w / 2 - cx * dw, y = F.h / 2 - cy * dh;
    x = clamp(x, F.w - dw, 0);
    y = clamp(y, F.h - dh, 0);
    ctx.drawImage(ph.src, x, y, dw, dh);
  }

  /** Fondo desenfocado (la foto reducida a ~64 px y ampliada) + oscurecido. */
  function drawBlur(ctx, F, ph, dark) {
    const b = ph.blur;
    const s = Math.max(F.w / b.width, F.h / b.height) * 1.08;
    const w = b.width * s, h = b.height * s;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(b, (F.w - w) / 2, (F.h - h) / 2, w, h);
    ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${dark})`;
    ctx.fillRect(0, 0, F.w, F.h);
  }

  function gradV(ctx, F, y0, y1, a0, a1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(0,0,0,${a0})`);
    g.addColorStop(1, `rgba(0,0,0,${a1})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), F.w, Math.abs(y1 - y0));
  }

  function gradH(ctx, F, x0, x1, a0, a1) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(0,0,0,${a0})`);
    g.addColorStop(1, `rgba(0,0,0,${a1})`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), F.h);
  }

  /** Logo dentro de una caja máxima (bw×bh). Con placa blanca opcional. Devuelve {w,h}. */
  function drawLogo(ctx, logo, x, y, bw, bh, plate, align) {
    if (!logo) return { w: 0, h: 0 };
    const pad = plate ? Math.round(bh * 0.16) : 0;
    const s = Math.min((bw - pad * 2) / logo.width, (bh - pad * 2) / logo.height);
    const w = logo.width * s, h = logo.height * s;
    const W = w + pad * 2, H = h + pad * 2;
    const x0 = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
    ctx.save();
    if (plate) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x0, y, W, H, Math.min(22, H * 0.22));
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }
    ctx.drawImage(logo, x0 + pad, y + pad, w, h);
    ctx.restore();
    return { w: W, h: H };
  }

  /** Marca de agua de «muestra» en diagonal + rótulo. */
  function drawWatermark(ctx, F, text, L) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 104);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(F.w / 2, F.h / 2);
    ctx.rotate(-Math.PI / 7);
    const word = L.sample;
    const stepX = 760, stepY = 330;
    const span = Math.hypot(F.w, F.h);
    for (let yy = -span / 2; yy <= span / 2; yy += stepY) {
      const off = (Math.round(yy / stepY) % 2) * (stepX / 2);
      for (let xx = -span / 2; xx <= span / 2; xx += stepX) ctx.fillText(word, xx + off, yy);
    }
    ctx.restore();
    const label = text ? `${L.sample} · ${text}` : L.sample;
    ctx.save();
    ctx.globalAlpha = 0.9;
    pill(ctx, label, F.w / 2, F.w > F.h ? 26 : 46, { size: 30, bg: 'rgba(0,0,0,0.55)', color: '#fff', align: 'center', weight: 700 });
    ctx.restore();
  }

  // ---------- textos de cada escena ----------

  function priceText(d, L) {
    const n = Number(String(d.price || '').replace(/[^\d]/g, ''));
    if (!n) return '';
    let s;
    if (L.code === 'en') s = '€' + n.toLocaleString('en-GB');
    else s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
    return d.op === 'alquiler' ? s + L.perMonth : s;
  }
  KI.priceText = priceText;

  function badgeText(d, L) {
    if (d.label && d.label.trim()) return d.label.trim().toUpperCase();
    return d.op === 'alquiler' ? L.forRent : L.forSale;
  }

  function featureChips(d, L) {
    const out = [];
    const num = (v) => String(v || '').trim();
    if (num(d.rooms)) out.push(`${num(d.rooms)} ${Number(d.rooms) === 1 ? L.room1 : L.rooms}`);
    if (num(d.baths)) out.push(`${num(d.baths)} ${Number(d.baths) === 1 ? L.bath1 : L.baths}`);
    if (num(d.m2)) out.push(`${num(d.m2)} m²`);
    return out;
  }
  KI.featureChips = featureChips;

  /** Fila(s) de chips; devuelve la altura total ocupada. */
  function chipRows(ctx, chips, x, y, maxW, size, bg, color, align, a) {
    ctx.font = font(700, size);
    const gap = size * 0.4;
    const h = size * 1.72;
    const rows = [[]];
    let rowW = 0;
    for (const c of chips) {
      const w = ctx.measureText(c).width + size * 1.2;
      if (rowW + w > maxW && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push({ c, w });
      rowW += w + gap;
    }
    rows.forEach((row, ri) => {
      const total = row.reduce((s, it) => s + it.w, 0) + gap * (row.length - 1);
      let cx = align === 'center' ? x - total / 2 : x;
      row.forEach((it, i) => {
        const p = a((ri * row.length + i) * 0.12);
        ctx.save();
        ctx.globalAlpha *= p;
        pill(ctx, it.c, cx, y + ri * (h + gap) + (1 - p) * 26, { size, bg, color, weight: 700, padX: size * 0.6, padY: size * 0.36 });
        ctx.restore();
        cx += it.w + gap;
      });
    });
    return rows.length * (h + gap) - gap;
  }

  // Disposición por formato (coordenadas base)
  const LAYOUT = {
    reel: { mx: 72, maxW: 850, bottom: 1500, logo: [72, 150, 320, 112], tagY: 300, wmTop: 46 },
    story: { mx: 72, maxW: 860, bottom: 1530, logo: [72, 150, 320, 112], tagY: 300 },
    wide: { mx: 96, maxW: 1100, bottom: 960, logo: [96, 70, 330, 112], tagY: 70 },
    post: { mx: 64, maxW: 940, bottom: 1170, logo: [64, 60, 300, 104], tagY: 60 },
  };

  /** Bloque de portada: etiqueta, título, ubicación, precio y (en estático) chips. */
  function drawIntroText(ctx, F, S, lt, opts) {
    const { d, L, brand } = S;
    const lay = LAYOUT[F.id];
    const a = opts.static ? () => 1 : (delay) => anim(lt, delay, 0.6);
    const isWide = F.id === 'wide';
    const x = lay.mx;
    let y = lay.bottom;

    // precio (abajo)
    const price = priceText(d, L);
    const priceSize = isWide ? 104 : F.id === 'post' ? 100 : 112;
    if (price) {
      const p = a(0.85);
      const s = fitSize(ctx, price, 800, priceSize, lay.maxW, 56);
      ctx.save(); ctx.globalAlpha *= p;
      shadowText(ctx, price, x, y + (1 - p) * 40, { weight: 800, size: s });
      ctx.restore();
      y -= s * 1.02;
    }
    // ubicación
    if (d.location) {
      const p = a(0.65);
      const size = isWide ? 42 : 44;
      ctx.save(); ctx.globalAlpha *= p;
      ctx.font = font(600, size);
      const loc = wrap(ctx, d.location, lay.maxW - size, 1)[0];
      drawPin(ctx, x + size * 0.34, y - size * 0.36 + (1 - p) * 30, size * 0.85, '#ffffff');
      shadowText(ctx, loc, x + size * 0.95, y + (1 - p) * 30, { weight: 600, size });
      ctx.restore();
      y -= size * 1.55;
    }
    // título (hasta 2 líneas)
    if (d.title) {
      const p = a(0.45);
      const size = isWide ? 62 : F.id === 'post' ? 60 : 66;
      ctx.font = font(700, size);
      const lines = wrap(ctx, d.title, lay.maxW, 2);
      ctx.save(); ctx.globalAlpha *= p;
      for (let i = lines.length - 1; i >= 0; i--) {
        shadowText(ctx, lines[i], x, y + (1 - p) * 34, { weight: 700, size });
        y -= size * 1.14;
      }
      ctx.restore();
      y -= size * 0.2;
    }
    // etiqueta (EN VENTA / EN ALQUILER / personalizada)
    const badge = badgeText(d, L);
    if (badge) {
      const p = a(0.25);
      const size = isWide ? 34 : 36;
      ctx.save(); ctx.globalAlpha *= p;
      pill(ctx, badge, x, y - size * 1.9 + (1 - p) * 26, { size, bg: rgba(brand, 1), color: textOn(brand), weight: 800, radius: 12, shadow: true });
      ctx.restore();
    }
    // chips bajo el precio en estático (carrusel/story)
    if (opts.static && (F.id === 'post' || F.id === 'story')) {
      const chips = featureChips(d, L);
      if (chips.length) chipRows(ctx, chips, x, lay.bottom + 36, lay.maxW, 36, 'rgba(255,255,255,0.92)', '#111', 'left', () => 1);
    }
  }

  /** Etiqueta persistente «precio · zona» para quien entra al vídeo a mitad. */
  function drawMiniTag(ctx, F, S, alpha) {
    const { d, L } = S;
    const price = priceText(d, L);
    const zone = (d.location || '').split(',')[0].trim();
    const txt = [price, zone].filter(Boolean).join(' · ');
    if (!txt) return;
    const lay = LAYOUT[F.id];
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (F.id === 'wide') pill(ctx, txt, F.w - lay.mx, lay.tagY + 10, { size: 34, bg: 'rgba(0,0,0,0.5)', color: '#fff', align: 'right', weight: 700 });
    else pill(ctx, txt, lay.mx, lay.tagY, { size: 34, bg: 'rgba(0,0,0,0.5)', color: '#fff', weight: 700 });
    ctx.restore();
  }

  function drawPhotoText(ctx, F, S, scene, lt, opts) {
    const { L, brand } = S;
    const lay = LAYOUT[F.id];
    const a = opts.static ? () => 1 : (delay) => anim(lt, delay, 0.55);
    const x = lay.mx;
    const isWide = F.id === 'wide';
    let y = lay.bottom;

    if (scene.chips && scene.chips.length) {
      const size = isWide ? 42 : 46;
      const h = chipRows(ctx, scene.chips, x, 0, lay.maxW, size, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'left', () => 0); // medir
      chipRows(ctx, scene.chips, x, y - h, lay.maxW, size, rgba(brand, 0.96), textOn(brand), 'left', (dl) => a(0.25 + dl));
      y -= h + 26;
    }
    if (scene.highlight) {
      const size = isWide ? 64 : F.id === 'post' ? 62 : 72;
      ctx.font = font(800, size);
      const lines = wrap(ctx, scene.highlight, lay.maxW, 3);
      const p = a(0.3);
      ctx.save(); ctx.globalAlpha *= p;
      for (let i = lines.length - 1; i >= 0; i--) {
        shadowText(ctx, lines[i], x, y + (1 - p) * 36, { weight: 800, size });
        y -= size * 1.12;
      }
      ctx.restore();
      y -= size * 0.25;
    }
    if (scene.caption) {
      const p = a(0.12);
      const size = isWide ? 34 : 38;
      ctx.save(); ctx.globalAlpha *= p;
      ctx.font = font(700, size);
      const cap = wrap(ctx, scene.caption, lay.maxW - size * 1.4, 1)[0] || '';
      pill(ctx, cap, x, y - size * 1.75 + (1 - p) * 24, { size, bg: 'rgba(255,255,255,0.92)', color: '#111', weight: 700 });
      ctx.restore();
    }
  }

  function drawOutro(ctx, F, S, lt, opts) {
    const { d, L, brand, agency } = S;
    const a = opts.static ? () => 1 : (delay) => anim(lt, delay, 0.6);
    const ph = S.photos[S.photos.length > 1 ? S.photos.length - 1 : 0];
    if (ph) drawBlur(ctx, F, ph, 0.5);
    else { ctx.fillStyle = '#1d2027'; ctx.fillRect(0, 0, F.w, F.h); }
    // velo de color de marca
    const g = ctx.createLinearGradient(0, 0, 0, F.h);
    g.addColorStop(0, rgba(brand, 0.28));
    g.addColorStop(1, rgba(brand, 0.62));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, F.w, F.h);

    const cx = F.w / 2;
    const isWide = F.id === 'wide';
    const maxW = isWide ? 1300 : F.w - 150;
    let y = isWide ? 150 : F.id === 'post' ? 190 : 430;

    // logo
    let p = a(0.15);
    ctx.save(); ctx.globalAlpha *= p;
    const lg = drawLogo(ctx, agency.logo, cx, y + (1 - p) * 30, isWide ? 520 : 600, isWide ? 200 : 230, agency.plate, 'center');
    ctx.restore();
    y += lg.h ? lg.h + 60 : 0;

    // nombre de la agencia
    if (agency.name) {
      p = a(0.3);
      const size = fitSize(ctx, agency.name, 700, agency.logo ? 50 : 76, maxW, 30);
      ctx.save(); ctx.globalAlpha *= p;
      shadowText(ctx, agency.name, cx, y + size + (1 - p) * 30, { weight: 700, size, align: 'center' });
      ctx.restore();
      y += size * 1.9;
    }
    // llamada a la acción
    p = a(0.5);
    const ctaSize = isWide ? 76 : 82;
    ctx.font = font(800, ctaSize);
    const cta = wrap(ctx, d.cta || L.cta, maxW, 2);
    ctx.save(); ctx.globalAlpha *= p;
    cta.forEach((line, i) => shadowText(ctx, line, cx, y + ctaSize * (1 + i * 1.12) + (1 - p) * 30, { weight: 800, size: ctaSize, align: 'center' }));
    ctx.restore();
    y += ctaSize * (cta.length * 1.12) + 70;

    // teléfono / WhatsApp
    const phone = (agency.whatsapp || agency.phone || '').trim();
    if (phone) {
      p = a(0.7);
      ctx.save(); ctx.globalAlpha *= p;
      const lbl = agency.whatsapp ? L.callOrWhatsapp : L.call;
      ctx.font = font(600, 36);
      shadowText(ctx, lbl, cx, y + 36, { weight: 600, size: 36, align: 'center' });
      const ps = fitSize(ctx, phone, 800, 66, maxW - 80, 40);
      pill(ctx, phone, cx, y + 64 + (1 - p) * 24, { size: ps, bg: '#ffffff', color: '#111', align: 'center', weight: 800, shadow: true });
      ctx.restore();
      y += 64 + ps * 1.75 + 50;
    }
    // web y referencia
    const extra = [agency.web, d.ref ? `Ref. ${d.ref}` : ''].filter(Boolean);
    if (extra.length) {
      p = a(0.85);
      ctx.save(); ctx.globalAlpha *= p;
      extra.forEach((t, i) => {
        const size = i === 0 && agency.web ? 40 : 32;
        const s = fitSize(ctx, t, 600, size, maxW, 22);
        shadowText(ctx, t, cx, y + s + i * 56, { weight: 600, size: s, align: 'center' });
      });
      ctx.restore();
    }
  }

  // ---------- línea de tiempo ----------

  /**
   * S = { photos:[{src,blur,w,h,caption}], d:{...}, agency:{name,logo,plate,...},
   *       L:{textos}, brand:{r,g,b}, opts:{style, perPhoto, sample, wmText} }
   */
  function buildTimeline(S, formatId) {
    const T = 0.55; // fundido entre escenas
    const per = clamp(Number(S.opts.perPhoto) || 2.6, 1.6, 5);
    const intro = Math.max(3.3, per + 0.6), outro = 3.8;
    const scenes = [];
    const n = S.photos.length;
    const chips = featureChips(S.d, S.L);
    let t = 0;
    const motionFor = (i, ph) => {
      const vertical = KI.FORMATS[formatId].h > KI.FORMATS[formatId].w;
      const landscape = ph && ph.w / ph.h > 1.15;
      if (vertical && landscape && S.opts.style !== 'marco') return { type: 'pan', dir: i % 2 === 0 ? 1 : -1 };
      const drift = [[0.02, -0.01], [-0.02, 0.01], [0.015, 0.015], [-0.015, -0.01]][i % 4];
      return { type: 'zoom', zoomOut: i % 2 === 1, dx: drift[0], dy: drift[1] };
    };
    scenes.push({ type: 'intro', photo: 0, start: 0, dur: intro, motion: motionFor(0, S.photos[0]) });
    t = intro - T;
    for (let i = 1; i < n; i++) {
      const ph = S.photos[i];
      const sc = { type: 'photo', photo: i, start: t, dur: per, motion: motionFor(i, ph), caption: ph.caption || '', highlight: (ph.highlight || '').trim() };
      if (i === 1 && chips.length) sc.chips = chips;
      scenes.push(sc);
      t += per - T;
    }
    scenes.push({ type: 'outro', photo: -1, start: t, dur: outro });
    return { scenes, duration: t + outro, T };
  }
  KI.buildTimeline = buildTimeline;

  function drawScene(ctx, F, S, sc, lt, opts) {
    const ph = sc.photo >= 0 ? S.photos[sc.photo] : null;
    if (sc.type === 'outro') { drawOutro(ctx, F, S, lt, opts); return; }
    const p = opts.static ? 0.5 : clamp(lt / (sc.dur + 0.55), 0, 1);
    drawPhoto(ctx, F, ph, sc.motion || {}, p, S.opts.style, opts.static);
    // degradados para legibilidad
    if (F.id === 'wide') {
      gradH(ctx, F, 0, F.w * 0.66, 0.62, 0);
      gradV(ctx, F, F.h * 0.45, F.h, 0, 0.55);
      gradV(ctx, F, 0, 260, 0.35, 0);
    } else {
      gradV(ctx, F, F.h * 0.42, F.h, 0, 0.8);
      gradV(ctx, F, 0, F.id === 'post' ? 260 : 420, 0.42, 0);
    }
    // logo arriba
    const lay = LAYOUT[F.id];
    const la = opts.static ? 1 : anim(lt, 0.05, 0.5);
    ctx.save(); ctx.globalAlpha *= la;
    const [lx, ly, lw, lh] = lay.logo;
    let logoH = 0;
    if (S.agency.logo) logoH = drawLogo(ctx, S.agency.logo, lx, ly, lw, lh, S.agency.plate, 'left').h;
    else if (S.agency.name) { shadowText(ctx, S.agency.name, lx, ly + 48, { weight: 800, size: 44 }); logoH = 60; }
    ctx.restore();
    if (sc.type === 'intro') drawIntroText(ctx, F, S, lt, opts);
    else {
      if (F.id !== 'post') {
        const tagY = F.id === 'wide' ? lay.tagY : ly + Math.max(logoH, 0) + 26;
        const old = lay.tagY; lay.tagY = tagY;
        drawMiniTag(ctx, F, S, opts.static ? 1 : anim(lt, 0.2, 0.5));
        lay.tagY = old;
      }
      drawPhotoText(ctx, F, S, sc, lt, opts);
    }
  }

  /** Dibuja el fotograma del instante t (segundos) en ctx. outW = ancho real del canvas. */
  function drawFrame(ctx, S, formatId, tl, t, outW) {
    const F = FORMATS[formatId];
    const k = outW / F.w;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, F.w, F.h);
    const active = tl.scenes.filter((s) => t >= s.start && t < s.start + s.dur);
    if (!active.length) active.push(tl.scenes[tl.scenes.length - 1]);
    active.forEach((sc, i) => {
      const lt = t - sc.start;
      ctx.save();
      if (i > 0) ctx.globalAlpha = clamp(lt / tl.T, 0, 1);
      // el texto de la escena saliente se desvanece antes del fundido
      drawScene(ctx, F, S, sc, lt, { static: false });
      ctx.restore();
    });
    if (S.opts.sample) drawWatermark(ctx, F, S.opts.wmText, S.L);
  }
  KI.drawFrame = drawFrame;

  /** Imagen estática: kind = 'cover' | 'photo' | 'cta'. */
  function drawStill(ctx, S, formatId, kind, index, total, outW) {
    const F = FORMATS[formatId];
    const k = outW / F.w;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, F.w, F.h);
    if (kind === 'cta') drawOutro(ctx, F, S, 99, { static: true });
    else {
      const sc = kind === 'cover'
        ? { type: 'intro', photo: 0 }
        : { type: 'photo', photo: index, caption: S.photos[index].caption || '', highlight: S.stillHighlights[index] || '' };
      drawScene(ctx, F, S, sc, 99, { static: true });
    }
    if (formatId === 'post' && total > 1) {
      pill(ctx, `${index + 1}/${total}`, F.w - 60, 64, { size: 30, bg: 'rgba(0,0,0,0.5)', color: '#fff', align: 'right', weight: 700 });
      if (kind === 'cover') pill(ctx, S.L.swipe + '  →', F.w - 60, 132, { size: 30, bg: 'rgba(255,255,255,0.92)', color: '#111', align: 'right', weight: 700 });
    }
    if (S.opts.sample) drawWatermark(ctx, F, S.opts.wmText, S.L);
  }
  KI.drawStill = drawStill;
})(window.KI = window.KI || {});
