import "server-only";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/notifications";
import { buildContextDateParts, renderTemplate } from "@/lib/templates";
import { demoNow } from "@/lib/demo-clock";
import {
  APPOINTMENT_STATUS,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NO_SHOW_GRACE_MINUTES,
  OFFER_STATUS,
  WAITLIST_OFFER_WINDOW_MINUTES,
  WAITLIST_STATUS,
  type Channel,
} from "@/lib/constants";
import type { Clinic, Patient } from "@/generated/prisma/client";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export type EngineSummary = {
  remindersSent: number;
  remindersFailed: number;
  noShowsDetected: number;
  offersExpired: number;
  offersSent: number;
};

async function logAudit(
  clinicId: string,
  entityType: string,
  entityId: string,
  action: string,
  actor: string,
  detail?: string,
) {
  await prisma.auditLog.create({
    data: { clinicId, entityType, entityId, action, actor, detail },
  });
}

function confirmationUrl(token: string) {
  return `${BASE_URL}/c/${token}`;
}

function offerUrl(token: string) {
  return `${BASE_URL}/o/${token}`;
}

function unsubscribeContext(clinicId: string, patientId: string) {
  return `${BASE_URL}/baja/${clinicId}/${patientId}`;
}

async function sendAndLog(params: {
  clinic: Clinic;
  patient: Patient;
  appointmentId: string;
  channel: Channel;
  kind: (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];
  templateName: string;
  subject?: string | null;
  body: string;
  reminderStepId?: string;
}) {
  const { patient, appointmentId, channel, kind, templateName, subject, body, reminderStepId } = params;

  // Respeta el consentimiento y la baja de comunicaciones: no se envía
  // nada, pero queda registrado para trazabilidad de por qué no se envió.
  if (!patient.consentGiven || patient.unsubscribedAt) {
    return prisma.notificationLog.create({
      data: {
        appointmentId,
        reminderStepId,
        channel,
        kind,
        status: NOTIFICATION_STATUS.FAILED,
        provider: "n/a",
        templateName,
        renderedPreview: body,
        errorMessage: patient.unsubscribedAt
          ? "El paciente se dio de baja de las comunicaciones."
          : "El paciente no tiene consentimiento registrado para recibir comunicaciones.",
      },
    });
  }

  const provider = getProvider(channel);
  const result = await provider.send({
    to: { phone: patient.phone, email: patient.email, name: patient.fullName },
    channel,
    subject,
    body,
  });

  return prisma.notificationLog.create({
    data: {
      appointmentId,
      reminderStepId,
      channel,
      kind,
      status: result.ok ? NOTIFICATION_STATUS.SIMULATED_SENT : NOTIFICATION_STATUS.FAILED,
      provider: result.providerName,
      templateName,
      renderedPreview: body,
      errorMessage: result.error,
    },
  });
}

/** Construye el cuerpo del mensaje a partir de una plantilla y una cita. */
function renderForAppointment(
  templateBody: string,
  clinic: Clinic,
  patient: Patient,
  appointment: { service: string; professionalName: string; startsAt: Date; publicToken: string },
) {
  const { fecha, hora } = buildContextDateParts(appointment.startsAt, clinic.timezone);
  return renderTemplate(templateBody, {
    pacienteNombre: patient.fullName,
    clinicaNombre: clinic.name,
    clinicaTelefono: clinic.phone,
    servicio: appointment.service,
    profesional: appointment.professionalName,
    fecha,
    hora,
    enlaceConfirmacion: confirmationUrl(appointment.publicToken),
    enlaceBaja: unsubscribeContext(clinic.id, patient.id),
  });
}

