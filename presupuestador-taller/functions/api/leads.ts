interface Env {
  DB: D1Database;
}

interface LeadRequestBody {
  contacto: {
    nombre: string;
    telefono: string;
    email?: string;
    vehiculo?: string;
  };
  tipoVehiculo?: string;
  categoria: { id: string; nombre: string };
  servicio: { id: string; nombre: string; precioMin: number; precioMax: number };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: LeadRequestBody;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "JSON inválido" }, 400);
  }

  const { contacto, categoria, servicio, tipoVehiculo } = body ?? {};
  if (!contacto?.nombre || !contacto?.telefono || !categoria?.id || !servicio?.id) {
    return jsonResponse({ error: "Faltan campos obligatorios" }, 400);
  }

  try {
    await context.env.DB.prepare(
      `INSERT INTO leads (
        nombre, telefono, email, vehiculo, tipo_vehiculo,
        categoria_id, categoria_nombre,
        servicio_id, servicio_nombre, precio_min, precio_max,
        creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        contacto.nombre,
        contacto.telefono,
        contacto.email ?? null,
        contacto.vehiculo ?? null,
        tipoVehiculo ?? null,
        categoria.id,
        categoria.nombre,
        servicio.id,
        servicio.nombre,
        servicio.precioMin,
        servicio.precioMax,
        new Date().toISOString(),
      )
      .run();

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Error guardando lead:", error);
    return jsonResponse({ error: "No se pudo guardar el lead" }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM leads ORDER BY creado_en DESC LIMIT 200",
  ).all();
  return jsonResponse({ leads: results });
};
