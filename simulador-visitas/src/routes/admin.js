/**
 * API privada del panel (/api/...): login, inmobiliarias, viviendas, estancias,
 * hotspots, estadísticas y leads. Todas las rutas salvo /auth/login exigen sesión.
 */
import { Hono } from 'hono';
import { createToken, hashPassword, readToken, safeEqual, verifyPassword } from '../lib/auth.js';
import { deleteImages, deletePrefix, putImage } from '../lib/media.js';
import { assertPropertyAccess, assertRoomAccess, loadProperty } from '../lib/tours.js';
import { buildUpdate, color, HttpError, newId, num, phoneDigits, str } from '../lib/util.js';
import { propertyStats } from './stats.js';

const api = new Hono();

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
api.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const mail = String(email || '').trim().toLowerCase();
  const secret = sessionSecret(c.env);

  if (mail === String(c.env.ADMIN_EMAIL).toLowerCase()) {
    if (!c.env.ADMIN_PASSWORD || !safeEqual(String(password || ''), c.env.ADMIN_PASSWORD)) throw new HttpError(401, 'Email o contraseña incorrectos');
    const user = { role: 'admin', name: 'Administrador' };
    return c.json({ token: await createToken(secret, user), user });
  }
  const agency = await c.env.DB.prepare('SELECT * FROM agencies WHERE email = ?').bind(mail).first();
  if (!agency || !(await verifyPassword(String(password || ''), agency.password_hash))) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }
  const user = { role: 'agency', agencyId: agency.id, name: agency.name };
  return c.json({ token: await createToken(secret, user), user });
});

// A partir de aquí, todo requiere sesión (cabecera Authorization: Bearer <token>).
api.use('*', async (c, next) => {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = await readToken(sessionSecret(c.env), token);
  if (!user) throw new HttpError(401, 'Sesión caducada. Vuelve a entrar.');
  c.set('user', user);
  await next();
});

api.get('/auth/me', (c) => c.json({ user: c.get('user') }));

const requireAdmin = (c) => {
  if (c.get('user').role !== 'admin') throw new HttpError(403, 'Solo el administrador puede hacer esto');
};

// ---------------------------------------------------------------------------
// Inmobiliarias
// ---------------------------------------------------------------------------
const AGENCY_COLS = 'id, name, email, logo_url, color_primary, color_accent, phone, whatsapp, contact_email, website, created_at';

api.get('/agencies', async (c) => {
  const user = c.get('user');
  const q = user.role === 'admin'
    ? c.env.DB.prepare(`SELECT ${AGENCY_COLS}, (SELECT COUNT(*) FROM properties p WHERE p.agency_id = a.id) AS property_count FROM agencies a ORDER BY name`)
    : c.env.DB.prepare(`SELECT ${AGENCY_COLS}, (SELECT COUNT(*) FROM properties p WHERE p.agency_id = a.id) AS property_count FROM agencies a WHERE id = ?`).bind(user.agencyId);
  return c.json((await q.all()).results);
});

