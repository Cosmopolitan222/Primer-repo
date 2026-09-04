"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NewAppointmentForm } from "./new-appointment-form";
import { ImportCsvForm } from "./import-csv-form";

type Panel = "none" | "new" | "import";

export function AppointmentPanels() {
  const [panel, setPanel] = useState<Panel>("none");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={panel === "new" ? "primary" : "secondary"}
          onClick={() => setPanel(panel === "new" ? "none" : "new")}
        >
          + Nueva cita
        </Button>
        <Button
          size="sm"
          variant={panel === "import" ? "primary" : "secondary"}
          onClick={() => setPanel(panel === "import" ? "none" : "import")}
        >
          ⬆ Importar CSV
        </Button>
      </div>

      {panel === "new" && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nueva cita</h3>
          <NewAppointmentForm />
        </Card>
      )}
      {panel === "import" && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Importar citas desde CSV</h3>
          <ImportCsvForm />
        </Card>
      )}
    </div>
  );
}
