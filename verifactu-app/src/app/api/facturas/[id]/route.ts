import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerFacturaDetalle } from "@/lib/invoices";
import { ValidationError } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    const factura = await obtenerFacturaDetalle(session.businessId, id);
    if (!factura) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    return NextResponse.json({ factura });
  } catch (error) {
    return handleApiError(error);
  }
}
