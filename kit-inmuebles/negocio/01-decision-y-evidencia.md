# 1. Decisión y evidencia

**Oportunidad elegida:** servicio «hecho por ti» para inmobiliarias independientes: a partir de las fotos que ya tienen en su anuncio, les entrego en 24 h un **kit de redes por inmueble** (Reel 9:16, vídeo 16:9, carrusel 4:5, story y texto de publicación) con su logo, colores y contacto. Lo produzco en minutos con el generador de este repositorio, que funciona en el navegador y no cuesta nada.

La venta se hace **cara a cara**, con una muestra ya hecha con un piso real de la propia agencia (marca de agua «MUESTRA»). La agencia ve su piso convertido en vídeo antes de que le pida nada.

## Por qué esta y no otra

Comparé las opciones con los criterios del encargo: rapidez hasta el primer cobro, evidencia de demanda, facilidad para encontrar compradores, coste cero, margen por hora y posibilidad de escalar.

| Opción | Primer cobro | Evidencia de demanda | Encontrar compradores | 0 € | Veredicto |
|---|---|---|---|---|---|
| **Kit de redes por inmueble (elegida)** | Días: ticket de 19–39 €, decisión en la misma visita | Competidores de pago que cobran ~12–20 $/vídeo y encargos en Fiverr y Workana (ver abajo) | ~60 000 empresas inmobiliarias en España, con escaparate a pie de calle en casi cualquier barrio | Sí (generador propio, sin servidor) | **Elegida** |
| Vender el simulador de visitas virtuales 360° que ya hay en el repo | Semanas | Débil: idealista ofrece gratis a las agencias su propio creador de tours 360° | Fácil | Requiere cámara 360° (400–700 €) para el valor real | Descartada como apuesta principal; queda como venta adicional futura |
| Webs para pequeños negocios sin web | 2–4 semanas: ticket de 150–400 € y decisión más lenta | Hay demanda, pero el mercado está saturado (Wix, Kit Digital, agencias) | Fácil | Sí | Segunda opción si esta falla |
| Productos digitales (plantillas, guías) | Incierto: sin audiencia no hay ventas | No verificable sin audiencia | Difícil | Sí | Descartada |
| Freelance genérico (Upwork/Fiverr) | Lento para cuentas nuevas | Sí, pero con mucha competencia | Compites por precio con todo el mundo | Upwork ya cobra por enviar propuestas | Solo como canal secundario |
| Envíos masivos de email a empresas | — | — | — | — | **Ilegal en España** sin consentimiento previo (art. 21 LSSI), también entre empresas |

**Por qué gana:** es lo único que junta las cuatro cosas: una muestra personalizada que no cuesta nada fabricar, un precio que se decide en la misma visita, una necesidad que se repite con cada piso nuevo (ingreso recurrente) y compradores a pie de calle.

## Hechos comprobados (con fuente)

