"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import type { FormState } from "@/lib/actions/appointments";

export async function saveTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const channel = String(formData.get("channel") || "WHATSAPP");
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!name || !body) {
    return { error: "La plantilla necesita un nombre y un cuerpo de mensaje." };
  }

  if (id) {
    const existing = await prisma.messageTemplate.findFirst({ where: { id, clinicId: session.clinicId } });
    if (!existing) return { error: "Plantilla no encontrada." };
    await prisma.messageTemplate.update({
      where: { id },
      data: { name, channel, subject: subject || null, body },
    });
  } else {
    await prisma.messageTemplate.create({
      data: { clinicId: session.clinicId, name, channel, subject: subject || null, body },
    });
  }

  revalidatePath("/dashboard/plantillas");
  revalidatePath("/dashboard/secuencias");
  return { success: "Plantilla guardada." };
}

export async function deleteTemplateAction(id: string) {
  const session = await requireSession();
  const inUse = await prisma.reminderStep.findFirst({ where: { templateId: id } });
  if (inUse) return;
  await prisma.messageTemplate.deleteMany({ where: { id, clinicId: session.clinicId } });
  revalidatePath("/dashboard/plantillas");
}
