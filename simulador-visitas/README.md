# Simulador de visitas virtuales para inmobiliarias (MVP)

Aplicación web que convierte las fotos de una vivienda en un **recorrido virtual navegable** que la inmobiliaria puede compartir por enlace o insertar en su web.

- **Fotos 360°** → visor inmersivo (arrastrar, zoom, giroscopio del móvil).
- **Fotos normales** → recorrido guiado con efecto Ken Burns, zoom y transiciones suaves.
- **Hotspots**: puntos clicables para pasar de una estancia a otra o mostrar información (m², orientación, calidades).
- **Plano** opcional con la posición del visitante, **recorrido automático**, **pantalla completa**.
- **Marca blanca** por inmobiliaria (logo, colores, contacto) y botón de **WhatsApp / llamada / formulario** para captar contactos.
- **Estadísticas**: visitas, tiempo medio, estancias más vistas, contactos.
- Todo funciona con la **capa gratuita de Cloudflare** (0 €/mes para empezar).

Documentación adicional:

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Arquitectura, estructura de carpetas, por qué Pannellum, modelo de datos y API |
| [docs/MEJORAS-FUTURAS.md](docs/MEJORAS-FUTURAS.md) | Hoja de ruta: reconstrucción 3D, home staging con IA, medición, idiomas… |
| [docs/MODELO-DE-NEGOCIO.md](docs/MODELO-DE-NEGOCIO.md) | Precios por vivienda, suscripción mensual y paquete con fotografía 360° |

---

## 1. Probarlo en tu ordenador (unos 10 minutos)

No necesitas saber programar: solo copiar y pegar comandos en una terminal.

### Paso 1 · Instala Node.js

1. Entra en <https://nodejs.org> y descarga la versión **LTS** (22 o superior).
2. Instálala con las opciones por defecto.
3. Abre una terminal:
   - **Windows**: menú Inicio → escribe `PowerShell` → ábrelo.
   - **Mac**: Aplicaciones → Utilidades → Terminal.
4. Comprueba que funciona escribiendo esto y pulsando Intro:
   ```
   node -v
   ```
   Debe salir algo como `v22.x.x`.

### Paso 2 · Descarga el proyecto

- Con Git: `git clone <url-del-repositorio>` y después `cd <carpeta>/simulador-visitas`
- Sin Git: en GitHub pulsa **Code → Download ZIP**, descomprímelo y en la terminal entra en la carpeta `simulador-visitas`. Truco: escribe `cd ` (con espacio) y arrastra la carpeta a la terminal.

### Paso 3 · Instala y prepara los datos

Ejecuta estos comandos uno a uno, dentro de la carpeta `simulador-visitas`:

```bash
npm install
```

Crea el archivo de contraseñas locales copiando el de ejemplo:

```bash
# Mac / Linux
cp .dev.vars.example .dev.vars
# Windows (PowerShell)
copy .dev.vars.example .dev.vars
```

Crea la base de datos local con la vivienda de demostración:

```bash
npm run setup
```

### Paso 4 · Arranca

```bash
npm run dev
```

Abre en el navegador:

| Dirección | Qué es |
|---|---|
| <http://localhost:8787> | Portada con la demo insertada en un iframe |
| <http://localhost:8787/t/demo> | Recorrido de demostración (5 estancias, 3 en 360° y 2 normales) |
| <http://localhost:8787/admin/> | Panel de gestión |

**Accesos de prueba**

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@visitas.local` | `admin1234` (está en `.dev.vars`) |
| Inmobiliaria demo | `demo@inmobiliaria.test` | `demo1234` |

Para parar el servidor pulsa `Ctrl + C`. Para volver a dejar la demo como al principio: `npm run reset-local`.

> **Probar desde el móvil en local:** con el ordenador y el móvil en la misma wifi, arranca con `npx wrangler dev --ip 0.0.0.0` y abre en el móvil `http://IP-DE-TU-ORDENADOR:8787/t/demo`. El giroscopio solo funciona en HTTPS, así que pruébalo ya desplegado (sección 2).

---

## 2. Publicarlo en Internet gratis (Cloudflare)

