"use client";

import { useActionState } from "react";
import { updateClinicSettingsAction } from "@/lib/actions/settings";
import type { FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";

const initialState: FormState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export type ClinicSettingsValues = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  avgAppointmentValue: number;
  consentText: string;
};

export function SettingsForm({ clinic }: { clinic: ClinicSettingsValues }) {
  const [state, formAction] = useActionState(updateClinicSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nombre de la clínica *</label>
          <input name="name" required defaultValue={clinic.name} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Zona horaria</label>
          <input name="timezone" defaultValue={clinic.timezone} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Teléfono</label>
          <input name="phone" defaultValue={clinic.phone ?? ""} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input name="email" type="email" defaultValue={clinic.email ?? ""} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">Dirección</label>
          <input name="address" defaultValue={clinic.address ?? ""} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Valor medio por cita (€) *</label>
          <input
            name="avgAppointmentValue"
            type="number"
            min={0}
            step={0.5}
            required
            defaultValue={clinic.avgAppointmentValue}
            className={inputClass}
          />
          <p className="text-xs text-muted">
            Se usa para estimar el dinero recuperado cuando una cita concreta no tiene precio propio.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Texto de consentimiento</label>
        <textarea name="consentText" rows={3} defaultValue={clinic.consentText} className={inputClass} />
        <p className="text-xs text-muted">
          Se muestra a los pacientes en el enlace de confirmación de su cita.
        </p>
      </div>

      <FormAlert error={state.error} success={state.success} />
      <SubmitButton className="self-start">Guardar ajustes</SubmitButton>
    </form>
  );
}
