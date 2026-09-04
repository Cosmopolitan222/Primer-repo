import type { ReactNode } from "react";

export function PublicShell({ clinicName, children }: { clinicName?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-4 py-10 sm:py-16">
      <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">R</span>
        {clinicName ?? "Recordatorios de Citas"}
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
