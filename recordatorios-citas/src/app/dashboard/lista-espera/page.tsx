import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoNow } from "@/lib/demo-clock";
import { formatDateShort, formatDateTimeLong } from "@/lib/date-format";
import { WAITLIST_STATUS, type WaitlistStatus } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { WaitlistStatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WaitlistPanel } from "./waitlist-panel";
import { RemoveEntryButton } from "./remove-entry-button";

export default async function WaitlistPage() {
  const session = await getSession();
  if (!session) return null;

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  const now = demoNow(clinic.demoClockOffsetMinutes);

  const entries = await prisma.waitlistEntry.findMany({
    where: { clinicId: session.clinicId, status: { not: WAITLIST_STATUS.CANCELLED } },
    orderBy: { createdAt: "desc" },
    include: { patient: true },
  });

  const freeSlots = await prisma.appointment.findMany({
    where: { clinicId: session.clinicId, status: "CANCELLED", startsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    include: { waitlistOffers: { where: { status: "PENDING" }, take: 1 } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lista de espera</h1>
        <p className="text-sm text-muted">
          Cuando se cancela una cita futura, el hueco se ofrece automáticamente al primer paciente
          compatible en espera (mismo servicio y dentro de su rango de fechas disponible).
        </p>
      </div>

      <WaitlistPanel />

      {freeSlots.length > 0 && (
        <Card>
          <CardHeader
            title="Huecos libres actualmente"
            description="Citas canceladas con fecha futura. Pulsa «Procesar recordatorios ahora» arriba para intentar ofrecerlas."
          />
          <ul className="divide-y divide-border">
            {freeSlots.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <Link href={`/dashboard/citas/${slot.id}`} className="font-medium text-foreground hover:underline">
                    {slot.service} · {slot.professionalName}
                  </Link>
                  <p className="text-xs text-muted">{formatDateTimeLong(slot.startsAt, clinic.timezone)}</p>
                </div>
                <Badge tone="warning">{slot.waitlistOffers.length > 0 ? "Oferta enviada" : "Sin ocupar"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Pacientes en espera" />
        {entries.length === 0 ? (
          <EmptyState
            icon="🪑"
            title="No hay nadie en la lista de espera"
            description="Añade pacientes que quieran un hueco antes de su próxima cita disponible."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Servicio</th>
                  <th className="px-5 py-3 font-medium">Disponible entre</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 font-medium text-foreground">{entry.patient.fullName}</td>
                    <td className="px-5 py-3 text-muted">
                      {entry.service}
                      {entry.professionalName ? ` · ${entry.professionalName}` : ""}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateShort(entry.preferredFrom, clinic.timezone)} —{" "}
                      {formatDateShort(entry.preferredTo, clinic.timezone)}
                    </td>
                    <td className="px-5 py-3">
                      <WaitlistStatusBadge status={entry.status as WaitlistStatus} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {entry.status === WAITLIST_STATUS.WAITING && <RemoveEntryButton id={entry.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
