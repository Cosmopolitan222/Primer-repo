import "server-only";
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_STATUS } from "@/lib/constants";

export type DashboardMetrics = {
  counts: {
    pending: number;
    confirmed: number;
    cancelled: number;
    noShow: number;
    completed: number;
    total: number;
  };
  money: {
    currency: string;
    avgAppointmentValue: number;
    recoveredFromConfirmations: number;
    confirmationsCount: number;
    recoveredFromWaitlist: number;
    waitlistFillsCount: number;
    totalRecovered: number;
    atRiskFromNoShows: number;
    noShowCount: number;
  };
};

/**
 * Calcula las métricas del panel a partir de los datos reales de la
 * clínica (nunca con cifras sectoriales genéricas):
 *
 *  - "Ingresos protegidos por confirmación": valor de las citas que el
 *    propio paciente confirmó desde el enlace de recordatorio (se
 *    identifican por tener un registro de auditoría CONFIRMED con
 *    actor = "paciente").
 *  - "Ingresos recuperados por lista de espera": valor de las citas que
 *    se han llenado gracias a que se ofreció el hueco liberado a otro
 *    paciente en espera.
 *  - "Impacto estimado de ausencias": valor de las citas marcadas como
 *    ausencia, mostrado como referencia del coste que la clínica ya sufre.
 *
 * Cuando una cita no tiene precio propio se usa el valor medio configurado
 * por la clínica en Ajustes.
 */
export async function getDashboardMetrics(clinicId: string): Promise<DashboardMetrics> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const avgValue = clinic.avgAppointmentValue;

  const appointments = await prisma.appointment.findMany({
    where: { clinicId },
    select: { id: true, status: true, price: true, filledFromWaitlist: true },
  });

  const counts = {
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    noShow: 0,
    completed: 0,
    total: appointments.length,
  };

  const valueOf = (price: number | null) => (price != null ? price : avgValue);

  let atRiskFromNoShows = 0;
  let recoveredFromWaitlist = 0;
  let waitlistFillsCount = 0;

  for (const appointment of appointments) {
    switch (appointment.status) {
      case APPOINTMENT_STATUS.PENDING:
        counts.pending += 1;
        break;
      case APPOINTMENT_STATUS.CONFIRMED:
        counts.confirmed += 1;
        break;
      case APPOINTMENT_STATUS.CANCELLED:
        counts.cancelled += 1;
        break;
      case APPOINTMENT_STATUS.NO_SHOW:
        counts.noShow += 1;
        atRiskFromNoShows += valueOf(appointment.price);
        break;
      case APPOINTMENT_STATUS.COMPLETED:
        counts.completed += 1;
        break;
    }

    if (
      appointment.filledFromWaitlist &&
      [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.COMPLETED].includes(
        appointment.status as "CONFIRMED" | "COMPLETED",
      )
    ) {
      recoveredFromWaitlist += valueOf(appointment.price);
      waitlistFillsCount += 1;
    }
  }

  const patientConfirmedLogs = await prisma.auditLog.findMany({
    where: { clinicId, entityType: "APPOINTMENT", action: "CONFIRMED", actor: "paciente" },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  const confirmedIds = patientConfirmedLogs.map((l) => l.entityId);
  const confirmedAppointments = appointments.filter(
    (a) => confirmedIds.includes(a.id) && a.status !== APPOINTMENT_STATUS.CANCELLED,
  );
  const recoveredFromConfirmations = confirmedAppointments.reduce(
    (sum, a) => sum + valueOf(a.price),
    0,
  );

  return {
    counts,
    money: {
      currency: clinic.currency,
      avgAppointmentValue: avgValue,
      recoveredFromConfirmations,
      confirmationsCount: confirmedAppointments.length,
      recoveredFromWaitlist,
      waitlistFillsCount,
      totalRecovered: recoveredFromConfirmations + recoveredFromWaitlist,
      atRiskFromNoShows,
      noShowCount: counts.noShow,
    },
  };
}
