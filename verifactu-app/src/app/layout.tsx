import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facturacion Verifactu (demo local)",
  description: "Sistema de facturacion para autonomos y pequenos negocios con encadenamiento de facturas al estilo Verifactu. Demo local, datos ficticios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
