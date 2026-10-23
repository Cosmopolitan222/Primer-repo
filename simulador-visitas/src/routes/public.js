/**
 * Rutas públicas: datos del recorrido, analítica anónima y formulario de contacto.
 * No requieren sesión, pero solo exponen viviendas publicadas.
 */
import { Hono } from 'hono';
import { readToken } from '../lib/auth.js';
import { loadProperty, tourJson } from '../lib/tours.js';
import { HttpError, newId, str } from '../lib/util.js';

const pub = new Hono();
const EVENT_TYPES = new Set(['start', 'room', 'dwell', 'whatsapp', 'call', 'email', 'lead']);

/** Busca la vivienda por su id público. Los borradores solo se ven con un token válido. */
export async function findTour(env, publicId, token) {
  const p = await env.DB.prepare('SELECT id, agency_id, status FROM properties WHERE public_id = ?').bind(publicId).first();
  if (!p) throw new HttpError(404, 'Recorrido no encontrado');
  if (p.status !== 'published') {
    const user = token && env.SESSION_SECRET ? await readToken(env.SESSION_SECRET, token) : null;
    if (!user || (user.role !== 'admin' && user.agencyId !== p.agency_id)) throw new HttpError(404, 'Este recorrido aún no está publicado');
  }
  const data = await loadProperty(env, p.id);
  const agency = await env.DB.prepare('SELECT * FROM agencies WHERE id = ?').bind(p.agency_id).first();
  return { propertyId: p.id, tour: tourJson(data, agency) };
}

pub.get('/tours/:pid', async (c) => {
  const { tour } = await findTour(c.env, c.req.param('pid'), c.req.query('token'));
  c.header('cache-control', tour.status === 'published' ? 'public, max-age=60' : 'no-store');
  return c.json(tour);
});

// Eventos de analítica. Llegan en lote vía navigator.sendBeacon (texto JSON).
pub.post('/tours/:pid/events', async (c) => {
  let body;
  try {
    body = JSON.parse(await c.req.text());
  } catch {
    throw new HttpError(400, 'JSON no válido');
  }
  const p = await c.env.DB.prepare("SELECT id FROM properties WHERE public_id = ? AND status = 'published'").bind(c.req.param('pid')).first();
  if (!p) return c.body(null, 204); // vistas previas de borradores: no contamos nada
  const sid = str(body.sid, 40);
  const device = body.device === 'mobile' ? 'mobile' : 'desktop';
  const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  if (!sid || !events.length) return c.body(null, 204);
  const now = Date.now();
  const stmts = events
    .filter((e) => EVENT_TYPES.has(e.type))
    .map((e) => c.env.DB.prepare(
      'INSERT INTO events (property_id, session_id, type, room_id, value, device, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(p.id, sid, e.type, str(e.roomId, 40), e.type === 'dwell' ? Math.min(Math.max(Math.round(Number(e.value) || 0), 0), 30 * 60e3) : null, device, now));
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.body(null, 204);
});

// Formulario de contacto dentro del recorrido
pub.post('/tours/:pid/leads', async (c) => {
  const b = await c.req.json();
  const p = await c.env.DB.prepare("SELECT id FROM properties WHERE public_id = ? AND status = 'published'").bind(c.req.param('pid')).first();
  if (!p) throw new HttpError(404, 'Recorrido no encontrado');
  if (b.website) return c.json({ ok: true }); // campo trampa anti-spam: los bots lo rellenan
  const name = str(b.name, 120);
  const phone = str(b.phone, 40);
  const email = str(b.email, 200);
  if (!name || (!phone && !email)) throw new HttpError(400, 'Indica tu nombre y un teléfono o email');
  await c.env.DB.prepare('INSERT INTO leads (id, property_id, name, phone, email, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), p.id, name, phone, email, str(b.message, 2000), Date.now()).run();
  return c.json({ ok: true }, 201);
});

export default pub;
