import type { NotificationProvider, OutboundMessage, SendResult } from "../types";

/**
 * Proveedor de demostración: no llama a ningún servicio externo ni gasta
 * dinero. "Envía" el mensaje registrándolo (el motor de recordatorios lo
 * guarda además en NotificationLog para trazabilidad) y simula una pequeña
 * tasa de fallos de red para que el panel se comporte de forma realista.
 */
export class SimulatedProvider implements NotificationProvider {
  readonly name = "simulated";

  async send(message: OutboundMessage): Promise<SendResult> {
    // Simula latencia de red mínima.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const hasDestination =
      (message.channel === "EMAIL" && !!message.to.email) ||
      (message.channel !== "EMAIL" && !!message.to.phone);

    if (!hasDestination) {
      return {
        ok: false,
        providerName: this.name,
        error: `El paciente no tiene ${
          message.channel === "EMAIL" ? "email" : "teléfono"
        } registrado para recibir este mensaje.`,
      };
    }

    return {
      ok: true,
      providerName: this.name,
      providerMessageId: `sim_${Math.random().toString(36).slice(2, 12)}`,
    };
  }
}
