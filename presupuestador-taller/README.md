# Presupuestador de reparaciones — demo para talleres mecánicos

Configurador web (mobile-first) para que el cliente de un taller mecánico
calcule al instante un presupuesto orientativo, lo descargue en PDF y lo
envíe por WhatsApp. Pensado como **demo personalizable** para prospección
comercial: se genera una variante por taller editando un único archivo de
configuración.

Proyecto independiente — no depende de ningún otro directorio de este
repositorio.

## Flujo

Landing → tipo de vehículo → categoría de servicio → servicio concreto →
precio estimado → datos de contacto → resumen (PDF + WhatsApp).

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS (SPA, sin backend
  de renderizado — build estático)
- **PDF**: generado en el navegador con [jsPDF](https://github.com/parallax/jsPDF)
- **Leads**: Cloudflare Pages Function (`functions/api/leads.ts`) que
  guarda cada presupuesto generado en **Cloudflare D1**
- **Despliegue**: Cloudflare Pages

## Personalizar para un taller (variante por prospecto)

Todo lo que cambia entre talleres vive en **un único archivo**:

```
src/config/taller.config.ts
```

Edita ahí:

- `nombre`, `eslogan`, `direccion`
- `logoUrl` (coloca el logo en `public/` y apunta a `/tu-logo.png`)
- `colorPrimario` / `colorPrimarioOscuro`
- `telefonoWhatsapp` (formato internacional sin `+`, ej. `346XXXXXXXX`)
- `tiposVehiculo` y `categorias` (catálogo completo de servicios y precios)

No hace falta tocar ningún otro archivo. Duplica esta carpeta del proyecto
(o crea un branch/proyecto de Cloudflare Pages nuevo) por cada prospecto,
edita el config y despliega.

## Desarrollo local

```bash
npm install
npm run dev
```

Sin `wrangler pages dev` corriendo, la llamada a `/api/leads` fallará en
silencio (se captura el error) — el flujo de presupuesto y PDF funciona
igualmente, solo no persiste el lead.

Para probar también el guardado de leads en local con D1:

```bash
npm run build
wrangler d1 execute presupuestador-taller-db --local --file=./schema.sql
npm run pages:dev
```

## Desplegar en Cloudflare Pages

1. Crea la base de datos D1 (una vez):

   ```bash
   wrangler d1 create presupuestador-taller-db
   ```

   Copia el `database_id` que devuelve y pégalo en `wrangler.toml`.

2. Aplica el esquema:

   ```bash
   wrangler d1 execute presupuestador-taller-db --remote --file=./schema.sql
   ```

3. Build y deploy:

   ```bash
   npm run deploy
   ```

   (equivale a `npm run build && wrangler pages deploy dist`)

4. En el dashboard de Cloudflare Pages, en **Settings → Functions →
   D1 database bindings**, enlaza el binding `DB` a la base de datos creada
   (si no quedó ya enlazado por el `wrangler.toml`).

## Consultar los leads guardados

MVP sin interfaz visual. Dos formas rápidas de consultarlos:

```bash
# Todos los leads, directamente desde D1
wrangler d1 execute presupuestador-taller-db --remote \
  --command="SELECT * FROM leads ORDER BY creado_en DESC"

# O vía la API desplegada (devuelve JSON)
curl https://tu-proyecto.pages.dev/api/leads
```

## Estructura del proyecto

```
presupuestador-taller/
├── functions/api/leads.ts    # Pages Function: guarda/lista leads en D1
├── schema.sql                 # Esquema de la tabla `leads`
├── wrangler.toml               # Config de Cloudflare Pages + binding D1
├── src/
│   ├── config/taller.config.ts # ← ÚNICO archivo a editar por prospecto
│   ├── components/              # Pasos del wizard + pantallas
│   ├── lib/                     # PDF, WhatsApp, formato, API de leads
│   ├── types.ts
│   ├── App.tsx                  # Máquina de estados del flujo
│   └── main.tsx
└── public/                      # Logo y favicon (sustituibles por taller)
```

## Fuera de alcance en esta versión

Panel de administración, login, envío automático de email/WhatsApp,
pasarela de pago, multi-idioma e integración con ERPs del taller.
