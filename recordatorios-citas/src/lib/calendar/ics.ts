// Generación de archivos .ics (iCalendar), un estándar abierto que
// funciona con Google Calendar, Outlook, Apple Calendar, etc. sin
// necesitar ninguna integración de pago.
//
// Esto es la única pieza de "calendarios" implementada de verdad en la
// demo. Una sincronización bidireccional real con Google Calendar u
// Outlook requeriría registrar una app OAuth con cada proveedor: el punto
// de extensión queda documentado en src/lib/calendar/README.md.

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildAppointmentIcs(params: {
  uid: string;
  title: string;
  description: string;
  location?: string;
  startsAt: Date;
  durationMinutes: number;
}): string {
  const { uid, title, description, location, startsAt, durationMinutes } = params;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recordatorios de Citas//Demo//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@recordatorios-citas.demo`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    location ? `LOCATION:${escapeText(location)}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}
