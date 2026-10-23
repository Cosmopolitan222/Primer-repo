-- Esquema inicial del simulador de visitas virtuales.
-- Fechas en milisegundos desde 1970 (Date.now()).

-- Inmobiliarias (clientes). Cada una tiene su acceso y su marca blanca.
CREATE TABLE agencies (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,      -- usuario de acceso al panel
  password_hash TEXT NOT NULL,
  logo_url      TEXT,
  color_primary TEXT NOT NULL DEFAULT '#1f4e5f',
  color_accent  TEXT NOT NULL DEFAULT '#e0a43b',
  phone         TEXT,
  whatsapp      TEXT,                      -- solo dígitos con prefijo país: 34600000000
  contact_email TEXT,
  website       TEXT,
  created_at    INTEGER NOT NULL
);

-- Viviendas (un recorrido por vivienda)
CREATE TABLE properties (
  id               TEXT PRIMARY KEY,
  agency_id        TEXT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  public_id        TEXT NOT NULL UNIQUE,   -- identificador corto del enlace público /t/<public_id>
  title            TEXT NOT NULL,
  address          TEXT,
  price            TEXT,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  start_room_id    TEXT,
  plan_url         TEXT,                   -- plano esquemático (opcional)
  autoplay_seconds INTEGER NOT NULL DEFAULT 8,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX idx_properties_agency ON properties(agency_id);

-- Estancias. kind = 'pano' (foto 360° equirectangular) o 'flat' (foto normal)
CREATE TABLE rooms (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('pano', 'flat')),
  sort        INTEGER NOT NULL DEFAULT 0,
  img_full    TEXT,
  img_preview TEXT,                        -- versión ligera para carga progresiva
  img_thumb   TEXT,
  width       INTEGER,
  height      INTEGER,
  area_m2     REAL,
  orientation TEXT,
  features    TEXT,                        -- calidades / notas
  plan_x      REAL,                        -- posición en el plano (0–100 %)
  plan_y      REAL,
  init_yaw    REAL,                        -- vista inicial (solo 360°)
  init_pitch  REAL,
  init_hfov   REAL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_rooms_property ON rooms(property_id, sort);

-- Puntos clicables. kind = 'link' (lleva a otra estancia) o 'info' (etiqueta informativa).
-- En 360° se usan yaw/pitch (grados); en fotos normales x/y (0–100 %).
CREATE TABLE hotspots (
  id             TEXT PRIMARY KEY,
  room_id        TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('link', 'info')),
  target_room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  yaw            REAL,
  pitch          REAL,
  x              REAL,
  y              REAL,
  label          TEXT,
  text           TEXT
);
CREATE INDEX idx_hotspots_room ON hotspots(room_id);

-- Eventos de analítica anónima del visor público
--   start = inicio de visita, room = entrada en estancia, dwell = tiempo en estancia (value = ms),
--   whatsapp / call / lead = acciones de contacto
CREATE TABLE events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  type        TEXT NOT NULL,
  room_id     TEXT,
  value       INTEGER,
  device      TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_events_property ON events(property_id, created_at);

-- Contactos captados desde el recorrido
CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  message     TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_leads_property ON leads(property_id, created_at);