api.post('/agencies', async (c) => {
  requireAdmin(c);
  const b = await c.req.json();
  const name = str(b.name, 120);
  const email = str(b.email, 200)?.toLowerCase();
  if (!name || !email || !b.password) throw new HttpError(400, 'Nombre, email y contraseña son obligatorios');
  if (String(b.password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
  const id = newId();
  try {
    await c.env.DB.prepare(
      `INSERT INTO agencies (id, name, email, password_hash, color_primary, color_accent, phone, whatsapp, contact_email, website, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, await hashPassword(String(b.password)), color(b.color_primary, '#1f4e5f'), color(b.color_accent, '#e0a43b'),
      str(b.phone, 40), phoneDigits(b.whatsapp), str(b.contact_email, 200), str(b.website, 300), Date.now()).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, 'Ya existe una inmobiliaria con ese email');
    throw e;
  }
  return c.json({ id }, 201);
});

async function assertAgencyAccess(c, id) {
  const user = c.get('user');
  if (user.role !== 'admin' && user.agencyId !== id) throw new HttpError(403, 'Sin permiso');
  const a = await c.env.DB.prepare(`SELECT ${AGENCY_COLS} FROM agencies WHERE id = ?`).bind(id).first();
  if (!a) throw new HttpError(404, 'Inmobiliaria no encontrada');
  return a;
}

api.get('/agencies/:id', async (c) => c.json(await assertAgencyAccess(c, c.req.param('id'))));

api.put('/agencies/:id', async (c) => {
  const id = c.req.param('id');
  await assertAgencyAccess(c, id);
  const b = await c.req.json();
  const upd = buildUpdate('agencies', id, b, {
    name: (v) => str(v, 120) || 'Sin nombre',
    color_primary: (v) => color(v, '#1f4e5f'),
    color_accent: (v) => color(v, '#e0a43b'),
    phone: (v) => str(v, 40),
    whatsapp: phoneDigits,
    contact_email: (v) => str(v, 200),
    website: (v) => str(v, 300),
  });
  if (upd) await c.env.DB.prepare(upd.sql).bind(...upd.values).run();
  if (b.password) {
    if (String(b.password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    await c.env.DB.prepare('UPDATE agencies SET password_hash = ? WHERE id = ?').bind(await hashPassword(String(b.password)), id).run();
  }
  return c.json({ ok: true });
});

api.post('/agencies/:id/logo', async (c) => {
  const id = c.req.param('id');
  const agency = await assertAgencyAccess(c, id);
  const form = await c.req.formData();
  const url = await putImage(c.env, `agency/${id}`, form.get('file'), 'logo', { allowSvg: false });
  await c.env.DB.prepare('UPDATE agencies SET logo_url = ? WHERE id = ?').bind(url, id).run();
  await deleteImages(c.env, [agency.logo_url]);
  return c.json({ logo_url: url });
});

api.delete('/agencies/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const props = await c.env.DB.prepare('SELECT id FROM properties WHERE agency_id = ?').bind(id).all();
  for (const p of props.results) await deletePrefix(c.env, `property/${p.id}`);
  await deletePrefix(c.env, `agency/${id}`);
  await c.env.DB.prepare('DELETE FROM agencies WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Viviendas
// ---------------------------------------------------------------------------
api.get('/properties', async (c) => {
  const user = c.get('user');
  const agencyId = user.role === 'admin' ? c.req.query('agencyId') : user.agencyId;
  const where = agencyId ? 'WHERE p.agency_id = ?' : '';
  const stmt = c.env.DB.prepare(
    `SELECT p.id, p.public_id, p.title, p.address, p.status, p.agency_id, p.updated_at, a.name AS agency_name,
       (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id) AS room_count,
       (SELECT img_thumb FROM rooms r WHERE r.property_id = p.id ORDER BY sort LIMIT 1) AS thumb,
       (SELECT COUNT(DISTINCT session_id) FROM events e WHERE e.property_id = p.id AND e.type = 'start') AS visits
     FROM properties p JOIN agencies a ON a.id = p.agency_id ${where} ORDER BY p.updated_at DESC`
  );
  return c.json((await (agencyId ? stmt.bind(agencyId) : stmt).all()).results);
});

api.post('/properties', async (c) => {
  requireAdmin(c);
  const b = await c.req.json();
  const title = str(b.title, 200);
  if (!title || !b.agency_id) throw new HttpError(400, 'Título e inmobiliaria son obligatorios');
  const agency = await c.env.DB.prepare('SELECT id FROM agencies WHERE id = ?').bind(b.agency_id).first();
  if (!agency) throw new HttpError(400, 'La inmobiliaria no existe');
  const id = newId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO properties (id, agency_id, public_id, title, address, price, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
  ).bind(id, b.agency_id, newId(8), title, str(b.address, 300), str(b.price, 60), str(b.description, 3000), now, now).run();
  return c.json({ id }, 201);
});

api.get('/properties/:id', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const data = await loadProperty(c.env, id);
  const agency = await c.env.DB.prepare(`SELECT ${AGENCY_COLS} FROM agencies WHERE id = ?`).bind(data.property.agency_id).first();
  return c.json({ ...data, agency });
});

api.put('/properties/:id', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const b = await c.req.json();
  const upd = buildUpdate('properties', id, b, {
    title: (v) => str(v, 200) || 'Sin título',
    address: (v) => str(v, 300),
    price: (v) => str(v, 60),
    description: (v) => str(v, 3000),
    status: (v) => (v === 'published' ? 'published' : 'draft'),
    start_room_id: (v) => str(v, 40),
    autoplay_seconds: (v) => Math.min(60, Math.max(3, num(v) ?? 8)),
  });
  if (upd) {
    await c.env.DB.prepare(upd.sql).bind(...upd.values).run();
    await touch(c.env, id);
  }
  return c.json({ ok: true });
});

api.delete('/properties/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  await deletePrefix(c.env, `property/${id}`);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM events WHERE property_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});

// Plano esquemático (imagen o SVG)
api.post('/properties/:id/plan', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const old = await c.env.DB.prepare('SELECT plan_url FROM properties WHERE id = ?').bind(id).first();
  const form = await c.req.formData();
  const url = await putImage(c.env, `property/${id}`, form.get('file'), 'plan');
  await c.env.DB.prepare('UPDATE properties SET plan_url = ?, updated_at = ? WHERE id = ?').bind(url, Date.now(), id).run();
  await deleteImages(c.env, [old?.plan_url]);
  return c.json({ plan_url: url });
});

api.delete('/properties/:id/plan', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const old = await c.env.DB.prepare('SELECT plan_url FROM properties WHERE id = ?').bind(id).first();
  await c.env.DB.prepare('UPDATE properties SET plan_url = NULL, updated_at = ? WHERE id = ?').bind(Date.now(), id).run();
  await deleteImages(c.env, [old?.plan_url]);
  return c.json({ ok: true });
});

// Reordenar estancias: { roomIds: [...] } en el orden deseado
api.put('/properties/:id/order', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const { roomIds } = await c.req.json();
  if (!Array.isArray(roomIds)) throw new HttpError(400, 'roomIds debe ser una lista');
  await c.env.DB.batch(roomIds.map((rid, i) =>
    c.env.DB.prepare('UPDATE rooms SET sort = ? WHERE id = ? AND property_id = ?').bind(i, rid, id)));
  await touch(c.env, id);
  return c.json({ ok: true });
});

api.get('/properties/:id/stats', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const days = Math.min(365, Math.max(1, num(c.req.query('days')) ?? 30));
  return c.json(await propertyStats(c.env, id, days));
});

api.get('/properties/:id/leads', async (c) => {
  const id = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), id);
  const r = await c.env.DB.prepare('SELECT * FROM leads WHERE property_id = ? ORDER BY created_at DESC LIMIT 500').bind(id).all();
  return c.json(r.results);
});

// ---------------------------------------------------------------------------
// Estancias
// ---------------------------------------------------------------------------

/** Lee las tres versiones de la foto (ya comprimidas en el navegador) y las guarda en R2. */
async function storeRoomImages(env, propertyId, form) {
  const prefix = `property/${propertyId}`;
  const [full, preview, thumb] = await Promise.all([
    putImage(env, prefix, form.get('full'), 'full'),
    putImage(env, prefix, form.get('preview'), 'preview'),
    putImage(env, prefix, form.get('thumb'), 'thumb'),
  ]);
  return { full, preview, thumb, width: num(form.get('width')), height: num(form.get('height')) };
}

api.post('/properties/:id/rooms', async (c) => {
  const propertyId = c.req.param('id');
  await assertPropertyAccess(c.env, c.get('user'), propertyId);
  const form = await c.req.formData();
  const kind = form.get('kind') === 'pano' ? 'pano' : 'flat';
  const img = await storeRoomImages(c.env, propertyId, form);
  const id = newId();
  const max = await c.env.DB.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM rooms WHERE property_id = ?').bind(propertyId).first();
  await c.env.DB.prepare(
    `INSERT INTO rooms (id, property_id, name, kind, sort, img_full, img_preview, img_thumb, width, height, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, propertyId, str(form.get('name'), 80) || 'Estancia', kind, max.n, img.full, img.preview, img.thumb, img.width, img.height, Date.now()).run();
  // La primera estancia pasa a ser la de inicio
  await c.env.DB.prepare('UPDATE properties SET start_room_id = COALESCE(start_room_id, ?), updated_at = ? WHERE id = ?').bind(id, Date.now(), propertyId).run();
  return c.json({ id }, 201);
});

api.put('/rooms/:id', async (c) => {
  const room = await assertRoomAccess(c.env, c.get('user'), c.req.param('id'));
  const b = await c.req.json();
  const upd = buildUpdate('rooms', room.id, b, {
    name: (v) => str(v, 80) || 'Estancia',
    kind: (v) => (v === 'pano' ? 'pano' : 'flat'),
    area_m2: num,
    orientation: (v) => str(v, 40),
    features: (v) => str(v, 500),
    plan_x: num,
    plan_y: num,
    init_yaw: num,
    init_pitch: num,
    init_hfov: num,
  });
  if (upd) {
    await c.env.DB.prepare(upd.sql).bind(...upd.values).run();
    await touch(c.env, room.property_id);
  }
  return c.json({ ok: true });
});

// Sustituir la foto de una estancia conservando sus datos (los hotspots se mantienen)
api.post('/rooms/:id/image', async (c) => {
  const room = await assertRoomAccess(c.env, c.get('user'), c.req.param('id'));
  const form = await c.req.formData();
  const img = await storeRoomImages(c.env, room.property_id, form);
  const kind = form.get('kind') === 'pano' ? 'pano' : 'flat';
  await c.env.DB.prepare('UPDATE rooms SET img_full = ?, img_preview = ?, img_thumb = ?, width = ?, height = ?, kind = ? WHERE id = ?')
    .bind(img.full, img.preview, img.thumb, img.width, img.height, kind, room.id).run();
  await deleteImages(c.env, [room.img_full, room.img_preview, room.img_thumb]);
  await touch(c.env, room.property_id);
  return c.json({ ok: true });
});

api.delete('/rooms/:id', async (c) => {
  const room = await assertRoomAccess(c.env, c.get('user'), c.req.param('id'));
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM hotspots WHERE room_id = ? OR target_room_id = ?').bind(room.id, room.id),
    c.env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(room.id),
    c.env.DB.prepare(
      `UPDATE properties SET start_room_id = (SELECT id FROM rooms WHERE property_id = ?1 ORDER BY sort LIMIT 1), updated_at = ?2
       WHERE id = ?1 AND (start_room_id IS NULL OR start_room_id = ?3)`
    ).bind(room.property_id, Date.now(), room.id),
  ]);
  await deleteImages(c.env, [room.img_full, room.img_preview, room.img_thumb]);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------
const HOTSPOT_FIELDS = {
  kind: (v) => (v === 'info' ? 'info' : 'link'),
  target_room_id: (v) => str(v, 40),
  yaw: num,
  pitch: num,
  x: num,
  y: num,
  label: (v) => str(v, 120),
  text: (v) => str(v, 1000),
};

async function assertTargetInSameProperty(env, room, targetId) {
  if (!targetId) return;
  const t = await env.DB.prepare('SELECT property_id FROM rooms WHERE id = ?').bind(targetId).first();
  if (!t || t.property_id !== room.property_id) throw new HttpError(400, 'La estancia de destino no es de esta vivienda');
}

api.post('/rooms/:id/hotspots', async (c) => {
  const room = await assertRoomAccess(c.env, c.get('user'), c.req.param('id'));
  const b = await c.req.json();
  const kind = HOTSPOT_FIELDS.kind(b.kind);
  if (kind === 'link' && !b.target_room_id) throw new HttpError(400, 'Elige la estancia de destino');
  await assertTargetInSameProperty(c.env, room, b.target_room_id);
  const id = newId();
  await c.env.DB.prepare(
    'INSERT INTO hotspots (id, room_id, kind, target_room_id, yaw, pitch, x, y, label, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, room.id, kind, kind === 'link' ? b.target_room_id : null, num(b.yaw), num(b.pitch), num(b.x), num(b.y),
    HOTSPOT_FIELDS.label(b.label), HOTSPOT_FIELDS.text(b.text)).run();
  await touch(c.env, room.property_id);
  return c.json({ id }, 201);
});

async function hotspotRoom(c) {
  const h = await c.env.DB.prepare('SELECT * FROM hotspots WHERE id = ?').bind(c.req.param('id')).first();
  if (!h) throw new HttpError(404, 'Hotspot no encontrado');
  return assertRoomAccess(c.env, c.get('user'), h.room_id);
}

api.put('/hotspots/:id', async (c) => {
  const room = await hotspotRoom(c);
  const b = await c.req.json();
  await assertTargetInSameProperty(c.env, room, b.target_room_id);
  const upd = buildUpdate('hotspots', c.req.param('id'), b, HOTSPOT_FIELDS);
  if (upd) await c.env.DB.prepare(upd.sql).bind(...upd.values).run();
  await touch(c.env, room.property_id);
  return c.json({ ok: true });
});

api.delete('/hotspots/:id', async (c) => {
  const room = await hotspotRoom(c);
  await c.env.DB.prepare('DELETE FROM hotspots WHERE id = ?').bind(c.req.param('id')).run();
  await touch(c.env, room.property_id);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
export function sessionSecret(env) {
  if (!env.SESSION_SECRET) throw new HttpError(500, 'Falta configurar SESSION_SECRET (ver README)');
  return env.SESSION_SECRET;
}

function touch(env, propertyId) {
  return env.DB.prepare('UPDATE properties SET updated_at = ? WHERE id = ?').bind(Date.now(), propertyId).run();
}

export default api;
