import { NextRequest, NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { crearProducto, listarProductos } from "@/lib/products";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    return NextResponse.json({ productos: listarProductos(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const body = await request.json().catch(() => ({}));
    const producto = crearProducto(session.businessId, body, session.userId);
    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
