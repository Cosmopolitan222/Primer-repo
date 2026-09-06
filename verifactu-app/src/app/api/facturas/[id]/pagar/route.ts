import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { marcarFacturaPagada } from "@/lib/invoices";
import { ValidationError } from "@/lib/validation";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    marcarFacturaPagada(session.businessId, id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
