"use client";

import { useState, useTransition } from "react";
import {
  cancelAppointmentAction,
  confirmAppointmentAction,
  requestChangeAction,
} from "@/lib/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

type Mode = "idle" | "cancel" | "change";

export function ConfirmationActions({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runConfirm = () => {
    startTransition(async () => {
      const res = await confirmAppointmentAction(token);
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) setMode("idle");
    });
  };

  const runCancel = () => {
    startTransition(async () => {
      const res = await cancelAppointmentAction(token, text);
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) setMode("idle");
    });
  };

  const runChange = () => {
    startTransition(async () => {
      const res = await requestChangeAction(token, text);
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) setMode("idle");
    });
  };

  if (result?.ok) {
    return <FormAlert success={result.message} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {mode === "idle" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" disabled={isPending} onClick={runConfirm}>
            ✓ Confirmar mi cita
          </Button>
          <Button className="flex-1" variant="secondary" disabled={isPending} onClick={() => setMode("change")}>
            Pedir cambio
          </Button>
          <Button className="flex-1" variant="danger" disabled={isPending} onClick={() => setMode("cancel")}>
            Cancelar
          </Button>
        </div>
      )}

      {mode === "cancel" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="text-sm font-medium text-foreground">¿Por qué cancelas? (opcional)</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button variant="danger" disabled={isPending} onClick={runCancel}>
              Confirmar cancelación
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {mode === "change" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="text-sm font-medium text-foreground">
            Cuéntanos qué necesitas cambiar (opcional)
          </label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            className="rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Ej. ¿Tenéis hueco la semana que viene por la tarde?"
          />
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={runChange}>
              Enviar solicitud
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {result && !result.ok && <FormAlert error={result.message} />}
    </div>
  );
}
