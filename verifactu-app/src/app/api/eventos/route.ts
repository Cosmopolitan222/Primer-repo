import { NextResponse } from "next/server";
import { requireSession, isSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerEventos } from "@/lib/invoices";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;
  try {
    return NextResponse.json({ eventos: obtenerEventos(session.businessId) });
  } catch (error) {
    return handleApiError(error);
  }
}
