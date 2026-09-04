import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { CLINIC_SLUG } from "../src/lib/constants";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: databaseUrl.replace(/^file:/, "") });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function at(offsetMs: number, hour: number, minute = 0) {
  const base = new Date(Date.now() + offsetMs);
  base.setHours(hour, minute, 0, 0);
  return base;
}

async function main() {
  console.log("Borrando datos anteriores...");
  await prisma.auditLog.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.waitlistOffer.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.reminderStep.deleteMany();
  await prisma.reminderSequence.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  console.log("Creando clínica de demostración...");
  const clinic = await prisma.clinic.create({
    data: {
      slug: CLINIC_SLUG,
      name: "Clínica Dental Sonrisa",
      timezone: "Europe/Madrid",
      currency: "EUR",
      phone: "+34 910 123 456",
      email: "recepcion@clinicasonrisa.example",
      address: "Calle Mayor 24, 28013 Madrid",
      avgAppointmentValue: 55,
      consentText:
        "Al confirmar tu cita aceptas recibir recordatorios relacionados con ella por WhatsApp, SMS o email. Puedes darte de baja en cualquier momento desde el propio mensaje.",
      privacyNoticeUrl: null,
    },
  });

  const adminEmail = "jose1192004@gmail.com";
  const adminPasswordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.create({
    data: {
      clinicId: clinic.id,
      name: "Jose (Administración)",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      clinicId: clinic.id,
      name: "Recepción Sonrisa",
      email: "recepcion@clinicasonrisa.example",
      passwordHash: await bcrypt.hash("demo1234", 10),
      role: "STAFF",
    },
  });

  console.log("Creando plantillas de mensaje...");
  const templateConfirm72 = await prisma.messageTemplate.create({
    data: {
      clinicId: clinic.id,
      name: "Recordatorio 72h — confirmación",
      channel: "WHATSAPP",
      body:
        "Hola {{paciente}} 👋 Te escribimos de {{clinica}} para recordarte tu cita de {{servicio}} con {{profesional}} el {{fecha}} a las {{hora}}. ¿Puedes confirmarla? {{enlace_confirmacion}}\n\nSi necesitas cambiarla, hazlo desde el mismo enlace. Baja: {{enlace_baja}}",
      isDefault: true,
    },
  });
  const templateReminder24 = await prisma.messageTemplate.create({
    data: {
      clinicId: clinic.id,
      name: "Recordatorio 24h",
      channel: "WHATSAPP",
      body:
        "Recordatorio: mañana {{fecha}} a las {{hora}} tienes cita de {{servicio}} en {{clinica}} con {{profesional}}. Gestiona tu cita aquí: {{enlace_confirmacion}}",
      isDefault: true,
    },
  });
  const templateReminderSms = await prisma.messageTemplate.create({
    data: {
      clinicId: clinic.id,
      name: "Recordatorio SMS mismo día",
      channel: "SMS",
      body:
        "{{clinica}}: hoy {{hora}} tienes cita ({{servicio}}). Si no puedes venir, avísanos: {{enlace_confirmacion}}",
    },
  });
  await prisma.messageTemplate.create({
    data: {
      clinicId: clinic.id,
      name: "Email primera visita",
      channel: "EMAIL",
      subject: "Tu próxima cita en {{clinica}}",
      body:
        "Hola {{paciente}},\n\nTe confirmamos tu próxima cita:\n\nServicio: {{servicio}}\nProfesional: {{profesional}}\nFecha: {{fecha}} a las {{hora}}\n\nPuedes confirmar, cancelar o pedir un cambio de horario aquí: {{enlace_confirmacion}}\n\nUn saludo,\n{{clinica}} — {{telefono_clinica}}",
    },
  });

  console.log("Creando secuencia de recordatorios activa...");
  const sequence = await prisma.reminderSequence.create({
    data: { clinicId: clinic.id, name: "Secuencia estándar", active: true },
  });
  await prisma.reminderStep.createMany({
    data: [
      {
        sequenceId: sequence.id,
        offsetMinutesBefore: 72 * 60,
        channel: "WHATSAPP",
        templateId: templateConfirm72.id,
        order: 0,
      },
      {
        sequenceId: sequence.id,
        offsetMinutesBefore: 24 * 60,
        channel: "WHATSAPP",
        templateId: templateReminder24.id,
        order: 1,
      },
      {
        sequenceId: sequence.id,
        offsetMinutesBefore: 180,
        channel: "SMS",
        templateId: templateReminderSms.id,
        order: 2,
      },
    ],
  });

  await prisma.reminderSequence.create({
    data: { clinicId: clinic.id, name: "Secuencia primeras visitas (email)", active: false },
  });

  console.log("Creando pacientes...");
  const patientDefs = [
    { fullName: "María López García", phone: "+34 611 234 567", email: "maria.lopez@example.com" },
    { fullName: "Javier Fernández Ruiz", phone: "+34 622 345 678", email: "javier.fernandez@example.com" },
    { fullName: "Lucía Martín Serrano", phone: "+34 633 456 789", email: "lucia.martin@example.com" },
    { fullName: "Antonio Ruiz Domínguez", phone: "+34 644 567 890", email: "antonio.ruiz@example.com" },
    { fullName: "Carmen Sánchez Ortiz", phone: "+34 655 678 901", email: "carmen.sanchez@example.com" },
    { fullName: "Pablo Torres Navarro", phone: "+34 666 789 012", email: "pablo.torres@example.com" },
    { fullName: "Isabel Romero Castro", phone: "+34 677 890 123", email: "isabel.romero@example.com" },
    { fullName: "Diego Navarro Molina", phone: "+34 688 901 234", email: "diego.navarro@example.com" },
    { fullName: "Sofía Iglesias Vidal", phone: "+34 699 012 345", email: "sofia.iglesias@example.com" },
    { fullName: "Manuel Ortega Delgado", phone: "+34 610 123 456", email: "manuel.ortega@example.com" },
    { fullName: "Elena Castro Pascual", phone: "+34 621 234 567", email: "elena.castro@example.com" },
    {
      fullName: "Alberto Molina Vega",
      phone: "+34 632 345 678",
      email: "alberto.molina@example.com",
      unsubscribed: true,
    },
    {
      fullName: "Marta Delgado Herrero",
      phone: "+34 643 456 789",
      email: "marta.delgado@example.com",
      noConsent: true,
    },
    { fullName: "Sergio Pascual Blanco", phone: "+34 654 567 890", email: "sergio.pascual@example.com" },
  ] as const;

  const patients: Record<string, Awaited<ReturnType<typeof prisma.patient.create>>> = {};
  for (const def of patientDefs) {
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        fullName: def.fullName,
        phone: def.phone,
        email: def.email,
        preferredChannel: "WHATSAPP",
        consentGiven: !("noConsent" in def && def.noConsent),
        consentGivenAt: "noConsent" in def && def.noConsent ? null : new Date(Date.now() - 60 * DAY),
        unsubscribedAt: "unsubscribed" in def && def.unsubscribed ? new Date(Date.now() - 5 * DAY) : null,
      },
    });
    patients[def.fullName] = patient;
  }

  const professionals = ["Dra. Elena Vidal", "Dr. Marcos Ibáñez", "Dra. Laura Gómez"];
  const services: Array<{ name: string; price: number; duration: number }> = [
    { name: "Revisión y limpieza", price: 45, duration: 30 },
    { name: "Primera visita", price: 0, duration: 30 },
    { name: "Ortodoncia — revisión", price: 35, duration: 20 },
    { name: "Endodoncia", price: 180, duration: 60 },
    { name: "Blanqueamiento dental", price: 150, duration: 45 },
    { name: "Empaste", price: 70, duration: 30 },
  ];

  const names = Object.keys(patients);
  let nameIndex = 0;
  const nextPatient = () => patients[names[nameIndex++ % names.length]];

  console.log("Creando citas pasadas (historial)...");

  // 1) Completada, confirmada previamente por el paciente vía enlace.
  {
    const patient = nextPatient();
    const svc = services[0];
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[0],
        startsAt: at(-10 * DAY, 10, 0),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "COMPLETED",
        source: "MANUAL",
      },
    });
    await prisma.notificationLog.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        kind: "REMINDER",
        status: "SIMULATED_SENT",
        provider: "simulated",
        templateName: templateConfirm72.name,
        renderedPreview: `Hola ${patient.fullName}, recordatorio de tu cita de ${svc.name}...`,
        createdAt: at(-13 * DAY, 9, 0),
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "CONFIRMED",
        actor: "paciente",
        detail: "El paciente confirmó la cita desde el enlace público.",
        createdAt: at(-12 * DAY, 18, 30),
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "COMPLETED",
        actor: "Recepción Sonrisa",
        detail: "Marcada como asistida por el equipo.",
        createdAt: at(-10 * DAY, 10, 35),
      },
    });
  }

  // 2) Ausencia (no-show): se envió recordatorio pero no confirmó ni vino.
  {
    const patient = nextPatient();
    const svc = services[2];
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[1],
        startsAt: at(-8 * DAY, 12, 30),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "NO_SHOW",
        source: "MANUAL",
      },
    });
    await prisma.notificationLog.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        kind: "REMINDER",
        status: "SIMULATED_SENT",
        provider: "simulated",
        templateName: templateReminder24.name,
        renderedPreview: `Recordatorio: mañana tienes cita de ${svc.name}...`,
        createdAt: at(-9 * DAY, 12, 30),
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "NO_SHOW",
        actor: "sistema",
        detail: "Marcada automáticamente como ausencia: pasó la hora de la cita sin asistencia registrada.",
        createdAt: at(-8 * DAY, 13, 0),
      },
    });
  }

  // 3) Completada normal.
  {
    const patient = nextPatient();
    const svc = services[4];
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[2],
        startsAt: at(-6 * DAY, 17, 0),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "COMPLETED",
        source: "MANUAL",
      },
    });
  }

  // 4) Cancelada por el paciente, sin ofrecer a lista de espera (hueco perdido).
  {
    const patient = nextPatient();
    const svc = services[0];
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[0],
        startsAt: at(-5 * DAY, 9, 30),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "CANCELLED",
        cancelReason: "Imprevisto de trabajo",
        source: "MANUAL",
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "CANCELLED",
        actor: "paciente",
        detail: "Motivo indicado: Imprevisto de trabajo",
        createdAt: at(-6 * DAY, 20, 0),
      },
    });
  }

  // 5) Otra ausencia.
  {
    const patient = nextPatient();
    const svc = services[5];
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[1],
        startsAt: at(-4 * DAY, 16, 0),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "NO_SHOW",
        source: "MANUAL",
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "NO_SHOW",
        actor: "sistema",
        detail: "Marcada automáticamente como ausencia.",
        createdAt: at(-4 * DAY, 16, 30),
      },
    });
  }

  // 6) Completada y llenada gracias a la lista de espera (recuperación real).
  {
    const patient = nextPatient();
    const svc = services[0];
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: svc.name,
        professionalName: professionals[2],
        startsAt: at(-2 * DAY, 11, 0),
        durationMinutes: svc.duration,
        price: svc.price,
        status: "COMPLETED",
        source: "WAITLIST",
        filledFromWaitlist: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "WAITLIST",
        entityId: patient.id,
        action: "OFFER_ACCEPTED",
        actor: "paciente",
        detail: `${patient.fullName} aceptó el hueco liberado por otra cancelación.`,
        createdAt: at(-3 * DAY, 9, 0),
      },
    });
  }

  console.log("Creando citas futuras (para ver la app en marcha)...");

  // 7) Muy pronto (dentro de 90 minutos): al pulsar "Procesar ahora" se
  // verá un recordatorio SMS enviándose en directo (el paso de 3h ya está
  // vencido para esta cita).
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[0].name,
      professionalName: professionals[0],
      startsAt: new Date(Date.now() + 90 * 60_000),
      durationMinutes: services[0].duration,
      price: services[0].price,
      status: "PENDING",
      source: "MANUAL",
    },
  });

  // 8) Dentro de unas 20 horas: el paso de 24h ya estará vencido = otro
  // recordatorio en directo al procesar.
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[2].name,
      professionalName: professionals[1],
      startsAt: new Date(Date.now() + 20 * HOUR),
      durationMinutes: services[2].duration,
      price: services[2].price,
      status: "PENDING",
      source: "MANUAL",
    },
  });

  // 9) Mañana, ya confirmada por el paciente (aporta a "ingresos protegidos").
  {
    const patient = nextPatient();
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        service: services[4].name,
        professionalName: professionals[2],
        startsAt: at(DAY, 12, 0),
        durationMinutes: services[4].duration,
        price: services[4].price,
        status: "CONFIRMED",
        source: "MANUAL",
      },
    });
    await prisma.notificationLog.create({
      data: {
        appointmentId: appt.id,
        channel: "WHATSAPP",
        kind: "REMINDER",
        status: "SIMULATED_SENT",
        provider: "simulated",
        templateName: templateReminder24.name,
        renderedPreview: `Recordatorio: mañana tienes cita de ${services[4].name}...`,
        createdAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        entityType: "APPOINTMENT",
        entityId: appt.id,
        action: "CONFIRMED",
        actor: "paciente",
        detail: "El paciente confirmó la cita desde el enlace público.",
      },
    });
  }

  // 10) Dentro de 3 días: pendiente (sin confirmar todavía).
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[1].name,
      professionalName: professionals[0],
      startsAt: at(3 * DAY, 9, 30),
      durationMinutes: services[1].duration,
      price: services[1].price,
      status: "PENDING",
      source: "MANUAL",
    },
  });

  // 11) Dentro de 4 días: CANCELADA ahora mismo (por el equipo) y con un
  // paciente compatible ya esperando: al pulsar "Procesar ahora" se verá
  // en directo cómo se le ofrece el hueco.
  const freedAppointment = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[0].name,
      professionalName: professionals[1],
      startsAt: at(4 * DAY, 10, 0),
      durationMinutes: services[0].duration,
      price: services[0].price,
      status: "CANCELLED",
      cancelReason: "El paciente ya no puede acudir",
      source: "MANUAL",
    },
  });
  await prisma.auditLog.create({
    data: {
      clinicId: clinic.id,
      entityType: "APPOINTMENT",
      entityId: freedAppointment.id,
      action: "CANCELLED",
      actor: "paciente",
      detail: "Motivo indicado: El paciente ya no puede acudir",
    },
  });

  // 12) y 13) Un par de citas más, más adelante.
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[3].name,
      professionalName: professionals[2],
      startsAt: at(5 * DAY, 17, 30),
      durationMinutes: services[3].duration,
      price: services[3].price,
      status: "PENDING",
      source: "MANUAL",
    },
  });
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: nextPatient().id,
      service: services[0].name,
      professionalName: professionals[0],
      startsAt: at(7 * DAY, 11, 30),
      durationMinutes: services[0].duration,
      price: services[0].price,
      status: "PENDING",
      source: "MANUAL",
    },
  });

  console.log("Creando lista de espera...");
  // Coincide en servicio y rango de fechas con la cita cancelada (#11), para
  // que "Procesar ahora" ofrezca el hueco automáticamente en la demo.
  await prisma.waitlistEntry.create({
    data: {
      clinicId: clinic.id,
      patientId: patients["Sofía Iglesias Vidal"].id,
      service: services[0].name,
      preferredFrom: at(2 * DAY, 0, 0),
      preferredTo: at(6 * DAY, 23, 59),
      professionalName: null,
      notes: "Prefiere por la mañana si es posible.",
    },
  });
  await prisma.waitlistEntry.create({
    data: {
      clinicId: clinic.id,
      patientId: patients["Manuel Ortega Delgado"].id,
      service: services[0].name,
      preferredFrom: at(2 * DAY, 0, 0),
      preferredTo: at(6 * DAY, 23, 59),
      professionalName: null,
    },
  });
  await prisma.waitlistEntry.create({
    data: {
      clinicId: clinic.id,
      patientId: patients["Elena Castro Pascual"].id,
      service: services[4].name,
      preferredFrom: at(1 * DAY, 0, 0),
      preferredTo: at(10 * DAY, 23, 59),
      professionalName: "Dra. Laura Gómez",
      notes: "Ha pedido específicamente a la Dra. Gómez.",
    },
  });

  console.log("Listo ✅");
  console.log(`Clínica: ${clinic.name} (${clinic.slug})`);
  console.log(`Login del panel: ${adminEmail} / demo1234`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
