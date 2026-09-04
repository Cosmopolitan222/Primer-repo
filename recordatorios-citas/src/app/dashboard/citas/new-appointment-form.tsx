"use client";

import { useActionState } from "react";
import { createAppointmentAction, type FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";

const initialState: FormState = {};

const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export function NewAppointmentForm() {
  const [state, formAction] = useActionState(createAppointmentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Paciente *</label>
          <input name="fullName" required className={inputClass} placeholder="Nombre y apellidos" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Teléfono</label>
          <input name="phone" className={inputClass} placeholder="+34 6XX XXX XXX" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input name="email" type="email" className={inputClass} placeholder="paciente@ejemplo.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Canal preferido</label>
          <select name="preferredChannel" className={inputClass} defaultValue="WHATSAPP">
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Servicio *</label>
          <input name="service" required className={inputClass} placeholder="Revisión y limpieza" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Profesional *</label>
          <input name="professionalName" required className={inputClass} placeholder="Dra. Elena Vidal" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Fecha y hora *</label>
          <input name="startsAt" type="datetime-local" required className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Duración (min)</label>
            <input name="durationMinutes" type="number" min={5} step={5} defaultValue={30} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Precio ({"€"})</label>
            <input name="price" type="number" min={0} step={0.5} className={inputClass} placeholder="45" />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consentGiven" className="mt-0.5" />
        El paciente ha dado su consentimiento para recibir recordatorios por WhatsApp, SMS o email.
      </label>

      <FormAlert error={state.error} success={state.success} />
      <SubmitButton className="self-start">Crear cita</SubmitButton>
    </form>
  );
}
