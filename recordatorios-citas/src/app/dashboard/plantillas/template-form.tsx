"use client";

import { useActionState, useState } from "react";
import { saveTemplateAction } from "@/lib/actions/templates";
import type { FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";
import { AVAILABLE_PLACEHOLDERS } from "@/lib/templates";

const initialState: FormState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export type TemplateFormValues = {
  id?: string;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
};

export function TemplateForm({ initialValues }: { initialValues?: TemplateFormValues }) {
  const [state, formAction] = useActionState(saveTemplateAction, initialState);
  const [channel, setChannel] = useState(initialValues?.channel ?? "WHATSAPP");
  const [body, setBody] = useState(initialValues?.body ?? "");

  const insertPlaceholder = (placeholder: string) => {
    setBody((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${placeholder}`);
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initialValues?.id && <input type="hidden" name="id" value={initialValues.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nombre de la plantilla *</label>
          <input name="name" required defaultValue={initialValues?.name} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Canal *</label>
          <select
            name="channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className={inputClass}
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
        </div>
      </div>

      {channel === "EMAIL" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Asunto</label>
          <input name="subject" defaultValue={initialValues?.subject ?? ""} className={inputClass} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Mensaje *</label>
        <textarea
          name="body"
          required
          rows={6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_PLACEHOLDERS.map((placeholder) => (
            <button
              type="button"
              key={placeholder}
              onClick={() => insertPlaceholder(placeholder)}
              className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-mono text-muted hover:bg-zinc-200"
            >
              {placeholder}
            </button>
          ))}
        </div>
      </div>

      <FormAlert error={state.error} success={state.success} />
      <div className="flex gap-2">
        <SubmitButton>{initialValues?.id ? "Guardar cambios" : "Crear plantilla"}</SubmitButton>
      </div>
    </form>
  );
}
