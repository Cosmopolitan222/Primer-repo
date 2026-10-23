/**
 * Generador de la vivienda de demostración.
 *
 * No depende de fotos externas: "fotografía" un piso ficticio de 5 estancias
 * con un pequeño raytracer (cajas alineadas a ejes + luz de ventanas y lámparas).
 *
 * Produce:
 *   - public/demo/<estancia>-{full,preview,thumb}.jpg   (360° o foto normal)
 *   - public/demo/plano.svg                             (plano esquemático)
 *   - seed/demo.sql                                     (agencia, vivienda, estancias y hotspots)
 *
 * Los hotspots se calculan proyectando el centro real de cada puerta desde la
 * cámara, así que siempre coinciden con la imagen.
 *
 * Uso:  npm run demo:generate      (tarda ~1 minuto; solo hace falta si cambias la demo)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import jpeg from 'jpeg-js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_IMG = path.join(ROOT, 'public', 'demo');
const OUT_SQL = path.join(ROOT, 'seed', 'demo.sql');
const FAST = process.argv.includes('--fast'); // render rápido de prueba

// ---------------------------------------------------------------------------
// Utilidades matemáticas y ruido procedural
// ---------------------------------------------------------------------------
const H = 2.6; // altura de techo (m)
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (h) => [1, 3, 5].map((i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.2;

// ---------------------------------------------------------------------------
// Plano del piso (x = este, z = norte, y = arriba; metros)
// ---------------------------------------------------------------------------
const ROOMS = {
  salon:      { name: 'Salón',               min: [0, 0, 0],   max: [6, H, 5],    wall: '#e9e4dc' },
  cocina:     { name: 'Cocina',              min: [6, 0, 0],   max: [10, H, 5],   wall: '#eef0ee' },
  pasillo:    { name: 'Pasillo',             min: [0, 0, 5],   max: [10, H, 6.5], wall: '#dfe6e9' },
  dormitorio: { name: 'Dormitorio principal', min: [0, 0, 6.5], max: [5, H, 10],   wall: '#e6dfd6' },
  bano:       { name: 'Baño',                min: [5, 0, 6.5], max: [8, H, 10],   wall: '#f2f2f2' },
  lavadero:   { name: 'Lavadero',            min: [8, 0, 6.5], max: [10, H, 10],  wall: '#eeeeee' },
};

// Huecos en muros: puertas (y 0–2.1), paso abierto, ventanas
const DOOR = [0, 2.1];
const WALLS = [
  // Muros exteriores
  { axis: 'z', at: 0, from: 0, to: 10, holes: [{ a: 1.4, b: 4.6, y: [0.35, 2.3], win: true }, { a: 7, b: 9, y: [1.0, 2.2], win: true }] },
  { axis: 'z', at: 10, from: 0, to: 10, holes: [{ a: 1.5, b: 3.5, y: [0.9, 2.2], win: true }, { a: 6.1, b: 6.9, y: [1.5, 2.2], win: true }] },
  { axis: 'x', at: 0, from: 0, to: 10, holes: [] },
  { axis: 'x', at: 10, from: 0, to: 10, holes: [{ a: 1.6, b: 3.4, y: [1.0, 2.2], win: true }] },
  // Muros interiores
  { axis: 'x', at: 6, from: 0, to: 5, holes: [{ a: 1.0, b: 4.0, y: [0, 2.3], frame: true }] }, // salón|cocina (cocina abierta)
  { axis: 'z', at: 5, from: 0, to: 10, holes: [{ a: 1.0, b: 2.0, y: DOOR, frame: true }] },   // salón|pasillo
  { axis: 'z', at: 6.5, from: 0, to: 10, holes: [
    { a: 3.5, b: 4.4, y: DOOR, frame: true },  // dormitorio
    { a: 5.6, b: 6.4, y: DOOR, frame: true },  // baño
    { a: 8.6, b: 9.4, y: DOOR, frame: true },  // lavadero
  ] },
  { axis: 'x', at: 5, from: 6.5, to: 10, holes: [] },
  { axis: 'x', at: 8, from: 6.5, to: 10, holes: [] },
];

// Puertas/pasos usados como hotspots (centro del hueco)
const OPENINGS = {
  'salon>cocina': [6, 1.25, 2.5],
  'salon>pasillo': [1.5, 1.15, 5],
  'pasillo>salon': [1.5, 1.15, 5],
  'pasillo>dormitorio': [3.95, 1.15, 6.5],
  'pasillo>bano': [6.0, 1.15, 6.5],
  'dormitorio>pasillo': [3.95, 1.15, 6.5],
  'cocina>salon': [6, 1.25, 2.5],
  'bano>pasillo': [6.0, 1.15, 6.5],
};

// ---------------------------------------------------------------------------
// Geometría: lista de cajas {min, max, mat}
// ---------------------------------------------------------------------------
const boxes = [];
const box = (min, max, mat) => boxes.push({ min, max, mat });
const T = 0.06; // medio grosor de muro

// Suelos y techos
box([-1, -0.2, -1], [11, 0, 11], 'floor');
box([-1, H, -1], [11, H + 0.2, 11], 'ceiling');

// Construye muros como cajas, restando los huecos
for (const w of WALLS) {
  const segs = [];
  const holes = [...w.holes].sort((p, q) => p.a - q.a);
  let cur = w.from;
  for (const h of holes) {
    if (h.a > cur) segs.push({ a: cur, b: h.a, y: [0, H] });
    if (h.y[0] > 0) segs.push({ a: h.a, b: h.b, y: [0, h.y[0]] });
    segs.push({ a: h.a, b: h.b, y: [h.y[1], H] });
    cur = h.b;
  }
  if (cur < w.to) segs.push({ a: cur, b: w.to, y: [0, H] });
  for (const s of segs) {
    if (w.axis === 'z') box([s.a - (s.a === w.from ? T : 0), s.y[0], w.at - T], [s.b + (s.b === w.to ? T : 0), s.y[1], w.at + T], 'wall');
    else box([w.at - T, s.y[0], s.a], [w.at + T, s.y[1], s.b], 'wall');
  }
  // Marcos de puertas y carpintería de ventanas
  for (const h of holes) {
    const f = 0.05;
    const mat = h.win ? 'frame' : 'trim';
    if (w.axis === 'z') {
      box([h.a - f, h.y[0], w.at - T - 0.01], [h.a, h.y[1], w.at + T + 0.01], mat);
      box([h.b, h.y[0], w.at - T - 0.01], [h.b + f, h.y[1], w.at + T + 0.01], mat);
      box([h.a - f, h.y[1], w.at - T - 0.01], [h.b + f, h.y[1] + f, w.at + T + 0.01], mat);
      if (h.win) {
        box([h.a, h.y[0] - 0.02, w.at - T - 0.04], [h.b, h.y[0], w.at + T + 0.02], 'frame');
        const mid = (h.a + h.b) / 2;
        box([mid - 0.025, h.y[0], w.at - 0.02], [mid + 0.025, h.y[1], w.at + 0.02], 'frame');
      }
    } else {
      box([w.at - T - 0.01, h.y[0], h.a - f], [w.at + T + 0.01, h.y[1], h.a], mat);
      box([w.at - T - 0.01, h.y[0], h.b], [w.at + T + 0.01, h.y[1], h.b + f], mat);
      box([w.at - T - 0.01, h.y[1], h.a - f], [w.at + T + 0.01, h.y[1] + f, h.b + f], mat);
      if (h.win) {
        const mid = (h.a + h.b) / 2;
        box([w.at - 0.02, h.y[0], mid - 0.025], [w.at + 0.02, h.y[1], mid + 0.025], 'frame');
      }
    }
  }
}
// Puerta de entrada cerrada (muro oeste del pasillo) y del lavadero
box([0.06, 0, 5.25], [0.1, 2.1, 6.25], 'door');
box([0.04, 2.1, 5.2], [0.12, 2.16, 6.3], 'trim');

// Zócalos de todas las estancias
for (const [k, r] of Object.entries(ROOMS)) {
  if (k === 'bano') continue;
  const z = 0.08, d = 0.012;
  box([r.min[0] + T, 0, r.min[2] + T], [r.max[0] - T, z, r.min[2] + T + d], 'trim');
  box([r.min[0] + T, 0, r.max[2] - T - d], [r.max[0] - T, z, r.max[2] - T], 'trim');
  box([r.min[0] + T, 0, r.min[2] + T], [r.min[0] + T + d, z, r.max[2] - T], 'trim');
  box([r.max[0] - T - d, 0, r.min[2] + T], [r.max[0] - T, z, r.max[2] - T], 'trim');
}

// --- Salón
box([1.3, 0, 1.4], [3.6, 0.012, 3.9], 'rug');
box([3.7, 0, 1.4], [4.6, 0.42, 3.9], 'sofa');            // asiento
box([4.3, 0, 1.4], [4.65, 0.85, 3.9], 'sofa');           // respaldo
box([3.7, 0, 1.25], [4.65, 0.62, 1.45], 'sofa');         // brazos
box([3.7, 0, 3.85], [4.65, 0.62, 4.05], 'sofa');
box([3.8, 0.42, 1.6], [4.3, 0.55, 2.6], 'cushion');      // cojines
box([3.8, 0.42, 2.7], [4.3, 0.55, 3.7], 'cushion');
box([2.1, 0.33, 2.1], [3.0, 0.38, 3.2], 'woodDark');     // mesa de centro
for (const [x, z] of [[2.15, 2.15], [2.95, 2.15], [2.15, 3.15], [2.95, 3.15]]) box([x - 0.025, 0, z - 0.025], [x + 0.025, 0.33, z + 0.025], 'metal');
box([0.06, 0, 1.4], [0.5, 0.48, 3.6], 'woodDark');       // mueble TV
box([0.07, 0.95, 1.85], [0.12, 1.65, 3.15], 'tv');       // TV
box([0.3, 0, 0.3], [0.62, 0.42, 0.62], 'pot');           // planta
box([0.25, 0.42, 0.25], [0.67, 1.35, 0.67], 'plant');
box([4.7, 0.71, 0.25], [5.7, 0.75, 1.05], 'woodLight');  // mesa comedor
for (const [x, z] of [[4.75, 0.3], [5.65, 0.3], [4.75, 1.0], [5.65, 1.0]]) box([x - 0.025, 0, z - 0.025], [x + 0.025, 0.71, z + 0.025], 'woodLight');
box([5.0, 0.42, 1.15], [5.4, 0.47, 1.5], 'chair');
box([5.0, 0.42, 1.45], [5.4, 0.9, 1.5], 'chair');
for (const [x, z] of [[5.03, 1.18], [5.37, 1.18], [5.03, 1.47], [5.37, 1.47]]) box([x - 0.015, 0, z - 0.015], [x + 0.015, 0.42, z + 0.015], 'metal');
box([1.0, 1.3, 4.92], [1.0, 1.3, 4.92], 'none');
box([3.0, 1.2, 4.93], [4.4, 2.0, 4.94], 'art1');         // cuadro

// --- Cocina
box([6.25, 0, 4.35], [9.94, 0.88, 4.94], 'cabinet');     // muebles bajos norte
box([6.22, 0.88, 4.3], [9.94, 0.92, 4.94], 'counter');
box([6.25, 1.5, 4.6], [9.94, 2.25, 4.94], 'cabinet');    // muebles altos
box([9.35, 0, 1.0], [9.94, 0.88, 4.35], 'cabinet');      // muebles bajos este
box([9.3, 0.88, 1.0], [9.94, 0.92, 4.35], 'counter');
box([9.3, 0, 0.12], [9.94, 1.95, 0.9], 'metal');         // frigorífico
box([7.2, 0, 2.1], [8.8, 0.88, 2.9], 'cabinet');         // isla
box([7.15, 0.88, 2.05], [8.85, 0.93, 2.95], 'counter');
box([7.6, 0.93, 4.45], [8.3, 0.95, 4.85], 'metal');      // fregadero/placa
// Taburetes: asiento + 4 patas
for (const [cx, cz] of [[7.6, 1.85], [8.4, 1.85]]) {
  box([cx - 0.18, 0.66, cz - 0.17], [cx + 0.18, 0.72, cz + 0.17], 'chair');
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box([cx + dx * 0.14 - 0.015, 0, cz + dz * 0.13 - 0.015], [cx + dx * 0.14 + 0.015, 0.66, cz + dz * 0.13 + 0.015], 'metal');
}

// --- Pasillo
box([7.4, 1.3, 6.43], [8.6, 2.0, 6.44], 'art2');
box([2.6, 1.25, 5.06], [3.4, 1.85, 5.07], 'art3');
box([7.3, 0.76, 6.12], [8.5, 0.8, 6.44], 'woodLight');    // consola
box([7.35, 0, 6.15], [8.45, 0.76, 6.42], 'woodDark');

// --- Dormitorio
box([0.8, 0, 7.0], [3.2, 0.012, 9.7], 'rug2');
box([0.06, 0, 7.25], [0.16, 1.15, 9.15], 'woodDark');    // cabecero
box([0.16, 0, 7.35], [2.25, 0.42, 9.05], 'woodLight');   // cama
box([0.16, 0.42, 7.4], [2.2, 0.62, 9.0], 'bedding');
box([0.2, 0.62, 7.5], [0.65, 0.78, 8.15], 'pillow');
box([0.2, 0.62, 8.25], [0.65, 0.78, 8.9], 'pillow');
box([1.3, 0.62, 7.38], [2.22, 0.66, 9.02], 'throw');
box([0.12, 0, 6.75], [0.6, 0.5, 7.2], 'woodDark');       // mesillas
box([0.12, 0, 9.2], [0.6, 0.5, 9.65], 'woodDark');
box([4.35, 0, 7.3], [4.94, 2.35, 9.94], 'wardrobe');     // armario empotrado
box([4.33, 1.1, 8.6], [4.35, 1.3, 8.64], 'metal');

// --- Baño (alicatado en material de muro)
box([5.06, 0, 9.2], [6.8, 0.56, 9.94], 'porcelain');     // bañera
box([5.06, 0.5, 9.2], [6.8, 0.56, 9.94], 'porcelain');
box([7.35, 0, 7.3], [7.94, 0.42, 7.72], 'porcelain');    // inodoro
box([7.78, 0.42, 7.25], [7.94, 0.82, 7.77], 'porcelain');
box([5.06, 0.5, 7.4], [5.58, 0.86, 8.5], 'woodLight');   // lavabo
box([5.1, 0.86, 7.6], [5.5, 0.9, 8.3], 'porcelain');
box([5.06, 1.1, 7.55], [5.08, 1.95, 8.35], 'mirror');
box([7.0, 1.1, 9.92], [7.94, 1.12, 9.94], 'none');

// Zonas de iluminación: salón y cocina comparten espacio (cocina abierta)
const zoneOf = (p) => { const r = roomAt(p); return r === 'cocina' ? 'salon' : r; };

// Lámparas de techo (emisivas) y luces puntuales para iluminar
const LAMPS = [
  [3, 2.0], [8, 2.6], [5, 5.75], [2.5, 8.2], [6.5, 8.2], [9, 8.2],
];
for (const [x, z] of LAMPS) box([x - 0.18, H - 0.04, z - 0.18], [x + 0.18, H, z + 0.18], 'lamp');
const LIGHTS = LAMPS.map(([x, z]) => ({ p: [x, H - 0.25, z], c: hex('#ffe6c7').map((v) => v * 3.2), zone: zoneOf([x, 0, z]) }));

// Ventanas como luces de área (luz de cielo)
const WINDOWS = [];
for (const w of WALLS) for (const h of w.holes) if (h.win) {
  const W = w.axis === 'z'
    ? { axis: 'z', at: w.at, a: h.a, b: h.b, y: h.y, n: w.at === 0 ? [0, 0, 1] : [0, 0, -1] }
    : { axis: 'x', at: w.at, a: h.a, b: h.b, y: h.y, n: w.at === 0 ? [1, 0, 0] : [-1, 0, 0] };
  const mid = (h.a + h.b) / 2;
  W.zone = zoneOf(W.axis === 'z' ? [mid, 0, W.at + W.n[2] * 0.2] : [W.at + W.n[0] * 0.2, 0, mid]);
  WINDOWS.push(W);
}
const SKY = hex('#cfe3f5');

const activeBoxes = boxes.filter((b) => b.mat !== 'none');

// ---------------------------------------------------------------------------
// Materiales
// ---------------------------------------------------------------------------
function roomAt(p) {
  for (const [k, r] of Object.entries(ROOMS)) {
    if (p[0] >= r.min[0] && p[0] <= r.max[0] && p[2] >= r.min[2] && p[2] <= r.max[2]) return k;
  }
  return null;
}
const MAT = {
  floor: (p) => {
    const room = roomAt(p);
    if (room === 'bano' || room === 'cocina' || room === 'lavadero') {
      const s = room === 'cocina' ? 0.6 : 0.45;
      const gu = (p[0] / s) % 1, gv = (p[2] / s) % 1;
      const grout = gu < 0.015 || gv < 0.015;
      const base = room === 'cocina' ? hex('#9c9890') : hex('#c9c5bd');
      return grout ? hex('#77736c') : mix(base, hex('#b5b0a6'), fbm(p[0] * 3, p[2] * 3) * 0.4);
    }
    // Tarima de madera: tablas de 0.18 m con vetas
    const pw = 0.18, row = Math.floor(p[0] / pw);
    const off = hash(row, 3) * 2.4;
    const plank = Math.floor((p[2] + off) / 1.2);
    const tone = hash(row, plank);
    let c = mix(hex('#a8794e'), hex('#c69a6b'), tone);
    c = mix(c, hex('#8a5f3a'), fbm(p[0] * 40, p[2] * 2.5) * 0.35);
    const gap = (p[0] / pw) % 1 < 0.025 || ((p[2] + off) / 1.2) % 1 < 0.006;
    return gap ? mix(c, [0, 0, 0], 0.45) : c;
  },
  ceiling: () => hex('#f4f2ee'),
  wall: (p, n) => {
    const room = roomAt([p[0] + n[0] * 0.1, 0, p[2] + n[2] * 0.1]) || 'salon';
    const r = ROOMS[room];
    const tiles = room === 'bano' ? [0, 2.2] : room === 'cocina' ? [0.92, 1.5] : null;
    if (tiles && p[1] > tiles[0] && p[1] < tiles[1]) {
      const along = n[0] !== 0 ? p[2] : p[0];
      const s = room === 'bano' ? 0.3 : 0.15;
      const grout = (along / s) % 1 < 0.03 || (p[1] / (s * 0.5)) % 1 < 0.06;
      return grout ? hex('#bdbdbd') : room === 'bano' ? hex('#e7ecef') : hex('#5f8a8b');
    }
    return mix(hex(r.wall), hex('#d6d0c6'), fbm(p[0] * 2 + p[2] * 2, p[1] * 2) * 0.12);
  },
  trim: () => hex('#f7f7f5'),
  frame: () => hex('#3d3f42'),
  door: (p) => mix(hex('#7a5232'), hex('#5c3b22'), fbm(p[2] * 3, p[1] * 30)),
  rug: (p) => mix(hex('#cdbfa8'), hex('#b8a88d'), fbm(p[0] * 6, p[2] * 6)),
  rug2: (p) => mix(hex('#8e9aa6'), hex('#7c8894'), fbm(p[0] * 8, p[2] * 8)),
  sofa: (p) => mix(hex('#4f5d6b'), hex('#46525e'), fbm(p[0] * 20, p[2] * 20)),
  cushion: () => hex('#d8a25a'),
  woodDark: (p) => mix(hex('#5a3e2b'), hex('#6e4d35'), fbm(p[0] * 2, p[1] * 25 + p[2] * 2)),
  woodLight: (p) => mix(hex('#c8a57d'), hex('#b8936a'), fbm(p[0] * 2 + p[2] * 2, p[1] * 25)),
  metal: () => hex('#a9adb1'),
  tv: () => hex('#111214'),
  pot: () => hex('#c9c3b8'),
  plant: (p) => mix(hex('#3d6b35'), hex('#5c8f4a'), fbm(p[0] * 9, p[1] * 9 + p[2] * 9)),
  chair: () => hex('#2f2f31'),
  art1: (p) => mix(hex('#d9643a'), hex('#2f6f8f'), clamp((p[0] - 3.0) / 1.4 + Math.sin(p[1] * 6) * 0.2)),
  art2: (p) => mix(hex('#e8c35a'), hex('#3b5a7a'), clamp((p[1] - 1.3) / 0.7)),
  art3: (p) => (Math.hypot(p[0] - 3, p[1] - 1.55) < 0.22 ? hex('#c23b2a') : hex('#efe9df')),
  cabinet: () => hex('#f3f1ec'),
  counter: (p) => mix(hex('#d7d4ce'), hex('#bdb9b1'), fbm(p[0] * 6, p[2] * 6)),
  bedding: () => hex('#f2f0ea'),
  pillow: () => hex('#e4ded2'),
  throw: () => hex('#7d8f7a'),
  wardrobe: (p) => {
    const seam = ((p[2] - 7.3) / 0.88) % 1 < 0.008;
    return seam ? hex('#bdb8ae') : hex('#ece8e0');
  },
  porcelain: () => hex('#fbfbfb'),
  mirror: () => hex('#9fb4c0'),
  lamp: () => [4, 3.7, 3.2], // emisivo
};

// ---------------------------------------------------------------------------
// Raytracing
// ---------------------------------------------------------------------------
function intersect(o, d, maxT = Infinity, anyHit = false) {
  let best = maxT, hitBox = null, hitAxis = 0, hitSign = 0;
  const inv0 = 1 / d[0], inv1 = 1 / d[1], inv2 = 1 / d[2];
  for (let i = 0; i < activeBoxes.length; i++) {
    const b = activeBoxes[i];
    let t1 = (b.min[0] - o[0]) * inv0, t2 = (b.max[0] - o[0]) * inv0;
    let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), ax = 0;
    t1 = (b.min[1] - o[1]) * inv1; t2 = (b.max[1] - o[1]) * inv1;
    let a = Math.min(t1, t2);
    if (a > tmin) { tmin = a; ax = 1; }
    tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (b.min[2] - o[2]) * inv2; t2 = (b.max[2] - o[2]) * inv2;
    a = Math.min(t1, t2);
    if (a > tmin) { tmin = a; ax = 2; }
    tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmax >= Math.max(tmin, 0) && tmin > 1e-4 && tmin < best) {
      if (anyHit && b.mat !== 'lamp') return true;
      if (b.mat === 'lamp' && anyHit) continue;
      best = tmin; hitBox = b; hitAxis = ax; hitSign = d[ax] > 0 ? -1 : 1;
    }
  }
  if (anyHit) return false;
  return hitBox ? { t: best, box: hitBox, axis: hitAxis, sign: hitSign } : null;
}

function sky(d) {
  if (d[1] < -0.02) return mix(hex('#8d9a7c'), hex('#6f7b62'), clamp(-d[1] * 3)); // jardín
  // Edificios lejanos simples
  const ang = Math.atan2(d[0], d[2]);
  const hgt = 0.05 + 0.12 * Math.floor(hash(Math.floor(ang * 8), 1) * 4) / 4;
  if (d[1] < hgt) return mix(hex('#d9d2c5'), hex('#bfb6a6'), hash(Math.floor(ang * 8), 2));
  const c = mix(hex('#eaf3fb'), hex('#7fb2e0'), clamp(d[1] * 1.6));
  const cl = clamp((fbm(ang * 3, d[1] * 6) - 0.55) * 3);
  return mix(c, [1, 1, 1], cl * 0.8);
}

// Muestreo determinista de las luces de área: cada submuestra del píxel usa
// un punto distinto de una rejilla, así las sombras salen suaves y sin grano.
const STRATA = [[0.25, 0.25], [0.75, 0.75], [0.75, 0.25], [0.25, 0.75]];

function shade(o, d, sIdx = 0) {
  const hit = intersect(o, d);
  if (!hit) return sky(d).map((v) => v * 1.6);
  const p = [o[0] + d[0] * hit.t, o[1] + d[1] * hit.t, o[2] + d[2] * hit.t];
  const n = [0, 0, 0]; n[hit.axis] = hit.sign;
  if (hit.box.mat === 'lamp') return MAT.lamp();
  const albedo = MAT[hit.box.mat](p, n);
  const q = [p[0] + n[0] * 1e-3, p[1] + n[1] * 1e-3, p[2] + n[2] * 1e-3];

  // Luz ambiente + oclusión aproximada (rincones más oscuros)
  const zone = zoneOf(q);
  const room = ROOMS[roomAt(q)] || ROOMS.salon;
  const [ja, jb] = STRATA[sIdx % 4];
  let dEdge = Infinity;
  for (let k = 0; k < 3; k++) {
    if (n[k] !== 0) continue;
    dEdge = Math.min(dEdge, q[k] - room.min[k], room.max[k] - q[k]);
  }
  const ao = 1 - 0.45 * Math.exp(-Math.max(dEdge, 0) / 0.35);
  let light = [0.16 * ao, 0.155 * ao, 0.15 * ao];

  // Lámparas
  for (const L of LIGHTS) {
    if (L.zone !== zone) continue;
    const lp = [L.p[0] + (ja - 0.5) * 0.3, L.p[1], L.p[2] + (jb - 0.5) * 0.3];
    const v = [lp[0] - q[0], lp[1] - q[1], lp[2] - q[2]];
    const dist = Math.hypot(v[0], v[1], v[2]);
    if (dist > 7) continue;
    const l = [v[0] / dist, v[1] / dist, v[2] / dist];
    const cos = n[0] * l[0] + n[1] * l[1] + n[2] * l[2];
    if (cos <= 0) continue;
    if (intersect(q, l, dist - 0.05, true)) continue;
    const f = (cos / (1 + dist * dist * 0.35)) * 0.55;
    light[0] += L.c[0] * f; light[1] += L.c[1] * f; light[2] += L.c[2] * f;
  }
  // Luz de cielo entrando por las ventanas (muestreo de área)
  for (const W of WINDOWS) {
    if (W.zone !== zone) continue;
    const s = W.a + ja * (W.b - W.a), y = W.y[0] + jb * (W.y[1] - W.y[0]);
    const wp = W.axis === 'z' ? [s, y, W.at] : [W.at, y, s];
    const v = [wp[0] - q[0], wp[1] - q[1], wp[2] - q[2]];
    const dist = Math.hypot(v[0], v[1], v[2]);
    if (dist > 9) continue;
    const l = [v[0] / dist, v[1] / dist, v[2] / dist];
    const cos = n[0] * l[0] + n[1] * l[1] + n[2] * l[2];
    const cosW = -(W.n[0] * l[0] + W.n[1] * l[1] + W.n[2] * l[2]);
    if (cos <= 0 || cosW <= 0) continue;
    if (intersect(q, l, dist - 0.08, true)) continue;
    const area = (W.b - W.a) * (W.y[1] - W.y[0]);
    const f = (cos * cosW * area) / (dist * dist + 0.6) * 0.9;
    light[0] += SKY[0] * f * 2.2; light[1] += SKY[1] * f * 2.1; light[2] += SKY[2] * f * 1.9;
  }
  let c = [albedo[0] * light[0], albedo[1] * light[1], albedo[2] * light[2]];
  // Reflejo tenue en espejo / encimeras
  if (hit.box.mat === 'mirror' || hit.box.mat === 'tv') {
    const r = [...d]; r[hit.axis] = -r[hit.axis];
    const refl = intersect(q, r);
    const k = hit.box.mat === 'mirror' ? 0.75 : 0.12;
    const rc = refl ? MAT[refl.box.mat === 'lamp' ? 'ceiling' : refl.box.mat]([q[0] + r[0] * refl.t, q[1] + r[1] * refl.t, q[2] + r[2] * refl.t], [0, 0, 0]).map((v) => v * 0.8) : sky(r);
    c = mix(c, rc, k);
  }
  return c;
}

// Tono fílmico simple + gamma
function toSRGB(c) {
  return c.map((v) => {
    const x = v * 1.05;
    const t = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    return Math.round(clamp(Math.pow(clamp(t), 1 / 2.2)) * 255);
  });
}

function render(w, h, dirFn, origin, spp) {
  const buf = Buffer.alloc(w * h * 4);
  const jitter = spp === 1 ? [[0.5, 0.5]] : [[0.25, 0.25], [0.75, 0.75], [0.75, 0.25], [0.25, 0.75]].slice(0, spp);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let acc = [0, 0, 0];
      for (let si = 0; si < jitter.length; si++) {
        const [jx, jy] = jitter[si];
        const d = dirFn((i + jx) / w, (j + jy) / h);
        const c = shade(origin, d, si + ((i + j) & 1) * 2);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const s = toSRGB(acc.map((v) => v / jitter.length));
      const k = (j * w + i) * 4;
      buf[k] = s[0]; buf[k + 1] = s[1]; buf[k + 2] = s[2]; buf[k + 3] = 255;
    }
  }
  return buf;
}

// Equirectangular: u -> yaw [-180,180], v -> pitch [90,-90]
const equirectDir = (u, v) => {
  const yaw = (u * 360 - 180) * Math.PI / 180, pitch = (90 - v * 180) * Math.PI / 180;
  return [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
};
// Cámara rectilínea (foto normal)
function perspective(yawDeg, pitchDeg, hfovDeg, aspect) {
  const y = yawDeg * Math.PI / 180, p = pitchDeg * Math.PI / 180;
  const f = [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)];
  const r = [Math.cos(y), 0, -Math.sin(y)];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]; // f × r = arriba
  const tx = Math.tan(hfovDeg * Math.PI / 360), ty = tx / aspect;
  const dir = (a, b) => {
    const sx = (2 * a - 1) * tx, sy = (1 - 2 * b) * ty;
    const d = [f[0] + sx * r[0] + sy * u[0], f[1] + sx * r[1] + sy * u[1], f[2] + sx * r[2] + sy * u[2]];
    const l = Math.hypot(...d);
    return [d[0] / l, d[1] / l, d[2] / l];
  };
  // Proyecta un punto 3D a coordenadas de imagen en % (0–100)
  const project = (o, P) => {
    const v = [P[0] - o[0], P[1] - o[1], P[2] - o[2]];
    const zf = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
    const xr = v[0] * r[0] + v[1] * r[1] + v[2] * r[2];
    const yu = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
    return { x: ((xr / zf / tx + 1) / 2) * 100, y: ((1 - yu / zf / ty) / 2) * 100 };
  };
  return { dir, project };
}
function yawPitchTo(o, P) {
  const v = [P[0] - o[0], P[1] - o[1], P[2] - o[2]];
  return {
    yaw: Math.atan2(v[0], v[2]) * 180 / Math.PI,
    pitch: Math.atan2(v[1], Math.hypot(v[0], v[2])) * 180 / Math.PI,
  };
}

// Reducción de tamaño por promedio de bloques (para preview y miniatura)
function downscale(src, w, h, nw, nh) {
  const out = Buffer.alloc(nw * nh * 4);
  const sx = w / nw, sy = h / nh;
  for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.floor(j * sy); y < Math.floor((j + 1) * sy); y++) for (let x = Math.floor(i * sx); x < Math.floor((i + 1) * sx); x++) {
      const k = (y * w + x) * 4; r += src[k]; g += src[k + 1]; b += src[k + 2]; n++;
    }
    const k = (j * nw + i) * 4;
    out[k] = r / n; out[k + 1] = g / n; out[k + 2] = b / n; out[k + 3] = 255;
  }
  return out;
}
function saveJpeg(file, data, w, h, q) {
  fs.writeFileSync(file, jpeg.encode({ data, width: w, height: h }, q).data);
}
// Miniatura con recorte centrado 4:3 a partir de la imagen completa
function thumbFrom(src, w, h) {
  const cw = Math.round(h * 4 / 3) > w ? w : Math.round(h * 4 / 3);
  const ch = Math.round(cw * 3 / 4);
  const x0 = Math.floor((w - cw) / 2), y0 = Math.floor((h - ch) / 2);
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) src.copy(crop, y * cw * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + cw) * 4);
  return downscale(crop, cw, ch, 320, 240);
}

// ---------------------------------------------------------------------------
// Estancias de la demo
// ---------------------------------------------------------------------------
const SHOTS = [
  { key: 'salon', kind: 'pano', cam: [2.2, 1.5, 1.6], initYaw: 40, area: 28.5, orientation: 'Sur', features: 'Ventanal de suelo a techo · Tarima de roble · Aire acondicionado por conductos',
    links: [['cocina', 'Cocina'], ['pasillo', 'Pasillo']],
    infos: [{ at: [3, 1.6, 0], label: 'Ventanal orientación sur', text: 'Carpintería de aluminio con rotura de puente térmico y doble acristalamiento. Sol todo el día.' }] },
  { key: 'cocina', kind: 'flat', cam: [9.6, 1.6, 0.6], yaw: -52, pitch: -8, hfov: 78, area: 14.2, orientation: 'Sur', features: 'Cocina abierta · Isla central · Encimera de cuarzo · Electrodomésticos integrados',
    links: [['salon', 'Volver al salón']],
    infos: [{ at: [8, 0.95, 2.5], label: 'Isla con encimera de cuarzo', text: 'Isla de 1,7 m con zona de desayuno para 2 personas.' }] },
  { key: 'pasillo', kind: 'pano', cam: [4.6, 1.5, 5.75], initYaw: 0, area: 9.8, orientation: '—', features: 'Distribuidor · Armario de instalaciones · Suelo radiante',
    links: [['salon', 'Salón'], ['dormitorio', 'Dormitorio principal'], ['bano', 'Baño']], infos: [] },
  { key: 'dormitorio', kind: 'pano', cam: [3.0, 1.5, 8.6], initYaw: -100, area: 16.4, orientation: 'Norte', features: 'Armario empotrado de 2,6 m · Ventana a patio tranquilo',
    links: [['pasillo', 'Pasillo']],
    infos: [{ at: [4.35, 1.3, 8.6], label: 'Armario empotrado', text: 'Armario de 2,6 m con puertas lacadas, altillo y barra.' }] },
  { key: 'bano', kind: 'flat', cam: [7.7, 1.6, 9.7], yaw: -145, pitch: -14, hfov: 82, area: 5.9, orientation: 'Norte', features: 'Bañera · Mueble de lavabo suspendido · Alicatado completo',
    links: [['pasillo', 'Pasillo']], infos: [] },
];

// ---------------------------------------------------------------------------
// Plano esquemático SVG (x→derecha, z→arriba)
// ---------------------------------------------------------------------------
const PLAN_W = 600, PLAN_H = 600, PAD = 30, SC = (PLAN_W - 2 * PAD) / 10;
const px = (x) => PAD + x * SC, pz = (z) => PLAN_H - PAD - z * SC;
function planSvg() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLAN_W} ${PLAN_H}" font-family="system-ui,sans-serif">`;
  s += `<rect width="${PLAN_W}" height="${PLAN_H}" fill="#fbfaf7"/>`;
  for (const r of Object.values(ROOMS)) {
    s += `<rect x="${px(r.min[0])}" y="${pz(r.max[2])}" width="${(r.max[0] - r.min[0]) * SC}" height="${(r.max[2] - r.min[2]) * SC}" fill="#f1ede6" stroke="#9a9286" stroke-width="2"/>`;
    s += `<text x="${px((r.min[0] + r.max[0]) / 2)}" y="${pz((r.min[2] + r.max[2]) / 2) + 5}" font-size="15" fill="#6d665c" text-anchor="middle">${r.name}</text>`;
  }
  for (const w of WALLS) {
    const outer = w.at === 0 || w.at === 10;
    s += w.axis === 'z'
      ? `<line x1="${px(w.from)}" y1="${pz(w.at)}" x2="${px(w.to)}" y2="${pz(w.at)}" stroke="#3a352f" stroke-width="${outer ? 7 : 4}"/>`
      : `<line x1="${px(w.at)}" y1="${pz(w.from)}" x2="${px(w.at)}" y2="${pz(w.to)}" stroke="#3a352f" stroke-width="${outer ? 7 : 4}"/>`;
    for (const h of w.holes) {
      const col = h.win ? '#8cc4ec' : '#f1ede6';
      s += w.axis === 'z'
        ? `<line x1="${px(h.a)}" y1="${pz(w.at)}" x2="${px(h.b)}" y2="${pz(w.at)}" stroke="${col}" stroke-width="${outer ? 5 : 6}"/>`
        : `<line x1="${px(w.at)}" y1="${pz(h.a)}" x2="${px(w.at)}" y2="${pz(h.b)}" stroke="${col}" stroke-width="${outer ? 5 : 6}"/>`;
    }
  }
  s += `<text x="${PLAN_W - PAD}" y="${PAD - 10}" font-size="13" fill="#6d665c" text-anchor="end">N ↑</text></svg>`;
  return s;
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
const sql = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : `'${String(v).replace(/'/g, "''")}'`);

function main() {
  fs.mkdirSync(OUT_IMG, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  const rooms = [];
  const hotspots = [];

  for (const [idx, s] of SHOTS.entries()) {
    const t0 = Date.now();
    const id = `demo-${s.key}`;
    let w, h, data, preview, pw, ph;
    let project;
    if (s.kind === 'pano') {
      w = FAST ? 1024 : 4096; h = w / 2;
      data = render(w, h, equirectDir, s.cam, FAST ? 1 : 2);
      pw = 1024; ph = 512;
    } else {
      w = FAST ? 960 : 1920; h = Math.round(w * 2 / 3);
      const cam = perspective(s.yaw, s.pitch, s.hfov, w / h);
      project = (P) => cam.project(s.cam, P);
      data = render(w, h, cam.dir, s.cam, FAST ? 1 : 4);
      pw = 640; ph = Math.round(pw * h / w);
    }
    preview = downscale(data, w, h, pw, ph);
    saveJpeg(path.join(OUT_IMG, `${s.key}-full.jpg`), data, w, h, s.kind === 'pano' ? 82 : 84);
    saveJpeg(path.join(OUT_IMG, `${s.key}-preview.jpg`), preview, pw, ph, 70);
    saveJpeg(path.join(OUT_IMG, `${s.key}-thumb.jpg`), thumbFrom(data, w, h), 320, 240, 72);

    // Posición en el plano (% del SVG)
    const planX = (px(s.cam[0]) / PLAN_W) * 100, planY = (pz(s.cam[2]) / PLAN_H) * 100;
    rooms.push({ id, s, idx, w, h, planX, planY });

    const addHs = (kind, P, target, label, text) => {
      const hs = { id: `hs-${s.key}-${hotspots.length}`, room: id, kind, target, label, text };
      if (s.kind === 'pano') Object.assign(hs, yawPitchTo(s.cam, P));
      else Object.assign(hs, project(P));
      hotspots.push(hs);
    };
    for (const [target, label] of s.links) addHs('link', OPENINGS[`${s.key}>${target}`], `demo-${target}`, label, null);
    for (const inf of s.infos) addHs('info', inf.at, null, inf.label, inf.text);
    console.log(`✓ ${s.key} (${s.kind}) ${w}x${h} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  fs.writeFileSync(path.join(OUT_IMG, 'plano.svg'), planSvg());

  // Contraseña de la agencia demo: demo1234 (PBKDF2-SHA256, mismo formato que src/lib/auth.js)
  const salt = crypto.randomBytes(16);
  const hashPw = crypto.pbkdf2Sync('demo1234', salt, 100000, 32, 'sha256');
  const pw = `pbkdf2$100000$${salt.toString('base64')}$${hashPw.toString('base64')}`;
  const now = Date.now();

  let out = `-- Generado por scripts/generate-demo.mjs. No editar a mano.\n`;
  out += `DELETE FROM hotspots WHERE room_id LIKE 'demo-%';\nDELETE FROM rooms WHERE property_id = 'demo-prop';\nDELETE FROM properties WHERE id = 'demo-prop';\nDELETE FROM agencies WHERE id = 'demo-agency';\n`;
  out += `INSERT INTO agencies (id, name, email, password_hash, logo_url, color_primary, color_accent, phone, whatsapp, contact_email, website, created_at) VALUES ` +
    `(${['demo-agency', 'Inmobiliaria Mirador', 'demo@inmobiliaria.test', pw, '/demo/logo.svg', '#1f4e5f', '#e0a43b', '+34 910 000 000', '34600000000', 'hola@inmobiliaria.test', 'https://example.com', now].map(sql).join(', ')});\n`;
  out += `INSERT INTO properties (id, agency_id, public_id, title, address, price, description, status, start_room_id, plan_url, autoplay_seconds, created_at, updated_at) VALUES ` +
    `(${['demo-prop', 'demo-agency', 'demo', 'Piso luminoso de 3 estancias con cocina abierta', 'Calle del Ejemplo 12, Madrid', '325.000 €', 'Vivienda exterior de 92 m² construidos, completamente reformada, con cocina abierta al salón, dormitorio con armario empotrado y baño completo.', 'published', 'demo-salon', '/demo/plano.svg', 8, now, now].map(sql).join(', ')});\n`;
  for (const r of rooms) {
    const s = r.s;
    out += `INSERT INTO rooms (id, property_id, name, kind, sort, img_full, img_preview, img_thumb, width, height, area_m2, orientation, features, plan_x, plan_y, init_yaw, init_pitch, init_hfov, created_at) VALUES ` +
      `(${[r.id, 'demo-prop', ROOMS[s.key].name, s.kind, r.idx, `/demo/${s.key}-full.jpg`, `/demo/${s.key}-preview.jpg`, `/demo/${s.key}-thumb.jpg`, r.w, r.h, s.area, s.orientation, s.features, r.planX, r.planY, s.kind === 'pano' ? s.initYaw : null, s.kind === 'pano' ? -5 : null, s.kind === 'pano' ? 100 : null, now].map(sql).join(', ')});\n`;
  }
  for (const h of hotspots) {
    out += `INSERT INTO hotspots (id, room_id, kind, target_room_id, yaw, pitch, x, y, label, text) VALUES ` +
      `(${[h.id, h.room, h.kind, h.target, h.yaw ?? null, h.pitch ?? null, h.x ?? null, h.y ?? null, h.label, h.text].map(sql).join(', ')});\n`;
  }
  fs.writeFileSync(OUT_SQL, out);
  console.log(`✓ ${OUT_SQL}`);
}

main();
