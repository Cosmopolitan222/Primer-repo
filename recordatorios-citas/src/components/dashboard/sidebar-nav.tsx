"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Resumen", icon: "📊", exact: true },
  { href: "/dashboard/citas", label: "Citas", icon: "🗓️" },
  { href: "/dashboard/lista-espera", label: "Lista de espera", icon: "🪑" },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: "✉️" },
  { href: "/dashboard/secuencias", label: "Secuencias", icon: "🔔" },
  { href: "/dashboard/auditoria", label: "Auditoría", icon: "🧾" },
  { href: "/dashboard/ajustes", label: "Ajustes", icon: "⚙️" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-zinc-100 hover:text-foreground"
            }`}
          >
            <span aria-hidden>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
