import type { Channel } from "@/lib/constants";
import type { NotificationProvider } from "./types";
import { SimulatedProvider } from "./providers/simulated";
import { WhatsAppCloudApiProvider } from "./providers/whatsapp-cloud-api";
import { SmsTwilioProvider } from "./providers/sms-twilio";
import { EmailSmtpProvider } from "./providers/email-smtp";

export type { OutboundMessage, SendResult, NotificationProvider } from "./types";

const simulated = new SimulatedProvider();

/**
 * Fábrica de proveedores: decide con qué proveedor enviar cada canal.
 *
 * Por diseño, esta demo siempre usa el proveedor simulado
 * (`NOTIFICATIONS_MODE` no está expuesto en la UI) para no depender de
 * ningún servicio de pago ni credencial real. El resto de proveedores ya
 * están implementados con su contrato (`NotificationProvider`) y listos
 * para activarse: basta con descomentar la rama correspondiente una vez
 * configuradas las credenciales reales en el entorno.
 */
export function getProvider(channel: Channel): NotificationProvider {
  void channel;

  // Ejemplo de cómo se activaría cada canal real cuando haya credenciales:
  // if (channel === "WHATSAPP" && process.env.WHATSAPP_TOKEN) {
  //   return new WhatsAppCloudApiProvider();
  // }
  // if (channel === "SMS" && process.env.SMS_ACCOUNT_SID) {
  //   return new SmsTwilioProvider();
  // }
  // if (channel === "EMAIL" && process.env.EMAIL_API_KEY) {
  //   return new EmailSmtpProvider();
  // }

  return simulated;
}

// Se referencian para que TypeScript no las marque como no usadas mientras
// están desactivadas; en cuanto se descomenten arriba, estas líneas sobran.
void WhatsAppCloudApiProvider;
void SmsTwilioProvider;
void EmailSmtpProvider;
