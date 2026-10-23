# Mejoras para versiones futuras

Ordenadas por fases. Cada mejora indica el valor para la inmobiliaria y el enfoque técnico propuesto. El esfuerzo es orientativo para una persona desarrolladora a tiempo completo.

## Fase 1 · Consolidar el MVP (1–2 meses)

| Mejora | Valor | Enfoque técnico | Esfuerzo |
|---|---|---|---|
| **Varios idiomas** (ES, EN, FR, DE, CA…) | Compradores extranjeros: un mercado clave en costa e islas | Diccionarios JSON en `public/tour/i18n/`; idioma por `navigator.language` o `?lang=`; campos traducibles (`title_en`, `features_en`) o tabla `translations`. Traducción automática opcional con un LLM desde el panel | 1–2 semanas |
| **Varios usuarios por inmobiliaria** con roles (gestor, fotógrafo, solo lectura) | Agencias con varias oficinas o comerciales | Tabla `users` (agency_id, role), invitaciones por email | 1 semana |
| **Notificación de leads** por email y WhatsApp | El comercial responde en minutos, no en días | Email con Cloudflare Email Workers o Resend; webhook a CRM | 3–5 días |
| **Integración con CRM** (Inmovilla, Witei, Sooprema, HubSpot) | Evita copiar leads a mano | Webhooks salientes y exportación de feeds | 1–2 semanas |
| **Límite de intentos de login** y verificación en 2 pasos | Seguridad | Regla de rate limiting de Cloudflare + TOTP | 3 días |
| **Pago online** de viviendas y suscripciones | Autoservicio sin intervención del administrador | Stripe Checkout + webhooks que activan cuotas | 1–2 semanas |
| **Panoramas multirresolución** (teselas) | Fotos 8K–12K nítidas incluso con mucho zoom | Generar cubemap por niveles en el navegador o en un Worker con WASM; Pannellum ya admite el formato `multires` | 1–2 semanas |
| **Hotspots arrastrables** y vista previa del destino al pasar el ratón | Edición más rápida, recorrido más claro | Mejora del editor actual | 3–5 días |

## Fase 2 · Diferenciación con IA (2–4 meses)

| Mejora | Valor | Enfoque técnico |
|---|---|---|
| **Home staging virtual con IA** | Amueblar pisos vacíos o «desamueblar» pisos con muebles viejos; las viviendas amuebladas virtualmente suelen generar más interés en los portales | Modelos de difusión con *inpainting* y control de geometría (ControlNet de profundidad/bordes) vía API (Replicate, Stability, fal.ai). Para 360°: proyectar a cubemap, procesar cada cara y recomponer. Mostrar un conmutador «Original / Amueblado» y la marca obligatoria «Imagen recreada virtualmente» |
| **Clasificación automática de estancias** | Al subir 30 fotos, se nombran y ordenan solas (cocina, baño, dormitorio…) | Modelo de visión (CLIP o un LLM multimodal) sobre la miniatura |
| **Hotspots automáticos** | Detectar puertas y sugerir enlaces entre estancias | Detección de objetos (puertas, pasillos) + coincidencia de rasgos entre fotos para emparejarlas |
| **Mejora automática de fotos** | Corrección HDR, enderezado de verticales, cielos azules en ventanas | Pipeline de procesado en el navegador (WebGPU) o servicio externo |
| **Descripción del anuncio generada** | Texto para el portal en varios idiomas a partir de las fotos y los datos | LLM multimodal con las fotos y las calidades indicadas |
| **Asistente en el recorrido** | Responde dudas del visitante 24 h (gastos de comunidad, colegios cercanos) y capta el lead | Chat con LLM y la ficha de la vivienda como contexto, con traspaso a WhatsApp |

## Fase 3 · Medición y 3D (4–8 meses)

| Mejora | Valor | Enfoque técnico |
|---|---|---|
| **Medición de estancias** | El comprador mide una pared o el hueco del sofá desde casa | Con 360° y altura de cámara conocida (trípode a 1,5 m), la distancia al punto del suelo se calcula con trigonometría a partir del *pitch*: `d = h / tan(-pitch)`. Herramienta «regla» en el visor. Precisión mayor con estimación de profundidad monocular (Depth Anything, MiDaS) |
| **Plano automático** | Plano a escala sin dibujarlo | Estimación del contorno de la estancia en 360° (modelos tipo HorizonNet / LGT-Net) y unión de estancias por los hotspots |
| **Reconstrucción 3D / vista maqueta** | Vista «casa de muñecas» como Matterport | Fase A: maqueta extruida desde el plano con Three.js y las fotos proyectadas. Fase B: *Gaussian Splatting* a partir de un vídeo recorriendo la vivienda (procesado en GPU en la nube y visor web con WebGL/WebGPU) |
| **Transiciones con profundidad** | Sensación de «caminar» entre estancias en lugar de un fundido | Mapas de profundidad por panorámica y animación de cámara hacia el hotspot antes del cambio |
| **Visitas guiadas en directo** | El comercial enseña la vivienda por videollamada sincronizada | WebRTC + sincronización de vista mediante Durable Objects |
| **Realidad virtual** | Visitas con gafas VR en la oficina | WebXR (Three.js) sobre las mismas panorámicas |

## Fase 4 · Producto y negocio

- **Analítica avanzada**: mapa de calor de hacia dónde mira el visitante en cada 360°, embudo visita → contacto, comparativa entre viviendas, informe mensual en PDF para el propietario («tu piso ha tenido 340 visitas virtuales»), lo que ayuda a captar exclusivas.
- **Marca blanca completa**: dominio propio por inmobiliaria (`tours.inmobiliaria.com`) con Cloudflare for SaaS.
- **Portal de propietarios**: enlace privado para que el propietario vea estadísticas.
- **Galerías y comparador**: varias viviendas de la agencia en una misma página insertable.
- **App de captura** (PWA): guía al fotógrafo estancia por estancia y sube directamente con la cámara 360° conectada por wifi.
- **Accesibilidad**: navegación completa por teclado, descripciones de estancias para lectores de pantalla y modo de bajo movimiento (sin Ken Burns).
