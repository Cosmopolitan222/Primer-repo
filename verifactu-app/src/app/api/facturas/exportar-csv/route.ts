import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { listarFacturas } from "@/lib/invoices";
import { facturasACsv } from "@/lib/csv";
import { registrarEvento } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const facturas = listarFacturas(session.businessId);
    const csv = facturasACsv(facturas);
    registrarEvento({ businessId: session.businessId, tipo: "HISTORICO_EXPORTADO_CSV", usuarioId: session.userId });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="historico-facturas.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
