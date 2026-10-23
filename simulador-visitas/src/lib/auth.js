/**
 * Autenticación sin dependencias, usando la Web Crypto API del Worker.
 *
 * - Contraseñas: PBKDF2-SHA256 con sal aleatoria. Formato: pbkdf2$<iter>$<sal b64>$<hash b64>
 * - Sesiones: token firmado con HMAC-SHA256 (tipo JWT simplificado) que el panel guarda
 *   en localStorage y envía en la cabecera Authorization: Bearer <token>.
 */

const ITERATIONS = 100000; // máximo admitido por PBKDF2 en Workers
const SESSION_DAYS = 14;
const enc = new TextEncoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

/** Comparación en tiempo constante para no filtrar información por tiempos de respuesta. */
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'pbkdf2') return false;
  const calc = await pbkdf2(password, unb64(salt), Number(iter));
  return safeEqual(b64(calc), hash);
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}

/** Crea un token de sesión. payload: { role: 'admin' | 'agency', agencyId?, name } */
export async function createToken(secret, payload) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return `${body}.${await hmac(secret, body)}`;
}

/** Devuelve el payload si el token es válido y no ha caducado; si no, null. */
export async function readToken(secret, token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!safeEqual(sig, await hmac(secret, body))) return null;
  try {
    const data = JSON.parse(unb64url(body));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
