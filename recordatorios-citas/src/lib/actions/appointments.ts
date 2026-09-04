"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { demoNow } from "@/lib/demo-clock";
import { offerNextWaitlistCandidate } from "@/lib/reminder-engine";
import { APPOINTMENT_SOURCE, APPOINTMENT_STATUS, CHANNEL } from "@/lib/constants";

export type FormState = { error?: string; success?: string };

async function findOrCreatePatient(
  clinicId: string,
  data: {
    fullName: string;
    phone?: string;
    email?: string;
    preferredChannel?: string;
    consentGiven: boolean;
  },
) {
  const phone = data.phone?.trim() || null;
  const email = data.email?.trim().toLowerCase() || null;

  let patient = null;
  if (phone) {
    patient = await prisma.patient.findFirst({ where: { clinicId, phone } });
  }
  if (!patient && email) {
    patient = await prisma.patient.findFirst({ where: { clinicId, email } });
  }

  if (patient) {
    return prisma.patient.update({
      where: { id: patient.id },
      data: {
        fullName: data.fullName || patient.fullName,
        phone: phone ?? patient.phone,
        email: email ?? patient.email,
        consentGiven: patient.consentGiven || data.consentGiven,
        consentGivenAt: patient.consentGivenAt ?? (data.consentGiven ? new Date() : null),
      },
    });
  }

  return prisma.patient.create({
    data: {
      clinicId,
      fullName: data.fullName,
      phone,
      email,
      preferredChannel: data.preferredChannel || CHANNEL.WHATSAPP,
      consentGiven: data.consentGiven,
      consentGivenAt: data.consentGiven ? new Date() : null,
    },
  });
}

export async function createAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();

  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const service = String(formData.get("service") || "").trim();
  const professionalName = String(formData.get("professionalName") || "").trim();
  const dateValue = String(formData.get("startsAt") || "");
  const durationMinutes = Number(formData.get("durationMinutes") || 30);
  const priceRaw = String(formData.get("price") || "");
  const preferredChannel = String(formData.get("preferredChannel") || CHANNEL.WHATSAPP);
  const consentGiven = formData.get("consentGiven") === "on";

  if (!fullName || !service || !professionalName || !dateValue) {
    return { error: "Completa al menos paciente, servicio, profesional y fecha." };
  }
  if (!phone && !email) {
    return { error: "Indica al menos un teléfono o un email para poder contactar al paciente." };
  }

  const startsAt = new Date(dateValue);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "La fecha y hora no son válidas." };
  }

  const patient = await findOrCreatePatient(session.clinicId, {
    fullName,
    phone,
    email,
    preferredChannel,
    consentGiven,
  });

  const appointment = await prisma.appointment.create({
    data: {
      clinicId: session.clinicId,
      patientId: patient.id,
      service,
      professionalName,
      startsAt,
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
      price: priceRaw ? Number(priceRaw) : null,
      status: APPOINTMENT_STATUS.PENDING,
      source: APPOINTMENT_SOURCE.MANUAL,
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId: session.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      action: "CREATED",
      actor: session.name,
      detail: `Cita creada manualmente para ${patient.fullName}.`,
    },
  });

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  return { success: "Cita creada correctamente." };
}

export type ImportSummary = { created: number; errors: string[] };

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
      return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    });
}

/**
 * Importa citas desde un CSV con cabecera:
 * paciente,telefono,email,servicio,profesional,fecha,hora,duracion,precio
 * "fecha" en formato YYYY-MM-DD y "hora" en HH:MM.
 */
