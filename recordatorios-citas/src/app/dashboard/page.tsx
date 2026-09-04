import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/lib/metrics";
import { demoNow } from "@/lib/demo-clock";
import { formatDateTimeLong, formatRelativeToNow } from "@/lib/date-format";
import { Card, CardHeader } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AppointmentStatus } from "@/lib/constants";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
}

export default async function DashboardOverviewPage() {
  const session = await getSession();
  if (!session) return null;

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  const metrics = await getDashboardMetrics(session.clinicId);
  const now = demoNow(clinic.demoClockOffsetMinutes);

  const upcoming = await prisma.appointment.findMany({
    where: { clinicId: session.clinicId, startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: 6,
    include: { patient: true },
  });

  const recentActivity = await prisma.auditLog.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const cards = [
    { label: "Pendientes", value: metrics.counts.pending, tone: "warning" },
    { label: "Confirmadas", value: metrics.counts.confirmed, tone: "success" },
    { label: "Canceladas", value: metrics.counts.cancelled, tone: "neutral" },
    { label: "Ausencias", value: metrics.counts.noShow, tone: "danger" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Resumen</h1>
        <p className="text-sm text-muted">Vista general del estado de las citas de {clinic.name}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{card.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Dinero potencialmente recuperado"
          description="Estimación calculada con tus propios datos (citas y valor medio configurado en Ajustes), no con cifras del sector."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Total estimado</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {money(metrics.money.totalRecovered, metrics.money.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Por confirmaciones vía recordatorio</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {money(metrics.money.recoveredFromConfirmations, metrics.money.currency)}
            </p>
            <p className="text-xs text-muted">{metrics.money.confirmationsCount} cita(s) confirmadas por el paciente</p>
          </div>
          <div>
            <p className="text-sm text-muted">Por huecos recuperados (lista de espera)</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {money(metrics.money.recoveredFromWaitlist, metrics.money.currency)}
            </p>
            <p className="text-xs text-muted">{metrics.money.waitlistFillsCount} hueco(s) reocupados</p>
          </div>
        </div>
        <div className="border-t border-border px-5 py-3 text-xs text-muted">
          Para contexto: el valor de las {metrics.money.noShowCount} ausencia(s) registradas asciende a{" "}
          {money(metrics.money.atRiskFromNoShows, metrics.money.currency)}, usando el valor medio por cita
          configurado ({money(metrics.money.avgAppointmentValue, metrics.money.currency)}) cuando la cita no
          tiene un precio propio.
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Próximas citas"
            description="A partir de la hora actual de la demo."
            action={
              <Link href="/dashboard/citas" className="text-sm font-medium text-primary hover:underline">
                Ver todas
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon="🗓️"
              title="No hay citas próximas"
              description="Crea una cita manualmente o importa un CSV desde la sección de Citas."
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {appointment.patient.fullName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {appointment.service} · {formatRelativeToNow(appointment.startsAt, now)}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status as AppointmentStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Actividad reciente" description="Trazabilidad de las últimas acciones." />
          {recentActivity.length === 0 ? (
            <EmptyState icon="🧾" title="Todavía no hay actividad registrada." />
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm text-foreground">{entry.detail || entry.action}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.actor} · {formatDateTimeLong(entry.createdAt, clinic.timezone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
