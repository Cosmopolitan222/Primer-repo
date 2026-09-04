import type { ReactNode } from "react";
import { APPOINTMENT_STATUS_LABEL, WAITLIST_STATUS_LABEL, type AppointmentStatus, type WaitlistStatus } from "@/lib/constants";

const TONES = {
  neutral: "bg-zinc-100 text-zinc-700",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-accent",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const APPOINTMENT_TONE: Record<AppointmentStatus, keyof typeof TONES> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
  COMPLETED: "info",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={APPOINTMENT_TONE[status]}>{APPOINTMENT_STATUS_LABEL[status]}</Badge>;
}

const WAITLIST_TONE: Record<WaitlistStatus, keyof typeof TONES> = {
  WAITING: "neutral",
  OFFERED: "warning",
  BOOKED: "success",
  EXPIRED: "danger",
  CANCELLED: "neutral",
};

export function WaitlistStatusBadge({ status }: { status: WaitlistStatus }) {
  return <Badge tone={WAITLIST_TONE[status]}>{WAITLIST_STATUS_LABEL[status]}</Badge>;
}