/** Paso 1: envía los recordatorios programados que ya tocan. */
async function processDueReminders(clinic: Clinic, now: Date): Promise<{ sent: number; failed: number }> {
  const sequences = await prisma.reminderSequence.findMany({
    where: { clinicId: clinic.id, active: true },
    include: { steps: { include: { template: true } } },
  });

  let sent = 0;
  let failed = 0;

  const candidateAppointments = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: { in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED] },
      startsAt: { gt: now },
    },
    include: { patient: true },
  });

  for (const sequence of sequences) {
    for (const step of sequence.steps) {
      for (const appointment of candidateAppointments) {
        const dueAt = new Date(appointment.startsAt.getTime() - step.offsetMinutesBefore * 60_000);
        if (dueAt > now) continue;

        const alreadySent = await prisma.notificationLog.findFirst({
          where: { appointmentId: appointment.id, reminderStepId: step.id },
        });
        if (alreadySent) continue;

        const body = renderForAppointment(step.template.body, clinic, appointment.patient, appointment);
        const log = await sendAndLog({
          clinic,
          patient: appointment.patient,
          appointmentId: appointment.id,
          channel: step.channel as Channel,
          kind: NOTIFICATION_KIND.REMINDER,
          templateName: step.template.name,
          subject: step.template.subject,
          body,
          reminderStepId: step.id,
        });

        if ((await log).status === NOTIFICATION_STATUS.SIMULATED_SENT) {
          sent += 1;
          await logAudit(
            clinic.id,
            "APPOINTMENT",
            appointment.id,
            "REMINDER_SENT",
            "sistema",
            `Recordatorio "${sequence.name}" (${step.channel}) enviado a ${appointment.patient.fullName}.`,
          );
        } else {
          failed += 1;
        }
      }
    }
  }

  return { sent, failed };
}

/** Paso 2: marca como ausencia las citas cuya hora ya pasó sin respuesta. */
async function detectNoShows(clinic: Clinic, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60_000);

  const overdue = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: { in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED] },
    },
  });

  let count = 0;
  for (const appointment of overdue) {
    const endsAt = new Date(appointment.startsAt.getTime() + appointment.durationMinutes * 60_000);
    if (endsAt > cutoff) continue;

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: APPOINTMENT_STATUS.NO_SHOW },
    });
    await logAudit(
      clinic.id,
      "APPOINTMENT",
      appointment.id,
      "NO_SHOW",
      "sistema",
      "Marcada automáticamente como ausencia: pasó la hora de la cita sin asistencia registrada.",
    );
    count += 1;
  }
  return count;
}

/** Ofrece una cita cancelada al siguiente candidato compatible de la lista de espera. */
export async function offerNextWaitlistCandidate(appointmentId: string, now: Date): Promise<boolean> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { clinic: true },
  });
  if (!appointment || appointment.status !== APPOINTMENT_STATUS.CANCELLED) return false;
  if (appointment.startsAt <= now) return false;

  const alreadyTriedEntryIds = (
    await prisma.waitlistOffer.findMany({
      where: { appointmentId },
      select: { waitlistEntryId: true },
    })
  ).map((o) => o.waitlistEntryId);

  const candidate = await prisma.waitlistEntry.findFirst({
    where: {
      clinicId: appointment.clinicId,
      status: WAITLIST_STATUS.WAITING,
      service: appointment.service,
      preferredFrom: { lte: appointment.startsAt },
      preferredTo: { gte: appointment.startsAt },
      id: { notIn: alreadyTriedEntryIds },
    },
    orderBy: { createdAt: "asc" },
    include: { patient: true },
  });

  if (!candidate) return false;

  const expiresAt = new Date(now.getTime() + WAITLIST_OFFER_WINDOW_MINUTES * 60_000);
  const offer = await prisma.waitlistOffer.create({
    data: { waitlistEntryId: candidate.id, appointmentId, expiresAt },
  });

  await prisma.waitlistEntry.update({
    where: { id: candidate.id },
    data: { status: WAITLIST_STATUS.OFFERED },
  });

  const template = await getWaitlistOfferTemplate(appointment.clinicId, appointment.clinic);
  const body = renderTemplate(template.body, {
    pacienteNombre: candidate.patient.fullName,
    clinicaNombre: appointment.clinic.name,
    clinicaTelefono: appointment.clinic.phone,
    servicio: appointment.service,
    profesional: appointment.professionalName,
    ...buildContextDateParts(appointment.startsAt, appointment.clinic.timezone),
    enlaceConfirmacion: offerUrl(offer.publicToken),
    enlaceBaja: unsubscribeContext(appointment.clinicId, candidate.patientId),
  });

  await sendAndLog({
    clinic: appointment.clinic,
    patient: candidate.patient,
    appointmentId: appointment.id,
    channel: (candidate.patient.preferredChannel as Channel) ?? "WHATSAPP",
    kind: NOTIFICATION_KIND.WAITLIST_OFFER,
    templateName: template.name,
    body,
  });

  await logAudit(
    appointment.clinicId,
    "WAITLIST",
    candidate.id,
    "OFFER_SENT",
    "sistema",
    `Hueco del ${appointment.startsAt.toISOString()} ofrecido a ${candidate.patient.fullName}.`,
  );

  return true;
}

