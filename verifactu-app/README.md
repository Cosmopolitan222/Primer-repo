# Facturacion Verifactu (demo local)

Sistema de facturacion para autonomos y pequenos negocios (talleres, peluquerias,
comercios, hosteleria) que implementa, con fines demostrativos, los elementos
tecnicos centrales que exige Verifactu: **encadenamiento inalterable de
facturas mediante huellas (hash SHA-256)**, **codigo QR normativo**,
**registro interno de eventos con trazabilidad** y **exportacion de facturas**.

Cubre el ciclo completo de un negocio pequeno: clientes, productos/servicios,
emision de facturas, consulta e historico, y visualizacion de la cadena de
integridad de los registros. Ademas, incluye dos funciones pensadas para
ahorrar tiempo en el uso diario (que es donde compite el software de
facturacion ya establecido en el mercado, no en el cumplimiento normativo
en si): **marcar facturas como cobradas** (con paneles de pendiente de
cobro / cobrado) y **duplicar una factura existente** para clientes
recurrentes.

> **Demo 100% local.** No hay coste alguno mas alla de tu maquina, no se usan
> servicios de pago, no se piden credenciales de terceros y **no se realiza
> ninguna llamada a la AEAT**. Todo lo relacionado con la conexion real con
> Hacienda esta simulado o documentado como pendiente (ver "Limitaciones").
> Todos los datos de la demo (negocio, clientes, facturas) son ficticios.

---

## 1. Como ejecutarlo desde cero

Requisitos: **Node.js 22.5 o superior** (usa el modulo nativo experimental
`node:sqlite`, incluido en Node sin instalar nada mas). Comprueba tu version
con `node --version`.

```bash
cd verifactu-app

# 1. Configura el secreto de sesion (no hay ninguno por defecto en el repo)
cp .env.example .env.local
# sustituye SESSION_SECRET en .env.local por un valor propio, por ejemplo:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# copia la salida y pegala como valor de SESSION_SECRET en .env.local

# 2. Instala dependencias
npm install

# 3. Crea datos de ejemplo (negocio, usuario, clientes y productos, todos ficticios)
npm run seed

# 4. Arranca en modo desarrollo...
npm run dev
# ...o compila y arranca en modo produccion:
npm run build
npm start
```

Abre `http://localhost:3000` (o el puerto que uses) e inicia sesion con:

- **Email:** `demo@verifactu-demo.local`
- **Contrasena:** `Demo1234!`

(Estas credenciales las crea `npm run seed`; no vienen precargadas en la base
de datos hasta que ejecutas ese comando.)

### Ejecutar las pruebas automatizadas

```bash
npm test
```

43 pruebas (Vitest) cubriendo validacion de NIF/CIF/NIE con su algoritmo real
de digito de control, calculo y verificacion de la cadena de huellas
(incluyendo deteccion de manipulacion), calculos de IVA/totales, numeracion
secuencial de facturas, anulacion mediante factura rectificativa, marcado de
facturas como cobradas (y sus restricciones: no se puede pagar dos veces, ni
anular una factura ya cobrada, ni cobrar una rectificativa), y sanitizacion
anti-inyeccion de formulas en la exportacion CSV.

---

## 2. Recorrido principal (verificado manualmente de extremo a extremo)

1. Iniciar sesion.
2. Dar de alta un cliente (con validacion real de NIF/CIF/NIE).
3. Dar de alta o reutilizar un producto/servicio.
4. Emitir una factura con una o varias lineas -> se calcula base, cuota de
   IVA y total, se genera su huella SHA-256 encadenada con la anterior, y su
   codigo QR.
5. Consultar el historico y el detalle de la factura (con QR y huellas).
6. Ver la pagina "Cadena de integridad": recalcula todas las huellas y
   confirma que la cadena esta intacta.
7. Anular una factura -> se emite automaticamente una factura rectificativa
   que compensa el importe (las facturas nunca se editan ni se borran).
