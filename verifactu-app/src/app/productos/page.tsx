"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/apiClient";

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: "producto" | "servicio";
  precio_unitario: number;
  iva_pct: number;
}

const FORM_INICIAL = { nombre: "", descripcion: "", tipo: "servicio", precio_unitario: "", iva_pct: "21" };

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  function cargar() {
    api.listarProductos().then((data) => setProductos(data.productos));
  }

  useEffect(cargar, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearProducto({
        ...form,
        precio_unitario: Number(form.precio_unitario),
        iva_pct: Number(form.iva_pct),
      });
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Desactivar este producto/servicio?")) return;
    try {
      await api.eliminarProducto(id);
      cargar();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al desactivar");
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Productos y servicios</h1>
        <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="servicio">Servicio</option>
              <option value="producto">Producto</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripcion</label>
            <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div>
            <label className="label">Precio unitario (€, sin IVA)</label>
            <input type="number" min="0" step="0.01" className="input" required value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} />
          </div>
          <div>
            <label className="label">IVA</label>
            <select className="input" value={form.iva_pct} onChange={(e) => setForm({ ...form, iva_pct: e.target.value })}>
              <option value="21">21%</option>
              <option value="10">10%</option>
              <option value="4">4%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={guardando} className="btn-primary">{guardando ? "Guardando..." : "Guardar"}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th>IVA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td>
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.descripcion}</p>
                </td>
                <td className="capitalize">{p.tipo}</td>
                <td>{p.precio_unitario.toFixed(2)} €</td>
                <td>{p.iva_pct}%</td>
                <td>
                  <button onClick={() => handleEliminar(p.id)} className="text-red-600 text-xs hover:underline">
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-6">No hay productos/servicios todavia</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
