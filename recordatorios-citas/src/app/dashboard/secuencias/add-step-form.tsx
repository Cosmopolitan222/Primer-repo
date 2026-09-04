"use client";

import { useActionState, useState } from "react";
import { addStepAction } from "@/lib/actions/sequences";
import type { FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";
import { CHANNEL_LABEL, type Channel } from "@/lib/constants";

const initialState: FormState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export type TemplateOption = { id: string; name: string; channel: string };

export function AddStepForm({ sequenceId, templates }: { sequenceId: string; templates: TemplateOption[] }) {
  const [state, formAction] = useActionState(addStepAction, initialState);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const selected = templates.find((t) => t.id === templateId);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="sequenceId" value={sequenceId} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Antelación</label>
        <div className="flex gap-1.5">
          <input name="offsetValue" type="number" min={0} defaultValue={24} className={`${inputClass} w-20`} />
          <select name="offsetUnit" defaultValue="hours" className={inputClass}>
            <option value="minutes">minutos antes</option>
            <option value="hours">horas antes</option>
            <option value="days">días antes</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Plantilla</label>
        <select
          name="templateId"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
          className={inputClass}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({CHANNEL_LABEL[template.channel as Channel]})
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="channel" value={selected?.channel ?? "WHATSAPP"} />
      <SubmitButton size="sm" pendingText="Añadiendo…">
        Añadir paso
      </SubmitButton>
      <FormAlert error={state.error} />
    </form>
  );
}
