import type { NotificationProvider, OutboundMessage, SendResult } from "../types";

/**
 * Integración real con WhatsApp Business Cloud API (Meta).
 *
 * NO está activa en la demo. Para conectarla en un proyecto real:
 *   1. Crear una app de WhatsApp Business en developers.facebook.com.
 *   2. Definir WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en el entorno.
 *   3. Dar de alta las plantillas de mensaje ("message templates") en Meta,
 *      porque WhatsApp exige plantillas pre-aprobadas para mensajes fuera
 *      de la ventana de 24h de conversación abierta.
 *   4. Sustituir `getProvider()` en `../index.ts` para devolver esta clase
 *      cuando `WHATSAPP_TOKEN` esté definido.
 *
 * Referencia: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppCloudApiProvider implements NotificationProvider {
  readonly name = "whatsapp-cloud-api";

  constructor(
    private readonly token = process.env.WHATSAPP_TOKEN,
    private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID,
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    void message;
    if (!this.token || !this.phoneNumberId) {
      return {
        ok: false,
        providerName: this.name,
        error:
          "WhatsApp Business Cloud API no está configurada (faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).",
      };
    }

    // Ejemplo de llamada real (comentado intencionadamente: requiere una
    // plantilla aprobada por Meta y credenciales de producción):
    //
    // const response = await fetch(
    //   `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`,
    //   {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${this.token}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       messaging_product: "whatsapp",
    //       to: message.to.phone,
    //       type: "text",
    //       text: { body: message.body },
    //     }),
    //   },
    // );
    // const data = await response.json();
    // return { ok: response.ok, providerName: this.name, providerMessageId: data.messages?.[0]?.id };

    return {
      ok: false,
      providerName: this.name,
      error: "Integración no implementada todavía en esta demo.",
    };
  }
}
