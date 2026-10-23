# Propuesta de modelo de negocio

Pensado para el mercado español (inmobiliarias independientes y pequeñas redes de 1 a 15 comerciales). **Precios sin IVA.** Son una propuesta de partida para validar con los primeros clientes; antes de fijarlos, compara con las tarifas actuales de la competencia (Matterport, Nodalview, Kuula, CloudPano, y los tours que ofrecen los propios portales).

## Propuesta de valor

1. **Más contactos de calidad**: el comprador que ya ha recorrido el piso llega a la visita presencial casi decidido. Menos visitas inútiles para el comercial.
2. **Captación de exclusivas**: «Tu piso tendrá visita virtual y te enviaré cada mes cuántas personas la han visto» es un argumento fuerte ante el propietario.
3. **Sin hardware caro ni curva de aprendizaje**: funciona con fotos del móvil o con cualquier cámara 360° de consumo, y se publica en minutos.
4. **Marca de la agencia**, no la nuestra, y contacto directo por WhatsApp dentro del recorrido.

## Tres formas de pagar

### 1. Por vivienda (sin compromiso)

Para agencias que quieren probar o que publican pocas viviendas.

| Plan | Precio | Incluye |
|---|---|---|
| **Vivienda** | **29 €** por vivienda | Recorrido activo 6 meses, estancias ilimitadas, hotspots, plano, marca blanca, WhatsApp y estadísticas |
| Renovación | 9 € / 6 meses | Para viviendas que tardan en venderse |
| Vivienda «hecha por nosotros» | 59 € | Las fotos las pone la agencia; nosotros montamos hotspots, plano y textos en 24 h |

### 2. Suscripción mensual por inmobiliaria (recomendado)

Ingresos recurrentes; el objetivo es que cada cliente acabe aquí.

| Plan | Precio/mes | Viviendas activas | Para quién | Extras |
|---|---|---|---|---|
| **Básico** | **39 €** | 5 | Agente independiente | Todo lo del plan por vivienda |
| **Profesional** | **89 €** | 25 | Agencia de 2–6 comerciales | Exportación de leads, informe mensual al propietario, soporte prioritario |
| **Agencia** | **179 €** | 80 | Agencia grande o pequeña red | Varios usuarios, dominio propio (`tours.tuagencia.com`), integración con CRM |
| **Red / franquicia** | a medida | ilimitadas | Franquicias | Multimarca, facturación centralizada, acuerdo de nivel de servicio |

- **Pago anual: 2 meses gratis** (390 € / 890 € / 1 790 €).
- **Prueba de 14 días** con 2 viviendas, sin tarjeta.
- Una vivienda vendida se archiva y deja libre su hueco.
- Extras: **home staging con IA** 4,90 € por foto (o paquetes de 20 por 69 €) y **traducción a 5 idiomas** a 9 €/vivienda, en cuanto estén disponibles (fase 2 de la hoja de ruta).

### 3. Paquete con fotografía 360° incluida

Para agencias sin tiempo ni cámara. Lo hace un fotógrafo propio o colaborador con una cámara 360° de consumo y trípode.

| Paquete | Precio | Incluye |
|---|---|---|
| **Esencial** (hasta 90 m²) | **149 €** | Sesión 360° de todas las estancias, 10 fotos normales retocadas, recorrido montado con hotspots, plano esquemático, 6 meses de alojamiento |
| **Completo** (hasta 150 m²) | **199 €** | Lo anterior + vídeo vertical para redes (Reels/TikTok) generado desde el recorrido |
| **Premium** (> 150 m², chalets) | desde **279 €** | Lo anterior + exteriores, jardín y foto aérea con dron (si la normativa lo permite) |
| Desplazamiento | 0,30 €/km a partir de 25 km | |

**Descuento para suscriptores**: −20 % en cualquier paquete con fotografía.

## Números de referencia

### Costes variables

| Concepto | Coste estimado |
|---|---|
| Alojamiento por vivienda (fotos + base de datos + tráfico) | **≈ 0 €** dentro de la capa gratuita de Cloudflare (≈ 3 000 viviendas y ≈ 7 000 visitas/día). Al escalar: 5 $/mes de Workers + ≈ 0,015 $/GB al mes en R2 → céntimos por vivienda |
| Fotógrafo (≈ 1 h en la vivienda + 30 min de edición) | 35–50 € por sesión (colaborador autónomo) |
| Cámara 360° de consumo + trípode | 400–700 € una sola vez (amortizada en ~15 sesiones) |
| Pasarela de pago | ≈ 1,5 % + 0,25 € por cobro (tarjetas europeas) |
| Home staging con IA (API externa) | 0,05–0,30 € por imagen |

### Márgenes aproximados

| Producto | Precio | Coste directo | Margen bruto |
|---|---|---|---|
| Vivienda suelta | 29 € | < 1 € | ~97 % |
| Suscripción Profesional | 89 €/mes | < 3 €/mes | ~96 % |
| Paquete Esencial con fotografía | 149 € | 45–60 € | ~60–70 % |

### Escenario a 12 meses (ilustrativo)

| Concepto | Cantidad | Ingreso mensual |
|---|---|---|
| Suscripciones Básico | 15 × 39 € | 585 € |
| Suscripciones Profesional | 12 × 89 € | 1 068 € |
| Suscripciones Agencia | 3 × 179 € | 537 € |
| Viviendas sueltas | 20 × 29 € | 580 € |
| Paquetes con fotografía | 12 × 160 € (media) | 1 920 € |
| **Total** | | **≈ 4 690 €/mes** |

Con 30 agencias suscritas los ingresos recurrentes (≈ 2 200 €/mes) ya cubren de sobra la infraestructura y las herramientas, y la fotografía aporta caja y es la puerta de entrada para convertir a la agencia en suscriptora.

## Estrategia de captación

1. **Primeros 10 clientes a mano**: visitar agencias de la zona con la demo en el móvil y ofrecer **3 viviendas gratis** a cambio de un testimonio y acceso a sus estadísticas.
2. **El propio recorrido es el anuncio**: pie discreto «Visita virtual creada con …» en los planes sin marca blanca completa (opcional para la agencia).
3. **Informe mensual al propietario** con la marca de la agencia: la agencia lo usa para captar exclusivas y eso la ata a la suscripción.
4. **Alianzas**: fotógrafos inmobiliarios (comisión del 20 % por cada agencia que traigan), colegios y asociaciones de agentes (API, AICAT…) y CRMs inmobiliarios.
5. **Contenido**: casos reales con datos propios de las estadísticas («X % más de contactos en pisos con visita virtual») en cuanto los haya.

## Indicadores a vigilar

- Activación: % de agencias en prueba que publican al menos 1 recorrido en 7 días.
- Conversión de prueba a pago (objetivo > 25 %).
- Viviendas publicadas por agencia y mes.
- Contactos por cada 100 visitas virtuales (el dato que convence a la agencia).
- Bajas mensuales (objetivo < 3 %).
