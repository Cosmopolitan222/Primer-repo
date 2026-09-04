import { prisma } from "@/lib/prisma";
import { formatDateTimeLong } from "@/lib/date-format";
import { APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { ConfirmationActions } from "./confirmation-actions";

const IMMUTABLE = new Set(["CANCELLED", "NO_SHOW", "COMPLETED"]);

export default async function PublicAppointmentPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { publicToken: token },
    include: { clinic: true, patient: true },
  });

  if (!appointment) {
    return (
      <PublicShell>
        <Card className="p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Enlace no válido</p>
          <p className="mt-2 text-sm text-muted">
            No hemos encontrado ninguna cita asociada a este enlace. Si crees que es un error, contacta con
            la clínica.
          </p>
        </Card>
      </PublicShell>
    );
  }

  const { clinic, patient } = appointment;
  const isImmutable = IMMUTABLE.has(appointment.status);

  return (
    <PublicShell clinicName={clinic.name}>
      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted">Hola {patient.fullName.split(" ")[0]},</p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">Tu cita en {clinic.name}</h1>

        <div className="mt-4 flex flex-col gap-1 rounded-lg bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-foreground">{appointment.service}</p>
          <p className="text-muted">con {appointment.professionalName}</p>
          <p className="mt-1 text-muted">{formatDateTimeLong(appointment.startsAt, clinic.timezone)}</p>
        </div>

        <div className="mt-4">
          <AppointmentStatusBadge status={appointment.status as AppointmentStatus} />
        </div>

        <div className="mt-5">
          {isImmutable ? (
            <div className="rounded-lg border border-border p-3 text-sm text-muted">
              {appointment.status === "CANCELLED" &&
                "Esta cita está cancelada. Si quieres pedir una nueva, contacta con la clínica."}
              {appointment.status === "NO_SHOW" &&
                "Esta cita ya pasó y quedó registrada como ausencia. Contacta con la clínica si quieres reprogramarla."}
              {appointment.status === "COMPLETED" && "Esta cita ya se realizó. ¡Gracias por tu visita!"}
            </div>
          ) : (
            <ConfirmationActions token={token} />
          )}
        </div>

        {!isImmutable && (
          <a
            href={`/api/ics/${token}`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            📅 Añadir a mi calendario
          </a>
        )}

        <div className="mt-6 border-t border-border pt-4 text-xs text-muted">
          <p>{clinic.consentText}</p>
          <a href={`/baja/${clinic.id}/${patient.id}`} className="mt-2 inline-block underline">
            Darme de baja de recordatorios
          </a>
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-muted">
        Estado actual: {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]} · {clinic.phone}
      </p>
    </PublicShell>
  );
}
