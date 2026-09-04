// Utilidades de formato de fecha/hora en español, sin dependencias externas
// (usa el Intl nativo de Node/el navegador).

const LOCALE = "es-ES";

export function formatDateLong(date: Date, timezone: string): string {
  const formatted = new Intl.DateTimeFormat(LOCALE, {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return capitalize(formatted);
}

export function formatDateShort(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTimeLong(date: Date, timezone: string): string {
  return `${formatDateLong(date, timezone)} a las ${formatTime(date, timezone)}`;
}

export function formatRelativeToNow(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const abs = Math.abs(diffMinutes);

  const unit = (value: number, singular: string, plural: string) =>
    `${value} ${value === 1 ? singular : plural}`;

  let text: string;
  if (abs < 60) {
    text = unit(abs, "minuto", "minutos");
  } else if (abs < 60 * 24) {
    text = unit(Math.round(abs / 60), "hora", "horas");
  } else {
    text = unit(Math.round(abs / (60 * 24)), "día", "días");
  }

  return diffMinutes >= 0 ? `dentro de ${text}` : `hace ${text}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