export async function importAppointmentsCsvAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo CSV." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { error: "El archivo está vacío o no tiene filas de datos." };
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const idx = {
    paciente: col("paciente"),
    telefono: col("telefono"),
    email: col("email"),
    servicio: col("servicio"),
    profesional: col("profesional"),
    fecha: col("fecha"),
    hora: col("hora"),
    duracion: col("duracion"),
    precio: col("precio"),
  };

  if (idx.paciente === -1 || idx.servicio === -1 || idx.fecha === -1 || idx.hora === -1) {
    return {
      error:
        "Cabecera CSV inválida. Se esperan al menos las columnas: paciente, servicio, fecha, hora (opcionalmente telefono, email, profesional, duracion, precio).",
    };
  }

  const summary: ImportSummary = { created: 0, errors: [] };

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 1;
    const fullName = row[idx.paciente]?.trim();
    const fecha = row[idx.fecha]?.trim();
    const hora = row[idx.hora]?.trim();
    const servicio = row[idx.servicio]?.trim() || "Consulta";

    if (!fullName || !fecha || !hora) {
      summary.errors.push(`Fila ${rowNumber}: faltan datos obligatorios (paciente, fecha u hora).`);
      continue;
    }

    const startsAt = new Date(`${fecha}T${hora}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      summary.errors.push(`Fila ${rowNumber}: fecha/hora no válidas ("${fecha} ${hora}").`);
      continue;
    }

    const phone = idx.telefono !== -1 ? row[idx.telefono]?.trim() : undefined;
    const email = idx.email !== -1 ? row[idx.email]?.trim() : undefined;
    if (!phone && !email) {
      summary.errors.push(`Fila ${rowNumber}: el paciente necesita teléfono o email.`);
      continue;
    }

    const patient = await findOrCreatePatient(session.clinicId, {
      fullName,
      phone,
      email,
      consentGiven: true,
    });

    const durationMinutes = idx.duracion !== -1 ? Number(row[idx.duracion]) : 30;
    const price = idx.precio !== -1 && row[idx.precio] ? Number(row[idx.precio]) : null;

    await prisma.appointment.create({
      data: {
        clinicId: session.clinicId,
        patientId: patient.id,
        service: servicio,
        professionalName: (idx.profesional !== -1 ? row[idx.profesional]?.trim() : "") || "Sin asignar",
        startsAt,
        durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
        price: price !== null && Number.isFinite(price) ? price : null,
        status: APPOINTMENT_STATUS.PENDING,
        source: APPOINTMENT_SOURCE.IMPORT,
      },
    });

    summary.created += 1;
  }

  await prisma.auditLog.create({
    data: {
      clinicId: session.clinicId,
      entityType: "APPOINTMENT",
      entityId: "bulk-import",
      action: "IMPORTED",
      actor: session.name,
      detail: `Importación CSV: ${summary.created} citas creadas, ${summary.errors.length} filas con error.`,
    },
  });

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");

  if (summary.created === 0) {
    return { error: `No se creó ninguna cita. ${summary.errors.slice(0, 3).join(" ")}` };
  }

  return {
    success: `Se importaron ${summary.created} citas.${
      summary.errors.length ? ` ${summary.errors.length} filas con errores (revisa el formato).` : ""
    }`,
  };
}

export async function markAttendanceAction(appointmentId: string, attended: boolean) {
  const session = await requireSession();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId: session.clinicId },
  });
  if (!appointment) return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: attended ? APPOINTMENT_STATUS.COMPLETED : APPOINTMENT_STATUS.NO_SHOW },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: session.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointmentId,
      action: attended ? "COMPLETED" : "NO_SHOW",
      actor: session.name,
      detail: attended ? "Marcada como asistida por el equipo." : "Marcada como ausencia por el equipo.",
    },
  });

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
}

export async function staffCancelAppointmentAction(appointmentId: string, reason: string) {
  const session = await requireSession();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId: session.clinicId },
  });
  if (!appointment) return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: APPOINTMENT_STATUS.CANCELLED, cancelReason: reason || "Cancelada por la clínica." },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: session.clinicId,
      entityType: "APPOINTMENT",
      entityId: appointmentId,
      action: "CANCELLED",
      actor: session.name,
      detail: reason || "Cancelada por el equipo de la clínica.",
    },
  });

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  await offerNextWaitlistCandidate(appointmentId, demoNow(clinic.demoClockOffsetMinutes));

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/lista-espera");
}