| Hecho | Fuente |
|---|---|
| AutoReel, una herramienta de pago que convierte fotos de anuncios en vídeos, cobra **59 $/mes por 3 vídeos (~20 $/vídeo)**, 139 $/mes por 10 y 249 $/mes por 20. Su plan gratuito pone marca de agua, va a 720p y limita los vídeos a 15 s | [Centro de ayuda de AutoReel](https://intercom.help/autoreel/en/articles/10756164-how-does-autoreel-pricing-work), [FAQ de AutoReel](https://www.autoreelapp.com/faq/listing-video-maker/what-is-the-cost-per-listing-video-on-autoreels-different-plan-tiers) |
| Hay más herramientas de pago para lo mismo: Reeltors.ai (desde 49,99 $), HeyGen (desde 24–29 $/mes), Reel Estate y Reel-E | [Capterra: Reeltors.ai](https://www.capterra.com.au/software/1100335/Reeltors-ai), [HeyGen](https://www.heygen.com/blog/best-real-estate-reel-instagram-video-makers), [Trustpilot: Reel Estate](https://es.trustpilot.com/review/tryreelestate.com) |
| En Fiverr se venden vídeos inmobiliarios hechos con fotos entre <50 $ y 200–400 $; el anuncio con más reseñas que encontré tenía 43, con 5,0 de media | [Fiverr (ejemplo)](https://fiverr.com/video_kit/make-a-real-estate-listing-video), [Fiverr (ejemplo)](https://fiverr.com/saadabdeenbcs/make-hq-real-estate-listing-video) |
| En Workana hay encargos en español para editar reels inmobiliarios, incluidos de 2026 y con prueba pagada | [Workana](https://www.workana.com/es/job/editor-de-videos-profesional-para-reels-inmobiliarios-dinamicos-y-de-alto-impacto), [Workana](https://www.workana.com/es/job/se-busca-editor-de-video-freelance-contenido-inmobiliario) |
| En enero de 2025 había **60 683 empresas** de actividades inmobiliarias por cuenta de terceros en España (+4,2 % en un año), y el sector facturó 9 400 M€ en 2025 | [DBK vía idealista](https://www.idealista.com/news/node/900100), [DBK](https://www.dbk.es/en/detalle-nota/consultoras-agencias-inmobiliarias-2026) |
| En el 1.er semestre de 2025 se crearon 10 637 agencias nuevas (+19,9 %), y una agencia nueva necesita marketing | [Vivara](https://www.vivara.io/blog/operaciones/boom-inmobiliarias-2025-oportunidad/) (blog comercial: tómalo con cautela) |
| idealista ofrece gratis a las agencias su creador de tours 360° (Virtual Tour Creator), por lo que un tour 360° de pago es difícil de vender | [idealista](https://www.idealista.it/es/news/node/179077) |
| Un fotógrafo inmobiliario cuesta de media unos 179 € por sesión (dato de Donostia; sirve de referencia de precios) | [Cronoshare](https://www.cronoshare.com/servicios/fotografo-inmobiliario/guipuzcoa/donostia-san-sebastian) |
| La AEPD considera que el email comercial no solicitado, también entre empresas, necesita consentimiento previo (art. 21 LSSI) | [AEPD](https://www.aepd.es/documento/a-00081-2015.pdf), [Fieldfisher](https://www.fieldfisher.com/es-es/locations/spain/insights/bases-datos-empresariales) |
| El generador funciona: produce MP4 H.264 de 1080×1920 y 1920×1080 que ffmpeg decodifica sin errores, en unos 20 s cada uno, más carrusel, story, texto y ZIP | Prueba automática `scripts/test-e2e.mjs` (ver README) |

## Hipótesis (sin comprobar todavía)

1. **Las inmobiliarias independientes españolas pagarán 19–39 € por kit.** La demanda comprobada es sobre todo estadounidense y de herramientas de autoservicio. En España no encontré tarifas públicas de vídeo hecho con fotos. **Es la hipótesis principal y se valida con las primeras 15 visitas.**
2. Una muestra hecha con un piso de la propia agencia convierte mucho mejor que un portfolio genérico. Es razonable, pero aún no hay datos propios.
3. Producir un kit lleva 10–15 minutos (descargar fotos, rellenar datos, generar). Hay que medirlo con los primeros encargos.
4. Muchas agencias pequeñas publican en Instagram fotos fijas o nada, y no Reels. Compruébalo en su perfil antes de cada visita.
5. El cliente repite: cada piso nuevo es un kit nuevo. Se valida con el segundo pedido.

## Resultados pendientes

- 0 clientes, 0 € cobrados y 0 visitas hechas. **Todavía no hay validación comercial**: solo evidencia indirecta de que este tipo de producto se paga en otros mercados.
- Lo que falta medir está en `03-plan-primer-cliente.md`: visitas, conversaciones con quien decide, «sí» y cobros.

## Criterio para abandonar o pivotar

Si tras **15 conversaciones con quien decide** (dueño o gerente), mostrando una muestra de su propio piso, nadie acepta el pack de 3 kits por 39 €:

- Si la objeción dominante es el precio, prueba **«el primero gratis, el resto a 15 €»** durante una semana más.
- Si es «no usamos redes», pivota al mismo canal y los mismos contactos con otro producto: **mejora de fotos y vídeo para el portal**, o **webs para negocios**, con el mismo método de muestra hecha antes de la visita.
- Si nadie recibe la visita, cambia de zona o de horario antes de cambiar de producto.
