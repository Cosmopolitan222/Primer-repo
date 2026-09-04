import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatTime } from "@/lib/date-format";
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentPanels } from "./appointment-panels";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: APPOINTMENT_STATUS.PENDING, label: APPOINTMENT_STATUS_LABEL.PENDING },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: APPOINTMENT_STATUS_LABEL.CONFIRMED },
  { value: APPOINTMENT_STATUS.CANCELLED, label: APPOINTMENT_STATUS_LABEL.CANCELLED },
  { value: APPOINTMENT_STATUS.NO_SHOW, label: APPOINTMENT_STATUS_LABEL.NO_SHOW },
  { value: APPOINTMENT_STATUS.COMPLETED, label: APPOINTMENT_STATUS_LABEL.COMPLETED },
];

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/dashboard/citas">) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "ALL";
  const search = typeof params.q === "string" ? params.q.trim() : "";

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: session.clinicId,
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(search
        ? { patient: { fullName: { contains: search } } }
        : {}),
    },
    orderBy: { startsAt: "desc" },
    include: { patient: true },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Citas</h1>
          <p className="text-sm text-muted">Crea, importa y gestiona las citas de tu clínica.</p>
        </div>
      </div>

      <AppointmentPanels />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => {
              const active = filter.value === statusFilter;
              const href = filter.value === "ALL" ? "/dashboard/citas" : `/dashboard/citas?status=${filter.value}`;
              return (
                <Link
                  key={filter.value}
                  href={href}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-primary text-white" : "bg-zinc-100 text-muted hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
          <form className="flex items-center gap-2" action="/dashboard/citas">
            {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar paciente…"
              className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </form>
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="No hay citas que coincidan con este filtro"
            description="Prueba a cambiar el filtro o crea una nueva cita con el botón de arriba."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Servicio</th>
                  <th className="px-5 py-3 font-medium">Profesional</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/citas/${appointment.id}`} className="font-medium text-foreground hover:underline">
                        {appointment.patient.fullName}
                      </Link>
                      {appointment.filledFromWaitlist && (
                        <span className="ml-2 text-xs text-primary">vía lista de espera</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{appointment.service}</td>
                    <td className="px-5 py-3 text-muted">{appointment.professionalName}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateShort(appointment.startsAt, clinic.timezone)}{" "}
                      {formatTime(appointment.startsAt, clinic.timezone)}
                    </td>
                    <td className="px-5 py-3">
                      <AppointmentStatusBadge status={appointment.status as AppointmentStatus} />
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
