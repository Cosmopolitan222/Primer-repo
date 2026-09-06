import { describe, it, expect, beforeAll } from "vitest";
import { getDb, nowIso } from "../src/lib/db";
import { crearCliente } from "../src/lib/clients";
import { crearProducto } from "../src/lib/products";
import { crearFactura, anularFactura, marcarFacturaPagada, listarFacturas, verificarCadenaNegocio } from "../src/lib/invoices";
import { ValidationError } from "../src/lib/validation";

let businessId: number;
let userId: number;
let clienteId: number;
let productoId: number;

beforeAll(() => {
  const db = getDb();
  const createdAt = nowIso();
  const negocio = db
    .prepare("INSERT INTO businesses (nombre, nif, direccion, email, telefono, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run("Negocio de pruebas", "B12345674", "Calle Test 1", "test@test.local", "600000000", createdAt);
  businessId = Number(negocio.lastInsertRowid);

  const usuario = db
    .prepare("INSERT INTO users (business_id, email, password_hash, nombre, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(businessId, "usuario@test.local", "hash-no-usado-en-estas-pruebas", "Usuario de prueba", createdAt);
  userId = Number(usuario.lastInsertRowid);

  const cliente = crearCliente(businessId, { nombre: "Cliente de prueba", nif: "12345678Z" }, userId);
  clienteId = cliente.id;

  const producto = crearProducto(
    businessId,
    { nombre: "Servicio de prueba", tipo: "servicio", precio_unitario: 100, iva_pct: 21 },
    userId
  );
  productoId = producto.id;
});

describe("crearFactura", () => {
  it("calcula correctamente base, cuota y total con una linea", () => {
    const factura = crearFactura(
      businessId,
      { client_id: clienteId, lineas: [{ producto_id: productoId, descripcion: "Servicio de prueba", cantidad: 2, precio_unitario: 100, iva_pct: 21 }] },
      userId
    );
    expect(factura.base_imponible).toBe(200);
    expect(factura.cuota_iva).toBe(42);
    expect(factura.total).toBe(242);
    expect(factura.hash_actual).toMatch(/^[a-f0-9]{64}$/);
  });

  it("asigna numeros de factura secuenciales", () => {
    const f1 = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "Linea", cantidad: 1, precio_unitario: 10, iva_pct: 21 }] }, userId);
    const f2 = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "Linea", cantidad: 1, precio_unitario: 10, iva_pct: 21 }] }, userId);
    expect(f2.secuencial).toBe(f1.secuencial + 1);
    expect(f2.hash_anterior).toBe(f1.hash_actual);
  });

  it("encadena la huella con la factura anterior del negocio", () => {
    const facturas = listarFacturas(businessId).sort((a, b) => a.id - b.id);
    for (let i = 1; i < facturas.length; i++) {
      expect(facturas[i]!.hash_anterior).toBe(facturas[i - 1]!.hash_actual);
    }
  });

  it("rechaza una factura sin lineas", () => {
    expect(() => crearFactura(businessId, { client_id: clienteId, lineas: [] }, userId)).toThrow(ValidationError);
  });

  it("rechaza un cliente inexistente", () => {
    expect(() =>
      crearFactura(businessId, { client_id: 999999, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 1, iva_pct: 21 }] }, userId)
    ).toThrow(ValidationError);
  });

  it("rechaza un tipo de IVA no permitido", () => {
    expect(() =>
      crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 1, iva_pct: 13 }] }, userId)
    ).toThrow(ValidationError);
  });
});

describe("anularFactura", () => {
  it("crea una factura rectificativa que compensa el importe y mantiene la cadena integra", () => {
    const original = crearFactura(
      businessId,
      { client_id: clienteId, lineas: [{ descripcion: "Servicio a anular", cantidad: 1, precio_unitario: 50, iva_pct: 21 }] },
      userId
    );

    const rectificativa = anularFactura(businessId, original.id, "Error en el importe", userId);

    expect(rectificativa.tipo).toBe("RECTIFICATIVA");
    expect(rectificativa.total).toBeCloseTo(-original.total, 2);
    expect(rectificativa.factura_rectificada_id).toBe(original.id);

    const facturas = listarFacturas(businessId);
    const estadoOriginal = facturas.find((f) => f.id === original.id);
    expect(estadoOriginal?.estado).toBe("ANULADA");

    const resultado = verificarCadenaNegocio(businessId);
    expect(resultado.cadenaIntegra).toBe(true);
  });

  it("no permite anular dos veces la misma factura", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 10, iva_pct: 21 }] }, userId);
    anularFactura(businessId, factura.id, "Motivo", userId);
    expect(() => anularFactura(businessId, factura.id, "Motivo repetido", userId)).toThrow(ValidationError);
  });

  it("no permite anular una factura rectificativa", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 10, iva_pct: 21 }] }, userId);
    const rectificativa = anularFactura(businessId, factura.id, "Motivo", userId);
    expect(() => anularFactura(businessId, rectificativa.id, "Otro motivo", userId)).toThrow(ValidationError);
  });
});

describe("marcarFacturaPagada", () => {
  it("marca la factura como PAGADA", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 20, iva_pct: 21 }] }, userId);
    marcarFacturaPagada(businessId, factura.id, userId);
    const facturas = listarFacturas(businessId);
    expect(facturas.find((f) => f.id === factura.id)?.estado).toBe("PAGADA");
  });

  it("no permite marcarla como pagada dos veces", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 20, iva_pct: 21 }] }, userId);
    marcarFacturaPagada(businessId, factura.id, userId);
    expect(() => marcarFacturaPagada(businessId, factura.id, userId)).toThrow(ValidationError);
  });

  it("no permite anular una factura ya marcada como pagada", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 20, iva_pct: 21 }] }, userId);
    marcarFacturaPagada(businessId, factura.id, userId);
    expect(() => anularFactura(businessId, factura.id, "Motivo", userId)).toThrow(ValidationError);
  });

  it("no permite marcar como pagada una factura ya anulada", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 20, iva_pct: 21 }] }, userId);
    anularFactura(businessId, factura.id, "Motivo", userId);
    expect(() => marcarFacturaPagada(businessId, factura.id, userId)).toThrow(ValidationError);
  });

  it("no permite marcar como pagada una factura rectificativa", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 20, iva_pct: 21 }] }, userId);
    const rectificativa = anularFactura(businessId, factura.id, "Motivo", userId);
    expect(() => marcarFacturaPagada(businessId, rectificativa.id, userId)).toThrow(ValidationError);
  });
});

describe("verificarCadenaNegocio detecta manipulacion directa en base de datos", () => {
  it("marca la cadena como no integra si se modifica una factura ya emitida", () => {
    const factura = crearFactura(businessId, { client_id: clienteId, lineas: [{ descripcion: "x", cantidad: 1, precio_unitario: 10, iva_pct: 21 }] }, userId);

    // Simula una manipulacion directa en la base de datos (bypaseando la app).
    const db = getDb();
    db.prepare("UPDATE invoices SET total = 99999 WHERE id = ?").run(factura.id);

    const resultado = verificarCadenaNegocio(businessId);
    expect(resultado.cadenaIntegra).toBe(false);
  });
});
