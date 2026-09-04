import { formatDateLong, formatTime } from "@/lib/date-format";

export type TemplateContext = {
  pacienteNombre: string;
  clinicaNombre: string;
  clinicaTelefono?: string | null;
  servicio: string;
  profesional: string;
  fecha: string; // ya formateada
  hora: string; // ya formateada
  enlaceConfirmacion: string;
  enlaceBaja: string;
};

const PLACEHOLDER_MAP: Record<keyof TemplateContext, string> = {
  pacienteNombre: "{{paciente}}",
  clinicaNombre: "{{clinica}}",
  clinicaTelefono: "{{telefono_clinica}}",
  servicio: "{{servicio}}",
  profesional: "{{profesional}}",
  fecha: "{{fecha}}",
  hora: "{{hora}}",
  enlaceConfirmacion: "{{enlace_confirmacion}}",
  enlaceBaja: "{{enlace_baja}}",
};

export const AVAILABLE_PLACEHOLDERS = Object.values(PLACEHOLDER_MAP);

export function renderTemplate(body: string, context: TemplateContext): string {
  let rendered = body;
  for (const key of Object.keys(PLACEHOLDER_MAP) as (keyof TemplateContext)[]) {
    const placeholder = PLACEHOLDER_MAP[key];
    const value = context[key] ?? "";
    rendered = rendered.split(placeholder).join(value);
  }
  return rendered;
}

export function buildContextDateParts(date: Date, timezone: string) {
  return {
    fecha: formatDateLong(date, timezone),
    hora: formatTime(date, timezone),
  };
}
