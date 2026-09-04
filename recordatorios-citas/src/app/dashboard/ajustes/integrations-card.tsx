import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const INTEGRATIONS = [
  {
    name: "WhatsApp Business Cloud API",
    envVars: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    description: "Envío real de recordatorios y ofertas de hueco por WhatsApp.",
  },
  {
    name: "SMS (Twilio u otro proveedor)",
    envVars: ["SMS_ACCOUNT_SID", "SMS_AUTH_TOKEN", "SMS_FROM_NUMBER"],
    description: "Canal de respaldo para recordatorios de última hora.",
  },
  {
    name: "Email (Resend, SMTP…)",
    envVars: ["EMAIL_API_KEY", "EMAIL_FROM"],
    description: "Confirmaciones detalladas para primeras visitas.",
  },
  {
    name: "Calendarios (Google / Outlook)",
    envVars: [],
    description: "Sincronización de citas — arquitectura prevista en src/lib/calendar, pendiente de OAuth.",
  },
] as const;

export function IntegrationsCard() {
  return (
    <Card>
      <CardHeader
        title="Integraciones"
        description="Esta demo simula siempre los envíos. Así quedará el estado cuando conectes canales reales."
      />
      <ul className="divide-y divide-border">
        {INTEGRATIONS.map((integration) => (
          <li key={integration.name} className="flex items-start justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{integration.name}</p>
              <p className="text-xs text-muted">{integration.description}</p>
              {integration.envVars.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Variables: <code>{integration.envVars.join(", ")}</code>
                </p>
              )}
            </div>
            <Badge tone="neutral">No conectado (simulado)</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
