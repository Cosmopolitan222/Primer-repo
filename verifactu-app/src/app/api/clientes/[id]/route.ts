import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { desactivarCliente, obtenerCliente } from "@/lib/clients";
import { ValidationError } from "@/lib/validation";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    const cliente = obtenerCliente(session.businessId, id);
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    desactivarCliente(session.businessId, id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
