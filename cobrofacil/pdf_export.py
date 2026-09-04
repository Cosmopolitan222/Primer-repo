"""Genera el 'expediente de reclamación' en PDF para un cliente moroso:
listado de facturas vencidas, cálculo legal de intereses, historial de
gestiones realizadas y total reclamable. Pensado para entregar a un
abogado/gestoría o adjuntar a una demanda de procedimiento monitorio.

Usa reportlab (sin dependencias del sistema, sin APIs externas).
"""

import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Frame,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .interest import calcular_intereses


def _styles(color_primario):
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TituloDoc",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor(color_primario),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Subtitulo",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#555555"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Seccion",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor(color_primario),
            spaceBefore=14,
            spaceAfter=6,
        )
    )
    return styles


def generar_expediente_cliente(empresa, cliente, facturas):
    """facturas: lista de Factura vencidas (o todas) de ese cliente."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=f"Expediente de reclamación - {cliente.nombre}",
    )
    styles = _styles(empresa.color_primario or "#0f4c5c")
    story = []

    story.append(Paragraph("Expediente de reclamación de deuda", styles["TituloDoc"]))
    story.append(
        Paragraph(
            f"{empresa.nombre} · CIF {empresa.cif} · Emitido el {date.today().strftime('%d/%m/%Y')}",
            styles["Subtitulo"],
        )
    )
    story.append(Spacer(1, 10 * mm))

    story.append(Paragraph("Deudor", styles["Seccion"]))
    datos_cliente = [
        ["Nombre / Razón social", cliente.nombre],
        ["CIF/NIF", cliente.cif or "—"],
        ["Persona de contacto", cliente.persona_contacto or "—"],
        ["Email", cliente.email or "—"],
        ["Teléfono", cliente.telefono or "—"],
        ["Dirección", cliente.direccion or "—"],
    ]
    t = Table(datos_cliente, colWidths=[55 * mm, 110 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
            ]
        )
    )
    story.append(t)

    story.append(Paragraph("Facturas reclamadas", styles["Seccion"]))
    encabezado = [
        "Nº Factura",
        "Vencimiento",
        "Días retraso",
        "Pendiente (€)",
        "Interés demora (€)",
        "Indemniz. (€)",
        "Total (€)",
    ]
    filas = [encabezado]
    total_pendiente = total_interes = total_indem = total_reclamable = 0.0

    for f in facturas:
        calc = calcular_intereses(
            importe_pendiente=f.pendiente,
            dias_retraso=f.dias_retraso,
            tipo_anual_pct=empresa.tipo_interes_anual,
            indemnizacion_fija=empresa.indemnizacion_fija,
        )
        filas.append(
            [
                f.numero,
                f.fecha_vencimiento.strftime("%d/%m/%Y"),
                str(calc.dias_retraso),
                f"{calc.importe_pendiente:,.2f}".replace(",", "."),
                f"{calc.interes_demora:,.2f}".replace(",", "."),
                f"{calc.indemnizacion_fija:,.2f}".replace(",", "."),
                f"{calc.total_reclamable:,.2f}".replace(",", "."),
            ]
        )
        total_pendiente += calc.importe_pendiente
        total_interes += calc.interes_demora
        total_indem += calc.indemnizacion_fija
        total_reclamable += calc.total_reclamable

    filas.append(
        [
            "TOTAL",
            "",
            "",
            f"{total_pendiente:,.2f}".replace(",", "."),
            f"{total_interes:,.2f}".replace(",", "."),
            f"{total_indem:,.2f}".replace(",", "."),
            f"{total_reclamable:,.2f}".replace(",", "."),
        ]
    )

    tabla_facturas = Table(
        filas,
        colWidths=[24 * mm, 22 * mm, 18 * mm, 24 * mm, 26 * mm, 20 * mm, 22 * mm],
    )
    tabla_facturas.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(empresa.color_primario or "#0f4c5c")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#dddddd")),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f2f2f2")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.HexColor("#333333")),
            ]
        )
    )
    story.append(tabla_facturas)

    story.append(
        Paragraph(
            f"Base legal: Ley 3/2004, de 29 de diciembre, de medidas de lucha contra la "
            f"morosidad en las operaciones comerciales. Tipo de interés de demora aplicado: "
            f"{empresa.tipo_interes_anual}% anual "
            f"{('(' + empresa.fecha_tipo_interes + ')') if empresa.fecha_tipo_interes else ''}. "
            f"Indemnización por costes de cobro: {empresa.indemnizacion_fija} € por factura (art. 8).",
            styles["Subtitulo"],
        )
    )

    story.append(Paragraph("Historial de gestiones de cobro", styles["Seccion"]))
    hist_rows = [["Fecha", "Tipo", "Descripción"]]
    alguna = False
    for f in facturas:
        for g in f.gestiones:
            alguna = True
            hist_rows.append(
                [
                    g.fecha.strftime("%d/%m/%Y"),
                    g.tipo.capitalize(),
                    (g.descripcion or "")[:90],
                ]
            )
    if not alguna:
        hist_rows.append(["—", "—", "Sin gestiones registradas"])
    tabla_hist = Table(hist_rows, colWidths=[22 * mm, 24 * mm, 110 * mm])
    tabla_hist.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#dddddd")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(tabla_hist)

    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            f"<b>TOTAL RECLAMABLE: {total_reclamable:,.2f} €</b>".replace(",", "."),
            styles["Seccion"],
        )
    )

    doc.build(story)
    buf.seek(0)
    return buf
