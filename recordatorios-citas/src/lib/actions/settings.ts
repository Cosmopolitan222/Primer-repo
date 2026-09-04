"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { runEngineForClinic, type EngineSummary } from "@/lib/reminder-engine";
import type { FormState } from "@/lib/actions/appointments";

export async function updateClinicSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const timezone = String(formData.get("timezone") || "Europe/Madrid").trim();
  const avgAppointmentValueRaw = String(formData.get("avgAppointmentValue") || "");
  const consentText = String(formData.get("consentText") || "").trim();

  if (!name) return { error: "El nombre de la clínica es obligatorio." };

  const avgAppointmentValue = Number(avgAppointmentValueRaw);
  if (!Number.isFinite(avgAppointmentValue) || avgAppointmentValue < 0) {
    return { error: "El valor medio por cita debe ser un número válido." };
  }

  await prisma.clinic.update({
    where: { id: session.clinicId },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      timezone: timezone || "Europe/Madrid",
      avgAppointmentValue,
      consentText: consentText || undefined,
    },
  });

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard");
  return { success: "Ajustes guardados." };
}

export async function advanceDemoClockAction(minutes: number) {
  const session = await requireSession();
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  await prisma.clinic.update({
    where: { id: session.clinicId },
    data: { demoClockOffsetMinutes: clinic.demoClockOffsetMinutes + minutes },
  });
  await runEngineForClinic(session.clinicId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard/lista-espera");
  revalidatePath("/dashboard/auditoria");
  revalidatePath("/dashboard/ajustes");
}

export async function resetDemoClockAction() {
  const session = await requireSession();
  await prisma.clinic.update({ where: { id: session.clinicId }, data: { demoClockOffsetMinutes: 0 } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ajustes");
}

export async function runEngineAction(): Promise<EngineSummary> {
  const session = await requireSession();
  const summary = await runEngineForClinic(session.clinicId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard/lista-espera");
  revalidatePath("/dashboard/auditoria");

  return summary;
}
