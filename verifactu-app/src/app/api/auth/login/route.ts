import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  verifyPassword,
  setSessionCookie,
  registrarEvento,
  comprobarBloqueo,
  registrarIntentoFallido,
  limpiarIntentosFallidos,
} from "@/lib/auth";
import { requireEmail, requireNonEmpty } from "@/lib/validation";
import { handleApiError } from "@/lib/apiHelpers";

// Hash "señuelo" para que comparar con un email inexistente tarde lo mismo
// que comparar con uno real, y no se pueda usar el tiempo de respuesta para
// averiguar que emails existen (mitigacion basica de enumeracion de usuarios).
const DUMMY_HASH = "$2a$10$C6UzMDM.H6dfI/f/IKcEeOZ8kO3q9NX1J1p3XKz3ZQm9y9m9y9m9y";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = requireEmail(body.email);
    const password = requireNonEmpty(body.password, "password", 200);

    const bloqueo = comprobarBloqueo(email);
    if (bloqueo.bloqueado) {
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intentalo de nuevo en ${bloqueo.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    const usuario = findUserByEmail(email);
    const passwordOk = verifyPassword(password, usuario?.password_hash ?? DUMMY_HASH);

    if (!usuario || !passwordOk) {
      registrarIntentoFallido(email);
      if (usuario) {
        registrarEvento({ businessId: usuario.business_id, tipo: "LOGIN_FALLIDO", usuarioId: usuario.id });
      }
      return NextResponse.json({ error: "Email o contrasena incorrectos" }, { status: 401 });
    }

    limpiarIntentosFallidos(email);
    await setSessionCookie({ userId: usuario.id, businessId: usuario.business_id, email: usuario.email });
    registrarEvento({ businessId: usuario.business_id, tipo: "LOGIN", usuarioId: usuario.id });

    return NextResponse.json({ ok: true, nombre: usuario.nombre });
  } catch (error) {
    return handleApiError(error);
  }
}
