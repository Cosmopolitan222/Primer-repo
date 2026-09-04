"use client";

import { useActionState } from "react";
import { importAppointmentsCsvAction, type FormState } from "@/lib/actions/appointments";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/form-alert";

const initialState: FormState = {};

const SAMPLE_CSV = `paciente,telefono,email,servicio,profesional,fecha,hora,duracion,precio
Rosa Jiménez,+34 611 222 333,rosa.jimenez@example.com,Revisión y limpieza,Dra. Elena Vidal,2026-09-10,09:30,30,45
Fernando Castro,+34 622 333 444,,Ortodoncia - revisión,Dr. Marcos Ibáñez,2026-09-11,17:00,20,35`;

export function ImportCsvForm() {
  const [state, formAction] = useActionState(importAppointmentsCsvAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Archivo CSV *</label>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="rounded-lg border border-border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
        />
        <p className="text-xs text-muted">
          Columnas: <code>paciente, telefono, email, servicio, profesional, fecha, hora, duracion, precio</code>.
          Necesarias: paciente, servicio, fecha (AAAA-MM-DD), hora (HH:MM) y al menos teléfono o email.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-zinc-50 px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-foreground">Ver ejemplo de CSV</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre">{SAMPLE_CSV}</pre>
      </details>

      <FormAlert error={state.error} success={state.success} />
      <SubmitButton className="self-start" pendingText="Importando…">
        Importar citas
      </SubmitButton>
    </form>
  );
}
