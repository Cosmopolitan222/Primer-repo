import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoNow } from "@/lib/demo-clock";
import { formatDateTimeLong } from "@/lib/date-format";
import { Card, CardHeader } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { IntegrationsCard } from "./integrations-card";
import { DemoClockPanel } from "@/components/dashboard/demo-clock-panel";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  const now = demoNow(clinic.demoClockOffsetMinutes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted">Datos de la clínica, consentimiento y controles de la demo.</p>
      </div>

      <Card>
        <CardHeader title="Datos de la clínica" />
        <div className="p-5">
          <SettingsForm
            clinic={{
              name: clinic.name,
              phone: clinic.phone,
              email: clinic.email,
              address: clinic.address,
              timezone: clinic.timezone,
              avgAppointmentValue: clinic.avgAppointmentValue,
              consentText: clinic.consentText,
            }}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Reloj de demostración" description="Controla el tiempo simulado sin esperar días reales." />
        <div className="p-5">
          <DemoClockPanel currentLabel={formatDateTimeLong(now, clinic.timezone)} />
        </div>
      </Card>

      <IntegrationsCard />
    </div>
  );
}
