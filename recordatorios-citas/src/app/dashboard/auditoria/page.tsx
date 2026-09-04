import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTimeLong } from "@/lib/date-format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const ENTITY_LABEL: Record<string, string> = {
  APPOINTMENT: "Cita",
  PATIENT: "Paciente",
  WAITLIST: "Lista de espera",
  SETTINGS: "Ajustes",
  USER: "Usuario",
};

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) return null;

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: session.clinicId } });
  const entries = await prisma.auditLog.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Auditoría</h1>
        <p className="text-sm text-muted">
          Trazabilidad básica de lo ocurrido: quién hizo qué y cuándo, incluidas las acciones automáticas
          del sistema.
        </p>
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState icon="🧾" title="Todavía no hay eventos registrados." />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm text-foreground">{entry.detail || entry.action}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.actor} · {formatDateTimeLong(entry.createdAt, clinic.timezone)}
                  </p>
                </div>
                <Badge tone="neutral">{ENTITY_LABEL[entry.entityType] ?? entry.entityType}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
