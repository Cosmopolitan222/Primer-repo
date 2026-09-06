import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb, nowIso } from "./db";

const COOKIE_NAME = "verifactu_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export interface SessionPayload {
  userId: number;
  businessId: number;
  email: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET no esta configurado o es demasiado corto. Copia .env.example a .env.local y genera un valor propio."
    );
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

/** Crea una cookie de sesion firmada (HMAC-SHA256). No usa JWT para no anadir dependencias externas. */
export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.userId !== "number" || typeof payload.businessId !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = createSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// --- Mitigacion basica de fuerza bruta en login (en memoria, suficiente para demo local) ---
const intentosFallidos = new Map<string, { count: number; bloqueadoHasta: number }>();
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000;

export function comprobarBloqueo(identificador: string): { bloqueado: boolean; segundosRestantes?: number } {
  const entry = intentosFallidos.get(identificador);
  if (!entry) return { bloqueado: false };
  if (entry.bloqueadoHasta > Date.now()) {
    return { bloqueado: true, segundosRestantes: Math.ceil((entry.bloqueadoHasta - Date.now()) / 1000) };
  }
  return { bloqueado: false };
}

export function registrarIntentoFallido(identificador: string) {
  const entry = intentosFallidos.get(identificador) ?? { count: 0, bloqueadoHasta: 0 };
  entry.count += 1;
  if (entry.count >= MAX_INTENTOS) {
    entry.bloqueadoHasta = Date.now() + BLOQUEO_MS;
    entry.count = 0;
  }
  intentosFallidos.set(identificador, entry);
}

export function limpiarIntentosFallidos(identificador: string) {
  intentosFallidos.delete(identificador);
}

export interface UsuarioDb {
  id: number;
  business_id: number;
  email: string;
  password_hash: string;
  nombre: string;
}

export function findUserByEmail(email: string): UsuarioDb | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email) as UsuarioDb | undefined;
}

export function registrarEvento(params: {
  businessId: number;
  tipo: string;
  entidad?: string;
  entidadId?: number;
  usuarioId?: number | null;
  detalle?: Record<string, unknown>;
}) {
  const db = getDb();
  const ultimo = db
    .prepare("SELECT hash_actual FROM event_log WHERE business_id = ? ORDER BY id DESC LIMIT 1")
    .get(params.businessId) as { hash_actual: string } | undefined;
  const hashAnterior = ultimo?.hash_actual ?? null;
  const createdAt = nowIso();
  const detalleJson = JSON.stringify(params.detalle ?? {});
  const material = [
    params.tipo,
    params.entidad ?? "",
    params.entidadId ?? "",
    params.usuarioId ?? "",
    detalleJson,
    hashAnterior ?? "",
    createdAt,
  ].join("|");
  const hashActual = crypto.createHash("sha256").update(material).digest("hex");

  db.prepare(
    `INSERT INTO event_log (business_id, tipo, entidad, entidad_id, usuario_id, detalle, hash_actual, hash_anterior, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.businessId,
    params.tipo,
    params.entidad ?? null,
    params.entidadId ?? null,
    params.usuarioId ?? null,
    detalleJson,
    hashActual,
    hashAnterior,
    createdAt
  );
}
