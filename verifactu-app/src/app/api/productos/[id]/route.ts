import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { desactivarProducto, obtenerProducto } from "@/lib/products";
import { ValidationError } from "@/lib/validation";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Identificador invalido");
    const producto = obtenerProducto(session.businessId, id);
    if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    desactivarProducto(session.businessId, id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
