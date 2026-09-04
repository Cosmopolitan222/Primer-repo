// Arranca un pequeño planificador en segundo plano dentro del propio
// proceso de Next.js: cada minuto procesa recordatorios pendientes,
// detecta ausencias y ofrece huecos liberados a la lista de espera, sin
// depender de ningún cron externo.
//
// Esto funciona en cualquier despliegue con un proceso Node persistente
// (por ejemplo Render, Railway o `npm start` en tu propio servidor). En
// una plataforma serverless "pura" (funciones que no mantienen estado
// entre peticiones) este intervalo no sobrevive entre invocaciones: para
// esos casos se expone /api/cron/process para un programador externo
// gratuito (ver README).
const INTERVAL_MS = 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_BACKGROUND_SCHEDULER === "true") return;

  const { runEngineForAllClinics } = await import("@/lib/reminder-engine");

  const tick = async () => {
    try {
      await runEngineForAllClinics();
    } catch (error) {
      console.error("[scheduler] Error procesando automatizaciones:", error);
    }
  };

  setInterval(tick, INTERVAL_MS);
  void tick();
}
