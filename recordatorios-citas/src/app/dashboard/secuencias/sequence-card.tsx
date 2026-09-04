"use client";

import { useState, useTransition } from "react";
import { toggleSequenceAction, deleteSequenceAction, deleteStepAction } from "@/lib/actions/sequences";
import { CHANNEL_LABEL, type Channel } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddStepForm, type TemplateOption } from "./add-step-form";

function formatOffset(minutes: number) {
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return `${days} día${days === 1 ? "" : "s"} antes`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hora${hours === 1 ? "" : "s"} antes`;
  }
  return `${minutes} minutos antes`;
}

export type SequenceSummary = {
  id: string;
  name: string;
  active: boolean;
  steps: Array<{ id: string; offsetMinutesBefore: number; channel: string; templateName: string }>;
};

export function SequenceCard({ sequence, templates }: { sequence: SequenceSummary; templates: TemplateOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [showAddStep, setShowAddStep] = useState(false);

  const sortedSteps = [...sequence.steps].sort((a, b) => b.offsetMinutesBefore - a.offsetMinutesBefore);

  return (
    <Card>
      <CardHeader
        title={sequence.name}
        description={sequence.active ? "Activa: se aplica a todas las citas." : "Desactivada."}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => startTransition(() => toggleSequenceAction(sequence.id))}
            >
              {sequence.active ? "Desactivar" : "Activar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => startTransition(() => deleteSequenceAction(sequence.id))}
            >
              Eliminar
            </Button>
          </div>
        }
      />
      <div className="p-5">
        {sortedSteps.length === 0 ? (
          <p className="text-sm text-muted">Esta secuencia todavía no tiene pasos.</p>
        ) : (
          <ol className="flex flex-col gap-2 border-l-2 border-border pl-4">
            {sortedSteps.map((step) => (
              <li key={step.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{formatOffset(step.offsetMinutesBefore)}</span>{" "}
                  <Badge tone="primary">{CHANNEL_LABEL[step.channel as Channel]}</Badge>{" "}
                  <span className="text-muted">{step.templateName}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteStepAction(step.id))}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4">
          {showAddStep ? (
            <div className="rounded-lg border border-border bg-zinc-50 p-3">
              <AddStepForm sequenceId={sequence.id} templates={templates} />
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setShowAddStep(true)} disabled={templates.length === 0}>
              + Añadir paso
            </Button>
          )}
          {templates.length === 0 && (
            <p className="mt-2 text-xs text-muted">Crea primero una plantilla en la sección Plantillas.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
