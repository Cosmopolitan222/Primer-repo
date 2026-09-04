"use client";

import { useTransition } from "react";
import { advanceDemoClockAction, resetDemoClockAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "+ 1 hora", minutes: 60 },
  { label: "+ 6 horas", minutes: 60 * 6 },
  { label: "+ 1 día", minutes: 60 * 24 },
  { label: "+ 3 días", minutes: 60 * 24 * 3 },
];

export function DemoClockPanel({ currentLabel }: { currentLabel: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Reloj de la demo (ahora)</p>
        <p className="text-lg font-semibold text-foreground">{currentLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Button
            key={step.minutes}
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => advanceDemoClockAction(step.minutes))}
          >
            {step.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(() => resetDemoClockAction())}
        >
          Reiniciar reloj
        </Button>
      </div>
      <p className="text-xs text-muted">
        Adelanta el reloj para ver en segundos cómo se disparan los recordatorios, las ausencias
        automáticas y las ofertas de lista de espera de citas que en la vida real ocurrirían días después.
        Al adelantar el reloj también se procesan automáticamente las automatizaciones pendientes.
      </p>
    </div>
  );
}
