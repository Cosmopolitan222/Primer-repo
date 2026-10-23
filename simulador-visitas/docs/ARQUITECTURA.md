# Arquitectura

## Visión general

```
                         ┌──────────────────────── Cloudflare (capa gratuita) ────────────────────────┐
                         │                                                                            │
  Inmobiliaria / Admin   │   Archivos estáticos (gratis e ilimitados)       Worker (src/index.js)     │
  ─────────────────────► │   /admin/  panel (HTML + JS)          ──fetch──►  /api/*         API privada│
  navegador              │   /tour/   visor                                  /api/public/*  API pública│
  (comprime las fotos)   │   /vendor/ Pannellum                              /t/:id         página del │
                         │   /demo/   vivienda de demostración                              recorrido  │
                         │                                                   /media/*       fotos      │
  Visitante final        │                                                      │        │             │
  ─────────────────────► │                                                      ▼        ▼             │
  móvil / ordenador      │                                              D1 (SQLite)   R2 (fotos)       │
  o iframe en otra web   │                                              datos y stats  sin coste de    │
                         │                                                             tráfico         │
                         └────────────────────────────────────────────────────────────────────────────┘
```

**Decisiones clave**

| Decisión | Motivo |
|---|---|
| **Cloudflare Workers + D1 + R2** | 0 €/mes para empezar, CDN mundial incluida, R2 no cobra el tráfico de salida (las fotos son el 95 % de los datos), un solo proveedor y un solo comando para desplegar. |
| **Sin paso de compilación** (HTML + JS nativo con módulos ES) | Menos piezas que se pueden romper; se edita un archivo y se recarga. Adecuado para un equipo pequeño o no técnico. |
| **Compresión en el navegador** (canvas → WebP/JPEG) | La subida pesa 5–20 veces menos (útil si la inmobiliaria sube desde el móvil en la vivienda), el servidor no necesita librerías de imagen y no gasta CPU del Worker. |
| **Tres versiones de cada foto** (full / preview / thumb) | Carga progresiva: el visitante ve la estancia en menos de 1 s con ~40 KB y la versión HD aparece después con un fundido. |
| **Hono** como único paquete del backend | Enrutador mínimo (≈14 KB), estándar en Workers. |
| **Analítica propia sin cookies** | No requiere banner de cookies (RGPD); datos anónimos por sesión de pestaña. |

## Por qué Pannellum para las 360°

| | **Pannellum** ✅ | Marzipano | Three.js |
|---|---|---|---|
| Peso | ~56 KB (18 KB gzip) | ~200 KB | ~600 KB + código propio |
| Hotspots, transiciones con fundido, autorrotación | Incluidos | Incluidos | Hay que programarlos |
| Giroscopio (incluido el permiso de iOS 13+) | Incluido | Incluido | Hay que programarlo |
| Imágenes equirectangulares directas | Sí | Necesita teselas (cubemap) para rendir bien | Sí |
| Licencia | MIT | Apache 2.0 | MIT |
| Mantenimiento | Activo, API estable | Poco activo | Muy activo |

Pannellum cubre todo lo que pide el MVP con una sola etiqueta `<script>`, acepta directamente el JPG equirectangular que exporta cualquier cámara 360° y pesa muy poco, lo que importa con datos móviles. Marzipano compensa cuando hay panorámicas gigantes (> 8K) teseladas en varios niveles; Three.js, cuando se quiera reconstrucción 3D real (ver [MEJORAS-FUTURAS.md](MEJORAS-FUTURAS.md)). El código del visor aísla Pannellum en `showPano()`, así que cambiarlo más adelante no afecta al resto.

Las fotos normales usan un visor propio (`public/tour/flat-viewer.js`, unas 200 líneas): Ken Burns, arrastre, zoom con rueda, pellizco o doble toque, y hotspots que conservan su tamaño al hacer zoom.

## Estructura de carpetas

