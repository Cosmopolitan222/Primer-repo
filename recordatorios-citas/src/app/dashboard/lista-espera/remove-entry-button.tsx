"use client";

import { useTransition } from "react";
import { removeWaitlistEntryAction } from "@/lib/actions/waitlist";
import { Button } from "@/components/ui/button";

export function RemoveEntryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => startTransition(() => removeWaitlistEntryAction(id))}
    >
      Quitar
    </Button>
  );
}
