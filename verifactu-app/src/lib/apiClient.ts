export class ApiError extends Error {}

async function parseJsonOrThrow(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `Error ${res.status}`);
  }
  return data;
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
  });
  return parseJsonOrThrow(res);
}

export const api = {
  me: () => request("/api/auth/me"),
  login: (email: string, password: string) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),

  listarClientes: () => request("/api/clientes"),
  crearCliente: (input: Record<string, unknown>) =>
    request("/api/clientes", { method: "POST", body: JSON.stringify(input) }),
  eliminarCliente: (id: number) => request(`/api/clientes/${id}`, { method: "DELETE" }),

  listarProductos: () => request("/api/productos"),
  crearProducto: (input: Record<string, unknown>) =>
    request("/api/productos", { method: "POST", body: JSON.stringify(input) }),
  eliminarProducto: (id: number) => request(`/api/productos/${id}`, { method: "DELETE" }),

  listarFacturas: () => request("/api/facturas"),
  crearFactura: (input: Record<string, unknown>) =>
    request("/api/facturas", { method: "POST", body: JSON.stringify(input) }),
  obtenerFactura: (id: number) => request(`/api/facturas/${id}`),
  anularFactura: (id: number, motivo: string) =>
    request(`/api/facturas/${id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }),
  pagarFactura: (id: number) => request(`/api/facturas/${id}/pagar`, { method: "POST" }),

  verificarCadena: () => request("/api/cadena"),
  listarEventos: () => request("/api/eventos"),
};