8. Marcar una factura como cobrada (o duplicarla para un cliente recurrente,
   precargando cliente y lineas en una factura nueva a revisar antes de
   emitir).
9. Exportar una factura individual (JSON) o el historico completo (CSV).

Este recorrido se ha probado de forma automatizada con Playwright/Chromium
contra un build de produccion real (`npm run build && npm start`), navegando
por clic como lo haria una persona, sin errores de consola ni del servidor.
(Nota: si automatizas pruebas con `page.goto()` en sucesion muy rapida,
veras en consola avisos benignos de Next.js del tipo *"Failed to fetch RSC
payload... Falling back to browser navigation"*; son el prefetch de `<Link>`
siendo cancelado por una navegacion dura inmediatamente posterior, no un
fallo de la aplicacion. No aparecen navegando por clic.)

---

## 3. Arquitectura y decisiones tecnicas

| Area | Decision | Motivo |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Un unico proyecto sirve UI y API (route handlers), cero infraestructura adicional. |
| Base de datos | SQLite via el modulo nativo **`node:sqlite`** (experimental en Node 22+) | Cero dependencias externas, cero coste, cero binarios nativos que compilar. Se accede via `process.getBuiltinModule('node:sqlite')` en vez de `import ... from 'node:sqlite'` porque bundlers como Vite/webpack todavia no reconocen ese modulo como nativo estable e intentan (y fallan) resolverlo como paquete npm. |
| Autenticacion | Sesion propia por cookie firmada (HMAC-SHA256), sin JWT ni libreria externa | Menos dependencias, mismo nivel de seguridad para este alcance. Cookie `httpOnly`, `sameSite=lax`, `secure` en produccion. |
| Contrasenas | `bcryptjs`, coste 10 | Estandar de facto, sin binarios nativos. |
| QR | Libreria `qrcode`, generado 100% en local | El QR real de Verifactu apunta a un endpoint de cotejo de la AEAT; aqui se genera un payload de **verificacion simulada** (`https://verifactu-demo.local/...`), claramente marcado como demo, con los mismos campos (NIF emisor, numero, fecha, importe, huella). |
| Cadena de integridad | Huella SHA-256 por factura, encadenada con la huella de la factura anterior del mismo negocio | Inspirado en el concepto de encadenamiento de Verifactu. Implementacion propia y simplificada (ver limitaciones). |
| Inmutabilidad | Las tablas `invoices` e `invoice_lines` **nunca reciben UPDATE ni DELETE** tras la insercion. Anular una factura crea una factura rectificativa nueva (importe en negativo) referenciando a la original, y un evento de estado `ANULADA` | Asi se modela con fiabilidad el "no se puede alterar una factura ya emitida" sin necesidad de permisos de base de datos especiales. |
| Registro de eventos | Tabla `event_log` append-only, tambien encadenada con hash | Trazabilidad de accesos, altas, emisiones, anulaciones y exportaciones. |
| Exportacion | JSON "tipo registro de facturacion" por factura + CSV del historico | Sin generar PDF con una libreria pesada: la vista de factura incluye un boton "Imprimir / PDF" que usa el dialogo de impresion del navegador (con estilos `@media print`), suficiente para una demo 100% local. |

### Estructura del proyecto

```
verifactu-app/
  src/
    lib/          Logica de negocio y utilidades (sin dependencias de Next.js salvo auth.ts)
    app/           Paginas (App Router) y rutas API (app/api/**/route.ts)
    components/    Componentes de UI compartidos (barra de navegacion, etc.)
    types/         Declaraciones de tipos ambientales (node:sqlite, process.getBuiltinModule)
  scripts/seed.ts  Datos de ejemplo (ficticios)
  tests/           Pruebas Vitest
```

---

## 4. Seguridad: que se ha aplicado y que se ha revisado de verdad

Medidas implementadas (no solo mencionadas, verificadas en el codigo):

