"use client";

import { useState, useTransition } from "react";
import { runEngineAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

export function RunEngineButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const summary = await runEngineAction();
      const parts: string[] = [];
      if (summary.remindersSent) parts.push(`${summary.remindersSent} recordatorio(s) enviados`);
      if (summary.noShowsDetected) parts.push(`${summary.noShowsDetected} ausencia(s) detectadas`);
      if (summary.offersSent) parts.push(`${summary.offersSent} hueco(s) ofrecidos a la lista de espera`);
      if (summary.remindersFailed) parts.push(`${summary.remindersFailed} envío(s) fallidos`);
      setMessage(parts.length ? parts.join(" · ") : "Nada pendiente de procesar por ahora.");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button size="sm" variant="secondary" onClick={handleClick} disabled={isPending}>
        {isPending ? "Procesando…" : "⚡ Procesar recordatorios ahora"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-muted">{message}</p>}
    </div>
  );
}
