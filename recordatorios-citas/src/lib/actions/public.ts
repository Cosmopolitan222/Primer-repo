"use server";

import { prisma } from "@/lib/prisma";
import { demoNow } from "@/lib/demo-clock";
import { offerNextWaitlistCandidate } from "@/lib/reminder-engine";
import {
  APPOINTMENT_STATUS,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  OFFER_STATUS,
  WAITLIST_STATUS,
} from "@/lib/constants";
import { revalidatePath } from "next/cache";

export type PublicActionResult = { ok: true; message: string } | { ok: false; message: string };

async function getClinicNow(clinicId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  return demoNow(clinic.demoClockOffsetMinutes);
}

const IMMUTABLE_STATUSES: string[] = [
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
  APPOINTMENT_STATUS.COMPLETED,
];

export async function confirmAppointmentAction(token: string): Promise<PublicActionResult> {
  const appointment = await prisma.appointment.findUnique({ where: { publicToken: token } });
  if (!appointment) return { ok: false, message: "No hemos encontrado esta cita." };
  if (IMMUTABLE_STATUSES.includes(appointment.status)) {
    return { ok: false, message: "Esta cita ya no se puede confirmar (está cancelada, ya pasó o ya fue atendida)." };
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: APPOINTMENT_STATUS.CONFIRMED },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: appointment.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      action: "CONFIRMED",
      actor: "paciente",
      detail: "El paciente confirmó la cita desde el enlace público.",
    },
  });

  revalidatePath(`/c/${token}`);
  revalidatePath("/dashboard/citas");
  return { ok: true, message: "¡Gracias! Tu cita ha quedado confirmada." };
}

export async function cancelAppointmentAction(
  token: string,
  reason: string,
): Promise<PublicActionResult> {
  const appointment = await prisma.appointment.findUnique({ where: { publicToken: token } });
  if (!appointment) return { ok: false, message: "No hemos encontrado esta cita." };
  if (IMMUTABLE_STATUSES.includes(appointment.status)) {
    return { ok: false, message: "Esta cita ya estaba cancelada, ya pasó o ya fue atendida." };
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: APPOINTMENT_STATUS.CANCELLED, cancelReason: reason || null },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: appointment.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      action: "CANCELLED",
      actor: "paciente",
      detail: reason ? `Motivo indicado: ${reason}` : "El paciente canceló la cita desde el enlace público.",
    },
  });

  const now = await getClinicNow(appointment.clinicId);
  await offerNextWaitlistCandidate(appointment.id, now);

  revalidatePath(`/c/${token}`);
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard/lista-espera");
  return {
    ok: true,
    message: "Tu cita ha sido cancelada. Gracias por avisar: así podemos ofrecer el hueco a otro paciente.",
  };
}

export async function requestChangeAction(token: string, note: string): Promise<PublicActionResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { publicToken: token },
    include: { clinic: true, patient: true },
  });
  if (!appointment) return { ok: false, message: "No hemos encontrado esta cita." };
  if (IMMUTABLE_STATUSES.includes(appointment.status)) {
    return { ok: false, message: "Esta cita ya no se puede modificar." };
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { changeRequestNote: note || "Sin detalles adicionales." },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: appointment.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      action: "RESCHEDULE_REQUESTED",
      actor: "paciente",
      detail: note ? `Solicitud: ${note}` : "El paciente solicitó un cambio de horario.",
    },
  });
  await prisma.notificationLog.create({
    data: {
      appointmentId: appointment.id,
      channel: appointment.patient.preferredChannel,
      kind: NOTIFICATION_KIND.CHANGE_REQUEST_ACK,
      status: NOTIFICATION_STATUS.SIMULATED_SENT,
      provider: "simulated",
      templateName: "Acuse de recibo de cambio",
      renderedPreview: `Hemos recibido tu solicitud de cambio para la cita en ${appointment.clinic.name}. Nuestro equipo se pondrá en contacto contigo para reprogramarla.`,
    },
  });

  revalidatePath(`/c/${token}`);
  revalidatePath("/dashboard/citas");
  return {
    ok: true,
    message: "Hemos recibido tu solicitud. El equipo de la clínica se pondrá en contacto contigo para reprogramar.",
  };
}

export async function unsubscribeAction(clinicId: string, patientId: string): Promise<PublicActionResult> {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
  if (!patient) return { ok: false, message: "No hemos encontrado tus datos." };

  await prisma.patient.update({
    where: { id: patient.id },
    data: { unsubscribedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      clinicId,
      entityType: "PATIENT",
      entityId: patient.id,
      action: "UNSUBSCRIBED",
      actor: "paciente",
      detail: "El paciente se dio de baja de recordatorios y comunicaciones.",
    },
  });

  return { ok: true, message: "Te hemos dado de baja. No recibirás más recordatorios ni ofertas de hueco." };
}

export async function respondWaitlistOfferAction(
  token: string,
  accept: boolean,
): Promise<PublicActionResult> {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { publicToken: token },
    include: { appointment: true, waitlistEntry: { include: { patient: true } } },
  });
  if (!offer) return { ok: false, message: "No hemos encontrado esta oferta." };

  const now = await getClinicNow(offer.appointment.clinicId);

  if (offer.status !== OFFER_STATUS.PENDING) {
    return { ok: false, message: "Esta oferta ya no está disponible (ya fue respondida o ha caducado)." };
  }
  if (offer.expiresAt <= now) {
    await prisma.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: OFFER_STATUS.EXPIRED, respondedAt: now },
    });
    return { ok: false, message: "Esta oferta ha caducado. Seguimos avisándote de futuros huecos." };
  }

  if (accept) {
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: offer.appointmentId },
        data: {
          patientId: offer.waitlistEntry.patientId,
          status: APPOINTMENT_STATUS.CONFIRMED,
          source: "WAITLIST",
          filledFromWaitlist: true,
          cancelReason: null,
        },
      }),
      prisma.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: OFFER_STATUS.ACCEPTED, respondedAt: now },
      }),
      prisma.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: WAITLIST_STATUS.BOOKED },
      }),
    ]);
    await prisma.auditLog.create({
      data: {
        clinicId: offer.appointment.clinicId,
        entityType: "WAITLIST",
        entityId: offer.waitlistEntryId,
        action: "OFFER_ACCEPTED",
        actor: "paciente",
        detail: `${offer.waitlistEntry.patient.fullName} aceptó el hueco liberado.`,
      },
    });
    revalidatePath("/dashboard/citas");
    revalidatePath("/dashboard/lista-espera");
    return { ok: true, message: "¡Genial! Tu cita ha quedado reservada en ese hueco." };
  }

  await prisma.waitlistOffer.update({
    where: { id: offer.id },
    data: { status: OFFER_STATUS.DECLINED, respondedAt: now },
  });
  await prisma.waitlistEntry.update({
    where: { id: offer.waitlistEntryId },
    data: { status: WAITLIST_STATUS.WAITING },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: offer.appointment.clinicId,
      entityType: "WAITLIST",
      entityId: offer.waitlistEntryId,
      action: "OFFER_DECLINED",
      actor: "paciente",
      detail: `${offer.waitlistEntry.patient.fullName} rechazó el hueco liberado.`,
    },
  });

  await offerNextWaitlistCandidate(offer.appointmentId, now);

  revalidatePath("/dashboard/lista-espera");
  return { ok: true, message: "De acuerdo, seguimos avisándote en cuanto haya otro hueco compatible." };
}
