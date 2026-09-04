# Recordatorios de Citas

Demo funcional de un producto para clínicas privadas que reduce las
ausencias a citas: importación/creación de citas, secuencias de
recordatorios configurables, confirmación/cancelación/cambio por parte del
paciente sin iniciar sesión, lista de espera automática cuando se libera
un hueco, y un panel con métricas calculadas sobre los datos reales de
cada clínica.

**Todo funciona de verdad** (base de datos real, lógica de negocio real,
trazabilidad real). Lo único simulado son los envíos por WhatsApp/SMS/email:
no se usa ningún servicio de pago ni se manda ningún mensaje real. La
arquitectura está preparada para enchufar proveedores reales cuando haga
falta (ver [Integraciones](#integraciones-reales-cómo-conectarlas)).

## Índice

- [Qué incluye](#qué-incluye)
- [Arranque rápido en local](#arranque-rápido-en-local)
- [Cómo probar la demo](#cómo-probar-la-demo-en-5-minutos)
- [Arquitectura](#arquitectura)
- [Integraciones reales: cómo conectarlas](#integraciones-reales-cómo-conectarlas)
- [Privacidad, consentimiento y trazabilidad](#privacidad-consentimiento-y-trazabilidad)
- [Sobre las cifras de ausencias y dinero recuperado](#sobre-las-cifras-de-ausencias-y-dinero-recuperado)
- [Desplegar gratis](#desplegar-gratis)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Comandos disponibles](#comandos-disponibles)

## Qué incluye

- **Panel de gestión** (`/dashboard`, con login) para el personal de la
  clínica: resumen con KPIs, listado de citas con filtros, alta manual e
  importación por CSV, plantillas de mensaje, secuencias de recordatorios,
  lista de espera y auditoría.
- **Enlace público sin login** (`/c/[token]`) para que cada paciente
  confirme, cancele o pida un cambio de horario de su cita, además de
  añadirla a su calendario (`.ics`) y darse de baja de comunicaciones.
- **Lista de espera con ofertas automáticas** (`/o/[token]`): cuando una
  cita futura se cancela, el sistema busca al primer paciente compatible
  en la lista de espera (mismo servicio y dentro de su rango de fechas) y
  le envía un enlace para reservar el hueco. Si no responde a tiempo o lo
  rechaza, se ofrece al siguiente.
- **Motor de automatización** que envía los recordatorios que tocan según
  la secuencia configurada, detecta ausencias automáticamente (cita
  pasada sin confirmación ni asistencia registrada) y gestiona las ofertas
  de lista de espera. Se ejecuta solo cada minuto en segundo plano
  (`src/instrumentation.ts`), y también se puede lanzar a mano con el
  botón "Procesar recordatorios ahora" del panel.
- **Reloj de demostración**: desde Ajustes puedes "adelantar el tiempo"
  (horas o días) para ver en segundos cómo se disparan recordatorios,
  ausencias y ofertas de citas que en la vida real ocurrirían días después.
- **Datos de demostración realistas** (una clínica dental ficticia,
  pacientes y citas en distintos estados) generados por `prisma/seed.ts`.

## Arranque rápido en local

Requisitos: Node.js 20+ y npm.

```bash
cd recordatorios-citas
cp .env.example .env
npm install
npm run db:setup   # crea la base de datos SQLite y la rellena con datos de demo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). En "Acceder al panel"
las credenciales de demo ya vienen precargadas:

- **Email:** `jose1192004@gmail.com`
- **Contraseña:** `demo1234`

`npm install` ya ejecuta `prisma generate` automáticamente (hook
`postinstall`), y `npm run db:setup` aplica las migraciones y siembra los
datos de ejemplo. Si quieres volver a dejar la demo como recién instalada
en cualquier momento:

```bash
npm run db:reset
```

## Cómo probar la demo en 5 minutos

1. Entra al panel y mira **Resumen**: verás los contadores de citas y el
   dinero potencialmente recuperado, calculados sobre los datos de la demo.
2. Ve a **Citas**, abre cualquier cita pendiente y copia/abre el "Enlace
   del paciente": ahí puedes confirmar, cancelar o pedir un cambio tal y
   como lo haría un paciente real, sin iniciar sesión.
3. Al cancelar una cita futura cuyo servicio coincida con alguien en la
   **Lista de espera**, el sistema le ofrece el hueco automáticamente al
   pulsar "Procesar recordatorios ahora" (o esperando al minuto en segundo
   plano). Abre el enlace de oferta para aceptarlo o rechazarlo.
4. En **Ajustes**, usa el "Reloj de demostración" para adelantar varios
   días y observar cómo se envían los recordatorios programados y cómo
   las citas sin confirmar ni atender pasan a "Ausencia" automáticamente.
5. Revisa **Auditoría** y el "Historial de envíos" de cualquier cita para
   ver la trazabilidad completa de lo ocurrido.

## Arquitectura

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**, todo en un
  único proyecto (frontend, backend y base de datos).
- **SQLite** vía Prisma ORM (`@prisma/adapter-better-sqlite3`): cero
  configuración, no requiere ningún servicio externo ni credencial. El
  fichero de datos vive en `prisma/dev.db` (no se versiona en git).
- **Autenticación** propia y ligera: sesión firmada con JWT (`jose`) en
  una cookie `httpOnly`, contraseñas con `bcryptjs`. Sin dependencias de
  terceros ni servicios de pago.
- **Server Actions** de React para casi todas las mutaciones (crear citas,
  confirmar/cancelar, gestionar plantillas y secuencias...), y un puñado
  de *Route Handlers* donde hace falta un endpoint HTTP real:
  - `GET/POST /api/cron/process`: dispara el motor de automatización;
    pensado para un programador de tareas externo gratuito en despliegues
    serverless (ver más abajo).
  - `GET /api/ics/[token]`: genera un archivo `.ics` para añadir la cita
    al calendario del paciente (Google Calendar, Outlook, Apple Calendar).
- **Motor de recordatorios** (`src/lib/reminder-engine.ts`): un único
  punto de entrada (`runEngineForClinic`) que procesa recordatorios
  pendientes, detecta ausencias y gestiona ofertas de lista de espera. Se
  invoca desde tres sitios (botón manual, cron externo, intervalo en
  segundo plano) sin duplicar lógica.
- **Proveedores de notificación** (`src/lib/notifications/`): patrón de
  adaptador (`NotificationProvider`). El proveedor activo por defecto es
  `SimulatedProvider`, que registra el envío (con una pequeña tasa de
  fallo simulada) sin llamar a ningún servicio externo. Cada mensaje
  enviado (o no enviado, y por qué) queda registrado en `NotificationLog`
  para trazabilidad.

## Integraciones reales: cómo conectarlas

Esta demo **nunca** envía mensajes reales ni usa servicios de pago, pero
la arquitectura ya está pensada para ello:

| Canal | Dónde está el punto de extensión | Qué falta |
|---|---|---|
| WhatsApp Business | `src/lib/notifications/providers/whatsapp-cloud-api.ts` | Credenciales de Meta (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) y plantillas aprobadas |
| SMS | `src/lib/notifications/providers/sms-twilio.ts` | Cuenta en un proveedor SMS (Twilio u otro) |
| Email | `src/lib/notifications/providers/email-smtp.ts` | Proveedor de email (Resend, SMTP...) |
| Calendarios | `src/lib/calendar/` | La exportación `.ics` ya funciona de verdad; la sincronización bidireccional con Google/Outlook requiere registrar una app OAuth (ver `src/lib/calendar/README.md`) |

Para activar un canal real: implementa las llamadas HTTP comentadas en el
proveedor correspondiente, define las variables de entorno (ver
`.env.example`) y descomenta la rama correspondiente en
`src/lib/notifications/index.ts` (`getProvider`). El resto de la
aplicación no necesita cambios: sigue llamando a la misma interfaz.

## Privacidad, consentimiento y trazabilidad

- **Minimización de datos**: de cada paciente solo se guarda lo
  imprescindible para contactarlo (nombre, teléfono y/o email, canal
  preferido). No se piden datos clínicos ni identificadores oficiales.
- **Consentimiento explícito**: cada paciente tiene un campo de
  consentimiento (`consentGiven`) que se marca al darlo de alta. Si no
  hay consentimiento registrado, el motor de recordatorios **no envía
  nada** y lo deja anotado en el historial de envíos.
- **Baja de comunicaciones**: cada mensaje enlaza a una página de baja
  (`/baja/[clinicId]/[patientId]`) independiente de la cita. Un paciente
  dado de baja deja de recibir recordatorios y ofertas, y también queda
  registrado en el historial de envíos.
- **Trazabilidad básica**: toda acción relevante (creación, confirmación,
  cancelación, ausencia, envío de recordatorio, oferta de hueco...) se
  registra en una auditoría (`AuditLog`) con quién la hizo (paciente,
  personal o "sistema") y cuándo. Visible en `/dashboard/auditoria` y en
  el detalle de cada cita.

## Sobre las cifras de ausencias y dinero recuperado

Deliberadamente **no** se muestra ningún porcentaje de no-shows ni cifra
de pérdidas "típica del sector": varían mucho según especialidad,
ubicación y tipo de cita, y presentarlas como universales sin una fuente
verificable sería engañoso.

En su lugar, el panel calcula el "dinero potencialmente recuperado" a
partir de los datos reales de cada clínica (ver `src/lib/metrics.ts`):

- **Por confirmaciones vía recordatorio**: valor de las citas que el
  propio paciente confirmó desde el enlace de recordatorio.
- **Por huecos recuperados**: valor de las citas que se llenaron gracias
  a que se ofreció el hueco liberado a la lista de espera.
- Cuando una cita no tiene un precio propio, se usa el **valor medio por
  cita** que cada clínica configura en Ajustes — nunca una cifra externa.

## Desplegar gratis

Esta app necesita un proceso Node.js persistente (no puramente
serverless) para que el motor de recordatorios funcione solo en segundo
plano y para que SQLite tenga un disco donde escribir. Opciones gratuitas
recomendadas:

### Opción A — Render.com (recomendada)

1. Sube este proyecto a un repositorio de GitHub.
2. En Render, crea un **Web Service** nuevo apuntando a la carpeta
   `recordatorios-citas`.
3. Build command: `npm install && npm run build`
   Start command: `npm run db:setup && npm run start`
4. Define las variables de entorno de `.env.example` (como mínimo
   `DATABASE_URL=file:./dev.db`, `AUTH_SECRET`, `NEXT_PUBLIC_BASE_URL`
   con la URL pública que te da Render, y `CRON_SECRET`).
5. En el plan gratuito, el disco es efímero (se reinicia con cada
   despliegue): perfecto para una demo, ya que siempre vuelve a arrancar
   con datos de ejemplo limpios. Si quieres persistencia real entre
   reinicios, añade un "Persistent Disk" (de pago) o cambia a una base de
   datos gestionada (ver más abajo).

### Opción B — Railway.app

Mismo planteamiento que Render: un servicio Node con `npm run build` y
`npm run db:setup && npm run start`, variables de entorno equivalentes.
Railway ofrece un pequeño crédito gratuito mensual.

### Opción C — Vercel (con matices)

Vercel es serverless: no hay proceso persistente, así que el intervalo en
segundo plano (`src/instrumentation.ts`) no sobrevive entre peticiones, y
SQLite no tiene disco persistente en cada función. Si aún así quieres usar
Vercel:

1. Sustituye SQLite por una base de datos serverless gratuita compatible
   con Prisma (por ejemplo Turso o Neon), actualizando `datasource` en
   `prisma/schema.prisma` y el adaptador en `src/lib/prisma.ts` y
   `prisma/seed.ts`.
2. Configura un cron externo gratuito (por ejemplo
   [cron-job.org](https://cron-job.org)) que llame cada minuto a
   `https://tu-app.vercel.app/api/cron/process?secret=TU_CRON_SECRET`
   para que los recordatorios se sigan procesando sin un proceso en
   segundo plano.

## Estructura del proyecto

```
recordatorios-citas/
  prisma/
    schema.prisma        Modelo de datos (clínica, pacientes, citas,
                          plantillas, secuencias, lista de espera, auditoría)
    seed.ts               Datos de demostración
  src/
    app/
      page.tsx             Landing
      login/                Acceso del panel
      dashboard/            Panel del personal (protegido)
      c/[token]/            Confirmación pública de cita (sin login)
      o/[token]/             Respuesta pública a oferta de lista de espera
      baja/[clinicId]/[patientId]/  Baja de comunicaciones
      api/cron/process/      Endpoint para cron externo
      api/ics/[token]/       Exportación de la cita a calendario
    components/            Componentes de UI reutilizables
    lib/
      reminder-engine.ts    Motor de automatización
      notifications/        Adaptadores de envío (simulado + reales comentados)
      calendar/              Exportación .ics
      actions/                Server Actions (mutaciones)
      metrics.ts              Cálculo del panel de KPIs
      auth.ts, prisma.ts, constants.ts, ...
    instrumentation.ts      Arranque del planificador en segundo plano
    proxy.ts                 Protección de rutas /dashboard (antes "middleware")
```

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Arranca el build de producción |
| `npm run lint` | ESLint |
| `npm run db:setup` | Aplica migraciones + siembra datos de demo (primer arranque) |
| `npm run db:seed` | Vuelve a sembrar los datos de demo (borra los actuales) |
| `npm run db:reset` | Reinicia la base de datos por completo y la siembra de nuevo |