- **Sin inyeccion SQL**: todas las consultas usan parametros ligados
  (`prepare(...).run/get/all(valor)`), nunca concatenacion de strings. Se
  ha revisado el codigo fuente completo (`grep`) para confirmar que no hay
  ninguna consulta construida por concatenacion.
- **Control de acceso real**: toda ruta de la API (salvo login/logout/me)
  exige una sesion valida (`requireSession`) y **todas** las consultas de
  negocio filtran ademas por `business_id` de la sesion, no por datos que
  envie el cliente, para evitar IDOR entre negocios. Verificado
  manualmente: sin cookie de sesion, `/api/facturas` devuelve `401`.
- **Contrasenas**: hash con `bcrypt` (nunca en texto plano ni reversible).
- **Sesiones**: cookie firmada con HMAC-SHA256 y comparacion en tiempo
  constante (`crypto.timingSafeEqual`), `httpOnly`, `sameSite=lax`,
  expiracion a las 8 horas.
- **Mitigacion basica de fuerza bruta**: bloqueo temporal tras 5 intentos
  fallidos por email, y comparacion contra un hash "senuelo" cuando el
  usuario no existe, para no filtrar por tiempos de respuesta que emails
  estan registrados.
- **Validacion real de entrada** en toda la superficie de la API: NIF/CIF/NIE
  con su algoritmo de digito de control (no solo una expresion regular),
  tipos de IVA restringidos a los vigentes, numeros positivos, longitudes
  maximas, formato de email, saneado de caracteres de control.
- **Anti-inyeccion de formulas en CSV** (CSV injection / "=cmd|..."): los
  campos de texto exportados se sanean anteponiendo una comilla cuando
  empiezan por `= + - @` o tabulador/retorno de carro; los importes
  numericos (calculados por el propio servidor) se exportan sin esa
  heuristica para no anteponer comillas superfluas a importes negativos
  legitimos de facturas rectificativas.
- **Sin secretos en el repositorio**: `SESSION_SECRET` se exige por entorno
  (con longitud minima) y no tiene valor por defecto; `.env.local` esta en
  `.gitignore`; `.env.example` solo contiene un placeholder.
