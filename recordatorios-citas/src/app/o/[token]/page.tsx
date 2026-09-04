import { prisma } from "@/lib/prisma";
import { demoNow } from "@/lib/demo-clock";
import { formatDateTimeLong } from "@/lib/date-format";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OfferActions } from "./offer-actions";

export default async function WaitlistOfferPage({
  params,
}: PageProps<"/o/[token]">) {
  const { token } = await params;

  const offer = await prisma.waitlistOffer.findUnique({
    where: { publicToken: token },
    include: {
      appointment: { include: { clinic: true } },
      waitlistEntry: { include: { patient: true } },
    },
  });

  if (!offer) {
    return (
      <PublicShell>
        <Card className="p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Enlace no válido</p>
          <p className="mt-2 text-sm text-muted">No hemos encontrado esta oferta de hueco.</p>
        </Card>
      </PublicShell>
    );
  }

  const { appointment, waitlistEntry } = offer;
  const { clinic } = appointment;
  const now = demoNow(clinic.demoClockOffsetMinutes);
  const isExpired = offer.status !== "PENDING" || offer.expiresAt <= now;

  return (
    <PublicShell clinicName={clinic.name}>
      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted">
          Hola {waitlistEntry.patient.fullName.split(" ")[0]},
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">¡Se ha liberado un hueco!</h1>
        <p className="mt-1 text-sm text-muted">
          Estabas en la lista de espera de {clinic.name} para {waitlistEntry.service}.
        </p>

        <div className="mt-4 flex flex-col gap-1 rounded-lg bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-foreground">{appointment.service}</p>
          <p className="text-muted">con {appointment.professionalName}</p>
          <p className="mt-1 text-muted">{formatDateTimeLong(appointment.startsAt, clinic.timezone)}</p>
        </div>

        <div className="mt-5">
          {isExpired ? (
            <div className="rounded-lg border border-border p-3 text-sm text-muted">
              {offer.status === "ACCEPTED" && "Ya reservaste este hueco. ¡Te esperamos!"}
              {offer.status === "DECLINED" && "Indicaste que no podías acudir a este hueco."}
              {(offer.status === "EXPIRED" || offer.expiresAt <= now) &&
                offer.status === "PENDING" &&
                "Esta oferta ha caducado, pero seguimos avisándote de futuros huecos."}
              {offer.status === "EXPIRED" && "Esta oferta ya había caducado."}
            </div>
          ) : (
            <>
              <Badge tone="warning">Oferta disponible por tiempo limitado</Badge>
              <div className="mt-3">
                <OfferActions token={token} />
              </div>
            </>
          )}
        </div>
      </Card>
    </PublicShell>
  );
}
