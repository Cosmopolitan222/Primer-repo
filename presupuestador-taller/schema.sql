-- Esquema de la base de datos D1 para guardar los leads del configurador.
-- Aplicar con: wrangler d1 execute presupuestador-taller-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  vehiculo TEXT,
  tipo_vehiculo TEXT,
  categoria_id TEXT NOT NULL,
  categoria_nombre TEXT NOT NULL,
  servicio_id TEXT NOT NULL,
  servicio_nombre TEXT NOT NULL,
  precio_min REAL NOT NULL,
  precio_max REAL NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_creado_en ON leads (creado_en DESC);
