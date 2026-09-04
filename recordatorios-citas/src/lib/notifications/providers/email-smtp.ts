import type { NotificationProvider, OutboundMessage, SendResult } from "../types";

/**
 * Integración real de Email (ejemplo genérico compatible con Resend, SMTP,
 * SendGrid...). NO está activa en la demo.
 *
 *   1. Elegir un proveedor con capa gratuita (Resend, por ejemplo).
 *   2. Definir EMAIL_API_KEY y EMAIL_FROM.
 *   3. Sustituir `getProvider()` en `../index.ts`.
 */
export class EmailSmtpProvider implements NotificationProvider {
  readonly name = "email-smtp";

  constructor(
    private readonly apiKey = process.env.EMAIL_API_KEY,
    private readonly from = process.env.EMAIL_FROM,
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    void message;
    if (!this.apiKey || !this.from) {
      return {
        ok: false,
        providerName: this.name,
        error: "Proveedor de email no configurado (faltan credenciales).",
      };
    }

    // Ejemplo real con Resend:
    //
    // const response = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${this.apiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: this.from,
    //     to: message.to.email,
    //     subject: message.subject ?? "Recordatorio de cita",
    //     text: message.body,
    //   }),
    // });
    // const data = await response.json();
    // return { ok: response.ok, providerName: this.name, providerMessageId: data.id };

    return {
      ok: false,
      providerName: this.name,
      error: "Integración no implementada todavía en esta demo.",
    };
  }
}
