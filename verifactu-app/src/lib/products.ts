import { getDb, nowIso } from "./db";
import { requireNonEmpty, optionalText, requirePositiveNumber, requireIvaPct, requireTipoProducto, ValidationError } from "./validation";
import { registrarEvento } from "./auth";

export interface Producto {
  id: number;
  business_id: number;
  nombre: string;
  descripcion: string;
  tipo: "producto" | "servicio";
  precio_unitario: number;
  iva_pct: number;
  activo: number;
  created_at: string;
}

export interface ProductoInput {
  nombre: unknown;
  descripcion?: unknown;
  tipo: unknown;
  precio_unitario: unknown;
  iva_pct: unknown;
}

function validarProductoInput(input: ProductoInput) {
  const nombre = requireNonEmpty(input.nombre, "nombre", 200);
  const descripcion = optionalText(input.descripcion, 500);
  const tipo = requireTipoProducto(input.tipo);
  const precioUnitario = requirePositiveNumber(input.precio_unitario, "precio unitario", { allowZero: true });
  const ivaPct = requireIvaPct(input.iva_pct);
  return { nombre, descripcion, tipo, precio_unitario: precioUnitario, iva_pct: ivaPct };
}

export function crearProducto(businessId: number, input: ProductoInput, usuarioId: number): Producto {
  const datos = validarProductoInput(input);
  const db = getDb();
  const createdAt = nowIso();
  const result = db
    .prepare(
      `INSERT INTO products (business_id, nombre, descripcion, tipo, precio_unitario, iva_pct, activo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(businessId, datos.nombre, datos.descripcion, datos.tipo, datos.precio_unitario, datos.iva_pct, createdAt);

  const id = Number(result.lastInsertRowid);
  registrarEvento({
    businessId,
    tipo: "PRODUCTO_CREADO",
    entidad: "producto",
    entidadId: id,
    usuarioId,
    detalle: { nombre: datos.nombre, precio: datos.precio_unitario },
  });

  return { id, business_id: businessId, activo: 1, created_at: createdAt, ...datos };
}

export function listarProductos(businessId: number): Producto[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE business_id = ? AND activo = 1 ORDER BY nombre COLLATE NOCASE")
    .all(businessId) as Producto[];
}

export function obtenerProducto(businessId: number, id: number): Producto | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE business_id = ? AND id = ?")
    .get(businessId, id) as Producto | undefined;
}

export function desactivarProducto(businessId: number, id: number, usuarioId: number): void {
  const db = getDb();
  const producto = obtenerProducto(businessId, id);
  if (!producto) throw new ValidationError("Producto no encontrado");
  db.prepare("UPDATE products SET activo = 0 WHERE id = ? AND business_id = ?").run(id, businessId);
  registrarEvento({
    businessId,
    tipo: "PRODUCTO_DESACTIVADO",
    entidad: "producto",
    entidadId: id,
    usuarioId,
  });
}
