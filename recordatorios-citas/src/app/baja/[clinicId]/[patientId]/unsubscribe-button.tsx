"use client";

import { useState, useTransition } from "react";
import { unsubscribeAction } from "@/lib/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function UnsubscribeButton({ clinicId, patientId }: { clinicId: string; patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result) {
    return <FormAlert error={!result.ok ? result.message : undefined} success={result.ok ? result.message : undefined} />;
  }

  return (
    <Button
      variant="danger"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await unsubscribeAction(clinicId, patientId);
          setResult({ ok: res.ok, message: res.message });
        })
      }
    >
      Confirmar baja de comunicaciones
    </Button>
  );
}
