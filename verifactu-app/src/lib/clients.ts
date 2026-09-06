import { getDb, nowIso } from "./db";
import { requireNonEmpty, optionalText, requireEmail, validarDocumentoFiscal, ValidationError } from "./validation";
import { registrarEvento } from "./auth";

export interface Cliente {
  id: number;
  business_id: number;
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  telefono: string;
  activo: number;
  created_at: string;
}

export interface ClienteInput {
  nombre: unknown;
  nif: unknown;
  direccion?: unknown;
  email?: unknown;
  telefono?: unknown;
}

export function validarClienteInput(input: ClienteInput) {
  const nombre = requireNonEmpty(input.nombre, "nombre", 200);
  const nifRaw = requireNonEmpty(input.nif, "NIF/CIF", 15);
  const validacion = validarDocumentoFiscal(nifRaw);
  if (!validacion.valido) {
    throw new ValidationError(validacion.error ?? "NIF/CIF invalido");
  }
  const direccion = optionalText(input.direccion, 300);
  const email = requireEmail(input.email, true);
  const telefono = optionalText(input.telefono, 30);
  return { nombre, nif: nifRaw.toUpperCase().replace(/[\s-]/g, ""), direccion, email, telefono };
}

export function crearCliente(businessId: number, input: ClienteInput, usuarioId: number): Cliente {
  const datos = validarClienteInput(input);
  const db = getDb();

  const existente = db
    .prepare("SELECT id FROM clients WHERE business_id = ? AND nif = ? AND activo = 1")
    .get(businessId, datos.nif) as { id: number } | undefined;
  if (existente) {
    throw new ValidationError(`Ya existe un cliente activo con el documento ${datos.nif}`);
  }

  const createdAt = nowIso();
  const result = db
    .prepare(
      `INSERT INTO clients (business_id, nombre, nif, direccion, email, telefono, activo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(businessId, datos.nombre, datos.nif, datos.direccion, datos.email, datos.telefono, createdAt);

  const id = Number(result.lastInsertRowid);
  registrarEvento({
    businessId,
    tipo: "CLIENTE_CREADO",
    entidad: "cliente",
    entidadId: id,
    usuarioId,
    detalle: { nombre: datos.nombre, nif: datos.nif },
  });

  return { id, business_id: businessId, activo: 1, created_at: createdAt, ...datos };
}

export function listarClientes(businessId: number): Cliente[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM clients WHERE business_id = ? AND activo = 1 ORDER BY nombre COLLATE NOCASE")
    .all(businessId) as Cliente[];
}

export function obtenerCliente(businessId: number, id: number): Cliente | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM clients WHERE business_id = ? AND id = ?")
    .get(businessId, id) as Cliente | undefined;
}

export function desactivarCliente(businessId: number, id: number, usuarioId: number): void {
  const db = getDb();
  const cliente = obtenerCliente(businessId, id);
  if (!cliente) throw new ValidationError("Cliente no encontrado");
  db.prepare("UPDATE clients SET activo = 0 WHERE id = ? AND business_id = ?").run(id, businessId);
  registrarEvento({
    businessId,
    tipo: "CLIENTE_DESACTIVADO",
    entidad: "cliente",
    entidadId: id,
    usuarioId,
  });
}
