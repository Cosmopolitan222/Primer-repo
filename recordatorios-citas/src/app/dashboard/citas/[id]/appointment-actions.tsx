"use client";

import { useState, useTransition } from "react";
import { markAttendanceAction, staffCancelAppointmentAction } from "@/lib/actions/appointments";
import { retryWaitlistOfferAction } from "@/lib/actions/waitlist";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/constants";

export function AppointmentActions({
  appointmentId,
  status,
  hasWaitlistCandidates,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  hasWaitlistCandidates: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState("");

  const canAct = status === "PENDING" || status === "CONFIRMED";

  return (
    <div className="flex flex-col gap-3">
      {canAct && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => markAttendanceAction(appointmentId, true))}
          >
            ✓ Marcar asistió
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => markAttendanceAction(appointmentId, false))}
          >
            Marcar ausencia
          </Button>
          <Button size="sm" variant="danger" disabled={isPending} onClick={() => setShowCancelForm((v) => !v)}>
            Cancelar cita
          </Button>
        </div>
      )}

      {showCancelForm && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-zinc-50 p-3">
          <label className="text-xs font-medium text-muted">Motivo (opcional)</label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Motivo de la cancelación"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await staffCancelAppointmentAction(appointmentId, reason);
                  setShowCancelForm(false);
                })
              }
            >
              Confirmar cancelación
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelForm(false)}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {status === "CANCELLED" && hasWaitlistCandidates && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => retryWaitlistOfferAction(appointmentId))}
        >
          🪑 Buscar hueco en lista de espera ahora
        </Button>
      )}
    </div>
  );
}
