import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="text-lg font-semibold text-foreground">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <Link href="/">
        <Button variant="secondary">Volver al inicio</Button>
      </Link>
    </div>
  );
}
