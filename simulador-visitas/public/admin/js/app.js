/**
 * Panel de administración (SPA sin dependencias, rutas con #).
 *
 *   #/login                 acceso
 *   #/                      inicio: inmobiliarias (admin) y viviendas
 *   #/agency/<id>           marca blanca y datos de contacto de una inmobiliaria
 *   #/property/<id>/<tab>   editor de la vivienda (ver editor.js)
 */
import { api, session, upload } from './api.js';
import { compressSimple } from './image-tools.js';
import { renderEditor } from './editor.js';
import { $, esc, toast, fmtDate } from './ui.js';

const app = $('#app');

window.addEventListener('hashchange', route);
route();

async function route() {
  const s = session.get();
  const [, view, id, tab] = location.hash.replace(/^#/, '').split('/');
  renderNav(s);
  if (!s && view !== 'login') return (location.hash = '#/login');
  try {
    if (view === 'login') return renderLogin();
    if (view === 'agency') return await renderAgency(id);
    if (view === 'property') return await renderEditor(app, id, tab || 'rooms');
    return await renderHome(s.user);
  } catch (err) {
    app.innerHTML = `<div class="card"><h2>Algo ha fallado</h2><p>${esc(err.message)}</p><a href="#/">Volver al inicio</a></div>`;
  }
}

function renderNav(s) {
  $('#nav').innerHTML = s
    ? `<span class="muted">${esc(s.user.name)}</span>
       ${s.user.role === 'agency' ? `<a href="#/agency/${esc(s.user.agencyId)}">Mi marca</a>` : ''}
       <button class="ghost" id="logout">Salir</button>`
    : '';
  $('#logout')?.addEventListener('click', () => {
    session.clear();
    location.hash = '#/login';
  });
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
function renderLogin() {
  app.innerHTML = `
    <form class="card form login" id="login">
      <h1>Entrar</h1>
      <p class="muted small">Administrador o inmobiliaria.</p>
      <label>Email <input name="email" type="email" required autocomplete="username"></label>
      <label>Contraseña <input name="password" type="password" required autocomplete="current-password"></label>
      <button class="primary">Entrar</button>
      <p class="muted small">Demo local: <code>demo@inmobiliaria.test</code> / <code>demo1234</code></p>
    </form>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await api('/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      session.set(res);
      location.hash = '#/';
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------
async function renderHome(user) {
  const isAdmin = user.role === 'admin';
  const [agencies, properties] = await Promise.all([api('/agencies'), api('/properties')]);

  app.innerHTML = `
    <div class="stack">
      ${isAdmin ? `
      <section class="card">
        <div class="row between"><h2>Inmobiliarias</h2><button class="primary" id="new-agency">+ Nueva inmobiliaria</button></div>
        ${agencies.length ? `
        <table class="data">
          <thead><tr><th>Nombre</th><th>Acceso</th><th>Marca</th><th class="num">Viviendas</th><th></th></tr></thead>
          <tbody>${agencies.map((a) => `
            <tr>
              <td><strong>${esc(a.name)}</strong></td>
              <td class="muted">${esc(a.email)}</td>
              <td><span class="swatch" style="background:${esc(a.color_primary)}"></span> <span class="swatch" style="background:${esc(a.color_accent)}"></span></td>
              <td class="num">${a.property_count}</td>
              <td class="num"><a href="#/agency/${esc(a.id)}">Editar</a></td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p class="muted">Crea tu primera inmobiliaria para empezar.</p>'}
      </section>` : ''}

      <section>
        <div class="row between" style="margin-bottom:12px">
          <h2 style="margin:0">Viviendas</h2>
          ${isAdmin && agencies.length ? '<button class="primary" id="new-property">+ Nueva vivienda</button>' : ''}
        </div>
        ${properties.length ? `<div class="grid">${properties.map((p) => `
          <a class="card prop-card" href="#/property/${esc(p.id)}">
            <div class="thumb" style="${p.thumb ? `background-image:url('${esc(p.thumb)}')` : ''}"></div>
            <div class="body">
              <strong>${esc(p.title)}</strong>
              <span class="muted small">${esc(p.address || '')}</span>
              <div class="row small">
                <span class="badge ${p.status === 'published' ? 'published' : ''}">${p.status === 'published' ? 'Publicada' : 'Borrador'}</span>
                <span class="muted">${p.room_count} estancias · ${p.visits} visitas</span>
              </div>
              ${isAdmin ? `<span class="muted small">${esc(p.agency_name)} · ${fmtDate(p.updated_at)}</span>` : ''}
            </div>
          </a>`).join('')}</div>`
        : `<div class="card muted">${isAdmin ? 'Aún no hay viviendas.' : 'Tu administrador todavía no ha creado ninguna vivienda.'}</div>`}
      </section>
    </div>

    <dialog id="dlg-agency">
      <form class="form" method="dialog" id="f-agency">
        <h2>Nueva inmobiliaria</h2>
        <label>Nombre comercial <input name="name" required></label>
        <div class="two">
          <label>Email de acceso <input name="email" type="email" required></label>
          <label>Contraseña inicial <input name="password" minlength="8" required placeholder="mín. 8 caracteres"></label>
        </div>
        <div class="two">
          <label>Teléfono <input name="phone"></label>
          <label>WhatsApp <input name="whatsapp" placeholder="34600000000"></label>
        </div>
        <div class="row"><button value="cancel" formnovalidate>Cancelar</button><span class="spacer"></span><button class="primary" value="ok">Crear</button></div>
      </form>
    </dialog>

    <dialog id="dlg-property">
      <form class="form" method="dialog" id="f-property">
        <h2>Nueva vivienda</h2>
        <label>Inmobiliaria
          <select name="agency_id">${agencies.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select>
        </label>
        <label>Título del anuncio <input name="title" required placeholder="Piso reformado con terraza"></label>
        <div class="two">
          <label>Dirección <input name="address"></label>
          <label>Precio <input name="price" placeholder="250.000 €"></label>
        </div>
        <div class="row"><button value="cancel" formnovalidate>Cancelar</button><span class="spacer"></span><button class="primary" value="ok">Crear</button></div>
      </form>
    </dialog>`;

  bindDialog('new-agency', 'dlg-agency', 'f-agency', async (data) => {
    await api('/agencies', { method: 'POST', body: data });
    toast('Inmobiliaria creada');
    route();
  });
  bindDialog('new-property', 'dlg-property', 'f-property', async (data) => {
    const { id } = await api('/properties', { method: 'POST', body: data });
    location.hash = `#/property/${id}/rooms`;
  });
}

/** Abre un <dialog> con formulario y ejecuta onSubmit al confirmar. */
function bindDialog(btnId, dlgId, formId, onSubmit) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const dlg = document.getElementById(dlgId);
  btn.onclick = () => dlg.showModal();
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'ok') return;
    try {
      await onSubmit(Object.fromEntries(new FormData(document.getElementById(formId))));
    } catch (err) {
      toast(err.message, true);
      dlg.showModal();
    }
  });
}

