"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Resumen", exact: true },
  { href: "/dashboard/citas", label: "Citas" },
  { href: "/dashboard/lista-espera", label: "Lista de espera" },
  { href: "/dashboard/plantillas", label: "Plantillas" },
  { href: "/dashboard/secuencias", label: "Secuencias" },
  { href: "/dashboard/auditoria", label: "Auditoría" },
  { href: "/dashboard/ajustes", label: "Ajustes" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              active ? "bg-primary text-white" : "bg-zinc-100 text-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
