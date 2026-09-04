import type { Channel } from "@/lib/constants";

export type OutboundMessage = {
  to: {
    phone?: string | null;
    email?: string | null;
    name: string;
  };
  channel: Channel;
  subject?: string | null;
  body: string;
};

export type SendResult = {
  ok: boolean;
  providerName: string;
  providerMessageId?: string;
  error?: string;
};

/**
 * Contrato que debe cumplir cualquier proveedor de envío (WhatsApp, SMS,
 * Email...). La demo solo usa `SimulatedProvider`, pero cualquier proveedor
 * real (WhatsApp Business Cloud API, Twilio, Resend, etc.) puede
 * implementar esta misma interfaz y enchufarse en `getProvider()` sin tocar
 * el resto de la aplicación.
 */
export interface NotificationProvider {
  readonly name: string;
  send(message: OutboundMessage): Promise<SendResult>;
}
