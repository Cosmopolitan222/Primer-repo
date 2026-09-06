"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/apiClient";

interface Cliente {
  id: number;
  nombre: string;
  nif: string;
  direccion: string;
  email: string;
  telefono: string;
}

const FORM_INICIAL = { nombre: "", nif: "", direccion: "", email: "", telefono: "" };

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  function cargar() {
    api.listarClientes().then((data) => setClientes(data.clientes));
  }

  useEffect(cargar, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearCliente(form);
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar el cliente");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Desactivar este cliente? No se podra usar en nuevas facturas.")) return;
    try {
      await api.eliminarCliente(id);
      cargar();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al desactivar el cliente");
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre / Razon social</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">NIF / CIF / NIE</label>
            <input className="input" required value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="12345678Z" />
          </div>
          <div>
            <label className="label">Direccion</label>
            <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={guardando} className="btn-primary">{guardando ? "Guardando..." : "Guardar cliente"}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIF/CIF</th>
              <th>Email</th>
              <th>Telefono</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.nif}</td>
                <td>{c.email}</td>
                <td>{c.telefono}</td>
                <td>
                  <button onClick={() => handleEliminar(c.id)} className="text-red-600 text-xs hover:underline">
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">No hay clientes todavia</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
