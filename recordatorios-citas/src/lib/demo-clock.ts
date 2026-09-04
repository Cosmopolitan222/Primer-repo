// Reloj de demostración: toda la app calcula "ahora" a partir de esta
// función en lugar de `new Date()` directamente para los procesos de
// negocio (recordatorios, ausencias, ofertas de lista de espera). Así, el
// personal de la clínica puede "adelantar el tiempo" desde Ajustes para ver
// en segundos cómo se comporta el sistema con citas de dentro de unos días,
// sin esperar a que pase el tiempo real.
export function demoNow(offsetMinutes: number): Date {
  const real = Date.now();
  return new Date(real + offsetMinutes * 60_000);
}
