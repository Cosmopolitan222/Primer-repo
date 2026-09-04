"use client";

import { useState, useTransition } from "react";
import { deleteTemplateAction } from "@/lib/actions/templates";
import { CHANNEL_LABEL, type Channel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateForm, type TemplateFormValues } from "./template-form";

export type TemplateSummary = TemplateFormValues & { id: string; usedInSteps: number };

export function TemplatesPanel({ templates }: { templates: TemplateSummary[] }) {
  const [editing, setEditing] = useState<TemplateSummary | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button size="sm" variant={editing === "new" ? "primary" : "secondary"} onClick={() => setEditing(editing === "new" ? null : "new")}>
          + Nueva plantilla
        </Button>
      </div>

      {editing === "new" && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nueva plantilla</h3>
          <TemplateForm />
        </Card>
      )}

      <Card>
        <CardHeader title="Plantillas" description="Reutilizables en cualquier secuencia de recordatorios." />
        {templates.length === 0 ? (
          <EmptyState icon="✉️" title="Todavía no has creado ninguna plantilla." />
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((template) => (
              <li key={template.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{template.name}</span>
                    <Badge tone="primary">{CHANNEL_LABEL[template.channel as Channel]}</Badge>
                    {template.usedInSteps > 0 && <Badge tone="neutral">En uso ({template.usedInSteps})</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(editing === template ? null : template)}
                    >
                      {editing === template ? "Cerrar" : "Editar"}
                    </Button>
                    {template.usedInSteps === 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => startTransition(() => deleteTemplateAction(template.id))}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{template.body}</p>
                {editing === template && (
                  <div className="mt-4 rounded-lg border border-border bg-zinc-50 p-4">
                    <TemplateForm initialValues={template} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
