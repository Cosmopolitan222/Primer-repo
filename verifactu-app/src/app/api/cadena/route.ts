import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { verificarCadenaNegocio } from "@/lib/invoices";
import { registrarEvento } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const resultado = verificarCadenaNegocio(session.businessId);
    registrarEvento({
      businessId: session.businessId,
      tipo: "CADENA_VERIFICADA",
      usuarioId: session.userId,
      detalle: { integra: resultado.cadenaIntegra, total: resultado.totalRegistros },
    });
    return NextResponse.json({ resultado });
  } catch (error) {
    return handleApiError(error);
  }
}
