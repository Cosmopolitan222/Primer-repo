import type { NotificationProvider, OutboundMessage, SendResult } from "../types";

/**
 * Integración real de SMS (ejemplo con Twilio, pero el patrón es el mismo
 * para cualquier proveedor: MessageBird, Vonage, un gateway local...).
 *
 * NO está activa en la demo. Para conectarla:
 *   1. Crear cuenta y comprar un número en el proveedor elegido.
 *   2. Definir SMS_ACCOUNT_SID, SMS_AUTH_TOKEN y SMS_FROM_NUMBER.
 *   3. Sustituir `getProvider()` en `../index.ts`.
 */
export class SmsTwilioProvider implements NotificationProvider {
  readonly name = "sms-twilio";

  constructor(
    private readonly accountSid = process.env.SMS_ACCOUNT_SID,
    private readonly authToken = process.env.SMS_AUTH_TOKEN,
    private readonly fromNumber = process.env.SMS_FROM_NUMBER,
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    void message;
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return {
        ok: false,
        providerName: this.name,
        error: "Proveedor SMS no configurado (faltan credenciales).",
      };
    }

    // Ejemplo real con el SDK de Twilio (no instalado en esta demo):
    //
    // const client = twilio(this.accountSid, this.authToken);
    // const result = await client.messages.create({
    //   from: this.fromNumber,
    //   to: message.to.phone!,
    //   body: message.body,
    // });
    // return { ok: true, providerName: this.name, providerMessageId: result.sid };

    return {
      ok: false,
      providerName: this.name,
      error: "Integración no implementada todavía en esta demo.",
    };
  }
}
