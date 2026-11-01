# 3. Plan para conseguir el primer cliente (7 días)

**Objetivo de la semana:** 15 conversaciones con quien decide y **1 pack de 39 € entregado y cobrado**.
**Coste:** 0 €. Necesitas un ordenador con Chrome o Edge, un móvil con WhatsApp y transporte a pie o en transporte público por tu zona.

---

## Día 0 · Preparación (1–2 h)

1. **Abre el generador** (`kit-inmuebles/generador.html`) en Chrome o Edge. Si arriba pone «Navegador compatible: vídeo MP4 rápido», todo está listo.
2. **Practica con la demo:** carga las fotos de `muestras/fotos-demo/` y genera un Reel. Cronométrate: ese es tu tiempo real por kit.
3. **WhatsApp Business** (gratis): instálalo con tu número, ponle nombre comercial (por ejemplo «[Tu nombre] · Vídeos para inmobiliarias») y crea en el catálogo el *Pack de arranque 39 €*, el *Kit 19 €* y el *Plan Cartera 99 €/mes*. Guarda los mensajes de `05-mensajes-whatsapp.md` como respuestas rápidas.
4. **Hoja de precios:** abre `hoja-de-precios.html`, escribe tu nombre, WhatsApp y zona encima de los textos de ejemplo e imprime 15 copias (o guárdala en PDF para enseñarla en el móvil si no puedes imprimir gratis).
5. **Decide cómo vas a cobrar y facturar.** Lee `06-legal-y-cobro.md` **antes del primer cobro**: es la única decisión de esta semana que no puedo tomar por ti.

## Día 1 · Lista de 30 agencias (1,5 h)

Rellena `prospectos.csv` (se abre con Excel, Google Sheets o LibreOffice).

**Dónde buscar:**

- Google Maps: busca «inmobiliaria» y recorre tu barrio y los barrios de al lado.
- El directorio de profesionales de idealista y Fotocasa de tu ciudad: ahí se ve cuántos inmuebles anuncia cada agencia.
- El perfil de Instagram de cada agencia.

**Prioridad A (visítalas primero):**

- Agencia independiente o pequeña red local (no una gran franquicia con marketing central).
- Entre 15 y 150 inmuebles anunciados.
- En Instagram publica fotos fijas, no publica o lleva más de un mes sin Reels.
- Tiene oficina a pie de calle a menos de 30 min de ti.

**Prioridad C (descártalas):** ya publican Reels profesionales cada semana, o no tienen oficina física.

## Día 2 · 10 muestras (2–2,5 h; unos 12 min cada una)

Por cada agencia A:

1. Elige un inmueble suyo **reciente y con buenas fotos** en su web o en el portal.
2. Guarda 6–10 fotos: en el ordenador, clic derecho → «Guardar imagen como…»; en el móvil, mantén pulsado sobre la foto. **Solo para preparar la muestra privada: no publiques nunca la muestra.**
3. Crea en el generador su **perfil de agencia** con el logo de su web (clic derecho → guardar), su color y su teléfono, y pulsa «Guardar perfil».
4. Rellena los datos del anuncio, marca **«Muestra con marca de agua»** y escribe en el texto de la marca tu nombre y tu WhatsApp. Elige calidad **«Ligera 720p»**.
5. Genera el **Reel MP4** (y el carrusel si te sobra tiempo). Guárdalo en el móvil en un álbum llamado «Muestras» con el nombre de la agencia.
6. Anota en `prospectos.csv`: `muestra_hecha = sí` y la referencia del inmueble.

## Días 3 y 4 · Visitas (3 h cada día, 5–8 agencias al día)

- **Horario:** de 10:00 a 13:30 entre martes y jueves. Evita los lunes a primera hora y los viernes por la tarde (es lo habitual en comercios, no un dato medido).
- **Ruta:** agrupa las agencias por calles cercanas.
- **Qué llevar:** el móvil con las muestras y el brillo al máximo, hojas de precios y auriculares por si te piden escucharlo (el vídeo no lleva sonido).
- **Guion:** sigue `04-guion-visita-y-objeciones.md`. Lo esencial:
  1. Pregunta por quien decide (dueño o gerente). Si no está, pregunta cuándo vuelve, deja la hoja y vuelve ese día.
  2. **Enseña la muestra en los primeros 20 segundos.** Su piso, su logo.
  3. Ofrece el pack de 39 € que se paga al recibirlo y pide **dos referencias más** para completarlo.
  4. Pide su WhatsApp para enviarle la muestra. Desde ese momento puedes escribirle legalmente: te lo ha pedido.
- **Después de cada visita**, apunta en `prospectos.csv` el resultado, la objeción principal y la próxima acción con fecha.

## Día 5 · Entregar y hacer seguimiento

- **Pedidos:** entrega en menos de 24 h (ver el proceso en `02-oferta-y-precios.md`). La velocidad es parte del producto.
- **Interesados sin pedido:** mensaje de seguimiento por WhatsApp, solo a quien te dio su número.
- **No estaba quien decide:** vuelve en el horario que te dijeron.

## Días 6 y 7 · Cobrar y repetir

- Cobra con el mensaje de entrega (Bizum o transferencia).
- Después del cobro, pide **testimonio, permiso para usar el kit en tu portfolio y un referido**.
- Prepara 10 muestras más y repite los días 2 a 5 en la zona siguiente.

---

## Embudo e indicadores

| Paso | Meta semanal | Cómo se mide en `prospectos.csv` |
|---|---|---|
| Agencias en lista (A) | 30 | filas con `prioridad = A` |
| Muestras hechas | 10–15 | `muestra_hecha = sí` |
| Conversaciones con quien decide | 15 | `estado = conversacion` o posterior |
| Pedidos (pack) | 1–3 *(estimación, no un dato)* | `estado = pedido` |
| Cobrados | ≥ 1 | `estado = cobrado` e `importe_eur` |

**Reglas de decisión:**

- Si tras 15 conversaciones con quien decide no hay ningún pedido, aplica el pivote de `01-decision-y-evidencia.md`.
- Si hay pedidos pero no repiten en 30 días, el problema es el valor: pregunta por qué.
- Si repiten, sube el precio del kit suelto a 25 € para los clientes nuevos.

## Canales legales para llegar a las agencias

| Canal | Uso | Por qué |
|---|---|---|
| **Visita en persona** | Principal | Legal, es el que mejor convierte con una muestra y las agencias tienen escaparate a la calle |
| Llamada al fijo de la agencia | Secundario, solo para pedir una cita de 5 min | Zona gris legal (art. 66 de la Ley General de Telecomunicaciones; ver `06-legal-y-cobro.md`). Si te dicen que no, no vuelvas a llamar |
| WhatsApp o email **después** de que te den su contacto | Seguimiento | Legal porque lo han pedido |
| Tu propio Instagram con la demo | Credibilidad (para que te busquen después de la visita) | Publicar en tu cuenta no es comunicación no solicitada |
| Fiverr y Workana | Secundario, ingresos de fuera de tu zona | Ver `07-canales-secundarios.md` |
| ~~Emails o mensajes directos en frío~~ | **No** | Art. 21 LSSI: hace falta consentimiento previo, también con empresas |