async function getWaitlistOfferTemplate(clinicId: string, clinic: Clinic) {
  const existing = await prisma.messageTemplate.findFirst({
    where: { clinicId, channel: { in: ["WHATSAPP", "SMS", "EMAIL"] }, name: "Oferta de lista de espera" },
  });
  if (existing) return existing;

  return prisma.messageTemplate.create({
    data: {
      clinicId,
      name: "Oferta de lista de espera",
      channel: "WHATSAPP",
      body:
        `Hola {{paciente}}, se ha liberado un hueco en ${clinic.name} el {{fecha}} a las {{hora}} ` +
        `para {{servicio}} con {{profesional}}. ¿Lo quieres? Confírmalo aquí: {{enlace_confirmacion}} ` +
        `(disponible por tiempo limitado). Baja: {{enlace_baja}}`,
    },
  });
}

/** Paso 3: expira ofertas de lista de espera caducadas e intenta con el siguiente. */
async function processExpiredOffers(clinic: Clinic, now: Date): Promise<{ expired: number; reoffered: number }> {
  const expired = await prisma.waitlistOffer.findMany({
    where: { status: OFFER_STATUS.PENDING, expiresAt: { lte: now } },
    include: { waitlistEntry: true },
  });

  let reoffered = 0;
  for (const offer of expired) {
    await prisma.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: OFFER_STATUS.EXPIRED, respondedAt: now },
    });
    // Si el paciente no ha sido reservado en otro sitio, vuelve a "en espera".
    const entry = await prisma.waitlistEntry.findUnique({ where: { id: offer.waitlistEntryId } });
    if (entry && entry.status === WAITLIST_STATUS.OFFERED) {
      await prisma.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: WAITLIST_STATUS.WAITING },
      });
    }
    await logAudit(
      clinic.id,
      "WAITLIST",
      offer.waitlistEntryId,
      "OFFER_EXPIRED",
      "sistema",
      "La oferta de hueco caducó sin respuesta del paciente.",
    );

    const offeredAgain = await offerNextWaitlistCandidate(offer.appointmentId, now);
    if (offeredAgain) reoffered += 1;
  }

  return { expired: expired.length, reoffered };
}

/**
 * Paso 4: busca huecos libres (citas canceladas en el futuro) que todavía
 * no tienen ninguna oferta pendiente y trata de ofrecerlos a la lista de
 * espera. Cubre tanto el caso de una cancelación reciente como el de un
 * paciente añadido a la lista de espera *después* de que el hueco ya
 * estuviera cancelado.
 */
async function offerFreeSlots(clinic: Clinic, now: Date): Promise<number> {
  const freeSlots = await prisma.appointment.findMany({
    where: { clinicId: clinic.id, status: APPOINTMENT_STATUS.CANCELLED, startsAt: { gt: now } },
    select: { id: true },
  });

  let offered = 0;
  for (const slot of freeSlots) {
    const hasPendingOffer = await prisma.waitlistOffer.findFirst({
      where: { appointmentId: slot.id, status: OFFER_STATUS.PENDING },
    });
    if (hasPendingOffer) continue;

    const wasOffered = await offerNextWaitlistCandidate(slot.id, now);
    if (wasOffered) offered += 1;
  }
  return offered;
}

/**
 * Punto de entrada único del motor de automatización. Se puede llamar:
 *  - Manualmente desde el panel ("Procesar ahora").
 *  - Desde /api/cron/process, para desplegar en entornos sin proceso en
 *    segundo plano (serverless) usando un programador externo gratuito.
 *  - Desde el planificador en segundo plano (ver src/instrumentation.ts).
 */
export async function runEngineForClinic(clinicId: string): Promise<EngineSummary> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const now = demoNow(clinic.demoClockOffsetMinutes);

  const { sent, failed } = await processDueReminders(clinic, now);
  const noShowsDetected = await detectNoShows(clinic, now);
  const { expired, reoffered } = await processExpiredOffers(clinic, now);
  const freeSlotsOffered = await offerFreeSlots(clinic, now);

  return {
    remindersSent: sent,
    remindersFailed: failed,
    noShowsDetected,
    offersExpired: expired,
    offersSent: reoffered + freeSlotsOffered,
  };
}

export async function runEngineForAllClinics(): Promise<Record<string, EngineSummary>> {
  const clinics = await prisma.clinic.findMany({ select: { id: true } });
  const results: Record<string, EngineSummary> = {};
  for (const clinic of clinics) {
    results[clinic.id] = await runEngineForClinic(clinic.id);
  }
  return results;
}