- **Cabeceras de seguridad basicas**: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` restrictiva, y `X-Powered-By` desactivado.
- **Mensajes de error controlados**: los errores de validacion devuelven su
  mensaje (util para el usuario), pero cualquier error inesperado devuelve
  un mensaje generico al cliente y el detalle solo se registra en el
  servidor (`console.error`), para no filtrar informacion interna.

### Hallazgo real de la revision: dependencias con avisos de seguridad

`npm audit` senala varios avisos (algunos criticos/altos) en Next.js y en
dependencias transitivas de las herramientas de desarrollo (`esbuild`
usado por `vitest`/`tsx`, y una copia interna de `postcss` que Next.js
empaqueta y que no se puede fijar desde este proyecto). Se ha actuado asi:

- Se subio `next` de `14.2.5` a `14.2.35` (ultima version de la rama 14,
  con numerosos parches de seguridad) y se fijaron versiones recientes de
  `postcss`, `vitest` y `tsx`.
- Tras eso, `npm audit` **sigue mostrando avisos** asociados a Next.js
  (varios relacionados con el optimizador de imagenes, middleware/i18n,
  Server Actions, servidores personalizados y "edge runtime"). Se ha
  comprobado que **esta aplicacion no usa ninguna de esas superficies**:
  no hay `next/image`, no hay `middleware.ts`, no hay configuracion `i18n`,
  no hay Server Actions (`"use server"`, se usan Route Handlers normales) y
  no hay servidor personalizado. El riesgo residual real para una app que
  **solo corre en local y no esta expuesta a internet** es bajo, pero es un
  riesgo real y no se declara "cero vulnerabilidades" porque no lo es.
- **Para produccion**: antes de exponer esto a internet habria que evaluar
  migrar a Next.js 15/16 (requiere React 19 y adaptar los `params` de las
  rutas dinamicas, que en Next 15+ pasan a ser asincronos) y volver a
  ejecutar `npm audit` hasta que quede limpio.

No se ha ejecutado ningun escaner de seguridad automatizado externo (tipo
SAST/DAST de terceros) por tratarse de una demo sin conexion a internet;
la revision de este apartado es una revision manual de codigo y de
`npm audit`, real y verificable ejecutando los mismos comandos.

---

## 5. Limitaciones explicitas: que NO vale para produccion real

Esto es una demo tecnica, no un producto certificado. Antes de usar algo
similar en produccion con clientes reales haria falta, como minimo:

1. **Conexion real con la AEAT**: esta app no envia nada a Hacienda. El envio
   real de los "registros de facturacion" (SIF) requiere darse de alta en
   el sistema Verifactu, usar el formato y esquema XML oficial de la AEAT
   (no el JSON simplificado de este proyecto) y gestionar sus respuestas.
2. **Certificado digital / firma electronica**: la comunicacion real con la
   AEAT exige autenticarse con certificado digital o Cl@ve, algo que esta
   app no implementa ni simula mas alla de un login con email/contrasena.
3. **Algoritmo de huella oficial**: el hash implementado aqui (SHA-256 sobre
   una concatenacion de campos propia) esta *inspirado* en el concepto de
   encadenamiento de Verifactu, pero **no reproduce el formato/algoritmo
   exacto certificado por la AEAT**. Un sistema homologado tendria que
   implementar la especificacion oficial al detalle.
4. **QR normativo real**: el QR generado aqui apunta a una URL de demo local
   (`verifactu-demo.local`), no al validador real de la AEAT.
5. **Homologacion/certificacion del software**: Verifactu exige que el
   software de facturacion cumpla requisitos especificos y se declare
   responsable mediante una declaracion responsable; nada de eso aplica a
   este proyecto.
6. **Multiusuario/multinegocio a escala**: el modelo de datos ya separa por
   `business_id` y esta pensado para poder extenderse, pero no hay gestion
   de roles/permisos mas alla de "usuario autenticado del negocio", ni
   flujo de alta de nuevos negocios/usuarios desde la UI (se crean con
   `npm run seed` o directamente en la base de datos).
7. **Base de datos**: SQLite embebido es perfecto para una demo local de un
   unico proceso; una operacion real con varios negocios y trafico
   concurrente necesitaria un motor de base de datos gestionado (Postgres,
   MySQL) y backups periodicos, cosa que aqui no existe.
8. **Rate limiting**: el limitador de intentos de login es en memoria y por
   proceso (se reinicia al reiniciar el servidor, y no protege un
   despliegue con varias instancias). En produccion haria falta un
   limitador distribuido (Redis, etc.) y limitar tambien por IP.
9. **`node:sqlite` es experimental**: Node.js todavia lo marca como
   experimental y advierte que su API puede cambiar. Es perfectamente
   utilizable para esta demo, pero conviene revisar su estado antes de
   depender de el en produccion, o migrar a un driver SQLite/Postgres
   estable.
10. **Dependencias con avisos de seguridad pendientes**: ver seccion 4.
11. **Sin copia de seguridad ni exportacion completa de la base de datos**:
    solo se exportan facturas individuales o el historico en CSV, no un
    volcado completo apto para migracion o recuperacion ante desastres.

---

## 6. Para continuar el desarrollo

Ideas de siguientes pasos, por prioridad si esto fuera a evolucionar:

1. Migrar a Next.js 15/16 + React 19 para cerrar los avisos de `npm audit`
   pendientes en Next.js (requiere adaptar los `params` asincronos de las
   rutas dinamicas del App Router).
2. Sustituir el limitador de fuerza bruta en memoria por uno persistente.
3. Anadir gestion de roles (ej. "administrador" vs "solo consulta") y una
   pantalla de alta de negocios/usuarios en la propia UI.
4. Sustituir el QR y el JSON de exportacion simulados por la integracion
   real con el esquema oficial de Verifactu cuando se decida certificar el
   software.
5. Anadir un export completo de la base de datos (backup/restore).
