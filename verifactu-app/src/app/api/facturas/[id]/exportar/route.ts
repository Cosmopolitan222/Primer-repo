import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerFacturaDetalle } from "@/lib/invoices";
import { facturaARegistroJson } from "@/lib/csv";
import { ValidationError } from "@/lib/validation";
import { registrarEvento } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    const factura = await obtenerFacturaDetalle(session.businessId, id);
    if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

    const registro = facturaARegistroJson(factura);
    registrarEvento({
      businessId: session.businessId,
      tipo: "FACTURA_EXPORTADA",
      entidad: "factura",
      entidadId: id,
      usuarioId: session.userId,
    });
    return new NextResponse(JSON.stringify(registro, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="factura-${factura.numero}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
