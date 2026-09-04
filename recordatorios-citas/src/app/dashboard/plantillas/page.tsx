import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplatesPanel, type TemplateSummary } from "./templates-panel";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session) return null;

  const templates = await prisma.messageTemplate.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { steps: true } } },
  });

  const summaries: TemplateSummary[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    usedInSteps: template._count.steps,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Plantillas de mensaje</h1>
        <p className="text-sm text-muted">
          Escribe una vez y reutiliza en tantas secuencias como quieras. Usa los marcadores para
          personalizar cada envío automáticamente.
        </p>
      </div>
      <TemplatesPanel templates={summaries} />
    </div>
  );
}
