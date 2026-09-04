import { prisma } from "@/lib/prisma";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { UnsubscribeButton } from "./unsubscribe-button";

export default async function UnsubscribePage({
  params,
}: PageProps<"/baja/[clinicId]/[patientId]">) {
  const { clinicId, patientId } = await params;

  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId }, include: { clinic: true } });

  if (!patient) {
    return (
      <PublicShell>
        <Card className="p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Enlace no válido</p>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell clinicName={patient.clinic.name}>
      <Card className="p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Baja de comunicaciones</h1>
        {patient.unsubscribedAt ? (
          <p className="mt-3 text-sm text-muted">
            Ya estás dado de baja de recordatorios y ofertas de {patient.clinic.name}. Si cambias de opinión,
            contacta directamente con la clínica.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              Si confirmas, {patient.clinic.name} dejará de enviarte recordatorios de citas, confirmaciones y
              ofertas de hueco por WhatsApp, SMS o email. Tus citas ya programadas no se cancelan.
            </p>
            <div className="mt-5">
              <UnsubscribeButton clinicId={clinicId} patientId={patientId} />
            </div>
          </>
        )}
      </Card>
    </PublicShell>
  );
}
