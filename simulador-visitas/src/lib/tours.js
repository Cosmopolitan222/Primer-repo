/** Consultas compartidas entre el panel de edición y el visor público. */
import { HttpError } from './util.js';

/** Carga una vivienda con sus estancias y hotspots. */
export async function loadProperty(env, propertyId) {
  const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(propertyId).first();
  if (!property) throw new HttpError(404, 'Vivienda no encontrada');
  const [rooms, hotspots] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM rooms WHERE property_id = ? ORDER BY sort, created_at').bind(propertyId),
    env.DB.prepare('SELECT h.* FROM hotspots h JOIN rooms r ON r.id = h.room_id WHERE r.property_id = ?').bind(propertyId),
  ]);
  return { property, rooms: rooms.results, hotspots: hotspots.results };
}

/** Comprueba que el usuario puede gestionar la vivienda (admin o su inmobiliaria). */
export async function assertPropertyAccess(env, user, propertyId) {
  const p = await env.DB.prepare('SELECT id, agency_id FROM properties WHERE id = ?').bind(propertyId).first();
  if (!p) throw new HttpError(404, 'Vivienda no encontrada');
  if (user.role !== 'admin' && user.agencyId !== p.agency_id) throw new HttpError(403, 'Sin permiso');
  return p;
}

/** Igual que la anterior pero partiendo de una estancia. Devuelve la estancia. */
export async function assertRoomAccess(env, user, roomId) {
  const r = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first();
  if (!r) throw new HttpError(404, 'Estancia no encontrada');
  await assertPropertyAccess(env, user, r.property_id);
  return r;
}

/** Datos de marca blanca que se pueden mostrar públicamente (sin email de acceso ni hash). */
export function publicAgency(a) {
  return {
    name: a.name,
    logoUrl: a.logo_url,
    colorPrimary: a.color_primary,
    colorAccent: a.color_accent,
    phone: a.phone,
    whatsapp: a.whatsapp,
    email: a.contact_email,
    website: a.website,
  };
}

/** JSON que consume el visor público. */
export function tourJson({ property, rooms, hotspots }, agency) {
  return {
    id: property.public_id,
    title: property.title,
    address: property.address,
    price: property.price,
    description: property.description,
    status: property.status,
    startRoomId: property.start_room_id || rooms[0]?.id || null,
    planUrl: property.plan_url,
    autoplaySeconds: property.autoplay_seconds,
    agency: publicAgency(agency),
    rooms: rooms
      .filter((r) => r.img_full)
      .map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        full: r.img_full,
        preview: r.img_preview,
        thumb: r.img_thumb,
        width: r.width,
        height: r.height,
        areaM2: r.area_m2,
        orientation: r.orientation,
        features: r.features,
        planX: r.plan_x,
        planY: r.plan_y,
        initYaw: r.init_yaw,
        initPitch: r.init_pitch,
        initHfov: r.init_hfov,
        hotspots: hotspots
          .filter((h) => h.room_id === r.id)
          .map((h) => ({ id: h.id, kind: h.kind, target: h.target_room_id, yaw: h.yaw, pitch: h.pitch, x: h.x, y: h.y, label: h.label, text: h.text })),
      })),
  };
}
