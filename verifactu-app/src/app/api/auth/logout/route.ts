import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, registrarEvento } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    registrarEvento({ businessId: session.businessId, tipo: "LOGOUT", usuarioId: session.userId });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
