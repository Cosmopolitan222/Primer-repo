# CumpleWeb: revisión y corrección de cookies y textos legales para tiendas online

**El negocio en una frase:** analizo gratis una tienda online española con un navegador real. Le enseño, con pruebas, qué cookies de rastreo instala **antes** de pedir permiso y qué le falta en sus textos legales. Después le cobro **190 €** por dejarlo resuelto, **49 €** por el informe completo o **15 €/mes** por vigilarlo.

Coste: 0 €. Todo funciona en tu ordenador con herramientas gratuitas.

---

## 1. Por qué este negocio (y no otros)

| Criterio | Evidencia | Estado |
|---|---|---|
| Obligación legal que afecta a **todas** las tiendas, sin exención por tamaño | LSSI art. 22.2 + Guía de cookies de la AEPD (jul. 2023): consentimiento previo y «Rechazar» en la primera capa | Verificado (norma pública) |
| Hay sanciones reales a pequeños comercios | AEPD: 30.000 € a un pequeño ecommerce de moda (2021), 3.000 € por cookies sin consentimiento y 90.000 € al titular de 3 dominios ([Lawwwing](https://lawwwing.com/las-sanciones-por-no-cumplir-con-la-normativa-de-cookies-en-espana/)) | Verificado en fuente secundaria; conviene confirmarlo en aepd.es |
| Ya se paga por resolver esto | Existe un mercado de CMP de pago (Cookiebot, Usercentrics, iubenda), servicios «adaptación RGPD» de gestorías y SaaS como Lawwwing o Legiscope | Verificado (el mercado existe) |
| Presión nueva en accesibilidad | Ley 11/2023 aplicable a ecommerce desde el 28/06/2025; UTAC creada por RD 143/2026; primeras sentencias en Francia | Verificado; en España aún no hay multas conocidas |
| **El problema se detecta objetivamente y sin acceso a la web del cliente** | El escáner registra cookies y peticiones como prueba | Construido y probado |
| **Cuántas tiendas españolas incumplen** | Se mide con el primer lote (paso 3) | **Pendiente.** No me lo invento |
| **Disposición a pagar *a ti*** | Solo la validan las primeras respuestas y cobros | **Hipótesis** |

Alternativas descartadas:
- **Verifactu**: plazos que han cambiado varias veces y competencia enorme de software con marca (Holded, Billin, Quaderno…).
- **Accesibilidad como producto principal**: las microempresas están exentas y en España todavía no hay sanciones conocidas. Queda como venta adicional.
- **Marketplaces de freelance**: Upwork cobra por enviar propuestas, el ranking inicial es lento y no hay ventaja diferencial.

**Ventaja diferencial:** el primer mensaje ya contiene trabajo hecho y pruebas concretas de *su* web. Eso no lo consigue un anuncio genérico.

---

## 2. Puesta en marcha (unos 45 min, una sola vez)

```bash
cd auditoria-web
npm install            # axe-core
npx playwright install chromium   # solo si no tienes Chromium para Playwright
```
1. Rellena `config.json`: nombre, email, URL de tu landing y precios.
2. **Landing:** sube la carpeta `landing/` a GitHub Pages (repositorio público → *Settings > Pages*) o a Cloudflare Pages. Ambos son gratis. Sustituye `TU-EMAIL`, `TU NOMBRE` y `TU-NIF` en los tres HTML.
3. **Cobro:** crea dos enlaces de pago gratuitos (comisión solo por venta). Puedes usar *Stripe Payment Links* o *PayPal* (botón o enlace). Pon los enlaces en `PAGO_ARREGLO` y `PAGO_INFORME` de `landing/index.html`. También vale transferencia o Bizum con factura.
4. **Fiscalidad:** para facturar de forma habitual en España hace falta estar dado de alta como autónomo. Infórmate de la tarifa reducida de nuevos autónomos y consulta con un asesor o con la Seguridad Social antes del primer cobro. No te lo puedo resolver yo.

---

## 3. Sistema de captación (diario, 60-90 min)

**Cliente ideal:** una tienda online española con anuncios en Meta o Google. Si tiene píxel, invierte en marketing y tiene presupuesto. Mejor aún si es una pyme de 2 a 50 personas con la persona responsable identificable en LinkedIn.

**Cómo encontrarlas gratis**
- En Google: `"tienda online" "envíos a toda España" <nicho>` (cosmética natural, ropa infantil, café, joyería, artículos para mascotas, vinos…). También `site:myshopify.com` combinado con el nicho, o la palabra *Shopify* con el nicho.
- En la biblioteca de anuncios de Meta (gratis): busca por nicho y país España para ver quién anuncia ahora mismo.
- En los listados de adheridos a sellos de confianza y en directorios de comercios locales con tienda online.
- Apunta solo el dominio, uno por línea, en `prospectos.txt`.

**Rutina**
```bash
node cli.js --file prospectos.txt --pdf        # 50 webs en unos 10-15 min
```
1. Abre `out/resumen.csv` y filtra `riesgo = ALTO` con `rastreo_previo = true` o `rechazo_ignorado = true`. Son las que más necesitan el servicio y donde la prueba es más clara.
2. Para cada una, busca en LinkedIn a quien lleva la tienda: fundador, ecommerce manager o marketing.
3. Envía el mensaje 1 de `out/<dominio>/mensaje.txt` revisado a mano. Objetivo: **20 al día**.
4. Si responde que sí, envía `diagnostico-<dominio>.pdf` y el mensaje 2.
5. Si contesta con dudas, ofrece una llamada de 10 minutos y comparte la pantalla con el informe.

**Canales y legalidad (importante)**
- **No envíes emails comerciales en frío.** El art. 21 de la LSSI prohíbe las comunicaciones comerciales por email sin consentimiento previo, también entre empresas. Usa mensajes de LinkedIn, la visita en persona y la llamada solo si la tienda publica su teléfono como contacto comercial. Envía el email únicamente cuando la persona te diga que sí.
- No digas que eres abogado ni que «van a multarles». Muestra el hecho y su referencia legal, y deja que decidan. El informe ya incluye la cláusula «no constituye asesoramiento jurídico».

**Canal de difusión (gratis y escalable):** cuando tengas los datos del primer lote de 100 o más tiendas, publica en LinkedIn un post con el resultado real: «He analizado 100 tiendas online españolas: el X % instala rastreadores antes de pedir permiso». Usa el porcentaje real que imprime el CLI y no publiques nombres. Ese post genera peticiones de diagnóstico sin escribir en frío.

**Canal multiplicador:** las agencias web y las gestorías pueden revender el servicio a sus clientes. Ofréceles marca blanca: tú haces el trabajo a 120 € y ellos cobran lo que quieran.

---

## 4. Embudo esperado y criterio para abandonar

Las tasas siguientes son **hipótesis**, no datos: 100 mensajes personalizados → 15-25 respuestas → 8-12 diagnósticos enviados → 1-3 ventas. Con 20 mensajes al día, el primer cobro debería llegar en la **semana 1 o 2**.

**Criterio para abandonar o pivotar:** si tras 100 mensajes personalizados no hay ninguna venta, cambia una sola variable cada vez:
1. el canal (agencias en lugar de tiendas);
2. la oferta (49 € como entrada en lugar de 190 €);
3. el nicho.

Mide lo que pasa en `seguimiento.csv`.

---

## 5. Entrega y recurrencia
- Arreglo de 190 €: sigue [`docs/entrega.md`](docs/entrega.md). El cliente recibe un informe «antes» y otro «después».
- Vigilancia de 15 €/mes: cada mes, `node cli.js --file clientes.txt --pdf` y envías el PDF. Es casi todo automático y es lo que hace escalar el negocio.

## 6. Qué hay en la carpeta
| Ruta | Qué es |
|---|---|
| `cli.js` | Analiza una o varias webs y genera el informe gratuito y el completo (HTML/PDF), el mensaje personalizado y `resumen.csv` |
| `lib/scan.js` | Motor de análisis: cookies antes del consentimiento, prueba del botón «Rechazar», textos legales, formularios, HTTPS y accesibilidad con axe-core en español |
| `lib/rules.js` | Rastreadores, CMP y patrones conocidos. Amplíalo cuando encuentres casos nuevos |
| `lib/report.js` · `lib/outreach.js` | Informes y mensajes |
| `landing/` | Web de venta con aviso legal y política de privacidad, sin cookies |
| `docs/entrega.md` | Procedimiento de trabajo para el servicio de 190 € |
| `test/sites/` | Tres tiendas de prueba (incumple / banner trampa / cumple) para comprobar el escáner: `npm test` |

## Limitaciones conocidas
- Solo analiza la portada. Algunos píxeles se cargan únicamente en la ficha de producto o en el checkout. El servicio de pago debe revisar también esas páginas.
- La detección del banner es heurística. Algunos CMP con shadow DOM cerrado o iframe se detectan por nombre, pero sin probar el rechazo. Antes de enviar un diagnóstico, **mira siempre la captura**.
- Algunas webs bloquean navegadores automáticos y devuelven error en `resumen.csv`. Sáltalas.