```
simulador-visitas/
├── README.md                  Instalación, despliegue y uso
├── wrangler.jsonc             Configuración de Cloudflare (D1, R2, archivos estáticos)
├── package.json               Scripts npm
├── .dev.vars.example          Contraseñas de desarrollo (copiar a .dev.vars)
├── migrations/
│   └── 0001_init.sql          Esquema de la base de datos
├── seed/
│   └── demo.sql               Datos de la vivienda de demostración (generado)
├── scripts/
│   ├── generate-demo.mjs      Raytracer que "fotografía" el piso demo y calcula sus hotspots
│   └── reset-local.mjs        Borra los datos locales
├── src/                       ── Backend (Cloudflare Worker) ──
│   ├── index.js               Rutas principales, página /t/:id con metaetiquetas, errores
│   ├── routes/
│   │   ├── admin.js           API privada: login, inmobiliarias, viviendas, estancias, hotspots
│   │   ├── public.js          API pública: datos del recorrido, eventos de analítica, leads
│   │   └── stats.js           Consultas de estadísticas
│   └── lib/
│       ├── auth.js            Contraseñas PBKDF2 y tokens de sesión firmados (HMAC)
│       ├── media.js           Subida, borrado y servido de imágenes en R2
│       ├── tours.js           Carga de viviendas, permisos y JSON del visor
│       └── util.js            Ids, validaciones, UPDATE dinámico
├── public/                    ── Frontend (archivos estáticos) ──
│   ├── index.html             Portada con la demo en un iframe
│   ├── tour/                  Visor público
│   │   ├── index.html
│   │   ├── tour.js            Controlador: navegación, autoplay, plano, contacto, pantalla completa
│   │   ├── flat-viewer.js     Visor de fotos normales (Ken Burns, zoom, hotspots)
│   │   ├── analytics.js       Eventos anónimos con sendBeacon
│   │   └── tour.css
│   ├── admin/                 Panel de gestión
│   │   ├── index.html
│   │   ├── admin.css
│   │   └── js/
│   │       ├── app.js         Rutas, login, inicio, marca blanca
│   │       ├── editor.js      Editor de vivienda: estancias, hotspots, plano, publicar, estadísticas
│   │       ├── image-tools.js Detección 360°, compresión y miniaturas en el navegador
│   │       ├── api.js         Cliente HTTP con sesión y subida con progreso
│   │       └── ui.js          Utilidades (escape HTML, avisos, formatos)
│   ├── vendor/pannellum/      Pannellum 2.5.7 (MIT)
│   └── demo/                  Fotos, plano y logo de la vivienda de demostración
├── test/                      Pruebas (node --test)
└── docs/                      Esta documentación
```

## Modelo de datos (D1 / SQLite)

```
agencies 1──* properties 1──* rooms 1──* hotspots ──→ rooms (destino)
                   │
                   ├──* events   (analítica)
                   └──* leads    (contactos)
```

| Tabla | Campos principales |
|---|---|
| `agencies` | nombre, email y hash de contraseña de acceso, logo, colores, teléfono, WhatsApp, email y web de contacto |
| `properties` | inmobiliaria, `public_id` (enlace corto), título, dirección, precio, descripción, estado (borrador/publicada), estancia de inicio, plano, segundos de autoplay |
| `rooms` | vivienda, nombre, tipo (`pano`/`flat`), orden, URLs de las 3 versiones, tamaño, m², orientación, calidades, posición en el plano, vista inicial |
| `hotspots` | estancia, tipo (`link`/`info`), destino, posición (yaw/pitch en 360°, x/y en % en fotos normales), etiqueta, texto |
| `events` | vivienda, sesión anónima, tipo (`start`, `room`, `dwell`, `whatsapp`, `call`, `email`, `lead`), estancia, valor (ms), dispositivo |
| `leads` | vivienda, nombre, teléfono, email, mensaje |

## API

