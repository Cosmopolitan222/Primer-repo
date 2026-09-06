"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/apiClient";

interface Cliente { id: number; nombre: string; nif: string }
interface Producto { id: number; nombre: string; precio_unitario: number; iva_pct: number }

interface Linea {
  producto_id: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  iva_pct: string;
}

function lineaVacia(): Linea {
  return { producto_id: "", descripcion: "", cantidad: "1", precio_unitario: "0", iva_pct: "21" };
}

export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-slate-500">Cargando...</p></AppShell>}>
      <NuevaFacturaForm />
    </Suspense>
  );
}

function NuevaFacturaForm() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [numeroDuplicada, setNumeroDuplicada] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicarId = searchParams.get("duplicar");

  useEffect(() => {
    api.listarClientes().then((d) => setClientes(d.clientes));
    api.listarProductos().then((d) => setProductos(d.productos));
  }, []);

  useEffect(() => {
    if (!duplicarId) return;
    api
      .obtenerFactura(Number(duplicarId))
      .then((data) => {
        const original = data.factura;
        setClienteId(String(original.cliente.id));
        setNumeroDuplicada(original.numero);
        setLineas(
          original.lineas.map((l: { descripcion: string; cantidad: number; precio_unitario: number; iva_pct: number }) => ({
            producto_id: "",
            descripcion: l.descripcion,
            cantidad: String(l.cantidad),
            precio_unitario: String(l.precio_unitario),
            iva_pct: String(l.iva_pct),
          }))
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la factura a duplicar"));
  }, [duplicarId]);

  function actualizarLinea(index: number, cambios: Partial<Linea>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function seleccionarProducto(index: number, productoId: string) {
    const producto = productos.find((p) => String(p.id) === productoId);
    if (!producto) {
      actualizarLinea(index, { producto_id: "" });
      return;
    }
    actualizarLinea(index, {
      producto_id: productoId,
      descripcion: producto.nombre,
      precio_unitario: String(producto.precio_unitario),
      iva_pct: String(producto.iva_pct),
    });
  }

  function calcularTotales() {
    let base = 0;
    let cuota = 0;
    for (const l of lineas) {
      const importe = (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0);
      base += importe;
      cuota += importe * ((Number(l.iva_pct) || 0) / 100);
    }
    return { base, cuota, total: base + cuota };
  }

  const totales = calcularTotales();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clienteId) {
      setError("Selecciona un cliente");
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        client_id: Number(clienteId),
        lineas: lineas.map((l) => ({
          producto_id: l.producto_id ? Number(l.producto_id) : null,
          descripcion: l.descripcion,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
          iva_pct: Number(l.iva_pct),
        })),
      };
      const { factura } = await api.crearFactura(payload);
      router.replace(`/facturas/${factura.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al emitir la factura");
      setGuardando(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-1">Nueva factura</h1>
      {numeroDuplicada && (
        <p className="text-sm text-slate-500 mb-4">
          Cliente y lineas precargados desde la factura {numeroDuplicada}. Revisa los datos antes de emitir.
        </p>
      )}
      {!numeroDuplicada && <div className="mb-4" />}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-4">
          <label className="label">Cliente</label>
          <select className="input max-w-md" required value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Selecciona un cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.nif})</option>
            ))}
          </select>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Lineas de factura</h2>
            <button type="button" className="btn-secondary" onClick={() => setLineas((prev) => [...prev, lineaVacia()])}>
              + Anadir linea
            </button>
          </div>
          <div className="space-y-3">
            {lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
                <div className="sm:col-span-3">
                  <label className="label">Producto/servicio</label>
                  <select className="input" value={l.producto_id} onChange={(e) => seleccionarProducto(i, e.target.value)}>
                    <option value="">Personalizado...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="label">Descripcion</label>
                  <input className="input" required value={l.descripcion} onChange={(e) => actualizarLinea(i, { descripcion: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Cantidad</label>
                  <input type="number" min="0.01" step="0.01" className="input" required value={l.cantidad} onChange={(e) => actualizarLinea(i, { cantidad: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Precio (€)</label>
                  <input type="number" min="0" step="0.01" className="input" required value={l.precio_unitario} onChange={(e) => actualizarLinea(i, { precio_unitario: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <label className="label">IVA</label>
                  <select className="input" value={l.iva_pct} onChange={(e) => actualizarLinea(i, { iva_pct: e.target.value })}>
                    <option value="21">21%</option>
                    <option value="10">10%</option>
                    <option value="4">4%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {lineas.length > 1 && (
                    <button type="button" className="text-red-600 text-xs" onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 max-w-sm ml-auto text-right space-y-1">
          <p className="text-sm text-slate-500">Base imponible: <span className="font-medium text-slate-800">{totales.base.toFixed(2)} €</span></p>
          <p className="text-sm text-slate-500">Cuota IVA: <span className="font-medium text-slate-800">{totales.cuota.toFixed(2)} €</span></p>
          <p className="text-lg font-bold text-brand-800">Total: {totales.total.toFixed(2)} €</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={guardando} className="btn-primary">{guardando ? "Emitiendo..." : "Emitir factura"}</button>
        </div>
      </form>
    </AppShell>
  );
}
