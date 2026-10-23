/** Cliente de la API del panel: guarda la sesión y añade el token a cada petición. */

const KEY = 'vv_session';

export const session = {
  get() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  },
  set(s) { localStorage.setItem(KEY, JSON.stringify(s)); },
  clear() { localStorage.removeItem(KEY); },
};

/** Petición JSON. Lanza un Error con el mensaje del servidor si algo falla. */
export async function api(path, { method = 'GET', body } = {}) {
  const s = session.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(s?.token ? { authorization: `Bearer ${s.token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') {
    session.clear();
    location.hash = '#/login';
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/** Subida de archivos (multipart) con barra de progreso. onProgress recibe 0–1. */
export function upload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${path}`);
    const s = session.get();
    if (s?.token) xhr.setRequestHeader('authorization', `Bearer ${s.token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* respuesta vacía */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `Error ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo'));
    xhr.send(formData);
  });
}
