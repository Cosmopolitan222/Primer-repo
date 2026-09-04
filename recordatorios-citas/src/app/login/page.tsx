import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">R</span>
        Recordatorios de Citas
      </Link>
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold text-foreground">Acceso del equipo</h1>
        <p className="mt-1 text-sm text-muted">Panel de gestión de Clínica Dental Sonrisa (demo).</p>
        <div className="mt-5">
          <LoginForm demoEmail="jose1192004@gmail.com" />
        </div>
        <div className="mt-5 rounded-lg bg-primary-soft px-3 py-2.5 text-xs text-primary">
          Credenciales de demostración precargadas. Solo tienes que pulsar «Entrar al panel».
        </div>
      </Card>
      <p className="mt-6 max-w-sm text-center text-xs text-muted">
        ¿Eres un paciente que ha recibido un enlace de confirmación? Ábrelo directamente desde el mensaje:
        no necesitas iniciar sesión.
      </p>
    </div>
  );
}
