# Cómo entregar el servicio «Lo dejamos resuelto» (190 €)

Objetivo: el cliente termina con un **informe limpio** generado por el mismo escáner. Ese informe sirve de prueba de que el trabajo está hecho. Tiempo estimado: entre 1 y 3 horas por tienda.

## 0. Antes de empezar
1. El cliente paga (enlace de pago) y te da un **usuario temporal** de administrador o de colaborador. En Shopify: *Ajustes > Usuarios > Colaborador*. En WordPress: crea un usuario «Administrador» que borrará al terminar.
2. Ejecuta `node cli.js su-tienda.es --pdf` y guarda el resultado como **«antes»**.

## 1. Cookies (lo urgente)
| Plataforma | Qué hacer (gratis) |
|---|---|
| **Shopify** | *Ajustes > Privacidad del cliente > Banner de cookies*: activarlo para España/UE con «Aceptar», «Rechazar» y «Gestionar». Comprueba que las apps de píxeles (Meta, TikTok, Google & YouTube) respetan la *Customer Privacy API*. Elimina los snippets que estén pegados a mano en `theme.liquid` y pásalos a *Eventos de cliente* (píxel personalizado con permiso «marketing» o «analítica»). |
| **WordPress / WooCommerce** | Plugin **Complianz** o **CookieYes** (versión gratuita). Ejecuta el asistente, región UE y opción «opt-in». Activa el bloqueo de scripts. Si GA4 o el píxel se insertan con otro plugin (Site Kit, PixelYourSite, GTM4WP…), comprueba que quedan bloqueados o configura Consent Mode. |
| **PrestaShop** | Módulo de cookies con bloqueo previo. Revisa los módulos de Google y Meta y que solo se carguen con consentimiento. |
| **Google Tag Manager** | Activa la *Vista general del consentimiento*. Etiquetas GA4/Ads con `analytics_storage` / `ad_storage`. Plantilla CMP de la galería con *Consent Mode v2*: valores por defecto `denied` y región ES/UE. |

Requisitos que debe cumplir el banner (Guía de cookies de la AEPD, actualizada en julio de 2023):
- «Aceptar» y «Rechazar» en la **primera capa**, con el mismo tamaño y estilo.
- Ninguna cookie no técnica antes de aceptar. Seguir navegando **no** cuenta como consentimiento.
- Un enlace o botón permanente para cambiar la elección (por ejemplo, un icono flotante o un enlace en el pie).
- Política de cookies enlazada desde el banner. Los CMP indicados la generan con el listado de cookies.

## 2. Textos legales
- **Aviso legal** (art. 10 LSSI): razón social, NIF, domicilio, email, datos del Registro Mercantil si es sociedad y, si aplica, colegio profesional.
- **Política de privacidad** (art. 13 RGPD): responsable, finalidades, base legal, plazos de conservación, destinatarios (pasarela de pago, transporte, email marketing) y derechos.
- **Formularios**: debajo del botón, una primera capa informativa y el enlace a la política de privacidad. En la newsletter, una casilla **no** premarcada.
- Usa los generadores gratuitos de los propios CMP o de la plataforma (Shopify: *Ajustes > Políticas*) y personalízalos con los datos del cliente. **Tú no redactas asesoramiento jurídico**: el cliente revisa y valida los textos. Así queda indicado en la factura.

## 3. Mejoras rápidas (si sobra tiempo)
- Google Fonts alojadas en el propio servidor (WordPress: plugin *OMGF*).
- Vídeos de YouTube con `youtube-nocookie.com`.
- Accesibilidad: textos alternativos en imágenes y nombres accesibles en los botones de solo icono. Cubre los errores «Crítico» del anexo.

## 4. Cierre
1. Ejecuta de nuevo `node cli.js su-tienda.es --pdf` y envía el **informe «después»** junto al «antes».
2. Pide al cliente que borre tu usuario temporal.
3. Ofrece la **vigilancia mensual (15 €/mes)**. Explícale que, cada vez que instalen una app o un plugin de marketing, puede volver a aparecer un píxel sin control. La vigilancia consiste en un `node cli.js --file clientes.txt --pdf` al mes.
4. Pide una frase de testimonio y permiso para citarlo como cliente.
