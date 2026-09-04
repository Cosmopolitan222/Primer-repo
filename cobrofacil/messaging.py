"""Motor de reclamación escalonada: determina en qué fase está una factura
vencida y genera el texto de la comunicación (email/carta) a partir de
plantillas editables por la empresa, sustituyendo los placeholders.

Fases (configurables en el código, ajustables si el negocio lo requiere):
  1) 1-15 días de retraso   -> Recordatorio amistoso
  2) 16-30 días de retraso  -> Segundo aviso (más firme, menciona intereses)
  3) 31-60 días de retraso  -> Requerimiento formal (Ley 3/2004, cifra el total)
  4) 61+ días de retraso    -> Aviso previo a acciones legales (pre-burofax)
"""

from .interest import calcular_intereses

FASES = {
    1: "Recordatorio amistoso",
    2: "Segundo aviso",
    3: "Requerimiento formal",
    4: "Aviso previo a acciones legales",
}

FASE_UMBRALES = [
    (1, 15, 1),
    (16, 30, 2),
    (31, 60, 3),
    (61, 10**6, 4),
]


def fase_para_dias_retraso(dias: int) -> int:
    if dias <= 0:
        return 0
    for minimo, maximo, fase in FASE_UMBRALES:
        if minimo <= dias <= maximo:
            return fase
    return 4


PLANTILLAS_POR_DEFECTO = {
    1: dict(
        asunto="Recordatorio: factura {numero_factura} pendiente de pago",
        cuerpo=(
            "Estimado/a {contacto_cliente},\n\n"
            "Le escribimos para recordarle que la factura {numero_factura}, "
            "por importe de {importe_total} €, venció el {fecha_vencimiento} "
            "y a día de hoy consta pendiente de cobro.\n\n"
            "Es posible que se trate de un simple olvido. Le agradeceríamos "
            "que regularizara el pago a la mayor brevedad, o que nos indique "
            "una fecha estimada si ya está en trámite.\n\n"
            "Quedamos a su disposición para cualquier aclaración.\n\n"
            "Un cordial saludo,\n{nombre_empresa}"
        ),
    ),
    2: dict(
        asunto="Segundo aviso: factura {numero_factura} vencida hace {dias_retraso} días",
        cuerpo=(
            "Estimado/a {contacto_cliente},\n\n"
            "Le remitimos un segundo aviso sobre la factura {numero_factura}, "
            "con vencimiento el {fecha_vencimiento} y actualmente pendiente "
            "de pago por importe de {importe_total} €.\n\n"
            "Le recordamos que, conforme a la Ley 3/2004 de lucha contra la "
            "morosidad en las operaciones comerciales, transcurrido el plazo "
            "de pago pactado se devengan automáticamente intereses de demora, "
            "así como una indemnización de {indemnizacion_fija} € por costes "
            "de cobro, sin necesidad de reclamación previa.\n\n"
            "Le solicitamos que proceda al pago en los próximos días para "
            "evitar mayores costes y molestias para ambas partes.\n\n"
            "Atentamente,\n{nombre_empresa}"
        ),
    ),
    3: dict(
        asunto="Requerimiento formal de pago - Factura {numero_factura}",
        cuerpo=(
            "A la atención de {contacto_cliente},\n\n"
            "Pese a los avisos previos, la factura {numero_factura} "
            "(vencimiento: {fecha_vencimiento}) continúa impagada, acumulando "
            "ya {dias_retraso} días de retraso.\n\n"
            "De conformidad con la Ley 3/2004, de medidas de lucha contra la "
            "morosidad en las operaciones comerciales, la deuda actual "
            "reclamable asciende a:\n\n"
            "  - Principal pendiente: {importe_pendiente} €\n"
            "  - Intereses de demora ({tipo_interes_anual}% anual, {dias_retraso} días): {interes_demora} €\n"
            "  - Indemnización fija por costes de cobro (art. 8): {indemnizacion_fija} €\n"
            "  - TOTAL RECLAMABLE: {total_reclamable} €\n\n"
            "Le requerimos formalmente el pago de dicho importe en el plazo "
            "de 10 días naturales desde la recepción de esta comunicación. "
            "Transcurrido dicho plazo sin haber recibido el pago, nos "
            "veremos obligados a iniciar las acciones que en derecho "
            "correspondan, incluyendo la vía judicial (procedimiento "
            "monitorio) y la comunicación a registros de morosidad.\n\n"
            "Confiamos en no tener que llegar a ese extremo y quedamos a la "
            "espera de su pronta respuesta.\n\n"
            "{nombre_empresa}\nCIF: {cif_empresa}"
        ),
    ),
    4: dict(
        asunto="ÚLTIMO AVISO antes de acciones legales - Factura {numero_factura}",
        cuerpo=(
            "A la atención de {contacto_cliente},\n\n"
            "En ausencia de respuesta a nuestras comunicaciones anteriores, "
            "les informamos de que la deuda derivada de la factura "
            "{numero_factura}, vencida el {fecha_vencimiento} y con "
            "{dias_retraso} días de retraso, asciende actualmente a "
            "{total_reclamable} € (principal + intereses de demora + "
            "indemnización por costes de cobro conforme a la Ley 3/2004).\n\n"
            "Esta es nuestra última comunicación amistosa. Si en el plazo de "
            "5 días naturales no recibimos el pago íntegro o una propuesta "
            "de pago aceptable, procederemos sin más aviso a:\n\n"
            "  1) Reclamar la deuda por vía judicial mediante el "
            "procedimiento monitorio.\n"
            "  2) Trasladar el expediente a nuestro asesor legal.\n"
            "  3) Comunicar la incidencia a los registros de morosidad "
            "correspondientes.\n\n"
            "Rogamos reconsideren la situación para evitar estos trámites, "
            "que generarán costes adicionales para su empresa.\n\n"
            "{nombre_empresa}\nCIF: {cif_empresa}"
        ),
    ),
}


def construir_contexto(factura, empresa):
    calc = calcular_intereses(
        importe_pendiente=factura.pendiente,
        dias_retraso=factura.dias_retraso,
        tipo_anual_pct=empresa.tipo_interes_anual,
        indemnizacion_fija=empresa.indemnizacion_fija,
    )
    cliente = factura.cliente
    return {
        "numero_factura": factura.numero,
        "fecha_vencimiento": factura.fecha_vencimiento.strftime("%d/%m/%Y"),
        "dias_retraso": factura.dias_retraso,
        "importe_total": f"{factura.importe_total:,.2f}".replace(",", "."),
        "importe_pendiente": f"{calc.importe_pendiente:,.2f}".replace(",", "."),
        "tipo_interes_anual": calc.tipo_anual_pct,
        "interes_demora": f"{calc.interes_demora:,.2f}".replace(",", "."),
        "indemnizacion_fija": f"{calc.indemnizacion_fija:,.2f}".replace(",", "."),
        "total_reclamable": f"{calc.total_reclamable:,.2f}".replace(",", "."),
        "contacto_cliente": cliente.persona_contacto or cliente.nombre,
        "nombre_cliente": cliente.nombre,
        "nombre_empresa": empresa.nombre,
        "cif_empresa": empresa.cif,
    }


def generar_mensaje(factura, empresa, plantilla_asunto, plantilla_cuerpo):
    contexto = construir_contexto(factura, empresa)
    asunto = plantilla_asunto.format(**contexto)
    cuerpo = plantilla_cuerpo.format(**contexto)
    return asunto, cuerpo
