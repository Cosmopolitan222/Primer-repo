"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@verifactu-demo.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.me().then((data) => {
      if (data.autenticado) router.replace("/dashboard");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-800">Facturacion Verifactu</h1>
          <p className="text-sm text-slate-500 mt-1">Demo local para autonomos y pequenos negocios</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={cargando} className="btn-primary w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Credenciales de la demo: demo@verifactu-demo.local / Demo1234!<br />
          (creadas al ejecutar <code>npm run seed</code>)
        </p>
      </div>
    </div>
  );
}
