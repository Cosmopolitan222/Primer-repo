"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="text-lg font-semibold text-foreground">Algo ha fallado</h1>
      <p className="max-w-sm text-sm text-muted">
        No hemos podido cargar esta sección. Puedes intentarlo de nuevo; si el problema persiste, revisa la
        consola del servidor.
      </p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
