/**
 * Script de datos de ejemplo (TODOS FICTICIOS) para poder probar la aplicacion
 * desde cero: un negocio, un usuario de acceso, clientes y productos/servicios.
 *
 * Uso: npm run seed
 */
import { getDb, nowIso } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const DEMO_EMAIL = "demo@verifactu-demo.local";
const DEMO_PASSWORD = "Demo1234!";

function main() {
  const db = getDb();

  const existente = db.prepare("SELECT id FROM businesses LIMIT 1").get() as { id: number } | undefined;
  if (existente) {
    console.log("Ya existen datos en la base de datos local. No se vuelve a sembrar.");
    console.log(`Base de datos: ${process.env.DATABASE_FILE || "./data/verifactu.sqlite"}`);
    return;
  }

  const createdAt = nowIso();

  const negocio = db
    .prepare(
      `INSERT INTO businesses (nombre, nif, direccion, email, telefono, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      "Taller Mecanico Ruedas del Sur S.L. (demo)",
      "B12345674",
      "Calle Ficticia 123, 41001 Sevilla (datos de ejemplo)",
      "contacto@ruedasdelsur-demo.local",
      "954000000",
      createdAt
    );
  const businessId = Number(negocio.lastInsertRowid);

  const usuario = db
    .prepare(
      `INSERT INTO users (business_id, email, password_hash, nombre, created_at) VALUES (?, ?, ?, ?, ?)`
    )
    .run(businessId, DEMO_EMAIL, hashPassword(DEMO_PASSWORD), "Persona Administradora (demo)", createdAt);
  void usuario;

  const clientes = [
    { nombre: "Maria Garcia Lopez (cliente demo)", nif: "12345678Z", direccion: "Av. de Prueba 1, Sevilla", email: "maria.garcia@demo.local", telefono: "600111222" },
    { nombre: "Juan Perez Martin (cliente demo)", nif: "87654321X", direccion: "Calle Falsa 45, Sevilla", email: "juan.perez@demo.local", telefono: "600333444" },
    { nombre: "Distribuciones Ejemplo S.L. (cliente demo)", nif: "B99887762", direccion: "Poligono Ficticio, Nave 7, Sevilla", email: "compras@distribuciones-demo.local", telefono: "954555666" },
  ];
  const insertCliente = db.prepare(
    `INSERT INTO clients (business_id, nombre, nif, direccion, email, telefono, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  );
  for (const c of clientes) {
    insertCliente.run(businessId, c.nombre, c.nif, c.direccion, c.email, c.telefono, createdAt);
  }

  const productos: Array<{ nombre: string; descripcion: string; tipo: "producto" | "servicio"; precio_unitario: number; iva_pct: number }> = [
    { nombre: "Cambio de aceite y filtro", descripcion: "Mano de obra + revision de niveles", tipo: "servicio", precio_unitario: 45, iva_pct: 21 },
    { nombre: "Revision de frenos", descripcion: "Comprobacion de pastillas y discos", tipo: "servicio", precio_unitario: 60, iva_pct: 21 },
    { nombre: "Diagnosis electronica", descripcion: "Lectura y borrado de codigos OBD", tipo: "servicio", precio_unitario: 35, iva_pct: 21 },
    { nombre: "Neumatico 195/65 R15", descripcion: "Neumatico de recambio (unidad)", tipo: "producto", precio_unitario: 78.5, iva_pct: 21 },
    { nombre: "Bateria 60Ah", descripcion: "Bateria de arranque (unidad)", tipo: "producto", precio_unitario: 95, iva_pct: 21 },
  ];
  const insertProducto = db.prepare(
    `INSERT INTO products (business_id, nombre, descripcion, tipo, precio_unitario, iva_pct, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  );
  for (const p of productos) {
    insertProducto.run(businessId, p.nombre, p.descripcion, p.tipo, p.precio_unitario, p.iva_pct, createdAt);
  }

  console.log("Datos de ejemplo creados correctamente (todos ficticios).");
  console.log("");
  console.log("Credenciales de acceso a la demo:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main();
