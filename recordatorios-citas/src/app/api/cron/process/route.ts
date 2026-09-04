import { NextResponse } from "next/server";
import { runEngineForAllClinics } from "@/lib/reminder-engine";

/**
 * Endpoint pensado para ser llamado por un programador de tareas externo
 * gratuito (por ejemplo cron-job.org o GitHub Actions con `schedule`) en
 * despliegues serverless donde no hay un proceso Node persistente que
 * pueda ejecutar `scripts/scheduler.ts` en segundo plano.
 *
 * Protegido con un token compartido simple (suficiente para una demo; en
 * producción se recomienda además restringir por IP o usar firma HMAC).
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = await runEngineForAllClinics();
  return NextResponse.json({ ok: true, results });
}
