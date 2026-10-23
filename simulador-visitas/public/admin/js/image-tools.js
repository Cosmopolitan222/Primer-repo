/**
 * Compresión de imágenes en el navegador antes de subirlas.
 *
 * Ventajas: la subida pesa 5–20 veces menos (importante con datos móviles), el servidor
 * no necesita librerías de imagen y el visitante descarga siempre versiones optimizadas.
 *
 * Por cada foto se generan tres versiones:
 *   full     → alta calidad (360°: hasta 4096×2048 · normal: hasta 1920 px de lado)
 *   preview  → ligera, se muestra al instante mientras carga la buena (1024 / 640 px)
 *   thumb    → miniatura 4:3 de 320×240 para la tira de estancias
 */

const SIZES = {
  pano: { full: 4096, preview: 1024 },
  flat: { full: 1920, preview: 640 },
};

/** Una foto es 360° equirectangular si su proporción es 2:1 (con un pequeño margen). */
export function looksPanoramic(width, height) {
  return Math.abs(width / height - 2) < 0.04;
}

/** Decodifica el archivo respetando la orientación EXIF. */
async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* algunos navegadores no aceptan la opción; probamos con <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Dibuja la imagen (o un recorte) en un canvas del tamaño indicado. */
function draw(src, w, h, crop) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (crop) ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  else ctx.drawImage(src, 0, 0, w, h);
  return c;
}

/** Reduce en pasos de 1/2 para que el resultado sea nítido (evita aliasing). */
function downscale(src, sw, sh, w, h) {
  let cur = src, cw = sw, ch = sh;
  while (cw / 2 > w && ch / 2 > h) {
    cw = Math.round(cw / 2);
    ch = Math.round(ch / 2);
    cur = draw(cur, cw, ch);
  }
  return draw(cur, w, h);
}

/** Codifica en WebP (o JPEG si el navegador no sabe generar WebP, p. ej. Safari antiguo). */
function encode(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === 'image/webp') return resolve(blob);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    }, 'image/webp', quality);
  });
}

/**
 * Procesa un archivo y devuelve { kind, width, height, full, preview, thumb, savedPct }.
 * forceKind permite al usuario corregir la detección automática.
 */
export async function processPhoto(file, forceKind) {
  const src = await decode(file);
  const sw = src.width, sh = src.height;
  const kind = forceKind || (looksPanoramic(sw, sh) ? 'pano' : 'flat');
  const lim = SIZES[kind];

  // Versión completa: en 360° se fuerza 2:1 exacto y un máximo de 4096 px (límite de muchas GPU móviles)
  let fw, fh;
  if (kind === 'pano') {
    fw = Math.min(lim.full, sw);
    fw -= fw % 2;
    fh = fw / 2;
  } else {
    const k = Math.min(1, lim.full / Math.max(sw, sh));
    fw = Math.round(sw * k);
    fh = Math.round(sh * k);
  }
  const fullCanvas = downscale(src, sw, sh, fw, fh);
  const pw = Math.min(lim.preview, fw);
  const ph = Math.round((pw * fh) / fw);
  const previewCanvas = downscale(fullCanvas, fw, fh, pw, ph);

  // Miniatura: recorte central 4:3
  const cw = Math.min(fw, Math.round((fh * 4) / 3));
  const ch = Math.round((cw * 3) / 4);
  const thumbCanvas = draw(previewCanvas, 320, 240, {
    x: ((fw - cw) / 2) * (pw / fw), y: ((fh - ch) / 2) * (pw / fw), w: cw * (pw / fw), h: ch * (pw / fw),
  });

  const [full, preview, thumb] = await Promise.all([
    encode(fullCanvas, kind === 'pano' ? 0.8 : 0.82),
    encode(previewCanvas, 0.7),
    encode(thumbCanvas, 0.72),
  ]);
  src.close?.();
  return { kind, width: fw, height: fh, full, preview, thumb, savedPct: Math.max(0, Math.round((1 - full.size / file.size) * 100)) };
}

/** Comprime una imagen simple (logo o plano) a un máximo de `max` píxeles de lado. */
export async function compressSimple(file, max = 1600) {
  const src = await decode(file);
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const canvas = downscale(src, src.width, src.height, Math.round(src.width * k), Math.round(src.height * k));
  // PNG para conservar transparencias (logos, SVG rasterizado); WebP para el resto
  const type = file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/webp';
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), type, 0.9));
}

/** Sugerencia de nombre de estancia a partir del nombre del archivo. */
export function guessRoomName(filename) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b(img|dsc|pano|photo|foto)\s*\d*\b/gi, '').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Nueva estancia';
}
