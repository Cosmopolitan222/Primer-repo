import { useState, type FormEvent } from "react";
import type { DatosContacto } from "../types";

interface Props {
  onEnviar: (datos: DatosContacto) => void;
  enviando: boolean;
}

export function ContactForm({ onEnviar, enviando }: Props) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setError("Indícanos al menos tu nombre y un teléfono de contacto.");
      return;
    }
    setError("");
    onEnviar({ nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() || undefined, vehiculo: vehiculo.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Déjanos tus datos para poder confirmarte el presupuesto y guardarte tu descuento de bienvenida.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Nombre y apellidos *</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          type="text"
          autoComplete="name"
          placeholder="María García"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Teléfono *</span>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          type="tel"
          autoComplete="tel"
          placeholder="600 000 000"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Email (opcional)</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="maria@email.com"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Matrícula o modelo (opcional)</span>
        <input
          value={vehiculo}
          onChange={(e) => setVehiculo(e.target.value)}
          type="text"
          placeholder="1234 ABC o Seat León 2018"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-primary"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Ver mi presupuesto"}
      </button>
    </form>
  );
}
