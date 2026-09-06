import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { obtenerNegocio } from "@/lib/business";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ autenticado: false });
  const negocio = obtenerNegocio(session.businessId);
  return NextResponse.json({
    autenticado: true,
    email: session.email,
    negocio: negocio ? { nombre: negocio.nombre, nif: negocio.nif } : null,
  });
}
