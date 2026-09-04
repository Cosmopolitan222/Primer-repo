"use client";

import { useActionState } from "react";
import { createSequenceAction } from "@/lib/actions/sequences";
import type { FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";

const initialState: FormState = {};

export function NewSequenceForm() {
  const [state, formAction] = useActionState(createSequenceAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Nombre de la secuencia</label>
        <input
          name="name"
          required
          placeholder="Ej. Recordatorio primeras visitas"
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
      </div>
      <SubmitButton size="sm">Crear secuencia</SubmitButton>
      <FormAlert error={state.error} success={state.success} />
    </form>
  );
}
