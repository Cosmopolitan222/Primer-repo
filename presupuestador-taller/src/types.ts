export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precioMin: number;
  precioMax: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  icono?: string;
  servicios: Servicio[];
}

export interface TallerConfig {
  nombre: string;
  eslogan: string;
  logoUrl: string;
  colorPrimario: string;
  colorPrimarioOscuro: string;
  telefonoWhatsapp: string;
  direccion?: string;
  tiposVehiculo: { id: string; nombre: string }[];
  categorias: Categoria[];
  avisoLegal: string;
}

export interface DatosContacto {
  nombre: string;
  telefono: string;
  email?: string;
  vehiculo?: string;
}

export interface PresupuestoSeleccion {
  tipoVehiculoId: string;
  categoriaId: string;
  servicioId: string;
}
