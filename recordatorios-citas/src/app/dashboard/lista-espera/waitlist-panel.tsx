"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WaitlistForm } from "./waitlist-form";

export function WaitlistPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Button size="sm" variant={open ? "primary" : "secondary"} onClick={() => setOpen((v) => !v)} className="self-start">
        + Añadir paciente a la lista de espera
      </Button>
      {open && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nuevo paciente en lista de espera</h3>
          <WaitlistForm />
        </Card>
      )}
    </div>
  );
}
