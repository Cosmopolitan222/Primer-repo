// Valores controlados usados como "enums" (SQLite no soporta enums nativos
// en Prisma). Centralizarlos aquí evita strings mágicos repartidos por el
// código y documenta el significado de cada estado.

export const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  COMPLETED: "COMPLETED",
} as const;
export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  NO_SHOW: "Ausencia",
  COMPLETED: "Completada",
};

export const APPOINTMENT_SOURCE = {
  MANUAL: "MANUAL",
  IMPORT: "IMPORT",
  WAITLIST: "WAITLIST",
} as const;
export type AppointmentSource =
  (typeof APPOINTMENT_SOURCE)[keyof typeof APPOINTMENT_SOURCE];

export const CHANNEL = {
  WHATSAPP: "WHATSAPP",
  SMS: "SMS",
  EMAIL: "EMAIL",
} as const;
export type Channel = (typeof CHANNEL)[keyof typeof CHANNEL];

export const CHANNEL_LABEL: Record<Channel, string> = {
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "Email",
};

export const NOTIFICATION_KIND = {
  REMINDER: "REMINDER",
  CONFIRMATION: "CONFIRMATION",
  CANCELLATION: "CANCELLATION",
  WAITLIST_OFFER: "WAITLIST_OFFER",
  CHANGE_REQUEST_ACK: "CHANGE_REQUEST_ACK",
  NO_SHOW_NOTICE: "NO_SHOW_NOTICE",
} as const;
export type NotificationKind =
  (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

export const NOTIFICATION_STATUS = {
  SIMULATED_SENT: "SIMULATED_SENT",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export const WAITLIST_STATUS = {
  WAITING: "WAITING",
  OFFERED: "OFFERED",
  BOOKED: "BOOKED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type WaitlistStatus =
  (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];

export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, string> = {
  WAITING: "En espera",
  OFFERED: "Hueco ofrecido",
  BOOKED: "Reservado",
  EXPIRED: "Caducado",
  CANCELLED: "Cancelado",
};

export const OFFER_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const;

// Minutos que tiene un paciente en lista de espera para responder a una
// oferta de hueco antes de que se ofrezca al siguiente.
export const WAITLIST_OFFER_WINDOW_MINUTES = 120;

// Minutos de margen tras la hora de la cita antes de considerarla ausencia
// automáticamente si nadie ha marcado asistencia.
export const NO_SHOW_GRACE_MINUTES = 30;

export const CLINIC_SLUG = "clinica-sonrisa";