Cloudflare aloja la aplicación (Workers), la base de datos (D1) y las fotos (R2). Con la capa gratuita caben más de mil viviendas y varios miles de visitas al día (detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#costes-y-límites-de-la-capa-gratuita)).

1. **Crea una cuenta** gratuita en <https://dash.cloudflare.com/sign-up>.
2. **Activa R2** (almacenamiento de fotos): en el panel de Cloudflare → *R2 Object Storage* → *Activar*. Cloudflare pide una tarjeta aunque no cobra nada mientras no pases de 10 GB.
3. **Conecta tu terminal con tu cuenta** (se abrirá el navegador para autorizar):
   ```bash
   npx wrangler login
   ```
4. **Crea la base de datos**:
   ```bash
   npx wrangler d1 create visitas-db
   ```
   La respuesta incluye una línea `"database_id": "xxxxxxxx-..."`. Ábrela en `wrangler.jsonc` (con el Bloc de notas o cualquier editor) y **sustituye** `00000000-0000-0000-0000-000000000000` por ese valor.
5. **Crea el almacén de fotos**:
   ```bash
   npx wrangler r2 bucket create visitas-media
   ```
6. **Pon tu email de administrador**: en `wrangler.jsonc` cambia `admin@visitas.local` por tu email.
7. **Define las contraseñas** (te las pedirá en la terminal; no se guardan en el código):
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```
   Para `SESSION_SECRET` escribe una frase larga e inventada (40+ caracteres); sirve para firmar las sesiones.
8. **Crea las tablas** en la base de datos de producción. Elige una opción:
   ```bash
   npm run db:remote                                  # tablas + vivienda de demostración
   npx wrangler d1 migrations apply DB --remote       # solo tablas, sin demo
   ```
9. **Publica**:
   ```bash
   npm run deploy
   ```
   Al terminar verás la dirección pública, del tipo `https://simulador-visitas.TU-USUARIO.workers.dev`. Entra en `/admin/` con tu email y la contraseña del paso 7.

**Usar tu propio dominio** (p. ej. `tours.tuempresa.com`): el dominio tiene que estar gestionado por Cloudflare. En el panel: *Workers y Pages* → `simulador-visitas` → *Configuración* → *Dominios y rutas* → *Añadir dominio personalizado*.

**Actualizar** tras cambiar el código: `npm run deploy`. Si en el futuro se añaden archivos nuevos en `migrations/`, ejecuta antes `npx wrangler d1 migrations apply DB --remote`.

**Si tienes la demo publicada y la borras**: entra al panel como administrador y elimina la inmobiliaria "Inmobiliaria Mirador".

---

## 3. Uso del panel, paso a paso

1. **Administrador → Nueva inmobiliaria**: nombre, email y contraseña de acceso. Después, en *Editar*, sube su logo y elige colores, teléfono, WhatsApp y web (marca blanca).
2. **Administrador → Nueva vivienda**: elige la inmobiliaria y escribe el título del anuncio.
3. **Estancias** (inmobiliaria o administrador): arrastra las fotos. El panel detecta si son 360° (proporción 2:1), las comprime y las sube. Pon nombre, m², orientación y calidades. Ordénalas arrastrando ⋮⋮ (o con ↑ ↓ en el móvil) y marca con ★ la de inicio.
4. **Hotspots**: elige una estancia, haz clic en la foto donde está la puerta y elige a qué estancia lleva. Para etiquetas informativas elige *Etiqueta informativa*. En 360° pulsa *Usar esta vista como vista inicial* para decidir hacia dónde mira el visitante al entrar.
5. **Plano** (opcional): sube una imagen del plano, elige cada estancia y haz clic donde se tomó la foto.
6. **Publicar**: activa *Publicada*, copia el **enlace** (para Idealista, Fotocasa, WhatsApp o redes) o el **código iframe** (para la web de la inmobiliaria).
7. **Estadísticas**: visitas, tiempo medio, estancias más vistas y contactos. Los contactos del formulario se descargan en CSV.

### Consejos para las fotos

- **360°**: cámara 360 (Insta360, Ricoh Theta…) en trípode a 1,5 m, en el centro de la estancia, con todas las luces encendidas. Exporta en JPG equirectangular (2:1).
- **Normales**: en horizontal, desde una esquina, con el móvil a la altura del pecho y en modo gran angular (0,5×). Incluye las puertas en el encuadre, porque ahí irán los hotspots.
- Cualquier tamaño vale: el panel reduce las 360° a 4096×2048 y las normales a 1920 px, y genera versiones ligeras para móvil.

### Parámetros del enlace público

| Parámetro | Efecto |
|---|---|
| `?autoplay=1` | Empieza en modo recorrido automático (útil en pantallas de escaparate) |
| `?room=<id>` | Empieza en una estancia concreta |

---

## 4. Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en <http://localhost:8787> |
| `npm run setup` | Crea la base de datos local y carga la demo |
| `npm run reset-local` | Borra los datos locales y vuelve a cargar la demo |
| `npm test` | Pruebas automáticas de autenticación y utilidades |
| `npm run deploy` | Publica en Cloudflare |
| `npm run db:remote` | Crea las tablas y la demo en la base de datos de producción |
| `npm run demo:generate` | Vuelve a renderizar las imágenes de la demo (unos 10 minutos; solo si cambias la demo) |

## 5. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `npm` no se reconoce | Cierra y vuelve a abrir la terminal tras instalar Node.js |
| El panel dice «Falta configurar SESSION_SECRET» | En local: falta el archivo `.dev.vars` (paso 3). En producción: `npx wrangler secret put SESSION_SECRET` |
| `npm run deploy` falla con *database_id* | No has sustituido el ID en `wrangler.jsonc` (sección 2, paso 4) |
| Error de R2 al desplegar | Activa R2 en el panel de Cloudflare y crea el bucket (pasos 2 y 5) |
| No aparece el botón de giroscopio | Solo se muestra en móviles, con fotos 360° y en HTTPS |
| Una foto 360° sale como normal | En *Estancias*, cambia *Tipo de foto* a 360°. La foto debe ser equirectangular 2:1 |
