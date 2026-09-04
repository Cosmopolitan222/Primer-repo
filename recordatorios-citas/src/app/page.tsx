import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Recordatorios configurables",
    description:
      "Define secuencias de mensajes por WhatsApp, SMS o email en varios momentos antes de cada cita: tú decides cuándo y por qué canal.",
    icon: "🔔",
  },
  {
    title: "Confirmar sin iniciar sesión",
    description:
      "El paciente confirma, cancela o pide un cambio de horario desde un enlace, en segundos, sin instalar nada ni crear una cuenta.",
    icon: "🔗",
  },
  {
    title: "Lista de espera inteligente",
    description:
      "Si alguien cancela, el hueco se ofrece automáticamente al siguiente paciente compatible en la lista de espera.",
    icon: "🪑",
  },
  {
    title: "Panel con datos reales",
    description:
      "Confirmadas, pendientes, canceladas, ausencias y una estimación del dinero recuperado, calculada con los datos de tu propia clínica.",
    icon: "📊",
  },
  {
    title: "Consentimiento y bajas",
    description:
      "Cada paciente da su consentimiento y puede darse de baja de comunicaciones en cualquier momento, con trazabilidad de cada acción.",
    icon: "🛡️",
  },
  {
    title: "Lista para conectar canales reales",
    description:
      "Arquitectura preparada para enchufar WhatsApp Business, SMS, email y calendarios cuando quieras salir de la demo.",
    icon: "🔌",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              R
            </span>
            Recordatorios de Citas
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
              Acceder al panel
            </Link>
            <Link href="/login">
              <Button size="sm">Ver la demo</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              Demo funcional · sin servicios de pago
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Reduce las ausencias a citas de tu clínica
            </h1>
            <p className="mt-5 text-lg text-muted">
              Importa o crea las citas, envía recordatorios automáticos y deja que el paciente confirme,
              cancele o pida un cambio desde un enlace. Si se libera un hueco, se ofrece solo a la lista
              de espera. Todo con datos ficticios, listo para enseñar a una clínica.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login">
                <Button size="md">Entrar al panel de la clínica</Button>
              </Link>
              <a href="#como-funciona">
                <Button size="md" variant="secondary">
                  Ver cómo funciona
                </Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">
              Los envíos de esta demo están simulados: no se manda ningún WhatsApp, SMS o email real.
            </p>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="text-2xl">{feature.icon}</div>
                <h3 className="mt-3 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              Sobre las cifras de ausencias y dinero recuperado
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No mostramos porcentajes de no-shows ni cifras de pérdidas &ldquo;típicas del sector&rdquo;: varían mucho
              según especialidad, ubicación y tipo de cita, y presentarlas como universales sin una fuente
              verificable sería engañoso. En su lugar, el panel calcula el dinero potencialmente recuperado
              a partir de los datos reales que cada clínica configura (valor medio por cita) y de lo que
              realmente ocurre con sus propias citas: confirmaciones, ausencias y huecos recuperados por la
              lista de espera.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted sm:flex-row">
          <span>Demo educativa — datos ficticios, sin conexión a servicios de pago.</span>
          <span>Hecho con Next.js · SQLite · Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}
