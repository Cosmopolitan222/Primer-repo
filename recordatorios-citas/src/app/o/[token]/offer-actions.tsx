"use client";

import { useState, useTransition } from "react";
import { respondWaitlistOfferAction } from "@/lib/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function OfferActions({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const respond = (accept: boolean) => {
    startTransition(async () => {
      const res = await respondWaitlistOfferAction(token, accept);
      setResult({ ok: res.ok, message: res.message });
    });
  };

  if (result) {
    return <FormAlert error={!result.ok ? result.message : undefined} success={result.ok ? result.message : undefined} />;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="flex-1" disabled={isPending} onClick={() => respond(true)}>
        ✓ Quiero este hueco
      </Button>
      <Button className="flex-1" variant="secondary" disabled={isPending} onClick={() => respond(false)}>
        No puedo, gracias
      </Button>
    </div>
  );
}