Las rutas privadas requieren `Authorization: Bearer <token>` (se obtiene en `/api/auth/login`). Un usuario de inmobiliaria solo ve y edita lo suyo; crear o borrar inmobiliarias y viviendas es exclusivo del administrador.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Email + contraseña → token |
| GET | `/api/agencies` · POST `/api/agencies` | Listar / crear (admin) |
| GET · PUT · DELETE | `/api/agencies/:id` | Ver / editar marca / borrar (admin) |
| POST | `/api/agencies/:id/logo` | Subir logo |
| GET · POST | `/api/properties` | Listar / crear (admin) |
| GET · PUT · DELETE | `/api/properties/:id` | Ver todo (estancias + hotspots) / editar / borrar (admin) |
| PUT | `/api/properties/:id/order` | Reordenar estancias |
| POST · DELETE | `/api/properties/:id/plan` | Subir / quitar plano |
| GET | `/api/properties/:id/stats?days=30` | Estadísticas |
| GET | `/api/properties/:id/leads` | Contactos |
| POST | `/api/properties/:id/rooms` | Nueva estancia (multipart: full, preview, thumb, kind, width, height, name) |
| PUT · DELETE | `/api/rooms/:id` | Editar / borrar estancia |
| POST | `/api/rooms/:id/image` | Sustituir foto |
| POST | `/api/rooms/:id/hotspots` | Nuevo hotspot |
| PUT · DELETE | `/api/hotspots/:id` | Editar / borrar hotspot |
| GET | `/api/public/tours/:publicId` | JSON del recorrido (solo publicados, o borrador con `?token=`) |
| POST | `/api/public/tours/:publicId/events` | Lote de eventos de analítica |
| POST | `/api/public/tours/:publicId/leads` | Formulario de contacto (con campo trampa anti-spam) |
| GET | `/t/:publicId` | Página del recorrido con datos incrustados y metaetiquetas Open Graph |
| GET | `/media/*` | Fotos desde R2 con caché inmutable de 1 año |

## Rendimiento con datos móviles

- Primera pantalla de una visita: HTML + CSS + JS + Pannellum ≈ 35 KB comprimido, más la preview de la estancia (~40 KB). Los datos del recorrido van dentro del HTML, sin petición extra.
- La foto HD (≈ 0,5–0,8 MB en 360°, ≈ 0,2 MB normal) se descarga en segundo plano y se cambia con un fundido.
- Las previews del resto de estancias se precargan a los 1,5 s (≈ 40 KB cada una), así que los saltos entre estancias son inmediatos.
- Las imágenes tienen claves aleatorias, así que se cachean como inmutables en el CDN y en el móvil.
- Las 360° se limitan a 4096×2048, el tamaño de textura que admiten prácticamente todas las GPU móviles.

## Seguridad

- Contraseñas con PBKDF2-SHA256 (100 000 iteraciones, sal aleatoria). Sesiones firmadas con HMAC y caducidad de 14 días.
- Comprobación de pertenencia en cada ruta (una inmobiliaria no puede tocar viviendas de otra).
- Escape de HTML en todo el contenido generado por usuarios; los SVG subidos se convierten a PNG para evitar scripts incrustados.
- Los borradores no son públicos; la vista previa usa el token de sesión.
- Pendiente para producción: limitar intentos de login (regla de *Rate limiting* de Cloudflare sobre `/api/auth/login`) y, cuando haya varios usuarios por inmobiliaria, tabla `users` con roles.

## Costes y límites de la capa gratuita

| Servicio | Gratis | Consumo aproximado |
|---|---|---|
| Workers | 100 000 peticiones/día | ~8–15 por visita (página, fotos, eventos) → **~7 000 visitas/día** |
| Archivos estáticos | Ilimitados | Panel, visor y Pannellum no cuentan |
| D1 | 5 GB · 5 M lecturas/día · 100 000 escrituras/día | ~10 escrituras por visita |
| R2 | 10 GB · tráfico de salida gratis | ~2–4 MB por vivienda → **~3 000 viviendas** |

Al superar esos límites, el plan Workers de pago cuesta 5 $/mes e incluye 10 M de peticiones; R2 cobra unos 0,015 $/GB al mes. Comprueba las cifras vigentes en la web de Cloudflare antes de fijar precios.
