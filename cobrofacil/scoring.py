"""Scoring de riesgo de morosidad por cliente.

El objetivo NO es una caja negra: cada componente se muestra al usuario
para que confíe en el número y pueda usarlo para decidir si sigue
fiando a un cliente o le exige pago por adelantado.

score = 40% x (facturas actualmente vencidas / total facturas)
      + 35% x (media histórica de días de retraso, normalizada a 120 días)
      + 25% x (importe actualmente vencido / límite de riesgo configurado)

Resultado 0-100. >=67 Alto riesgo, >=34 Medio, resto Bajo.
"""

from dataclasses import dataclass


@dataclass
class Riesgo:
    score: float
    nivel: str
    color: str
    pct_facturas_vencidas: float
    media_dias_retraso: float
    pct_importe_vs_limite: float


def _nivel(score: float):
    if score >= 67:
        return "Alto", "#c0392b"
    if score >= 34:
        return "Medio", "#d68910"
    return "Bajo", "#1e8449"


def calcular_riesgo_cliente(facturas, limite_riesgo: float) -> Riesgo:
    """`facturas` es la lista de objetos Factura de un cliente."""
    if not facturas:
        nivel, color = _nivel(0)
        return Riesgo(0.0, nivel, color, 0.0, 0.0, 0.0)

    total = len(facturas)
    vencidas_ahora = [f for f in facturas if f.vencida]
    pct_vencidas = len(vencidas_ahora) / total * 100.0

    pagadas_con_retraso = [f for f in facturas if f.estado == "pagada"]
    if pagadas_con_retraso:
        media_retraso = sum(f.dias_retraso for f in pagadas_con_retraso) / len(
            pagadas_con_retraso
        )
    else:
        # si no hay histórico de pagadas, usamos el retraso actual de las vencidas
        media_retraso = (
            sum(f.dias_retraso for f in vencidas_ahora) / len(vencidas_ahora)
            if vencidas_ahora
            else 0.0
        )

    importe_vencido = sum(f.pendiente for f in vencidas_ahora)
    limite = limite_riesgo if limite_riesgo > 0 else 3000.0
    pct_importe = min(importe_vencido / limite, 1.0) * 100.0

    factor_a = min(pct_vencidas, 100.0)
    factor_b = min(media_retraso / 120.0, 1.0) * 100.0
    factor_c = pct_importe

    score = round(factor_a * 0.40 + factor_b * 0.35 + factor_c * 0.25, 1)
    nivel, color = _nivel(score)

    return Riesgo(
        score=score,
        nivel=nivel,
        color=color,
        pct_facturas_vencidas=round(factor_a, 1),
        media_dias_retraso=round(media_retraso, 1),
        pct_importe_vs_limite=round(factor_c, 1),
    )
