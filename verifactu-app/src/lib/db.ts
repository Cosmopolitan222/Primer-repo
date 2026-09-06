import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// Conexion unica a SQLite (fichero local, cero coste, cero dependencias externas).
// Usamos el modulo nativo experimental "node:sqlite" incluido en Node.js 22+
// para no depender de binarios nativos externos ni de servicios de terceros.
// Se obtiene via process.getBuiltinModule (en vez de "import ... from 'node:sqlite'")
// porque bundlers como Vite/webpack intentan resolver "node:sqlite" como un paquete
// npm normal al no reconocerlo todavia como modulo nativo estable, y fallan.
type DatabaseSync = DatabaseSyncType;
function getDatabaseSyncCtor(): typeof DatabaseSyncType {
  const mod = process.getBuiltinModule("node:sqlite") as { DatabaseSync: typeof DatabaseSyncType } | undefined;
  if (!mod) {
    throw new Error("node:sqlite no esta disponible. Se requiere Node.js 22.5 o superior.");
  }
  return mod.DatabaseSync;
}

const DEFAULT_DB_FILE = "./data/verifactu.sqlite";

function resolveDbFile(): string {
  const configured = process.env.DATABASE_FILE || DEFAULT_DB_FILE;
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

declare global {
  // eslint-disable-next-line no-var
  var __verifactuDb: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  const dbFile = resolveDbFile();
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const DatabaseSyncCtor = getDatabaseSyncCtor();
  const db = new DatabaseSyncCtor(dbFile);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  runMigrations(db);
  return db;
}

function runMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      nif TEXT NOT NULL,
      direccion TEXT,
      email TEXT,
      telefono TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      nombre TEXT NOT NULL,
      nif TEXT NOT NULL,
      direccion TEXT,
      email TEXT,
      telefono TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      nombre TEXT NOT NULL,
      descripcion TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('producto','servicio')),
      precio_unitario REAL NOT NULL,
      iva_pct REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      numero TEXT NOT NULL,
      serie TEXT NOT NULL,
      secuencial INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('ORDINARIA','RECTIFICATIVA')),
      factura_rectificada_id INTEGER REFERENCES invoices(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      fecha_expedicion TEXT NOT NULL,
      base_imponible REAL NOT NULL,
      cuota_iva REAL NOT NULL,
      total REAL NOT NULL,
      hash_actual TEXT NOT NULL,
      hash_anterior TEXT,
      hash_algoritmo TEXT NOT NULL DEFAULT 'SHA-256',
      qr_payload TEXT NOT NULL,
      creado_por INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE(business_id, numero)
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      product_id INTEGER REFERENCES products(id),
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      iva_pct REAL NOT NULL,
      importe_linea REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      estado TEXT NOT NULL CHECK(estado IN ('EMITIDA','ANULADA','PAGADA')),
      motivo TEXT,
      usuario_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      tipo TEXT NOT NULL,
      entidad TEXT,
      entidad_id INTEGER,
      usuario_id INTEGER REFERENCES users(id),
      detalle TEXT,
      hash_actual TEXT NOT NULL,
      hash_anterior TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id, secuencial);
    CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_id);
    CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_event_log_business ON event_log(business_id, id);
  `);
}

export function getDb(): DatabaseSync {
  if (!globalThis.__verifactuDb) {
    globalThis.__verifactuDb = createConnection();
  }
  return globalThis.__verifactuDb;
}

export function nowIso(): string {
  return new Date().toISOString();
}
