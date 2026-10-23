/** Estadísticas básicas de una vivienda a partir de la tabla events. */

export async function propertyStats(env, propertyId, days) {
  const since = Date.now() - days * 864e5;
  const db = env.DB;
  const [summary, time, rooms, contacts, daily] = await db.batch([
    db.prepare(
      `SELECT COUNT(DISTINCT session_id) AS visits,
              COUNT(DISTINCT CASE WHEN device = 'mobile' THEN session_id END) AS mobile
       FROM events WHERE property_id = ? AND type = 'start' AND created_at >= ?`
    ).bind(propertyId, since),
    // Tiempo medio por visita = media de la suma de tiempos en estancia de cada sesión
    db.prepare(
      `SELECT AVG(total) AS avg_ms FROM (
         SELECT SUM(value) AS total FROM events
         WHERE property_id = ? AND type = 'dwell' AND created_at >= ? GROUP BY session_id)`
    ).bind(propertyId, since),
    db.prepare(
      `SELECT e.room_id, r.name,
              SUM(CASE WHEN e.type = 'room' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN e.type = 'dwell' THEN e.value ELSE 0 END) AS total_ms
       FROM events e JOIN rooms r ON r.id = e.room_id
       WHERE e.property_id = ? AND e.type IN ('room', 'dwell') AND e.created_at >= ?
       GROUP BY e.room_id ORDER BY views DESC, total_ms DESC`
    ).bind(propertyId, since),
    db.prepare(
      `SELECT type, COUNT(*) AS n FROM events
       WHERE property_id = ? AND type IN ('whatsapp', 'call', 'lead', 'email') AND created_at >= ? GROUP BY type`
    ).bind(propertyId, since),
    db.prepare(
      `SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(DISTINCT session_id) AS visits
       FROM events WHERE property_id = ? AND type = 'start' AND created_at >= ? GROUP BY day ORDER BY day`
    ).bind(propertyId, since),
  ]);
  const s = summary.results[0] || {};
  return {
    days,
    visits: s.visits || 0,
    mobileShare: s.visits ? s.mobile / s.visits : 0,
    avgSeconds: Math.round((time.results[0]?.avg_ms || 0) / 1000),
    rooms: rooms.results.map((r) => ({
      roomId: r.room_id,
      name: r.name,
      views: r.views,
      avgSeconds: r.views ? Math.round(r.total_ms / r.views / 1000) : 0,
    })),
    contacts: Object.fromEntries(contacts.results.map((r) => [r.type, r.n])),
    daily: daily.results,
  };
}
