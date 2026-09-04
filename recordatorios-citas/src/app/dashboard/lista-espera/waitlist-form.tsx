"use client";

import { useActionState } from "react";
import { addWaitlistEntryAction } from "@/lib/actions/waitlist";
import type { FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";

const initialState: FormState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export function WaitlistForm() {
  const [state, formAction] = useActionState(addWaitlistEntryAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Paciente *</label>
          <input name="fullName" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Teléfono</label>
          <input name="phone" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input name="email" type="email" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Servicio deseado *</label>
          <input name="service" required className={inputClass} placeholder="Ej. Revisión y limpieza" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Profesional (opcional)</label>
          <input name="professionalName" className={inputClass} placeholder="Cualquiera si se deja vacío" />
        </div>
        <div />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Disponible desde *</label>
          <input name="preferredFrom" type="datetime-local" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Disponible hasta *</label>
          <input name="preferredTo" type="datetime-local" required className={inputClass} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consentGiven" className="mt-0.5" />
        El paciente ha dado su consentimiento para recibir ofertas de hueco por WhatsApp, SMS o email.
      </label>
      <FormAlert error={state.error} success={state.success} />
      <SubmitButton className="self-start">Añadir a lista de espera</SubmitButton>
    </form>
  );
}
