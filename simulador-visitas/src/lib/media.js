/**
 * Almacenamiento de imágenes en R2.
 *
 * El navegador comprime las fotos antes de subirlas (ver public/admin/js/image-tools.js),
 * así que aquí solo validamos y guardamos. Cada subida usa una clave aleatoria, por lo
 * que las URLs son inmutables y se pueden cachear "para siempre" en el CDN y el móvil.
 */
import { HttpError, newId } from './util.js';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg' };
const MAX_BYTES = 15 * 1024 * 1024;

/** Guarda un File del formulario y devuelve su URL pública (/media/...). */
export async function putImage(env, prefix, file, name, { allowSvg = false } = {}) {
  if (!file || typeof file === 'string') throw new HttpError(400, `Falta la imagen "${name}"`);
  const ext = TYPES[file.type];
  if (!ext || (ext === 'svg' && !allowSvg)) throw new HttpError(400, `Formato no admitido: ${file.type || 'desconocido'}`);
  if (file.size > MAX_BYTES) throw new HttpError(413, 'La imagen supera 15 MB');
  const key = `${prefix}/${newId(10)}-${name}.${ext}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return `/media/${key}`;
}

/** Borra imágenes a partir de sus URLs (ignora las de la demo, que son estáticas). */
export async function deleteImages(env, urls) {
  const keys = urls.filter((u) => typeof u === 'string' && u.startsWith('/media/')).map((u) => u.slice(7));
  if (keys.length) await env.MEDIA.delete(keys);
}

/** Borra todo lo guardado bajo un prefijo (p. ej. al eliminar una vivienda). */
export async function deletePrefix(env, prefix) {
  let cursor;
  do {
    const list = await env.MEDIA.list({ prefix: `${prefix}/`, cursor });
    if (list.objects.length) await env.MEDIA.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}

/** Sirve un objeto de R2 con caché larga. */
export async function serveMedia(env, key, request) {
  const obj = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!obj) return new Response('No encontrado', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');
  // Si el navegador ya la tiene (If-None-Match), R2 devuelve el objeto sin cuerpo
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
