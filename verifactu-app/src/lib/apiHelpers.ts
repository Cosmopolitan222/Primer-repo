import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { ValidationError } from "./validation";

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return session;
}

export function isSession(value: SessionPayload | NextResponse): value is SessionPayload {
  return !(value instanceof NextResponse);
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("Error inesperado en API:", error);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
