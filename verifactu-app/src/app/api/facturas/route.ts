import { NextRequest, NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { crearFactura, listarFacturas } from "@/lib/invoices";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    return NextResponse.json({ facturas: listarFacturas(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const body = await request.json().catch(() => ({}));
    const factura = crearFactura(session.businessId, body, session.userId);
    return NextResponse.json({ factura }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
