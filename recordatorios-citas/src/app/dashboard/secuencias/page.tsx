import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SequenceCard } from "./sequence-card";
import { NewSequenceForm } from "./new-sequence-form";

export default async function SequencesPage() {
  const session = await getSession();
  if (!session) return null;

  const [sequences, templates] = await Promise.all([
    prisma.reminderSequence.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
      include: { steps: { include: { template: true } } },
    }),
    prisma.messageTemplate.findMany({ where: { clinicId: session.clinicId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Secuencias de recordatorios</h1>
        <p className="text-sm text-muted">
          Cada secuencia activa se aplica a todas las citas de la clínica: define cuántos avisos se
          mandan, con cuánta antelación y por qué canal.
        </p>
      </div>

      <Card>
        <CardHeader title="Nueva secuencia" />
        <div className="p-5">
          <NewSequenceForm />
        </div>
      </Card>

      {sequences.length === 0 ? (
        <EmptyState icon="🔔" title="Todavía no hay secuencias configuradas." />
      ) : (
        <div className="flex flex-col gap-4">
          {sequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              sequence={{
                id: sequence.id,
                name: sequence.name,
                active: sequence.active,
                steps: sequence.steps.map((step) => ({
                  id: step.id,
                  offsetMinutesBefore: step.offsetMinutesBefore,
                  channel: step.channel,
                  templateName: step.template.name,
                })),
              }}
              templates={templates.map((t) => ({ id: t.id, name: t.name, channel: t.channel }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
