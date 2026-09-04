"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import type { FormState } from "@/lib/actions/appointments";

export async function createSequenceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Ponle un nombre a la secuencia." };

  await prisma.reminderSequence.create({ data: { clinicId: session.clinicId, name } });
  revalidatePath("/dashboard/secuencias");
  return { success: "Secuencia creada." };
}

export async function toggleSequenceAction(id: string) {
  const session = await requireSession();
  const sequence = await prisma.reminderSequence.findFirst({ where: { id, clinicId: session.clinicId } });
  if (!sequence) return;
  await prisma.reminderSequence.update({ where: { id }, data: { active: !sequence.active } });
  revalidatePath("/dashboard/secuencias");
}

export async function deleteSequenceAction(id: string) {
  const session = await requireSession();
  await prisma.reminderSequence.deleteMany({ where: { id, clinicId: session.clinicId } });
  revalidatePath("/dashboard/secuencias");
}

export async function addStepAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const sequenceId = String(formData.get("sequenceId") || "");
  const offsetValue = Number(formData.get("offsetValue") || 0);
  const offsetUnit = String(formData.get("offsetUnit") || "hours"); // minutes | hours | days
  const channel = String(formData.get("channel") || "WHATSAPP");
  const templateId = String(formData.get("templateId") || "");

  const sequence = await prisma.reminderSequence.findFirst({
    where: { id: sequenceId, clinicId: session.clinicId },
  });
  if (!sequence) return { error: "Secuencia no encontrada." };
  if (!templateId) return { error: "Selecciona una plantilla para este paso." };
  if (!Number.isFinite(offsetValue) || offsetValue < 0) return { error: "El tiempo de antelación no es válido." };

  const multiplier = offsetUnit === "days" ? 60 * 24 : offsetUnit === "hours" ? 60 : 1;
  const offsetMinutesBefore = Math.round(offsetValue * multiplier);

  const stepCount = await prisma.reminderStep.count({ where: { sequenceId } });

  await prisma.reminderStep.create({
    data: { sequenceId, offsetMinutesBefore, channel, templateId, order: stepCount },
  });

  revalidatePath("/dashboard/secuencias");
  return { success: "Paso añadido a la secuencia." };
}

export async function deleteStepAction(stepId: string) {
  const session = await requireSession();
  const step = await prisma.reminderStep.findFirst({
    where: { id: stepId, sequence: { clinicId: session.clinicId } },
  });
  if (!step) return;
  await prisma.reminderStep.delete({ where: { id: stepId } });
  revalidatePath("/dashboard/secuencias");
}
