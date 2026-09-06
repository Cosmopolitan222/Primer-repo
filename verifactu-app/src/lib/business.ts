import { getDb } from "./db";

export interface Business {
  id: number;
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  telefono: string;
  created_at: string;
}

export function obtenerNegocio(businessId: number): Business | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId) as Business | undefined;
}
