/**
 * Punto de entrada del Worker.
 *
 *   /api/public/*  → API pública del visor (sin sesión)
 *   /api/*         → API privada del panel (con sesión)
 *   /media/*       → imágenes subidas (R2)
 *   /t/:publicId   → página pública del recorrido (con metaetiquetas para redes sociales)
 *   resto          → archivos estáticos de /public (panel, visor, demo)
 */
import { Hono } from 'hono';
import adminApi from './routes/admin.js';
import publicApi, { findTour } from './routes/public.js';
import { serveMedia } from './lib/media.js';
import { HttpError } from './lib/util.js';

const app = new Hono();

app.route('/api/public', publicApi);
app.route('/api', adminApi);

app.get('/media/*', (c) => serveMedia(c.env, decodeURIComponent(c.req.path.slice('/media/'.length)), c.req.raw));

// Página del recorrido. Incrusta los datos en el HTML para ahorrar una petición en móvil
// y añade título/imagen para que el enlace se vea bien al compartirlo en WhatsApp o redes.
app.get('/t/:pid', async (c) => {
  const page = await c.env.ASSETS.fetch(new URL('/tour/', c.req.url));
  let tour = null;
  try {
    tour = (await findTour(c.env, c.req.param('pid'))).tour;
  } catch (e) {
    if (!(e instanceof HttpError)) throw e; // borrador o inexistente: el visor mostrará el aviso
  }
  const origin = new URL(c.req.url).origin;
  const image = tour?.rooms[0]?.thumb;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const rewritten = new HTMLRewriter()
    .on('head', {
      element(el) {
        if (!tour) return;
        const desc = [tour.price, tour.address].filter(Boolean).join(' · ');
        el.append(
          `<meta property="og:title" content="${esc(tour.title)}">` +
          `<meta property="og:description" content="${esc(`Visita virtual · ${desc}`)}">` +
          (image ? `<meta property="og:image" content="${esc(origin + image)}">` : '') +
          `<meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">` +
          `<script>window.__TOUR__=${JSON.stringify(tour).replace(/</g, '\\u003c')}</script>`,
          { html: true }
        );
      },
    })
    .on('title', { element(el) { if (tour) el.setInnerContent(`${tour.title} · Visita virtual`); } })
    .transform(page);
  const res = new Response(rewritten.body, rewritten);
  res.headers.set('cache-control', 'no-cache');
  // Permite insertar el recorrido en cualquier web mediante <iframe>
  res.headers.delete('x-frame-options');
  return res;
});

app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'No encontrado' }, 404) : c.env.ASSETS.fetch(c.req.raw)));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof SyntaxError) return c.json({ error: 'Petición no válida' }, 400);
  console.error(err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default app;
