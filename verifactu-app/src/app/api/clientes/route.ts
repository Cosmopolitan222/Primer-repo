import { NextRequest, NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { crearCliente, listarClientes } from "@/lib/clients";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    return NextResponse.json({ clientes: listarClientes(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const body = await request.json().catch(() => ({}));
    const cliente = crearCliente(session.businessId, body, session.userId);
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
