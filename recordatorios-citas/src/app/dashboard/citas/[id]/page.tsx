import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTimeLong } from "@/lib/date-format";
import { CHANNEL_LABEL, WAITLIST_STATUS, type AppointmentStatus, type Channel } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { AppointmentStatusBadge, Badge } from "@/components/ui/badge";
import { AppointmentActions } from "./appointment-actions";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function AppointmentDetailPage({
  params,
}: PageProps<"/dashboard/citas/[id]">) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });

  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId: session.clinicId },
    include: { patient: true, notifications: { orderBy: { createdAt: "desc" } } },
  });
  if (!appointment) notFound();

  const auditEntries = await prisma.auditLog.findMany({
    where: { clinicId: session.clinicId, entityType: "APPOINTMENT", entityId: appointment.id },
    orderBy: { createdAt: "desc" },
  });

  let hasWaitlistCandidates = false;
  if (appointment.status === "CANCELLED") {
    const alreadyTried = (
      await prisma.waitlistOffer.findMany({
        where: { appointmentId: appointment.id },
        select: { waitlistEntryId: true },
      })
    ).map((o) => o.waitlistEntryId);

    const candidate = await prisma.waitlistEntry.findFirst({
      where: {
        clinicId: session.clinicId,
        status: WAITLIST_STATUS.WAITING,
        service: appointment.service,
        preferredFrom: { lte: appointment.startsAt },
        preferredTo: { gte: appointment.startsAt },
        id: { notIn: alreadyTried },
      },
    });
    hasWaitlistCandidates = Boolean(candidate);
  }

  const publicUrl = `${BASE_URL}/c/${appointment.publicToken}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/citas" className="text-sm text-muted hover:text-foreground">
          ← Volver a citas
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{appointment.patient.fullName}</h1>
            <p className="text-sm text-muted">
              {appointment.service} con {appointment.professionalName}
            </p>
          </div>
          <AppointmentStatusBadge status={appointment.status as AppointmentStatus} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Detalles de la cita" />
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Fecha y hora</dt>
                <dd className="text-sm font-medium text-foreground">
                  {formatDateTimeLong(appointment.startsAt, clinic.timezone)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Duración</dt>
                <dd className="text-sm font-medium text-foreground">{appointment.durationMinutes} min</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Precio</dt>
                <dd className="text-sm font-medium text-foreground">
                  {appointment.price != null
                    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: clinic.currency }).format(
                        appointment.price,
                      )
                    : `Valor medio (${new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: clinic.currency,
                      }).format(clinic.avgAppointmentValue)})`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Origen</dt>
                <dd className="text-sm font-medium text-foreground">
                  {appointment.source === "MANUAL" && "Creada manualmente"}
                  {appointment.source === "IMPORT" && "Importada por CSV"}
                  {appointment.source === "WAITLIST" && "Reservada desde lista de espera"}
                </dd>
              </div>
              {appointment.cancelReason && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Motivo de cancelación</dt>
                  <dd className="text-sm text-foreground">{appointment.cancelReason}</dd>
                </div>
              )}
              {appointment.changeRequestNote && (
                <div className="sm:col-span-2 rounded-lg bg-warning-soft px-3 py-2">
                  <dt className="text-xs font-medium text-warning">Solicitud de cambio del paciente</dt>
                  <dd className="text-sm text-warning">{appointment.changeRequestNote}</dd>
                </div>
              )}
            </dl>
            <div className="border-t border-border p-5">
              <AppointmentActions
                appointmentId={appointment.id}
                status={appointment.status as AppointmentStatus}
                hasWaitlistCandidates={hasWaitlistCandidates}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Historial de envíos" description="Trazabilidad de recordatorios y mensajes (simulados)." />
            {appointment.notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Todavía no se ha enviado ningún mensaje para esta cita.</p>
            ) : (
              <ul className="divide-y divide-border">
                {appointment.notifications.map((notification) => (
                  <li key={notification.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {CHANNEL_LABEL[notification.channel as Channel]} · {notification.templateName}
                      </span>
                      <Badge tone={notification.status === "FAILED" ? "danger" : "success"}>
                        {notification.status === "FAILED" ? "No enviado" : "Enviado (simulado)"}
                      </Badge>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-muted">{notification.renderedPreview}</p>
                    {notification.errorMessage && (
                      <p className="mt-1 text-xs text-danger">{notification.errorMessage}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTimeLong(notification.createdAt, clinic.timezone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Paciente" />
            <dl className="flex flex-col gap-3 p-5 text-sm">
              <div>
                <dt className="text-xs text-muted">Teléfono</dt>
                <dd className="font-medium text-foreground">{appointment.patient.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd className="font-medium text-foreground">{appointment.patient.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Consentimiento</dt>
                <dd>
                  {appointment.patient.consentGiven ? (
                    <Badge tone="success">Concedido</Badge>
                  ) : (
                    <Badge tone="danger">No registrado</Badge>
                  )}
                </dd>
              </div>
              {appointment.patient.unsubscribedAt && (
                <div>
                  <dt className="text-xs text-muted">Comunicaciones</dt>
                  <dd>
                    <Badge tone="neutral">Dado de baja</Badge>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Enlace del paciente" description="Así es como el paciente ve y gestiona su cita." />
            <div className="flex flex-col gap-3 p-5">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-primary hover:underline"
              >
                {publicUrl}
              </a>
              <p className="text-xs text-muted">
                Ábrelo para probar la confirmación, cancelación o solicitud de cambio tal y como la vería el
                paciente, sin iniciar sesión.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Auditoría de esta cita" />
            {auditEntries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Sin eventos todavía.</p>
            ) : (
              <ul className="divide-y divide-border">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="px-5 py-3 text-sm">
                    <p className="text-foreground">{entry.detail || entry.action}</p>
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
    </div>
  );
}
