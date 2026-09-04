"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { demoNow } from "@/lib/demo-clock";
import { offerNextWaitlistCandidate } from "@/lib/reminder-engine";
import { WAITLIST_STATUS, CHANNEL } from "@/lib/constants";
import type { FormState } from "@/lib/actions/appointments";

export async function addWaitlistEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();

  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const service = String(formData.get("service") || "").trim();
  const professionalName = String(formData.get("professionalName") || "").trim();
  const preferredFromRaw = String(formData.get("preferredFrom") || "");
  const preferredToRaw = String(formData.get("preferredTo") || "");
  const consentGiven = formData.get("consentGiven") === "on";

  if (!fullName || !service || !preferredFromRaw || !preferredToRaw) {
    return { error: "Completa paciente, servicio y el rango de fechas en el que puede acudir." };
  }
  if (!phone && !email) {
    return { error: "Indica al menos un teléfono o un email de contacto." };
  }

  const preferredFrom = new Date(preferredFromRaw);
  const preferredTo = new Date(preferredToRaw);
  if (Number.isNaN(preferredFrom.getTime()) || Number.isNaN(preferredTo.getTime()) || preferredFrom > preferredTo) {
    return { error: "El rango de fechas no es válido." };
  }

  let patient = phone
    ? await prisma.patient.findFirst({ where: { clinicId: session.clinicId, phone } })
    : null;
  if (!patient && email) {
    patient = await prisma.patient.findFirst({ where: { clinicId: session.clinicId, email } });
  }
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        clinicId: session.clinicId,
        fullName,
        phone: phone || null,
        email: email || null,
        preferredChannel: CHANNEL.WHATSAPP,
        consentGiven,
        consentGivenAt: consentGiven ? new Date() : null,
      },
    });
  }

  await prisma.waitlistEntry.create({
    data: {
      clinicId: session.clinicId,
      patientId: patient.id,
      service,
      professionalName: professionalName || null,
      preferredFrom,
      preferredTo,
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId: session.clinicId,
      entityType: "WAITLIST",
      entityId: patient.id,
      action: "CREATED",
      actor: session.name,
      detail: `${patient.fullName} añadido a la lista de espera para ${service}.`,
    },
  });

  revalidatePath("/dashboard/lista-espera");
  return { success: "Paciente añadido a la lista de espera." };
}

export async function removeWaitlistEntryAction(id: string) {
  const session = await requireSession();
  await prisma.waitlistEntry.updateMany({
    where: { id, clinicId: session.clinicId },
    data: { status: WAITLIST_STATUS.CANCELLED },
  });
  revalidatePath("/dashboard/lista-espera");
}

/** Botón "Buscar hueco ahora" para forzar el intento de oferta a una cita cancelada concreta. */
export async function retryWaitlistOfferAction(appointmentId: string) {
  const session = await requireSession();
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  await offerNextWaitlistCandidate(appointmentId, demoNow(clinic.demoClockOffsetMinutes));
  revalidatePath("/dashboard/lista-espera");
  revalidatePath("/dashboard/citas");
}
