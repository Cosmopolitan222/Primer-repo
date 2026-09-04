import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { demoNow } from "@/lib/demo-clock";
import { formatDateTimeLong } from "@/lib/date-format";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { RunEngineButton } from "@/components/dashboard/run-engine-button";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const clinic = await prisma.clinic.findUnique({ where: { id: session.clinicId } });
  if (!clinic) {
    redirect("/login");
  }

  const now = demoNow(clinic.demoClockOffsetMinutes);
  const clockLabel = formatDateTimeLong(now, clinic.timezone);
  const isTimeTravelled = clinic.demoClockOffsetMinutes !== 0;

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            R
          </span>
          Recordatorios
        </Link>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-2 px-2 pt-6 text-xs text-muted">
          <span>{clinic.name}</span>
          <span>{session.name}</span>
          <form action={logoutAction}>
            <SubmitButton variant="ghost" size="sm" pendingText="Saliendo…" className="w-full justify-start px-0">
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-medium text-foreground">{clinic.name}</p>
            <p className="text-xs text-muted">
              {isTimeTravelled ? "Reloj de demo adelantado — " : ""}
              {clockLabel}
            </p>
          </div>
          <RunEngineButton />
        </header>
        <MobileNav />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