// ---------------------------------------------------------------------------
// Marca blanca de una inmobiliaria
// ---------------------------------------------------------------------------
async function renderAgency(id) {
  const a = await api(`/agencies/${id}`);
  const isAdmin = session.get().user.role === 'admin';
  app.innerHTML = `
    <p><a href="#/">← Inicio</a></p>
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items:start">
      <form class="card form" id="f">
        <h1>${esc(a.name)}</h1>
        <p class="muted small">Estos datos aparecen en todos los recorridos de la inmobiliaria.</p>
        <label>Nombre comercial <input name="name" value="${esc(a.name)}" required></label>
        <div class="two">
          <label>Color principal <input type="color" name="color_primary" value="${esc(a.color_primary)}"></label>
          <label>Color de acento (botones) <input type="color" name="color_accent" value="${esc(a.color_accent)}"></label>
        </div>
        <div class="two">
          <label>Teléfono <input name="phone" value="${esc(a.phone || '')}"></label>
          <label>WhatsApp (con prefijo, sin +) <input name="whatsapp" value="${esc(a.whatsapp || '')}" placeholder="34600000000"></label>
        </div>
        <div class="two">
          <label>Email de contacto <input name="contact_email" type="email" value="${esc(a.contact_email || '')}"></label>
          <label>Web <input name="website" type="url" value="${esc(a.website || '')}" placeholder="https://"></label>
        </div>
        <label>Nueva contraseña de acceso <input name="password" type="password" minlength="8" placeholder="Dejar vacío para no cambiarla" autocomplete="new-password"></label>
        <p class="muted small">Usuario de acceso: <strong>${esc(a.email)}</strong></p>
        <div class="row">
          <button class="primary">Guardar</button>
          ${isAdmin ? '<span class="spacer"></span><button type="button" class="danger" id="del">Eliminar inmobiliaria</button>' : ''}
        </div>
      </form>
      <section class="card stack">
        <h2>Logotipo</h2>
        <div id="logo-preview" style="padding:16px;border-radius:10px;background:${esc(a.color_primary)}10;min-height:80px;display:flex;align-items:center">
          ${a.logo_url ? `<img src="${esc(a.logo_url)}" alt="Logo" style="max-height:60px;max-width:100%">` : '<span class="muted">Sin logo (se mostrará el nombre)</span>'}
        </div>
        <label>Subir logo (PNG con fondo transparente, JPG o SVG)
          <input type="file" id="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml">
        </label>
      </section>
    </div>`;

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.password) delete data.password;
    try {
      await api(`/agencies/${id}`, { method: 'PUT', body: data });
      toast('Guardado');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  });
  $('#logo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', await compressSimple(file, 600), 'logo');
      await upload(`/agencies/${id}/logo`, fd);
      toast('Logo actualizado');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  });
  $('#del')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${a.name}" con todas sus viviendas, fotos y estadísticas? No se puede deshacer.`)) return;
    await api(`/agencies/${id}`, { method: 'DELETE' });
    location.hash = '#/';
  });
}
