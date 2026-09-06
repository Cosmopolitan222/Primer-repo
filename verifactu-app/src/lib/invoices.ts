import { getDb, nowIso } from "./db";
import { ValidationError, requireNonEmpty, requirePositiveNumber, requireIvaPct } from "./validation";
import { calcularHuella, verificarCadena, type RegistroCadena, type ResultadoVerificacionCadena } from "./hashChain";
import { construirPayloadQr, generarQrDataUrl } from "./qr";
import { obtenerNegocio } from "./business";
import { obtenerCliente } from "./clients";
import { registrarEvento } from "./auth";

export interface LineaInput {
  producto_id?: unknown;
  descripcion: unknown;
  cantidad: unknown;
  precio_unitario: unknown;
  iva_pct: unknown;
}

export interface LineaCalculada {
  producto_id: number | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  iva_pct: number;
  importe_linea: number;
}

export interface FacturaInput {
  client_id: unknown;
  lineas: LineaInput[];
}

function validarLinea(input: LineaInput): LineaCalculada {
  const descripcion = requireNonEmpty(input.descripcion, "descripcion de linea", 300);
  const cantidad = requirePositiveNumber(input.cantidad, "cantidad");
  const precioUnitario = requirePositiveNumber(input.precio_unitario, "precio unitario", { allowZero: true });
  const ivaPct = requireIvaPct(input.iva_pct);
  const productoId =
    input.producto_id === undefined || input.producto_id === null || input.producto_id === ""
      ? null
      : Number(input.producto_id);
  if (productoId !== null && !Number.isInteger(productoId)) {
    throw new ValidationError("Referencia de producto invalida");
  }
  const importeLinea = Math.round(cantidad * precioUnitario * 100) / 100;
  return { producto_id: productoId, descripcion, cantidad, precio_unitario: precioUnitario, iva_pct: ivaPct, importe_linea: importeLinea };
}

function calcularTotales(lineas: LineaCalculada[]) {
  let baseImponible = 0;
  let cuotaIva = 0;
  for (const linea of lineas) {
    baseImponible += linea.importe_linea;
    cuotaIva += linea.importe_linea * (linea.iva_pct / 100);
  }
  baseImponible = Math.round(baseImponible * 100) / 100;
  cuotaIva = Math.round(cuotaIva * 100) / 100;
  const total = Math.round((baseImponible + cuotaIva) * 100) / 100;
  return { baseImponible, cuotaIva, total };
}

function siguienteNumeroFactura(businessId: number, serie: string): { numero: string; secuencial: number } {
  const db = getDb();
  const fila = db
    .prepare("SELECT MAX(secuencial) as maximo FROM invoices WHERE business_id = ? AND serie = ?")
    .get(businessId, serie) as { maximo: number | null };
  const secuencial = (fila.maximo ?? 0) + 1;
  const numero = `${serie}-${String(secuencial).padStart(4, "0")}`;
  return { numero, secuencial };
}

function obtenerUltimaHuella(businessId: number): string | null {
  const db = getDb();
  const fila = db
    .prepare("SELECT hash_actual FROM invoices WHERE business_id = ? ORDER BY id DESC LIMIT 1")
    .get(businessId) as { hash_actual: string } | undefined;
  return fila?.hash_actual ?? null;
}

interface FacturaRow {
  id: number;
  business_id: number;
  numero: string;
  serie: string;
  secuencial: number;
  tipo: "ORDINARIA" | "RECTIFICATIVA";
  factura_rectificada_id: number | null;
  client_id: number;
  fecha_expedicion: string;
  base_imponible: number;
  cuota_iva: number;
  total: number;
  hash_actual: string;
  hash_anterior: string | null;
  hash_algoritmo: string;
  qr_payload: string;
  creado_por: number;
  created_at: string;
}

