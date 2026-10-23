/** Utilidades comunes del backend. */

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // sin caracteres confusos (l, o, 0, 1)

/** Identificador aleatorio legible, p. ej. "k3x9m2pq7wza". */
export function newId(len = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Error con código HTTP; el manejador global lo convierte en respuesta JSON. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Devuelve un texto recortado o null si viene vacío. */
export function str(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Número finito o null. */
export function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Color hexadecimal #rrggbb o el valor por defecto. */
export function color(v, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : fallback;
}

/** Normaliza un número de WhatsApp a solo dígitos (formato de wa.me). */
export function phoneDigits(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d || null;
}

/**
 * Construye un UPDATE solo con los campos permitidos que vengan en el body.
 * fields: { columna: transformador }
 */
export function buildUpdate(table, id, body, fields) {
  const sets = [];
  const values = [];
  for (const [col, fn] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      sets.push(`${col} = ?`);
      values.push(fn(body[col]));
    }
  }
  if (!sets.length) return null;
  return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, values: [...values, id] };
}
