import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAppointmentIcs } from "@/lib/calendar/ics";

export async function GET(_request: Request, context: RouteContext<"/api/ics/[token]">) {
  const { token } = await context.params;

  const appointment = await prisma.appointment.findUnique({
    where: { publicToken: token },
    include: { clinic: true, patient: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  const ics = buildAppointmentIcs({
    uid: appointment.id,
    title: `${appointment.service} — ${appointment.clinic.name}`,
    description: `Cita con ${appointment.professionalName} en ${appointment.clinic.name}.`,
    location: appointment.clinic.address ?? appointment.clinic.name,
    startsAt: appointment.startsAt,
    durationMinutes: appointment.durationMinutes,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-${appointment.id}.ics"`,
    },
  });
}
