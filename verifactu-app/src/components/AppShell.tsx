"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

const NAV = [
  { href: "/dashboard", label: "Panel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/productos", label: "Productos y servicios" },
  { href: "/facturas", label: "Facturas" },
  { href: "/cadena", label: "Cadena de integridad" },
  { href: "/eventos", label: "Registro de eventos" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [negocio, setNegocio] = useState<{ nombre: string; nif: string } | null>(null);
  const [email, setEmail] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let activo = true;
    api
      .me()
      .then((data) => {
        if (!activo) return;
        if (!data.autenticado) {
          router.replace("/login");
          return;
        }
        setNegocio(data.negocio);
        setEmail(data.email);
        setCargando(false);
      })
      .catch(() => router.replace("/login"));
    return () => {
      activo = false;
    };
  }, [router]);

  async function handleLogout() {
    await api.logout().catch(() => {});
    router.replace("/login");
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-700 text-white no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold leading-tight">{negocio?.nombre ?? "Facturacion demo"}</p>
            <p className="text-xs text-brand-100">NIF {negocio?.nif} &middot; {email}</p>
          </div>
          <button
            className="sm:hidden btn-secondary bg-transparent border-white text-white"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Abrir menu"
          >
            Menu
          </button>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded text-sm ${pathname?.startsWith(item.href) ? "bg-brand-800" : "hover:bg-brand-600"}`}
              >
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="ml-2 px-3 py-2 rounded text-sm bg-brand-900 hover:bg-black">
              Salir
            </button>
          </nav>
        </div>
        {menuAbierto && (
          <nav className="sm:hidden flex flex-col px-4 pb-3 gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAbierto(false)}
                className={`px-3 py-2 rounded text-sm ${pathname?.startsWith(item.href) ? "bg-brand-800" : "hover:bg-brand-600"}`}
              >
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-left px-3 py-2 rounded text-sm bg-brand-900">
              Salir
            </button>
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="no-print text-center text-xs text-slate-400 py-4">
        Demo local de facturacion. Datos ficticios. No conectado a la AEAT.
      </footer>
    </div>
  );
}
