import { NextRequest, NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { anularFactura } from "@/lib/invoices";
import { ValidationError } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    const body = await request.json().catch(() => ({}));
    const rectificativa = anularFactura(session.businessId, id, body.motivo, session.userId);
    return NextResponse.json({ rectificativa });
  } catch (error) {
    return handleApiError(error);
  }
}