function insertarFactura(params: {
  businessId: number;
  clientId: number;
  tipo: "ORDINARIA" | "RECTIFICATIVA";
  facturaRectificadaId: number | null;
  lineas: LineaCalculada[];
  usuarioId: number;
  signo?: 1 | -1;
}): FacturaRow {
  const negocio = obtenerNegocio(params.businessId);
  if (!negocio) throw new ValidationError("Negocio no encontrado");

  const signo = params.signo ?? 1;
  const lineasFirmadas = params.lineas.map((l) => ({ ...l, importe_linea: l.importe_linea * signo }));
  const totales = calcularTotales(lineasFirmadas);

  const db = getDb();
  const fechaExpedicion = nowIso();
  const serie = new Date(fechaExpedicion).getFullYear().toString();
  const { numero, secuencial } = siguienteNumeroFactura(params.businessId, serie);
  const hashAnterior = obtenerUltimaHuella(params.businessId);

  const hashActual = calcularHuella({
    nifEmisor: negocio.nif,
    numero,
    fechaExpedicion,
    tipo: params.tipo,
    baseImponible: totales.baseImponible,
    cuotaIva: totales.cuotaIva,
    total: totales.total,
    hashAnterior,
    timestamp: fechaExpedicion,
  });

  const qrPayload = construirPayloadQr({
    nifEmisor: negocio.nif,
    numero,
    fecha: fechaExpedicion,
    total: totales.total,
    huella: hashActual,
  });

  const result = db
    .prepare(
      `INSERT INTO invoices
        (business_id, numero, serie, secuencial, tipo, factura_rectificada_id, client_id, fecha_expedicion,
         base_imponible, cuota_iva, total, hash_actual, hash_anterior, hash_algoritmo, qr_payload, creado_por, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SHA-256', ?, ?, ?)`
    )
    .run(
      params.businessId,
      numero,
      serie,
      secuencial,
      params.tipo,
      params.facturaRectificadaId,
      params.clientId,
      fechaExpedicion,
      totales.baseImponible,
      totales.cuotaIva,
      totales.total,
      hashActual,
      hashAnterior,
      qrPayload,
      params.usuarioId,
      fechaExpedicion
    );

  const facturaId = Number(result.lastInsertRowid);

  const insertLinea = db.prepare(
    `INSERT INTO invoice_lines (invoice_id, product_id, descripcion, cantidad, precio_unitario, iva_pct, importe_linea)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const linea of lineasFirmadas) {
    insertLinea.run(facturaId, linea.producto_id, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.iva_pct, linea.importe_linea);
  }

  db.prepare(
    `INSERT INTO invoice_status_events (invoice_id, estado, motivo, usuario_id, created_at) VALUES (?, 'EMITIDA', NULL, ?, ?)`
  ).run(facturaId, params.usuarioId, fechaExpedicion);

  return {
    id: facturaId,
    business_id: params.businessId,
    numero,
    serie,
    secuencial,
    tipo: params.tipo,
    factura_rectificada_id: params.facturaRectificadaId,
    client_id: params.clientId,
    fecha_expedicion: fechaExpedicion,
    base_imponible: totales.baseImponible,
    cuota_iva: totales.cuotaIva,
    total: totales.total,
    hash_actual: hashActual,
    hash_anterior: hashAnterior,
    hash_algoritmo: "SHA-256",
    qr_payload: qrPayload,
    creado_por: params.usuarioId,
    created_at: fechaExpedicion,
  };
}

export function crearFactura(businessId: number, input: FacturaInput, usuarioId: number): FacturaRow {
  const clientId = Number(input.client_id);
  if (!Number.isInteger(clientId)) throw new ValidationError("Cliente invalido");
  const cliente = obtenerCliente(businessId, clientId);
  if (!cliente || !cliente.activo) throw new ValidationError("El cliente indicado no existe o esta desactivado");

  if (!Array.isArray(input.lineas) || input.lineas.length === 0) {
    throw new ValidationError("La factura debe tener al menos una linea");
  }
  if (input.lineas.length > 200) {
    throw new ValidationError("Demasiadas lineas en una sola factura");
  }
  const lineas = input.lineas.map(validarLinea);

  const factura = insertarFactura({
    businessId,
    clientId,
    tipo: "ORDINARIA",
    facturaRectificadaId: null,
    lineas,
    usuarioId,
  });

  registrarEvento({
    businessId,
    tipo: "FACTURA_EMITIDA",
    entidad: "factura",
    entidadId: factura.id,
    usuarioId,
    detalle: { numero: factura.numero, total: factura.total, cliente_id: clientId },
  });

  return factura;
}

function estadoActualFactura(facturaId: number): "EMITIDA" | "ANULADA" {
  const db = getDb();
  const fila = db
    .prepare("SELECT estado FROM invoice_status_events WHERE invoice_id = ? ORDER BY id DESC LIMIT 1")
    .get(facturaId) as { estado: "EMITIDA" | "ANULADA" } | undefined;
  return fila?.estado ?? "EMITIDA";
}

export function anularFactura(businessId: number, facturaId: number, motivo: unknown, usuarioId: number): FacturaRow {
  const db = getDb();
  const original = db
    .prepare("SELECT * FROM invoices WHERE id = ? AND business_id = ?")
    .get(facturaId, businessId) as FacturaRow | undefined;
  if (!original) throw new ValidationError("Factura no encontrada");
  if (original.tipo === "RECTIFICATIVA") {
    throw new ValidationError("No se puede anular una factura rectificativa");
  }
  if (estadoActualFactura(facturaId) === "ANULADA") {
    throw new ValidationError("La factura ya esta anulada");
  }
  const motivoTexto = requireNonEmpty(motivo, "motivo de anulacion", 300);

  const lineasOriginales = db
    .prepare("SELECT * FROM invoice_lines WHERE invoice_id = ?")
    .all(facturaId) as Array<{ product_id: number | null; descripcion: string; cantidad: number; precio_unitario: number; iva_pct: number; importe_linea: number }>;

  const lineasParaRectificativa: LineaCalculada[] = lineasOriginales.map((l) => ({
    producto_id: l.product_id,
    descripcion: `Anulacion de ${original.numero}: ${l.descripcion}`,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    iva_pct: l.iva_pct,
    importe_linea: Math.abs(l.importe_linea),
  }));

  const rectificativa = insertarFactura({
    businessId,
    clientId: original.client_id,
    tipo: "RECTIFICATIVA",
    facturaRectificadaId: original.id,
    lineas: lineasParaRectificativa,
    usuarioId,
    signo: -1,
  });

  const createdAt = nowIso();
  db.prepare(
    `INSERT INTO invoice_status_events (invoice_id, estado, motivo, usuario_id, created_at) VALUES (?, 'ANULADA', ?, ?, ?)`
  ).run(facturaId, motivoTexto, usuarioId, createdAt);

  registrarEvento({
    businessId,
    tipo: "FACTURA_ANULADA",
    entidad: "factura",
    entidadId: facturaId,
    usuarioId,
    detalle: { motivo: motivoTexto, factura_rectificativa_id: rectificativa.id, numero_rectificativa: rectificativa.numero },
  });

  return rectificativa;
}

export interface FacturaResumen extends FacturaRow {
  cliente_nombre: string;
  estado: "EMITIDA" | "ANULADA";
}

export function listarFacturas(businessId: number): FacturaResumen[] {
  const db = getDb();
  const filas = db
    .prepare(
      `SELECT i.*, c.nombre as cliente_nombre
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.business_id = ?
       ORDER BY i.id DESC`
    )
    .all(businessId) as (FacturaRow & { cliente_nombre: string })[];

  return filas.map((f) => ({ ...f, estado: estadoActualFactura(f.id) }));
}

export interface FacturaDetalle extends FacturaResumen {
  lineas: Array<{ id: number; descripcion: string; cantidad: number; precio_unitario: number; iva_pct: number; importe_linea: number }>;
  cliente: { id: number; nombre: string; nif: string; direccion: string; email: string };
  negocio: { nombre: string; nif: string; direccion: string };
  qr_data_url: string;
}

export async function obtenerFacturaDetalle(businessId: number, id: number): Promise<FacturaDetalle | undefined> {
  const db = getDb();
  const factura = db
    .prepare(
      `SELECT i.*, c.nombre as cliente_nombre FROM invoices i JOIN clients c ON c.id = i.client_id
       WHERE i.id = ? AND i.business_id = ?`
    )
    .get(id, businessId) as (FacturaRow & { cliente_nombre: string }) | undefined;
  if (!factura) return undefined;

  const lineas = db
    .prepare("SELECT id, descripcion, cantidad, precio_unitario, iva_pct, importe_linea FROM invoice_lines WHERE invoice_id = ?")
    .all(id) as FacturaDetalle["lineas"];

  const cliente = db
    .prepare("SELECT id, nombre, nif, direccion, email FROM clients WHERE id = ?")
    .get(factura.client_id) as FacturaDetalle["cliente"];

  const negocio = obtenerNegocio(businessId);
  const qrDataUrl = await generarQrDataUrl(factura.qr_payload);

  return {
    ...factura,
    estado: estadoActualFactura(id),
    lineas,
    cliente,
    negocio: { nombre: negocio?.nombre ?? "", nif: negocio?.nif ?? "", direccion: negocio?.direccion ?? "" },
    qr_data_url: qrDataUrl,
  };
}

export function obtenerRegistrosCadena(businessId: number): RegistroCadena[] {
  const db = getDb();
  const negocio = obtenerNegocio(businessId);
  if (!negocio) return [];
  const filas = db
    .prepare("SELECT * FROM invoices WHERE business_id = ? ORDER BY id ASC")
    .all(businessId) as FacturaRow[];

  return filas.map((f) => ({
    id: f.id,
    numero: f.numero,
    hash_actual: f.hash_actual,
    hash_anterior: f.hash_anterior,
    datos: {
      nifEmisor: negocio.nif,
      numero: f.numero,
      fechaExpedicion: f.fecha_expedicion,
      tipo: f.tipo,
      baseImponible: f.base_imponible,
      cuotaIva: f.cuota_iva,
      total: f.total,
      hashAnterior: f.hash_anterior,
      timestamp: f.fecha_expedicion,
    },
  }));
}

export function verificarCadenaNegocio(businessId: number): ResultadoVerificacionCadena {
  return verificarCadena(obtenerRegistrosCadena(businessId));
}

export function obtenerEventos(businessId: number, limite = 200) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM event_log WHERE business_id = ? ORDER BY id DESC LIMIT ?")
    .all(businessId, limite);
}
