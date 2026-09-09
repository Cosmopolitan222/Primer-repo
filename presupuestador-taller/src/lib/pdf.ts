import { jsPDF } from "jspdf";
import type { Categoria, DatosContacto, Servicio, TallerConfig } from "../types";
import { formatearFecha, formatearPrecio } from "./formato";

interface DatosPdf {
  config: TallerConfig;
  categoria: Categoria;
  servicio: Servicio;
  contacto: DatosContacto;
  tipoVehiculoNombre?: string;
}

export function generarPdfPresupuesto({
  config,
  categoria,
  servicio,
  contacto,
  tipoVehiculoNombre,
}: DatosPdf): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margenX = 48;
  let y = 56;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(config.nombre, margenX, y);

  y += 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  if (config.direccion) {
    doc.text(config.direccion, margenX, y);
    y += 14;
  }
  doc.text(`Fecha: ${formatearFecha(new Date())}`, margenX, y);

  y += 28;
  doc.setDrawColor(220);
  doc.line(margenX, y, 547, y);

  y += 28;
  doc.setTextColor(20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Presupuesto orientativo", margenX, y);

  y += 26;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", margenX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nombre: ${contacto.nombre}`, margenX, y);
  y += 14;
  doc.text(`Teléfono: ${contacto.telefono}`, margenX, y);
  y += 14;
  if (contacto.email) {
    doc.text(`Email: ${contacto.email}`, margenX, y);
    y += 14;
  }
  if (contacto.vehiculo) {
    doc.text(`Vehículo: ${contacto.vehiculo}`, margenX, y);
    y += 14;
  }
  if (tipoVehiculoNombre) {
    doc.text(`Tipo de vehículo: ${tipoVehiculoNombre}`, margenX, y);
    y += 14;
  }

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detalle del servicio", margenX, y);
  y += 18;

  doc.setDrawColor(230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margenX, y - 14, 499, 70, 6, 6, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(categoria.nombre.toUpperCase(), margenX + 14, y);
  y += 18;
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(servicio.nombre, margenX + 14, y);
  y += 18;
  if (servicio.descripcion) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(servicio.descripcion, margenX + 14, y, { maxWidth: 470 });
    y += 14;
  }

  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("Total estimado:", margenX, y);
  doc.setTextColor(30, 58, 138);
  doc.text(
    `${formatearPrecio(servicio.precioMin)} – ${formatearPrecio(servicio.precioMax)}`,
    margenX + 140,
    y,
  );

  y += 40;
  doc.setDrawColor(220);
  doc.line(margenX, y, 547, y);

  y += 24;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(config.avisoLegal, margenX, y, { maxWidth: 499 });

  return doc;
}
